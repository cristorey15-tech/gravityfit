// ============================================
// GravityFit — Cloud Sync via Firebase
// ============================================

import { Storage } from './storage.js';
import { Logger } from '../src/Logger.js';

export const CloudSync = {
  db: null,
  cloudId: null,

  // Firebase genérico o por defecto (si proporcionas tus propias credenciales en el futuro, las pones aquí)
  defaultConfig: {
    // ESTO ES UN PLACEHOLDER - En un entorno real debe ir la configuración del proyecto Firebase
    databaseURL: "https://gravityfit-sync-default-rtdb.firebaseio.com",
  },

  init(customConfig = null) {
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
    
    // Obtener o generar un ID único de la nube para este usuario
    const user = Storage.getUser();
    if (!user.cloudId) {
      user.cloudId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      Storage.saveUser(user);
    }
    this.cloudId = user.cloudId;
    
    return true;
  },

  // Sube toda la base local a la nube
  async syncUp() {
    if (!this.db || !this.cloudId) {
      const ok = this.init();
      if (!ok) throw new Error("No se pudo conectar a la nube.");
    }

    const payload = {};
    for (const key of Object.values(Storage.KEYS)) {
      payload[key] = Storage._get(key);
    }

    await this.db.ref('users/' + this.cloudId).set(payload);
    
    const user = Storage.getUser();
    user.lastSync = Date.now();
    Storage.saveUser(user);
  },

  // Descarga toda la base de la nube e sobrescribe lo local
  async syncDown(overrideCloudId = null) {
    const targetId = overrideCloudId || this.cloudId;
    if (!this.db || !targetId) {
      const ok = this.init();
      if (!ok) throw new Error("No se pudo conectar a la nube.");
    }

    const snap = await this.db.ref('users/' + targetId).once('value');
    const data = snap.val();

    if (!data) throw new Error("No se encontraron datos en la nube para este código.");

    for (const key of Object.values(Storage.KEYS)) {
      if (data[key] !== undefined) {
        Storage._set(key, data[key]);
      }
    }
    
    // Recargar UI
    if (window.App && window.App.currentScreen) {
      window.App.navigate(window.App.currentScreen);
    }
  },

  // Genera un token encriptado en Base64 para pasar a otro dispositivo
  getSyncToken() {
    const user = Storage.getUser();
    if (!user.cloudId) this.init();
    
    const tokenData = {
      id: user.cloudId,
      timestamp: Date.now()
    };
    return btoa(JSON.stringify(tokenData));
  },

  // Lee un token generado por otro dispositivo e importa sus datos
  async linkDevice(tokenBase64) {
    try {
      const str = atob(tokenBase64);
      const tokenData = JSON.parse(str);
      
      if (!tokenData.id) throw new Error("Token inválido");
      
      // Descargamos con ese ID
      await this.syncDown(tokenData.id);
      
      // Si fue exitoso, adoptamos ese ID como propio para estar sincronizados
      const user = Storage.getUser();
      user.cloudId = tokenData.id;
      user.lastSync = Date.now();
      Storage.saveUser(user);
      
      return true;
    } catch(e) {
      Logger.error('Link device failed:', e);
      throw new Error('El token de enlace no es válido o está corrupto.');
    }
  }
};
