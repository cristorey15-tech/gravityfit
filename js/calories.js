// ============================================
// GravityFit — Calories Module
// Estimates energy expenditure per workout.
//
// Priority:
//   1. Real HR data (Keytel formula via BLE) — most accurate.
//   2. MET-based estimate (Compendium of Physical Activities):
//      kcal = MET × peso(kg) × horas.
//      - Cardio activities use their own MET (data/cardio-activities.json).
//      - Resistance training uses a general MET (5.0) applied to the
//        ACTIVE time (per-exercise timeSpent when logged, else 60% of
//        total duration as a rest-inclusive estimate).
// ============================================

import { Storage } from './storage.js';

export const Calories = {
  DEFAULT_WEIGHT_KG: 70,
  STRENGTH_MET: 5.0, // resistance training, general (Compendium ~5.0-6.0)
  STRENGTH_ACTIVE_RATIO: 0.6, // fraction of total duration assumed "working" when timeSpent is unknown
  MAX_WEIGHT_AGE_DAYS: 14, // weight logins older than this are ignored for estimates

  // Parse a body-weight entry date. Entries were historically saved with
  // toLocaleDateString() (e.g. "Oct 13, 2026" / "13 oct 2026") and now with
  // ISO 'YYYY-MM-DD'. Returns null when the date can't be trusted.
  _parseWeightDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      // ISO: parse as LOCAL midnight (not UTC) to avoid off-by-one
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  },

  // Age in days of the NEWEST parsable weight entry, or null if none.
  // Uses calendar-day difference (both dates normalized to local midnight)
  // since weight entries only carry a date, no time.
  getWeightAgeDays(user, now = new Date()) {
    const bw = user?.bodyWeight;
    if (!Array.isArray(bw)) return null;
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (let i = bw.length - 1; i >= 0; i--) {
      const entry = bw[i];
      if (!entry || !(entry.weight > 0)) continue;
      const d = this._parseWeightDate(entry.date);
      if (!d) continue;
      return Math.round((nowMidnight - d) / 86400000);
    }
    return null;
  },

  // True when the user HAS a weight log but it's older than MAX_WEIGHT_AGE_DAYS
  isWeightStale(user, now = new Date()) {
    const age = this.getWeightAgeDays(user, now);
    return age !== null && age > this.MAX_WEIGHT_AGE_DAYS;
  },

  // Weight used for estimates: latest entry ONLY if fresher than 2 weeks.
  // Stale or missing weight falls back to the default so that old
  // before-bulk/after-cut weights don't skew the calorie estimate.
  getBodyWeightKg(user, now = new Date()) {
    const age = this.getWeightAgeDays(user, now);
    if (age === null || age > this.MAX_WEIGHT_AGE_DAYS) return this.DEFAULT_WEIGHT_KG;
    // Re-fetch the newest parsable entry (age computed above guarantees it exists)
    const bw = user.bodyWeight;
    for (let i = bw.length - 1; i >= 0; i--) {
      const last = bw[i];
      if (!last || !(last.weight > 0)) continue;
      if (this._parseWeightDate(last.date)) return last.weight;
    }
    return this.DEFAULT_WEIGHT_KG;
  },

  // Estimated steps for walking/running cardio blocks.
  // Uses stride length when distance is logged; otherwise estimates distance
  // from the activity's typical speed × minutes.
  getWorkoutSteps(workout, exerciseResolver) {
    const resolve = exerciseResolver || ((id) => Storage.getExercise(id));
    let steps = 0;
    (workout.exercises || []).forEach(ex => {
      const data = resolve(ex.exerciseId);
      if (!data || data.type !== 'cardio' || !(data.strideMeters > 0)) return;
      (ex.sets || []).forEach(s => {
        if (!s.completed) return;
        let km = 0;
        if (s.distance > 0) {
          km = s.distance;
        } else if (data.speedKmh > 0 && s.duration > 0) {
          km = data.speedKmh * (s.duration / 60);
        }
        if (km > 0) steps += (km * 1000) / data.strideMeters;
      });
    });
    return Math.round(steps);
  },

  // kcal = MET × kg × horas
  cardioKcal(met, minutes, weightKg) {
    if (!minutes || minutes <= 0) return 0;
    return (met || 7) * (weightKg || this.DEFAULT_WEIGHT_KG) * (minutes / 60);
  },

  // kcal for the resistance-training portion of a session
  strengthKcal(activeSec, weightKg) {
    if (!activeSec || activeSec <= 0) return 0;
    return this.STRENGTH_MET * (weightKg || this.DEFAULT_WEIGHT_KG) * (activeSec / 3600);
  },

  // Total calories for a finished workout.
  // Returns { kcal, source: 'hr' | 'estimated' }.
  // exerciseResolver is injectable for tests; defaults to Storage lookup.
  getWorkoutCalories(workout, user, exerciseResolver) {
    const resolve = exerciseResolver || ((id) => Storage.getExercise(id));

    // 1) Real sensor data wins
    const hr = workout.heartRateData?.totalCalories;
    if (hr > 0) {
      return { kcal: Math.round(hr), source: 'hr' };
    }

    const weightKg = this.getBodyWeightKg(user);
    let kcal = 0;
    let cardioMin = 0;
    let activeSec = 0;

    (workout.exercises || []).forEach(ex => {
      const data = resolve(ex.exerciseId);
      if (data && data.type === 'cardio') {
        (ex.sets || []).forEach(s => {
          if (s.completed && s.duration > 0) {
            cardioMin += s.duration;
            kcal += this.cardioKcal(data.met, s.duration, weightKg);
          }
        });
      } else if (ex.timeSpent > 0) {
        activeSec += ex.timeSpent;
      }
    });

    if (!activeSec && workout.duration > 0) {
      activeSec = workout.duration * this.STRENGTH_ACTIVE_RATIO;
    }
    kcal += this.strengthKcal(Math.max(0, activeSec - cardioMin * 60), weightKg);

    return { kcal: Math.round(kcal), source: 'estimated' };
  },

  // Live estimate while a workout is in progress (elapsed seconds so far)
  estimateLive(activeWorkout, elapsedSec, user, exerciseResolver) {
    return this.getWorkoutCalories(
      { ...activeWorkout, duration: elapsedSec, heartRateData: null },
      user,
      exerciseResolver
    );
  },

  // Sum of calories for a set of workouts (uses stored estimate, HR or re-estimate)
  getTotalCalories(workouts, user) {
    return (workouts || []).reduce((sum, w) => {
      if (w.calories?.kcal > 0) return sum + w.calories.kcal;
      return sum + this.getWorkoutCalories(w, user).kcal;
    }, 0);
  },
};
