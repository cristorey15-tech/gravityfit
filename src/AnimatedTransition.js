// ============================================
// GravityFit — Animated Screen Transitions
// ============================================

import { Logger } from './Logger.js';

const TRANSITIONS = {
  slideLeft: {
    in: 'animate-slide-in-left',
    out: 'animate-slide-out-right',
  },
  slideRight: {
    in: 'animate-slide-in-right',
    out: 'animate-slide-out-left',
  },
  fade: {
    in: 'animate-fade-in',
    out: 'animate-fade-out',
  },
  zoom: {
    in: 'animate-zoom-in',
    out: 'animate-zoom-out',
  },
  slideUp: {
    in: 'animate-slide-up',
    out: 'animate-slide-down',
  },
};

class AnimatedTransition {
  constructor() {
    this._duration = 300; // ms
    this._defaultType = 'slideLeft';
    this._isAnimating = false;
  }

  set duration(ms) {
    this._duration = ms;
  }

  get duration() {
    return this._duration;
  }

  async transition(fromEl, toEl, direction = 'forward', customType = null) {
    if (this._isAnimating) return;
    this._isAnimating = true;

    try {
      // Determine transition type based on direction
      let type;
      if (customType) {
        type = TRANSITIONS[customType];
      } else if (direction === 'forward') {
        type = TRANSITIONS.slideLeft;
      } else if (direction === 'backward') {
        type = TRANSITIONS.slideRight;
      } else {
        type = TRANSITIONS.fade;
      }

      if (!type) type = TRANSITIONS.fade;

      // Prepare incoming screen
      if (toEl) {
        toEl.style.position = 'absolute';
        toEl.style.top = '0';
        toEl.style.left = '0';
        toEl.style.width = '100%';
        toEl.style.height = '100%';
        toEl.style.zIndex = '2';
        toEl.classList.add(type.in);
        toEl.classList.add('active');
      }

      // Animate out the current screen
      if (fromEl && fromEl !== toEl) {
        fromEl.classList.add(type.out);
        fromEl.style.zIndex = '1';

        // Wait for out animation
        await this._wait(this._duration);

        fromEl.classList.remove('active', type.out);
        fromEl.style.position = '';
        fromEl.style.zIndex = '';
      }

      // Complete the incoming animation
      if (toEl) {
        await this._wait(this._duration * 0.3); // Overlap for smoother feel
        toEl.classList.remove(type.in);
        toEl.style.position = '';
        toEl.style.zIndex = '';
      }

      // Cleanup
      document.querySelectorAll('.screen').forEach((s) => {
        Object.values(TRANSITIONS).forEach((t) => {
          s.classList.remove(t.in, t.out);
        });
        s.style.position = '';
        s.style.zIndex = '';
      });
    } catch (err) {
      Logger.error('Transition error:', err);
    } finally {
      this._isAnimating = false;
    }
  }

  async fadeIn(el) {
    el.style.opacity = '0';
    el.style.transition = `opacity ${this._duration}ms ease`;
    requestAnimationFrame(() => {
      el.style.opacity = '1';
    });
    await this._wait(this._duration);
    el.style.transition = '';
  }

  async fadeOut(el) {
    el.style.opacity = '1';
    el.style.transition = `opacity ${this._duration}ms ease`;
    requestAnimationFrame(() => {
      el.style.opacity = '0';
    });
    await this._wait(this._duration);
    el.style.opacity = '';
    el.style.transition = '';
  }

  async slideUp(el) {
    el.style.transform = 'translateY(100%)';
    el.style.transition = `transform ${this._duration}ms cubic-bezier(0.16, 1, 0.3, 1)`;
    requestAnimationFrame(() => {
      el.style.transform = 'translateY(0)';
    });
    await this._wait(this._duration);
    el.style.transition = '';
    el.style.transform = '';
  }

  pulse(el) {
    el.style.animation = 'pulse 0.3s ease';
    setTimeout(() => {
      el.style.animation = '';
    }, 300);
  }

  scaleIn(el) {
    el.style.transform = 'scale(0.9)';
    el.style.opacity = '0';
    el.style.transition = `transform ${this._duration}ms cubic-bezier(0.16, 1, 0.3, 1), opacity ${this._duration}ms ease`;
    requestAnimationFrame(() => {
      el.style.transform = 'scale(1)';
      el.style.opacity = '1';
    });
    setTimeout(() => {
      el.style.transition = '';
      el.style.transform = '';
      el.style.opacity = '';
    }, this._duration);
  }

  _wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const animatedTransition = new AnimatedTransition();
