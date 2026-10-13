// ============================================
// GravityFit — Calories Module Tests
// ============================================

import { describe, it, expect } from 'vitest';
import { Calories } from '../js/calories.js';

// Helper: date string N days before "now" in local ISO format (YYYY-MM-DD),
// matching what profile.js saves.
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

describe('Calories', () => {
  describe('getBodyWeightKg (freshness ≤ 2 weeks)', () => {
    it('returns latest logged body weight when fresh', () => {
      const user = { bodyWeight: [{ date: daysAgo(30), weight: 75 }, { date: daysAgo(2), weight: 78 }] };
      expect(Calories.getBodyWeightKg(user)).toBe(78);
    });

    it('ignores weights older than 2 weeks and uses 70kg default', () => {
      const user = { bodyWeight: [{ date: daysAgo(60), weight: 75 }, { date: daysAgo(21), weight: 78 }] };
      expect(Calories.getBodyWeightKg(user)).toBe(70);
    });

    it('accepts weights exactly 14 days old (boundary)', () => {
      const user = { bodyWeight: [{ date: daysAgo(14), weight: 82 }] };
      expect(Calories.getBodyWeightKg(user)).toBe(82);
    });

    it('accepts legacy locale-format dates when fresh', () => {
      const d = new Date();
      d.setDate(d.getDate() - 3);
      const user = { bodyWeight: [{ date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), weight: 77 }] };
      expect(Calories.getBodyWeightKg(user)).toBe(77);
    });

    it('treats unparseable dates as stale', () => {
      const user = { bodyWeight: [{ date: 'not-a-date', weight: 90 }] };
      expect(Calories.getBodyWeightKg(user)).toBe(70);
    });

    it('falls back to 70kg default when no weight logged', () => {
      expect(Calories.getBodyWeightKg({ bodyWeight: [] })).toBe(70);
      expect(Calories.getBodyWeightKg(null)).toBe(70);
      expect(Calories.getBodyWeightKg({})).toBe(70);
    });

    it('ignores invalid weight entries', () => {
      const user = { bodyWeight: [{ date: daysAgo(1), weight: 0 }] };
      expect(Calories.getBodyWeightKg(user)).toBe(70);
    });
  });

  describe('isWeightStale', () => {
    it('true when weight exists but older than 2 weeks', () => {
      expect(Calories.isWeightStale({ bodyWeight: [{ date: daysAgo(20), weight: 75 }] })).toBe(true);
    });
    it('false when weight is fresh', () => {
      expect(Calories.isWeightStale({ bodyWeight: [{ date: daysAgo(5), weight: 75 }] })).toBe(false);
    });
    it('false when no weight logged at all (nothing to warn about)', () => {
      expect(Calories.isWeightStale({ bodyWeight: [] })).toBe(false);
      expect(Calories.isWeightStale(null)).toBe(false);
    });
  });

  describe('cardioKcal (MET formula)', () => {
    it('computes MET × kg × hours', () => {
      // 8.3 MET × 70kg × 0.5h = 290.5
      expect(Calories.cardioKcal(8.3, 30, 70)).toBeCloseTo(290.5, 5);
    });

    it('returns 0 for missing or negative duration', () => {
      expect(Calories.cardioKcal(8.3, 0, 70)).toBe(0);
      expect(Calories.cardioKcal(8.3, null, 70)).toBe(0);
      expect(Calories.cardioKcal(8.3, -10, 70)).toBe(0);
    });

    it('uses default weight and default MET when omitted', () => {
      // 7 MET × 70kg × 1h = 490
      expect(Calories.cardioKcal(null, 60, undefined)).toBeCloseTo(490, 5);
    });
  });

  describe('getWorkoutCalories', () => {
    const resolver = (id) => {
      if (id === 'cardio-jogging') return { id, type: 'cardio', met: 8.3 };
      if (id === 'chest-barbell-bench-press') return { id, type: undefined };
      return null;
    };

    it('prefers real HR data over estimates', () => {
      const w = {
        duration: 3600,
        heartRateData: { totalCalories: 512 },
        exercises: [{ exerciseId: 'cardio-jogging', sets: [{ duration: 60, completed: true }] }],
      };
      const res = Calories.getWorkoutCalories(w, {}, resolver);
      expect(res).toEqual({ kcal: 512, source: 'hr' });
    });

    it('estimates cardio kcal from completed sets only', () => {
      const w = {
        duration: 2400,
        exercises: [{
          exerciseId: 'cardio-jogging',
          sets: [
            { duration: 30, completed: true },   // 8.3 × 70 × 0.5 = 290.5
            { duration: 30, completed: false },  // skipped
          ],
        }],
      };
      const res = Calories.getWorkoutCalories(w, { bodyWeight: [] }, resolver);
      expect(res.source).toBe('estimated');
      // cardio-only: strength portion = max(0, 60%×2400s − 30min) = 0
      expect(res.kcal).toBe(Math.round(290.5));
    });

    it('adds MET-based strength estimate using 60% of duration when timeSpent unknown', () => {
      const w = {
        duration: 3600, // 60 min → active 36 min
        exercises: [{ exerciseId: 'chest-barbell-bench-press', sets: [{ weight: 60, reps: 10, completed: true }] }],
      };
      const res = Calories.getWorkoutCalories(w, { bodyWeight: [] }, resolver);
      // 5.0 × 70kg × 0.6h = 210
      expect(res.kcal).toBe(210);
      expect(res.source).toBe('estimated');
    });

    it('uses per-exercise timeSpent when available', () => {
      const w = {
        duration: 5400,
        exercises: [{ exerciseId: 'chest-barbell-bench-press', timeSpent: 1800, sets: [] }],
      };
      const res = Calories.getWorkoutCalories(w, { bodyWeight: [] }, resolver);
      // 5.0 × 70 × (1800/3600) = 175
      expect(res.kcal).toBe(175);
    });

    it('mixes cardio and strength in one workout', () => {
      const w = {
        duration: 3600, // 60 min total; cardio 30 min → strength active = 36−30 = 6 min
        exercises: [
          { exerciseId: 'cardio-jogging', sets: [{ duration: 30, completed: true }] }, // 290.5
          { exerciseId: 'chest-barbell-bench-press', sets: [] },
        ],
      };
      const res = Calories.getWorkoutCalories(w, { bodyWeight: [] }, resolver);
      // 290.5 + 5×70×(6/60) = 290.5 + 35 = 325.5
      expect(res.kcal).toBe(Math.round(325.5));
    });

    it('respects fresh user body weight in estimates', () => {
      const w = { duration: 1800, exercises: [{ exerciseId: 'cardio-jogging', sets: [{ duration: 30, completed: true }] }] };
      const res = Calories.getWorkoutCalories(w, { bodyWeight: [{ date: daysAgo(1), weight: 90 }] }, resolver);
      // 8.3 × 90 × 0.5 = 373.5
      expect(res.kcal).toBe(Math.round(373.5));
    });

    it('ignores stale user weight in estimates (uses default 70kg)', () => {
      const w = { duration: 1800, exercises: [{ exerciseId: 'cardio-jogging', sets: [{ duration: 30, completed: true }] }] };
      const res = Calories.getWorkoutCalories(w, { bodyWeight: [{ date: daysAgo(45), weight: 90 }] }, resolver);
      // 8.3 × 70 × 0.5 = 290.5
      expect(res.kcal).toBe(Math.round(290.5));
    });

    it('returns 0 kcal for empty workout', () => {
      const res = Calories.getWorkoutCalories({ exercises: [] }, {}, resolver);
      expect(res.kcal).toBe(0);
    });
  });

  describe('estimateLive', () => {
    it('estimates using elapsed seconds as duration', () => {
      const active = { exercises: [{ exerciseId: 'cardio-jogging', sets: [{ duration: 10, completed: true }] }] };
      const res = Calories.estimateLive(active, 1800, { bodyWeight: [] }, () => ({ type: 'cardio', met: 8.3 }));
      // cardio 10min: 8.3×70×(10/60)=96.83; strength: max(0, 60%×30min − 10min)=8min → 5×70×(8/60)=46.67
      expect(res.kcal).toBe(Math.round(96.8333 + 46.6667));
    });

    it('ignores any heartRateData on the live object', () => {
      const active = { exercises: [], heartRateData: { totalCalories: 999 } };
      const res = Calories.estimateLive(active, 0, {}, () => null);
      expect(res.kcal).toBe(0);
    });
  });

  describe('getWorkoutSteps', () => {
    const resolver = (id) => {
      if (id === 'cardio-jogging') return { id, type: 'cardio', strideMeters: 0.85, speedKmh: 8 };
      if (id === 'cardio-walking') return { id, type: 'cardio', strideMeters: 0.75, speedKmh: 5.6 };
      if (id === 'cardio-hiit') return { id, type: 'cardio' }; // no stride
      if (id === 'bench') return { id }; // strength
      return null;
    };

    it('computes steps from logged distance and stride', () => {
      const w = { exercises: [{ exerciseId: 'cardio-jogging', sets: [{ distance: 4.25, completed: true }] }] };
      // 4250m / 0.85 = 5000
      expect(Calories.getWorkoutSteps(w, resolver)).toBe(5000);
    });

    it('estimates distance from speed × minutes when distance missing', () => {
      const w = { exercises: [{ exerciseId: 'cardio-walking', sets: [{ duration: 30, completed: true }] }] };
      // 5.6 km/h × 0.5h = 2.8km → 2800/0.75 = 3733.33
      expect(Calories.getWorkoutSteps(w, resolver)).toBe(3733);
    });

    it('ignores incomplete sets', () => {
      const w = { exercises: [{ exerciseId: 'cardio-jogging', sets: [{ distance: 4.25, completed: false }] }] };
      expect(Calories.getWorkoutSteps(w, resolver)).toBe(0);
    });

    it('ignores activities without stride and strength exercises', () => {
      const w = {
        exercises: [
          { exerciseId: 'cardio-hiit', sets: [{ duration: 30, completed: true }] },
          { exerciseId: 'bench', sets: [{ weight: 60, reps: 10, completed: true }] },
        ],
      };
      expect(Calories.getWorkoutSteps(w, resolver)).toBe(0);
    });

    it('sums steps across multiple blocks', () => {
      const w = {
        exercises: [{
          exerciseId: 'cardio-walking',
          sets: [
            { distance: 0.75, completed: true }, // 1000 steps
            { distance: 1.5, completed: true },  // 2000 steps
          ],
        }],
      };
      expect(Calories.getWorkoutSteps(w, resolver)).toBe(3000);
    });
  });

  describe('getTotalCalories', () => {
    it('sums stored calories and estimates missing ones', () => {
      const workouts = [
        { calories: { kcal: 400, source: 'hr' } },
        { duration: 1800, exercises: [] }, // 60%×30min=18min → 5×70×0.3=105
      ];
      expect(Calories.getTotalCalories(workouts, {})).toBe(505);
    });

    it('handles empty list', () => {
      expect(Calories.getTotalCalories([], {})).toBe(0);
      expect(Calories.getTotalCalories(null, {})).toBe(0);
    });
  });
});
