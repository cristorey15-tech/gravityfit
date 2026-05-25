// ============================================
// GravityFit — App Router & Init (app.js)
// ============================================

import { Storage } from './storage.js';
import { Toast, Navbar, RestTimer, Confetti, PRCelebration, Onboarding } from './components.js';
import { HomeScreen } from './screens/home.js';
import { WorkoutScreen } from './screens/workout.js';
import { RoutinesScreen } from './screens/routines.js';
import { HistoryScreen } from './screens/history.js';
import { ExercisesScreen } from './screens/exercises.js';
import { ProfileScreen } from './screens/profile.js';

export const App = {
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

    // Apply color theme
    const user = Storage.getUser();
    if (user.theme) {
      document.body.className = user.theme;
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
    Toast.show('¡Día de descanso completado! 💤');
    this.navigate('home', false);
  }
};

