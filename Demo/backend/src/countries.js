'use strict';
// Countries (ISO 3166-1 alpha-2). Everything stored and exchanged uses the two-letter code;
// names come from the runtime's locale data. Blocked countries are set in config (BLOCKED_COUNTRIES).
const cfg = require('./config');
const { forbidden, bad } = require('./util');

// Inhabited countries and territories. Uninhabited ones (AQ, BV, HM, TF, UM) are left out: nothing ships from or to them.
const CODES = ('AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ '
  + 'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR '
  + 'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP '
  + 'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ '
  + 'NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW '
  + 'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ '
  + 'UA UG US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW').split(' ');
const SET = new Set(CODES);
const names = new Intl.DisplayNames('en', { type: 'region' });
const nameOf = (code) => names.of(code) || code;
const BY_NAME = new Map(CODES.map((c) => [nameOf(c).toLowerCase(), c]));
// Short names people commonly type.
for (const [alias, code] of [['uae', 'AE'], ['uk', 'GB'], ['usa', 'US'], ['united states of america', 'US'], ['korea', 'KR'], ['russia', 'RU'], ['turkey', 'TR'], ['ivory coast', 'CI']]) BY_NAME.set(alias, code);

// Accepts a code ("in") or an English name ("India"); returns the code or null.
function toCode(v) {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (/^[A-Za-z]{2}$/.test(s) && SET.has(s.toUpperCase())) return s.toUpperCase();
  return BY_NAME.get(s.toLowerCase()) || null;
}
const isBlocked = (code) => cfg.blockedCountries.includes(code);
const list = () => CODES.map((code) => ({ code, name: nameOf(code) })).sort((a, b) => a.name.localeCompare(b.name));
// Validate a country field. Returns the code. Blocked countries are refused with a clear message.
function country(v, label, { allowBlocked = false } = {}) {
  const code = toCode(v);
  if (!code) throw bad(`${label}: choose a country from the list`);
  if (!allowBlocked && isBlocked(code)) throw forbidden(`${label}: we cannot accept ${nameOf(code)} at the moment`);
  return code;
}
module.exports = { CODES, toCode, nameOf, isBlocked, list, country };
