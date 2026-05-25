// ============================================
// GravityFit — RPG Gamification Engine
// ============================================

import { Storage } from './storage.js';

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
    { id: 'first_blood', icon: '🩸', title: 'Primera Sangre', desc: 'Completa tu primer entrenamiento.', reqType: 'workouts', reqTarget: 1 },
    { id: 'dedication_10', icon: '🥉', title: 'Compromiso de Bronce', desc: 'Completa 10 entrenamientos en total.', reqType: 'workouts', reqTarget: 10 },
    { id: 'dedication_50', icon: '🥈', title: 'Guerrero de Plata', desc: 'Completa 50 entrenamientos en total.', reqType: 'workouts', reqTarget: 50 },
    { id: 'dedication_100', icon: '🥇', title: 'Leyenda de Oro', desc: 'Completa 100 entrenamientos en total.', reqType: 'workouts', reqTarget: 100 },
    { id: 'volume_beast', icon: '🦍', title: 'Bestia del Volumen', desc: 'Mueve más de 10,000 kg en un solo entrenamiento.', reqType: 'volume', reqTarget: 10000 },
    { id: 'night_owl', icon: '🦉', title: 'Búho Nocturno', desc: 'Termina un entrenamiento después de medianoche.', reqType: 'time', reqTarget: 'night' },
    { id: 'early_bird', icon: '🐓', title: 'Gallo Madrugador', desc: 'Termina un entrenamiento antes de las 6:00 AM.', reqType: 'time', reqTarget: 'morning' },
    { id: 'streak_7', icon: '🔥', title: 'Imparable', desc: 'Mantén una racha de entrenamiento de 7 días (basado en meta).', reqType: 'custom' },
    { id: 'pr_hunter', icon: '🎯', title: 'Cazador de Récords', desc: 'Rompe 5 Récords Personales en un solo entrenamiento.', reqType: 'pr', reqTarget: 5 },
    { id: 'iron_lung', icon: '🫁', title: 'Pulmones de Hierro', desc: 'Registra un entrenamiento de más de 2 horas de duración.', reqType: 'duration', reqTarget: 120 }
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

    // TODO: Racha bonus
    
    user.xp += xpEarned;
    const newLevel = this.getLevelFromXP(user.xp);
    const leveledUp = newLevel > initialLevel;

    // 2. Evaluación de Insignias (Badges)
    const allWorkouts = Storage.getWorkouts(); // ya incluye el que acaba de terminar
    const finishDate = new Date(workoutData.finishedAt);
    const hour = finishDate.getHours();
    const durationMins = workoutData.startedAt ? (finishDate.getTime() - new Date(workoutData.startedAt).getTime()) / 60000 : 0;

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
        // Otras validaciones (streaks, etc) se pueden agregar
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

  // Genera el HTML de la pantalla de Recompensas
  showRewardsModal(rewards) {
    if (!rewards.xpEarned && !rewards.newLevel && rewards.newBadges.length === 0) return;

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
      html += `<div style="font-weight:bold;margin-bottom:8px;text-align:left">Nuevas Insignias:</div>`;
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
      // Vibración de celebración
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 300]);
    }, 1000); // 1 segundo después del PR normal si hubo
  }
};
