// ============================================
// GravityFit — Home Screen
// ============================================

import { Storage } from '../storage.js';
import { Icons, Toast, Modal } from '../components.js';
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

    const me = (d, name, extra) => {
      const pct = fatigue[name] || 0;
      const glow = pct > 60 ? 'filter="url(#glow-1)"' : '';
      return '<path d="' + d + '" fill="' + mf(name) + '" stroke="rgba(255,255,255,' + (pct > 0 ? 0.2 : 0.08) + ')" stroke-width="0.6" stroke-linejoin="round" style="cursor:pointer;transition:opacity 0.2s" onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1" onclick="HomeScreen.showMuscleDetail(\'' + name + '\')" ' + (extra || '') + ' ' + glow + '/>';
    };
    const ne = (d) => '<path d="' + d + '" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.12)" stroke-width="0.5" stroke-linejoin="round"/>';
    const bo = (d) => '<path d="' + d + '" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-linejoin="round"/>';

    const frontView = '<svg viewBox="0 0 140 260" width="110" height="200" style="display:block">'
      + '<defs><filter id="glow-1"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
      + bo('M70,8 C78,8 84,14 84,24 C84,34 78,42 74,44 L82,48 C92,48 100,52 100,58 L104,78 C108,88 106,96 102,100 L94,114 L90,132 L84,140 L78,142 L82,168 C84,188 86,208 84,224 L82,244 C82,250 78,256 74,256 L66,256 C62,256 58,250 58,244 L56,224 C54,208 56,188 58,168 L62,142 L56,140 L50,132 L46,114 L38,100 C34,96 32,88 36,78 L40,58 C40,52 48,48 58,48 L66,44 C62,42 56,34 56,24 C56,14 62,8 70,8 Z')
      + ne('M70,8 C80,8 87,16 87,26 C87,36 80,44 70,44 C60,44 53,36 53,26 C53,16 60,8 70,8 Z')
      + me('M56,40 L70,38 L84,40 L86,46 L82,50 L70,48 L58,50 L54,46 Z', 'trapecios')
      + me('M42,46 C36,46 30,50 30,58 C30,64 34,68 40,68 L50,62 L54,50 L48,46 Z', 'hombros')
      + me('M98,46 C104,46 110,50 110,58 C110,64 106,68 100,68 L90,62 L86,50 L92,46 Z', 'hombros')
      + me('M54,50 C54,48 60,46 68,46 L70,46 C70,46 70,48 70,52 L70,70 C70,74 64,76 58,74 L54,70 L54,50 Z', 'pectorals')
      + me('M86,50 C86,48 80,46 72,46 L70,46 C70,46 70,48 70,52 L70,70 C70,74 76,76 82,74 L86,70 L86,50 Z', 'pectorals')
      + me('M34,64 C30,66 26,72 26,80 C26,88 30,94 34,94 L42,92 L44,80 L44,68 Z', 'biceps')
      + me('M106,64 C110,66 114,72 114,80 C114,88 110,94 106,94 L98,92 L96,80 L96,68 Z', 'biceps')
      + me('M58,72 L82,72 L82,74 L70,76 L58,74 Z M58,78 L82,78 L82,96 L58,96 Z M58,98 L70,100 L70,118 L58,116 Z M70,100 L82,98 L82,116 L70,118 Z M58,120 L82,120 L80,136 L60,136 Z', 'core')
      + me('M24,96 C20,100 16,108 16,116 C16,122 18,128 22,130 L28,128 L30,118 L34,100 Z', 'antebrazos')
      + me('M116,96 C120,100 124,108 124,116 C124,122 122,128 118,130 L112,128 L110,118 L106,100 Z', 'antebrazos')
      + ne('M18,132 C14,136 12,140 14,142 L22,140 L26,132 Z')
      + ne('M122,132 C126,136 128,140 126,142 L118,140 L114,132 Z')
      + me('M56,136 L84,136 L86,148 L84,152 L56,152 L54,148 Z', 'abductores')
      + me('M56,152 C54,156 50,170 48,186 C46,200 48,214 50,224 L56,224 C58,214 60,200 60,186 C60,170 58,156 56,152 Z', 'cuadriceps')
      + me('M84,152 C86,156 90,170 92,186 C94,200 92,214 90,224 L84,224 C82,214 80,200 80,186 C80,170 82,156 84,152 Z', 'cuadriceps')
      + me('M50,228 C48,234 48,244 50,250 L58,250 C58,244 58,234 56,228 Z', 'pantorrillas')
      + me('M90,228 C92,234 92,244 90,250 L82,250 C82,244 82,234 84,228 Z', 'pantorrillas')
      + ne('M46,252 C44,254 44,258 48,258 L58,258 L60,252 Z')
      + ne('M94,252 C96,254 96,258 92,258 L82,258 L80,252 Z')
      + '</svg>';

    const backView = '<svg viewBox="0 0 140 260" width="110" height="200" style="display:block">'
      + '<defs><filter id="glow-2"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
      + bo('M70,8 C78,8 84,14 84,24 C84,34 78,42 74,44 L82,48 C92,48 100,52 100,58 L104,78 C108,88 106,96 102,100 L94,114 L90,132 L84,140 L78,142 L82,168 C84,188 86,208 84,224 L82,244 C82,250 78,256 74,256 L66,256 C62,256 58,250 58,244 L56,224 C54,208 56,188 58,168 L62,142 L56,140 L50,132 L46,114 L38,100 C34,96 32,88 36,78 L40,58 C40,52 48,48 58,48 L66,44 C62,42 56,34 56,24 C56,14 62,8 70,8 Z')
      + ne('M70,8 C80,8 87,16 87,26 C87,36 80,44 70,44 C60,44 53,36 53,26 C53,16 60,8 70,8 Z')
      + me('M56,38 L70,36 L84,38 L88,46 L90,54 L70,56 L50,54 L52,46 Z', 'trapecios')
      + me('M42,48 C36,48 30,52 30,58 C30,64 34,68 40,68 L50,62 L52,52 L46,48 Z', 'hombros')
      + me('M98,48 C104,48 110,52 110,58 C110,64 106,68 100,68 L90,62 L88,52 L94,48 Z', 'hombros')
      + me('M52,56 C50,58 48,64 48,72 L48,86 C48,90 54,94 62,94 L70,96 L78,94 C86,94 92,90 92,86 L92,72 C92,64 90,58 88,56 L70,58 Z', 'espalda')
      + me('M34,64 C30,66 26,72 26,80 C26,88 30,94 34,94 L42,90 L44,80 L44,68 Z', 'triceps')
      + me('M106,64 C110,66 114,72 114,80 C114,88 110,94 106,94 L98,90 L96,80 L96,68 Z', 'triceps')
      + '<path d="M62,90 L62,132 M78,90 L78,132" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="0.6"/>'
      + me('M52,96 C50,98 46,104 46,112 C46,120 50,126 56,126 L68,124 L70,100 Z', 'gluteos')
      + me('M88,96 C90,98 94,104 94,112 C94,120 90,126 84,126 L72,124 L70,100 Z', 'gluteos')
      + me('M24,96 C20,100 16,108 16,116 C16,122 18,128 22,130 L28,128 L30,118 L34,100 Z', 'antebrazos')
      + me('M116,96 C120,100 124,108 124,116 C124,122 122,128 118,130 L112,128 L110,118 L106,100 Z', 'antebrazos')
      + ne('M18,132 C14,136 12,140 14,142 L22,140 L26,132 Z')
      + ne('M122,132 C126,136 128,140 126,142 L118,140 L114,132 Z')
      + me('M52,128 C48,140 46,160 46,180 C46,200 48,214 50,224 L58,224 C60,214 62,200 62,186 C62,170 60,152 58,136 Z', 'femorales')
      + me('M88,128 C92,140 94,160 94,180 C94,200 92,214 90,224 L82,224 C80,214 78,200 78,186 C78,170 80,152 82,136 Z', 'femorales')
      + me('M48,228 C44,234 42,240 44,246 C46,250 50,252 54,250 C58,246 58,240 56,228 Z', 'pantorrillas')
      + me('M92,228 C96,234 98,240 96,246 C94,250 90,252 86,250 C82,246 82,240 84,228 Z', 'pantorrillas')
      + ne('M46,252 C44,254 44,258 48,258 L58,258 L60,252 Z')
      + ne('M94,252 C96,254 96,258 92,258 L82,258 L80,252 Z')
      + '</svg>';

    const highFatigue = Object.entries(fatigue).filter(([,v]) => v > 50).sort((a,b) => b[1]-a[1]);
    const pills = highFatigue.length
      ? '<div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin-top:6px">'
          + highFatigue.map(([n, p]) => '<span style="font-size:0.65rem;padding:3px 10px;border-radius:10px;background:' + getFatigueColor(p) + ';color:var(--color-text);cursor:pointer;font-weight:500" onclick="HomeScreen.showMuscleDetail(\'' + n + '\')">' + n + ' ' + p + '%</span>').join('')
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
      + '<h3 style="font-size:1.1rem;font-weight:700;margin-bottom:2px;text-transform:capitalize">' + muscleName + '</h3>'
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

    Modal.show(html, { title: '\u{1FAC0} ' + muscleName.charAt(0).toUpperCase() + muscleName.slice(1) });
    if (navigator.vibrate) navigator.vibrate(10);
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
