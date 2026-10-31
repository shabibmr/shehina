'use strict';

const assert = require('node:assert');
const http = require('node:http');
const { server, store } = require('./server');

const TEST_PORT = 8089;

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, text: data });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

server.listen(TEST_PORT, '127.0.0.1', async () => {
  console.log(`Test server running on port ${TEST_PORT}`);
  try {
    // 1. Health check & reset
    const health = await request('GET', '/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.data.ok, true);
    assert.strictEqual(health.data.uae, true);
    console.log('✓ Health check passed');

    await request('POST', '/dev/reset');
    console.log('✓ State reset to canonical seed');

    // 2. Initial state verification
    const init = await request('GET', '/api/state');
    assert.strictEqual(init.status, 200);
    assert.strictEqual(init.data.ok, true);
    const initialUsers = init.data.state.users;
    const barakah = initialUsers.find(u => u.id === 'barakah');
    assert.ok(barakah, 'Al Barakah Trading exists');
    assert.strictEqual(barakah.country, 'AE');
    console.log('✓ UAE Manager Persona verified: Al Barakah Trading LLC');

    // 3. Manager (Al Barakah) creates a new listing
    const { Logic } = require('./state_store');
    const templateSteps = Logic.template();
    templateSteps[2].cost = 200000;
    templateSteps[4].cost = 800000;

    const listingName = 'Specialty Dates, Jebel Ali to Rotterdam';
    const createRes = await request('POST', '/api/dispatch', {
      type: 'saveListing',
      actorId: 'barakah',
      strict: true,
      listing: {
        name: listingName,
        category: 'Food',
        source: 'AE',
        buyer: 'NL',
        certificate: 'Halal Export UAE-501',
        companyPct: 20,
        investorSharePct: 60,
        minInvest: 100000,
        shipments: [
          {
            label: 'Shipment 1',
            expectedCost: 1000000,
            expectedSale: 1400000,
            plannedStart: 0,
            steps: templateSteps
          }
        ]
      }
    });
    assert.strictEqual(createRes.status, 200);
    assert.strictEqual(createRes.data.ok, true);
    const listingId = createRes.data.state.listings.find(l => l.name === listingName).id;
    console.log('✓ Manager created new UAE listing:', listingId);

    // 4. Submit listing for review
    const submitRes = await request('POST', '/api/dispatch', {
      type: 'submitListing',
      actorId: 'barakah',
      id: listingId
    });
    assert.strictEqual(submitRes.data.ok, true);
    console.log('✓ Manager submitted listing for review');

    // 5. Reviewer (Priya) reviews and approves listing
    const approveRes = await request('POST', '/api/dispatch', {
      type: 'reviewListing',
      actorId: 'priya',
      id: listingId,
      decision: 'approve'
    });
    assert.strictEqual(approveRes.data.ok, true);
    console.log('✓ Reviewer Priya approved listing');

    // 6. Manager pays deposit from wallet
    const depositRes = await request('POST', '/api/dispatch', {
      type: 'payDeposit',
      actorId: 'barakah',
      id: listingId
    });
    assert.strictEqual(depositRes.data.ok, true);
    console.log('✓ Manager paid 20% deposit from wallet -> Listing is now LIVE');

    // 7. Investor (Aisha) invests in live listing
    const investRes = await request('POST', '/api/dispatch', {
      type: 'invest',
      actorId: 'aisha',
      id: listingId,
      amount: 400000 // $4,000 USD
    });
    assert.strictEqual(investRes.data.ok, true);
    console.log('✓ Investor Aisha invested $4,000 USD from her wallet');

    // 8. Verify ledger sum-to-zero remains balanced
    const verifyState = store.getState().state;
    const ledgerCheck = Logic.verify(verifyState);
    assert.strictEqual(ledgerCheck.ok, true, 'Ledger must balance');
    console.log('✓ Ledger check verified: sum-to-zero holds across all accounts');

    console.log('\n======================================================');
    console.log(' ALL AUTOMATED MULTI-USER WORKFLOW TESTS PASSED (100%)');
    console.log('======================================================\n');
  } catch (err) {
    console.error('Test failed:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
