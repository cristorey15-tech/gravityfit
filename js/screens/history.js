// ============================================
// GravityFit — History & Progress Screen
// ============================================

import { Storage } from '../storage.js';
import { Icons, Modal, Toast } from '../components.js';
import { HomeScreen } from './home.js';
import { App } from '../app.js';

export const HistoryScreen = {
  currentMonth: new Date(),
  activeTab: 'history', // 'history' | 'progress' | 'records'

  render() {
    const container = document.getElementById('screen-history');
    container.innerHTML = `
      <div class="screen-header">
        <h1 style="font-size:var(--font-size-2xl);font-weight:var(--font-weight-bold);margin-bottom:12px">Historial</h1>
        <div style="display:flex;gap:8px">
          <button class="chip ${this.activeTab === 'history' ? 'active' : ''}" onclick="HistoryScreen.switchTab('history')">📅 Historial</button>
          <button class="chip ${this.activeTab === 'progress' ? 'active' : ''}" onclick="HistoryScreen.switchTab('progress')">📈 Progreso</button>
          <button class="chip ${this.activeTab === 'records' ? 'active' : ''}" onclick="HistoryScreen.switchTab('records')">🏆 Records</button>
        </div>
      </div>
      <div class="screen-content">
        ${this.activeTab === 'history' ? this.renderHistory() : 
          this.activeTab === 'progress' ? this.renderProgress() : this.renderRecords()}
      </div>`;
  },

  switchTab(tab) {
    this.activeTab = tab;
    this.render();
  },

  // ==========================================
  // HISTORY TAB — Calendar + Workout list
  // ==========================================
  renderHistory() {
    const workouts = Storage.getWorkouts();
    const user = Storage.getUser();
    return `
      <div class="history-calendar">${this.renderCalendar()}</div>
      ${this.renderHeatmap(workouts)}
      <h3 style="font-size:var(--font-size-md);font-weight:var(--font-weight-semibold);margin:16px 0 12px">Entrenamientos</h3>
      ${workouts.length ? workouts.map(w => {
        const exNames = (w.exercises || []).map(e => {
          const d = Storage.getExercise(e.exerciseId);
          return d ? d.name : '';
        }).filter(Boolean).slice(0, 3);
        const vol = Storage.getTotalVolume(w);
        return `
          <div class="history-workout-card" onclick="HistoryScreen.showWorkoutDetail('${w.id}')">
            <h4>${w.name || 'Entrenamiento'}</h4>
            <div class="meta">
              <span>${this.formatDate(w.finishedAt)}</span>
              <span style="display:inline-flex;align-items:center;gap:4px"><div style="width:14px;height:14px">${Icons.timer}</div> ${HomeScreen.formatDuration(w.duration)}</span>
              <span style="display:inline-flex;align-items:center;gap:4px"><div style="width:14px;height:14px">${Icons.award}</div> ${HomeScreen.formatVolume(vol, user.units)}</span>
            </div>
            <div class="exercises-summary">${exNames.join(', ')}${(w.exercises || []).length > 3 ? ' ...' : ''}</div>
          </div>`;
      }).join('') : `<div class="empty-state"><div class="empty-state-icon" style="width:48px;height:48px;margin:0 auto 16px">${Icons.fileText}</div><div class="empty-state-title">Sin historial</div><div class="empty-state-text">Completa tu primer entrenamiento para verlo aquí</div></div>`}`;
  },

  renderCalendar() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const monthName = this.currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = (firstDay.getDay() + 6) % 7; // Monday=0
    const daysInMonth = lastDay.getDate();
    const today = new Date();
    const workouts = Storage.getWorkouts();
    const workoutDays = new Set();
    workouts.forEach(w => {
      if (!w.finishedAt) return;
      const d = new Date(w.finishedAt);
      if (d.getMonth() === month && d.getFullYear() === year) {
        workoutDays.add(d.getDate());
      }
    });

    const dayHeaders = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    let cells = dayHeaders.map(d => `<div class="calendar-day-header">${d}</div>`).join('');
    for (let i = 0; i < startWeekday; i++) cells += '<div class="calendar-day empty"></div>';
    
    // Projection Logic
    const program = Storage.getActiveProgram();
    const projectedDays = new Set();
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    if (program && (year > today.getFullYear() || (year === today.getFullYear() && month >= today.getMonth()))) {
      if (program.mode === 'weekly' && program.schedule) {
        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(year, month, d);
          if (date >= todayDateOnly && !workoutDays.has(d)) {
            const slot = program.schedule.find(s => s.day === date.getDay());
            if (slot) projectedDays.add(d);
          }
        }
      } else if (program.mode === 'rotation' && program.rotationRoutines) {
        const completed = (program.completedWorkouts || []).length;
        const restDays = program.restDaysBetween || 0;
        const lastWk = program.completedWorkouts && program.completedWorkouts.length
          ? new Date(program.completedWorkouts[program.completedWorkouts.length - 1].date) : null;
        if (lastWk) lastWk.setHours(0,0,0,0);
        
        let simIdx = completed % program.rotationRoutines.length;
        let nextTrainDate = lastWk ? new Date(lastWk) : new Date(todayDateOnly);
        if (lastWk) nextTrainDate.setDate(nextTrainDate.getDate() + restDays + 1);
        if (nextTrainDate < todayDateOnly) nextTrainDate = new Date(todayDateOnly);

        let curr = new Date(nextTrainDate);
        for(let i = 0; i < 40; i++) { // Project 40 steps max
           if (curr.getMonth() === month && curr.getFullYear() === year) {
             if (program.rotationRoutines[simIdx] !== 'rest' && !workoutDays.has(curr.getDate())) {
               projectedDays.add(curr.getDate());
             }
           }
           simIdx = (simIdx + 1) % program.rotationRoutines.length;
           curr.setDate(curr.getDate() + restDays + 1);
           if (curr.getMonth() > month && curr.getFullYear() >= year) break; // Optimization
        }
      }
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      const hasWorkout = workoutDays.has(d);
      const isProjected = projectedDays.has(d);
      
      const cls = ['calendar-day'];
      if (isToday) cls.push('today');
      if (hasWorkout) cls.push('has-workout');
      else if (isProjected) cls.push('projected');
      
      cells += `<div class="${cls.join(' ')}">${d}</div>`;
    }

    return `
      <div class="calendar-header">
        <button class="btn btn-ghost btn-icon sm" onclick="HistoryScreen.prevMonth()">◀</button>
        <h3 style="text-transform:capitalize">${monthName}</h3>
        <button class="btn btn-ghost btn-icon sm" onclick="HistoryScreen.nextMonth()">▶</button>
      </div>
      <div class="calendar-grid">${cells}</div>
      ${projectedDays.size > 0 ? '<div style="display:flex;align-items:center;gap:6px;font-size:0.6875rem;color:var(--color-text-secondary);margin-top:8px"><div class="calendar-day projected" style="width:12px;height:12px;min-height:12px;border-width:1px"></div> Día programado (estimado)</div>' : ''}
    `;
  },

  renderHeatmap(workouts) {
    // GitHub-style heatmap for last 12 weeks
    const weeks = 12;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayCount = {};
    workouts.forEach(w => {
      if (!w.finishedAt) return;
      const d = new Date(w.finishedAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      dayCount[key] = (dayCount[key] || 0) + 1;
    });

    // Find start date (12 weeks ago, starting Monday)
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (weeks * 7) + 1);
    const startDay = (startDate.getDay() + 6) % 7; // Monday=0
    startDate.setDate(startDate.getDate() - startDay);

    let cells = '';
    const totalDays = weeks * 7;
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      if (d > today) { cells += '<div class="heatmap-cell level-0"></div>'; continue; }
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const count = dayCount[key] || 0;
      const level = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : 3;
      cells += `<div class="heatmap-cell level-${level}" title="${d.getDate()}/${d.getMonth()+1}: ${count} entrenos"></div>`;
    }

    const totalWorkouts = workouts.filter(w => {
      if (!w.finishedAt) return false;
      const d = new Date(w.finishedAt);
      return d >= startDate && d <= today;
    }).length;

    return `
      <div style="margin:12px 0">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:var(--font-size-sm);font-weight:var(--font-weight-semibold)">Últimas ${weeks} semanas</span>
          <span style="font-size:var(--font-size-xs);color:var(--color-text-secondary)">${totalWorkouts} entrenos</span>
        </div>
        <div class="heatmap-grid">${cells}</div>
        <div style="display:flex;justify-content:flex-end;align-items:center;gap:4px;margin-top:4px">
          <span style="font-size:0.6rem;color:var(--color-text-tertiary)">Menos</span>
          <div class="heatmap-cell level-0" style="width:10px;height:10px"></div>
          <div class="heatmap-cell level-1" style="width:10px;height:10px"></div>
          <div class="heatmap-cell level-2" style="width:10px;height:10px"></div>
          <div class="heatmap-cell level-3" style="width:10px;height:10px"></div>
          <span style="font-size:0.6rem;color:var(--color-text-tertiary)">Más</span>
        </div>
      </div>`;
  },

  prevMonth() {
    this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
    this.render();
  },
  nextMonth() {
    this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
    this.render();
  },

  // ==========================================
  // PROGRESS TAB — Charts
  // ==========================================
  renderProgress() {
    const workouts = Storage.getWorkouts();
    const user = Storage.getUser();
    if (workouts.length < 2) {
      return `<div class="empty-state"><div class="empty-state-icon" style="width:48px;height:48px;margin:0 auto 16px">${Icons.award}</div><div class="empty-state-title">Aún no hay suficientes datos</div><div class="empty-state-text">Completa al menos 2 entrenamientos para ver tu progreso</div></div>`;
    }
    const exerciseCounts = {};
    workouts.forEach(w => {
      (w.exercises || []).forEach(e => {
        exerciseCounts[e.exerciseId] = (exerciseCounts[e.exerciseId] || 0) + 1;
      });
    });
    const chartExercises = Object.entries(exerciseCounts)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    let html = `
      <div class="progress-chart-container">
        <h4>Volumen por Sesión (${user.units})</h4>
        <canvas id="chart-volume" width="400" height="200"></canvas>
      </div>
      <div class="progress-chart-container">
        <h4>Frecuencia Semanal</h4>
        <canvas id="chart-frequency" width="400" height="160"></canvas>
      </div>`;

    chartExercises.forEach(([exId]) => {
      const exData = Storage.getExercise(exId);
      const name = exData ? exData.name : exId;
      html += `
        <div class="progress-chart-container">
          <h4>${name} — Peso Máximo</h4>
          <canvas id="chart-${exId}" width="400" height="200"></canvas>
        </div>`;
    });

    setTimeout(() => {
      this.drawVolumeChart(workouts, user);
      this.drawFrequencyChart(workouts);
      chartExercises.forEach(([exId]) => this.drawExerciseChart(exId, workouts));
    }, 50);

    return html;
  },

  drawVolumeChart(workouts, user) {
    const canvas = document.getElementById('chart-volume');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width - 32;
    canvas.height = 200;
    const sorted = [...workouts].reverse().slice(-20);
    const data = sorted.map(w => Storage.getTotalVolume(w));
    this.drawLineChart(ctx, canvas.width, canvas.height, data, sorted.map((w, i) => i + 1));
  },

  drawFrequencyChart(workouts) {
    const canvas = document.getElementById('chart-frequency');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width - 32;
    canvas.height = 160;

    // Count workouts per week for last 8 weeks
    const weeks = 8;
    const now = new Date();
    const data = [];
    const labels = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i * 7) - weekStart.getDay() + 1);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const count = workouts.filter(w => {
        if (!w.finishedAt) return false;
        const d = new Date(w.finishedAt);
        return d >= weekStart && d < weekEnd;
      }).length;
      data.push(count);
      labels.push(`S${weeks - i}`);
    }

    this.drawBarChart(ctx, canvas.width, canvas.height, data, labels);
  },

  drawExerciseChart(exId, workouts) {
    const canvas = document.getElementById('chart-' + exId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width - 32;
    canvas.height = 200;
    const sorted = [...workouts].reverse();
    const data = [];
    sorted.forEach(w => {
      const ex = (w.exercises || []).find(e => e.exerciseId === exId);
      if (ex) {
        const maxW = Math.max(...(ex.sets || []).filter(s => s.completed).map(s => s.weight || 0));
        if (maxW > 0) data.push(maxW);
      }
    });
    if (data.length < 2) return;
    this.drawLineChart(ctx, canvas.width, canvas.height, data.slice(-20), data.map((_, i) => i + 1));
  },

  drawLineChart(ctx, w, h, data, labels) {
    const padding = { top: 20, right: 16, bottom: 30, left: 45 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const maxVal = Math.max(...data) * 1.1 || 1;
    const minVal = Math.min(...data) * 0.9;
    const range = maxVal - minVal || 1;

    ctx.clearRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(w - padding.right, y); ctx.stroke();
      const val = maxVal - (range / 4) * i;
      ctx.fillStyle = '#666';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(val).toLocaleString(), padding.left - 8, y + 4);
    }

    const points = data.map((val, i) => ({
      x: padding.left + (chartW / Math.max(data.length - 1, 1)) * i,
      y: padding.top + chartH - ((val - minVal) / range) * chartH
    }));

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
    gradient.addColorStop(0, 'rgba(163,255,18,0.2)');
    gradient.addColorStop(1, 'rgba(163,255,18,0)');
    ctx.beginPath();
    ctx.moveTo(points[0].x, h - padding.bottom);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, h - padding.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#A3FF12';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();

    // Dots
    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#A3FF12';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#0D0D0D';
      ctx.fill();
    });
  },

  drawBarChart(ctx, w, h, data, labels) {
    const padding = { top: 15, right: 16, bottom: 25, left: 30 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const maxVal = Math.max(...data, 1) * 1.2;

    ctx.clearRect(0, 0, w, h);

    const barWidth = Math.min(chartW / data.length * 0.6, 30);
    const gap = chartW / data.length;

    data.forEach((val, i) => {
      const x = padding.left + gap * i + (gap - barWidth) / 2;
      const barH = (val / maxVal) * chartH;
      const y = padding.top + chartH - barH;

      // Bar with gradient
      const grad = ctx.createLinearGradient(x, y, x, y + barH);
      grad.addColorStop(0, '#A3FF12');
      grad.addColorStop(1, 'rgba(163,255,18,0.3)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, 3);
      ctx.fill();

      // Value on top
      ctx.fillStyle = '#F5F5F5';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(val, x + barWidth / 2, y - 4);

      // Label
      ctx.fillStyle = '#666';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(labels[i], x + barWidth / 2, h - 6);
    });
  },

  // ==========================================
  // RECORDS TAB — Personal Records Dashboard
  // ==========================================
  renderRecords() {
    const workouts = Storage.getWorkouts();
    const user = Storage.getUser();
    if (workouts.length === 0) {
      return `<div class="empty-state"><div class="empty-state-icon" style="width:48px;height:48px;margin:0 auto 16px">${Icons.trophy}</div><div class="empty-state-title">Sin records aún</div><div class="empty-state-text">Completa entrenamientos para ver tus records personales</div></div>`;
    }

    // Collect PRs per exercise
    const prs = {};
    workouts.forEach(w => {
      (w.exercises || []).forEach(ex => {
        const sets = (ex.sets || []).filter(s => s.completed && s.weight > 0);
        sets.forEach(s => {
          const vol = (s.weight || 0) * (s.reps || 0);
          if (!prs[ex.exerciseId] || vol > prs[ex.exerciseId].volume) {
            prs[ex.exerciseId] = {
              weight: s.weight,
              reps: s.reps,
              volume: vol,
              date: w.finishedAt
            };
          }
        });
      });
    });

    const prList = Object.entries(prs)
      .map(([exId, pr]) => {
        const exData = Storage.getExercise(exId);
        return { exId, name: exData ? exData.name : exId, icon: exData ? exData.icon : Icons.award, ...pr };
      })
      .sort((a, b) => b.volume - a.volume);

    if (prList.length === 0) {
      return `<div class="empty-state"><div class="empty-state-icon" style="width:48px;height:48px;margin:0 auto 16px">${Icons.trophy}</div><div class="empty-state-title">Sin records aún</div><div class="empty-state-text">Registra peso y reps para ver tus PRs</div></div>`;
    }

    // Stats summary
    const totalPRs = prList.length;
    const heaviestPR = prList.reduce((max, pr) => pr.weight > max.weight ? pr : max, prList[0]);
    const highVolPR = prList[0]; // already sorted by volume

    let html = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
        <div class="stat-card" style="text-align:center">
          <div class="stat-value">${totalPRs}</div>
          <div class="stat-label">Ejercicios con PR</div>
        </div>
        <div class="stat-card" style="text-align:center">
          <div class="stat-value">${heaviestPR.weight}${user.units}</div>
          <div class="stat-label">Peso más alto</div>
        </div>
      </div>
      <h3 style="font-size:var(--font-size-md);font-weight:var(--font-weight-semibold);margin-bottom:12px">🏆 Tus Records Personales</h3>`;

    prList.forEach((pr, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
      const d = pr.date ? new Date(pr.date) : null;
      const dateStr = d ? `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}` : '';
      html += `
        <div class="pr-record-card">
          <div class="pr-rank">${medal || (i + 1)}</div>
          <div class="pr-info">
            <div class="pr-name">${pr.name}</div>
            <div class="pr-date">${dateStr}</div>
          </div>
          <div class="pr-value">
            <div class="pr-weight">${pr.weight}${user.units} × ${pr.reps}</div>
            <div class="pr-volume">${pr.volume.toLocaleString()} vol</div>
          </div>
        </div>`;
    });

    return html;
  },

  // ==========================================
  // WORKOUT DETAIL — with Repeat button
  // ==========================================
  showWorkoutDetail(id) {
    const w = Storage.getWorkout(id);
    if (!w) return;
    const user = Storage.getUser();
    const vol = Storage.getTotalVolume(w);
    let currentSupersetId = null;
    let exHtml = (w.exercises || []).map((ex, i) => {
      const d = Storage.getExercise(ex.exerciseId);
      const name = d ? d.name : ex.exerciseId;
      const setsHtml = (ex.sets || []).map((s, idx) => {
        const check = s.completed ? '✅' : '⬜';
        return `<div style="display:flex;gap:12px;padding:4px 0;font-size:0.8125rem;color:var(--color-text-secondary)">
          <span>${check}</span><span>Serie ${idx + 1}</span><span>${s.weight || 0} ${user.units}</span><span>× ${s.reps || 0}</span>
        </div>`;
      }).join('');
      const notesHtml = ex.notes ? `<div style="margin-top:4px;padding:6px 8px;background:rgba(255,255,255,0.04);border-radius:6px;font-size:0.75rem;color:var(--color-text-secondary)">📝 ${ex.notes}</div>` : '';
      const rpeHtml = ex.rpe ? `<span style="font-size:0.75rem;color:var(--color-warning);margin-left:8px">RPE ${ex.rpe}</span>` : '';
      
      const isFirstInSuperset = ex.supersetId && currentSupersetId !== ex.supersetId;
      const isLinkedToNext = ex.supersetId && i < w.exercises.length - 1 && w.exercises[i + 1].supersetId === ex.supersetId;
      currentSupersetId = ex.supersetId || null;

      let wrapHtml = '';
      if (isFirstInSuperset) {
        wrapHtml += `<div style="border-left:3px solid var(--color-accent);padding-left:12px;margin-left:2px;margin-bottom:8px;position:relative">
                     <div style="position:absolute;left:-8px;top:50%;transform:translateY(-50%);font-size:0.6rem;background:var(--color-bg);color:var(--color-accent);padding:8px 0;writing-mode:vertical-rl;text-orientation:mixed;letter-spacing:2px;font-weight:bold;border-radius:4px">SUPERSET</div>`;
      }

      wrapHtml += `<div style="margin-bottom:${isLinkedToNext ? '12px;border-bottom:1px dashed rgba(255,255,255,0.1);padding-bottom:12px' : '16px'}"><div style="font-weight:600;color:var(--color-accent);margin-bottom:4px">${name}${rpeHtml}</div>${setsHtml}${notesHtml}</div>`;

      if (ex.supersetId && !isLinkedToNext) {
        wrapHtml += `</div>`;
      }

      return wrapHtml;
    }).join('');

    Modal.show(`
      <div style="display:flex;gap:16px;margin-bottom:16px;font-size:0.8125rem;color:var(--color-text-secondary)">
        <span>📅 ${this.formatDate(w.finishedAt)}</span>
        <span>⏱ ${HomeScreen.formatDuration(w.duration)}</span>
        <span>📊 ${HomeScreen.formatVolume(vol, user.units)}</span>
      </div>
      ${exHtml}
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-primary flex-1" onclick="HistoryScreen.repeatWorkout('${id}')">🔄 Repetir</button>
        <button class="btn btn-danger flex-1" onclick="HistoryScreen.confirmDeleteWorkout('${id}')">🗑️ Eliminar</button>
      </div>
    `, { title: w.name || 'Entrenamiento' });
  },

  repeatWorkout(id) {
    const original = Storage.getWorkout(id);
    if (!original) return;
    Modal.hide();
    // Build a new workout from the original's exercises
    const exercises = (original.exercises || []).map(ex => ({
      exerciseId: ex.exerciseId,
      supersetId: ex.supersetId || null,
      unit: ex.unit,
      timeMode: ex.timeMode || false,
      sets: (ex.sets || []).map(s => ({
        weight: s.weight,
        reps: s.reps,
        type: s.type || 'normal',
        completed: false
      }))
    }));        window.WorkoutScreen.activeWorkout = {
      name: original.name || 'Entrenamiento',
      exercises,
      startedAt: new Date().toISOString()
    };
    window.WorkoutScreen.startTime = Date.now();
    window.WorkoutScreen.save();
    window.App.navigate('workout');
    Toast.show('🔄 Entrenamiento cargado — ¡a entrenar!', 'success');
  },

  confirmDeleteWorkout(id) {
    Storage.deleteWorkout(id);
    Modal.hide();
    Toast.show('Entrenamiento eliminado');
    this.render();
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }
};
