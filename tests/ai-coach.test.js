// ============================================
// GravityFit — AI Coach Tests
// ============================================
// Focused tests for RPE-based weight suggestion and proactive insights.
// Mock the UI/app modules so importing ai-coach doesn't pull the whole app.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
vi.mock('../js/components.js', () => ({
  Modal: { show: vi.fn() },
  Toast: { show: vi.fn() },
  escapeHtml: (s) => s,
}));
vi.mock('../js/app.js', () => ({ App: {} }));

import { AICoach } from '../js/ai-coach.js';
import { Storage } from '../js/storage.js';

const EX = 'bench-press';

// Helper: a finished workout (newest-first storage order) with RPE-logged sets
function wk(daysAgo, sets) {
  return {
    id: 'w' + daysAgo,
    name: 'Sesion',
    finishedAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
    exercises: [{ exerciseId: EX, sets }],
  };
}
const set = (weight, rpe) => ({ weight, reps: 8, completed: true, rpe });

beforeEach(() => {
  Storage._state = {};
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
});

// stats() helper for _classifyRPE band tests (mirrors getRPEStats' shape)
const stats = (recentRPE, olderRPE, weightTrend, count = 3) =>
  ({ recentRPE, olderRPE, weightTrend, lastWeight: 100, count });

describe('getSuggestedWeightFromRPE', () => {
  it('returns null when no RPE data exists', () => {
    Storage.saveWorkouts([wk(1, [set(100, 0)])]); // rpe 0 = not logged
    expect(AICoach.getSuggestedWeightFromRPE(EX, 8)).toBe(null);
  });

  it('picks the set weight closest to the target RPE', () => {
    Storage.saveWorkouts([wk(1, [set(100, 9)]), wk(3, [set(90, 7)])]);
    expect(AICoach.getSuggestedWeightFromRPE(EX, 7)).toBe(90);
  });

  it('breaks RPE-distance ties toward the heavier weight', () => {
    Storage.saveWorkouts([wk(1, [set(100, 9)]), wk(3, [set(90, 7)])]);
    // both are distance 1 from target 8 -> heavier (100) wins
    expect(AICoach.getSuggestedWeightFromRPE(EX, 8)).toBe(100);
  });
});

describe('getRPEStats', () => {
  it('returns null with no RPE history', () => {
    expect(AICoach.getRPEStats(EX)).toBe(null);
  });

  it('summarizes recent RPE and an improving weight trend', () => {
    Storage.saveWorkouts([wk(1, [set(100, 9)]), wk(4, [set(90, 7)])]);
    const s = AICoach.getRPEStats(EX);
    expect(s.count).toBe(2);
    expect(s.recentRPE).toBeCloseTo(9);
    expect(s.weightTrend).toBe('improving'); // 100 > 90*1.02
  });

  it('flags a declining weight trend', () => {
    Storage.saveWorkouts([wk(1, [set(80, 9)]), wk(4, [set(100, 7)])]);
    expect(AICoach.getRPEStats(EX).weightTrend).toBe('declining'); // 80 < 100*0.98
  });
});

