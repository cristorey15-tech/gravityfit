// ============================================
// GravityFit — Adaptive Rest by RPE Tests
// ============================================
// After each set the user rates RPE; the running rest timer should retune:
// RPE >= 9 → 3+ min, target zone (8) → user's default, easy work → shorter.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock heavy UI/app deps so importing WorkoutScreen doesn't pull the whole app.
vi.mock('../js/components.js', () => ({
  Icons: {},
  Modal: { show() {}, hide() {} },
  Toast: { show: vi.fn() },
  RestTimer: {
    start() {}, skip() {}, endTime: 0,
    getRemaining: vi.fn(() => 0),
    adjust: vi.fn(),
  },
  PRCelebration: { show() {} },
  escapeHtml: (s) => s,
}));
vi.mock('../js/app.js', () => ({ App: { navigate() {} } }));
vi.mock('../js/screens/home.js', () => ({ HomeScreen: {} }));
vi.mock('../js/calories.js', () => ({
  Calories: {
    estimateLive: () => ({ kcal: 0 }),
    getWorkoutCalories: () => 0,
    getWorkoutSteps: () => 0,
  },
}));
vi.mock('../src/Logger.js', () => ({ Logger: { info() {}, warn() {}, error() {} } }));

import { WorkoutScreen } from '../js/screens/workout.js';
import { RestTimer, Toast } from '../js/components.js';
import { Storage } from '../js/storage.js';

// Active rest timer with `remaining` seconds left
const armRestTimer = (remaining) => {
  RestTimer.endTime = Date.now() + remaining * 1000;
  RestTimer.getRemaining.mockReturnValue(remaining);
};

const startWorkout = () => {
  WorkoutScreen.activeWorkout = {
    name: 'Test', routineId: null, exercises: [],
    startedAt: new Date().toISOString(),
  };
  WorkoutScreen.startTime = Date.now();
  WorkoutScreen.activeWorkout.exercises.push({
    exerciseId: 'ex1', unit: 'kg', sets: [{ weight: 60, reps: 8, type: 'normal', completed: true }],
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  RestTimer.endTime = 0;
  RestTimer.getRemaining.mockReturnValue(0);
  Storage._state = {};
  localStorage.clear();
  WorkoutScreen.activeWorkout = null;
  WorkoutScreen.startTime = null;
  vi.spyOn(WorkoutScreen, 'render').mockImplementation(() => {});
  vi.spyOn(WorkoutScreen, 'save').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('restSecondsForRPE', () => {
  it('gives 3 minutes for near-failure sets (RPE 9-10)', () => {
    expect(WorkoutScreen.restSecondsForRPE(10, 90)).toBe(180);
    expect(WorkoutScreen.restSecondsForRPE(9, 90)).toBe(180);
  });

  it('keeps the user default in the target zone (RPE 8)', () => {
    expect(WorkoutScreen.restSecondsForRPE(8, 90)).toBe(90);
    expect(WorkoutScreen.restSecondsForRPE(8, 150)).toBe(150);
  });

  it('shortens the rest for easy sets', () => {
    expect(WorkoutScreen.restSecondsForRPE(7, 90)).toBe(75);  // 75%
    expect(WorkoutScreen.restSecondsForRPE(6, 90)).toBe(45);  // 50%
    expect(WorkoutScreen.restSecondsForRPE(6.5, 90)).toBe(45);
  });

  it('never returns less than 30s and rounds to 15s steps', () => {
    expect(WorkoutScreen.restSecondsForRPE(6, 30)).toBe(30);
    const s = WorkoutScreen.restSecondsForRPE(7, 100);
    expect(s % 15).toBe(0);
  });
});

describe('setRPESet retunes the running rest timer', () => {
  it('extends the timer to 3 min after RPE 9 and reports it', () => {
    startWorkout();
    armRestTimer(88); // timer just started at 90s
    WorkoutScreen.setRPESet(0, 0, 9);

    expect(WorkoutScreen.activeWorkout.exercises[0].sets[0].rpe).toBe(9);
    expect(RestTimer.adjust).toHaveBeenCalledWith(92); // 180 - 88
    expect(Toast.show).toHaveBeenCalledWith(expect.stringMatching(/Descanso: 3:00/), expect.anything(), expect.anything());
  });

  it('shortens the timer after an easy set', () => {
    startWorkout();
    armRestTimer(90);
    WorkoutScreen.setRPESet(0, 0, 6);
    expect(RestTimer.adjust).toHaveBeenCalledWith(-45); // 45 - 90
    expect(Toast.show).toHaveBeenCalledWith(expect.stringMatching(/Descanso: 0:45/), expect.anything(), expect.anything());
  });

  it('does nothing in the target zone (already at the right duration)', () => {
    startWorkout();
    armRestTimer(88);
    WorkoutScreen.setRPESet(0, 0, 8);
    expect(RestTimer.adjust).not.toHaveBeenCalled();
  });

  it('respects the opt-out setting (adaptiveRest = false)', () => {
    Storage.saveUser({ ...Storage.getUser(), adaptiveRest: false });
    startWorkout();
    armRestTimer(90);
    WorkoutScreen.setRPESet(0, 0, 9);
    expect(RestTimer.adjust).not.toHaveBeenCalled();
  });

  it('skips adjustment when no rest timer is running (e.g. supersets)', () => {
    startWorkout();
    RestTimer.endTime = 0;
    WorkoutScreen.setRPESet(0, 0, 9);
    expect(RestTimer.adjust).not.toHaveBeenCalled();
  });
});
