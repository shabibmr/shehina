// screens-public.js - P1–P8 screens: Splash, Welcome, Sign In, Create Account, Forgot Password, Notifications, Profile, Risk & Legal
// PROTOTYPE, throwaway. Wipe me.
// Plan: MockUI/v4-plan/PLAN.md §5 (Milestone B)

(function(global) {
  'use strict';

  const UI = global.ShehnatUI;
  const Store = global.ShehnatStore;
  const Logic = global.ShehnatLogic;
  const Motion = global.ShehnatMotion;

  if (!UI) {
    console.error('ShehnatUI module not loaded before screens-public.js');
    return;
  }

  // ==========================================================================
  // P1: Splash Screen (#/splash)
  // ==========================================================================
  UI.registerScreen('#/splash', {
    title: '',
    hideHeader: true,
    hideNav: true,
    render(container) {
      container.innerHTML = `
        <div class="splash-screen" style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:75vh;text-align:center;padding:var(--sp-4);">
          <div class="splash-logo-wrap" style="animation:fadeIn 0.8s var(--ease-enter) both;">
            <img src="../../Demo/frontend/brand/logo-full.png" alt="Shehnat Trade Financing" style="max-width:240px;height:auto;filter:drop-shadow(0 8px 24px rgb(3 37 26 / 0.15));">
          </div>
          <p style="margin-block-start:var(--sp-4);color:var(--text-muted);font-size:var(--fs-14);font-weight:500;">
            Asset-Backed Maritime Trade Finance
          </p>
          <div style="margin-block-start:var(--sp-6);">
            <a href="#/welcome" class="btn btn-primary" style="min-width:180px;">Enter Prototype</a>
          </div>
        </div>
      `;

      // Auto-advance if not clicked within 1.8s
      const timer = setTimeout(() => {
        if (window.location.hash === '#/splash') {
          window.location.hash = '#/welcome';
        }
      }, 1800);
      container._cleanup = () => clearTimeout(timer);
    }
  });

  // ==========================================================================
  // P2: Welcome Walkthrough (#/welcome)
  // ==========================================================================
  UI.registerScreen('#/welcome', {
    title: 'Welcome to Shehnat',
    hideHeader: true,
    hideNav: true,
    render(container) {
      let currentSlide = 0;
      const slides = [
        {
          tag: 'ASSET-BACKED TRADE',
          title: 'Direct investment in real containerized trade shipments',
          desc: 'Finance verified international cargo purchases with established buyers and full physical asset backing.'
        },
        {
          tag: 'STEP-BY-STEP TRACKING',
          title: 'Verified milestones from departure to delivery',
          desc: 'Every voyage is monitored across 7 distinct stages, from packing and loading to customs release and port arrival.'
        },
        {
          tag: 'PRO-RATA SETTLEMENTS',
          title: 'Transparent profit share credited to your digital wallet',
          desc: 'Upon buyer receipt and payment, audited settlements are divided down to the cent with zero compound interest.'
        }
      ];

      function renderWalkthrough() {
        const slide = slides[currentSlide];
        container.innerHTML = `
          <div class="welcome-screen" style="display:flex;flex-direction:column;min-height:85vh;padding:var(--sp-4);justify-content:space-between;">
            <!-- Top bar -->
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <img src="../../Demo/frontend/brand/mark.svg" alt="" width="28" height="28">
              <a href="#/signin" class="btn btn-ghost" style="font-size:var(--fs-14);">Skip</a>
            </div>

            <!-- Slide Content Card -->
            <div class="card" style="padding:var(--sp-6);text-align:center;display:flex;flex-direction:column;gap:var(--sp-3);margin-block:var(--sp-4);">
              <span class="chip" style="align-self:center;font-size:11px;letter-spacing:0.06em;">${slide.tag}</span>
              <h1 style="font-size:var(--fs-28);line-height:var(--lh-tight);color:var(--text);margin:0;">${slide.title}</h1>
              <p style="color:var(--text-muted);font-size:var(--fs-16);margin:0;line-height:1.4;">${slide.desc}</p>
            </div>

            <!-- Stepper Dots -->
            <div style="display:flex;justify-content:center;gap:var(--sp-2);margin-block-end:var(--sp-4);">
              ${slides.map((_, i) => `
                <button type="button" class="stepper-dot" data-slide="${i}" style="width:10px;height:10px;border-radius:50%;border:0;background:${i === currentSlide ? 'var(--action)' : 'var(--border-input)'};padding:0;cursor:pointer;" aria-label="Slide ${i + 1}"></button>
              `).join('')}
            </div>

            <!-- Action buttons -->
            <div style="display:flex;flex-direction:column;gap:var(--sp-2);">
              <a href="#/signup" class="btn btn-primary" style="width:100%;min-height:52px;">Create an Account</a>
              <a href="#/signin" class="btn btn-secondary" style="width:100%;min-height:52px;">Sign In</a>
            </div>
          </div>
        `;

        container.querySelectorAll('.stepper-dot').forEach(btn => {
          btn.addEventListener('click', (e) => {
            currentSlide = parseInt(e.target.dataset.slide, 10);
            renderWalkthrough();
          });
        });
      }

      renderWalkthrough();
    }
  });

  // ==========================================================================
  // P3: Sign In (#/signin)
  // ==========================================================================
  UI.registerScreen('#/signin', {
    title: 'Sign In',
    hideNav: true,
    render(container) {
      container.innerHTML = `
        <div class="signin-screen" style="display:flex;flex-direction:column;gap:var(--sp-4);padding:var(--sp-4);max-width:440px;margin:0 auto;">
          <div style="text-align:center;margin-block-end:var(--sp-2);">
            <img src="../../Demo/frontend/brand/mark.svg" alt="" width="40" height="40">
            <h1 style="font-size:var(--fs-28);margin-block:var(--sp-2) 0;color:var(--text);">Sign in to Shehnat</h1>
            <p style="color:var(--text-muted);font-size:var(--fs-14);margin:0;">Access your trade investments and listings</p>
          </div>

          <div id="signinAlert"></div>

          <!-- Quick Persona Pickers for rapid prototype evaluation -->
          <div class="card" style="padding:var(--sp-3);background:var(--surface-sunken);">
            <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-block-end:var(--sp-2);">
              Demo Quick Sign In (PLAN §4)
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:var(--sp-1);">
              <button class="btn btn-secondary btn-sm" data-fill="aisha">Aisha (Investor UAE)</button>
              <button class="btn btn-secondary btn-sm" data-fill="ben">Ben (Investor UK)</button>
              <button class="btn btn-secondary btn-sm" data-fill="kerala">Kerala (Manager IN)</button>
              <button class="btn btn-secondary btn-sm" data-fill="sam">Sam (Staff Ops)</button>
              <button class="btn btn-secondary btn-sm" data-fill="hadi">Hadi (Staff Owner)</button>
            </div>
          </div>

          <!-- Form -->
          <form id="signinForm" style="display:flex;flex-direction:column;gap:var(--sp-3);">
            <div class="field">
              <label for="signinEmail" class="label">Email Address</label>
              <input type="email" id="signinEmail" class="input" placeholder="name@domain.com" required value="aisha@shehnat.ae">
            </div>

            <div class="field">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <label for="signinPassword" class="label">Password</label>
                <a href="#/forgot-password" style="font-size:var(--fs-12);color:var(--action);text-decoration:none;">Forgot password?</a>
              </div>
              <input type="password" id="signinPassword" class="input" placeholder="Enter password" required value="demo123">
              <small class="helper-text" style="color:var(--text-muted)">Default demo password is demo123</small>
            </div>

            <button type="submit" class="btn btn-primary" style="min-height:50px;margin-block-start:var(--sp-2);">
              Sign In
            </button>
          </form>

          <div style="text-align:center;color:var(--text-muted);font-size:var(--fs-14);margin-block-start:var(--sp-2);">
            Don't have an account? <a href="#/signup" style="color:var(--action);font-weight:600;text-decoration:none;">Create account</a>
          </div>
        </div>
      `;

      // Quick fill buttons
      container.querySelectorAll('[data-fill]').forEach(btn => {
        btn.addEventListener('click', () => {
          const personaId = btn.dataset.fill;
          const p = Store.getState().personas.find(x => x.id === personaId);
          if (p) {
            document.getElementById('signinEmail').value = p.email || `${p.id}@shehnat.com`;
            document.getElementById('signinPassword').value = 'demo123';
          }
        });
      });

      // Submit handler
      const form = container.querySelector('#signinForm');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('signinEmail').value.trim();
        const pwd = document.getElementById('signinPassword').value;
        const alertEl = document.getElementById('signinAlert');

        const state = Store.getState();
        const now = state.simulatedDate ? new Date(state.simulatedDate).getTime() : Date.now();

        // 1. Check Lockout (5 wrong attempts -> 15 min lockout)
        const lockouts = state.lockouts || {};
        if (lockouts[email] && lockouts[email] > now) {
          const minsLeft = Math.ceil((lockouts[email] - now) / 60000);
          alertEl.innerHTML = UI.renderBanner('loss', 'Account Temporarily Locked', `Too many failed attempts. Locked for ${minsLeft} more simulated minutes.`);
          return;
        }

        // 2. Lookup persona
        const persona = state.personas.find(p => (p.email && p.email.toLowerCase() === email.toLowerCase()) || p.id === email);
        const validPwd = (persona && persona.password) ? persona.password : 'demo123';

        if (persona && pwd === validPwd) {
          // Success
          Store.setState(s => {
            if (!s.failedAttempts) s.failedAttempts = {};
            delete s.failedAttempts[email];
            s.activePersonaId = persona.id;
            s.auditLog.unshift({
              ts: s.simulatedDate,
              actor: persona.name,
              action: 'SIGN_IN_SUCCESS',
              details: `User signed in from ${persona.country || 'AE'}`
            });
            return s;
          });

          UI.showToast(`Welcome back, ${persona.name}`);

          // Route by role
          if (persona.role === 'investor') {
            window.location.hash = '#/investor/home';
          } else if (persona.role === 'manager') {
            window.location.hash = '#/manager/home';
          } else if (persona.role.startsWith('staff')) {
            window.location.hash = '#/staff/queue';
          }
        } else {
          // Failed attempt tracking
          Store.setState(s => {
            if (!s.failedAttempts) s.failedAttempts = {};
            s.failedAttempts[email] = (s.failedAttempts[email] || 0) + 1;
            const attempts = s.failedAttempts[email];

            if (attempts >= 5) {
              if (!s.lockouts) s.lockouts = {};
              s.lockouts[email] = now + 15 * 60 * 1000; // 15 min
              s.auditLog.unshift({
                ts: s.simulatedDate,
                actor: 'SYSTEM',
                action: 'ACCOUNT_LOCKED',
                details: `5 failed login attempts for ${email}. Locked for 15m.`
              });
            }
            return s;
          });

          const attempts = (Store.getState().failedAttempts[email] || 1);
          if (attempts >= 5) {
            alertEl.innerHTML = UI.renderBanner('loss', 'Account Locked', '5 failed login attempts. Locked for 15 simulated minutes.');
          } else {
            alertEl.innerHTML = UI.renderBanner('warning', 'Invalid Credentials', `Incorrect password. Attempt ${attempts} of 5 before 15-minute lockout.`);
          }
        }
      });
    }
  });

  // ==========================================================================
  // P4: Create Account (#/signup)
  // ==========================================================================
  UI.registerScreen('#/signup', {
    title: 'Create Account',
    hideNav: true,
    render(container) {
      container.innerHTML = `
        <div class="signup-screen" style="display:flex;flex-direction:column;gap:var(--sp-4);padding:var(--sp-4);max-width:440px;margin:0 auto;">
          <div style="text-align:center;">
            <h1 style="font-size:var(--fs-28);margin:0;color:var(--text);">Create Your Account</h1>
            <p style="color:var(--text-muted);font-size:var(--fs-14);margin-block-start:var(--sp-1);">Join Shehnat trade finance platform</p>
          </div>

          <div id="signupAlert"></div>

          <form id="signupForm" style="display:flex;flex-direction:column;gap:var(--sp-3);">
            <!-- Role Selection (BR §2: Account is either investor or manager, never both) -->
            <div class="field">
              <label class="label">Account Type</label>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2);">
                <label style="border:1px solid var(--border);border-radius:var(--r-md);padding:var(--sp-3);display:flex;align-items:center;gap:var(--sp-2);cursor:pointer;background:var(--surface);">
                  <input type="radio" name="accountRole" value="investor" checked>
                  <div>
                    <strong style="display:block;font-size:var(--fs-14);">Investor</strong>
                    <small style="color:var(--text-muted);font-size:11px;">Finance shipments</small>
                  </div>
                </label>
                <label style="border:1px solid var(--border);border-radius:var(--r-md);padding:var(--sp-3);display:flex;align-items:center;gap:var(--sp-2);cursor:pointer;background:var(--surface);">
                  <input type="radio" name="accountRole" value="manager">
                  <div>
                    <strong style="display:block;font-size:var(--fs-14);">Manager</strong>
                    <small style="color:var(--text-muted);font-size:11px;">List cargo trade</small>
                  </div>
                </label>
              </div>
            </div>

            <!-- Full Name -->
            <div class="field">
              <label for="signupName" class="label">Full Legal Name</label>
              <input type="text" id="signupName" class="input" placeholder="e.g. Tariq Mansoor" required>
            </div>

            <!-- Email -->
            <div class="field">
              <label for="signupEmail" class="label">Email Address</label>
              <input type="email" id="signupEmail" class="input" placeholder="tariq@example.com" required>
            </div>

            <!-- DOB (18+ rule via Logic.validateDOB) -->
            <div class="field">
              <label for="signupDOB" class="label">Date of Birth (Must be 18+)</label>
              <input type="date" id="signupDOB" class="input" required value="1995-04-12">
            </div>

            <!-- Phone (international format +7..15 digits) -->
            <div class="field">
              <label for="signupPhone" class="label">Mobile Phone (with country code)</label>
              <input type="tel" id="signupPhone" class="input" placeholder="+971501234567" required value="+971501234567">
              <small class="helper-text" style="color:var(--text-muted)">Must start with + followed by 7 to 15 digits</small>
            </div>

            <!-- Country (Blocked list validation) -->
            <div class="field">
              <label for="signupCountry" class="label">Country of Residence</label>
              <select id="signupCountry" class="select" required>
                <option value="AE" selected>United Arab Emirates (AE)</option>
                <option value="SA">Saudi Arabia (SA)</option>
                <option value="QA">Qatar (QA)</option>
                <option value="GB">United Kingdom (GB)</option>
                <option value="SG">Singapore (SG)</option>
                <option value="IN">India (IN)</option>
                <option value="CL">Chile (CL)</option>
                <option value="IR">Iran (IR - Blocked)</option>
                <option value="KP">North Korea (KP - Blocked)</option>
                <option value="SY">Syria (SY - Blocked)</option>
              </select>
            </div>

            <!-- Password -->
            <div class="field">
              <label for="signupPassword" class="label">Password</label>
              <input type="password" id="signupPassword" class="input" placeholder="Create strong password" required value="Shehnat2026!">
              <small class="helper-text" style="color:var(--text-muted)">Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number</small>
            </div>

            <!-- Legal Agreement -->
            <label style="display:flex;gap:var(--sp-2);align-items:start;font-size:var(--fs-12);color:var(--text-muted);cursor:pointer;">
              <input type="checkbox" id="signupTerms" required checked style="margin-block-start:2px;">
              <span>I confirm that I am investing or managing funds on my own behalf and agree to the <a href="#/legal" target="_blank" style="color:var(--action)">Risk Disclosure &amp; Platform Terms</a>.</span>
            </label>

            <button type="submit" class="btn btn-primary" style="min-height:50px;margin-block-start:var(--sp-2);">
              Create Account
            </button>
          </form>

          <div style="text-align:center;color:var(--text-muted);font-size:var(--fs-14);">
            Already have an account? <a href="#/signin" style="color:var(--action);font-weight:600;text-decoration:none;">Sign in</a>
          </div>
        </div>
      `;

      const form = container.querySelector('#signupForm');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const alertEl = document.getElementById('signupAlert');
        const role = form.querySelector('input[name="accountRole"]:checked').value;
        const name = document.getElementById('signupName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const dob = document.getElementById('signupDOB').value;
        const phone = document.getElementById('signupPhone').value.trim();
        const country = document.getElementById('signupCountry').value;
        const pwd = document.getElementById('signupPassword').value;

        // Validation 1: Blocked country
        if (Logic.isCountryBlocked(country)) {
          alertEl.innerHTML = UI.renderBanner('loss', 'Country Restricted', `Residents of ${country} cannot register due to international compliance sanctions.`);
          return;
        }

        // Validation 2: DOB 18+
        const dobErr = Logic.validateDOB(dob);
        if (dobErr) {
          alertEl.innerHTML = UI.renderBanner('loss', 'Age Requirement', dobErr);
          return;
        }

        // Validation 3: Phone
        const phoneErr = Logic.validatePhone(phone);
        if (phoneErr) {
          alertEl.innerHTML = UI.renderBanner('loss', 'Invalid Phone', phoneErr);
          return;
        }

        // Validation 4: Password strength
        const pwdErr = Logic.validatePassword(pwd);
        if (pwdErr) {
          alertEl.innerHTML = UI.renderBanner('loss', 'Weak Password', pwdErr);
          return;
        }

        // Create new persona
        const newId = 'usr_' + Date.now().toString(36);
        const newPersona = {
          id: newId,
          name,
          email,
          role,
          country,
          phone,
          dob,
          password: pwd,
          kyc: 'none',
          wallet: {
            availableCents: 0,
            holdCents: 0
          }
        };

        Store.setState(s => {
          s.personas.push(newPersona);
          s.accounts.wallets[newId] = 0;
          s.activePersonaId = newId;
          s.auditLog.unshift({
            ts: s.simulatedDate,
            actor: name,
            action: 'ACCOUNT_CREATED',
            details: `Registered as ${role} from ${country}`
          });
          return s;
        });

        UI.showToast(`Account created! Welcome, ${name}`);
        if (role === 'investor') {
          window.location.hash = '#/investor/home';
        } else {
          window.location.hash = '#/manager/home';
        }
      });
    }
  });

  // ==========================================================================
  // P5: Forgot Password (#/forgot-password)
  // ==========================================================================
  UI.registerScreen('#/forgot-password', {
    title: 'Reset Password',
    hideNav: true,
    render(container) {
      container.innerHTML = `
        <div class="forgot-screen" style="display:flex;flex-direction:column;gap:var(--sp-4);padding:var(--sp-4);max-width:440px;margin:0 auto;">
          <h1 style="font-size:var(--fs-28);margin:0;color:var(--text);">Reset Password</h1>
          <p style="color:var(--text-muted);font-size:var(--fs-14);margin:0;">
            Enter your email to receive a simulated reset code.
          </p>

          <div id="forgotAlert"></div>

          <form id="forgotForm" style="display:flex;flex-direction:column;gap:var(--sp-3);">
            <div class="field">
              <label for="forgotEmail" class="label">Email Address</label>
              <input type="email" id="forgotEmail" class="input" placeholder="name@domain.com" required value="aisha@shehnat.ae">
            </div>

            <div id="otpSection" hidden style="display:flex;flex-direction:column;gap:var(--sp-3);">
              <div class="field">
                <label for="otpCode" class="label">Verification Code (Demo: 1234)</label>
                <input type="text" id="otpCode" class="input" placeholder="1234" value="1234">
              </div>
              <div class="field">
                <label for="newPassword" class="label">New Password</label>
                <input type="password" id="newPassword" class="input" placeholder="Enter new password" value="ShehnatNew1!">
              </div>
            </div>

            <button type="submit" id="btnForgotSubmit" class="btn btn-primary" style="min-height:50px;">
              Send Reset Code
            </button>
          </form>

          <div style="text-align:center;">
            <a href="#/signin" class="btn btn-ghost" style="font-size:var(--fs-14);">Back to Sign In</a>
          </div>
        </div>
      `;

      let step = 1;
      const form = container.querySelector('#forgotForm');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const alertEl = document.getElementById('forgotAlert');
        const email = document.getElementById('forgotEmail').value.trim();

        if (step === 1) {
          step = 2;
          document.getElementById('otpSection').hidden = false;
          document.getElementById('btnForgotSubmit').textContent = 'Confirm New Password';
          alertEl.innerHTML = UI.renderBanner('info', 'Reset Code Sent', `A verification code was simulated for ${email}. Enter code 1234 below.`);
        } else {
          const newPwd = document.getElementById('newPassword').value;
          const pwdRes = Logic.validatePassword(newPwd);
          if (!pwdRes.valid) {
            alertEl.innerHTML = UI.renderBanner('loss', 'Weak Password', pwdRes.error);
            return;
          }

          Store.setState(s => {
            const p = s.personas.find(x => x.email === email || x.id === email);
            if (p) p.password = newPwd;
            s.auditLog.unshift({
              ts: s.simulatedDate,
              actor: email,
              action: 'PASSWORD_RESET',
              details: 'Password updated via verification code'
            });
            return s;
          });

          UI.showToast('Password reset successfully! Please sign in.');
          window.location.hash = '#/signin';
        }
      });
    }
  });

  // ==========================================================================
  // P6: Notifications Feed (#/notifications)
  // ==========================================================================
  UI.registerScreen('#/notifications', {
    title: 'Notifications',
    render(container) {
      const state = Store.getState();
      const persona = Store.getActivePersona();
      const logs = (state.auditLog || []).slice(0, 15);

      container.innerHTML = `
        <div class="notifications-screen" style="display:flex;flex-direction:column;gap:var(--sp-3);padding:var(--sp-4);">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <h2 style="font-size:var(--fs-22);margin:0;color:var(--text);">Recent Alerts</h2>
            <button class="btn btn-ghost btn-sm" id="btnMarkRead">Mark all read</button>
          </div>

          <div style="display:flex;flex-direction:column;gap:var(--sp-2);">
            ${logs.length ? logs.map(a => {
              const isUrgent = a.action.includes('LOCKED') || a.action.includes('REJECTED') || a.action.includes('OVERDUE');
              const iconType = isUrgent ? 'warning' : a.action.includes('PROFIT') || a.action.includes('CONFIRMED') ? 'done' : 'documents';
              return `
                <div class="card" style="padding:var(--sp-3);display:flex;gap:var(--sp-3);align-items:start;">
                  <div style="width:36px;height:36px;border-radius:50%;background:${isUrgent ? 'var(--loss-bg)' : 'var(--surface-sunken)'};color:${isUrgent ? 'var(--loss)' : 'var(--action)'};display:grid;place-items:center;flex:none;">
                    ${UI.icon(iconType)}
                  </div>
                  <div style="flex:1;">
                    <div style="display:flex;justify-content:space-between;align-items:baseline;">
                      <strong style="font-size:var(--fs-14);color:var(--text);">${a.action.replace(/_/g, ' ')}</strong>
                      <span class="num" style="font-size:11px;color:var(--text-muted);">${a.ts ? a.ts.split('T')[0] : 'Today'}</span>
                    </div>
                    <p style="margin:var(--sp-1) 0 0;font-size:var(--fs-14);color:var(--text-muted);">${a.details || ''}</p>
                  </div>
                </div>
              `;
            }).join('') : UI.renderEmptyState('alerts', 'You have no notifications at this time.')}
          </div>
        </div>
      `;

      container.querySelector('#btnMarkRead')?.addEventListener('click', () => {
        UI.showToast('All notifications marked as read');
      });
    }
  });

  // ==========================================================================
  // P7: Profile & Security (#/investor/profile, #/manager/profile, #/profile)
  // ==========================================================================
  function renderProfile(container) {
    const persona = Store.getActivePersona();
    const state = Store.getState();
    if (!persona) return;

    const kyc = persona.kyc || 'none';
    const isApproved = kyc === 'approved';
    const isPending = kyc === 'pending';
    const isRejected = kyc === 'rejected';

    container.innerHTML = `
      <div class="profile-screen" style="display:flex;flex-direction:column;gap:var(--sp-4);padding:var(--sp-4);">
        <!-- User Header Card -->
        <div class="card" style="padding:var(--sp-4);display:flex;align-items:center;gap:var(--sp-4);">
          <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--gold-300),var(--green-200));display:grid;place-items:center;font-size:var(--fs-28);font-weight:700;color:var(--green-900);flex:none;border:3px solid #fff;box-shadow:0 4px 12px rgb(3 37 26 / 0.15);">
            ${persona.name.charAt(0)}
          </div>
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:var(--sp-2);">
              <h2 style="font-size:var(--fs-22);margin:0;color:var(--text);">${persona.name}</h2>
              ${isApproved ? `<span title="KYC Verified" style="color:var(--gain);">&#10003;</span>` : ''}
            </div>
            <div style="color:var(--text-muted);font-size:var(--fs-14);">${persona.email || `${persona.id}@shehnat.com`}</div>
            <div style="margin-block-start:var(--sp-1);display:flex;gap:var(--sp-2);">
              <span class="chip">${persona.role.toUpperCase()}</span>
              ${UI.renderChip(kyc, `KYC: ${kyc}`)}
            </div>
          </div>
        </div>

        <!-- Identity & KYC Verification Banner -->
        ${isApproved ? `
          <div class="banner banner-gain" role="status">
            <div class="banner-icon">${UI.icon('done')}</div>
            <div class="banner-body">
              <strong>Identity Verified</strong>
              <div>Your account has full trading and investment clearance.</div>
            </div>
          </div>
        ` : isPending ? `
          <div class="banner banner-info" role="status">
            <div class="banner-icon">${UI.icon('clock')}</div>
            <div class="banner-body">
              <strong>Verification Under Review</strong>
              <div>Your identity documents have been submitted to compliance. Review typically completes within 1 business day.</div>
            </div>
          </div>
        ` : isRejected ? `
          <div class="banner banner-loss" role="alert">
            <div class="banner-icon">${UI.icon('warning')}</div>
            <div class="banner-body">
              <strong>Verification Rejected</strong>
              <div>Your documents could not be verified (expired ID or mismatched address). Please resubmit clear documentation.</div>
              <div style="margin-block-start:var(--sp-2);">
                <a href="#/investor/kyc" class="btn btn-secondary btn-sm">Resubmit Documents</a>
              </div>
            </div>
          </div>
        ` : `
          <div class="banner banner-warning" role="alert">
            <div class="banner-icon">${UI.icon('warning')}</div>
            <div class="banner-body">
              <strong>Identity Verification Required</strong>
              <div>To invest in trade cargo or withdraw funds, please complete our 5-minute KYC verification.</div>
              <div style="margin-block-start:var(--sp-2);">
                <a href="#/investor/kyc" class="btn btn-primary btn-sm">Start Verification</a>
              </div>
            </div>
          </div>
        `}

        <!-- Security & Preferences -->
        <div class="card" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-3);">
          <h3 style="font-size:var(--fs-16);margin:0;color:var(--text);">Security Settings</h3>
          
          <div style="display:flex;justify-content:space-between;align-items:center;padding-block:var(--sp-2);border-block-end:1px solid var(--border);">
            <div>
              <strong style="display:block;font-size:var(--fs-14);">Two-Factor Authentication (2FA)</strong>
              <small style="color:var(--text-muted);">Require SMS code on login</small>
            </div>
            <input type="checkbox" checked style="width:20px;height:20px;accent-color:var(--action);">
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;padding-block:var(--sp-2);border-block-end:1px solid var(--border);">
            <div>
              <strong style="display:block;font-size:var(--fs-14);">Biometric App Unlock</strong>
              <small style="color:var(--text-muted);">Face ID / Fingerprint on launch</small>
            </div>
            <input type="checkbox" checked style="width:20px;height:20px;accent-color:var(--action);">
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;padding-block:var(--sp-2);">
            <div>
              <strong style="display:block;font-size:var(--fs-14);">Account Password</strong>
              <small style="color:var(--text-muted);">Last updated 3 months ago</small>
            </div>
            <a href="#/forgot-password" class="btn btn-secondary btn-sm">Change</a>
          </div>
        </div>

        <!-- Links list -->
        <div class="card" style="padding:var(--sp-2);display:flex;flex-direction:column;">
          <a href="#/legal" class="list-row" style="text-decoration:none;color:inherit;padding:var(--sp-3);display:flex;justify-content:space-between;align-items:center;border-block-end:1px solid var(--border);">
            <div style="display:flex;align-items:center;gap:var(--sp-3);">
              ${UI.icon('documents')}
              <span style="font-weight:500;">Risk Disclosure &amp; Legal Terms</span>
            </div>
            ${UI.icon('chevron')}
          </a>
          <button id="btnSignOut" class="list-row" style="background:none;border:0;cursor:pointer;padding:var(--sp-3);display:flex;justify-content:space-between;align-items:center;color:var(--loss);">
            <div style="display:flex;align-items:center;gap:var(--sp-3);">
              ${UI.icon('cross')}
              <span style="font-weight:600;">Sign Out</span>
            </div>
            ${UI.icon('chevron')}
          </button>
        </div>
      </div>
    `;

    container.querySelector('#btnSignOut')?.addEventListener('click', () => {
      UI.showToast('You have signed out');
      window.location.hash = '#/welcome';
    });
  }

  UI.registerScreen('#/investor/profile', { title: 'Profile', render: renderProfile });
  UI.registerScreen('#/manager/profile', { title: 'Profile', render: renderProfile });
  UI.registerScreen('#/profile', { title: 'Profile', render: renderProfile });

  // ==========================================================================
  // P8: Risk & Legal Disclosure (#/legal)
  // ==========================================================================
  UI.registerScreen('#/legal', {
    title: 'Risk & Legal Disclosure',
    render(container) {
      container.innerHTML = `
        <div class="legal-screen" style="display:flex;flex-direction:column;gap:var(--sp-4);padding:var(--sp-4);max-width:640px;margin:0 auto;">
          <div style="text-align:center;margin-block-end:var(--sp-2);">
            <img src="../../Demo/frontend/brand/mark.svg" alt="" width="36" height="36">
            <h1 style="font-size:var(--fs-28);margin-block:var(--sp-2) 0;color:var(--text);">Platform Risk Disclosures</h1>
            <p style="color:var(--text-muted);font-size:var(--fs-14);margin:0;">Asset-Backed Trade Financing Terms</p>
          </div>

          <div class="card" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-3);">
            <h2 style="font-size:var(--fs-18);margin:0;color:var(--text);">1. Capital Loss &amp; Non-Guaranteed Returns</h2>
            <p style="color:var(--text-muted);font-size:var(--fs-14);line-height:1.5;margin:0;">
              Investments in maritime trade shipments carry inherent commercial risk. Projected returns are based on verified purchase orders and historical trade agreements, but are not guaranteed bank deposits. In the event of buyer insolvency or cargo abandonment, realized returns may fall short of projections or result in a capital loss.
            </p>
          </div>

          <div class="card" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-3);">
            <h2 style="font-size:var(--fs-18);margin:0;color:var(--text);">2. Maritime Logistics &amp; Stage Delays</h2>
            <p style="color:var(--text-muted);font-size:var(--fs-14);line-height:1.5;margin:0;">
              Shipments may encounter weather events, port congestion, customs clearance holds, or transshipment changes. While Shehnat enforces strict SLA milestones, voyage timeline extensions do not incur compound penalty interest, conforming strictly to non-usurious profit-and-loss sharing principles.
            </p>
          </div>

          <div class="card" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-3);">
            <h2 style="font-size:var(--fs-18);margin:0;color:var(--text);">3. Comprehensive Marine Insurance</h2>
            <p style="color:var(--text-muted);font-size:var(--fs-14);line-height:1.5;margin:0;">
              Every shipment listed on the platform requires verifiable Institute Cargo Clauses (A) all-risks marine insurance with named beneficiary endorsements. Total cargo loss claims are adjudicated directly with reputable underwriting syndicates.
            </p>
          </div>

          <div class="card" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-3);">
            <h2 style="font-size:var(--fs-18);margin:0;color:var(--text);">4. Double-Entry Audit Trail</h2>
            <p style="color:var(--text-muted);font-size:var(--fs-14);line-height:1.5;margin:0;">
              All wallet movements, escrow locks, and pro-rata pool allocations are mathematically verified against Shehnat's double-entry platform ledger. Platform revenue is derived strictly as a pre-agreed percentage of settled gross margin.
            </p>
          </div>

          <div style="text-align:center;margin-block-start:var(--sp-2);">
            <button class="btn btn-primary" onclick="window.history.back()" style="min-width:180px;">
              Acknowledge &amp; Return
            </button>
          </div>
        </div>
      `;
    }
  });

  console.log('Public screens P1–P8 registered successfully.');
})(typeof window !== 'undefined' ? window : global);
