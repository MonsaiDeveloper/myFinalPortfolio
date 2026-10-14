(function(){
  const root = document.documentElement;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animate = !!(window.gsap && window.ScrollTrigger) && !reduceMotion;

  if (animate) {
    root.classList.add('has-gsap');
    gsap.registerPlugin(ScrollTrigger);
  }
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
  // Hero intro
  // ---------------------------------------------------------------
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

  function jumpToHash(){
    if (animate) ScrollTrigger.refresh();
    if (location.hash) {
      const t = document.querySelector(location.hash);
      if (t) lenis ? lenis.scrollTo(t, { offset: -70, immediate: true }) : t.scrollIntoView();
    }
  }

  if (animate) {
    let heroChars = [];
    document.querySelectorAll('.hero [data-split="chars"]').forEach(el => { heroChars = heroChars.concat(split(el, 'chars')); });
    gsap.set(heroChars, { yPercent: 115 });
    gsap.set('[data-hero-fade]', { opacity: 0, y: 30 });
    gsap.set(nav, { yPercent: -100, opacity: 0 });

    fontsReady.then(() => {
      gsap.timeline()
        .to(heroChars, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.03 })
        .to(nav, { yPercent: 0, opacity: 1, duration: 1, ease: 'expo.out', clearProps: 'transform,opacity' }, 0.2)
        .to('[data-hero-fade]', { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }, 0.3);
      jumpToHash();
    });
  } else {
    jumpToHash();
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
      skbCaption.innerHTML = '<span class="who">' + el.dataset.tech + '</span>' + (el.dataset.quip || '');
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
