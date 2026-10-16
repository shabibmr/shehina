'use strict';
const { q } = require('./db');
const cfg = require('./config');
function audit(actor, action, entity, entityId, detail) {
  q.run('INSERT INTO audit_log (at, actor_id, actor_role, action, entity, entity_id, detail) VALUES (?,?,?,?,?,?,?)',
    cfg.now(), actor ? actor.id : null, actor ? (actor.staff_role || actor.role) : 'system', action, entity || null, entityId || null, detail ? JSON.stringify(detail) : null);
}
module.exports = { audit };
