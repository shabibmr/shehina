'use strict';
// Staff roles. Owner can do everything.
const PERM = {
  review:  ['owner', 'reviewer'],          // approve investors, companies, new listings
  deposit: ['owner', 'finance'],           // confirm company deposits
  ops:     ['owner', 'ops'],               // stages, fund balance, complete shipments
  wd:      ['owner', 'finance'],           // approve withdrawals
  team:    ['owner'],                      // manage staff, view audit log
  read:    ['owner', 'reviewer', 'ops', 'finance'],
};
const can = (user, action) => user.role === 'staff' && (PERM[action] || []).includes(user.staff_role);
module.exports = { PERM, can };
