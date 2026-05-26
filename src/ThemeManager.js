// ============================================
// GravityFit — Theme Manager (Dark/Light Mode)
// ============================================

import { Logger } from './Logger.js';

const THEMES = {
  dark: {
    '--color-bg': '#0D0D0D',
    '--color-bg-card': '#1A1A1A',
    '--color-bg-input': '#262626',
    '--color-bg-hover': '#333333',
    '--color-text-primary': '#FFFFFF',
    '--color-text-secondary': '#A0A0A0',
    '--color-text-tertiary': '#6B6B6B',
    '--color-border': '#2A2A2A',
    '--color-accent': '#A3FF12',
    '--color-accent-dim': '#7ACC0E',
    '--color-danger': '#FF4444',
    '--color-warning': '#FFB347',
    '--color-info': '#60A5FA',
    '--shadow-sm': '0 1px 2px rgba(0,0,0,0.3)',
    '--shadow-md': '0 4px 12px rgba(0,0,0,0.4)',
    '--shadow-lg': '0 8px 24px rgba(0,0,0,0.5)',
    '--shadow-glow': '0 0 20px rgba(163,255,18,0.15)',
    '--overlay-bg': 'rgba(0,0,0,0.7)',
    '--nav-bg': 'rgba(13,13,13,0.95)',
    '--gradient-primary': 'linear-gradient(135deg, #A3FF12, #7ACC0E)',
    '--gradient-card': 'linear-gradient(135deg, rgba(163,255,18,0.05), rgba(26,26,26,1))',
  },
  light: {
    '--color-bg': '#F5F5F5',
    '--color-bg-card': '#FFFFFF',
    '--color-bg-input': '#EEEEEE',
    '--color-bg-hover': '#E0E0E0',
    '--color-text-primary': '#1A1A1A',
    '--color-text-secondary': '#666666',
    '--color-text-tertiary': '#999999',
    '--color-border': '#E0E0E0',
    '--color-accent': '#4CAF50',
    '--color-accent-dim': '#388E3C',
    '--color-danger': '#D32F2F',
    '--color-warning': '#F57C00',
    '--color-info': '#1976D2',
    '--shadow-sm': '0 1px 3px rgba(0,0,0,0.1)',
    '--shadow-md': '0 4px 12px rgba(0,0,0,0.1)',
    '--shadow-lg': '0 8px 24px rgba(0,0,0,0.12)',
    '--shadow-glow': '0 0 20px rgba(76,175,80,0.2)',
    '--overlay-bg': 'rgba(0,0,0,0.4)',
    '--nav-bg': 'rgba(255,255,255,0.95)',
    '--gradient-primary': 'linear-gradient(135deg, #4CAF50, #388E3C)',
    '--gradient-card': 'linear-gradient(135deg, rgba(76,175,80,0.05), rgba(255,255,255,1))',
  },
};

class ThemeManager {
  constructor() {
    this._currentTheme = 'light';
    this._listeners = [];
    this._mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this._mediaQuery.addEventListener('change', () => this._handleSystemChange());
  }

  init() {
    // Load saved theme
    const saved = localStorage.getItem('gf_theme');
    if (saved && THEMES[saved]) {
      this._currentTheme = saved;
    } else {
      // Use system preference
      this._currentTheme = this._mediaQuery.matches ? 'dark' : 'light';
    }
    this.apply(this._currentTheme);
    Logger.info(`ThemeManager initialized with "${this._currentTheme}" theme`);
  }

  get current() {
    return this._currentTheme;
  }

  get isDark() {
    return this._currentTheme === 'dark';
  }

  get isLight() {
    return this._currentTheme === 'light';
  }

  toggle() {
    const newTheme = this._currentTheme === 'dark' ? 'light' : 'dark';
    this.apply(newTheme);
    return newTheme;
  }

  apply(theme) {
    if (!THEMES[theme]) {
      Logger.warn(`Theme "${theme}" not found, falling back to light`);
      theme = 'light';
    }

    const vars = THEMES[theme];
    const root = document.documentElement;

    // Apply CSS custom properties with a smooth transition
    root.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Set body class for any remaining theme-dependent styles
    document.body.className = theme;
    document.body.classList.add(`theme-${theme}`);

    // Update theme-color meta tag
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.content = vars['--color-bg'];
    }

    this._currentTheme = theme;
    localStorage.setItem('gf_theme', theme);

    // Notify listeners
    this._listeners.forEach((fn) => fn(theme));

    Logger.info(`Theme applied: ${theme}`);
  }

  onChange(fn) {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== fn);
    };
  }

  _handleSystemChange() {
    // Only auto-switch if user hasn't manually set a preference
    if (!localStorage.getItem('gf_theme')) {
      const newTheme = this._mediaQuery.matches ? 'dark' : 'light';
      this.apply(newTheme);
    }
  }
}

export const themeManager = new ThemeManager();
