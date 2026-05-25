// ============================================
// GravityFit — Logger Service
// ============================================

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

class LoggerService {
  constructor() {
    this.level = LOG_LEVELS.INFO;
    this.history = [];
    this.maxHistory = 100;
    this.errors = [];
  }

  debug(...args) {
    if (this.level <= LOG_LEVELS.DEBUG) {
      console.debug('[DEBUG]', ...args);
    }
  }

  info(...args) {
    if (this.level <= LOG_LEVELS.INFO) {
      console.info('[INFO]', ...args);
    }
    this._addToHistory('info', args);
  }

  warn(...args) {
    if (this.level <= LOG_LEVELS.WARN) {
      console.warn('[WARN]', ...args);
    }
    this._addToHistory('warn', args);
  }

  error(...args) {
    if (this.level <= LOG_LEVELS.ERROR) {
      console.error('[ERROR]', ...args);
    }
    this._addToHistory('error', args);
    this.errors.push({ timestamp: new Date().toISOString(), message: args.join(' ') });
  }

  _addToHistory(level, args) {
    this.history.push({
      timestamp: new Date().toISOString(),
      level,
      message: args.join(' '),
    });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  getErrors() {
    return [...this.errors];
  }

  getHistory() {
    return [...this.history];
  }

  clearErrors() {
    this.errors = [];
  }
}

export const Logger = new LoggerService();

// Global error handler
export function initGlobalErrorHandler() {
  window.onerror = function (msg, url, line, col, error) {
    Logger.error(`Uncaught ${msg} at ${url}:${line}:${col}`, error?.stack);
    // Show error toast if available
    const toastEl = document.getElementById('toast-container');
    if (toastEl && typeof window.Toast !== 'undefined') {
      window.Toast.show(`Error: ${msg}`, 'error', 5000);
    }
    return true;
  };

  window.addEventListener('unhandledrejection', (event) => {
    Logger.error('Unhandled Promise rejection:', event.reason?.message || event.reason);
    const toastEl = document.getElementById('toast-container');
    if (toastEl && typeof window.Toast !== 'undefined') {
      window.Toast.show(`Error: ${event.reason?.message || 'Promise rejected'}`, 'error', 5000);
    }
  });

  Logger.info('Global error handler initialized');
}
