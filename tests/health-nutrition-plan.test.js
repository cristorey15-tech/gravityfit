// ============================================
// GravityFit — Nutrition / Week Plan / Health Tests
// ============================================
// Feature tests: daily nutrition log + coach insight, manual weekly plan +
// coach priority, and the health log (sleep/RHR) with CSV import.

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../js/components.js', () => ({
  Modal: { show: vi.fn(), hide: vi.fn() },
  Toast: { show: vi.fn() },
  escapeHtml: (s) => s,
  Icons: {},
}));
vi.mock('../js/app.js', () => ({ App: {} }));
vi.mock('../src/Logger.js', () => ({ Logger: { info() {}, warn() {}, error() {} } }));

import { AICoach } from '../js/ai-coach.js';
import { Storage } from '../js/storage.js';
import { HealthLog } from '../js/health.js';
import { RoutinesScreen } from '../js/screens/routines.js';

beforeEach(() => {
  Storage._state = {};
  localStorage.clear();
  vi.clearAllMocks();
});

// ---------- Nutrition ----------
describe('nutrition storage', () => {
  it('returns defaults for goals and null for an empty day', () => {
    expect(Storage.getNutritionGoals()).toEqual({ kcal: 2200, protein: 140 });
    expect(Storage.getNutritionDay(Storage.todayKey())).toBe(null);
  });

  it('saves and reads a day, merging updates', () => {
    Storage.setNutritionDay('2026-10-17', { kcal: 1800 });
    Storage.setNutritionDay('2026-10-17', { protein: 120 });
    const day = Storage.getNutritionDay('2026-10-17');
    expect(day).toEqual({ kcal: 1800, protein: 120 });
  });

  it('persists goal changes over the defaults', () => {
    Storage.setNutritionGoals({ protein: 180 });
    expect(Storage.getNutritionGoals()).toEqual({ kcal: 2200, protein: 180 });
  });
});

describe('nutrition coach insight', () => {
  it('warns when logged protein is under half of the goal', () => {
    Storage.setNutritionDay(Storage.todayKey(), { kcal: 2000, protein: 40 });
    const insights = AICoach.getCoachInsights();
    const ins = insights.find(i => /Poca prote/i.test(i.title));
    expect(ins).toBeTruthy();
    expect(ins.detail).toContain('40 g');
  });

  it('celebrates when protein goal is reached', () => {
    Storage.setNutritionDay(Storage.todayKey(), { kcal: 2400, protein: 145 });
    const insights = AICoach.getCoachInsights();
    expect(insights.some(i => /Proteína completada/i.test(i.title))).toBe(true);
  });

  it('says nothing about nutrition when nothing is logged', () => {
    const insights = AICoach.getCoachInsights();
    expect(insights.some(i => /prote/i.test(i.title))).toBe(false);
  });
});

