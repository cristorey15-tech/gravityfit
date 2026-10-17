// ============================================
// GravityFit — Workout Pause Tests
// ============================================
// Tests for pausing the active workout: the elapsed clock (and therefore the
// calorie estimate and saved duration) must exclude paused time, and the pause
// state must survive a save/restore cycle (app restart).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock heavy UI/app deps so importing WorkoutScreen doesn't pull the whole app.
vi.mock('../js/components.js', () => ({
  Icons: {},
  Modal: { show() {}, hide() {} },
  Toast: { show() {} },
  RestTimer: { start() {}, skip() {} },
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

const startWorkout = () => {
  WorkoutScreen.activeWorkout = {
    name: 'Test', routineId: null, exercises: [],
    startedAt: new Date().toISOString(),
  };
  WorkoutScreen.startTime = Date.now();
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-16T10:00:00Z'));
  WorkoutScreen.activeWorkout = null;
  WorkoutScreen.startTime = null;
  vi.spyOn(WorkoutScreen, 'render').mockImplementation(() => {});
  vi.spyOn(WorkoutScreen, 'save').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('getElapsed', () => {
  it('returns 0 without a start time', () => {
    expect(WorkoutScreen.getElapsed()).toBe(0);
  });

  it('counts up while running', () => {
    startWorkout();
    vi.advanceTimersByTime(65000);
    expect(WorkoutScreen.getElapsed()).toBe(65);
  });
});

describe('togglePause', () => {
  it('freezes the clock while paused', () => {
    startWorkout();
    vi.advanceTimersByTime(10000);
    WorkoutScreen.togglePause();

    expect(WorkoutScreen.isPaused()).toBe(true);
    expect(WorkoutScreen.getElapsed()).toBe(10);

    vi.advanceTimersByTime(30 * 60000); // 30 min pass while paused
    expect(WorkoutScreen.getElapsed()).toBe(10); // still frozen
  });

  it('resumes and keeps counting from where it stopped', () => {
    startWorkout();
    vi.advanceTimersByTime(10000);
    WorkoutScreen.togglePause();          // pause
    vi.advanceTimersByTime(300000);       // 5 min paused
    WorkoutScreen.togglePause();          // resume
    expect(WorkoutScreen.isPaused()).toBe(false);

    vi.advanceTimersByTime(5000);
    expect(WorkoutScreen.getElapsed()).toBe(15); // 10s + 5s, pause excluded
  });

  it('supports multiple pause cycles', () => {
    startWorkout();
    for (let i = 0; i < 3; i++) {
      vi.advanceTimersByTime(10000);
      WorkoutScreen.togglePause();
      vi.advanceTimersByTime(60000);
      WorkoutScreen.togglePause();
    }
    vi.advanceTimersByTime(10000);
    expect(WorkoutScreen.getElapsed()).toBe(40); // 4 × 10s running
  });

  it('saves and renders on toggle', () => {
    startWorkout();
    WorkoutScreen.togglePause();
    expect(WorkoutScreen.save).toHaveBeenCalled();
    expect(WorkoutScreen.render).toHaveBeenCalled();
  });

  it('is a no-op without an active workout', () => {
    WorkoutScreen.togglePause();
    expect(WorkoutScreen.isPaused()).toBe(false);
  });
});

describe('pause persistence (app restart)', () => {
  it('keeps the pause and the frozen clock after save/restore', () => {
    startWorkout();
    vi.advanceTimersByTime(10000);
    WorkoutScreen.togglePause();

    // Simulate an app restart: state rehydrated from the persisted workout
    const saved = JSON.parse(JSON.stringify(WorkoutScreen.activeWorkout));
    WorkoutScreen.activeWorkout = saved;
    WorkoutScreen.startTime = new Date(saved.startedAt).getTime();

    expect(WorkoutScreen.isPaused()).toBe(true);
    expect(WorkoutScreen.getElapsed()).toBe(10);

    // Resuming after the restart keeps excluding the paused block
    vi.advanceTimersByTime(120000);
    WorkoutScreen.togglePause();
    vi.advanceTimersByTime(5000);
    expect(WorkoutScreen.getElapsed()).toBe(15);
    expect(WorkoutScreen.activeWorkout.pausedTotalMs).toBe(120000); // only the paused block
  });

  it('duration formula excludes accumulated pauses (used by finishWorkout)', () => {
    startWorkout();
    vi.advanceTimersByTime(60000);
    WorkoutScreen.togglePause();
    vi.advanceTimersByTime(60000);
    WorkoutScreen.togglePause();
    vi.advanceTimersByTime(60000);
    // finishWorkout records getElapsed() as duration
    expect(WorkoutScreen.getElapsed()).toBe(120); // 2 × 60s running, not 180
  });
});
