// ============================================
// GravityFit — Routines Screen
// ============================================

import { Storage } from '../storage.js';
import { Icons, Modal, Toast } from '../components.js';
import { App } from '../app.js';

export const RoutinesScreen = {
  render() {
    const container = document.getElementById('screen-routines');
    const routines = Storage.getRoutines();

    container.innerHTML = `
      <div class="screen-header">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <h1 style="font-size:var(--font-size-2xl);font-weight:var(--font-weight-bold)">Rutinas</h1>
          <div style="display:flex;gap:8px">
            <button class="btn btn-outline btn-sm" onclick="RoutinesScreen.showImportForm()">Importar</button>
            <button class="btn btn-primary btn-sm" onclick="RoutinesScreen.showCreateForm()">+ Nueva</button>
          </div>
        </div>
      </div>
      <button class="btn btn-block" style="margin: 0 16px 16px; width: calc(100% - 32px); background: linear-gradient(135deg, #A78BFA, var(--color-accent)); color:#000; border:none; padding:12px; font-weight:bold; box-shadow: 0 4px 15px rgba(167,139,250,0.3);" onclick="AICoach.startAiWorkout()">
        <span style="font-size:1.2rem; margin-right:8px;">🧠</span> Generar Entrenamiento Inteligente
      </button>
      <div class="screen-content">
        ${this.renderProgramsSection(routines)}
        <div style="display:flex;align-items:center;justify-content:space-between;margin:16px 0 8px">
          <h2 style="font-size:var(--font-size-lg);font-weight:var(--font-weight-bold)">Mis Rutinas</h2>
          <button class="btn btn-secondary btn-sm" onclick="RoutinesScreen.showTemplatesGallery()">Explorar Templates</button>
        </div>
        ${this.renderRoutinesList(routines)}
      </div>`;
  },

  renderRoutinesList(routines) {
    if (!routines.length) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon" style="width:48px;height:48px;margin:0 auto 16px">${Icons.fileText}</div>
          <div class="empty-state-title">Sin rutinas</div>
          <div class="empty-state-text">Crea una rutina para organizar tus entrenamientos y empezar más rápido</div>
          <button class="btn btn-primary" onclick="RoutinesScreen.showCreateForm()" style="margin-top:12px">Crear Primera Rutina</button>
        </div>`;
    }
    
    // Group by folder
    const groups = { 'Sin Carpeta': [] };
    routines.forEach(r => {
      const f = r.folder || 'Sin Carpeta';
      if (!groups[f]) groups[f] = [];
      groups[f].push(r);
    });

    let html = '';
    for (const [folder, list] of Object.entries(groups)) {
      if (!list.length) continue;
      const isDefault = folder === 'Sin Carpeta';
      html += `
        <div class="folder-section ${isDefault ? '' : 'collapsed'}" onclick="this.classList.toggle('collapsed')">
          <div class="folder-header">
            <div class="folder-header-left">
              <span class="folder-icon">📁</span>
              <span class="folder-name">${folder}</span>
              <span class="folder-count">${list.length}</span>
            </div>
            <div style="display:flex;align-items:center;gap:4px">
              ${isDefault ? '' : `<button class="btn btn-ghost btn-icon folder-rename-btn" onclick="event.stopPropagation();RoutinesScreen.showRenameFolder('${folder}')" title="Renombrar carpeta">✏️</button>`}
              <span class="folder-chevron">▼</span>
            </div>
          </div>
          <div class="folder-content" onclick="event.stopPropagation()">
            ${list.map(r => this.renderRoutineCard(r)).join('')}
          </div>
        </div>
      `;
    }
    return html;
  },

  renderRoutineCard(routine) {
    const exercises = (routine.exercises || []);
    const exNames = exercises.map(e => {
      const d = Storage.getExercise(e.exerciseId);
      return d ? d.name : e.exerciseId;
    }).slice(0, 4);
    const more = exercises.length > 4 ? ` +${exercises.length - 4} más` : '';
    const folderTag = routine.folder
      ? `<span class="routine-folder-tag" onclick="event.stopPropagation();RoutinesScreen.showMoveFolder('${routine.id}')">📁 ${routine.folder}</span>`
      : `<span class="routine-folder-tag routine-folder-tag--empty" onclick="event.stopPropagation();RoutinesScreen.showMoveFolder('${routine.id}')">+ Carpeta</span>`;

    return `
      <div class="routine-card">
        <div class="routine-card-header">
          <h3>${routine.name}</h3>
          <div style="display:flex;gap:4px">
            <button class="btn btn-ghost btn-icon sm" onclick="event.stopPropagation();RoutinesScreen.exportRoutine('${routine.id}')" title="Exportar">🔗</button>
            <button class="btn btn-ghost btn-icon sm" onclick="event.stopPropagation();RoutinesScreen.showEditForm('${routine.id}')" title="Editar">✏️</button>
            <button class="btn btn-ghost btn-icon sm" onclick="event.stopPropagation();RoutinesScreen.confirmDelete('${routine.id}')" title="Eliminar">🗑️</button>
          </div>
        </div>
        <div class="routine-card-exercises">${exNames.join(', ')}${more}</div>
        <div class="routine-card-meta">
          <span>${exercises.length} ejercicios</span>
          <span>•</span>
          <span>${exercises.reduce((s, e) => s + (e.sets || 0), 0)} series</span>
          <span style="margin-left:auto">${folderTag}</span>
        </div>
        <button class="btn btn-primary btn-block" style="margin-top:12px" onclick="event.stopPropagation();App.startRoutineWorkout('${routine.id}')">
          Iniciar Rutina
        </button>
      </div>`;
  },

  // Routine builder state
  builderExercises: [],

  showCreateForm() {
    this.builderExercises = [];
    this.renderBuilder('Crear Rutina', '', null);
  },

  showEditForm(id) {
    const routine = Storage.getRoutine(id);
    if (!routine) return;
    this.builderExercises = [...routine.exercises];
    this.renderBuilder('Editar Rutina', routine.name, id, routine.folder || '');
  },

  renderBuilder(title, name, editId, folder = '') {
    const folders = Storage.getRoutineFolders();
    const html = `
      <div class="input-group" style="margin-bottom:12px">
        <label class="input-label">Nombre de la Rutina</label>
        <input class="input" id="routine-name-input" value="${name}" placeholder="Ej: Push Day, Piernas...">
      </div>
      <div class="input-group" style="margin-bottom:16px">
        <label class="input-label">Carpeta (Opcional)</label>
        <input class="input" id="routine-folder-input" value="${folder}" list="folder-list" placeholder="Ej: Push/Pull/Legs">
        <datalist id="folder-list">
          ${folders.map(f => `<option value="${f}">`).join('')}
        </datalist>
      </div>
      <div id="routine-builder-exercises">
        ${this.renderBuilderExercises()}
      </div>
      <button class="workout-add-exercise" onclick="RoutinesScreen.showAddExercise()" style="margin-top:8px;margin-bottom:16px">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Agregar Ejercicio
      </button>
      <div style="display:flex;gap:12px">
        <button class="btn btn-secondary flex-1" onclick="Modal.hide()">Cancelar</button>
        <button class="btn btn-primary flex-1" onclick="RoutinesScreen.saveRoutine('${editId || ''}')">Guardar</button>
      </div>`;
    Modal.show(html, { title });
  },

  renderBuilderExercises() {
    if (!this.builderExercises.length) return '<p style="text-align:center;color:var(--color-text-tertiary);padding:16px;font-size:0.8125rem">Agrega ejercicios a tu rutina</p>';
    
    let html = '';
    let currentSupersetId = null;

    this.builderExercises.forEach((e, i) => {
      const d = Storage.getExercise(e.exerciseId);
      const name = d ? d.name : e.exerciseId;
      const gifUrl = d ? d.gifUrl : null;
      const icon = d ? d.icon : '🏋️';

      const isFirstInSuperset = e.supersetId && currentSupersetId !== e.supersetId;
      const isLinkedToNext = e.supersetId && i < this.builderExercises.length - 1 && this.builderExercises[i + 1].supersetId === e.supersetId;
      const isLinkedToPrev = e.supersetId && i > 0 && this.builderExercises[i - 1].supersetId === e.supersetId;
      currentSupersetId = e.supersetId || null;

      const linkBtn = i > 0 ? `<button class="btn btn-ghost btn-icon sm" style="opacity: ${isLinkedToPrev ? '1;color:var(--color-accent)' : '0.3'};font-size:1.1rem;margin-right:-4px" onclick="RoutinesScreen.toggleSuperset(${i})" title="Vincular con el anterior">🔗</button>` : '';

      if (isFirstInSuperset) {
        html += `<div style="border-left:3px solid var(--color-accent);padding-left:12px;margin-left:2px;margin-bottom:8px;position:relative">
                 <div style="position:absolute;left:-8px;top:50%;transform:translateY(-50%);font-size:0.6rem;background:var(--color-bg);color:var(--color-accent);padding:8px 0;writing-mode:vertical-rl;text-orientation:mixed;letter-spacing:2px;font-weight:bold;border-radius:4px">SUPERSET</div>`;
      }

      html += `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 0;${isLinkedToNext ? 'border-bottom:1px dashed rgba(255,255,255,0.1);' : 'border-bottom:1px solid var(--color-border);'}">
          ${linkBtn}
          ${gifUrl ? `<img src="${gifUrl}" alt="${name}" class="exercise-gif-thumb" loading="lazy" style="width:36px;height:36px" onerror="this.outerHTML='<div class=\\'exercise-gif-fallback\\' style=\\'width:36px;height:36px;font-size:1rem\\'>${icon}</div>'">` : `<div class="exercise-gif-fallback" style="width:36px;height:36px;font-size:1rem">${icon}</div>`}
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:0.875rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
            <input type="number" class="input input-number" value="${e.sets || 3}" min="1" style="width:48px"
              onchange="RoutinesScreen.builderExercises[${i}].sets=parseInt(this.value)||3" inputmode="numeric">
            <span style="color:var(--color-text-tertiary);font-size:0.75rem">×</span>
            <input type="number" class="input input-number" value="${e.reps || 10}" min="1" style="width:48px"
              onchange="RoutinesScreen.builderExercises[${i}].reps=parseInt(this.value)||10" inputmode="numeric">
          </div>
          <button class="btn btn-ghost btn-icon sm" onclick="RoutinesScreen.removeBuilderExercise(${i})">✕</button>
        </div>`;

      if (e.supersetId && !isLinkedToNext) {
        html += `</div>`;
      }
    });
    return html;
  },

  toggleSuperset(idx) {
    if (idx === 0) return;
    const curr = this.builderExercises[idx];
    const prev = this.builderExercises[idx - 1];
    
    if (curr.supersetId && curr.supersetId === prev.supersetId) {
      curr.supersetId = null;
    } else {
      if (!prev.supersetId) {
        prev.supersetId = 'ss_' + Date.now();
      }
      curr.supersetId = prev.supersetId;
    }
    const el = document.getElementById('routine-builder-exercises');
    if (el) el.innerHTML = this.renderBuilderExercises();
  },

  routineExLimit: 50,
  routineActiveMuscle: 'all',

  showAddExercise() {
    this.routineExLimit = 50;
    this.routineActiveMuscle = 'all';
    const groups = window.MUSCLE_GROUPS;
    const html = `
      <div class="search-bar" style="margin-bottom:12px">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" placeholder="Buscar..." id="routine-ex-search" oninput="RoutinesScreen.updateExList()">
      </div>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <select class="input" style="flex:1" id="routine-env-filter" onchange="RoutinesScreen.updateExList()">
          <option value="all">📍 Todos</option>
          <option value="home">🏠 Casa</option>
          <option value="gym">🏢 Gym</option>
        </select>
        <select class="input" style="flex:1" id="routine-eq-filter" onchange="RoutinesScreen.updateExList()">
          <option value="all">⚙️ Todos</option>
          <option value="none">Sin impl.</option>
          <option value="with">Con impl.</option>
        </select>
      </div>
      <div style="margin-bottom:12px">
        <select class="input" style="width:100%" id="routine-muscle-filter" onchange="RoutinesScreen.routineActiveMuscle=this.value;RoutinesScreen.updateExList()">
          <option value="all">💪 Músculo / Categoría: Todos</option>
          ${groups.filter(g => g.id !== 'cardio').map(g => `<option value="${g.id}">${g.icon} ${g.name}</option>`).join('')}
          <option disabled>──────</option>
          <option value="cardio">🏃 Cardio</option>
        </select>
      </div>
      <div style="display:flex;justify-content:flex-end;margin-bottom:8px">
        <label style="display:flex;align-items:center;gap:6px;font-size:0.875rem;cursor:pointer">
          <input type="checkbox" id="routine-fav-filter" onchange="RoutinesScreen.updateExList()"> 
          ⭐ Solo Favoritos
        </label>
      </div>
      <div id="routine-ex-list" style="max-height:50vh;overflow-y:auto"></div>
    `;
    Modal.show(html, { title: 'Seleccionar Ejercicio' });
    this.updateExList();
  },

  updateExList() {
    const q = (document.getElementById('routine-ex-search')?.value || '').toLowerCase();
    const env = document.getElementById('routine-env-filter')?.value || 'all';
    const eq = document.getElementById('routine-eq-filter')?.value || 'all';
    const favFilter = document.getElementById('routine-fav-filter')?.checked || false;
    const muscle = this.routineActiveMuscle;
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

    const toRender = list.slice(0, this.routineExLimit);
    
    let html = toRender.map(e => `
      <div class="exercise-list-item" onclick="RoutinesScreen.addBuilderExercise('${e.id}')">
        ${e.gifUrl ? `<img src="${e.gifUrl}" alt="${e.name}" class="exercise-gif-thumb" loading="lazy" onerror="this.outerHTML='<div class=\\'exercise-gif-fallback\\'>${e.icon}</div>'">` : `<div class="exercise-gif-fallback">${e.icon}</div>`}
        <div class="exercise-info"><h4>${e.name}</h4><p>${e.primaryMuscle}</p></div>
        <button class="btn btn-ghost btn-icon sm" onclick="event.stopPropagation(); Storage.toggleFavorite('${e.id}'); RoutinesScreen.updateExList()" style="font-size:1.2rem">
          ${favs.includes(e.id) ? '⭐' : '☆'}
        </button>
      </div>`).join('');
      
    if (list.length > this.routineExLimit) {
      html += `<button class="btn btn-secondary btn-block" style="margin-top:12px" onclick="RoutinesScreen.routineExLimit+=50;RoutinesScreen.updateExList()">Cargar más</button>`;
    }
    if (list.length === 0) html = `<div class="empty-state"><div class="empty-state-icon" style="width:48px;height:48px;margin:0 auto 16px">${Icons.search}</div><div class="empty-state-title">Sin resultados</div></div>`;
    
    document.getElementById('routine-ex-list').innerHTML = html;
  },

  addBuilderExercise(exerciseId) {
    this.builderExercises.push({ exerciseId, sets: 3, reps: 10, restSeconds: 90 });
    // Go back to builder
    const name = document.getElementById('routine-name-input')?.value || '';
    Modal.hide();
    setTimeout(() => {
      this.renderBuilder(
        this.builderExercises.length ? 'Editar Rutina' : 'Crear Rutina',
        name, null
      );
    }, 100);
  },

  removeBuilderExercise(idx) {
    this.builderExercises.splice(idx, 1);
    const el = document.getElementById('routine-builder-exercises');
    if (el) el.innerHTML = this.renderBuilderExercises();
  },

  saveRoutine(editId) {
    const nameInput = document.getElementById('routine-name-input');
    const folderInput = document.getElementById('routine-folder-input');
    const name = nameInput ? nameInput.value.trim() : '';
    const folder = folderInput ? folderInput.value.trim() : '';
    
    if (!name) { Toast.show('Agrega un nombre', 'warning'); return; }
    if (!this.builderExercises.length) { Toast.show('Agrega al menos un ejercicio', 'warning'); return; }

    if (editId) {
      Storage.updateRoutine(editId, { name, folder, exercises: this.builderExercises });
      Toast.show('Rutina actualizada');
    } else {
      Storage.addRoutine({ name, folder, exercises: this.builderExercises, isFavorite: false });
      Toast.show('Rutina creada 🎉');
    }
    if (navigator.vibrate) navigator.vibrate(15);
    Modal.hide();
    this.render();
  },

  confirmDelete(id) {
    Modal.show(`
      <p style="margin-bottom:16px;color:var(--color-text-secondary)">¿Estás seguro de que deseas eliminar esta rutina?</p>
      <div style="display:flex;gap:12px">
        <button class="btn btn-secondary flex-1" onclick="Modal.hide()">Cancelar</button>
        <button class="btn btn-danger flex-1" onclick="RoutinesScreen.deleteRoutine('${id}')">Eliminar</button>
      </div>`, { title: 'Eliminar Rutina', center: true });
  },

  deleteRoutine(id) {
    Storage.deleteRoutine(id);
    Modal.hide();
    Toast.show('Rutina eliminada');
    this.render();
  },

  exportRoutine(id) {
    const routine = Storage.getRoutine(id);
    if (!routine) return;
    const shareable = btoa(encodeURIComponent(JSON.stringify(routine)));
    const code = 'GFIT-' + shareable;
    
    Modal.show(`
      <div style="text-align:center">
        <p style="margin-bottom:16px;color:var(--color-text-secondary);font-size:0.875rem">Copia este código y envíaselo a un amigo para compartir tu rutina.</p>
        <textarea class="input" style="width:100%;height:100px;font-family:monospace;font-size:0.75rem;margin-bottom:16px" readonly id="export-code-textarea">${code}</textarea>
        <button class="btn btn-primary btn-block" onclick="RoutinesScreen.copyCode()">Copiar Código</button>
      </div>
    `, { title: 'Compartir Rutina' });
  },

  showMoveFolder(id) {
    const routine = Storage.getRoutine(id);
    if (!routine) return;
    const folders = Storage.getRoutineFolders();
    const currentFolder = routine.folder || '';
    
    Modal.show(`
      <p style="margin-bottom:16px;color:var(--color-text-secondary);font-size:0.875rem">
        Asigna o cambia la carpeta de <strong>${routine.name}</strong>
      </p>
      <div class="input-group" style="margin-bottom:16px">
        <label class="input-label">Carpeta</label>
        <input class="input" id="move-folder-input" value="${currentFolder}" list="move-folder-list" placeholder="Ej: Push/Pull/Legs" autofocus>
        <datalist id="move-folder-list">
          ${folders.map(f => `<option value="${f}">`).join('')}
        </datalist>
      </div>
      <div style="display:flex;gap:12px">
        <button class="btn btn-secondary flex-1" onclick="Modal.hide()">Cancelar</button>
        ${currentFolder ? `<button class="btn btn-ghost" onclick="RoutinesScreen.removeFolderFromRoutine('${id}')">Quitar de carpeta</button>` : ''}
        <button class="btn btn-primary flex-1" onclick="RoutinesScreen.saveMoveFolder('${id}')">Guardar</button>
      </div>
    `, { title: '📁 Mover a Carpeta', center: true });
    
    setTimeout(() => {
      const input = document.getElementById('move-folder-input');
      if (input) input.focus();
    }, 200);
  },

  saveMoveFolder(id) {
    const folder = document.getElementById('move-folder-input')?.value.trim() || '';
    Storage.updateRoutine(id, { folder });
    Toast.show(folder ? '📁 Rutina movida a carpeta' : '📁 Carpeta eliminada');
    Modal.hide();
    this.render();
  },

  removeFolderFromRoutine(id) {
    Storage.updateRoutine(id, { folder: '' });
    Toast.show('📁 Carpeta eliminada');
    Modal.hide();
    this.render();
  },

  // Rename folder
  showRenameFolder(oldName) {
    Modal.show(`
      <p style="margin-bottom:16px;color:var(--color-text-secondary);font-size:0.875rem">
        Renombrar carpeta <strong>${oldName}</strong> — se actualizarán todas las rutinas que la usan.
      </p>
      <div class="input-group" style="margin-bottom:16px">
        <label class="input-label">Nuevo nombre</label>
        <input class="input" id="rename-folder-input" value="${oldName}" placeholder="Ej: Push/Pull/Legs" autofocus>
      </div>
      <div style="display:flex;gap:12px">
        <button class="btn btn-secondary flex-1" onclick="Modal.hide()">Cancelar</button>
        <button class="btn btn-primary flex-1" onclick="RoutinesScreen.saveRenameFolder('${oldName}')">Guardar</button>
      </div>
    `, { title: '✏️ Renombrar Carpeta', center: true });
    
    setTimeout(() => {
      const input = document.getElementById('rename-folder-input');
      if (input) { input.focus(); input.select(); }
    }, 200);
  },

  saveRenameFolder(oldName) {
    const newName = document.getElementById('rename-folder-input')?.value.trim();
    if (!newName) { Toast.show('Ingresa un nombre', 'warning'); return; }
    if (newName === oldName) { Modal.hide(); return; }
    
    const routines = Storage.getRoutines();
    routines.forEach(r => {
      if (r.folder === oldName) r.folder = newName;
    });
    Storage.saveRoutines(routines);
    
    Toast.show(`📁 Carpeta renombrada a "${newName}"`);
    Modal.hide();
    this.render();
  },

  copyCode() {
    const el = document.getElementById('export-code-textarea');
    if (el) {
      el.select();
      document.execCommand('copy');
      Toast.show('Código copiado al portapapeles');
    }
  },

  showImportForm() {
    Modal.show(`
      <div style="text-align:center">
        <p style="margin-bottom:16px;color:var(--color-text-secondary);font-size:0.875rem">Pega el código que te compartieron para añadir la rutina.</p>
        <textarea class="input" id="import-code-input" style="width:100%;height:100px;font-family:monospace;font-size:0.75rem;margin-bottom:16px" placeholder="GFIT-..."></textarea>
        <div style="display:flex;gap:12px">
          <button class="btn btn-secondary flex-1" onclick="Modal.hide()">Cancelar</button>
          <button class="btn btn-primary flex-1" onclick="RoutinesScreen.importRoutine()">Importar</button>
        </div>
      </div>
    `, { title: 'Importar Rutina' });
  },

  importRoutine() {
    const code = document.getElementById('import-code-input')?.value.trim();
    if (!code || !code.startsWith('GFIT-')) {
      Toast.show('Código inválido', 'error');
      return;
    }
    try {
      const base64 = code.replace('GFIT-', '');
      const json = decodeURIComponent(atob(base64));
      const routine = JSON.parse(json);
      if (routine.name && routine.exercises) {
        routine.id = Storage.uuid ? Storage.uuid() : Date.now().toString();
        routine.createdAt = new Date().toISOString();
        const routines = Storage.getRoutines();
        routines.unshift(routine);
        Storage.saveRoutines(routines);
        Toast.show('¡Rutina importada con éxito! 🎉');
        if (navigator.vibrate) navigator.vibrate(15);
        Modal.hide();
        this.render();
      } else {
        throw new Error('Invalid format');
      }
    } catch (e) {
      Toast.show('El código de la rutina está corrupto', 'error');
    }
  },

  // ==========================================
  // FEATURE G: Drag-and-Drop Weekly Planner
  // ==========================================
  _draggedRoutineId: null,
  _dropDay: null,
  _dragOverDay: null,

  startDragPlanner() {
    const routines = Storage.getRoutines();
    this._plannerRoutines = [...routines];
    this._plannerSchedule = []; // Array of { day: 0-6, routineId: string }
    
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    
    Modal.show(`
      <div style="margin-bottom:16px">
        <p style="font-size:0.85rem;color:var(--color-text-secondary);margin-bottom:16px">Arrastra las rutinas a los días de la semana para planificar tu programa visualmente.</p>
        <div id="planner-week" style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:16px">
          ${dayNames.map((d, i) => `
            <div class="planner-day-slot" data-day="${i}" 
              ondrop="RoutinesScreen.onDrop(event, ${i})" dragover="RoutinesScreen.onDragOver(event, ${i})" dragleave="RoutinesScreen.onDragLeave(event)">
              <div class="planner-day-header" style="font-size:0.6rem;text-align:center;text-transform:uppercase;color:var(--color-text-tertiary);margin-bottom:6px">${d}</div>
              <div class="planner-day-content" id="planner-day-${i}" style="min-height:60px">
                <div class="planner-empty-slot">+</div>
              </div>
            </div>
          `).join('')}
        </div>
        <div style="margin-bottom:8px">
          <label class="input-label">Nombre del Programa</label>
          <input class="input" id="planner-name" placeholder="Ej: Mi Programa Semanal" value="Programa Visual">
        </div>
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <div style="flex:1">
            <label class="input-label">Semanas</label>
            <select class="input" id="planner-weeks">
              ${[4,6,8,10,12].map(w => `<option value="${w}">${w}</option>`).join('')}
            </select>
          </div>
          <div style="flex:1">
            <label class="input-label">Progresión</label>
            <select class="input" id="planner-progression">
              <option value="weight">+Peso</option>
              <option value="reps">+Reps</option>
              <option value="free">Libre</option>
            </select>
          </div>
        </div>
      </div>
      
      <div class="input-group" style="margin-bottom:16px">
        <label class="input-label">Tus Rutinas — Arrástralas</label>
        <div id="planner-routines" style="display:flex;flex-wrap:wrap;gap:8px">
          ${routines.map(r => `
            <div class="planner-routine-chip" draggable="true" 
              ondragstart="RoutinesScreen.onDragStart(event, '${r.id}', '${r.name}')">
              🏋️ ${r.name}
            </div>
          `).join('')}
        </div>
      </div>
      
      <div style="display:flex;gap:12px">
        <button class="btn btn-secondary flex-1" onclick="Modal.hide()">Cancelar</button>
        <button class="btn btn-primary flex-1" onclick="RoutinesScreen.savePlannerProgram()">💾 Crear Programa</button>
      </div>
    `, { title: '📅 Planificador Semanal Visual' });
  },

  onDragStart(e, routineId, name) {
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: routineId, name }));
    e.dataTransfer.effectAllowed = 'copy';
    e.target.style.opacity = '0.5';
  },

  onDragOver(e, day) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const slot = e.currentTarget;
    slot.classList.add('drag-over');
  },

  onDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
  },

  onDrop(e, day) {
    e.preventDefault();
    const slot = e.currentTarget;
    slot.classList.remove('drag-over');
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const { id: routineId, name } = data;
      
      // Remove from any other day
      this._plannerSchedule = this._plannerSchedule.filter(s => s.routineId !== routineId);
      // Add to this day (replace existing if any)
      this._plannerSchedule = this._plannerSchedule.filter(s => s.day !== day);
      this._plannerSchedule.push({ day, routineId });
      
      // Update visual
      this._renderPlannerDay(day);
      
      // Clear existing from all days
      for (let d = 0; d < 7; d++) {
        this._renderPlannerDay(d);
      }
      
      Toast.show(`✅ ${name} asignado a ${['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][day]}`, 'info', 1500);
    } catch(e) {
      Logger.warn('Drop error', e);
    }
  },

  _renderPlannerDay(day) {
    const container = document.getElementById(`planner-day-${day}`);
    if (!container) return;
    const slot = this._plannerSchedule.find(s => s.day === day);
    if (slot) {
      const routine = this._plannerRoutines.find(r => r.id === slot.routineId);
      container.innerHTML = `
        <div class="planner-day-routine" onclick="RoutinesScreen.removePlannerDay(${day})">
          <span style="font-size:0.7rem;font-weight:600">${routine ? routine.name.substring(0, 8) : '?'}</span>
          <span style="font-size:0.5rem;color:var(--color-text-tertiary);margin-top:2px">tocar = quitar</span>
        </div>`;
    } else {
      container.innerHTML = '<div class="planner-empty-slot">+</div>';
    }
  },

  removePlannerDay(day) {
    this._plannerSchedule = this._plannerSchedule.filter(s => s.day !== day);
    this._renderPlannerDay(day);
  },

  savePlannerProgram() {
    if (this._plannerSchedule.length === 0) {
      Toast.show('Asigna al menos una rutina a un día', 'error');
      return;
    }
    const name = document.getElementById('planner-name')?.value.trim() || 'Programa Visual';
    const weeks = parseInt(document.getElementById('planner-weeks')?.value) || 4;
    const progressionType = document.getElementById('planner-progression')?.value || 'free';
    
    Storage.addProgram({
      name,
      weeks,
      progressionType,
      progressionValue: 2.5,
      mode: 'weekly',
      active: true,
      currentWeek: 1,
      schedule: this._plannerSchedule
    });
    
    Toast.show('✅ Programa creado visualmente!', 'success');
    Modal.hide();
    this.render();
  },

  // --- Programs (Multi-Week) ---
  renderProgramsSection(routines) {
    const programs = Storage.getPrograms();
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const today = new Date().getDay();

    let html = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <h2 style="font-size:var(--font-size-lg);font-weight:var(--font-weight-bold)">📅 Programas</h2>
      <div style="display:flex;gap:8px">
        <button class="btn btn-outline btn-sm" onclick="RoutinesScreen.startDragPlanner()">🎯 Visual</button>
        <button class="btn btn-outline btn-sm" onclick="RoutinesScreen.showCreateProgram()">+ Programa</button>
      </div>
    </div>`;

    if (programs.length === 0) {
      html += `<div style="padding:12px;text-align:center;color:var(--color-text-tertiary);font-size:var(--font-size-sm);background:var(--color-bg-card);border-radius:var(--radius-md);margin-bottom:12px">
        Crea un programa para planificar tus semanas de entrenamiento
      </div>`;
      return html;
    }

    programs.forEach(prog => {
      const weekProgress = Math.min((prog.currentWeek / prog.weeks) * 100, 100);
      
      let scheduleHtml = '';
      if (prog.mode === 'rotation') {
        const completed = (prog.completedWorkouts || []).length;
        const nextIdx = completed % (prog.rotationRoutines || []).length;
        scheduleHtml = `
          <div class="rotation-chips">
            ${(prog.rotationRoutines || []).map((rId, i) => {
              let rName = rId === 'rest' ? '💤 Descanso' : routines.find(x => x.id === rId)?.name?.substring(0,8) || '?';
              let className = 'rotation-chip';
              if (i === nextIdx) className += ' next';
              else if (completed >= prog.rotationRoutines.length && i < nextIdx) className += ' completed';
              return `<div class="${className}">${rName}</div>`;
            }).join(' <span style="color:var(--color-text-tertiary);font-size:10px;margin-top:8px">→</span> ')}
          </div>
          <div style="font-size:10px;color:var(--color-text-tertiary);margin-top:6px">Descanso entre rutinas: ${prog.restDaysBetween || 0} días</div>
        `;
      } else {
        const schedule = prog.schedule || [];
        scheduleHtml = `
          <div class="program-schedule">
            ${dayNames.map((d, i) => {
              const slot = schedule.find(s => s.day === i);
              const routine = slot ? routines.find(r => r.id === slot.routineId) : null;
              return `<div class="program-day ${routine ? 'has-routine' : ''} ${i === today ? 'today' : ''}">
                <div class="program-day-label">${d}</div>
                ${routine ? routine.name.substring(0, 4) : '—'}
              </div>`;
            }).join('')}
          </div>
        `;
      }

      html += `
        <div class="program-card ${prog.active ? 'active-program' : ''}">
          <div class="program-card-header">
            <div class="program-card-name">${prog.name}</div>
            <div style="display:flex;gap:4px;align-items:center">
              <span class="program-week-badge">${prog.mode === 'rotation' ? 'Rotación' : `S${prog.currentWeek}/${prog.weeks}`}</span>
              <button class="btn btn-ghost btn-icon sm" onclick="RoutinesScreen.toggleProgramActive('${prog.id}')" title="${prog.active ? 'Desactivar' : 'Activar'}" style="font-size:1rem">${prog.active ? '✅' : '▶️'}</button>
              <button class="btn btn-ghost btn-icon sm" onclick="RoutinesScreen.deleteProgram('${prog.id}')" title="Eliminar" style="font-size:0.9rem">🗑️</button>
            </div>
          </div>
          <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary);margin-bottom:4px">
            ${prog.progressionType === 'weight' ? `+${prog.progressionValue}${Storage.getUser().units}/semana` : prog.progressionType === 'reps' ? `+${prog.progressionValue} reps/semana` : 'Progresión libre'}
          </div>
          <div class="program-progress-bar"><div class="program-progress-fill" style="width:${weekProgress}%"></div></div>
          ${scheduleHtml}
          ${prog.active ? (() => {
            const next = Storage.getNextProgramWorkout(prog);
            if (!next) return '';
            const nextLabel = prog.mode === 'rotation' 
              ? (next.isToday ? '🎯 Entrenar Hoy: ' : `⏳ Descanso, Siguiente: `)
              : (next.isToday ? '🎯 Entrenar Hoy: ' : `⏳ Próximo (${dayNames[next.slot.day]}): `);
            return `<button class="btn btn-primary btn-block" style="margin-top:10px" onclick="App.startRoutineWorkout('${next.routine.id}')">
              ${nextLabel}${next.routine.name}
            </button>`;
          })() : ''}
        </div>`;
    });
    return html;
  },

  showCreateProgram() {
    const routines = Storage.getRoutines();
    if (routines.length === 0) {
      Toast.show('Primero crea algunas rutinas', 'error');
      return;
    }
    const html = `
      <div class="input-group" style="margin-bottom:12px">
        <label class="input-label">Nombre del Programa</label>
        <input class="input" id="prog-name" placeholder="Ej: Push/Pull/Legs">
      </div>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <div class="input-group" style="flex:1">
          <label class="input-label">Semanas</label>
          <select class="input" id="prog-weeks">
            ${[4, 6, 8, 10, 12].map(w => `<option value="${w}">${w} semanas</option>`).join('')}
          </select>
        </div>
        <div class="input-group" style="flex:1">
          <label class="input-label">Progresión</label>
          <select class="input" id="prog-progression">
            <option value="weight">+Peso</option>
            <option value="reps">+Reps</option>
            <option value="free">Libre</option>
          </select>
        </div>
      </div>
      <div class="input-group" style="margin-bottom:12px">
        <label class="input-label">Valor incremento/semana</label>
        <input type="number" class="input" id="prog-inc" value="2.5" step="0.5" inputmode="decimal">
      </div>
      
      <div class="input-group" style="margin-bottom:12px">
        <label class="input-label">Modo de Programa</label>
        <select class="input" id="prog-mode" onchange="RoutinesScreen.toggleProgramMode(this.value)">
          <option value="weekly">Semanal (Días fijos)</option>
          <option value="rotation">Rotación (Ciclo A/B/C...)</option>
        </select>
      </div>
      
      <div id="prog-mode-weekly">
        <div class="input-group" style="margin-bottom:16px">
          <label class="input-label">Rutina por día de la semana</label>
          ${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((d, i) => `
            <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
              <span style="width:80px;font-size:var(--font-size-sm);color:var(--color-text-secondary)">${d}</span>
              <select class="input" id="prog-day-${i}" style="flex:1">
                <option value="">Descanso</option>
                ${routines.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
              </select>
            </div>
          `).join('')}
        </div>
      </div>

      <div id="prog-mode-rotation" style="display:none">
        <div class="input-group" style="margin-bottom:12px">
          <label class="input-label">Días de descanso entre rutinas</label>
          <input type="number" class="input" id="prog-rest" value="0" min="0" max="7" inputmode="numeric">
        </div>
        <div class="input-group" style="margin-bottom:16px">
          <label class="input-label">Secuencia de Rutinas (Máx 14)</label>
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(i => `
            <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
              <span style="width:20px;font-size:var(--font-size-xs);color:var(--color-text-tertiary)">#${i}</span>
              <select class="input" id="prog-rot-${i}" style="flex:1">
                <option value="">--</option>
                <option value="rest" style="color:var(--color-info)">💤 Día de Descanso</option>
                <option disabled>──────</option>
                ${routines.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
              </select>
            </div>
          `).join('')}
        </div>
      </div>

      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary flex-1" onclick="Modal.hide()">Cancelar</button>
        <button class="btn btn-primary flex-1" onclick="RoutinesScreen.saveProgram()">Crear Programa</button>
      </div>`;
    Modal.show(html, { title: '📅 Nuevo Programa' });
  },

  toggleProgramMode(mode) {
    document.getElementById('prog-mode-weekly').style.display = mode === 'weekly' ? 'block' : 'none';
    document.getElementById('prog-mode-rotation').style.display = mode === 'rotation' ? 'block' : 'none';
  },

  saveProgram() {
    const name = document.getElementById('prog-name')?.value.trim();
    if (!name) { Toast.show('Ingresa un nombre', 'error'); return; }
    const weeks = parseInt(document.getElementById('prog-weeks')?.value) || 4;
    const progressionType = document.getElementById('prog-progression')?.value || 'free';
    const progressionValue = parseFloat(document.getElementById('prog-inc')?.value) || 2.5;
    
    const mode = document.getElementById('prog-mode')?.value || 'weekly';
    const programData = { name, weeks, progressionType, progressionValue, mode, active: true, currentWeek: 1 };
    
    if (mode === 'weekly') {
      const schedule = [];
      for (let i = 0; i < 7; i++) {
        const routineId = document.getElementById(`prog-day-${i}`)?.value;
        if (routineId) schedule.push({ day: i, routineId });
      }
      if (schedule.length === 0) { Toast.show('Asigna al menos un día', 'error'); return; }
      programData.schedule = schedule;
    } else {
      const rotationRoutines = [];
      for (let i = 1; i <= 14; i++) {
        const routineId = document.getElementById(`prog-rot-${i}`)?.value;
        if (routineId) rotationRoutines.push(routineId);
      }
      if (rotationRoutines.length === 0) { Toast.show('Asigna al menos una rutina', 'error'); return; }
      programData.rotationRoutines = rotationRoutines;
      programData.restDaysBetween = parseInt(document.getElementById('prog-rest')?.value) || 0;
      programData.completedWorkouts = [];
    }

    Storage.addProgram(programData);
    Toast.show('¡Programa creado! 📅', 'success');
    Modal.hide();
    this.render();
  },

  toggleProgramActive(id) {
    const programs = Storage.getPrograms();
    programs.forEach(p => {
      if (p.id === id) p.active = !p.active;
      else p.active = false;
    });
    Storage.savePrograms(programs);
    this.render();
  },

  deleteProgram(id) {
    Storage.deleteProgram(id);
    Toast.show('Programa eliminado');
    this.render();
  },

  showTemplatesGallery() {
    const templates = [
      {
        id: 'tpl-ppl-push',
        name: 'PPL - Empuje (Push)',
        desc: 'Pecho, Hombros y Tríceps',
        icon: '🔥',
        folder: 'Push Pull Legs',
        exercises: [
          { exerciseId: 'chest-barbell-bench-press', sets: 4, reps: 8, timeMode: false },
          { exerciseId: 'chest-dumbbell-incline-bench-press', sets: 3, reps: 10, timeMode: false },
          { exerciseId: 'shoulders-dumbbell-lateral-raise', sets: 4, reps: 15, timeMode: false },
          { exerciseId: 'triceps-cable-triceps-pushdown-v-bar-attachment', sets: 3, reps: 12, timeMode: false }
        ]
      },
      {
        id: 'tpl-ppl-pull',
        name: 'PPL - Tirón (Pull)',
        desc: 'Espalda, Bíceps y Trasero del Hombro',
        icon: '🦍',
        folder: 'Push Pull Legs',
        exercises: [
          { exerciseId: 'back-barbell-bent-over-row', sets: 4, reps: 8, timeMode: false },
          { exerciseId: 'back-cable-lat-pulldown-full-range-of-motion', sets: 3, reps: 10, timeMode: false },
          { exerciseId: 'shoulders-dumbbell-rear-lateral-raise', sets: 3, reps: 15, timeMode: false },
          { exerciseId: 'biceps-barbell-curl', sets: 3, reps: 12, timeMode: false }
        ]
      },
      {
        id: 'tpl-ppl-legs',
        name: 'PPL - Piernas (Legs)',
        desc: 'Cuádriceps, Femorales y Pantorrillas',
        icon: '🦵',
        folder: 'Push Pull Legs',
        exercises: [
          { exerciseId: 'quads-barbell-squat', sets: 4, reps: 8, timeMode: false },
          { exerciseId: 'quads-sled-45-degrees-leg-press', sets: 3, reps: 10, timeMode: false },
          { exerciseId: 'hamstrings-lever-seated-leg-curl', sets: 3, reps: 12, timeMode: false },
          { exerciseId: 'calves-lever-standing-calf-raise', sets: 4, reps: 15, timeMode: false }
        ]
      },
      {
        id: 'tpl-fullbody',
        name: 'Full Body Básico',
        desc: 'Cuerpo completo para principiantes',
        icon: '🦾',
        folder: 'Cuerpo Completo',
        exercises: [
          { exerciseId: 'quads-barbell-squat', sets: 3, reps: 10, timeMode: false },
          { exerciseId: 'chest-barbell-bench-press', sets: 3, reps: 10, timeMode: false },
          { exerciseId: 'back-cable-lat-pulldown-full-range-of-motion', sets: 3, reps: 10, timeMode: false },
          { exerciseId: 'shoulders-dumbbell-seated-shoulder-press', sets: 3, reps: 12, timeMode: false },
          { exerciseId: 'abs-crunch-floor', sets: 3, reps: 20, timeMode: false }
        ]
      }
    ];

    const html = `
      <div class="templates-grid">
        ${templates.map(t => `
          <div class="template-card" onclick="RoutinesScreen.importTemplate('${t.id}')">
            <div class="template-card-icon">${t.icon}</div>
            <div class="template-card-name">${t.name}</div>
            <div class="template-card-desc">${t.desc}</div>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-secondary btn-block" style="margin-top:16px" onclick="Modal.hide()">Cerrar</button>
    `;

    Modal.show(html, { title: 'Explorar Templates' });
    
    // Store templates temporarily for import
    this._currentTemplates = templates;
  },

  importTemplate(tplId) {
    if (!this._currentTemplates) return;
    const tpl = this._currentTemplates.find(t => t.id === tplId);
    if (!tpl) return;
    
    Storage.addRoutine({
      name: tpl.name,
      folder: tpl.folder,
      exercises: JSON.parse(JSON.stringify(tpl.exercises)) // Deep copy
    });
    
    Toast.show(`Template "${tpl.name}" importado con éxito`, 'success');
    if (navigator.vibrate) navigator.vibrate(15);
    Modal.hide();
    this.render();
  }
};
