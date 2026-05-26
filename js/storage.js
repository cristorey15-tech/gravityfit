// ============================================
// GravityFit — Storage Layer (storage.js)
// ============================================

import { DEFAULT_EXERCISES } from '../src/data.js';
import { Logger } from '../src/Logger.js';

export const Storage = {
  // Keys
  KEYS: {
    USER: 'gf_user',
    ROUTINES: 'gf_routines',
    WORKOUTS: 'gf_workouts',
    CUSTOM_EXERCISES: 'gf_custom_exercises',
    ACTIVE_WORKOUT: 'gf_active_workout',
    MEASUREMENTS: 'gf_measurements',
    PROGRAMS: 'gf_programs',
    PHOTOS: 'gf_photos'
  },

  _state: {},
  _db: null,
  
  // IndexedDB Init & Migration
  initDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('GravityFitDB', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('store')) {
          db.createObjectStore('store');
        }
      };
      req.onsuccess = (e) => {
        this._db = e.target.result;
        this._loadAllFromDb().then(resolve);
      };
      req.onerror = () => {
        Logger.error('IndexedDB error, falling back to empty state');
        resolve(); // Fallback to avoid breaking app
      };
    });
  },

  _loadAllFromDb() {
    return new Promise((resolve) => {
      const tx = this._db.transaction('store', 'readonly');
      const store = tx.objectStore('store');
      const req = store.getAll();
      const keysReq = store.getAllKeys();
      
      tx.oncomplete = () => {
        const keys = keysReq.result || [];
        const values = req.result || [];
        let hasData = false;
        
        for (let i = 0; i < keys.length; i++) {
          this._state[keys[i]] = values[i];
          hasData = true;
        }

        // Migration from localStorage if IDB is empty
        if (!hasData) {
          Logger.info('IndexedDB empty. Migrating from localStorage...');
          for (const key of Object.values(this.KEYS)) {
            const lsVal = localStorage.getItem(key);
            if (lsVal) {
              try {
                const parsed = JSON.parse(lsVal);
                this._state[key] = parsed;
                this._dbSet(key, parsed); // Save to IDB
              } catch(e) {
                Logger.warn('Failed to parse localStorage data for key:', key, e);
              }
            }
          }
          localStorage.setItem('gf_migrated', 'true');
        }
        resolve();
      };
    });
  },

  _dbSet(key, val) {
    if (!this._db) return;
    try {
      const tx = this._db.transaction('store', 'readwrite');
      tx.objectStore('store').put(val, key);
    } catch(e) { Logger.error('IDB Save Error', e); }
  },

  _dbRemove(key) {
    if (!this._db) return;
    try {
      const tx = this._db.transaction('store', 'readwrite');
      tx.objectStore('store').delete(key);
    } catch(e) { Logger.warn('IDB Remove Error', e); }
  },

  // Generic
  _get(key) {
    // Retornamos un clon rápido para evitar mutaciones directas indeseadas si se edita el array directamente
    const val = this._state[key];
    return val !== undefined ? val : null;
  },
  _set(key, val) {
    this._state[key] = val;
    this._dbSet(key, val);
  },
  _remove(key) {
    delete this._state[key];
    this._dbRemove(key);
  },

  // User Settings
  getUser() {
    return this._get(this.KEYS.USER) || {
      name: 'Atleta',
      units: 'kg',
      defaultRestTimer: 90,
      weeklyGoal: 4,
      theme: 'light',
      favorites: [],
      bodyWeight: [],
      achievements: []
    };
  },
  saveUser(user) { this._set(this.KEYS.USER, user); },

  toggleFavorite(id) {
    const user = this.getUser();
    if (!user.favorites) user.favorites = [];
    const isFav = user.favorites.includes(id);
    if (isFav) {
      user.favorites = user.favorites.filter(f => f !== id);
    } else {
      user.favorites.push(id);
    }
    this.saveUser(user);
    return !isFav;
  },
  isFavorite(id) {
    const user = this.getUser();
    return user.favorites ? user.favorites.includes(id) : false;
  },

  // Routines
  getRoutines() { return this._get(this.KEYS.ROUTINES) || []; },
  saveRoutines(routines) { this._set(this.KEYS.ROUTINES, routines); },
  addRoutine(routine) {
    const routines = this.getRoutines();
    routine.id = this.uuid();
    routine.createdAt = new Date().toISOString();
    routines.unshift(routine);
    this.saveRoutines(routines);
    return routine;
  },
  updateRoutine(id, updates) {
    const routines = this.getRoutines();
    const idx = routines.findIndex(r => r.id === id);
    if (idx !== -1) { Object.assign(routines[idx], updates); this.saveRoutines(routines); }
    return routines[idx];
  },
  deleteRoutine(id) {
    const routines = this.getRoutines().filter(r => r.id !== id);
    this.saveRoutines(routines);
  },
  getRoutine(id) { return this.getRoutines().find(r => r.id === id) || null; },

  // Workouts (completed)
  getWorkouts() { return this._get(this.KEYS.WORKOUTS) || []; },
  saveWorkouts(workouts) { this._set(this.KEYS.WORKOUTS, workouts); },
  addWorkout(workout) {
    const workouts = this.getWorkouts();
    workout.id = this.uuid();
    workouts.unshift(workout);
    this.saveWorkouts(workouts);
    return workout;
  },
  getWorkout(id) { return this.getWorkouts().find(w => w.id === id) || null; },
  deleteWorkout(id) {
    this.saveWorkouts(this.getWorkouts().filter(w => w.id !== id));
  },

  // Active workout (in-progress)
  getActiveWorkout() { return this._get(this.KEYS.ACTIVE_WORKOUT); },
  saveActiveWorkout(w) { this._set(this.KEYS.ACTIVE_WORKOUT, w); },
  clearActiveWorkout() { this._remove(this.KEYS.ACTIVE_WORKOUT); },

  // Custom exercises
  getCustomExercises() { return this._get(this.KEYS.CUSTOM_EXERCISES) || []; },
  addCustomExercise(ex) {
    const list = this.getCustomExercises();
    ex.id = 'custom-' + this.uuid();
    ex.isCustom = true;
    list.push(ex);
    this._set(this.KEYS.CUSTOM_EXERCISES, list);
    return ex;
  },
  deleteCustomExercise(id) {
    const list = this.getCustomExercises().filter(e => e.id !== id);
    this._set(this.KEYS.CUSTOM_EXERCISES, list);
  },

  // All exercises (default + custom)
  getAllExercises() {
    return [...DEFAULT_EXERCISES, ...this.getCustomExercises()];
  },
  getExercise(id) {
    return this.getAllExercises().find(e => e.id === id) || null;
  },

  // Stats helpers
  getWorkoutsThisWeek() {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
    startOfWeek.setHours(0, 0, 0, 0);
    return this.getWorkouts().filter(w => new Date(w.finishedAt) >= startOfWeek);
  },
  getTotalVolume(workout) {
    let vol = 0;
    (workout.exercises || []).forEach(ex => {
      (ex.sets || []).forEach(s => {
        if (s.completed) vol += (s.weight || 0) * (s.reps || 0);
      });
    });
    return vol;
  },
  getStreak() {
    const workouts = this.getWorkouts().sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt));
    if (!workouts.length) return 0;
    let streak = 0;
    let current = new Date();
    current.setHours(0, 0, 0, 0);
    const dayMs = 86400000;
    for (let i = 0; i < 365; i++) {
      const dayStr = current.toISOString().split('T')[0];
      const hasWorkout = workouts.some(w => w.finishedAt && w.finishedAt.split('T')[0] === dayStr);
      if (hasWorkout) { streak++; }
      else if (i > 0) { break; }
      current = new Date(current.getTime() - dayMs);
    }
    return streak;
  },
  getPersonalRecords(exerciseId) {
    const workouts = this.getWorkouts();
    let maxWeight = 0, maxVolume = 0, max1RM = 0;
    workouts.forEach(w => {
      (w.exercises || []).forEach(ex => {
        if (ex.exerciseId === exerciseId) {
          (ex.sets || []).forEach(s => {
            if (!s.completed) return;
            if (s.weight > maxWeight) maxWeight = s.weight;
            const vol = (s.weight || 0) * (s.reps || 0);
            if (vol > maxVolume) maxVolume = vol;
            const est1rm = s.weight * (1 + s.reps / 30);
            if (est1rm > max1RM) max1RM = est1rm;
          });
        }
      });
    });
    return { maxWeight, maxVolume, max1RM: Math.round(max1RM) };
  },
  getPreviousPerformance(exerciseId) {
    const workouts = this.getWorkouts();
    for (const w of workouts) {
      const ex = (w.exercises || []).find(e => e.exerciseId === exerciseId);
      if (ex && ex.sets && ex.sets.length) return ex.sets;
    }
    return null;
  },

  // UUID generator
  uuid() {
    return 'xxxx-xxxx-xxxx'.replace(/x/g, () => ((Math.random() * 16) | 0).toString(16));
  },

  // Export / Import
  exportData() {
    return JSON.stringify({
      user: this.getUser(),
      routines: this.getRoutines(),
      workouts: this.getWorkouts(),
      customExercises: this.getCustomExercises(),
      programs: this.getPrograms(),
      measurements: this.getBodyMeasurements(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  },
  importData(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.user) this.saveUser(data.user);
      if (data.routines) this.saveRoutines(data.routines);
      if (data.workouts) this.saveWorkouts(data.workouts);
      if (data.customExercises) this._set(this.KEYS.CUSTOM_EXERCISES, data.customExercises);
      if (data.programs) this.savePrograms(data.programs);
      if (data.measurements) this._set(this.KEYS.MEASUREMENTS, data.measurements);
      return true;
    } catch(e) { Logger.error('Import data failed:', e); return false; }
  },

  // --- XP & Level System ---
  LEVELS: [
    { name: 'Novato', minXP: 0, icon: '🌱' },
    { name: 'Iniciado', minXP: 500, icon: '🥉' },
    { name: 'Intermedio', minXP: 1500, icon: '🥈' },
    { name: 'Avanzado', minXP: 4000, icon: '🥇' },
    { name: 'Élite', minXP: 8000, icon: '💎' },
    { name: 'Leyenda', minXP: 15000, icon: '👑' },
    { name: 'Titán', minXP: 30000, icon: '⚡' },
  ],

  calculateXP() {
    const workouts = this.getWorkouts();
    const streak = this.getStreak();
    const user = this.getUser();
    const achievements = (user.achievements || []).length;
    let xp = 0;
    xp += workouts.length * 100;           // 100 XP per workout
    xp += streak * 50;                     // 50 XP per streak day
    xp += achievements * 200;             // 200 XP per achievement
    workouts.forEach(w => {
      xp += Math.floor(this.getTotalVolume(w) / 500); // 1 XP per 500 volume
    });
    return xp;
  },

  getUserLevel() {
    const xp = this.calculateXP();
    let level = this.LEVELS[0];
    let nextLevel = this.LEVELS[1];
    for (let i = this.LEVELS.length - 1; i >= 0; i--) {
      if (xp >= this.LEVELS[i].minXP) {
        level = this.LEVELS[i];
        nextLevel = this.LEVELS[i + 1] || null;
        break;
      }
    }
    const progressXP = xp - level.minXP;
    const neededXP = nextLevel ? nextLevel.minXP - level.minXP : 1;
    const progress = nextLevel ? Math.min(1, progressXP / neededXP) : 1;
    return { ...level, xp, nextLevel, progress, progressXP, neededXP };
  },

  // --- Weekly Comparison ---
  getWorkoutsLastWeek() {
    const now = new Date();
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay() + 1);
    startOfThisWeek.setHours(0, 0, 0, 0);
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    return this.getWorkouts().filter(w => {
      const d = new Date(w.finishedAt);
      return d >= startOfLastWeek && d < startOfThisWeek;
    });
  },

  getWeekComparison() {
    const thisWeek = this.getWorkoutsThisWeek();
    const lastWeek = this.getWorkoutsLastWeek();
    const thisVol = thisWeek.reduce((s, w) => s + this.getTotalVolume(w), 0);
    const lastVol = lastWeek.reduce((s, w) => s + this.getTotalVolume(w), 0);
    const volChange = lastVol > 0 ? ((thisVol - lastVol) / lastVol * 100) : (thisVol > 0 ? 100 : 0);
    const countChange = lastWeek.length > 0 ? thisWeek.length - lastWeek.length : thisWeek.length;

    // Muscles worked this week
    const muscles = new Set();
    thisWeek.forEach(w => {
      (w.exercises || []).forEach(ex => {
        const d = this.getExercise(ex.exerciseId);
        if (d && d.primaryMuscle) muscles.add(d.primaryMuscle);
      });
    });

    // Best exercise this week (by volume)
    const exVols = {};
    thisWeek.forEach(w => {
      (w.exercises || []).forEach(ex => {
        const vol = (ex.sets || []).reduce((s, set) => s + (set.completed ? (set.weight || 0) * (set.reps || 0) : 0), 0);
        exVols[ex.exerciseId] = (exVols[ex.exerciseId] || 0) + vol;
      });
    });
    let bestExId = null, bestVol = 0;
    for (const [id, vol] of Object.entries(exVols)) {
      if (vol > bestVol) { bestVol = vol; bestExId = id; }
    }
    const bestEx = bestExId ? this.getExercise(bestExId) : null;

    return {
      thisWeekCount: thisWeek.length,
      lastWeekCount: lastWeek.length,
      thisVol, lastVol, volChange, countChange,
      muscles: [...muscles],
      bestExercise: bestEx ? bestEx.name : null,
      bestExVol: bestVol
    };
  },

  // --- Exercise History for Progression ---
  getExerciseHistory(exerciseId, limit = 6) {
    const workouts = this.getWorkouts();
    const history = [];
    for (const w of workouts) {
      const ex = (w.exercises || []).find(e => e.exerciseId === exerciseId);
      if (ex && ex.sets && ex.sets.length) {
        const completedSets = ex.sets.filter(s => s.completed);
        if (completedSets.length === 0) continue;
        const maxWeight = Math.max(...completedSets.map(s => s.weight || 0));
        const maxReps = Math.max(...completedSets.filter(s => s.weight === maxWeight).map(s => s.reps || 0));
        const totalVol = completedSets.reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0);
        history.push({ date: w.finishedAt, maxWeight, maxReps, totalVol, sets: completedSets });
        if (history.length >= limit) break;
      }
    }
    return history;
  },

  getSuggestedProgression(exerciseId) {
    const history = this.getExerciseHistory(exerciseId, 4);
    if (history.length === 0) return null;
    const user = this.getUser();
    const goal = user.goal || 'hypertrophy';
    const last = history[0];
    const prev = history[1] || null;

    // Determine increment based on goal
    const weightInc = user.units === 'kg' ? 2.5 : 5;
    const repInc = 2;

    let suggestion = '';
    let type = 'progress'; // 'progress' | 'deload' | 'maintain'

    // Check if user is trending down (potential deload)
    if (prev && last.maxWeight < prev.maxWeight && last.maxReps <= prev.maxReps) {
      suggestion = `Parece que bajaste. Intenta ${last.maxWeight}${user.units} × ${last.maxReps + 1} y recupera.`;
      type = 'deload';
    } else if (goal === 'strength') {
      suggestion = `Intenta ${last.maxWeight + weightInc}${user.units} × ${Math.min(last.maxReps, 5)}`;
      type = 'progress';
    } else if (goal === 'endurance') {
      if (last.maxReps < 20) {
        suggestion = `Intenta ${last.maxWeight}${user.units} × ${last.maxReps + repInc}`;
      } else {
        suggestion = `Sube a ${last.maxWeight + weightInc}${user.units} × 15`;
      }
      type = 'progress';
    } else {
      // Hypertrophy: alternate between +reps and +weight
      if (last.maxReps < 12) {
        suggestion = `Intenta ${last.maxWeight}${user.units} × ${last.maxReps + repInc}`;
      } else {
        suggestion = `Sube a ${last.maxWeight + weightInc}${user.units} × 8`;
      }
      type = 'progress';
    }

    return { suggestion, type, last, history };
  },

  // --- Body Measurements ---
  getBodyMeasurements() {
    return this._get(this.KEYS.MEASUREMENTS) || [];
  },
  addBodyMeasurement(data) {
    const all = this.getBodyMeasurements();
    all.push({ ...data, date: new Date().toISOString() });
    this._set(this.KEYS.MEASUREMENTS, all);
    return all;
  },
  deleteBodyMeasurement(index) {
    const all = this.getBodyMeasurements();
    all.splice(index, 1);
    this._set(this.KEYS.MEASUREMENTS, all);
    return all;
  },

  // --- Programs (Multi-Week) ---
  getPrograms() {
    return this._get(this.KEYS.PROGRAMS) || [];
  },
  savePrograms(programs) {
    this._set(this.KEYS.PROGRAMS, programs);
  },
  addProgram(program) {
    const all = this.getPrograms();
    program.id = 'prog_' + Date.now();
    program.createdAt = new Date().toISOString();
    program.currentWeek = 1;
    program.completedWorkouts = [];
    all.push(program);
    this.savePrograms(all);
    return program;
  },
  deleteProgram(id) {
    const all = this.getPrograms().filter(p => p.id !== id);
    this.savePrograms(all);
  },
  getActiveProgram() {
    return this.getPrograms().find(p => p.active) || null;
  },
  getNextProgramWorkout(program) {
    if (!program) return null;

    // --- Rotation mode ---
    if (program.mode === 'rotation' && program.rotationRoutines && program.rotationRoutines.length) {
      const completed = (program.completedWorkouts || []).length;
      const nextIdx = completed % program.rotationRoutines.length;
      const routineId = program.rotationRoutines[nextIdx];
      const routine = routineId === 'rest' ? { id: 'rest', name: 'Día de Descanso 💤' } : this.getRoutines().find(r => r.id === routineId);
      if (!routine) return null;
      const lastWorkoutDate = program.completedWorkouts && program.completedWorkouts.length
        ? program.completedWorkouts[program.completedWorkouts.length - 1].date : null;
      const restDays = program.restDaysBetween || 0;
      let canTrainToday = true;
      if (lastWorkoutDate && restDays > 0) {
        const lastDate = new Date(lastWorkoutDate);
        lastDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((today - lastDate) / 86400000);
        canTrainToday = daysDiff > restDays;
      }
      return { routine, isToday: canTrainToday, rotationIndex: nextIdx, totalRotations: program.rotationRoutines.length };
    }

    // --- Weekly mode (original) ---
    if (!program.schedule || !program.schedule.length) return null;
    const dayOfWeek = new Date().getDay(); // 0=Sun
    const todaySlot = program.schedule.find(s => s.day === dayOfWeek);
    if (todaySlot && todaySlot.routineId) {
      const routine = this.getRoutines().find(r => r.id === todaySlot.routineId);
      return routine ? { routine, slot: todaySlot, isToday: true } : null;
    }
    // Find next scheduled day
    for (let offset = 1; offset <= 7; offset++) {
      const nextDay = (dayOfWeek + offset) % 7;
      const slot = program.schedule.find(s => s.day === nextDay);
      if (slot && slot.routineId) {
        const routine = this.getRoutines().find(r => r.id === slot.routineId);
        if (routine) return { routine, slot, isToday: false, daysUntil: offset };
      }
    }
    return null;
  },

  recordProgramWorkout(routineId) {
    const programs = this.getPrograms();
    const program = programs.find(p => p.active);
    if (!program) return;
    if (program.mode === 'rotation') {
      if (!program.completedWorkouts) program.completedWorkouts = [];
      program.completedWorkouts.push({ routineId, date: new Date().toISOString() });
      // Check if we've completed a full cycle
      const cyclesDone = Math.floor(program.completedWorkouts.length / program.rotationRoutines.length);
      if (cyclesDone > 0 && program.completedWorkouts.length % program.rotationRoutines.length === 0) {
        program.currentWeek = Math.min(program.currentWeek + 1, program.weeks);
      }
      this.savePrograms(programs);
    }
  },

  getRoutineFolders() {
    const routines = this.getRoutines();
    const folders = new Set();
    routines.forEach(r => { if (r.folder) folders.add(r.folder); });
    return [...folders].sort();
  },

  getPhotos() {
    return this._get(this.KEYS.PHOTOS) || [];
  },
  
  addPhoto(photo) {
    const photos = this.getPhotos();
    photos.push(photo);
    this._set(this.KEYS.PHOTOS, photos);
  },
  
  deletePhoto(id) {
    let photos = this.getPhotos();
    photos = photos.filter(p => p.id !== id);
    this._set(this.KEYS.PHOTOS, photos);
  }
};