describe('getCoachInsights', () => {
  it('returns an array (empty) with no data', () => {
    expect(Array.isArray(AICoach.getCoachInsights())).toBe(true);
    expect(AICoach.getCoachInsights()).toHaveLength(0);
  });

  it('raises an overreaching insight when RPE is high and weight is declining', () => {
    Storage.saveWorkouts([wk(1, [set(80, 9)]), wk(4, [set(100, 7)])]);
    const insights = AICoach.getCoachInsights();
    expect(insights.some((i) => /Sobreesfuerzo/i.test(i.title))).toBe(true);
  });

  it('raises a margin insight when RPE is low and weight is not declining', () => {
    Storage.saveWorkouts([wk(1, [set(100, 6.5)]), wk(4, [set(95, 7)])]);
    const insights = AICoach.getCoachInsights();
    expect(insights.some((i) => /Margen/i.test(i.title))).toBe(true);
  });

  it('sorts insights by severity (alert before info)', () => {
    // >3 days without training triggers an alert-level insight
    Storage.saveWorkouts([wk(5, [set(100, 7)])]);
    const insights = AICoach.getCoachInsights();
    if (insights.length > 1) {
      const order = { alert: 0, warn: 1, good: 2, info: 3 };
      const sevs = insights.map((i) => order[i.severity]);
      expect([...sevs].sort((a, b) => a - b)).toEqual(sevs);
    }
  });

  it('flags a stalled lift (same weight for 3+ sessions at high RPE)', () => {
    Storage.saveWorkouts([
      wk(1, [set(100, 8.5)]),
      wk(4, [set(100, 8.5)]),
      wk(8, [set(100, 8.5)]),
    ]);
    const insights = AICoach.getCoachInsights();
    expect(insights.some((i) => /Estancado/i.test(i.title))).toBe(true);
  });

  it('celebrates a completed weekly goal', () => {
    Storage.saveUser({ ...Storage.getUser(), weeklyGoal: 1 });
    const now = new Date();
    const startOfWeek = new Date(now); // same Monday-based rule as Storage.getWorkoutsThisWeek
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);
    Storage.saveWorkouts([{ ...wk(0, [set(100, 8)]),
      finishedAt: new Date(startOfWeek.getTime() + 3600000).toISOString() }]);
    const insights = AICoach.getCoachInsights();
    expect(insights.some((i) => /cumplida/i.test(i.title))).toBe(true);
  });

  it('nudges the user to log RPE when workouts have none', () => {
    Storage.saveWorkouts([wk(1, [set(100, 0)]), wk(4, [set(100, 0)]), wk(7, [set(100, 0)])]);
    const insights = AICoach.getCoachInsights();
    expect(insights.some((i) => /Marca el RPE/i.test(i.title))).toBe(true);
  });

  it('warns when weekly volume drops below 60% of last week', () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);
    Storage.saveWorkouts([
      // last week: big session (100x8) → dated inside [S-7, S) for any weekday
      { ...wk(3, [set(100, 8)]),
        finishedAt: new Date(startOfWeek.getTime() - 3 * 86400000).toISOString() },
      // this week: much smaller session (50x8) → <60% of last week's volume
      { ...wk(0, [set(50, 8)]), finishedAt: new Date(startOfWeek.getTime() + 3600000).toISOString() },
    ]);
    const insights = AICoach.getCoachInsights();
    expect(insights.some((i) => /Volumen a la baja/i.test(i.title))).toBe(true);
  });
});

describe('_classifyRPE (umbrales afinados)', () => {
  it('critical at RPE ≥ 9.5', () => {
    expect(AICoach._classifyRPE(stats(9.5, 8.5, 'stable'))).toBe('critical');
    expect(AICoach._classifyRPE(stats(10, 9, 'improving'))).toBe('critical');
  });

  it('overreach at ≥9 when strength drops or the previous RPE was already high', () => {
    expect(AICoach._classifyRPE(stats(9, 7, 'declining'))).toBe('overreach');
    expect(AICoach._classifyRPE(stats(9, 8.7, 'stable'))).toBe('overreach');
  });

  it('high at 9–9.4 with no other red flag', () => {
    expect(AICoach._classifyRPE(stats(9, 7.5, 'improving'))).toBe('high');
    expect(AICoach._classifyRPE(stats(9.4, 7, 'improving'))).toBe('high');
  });

  it('onTarget inside the 8–8.9 band', () => {
    expect(AICoach._classifyRPE(stats(8, 7.5, 'improving'))).toBe('onTarget');
    // 8.9 with strength progressing is on-target; stable for 3+ sessions would be 'stalled'
    expect(AICoach._classifyRPE(stats(8.9, 8, 'improving'))).toBe('onTarget');
  });

  it('margin between 7 and 7.9, under below 7', () => {
    expect(AICoach._classifyRPE(stats(7, 7, 'improving'))).toBe('margin');
    expect(AICoach._classifyRPE(stats(6.5, 7, 'improving'))).toBe('under');
  });

  it('rising when RPE jumps ≥1 point with the same/better strength', () => {
    expect(AICoach._classifyRPE(stats(8.6, 7, 'improving'))).toBe('rising');
  });

  it('stalled at ≥8.5 with a stable max weight over 3+ sessions', () => {
    expect(AICoach._classifyRPE(stats(8.6, 8.6, 'stable', 4))).toBe('stalled');
    expect(AICoach._classifyRPE(stats(8.6, 8.6, 'stable', 2))).not.toBe('stalled');
  });

  it('lossStrength when strength drops despite a low RPE', () => {
    expect(AICoach._classifyRPE(stats(6.5, 7, 'declining'))).toBe('lossStrength');
  });

  it('returns null without stats', () => {
    expect(AICoach._classifyRPE(null)).toBe(null);
    expect(AICoach._classifyRPE({ count: 0 })).toBe(null);
  });
});

