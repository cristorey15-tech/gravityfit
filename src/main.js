// ============================================
// GravityFit — Main Entry Point (Vite)
// ============================================

// Import CSS
import '../css/index.css';
import '../css/components.css';
import '../css/screens.css';

// Import services
import { Logger, initGlobalErrorHandler } from './Logger.js';
import { themeManager } from './ThemeManager.js';
import { animatedTransition } from './AnimatedTransition.js';

// Import core modules (which attach exports to window)
import { Storage } from '../js/storage.js';
import { Icons, Toast, Modal, RestTimer, Navbar, Onboarding, Confetti, PRCelebration, LineChart } from '../js/components.js';
import { Gamification } from '../js/gamification.js';
import { BLE } from '../js/bluetooth.js';
import { CloudSync } from '../js/sync.js';
import { AICoach } from '../js/ai-coach.js';
import { StorageHealth } from '../js/storage-health.js';

// Import screens
import { HomeScreen } from '../js/screens/home.js';
import { WorkoutScreen } from '../js/screens/workout.js';
import { RoutinesScreen } from '../js/screens/routines.js';
import { HistoryScreen } from '../js/screens/history.js';
import { ExercisesScreen } from '../js/screens/exercises.js';
import { ProfileScreen } from '../js/screens/profile.js';
import { App } from '../js/app.js';

// Attach everything to window for backwards compatibility with inline onclick handlers
window.Storage = Storage;
window.Icons = Icons;
window.Toast = Toast;
window.Modal = Modal;
window.RestTimer = RestTimer;
window.Navbar = Navbar;
window.Onboarding = Onboarding;
window.Confetti = Confetti;
window.PRCelebration = PRCelebration;
window.LineChart = LineChart;
window.Gamification = Gamification;
window.BLE = BLE;
window.CloudSync = CloudSync;
window.AICoach = AICoach;
window.StorageHealth = StorageHealth;
window.HomeScreen = HomeScreen;
window.WorkoutScreen = WorkoutScreen;
window.RoutinesScreen = RoutinesScreen;
window.HistoryScreen = HistoryScreen;
window.ExercisesScreen = ExercisesScreen;
window.ProfileScreen = ProfileScreen;
window.App = App;
window.Logger = Logger;
window.themeManager = themeManager;
window.animatedTransition = animatedTransition;

// MUSCLE_GROUPS and DEFAULT_EXERCISES are imported from exercise-data.js module

// Initialize
initGlobalErrorHandler();
themeManager.init();
document.addEventListener('DOMContentLoaded', () => App.init());
