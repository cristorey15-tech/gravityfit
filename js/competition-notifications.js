// ============================================
// GravityFit — Competition Real-Time Notifications
// ============================================
// Listens for Firebase competition data changes and sends
// push notifications when friends complete workouts or surpass you.

import { Storage } from './storage.js';
import { Toast } from './components.js';
import { Logger } from '../src/Logger.js';

export const CompetitionNotifications = {
  _listeners: {},       // Firebase listener references keyed by compId
  _checkInterval: null, // Fallback polling interval
  _initialized: false,

  /**
   * Initialize: start Firebase real-time listeners for all competitions
   * and a fallback local check interval.
   */
  init() {
    if (this._initialized) return;
    this._initialized = true;

    const settings = Storage.getCompetitionNotificationSettings();
    if (!settings.enabled) return;

    // Start Firebase real-time listeners
    this._startFirebaseListeners();

    // Fallback: check locally every 2 minutes (for when Firebase isn't available)
    this._checkInterval = setInterval(() => this._localCheck(), 2 * 60 * 1000);

    Logger.info('CompetitionNotifications initialized');
  },

  /**
   * Stop all listeners and intervals.
   */
  stop() {
    this._stopFirebaseListeners();
    if (this._checkInterval) {
      clearInterval(this._checkInterval);
      this._checkInterval = null;
    }
    this._initialized = false;
  },

  /**
   * Restart listeners (e.g., after notification settings change).
   */
  restart() {
    this.stop();
    this.init();
  },

  // =============================================
  // Firebase Real-Time Listeners
  // =============================================

  _startFirebaseListeners() {
    const comps = Storage.getCompetitions();
    if (!comps.length) return;

    // Ensure Firebase is available
    if (typeof firebase === 'undefined' || !firebase.database) {
      Logger.warn('Firebase not available for competition listeners — using local fallback');
      return;
    }

    let db;
    try {
      if (typeof window.CloudSync !== 'undefined' && window.CloudSync.db) {
        db = window.CloudSync.db;
      } else if (firebase.apps.length) {
        db = firebase.database();
      } else {
        Logger.warn('Firebase not initialized — skipping competition listeners');
        return;
      }
    } catch (e) {
      Logger.warn('Could not get Firebase DB reference:', e);
      return;
    }

    comps.forEach(comp => {
      this._listenToCompetition(db, comp.id);
    });
  },

  _listenToCompetition(db, compId) {
    // Remove existing listener if any
    if (this._listeners[compId]) {
      try { this._listeners[compId].cleanup(); } catch (e) { /* ignore */ }
    }

    try {
      // Listen to the competition's data in Firebase
      // Structure: competitions/{compId}/dailyStats
      const ref = db.ref(`competitions/${compId}/dailyStats`);

      const callback = (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        this._processCompetitionUpdate(compId, data);
      };

      ref.on('value', callback);

      // Firebase v8: .on() returns undefined, so store ref + callback for cleanup
      this._listeners[compId] = {
        ref,
        callback,
        cleanup: () => ref.off('value', callback),
      };
    } catch (e) {
      Logger.warn(`Failed to set Firebase listener for comp ${compId}:`, e);
    }
  },

  _stopFirebaseListeners() {
    Object.values(this._listeners).forEach(listener => {
      try { listener.cleanup(); } catch (e) { /* ignore */ }
    });
    this._listeners = {};
  },

  // =============================================
  // Shared Ranking Comparison & Notifications
  // =============================================

  /**
   * Core ranking comparison logic used by both Firebase and local paths.
   * @param {string} compId - Competition ID
   * @param {Array} currentRanking - Current leaderboard entries [{userId, name, volume, ...}]
   * @param {Object} prevSnapshot - Previous ranking snapshot {ranking, dailyStats, timestamp}
   * @param {Array} todayEntries - Today's stats [{userId, name, workouts, volume}]
   * @param {Object} settings - Notification settings {friendWorkout, rankChange, ...}
   */
  _compareRankings(compId, currentRanking, prevSnapshot, todayEntries, settings) {
    const user = Storage.getUser();
    const myId = user.cloudId;
    const today = Storage._localDateStr(new Date());

    // Build rank maps: userId → position (1-indexed)
    const prevRanking = prevSnapshot.ranking || [];
    const prevRankMap = {};
    prevRanking.forEach((entry, i) => { prevRankMap[entry.userId] = i + 1; });

    const currentRankMap = {};
    currentRanking.forEach((entry, i) => { currentRankMap[entry.userId] = i + 1; });

    // --- Friend workout notifications ---
    if (settings.friendWorkout) {
      todayEntries.forEach(entry => {
        if (entry.userId === myId) return;
        if (!entry.workouts || entry.workouts === 0) return;

        const notifKey = `gf_comp_notif_${compId}_${entry.userId}_${today}`;
        if (localStorage.getItem(notifKey)) return;

        // Compare against previous snapshot to avoid duplicate notifs
        const prevFriendData = prevSnapshot.dailyStats?.[today]?.[entry.userId];
        if (prevFriendData && prevFriendData.workouts >= entry.workouts) return;

        localStorage.setItem(notifKey, '1');
        this._sendNotification(
          '🏋️ ¡Amigo entrenó!',
          `${entry.name || 'Tu amigo'} completó ${entry.workouts} entrenamiento${entry.workouts > 1 ? 's' : ''} hoy con ${this._formatVol(entry.volume)} de volumen`,
          'competition-friend-workout'
        );
      });
    }

    // --- Rank change notifications ---
    if (settings.rankChange && prevRanking.length > 0) {
      const myPrevRank = prevRankMap[myId] || 999;
      const myCurrentRank = currentRankMap[myId] || 999;

      currentRanking.forEach(entry => {
        if (entry.userId === myId) return;
        const friendPrevRank = prevRankMap[entry.userId] || 999;
        const friendCurrentRank = currentRankMap[entry.userId] || 999;

        // Friend surpassed me
        if (friendPrevRank > myPrevRank && friendCurrentRank < myPrevRank) {
          const notifKey = `gf_comp_surpass_${compId}_${entry.userId}_${today}`;
          if (!localStorage.getItem(notifKey)) {
            localStorage.setItem(notifKey, '1');
            this._sendNotification(
              '⚠️ ¡Te superaron!',
              `${entry.name || 'Alguien'} te superó en el ranking (#${friendPrevRank} → #${friendCurrentRank})`,
              'competition-rank-change'
            );
          }
        }
      });

      // I surpassed someone
      if (myCurrentRank < myPrevRank && myPrevRank > 1) {
        const notifKey = `gf_comp_my_surpass_${compId}_${today}`;
        if (!localStorage.getItem(notifKey)) {
          localStorage.setItem(notifKey, '1');
          this._sendNotification(
            '🔥 ¡Subiste de posición!',
            `Ahora estás en #${myCurrentRank} del ranking. ¡Sigue así!`,
            'competition-rank-up'
          );
        }
      }
    }

    // --- Competition streaks: consecutive days training more than friends ---
    if (settings.competitionStreaks) {
      this._checkCompetitionStreaks(compId, myId, today);
    }

    // --- Rival streaks: friends surpassing YOU consecutively ---
    if (settings.rivalStreaks) {
      this._checkRivalStreaks(compId, myId, today);
    }

    // --- Friend volume progress: motivating when friends improve ---
    if (settings.friendProgress) {
      this._checkFriendProgress(compId, myId);
    }

    // Save current snapshot for next comparison
    const todaySnapshot = {};
    todayEntries.forEach(e => { todaySnapshot[e.userId] = e; });
    Storage.saveCompetitionRankingSnapshot(compId, {
      ranking: currentRanking,
      dailyStats: { [today]: todaySnapshot },
      timestamp: Date.now(),
    });
  },

  // =============================================
  // Streak Detection (shared engine)
  // =============================================

  // Competition streak milestones: YOU surpass friends
  _streakMilestones: [
    { days: 3,  emoji: '🔥', title: '¡Racha de fuego!',              msg: (name, friend, d) => `${name}, llevas ${d} días seguidos entrenando más que tus rivales. ¡Estás en llamas!` },
    { days: 5,  emoji: '⚡', title: '¡Imparable!',                   msg: (name, friend, d) => `${name}, ${d} días dominando. Tus amigos necesitan esforzarse más 💪` },
    { days: 7,  emoji: '🏆', title: '¡Semana perfecta!',             msg: (name, friend, d) => `¡Semana completa! ${d} días de pura dominancia. Eres la máquina del grupo 🏅` },
    { days: 14, emoji: '👑', title: '¡Leyenda de la competencia!',   msg: (name, friend, d) => `${d} días consecutivos superando a todos. ¡Eres la leyenda! Nadie te detiene 👑` },
  ],

  // Rival streak milestones: a friend surpasses YOU
  _rivalStreakMilestones: [
    { days: 3,  emoji: '👀', title: '¡Ojo, te persiguen!',           msg: (name, friend, d) => `${friend} te ha superado ${d} días seguidos. ¡No te dejes!` },
    { days: 5,  emoji: '🚨', title: '¡Alerta de rival!',             msg: (name, friend, d) => `${friend} lleva ${d} días encima de ti en volumen. ¡Es hora de reaccionar!` },
    { days: 7,  emoji: '💀', title: '¡Dominación del rival!',        msg: (name, friend, d) => `${d} días seguidos por debajo de ${friend}. ¡Levántate y demuestra de qué estás hecho!` },
  ],

  /**
   * Shared streak detection engine.
   * @param {string} compId
   * @param {string} myId - Current user's cloud ID
   * @param {string} today - Today's date string
   * @param {Object} opts
   * @param {Function} opts.compare - (myVol, friendVol) => boolean — who wins each day
   * @param {string} opts.keyPrefix - localStorage dedup prefix
   * @param {string} opts.tag - Service worker notification tag
   * @param {Array} opts.milestones - [{days, emoji, title, msg(name, friend, days)}]
   */
  _detectStreak(compId, myId, today, opts) { 
    const { compare, keyPrefix, tag, milestones } = opts;

    const comps = Storage.getCompetitions();
    const comp = comps.find(c => c.id === compId);
    if (!comp || !comp.dailyStats) return;

    // Collect the last 14 days of data
    const pastDays = [];
    const d = new Date();
    for (let i = 1; i <= 14; i++) {
      d.setDate(d.getDate() - 1);
      const dateStr = Storage._localDateStr(new Date(d));
      const dayData = comp.dailyStats[dateStr];
      if (dayData) {
        pastDays.push({ date: dateStr, data: dayData });
      } else {
        break; // Gap breaks the streak
      }
    }

    if (pastDays.length === 0) return;

    // Find all friends in the data
    const friendIds = new Set();
    pastDays.forEach(({ data }) => {
      Object.keys(data).forEach(uid => { if (uid !== myId) friendIds.add(uid); });
    });

    const todayData = comp.dailyStats[today];

    friendIds.forEach(friendId => {
      let streak = 0;

      // Count consecutive past days
      for (const { data } of pastDays) {
        const myVol = data[myId]?.volume || 0;
        const friendVol = data[friendId]?.volume || 0;
        if (compare(myVol, friendVol)) {
          streak++;
        } else {
          break;
        }
      }

      // Count today too
      if (todayData) {
        const myTodayVol = todayData[myId]?.volume || 0;
        const friendTodayVol = todayData[friendId]?.volume || 0;
        if (compare(myTodayVol, friendTodayVol)) streak++;
      }

      if (streak === 0) return;

      // Check milestones
      for (const milestone of milestones) {
        if (streak === milestone.days) {
          const notifKey = `${keyPrefix}${compId}_${friendId}_${milestone.days}`;
          if (localStorage.getItem(notifKey)) return;

          // Skip if any higher milestone already notified
          const anyHigher = milestones.some(m =>
            m.days > milestone.days && localStorage.getItem(`${keyPrefix}${compId}_${friendId}_${m.days}`)
          );
          if (anyHigher) return;

          localStorage.setItem(notifKey, '1');
          const friendName = todayData?.[friendId]?.name || 'Tu rival';
          const user = Storage.getUser();
          this._sendNotification(
            `${milestone.emoji} ${milestone.title}`,
            milestone.msg(user.name, friendName, streak),
            tag
          );
          break;
        }
      }
    });
  },

  /** Convenience: detect streaks where USER surpasses friends */
  _checkCompetitionStreaks(compId, myId, today) {
    this._detectStreak(compId, myId, today, {
      compare: (myVol, friendVol) => myVol > friendVol && myVol > 0,
      keyPrefix: 'gf_comp_streak_',
      tag: 'competition-streak',
      milestones: this._streakMilestones,
    });
  },

  /** Convenience: detect streaks where FRIEND surpasses USER */
  _checkRivalStreaks(compId, myId, today) {
    this._detectStreak(compId, myId, today, {
      compare: (myVol, friendVol) => friendVol > myVol && friendVol > 0,
      keyPrefix: 'gf_comp_rival_',
      tag: 'competition-rival-streak',
      milestones: this._rivalStreakMilestones,
    });
  },

  // =============================================
  // Friend Volume Progress Detection
  // =============================================

  /**
   * Detect when a friend's current week volume significantly increased
   * vs their previous week — send a motivational notification.
   * Threshold: 10% increase with at least 500 volume this week.
   */
  _checkFriendProgress(compId, myId) {
    const comps = Storage.getCompetitions();
    const comp = comps.find(c => c.id === compId);
    if (!comp || !comp.dailyStats) return;

    const now = new Date();
    const user = Storage.getUser();

    // Calculate current week (Mon → today) and previous week (Mon-Sun)
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    let thisWeekVol = {}; // userId → volume
    let lastWeekVol = {}; // userId → volume
    let thisWeekNames = {}; // userId → name

    // Current week: from Monday to today
    for (let i = 0; i <= daysFromMonday; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = Storage._localDateStr(d);
      const dayData = comp.dailyStats[key];
      if (!dayData) continue;
      Object.entries(dayData).forEach(([uid, stat]) => {
        if (uid === myId) return;
        thisWeekVol[uid] = (thisWeekVol[uid] || 0) + (stat.volume || 0);
        thisWeekNames[uid] = stat.name || uid;
      });
    }

    // Previous week: Mon to Sun (7 days before current Monday)
    const prevMonday = new Date(now);
    prevMonday.setDate(prevMonday.getDate() - daysFromMonday - 7);
    for (let i = 0; i < 7; i++) {
      const d = new Date(prevMonday);
      d.setDate(d.getDate() + i);
      const key = Storage._localDateStr(d);
      const dayData = comp.dailyStats[key];
      if (!dayData) continue;
      Object.entries(dayData).forEach(([uid, stat]) => {
        if (uid === myId) return;
        lastWeekVol[uid] = (lastWeekVol[uid] || 0) + (stat.volume || 0);
        thisWeekNames[uid] = thisWeekNames[uid] || stat.name || uid;
      });
    }

    const MIN_VOLUME = 500; // Minimum volume to consider (avoid noise from 1-light-session weeks)
    const MIN_INCREASE_PCT = 10; // Minimum % increase to notify

    Object.entries(thisWeekVol).forEach(([uid, thisVol]) => {
      if (thisVol < MIN_VOLUME) return;
      const lastVol = lastWeekVol[uid] || 0;
      if (lastVol === 0) return; // No previous data to compare

      const pctIncrease = Math.round(((thisVol - lastVol) / lastVol) * 100);
      if (pctIncrease < MIN_INCREASE_PCT) return;

      // Dedup: once per friend per week (keyed by Monday date)
      const weekKey = Storage._localDateStr(new Date(now.getTime() - daysFromMonday * 86400000));
      const notifKey = `gf_comp_progress_${compId}_${uid}_${weekKey}`;
      if (localStorage.getItem(notifKey)) return;

      localStorage.setItem(notifKey, '1');
      const name = thisWeekNames[uid] || 'Tu amigo';

      // Motivational message varies by improvement level
      let emoji, title, body;
      if (pctIncrease >= 50) {
        emoji = '🚀'; title = '¡Progreso increíble!';
        body = `${name} subió su volumen un ${pctIncrease}% esta semana (${this._formatVol(lastVol)} → ${this._formatVol(thisVol)}). ¡Está en modo cohetazo!`;
      } else if (pctIncrease >= 25) {
        emoji = '💪'; title = '¡Amigo mejorando!';
        body = `${name} aumentó su volumen un ${pctIncrease}% esta semana (${this._formatVol(lastVol)} → ${this._formatVol(thisVol)}). ¡Nadie lo detiene!`;
      } else {
        emoji = '📈'; title = 'Amigo progresando';
        body = `${name} subió su volumen un ${pctIncrease}% esta semana (${this._formatVol(lastVol)} → ${this._formatVol(thisVol)}). ¡Sigue así!`;
      }

      this._sendNotification(`${emoji} ${title}`, body, 'competition-friend-progress');
    });
  },

  // =============================================
  // Process Competition Data Updates (Firebase path)
  // =============================================

  _processCompetitionUpdate(compId, remoteDailyStats) {
    const settings = Storage.getCompetitionNotificationSettings();
    if (!settings.enabled) return;

    const user = Storage.getUser();
    const myId = user.cloudId;
    const today = Storage._localDateStr(new Date());

    // Merge remote daily stats into local competition data so leaderboard reads fresh data
    const comps = Storage.getCompetitions();
    const comp = comps.find(c => c.id === compId);
    if (!comp) return;
    if (!comp.dailyStats) comp.dailyStats = {};
    Object.entries(remoteDailyStats).forEach(([dateKey, dayData]) => {
      if (!comp.dailyStats[dateKey]) comp.dailyStats[dateKey] = {};
      Object.entries(dayData).forEach(([uid, stat]) => {
        // Only merge if remote data is newer (don't overwrite local user's own data)
        if (uid !== myId) {
          comp.dailyStats[dateKey][uid] = stat;
        }
      });
    });
    Storage.saveCompetitions(comps);

    // Get fresh data after merge
    const prevSnapshot = Storage.getCompetitionRankingSnapshot(compId);
    const currentRanking = Storage.getCompetitionLeaderboard(compId, 7);

    // Build todayEntries from remote data for the shared comparison
    const todayStats = remoteDailyStats[today] || {};
    const todayEntries = Object.entries(todayStats).map(([uid, stat]) => ({
      userId: uid,
      name: stat?.name || '',
      workouts: stat?.workouts || 0,
      volume: stat?.volume || 0,
    }));

    // Delegate to shared comparison logic
    this._compareRankings(compId, currentRanking, prevSnapshot, todayEntries, settings);
  },

  // =============================================
  // Public API
  // =============================================

  /**
   * Manually trigger a local check (called after workout completion).
   */
  checkNow() {
    this._localCheck();
  },

  // =============================================
  // Local Fallback Check (when Firebase unavailable)
  // =============================================

  _localCheck() {
    const settings = Storage.getCompetitionNotificationSettings();
    if (!settings.enabled) return;
    if (Notification.permission !== 'granted') return;

    const comps = Storage.getCompetitions();
    if (!comps.length) return;

    const today = Storage._localDateStr(new Date());

    comps.forEach(comp => {
      const prevSnapshot = Storage.getCompetitionRankingSnapshot(comp.id);
      const currentRanking = Storage.getCompetitionLeaderboard(comp.id, 7);
      const todayDetail = Storage.getCompetitionDailyDetail(comp.id, today);

      // Build todayEntries from local data for the shared comparison
      const todayEntries = todayDetail.map(e => ({
        userId: e.userId,
        name: e.name || '',
        workouts: e.workouts || 0,
        volume: e.volume || 0,
      }));

      // Delegate to shared comparison logic
      this._compareRankings(comp.id, currentRanking, prevSnapshot, todayEntries, settings);
    });
  },

  // =============================================
  // Notification Delivery
  // =============================================

  _sendNotification(title, body, tag) {
    if (Notification.permission !== 'granted') return;
    if (document.visibilityState === 'visible') {
      // App is in foreground — show in-app toast instead
      if (typeof Toast !== 'undefined') {
        Toast.show(`${title} — ${body}`, 'info', 5000);
      }
      return;
    }
    // App is in background — send system notification
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, {
          body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          vibrate: [200, 100, 200],
          tag,
        });
      });
    } else {
      new Notification(title, { body, icon: '/icons/icon-192.png', tag });
    }
  },

  // =============================================
  // Helpers
  // =============================================

  _formatVol(v) {
    if (!v) return '0';
    const user = Storage.getUser();
    const units = user.units || 'kg';
    if (v >= 1000) return (v / 1000).toFixed(1) + 'k ' + units;
    return v + ' ' + units;
  },
};
