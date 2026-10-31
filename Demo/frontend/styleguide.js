// Styleguide behaviour: specimens built from the live tokens, and the motion lab.
// Every timing and curve is read from tokens.css at run time, so the reduce-motion overrides apply automatically.

const root = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const css = (name) => getComputedStyle(root).getPropertyValue(name).trim();
const ms = (name) => parseFloat(css(name)) || 0;
const systemReduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const reduced = () => !root.classList.contains('force-motion') && (root.classList.contains('reduce-motion') || systemReduced());
const dirSign = () => (root.dir === 'rtl' ? -1 : 1);
const anim = (el, keyframes, opts) => el.animate(keyframes, { fill: 'both', ...opts });
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

// cubic-bezier(x1, y1, x2, y2) as a function of progress, for animations driven by requestAnimationFrame.
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t, sy = (t) => ((ay * t + by) * t + cy) * t, dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 20; i++) { const e = sx(t) - x; if (Math.abs(e) < 1e-5) break; const d = dx(t); if (Math.abs(d) > 1e-6) t -= e / d; if (t < lo || t > hi) { t = (lo + hi) / 2; } if (sx(t) < x) lo = t; else hi = t; }
    return sy(Math.min(1, Math.max(0, t)));
  };
}
const curve = (token) => { const m = css(token).match(/cubic-bezier\(([^)]+)\)/); return m ? bezier(...m[1].split(',').map(Number)) : (t) => t; };

// ---------- Contrast (WCAG 2.x) ----------
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const grade = (r) => (r >= 4.5 ? ['AA text', 'sw-pass'] : r >= 3 ? ['large text / UI', 'sw-pass'] : ['surface or decoration', 'sw-fail']);

function buildSwatches() {
  const sand = css('--sand-100');
  for (const box of $$('[data-swatches]')) {
    const on = box.dataset.on;
    box.innerHTML = box.dataset.swatches.split(' ').map((name) => {
      const hex = css(name).toUpperCase();
      const ink = ratio('#FFFFFF', hex) >= ratio(css('--ink-900'), hex) ? '#FFFFFF' : css('--ink-900');
      const rows = on
        ? [[`white text`, ratio(on, hex)]]
        : [['as text on white', ratio(hex, '#FFFFFF')], ['on sand', ratio(hex, sand)]];
      return `<div class="sw"><div class="sw-chip" style="background:${hex};color:${ink}">Aa</div><div class="sw-meta"><b>${name}</b><span>${hex}</span>${rows.map(([l, r]) => { const [g, c] = grade(r); return `<span>${l} ${r.toFixed(2)} · <span class="${c}">${g}</span></span>`; }).join('')}</div></div>`;
    }).join('');
  }
  for (const box of $$('[data-spaces]')) {
    box.innerHTML = box.dataset.spaces.split(' ').map((n) => `<div class="space"><i style="width:${css(n)}"></i><span>${n} · ${css(n)}</span></div>`).join('');
  }
}

