// ============================================
// GravityFit — Storage Layer (storage.js)
// ============================================
// v2.1 — Fixed critical data loss bugs:
//   1. _dbSet now uses async transactions with proper error handling
//   2. localStorage backup fallback on every write
//   3. Storage quota monitoring
//   4. Data integrity validation on load
//   5. Auto-backup export support
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

  // Backup keys prefix for localStorage fallback
  _BACKUP_PREFIX: 'gf_bak_',

  _state: {},
  _db: null,
  _dbReady: false,
  _quotaWarningShown: false,

  // =============================================
  // IndexedDB Init & Migration (FIXED)
  // =============================================
  initDb() {
    return new Promise((resolve, reject) => {
      let dbReq;
      try {
        dbReq = indexedDB.open('GravityFitDB', 1);
      } catch (e) {
        Logger.error('IndexedDB not available, using localStorage only', e);
        this._loadFromLocalStorageBackup();
        resolve();
        return;
      }

      dbReq.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('store')) {
          db.createObjectStore('store');
        }
      };

      dbReq.onsuccess = (e) => {
        this._db = e.target.result;
        this._dbReady = true;

        // Handle connection loss
        this._db.onversionchange = () => {
          Logger.warn('IndexedDB version change detected — closing connection');
          this._db.close();
          this._db = null;
          this._dbReady = false;
        };

        this._loadAllFromDb().then(resolve).catch((err) => {
          Logger.error('Error loading from IndexedDB, falling back to localStorage', err);
          this._loadFromLocalStorageBackup();
          resolve();
        });
      };

      dbReq.onerror = (e) => {
        Logger.error('IndexedDB open error', e.target.error);
        // DO NOT silently resolve with empty state — try localStorage backup
        this._loadFromLocalStorageBackup();
        resolve();
      };

      dbReq.onblocked = () => {
        Logger.warn('IndexedDB blocked — another tab may have it open');
        this._loadFromLocalStorageBackup();
        resolve();
      };
    });
  },

  async _loadAllFromDb() {
    return new Promise((resolve, reject) => {
      if (!this._db) {
        reject(new Error('No IndexedDB connection'));
        return;
      }

      try {
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

          // Validate loaded data integrity
          this._validateDataIntegrity();

          // Migration from localStorage if IDB is empty
          if (!hasData) {
            Logger.info('IndexedDB empty. Migrating from localStorage...');
            this._loadFromLocalStorageBackup();
            // Also try the old localStorage migration path
            for (const key of Object.values(this.KEYS)) {
              const lsVal = localStorage.getItem(key);
              if (lsVal) {
                try {
                  const parsed = JSON.parse(lsVal);
                  this._state[key] = parsed;
                  this._dbSetSync(key, parsed); // Sync save to IDB
                } catch(e) {
                  Logger.warn('Failed to parse localStorage data for key:', key, e);
                }
              }
            }
            localStorage.setItem('gf_migrated', 'true');
          }

          // Sync backup to localStorage
          this._syncBackupToLocalStorage();
          resolve();
        };

        tx.onerror = (e) => {
          Logger.error('IndexedDB read error', e.target.error);
          reject(e.target.error);
        };
      } catch (e) {
        reject(e);
      }
    });
  },

  // =============================================
  // Data Integrity Validation
  // =============================================
  _validateDataIntegrity() {
    const workouts = this._state[this.KEYS.WORKOUTS];
    if (workouts && !Array.isArray(workouts)) {
      Logger.warn('Workouts data corrupted — expected array, resetting');
      this._state[this.KEYS.WORKOUTS] = [];
    }

    const routines = this._state[this.KEYS.ROUTINES];
    if (routines && !Array.isArray(routines)) {
      Logger.warn('Routines data corrupted — expected array, resetting');
      this._state[this.KEYS.ROUTINES] = [];
    }

    const user = this._state[this.KEYS.USER];
    if (user && typeof user !== 'object') {
      Logger.warn('User data corrupted — expected object, resetting');
      this._state[this.KEYS.USER] = null;
    }

    const programs = this._state[this.KEYS.PROGRAMS];
    if (programs && !Array.isArray(programs)) {
      Logger.warn('Programs data corrupted — expected array, resetting');
      this._state[this.KEYS.PROGRAMS] = [];
    }

    const measurements = this._state[this.KEYS.MEASUREMENTS];
    if (measurements && !Array.isArray(measurements)) {
      Logger.warn('Measurements data corrupted — expected array, resetting');
      this._state[this.KEYS.MEASUREMENTS] = [];
    }
  },

  // =============================================
  // IndexedDB Write (FIXED — async with backup)
  // =============================================
  _dbSet(key, val) {
    // Always write to in-memory state
    this._state[key] = val;

    // Always backup to localStorage (synchronous, reliable)
    this._localStorageBackup(key, val);

    // Write to IndexedDB (async, may fail)
    if (this._db && this._dbReady) {
      try {
        const tx = this._db.transaction('store', 'readwrite');
        tx.objectStore('store').put(val, key);
        tx.oncomplete = () => {
          Logger.debug('IDB write completed for key:', key);
        };
        tx.onerror = (e) => {
          Logger.error('IDB write failed for key:', key, e.target.error);
          // Data is safe in memory + localStorage backup
        };
        tx.onabort = (e) => {
          Logger.warn('IDB write aborted for key:', key, e.target.error || 'transaction aborted');
        };
      } catch(e) {
        Logger.error('IDB transaction error for key:', key, e);
        // Data is safe in memory + localStorage backup
      }
    } else {
      Logger.warn('IDB not available, data saved to memory + localStorage only, key:', key);
    }
  },

  // Sync version for migration (no async needed)
  _dbSetSync(key, val) {
    if (!this._db) return;
    try {
      const tx = this._db.transaction('store', 'readwrite');
      tx.objectStore('store').put(val, key);
    } catch(e) { Logger.error('IDB Save Error (sync)', e); }
  },

  _dbRemove(key) {
    // Remove from in-memory
    delete this._state[key];

    // Remove from localStorage backup
    localStorage.removeItem(this._BACKUP_PREFIX + key);

    // Remove from IndexedDB
    if (this._db && this._dbReady) {
      try {
        const tx = this._db.transaction('store', 'readwrite');
        tx.objectStore('store').delete(key);
        tx.onerror = (e) => {
          Logger.error('IDB remove failed for key:', key, e.target.error);
        };
      } catch(e) {
        Logger.warn('IDB Remove Error', e);
      }
    }
  },

  // =============================================
  // localStorage Backup (synchronous fallback)
  // =============================================
  _localStorageBackup(key, val) {
    try {
      const serialized = JSON.stringify(val);
      localStorage.setItem(this._BACKUP_PREFIX + key, serialized);

      // Also update backup metadata
      const meta = this._getBackupMeta();
      meta.lastBackup = Date.now();
      meta.keys = meta.keys || [];
      if (!meta.keys.includes(key)) meta.keys.push(key);
      localStorage.setItem(this._BACKUP_PREFIX + '_meta', JSON.stringify(meta));
    } catch (e) {
      // localStorage might be full — try to trim old backup data
      Logger.warn('localStorage backup failed for key:', key, e);
      this._handleStorageQuotaError(e);
    }
  },

  _loadFromLocalStorageBackup() {
    Logger.info('Loading data from localStorage backup...');
    let loaded = 0;
    for (const key of Object.values(this.KEYS)) {
      const backupKey = this._BACKUP_PREFIX + key;
      const lsVal = localStorage.getItem(backupKey);
      if (lsVal) {
        try {
          const parsed = JSON.parse(lsVal);
          this._state[key] = parsed;
          loaded++;
        } catch(e) {
          Logger.warn('Failed to parse backup for key:', key, e);
        }
      }
    }
    if (loaded > 0) {
      Logger.info(`Loaded ${loaded} keys from localStorage backup`);
    } else {
      Logger.warn('No localStorage backup data found');
    }
  },

  _getBackupMeta() {
    try {
      const meta = localStorage.getItem(this._BACKUP_PREFIX + '_meta');
      return meta ? JSON.parse(meta) : { lastBackup: 0, keys: [] };
    } catch {
      return { lastBackup: 0, keys: [] };
    }
  },

  _syncBackupToLocalStorage() {
    for (const key of Object.values(this.KEYS)) {
      if (this._state[key] !== undefined) {
        this._localStorageBackup(key, this._state[key]);
      }
    }
  },

  // =============================================
  // Storage Quota Monitoring
  // =============================================
  async checkStorageQuota() {
    if (!navigator.storage || !navigator.storage.estimate) {
      return { available: true, usage: 0, quota: 0, percentage: 0 };
    }
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentage = quota > 0 ? Math.round((usage / quota) * 100) : 0;

      if (percentage > 80 && !this._quotaWarningShown) {
        this._quotaWarningShown = true;
        Logger.warn(`Storage quota high: ${percentage}% used (${this._formatBytes(usage)} / ${this._formatBytes(quota)})`);
      }

      return {
        available: percentage < 95,
        usage,
        quota,
        percentage,
        formattedUsage: this._formatBytes(usage),
        formattedQuota: this._formatBytes(quota),
      };
    } catch (e) {
      Logger.warn('Storage quota check failed', e);
      return { available: true, usage: 0, quota: 0, percentage: 0 };
    }
  },

  _formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  _handleStorageQuotaError(e) {
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      Logger.error('Storage quota exceeded!', e);
      // Try to free space by removing old photos (least critical data)
      const photos = this._state[this.KEYS.PHOTOS];
      if (photos && photos.length > 5) {
        this._state[this.KEYS.PHOTOS] = photos.slice(-5);
        this._localStorageBackup(this.KEYS.PHOTOS, this._state[this.KEYS.PHOTOS]);
        Logger.info('Trimmed photos to free storage space');
      }
    }
  },

  // =============================================
  // Generic Get/Set (with backup)
  // =============================================
  _get(key) {
    const val = this._state[key];
    return val !== undefined ? val : null;
  },

  _set(key, val) {
    this._dbSet(key, val);
  },

  _remove(key) {
    this._dbRemove(key);
  },

  // =============================================
  // Auto-Backup / Export
  // =============================================
  generateBackup() {
    const backup = {
      version: '2.1',
      timestamp: new Date().toISOString(),
      data: {}
    };

    for (const key of Object.values(this.KEYS)) {
      const val = this._get(key);
      if (val !== null) {
        backup.data[key] = val;
      }
    }

    return backup;
  },

  downloadBackup() {
    const backup = this.generateBackup();
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `gravityfit-backup-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    Logger.info('Backup downloaded:', `gravityfit-backup-${date}.json`);
    return true;
  },

  async restoreBackup(fileContent) {
    try {
      const backup = JSON.parse(fileContent);

      // Support both old format (flat keys) and new format (nested data)
      const data = backup.data || backup;

      for (const key of Object.values(this.KEYS)) {
        if (data[key] !== undefined) {
          this._set(key, data[key]);
        }
      }

      Logger.info('Backup restored successfully');
      return true;
    } catch (e) {
      Logger.error('Failed to restore backup', e);
      return false;
    }
  },

  // Schedule automatic backup reminder (check once per session)
  _lastBackupCheck: 0,
  shouldBackup() {
    const now = Date.now();
    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
    if (now - this._lastBackupCheck < ONE_WEEK) return false;
    this._lastBackupCheck = now;

    const meta = this._getBackupMeta();
    const lastBackup = meta.lastBackup || 0;
    return (now - lastBackup) > ONE_WEEK;
  },

  markBackupDone() {
    const meta = this._getBackupMeta();
    meta.lastBackup = Date.now();
    localStorage.setItem(this._BACKUP_PREFIX + '_meta', JSON.stringify(meta));
  },

  // =============================================
  // User Settings
  // =============================================
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

  // =============================================
  // Routines
  // =============================================
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

  // =============================================
  // Workouts (completed)
  // =============================================
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

  // =============================================
  // Active workout (in-progress)
  // =============================================
  getActiveWorkout() { return this._get(this.KEYS.ACTIVE_WORKOUT); },
  saveActiveWorkout(w) { this._set(this.KEYS.ACTIVE_WORKOUT, w); },
  clearActiveWorkout() { this._remove(this.KEYS.ACTIVE_WORKOUT); },

  // =============================================
  // Custom exercises
  // =============================================
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

  // =============================================
  // All exercises (default + custom)
  // =============================================
  getAllExercises() {
    return [...DEFAULT_EXERCISES, ...this.getCustomExercises()];
  },
  getExercise(id) {
    return this.getAllExercises().find(e => e.id === id) || null;
  },

  // =============================================
  // Stats helpers
  // =============================================
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
  _localDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  getStreak() {
    const workouts = this.getWorkouts().sort((a, b) => new Date(b.finishedAt) - new Date(a.finishedAt));
    if (!workouts.length) return 0;
    let streak = 0;
    let current = new Date();
    current.setHours(0, 0, 0, 0);
    const todayStr = this._localDateStr(current);
    const dayMs = 86400000;
    let missedDays = 0;
    const MAX_GRACE = 1; // 1 day grace for active program users
    const hasActiveProgram = !!this.getActiveProgram();
    for (let i = 0; i < 365; i++) {
      const dayStr = i === 0 ? todayStr : this._localDateStr(current);
      const hasWorkout = workouts.some(w => w.finishedAt && this._localDateStr(new Date(w.finishedAt)) === dayStr);
      if (hasWorkout) { streak++; }
      else if (i === 0) {
        // Today has no workout yet — don't break streak, just skip counting
      } else if (hasActiveProgram && missedDays < MAX_GRACE) {
        // Grace day: count it but note the miss
        missedDays++;
      } else { break; }
      current = new Date(current.getTime() - dayMs);
    }
    return streak;
  },

  // Check if today is a rest day for active program
  isRestDay() {
    const program = this.getActiveProgram();
    if (!program) return false;
    if (program.mode === 'rotation') {
      const completed = (program.completedWorkouts || []).length;
      const nextIdx = completed % (program.rotationRoutines || []).length;
      return program.rotationRoutines[nextIdx] === 'rest';
    }
    if (program.mode === 'weekly' && program.schedule) {
      const dayOfWeek = new Date().getDay();
      return !program.schedule.find(s => s.day === dayOfWeek);
    }
    return false;
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

  // =============================================
  // UUID generator
  // =============================================
  uuid() {
    return 'xxxx-xxxx-xxxx'.replace(/x/g, () => ((Math.random() * 16) | 0).toString(16));
  },

  // =============================================
  // Export / Import
  // =============================================
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

  // =============================================
  // XP & Level System
  // =============================================
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

  // =============================================
  // Weekly Comparison
  // =============================================
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

  // =============================================
  // Exercise History for Progression
  // =============================================
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

    const weightInc = user.units === 'kg' ? 2.5 : 5;
    const repInc = 2;

    let suggestion = '';
    let type = 'progress';

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
      if (last.maxReps < 12) {
        suggestion = `Intenta ${last.maxWeight}${user.units} × ${last.maxReps + repInc}`;
      } else {
        suggestion = `Sube a ${last.maxWeight + weightInc}${user.units} × 8`;
      }
      type = 'progress';
    }

    return { suggestion, type, last, history };
  },

  // =============================================
  // Body Measurements
  // =============================================
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

  // =============================================
  // Missed Workout Tracking
  // =============================================
  getMissedWorkouts() {
    return this._get('gf_missed_workouts') || [];
  },
  addMissedWorkout(data) {
    const missed = this.getMissedWorkouts();
    missed.push({ ...data, date: new Date().toISOString() });
    this._set('gf_missed_workouts', missed);
  },
  clearOldMissed() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const missed = this.getMissedWorkouts().filter(m => new Date(m.date) >= cutoff);
    this._set('gf_missed_workouts', missed);
  },
  rescheduleMissed(missedIdx) {
    const missed = this.getMissedWorkouts();
    const item = missed[missedIdx];
    if (!item) return null;
    item.rescheduled = true;
    this._set('gf_missed_workouts', missed);
    return item;
  },
  skipMissed(missedIdx) {
    const missed = this.getMissedWorkouts();
    const item = missed[missedIdx];
    if (!item) return;
    item.skipped = true;
    this._set('gf_missed_workouts', missed);
  },

  // =============================================
  // Notification Settings
  // =============================================
  getNotificationSettings() {
    return this._get('gf_notification_settings') || {
      enabled: false,
      time: '08:00',
      restDayTips: true,
      missedReminder: true,
      competitionAlerts: true,
    };
  },
  saveNotificationSettings(settings) {
    this._set('gf_notification_settings', settings);
  },

  // =============================================
  // Program Adherence
  // =============================================
  getProgramAdherence(program) {
    if (!program) return { scheduled: 0, completed: 0, missed: 0, percentage: 0 };
    const scheduled = (program.completedWorkouts || []).length;
    const missed = this.getMissedWorkouts().filter(m => m.programId === program.id && !m.rescheduled).length;
    const total = scheduled + missed;
    const percentage = total > 0 ? Math.round((scheduled / total) * 100) : 100;
    return { scheduled, completed: scheduled, missed, percentage };
  },

  // =============================================
  // Programs (Multi-Week)
  // =============================================
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

    if (!program.schedule || !program.schedule.length) return null;
    const dayOfWeek = new Date().getDay();
    const todaySlot = program.schedule.find(s => s.day === dayOfWeek);
    if (todaySlot && todaySlot.routineId) {
      const routine = this.getRoutines().find(r => r.id === todaySlot.routineId);
      return routine ? { routine, slot: todaySlot, isToday: true } : null;
    }
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
  },

  // =============================================
  // Social Competition System
  // =============================================
  getCompetitions() {
    return this._get('gf_competitions') || [];
  },
  saveCompetitions(comps) {
    this._set('gf_competitions', comps);
  },
  addCompetition(comp) {
    const comps = this.getCompetitions();
    comp.id = 'comp_' + Date.now();
    comp.createdAt = new Date().toISOString();
    comp.members = comp.members || [];
    comp.dailyStats = {};
    comps.push(comp);
    this.saveCompetitions(comps);
    return comp;
  },
  getCompetition(id) {
    return this.getCompetitions().find(c => c.id === id) || null;
  },
  joinCompetition(code) {
    try {
      const decoded = JSON.parse(atob(code));
      if (!decoded.id || !decoded.name) return null;
      let comp = this.getCompetition(decoded.id);
      if (!comp) {
        comp = this.addCompetition({ name: decoded.name, creator: decoded.creator, members: [] });
      }
      const user = this.getUser();
      const alreadyMember = comp.members.find(m => m.userId === user.cloudId);
      if (!alreadyMember) {
        comp.members.push({ userId: user.cloudId, name: user.name, joinedAt: new Date().toISOString() });
        this.saveCompetitions(this.getCompetitions());
      }
      return comp;
    } catch(e) { return null; }
  },
  generateCompetitionCode(comp) {
    return btoa(JSON.stringify({ id: comp.id, name: comp.name, creator: comp.creator || Storage.getUser().name }));
  },
  recordCompetitionDay(compId, stats) {
    const comps = this.getCompetitions();
    const comp = comps.find(c => c.id === compId);
    if (!comp) return;
    const user = this.getUser();
    const today = this._localDateStr(new Date());
    if (!comp.dailyStats) comp.dailyStats = {};
    if (!comp.dailyStats[today]) comp.dailyStats[today] = {};
    comp.dailyStats[today][user.cloudId] = {
      name: user.name,
      workouts: stats.workouts || 0,
      volume: stats.volume || 0,
      duration: stats.duration || 0,
      streak: stats.streak || 0,
    };
    this.saveCompetitions(comps);
  },
  getCompetitionLeaderboard(compId, days = 7) {
    const comp = this.getCompetition(compId);
    if (!comp || !comp.dailyStats) return [];
    const scores = {};
    (comp.members || []).forEach(m => {
      scores[m.userId] = { name: m.name, userId: m.userId, totalVolume: 0, totalWorkouts: 0, totalDuration: 0, days: 0 };
    });
    const now = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = this._localDateStr(d);
      const dayStats = comp.dailyStats[key];
      if (!dayStats) continue;
      Object.entries(dayStats).forEach(([uid, stat]) => {
        if (!scores[uid]) scores[uid] = { name: stat.name || uid, userId: uid, totalVolume: 0, totalWorkouts: 0, totalDuration: 0, days: 0 };
        scores[uid].totalVolume += stat.volume || 0;
        scores[uid].totalWorkouts += stat.workouts || 0;
        scores[uid].totalDuration += stat.duration || 0;
        scores[uid].days += 1;
      });
    }
    return Object.values(scores).sort((a, b) => b.totalVolume - a.totalVolume);
  },
  getCompetitionDailyDetail(compId, dateStr) {
    const comp = this.getCompetition(compId);
    if (!comp || !comp.dailyStats || !comp.dailyStats[dateStr]) return [];
    return Object.entries(comp.dailyStats[dateStr]).map(([uid, stat]) => ({ userId: uid, ...stat })).sort((a, b) => b.volume - a.volume);
  },

  // =============================================
  // Direct Friendships
  // =============================================
  getFriends() {
    return this._get('gf_friends') || [];
  },
  saveFriends(friends) {
    this._set('gf_friends', friends);
  },
  addFriend(friend) {
    const friends = this.getFriends();
    const user = this.getUser();
    // Don't add yourself
    if (friend.userId === user.cloudId) return null;
    // Don't duplicate
    if (friends.find(f => f.userId === friend.userId)) return null;
    const entry = {
      userId: friend.userId,
      name: friend.name || 'Amigo',
      addedAt: new Date().toISOString(),
    };
    friends.push(entry);
    this.saveFriends(friends);
    return entry;
  },
  removeFriend(userId) {
    const friends = this.getFriends().filter(f => f.userId !== userId);
    this.saveFriends(friends);
  },
  generateFriendCode() {
    const user = this.getUser();
    return btoa(JSON.stringify({
      type: 'friend',
      userId: user.cloudId,
      name: user.name,
    }));
  },
  joinFriend(code) {
    try {
      const decoded = JSON.parse(atob(code));
      if (decoded.type !== 'friend' || !decoded.userId || !decoded.name) return { error: 'invalid' };
      const result = this.addFriend({ userId: decoded.userId, name: decoded.name });
      if (!result) return { error: 'duplicate' };
      return { friend: result };
    } catch (e) { return { error: 'invalid' }; }
  },
  /**
   * Calculate this week's stats for all friends + current user.
   * Returns sorted array by volume descending.
   */
  getFriendsWeeklyComparison() {
    const user = this.getUser();
    const friends = this.getFriends();
    if (!friends.length) return [];

    // My weekly stats
    const myWeek = this.getWorkoutsThisWeek();
    const myVol = myWeek.reduce((s, w) => s + this.getTotalVolume(w), 0);
    const myWorkouts = myWeek.length;
    const myDuration = myWeek.reduce((s, w) => s + (w.duration || 0), 0);
    const myStreak = this.getStreak();

    // Collect friend stats from competitions dailyStats (only if they share a comp)
    const comps = this.getCompetitions();
    const today = this._localDateStr(new Date());
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    const results = [{
      userId: user.cloudId,
      name: user.name,
      isMe: true,
      workouts: myWorkouts,
      volume: myVol,
      duration: myDuration,
      streak: myStreak,
    }];

    friends.forEach(friend => {
      // Try to get friend stats from competition dailyStats
      let fWorkouts = 0, fVolume = 0, fDuration = 0;
      let found = false;

      comps.forEach(comp => {
        if (!comp.dailyStats) return;
        for (let i = 0; i < 7; i++) {
          const d = new Date(startOfWeek);
          d.setDate(d.getDate() + i);
          const key = this._localDateStr(d);
          const dayData = comp.dailyStats[key];
          if (dayData && dayData[friend.userId]) {
            const stat = dayData[friend.userId];
            fWorkouts += stat.workouts || 0;
            fVolume += stat.volume || 0;
            fDuration += stat.duration || 0;
            found = true;
          }
        }
      });

      results.push({
        userId: friend.userId,
        name: friend.name,
        isMe: false,
        workouts: fWorkouts,
        volume: fVolume,
        duration: fDuration,
        streak: found ? undefined : null, // null = no data
        lastSeen: friend.addedAt,
      });
    });

    // Sort by volume (me always visible, friends sorted)
    return results.sort((a, b) => b.volume - a.volume);
  },

  // =============================================
  // Competition Notifications — Ranking Snapshots
  // =============================================
  getCompetitionRankingSnapshot(compId) {
    return this._get('gf_comp_snapshot_' + compId) || {};
  },
  saveCompetitionRankingSnapshot(compId, snapshot) {
    this._set('gf_comp_snapshot_' + compId, snapshot);
  },
  getCompetitionNotificationSettings() {
    const settings = this.getNotificationSettings();
    const alertsOn = settings.competitionAlerts !== false;
    return {
      enabled: alertsOn,
      friendWorkout: alertsOn,
      rankChange: alertsOn,
      competitionStreaks: alertsOn,
      rivalStreaks: alertsOn,
      friendProgress: alertsOn,
    };
  },
};
