'use strict';
const crypto = require('node:crypto');
const cfg = require('./config');
const { q } = require('./db');
const { HttpError, bad, isEmail, str } = require('./util');
const { audit } = require('./audit');

function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('hex')}$${h.toString('hex')}`;
}
function verifyPassword(pw, stored) {
  const [alg, saltHex, hashHex] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const h = crypto.scryptSync(pw, Buffer.from(saltHex, 'hex'), 64, { N: 16384, r: 8, p: 1 });
  const want = Buffer.from(hashHex, 'hex');
  return h.length === want.length && crypto.timingSafeEqual(h, want);
}
const b64 = (b) => Buffer.from(b).toString('base64url');
function sign(payload) {
  const body = b64(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', cfg.tokenSecret).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function verifyToken(tok) {
  const [body, sig] = String(tok || '').split('.');
  if (!body || !sig) return null;
  const want = crypto.createHmac('sha256', cfg.tokenSecret).update(body).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(want);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const p = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (!p.exp || p.exp < Math.floor(cfg.now() / 1000)) return null;
  return p;
}
function checkPassword(pw) {
  if (typeof pw !== 'string' || pw.length < 10) throw bad('Password must be at least 10 characters');
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) throw bad('Password must contain letters and numbers');
}
function publicUser(u) { return { id: u.id, email: u.email, name: u.name, role: u.role, staff_role: u.staff_role || null }; }

function register({ email, password, name, role }) {
  if (!isEmail(email)) throw bad('Enter a valid email');
  checkPassword(password);
  name = str(name, 'name', { max: 120 });
  if (!['investor', 'company'].includes(role)) throw bad('role must be investor or company');
  email = email.toLowerCase();
  if (q.one('SELECT id FROM users WHERE email = ?', email)) throw new HttpError(409, 'That email is already registered', 'email_taken');
  const r = q.run('INSERT INTO users (email, name, pass_hash, role, created_at) VALUES (?,?,?,?,?)', email, name, hashPassword(password), role, cfg.now());
  const u = q.one('SELECT * FROM users WHERE id = ?', Number(r.lastInsertRowid));
  audit(u, 'register', 'user', u.id);
  return u;
}
function createStaff({ email, password, name, staff_role }, actor) {
  if (!isEmail(email)) throw bad('Enter a valid email');
  checkPassword(password);
  name = str(name, 'name', { max: 120 });
  if (!['owner', 'reviewer', 'ops', 'finance'].includes(staff_role)) throw bad('Unknown staff role');
  email = email.toLowerCase();
  if (q.one('SELECT id FROM users WHERE email = ?', email)) throw new HttpError(409, 'That email is already registered', 'email_taken');
  const r = q.run('INSERT INTO users (email, name, pass_hash, role, staff_role, created_at) VALUES (?,?,?,?,?,?)', email, name, hashPassword(password), 'staff', staff_role, cfg.now());
  const u = q.one('SELECT * FROM users WHERE id = ?', Number(r.lastInsertRowid));
  audit(actor, 'staff.create', 'user', u.id, { staff_role });
  return u;
}
const MAX_FAILS = 5, LOCK_MS = 15 * 60 * 1000;
function login({ email, password }) {
  const u = q.one('SELECT * FROM users WHERE email = ?', String(email || '').toLowerCase());
  const now = cfg.now();
  if (u && u.locked_until > now) throw new HttpError(429, 'Too many attempts. Try again later.', 'locked');
  if (!u || !u.active || !verifyPassword(String(password || ''), u.pass_hash)) {
    if (u) {
      const f = u.failed_logins + 1;
      q.run('UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?', f >= MAX_FAILS ? 0 : f, f >= MAX_FAILS ? now + LOCK_MS : 0, u.id);
    }
    throw new HttpError(401, 'Wrong email or password', 'bad_credentials');
  }
  q.run('UPDATE users SET failed_logins = 0, locked_until = 0 WHERE id = ?', u.id);
  const token = sign({ sub: u.id, exp: Math.floor(now / 1000) + cfg.tokenTtlSec });
  audit(u, 'login', 'user', u.id);
  return { token, user: publicUser(u) };
}
function authenticate(header) {
  const m = /^Bearer (.+)$/.exec(header || '');
  const p = m && verifyToken(m[1]);
  if (!p) throw new HttpError(401, 'Sign in required', 'unauthenticated');
  const u = q.one('SELECT * FROM users WHERE id = ?', p.sub);
  if (!u || !u.active) throw new HttpError(401, 'Account is not active', 'unauthenticated');
  return u;
}
module.exports = { register, createStaff, login, authenticate, publicUser, hashPassword, verifyPassword, sign, verifyToken };
