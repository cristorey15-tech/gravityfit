// ============================================
// GravityFit — AI Coach & Smart Logic
// ============================================

import { Storage } from './storage.js';
import { HealthLog } from './health.js';
import { Modal, Toast, escapeHtml } from './components.js';
import { App } from './app.js';

export const AICoach = {
  // =============================================
  // RPE thresholds — single source of truth so weight suggestion,
  // proactive insights and in-workout tips all agree on the bands.
  // =============================================
  RPE_THRESHOLDS: {
    target: 8,        // zona objetivo de autoregulación (lo que buscamos)
    critical: 9.5,    // ≥9.5: casi al fallo siempre → bajar intensidad
    overreach: 9,     // ≥9 + otra señal (peso a la baja / RPE ya alto) → sobreesfuerzo
    margin: 7,        // 7–8 = margen pequeño; <7 = margen amplio
    rising: 1,        // subida de RPE ≥1 punto vs. sesiones anteriores → vigilar
  },

  // 1. Calcula la fatiga muscular basada en los últimos 3 días (72h)
  getMuscleFatigue() {
    const workouts = Storage.getWorkouts();
    const fatigue = {};
    const now = Date.now();
    const window72h = 72 * 60 * 60 * 1000;

    workouts.forEach(w => {
      const wDate = new Date(w.finishedAt).getTime();
      if (now - wDate <= window72h) {
        // Factor de decaimiento: más reciente = más fatiga
        const hoursAgo = (now - wDate) / (1000 * 60 * 60);
        const fatigueFactor = Math.max(0, 1 - (hoursAgo / 72)); // 1.0 (ahora) a 0.0 (hace 72h)

        (w.exercises || []).forEach(ex => {
          const exData = Storage.getExercise(ex.exerciseId);
          if (exData && exData.primaryMuscle) {
            const volume = (ex.sets || []).reduce((sum, s) => sum + ((s.weight || 0) * (s.reps || 0)), 0);
            const impact = (volume / 1000) * fatigueFactor;
            
            // Primary muscle gets full impact
            fatigue[exData.primaryMuscle] = (fatigue[exData.primaryMuscle] || 0) + impact;
            
            // Secondary muscles get 40% impact (they assist but don't bear full load)
            if (exData.secondaryMuscles && exData.secondaryMuscles.length) {
              exData.secondaryMuscles.forEach(sm => {
                fatigue[sm] = (fatigue[sm] || 0) + impact * 0.4;
              });
            }
          }
        });
      }
    });

    // Normalizar de 0 a 100%
    const maxImpact = Math.max(1, ...Object.values(fatigue));
    for (const m in fatigue) {
      fatigue[m] = Math.min(100, Math.round((fatigue[m] / maxImpact) * 100));
    }
    
    return fatigue;
  },

  // 1b. Detalle de ejercicios que causaron fatiga en un músculo específico
  getMuscleExercises(muscleName) {
    const workouts = Storage.getWorkouts();
    const now = Date.now();
    const window72h = 72 * 60 * 60 * 1000;
    const contributors = [];

    workouts.forEach(w => {
      const wDate = new Date(w.finishedAt).getTime();
      if (now - wDate > window72h) return;

      const hoursAgo = (now - wDate) / (1000 * 60 * 60);
      const fatigueFactor = Math.max(0, 1 - (hoursAgo / 72));

      (w.exercises || []).forEach(ex => {
        const exData = Storage.getExercise(ex.exerciseId);
        if (!exData) return;

        const volume = (ex.sets || []).reduce((sum, s) => sum + ((s.weight || 0) * (s.reps || 0)), 0);
        const impact = (volume / 1000) * fatigueFactor;

        if (exData.primaryMuscle === muscleName) {
          const completedSets = (ex.sets || []).filter(s => s.completed).length;
          contributors.push({
            name: exData.name,
            workoutName: w.name || 'Entrenamiento',
            date: w.finishedAt,
            volume,
            impact,
            impactPct: 100,
            sets: completedSets,
            totalSets: (ex.sets || []).length,
            role: 'primary'
          });
        }

        if (exData.secondaryMuscles && exData.secondaryMuscles.includes(muscleName)) {
          const completedSets = (ex.sets || []).filter(s => s.completed).length;
          contributors.push({
            name: exData.name,
            workoutName: w.name || 'Entrenamiento',
            date: w.finishedAt,
            volume,
            impact: impact * 0.4,
            impactPct: 40,
            sets: completedSets,
            totalSets: (ex.sets || []).length,
            role: 'secondary'
          });
        }
      });
    });

    // Sort by impact descending
    contributors.sort((a, b) => b.impact - a.impact);
    return contributors;
  },

  // 2. Estima el 1RM usando la fórmula de Epley: Peso * (1 + Reps / 30)
  estimate1RM(exerciseId) {
    const history = Storage.getExerciseHistory(exerciseId, 10); // Últimos 10 entrenos
    let best1RM = 0;

    history.forEach(h => {
      h.sets.forEach(s => {
        if (s.weight && s.reps) {
          // Epley; a clean single is the max itself (formula overestimates at 1 rep)
          const epley1RM = s.reps === 1 ? s.weight : s.weight * (1 + s.reps / 30);
          if (epley1RM > best1RM) best1RM = epley1RM;
        }
      });
    });

    return best1RM;
  },

  // 3. Genera un entrenamiento dinámico para el día
  generateDailyRecommendation() {
    const fatigue = this.getMuscleFatigue();
    let targetMuscles = [];
    let routineName = "Entrenamiento AI Dinámico";
    
    // P1-5: Check if deload week is needed
    if (this.shouldDeload()) {
      routineName = '🧠 AI Coach: Semana de Deload';
      return this.generateDeloadWorkout();
    }

    // a. Prioridad: el plan semanal manual del usuario para hoy
    if (typeof Storage.getWeekPlanDay === 'function') {
      const planId = Storage.getWeekPlanDay(Storage.todayDayKey());
      if (planId && planId !== 'rest') {
        const planned = typeof Storage.getRoutine === 'function' ? Storage.getRoutine(planId) : null;
        if (planned && planned.exercises && planned.exercises.length) {
          routineName = `📅 Plan semanal: ${planned.name}`;
          return this._buildWorkoutFromTemplate(routineName, planned.exercises);
        }
      }
    }

    // b. Verificar si hay un programa activo que dicte qué toca hoy
    const program = Storage.getActiveProgram();
    const nextWorkout = program ? Storage.getNextProgramWorkout(program) : null;

    if (nextWorkout && nextWorkout.isToday && nextWorkout.routine && nextWorkout.routine.id !== 'rest') {
      // Tomamos la rutina del programa y le aplicamos inteligencia de pesos
      routineName = `AI Coach: ${nextWorkout.routine.name}`;
      return this._buildWorkoutFromTemplate(routineName, nextWorkout.routine.exercises);
    }

    // c. Si no hay programa, armar uno basado en músculos MENOS fatigados
    const allMuscles = ['Pecho', 'Espalda', 'Hombros', 'Cuádriceps', 'Femorales', 'Tríceps', 'Bíceps', 'Glúteos'];
    const restedMuscles = allMuscles
      .map(m => ({ muscle: m, fatigue: fatigue[m] || 0 }))
      .sort((a, b) => a.fatigue - b.fatigue);

    // Tomar los 2 o 3 más descansados
    targetMuscles = restedMuscles.slice(0, 3).map(m => m.muscle);
    routineName = `AI Coach: ${targetMuscles.join(' + ')}`;

    // Buscar ejercicios para estos músculos
    const allExercises = Storage.getAllExercises();
    const selectedExercises = [];

    targetMuscles.forEach(m => {
      const mExercises = allExercises.filter(e => e.primaryMuscle === m);
      // Elegir 2 ejercicios por músculo de forma pseudo-aleatoria
      for(let i=0; i<2; i++) {
        if(mExercises.length > 0) {
          const idx = Math.floor(Math.random() * mExercises.length);
          selectedExercises.push({ exerciseId: mExercises[idx].id });
          mExercises.splice(idx, 1);
        }
      }
    });

    return this._buildWorkoutFromTemplate(routineName, selectedExercises);
  },

  _buildWorkoutFromTemplate(name, templateExercises) {
    const user = Storage.getUser();
    const TARGET_RPE = this.RPE_THRESHOLDS.target;
    const generatedExercises = templateExercises.map(ex => {
      const e1RM = this.estimate1RM(ex.exerciseId);
      // RPE autoregulation: when the user logs RPE, base the working weight on
      // what they actually hit at the target RPE, not a blind % of 1RM.
      const rpeWeight = this.getSuggestedWeightFromRPE(ex.exerciseId, TARGET_RPE);
      const sets = [];

      if (rpeWeight) {
        const working = this._roundToPlates(rpeWeight);
        sets.push({ weight: this._roundToPlates(working * 0.7), reps: 10, type: 'warmup', completed: false });
        sets.push({ weight: working, reps: 8, type: 'normal', completed: false });
        sets.push({ weight: working, reps: 8, type: 'normal', completed: false });
        sets.push({ weight: working, reps: 8, type: 'normal', completed: false });
      } else if (e1RM > 0) {
        // Fallback: inteligencia de programación por % de 1RM
        sets.push({ weight: this._roundToPlates(e1RM * 0.5), reps: 10, type: 'warmup', completed: false });
        sets.push({ weight: this._roundToPlates(e1RM * 0.7), reps: 8, type: 'normal', completed: false });
        sets.push({ weight: this._roundToPlates(e1RM * 0.8), reps: 6, type: 'normal', completed: false });
        sets.push({ weight: this._roundToPlates(e1RM * 0.8), reps: 6, type: 'normal', completed: false });
      } else {
        // Si no hay datos, sugerir 3 series genéricas
        sets.push({ weight: null, reps: 10, type: 'normal', completed: false });
        sets.push({ weight: null, reps: 10, type: 'normal', completed: false });
        sets.push({ weight: null, reps: 10, type: 'normal', completed: false });
      }

      return {
        exerciseId: ex.exerciseId,
        unit: user.units,
        timeMode: false,
        sets: sets
      };
    });

    return {
      name: name,
      exercises: generatedExercises
    };
  },

  _roundToPlates(weight) {
    // Redondear al múltiplo de 2.5 más cercano (ej. 12.5, 15, 17.5) asumiendo discos estándar
    return Math.round(weight / 2.5) * 2.5;
  },

  // =============================================
  // P1-5: Auto Deload Week Detection
  // =============================================
  shouldDeload() {
    const user = Storage.getUser();
    if (!user.deloadConfig) user.deloadConfig = { lastDeloadWeek: 0, weeksSinceDeload: 0 };
    const workouts = Storage.getWorkouts();
    if (workouts.length < 10) return false; // Need enough data
    // Count weeks since last deload
    const weeksSinceDeload = user.deloadConfig.weeksSinceDeload || 0;
    // Deload every 3-4 weeks if volume has been consistently high
    if (weeksSinceDeload < 3) return false;
    // Check if average volume last 2 weeks > threshold
    const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const recentWorkouts = workouts.filter(w => new Date(w.finishedAt) >= twoWeeksAgo);
    if (recentWorkouts.length < 4) return false;
    const avgVol = recentWorkouts.reduce((s, w) => s + Storage.getTotalVolume(w), 0) / recentWorkouts.length;
    // Compare to overall average
    const allAvg = workouts.reduce((s, w) => s + Storage.getTotalVolume(w), 0) / workouts.length;
    return avgVol > allAvg * 0.9; // Volume has been at least 90% of overall average
  },

  generateDeloadWorkout() {
    const user = Storage.getUser();
    const fatigue = this.getMuscleFatigue();
    // Pick the most fatigued muscle for light work
    const sorted = Object.entries(fatigue).sort((a, b) => b[1] - a[1]);
    const targetMuscle = sorted.length > 0 ? sorted[0][0] : 'Pecho';
    const allExercises = Storage.getAllExercises();
    const muscleExercises = allExercises.filter(e => e.primaryMuscle === targetMuscle);
    const selected = muscleExercises.slice(0, 2);
    const exercises = selected.map(ex => {
      const e1RM = this.estimate1RM(ex.id);
      const baseWeight = e1RM > 0 ? this._roundToPlates(e1RM * 0.5) : null;
      return {
        exerciseId: ex.id,
        unit: user.units,
        timeMode: false,
        sets: [
          { weight: baseWeight, reps: 12, type: 'normal', completed: false },
          { weight: baseWeight, reps: 12, type: 'normal', completed: false },
          { weight: baseWeight, reps: 15, type: 'normal', completed: false },
        ]
      };
    });
    // Reset deload counter
    user.deloadConfig = user.deloadConfig || {};
    user.deloadConfig.lastDeloadWeek = user.deloadConfig.weeksSinceDeload || 0;
    user.deloadConfig.weeksSinceDeload = 0;
    Storage.saveUser(user);
    return { name: `🧠 Deload: ${targetMuscle} Ligero`, exercises };
  },

  incrementWeeksSinceDeload() {
    const user = Storage.getUser();
    if (!user.deloadConfig) user.deloadConfig = {};
    user.deloadConfig.weeksSinceDeload = (user.deloadConfig.weeksSinceDeload || 0) + 1;
    Storage.saveUser(user);
  },

  // =============================================
  // P3-14: Pattern Learning + RPE Auto-Adjust
  // =============================================
  getExercisePerformanceTrend(exerciseId) {
    const history = Storage.getExerciseHistory(exerciseId, 6);
    if (history.length < 2) return null;
    const volumes = history.map(h => h.totalVol);
    const weights = history.map(h => h.maxWeight);
    const recentVol = volumes.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
    const olderVol = volumes.slice(2).reduce((a, b) => a + b, 0) / Math.max(1, volumes.slice(2).length);
    const trend = recentVol > olderVol * 1.05 ? 'improving' : recentVol < olderVol * 0.95 ? 'declining' : 'stable';
    return { trend, recentVol, olderVol, recentWeight: weights[0] || 0 };
  },

  getSuggestedWeightFromRPE(exerciseId, targetRPE) {
    const history = Storage.getExerciseHistory(exerciseId, 10);
    const candidates = [];
    for (let i = 0; i < history.length; i++) {
      for (const s of history[i].sets) {
        const rpe = Number(s.rpe);
        if (rpe > 0 && s.weight) {
          candidates.push({ weight: s.weight, rpe, recency: i });
        }
      }
    }
    if (candidates.length === 0) return null;
    // Prefer sets near the target RPE; break ties toward heavier and more recent.
    candidates.sort((a, b) => {
      const da = Math.abs(a.rpe - targetRPE);
      const db = Math.abs(b.rpe - targetRPE);
      if (da !== db) return da - db;
      if (b.weight !== a.weight) return b.weight - a.weight;
      return a.recency - b.recency;
    });
    return candidates[0].weight;
  },

  // RPE summary for an exercise from recent sessions that logged RPE.
  // history[0] is the most recent session.
  getRPEStats(exerciseId) {
    const history = Storage.getExerciseHistory(exerciseId, 6);
    const sessions = [];
    for (const h of history) {
      const rpes = (h.sets || []).map(s => Number(s.rpe)).filter(r => r > 0);
      if (rpes.length) {
        sessions.push({
          date: h.date,
          avgRPE: rpes.reduce((a, b) => a + b, 0) / rpes.length,
          maxWeight: h.maxWeight || 0,
        });
      }
    }
    if (sessions.length === 0) return null;

    // Most recent session is the current signal; compare against everything older.
    const recentRPE = sessions[0].avgRPE;
    const older = sessions.slice(1);
    const olderRPE = older.length
      ? older.reduce((s, x) => s + x.avgRPE, 0) / older.length
      : recentRPE;

    const recentW = sessions[0].maxWeight;
    const olderW = older.length ? Math.max(...older.map(x => x.maxWeight)) : recentW;
    const weightTrend = recentW > olderW * 1.02 ? 'improving'
      : recentW < olderW * 0.98 ? 'declining' : 'stable';

    return { count: sessions.length, recentRPE, olderRPE, weightTrend, lastWeight: recentW };
  },

  // Classify a getRPEStats() result into one coaching state (fine-grained bands).
  _classifyRPE(stats) {
    if (!stats || !stats.count) return null;
    const T = this.RPE_THRESHOLDS;
    const r = stats.recentRPE;
    const older = stats.olderRPE;
    const rising = older != null && r - older >= T.rising;
    const declining = stats.weightTrend === 'declining';

    if (r >= T.critical) return 'critical';                                  // ≥9.5
    if (r >= T.overreach && (declining || older >= 8.5)) return 'overreach'; // ≥9 + señal
    if (r >= T.overreach) return 'high';                                     // 9–9.4 sin otras señales
    if (stats.count >= 3 && stats.weightTrend === 'stable' && r >= T.target + 0.5) return 'stalled';
    if (rising && r >= T.target + 0.5) return 'rising';                      // el esfuerzo se dispara
    if (r < T.margin && declining) return 'lossStrength';                    // fuerza a la baja con poco esfuerzo
    if (r >= T.target) return 'onTarget';                                    // 8–8.9 en el blanco
    if (r >= T.margin) return 'margin';                                      // 7–7.9
    return 'under';                                                          // <7
  },

  // Turn RPE stats into a coach insight (or null when there's nothing to say).
  _rpeInsight(name, stats) {
    const state = this._classifyRPE(stats);
    if (!state) return null;
    const r = stats.recentRPE.toFixed(1);
    const older = stats.olderRPE != null ? stats.olderRPE.toFixed(1) : null;

    switch (state) {
      case 'critical':
        return { kind: state, icon: '🚨', severity: 'alert', title: `Al fallo en ${name}`,
          detail: `RPE medio ${r} — muy cerca del fallo. Baja la carga ~5–10% o deja 2 reps en reserva.` };
      case 'overreach':
        return { kind: state, icon: '⚠️', severity: 'warn', title: `Sobreesfuerzo en ${name}`,
          detail: `RPE medio ${r}${stats.weightTrend === 'declining' ? ' y tu peso máximo baja' : ''}. Baja la carga ~5–10% esta semana.` };
      case 'high':
        return { kind: state, icon: '🔥', severity: 'warn', title: `Esfuerzo alto en ${name}`,
          detail: `RPE medio ${r}, por encima de tu objetivo (8). Deja 1–2 reps en reserva para recuperar mejor.` };
      case 'rising':
        return { kind: state, icon: '📈', severity: 'warn', title: `El esfuerzo sube en ${name}`,
          detail: `Tu RPE pasa de ${older} a ${r}. Si sigue subiendo con el mismo peso, toca bajar carga.` };
      case 'stalled':
        return { kind: state, icon: '🚧', severity: 'warn', title: `Estancado en ${name}`,
          detail: `RPE ${r} pero tu peso máximo lleva 3+ sesiones igual. Cambia series/reps o añade 2.5 kg.` };
      case 'lossStrength':
        return { kind: state, icon: '📉', severity: 'warn', title: `Fuerza a la baja en ${name}`,
          detail: `Tu peso máximo baja con solo RPE ${r}. Revisa técnica, estrés y descanso antes que la carga.` };
      case 'onTarget':
        return { kind: state, icon: '🎯', severity: 'good', title: `En el blanco en ${name}`,
          detail: `RPE medio ${r} — justo en tu zona objetivo (8). Así se progresa, sigue así.` };
      case 'margin':
        return { kind: state, icon: '📈', severity: 'good', title: `Margen en ${name}`,
          detail: `RPE medio ${r} — un punto por debajo del objetivo: sube 2.5 kg o +1 repetición.` };
      case 'under':
        return { kind: state, icon: '💪', severity: 'good', title: `Margen amplio en ${name}`,
          detail: `RPE medio ${r} — puedes subir la carga ~5% o hacer una serie más.` };
      default:
        return null;
    }
  },

  // Live feedback right after the user taps an RPE button mid-workout.
  getRPEFeedback(rpe) {
    const T = this.RPE_THRESHOLDS;
    const v = Number(rpe);
    if (v >= T.critical) return { tone: 'warning', message: '🚨 Casi al fallo. En la próxima serie baja ~5% o deja 2 reps en reserva.' };
    if (v >= T.overreach) return { tone: 'warning', message: '⚠️ Muy exigente. Deja 1–2 reps en reserva en la siguiente serie.' };
    if (v >= T.target) return { tone: 'success', message: '🎯 En el blanco — tu zona objetivo. Mantén la carga.' };
    if (v >= T.margin) return { tone: 'info', message: '📈 Un punto por debajo: la próxima serie puedes subir 2.5 kg o +1 reps.' };
    return { tone: 'info', message: '💪 Holgado: sube la carga ~5% o añade una serie.' };
  },

  // Educational modal: what RPE is and why the app uses it.
  showRPEGuide() {
    const scale = [
      [6, 'Podrías hacer 4+ repeticiones más', 'Muy por debajo de tu máximo'],
      [7, 'Quedarían ~3 repeticiones', 'Progresar con técnica limpia'],
      [8, 'Quedarían ~2 repeticiones', 'Zona objetivo — hipertrofia y fuerza'],
      [9, 'Quedaría 1 sola repetición', 'Cerca del fallo, recuperación costosa'],
      [10, 'Fallo muscular total', 'Solo puntual: nunca entrenes siempre así'],
    ];
    const rows = scale.map(([v, meaning, use]) => `
      <div style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--color-border)">
        <span style="min-width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.875rem;background:${v >= 9 ? 'rgba(239,68,68,0.15)' : v === 8 ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.08)'};color:${v >= 9 ? 'var(--color-danger)' : 'var(--color-success)'}">${v}</span>
        <div>
          <div style="font-size:0.8125rem;font-weight:600">${meaning}</div>
          <div style="font-size:0.75rem;color:var(--color-text-secondary)">${use}</div>
        </div>
      </div>`).join('');

    Modal.show(`
      <div style="text-align:center;margin-bottom:12px">
        <div style="font-size:3rem;margin-bottom:8px">📏</div>
        <p style="font-size:0.875rem;color:var(--color-text-secondary);line-height:1.5">
          <strong>RPE</strong> = <em>Rate of Perceived Exertion</em> (esfuerzo percibido): qué duro se sintió <em>para ti</em> esa serie, del 1 al 10. No es una carga externa como el peso — es tu esfuerzo real.
        </p>
      </div>
      <div style="font-size:0.75rem;font-weight:700;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Escala</div>
      ${rows}
      <div style="font-size:0.75rem;font-weight:700;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin:14px 0 6px">Por qué importa</div>
      <ul style="font-size:0.8125rem;line-height:1.6;padding-left:18px;color:var(--color-text-secondary)">
        <li><strong>Autoregulación:</strong> el mismo peso se siente distinto según duermes, comes o estás estresado. El RPE ajusta la carga a tu día real.</li>
        <li><strong>Protección:</strong> entrenar siempre a RPE 9–10 acumula fatiga y lesión. La zona objetivo es RPE 8.</li>
        <li><strong>Detecta estancamiento:</strong> si el peso no sube pero el RPE sube, hay un problema que arreglar.</li>
      </ul>
      <div style="font-size:0.75rem;font-weight:700;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin:14px 0 6px">Cómo lo uso yo</div>
      <ul style="font-size:0.8125rem;line-height:1.6;padding-left:18px;color:var(--color-text-secondary)">
        <li>Marco el <strong>RPE 8</strong> tras cada serie (botón automático al completarla).</li>
        <li>Sus pesos sugeridos salen de lo que <em>realmente lograste</em> a ese RPE, no de un % a ciegas.</li>
        <li>Te aviso en el home si vas al fallo, con margen o estancado.</li>
      </ul>
      <button class="btn btn-primary btn-block" style="margin-top:16px" onclick="Modal.hide()">¡Entendido!</button>
    `, { title: '¿Qué es el RPE?' });
  },

  // Contextual tips shown live at the top of the active workout screen.
  getWorkoutTips(workout) {
    if (!workout || !workout.exercises || !workout.exercises.length) return [];
    const tips = [];
    const fatigue = this.getMuscleFatigue();
    const seenMuscles = {};

    for (const ex of workout.exercises) {
      if (tips.length >= 2) break;
      const exData = Storage.getExercise(ex.exerciseId);
      if (!exData) continue;

      // 1) Per-exercise RPE signal from the last sessions
      const stats = this.getRPEStats(ex.exerciseId);
      const state = this._classifyRPE(stats);
      if (state === 'critical' || state === 'overreach' || state === 'high' || state === 'lossStrength') {
        tips.push({ icon: '⚠️', text: `${exData.name}: la última vez quedaste en RPE ${stats.recentRPE.toFixed(1)}. Hoy deja 1–2 reps en reserva o baja ~5% la carga.` });
      } else if (state === 'under' || state === 'margin') {
        tips.push({ icon: '📈', text: `${exData.name}: quedaste en RPE ${stats.recentRPE.toFixed(1)} — hoy puedes subir 2.5 kg o +1 repetición.` });
      } else if (state === 'stalled') {
        tips.push({ icon: '🚧', text: `${exData.name}: 3+ sesiones con el mismo peso. Cambia series/reps o añade 2.5 kg para romper el estancamiento.` });
      }

      // 2) Fatigue of the muscles being trained today
      const muscle = exData.primaryMuscle;
      if (muscle && !seenMuscles[muscle]) {
        seenMuscles[muscle] = true;
        const f = fatigue[muscle] || 0;
        if (f >= 70 && tips.length < 2) {
          tips.push({ icon: '🛌', text: `${muscle} está al ${f}% de fatiga (72h): calienta bien y controla la técnica.` });
        }
      }
    }

    // 3) Weekly goal still pending
    if (tips.length < 3 && typeof Storage.getWorkoutsThisWeek === 'function') {
      const goal = Storage.getUser().weeklyGoal || 4;
      const done = Storage.getWorkoutsThisWeek().length;
      if (done < goal) {
        tips.push({ icon: '🎯', text: `Meta semanal ${done}/${goal}: te faltan ${goal - done} para cumplirla.` });
      }
    }

    return tips.slice(0, 3);
  },

  // =============================================
  // Proactive Coach — insights surfaced without the user asking
  // =============================================
  getCoachInsights() {
    const insights = [];
    const user = Storage.getUser();

    // 1) RPE-based: classified bands (sobreesfuerzo / al fallo / estancado / en el blanco / margen)
    const recentWorkouts = Storage.getWorkouts().slice(0, 12);
    const exIds = [];
    recentWorkouts.forEach(w => (w.exercises || []).forEach(e => {
      if (e.exerciseId && !exIds.includes(e.exerciseId)) exIds.push(e.exerciseId);
    }));
    let rpeInsights = 0;
    for (const exId of exIds) {
      if (rpeInsights >= 2) break;
      const stats = this.getRPEStats(exId);
      if (!stats || stats.count < 2) continue;
      const exData = Storage.getExercise(exId);
      const ins = this._rpeInsight(exData ? exData.name : 'un ejercicio', stats);
      if (ins) {
        insights.push(ins);
        rpeInsights++;
      }
    }

    // 2) Fatigue-based
    const fatigue = this.getMuscleFatigue();
    const tired = Object.entries(fatigue).sort((a, b) => b[1] - a[1])[0];
    if (tired && tired[1] >= 70) {
      insights.push({
        icon: '🛌', severity: 'warn', title: `${tired[0]} muy fatigado`,
        detail: `${tired[1]}% de fatiga (últimas 72h). Hoy prioriza otro grupo o descansa ese músculo.`,
      });
    }

    // 3) Deload
    if (this.shouldDeload()) {
      insights.push({
        icon: '🧊', severity: 'alert', title: 'Hora de un deload',
        detail: 'Varias semanas de volumen alto. Reduce carga/volumen ~40% esta semana para recuperar.',
      });
    }

    // 4) Consistency / weekly goal
    const weekWorkouts = (typeof Storage.getWorkoutsThisWeek === 'function') ? Storage.getWorkoutsThisWeek() : [];
    const goal = user.weeklyGoal || 4;
    const done = weekWorkouts.length;
    if (done === 0) {
      const last = Storage.getWorkouts()[0];
      if (last && last.finishedAt) {
        const days = Math.floor((Date.now() - new Date(last.finishedAt)) / 86400000);
        if (days >= 3) {
          insights.push({
            icon: '⏰', severity: 'alert', title: `${days} días sin entrenar`,
            detail: 'El músculo se mantiene, pero el hábito se enfría. Hoy toca moverse.',
          });
        }
      }
    } else if (done < goal) {
      const missing = goal - done;
      insights.push({
        icon: '🎯', severity: 'info', title: `Meta semanal ${done}/${goal}`,
        detail: `Te falta${missing > 1 ? 'n' : ''} ${missing} entreno${missing > 1 ? 's' : ''} para tu meta.`,
      });
    } else {
      insights.push({
        icon: '🏆', severity: 'good', title: `Meta semanal cumplida ${done}/${goal}`,
        detail: 'Objetivo de la semana cerrado. Mantén el ritmo o toca descansar.',
      });
    }

    // 5) Weekly volume vs. previous week (drop is a silent progress killer)
    if (typeof Storage.getWeekComparison === 'function') {
      try {
        const cmp = Storage.getWeekComparison();
        if (cmp.lastVol > 0 && cmp.thisVol > 0 && cmp.thisVol < cmp.lastVol * 0.6) {
          const pct = Math.round((cmp.thisVol / cmp.lastVol) * 100);
          insights.push({
            icon: '🪫', severity: 'warn', title: 'Volumen a la baja',
            detail: `Llevas el ${pct}% del volumen de la semana anterior. Si es un deload, bien; si no, no dejes caer el volumen.`,
          });
        }
      } catch { /* sin datos de comparación */ }
    }

    // 6) RPE nudge — the whole system needs logged RPE to work
    if (!rpeInsights && recentWorkouts.length >= 3) {
      const anyRPE = recentWorkouts.some(w => (w.exercises || []).some(e =>
        (e.sets || []).some(s => Number(s.rpe) > 0)));
      if (!anyRPE) {
        insights.push({
          icon: '📏', severity: 'info', title: 'Marca el RPE tras cada serie',
          detail: 'Aún no registras esfuerzo: mis pesos y consejos saldrían de un % a ciegas. Pulsa "?" para saber cómo se usa.',
        });
      }
    }

    // 6b) Recovery signals from health data (sleep + resting HR)
    try {
      const hKey = (typeof Storage.todayKey === 'function') ? Storage.todayKey() : null;
      const h = hKey ? HealthLog.getDay(hKey) : null;
      if (h && h.sleep > 0 && h.sleep < 6) {
        insights.push({
          icon: '😴', severity: 'warn', title: 'Dormiste poco',
          detail: `${h.sleep} h de sueño. Hoy controla la técnica y no fuerces series al fallo: dormir mal multiplica la fatiga.`,
        });
      } else if (h && h.sleep >= 8) {
        insights.push({
          icon: '😴', severity: 'good', title: 'Sueño de sobra',
          detail: `${h.sleep} h descansando — mejor momento para atacar cargas altas.`,
        });
      }
      const baseline = HealthLog.rhrBaseline();
      if (h && h.rhr > 0 && baseline && h.rhr >= baseline + 5) {
        insights.push({
          icon: '💓', severity: 'warn', title: 'FC en reposo elevada',
          detail: `${h.rhr} lpm frente a tu media de ${baseline}. Señal de fatiga o estrés: si puedes, baja la intensidad hoy.`,
        });
      }
    } catch { /* health es best-effort */ }

    // 7) Nutrition — protein is what muscle repair actually needs
    try {
      const key = (typeof Storage.todayKey === 'function') ? Storage.todayKey() : null;
      const nd = key ? Storage.getNutritionDay(key) : null;
      const goals = Storage.getNutritionGoals();
      if (nd && (nd.kcal || nd.protein)) {
        if (goals.protein > 0 && nd.protein >= goals.protein * 0.9) {
          insights.push({
            icon: '🥩', severity: 'good', title: 'Proteína completada',
            detail: `${nd.protein} g de ${goals.protein} g — lo necesario para reparar y crecer.`,
          });
        } else if (goals.protein > 0 && nd.protein > 0 && nd.protein < goals.protein * 0.5) {
          insights.push({
            icon: '🥗', severity: 'info', title: 'Poca proteína hoy',
            detail: `Llevas ${nd.protein} g de ${goals.protein} g. Para tu volumen, apunta a acercarte antes de dormir.`,
          });
        }
      }
    } catch { /* nutrition es best-effort */ }

    const order = { alert: 0, warn: 1, good: 2, info: 3 };
    insights.sort((a, b) => (order[a.severity] ?? 4) - (order[b.severity] ?? 4));
    return insights;
  },

  // =============================================
  // 2. Test de 1RM guiado (estimación con Epley)
  // =============================================
  show1RMTestIntro() {
    Modal.show(`
      <div style="text-align:center;margin-bottom:12px">
        <div style="font-size:3rem;margin-bottom:8px">🧪</div>
        <p style="font-size:0.875rem;color:var(--color-text-secondary);line-height:1.6;text-align:left">
          El <strong>1RM</strong> (one-repetition max) es el <strong>mayor peso que puedes levantar una sola vez</strong> con buena técnica. No hace falta que lo levantes: lo <em>estimamos</em> con series crecientes y la fórmula de <strong>Epley</strong> (peso × (1 + reps/30)).
        </p>
      </div>
      <div style="font-size:0.75rem;font-weight:700;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">¿Para qué sirve?</div>
      <ul style="font-size:0.8125rem;line-height:1.6;padding-left:18px;color:var(--color-text-secondary)">
        <li><strong>Medir tu fuerza real</strong>: es el número que sube (o no) cuando todo lo demás se mantiene igual.</li>
        <li><strong>Calibrar este coach</strong>: todos los pesos que sugiero salen de tus % de 1RM — cuanto más preciso, mejor el consejo.</li>
        <li><strong>Ver progreso honesto</strong>: comparar tu 1RM de hoy con el de hace 8 semanas dice más que la báscula.</li>
        <li><strong>Programar con %</strong>: sabrás qué pesa el 80% o el 90% de tu máximo sin calculos.</li>
      </ul>
      <div style="font-size:0.75rem;font-weight:700;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin:12px 0 6px">Cómo funciona el test</div>
      <ol style="font-size:0.8125rem;line-height:1.6;padding-left:18px;color:var(--color-text-secondary);margin-bottom:8px">
        <li>Calentamiento progresivo (50%, 70%, 80%…).</li>
        <li>Series de trabajo al 90%, 95% y tu intento máximo.</li>
        <li>Registrar peso y reps al fallar → estimo tu 1RM.</li>
        <li>Al finalizar verás tu máximo y los pesos que usaré a partir de ahora.</li>
      </ol>
      <div style="background:rgba(239,68,68,0.08);border-left:3px solid var(--color-danger);padding:8px 10px;border-radius:4px;font-size:0.75rem;color:var(--color-text-secondary);margin-bottom:14px">
        ⚠️ <strong>Seguridad:</strong> hazlo con máscara/seguridad o en máquina guiada, nunca solo con barra cargada al fallo. Cada 4–8 semanas es suficiente; si eres principiante, estima con series submáximas.
      </div>

      <div style="margin-bottom:10px">
        <label style="font-size:0.8125rem;font-weight:600;display:block;margin-bottom:4px">Ejercicio</label>
        <input id="rm-test-ex" class="input" placeholder="Busca el ejercicio… (ej. Press banca)" autocomplete="off" oninput="AICoach.filterExerciseOptions(this.value)">
        <datalist id="rm-test-ex-list"></datalist>
        <div style="font-size:0.65rem;color:var(--color-text-tertiary);margin-top:4px">Prueba en: barra, mancuernas o máquina — el que quieras medir.</div>
      </div>

      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary flex-1" onclick="Modal.hide()">Cancelar</button>
        <button class="btn btn-primary flex-1" onclick="AICoach.start1RMTest()">🚀 Empezar test</button>
      </div>
    `, { title: 'Test de 1RM — mide tu fuerza' });
    setTimeout(() => this.filterExerciseOptions(''), 50);
  },

  // Options for the test's exercise datalist. Empty query → exercises with history first.
  filterExerciseOptions(q) {
    const list = document.getElementById('rm-test-ex-list');
    if (!list) return '';
    const norm = (t) => (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const all = Storage.getAllExercises();
    const query = norm(q || '').trim();
    let matches;
    if (query) {
      matches = all.filter(e => norm(e.name).includes(query)).slice(0, 30);
    } else {
      // Prefer exercises the user has actually trained
      const trained = [];
      const seen = {};
      Storage.getWorkouts().forEach(w => (w.exercises || []).forEach(ex => {
        if (!seen[ex.exerciseId]) {
          seen[ex.exerciseId] = true;
          const d = Storage.getExercise(ex.exerciseId);
          if (d) trained.push(d);
        }
      }));
      matches = [...trained, ...all.filter(e => !seen[e.id])].slice(0, 30);
    }
    list.innerHTML = matches.map(e => `<option value="${escapeHtml(e.name)}">`).join('');
    return list.innerHTML;
  },

  start1RMTest(nameOrId) {
    const raw = nameOrId !== undefined && nameOrId !== null
      ? String(nameOrId)
      : (document.getElementById('rm-test-ex')?.value || '').trim();
    if (!raw) {
      Toast.show('Elige el ejercicio del test', 'warning');
      return;
    }
    const norm = (t) => (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const exercise = Storage.getAllExercises().find(e => e.id === raw || norm(e.name) === norm(raw));
    if (!exercise) {
      Toast.show('Ejercicio no encontrado — escríbelo o selecciónalo de la lista', 'error');
      return;
    }

    const user = Storage.getUser();
    const e1RM = this.estimate1RM(exercise.id);
    const history = Storage.getExerciseHistory(exercise.id, 6);
    const bestWeight = history.length ? Math.max(...history.map(h => h.maxWeight || 0)) : 0;
    const round = (w) => Math.round(w / 2.5) * 2.5;

    // Ramp: warm-ups, then work sets toward the current max, then the top attempt.
    let sets;
    if (e1RM > 0) {
      sets = [
        { weight: round(e1RM * 0.5),  reps: 5, type: 'warmup', completed: false },
        { weight: round(e1RM * 0.7),  reps: 3, type: 'warmup', completed: false },
        { weight: round(e1RM * 0.8),  reps: 2, type: 'normal', completed: false },
        { weight: round(e1RM * 0.9),  reps: 1, type: 'normal', completed: false },
        { weight: round(e1RM * 0.95), reps: 1, type: 'normal', completed: false },
        { weight: round(e1RM),        reps: 1, type: 'normal', completed: false },
      ];
    } else if (bestWeight > 0) {
      // No reliable 1RM yet: build a ramp on top of the best weight lifted
      const top = round(bestWeight * 1.1);
      sets = [
        { weight: round(top * 0.5),  reps: 5, type: 'warmup', completed: false },
        { weight: round(top * 0.7),  reps: 3, type: 'warmup', completed: false },
        { weight: round(top * 0.85), reps: 2, type: 'normal', completed: false },
        { weight: round(top * 0.95), reps: 1, type: 'normal', completed: false },
        { weight: top,               reps: 1, type: 'normal', completed: false },
      ];
    } else {
      // Brand new exercise: generic ascending ramp, weights filled in by the user
      sets = [10, 8, 5, 3, 2, 1].map(reps => ({ weight: null, reps, type: reps >= 8 ? 'warmup' : 'normal', completed: false }));
    }

    window.WorkoutScreen.activeWorkout = {
      name: `🧪 Test 1RM: ${exercise.name}`,
      routineId: null,
      is1RMTest: true,
      exercises: [{ exerciseId: exercise.id, unit: user.units, timeMode: false, sets }],
      startedAt: new Date().toISOString(),
    };
    window.WorkoutScreen.startTime = Date.now();
    window.WorkoutScreen.saveNow();
    window.WorkoutScreen.requestWakeLock();
    window.WorkoutScreen.startAutoSave();
    window.WorkoutScreen._attachBeforeUnload();
    Modal.hide();
    window.App.navigate('workout');
    Toast.show('🧪 Test iniciado — calienta bien y no falles en las primeras series', 'info', 4000);
  },

  // Best Epley estimate from a finished test workout (a clean single = the weight itself).
  estimate1RMFromWorkout(workout) {
    const ex = ((workout && workout.exercises) || [])[0];
    if (!ex) return { est: 0, set: null };
    let best = 0, bestSet = null;
    (ex.sets || []).forEach(s => {
      if (!s.completed || !(s.weight > 0) || !(s.reps > 0)) return;
      const est = s.reps === 1 ? s.weight : s.weight * (1 + s.reps / 30);
      if (est > best) { best = est; bestSet = s; }
    });
    return { est: best, set: bestSet };
  },

  show1RMTestResult(workout, prevEstimate = 0) {
    const ex = ((workout && workout.exercises) || [])[0];
    if (!ex) return;
    const exData = Storage.getExercise(ex.exerciseId);
    const name = exData ? exData.name : 'este ejercicio';
    const unit = ex.unit || Storage.getUser().units || 'kg';
    const { est, set } = this.estimate1RMFromWorkout(workout);

    if (!est) {
      Modal.show(`
        <p style="font-size:0.875rem;color:var(--color-text-secondary);line-height:1.6">
          No pude estimar tu 1RM porque no hay series completadas con peso y reps.<br><br>
          La próxima vez asegúrate de registrar el peso y las reps de cada intento. El test se guardó igualmente en tu historial.
        </p>
        <button class="btn btn-primary btn-block" style="margin-top:12px" onclick="Modal.hide()">Entendido</button>
      `, { title: '🧪 Test finalizado', center: true });
      return;
    }

    const round = (w) => Math.round(w / 2.5) * 2.5;
    const percents = [95, 90, 85, 80, 75];
    const tableRows = percents.map(p => `
      <div style="display:flex;justify-content:space-between;padding:5px 0;font-size:0.8125rem;border-bottom:1px solid var(--color-border)">
        <span style="color:var(--color-text-secondary)">${p}% de 1RM</span>
        <strong>${round(est * p / 100)} ${unit}</strong>
      </div>`).join('');
    const delta = prevEstimate > 0 ? est - prevEstimate : null;
    const deltaHtml = delta != null
      ? `<div style="font-size:0.8125rem;color:${delta >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};margin-top:4px">
          ${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)} ${unit} vs. tu estimación anterior (${prevEstimate.toFixed(1)} ${unit})
         </div>`
      : '';

    Modal.show(`
      <div style="text-align:center;margin-bottom:12px">
        <div style="font-size:3rem;margin-bottom:4px">🏆</div>
        <div style="font-size:0.8125rem;color:var(--color-text-secondary)">Tu 1RM estimado en</div>
        <div style="font-size:0.9375rem;font-weight:700">${escapeHtml(name)}</div>
        <div style="font-size:2.5rem;font-weight:800;color:var(--color-accent);line-height:1.2">${round(est)} <span style="font-size:1.25rem">${unit}</span></div>
        ${deltaHtml}
        ${set ? `<div style="font-size:0.7rem;color:var(--color-text-tertiary)">basado en ${set.weight}${unit} × ${set.reps} reps (Epley)</div>` : ''}
      </div>
      <div style="font-size:0.75rem;font-weight:700;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Tus pesos de entrenamiento</div>
      ${tableRows}
      <p style="font-size:0.75rem;color:var(--color-text-tertiary);margin-top:10px;line-height:1.5">
        A partir de ahora usaré este máximo para calcular tus pesos sugeridos. Repite el test cada 4–8 semanas.
      </p>
      <button class="btn btn-primary btn-block" style="margin-top:10px" onclick="Modal.hide()">¡Perfecto!</button>
    `, { title: '🧪 Resultado del test de 1RM' });
  },

  // Inyectar Rutina en la UI
  startAiWorkout() {
    const aiWorkout = this.generateDailyRecommendation();
    
    Modal.show(`
      <div style="text-align:center;margin-bottom:16px">
        <div style="font-size:3rem;margin-bottom:8px">🧠</div>
        <h3 style="font-size:1.25rem;font-weight:bold;margin-bottom:8px">${escapeHtml(aiWorkout.name)}</h3>
        <p style="font-size:0.875rem;color:var(--color-text-secondary)">
          He analizado tu fatiga muscular y tu 1RM para calcular los pesos óptimos de hoy.
        </p>
      </div>
      <div style="background:var(--color-bg-input);border-radius:8px;padding:12px;font-size:0.875rem;margin-bottom:16px;max-height:150px;overflow-y:auto">
        ${aiWorkout.exercises.map(e => {
          const exData = Storage.getExercise(e.exerciseId);
          const setsInfo = e.sets.filter(s => s.type==='normal').map(s => `${s.weight||'?'}x${s.reps}`).join(', ');
          return `<div style="margin-bottom:4px"><strong>${escapeHtml(exData ? exData.name : e.exerciseId)}</strong><br><span style="color:var(--color-accent)">Sugerido: ${escapeHtml(setsInfo)}</span></div>`;
        }).join('')}
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary flex-1" onclick="Modal.hide()">Cancelar</button>
        <button class="btn btn-primary flex-1" onclick="AICoach.acceptWorkout()">¡Aceptar y Entrenar!</button>
      </div>
    `, { title: 'Tu Coach Inteligente' });
    
    this._pendingWorkout = aiWorkout;
  },

  acceptWorkout() {
    if (!this._pendingWorkout) return;
    
    // Iniciar el workout en WorkoutScreen
    window.WorkoutScreen.activeWorkout = {
      name: this._pendingWorkout.name,
      routineId: null, // Podríamos linkear a la rutina original si quisieramos
      exercises: this._pendingWorkout.exercises,
      startedAt: new Date().toISOString(),
    };
    window.WorkoutScreen.startTime = Date.now();
    window.WorkoutScreen.save();
    window.WorkoutScreen.requestWakeLock();
    
    Modal.hide();
    window.App.navigate('workout');
    Toast.show('Rutina cargada. ¡A romperla!', 'success');
  }
};
