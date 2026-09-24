/**
 * <sock-carousel> — homepage design carousel.
 *
 * Behaviour (from the original carousel brief):
 * - navigate('next' | 'prev') is ignored while a move is running; the lock
 *   releases after 650ms, the same length as every CSS transition.
 * - Roles are derived from the active index: centre = active, left = active-1,
 *   right = active+1, and the rest sit behind (two back positions when there
 *   are five or more designs).
 * - Background, glow, ghost word, product positions, scale, blur and opacity
 *   all change together because they are driven by one class swap plus the
 *   --slide-* custom properties.
 * Additions: keyboard arrows, swipe, per-design ticks, a polite live region,
 * optional autoplay, theme-editor block selection, and it re-tints the
 * floating header to match the slide.
 */
(() => {
  if (customElements.get('sock-carousel')) return;

  const LOCK_MS = 650;
  const ROLES = ['center', 'left', 'right', 'back', 'back-left', 'back-right', 'hidden'];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const roleFor = (offset, n) => {
    if (offset === 0) return 'center';
    if (offset === 1) return 'right';
    if (offset === n - 1) return 'left';
    if (n === 4 && offset === 2) return 'back';
    if (n >= 5 && offset === 2) return 'back-right';
    if (n >= 5 && offset === n - 2) return 'back-left';
    return 'hidden';
  };

  class SockCarousel extends HTMLElement {
    connectedCallback() {
      const data = this.querySelector('[data-slides]');
      this.slides = data ? JSON.parse(data.textContent) : [];
      this.items = Array.from(this.querySelectorAll('[data-item]'));
      this.n = this.items.length;
      this.active = 0;
      this.isAnimating = false;

      this.el = {
        text: this.querySelector('[data-text]'),
        persona: this.querySelector('[data-persona]'),
        name: this.querySelector('[data-name]'),
        desc: this.querySelector('[data-desc]'),
        meta: this.querySelector('[data-meta]'),
        cta: this.querySelector('[data-cta]'),
        live: this.querySelector('[data-live]'),
        ticks: Array.from(this.querySelectorAll('[data-go]')),
      };

      this.onKey = this.onKey.bind(this);
      this.onBlockSelect = this.onBlockSelect.bind(this);
      this.onVisibility = this.onVisibility.bind(this);

      this.querySelector('[data-prev]')?.addEventListener('click', () => this.navigate('prev', true));
      this.querySelector('[data-next]')?.addEventListener('click', () => this.navigate('next', true));
      this.el.ticks.forEach((tick) =>
        tick.addEventListener('click', () => this.goTo(Number(tick.dataset.go), true))
      );
      this.addEventListener('keydown', this.onKey);
      this.bindSwipe();

      document.addEventListener('shopify:block:select', this.onBlockSelect);
      document.addEventListener('visibilitychange', this.onVisibility);

      this.paintMeta(this.slides[0]);
      this.paintTone(this.slides[0]);
      this.setupAutoplay();
    }

    disconnectedCallback() {
      document.removeEventListener('shopify:block:select', this.onBlockSelect);
      document.removeEventListener('visibilitychange', this.onVisibility);
      this.stopAutoplay();
    }

    navigate(direction, fromUser = false) {
      if (this.n < 2) return;
      const next =
        direction === 'next' ? (this.active + 1) % this.n : (this.active + this.n - 1) % this.n;
      this.goTo(next, fromUser);
    }

    goTo(index, fromUser = false) {
      if (this.isAnimating || index === this.active || index < 0 || index >= this.n) return;
      if (fromUser) this.stopAutoplay();
      this.isAnimating = true;
      this.active = index;
      this.render();
      window.setTimeout(() => {
        this.isAnimating = false;
      }, LOCK_MS);
    }

    render() {
      const { n, active } = this;
      this.items.forEach((item, i) => {
        const role = roleFor((i - active + n) % n, n);
        ROLES.forEach((r) => item.classList.toggle(`is-${r}`, r === role));
        if (role === 'center') item.removeAttribute('aria-hidden');
        else item.setAttribute('aria-hidden', 'true');
      });

      const slide = this.slides[active];
      if (!slide) return;
      this.style.setProperty('--slide-bg', slide.bg);
      this.style.setProperty('--slide-panel', slide.panel);
      this.style.setProperty('--slide-fg', slide.fg);
      this.style.setProperty('--slide-ghost', slide.ghost);
      this.paintTone(slide);

      this.el.ticks.forEach((tick, i) => {
        if (i === active) tick.setAttribute('aria-current', 'true');
        else tick.removeAttribute('aria-current');
      });
      if (this.el.cta) this.el.cta.href = slide.url;

      const swap = () => {
        if (this.el.persona) this.el.persona.textContent = slide.persona || '';
        if (this.el.name) this.el.name.textContent = slide.name || '';
        if (this.el.desc) this.el.desc.textContent = slide.description || '';
        this.paintMeta(slide);
        this.el.text?.classList.remove('is-swapping');
      };
      if (reduceMotion.matches || !this.el.text) {
        swap();
      } else {
        this.el.text.classList.add('is-swapping');
        window.setTimeout(swap, 240);
      }

      if (this.el.live) {
        this.el.live.textContent = [slide.name, slide.persona].filter(Boolean).join(', ');
      }
    }

    paintMeta(slide) {
      if (!this.el.meta || !slide) return;
      this.el.meta.textContent = [slide.price, slide.grade].filter(Boolean).join('  ·  ');
    }

    paintTone(slide) {
      if (!slide) return;
      const root = document.documentElement;
      root.style.setProperty('--hero-fg', slide.fg);
      root.dataset.heroTone = slide.tone;
    }

    onKey(event) {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.navigate('next', true);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.navigate('prev', true);
      }
    }

    bindSwipe() {
      const stage = this.querySelector('.sock-carousel__stage');
      if (!stage) return;
      let startX = null;
      let startY = null;
      stage.addEventListener(
        'pointerdown',
        (e) => {
          if (e.pointerType === 'mouse') return;
          startX = e.clientX;
          startY = e.clientY;
        },
        { passive: true }
      );
      stage.addEventListener(
        'pointerup',
        (e) => {
          if (startX === null) return;
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          startX = null;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
            this.navigate(dx < 0 ? 'next' : 'prev', true);
          }
        },
        { passive: true }
      );
    }

    onBlockSelect(event) {
      const index = this.items.indexOf(event.target);
      if (index === -1) return;
      this.stopAutoplay();
      this.isAnimating = false;
      this.goTo(index);
    }

    setupAutoplay() {
      if (this.dataset.autoplay !== 'true' || reduceMotion.matches || this.n < 2) return;
      const speed = Number(this.dataset.autoplaySpeed) || 6000;
      this.autoplay = { speed, paused: false };
      const pause = () => (this.autoplay.paused = true);
      const resume = () => (this.autoplay.paused = false);
      this.addEventListener('pointerenter', pause);
      this.addEventListener('pointerleave', resume);
      this.addEventListener('focusin', pause);
      this.addEventListener('focusout', resume);
      this.timer = window.setInterval(() => {
        if (!this.autoplay.paused && !document.hidden) this.navigate('next');
      }, speed);
    }

    stopAutoplay() {
      if (this.timer) window.clearInterval(this.timer);
      this.timer = null;
    }

    onVisibility() {
      if (this.autoplay) this.autoplay.paused = document.hidden;
    }
  }

  customElements.define('sock-carousel', SockCarousel);
})();
