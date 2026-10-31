/* Demo world. Password for every seeded account is shehnat-demo-1.
   aisha.rahman@demo.shehnat     investor, approved, UAE
   ben.carter@demo.shehnat       investor, no verification, UK
   chen.li@demo.shehnat           investor, verification pending, Singapore
   dina.haddad@demo.shehnat       investor, verification rejected, Jordan
   kerala@demo.shehnat            manager, business, India
   mateo.rojas@demo.shehnat       manager, individual, registration pending, Chile
   omar.alsaid@demo.shehnat       manager and shareholder, Oman
   layla.nasser@demo.shehnat      investor and shareholder, UAE
   hadi.karim@demo.shehnat        owner
   priya.nair@demo.shehnat        reviewer
   sam.okafor@demo.shehnat        operations
   wei.zhang@demo.shehnat         operations
   fatima.zaid@demo.shehnat       finance
*/
(function (root) {
  "use strict";
  var PASS = "shehnat-demo-1";

  function build(L) {
    var NOW = Date.UTC(2026, 9, 31, 9, 0, 0);
    var state = {
      now: NOW,
      settings: {
        overdueDays: 5,
        autoWithdrawDays: 14,
        waiverStandInPct: 20,
        shareholderSharePct: 75,
        exposureDefault: 1000000000,
        largeWithdrawal: 1000000,
        blocked: ["CU", "IR", "KP", "SY"],
        feeBps: 100,
        minTicket: 100000
      },
      users: [],
      listings: [],
      entries: [],
      txn: 0,
      audit: [],
      notes: [],
      withdrawals: [],
      welcomeSeen: false,
      sessionUserId: null
    };
    var led = L.ledgerOps(state);

    function user(o) {
      state.users.push({
        id: o.id, email: o.email, name: o.name, role: o.role, password: PASS,
        active: true, country: o.country, kind: o.kind || "",
        shareholder: !!o.shareholder, suspended: false,
        exposureLimit: o.exposureLimit || null,
        failed: 0, lockedUntil: 0,
        application: o.application || { type: o.role === "manager" ? "company" : "kyc", status: "none", assigneeId: "", reason: "", history: [], payload: {} }
      });
    }

    function plan(prefix, states, extraCost) {
      var base = [
        ["Ordering", null, 2, 0, false, "manager"],
        ["Advances", null, 2, 0, true, "staff"],
        ["Purchase", "Goods purchased", 4, 0, false, "manager"],
        ["Payments", null, 2, 0, true, "staff"],
        ["Transportation", "Loaded at port", 5, extraCost || 0, false, "staff"],
        ["Sea transit", "At sea", 10, 0, false, "staff"],
        ["Clearance", "Customs cleared", 3, 0, true, "staff"],
        ["Invoicing", "Goods sold", 2, 0, true, "staff"]
      ];
      return base.map(function (s, i) {
        return {
          id: prefix + "-" + i, name: s[0], tag: s[1], days: s[2], cost: s[3], verify: s[4], owner: s[5],
          state: (states && states[i]) || "todo", docs: [], revisedAt: null
        };
      });
    }

    function ship(id, goods, sale, start, states, extra, extraFields) {
      var sh = { id: id, goods: goods, saleExpected: sale, startDay: start || 0, proceeds: null, costActual: null, writtenOff: false, steps: plan(id, states, extra || 0) };
      if (extraFields) Object.keys(extraFields).forEach(function (k) { sh[k] = extraFields[k]; });
      return sh;
    }

    function listing(o) {
      var row = {
        id: o.id, name: o.name, managerId: o.managerId, category: o.category || "Food",
        source: o.source, buyer: o.buyer, status: o.status, investorShare: o.investorShare, companyPct: o.companyPct,
        minimum: o.minimum, shipments: o.shipments, contributions: [],
        waiver: !!o.waiver, shareholderListing: !!o.shareholderListing,
        buyerShareholderId: o.buyerShareholderId || "", shareholderSharePct: 75,
        approvedAt: o.approvedAt || 0, liveAt: o.liveAt || 0, assigneeId: o.assigneeId || "",
        history: o.history || [], revised: o.revised || null,
        settlement: o.settlement || null, certificate: o.certificate || ""
      };
      state.listings.push(row);
      return row;
    }

    function wallet(id) { return "user:" + id + ":wallet"; }
    function escrow(id) { return "escrow:" + id; }

    function move(from, to, amount, memo, key, at) {
      if (!amount) return { ok: true };
      return led.post([
        { account: from, amount: -amount, memo: memo, at: at },
        { account: to, amount: amount, memo: memo, at: at }
      ], key);
    }

    function contribute(listing, userId, kind, amount) {
      var from = kind === "treasury" ? "platform:treasury" : wallet(userId);
      var res = move(from, escrow(listing.id), amount, kind + " contribution");
      if (!res.ok) throw new Error(listing.id + " " + res.error);
      listing.contributions.push({ userId: userId || "", kind: kind, amount: amount });
    }

    user({ id: "aisha", email: "aisha.rahman@demo.shehnat", name: "Aisha Rahman", role: "investor", country: "AE", application: { type: "kyc", status: "approved", assigneeId: "priya", reason: "", history: [{ at: NOW - 40 * L.DAY, actorId: "priya", action: "Approved", reason: "" }], payload: { dob: "1991-04-12", phone: "+971501234567", idType: "Passport", idNumber: "P1234567" } } });
    user({ id: "ben", email: "ben.carter@demo.shehnat", name: "Ben Carter", role: "investor", country: "GB" });
    user({ id: "chen", email: "chen.li@demo.shehnat", name: "Chen Li", role: "investor", country: "SG", application: { type: "kyc", status: "pending", assigneeId: "priya", reason: "", history: [{ at: NOW - 2 * L.DAY, actorId: "chen", action: "Submitted", reason: "" }], payload: { dob: "1988-11-02", phone: "+6591234567", idType: "Passport", idNumber: "K998877", residence: "SG" } } });
    user({ id: "dina", email: "dina.haddad@demo.shehnat", name: "Dina Haddad", role: "investor", country: "JO", application: { type: "kyc", status: "rejected", assigneeId: "", reason: "Photo ID is unreadable.", history: [{ at: NOW - 9 * L.DAY, actorId: "dina", action: "Submitted", reason: "" }, { at: NOW - 8 * L.DAY, actorId: "priya", action: "Rejected", reason: "Photo ID is unreadable." }], payload: { dob: "1994-01-20", phone: "+962791234567", idType: "National ID", idNumber: "JO445566" } } });
    user({ id: "layla", email: "layla.nasser@demo.shehnat", name: "Layla Nasser", role: "investor", country: "AE", shareholder: true, application: { type: "kyc", status: "approved", assigneeId: "priya", reason: "", history: [{ at: NOW - 80 * L.DAY, actorId: "hadi", action: "Approved", reason: "" }], payload: { dob: "1984-06-01", phone: "+971509998877", idType: "Passport", idNumber: "LN2001" } } });
    user({ id: "kerala", email: "kerala@demo.shehnat", name: "Kerala Spice Traders LLP", role: "manager", country: "IN", kind: "business", exposureLimit: 50000000, application: { type: "company", status: "approved", assigneeId: "priya", reason: "", history: [{ at: NOW - 100 * L.DAY, actorId: "priya", action: "Approved", reason: "" }], payload: { legalName: "Kerala Spice Traders LLP", reg: "IN-LLP-2201" } } });
    user({ id: "mateo", email: "mateo.rojas@demo.shehnat", name: "Mateo Rojas", role: "manager", country: "CL", kind: "individual", application: { type: "company", status: "pending", assigneeId: "priya", reason: "", history: [{ at: NOW - 3 * L.DAY, actorId: "mateo", action: "Submitted", reason: "" }], payload: { dob: "1990-08-08", phone: "+56912345678", idType: "Passport", idNumber: "CL332211" } } });
    user({ id: "omar", email: "omar.alsaid@demo.shehnat", name: "Omar Al-Said", role: "manager", country: "OM", kind: "individual", shareholder: true, application: { type: "company", status: "approved", assigneeId: "hadi", reason: "", history: [{ at: NOW - 60 * L.DAY, actorId: "hadi", action: "Approved", reason: "" }], payload: { legalName: "Omar Al-Said" } } });
    user({ id: "hadi", email: "hadi.karim@demo.shehnat", name: "Hadi Karim", role: "owner", country: "AE" });
    user({ id: "priya", email: "priya.nair@demo.shehnat", name: "Priya Nair", role: "reviewer", country: "AE" });
    user({ id: "sam", email: "sam.okafor@demo.shehnat", name: "Sam Okafor", role: "ops", country: "AE" });
    user({ id: "wei", email: "wei.zhang@demo.shehnat", name: "Wei Zhang", role: "ops", country: "AE" });
    user({ id: "fatima", email: "fatima.zaid@demo.shehnat", name: "Fatima Zaid", role: "finance", country: "AE" });

    led.post([
      { account: "bank:external", amount: -25000000, memo: "Treasury opening" },
      { account: "platform:treasury", amount: 25000000, memo: "Treasury opening" }
    ]);
    move("bank:external", wallet("aisha"), 4633520, "Top up", "", NOW - 60 * L.DAY);
    move("bank:external", wallet("kerala"), 6520480, "Top up", "", NOW - 55 * L.DAY);
    move("bank:external", wallet("chen"), 500000, "Top up", "", NOW - 20 * L.DAY);
    move("bank:external", wallet("layla"), 1400000, "Top up", "", NOW - 50 * L.DAY);
    move("bank:external", wallet("omar"), 500000, "Top up", "", NOW - 40 * L.DAY);

    var profit = listing({
      id: "profit", name: "Brazil green coffee to Kobe", managerId: "kerala", source: "BR", buyer: "JP",
      status: "completed", investorShare: 60, companyPct: 20, minimum: 100000,
      shipments: [ship("profit-a", 2000000, 2400000, 0, ["verified", "verified", "verified", "verified", "verified", "verified", "verified", "verified"])],
      liveAt: NOW - 70 * L.DAY, approvedAt: NOW - 80 * L.DAY,
      history: [{ at: NOW - 5 * L.DAY, actorId: "fatima", action: "Settlement approved", reason: "" }]
    });
    contribute(profit, "kerala", "manager", 400000);
    contribute(profit, "aisha", "investor", 1600000);
    move(escrow("profit"), "bank:external", 1800000, "Costs");
    move("bank:external", escrow("profit"), 2400000, "Sale proceeds");
    profit.shipments[0].proceeds = 2400000;
    profit.shipments[0].costActual = 1800000;
    var profitResult = L.settlement({
      saleCents: 2400000, costCents: 1800000, investorSharePct: 60,
      contributions: profit.contributions, shareholderListing: false
    });
    var profitLines = [{ account: escrow("profit"), amount: -(profitResult.fee + profit.contributions.reduce(function (s, c) { return s + c.amount; }, 0) + profitResult.pool), memo: "Settlement" }];
    /* Pay fee, manager share, and each row payout. Escrow out = fee + managerCut + sum of payouts.
       sum of payouts = capital + pool, so out = fee + managerCut + capital + pool = fee + capital + net.
       capital + sale - costs is what escrow holds. */
    var profitOut = [];
    profitOut.push({ account: "platform:revenue", amount: profitResult.fee, memo: "Service fee" });
    profitOut.push({ account: wallet("kerala"), amount: profitResult.managerCut, memo: "Manager share" });
    profitResult.rows.forEach(function (r) {
      profitOut.push({ account: wallet(r.userId), amount: r.payout, memo: "Payout" });
    });
    var profitSum = profitOut.reduce(function (s, l) { return s + l.amount; }, 0);
    profitOut.unshift({ account: escrow("profit"), amount: -profitSum, memo: "Settlement" });
    var posted = led.post(profitOut);
    if (!posted.ok) throw new Error("profit settle " + posted.error);

    var loss = listing({
      id: "loss", name: "Kenya tea to Felixstowe", managerId: "kerala", source: "KE", buyer: "GB",
      status: "completed", investorShare: 60, companyPct: 20, minimum: 100000,
      shipments: [ship("loss-a", 1000000, 1100000, 0, ["verified", "verified", "verified", "verified", "verified", "verified", "verified", "verified"])],
      liveAt: NOW - 50 * L.DAY, approvedAt: NOW - 55 * L.DAY,
      history: [{ at: NOW - 4 * L.DAY, actorId: "fatima", action: "Settlement approved", reason: "Sold below the expected price." }]
    });
    contribute(loss, "kerala", "manager", 200000);
    contribute(loss, "aisha", "investor", 800000);
    move(escrow("loss"), "bank:external", 1000000, "Costs");
    move("bank:external", escrow("loss"), 700000, "Sale proceeds");
    loss.shipments[0].proceeds = 700000;
    loss.shipments[0].costActual = 1000000;
    var lossResult = L.settlement({
      saleCents: 700000, costCents: 1000000, investorSharePct: 60,
      contributions: loss.contributions, shareholderListing: false
    });
    var lossOut = [];
    lossOut.push({ account: wallet("kerala"), amount: lossResult.managerCut, memo: "Manager share" });
    lossResult.rows.forEach(function (r) { lossOut.push({ account: wallet(r.userId), amount: r.payout, memo: "Payout" }); });
    var lossSum = lossOut.reduce(function (s, l) { return s + l.amount; }, 0);
    lossOut.unshift({ account: escrow("loss"), amount: -lossSum, memo: "Settlement" });
    posted = led.post(lossOut.filter(function (l) { return l.amount !== 0; }));
    if (!posted.ok) throw new Error("loss settle " + posted.error);

    var cardamom = listing({
      id: "cardamom", name: "Green cardamom to Rotterdam", managerId: "kerala", source: "IN", buyer: "NL",
      status: "live", investorShare: 40, companyPct: 20, minimum: 100000,
      shipments: [ship("cardamom-a", 900000, 1200000, 0, null, 100000)],
      liveAt: NOW - L.DAY, approvedAt: NOW - 2 * L.DAY, certificate: "ISO 22000"
    });
    contribute(cardamom, "kerala", "manager", 200000);
    contribute(cardamom, "aisha", "investor", 770000);

    var pepper = listing({
      id: "pepper", name: "Black pepper to Genoa", managerId: "kerala", source: "IN", buyer: "IT",
      status: "live", investorShare: 50, companyPct: 20, minimum: 100000,
      shipments: [ship("pepper-a", 1800000, 2400000, 2, null, 200000)],
      liveAt: NOW - 2 * 3600000, approvedAt: NOW - L.DAY
    });
    contribute(pepper, "kerala", "manager", 400000);

    var overdue = listing({
      id: "overdue", name: "Cloves to Marseille", managerId: "kerala", source: "TZ", buyer: "FR",
      status: "live", investorShare: 55, companyPct: 20, minimum: 100000,
      shipments: [ship("overdue-a", 500000, 650000, 0)],
      liveAt: NOW - 6 * L.DAY, approvedAt: NOW - 7 * L.DAY
    });
    contribute(overdue, "kerala", "manager", 100000);

    var runningStates = ["done", "verified", "done", "verified", "in_progress", "todo", "todo", "todo"];
    var parallel = listing({
      id: "parallel", name: "Basmati to Mombasa", managerId: "kerala", source: "IN", buyer: "KE",
      status: "live", investorShare: 50, companyPct: 20, minimum: 10000,
      shipments: [
        ship("parallel-a", 80000, 120000, 0, runningStates),
        ship("parallel-b", 80000, 120000, 4)
      ],
      liveAt: NOW - 20 * L.DAY, approvedAt: NOW - 22 * L.DAY
    });
    parallel.shipments[0].steps[4].revisedAt = NOW + 3 * L.DAY;
    contribute(parallel, "kerala", "manager", 40000);
    contribute(parallel, "layla", "investor", 160000);

    var dates = listing({
      id: "dates", name: "Dates to Jeddah", managerId: "omar", source: "OM", buyer: "SA",
      status: "live", investorShare: 50, companyPct: 20, minimum: 10000,
      shipments: [ship("dates-a", 160000, 200000, 0, ["done", "verified", "done", "verified", "in_progress", "todo", "todo", "todo"])],
      liveAt: NOW - 10 * L.DAY, approvedAt: NOW - 12 * L.DAY
    });
    contribute(dates, "omar", "manager", 40000);
    contribute(dates, "layla", "investor", 160000);

    var proposed = listing({
      id: "proposed", name: "Turmeric to Hamburg", managerId: "kerala", source: "IN", buyer: "DE",
      status: "settlement_proposed", investorShare: 50, companyPct: 20, minimum: 10000,
      shipments: [ship("proposed-a", 100000, 140000, 0, ["verified", "verified", "verified", "verified", "verified", "verified", "verified", "verified"])],
      liveAt: NOW - 40 * L.DAY, approvedAt: NOW - 42 * L.DAY,
      settlement: { proposerId: "hadi", status: "proposed", at: NOW - L.DAY },
      history: [{ at: NOW - L.DAY, actorId: "hadi", action: "Settlement proposed", reason: "" }]
    });
    contribute(proposed, "kerala", "manager", 20000);
    contribute(proposed, "layla", "investor", 80000);
    move(escrow("proposed"), "bank:external", 80000, "Costs");
    move("bank:external", escrow("proposed"), 120000, "Sale proceeds");
    proposed.shipments[0].proceeds = 120000;
    proposed.shipments[0].costActual = 80000;

    var shareholder = listing({
      id: "shareholder", name: "Frankincense to Singapore", managerId: "omar", source: "OM", buyer: "SG",
      status: "live", investorShare: 60, companyPct: 20, minimum: 100000, waiver: true, shareholderListing: true,
      buyerShareholderId: "layla",
      shipments: [ship("shareholder-a", 1000000, 1300000, 0)],
      liveAt: NOW - 2 * L.DAY, approvedAt: NOW - 2 * L.DAY,
      history: [{ at: NOW - 2 * L.DAY, actorId: "fatima", action: "Deposit waived", reason: "Buyer is a shareholder." }]
    });
    contribute(shareholder, "", "treasury", 200000);

    listing({
      id: "draft", name: "Vanilla, not submitted", managerId: "kerala", source: "MG", buyer: "US",
      status: "draft", investorShare: 50, companyPct: 25, minimum: 100000,
      shipments: [ship("draft-a", 2000000, 2600000, 1)]
    });
    listing({
      id: "review", name: "Cashew to Muscat", managerId: "kerala", source: "IN", buyer: "OM",
      status: "in_review", investorShare: 45, companyPct: 30, minimum: 100000, assigneeId: "priya",
      shipments: [ship("review-a", 3000000, 3800000, 3)],
      history: [{ at: NOW - 2 * L.DAY, actorId: "kerala", action: "Submitted", reason: "" }]
    });
    listing({
      id: "terms", name: "Cinnamon to Oslo", managerId: "kerala", source: "LK", buyer: "NO",
      status: "awaiting_terms", investorShare: 50, companyPct: 25, minimum: 100000, assigneeId: "priya",
      shipments: [ship("terms-a", 2500000, 3200000, 2)],
      revised: { investorShare: 55, at: NOW - 4 * L.DAY, actorId: "priya" },
      history: [{ at: NOW - 4 * L.DAY, actorId: "priya", action: "Revised terms sent", reason: "Investor share 50% to 55%." }]
    });
    listing({
      id: "rejected", name: "Nutmeg, sent back", managerId: "kerala", source: "ID", buyer: "AE",
      status: "rejected", investorShare: 40, companyPct: 20, minimum: 100000,
      shipments: [ship("rejected-a", 1500000, 1800000, 1)],
      history: [{ at: NOW - 12 * L.DAY, actorId: "priya", action: "Rejected", reason: "Buyer country matches the source." }]
    });
    listing({
      id: "depositdue", name: "Saffron, deposit due", managerId: "kerala", source: "IR", buyer: "ES",
      status: "approved", investorShare: 50, companyPct: 20, minimum: 100000,
      shipments: [ship("deposit-a", 2000000, 2500000, 0)],
      approvedAt: NOW - 12 * L.DAY
    });
    /* Source IR is blocked. Keep the demo country legal: change to IN. */
    state.listings[state.listings.length - 1].source = "IN";
    listing({
      id: "withdrawn", name: "Cardamom left unpaid", managerId: "kerala", source: "GT", buyer: "US",
      status: "withdrawn", investorShare: 50, companyPct: 20, minimum: 100000,
      shipments: [ship("withdrawn-a", 1200000, 1600000, 0)],
      approvedAt: NOW - 15 * L.DAY,
      history: [{ at: NOW - L.DAY, actorId: "", action: "Withdrawn", reason: "The deposit was unpaid for 14 days." }]
    });
    var cancelled = listing({
      id: "cancelled", name: "Pepper, cancelled", managerId: "kerala", source: "VN", buyer: "FR",
      status: "cancelled", investorShare: 50, companyPct: 20, minimum: 10000,
      shipments: [ship("cancelled-a", 100000, 140000, 0)],
      liveAt: NOW - 10 * L.DAY,
      history: [{ at: NOW - 9 * L.DAY, actorId: "sam", action: "Cancelled", reason: "Cancelled before the goods were bought." }]
    });
    contribute(cancelled, "kerala", "manager", 20000);
    contribute(cancelled, "layla", "investor", 80000);
    move(escrow("cancelled"), wallet("kerala"), 20000, "Refund");
    move(escrow("cancelled"), wallet("layla"), 80000, "Refund");
    cancelled.contributions = [];

    move(wallet("aisha"), "withdrawals:hold", 200000, "Withdrawal", "", NOW - 4 * L.DAY);
    move(wallet("aisha"), "withdrawals:hold", 1200000, "Withdrawal", "", NOW - 2 * L.DAY);
    state.withdrawals.push(
      { id: "w-small", userId: "aisha", amount: 200000, status: "pending", country: "AE", bank: "Emirates NBD", holder: "Aisha Rahman", account: "AE070331234567890123456", swift: "EBILAEAD", at: NOW - 4 * L.DAY, reason: "" },
      { id: "w-large", userId: "aisha", amount: 1200000, status: "pending", country: "AE", bank: "Emirates NBD", holder: "Aisha Rahman", account: "AE070331234567890123456", swift: "EBILAEAD", at: NOW - 2 * L.DAY, reason: "" },
      { id: "w-failed", userId: "aisha", amount: 50000, status: "failed", country: "AE", bank: "Emirates NBD", holder: "Aisha Rahman", account: "AE070331234567890123456", swift: "EBILAEAD", at: NOW - L.DAY, reason: "The bank returned the payment." }
    );
    move(wallet("aisha"), "withdrawals:hold", 50000, "Withdrawal", "", NOW - L.DAY);
    move("withdrawals:hold", wallet("aisha"), 50000, "Payout failed", "", NOW - L.DAY / 2);

    state.notes.push(
      { id: "n1", userId: "dina", at: NOW - 8 * L.DAY, text: "Verification was rejected. Photo ID is unreadable.", read: false },
      { id: "n2", userId: "aisha", at: NOW - 5 * L.DAY, text: "Brazil green coffee to Kobe was settled. The payout is in your wallet.", read: false },
      { id: "n3", userId: "chen", at: NOW - 2 * L.DAY, text: "Your verification is waiting for review.", read: false }
    );
    state.audit.push(
      { id: "a1", at: NOW - 8 * L.DAY, actorId: "priya", action: "Rejected verification", entity: "dina", reason: "Photo ID is unreadable." },
      { id: "a2", at: NOW - 5 * L.DAY, actorId: "fatima", action: "Approved settlement", entity: "profit", reason: "" }
    );

    var check = L.verify(state.entries);
    if (!check.ok) throw new Error("Seed ledger " + JSON.stringify(check));
    function bal(account) { return led.bal(account); }
    function expect(account, cents) {
      if (bal(account) !== cents) throw new Error(account + " " + bal(account) + " !== " + cents);
    }
    expect(wallet("aisha"), 2500000);
    expect(wallet("kerala"), 6000000);
    expect(wallet("chen"), 500000);
    expect(wallet("layla"), 1000000);
    expect(wallet("omar"), 460000);
    expect("withdrawals:hold", 1400000);
    expect("platform:revenue", 24000);
    expect("platform:treasury", 24800000);
    expect(escrow("cardamom"), 970000);
    expect(escrow("pepper"), 400000);
    expect(escrow("profit"), 0);
    expect(escrow("loss"), 0);
    if (L.remaining(cardamom) !== 30000) throw new Error("remainder " + L.remaining(cardamom));
    if (!L.overdue(overdue, NOW, 5)) throw new Error("overdue flag");
    return state;
  }

  root.ShehnatSeed = { build: build, password: PASS };
})(typeof globalThis !== "undefined" ? globalThis : this);