describe('getRPEFeedback (consejo en vivo tras marcar RPE)', () => {
  it('warns near failure (≥9.5) and at 9', () => {
    expect(AICoach.getRPEFeedback(10).message).toMatch(/Casi al fallo/i);
    expect(AICoach.getRPEFeedback(9).message).toMatch(/1–2 reps en reserva/i);
  });

  it('confirms the target band at 8', () => {
    expect(AICoach.getRPEFeedback(8).message).toMatch(/En el blanco/i);
    expect(AICoach.getRPEFeedback(8).tone).toBe('success');
  });

  it('suggests adding load below the band', () => {
    expect(AICoach.getRPEFeedback(7).message).toMatch(/2\.5 kg/);
    expect(AICoach.getRPEFeedback(6).message).toMatch(/5%/);
  });
});

describe('getWorkoutTips (consejos durante el entreno)', () => {
  it('returns an empty array without a workout', () => {
    expect(AICoach.getWorkoutTips(null)).toEqual([]);
    expect(AICoach.getWorkoutTips({ exercises: [] })).toEqual([]);
  });

  it('advises backing off after a near-failure session', () => {
    Storage.saveWorkouts([wk(1, [set(80, 9.5)]), wk(4, [set(100, 8)])]);
    vi.spyOn(Storage, 'getExercise').mockReturnValue({ name: 'Press banca', primaryMuscle: 'pecho' });
    vi.spyOn(AICoach, 'getMuscleFatigue').mockReturnValue({});
    const tips = AICoach.getWorkoutTips({ exercises: [{ exerciseId: EX }] });
    expect(tips[0].text).toMatch(/Press banca/);
    expect(tips[0].text).toMatch(/RPE 9\.5/);
    expect(tips[0].text).toMatch(/baja ~5%/i);
  });

  it('advises adding load after an easy session', () => {
    Storage.saveWorkouts([wk(1, [set(100, 6.5)]), wk(4, [set(95, 7)])]);
    vi.spyOn(Storage, 'getExercise').mockReturnValue({ name: 'Press banca', primaryMuscle: 'pecho' });
    vi.spyOn(AICoach, 'getMuscleFatigue').mockReturnValue({});
    const tips = AICoach.getWorkoutTips({ exercises: [{ exerciseId: EX }] });
    expect(tips[0].text).toMatch(/subir 2\.5 kg/);
  });

  it('flags a very fatigued muscle being trained today', () => {
    Storage.saveWorkouts([wk(1, [set(100, 8)])]);
    vi.spyOn(Storage, 'getExercise').mockReturnValue({ name: 'Press banca', primaryMuscle: 'pecho' });
    vi.spyOn(AICoach, 'getRPEStats').mockReturnValue(null);
    vi.spyOn(AICoach, 'getMuscleFatigue').mockReturnValue({ pecho: 85 });
    const tips = AICoach.getWorkoutTips({ exercises: [{ exerciseId: EX }] });
    expect(tips[0].text).toMatch(/pecho.*85%/i);
  });

  it('never returns more than 3 tips', () => {
    Storage.saveWorkouts([wk(1, [set(100, 6)]), wk(4, [set(100, 6)]), wk(8, [set(100, 6)])]);
    vi.spyOn(Storage, 'getExercise').mockReturnValue({ name: 'Press banca', primaryMuscle: 'pecho' });
    vi.spyOn(AICoach, 'getMuscleFatigue').mockReturnValue({ pecho: 90 });
    const tips = AICoach.getWorkoutTips({ exercises: [{ exerciseId: EX }, { exerciseId: 'x2' }, { exerciseId: 'x3' }] });
    expect(tips.length).toBeLessThanOrEqual(3);
    expect(tips.length).toBeGreaterThan(0);
  });
});
