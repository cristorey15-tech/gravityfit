// ============================================
// GravityFit — RPG Gamification Engine
// ============================================

import { Storage } from './storage.js';
import { BadgeCelebration } from './components.js';

export const Gamification = {
  // Configuración de Experiencia (XP)
  XP_RATES: {
    WORKOUT_COMPLETE: 50,
    PER_SET_COMPLETED: 5,
    PER_PR_BROKEN: 25,
    STREAK_BONUS: 10 // Por cada día de racha activa
  },

  // Base de datos de Insignias/Logros
  BADGES: [
    // --- FÁCILES (ya existentes) ---
    { id: 'first_blood', icon: '🩸', title: 'Primera Sangre', desc: 'Completa tu primer entrenamiento.', reqType: 'workouts', reqTarget: 1 },
    { id: 'dedication_10', icon: '🥉', title: 'Compromiso de Bronce', desc: 'Completa 10 entrenamientos en total.', reqType: 'workouts', reqTarget: 10 },
    { id: 'dedication_50', icon: '🥈', title: 'Guerrero de Plata', desc: 'Completa 50 entrenamientos en total.', reqType: 'workouts', reqTarget: 50 },
    { id: 'dedication_100', icon: '🥇', title: 'Leyenda de Oro', desc: 'Completa 100 entrenamientos en total.', reqType: 'workouts', reqTarget: 100 },
    { id: 'volume_beast', icon: '🦍', title: 'Bestia del Volumen', desc: 'Mueve más de 10,000 kg en un solo entrenamiento.', reqType: 'volume', reqTarget: 10000 },
    { id: 'night_owl', icon: '🦉', title: 'Búho Nocturno', desc: 'Termina un entrenamiento después de medianoche.', reqType: 'time', reqTarget: 'night' },
    { id: 'early_bird', icon: '🐓', title: 'Gallo Madrugador', desc: 'Termina un entrenamiento antes de las 6:00 AM.', reqType: 'time', reqTarget: 'morning' },
    { id: 'streak_7', icon: '🔥', title: 'Imparable', desc: 'Mantén una racha de entrenamiento de 7 días.', reqType: 'streak', reqTarget: 7 },
    { id: 'pr_hunter', icon: '🎯', title: 'Cazador de Récords', desc: 'Rompe 5 Récords Personales en un solo entrenamiento.', reqType: 'pr', reqTarget: 5 },
    { id: 'iron_lung', icon: '🫁', title: 'Pulmones de Hierro', desc: 'Registra un entrenamiento de más de 2 horas de duración.', reqType: 'duration', reqTarget: 120 },

    // --- MEDIA DIFICULTAD ---
    { id: 'dedication_200', icon: '🏅', title: 'Atleta de Hierro', desc: 'Completa 200 entrenamientos en total.', reqType: 'workouts', reqTarget: 200 },
    { id: 'streak_30', icon: '💪', title: 'Imparable II — 1 Mes', desc: 'Mantén una racha de entrenamiento de 30 días.', reqType: 'streak', reqTarget: 30 },
    { id: 'volume_mountain', icon: '🏔️', title: 'Montaña de Hierro', desc: 'Acumula 100,000 kg de volumen total levantado en toda tu historia.', reqType: 'cumulativeVolume', reqTarget: 100000 },
    { id: 'pr_collector', icon: '🎯', title: 'Coleccionista de Récords', desc: 'Rompe 20 Récords Personales en total.', reqType: 'cumulativePRs', reqTarget: 20 },
    { id: 'night_king', icon: '🌙', title: 'Rey de la Noche', desc: 'Completa 10 entrenamientos después de medianoche.', reqType: 'nightWorkouts', reqTarget: 10 },
    { id: 'diverse_50', icon: '🌟', title: 'Atleta Versátil', desc: 'Usa 50 ejercicios diferentes en toda tu historia.', reqType: 'uniqueExercises', reqTarget: 50 },

    // --- ALTA DIFICULTAD ---
    { id: 'dedication_500', icon: '👑', title: 'Leyenda Absoluta', desc: 'Completa 500 entrenamientos en total.', reqType: 'workouts', reqTarget: 500 },
    { id: 'streak_120', icon: '🔥', title: 'Imparable III — 4 Meses 🔥', desc: 'Mantén una racha de entrenamiento de 120 días (~4 meses entrenando sin faltar).', reqType: 'streak', reqTarget: 120 },
    { id: 'volume_titan', icon: '🌋', title: 'Titán del Volumen', desc: 'Acumula 500,000 kg de volumen total levantado en toda tu historia.', reqType: 'cumulativeVolume', reqTarget: 500000 },
    { id: 'pr_legend', icon: '💎', title: 'Leyenda de los Récords', desc: 'Rompe 100 Récords Personales en total.', reqType: 'cumulativePRs', reqTarget: 100 },
    { id: 'year_warrior', icon: '🗓️', title: 'Guerrero del Año', desc: 'Entrena todos los meses durante 12 meses consecutivos.', reqType: 'yearActive', reqTarget: 12 },
  ],

  // Fórmula matemática del nivel: Nivel = raíz cuadrada de (XP / 100) + 1
  getLevelFromXP(xp) {
    if (!xp) return 1;
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  },

  // XP necesaria para alcanzar un nivel específico
  getXPForLevel(level) {
    return Math.pow(level - 1, 2) * 100;
  },

  // Obtener progreso hacia el siguiente nivel (0 a 100%)
  getLevelProgress(xp) {
    const currentLevel = this.getLevelFromXP(xp);
    const currentLevelXP = this.getXPForLevel(currentLevel);
    const nextLevelXP = this.getXPForLevel(currentLevel + 1);
    
    const xpIntoLevel = xp - currentLevelXP;
    const xpRequired = nextLevelXP - currentLevelXP;
    
    return {
      currentXP: xpIntoLevel,
      requiredXP: xpRequired,
      percentage: Math.min(100, Math.round((xpIntoLevel / xpRequired) * 100))
    };
  },

  // Evaluar entrenamiento finalizado para otorgar XP y Logros
  processWorkout(workoutData, prCount = 0) {
    const user = Storage.getUser();
    let xpEarned = this.XP_RATES.WORKOUT_COMPLETE;
    const newBadges = [];
    
    // Inicializar datos RPG si no existen
    if (!user.xp) user.xp = 0;
    if (!user.badges) user.badges = [];
    if (!user.stats) user.stats = {};
    const initialLevel = this.getLevelFromXP(user.xp);

    // 1. Cálculos de XP
    let totalSets = 0;
    let totalVolume = 0;

    (workoutData.exercises || []).forEach(ex => {
      (ex.sets || []).forEach(s => {
        if (s.completed) {
          totalSets++;
          if (s.weight && s.reps) totalVolume += (s.weight * s.reps);
        }
      });
    });

    xpEarned += (totalSets * this.XP_RATES.PER_SET_COMPLETED);
    xpEarned += (prCount * this.XP_RATES.PER_PR_BROKEN);

    // Streak bonus XP
    const streak = Storage.getStreak();
    if (streak > 1) {
      xpEarned += streak * this.XP_RATES.STREAK_BONUS;
    }

    user.xp += xpEarned;
    const newLevel = this.getLevelFromXP(user.xp);
    const leveledUp = newLevel > initialLevel;

    // 2. Acumular estadísticas de tracking
    user.stats.totalPRs = (user.stats.totalPRs || 0) + prCount;
    
    // Night workout tracking
    const finishDate = new Date(workoutData.finishedAt);
    const hour = finishDate.getHours();
    if (hour >= 0 && hour < 4) {
      user.stats.nightWorkouts = (user.stats.nightWorkouts || 0) + 1;
    }

    // Unique exercises tracking
    if (!user.stats.usedExercises) user.stats.usedExercises = [];
    (workoutData.exercises || []).forEach(ex => {
      if (ex.exerciseId && !user.stats.usedExercises.includes(ex.exerciseId)) {
        user.stats.usedExercises.push(ex.exerciseId);
      }
    });

    // Months active tracking
    const monthKey = `${finishDate.getFullYear()}-${finishDate.getMonth()}`;
    if (!user.stats.activeMonths) user.stats.activeMonths = [];
    if (!user.stats.activeMonths.includes(monthKey)) {
      user.stats.activeMonths.push(monthKey);
    }

    // 2.5 Weekly PR tracking for challenges
    if (!user.stats.weeklyPRs) user.stats.weeklyPRs = 0;
    user.stats.weeklyPRs += prCount;
    
    // 2.6 Actualizar retos semanales
    this.updateWeeklyChallenges(workoutData, prCount);

    // 3. Evaluación de Insignias (Badges)
    const allWorkouts = Storage.getWorkouts(); // ya incluye el que acaba de terminar
    const durationMins = workoutData.startedAt ? (finishDate.getTime() - new Date(workoutData.startedAt).getTime()) / 60000 : 0;

    // Pre-calcular stats acumulativos
    const cumulativeVolume = allWorkouts.reduce((sum, w) => sum + Storage.getTotalVolume(w), 0);

    this.BADGES.forEach(badge => {
      // Si ya lo tiene, saltar
      if (user.badges.includes(badge.id)) return;

      let unlocked = false;

      switch(badge.reqType) {
        case 'workouts':
          if (allWorkouts.length >= badge.reqTarget) unlocked = true;
          break;
        case 'volume':
          if (totalVolume >= badge.reqTarget) unlocked = true;
          break;
        case 'time':
          if (badge.reqTarget === 'night' && (hour >= 0 && hour < 4)) unlocked = true;
          if (badge.reqTarget === 'morning' && (hour >= 4 && hour < 6)) unlocked = true;
          break;
        case 'pr':
          if (prCount >= badge.reqTarget) unlocked = true;
          break;
        case 'duration':
          if (durationMins >= badge.reqTarget) unlocked = true;
          break;
        case 'streak':
          if (streak >= badge.reqTarget) unlocked = true;
          break;
        case 'cumulativeVolume':
          if (cumulativeVolume >= badge.reqTarget) unlocked = true;
          break;
        case 'cumulativePRs':
          if ((user.stats.totalPRs || 0) >= badge.reqTarget) unlocked = true;
          break;
        case 'nightWorkouts':
          if ((user.stats.nightWorkouts || 0) >= badge.reqTarget) unlocked = true;
          break;
        case 'uniqueExercises':
          if ((user.stats.usedExercises || []).length >= badge.reqTarget) unlocked = true;
          break;
        case 'yearActive':
          // Check if user has been active for N+ consecutive months
          const months = (user.stats.activeMonths || []).sort();
          if (months.length >= badge.reqTarget) {
            // Check that the months are consecutive (last N months)
            const recentMonths = months.slice(-badge.reqTarget);
            if (recentMonths.length === badge.reqTarget) {
              const first = recentMonths[0].split('-').map(Number);
              const last = recentMonths[recentMonths.length - 1].split('-').map(Number);
              const totalMonths = (last[0] - first[0]) * 12 + (last[1] - first[1]) + 1;
              if (totalMonths === badge.reqTarget) unlocked = true;
            }
          }
          break;
      }

      if (unlocked) {
        user.badges.push(badge.id);
        newBadges.push(badge);
      }
    });

    // Guardar cambios
    Storage.saveUser(user);

    return {
      xpEarned,
      newLevel: leveledUp ? newLevel : null,
      newBadges
    };
  },

    // ============================================
  // FEATURE #5 — Retos Semanales
  // ============================================
  
  // Pool de retos semanales posibles (con descripciones contextuales)
  CHALLENGE_POOL: [
    { type: 'workouts', target: [3, 5, 7], icon: '🏃', 
      titleFn: (t) => `${t} Entrenos`,
      descFn: (t) => `Completa ${t} entrenamientos esta semana` },
    { type: 'volume', target: [25000, 50000, 100000], icon: '🏋️',
      titleFn: (t) => `${(t / 1000).toFixed(0)}k kg`,
      descFn: (t) => `Levanta ${(t / 1000).toFixed(0)}k kg en total esta semana` },
    { type: 'duration', target: [120, 240, 360], icon: '⏱️', // en minutos
      titleFn: (t) => `${t} min`,
      descFn: (t) => `Entrena un total de ${t} minutos esta semana` },
    { type: 'unique_exercises', target: [8, 15, 25], icon: '💪',
      titleFn: (t) => `${t} Ejercicios`,
      descFn: (t) => `Usa ${t} ejercicios diferentes esta semana` },
    { type: 'streak_days', target: [3, 5, 7], icon: '🔥',
      titleFn: (t) => `Racha ${t} días`,
      descFn: (t) => `Mantén una racha activa de ${t} días seguidos` },
    { type: 'total_sets', target: [30, 60, 100], icon: '🎯',
      titleFn: (t) => `${t} Series`,
      descFn: (t) => `Completa ${t} series esta semana` },
    { type: 'prs', target: [1, 3, 5], icon: '🏆',
      titleFn: (t) => `${t} PR${t > 1 ? 's' : ''}`,
      descFn: (t) => `Rompe ${t} ${t === 1 ? 'récord personal' : 'récords personales'} esta semana` },
    { type: 'muscles', target: [3, 5, 8], icon: '🦾',
      titleFn: (t) => `${t} Músculos`,
      descFn: (t) => `Trabaja ${t} grupos musculares distintos esta semana` },
    { type: 'morning_workouts', target: [2, 4], icon: '🌅',
      titleFn: (t) => `${t} Mañanas`,
      descFn: (t) => `Entrena ${t} veces antes de las 8 AM` },
    { type: 'calories', target: [300, 600, 1000], icon: '🔥',
      titleFn: (t) => `${t} cal`,
      descFn: (t) => `Quema ${t} calorías esta semana (con sensor HR)` },
    { type: 'program_days', target: [2, 3, 5], icon: '📅',
      titleFn: (t) => `${t} del Prog.`,
      descFn: (t) => `Completa ${t} días de tu programa activo` },
  ],

  // Generar retos para la semana actual (lunes a domingo)
  _getWeekMonday() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
  },

  ensureWeeklyChallenges() {
    const user = Storage.getUser();
    if (!user.weeklyChallenges) user.weeklyChallenges = { weekStart: '', challenges: [] };
    
    const currentWeek = this._getWeekMonday();
    
    // Si está cambiando la semana, resetear contadores semanales
    if (user.weeklyChallenges.weekStart !== currentWeek) {
      user.stats.weeklyPRs = 0;
    }
    
    // Si ya están generados para esta semana, devolverlos
    if (user.weeklyChallenges.weekStart === currentWeek && user.weeklyChallenges.challenges.length >= 3) {
      return user.weeklyChallenges.challenges;
    }
    
    // Generar 3 retos nuevos para esta semana
    const activeProgram = Storage.getActiveProgram();
    let pool = [...this.CHALLENGE_POOL];
    
    // Filtrar retos que requieren datos que el usuario no tiene
    const allWorkouts = Storage.getWorkouts();
    const hasHRData = allWorkouts.some(w => w.heartRateData?.totalCalories > 0);
    if (!hasHRData) {
      pool = pool.filter(c => c.type !== 'calories');
    }
    
    // Dar más peso a retos de programa si hay uno activo
    if (activeProgram) {
      // Mover 'program_days' al inicio para que sea más probable
      const progIdx = pool.findIndex(c => c.type === 'program_days');
      if (progIdx > 0) {
        const item = pool.splice(progIdx, 1)[0];
        pool.unshift(item);
      }
    }
    
    // Barajar (shuffle) el pool
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    
    // Seleccionar 3 retos, prefiriendo variedad de tipos
    const selected = [];
    const usedTypes = new Set();
    
    for (const template of pool) {
      if (selected.length >= 3) break;
      if (usedTypes.has(template.type)) continue;
      
      usedTypes.add(template.type);
      
      // Elegir dificultad según nivel del usuario
      const totalWorkouts = Storage.getWorkouts().length;
      let difficultyIdx = 0;
      if (totalWorkouts > 100) difficultyIdx = 2;
      else if (totalWorkouts > 30) difficultyIdx = 1;
      
      const targetIdx = Math.min(difficultyIdx, template.target.length - 1);
      const target = template.target[targetIdx];
      
      selected.push({
        id: `wc_${template.type}_${currentWeek}`,
        type: template.type,
        target,
        current: 0,
        completed: false,
        icon: template.icon,
        title: template.titleFn(target),
        desc: template.descFn(target),
        programRelated: template.type === 'program_days',
      });
    }
    
    user.weeklyChallenges = { weekStart: currentWeek, challenges: selected };
    Storage.saveUser(user);
    return selected;
  },

  // Actualizar progreso de retos semanales después de un workout
  updateWeeklyChallenges(workoutData, prCount = 0) {
    const user = Storage.getUser();
    if (!user.weeklyChallenges || user.weeklyChallenges.weekStart !== this._getWeekMonday()) {
      this.ensureWeeklyChallenges();
    }
    
    const challenges = user.weeklyChallenges.challenges;
    const allWorkouts = Storage.getWorkouts();
    const weekWorkouts = Storage.getWorkoutsThisWeek();
    const weekVol = weekWorkouts.reduce((s, w) => s + Storage.getTotalVolume(w), 0);
    const weekDuration = weekWorkouts.reduce((s, w) => s + (w.duration || 0), 0);
    const weekSets = weekWorkouts.reduce((s, w) => s + ((w.exercises || []).reduce((ss, ex) => ss + (ex.sets || []).filter(st => st.completed).length, 0)), 0);
    
    // Unique exercises this week
    const weekExSet = new Set();
    weekWorkouts.forEach(w => (w.exercises || []).forEach(e => weekExSet.add(e.exerciseId)));
    
    // Muscles this week
    const weekMuscles = new Set();
    weekWorkouts.forEach(w => (w.exercises || []).forEach(e => {
      const d = Storage.getExercise(e.exerciseId);
      if (d && d.primaryMuscle) weekMuscles.add(d.primaryMuscle);
    }));
    
    // Morning workouts: finished before 8 AM
    const morningCount = weekWorkouts.filter(w => {
      if (!w.finishedAt) return false;
      const h = new Date(w.finishedAt).getHours();
      return h < 8;
    }).length;
    
    // Calories from heart rate
    const weekCalories = weekWorkouts.reduce((s, w) => s + (w.heartRateData?.totalCalories || 0), 0);
    
    // Program days
    const activeProgram = Storage.getActiveProgram();
    const programDays = activeProgram ? (activeProgram.completedWorkouts || []).length : 0;
    
    const completedIds = [];
    
    challenges.forEach(c => {
      if (c.completed) return;
      
      switch (c.type) {
        case 'workouts':
          c.current = Math.min(c.target, weekWorkouts.length);
          break;
        case 'volume':
          c.current = Math.min(c.target, Math.round(weekVol));
          break;
        case 'duration':
          c.current = Math.min(c.target, Math.round(weekDuration / 60));
          break;
        case 'unique_exercises':
          c.current = Math.min(c.target, weekExSet.size);
          break;
        case 'streak_days':
          c.current = Math.min(c.target, Storage.getStreak());
          break;
        case 'total_sets':
          c.current = Math.min(c.target, weekSets);
          break;
        case 'prs':
          c.current = Math.min(c.target, (user.stats?.weeklyPRs || 0));
          break;
        case 'muscles':
          c.current = Math.min(c.target, weekMuscles.size);
          break;
        case 'morning_workouts':
          c.current = Math.min(c.target, morningCount);
          break;
        case 'calories':
          c.current = Math.min(c.target, Math.round(weekCalories));
          break;
        case 'program_days':
          c.current = Math.min(c.target, programDays);
          break;
      }
      
      if (c.current >= c.target) {
        c.completed = true;
        completedIds.push(c);
      }
    });
    
    Storage.saveUser(user);
    
    // Notify completed challenges
    completedIds.forEach(c => {
      Toast.show(`🎯 ¡Reto superado: ${c.title}!`, 'success', 4000);
      if (navigator.vibrate) navigator.vibrate([100, 50, 200]);
    });
    
    return challenges;
  },

  // Genera el HTML de la pantalla de Recompensas
  showRewardsModal(rewards) {
    if (!rewards.xpEarned && !rewards.newLevel && rewards.newBadges.length === 0) return;

    // Show BadgeCelebration first if there are new badges (with confetti, sounds, animations)
    if (rewards.newBadges.length > 0) {
      setTimeout(() => {
        BadgeCelebration.show(rewards.newBadges);
      }, 800);
    }

    // Also show the XP/level rewards modal
    let html = `
      <div style="text-align:center">
        <div style="font-size:3rem;margin-bottom:8px">✨</div>
        <h2 style="font-size:1.5rem;font-weight:bold;color:var(--color-accent);margin-bottom:16px">¡Entrenamiento Superado!</h2>
        
        <div style="background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:12px;padding:16px;margin-bottom:16px">
          <div style="font-size:2rem;font-weight:bold;margin-bottom:4px">+ ${rewards.xpEarned} XP</div>
          <div style="font-size:0.875rem;color:var(--color-text-secondary)">Experiencia Ganada</div>
        </div>
    `;

    if (rewards.newLevel) {
      html += `
        <div style="animation: pulse 2s infinite; background:linear-gradient(135deg, rgba(167,139,250,0.2), rgba(34,211,238,0.2));border:1px solid var(--color-accent);border-radius:12px;padding:16px;margin-bottom:16px">
          <div style="font-size:3rem;margin-bottom:8px">🆙</div>
          <div style="font-size:1.25rem;font-weight:bold;color:var(--color-text)">¡Subiste al Nivel ${rewards.newLevel}!</div>
        </div>
      `;
    }

    if (rewards.newBadges.length > 0) {
      html += `<div style="font-weight:bold;margin-bottom:8px;text-align:left;color:var(--color-accent)">🏆 Logros desbloqueados</div>`;
      rewards.newBadges.forEach(b => {
        html += `
          <div style="display:flex;align-items:center;background:var(--color-bg-input);border-radius:8px;padding:12px;margin-bottom:8px;text-align:left">
            <div style="font-size:2rem;margin-right:12px">${b.icon}</div>
            <div>
              <div style="font-weight:bold;color:var(--color-text)">${b.title}</div>
              <div style="font-size:0.75rem;color:var(--color-text-tertiary)">${b.desc}</div>
            </div>
          </div>
        `;
      });
    }

    html += `<button class="btn btn-primary btn-block" style="margin-top:16px" onclick="Modal.hide()">Continuar</button></div>`;

    setTimeout(() => {
      Modal.show(html, { title: 'Recompensas RPG' });
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 300]);
    }, 1500);
  }
};
