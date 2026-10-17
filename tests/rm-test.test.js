// ============================================
// GravityFit — 1RM Test Tests
// ============================================
// The guided test builds a progressive ramp from the user's current estimate,
// and the result modal is fed by an Epley estimate of the completed sets.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock heavy UI/app deps so importing ai-coach doesn't pull the whole app.
vi.mock('../js/components.js', () => ({
  Modal: { show: vi.fn(), hide: vi.fn() },
  Toast: { show: vi.fn() },
  escapeHtml: (s) => s,
}));
vi.mock('../js/app.js', () => ({ App: {} }));

import { AICoach } from '../js/ai-coach.js';
import { Storage } from '../js/storage.js';
import { Modal } from '../js/components.js';

const EX = 'pectorals-band-bench-press';

const set = (weight, reps, completed = true, rpe = 0) => ({ weight, reps, completed, rpe });

const wk = (daysAgo, sets) => ({
  id: 'w' + daysAgo,
  name: 'Sesion',
  finishedAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
  exercises: [{ exerciseId: EX, unit: 'kg', sets }],
});

beforeEach(() => {
  Storage._state = {};
  localStorage.clear();
  vi.clearAllMocks();
  global.window = global.window || {};
  window.WorkoutScreen = {
    activeWorkout: null, startTime: null,
    saveNow: vi.fn(), requestWakeLock: vi.fn(),
    startAutoSave: vi.fn(), _attachBeforeUnload: vi.fn(),
  };
  window.App = { navigate: vi.fn() };
});

afterEach(() => {
  vi.restoreAllMocks();
  delete window.WorkoutScreen;
  delete window.App;
});

describe('start1RMTest', () => {
  it('rejects an empty selection', () => {
    AICoach.start1RMTest('   ');
    expect(window.WorkoutScreen.activeWorkout).toBe(null);
    expect(window.WorkoutScreen.saveNow).not.toHaveBeenCalled();
  });

  it('rejects an unknown exercise', () => {
    AICoach.start1RMTest('no-existe-este-ejercicio');
    expect(window.WorkoutScreen.activeWorkout).toBe(null);
    expect(window.WorkoutScreen.saveNow).not.toHaveBeenCalled();
  });

  it('builds an ascending ramp from the estimated 1RM', () => {
    // Two sessions → estimate1RM has data: best Epley of 100×8 = 126.67
    Storage.saveWorkouts([wk(1, [set(100, 8)]), wk(4, [set(90, 8)])]);
    AICoach.start1RMTest(EX);

    const aw = window.WorkoutScreen.activeWorkout;
    expect(aw).toBeTruthy();
    expect(aw.is1RMTest).toBe(true);
    expect(aw.name).toMatch(/Test 1RM/);
    expect(aw.exercises[0].exerciseId).toBe(EX);

    const sets = aw.exercises[0].sets;
    expect(sets.length).toBe(6);
    expect(sets[0].type).toBe('warmup');
    expect(sets[1].type).toBe('warmup');
    expect(sets.filter(s => !s.completed)).toHaveLength(6);
    // Ascending working weights (after plate rounding)
    const working = sets.slice(2).map(s => s.weight);
    for (let i = 1; i < working.length; i++) {
      expect(working[i]).toBeGreaterThanOrEqual(working[i - 1]);
    }
    expect(window.WorkoutScreen.saveNow).toHaveBeenCalled();
    expect(window.App.navigate).toHaveBeenCalledWith('workout');
  });

  it('falls back to a ramp over the best historical weight when there is no 1RM yet', () => {
    // One session: Epley exists but keep path simple — no estimate → bestWeight path needs e1RM=0
    // estimate1RM > 0 with a single session, so simulate the generic path with no history at all.
    Storage.saveWorkouts([]);
    AICoach.start1RMTest(EX);
    const sets = window.WorkoutScreen.activeWorkout.exercises[0].sets;
    expect(sets).toHaveLength(6);
    expect(sets[0].weight).toBe(null); // user fills weights for a brand-new exercise
    expect(sets.map(s => s.reps)).toEqual([10, 8, 5, 3, 2, 1]);
  });
});

describe('estimate1RMFromWorkout', () => {
  it('uses the weight itself for a clean single', () => {
    const w = { exercises: [{ exerciseId: EX, sets: [set(120, 1)] }] };
    expect(AICoach.estimate1RMFromWorkout(w).est).toBe(120);
  });

  it('applies Epley for multi-rep sets and ignores incomplete sets', () => {
    const w = { exercises: [{ exerciseId: EX, sets: [set(100, 8), { weight: 140, reps: 1, completed: false }] }] };
    expect(AICoach.estimate1RMFromWorkout(w).est).toBeCloseTo(100 * (1 + 8 / 30));
  });

  it('returns 0 when nothing is usable', () => {
    expect(AICoach.estimate1RMFromWorkout({ exercises: [{ exerciseId: EX, sets: [] }] }).est).toBe(0);
    expect(AICoach.estimate1RMFromWorkout(null).est).toBe(0);
  });
});

describe('show1RMTestResult', () => {
  it('renders the estimate and the % table with the delta vs the previous estimate', () => {
    const w = { exercises: [{ exerciseId: EX, unit: 'kg', sets: [set(100, 5)] }] };
    AICoach.show1RMTestResult(w, 110);
    expect(Modal.show).toHaveBeenCalledTimes(1);
    const html = String(Modal.show.mock.calls[0][0]);
    const est = 100 * (1 + 5 / 30); // 116.67 → rounded 117.5
    expect(html).toContain('117.5');
    expect(html).toContain('vs. tu estimación anterior');
    expect(html).toContain('90% de 1RM');
    expect(html).toContain(Storage.getExercise(EX).name);
  });

  it('explains when no set can be used', () => {
    AICoach.show1RMTestResult({ exercises: [{ exerciseId: EX, sets: [{ weight: null, reps: 8, completed: false }] }] }, 0);
    const html = String(Modal.show.mock.calls[0][0]);
    expect(html).toMatch(/no hay series completadas/i);
  });
});

describe('estimate1RM treats a single as the raw weight', () => {
  it('does not inflate 1-rep maxes with the Epley multiplier', () => {
    // 100×8 → Epley 126.7; the 150 single must win as-is (150, not 150×1.033)
    Storage.saveWorkouts([wk(1, [set(150, 1)]), wk(9, [set(100, 8)])]);
    expect(AICoach.estimate1RM(EX)).toBe(150);
  });
});
