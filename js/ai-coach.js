// ============================================
// GravityFit — AI Coach & Smart Logic
// ============================================

import { Storage } from './storage.js';
import { Modal, Toast } from './components.js';
import { App } from './app.js';

export const AICoach = {
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
          const epley1RM = s.weight * (1 + s.reps / 30);
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

    // a. Verificar si hay un programa activo que dicte qué toca hoy
    const program = Storage.getActiveProgram();
    const nextWorkout = program ? Storage.getNextProgramWorkout(program) : null;

    if (nextWorkout && nextWorkout.isToday && nextWorkout.routine && nextWorkout.routine.id !== 'rest') {
      // Tomamos la rutina del programa y le aplicamos inteligencia de pesos
      routineName = `AI Coach: ${nextWorkout.routine.name}`;
      return this._buildWorkoutFromTemplate(routineName, nextWorkout.routine.exercises);
    }

    // b. Si no hay programa, armar uno basado en músculos MENOS fatigados
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
    const generatedExercises = templateExercises.map(ex => {
      const e1RM = this.estimate1RM(ex.exerciseId);
      const sets = [];
      
      if (e1RM > 0) {
        // Inteligencia de programación si hay 1RM
        // Set 1: Calentamiento 50%
        sets.push({ weight: this._roundToPlates(e1RM * 0.5), reps: 10, type: 'warmup', completed: false });
        // Set 2: Aproximación 70%
        sets.push({ weight: this._roundToPlates(e1RM * 0.7), reps: 8, type: 'normal', completed: false });
        // Set 3 y 4: Trabajo efectivo 80%
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
    if (history.length === 0) return null;
    // Find sessions where RPE was recorded
    const withRPE = [];
    for (const h of history) {
      for (const s of h.sets) {
        if (s.rpe && s.weight) {
          withRPE.push({ weight: s.weight, reps: s.reps, rpe: s.rpe });
        }
      }
    }
    if (withRPE.length === 0) return null;
    // Find closest RPE match and suggest that weight
    withRPE.sort((a, b) => Math.abs(a.rpe - targetRPE) - Math.abs(b.rpe - targetRPE));
    return withRPE[0].weight;
  },

  // Inyectar Rutina en la UI
  startAiWorkout() {
    const aiWorkout = this.generateDailyRecommendation();
    
    Modal.show(`
      <div style="text-align:center;margin-bottom:16px">
        <div style="font-size:3rem;margin-bottom:8px">🧠</div>
        <h3 style="font-size:1.25rem;font-weight:bold;margin-bottom:8px">${aiWorkout.name}</h3>
        <p style="font-size:0.875rem;color:var(--color-text-secondary)">
          He analizado tu fatiga muscular y tu 1RM para calcular los pesos óptimos de hoy.
        </p>
      </div>
      <div style="background:var(--color-bg-input);border-radius:8px;padding:12px;font-size:0.875rem;margin-bottom:16px;max-height:150px;overflow-y:auto">
        ${aiWorkout.exercises.map(e => {
          const exData = Storage.getExercise(e.exerciseId);
          const setsInfo = e.sets.filter(s => s.type==='normal').map(s => `${s.weight||'?'}x${s.reps}`).join(', ');
          return `<div style="margin-bottom:4px"><strong>${exData ? exData.name : e.exerciseId}</strong><br><span style="color:var(--color-accent)">Sugerido: ${setsInfo}</span></div>`;
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
