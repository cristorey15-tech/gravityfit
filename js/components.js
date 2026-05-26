// ============================================
// GravityFit — Components (navbar, modal, timer, toast)
// ============================================

import { Storage } from './storage.js';
import { Logger } from '../src/Logger.js';

// --- SVG Icons (Lucide) ---
export const Icons = {
  user: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  camera: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>',
  ruler: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/></svg>',
  medal: (color) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:${color}"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`,
  flame: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
  zap: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  moon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
  calendar: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',
  fileText: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
  check: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  x: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>',
  info: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  warning: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  timer: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></svg>',
  plus: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>',
  award: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>',
  star: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  trophy: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
  lock: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  search: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>'
};

// --- Toast System ---
export const Toast = {
  container: null,
  init() {
    this.container = document.getElementById('toast-container');
  },
  show(message, type = 'success', duration = 3000) {
    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || ''}</span><span>${message}</span>`;
    this.container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

// --- Modal System ---
export const Modal = {
  show(content, options = {}) {
    const overlay = document.getElementById('modal-overlay');
    const container = document.getElementById('modal-container');
    overlay.className = 'modal-overlay active' + (options.center ? ' modal-center' : '');
    container.innerHTML = `
      <div class="modal-handle"></div>
      ${options.title ? `<h3 class="modal-title">${options.title}</h3>` : ''}
      <div class="modal-body">${content}</div>
    `;
    overlay.onclick = (e) => { if (e.target === overlay) Modal.hide(); };
  },
  hide() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('active');
  }
};

// --- Rest Timer ---
export const RestTimer = {
  overlay: null,
  timeDisplay: null,
  progressCircle: null,
  interval: null,
  endTime: 0,
  total: 0,
  circumference: 0,
  notificationTimeout: null,
  silentNotification: null,

  init() {
    this.overlay = document.getElementById('rest-timer-overlay');
    
    this.overlay.addEventListener('click', (e) => {
      if (this.overlay.classList.contains('minimized')) {
        this.toggleMinimize(e);
      }
    });

    // Request notification permission on interaction
    document.addEventListener('click', () => {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }, { once: true });
  },
  
  start(seconds, nextExercise = null) {
    // Clear any existing timer before starting a new one
    this.clearTimer();
    this.total = seconds;
    this.endTime = Date.now() + (seconds * 1000);
    this.nextExercise = nextExercise;
    this.render();
    this.overlay.classList.add('active');
    
    const r = 54;
    this.circumference = 2 * Math.PI * r;
    this.progressCircle = this.overlay.querySelector('.timer-progress');
    this.timeDisplay = this.overlay.querySelector('.timer-time');
    
    if (this.progressCircle) {
      this.progressCircle.setAttribute('stroke-dasharray', this.circumference);
      this.progressCircle.setAttribute('stroke-dashoffset', '0');
    }
    
    this.scheduleLoudNotification();
    
    this.interval = setInterval(() => {
      this.update();
    }, 200); // 200ms for smoother visual updates, no drift because of Date.now()
  },
  
  nextExercise: null,
  
  render() {
    const nextEx = this.nextExercise;
    const nextExHtml = nextEx ? `
      <div class="timer-next-ex">
        <span style="font-size:0.65rem;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:1px">Siguiente</span>
        <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
          <span style="font-size:1.1rem">▶</span>
          <span style="font-weight:600;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px">${nextEx.name}</span>
          <span style="font-size:0.65rem;color:var(--color-text-tertiary)">${nextEx.index}/${nextEx.total}</span>
        </div>
      </div>` : '';

    this.overlay.innerHTML = `
      <button class="btn btn-ghost btn-icon rest-minimize-btn" onclick="RestTimer.toggleMinimize(event)" style="position:absolute;top:16px;right:16px;z-index:10">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
      </button>
      <h3>Descanso</h3>
      ${nextExHtml}
      <div class="timer-circle" onclick="if(RestTimer.overlay.classList.contains('minimized')) RestTimer.toggleMinimize(event)">
        <svg viewBox="0 0 120 120">
          <circle class="timer-bg" cx="60" cy="60" r="54"/>
          <circle class="timer-progress" cx="60" cy="60" r="54"/>
        </svg>
        <span class="timer-time">${this.formatTime(this.getRemaining())}</span>
        <span class="timer-label">restante</span>
      </div>
      <div class="rest-timer-controls">
        <button class="rest-adjust-btn" onclick="RestTimer.adjust(-15)">-15</button>
        <button class="rest-adjust-btn" onclick="RestTimer.adjust(15)">+15</button>
      </div>
      <button class="btn btn-primary btn-lg rest-skip-btn" onclick="RestTimer.skip()" style="margin-top:16px;width:200px;">
        Saltar
      </button>
    `;
  },
  
  toggleMinimize(e) {
    if (e) e.stopPropagation();
    this.overlay.classList.toggle('minimized');
  },
  
  getRemaining() {
    if (this.endTime === 0) return 0;
    return Math.max(0, Math.ceil((this.endTime - Date.now()) / 1000));
  },
  
  update() {
    const rem = this.getRemaining();
    if (this.timeDisplay) this.timeDisplay.textContent = this.formatTime(rem);
    
    if (this.progressCircle && this.total > 0) {
      const progress = 1 - (rem / this.total);
      const offset = this.circumference * progress;
      this.progressCircle.setAttribute('stroke-dashoffset', -offset);
    }
    
    if (rem <= 0) {
      this.finish();
    }
  },
  
  adjust(secs) {
    const currentRem = this.getRemaining();
    const newRem = Math.max(0, currentRem + secs);
    this.total = Math.max(this.total, newRem);
    this.endTime = Date.now() + (newRem * 1000);
    this.scheduleLoudNotification();
    this.update();
  },
  
  clearTimer() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.clearLoudNotification();
  },

  skip() { this.finish(true); },
  
  finish(isSkip = false) {
    this.clearTimer();
    this.endTime = 0;
    this.total = 0;
    this.overlay.classList.remove('active');
    
    // Play loud alarm
    if (!isSkip) {
      this.playAlarm();
      // If the app is in background, send a system notification
      if (document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted') {
        this.sendSystemNotification('¡Descanso terminado!', 'Volvamos al trabajo 💪', true);
      }
    }
  },
  
  playAlarm() {
    if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const playBeep = (delay) => {
        setTimeout(() => {
          if (ctx.state !== 'running') return;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, ctx.currentTime);
          osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
          gain.gain.setValueAtTime(1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.5);
        }, delay);
      };
      
      playBeep(0);
      playBeep(400);
    } catch (e) { Logger.warn('Timer alarm playback error:', e); }
  },
  
  formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  },

  // ---- NOTIFICATIONS ----
  
  scheduleLoudNotification() {
    this.clearLoudNotification();
    if ('serviceWorker' in navigator && 'Notification' in window && Notification.permission === 'granted') {
      const msLeft = this.endTime - Date.now();
      if (msLeft > 0) {
        this.notificationTimeout = setTimeout(() => {
          if (document.visibilityState === 'hidden') {
            this.sendSystemNotification('¡Descanso terminado!', 'Es hora de volver a levantar 💪', true);
          }
        }, msLeft);
      }
    }
  },

  clearLoudNotification() {
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
      this.notificationTimeout = null;
    }
    if (this.silentNotification && typeof this.silentNotification.close === 'function') {
      this.silentNotification.close();
      this.silentNotification = null;
    }
  },

  sendSystemNotification(title, body, requireInteraction = false) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          body: body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          vibrate: [300, 100, 300, 100, 300],
          requireInteraction: requireInteraction,
          tag: 'rest-timer'
        }).then(() => {
           // Si es una notificación silenciosa, podríamos obtenerla para cerrarla luego
           // Pero registration.getNotifications({tag: 'rest-timer'}) es asíncrono
        });
      });
    }
  },
  
  handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      const rem = this.getRemaining();
      if (rem > 0 && 'Notification' in window && Notification.permission === 'granted') {
        const d = new Date(this.endTime);
        const timeStr = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
        this.sendSystemNotification('Descanso activo', `Volvemos a las ${timeStr}. Te avisaremos al terminar.`, false);
      }
    } else {
      // User came back to the app, sync UI and clear silent notification
      this.update();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          reg.getNotifications({tag: 'rest-timer'}).then(notifications => {
            notifications.forEach(n => n.close());
          });
        });
      }
    }
  }
};

// --- Navbar ---
export const Navbar = {
  init() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const screen = item.dataset.screen;
        if (screen && window.App) window.App.navigate(screen);
      });
    });
  },
  setActive(screenId) {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.screen === screenId);
    });
  }
};

// --- Onboarding ---
export const Onboarding = {
  overlay: null,
  step: 0,
  data: { name: '', units: 'kg', goal: 'hypertrophy' },

  init() { this.overlay = document.getElementById('onboarding-overlay'); },

  shouldShow() { return !Storage._get(Storage.KEYS.USER); },

  show() {
    this.step = 0;
    this.overlay.classList.add('active');
    this.render();
  },

  render() {
    const slides = [this.slideWelcome(), this.slideProfile(), this.slideGoal()];
    const dots = [0,1,2].map(i => `<div class="onboarding-dot ${i === this.step ? 'active' : ''}"></div>`).join('');
    this.overlay.innerHTML = `
      <div class="onboarding-slide" key="${this.step}">
        <div class="onboarding-dots">${dots}</div>
        ${slides[this.step]}
      </div>
    `;
  },

  slideWelcome() {
    return `
      <div class="onboarding-logo">🏋️</div>
      <div class="onboarding-title">Bienvenido a GravityFit</div>
      <div class="onboarding-subtitle">Tu tracker de entrenamiento personal.<br>Registra, progresa y supera tus límites.</div>
      <button class="btn btn-primary btn-lg btn-block" onclick="Onboarding.next()">Empezar →</button>
    `;
  },

  slideProfile() {
    return `
      <div class="onboarding-logo">💪</div>
      <div class="onboarding-title">Tu Perfil</div>
      <div class="onboarding-subtitle">¿Cómo te llamas y qué unidades prefieres?</div>
      <input class="onboarding-input" id="onb-name" placeholder="Tu nombre" value="${this.data.name}" 
        oninput="Onboarding.data.name=this.value" autocomplete="off">
      <div class="onboarding-units">
        <div class="onboarding-unit-btn ${this.data.units === 'kg' ? 'active' : ''}" onclick="Onboarding.setUnit('kg')">
          <div style="font-size:1.5rem;margin-bottom:4px">🏋️</div>KG
        </div>
        <div class="onboarding-unit-btn ${this.data.units === 'lbs' ? 'active' : ''}" onclick="Onboarding.setUnit('lbs')">
          <div style="font-size:1.5rem;margin-bottom:4px">💪</div>LBS
        </div>
      </div>
      <button class="btn btn-primary btn-lg btn-block" onclick="Onboarding.next()">Siguiente →</button>
    `;
  },

  slideGoal() {
    const goals = [
      { id: 'strength', icon: '🦾', name: 'Fuerza', desc: 'Levantar más peso, series de 1-5 reps' },
      { id: 'hypertrophy', icon: '💪', name: 'Hipertrofia', desc: 'Ganar músculo, series de 8-12 reps' },
      { id: 'endurance', icon: '🏃', name: 'Resistencia', desc: 'Más resistencia, series de 15+ reps' },
    ];
    return `
      <div class="onboarding-logo">🎯</div>
      <div class="onboarding-title">Tu Objetivo</div>
      <div class="onboarding-subtitle">Esto nos ayuda a darte mejores sugerencias</div>
      <div class="onboarding-goal-grid">
        ${goals.map(g => `
          <div class="onboarding-goal-btn ${this.data.goal === g.id ? 'active' : ''}" onclick="Onboarding.setGoal('${g.id}')">
            <div class="onboarding-goal-icon">${g.icon}</div>
            <div class="onboarding-goal-info"><h4>${g.name}</h4><p>${g.desc}</p></div>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-primary btn-lg btn-block" onclick="Onboarding.finish()">¡Vamos! 🚀</button>
    `;
  },

  setUnit(u) { this.data.units = u; this.render(); },
  setGoal(g) { this.data.goal = g; this.render(); },

  next() {
    if (this.step === 1 && !this.data.name.trim()) {
      const el = document.getElementById('onb-name');
      if (el) { el.style.borderColor = 'var(--color-danger)'; el.focus(); }
      return;
    }
    this.step++;
    this.render();
    if (this.step === 1) setTimeout(() => { const el = document.getElementById('onb-name'); if (el) el.focus(); }, 400);
  },

  finish() {
    const user = Storage.getUser();
    user.name = this.data.name.trim() || 'Atleta';
    user.units = this.data.units;
    user.goal = this.data.goal;
    Storage.saveUser(user);
    this.overlay.classList.remove('active');
    window.App.navigate('home');
  }
};


// --- Confetti ---
export const Confetti = {
  canvas: null, ctx: null, particles: [], animFrame: null,

  init() {
    this.canvas = document.getElementById('confetti-canvas');
    if (this.canvas) this.ctx = this.canvas.getContext('2d');
  },

  fire(duration = 3000) {
    if (!this.canvas || !this.ctx) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.canvas.classList.add('active');
    this.particles = [];
    const colors = ['#A3FF12', '#FFD700', '#FF6B6B', '#6C63FF', '#34D399', '#FBBF24', '#60A5FA'];
    for (let i = 0; i < 80; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: -20 - Math.random() * 200,
        w: 4 + Math.random() * 6,
        h: 6 + Math.random() * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 4,
        rot: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
      });
    }
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.rot += p.rotSpeed;
        if (elapsed > duration * 0.6) p.opacity = Math.max(0, p.opacity - 0.02);
        this.ctx.save();
        this.ctx.globalAlpha = p.opacity;
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.rot * Math.PI) / 180);
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        this.ctx.restore();
      });
      if (elapsed < duration) {
        this.animFrame = requestAnimationFrame(animate);
      } else {
        this.canvas.classList.remove('active');
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    };
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    animate();
  }
};

