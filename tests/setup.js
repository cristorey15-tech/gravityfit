// ============================================
// GravityFit — Test Setup
// ============================================

// Use fake-indexeddb for testing IndexedDB operations
import 'fake-indexeddb/auto';

// Set up global mocks
global.window = global.window || {};
global.navigator = global.navigator || {};

// Mock localStorage (jsdom provides it, but ensure it's available)
if (!global.localStorage) {
  const store = {};
  global.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };
}

// Mock navigator.vibrate
global.navigator.vibrate = () => {};

// console.error is not suppressed globally — individual tests can mock it per-test with vi.spyOn
