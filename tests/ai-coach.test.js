// ============================================
// GravityFit — AI Coach Tests
// ============================================
// Focused tests for RPE-based weight suggestion and proactive insights.
// Mock the UI/app modules so importing ai-coach doesn't pull the whole app.

import { describe, it, expect, beforeEach, vi } from 'vitest';
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
});
