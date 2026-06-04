// ============================================
// GravityFit — Home Screen
// ============================================

import { Storage } from '../storage.js';
import { Icons, Toast, Modal } from '../components.js';
import { App } from '../app.js';

export const HomeScreen = {
  // DB muscle key → Spanish display name (single source of truth)
  MUSCLE_LABELS: {
    'abductores': 'Abductores',
    'adductors': 'Aductores',
    'antebrazos': 'Antebrazos',
    'biceps': 'Bíceps',
    'cardio': 'Cardio',
    'core': 'Core',
    'cuadriceps': 'Cuádriceps',
    'espalda': 'Espalda',
    'espalda alta': 'Espalda Alta',
    'femorales': 'Femorales',
    'gluteos': 'Glúteos',
    'hombros': 'Hombros',
    'levator-scapulae': 'Elevador Escápula',
    'pantorrillas': 'Pantorrillas',
    'pectorals': 'Pecho',
    'serratus-anterior': 'Serrato Anterior',
    'spine': 'Columna',
    'trapecios': 'Trapecios',
    'triceps': 'Tríceps'
  },
  muscleLabel(key) {
    return this.MUSCLE_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);
  },
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

        ${this.renderBodyWeightWidget(user)}

        <div style="display:flex; gap:12px; margin-bottom:12px;">
          <button class="home-start-btn" style="flex:1; margin-bottom:0;" onclick="App.startEmptyWorkout()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Libre
          </button>
          <button class="home-start-btn" style="flex:1; margin-bottom:0; background: linear-gradient(135deg, #A78BFA, var(--color-accent)); color:#000; border:none;" onclick="AICoach.startAiWorkout()">
            <span style="font-size:1.2rem">🧠</span> AI Coach
          </button>
        </div>
        ${this.renderCompetitionWidget()}
        ${this.renderQuickActions(routines)}
        

        ${this.renderActiveProgram()}

        ${this.renderWeeklyChallenges()}

        ${this.renderFatigueWidget()}

        ${this.renderWeekSummary(comparison, user, weekWorkouts)}

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

  renderWeekSummary(c, user, weekWorkouts) {
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

  renderWeeklyChallenges() {
    // Ensure challenges exist
    if (typeof window.Gamification === 'undefined') return '';
    const challenges = window.Gamification.ensureWeeklyChallenges();
    if (!challenges || challenges.length === 0) return '';
    
    const completed = challenges.filter(c => c.completed).length;
    
    return `
      <div class="weekly-challenges" style="margin-bottom:var(--space-6)">
        <div class="home-section-title">
          <span>🎯 Retos Semanales</span>
          <span style="font-size:0.7rem;color:var(--color-text-tertiary)">${completed}/${challenges.length}</span>
        </div>
        ${challenges.map((c, i) => {
          const pct = c.completed ? 100 : Math.min(99, Math.round((c.current / c.target) * 100));
          return `
            <div class="challenge-card ${c.completed ? 'completed' : ''}" style="animation-delay:${i * 80}ms">
              <div style="display:flex;align-items:center;gap:var(--space-3);flex:1;min-width:0">
                <div style="font-size:1.3rem">${c.completed ? '✅' : c.icon}</div>
                <div style="flex:1;min-width:0">
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:var(--space-2)">
                    <span style="font-size:0.8rem;font-weight:var(--font-weight-semibold)">${c.title}</span>
                    <span style="font-size:0.65rem;color:${c.completed ? 'var(--color-success)' : 'var(--color-text-tertiary)'};white-space:nowrap">${c.completed ? '¡Hecho!' : `${c.current}/${c.target}`}</span>
                  </div>
                  <div style="font-size:0.65rem;color:var(--color-text-tertiary);margin-top:2px">${c.desc}</div>
                  <div class="challenge-bar-track">
                    <div class="challenge-bar-fill ${c.completed ? 'done' : ''}" style="width:${pct}%"></div>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  renderBodyWeightWidget(user) {
    const bwData = user.bodyWeight || [];
    if (!bwData.length) {
      return `
        <div class="bw-mini-widget" onclick="App.navigate('profile')" style="background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:12px;padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:all var(--transition-fast)">
          <div style="width:36px;height:36px;border-radius:50%;background:var(--color-accent-dim);display:flex;align-items:center;justify-content:center;font-size:1.1rem">⚖️</div>
          <div style="flex:1">
            <div style="font-size:0.75rem;color:var(--color-text-tertiary)">Peso Corporal</div>
            <div style="font-size:0.85rem;color:var(--color-text-secondary)">Toca para registrar tu primer peso</div>
          </div>
          <div style="font-size:0.7rem;color:var(--color-accent)">+</div>
        </div>`;
    }
    
    const last = bwData[bwData.length - 1];
    const prev = bwData.length >= 2 ? bwData[bwData.length - 2] : null;
    const diff = prev ? (last.weight - prev.weight) : 0;
    const diffStr = diff > 0 ? `+${diff.toFixed(1)}` : diff < 0 ? diff.toFixed(1) : '—';
    const diffColor = diff > 0 ? 'var(--color-warning)' : diff < 0 ? 'var(--color-success)' : 'var(--color-text-tertiary)';
    
    // Mini sparkline SVG
    let sparklineSvg = '';
    if (bwData.length >= 3) {
      const recent = bwData.slice(-7);
      const weights = recent.map(d => d.weight);
      const minW = Math.min(...weights) * 0.995;
      const maxW = Math.max(...weights) * 1.005;
      const range = maxW - minW || 1;
      const sw = 80, sh = 28;
      const pts = recent.map((d, i) => `${((i / (recent.length - 1)) * sw).toFixed(0)},${(sh - ((d.weight - minW) / range) * sh).toFixed(0)}`).join(' ');
      const trendColor = weights[weights.length - 1] > weights[0] ? '#FB923C' : '#22C55E';
      sparklineSvg = `<svg width="${sw}" height="${sh}" style="flex-shrink:0"><polyline points="${pts}" fill="none" stroke="${trendColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }
    
    return `
      <div class="bw-mini-widget" onclick="App.navigate('profile')" style="background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:12px;padding:10px 16px;margin-bottom:12px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:all var(--transition-fast)">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--color-accent-dim);display:flex;align-items:center;justify-content:center;font-size:1.1rem">⚖️</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:0.7rem;color:var(--color-text-tertiary)">Peso Corporal</div>
          <div style="display:flex;align-items:baseline;gap:6px">
            <span style="font-size:1.25rem;font-weight:700;color:var(--color-text)">${last.weight}</span>
            <span style="font-size:0.75rem;color:var(--color-text-secondary)">kg</span>
            <span style="font-size:0.7rem;font-weight:600;color:${diffColor}">${diffStr}</span>
          </div>
        </div>
        ${sparklineSvg}
        <div style="font-size:0.7rem;color:var(--color-text-tertiary)">${bwData.length} reg.</div>
      </div>`;
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
        
        Modal.show(html, { title: `📊 ${monthName}` });
      }, 2000);
    }, 3000);
  },

  renderFatigueWidget() {
    if (typeof window.AICoach === 'undefined') return '';
    const fatigue = window.AICoach.getMuscleFatigue();
    if (!Object.keys(fatigue).length) return '';

    const getFatigueColor = (pct) => {
      if (!pct || pct === 0) return 'rgba(255,255,255,0.05)';
      let r, g, b;
      if (pct <= 33) {
        r = Math.round(34 + (pct / 33) * 187);
        g = Math.round(197 - (pct / 33) * 17);
        b = Math.round(94 - (pct / 33) * 60);
      } else if (pct <= 66) {
        const t = (pct - 33) / 33;
        r = Math.round(221 + t * 34);
        g = Math.round(180 - t * 92);
        b = Math.round(34 - t * 34);
      } else {
        const t = (pct - 66) / 34;
        r = 255;
        g = Math.round(88 - t * 68);
        b = Math.round(t * 10);
      }
      return `rgba(${r},${g},${b},${0.3 + (pct / 100) * 0.6})`;
    };

    const mf = (name) => {
      const pct = fatigue[name] || 0;
      return pct > 0 ? getFatigueColor(pct) : 'rgba(255,255,255,0.04)';
    };

    // Interactive muscle region
    const me = (d, name, extra) => {
      const pct = fatigue[name] || 0;
      const glow = pct > 60 ? ' filter="url(#glow-f)"' : '';
      return '<path d="' + d + '" fill="' + mf(name) + '" stroke="rgba(255,255,255,' + (pct > 0 ? 0.25 : 0.1) + ')" stroke-width="0.5" stroke-linejoin="round" style="cursor:pointer;transition:all 0.3s" onmouseover="this.style.opacity=0.8;this.style.strokeWidth=1" onmouseout="this.style.opacity=1;this.style.strokeWidth=0.5" onclick="HomeScreen.showMuscleDetail(\'' + name + '\')" ' + (extra || '') + glow + '/>';
    };

    // Non-interactive detail line (muscle separation)
    const nd = (d) => '<path d="' + d + '" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="0.4" stroke-linecap="round" stroke-linejoin="round"/>';

    // Body outline
    const bo = (d) => '<path d="' + d + '" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round"/>';

    // Inner body fill (light gray like reference)
    const bf = (d) => '<path d="' + d + '" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" stroke-width="0.6" stroke-linejoin="round"/>';

    // --- FRONT VIEW ---
    const svgDefs = '<defs>'
      + '<filter id="glow-f"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      + '</defs>';

    // Complete body silhouette (front)
    const bodyFront = 'M70,6 C76,6 82,10 84,18 C86,26 84,36 80,40 L84,44 C94,46 102,52 106,62 L110,82 C112,92 110,100 106,106 L96,118 L92,136 L86,144 L80,148 L84,168 C86,190 88,210 86,228 L84,248 C84,254 80,258 76,258 L72,258 L68,258 L64,258 C60,258 56,254 56,248 L54,228 C52,210 54,190 56,168 L60,148 L54,144 L48,136 L44,118 L34,106 C30,100 28,92 30,82 L34,62 C38,52 46,46 56,44 L60,40 C56,36 54,26 56,18 C58,10 64,6 70,6 Z';

    // Head (front)
    const headFront = 'M70,6 C77,6 83,12 83,22 C83,32 77,40 70,40 C63,40 57,32 57,22 C57,12 63,6 70,6 Z';

    // --- FRONT MUSCLES ---
    // Trapezius (neck/upper shoulders)
    const trapsFront = me('M58,36 L70,34 L82,36 L86,42 L84,48 L70,46 L56,48 L54,42 Z', 'trapecios');

    // Shoulders (deltoids) - rounded caps
    const shouldersFrontL = me('M44,44 C38,42 32,46 28,54 C26,60 28,66 32,70 L40,68 L48,60 L52,50 L48,44 Z', 'hombros');
    const shouldersFrontR = me('M96,44 C102,42 108,46 112,54 C114,60 112,66 108,70 L100,68 L92,60 L88,50 L92,44 Z', 'hombros');

    // Pectorals - with defined shape
    const pecsL = me('M54,48 C54,46 58,44 66,44 L70,44 L70,50 L70,72 C70,76 66,78 60,76 L54,72 L52,60 Z', 'pectorals');
    const pecsR = me('M86,48 C86,46 82,44 74,44 L70,44 L70,50 L70,72 C70,76 74,78 80,76 L86,72 L88,60 Z', 'pectorals');

    // Pec detail lines
    const pecDetail = nd('M70,48 L70,74') + nd('M56,52 C60,56 66,58 70,58') + nd('M84,52 C80,56 74,58 70,58');

    // Serratus anterior - side ribcage
    const serrL = me('M42,64 C40,68 38,74 40,80 L44,78 L46,70 L44,64 Z', 'serratus-anterior');
    const serrR = me('M98,64 C100,68 102,74 100,80 L96,78 L94,70 L96,64 Z', 'serratus-anterior');

    // Biceps
    const bicepsL = me('M32,68 C28,72 26,78 26,86 C26,92 28,98 32,100 L38,98 L42,90 L42,78 L40,70 Z', 'biceps');
    const bicepsR = me('M108,68 C112,72 114,78 114,86 C114,92 112,98 108,100 L102,98 L98,90 L98,78 L100,70 Z', 'biceps');

    // Core / Abs - 6-pack style
    const core = me('M58,74 L82,74 L82,80 L70,82 L58,80 Z'
      + ' M60,84 L70,82 L80,84 L80,100 L70,102 L60,100 Z'
      + ' M60,104 L70,102 L80,104 L80,120 L70,122 L60,120 Z'
      + ' M58,124 L70,122 L82,124 L80,138 L60,138 Z', 'core');

    // Core detail lines (ab separations)
    const coreDetail = nd('M70,82 L70,138') + nd('M60,88 L60,118') + nd('M80,88 L80,118') + nd('M60,96 L80,96') + nd('M60,112 L80,112');

    // Obliques
    const obliquesL = nd('M56,100 L52,120 L54,136') + nd('M84,100 L88,120 L86,136');

    // Forearms
    const forearmL = me('M22,102 C18,106 16,114 16,122 C16,128 18,134 22,136 L28,134 L32,126 L32,112 L30,104 Z', 'antebrazos');
    const forearmR = me('M118,102 C122,106 124,114 124,122 C124,128 122,134 118,136 L112,134 L108,126 L108,112 L110,104 Z', 'antebrazos');

    // Hands (non-interactive)
    const handL = '<path d="M16,136 C12,140 10,144 12,146 L20,144 L24,136 Z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>';
    const handR = '<path d="M124,136 C128,140 130,144 128,146 L120,144 L116,136 Z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>';

    // Abductors (outer hip)
    const abdL = me('M54,138 L62,136 L64,148 L62,152 L54,152 L52,148 Z', 'abductores');
    const abdR = me('M86,138 L78,136 L76,148 L78,152 L86,152 L88,148 Z', 'abductores');

    // Adductors (inner thigh)
    const addL = me('M62,152 L68,152 L66,198 L62,198 Z', 'adductors');
    const addR = me('M78,152 L72,152 L74,198 L78,198 Z', 'adductors');

    // Quadriceps - with separation lines
    const quadL = me('M54,152 C52,158 48,172 46,190 C44,206 46,218 48,226 L56,226 C58,218 60,206 60,190 C60,172 58,158 56,152 Z', 'cuadriceps');
    const quadR = me('M86,152 C88,158 92,172 94,190 C96,206 94,218 92,226 L84,226 C82,218 80,206 80,190 C80,172 82,158 84,152 Z', 'cuadriceps');

    // Quad detail lines
    const quadDetail = nd('M52,160 L50,200') + nd('M88,160 L90,200') + nd('M58,164 L56,210') + nd('M82,164 L84,210');

    // Knees (non-interactive)
    const kneeL = '<path d="M48,226 C46,230 46,236 48,238 L58,238 L58,230 Z" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="0.4"/>';
    const kneeR = '<path d="M92,226 C94,230 94,236 92,238 L82,238 L82,230 Z" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="0.4"/>';

    // Calves (front)
    const calfL = me('M48,238 C46,242 46,248 48,252 L58,252 L58,242 Z', 'pantorrillas');
    const calfR = me('M92,238 C94,242 94,248 92,252 L82,252 L82,242 Z', 'pantorrillas');

    // Feet (non-interactive)
    const footL = '<path d="M48,252 C46,254 44,258 48,260 L58,260 L60,252 Z" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="0.4"/>';
    const footR = '<path d="M92,252 C94,254 96,258 92,260 L82,260 L80,252 Z" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="0.4"/>';

    const frontView = '<svg viewBox="0 0 140 260" width="110" height="200" style="display:block">'
      + svgDefs
      + bf(bodyFront)
      + bo(bodyFront)
      + nd(headFront)
      + trapsFront
      + shouldersFrontL + shouldersFrontR
      + pecsL + pecsR + pecDetail
      + serrL + serrR
      + bicepsL + bicepsR
      + core + coreDetail + obliquesL
      + forearmL + forearmR + handL + handR
      + abdL + abdR + addL + addR
      + quadL + quadR + quadDetail
      + kneeL + kneeR
      + calfL + calfR
      + footL + footR
      + '</svg>';

    // --- BACK VIEW ---
    const svgDefsB = '<defs>'
      + '<filter id="glow-b"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
      + '</defs>';

    // Same body silhouette for back
    const meB = (d, name, extra) => {
      const pct = fatigue[name] || 0;
      const glow = pct > 60 ? ' filter="url(#glow-b)"' : '';
      return '<path d="' + d + '" fill="' + mf(name) + '" stroke="rgba(255,255,255,' + (pct > 0 ? 0.25 : 0.1) + ')" stroke-width="0.5" stroke-linejoin="round" style="cursor:pointer;transition:all 0.3s" onmouseover="this.style.opacity=0.8;this.style.strokeWidth=1" onmouseout="this.style.opacity=1;this.style.strokeWidth=0.5" onclick="HomeScreen.showMuscleDetail(\'' + name + '\')" ' + (extra || '') + glow + '/>';
    };

    const ndB = (d) => '<path d="' + d + '" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="0.4" stroke-linecap="round"/>';

    // Traps (back) - diamond/trapezoid shape
    const trapsBk = meB('M58,34 L70,32 L82,34 L86,44 L84,54 L70,56 L56,54 L54,44 Z', 'trapecios');

    // Levator scapulae - upper neck
    const levL = meB('M56,28 C54,30 52,34 52,38 L56,36 L58,30 Z', 'levator-scapulae');
    const levR = meB('M84,28 C86,30 88,34 88,38 L84,36 L82,30 Z', 'levator-scapulae');

    // Shoulders (back delts)
    const shdBkL = meB('M44,46 C38,44 32,48 28,56 C26,62 28,68 32,72 L40,70 L48,62 L52,52 L48,46 Z', 'hombros');
    const shdBkR = meB('M96,46 C102,44 108,48 112,56 C114,62 112,68 108,72 L100,70 L92,62 L88,52 L92,46 Z', 'hombros');

    // Upper back (lats/rhomboids) - large area
    const espalda = meB('M52,56 C50,58 48,64 48,72 L48,90 C48,94 56,98 64,98 L70,100 L76,98 C84,94 92,90 92,72 L92,64 C90,58 88,56 86,56 L70,58 Z', 'espalda');

    // Back detail lines (spine, scapula outlines)
    const backDetail = ndB('M70,56 L70,136')
      + ndB('M56,62 C58,70 62,78 66,82')
      + ndB('M84,62 C82,70 78,78 74,82')
      + ndB('M56,80 C60,86 66,90 70,92')
      + ndB('M84,80 C80,86 74,90 70,92');

    // Triceps
    const triL = meB('M32,70 C28,74 26,80 26,88 C26,94 28,100 32,102 L38,100 L42,92 L42,80 L40,72 Z', 'triceps');
    const triR = meB('M108,70 C112,74 114,80 114,88 C114,94 112,100 108,102 L102,100 L98,92 L98,80 L100,72 Z', 'triceps');

    // Spine erectors (detail)
    const spineDetail = ndB('M64,96 L64,132') + ndB('M76,96 L76,132');

    // Glutes
    const gluteL = meB('M52,100 C50,104 48,110 48,116 C48,122 50,126 54,128 L68,126 L70,102 Z', 'gluteos');
    const gluteR = meB('M88,100 C90,104 92,110 92,116 C92,122 90,126 86,128 L72,126 L70,102 Z', 'gluteos');

    // Glute detail
    const gluteDetail = ndB('M70,102 L70,126') + ndB('M56,110 C60,114 66,116 70,116') + ndB('M84,110 C80,114 74,116 70,116');

    // Forearms (back)
    const forearmBkL = meB('M22,104 C18,108 16,116 16,124 C16,130 18,136 22,138 L28,136 L32,128 L32,114 L30,106 Z', 'antebrazos');
    const forearmBkR = meB('M118,104 C122,108 124,116 124,124 C124,130 122,136 118,138 L112,136 L108,128 L108,114 L110,106 Z', 'antebrazos');

    // Hands (back)
    const handBkL = '<path d="M16,138 C12,142 10,146 12,148 L20,146 L24,138 Z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>';
    const handBkR = '<path d="M124,138 C128,142 130,146 128,148 L120,146 L116,138 Z" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>';

    // Hamstrings (femorales)
    const femL = meB('M52,128 C50,136 48,152 46,170 C44,188 46,206 48,222 L56,222 C58,210 60,196 60,180 C60,160 58,144 56,132 Z', 'femorales');
    const femR = meB('M88,128 C90,136 92,152 94,170 C96,188 94,206 92,222 L84,222 C82,210 80,196 80,180 C80,160 82,144 84,132 Z', 'femorales');

    // Hamstring detail
    const femDetail = ndB('M54,140 L52,190') + ndB('M86,140 L88,190');

    // Calves (back - gastrocnemius)
    const calfBkL = meB('M48,226 C44,232 42,238 44,244 C46,248 50,250 54,248 C58,244 58,238 56,228 Z', 'pantorrillas');
    const calfBkR = meB('M92,226 C96,232 98,238 96,244 C94,248 90,250 86,248 C82,244 82,238 84,228 Z', 'pantorrillas');

    // Calf detail
    const calfDetail = ndB('M50,234 L50,246') + ndB('M90,234 L90,246');

    // Feet (back)
    const footBkL = '<path d="M48,250 C46,252 44,256 46,260 L56,260 L58,250 Z" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="0.4"/>';
    const footBkR = '<path d="M92,250 C94,252 96,256 94,260 L84,260 L82,250 Z" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="0.4"/>';

    const backView = '<svg viewBox="0 0 140 260" width="110" height="200" style="display:block">'
      + svgDefsB
      + bf(bodyFront)
      + bo(bodyFront)
      + ndB(headFront)
      + trapsBk
      + levL + levR
      + shdBkL + shdBkR
      + espalda + backDetail
      + triL + triR
      + spineDetail
      + gluteL + gluteR + gluteDetail
      + forearmBkL + forearmBkR + handBkL + handBkR
      + femL + femR + femDetail
      + calfBkL + calfBkR + calfDetail
      + footBkL + footBkR
      + '</svg>';

    const highFatigue = Object.entries(fatigue).filter(([,v]) => v > 50).sort((a,b) => b[1]-a[1]);
    const pills = highFatigue.length
      ? '<div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin-top:6px">'
          + highFatigue.map(([n, p]) => '<span style="font-size:0.65rem;padding:3px 10px;border-radius:10px;background:' + getFatigueColor(p) + ';color:var(--color-text);cursor:pointer;font-weight:500" onclick="HomeScreen.showMuscleDetail(\'' + n + '\')">' + HomeScreen.muscleLabel(n) + ' ' + p + '%</span>').join('')
          + '</div>'
      : '';

    return '\n      <div class="fatigue-widget" style="background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:16px;padding:16px;margin-bottom:16px">\n'
      + '        <div class="home-section-title" style="margin-bottom:10px">\n'
      + '          <span>\u{1FAC0} Mapa de Fatiga (72h)</span>\n'
      + '          <span style="font-size:0.6rem;color:var(--color-text-tertiary)">Toca un m\u00FAsculo para ver detalles</span>\n'
      + '        </div>\n'
      + '        <div style="display:flex;gap:16px;justify-content:center;align-items:flex-start">\n'
      + '          <div style="text-align:center">\n'
      + '            ' + frontView + '\n'
      + '            <div style="font-size:0.6rem;color:var(--color-text-tertiary);margin-top:4px;font-weight:500">Frontal</div>\n'
      + '          </div>\n'
      + '          <div style="text-align:center">\n'
      + '            ' + backView + '\n'
      + '            <div style="font-size:0.6rem;color:var(--color-text-tertiary);margin-top:4px;font-weight:500">Posterior</div>\n'
      + '          </div>\n'
      + '        </div>\n'
      + '        <div style="margin:10px auto 6px;max-width:220px">\n'
      + '          <div style="height:6px;border-radius:3px;background:linear-gradient(to right, rgba(34,197,94,0.6), rgba(250,204,21,0.6), rgba(239,68,68,0.7));"></div>\n'
      + '          <div style="display:flex;justify-content:space-between;font-size:0.55rem;color:var(--color-text-tertiary);margin-top:2px">\n'
      + '            <span>\u{1F7E2} Recuperado</span>\n'
      + '            <span>\u{1F7E1} Moderado</span>\n'
      + '            <span>\u{1F534} Alto</span>\n'
      + '          </div>\n'
      + '        </div>\n'
      + pills + '\n'
      + '        <div style="font-size:0.55rem;color:var(--color-text-tertiary);margin-top:8px;text-align:center;opacity:0.7">Basado en volumen de los \u00FAltimos 3 d\u00EDas</div>\n'
      + '      </div>';
  },

  showMuscleDetail(muscleName) {
    if (typeof window.AICoach === 'undefined') return;
    const fatigue = window.AICoach.getMuscleFatigue();
    const pct = fatigue[muscleName] || 0;
    const exercises = window.AICoach.getMuscleExercises(muscleName);
    const user = Storage.getUser();

    const getColor = (p) => {
      if (p <= 30) return '#22C55E';
      if (p <= 60) return '#FBBF24';
      return '#EF4444';
    };
    const color = getColor(pct);
    const levelLabel = pct <= 30 ? '\u{1F7E2} Recuperado' : pct <= 60 ? '\u{1F7E1} Moderado' : '\u{1F534} Alta Fatiga';

    const byWorkout = {};
    exercises.forEach(ex => {
      const key = ex.workoutName + '|' + ex.date;
      if (!byWorkout[key]) byWorkout[key] = { name: ex.workoutName, date: ex.date, items: [] };
      byWorkout[key].items.push(ex);
    });

    const formatTime = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      const diff = Math.floor((Date.now() - d) / (1000 * 60 * 60));
      if (diff < 1) return 'hace minutos';
      if (diff < 24) return 'hace ' + diff + 'h';
      return 'hace ' + Math.floor(diff / 24) + 'd';
    };

    let html = '<div style="text-align:center;margin-bottom:16px">'
      + '<div style="width:64px;height:64px;border-radius:50%;background:' + color + '22;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;border:2px solid ' + color + '">'
      + '<span style="font-size:1.5rem;font-weight:bold;color:' + color + '">' + pct + '%</span></div>'
      + '<h3 style="font-size:1.1rem;font-weight:700;margin-bottom:2px">' + HomeScreen.muscleLabel(muscleName) + '</h3>'
      + '<div style="font-size:0.8rem;color:' + color + '">' + levelLabel + '</div></div>';

    if (exercises.length) {
      html += '<div style="max-height:300px;overflow-y:auto">';
      Object.values(byWorkout).forEach(group => {
        html += '<div style="margin-bottom:12px">'
          + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid var(--color-border)">'
          + '<span style="font-size:0.8rem;font-weight:600;color:var(--color-text)">' + group.name + '</span>'
          + '<span style="font-size:0.65rem;color:var(--color-text-tertiary)">' + formatTime(group.date) + '</span></div>';
        group.items.forEach(ex => {
          html += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0">'
            + '<div style="width:6px;height:6px;border-radius:50%;background:' + (ex.role === 'primary' ? color : 'var(--color-text-tertiary)') + ';flex-shrink:0"></div>'
            + '<div style="flex:1;min-width:0">'
            + '<div style="font-size:0.8rem;font-weight:500;color:var(--color-text)">' + ex.name + '</div>'
            + '<div style="font-size:0.65rem;color:var(--color-text-tertiary)">' + ex.sets + '/' + ex.totalSets + ' series \u00B7 ' + HomeScreen.formatVolume(ex.volume, user.units) + ' \u00B7 ' + (ex.role === 'primary' ? 'M\u00FAsculo principal' : 'M\u00FAsculo secundario (40%)') + '</div>'
            + '</div></div>';
        });
        html += '</div>';
      });
      html += '</div>';
    } else {
      html += '<div style="text-align:center;padding:20px;color:var(--color-text-secondary)">'
        + '<div style="font-size:2rem;margin-bottom:8px">\u{1F4AA}</div>'
        + '<p style="font-size:0.85rem">No hay ejercicios recientes para este m\u00FAsculo</p>'
        + '<p style="font-size:0.7rem;color:var(--color-text-tertiary)">Los datos aparecer\u00E1n despu\u00E9s de tu pr\u00F3ximo entrenamiento</p></div>';
    }

    html += '<div style="font-size:0.65rem;color:var(--color-text-tertiary);text-align:center;margin-top:8px">Ventana: \u00FAltimos 3 d\u00EDas \u00B7 La fatiga decae con el tiempo</div>';

    Modal.show(html, { title: '\u{1FAC0} ' + HomeScreen.muscleLabel(muscleName) });
    if (navigator.vibrate) navigator.vibrate(10);
  },

  renderActiveProgram() {
    const program = Storage.getActiveProgram();
    if (!program) return '';
    const next = Storage.getNextProgramWorkout(program);
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const weekPct = Math.min((program.currentWeek / program.weeks) * 100, 100);
    const adherence = Storage.getProgramAdherence(program);
    const missed = Storage.getMissedWorkouts().filter(m => m.programId === program.id && !m.rescheduled && !m.skipped);
    const isRestDay = Storage.isRestDay();
    
    let nextLabel = '';
    if (next) {
      if (program.mode === 'rotation') {
        nextLabel = next.isToday ? '🎯 Hoy: ' : `⏳ Siguiente: `;
      } else {
        nextLabel = next.isToday ? '🎯 Hoy: ' : `⏳ Próximo (${dayNames[next.slot.day]}): `;
      }
    }

    const rotationDayLabel = (program.mode === 'rotation' && next) ? `Día ${next.rotationIndex + 1} de ${next.totalRotations}` : '';

    // Adherence badge color
    const adhColor = adherence.percentage >= 80 ? 'var(--color-success)' : adherence.percentage >= 50 ? 'var(--color-warning)' : 'var(--color-danger)';

    // Missed workout reschedule prompt
    let missedHtml = '';
    if (missed.length > 0) {
      const m = missed[0];
      missedHtml = `
        <div style="background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.3);border-radius:8px;padding:10px 12px;margin-top:8px;font-size:0.8rem">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="color:var(--color-warning)">⚠️ Perdiste: ${m.routineName}</span>
            <div style="display:flex;gap:4px">
              <button class="btn btn-primary btn-sm" style="font-size:0.7rem;padding:4px 8px" onclick="HomeScreen.rescheduleMissed(0)">Reprogramar</button>
              <button class="btn btn-ghost btn-sm" style="font-size:0.7rem;padding:4px 8px" onclick="HomeScreen.skipMissed(0)">Omitir</button>
            </div>
          </div>
        </div>`;
    }

    // Smart rest day content
    let restDayHtml = '';
    if (isRestDay) {
      restDayHtml = `
        <div style="background:rgba(96,165,250,0.08);border:1px solid rgba(96,165,250,0.2);border-radius:8px;padding:10px 12px;margin-top:8px;font-size:0.75rem;color:var(--color-text-secondary)">
          <div style="font-weight:600;color:var(--color-info);margin-bottom:4px">😴 Día de Recuperación Activa</div>
          <div>Tus músculos se están reparando. Tips para hoy:</div>
          <ul style="margin:4px 0 0 16px;padding:0;font-size:0.7rem">
            <li>Estiramientos suaves 15-20 min</li>
            <li>Caminata ligera 30 min</li>
            <li>Hidratación y sueño de calidad</li>
          </ul>
        </div>`;
    }

    return `
      <div class="program-card active-program" style="margin-top:12px">
        <div class="program-card-header">
          <div class="program-card-name" style="display:flex;align-items:center;gap:8px"><div style="width:16px;height:16px">${Icons.calendar}</div> ${program.name}</div>
          <span class="program-week-badge">${program.mode === 'rotation' ? 'Rotación' : `Semana ${program.currentWeek}/${program.weeks}`}</span>
        </div>
        <div class="program-progress-bar"><div class="program-progress-fill" style="width:${weekPct}%"></div></div>
        
        <!-- P1-6: Adherence Widget -->
        <div style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:0.7rem">
          <div style="background:${adhColor}22;color:${adhColor};padding:3px 8px;border-radius:10px;font-weight:600">📋 ${adherence.percentage}% adherencia</div>
          <div style="color:var(--color-text-tertiary)">${adherence.completed} completados · ${adherence.missed} perdidos</div>
        </div>

        ${restDayHtml}
        ${missedHtml}

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
  },

  rescheduleMissed(idx) {
    const item = Storage.rescheduleMissed(idx);
    if (item) {
      Toast.show(`🔄 Reprogramado: ${item.routineName}`, 'success');
      this.render();
    }
  },
  skipMissed(idx) {
    Storage.skipMissed(idx);
    Toast.show('Entrenamiento omitido', 'info');
    this.render();
  },

  renderCompetitionWidget() {
    const comps = Storage.getCompetitions();
    if (!comps.length) {
      return `
        <div style="background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:12px;padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:all var(--transition-fast)" onclick="App.navigateToCompetition()">
          <div style="width:36px;height:36px;border-radius:50%;background:rgba(251,191,36,0.1);display:flex;align-items:center;justify-content:center;font-size:1.1rem">🏆</div>
          <div style="flex:1">
            <div style="font-size:0.75rem;color:var(--color-text-tertiary)">Competencia</div>
            <div style="font-size:0.85rem;color:var(--color-text-secondary)">¡Desafía a tus amigos!</div>
          </div>
          <div style="font-size:0.7rem;color:var(--color-accent)">Crear →</div>
        </div>`;
    }
    const comp = comps[0];
    const leaderboard = Storage.getCompetitionLeaderboard(comp.id, 7);
    const user = Storage.getUser();
    const myRank = leaderboard.findIndex(l => l.userId === user.cloudId) + 1;
    const topUser = leaderboard[0];
    return `
      <div style="background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:12px;padding:12px 16px;margin-bottom:12px;cursor:pointer;transition:all var(--transition-fast)" onclick="App.navigateToCompetition()">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:36px;height:36px;border-radius:50%;background:rgba(251,191,36,0.1);display:flex;align-items:center;justify-content:center;font-size:1.1rem">🏆</div>
          <div style="flex:1">
            <div style="font-size:0.75rem;font-weight:600;color:var(--color-text)">${comp.name}</div>
            <div style="font-size:0.65rem;color:var(--color-text-secondary)">${comp.members?.length || 0} miembros${myRank > 0 ? ` · Tu rank: #${myRank}` : ''}</div>
          </div>
          ${topUser ? `<div style="text-align:right">
            <div style="font-size:0.65rem;color:var(--color-text-tertiary)">Líder</div>
            <div style="font-size:0.75rem;font-weight:600;color:var(--color-accent)">${topUser.name || '???'}</div>
          </div>` : ''}
          <div style="font-size:1rem;color:var(--color-text-tertiary)">→</div>
        </div>
      </div>`;
  }
};
