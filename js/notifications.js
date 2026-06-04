// ============================================
// GravityFit — Notification Manager (P0-1)
// ============================================
// Handles push notifications, daily reminders,
// missed workout alerts, and rest day tips.

import { Storage } from './storage.js';

export const NotificationManager = {
  _checkInterval: null,

  init() {
    const settings = Storage.getNotificationSettings();
    if (settings.enabled) {
      this.requestPermission().then(granted => {
        if (granted) this.startDailyCheck();
      });
    }
  },

  async requestPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  },

  enable(time) {
    const settings = Storage.getNotificationSettings();
    settings.enabled = true;
    settings.time = time || settings.time;
    Storage.saveNotificationSettings(settings);
    this.requestPermission().then(granted => {
      if (granted) this.startDailyCheck();
    });
  },

  disable() {
    const settings = Storage.getNotificationSettings();
    settings.enabled = false;
    Storage.saveNotificationSettings(settings);
    this.stopDailyCheck();
  },

  startDailyCheck() {
    this.stopDailyCheck();
    // Check every 15 minutes if it's time for the daily reminder
    this._checkInterval = setInterval(() => this.checkAndNotify(), 15 * 60 * 1000);
  },

  stopDailyCheck() {
    if (this._checkInterval) {
      clearInterval(this._checkInterval);
      this._checkInterval = null;
    }
  },

  checkAndNotify() {
    const settings = Storage.getNotificationSettings();
    if (!settings.enabled) return;

    const now = new Date();
    const [h, m] = settings.time.split(':').map(Number);
    const reminderTime = new Date(now);
    reminderTime.setHours(h, m, 0, 0);

    // Check if current time is within 15 min window of reminder time
    const diff = Math.abs(now.getTime() - reminderTime.getTime());
    if (diff > 15 * 60 * 1000) return;
    // Don't fire twice in the same day
    const todayKey = now.toISOString().split('T')[0];
    if (localStorage.getItem('gf_last_reminder_' + todayKey)) return;
    localStorage.setItem('gf_last_reminder_' + todayKey, '1');

    this.sendWorkoutReminder();
  },

  sendWorkoutReminder() {
    if (Notification.permission !== 'granted') return;
    const program = Storage.getActiveProgram();
    let title = '🏋️ GravityFit — ¡Hora de entrenar!';
    let body = 'No olvides tu entrenamiento de hoy. ¡Tú puedes! 💪';

    if (program) {
      const next = Storage.getNextProgramWorkout(program);
      if (next && next.isToday && next.routine && next.routine.id !== 'rest') {
        title = `🎯 Hoy toca: ${next.routine.name}`;
        body = 'Tu programa te espera. ¡A romperla! 🔥';
      } else if (Storage.isRestDay()) {
        title = '😴 Día de Descanso';
        body = 'Recupérate bien. Descansa, hidrátate y duerme bien.';
      }
    }

    const streak = Storage.getStreak();
    if (streak >= 3) {
      body += `\n🔥 Llevas ${streak} días de racha — ¡no la pierdas!`;
    }

    new Notification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'daily-reminder-' + new Date().toISOString().split('T')[0],
      requireInteraction: true,
    });
  },

  sendMissedWorkoutAlert(routineName) {
    if (Notification.permission !== 'granted') return;
    const settings = Storage.getNotificationSettings();
    if (!settings.missedReminder) return;

    new Notification('⚠️ Entrenamiento perdido', {
      body: `No completaste "${routineName}". ¿Reprogramar?`,
      icon: '/icons/icon-192.png',
      tag: 'missed-workout',
    });
  },
};
