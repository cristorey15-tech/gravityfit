// ============================================
// GravityFit — Profile / Settings Screen
// ============================================

import { Storage } from '../storage.js';
import { Icons, Modal, Toast } from '../components.js';
import { HomeScreen } from './home.js';
import { StorageHealth } from '../storage-health.js';

export const ProfileScreen = {
  render() {
    const container = document.getElementById('screen-profile');
    const user = Storage.getUser();
    if (!user.achievements) user.achievements = [];
    const workouts = Storage.getWorkouts();
    const totalWorkouts = workouts.length;
    const totalVolume = workouts.reduce((s, w) => s + Storage.getTotalVolume(w), 0);

    // Heatmap Logic
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentWorkouts = workouts.filter(w => new Date(w.finishedAt) >= sevenDaysAgo);
    
    const muscleVolume = { chest: 0, back: 0, legs: 0, arms: 0, core: 0, shoulders: 0 };
    
    recentWorkouts.forEach(w => {
      w.exercises.forEach(ex => {
        const d = Storage.getExercise(ex.exerciseId);
        if (d && d.primaryMuscle) {
          const m = d.primaryMuscle.toLowerCase();
          const vol = ex.sets.reduce((s, set) => s + (set.weight * set.reps), 0);
          if (m === 'pecho') muscleVolume.chest += vol;
          else if (m === 'espalda') muscleVolume.back += vol;
          else if (m.includes('pierna') || m.includes('cuádriceps') || m.includes('glúteo') || m.includes('isquios') || m.includes('pantorrilla')) muscleVolume.legs += vol;
          else if (m.includes('brazo') || m.includes('bíceps') || m.includes('tríceps') || m.includes('antebrazo')) muscleVolume.arms += vol;
          else if (m === 'core') muscleVolume.core += vol;
          else if (m === 'hombro') muscleVolume.shoulders += vol;
        }
      });
    });

    const maxVol = Math.max(...Object.values(muscleVolume), 1);
    const getHeat = (vol) => {
      const pct = vol / maxVol;
      if (pct === 0) return 'rgba(255,255,255,0.05)';
      if (pct < 0.3) return 'var(--color-success)';
      if (pct < 0.7) return 'var(--color-warning)';
      return 'var(--color-danger)';
    };

    // Gamification Integration
    if (!user.xp) user.xp = Storage.calculateXP();
    const lvlData = typeof window.Gamification !== 'undefined' ? window.Gamification.getLevelProgress(user.xp) : { currentXP: 0, requiredXP: 100, percentage: 0 };
    const currentLevel = typeof window.Gamification !== 'undefined' ? window.Gamification.getLevelFromXP(user.xp) : 1;
    
    // Badges UI
    const badgesHtml = typeof window.Gamification !== 'undefined' ? window.Gamification.BADGES.map(b => {
      const unlocked = user.badges && user.badges.includes(b.id);
      return `
        <div style="background:var(--color-bg);border:1px solid ${unlocked ? 'var(--color-accent)' : 'var(--color-border)'};border-radius:12px;padding:12px;text-align:center;opacity:${unlocked ? '1' : '0.4'};filter:${unlocked ? 'none' : 'grayscale(100%)'}">
          <div style="font-size:2.5rem;margin-bottom:8px">${b.icon}</div>
          <div style="font-size:0.75rem;font-weight:bold;color:var(--color-text);margin-bottom:4px">${b.title}</div>
          <div style="font-size:0.65rem;color:var(--color-text-tertiary)">${b.desc}</div>
        </div>
      `;
    }).join('') : '';

    container.innerHTML = `
      <div class="screen-header">
        <div class="profile-header" style="position:relative;overflow:hidden">
          <div class="profile-avatar" style="border:2px solid var(--color-accent);box-shadow:0 0 15px rgba(167,139,250,0.4)">${Icons.user}</div>
          <div class="profile-name" id="profile-display-name">${user.name}</div>
          <div style="font-size:var(--font-size-sm);color:var(--color-text-secondary);margin-top:4px">
            ${totalWorkouts} entrenamientos · ${HomeScreen.formatVolume(totalVolume, user.units)} total
          </div>
          
          <!-- RPG Level Bar -->
          <div style="margin-top:16px;width:100%">
            <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:4px">
              <div style="font-size:1.5rem;font-weight:900;color:var(--color-accent);font-style:italic">Lvl ${currentLevel}</div>
              <div style="font-size:0.75rem;color:var(--color-text-tertiary)">${user.xp} XP</div>
            </div>
            <div class="xp-bar-container" style="height:12px;border-radius:6px;background:var(--color-bg-input)">
              <div class="xp-bar-fill" style="width:${lvlData.percentage}%;height:100%;border-radius:6px;background:linear-gradient(90deg, #A78BFA, var(--color-accent));box-shadow:0 0 10px var(--color-accent)"></div>
            </div>
            <div style="font-size:0.65rem;color:var(--color-text-tertiary);margin-top:4px;text-align:right">
              ${lvlData.requiredXP - lvlData.currentXP} XP para el Lvl ${currentLevel + 1}
            </div>
          </div>
        </div>
      </div>
      
      <div class="screen-content">
        
        <!-- Trophy Showcase -->
        <div class="settings-group">
          <div class="settings-group-title">Vitrina de Trofeos (${user.badges ? user.badges.length : 0} desbloqueados)</div>
          <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:12px;padding:0 16px 16px">
            ${badgesHtml}
          </div>
        </div>


        <!-- Heatmap Section -->
        <div class="settings-group">
          <div class="settings-group-title">Análisis Muscular (Últimos 7 días)</div>
          <div style="padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div style="background:var(--color-bg);padding:12px;border-radius:8px">
              <div style="font-size:0.75rem;color:var(--color-text-secondary);margin-bottom:4px">Pecho</div>
              <div style="height:6px;border-radius:3px;background:${getHeat(muscleVolume.chest)};width:100%"></div>
            </div>
            <div style="background:var(--color-bg);padding:12px;border-radius:8px">
              <div style="font-size:0.75rem;color:var(--color-text-secondary);margin-bottom:4px">Espalda</div>
              <div style="height:6px;border-radius:3px;background:${getHeat(muscleVolume.back)};width:100%"></div>
            </div>
            <div style="background:var(--color-bg);padding:12px;border-radius:8px">
              <div style="font-size:0.75rem;color:var(--color-text-secondary);margin-bottom:4px">Piernas</div>
              <div style="height:6px;border-radius:3px;background:${getHeat(muscleVolume.legs)};width:100%"></div>
            </div>
            <div style="background:var(--color-bg);padding:12px;border-radius:8px">
              <div style="font-size:0.75rem;color:var(--color-text-secondary);margin-bottom:4px">Brazos</div>
              <div style="height:6px;border-radius:3px;background:${getHeat(muscleVolume.arms)};width:100%"></div>
            </div>
            <div style="background:var(--color-bg);padding:12px;border-radius:8px">
              <div style="font-size:0.75rem;color:var(--color-text-secondary);margin-bottom:4px">Hombros</div>
              <div style="height:6px;border-radius:3px;background:${getHeat(muscleVolume.shoulders)};width:100%"></div>
            </div>
            <div style="background:var(--color-bg);padding:12px;border-radius:8px">
              <div style="font-size:0.75rem;color:var(--color-text-secondary);margin-bottom:4px">Core</div>
              <div style="height:6px;border-radius:3px;background:${getHeat(muscleVolume.core)};width:100%"></div>
            </div>
          </div>
        </div>

        <div class="settings-group">
          <div class="settings-group-title">App</div>
          ${!window.App || !window.App.isPWAInstalled || !window.App.isPWAInstalled() ? `
          <div class="settings-item" onclick="window.App.installApp()">
            <div class="settings-item-left">
              <span style="font-size:1.2rem; margin-right:4px;">📲</span>
              <span class="settings-item-label">Instalar App en tu Teléfono</span>
            </div>
            <span class="settings-item-value" style="font-size:0.7rem;color:var(--color-accent)">Instalar</span>
          </div>` : `
          <div class="settings-item" style="cursor:default">
            <div class="settings-item-left">
              <span style="font-size:1.2rem; margin-right:4px;">✅</span>
              <span class="settings-item-label">App Instalada</span>
            </div>
            <span class="settings-item-value" style="font-size:0.7rem;color:var(--color-success)">✓ Listo</span>
          </div>`}
          <div class="settings-item" onclick="ProfileScreen.showQRShare()">
            <div class="settings-item-left">
              <span style="font-size:1.2rem; margin-right:4px;">📱</span>
              <span class="settings-item-label">Compartir App</span>
            </div>
            <span class="settings-item-value" style="font-size:0.7rem;color:var(--color-accent)">QR</span>
          </div>
        </div>

        <div class="settings-group">
          <div class="settings-group-title">General</div>
          <div class="settings-item" onclick="ProfileScreen.editName()">
            <div class="settings-item-left">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span class="settings-item-label">Nombre</span>
            </div>
            <span class="settings-item-value">${user.name}</span>
          </div>
          <div class="settings-item">
            <div class="settings-item-left">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span class="settings-item-label">Timer de Descanso</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <button class="btn btn-ghost btn-sm" onclick="ProfileScreen.adjustTimer(-15)">−</button>
              <span class="settings-item-value" id="timer-value">${user.defaultRestTimer}s</span>
              <button class="btn btn-ghost btn-sm" onclick="ProfileScreen.adjustTimer(15)">+</button>
            </div>
          </div>
          <div class="settings-item" style="cursor:default">
            <div class="settings-item-left">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span class="settings-item-label">Meta Semanal</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <button class="btn btn-ghost btn-sm" onclick="ProfileScreen.adjustGoal(-1)">−</button>
              <span class="settings-item-value" id="goal-value">${user.weeklyGoal || 4} días</span>
              <button class="btn btn-ghost btn-sm" onclick="ProfileScreen.adjustGoal(1)">+</button>
            </div>
          </div>
        </div>

        <div class="settings-group">
          <div class="settings-group-title">Apariencia</div>
          <div class="settings-item" onclick="ProfileScreen.toggleDarkMode()">
            <div class="settings-item-left">
              <span style="font-size:1.2rem; margin-right:4px;">${user.darkMode ? '🌙' : '☀️'}</span>
              <span class="settings-item-label">Modo Oscuro</span>
            </div>
            <div class="toggle ${user.darkMode ? 'active' : ''}"></div>
          </div>
          <div style="padding:8px 0 4px;font-size:var(--font-size-xs);color:var(--color-text-secondary);font-weight:var(--font-weight-medium)">Color de Acento</div>
          <div class="theme-selector">
            <div class="theme-dot ${!user.theme || user.theme === 'theme-lime' ? 'active' : ''}" style="background-color:#A3FF12" onclick="ProfileScreen.setAccentTheme('theme-lime')"></div>
            <div class="theme-dot ${user.theme === 'theme-blue' ? 'active' : ''}" style="background-color:#60A5FA" onclick="ProfileScreen.setAccentTheme('theme-blue')"></div>
            <div class="theme-dot ${user.theme === 'theme-purple' ? 'active' : ''}" style="background-color:#A78BFA" onclick="ProfileScreen.setAccentTheme('theme-purple')"></div>
            <div class="theme-dot ${user.theme === 'theme-red' ? 'active' : ''}" style="background-color:#FB7185" onclick="ProfileScreen.setAccentTheme('theme-red')"></div>
            <div class="theme-dot ${user.theme === 'theme-orange' ? 'active' : ''}" style="background-color:#FB923C" onclick="ProfileScreen.setAccentTheme('theme-orange')"></div>
            <div class="theme-dot ${user.theme === 'theme-cyan' ? 'active' : ''}" style="background-color:#22D3EE" onclick="ProfileScreen.setAccentTheme('theme-cyan')"></div>
          </div>
        </div>

        <div class="settings-group">
          <div class="settings-group-title">Unidades</div>
          <div class="settings-item" style="cursor:default">
            <div class="settings-item-left">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M3 12h18"/></svg>
              <span class="settings-item-label">Peso</span>
            </div>
            <div class="unit-selector">
              <div class="unit-option ${user.units === 'kg' ? 'active' : ''}" onclick="ProfileScreen.setUnits('kg')">KG</div>
              <div class="unit-option ${user.units === 'lbs' ? 'active' : ''}" onclick="ProfileScreen.setUnits('lbs')">LBS</div>
            </div>
          </div>
        </div>

        <div class="settings-group">
          <div class="settings-group-title">Herramientas Avanzadas</div>
          <div class="settings-item" onclick="ProfileScreen.show1RMCalc()">
            <div class="settings-item-left">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2m12-6h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2m-6-8v14M8 6h8M8 18h8"/></svg>
              <span class="settings-item-label">Calculadora 1RM</span>
            </div>
          </div>
          <div class="settings-item" onclick="ProfileScreen.showEvolutionChart()">
            <div class="settings-item-left">
              <span style="font-size:1.2rem; margin-right:4px;">📈</span>
              <span class="settings-item-label">Evolución Corporal (Todo en Uno)</span>
            </div>
            <span class="settings-item-value" style="font-size:0.7rem;color:var(--color-accent)">Ver</span>
          </div>
          <div class="settings-item" onclick="ProfileScreen.showBodyWeight()">
            <div class="settings-item-left">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              <span class="settings-item-label">Peso Corporal</span>
            </div>
            <span class="settings-item-value" id="profile-body-weight">
              ${user.bodyWeight && user.bodyWeight.length ? user.bodyWeight[user.bodyWeight.length-1].weight + 'kg' : '-'}
            </span>
          </div>
          <div class="settings-item" onclick="ProfileScreen.showBodyMeasurements()">
            <div class="settings-item-left">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h5l2-9 4 18 3-9h6"/></svg>
              <span class="settings-item-label">Medidas Corporales</span>
            </div>
            <span class="settings-item-value" style="width:20px;height:20px;color:var(--color-text-secondary);display:inline-block">${Icons.ruler}</span>
          </div>
          <div class="settings-item" onclick="ProfileScreen.showProgressGallery()">
            <div class="settings-item-left">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span class="settings-item-label">Galería de Progreso</span>
            </div>
            <span class="settings-item-value" style="width:20px;height:20px;color:var(--color-text-secondary);display:inline-block">${Icons.camera}</span>
          </div>
        </div>

        <div class="settings-group">
          <div class="settings-group-title">Nube y Sincronización</div>
          <div class="settings-item" onclick="ProfileScreen.showCloudSyncModal()">
            <div class="settings-item-left">
              <span style="font-size:1.2rem; margin-right:4px;">☁️</span>
              <span class="settings-item-label">Enlazar Dispositivos (Sync)</span>
            </div>
            <span class="settings-item-value" id="profile-last-sync" style="font-size:0.7rem; text-align:right">
              ${user.lastSync ? new Date(user.lastSync).toLocaleString('es-ES', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : 'Desconectado'}
            </span>
          </div>
          <div class="settings-item" onclick="ProfileScreen.forceSyncUp()">
            <div class="settings-item-left">
              <span style="font-size:1.2rem; margin-right:4px;">⬆️</span>
              <span class="settings-item-label">Respaldar Ahora</span>
            </div>
          </div>
        </div>

        <div class="settings-group">
          <div class="settings-group-title">🛡️ Protección de Datos</div>
          <div id="storage-health-status" style="padding:12px;margin:0 0 8px;background:var(--color-bg);border:1px solid var(--color-border);border-radius:8px;font-size:0.75rem;color:var(--color-text-secondary);line-height:1.6;white-space:pre-line">
            ⏳ Verificando estado del almacenamiento...
          </div>
          <div class="settings-item" onclick="ProfileScreen.showStorageHealth()">
            <div class="settings-item-left">
              <span style="font-size:1.2rem; margin-right:4px;">🔍</span>
              <span class="settings-item-label">Estado del Almacenamiento</span>
            </div>
            <span class="settings-item-value" id="storage-health-indicator" style="font-size:0.7rem;color:var(--color-accent)">Verificar</span>
          </div>
          <div class="settings-item" onclick="ProfileScreen.exportData()">
            <div class="settings-item-left">
              <span style="font-size:1.2rem; margin-right:4px;">💾</span>
              <span class="settings-item-label">Descargar Respaldo Completo</span>
            </div>
            <span class="settings-item-value" style="font-size:0.7rem;color:var(--color-accent)">JSON</span>
          </div>
          <div class="settings-item" onclick="ProfileScreen.importData()">
            <div class="settings-item-left">
              <span style="font-size:1.2rem; margin-right:4px;">📥</span>
              <span class="settings-item-label">Restaurar desde Respaldo</span>
            </div>
            <span class="settings-item-value" style="font-size:0.7rem;color:var(--color-accent)">Importar</span>
          </div>
        </div>

        <div class="settings-group">
          <div class="settings-group-title">Datos Locales</div>
          <div class="settings-item" onclick="ProfileScreen.exportData()">
            <div class="settings-item-left">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span class="settings-item-label">Exportar Datos</span>
            </div>
            <span class="settings-item-value">JSON</span>
          </div>
          <div class="settings-item" onclick="ProfileScreen.importData()">
            <div class="settings-item-left">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span class="settings-item-label">Importar Datos</span>
            </div>
            <span class="settings-item-value">JSON</span>
          </div>
          <div class="settings-item" onclick="ProfileScreen.confirmReset()" style="border-color:rgba(248,113,113,0.2)">
            <div class="settings-item-left">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              <span class="settings-item-label" style="color:var(--color-danger)">Borrar Todos los Datos</span>
            </div>
          </div>
        </div>

        <div style="text-align:center;padding:24px 0;color:var(--color-text-tertiary);font-size:var(--font-size-xs)">
          GravityFit v2.1 · Hecho con 💪
        </div>
      </div>`;

      // Load storage health async after render
      setTimeout(() => this.loadStorageHealth(), 100);
  },

  editName() {
    Modal.show(`
      <div class="input-group" style="margin-bottom:16px">
        <label class="input-label">Tu Nombre</label>
        <input class="input" id="edit-name-input" value="${Storage.getUser().name}" placeholder="Nombre">
      </div>
      <div style="display:flex;gap:12px">
        <button class="btn btn-secondary flex-1" onclick="Modal.hide()">Cancelar</button>
        <button class="btn btn-primary flex-1" onclick="ProfileScreen.saveName()">Guardar</button>
      </div>`, { title: 'Editar Nombre', center: true });
    setTimeout(() => { const i = document.getElementById('edit-name-input'); if (i) { i.focus(); i.select(); } }, 300);
  },

  saveName() {
    const name = document.getElementById('edit-name-input')?.value.trim();
    if (!name) return;
    const user = Storage.getUser();
    user.name = name;
    Storage.saveUser(user);
    Modal.hide();
    Toast.show('Nombre actualizado');
    if (navigator.vibrate) navigator.vibrate(10);
    this.render();
  },

  adjustTimer(delta) {
    const user = Storage.getUser();
    user.defaultRestTimer = Math.max(15, Math.min(300, user.defaultRestTimer + delta));
    Storage.saveUser(user);
    const el = document.getElementById('timer-value');
    if (el) el.textContent = user.defaultRestTimer + 's';
  },

  adjustGoal(delta) {
    const user = Storage.getUser();
    user.weeklyGoal = Math.max(1, Math.min(7, (user.weeklyGoal || 4) + delta));
    Storage.saveUser(user);
    const el = document.getElementById('goal-value');
    if (el) el.textContent = user.weeklyGoal + ' días';
  },

  setUnits(units) {
    const user = Storage.getUser();
    user.units = units;
    Storage.saveUser(user);
    Toast.show(`Unidades: ${units.toUpperCase()}`);
    if (navigator.vibrate) navigator.vibrate(10);
    this.render();
  },

  setAccentTheme(themeName) {
    const user = Storage.getUser();
    user.theme = themeName;
    Storage.saveUser(user);
    this._applyThemeClasses(user);
    if (navigator.vibrate) navigator.vibrate(10);
    this.render();
  },

  toggleDarkMode() {
    const user = Storage.getUser();
    user.darkMode = !user.darkMode;
    Storage.saveUser(user);
    this._applyThemeClasses(user);
    if (navigator.vibrate) navigator.vibrate(10);
    this.render();
  },

  _applyThemeClasses(user) {
    // Apply body classes for accent color and dark mode
    const classes = [];
    if (user.darkMode) classes.push('dark-mode');
    if (user.theme) classes.push(user.theme);
    document.body.className = classes.join(' ');

    // Sync ThemeManager inline styles so they match the current mode
    // This prevents specificity conflicts between inline styles and CSS classes
    if (typeof window.themeManager !== 'undefined') {
      window.themeManager.apply(user.darkMode ? 'dark' : 'light');
    }

    // Update theme-color meta tag for mobile browsers
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = user.darkMode ? '#0D0D0D' : '#F5F5F5';
  },

  show1RMCalc() {
    const user = Storage.getUser();
    Modal.show(`
      <div style="text-align:center">
        <div style="display:flex;gap:12px;margin-bottom:16px">
          <div style="flex:1">
            <label style="display:block;margin-bottom:4px;font-size:0.875rem;color:var(--color-text-secondary)">Peso Levantado (${user.units})</label>
            <input type="number" id="rm-weight" class="input input-number" style="font-size:1.5rem;height:50px" placeholder="100" oninput="ProfileScreen.calc1RM()" inputmode="decimal">
          </div>
          <div style="flex:1">
            <label style="display:block;margin-bottom:4px;font-size:0.875rem;color:var(--color-text-secondary)">Repeticiones</label>
            <input type="number" id="rm-reps" class="input input-number" style="font-size:1.5rem;height:50px" placeholder="5" oninput="ProfileScreen.calc1RM()" inputmode="numeric">
          </div>
        </div>
        <div style="padding:16px;background:var(--color-surface-hover);border-radius:var(--radius-md);margin-bottom:16px">
          <div style="font-size:0.875rem;color:var(--color-text-secondary);margin-bottom:4px">Tu 1RM Estimado:</div>
          <div id="rm-result" style="font-size:2rem;font-weight:700;color:var(--color-accent)">-</div>
        </div>
      </div>
    `, { title: 'Calculadora de 1RM' });
    setTimeout(() => { const i = document.getElementById('rm-weight'); if(i) i.focus(); }, 300);
  },

  calc1RM() {
    const w = parseFloat(document.getElementById('rm-weight')?.value) || 0;
    const r = parseInt(document.getElementById('rm-reps')?.value) || 0;
    const res = document.getElementById('rm-result');
    if (!res) return;
    if (w > 0 && r > 0) {
      const epley = w * (1 + r / 30);
      res.textContent = epley.toFixed(1) + ' ' + Storage.getUser().units.toUpperCase();
    } else {
      res.textContent = '-';
    }
  },

  showBodyWeight() {
    const user = Storage.getUser();
    if (!user.bodyWeight) user.bodyWeight = [];
    const last = user.bodyWeight.length ? user.bodyWeight[user.bodyWeight.length - 1].weight : '';
    
    let statsHtml = '';
    let canvasHtml = '';
    
    if (user.bodyWeight.length > 0) {
      const weights = user.bodyWeight.map(b => b.weight);
      const min = Math.min(...weights).toFixed(1);
      const max = Math.max(...weights).toFixed(1);
      const first = weights[0];
      const diff = (weights[weights.length - 1] - first).toFixed(1);
      const diffStr = diff > 0 ? '+' + diff : diff;
      
      statsHtml = `
        <div class="bw-stats">
          <div class="bw-stat"><div class="bw-stat-value">${min}</div><div class="bw-stat-label">Mínimo</div></div>
          <div class="bw-stat"><div class="bw-stat-value">${max}</div><div class="bw-stat-label">Máximo</div></div>
          <div class="bw-stat"><div class="bw-stat-value">${diffStr}</div><div class="bw-stat-label">Cambio</div></div>
        </div>
      `;
      canvasHtml = `<div class="bw-chart-container"><canvas id="bw-chart"></canvas></div>`;
    }

    Modal.show(`
      <div style="text-align:center">
        ${canvasHtml}
        ${statsHtml}
        <label style="display:block;margin-bottom:8px;font-size:0.875rem;color:var(--color-text-secondary);margin-top:16px">Tu peso actual (kg)</label>
        <input type="number" id="bw-input" class="input input-number" style="font-size:1.5rem;height:60px;margin-bottom:12px" value="${last}" inputmode="decimal">
        <button class="btn btn-primary btn-block" onclick="ProfileScreen.saveBodyWeight()">Guardar Peso</button>
      </div>
    `, { title: 'Peso Corporal' });
    
    setTimeout(() => { 
      const i = document.getElementById('bw-input'); if(i) { i.focus(); i.select(); } 
      if (user.bodyWeight.length > 0) this.drawBodyWeightChart(user.bodyWeight);
    }, 300);
  },

  drawBodyWeightChart(data) {
    const canvas = document.getElementById('bw-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const w = rect.width;
    const h = rect.height;
    
    ctx.clearRect(0, 0, w, h);
    
    if (data.length < 2) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Registra más datos para ver el gráfico', w/2, h/2);
      return;
    }
    
    const padding = 20;
    const weights = data.map(d => d.weight);
    const minW = Math.min(...weights) - 2;
    const maxW = Math.max(...weights) + 2;
    const range = maxW - minW;
    
    // Get accent color
    const style = getComputedStyle(document.body);
    const accent = style.getPropertyValue('--color-accent').trim() || '#A3FF12';
    
    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    
    data.forEach((point, i) => {
      const x = padding + (i / (data.length - 1)) * (w - padding * 2);
      const y = h - padding - ((point.weight - minW) / range) * (h - padding * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // Draw points
    ctx.fillStyle = '#1A1A1A'; // bg color approx
    data.forEach((point, i) => {
      const x = padding + (i / (data.length - 1)) * (w - padding * 2);
      const y = h - padding - ((point.weight - minW) / range) * (h - padding * 2);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  },

  saveBodyWeight() {
    const w = parseFloat(document.getElementById('bw-input')?.value);
    if (!w) return;
    const user = Storage.getUser();
    if (!user.bodyWeight) user.bodyWeight = [];
    
    const today = new Date().toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});
    const existing = user.bodyWeight.find(b => b.date === today);
    if (existing) {
      existing.weight = w;
    } else {
      user.bodyWeight.push({ date: today, weight: w });
    }
    Storage.saveUser(user);
    Toast.show('Peso guardado');
    Modal.hide();
    this.render();
  },

  exportData() {
    const data = Storage.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gravityfit-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.show('Datos exportados');
    if (navigator.vibrate) navigator.vibrate(10);
  },

  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (Storage.importData(ev.target.result)) {
          Toast.show('Datos importados correctamente 🎉');
          if (navigator.vibrate) navigator.vibrate(15);
          this.render();
        } else {
          Toast.show('Error al importar', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  },

  confirmReset() {
    Modal.show(`
      <p style="margin-bottom:16px;color:var(--color-text-secondary)">⚠️ Esto eliminará TODOS tus datos: rutinas, entrenamientos e historial. Esta acción no se puede deshacer.</p>
      <div style="display:flex;gap:12px">
        <button class="btn btn-secondary flex-1" onclick="Modal.hide()">Cancelar</button>
        <button class="btn btn-danger flex-1" onclick="ProfileScreen.resetAll()">Borrar Todo</button>
      </div>`, { title: '¿Estás seguro?', center: true });
  },
  resetAll() {
    localStorage.clear();
    for (const key of Object.values(Storage.KEYS)) { Storage._remove(key); }
    Modal.hide();
    Toast.show('Datos eliminados');
    if (navigator.vibrate) navigator.vibrate(10);
    this.render();
    HomeScreen.render();
  },

  showBodyMeasurements() {
    const measurements = Storage.getBodyMeasurements();
    const fields = [
      { key: 'neck', label: 'Cuello', icon: '🔵' },
      { key: 'chest', label: 'Pecho', icon: '🟢' },
      { key: 'waist', label: 'Cintura', icon: '🟡' },
      { key: 'hips', label: 'Cadera', icon: '🟠' },
      { key: 'arm', label: 'Brazo', icon: '🔴' },
      { key: 'thigh', label: 'Muslo', icon: '🟣' }
    ];
    const user = Storage.getUser();
    const unit = 'cm';

    // Mini SVG trend for each field
    const miniTrend = (key) => {
      const values = measurements.map(m => parseFloat(m[key]) || 0).filter(v => v > 0);
      if (values.length < 2) return '';
      const last5 = values.slice(-5);
      const min = Math.min(...last5);
      const max = Math.max(...last5);
      const range = max - min || 1;
      const w = 60, h = 20;
      const points = last5.map((v, i) => `${(i / (last5.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
      const diff = last5[last5.length - 1] - last5[0];
      const color = diff < 0 ? 'var(--color-success)' : diff > 0 ? 'var(--color-warning)' : 'var(--color-text-secondary)';
      return `<svg width="${w}" height="${h}" style="display:block"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/></svg>`;
    };

    const lastMeasurement = measurements.length > 0 ? measurements[measurements.length - 1] : null;

    let html = `
      <div style="margin-bottom:16px">
        <div style="font-size:0.8rem;color:var(--color-text-secondary);margin-bottom:12px">Biometría y Calculadora de Grasa (Navy Method)</div>
        
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <div style="flex:1">
            <label style="font-size:0.75rem;color:var(--color-text-tertiary)">Edad</label>
            <input type="number" id="meas-age" class="input" value="${user.age || 25}" style="width:100%;font-size:0.875rem">
          </div>
          <div style="flex:1">
            <label style="font-size:0.75rem;color:var(--color-text-tertiary)">Altura (cm)</label>
            <input type="number" id="meas-height" class="input" placeholder="cm" value="${user.height || ''}" style="width:100%;font-size:0.875rem">
          </div>
          <div style="flex:1">
            <label style="font-size:0.75rem;color:var(--color-text-tertiary)">Género</label>
            <select id="meas-gender" class="input" style="width:100%;font-size:0.875rem;padding:8px">
              <option value="male" ${user.gender !== 'female' ? 'selected' : ''}>Hombre</option>
              <option value="female" ${user.gender === 'female' ? 'selected' : ''}>Mujer</option>
            </select>
          </div>
        </div>

        <div class="measurements-form">
          ${fields.map(f => `
            <div class="measurement-field">
              <label>${f.icon} ${f.label} (cm)</label>
              <input type="number" class="input" id="meas-${f.key}" placeholder="${lastMeasurement && lastMeasurement[f.key] ? lastMeasurement[f.key] : '0'}" inputmode="decimal" step="0.1">
            </div>
          `).join('')}
        </div>
        
        <button class="btn btn-primary btn-block" style="margin-top:12px" onclick="ProfileScreen.saveBodyMeasurement()">💾 Guardar y Calcular Grasa</button>
      </div>
      
      <div style="background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:8px;padding:12px;text-align:center;margin-bottom:16px">
        <div style="font-size:0.75rem;color:var(--color-text-secondary)">% DE GRASA CORPORAL (ESTIMADO)</div>
        <div style="font-size:2rem;font-weight:bold;color:var(--color-accent)">${user.bodyFat ? user.bodyFat + '%' : '--'}</div>
      </div>

      ${measurements.length > 0 ? `
        <div class="settings-group-title" style="margin-bottom:8px">Historial (${measurements.length} registros)</div>
        <div class="measurements-trends">
          ${fields.map(f => {
            const vals = measurements.map(m => parseFloat(m[f.key]) || 0).filter(v => v > 0);
            const current = vals.length > 0 ? vals[vals.length - 1] : '-';
            return `
              <div class="trend-item">
                <div class="trend-label">${f.icon} ${f.label}</div>
                <div class="trend-value">${current}${current !== '-' ? unit : ''}</div>
                <div class="trend-chart">${miniTrend(f.key)}</div>
              </div>`;
          }).join('')}
        </div>
        <div style="max-height:150px;overflow-y:auto;margin-top:12px">
          <table class="measurements-table">
            <thead><tr><th>Fecha</th>${fields.map(f => `<th>${f.icon}</th>`).join('')}<th></th></tr></thead>
            <tbody>
              ${measurements.slice().reverse().slice(0, 10).map((m, i) => {
                const realIdx = measurements.length - 1 - i;
                const d = new Date(m.date);
                return `<tr>
                  <td>${d.getDate()}/${d.getMonth()+1}</td>
                  ${fields.map(f => `<td>${m[f.key] || '-'}</td>`).join('')}
                  <td><button class="btn btn-ghost btn-icon" style="font-size:0.7rem;padding:2px" onclick="ProfileScreen.deleteMeasurement(${realIdx})">✕</button></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : '<div style="text-align:center;color:var(--color-text-tertiary);padding:16px;font-size:0.85rem">Sin registros aún. ¡Agrega tu primera medida!</div>'}`;

    Modal.show(html, { title: '📏 Medidas Corporales' });
  },

  saveBodyMeasurement() {
    const user = Storage.getUser();
    user.age = parseInt(document.getElementById('meas-age')?.value) || user.age || 25;
    user.gender = document.getElementById('meas-gender')?.value || user.gender || 'male';
    
    // Read height from input. If not entered, try to reuse existing; if none, show warning.
    const heightVal = document.getElementById('meas-height')?.value;
    if (heightVal && heightVal.trim() !== '') {
      user.height = parseFloat(heightVal);
    }
    
    const fields = ['neck', 'chest', 'waist', 'hips', 'arm', 'thigh'];
    const data = {};
    let hasValue = false;
    fields.forEach(f => {
      const val = parseFloat(document.getElementById('meas-' + f)?.value);
      if (val && val > 0) { data[f] = val; hasValue = true; }
    });
    
    // Fetch last known measurements for the formula
    const measurements = Storage.getBodyMeasurements();
    const lastM = measurements.length > 0 ? measurements[measurements.length - 1] : {};
    
    let n = data.neck || parseFloat(lastM.neck);
    let w = data.waist || parseFloat(lastM.waist);
    let hips = data.hips || parseFloat(lastM.hips) || w;
    let h = user.height;
    
    // Navy Body Fat Formula (All inputs are forced to cm now)
    if (n && w && h) {
      let bf = 0;
      if (user.gender === 'female') {
        bf = 495 / (1.29579 - 0.35004 * Math.log10(w + hips - n) + 0.22100 * Math.log10(h)) - 450;
      } else {
        bf = 495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.15456 * Math.log10(h)) - 450;
      }
      
      if (!isNaN(bf) && bf > 0 && bf < 60) {
        user.bodyFat = bf.toFixed(1);
      } else {
        Toast.show('Las medidas no dieron un valor válido. Revisa los datos ingresados.', 'error');
      }
    } else {
      const missing = [];
      if (!h) missing.push('Altura');
      if (!n) missing.push('Cuello');
      if (!w) missing.push('Cintura');
      Toast.show('Faltan: ' + missing.join(', ') + ' — necesario para calcular % grasa', 'error');
    }
    
    Storage.saveUser(user);
    
    if (!hasValue) { 
      Toast.show('Datos biométricos actualizados', 'success'); 
      this.showBodyMeasurements(); 
      return; 
    }
    
    Storage.addBodyMeasurement(data);
    if (user.bodyFat) {
      Toast.show(`📊 Medidas guardadas - Grasa: ${user.bodyFat}%`, 'success');
    } else {
      Toast.show('Medidas guardadas ✅', 'success');
    }
    this.showBodyMeasurements();
  },

  // --- FEATURE H: Body Evolution Chart (All-in-One) ---
  showEvolutionChart() {
    const user = Storage.getUser();
    const measurements = Storage.getBodyMeasurements();
    const photos = Storage.getPhotos();
    const workouts = Storage.getWorkouts();
    const bwData = user.bodyWeight || [];
    
    let weightHtml = '';
    let measureHtml = '';
    let photoHtml = '';
    let statsHtml = '';
    
    // Combined weight chart
    if (bwData.length >= 2) {
      const weights = bwData.map(b => b.weight);
      const minW = Math.min(...weights);
      const maxW = Math.max(...weights);
      const first = bwData[0].weight;
      const last = bwData[bwData.length - 1].weight;
      const diff = (last - first).toFixed(1);
      
      statsHtml = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">
          <div class="bw-stat"><div class="bw-stat-value" style="font-size:1rem">${bwData.length}</div><div class="bw-stat-label">Registros</div></div>
          <div class="bw-stat"><div class="bw-stat-value" style="font-size:1rem">${minW.toFixed(1)}</div><div class="bw-stat-label">Mínimo</div></div>
          <div class="bw-stat"><div class="bw-stat-value" style="font-size:1rem">${maxW.toFixed(1)}</div><div class="bw-stat-label">Máximo</div></div>
          <div class="bw-stat"><div class="bw-stat-value" style="font-size:1rem;color:${diff > 0 ? 'var(--color-warning)' : 'var(--color-success)'}">${diff > 0 ? '+' : ''}${diff}</div><div class="bw-stat-label">Cambio</div></div>
        </div>
      `;
      
      weightHtml = `
        <div class="bw-chart-container">
          <h4>⚖️ Peso Corporal (kg)</h4>
          <canvas id="evo-weight-chart" width="400" height="160"></canvas>
        </div>`;
    }
    
    // Measurements trends
    if (measurements.length >= 2) {
      const fields = [
        { key: 'chest', label: 'Pecho', icon: '🟢' },
        { key: 'waist', label: 'Cintura', icon: '🟡' },
        { key: 'arm', label: 'Brazo', icon: '🔴' },
        { key: 'thigh', label: 'Muslo', icon: '🟣' }
      ];
      
      measureHtml = `
        <div class="bw-chart-container">
          <h4>📏 Medidas Corporales (cm)</h4>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
            ${fields.map(f => {
              const vals = measurements.map(m => parseFloat(m[f.key]) || 0).filter(v => v > 0);
              if (vals.length < 2) return '';
              const current = vals[vals.length - 1];
              const change = (current - vals[0]).toFixed(1);
              return `<div style="text-align:center">
                <div style="font-size:0.65rem;color:var(--color-text-tertiary)">${f.icon} ${f.label}</div>
                <div style="font-size:1.1rem;font-weight:700">${current}</div>
                <div style="font-size:0.6rem;color:${change > 0 ? 'var(--color-success)' : 'var(--color-danger)'}">${change > 0 ? '+' : ''}${change}</div>
              </div>`;
            }).join('')}
          </div>
          <canvas id="evo-measure-chart" width="400" height="160" style="margin-top:12px"></canvas>
        </div>`;
    }
    
    // Photo timeline
    if (photos.length >= 2) {
      photoHtml = `
        <div class="bw-chart-container">
          <h4>📸 Línea de Tiempo de Fotos</h4>
          <div class="photo-timeline" style="display:flex;gap:8px;overflow-x:auto;padding-bottom:8px">
            ${photos.slice().reverse().slice(0, 6).map(p => `
              <div style="min-width:80px;text-align:center">
                <img src="${p.base64}" style="width:80px;height:106px;object-fit:cover;border-radius:8px;border:1px solid var(--color-border)">
                <div style="font-size:0.55rem;color:var(--color-text-tertiary);margin-top:4px">${new Date(p.date).toLocaleDateString('es-ES', {day:'numeric',month:'short'})}</div>
                ${p.weight ? `<div style="font-size:0.55rem;color:var(--color-accent)">${p.weight}kg</div>` : ''}
              </div>
            `).join('')}
            ${photos.length > 6 ? `<div style="min-width:40px;display:flex;align-items:center;font-size:0.7rem;color:var(--color-text-tertiary)">+${photos.length - 6}</div>` : ''}
          </div>
        </div>`;
    }
    
    // Workout volume trend (last 10)
    let workoutHtml = '';
    if (workouts.length >= 2) {
      workoutHtml = `
        <div class="bw-chart-container">
          <h4>🏋️ Volumen de Entrenamiento</h4>
          <canvas id="evo-vol-chart" width="400" height="120"></canvas>
        </div>`;
    }
    
    Modal.show(`
      <div style="overflow-y:auto;max-height:75vh">
        ${statsHtml}
        ${weightHtml}
        ${measureHtml}
        ${workoutHtml}
        ${photoHtml}
        ${bwData.length < 1 && measurements.length < 1 && photos.length < 1 ? '<div style="text-align:center;padding:32px;color:var(--color-text-tertiary)">Comienza registrando peso, medidas o fotos para ver tu evolución 📊</div>' : ''}
      </div>
    `, { title: '📈 Evolución Corporal' });
    
    setTimeout(() => {
      if (bwData.length >= 2) this.drawEvoWeightChart(bwData);
      if (measurements.length >= 2) this.drawEvoMeasureChart(measurements);
      if (workouts.length >= 2) this.drawEvoVolChart(workouts);
    }, 300);
  },

  drawEvoWeightChart(data) {
    const canvas = document.getElementById('evo-weight-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width - 32;
    canvas.height = 160;
    
    const padding = { top: 10, right: 10, bottom: 20, left: 40 };
    const w = canvas.width - padding.left - padding.right;
    const h = canvas.height - padding.top - padding.bottom;
    
    const weights = data.map(d => d.weight);
    const minW = Math.min(...weights) * 0.98;
    const maxW = Math.max(...weights) * 1.02;
    const range = maxW - minW || 1;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#A3FF12';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    
    data.forEach((d, i) => {
      const x = padding.left + (i / (data.length - 1)) * w;
      const y = padding.top + h - ((d.weight - minW) / range) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // Points
    data.forEach((d, i) => {
      const x = padding.left + (i / (data.length - 1)) * w;
      const y = padding.top + h - ((d.weight - minW) / range) * h;
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#A3FF12';
      ctx.fill();
    });
  },

  drawEvoMeasureChart(data) {
    const canvas = document.getElementById('evo-measure-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width - 32;
    canvas.height = 160;
    
    const keys = ['chest', 'waist', 'arm', 'thigh'];
    const colors = ['#60A5FA', '#FBBF24', '#FB7185', '#A78BFA'];
    const labels = ['Pecho', 'Cintura', 'Brazo', 'Muslo'];
    
    const padding = { top: 10, right: 10, bottom: 20, left: 35 };
    const w = canvas.width - padding.left - padding.right;
    const h = canvas.height - padding.top - padding.bottom;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    keys.forEach((key, ki) => {
      const vals = data.map(m => parseFloat(m[key]) || 0).filter(v => v > 0);
      if (vals.length < 2) return;
      const min = Math.min(...vals) * 0.95;
      const max = Math.max(...vals) * 1.05;
      const range = max - min || 1;
      
      ctx.beginPath();
      ctx.strokeStyle = colors[ki];
      ctx.lineWidth = 1.5;
      
      vals.forEach((v, i) => {
        const x = padding.left + (i / (vals.length - 1)) * w;
        const y = padding.top + h - ((v - min) / range) * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
    
    // Legend
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    keys.forEach((key, ki) => {
      const vals = data.map(m => parseFloat(m[key]) || 0).filter(v => v > 0);
      if (vals.length < 2) return;
      ctx.fillStyle = colors[ki];
      ctx.fillRect(5, 5 + ki * 14, 8, 8);
      ctx.fillText(labels[ki], 16, 12 + ki * 14);
    });
  },

  drawEvoVolChart(workouts) {
    const canvas = document.getElementById('evo-vol-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width - 32;
    canvas.height = 120;
    
    const padding = { top: 5, right: 10, bottom: 18, left: 35 };
    const w = canvas.width - padding.left - padding.right;
    const h = canvas.height - padding.top - padding.bottom;
    
    const recent = workouts.slice(0, 10).reverse();
    const vols = recent.map(wk => Storage.getTotalVolume(wk));
    const maxVol = Math.max(...vols, 1) * 1.1;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const barW = Math.min(w / vols.length * 0.7, 30);
    const gap = w / vols.length;
    
    ctx.fillStyle = '#A3FF12';
    vols.forEach((v, i) => {
      const barH = (v / maxVol) * h;
      const x = padding.left + gap * i + (gap - barW) / 2;
      const y = padding.top + h - barH;
      ctx.fillRect(x, y, barW, barH);
    });
  },

  deleteMeasurement(idx) {
    Storage.deleteBodyMeasurement(idx);
    Toast.show('Registro eliminado');
    this.showBodyMeasurements();
  },

  showProgressGallery() {
    const photos = Storage.getPhotos().slice().reverse(); // Show newest first
    const user = Storage.getUser();
    
    let gridHtml = '';
    if (photos.length === 0) {
      gridHtml = `<div style="text-align:center;padding:32px;color:var(--color-text-tertiary)">
        <div style="font-size:3rem;margin-bottom:12px">📷</div>
        <div>Aún no hay fotos. ¡Sube la primera para empezar a ver tu progreso!</div>
      </div>`;
    } else {
      gridHtml = `<div class="photo-gallery-grid">
        ${photos.map(p => `
          <div class="photo-card" onclick="ProfileScreen.viewPhoto('${p.id}')">
            <img src="${p.base64}" class="photo-thumb" loading="lazy">
            <div class="photo-meta">
              <span class="photo-date">${new Date(p.date).toLocaleDateString(undefined, {day:'numeric', month:'short'})}</span>
              <span class="photo-weight">${p.weight ? p.weight + 'kg' : '-'}</span>
            </div>
          </div>
        `).join('')}
      </div>`;
    }

    Modal.show(`
      <div style="margin-bottom:16px;text-align:center">
        <label class="btn btn-primary btn-block" style="cursor:pointer">
          📷 Tomar / Subir Foto
          <input type="file" accept="image/*" capture="environment" style="display:none" onchange="ProfileScreen.handlePhotoUpload(event)">
        </label>
        <div style="font-size:0.75rem;color:var(--color-text-tertiary);margin-top:8px">Las fotos se guardan en tu dispositivo de forma privada.</div>
      </div>
      ${gridHtml}
    `, { title: 'Galería de Progreso' });
  },

  handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Photo limit check
    const photos = Storage.getPhotos();
    if (photos.length >= 50) {
      Toast.show('Límite de 50 fotos alcanzado. Elimina alguna para subir más.', 'error');
      return;
    }

    // Toast showing compression is happening
    Toast.show('Procesando foto...');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Compress image using canvas
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.floor(height * (MAX_WIDTH / width));
          width = MAX_WIDTH;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress as JPEG 80%
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);

        // Get current weight
        const user = Storage.getUser();
        const weight = user.bodyWeight && user.bodyWeight.length > 0 ? user.bodyWeight[user.bodyWeight.length - 1].weight : null;

        const photoObj = {
          id: 'photo_' + Date.now(),
          date: new Date().toISOString(),
          base64: compressedBase64,
          weight: weight
        };

        Storage.addPhoto(photoObj);
        Toast.show('Foto guardada 📸', 'success');
        this.showProgressGallery();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  viewPhoto(id) {
    const photos = Storage.getPhotos();
    const photo = photos.find(p => p.id === id);
    if (!photo) return;

    Modal.show(`
      <div style="text-align:center">
        <img src="${photo.base64}" class="photo-fullscreen-img" style="width:100%;border-radius:var(--radius-md);margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;color:var(--color-text-secondary)">
          <span>📅 ${new Date(photo.date).toLocaleDateString()}</span>
          <span>⚖️ ${photo.weight || '-'}</span>
        </div>
        <button class="btn btn-danger btn-block" onclick="ProfileScreen.deletePhotoConfirm('${id}')">🗑️ Eliminar Foto</button>
      </div>
    `, { title: 'Detalle de Foto' });
  },

  deletePhotoConfirm(id) {
    const confirm = window.confirm('¿Estás seguro de que quieres eliminar esta foto?');
    if (confirm) {
      Storage.deletePhoto(id);
      Toast.show('Foto eliminada');
      this.showProgressGallery();
    }
  },

  async forceSyncUp() {
    Toast.show('Sincronizando con la nube...', 'info');
    try {
      await window.CloudSync.syncUp();
      Toast.show('Respaldo en la Nube Exitoso ✅', 'success');
      this.render();
    } catch (e) {
      Toast.show(e.message, 'error');
    }
  },

  showCloudSyncModal() {
    const user = Storage.getUser();
    const token = window.CloudSync.getSyncToken();
    
    Modal.show(`
      <div style="text-align:center;margin-bottom:16px">
        <div style="font-size:3rem;margin-bottom:8px">☁️</div>
        <h3 style="font-size:1.25rem;font-weight:bold;margin-bottom:8px">Sincronización en la Nube</h3>
        <p style="font-size:0.875rem;color:var(--color-text-secondary)">
          Tus datos se guardan y unifican de forma segura a través de un código secreto.
        </p>
      </div>

      <div style="background:var(--color-bg-input);padding:16px;border-radius:8px;margin-bottom:16px;text-align:center">
        <div style="font-size:0.75rem;color:var(--color-text-secondary);margin-bottom:8px">TU CÓDIGO DE ENLACE ACTUAL</div>
        <textarea readonly style="width:100%;height:60px;background:var(--color-bg);border:1px solid var(--color-border);color:var(--color-text);font-family:monospace;font-size:0.75rem;padding:8px;border-radius:4px;resize:none" onclick="this.select()">${token}</textarea>
        <button class="btn btn-secondary btn-sm" style="margin-top:8px" onclick="navigator.clipboard.writeText('${token}'); Toast.show('Código copiado', 'success')">Copiar Código</button>
      </div>

      <div style="margin-bottom:16px">
        <div style="font-size:0.875rem;font-weight:bold;margin-bottom:8px">Importar desde otro Dispositivo</div>
        <input type="text" id="sync-token-input" class="input" placeholder="Pega el código de tu otro celular aquí..." style="width:100%">
        <button class="btn btn-outline btn-block" style="margin-top:8px" onclick="ProfileScreen.importCloudToken()">Importar y Sincronizar</button>
      </div>

      <button class="btn btn-primary btn-block" onclick="Modal.hide()">Cerrar</button>
    `, { title: 'Cloud Sync' });
  },

  async importCloudToken() {
    const el = document.getElementById('sync-token-input');
    const token = el ? el.value.trim() : '';
    if (!token) {
      Toast.show('Pega un código primero', 'error');
      return;
    }
    
    const confirm = window.confirm('¿Seguro que quieres importar? Esto SOBRESCRIBIRÁ tus entrenamientos locales actuales.');
    if (!confirm) return;

    Toast.show('Descargando de la Nube...', 'info');
    try {
      await window.CloudSync.linkDevice(token);
      Modal.hide();
      Toast.show('¡Sincronización Exitosa! 🎉', 'success');
      this.render();
    } catch(e) {
      Toast.show(e.message, 'error');
    }
  },

  // --- Storage Health ---
  async loadStorageHealth() {
    try {
      const status = await StorageHealth.check();
      const summary = StorageHealth.getStatusSummary(status);
      const statusEl = document.getElementById('storage-health-status');
      const indicatorEl = document.getElementById('storage-health-indicator');
      if (statusEl) statusEl.textContent = summary;
      if (indicatorEl) {
        if (status.overall === 'healthy') {
          indicatorEl.textContent = '✅ OK';
          indicatorEl.style.color = 'var(--color-success)';
        } else if (status.overall === 'degraded') {
          indicatorEl.textContent = '⚠️ Parcial';
          indicatorEl.style.color = 'var(--color-warning)';
        } else {
          indicatorEl.textContent = '🚨 Crítico';
          indicatorEl.style.color = 'var(--color-danger)';
        }
      }
    } catch (e) {
      console.error('StorageHealth check failed:', e);
    }
  },

  async showStorageHealth() {
    let status = StorageHealth.getLastStatus();
    if (!status) {
      await this.loadStorageHealth();
      status = StorageHealth.getLastStatus();
    }
    if (status) {
      this._showStorageHealthModal(status);
    } else {
      Toast.show('No se pudo verificar el almacenamiento', 'error');
    }
  },

  async refreshStorageHealth() {
    Modal.hide();
    await this.loadStorageHealth();
    const status = StorageHealth.getLastStatus();
    if (status) this._showStorageHealthModal(status);
  },

  _showStorageHealthModal(status) {
    const summary = StorageHealth.getStatusSummary(status);
    Modal.show(
      `<div style="white-space:pre-line;font-size:0.85rem;line-height:1.8;color:var(--color-text-secondary)">${summary}</div>
       <button class="btn btn-primary btn-block" style="margin-top:16px" onclick="ProfileScreen.refreshStorageHealth()">🔄 Actualizar</button>`,
      { title: '🛡️ Estado del Almacenamiento' }
    );
  },

  // --- FEATURE: QR Code Share ---
  showQRShare() {
    const url = 'https://cristorey15-tech.github.io/gravityfit/';
    const encodedUrl = encodeURIComponent(url);
    
    Modal.show(`
      <div style="text-align:center;padding:8px 0">
        <div style="font-size:0.95rem;color:var(--color-text-secondary);margin-bottom:16px">Escanea el código QR o comparte el enlace para que otros instalen GravityFit</div>
        <div style="background:white;border-radius:16px;padding:16px;display:inline-block;margin-bottom:16px;box-shadow:0 4px 20px rgba(0,0,0,0.15);position:relative">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodedUrl}" 
               style="width:220px;height:220px;border-radius:8px;display:block" 
               alt="QR Code GravityFit"
               onerror="this.style.display='none';this.parentElement.querySelector('.qr-fallback').style.display='flex'">
          <div class="qr-fallback" style="display:none;width:220px;height:220px;border-radius:8px;background:var(--color-bg-input);align-items:center;justify-content:center;color:var(--color-text-tertiary);font-size:0.85rem">Error al cargar QR</div>
        </div>
        <div style="font-size:0.75rem;color:var(--color-text-tertiary);word-break:break-all;margin-bottom:16px;padding:0 16px">
          ${url}
        </div>
        <div style="display:flex;gap:12px">
          <button class="btn btn-primary flex-1" onclick="navigator.clipboard.writeText('${url}'); Toast.show('Enlace copiado 📋', 'success'); if(navigator.vibrate) navigator.vibrate(10)">📋 Copiar</button>
          <button class="btn btn-secondary flex-1" onclick="
            if(navigator.share) { navigator.share({ title: 'GravityFit', text: '¡Descarga GravityFit y empieza a entrenar! 🏋️', url: '${url}' }); } 
            else { navigator.clipboard.writeText('${url}'); Toast.show('Enlace copiado 📋', 'success'); }
          ">📤 Compartir</button>
        </div>
      </div>
    `, { title: '📱 Compartir GravityFit' });
  }
};
