// motion.js - Motion choreographies ported from styleguide.js
// PROTOTYPE, throwaway. Wipe me.
// Plan: MockUI/v4-plan/PLAN.md §2 (Task A10)

(function(global) {
  'use strict';

  // In browser, root is document.documentElement. In Node, fallback gracefully.
  const getRoot = () => (typeof document !== 'undefined' ? document.documentElement : null);

  const css = (name) => {
    const root = getRoot();
    if (!root || typeof getComputedStyle === 'undefined') return '';
    return getComputedStyle(root).getPropertyValue(name).trim();
  };

  const ms = (name) => parseFloat(css(name)) || 0;

  const systemReduced = () => {
    if (typeof matchMedia === 'undefined') return false;
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  const reduced = () => {
    const root = getRoot();
    if (!root) return false;
    return !root.classList.contains('force-motion') && (root.classList.contains('reduce-motion') || systemReduced());
  };

  const dirSign = () => {
    const root = getRoot();
    return root && root.dir === 'rtl' ? -1 : 1;
  };

  const anim = (el, keyframes, opts) => {
    if (!el || typeof el.animate !== 'function') {
      return { finished: Promise.resolve(), cancel: () => {} };
    }
    return el.animate(keyframes, { fill: 'both', ...opts });
  };

  // cubic-bezier(x1, y1, x2, y2) as a function of progress, for animations driven by requestAnimationFrame
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (t) => ((ax * t + bx) * t + cx) * t;
    const sy = (t) => ((ay * t + by) * t + cy) * t;
    const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
      let lo = 0, hi = 1, t = x;
      for (let i = 0; i < 20; i++) {
        const e = sx(t) - x;
        if (Math.abs(e) < 1e-5) break;
        const d = dx(t);
        if (Math.abs(d) > 1e-6) t -= e / d;
        if (t < lo || t > hi) { t = (lo + hi) / 2; }
        if (sx(t) < x) lo = t; else hi = t;
      }
      return sy(Math.min(1, Math.max(0, t)));
    };
  }

  const curve = (token) => {
    const raw = css(token);
    const m = raw.match(/cubic-bezier\(([^)]+)\)/);
    return m ? bezier(...m[1].split(',').map(Number)) : (t) => t;
  };

  const usdFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  // --------------------------------------------------------------------------
  // 1 · Screen transitions (shared X axis)
  // --------------------------------------------------------------------------
  function navigate(fromEl, toEl, isBack, onDone) {
    if (!toEl) return;
    if (!fromEl || fromEl === toEl || reduced()) {
      if (fromEl && fromEl !== toEl) fromEl.hidden = true;
      toEl.hidden = false;
      toEl.style.transform = '';
      toEl.style.opacity = '';
      if (onDone) onDone();
      return;
    }

    if (fromEl.getAnimations) fromEl.getAnimations({ subtree: true }).forEach(a => a.cancel());
    if (toEl.getAnimations) toEl.getAnimations({ subtree: true }).forEach(a => a.cancel());

    toEl.hidden = false;
    const s = dirSign() * (isBack ? -1 : 1);
    const d = ms('--dur-base') || 280;
    const recede = 8;
    const moveScreen = css('--move-screen') || '48px';

    fromEl.style.zIndex = '1';
    toEl.style.zIndex = '2';

    anim(fromEl, [
      { transform: 'translateX(0)', opacity: 1 },
      { transform: `translateX(${-s * recede}%)`, opacity: 0 }
    ], { duration: d * 0.6, easing: css('--ease-exit') || 'ease-in' });

    const a = anim(toEl, [
      { transform: `translateX(calc(${s} * ${moveScreen}))`, opacity: 0 },
      { transform: 'translateX(0)', opacity: 1 }
    ], { duration: d, delay: d * 0.25, easing: css('--ease-enter') || 'ease-out' });

    a.finished.then(() => {
      fromEl.hidden = true;
      fromEl.style.zIndex = '';
      toEl.style.zIndex = '';
      if (onDone) onDone();
    }).catch(() => {});
  }

  // --------------------------------------------------------------------------
  // 2 · Bottom sheet & Scrim
  // --------------------------------------------------------------------------
  function sheet(sheetEl, scrimEl, open, onDone) {
    if (!sheetEl) return;
    if (sheetEl.getAnimations) sheetEl.getAnimations({ subtree: true }).forEach(a => a.cancel());
    if (scrimEl && scrimEl.getAnimations) scrimEl.getAnimations({ subtree: true }).forEach(a => a.cancel());

    const isRed = reduced();
    const move = isRed
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }];

    if (open) {
      if (scrimEl) scrimEl.hidden = false;
      sheetEl.hidden = false;
      if (scrimEl) {
        anim(scrimEl, [{ opacity: 0 }, { opacity: 1 }], {
          duration: ms('--dur-fast') || 150,
          easing: css('--ease-standard') || 'ease'
        });
      }
      const a = anim(sheetEl, move, {
        duration: ms('--dur-spring') || 380,
        easing: css('--ease-spring') || 'cubic-bezier(0.175, 0.885, 0.32, 1.1)'
      });
      a.finished.then(() => { if (onDone) onDone(); }).catch(() => {});
    } else {
      if (scrimEl) {
        anim(scrimEl, [{ opacity: 1 }, { opacity: 0 }], {
          duration: ms('--dur-base') || 280,
          easing: css('--ease-standard') || 'ease'
        });
      }
      const a = anim(sheetEl, [...move].reverse(), {
        duration: (ms('--dur-base') || 280) * 0.8,
        easing: css('--ease-exit') || 'ease-in'
      });
      a.finished.then(() => {
        sheetEl.hidden = true;
        if (scrimEl) scrimEl.hidden = true;
        if (onDone) onDone();
      }).catch(() => {});
    }
  }

  // --------------------------------------------------------------------------
  // 3 · Money count-up
  // --------------------------------------------------------------------------
  function countUp(el, toAmount, onDone, formatFn) {
    if (!el) return;
    const format = formatFn || ((val) => usdFormat.format(val));
    const dur = ms('--dur-showpiece') || 1200;

    if (reduced() || dur <= 1 || typeof requestAnimationFrame === 'undefined') {
      el.textContent = format(toAmount);
      if (onDone) onDone();
      return;
    }

    const ease = curve('--ease-count');
    const t0 = performance.now();

    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      el.textContent = format(Math.round(toAmount * ease(t) * 100) / 100);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = format(toAmount);
        if (onDone) onDone();
      }
    };
    requestAnimationFrame(step);
  }

  // --------------------------------------------------------------------------
  // 4 · Sprout on success (ceremony in 5 beats)
  // --------------------------------------------------------------------------
  function sprout(svgEl, msgEl, onDone) {
    if (!svgEl) return;
    if (svgEl.getAnimations) svgEl.getAnimations({ subtree: true }).forEach(a => a.cancel());
    if (msgEl && msgEl.getAnimations) msgEl.getAnimations().forEach(a => a.cancel());

    const motes = svgEl.querySelector('.motes');
    if (motes) motes.innerHTML = '';

    if (reduced() || (ms('--dur-ceremony') || 2200) <= 1) {
      anim(svgEl, [{ opacity: 0 }, { opacity: 1 }], { duration: 120 });
      if (msgEl) anim(msgEl, [{ opacity: 0 }, { opacity: 1 }], { duration: 120 });
      if (onDone) onDone();
      return;
    }

    const spring = css('--ease-spring') || 'cubic-bezier(0.175, 0.885, 0.32, 1.1)';
    const grow = css('--ease-grow') || 'cubic-bezier(0.34, 1.56, 0.64, 1)';
    const std = css('--ease-standard') || 'cubic-bezier(0.2, 0, 0, 1)';
    const enter = css('--ease-enter') || 'cubic-bezier(0, 0, 0.2, 1)';

    // Beat 1: People scale in
    svgEl.querySelectorAll('.person').forEach(p => {
      const idx = parseFloat(p.dataset.i || '0');
      anim(p, [
        { transform: 'scale(0.2)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1 }
      ], { duration: ms('--dur-spring') || 380, delay: idx * 90, easing: spring });
    });

    // Beat 2: Stem rises
    const stem = svgEl.querySelector('.stem');
    if (stem) {
      anim(stem, [
        { strokeDashoffset: '1px' },
        { strokeDashoffset: '0px' }
      ], { duration: 600, delay: 450, easing: std });
    }

    // Beat 3: Leaves unfurl
    const leafL = svgEl.querySelector('.leaf-sl');
    const leafR = svgEl.querySelector('.leaf-sr');
    const leafC = svgEl.querySelector('.leaf-sc');
    if (leafL) anim(leafL, [{ transform: 'scale(0) rotate(-35deg)' }, { transform: 'scale(1) rotate(0)' }], { duration: 700, delay: 900, easing: grow });
    if (leafR) anim(leafR, [{ transform: 'scale(0) rotate(35deg)' }, { transform: 'scale(1) rotate(0)' }], { duration: 700, delay: 1020, easing: grow });
    if (leafC) anim(leafC, [{ transform: 'translateY(6px) scale(0)' }, { transform: 'translateY(0) scale(1)' }], { duration: 700, delay: 1140, easing: grow });

    // Beat 4: Gold glint & Halo
    svgEl.querySelectorAll('.leaf-s').forEach((l, i) => {
      anim(l, [
        { filter: 'brightness(1)' },
        { filter: 'brightness(1.45)' },
        { filter: 'brightness(1)' }
      ], { duration: 500, delay: 1550 + i * 70, easing: std, fill: 'none' });
    });

    const halo = svgEl.querySelector('.halo');
    if (halo) {
      anim(halo, [
        { transform: 'scale(0.5)', opacity: 0.5 },
        { transform: 'scale(1.7)', opacity: 0 }
      ], { duration: 700, delay: 1500, easing: enter });
    }

    // Beat 5: Motes & Message
    if (motes) {
      for (let i = 0; i < 6; i++) {
        const m = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        m.setAttribute('class', 'mote');
        m.setAttribute('cx', 32 + (i - 2.5) * 4);
        m.setAttribute('cy', 16);
        m.setAttribute('rx', 1.4);
        m.setAttribute('ry', 0.8);
        motes.append(m);
        const dx = (i - 2.5) * 3.2;
        const rot = (i % 2 ? 1 : -1) * (40 + i * 12);
        anim(m, [
          { transform: 'translate(0,0) rotate(0)', opacity: 0 },
          { opacity: 1, offset: 0.25 },
          { transform: `translate(${dx}px, -${16 + (i % 3) * 5}px) rotate(${rot}deg)`, opacity: 0 }
        ], { duration: 900, delay: 1600 + i * 60, easing: std });
      }
    }

    if (msgEl) {
      anim(msgEl, [
        { transform: `translateY(${css('--move-small') || '8px'})`, opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 }
      ], { duration: ms('--dur-slow') || 420, delay: 1700, easing: enter });
    }

    if (onDone) setTimeout(onDone, 2400);
  }

  // --------------------------------------------------------------------------
  // 5 · Route progress
  // --------------------------------------------------------------------------
  function route(svgEl, currentStage = 4, totalStages = 7, onDone) {
    if (!svgEl) return;
    if (svgEl.getAnimations) svgEl.getAnimations({ subtree: true }).forEach(a => a.cancel());

    const g = svgEl.querySelector('.route-g') || svgEl;
    const line = svgEl.querySelector('.route-line');
    const stops = svgEl.querySelector('.route-stops');
    const vessel = svgEl.querySelector('.vessel');
    if (!line || !vessel) return;

    const isRtl = dirSign() === -1;
    g.setAttribute('transform', isRtl ? 'translate(320 0) scale(-1 1)' : '');
    svgEl.querySelectorAll('.route-txt').forEach(t => {
      const origX = parseFloat(t.dataset.x || '0');
      t.setAttribute('x', isRtl ? 320 - origX : origX);
    });

    const len = line.getTotalLength ? line.getTotalLength() : 300;
    const frac = Math.max(0, Math.min(1, (currentStage - 1) / (totalStages - 1)));
    const end = len * (1 - frac);

    line.style.strokeDasharray = `${len}px`;
    line.style.strokeDashoffset = `${end}px`;

    if (stops) {
      stops.innerHTML = '';
      for (let i = 1; i < totalStages - 1; i++) {
        const p = line.getPointAtLength ? line.getPointAtLength((len * i) / (totalStages - 1)) : { x: (300 * i) / (totalStages - 1), y: 40 };
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', p.x);
        c.setAttribute('cy', p.y);
        c.setAttribute('r', '3.4');
        c.setAttribute('class', i < currentStage - 1 ? 'stop' : 'stop todo');
        c.style.transformBox = 'fill-box';
        c.style.transformOrigin = 'center';
        stops.append(c);
      }
    }

    const place = (f) => {
      const p = line.getPointAtLength ? line.getPointAtLength(len * f) : { x: 300 * f, y: 40 };
      vessel.setAttribute('transform', `translate(${p.x} ${p.y})`);
    };

    const D = ms('--dur-showpiece') || 1200;
    if (reduced() || D <= 1 || typeof requestAnimationFrame === 'undefined') {
      place(frac);
      if (onDone) onDone();
      return;
    }

    anim(line, [
      { strokeDashoffset: `${len}px` },
      { strokeDashoffset: `${end}px` }
    ], { duration: D, easing: css('--ease-standard') || 'ease' });

    if (stops) {
      [...stops.children].forEach((c, i) => {
        const f = (i + 1) / (totalStages - 1);
        anim(c, [
          { transform: 'scale(0)' },
          { transform: 'scale(1)' }
        ], {
          duration: ms('--dur-spring') || 380,
          delay: f <= frac ? D * (f / frac) * 0.8 : D + i * (ms('--stagger') || 50),
          easing: css('--ease-spring') || 'cubic-bezier(0.175, 0.885, 0.32, 1.1)'
        });
      });
    }

    const ease = curve('--ease-standard');
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / D);
      place(frac * ease(t));
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        place(frac);
        // Wake pulse 3 times
        vessel.querySelectorAll('.ripple').forEach((r, i) => {
          anim(r, [
            { transform: 'scale(1)', opacity: 0.8 },
            { transform: 'scale(2.6)', opacity: 0 }
          ], {
            duration: 1200,
            delay: i * 400,
            iterations: 3,
            easing: css('--ease-enter') || 'ease-out',
            fill: 'none'
          });
        });
        if (onDone) onDone();
      }
    };

    place(0);
    requestAnimationFrame(step);
  }

  // --------------------------------------------------------------------------
  // 6 · Container doors 3D swing
  // --------------------------------------------------------------------------
  function openDoor(doorEl, open, onDone) {
    if (!doorEl) return;
    if (doorEl.getAnimations) doorEl.getAnimations({ subtree: true }).forEach(a => a.cancel());

    const face = doorEl.querySelector('.door-face');
    const L = doorEl.querySelector('.leaf-l');
    const R = doorEl.querySelector('.leaf-r');
    const inside = doorEl.querySelector('.door-inside');
    const s = dirSign();

    if (reduced()) {
      [L, R, face].forEach(el => {
        if (el) anim(el, [{ opacity: open ? 1 : 0 }, { opacity: open ? 0 : 1 }], { duration: ms('--dur-slow') || 420 });
      });
      if (onDone) onDone();
      return;
    }

    const swing = (el, sign) => [
      { transform: 'rotateY(0deg)' },
      { transform: `rotateY(${sign * 105}deg)` }
    ];

    if (open) {
      if (face) anim(face, [{ opacity: 1 }, { opacity: 0 }], { duration: ms('--dur-fast') || 150, easing: css('--ease-exit') || 'ease-in' });
      if (L) anim(L, swing(L, -s), { duration: ms('--dur-slow') || 420, delay: (ms('--dur-fast') || 150) * 0.6, easing: css('--ease-standard') || 'ease' });
      if (R) anim(R, swing(R, s), { duration: ms('--dur-slow') || 420, delay: (ms('--dur-fast') || 150) * 0.6 + 40, easing: css('--ease-standard') || 'ease' });
      if (inside) anim(inside, [{ filter: 'brightness(0.5)' }, { filter: 'brightness(1.2)' }], { duration: ms('--dur-deliberate') || 600, delay: ms('--dur-fast') || 150, easing: css('--ease-enter') || 'ease-out' });
    } else {
      if (L) anim(L, [...swing(L, -s)].reverse(), { duration: ms('--dur-spring') || 380, easing: css('--ease-spring-soft') || 'ease' });
      if (R) anim(R, [...swing(R, s)].reverse(), { duration: ms('--dur-spring') || 380, delay: 40, easing: css('--ease-spring-soft') || 'ease' });
      if (face) anim(face, [{ opacity: 0 }, { opacity: 1 }], { duration: ms('--dur-fast') || 150, delay: ms('--dur-slow') || 420, easing: css('--ease-standard') || 'ease' });
    }

    if (onDone) setTimeout(onDone, (ms('--dur-slow') || 420) + 100);
  }

  // --------------------------------------------------------------------------
  // 7 · Funding fill & List cascade
  // --------------------------------------------------------------------------
  function fill(barEl, delay = 0) {
    if (!barEl) return;
    const f = parseFloat(barEl.dataset.fill || '1');
    anim(barEl, [
      { transform: 'scaleX(0)' },
      { transform: `scaleX(${f})` }
    ], {
      duration: ms('--dur-deliberate') || 600,
      delay,
      easing: css('--ease-enter') || 'ease-out'
    });

    if (!reduced()) {
      anim(barEl, [
        { opacity: 0 },
        { opacity: 1 },
        { opacity: 0 }
      ], {
        pseudoElement: '::after',
        duration: 600,
        delay: delay + (ms('--dur-deliberate') || 600) * 0.7,
        easing: css('--ease-standard') || 'ease',
        fill: 'none'
      });
    }
  }

  function cascade(containerEl, selector = '.mini, .list-row, .card', onDone) {
    if (!containerEl) return;
    const items = [...containerEl.querySelectorAll(selector)];
    const st = ms('--stagger') || 50;
    const cap = ms('--stagger-max') || 250;
    const isRed = reduced();

    items.forEach((item, i) => {
      const delay = isRed ? 0 : Math.min(i * st, cap);
      if (!isRed) {
        anim(item, [
          { transform: `translateY(${css('--move-small') || '8px'})`, opacity: 0 },
          { transform: 'translateY(0)', opacity: 1 }
        ], {
          duration: ms('--dur-slow') || 420,
          delay,
          easing: css('--ease-enter') || 'ease-out'
        });
      } else {
        item.style.transform = '';
        item.style.opacity = '1';
      }

      const bar = item.querySelector('.fund i, [role="progressbar"] i');
      if (bar) fill(bar, delay + 120);
    });

    if (onDone) setTimeout(onDone, Math.min(items.length * st, cap) + (ms('--dur-slow') || 420));
  }

  // --------------------------------------------------------------------------
  // 8 · Tab bar & Indicator pill
  // --------------------------------------------------------------------------
  function movePill(pillEl, targetIdx, animate = true) {
    if (!pillEl) return;
    const x = `translateX(${dirSign() * targetIdx * 100}%)`;
    if (pillEl.getAnimations) pillEl.getAnimations().forEach(a => a.cancel());

    if (!animate || reduced()) {
      pillEl.style.transform = x;
      return;
    }

    const from = getComputedStyle(pillEl).transform;
    const a = anim(pillEl, [
      { transform: from === 'none' ? 'translateX(0)' : from },
      { transform: x }
    ], {
      duration: ms('--dur-spring') || 380,
      easing: css('--ease-spring') || 'cubic-bezier(0.175, 0.885, 0.32, 1.1)'
    });
    a.finished.then(() => { pillEl.style.transform = x; }).catch(() => {});
  }

  function tab(tabEl, index, onDone) {
    if (!tabEl) return;
    const ico = tabEl.querySelector('.icon, svg');
    if (ico && !reduced()) {
      anim(ico, [
        { transform: 'scale(1)' },
        { transform: 'scale(1.14)' },
        { transform: 'scale(1)' }
      ], {
        duration: ms('--dur-base') || 280,
        easing: css('--ease-standard') || 'ease',
        fill: 'none'
      });
      ico.querySelectorAll('.i2, .i2s').forEach(p => {
        p.style.transformBox = 'fill-box';
        p.style.transformOrigin = 'center';
        anim(p, [
          { transform: 'scale(0.3)' },
          { transform: 'scale(1)' }
        ], {
          duration: ms('--dur-spring') || 380,
          delay: 60,
          easing: css('--ease-spring') || 'cubic-bezier(0.175, 0.885, 0.32, 1.1)',
          fill: 'none'
        });
      });
    }
    if (onDone) onDone();
  }

  // --------------------------------------------------------------------------
  // 9 · Toast notification
  // --------------------------------------------------------------------------
  let toastTimer = null;
  function toast(toastEl, message, durationMs = 2400, onDone) {
    if (!toastEl) return;
    if (toastTimer) clearTimeout(toastTimer);
    if (toastEl.getAnimations) toastEl.getAnimations().forEach(a => a.cancel());

    const msgEl = toastEl.querySelector('.toast-message') || toastEl;
    if (message) msgEl.textContent = message;
    toastEl.hidden = false;

    const isRed = reduced();
    const enterKeyframes = isRed
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [{ transform: 'translateY(calc(100% + 12px))', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }];

    anim(toastEl, enterKeyframes, {
      duration: ms('--dur-spring') || 380,
      easing: css('--ease-spring-soft') || 'ease'
    });

    toastTimer = setTimeout(() => {
      const exitKeyframes = isRed
        ? [{ opacity: 1 }, { opacity: 0 }]
        : [{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(${css('--move-small') || '8px'})`, opacity: 0 }];

      const a = anim(toastEl, exitKeyframes, {
        duration: ms('--dur-base') || 280,
        easing: css('--ease-exit') || 'ease-in'
      });
      a.finished.then(() => {
        toastEl.hidden = true;
        if (onDone) onDone();
      }).catch(() => {});
    }, durationMs);
  }

  // --------------------------------------------------------------------------
  // 10 · FLIP animation (First, Last, Invert, Play) for step board & lists
  // --------------------------------------------------------------------------
  function flip(elements, mutateFn, opts = {}) {
    const list = Array.isArray(elements) ? elements : [...(elements || [])];
    if (!list.length || !mutateFn) {
      if (mutateFn) mutateFn();
      return Promise.resolve();
    }

    if (reduced() || opts.immediate) {
      mutateFn();
      return Promise.resolve();
    }

    // FIRST
    const firstRects = list.map(el => el.getBoundingClientRect());

    // MUTATE DOM
    mutateFn();

    // LAST & INVERT & PLAY
    const duration = opts.duration || ms('--dur-spring') || 380;
    const easing = opts.easing || css('--ease-spring') || 'cubic-bezier(0.175, 0.885, 0.32, 1.1)';
    const promises = [];

    list.forEach((el, i) => {
      const first = firstRects[i];
      const last = el.getBoundingClientRect();
      const deltaX = first.left - last.left;
      const deltaY = first.top - last.top;

      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;

      const a = anim(el, [
        { transform: `translate(${deltaX}px, ${deltaY}px)` },
        { transform: 'none' }
      ], {
        duration,
        easing
      });
      promises.push(a.finished.catch(() => {}));
    });

    return Promise.all(promises);
  }

  // Export module
  const ShehnatMotion = {
    css,
    ms,
    bezier,
    curve,
    reduced,
    systemReduced,
    dirSign,
    navigate,
    sheet,
    countUp,
    sprout,
    route,
    openDoor,
    fill,
    cascade,
    movePill,
    tab,
    toast,
    flip
  };

  global.ShehnatMotion = ShehnatMotion;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShehnatMotion;
  }
})(typeof window !== 'undefined' ? window : global);
