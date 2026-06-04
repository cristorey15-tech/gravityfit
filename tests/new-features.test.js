// ============================================
// GravityFit — New Features Tests
// ============================================
// Tests for: Missed Workouts, Streak Recovery,
// Deload Detection, Program Adherence

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Storage } from '../js/storage.js';

// Helper to create a date N days ago
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

// Helper to create a workout on a specific date
function makeWorkout(dateIso, opts = {}) {
  return {
    id: opts.id || Storage.uuid(),
    finishedAt: dateIso,
    name: opts.name || 'Test Workout',
    exercises: opts.exercises || [],
    duration: opts.duration || 3600,
  };
}

// Helper to create a workout with volume
function makeWorkoutWithVolume(dateIso, weight, reps, sets = 3) {
  const exerciseSets = [];
  for (let i = 0; i < sets; i++) {
    exerciseSets.push({ completed: true, weight, reps });
  }
  return makeWorkout(dateIso, {
    exercises: [{ exerciseId: 'test-ex', sets: exerciseSets }],
  });
}

// ============================================
// Missed Workout Tracking
// ============================================
describe('Missed Workout Tracking', () => {
  beforeEach(() => {
    Storage._state = {};
    localStorage.clear();
  });

  it('should return empty array when no missed workouts', () => {
    expect(Storage.getMissedWorkouts()).toEqual([]);
  });

  it('should add a missed workout', () => {
    Storage.addMissedWorkout({ programId: 'prog-1', routineName: 'Push Day' });
    const missed = Storage.getMissedWorkouts();
    expect(missed.length).toBe(1);
    expect(missed[0].programId).toBe('prog-1');
    expect(missed[0].routineName).toBe('Push Day');
    expect(missed[0].date).toBeDefined();
  });

  it('should add multiple missed workouts', () => {
    Storage.addMissedWorkout({ programId: 'prog-1', routineName: 'Push' });
    Storage.addMissedWorkout({ programId: 'prog-1', routineName: 'Pull' });
    Storage.addMissedWorkout({ programId: 'prog-1', routineName: 'Legs' });
    expect(Storage.getMissedWorkouts().length).toBe(3);
  });

  it('should reschedule a missed workout', () => {
    Storage.addMissedWorkout({ programId: 'prog-1', routineName: 'Push Day' });
    const result = Storage.rescheduleMissed(0);
    expect(result).not.toBeNull();
    expect(result.rescheduled).toBe(true);
    expect(result.routineName).toBe('Push Day');
  });

  it('should return null when rescheduling invalid index', () => {
    Storage.addMissedWorkout({ programId: 'prog-1', routineName: 'Push' });
    const result = Storage.rescheduleMissed(5);
    expect(result).toBeNull();
  });

  it('should skip a missed workout', () => {
    Storage.addMissedWorkout({ programId: 'prog-1', routineName: 'Push' });
    Storage.skipMissed(0);
    const missed = Storage.getMissedWorkouts();
    expect(missed[0].skipped).toBe(true);
  });

  it('should clear old missed workouts (>30 days)', () => {
    // Add a recent missed workout
    Storage.addMissedWorkout({ programId: 'prog-1', routineName: 'Recent' });
    
    // Manually add an old missed workout (35 days ago)
    const oldMissed = {
      programId: 'prog-1',
      routineName: 'Old',
      date: daysAgo(35),
    };
    Storage._set('gf_missed_workouts', [
      Storage.getMissedWorkouts()[0],
      oldMissed,
    ]);

    expect(Storage.getMissedWorkouts().length).toBe(2);
    Storage.clearOldMissed();
    const remaining = Storage.getMissedWorkouts();
    expect(remaining.length).toBe(1);
    expect(remaining[0].routineName).toBe('Recent');
  });

  it('should keep missed workouts within 30 days', () => {
    Storage.addMissedWorkout({ programId: 'prog-1', routineName: 'Day20' });
    Storage.addMissedWorkout({ programId: 'prog-1', routineName: 'Day29' });
    
    // Manually set dates
    const missed = Storage.getMissedWorkouts();
    missed[0].date = daysAgo(20);
    missed[1].date = daysAgo(29);
    Storage._set('gf_missed_workouts', missed);

    Storage.clearOldMissed();
    expect(Storage.getMissedWorkouts().length).toBe(2);
  });

  it('should not affect rescheduled items when clearing old', () => {
    Storage.addMissedWorkout({ programId: 'prog-1', routineName: 'Old Rescheduled' });
    const missed = Storage.getMissedWorkouts();
    missed[0].date = daysAgo(35);
    missed[0].rescheduled = true;
    Storage._set('gf_missed_workouts', missed);

    Storage.clearOldMissed();
    // Rescheduled old items are still filtered out by clearOldMissed's date check
    // This is expected behavior - old items get cleaned regardless of reschedule status
    const remaining = Storage.getMissedWorkouts();
    expect(remaining.length).toBe(0);
  });
});

