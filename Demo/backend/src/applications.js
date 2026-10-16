'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { q, tx } = require('./db');
const cfg = require('./config');
const { bad, forbidden, notFound, conflict, str, optStr, isEmail, int, phone, isoDate } = require('./util');
const { audit } = require('./audit');
const { can } = require('./perms');
const C = require('./countries');

// Identity documents are accepted from anywhere in the world.
const ID_TYPES = ['passport', 'national_id', 'drivers_licence', 'residence_permit'];
const MANAGER_TYPES = ['company', 'individual'];
const MIN_AGE = 18;

// What each application collects. `country` fields hold ISO codes; `residence` is the country the person lives in
// (or the business is registered in), and is the one checked against the blocked list.
const SPEC = {
  kyc: {
    text: ['name', 'id_number', 'address', 'city', 'occupation', 'source_of_funds'],
    country: ['nationality', 'residence'],
    pick: { id_type: ID_TYPES },
    docs: ['id_document', 'proof_of_address'],
  },
  company: {
    text: ['company_name', 'owner_name', 'owner_id_number', 'address', 'city'],
    optional: { registration_no: 80, registered_in: 80 },
    country: ['residence', 'owner_nationality'],
    pick: { manager_type: MANAGER_TYPES, owner_id_type: ID_TYPES },
    num: ['years_in_business', 'shipments_exported'],
    // A business uploads its registration; an individual trader uploads proof of address instead.
    docs: (data) => (data.manager_type === 'company' ? ['business_registration', 'owner_id', 'company_profile'] : ['owner_id', 'proof_of_address', 'company_profile']),
  },
};
const MIME = ['application/pdf', 'image/jpeg', 'image/png'];

function saveDocument(user, { kind, filename, mime, data_base64 }) {
  kind = str(kind, 'kind', { max: 40 });
  filename = str(filename, 'filename', { max: 150 }).replace(/[^\w.\- ]/g, '_');
  if (!MIME.includes(mime)) throw bad('Only PDF, JPEG or PNG files are accepted');
  if (typeof data_base64 !== 'string') throw bad('data_base64 is required');
  const buf = Buffer.from(data_base64, 'base64');
  if (!buf.length) throw bad('The file is empty');
  if (buf.length > cfg.maxUploadBytes) throw bad('File is too large (max 5 MB)');
  // Check the file really is what it says (magic bytes), so renamed executables are refused.
  const head = buf.subarray(0, 4).toString('hex');
  const okMagic = (mime === 'application/pdf' && head === '25504446') || (mime === 'image/png' && head === '89504e47') || (mime === 'image/jpeg' && head.startsWith('ffd8ff'));
  if (!okMagic) throw bad('The file content does not match its type');
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  fs.mkdirSync(cfg.uploadDir, { recursive: true });
  const p = path.join(cfg.uploadDir, `${user.id}-${sha.slice(0, 24)}`);
  fs.writeFileSync(p, buf, { mode: 0o600 });
  const r = q.run('INSERT INTO documents (user_id, kind, filename, mime, sha256, bytes, path, created_at) VALUES (?,?,?,?,?,?,?,?)', user.id, kind, filename, mime, sha, buf.length, p, cfg.now());
  const id = Number(r.lastInsertRowid);
  audit(user, 'document.upload', 'document', id, { kind });
  return { id, kind, filename, sha256: sha, bytes: buf.length };
}
function readDocument(actor, id) {
  const d = q.one('SELECT * FROM documents WHERE id = ?', id);
  if (!d) throw notFound('Document not found');
  if (d.user_id !== actor.id && !can(actor, 'read')) throw forbidden();
  audit(actor, 'document.view', 'document', id);
  return { meta: d, data: fs.readFileSync(d.path) };
}

