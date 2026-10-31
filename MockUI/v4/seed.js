// seed.js - Seed data for Shehnat Mock UI v4.
// Holds: 13 Personas (PLAN §4), 15 Listings in every status, KYC & manager applications,
// platform accounts, and full double-entry ledger entries (ledger check passes at seed).
// PROTOTYPE, throwaway. Wipe me.

(function(global) {
  'use strict';

  const SEED_DATE = '2026-10-31T08:00:00Z';
  const DEMO_PASSWORD = 'shehnat-demo-1';

  // 1. Personas (PLAN §4)
  const personas = [
    {
      id: 'aisha',
      name: 'Aisha Rahman',
      email: 'aisha@example.com',
      password: DEMO_PASSWORD,
      role: 'investor',
      country: 'AE',
      residence: 'United Arab Emirates',
      kyc: 'approved',
      wallet: 2500000, // $25,000.00 in cents
      phone: '+971501234567',
      address: 'Downtown Dubai, UAE'
    },
    {
      id: 'ben',
      name: 'Ben Carter',
      email: 'ben@example.co.uk',
      password: DEMO_PASSWORD,
      role: 'investor',
      country: 'GB',
      residence: 'United Kingdom',
      kyc: 'none',
      wallet: 0,
      phone: '+447911123456',
      address: '74 High Street, London, UK'
    },
    {
      id: 'chen',
      name: 'Chen Li',
      email: 'chen.li@example.sg',
      password: DEMO_PASSWORD,
      role: 'investor',
      country: 'SG',
      residence: 'Singapore',
      kyc: 'pending',
      wallet: 0,
      phone: '+6591234567',
      address: '12 Marina Boulevard, Singapore'
    },
    {
      id: 'dina',
      name: 'Dina Haddad',
      email: 'dina@example.jo',
      password: DEMO_PASSWORD,
      role: 'investor',
      country: 'JO',
      residence: 'Jordan',
      kyc: 'rejected',
      kycRejectReason: 'Photo ID unreadable. Please provide a clear, glare-free colour scan.',
      wallet: 0,
      phone: '+962791234567',
      address: '5th Circle, Amman, Jordan'
    },
    {
      id: 'kerala',
      name: 'Kerala Spice Traders LLP',
      email: 'trade@keralaspices.in',
      password: DEMO_PASSWORD,
      role: 'manager',
      isBusiness: true,
      country: 'IN',
      residence: 'India',
      kyc: 'approved',
      wallet: 6000000, // $60,000.00
      exposureLimit: 50000000, // $500,000.00 limit
      phone: '+914842345678',
      address: 'Willingdon Island, Kochi, Kerala, India'
    },
    {
      id: 'mateo',
      name: 'Mateo Rojas',
      email: 'mateo.rojas@example.cl',
      password: DEMO_PASSWORD,
      role: 'manager',
      isBusiness: false,
      country: 'CL',
      residence: 'Chile',
      kyc: 'pending',
      wallet: 0,
      exposureLimit: 20000000, // $200,000.00 limit
      phone: '+56912345678',
      address: 'Av. Providencia 1200, Santiago, Chile'
    },
    {
      id: 'omar',
      name: 'Omar Al-Said',
      email: 'omar@example.om',
      password: DEMO_PASSWORD,
      role: 'manager',
      isShareholder: true,
      isBusiness: true,
      country: 'OM',
      residence: 'Oman',
      kyc: 'approved',
      wallet: 10000000, // $100,000.00
      exposureLimit: 100000000, // $1,000,000.00 limit
      phone: '+96891234567',
      address: 'Muttrah Corniche, Muscat, Oman'
    },
    {
      id: 'layla',
      name: 'Layla Nasser',
      email: 'layla.nasser@example.ae',
      password: DEMO_PASSWORD,
      role: 'investor',
      isShareholder: true,
      country: 'AE',
      residence: 'United Arab Emirates',
      kyc: 'approved',
      wallet: 5000000, // $50,000.00
      phone: '+971509876543',
      address: 'Al Bateen, Abu Dhabi, UAE'
    },
    {
      id: 'hadi',
      name: 'Hadi Karim',
      email: 'hadi@shehnat.com',
      password: DEMO_PASSWORD,
      role: 'staff',
      staffRole: 'owner',
      wallet: 0
    },
    {
      id: 'priya',
      name: 'Priya Nair',
      email: 'priya@shehnat.com',
      password: DEMO_PASSWORD,
      role: 'staff',
      staffRole: 'reviewer',
      wallet: 0
    },
    {
      id: 'sam',
      name: 'Sam Okafor',
      email: 'sam@shehnat.com',
      password: DEMO_PASSWORD,
      role: 'staff',
      staffRole: 'ops',
      wallet: 0
    },
    {
      id: 'wei',
      name: 'Wei Zhang',
      email: 'wei@shehnat.com',
      password: DEMO_PASSWORD,
      role: 'staff',
      staffRole: 'ops',
      wallet: 0
    },
    {
      id: 'fatima',
      name: 'Fatima Zaid',
      email: 'fatima@shehnat.com',
      password: DEMO_PASSWORD,
      role: 'staff',
      staffRole: 'finance',
      wallet: 0
    }
  ];

  // Helper to generate shipment steps
  function createStandardSteps(prefix, plannedStartDate) {
    return [
      { id: `${prefix}_s1`, name: 'Advance supplier payment', stageTag: 1, owner: 'manager', plannedDurationDays: 5, plannedCost: 500000, requiresVerification: true, status: 'to_do' },
      { id: `${prefix}_s2`, name: 'Purchase goods & warehouse intake', stageTag: 1, owner: 'manager', plannedDurationDays: 10, plannedCost: 2000000, requiresVerification: false, status: 'to_do' },
      { id: `${prefix}_s3`, name: 'Packing & export inspection', stageTag: 2, owner: 'manager', plannedDurationDays: 5, plannedCost: 200000, requiresVerification: true, status: 'to_do' },
      { id: `${prefix}_s4`, name: 'Port container loading & vessel departure', stageTag: 3, owner: 'manager', plannedDurationDays: 15, plannedCost: 300000, requiresVerification: false, status: 'to_do' },
      { id: `${prefix}_s5`, name: 'Destination port customs clearance', stageTag: 4, owner: 'staff', plannedDurationDays: 7, plannedCost: 250000, requiresVerification: true, status: 'to_do' },
      { id: `${prefix}_s6`, name: 'Delivery to buyer warehouse', stageTag: 5, owner: 'manager', plannedDurationDays: 5, plannedCost: 150000, requiresVerification: false, status: 'to_do' },
      { id: `${prefix}_s7`, name: 'Buyer payment reconciliation', stageTag: 6, owner: 'staff', plannedDurationDays: 5, plannedCost: 0, requiresVerification: true, status: 'to_do' }
    ];
  }

  // 2. Seeded Listings covering every status in PLAN §4
  const listings = [
    // 1) Draft
    {
      id: 'lst_draft',
      name: 'Kerala Cardamom & Black Pepper to Genoa',
      managerId: 'kerala',
      category: 'Food',
      sourceCountry: 'IN',
      buyerCountry: 'IT',
      status: 'draft',
      stage: 0,
      target: 6800000, // $68,000
      raised: 0,
      minimumInvestment: 100000, // $1,000
      managerDepositPct: 20,
      investorSharePct: 60,
      cycleDays: 52,
      expectedProfit: 1400000,
      shipments: [
        {
          id: 'sh_draft_1',
          name: 'Shipment 1 (Cardamom 5T)',
          expectedCostOfGoods: 3000000,
          expectedSalePrice: 4100000,
          plannedStartDays: 0,
          steps: createStandardSteps('dr1', '2026-11-01')
        }
      ]
    },

    // 2) In Review (assigned to Priya)
    {
      id: 'lst_review',
      name: 'Coimbatore Cotton Textiles to Rotterdam',
      managerId: 'kerala',
      category: 'Textiles',
      sourceCountry: 'IN',
      buyerCountry: 'NL',
      status: 'in_review',
      assignedTo: 'priya',
      stage: 0,
      target: 8500000, // $85,000
      raised: 0,
      minimumInvestment: 100000,
      managerDepositPct: 25,
      investorSharePct: 55,
      cycleDays: 60,
      expectedProfit: 1800000,
      submittedDate: '2026-10-28T10:00:00Z',
      shipments: [
        {
          id: 'sh_rev_1',
          name: 'Shipment 1 (Organic cotton yarn)',
          expectedCostOfGoods: 5100000,
          expectedSalePrice: 6900000,
          plannedStartDays: 0,
          steps: createStandardSteps('rv1', '2026-11-05')
        }
      ]
    },

    // 3) Awaiting Revised terms
    {
      id: 'lst_revised',
      name: 'Malabar White Pepper to Hamburg',
      managerId: 'kerala',
      category: 'Food',
      sourceCountry: 'IN',
      buyerCountry: 'DE',
      status: 'awaiting_revised_terms',
      assignedTo: 'priya',
      stage: 0,
      target: 7200000,
      raised: 0,
      minimumInvestment: 100000,
      managerDepositPct: 20,
      investorSharePct: 50, // Original
      revisedTerms: {
        investorSharePct: 55, // Reviewer proposed
        note: 'High demand spice route: investor profit share increased to 55% for market competitiveness.'
      },
      cycleDays: 48,
      expectedProfit: 1500000,
      shipments: [
        {
          id: 'sh_revt_1',
          name: 'Shipment 1',
          expectedCostOfGoods: 4500000,
          expectedSalePrice: 6000000,
          plannedStartDays: 0,
          steps: createStandardSteps('rt1', '2026-11-03')
        }
      ]
    },

    // 4) Rejected with history
    {
      id: 'lst_rejected',
      name: 'Wild Forest Botanicals to Marseille',
      managerId: 'kerala',
      category: 'Other',
      sourceCountry: 'IN',
      buyerCountry: 'FR',
      status: 'rejected',
      stage: 0,
      target: 5000000,
      rejectionReason: 'Prohibited goods: Uncertified wild botanical extract cannot be exported without CITES clearance.',
      rejectedDate: '2026-10-25T14:00:00Z',
      rejectedBy: 'priya',
      shipments: []
    },

    // 5) Approved with deposit due (Day 12 of 14)
    {
      id: 'lst_deposit_due',
      name: 'Turmeric Oleoresin Extracts to Antwerp',
      managerId: 'kerala',
      category: 'Food',
      sourceCountry: 'IN',
      buyerCountry: 'BE',
      status: 'approved',
      stage: 0,
      target: 10000000, // $100,000
      depositDueAmount: 2000000, // 20% = $20,000
      depositPaid: false,
      approvedDate: '2026-10-19T08:00:00Z', // 12 days ago
      minimumInvestment: 100000,
      managerDepositPct: 20,
      investorSharePct: 60,
      cycleDays: 55,
      expectedProfit: 2200000,
      shipments: [
        {
          id: 'sh_dep_1',
          name: 'Shipment 1 (Standard extract 10T)',
          expectedCostOfGoods: 6600000,
          expectedSalePrice: 8800000,
          plannedStartDays: 0,
          steps: createStandardSteps('dp1', '2026-11-05')
        }
      ]
    },

    // 6) Withdrawn
    {
      id: 'lst_withdrawn',
      name: 'Alappuzha Green Cardamom to Valencia',
      managerId: 'kerala',
      category: 'Food',
      sourceCountry: 'IN',
      buyerCountry: 'ES',
      status: 'withdrawn',
      withdrawnReason: 'Withdrawn by manager before going live due to harvest delay.',
      target: 4000000,
      shipments: []
    },

    // 7) Live and Funding (Fresh)
    {
      id: 'lst_live_fresh',
      name: 'Wayanad Organic Ginger to Felixstowe',
      managerId: 'kerala',
      category: 'Food',
      sourceCountry: 'IN',
      buyerCountry: 'GB',
      status: 'live',
      stage: 0,
      target: 6000000, // $60,000
      raised: 2400000, // $24,000 (40% funded)
      minimumInvestment: 100000,
      managerDepositPct: 20,
      investorSharePct: 60,
      cycleDays: 45,
      expectedProfit: 1200000,
      liveDate: '2026-10-30T09:00:00Z',
      shipments: [
        {
          id: 'sh_fresh_1',
          name: 'Ginger Container A',
          expectedCostOfGoods: 3800000,
          expectedSalePrice: 5000000,
          plannedStartDays: 0,
          steps: createStandardSteps('fr1', '2026-11-10')
        }
      ]
    },

    // 8) Live and Overdue (Day 6)
    {
      id: 'lst_overdue',
      name: 'Tuticorin Salted Cashews to Dubai',
      managerId: 'kerala',
      category: 'Food',
      sourceCountry: 'IN',
      buyerCountry: 'AE',
      status: 'live',
      stage: 0,
      target: 5000000, // $50,000
      raised: 3800000, // $38,000 (needs $12,000 fill)
      minimumInvestment: 100000,
      managerDepositPct: 20,
      investorSharePct: 55,
      cycleDays: 40,
      expectedProfit: 950000,
      liveDate: '2026-10-25T08:00:00Z', // 6 days ago -> OVERDUE
      shipments: [
        {
          id: 'sh_ovr_1',
          name: 'Cashew Shipment 1',
          expectedCostOfGoods: 3200000,
          expectedSalePrice: 4150000,
          plannedStartDays: 0,
          steps: createStandardSteps('ov1', '2026-11-05')
        }
      ]
    },

    // 9) Live running with 2 shipments in parallel, Shipment 2 has a LATE step
    {
      id: 'lst_running_late',
      name: 'Nilgiri Orthodox Black Tea to Southampton',
      managerId: 'kerala',
      category: 'Food',
      sourceCountry: 'IN',
      buyerCountry: 'GB',
      status: 'running',
      stage: 3, // Shipped / In transit
      target: 12000000,
      raised: 12000000,
      minimumInvestment: 100000,
      investorSharePct: 65,
      cycleDays: 70,
      expectedProfit: 2600000,
      shipments: [
        {
          id: 'sh_tea_1',
          name: 'Shipment 1 (Early crop)',
          stage: 3,
          steps: [
            { id: 'st1_1', name: 'Purchase tea', stageTag: 1, status: 'verified', plannedEndDate: '2026-10-10' },
            { id: 'st1_2', name: 'Quality inspection', stageTag: 2, status: 'verified', plannedEndDate: '2026-10-15' },
            { id: 'st1_3', name: 'Vessel transit', stageTag: 3, status: 'in_progress', plannedEndDate: '2026-11-15' }
          ]
        },
        {
          id: 'sh_tea_2',
          name: 'Shipment 2 (Late crop)',
          stage: 2,
          isLate: true,
          steps: [
            { id: 'st2_1', name: 'Purchase tea', stageTag: 1, status: 'verified', plannedEndDate: '2026-10-15' },
            { id: 'st2_2', name: 'Quality certification', stageTag: 2, status: 'in_progress', plannedEndDate: '2026-10-27' }, // LATE (now is 10-31)
            { id: 'st2_3', name: 'Port departure', stageTag: 3, status: 'to_do', plannedEndDate: '2026-11-20' }
          ]
        }
      ]
    },

    // 10) Live running with Shipment needing Write-off/Resale decision
    {
      id: 'lst_writeoff_needed',
      name: 'Kerala Basmati Rice to Port Said',
      managerId: 'kerala',
      category: 'Food',
      sourceCountry: 'IN',
      buyerCountry: 'EG',
      status: 'running',
      stage: 5, // Goods received, buyer rejected
      target: 8000000,
      raised: 8000000,
      investorSharePct: 60,
      cycleDays: 45,
      problemFlag: 'Buyer rejected goods due to port customs packaging dispute. Resale proposed to local buyer at Alexandria.',
      shipments: [
        {
          id: 'sh_rice_1',
          name: 'Rice Container 1',
          stage: 5,
          problem: 'Buyer rejected cargo',
          resaleProposal: {
            proposedBy: 'sam',
            newBuyer: 'Alexandria Grain Supplies Co.',
            expectedResalePrice: 7200000,
            status: 'pending_approval'
          }
        }
      ]
    },

    // 11) Settlement proposed (waiting for finance)
    {
      id: 'lst_settle_proposed',
      name: 'Tellicherry Extra Bold Peppercorns to Rotterdam',
      managerId: 'kerala',
      category: 'Food',
      sourceCountry: 'IN',
      buyerCountry: 'NL',
      status: 'settlement_proposed',
      stage: 6, // Goods sold
      target: 10000000, // $100,000
      raised: 10000000,
      investorSharePct: 60,
      cycleDays: 60,
      saleProceeds: 12500000, // $125,000
      actualCosts: 8800000,   // $88,000
      settlementProposal: {
        proposedBy: 'hadi', // Owner proposed -> finance must approve!
        proposedDate: '2026-10-31T07:30:00Z',
        gross: 3700000,
        fee: 125000,
        net: 3575000,
        managerShare: 1430000,
        pool: 2145000
      },
      shipments: []
    },

    // 12) Completed at a Profit
    {
      id: 'lst_completed_profit',
      name: 'Cochin Ginger & Mace to Hamburg',
      managerId: 'kerala',
      category: 'Food',
      sourceCountry: 'IN',
      buyerCountry: 'DE',
      status: 'completed',
      stage: 7, // Settled
      target: 10000000, // $100,000
      raised: 10000000,
      investorSharePct: 60,
      saleProceeds: 12480500, // $124,805
      actualCosts: 9500000,   // $95,000
      settlementResult: {
        gross: 2980500,
        fee: 124805, // 1% of sale proceeds
        net: 2855695,
        managerShare: 1142278,
        pool: 1713417,
        roiPct: 17.1
      },
      investments: [
        { userId: 'aisha', amount: 5000000, payout: 5856708, profit: 856708 }
      ],
      shipments: []
    },

    // 13) Completed at a Loss
    {
      id: 'lst_completed_loss',
      name: 'Gujarat Sesame Seeds to Istanbul',
      managerId: 'kerala',
      category: 'Food',
      sourceCountry: 'IN',
      buyerCountry: 'TR',
      status: 'completed',
      stage: 7, // Settled
      target: 5000000,
      raised: 5000000,
      investorSharePct: 60,
      saleProceeds: 4200000, // Loss of $800,000
      actualCosts: 5000000,
      settlementResult: {
        gross: -800000,
        fee: 0, // No fee on loss
        net: -800000,
        managerShare: 0, // No manager share on loss
        pool: -800000,
        roiPct: -16.0
      },
      investments: [
        { userId: 'aisha', amount: 2000000, payout: 1680000, profit: -320000 }
      ],
      shipments: []
    },

    // 14) Cancelled & Refunded
    {
      id: 'lst_cancelled',
      name: 'Alleppey Turmeric Fingers to Genoa',
      managerId: 'kerala',
      category: 'Food',
      sourceCountry: 'IN',
      buyerCountry: 'IT',
      status: 'cancelled',
      stage: 0,
      target: 5000000,
      cancelledReason: 'Cancelled before purchase of goods due to sudden export ban. 100% of capital refunded to investor wallets.',
      cancelledDate: '2026-10-20T11:00:00Z',
      shipments: []
    },

    // 15) Shareholder Listing with deposit waiver & treasury stand-in
    {
      id: 'lst_shareholder',
      name: 'Omani Frankincense & Myrrh to Dubai',
      managerId: 'omar', // Omar is Manager AND Shareholder
      buyerUserId: 'layla', // Layla is Buyer AND Shareholder
      category: 'Other',
      sourceCountry: 'OM',
      buyerCountry: 'AE',
      status: 'live',
      isShareholderListing: true,
      depositWaived: true,
      waiverStandinAmount: 2000000, // $20,000 (20%)
      target: 10000000, // $100,000
      raised: 2000000, // Started with treasury stand-in
      minimumInvestment: 100000,
      investorSharePct: 60,
      shareholderSharePct: 75,
      cycleDays: 60,
      expectedProfit: 2500000,
      liveDate: '2026-10-31T06:00:00Z',
      shipments: [
        {
          id: 'sh_shh_1',
          name: 'Premium Royal Hojari Luban',
          expectedCostOfGoods: 6500000,
          expectedSalePrice: 9000000,
          plannedStartDays: 0,
          steps: createStandardSteps('sh1', '2026-11-15')
        }
      ]
    }
  ];

  // 3. Applications (KYC & Manager Registrations)
  const applications = [
    {
      id: 'app_chen',
      type: 'kyc',
      userId: 'chen',
      status: 'pending',
      assignedTo: 'priya',
      name: 'Chen Li',
      dob: '1992-05-14',
      nationality: 'SG',
      residence: 'SG',
      address: '12 Marina Boulevard, Singapore',
      idType: 'passport',
      idNumber: 'E9876543A',
      phone: '+6591234567',
      submittedDate: '2026-10-30T10:00:00Z',
      documents: [
        { name: 'passport_scan.pdf', size: 1240000, type: 'application/pdf' },
        { name: 'proof_of_address.jpg', size: 850000, type: 'image/jpeg' }
      ]
    },
    {
      id: 'app_dina',
      type: 'kyc',
      userId: 'dina',
      status: 'rejected',
      assignedTo: 'priya',
      name: 'Dina Haddad',
      dob: '1988-11-20',
      nationality: 'JO',
      residence: 'JO',
      address: '5th Circle, Amman, Jordan',
      idType: 'national_id',
      idNumber: '9882012345',
      phone: '+962791234567',
      submittedDate: '2026-10-27T09:00:00Z',
      decidedDate: '2026-10-28T14:30:00Z',
      rejectionReason: 'Photo ID unreadable. Please provide a clear, glare-free colour scan.',
      documents: [
        { name: 'id_front_blurry.jpg', size: 450000, type: 'image/jpeg' }
      ]
    },
    {
      id: 'app_mateo',
      type: 'company',
      userId: 'mateo',
      status: 'pending',
      assignedTo: 'priya',
      companyType: 'individual',
      businessName: 'Mateo Rojas Agro-Export',
      country: 'CL',
      address: 'Av. Providencia 1200, Santiago, Chile',
      activities: 'Export of dried fruits, walnuts, and organic Chilean honey to European and Gulf markets.',
      yearsTrading: 4,
      shipmentsExported: 18,
      submittedDate: '2026-10-29T16:00:00Z',
      documents: [
        { name: 'tax_registry_rut.pdf', size: 890000, type: 'application/pdf' },
        { name: 'mateo_id.pdf', size: 1100000, type: 'application/pdf' }
      ]
    }
  ];

  // 4. Double-Entry Seed Ledger (Sums to Zero, all non-negative accounts valid)
  // Accounts:
  // - platform:treasury: $250,000 (25,000,000 cents)
  // - platform:revenue: $1,248.05 (124,805 cents, fee from lst_completed_profit)
  // - platform:reserve: $0 (0 cents)
  // - withdrawals:hold: $2,000.00 (200,000 cents, pending withdrawal for Aisha)
  // - wallet:aisha: $25,000.00 (2,500,000 cents)
  // - wallet:layla: $50,000.00 (5,000,000 cents)
  // - wallet:kerala: $60,000.00 (6,000,000 cents)
  // - wallet:omar: $100,000.00 (10,000,000 cents)
  // - escrow:lst_live_fresh: $24,000.00 (2,400,000 cents)
  // - escrow:lst_overdue: $38,000.00 (3,800,000 cents)
  // - escrow:lst_running_late: $120,000.00 (12,000,000 cents)
  // - escrow:lst_shareholder: $20,000.00 (2,000,000 cents, stand-in)
  // Balanced by external:equity and external:gateway entries.
  const ledger = [
    // Platform initial equity funding treasury ($250,000)
    {
      id: 'tx_seed_equity',
      ts: '2026-10-01T00:00:00Z',
      memo: 'Initial platform equity funding treasury',
      entries: [
        { account: 'platform:treasury', amount: 25000000 },
        { account: 'external:equity', amount: -25000000 }
      ]
    },
    // Seed user wallet top-ups via gateway
    {
      id: 'tx_seed_wallets',
      ts: '2026-10-02T00:00:00Z',
      memo: 'Initial user wallet funding',
      entries: [
        { account: 'wallet:aisha', amount: 2700000 }, // 2.5m wallet + 200k hold
        { account: 'wallet:layla', amount: 5000000 },
        { account: 'wallet:kerala', amount: 6000000 },
        { account: 'wallet:omar', amount: 10000000 },
        { account: 'external:gateway', amount: -23700000 }
      ]
    },
    // Seed pending withdrawal for Aisha ($2,000 into hold)
    {
      id: 'tx_seed_aisha_hold',
      ts: '2026-10-30T11:00:00Z',
      memo: 'Withdrawal hold for Aisha',
      entries: [
        { account: 'withdrawals:hold', amount: 200000 },
        { account: 'wallet:aisha', amount: -200000 }
      ]
    },
    // Fee revenue from completed profit listing ($1,248.05)
    {
      id: 'tx_seed_revenue',
      ts: '2026-10-20T12:00:00Z',
      memo: 'Fee revenue from lst_completed_profit',
      entries: [
        { account: 'platform:revenue', amount: 124805 },
        { account: 'external:settlement', amount: -124805 }
      ]
    },
    // Escrow funding for live listings
    {
      id: 'tx_seed_escrows',
      ts: '2026-10-25T00:00:00Z',
      memo: 'Escrow holdings for live seeded listings',
      entries: [
        { account: 'escrow:lst_live_fresh', amount: 2400000 },
        { account: 'escrow:lst_overdue', amount: 3800000 },
        { account: 'escrow:lst_running_late', amount: 12000000 },
        { account: 'escrow:lst_shareholder', amount: 2000000 },
        { account: 'external:investors', amount: -20200000 }
      ]
    }
  ];

  // 5. Seed Pending Withdrawals
  const withdrawals = [
    {
      id: 'wth_aisha_1',
      userId: 'aisha',
      amount: 200000, // $2,000.00
      bankCountry: 'AE',
      bankName: 'First Abu Dhabi Bank (FAB)',
      accountHolder: 'Aisha Rahman',
      iban: 'AE070331234567890123456',
      swift: 'FABUAEAD',
      status: 'pending',
      requestedDate: '2026-10-30T11:00:00Z'
    }
  ];

  // 6. Audit Log (Last 10 events)
  const auditLog = [
    { id: 'aud_seed_10', ts: '2026-10-31T06:00:00Z', actor: 'priya', action: 'LISTING_APPROVE', entity: 'LISTING', details: 'Approved Omani Frankincense with deposit waiver' },
    { id: 'aud_seed_9',  ts: '2026-10-30T11:00:00Z', actor: 'aisha', action: 'WITHDRAW_REQUEST', entity: 'WITHDRAWAL', details: 'Requested $2,000 withdrawal to FAB bank' },
    { id: 'aud_seed_8',  ts: '2026-10-30T10:00:00Z', actor: 'chen',  action: 'KYC_SUBMIT', entity: 'APPLICATION', details: 'Submitted Singapore investor passport' },
    { id: 'aud_seed_7',  ts: '2026-10-30T09:00:00Z', actor: 'kerala',action: 'DEPOSIT_PAID', entity: 'LISTING', details: 'Paid 20% deposit for Wayanad Ginger' },
    { id: 'aud_seed_6',  ts: '2026-10-29T16:00:00Z', actor: 'mateo', action: 'MANAGER_SUBMIT', entity: 'APPLICATION', details: 'Submitted individual manager registration' },
    { id: 'aud_seed_5',  ts: '2026-10-28T14:30:00Z', actor: 'priya', action: 'KYC_REJECT', entity: 'APPLICATION', details: 'Rejected Dina Haddad (blurry photo ID)' },
    { id: 'aud_seed_4',  ts: '2026-10-25T14:00:00Z', actor: 'priya', action: 'LISTING_REJECT', entity: 'LISTING', details: 'Rejected Wild Forest Botanicals (unregulated)' },
    { id: 'aud_seed_3',  ts: '2026-10-20T12:00:00Z', actor: 'fatima',action: 'SETTLEMENT_APPROVE', entity: 'SETTLEMENT', details: 'Approved Cochin Ginger settlement ($1,248.05 fee)' },
    { id: 'aud_seed_2',  ts: '2026-10-02T00:00:00Z', actor: 'SYSTEM',action: 'WALLETS_SEED', entity: 'PLATFORM', details: 'Credited seeded persona wallets' },
    { id: 'aud_seed_1',  ts: '2026-10-01T00:00:00Z', actor: 'hadi',  action: 'TREASURY_INITIALIZE', entity: 'TREASURY', details: 'Initialized $250,000 platform treasury' }
  ];

  // Bundled seed generator
  const ShehnatSeed = {
    getInitialState() {
      // Calculate accounts object from ledger
      const wallets = {
        aisha: 2500000,
        layla: 5000000,
        kerala: 6000000,
        omar: 10000000
      };

      const escrow = {
        lst_live_fresh: 2400000,
        lst_overdue: 3800000,
        lst_running_late: 12000000,
        lst_shareholder: 2000000
      };

      const hold = {
        wth_aisha_1: 200000
      };

      return {
        version: 4,
        activePersonaId: 'aisha',
        simulatedDate: SEED_DATE,
        failNextAction: false,
        skeletonDelay: true,
        personas,
        listings,
        applications,
        withdrawals,
        accounts: {
          wallets,
          escrow,
          hold,
          treasury: 25000000, // $250,000.00
          revenue: 124805,    // $1,248.05
          reserve: 0          // $0.00
        },
        ledger,
        auditLog
      };
    }
  };

  global.ShehnatSeed = ShehnatSeed;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShehnatSeed;
  }

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
