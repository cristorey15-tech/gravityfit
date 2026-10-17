// ============================================
// GravityFit — Health Log (sueño, FC en reposo, pasos)
// ============================================
// Local-first health data feeding the coach's recovery advice.
//
// Connection status (Oct 2026): Google Fit's REST API is supported until the end
// of 2026 but new projects are closed and it needs a backend for OAuth; Health
// Connect is Android-native only (no browser API). So for this PWA the practical
// paths are: manual entry + Google Takeout CSV import. See showHealthConnectInfo().

import { Storage } from './storage.js';

export const HealthLog = {
  getDay(dateKey) {
    const u = Storage.getUser();
    return (u.healthLog && u.healthLog[dateKey]) || null;
  },

  setDay(dateKey, data) {
    const u = Storage.getUser();
    if (!u.healthLog) u.healthLog = {};
    u.healthLog[dateKey] = { ...(u.healthLog[dateKey] || {}), ...data };
    Storage.saveUser(u);
    return u.healthLog[dateKey];
  },

  getLast7() {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = Storage.todayKey(d);
      out.push({ key, date: d, ...(this.getDay(key) || {}) });
    }
    return out;
  },

  // Personal resting-HR baseline: average of the previous 6 days (today excluded)
  rhrBaseline() {
    const values = this.getLast7().slice(0, 6).map(d => d.rhr).filter(v => v > 0);
    if (!values.length) return null;
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  },

  // --- CSV import (Google Takeout / any fitness export) ---
  // Quote-aware split so values like "9,800" survive a comma delimiter.
  _splitLine(line, delim) {
    const out = [];
    let cur = '', inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === delim && !inQuotes) { out.push(cur); cur = ''; continue; }
      cur += ch;
    }
    out.push(cur);
    return out;
  },

  parseCSV(text) {
    const rows = String(text).split(/\r?\n/).map(r => r.trim()).filter(Boolean);
    if (rows.length < 2) return [];
    const delim = (rows[0].split(';').length > rows[0].split(',').length) ? ';' : ',';
    const header = this._splitLine(rows[0], delim).map(h => h.trim().toLowerCase());
    const findCol = (...keys) => header.findIndex(h => keys.some(k => h.includes(k)));
    const iDate = findCol('date', 'fecha', 'día');
    const iSleep = findCol('sleep', 'sueño', 'asleep');
    const iRHR = findCol('resting', 'reposo', 'rhr');
    const iSteps = findCol('step', 'pasos');
    if (iDate < 0) return [];

    const out = [];
    for (let i = 1; i < rows.length; i++) {
      const cols = this._splitLine(rows[i], delim).map(c => c.trim());
      const date = this._normDate(cols[iDate]);
      if (!date) continue;
      const rec = { date };
      if (iSleep >= 0) { const v = this._normSleep(cols[iSleep]); if (v != null) rec.sleep = v; }
      if (iRHR >= 0) { const v = parseInt(cols[iRHR], 10); if (v > 0 && v < 250) rec.rhr = v; }
      if (iSteps >= 0) { const v = parseInt(String(cols[iSteps]).replace(/[^\d]/g, ''), 10); if (!isNaN(v) && v >= 0) rec.steps = v; }
      if (rec.sleep != null || rec.rhr || rec.steps != null) out.push(rec);
    }
    return out;
  },

  // Accepts ISO (2026-10-17) and US Takeout style (10/17/2026 → MM/DD/YYYY)
  _normDate(s) {
    if (!s) return null;
    let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
    if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : Storage.todayKey(d);
  },

  // "7h 30m" | "7.5" | "7:30" | "450" (minutes) → hours as float (2 decimals)
  _normSleep(s) {
    if (s == null || s === '') return null;
    const round2 = (v) => Math.round(v * 100) / 100;
    const hm = /(\d+)\s*(?:h|horas?|hours?)\s*(?:(\d+)\s*(?:m|min|minutos?|minutes?))?/i.exec(s);
    if (hm) return round2(parseFloat(hm[1]) + (hm[2] ? parseInt(hm[2], 10) / 60 : 0));
    const colon = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
    if (colon) return round2(parseInt(colon[1], 10) + parseInt(colon[2], 10) / 60);
    const num = parseFloat(String(s).replace(',', '.'));
    if (isNaN(num)) return null;
    return num > 24 ? round2(num / 60) : round2(num); // minutes → hours
  },

  importCSV(text) {
    const recs = this.parseCSV(text);
    recs.forEach(r => this.setDay(r.date, r));
    return recs.length;
  },
};
