// ============================================
// GravityFit — Web Bluetooth & Heart Rate
// ============================================

import { Storage } from './storage.js';
import { Toast } from './components.js';
import { Logger } from '../src/Logger.js';

export const BLE = {
  device: null,
  server: null,
  characteristic: null,
  isConnecting: false,
  
  // Estado en vivo
  currentBPM: 0,
  caloriesBurned: 0,
  sessionStartTime: null,
  updateInterval: null,
  
  // HR Session tracking
  sessionHRData: [],
  _lastSampleTime: 0,
  _sampleInterval: 5000, // store a sample every 5 seconds
  
  // Heart Rate Zones (% of maxHR)
  ZONES: [
    { id: 1, name: 'Muy Suave', emoji: '🟢', min: 0.5, max: 0.6, color: '#34D399' },
    { id: 2, name: 'Suave', emoji: '🔵', min: 0.6, max: 0.7, color: '#60A5FA' },
    { id: 3, name: 'Moderado', emoji: '🟡', min: 0.7, max: 0.8, color: '#FBBF24' },
    { id: 4, name: 'Intenso', emoji: '🟠', min: 0.8, max: 0.9, color: '#F97316' },
    { id: 5, name: 'Máximo', emoji: '🔴', min: 0.9, max: 1.0, color: '#EF4444' },
  ],
  lastZone: null,
  getEstimatedMaxHR() {
    const user = Storage.getUser();
    return 220 - (user.age || 25);
  },

  async connect() {
    if (!navigator.bluetooth) {
      Toast.show('Tu navegador no soporta Web Bluetooth', 'error');
      return false;
    }

    this.isConnecting = true;
    Toast.show('Buscando sensores cardíacos...', 'info');

    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }]
      });

      this.device.addEventListener('gattserverdisconnected', this.onDisconnected.bind(this));

      this.server = await this.device.gatt.connect();
      const service = await this.server.getPrimaryService('heart_rate');
      this.characteristic = await service.getCharacteristic('heart_rate_measurement');
      
      await this.characteristic.startNotifications();
      this.characteristic.addEventListener('characteristicvaluechanged', this.handleHRUpdate.bind(this));
      
      this.isConnecting = false;
      this.sessionStartTime = Date.now();
      this.caloriesBurned = 0;
      this.sessionHRData = [];
      this.lastZone = null;
      
      // Bucle para actualizar calorías cada segundo si hay un workout activo
      if (this.updateInterval) clearInterval(this.updateInterval);
      this.updateInterval = setInterval(() => this.calculateCalories(), 1000);

      Toast.show(`Conectado a ${this.device.name || 'Sensor Cardíaco'} 💓`, 'success');
      
      // Actualizar UI si estamos en WorkoutScreen
      if (window.WorkoutScreen && window.WorkoutScreen.activeWorkout) {
        window.WorkoutScreen.renderHeaderStats();
      }
      
      return true;

    } catch (error) {
      Logger.error('Bluetooth connection error:', error);
      this.isConnecting = false;
      if (error.name !== 'NotFoundError') { // NotFoundError es cuando el usuario cancela
        Toast.show('Error al conectar el sensor', 'error');
      }
      return false;
    }
  },

  disconnect() {
    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.currentBPM = 0;
  },

  onDisconnected() {
    Toast.show('Sensor desconectado', 'warning');
    this.currentBPM = 0;
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (window.WorkoutScreen && window.WorkoutScreen.activeWorkout) {
      window.WorkoutScreen.renderHeaderStats();
    }
  },

  handleHRUpdate(event) {
    const value = event.target.value;
    const flags = value.getUint8(0);
    const rate16Bits = flags & 0x1;
    let heartRate;
    
    if (rate16Bits) {
      heartRate = value.getUint16(1, /*littleEndian=*/true);
    } else {
      heartRate = value.getUint8(1);
    }
    
    this.currentBPM = heartRate;
    
    // Store sample periodically (every _sampleInterval ms)
    const now = Date.now();
    if (now - this._lastSampleTime >= this._sampleInterval) {
      this.sessionHRData.push({ bpm: heartRate, timestamp: now - (this.sessionStartTime || now) });
      this._lastSampleTime = now;
    }
    
    // Zone detection & alerts
    this.checkZoneAlert(heartRate);
    
    // Actualizar DOM
    const bpmEl = document.getElementById('ble-bpm-value');
    if (bpmEl) {
      bpmEl.textContent = this.currentBPM;
      const iconEl = document.getElementById('ble-heart-icon');
      if (iconEl) {
        iconEl.style.transform = 'scale(1.2)';
        setTimeout(() => iconEl.style.transform = 'scale(1)', 100);
      }
    }
    
    // Update zone indicator in workout header
    this.updateZoneUI();
  },

  getHRZone(bpm) {
    if (!bpm) return null;
    const maxHR = this.getEstimatedMaxHR();
    const ratio = bpm / maxHR;
    for (let i = this.ZONES.length - 1; i >= 0; i--) {
      if (ratio >= this.ZONES[i].min) return this.ZONES[i];
    }
    return this.ZONES[0];
  },

  checkZoneAlert(bpm) {
    const zone = this.getHRZone(bpm);
    if (!zone) return;
    if (!this.lastZone || zone.id !== this.lastZone.id) {
      this.lastZone = zone;
      // Show zone toast
      if (window.Toast) {
        Toast.show(`Zona ${zone.id}: ${zone.emoji} ${zone.name} (${bpm} BPM)`, 'info', 2000);
      }
      // Vibrate pattern on zone change
      if (navigator.vibrate) {
        navigator.vibrate(zone.id === 5 ? [100, 50, 100, 50, 200] :
                          zone.id === 4 ? [100, 50, 100] : 50);
      }
    }
  },

  updateZoneUI() {
    const zoneEl = document.getElementById('ble-zone-indicator');
    if (!zoneEl) return;
    const zone = this.getHRZone(this.currentBPM);
    if (zone) {
      zoneEl.textContent = zone.emoji;
      zoneEl.style.color = zone.color;
      zoneEl.title = `Zona ${zone.id}: ${zone.name} — ${this.currentBPM} BPM`;
    } else {
      zoneEl.textContent = '💚';
      zoneEl.style.color = '#34D399';
    }
  },

  getSessionHRSummary() {
    if (!this.sessionHRData.length) return null;
    const bpmValues = this.sessionHRData.map(s => s.bpm);
    return {
      avg: Math.round(bpmValues.reduce((a, b) => a + b, 0) / bpmValues.length),
      max: Math.max(...bpmValues),
      min: Math.min(...bpmValues),
      samples: this.sessionHRData,
      totalCalories: Math.floor(this.caloriesBurned),
      maxHR: this.getEstimatedMaxHR()
    };
  },

  calculateCalories() {
    if (!this.currentBPM || !this.sessionStartTime) return;
    
    // Fórmula de calorías basada en HR (Keytel, 2005)
    // Hombres: C/min = (-55.0969 + (0.6309 * HR) + (0.1988 * W) + (0.2017 * A)) / 4.184
    // Mujeres: C/min = (-20.4022 + (0.4472 * HR) - (0.1263 * W) + (0.074 * A)) / 4.184
    // Si no hay datos, asume promedio hombre de 25 años y 75kg
    
    const user = Storage.getUser();
    let weight = 75; // kg
    if (user.bodyWeight && user.bodyWeight.length) {
      weight = parseFloat(user.bodyWeight[user.bodyWeight.length-1].weight);
      if (user.units === 'lbs') weight = weight * 0.453592;
    }
    
    const age = user.age || 25;
    const isMale = user.gender !== 'female';
    
    let kcalPerMin = 0;
    if (isMale) {
      kcalPerMin = (-55.0969 + (0.6309 * this.currentBPM) + (0.1988 * weight) + (0.2017 * age)) / 4.184;
    } else {
      kcalPerMin = (-20.4022 + (0.4472 * this.currentBPM) - (0.1263 * weight) + (0.074 * age)) / 4.184;
    }
    
    // Sumar calorías del último segundo (kcal/min dividido entre 60)
    // No permitir calorías negativas (si el ritmo cardíaco es muy bajo la fórmula puede dar negativo)
    if (kcalPerMin > 0) {
      this.caloriesBurned += (kcalPerMin / 60);
    }

    const calEl = document.getElementById('ble-cal-value');
    if (calEl) {
      calEl.textContent = Math.floor(this.caloriesBurned);
    }
  }
};
