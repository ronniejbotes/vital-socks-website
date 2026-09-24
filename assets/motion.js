/**
 * Vital Socks — scroll choreography (GSAP + ScrollTrigger, optional Lenis).
 *
 * Rules this file keeps:
 * - Content is never hidden by CSS. Every from-state is set here, so with
 *   JavaScript off, reduced motion, or animations disabled in Theme settings,
 *   the page is simply static and complete.
 * - Scroll-linked motion is scrubbed, so scrolling back rewinds it.
 * - Only transform and opacity animate; nothing reads layout on the hot path.
 * - Reveals use opacity, never visibility, so links stay keyboard reachable.
 */
(() => {
  const VS = (window.VS = window.VS || {});
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const designMode = Boolean(window.Shopify && window.Shopify.designMode);

  function boot() {
    const { gsap, ScrollTrigger } = window;
    if (!VS.motion?.animate || reduceMotion.matches || !gsap || !ScrollTrigger) {
      document.documentElement.classList.add('no-motion');
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    document.documentElement.classList.add('has-motion');

    initSmoothScroll(gsap, ScrollTrigger);
    initRibbons(gsap);
    initParallaxStories(gsap);
    initExplainer(gsap, ScrollTrigger);
    initMarquee(gsap, ScrollTrigger);
    initHeroDepth(gsap);
    initFooterWordmark(gsap);
    initReveals(gsap, document);

    document.addEventListener('vs:content-added', (e) => {
      initReveals(gsap, e.detail.root);
      ScrollTrigger.refresh();
    });
    window.addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* Lenis smooth scrolling, driven by GSAP's ticker so ScrollTrigger stays in sync.
     Off in the theme editor, where it would fight the editor's own scrolling. */
  function initSmoothScroll(gsap, ScrollTrigger) {
    if (!VS.motion.smooth || !window.Lenis || designMode) return;
    const lenis = new window.Lenis({ lerp: 0.11, smoothWheel: true });
    VS.lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link || link.getAttribute('href') === '#') return;
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target, { offset: -80 });
    });
  }

  /* The three logo stripes drifting at different speeds behind a section. */
  function initRibbons(gsap) {
    document.querySelectorAll('[data-ribbon]').forEach((ribbon) => {
      const speed = Number(ribbon.dataset.speed) || 1;
      const trigger = ribbon.closest('section, footer, .shopify-section') || ribbon.parentElement;
      gsap.fromTo(
        ribbon,
        { yPercent: 45 * speed, xPercent: -3 * speed },
        {
          yPercent: -45 * speed,
          xPercent: 3 * speed,
          ease: 'none',
          scrollTrigger: { trigger, start: 'top bottom', end: 'bottom top', scrub: true },
        }
      );
    });
  }

  /* Story photos move slower than the page: the "background moves as you scroll". */
  function initParallaxStories(gsap) {
    document.querySelectorAll('[data-parallax]').forEach((panel) => {
      const media = panel.querySelector('[data-parallax-media]');
      if (!media) return;
      gsap.fromTo(
        media,
        { yPercent: -9, scale: 1.06 },
        {
          yPercent: 9,
          scale: 1,
          ease: 'none',
          scrollTrigger: { trigger: panel, start: 'top bottom', end: 'bottom top', scrub: true },
        }
      );
    });
  }

  /* Compression explainer: pin the stage and wrap the bands ankle → knee. */
  function initExplainer(gsap, ScrollTrigger) {
    document.querySelectorAll('[data-explainer]').forEach((section) => {
      const track = section.querySelector('[data-explainer-track]');
      const bands = Array.from(section.querySelectorAll('[data-band]'));
      const steps = Array.from(section.querySelectorAll('[data-step]'));
      const labels = Array.from(section.querySelectorAll('[data-band-label]'));
      const figure = section.querySelector('.explainer__figure');
      const mm = gsap.matchMedia();

      mm.add('(min-width: 900px) and (min-height: 700px)', () => {
        section.classList.add('is-scrubbed');
        ScrollTrigger.refresh();
        gsap.set(bands, { strokeDashoffset: 1 });
        gsap.set(steps, { opacity: 0.28 });
        gsap.set(labels, { opacity: 0.15 });
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: track, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
        });
        bands.forEach((band, i) => {
          tl.to(band, { strokeDashoffset: 0, duration: 1 }, i);
          if (steps[i]) tl.to(steps[i], { opacity: 1, duration: 0.35 }, i + 0.1);
          if (labels[i]) tl.to(labels[i], { opacity: 1, duration: 0.35 }, i + 0.6);
          if (i > 0 && steps[i - 1]) tl.to(steps[i - 1], { opacity: 0.5, duration: 0.35 }, i + 0.1);
        });
        tl.to({}, { duration: 0.6 });
        return () => {
          section.classList.remove('is-scrubbed');
          gsap.set([...bands, ...steps, ...labels], { clearProps: 'all' });
        };
      });

      mm.add('(max-width: 899px), (max-height: 699px)', () => {
        if (!figure) return undefined;
        gsap.fromTo(
          bands,
          { strokeDashoffset: 1 },
          {
            strokeDashoffset: 0,
            stagger: 0.35,
            ease: 'none',
            scrollTrigger: { trigger: figure, start: 'top 85%', end: 'bottom 40%', scrub: true },
          }
        );
        return () => gsap.set(bands, { clearProps: 'all' });
      });
    });
  }

  /* Marquee speeds up with scroll velocity and follows scroll direction. */
  function initMarquee(gsap, ScrollTrigger) {
    document.querySelectorAll('[data-marquee]').forEach((el) => {
      const track = el.querySelector('[data-marquee-track]');
      if (!track) return;
      el.classList.add('is-js-driven');
      const duration = parseFloat(getComputedStyle(el).getPropertyValue('--marquee-duration')) || 36;
      const loop = gsap.to(track, { xPercent: -50, duration, ease: 'none', repeat: -1 });
      let direction = 1;
      ScrollTrigger.create({
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate(self) {
          direction = self.direction;
          const boost = gsap.utils.clamp(0, 6, Math.abs(self.getVelocity()) / 250);
          gsap.to(loop, { timeScale: direction * (1 + boost), duration: 0.2, overwrite: true });
          gsap.to(loop, { timeScale: direction, duration: 1.2, delay: 0.3 });
        },
      });
    });
  }

  /* Hero: the giant word lifts away faster than the page as you leave it. */
  function initHeroDepth(gsap) {
    document.querySelectorAll('sock-carousel').forEach((hero) => {
      const ghost = hero.querySelector('[data-ghost]');
      const glow = hero.querySelector('.sock-carousel__glow');
      const scrollTrigger = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
      if (ghost) gsap.to(ghost, { yPercent: -60, ease: 'none', scrollTrigger });
      if (glow) gsap.to(glow, { opacity: 0.2, ease: 'none', scrollTrigger });
    });
  }

  function initFooterWordmark(gsap) {
    const word = document.querySelector('[data-parallax-text]');
    if (!word) return;
    gsap.fromTo(
      word,
      { yPercent: 45 },
      {
        yPercent: 0,
        ease: 'none',
        scrollTrigger: { trigger: word.closest('footer') || word, start: 'top bottom', end: 'bottom bottom', scrub: true },
      }
    );
  }

  /* Reveal on scroll: single elements and staggered grids. */
  function initReveals(gsap, root) {
    const inHero = (el) => Boolean(el.closest('sock-carousel'));
    root.querySelectorAll('[data-reveal]').forEach((el) => {
      if (inHero(el) || el.dataset.revealed) return;
      el.dataset.revealed = 'true';
      gsap.from(el, {
        y: 36,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' },
      });
    });
    root.querySelectorAll('[data-stagger]').forEach((group) => {
      if (group.dataset.revealed) return;
      group.dataset.revealed = 'true';
      gsap.from(group.children, {
        y: 48,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.08,
        scrollTrigger: { trigger: group, start: 'top 85%', toggleActions: 'play none none reverse' },
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
