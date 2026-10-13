// ============================================
// GravityFit — Sync Security Tests
// ============================================
// Unit tests for the pure/testable helpers in sync.js (no Firebase needed).

import { describe, it, expect } from 'vitest';
import { btoa, atob } from 'node:buffer';
import { CloudSync } from '../js/sync.js';

describe('CloudSync._randomId', () => {
  it('produces a 32-char hex id', () => {
    expect(CloudSync._randomId()).toMatch(/^[0-9a-f]{32}$/);
  });

  it('is unique across many calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => CloudSync._randomId()));
    expect(ids.size).toBe(100);
  });

  it('does not leak a timestamp prefix like the legacy id', () => {
    expect(CloudSync._randomId().startsWith('user_')).toBe(false);
  });
});

describe('CloudSync._isWeakId', () => {
  it('flags legacy enumerable ids', () => {
    expect(CloudSync._isWeakId('user_1700000000000_abc123')).toBe(true);
  });

  it('accepts strong random ids', () => {
    expect(CloudSync._isWeakId(CloudSync._randomId())).toBe(false);
  });

  it('flags non-strings / empty as not-weak-safe', () => {
    // a strong id is anything not starting with the legacy 'user_' marker
    expect(CloudSync._isWeakId(undefined)).toBe(false);
  });
});

describe('CloudSync token (expiring capability)', () => {
  it('getSyncToken embeds a strong id and a future expiry', () => {
    const token = CloudSync.getSyncToken();
    const data = JSON.parse(atob(token));
    expect(data.id).toMatch(/^[0-9a-f]{32}$/);
    expect(data.id).toBe(CloudSync.cloudId);
    expect(data.exp).toBeGreaterThan(Date.now());
  });

  it('parseToken accepts a freshly minted token', () => {
    const data = CloudSync.parseToken(CloudSync.getSyncToken());
    expect(data.id).toBe(CloudSync.cloudId);
  });

  it('parseToken rejects garbage / non-base64', () => {
    expect(() => CloudSync.parseToken('%%%not-base64%%%')).toThrow(/no es válido/);
  });

  it('parseToken rejects a token with no id', () => {
    const noId = btoa(JSON.stringify({ v: 2, exp: Date.now() + 60000 }));
    expect(() => CloudSync.parseToken(noId)).toThrow(/no es válido/);
  });

  it('parseToken rejects an expired token', () => {
    const expired = btoa(JSON.stringify({ v: 2, id: 'a'.repeat(32), exp: Date.now() - 1000 }));
    expect(() => CloudSync.parseToken(expired)).toThrow(/expirado/);
  });

  it('parseToken still accepts legacy v1 tokens (no exp field)', () => {
    const legacy = btoa(JSON.stringify({ id: 'abc123', timestamp: 123 }));
    expect(CloudSync.parseToken(legacy).id).toBe('abc123');
  });
});