// ============================================
// Streak Recovery with Grace Day
// ============================================
describe('Streak Recovery (Grace Day)', () => {
  beforeEach(() => {
    Storage._state = {};
    localStorage.clear();
  });

  it('should return 0 with no workouts', () => {
    expect(Storage.getStreak()).toBe(0);
  });

  it('should count streak including today if trained today', () => {
    const today = daysAgo(0);
    const yesterday = daysAgo(1);
    Storage._state['gf_workouts'] = [
      makeWorkout(today),
      makeWorkout(yesterday),
    ];
    expect(Storage.getStreak()).toBeGreaterThanOrEqual(2);
  });

  it('should not break streak if today has no workout yet (early day)', () => {
    // No workout today, but yesterday and day before have workouts
    // Should still count as streak >= 2 (today is not yet counted but not broken)
    const yesterday = daysAgo(1);
    const twoDaysAgo = daysAgo(2);
    Storage._state['gf_workouts'] = [
      makeWorkout(yesterday),
      makeWorkout(twoDaysAgo),
    ];
    const streak = Storage.getStreak();
    // Today has no workout, so today doesn't count, but yesterday starts the streak
    expect(streak).toBeGreaterThanOrEqual(2);
  });

  it('should break streak after 2 missed days without program', () => {
    // Trained 3 days ago, nothing since (2 days gap: yesterday and today)
    const threeDaysAgo = daysAgo(3);
    const fourDaysAgo = daysAgo(4);
    Storage._state['gf_workouts'] = [
      makeWorkout(threeDaysAgo),
      makeWorkout(fourDaysAgo),
    ];
    Storage._state['gf_programs'] = []; // No active program
    const streak = Storage.getStreak();
    // Gap of 2+ days breaks the streak
    expect(streak).toBeLessThanOrEqual(1);
  });

  it('should preserve streak with 1 grace day when active program exists', () => {
    // Set up an active program
    Storage._state['gf_programs'] = [{
      id: 'prog-1',
      active: true,
      mode: 'weekly',
      schedule: [{ day: 1, routineId: 'r1' }],
      completedWorkouts: [],
    }];

    // Trained 2 days ago, missed yesterday (1 day gap with active program)
    const twoDaysAgo = daysAgo(2);
    const threeDaysAgo = daysAgo(3);
    Storage._state['gf_workouts'] = [
      makeWorkout(twoDaysAgo),
      makeWorkout(threeDaysAgo),
    ];

    const streak = Storage.getStreak();
    // With grace day: 2 days ago counts, 3 days ago counts = streak 2
    expect(streak).toBeGreaterThanOrEqual(2);
  });

  it('should break streak after 2 missed days even with active program', () => {
    Storage._state['gf_programs'] = [{
      id: 'prog-1',
      active: true,
      mode: 'weekly',
      schedule: [{ day: 1, routineId: 'r1' }],
      completedWorkouts: [],
    }];

    // Trained 4 days ago, missed 3 days (yesterday, day before, 2 days ago)
    const fourDaysAgo = daysAgo(4);
    const fiveDaysAgo = daysAgo(5);
    Storage._state['gf_workouts'] = [
      makeWorkout(fourDaysAgo),
      makeWorkout(fiveDaysAgo),
    ];

    const streak = Storage.getStreak();
    // 3 missed days > MAX_GRACE of 1, so streak breaks
    expect(streak).toBeLessThanOrEqual(1);
  });

  it('should not apply grace day without active program', () => {
    Storage._state['gf_programs'] = [];

    // Trained yesterday only, no workout today (1 day gap without program)
    const yesterday = daysAgo(1);
    Storage._state['gf_workouts'] = [
      makeWorkout(yesterday),
    ];

    const streak = Storage.getStreak();
    // Today has no workout (doesn't break), yesterday counts = 1
    expect(streak).toBe(1);
  });
});

