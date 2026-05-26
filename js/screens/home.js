// ============================================
// GravityFit — Home Screen
// ============================================

import { Storage } from '../storage.js';
import { Icons } from '../components.js';
import { App } from '../app.js';

export const HomeScreen = {
  render() {
    const user = Storage.getUser();
    const weeklyGoal = user.weeklyGoal || 4;
    const weekWorkouts = Storage.getWorkoutsThisWeek();
    const totalVol = weekWorkouts.reduce((sum, w) => sum + Storage.getTotalVolume(w), 0);
    const streak = Storage.getStreak();
    const allWorkouts = Storage.getWorkouts();
    const lastWorkout = allWorkouts[0] || null;
    const routines = Storage.getRoutines();
    const greeting = this.getGreeting();
    const comparison = Storage.getWeekComparison();
    const level = Storage.getUserLevel();
    const container = document.getElementById('screen-home');

    container.innerHTML = `
      <div class="screen-header">
        <div class="home-greeting">
          <h1>${greeting}, ${user.name}</h1>
          <p>${this.formatDate(new Date())}</p>
          <div class="xp-level-badge">${level.icon} ${level.name} · ${level.xp} XP</div>
        </div>
      </div>
      <div class="screen-content">
        <div class="home-stats">
          <div class="stat-card">
            <div style="position:relative;width:56px;height:56px;margin:0 auto 4px">
              <svg viewBox="0 0 36 36" style="transform:rotate(-90deg)">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-border)" stroke-width="3"/>
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-accent)" stroke-width="3" stroke-linecap="round" stroke-dasharray="${Math.round(Math.min(weekWorkouts.length / weeklyGoal, 1) * 97.4)} 97.4"/>
              </svg>
              <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:1.1rem;font-weight:700">${weekWorkouts.length}/${weeklyGoal}</div>
            </div>
            <div class="stat-label">Meta Semanal</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${this.formatVolume(totalVol, user.units)}</div>
            <div class="stat-label">Volumen semanal</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="display:flex;align-items:center;justify-content:center;gap:6px">${streak} <div style="width:24px;height:24px;color:var(--color-accent)">${Icons.flame}</div></div>
            <div class="stat-label">Racha (días)</div>
          </div>
        </div>

        <div style="display:flex; gap:12px; margin-bottom:12px;">
          <button class="home-start-btn" style="flex:1; margin-bottom:0;" onclick="App.startEmptyWorkout()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Libre
          </button>
          <button class="home-start-btn" style="flex:1; margin-bottom:0; background: linear-gradient(135deg, #A78BFA, var(--color-accent)); color:#000; border:none;" onclick="AICoach.startAiWorkout()">
            <span style="font-size:1.2rem">🧠</span> AI Coach
          </button>
        </div>
        ${this.renderQuickActions(routines)}
        

        ${this.renderActiveProgram()}

        ${this.renderWeekSummary(comparison, user)}

        ${lastWorkout ? `
        <div class="home-last-workout">
          <div class="home-section-title">
            <span>Último Entrenamiento</span>
            <div style="display:flex;gap:8px">
              <button class="btn btn-accent btn-sm" onclick="event.stopPropagation(); window.HistoryScreen.repeatWorkout('${lastWorkout.id}')">🔄 Repetir</button>
              <button class="btn btn-ghost btn-sm" onclick="App.navigate('history')">Ver todo</button>
            </div>
          </div>
          <div class="card" onclick="HistoryScreen.showWorkoutDetail('${lastWorkout.id}')">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <h4 style="font-weight:600;font-size:0.9375rem">${lastWorkout.name || 'Entrenamiento'}</h4>
              <span style="font-size:0.75rem;color:var(--color-text-secondary)">${this.timeAgo(lastWorkout.finishedAt)}</span>
            </div>
            <div style="display:flex;gap:16px;font-size:0.75rem;color:var(--color-text-secondary);align-items:center">
              <span style="display:flex;align-items:center;gap:4px"><div style="width:14px;height:14px">${Icons.timer}</div> ${this.formatDuration(lastWorkout.duration)}</span>
              <span style="display:flex;align-items:center;gap:4px"><div style="width:14px;height:14px">${Icons.check}</div> ${(lastWorkout.exercises || []).length} ejercicios</span>
              <span style="display:flex;align-items:center;gap:4px"><div style="width:14px;height:14px">${Icons.award}</div> ${this.formatVolume(Storage.getTotalVolume(lastWorkout), user.units)}</span>
            </div>
          </div>
        </div>` : ''}

        ${routines.length ? `
        <div class="home-quick-routines">
          <div class="home-section-title">
            <span>Mis Rutinas</span>
            <button class="btn btn-ghost btn-sm" onclick="App.navigate('routines')">Ver todas</button>
          </div>
          <div class="quick-routines-scroll">
            ${routines.slice(0, 6).map(r => `
              <div class="quick-routine-card" onclick="App.startRoutineWorkout('${r.id}')">
                <h4>${r.name}</h4>
                <p>${(r.exercises || []).length} ejercicios</p>
              </div>
            `).join('')}
          </div>
        </div>` : `
        <div class="home-quick-routines">
          <div class="home-section-title"><span>Mis Rutinas</span></div>
          <div class="card" style="text-align:center;padding:24px;cursor:pointer" onclick="App.navigate('routines')">
            <div style="width:40px;height:40px;margin:0 auto 8px;color:var(--color-text-secondary)">${Icons.fileText}</div>
            <p style="color:var(--color-text-secondary);font-size:0.8125rem">Crea tu primera rutina para empezar rápido</p>
            <button class="btn btn-primary btn-sm" style="margin-top:12px">Crear Rutina</button>
          </div>
        </div>`}
      </div>
    `;
  },

  renderWeekSummary(c, user) {
    // Show motivational phrase
    const motivations = [
      { min: 0, phrase: '¡Empieza la semana con todo! 🚀' },
      { min: 1, phrase: '¡Buen comienzo! Sigue así 💪' },
      { min: 3, phrase: '¡Semana increíble! Eres imparable 🔥' },
      { min: 5, phrase: '¡Máquina absoluta! Descansa bien 😤' },
    ];
    let phrase = motivations[0].phrase;
    for (const m of motivations) { if (c.thisWeekCount >= m.min) phrase = m.phrase; }

    const volDir = c.volChange > 0 ? 'up' : c.volChange < 0 ? 'down' : 'neutral';
    const volIcon = c.volChange > 0 ? '↑' : c.volChange < 0 ? '↓' : '→';
    const countDir = c.countChange > 0 ? 'up' : c.countChange < 0 ? 'down' : 'neutral';
    const countIcon = c.countChange > 0 ? '↑' : c.countChange < 0 ? '↓' : '→';

    return `
      <div class="week-summary">
        <div class="home-section-title">
          <span>Tu Semana</span>
          <span style="font-size:0.75rem;color:var(--color-text-tertiary)">${phrase}</span>
        </div>
        <div class="week-comparison">
          <div class="week-compare-card">
            <div class="week-compare-value">${c.thisWeekCount}</div>
            <div class="week-compare-label">Entrenos</div>
            ${c.lastWeekCount > 0 ? `<div class="week-compare-change ${countDir}">${countIcon} ${Math.abs(c.countChange)} vs sem. anterior</div>` : ''}
          </div>
          <div class="week-compare-card">
            <div class="week-compare-value">${this.formatVolume(c.thisVol, user.units)}</div>
            <div class="week-compare-label">Volumen</div>
            ${c.lastVol > 0 ? `<div class="week-compare-change ${volDir}">${volIcon} ${Math.abs(Math.round(c.volChange))}%</div>` : ''}
          </div>
        </div>
        ${(function(){
          const weekWorkouts = Storage.getWorkoutsThisWeek();
          const mVol = {};
          weekWorkouts.forEach(w => {
            (w.exercises || []).forEach(ex => {
              const exData = Storage.getExercise(ex.exerciseId);
              if (exData && exData.primaryMuscle) {
                const vol = (ex.sets || []).reduce((s, set) => s + ((set.weight||0) * (set.reps||0)), 0);
                if (vol > 0) mVol[exData.primaryMuscle] = (mVol[exData.primaryMuscle] || 0) + vol;
              }
            });
          });
          const sorted = Object.entries(mVol).sort((a,b)=>b[1]-a[1]).slice(0, 4);
          if (!sorted.length) return '';
          const maxV = sorted[0][1];
          return `
            <div class="muscle-dashboard" style="margin-top:16px; margin-bottom:16px; background:var(--color-bg-card); border:1px solid var(--color-border); border-radius:12px; padding:16px;">
              <h3 style="font-size:0.875rem; font-weight:600; margin-bottom:12px;">Volumen por Músculo (Top 4)</h3>
              ${sorted.map(([m, v]) => `
                <div class="muscle-bar-row" style="margin-bottom:10px;">
                  <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--color-text-secondary); margin-bottom:4px;">
                    <span style="font-weight:500;color:var(--color-text)">${m}</span>
                    <span>${HomeScreen.formatVolume(v, user.units)}</span>
                  </div>
                  <div style="height:6px; background:var(--color-bg-input); border-radius:3px; overflow:hidden;">
                    <div style="height:100%; width:${Math.max(5, Math.round((v/maxV)*100))}%; background:var(--color-accent); border-radius:3px; transition:width 1s ease-out;"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        })()}
        ${c.bestExercise ? `
        <div class="card" style="padding:12px 16px;display:flex;align-items:center;gap:12px">
          <div style="width:24px;height:24px;color:var(--color-accent)">${Icons.star}</div>
          <div>
            <div style="font-size:0.8125rem;font-weight:600">Mejor ejercicio</div>
            <div style="font-size:0.75rem;color:var(--color-text-secondary)">${c.bestExercise} · ${this.formatVolume(c.bestExVol, user.units)}</div>
          </div>
        </div>` : ''}
      </div>
    `;
  },

  getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  },
  formatDate(d) {
    return d.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' });
  },
  formatVolume(v, units) {
    if (v >= 1000) return (v / 1000).toFixed(1) + 'k ' + units;
    return v + ' ' + units;
  },
  formatDuration(s) {
    if (!s) return '0 min';
    const m = Math.floor(s / 60);
    if (m < 60) return m + ' min';
    return Math.floor(m / 60) + 'h ' + (m % 60) + 'min';
  },
  timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'ayer';
    return `hace ${days} días`;
  },

  renderQuickActions(routines) {
    const allWorkouts = Storage.getWorkouts();
    const lastWorkout = allWorkouts[0] || null;
    const program = Storage.getActiveProgram();
    
    let html = '<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">';
    
    // Last routine quick start
    if (lastWorkout && lastWorkout.routineId) {
      const lastRoutine = Storage.getRoutine(lastWorkout.routineId);
      if (lastRoutine) {
        html += `
          <button class="chip ${lastRoutine ? 'active' : ''}" onclick="App.startRoutineWorkout('${lastRoutine.id}')">
            🔄 ${lastRoutine.name}
          </button>`;
      }
    }
    
    // Active program quick start
    if (program) {
      const next = Storage.getNextProgramWorkout(program);
      if (next && next.routine && next.routine.id !== 'rest' && next.isToday) {
        html += `
          <button class="chip active" onclick="App.startRoutineWorkout('${next.routine.id}')">
            📅 ${next.routine.name}
          </button>`;
      }
    }
    
    // Favorite routine quick starts (top 3)
    const favRoutines = routines.filter(r => r.isFavorite).slice(0, 3);
    favRoutines.forEach(r => {
      html += `
        <button class="chip" onclick="App.startRoutineWorkout('${r.id}')">
          ⭐ ${r.name}
        </button>`;
    });
    
    html += '</div>';
    return html;
  },

  // --- FEATURE L: End of Month Summary ---
  checkMonthSummary() {
    // Check if it's time to show an end-of-month report
    const lastShown = localStorage.getItem('gf_month_summary_shown');
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${now.getMonth()}`;
    
    if (lastShown === currentMonth) return; // Already shown this month
    
    const workouts = Storage.getWorkouts();
    if (workouts.length < 3) return; // Not enough data
    
    // Check if we're in a new month (at least 3 days into it)
    if (now.getDate() < 3) return;
    
    // Calculate previous month stats
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    
    const monthWorkouts = workouts.filter(w => {
      if (!w.finishedAt) return false;
      const d = new Date(w.finishedAt);
      return d >= prevMonthStart && d <= prevMonthEnd;
    });
    
    if (monthWorkouts.length === 0) return;
    
    // Calculate stats
    const totalVol = monthWorkouts.reduce((s, w) => s + Storage.getTotalVolume(w), 0);
    const totalDuration = monthWorkouts.reduce((s, w) => s + (w.duration || 0), 0);
    
    // Count unique exercises
    const exSet = new Set();
    monthWorkouts.forEach(w => (w.exercises || []).forEach(e => exSet.add(e.exerciseId)));
    
    // Best workout by volume
    let bestW = monthWorkouts.reduce((best, w) => Storage.getTotalVolume(w) > Storage.getTotalVolume(best) ? w : best, monthWorkouts[0]);
    const bestExData = bestW ? (bestW.exercises || []).map(e => Storage.getExercise(e.exerciseId)).filter(Boolean).slice(0, 2) : [];
    
    const user = Storage.getUser();
    const monthName = prevMonthStart.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    
    // Store that we've shown it
    localStorage.setItem('gf_month_summary_shown', currentMonth);
    
    // Show after a small delay
    setTimeout(() => {
      Toast.show(`📊 Resumen de ${monthName} disponible!`, 'info', 5000);
      setTimeout(() => {
        const html = `
          <div style="text-align:center;padding:8px 0">
            <div style="font-size:3rem;margin-bottom:8px">📊</div>
            <h3 style="margin-bottom:4px">Resumen de ${monthName}</h3>
            <div style="color:var(--color-text-secondary);font-size:0.85rem;margin-bottom:20px">¡Impresionante, ${user.name}!</div>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
              <div style="background:var(--color-bg-card);padding:16px;border-radius:12px">
                <div style="font-size:1.5rem;font-weight:bold;color:var(--color-accent)">${monthWorkouts.length}</div>
                <div style="font-size:0.75rem;color:var(--color-text-tertiary)">Entrenamientos</div>
              </div>
              <div style="background:var(--color-bg-card);padding:16px;border-radius:12px">
                <div style="font-size:1.5rem;font-weight:bold;color:var(--color-accent)">${HomeScreen.formatVolume(totalVol, user.units)}</div>
                <div style="font-size:0.75rem;color:var(--color-text-tertiary)">Volumen Total</div>
              </div>
              <div style="background:var(--color-bg-card);padding:16px;border-radius:12px">
                <div style="font-size:1.5rem;font-weight:bold;color:var(--color-accent)">${Math.floor(totalDuration / 60)}h ${totalDuration % 60}min</div>
                <div style="font-size:0.75rem;color:var(--color-text-tertiary)">Tiempo Total</div>
              </div>
              <div style="background:var(--color-bg-card);padding:16px;border-radius:12px">
                <div style="font-size:1.5rem;font-weight:bold;color:var(--color-accent)">${exSet.size}</div>
                <div style="font-size:0.75rem;color:var(--color-text-tertiary)">Ejercicios Distintos</div>
              </div>
            </div>
            
            ${bestW ? `
            <div style="background:var(--color-accent-dim);padding:12px;border-radius:12px;margin-bottom:20px">
              <div style="font-size:0.75rem;color:var(--color-text-secondary);margin-bottom:4px">🏆 Mejor Entrenamiento</div>
              <div style="font-weight:bold;font-size:0.9rem">${bestW.name}</div>
              <div style="font-size:0.8rem;color:var(--color-accent)">${HomeScreen.formatVolume(Storage.getTotalVolume(bestW), user.units)} · ${HomeScreen.formatDuration(bestW.duration)}</div>
              <div style="font-size:0.7rem;color:var(--color-text-tertiary);margin-top:4px">${bestExData.map(e => e?.name || '').filter(Boolean).join(', ')}</div>
            </div>` : ''}
            
            <button class="btn btn-primary btn-block" onclick="Modal.hide()">🔥 ¡A por el siguiente mes!</button>
          </div>`;
        
        // Use the existing Modal from window scope
        if (window.Modal) {
          window.Modal.show(html, { title: `📊 ${monthName}` });
        }
      }, 2000);
    }, 3000);
  },

  renderActiveProgram() {
    const program = Storage.getActiveProgram();
    if (!program) return '';
    const next = Storage.getNextProgramWorkout(program);
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const weekPct = Math.min((program.currentWeek / program.weeks) * 100, 100);
    
    let nextLabel = '';
    if (next) {
      if (program.mode === 'rotation') {
        nextLabel = next.isToday ? '🎯 Hoy: ' : `⏳ Siguiente: `;
      } else {
        nextLabel = next.isToday ? '🎯 Hoy: ' : `⏳ Próximo (${dayNames[next.slot.day]}): `;
      }
    }

    const rotationDayLabel = (program.mode === 'rotation' && next) ? `Día ${next.rotationIndex + 1} de ${next.totalRotations}` : '';

    return `
      <div class="program-card active-program" style="margin-top:12px">
        <div class="program-card-header">
          <div class="program-card-name" style="display:flex;align-items:center;gap:8px"><div style="width:16px;height:16px">${Icons.calendar}</div> ${program.name}</div>
          <span class="program-week-badge">${program.mode === 'rotation' ? 'Rotación' : `Semana ${program.currentWeek}/${program.weeks}`}</span>
        </div>
        <div class="program-progress-bar"><div class="program-progress-fill" style="width:${weekPct}%"></div></div>
        ${next ? (
          next.routine.id === 'rest' ? `
            <button class="btn btn-secondary btn-block" style="margin-top:8px" onclick="App.markRestDay()">
              ${nextLabel}Día de Descanso (Completar)
            </button>
          ` : `
            <button class="btn btn-primary btn-block" style="margin-top:8px" onclick="App.startRoutineWorkout('${next.routine.id}')">
              ${nextLabel}${next.routine.name}
            </button>
          `
        ) : '<div style="text-align:center;font-size:var(--font-size-sm);color:var(--color-text-secondary);margin-top:8px">No hay rutinas programadas</div>'}
      </div>`;
  }
};
