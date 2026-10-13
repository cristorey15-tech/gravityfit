// ============================================
// GravityFit — Progress Analytics Tests
// ============================================

import { describe, it, expect } from 'vitest';
import { Progress } from '../js/progress.js';

// Deterministic resolver for tests
const resolver = (id) => {
  const map = {
    'bench': { id, name: 'Press de banca', primaryMuscle: 'pecho', icon: '🫁' },
    'squat': { id, name: 'Sentadilla', primaryMuscle: 'cuadriceps', icon: '🦵' },
    'row': { id, name: 'Remo', primaryMuscle: 'espalda', icon: '🔙' },
  };
  return map[id] || null;
};

const iso = (y, m, d, h = 12) => new Date(y, m - 1, d, h).toISOString();

describe('Progress.epley', () => {
  it('computes weight × (1 + reps/30)', () => {
    expect(Progress.epley(100, 10)).toBeCloseTo(133.33, 1);
  });

  it('returns 0 for invalid inputs', () => {
    expect(Progress.epley(0, 10)).toBe(0);
    expect(Progress.epley(100, 0)).toBe(0);
    expect(Progress.epley(null, 10)).toBe(0);
    expect(Progress.epley(100, null)).toBe(0);
    expect(Progress.epley(-5, 10)).toBe(0);
  });
});

describe('Progress.getE1RMHistory', () => {
  const workouts = [
    { finishedAt: iso(2026, 1, 10), exercises: [{ exerciseId: 'bench', sets: [{ weight: 80, reps: 8, completed: true }, { weight: 80, reps: 8, completed: false }] }] },
    { finishedAt: iso(2026, 1, 20), exercises: [{ exerciseId: 'bench', sets: [{ weight: 85, reps: 6, completed: true }] }] },
    { finishedAt: iso(2026, 2, 1), exercises: [{ exerciseId: 'squat', sets: [{ weight: 120, reps: 5, completed: true }] }] },
  ];

  it('returns only sessions for the target exercise, oldest first', () => {
    const hist = Progress.getE1RMHistory(workouts, 'bench');
    expect(hist).toHaveLength(2);
    expect(hist[0].weight).toBe(80);
    expect(hist[1].weight).toBe(85);
  });

  it('computes e1RM from the best completed set', () => {
    const hist = Progress.getE1RMHistory(workouts, 'bench');
    // 80×(1+8/30)=101.33 → 101.3
    expect(hist[0].e1rm).toBeCloseTo(101.3, 1);
  });

  it('ignores uncompleted sets', () => {
    const w = [{ finishedAt: iso(2026, 3, 1), exercises: [{ exerciseId: 'bench', sets: [{ weight: 200, reps: 1, completed: false }] }] }];
    expect(Progress.getE1RMHistory(w, 'bench')).toHaveLength(0);
  });

  it('handles empty input', () => {
    expect(Progress.getE1RMHistory([], 'bench')).toHaveLength(0);
    expect(Progress.getE1RMHistory(null, 'bench')).toHaveLength(0);
  });
});

describe('Progress.getTopStrengthExercises', () => {
  const workouts = [
    { finishedAt: iso(2026, 1, 5), exercises: [{ exerciseId: 'bench', sets: [{ weight: 80, reps: 8, completed: true }] }] },
    { finishedAt: iso(2026, 1, 12), exercises: [{ exerciseId: 'bench', sets: [{ weight: 82, reps: 8, completed: true }] }, { exerciseId: 'squat', sets: [{ weight: 120, reps: 5, completed: true }] }] },
    { finishedAt: iso(2026, 1, 19), exercises: [{ exerciseId: 'bench', sets: [{ weight: 84, reps: 8, completed: true }] }] },
  ];

  it('ranks exercises by number of weighted sessions', () => {
    const top = Progress.getTopStrengthExercises(workouts, resolver, 3);
    expect(top[0].exerciseId).toBe('bench');
    expect(top[0].sessions).toBe(3);
    expect(top[1].exerciseId).toBe('squat');
  });

  it('computes latest e1RM and % delta', () => {
    const top = Progress.getTopStrengthExercises(workouts, resolver, 1);
    const bench = top[0];
    // 84×(1+8/30)=106.4 latest; 80×(1+8/30)=101.33 first
    expect(bench.latestE1RM).toBeCloseTo(106.4, 0);
    expect(bench.deltaPct).toBeGreaterThan(0);
  });

  it('resolves exercise names', () => {
    const top = Progress.getTopStrengthExercises(workouts, resolver, 1);
    expect(top[0].name).toBe('Press de banca');
  });

  it('respects the limit', () => {
    expect(Progress.getTopStrengthExercises(workouts, resolver, 2)).toHaveLength(2);
  });
});

describe('Progress.getMuscleVolumeByWeek', () => {
  it('aggregates strength volume per muscle per week', () => {
    const now = new Date();
    const thisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12).toISOString();
    const res = Progress.getMuscleVolumeByWeek(
      [{ finishedAt: thisWeek, exercises: [{ exerciseId: 'bench', sets: [{ weight: 80, reps: 8, completed: true }] }] }],
      resolver,
      8
    );
    const pecho = res.series.find(s => s.muscle === 'pecho');
    expect(pecho).toBeTruthy();
    expect(pecho.total).toBe(640); // 80×8
    expect(pecho.values).toHaveLength(8);
    expect(res.labels).toHaveLength(8);
  });

  it('sorts series by total volume desc and excludes zero-volume muscles', () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12).toISOString();
    const res = Progress.getMuscleVolumeByWeek(
      [{
        finishedAt: today,
        exercises: [
          { exerciseId: 'squat', sets: [{ weight: 120, reps: 5, completed: true }] }, // 600
          { exerciseId: 'bench', sets: [{ weight: 80, reps: 8, completed: true }] },  // 640
        ],
      }],
      resolver,
      4
    );
    expect(res.series[0].muscle).toBe('pecho');
    expect(res.series[1].muscle).toBe('cuadriceps');
    expect(res.series.every(s => s.total > 0)).toBe(true);
  });

  it('ignores workouts outside the week window', () => {
    const old = iso(2020, 1, 6);
    const res = Progress.getMuscleVolumeByWeek(
      [{ finishedAt: old, exercises: [{ exerciseId: 'bench', sets: [{ weight: 80, reps: 8, completed: true }] }] }],
      resolver,
      4
    );
    expect(res.series).toHaveLength(0);
  });

  it('ignores uncompleted sets and unknown muscles', () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12).toISOString();
    const res = Progress.getMuscleVolumeByWeek(
      [{
        finishedAt: today,
        exercises: [
          { exerciseId: 'bench', sets: [{ weight: 80, reps: 8, completed: false }] },
          { exerciseId: 'mystery', sets: [{ weight: 100, reps: 10, completed: true }] },
        ],
      }],
      resolver,
      2
    );
    expect(res.series).toHaveLength(0);
  });

  it('returns empty series for no workouts', () => {
    expect(Progress.getMuscleVolumeByWeek([], resolver, 4).series).toHaveLength(0);
    expect(Progress.getMuscleVolumeByWeek(null, resolver, 4).series).toHaveLength(0);
  });
});
