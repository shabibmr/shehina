'use strict';
// Creates the first owner account. Usage: OWNER_EMAIL=you@x.com OWNER_PASSWORD='...' node src/seed.js
const db = require('./db');
const auth = require('./auth');
db.get();
const email = process.env.OWNER_EMAIL, password = process.env.OWNER_PASSWORD;
if (!email || !password) { console.error('Set OWNER_EMAIL and OWNER_PASSWORD'); process.exit(1); }
const u = auth.createStaff({ email, password, name: process.env.OWNER_NAME || 'Owner', staff_role: 'owner' }, null);
console.log('Owner created:', u.email);
