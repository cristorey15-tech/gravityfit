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
import { CompetitionScreen } from './screens/competition.js';

export const App = {
  deferredPrompt: null,
  currentScreen: 'home',
  screenOrder: ['home', 'routines', 'workout', 'history', 'exercises', 'profile', 'competition'],
  screens: {
    home: HomeScreen,
    workout: WorkoutScreen,
    routines: RoutinesScreen,
    history: HistoryScreen,
    exercises: ExercisesScreen,
    profile: ProfileScreen,
    competition: CompetitionScreen,
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

    // Record competition daily stats on app open
    this.recordCompetitionStats();

    // Start competition real-time notifications
    if (typeof CompetitionNotifications !== 'undefined') {
      CompetitionNotifications.init();
    }

    // P0-1: Initialize notification system
    this.initNotifications();

    // P0-2: Check for missed workouts on app open
    this.checkMissedWorkouts();

    // P0-7: Active rest day check
    this.checkActiveRestDay();

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data.type === 'CHECK_DAILY_REMINDER') {
          this.sendDailyReminder();
        }
        if (e.data.type === 'NOTIFICATION_CLICK') {
          if (e.data.action === 'start-workout') {
            this.navigate('workout');
          }
        }
      });
    }
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
  },

  // =============================================
  // P0-1: Notification System
  // =============================================
  async initNotifications() {
    const settings = Storage.getNotificationSettings();
    if (!settings.enabled) return;
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        this.scheduleDailyReminder(settings.time);
      }
    }
  },

  scheduleDailyReminder(timeStr) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SCHEDULE_DAILY_REMINDER' });
    }
  },

  sendDailyReminder() {
    const settings = Storage.getNotificationSettings();
    if (!settings.enabled) return;
    if (document.visibilityState !== 'hidden') return;
    const program = Storage.getActiveProgram();
    let body = 'No olvides tu entrenamiento de hoy. ¡Tú puedes! 💪';
    if (program) {
      const next = Storage.getNextProgramWorkout(program);
      if (next && next.isToday && next.routine && next.routine.id !== 'rest') {
        body = `Hoy toca: ${next.routine.name}. ¡A darle! 🏋️`;
      } else if (Storage.isRestDay()) {
        body = 'Hoy es día de descanso. Recupérate bien 😴';
      }
    }
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🏋️ GravityFit', { body, icon: '/icons/icon-192.png', tag: 'daily-reminder' });
    }
  },

  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      Toast.show('Las notificaciones no son compatibles con este navegador', 'error');
      return;
    }
    const perm = await Notification.requestPermission();
    const settings = Storage.getNotificationSettings();
    settings.enabled = perm === 'granted';
    Storage.saveNotificationSettings(settings);
    if (perm === 'granted') {
      Toast.show('🔔 Notificaciones activadas', 'success');
      this.scheduleDailyReminder(settings.time);
    } else {
      Toast.show('Notificaciones bloqueadas por el navegador', 'warning');
    }
  },

  toggleNotifications() {
    const settings = Storage.getNotificationSettings();
    if (settings.enabled) {
      settings.enabled = false;
      Storage.saveNotificationSettings(settings);
      Toast.show('Notificaciones desactivadas', 'info');
    } else {
      this.requestNotificationPermission();
    }
  },

  // =============================================
  // P0-2: Missed Workout Check
  // =============================================
  checkMissedWorkouts() {
    const program = Storage.getActiveProgram();
    if (!program) return;
    Storage.clearOldMissed();
    const missed = Storage.getMissedWorkouts();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Check if yesterday was a scheduled training day that was missed
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yDay = yesterday.getDay();
    let wasScheduled = false;
    let routineName = '';
    if (program.mode === 'weekly' && program.schedule) {
      const slot = program.schedule.find(s => s.day === yDay);
      if (slot && slot.routineId) {
        wasScheduled = true;
        const routine = Storage.getRoutine(slot.routineId);
        routineName = routine ? routine.name : 'Entrenamiento';
      }
    }
    if (wasScheduled) {
      const alreadyTracked = missed.some(m => {
        const mDate = new Date(m.date);
        return mDate.toDateString() === yesterday.toDateString();
      });
      const didTrain = Storage.getWorkouts().some(w => {
        if (!w.finishedAt) return false;
        return new Date(w.finishedAt).toDateString() === yesterday.toDateString();
      });
      if (!alreadyTracked && !didTrain) {
        Storage.addMissedWorkout({ programId: program.id, routineName, wasScheduled: true });
        setTimeout(() => {
              Toast.show(`⚠️ Perdiste el entrenamiento de ayer: ${routineName}`, 'warning', 5000);
        }, 3000);
      }
    }
  },

  // =============================================
  // P0-7: Active Rest Day Check
  // =============================================
  checkActiveRestDay() {
    if (!Storage.isRestDay()) return;
    const settings = Storage.getNotificationSettings();
    if (!settings.restDayTips) return;
    setTimeout(() => {
      Toast.show('😴 Hoy es día de descanso activo — tus músculos se recuperan', 'info', 4000);
    }, 6000);
  },

  // =============================================
  // P1-6: Get Adherence Stats
  // =============================================
  getAdherenceStats() {
    const program = Storage.getActiveProgram();
    if (!program) return null;
    const adherence = Storage.getProgramAdherence(program);
    const missed = Storage.getMissedWorkouts().filter(m => m.programId === program.id && !m.rescheduled && !m.skipped);
    return { ...adherence, missedWorkouts: missed, program };
  },

  // =============================================
  // Social Competition: Record Daily Stats
  // =============================================
  recordCompetitionStats() {
    const comps = Storage.getCompetitions();
    if (!comps.length) return;
    const workouts = Storage.getWorkouts();
    const user = Storage.getUser();
    const today = Storage._localDateStr(new Date());
    // Find workouts finished today
    const todayWorkouts = workouts.filter(w => w.finishedAt && Storage._localDateStr(new Date(w.finishedAt)) === today);
    const totalVol = todayWorkouts.reduce((s, w) => s + Storage.getTotalVolume(w), 0);
    const totalDuration = todayWorkouts.reduce((s, w) => s + (w.duration || 0), 0);
    const streak = Storage.getStreak();
    const stats = { workouts: todayWorkouts.length, volume: totalVol, duration: totalDuration, streak };
    comps.forEach(c => {
      Storage.recordCompetitionDay(c.id, stats);
      // Push to Firebase shared competition node so real-time listeners work
      if (typeof CloudSync !== 'undefined' && CloudSync.db && user.cloudId) {
        try {
          CloudSync.db.ref(`competitions/${c.id}/dailyStats/${today}/${user.cloudId}`).set({
            name: user.name,
            ...stats,
          });
        } catch (e) { /* non-critical */ }
      }
    });
  },

  navigateToCompetition() {
    this.navigate('competition');
  }
};

