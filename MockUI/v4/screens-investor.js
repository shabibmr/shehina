// screens-investor.js - I1–I14 investor screens with Glass look (DESIGN-SYSTEM §2.1)
// PROTOTYPE, throwaway. Wipe me.
// Plan: MockUI/v4-plan/PLAN.md §5 (Milestone C)

(function(global) {
  'use strict';

  const UI = global.ShehnatUI;
  const Store = global.ShehnatStore;
  const Logic = global.ShehnatLogic;
  const Motion = global.ShehnatMotion;

  if (!UI) {
    console.error('ShehnatUI module not loaded before screens-investor.js');
    return;
  }

  // Helper to normalize listing property names from seed.js and user inputs
  function normalizeListing(l) {
    if (!l) return null;
    const target = l.targetAmount !== undefined ? l.targetAmount : (l.target || 0);
    const funded = l.fundedAmount !== undefined ? l.fundedAmount : (l.raised || 0);
    const remaining = l.remainingAmount !== undefined ? l.remainingAmount : Math.max(0, target - funded);
    const title = l.title || l.name || 'Shipment Listing';
    const minInvest = l.minimumInvestment || 50000;
    const marginPct = l.targetMarginPct || (l.expectedProfit && target ? Math.round((l.expectedProfit / target) * 100) : 12);
    const dest = l.destination || l.buyerCountry || 'GB';
    const category = l.category || 'Food';
    const currentStage = l.currentStage !== undefined ? l.currentStage : (l.stage || 0);
    return {
      ...l,
      title,
      name: title,
      targetAmount: target,
      fundedAmount: funded,
      remainingAmount: remaining,
      minimumInvestment: minInvest,
      targetMarginPct: marginPct,
      destination: dest,
      category,
      currentStage
    };
  }

  // ==========================================================================
  // I1: Investor Home (#/investor/home)
  // ==========================================================================
  UI.registerScreen('#/investor/home', {
    title: 'Investor Dashboard',
    role: 'investor',
    render(container, params, state, persona) {
      const activeUser = persona || Store.getActivePersona();
      const kyc = activeUser.kyc || 'none';
      const walletCents = (state.accounts?.wallets && state.accounts.wallets[activeUser.id]) || 0;
      const holdCents = (state.accounts?.hold && state.accounts.hold[activeUser.id]) || 0;
      const listings = (state.listings || []).map(normalizeListing);
      const liveListings = listings.filter(l => l.status === 'live');
      const runningListings = listings.filter(l => l.status === 'running' || l.status === 'settlement_proposed');

      // KYC Banner logic
      let kycBannerHtml = '';
      if (kyc === 'none') {
        kycBannerHtml = `
          <div class="glass" style="padding:var(--sp-4);display:flex;gap:var(--sp-3);align-items:center;">
            <div style="width:36px;height:36px;border-radius:50%;background:rgb(255 255 255 / 0.8);display:grid;place-items:center;color:var(--gold-600);flex:none;">
              ${UI.icon('warning')}
            </div>
            <div style="flex:1;">
              <strong style="display:block;font-size:var(--fs-14);">Identity Verification Needed</strong>
              <small style="color:var(--text-muted);">Complete KYC to enable cargo investments</small>
            </div>
            <a href="#/investor/kyc" class="btn btn-secondary btn-sm" style="flex:none;">Verify</a>
          </div>
        `;
      } else if (kyc === 'pending') {
        kycBannerHtml = `
          <div class="glass" style="padding:var(--sp-4);display:flex;gap:var(--sp-3);align-items:center;">
            <div style="width:36px;height:36px;border-radius:50%;background:rgb(255 255 255 / 0.8);display:grid;place-items:center;color:var(--green-700);flex:none;">
              ${UI.icon('clock')}
            </div>
            <div style="flex:1;">
              <strong style="display:block;font-size:var(--fs-14);">KYC Under Review</strong>
              <small style="color:var(--text-muted);">Compliance team is reviewing your documents</small>
            </div>
          </div>
        `;
      } else if (kyc === 'rejected') {
        kycBannerHtml = `
          <div class="glass" style="padding:var(--sp-4);display:flex;gap:var(--sp-3);align-items:center;border-color:var(--loss);">
            <div style="width:36px;height:36px;border-radius:50%;background:var(--loss-bg);display:grid;place-items:center;color:var(--loss);flex:none;">
              ${UI.icon('warning')}
            </div>
            <div style="flex:1;">
              <strong style="display:block;font-size:var(--fs-14);color:var(--loss);">Verification Rejected</strong>
              <small style="color:var(--text-muted);">Please upload renewed passport or ID document</small>
            </div>
            <a href="#/investor/kyc" class="btn btn-danger btn-sm" style="flex:none;">Resubmit</a>
          </div>
        `;
      }

      container.innerHTML = `
        <div class="gl" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-4);">
          <!-- Glass Greeting Header (DESIGN-SYSTEM §2.1) -->
          <div class="gl-hi">
            <div>
              <div class="gl-greeting">Good day,</div>
              <h1>${activeUser.name.split(' ')[0]}</h1>
            </div>
            <a href="#/notifications" class="gl-av" aria-label="Notifications">
              <span>${activeUser.name.charAt(0)}</span>
              <i class="gl-dot" aria-hidden="true"></i>
            </a>
          </div>

          ${kycBannerHtml}

          <!-- Dark Glass Hero: Wallet & Payout Exposure -->
          <div class="glass dk" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-3);">
            <div style="display:flex;justify-content:space-between;align-items:baseline;">
              <span style="font-size:var(--fs-12);text-transform:uppercase;letter-spacing:0.06em;opacity:0.85;">Total Portfolio Balance</span>
              <span class="chip" style="background:rgb(255 255 255 / 0.15);color:#fff;border-color:transparent;">Available</span>
            </div>
            <div style="font-size:var(--fs-44);font-weight:var(--fw-medium);line-height:1;letter-spacing:-0.02em;" id="heroWalletVal" class="num">
              ${UI.formatMoney(walletCents)}
            </div>
            <div style="display:flex;gap:var(--sp-4);font-size:var(--fs-14);opacity:0.9;padding-block-start:var(--sp-1);border-block-start:1px solid rgb(255 255 255 / 0.15);">
              <div><span>In Hold: </span><b class="num">${UI.formatMoney(holdCents)}</b></div>
              <div><span>Active Shipments: </span><b>${runningListings.length}</b></div>
            </div>

            <!-- Primary Action: Gold-to-Green Gradient Pill (DESIGN-SYSTEM §2.1) -->
            <button class="btn-glass-primary" id="btnQuickTopUp">
              ${UI.icon('plus')} Top Up Balance
            </button>
          </div>

          <!-- Live Investment Opportunities: Horizontal Glass Tiles -->
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-block-end:var(--sp-2);">
              <h2 style="font-size:var(--fs-18);color:#fff;margin:0;">Open For Investment</h2>
              <a href="#/investor/shipments" style="font-size:var(--fs-14);color:#fff;text-decoration:none;font-weight:600;">View all &rarr;</a>
            </div>

            <div class="gl-tiles">
              ${liveListings.map(l => {
                const fundedPct = Math.round((l.fundedAmount / l.targetAmount) * 100);
                const doorBg = UI.getDoorColor(l.id);
                return `
                  <a href="#/listing/${l.id}" class="glass gl-tile ${l.status === 'live' ? 'need-action' : ''}">
                    <div class="gl-gx" style="background:${doorBg};color:#fff;">
                      ${UI.icon(UI.getCategoryIcon(l.category))}
                    </div>
                    <b>${l.title.split(' to ')[0]}</b>
                    <small>Destination: ${l.destination || 'EU'}</small>
                    <div style="margin-block-start:var(--sp-2);">
                      <div style="font-size:11px;color:var(--text-muted);display:flex;justify-content:space-between;">
                        <span>${fundedPct}%</span>
                        <span>${l.targetMarginPct}% exp</span>
                      </div>
                      <div class="fund-bar" style="height:4px;margin-block-start:2px;">
                        <i style="--f:${(fundedPct/100).toFixed(2)};transform:scaleX(${(fundedPct/100).toFixed(2)})"></i>
                      </div>
                    </div>
                    <div class="gl-am num">${UI.formatMoney(l.remainingAmount || (l.targetAmount - l.fundedAmount))} left</div>
                  </a>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Active Voyage Tracking Cards -->
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-block-end:var(--sp-2);">
              <h2 style="font-size:var(--fs-18);color:#fff;margin:0;">Active Voyage Tracking</h2>
              <a href="#/investor/portfolio" style="font-size:var(--fs-14);color:#fff;text-decoration:none;font-weight:600;">Portfolio &rarr;</a>
            </div>

            <div style="display:flex;flex-direction:column;gap:var(--sp-2);">
              ${runningListings.map(l => {
                const isLate = l.isLate;
                return `
                  <a href="#/track/${l.id}" class="glass" style="padding:var(--sp-3);display:flex;gap:var(--sp-3);align-items:center;text-decoration:none;color:inherit;">
                    <div style="width:40px;height:40px;border-radius:var(--r-md);background:${UI.getDoorColor(l.id)};color:#fff;display:grid;place-items:center;flex:none;">
                      ${UI.icon(UI.getCategoryIcon(l.category))}
                    </div>
                    <div style="flex:1;">
                      <div style="display:flex;justify-content:space-between;align-items:baseline;">
                        <strong style="font-size:var(--fs-14);color:var(--text);">${l.title}</strong>
                        ${isLate ? `<span class="chip chip-late">Stage Late</span>` : `<span class="chip chip-live">Stage ${l.currentStage}/7</span>`}
                      </div>
                      <div style="font-size:var(--fs-12);color:var(--text-muted);margin-block-start:2px;">
                        <span>Target: ${UI.formatMoney(l.targetAmount)}</span> &bull; 
                        <span>Expected margin: ${l.targetMarginPct}%</span>
                      </div>
                    </div>
                    ${UI.icon('chevron')}
                  </a>
                `;
              }).join('')}
            </div>
          </div>

        </div>
      `;

      // Count-up animation for wallet balance on entrance (Choreography 3)
      if (Motion) {
        const valEl = container.querySelector('#heroWalletVal');
        Motion.countUp(valEl, walletCents / 100);
      }

      // Quick Top-Up button
      container.querySelector('#btnQuickTopUp')?.addEventListener('click', () => {
        window.location.hash = '#/investor/topup';
      });
    }
  });

  // ==========================================================================
  // I2: KYC Wizard (#/investor/kyc) & I3: KYC Status (#/investor/kyc-status)
  // ==========================================================================
  UI.registerScreen('#/investor/kyc', {
    title: 'Identity Verification (KYC)',
    role: 'investor',
    render(container, params, state, persona) {
      let currentStep = 1;
      const totalSteps = 4;

      function renderStep() {
        container.innerHTML = `
          <div class="gl" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-4);">
            <!-- Stepper header -->
            <div class="glass" style="padding:var(--sp-3);display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:var(--fs-14);font-weight:600;">Step ${currentStep} of ${totalSteps}</span>
              <div style="display:flex;gap:var(--sp-2);">
                ${[1, 2, 3, 4].map(s => `
                  <div style="width:10px;height:10px;border-radius:50%;background:${s < currentStep ? 'var(--action)' : s === currentStep ? 'var(--gold-500)' : 'var(--border-input)'};"></div>
                `).join('')}
              </div>
            </div>

            ${currentStep === 1 ? `
              <!-- Step 1: Personal Details -->
              <div class="glass" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-3);">
                <h2 style="font-size:var(--fs-22);margin:0;">Personal Details</h2>
                <div class="field">
                  <label class="label">Full Legal Name (as on Passport)</label>
                  <input type="text" id="kycName" class="input" value="${persona.name}" required>
                </div>
                <div class="field">
                  <label class="label">Date of Birth</label>
                  <input type="date" id="kycDOB" class="input" value="${persona.dob || '1992-06-15'}" required>
                </div>
                <div class="field">
                  <label class="label">Country of Nationality</label>
                  <select id="kycCountry" class="select">
                    <option value="AE" selected>United Arab Emirates</option>
                    <option value="GB">United Kingdom</option>
                    <option value="SG">Singapore</option>
                    <option value="QA">Qatar</option>
                    <option value="SA">Saudi Arabia</option>
                  </select>
                </div>
                <button class="btn btn-primary" id="btnStep1Next" style="margin-block-start:var(--sp-2);">Continue to Identity Document</button>
              </div>
            ` : currentStep === 2 ? `
              <!-- Step 2: Passport / ID Upload Tile -->
              <div class="glass" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-3);">
                <h2 style="font-size:var(--fs-22);margin:0;">Government Identity Document</h2>
                <p style="font-size:var(--fs-14);color:var(--text-muted);margin:0;">Upload a clear color scan of your valid passport or national ID card.</p>

                <div class="upload-tile" id="uploadTileID" style="border:2px dashed var(--border-input);border-radius:var(--r-md);padding:var(--sp-6);text-align:center;cursor:pointer;background:rgb(255 255 255 / 0.5);">
                  <div style="margin-block-end:var(--sp-2);">${UI.icon('upload')}</div>
                  <strong style="display:block;font-size:var(--fs-14);">Choose Passport File</strong>
                  <small style="color:var(--text-muted);">PDF, JPG or PNG up to 10MB (Simulated)</small>
                  <div id="idFileName" style="margin-block-start:var(--sp-2);font-weight:600;color:var(--action);" hidden>passport_scan.pdf (1.8 MB) &#10003;</div>
                </div>

                <div style="display:flex;gap:var(--sp-2);margin-block-start:var(--sp-2);">
                  <button class="btn btn-secondary" id="btnStepPrev">Back</button>
                  <button class="btn btn-primary" id="btnStep2Next" style="flex:1;">Continue to Proof of Address</button>
                </div>
              </div>
            ` : currentStep === 3 ? `
              <!-- Step 3: Proof of Address Upload -->
              <div class="glass" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-3);">
                <h2 style="font-size:var(--fs-22);margin:0;">Proof of Address</h2>
                <p style="font-size:var(--fs-14);color:var(--text-muted);margin:0;">Upload a utility bill or bank statement dated within the last 3 months.</p>

                <div class="upload-tile" id="uploadTilePOA" style="border:2px dashed var(--border-input);border-radius:var(--r-md);padding:var(--sp-6);text-align:center;cursor:pointer;background:rgb(255 255 255 / 0.5);">
                  <div style="margin-block-end:var(--sp-2);">${UI.icon('documents')}</div>
                  <strong style="display:block;font-size:var(--fs-14);">Choose Statement / Utility File</strong>
                  <small style="color:var(--text-muted);">PDF or JPG up to 10MB</small>
                  <div id="poaFileName" style="margin-block-start:var(--sp-2);font-weight:600;color:var(--action);" hidden>utility_bill_sept.pdf (840 KB) &#10003;</div>
                </div>

                <div style="display:flex;gap:var(--sp-2);margin-block-start:var(--sp-2);">
                  <button class="btn btn-secondary" id="btnStepPrev">Back</button>
                  <button class="btn btn-primary" id="btnStep3Next" style="flex:1;">Continue to Declaration</button>
                </div>
              </div>
            ` : `
              <!-- Step 4: Declaration & Submit -->
              <div class="glass" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-3);">
                <h2 style="font-size:var(--fs-22);margin:0;">Declaration &amp; Submission</h2>
                <div class="banner banner-info" role="status">
                  <div class="banner-body">
                    <strong>Compliance Agreement</strong>
                    <div style="font-size:var(--fs-12);margin-block-start:4px;">
                      I confirm that all uploaded documents are genuine, and I am the ultimate beneficial owner of the funds invested on Shehnat.
                    </div>
                  </div>
                </div>

                <label style="display:flex;gap:var(--sp-2);align-items:start;font-size:var(--fs-14);cursor:pointer;">
                  <input type="checkbox" id="kycConfirmCheck" checked style="margin-block-start:2px;">
                  <span>I agree to standard AML/CFT verification checks and sanction screenings.</span>
                </label>

                <div style="display:flex;gap:var(--sp-2);margin-block-start:var(--sp-3);">
                  <button class="btn btn-secondary" id="btnStepPrev">Back</button>
                  <button class="btn btn-primary" id="btnSubmitKYC" style="flex:1;">Submit for Review</button>
                </div>
              </div>
            `}
          </div>
        `;

        // Wire handlers
        container.querySelector('#btnStep1Next')?.addEventListener('click', () => { currentStep = 2; renderStep(); });
        container.querySelector('#btnStep2Next')?.addEventListener('click', () => { currentStep = 3; renderStep(); });
        container.querySelector('#btnStep3Next')?.addEventListener('click', () => { currentStep = 4; renderStep(); });
        container.querySelector('#btnStepPrev')?.addEventListener('click', () => { currentStep--; renderStep(); });

        container.querySelector('#uploadTileID')?.addEventListener('click', () => {
          document.getElementById('idFileName').hidden = false;
          UI.showToast('ID document attached: passport_scan.pdf');
        });

        container.querySelector('#uploadTilePOA')?.addEventListener('click', () => {
          document.getElementById('poaFileName').hidden = false;
          UI.showToast('Address proof attached: utility_bill.pdf');
        });

        container.querySelector('#btnSubmitKYC')?.addEventListener('click', () => {
          Store.setState(s => {
            const p = s.personas.find(x => x.id === persona.id);
            if (p) p.kyc = 'pending';
            s.applications.push({
              id: 'app_kyc_' + Date.now().toString(36),
              type: 'kyc',
              applicantId: persona.id,
              applicantName: persona.name,
              submittedAt: s.simulatedDate,
              status: 'pending',
              documents: ['passport_scan.pdf', 'utility_bill.pdf']
            });
            s.auditLog.unshift({
              ts: s.simulatedDate,
              actor: persona.name,
              action: 'KYC_SUBMITTED',
              details: 'Submitted passport and address documents for compliance verification'
            });
            return s;
          });

          UI.showToast('KYC application submitted to compliance queue');
          window.location.hash = '#/investor/home';
        });
      }

      renderStep();
    }
  });

  // ==========================================================================
  // I4: Explore Shipments (#/investor/shipments)
  // ==========================================================================
  UI.registerScreen('#/investor/shipments', {
    title: 'Explore Shipments',
    role: 'investor',
    render(container, params, state) {
      let filterCategory = 'all';
      let sortOrder = 'closing';
      const listings = (state.listings || []).map(normalizeListing);

      function renderListings() {
        const filtered = listings.filter(l => {
          if (filterCategory === 'all') return true;
          return (l.category || '').toLowerCase() === filterCategory.toLowerCase();
        }).sort((a, b) => {
          if (sortOrder === 'margin') return b.targetMarginPct - a.targetMarginPct;
          return a.targetAmount - b.targetAmount;
        });

        container.innerHTML = `
          <div class="gl" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-3);">
            <!-- Filter Bar & Segmented Tabs -->
            <div class="glass" style="padding:var(--sp-3);display:flex;flex-direction:column;gap:var(--sp-2);">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:var(--fs-14);font-weight:600;color:var(--text);">Category</span>
                <select id="selSort" class="select" style="min-height:36px;font-size:var(--fs-12);width:auto;">
                  <option value="closing" ${sortOrder === 'closing' ? 'selected' : ''}>Sort: Closing Soon</option>
                  <option value="margin" ${sortOrder === 'margin' ? 'selected' : ''}>Sort: Highest Expected Margin</option>
                </select>
              </div>

              <!-- Filter tabs -->
              <div style="display:flex;gap:var(--sp-1);overflow-x:auto;">
                ${['all', 'Food', 'Textiles', 'Building', 'Energy'].map(cat => `
                  <button class="chip ${filterCategory.toLowerCase() === cat.toLowerCase() ? 'chip-live' : ''}" data-cat="${cat}" style="cursor:pointer;flex:none;">
                    ${cat === 'all' ? 'All Categories' : cat}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Shipments list -->
            <div style="display:flex;flex-direction:column;gap:var(--sp-3);">
              ${filtered.length ? filtered.map(l => {
                const fundedPct = Math.round((l.fundedAmount / l.targetAmount) * 100);
                const doorColor = UI.getDoorColor(l.id);
                const isShareholder = l.isShareholderListing;

                return `
                  <a href="#/listing/${l.id}" class="glass" style="padding:var(--sp-4);text-decoration:none;color:inherit;display:flex;flex-direction:column;gap:var(--sp-3);">
                    <!-- Top row: Door Swatch + Title + Status -->
                    <div style="display:flex;gap:var(--sp-3);align-items:start;">
                      <div style="width:48px;height:48px;border-radius:var(--r-md);background:${doorColor};color:#fff;display:grid;place-items:center;font-size:var(--fs-22);flex:none;">
                        ${UI.icon(UI.getCategoryIcon(l.category))}
                      </div>
                      <div style="flex:1;">
                        <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:4px;">
                          <strong style="font-size:var(--fs-16);color:var(--text);">${l.title}</strong>
                          ${UI.renderChip(l.status)}
                        </div>
                        <div style="font-size:var(--fs-12);color:var(--text-muted);margin-block-start:2px;">
                          ${l.sourceCountry || 'IN'} &rarr; ${l.destination || 'Rotterdam'} &bull; Manager: ${l.managerName || 'Kerala Spices'}
                        </div>
                      </div>
                    </div>

                    ${isShareholder ? `
                      <div style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:var(--gold-600);background:rgb(217 194 138 / 0.2);padding:2px 8px;border-radius:var(--r-pill);width:fit-content;">
                        ${UI.icon('review')} Shareholder Listing (ADR 0004 Disclosure)
                      </div>
                    ` : ''}

                    <!-- Funding progress bar -->
                    ${UI.renderFundingBar(l.fundedAmount, l.targetAmount, { showLabel: true })}

                    <!-- Financial Highlights Row -->
                    <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:var(--sp-2);background:rgb(255 255 255 / 0.5);border-radius:var(--r-md);padding:var(--sp-2);text-align:center;">
                      <div>
                        <div style="font-size:11px;color:var(--text-muted);">Target</div>
                        <div class="num" style="font-weight:600;font-size:var(--fs-14);">${UI.formatMoney(l.targetAmount)}</div>
                      </div>
                      <div>
                        <div style="font-size:11px;color:var(--text-muted);">Expected Margin</div>
                        <div class="num" style="font-weight:600;font-size:var(--fs-14);color:var(--gain);">${l.targetMarginPct}%</div>
                      </div>
                      <div>
                        <div style="font-size:11px;color:var(--text-muted);">Remaining</div>
                        <div class="num" style="font-weight:600;font-size:var(--fs-14);">${UI.formatMoney(l.remainingAmount || (l.targetAmount - l.fundedAmount))}</div>
                      </div>
                    </div>
                  </a>
                `;
              }).join('') : UI.renderEmptyState('shipments', 'No listings match selected category filters.', '<button class="btn btn-secondary btn-sm" id="btnClearFilter">Clear Filters</button>')}
            </div>
          </div>
        `;

        container.querySelectorAll('[data-cat]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            filterCategory = e.currentTarget.dataset.cat;
            renderListings();
          });
        });

        container.querySelector('#selSort')?.addEventListener('change', (e) => {
          sortOrder = e.target.value;
          renderListings();
        });

        container.querySelector('#btnClearFilter')?.addEventListener('click', () => {
          filterCategory = 'all';
          renderListings();
        });
      }

      renderListings();
    }
  });

  // ==========================================================================
  // I5: Listing Detail Screen (#/listing/:id)
  // ==========================================================================
  UI.registerScreen('#/listing/:id', {
    title: 'Listing Details',
    render(container, params, state, persona) {
      const listingId = params.id;
      const listing = normalizeListing((state.listings || []).find(l => l.id === listingId));

      if (!listing) {
        container.innerHTML = UI.renderEmptyState('warning', `Listing ${listingId} not found.`);
        return;
      }

      let activeTab = 'overview';
      const doorColor = UI.getDoorColor(listing.id);
      const isShareholder = listing.isShareholderListing;
      const remainingCents = listing.remainingAmount !== undefined ? listing.remainingAmount : (listing.targetAmount - listing.fundedAmount);
      const isLive = listing.status === 'live';

      function renderTabs() {
        container.innerHTML = `
          <div class="gl" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-4);">
            <!-- Listing Header Card -->
            <div class="glass" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-3);">
              <div style="display:flex;gap:var(--sp-3);align-items:start;">
                <div style="width:56px;height:56px;border-radius:var(--r-md);background:${doorColor};color:#fff;display:grid;place-items:center;font-size:var(--fs-28);flex:none;">
                  ${UI.icon(UI.getCategoryIcon(listing.category))}
                </div>
                <div style="flex:1;">
                  <div style="display:flex;justify-content:space-between;align-items:start;">
                    <h1 style="font-size:var(--fs-20);margin:0;color:var(--text);line-height:var(--lh-tight);">${listing.title}</h1>
                    ${UI.renderChip(listing.status)}
                  </div>
                  <div style="font-size:var(--fs-12);color:var(--text-muted);margin-block-start:4px;">
                    Manager: <b>${listing.managerName || 'Kerala Spice Traders'}</b> &bull; Route: ${listing.sourceCountry} &rarr; ${listing.destination || 'Rotterdam'}
                  </div>
                </div>
              </div>

              ${isShareholder ? `
                <div class="banner banner-warning" role="status">
                  <div class="banner-body">
                    <strong>Shareholder Listing Disclosure (ADR 0004)</strong>
                    <div style="font-size:var(--fs-12);">
                      A platform Shareholder holds beneficial ownership in this shipment or its buyer entity. Full trading terms and margin caps are independently audited.
                    </div>
                  </div>
                </div>
              ` : ''}

              <!-- Funding Bar -->
              ${UI.renderFundingBar(listing.fundedAmount, listing.targetAmount, { showLabel: true })}
            </div>

            <!-- Segmented 4 Tabs (DESIGN-SYSTEM §4.2) -->
            <div class="glass" style="padding:4px;display:grid;grid-template-columns:repeat(4, 1fr);gap:4px;">
              <button class="btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-ghost'} btn-sm" data-tab="overview">Overview</button>
              <button class="btn ${activeTab === 'cargo' ? 'btn-primary' : 'btn-ghost'} btn-sm" data-tab="cargo">Cargo</button>
              <button class="btn ${activeTab === 'financials' ? 'btn-primary' : 'btn-ghost'} btn-sm" data-tab="financials">Financials</button>
              <button class="btn ${activeTab === 'docs' ? 'btn-primary' : 'btn-ghost'} btn-sm" data-tab="docs">Docs</button>
            </div>

            <!-- Tab Content -->
            <div id="tabContent">
              ${activeTab === 'overview' ? `
                <div class="glass" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-3);">
                  <h3 style="font-size:var(--fs-16);margin:0;">Trade Overview</h3>
                  <p style="font-size:var(--fs-14);color:var(--text-muted);margin:0;line-height:1.5;">
                    Export financing for containerized commodities. Purchase order confirmed by European buyer with letter of credit backing.
                  </p>
                  
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2);margin-block-start:var(--sp-2);">
                    <div style="background:rgb(255 255 255 / 0.6);padding:var(--sp-2);border-radius:var(--r-md);">
                      <small style="color:var(--text-muted);">Voyage Duration</small>
                      <div style="font-weight:600;">28 Estimated Days</div>
                    </div>
                    <div style="background:rgb(255 255 255 / 0.6);padding:var(--sp-2);border-radius:var(--r-md);">
                      <small style="color:var(--text-muted);">Inspection Agency</small>
                      <div style="font-weight:600;">SGS Marine Audit</div>
                    </div>
                  </div>
                </div>
              ` : activeTab === 'cargo' ? `
                <div class="glass" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-3);">
                  <h3 style="font-size:var(--fs-16);margin:0;">Cargo Specifications</h3>
                  <div style="font-size:var(--fs-14);display:flex;flex-direction:column;gap:var(--sp-2);">
                    <div style="display:flex;justify-content:space-between;border-block-end:1px solid var(--border);padding-block-end:4px;">
                      <span style="color:var(--text-muted);">Commodity</span>
                      <strong>${listing.category}</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;border-block-end:1px solid var(--border);padding-block-end:4px;">
                      <span style="color:var(--text-muted);">Container Spec</span>
                      <strong>2x 40ft High Cube Ventilated</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;border-block-end:1px solid var(--border);padding-block-end:4px;">
                      <span style="color:var(--text-muted);">Port of Origin</span>
                      <strong>Cochin Port (INCOK)</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;">
                      <span style="color:var(--text-muted);">Discharge Port</span>
                      <strong>Rotterdam (NLRTM)</strong>
                    </div>
                  </div>
                </div>
              ` : activeTab === 'financials' ? `
                <div class="glass" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-3);">
                  <h3 style="font-size:var(--fs-16);margin:0;">Full BR §6.5 Financial Terms (ADR 0004)</h3>
                  <div style="font-size:var(--fs-14);display:flex;flex-direction:column;gap:var(--sp-2);">
                    <div style="display:flex;justify-content:space-between;border-block-end:1px solid var(--border);padding-block-end:4px;">
                      <span style="color:var(--text-muted);">Cargo Purchase Target</span>
                      <strong class="num">${UI.formatMoney(listing.targetAmount)}</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;border-block-end:1px solid var(--border);padding-block-end:4px;">
                      <span style="color:var(--text-muted);">Target Gross Margin</span>
                      <strong class="num" style="color:var(--gain);">${listing.targetMarginPct}%</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;border-block-end:1px solid var(--border);padding-block-end:4px;">
                      <span style="color:var(--text-muted);">Platform Settlement Fee</span>
                      <strong class="num">20% of Gross Profit</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;">
                      <span style="color:var(--text-muted);">Minimum Investment</span>
                      <strong class="num">${UI.formatMoney(50000)} ($500.00)</strong>
                    </div>
                  </div>
                </div>
              ` : `
                <div class="glass" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-3);">
                  <h3 style="font-size:var(--fs-16);margin:0;">Verified Trade Documents</h3>
                  <div style="display:flex;flex-direction:column;gap:var(--sp-2);">
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--sp-2);background:rgb(255 255 255 / 0.6);border-radius:var(--r-md);">
                      <div style="display:flex;gap:var(--sp-2);align-items:center;">
                        ${UI.icon('documents')}
                        <span style="font-size:var(--fs-14);">Bill of Lading Contract.pdf</span>
                      </div>
                      <span class="chip chip-completed">Verified</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--sp-2);background:rgb(255 255 255 / 0.6);border-radius:var(--r-md);">
                      <div style="display:flex;gap:var(--sp-2);align-items:center;">
                        ${UI.icon('documents')}
                        <span style="font-size:var(--fs-14);">Marine Cargo Insurance Policy.pdf</span>
                      </div>
                      <span class="chip chip-completed">Verified</span>
                    </div>
                  </div>
                </div>
              `}
            </div>

            <!-- Investment Action Bar (if live) -->
            ${isLive ? `
              <div class="glass dk" style="padding:var(--sp-3);display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <div style="font-size:11px;opacity:0.85;">REMAINING AVAILABLE</div>
                  <div class="num" style="font-size:var(--fs-22);font-weight:600;">${UI.formatMoney(remainingCents)}</div>
                </div>
                <button class="btn-glass-primary" id="btnOpenInvest" style="width:auto;padding-inline:var(--sp-6);min-height:48px;margin:0;">
                  Invest Now
                </button>
              </div>
            ` : ''}

          </div>
        `;

        container.querySelectorAll('[data-tab]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            activeTab = e.currentTarget.dataset.tab;
            renderTabs();
          });
        });

        container.querySelector('#btnOpenInvest')?.addEventListener('click', () => {
          openInvestSheet(listing, persona);
        });
      }

      renderTabs();
    }
  });

  // ==========================================================================
  // I6: Invest Sheet & I7: Investment Confirmed (Ceremony 4 Sprout)
  // ==========================================================================
  function openInvestSheet(listing, user) {
    const activeUser = user || Store.getActivePersona();
    const minCents = 50000; // $500.00
    const remainingCents = listing.remainingAmount !== undefined ? listing.remainingAmount : (listing.targetAmount - listing.fundedAmount);
    const isExactRemainder = remainingCents < minCents;
    const defaultInvestCents = isExactRemainder ? remainingCents : Math.min(100000, remainingCents);

    const sheetHtml = `
      <div style="display:flex;flex-direction:column;gap:var(--sp-3);">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <strong style="display:block;font-size:var(--fs-16);">${listing.title}</strong>
            <small style="color:var(--text-muted);">Available remaining: ${UI.formatMoney(remainingCents)}</small>
          </div>
          <span class="chip chip-live">${listing.targetMarginPct}% expected</span>
        </div>

        ${isExactRemainder ? `
          <div class="banner banner-info" role="status">
            <div class="banner-body">
              <strong>Remainder Rule Applied</strong>
              <div style="font-size:var(--fs-12);">
                Remaining funding (${UI.formatMoney(remainingCents)}) is below the standard $500 minimum. Under BR §6, you must take the exact remainder to close the pool.
              </div>
            </div>
          </div>
        ` : ''}

        <div class="field">
          <label for="investAmountInput" class="label">Investment Amount (USD)</label>
          <div style="position:relative;">
            <span style="position:absolute;inset-inline-start:12px;top:50%;transform:translateY(-50%);font-weight:600;color:var(--text);">$</span>
            <input type="number" id="investAmountInput" class="input num" style="padding-inline-start:28px;font-size:var(--fs-20);font-weight:600;" 
                   value="${(defaultInvestCents / 100).toFixed(2)}" 
                   ${isExactRemainder ? 'readonly' : ''} 
                   min="${(minCents / 100).toFixed(2)}" 
                   max="${(remainingCents / 100).toFixed(2)}" step="10">
          </div>
          <small class="helper-text" id="investCalcHelper" style="color:var(--text-muted)">
            Expected gross profit: ${UI.formatMoney(Math.round(defaultInvestCents * (listing.targetMarginPct / 100)))}
          </small>
        </div>

        <div style="background:var(--surface-sunken);border-radius:var(--r-md);padding:var(--sp-3);display:flex;justify-content:space-between;align-items:center;">
          <div>
            <span style="font-size:var(--fs-12);color:var(--text-muted);display:block;">Wallet Balance</span>
            <span class="num" style="font-weight:600;">${UI.formatMoney((Store.getState().accounts?.wallets && Store.getState().accounts.wallets[activeUser.id]) || 0)}</span>
          </div>
          <a href="#/investor/topup" class="btn btn-secondary btn-sm" onclick="ShehnatUI.closeSheet()">Top Up</a>
        </div>
      </div>
    `;

    UI.openSheet({
      title: 'Confirm Investment',
      bodyHtml: sheetHtml,
      confirmText: 'Confirm & Invest',
      onConfirm: () => {
        const inputVal = parseFloat(document.getElementById('investAmountInput').value) || 0;
        const investCents = Math.round(inputVal * 100);

        // Validation via logic.js
        const remCheck = Logic.validation.validateRemainderRule(investCents, remainingCents, minCents);
        if (remCheck) {
          UI.showToast(remCheck);
          return;
        }

        const state = Store.getState();
        const walletBal = (state.accounts?.wallets && state.accounts.wallets[activeUser.id]) || 0;
        if (walletBal < investCents) {
          UI.showToast('Insufficient wallet balance. Please top up first.');
          return;
        }

        // Post ledger entries (Double-entry: debit wallet, credit escrow)
        Store.setState(s => {
          const tx = {
            id: 'tx_inv_' + Date.now().toString(36),
            ts: s.simulatedDate,
            type: 'investment',
            entries: [
              { account: `wallet:${activeUser.id}`, debit: 0, credit: investCents },
              { account: `escrow:${listing.id}`, debit: investCents, credit: 0 }
            ]
          };
          s.ledger.push(tx);
          s.accounts.wallets[activeUser.id] -= investCents;
          
          const lst = s.listings.find(x => x.id === listing.id);
          if (lst) {
            lst.fundedAmount += investCents;
            lst.remainingAmount = Math.max(0, lst.targetAmount - lst.fundedAmount);
            if (!lst.investments) lst.investments = [];
            lst.investments.push({
              userId: activeUser.id,
              userName: activeUser.name,
              amountCents: investCents,
              ts: s.simulatedDate
            });
            if (lst.fundedAmount >= lst.targetAmount) {
              lst.status = 'running';
              lst.currentStage = 1;
            }
          }

          s.auditLog.unshift({
            ts: s.simulatedDate,
            actor: activeUser.name,
            action: 'INVESTMENT_MADE',
            details: `Invested ${UI.formatMoney(investCents)} into ${listing.title}`
          });
          return s;
        });

        // Trigger I7 Investment Confirmed with Sprout Ceremony
        showInvestmentReceipt(listing, investCents);
      }
    });

    // Dynamic expected profit calc
    setTimeout(() => {
      const input = document.getElementById('investAmountInput');
      const helper = document.getElementById('investCalcHelper');
      if (input && helper) {
        input.addEventListener('input', () => {
          const cents = Math.round((parseFloat(input.value) || 0) * 100);
          const expProfit = Math.round(cents * (listing.targetMarginPct / 100));
          helper.textContent = `Expected gross profit: ${UI.formatMoney(expProfit)}`;
        });
      }
    }, 50);
  }

  // I7: Sprout Success Receipt
  function showInvestmentReceipt(listing, amountCents) {
    const host = document.getElementById('screenHost');
    if (!host) return;

    host.innerHTML = `
      <div class="gl" style="padding:var(--sp-4);display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:80vh;text-align:center;">
        
        <!-- Sprout Animation SVG (Choreography 4) -->
        <div class="sprout-stage" style="margin-block-end:var(--sp-3);">
          <svg class="sprout" viewBox="0 0 64 64" width="96" height="96" aria-hidden="true" style="overflow:visible;">
            <circle class="halo" cx="32" cy="32" r="28" fill="rgb(217 194 138 / 0.3)" />
            <!-- Five people in circle -->
            <circle class="person" data-i="0" cx="32" cy="54" r="4" fill="var(--green-700)" />
            <circle class="person" data-i="1" cx="14" cy="42" r="4" fill="var(--green-700)" />
            <circle class="person" data-i="2" cx="50" cy="42" r="4" fill="var(--green-700)" />
            <circle class="person" data-i="3" cx="20" cy="22" r="4" fill="var(--green-700)" />
            <circle class="person" data-i="4" cx="44" cy="22" r="4" fill="var(--green-700)" />
            <!-- Stem -->
            <path class="stem" d="M32 50 V26" stroke="var(--action)" stroke-width="3" stroke-linecap="round" stroke-dasharray="24px" stroke-dashoffset="0" />
            <!-- Leaves -->
            <path class="leaf-sl leaf-s" d="M32 34 C24 34 22 24 32 26" fill="var(--accent)" />
            <path class="leaf-sr leaf-s" d="M32 30 C40 30 42 20 32 22" fill="var(--accent)" />
            <path class="leaf-sc leaf-s" d="M32 26 C28 16 36 16 32 26" fill="var(--green-600)" />
            <g class="motes"></g>
          </svg>
        </div>

        <div class="glass" style="padding:var(--sp-6);display:flex;flex-direction:column;gap:var(--sp-3);max-width:380px;">
          <h1 style="font-size:var(--fs-28);margin:0;color:var(--text);">Investment Confirmed!</h1>
          <div class="num" style="font-size:var(--fs-34);font-weight:600;color:var(--gain);">${UI.formatMoney(amountCents)}</div>
          <p style="color:var(--text-muted);font-size:var(--fs-14);margin:0;">
            Allocated into <strong>${listing.title}</strong>. Your funds are secured in verified escrow.
          </p>

          <div style="display:flex;flex-direction:column;gap:var(--sp-2);margin-block-start:var(--sp-3);">
            <a href="#/track/${listing.id}" class="btn-glass-primary">Track This Shipment</a>
            <a href="#/investor/portfolio" class="btn btn-secondary">View Portfolio</a>
          </div>
        </div>

      </div>
    `;

    if (Motion) {
      Motion.sprout(host.querySelector('.sprout'), host.querySelector('h1'));
    }
  }

  // ==========================================================================
  // I8: Portfolio (#/investor/portfolio)
  // ==========================================================================
  UI.registerScreen('#/investor/portfolio', {
    title: 'My Portfolio',
    role: 'investor',
    render(container, params, state, persona) {
      const listings = (state.listings || []).map(normalizeListing);
      const user = persona || Store.getActivePersona();
      let tabFilter = 'active';

      function renderPortfolio() {
        const userListings = listings.filter(l => {
          if (tabFilter === 'active') return l.status === 'running' || l.status === 'live' || l.status === 'settlement_proposed';
          if (tabFilter === 'completed') return l.status === 'completed';
          return l.status === 'cancelled' || l.status === 'withdrawn';
        });

        container.innerHTML = `
          <div class="gl" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-3);">
            <div class="glass" style="padding:4px;display:grid;grid-template-columns:repeat(3, 1fr);gap:4px;">
              <button class="btn ${tabFilter === 'active' ? 'btn-primary' : 'btn-ghost'} btn-sm" data-ptab="active">Active</button>
              <button class="btn ${tabFilter === 'completed' ? 'btn-primary' : 'btn-ghost'} btn-sm" data-ptab="completed">Completed</button>
              <button class="btn ${tabFilter === 'ended' ? 'btn-primary' : 'btn-ghost'} btn-sm" data-ptab="ended">Ended</button>
            </div>

            <div style="display:flex;flex-direction:column;gap:var(--sp-3);">
              ${userListings.length ? userListings.map(l => {
                const isCompletedProfit = l.status === 'completed' && l.payoutSummary?.profitShare > 0;
                const isCompletedLoss = l.status === 'completed' && l.payoutSummary?.isLoss;

                return `
                  <div class="glass" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-3);">
                    <div style="display:flex;justify-content:space-between;align-items:start;">
                      <div>
                        <strong style="font-size:var(--fs-16);">${l.title}</strong>
                        <div style="font-size:var(--fs-12);color:var(--text-muted);margin-block-start:2px;">
                          ${l.category} &bull; ${l.sourceCountry} &rarr; ${l.destination || 'Rotterdam'}
                        </div>
                      </div>
                      ${UI.renderChip(l.status)}
                    </div>

                    <!-- Return figures -->
                    <div style="display:flex;justify-content:space-between;align-items:center;background:rgb(255 255 255 / 0.6);padding:var(--sp-2) var(--sp-3);border-radius:var(--r-md);">
                      <div>
                        <small style="color:var(--text-muted);display:block;">Investment</small>
                        <span class="num" style="font-weight:600;">${UI.formatMoney(l.targetAmount)}</span>
                      </div>
                      <div style="text-align:end;">
                        <small style="color:var(--text-muted);display:block;">${l.status === 'completed' ? 'Realized Result' : 'Expected Result'}</small>
                        ${isCompletedLoss ? `
                          <span class="money num loss-text" style="font-weight:600;">&minus;$4,200.00 &#9660; Loss</span>
                        ` : isCompletedProfit ? `
                          <span class="money num gain-text" style="font-weight:600;">+$8,450.00 &#9650; Gain</span>
                        ` : `
                          <span class="money num" style="font-weight:600;">+${l.targetMarginPct}% (expected)</span>
                        `}
                      </div>
                    </div>

                    <div style="display:flex;gap:var(--sp-2);justify-content:flex-end;">
                      <a href="#/track/${l.id}" class="btn btn-secondary btn-sm">Track Route</a>
                      ${l.status === 'completed' || l.status === 'settlement_proposed' ? `
                        <a href="#/statement/${l.id}" class="btn btn-primary btn-sm">Statement</a>
                      ` : ''}
                    </div>
                  </div>
                `;
              }).join('') : UI.renderEmptyState('shipments', `No ${tabFilter} shipments in your portfolio.`)}
            </div>
          </div>
        `;

        container.querySelectorAll('[data-ptab]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            tabFilter = e.currentTarget.dataset.ptab;
            renderPortfolio();
          });
        });
      }

      renderPortfolio();
    }
  });

  // ==========================================================================
  // I9: Track a Listing (#/track/:id) (Choreography 5 Route)
  // ==========================================================================
  UI.registerScreen('#/track/:id', {
    title: 'Track Voyage',
    render(container, params, state) {
      const listing = normalizeListing((state.listings || []).find(l => l.id === params.id) || state.listings[0]);
      const stage = listing.currentStage || 4;
      const isLate = listing.isLate || false;

      container.innerHTML = `
        <div class="gl" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-4);">
          
          <!-- Header status -->
          <div class="glass" style="padding:var(--sp-4);display:flex;justify-content:space-between;align-items:center;">
            <div>
              <h2 style="font-size:var(--fs-18);margin:0;">${listing.title}</h2>
              <div style="font-size:var(--fs-12);color:var(--text-muted);margin-block-start:2px;">
                Voyage Progress: Stage ${stage} of 7
              </div>
            </div>
            ${isLate ? `<span class="chip chip-late">Late (${listing.lateDays || 6}d)</span>` : `<span class="chip chip-live">On Schedule</span>`}
          </div>

          <!-- Route SVG Specimen (Choreography 5) -->
          <div class="glass dk" style="padding:var(--sp-4);overflow:hidden;">
            <svg class="route" viewBox="0 0 320 80" width="100%" height="80" aria-label="Voyage route progress">
              <g class="route-g">
                <path class="route-line" d="M 20 40 Q 100 10 160 40 T 300 40" fill="none" stroke="rgb(255 255 255 / 0.4)" stroke-width="4" stroke-linecap="round" />
                <g class="route-stops"></g>
                <g class="vessel" transform="translate(160 40)">
                  <circle class="ripple" r="6" fill="rgb(217 194 138 / 0.4)" />
                  <circle r="5" fill="var(--gold-400)" stroke="#fff" stroke-width="2" />
                </g>
              </g>
              <text class="route-txt" data-x="20" y="68" fill="#fff" font-size="10" text-anchor="middle">${listing.sourceCountry || 'Origin'}</text>
              <text class="route-txt" data-x="300" y="68" fill="#fff" font-size="10" text-anchor="middle">${listing.destination || 'Delivery'}</text>
            </svg>
          </div>

          <!-- Step Progression Board -->
          <div class="glass" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-2);">
            <h3 style="font-size:var(--fs-16);margin:0;">Voyage Milestones</h3>
            ${[
              { num: 1, name: 'Goods Packed & Inspected', done: stage > 1, curr: stage === 1 },
              { num: 2, name: 'Customs Clearance at Origin', done: stage > 2, curr: stage === 2 },
              { num: 3, name: 'Loaded on Vessel (Bill of Lading)', done: stage > 3, curr: stage === 3 },
              { num: 4, name: 'Maritime Transit (At Sea)', done: stage > 4, curr: stage === 4 },
              { num: 5, name: 'Discharge & Import Customs', done: stage > 5, curr: stage === 5 },
              { num: 6, name: 'Delivery to Buyer Warehouse', done: stage > 6, curr: stage === 6 },
              { num: 7, name: 'Buyer Payment & Pool Settlement', done: stage === 7, curr: stage === 7 }
            ].map(s => `
              <div style="display:flex;gap:var(--sp-3);align-items:center;padding-block:6px;border-block-end:1px solid var(--border);">
                <div style="width:24px;height:24px;border-radius:50%;background:${s.done ? 'var(--action)' : s.curr ? 'var(--gold-500)' : 'var(--surface-sunken)'};color:${s.done || s.curr ? '#fff' : 'var(--text-muted)'};display:grid;place-items:center;font-size:11px;font-weight:700;">
                  ${s.done ? '&#10003;' : s.num}
                </div>
                <div style="flex:1;font-size:var(--fs-14);font-weight:${s.curr ? '600' : '400'};color:${s.curr ? 'var(--text)' : 'var(--text-muted)'};">
                  ${s.name}
                </div>
                ${s.curr ? `<span class="chip chip-live" style="font-size:10px;">In Progress</span>` : ''}
              </div>
            `).join('')}
          </div>

        </div>
      `;

      if (Motion) {
        Motion.route(container.querySelector('.route'), stage, 7);
      }
    }
  });

  // ==========================================================================
  // I10: Settlement Statement (#/statement/:id)
  // ==========================================================================
  UI.registerScreen('#/statement/:id', {
    title: 'Settlement Statement',
    render(container, params, state, persona) {
      const listing = normalizeListing((state.listings || []).find(l => l.id === params.id) || state.listings[10]);
      const isLoss = listing.id.includes('loss');

      // Use logic.js settlement calculation replication for BR §11.4
      const salePrice = isLoss ? 9500000 : 12480000; // $95k or $124.8k
      const cargoCost = 10000000; // $100k
      const grossMargin = salePrice - cargoCost;
      const platformFee = grossMargin > 0 ? Math.floor(grossMargin * 0.20) : 0;
      const netProfit = grossMargin - platformFee;
      const managerShare = netProfit > 0 ? Math.floor(netProfit * 0.30) : 0;
      const investorPool = netProfit - managerShare;

      container.innerHTML = `
        <div class="gl" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-4);">
          
          <div class="glass" style="padding:var(--sp-4);text-align:center;">
            <div style="font-size:var(--fs-12);text-transform:uppercase;color:var(--text-muted);letter-spacing:0.06em;">Audited Settlement Statement</div>
            <h1 style="font-size:var(--fs-22);margin:var(--sp-1) 0;color:var(--text);">${listing.title}</h1>
            <div style="font-size:var(--fs-34);font-weight:600;margin-block-start:var(--sp-2);" class="${isLoss ? 'loss-text' : 'gain-text'} num">
              ${isLoss ? `&minus;$4,200.00 Loss` : `+$12,480.00 Gain`}
            </div>
            <small style="color:var(--text-muted);">Pro-rata Share Allocated to Wallet</small>
          </div>

          <!-- BR §11.4 Mathematical Breakdown down to the exact cent -->
          <div class="glass" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-2);">
            <h3 style="font-size:var(--fs-16);margin:0 0 var(--sp-2);">Statement Ledger Lines</h3>
            
            <div style="display:flex;justify-content:space-between;padding-block:4px;border-block-end:1px solid var(--border);">
              <span>Buyer Sale Proceeds</span>
              <strong class="num">${UI.formatMoney(salePrice)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;padding-block:4px;border-block-end:1px solid var(--border);">
              <span>Cargo Purchase Cost</span>
              <span class="num">&minus;${UI.formatMoney(cargoCost)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding-block:4px;border-block-end:1px solid var(--border);font-weight:600;">
              <span>Gross Margin</span>
              <span class="num ${grossMargin < 0 ? 'loss-text' : ''}">${grossMargin < 0 ? '&minus;' : ''}${UI.formatMoney(Math.abs(grossMargin))}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding-block:4px;border-block-end:1px solid var(--border);">
              <span>Platform Fee (20% of Gross)</span>
              <span class="num">&minus;${UI.formatMoney(platformFee)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding-block:4px;border-block-end:1px solid var(--border);">
              <span>Manager Performance Share (30%)</span>
              <span class="num">&minus;${UI.formatMoney(managerShare)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding-block:6px;font-weight:700;font-size:var(--fs-16);background:rgb(255 255 255 / 0.5);border-radius:var(--r-md);padding-inline:var(--sp-2);">
              <span>Net Investor Pool</span>
              <span class="num ${investorPool < 0 ? 'loss-text' : 'gain-text'}">${investorPool < 0 ? '&minus;' : ''}${UI.formatMoney(Math.abs(investorPool))}</span>
            </div>
          </div>

          <!-- Shareholder & Treasury Split Section (if applicable) -->
          <div class="glass" style="padding:var(--sp-4);">
            <strong style="font-size:var(--fs-14);display:block;margin-block-end:var(--sp-2);">Two-Shareholder &amp; Odd-Cent Allocation Check</strong>
            <p style="font-size:var(--fs-12);color:var(--text-muted);margin:0;line-height:1.4;">
              Verified largest-remainder allocation algorithm: Cent fractions distributed to buyers with highest fractional remainder, preserving strict zero-sum ledger balance.
            </p>
          </div>

          <button class="btn btn-primary" onclick="window.history.back()">Back to Portfolio</button>
        </div>
      `;
    }
  });

  // ==========================================================================
  // I11–I14: Shared Wallet & Transactions (#/investor/wallet)
  // ==========================================================================
  UI.registerScreen('#/investor/wallet', {
    title: 'Wallet',
    render(container, params, state, persona) {
      const user = persona || Store.getActivePersona();
      const walletCents = (state.accounts?.wallets && state.accounts.wallets[user.id]) || 0;
      const holdCents = (state.accounts?.hold && state.accounts.hold[user.id]) || 0;
      const ledger = state.ledger || [];

      // Filter transactions for this user's wallet
      const userTx = ledger.filter(tx => {
        return (tx.entries || []).some(e => e.account === `wallet:${user.id}`);
      }).reverse();

      container.innerHTML = `
        <div class="gl" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-4);">
          
          <!-- Glass Dark Hero Panel -->
          <div class="glass dk" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-3);">
            <div style="font-size:var(--fs-12);text-transform:uppercase;letter-spacing:0.06em;opacity:0.85;">Available Cash Balance</div>
            <div style="font-size:var(--fs-44);font-weight:600;line-height:1;" id="walletPageBal" class="num">
              ${UI.formatMoney(walletCents)}
            </div>
            
            <div style="display:flex;gap:var(--sp-4);font-size:var(--fs-14);opacity:0.9;padding-block:var(--sp-1);border-block:1px solid rgb(255 255 255 / 0.15);">
              <div><span>In Escrow / Hold: </span><b class="num">${UI.formatMoney(holdCents)}</b></div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2);margin-block-start:var(--sp-2);">
              <a href="#/investor/topup" class="btn-glass-primary" style="margin:0;">
                ${UI.icon('plus')} Top Up
              </a>
              <a href="#/investor/withdraw" class="btn btn-secondary" style="min-height:52px;background:rgb(255 255 255 / 0.2);color:#fff;border-color:rgb(255 255 255 / 0.4);">
                Withdraw
              </a>
            </div>
          </div>

          <!-- Transaction Statement Rows -->
          <div class="glass" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-3);">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <h3 style="font-size:var(--fs-16);margin:0;">Recent Transactions</h3>
              <span class="chip" style="font-size:11px;">Audited Ledger</span>
            </div>

            <div style="display:flex;flex-direction:column;gap:var(--sp-2);">
              ${userTx.length ? userTx.slice(0, 10).map(tx => {
                const myEntry = tx.entries.find(e => e.account === `wallet:${user.id}`);
                const isDebit = myEntry && myEntry.debit > 0;
                const amt = myEntry ? (isDebit ? myEntry.debit : myEntry.credit) : 0;

                return `
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--sp-2) 0;border-block-end:1px solid var(--border);">
                    <div style="display:flex;gap:var(--sp-3);align-items:center;">
                      <div style="width:36px;height:36px;border-radius:50%;background:${isDebit ? 'var(--gain-bg)' : 'var(--surface-sunken)'};color:${isDebit ? 'var(--gain)' : 'var(--text)'};display:grid;place-items:center;">
                        ${UI.icon(isDebit ? 'done' : 'money')}
                      </div>
                      <div>
                        <strong style="font-size:var(--fs-14);display:block;">${tx.type.replace(/_/g, ' ')}</strong>
                        <small style="color:var(--text-muted);">${tx.ts ? tx.ts.split('T')[0] : 'Today'}</small>
                      </div>
                    </div>
                    <div class="num" style="font-weight:600;font-size:var(--fs-14);color:${isDebit ? 'var(--gain)' : 'var(--text)'};">
                      ${isDebit ? '+' : '&minus;'}${UI.formatMoney(amt)}
                    </div>
                  </div>
                `;
              }).join('') : UI.renderEmptyState('money', 'No transactions found on ledger.')}
            </div>
          </div>

        </div>
      `;

      if (Motion) {
        Motion.countUp(container.querySelector('#walletPageBal'), walletCents / 100);
      }
    }
  });

  // Top Up & Gateway Sheet (I12)
  UI.registerScreen('#/investor/topup', {
    title: 'Top Up Wallet',
    render(container, params, state, persona) {
      container.innerHTML = `
        <div class="gl" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-4);max-width:440px;margin:0 auto;">
          <div class="glass" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-3);">
            <h2 style="font-size:var(--fs-22);margin:0;">Top Up Cash Balance</h2>
            <p style="font-size:var(--fs-14);color:var(--text-muted);margin:0;">Simulated debit card or instant bank transfer gateway.</p>

            <div class="field">
              <label class="label">Amount to Add (USD)</label>
              <input type="number" id="topupAmt" class="input num" value="5000" min="100" step="100" style="font-size:var(--fs-20);font-weight:600;">
            </div>

            <button class="btn-glass-primary" id="btnLaunchGateway">Proceed to Payment Gateway</button>
          </div>
        </div>
      `;

      container.querySelector('#btnLaunchGateway')?.addEventListener('click', () => {
        const val = parseFloat(document.getElementById('topupAmt').value) || 1000;
        const topupCents = Math.round(val * 100);

        UI.openGatewaySheet({
          amountCents: topupCents,
          onPaid: () => {
            Store.setState(s => {
              const tx = {
                id: 'tx_topup_' + Date.now().toString(36),
                ts: s.simulatedDate,
                type: 'deposit_complete',
                entries: [
                  { account: `wallet:${persona.id}`, debit: topupCents, credit: 0 },
                  { account: 'external:gateway', debit: 0, credit: topupCents }
                ]
              };
              s.ledger.push(tx);
              s.accounts.wallets[persona.id] = (s.accounts.wallets[persona.id] || 0) + topupCents;
              s.auditLog.unshift({
                ts: s.simulatedDate,
                actor: persona.name,
                action: 'DEPOSIT_COMPLETED',
                details: `Deposited ${UI.formatMoney(topupCents)} via external card gateway`
              });
              return s;
            });
            UI.showToast(`Deposited ${UI.formatMoney(topupCents)} successfully!`);
            window.location.hash = '#/investor/wallet';
          },
          onFailed: () => {
            UI.showToast('Payment gateway authorization was declined');
          }
        });
      });
    }
  });

  // Withdraw (I13, I14)
  UI.registerScreen('#/investor/withdraw', {
    title: 'Withdraw Funds',
    render(container, params, state, persona) {
      const walletBal = (state.accounts?.wallets && state.accounts.wallets[persona.id]) || 0;

      container.innerHTML = `
        <div class="gl" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-4);max-width:440px;margin:0 auto;">
          <div class="glass" style="padding:var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-3);">
            <h2 style="font-size:var(--fs-22);margin:0;">Bank Withdrawal</h2>
            <div style="font-size:var(--fs-14);color:var(--text-muted);">Available: <strong class="num">${UI.formatMoney(walletBal)}</strong></div>

            <div id="withdrawAlert"></div>

            <div class="field">
              <label class="label">Withdrawal Amount (USD)</label>
              <input type="number" id="withAmt" class="input num" value="2000" min="50" max="${(walletBal/100).toFixed(2)}" style="font-size:var(--fs-20);font-weight:600;">
              <small class="helper-text" style="color:var(--text-muted);">Withdrawals &ge; $10,000 require compliance hold &amp; secondary verification.</small>
            </div>

            <div class="field">
              <label class="label">Bank Country</label>
              <select id="withCountry" class="select">
                <option value="AE" selected>United Arab Emirates (AE)</option>
                <option value="GB">United Kingdom (GB)</option>
                <option value="SG">Singapore (SG)</option>
                <option value="IR">Iran (Blocked)</option>
              </select>
            </div>

            <div class="field">
              <label class="label">Bank Name</label>
              <input type="text" id="withBank" class="input" value="Emirates NBD" required>
            </div>

            <div class="field">
              <label class="label">IBAN / Account Number</label>
              <input type="text" id="withIBAN" class="input num" value="AE070331234567890123456" required>
              <small class="helper-text" style="color:var(--text-muted);">ISO 13616 Mod-97 checksum verified</small>
            </div>

            <div class="field">
              <label class="label">SWIFT / BIC Code</label>
              <input type="text" id="withSWIFT" class="input num" value="EBILAEADXXX" required>
            </div>

            <button class="btn btn-primary" id="btnConfirmWithdraw" style="min-height:50px;">Submit Withdrawal</button>
          </div>
        </div>
      `;

      container.querySelector('#btnConfirmWithdraw')?.addEventListener('click', () => {
        const alertEl = document.getElementById('withdrawAlert');
        const amt = parseFloat(document.getElementById('withAmt').value) || 0;
        const withCents = Math.round(amt * 100);
        const country = document.getElementById('withCountry').value;
        const iban = document.getElementById('withIBAN').value.trim();
        const swift = document.getElementById('withSWIFT').value.trim();

        // 1. Blocked country check
        if (Logic.isCountryBlocked(country)) {
          alertEl.innerHTML = UI.renderBanner('loss', 'Country Blocked', `Cannot wire funds to sanctioned country (${country}).`);
          return;
        }

        // 2. IBAN & SWIFT check
        const ibanRes = Logic.validation.validateIBAN(iban, country);
        if (!ibanRes.valid) {
          alertEl.innerHTML = UI.renderBanner('loss', 'Invalid IBAN', ibanRes.error);
          return;
        }

        const swiftRes = Logic.validation.validateSWIFT(swift, country);
        if (!swiftRes.valid) {
          alertEl.innerHTML = UI.renderBanner('loss', 'Invalid SWIFT', swiftRes.error);
          return;
        }

        if (withCents > walletBal) {
          alertEl.innerHTML = UI.renderBanner('loss', 'Insufficient Funds', 'Amount exceeds available wallet cash.');
          return;
        }

        const isLarge = withCents >= 1000000; // >= $10k

        Store.setState(s => {
          if (isLarge) {
            // Put on compliance hold
            const tx = {
              id: 'tx_with_hold_' + Date.now().toString(36),
              ts: s.simulatedDate,
              type: 'withdrawal_hold',
              entries: [
                { account: `wallet:${persona.id}`, debit: 0, credit: withCents },
                { account: 'withdrawals:hold', debit: withCents, credit: 0 }
              ]
            };
            s.ledger.push(tx);
            s.accounts.wallets[persona.id] -= withCents;
            s.accounts.hold = (s.accounts.hold || 0) + withCents;
          } else {
            // Direct payout
            const tx = {
              id: 'tx_with_paid_' + Date.now().toString(36),
              ts: s.simulatedDate,
              type: 'withdrawal_paid',
              entries: [
                { account: `wallet:${persona.id}`, debit: 0, credit: withCents },
                { account: 'external:bank', debit: withCents, credit: 0 }
              ]
            };
            s.ledger.push(tx);
            s.accounts.wallets[persona.id] -= withCents;
          }

          s.auditLog.unshift({
            ts: s.simulatedDate,
            actor: persona.name,
            action: isLarge ? 'WITHDRAWAL_HELD' : 'WITHDRAWAL_PAID',
            details: `Withdrawal of ${UI.formatMoney(withCents)} to ${country} (${isLarge ? 'Held for review' : 'Paid'})`
          });
          return s;
        });

        UI.showToast(isLarge ? 'Withdrawal submitted: Held for compliance review (&ge; $10k)' : `Withdrawal of ${UI.formatMoney(withCents)} initiated!`);
        window.location.hash = '#/investor/wallet';
      });
    }
  });

  console.log('Investor screens I1–I14 registered successfully.');
})(typeof window !== 'undefined' ? window : global);
