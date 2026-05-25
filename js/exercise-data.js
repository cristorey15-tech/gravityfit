// ============================================
// GravityFit — Exercise Data Module
// Loads exercise data from JSON files
// ============================================

// Vite handles JSON imports natively
import muscleGroups from '../data/muscle-groups.json';
import exercises from '../data/exercises.json';

export const MUSCLE_GROUPS = muscleGroups;
export const DEFAULT_EXERCISES = exercises;

// Backward compatibility for global script access (inline onclick handlers, etc.)
window.MUSCLE_GROUPS = MUSCLE_GROUPS;
window.DEFAULT_EXERCISES = DEFAULT_EXERCISES;
