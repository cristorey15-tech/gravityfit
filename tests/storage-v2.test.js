// ============================================
// GravityFit — Storage v2 Tests (Backup & Safety)
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Storage } from '../js/storage.js';

describe('Storage v2 — Backup & Safety Features', () => {
  beforeEach(() => {
    Storage._state = {};
    Storage._db = null;
    Storage._dbReady = false;
    Storage._quotaWarningShown = false;
    localStorage.clear();
  });

  describe('localStorage backup', () => {
    it('should write backup to localStorage when _dbSet is called', () => {
      Storage._set(Storage.KEYS.USER, { name: 'Test', units: 'kg' });

      const backup = localStorage.getItem(Storage._BACKUP_PREFIX + Storage.KEYS.USER);
      expect(backup).not.toBeNull();
      expect(JSON.parse(backup).name).toBe('Test');
    });

    it('should update backup metadata on write', () => {
      Storage._set(Storage.KEYS.WORKOUTS, []);

      const metaRaw = localStorage.getItem(Storage._BACKUP_PREFIX + '_meta');
      expect(metaRaw).not.toBeNull();
      const meta = JSON.parse(metaRaw);
      expect(meta.keys).toContain(Storage.KEYS.WORKOUTS);
      expect(meta.lastBackup).toBeGreaterThan(0);
    });

    it('should remove backup from localStorage when _dbRemove is called', () => {
      Storage._set(Storage.KEYS.USER, { name: 'Test' });
      expect(localStorage.getItem(Storage._BACKUP_PREFIX + Storage.KEYS.USER)).not.toBeNull();

      Storage._remove(Storage.KEYS.USER);
      expect(localStorage.getItem(Storage._BACKUP_PREFIX + Storage.KEYS.USER)).toBeNull();
    });

    it('should load from localStorage backup when IDB is empty', () => {
      // Simulate data in localStorage backup
      const backupData = { name: 'Backup User', units: 'lbs' };
      localStorage.setItem(Storage._BACKUP_PREFIX + Storage.KEYS.USER, JSON.stringify(backupData));

      Storage._loadFromLocalStorageBackup();
      expect(Storage._state[Storage.KEYS.USER]).toEqual(backupData);
    });

    it('should handle corrupted backup data gracefully', () => {
      localStorage.setItem(Storage._BACKUP_PREFIX + Storage.KEYS.USER, 'not-json!!!');

      // Should not throw
      expect(() => Storage._loadFromLocalStorageBackup()).not.toThrow();
      expect(Storage._state[Storage.KEYS.USER]).toBeUndefined();
    });
  });

  describe('Backup & Restore', () => {
    it('generateBackup should include all stored data', () => {
      Storage._set(Storage.KEYS.USER, { name: 'Test' });
      Storage._set(Storage.KEYS.ROUTINES, [{ name: 'R1' }]);
      Storage._set(Storage.KEYS.WORKOUTS, [{ id: 'w1' }]);

      const backup = Storage.generateBackup();
      expect(backup.version).toBe('2.1');
      expect(backup.timestamp).toBeDefined();
      expect(backup.data[Storage.KEYS.USER]).toEqual({ name: 'Test' });
      expect(backup.data[Storage.KEYS.ROUTINES]).toHaveLength(1);
      expect(backup.data[Storage.KEYS.WORKOUTS]).toHaveLength(1);
    });

    it('restoreBackup should restore data from backup format', async () => {
      const backup = {
        version: '2.1',
        timestamp: new Date().toISOString(),
        data: {
          [Storage.KEYS.USER]: { name: 'Restored User' },
          [Storage.KEYS.ROUTINES]: [{ name: 'Restored Routine' }],
        }
      };

      const result = await Storage.restoreBackup(JSON.stringify(backup));
      expect(result).toBe(true);
      expect(Storage.getUser().name).toBe('Restored User');
      expect(Storage.getRoutines()).toHaveLength(1);
    });

    it('restoreBackup should handle old flat format', async () => {
      const oldFormat = {
        [Storage.KEYS.USER]: { name: 'Old Format User' },
      };

      const result = await Storage.restoreBackup(JSON.stringify(oldFormat));
      expect(result).toBe(true);
      expect(Storage.getUser().name).toBe('Old Format User');
    });

    it('restoreBackup should return false on invalid JSON', async () => {
      const result = await Storage.restoreBackup('not valid json');
      expect(result).toBe(false);
    });

    it('shouldBackup should return true when no backup exists', () => {
      Storage._lastBackupCheck = 0;
      expect(Storage.shouldBackup()).toBe(true);
    });

    it('shouldBackup should return false if recently checked', () => {
      Storage._lastBackupCheck = Date.now();
      expect(Storage.shouldBackup()).toBe(false);
    });

    it('markBackupDone should update metadata timestamp', () => {
      Storage.markBackupDone();
      const meta = Storage._getBackupMeta();
      expect(meta.lastBackup).toBeGreaterThan(0);
    });
  });

  describe('Data Integrity Validation', () => {
    it('should handle corrupted workouts data (non-array)', () => {
      Storage._state[Storage.KEYS.WORKOUTS] = 'corrupted';
      Storage._validateDataIntegrity();
      expect(Storage._state[Storage.KEYS.WORKOUTS]).toEqual([]);
    });

    it('should handle corrupted routines data (non-array)', () => {
      Storage._state[Storage.KEYS.ROUTINES] = 12345;
      Storage._validateDataIntegrity();
      expect(Storage._state[Storage.KEYS.ROUTINES]).toEqual([]);
    });

    it('should handle corrupted user data (non-object)', () => {
      Storage._state[Storage.KEYS.USER] = 'string-data';
      Storage._validateDataIntegrity();
      expect(Storage._state[Storage.KEYS.USER]).toBeNull();
    });

    it('should not corrupt valid data', () => {
      const validWorkouts = [{ id: 'w1', exercises: [] }];
      const validUser = { name: 'Test', units: 'kg' };
      Storage._state[Storage.KEYS.WORKOUTS] = validWorkouts;
      Storage._state[Storage.KEYS.USER] = validUser;

      Storage._validateDataIntegrity();
      expect(Storage._state[Storage.KEYS.WORKOUTS]).toEqual(validWorkouts);
      expect(Storage._state[Storage.KEYS.USER]).toEqual(validUser);
    });
  });

  describe('In-memory state always consistent', () => {
    it('should always write to _state even without IDB', () => {
      Storage._db = null;
      Storage._dbReady = false;

      Storage._set(Storage.KEYS.USER, { name: 'No DB Test' });
      expect(Storage._state[Storage.KEYS.USER]).toEqual({ name: 'No DB Test' });
    });

    it('should always remove from _state even without IDB', () => {
      Storage._state[Storage.KEYS.USER] = { name: 'To Delete' };
      Storage._db = null;
      Storage._dbReady = false;

      Storage._remove(Storage.KEYS.USER);
      expect(Storage._state[Storage.KEYS.USER]).toBeUndefined();
    });
  });

  describe('_getBackupMeta', () => {
    it('should return default meta when no backup exists', () => {
      const meta = Storage._getBackupMeta();
      expect(meta.lastBackup).toBe(0);
      expect(meta.keys).toEqual([]);
    });

    it('should return parsed meta when backup exists', () => {
      const meta = { lastBackup: Date.now(), keys: [Storage.KEYS.USER] };
      localStorage.setItem(Storage._BACKUP_PREFIX + '_meta', JSON.stringify(meta));

      const result = Storage._getBackupMeta();
      expect(result.lastBackup).toBe(meta.lastBackup);
      expect(result.keys).toEqual([Storage.KEYS.USER]);
    });
  });

  describe('_formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(Storage._formatBytes(0)).toBe('0 B');
      expect(Storage._formatBytes(1024)).toContain('KB');
      expect(Storage._formatBytes(1048576)).toContain('MB');
      expect(Storage._formatBytes(1073741824)).toContain('GB');
    });
  });

  describe('Sync backup to localStorage', () => {
    it('_syncBackupToLocalStorage should backup all keys with data', () => {
      Storage._state[Storage.KEYS.USER] = { name: 'Sync Test' };
      Storage._state[Storage.KEYS.ROUTINES] = [{ name: 'R1' }];
      // workouts not set — should be skipped

      Storage._syncBackupToLocalStorage();

      expect(JSON.parse(localStorage.getItem(Storage._BACKUP_PREFIX + Storage.KEYS.USER)).name).toBe('Sync Test');
      expect(JSON.parse(localStorage.getItem(Storage._BACKUP_PREFIX + Storage.KEYS.ROUTINES))).toHaveLength(1);
      expect(localStorage.getItem(Storage._BACKUP_PREFIX + Storage.KEYS.WORKOUTS)).toBeNull();
    });
  });
});