// --- PR Celebration ---
export const PRCelebration = {
  el: null, timeout: null,

  init() { this.el = document.getElementById('pr-celebration'); },

  show(exerciseName, weight, reps, unit) {
    if (!this.el) return;
    this.el.innerHTML = `
      <div class="pr-badge">
        <div class="pr-badge-icon">🏆</div>
        <div class="pr-badge-title">¡NUEVO PR!</div>
        <div class="pr-badge-detail">${weight}${unit} × ${reps}</div>
        <div class="pr-badge-exercise">${exerciseName}</div>
      </div>
    `;
    this.el.classList.add('active');
    Confetti.fire(3500);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.el.classList.remove('active');
    }, 3500);
  }
};

export const LineChart = {
  render(data, options = {}) {
    if (!data || data.length === 0) return '';
    const height = options.height || 140;
    const color = options.color || 'var(--color-accent)';
    const values = data.map(d => d.value);
    
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);
    if (minVal === maxVal) {
      minVal = minVal * 0.8;
      maxVal = maxVal * 1.2;
    }
    if (minVal === 0 && maxVal === 0) maxVal = 10;
    
    const range = maxVal - minVal;
    const paddedMin = Math.max(0, minVal - (range * 0.15));
    const paddedMax = maxVal + (range * 0.15);
    const paddedRange = paddedMax - paddedMin || 1;
    
    const svgWidth = 100;
    const svgHeight = 100;
    
    const scaleX = data.length > 1 ? svgWidth / (data.length - 1) : 0;
    
    const points = data.map((d, i) => {
      const x = data.length > 1 ? i * scaleX : 50;
      const y = svgHeight - (((d.value - paddedMin) / paddedRange) * svgHeight);
      return { x, y, val: d.value, label: d.label };
    });
    
    let pathD = `M ${points[0].x} ${points[0].y}`;
    if (options.curved && points.length > 1) {
      for (let i = 1; i < points.length; i++) {
        const curr = points[i];
        const prev = points[i - 1];
        const cx = (curr.x + prev.x) / 2;
        pathD += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
      }
    } else if (points.length > 1) {
      for (let i = 1; i < points.length; i++) {
        pathD += ` L ${points[i].x} ${points[i].y}`;
      }
    } else {
      pathD = `M 0 ${points[0].y} L 100 ${points[0].y}`;
    }
    
    const fillPathD = `${pathD} L 100 100 L 0 100 Z`;
    
    let htmlOverlay = '';
    points.forEach((p, i) => {
      htmlOverlay += `
        <div style="position:absolute;left:${p.x}%;top:${p.y}%;transform:translate(-50%, -50%);width:10px;height:10px;background:${color};border:2px solid var(--color-bg-card);border-radius:50%;z-index:2;box-shadow:var(--shadow-glow)"></div>
        <div style="position:absolute;left:${p.x}%;top:${p.y}%;transform:translate(-50%, -100%);margin-top:-8px;font-size:0.75rem;font-weight:bold;color:var(--color-text-primary);text-shadow:0 1px 3px rgba(0,0,0,0.8);z-index:2">${p.val}</div>
        <div style="position:absolute;left:${p.x}%;bottom:-22px;transform:translateX(-50%);font-size:0.7rem;color:var(--color-text-tertiary);white-space:nowrap;z-index:2">${p.label}</div>
      `;
    });

    const gradId = 'grad-' + Math.random().toString(36).substr(2, 5);

    return `
      <div style="position:relative;width:100%;height:${height}px;margin-bottom:28px;margin-top:16px">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;z-index:1;overflow:visible">
          <defs>
            <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${color}" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="${color}" stop-opacity="0.0"/>
            </linearGradient>
          </defs>
          <path d="${fillPathD}" fill="url(#${gradId})" />
          <path d="${pathD}" fill="none" stroke="${color}" vector-effect="non-scaling-stroke" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        ${htmlOverlay}
      </div>
    `;
  }
};
