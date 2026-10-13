// ============================================
// GravityFit — Exercise Data Module
// Loads exercise data from JSON files
// ============================================

// Vite handles JSON imports natively
import muscleGroups from '../data/muscle-groups.json';
import exercises from '../data/exercises.json';
import cardioActivities from '../data/cardio-activities.json';

export const MUSCLE_GROUPS = muscleGroups;
// Strength exercises + cardio activities (type:'cardio', MET-based)
export const DEFAULT_EXERCISES = [...exercises, ...cardioActivities];
export { cardioActivities };

// Backward compatibility for global script access (inline onclick handlers, etc.)
window.MUSCLE_GROUPS = MUSCLE_GROUPS;
window.DEFAULT_EXERCISES = DEFAULT_EXERCISES;
