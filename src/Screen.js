// ============================================
// GravityFit — Screen Base Class
// ============================================

import { Logger } from './Logger.js';

export class Screen {
  constructor(id) {
    this.id = id;
    this.element = document.getElementById(`screen-${id}`);
    this._isMounted = false;
    this._cache = null;
    this._cacheTime = 0;
    this._cacheDuration = 5000; // 5 seconds
  }

  // Lifecycle hooks
  beforeRender() {}
  afterRender() {}
  beforeMount() {}
  afterMount() {}
  beforeUnmount() {}
  afterUnmount() {}
  onResize() {}
  onVisibilityChange(visible) {}

  render(force = false) {
    try {
      Logger.debug(`Screen[${this.id}].render(force=${force})`);
      this.beforeRender();

      const now = Date.now();
      if (!force && this._cache && now - this._cacheTime < this._cacheDuration) {
        this.element.innerHTML = this._cache;
        this.afterRender();
        return;
      }

      this.element.innerHTML = this._renderContent();
      this._cache = this.element.innerHTML;
      this._cacheTime = now;

      if (!this._isMounted) {
        this._isMounted = true;
        this.afterMount();
      }

      this.afterRender();
    } catch (err) {
      Logger.error(`Screen[${this.id}] render error:`, err);
      this.element.innerHTML = this._renderError(err);
    }
  }

  // Override in subclasses
  _renderContent() {
    return `<div class="screen-placeholder">${this.id}</div>`;
  }

  _renderError(error) {
    return `
      <div class="screen-error">
        <div class="screen-error-icon">⚠️</div>
        <h3>Error al cargar</h3>
        <p>${error.message || 'Ha ocurrido un error inesperado'}</p>
        <button class="btn btn-primary" onclick="window.location.reload()">Recargar</button>
      </div>
    `;
  }

  mount() {
    Logger.debug(`Screen[${this.id}].mount()`);
    this.element.classList.add('active');
    this.beforeMount();
    this.render();
    this.afterMount();
  }

  unmount() {
    Logger.debug(`Screen[${this.id}].unmount()`);
    this.beforeUnmount();
    this.element.classList.remove('active');
    this.afterUnmount();
  }

  refresh() {
    this._cache = null;
    this.render(true);
  }

  invalidateCache() {
    this._cache = null;
    this._cacheTime = 0;
  }

  showLoading() {
    this.element.innerHTML = `
      <div class="loading-screen">
        <div class="loading-spinner">
          <div class="spinner-ring"></div>
          <div class="spinner-ring spinner-ring-inner"></div>
        </div>
        <p class="loading-text">Cargando...</p>
      </div>
    `;
  }

  showEmptyState(icon, title, message, action) {
    this.element.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">${icon}</div>
        <h3 class="empty-state-title">${title}</h3>
        <p class="empty-state-message">${message}</p>
        ${action || ''}
      </div>
    `;
  }

  bindClick(selector, handler) {
    const el = this.element.querySelector(selector);
    if (el) {
      el.removeEventListener('click', handler);
      el.addEventListener('click', handler);
    }
  }

  bindInput(selector, handler) {
    const el = this.element.querySelector(selector);
    if (el) {
      el.removeEventListener('input', handler);
      el.addEventListener('input', handler);
    }
  }

  $(selector) {
    return this.element.querySelector(selector);
  }

  $$(selector) {
    return this.element.querySelectorAll(selector);
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
