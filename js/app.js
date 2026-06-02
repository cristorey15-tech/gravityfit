// ============================================
// GravityFit — App Router & Init (app.js)
// ============================================

import { Storage } from './storage.js';
import { Toast, Navbar, RestTimer, Confetti, PRCelebration, BadgeCelebration, SetParticles, Onboarding } from './components.js';
import { HomeScreen } from './screens/home.js';
import { WorkoutScreen } from './screens/workout.js';
import { RoutinesScreen } from './screens/routines.js';
import { HistoryScreen } from './screens/history.js';
import { ExercisesScreen } from './screens/exercises.js';
import { ProfileScreen } from './screens/profile.js';

export const App = {
  deferredPrompt: null,
  currentScreen: 'home',
  screenOrder: ['home', 'routines', 'workout', 'history', 'profile'],
  screens: {
    home: HomeScreen,
    workout: WorkoutScreen,
    routines: RoutinesScreen,
    history: HistoryScreen,
    exercises: ExercisesScreen,
    profile: ProfileScreen,
  },

  async init() {
    // Initialize Database
    await Storage.initDb();

    // Initialize components
    Toast.init();
    RestTimer.init();
    Navbar.init();
    Onboarding.init();
    Confetti.init();
    PRCelebration.init();
    BadgeCelebration.init();
    SetParticles.init();

    // Hide splash screen
    const splash = document.getElementById('splash-screen');
    if (splash) splash.classList.add('hidden');

    // Apply color theme + dark mode
    const user = Storage.getUser();
    if (user.darkMode || user.theme) {
      const classes = [];
      if (user.darkMode) classes.push('dark-mode');
      if (user.theme) classes.push(user.theme);
      document.body.className = classes.join(' ');
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = user.darkMode ? '#0D0D0D' : '#F5F5F5';
    }

    // Resume active workout if any
    WorkoutScreen.resume();

    // Check if we should show onboarding
    if (Onboarding.shouldShow()) {
      Onboarding.show();
      return;
    }

    // Navigate to initial screen
    const hash = window.location.hash.replace('#', '') || 'home';
    this.navigate(hash);

    // PWA Install Handler
    this.setupPWAInstall();

    // Listen to hash changes
    window.addEventListener('hashchange', () => {
      const screen = window.location.hash.replace('#', '') || 'home';
      this.navigate(screen, false);
    });

    // Handle visibility changes (for notifications and background tasks)
    document.addEventListener('visibilitychange', () => {
      if (typeof RestTimer !== 'undefined') {
        RestTimer.handleVisibilityChange();
      }
    });

    // Global haptic feedback on button clicks
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn, .nav-item, .chip, .set-check');
      if (btn && navigator.vibrate) navigator.vibrate(8);
    }, { passive: true });

    // Global min-haptic on touch (mobile)
    document.addEventListener('touchstart', (e) => {
      const interactive = e.target.closest('.btn, .nav-item, .chip, .set-check, .exercise-list-item, .routine-card');
      if (interactive && navigator.vibrate) navigator.vibrate(5);
    }, { passive: true });

    // Periodic backup reminder (check once per session, ~5s after load)
    setTimeout(() => this.checkBackupReminder(), 5000);
  },

  checkBackupReminder() {
    try {
      if (!Storage.shouldBackup()) return;

      const totalWorkouts = Storage.getWorkouts().length;
      if (totalWorkouts === 0) return; // No data to back up yet

      Toast.show(
        '💾 Recuerda respaldar tus datos — han pasado más de 7 días. Perfil → Protección de Datos.',
        'warning',
        6000
      );
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
    } catch (e) {
      // Non-critical — ignore errors
    }
  },

  navigate(screenId, updateHash = true) {
    if (!this.screens[screenId]) screenId = 'home';
    const prevScreen = this.currentScreen;
    this.currentScreen = screenId;
    if (navigator.vibrate) navigator.vibrate(10);

    // Update hash
    if (updateHash) window.location.hash = screenId;

    // Determine slide direction
    const prevIdx = this.screenOrder.indexOf(prevScreen);
    const newIdx = this.screenOrder.indexOf(screenId);
    const direction = newIdx > prevIdx ? 'slide-right' : newIdx < prevIdx ? 'slide-left' : '';

    // Toggle active screen
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.remove('active', 'slide-left', 'slide-right');
    });
    const screenEl = document.getElementById('screen-' + screenId);
    if (screenEl) {
      screenEl.classList.add('active');
      if (direction) screenEl.classList.add(direction);
    }

    // Render screen
    this.screens[screenId].render();

    // Update navbar
    Navbar.setActive(screenId);

    // Scroll to top
    window.scrollTo(0, 0);
  },

  // --- PWA Install ---
  setupPWAInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      const banner = document.getElementById('pwa-install-banner');
      if (banner) banner.classList.add('visible');
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      const banner = document.getElementById('pwa-install-banner');
      if (banner) banner.classList.remove('visible');
    });

    // Don't show install banner if already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true) {
      return;
    }
  },

  async installApp() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const result = await this.deferredPrompt.userChoice;
      if (result.outcome === 'accepted') {
        console.log('User accepted PWA install');
      }
      this.deferredPrompt = null;
      const banner = document.getElementById('pwa-install-banner');
      if (banner) banner.classList.remove('visible');
    } else {
      this.showInstallInstructions();
    }
  },

  showInstallInstructions() {
    const userAgent = navigator.userAgent || '';
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isChrome = /Chrome/i.test(userAgent) && !isIOS;

    if (isIOS) {
      Toast.show('iOS: Safari → Compartir (📤) → Agregar a Pantalla de Inicio', 'info', 6000);
    } else if (isChrome) {
      Toast.show('Chrome: abre el menú ⋮ y selecciona "Instalar app" o "Agregar a pantalla de inicio"', 'info', 6000);
    } else {
      Toast.show('Abre en Chrome y busca "Instalar app" en el menú ⋮', 'info', 5000);
    }
  },

  isPWAInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  },

  // Quick actions
  startEmptyWorkout() {
    WorkoutScreen.startEmpty();
  },
  startRoutineWorkout(routineId) {
    WorkoutScreen.startFromRoutine(routineId);
  },
  markRestDay() {
    Storage.recordProgramWorkout('rest');
    Confetti.fire(2000);
    const overlay = document.getElementById('rest-day-overlay');
    if (overlay) overlay.classList.add('active');
    this.navigate('home', false);
  },
  dismissRestDay() {
    const overlay = document.getElementById('rest-day-overlay');
    if (overlay) overlay.classList.remove('active');
  }
};

