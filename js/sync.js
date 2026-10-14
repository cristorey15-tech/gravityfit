// ============================================
// GravityFit — Cloud Sync via Firebase
// ============================================
//
// SECURITY MODEL
// --------------
// Each user is identified by an UNGUESSABLE random `cloudId` (128 bits from
// crypto.getRandomValues). That ID doubles as a shareable capability: whoever
// holds the sync token (a base64 blob carrying the ID + an expiry) can read and
// write that user's data. The token is NOT encrypted — treat it like a password
// and only share it with your own devices.
//
// The REAL enforcement lives in Firebase Security Rules (see
// database.rules.json), which must require `auth != null` so that only signed-in
// app users can touch `users/*`. Enable Anonymous Auth in the Firebase Console
// and deploy the rules to activate that gate. Without the rules the sync still
// works, but the unguessable ID is the only thing standing between a stranger
// and your data — deploy the rules.
//
// The per-account alternative (strongest) is to key data by `auth.uid` instead
// of a shareable ID; that requires real sign-in and drops the "link by code"
// UX. See SYNC-SECURITY.md.

import { Storage } from './storage.js';
import { Logger } from '../src/Logger.js';

export const CloudSync = {
  db: null,
  auth: null,
  cloudId: null,
  _authReady: null,

  // Shareable sync codes expire so a leaked/old code stops working.
  TOKEN_TTL_MS: 7 * 24 * 60 * 60 * 1000, // 7 days

  // Firebase genérico o por defecto (si proporcionas tus propias credenciales en el futuro, las pones aquí)
  // Firebase web config. The apiKey is a public identifier (it ships in every
  // web bundle); access is enforced by Security Rules + Auth, not by the key.
  defaultConfig: {
    apiKey: 'AIzaSyBQzBjtroMoSkoTduRkw8Ec7sRkx3t5_GQ',
    authDomain: 'gravityfit-ba2e9.firebaseapp.com',
    databaseURL: 'https://gravityfit-ba2e9-default-rtdb.europe-west1.firebasedatabase.app',
    projectId: 'gravityfit-ba2e9',
    storageBucket: 'gravityfit-ba2e9.firebasestorage.app',
    messagingSenderId: '113339374330',
    appId: '1:113339374330:web:bafdce03508bcfbf03c743',
  },

  // ---- ID + token helpers (pure, unit-testable) ----

  // 128-bit cryptographically random id (32 hex chars). Replaces the old
  // 'user_<timestamp>_<random>' id, which leaked a creation timestamp and was
  // effectively enumerable.
  _randomId() {
    const bytes = new Uint8Array(16);
    const c = typeof crypto !== 'undefined' ? crypto : window.crypto;
    c.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  },

  // Legacy ids were guessable; migrate them to a strong one on sight.
  _isWeakId(id) {
    return typeof id === 'string' && id.startsWith('user_');
  },

  // Sync: make sure this device has a strong cloudId (no Firebase needed).
  _ensureCloudId() {
    const user = Storage.getUser();
    if (!user.cloudId || this._isWeakId(user.cloudId)) {
      user.cloudId = this._randomId();
      Storage.saveUser(user);
      Logger.info('Migrated to a secure cloud sync ID.');
    }
    this.cloudId = user.cloudId;
    return this.cloudId;
  },

  // Parse + validate a sync token. Throws on invalid/expired.
  parseToken(tokenBase64) {
    let tokenData;
    try {
      tokenData = JSON.parse(atob(tokenBase64));
    } catch {
      throw new Error('El código de sincronización no es válido.');
    }
    if (!tokenData || typeof tokenData.id !== 'string' || !tokenData.id) {
      throw new Error('El código de sincronización no es válido.');
    }
    if (tokenData.exp && Date.now() > tokenData.exp) {
      throw new Error('El código de sincronización ha expirado (máx. 7 días). Genera uno nuevo.');
    }
    return tokenData;
  },

  // True if local storage already holds meaningful data (used by the overwrite guard).
  _hasLocalData() {
    try {
      const workouts = Storage.getWorkouts() || [];
      const routines = Storage.getRoutines() || [];
      return workouts.length > 0 || routines.length > 0;
    } catch {
      return false;
    }
  },

  // ---- Firebase lifecycle ----

  // Best-effort anonymous auth. When enabled in the Firebase Console it gives
  // `auth != null` so Security Rules can require a signed-in user. If it isn't
  // enabled we continue anyway (the unguessable ID still applies) — never throw.
  _ensureAuth() {
    if (this._authReady) return this._authReady;
    this._authReady = (async () => {
      if (typeof firebase === 'undefined' || !firebase.auth) return null;
      try {
        this.auth = firebase.auth();
        if (!this.auth.currentUser) await this.auth.signInAnonymously();
        Logger.info('Firebase anonymous auth OK.');
        return this.auth;
      } catch (e) {
        Logger.warn(
          'Anonymous auth no disponible (habilítala en Firebase Console → Auth → Sign-in method). El sync sigue funcionando por código.',
          e && e.message
        );
        this.auth = null;
        return null;
      }
    })();
    return this._authReady;
  },

  async init(customConfig = null) {
    if (typeof firebase === 'undefined') {
      Logger.warn('Firebase SDK no cargado.');
      return false;
    }

    const config = customConfig || this.defaultConfig;

    if (!firebase.apps.length) {
      try {
        firebase.initializeApp(config);
      } catch (e) {
        Logger.error('Error inicializando Firebase:', e);
        return false;
      }
    }

    this.db = firebase.database();
    this._ensureCloudId();
    await this._ensureAuth();
    return true;
  },

  // Sube toda la base local a la nube
  async syncUp() {
    if (!this.db || !this.cloudId) {
      const ok = await this.init();
      if (!ok) throw new Error('No se pudo conectar a la nube.');
    }
    await this._ensureAuth();

    const payload = {};
    for (const key of Object.values(Storage.KEYS)) {
      payload[key] = Storage._get(key);
    }

    await this.db.ref('users/' + this.cloudId).set(payload);

    const user = Storage.getUser();
    user.lastSync = Date.now();
    Storage.saveUser(user);
    return true;
  },

  // Descarga toda la base de la nube. Overwrites local, so we ask for
  // confirmation whenever that would destroy existing local data.
  async syncDown(overrideCloudId = null, { confirmIfLocal = true } = {}) {
    const targetId = overrideCloudId || this.cloudId || this._ensureCloudId();
    if (!this.db || !targetId) {
      const ok = await this.init();
      if (!ok) throw new Error('No se pudo conectar a la nube.');
    }
    await this._ensureAuth();

    const snap = await this.db.ref('users/' + targetId).once('value');
    const data = snap.val();

    if (!data) throw new Error('No se encontraron datos en la nube para este código.');

    // Overwrite guard: don't silently wipe weeks of local training.
    if (confirmIfLocal && this._hasLocalData()) {
      const go = window.confirm(
        'Sincronizar desde la nube REEMPLAZARÁ tus datos locales con los de la nube. ¿Continuar?'
      );
      if (!go) return false;
    }

    for (const key of Object.values(Storage.KEYS)) {
      if (data[key] !== undefined) {
        Storage._set(key, data[key]);
      }
    }

    // Recargar UI
    if (window.App && window.App.currentScreen) {
      window.App.navigate(window.App.currentScreen);
    }
    return true;
  },

  // Genera un código sincronizable (token) para pasar a otro dispositivo.
  // Not encrypted — it is a capability carrying the unguessable ID + expiry.
  getSyncToken() {
    this._ensureCloudId();
    const payload = {
      v: 2,
      id: this.cloudId,
      exp: Date.now() + this.TOKEN_TTL_MS,
    };
    return btoa(JSON.stringify(payload));
  },

  // Lee un token generado por otro dispositivo e importa sus datos
  async linkDevice(tokenBase64) {
    let tokenData;
    try {
      tokenData = this.parseToken(tokenBase64);
    } catch (e) {
      Logger.error('Link device: token inválido', e);
      throw new Error('El token de enlace no es válido, está corrupto o ha expirado.');
    }

    // Descargamos con ese ID (respects the overwrite guard)
    const ok = await this.syncDown(tokenData.id);
    if (!ok) return false; // user declined the overwrite

    // Si fue exitoso, adoptamos ese ID como propio para estar sincronizados
    const user = Storage.getUser();
    user.cloudId = tokenData.id;
    user.lastSync = Date.now();
    Storage.saveUser(user);
    this.cloudId = tokenData.id;

    return true;
  },
};