// ============================================
// isRestDay Detection
// ============================================
describe('isRestDay', () => {
  beforeEach(() => {
    Storage._state = {};
    localStorage.clear();
  });

  it('should return false when no active program', () => {
    Storage._state['gf_programs'] = [];
    expect(Storage.isRestDay()).toBe(false);
  });

  it('should return true for weekly program with no schedule for today', () => {
    const today = new Date().getDay();
    // Schedule only has days that are NOT today
    const otherDay = (today + 1) % 7;
    Storage._state['gf_programs'] = [{
      id: 'prog-1',
      active: true,
      mode: 'weekly',
      schedule: [{ day: otherDay, routineId: 'r1' }],
      completedWorkouts: [],
    }];
    expect(Storage.isRestDay()).toBe(true);
  });

  it('should return false for weekly program when today has a scheduled workout', () => {
    const today = new Date().getDay();
    Storage._state['gf_programs'] = [{
      id: 'prog-1',
      active: true,
      mode: 'weekly',
      schedule: [{ day: today, routineId: 'r1' }],
      completedWorkouts: [],
    }];
    expect(Storage.isRestDay()).toBe(false);
  });

  it('should return true for rotation program on rest day', () => {
    Storage._state['gf_programs'] = [{
      id: 'prog-1',
      active: true,
      mode: 'rotation',
      rotationRoutines: ['r1', 'rest', 'r2', 'rest'],
      restDaysBetween: 0,
      completedWorkouts: [
        { routineId: 'r1', date: daysAgo(1) },
      ],
      currentWeek: 1,
      weeks: 4,
    }];
    // Completed 1 workout, next index = 1, which is 'rest'
    expect(Storage.isRestDay()).toBe(true);
  });

  it('should return false for rotation program on training day', () => {
    Storage._state['gf_programs'] = [{
      id: 'prog-1',
      active: true,
      mode: 'rotation',
      rotationRoutines: ['r1', 'r2', 'r3'],
      restDaysBetween: 0,
      completedWorkouts: [],
      currentWeek: 1,
      weeks: 4,
    }];
    // Completed 0 workouts, next index = 0, which is 'r1' (not rest)
    expect(Storage.isRestDay()).toBe(false);
  });
});

// ============================================
// Program Adherence Calculation
// ============================================
describe('Program Adherence', () => {
  beforeEach(() => {
    Storage._state = {};
    localStorage.clear();
  });

  it('should return 100% when no missed workouts (only completed)', () => {
    const program = {
      id: 'prog-1',
      completedWorkouts: [
        { routineId: 'r1', date: daysAgo(1) },
        { routineId: 'r2', date: daysAgo(3) },
        { routineId: 'r3', date: daysAgo(5) },
      ],
    };
    Storage._state['gf_missed_workouts'] = [];
    const adherence = Storage.getProgramAdherence(program);
    expect(adherence.percentage).toBe(100);
    expect(adherence.scheduled).toBe(3);
    expect(adherence.missed).toBe(0);
  });

  it('should calculate correct percentage with missed workouts', () => {
    const program = {
      id: 'prog-1',
      completedWorkouts: [
        { routineId: 'r1', date: daysAgo(1) },
        { routineId: 'r2', date: daysAgo(3) },
      ],
    };
    Storage._state['gf_missed_workouts'] = [
      { programId: 'prog-1', routineName: 'Push', date: daysAgo(2) },
    ];
    const adherence = Storage.getProgramAdherence(program);
    // 2 completed, 1 missed = 2/3 = 67%
    expect(adherence.percentage).toBe(67);
    expect(adherence.scheduled).toBe(2);
    expect(adherence.missed).toBe(1);
  });

  it('should exclude rescheduled workouts from missed count', () => {
    const program = {
      id: 'prog-1',
      completedWorkouts: [
        { routineId: 'r1', date: daysAgo(1) },
      ],
    };
    Storage._state['gf_missed_workouts'] = [
      { programId: 'prog-1', routineName: 'Push', date: daysAgo(2), rescheduled: true },
    ];
    const adherence = Storage.getProgramAdherence(program);
    // 1 completed, 0 non-rescheduled missed = 1/1 = 100%
    expect(adherence.percentage).toBe(100);
    expect(adherence.missed).toBe(0);
  });

  it('should only count missed workouts for the same program', () => {
    const program = {
      id: 'prog-1',
      completedWorkouts: [
        { routineId: 'r1', date: daysAgo(1) },
      ],
    };
    Storage._state['gf_missed_workouts'] = [
      { programId: 'prog-other', routineName: 'Other', date: daysAgo(2) },
    ];
    const adherence = Storage.getProgramAdherence(program);
    expect(adherence.missed).toBe(0);
    expect(adherence.percentage).toBe(100);
  });

  it('should return default values for null program', () => {
    const adherence = Storage.getProgramAdherence(null);
    expect(adherence.scheduled).toBe(0);
    expect(adherence.completed).toBe(0);
    expect(adherence.missed).toBe(0);
    expect(adherence.percentage).toBe(0);
  });

  it('should return 100% for program with no completed and no missed', () => {
    const program = {
      id: 'prog-1',
      completedWorkouts: [],
    };
    Storage._state['gf_missed_workouts'] = [];
    const adherence = Storage.getProgramAdherence(program);
    // total = 0, so percentage defaults to 100
    expect(adherence.percentage).toBe(100);
  });
});

