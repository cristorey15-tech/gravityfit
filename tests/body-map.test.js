// ============================================
// GravityFit — Body Map Tests
// ============================================

import { describe, it, expect } from 'vitest';
import { fatigueColor, renderBodyMap } from '../js/body-map.js';

describe('fatigueColor', () => {
  it('returns faint outline for 0/undefined fatigue', () => {
    expect(fatigueColor(0)).toBe('rgba(255,255,255,0.05)');
    expect(fatigueColor(undefined)).toBe('rgba(255,255,255,0.05)');
  });

  it('returns a green-ish color for low fatigue', () => {
    const c = fatigueColor(20);
    expect(c).toMatch(/^rgba\(\d+,\d+,\d+,/);
    // green channel should dominate at low fatigue
    const [, r, g] = c.match(/rgba\((\d+),(\d+),(\d+)/);
    expect(Number(g)).toBeGreaterThan(Number(r));
  });

  it('returns a red-ish color for high fatigue', () => {
    const c = fatigueColor(95);
    const [, r, g] = c.match(/rgba\((\d+),(\d+),(\d+)/);
    expect(Number(r)).toBe(255);
    expect(Number(g)).toBeLessThan(Number(r));
  });

  it('increases opacity as fatigue rises', () => {
    const low = Number(fatigueColor(10).match(/,([\d.]+)\)$/)[1]);
    const high = Number(fatigueColor(90).match(/,([\d.]+)\)$/)[1]);
    expect(high).toBeGreaterThan(low);
  });
});

describe('renderBodyMap', () => {
  const fatigue = { pectorals: 80, biceps: 40, cuadriceps: 95 };

  it('returns front and back SVG strings', () => {
    const map = renderBodyMap(fatigue);
    expect(typeof map.front).toBe('string');
    expect(typeof map.back).toBe('string');
  });

  it('front view contains an <svg> with a viewBox', () => {
    expect(renderBodyMap(fatigue).front).toMatch(/<svg[^>]+viewBox="0 0 140 260"/);
  });

  it('colors a fatigued muscle region (pectorals appears in front)', () => {
    const front = renderBodyMap(fatigue).front;
    expect(front).toContain("showMuscleDetail('pectorals')");
    // And it should be filled with a red-ish fatigued color, not the empty fill
    expect(fatigueColor(80)).toContain('rgba(255,');
  });

  it('includes back-only muscles in the back view (glutes, lats)', () => {
    const back = renderBodyMap(fatigue).back;
    expect(back).toContain('gluteos');
    expect(back).toContain('espalda');
  });

  it('wires the custom on-muscle click handler', () => {
    const front = renderBodyMap(fatigue, { onMuscleClick: 'myHandler' }).front;
    expect(front).toContain("onclick=\"myHandler('pectorals')\"");
  });

  it('defaults the click handler to HomeScreen.showMuscleDetail', () => {
    const front = renderBodyMap(fatigue).front;
    expect(front).toContain("HomeScreen.showMuscleDetail('pectorals')");
  });

  it('draws the connected silhouette (head + body present)', () => {
    const front = renderBodyMap(fatigue).front;
    expect(front).toContain('<path');
    // two figures = front+back each have skin + head paths
    expect(front.match(/<path/g).length).toBeGreaterThan(10);
  });

  it('handles empty fatigue map without throwing', () => {
    const map = renderBodyMap({});
    expect(map.front).toMatch(/<svg/);
    expect(map.back).toMatch(/<svg/);
  });
});
