(function(){
  const root = document.documentElement;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animate = !!(window.gsap && window.ScrollTrigger) && !reduceMotion;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (animate) {
    root.classList.add('has-gsap');
    gsap.registerPlugin(ScrollTrigger);
  }
  root.classList.add('is-loading');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);

  // ---------------------------------------------------------------
  // Theme
  // ---------------------------------------------------------------
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  function syncThemeMeta(){
    if (themeMeta) themeMeta.setAttribute('content', root.getAttribute('data-theme') === 'dark' ? '#0B0C10' : '#F3F1EC');
  }
  syncThemeMeta();
  document.getElementById('themeToggle').addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    syncThemeMeta();
    try { localStorage.setItem('theme', next); } catch(e){}
  });

  // ---------------------------------------------------------------
  // Smooth scroll (Lenis)
  // ---------------------------------------------------------------
  let lenis = null;
  if (animate && window.Lenis) {
    lenis = new Lenis({
      duration: 1.15,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  // ---------------------------------------------------------------
  // Mobile menu
  // ---------------------------------------------------------------
  const nav = document.getElementById('nav');
  const menuBtn = document.getElementById('menuBtn');
  const navlinks = document.getElementById('navlinks');
  let menuOpen = false;
  function setMenu(open){
    menuOpen = open;
    navlinks.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    nav.classList.remove('hide');
    if (lenis) open ? lenis.stop() : lenis.start();
    else document.body.style.overflow = open ? 'hidden' : '';
  }
  menuBtn.addEventListener('click', () => setMenu(!menuOpen));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) setMenu(false); });

  // In-page anchor links route through Lenis
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      const target = id === '#top' ? 0 : document.querySelector(id);
      if (target === null) return;
      if (menuOpen) setMenu(false);
      if (lenis) {
        e.preventDefault();
        lenis.scrollTo(target, { offset: id === '#top' ? 0 : -70, duration: 1.6 });
      }
    });
  });

  // ---------------------------------------------------------------
  // Text splitting — wraps words (and optionally chars) in masks,
  // preserving nested elements like <span class="serif">
  // ---------------------------------------------------------------
  function split(el, mode){
    const out = [];
    (function walk(node){
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const wi = document.createElement('span'); wi.className = 'wi';
            if (mode === 'chars') {
              Array.from(part).forEach(ch => {
                const c = document.createElement('span'); c.className = 'c'; c.textContent = ch;
                wi.appendChild(c); out.push(c);
              });
            } else {
              wi.textContent = part; out.push(wi);
            }
            w.appendChild(wi); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) {
          walk(n);
        }
      });
    })(el);
    return out;
  }

  // ---------------------------------------------------------------
  // Counters
  // ---------------------------------------------------------------
  function animateCount(el){
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const target = parseFloat(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    if (reduceMotion) { el.textContent = target + suffix; return; }
    const duration = 1400, start = performance.now();
    (function tick(now){
      const p = Math.min((now - start) / duration, 1);
      el.textContent = Math.round((1 - Math.pow(1 - p, 4)) * target) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    })(start);
  }

  // ---------------------------------------------------------------
  // Splash + hero intro
  // ---------------------------------------------------------------
  const splash = document.getElementById('splash');
  const splashNum = document.getElementById('splashNum');
  const splashBar = document.getElementById('splashBar');
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const pageLoaded = new Promise(r => document.readyState === 'complete' ? r() : window.addEventListener('load', r, { once: true }));
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

  function finishLoading(){
    splash.classList.add('done');
    root.classList.remove('is-loading');
    root.classList.add('ready');
    if (lenis) lenis.start();
    if (animate) ScrollTrigger.refresh();
    if (location.hash) {
      const t = document.querySelector(location.hash);
      if (t) lenis ? lenis.scrollTo(t, { offset: -70, immediate: true }) : t.scrollIntoView();
    }
  }

  let heroChars = [];
  if (animate) {
    document.querySelectorAll('.hero [data-split="chars"]').forEach(el => { heroChars = heroChars.concat(split(el, 'chars')); });
    gsap.set(heroChars, { yPercent: 115 });
    gsap.set('[data-hero-fade]', { opacity: 0, y: 30 });
    gsap.set(nav, { yPercent: -100, opacity: 0 });
  }

  function heroIntro(){
    return gsap.timeline()
      .to(heroChars, { yPercent: 0, duration: 1.4, ease: 'expo.out', stagger: 0.035 })
      .to(nav, { yPercent: 0, opacity: 1, duration: 1.1, ease: 'expo.out', clearProps: 'transform,opacity' }, 0.3)
      .to('[data-hero-fade]', { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08 }, 0.35)
      .add(() => root.classList.add('ready'), 0.4);
  }

  if (animate) {
    const nameChars = split(splash.querySelector('[data-splash-name]'), 'chars');
    const words = Array.from(splash.querySelectorAll('.sw-track span'));
    const counter = { v: 0 };
    const render = () => {
      splashNum.textContent = Math.round(counter.v);
      splashBar.style.transform = 'scaleX(' + (counter.v / 100) + ')';
    };

    gsap.set(nameChars, { yPercent: 115 });
    gsap.to(nameChars, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.06, delay: 0.15 });

    gsap.set(words, { y: 0, yPercent: 110 });
    const wordTl = gsap.timeline({ delay: 0.3 });
    // Slot-machine: each word leaves exactly as the next one arrives, moving together
    const step = 0.6, dur = 0.5;
    words.forEach((w, i) => {
      wordTl.fromTo(w, { yPercent: 110 }, { yPercent: 0, duration: dur, ease: 'power3.inOut' }, i * step);
      if (i < words.length - 1) wordTl.to(w, { yPercent: -110, duration: dur, ease: 'power3.inOut' }, (i + 1) * step);
    });

    gsap.to(counter, { v: 84, duration: 1.9, ease: 'power2.out', onUpdate: render });

    let exited = false;
    function exitSplash(){
      if (exited) return;
      exited = true;
      gsap.killTweensOf(counter);
      gsap.to(counter, {
        v: 100, duration: 0.55, ease: 'power2.inOut', onUpdate: render,
        onComplete(){
          gsap.timeline({ onComplete: finishLoading })
            .to('.splash-inner > *', { yPercent: -60, opacity: 0, duration: 0.7, ease: 'power3.in', stagger: 0.05 })
            .to('.splash-cols i', { yPercent: -100, duration: 1.1, ease: 'expo.inOut', stagger: 0.07 }, '-=0.25')
            .add(heroIntro(), '-=0.75');
        }
      });
    }
    Promise.race([Promise.all([pageLoaded, fontsReady, wait(2200)]), wait(5000)]).then(exitSplash);
    splash.addEventListener('click', exitSplash);
  } else {
    // No GSAP / reduced motion: brief fade
    Promise.race([pageLoaded, wait(2500)]).then(() => {
      splashNum.textContent = '100';
      splashBar.style.transform = 'scaleX(1)';
      splash.style.transition = 'opacity .5s ease';
      splash.style.opacity = '0';
      setTimeout(finishLoading, reduceMotion ? 50 : 500);
    });
  }

  // ---------------------------------------------------------------
  // Scroll animations
  // ---------------------------------------------------------------
  const sections = ['about','systems','work','experience','stack','contact'].map(id => document.getElementById(id)).filter(Boolean);
  const navAnchors = Array.from(navlinks.querySelectorAll('a'));
  function setActive(id){
    navAnchors.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
  }

  if (animate) {
    const mm = gsap.matchMedia();

    // Horizontal pinned systems (desktop)
    mm.add('(min-width: 900px)', () => {
      root.classList.add('h-active');
      const pin = document.querySelector('.h-pin');
      const track = document.querySelector('.h-track');
      const dist = () => track.scrollWidth - window.innerWidth;
      const tween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 }
      });
      gsap.to('.h-progress i', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), scrub: true, invalidateOnRefresh: true } });
      gsap.utils.toArray('.sys-card').forEach(card => {
        gsap.from(card, { y: 80, rotate: 3, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'left 55%', scrub: true } });
        gsap.from(card.querySelector('.sys-num'), { xPercent: 70, opacity: 0, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 95%', end: 'left 35%', scrub: true } });
      });
      return () => root.classList.remove('h-active');
    });

    // Stacked systems (mobile)
    mm.add('(max-width: 899px)', () => {
      gsap.utils.toArray('.sys-card, .h-intro .sec-sub').forEach(el => {
        gsap.from(el, { y: 60, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
      });
    });

    // Top progress bar
    gsap.to('#scrollBar', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

    // Hero parallax out
    gsap.to('.hero-title', { yPercent: -18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero .wrap', { opacity: 0.1, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } });

    // Section titles: words rise from masks
    document.querySelectorAll('section [data-split="words"]').forEach(el => {
      const words = split(el, 'words');
      gsap.set(words, { yPercent: 115 });
      gsap.to(words, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    });

    // About statement: words light up as you scroll
    document.querySelectorAll('[data-scrub-words]').forEach(el => {
      const words = split(el, 'words');
      gsap.fromTo(words, { opacity: 0.12 }, { opacity: 1, ease: 'none', stagger: 0.1, scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true } });
    });

    // Generic reveals, staggered in batches
    gsap.set('.reveal, .reveal-row', { opacity: 0, y: 50 });
    ScrollTrigger.batch('.reveal, .reveal-row', {
      start: 'top 90%', once: true,
      onEnter: batch => {
        gsap.to(batch, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.09, clearProps: 'transform' });
        batch.forEach(el => { const c = el.querySelector('.about-num[data-target]'); if (c) animateCount(c); });
      }
    });

    // Timeline line draws with scroll
    gsap.to('.tl-line i', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.timeline', start: 'top 70%', end: 'bottom 70%', scrub: true } });

    // Giant footer name
    gsap.fromTo('[data-giant]', { yPercent: 35, letterSpacing: '0.08em' }, { yPercent: 0, letterSpacing: '-0.03em', ease: 'none', scrollTrigger: { trigger: '.contact', start: 'center bottom', end: 'bottom bottom', scrub: true } });

    // Velocity-reactive marquee
    const marquee = document.querySelector('[data-marquee]');
    if (marquee) {
      let x = 0, dir = -1, boost = 0;
      ScrollTrigger.create({
        start: 0, end: 'max',
        onUpdate: self => {
          dir = self.direction === 1 ? -1 : 1;
          boost = Math.min(Math.abs(self.getVelocity()) / 150, 22);
        }
      });
      gsap.ticker.add(() => {
        const half = marquee.scrollWidth / 2;
        x += dir * (0.6 + boost);
        boost *= 0.92;
        if (x <= -half) x += half;
        if (x > 0) x -= half;
        gsap.set(marquee, { x, skewX: -dir * boost * 0.25 });
      });
    }

    // Active nav link (created after the pin so positions include its spacer)
    sections.forEach(sec => ScrollTrigger.create({
      trigger: sec, start: 'top 50%', end: 'bottom 50%',
      onToggle: self => { if (self.isActive) setActive(sec.id); }
    }));
    ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom 50%', onEnter: () => setActive(''), onEnterBack: () => setActive('') });

    if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  } else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        const c = entry.target.querySelector('.about-num[data-target]');
        if (c) animateCount(c);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    document.querySelectorAll('.reveal, .reveal-row').forEach(el => io.observe(el));

    const navIo = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) setActive(entry.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(sec => navIo.observe(sec));
  } else {
    document.querySelectorAll('.reveal, .reveal-row').forEach(el => el.classList.add('in'));
    document.querySelectorAll('.about-num[data-target]').forEach(animateCount);
  }

  // ---------------------------------------------------------------
  // Nav state, back-to-top progress
  // ---------------------------------------------------------------
  const scrollBtn = document.getElementById('scrollTop');
  const scProgress = scrollBtn.querySelector('.sc-progress');
  const CIRC = 144.51;
  let lastY = 0;
  function onScroll(){
    const y = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? Math.min(y / docHeight, 1) : 0;
    scProgress.style.strokeDashoffset = String(CIRC * (1 - pct));
    scrollBtn.classList.toggle('show', y > 600);
    nav.classList.toggle('scrolled', y > 40);
    if (!menuOpen) nav.classList.toggle('hide', y > lastY && y > 400);
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  scrollBtn.addEventListener('click', () => {
    if (lenis) lenis.scrollTo(0, { duration: 1.8 });
    else window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  // ---------------------------------------------------------------
  // Local time in Baybay
  // ---------------------------------------------------------------
  const timeEl = document.getElementById('localTime');
  if (timeEl) {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: false });
    const tick = () => { timeEl.textContent = fmt.format(new Date()); };
    tick();
    setInterval(tick, 30000);
  }

  // ---------------------------------------------------------------
  // Custom cursor + magnetic buttons (fine pointers only)
  // ---------------------------------------------------------------
  if (animate && finePointer) {
    const cursor = document.querySelector('.cursor');
    const dot = cursor.querySelector('.cursor-dot');
    const ring = cursor.querySelector('.cursor-ring');
    const label = cursor.querySelector('.cursor-label');
    const dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
    const dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
    const rx = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3' });
    const ry = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3' });
    window.addEventListener('mousemove', e => { cursor.classList.add('moved'); dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); }, { passive: true });
    document.addEventListener('mouseleave', () => cursor.classList.add('hidden'));
    document.addEventListener('mouseenter', () => cursor.classList.remove('hidden'));
    document.addEventListener('mouseover', e => {
      const t = e.target.closest('a, button, [data-cursor], .ow-row, .sys-card');
      const text = t && t.getAttribute('data-cursor');
      cursor.classList.toggle('hover', !!t && !text);
      cursor.classList.toggle('label', !!text);
      if (text) label.textContent = text;
    });

    document.querySelectorAll('.magnetic').forEach(el => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.3);
        yTo((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
    });
  }

  // ---------------------------------------------------------------
  // Interactive skills keyboard
  // ---------------------------------------------------------------
  const skbBoard = document.getElementById('skbBoard');
  const skbCaption = document.getElementById('skbCaption');
  if (skbBoard && skbCaption) {
    const keyEls = Array.from(skbBoard.querySelectorAll('.key'));
    const keyMap = {};
    keyEls.forEach(k => { keyMap[k.dataset.key.toUpperCase()] = k; });
    let captionTimer = null;

    function pressKey(el){
      el.classList.add('pressed');
      skbCaption.innerHTML = '<span class="who">' + el.dataset.tech + '</span>' + el.dataset.quip;
      skbCaption.classList.add('show');
      clearTimeout(captionTimer);
      captionTimer = setTimeout(() => skbCaption.classList.remove('show'), 1900);
    }
    function releaseKey(el){ el.classList.remove('pressed'); }

    keyEls.forEach(el => {
      el.addEventListener('mousedown', () => pressKey(el));
      el.addEventListener('mouseup', () => releaseKey(el));
      el.addEventListener('mouseleave', () => releaseKey(el));
      el.addEventListener('touchstart', () => pressKey(el), { passive: true });
      el.addEventListener('touchend', () => releaseKey(el));
    });

    window.addEventListener('keydown', e => {
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = keyMap[e.key.toUpperCase()];
      if (el) pressKey(el);
    });
    window.addEventListener('keyup', e => {
      const el = keyMap[e.key.toUpperCase()];
      if (el) releaseKey(el);
    });
  }

  // ---------------------------------------------------------------
  // Copy email
  // ---------------------------------------------------------------
  document.querySelectorAll('.copy-email').forEach(btn => {
    btn.addEventListener('click', async () => {
      const email = btn.dataset.email;
      const toast = btn.querySelector('.copy-toast');
      try {
        await navigator.clipboard.writeText(email);
      } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = email; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (e2) {}
        document.body.removeChild(ta);
      }
      if (toast) {
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 1500);
      }
    });
  });
})();
