// logic.js - Pure domain module for Shehnat Mock UI v4.
// Contains: Money maths & settlements (BR §6.3, §11.4), projections (BR §6.4),
// Stage derivation from Steps (BR §5.4), validations (BR §3, §4, §6, §7),
// permissions & four-eyes checks (BR §11.6), and double-entry ledger (BR §6.7).
// PROTOTYPE, throwaway. Wipe me.

(function(global) {
  'use strict';

  const BLOCKED_COUNTRIES = ['IR', 'KP', 'SY', 'CU', 'RU', 'BY'];

  // ==========================================================================
  // 1. Math & Projection Utilities (BR §6.4)
  // ==========================================================================
  const ShehnatMath = {
    // Calculates listing target, cycle and expected profit from shipments and steps
    calculateListingTarget(shipments = []) {
      let totalCostOfGoods = 0;
      let totalPlannedStepCosts = 0;
      let totalExpectedSale = 0;
      let maxCycleDays = 0;

      for (const ship of shipments) {
        totalCostOfGoods += (ship.expectedCostOfGoods || 0);
        totalExpectedSale += (ship.expectedSalePrice || 0);

        let shipStepDuration = 0;
        if (Array.isArray(ship.steps)) {
          for (const step of ship.steps) {
            totalPlannedStepCosts += (step.plannedCost || 0);
            shipStepDuration += (step.plannedDurationDays || 0);
          }
        }
        const shipCycle = (ship.plannedStartDays || 0) + shipStepDuration;
        if (shipCycle > maxCycleDays) maxCycleDays = shipCycle;
      }

      const fundingTarget = totalCostOfGoods + totalPlannedStepCosts;
      const expectedProfit = totalExpectedSale - fundingTarget;

      return {
        fundingTarget,
        cycleDays: Math.max(1, maxCycleDays),
        expectedProfit,
        totalCostOfGoods,
        totalPlannedStepCosts,
        totalExpectedSale
      };
    },

    // BR §6.4: Projected returns shown before the sale
    calculateProjection({ fundingTarget, expectedProfit, investorSharePct, cycleDays, managerDepositPct = 0 }) {
      const target = Number(fundingTarget) || 0;
      const profit = Number(expectedProfit) || 0;
      const invSharePct = Number(investorSharePct) || 0;
      const cycle = Math.max(1, Number(cycleDays) || 1);

      const revenue = target + profit;
      const gross = profit;
      // 1% of revenue only if gross > 0, never more than gross
      const fee = gross > 0 ? Math.min(Math.round(revenue * 0.01), gross) : 0;
      const net = gross - fee;

      // Manager share of net profit
      const managerShare = net > 0 ? Math.floor(net * (100 - invSharePct) / 100) : 0;
      const pool = net - managerShare;

      // ROI per cycle & per year
      const roiCycleDecimal = target > 0 ? (pool / target) : 0;
      const roiPerCyclePct = Math.round(roiCycleDecimal * 1000) / 10; // 0.1% precision
      const roiPerYearPct = Math.round((roiCycleDecimal * (365 / cycle)) * 1000) / 10;

      // Manager projected earnings
      const managerCapitalProfit = (managerDepositPct > 0 && target > 0)
        ? Math.round(pool * (managerDepositPct / 100))
        : 0;

      return {
        revenue,
        gross,
        fee,
        net,
        managerShare,
        pool,
        roiPerCyclePct,
        roiPerYearPct,
        managerCapitalProfit,
        totalManagerReturn: managerShare + managerCapitalProfit
      };
    }
  };

  // ==========================================================================
  // 2. Settlement Formula (BR §6.3 & §11.4)
  // ==========================================================================
  const ShehnatSettlement = {
    // Computes final settlement with Hamilton's largest-remainder rounding method
    calculate({
      listing,
      saleProceedsReceived,
      paidCosts,
      contributions = [],
      isShareholderListing = false,
      shareholderSharePct = 75,
      twoShareholders = false
    }) {
      const salePrice = Number(saleProceedsReceived) || 0;
      const costs = Number(paidCosts) || 0;
      const gross = salePrice - costs;

      // Fee: 1% of sale price, only if gross > 0, never more than gross
      const fee = gross > 0 ? Math.min(Math.round(salePrice * 0.01), gross) : 0;
      const net = gross - fee;

      const investorSharePct = Number(listing.investorSharePct) || 0;
      // Manager share: (100 - investorShare)% of net, only if net > 0 (rounded down -> manager)
      const managerShare = net > 0 ? Math.floor(net * (100 - investorSharePct) / 100) : 0;
      // Pool: net - manager (negative on loss)
      const pool = net - managerShare;

      // Total capital raised across all contributions
      const totalCapital = contributions.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

      // Pro-rata distribution of pool using Largest Remainder Method
      const isProfit = pool >= 0;
      const absPool = Math.abs(pool);

      let allocatedAbsTotal = 0;
      const breakdown = contributions.map(c => {
        const capital = Number(c.amount) || 0;
        const exactSlice = totalCapital > 0 ? (absPool * capital) / totalCapital : 0;
        const floorSlice = Math.floor(exactSlice);
        const remainder = exactSlice - floorSlice;
        allocatedAbsTotal += floorSlice;

        return {
          id: c.id,
          userId: c.userId,
          source: c.source, // 'investor', 'manager', 'treasury_standin', 'treasury_overdue', 'treasury_overrun'
          capital,
          allocatedSlice: floorSlice,
          remainder,
          profit: 0,
          payout: 0
        };
      });

      // Distribute remaining cents by largest remainder
      let remainingCents = Math.round(absPool - allocatedAbsTotal);
      breakdown.sort((a, b) => b.remainder - a.remainder);
      for (let i = 0; i < remainingCents; i++) {
        breakdown[i % breakdown.length].allocatedSlice += 1;
      }

      // Assign final profit (signed) and payout per contribution
      let treasuryProfit = 0;
      let treasuryCapital = 0;

      for (const item of breakdown) {
        item.profit = isProfit ? item.allocatedSlice : -item.allocatedSlice;
        item.payout = Math.max(0, item.capital + item.profit);

        if (item.source && item.source.startsWith('treasury')) {
          treasuryProfit += item.profit;
          treasuryCapital += item.capital;
        }
      }

      // Shareholder Listing adjustment (BR §11.4)
      let shareholderShare = 0;
      let reserveFundShare = 0;
      let managerShareholderShare = 0;
      let buyerShareholderShare = 0;
      let finalTreasuryPayout = treasuryCapital + (treasuryProfit <= 0 ? treasuryProfit : 0);

      if (isShareholderListing) {
        if (treasuryProfit > 0) {
          // Rounded down to the cent, remainder goes to Reserve fund (BR §11.4)
          shareholderShare = Math.floor(treasuryProfit * (shareholderSharePct / 100) * 100) / 100;
          reserveFundShare = Math.round((treasuryProfit - shareholderShare) * 100) / 100;

          if (twoShareholders) {
            // Split equally, odd cent goes to buyer (BR §11.4)
            const totalCents = Math.round(shareholderShare * 100);
            const managerCents = Math.floor(totalCents / 2);
            const buyerCents = totalCents - managerCents;
            managerShareholderShare = managerCents / 100;
            buyerShareholderShare = buyerCents / 100;
          } else {
            buyerShareholderShare = shareholderShare;
          }
        }
      }

      return {
        salePrice,
        costs,
        gross,
        fee,
        net,
        managerShare,
        pool,
        totalCapital,
        contributions: breakdown,
        treasury: {
          capital: treasuryCapital,
          profit: treasuryProfit,
          payout: finalTreasuryPayout
        },
        shareholder: {
          isShareholderListing,
          shareholderTotal: shareholderShare,
          reserveFund: reserveFundShare,
          managerShareholder: managerShareholderShare,
          buyerShareholder: buyerShareholderShare
        }
      };
    },

    // Self-check of the worked examples in BR §6.4 and §11.4
    runSelfCheck() {
      const results = [];

      // Test 1: BR §6.4 Projection Worked Example
      // Target: $100,000, expected profit: $20,000, investor share: 40%, 60-day cycle
      const proj = ShehnatMath.calculateProjection({
        fundingTarget: 100000,
        expectedProfit: 20000,
        investorSharePct: 40,
        cycleDays: 60
      });

      const p1Pass = (
        proj.fee === 1200 &&
        proj.net === 18800 &&
        proj.managerShare === 11280 &&
        proj.pool === 7520 &&
        proj.roiPerCyclePct === 7.5 &&
        proj.roiPerYearPct === 45.7
      );

      results.push({
        name: 'BR §6.4 Projection Worked Example',
        expected: 'fee 1200, net 18800, manager 11280, pool 7520, ROI 7.5% cycle, 45.7% year',
        actual: `fee ${proj.fee}, net ${proj.net}, manager ${proj.managerShare}, pool ${proj.pool}, ROI ${proj.roiPerCyclePct}% cycle, ${proj.roiPerYearPct}% year`,
        passed: p1Pass
      });

      // Test 2: BR §11.4 Shareholder Settlement Worked Example
      // Target 100,000. Stand-in 20,000 (20%), Investors 70,000 (70%), Overdue fill 10,000 (10%).
      // Cost 95,000, Sold for 110,000. Investor share 60%.
      const sett = this.calculate({
        listing: { investorSharePct: 60 },
        saleProceedsReceived: 110000,
        paidCosts: 95000,
        contributions: [
          { id: 'c1', userId: 'treasury', source: 'treasury_standin', amount: 20000 },
          { id: 'c2', userId: 'inv1', source: 'investor', amount: 70000 },
          { id: 'c3', userId: 'treasury', source: 'treasury_overdue', amount: 10000 }
        ],
        isShareholderListing: true,
        shareholderSharePct: 75,
        twoShareholders: false
      });

      const s2Pass = (
        sett.gross === 15000 &&
        sett.fee === 1100 &&
        sett.net === 13900 &&
        sett.managerShare === 5560 &&
        sett.pool === 8340 &&
        sett.treasury.profit === 2502 &&
        sett.shareholder.shareholderTotal === 1876.5 && // 75% of 2502
        sett.shareholder.reserveFund === 625.5 &&        // 25% of 2502
        sett.treasury.payout === 30000
      );

      results.push({
        name: 'BR §11.4 Shareholder Settlement Worked Example',
        expected: 'gross 15000, fee 1100, net 13900, manager 5560, pool 8340, treasury profit 2502, shareholder 1876.50, reserve 625.50, treasury payout 30000',
        actual: `gross ${sett.gross}, fee ${sett.fee}, net ${sett.net}, manager ${sett.managerShare}, pool ${sett.pool}, treasury profit ${sett.treasury.profit}, shareholder ${sett.shareholder.shareholderTotal}, reserve ${sett.shareholder.reserveFund}, treasury payout ${sett.treasury.payout}`,
        passed: s2Pass
      });

      // Test 3: BR §11.4 Two-Shareholder split (odd cent to buyer)
      const settTwo = this.calculate({
        listing: { investorSharePct: 60 },
        saleProceedsReceived: 110000,
        paidCosts: 95000,
        contributions: [
          { id: 'c1', userId: 'treasury', source: 'treasury_standin', amount: 30000 },
          { id: 'c2', userId: 'inv1', source: 'investor', amount: 70000 }
        ],
        isShareholderListing: true,
        shareholderSharePct: 75,
        twoShareholders: true
      });

      const totalCents = Math.round(settTwo.shareholder.shareholderTotal * 100);
      const expectedManager = Math.floor(totalCents / 2) / 100;
      const expectedBuyer = (totalCents - Math.floor(totalCents / 2)) / 100;

      const oddCentPass = (
        settTwo.shareholder.managerShareholder === expectedManager &&
        settTwo.shareholder.buyerShareholder === expectedBuyer
      );

      results.push({
        name: 'BR §11.4 Two-Shareholder Equal/Odd-Cent Allocation',
        expected: `manager ${expectedManager}, buyer ${expectedBuyer}`,
        actual: `manager ${settTwo.shareholder.managerShareholder}, buyer ${settTwo.shareholder.buyerShareholder}`,
        passed: oddCentPass
      });

      const allPassed = results.every(r => r.passed);
      return { passed: allPassed, results };
    }
  };

  // ==========================================================================
  // 3. Stage Derivation & Time-based Checks (BR §5.4, §6.1)
  // ==========================================================================
  const ShehnatWorkflow = {
    // Derives stage for a shipment based on its completed/verified steps
    // Stages: 0: Listed/Funding, 1: Goods purchased, 2: Packed, 3: In transit, 4: Customs, 5: Received, 6: Sold, 7: Settled
    deriveStage(shipment, currentStage = 0) {
      if (!shipment || !Array.isArray(shipment.steps)) return currentStage;

      // Group steps by stage tag (1..6)
      const stageSteps = {};
      for (const step of shipment.steps) {
        if (step.stageTag) {
          stageSteps[step.stageTag] = stageSteps[step.stageTag] || [];
          stageSteps[step.stageTag].push(step);
        }
      }

      let derived = currentStage;
      // Stages advance sequentially from 1 to 6
      for (let s = 1; s <= 6; s++) {
        const steps = stageSteps[s];
        if (!steps || steps.length === 0) continue;

        // All steps for stage s must be completed:
        // - if requiresVerification: status must be 'verified' or 'skipped'
        // - if not: status must be 'done', 'verified', or 'skipped'
        const allSatisfied = steps.every(st => {
          if (st.status === 'skipped') return true;
          if (st.requiresVerification) return st.status === 'verified';
          return st.status === 'done' || st.status === 'verified';
        });

        if (allSatisfied) {
          derived = Math.max(derived, s);
        } else {
          // Cannot skip ahead of an incomplete stage
          break;
        }
      }

      // Stage never moves backwards (BR §5.4)
      return Math.max(currentStage, derived);
    },

    // Checks for Late steps given current simulated date
    checkLateSteps(shipment, simulatedDate) {
      if (!shipment || !Array.isArray(shipment.steps)) return { isLate: false, lateSteps: [] };
      const now = new Date(simulatedDate).getTime();
      const lateSteps = [];

      for (const step of shipment.steps) {
        if (step.plannedEndDate && !['done', 'verified', 'skipped'].includes(step.status)) {
          const deadline = new Date(step.plannedEndDate).getTime();
          if (now > deadline) {
            const delayDays = Math.ceil((now - deadline) / (1000 * 60 * 60 * 24));
            lateSteps.push({ stepId: step.id, name: step.name, delayDays });
          }
        }
      }

      return {
        isLate: lateSteps.length > 0,
        lateSteps
      };
    },

    // Checks if listing is Overdue in funding (day >= 5 at stage 0)
    isListingOverdue(listing, simulatedDate, overdueDays = 5) {
      if (!listing || listing.status !== 'live' || listing.stage > 0) return false;
      if (!listing.liveDate) return false;

      const liveTime = new Date(listing.liveDate).getTime();
      const now = new Date(simulatedDate).getTime();
      const daysOpen = (now - liveTime) / (1000 * 60 * 60 * 24);

      const raised = Number(listing.raised) || 0;
      const target = Number(listing.target) || 0;

      return (daysOpen >= overdueDays && raised < target);
    },

    // Checks if approved listing is past 14-day deposit window -> auto-withdraw
    isDepositPastDue(listing, simulatedDate, autoWithdrawDays = 14) {
      if (!listing || listing.status !== 'approved' || listing.depositPaid) return false;
      if (!listing.approvedDate) return false;

      const appTime = new Date(listing.approvedDate).getTime();
      const now = new Date(simulatedDate).getTime();
      const daysWaiting = (now - appTime) / (1000 * 60 * 60 * 24);

      return daysWaiting >= autoWithdrawDays;
    }
  };

  // ==========================================================================
  // 4. Validations (BR §3, §4, §6, §7)
  // ==========================================================================
  const ShehnatValidation = {
    isCountryBlocked(code) {
      if (!code) return false;
      return BLOCKED_COUNTRIES.includes(code.trim().toUpperCase());
    },

    validateEmail(email) {
      if (!email || typeof email !== 'string') return 'Email is required';
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!re.test(email.trim())) return 'Invalid email address';
      return null;
    },

    validatePassword(pwd) {
      if (!pwd || pwd.length < 8) return 'Password must be at least 8 characters';
      if (!/[A-Z]/.test(pwd)) return 'Password must contain an uppercase letter';
      if (!/[a-z]/.test(pwd)) return 'Password must contain a lowercase letter';
      if (!/[0-9]/.test(pwd)) return 'Password must contain a number';
      return null;
    },

    validateDOB(dobStr, currentDate) {
      if (!dobStr) return 'Date of birth is required';
      const d = new Date(dobStr);
      if (isNaN(d.getTime())) return 'Invalid date of birth';

      const now = currentDate ? new Date(currentDate) : new Date();
      let age = now.getFullYear() - d.getFullYear();
      const m = now.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
        age--;
      }
      if (age < 18) return 'Investor must be at least 18 years old';
      return null;
    },

    validatePhone(phone) {
      if (!phone || typeof phone !== 'string') return 'Phone number is required';
      const clean = phone.replace(/[\s\-\(\)]/g, '');
      if (!clean.startsWith('+')) return 'Phone must start with international code (+)';
      const digits = clean.slice(1);
      if (!/^\d{7,15}$/.test(digits)) return 'Phone must contain 7 to 15 digits';
      return null;
    },

    // ISO 13616 IBAN Mod-97 validation
    validateIBAN(iban, bankCountry) {
      if (!iban || typeof iban !== 'string') return 'IBAN is required';
      const clean = iban.replace(/\s+/g, '').toUpperCase();
      if (clean.length < 15 || clean.length > 34) return 'Invalid IBAN length';

      const ibanCountry = clean.slice(0, 2);
      if (bankCountry && ibanCountry !== bankCountry.toUpperCase()) {
        return `IBAN country (${ibanCountry}) does not match bank country (${bankCountry})`;
      }

      // Move first 4 chars to the end
      const rearranged = clean.slice(4) + clean.slice(0, 4);
      // Replace letters with numbers (A=10, B=11, ... Z=35)
      let numStr = '';
      for (let i = 0; i < rearranged.length; i++) {
        const code = rearranged.charCodeAt(i);
        if (code >= 65 && code <= 90) {
          numStr += (code - 55).toString();
        } else if (code >= 48 && code <= 57) {
          numStr += rearranged[i];
        } else {
          return 'IBAN contains invalid characters';
        }
      }

      // Big integer modulo 97 check
      let remainder = 0;
      for (let i = 0; i < numStr.length; i += 7) {
        const block = remainder + numStr.substring(i, i + 7);
        remainder = (parseInt(block, 10) % 97).toString();
      }

      if (parseInt(remainder, 10) !== 1) {
        return 'IBAN checksum failed';
      }
      return null;
    },

    validateSWIFT(swift, bankCountry) {
      if (!swift || typeof swift !== 'string') return 'SWIFT/BIC code is required';
      const clean = swift.replace(/\s+/g, '').toUpperCase();
      if (clean.length !== 8 && clean.length !== 11) {
        return 'SWIFT/BIC must be 8 or 11 characters';
      }
      const swiftCountry = clean.slice(4, 6);
      if (bankCountry && swiftCountry !== bankCountry.toUpperCase()) {
        return `SWIFT country (${swiftCountry}) does not match bank country (${bankCountry})`;
      }
      return null;
    },

    // Remainder Rule for Investment (BR §6.2)
    validateInvestment({ amount, minimum, remaining, walletBalance }) {
      const amt = Number(amount) || 0;
      const min = Number(minimum) || 0;
      const rem = Number(remaining) || 0;
      const bal = Number(walletBalance) || 0;

      if (amt <= 0) return 'Amount must be greater than zero';
      if (amt > bal) return 'Insufficient wallet balance. Top up to continue.';

      // Remainder rule: if remaining < minimum, investor must fund exactly remainder
      if (rem < min) {
        if (amt !== rem) {
          return `Only $${(rem/100).toLocaleString()} remains. You must invest exactly this amount.`;
        }
      } else {
        if (amt < min) {
          return `Minimum investment is $${(min/100).toLocaleString()}`;
        }
        if (amt > rem) {
          return `Amount exceeds remaining funding ($${(rem/100).toLocaleString()})`;
        }
      }

      return null;
    },

    // Listing term ranges (BR §6.1)
    validateListingTerms(terms, managerExposureLimit = 50000000) {
      const errors = {};

      if (!terms.name || terms.name.trim().length === 0) {
        errors.name = 'Listing name is required';
      } else if (terms.name.length > 120) {
        errors.name = 'Listing name must be 120 characters or fewer';
      }

      if (!terms.sourceCountry) {
        errors.sourceCountry = 'Source country is required';
      } else if (this.isCountryBlocked(terms.sourceCountry)) {
        errors.sourceCountry = 'Goods cannot be sourced from a blocked country';
      }

      if (!terms.buyerCountry) {
        errors.buyerCountry = 'Buyer country is required';
      } else if (this.isCountryBlocked(terms.buyerCountry)) {
        errors.buyerCountry = 'Buyer cannot be in a blocked country';
      } else if (terms.buyerCountry === terms.sourceCountry) {
        errors.buyerCountry = 'Source and buyer countries must differ';
      }

      const target = Number(terms.target) || 0;
      if (target < 100000 || target > 1000000000) { // $1,000 to $10,000,000 in cents
        errors.target = 'Target must be between $1,000 and $10,000,000';
      } else if (target > managerExposureLimit) {
        errors.target = `Target exceeds manager exposure limit of $${(managerExposureLimit/100).toLocaleString()}`;
      }

      const cycle = Number(terms.cycleDays) || 0;
      if (cycle < 1 || cycle > 365) {
        errors.cycleDays = 'Cycle must be between 1 and 365 days';
      }

      const depPct = Number(terms.managerDepositPct) || 0;
      if (depPct < 20 || depPct > 90) {
        errors.managerDepositPct = 'Manager deposit must be between 20% and 90%';
      }

      const invShare = Number(terms.investorSharePct) || 0;
      if (invShare < 40 || invShare > 95) {
        errors.investorSharePct = 'Investor share of profit must be between 40% and 95%';
      }

      return Object.keys(errors).length > 0 ? errors : null;
    }
  };

  // ==========================================================================
  // 5. Permissions & Four-Eyes Principles (BR §11.6, ADR 0001)
  // ==========================================================================
  const ShehnatPermissions = {
    canPerformAction({ user, action, proposal, application, listing }) {
      if (!user) return { allowed: false, reason: 'Authentication required' };

      // 1. Staff restrictions
      if (user.role === 'staff') {
        if (action === 'INVEST') {
          return { allowed: false, reason: 'Staff members cannot invest on the platform' };
        }
        if (action === 'WITHDRAW') {
          return { allowed: false, reason: 'Staff members cannot request withdrawals' };
        }
      }

      // 2. Suspended or Blocked user check
      if (user.isSuspended) {
        return { allowed: false, reason: 'Account is suspended by compliance' };
      }
      if (ShehnatValidation.isCountryBlocked(user.country)) {
        return { allowed: false, reason: 'Operation prohibited: user is in a blocked country' };
      }

      // 3. Four-Eyes Principle for high-stakes decisions
      if (action === 'APPROVE_SETTLEMENT') {
        if (user.role !== 'staff' || !['finance', 'owner'].includes(user.staffRole)) {
          return { allowed: false, reason: 'Only Finance or Owner can approve settlements' };
        }
        if (proposal && proposal.proposedBy === user.id) {
          return { allowed: false, reason: 'Needs another staff member to approve (four-eyes principle)' };
        }
        return { allowed: true };
      }

      if (action === 'APPROVE_WRITE_OFF' || action === 'APPROVE_RESALE') {
        if (user.role !== 'staff' || !['ops', 'owner'].includes(user.staffRole)) {
          return { allowed: false, reason: 'Only Ops or Owner can approve Write-off or Resale' };
        }
        if (proposal && proposal.proposedBy === user.id) {
          return { allowed: false, reason: 'Needs another ops staff member to approve (four-eyes principle)' };
        }
        return { allowed: true };
      }

      if (action === 'APPROVE_OVERRUN') {
        if (user.role !== 'staff' || !['finance', 'owner'].includes(user.staffRole)) {
          return { allowed: false, reason: 'Only Finance or Owner can approve overrun funding' };
        }
        if (proposal && proposal.proposedBy === user.id) {
          return { allowed: false, reason: 'Needs another staff member to approve (four-eyes principle)' };
        }
        return { allowed: true };
      }

      // 4. Withdrawal limits
      if (action === 'APPROVE_WITHDRAWAL') {
        if (user.role !== 'staff' || !['finance', 'owner'].includes(user.staffRole)) {
          return { allowed: false, reason: 'Only Finance or Owner can decide withdrawals' };
        }
        const amt = proposal ? Number(proposal.amount) : 0;
        // >= $10,000 (1,000,000 cents) needs Owner
        if (amt >= 1000000 && user.staffRole !== 'owner') {
          return { allowed: false, reason: 'Withdrawals of $10,000 or more require Owner approval' };
        }
        return { allowed: true };
      }

      // 5. Application review assignment
      if (action === 'DECIDE_APPLICATION') {
        if (user.role !== 'staff') {
          return { allowed: false, reason: 'Staff access required' };
        }
        if (application && application.assignedTo && application.assignedTo !== user.id && user.staffRole !== 'owner') {
          return { allowed: false, reason: `Assigned to another reviewer (requires assignee or Owner)` };
        }
        return { allowed: true };
      }

      // 6. Shareholder & Reserve fund actions (Owner only, BR §11.6)
      if (['MARK_SHAREHOLDER', 'TRANSFER_RESERVE_FUND', 'SET_EXPOSURE_LIMIT'].includes(action)) {
        if (user.staffRole !== 'owner') {
          return { allowed: false, reason: 'This action is restricted to the Platform Owner' };
        }
        return { allowed: true };
      }

      return { allowed: true };
    }
  };

  // ==========================================================================
  // 6. Double-Entry Ledger (BR §6.7)
  // ==========================================================================
  const ShehnatLedger = {
    // Non-negative account prefixes
    RESTRICTED_ACCOUNTS: ['wallet:', 'escrow:', 'platform:treasury', 'platform:revenue', 'platform:reserve', 'withdrawals:hold'],

    // Verifies that a transaction sums to zero
    validateTransaction(tx) {
      if (!tx || !Array.isArray(tx.entries) || tx.entries.length < 2) {
        return { ok: false, error: 'Transaction must contain at least 2 entries' };
      }
      let sum = 0;
      for (const entry of tx.entries) {
        sum += (Number(entry.amount) || 0);
      }
      if (sum !== 0) {
        return { ok: false, error: `Transaction does not balance (sum is ${sum})` };
      }
      return { ok: true };
    },

    // Calculates live balance for an account from ledger entries
    getBalance(accountName, ledger = []) {
      let balance = 0;
      for (const tx of ledger) {
        if (!Array.isArray(tx.entries)) continue;
        for (const entry of tx.entries) {
          if (entry.account === accountName) {
            balance += (Number(entry.amount) || 0);
          }
        }
      }
      return balance;
    },

    // Verifies complete ledger integrity (sum-to-zero and non-negative accounts)
    verify(ledger = []) {
      const accountBalances = {};
      let totalImbalance = 0;

      for (const tx of ledger) {
        const v = this.validateTransaction(tx);
        if (!v.ok) {
          return { ok: false, error: `Invalid transaction ${tx.id}: ${v.error}`, totalImbalance };
        }
        for (const entry of tx.entries) {
          accountBalances[entry.account] = (accountBalances[entry.account] || 0) + entry.amount;
        }
      }

      // Check non-negative constraints
      for (const [acc, bal] of Object.entries(accountBalances)) {
        for (const prefix of this.RESTRICTED_ACCOUNTS) {
          if (acc.startsWith(prefix) && bal < 0) {
            return { ok: false, error: `Account ${acc} breached non-negative rule with balance ${bal}`, accountBalances };
          }
        }
      }

      return {
        ok: true,
        transactionCount: ledger.length,
        accountBalances
      };
    }
  };

  // Export module globally
  global.ShehnatLogic = {
    version: '4.0.0',
    math: ShehnatMath,
    settlement: ShehnatSettlement,
    workflow: ShehnatWorkflow,
    validation: ShehnatValidation,
    permissions: ShehnatPermissions,
    ledger: ShehnatLedger,
    runSelfCheck() {
      return ShehnatSettlement.runSelfCheck();
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.ShehnatLogic;
  }

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
