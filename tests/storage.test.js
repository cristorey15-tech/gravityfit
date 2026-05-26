// ============================================
// GravityFit — Storage Tests
// ============================================

import { describe, it, expect, beforeEach } from 'vitest';
import { Storage } from '../js/storage.js';

describe('Storage', () => {
  beforeEach(() => {
    // Clear internal state before each test
    Storage._state = {};
    localStorage.clear();
  });

  describe('UUID generation', () => {
    it('should generate a string in xxxx-xxxx-xxxx format', () => {
      const id = Storage.uuid();
      expect(id).toMatch(/^[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => Storage.uuid()));
      expect(ids.size).toBe(100);
    });
  });

  describe('User settings', () => {
    it('should return default user when no user stored', () => {
      const user = Storage.getUser();
      expect(user.name).toBe('Atleta');
      expect(user.units).toBe('kg');
      expect(user.defaultRestTimer).toBe(90);
      expect(user.weeklyGoal).toBe(4);
      expect(user.theme).toBe('light');
    });

    it('should save and retrieve user', () => {
      const testUser = { name: 'Test', units: 'lb', theme: 'light', favorites: [] };
      Storage.saveUser(testUser);
      const retrieved = Storage.getUser();
      expect(retrieved.name).toBe('Test');
      expect(retrieved.units).toBe('lb');
    });

    it('should return the same user object reference after save', () => {
      const testUser = { name: 'Test', units: 'kg', defaultRestTimer: 60, weeklyGoal: 5, theme: 'light', favorites: [], bodyWeight: [], achievements: [] };
      Storage.saveUser(testUser);
      const retrieved = Storage.getUser();
      expect(retrieved).toEqual(testUser);
    });
  });

  describe('Favorites', () => {
    it('should toggle favorite on', () => {
      const result = Storage.toggleFavorite('ex-1');
      expect(result).toBe(true);
      expect(Storage.isFavorite('ex-1')).toBe(true);
    });

    it('should toggle favorite off', () => {
      Storage.toggleFavorite('ex-1');
      const result = Storage.toggleFavorite('ex-1');
      expect(result).toBe(false);
      expect(Storage.isFavorite('ex-1')).toBe(false);
    });

    it('should handle multiple favorites', () => {
      Storage.toggleFavorite('ex-1');
      Storage.toggleFavorite('ex-2');
      Storage.toggleFavorite('ex-3');
      expect(Storage.isFavorite('ex-1')).toBe(true);
      expect(Storage.isFavorite('ex-2')).toBe(true);
      expect(Storage.isFavorite('ex-3')).toBe(true);
    });
  });

  describe('Routines CRUD', () => {
    it('should return empty array initially', () => {
      expect(Storage.getRoutines()).toEqual([]);
    });

    it('should add a routine with id and createdAt', () => {
      const routine = Storage.addRoutine({ name: 'Push Day', exercises: [] });
      expect(routine.id).toBeDefined();
      expect(routine.name).toBe('Push Day');
      expect(routine.createdAt).toBeDefined();
      
      const routines = Storage.getRoutines();
      expect(routines.length).toBe(1);
      expect(routines[0].name).toBe('Push Day');
    });

    it('should update a routine', () => {
      const routine = Storage.addRoutine({ name: 'Old Name', exercises: [] });
      Storage.updateRoutine(routine.id, { name: 'New Name' });
      const updated = Storage.getRoutine(routine.id);
      expect(updated.name).toBe('New Name');
    });

    it('should delete a routine', () => {
      const r1 = Storage.addRoutine({ name: 'R1' });
      const r2 = Storage.addRoutine({ name: 'R2' });
      Storage.deleteRoutine(r1.id);
      expect(Storage.getRoutines().length).toBe(1);
      expect(Storage.getRoutines()[0].name).toBe('R2');
    });
  });

  describe('Workouts CRUD', () => {
    it('should add a workout with id', () => {
      const workout = Storage.addWorkout({ exercises: [] });
      expect(workout.id).toBeDefined();
      expect(Storage.getWorkouts().length).toBe(1);
    });

    it('should get a workout by id', () => {
      const w = Storage.addWorkout({ exercises: [] });
      expect(Storage.getWorkout(w.id)).toBeDefined();
      expect(Storage.getWorkout('nonexistent')).toBeNull();
    });

    it('should delete a workout', () => {
      const w1 = Storage.addWorkout({ name: 'W1' });
      const w2 = Storage.addWorkout({ name: 'W2' });
      Storage.deleteWorkout(w1.id);
      expect(Storage.getWorkouts().length).toBe(1);
    });
  });

  describe('Active workout', () => {
    it('should save, get, and clear active workout', () => {
      const w = { id: 'active-1', exercises: [] };
      Storage.saveActiveWorkout(w);
      expect(Storage.getActiveWorkout()).toEqual(w);
      Storage.clearActiveWorkout();
      expect(Storage.getActiveWorkout()).toBeNull();
    });
  });

  describe('Custom exercises', () => {
    it('should add custom exercise with custom prefix', () => {
      const ex = Storage.addCustomExercise({ name: 'My Exercise' });
      expect(ex.id).toMatch(/^custom-/);
      expect(ex.isCustom).toBe(true);
    });

    it('should delete custom exercise', () => {
      const ex = Storage.addCustomExercise({ name: 'Test' });
      expect(Storage.getCustomExercises().length).toBe(1);
      Storage.deleteCustomExercise(ex.id);
      expect(Storage.getCustomExercises().length).toBe(0);
    });
  });

  describe('Volume calculation', () => {
    it('should calculate total volume correctly', () => {
      const workout = {
        exercises: [
          {
            sets: [
              { completed: true, weight: 100, reps: 10 },
              { completed: true, weight: 100, reps: 8 },
              { completed: false, weight: 100, reps: 5 },
            ]
          },
          {
            sets: [
              { completed: true, weight: 50, reps: 12 },
            ]
          }
        ]
      };
      const volume = Storage.getTotalVolume(workout);
      // 100*10 + 100*8 + 50*12 = 1000 + 800 + 600 = 2400
      expect(volume).toBe(2400);
    });

    it('should return 0 for empty workout', () => {
      expect(Storage.getTotalVolume({ exercises: [] })).toBe(0);
      expect(Storage.getTotalVolume({})).toBe(0);
    });
  });

  describe('Streak calculation', () => {
    it('should return 0 when no workouts', () => {
      expect(Storage.getStreak()).toBe(0);
    });

    it('should count consecutive days', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      Storage._state['gf_workouts'] = [
        { finishedAt: today.toISOString() },
        { finishedAt: yesterday.toISOString() },
        { finishedAt: twoDaysAgo.toISOString() },
      ];

      const streak = Storage.getStreak();
      expect(streak).toBeGreaterThanOrEqual(3);
    });

    it('should break streak when there is a gap', () => {
      const today = new Date();
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      Storage._state['gf_workouts'] = [
        { finishedAt: today.toISOString() },
        { finishedAt: threeDaysAgo.toISOString() },
      ];

      const streak = Storage.getStreak();
      expect(streak).toBeGreaterThanOrEqual(1);
      expect(streak).toBeLessThan(3);
    });
  });

  describe('XP Calculation', () => {
    it('should return 0 with no data', () => {
      Storage._state['gf_workouts'] = [];
      Storage._state['gf_user'] = { achievements: [] };
      expect(Storage.calculateXP()).toBe(0);
    });

    it('should give XP per workout and volume', () => {
      Storage._state['gf_workouts'] = [
        {
          finishedAt: new Date().toISOString(),
          exercises: [{
            sets: [{ completed: true, weight: 100, reps: 10 }]
          }]
        }
      ];
      Storage._state['gf_user'] = { achievements: [] };

      const xp = Storage.calculateXP();
      // 1 workout * 100 + 0 streak * 50 + 0 achievements * 200 + floor(1000/500) volume
      expect(xp).toBeGreaterThanOrEqual(100);
    });

    it('should give XP for achievements', () => {
      Storage._state['gf_workouts'] = [];
      Storage._state['gf_user'] = { achievements: ['badge1', 'badge2', 'badge3'] };
      
      const xp = Storage.calculateXP();
      expect(xp).toBe(600); // 3 achievements * 200 XP
    });
  });

  describe('User Level', () => {
    it('should return Novato level at 0 XP', () => {
      Storage._state['gf_workouts'] = [];
      Storage._state['gf_user'] = { achievements: [] };
      const level = Storage.getUserLevel();
      expect(level.name).toBe('Novato');
      expect(level.xp).toBe(0);
      expect(level.nextLevel).toBeDefined();
    });

    it('should return correct level based on xp', () => {
      Storage._state['gf_workouts'] = Array.from({ length: 50 }, (_, i) => ({
        finishedAt: new Date(Date.now() - i * 86400000).toISOString(),
        exercises: [{
          sets: [{ completed: true, weight: 100, reps: 10 }]
        }]
      }));
      Storage._state['gf_user'] = { achievements: [] };

      const level = Storage.getUserLevel();
      expect(level.name).toBeDefined();
      expect(level.progress).toBeGreaterThanOrEqual(0);
      expect(level.progress).toBeLessThanOrEqual(1);
    });
  });

  describe('Export / Import', () => {
    it('should export and import data correctly', () => {
      Storage.addRoutine({ name: 'Test Routine', exercises: [] });
      Storage.addWorkout({ exercises: [{ sets: [{ completed: true, weight: 50, reps: 10 }] }] });

      const exported = Storage.exportData();
      const parsed = JSON.parse(exported);

      expect(parsed.routines).toHaveLength(1);
      expect(parsed.workouts).toHaveLength(1);
      expect(parsed.exportedAt).toBeDefined();

      // Clear and import
      Storage._state = {};
      const success = Storage.importData(exported);
      expect(success).toBe(true);
      expect(Storage.getRoutines()).toHaveLength(1);
      expect(Storage.getWorkouts()).toHaveLength(1);
    });

    it('should return false for invalid import data', () => {
      const success = Storage.importData('not valid json');
      expect(success).toBe(false);
    });
  });

  describe('Week comparison', () => {
    it('should return zero values when no workouts', () => {
      const comp = Storage.getWeekComparison();
      expect(comp.thisWeekCount).toBe(0);
      expect(comp.thisVol).toBe(0);
    });
  });
});
