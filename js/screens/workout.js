// ============================================
// GravityFit — Workout Screen (Active Training)
// ============================================

import { Storage } from '../storage.js';
import { Icons, Modal, Toast, RestTimer, PRCelebration } from '../components.js';
import { App } from '../app.js';
import { HomeScreen } from './home.js';
import { Logger } from '../../src/Logger.js';

export const WorkoutScreen = {
  activeWorkout: null,
  workoutTimer: null,
  startTime: null,
  wakeLock: null,

  render() {
    const container = document.getElementById('screen-workout');
    if (!this.activeWorkout) {
      container.innerHTML = `
        <div class="empty-state" style="min-height:70vh">
          <div class="empty-state-icon" style="width:48px;height:48px;margin:0 auto 16px">${Icons.plus}</div>
          <div class="empty-state-title">Sin entrenamiento activo</div>
          <div class="empty-state-text">Empieza un entrenamiento vacío o selecciona una rutina</div>
          <button class="btn btn-primary btn-lg" onclick="App.startEmptyWorkout()" style="margin-top:16px">Empezar Entrenamiento</button>
        </div>`;
      return;
    }
    const user = Storage.getUser();
    const elapsed = this.getElapsed();
    container.innerHTML = `
      <div class="workout-header-bar">
        <button class="btn btn-ghost btn-sm" onclick="WorkoutScreen.confirmCancel()">✕ Cancelar</button>
        <div style="display:flex;align-items:center;gap:8px">
          <div id="ble-container" style="display:flex;align-items:center;gap:4px;background:var(--color-bg-input);border:1px solid var(--color-border);padding:4px 8px;border-radius:12px;cursor:pointer" onclick="typeof BLE !== 'undefined' && (BLE.device ? BLE.disconnect() : BLE.connect())">
            <span id="ble-heart-icon" style="transition:transform 0.1s;font-size:0.8rem">❤️</span>
            <span id="ble-bpm-value" style="font-weight:bold;font-size:0.85rem;min-width:20px;text-align:center">${typeof window.BLE !== 'undefined' && window.BLE.currentBPM ? window.BLE.currentBPM : '--'}</span>
            <span id="ble-zone-indicator" style="font-size:0.7rem;margin-left:1px">💚</span>
            <span style="font-size:0.7rem;color:var(--color-text-tertiary);margin-left:2px">|<span id="ble-cal-value" style="margin-left:4px;color:var(--color-warning);font-weight:bold">${typeof window.BLE !== 'undefined' ? Math.floor(window.BLE.caloriesBurned) : 0}</span> cal</span>
          </div>
          <div class="workout-timer-display" id="workout-elapsed">${this.formatTime(elapsed)}</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="WorkoutScreen.finishWorkout()">Finalizar</button>
      </div>
      <div class="screen-content" style="padding-top:8px">
        <input class="workout-title-input" value="${this.activeWorkout.name}" 
          placeholder="Nombre del entrenamiento" onchange="WorkoutScreen.activeWorkout.name=this.value;WorkoutScreen.save()">
        <div id="workout-exercises-list">
          ${this.renderExercises(user)}
        </div>
        <button class="workout-add-exercise" onclick="WorkoutScreen.showExercisePicker()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Agregar Ejercicio
        </button>
        <div style="height:100px"></div>
      </div>
    `;
    this.startTimer();
  },

  renderExercises(user) {
    if (!this.activeWorkout.exercises.length) return '';
    let html = '';
    let currentSupersetId = null;

    this.activeWorkout.exercises.forEach((ex, exIdx) => {
      const exData = Storage.getExercise(ex.exerciseId);
      const prev = Storage.getPreviousPerformance(ex.exerciseId);
      const name = exData ? exData.name : ex.exerciseId;
      const muscle = exData ? exData.primaryMuscle : '';
      const gifUrl = exData ? exData.gifUrl : null;
      const icon = exData ? exData.icon : '🏋️';
      const exUnit = ex.unit || user.units;
      
      const isFirstInSuperset = ex.supersetId && currentSupersetId !== ex.supersetId;
      const isLastInSuperset = ex.supersetId && (exIdx === this.activeWorkout.exercises.length - 1 || this.activeWorkout.exercises[exIdx + 1].supersetId !== ex.supersetId);
      const isLinkedToNext = ex.supersetId && exIdx < this.activeWorkout.exercises.length - 1 && this.activeWorkout.exercises[exIdx + 1].supersetId === ex.supersetId;
      const isLinkedToPrev = ex.supersetId && exIdx > 0 && this.activeWorkout.exercises[exIdx - 1].supersetId === ex.supersetId;
      
      currentSupersetId = ex.supersetId || null;

      const linkBtn = exIdx > 0 ? `<button class="btn btn-ghost btn-icon sm" style="opacity: ${isLinkedToPrev ? '1;color:var(--color-accent)' : '0.3'};font-size:1.1rem;margin-right:-4px" onclick="WorkoutScreen.toggleSuperset(${exIdx})" title="Vincular con el anterior">🔗</button>` : '';

      if (isFirstInSuperset) {
        html += `<div style="border-left:3px solid var(--color-accent);padding-left:12px;margin-left:2px;margin-bottom:16px;position:relative">
                 <div style="position:absolute;left:-8px;top:50%;transform:translateY(-50%);font-size:0.6rem;background:var(--color-bg);color:var(--color-accent);padding:8px 0;writing-mode:vertical-rl;text-orientation:mixed;letter-spacing:2px;font-weight:bold;border-radius:4px">SUPERSET</div>`;
      }

      html += `
        <div class="exercise-block" data-ex-idx="${exIdx}" style="${isLinkedToNext ? 'margin-bottom:12px;border-bottom:1px dashed rgba(255,255,255,0.1);padding-bottom:16px' : ''}">
          <div class="exercise-block-header">
            <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">
              ${linkBtn}
              ${gifUrl ? `<img src="${gifUrl}" alt="${name}" class="exercise-gif-thumb" loading="lazy" onclick="WorkoutScreen.showGifModal('${exIdx}')" onerror="this.outerHTML='<div class=\\'exercise-gif-fallback\\'>${icon}</div>'">` : `<div class="exercise-gif-fallback">${icon}</div>`}
              <div style="min-width:0">
                <div class="exercise-block-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</div>
                <div class="exercise-block-muscle">${muscle}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:3px;flex-shrink:0">
              ${exIdx > 0 ? `<button class="btn btn-ghost btn-icon sm" onclick="WorkoutScreen.moveExercise(${exIdx},-1)" title="Mover arriba" style="font-size:0.9rem;opacity:0.5;padding:2px">▲</button>` : ''}
              ${exIdx < this.activeWorkout.exercises.length - 1 ? `<button class="btn btn-ghost btn-icon sm" onclick="WorkoutScreen.moveExercise(${exIdx},1)" title="Mover abajo" style="font-size:0.9rem;opacity:0.5;padding:2px">▼</button>` : ''}
              <button class="btn btn-ghost btn-icon sm" onclick="WorkoutScreen.toggleTimeMode(${exIdx})" title="${ex.timeMode ? 'Modo Reps' : 'Modo Tiempo'}" style="font-size:1rem;opacity:${ex.timeMode ? '1;color:var(--color-accent)' : '0.5'};padding:2px">⏱</button>
              <div class="unit-toggle-inline">
                <span class="unit-opt ${exUnit === 'kg' ? 'active' : ''}" onclick="WorkoutScreen.setExUnit(${exIdx},'kg')">KG</span>
                <span class="unit-opt ${exUnit === 'lbs' ? 'active' : ''}" onclick="WorkoutScreen.setExUnit(${exIdx},'lbs')">LBS</span>
              </div>
              <button class="btn btn-ghost btn-icon sm" onclick="WorkoutScreen.showPlatesModal(${exIdx})" title="Calculadora de discos" style="font-size:1rem;opacity:0.6;padding:2px">🧮</button>
              <button class="btn btn-ghost btn-icon sm" onclick="WorkoutScreen.replaceExercise(${exIdx})" title="Reemplazar" style="padding:2px;opacity:0.6">🔄</button>
              <button class="btn btn-ghost btn-icon sm" onclick="WorkoutScreen.removeExercise(${exIdx})" title="Eliminar" style="padding:2px">🗑️</button>
            </div>
          </div>
          ${(function(){
            const prog = Storage.getSuggestedProgression(ex.exerciseId);
            if (!prog) {
              if (prev && prev.length > 0) {
                let maxW = 0, maxR = 0;
                prev.forEach(p => { if(p.weight > maxW) { maxW = p.weight; maxR = p.reps; } else if(p.weight === maxW && p.reps > maxR) { maxR = p.reps; }});
                if (maxW > 0) return `<div class="coach-suggestion"><span>🧠</span><div><strong>Coach:</strong> Tu récord es ${maxW}${exUnit} × ${maxR}. ¡Intenta superarlo!</div></div>`;
              }
              return '';
            }
            const bars = prog.history.slice(0, 4).reverse().map(h => {
              const maxH = Math.max(...prog.history.map(x => x.totalVol), 1);
              return `<div class="coach-mini-bar" style="height:${Math.max(12, (h.totalVol / maxH) * 24)}px"></div>`;
            }).join('');
            return `<div class="coach-suggestion ${prog.type === 'deload' ? 'deload' : ''}">
              <span>🧠</span>
              <div><strong>Coach:</strong> ${prog.suggestion}
                <div class="coach-mini-chart">${bars}</div>
              </div>
            </div>`;
          })()}
          <div class="set-labels">
            <span style="width:28px;text-align:center">SET</span>
            <span style="width:50px;text-align:center">ANT.</span>
            <span style="flex:1;text-align:center">${exUnit.toUpperCase()}</span>
            <span style="flex:1;text-align:center">${ex.timeMode ? 'SEG' : 'REPS'}</span>
            <span style="width:36px"></span>
          </div>
          ${ex.sets.map((set, setIdx) => this.renderSetRow(exIdx, setIdx, set, prev, exUnit, ex.timeMode)).join('')}
          <button class="btn btn-ghost btn-sm btn-block" style="margin-top:8px;color:var(--color-accent)" 
            onclick="WorkoutScreen.addSet(${exIdx})">+ Agregar Serie</button>
            
          ${(ex.notes !== undefined || ex.rpe !== undefined) ? `
            <div style="margin-top:12px;background:rgba(0,0,0,0.2);padding:12px;border-radius:var(--radius-md)">
              <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
                <label style="font-size:0.875rem;color:var(--color-text-secondary);flex:1">RPE (Esfuerzo)</label>
                <select class="input" style="width:80px;padding:4px" onchange="WorkoutScreen.updateExData(${exIdx}, 'rpe', this.value)">
                  <option value="">-</option>
                  ${[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(v => `<option value="${v}" ${ex.rpe == v ? 'selected' : ''}>${v}</option>`).join('')}
                </select>
              </div>
              <textarea class="input" style="width:100%;height:60px;font-size:0.875rem" placeholder="Añadir notas..." onchange="WorkoutScreen.updateExData(${exIdx}, 'notes', this.value)">${ex.notes || ''}</textarea>
            </div>
          ` : `
            <button class="btn btn-ghost btn-sm btn-block" style="margin-top:4px;color:var(--color-text-secondary);font-size:0.75rem" 
              onclick="WorkoutScreen.showNotes(${exIdx})">+ Añadir Nota / RPE</button>
          `}
        </div>`;
        
      if (isLastInSuperset) {
        html += `</div>`; // close wrapper
      }
    });
    
    return html;
  },

  renderSetRow(exIdx, setIdx, set, prev, unit, timeMode) {
    const prevSet = prev && prev[setIdx] ? prev[setIdx] : null;
    const prevText = prevSet ? `${prevSet.weight}×${prevSet.reps}` : '—';
    const setNum = set.type === 'warmup' ? 'W' : set.type === 'drop' ? 'D' : set.type === 'failure' ? 'F' : (setIdx + 1);
    const numClass = set.type !== 'normal' ? 'set-number warmup' : 'set-number';
    const checkClass = set.completed ? 'set-check completed' : 'set-check';
    const isTimerActive = this._activeTimer && this._activeTimer.exIdx === exIdx && this._activeTimer.setIdx === setIdx;
    
    const repsCol = timeMode ? (
      isTimerActive ? 
        `<div class="set-timer-active" id="set-timer-${exIdx}-${setIdx}" onclick="WorkoutScreen.stopSetTimer()">${set.reps || 0}s</div>` :
        `<div style="display:flex;align-items:center;gap:2px;flex:1;justify-content:center">
          <input type="number" class="input input-number" value="${set.reps || ''}" placeholder="30" style="flex:1"
            onchange="WorkoutScreen.updateSet(${exIdx},${setIdx},'reps',this.value)" inputmode="numeric">
          <button class="set-timer-play" onclick="WorkoutScreen.startSetTimer(${exIdx},${setIdx})" title="Iniciar timer">▶</button>
        </div>`
    ) : (
      `<input type="number" class="input input-number" value="${set.reps || ''}" placeholder="0"
        onchange="WorkoutScreen.updateSet(${exIdx},${setIdx},'reps',this.value)" inputmode="numeric">`
    );
    
    return `
      <div class="set-row">
        <button class="${numClass}" onclick="WorkoutScreen.cycleSetType(${exIdx},${setIdx})" title="Tipo: ${set.type}">${setNum}</button>
        <span class="set-prev">${prevText}</span>
        <input type="number" class="input input-number" value="${set.weight || ''}" placeholder="0"
          onchange="WorkoutScreen.updateSet(${exIdx},${setIdx},'weight',this.value)" inputmode="decimal">
        ${repsCol}
        <button class="${checkClass}" onclick="WorkoutScreen.toggleSet(${exIdx},${setIdx})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
      </div>`;
  },

  // Set unit per exercise (with auto-conversion)
  setExUnit(exIdx, unit) {
    const ex = this.activeWorkout.exercises[exIdx];
    const prevUnit = ex.unit || Storage.getUser().units;
    if (prevUnit === unit) return;
    // Convert all set weights
    const factor = (prevUnit === 'kg' && unit === 'lbs') ? 2.20462 : (prevUnit === 'lbs' && unit === 'kg') ? 1 / 2.20462 : 1;
    if (factor !== 1) {
      ex.sets.forEach(set => {
        if (set.weight) set.weight = Math.round(set.weight * factor * 2) / 2; // round to 0.5
      });
    }
    ex.unit = unit;
    this.save();
    this.render();
    Toast.show(`Convertido a ${unit.toUpperCase()}`, 'info');
  },

  toggleSuperset(exIdx) {
    if (exIdx === 0) return;
    const curr = this.activeWorkout.exercises[exIdx];
    const prev = this.activeWorkout.exercises[exIdx - 1];
    
    if (curr.supersetId && curr.supersetId === prev.supersetId) {
      // Unlink
      curr.supersetId = null;
    } else {
      // Link
      if (!prev.supersetId) {
        prev.supersetId = 'ss_' + Date.now();
      }
      curr.supersetId = prev.supersetId;
    }
    this.save();
    this.render();
  },

  // Plates Calculator
  showPlatesModal(exIdx) {
    const ex = this.activeWorkout.exercises[exIdx];
    const lastSet = ex.sets.slice().reverse().find(s => s.weight) || ex.sets[0];
    const defaultWeight = lastSet && lastSet.weight ? lastSet.weight : '';
    const unit = (ex.unit || Storage.getUser().units).toUpperCase();
    
    const html = `
      <div style="text-align:center;padding:8px 0">
        <div style="display:flex;gap:12px;margin-bottom:16px">
          <div style="flex:1">
            <label style="display:block;margin-bottom:4px;font-size:0.875rem;color:var(--color-text-secondary)">Peso Objetivo (${unit})</label>
            <input type="number" id="pc-target" class="input input-number" style="font-size:1.5rem;height:50px" value="${defaultWeight}" oninput="WorkoutScreen.calcPlates()" inputmode="decimal">
          </div>
          <div style="flex:1">
            <label style="display:block;margin-bottom:4px;font-size:0.875rem;color:var(--color-text-secondary)">Barra (${unit})</label>
            <input type="number" id="pc-bar" class="input input-number" style="font-size:1.5rem;height:50px" value="20" oninput="WorkoutScreen.calcPlates()" inputmode="decimal">
          </div>
        </div>
        <div id="pc-result" style="padding:16px;background:var(--color-surface-hover);border-radius:var(--radius-md);margin-bottom:16px;min-height:90px">
          <div style="font-size:0.875rem;color:var(--color-text-secondary);margin-bottom:12px">Discos requeridos <strong style="color:var(--color-accent)">POR LADO</strong>:</div>
          <div id="pc-plates" style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px"></div>
        </div>
      </div>
    `;
    Modal.show(html, { title: 'Calculadora de Discos' });
    setTimeout(() => {
      this.calcPlates();
      const s = document.getElementById('pc-target');
      if (s) { s.focus(); s.select(); }
    }, 300);
  },

  calcPlates() {
    const target = parseFloat(document.getElementById('pc-target')?.value) || 0;
    const bar = parseFloat(document.getElementById('pc-bar')?.value) || 0;
    const container = document.getElementById('pc-plates');
    if (!container) return;
    
    if (target <= bar) {
      container.innerHTML = '<span style="color:var(--color-text-secondary)">Solo la barra</span>';
      return;
    }
    
    let remainder = (target - bar) / 2;
    // Standard plate sizes
    const platesAvailable = [25, 20, 15, 10, 5, 2.5, 1.25];
    const platesToUse = [];
    
    for (const p of platesAvailable) {
      while (remainder >= p) {
        platesToUse.push(p);
        remainder -= p;
      }
    }
    // Handle any leftover decimals loosely (e.g. they requested a weight not perfectly divisible by 1.25)
    if (remainder > 0 && remainder < 1.25) {
      // Just ignore the tiny remainder for visual simplicity
    }
    
    if (platesToUse.length === 0) {
      container.innerHTML = '<span style="color:var(--color-text-secondary)">—</span>';
      return;
    }
    
    container.innerHTML = platesToUse.map(p => `
      <div style="width:45px;height:45px;border-radius:50%;background:var(--color-accent);color:#000;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.875rem;box-shadow:inset 0 0 0 3px rgba(0,0,0,0.1)">
        ${p}
      </div>
    `).join('');
  },

  // Show GIF in full modal
  showGifModal(exIdx) {
    const ex = this.activeWorkout.exercises[exIdx];
    const exData = Storage.getExercise(ex.exerciseId);
    if (!exData || !exData.gifUrl) return;
    Modal.show(`
      <div style="text-align:center">
        <img src="${exData.gifUrl}" alt="${exData.name}" class="exercise-gif-modal" style="margin-bottom:12px">
        <p style="color:var(--color-text-secondary);font-size:0.8125rem">${exData.primaryMuscle}${exData.secondaryMuscles?.length ? ' • ' + exData.secondaryMuscles.join(', ') : ''}</p>
      </div>
    `, { title: exData.name });
  },

  // Start a new empty workout
  startEmpty() {
    this._replaceTargetIdx = null;
    this.activeWorkout = {
      name: 'Entrenamiento',
      routineId: null,
      exercises: [],
      startedAt: new Date().toISOString(),
    };
    this.startTime = Date.now();
    this.save();
    this.requestWakeLock();
    App.navigate('workout');
  },

  // Start from routine
  startFromRoutine(routineId) {
    const routine = Storage.getRoutine(routineId);
    if (!routine) return;
    this._replaceTargetIdx = null;
    const user = Storage.getUser();
    this.activeWorkout = {
      name: routine.name,
      routineId: routine.id,
      exercises: routine.exercises.map(e => ({
        exerciseId: e.exerciseId,
        supersetId: e.supersetId || null,
        timeMode: e.timeMode || false,
        unit: user.units,
        sets: Array.from({ length: e.sets || 3 }, () => ({
          weight: null, reps: e.reps || null, type: 'normal', completed: false
        }))
      })),
      startedAt: new Date().toISOString(),
    };
    this.startTime = Date.now();
    this.save();
    this.requestWakeLock();
    App.navigate('workout');
  },

  // Resume active workout
  resume() {
    const saved = Storage.getActiveWorkout();
    if (saved) {
      this.activeWorkout = saved;
      this.startTime = new Date(saved.startedAt).getTime();
      this.requestWakeLock();
    }
  },

  workoutExLimit: 50,
  workoutActiveMuscle: 'all',

  showExercisePicker() {
    this.workoutExLimit = 50;
    this.workoutActiveMuscle = 'all';
    const groups = window.MUSCLE_GROUPS;
    let html = `
      <div class="search-bar" style="margin-bottom:12px">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" placeholder="Buscar ejercicio..." id="workout-ex-search" oninput="WorkoutScreen.updateExList()">
      </div>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <select class="input" style="flex:1" id="workout-env-filter" onchange="WorkoutScreen.updateExList()">
          <option value="all">📍 Todos</option>
          <option value="home">🏠 Casa</option>
          <option value="gym">🏢 Gym</option>
        </select>
        <select class="input" style="flex:1" id="workout-eq-filter" onchange="WorkoutScreen.updateExList()">
          <option value="all">⚙️ Todos</option>
          <option value="none">Sin impl.</option>
          <option value="with">Con impl.</option>
        </select>
      </div>
      <div style="margin-bottom:12px">
        <select class="input" style="width:100%" id="workout-muscle-filter" onchange="WorkoutScreen.setMuscleFilter(this.value)">
          <option value="all">💪 Músculo / Categoría: Todos</option>
          ${groups.filter(g => g.id !== 'cardio').map(g => `<option value="${g.id}">${g.icon} ${g.name}</option>`).join('')}
          <option disabled>──────</option>
          <option value="cardio">🏃 Cardio</option>
        </select>
      </div>
      <div style="display:flex;justify-content:flex-end;margin-bottom:8px">
        <label style="display:flex;align-items:center;gap:6px;font-size:0.875rem;cursor:pointer">
          <input type="checkbox" id="workout-fav-filter" onchange="WorkoutScreen.updateExList()"> 
          ⭐ Solo Favoritos
        </label>
      </div>
      <div id="workout-ex-list" style="max-height:50vh;overflow-y:auto;margin-top:8px"></div>`;
    Modal.show(html, { title: 'Agregar Ejercicio' });
    this.updateExList();
    setTimeout(() => { const s = document.getElementById('workout-ex-search'); if (s) s.focus(); }, 300);
  },

  setMuscleFilter(muscle) {
    this.workoutActiveMuscle = muscle;
    this.workoutExLimit = 50;
    this.updateExList();
  },

  updateExList() {
    const q = (document.getElementById('workout-ex-search')?.value || '').toLowerCase();
    const env = document.getElementById('workout-env-filter')?.value || 'all';
    const eq = document.getElementById('workout-eq-filter')?.value || 'all';
    const favFilter = document.getElementById('workout-fav-filter')?.checked || false;
    const muscle = this.workoutActiveMuscle;
    const favs = Storage.getUser().favorites || [];
    
    let list = Storage.getAllExercises();
    
    list.sort((a, b) => {
      const favA = favs.includes(a.id);
      const favB = favs.includes(b.id);
      if (favA && !favB) return -1;
      if (!favA && favB) return 1;
      return 0;
    });

    if (favFilter) list = list.filter(e => favs.includes(e.id));
    if (muscle !== 'all') list = list.filter(e => e.primaryMuscle === muscle);
    if (env !== 'all') list = list.filter(e => e.environment === env);
    if (eq !== 'all') {
      if (eq === 'none') list = list.filter(e => e.equipmentType === 'none');
      else list = list.filter(e => e.equipmentType !== 'none');
    }
    if (q) {
      const normalize = t => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const query = normalize(q);
      list = list.filter(e => normalize(e.name).includes(query));
    }

    const toRender = list.slice(0, this.workoutExLimit);
    
    let html = toRender.map(e => `
      <div class="exercise-list-item" onclick="WorkoutScreen.pickExercise('${e.id}')">
        ${e.gifUrl ? `<img src="${e.gifUrl}" alt="${e.name}" class="exercise-gif-thumb" loading="lazy" onerror="this.outerHTML='<div class=\\'exercise-gif-fallback\\'>${e.icon}</div>'">` : `<div class="exercise-gif-fallback">${e.icon}</div>`}
        <div class="exercise-info"><h4>${e.name}</h4><p>${e.primaryMuscle}</p></div>
        <button class="btn btn-ghost btn-icon sm" onclick="event.stopPropagation(); Storage.toggleFavorite('${e.id}'); WorkoutScreen.updateExList()" style="font-size:1.2rem">
          ${favs.includes(e.id) ? '⭐' : '☆'}
        </button>
      </div>`).join('');
      
    if (list.length > this.workoutExLimit) {
      html += `<button class="btn btn-secondary btn-block" style="margin-top:12px" onclick="WorkoutScreen.workoutExLimit+=50;WorkoutScreen.updateExList()">Cargar más</button>`;
    }
    if (list.length === 0) html = `<div class="empty-state"><div class="empty-state-icon" style="width:48px;height:48px;margin:0 auto 16px">${Icons.search}</div><div class="empty-state-title">Sin resultados</div></div>`;
    
    document.getElementById('workout-ex-list').innerHTML = html;
  },

  pickExercise(exerciseId) {
    const user = Storage.getUser();
    
    if (this._replaceTargetIdx !== undefined && this._replaceTargetIdx !== null) {
      // Replace mode: keep sets, change exercise
      const target = this.activeWorkout.exercises[this._replaceTargetIdx];
      target.exerciseId = exerciseId;
      target.unit = user.units;
      // Keep existing sets but reset completion
      target.sets.forEach(s => s.completed = false);
      delete target.timeMode;
      delete target.notes;
      delete target.rpe;
      this._replaceTargetIdx = null;
      Toast.show('Ejercicio reemplazado');
    } else {
      // Normal mode: add new exercise
      this.activeWorkout.exercises.push({
        exerciseId,
        unit: user.units,
        sets: [{ weight: null, reps: null, type: 'normal', completed: false }]
      });
      Toast.show('Ejercicio agregado');
    }
    this.save();
    Modal.hide();
    this.render();
  },

  replaceExercise(exIdx) {
    // Guardar referencia para reemplazar después
    this._replaceTargetIdx = exIdx;
    this.showExercisePicker();
  },

  removeExercise(exIdx) {
    this.activeWorkout.exercises.splice(exIdx, 1);
    this.save();
    this.render();
    if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
  },

  moveExercise(exIdx, direction) {
    const newIdx = exIdx + direction;
    if (newIdx < 0 || newIdx >= this.activeWorkout.exercises.length) return;
    const exercises = this.activeWorkout.exercises;
    [exercises[exIdx], exercises[newIdx]] = [exercises[newIdx], exercises[exIdx]];
    this.save();
    this.render();
  },

  toggleTimeMode(exIdx) {
    const ex = this.activeWorkout.exercises[exIdx];
    ex.timeMode = !ex.timeMode;
    this.save();
    this.render();
  },

  _activeTimer: null,
  startSetTimer(exIdx, setIdx) {
    this.stopSetTimer();
    const set = this.activeWorkout.exercises[exIdx].sets[setIdx];
    let remaining = parseInt(set.reps) || 30;
    set.reps = remaining;
    this._activeTimer = { exIdx, setIdx, interval: null };
    this.save();
    this.render();
    
    this._activeTimer.interval = setInterval(() => {
      remaining--;
      const el = document.getElementById(`set-timer-${exIdx}-${setIdx}`);
      if (el) el.textContent = remaining + 's';
      if (remaining <= 0) {
        this.stopSetTimer();
        set.completed = true;
        this.save();
        this.render();
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        Toast.show('⏱ ¡Tiempo completado!', 'success');
        const user = Storage.getUser();
        RestTimer.start(user.defaultRestTimer);
      }
    }, 1000);
  },

  stopSetTimer() {
    if (this._activeTimer && this._activeTimer.interval) {
      clearInterval(this._activeTimer.interval);
    }
    this._activeTimer = null;
  },

  showNotes(exIdx) {
    const ex = this.activeWorkout.exercises[exIdx];
    ex.notes = ex.notes || '';
    ex.rpe = ex.rpe || '';
    this.save();
    this.render();
  },

  updateExData(exIdx, field, value) {
    this.activeWorkout.exercises[exIdx][field] = value;
    this.save();
  },

  addSet(exIdx) {
    const lastSet = this.activeWorkout.exercises[exIdx].sets.slice(-1)[0];
    this.activeWorkout.exercises[exIdx].sets.push({
      weight: lastSet ? lastSet.weight : null,
      reps: lastSet ? lastSet.reps : null,
      type: 'normal', completed: false
    });
    this.save();
    this.render();
    if (navigator.vibrate) navigator.vibrate(15);
  },

  updateSet(exIdx, setIdx, field, value) {
    const v = parseFloat(value) || null;
    this.activeWorkout.exercises[exIdx].sets[setIdx][field] = v;
    this.save();
  },

  toggleSet(exIdx, setIdx) {
    const set = this.activeWorkout.exercises[exIdx].sets[setIdx];
    set.completed = !set.completed;
    
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(10);

    // Smart Autocomplete: si completamos la serie y la siguiente está vacía, copiar valores
    if (set.completed) {
      const ex = this.activeWorkout.exercises[exIdx];
      const nextSet = ex.sets[setIdx + 1];
      if (nextSet && !nextSet.completed && !nextSet.weight && !nextSet.reps) {
        nextSet.weight = set.weight;
        nextSet.reps = set.reps;
      }

      // Per-exercise timer: record startTime on first completed set
      const isFirstCompleted = !ex.startTime;
      if (isFirstCompleted) {
        ex.startTime = Date.now();
      }
      // Per-exercise timer: record endTime when last set is completed
      const allSetsCompleted = ex.sets.every(s => s.completed);
      if (allSetsCompleted) {
        ex.endTime = Date.now();
      }

      // PR Detection
      if (set.weight && set.reps) {
        const exId = ex.exerciseId;
        const history = Storage.getExerciseHistory(exId, 20);
        const currentVol = set.weight * set.reps;
        let isPR = true;
        for (const h of history) {
          for (const s of h.sets) {
            if ((s.weight || 0) * (s.reps || 0) >= currentVol) { isPR = false; break; }
          }
          if (!isPR) break;
        }
        if (isPR && history.length > 0) {
          const exData = Storage.getExercise(exId);
          const user = Storage.getUser();
          const exUnit = ex.unit || user.units;
          PRCelebration.show(exData ? exData.name : 'Ejercicio', set.weight, set.reps, exUnit);
        }
      }
    }
    
    this.save();
    this.render();

    // Micro-effect: flash the set row on completion
    if (set.completed) {
      const setRows = document.querySelectorAll(`.exercise-block[data-ex-idx="${exIdx}"] .set-row`);
      const row = setRows && setRows[setIdx];
      if (row) {
        row.classList.add('set-flash');
        setTimeout(() => row.classList.remove('set-flash'), 400);
      }
    }

    if (set.completed) {
      const user = Storage.getUser();
      
      // Smart Rest Timer logic for supersets
      const isLinkedToNext = this.activeWorkout.exercises[exIdx].supersetId && 
                             exIdx < this.activeWorkout.exercises.length - 1 && 
                             this.activeWorkout.exercises[exIdx + 1].supersetId === this.activeWorkout.exercises[exIdx].supersetId;
                             
      if (!isLinkedToNext) {
        RestTimer.start(user.defaultRestTimer);
      }
    }
  },

  cycleSetType(exIdx, setIdx) {
    const types = ['normal', 'warmup', 'drop', 'failure'];
    const set = this.activeWorkout.exercises[exIdx].sets[setIdx];
    const cur = types.indexOf(set.type);
    set.type = types[(cur + 1) % types.length];
    this.save();
    this.render();
  },

  finishWorkout() {
    if (!this.activeWorkout || !this.activeWorkout.exercises.length) {
      Toast.show('Agrega al menos un ejercicio', 'warning');
      return;
    }
    const now = new Date();
    const duration = Math.floor((now.getTime() - this.startTime) / 1000);

    // Calculate per-exercise time spent
    this.activeWorkout.exercises.forEach(ex => {
      if (ex.startTime && ex.endTime) {
        ex.timeSpent = Math.floor((ex.endTime - ex.startTime) / 1000);
      }
    });

    // Capture heart rate data before disconnecting
    const hrSummary = typeof window.BLE !== 'undefined' ? window.BLE.getSessionHRSummary() : null;
    if (typeof window.BLE !== 'undefined' && window.BLE.device) {
      window.BLE.disconnect();
    }

    const workout = {
      ...this.activeWorkout,
      finishedAt: now.toISOString(),
      duration,
      totalVolume: Storage.getTotalVolume(this.activeWorkout),
      heartRateData: hrSummary
    };
    
    // Check if we should ask to update the original routine
    const hadChanges = workout.routineId && this._hasRoutineChanges(workout);
    
    Storage.addWorkout(workout);
    Storage.clearActiveWorkout();
    this.activeWorkout = null;
    this.stopTimer();
    this.releaseWakeLock();
    RestTimer.skip();
    
    // Record rotation program progress
    if (workout.routineId) {
      Storage.recordProgramWorkout(workout.routineId);
    }
    
    this.checkAchievements(workout);
    
    if (typeof window.Gamification !== 'undefined') {
      this.lastRewards = window.Gamification.processWorkout(workout, 0);
    }
    
    this.showSummaryModal(workout, hadChanges);
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
  },

  checkAchievements(workout) {
    const user = Storage.getUser();
    if (!user.achievements) user.achievements = [];
    const workouts = Storage.getWorkouts();
    const streak = Storage.getStreak();
    const routines = Storage.getRoutines();
    const newUnlocked = [];
    const unlock = (id, name) => { if (!user.achievements.includes(id)) { user.achievements.push(id); newUnlocked.push(name); } };

    // Workout count milestones
    if (workouts.length >= 1) unlock('first_workout', 'Primer Entreno 🥉');
    if (workouts.length >= 5) unlock('five_workouts', 'Constante 🥈');
    if (workouts.length >= 25) unlock('veteran', 'Veterano 🥇');
    if (workouts.length >= 100) unlock('centurion', 'Centurión 👑');

    // Volume milestones
    if (workout.totalVolume >= 5000) unlock('heavy_lifter', 'Titán del Volumen 🏋️');
    if (workout.totalVolume >= 10000) unlock('heavy_weight', 'Peso Pesado 💪');

    // Duration
    if (workout.duration >= 5400) unlock('marathon', 'Maratón 🏃');

    // Time-based
    const hour = new Date(workout.finishedAt).getHours();
    const startHour = new Date(workout.finishedAt).getHours() - Math.floor(workout.duration / 3600);
    if (startHour <= 7 || hour <= 8) unlock('early_bird', 'Guerrero del Amanecer 🌅');
    if (hour >= 22 || startHour >= 21) unlock('night_owl', 'Búho Nocturno 🦉');

    // Streak
    if (streak >= 7) unlock('streak_7', 'Racha de 7 🔥');
    if (streak >= 30) unlock('streak_30', 'Racha de 30 ⚡');

    // Variety
    const uniqueExercises = new Set();
    workouts.forEach(w => (w.exercises || []).forEach(e => uniqueExercises.add(e.exerciseId)));
    if (uniqueExercises.size >= 10) unlock('variety', 'Variedad 🎯');

    // Superset usage
    const hasSupersets = workout.exercises.some(e => e.supersetId);
    if (hasSupersets) unlock('supersetter', 'Supersetter 🔗');

    // Routines builder
    if (routines.length >= 5) unlock('builder', 'Constructor 📋');

    // Muscle groups in one session
    const sessionMuscles = new Set();
    workout.exercises.forEach(e => { const d = Storage.getExercise(e.exerciseId); if (d) sessionMuscles.add(d.primaryMuscle); });
    if (sessionMuscles.size >= 4) unlock('full_body', 'Full Body 🦾');

    // All sets completed
    const allCompleted = workout.exercises.every(e => e.sets.every(s => s.completed));
    if (allCompleted && workout.exercises.length >= 3) unlock('iron_will', 'Iron Will 💎');

    // Consistent (3+ days/week for 4 weeks — simplified check)
    const fourWeeksAgo = new Date(); fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const recentWorkouts = workouts.filter(w => new Date(w.finishedAt) >= fourWeeksAgo);
    if (recentWorkouts.length >= 12) unlock('consistent', 'Consistente 🏆');

    // Legend — all other achievements unlocked
    const allOthers = ['first_workout','five_workouts','veteran','centurion','heavy_lifter','heavy_weight','marathon','early_bird','night_owl','streak_7','streak_30','variety','supersetter','builder','full_body','iron_will','consistent'];
    if (allOthers.every(a => user.achievements.includes(a))) unlock('legend', 'Leyenda 🌟');

    if (newUnlocked.length > 0) {
      Storage.saveUser(user);
      setTimeout(() => {
        newUnlocked.forEach((name, i) => {
          setTimeout(() => Toast.show(`¡Desbloqueaste: ${name}! 🏆`, 'success', 5000), i * 1500);
        });
      }, 1000);
    }
  },

  _hasRoutineChanges(workout) {
    const routine = Storage.getRoutine(workout.routineId);
    if (!routine) return false;
    const original = routine.exercises || [];
    const current = workout.exercises || [];
    // Check if exercise count differs
    if (original.length !== current.length) return true;
    // Check if any exercise IDs changed
    for (let i = 0; i < original.length; i++) {
      if (original[i].exerciseId !== current[i].exerciseId) return true;
    }
    // Check if sets/reps changed
    for (let i = 0; i < original.length; i++) {
      if ((original[i].sets || 0) !== (current[i].sets || []).length) return true;
      if (original[i].reps && current[i].sets[0]) {
        const curReps = current[i].sets[0].reps || 0;
        if (original[i].reps !== curReps) return true;
      }
    }
    return false;
  },

  updateRoutineFromWorkout() {
    const routineId = this._pendingRoutineUpdate;
    if (!routineId) return;
    const workout = Storage.getWorkout(this._pendingWorkoutId);
    if (!workout) return;
    const exercises = workout.exercises.map(ex => ({
      exerciseId: ex.exerciseId,
      sets: ex.sets.length,
      reps: ex.sets[0]?.reps || 10,
      restSeconds: 90
    }));
    Storage.updateRoutine(routineId, { exercises });
    Toast.show('✅ Rutina actualizada con los cambios', 'success');
    Modal.hide();
  },

  showSummaryModal(w, hadChanges) {
    const user = Storage.getUser();
    const html = `
      <div id="share-card-content" style="background:var(--color-surface);padding:24px;border-radius:16px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.5);margin-bottom:16px;position:relative;overflow:hidden">
        <div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg, var(--color-accent), #fff)"></div>
        <div style="font-size:3rem;margin-bottom:8px">🔥</div>
        <h3 style="margin-bottom:4px;font-size:1.5rem">${w.name || 'Entrenamiento'}</h3>
        <p style="color:var(--color-text-secondary);font-size:0.875rem;margin-bottom:20px">${user.name} • GravityFit</p>
        
        <div style="display:flex;gap:12px;justify-content:center;margin-bottom:20px">
          <div style="background:var(--color-surface-hover);padding:12px;border-radius:12px;flex:1">
            <div style="font-size:1.25rem;font-weight:bold;color:var(--color-text)">${HomeScreen.formatVolume(w.totalVolume, user.units)}</div>
            <div style="font-size:0.75rem;color:var(--color-text-secondary);margin-top:4px">VOLUMEN</div>
          </div>
          <div style="background:var(--color-surface-hover);padding:12px;border-radius:12px;flex:1">
            <div style="font-size:1.25rem;font-weight:bold;color:var(--color-text)">${this.formatTime(w.duration)}</div>
            <div style="font-size:0.75rem;color:var(--color-text-secondary);margin-top:4px">TIEMPO</div>
          </div>
        </div>
        
        ${w.heartRateData ? `
        <div style="display:flex;gap:12px;justify-content:center;margin-bottom:20px">
          <div style="background:var(--color-surface-hover);padding:12px;border-radius:12px;flex:1">
            <div style="font-size:1.25rem;font-weight:bold;color:var(--color-danger)">${w.heartRateData.max}</div>
            <div style="font-size:0.75rem;color:var(--color-text-secondary);margin-top:4px">FC MÁX</div>
          </div>
          <div style="background:var(--color-surface-hover);padding:12px;border-radius:12px;flex:1">
            <div style="font-size:1.25rem;font-weight:bold;color:var(--color-info)">${w.heartRateData.avg}</div>
            <div style="font-size:0.75rem;color:var(--color-text-secondary);margin-top:4px">FC PROM</div>
          </div>
          <div style="background:var(--color-surface-hover);padding:12px;border-radius:12px;flex:1">
            <div style="font-size:1.25rem;font-weight:bold;color:var(--color-warning)">${w.heartRateData.totalCalories}</div>
            <div style="font-size:0.75rem;color:var(--color-text-secondary);margin-top:4px">CAL</div>
          </div>
        </div>` : ''}
        
        <div style="text-align:left;background:var(--color-surface-hover);padding:12px;border-radius:12px;font-size:0.875rem">
          ${w.exercises.slice(0, 3).map(e => {
            const exData = Storage.getExercise(e.exerciseId);
            return `<div style="margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">✓ ${exData ? exData.name : 'Ejercicio'}</div>`;
          }).join('')}
          ${w.exercises.length > 3 ? `<div style="color:var(--color-text-secondary);margin-top:4px;font-size:0.75rem">y ${w.exercises.length - 3} ejercicios más...</div>` : ''}
        </div>
      </div>
      
      ${hadChanges ? `
      <div style="margin-bottom:12px;padding:12px;background:var(--color-accent-dim);border-radius:var(--radius-md);text-align:center">
        <p style="font-size:0.8125rem;color:var(--color-accent);font-weight:var(--font-weight-semibold);margin-bottom:8px">🔄 Detectamos cambios en los ejercicios</p>
        <button class="btn btn-primary btn-sm" onclick="WorkoutScreen._pendingRoutineUpdate='${w.routineId}';WorkoutScreen._pendingWorkoutId='${w.id}';WorkoutScreen.updateRoutineFromWorkout()">Actualizar Rutina Original</button>
      </div>` : ''}
      <div style="display:flex;gap:12px">
        <button class="btn btn-secondary flex-1" onclick="Modal.hide(); if(typeof window.Gamification !== 'undefined' && window.WorkoutScreen.lastRewards && (window.WorkoutScreen.lastRewards.newLevel || window.WorkoutScreen.lastRewards.newBadges.length > 0)) { window.Gamification.showRewardsModal(window.WorkoutScreen.lastRewards); } else { window.App.navigate('home'); }">Ir a Inicio</button>
        <button class="btn btn-primary flex-1" onclick="WorkoutScreen.shareWorkout()">Compartir 📸</button>
      </div>
    `;
    Modal.show(html, { title: '¡Misión Cumplida!' });
  },

  shareWorkout() {
    Toast.show('Generando imagen...', 'info');
    const script = document.createElement('script');
    script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
    script.onload = () => {
      const node = document.getElementById('share-card-content');
      if (!node) return;
      window.html2canvas(node, { backgroundColor: '#111827' }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'GravityFit-Workout.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        Toast.show('¡Imagen lista para IG! 🎉', 'success');
      });
    };
    document.body.appendChild(script);
  },

  confirmCancel() {
    Modal.show(`
      <p style="margin-bottom:16px;color:var(--color-text-secondary)">¿Descartar este entrenamiento? Se perderán todos los datos.</p>
      <div style="display:flex;gap:12px">
        <button class="btn btn-secondary flex-1" onclick="Modal.hide()">Volver</button>
        <button class="btn btn-danger flex-1" onclick="WorkoutScreen.cancelWorkout()">Descartar</button>
      </div>`, { title: 'Cancelar Entrenamiento', center: true });
  },
  cancelWorkout() {
    Modal.hide();
    Storage.clearActiveWorkout();
    this.activeWorkout = null;
    this.stopTimer();
    this.releaseWakeLock();
    RestTimer.skip();
    App.navigate('home');
  },

  save() {
    if (this.activeWorkout) Storage.saveActiveWorkout(this.activeWorkout);
  },

  startTimer() {
    this.stopTimer();
    this.workoutTimer = setInterval(() => {
      const el = document.getElementById('workout-elapsed');
      if (el) el.textContent = this.formatTime(this.getElapsed());
    }, 1000);
  },
  stopTimer() {
    if (this.workoutTimer) { clearInterval(this.workoutTimer); this.workoutTimer = null; }
  },
  getElapsed() {
    if (!this.startTime) return 0;
    return Math.floor((Date.now() - this.startTime) / 1000);
  },
  formatTime(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
    return `${m}:${sec.toString().padStart(2,'0')}`;
  },

  // Wake Lock — keep screen awake during active workout
  async requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await navigator.wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
        });
      }
    } catch (e) {
      Logger.warn('Wake Lock request failed:', e);
    }
  },

  releaseWakeLock() {
    try {
      if (this.wakeLock) {
        this.wakeLock.release();
        this.wakeLock = null;
      }
    } catch (e) {
      Logger.warn('Wake Lock release failed:', e);
    }
  }
};

// Re-acquire wake lock when page becomes visible again
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && WorkoutScreen.activeWorkout && !WorkoutScreen.wakeLock) {
    WorkoutScreen.requestWakeLock();
  }
});