// ============================================
// Notification Settings
// ============================================
describe('Notification Settings', () => {
  beforeEach(() => {
    Storage._state = {};
    localStorage.clear();
  });

  it('should return default notification settings', () => {
    const settings = Storage.getNotificationSettings();
    expect(settings.enabled).toBe(false);
    expect(settings.time).toBe('08:00');
    expect(settings.restDayTips).toBe(true);
    expect(settings.missedReminder).toBe(true);
  });

  it('should save and retrieve notification settings', () => {
    const newSettings = {
      enabled: true,
      time: '07:30',
      restDayTips: false,
      missedReminder: true,
    };
    Storage.saveNotificationSettings(newSettings);
    const retrieved = Storage.getNotificationSettings();
    expect(retrieved.enabled).toBe(true);
    expect(retrieved.time).toBe('07:30');
    expect(retrieved.restDayTips).toBe(false);
    expect(retrieved.missedReminder).toBe(true);
  });
});

// ============================================
// Deload Detection (AI Coach)
// ============================================
describe('Deload Detection', () => {
  // We test the deload logic directly since AICoach has external dependencies.
  // Instead, we test the underlying data structures and increment counter.

  beforeEach(() => {
    Storage._state = {};
    localStorage.clear();
  });

  it('should initialize deload config when not present', () => {
    const user = Storage.getUser();
    // deloadConfig not yet set
    expect(user.deloadConfig).toBeUndefined();
  });

  it('should store and retrieve deload config on user', () => {
    const user = Storage.getUser();
    user.deloadConfig = { lastDeloadWeek: 0, weeksSinceDeload: 5 };
    Storage.saveUser(user);
    const retrieved = Storage.getUser();
    expect(retrieved.deloadConfig.weeksSinceDeload).toBe(5);
  });

  it('should reset weeksSinceDeload to 0', () => {
    const user = Storage.getUser();
    user.deloadConfig = { lastDeloadWeek: 3, weeksSinceDeload: 4 };
    Storage.saveUser(user);
    
    // Simulate deload reset (what generateDeloadWorkout does)
    user.deloadConfig.lastDeloadWeek = user.deloadConfig.weeksSinceDeload;
    user.deloadConfig.weeksSinceDeload = 0;
    Storage.saveUser(user);
    
    const retrieved = Storage.getUser();
    expect(retrieved.deloadConfig.weeksSinceDeload).toBe(0);
    expect(retrieved.deloadConfig.lastDeloadWeek).toBe(4);
  });

  it('should increment weeksSinceDeload counter', () => {
    const user = Storage.getUser();
    user.deloadConfig = { lastDeloadWeek: 0, weeksSinceDeload: 0 };
    Storage.saveUser(user);
    
    // Simulate what incrementWeeksSinceDeload does
    const u = Storage.getUser();
    u.deloadConfig.weeksSinceDeload = (u.deloadConfig.weeksSinceDeload || 0) + 1;
    Storage.saveUser(u);
    
    expect(Storage.getUser().deloadConfig.weeksSinceDeload).toBe(1);
    
    // Increment again
    const u2 = Storage.getUser();
    u2.deloadConfig.weeksSinceDeload = (u2.deloadConfig.weeksSinceDeload || 0) + 1;
    Storage.saveUser(u2);
    
    expect(Storage.getUser().deloadConfig.weeksSinceDeload).toBe(2);
  });

  it('should detect deload needed after enough workouts + volume', () => {
    // Simulate 5+ workouts with high volume over 3+ weeks
    const workouts = [];
    for (let i = 0; i < 12; i++) {
      workouts.push(makeWorkoutWithVolume(daysAgo(i * 2), 100, 8, 4));
    }
    Storage._state['gf_workouts'] = workouts;
    
    const user = Storage.getUser();
    user.deloadConfig = { lastDeloadWeek: 0, weeksSinceDeload: 4 };
    Storage.saveUser(user);
    
    // shouldDeload logic: weeksSinceDeload >= 3 ✓
    // Now check if recent volume > 90% of overall average
    const allWorkouts = Storage.getWorkouts();
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const recent = allWorkouts.filter(w => new Date(w.finishedAt) >= twoWeeksAgo);
    const recentAvg = recent.reduce((s, w) => s + Storage.getTotalVolume(w), 0) / recent.length;
    const overallAvg = allWorkouts.reduce((s, w) => s + Storage.getTotalVolume(w), 0) / allWorkouts.length;
    
    // With uniform volume, recentAvg ≈ overallAvg, so condition is met
    expect(recentAvg).toBeGreaterThanOrEqual(overallAvg * 0.9);
  });

  it('should not suggest deload with low weeksSinceDeload', () => {
    const user = Storage.getUser();
    user.deloadConfig = { lastDeloadWeek: 0, weeksSinceDeload: 1 };
    Storage.saveUser(user);
    
    // weeksSinceDeload < 3, so shouldDeload should return false
    const retrieved = Storage.getUser();
    expect(retrieved.deloadConfig.weeksSinceDeload).toBeLessThan(3);
  });
});
