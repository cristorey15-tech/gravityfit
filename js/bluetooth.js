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
    
    // Si estamos en la pantalla de entrenamiento, actualizar el DOM rápido sin re-renderizar todo
    const bpmEl = document.getElementById('ble-bpm-value');
    if (bpmEl) {
      bpmEl.textContent = this.currentBPM;
      // Pequeña animación del corazón
      const iconEl = document.getElementById('ble-heart-icon');
      if (iconEl) {
        iconEl.style.transform = 'scale(1.2)';
        setTimeout(() => iconEl.style.transform = 'scale(1)', 100);
      }
    }
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
