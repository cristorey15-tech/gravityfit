// ============================================
// GravityFit — Home Screen
// ============================================

import { Storage } from '../storage.js';
import { Icons, Toast, Modal, escapeHtml } from '../components.js';
import { Calories } from '../calories.js';
import { renderBodyMap, fatigueColor, normalizeFatigue } from '../body-map.js';
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
          <h1>${greeting}, ${escapeHtml(user.name)}</h1>
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

        ${(() => {
          const kc = Calories.getTotalCalories(weekWorkouts, user);
          const steps = weekWorkouts.reduce((s, w) => s + (w.steps || 0), 0);
          return (kc > 0 || steps > 0) ? `
        <div class="card" style="display:flex;align-items:center;gap:12px;padding:12px 16px;margin-bottom:12px">
          <span style="font-size:1.4rem">🔥</span>
          <div style="flex:1">
            <div style="font-size:0.9375rem;font-weight:700">${kc.toLocaleString('es-ES')} kcal${steps > 0 ? ` · 👣 ${steps.toLocaleString('es-ES')} pasos` : ''}</div>
            <div style="font-size:0.7rem;color:var(--color-text-secondary)">Quemadas esta semana (estimado + sensor)</div>
          </div>
        </div>` : '';
        })()}

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
        ${this.renderCoachInsights()}
        ${this.renderNutritionWidget()}
        ${this.renderCompetitionWidget()}
        ${this.renderQuickActions(routines)}
        

        ${this.renderWeekPlanToday()}
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
              <h4 style="font-weight:600;font-size:0.9375rem">${escapeHtml(lastWorkout.name || 'Entrenamiento')}</h4>
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
                <h4>${escapeHtml(r.name)}</h4>
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
            🔄 ${escapeHtml(lastRoutine.name)}
          </button>`;
      }
    }
    
    // Active program quick start
    if (program) {
      const next = Storage.getNextProgramWorkout(program);
      if (next && next.routine && next.routine.id !== 'rest' && next.isToday) {
        html += `
          <button class="chip active" onclick="App.startRoutineWorkout('${next.routine.id}')">
            📅 ${escapeHtml(next.routine.name)}
          </button>`;
      }
    }
    
    // Favorite routine quick starts (top 3)
    const favRoutines = routines.filter(r => r.isFavorite).slice(0, 3);
    favRoutines.forEach(r => {
      html += `
        <button class="chip" onclick="App.startRoutineWorkout('${r.id}')">
          ⭐ ${escapeHtml(r.name)}
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
            <div style="color:var(--color-text-secondary);font-size:0.85rem;margin-bottom:20px">¡Impresionante, ${escapeHtml(user.name)}!</div>
            
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
              <div style="font-weight:bold;font-size:0.9rem">${escapeHtml(bestW.name)}</div>
              <div style="font-size:0.8rem;color:var(--color-accent)">${HomeScreen.formatVolume(Storage.getTotalVolume(bestW), user.units)} · ${HomeScreen.formatDuration(bestW.duration)}</div>
              <div style="font-size:0.7rem;color:var(--color-text-tertiary);margin-top:4px">${escapeHtml(bestExData.map(e => e?.name || '').filter(Boolean).join(', '))}</div>
            </div>` : ''}
            
            <button class="btn btn-primary btn-block" onclick="Modal.hide()">🔥 ¡A por el siguiente mes!</button>
          </div>`;
        
        Modal.show(html, { title: `📊 ${monthName}` });
      }, 2000);
    }, 3000);
  },

  renderCoachInsights() {
    if (typeof window.AICoach === 'undefined') return '';
    let insights;
    try { insights = window.AICoach.getCoachInsights(); } catch { return ''; }
    if (!insights || !insights.length) return '';

    const sevColor = {
      alert: 'var(--color-danger)',
      warn: 'var(--color-warning)',
      good: 'var(--color-accent)',
      info: 'var(--color-info)',
    };
    const rows = insights.slice(0, 3).map(ins => `
      <div style="display:flex;gap:10px;align-items:flex-start;padding:7px 0">
        <span style="font-size:1.1rem;line-height:1.2">${ins.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:0.8rem;font-weight:600;color:${sevColor[ins.severity] || 'var(--color-text)'}">${escapeHtml(ins.title)}</div>
          <div style="font-size:0.72rem;color:var(--color-text-secondary);line-height:1.4">${escapeHtml(ins.detail)}</div>
        </div>
      </div>`).join('');

    return `
      <div class="coach-insights" style="background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:16px;padding:12px 16px;margin-bottom:16px">
        <div class="home-section-title" style="margin-bottom:2px">
          <span>🧠 Coach IA</span>
          <span style="font-size:0.6rem;color:var(--color-text-tertiary)">según tu RPE y fatiga</span>
        </div>
        ${rows}
        <div style="border-top:1px solid var(--color-border);margin-top:4px;padding-top:6px;text-align:right">
          <a onclick="AICoach.showRPEGuide()" style="font-size:0.65rem;color:var(--color-text-tertiary);cursor:pointer;text-decoration:underline">¿Qué es el RPE y por qué lo uso?</a>
        </div>
      </div>`;
  },

  renderNutritionWidget() {
    const key = window.Storage.todayKey();
    const day = window.Storage.getNutritionDay(key);
    const goals = window.Storage.getNutritionGoals();
    const kcal = day ? (day.kcal || 0) : 0;
    const protein = day ? (day.protein || 0) : 0;
    const pct = (v, g) => Math.min(100, Math.round((v / Math.max(1, g)) * 100));

    const bar = (value, goal, color) => {
      const p = pct(value, goal);
      return `<div style="height:5px;border-radius:3px;background:var(--color-bg-input);margin-top:4px;overflow:hidden">
        <div style="height:100%;width:${p}%;background:${color};transition:width 0.4s"></div>
      </div>`;
    };

    return `
      <div style="background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:16px;padding:12px 16px;margin-bottom:16px">
        <div class="home-section-title" style="margin-bottom:8px">
          <span>🍎 Nutrición de hoy</span>
          <span style="font-size:0.6rem;color:var(--color-text-tertiary);cursor:pointer" onclick="HomeScreen.showNutritionModal()">${day ? 'Editar' : 'Registrar'} ✏️</span>
        </div>
        <div style="display:flex;gap:16px">
          <div style="flex:1">
            <div style="font-size:0.85rem;font-weight:700">${kcal.toLocaleString('es-ES')} <span style="font-size:0.65rem;font-weight:500;color:var(--color-text-tertiary)">/ ${goals.kcal.toLocaleString('es-ES')} kcal</span></div>
            ${bar(kcal, goals.kcal, 'var(--color-warning)')}
          </div>
          <div style="flex:1">
            <div style="font-size:0.85rem;font-weight:700">${protein} <span style="font-size:0.65rem;font-weight:500;color:var(--color-text-tertiary)">/ ${goals.protein} g proteína</span></div>
            ${bar(protein, goals.protein, 'var(--color-success)')}
          </div>
        </div>
        ${!day ? `<div style="font-size:0.65rem;color:var(--color-text-tertiary);margin-top:6px">Toca “Registrar” para apuntar lo que has comido — el coach lo tiene en cuenta.</div>` : ''}
      </div>`;
  },

  showNutritionModal() {
    const key = window.Storage.todayKey();
    const day = window.Storage.getNutritionDay(key) || { kcal: '', protein: '' };
    const goals = window.Storage.getNutritionGoals();
    Modal.show(`
      <div style="display:flex;gap:10px;margin-bottom:12px">
        <div style="flex:1">
          <label style="font-size:0.75rem;color:var(--color-text-secondary)">Calorías de hoy (kcal)</label>
          <input id="nut-kcal" type="number" class="input" inputmode="numeric" value="${day.kcal ?? ''}" placeholder="2200" style="width:100%;margin-top:4px">
        </div>
        <div style="flex:1">
          <label style="font-size:0.75rem;color:var(--color-text-secondary)">Proteína (g)</label>
          <input id="nut-protein" type="number" class="input" inputmode="numeric" value="${day.protein ?? ''}" placeholder="140" style="width:100%;margin-top:4px">
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-bottom:14px;opacity:0.85">
        <div style="flex:1">
          <label style="font-size:0.75rem;color:var(--color-text-secondary)">Meta kcal</label>
          <input id="nut-goal-kcal" type="number" class="input" inputmode="numeric" value="${goals.kcal}" style="width:100%;margin-top:4px">
        </div>
        <div style="flex:1">
          <label style="font-size:0.75rem;color:var(--color-text-secondary)">Meta proteína (g)</label>
          <input id="nut-goal-protein" type="number" class="input" inputmode="numeric" value="${goals.protein}" style="width:100%;margin-top:4px">
        </div>
      </div>
      <div style="display:flex;gap:8px">
        ${day.kcal !== '' ? `<button class="btn btn-secondary flex-1" onclick="HomeScreen.clearNutrition()">Borrar</button>` : ''}
        <button class="btn btn-primary flex-1" onclick="HomeScreen.saveNutrition()">Guardar</button>
      </div>
    `, { title: '🍎 Nutrición de hoy' });
  },

  saveNutrition() {
    const kcal = Math.max(0, Number(document.getElementById('nut-kcal')?.value) || 0);
    const protein = Math.max(0, Number(document.getElementById('nut-protein')?.value) || 0);
    const goalKcal = Math.max(0, Number(document.getElementById('nut-goal-kcal')?.value) || 0);
    const goalProtein = Math.max(0, Number(document.getElementById('nut-goal-protein')?.value) || 0);
    if (goalKcal > 0 || goalProtein > 0) {
      window.Storage.setNutritionGoals({ kcal: goalKcal || undefined, protein: goalProtein || undefined });
    }
    if (kcal === 0 && protein === 0) {
      window.Storage.setNutritionDay(window.Storage.todayKey(), null); // no data = clean empty state
      Modal.hide();
      this.render();
      return;
    }
    window.Storage.setNutritionDay(window.Storage.todayKey(), { kcal, protein });
    Modal.hide();
    Toast.show('🍎 Nutrición registrada', 'success');
    this.render();
  },

  clearNutrition() {
    window.Storage.setNutritionDay(window.Storage.todayKey(), null);
    Modal.hide();
    Toast.show('Registro borrado', 'info');
    this.render();
  },

  renderFatigueWidget() {
    if (typeof window.AICoach === 'undefined') return '';
    const fatigue = normalizeFatigue(window.AICoach.getMuscleFatigue());
    const hasData = Object.keys(fatigue).length > 0;

    const map = renderBodyMap(fatigue, { onMuscleClick: 'HomeScreen.showMuscleDetail' });

    const highFatigue = Object.entries(fatigue).filter(([,v]) => v > 50).sort((a,b) => b[1]-a[1]);
    const pills = (hasData && highFatigue.length)
      ? '<div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin-top:6px">'
          + highFatigue.map(([n, p]) => '<span style="font-size:0.65rem;padding:3px 10px;border-radius:10px;background:' + fatigueColor(p) + ';color:var(--color-text);cursor:pointer;font-weight:500" onclick="HomeScreen.showMuscleDetail(\'' + n + '\')">' + HomeScreen.muscleLabel(n) + ' ' + p + '%</span>').join('')
          + '</div>'
      : '';

    const emptyState = hasData
      ? ''
      : '<div style="text-align:center;font-size:0.7rem;color:var(--color-text-tertiary);margin-top:10px;line-height:1.5">Sin fatiga registrada en las \u00FAltimas 72h.<br>Registra un entreno para colorear tus m\u00FAsculos.</div>';

    const legend = hasData
      ? '<div style="margin:10px auto 6px;max-width:220px">'
          + '<div style="height:6px;border-radius:3px;background:linear-gradient(to right, rgba(34,197,94,0.6), rgba(250,204,21,0.6), rgba(239,68,68,0.7));"></div>'
          + '<div style="display:flex;justify-content:space-between;font-size:0.55rem;color:var(--color-text-tertiary);margin-top:2px">'
          + '<span>\u{1F7E2} Recuperado</span><span>\u{1F7E1} Moderado</span><span>\u{1F534} Alto</span>'
          + '</div></div>'
      : '';

    return '\n      <div class="fatigue-widget" style="background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:16px;padding:16px;margin-bottom:16px">\n'
      + '        <div class="home-section-title" style="margin-bottom:10px">\n'
      + '          <span>\u{1FAC0} Mapa de Fatiga (72h)</span>\n'
      + '          <span style="font-size:0.6rem;color:var(--color-text-tertiary)">Toca un m\u00FAsculo para ver detalles</span>\n'
      + '        </div>\n'
      + '        <div style="display:flex;gap:16px;justify-content:center;align-items:flex-start">\n'
      + '          <div style="text-align:center">\n'
      + '            ' + map.front + '\n'
      + '            <div style="font-size:0.6rem;color:var(--color-text-tertiary);margin-top:4px;font-weight:500">Frontal</div>\n'
      + '          </div>\n'
      + '          <div style="text-align:center">\n'
      + '            ' + map.back + '\n'
      + '            <div style="font-size:0.6rem;color:var(--color-text-tertiary);margin-top:4px;font-weight:500">Posterior</div>\n'
      + '          </div>\n'
      + '        </div>\n'
      + legend + '\n'
      + pills + '\n'
      + emptyState + '\n'
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

  renderWeekPlanToday() {
    const planId = Storage.getWeekPlanDay(Storage.todayDayKey());
    if (!planId) return '';

    if (planId === 'rest') {
      return `<div style="background:var(--color-bg-card);border:1px dashed var(--color-border);border-radius:14px;padding:12px 16px;margin-bottom:16px;text-align:center">
        <div style="font-size:0.85rem;font-weight:700">🫖 Día de descanso</div>
        <div style="font-size:0.7rem;color:var(--color-text-tertiary)">Así lo planificaste — descansa o da un paseo suave.</div>
      </div>`;
    }

    const routine = Storage.getRoutine(planId);
    if (!routine) return '';
    const doneToday = Storage.getWorkouts().some(w => {
      const d = new Date(w.finishedAt);
      return Storage._localDateStr(d) === Storage.todayKey() && w.routineId === routine.id;
    });

    return `
      <div style="background:var(--color-bg-card);border:1px solid var(--color-accent);border-radius:14px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--color-accent-dim);display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0">📅</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:0.7rem;color:var(--color-text-tertiary)">HOY TOCA · PLAN SEMANAL</div>
          <div style="font-size:0.9rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(routine.name)}</div>
        </div>
        ${doneToday
          ? `<span style="font-size:0.7rem;color:var(--color-success);font-weight:700;white-space:nowrap">✓ Hecho</span>`
          : `<button class="btn btn-primary btn-sm" style="white-space:nowrap" onclick="App.startFromRoutine('${routine.id}')">Empezar</button>`}
      </div>`;
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
            <span style="color:var(--color-warning)">⚠️ Perdiste: ${escapeHtml(m.routineName)}</span>
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
          <div class="program-card-name" style="display:flex;align-items:center;gap:8px"><div style="width:16px;height:16px">${Icons.calendar}</div> ${escapeHtml(program.name)}</div>
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
              ${nextLabel}${escapeHtml(next.routine.name)}
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
            <div style="font-size:0.75rem;font-weight:600;color:var(--color-text)">${escapeHtml(comp.name)}</div>
            <div style="font-size:0.65rem;color:var(--color-text-secondary)">${comp.members?.length || 0} miembros${myRank > 0 ? ` · Tu rank: #${myRank}` : ''}</div>
          </div>
          ${topUser ? `<div style="text-align:right">
            <div style="font-size:0.65rem;color:var(--color-text-tertiary)">Líder</div>
            <div style="font-size:0.75rem;font-weight:600;color:var(--color-accent)">${escapeHtml(topUser.name || '???')}</div>
          </div>` : ''}
          <div style="font-size:1rem;color:var(--color-text-tertiary)">→</div>
        </div>
      </div>`;
  }
};
