// ============================================
// GravityFit — Exercises Library Screen
// ============================================

import { Storage } from '../storage.js';
import { Icons, Modal, Toast, LineChart } from '../components.js';

export const ExercisesScreen = {
  activeFilter: 'all',
  activeEnvFilter: 'all',
  activeEqFilter: 'all',
  activeFavFilter: false,
  searchQuery: '',
  renderLimit: 50,

  render() {
    const container = document.getElementById('screen-exercises');
    const allEx = Storage.getAllExercises();
    const user = Storage.getUser();
    const favs = user.favorites || [];
    const filtered = this.getFiltered(allEx, favs);
    const toRender = filtered.slice(0, this.renderLimit);

    container.innerHTML = `
      <div class="screen-header">
        <h1 style="font-size:var(--font-size-2xl);font-weight:var(--font-weight-bold);margin-bottom:12px">Ejercicios</h1>
        <div class="search-bar" style="margin-bottom:12px">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Buscar ejercicio..." value="${this.searchQuery}" oninput="ExercisesScreen.search(this.value)">
        </div>
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <select class="input" style="flex:1" onchange="ExercisesScreen.filterEnv(this.value)">
            <option value="all" ${this.activeEnvFilter === 'all' ? 'selected' : ''}>📍 Lugar: Todos</option>
            <option value="home" ${this.activeEnvFilter === 'home' ? 'selected' : ''}>🏠 En Casa</option>
            <option value="gym" ${this.activeEnvFilter === 'gym' ? 'selected' : ''}>🏢 Gimnasio</option>
          </select>
          <select class="input" style="flex:1" onchange="ExercisesScreen.filterEq(this.value)">
            <option value="all" ${this.activeEqFilter === 'all' ? 'selected' : ''}>⚙️ Equipo: Todos</option>
            <option value="none" ${this.activeEqFilter === 'none' ? 'selected' : ''}>Sin implementos</option>
            <option value="with" ${this.activeEqFilter === 'with' ? 'selected' : ''}>Con implementos</option>
          </select>
        </div>
        <div style="margin-bottom:16px">
          <select class="input" style="width:100%" onchange="ExercisesScreen.filter(this.value)">
            <option value="all" ${this.activeFilter === 'all' ? 'selected' : ''}>💪 Músculo / Categoría: Todos</option>
            ${window.MUSCLE_GROUPS.filter(g => g.id !== 'cardio').map(g => `<option value="${g.id}" ${this.activeFilter === g.id ? 'selected' : ''}>${g.icon} ${g.name}</option>`).join('')}
            <option disabled>──────</option>
            <option value="cardio" ${this.activeFilter === 'cardio' ? 'selected' : ''}>🏃 Cardio</option>
          </select>
        </div>
      </div>
      <div class="screen-content">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:var(--font-size-sm);color:var(--color-text-secondary)">${filtered.length} ejercicios</span>
          <div style="display:flex;gap:8px">
            <button class="btn btn-outline btn-sm ${this.activeFavFilter ? 'active' : ''}" onclick="ExercisesScreen.toggleFavFilter()">⭐ Favoritos</button>
            <button class="btn btn-ghost btn-sm" onclick="ExercisesScreen.showCreateForm()">+ Crear</button>
          </div>
        </div>
        ${toRender.map(e => `
          <div class="exercise-list-item" onclick="ExercisesScreen.showDetail('${e.id}')">
            ${this.renderThumb(e)}
            <div class="exercise-info">
              <h4>${e.name}</h4>
              <p>${e.primaryMuscle}${e.secondaryMuscles && e.secondaryMuscles.length ? ' • ' + e.secondaryMuscles.join(', ') : ''}</p>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              ${e.isCustom ? '<span class="badge badge-sm">Custom</span>' : ''}
              <button class="btn btn-ghost btn-icon sm" onclick="event.stopPropagation(); ExercisesScreen.toggleFav('${e.id}')" style="font-size:1.2rem">
                ${favs.includes(e.id) ? '⭐' : '☆'}
              </button>
            </div>
          </div>
        `).join('')}
        ${filtered.length > this.renderLimit ? `<button class="btn btn-secondary btn-block" style="margin-top:12px" onclick="ExercisesScreen.loadMore()">Cargar más (${filtered.length - this.renderLimit} restantes)</button>` : ''}
        ${filtered.length === 0 ? `<div class="empty-state"><div class="empty-state-icon" style="width:48px;height:48px;margin:0 auto 16px">${Icons.search}</div><div class="empty-state-title">Sin resultados</div></div>` : ''}
      </div>`;
  },

  renderThumb(e) {
    if (e.gifUrl) {
      return `<img src="${e.gifUrl}" alt="${e.name}" class="exercise-gif-thumb" loading="lazy" onerror="this.outerHTML='<div class=\\'exercise-gif-fallback\\'>${e.icon}</div>'">`;
    }
    return `<div class="exercise-gif-fallback">${e.icon}</div>`;
  },

  getFiltered(allEx, favs) {
    let list = [...allEx];
    
    list.sort((a, b) => {
      const favA = favs.includes(a.id);
      const favB = favs.includes(b.id);
      if (favA && !favB) return -1;
      if (!favA && favB) return 1;
      return 0;
    });

    if (this.activeFavFilter) {
      list = list.filter(e => favs.includes(e.id));
    }
    if (this.activeFilter !== 'all') {
      list = list.filter(e => e.primaryMuscle === this.activeFilter);
    }
    if (this.activeEnvFilter !== 'all') {
      list = list.filter(e => e.environment === this.activeEnvFilter);
    }
    if (this.activeEqFilter !== 'all') {
      if (this.activeEqFilter === 'none') {
        list = list.filter(e => e.equipmentType === 'none');
      } else {
        list = list.filter(e => e.equipmentType !== 'none');
      }
    }
    if (this.searchQuery) {
      const normalize = t => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const q = normalize(this.searchQuery);
      list = list.filter(e => {
        if (normalize(e.name).includes(q)) return true;
        if (normalize(e.primaryMuscle).includes(q)) return true;
        if (e.secondaryMuscles && e.secondaryMuscles.some(m => normalize(m).includes(q))) return true;
        return false;
      });
    }
    return list;
  },

  loadMore() {
    this.renderLimit += 50;
    this.render();
  },

  search(q) {
    this.searchQuery = q;
    this.renderLimit = 50;
    this.render();
    // Restore focus and cursor position after full re-render
    const input = document.querySelector('#screen-exercises .search-bar input');
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  },

  filter(muscle) {
    this.activeFilter = muscle;
    this.renderLimit = 50;
    this.render();
  },

  filterEnv(env) {
    this.activeEnvFilter = env;
    this.renderLimit = 50;
    this.render();
  },

  filterEq(eq) {
    this.activeEqFilter = eq;
    this.renderLimit = 50;
    this.render();
  },

  toggleFavFilter() {
    this.activeFavFilter = !this.activeFavFilter;
    this.renderLimit = 50;
    this.render();
  },

  toggleFav(id) {
    Storage.toggleFavorite(id);
    if (navigator.vibrate) navigator.vibrate(10);
    this.render();
  },

  currentDetailId: null,
  chartMode: 'weight',

  showDetail(id, mode = 'weight') {
    this.currentDetailId = id;
    this.chartMode = mode;
    const e = Storage.getExercise(id);
    if (!e) return;
    const prs = Storage.getPersonalRecords(id);
    const user = Storage.getUser();

    // Calculate progress data for the chart
    const workouts = Storage.getWorkouts();
    const history = [];
    const sortedWorkouts = [...workouts].reverse();
    
    sortedWorkouts.forEach(w => {
      const exData = w.exercises.find(ex => ex.exerciseId === id);
      if (exData && exData.sets) {
        let maxWeight = 0;
        let totalVol = 0;
        exData.sets.forEach(s => {
          if (s.completed && s.weight) {
            maxWeight = Math.max(maxWeight, parseFloat(s.weight));
            totalVol += parseFloat(s.weight) * (parseInt(s.reps)||0);
          }
        });
        if (maxWeight > 0) {
          const dateStr = new Date(w.endTime || w.startTime).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
          history.push({ date: dateStr, maxWeight, totalVol });
        }
      }
    });

    const recentHistory = history.slice(-10);
    
    let chartHtml = '';
    if (recentHistory.length > 1) {
      const chartData = recentHistory.map(h => ({
        label: h.date,
        value: this.chartMode === 'weight' ? h.maxWeight : h.totalVol
      }));
      
      chartHtml = `
        <div style="margin-top:16px;margin-bottom:16px;padding:16px;background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:var(--radius-lg)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <h4 style="font-size:0.875rem;color:var(--color-text-primary);font-weight:600">Progreso</h4>
            <div style="display:flex;background:var(--color-bg-input);border-radius:var(--radius-full);padding:2px">
              <button class="btn btn-ghost btn-sm" style="padding:4px 10px;font-size:0.75rem;${this.chartMode==='weight'?'background:var(--color-surface-hover);color:var(--color-text-primary)':'color:var(--color-text-tertiary)'}" onclick="ExercisesScreen.showDetail('${id}', 'weight')">Peso Max</button>
              <button class="btn btn-ghost btn-sm" style="padding:4px 10px;font-size:0.75rem;${this.chartMode==='volume'?'background:var(--color-surface-hover);color:var(--color-text-primary)':'color:var(--color-text-tertiary)'}" onclick="ExercisesScreen.showDetail('${id}', 'volume')">Volumen</button>
            </div>
          </div>
          ${LineChart.render(chartData, { height: 130, curved: true, color: 'var(--color-accent)' })}
        </div>
      `;
    }

    Modal.show(`
      <div style="text-align:center;margin-bottom:16px">
        ${e.gifUrl ? `<img src="${e.gifUrl}" alt="${e.name}" class="exercise-gif-modal" onerror="this.outerHTML='<div style=\\'font-size:4rem;padding:24px\\'>${e.icon}</div>'">` : `<div style="font-size:4rem;padding:24px">${e.icon}</div>`}
        <div style="font-size:0.75rem;color:var(--color-text-secondary);text-transform:capitalize;margin-top:12px">${e.primaryMuscle}${e.secondaryMuscles && e.secondaryMuscles.length ? ' • ' + e.secondaryMuscles.join(', ') : ''}</div>
      </div>
      ${chartHtml}
      ${prs.maxWeight > 0 ? `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
        <div class="stat-card">
          <div class="stat-value">${prs.maxWeight}</div>
          <div class="stat-label">Peso Max (${user.units})</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${prs.max1RM}</div>
          <div class="stat-label">1RM Est.</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${prs.maxVolume}</div>
          <div class="stat-label">Vol. Max</div>
        </div>
      </div>` : '<p style="text-align:center;color:var(--color-text-tertiary);font-size:0.8125rem;margin-bottom:16px">Aún sin registros para este ejercicio</p>'}
      ${e.isCustom ? `<button class="btn btn-danger btn-block" onclick="ExercisesScreen.deleteCustom('${id}')">Eliminar Ejercicio</button>` : ''}
    `, { title: e.name });
  },

  showCreateForm() {
    Modal.show(`
      <div class="input-group" style="margin-bottom:12px">
        <label class="input-label">Nombre</label>
        <input class="input" id="new-ex-name" placeholder="Nombre del ejercicio">
      </div>
      <div class="input-group" style="margin-bottom:12px">
        <label class="input-label">Grupo Muscular Principal</label>
        <select class="input" id="new-ex-muscle" style="padding-right:12px">
          ${window.MUSCLE_GROUPS.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
        </select>
      </div>
      <div class="input-group" style="margin-bottom:16px">
        <label class="input-label">Emoji / Icono</label>
        <input class="input" id="new-ex-icon" value="🏋️" style="width:80px;text-align:center;font-size:1.5rem">
      </div>
      <div style="display:flex;gap:12px">
        <button class="btn btn-secondary flex-1" onclick="Modal.hide()">Cancelar</button>
        <button class="btn btn-primary flex-1" onclick="ExercisesScreen.saveCustom()">Guardar</button>
      </div>
    `, { title: 'Crear Ejercicio' });
  },

  saveCustom() {
    const name = document.getElementById('new-ex-name')?.value.trim();
    const muscle = document.getElementById('new-ex-muscle')?.value;
    const icon = document.getElementById('new-ex-icon')?.value || '🏋️';
    if (!name) { Toast.show('Agrega un nombre', 'warning'); return; }
    Storage.addCustomExercise({ name, primaryMuscle: muscle, secondaryMuscles: [], icon });
    Modal.hide();
    Toast.show('Ejercicio creado');
    if (navigator.vibrate) navigator.vibrate(15);
    this.render();
  },

  deleteCustom(id) {
    Storage.deleteCustomExercise(id);
    Modal.hide();
    Toast.show('Ejercicio eliminado');
    if (navigator.vibrate) navigator.vibrate(10);
    this.render();
  }
};
