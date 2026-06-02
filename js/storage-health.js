// ============================================
// GravityFit — Storage Health Monitor
// ============================================

import { Storage } from './storage.js';
import { Logger } from '../src/Logger.js';

export const StorageHealth = {
  _checkInterval: null,
  _lastStatus: null,

  // Run full health check
  async check() {
    const status = {
      timestamp: new Date().toISOString(),
      indexedDB: { available: false, connected: false },
      localStorage: { available: false, backupKeys: 0, lastBackup: null },
      quota: { available: true, usage: 0, quota: 0, percentage: 0, formatted: '' },
      dataIntegrity: { ok: true, issues: [] },
      overall: 'healthy',
    };

    // 1. Check IndexedDB
    try {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('HealthCheck', 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('probe')) db.createObjectStore('probe');
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = () => reject(new Error('IndexedDB unavailable'));
      });
      status.indexedDB.available = true;
      db.close();
      indexedDB.deleteDatabase('HealthCheck');
    } catch (e) {
      status.indexedDB.available = false;
      status.overall = 'degraded';
    }

    status.indexedDB.connected = Storage._dbReady;

    // 2. Check localStorage backups
    status.localStorage.available = typeof localStorage !== 'undefined';
    if (status.localStorage.available) {
      let backupCount = 0;
      for (const key of Object.values(Storage.KEYS)) {
        if (localStorage.getItem(Storage._BACKUP_PREFIX + key)) backupCount++;
      }
      status.localStorage.backupKeys = backupCount;
      const meta = Storage._getBackupMeta();
      status.localStorage.lastBackup = meta.lastBackup ? new Date(meta.lastBackup).toISOString() : null;
    }

    // 3. Check storage quota
    status.quota = await Storage.checkStorageQuota();
    status.quota.formatted = `${status.quota.formattedUsage} / ${status.quota.formattedQuota} (${status.quota.percentage}%)`;
    if (!status.quota.available) {
      status.overall = 'critical';
    }

    // 4. Data integrity check
    const workouts = Storage.getWorkouts();
    const routines = Storage.getRoutines();
    const user = Storage.getUser();

    if (workouts.length === 0 && routines.length === 0 && !user.name) {
      status.dataIntegrity.issues.push('No hay datos almacenados');
    }

    // Check for orphaned workout references
    workouts.forEach(w => {
      (w.exercises || []).forEach(ex => {
        if (ex.exerciseId && !Storage.getExercise(ex.exerciseId)) {
          status.dataIntegrity.issues.push(`Ejercicio huérfano: ${ex.exerciseId}`);
        }
      });
    });

    if (status.dataIntegrity.issues.length > 0) {
      status.dataIntegrity.ok = false;
    }

    // Overall assessment
    if (status.overall !== 'critical') {
      status.overall = status.indexedDB.connected ? 'healthy' : 'degraded';
    }

    this._lastStatus = status;
    return status;
  },

  // Get last cached status (no re-check)
  getLastStatus() {
    return this._lastStatus;
  },

  // Start periodic monitoring (every 5 minutes)
  startMonitoring() {
    if (this._checkInterval) return;
    this._checkInterval = setInterval(() => this.check(), 5 * 60 * 1000);
    this.check(); // Initial check
  },

  stopMonitoring() {
    if (this._checkInterval) {
      clearInterval(this._checkInterval);
      this._checkInterval = null;
    }
  },

  // Generate a human-readable status summary
  getStatusSummary(status) {
    if (!status) status = this._lastStatus;
    if (!status) return 'Estado desconocido';

    const parts = [];

    if (status.overall === 'healthy') {
      parts.push('✅ Todo funciona correctamente');
    } else if (status.overall === 'degraded') {
      parts.push('⚠️ IndexedDB no disponible — usando localStorage como respaldo');
    } else {
      parts.push('🚨 Almacenamiento casi lleno — exporta tus datos ahora');
    }

    if (status.indexedDB.connected) {
      parts.push(`💾 IndexedDB: Conectado`);
    } else {
      parts.push(`💾 IndexedDB: Desconectado`);
    }

    parts.push(`📱 Backup local: ${status.localStorage.backupKeys} claves guardadas`);

    if (status.localStorage.lastBackup) {
      const ago = this._timeAgo(new Date(status.localStorage.lastBackup));
      parts.push(`🕐 Último respaldo: ${ago}`);
    }

    parts.push(`📊 Espacio: ${status.quota.formatted}`);

    if (status.dataIntegrity.issues.length > 0) {
      parts.push(`🔍 ${status.dataIntegrity.issues.length} problema(s) detectado(s)`);
    }

    return parts.join('\n');
  },

  _timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'hace un momento';
    if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)}h`;
    return `hace ${Math.floor(seconds / 86400)} días`;
  }
};