// ---------- Icons: duotone, 24px. i1 = primary layer, i2 = gold layer, i2s = gold stroke ----------
const ICONS = {
  home: '<path class="i1" d="M3.5 10.2 12 3.5l8.5 6.7v9.3a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6.5h-5V21H5a1.5 1.5 0 0 1-1.5-1.5Z"/><path class="i2" d="M9.5 14.5h5V21h-5z"/>',
  shipments: '<path class="i1" d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5Z"/><path class="i2" d="M6 9h1.6v7H6zM9.8 9h1.6v7H9.8zM13.6 9h1.6v7h-1.6zM17.4 9H19v7h-1.6z"/>',
  wallet: '<path class="i1" d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a1 1 0 0 1 1 1v2h.5A1.5 1.5 0 0 1 21 9.5v9a1.5 1.5 0 0 1-1.5 1.5h-14A2.5 2.5 0 0 1 3 17.5Z"/><path class="i2" d="M15.5 11.5H21v4h-5.5a2 2 0 0 1 0-4Z"/>',
  invest: '<circle class="i1" cx="10" cy="14" r="7"/><path class="i2" d="M15.5 9.5c0-3.6 2.4-6 6.5-6.5 0 4-2.4 6.4-6.5 6.5Z"/><path class="i2" d="M8.8 10.5h2.4v7H8.8z"/>',
  profile: '<circle class="i2" cx="12" cy="7.5" r="4"/><path class="i1" d="M4 20.5c0-4.1 3.6-7 8-7s8 2.9 8 7a.5.5 0 0 1-.5.5h-15a.5.5 0 0 1-.5-.5Z"/>',
  alerts: '<path class="i1" d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.6 2a.6.6 0 0 1-.5 1H4.9a.6.6 0 0 1-.5-1Z"/><path class="i2" d="M9.8 20.5h4.4a2.2 2.2 0 0 1-4.4 0Z"/>',
  documents: '<path class="i1" d="M6 2.5h8l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1Z"/><path class="i2" d="M14 2.5v5h5ZM8 12h8v1.6H8zM8 15.5h6v1.6H8z"/>',
  review: '<path class="i1" d="M12 2.5 20 5.5v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6Z"/><path class="i2s" d="m8.5 12 2.5 2.5 4.5-5"/>',
  done: '<circle class="i1" cx="12" cy="12" r="9.5"/><path class="i2s" d="m7.5 12.3 3 3 6-6.3"/>',
  warning: '<path class="i1" d="M10.7 3.8a1.5 1.5 0 0 1 2.6 0l8.3 14.7a1.5 1.5 0 0 1-1.3 2.2H3.7a1.5 1.5 0 0 1-1.3-2.2Z"/><path class="i2" d="M11 9h2v5.5h-2zM11 16h2v2h-2z"/>',
  route: '<circle class="i1" cx="12" cy="12" r="9.5"/><path class="i2s" d="M2.5 12h19M12 2.5c2.6 2.8 3.8 6 3.8 9.5s-1.2 6.7-3.8 9.5c-2.6-2.8-3.8-6-3.8-9.5S9.4 5.3 12 2.5Z"/>',
  'goods: crate': '<path class="i1" d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7Z"/><path class="i2" d="M12 12 20.5 7 12 2.5 3.5 7Z"/>',
  'goods: grain': '<path class="i2s" d="M12 21V9"/><path class="i1" d="M12 9c-3-1-4.5-3.5-4-7 3 .8 4.5 3.3 4 7Zm0 0c3-1 4.5-3.5 4-7-3 .8-4.5 3.3-4 7Zm0 5c-3-1-5-3.5-5-6.5 3 .5 5 3 5 6.5Zm0 0c3-1 5-3.5 5-6.5-3 .5-5 3-5 6.5Z"/>',
  'goods: textiles': '<rect class="i1" x="5" y="3" width="14" height="3" rx="1"/><rect class="i1" x="5" y="18" width="14" height="3" rx="1"/><path class="i2" d="M7 6h10v12H7z"/>',
};
const icon = (name) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

function buildIcons() {
  $('#iconGrid').innerHTML = Object.keys(ICONS).map((n) => `<div class="icon-tile"><div class="row">${icon(n)}<span class="muted-ico">${icon(n)}</span></div><span>${n}</span></div>`).join('');
}