// ---------- Weekly plan ----------
describe('weekly plan storage', () => {
  it('starts empty and reports today key', () => {
    expect(Storage.getWeekPlan()).toEqual({});
    expect(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']).toContain(Storage.todayDayKey());
  });

  it('assigns and clears days', () => {
    Storage.setWeekPlanDay('mon', 'r1');
    expect(Storage.getWeekPlanDay('mon')).toBe('r1');
    Storage.setWeekPlanDay('mon', null);
    expect(Storage.getWeekPlanDay('mon')).toBe(null);
  });
});

describe('coach respects the weekly plan', () => {
  it('builds today\'s workout from the planned routine', () => {
    Storage.saveRoutines([{ id: 'r1', name: 'Pierna Bestia', exercises: [{ exerciseId: 'x1', sets: 3 }] }]);
    Storage.setWeekPlanDay(Storage.todayDayKey(), 'r1');
    const w = AICoach.generateDailyRecommendation();
    expect(w.name).toBe('📅 Plan semanal: Pierna Bestia');
    expect(w.exercises).toHaveLength(1);
  });

  it('renders all 7 days in the routines screen section', () => {
    RoutinesScreen._selectedPlanRoutine = null;
    const html = RoutinesScreen.renderWeekPlanSection([]);
    expect((html.match(/data-plan-day=/g) || []).length).toBe(7);
    expect(html).toContain('Plan semanal');
    expect(html).toContain('Lun');
    expect(html).toContain('Dom');
  });

  it('shows assigned routine names and rest days', () => {
    Storage.saveRoutines([{ id: 'r1', name: 'Push Day', exercises: [] }]);
    Storage.setWeekPlanDay('wed', 'r1');
    Storage.setWeekPlanDay('fri', 'rest');
    RoutinesScreen._selectedPlanRoutine = null;
    const html = RoutinesScreen.renderWeekPlanSection(Storage.getRoutines());
    expect(html).toContain('Push Day');
    expect(html).toContain('Descanso');
  });

  it('ignores a rest day in the plan and falls back to dynamic logic', () => {
    Storage.setWeekPlanDay(Storage.todayDayKey(), 'rest');
    const w = AICoach.generateDailyRecommendation();
    expect(w.name).not.toMatch(/Plan semanal/);
  });

  it('ignores a planned routine that was deleted', () => {
    Storage.saveRoutines([]);
    Storage.setWeekPlanDay(Storage.todayDayKey(), 'ghost');
    const w = AICoach.generateDailyRecommendation();
    expect(w.name).not.toMatch(/Plan semanal/);
  });
});

// ---------- Health log ----------
describe('HealthLog', () => {
  it('stores and merges days, keeping other days intact', () => {
    HealthLog.setDay('2026-10-16', { sleep: 7.5 });
    HealthLog.setDay('2026-10-16', { rhr: 58 });
    expect(HealthLog.getDay('2026-10-16')).toEqual({ sleep: 7.5, rhr: 58 });
    HealthLog.setDay('2026-10-17', { sleep: 6 });
    expect(HealthLog.getDay('2026-10-16')).toEqual({ sleep: 7.5, rhr: 58 });
  });

  it('computes a resting-HR baseline from the previous 6 days', () => {
    for (let i = 1; i <= 6; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      HealthLog.setDay(Storage.todayKey(d), { rhr: 60 });
    }
    HealthLog.setDay(Storage.todayKey(), { rhr: 70 });
    expect(HealthLog.rhrBaseline()).toBe(60);
  });

  it('normalizes dates (ISO and US Takeout style)', () => {
    expect(HealthLog._normDate('2026-10-17')).toBe('2026-10-17');
    expect(HealthLog._normDate('10/17/2026')).toBe('2026-10-17');
    expect(HealthLog._normDate('not a date')).toBe(null);
  });

  it('normalizes sleep in hours, minutes and clock formats', () => {
    expect(HealthLog._normSleep('7h 30m')).toBe(7.5);
    expect(HealthLog._normSleep('450')).toBe(7.5);   // minutes
    expect(HealthLog._normSleep('7.5')).toBe(7.5);
    expect(HealthLog._normSleep('7:30')).toBe(7.5);
    expect(HealthLog._normSleep('')).toBe(null);
  });

  it('parses a Takeout-style CSV with mixed columns', () => {
    const csv = [
      'Date,Sleep duration,Resting heart rate,Steps',
      '2026-10-15,480,57,"9,800"',
      '10/16/2026,6h 10m,62,5432',
      'garbage-row',
    ].join('\n');
    const recs = HealthLog.parseCSV(csv);
    expect(recs).toHaveLength(2);
    expect(recs[0]).toEqual({ date: '2026-10-15', sleep: 8, rhr: 57, steps: 9800 });
    expect(recs[1]).toEqual({ date: '2026-10-16', sleep: 6.17, rhr: 62, steps: 5432 });
  });

  it('returns no rows without a date column', () => {
    expect(HealthLog.parseCSV('foo,bar\n1,2')).toEqual([]);
  });

  it('importCSV writes every parsed row', () => {
    const csv = 'fecha,sueño\n2026-10-10,7h\n2026-10-11,8h\n';
    expect(HealthLog.importCSV(csv)).toBe(2);
    expect(HealthLog.getDay('2026-10-10').sleep).toBe(7);
    expect(HealthLog.getDay('2026-10-11').sleep).toBe(8);
  });
});

describe('health coach insight', () => {
  it('warns after a short night', () => {
    HealthLog.setDay(Storage.todayKey(), { sleep: 5, rhr: 58 });
    const insights = AICoach.getCoachInsights();
    expect(insights.some(i => /Dormiste poco/i.test(i.title))).toBe(true);
  });

  it('warns when resting HR is 5+ bpm above baseline', () => {
    for (let i = 1; i <= 6; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      HealthLog.setDay(Storage.todayKey(d), { rhr: 55 });
    }
    HealthLog.setDay(Storage.todayKey(), { rhr: 64, sleep: 7 });
    const insights = AICoach.getCoachInsights();
    const ins = insights.find(i => /FC en reposo elevada/i.test(i.title));
    expect(ins).toBeTruthy();
    expect(ins.detail).toContain('64');
  });

  it('is silent about health without data', () => {
    const insights = AICoach.getCoachInsights();
    expect(insights.some(i => /Dormiste poco|FC en reposo/i.test(i.title))).toBe(false);
  });
});
