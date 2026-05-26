// ============================================
// GravityFit — Gamification Tests
// ============================================

import { describe, it, expect, beforeEach } from 'vitest';
import { Gamification } from '../js/gamification.js';
import { Storage } from '../js/storage.js';

describe('Gamification', () => {
  beforeEach(() => {
    Storage._state = {};
  });

  describe('Level math', () => {
    it('getLevelFromXP should return 1 for 0 XP', () => {
      expect(Gamification.getLevelFromXP(0)).toBe(1);
      expect(Gamification.getLevelFromXP(null)).toBe(1);
      expect(Gamification.getLevelFromXP(undefined)).toBe(1);
    });

    it('getLevelFromXP should increase with XP', () => {
      expect(Gamification.getLevelFromXP(0)).toBe(1);
      expect(Gamification.getLevelFromXP(100)).toBe(2);
      expect(Gamification.getLevelFromXP(400)).toBe(3);
      expect(Gamification.getLevelFromXP(900)).toBe(4);
      expect(Gamification.getLevelFromXP(1600)).toBe(5);
    });

    it('getXPForLevel should return correct XP thresholds', () => {
      expect(Gamification.getXPForLevel(1)).toBe(0);
      expect(Gamification.getXPForLevel(2)).toBe(100);
      expect(Gamification.getXPForLevel(3)).toBe(400);
      expect(Gamification.getXPForLevel(4)).toBe(900);
      expect(Gamification.getXPForLevel(10)).toBe(8100);
    });

    it('getLevelProgress should return correct progress', () => {
      const progress1 = Gamification.getLevelProgress(100);
      expect(progress1.currentXP).toBe(0);
      expect(progress1.requiredXP).toBe(300);
      expect(progress1.percentage).toBe(0);

      const progress2 = Gamification.getLevelProgress(250);
      expect(progress2.currentXP).toBe(150);
      expect(progress2.requiredXP).toBe(300);
      expect(progress2.percentage).toBe(50);

      const progress3 = Gamification.getLevelProgress(500);
      expect(progress3.currentXP).toBe(100);
      expect(progress3.requiredXP).toBe(500);
      expect(progress3.percentage).toBe(20);
    });

    it('should have 21 badges defined (10 easy + 6 medium + 5 hard)', () => {
      expect(Gamification.BADGES).toHaveLength(21);
    });

    it('each badge should have required fields', () => {
      Gamification.BADGES.forEach(badge => {
        expect(badge.id).toBeDefined();
        expect(badge.icon).toBeDefined();
        expect(badge.title).toBeDefined();
        expect(badge.desc).toBeDefined();
        expect(badge.reqType).toBeDefined();
      });
    });

    it('should have correct XP_RATES', () => {
      expect(Gamification.XP_RATES.WORKOUT_COMPLETE).toBe(50);
      expect(Gamification.XP_RATES.PER_SET_COMPLETED).toBe(5);
      expect(Gamification.XP_RATES.PER_PR_BROKEN).toBe(25);
      expect(Gamification.XP_RATES.STREAK_BONUS).toBe(10);
    });
  });

  describe('processWorkout', () => {
    it('should award base XP for completing a workout', () => {
      Storage._state['gf_user'] = {};
      Storage._state['gf_workouts'] = [];

      const result = Gamification.processWorkout({
        exercises: [],
        finishedAt: new Date().toISOString()
      });

      expect(result.xpEarned).toBe(50);
      expect(Storage.getUser().xp).toBe(50);
    });

    it('should award extra XP per completed set', () => {
      Storage._state['gf_user'] = {};
      Storage._state['gf_workouts'] = [];

      const result = Gamification.processWorkout({
        exercises: [{
          sets: [
            { completed: true, weight: 100, reps: 10 },
            { completed: true, weight: 100, reps: 8 },
            { completed: false, weight: 100, reps: 5 },
          ]
        }],
        finishedAt: new Date().toISOString()
      });

      expect(result.xpEarned).toBe(60); // 50 base + 2 sets * 5
    });

    it('should award XP per PR broken', () => {
      Storage._state['gf_user'] = {};
      Storage._state['gf_workouts'] = [];

      const result = Gamification.processWorkout({
        exercises: [{ sets: [{ completed: true, weight: 100, reps: 10 }] }],
        finishedAt: new Date().toISOString()
      }, 3);

      expect(result.xpEarned).toBe(130); // 50 base + 5 set + 75 PRs
    });

    it('should detect level up', () => {
      Storage._state['gf_user'] = { xp: 90 };
      Storage._state['gf_workouts'] = [];

      const result = Gamification.processWorkout({
        exercises: [{ sets: [{ completed: true, weight: 100, reps: 10 }] }],
        finishedAt: new Date().toISOString()
      });

      expect(result.newLevel).toBe(2);
      expect(Storage.getUser().xp).toBe(145);
    });

    it('should not detect level up when staying in same level', () => {
      Storage._state['gf_user'] = { xp: 5 };
      Storage._state['gf_workouts'] = [];

      const result = Gamification.processWorkout({
        exercises: [],
        finishedAt: new Date().toISOString()
      });
      expect(result.newLevel).toBeNull();
    });
  });

  describe('Badges', () => {
    it('should unlock first_blood badge on first workout', () => {
      Storage._state['gf_user'] = {};
      // Pre-populate with 1 workout so that getWorkouts().length >= 1
      Storage._state['gf_workouts'] = [{
        finishedAt: new Date(Date.now() - 86400000).toISOString()
      }];

      const result = Gamification.processWorkout({
        exercises: [],
        finishedAt: new Date().toISOString()
      });

      const firstBlood = result.newBadges.find(b => b.id === 'first_blood');
      expect(firstBlood).toBeDefined();
      expect(firstBlood.title).toBe('Primera Sangre');
    });

    it('should not unlock already owned badges', () => {
      Storage._state['gf_user'] = { badges: ['first_blood'] };
      Storage._state['gf_workouts'] = [{}];

      const result = Gamification.processWorkout({
        exercises: [],
        finishedAt: new Date().toISOString()
      });

      expect(result.newBadges.find(b => b.id === 'first_blood')).toBeUndefined();
    });

    it('should unlock volume_beast badge', () => {
      Storage._state['gf_user'] = {};
      // Pre-populate with 1 workout so first_blood unlocks too
      Storage._state['gf_workouts'] = [{
        finishedAt: new Date(Date.now() - 86400000).toISOString()
      }];

      const result = Gamification.processWorkout({
        exercises: [{
          sets: [
            { completed: true, weight: 200, reps: 10 },
            { completed: true, weight: 200, reps: 10 },
            { completed: true, weight: 200, reps: 10 },
            { completed: true, weight: 200, reps: 10 },
            { completed: true, weight: 200, reps: 10 },
          ]
        }],
        finishedAt: new Date().toISOString()
      });

      // Total volume: 200*10*5 = 10,000 >= 10,000 → volume_beast unlocked
      const volumeBeast = result.newBadges.find(b => b.id === 'volume_beast');
      expect(volumeBeast).toBeDefined();
      expect(volumeBeast.title).toBe('Bestia del Volumen');
      // Should have both first_blood (1 workout in storage) and volume_beast (10,000 volume)
      expect(result.newBadges.length).toBeGreaterThanOrEqual(2);
    });

    it('should unlock dedication_10 badge after 10 workouts', () => {
      Storage._state['gf_user'] = {};
      // Pre-populate with 10 workouts (processWorkout reads getWorkouts())
      Storage._state['gf_workouts'] = Array.from({ length: 10 }, (_, i) => ({
        finishedAt: new Date(Date.now() - i * 86400000).toISOString()
      }));

      const result = Gamification.processWorkout({
        exercises: [],
        finishedAt: new Date().toISOString()
      });

      const dedication10 = result.newBadges.find(b => b.id === 'dedication_10');
      expect(dedication10).toBeDefined();
      expect(dedication10.title).toBe('Compromiso de Bronce');
    });

    it('should unlock night_owl badge for late night workouts', () => {
      Storage._state['gf_user'] = {};
      Storage._state['gf_workouts'] = [{
        finishedAt: new Date(Date.now() - 86400000).toISOString()
      }];

      // Finished at 3 AM
      const nightTime = new Date();
      nightTime.setHours(3, 0, 0, 0);

      const result = Gamification.processWorkout({
        exercises: [],
        finishedAt: nightTime.toISOString()
      });

      const nightOwl = result.newBadges.find(b => b.id === 'night_owl');
      expect(nightOwl).toBeDefined();
    });
  });
});