// ---------- 1 · Screen transitions (shared X axis) ----------
let navOn = 'a';
function navigate(next, back) {
  const ph = $('#phoneNav');
  if (navOn === next) return;
  const from = $(`.scr-${navOn}`, ph), to = $(`.scr-${next}`, ph);
  ph.getAnimations({ subtree: true }).forEach((a) => a.cancel());
  to.hidden = false;
  const s = dirSign() * (back ? -1 : 1), d = ms('--dur-base'), recede = reduced() ? 0 : 8;
  from.style.zIndex = 1; to.style.zIndex = 2;
  anim(from, [{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${-s * recede}%)`, opacity: 0 }], { duration: d * 0.6, easing: css('--ease-exit') });
  const a = anim(to, [{ transform: `translateX(calc(${s} * ${css('--move-screen')}))`, opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], { duration: d, delay: d * 0.25, easing: css('--ease-enter') });
  navOn = next;
  a.finished.then(() => { from.hidden = true; }).catch(() => {});
}

// ---------- 2 · Bottom sheet ----------
function sheet() {
  const ph = $('#phoneSheet'), scrim = $('.p-scrim', ph), sh = $('.p-sheet', ph);
  const opening = sh.hidden;
  ph.getAnimations({ subtree: true }).forEach((a) => a.cancel());
  const move = reduced() ? [{ opacity: 0 }, { opacity: 1 }] : [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }];
  if (opening) {
    scrim.hidden = sh.hidden = false;
    anim(scrim, [{ opacity: 0 }, { opacity: 1 }], { duration: ms('--dur-fast'), easing: css('--ease-standard') });
    anim(sh, move, { duration: ms('--dur-spring'), easing: css('--ease-spring') });
  } else {
    anim(scrim, [{ opacity: 1 }, { opacity: 0 }], { duration: ms('--dur-base'), easing: css('--ease-standard') });
    anim(sh, [...move].reverse(), { duration: ms('--dur-base') * 0.8, easing: css('--ease-exit') }).finished.then(() => { scrim.hidden = sh.hidden = true; }).catch(() => {});
  }
}

// ---------- 3 · Money count-up ----------
function countUp(el, to, done) {
  const dur = ms('--dur-showpiece');
  if (reduced() || dur <= 1) { el.textContent = usd.format(to); done?.(); return; }
  const ease = curve('--ease-count'), t0 = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - t0) / dur);
    el.textContent = usd.format(Math.round(to * ease(t) * 100) / 100);
    if (t < 1) requestAnimationFrame(step); else done?.();
  };
  requestAnimationFrame(step);
}
function count() {
  const chip = $('#countChip');
  chip.hidden = true;
  if (!reduced()) $('#countVal').textContent = usd.format(0);
  countUp($('#countVal'), 12480.5, () => {
    chip.hidden = false;
    anim(chip, [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: ms('--dur-spring'), easing: css('--ease-spring-soft') });
  });
}

// ---------- 4 · Sprout on success: a 2.2s ceremony in five beats ----------
function sprout() {
  const svg = $('.sprout'), msg = $('.sprout-msg'), motes = $('.motes', svg);
  svg.getAnimations({ subtree: true }).forEach((a) => a.cancel());
  msg.getAnimations().forEach((a) => a.cancel());
  motes.innerHTML = '';
  if (reduced() || ms('--dur-ceremony') <= 1) {
    anim(svg, [{ opacity: 0 }, { opacity: 1 }], { duration: 120 });
    anim(msg, [{ opacity: 0 }, { opacity: 1 }], { duration: 120 });
    return;
  }
  const spring = css('--ease-spring'), grow = css('--ease-grow'), std = css('--ease-standard');
  // Beat 1 (0–800ms): the five people join the ring one by one, bottom first, then outward.
  $$('.person', svg).forEach((p) => anim(p, [{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: ms('--dur-spring'), delay: +p.dataset.i * 90, easing: spring }));
  // Beat 2 (450–1050ms): the stem rises from the ground.
  anim($('.stem', svg), [{ strokeDashoffset: '1px' }, { strokeDashoffset: '0px' }], { duration: 600, delay: 450, easing: std });
  // Beat 3 (900–1840ms): the leaves unfurl, left, right, then the centre leaf lifts.
  anim($('.leaf-sl', svg), [{ transform: 'scale(0) rotate(-35deg)' }, { transform: 'scale(1) rotate(0)' }], { duration: 700, delay: 900, easing: grow });
  anim($('.leaf-sr', svg), [{ transform: 'scale(0) rotate(35deg)' }, { transform: 'scale(1) rotate(0)' }], { duration: 700, delay: 1020, easing: grow });
  anim($('.leaf-sc', svg), [{ transform: 'translateY(6px) scale(0)' }, { transform: 'translateY(0) scale(1)' }], { duration: 700, delay: 1140, easing: grow });
  // Beat 4 (1550–2250ms): a gold glint passes over the leaves and a halo breathes out.
  $$('.leaf-s', svg).forEach((l, i) => anim(l, [{ filter: 'brightness(1)' }, { filter: 'brightness(1.45)' }, { filter: 'brightness(1)' }], { duration: 500, delay: 1550 + i * 70, easing: std, fill: 'none' }));
  anim($('.halo', svg), [{ transform: 'scale(.5)', opacity: 0.5 }, { transform: 'scale(1.7)', opacity: 0 }], { duration: 700, delay: 1500, easing: css('--ease-enter') });
  // Beat 5 (1600–2500ms): six gold motes drift up and fade; the message rises in.
  for (let i = 0; i < 6; i++) {
    const m = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    Object.entries({ class: 'mote', cx: 32 + (i - 2.5) * 4, cy: 16, rx: 1.4, ry: 0.8 }).forEach(([k, v]) => m.setAttribute(k, v));
    motes.append(m);
    const dx = (i - 2.5) * 3.2, rot = (i % 2 ? 1 : -1) * (40 + i * 12);
    anim(m, [{ transform: 'translate(0,0) rotate(0)', opacity: 0 }, { opacity: 1, offset: 0.25 }, { transform: `translate(${dx}px,-${16 + (i % 3) * 5}px) rotate(${rot}deg)`, opacity: 0 }], { duration: 900, delay: 1600 + i * 60, easing: std });
  }
  anim(msg, [{ transform: `translateY(${css('--move-small')})`, opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: ms('--dur-slow'), delay: 1700, easing: css('--ease-enter') });
}

// ---------- 5 · Route progress ----------
const ROUTE = { stages: 7, current: 4 };   // stage 4 of 7: at sea
function route() {
  const svg = $('.route'), g = $('.route-g', svg), line = $('.route-line', svg), stops = $('.route-stops', svg), vessel = $('.vessel', svg);
  svg.getAnimations({ subtree: true }).forEach((a) => a.cancel());
  // Right-to-left: the journey runs from the reading start, so mirror the drawing (not the labels).
  const rtl = root.dir === 'rtl';
  g.setAttribute('transform', rtl ? 'translate(320 0) scale(-1 1)' : '');
  $$('.route-txt', svg).forEach((t) => t.setAttribute('x', rtl ? 320 - +t.dataset.x : t.dataset.x));
  const len = line.getTotalLength(), frac = (ROUTE.current - 1) / (ROUTE.stages - 1), end = len * (1 - frac);
  line.style.strokeDasharray = `${len}px`;
  line.style.strokeDashoffset = `${end}px`;
  stops.innerHTML = '';
  const dots = [];
  for (let i = 1; i < ROUTE.stages - 1; i++) {
    const p = line.getPointAtLength((len * i) / (ROUTE.stages - 1));
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    Object.entries({ cx: p.x, cy: p.y, r: 3.4, class: i < ROUTE.current - 1 ? 'stop' : 'stop todo' }).forEach(([k, v]) => c.setAttribute(k, v));
    c.style.transformBox = 'fill-box'; c.style.transformOrigin = 'center';
    stops.append(c); dots.push([c, i / (ROUTE.stages - 1)]);
  }
  const place = (f) => { const p = line.getPointAtLength(len * f); vessel.setAttribute('transform', `translate(${p.x} ${p.y})`); };
  const D = ms('--dur-showpiece');
  if (reduced() || D <= 1) { place(frac); return; }
  // The line draws to the vessel; stops pop as the line reaches them; stops still ahead pop after.
  anim(line, [{ strokeDashoffset: `${len}px` }, { strokeDashoffset: `${end}px` }], { duration: D, easing: css('--ease-standard') });
  dots.forEach(([c, f], i) => anim(c, [{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: ms('--dur-spring'), delay: f <= frac ? D * (f / frac) * 0.8 : D + i * ms('--stagger'), easing: css('--ease-spring') }));
  const ease = curve('--ease-standard'), t0 = performance.now();
  const step = (now) => { const t = Math.min(1, (now - t0) / D); place(frac * ease(t)); if (t < 1) requestAnimationFrame(step); else wake(); };
  place(0); requestAnimationFrame(step);
  // The wake pulses three times, then the vessel rests.
  const wake = () => $$('.ripple', vessel).forEach((r, i) => anim(r, [{ transform: 'scale(1)', opacity: 0.8 }, { transform: 'scale(2.6)', opacity: 0 }], { duration: 1200, delay: i * 400, iterations: 3, easing: css('--ease-enter'), fill: 'none' }));
}

// ---------- 6 · Container doors ----------
let doorOpen = false;
function openDoor() {
  const d = $('.ship .door'), face = $('.door-face', d), L = $('.leaf-l', d), R = $('.leaf-r', d), inside = $('.door-inside', d);
  d.getAnimations({ subtree: true }).forEach((a) => a.cancel());
  doorOpen = !doorOpen;
  const s = dirSign();
  if (reduced()) {
    [L, R, face].forEach((el) => anim(el, [{ opacity: doorOpen ? 1 : 0 }, { opacity: doorOpen ? 0 : 1 }], { duration: ms('--dur-slow') }));
    return;
  }
  const swing = (el, sign) => [{ transform: 'rotateY(0deg)' }, { transform: `rotateY(${sign * 105}deg)` }];
  if (doorOpen) {
    anim(face, [{ opacity: 1 }, { opacity: 0 }], { duration: ms('--dur-fast'), easing: css('--ease-exit') });
    anim(L, swing(L, -s), { duration: ms('--dur-slow'), delay: ms('--dur-fast') * 0.6, easing: css('--ease-standard') });
    anim(R, swing(R, s), { duration: ms('--dur-slow'), delay: ms('--dur-fast') * 0.6 + 40, easing: css('--ease-standard') });
    anim(inside, [{ filter: 'brightness(.5)' }, { filter: 'brightness(1.2)' }], { duration: ms('--dur-deliberate'), delay: ms('--dur-fast'), easing: css('--ease-enter') });
  } else {
    anim(L, [...swing(L, -s)].reverse(), { duration: ms('--dur-spring'), easing: css('--ease-spring-soft') });
    anim(R, [...swing(R, s)].reverse(), { duration: ms('--dur-spring'), delay: 40, easing: css('--ease-spring-soft') });
    anim(face, [{ opacity: 0 }, { opacity: 1 }], { duration: ms('--dur-fast'), delay: ms('--dur-slow'), easing: css('--ease-standard') });
  }
}

// ---------- 7 · List cascade and funding fill ----------
function fill(bar, delay) {
  const f = +bar.dataset.fill;
  anim(bar, [{ transform: 'scaleX(0)' }, { transform: `scaleX(${f})` }], { duration: ms('--dur-deliberate'), delay, easing: css('--ease-enter') });
  if (!reduced()) anim(bar, [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { pseudoElement: '::after', duration: 600, delay: delay + ms('--dur-deliberate') * 0.7, easing: css('--ease-standard'), fill: 'none' });
}
function cascade() {
  const st = ms('--stagger'), cap = ms('--stagger-max');
  $$('#cascade .mini').forEach((m, i) => {
    const delay = Math.min(i * st, cap);
    anim(m, [{ transform: `translateY(${css('--move-small')})`, opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: ms('--dur-slow'), delay, easing: css('--ease-enter') });
    fill($('.fund i', m), delay + 120);
  });
}

// ---------- 8 · Tab bar ----------
const TABS = [['home', 'Home'], ['shipments', 'Shipments'], ['wallet', 'Wallet'], ['profile', 'Profile']];
let tabOn = 0;
function buildTabs() {
  const bar = $('#phoneTabs .tabbar');
  bar.insertAdjacentHTML('beforeend', TABS.map(([ic, label], i) => `<button class="tab" data-act="tab" data-arg="${i}"${i === tabOn ? ' aria-current="page"' : ''}>${icon(ic)}<span>${label}</span></button>`).join(''));
  movePill(false);
}
function movePill(animate) {
  const pill = $('#phoneTabs .tab-pill'), x = `translateX(${dirSign() * tabOn * 100}%)`;
  const from = getComputedStyle(pill).transform;
  pill.getAnimations().forEach((a) => a.cancel());
  if (!animate) { pill.style.transform = x; return; }
  anim(pill, [{ transform: from === 'none' ? 'translateX(0)' : from }, { transform: x }], { duration: ms('--dur-spring'), easing: css('--ease-spring') }).finished.then(() => { pill.style.transform = x; }).catch(() => {});
}
function tab(el) {
  const i = +el.dataset.arg;
  if (i === tabOn) return;
  tabOn = i;
  $$('#phoneTabs .tab').forEach((t, n) => (n === i ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current')));
  movePill(true);
  const ico = $('.ico', el);
  anim(ico, [{ transform: 'scale(1)' }, { transform: 'scale(1.14)' }, { transform: 'scale(1)' }], { duration: ms('--dur-base'), easing: css('--ease-standard'), fill: 'none' });
  $$('.i2, .i2s', ico).forEach((p) => { p.style.transformBox = 'fill-box'; p.style.transformOrigin = 'center'; anim(p, [{ transform: 'scale(.3)' }, { transform: 'scale(1)' }], { duration: ms('--dur-spring'), delay: 60, easing: css('--ease-spring'), fill: 'none' }); });
  const title = $('#tabTitle');
  title.textContent = TABS[i][1];
  anim(title, [{ opacity: 0, transform: `translateY(${css('--move-small')})` }, { opacity: 1, transform: 'translateY(0)' }], { duration: ms('--dur-base'), easing: css('--ease-enter'), fill: 'none' });
}

// ---------- 9 · Toast ----------
let toastTimer;
function toast() {
  const t = $('#phoneToast .p-toast');
  clearTimeout(toastTimer);
  t.getAnimations().forEach((a) => a.cancel());
  t.hidden = false;
  anim(t, [{ transform: reduced() ? 'none' : 'translateY(calc(100% + 12px))', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: ms('--dur-spring'), easing: css('--ease-spring-soft') });
  toastTimer = setTimeout(() => {
    anim(t, [{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(${css('--move-small')})`, opacity: 0 }], { duration: ms('--dur-base'), easing: css('--ease-exit') }).finished.then(() => { t.hidden = true; }).catch(() => {});
  }, 2400);
}

