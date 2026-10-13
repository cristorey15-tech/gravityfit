// ============================================
// GravityFit — Progress Analytics Module
// Pure, testable helpers for the Progress tab:
//   - e1RM (Epley) progression per exercise
//   - Weekly volume per muscle group over time
//
// All functions take the workout list + an injectable exercise resolver so
// they can be unit-tested without touching IndexedDB/DOM.
// ============================================

export const Progress = {
  // Epley formula: 1RM = weight × (1 + reps / 30)
  epley(weight, reps) {
    if (!(weight > 0) || !(reps > 0)) return 0;
    return weight * (1 + reps / 30);
  },

  // Best e1RM from a single exercise entry (max over its completed sets)
  exerciseSessionE1RM(ex) {
    if (!ex || !ex.sets) return 0;
    let best = 0;
    ex.sets.forEach(s => {
      if (!s.completed) return;
      const e = this.epley(s.weight, s.reps);
      if (e > best) best = e;
    });
    return best;
  },

  // e1RM progression for one exercise across sessions (chronological).
  // Returns [{ date, e1rm, weight, reps, label }] sorted oldest→newest,
  // only sessions with a completed weighted set.
  getE1RMHistory(workouts, exerciseId) {
    const out = [];
    [...(workouts || [])]
      .filter(w => w && w.finishedAt)
      .sort((a, b) => new Date(a.finishedAt) - new Date(b.finishedAt))
      .forEach(w => {
        const ex = (w.exercises || []).find(e => e.exerciseId === exerciseId);
        if (!ex) return;
        const e1rm = this.exerciseSessionE1RM(ex);
        if (e1rm <= 0) return;
        // Heaviest completed set of the session for context
        let bw = 0, br = 0;
        (ex.sets || []).forEach(s => {
          if (!s.completed) return;
          const e = this.epley(s.weight, s.reps);
          if (e === e1rm && s.weight > bw) { bw = s.weight; br = s.reps; }
        });
        const d = new Date(w.finishedAt);
        out.push({
          date: w.finishedAt,
          e1rm: Math.round(e1rm * 10) / 10,
          weight: bw,
          reps: br,
          label: `${d.getDate()}/${d.getMonth() + 1}`,
        });
      });
    return out;
  },

  // Which exercises have the most e1RM data points (for chart selection).
  // Returns [{ exerciseId, sessions, latestE1RM, deltaPct }], most-trained first.
  getTopStrengthExercises(workouts, exerciseResolver, limit = 3) {
    const counts = {};
    (workouts || []).forEach(w => {
      (w?.exercises || []).forEach(ex => {
        if (this.exerciseSessionE1RM(ex) > 0) {
          counts[ex.exerciseId] = (counts[ex.exerciseId] || 0) + 1;
        }
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id, sessions]) => {
        const hist = this.getE1RMHistory(workouts, id);
        const first = hist[0]?.e1rm || 0;
        const last = hist[hist.length - 1]?.e1rm || 0;
        const deltaPct = first > 0 ? ((last - first) / first) * 100 : 0;
        const data = exerciseResolver ? exerciseResolver(id) : null;
        return {
          exerciseId: id,
          name: data ? data.name : id,
          sessions,
          latestE1RM: last,
          deltaPct,
          history: hist,
        };
      });
  },

  // Monday (local) of the week containing d — consistent with the rest of
  // the app (no toISOString/UTC rollover).
  _weekKey(d) {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.getFullYear(), d.getMonth(), diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  },

  // Weekly volume per muscle group over the last `weeks` weeks.
  // Returns { labels: ['S1'…], series: [{ muscle, icon, total, values:[] }] }
  // sorted by total volume desc. Only strength volume counts (weight×reps).
  getMuscleVolumeByWeek(workouts, exerciseResolver, weeks = 8) {
    const now = new Date();
    const currentMonday = this._weekKey(now);
    const mondayOf = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const d = new Date(currentMonday);
      d.setDate(d.getDate() - i * 7);
      mondayOf.push(d);
    }
    const labels = mondayOf.map((_, i) => `S${i + 1}`);

    // muscle → array of per-week volume (index-aligned with mondayOf)
    const byMuscle = {};
    const weekIndexFor = (d) => {
      const mk = this._weekKey(d).getTime();
      return mondayOf.findIndex(m => m.getTime() === mk);
    };

    (workouts || []).forEach(w => {
      if (!w?.finishedAt) return;
      const wi = weekIndexFor(new Date(w.finishedAt));
      if (wi === -1) return; // outside window
      (w.exercises || []).forEach(ex => {
        const data = exerciseResolver ? exerciseResolver(ex.exerciseId) : null;
        const muscle = data?.primaryMuscle;
        if (!muscle) return;
        if (!byMuscle[muscle]) byMuscle[muscle] = { icon: data.icon || '💪', values: new Array(weeks).fill(0) };
        (ex.sets || []).forEach(s => {
          if (!s.completed) return;
          byMuscle[muscle].values[wi] += (s.weight || 0) * (s.reps || 0);
        });
      });
    });

    const series = Object.entries(byMuscle)
      .map(([muscle, m]) => ({
        muscle,
        icon: m.icon,
        total: m.values.reduce((s, v) => s + v, 0),
        values: m.values,
      }))
      .filter(s => s.total > 0)
      .sort((a, b) => b.total - a.total);

    return { labels, series };
  },
};
