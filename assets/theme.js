/**
 * Vital Socks — core interactions (no dependencies).
 * Header state, menu + cart drawers, AJAX cart (Section Rendering API),
 * product form, gallery, fit finder, sorting and product recommendations.
 * Scroll animation lives separately in motion.js.
 */
(() => {
  const VS = (window.VS = window.VS || {});
  const routes = VS.routes || {};
  const strings = VS.strings || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------------------------------------------------------------------
     Overlays (menu drawer, cart drawer): open/close, focus trap, Escape
     --------------------------------------------------------------------- */
  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  let active = null;

  function openOverlay(root, trigger) {
    if (!root) return;
    if (active && active.root !== root) closeOverlay({ restoreFocus: false });
    active = { root, trigger: trigger || document.activeElement };
    root.classList.add('is-open');
    document.body.classList.add('has-overlay-open');
    VS.lenis?.stop();
    if (trigger?.hasAttribute('aria-expanded')) trigger.setAttribute('aria-expanded', 'true');
    const panel = $('[role="dialog"]', root);
    window.requestAnimationFrame(() => panel?.focus());
  }

  function closeOverlay({ restoreFocus = true } = {}) {
    if (!active) return;
    const { root, trigger } = active;
    root.classList.remove('is-open');
    document.body.classList.remove('has-overlay-open');
    VS.lenis?.start();
    if (trigger?.hasAttribute('aria-expanded')) trigger.setAttribute('aria-expanded', 'false');
    active = null;
    if (restoreFocus && trigger && document.contains(trigger)) trigger.focus();
  }

  document.addEventListener('keydown', (event) => {
    if (!active) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeOverlay();
      return;
    }
    if (event.key !== 'Tab') return;
    const panel = $('[role="dialog"]', active.root);
    const items = $$(FOCUSABLE, panel).filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  /* Keep --announce-h exact so the hero fills the screen below the bar. */
  const announcement = $('.announcement');
  const setAnnounce = () => {
    if (announcement) {
      document.documentElement.style.setProperty('--announce-h', `${announcement.offsetHeight}px`);
    }
  };
  setAnnounce();
  window.addEventListener('resize', setAnnounce);

  /* ---------------------------------------------------------------------
     Header: solid once scrolled (overlay mode waits until the hero passes)
     --------------------------------------------------------------------- */
  const header = $('[data-header]');
  if (header) {
    const isOverlay = header.hasAttribute('data-overlay');
    let threshold = 4;
    // Overlay mode stays transparent only for the first stretch of the hero,
    // so hero copy never scrolls under a see-through header.
    const measure = () => {
      threshold = isOverlay ? 60 : 4;
    };
    let ticking = false;
    const update = () => {
      header.classList.toggle('is-scrolled', window.scrollY > threshold);
      ticking = false;
    };
    measure();
    update();
    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    window.addEventListener('resize', () => {
      measure();
      update();
    });
  }

  /* ---------------------------------------------------------------------
     Menu drawer
     --------------------------------------------------------------------- */
  const menuDrawer = $('[data-menu-drawer]');
  document.addEventListener('click', (event) => {
    const openBtn = event.target.closest('[data-menu-open]');
    if (openBtn && menuDrawer) {
      openOverlay(menuDrawer, openBtn);
      return;
    }
    if (event.target.closest('[data-menu-close]')) closeOverlay();
    if (active?.root === menuDrawer && event.target.closest('.menu-drawer__list a')) closeOverlay({ restoreFocus: false });
  });

  /* ---------------------------------------------------------------------
     Cart
     --------------------------------------------------------------------- */
  const cart = {
    get drawer() {
      return $('[data-cart-drawer]');
    },

    setCount(count) {
      $$('[data-cart-count]').forEach((el) => (el.textContent = count > 0 ? count : ''));
    },

    render(sections) {
      const html = sections && sections['cart-drawer'];
      if (!html) return;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const fresh = doc.querySelector('#CartDrawerContents');
      const current = $('#CartDrawerContents');
      const hadFocus = current && current.contains(document.activeElement);
      if (fresh && current) current.replaceWith(fresh);
      if (fresh) this.setCount(Number(fresh.dataset.itemCount || 0));
      // Focus was inside the replaced markup: keep it in the open drawer.
      if (hadFocus && active && active.root === this.drawer) $('[role="dialog"]', this.drawer)?.focus();
    },

    async post(url, body, isForm = false) {
      const response = await fetch(url, {
        method: 'POST',
        headers: isForm
          ? { Accept: 'application/json' }
          : { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: isForm ? body : JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.status) {
        const error = new Error(data.description || data.message || strings.cartError);
        error.data = data;
        throw error;
      }
      return data;
    },

    async add(formData) {
      formData.append('sections', 'cart-drawer');
      formData.append('sections_url', window.location.pathname);
      const data = await this.post(`${routes.cartAdd}.js`, formData, true);
      this.render(data.sections);
      return data;
    },

    async change(key, quantity) {
      const data = await this.post(`${routes.cartChange}.js`, {
        id: key,
        quantity,
        sections: 'cart-drawer',
        sections_url: window.location.pathname,
      });
      this.render(data.sections);
      return data;
    },

    open(trigger) {
      if (VS.cartType === 'drawer' && this.drawer) openOverlay(this.drawer, trigger);
      else window.location.href = routes.cart;
    },
  };
  VS.cart = cart;

  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-cart-open]');
    if (opener && VS.cartType === 'drawer' && cart.drawer) {
      event.preventDefault();
      cart.open(opener);
      return;
    }
    if (event.target.closest('[data-cart-close]')) {
      closeOverlay();
      return;
    }
    const line = event.target.closest('[data-line-key]');
    if (!line) return;
    const key = line.dataset.lineKey;
    const input = $('[data-qty-input]', line);
    const step = event.target.closest('[data-qty-change]');
    if (step && input) {
      const next = Math.max(0, Number(input.value || 0) + Number(step.dataset.qtyChange));
      line.setAttribute('aria-busy', 'true');
      cart.change(key, next).catch(() => line.removeAttribute('aria-busy'));
    }
    if (event.target.closest('[data-line-remove]')) {
      line.setAttribute('aria-busy', 'true');
      cart.change(key, 0).catch(() => line.removeAttribute('aria-busy'));
    }
  });

  document.addEventListener('change', (event) => {
    const input = event.target.closest('[data-qty-input]');
    if (!input) return;
    const line = input.closest('[data-line-key]');
    if (line) cart.change(line.dataset.lineKey, Math.max(0, Number(input.value || 0)));
  });

  /* ---------------------------------------------------------------------
     Product page: variants, gallery, quantity, add to cart
     --------------------------------------------------------------------- */
  function initProduct(section) {
    if (section.dataset.ready) return;
    section.dataset.ready = 'true';
    const data = JSON.parse($('[data-product-json]', section)?.textContent || '{"variants":[]}');
    const variants = data.variants || [];
    const form = $('form[data-product-form]', section) || $('form', section);
    const idInput = $('[data-variant-id]', section);
    const addBtn = $('[data-add-button]', section);
    const addLabel = $('[data-add-label]', section);
    const priceNow = $('[data-price-current]', section);
    const priceWas = $('[data-price-compare]', section);
    const errorBox = $('[data-form-error]', section);
    const fieldsets = $$('[data-option-index]', section);

    const selectedOptions = () => fieldsets.map((fs) => $('input:checked', fs)?.value);

    const showMedia = (mediaId) => {
      if (!mediaId) return;
      $$('.product__slide', section).forEach((slide) => {
        const on = slide.dataset.mediaId === String(mediaId);
        slide.classList.toggle('is-active', on);
        slide.hidden = !on;
      });
      $$('[data-thumb]', section).forEach((thumb) => {
        if (thumb.dataset.thumb === String(mediaId)) thumb.setAttribute('aria-current', 'true');
        else thumb.removeAttribute('aria-current');
      });
    };

    const markAvailability = (selected) => {
      fieldsets.forEach((fs, index) => {
        $$('input[data-option]', fs).forEach((input) => {
          const probe = selected.slice();
          probe[index] = input.value;
          const ok = variants.some(
            (v) => v.available && v.options.every((o, i) => i === index || o === probe[i]) && v.options[index] === input.value
          );
          input.nextElementSibling?.classList.toggle('is-unavailable', !ok);
        });
      });
    };

    const update = () => {
      const selected = selectedOptions();
      const variant = variants.find((v) => v.options.every((o, i) => o === selected[i]));
      markAvailability(selected);
      if (!variant) {
        if (addBtn) addBtn.disabled = true;
        if (addLabel) addLabel.textContent = strings.unavailable;
        return;
      }
      if (idInput) idInput.value = variant.id;
      if (priceNow) priceNow.textContent = variant.price;
      if (priceWas) {
        priceWas.hidden = !variant.compare_at_price;
        priceWas.textContent = variant.compare_at_price || '';
      }
      if (addBtn) addBtn.disabled = !variant.available;
      if (addLabel) addLabel.textContent = variant.available ? strings.addToCart : strings.soldOut;
      showMedia(variant.media_id);
      const url = new URL(window.location.href);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({}, '', url.toString());
    };

    fieldsets.forEach((fs) => fs.addEventListener('change', update));
    if (fieldsets.length) markAvailability(selectedOptions());

    $$('[data-thumb]', section).forEach((thumb) =>
      thumb.addEventListener('click', () => showMedia(thumb.dataset.thumb))
    );

    $$('[data-qty-step]', section).forEach((btn) =>
      btn.addEventListener('click', () => {
        const field = $('[data-qty-field]', section);
        if (!field) return;
        field.value = Math.max(1, Number(field.value || 1) + Number(btn.dataset.qtyStep));
      })
    );

    if (form && VS.cartType === 'drawer') {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!addBtn || addBtn.disabled) return;
        if (errorBox) errorBox.hidden = true;
        addBtn.setAttribute('aria-busy', 'true');
        addBtn.disabled = true;
        if (addLabel) addLabel.textContent = strings.adding;
        try {
          await cart.add(new FormData(form));
          if (addLabel) addLabel.textContent = strings.added;
          cart.open(addBtn);
        } catch (error) {
          if (errorBox) {
            errorBox.textContent = error.message || strings.cartError;
            errorBox.hidden = false;
          }
        } finally {
          addBtn.removeAttribute('aria-busy');
          window.setTimeout(() => {
            addBtn.disabled = false;
            if (addLabel) addLabel.textContent = strings.addToCart;
            update();
          }, 1200);
        }
      });
    }
  }

  /* ---------------------------------------------------------------------
     Fit finder
     --------------------------------------------------------------------- */
  function initFitFinder(root) {
    if (root.dataset.ready) return;
    root.dataset.ready = 'true';
    const rows = $$('tr[data-size]', root).map((tr) => ({
      tr,
      size: tr.dataset.size,
      aMin: Number(tr.dataset.ankleMin),
      aMax: Number(tr.dataset.ankleMax),
      cMin: Number(tr.dataset.calfMin),
      cMax: Number(tr.dataset.calfMax),
    }));
    const ankle = $('[data-fit-ankle]', root);
    const calf = $('[data-fit-calf]', root);
    const result = $('[data-fit-result]', root);
    const sizeEl = $('[data-fit-size]', root);
    const noteEl = $('[data-fit-note]', root);
    const contactEl = $('[data-fit-contact]', root);
    let text = {};
    try {
      text = JSON.parse($('[data-fit-strings]', root)?.innerHTML || '{}');
    } catch (e) {
      text = {};
    }

    // Locale strings from data-fit-strings; "[size]" is swapped for the size label.
    const say = (key, size = '') => String(text[key] || '').replace(/\[size\]/g, () => size);

    const run = () => {
      const a = parseFloat(ankle?.value);
      const c = parseFloat(calf?.value);
      rows.forEach((r) => r.tr.classList.remove('is-match'));
      result?.classList.remove('is-match');
      if (contactEl) contactEl.hidden = true;
      // The ankle decides the size; the calf is an optional check.
      if (Number.isNaN(a)) {
        sizeEl.textContent = '—';
        noteEl.textContent = say('prompt');
        return;
      }
      // The chart is in whole centimetres: 19–22 covers 19 up to just under 23.
      const inRange = (v, min, max) => v >= min && v < max + 1;
      const fit = rows.find((r) => inRange(a, r.aMin, r.aMax));
      if (!fit) {
        sizeEl.textContent = '?';
        noteEl.textContent = say('noMatch');
        if (contactEl) contactEl.hidden = false;
        return;
      }
      sizeEl.textContent = fit.size;
      fit.tr.classList.add('is-match');
      result?.classList.add('is-match');
      const calfOutside = !Number.isNaN(c) && !inRange(c, fit.cMin, fit.cMax);
      noteEl.textContent = say(calfOutside ? 'calfOutside' : 'match', fit.size);
      if (calfOutside && contactEl) contactEl.hidden = false;
    };
    [ankle, calf].forEach((input) => input?.addEventListener('input', run));
    $('[data-fit-form]', root)?.addEventListener('submit', (e) => e.preventDefault());
  }

  /* ---------------------------------------------------------------------
     Collection sorting
     --------------------------------------------------------------------- */
  document.addEventListener('change', (event) => {
    const select = event.target.closest('[data-sort-select]');
    if (select) select.form.submit();
  });

  /* ---------------------------------------------------------------------
     Cart page: the drawer's -/+ stepper. Each change submits the cart form
     (Shopify's own update), so totals come back from the server. A short
     wait lets several clicks land as one update.
     --------------------------------------------------------------------- */
  let cartPageTimer;
  const submitCartPage = (form, line) => {
    clearTimeout(cartPageTimer);
    line?.setAttribute('aria-busy', 'true');
    cartPageTimer = setTimeout(() => {
      const update = $('[data-cart-update]', form);
      if (form.requestSubmit && update) form.requestSubmit(update);
      else if (update) update.click();
      else form.submit();
    }, 400);
  };
  document.addEventListener('click', (event) => {
    const step = event.target.closest('[data-cart-step]');
    const form = step?.closest('[data-cart-page-form]');
    const input = step && $('[data-cart-qty]', step.closest('.qty'));
    if (!form || !input) return;
    input.value = Math.max(0, Number(input.value || 0) + Number(step.dataset.cartStep));
    submitCartPage(form, step.closest('.cart-line'));
  });
  document.addEventListener('change', (event) => {
    const input = event.target.closest('[data-cart-qty]');
    const form = input?.closest('[data-cart-page-form]');
    if (form) submitCartPage(form, input.closest('.cart-line'));
  });

  /* ---------------------------------------------------------------------
     Product recommendations
     --------------------------------------------------------------------- */
  if (!customElements.get('product-recommendations')) {
    customElements.define(
      'product-recommendations',
      class extends HTMLElement {
        connectedCallback() {
          if (this.querySelector('.product-grid') || !this.dataset.url) return;
          const observer = new IntersectionObserver(
            (entries) => {
              if (!entries[0].isIntersecting) return;
              observer.disconnect();
              fetch(this.dataset.url)
                .then((r) => r.text())
                .then((html) => {
                  const doc = new DOMParser().parseFromString(html, 'text/html');
                  const fresh = doc.querySelector('product-recommendations');
                  if (fresh && fresh.innerHTML.trim()) {
                    this.innerHTML = fresh.innerHTML;
                    document.dispatchEvent(new CustomEvent('vs:content-added', { detail: { root: this } }));
                  }
                })
                .catch(() => {});
            },
            { rootMargin: '0px 0px 400px 0px' }
          );
          observer.observe(this);
        }
      }
    );
  }

  /* ---------------------------------------------------------------------
     Boot + theme editor support
     --------------------------------------------------------------------- */
  const init = (root = document) => {
    $$('[data-product-section]', root).forEach(initProduct);
    $$('[data-fit-finder]', root).forEach(initFitFinder);
  };
  init();
  document.addEventListener('shopify:section:load', (event) => init(event.target));
})();
