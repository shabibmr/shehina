'use strict';
class HttpError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code || 'error'; }
}
const bad = (m) => new HttpError(400, m, 'bad_request');
const forbidden = (m) => new HttpError(403, m || 'Not allowed', 'forbidden');
const notFound = (m) => new HttpError(404, m || 'Not found', 'not_found');
const conflict = (m) => new HttpError(409, m, 'conflict');

// Money is US dollars at the edges and whole cents everywhere inside (1 USD = 100 cents).
const CENTS = 100;
const toCents = (usd) => Math.round(Number(usd) * CENTS);      // input boundary only
const fromCents = (c) => c / CENTS;

function int(v, name, { min = -Infinity, max = Infinity } = {}) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw bad(`${name} must be a whole number${min > -Infinity ? ' >= ' + min : ''}${max < Infinity ? ' and <= ' + max : ''}`);
  return n;
}
function usdToCents(v, name, { min = 0.01, max = 1e9 } = {}) {
  const n = Number(v);
  if (v === '' || v === null || !Number.isFinite(n) || n < min || n > max) throw bad(`${name} must be an amount in USD between ${min} and ${max}`);
  const c = Math.round(n * CENTS);
  if (Math.abs(c / CENTS - n) > 1e-9) throw bad(`${name} can have at most 2 decimals`);
  return c;
}
function str(v, name, { min = 1, max = 300 } = {}) {
  if (typeof v !== 'string') throw bad(`${name} is required`);
  const s = v.trim();
  if (s.length < min || s.length > max) throw bad(`${name} must be ${min}-${max} characters`);
  return s;
}
// Optional text: blank or missing gives ''.
function optStr(v, name, { max = 300 } = {}) {
  if (v === undefined || v === null || v === '') return '';
  return str(v, name, { min: 0, max });
}
const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 200;
// International phone number: a leading + and 7-15 digits (spaces, dashes and brackets allowed). Returns digits with the +.
function phone(v, name = 'phone') {
  const s = str(v, name, { max: 30 }).replace(/[\s\-().]/g, '');
  if (!/^\+[1-9]\d{6,14}$/.test(s)) throw bad(`${name} must be an international number starting with + and the country code`);
  return s;
}
// A real calendar date YYYY-MM-DD, not in the future.
function isoDate(v, name) {
  const s = str(v, name, { max: 10 });
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const d = m && new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (!d || d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) throw bad(`${name} must be a valid date (YYYY-MM-DD)`);
  return { text: s, date: d };
}

// Split `total` (can be negative) across weights using largest remainder. Result sums exactly to total.
function allocate(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) throw new Error('allocate: no weights');
  const sign = total < 0 ? -1 : 1, t = Math.abs(total);
  const raw = weights.map((w) => (t * w) / sum);
  const out = raw.map(Math.floor);
  let left = t - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; left > 0; k++, left--) out[order[k % order.length][1]]++;
  return out.map((x) => x * sign);
}
module.exports = { HttpError, bad, forbidden, notFound, conflict, toCents, fromCents, int, usdToCents, str, optStr, isEmail, phone, isoDate, allocate, CENTS };