// ---------- Toggles ----------
function rtl(el) {
  root.dir = root.dir === 'rtl' ? 'ltr' : 'rtl';
  el.setAttribute('aria-pressed', root.dir === 'rtl');
  movePill(false); route();
}
// Motion preview cycles: follow the device setting → force full motion → force reduced motion.
const MOTION = ['system', 'full', 'reduced'];
let motion = 0;
function motionLabel(el) { el.textContent = `Motion: ${MOTION[motion]}${MOTION[motion] === 'system' ? (systemReduced() ? ' (reduced)' : ' (full)') : ''}`; }
function reduce(el) {
  motion = (motion + 1) % MOTION.length;
  root.classList.toggle('force-motion', MOTION[motion] === 'full');
  root.classList.toggle('reduce-motion', MOTION[motion] === 'reduced');
  motionLabel(el);
}
motionLabel($('[data-act="reduce"]'));

const acts = { navFwd: () => navigate('b', false), navBack: () => navigate('a', true), sheet, count, sprout, route, openDoor, cascade, tab, toast, rtl, reduce };
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (el && acts[el.dataset.act]) acts[el.dataset.act](el);
});
document.addEventListener('keydown', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.tagName === 'BUTTON' || (e.key !== 'Enter' && e.key !== ' ')) return;
  e.preventDefault();
  acts[el.dataset.act]?.(el);
});
$('#phoneSheet .p-scrim').addEventListener('click', sheet);

// ---------- Boot: build specimens, then play each showpiece once when it scrolls into view ----------
buildSwatches();
buildIcons();
buildTabs();
$$('.fund i').forEach((b) => b.style.setProperty('--f', b.dataset.fill));
route();
const once = new Map([['.count-panel', count], ['.sprout-stage', sprout], ['.route', route], ['#cascade', cascade], ['.ship .fund', () => fill($('.ship .fund i'), 0)]]);
const io = new IntersectionObserver((entries) => {
  for (const en of entries) {
    if (!en.isIntersecting) continue;
    io.unobserve(en.target);
    for (const [sel, fn] of once) if (en.target.matches(sel)) fn();
  }
}, { threshold: 0.5 });
for (const sel of once.keys()) io.observe($(sel));
