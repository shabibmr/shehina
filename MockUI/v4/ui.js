// ui.js - Router, screen registry, rendering helpers, components, and duotone icons
// PROTOTYPE, throwaway. Wipe me.
// Plan: MockUI/v4-plan/PLAN.md §2 (Task A11)

(function(global) {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. Duotone Icons Map (ported from styleguide.js and DESIGN-SYSTEM §2)
  // --------------------------------------------------------------------------
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
    building: '<path class="i1" d="M3 21h18M5 21V7l7-4 7 4v14"/><path class="i2" d="M9 10h2v3H9zm4 0h2v3h-2zm-4 5h2v3H9zm4 0h2v3h-2z"/>',
    energy: '<path class="i1" d="M13 2 4 14h7l-2 8 11-12h-7z"/><path class="i2" d="M11 10h4l-2 4h-2z"/>',
    queue: '<path class="i1" d="M4 6h16M4 12h16M4 18h16"/><circle class="i2" cx="2" cy="6" r="1.5"/><circle class="i2" cx="2" cy="12" r="1.5"/><circle class="i2" cx="2" cy="18" r="1.5"/>',
    listings: '<rect class="i1" x="3" y="4" width="18" height="16" rx="2"/><path class="i2" d="M7 8h10M7 12h10M7 16h6"/>',
    money: '<circle class="i1" cx="12" cy="12" r="9.5"/><path class="i2" d="M12 6v12M15 9.5a2.5 2.5 0 0 0-5 0c0 3 5 2 5 5a2.5 2.5 0 0 1-5 0"/>',
    team: '<path class="i1" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle class="i2" cx="9" cy="7" r="4"/><path class="i1" d="M22 21v-2a4 4 0 0 0-3-3.87"/><path class="i2" d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    clock: '<circle class="i1" cx="12" cy="12" r="9.5"/><polyline class="i2" points="12 6 12 12 16 14"/>',
    arrow: '<path class="i1" d="M5 12h14M12 5l7 7-7 7"/>',
    chevron: '<polyline class="i1" points="9 18 15 12 9 6"/>',
    cross: '<path class="i1" d="M18 6 6 18M6 6l12 12"/>',
    upload: '<path class="i1" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline class="i2" points="17 8 12 3 7 8"/><line class="i2" x1="12" y1="3" x2="12" y2="15"/>',
    plus: '<line class="i1" x1="12" y1="5" x2="12" y2="19"/><line class="i1" x1="5" y1="12" x2="19" y2="12"/>',
    filter: '<polygon class="i1" points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    lock: '<rect class="i1" x="3" y="11" width="18" height="11" rx="2" ry="2"/><path class="i2" d="M7 11V7a5 5 0 0 1 10 0v4"/>'
  };

  function icon(name, cls = '') {
    const raw = ICONS[name] || ICONS['goods: crate'];
    return `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${raw}</svg>`;
  }

  // --------------------------------------------------------------------------
  // 2. Door Colors & Category Map (DESIGN-SYSTEM §2 & §4)
  // --------------------------------------------------------------------------
  const DOOR_COLORS = ['green', 'gold', 'clay', 'olive', 'teal', 'umber'];

  function getDoorColor(id) {
    if (!id) return 'var(--door-green)';
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
    return `var(--door-${DOOR_COLORS[Math.abs(hash) % DOOR_COLORS.length]})`;
  }

  function getCategoryIcon(cat) {
    const c = (cat || '').toLowerCase();
    if (c.includes('food') || c.includes('spice') || c.includes('grain')) return 'goods: grain';
    if (c.includes('textile') || c.includes('cotton')) return 'goods: textiles';
    if (c.includes('building') || c.includes('timber') || c.includes('material')) return 'building';
    if (c.includes('energy') || c.includes('oil') || c.includes('fuel')) return 'energy';
    return 'goods: crate';
  }

  // --------------------------------------------------------------------------
  // 3. Formatting & UI Component Generators
  // --------------------------------------------------------------------------
  const usdFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  function formatMoney(cents) {
    return usdFormat.format((cents || 0) / 100);
  }

  function moneySpan(cents, opts = {}) {
    const formatted = formatMoney(cents);
    if (opts.realizedGain) {
      return `<span class="money num gain-text" aria-label="Gain of ${formatted}">+${formatted} <span aria-hidden="true">&#9650;</span> <small>Gain</small></span>`;
    }
    if (opts.realizedLoss) {
      return `<span class="money num loss-text" aria-label="Loss of ${formatted}">&minus;${formatted} <span aria-hidden="true">&#9660;</span> <small>Loss</small></span>`;
    }
    if (opts.expected) {
      return `<span class="money num" aria-label="Expected ${formatted}">${formatted} <small class="text-muted">(expected)</small></span>`;
    }
    return `<span class="money num">${formatted}</span>`;
  }

  function renderChip(status, label) {
    const s = (status || '').toLowerCase().replace(/\s+/g, '_');
    const txt = label || status;
    return `<span class="chip chip-${s}">${txt}</span>`;
  }

  function renderBanner(type, title, message, actionHtml = '') {
    const iconName = type === 'loss' ? 'warning' : type === 'warning' ? 'warning' : type === 'gain' ? 'done' : 'review';
    return `
      <div class="banner banner-${type}" role="${type === 'loss' || type === 'warning' ? 'alert' : 'status'}">
        <div class="banner-icon">${icon(iconName)}</div>
        <div class="banner-body">
          ${title ? `<strong class="banner-title">${title}</strong>` : ''}
          <div class="banner-message">${message}</div>
          ${actionHtml ? `<div class="banner-action">${actionHtml}</div>` : ''}
        </div>
      </div>
    `;
  }

  function renderFundingBar(fundedCents, targetCents, options = {}) {
    const pct = targetCents > 0 ? Math.min(100, Math.round((fundedCents / targetCents) * 100)) : 0;
    const fraction = (pct / 100).toFixed(2);
    return `
      <div class="fund-container ${options.className || ''}">
        <div class="fund-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Funded ${pct}%">
          <i style="--f:${fraction};transform:scaleX(${fraction})" data-fill="${fraction}"></i>
        </div>
        ${options.showLabel ? `<div class="fund-meta"><span class="num">${pct}% funded</span><span class="num">${formatMoney(targetCents - fundedCents)} left</span></div>` : ''}
      </div>
    `;
  }

  function renderEmptyState(iconName, message, actionBtnHtml = '') {
    return `
      <div class="empty-state">
        <div class="empty-icon">${icon(iconName || 'goods: crate')}</div>
        <p class="empty-msg">${message}</p>
        ${actionBtnHtml ? `<div class="empty-action">${actionBtnHtml}</div>` : ''}
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // 4. Router & Back Stack
  // --------------------------------------------------------------------------
  const screens = {};
  const historyStack = [];
  let currentRoute = '';
  let activeParams = {};

  function registerScreen(pathPattern, definition) {
    screens[pathPattern] = typeof definition === 'function' ? { render: definition } : definition;
  }

  function matchRoute(hashPath) {
    const cleanPath = (hashPath || '').replace(/^#\/?/, '').replace(/\/+$/, '');
    const segments = cleanPath ? cleanPath.split('/') : [''];

    for (const [pattern, config] of Object.entries(screens)) {
      const patClean = pattern.replace(/^#\/?/, '').replace(/\/+$/, '');
      const patSegments = patClean ? patClean.split('/') : [''];

      if (segments.length !== patSegments.length) continue;

      const params = {};
      let match = true;
      for (let i = 0; i < patSegments.length; i++) {
        if (patSegments[i].startsWith(':')) {
          params[patSegments[i].slice(1)] = decodeURIComponent(segments[i]);
        } else if (patSegments[i] !== segments[i]) {
          match = false;
          break;
        }
      }
      if (match) return { pattern, config, params };
    }
    return null;
  }

  function getActivePersona() {
    if (!window.ShehnatStore) return null;
    return window.ShehnatStore.getActivePersona();
  }

  // --------------------------------------------------------------------------
  // 5. Look Management & Navigation Bar
  // --------------------------------------------------------------------------
  function updateLookAndNav(persona, routeConfig, hashPath) {
    const stage = document.getElementById('stage');
    const phone = document.getElementById('phoneWrapper');
    const appHeader = document.getElementById('appHeader');
    const appTabbar = document.getElementById('appTabbar');
    const appSidebar = document.getElementById('appSidebar');
    const walletPill = document.getElementById('headerWallet');
    const walletVal = document.getElementById('headerWalletVal');
    const headerTitle = document.getElementById('headerTitle');
    const headerLockup = document.getElementById('headerLockup');

    const role = (persona && persona.role) ? persona.role : 'visitor';
    const isInvestor = role === 'investor';
    const isManager = role === 'manager';
    const isStaff = role.startsWith('staff');
    const isGlass = isInvestor || isManager;

    // Apply look classes
    if (stage) stage.classList.toggle('glass-look', isGlass);
    if (phone) phone.classList.toggle('glassy', isGlass);

    // Wallet pill in header
    if (walletPill && walletVal) {
      if (isGlass && persona && persona.wallet) {
        walletPill.hidden = false;
        walletVal.textContent = formatMoney(persona.wallet.availableCents);
      } else {
        walletPill.hidden = true;
      }
    }

    // Hide header/nav if requested
    if (routeConfig.hideHeader) {
      if (appHeader) appHeader.hidden = true;
    } else {
      if (appHeader) appHeader.hidden = false;
      if (headerTitle && routeConfig.title) {
        headerTitle.textContent = routeConfig.title;
        headerTitle.hidden = false;
      } else if (headerTitle) {
        headerTitle.hidden = true;
      }
    }

    // Tab bar vs Floating Glass Nav vs Sidebar
    if (routeConfig.hideNav || role === 'visitor') {
      if (appTabbar) appTabbar.hidden = true;
      if (appSidebar) appSidebar.hidden = true;
      return;
    }

    if (isStaff) {
      // Staff uses Flat Console look
      if (appTabbar) {
        appTabbar.hidden = false;
        appTabbar.className = 'app-tabbar';
        appTabbar.innerHTML = `
          <div class="tabbar-track">
            <a href="#/staff/queue" class="tab ${hashPath.includes('queue') ? 'active' : ''}" aria-label="Review Queue">
              ${icon('queue')}<span>Queue</span>
            </a>
            <a href="#/staff/listings" class="tab ${hashPath.includes('listings') ? 'active' : ''}" aria-label="All Listings">
              ${icon('listings')}<span>Listings</span>
            </a>
            <a href="#/staff/money" class="tab ${hashPath.includes('money') ? 'active' : ''}" aria-label="Money & Treasury">
              ${icon('money')}<span>Money</span>
            </a>
            <a href="#/staff/team" class="tab ${hashPath.includes('team') ? 'active' : ''}" aria-label="Team">
              ${icon('team')}<span>${role === 'staff:owner' ? 'Team' : 'More'}</span>
            </a>
          </div>
        `;
      }
      if (appSidebar) {
        // App sidebar visible on desktop
        appSidebar.hidden = false;
        appSidebar.querySelectorAll('.sidebar-nav-item').forEach(link => {
          const href = link.getAttribute('href') || '';
          link.classList.toggle('active', hashPath.startsWith(href));
        });
      }
    } else if (isInvestor) {
      // Investor Floating Glass Nav
      if (appSidebar) appSidebar.hidden = true;
      if (appTabbar) {
        appTabbar.hidden = false;
        appTabbar.className = 'floating-glass-nav glass';
        appTabbar.innerHTML = `
          <a href="#/investor/home" class="nav-item ${hashPath.includes('home') || hashPath === '#/' ? 'active' : ''}">
            ${icon('home')}<span>Home</span>
          </a>
          <a href="#/investor/shipments" class="nav-item ${hashPath.includes('shipments') ? 'active' : ''}">
            ${icon('shipments')}<span>Shipments</span>
          </a>
          <a href="#/investor/wallet" class="nav-item ${hashPath.includes('wallet') ? 'active' : ''}">
            ${icon('wallet')}<span>Wallet</span>
          </a>
          <a href="#/investor/profile" class="nav-item ${hashPath.includes('profile') ? 'active' : ''}">
            ${icon('profile')}<span>Profile</span>
          </a>
        `;
      }
    } else if (isManager) {
      // Manager Floating Glass Nav
      if (appSidebar) appSidebar.hidden = true;
      if (appTabbar) {
        appTabbar.hidden = false;
        appTabbar.className = 'floating-glass-nav glass';
        appTabbar.innerHTML = `
          <a href="#/manager/home" class="nav-item ${hashPath.includes('home') || hashPath === '#/' ? 'active' : ''}">
            ${icon('home')}<span>Home</span>
          </a>
          <a href="#/manager/listings" class="nav-item ${hashPath.includes('listings') ? 'active' : ''}">
            ${icon('shipments')}<span>My Listings</span>
          </a>
          <a href="#/manager/wallet" class="nav-item ${hashPath.includes('wallet') ? 'active' : ''}">
            ${icon('wallet')}<span>Wallet</span>
          </a>
          <a href="#/manager/profile" class="nav-item ${hashPath.includes('profile') ? 'active' : ''}">
            ${icon('profile')}<span>Profile</span>
          </a>
        `;
      }
    }
  }

  // --------------------------------------------------------------------------
  // 6. Navigation Execution & Transitions
  // --------------------------------------------------------------------------
  let navigating = false;

  function navigateTo(hash, isBack = false) {
    if (navigating) return;
    const targetHash = hash || '#/';
    const match = matchRoute(targetHash);
    const host = document.getElementById('screenHost');
    if (!host) return;

    const persona = getActivePersona();
    const role = persona ? persona.role : 'visitor';

    // Fallback: If route not found or root, decide default based on role
    if (!match || targetHash === '#/' || targetHash === '') {
      if (role === 'investor') {
        window.location.hash = '#/investor/home';
        return;
      } else if (role === 'manager') {
        window.location.hash = '#/manager/home';
        return;
      } else if (role.startsWith('staff')) {
        window.location.hash = '#/staff/queue';
        return;
      } else {
        window.location.hash = '#/welcome';
        return;
      }
    }

    const { config, params } = match;

    // Role Guard Check
    if (config.role) {
      const allowed = Array.isArray(config.role) ? config.role : [config.role];
      const hasAccess = allowed.some(r => r === role || (r === 'staff' && role.startsWith('staff')));
      if (!hasAccess) {
        showToast(`Access restricted to ${allowed.join(', ')}`);
        return;
      }
    }

    // KYC Guard Check
    if (config.kycRequired && persona && persona.kyc !== 'approved') {
      // Show KYC gate banner or redirect to KYC status
      console.warn('KYC required for this route. Current KYC:', persona.kyc);
    }

    // Update history stack
    if (!isBack && currentRoute && currentRoute !== targetHash) {
      historyStack.push(currentRoute);
    }
    currentRoute = targetHash;
    activeParams = params;

    // Update Back Button in Header
    const btnBack = document.getElementById('btnBack');
    const isRootTab = targetHash.includes('/home') || targetHash.includes('/queue') || targetHash === '#/welcome';
    if (btnBack) {
      btnBack.hidden = historyStack.length === 0 || isRootTab;
    }

    // Update Look & Navigation
    updateLookAndNav(persona, config, targetHash);

    // Prepare transition elements
    const oldScreen = host.firstElementChild;
    const newScreen = document.createElement('div');
    newScreen.className = 'screen-view';
    newScreen.setAttribute('role', 'region');
    newScreen.setAttribute('aria-label', config.title || 'Screen');

    navigating = true;

    // Render screen content
    const state = window.ShehnatStore ? window.ShehnatStore.getState() : {};
    const useSkeleton = state.skeletonDelay !== false && config.skeleton;

    if (useSkeleton) {
      newScreen.innerHTML = config.skeleton();
      host.appendChild(newScreen);
      if (window.ShehnatMotion) {
        window.ShehnatMotion.navigate(oldScreen, newScreen, isBack);
      } else {
        if (oldScreen) oldScreen.remove();
      }

      setTimeout(() => {
        newScreen.innerHTML = '';
        config.render(newScreen, params, state, persona);
        if (window.ShehnatMotion) window.ShehnatMotion.cascade(newScreen);
        if (oldScreen && oldScreen.parentNode) oldScreen.remove();
        navigating = false;
      }, 400);
    } else {
      config.render(newScreen, params, state, persona);
      host.appendChild(newScreen);
      if (window.ShehnatMotion && oldScreen) {
        window.ShehnatMotion.navigate(oldScreen, newScreen, isBack, () => {
          if (oldScreen && oldScreen.parentNode) oldScreen.remove();
          navigating = false;
        });
      } else {
        if (oldScreen) oldScreen.remove();
        navigating = false;
      }
    }
  }

  function back() {
    if (historyStack.length > 0) {
      const prev = historyStack.pop();
      navigateTo(prev, true);
    } else {
      const p = getActivePersona();
      if (p && p.role === 'investor') navigateTo('#/investor/home', true);
      else if (p && p.role === 'manager') navigateTo('#/manager/home', true);
      else if (p && p.role.startsWith('staff')) navigateTo('#/staff/queue', true);
      else navigateTo('#/welcome', true);
    }
  }

  // --------------------------------------------------------------------------
  // 7. Sheets, Confirm Dialogs & Mock Gateway
  // --------------------------------------------------------------------------
  let sheetCloseCallback = null;

  function openSheet(opts = {}) {
    const layer = document.getElementById('sheetLayer');
    const scrim = document.getElementById('scrim');
    const sheetEl = document.getElementById('sheet');
    const titleEl = document.getElementById('sheetTitle');
    const bodyEl = document.getElementById('sheetBody');
    const actionsEl = document.getElementById('sheetActions');
    if (!layer || !sheetEl) return;

    if (titleEl) titleEl.textContent = opts.title || '';
    if (bodyEl) bodyEl.innerHTML = opts.bodyHtml || '';

    if (actionsEl) {
      actionsEl.innerHTML = '';
      if (opts.confirmText !== false) {
        const btnConfirm = document.createElement('button');
        btnConfirm.className = `btn ${opts.isDanger ? 'btn-danger' : 'btn-primary'}`;
        btnConfirm.textContent = opts.confirmText || 'Confirm';
        btnConfirm.onclick = () => {
          if (opts.onConfirm) opts.onConfirm();
          closeSheet();
        };
        actionsEl.appendChild(btnConfirm);
      }
      if (opts.cancelText !== false) {
        const btnCancel = document.createElement('button');
        btnCancel.className = 'btn btn-secondary';
        btnCancel.textContent = opts.cancelText || 'Cancel';
        btnCancel.onclick = () => {
          if (opts.onCancel) opts.onCancel();
          closeSheet();
        };
        actionsEl.appendChild(btnCancel);
      }
    }

    sheetCloseCallback = opts.onCancel || null;
    layer.hidden = false;

    if (window.ShehnatMotion) {
      window.ShehnatMotion.sheet(sheetEl, scrim, true);
    }
  }

  function closeSheet() {
    const layer = document.getElementById('sheetLayer');
    const scrim = document.getElementById('scrim');
    const sheetEl = document.getElementById('sheet');
    if (!layer || !sheetEl) return;

    if (window.ShehnatMotion) {
      window.ShehnatMotion.sheet(sheetEl, scrim, false, () => {
        layer.hidden = true;
      });
    } else {
      layer.hidden = true;
    }
    if (sheetCloseCallback) {
      sheetCloseCallback();
      sheetCloseCallback = null;
    }
  }

  function openConfirmSheet(opts = {}) {
    const reasonFieldHtml = opts.reasonPrompt ? `
      <div class="field" style="margin-block-start:var(--sp-3)">
        <label for="confirmReason" class="label">${opts.reasonPrompt}</label>
        <textarea id="confirmReason" class="input" rows="2" placeholder="Required reason or notes..."></textarea>
      </div>
    ` : '';

    openSheet({
      title: opts.title || 'Confirm Action',
      bodyHtml: `
        <p style="margin:0;color:var(--text);font-size:var(--fs-14)">${opts.message || 'Are you sure you wish to proceed?'}</p>
        ${reasonFieldHtml}
      `,
      confirmText: opts.confirmText || 'Confirm',
      isDanger: opts.isDanger || false,
      onConfirm: () => {
        const reason = opts.reasonPrompt ? (document.getElementById('confirmReason')?.value || '') : '';
        if (opts.onConfirm) opts.onConfirm(reason);
      },
      onCancel: opts.onCancel
    });
  }

  function openGatewaySheet(opts = {}) {
    const amountFormatted = formatMoney(opts.amountCents || 0);
    openSheet({
      title: 'Payment Gateway (Mock)',
      bodyHtml: `
        <div style="text-align:center;padding-block:var(--sp-3);display:flex;flex-direction:column;gap:var(--sp-3)">
          <div style="font-size:var(--fs-12);color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em">Simulated External Checkout</div>
          <div style="font-size:var(--fs-34);font-weight:var(--fw-medium);color:var(--text)" class="num">${amountFormatted}</div>
          <p style="font-size:var(--fs-14);color:var(--text-muted);margin:0">
            This sheet simulates the third-party debit card / bank gateway. You may simulate a successful authorization or a payment failure.
          </p>
        </div>
      `,
      confirmText: `Authorize ${amountFormatted}`,
      cancelText: 'Simulate Decline / Fail',
      isDanger: false,
      onConfirm: () => {
        if (opts.onPaid) opts.onPaid();
      },
      onCancel: () => {
        if (opts.onFailed) opts.onFailed();
      }
    });
  }

  // --------------------------------------------------------------------------
  // 8. Toasts
  // --------------------------------------------------------------------------
  function showToast(message, duration = 2400) {
    const toastEl = document.getElementById('toast');
    if (!toastEl) return;
    if (window.ShehnatMotion) {
      window.ShehnatMotion.toast(toastEl, message, duration);
    } else {
      const msgEl = document.getElementById('toastMsg') || toastEl;
      msgEl.textContent = message;
      toastEl.hidden = false;
      setTimeout(() => { toastEl.hidden = true; }, duration);
    }
  }

  // --------------------------------------------------------------------------
  // 9. Initialisation & Global Listeners
  // --------------------------------------------------------------------------
  function init() {
    window.addEventListener('hashchange', () => {
      navigateTo(window.location.hash);
    });

    const btnBack = document.getElementById('btnBack');
    if (btnBack) {
      btnBack.addEventListener('click', back);
    }

    const scrim = document.getElementById('scrim');
    const sheetClose = document.getElementById('sheetClose');
    if (scrim) scrim.addEventListener('click', closeSheet);
    if (sheetClose) sheetClose.addEventListener('click', closeSheet);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const layer = document.getElementById('sheetLayer');
        if (layer && !layer.hidden) closeSheet();
      }
    });
  }

  // Export module
  const ShehnatUI = {
    ICONS,
    icon,
    DOOR_COLORS,
    getDoorColor,
    getCategoryIcon,
    formatMoney,
    moneySpan,
    renderChip,
    renderBanner,
    renderFundingBar,
    renderEmptyState,
    registerScreen,
    matchRoute,
    navigateTo,
    back,
    openSheet,
    closeSheet,
    openConfirmSheet,
    openGatewaySheet,
    showToast,
    init,
    get currentRoute() { return currentRoute; },
    get activeParams() { return activeParams; }
  };

  global.ShehnatUI = ShehnatUI;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShehnatUI;
  }
})(typeof window !== 'undefined' ? window : global);