const LABEL = { residence: 'Country of residence or registration', nationality: 'Nationality', owner_nationality: 'Owner nationality' };
function validate(type, body) {
  const spec = SPEC[type], data = {}, d = body.data || {}, docs = {};
  for (const k in spec.pick) { if (!spec.pick[k].includes(d[k])) throw bad(`Choose a valid ${k.replace(/_/g, ' ')}`); data[k] = d[k]; }
  for (const k of spec.text) data[k] = str(d[k], k.replace(/_/g, ' '), { max: 200 });
  for (const [k, max] of Object.entries(spec.optional || {})) data[k] = optStr(d[k], k.replace(/_/g, ' '), { max });
  for (const k of spec.country) data[k] = C.country(d[k], LABEL[k], { allowBlocked: k !== 'residence' });
  if (!isEmail(d.email)) throw bad('Enter a valid email');
  data.email = d.email.trim();
  data.phone = phone(d.phone, 'phone');
  for (const k of spec.num || []) data[k] = int(d[k], k.replace(/_/g, ' '), { min: 0, max: 100000 });
  if (type === 'kyc') {
    const dob = isoDate(d.dob, 'date of birth'), now = new Date(cfg.now());
    let age = now.getUTCFullYear() - dob.date.getUTCFullYear();
    if (now.getUTCMonth() < dob.date.getUTCMonth() || (now.getUTCMonth() === dob.date.getUTCMonth() && now.getUTCDate() < dob.date.getUTCDate())) age--;
    if (dob.date > now || age < MIN_AGE) throw bad(`You must be at least ${MIN_AGE} to invest`);
    if (age > 120) throw bad('Enter a valid date of birth');
    data.dob = dob.text;
  } else {
    data.activities = str(d.activities, 'activities', { max: 1500 });
  }
  if (d.ack !== true) throw bad('You must tick the confirmation');
  data.ack = true;
  const dd = body.docs || {};
  for (const k of typeof spec.docs === 'function' ? spec.docs(data) : spec.docs) {
    const id = Number(dd[k]);
    const doc = Number.isInteger(id) && q.one('SELECT * FROM documents WHERE id = ?', id);
    if (!doc) throw bad(`Upload the document: ${k.replace(/_/g, ' ')}`);
    docs[k] = id;
  }
  return { data, docs };
}
function submit(user, type, body) {
  if (type === 'kyc' && user.role !== 'investor') throw forbidden('Only investors complete KYC');
  if (type === 'company' && user.role !== 'company') throw forbidden('Only managers register');
  const { data, docs } = validate(type, body);
  for (const id of Object.values(docs)) if (q.one('SELECT user_id FROM documents WHERE id = ?', id).user_id !== user.id) throw forbidden('Document belongs to someone else');
  return tx(() => {
    const cur = q.one('SELECT * FROM applications WHERE user_id = ? AND type = ?', user.id, type);
    if (cur && cur.status === 'approved') throw conflict('Already approved');
    if (cur && cur.status === 'pending') throw conflict('Already under review');
    if (cur) q.run("UPDATE applications SET status='pending', data=?, docs=?, submitted_at=?, reason=NULL, decided_by=NULL, decided_at=NULL, assigned_to=NULL WHERE id=?", JSON.stringify(data), JSON.stringify(docs), cfg.now(), cur.id);
    else q.run("INSERT INTO applications (user_id, type, status, data, docs, submitted_at) VALUES (?,?,?,?,?,?)", user.id, type, 'pending', JSON.stringify(data), JSON.stringify(docs), cfg.now());
    const row = q.one('SELECT * FROM applications WHERE user_id = ? AND type = ?', user.id, type);
    audit(user, `${type}.submit`, 'application', row.id, { residence: data.residence });
    return present(row);
  });
}
function present(a) { return a && { id: a.id, user_id: a.user_id, type: a.type, status: a.status, data: JSON.parse(a.data), docs: JSON.parse(a.docs), assigned_to: a.assigned_to, reason: a.reason, submitted_at: a.submitted_at, decided_at: a.decided_at }; }
function mine(user, type) { return present(q.one('SELECT * FROM applications WHERE user_id = ? AND type = ?', user.id, type)) || { status: 'none' }; }
function isApproved(userId, type) { const a = q.one('SELECT status FROM applications WHERE user_id = ? AND type = ?', userId, type); return !!a && a.status === 'approved'; }

function list(actor, type, status) {
  if (!can(actor, 'read')) throw forbidden();
  const rows = status ? q.all('SELECT * FROM applications WHERE type = ? AND status = ? ORDER BY submitted_at', type, status) : q.all('SELECT * FROM applications WHERE type = ? ORDER BY submitted_at', type);
  return rows.map(present);
}
function ownerOnlyIfAssigned(actor, item) {
  if (item.assigned_to && item.assigned_to !== actor.id && actor.staff_role !== 'owner') throw forbidden('This item is assigned to another reviewer');
}
function decide(actor, id, { approve, reason }) {
  if (!can(actor, 'review')) throw forbidden('Your role cannot review applications');
  return tx(() => {
    const a = q.one('SELECT * FROM applications WHERE id = ?', id);
    if (!a) throw notFound();
    if (a.status !== 'pending') throw conflict('This application is not waiting for review');
    ownerOnlyIfAssigned(actor, a);
    if (approve !== true && !(typeof reason === 'string' && reason.trim())) throw bad('Give a reason when rejecting');
    // The blocked list can change after someone applied: never approve someone from a country we now cannot accept.
    if (approve === true && C.isBlocked(JSON.parse(a.data).residence)) throw forbidden('This applicant is in a country we cannot accept. Reject it instead.');
    q.run('UPDATE applications SET status=?, decided_by=?, decided_at=?, reason=? WHERE id=?', approve === true ? 'approved' : 'rejected', actor.id, cfg.now(), approve === true ? null : reason.trim(), id);
    audit(actor, `${a.type}.${approve === true ? 'approve' : 'reject'}`, 'application', id, { user_id: a.user_id, reason });
    return present(q.one('SELECT * FROM applications WHERE id = ?', id));
  });
}
function assign(actor, id, staffId) {
  if (!can(actor, 'review')) throw forbidden();
  const a = q.one('SELECT * FROM applications WHERE id = ?', id);
  if (!a) throw notFound();
  if (staffId !== null) {
    const s = q.one("SELECT * FROM users WHERE id = ? AND role='staff' AND active=1 AND staff_role IN ('owner','reviewer')", staffId);
    if (!s) throw bad('Pick an active reviewer');
  }
  q.run('UPDATE applications SET assigned_to = ? WHERE id = ?', staffId, id);
  audit(actor, 'application.assign', 'application', id, { to: staffId });
  return present(q.one('SELECT * FROM applications WHERE id = ?', id));
}
module.exports = { saveDocument, readDocument, submit, mine, isApproved, list, decide, assign, present, ownerOnlyIfAssigned, SPEC, ID_TYPES, MANAGER_TYPES };
