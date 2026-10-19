/*! Notenheft 6.4 – Stundenplan, Termine & mündliche Noten, Ende-zu-Ende-verschlüsselt. MIT-Lizenz. */
'use strict';
(() => {
  const APP_VERSION = '6.4.2';
  const LS_VAULT = 'notenheft.vault.v1';
  const LS_UI = 'notenheft.ui.v2';
  const LS_PASSKEY = 'notenheft.passkey.v1';
  const KDF_ITER = 600000;
  const GRADES = [1, 2, 3, 4, 5, 6];
  const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const WD_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const COLORS = ['#5b5bd6', '#0e9f8e', '#e8772e', '#d6409f', '#2f7fd9', '#3e9b4f', '#8e4ec6', '#c98b1a', '#d9463b', '#607089'];
  const EXAM_KINDS = ['Klausur', 'Klassenarbeit', 'Test', 'Vokabeltest', 'Mündliche Prüfung', 'Sonstiges'];
  const DEFAULT_PERIODS = [
    ['08:00', '08:45'], ['08:45', '09:30'], ['09:50', '10:35'], ['10:35', '11:20'], ['11:40', '12:25'],
    ['12:30', '13:15'], ['13:35', '14:20'], ['14:20', '15:05'], ['15:10', '15:55'], ['15:55', '16:40']
  ].map(([start, end]) => ({ start, end }));
  // Notenraster (universitäre Rundung): Bezeichnung ↔ Zahlenwert
  const GRID = [['1+', 0.7], ['1', 1.0], ['1-', 1.3], ['2+', 1.7], ['2', 2.0], ['2-', 2.3], ['3+', 2.7], ['3', 3.0], ['3-', 3.3],
    ['4+', 3.7], ['4', 4.0], ['4-', 4.3], ['5+', 4.7], ['5', 5.0], ['5-', 5.3], ['6', 6.0]];
  const LEVELS = [['SI', 'Sekundarstufe I'], ['EF', 'EF'], ['Q1', 'Q1'], ['Q2', 'Q2']];

  /* =====================================================================
     Hilfsfunktionen
     ===================================================================== */
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), x => x.toString(16).padStart(2, '0')).join('');
  const now = () => Date.now();
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
  const sum = a => a.reduce((s, x) => s + x, 0);
  const fmtNum = (n, d = 2) => (n == null || isNaN(n)) ? '–' : n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
  const collator = new Intl.Collator('de', { sensitivity: 'base', numeric: true });
  const groupBy = (arr, key) => {
    const fn = typeof key === 'function' ? key : x => x[key];
    const m = new Map();
    for (const x of arr) { const k = fn(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); }
    return m;
  };
  const hash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0'); };
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  // Datum (lokal, ISO-Strings JJJJ-MM-TT)
  const pad = n => String(n).padStart(2, '0');
  const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
  const addDaysISO = (iso, n) => toISO(addDays(parseISO(iso), n));
  const todayISO = () => toISO(new Date());
  const mondayOf = d => addDays(d, -((d.getDay() + 6) % 7));
  const wdOf = iso => (parseISO(iso).getDay() + 6) % 7; // 0 = Montag
  const diffDays = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);
  const isoWeek = d => {
    const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = x.getUTCDay() || 7;
    x.setUTCDate(x.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
    return Math.ceil(((x - y0) / 86400000 + 1) / 7);
  };
  const fmtDate = (d, withYear = false) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${withYear ? d.getFullYear() : ''}`;
  const fmtISO = (iso, withYear = false) => fmtDate(parseISO(iso), withYear);
  const fmtLong = iso => { const d = parseISO(iso); return `${WD_LONG[wdOf(iso)]}, ${d.getDate()}. ${MONTHS[d.getMonth()]}`; };
  const fmtShort = iso => `${WD[wdOf(iso)]}, ${fmtISO(iso)}`;
  const weekKey = iso => toISO(mondayOf(parseISO(iso)));
  const timeToMin = t => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
  const minToTime = m => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
  const tsOf = (iso, time) => parseISO(iso).getTime() + timeToMin(time) * 60000;
  const relDays = n => n === 0 ? 'heute' : n === 1 ? 'morgen' : n === -1 ? 'gestern' : n > 0 ? `in ${n} Tagen` : `vor ${-n} Tagen`;

  // Base64
  const bytesToB64 = bytes => {
    bytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const b64ToBytes = b64 => {
    const s = atob(b64.replace(/\s/g, ''));
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  };
  const b64url = bytes => bytesToB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const fromB64url = s => b64ToBytes(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  const utf8 = s => new TextEncoder().encode(s);
  const unutf8 = b => new TextDecoder().decode(b);

  async function gzip(bytes) {
    if (typeof CompressionStream === 'undefined') return null;
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  async function gunzip(bytes) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  /* =====================================================================
     Verschlüsselung: AES-256-GCM, Schlüssel per PBKDF2-SHA256 aus dem Passwort
     ===================================================================== */
  const Vault = {
    password: null,
    salt: null,
    keys: new Map(),
    newSalt() { return bytesToB64(crypto.getRandomValues(new Uint8Array(16))); },
    async key(saltB64, iter, password) {
      const cacheable = password === this.password;
      const ck = saltB64 + ':' + iter;
      if (cacheable && this.keys.has(ck)) return this.keys.get(ck);
      const base = await crypto.subtle.importKey('raw', utf8(password), 'PBKDF2', false, ['deriveKey']);
      const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: b64ToBytes(saltB64), iterations: iter, hash: 'SHA-256' },
        base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      if (cacheable) this.keys.set(ck, key);
      return key;
    },
    async encrypt(obj, password = this.password, salt = this.salt) {
      let bytes = utf8(JSON.stringify(obj));
      let z = null;
      const gz = await gzip(bytes);
      if (gz) { bytes = gz; z = 'gzip'; }
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await this.key(salt, KDF_ITER, password);
      const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes));
      return { format: 'notenheft', v: 1, kdf: 'PBKDF2-SHA256', iter: KDF_ITER, salt, iv: bytesToB64(iv), z, ct: bytesToB64(ct) };
    },
    async decrypt(blob, password = this.password) {
      if (!blob || blob.format !== 'notenheft' || !blob.ct) { const e = new Error('Keine gültige Notenheft-Datei.'); e.code = 'FORMAT'; throw e; }
      const key = await this.key(blob.salt, blob.iter, password);
      let bytes;
      try {
        bytes = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(blob.iv) }, key, b64ToBytes(blob.ct)));
      } catch {
        const e = new Error('Falsches Passwort.'); e.code = 'WRONG_PW'; throw e;
      }
      if (blob.z === 'gzip') bytes = await gunzip(bytes);
      return JSON.parse(unutf8(bytes));
    },
    clear() { this.password = null; this.salt = null; this.keys.clear(); }
  };

  /* =====================================================================
     Face ID / Windows Hello: Passkey mit PRF-Erweiterung
     Der Passkey liefert einen geräteeigenen Schlüssel, mit dem das Passwort
     lokal verschlüsselt abgelegt wird. Ohne Face ID bleibt es unlesbar.
     ===================================================================== */
  const Passkey = {
    available() { return !!(window.PublicKeyCredential && navigator.credentials && navigator.credentials.create); },
    rec() { try { return JSON.parse(localStorage.getItem(LS_PASSKEY) || 'null'); } catch { return null; } },
    label() { return isIOS() ? 'Face ID' : /Windows/.test(navigator.userAgent) ? 'Windows Hello' : 'Passkey'; },
    noPrf() { const e = new Error(`Dieses Gerät bzw. dieser Browser unterstützt das Entsperren per ${this.label()} noch nicht (PRF-Erweiterung fehlt).`); e.code = 'NOPRF'; return e; },
    async wrapKey(prfOut) {
      const base = await crypto.subtle.importKey('raw', prfOut, 'HKDF', false, ['deriveKey']);
      return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: utf8('notenheft-passkey-v1'), info: utf8('password-wrap') },
        base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    },
    async evalPrf(credIdB64, saltB64) {
      const a = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: [{ type: 'public-key', id: b64ToBytes(credIdB64) }],
          userVerification: 'required', timeout: 60000,
          extensions: { prf: { eval: { first: b64ToBytes(saltB64) } } }
        }
      });
      const r = a && a.getClientExtensionResults && a.getClientExtensionResults().prf?.results?.first;
      if (!r) throw this.noPrf();
      return r;
    },
    async enroll(password) {
      if (!this.available()) throw this.noPrf();
      const salt = crypto.getRandomValues(new Uint8Array(32));
      const cred = await navigator.credentials.create({
        publicKey: {
          rp: { name: 'Notenheft' },
          user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'Notenheft', displayName: 'Notenheft' },
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
          authenticatorSelection: { userVerification: 'required', residentKey: 'preferred' },
          attestation: 'none', timeout: 60000,
          extensions: { prf: { eval: { first: salt } } }
        }
      });
      const ext = (cred.getClientExtensionResults && cred.getClientExtensionResults()) || {};
      if (!ext.prf || ext.prf.enabled === false) throw this.noPrf();
      const credId = bytesToB64(new Uint8Array(cred.rawId));
      const saltB64 = bytesToB64(salt);
      const out = ext.prf.results?.first || await this.evalPrf(credId, saltB64);
      const key = await this.wrapKey(out);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, utf8(password)));
      localStorage.setItem(LS_PASSKEY, JSON.stringify({ credId, salt: saltB64, iv: bytesToB64(iv), ct: bytesToB64(ct), created: now() }));
    },
    async unlock() {
      const r = this.rec();
      if (!r) throw new Error('Kein Passkey eingerichtet.');
      const out = await this.evalPrf(r.credId, r.salt);
      const key = await this.wrapKey(out);
      try { return unutf8(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(r.iv) }, key, b64ToBytes(r.ct))); }
      catch { throw new Error('Der gespeicherte Schlüssel passt nicht mehr. Bitte mit Passwort entsperren.'); }
    },
    remove() { try { localStorage.removeItem(LS_PASSKEY); } catch { /* egal */ } }
  };

  /* =====================================================================
     Zustand & Datenmodell
     ===================================================================== */
  const freshSync = () => ({ state: 'idle', msg: '', last: 0, timer: null, running: false, again: false, promise: null, repoOk: false });
  const S = {
    data: null, device: null,
    view: 'heute',
    heuteDate: null,
    planWeek: toISO(mondayOf(new Date())),
    notenTab: 'erfassen',
    classId: null,
    weekStart: toISO(mondayOf(new Date())),
    day: null, mode: 'liste', cardIdx: 0, onlyMissing: false,
    ovRange: 'hj', ovFrom: null, ovTo: null, ovSort: 'name', ovTab: 'tabelle',
    detailStudent: null,
    courseId: null, courseTab: 'ueberblick',
    assessId: null, vIdx: 0, vHalf: false, vMode: 'karte', zTerm: null, zTab: 'noten', chartRange: 'sj', detailFrom: null,
    setupMode: 'new',
    sync: freshSync(),
    lastActivity: now(), hiddenAt: null
  };

  const MAPS = ['classes', 'students', 'entries', 'events', 'holidays', 'assessments', 'results', 'overrides', 'warnings', 'obs', 'reminders', 'todos', 'kmkeys', 'calendars', 'prefs'];
  const NT = { muendlich: 'erfassen', tests: 'leistungen', uebersicht: 'uebersicht', zeugnis: 'zeugnis' };
  const NT_REV = { erfassen: 'muendlich', leistungen: 'tests', uebersicht: 'uebersicht', zeugnis: 'zeugnis' };
  Object.defineProperty(S, 'notenTab', { configurable: true, enumerable: true, get() { return NT[S.courseTab] || 'erfassen'; }, set(v) { S.courseTab = NT_REV[v] || 'muendlich'; } });
  Object.assign(S, { weekMode: 'grid', tFilter: 'alle', tPast: false, jRange: 'block', jCourse: null });
  const emptyData = () => {
    const d = { schema: 3, settings: { weighting: 'note', periods: DEFAULT_PERIODS.map(p => ({ ...p })), planStart: null, terms: {}, updatedAt: 0 } };
    for (const k of MAPS) d[k] = {};
    return d;
  };
  const defaultDevice = () => ({ gh: null, lockMinutes: 10, oldPw: null, names: {} });
  function normalizeData(d) {
    const e = emptyData();
    d = d || {};
    const settings = Object.assign(e.settings, d.settings || {});
    if (!Array.isArray(settings.periods) || !settings.periods.length) settings.periods = e.settings.periods;
    if (!settings.terms) settings.terms = {};
    const out = { schema: 3, settings };
    for (const k of MAPS) out[k] = d[k] || {};
    return out;
  }

  /* =====================================================================
     Pseudonymisierung: Klarnamen liegen nur lokal (S.device.names).
     Synchronisiert und online gespeichert werden nur zufällige Kürzel.
     Der Anzeigename s.name ist eine nicht-enumerierbare Eigenschaft und
     landet deshalb nie in JSON (Sync, lokale Daten, Sicherung der Daten).
     ===================================================================== */
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function newCode(used) {
    for (;;) {
      const b = crypto.getRandomValues(new Uint8Array(5));
      const c = Array.from(b, x => CODE_CHARS[x % CODE_CHARS.length]).join('');
      if (!used.has(c)) { used.add(c); return c; }
    }
  }
  const usedCodes = d => new Set(Object.values(d.students || {}).map(x => x.code).filter(Boolean));
  const setStudentName = (st, name) => Object.defineProperty(st, 'name', { value: name, enumerable: false, writable: true, configurable: true });
  function hydrateNames() {
    if (!S.data || !S.device) return;
    const names = S.device.names || (S.device.names = {});
    for (const st of Object.values(S.data.students)) if (!st.deleted) setStudentName(st, names[st.id] || st.code || '???');
  }
  function migrateNames(d = S.data) { // Altbestand: Klarnamen aus den Daten in die lokale Liste verschieben, Kürzel vergeben
    const names = S.device.names || (S.device.names = {});
    const used = usedCodes(d);
    let n = 0;
    for (const st of Object.values(d.students)) {
      if (st.deleted) continue;
      let ch = false;
      if (Object.prototype.propertyIsEnumerable.call(st, 'name')) { if (st.name) names[st.id] = st.name; delete st.name; ch = true; }
      if (!st.code) { st.code = newCode(used); ch = true; }
      if (ch) { st.updatedAt = now(); n++; }
    }
    return n;
  }
  const adoptData = () => { const n = migrateNames(S.data); hydrateNames(); return n; };
  const missingNames = () => live(S.data.students).filter(st => !(S.device.names || {})[st.id]).length;

  const live = obj => Object.values(obj || {}).filter(x => !x.deleted);
  const classesSorted = () => live(S.data.classes).sort((a, b) => collator.compare(a.name, b.name) || collator.compare(a.subject || '', b.subject || ''));
  const nameKey = n => { const p = String(n || '').trim().split(/\s+/); return p.length > 1 ? p[p.length - 1] + ' ' + p.slice(0, -1).join(' ') : (p[0] || ''); };
  const byLastName = (a, b) => collator.compare(nameKey(a), nameKey(b));
  const studentsOf = cid => live(S.data.students).filter(s => s.classId === cid).sort((a, b) => byLastName(a.name, b.name));
  // Pro Kind, Kurs und Datum zählt genau EIN Eintrag (bei Altbeständen der zuletzt geänderte)
  const entryKey = e => `${e.classId}|${e.studentId}|${e.date}`;
  let entCache = { src: null, list: [] };
  function liveEntries() {
    if (entCache.src === S.data.entries) return entCache.list;
    const m = new Map();
    for (const e of Object.values(S.data.entries || {})) {
      if (e.deleted) continue;
      const k = entryKey(e), o = m.get(k);
      if (!o || (e.updatedAt || 0) > (o.updatedAt || 0)) m.set(k, e);
    }
    entCache = { src: S.data.entries, list: [...m.values()] };
    return entCache.list;
  }
  const entryOn = (cid, sid, date) => liveEntries().find(e => e.classId === cid && e.studentId === sid && e.date === date) || null;
  const entriesOf = (cid, from, to) => liveEntries().filter(e => e.classId === cid && (!from || e.date >= from) && (!to || e.date <= to));
  const byDate = (a, b) => a.date.localeCompare(b.date) || (a.createdAt || 0) - (b.createdAt || 0);
  const clsLabel = c => c ? (c.subject ? `${c.name} · ${c.subject}` : c.name) : '';
  const clsColor = c => (c && c.color) || COLORS[0];
  const nextColor = () => { const used = live(S.data.classes).map(c => c.color); return COLORS.find(c => !used.includes(c)) || COLORS[used.length % COLORS.length]; };
  const periods = () => S.data.settings.periods;

  function ensureClass() {
    const cs = classesSorted();
    if (!cs.length) { S.classId = null; return null; }
    const c = S.data.classes[S.classId];
    if (!c || c.deleted) S.classId = cs[0].id;
    return S.data.classes[S.classId];
  }

  // Zusammenführen: pro Datensatz gewinnt die neuere Änderung
  function mergeMaps(a, b) {
    const out = Object.assign({}, a);
    for (const [id, v] of Object.entries(b || {})) {
      if (!out[id] || (v.updatedAt || 0) > (out[id].updatedAt || 0)) out[id] = v;
    }
    return out;
  }
  function mergeData(a, b) {
    const out = { schema: 3, settings: (b.settings?.updatedAt || 0) > (a.settings?.updatedAt || 0) ? b.settings : a.settings };
    for (const k of MAPS) out[k] = mergeMaps(a[k], b[k]);
    return out;
  }
  function sortKeys(v) {
    if (Array.isArray(v)) return v.map(sortKeys);
    if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) o[k] = sortKeys(v[k]); return o; }
    return v;
  }
  const canon = d => JSON.stringify(sortKeys(d));

  /* =====================================================================
     Kalender: Feiertage, Ferien, Unterrichtsstunden, Prüfungen
     ===================================================================== */
  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
      g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
      l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
      month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  }
  const feiertagCache = new Map();
  function feiertage(y) { // gesetzliche Feiertage NRW
    if (feiertagCache.has(y)) return feiertagCache.get(y);
    const m = new Map([[`${y}-01-01`, 'Neujahr'], [`${y}-05-01`, 'Tag der Arbeit'], [`${y}-10-03`, 'Tag der Deutschen Einheit'],
      [`${y}-11-01`, 'Allerheiligen'], [`${y}-12-25`, '1. Weihnachtstag'], [`${y}-12-26`, '2. Weihnachtstag']]);
    const e = easter(y);
    for (const [off, name] of [[-2, 'Karfreitag'], [1, 'Ostermontag'], [39, 'Christi Himmelfahrt'], [50, 'Pfingstmontag'], [60, 'Fronleichnam']]) m.set(toISO(addDays(e, off)), name);
    feiertagCache.set(y, m);
    return m;
  }
  function holidayOn(iso) { return live(S.data.holidays).find(h => iso >= h.from && iso <= h.to) || null; }
  function freeReason(iso) {
    const f = feiertage(parseISO(iso).getFullYear()).get(iso);
    if (f) return f;
    const h = holidayOn(iso);
    if (h) return h.name;
    if (wdOf(iso) >= 5) return 'Wochenende';
    return null;
  }
  function periodTimes(from, to) {
    const P = periods();
    return { start: P[from - 1]?.start || '', end: P[to - 1]?.end || P[to - 1]?.start || '' };
  }
  const eventsOn = iso => live(S.data.events).filter(e => e.date === iso);
  function ausfallFor(iso, cid) {
    return live(S.data.events).find(e => e.type === 'ausfall' && e.date === iso && (!e.classId || e.classId === cid)) || null;
  }
  // Stundentausch: gleiche Klasse, anderes Fach (z. B. 06c: statt Deutsch Englisch)
  const normCls = n => String(n || '').toLowerCase().replace(/\s+/g, '').replace(/^0+(?=\d)/, '');
  const partnersOf = c => c ? classesSorted().filter(o => o.id !== c.id && normCls(o.name) === normCls(c.name)) : [];
  const swapName = (c, other) => !c ? '?' : other && normCls(c.name) === normCls(other.name) ? (c.subject || c.name) : clsLabel(c); // „Englisch“ bzw. bei anderer Klasse „05d · Englisch“
  function lessonsOn(iso, cid = null) {
    if (freeReason(iso)) return [];
    const swaps = live(S.data.events).filter(e => e.type === 'tausch' && e.date === iso && S.data.classes[e.toClassId] && !S.data.classes[e.toClassId].deleted);
    if (swaps.length) {
      const all = baseLessonsOn(iso, null);
      const extra = [];
      for (const e of swaps) {
        let l = all.find(x => x.cls.id === e.classId && x.from <= e.from && e.from <= x.to && !x.away);
        if (!l || l.ausfall) continue;
        // Einzelstunde aus einer Doppelstunde tauschen: Block aufteilen
        const eFrom = e.to ? e.from : l.from, eTo = e.to ? Math.min(Math.max(e.to, e.from), l.to) : l.to;
        if (eFrom > l.from || eTo < l.to) {
          const mk = (f, t) => ({ ...l, from: f, to: t, hours: t - f + 1, ...periodTimes(f, t) });
          const parts = [];
          if (eFrom > l.from) parts.push(mk(l.from, eFrom - 1));
          const mid = mk(eFrom, eTo); parts.push(mid);
          if (eTo < l.to) parts.push(mk(eTo + 1, l.to));
          all.splice(all.indexOf(l), 1, ...parts);
          l = mid;
        }
        const to = S.data.classes[e.toClassId];
        l.cancelled = `Tausch: ${swapName(to, l.cls)} statt ${swapName(l.cls, to)}`;
        l.away = e;
        const aus = ausfallFor(iso, to.id);
        extra.push({ ...l, cls: to, away: null, swapIn: e, swapFrom: l.cls, room: l.room || to.room || '', cancelled: aus ? (aus.note || 'Ausfall') : null, ausfall: aus });
      }
      return all.concat(extra).filter(l => !cid || l.cls.id === cid).sort((a, b) => a.from - b.from || collator.compare(a.cls.name, b.cls.name));
    }
    return baseLessonsOn(iso, cid);
  }
  function baseLessonsOn(iso, cid) {
    const wd = wdOf(iso) + 1;
    const out = [];
    for (const c of classesSorted()) {
      if (cid && c.id !== cid) continue;
      for (const sl of (c.slots || [])) {
        if (sl.wd !== wd || !slotValid(sl, iso)) continue;
        const t = periodTimes(sl.from, sl.to);
        const aus = ausfallFor(iso, c.id);
        out.push({
          cls: c, date: iso, from: sl.from, to: sl.to, hours: sl.to - sl.from + 1,
          room: sl.room || c.room || '', start: t.start, end: t.end,
          cancelled: aus ? (aus.note || 'Ausfall') : null, ausfall: aus
        });
      }
    }
    return out.sort((a, b) => a.from - b.from || collator.compare(a.cls.name, b.cls.name));
  }
  function lessonsBetween(cid, fromIso, toIso) {
    const out = [];
    if (!fromIso || !toIso || fromIso > toIso) return out;
    for (let d = parseISO(fromIso), end = parseISO(toIso); d <= end; d = addDays(d, 1)) out.push(...lessonsOn(toISO(d), cid));
    return out;
  }
  const lessonStarted = l => tsOf(l.date, l.start) <= now();
  const lessonRunning = l => { const t = now(); return tsOf(l.date, l.start) <= t && t < tsOf(l.date, l.end); };
  function nextLessons(cid, n = 5) {
    const out = [];
    let d = todayISO();
    for (let i = 0; i < 120 && out.length < n; i++, d = addDaysISO(d, 1)) {
      for (const l of lessonsOn(d, cid)) if (!lessonStarted(l) || lessonRunning(l)) out.push(l);
    }
    return out.slice(0, n);
  }
  function examInfo(ev) {
    const days = diffDays(todayISO(), ev.date);
    let lessons = null;
    if (ev.classId && days >= 0) {
      lessons = sum(lessonsBetween(ev.classId, todayISO(), addDaysISO(ev.date, -1))
        .filter(l => !l.cancelled && !lessonStarted(l)).map(l => l.hours));
    }
    return { days, lessons };
  }
  function upcomingExams(cid = null, limitDays = 120) {
    const t = todayISO(), max = addDaysISO(t, limitDays);
    return live(S.data.events).filter(e => e.type === 'pruefung' && e.date >= t && e.date <= max && (!cid || e.classId === cid))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  function currentBlock() { // aktueller Unterrichtsabschnitt: nach den letzten Ferien bis vor die nächsten
    const t = todayISO();
    const hs = live(S.data.holidays).sort((a, b) => a.from.localeCompare(b.from));
    const next = hs.find(h => h.from > t);
    const prev = [...hs].reverse().find(h => h.to < t);
    let from = prev ? addDaysISO(prev.to, 1) : null;
    const ps = S.data.settings.planStart;
    if (ps && (!from || ps > from) && ps <= t) from = ps;
    if (!from) from = rangeFor('hj')[0];
    const to = next ? addDaysISO(next.from, -1) : addDaysISO(t, 56);
    return { from, to, next };
  }
  function courseStats(cid) {
    const b = currentBlock();
    const ls = lessonsBetween(cid, b.from, b.to).filter(l => !l.away); // getauschte Stunden gehören zum anderen Fach
    const soll = sum(ls.map(l => l.hours));
    const ausgefallen = sum(ls.filter(l => l.cancelled).map(l => l.hours));
    const gehalten = sum(ls.filter(l => !l.cancelled && lessonStarted(l)).map(l => l.hours));
    return { ...b, soll, ausgefallen, gehalten, rest: soll - ausgefallen - gehalten, termine: ls.length };
  }
  const slotValid = (sl, iso) => (!sl.validFrom || iso >= sl.validFrom) && (!sl.validTo || iso <= sl.validTo);
  const currentSlots = c => (c.slots || []).filter(s => slotValid(s, todayISO()) || (s.validFrom && s.validFrom > todayISO() && !(c.slots || []).some(o => o !== s && slotValid(o, todayISO()))));
  const weeklyHours = c => sum((c.slots || []).filter(s => slotValid(s, todayISO())).map(s => s.to - s.from + 1));
  const pLabel = (from, to) => from === to ? `${from}. Std.` : `${from}.–${to}. Std.`;

  /* =====================================================================
     Noten-Statistik
     ===================================================================== */
  function stats(entries) {
    const graded = entries.filter(e => e.kind === 'note' && e.grade).sort(byDate);
    const byWeek = groupBy(graded, e => weekKey(e.date));
    const weekAvgs = [...byWeek.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([week, es]) => ({ week, avg: mean(es.map(e => e.grade)), n: es.length }));
    const avg = !graded.length ? null
      : S.data.settings.weighting === 'woche' ? mean(weekAvgs.map(w => w.avg)) : mean(graded.map(e => e.grade));
    // Tendenz: Schnitt der letzten 4 Wochen gegenüber allen Wochen davor
    let trend = null;
    const cut = addDaysISO(toISO(mondayOf(new Date())), -21);
    const recent = weekAvgs.filter(w => w.week >= cut), before = weekAvgs.filter(w => w.week < cut);
    if (recent.length && before.length) {
      const diff = mean(recent.map(w => w.avg)) - mean(before.map(w => w.avg));
      trend = diff <= -0.3 ? 'up' : diff >= 0.3 ? 'down' : 'flat';
    }
    return {
      count: graded.length, avg, weekAvgs, trend,
      absent: entries.filter(e => e.kind === 'fehlte').length,
      nb: entries.filter(e => e.kind === 'nb').length
    };
  }
  const avgCls = avg => avg == null ? 'none' : 'g' + Math.min(6, Math.max(1, Math.round(avg)));
  const labelEntry = e => e.kind === 'note' ? `Note ${e.grade}` : e.kind === 'fehlte' ? '„fehlte“' : '„ohne Note“';

  /* =====================================================================
     Zeugnisrechnung: Notenraster, Punkte, Zeiträume, Teilnoten
     ===================================================================== */
  const gridValue = label => { const g = GRID.find(x => x[0] === String(label ?? '').trim().replace(/[−–]/g, '-')); return g ? g[1] : null; };
  const gridLabel = v => { if (v == null) return null; let best = GRID[0]; for (const g of GRID) if (Math.abs(g[1] - v) < Math.abs(best[1] - v) - 1e-9) best = g; return best[0]; };
  const toPoints = v => v == null ? null : Math.max(0, Math.min(15, Math.round(17 - 3 * v + 1e-9)));
  const pointsToValue = p => (17 - p) / 3;
  const guessLevel = name => { const n = String(name || '').trim().toUpperCase(); return /^EF\b/.test(n) ? 'EF' : /^Q1\b/.test(n) ? 'Q1' : /^Q2\b/.test(n) ? 'Q2' : 'SI'; };
  const levelOf = c => (c && c.level) || guessLevel(c?.name);
  const isSII = c => levelOf(c) !== 'SI';
  const levelLabel = c => ({ SI: 'Sek I', EF: 'EF', Q1: 'Q1', Q2: 'Q2' })[levelOf(c)];
  function vocabLabel(p) {
    for (const [min, l] of [[9.5, '1'], [8, '2'], [7.5, '2-'], [6, '3'], [5.5, '3-'], [4, '4'], [3.5, '4-'], [2, '5'], [1.5, '5-']]) if (p >= min) return l;
    return '6';
  }
  const fmtPts = p => p == null ? '–' : `${String(p).padStart(2, '0')} P.`;
  const snap = (c, v) => v == null ? null : isSII(c) ? pointsToValue(toPoints(v)) : gridValue(gridLabel(v));
  const gradeText = (c, v) => v == null ? '–' : isSII(c) ? fmtPts(toPoints(v)) : gridLabel(v);
  const valCls = v => avgCls(v);

  function schoolYearStart() { const t = new Date(); return t.getMonth() + 1 >= 8 ? t.getFullYear() : t.getFullYear() - 1; }
  function termCfg() {
    const sy = schoolYearStart();
    const T = (S.data.settings.terms || {})[sy] || {};
    const oster = live(S.data.holidays).find(h => /oster/i.test(h.name) && h.from.startsWith(String(sy + 1)));
    return Object.assign({
      start: `${sy}-08-01`, hj1End: `${sy + 1}-01-31`, end: `${sy + 1}-07-31`,
      q1End: `${sy}-11-13`, q3End: `${sy + 1}-04-23`,
      q2q1End: `${sy}-11-13`, q2q3End: `${sy + 1}-02-26`, q2End: oster ? addDaysISO(oster.from, -1) : `${sy + 1}-03-19`,
      warnDeadline: null
    }, T, { sy });
  }
  function termsFor(level) {
    const t = termCfg();
    const nx = iso => addDaysISO(iso, 1);
    if (level === 'SI') return [
      { key: 'HJ1', label: '1. Halbjahr', short: '1. HJ', from: t.start, to: t.hj1End, zeugnis: true },
      { key: 'HJ2', label: '2. Halbjahr', short: '2. HJ', from: nx(t.hj1End), to: t.end, zeugnis: true }];
    const q1 = level === 'Q2' ? t.q2q1End : t.q1End, q3 = level === 'Q2' ? t.q2q3End : t.q3End, end = level === 'Q2' ? t.q2End : t.end;
    return [
      { key: 'Q1', label: '1. Quartal', short: '1. Qu.', from: t.start, to: q1, quarter: true },
      { key: 'Q2', label: '2. Quartal', short: '2. Qu.', from: nx(q1), to: t.hj1End, quarter: true },
      { key: 'HJ1', label: '1. Halbjahr (Zeugnis)', short: '1. HJ', from: t.start, to: t.hj1End, zeugnis: true, parts: ['Q1', 'Q2'] },
      { key: 'Q3', label: '3. Quartal', short: '3. Qu.', from: nx(t.hj1End), to: q3, quarter: true },
      { key: 'Q4', label: '4. Quartal', short: '4. Qu.', from: nx(q3), to: end, quarter: true },
      { key: 'HJ2', label: '2. Halbjahr (Zeugnis)', short: '2. HJ', from: nx(t.hj1End), to: end, zeugnis: true, parts: ['Q3', 'Q4'] }];
  }
  function currentTerm(level) {
    const t = todayISO();
    const ts = termsFor(level);
    return ts.find(x => x.quarter && t >= x.from && t <= x.to) || ts.find(x => t >= x.from && t <= x.to) || ts[ts.length - 1];
  }
  const inHJ2 = () => todayISO() > termCfg().hj1End;

  const resultOf = (aid, sid) => { const r = S.data.results[aid + '|' + sid]; return r && !r.deleted ? r : null; };
  const assessmentsOf = (cid, type, from, to) => live(S.data.assessments)
    .filter(a => a.classId === cid && (!type || a.type === type) && (!from || a.date >= from) && (!to || a.date <= to))
    .sort((a, b) => a.date.localeCompare(b.date) || collator.compare(a.title, b.title));

  // Gewichtung einer Arbeit (Standard 1); mündliche Prüfungen zählen zum schriftlichen Teil
  const weightOf = a => (a && a.weight > 0 ? a.weight : 1);
  const artLabel = a => a.type === 'vokabel' ? 'Vokabeltest' : a.art === 'muendlich' ? 'Mündliche Prüfung' : 'schriftlich';
  function calcRaw(s, c, from, to) {
    const inR = d => d >= from && d <= to;
    const ment = liveEntries().filter(e => e.studentId === s.id && e.kind === 'note' && e.grade && inR(e.date));
    const mUnits = S.data.settings.weighting === 'woche'
      ? [...groupBy(ment, e => weekKey(e.date)).values()].map(es => mean(es.map(e => e.grade)))
      : ment.map(e => e.grade);
    const vok = [], schr = [];
    for (const a of assessmentsOf(c.id, null, from, to)) {
      const r = resultOf(a.id, s.id);
      if (!r || r.value == null) continue;
      if (a.type === 'vokabel') vok.push(r.value); else schr.push([r.value, weightOf(a)]);
    }
    const somiItems = mUnits.concat(vok);
    const wSum = sum(schr.map(x => x[1]));
    return { mCount: mUnits.length, mAvg: mean(mUnits), vCount: vok.length, vAvg: mean(vok), somi: mean(somiItems), schr: wSum ? sum(schr.map(x => x[0] * x[1])) / wSum : null, sCount: schr.length, weighted: schr.some(x => x[1] !== 1) };
  }
  function calc(s, term, c) {
    c = c || S.data.classes[s.classId];
    let r;
    if (term.parts) {
      const parts = termsFor(levelOf(c)).filter(t => term.parts.includes(t.key)).map(t => calcRaw(s, c, t.from, t.to));
      const all = calcRaw(s, c, term.from, term.to);
      const qs = parts.map(p => p.somi).filter(x => x != null);
      r = Object.assign(all, { somi: qs.length ? mean(qs) : null, quarterSomi: parts.map(p => p.somi) });
    } else r = calcRaw(s, c, term.from, term.to);
    r.total = r.somi != null && r.schr != null ? (r.somi + r.schr) / 2 : (r.somi ?? r.schr);
    r.vShare = (r.mCount + r.vCount) ? r.vCount / (r.mCount + r.vCount) : 0;
    r.suggest = snap(c, r.total);
    const key = `${c.id}|${s.id}|${termCfg().sy}-${term.key}`;
    const ov = S.data.overrides[key];
    r.override = ov && !ov.deleted ? ov : null;
    r.final = r.override ? r.override.value : r.suggest;
    r.dir = null;
    if (r.override && r.suggest != null) {
      if (isSII(c)) { const d = toPoints(r.override.value) - toPoints(r.suggest); r.dir = d > 0 ? 'up' : d < 0 ? 'down' : null; }
      else { const d = r.override.value - r.suggest; r.dir = d < -1e-9 ? 'up' : d > 1e-9 ? 'down' : null; }
    }
    r.key = key;
    return r;
  }
  function warnInfo(c) {
    const lv = levelOf(c);
    const ts = termsFor(lv);
    const h1 = ts.find(t => t.key === 'HJ1'), h2 = ts.find(t => t.key === 'HJ2');
    const sy = termCfg().sy;
    return studentsOf(c.id).map(s => {
      const a = calc(s, h1, c), b = calc(s, h2, c);
      const hj1 = a.final;
      const w = S.data.warnings[`${c.id}|${s.id}|${sy}`];
      const warned = w && !w.deleted && w.warned ? w : null;
      let was4 = false, was56 = false, drift = false, border = false;
      if (hj1 != null) {
        if (isSII(c)) { const p = toPoints(hj1); was4 = p >= 5 && p <= 6; was56 = p < 5; } // Sek II: unter 5 Punkten = Defizit
        else { was4 = hj1 >= 3.7 - 1e-9 && hj1 <= 4.3 + 1e-9; was56 = hj1 > 4.3 + 1e-9; }
      }
      if (b.total != null) {
        if (isSII(c)) { const p = toPoints(b.total); drift = p < 5; border = p === 5 || p === 6; }
        else { drift = b.total >= 4.5; border = !drift && b.total >= 4.0; }
      }
      return { s, hj1, now: b.total, nowSuggest: b.suggest, was4, was56, drift, border, warned, key: `${c.id}|${s.id}|${sy}` };
    });
  }
  function warnSummary() {
    let open = 0, total = 0;
    for (const c of classesSorted()) for (const w of warnInfo(c)) {
      if (w.was4 || (!w.was56 && w.drift)) { total++; if (!w.warned && w.drift) open++; }
    }
    return { open, total };
  }
  const weekHasLessons = (cid, ws) => lessonsBetween(cid, ws, addDaysISO(ws, 4)).some(l => !l.cancelled && !l.away);
  function lessonWeek(cid, ws, dir) { // nächste (dir 1) bzw. vorige (dir -1) Woche mit Unterricht – Ferienwochen überspringen
    for (let i = 0, w = ws; i < 12; i++) { w = addDaysISO(w, 7 * dir); if (weekHasLessons(cid, w)) return w; }
    return addDaysISO(ws, 7 * dir);
  }
  const weekSkipped = (c, ws) => (c.skipWeeks || []).includes(ws);
  function missingGrades(ws) { // Kurse mit Unterricht in Woche ws, in denen mündliche Noten fehlen
    const we = addDaysISO(ws, 6);
    const out = [];
    for (const c of classesSorted().filter(x => !x.noOral && !weekSkipped(x, ws))) {
      const st = studentsOf(c.id);
      if (!st.length) continue;
      const ls = lessonsBetween(c.id, ws, we).filter(l => !l.cancelled);
      if (!ls.length) continue;
      const has = new Set(entriesOf(c.id, ws, we).map(e => e.studentId));
      const miss = st.filter(s => !has.has(s.id)).length;
      if (miss) out.push({ c, miss, total: st.length });
    }
    return out;
  }
  function reminderWeek() {
    const t = new Date();
    const wd = (t.getDay() + 6) % 7;
    const thisWeek = toISO(mondayOf(t));
    if (wd === 4 && t.getHours() >= 12 || wd >= 5) return thisWeek;
    return addDaysISO(thisWeek, -7);
  }
  function activeReminder() {
    const ws = reminderWeek();
    const r = S.data.reminders[ws];
    if (r && !r.deleted && (r.done || (r.snoozeUntil && now() < r.snoozeUntil))) return null;
    if (S.data.settings.planStart && ws < weekKey(S.data.settings.planStart)) return null;
    const miss = missingGrades(ws);
    return miss.length ? { ws, miss, snoozed: r?.snoozeCount || 0 } : null;
  }

  /* =====================================================================
     Speichern & Änderungen
     ===================================================================== */
  let persistChain = Promise.resolve();
  function persistLocal() {
    persistChain = persistChain.then(async () => {
      if (!S.data || !Vault.password) return;
      const blob = await Vault.encrypt({ data: S.data, device: S.device });
      try { localStorage.setItem(LS_VAULT, JSON.stringify(blob)); }
      catch { toast('Speichern auf dem Gerät fehlgeschlagen (Speicher voll?)', { error: true }); }
    }).catch(err => { console.error(err); toast('Fehler beim Speichern', { error: true }); });
    return persistChain;
  }
  function commit(fn, { sync = true } = {}) {
    entCache.src = null;
    fn(S.data);
    hydrateNames();
    render();
    persistLocal();
    if (sync) scheduleSync();
  }
  function addEntry({ sid, cid, kind = 'note', grade = null, date, note = '' }) {
    // Nur ein Eintrag pro Kind und Termin: vorhandenen Eintrag an diesem Tag ersetzen statt einen zweiten anzulegen
    const dups = Object.values(S.data.entries).filter(x => !x.deleted && x.classId === cid && x.studentId === sid && x.date === date);
    const prev = entryOn(cid, sid, date);
    const e = { id: prev ? prev.id : uid(), classId: cid, studentId: sid, date, kind, grade: kind === 'note' ? grade : null,
      note: note || (prev?.note ?? ''), createdAt: prev?.createdAt || now(), updatedAt: now() };
    commit(d => { for (const x of dups) if (x.id !== e.id) d.entries[x.id] = { id: x.id, deleted: true, updatedAt: now() }; d.entries[e.id] = e; });
    Object.defineProperty(e, 'prev', { value: prev ? Object.assign({}, prev) : null, enumerable: false });
    return e;
  }
  function undoEntry(e) { // Rückgängig: vorherigen Eintrag wiederherstellen bzw. neuen entfernen
    if (e.prev) commit(d => { d.entries[e.id] = Object.assign({}, e.prev, { updatedAt: now() }); });
    else removeEntry(e.id, false);
  }
  const entryToast = (e, name) => e.prev
    ? `${WD[wdOf(e.date)]} ${fmtISO(e.date)}: ${labelEntry(e.prev)} → ${labelEntry(e)} für ${name} (geändert)`
    : `${labelEntry(e)} für ${name}`;
  function dedupeEntries() { // einmalig beim Entsperren: doppelte Einträge (gleiches Kind, gleicher Tag) bereinigen
    const keep = new Set(liveEntries().map(e => e.id));
    const extra = Object.values(S.data.entries).filter(e => !e.deleted && !keep.has(e.id));
    if (!extra.length) return 0;
    commit(d => { for (const x of extra) d.entries[x.id] = { id: x.id, deleted: true, updatedAt: now() }; });
    return extra.length;
  }
  function removeEntry(id, withUndo) {
    const orig = S.data.entries[id];
    if (!orig) return;
    const copy = Object.assign({}, orig);
    commit(d => { d.entries[id] = { id, deleted: true, updatedAt: now() }; });
    if (withUndo) toast('Eintrag gelöscht', { undo: () => commit(d => { d.entries[id] = Object.assign(copy, { updatedAt: now() }); }) });
  }
  function saveUI() {
    try { localStorage.setItem(LS_UI, JSON.stringify({ classId: S.classId, mode: S.mode, view: S.view, courseId: S.courseId, startMenu: S.startMenu })); } catch { /* egal */ }
  }
  function loadUI() {
    try {
      const u = JSON.parse(localStorage.getItem(LS_UI) || '{}');
      if (u.classId) S.classId = u.classId;
      if (u.mode) S.mode = u.mode;
      if (u.view && ['start', 'heute', 'woche', 'termine', 'kurse', 'jahr', 'mehr', 'todos'].includes(u.view)) S.view = u.view;
      if (u.startMenu === false) S.startMenu = false;
      if (u.courseId) S.courseId = u.courseId;
    } catch { /* egal */ }
  }
  function hasVault() { try { return !!localStorage.getItem(LS_VAULT); } catch { return false; } }
  function requestPersist() { try { navigator.storage?.persist?.(); } catch { /* egal */ } }

  /* =====================================================================
     GitHub-Synchronisierung (nur verschlüsselte Daten verlassen das Gerät)
     ===================================================================== */
  const GH = {
    base: 'https://api.github.com',
    url(g, sub = '') { return `${this.base}/repos/${encodeURIComponent(g.owner)}/${encodeURIComponent(g.repo)}${sub}`; },
    contentsUrl(g) { return this.url(g, '/contents/' + g.path.split('/').map(encodeURIComponent).join('/')); },
    async req(g, url, opts = {}) {
      try {
        return await fetch(url, Object.assign({}, opts, {
          cache: 'no-store',
          headers: Object.assign({ Accept: 'application/vnd.github+json', Authorization: `Bearer ${g.token}` }, opts.headers || {})
        }));
      } catch {
        const e = new Error(navigator.onLine === false ? 'Offline – wird später synchronisiert.' : 'Keine Verbindung zu GitHub.');
        e.code = 'NET'; throw e;
      }
    },
    async fail(r) {
      let msg = '';
      try { msg = (await r.json()).message || ''; } catch { /* egal */ }
      const map = {
        401: 'Token ungültig oder abgelaufen.',
        403: 'Zugriff verweigert – Token-Rechte prüfen („Contents: Read and write“).',
        404: 'Repository nicht gefunden – Name und Token-Freigabe prüfen.'
      };
      const e = new Error(map[r.status] || `GitHub-Fehler ${r.status}${msg ? ': ' + msg : ''}`);
      e.status = r.status; throw e;
    },
    async checkRepo(g) {
      const r = await this.req(g, this.url(g));
      if (!r.ok) await this.fail(r);
      const j = await r.json();
      if (!j.private) {
        const e = new Error('Das Repository ist öffentlich. Aus Datenschutzgründen wird nur mit einem privaten Repository synchronisiert.');
        e.code = 'PUBLIC'; throw e;
      }
      return j;
    },
    async get(g) {
      const u = this.contentsUrl(g);
      const r = await this.req(g, u);
      if (r.status === 404) return null;
      if (!r.ok) await this.fail(r);
      const j = await r.json();
      let text;
      if (j.encoding === 'base64' && j.content) text = unutf8(b64ToBytes(j.content));
      else {
        const r2 = await this.req(g, u, { headers: { Accept: 'application/vnd.github.raw+json' } });
        if (!r2.ok) await this.fail(r2);
        text = await r2.text();
      }
      let blob;
      try { blob = JSON.parse(text); } catch { throw new Error('Die Datei im Repository ist keine Notenheft-Datei.'); }
      return { sha: j.sha, blob };
    },
    async put(g, blob, sha) {
      const body = { message: `Notenheft-Sync ${new Date().toISOString()}`, content: bytesToB64(utf8(JSON.stringify(blob))) };
      if (sha) body.sha = sha;
      const r = await this.req(g, this.contentsUrl(g), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.status === 409 || r.status === 422) return 'conflict';
      if (!r.ok) await this.fail(r);
      return 'ok';
    },
    // Kleine Klartext-Dateien (nur ohne Personenbezug, z. B. push/status.json)
    async getText(g, path) {
      const r = await this.req(g, this.url(g, '/contents/' + path.split('/').map(encodeURIComponent).join('/')));
      if (r.status === 404) return null;
      if (!r.ok) await this.fail(r);
      const j = await r.json();
      return { sha: j.sha, text: unutf8(b64ToBytes((j.content || '').replace(/\s+/g, ''))) };
    },
    async putText(g, path, text, message) {
      const old = await this.getText(g, path);
      const body = { message, content: bytesToB64(utf8(text)) };
      if (old) { if (old.text === text) return 'same'; body.sha = old.sha; }
      const r = await this.req(g, this.url(g, '/contents/' + path.split('/').map(encodeURIComponent).join('/')), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) await this.fail(r);
      return 'ok';
    },
    async del(g, path, message) {
      const old = await this.getText(g, path);
      if (!old) return;
      const r = await this.req(g, this.url(g, '/contents/' + path.split('/').map(encodeURIComponent).join('/')), { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, sha: old.sha }) });
      if (!r.ok && r.status !== 404) await this.fail(r);
    },
    // Eingang des Klausurmanagers: Dateiliste eines Ordners im selben privaten Repo
    async list(g, dir) {
      const r = await this.req(g, this.url(g, '/contents/' + dir.split('/').map(encodeURIComponent).join('/')));
      if (r.status === 404) return [];
      if (!r.ok) await this.fail(r);
      const j = await r.json();
      return Array.isArray(j) ? j.filter(f => f.type === 'file') : [];
    }
  };
  function parseGh(owner, repo, path, token) {
    owner = (owner || '').trim();
    repo = (repo || '').trim().replace(/\.git$/, '');
    const m = repo.match(/github\.com\/([^/]+)\/([^/?#]+)/) || repo.match(/^([^/\s]+)\/([^/\s]+)$/);
    if (m) { owner = m[1]; repo = m[2].replace(/\.git$/, ''); }
    path = (path || '').trim().replace(/^\/+/, '') || 'notenheft.enc.json';
    return { owner, repo, path, token: (token || '').trim() };
  }
  const ghReady = () => { const g = S.device?.gh; return !!(g && g.owner && g.repo && g.token); };

  function scheduleSync(delay = 6000) {
    if (!ghReady()) return;
    clearTimeout(S.sync.timer);
    if (!S.sync.running) S.sync.state = 'pending';
    renderSyncBadge();
    S.sync.timer = setTimeout(() => { S.sync.timer = null; syncNow(); }, delay);
  }
  function syncNow({ force = false } = {}) {
    if (!S.data || !ghReady()) return Promise.resolve();
    clearTimeout(S.sync.timer); S.sync.timer = null;
    if (S.sync.running) { S.sync.again = true; return S.sync.promise; }
    if (!force && S.sync.state === 'pwchanged') return Promise.resolve();
    S.sync.running = true; S.sync.state = 'running'; renderSyncBadge();
    S.sync.promise = (async () => {
      const g = S.device.gh;
      try {
        if (!S.sync.repoOk) { await GH.checkRepo(g); S.sync.repoOk = true; }
        let done = false;
        for (let attempt = 0; attempt < 4 && !done; attempt++) {
          const remote = await GH.get(g);
          let rdata = null;
          if (remote) {
            let obj;
            try { obj = await Vault.decrypt(remote.blob); }
            catch (e) {
              if (e.code === 'WRONG_PW' && S.device.oldPw) obj = await Vault.decrypt(remote.blob, S.device.oldPw);
              else throw e;
            }
            rdata = normalizeData(obj.data);
          }
          if (!S.data) return;
          const merged = rdata ? mergeData(S.data, rdata) : S.data;
          migrateNames(merged); // falls ein älteres Gerät noch Klarnamen hochgeladen hat
          const mc = canon(merged);
          if (mc !== canon(S.data)) { S.data = merged; hydrateNames(); persistLocal(); softRender(); }
          const needPush = !rdata || mc !== canon(rdata) || !!S.device.oldPw;
          if (needPush) {
            const blob = await Vault.encrypt({ data: merged });
            const res = await GH.put(g, blob, remote?.sha);
            if (res === 'conflict') { await sleep(400 + attempt * 600); continue; }
          }
          if (S.device.oldPw) { S.device.oldPw = null; persistLocal(); }
          done = true;
        }
        if (!done) throw new Error('Konflikt beim Speichern – bitte erneut versuchen.');
        S.sync.state = 'ok'; S.sync.last = now(); S.sync.msg = '';
        kmInbox({ force }).catch(e => console.warn('Klausurmanager:', e));
        try { weeklyGradeTodo(); } catch (e) { console.warn('Noten-To-do:', e); }
        pushStatusWrite().catch(e => console.warn('Push-Status:', e));
        ewhCatalogRefresh().then(() => softRender()).catch(e => console.warn('Katalog:', e));
        pcExport().catch(e => console.warn('PC-Termine:', e));
        if (!S.sync.nameHint && missingNames()) { S.sync.nameHint = true; toast(`Auf diesem Gerät fehlen ${missingNames()} Namen – Mehr → Namensliste importieren.`, { ms: 7000 }); }
      } catch (e) {
        console.warn('Sync:', e);
        if (e.code === 'WRONG_PW') { S.sync.state = 'pwchanged'; S.sync.msg = 'Die Daten im GitHub-Speicher sind mit einem anderen Passwort verschlüsselt.'; }
        else if (e.code === 'NET') { S.sync.state = 'offline'; S.sync.msg = e.message; }
        else {
          S.sync.state = 'error'; S.sync.msg = e.message;
          if (e.code === 'PUBLIC' || [401, 403, 404].includes(e.status)) S.sync.repoOk = false;
        }
      } finally {
        S.sync.running = false;
        renderSyncBadge();
        if (S.sync.again && S.data) { S.sync.again = false; setTimeout(() => syncNow(), 50); }
      }
    })();
    return S.sync.promise;
  }

  /* =====================================================================
     Excel-Import (Ganzjahresplanung.xlsx) – eigener, kleiner XLSX-Leser
     ===================================================================== */
  const colIndex = ref => { let n = 0; for (const ch of ref) { if (ch >= 'A' && ch <= 'Z') n = n * 26 + ch.charCodeAt(0) - 64; else break; } return n - 1; };
  async function readXlsx(file) {
    const buf = new Uint8Array(await file.arrayBuffer());
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    let eocd = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('Das ist keine gültige Excel-Datei (.xlsx).');
    const n = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const files = {};
    for (let i = 0; i < n; i++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      files[unutf8(buf.subarray(p + 46, p + 46 + nlen))] = { method, csize, off };
      p += 46 + nlen + elen + clen;
    }
    const read = async name => {
      const f = files[name];
      if (!f) return null;
      const start = f.off + 30 + dv.getUint16(f.off + 26, true) + dv.getUint16(f.off + 28, true);
      const data = buf.subarray(start, start + f.csize);
      if (f.method === 0) return unutf8(data);
      if (f.method !== 8) throw new Error('Nicht unterstützte Excel-Kompression.');
      const s = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return unutf8(new Uint8Array(await new Response(s).arrayBuffer()));
    };
    const xml = s => new DOMParser().parseFromString(s, 'application/xml');
    const textOf = el => [...el.getElementsByTagName('t')].filter(t => ['si', 'r', 'is'].includes(t.parentNode.localName)).map(t => t.textContent).join('');
    const wbXml = await read('xl/workbook.xml');
    if (!wbXml) throw new Error('Das ist keine gültige Excel-Datei (.xlsx).');
    const wb = xml(wbXml);
    const relMap = {};
    for (const r of xml(await read('xl/_rels/workbook.xml.rels') || '<x/>').getElementsByTagName('Relationship')) relMap[r.getAttribute('Id')] = r.getAttribute('Target');
    const ss = [];
    const sst = await read('xl/sharedStrings.xml');
    if (sst) for (const si of xml(sst).getElementsByTagName('si')) ss.push(textOf(si));
    const sheets = {};
    for (const s of wb.getElementsByTagName('sheet')) {
      const rid = s.getAttribute('r:id') || s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
      let target = relMap[rid];
      if (!target) continue;
      target = target.startsWith('/') ? target.slice(1) : 'xl/' + target.replace(/^\.\//, '');
      const doc = xml(await read(target) || '<x/>');
      const rows = [];
      for (const row of doc.getElementsByTagName('row')) {
        const arr = rows[+row.getAttribute('r') - 1] = [];
        for (const c of row.getElementsByTagName('c')) {
          const t = c.getAttribute('t');
          const v = c.getElementsByTagName('v')[0]?.textContent;
          let val = null;
          if (t === 's') val = ss[+v] ?? null;
          else if (t === 'inlineStr') val = textOf(c);
          else if (t === 'str') val = v ?? null;
          else if (t === 'b') val = v === '1';
          else if (t === 'e') val = null;
          else if (v != null && v !== '') val = +v;
          arr[colIndex(c.getAttribute('r'))] = val;
        }
      }
      sheets[s.getAttribute('name')] = rows;
    }
    return sheets;
  }
  const normH = s => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  function sheetTable(sheets, nameStart, required) {
    const key = Object.keys(sheets).find(k => normH(k).startsWith(normH(nameStart)));
    if (!key) return [];
    const rows = sheets[key];
    const need = required.map(normH);
    let hi = -1, cols = null;
    for (let i = 0; i < rows.length && hi < 0; i++) {
      const r = (rows[i] || []).map(normH);
      const idx = need.map(h => r.findIndex(c => c && c.startsWith(h)));
      if (idx.every(x => x >= 0)) { hi = i; cols = r; }
    }
    if (hi < 0) return [];
    const out = [];
    for (let i = hi + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.every(v => v == null || v === '')) continue;
      const o = {};
      cols.forEach((h, j) => { if (h) o[h] = r[j]; });
      out.push(o);
    }
    return out;
  }
  const pick = (o, h) => { const k = Object.keys(o).find(x => x.startsWith(normH(h))); return k ? o[k] : null; };
  function xlDate(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') { const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86400000); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; }
    const m = String(v).match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (m) return `${m[3]}-${pad(+m[2])}-${pad(+m[1])}`;
    const m2 = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m2 ? `${m2[1]}-${m2[2]}-${m2[3]}` : null;
  }
  const xlTime = v => typeof v === 'number' ? minToTime(Math.round((v % 1) * 1440)) : null;
  function splitCourse(s) {
    const str = String(s || '').trim();
    const m = str.match(/^(.+?)\s+[–—-]\s+(.+)$/);
    return m ? { name: m[1].trim(), subject: m[2].trim() } : { name: str, subject: '' };
  }
  function parsePeriods(s) {
    const m = String(s ?? '').match(/(\d+)\s*(?:[–—-]\s*(\d+))?/);
    if (!m) return null;
    const from = +m[1], to = m[2] ? +m[2] : from;
    return from >= 1 && to >= from && to <= 14 ? { from, to } : null;
  }
  const WD_MAP = { mo: 1, di: 2, mi: 3, do: 4, fr: 5 };
  const kindOf = s => {
    const t = normH(s);
    if (t.startsWith('klausur')) return 'Klausur';
    if (t.startsWith('klassenarbeit')) return 'Klassenarbeit';
    if (t.includes('münd') || t.includes('mund')) return 'Mündliche Prüfung';
    if (t.includes('vokabel')) return 'Vokabeltest';
    if (t.includes('test')) return 'Test';
    return s ? String(s).trim() : 'Sonstiges';
  };

  function buildImport(sheets) {
    const courseKey = s => { const c = splitCourse(s); return (c.name + '|' + c.subject).toLowerCase(); };
    const courses = new Map();
    const addCourse = (s, room) => {
      if (!s) return null;
      const k = courseKey(s);
      if (!courses.has(k)) courses.set(k, { ...splitCourse(s), room: room || '', slots: [] });
      const c = courses.get(k);
      if (room && !c.room) c.room = room;
      return c;
    };
    for (const r of sheetTable(sheets, 'Raster', ['Kurs', 'Wochentag', 'Stunde'])) {
      const c = addCourse(pick(r, 'kurs'), pick(r, 'raum'));
      const wd = WD_MAP[normH(pick(r, 'wochentag')).slice(0, 2)];
      const pr = parsePeriods(pick(r, 'stunde'));
      if (c && wd && pr) c.slots.push({ wd, from: pr.from, to: pr.to, room: pick(r, 'raum') || '' });
    }
    const starts = {};
    let planStart = null;
    for (const r of sheetTable(sheets, 'Termine', ['Kurs', 'Datum', 'Stunde'])) {
      const c = addCourse(pick(r, 'kurs'), pick(r, 'raum'));
      const d = xlDate(pick(r, 'datum'));
      if (d && (!planStart || d < planStart)) planStart = d;
      const pr = parsePeriods(pick(r, 'stunde'));
      const t = xlTime(pick(r, 'beginn'));
      if (pr && t) starts[pr.from] = t;
      if (c && pr && d && !c.slots.length) {
        const wd = wdOf(d) + 1;
        if (!c.derived) c.derived = new Map();
        c.derived.set(`${wd}|${pr.from}|${pr.to}`, { wd, from: pr.from, to: pr.to, room: pick(r, 'raum') || '' });
      }
    }
    for (const c of courses.values()) { if (!c.slots.length && c.derived) c.slots = [...c.derived.values()]; delete c.derived; }
    const events = [];
    for (const r of sheetTable(sheets, 'Countdown', ['Kurs', 'Art', 'Datum'])) {
      const d = xlDate(pick(r, 'datum'));
      const kurs = pick(r, 'kurs');
      if (!d || !kurs) continue;
      addCourse(kurs);
      const kind = kindOf(pick(r, 'art'));
      events.push({ id: 'imp-p-' + hash(`${courseKey(kurs)}|${d}|${kind}`), type: 'pruefung', kind, date: d, course: courseKey(kurs), note: String(pick(r, 'bemerkung') || '').trim() });
    }
    for (const r of sheetTable(sheets, 'Ausf', ['Datum', 'Kurs', 'Grund'])) {
      const d = xlDate(pick(r, 'datum'));
      if (!d) continue;
      const kurs = pick(r, 'kurs');
      if (kurs) addCourse(kurs);
      events.push({ id: 'imp-a-' + hash(`${kurs ? courseKey(kurs) : '*'}|${d}`), type: 'ausfall', date: d, course: kurs ? courseKey(kurs) : null, note: String(pick(r, 'grund') || '').trim() });
    }
    const holidays = [];
    for (const r of sheetTable(sheets, 'Ferien', ['Ferien', 'Von', 'Bis'])) {
      const name = String(pick(r, 'ferien') || '').trim();
      const from = xlDate(pick(r, 'von')), to = xlDate(pick(r, 'bis'));
      if (!name || !from || !to) continue;
      holidays.push({ id: 'imp-h-' + hash(`${name}|${from}`), name, from, to });
    }
    return { courses: [...courses.values()], events, holidays, starts, planStart };
  }

  async function importPlanning(file) {
    if (!file) return;
    let plan;
    try {
      const sheets = await readXlsx(file);
      if (sheets['_Notenheft']) return toast('Diese Ganzjahresplanung wird automatisch aus dem Notenheft erzeugt – Änderungen bitte direkt im Notenheft eintragen.', { error: true, ms: 7000 });
      plan = buildImport(sheets);
    }
    catch (e) { console.warn(e); return toast(e.message || 'Datei konnte nicht gelesen werden', { error: true }); }
    if (!plan.courses.length && !plan.events.length && !plan.holidays.length) return toast('In der Datei wurden keine passenden Tabellenblätter gefunden.', { error: true });
    const existing = classesSorted();
    const findCls = pc => existing.find(c => c.name.toLowerCase() === pc.name.toLowerCase() && (c.subject || '').toLowerCase() === pc.subject.toLowerCase());
    const newCount = plan.courses.filter(pc => !findCls(pc)).length;
    const slotCount = sum(plan.courses.map(c => c.slots.length));
    const exams = plan.events.filter(e => e.type === 'pruefung').length;
    const aus = plan.events.filter(e => e.type === 'ausfall').length;
    const ok = await openModal({
      title: 'Ganzjahresplanung importieren',
      body: `<div class="import-sum">
          <div><strong>${plan.courses.length}</strong><span>Kurse${newCount ? ` (${newCount} neu)` : ''}</span></div>
          <div><strong>${slotCount}</strong><span>Blöcke im Stundenplan</span></div>
          <div><strong>${exams}</strong><span>Prüfungen</span></div>
          <div><strong>${aus}</strong><span>Ausfälle</span></div>
          <div><strong>${plan.holidays.length}</strong><span>Ferienzeiträume</span></div>
          <div><strong>${Object.keys(plan.starts).length}</strong><span>Stundenzeiten</span></div>
        </div>
        <p class="muted small">Vorhandene Kurse mit gleichem Namen werden aktualisiert (Stundenplan und Raum), Schülerlisten und Noten bleiben unverändert. Du kannst die Datei später erneut importieren – Einträge werden dann aktualisiert statt doppelt angelegt.</p>`,
      actions: [{ label: 'Abbrechen', value: false }, { label: 'Importieren', cls: 'primary', value: true }]
    });
    if (!ok) return;
    // Hat sich der Stundenplan eines vorhandenen Kurses geändert? Dann „gültig ab“ abfragen.
    const sig = sl => sl.map(x => `${x.wd}|${x.from}|${x.to}`).sort().join(',');
    const changed = plan.courses.filter(pc => { const c = findCls(pc); if (!c || !pc.slots.length) return false; const cur = (c.slots || []).filter(x => !x.validTo || x.validTo >= todayISO()); return cur.length && sig(cur) !== sig(pc.slots); });
    let validFrom = null;
    if (changed.length) {
      const nextMon = addDaysISO(toISO(mondayOf(new Date())), 7);
      validFrom = await openModal({
        title: 'Neuer Stundenplan – gültig ab?',
        body: `<p>Für ${changed.map(pc => `<strong>${esc(pc.name)} ${esc(pc.subject)}</strong>`).join(', ')} unterscheidet sich der Stundenplan vom bisherigen.</p>
          <label class="field"><span>Neuer Stundenplan gilt ab</span><input type="date" id="m-vf" value="${nextMon}"></label>
          <p class="muted small">Bis zum Vortag gilt der alte Plan weiter – vergangene Stunden, Ausfälle und Statistiken bleiben dadurch richtig.</p>`,
        actions: [{ label: 'Abbrechen', value: null }, { label: 'Übernehmen', cls: 'primary', run: root => root.querySelector('#m-vf').value || false }]
      });
      if (!validFrom) return;
    }
    commit(d => {
      const t = now();
      const idByKey = {};
      for (const pc of plan.courses) {
        let c = findCls(pc);
        if (c) {
          let slots = c.slots || [];
          if (pc.slots.length) {
            if (validFrom && changed.includes(pc)) {
              const dayBefore = addDaysISO(validFrom, -1);
              slots = slots.filter(x => !x.validFrom || x.validFrom < validFrom).map(x => (!x.validTo || x.validTo > dayBefore) ? Object.assign({}, x, { validTo: dayBefore }) : x)
                .concat(pc.slots.map(x => Object.assign({}, x, { validFrom })));
            } else if (!changed.includes(pc)) {
              slots = slots.filter(x => x.validTo && x.validTo < todayISO()).concat(pc.slots.map(x => { const o = (c.slots || []).find(y => y.wd === x.wd && y.from === x.from && y.to === x.to && (!y.validTo || y.validTo >= todayISO())); return Object.assign({}, x, o && o.validFrom ? { validFrom: o.validFrom } : {}); }));
            }
          }
          d.classes[c.id] = Object.assign({}, d.classes[c.id], { room: pc.room || c.room || '', slots, updatedAt: t });
        } else {
          const id = uid();
          const level = guessLevel(pc.name);
          c = d.classes[id] = { id, name: pc.name, subject: pc.subject, room: pc.room, color: nextColor(), slots: pc.slots, level, vocab: level === 'SI' && /englisch|franz|latein|spanisch/i.test(pc.subject), updatedAt: t };
          existing.push(c);
        }
        idByKey[(pc.name + '|' + pc.subject).toLowerCase()] = c.id;
      }
      for (const ev of plan.events) {
        const classId = ev.course ? idByKey[ev.course] || null : null;
        const cur = d.events[ev.id];
        d.events[ev.id] = Object.assign({}, cur && !cur.deleted ? cur : {}, { id: ev.id, type: ev.type, kind: ev.kind || null, date: ev.date, classId, note: ev.note, updatedAt: t });
      }
      for (const h of plan.holidays) d.holidays[h.id] = { ...h, updatedAt: t };
      const P = d.settings.periods.map(p => ({ ...p }));
      for (const [n, start] of Object.entries(plan.starts)) {
        const i = +n - 1;
        while (P.length <= i) P.push({ start: '', end: '' });
        const keepEnd = P[i]?.end && timeToMin(P[i].end) > timeToMin(start) && timeToMin(P[i].end) - timeToMin(start) <= 60;
        P[i] = { start, end: keepEnd ? P[i].end : minToTime(timeToMin(start) + 45) };
      }
      d.settings = Object.assign({}, d.settings, { periods: P, planStart: plan.planStart || d.settings.planStart, updatedAt: t });
    });
    toast('Ganzjahresplanung importiert');
  }

  /* =====================================================================
     Symbole
     ===================================================================== */
  const ICONS = {
    home: '<path d="M3 11 12 3l9 8"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>',
    today: '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/><circle cx="12" cy="15.5" r="1.6" fill="currentColor"/>',
    grid: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    book: '<path d="M4 19.5V5a2 2 0 0 1 2-2h14v16H6.5A2.5 2.5 0 0 0 4 21.5v-2Z"/><path d="M8 7h8M8 11h6"/>',
    more: '<circle cx="5" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="19" cy="12" r="1.7" fill="currentColor"/>',
    chart: '<path d="M3 3v18h18"/><path d="M8 17v-5M13 17V8M18 17v-9"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M2 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/><path d="M16 4.1a4 4 0 0 1 0 7.8M22 21v-1a5 5 0 0 0-3.5-4.8"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    cards: '<rect x="3" y="5" width="14" height="16" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v14"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    upload: '<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>',
    pencil: '<path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h8"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pin: '<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/>',
    flag: '<path d="M4 22V4M4 4h13l-2 4 2 4H4"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    face: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M9 9v1M15 9v1M12 9v4h-1M9 16c1.5 1 4.5 1 6 0"/>',
    sheet: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    todo: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m8 12 3 3 5-6"/>',
    swap: '<path d="m7 4-4 4 4 4"/><path d="M3 8h13"/><path d="m17 12 4 4-4 4"/><path d="M21 16H8"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
    exam: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    cal: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 9h18M8 13.5h3M8 17h7"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    week: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 9v12M13 9v12M18 9v12"/>',
    year: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 9h18M7 13h2M11 13h2M15 13h2M7 17h2M11 17h2M15 17h2"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="m8.2 13.8-1.7 7.2L12 18l5.5 3-1.7-7.2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    print: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>'
  };
  const icon = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

  /* =====================================================================
     Dialoge & Hinweise
     ===================================================================== */
  function openModal({ title, body = '', actions = [{ label: 'OK', cls: 'primary', value: true }], mount, autofocus = false }) {
    return new Promise(resolve => {
      const root = $('#modal-root');
      root.innerHTML = `<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="modal-grip"></div>
        <h2>${esc(title)}</h2><div class="modal-body">${body}</div>
        <div class="modal-actions">${actions.map((a, i) => `<button type="button" class="btn ${a.cls || ''}" data-mi="${i}">${esc(a.label)}</button>`).join('')}</div>
      </div></div>`;
      const onKey = e => {
        if (e.key === 'Escape') close(null);
        if (e.key === 'Enter' && e.target.matches('input:not([type=checkbox]):not([type=radio])')) {
          e.preventDefault();
          const p = actions.findIndex(a => (a.cls || '').includes('primary'));
          if (p >= 0) root.querySelector(`[data-mi="${p}"]`).click();
        }
      };
      let closed = false;
      // Hintergrund festhalten, solange das Fenster offen ist (sonst scrollt er beim Wischen mit)
      const bs = document.body.style, scrollY = window.scrollY, lockedHere = bs.position !== 'fixed';
      if (lockedHere) Object.assign(bs, { position: 'fixed', top: `-${scrollY}px`, left: '0', right: '0' });
      const unlockBg = () => { if (!lockedHere) return; Object.assign(bs, { position: '', top: '', left: '', right: '' }); window.scrollTo(0, scrollY); };
      const close = v => { if (closed) return; closed = true; document.removeEventListener('keydown', onKey, true); root.innerHTML = ''; root.close = null; unlockBg(); resolve(v); };
      document.addEventListener('keydown', onKey, true);
      root.querySelector('.modal-backdrop').addEventListener('click', e => { if (e.target.classList.contains('modal-backdrop')) close(null); });
      root.querySelectorAll('[data-mi]').forEach(b => b.addEventListener('click', async () => {
        const a = actions[+b.dataset.mi];
        if (a.run) {
          b.disabled = true;
          let r;
          try { r = await a.run(root); } finally { b.disabled = false; }
          if (r === false) return;
          close(r === undefined ? a.value : r);
        } else close(a.value === undefined ? null : a.value);
      }));
      root.close = close;
      // Nach unten wischen schließt das Fenster (wie Abbrechen)
      const m = root.querySelector('.modal');
      let y0 = null, dy = 0;
      m.addEventListener('touchstart', e => { y0 = m.scrollTop <= 0 && !e.target.closest('textarea, select, input[type=range]') ? e.touches[0].clientY : null; dy = 0; }, { passive: true });
      m.addEventListener('touchmove', e => { if (y0 == null) return; dy = e.touches[0].clientY - y0; if (dy > 0) { if (e.cancelable) e.preventDefault(); m.style.transform = `translateY(${dy}px)`; m.style.transition = 'none'; } }, { passive: false });
      m.addEventListener('touchend', () => { if (y0 == null) return; m.style.transition = ''; if (dy > 90) close(null); else m.style.transform = ''; y0 = null; });
      if (mount) mount(root, close);
      if (autofocus) setTimeout(() => root.querySelector('input, textarea')?.focus(), 60);
    });
  }
  const closeModal = () => { const r = $('#modal-root'); if (r.close) r.close(null); r.innerHTML = ''; };
  // Kein Zoomen per Doppeltippen oder zwei Fingern
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('touchmove', e => { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
  const confirmDialog = (title, text, okLabel = 'OK', danger = false) => openModal({
    title, body: `<p>${text}</p>`,
    actions: [{ label: 'Abbrechen', value: false }, { label: okLabel, cls: danger ? 'danger-fill' : 'primary', value: true }]
  });
  function modalErr(root, msg) { const p = root.querySelector('.err'); if (p) { p.textContent = msg; p.hidden = false; } }
  function shake(el) { if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

  let toastTimer;
  function toast(msg, { undo, error = false, ms = 3200 } = {}) {
    const t = $('#toast');
    t.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button class="toast-btn" type="button">Rückgängig</button>' : ''}`;
    t.className = 'show' + (error ? ' error' : '');
    const hide = () => { t.className = ''; };
    if (undo) t.querySelector('.toast-btn').addEventListener('click', () => { hide(); undo(); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hide, undo || error ? 5000 : ms);
  }

  /* =====================================================================
     Grundgerüst
     ===================================================================== */
  const TABS = [['start', 'Heute', 'home'], ['planer', 'Planer', 'week'], ['neu', 'Eintragen', 'plus'], ['kurse', 'Kurse', 'book'], ['mehr', 'Mehr', 'more']];
  const TAB_OF = { neu: 'neu', start: 'start', heute: 'start', todos: 'start', fehlend: 'kurse', woche: 'planer', termine: 'planer', jahr: 'planer', kurse: 'kurse', mehr: 'mehr' };
  const PLANER = [['woche', 'Woche'], ['termine', 'Termine'], ['jahr', 'Jahr']];
  const planerSeg = () => `<div class="seg full planer-seg">${PLANER.map(([k, l]) => `<button type="button" data-action="goto" data-view="${k}" class="${S.view === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  const canHover = () => matchMedia('(hover: hover)').matches;

  /* ---------- Zurück-Navigation (Wischen vom linken Rand, Browser-/Android-Zurück, Zurück-Knopf) ---------- */
  const USE_HISTORY = true;
  const NAV_KEYS = ['view', 'courseId', 'courseTab', 'detailStudent', 'assessId', 'zTab', 'todoFilter'];
  const Nav = { stack: [], last: null, skip: false, hist: 0 };
  function trackNav() {
    const snap = {};
    for (const k of NAV_KEYS) snap[k] = S[k] ?? null;
    const key = JSON.stringify(snap);
    if (Nav.last && key !== Nav.last.key && !Nav.skip) {
      Nav.stack.push({ ...Nav.last.snap, y: window.scrollY });
      if (Nav.stack.length > 40) Nav.stack.shift();
      if (USE_HISTORY) { try { history.pushState({ nh: Nav.stack.length }, ''); Nav.hist++; } catch { /* egal */ } }
    }
    Nav.skip = false;
    Nav.last = { key, snap };
  }
  function goBack(fromPop = false) {
    if (!Nav.stack.length || !S.data) return false;
    if (!fromPop && Nav.hist > 0) { history.back(); return true; } // popstate ruft goBack(true)
    if (fromPop) Nav.hist = Math.max(0, Nav.hist - 1);
    const snap = Nav.stack.pop();
    closeModal();
    for (const k of NAV_KEYS) S[k] = snap[k];
    if (S.courseId) S.classId = S.courseId;
    Nav.skip = true;
    saveUI(); render();
    window.scrollTo(0, snap.y || 0);
    return true;
  }
  const navReset = () => { Nav.stack = []; Nav.last = null; };
  addEventListener('popstate', () => { goBack(true); });

  // Waagerechte Leisten (Kursregister, Unterreiter, Filter) behalten ihre Scroll-Position
  const KEEP_SCROLL = '.course-tabs-row, .subtabs, .chipbar, .plan-wrap, .table-wrap, .ycal-wrap';
  function render() {
    const app = $('#app');
    const kept = {};
    app.querySelectorAll(KEEP_SCROLL).forEach((el, i) => { kept[S.view + '|' + el.className.split(' ')[0] + '|' + i] = el.scrollLeft; });
    renderInner();
    app.querySelectorAll(KEEP_SCROLL).forEach((el, i) => {
      const v = kept[S.view + '|' + el.className.split(' ')[0] + '|' + i];
      if (v) el.scrollLeft = v;
      const on = el.matches('.course-tabs-row, .subtabs') && el.querySelector('.on');
      if (on) { // aktive Karte sichtbar halten
        const l = on.offsetLeft - el.offsetLeft, r = l + on.offsetWidth;
        if (l < el.scrollLeft + 8) el.scrollLeft = Math.max(0, l - 16);
        else if (r > el.scrollLeft + el.clientWidth - 8) el.scrollLeft = r - el.clientWidth + 16;
      }
    });
  }
  function renderInner() {
    const app = $('#app');
    entCache.src = null;
    if (!S.data) {
      navReset();
      document.body.classList.add('locked');
      app.innerHTML = hasVault() ? viewUnlock() : viewWelcome();
      if (canHover() && !Passkey.rec()) setTimeout(() => app.querySelector('input[type=password]')?.focus(), 30);
      return;
    }
    document.body.classList.remove('locked');
    trackNav();
    const views = { start: viewStart, heute: viewHeute, woche: viewWoche, termine: viewTermine, kurse: viewKurse, jahr: viewJahr, mehr: viewMehr, todos: viewTodos, fehlend: viewFehlend, neu: viewNeu };
    const v0 = views[S.view] || viewStart;
    const tabNow = TAB_OF[S.view] || 'start';
    if (tabNow === 'planer') S.planLast = S.view;
    const v = tabNow === 'planer' ? () => planerSeg() + v0() : v0;
    const tabs = TABS.map(([k, l, i]) => { const view = k === 'planer' ? (S.planLast || 'woche') : k; return `<button type="button" data-action="goto" data-view="${view}" class="${tabNow === k ? 'on' : ''}" ${tabNow === k ? 'aria-current="page"' : ''}>${icon(i)}<span>${l}</span></button>`; }).join('');
    app.innerHTML = `<header class="topbar">
        ${Nav.stack.length ? `<button type="button" class="back-btn" data-action="back" aria-label="Zurück" title="Zurück (auch: vom linken Rand wischen)">${icon('left')}</button>` : ''}
        <div class="brand" data-action="goto" data-view="start" role="button" title="Startmenü"><img src="icons/icon.svg" alt="" width="28" height="28"><span>Notenheft</span></div>
        <nav class="tabs-top" aria-label="Bereiche">${tabs}</nav>
        <div class="top-actions">
          <button type="button" id="sync-badge" class="sync-badge" data-action="sync"></button>
          <button type="button" class="icon-btn ${S.view === 'mehr' ? 'on' : ''}" data-action="goto" data-view="mehr" aria-label="Einstellungen" title="Einstellungen">${icon('gear')}</button>
          <button type="button" class="icon-btn" data-action="lock" aria-label="Sperren" title="Sperren">${icon('lock')}</button>
        </div>
      </header>
      <main class="main view-${S.view}">${v()}</main>
      <nav class="tabs-bottom" aria-label="Bereiche">${tabs}</nav>`;
    renderSyncBadge();
    drawCharts();
  }
  function softRender() {
    const a = document.activeElement;
    if (a && $('#app').contains(a) && a.matches('input, textarea, select')) a.addEventListener('blur', () => setTimeout(render, 0), { once: true });
    else if ($('#modal-root').children.length) setTimeout(softRender, 1500);
    else render();
  }
  function syncInfo() {
    if (!ghReady()) return { txt: 'Nur lokal', cls: 'muted', long: 'Noch nicht mit GitHub verbunden – Daten liegen nur verschlüsselt auf diesem Gerät.' };
    const last = S.sync.last ? new Date(S.sync.last).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : null;
    switch (S.sync.state) {
      case 'running': return { txt: 'Sync …', cls: 'busy', long: 'Synchronisiere …' };
      case 'pending': return { txt: 'Ausstehend', cls: 'pending', long: 'Änderungen werden gleich hochgeladen.' };
      case 'ok': return { txt: 'Gesichert', cls: 'ok', long: `Synchronisiert um ${last} Uhr.` };
      case 'offline': return { txt: 'Offline', cls: 'pending', long: S.sync.msg };
      case 'pwchanged': return { txt: 'Passwort?', cls: 'err', long: S.sync.msg + ' Tippe oben auf „Passwort?“.' };
      case 'error': return { txt: 'Sync-Fehler', cls: 'err', long: S.sync.msg };
      default: return { txt: 'Bereit', cls: 'muted', long: last ? `Zuletzt synchronisiert um ${last} Uhr.` : 'Verbunden.' };
    }
  }
  function renderSyncBadge() {
    const i = syncInfo();
    const b = document.getElementById('sync-badge');
    if (b) { b.className = 'sync-badge ' + i.cls; b.innerHTML = icon('cloud') + `<span>${i.txt}</span>`; b.title = i.long; }
    const st = document.getElementById('sync-status');
    if (st) { st.className = 'sync-status ' + i.cls; st.textContent = i.long; }
  }
  const emptyState = (title, text, btn = '', ic = 'book') =>
    `<div class="empty"><div class="empty-ic">${icon(ic)}</div><h2>${esc(title)}</h2>${text ? `<p>${esc(text)}</p>` : ''}${btn}</div>`;
  function classSelect(action = 'setClass') {
    if (S.view === 'kurse') return '';
    const cs = classesSorted();
    return `<label class="sel"><span class="sr">Kurs</span><select data-change="${action}">${cs.map(c => `<option value="${c.id}" ${c.id === S.classId ? 'selected' : ''}>${esc(clsLabel(c))}</option>`).join('')}</select></label>`;
  }
  const iosHint = () => (isIOS() && !isStandalone())
    ? `<div class="hint-box">${icon('info')}<div><strong>Tipp fürs iPhone:</strong> In Safari auf <strong>Teilen</strong> → <strong>Zum Home-Bildschirm</strong> tippen und Notenheft dann von dort öffnen. Erst dort einrichten – die Home-Bildschirm-App hat einen eigenen Speicher.</div></div>`
    : '';
  const pageHead = (title, sub = '', right = '') => `<div class="page-head"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${right}</div>`;
  const ccStyle = c => `style="--cc:${esc(clsColor(c))}"`;

  /* ---------- Anmelden / Einrichten ---------- */
  function viewWelcome() {
    const m = S.setupMode;
    return `<div class="auth"><div class="auth-card">
      <img class="auth-logo" src="icons/icon.svg" alt="">
      <h1>Notenheft</h1>
      <p class="muted">Stundenplan, Termine und mündliche Noten – verschlüsselt, auf Handy und Laptop.</p>
      ${iosHint()}
      <div class="seg full" role="tablist">
        <button type="button" data-action="setupMode" data-m="new" class="${m === 'new' ? 'on' : ''}">Neu anlegen</button>
        <button type="button" data-action="setupMode" data-m="connect" class="${m === 'connect' ? 'on' : ''}">Gerät verbinden</button>
      </div>
      ${m === 'new' ? `<form data-submit="setupNew" novalidate>
        <input class="sr" type="text" name="username" autocomplete="username" value="Notenheft" tabindex="-1" aria-hidden="true">
        <label class="field"><span>Passwort wählen (mind. 10 Zeichen)</span><input type="password" name="pw" autocomplete="new-password" required></label>
        <label class="field"><span>Passwort wiederholen</span><input type="password" name="pw2" autocomplete="new-password" required></label>
        <label class="check"><input type="checkbox" name="ok"> <span>Mir ist klar: Ohne dieses Passwort lassen sich die Daten nicht wiederherstellen. Es gibt keinen Generalschlüssel.</span></label>
        <p class="err" hidden></p>
        <button class="btn primary full" type="submit">Notenheft anlegen</button>
        <p class="muted small">Tipp: Ein Satz ist sicher und gut zu merken, z. B. „Kreide und Tafel sind 2 alte Freunde“. Danach kannst du ${Passkey.label()} zum Entsperren einrichten.</p>
      </form>` : `<form data-submit="setupConnect" novalidate>
        <p class="muted small">Auf dem Gerät, auf dem Notenheft schon läuft: <em>Mehr → Einrichtungscode</em>. Den Code hier einfügen.</p>
        <label class="field"><span>Einrichtungscode</span><textarea name="code" rows="3" placeholder="NH1.…" autocapitalize="off" autocorrect="off" spellcheck="false"></textarea></label>
        <details><summary>Stattdessen GitHub-Daten von Hand eingeben</summary>${ghFields({})}</details>
        <input class="sr" type="text" name="username" autocomplete="username" value="Notenheft" tabindex="-1" aria-hidden="true">
        <label class="field"><span>Passwort</span><input type="password" name="pw" autocomplete="current-password" required></label>
        <p class="err" hidden></p>
        <button class="btn primary full" type="submit">Verbinden</button>
      </form>`}
    </div></div>`;
  }
  function ghFields(g) {
    const attrs = 'autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off"';
    return `<label class="field"><span>GitHub-Benutzername</span><input name="owner" value="${esc(g.owner || '')}" ${attrs} placeholder="z. B. andi-lehrer"></label>
      <label class="field"><span>Privates Repository</span><input name="repo" value="${esc(g.repo || '')}" ${attrs} placeholder="z. B. notenheft-daten"></label>
      <label class="field"><span>Dateiname</span><input name="path" value="${esc(g.path || 'notenheft.enc.json')}" ${attrs}></label>
      <label class="field"><span>Zugriffs-Token</span><input name="token" type="password" ${attrs} placeholder="${g.token ? 'gespeichert – leer lassen zum Beibehalten' : 'github_pat_…'}"></label>`;
  }
  function viewUnlock() {
    const pk = Passkey.rec();
    return `<div class="auth"><div class="auth-card">
      <img class="auth-logo" src="icons/icon.svg" alt="">
      <h1>Notenheft</h1>
      <p class="muted">Gesperrt</p>
      ${pk ? `<button type="button" class="btn primary full big-btn" data-action="passkeyUnlock">${icon('face')} Mit ${Passkey.label()} entsperren</button>
        <p class="err" id="pk-err" hidden></p>
        <div class="or"><span>oder mit Passwort</span></div>` : ''}
      <form data-submit="unlock" novalidate>
        <input class="sr" type="text" name="username" autocomplete="username" value="Notenheft" tabindex="-1" aria-hidden="true">
        <label class="field"><span>Passwort</span><input type="password" name="pw" autocomplete="current-password" required></label>
        <p class="err" hidden></p>
        <button class="btn ${pk ? '' : 'primary'} full" type="submit">Entsperren</button>
      </form>
      <button type="button" class="link" data-action="forgot">Passwort vergessen?</button>
      ${iosHint()}
    </div></div>`;
  }

  /* ---------- Piktogramme & gemeinsame Bausteine ---------- */
  const PICTO = {
    pruefung: ['exam', 'p-exam', 'Prüfung'], ausfall: ['ban', 'p-aus', 'Ausfall'], termin: ['cal', 'p-term', 'Termin'],
    ferien: ['sun', 'p-fer', 'Ferien'], feiertag: ['star', 'p-fei', 'Feiertag'], lesson: ['book', 'p-less', 'Unterricht'],
    noten: ['edit', 'p-note', 'Noten'], warn: ['bell', 'p-warn', 'Hinweis'], tausch: ['swap', 'p-swap', 'Stundentausch'], todo: ['todo', 'p-todo', 'To-dos'],
    't-upload': ['upload', 'p-t-upload', 'Hochladen'], 't-vokabel': ['exam', 'p-t-vokabel', 'Vokabeltest'], 't-kopie': ['copy', 'p-t-kopie', 'Kopieren'],
    't-korrektur': ['check', 'p-t-korrektur', 'Korrigieren'], 't-vorbereiten': ['book', 'p-t-vorb', 'Vorbereiten'], 't-sonst': ['list', 'p-t-sonst', 'Sonstiges']
  };
  const picto = (type, extra = '') => { const p = PICTO[type] || PICTO.termin; return `<span class="picto ${p[1]} ${extra}" title="${p[2]}">${icon(p[0])}</span>`; };
  const evTitle = e => e.type === 'pruefung' ? (e.kind || 'Prüfung') : e.type === 'ausfall' ? 'Ausfall' : e.type === 'tausch' ? 'Stundentausch' : (e.kind || 'Termin');
  function swapText(e) { // „2. Std. · Deutsch → Englisch“
    const a = S.data.classes[e.classId], b = S.data.classes[e.toClassId];
    const l = lessonsOn(e.date, e.classId).find(x => x.away && x.away.id === e.id);
    return `${l ? pLabel(l.from, l.to) : e.from + '. Std.'} · ${esc(swapName(a, b))} → ${esc(swapName(b, a))}`;
  }
  const clsChip = c => c ? `<span class="cls-chip" ${ccStyle(c)}><i></i>${esc(c.name)} ${esc(c.subject || '')}</span>` : '<span class="cls-chip all"><i></i>alle Kurse</span>';
  function lessonsUntilExam(cid, examDate, fromDate, fromPeriod) { // Stunden ab (inkl.) dieser Stunde bis vor die Prüfung, ohne Ausfälle
    return sum(lessonsBetween(cid, fromDate, addDaysISO(examDate, -1))
      .filter(l => !l.cancelled && (l.date > fromDate || l.from >= fromPeriod)).map(l => l.hours));
  }
  const nextExamOf = (cid, afterIso) => live(S.data.events).filter(e => e.type === 'pruefung' && e.classId === cid && e.date > afterIso).sort((a, b) => a.date.localeCompare(b.date))[0] || null;
  function glance(items, bold = false) { // Kennzahlen: ruhige Leiste oder plakative Farbfelder
    return `<div class="sumbar ${bold ? 'bold' : ''}">${items.map(it => `<button type="button" class="sum-item ${it.tone || ''}" ${it.action ? `data-action="${it.action}"` : 'tabindex="-1"'} ${it.data || ''}>
      <strong>${it.value}</strong><span>${it.label}</span></button>`).join('')}</div>`;
  }
  function eventRow(e, { showCountdown = false } = {}) {
    const t = todayISO();
    const c = e.classId ? S.data.classes[e.classId] : null;
    let right = '';
    if (showCountdown && e.date >= t) {
      const days = diffDays(t, e.date);
      right = `<span class="ev-right"><b>${days === 0 ? 'heute' : days === 1 ? 'morgen' : `in ${days} T.`}</b>${e.type === 'pruefung' && c ? `<small>noch ${examInfo(e).lessons ?? 0} Std.</small>` : ''}</span>`;
    }
    return `<button type="button" class="ev-row ${e.date < t ? 'past' : ''}" data-action="editEvent" data-eid="${e.id}">
      ${picto(e.type)}
      <span class="ev-date"><b>${WD[wdOf(e.date)]}</b>${fmtISO(e.date)}</span>
      <span class="ev-main"><strong>${esc(evTitle(e))}</strong>${clsChip(c)}${e.type === 'tausch' ? `<small>${swapText(e)}${e.note ? ' · ' + esc(e.note) : ''}</small>` : e.note ? `<small>${esc(e.note)}</small>` : ''}</span>
      ${right}</button>`;
  }
  function lessonCard(l, { compact = false, showDate = false } = {}) {
    const c = l.cls;
    const examToday = eventsOn(l.date).find(e => e.type === 'pruefung' && e.classId === c.id);
    const running = !l.cancelled && lessonRunning(l);
    const past = !running && lessonStarted(l) && l.date === todayISO();
    const nx = !l.cancelled && !examToday ? nextExamOf(c.id, l.date) : null;
    const left = nx ? lessonsUntilExam(c.id, nx.date, l.date, l.from) : null;
    let badge = '';
    if (l.away) badge = `<span class="lr-badge s">${icon('swap')}getauscht</span>`;
    else if (l.cancelled) badge = `<span class="lr-badge x">${icon('ban')}entfällt</span>`;
    else if (examToday) badge = `<span class="lr-badge e">${icon('exam')}${esc(examToday.kind || 'Prüfung')}</span>`;
    else if (nx && !compact) badge = `<span class="lr-count" title="${esc(nx.kind || 'Prüfung')} am ${fmtShort(nx.date)} – mit dieser Stunde noch ${left} Stunden"><b>${left}</b><small>Std. bis<br>${esc(shortKind(nx.kind))}</small></span>`;
    return `<button type="button" class="lrow ${l.cancelled ? 'cancelled' : ''} ${running ? 'running' : ''} ${past ? 'past' : ''}" ${ccStyle(c)}
        data-action="lessonSheet" data-cid="${c.id}" data-date="${l.date}" data-from="${l.from}">
      <span class="lr-time">${showDate ? `<b>${WD[wdOf(l.date)]}</b><small>${fmtISO(l.date)}</small>` : `<b>${esc(l.start)}</b><small>${esc(l.end)}</small>`}</span>
      <span class="lr-bar"></span>
      <span class="lr-main"><span class="lr-title"><b>${esc(c.name)}</b> ${esc(c.subject || '')}${l.swapIn ? ` <span class="lr-swap">${icon('swap')}statt ${esc(swapName(l.swapFrom, c))}</span>` : ''}${running ? ' <span class="lr-now">jetzt</span>' : ''}</span>
        <small>${pLabel(l.from, l.to)}${l.hours > 1 ? ' · Doppelstunde' : ''}${l.room ? ' · ' + esc(l.room) : ''}${l.away ? ` · stattdessen ${esc(S.data.classes[l.away.toClassId]?.subject || '')}` : l.cancelled && l.cancelled !== true ? ' · ' + esc(l.cancelled) : ''}</small></span>
      ${badge}
    </button>`;
  }
  const shortKind = k => { const x = (k || 'Prüfung').toLowerCase(); return x.includes('klausur') ? 'Klausur' : x.includes('klassenarbeit') ? 'KA' : x.includes('mündl') ? 'Prüfung' : (k || 'Prüfung').slice(0, 10); };
  function examTile(ev) {
    const c = S.data.classes[ev.classId];
    const inf = examInfo(ev);
    return `<button type="button" class="xrow" ${ccStyle(c)} data-action="editEvent" data-eid="${ev.id}">
      <span class="xr-days"><b>${inf.days}</b><small>${inf.days === 1 ? 'Tag' : 'Tage'}</small></span>
      <span class="xr-main"><b>${esc(ev.kind || 'Prüfung')}</b> <span class="xr-c"><i></i>${esc(c ? clsLabel(c) : 'ohne Kurs')}</span>
        <small>${WD[wdOf(ev.date)]} ${fmtISO(ev.date)}${inf.lessons != null ? ` · noch ${plural(inf.lessons, 'Stunde', 'Stunden')}` : ''}</small></span>
      ${icon('right')}
    </button>`;
  }
  const noCourses = () => emptyState('Willkommen!', 'Importiere deine Ganzjahresplanung (Excel) oder lege Kurse von Hand an.',
    `<div class="btnrow center"><button type="button" class="btn primary" data-action="goto" data-view="jahr">${icon('sheet')} Ganzjahresplanung importieren</button><button type="button" class="btn" data-action="newClass">${icon('plus')} Kurs anlegen</button></div>`, 'today');


  /* ---------- To-dos (tages- oder kursabhängig) ---------- */
  const TODO_CATS = [['upload', 'Hochladen', 'Dateien hochladen'], ['vokabel', 'Vokabeltest', 'Vokabeltest erstellen'], ['kopie', 'Kopieren', 'Kopien machen'],
    ['korrektur', 'Korrigieren', 'Korrigieren'], ['vorbereiten', 'Vorbereiten', 'Material vorbereiten'], ['sonst', 'Sonstiges', '']];
  const todoCat = k => TODO_CATS.find(c => c[0] === k) || TODO_CATS[5];
  const openTodos = () => live(S.data.todos).filter(t => !t.done);
  function weeklyGradeTodo() {
    if (!S.data) return;
    const ws = weekKey(todayISO()), id = 'noten-' + ws, td = S.data.todos[id];
    const days = [4, 3, 2, 1, 0].map(i => addDaysISO(ws, i)).filter(x => !freeReason(x));
    const withLessons = classesSorted().some(c => studentsOf(c.id).length && !c.noOral && !weekSkipped(c, ws) && weekHasLessons(c.id, ws));
    const done = !missingGrades(ws).length;
    if (!td) {
      if (!days.length || !withLessons) return; // Ferienwoche: kein To-do
      commit(d => { d.todos[id] = { id, auto: 'noten', cat: 'sonst', text: 'Mündliche Noten eintragen', classId: null, date: days[0], done, doneAt: done ? now() : null, createdAt: now(), updatedAt: now() }; }, { sync: true });
      return;
    }
    if (td.deleted) return;
    if (td.done !== done && (done || !td.doneAt || td.auto === 'noten')) commit(d => { d.todos[id] = Object.assign({}, td, { done, doneAt: done ? now() : null, updatedAt: now() }); });
  }
  const hasLessonOn = (cid, d) => lessonsOn(d, cid).some(l => !l.away && !l.cancelled);
  function nextLessonDate(cid, after = todayISO()) { // nächster Unterrichtstag des Kurses ab heute (inkl.)
    let d = after;
    for (let i = 0; i < 90; i++, d = addDaysISO(d, 1)) if (lessonsOn(d, cid).some(l => !l.away && !l.cancelled && (d > todayISO() || !lessonStarted(l) || lessonRunning(l)))) return d;
    return null;
  }
  const todoDue = t => t.date || (t.classId ? nextLessonDate(t.classId) : null); // ohne Datum + Kurs → zur nächsten Stunde
  const todoSort = (a, b) => (todoDue(a) || '9999').localeCompare(todoDue(b) || '9999') || (a.createdAt || 0) - (b.createdAt || 0);
  function todosForDay(d) {
    const t = todayISO();
    return openTodos().filter(x => x.date ? (x.date === d || (d === t && x.date < t)) : (x.classId && (d === t ? todoDue(x) === t : hasLessonOn(x.classId, d) && todoDue(x) === d))).sort(todoSort);
  }
  function todoWhen(x) {
    const t = todayISO();
    if (x.date) {
      if (x.date < t && !x.done) return `<span class="td-late">überfällig · ${WD[wdOf(x.date)]} ${fmtISO(x.date)}</span>`;
      return (x.date === t ? 'heute' : x.date === addDaysISO(t, 1) ? 'morgen' : `${WD[wdOf(x.date)]} ${fmtISO(x.date)}`) + (x.time ? ` ${x.time} Uhr` : '');
    }
    if (x.classId) { const n = nextLessonDate(x.classId); return n ? `zur nächsten Stunde (${n === t ? 'heute' : `${WD[wdOf(n)]} ${fmtISO(n)}`})` : 'zur nächsten Stunde'; }
    return 'ohne Datum';
  }
  function todoRow(x, { course = true } = {}) {
    const c = x.classId ? S.data.classes[x.classId] : null;
    const cat = todoCat(x.cat);
    const meta = [course && c ? `<span class="td-c" ${ccStyle(c)}><i></i>${esc(clsLabel(c))}</span>` : '', todoWhen(x)].filter(Boolean).join(' · ');
    return `<div class="todo ${x.done ? 'done' : ''}">
      <button type="button" class="tk" data-action="todoToggle" data-id="${x.id}" aria-label="${x.done ? 'Wieder öffnen' : 'Erledigt'}">${icon('check')}</button>
      <button type="button" class="td-main" data-action="${x.auto === 'noten' ? 'startNoten' : 'todoEdit'}" data-id="${x.id}">${picto('t-' + cat[0], 'sm')}<span class="td-txt"><b>${esc(x.text || cat[2] || cat[1])}</b>${x.nsFor && x.nsFor.length ? `<small class="td-ns">${esc(x.nsFor.map(sid => S.data.students[sid]?.name).filter(Boolean).join(', '))}</small>` : ''}<small>${meta}</small></span></button>
    </div>`;
  }
  const todoList = (xs, opts, empty = 'Nichts zu erledigen.') => xs.length ? `<div class="glist todo-list">${xs.map(x => todoRow(x, opts)).join('')}</div>` : `<p class="empty-line">${empty}</p>`;
  async function todoDialog(td, preset = {}) {
    const isNew = !td;
    let cat = td?.cat || preset.cat || 'sonst';
    const cid = td ? (td.classId || '') : (preset.cid ?? (S.view === 'kurse' && S.courseId) ?? '') || '';
    const date = td ? (td.date || '') : (preset.date ?? todayISO());
    const cs = classesSorted();
    const res = await openModal({
      title: isNew ? 'Neues To-do' : 'To-do bearbeiten', autofocus: isNew && canHover(),
      body: `<div class="cat-chips" id="t-cats">${TODO_CATS.map(([k, l]) => `<button type="button" data-k="${k}" class="${k === cat ? 'on' : ''}">${picto('t-' + k, 'xs')}${l}</button>`).join('')}</div>
        <label class="field"><span>Was ist zu tun?</span><input id="t-text" maxlength="160" value="${esc(td?.text || '')}" placeholder="z. B. Arbeitsblatt 25× kopieren"></label>
        <label class="field"><span>Kurs (optional)</span><select id="t-cls"><option value="">ohne Kurs</option>${cs.map(c => `<option value="${c.id}" ${c.id === cid ? 'selected' : ''}>${esc(clsLabel(c))}</option>`).join('')}</select></label>
        <div class="field"><span>Bis wann?</span><div class="quick-row" id="t-quick"><button type="button" data-q="today">Heute</button><button type="button" data-q="tomorrow">Morgen</button><button type="button" data-q="next">Nächste Stunde</button><button type="button" data-q="none">Ohne Datum</button></div>
          <input type="date" id="t-date" value="${date}"></div>
        <div class="two-col"><label class="field"><span>Uhrzeit (optional)</span><input type="time" id="t-time" value="${esc(td?.time || '')}"></label>
          <label class="check t-morning"><input type="checkbox" id="t-morning" ${td?.morning ? 'checked' : ''}><span>Am Morgen des Fälligkeitstags um 7:15 Uhr erinnern</span></label></div>
        <p class="muted small">Mit Uhrzeit kommt bei Fälligkeit eine Push-Nachricht (wenn unter Mehr eingeschaltet; kann bis zu 30 Minuten später eintreffen).</p>
        <p class="muted small" id="t-info"></p><p class="err" hidden></p>`,
      mount: root => {
        const $$ = q => root.querySelector(q);
        const upd = () => {
          root.querySelectorAll('#t-cats [data-k]').forEach(b => b.classList.toggle('on', b.dataset.k === cat));
          const d = $$('#t-date').value, c = $$('#t-cls').value;
          let info = '';
          if (!d && c) { const n = nextLessonDate(c); info = n ? `Ohne Datum: erscheint zur nächsten Stunde von ${clsLabel(S.data.classes[c])} (${fmtLong(n)}).` : ''; }
          else if (!d) info = 'Ohne Datum und Kurs: steht nur in der To-do-Liste.';
          else if (c && !hasLessonOn(c, d)) { const n = nextLessonDate(c, d); info = n ? `Hinweis: An diesem Tag hat der Kurs keinen Unterricht – nächste Stunde ${fmtLong(n)}.` : ''; }
          $$('#t-info').textContent = info;
        };
        $$('#t-cats').addEventListener('click', e => {
          const b = e.target.closest('[data-k]'); if (!b) return;
          const inp = $$('#t-text'), old = todoCat(cat)[2];
          cat = b.dataset.k;
          if (!inp.value.trim() || inp.value === old) inp.value = todoCat(cat)[2];
          upd();
        });
        $$('#t-quick').addEventListener('click', e => {
          const b = e.target.closest('[data-q]'); if (!b) return;
          const q = b.dataset.q, c = $$('#t-cls').value;
          if (q === 'today') $$('#t-date').value = todayISO();
          else if (q === 'tomorrow') $$('#t-date').value = addDaysISO(todayISO(), 1);
          else if (q === 'none') $$('#t-date').value = '';
          else if (q === 'next') {
            if (!c) { modalErr(root, 'Für „Nächste Stunde“ bitte zuerst einen Kurs wählen.'); return; }
            $$('#t-date').value = nextLessonDate(c, addDaysISO(todayISO(), 1)) || '';
          }
          upd();
        });
        $$('#t-cls').addEventListener('change', upd);
        $$('#t-date').addEventListener('change', upd);
        upd();
      },
      actions: [
        ...(isNew ? [] : [{ label: 'Löschen', cls: 'danger', value: 'delete' }]),
        { label: 'Abbrechen', value: null },
        {
          label: 'Speichern', cls: 'primary', run: root => {
            const text = root.querySelector('#t-text').value.trim() || todoCat(cat)[2];
            if (!text) { modalErr(root, 'Bitte kurz eintragen, was zu tun ist.'); shake(root.querySelector('#t-text')); return false; }
            const d = root.querySelector('#t-date').value;
            const tm = root.querySelector('#t-time').value;
            return { text, cat, classId: root.querySelector('#t-cls').value || null, date: /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null, time: /^\d{2}:\d{2}$/.test(tm) ? tm : null, morning: root.querySelector('#t-morning').checked };
          }
        }
      ]
    });
    if (!res) return;
    if (res === 'delete') {
      const copy = Object.assign({}, S.data.todos[td.id]);
      commit(d => { d.todos[td.id] = { id: td.id, deleted: true, updatedAt: now() }; });
      toast('To-do gelöscht', { undo: () => commit(d => { d.todos[td.id] = Object.assign(copy, { updatedAt: now() }); }) });
      return;
    }
    const id = td?.id || uid();
    commit(d => { d.todos[id] = Object.assign({ done: false, createdAt: now() }, td || {}, res, { id, updatedAt: now() }); });
    toast(isNew ? 'To-do gespeichert' : 'Geändert');
  }
  function todoToggle(id) {
    const x = S.data.todos[id]; if (!x) return;
    const done = !x.done;
    commit(d => { d.todos[id] = Object.assign({}, x, { done, doneAt: done ? now() : null, updatedAt: now() }); });
    if (done) toast('Erledigt', { undo: () => commit(d => { d.todos[id] = Object.assign({}, S.data.todos[id], { done: false, doneAt: null, updatedAt: now() }); }) });
  }
  function viewTodos() {
    const t = todayISO(), f = S.todoFilter || '';
    const cs = classesSorted();
    const all = live(S.data.todos).filter(x => !f || (f === '-' ? !x.classId : x.classId === f));
    const open = all.filter(x => !x.done).sort(todoSort), done = all.filter(x => x.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
    let html = pageHead('To-dos', `${plural(open.length, 'offene Aufgabe', 'offene Aufgaben')}`, `<button type="button" class="btn primary small" data-action="newTodo" data-cid="${f && f !== '-' ? f : ''}">${icon('plus')} Neu</button>`);
    html += `<div class="chipbar"><button type="button" class="fchip ${!f ? 'on' : ''}" data-action="todoFilter" data-f="">Alle</button>
      ${cs.map(c => `<button type="button" class="fchip ${f === c.id ? 'on' : ''}" ${ccStyle(c)} data-action="todoFilter" data-f="${c.id}"><i class="dot"></i>${esc(c.name)} <small>${esc(c.subject || '')}</small></button>`).join('')}
      <button type="button" class="fchip ${f === '-' ? 'on' : ''}" data-action="todoFilter" data-f="-">ohne Kurs</button></div>`;
    const we = addDaysISO(weekKey(t), 6);
    const groups = [['Überfällig', x => x.date && x.date < t], ['Heute', x => todoDue(x) === t], ['Morgen', x => todoDue(x) === addDaysISO(t, 1)],
      ['Diese Woche', x => todoDue(x) > addDaysISO(t, 1) && todoDue(x) <= we], ['Später', x => todoDue(x) > we], ['Ohne Datum', x => !todoDue(x)]];
    const used = new Set();
    for (const [name, fn] of groups) {
      const xs = open.filter(x => !used.has(x.id) && fn(x));
      xs.forEach(x => used.add(x.id));
      if (xs.length) html += `<section class="section"><div class="section-head"><h2>${name}</h2><span class="muted small">${xs.length}</span></div>${todoList(xs)}</section>`;
    }
    if (!open.length) html += emptyState('Alles erledigt', 'Trage ein, was du vor einer Stunde oder an einem Tag erledigen musst – z. B. Dateien hochladen, Vokabeltest erstellen, kopieren.', `<button type="button" class="btn primary" data-action="newTodo">${icon('plus')} To-do anlegen</button>`, 'todo');
    if (done.length) {
      html += `<section class="section"><div class="section-head"><h2>Erledigt</h2><button type="button" class="link" data-action="todoShowDone">${S.todoDone ? 'ausblenden' : `anzeigen (${done.length})`}</button></div>
        ${S.todoDone ? todoList(done.slice(0, 40)) + `<div class="btnrow"><button type="button" class="btn small ghost danger" data-action="todoClean">${icon('trash')} Erledigte entfernen</button></div>` : ''}</section>`;
    }
    return html;
  }


  /* ---------- Startmenü ---------- */
  function viewStart() {
    const t = todayISO(), hr = new Date(now()).getHours();
    const greet = hr < 11 ? 'Guten Morgen' : hr < 17 ? 'Hallo' : 'Guten Abend';
    const free = freeReason(t);
    const myName = S.data.prefs?.profil?.name;
    let html = `<div class="start-head"><h1>${greet}${myName ? ', ' + esc(myName) : ''}!</h1><p>${fmtLong(t)} · KW ${isoWeek(parseISO(t))}${free ? ' · ' + esc(free) : ''}</p></div>`;
    html += holidayStrip(t);
    if (classesSorted().length) html += heuteGlance(t) + heuteTermine(t);
    const cs = classesSorted();
    if (!cs.length) return html + noCourses();
    const ls = lessonsOn(t).filter(l => !l.away && !l.cancelled);
    const cur = ls.find(l => lessonRunning(l)) || ls.find(l => !lessonStarted(l));
    if (cur) {
      const run = lessonRunning(cur);
      html += `<button type="button" class="start-now" ${ccStyle(cur.cls)} data-action="lessonSheet" data-cid="${cur.cls.id}" data-date="${t}" data-from="${cur.from}">
        <span class="sn-k">${run ? 'Jetzt' : `Als Nächstes · ${esc(cur.start)} Uhr`}</span>
        <b>${esc(cur.cls.name)} <span>${esc(cur.cls.subject || '')}</span></b>
        <small>${pLabel(cur.from, cur.to)}${cur.room ? ' · ' + esc(cur.room) : ''}${cur.swapIn ? ' · Tausch' : ''}</small></button>`;
    } else {
      const d = addDaysISO(t, 1); // erst am Vortag zeigen
      const nl = lessonsOn(d).find(l => !l.away && !l.cancelled);
      html += `<div class="start-now calm"><span class="sn-k">${ls.length ? 'Heute kein Unterricht mehr' : free ? esc(free) : 'Heute kein Unterricht'}</span>
        ${nl ? `<b>${diffDays(t, d) === 1 ? 'Morgen' : `${WD_LONG[wdOf(d)]}, ${fmtISO(d)}`}: ${esc(nl.cls.name)} <span>${esc(nl.cls.subject || '')}</span></b><small>${esc(nl.start)} Uhr · ${pLabel(nl.from, nl.to)}</small>` : ''}</div>`;
    }
    // Nur Aktionen, die jetzt wirklich möglich bzw. sinnvoll sind
    const ws = weekKey(t), we = addDaysISO(ws, 6);
    const withKids = cs.filter(c => studentsOf(c.id).length && !c.noOral);
    const miss = sum(withKids.map(c => { const has = new Set(entriesOf(c.id, ws, we).map(e => e.studentId)); return studentsOf(c.id).filter(s => !has.has(s.id)).length; }));
    const tds = todosHeute(t);
    const tiles = [];
    const missNow = missingGrades(ws);
    if (withKids.some(c => weekHasLessons(c.id, ws))) { const m = sum(missNow.map(x => x.miss)); tiles.push(['startNoten', '', 'edit', 'Mündliche Noten eintragen', m ? `diese Woche fehlen noch ${m}` : 'alle haben diese Woche eine Note', 'c-noten']); }
    if (tds.length) tiles.push(['startTodos', '', 'todo', 'To-dos erledigen', `${tds.length} für heute/morgen`, 'c-todo']);
    for (const e of kmMissingResults().slice(0, 2)) tiles.push(['kmAsk', e.id, 'exam', `Noten fehlen: ${esc(e.titel)}`, `${esc(e.kurs)} · seit ${esc(e.fertig)} fertig korrigiert`, 'c-termine']);
    const fehl = missingOverview().filter(r => r.ws < weekKey(t));
    if (fehl.length) tiles.push(['goto', 'fehlend', 'list', 'Fehlende mündliche Noten', `${plural(fehl.length, 'Kurswoche', 'Kurswochen')} noch offen`, 'c-warn']);
    if (withKids.some(c => c.vocab)) tiles.push(['startVocab', '', 'exam', 'Vokabeltest eintragen', 'Punkte → Note automatisch', 'c-woche']);
    const tc = termCfg();
    const zEnds = [[tc.hj1End, 'Halbjahreszeugnis'], [tc.end, 'Jahreszeugnis']].filter(([d]) => d && diffDays(t, d) <= 21 && diffDays(t, d) >= -10);
    if (zEnds.length && withKids.length) { const [d, l] = zEnds[0]; const n = diffDays(t, d); tiles.push(['startZeugnis', '', 'award', 'Zeugnisnoten festlegen', `${l} ${n > 0 ? `in ${n} Tagen` : n === 0 ? 'heute' : 'steht an'}`, 'c-kurse']); }
    if (inHJ2() && tc.warnDeadline) {
      const n = diffDays(t, tc.warnDeadline), wsum = warnSummary();
      if (n >= 0 && n <= 30 && wsum.total) tiles.push(['openWarn', '', 'bell', 'Blaue Briefe prüfen', `Frist ${relDays(n)}${wsum.open ? ` · ${wsum.open} offen` : ''}`, 'c-warn']);
    }
    const add = [['newTodo', '', 'todo', 'To-do anlegen'], ['newEvent', 'termin', 'cal', 'Termin eintragen'], ['newEvent', 'ausfall', 'ban', 'Ausfall eintragen'], ['newEvent', 'pruefung', 'flag', 'Prüfung ansetzen']];
    if (cs.some(c => partnersOf(c).length)) add.push(['newEvent', 'tausch', 'swap', 'Stunden tauschen']);
    html += `<h2 class="start-q">Was möchtest du tun?</h2>`;
    if (tiles.length) html += `<div class="start-grid">${tiles.map(([a, v, ic, title, sub, cls]) =>
      `<button type="button" class="start-tile ${cls}" data-action="${a}" ${v ? (a === 'goto' ? `data-view="${v}"` : `data-eid="${v}"`) : ''}>${icon(ic)}<b>${title}</b><small>${sub}</small></button>`).join('')}</div>`;
    html += heuteBody(t, { ohneTermine: true });
    return html;
  }
  // Reiter „Eintragen“: alles, was man neu anlegen kann, an einer Stelle
  function viewNeu() {
    const cs = classesSorted();
    const items = [['newTodo', '', 'todo', 'To-do', 'mit Datum, Uhrzeit, Erinnerung'], ['newEvent', 'termin', 'cal', 'Termin', 'auch mit ausfallenden Stunden'],
      ['newEvent', 'ausfall', 'ban', 'Ausfall', 'Stunde oder ganzer Tag'], ['newEvent', 'pruefung', 'flag', 'Prüfung ansetzen', 'Klassenarbeit, Klausur, Test']];
    if (cs.some(c => partnersOf(c).length)) items.push(['newEvent', 'tausch', 'swap', 'Stunden tauschen', 'gleiche Klasse, anderes Fach']);
    if (cs.some(c => studentsOf(c.id).length)) items.push(['startNoten', '', 'edit', 'Mündliche Noten', 'Wochennote je Kind']);
    if (cs.some(c => c.vocab)) items.push(['startVocab', '', 'exam', 'Vokabeltest', 'Punkte → Note']);
    if (kmKey()) items.push(['kmPaste', '', 'copy', 'Klausurnoten einfügen', 'aus der Korrektur-App']);
    return pageHead('Eintragen', 'Was möchtest du neu eintragen?') + `<div class="start-grid neu-grid">${items.map(([a, type, ic, title, sub]) =>
      `<button type="button" class="start-tile c-neu" data-action="${a}" ${type ? `data-type="${type}"` : ''}>${icon(ic)}<b>${title}</b><small>${sub}</small></button>`).join('')}</div>`;
  }
  // Schultage (Mo–Fr ohne Feiertage/Ferien) ab heute bis vor die nächsten Ferien
  function holidayCountdown(t) {
    const cur = holidayOn(t);
    if (cur) return { now: cur };
    const next = live(S.data.holidays).filter(h => h.from > t).sort((a, b) => a.from.localeCompare(b.from))[0];
    if (!next) return null;
    let n = 0;
    for (let d = t; d < next.from; d = addDaysISO(d, 1)) if (!freeReason(d)) n++;
    return { next, n };
  }
  function holidayStrip(t) { // Ferien bzw. Countdown als Streifen über die ganze Breite
    const hc = holidayCountdown(t);
    if (!hc) return '';
    return hc.now ? `<div class="hol-strip">${icon('sun')}<b>${esc(hc.now.name)}</b><span>bis ${fmtISO(hc.now.to, true)}</span></div>`
      : `<div class="hol-strip"><b>${hc.n}</b><span>${hc.n === 1 ? 'Schultag' : 'Schultage'} bis ${esc(hc.next.name)}</span></div>`;
  }
  function todayBanner(t) {
    const items = [];
    for (const e of eventsOn(t)) items.push(`<li>${picto(e.type === 'pruefung' ? 'pruefung' : e.type === 'ausfall' ? 'ausfall' : 'termin', 'sm')}<span><b>${esc(evTitle(e))}</b>${e.classId ? ` · ${esc(clsLabel(S.data.classes[e.classId]))}` : ''}${e.time ? ` · ${esc(e.time)} Uhr` : ''}</span></li>`);
    for (const x of todosHeute(t).filter(x => todoDue(x) <= t)) items.push(`<li>${picto('todo', 'sm')}<span><b>${esc(x.text || x.title || 'To-do')}</b> · To-do</span></li>`);
    const cal = calItemsOn(t), schule = cal.filter(x => x.art === 'schule'), privat = cal.filter(x => x.art === 'privat');
    items.push(...schule.map(calLi));
    if (privat.length) items.push(`<li class="tb-sub">Privat</li>`, ...privat.map(calLi));
    const hc = holidayCountdown(t);
    const cd = !hc ? '' : hc.now ? `<div class="tb-count"><b>${esc(hc.now.name)}</b><span>bis ${fmtISO(hc.now.to, true)}</span></div>`
      : `<div class="tb-count"><b>${hc.n}</b><span>${hc.n === 1 ? 'Schultag' : 'Schultage'} bis ${esc(hc.next.name)}</span></div>`;
    return `<section class="today-banner"><div class="tb-main"><h2>Heute</h2>${items.length ? `<ul>${items.join('')}</ul>` : '<p class="muted small">Keine Termine heute.</p>'}</div>${cd}</section>`;
  }
  async function pickCourse(title, list, todayFirst = true) {
    const t = todayISO();
    const today = todayFirst ? [...new Set(lessonsOn(t).filter(l => !l.away && !l.cancelled).map(l => l.cls.id))].filter(id => list.some(c => c.id === id)) : [];
    const rest = list.map(c => c.id).filter(id => !today.includes(id));
    if (today.length + rest.length === 1) return today[0] || rest[0];
    const btn = id => { const c = S.data.classes[id]; return `<button type="button" class="pick-course" ${ccStyle(c)} data-cid="${id}"><b>${esc(c.name)}</b> ${esc(c.subject || '')}</button>`; };
    return openModal({
      title,
      body: `${today.length ? `<h4 class="pick-h">Heute</h4><div class="pick-grid">${today.map(btn).join('')}</div>` : ''}
        ${rest.length ? `<h4 class="pick-h">${today.length ? 'Weitere Kurse' : 'Kurse'}</h4><div class="pick-grid">${rest.map(btn).join('')}</div>` : ''}`,
      actions: [{ label: 'Abbrechen', value: null }],
      mount: (root, close) => root.addEventListener('click', e => { const b = e.target.closest('[data-cid]'); if (b) close(b.dataset.cid); })
    });
  }
  const openCourseTab = (cid, tab) => { S.view = 'kurse'; S.courseId = cid; S.classId = cid; S.courseTab = tab; S.detailStudent = null; S.assessId = null; saveUI(); render(); window.scrollTo(0, 0); };
  async function startNoten() {
    const t = todayISO();
    const ls = lessonsOn(t).filter(l => !l.away && !l.cancelled && studentsOf(l.cls.id).length);
    const cur = ls.find(l => lessonRunning(l)) || ls.find(l => lessonStarted(l) && now() - tsOf(l.date, l.end) < 90 * 60000);
    if (cur) return openNoten(cur.cls.id, t);
    const today = [...new Set(ls.map(l => l.cls.id))];
    const rest = classesSorted().filter(c => !today.includes(c.id) && studentsOf(c.id).length).map(c => c.id);
    const btn = id => { const c = S.data.classes[id]; return `<button type="button" class="pick-course" ${ccStyle(c)} data-cid="${id}"><b>${esc(c.name)}</b> ${esc(c.subject || '')}</button>`; };
    const cid = await openModal({
      title: 'Noten eintragen – welcher Kurs?',
      body: `${today.length ? `<h4 class="pick-h">Heute</h4><div class="pick-grid">${today.map(btn).join('')}</div>` : ''}
        ${rest.length ? `<h4 class="pick-h">${today.length ? 'Weitere Kurse' : 'Kurse'}</h4><div class="pick-grid">${rest.map(btn).join('')}</div>` : ''}
        ${!today.length && !rest.length ? '<p>Noch keine Kurse mit Kindern – trage unter Kurse die Namen ein.</p>' : ''}`,
      actions: [{ label: 'Abbrechen', value: null }],
      mount: (root, close) => root.addEventListener('click', e => { const b = e.target.closest('[data-cid]'); if (b) close(b.dataset.cid); })
    });
    if (cid) openNoten(cid, t);
  }

  /* ---------- Heute ---------- */
  function todosHeute(d) { // fällig heute (inkl. überfällig) bzw. schon morgen fällig
    const t = todayISO(), d1 = addDaysISO(d, 1);
    return openTodos().filter(x => { const due = todoDue(x); return due && (d === t ? due <= d1 : due === d || due === d1); }).sort(todoSort);
  }
  function soonItems(d, days = 3) { // was in den nächsten Tagen ansteht (ohne heute)
    const to = addDaysISO(d, days), out = [];
    for (const e of live(S.data.events)) if (e.date > d && e.date <= to) out.push({ date: e.date, ord: e.type === 'pruefung' ? 0 : e.type === 'ausfall' ? 1 : 2, html: eventRow(e, { showCountdown: true }) });
    const rel = iso => { const n = diffDays(todayISO(), iso); return n === 1 ? 'morgen' : n > 1 ? `in ${n} T.` : ''; };
    for (const h of live(S.data.holidays)) if (h.from > d && h.from <= to) out.push({ date: h.from, ord: 3, html: `<div class="ev-row static">${picto('ferien')}<span class="ev-date"><b>${WD[wdOf(h.from)]}</b>${fmtISO(h.from)}</span><span class="ev-main"><strong>${esc(h.name)}</strong><small>bis ${fmtISO(h.to, true)}</small></span><span class="ev-right"><b>${rel(h.from)}</b></span></div>` });
    for (let i = 1; i <= days; i++) { const iso = addDaysISO(d, i), f = feiertage(parseISO(iso).getFullYear()).get(iso); if (f && wdOf(iso) < 5) out.push({ date: iso, ord: 3, html: `<div class="ev-row static">${picto('feiertag')}<span class="ev-date"><b>${WD[wdOf(iso)]}</b>${fmtISO(iso)}</span><span class="ev-main"><strong>${esc(f)}</strong><small>Feiertag – kein Unterricht</small></span><span class="ev-right"><b>${rel(iso)}</b></span></div>` }); }
    return out.sort((x, y) => x.date.localeCompare(y.date) || x.ord - y.ord);
  }
  function viewHeute() {
    const t = todayISO();
    const d = S.heuteDate || t;
    const isToday = d === t;
    const ls = lessonsOn(d).filter(l => !l.away);
    const free = freeReason(d);
    const title = isToday ? 'Heute' : d === addDaysISO(t, 1) ? 'Morgen' : d === addDaysISO(t, -1) ? 'Gestern' : WD_LONG[wdOf(d)];
    const nav = `<div class="day-nav">
        <button type="button" class="icon-btn" data-action="dayPrev" aria-label="Vorheriger Tag">${icon('left')}</button>
        ${isToday ? '' : '<button type="button" class="btn small" data-action="dayToday">Heute</button>'}
        <button type="button" class="icon-btn" data-action="dayNext" aria-label="Nächster Tag">${icon('right')}</button>
      </div>`;
    let html = pageHead(title, `${fmtLong(d)} · KW ${isoWeek(parseISO(d))}`, nav);
    if (!classesSorted().length) return html + noCourses();
    // Unterricht: heute nur, was noch ansteht (gehaltene Stunden einklappbar)
    const over = l => isToday && lessonStarted(l) && !lessonRunning(l);
    const upcoming = ls.filter(l => !over(l)), past = ls.filter(over);
    const shown = S.showPast ? ls : upcoming;
    const hoursLeft = sum(upcoming.filter(l => !l.cancelled).map(l => l.hours));
    const evs = eventsOn(d).sort((a, b) => a.type.localeCompare(b.type));
    const soon = soonItems(d, 3);
    const tds = todosHeute(d);
    const reminders = isToday ? reminderBanner() + warnCard() : '';
    html += heuteGlance(d) + heuteBody(d);
    return html;
  }

  function heuteCounts(d) {
    const evs = eventsOn(d).filter(e => e.type !== 'tausch'), cal = calItemsOn(d, { alle: d < todayISO() });
    return { dienst: evs.length + cal.filter(x => x.art === 'schule').length, privat: cal.filter(x => x.art === 'privat').length };
  }
  function heuteGlance(d) {
    const t = todayISO(), isToday = d === t, free = freeReason(d);
    const ls = lessonsOn(d).filter(l => !l.away);
    const upcoming = ls.filter(l => !(isToday && lessonStarted(l) && !lessonRunning(l)));
    const hoursLeft = sum(upcoming.filter(l => !l.cancelled).map(l => l.hours));
    const n = heuteCounts(d), tds = todosHeute(d);
    return glance([
      { value: free ? '–' : String(hoursLeft), label: free ? esc(free) : upcoming.length ? (isToday ? 'Std. stehen an' : 'Stunden') : ls.length ? 'Unterricht vorbei' : 'kein Unterricht', tone: hoursLeft ? 'less' : 'less zero', action: 'scrollTo', data: 'data-target="h-unterricht"' },
      { value: String(n.dienst), label: 'Dienstlich', tone: n.dienst ? 'term' : 'term zero', action: 'scrollTo', data: 'data-target="h-termine"' },
      { value: String(n.privat), label: 'Privat', tone: n.privat ? 'exam' : 'exam zero', action: 'scrollTo', data: 'data-target="h-termine"' },
      { value: String(tds.length), label: 'To-dos', tone: tds.length ? 'tdo' : 'tdo zero', action: 'scrollTo', data: 'data-target="h-todos"' }
    ], true);
  }
  function heuteTermine(d) {
    const t = todayISO(), isToday = d === t;
    const evs = eventsOn(d).filter(e => e.type !== 'tausch').sort((a, b) => a.type.localeCompare(b.type));
    let html = '';
    // 2. Termine des Tages
    html += `<section class="section" id="h-termine"><div class="section-head"><h2>${picto('termin', 'sm')} Termine ${isToday ? 'heute' : 'an diesem Tag'}</h2><button type="button" class="link" data-action="newEvent" data-date="${d}" data-type="termin">${icon('plus')} Termin</button></div>
      ${(() => { const cal = calItemsOn(d, { alle: d < todayISO() }), sch = cal.filter(x => x.art === 'schule'), pr = cal.filter(x => x.art === 'privat');
        if (!evs.length && !cal.length) return `<p class="empty-line">Keine Termine ${isToday ? 'heute' : 'an diesem Tag'}.</p>`;
        return (evs.length || sch.length ? `<h3 class="sub-label">Dienstlich</h3><div class="ev-list">${evs.map(e => eventRow(e)).join('')}${sch.map(x => calRow(x, d)).join('')}</div>` : '')
          + (pr.length ? `<h3 class="sub-label">Privat</h3><div class="ev-list">${pr.map(x => calRow(x, d)).join('')}</div>` : ''); })()}</section>`;

    return html;
  }
  function heuteBody(d, opts = {}) {
    const t = todayISO();
    const isToday = d === t;
    const ls = lessonsOn(d).filter(l => !l.away);
    const free = freeReason(d);
    const over = l => isToday && lessonStarted(l) && !lessonRunning(l);
    const upcoming = ls.filter(l => !over(l)), past = ls.filter(over);
    const shown = S.showPast ? ls : upcoming;
    const evs = eventsOn(d).filter(e => e.type !== 'tausch').sort((a, b) => a.type.localeCompare(b.type));
    const soon = soonItems(d, 3);
    const tds = todosHeute(d);
    const reminders = isToday ? reminderBanner() + warnCard() : '';
    let html = '';
    if (!opts.ohneTermine) html += heuteTermine(d);
    // 1. Anstehender Unterricht
    html += `<section class="section" id="h-unterricht"><div class="section-head"><h2>${picto('lesson', 'sm')} ${isToday ? 'Anstehender Unterricht' : 'Unterricht'}</h2>${upcoming.length && !free ? `<span class="muted small">Std. bis zur Prüfung</span>` : ''}</div>`;
    if (free) {
      let next = d, nl = [];
      for (let i = 0; i < 60 && !nl.length; i++) { next = addDaysISO(next, 1); nl = lessonsOn(next); }
      const when = !nl.length ? '' : diffDays(d, next) === 1 ? 'morgen' : `am ${fmtLong(next)}`;
      html += `<div class="free-card">${icon('sun')}<div><strong>${esc(free)}</strong><span>Kein Unterricht${when ? ` · weiter geht's ${when}` : ''}.</span></div>
        ${nl.length ? `<button type="button" class="btn small" data-action="dayGo" data-date="${next}">Anzeigen</button>` : ''}</div>`;
    } else if (!ls.length) {
      html += `<p class="empty-line">An diesem Tag hast du laut Stundenplan keinen Unterricht.</p>`;
    } else {
      if (shown.length) {
        html += '<div class="glist">';
        let lastTo = null;
        for (const l of shown) {
          if (lastTo != null && l.from > lastTo + 1) html += `<div class="lgap">${l.from - lastTo - 1 === 1 ? `${lastTo + 1}. Stunde frei` : `${lastTo + 1}.–${l.from - 1}. Stunde frei`}</div>`;
          html += lessonCard(l);
          lastTo = Math.max(lastTo ?? 0, l.to);
        }
        html += '</div>';
      } else html += `<p class="empty-line">${icon('check')} Unterricht für heute geschafft.</p>`;
      if (past.length) html += `<button type="button" class="link more-link" data-action="togglePast">${S.showPast ? 'Gehaltene Stunden ausblenden' : `${plural(past.length, 'gehaltene Stunde', 'gehaltene Stunden')} anzeigen`}</button>`;
    }
    html += '</section>';

    // 3. Erinnerungen: was in den nächsten 3 Tagen bevorsteht
    html += `<section class="section" id="h-bald"><div class="section-head"><h2>${picto('warn', 'sm')} Bald – die nächsten 3 Tage</h2><button type="button" class="link" data-action="goto" data-view="termine">Alle ${icon('right')}</button></div>
      ${reminders}${soon.length ? `<div class="ev-list">${soon.map(x => x.html).join('')}</div>` : `<p class="empty-line">In den nächsten drei Tagen steht nichts an.</p>`}</section>`;

    // 4. To-dos: heute fällig (inkl. überfällig) und schon für morgen
    const d1 = addDaysISO(d, 1);
    const tNow = tds.filter(x => todoDue(x) <= d), tTom = tds.filter(x => todoDue(x) === d1);
    html += `<section class="section" id="h-todos"><div class="section-head"><h2>${picto('todo', 'sm')} To-dos</h2><span class="head-links"><button type="button" class="link" data-action="newTodo" data-date="${d}">${icon('plus')} To-do</button><button type="button" class="link" data-action="goto" data-view="todos">Alle ${icon('right')}</button></span></div>
      ${!tds.length ? `<p class="empty-line">Für ${isToday ? 'heute und morgen' : 'diesen und den nächsten Tag'} ist nichts zu erledigen.</p>` : ''}
      ${tNow.length ? `<h3 class="sub-label">${isToday ? 'Heute erledigen' : 'An diesem Tag'}</h3>${todoList(tNow)}` : ''}
      ${tTom.length ? `<h3 class="sub-label">Schon für ${isToday ? 'morgen' : fmtLong(d1)} vorbereiten</h3>${todoList(tTom)}` : ''}</section>`;
    return html;
  }

  /* ---------- Fehlende mündliche Noten: je Kurs und Woche ---------- */
  function missingOverview() {
    const tc = termCfg(), t = todayISO(), mo = weekKey(t);
    let from = t <= tc.hj1End ? tc.start : addDaysISO(tc.hj1End, 1);
    const ps = S.data.settings.planStart;
    if (ps && ps > from) from = ps;
    const rows = [];
    for (let ws = weekKey(from); ws <= mo; ws = addDaysISO(ws, 7)) {
      for (const c of classesSorted().filter(x => !x.noOral && !weekSkipped(x, ws) && studentsOf(x.id).length)) {
        const ls = lessonsBetween(c.id, ws, addDaysISO(ws, 4)).filter(l => !l.cancelled && !l.away && l.date <= t);
        if (!ls.length) continue;
        const has = new Set(entriesOf(c.id, ws, addDaysISO(ws, 6)).map(e => e.studentId));
        const sts = studentsOf(c.id), miss = sts.filter(st => !has.has(st.id)).length;
        if (miss) rows.push({ ws, c, miss, total: sts.length });
      }
    }
    return rows.reverse();
  }
  function viewFehlend() {
    const rows = missingOverview();
    let html = pageHead('Fehlende mündliche Noten', 'aktuelles Halbjahr · Kurse mit Unterricht in der Woche');
    if (!rows.length) return html + `<p class="empty-line">${icon('check')} Für alle Wochen mit Unterricht sind mündliche Noten eingetragen.</p>`;
    const byW = groupBy(rows, r => r.ws);
    html += `<p class="muted small">Zeile antippen = Noten eintragen. Haken setzen = für diese Woche keine mündlichen Noten (unten bestätigen).</p>`;
    html += [...byW.entries()].map(([ws, rs]) => `<section class="section"><div class="section-head"><h2>KW ${isoWeek(parseISO(ws))}</h2><span class="muted small">${fmtISO(ws)}–${fmtISO(addDaysISO(ws, 4), true)}</span></div>
      <div class="mini-list">${rs.map(r => `<div class="fehl-row" ${ccStyle(r.c)}><label class="fehl-check" aria-label="Keine Noten für ${esc(clsLabel(r.c))}, KW ${isoWeek(parseISO(ws))}"><input type="checkbox" data-change="fehlPick" data-key="${r.c.id}|${ws}" ${(S.fehlPick || []).includes(r.c.id + '|' + ws) ? 'checked' : ''}></label>
        <button type="button" class="mini-row" data-action="openNotenWeek" data-cid="${r.c.id}" data-ws="${ws}" ${ccStyle(r.c)}><span class="dot"></span><span class="mini-text"><strong>${esc(clsLabel(r.c))}</strong> – ${r.miss} von ${r.total} fehlen</span>${icon('right')}</button></div>`).join('')}</div></section>`).join('');
    const n = (S.fehlPick || []).length;
    html += `<div class="fehl-bar ${n ? 'on' : ''}"><button type="button" class="btn primary" data-action="fehlSkip" ${n ? '' : 'disabled'}>${n ? `${plural(n, 'Kurswoche', 'Kurswochen')}: keine Noten eintragen …` : 'Haken setzen, um Wochen auszunehmen'}</button></div>`;
    return html + '<p class="muted small">Kurse ohne mündliche Noten und Wochen, in denen der Kurs nicht stattgefunden hat, zählen nicht mit.</p>';
  }

  /* ---------- Diese Woche ---------- */
  function planGrid(w0iso) {
    const w0 = parseISO(w0iso);
    const cs = classesSorted();
    const P = periods();
    const maxP = Math.min(P.length, Math.max(6, ...cs.flatMap(c => (c.slots || []).map(s => s.to))));
    const t = todayISO();
    const days = [0, 1, 2, 3, 4].map(i => toISO(addDays(w0, i)));
    let cells = `<div class="pg-corner"></div>`;
    days.forEach((d, i) => {
      // Termine des Tages direkt im Spaltenkopf (eigene Termine und Prüfungen; Ausfälle stehen an der Stunde)
      const tev = eventsOn(d).filter(e => e.type === 'termin' || e.type === 'pruefung');
      const cal = calItemsOn(d);
      cells += `<div class="pg-day ${d === t ? 'today' : ''}" style="grid-column:${i + 2}"><strong>${WD[i]}</strong><span>${parseISO(d).getDate()}.</span>${tev.map(e => `<button type="button" class="pg-ev ${e.type}" data-action="editEvent" data-eid="${e.id}" title="${esc(evTitle(e))}">${esc(evTitle(e))}</button>`).join('')}${cal.length ? `<button type="button" class="pg-ev cal" data-action="dayGo" data-date="${d}" title="${esc(cal.map(x => x.titel).join(', '))}">+${cal.length} Kalender</button>` : ''}</div>`;
    });
    for (let p = 1; p <= maxP; p++) {
      cells += `<div class="pg-period" style="grid-row:${p + 1}"><strong>${p}</strong><span>${esc(P[p - 1]?.start || '')}</span></div>`;
      for (let i = 0; i < 5; i++) cells += `<div class="pg-cell ${days[i] === t ? 'today' : ''}" style="grid-row:${p + 1};grid-column:${i + 2}"></div>`;
    }
    days.forEach((d, i) => {
      const free = freeReason(d);
      if (free) { cells += `<div class="pg-free" style="grid-column:${i + 2};grid-row:2 / ${maxP + 2}"><span>${esc(free)}</span></div>`; return; }
      for (const l of lessonsOn(d).filter(x => !x.away)) {
        const exam = eventsOn(d).some(e => e.type === 'pruefung' && e.classId === l.cls.id);
        cells += `<button type="button" class="pg-lesson ${l.cancelled ? 'cancelled' : ''} ${lessonRunning(l) && !l.cancelled ? 'running' : ''}"
          style="--cc:${esc(clsColor(l.cls))};grid-column:${i + 2};grid-row:${l.from + 1} / ${Math.min(l.to, maxP) + 2}"
          data-action="lessonSheet" data-cid="${l.cls.id}" data-date="${d}" data-from="${l.from}" title="${esc(clsLabel(l.cls))}${l.cancelled ? ' – fällt aus: ' + esc(l.cancelled) : ''}">
          <strong>${esc(l.cls.name)}</strong><span class="pg-subj">${esc(l.cls.subject || '')}</span>${l.room ? `<span class="pg-room">${esc(l.room)}</span>` : ''}
          ${exam ? `<span class="pg-flag">${icon('exam')}</span>` : l.swapIn ? `<span class="pg-flag swap" title="Tausch: statt ${esc(swapName(l.swapFrom, l.cls))}">${icon('swap')}</span>` : ''}${l.cancelled ? `<span class="pg-x">entfällt${l.cancelled !== 'Ausfall' ? ': ' + esc(l.cancelled) : ''}</span>` : ''}
        </button>`;
      }
    });
    return `<div class="plan-wrap"><div class="plan-grid" style="grid-template-rows:auto repeat(${maxP}, minmax(46px, auto))">${cells}</div></div>`;
  }
  function weekAgenda(w0iso) {
    const t = todayISO();
    return `<div class="agenda">${[0, 1, 2, 3, 4].map(i => {
      const d = addDaysISO(w0iso, i);
      const free = freeReason(d);
      const ls = lessonsOn(d).filter(l => !l.away);
      const evs = eventsOn(d).filter(e => (e.type !== 'ausfall' || !e.classId) && e.type !== 'tausch');
      return `<div class="ag-day ${d === t ? 'today' : ''}">
        <button type="button" class="ag-head" data-action="dayGo" data-date="${d}"><b>${WD_LONG[i]}</b><span>${fmtISO(d)}</span>${d === t ? '<span class="pill now" style="--cc:var(--accent)">heute</span>' : ''}</button>
        ${free ? `<div class="ag-free">${icon('sun')} ${esc(free)}</div>` : ''}
        ${evs.map(e => `<button type="button" class="ag-row ev" data-action="editEvent" data-eid="${e.id}">${picto(e.type, 'sm')}<span><b>${esc(evTitle(e))}</b> ${e.classId ? esc(clsLabel(S.data.classes[e.classId])) : ''}${e.note ? ` – ${esc(e.note)}` : ''}</span></button>`).join('')}
        ${ls.map(l => `<button type="button" class="ag-row ${l.cancelled ? 'cancelled' : ''}" ${ccStyle(l.cls)} data-action="lessonSheet" data-cid="${l.cls.id}" data-date="${d}" data-from="${l.from}">
          <span class="ag-time">${esc(l.start)}</span><span class="ag-bar"></span>
          <span class="ag-txt"><b>${esc(l.cls.name)}</b> ${esc(l.cls.subject || '')} <small>${pLabel(l.from, l.to)}${l.room ? ' · ' + esc(l.room) : ''}</small></span>
          ${l.cancelled ? `<span class="ag-tag x">${icon('ban')}entfällt</span>` : eventsOn(d).some(e => e.type === 'pruefung' && e.classId === l.cls.id) ? `<span class="ag-tag e">${icon('exam')}Prüfung</span>` : l.swapIn ? `<span class="ag-tag s">${icon('swap')}statt ${esc(swapName(l.swapFrom, l.cls))}</span>` : ''}
        </button>`).join('')}
        ${!free && !ls.length && !evs.length ? '<div class="ag-free muted">kein Unterricht</div>' : ''}
      </div>`;
    }).join('')}</div>`;
  }
  function viewWoche() {
    const ws = S.planWeek;
    const w0 = parseISO(ws);
    const t = todayISO();
    const isThisWeek = ws === toISO(mondayOf(new Date()));
    const nav = `<div class="day-nav">
        <button type="button" class="btn small week-arrow" data-action="planPrev" aria-label="Vorherige Woche">${icon('left')} Woche</button>
        ${isThisWeek ? '' : '<button type="button" class="btn small" data-action="planToday">Heute</button>'}
        <button type="button" class="btn small week-arrow" data-action="planNext" aria-label="Nächste Woche">Nächste ${icon('right')}</button>
      </div>`;
    let html = pageHead(isThisWeek ? 'Diese Woche' : `KW ${isoWeek(w0)}`, `KW ${isoWeek(w0)} · ${fmtDate(w0)}–${fmtDate(addDays(w0, 4), true)}`, nav);
    const cs = classesSorted();
    if (!cs.length) return html + noCourses();
    const we = addDaysISO(ws, 6);
    const lsAll = cs.flatMap(c => lessonsBetween(c.id, ws, addDaysISO(ws, 4))).filter(l => !l.away);
    const wEvents = live(S.data.events).filter(e => e.date >= ws && e.date <= we).sort((a, b) => a.date.localeCompare(b.date));
    const ausH = sum(lsAll.filter(l => l.cancelled).map(l => l.hours)), nEx = wEvents.filter(e => e.type === 'pruefung').length;
    const nTodo = openTodos().filter(x => { const due = todoDue(x); return due && due <= addDaysISO(ws, 6) && (due >= ws || isThisWeek); }).length;
    html += glance([
      { value: String(sum(lsAll.filter(l => !l.cancelled).map(l => l.hours))), label: 'Stunden', tone: 'less' },
      { value: String(nEx), label: nEx === 1 ? 'Prüfung' : 'Prüfungen', tone: nEx ? 'exam' : 'exam zero' },
      { value: String(nTodo), label: 'To-dos', tone: nTodo ? 'tdo' : 'tdo zero', action: 'goto', data: 'data-view="todos"' },
      { value: String(ausH), label: 'fallen aus', tone: ausH ? 'aus' : 'aus zero' }
    ], true);
    html += `<div class="seg week-seg"><button type="button" data-action="weekMode" data-m="grid" class="${S.weekMode !== 'list' ? 'on' : ''}">${icon('week')}<span>Stundenplan</span></button><button type="button" data-action="weekMode" data-m="list" class="${S.weekMode === 'list' ? 'on' : ''}">${icon('list')}<span>Tagesliste</span></button></div>`;
    html += S.weekMode === 'list' ? weekAgenda(ws) : planGrid(ws);
    // Countdown bis zur nächsten Prüfung je Kurs
    const rows = cs.map(c => ({ c, e: nextExamOf(c.id, addDaysISO(t, -1)) })).filter(x => x.e);
    html += `<section class="section"><div class="section-head"><h2>${picto('pruefung', 'sm')} Stunden bis zur Prüfung</h2></div>
      ${rows.length ? `<div class="count-list">${rows.map(({ c, e }) => { const inf = examInfo(e); return `<button type="button" class="count-row" ${ccStyle(c)} data-action="editEvent" data-eid="${e.id}">
        <span class="cr-name"><b>${esc(c.name)}</b> ${esc(c.subject || '')}</span>
        <span class="cr-what">${esc(e.kind || 'Prüfung')} · ${fmtShort(e.date)}</span>
        <span class="cr-num"><b>${inf.lessons ?? 0}</b><small>Std.</small></span>
        <span class="cr-days">${relDays(inf.days)}</span></button>`; }).join('')}</div>
        <p class="foot-note">Ab jetzt bis vor den Prüfungstag, ohne Ausfälle, Ferien und Feiertage.</p>` : '<p class="empty-line">Keine Prüfungen eingetragen.</p>'}</section>`;
    const wTodos = openTodos().filter(x => { const due = todoDue(x); return due && due <= addDaysISO(ws, 6) && (due >= ws || isThisWeek); }).sort(todoSort);
    html += `<section class="section"><div class="section-head"><h2>${picto('todo', 'sm')} To-dos</h2><span class="head-links"><button type="button" class="link" data-action="newTodo" data-date="${ws <= t && t <= we ? t : ws}">${icon('plus')} To-do</button><button type="button" class="link" data-action="goto" data-view="todos">Alle ${icon('right')}</button></span></div>
      ${todoList(wTodos, {}, 'Diese Woche ist nichts zu erledigen.')}</section>`;
    html += `<section class="section"><div class="section-head"><h2>${picto('termin', 'sm')} Termine &amp; Ausfälle</h2><button type="button" class="link" data-action="newEvent" data-date="${ws <= t && t <= we ? t : ws}">${icon('plus')} Neu</button></div>
      ${wEvents.length ? `<div class="ev-list">${wEvents.map(e => eventRow(e, { showCountdown: true })).join('')}</div>` : '<p class="empty-line">In dieser Woche ist nichts eingetragen.</p>'}</section>`;
    const withKids = cs.filter(c => studentsOf(c.id).length);
    if (withKids.length) {
      html += `<section class="section"><div class="section-head"><h2>${picto('noten', 'sm')} Mündliche Noten</h2></div><div class="glist">
        ${withKids.map(c => {
          const st = studentsOf(c.id);
          const has = new Set(entriesOf(c.id, ws, we).map(e => e.studentId));
          const done = st.filter(s => has.has(s.id)).length;
          return `<button type="button" class="prow ${done === st.length ? 'full' : ''}" ${ccStyle(c)} data-action="openNoten" data-cid="${c.id}" data-date="${ws <= t && t <= we ? t : addDaysISO(ws, 4)}">
            <span class="pr-name"><b>${esc(c.name)}</b> ${esc(c.subject || '')}</span>
            <span class="pr-bar"><i style="width:${Math.round(done / st.length * 100)}%"></i></span>
            <span class="pr-num">${done === st.length ? icon('check') : ''}${done}/${st.length}</span></button>`;
        }).join('')}</div></section>`;
    }
    return html;
  }

  /* ---------- Termine & Ausfälle ---------- */
  const TFILTERS = [['alle', 'Alle', 'termin'], ['pruefung', 'Prüfungen', 'pruefung'], ['ausfall', 'Ausfälle', 'ausfall'], ['tausch', 'Tausch', 'tausch'], ['termin', 'Termine', 'termin'], ['frei', 'Ferien & Feiertage', 'ferien'], ['kal-schule', 'Schulkalender', 'termin'], ['kal-privat', 'Privat', 'termin']];
  function viewTermine() {
    const t = todayISO(), tc = termCfg();
    const f = S.tFilter || 'alle';
    let html = pageHead('Termine', 'Prüfungen, Ausfälle, Termine, Ferien', `<button type="button" class="btn primary small" data-action="newEvent">${icon('plus')} Neu</button>`);
    const hasSwap = live(S.data.events).some(e => e.type === 'tausch') || classesSorted().length > 1;
    html += `<div class="chipbar">${TFILTERS.filter(x => x[0] !== 'tausch' || hasSwap).map(([k, l, p]) => `<button type="button" class="fchip ${f === k ? 'on' : ''}" data-action="tFilter" data-f="${k}">${k === 'alle' ? '' : picto(p, 'xs')}${l}</button>`).join('')}
      <label class="fchip toggle"><input type="checkbox" data-change="tPast" ${S.tPast ? 'checked' : ''}> vergangene</label></div>`;
    const from = S.tPast ? tc.start : t;
    let items = [];
    if (f === 'kal-schule' || f === 'kal-privat') {
      const art = f === 'kal-privat' ? 'privat' : 'schule';
      for (let d = from; d <= addDaysISO(t, 120); d = addDaysISO(d, 1)) for (const x of calItemsOn(d, { alle: !!S.tPast })) if (x.art === art && x.start.slice(0, 10) === d) items.push({ date: d, html: calRow(x, d) });
      if (!live(S.data.calendars).length) html += '<p class="muted small pad">Noch keine Kalender – sie kommen automatisch vom PC (Klausurmanager).</p>';
    } else if (f !== 'frei') items = live(S.data.events).filter(e => (f === 'alle' || e.type === f) && e.date >= from).map(e => ({ date: e.date, html: eventRow(e, { showCountdown: true }) }));
    if (f === 'alle' || f === 'frei') {
      for (const h of live(S.data.holidays)) if (h.to >= from) items.push({ date: h.from, html: `<div class="ev-row static">${picto('ferien')}<span class="ev-date"><b>${WD[wdOf(h.from)]}</b>${fmtISO(h.from)}</span><span class="ev-main"><strong>${esc(h.name)}</strong><small>${fmtISO(h.from, true)}${h.to !== h.from ? ' – ' + fmtISO(h.to, true) : ''} · ${plural(diffDays(h.from, h.to) + 1, 'Tag', 'Tage')}</small></span></div>` });
      for (const y of [tc.sy, tc.sy + 1]) for (const [iso, name] of feiertage(y)) if (iso >= from && iso <= tc.end && iso >= tc.start) items.push({ date: iso, html: `<div class="ev-row static">${picto('feiertag')}<span class="ev-date"><b>${WD[wdOf(iso)]}</b>${fmtISO(iso)}</span><span class="ev-main"><strong>${esc(name)}</strong><small>gesetzlicher Feiertag NRW${wdOf(iso) >= 5 ? ' (Wochenende)' : ''}</small></span></div>` });
    }
    items.sort((a, b) => a.date.localeCompare(b.date));
    if (!items.length) html += emptyState('Nichts eingetragen', 'Importiere die Ganzjahresplanung oder trage Termine von Hand ein.', '', 'cal');
    else {
      const byMonth = groupBy(items, x => x.date.slice(0, 7));
      html += [...byMonth.entries()].map(([m, xs]) => { const d = parseISO(m + '-01'); return `<section class="month"><h3 class="month-h">${MONTHS[d.getMonth()]} ${d.getFullYear()}</h3><div class="ev-list">${xs.map(x => x.html).join('')}</div></section>`; }).join('');
    }
    html += `<section class="panel import-panel"><h2>${icon('sheet')} Aus der Ganzjahresplanung aktualisieren</h2>
      <p class="muted small">Excel-Datei erneut wählen: neue oder geänderte Prüfungen, Ausfälle und Ferien werden übernommen, bereits vorhandene aktualisiert statt doppelt angelegt.</p>
      <label class="btn file-btn">${icon('upload')} Excel-Datei wählen<input type="file" accept=".xlsx" data-change="importXlsx"></label></section>`;
    return html;
  }

  /* ---------- Ganzjahresplanung ---------- */
  function rangeStats(cid, from, to) {
    const ls = lessonsBetween(cid, from, to).filter(l => !l.away);
    const soll = sum(ls.map(l => l.hours)), aus = sum(ls.filter(l => l.cancelled).map(l => l.hours));
    const geh = sum(ls.filter(l => !l.cancelled && lessonStarted(l)).map(l => l.hours));
    return { ls, soll, aus, geh, rest: soll - aus - geh, termine: ls.length };
  }
  function jahrRange() {
    const tc = termCfg(), t = todayISO();
    const k = S.jRange || 'block';
    if (k === 'hj') return t <= tc.hj1End ? [tc.start, tc.hj1End, '1. Halbjahr'] : [addDaysISO(tc.hj1End, 1), tc.end, '2. Halbjahr'];
    if (k === 'sj') return [S.data.settings.planStart && S.data.settings.planStart > tc.start ? S.data.settings.planStart : tc.start, tc.end, `Schuljahr ${tc.sy}/${String(tc.sy + 1).slice(2)}`];
    const b = currentBlock();
    return [b.from, b.to, b.next ? `bis ${b.next.name}` : 'aktueller Abschnitt'];
  }
  function yearCalendar() {
    const tc = termCfg(), t = todayISO();
    const evs = groupBy(live(S.data.events), e => e.date);
    const nav = monthNav('jMonth', schoolMonths());
    const months = [nav.m];
    return nav.html + `<div class="ycal one">${months.map(m => {
      const first = new Date(m.getFullYear(), m.getMonth(), 1);
      const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
      const lead = (first.getDay() + 6) % 7;
      let cells = WD.map(w => `<i class="yc-wd">${w[0]}</i>`).join('') + '<i></i>'.repeat(lead);
      for (let i = 1; i <= days; i++) {
        const iso = toISO(new Date(m.getFullYear(), m.getMonth(), i));
        const fei = feiertage(m.getFullYear()).get(iso), hol = holidayOn(iso), we = wdOf(iso) >= 5;
        const es = evs.get(iso) || [];
        const ex = es.filter(e => e.type === 'pruefung'), au = es.some(e => e.type === 'ausfall'), te = es.some(e => e.type === 'termin' || e.type === 'tausch');
        const cls = [we ? 'we' : '', hol ? 'fer' : '', fei ? 'fei' : '', iso === t ? 'today' : '', ex.length ? 'has-ex' : '', iso < t ? 'past' : ''].join(' ');
        const tip = [fei, hol?.name, ...es.map(e => `${evTitle(e)}${e.classId ? ' ' + clsLabel(S.data.classes[e.classId]) : ''}`)].filter(Boolean).join(' · ');
        cells += `<button type="button" class="yc-d ${cls}" data-action="dayInfo" data-date="${iso}" title="${esc(fmtISO(iso, true) + (tip ? ' – ' + tip : ''))}">${i}${ex.length ? `<em style="--cc:${esc(clsColor(S.data.classes[ex[0].classId]))}"></em>` : ''}${au ? '<u></u>' : ''}${te ? '<s></s>' : ''}</button>`;
      }
      return `<div class="yc-month"><h4>${MONTHS[m.getMonth()]} <small>${m.getFullYear()}</small></h4><div class="yc-grid">${cells}</div></div>`;
    }).join('')}</div>
    <div class="yc-legend"><span><i class="lg-fer"></i>Ferien</span><span><i class="lg-fei"></i>Feiertag</span><span><i class="lg-ex"></i>Prüfung</span><span><i class="lg-au"></i>Ausfall</span><span><i class="lg-te"></i>Termin</span><span><i class="lg-today"></i>heute</span></div>`;
  }
  // Klassenarbeiten/Klausuren pro Halbjahr: 5/6 je 3, 7: 3 + 2, 8–10 je 2, Oberstufe je 2 (je Kurs überschreibbar)
  function examsRequired(c, hj) {
    if (c.examsPerHj) return c.examsPerHj;
    if (isSII(c)) return 2;
    const m = String(c.name || '').match(/\d+/);
    const g = m ? +m[0] : 0;
    if (g === 5 || g === 6) return 3;
    if (g === 7) return hj === 'HJ1' ? 3 : 2;
    return 2;
  }
  function examsLeft(c) { // bis zum Halbjahresende: geschrieben / geplant / noch offen
    const tc = termCfg(), t = todayISO();
    const hj = t <= tc.hj1End ? 'HJ1' : 'HJ2';
    const from = hj === 'HJ1' ? tc.start : addDaysISO(tc.hj1End, 1), to = hj === 'HJ1' ? tc.hj1End : tc.end;
    const done = assessmentsOf(c.id, 'schriftlich', from, to);
    const evs = live(S.data.events).filter(e => e.type === 'pruefung' && e.classId === c.id && e.date >= from && e.date <= to && !/vokabel/i.test(e.kind || ''));
    const written = done.length + evs.filter(e => e.date <= t && !done.some(a => Math.abs(diffDays(a.date, e.date)) <= 7)).length;
    const planned = evs.filter(e => e.date > t).length;
    const need = examsRequired(c, hj);
    return { need, written, planned, open: Math.max(0, need - written), unplanned: Math.max(0, need - written - planned), hj };
  }
  function monthNav(key, months) { // ‹ Monat › – blättert durch die Monate des Schuljahres
    const cur = Math.min(months.length - 1, Math.max(0, S[key] ?? months.findIndex(m => toISO(m).slice(0, 7) === todayISO().slice(0, 7))));
    S[key] = cur < 0 ? 0 : cur;
    const m = months[S[key]];
    return { m, html: `<div class="month-nav"><button type="button" class="icon-btn" data-action="monthStep" data-k="${key}" data-d="-1" ${S[key] === 0 ? 'disabled' : ''} aria-label="Vorheriger Monat">${icon('left')}</button>
      <strong>${MONTHS[m.getMonth()]} ${m.getFullYear()}</strong>
      <button type="button" class="icon-btn" data-action="monthStep" data-k="${key}" data-d="1" ${S[key] === months.length - 1 ? 'disabled' : ''} aria-label="Nächster Monat">${icon('right')}</button></div>` };
  }
  function schoolMonths() {
    const tc = termCfg(), out = [];
    for (let d = parseISO(tc.start); toISO(d) <= tc.end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) out.push(new Date(d));
    return out;
  }
  function viewJahr() {
    const tc = termCfg();
    let html = pageHead('Ganzjahresplanung', `Schuljahr ${tc.sy}/${String(tc.sy + 1).slice(2)}`,
      `<label class="btn small file-btn">${icon('upload')} Excel<input type="file" accept=".xlsx" data-change="importXlsx"></label>`);
    const cs = classesSorted();
    if (!cs.length) return html + noCourses();
    const [from, to, label] = jahrRange();
    const k = S.jRange || 'block';
    html += `<div class="chipbar">${[['block', 'Bis zu den nächsten Ferien'], ['hj', 'Halbjahr'], ['sj', 'Schuljahr']].map(([kk, l]) => `<button type="button" class="fchip ${k === kk ? 'on' : ''}" data-action="jRange" data-r="${kk}">${l}</button>`).join('')}</div>`;
    const rows = cs.map(c => ({ c, s: rangeStats(c.id, from, to) }));
    const tot = { soll: sum(rows.map(r => r.s.soll)), aus: sum(rows.map(r => r.s.aus)), geh: sum(rows.map(r => r.s.geh)), rest: sum(rows.map(r => r.s.rest)), termine: sum(rows.map(r => r.s.termine)), wh: sum(cs.map(weeklyHours)) };
    const bar = s => { const p = x => s.soll ? (x / s.soll * 100).toFixed(1) : 0; return `<div class="stack-bar thin"><i class="ok" style="width:${p(s.geh)}%"></i><i class="warn" style="width:${p(s.aus)}%"></i><i class="rest" style="width:${p(s.rest)}%"></i></div>`; };
    html += `<section class="section"><div class="section-head"><h2>${picto('lesson', 'sm')} Stundenbilanz · ${esc(label)}</h2><span class="muted small">${fmtISO(from)}–${fmtISO(to, true)}</span></div>
      <div class="table-wrap"><table class="ov jt"><thead><tr><th>Kurs</th><th class="num">verbleibend</th><th class="num" title="Klassenarbeiten/Klausuren bis zum Halbjahresende">Arbeiten offen</th><th class="num">gehalten</th><th class="num">ausgefallen</th><th class="num">laut Plan</th><th class="num">Std./Wo.</th></tr></thead>
      <tbody>${rows.map(({ c, s }) => { const ex = examsLeft(c); return `<tr data-action="jCourse" data-cid="${c.id}" tabindex="0" ${ccStyle(c)}><td><span class="cls-chip" ${ccStyle(c)}><i></i>${esc(c.name)} ${esc(c.subject || '')}</span>${bar(s)}</td><td class="num"><b>${s.rest}</b></td><td class="num" title="${ex.written} von ${ex.need} geschrieben, ${ex.planned} geplant">${ex.open ? `<b>${ex.open}</b>${ex.unplanned ? ` <small class="warn-t">(${ex.unplanned} ohne Termin)</small>` : ''}` : '<span class="ok-t">✓</span>'}</td><td class="num ok-t">${s.geh}</td><td class="num warn-t">${s.aus || ''}</td><td class="num">${s.soll}</td><td class="num">${weeklyHours(c)}</td></tr>`; }).join('')}</tbody>
      <tfoot><tr><td>Gesamt</td><td class="num">${tot.rest}</td><td class="num">${sum(cs.map(c => examsLeft(c).open))}</td><td class="num">${tot.geh}</td><td class="num">${tot.aus}</td><td class="num">${tot.soll}</td><td class="num">${tot.wh}</td></tr></tfoot></table></div>
      <p class="muted small">„Arbeiten offen“: noch zu schreiben bis Ende des ${termCfg().hj1End >= todayISO() ? '1.' : '2.'} Halbjahres (5/6: 3, Kl. 7: 3 bzw. 2, 8–10 und Oberstufe: 2 pro Halbjahr; je Kurs änderbar).</p>
      <div class="yc-legend"><span><i class="lg-ok"></i>gehalten</span><span><i class="lg-au2"></i>ausgefallen</span><span><i class="lg-rest"></i>verbleibend</span></div></section>`;
    html += `<section class="section"><div class="section-head"><h2>${picto('termin', 'sm')} Kalender</h2><span class="muted small">Tag antippen für Details</span></div>${yearCalendar()}</section>`;
    return html;
  }
  async function dayInfo(iso) {
    const ls = lessonsOn(iso), evs = eventsOn(iso), free = freeReason(iso);
    const r = await openModal({
      title: fmtLong(iso) + ' ' + parseISO(iso).getFullYear(),
      body: `${free ? `<div class="ag-free">${icon('sun')} ${esc(free)}</div>` : ''}
        ${evs.length ? `<div class="ev-list">${evs.map(e => `<div class="ev-row static">${picto(e.type)}<span class="ev-main"><strong>${esc(evTitle(e))}</strong>${clsChip(e.classId ? S.data.classes[e.classId] : null)}${e.note ? `<small>${esc(e.note)}</small>` : ''}</span></div>`).join('')}</div>` : ''}
        ${ls.length ? `<div class="agenda"><div class="ag-day">${ls.filter(l => !l.away).map(l => `<div class="ag-row ${l.cancelled ? 'cancelled' : ''}" ${ccStyle(l.cls)}><span class="ag-time">${esc(l.start)}</span><span class="ag-bar"></span><span class="ag-txt"><b>${esc(l.cls.name)}</b> ${esc(l.cls.subject || '')} <small>${pLabel(l.from, l.to)}</small></span>${l.cancelled ? `<span class="ag-tag x">${icon('ban')}entfällt</span>` : ''}</div>`).join('')}</div></div>` : (!free ? '<p class="muted">Kein Unterricht.</p>' : '')}`,
      actions: [{ label: 'Termin eintragen', value: 'new' }, { label: 'Tag öffnen', cls: 'primary', value: 'go' }]
    });
    if (r === 'new') editEvent(null, { date: iso, type: 'termin' });
    if (r === 'go') { S.view = 'heute'; S.heuteDate = iso; render(); window.scrollTo(0, 0); }
  }

  /* ---------- Noten ---------- */
  function viewNoten() {
    const tabs = [['erfassen', 'Mündlich'], ['leistungen', 'Arbeiten/Klausuren'], ['uebersicht', 'Übersicht'], ['zeugnis', 'Zeugnis']];
    const seg = `<div class="seg full noten-seg">${tabs.map(([k, l]) => `<button type="button" data-action="notenTab" data-tab="${k}" class="${S.notenTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    const body = S.notenTab === 'uebersicht' ? viewUebersicht() : S.notenTab === 'leistungen' ? viewLeistungen() : S.notenTab === 'zeugnis' ? viewZeugnis() : viewErfassen();
    return pageHead('Noten') + seg + body;
  }
  function weekRange() { return [S.weekStart, addDaysISO(S.weekStart, 6)]; }
  // Mündliche Noten: Standard eine Note pro Kind und Woche; je Kurs auf Einzelstunden umschaltbar
  const weeklyMode = c => !!c && c.gradeMode !== 'stunde';
  function weekGradeDay(cid) { // Datum der Wochennote: letzter Unterrichtstag der Woche, sonst Freitag
    const ds = lessonsBetween(cid, S.weekStart, addDaysISO(S.weekStart, 4)).filter(l => !l.cancelled && !l.away).map(l => l.date).sort();
    return ds.length ? ds[ds.length - 1] : addDaysISO(S.weekStart, 4);
  }
  function currentDay(sid, cid) {
    const c = S.data.classes[cid || (sid && S.data.students[sid]?.classId) || S.classId];
    if (weeklyMode(c)) {
      if (sid) { const ex = entriesOf(c.id, ...weekRange()).filter(e => e.studentId === sid).sort(byDate).pop(); if (ex) return ex.date; }
      return weekGradeDay(c.id);
    }
    const days = [0, 1, 2, 3, 4].map(i => addDaysISO(S.weekStart, i));
    if (S.day && days.includes(S.day)) return S.day;
    const today = todayISO();
    if (days.includes(today)) return today;
    if (today < days[0]) return days[0];
    return days[4];
  }
  function viewErfassen() {
    const cls = ensureClass();
    if (!cls) return emptyState('Noch kein Kurs angelegt', 'Lege zuerst einen Kurs mit den Namen der Kinder an.', `<button type="button" class="btn primary" data-action="newClass">${icon('plus')} Kurs anlegen</button>`);
    const students = studentsOf(cls.id);
    const [from, to] = weekRange();
    const ws = parseISO(S.weekStart);
    const wEnts = entriesOf(cls.id, from, to).sort(byDate);
    const byS = groupBy(wEnts, 'studentId');
    const done = students.filter(s => byS.has(s.id)).length;
    const day = currentDay();
    const isThisWeek = S.weekStart === toISO(mondayOf(new Date()));
    const lessonDays = new Set(lessonsBetween(cls.id, from, to).filter(l => !l.cancelled).map(l => l.date));
    const head = `<div class="toolbar">
        ${classSelect()}
        <div class="seg">
          <button type="button" data-action="setMode" data-mode="liste" class="${S.mode !== 'karte' ? 'on' : ''}">${icon('list')}<span>Liste</span></button>
          <button type="button" data-action="setMode" data-mode="karte" class="${S.mode === 'karte' ? 'on' : ''}">${icon('cards')}<span>Karten</span></button>
        </div>
      </div>
      <div class="weeknav">
        <button type="button" class="icon-btn" data-action="weekPrev" aria-label="Vorherige Woche">${icon('left')}</button>
        <div class="weeklabel"><strong>KW ${isoWeek(ws)}</strong><span>${fmtDate(ws)}–${fmtDate(addDays(ws, 6), true)}${isThisWeek ? ' · diese Woche' : ''}</span></div>
        ${isThisWeek ? '' : '<button type="button" class="btn small" data-action="weekToday">Heute</button>'}
        <button type="button" class="icon-btn" data-action="weekNext" aria-label="Nächste Woche">${icon('right')}</button>
      </div>
      ${weeklyMode(cls) ? `<p class="muted small week-mode-info">Eine Note pro Kind für KW ${isoWeek(ws)} – erneutes Antippen ersetzt sie. Einzelstunden: Kurs → Zahnrad → „Mündliche Noten“.</p>` : `<div class="days" role="group" aria-label="Datum für neue Einträge">
        ${[0, 1, 2, 3, 4].map(i => { const d = addDays(ws, i); const iso = toISO(d); return `<button type="button" data-action="setDay" data-day="${iso}" class="${iso === day ? 'on' : ''} ${lessonDays.has(iso) ? 'has-lesson' : ''}" ${ccStyle(cls)} title="${lessonDays.has(iso) ? 'Unterricht an diesem Tag' : ''}">${WD[i]} <small>${d.getDate()}.</small></button>`; }).join('')}
      </div>`}
      <div class="progress-line">
        <div class="bar" ${ccStyle(cls)}><div style="width:${students.length ? Math.round(done / students.length * 100) : 0}%"></div></div>
        <span>${done}/${students.length} mit Eintrag</span>
        <button type="button" class="chip-toggle ${S.onlyMissing ? 'on' : ''}" data-action="toggleMissing">nur ohne Eintrag</button>
        <button type="button" class="chip-toggle" data-action="notHeld">${weeklyMode(cls) ? 'Woche' : 'Tag'} hat nicht stattgefunden</button>
      </div>`;
    if (students.length && !weekHasLessons(cls.id, from)) {
      const prev = lessonWeek(cls.id, from, -1);
      return head.replace(/<div class="progress-line">[\s\S]*?<\/div>\s*$/, '') + `<div class="free-card">${icon('sun')}<div><strong>${esc(freeReason(addDaysISO(from, 2)) || 'Kein Unterricht in dieser Woche')}</strong><span>In dieser Woche sind keine mündlichen Noten nötig.</span></div>
        <button type="button" class="btn small" data-action="weekGo" data-ws="${prev}">Zur KW ${isoWeek(parseISO(prev))}</button></div>`;
    }
    if (!students.length) return head + emptyState('Keine Kinder in diesem Kurs', '', `<button type="button" class="btn primary" data-action="openCourse" data-cid="${cls.id}" data-tab="schueler">Kinder hinzufügen</button>`, 'users');
    return head + (S.mode === 'karte' ? cardView(students, byS) : listView(students, byS));
  }
  function chip(e) {
    const d = parseISO(e.date);
    const wd = WD[(d.getDay() + 6) % 7];
    const label = e.kind === 'note' ? e.grade : e.kind === 'fehlte' ? 'f' : '–';
    const cls = e.kind === 'note' ? 'g' + e.grade : e.kind;
    const title = `${labelEntry(e)} · ${wd} ${fmtDate(d)}${e.note ? ' · ' + e.note : ''}`;
    return `<button type="button" class="chip ${cls}${e.note ? ' has-note' : ''}" data-action="editEntry" data-eid="${e.id}" title="${esc(title)}" aria-label="${esc(title)} – bearbeiten">${label}<small>${wd}</small></button>`;
  }
  function listView(students, byS) {
    const list = S.onlyMissing ? students.filter(s => !byS.has(s.id)) : students;
    if (!list.length) return `<div class="done-msg">${icon('check')} Alle Kinder haben diese Woche einen Eintrag.</div>`;
    return `<div class="list">${list.map(s => {
      const es = byS.get(s.id) || [];
      const g = es.filter(e => e.kind === 'note');
      const avg = g.length > 1 ? mean(g.map(e => e.grade)) : null;
      const cur = es.find(e => e.date === currentDay(s.id));
      return `<div class="row ${cur ? 'has-today' : ''}" id="st-${s.id}">
        <div class="row-head">
          <span class="name">${esc(s.name)}</span>
          <span class="chips">${es.map(chip).join('')}</span>
          ${avg != null ? `<span class="wavg">Ø ${fmtNum(avg, 1)}</span>` : ''}
        </div>
        <div class="gbtns">${GRADES.map(n => `<button type="button" class="gbtn g${n} ${cur && cur.kind === 'note' && cur.grade === n ? 'cur' : ''}" data-action="addGrade" data-sid="${s.id}" data-g="${n}" aria-label="Note ${n} für ${esc(s.name)}">${n}</button>`).join('')}<button type="button" class="gbtn more" data-action="more" data-sid="${s.id}" aria-label="Weitere Optionen für ${esc(s.name)}">…</button></div>
      </div>`;
    }).join('')}</div>`;
  }
  function cardList() {
    const cls = ensureClass(); if (!cls) return [];
    const students = studentsOf(cls.id);
    if (!S.onlyMissing) return students;
    const [a, b] = weekRange();
    const has = new Set(entriesOf(cls.id, a, b).map(e => e.studentId));
    return students.filter(s => !has.has(s.id));
  }
  function cardView(students, byS) {
    const list = S.onlyMissing ? students.filter(s => !byS.has(s.id)) : students;
    S.cardIdx = Math.max(0, Math.min(S.cardIdx, list.length));
    const cls = S.data.classes[S.classId];
    if (S.cardIdx >= list.length) {
      const missing = students.filter(s => !byS.has(s.id));
      return `<div class="card done" ${ccStyle(cls)}>${icon('check')}<h2>Geschafft!</h2>
        <p>${missing.length ? `Noch ohne Eintrag: ${missing.map(s => esc(s.name)).join(', ')}` : 'Alle Kinder haben diese Woche einen Eintrag.'}</p>
        <div class="btnrow center">
          ${S.onlyMissing && !missing.length ? '' : '<button type="button" class="btn primary" data-action="cardRestart">Von vorne</button>'}
          <button type="button" class="btn" data-action="notenTab" data-tab="uebersicht">Zur Übersicht</button>
        </div></div>`;
    }
    const s = list[S.cardIdx];
    const es = byS.get(s.id) || [];
    const [hf, ht] = rangeFor('hj');
    const st = stats(liveEntries().filter(e => e.studentId === s.id && e.date >= hf && e.date <= ht));
    return `<div class="card" id="card" ${ccStyle(cls)}>
      <div class="card-top">
        <button type="button" class="icon-btn" data-action="cardPrev" ${S.cardIdx === 0 ? 'disabled' : ''} aria-label="Vorheriges Kind">${icon('left')}</button>
        <span class="card-pos">${S.cardIdx + 1} von ${list.length}</span>
        <button type="button" class="icon-btn" data-action="cardNext" aria-label="Nächstes Kind">${icon('right')}</button>
      </div>
      ${list.length <= 40 ? `<div class="card-dots">${list.map((x, i) => `<i class="${i === S.cardIdx ? 'on' : byS.has(x.id) ? 'done' : ''}"></i>`).join('')}</div>` : ''}
      <div class="card-name">${esc(s.name)}</div>
      <div class="card-info"><span class="muted">Diese Woche:</span> ${es.length ? es.map(chip).join('') : '<span class="muted">noch nichts</span>'}</div>
      <div class="card-info muted">Ø Halbjahr <strong class="avg-inline">${fmtNum(st.avg)}</strong> · ${plural(st.count, 'Note', 'Noten')}</div>
      ${(() => { const cur = es.find(e => e.date === currentDay(s.id)); return cur ? `<div class="card-info cur-info">${weeklyMode(cls) ? 'Diese Woche' : 'Am'} ${WD[wdOf(cur.date)]} ${fmtISO(cur.date)} schon: <strong>${esc(labelEntry(cur))}</strong> – antippen ersetzt den Eintrag</div>` : ''; })()}
      <div class="big-grades">${GRADES.map(n => `<button type="button" class="gbtn big g${n} ${es.some(e => e.date === currentDay(s.id) && e.kind === 'note' && e.grade === n) ? 'cur' : ''}" data-action="cardGrade" data-g="${n}" aria-label="Note ${n}">${n}</button>`).join('')}</div>
      <div class="card-extra">
        <button type="button" class="btn" data-action="cardAbsent">fehlte</button>
        <button type="button" class="btn" data-action="cardNb">ohne Note</button>
        <button type="button" class="btn" data-action="cardNote">Notiz …</button>
      </div>
      <p class="hint desk-only">Tastatur: 1–6 Note · F fehlte · N ohne Note · ← → blättern</p>
    </div>`;
  }

  const RANGES = [['hj', 'Aktuelles Halbjahr'], ['hjprev', 'Vorheriges Halbjahr'], ['sj', 'Aktuelles Schuljahr'], ['4w', 'Letzte 4 Wochen'], ['all', 'Gesamter Zeitraum'], ['custom', 'Eigener Zeitraum …']];
  function rangeFor(key) {
    if (String(key).startsWith('term:')) { const c = ensureClass(); const tt = c && termsFor(levelOf(c)).find(x => x.key === key.slice(5)); if (tt) return [tt.from, tt.to]; key = 'hj'; }
    const t = new Date();
    const y = t.getFullYear(), m = t.getMonth() + 1;
    const sy = m >= 8 ? y : y - 1;
    const hj1 = [`${sy}-08-01`, `${sy + 1}-01-31`];
    const hj2 = [`${sy + 1}-02-01`, `${sy + 1}-07-31`];
    const inHj1 = m >= 8 || m === 1;
    switch (key) {
      case 'hj': return inHj1 ? hj1 : hj2;
      case 'hjprev': return inHj1 ? [`${sy}-02-01`, `${sy}-07-31`] : hj1;
      case 'sj': return [hj1[0], hj2[1]];
      case '4w': { const mo = mondayOf(t); return [toISO(addDays(mo, -21)), toISO(addDays(mo, 6))]; }
      case 'custom': return [S.ovFrom || null, S.ovTo || null];
      case 'qcur': { const c = ensureClass(), d = todayISO(); const q = c && termsFor(levelOf(c)).find(x => x.quarter && d >= x.from && d <= x.to); return q ? [q.from, q.to] : rangeFor('hj'); }
      default: return [null, null];
    }
  }
  function rangeOptions(c) { // Oberstufe zusätzlich mit Quartalen, wie beim Zeugnis
    const out = RANGES.slice(0, 1);
    if (c && isSII(c)) out.push(['qcur', 'Aktuelles Quartal']);
    out.push(...RANGES.slice(1, -1));
    if (c) for (const tt of termsFor(levelOf(c))) out.push(['term:' + tt.key, tt.label]);
    out.push(RANGES[RANGES.length - 1]);
    return out;
  }
  function rangeLabel() {
    const [a, b] = rangeFor(S.ovRange);
    if (!a && !b) return 'alle Einträge';
    return `${a ? fmtISO(a, true) : '…'} – ${b ? fmtISO(b, true) : '…'}`;
  }
  const trendHtml = t => t === 'up' ? '<span class="trend up" title="letzte 4 Wochen besser">↑</span>'
    : t === 'down' ? '<span class="trend down" title="letzte 4 Wochen schlechter">↓</span>'
      : t === 'flat' ? '<span class="trend flat" title="letzte 4 Wochen etwa gleich">→</span>' : '<span class="muted">–</span>';
  function overviewRows(cls, from, to) {
    const byS = groupBy(entriesOf(cls.id, from, to), 'studentId');
    const rows = studentsOf(cls.id).map(s => ({ s, st: stats(byS.get(s.id) || []) }));
    const k = S.ovSort;
    const nullLast = (a, b) => (a == null) - (b == null) || (a ?? 0) - (b ?? 0);
    rows.sort((a, b) => {
      if (k === 'avg') return nullLast(a.st.avg, b.st.avg) || byLastName(a.s.name, b.s.name);
      if (k === 'count') return a.st.count - b.st.count || byLastName(a.s.name, b.s.name);
      if (k === 'absent') return b.st.absent - a.st.absent || byLastName(a.s.name, b.s.name);
      return byLastName(a.s.name, b.s.name);
    });
    return rows;
  }
  function viewUebersicht() {
    const cls = ensureClass();
    if (!cls) return emptyState('Noch kein Kurs angelegt', '', `<button type="button" class="btn primary" data-action="newClass">${icon('plus')} Kurs anlegen</button>`);
    if (S.detailStudent) {
      const s = S.data.students[S.detailStudent];
      if (s && !s.deleted) return viewDetail(s.id);
      S.detailStudent = null;
    }
    const [from, to] = rangeFor(S.ovRange);
    const rows = overviewRows(cls, from, to);
    const ents = entriesOf(cls.id, from, to);
    const head = `<div class="toolbar">${classSelect()}
        <label class="sel"><span class="sr">Zeitraum</span><select data-change="setRange">${rangeOptions(cls).map(([k, l]) => `<option value="${k}" ${k === S.ovRange ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <div class="seg"><button type="button" data-action="ovTab" data-tab="tabelle" class="${S.ovTab !== 'matrix' ? 'on' : ''}">Tabelle</button><button type="button" data-action="ovTab" data-tab="matrix" class="${S.ovTab === 'matrix' ? 'on' : ''}">Wochen</button></div>
      </div>
      ${S.ovRange === 'custom' ? `<div class="toolbar">
        <label class="field inline"><span>von</span><input type="date" data-change="setFrom" value="${S.ovFrom || ''}"></label>
        <label class="field inline"><span>bis</span><input type="date" data-change="setTo" value="${S.ovTo || ''}"></label></div>` : ''}
      <p class="muted small range-info">${rangeLabel()} · ${S.data.settings.weighting === 'woche' ? 'jede Woche zählt gleich' : 'jede Note zählt gleich'}</p>`;
    if (!rows.length) return head + emptyState('Keine Kinder in diesem Kurs', '', `<button type="button" class="btn primary" data-action="openCourse" data-cid="${cls.id}" data-tab="schueler">Kinder hinzufügen</button>`, 'users');
    for (const r of rows) r.cr = calcRaw(r.s, cls, from || '0000-01-01', to || '9999-12-31');
    const body = S.ovTab === 'matrix' ? matrixTable(rows, ents) : overviewTable(rows);
    return head + body + `<div class="export">
        <button type="button" class="btn" data-action="exportOverview">${icon('download')} Übersicht als CSV</button>
        <button type="button" class="btn" data-action="exportEntries">${icon('download')} Einzeleinträge als CSV</button>
      </div>`;
  }
  function overviewTable(rows) {
    const th = (k, l, cls = '') => `<th class="${cls}"><button type="button" data-action="ovSort" data-k="${k}" class="${S.ovSort === k ? 'on' : ''}">${l}${S.ovSort === k ? ' ▾' : ''}</button></th>`;
    const avgs = rows.map(r => r.st.avg).filter(x => x != null);
    const total = sum(rows.map(r => r.st.count));
    return `<div class="table-wrap"><table class="ov">
      <thead><tr>${th('name', 'Name')}${th('avg', 'mündl. Ø', 'num')}<th class="num" title="SoMi = mündlich + Vokabeltests">SoMi</th><th class="num" title="Klassenarbeiten/Klausuren inkl. mündlicher Prüfung, gewichtet">schriftl.</th>${th('count', 'Noten', 'num')}<th class="num" title="letzte 4 Wochen gegenüber davor">Tendenz</th>${th('absent', 'fehlte', 'num')}</tr></thead>
      <tbody>${rows.map(({ s, st }) => `<tr data-action="studentDetail" data-sid="${s.id}" tabindex="0">
        <td>${esc(s.name)}</td>
        <td class="num"><span class="avg ${avgCls(st.avg)}">${fmtNum(st.avg)}</span></td>
        <td class="num">${rows.find(x => x.s === s)?.cr?.somi != null ? fmtNum(rows.find(x => x.s === s).cr.somi) : '–'}</td>
        <td class="num">${rows.find(x => x.s === s)?.cr?.schr != null ? fmtNum(rows.find(x => x.s === s).cr.schr) : '–'}</td>
        <td class="num">${st.count}</td>
        <td class="num">${trendHtml(st.trend)}</td>
        <td class="num">${st.absent || ''}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Kursschnitt</td><td class="num">${fmtNum(avgs.length ? mean(avgs) : null)}</td><td class="num">${(() => { const v = rows.map(r => r.cr?.somi).filter(x => x != null); return fmtNum(v.length ? mean(v) : null); })()}</td><td class="num">${(() => { const v = rows.map(r => r.cr?.schr).filter(x => x != null); return fmtNum(v.length ? mean(v) : null); })()}</td><td class="num">${total}</td><td></td><td></td></tr></tfoot>
    </table></div>`;
  }
  function matrixCells(ents) {
    const weeks = [...new Set(ents.map(e => weekKey(e.date)))].sort();
    return { weeks, cells: groupBy(ents, e => e.studentId + '|' + weekKey(e.date)) };
  }
  function weekCell(es) {
    if (!es || !es.length) return { txt: '', avg: null };
    const g = es.filter(e => e.kind === 'note').map(e => e.grade);
    const f = es.filter(e => e.kind === 'fehlte').length;
    if (g.length) { const a = mean(g); return { txt: g.length === 1 ? String(g[0]) : fmtNum(a, 1), avg: a, f }; }
    return { txt: f ? 'f' : '–', avg: null, f };
  }
  function matrixTable(rows, ents) {
    const { weeks, cells } = matrixCells(ents);
    if (!weeks.length) return '<p class="empty-note">Im gewählten Zeitraum gibt es noch keine Einträge.</p>';
    return `<div class="table-wrap"><table class="matrix">
      <thead><tr><th>Name</th>${weeks.map(w => `<th>KW ${isoWeek(parseISO(w))}<small>${fmtISO(w)}</small></th>`).join('')}<th>Ø</th></tr></thead>
      <tbody>${rows.map(({ s, st }) => `<tr data-action="studentDetail" data-sid="${s.id}" tabindex="0"><td title="${esc(s.name)}">${esc(s.name)}</td>${weeks.map(w => {
        const c = weekCell(cells.get(s.id + '|' + w));
        return `<td>${c.txt ? `<span class="mcell ${c.avg != null ? avgCls(c.avg) : 'f'}">${c.txt}</span>` : ''}</td>`;
      }).join('')}<td><span class="mcell ${avgCls(st.avg)}">${fmtNum(st.avg, 1)}</span></td></tr>`).join('')}</tbody>
    </table></div>`;
  }
  function dirHtml(dir) {
    return dir === 'up' ? '<span class="dir up">▲ nach oben</span>' : dir === 'down' ? '<span class="dir down">▼ nach unten</span>' : '';
  }
  function viewDetail(sid) {
    const s = S.data.students[sid];
    const c = S.data.classes[s.classId];
    const lv = levelOf(c);
    const terms = termsFor(lv);
    const cur = currentTerm(lv);
    const tc = termCfg();
    const ents = liveEntries().filter(e => e.studentId === sid && e.date >= tc.start && e.date <= tc.end).sort(byDate);
    const weeks = [...groupBy(ents, e => weekKey(e.date)).entries()].sort((a, b) => b[0].localeCompare(a[0]));
    const obs = live(S.data.obs).filter(o => o.studentId === sid).sort((a, b) => b.date.localeCompare(a.date) || (b.updatedAt - a.updatedAt));
    const results = assessmentsOf(c.id).map(a => ({ a, r: resultOf(a.id, sid) })).filter(x => x.r);
    return `<div class="subhead"><button type="button" class="btn ghost" data-action="closeDetail">${icon('left')} ${S.detailFrom === 'zeugnis' ? 'Zeugnis' : S.detailFrom === 'leistungen' ? 'Arbeiten/Klausuren' : S.detailFrom === 'erfassen' ? 'Mündlich' : 'Übersicht'}</button></div>
      <section class="panel detail-head" ${ccStyle(c)}>
        <div class="dh-top"><div><h2 class="detail-name">${esc(s.name)}</h2><p class="muted small">${esc(clsLabel(c))} · ${levelLabel(c)} · Schuljahr ${tc.sy}/${String(tc.sy + 1).slice(2)}</p></div>
          <button type="button" class="btn small" data-action="printSheet" data-sid="${sid}">${icon('print')} Elternsprechtag</button></div>
        <div class="term-cards">${terms.map(t => {
          const r = calc(s, t, c);
          return `<div class="term-card ${t.key === cur.key ? 'cur' : ''} ${t.zeugnis ? 'z' : ''}"><span>${t.short}</span>
            <strong class="${r.final == null ? 'muted' : ''}">${gradeText(c, r.final)}</strong>${r.override ? dirHtml(r.dir) || '<span class="dir">manuell</span>' : ''}
            <small>${r.somi != null ? 'SoMi ' + fmtNum(r.somi, 1) : ''}${r.schr != null ? ' · schr. ' + fmtNum(r.schr, 1) : ''}</small></div>`;
        }).join('')}</div>
      </section>
      <section class="panel"><div class="section-head tight"><h3>Entwicklung</h3>${chartRangeSeg()}</div>
        <div class="chart" data-chart="student" data-sid="${sid}"></div></section>
      ${results.length ? `<section class="panel"><h3>Arbeiten/Klausuren</h3><ul class="plain-list">${results.map(({ a, r }) => `<li><div><strong>${esc(a.title)}</strong><span>${fmtShort(a.date)} · ${artLabel(a)}${a.type !== 'vokabel' && weightOf(a) !== 1 ? ` · ×${fmtNum(weightOf(a), 1).replace(',0', '')}` : ''}</span></div>
        <span class="res-chip ${r.value == null ? 'none' : valCls(r.value)}">${r.value == null ? 'fehlte' : a.type === 'vokabel' ? `${fmtNum(r.points, 1).replace(',0', '')} P. · ${esc(r.label)}` : esc(r.label)}</span></li>`).join('')}</ul></section>` : ''}
      <section class="panel"><h3>Beobachtungen</h3>
        <form data-submit="addObs" class="obs-form"><input type="hidden" name="sid" value="${sid}"><textarea name="text" rows="2" maxlength="600" placeholder="z. B. beteiligt sich seit dem Referat deutlich mehr"></textarea>
          <div class="obs-row"><input type="date" name="date" value="${todayISO()}" aria-label="Datum"><button class="btn primary" type="submit">${icon('plus')} Notieren</button></div></form>
        ${obs.length ? `<ul class="obs-list">${obs.map(o => `<li><span class="obs-date">${fmtISO(o.date, true)}</span><p>${esc(o.text)}</p><button type="button" class="icon-btn plain" data-action="deleteObs" data-oid="${o.id}" aria-label="Beobachtung löschen">${icon('trash')}</button></li>`).join('')}</ul>` : '<p class="muted small">Noch keine Beobachtungen.</p>'}
      </section>
      <section class="panel"><div class="section-head tight"><h3>Mündlich – nach Wochen</h3><button type="button" class="link" data-action="addEntryFor" data-sid="${sid}">${icon('plus')} Eintrag</button></div>
        ${weeks.length ? weeks.map(([w, es]) => {
          const ws = parseISO(w);
          const cc = weekCell(es);
          const notes = es.filter(e => e.note);
          return `<div class="wk-row">
            <div class="wk-l">KW ${isoWeek(ws)}<small>${fmtDate(ws)}–${fmtDate(addDays(ws, 6))}</small></div>
            <div class="chips">${es.map(chip).join('')}</div>
            <div class="wk-avg">${cc.avg != null ? 'Ø ' + fmtNum(cc.avg, 1) : ''}</div>
            ${notes.length ? `<div class="wk-notes">${notes.map(e => `${WD[wdOf(e.date)]}: ${esc(e.note)}`).join(' · ')}</div>` : ''}
          </div>`;
        }).join('') : '<p class="muted">In diesem Schuljahr noch keine mündlichen Noten.</p>'}
      </section>`;
  }

  /* ---------- Entwicklungskurve ---------- */
  const CHART_RANGES = [['sj', 'Schuljahr'], ['hj', 'Halbjahr'], ['q', 'Quartal'], ['8w', '8 Wochen']];
  const chartRangeSeg = () => `<div class="seg mini-seg">${CHART_RANGES.map(([k, l]) => `<button type="button" data-action="chartRange" data-r="${k}" class="${(S.chartRange || 'sj') === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  function chartWindow(c, range = S.chartRange || 'sj') {
    const t = termCfg(), lv = levelOf(c), today = todayISO();
    const ts = termsFor(lv);
    if (range === 'hj') { const zs = ts.filter(x => x.zeugnis); const h = zs.find(x => today >= x.from && today <= x.to) || zs[0]; return [h.from, h.to]; }
    if (range === 'q') {
      if (lv === 'SI') {
        const h = ts.find(x => today >= x.from && today <= x.to) || ts[0];
        const mid = addDaysISO(h.from, Math.round(diffDays(h.from, h.to) / 2));
        return today <= mid ? [h.from, mid] : [addDaysISO(mid, 1), h.to];
      }
      const q = ts.find(x => x.quarter && today >= x.from && today <= x.to) || ts[0];
      return [q.from, q.to];
    }
    if (range === '8w') { const mo = toISO(mondayOf(new Date())); return [addDaysISO(mo, -49), addDaysISO(mo, 6)]; }
    let from = t.start;
    const ps = S.data.settings.planStart;
    if (ps && ps > from && ps < t.end) from = ps;
    return [from, lv === 'Q2' ? t.q2End : t.end];
  }
  function studentChartSVG(s, c, W, range) {
    const [from, to] = chartWindow(c, range);
    const w0 = weekKey(from), w1 = weekKey(to);
    const nW = Math.max(1, diffDays(w0, w1) / 7 + 1);
    const H = 210, padL = 28, padR = 14, padT = 14, padB = 28;
    const iw = W - padL - padR, ih = H - padT - padB;
    const x = wk => padL + (nW <= 1 ? iw / 2 : diffDays(w0, wk) / 7 / (nW - 1) * iw);
    const y = v => padT + (Math.min(6, Math.max(0.7, v)) - 0.7) / 5.3 * ih;
    const inR = d => d >= from && d <= to;
    const ment = liveEntries().filter(e => e.studentId === s.id && e.kind === 'note' && e.grade && inR(e.date));
    const weekly = [...groupBy(ment, e => weekKey(e.date)).entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([wk, es]) => ({ wk, v: mean(es.map(e => e.grade)), n: es.length }));
    const pts = [];
    for (const a of assessmentsOf(c.id, null, from, to)) { const r = resultOf(a.id, s.id); if (r && r.value != null) pts.push({ wk: weekKey(a.date), v: r.value, a, r }); }
    let g = '';
    for (let v = 1; v <= 6; v++) g += `<line x1="${padL}" x2="${W - padR}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" class="cg"/><text x="${padL - 9}" y="${(y(v) + 4).toFixed(1)}" class="ct" text-anchor="end">${v}</text>`;
    for (const t of termsFor(levelOf(c))) {
      if (t.from > from && t.from <= to && !(t.key === 'HJ2' && termsFor(levelOf(c)).some(q => q.key === 'Q3'))) {
        const xx = x(weekKey(t.from)).toFixed(1);
        g += `<line x1="${xx}" x2="${xx}" y1="${padT}" y2="${H - padB}" class="cb ${t.zeugnis ? 'z' : ''}"/><text x="${+xx + 4}" y="${padT + 10}" class="ct small">${t.short}</text>`;
      }
    }
    if (nW > 14) {
      for (let d = parseISO(from); toISO(d) <= to; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
        const iso = toISO(d);
        const xx = x(weekKey(iso < from ? from : iso));
        g += `<text x="${xx.toFixed(1)}" y="${H - 8}" class="ct" text-anchor="start">${MONTHS[d.getMonth()].slice(0, 3)}</text>`;
      }
    } else {
      const step = Math.max(1, Math.ceil(nW / 6));
      for (let i = 0; i < nW; i += step) { const wk = addDaysISO(w0, i * 7); g += `<text x="${x(wk).toFixed(1)}" y="${H - 8}" class="ct" text-anchor="middle">KW ${isoWeek(parseISO(wk))}</text>`; }
    }
    const today = todayISO();
    if (today >= from && today <= to) { const xx = x(weekKey(today)).toFixed(1); g += `<line x1="${xx}" x2="${xx}" y1="${padT}" y2="${H - padB}" class="cnow"/>`; }
    const line = weekly.length > 1 ? `<path d="${weekly.map((p, i) => `${i ? 'L' : 'M'}${x(p.wk).toFixed(1)},${y(p.v).toFixed(1)}`).join('')}" class="cl-m"/>` : '';
    const tipM = p => `KW ${isoWeek(parseISO(p.wk))}: mündlich Ø ${fmtNum(p.v, 1)} (${plural(p.n, 'Note', 'Noten')})`;
    const dots = weekly.map(p => `<circle cx="${x(p.wk).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="4.5" class="cm"/><circle cx="${x(p.wk).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="13" class="hit" data-tip="${esc(tipM(p))}"/>`).join('');
    const marks = pts.map(p => {
      const xx = x(p.wk), yy = y(p.v);
      const tip = p.a.type === 'vokabel' ? `${p.a.title} (${fmtShort(p.a.date)}): ${fmtNum(p.r.points, 1).replace(',0', '')} P. = ${p.r.label}` : `${p.a.title} (${fmtShort(p.a.date)}): ${p.r.label}`;
      const shape = p.a.type === 'vokabel'
        ? `<rect x="${(xx - 4.5).toFixed(1)}" y="${(yy - 4.5).toFixed(1)}" width="9" height="9" rx="1.5" class="cv"/>`
        : `<path d="M${xx.toFixed(1)},${(yy - 6.5).toFixed(1)}l6.5,6.5l-6.5,6.5l-6.5,-6.5z" class="cs"/>`;
      return shape + `<circle cx="${xx.toFixed(1)}" cy="${yy.toFixed(1)}" r="13" class="hit" data-tip="${esc(tip)}"/>`;
    }).join('');
    const hasV = pts.some(p => p.a.type === 'vokabel'), hasS = pts.some(p => p.a.type !== 'vokabel');
    const sp = pts.filter(p => p.a.type !== 'vokabel').sort((a, b) => a.a.date.localeCompare(b.a.date));
    const sline = sp.length > 1 ? `<path d="${sp.map((p, i) => `${i ? 'L' : 'M'}${x(p.wk).toFixed(1)},${y(p.v).toFixed(1)}`).join('')}" class="cl-s"/>` : '';
    const empty = !weekly.length && !pts.length;
    return `<div class="chart-legend"><span><i class="lg lg-m"></i>Mündlich (Wochenschnitt)</span>${hasS ? '<span><i class="lg lg-s"></i>Schriftlich inkl. mündl. Prüfung</span>' : ''}${hasV ? '<span><i class="lg lg-v"></i>Vokabeltest</span>' : ''}</div>
      <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Notenentwicklung von ${esc(s.name)}, ${fmtISO(from, true)} bis ${fmtISO(to, true)}">${g}${sline}${line}${dots}${marks}
      ${empty ? `<text x="${W / 2}" y="${H / 2}" class="ct" text-anchor="middle">Noch keine Noten in diesem Zeitraum</text>` : ''}</svg><div class="chart-tip" hidden></div>`;
  }
  function drawCharts() {
    document.querySelectorAll('#app [data-chart=student]').forEach(el => {
      const s = S.data.students[el.dataset.sid];
      if (!s) return;
      el.innerHTML = studentChartSVG(s, S.data.classes[s.classId], Math.max(280, Math.floor(el.clientWidth || 340)));
      const tip = el.querySelector('.chart-tip');
      el.querySelectorAll('[data-tip]').forEach(t => {
        const show = () => {
          const r = el.getBoundingClientRect(), b = t.getBoundingClientRect();
          tip.textContent = t.dataset.tip; tip.hidden = false;
          tip.style.left = Math.min(r.width - 70, Math.max(70, b.left - r.left + b.width / 2)) + 'px';
          tip.style.top = (b.top - r.top + 2) + 'px';
        };
        t.addEventListener('pointerenter', show);
        t.addEventListener('click', show);
        t.addEventListener('pointerleave', () => { tip.hidden = true; });
      });
    });
  }

  /* ---------- Tests & Arbeiten ---------- */
  function viewLeistungen() {
    const c = ensureClass();
    if (!c) return emptyState('Noch kein Kurs angelegt', '', `<button type="button" class="btn primary" data-action="newClass">${icon('plus')} Kurs anlegen</button>`);
    if (S.assessId) { const a = S.data.assessments[S.assessId]; if (a && !a.deleted && a.classId === c.id) return viewAssessment(a); S.assessId = null; }
    const students = studentsOf(c.id);
    const linked = new Set(live(S.data.assessments).map(a => a.eventId).filter(Boolean));
    const exams = live(S.data.events).filter(e => e.type === 'pruefung' && e.classId === c.id && !linked.has(e.id) && e.date <= addDaysISO(todayISO(), 21))
      .sort((a, b) => a.date.localeCompare(b.date));
    const schr = assessmentsOf(c.id, 'schriftlich'), vok = assessmentsOf(c.id, 'vokabel');
    const row = a => {
      const rs = students.map(s => resultOf(a.id, s.id)).filter(Boolean);
      const vals = rs.map(r => r.value).filter(v => v != null);
      const avg = mean(vals);
      return `<button type="button" class="as-row" data-action="openAssess" data-aid="${a.id}" ${ccStyle(c)}>
        <div class="as-main"><strong>${esc(a.title)}</strong><span>${fmtShort(a.date)}${a.art === 'muendlich' ? ' · Mündliche Prüfung' : ''}${weightOf(a) !== 1 ? ` · Gewicht ×${fmtNum(weightOf(a), 1).replace(',0', '')}` : ''} · ${rs.length}/${students.length} eingetragen</span></div>
        <span class="res-chip ${valCls(avg)}">Ø ${avg != null ? fmtNum(avg, 2) : '–'}</span>${icon('right')}</button>`;
    };
    return `<div class="toolbar">${classSelect()}</div>${kmPendingPanel(c)}
      <section class="section"><div class="section-head"><h2>Schriftliche Leistungen</h2><span class="head-links"><button type="button" class="link" data-action="newAssess" data-type="schriftlich">${icon('plus')} Arbeit</button><button type="button" class="link" data-action="newAssess" data-type="schriftlich" data-art="muendlich">${icon('plus')} Mündliche Prüfung</button></span></div>
        <p class="muted small pad">Klassenarbeiten bzw. Klausuren und mündliche Prüfungen – zählen 50 % der Zeugnisnote. Gewichtung je Arbeit über den Stift in der Arbeit.</p>
        ${exams.length ? `<div class="mini-list">${exams.map(e => `<button type="button" class="mini-row" data-action="assessFromEvent" data-eid="${e.id}" ${ccStyle(c)}><span class="dot"></span><span class="mini-date">${fmtShort(e.date)}</span><span class="mini-text"><strong>${esc(e.kind || 'Prüfung')}</strong> aus der Planung – Noten eintragen</span>${icon('right')}</button>`).join('')}</div>` : ''}
        ${schr.length ? `<div class="as-list">${schr.map(row).join('')}</div>` : ''}
        ${kmKey() ? `<button type="button" class="btn import-btn" data-action="kmPaste">${icon('copy')} Ergebnis aus der Korrektur-App einfügen</button>` : ''}
        <label class="btn file-btn import-btn">${icon('upload')} Noten aus dem Korrektur-Tool importieren<input type="file" accept=".xlsx" data-change="importKA"></label>
      </section>
      <section class="section"><div class="section-head"><h2>Vokabeltests</h2>${c.vocab ? `<button type="button" class="link" data-action="newAssess" data-type="vokabel">${icon('plus')} Vokabeltest</button>` : ''}</div>
        ${c.vocab ? (vok.length ? `<div class="as-list">${vok.map(row).join('')}</div>${vocabMatrix(c, vok, students)}`
          : '<p class="muted small pad">Noch keine Vokabeltests. Max. 10 Punkte, halbe Punkte möglich – die Note wird automatisch berechnet.</p>')
          : `<div class="panel slim"><p class="muted small">Vokabeltests sind für diesen Kurs ausgeschaltet. Eingeschaltet zählen sie als Teil der SoMi-Note (anteilig nach Anzahl der Noten).</p><button type="button" class="btn small" data-action="enableVocab">Vokabeltests einschalten</button></div>`}
      </section>`;
  }
  function vocabMatrix(c, vok, students) {
    if (!students.length) return '';
    return `<h3 class="sub-h">Übersicht Vokabeltests</h3><div class="table-wrap"><table class="matrix vm">
      <thead><tr><th>Name</th>${vok.map(a => `<th title="${esc(a.title)}">${esc(a.title.length > 10 ? a.title.slice(0, 9) + '…' : a.title)}<small>${fmtISO(a.date)}</small></th>`).join('')}<th>Ø</th></tr></thead>
      <tbody>${students.map(s => {
        const rs = vok.map(a => resultOf(a.id, s.id));
        const vals = rs.filter(r => r && r.value != null).map(r => r.value);
        const avg = mean(vals);
        return `<tr data-action="studentDetail" data-sid="${s.id}" tabindex="0"><td>${esc(s.name)}</td>${rs.map(r => `<td>${!r ? '' : r.value == null ? '<span class="mcell f">f</span>' : `<span class="mcell ${valCls(r.value)}" title="${fmtNum(r.points, 1)} Punkte">${esc(r.label)}</span>`}</td>`).join('')}
          <td>${avg != null ? `<span class="mcell ${valCls(avg)}">${fmtNum(avg, 1)}</span>` : ''}</td></tr>`;
      }).join('')}</tbody></table></div>`;
  }
  function viewAssessment(a) {
    const c = S.data.classes[a.classId];
    const students = studentsOf(c.id);
    const done = students.filter(s => resultOf(a.id, s.id)).length;
    const vals = students.map(s => resultOf(a.id, s.id)).filter(r => r && r.value != null).map(r => r.value);
    const spiegel = [1, 2, 3, 4, 5, 6].map(n => vals.filter(v => Math.round(v + 1e-9) === n || (n === 1 && v < 1)).length);
    let html = `<div class="subhead"><button type="button" class="btn ghost" data-action="closeAssess">${icon('left')} Arbeiten/Klausuren</button></div>
      <section class="panel as-head" ${ccStyle(c)}><div><h2>${esc(a.title)}</h2><p class="muted small">${esc(clsLabel(c))} · ${fmtLong(a.date)} · ${a.type === 'vokabel' ? 'Vokabeltest, max. 10 Punkte' : a.art === 'muendlich' ? 'mündliche Prüfung (zählt zum schriftlichen Teil)' : 'schriftliche Leistung'}${a.type !== 'vokabel' ? ` · Gewicht ×${fmtNum(weightOf(a), 1).replace(',0', '')}` : ''}</p>
        <div class="spiegel">${spiegel.map((n, i) => `<span class="g${i + 1}"><b>${i + 1}</b>${n}</span>`).join('')}<span class="sp-avg">Ø ${vals.length ? fmtNum(mean(vals), 2) : '–'}</span></div></div>
        <button type="button" class="icon-btn plain" data-action="editAssess" data-aid="${a.id}" aria-label="Bearbeiten">${icon('pencil')}</button></section>
      ${a.km ? `<p class="muted small">Noten aus dem Klausurmanager übernommen.${a.kmMissing && a.kmMissing.length ? ` Ohne Kind im Kurs: ${esc(a.kmMissing.join(', '))} – unter Kinder die Kürzel-Tabelle einlesen.` : ''}</p>` : ''}
      <div class="progress-line"><div class="bar" ${ccStyle(c)}><div style="width:${students.length ? Math.round(done / students.length * 100) : 0}%"></div></div><span>${done}/${students.length} eingetragen</span></div>`;
    if (!students.length) return html + emptyState('Keine Kinder in diesem Kurs', '', `<button type="button" class="btn primary" data-action="openCourse" data-cid="${c.id}" data-tab="schueler">Kinder hinzufügen</button>`, 'users');
    if (a.type === 'vokabel') {
      html += `<div class="seg" style="margin-bottom:12px"><button type="button" data-action="vMode" data-m="karte" class="${S.vMode !== 'liste' ? 'on' : ''}">${icon('cards')}<span>Karten</span></button><button type="button" data-action="vMode" data-m="liste" class="${S.vMode === 'liste' ? 'on' : ''}">${icon('list')}<span>Liste</span></button></div>`;
      if (S.vMode !== 'liste') return html + vocabCard(a, c, students);
    }
    return html + `<div class="list">${students.map((s, i) => {
      const r = resultOf(a.id, s.id);
      const txt = !r ? (a.type === 'vokabel' ? '+ Punkte' : '+ Note') : r.value == null ? 'fehlte' : a.type === 'vokabel' ? `${fmtNum(r.points, 1).replace(',0', '')} P. · ${esc(r.label)}` : esc(r.label);
      return `<div class="row slim-row"><span class="name">${esc(s.name)}${r && r.fokus ? `<small class="muted fokus">Fokus: ${esc(r.fokus)}</small>` : ''}</span>
        <button type="button" class="res-chip big ${!r ? 'empty' : r.value == null ? 'none' : valCls(r.value)}" data-action="${a.type === 'vokabel' ? 'vocabGo' : 'pickGrade'}" data-aid="${a.id}" data-sid="${s.id}" data-i="${i}">${txt}</button></div>`;
    }).join('')}</div>`;
  }
  function vocabCard(a, c, students) {
    const i = Math.max(0, Math.min(S.vIdx || 0, students.length));
    if (i >= students.length) {
      return `<div class="card done" ${ccStyle(c)}>${icon('check')}<h2>Alle eingetragen</h2><p>Die Noten wurden automatisch berechnet.</p>
        <div class="btnrow center"><button type="button" class="btn primary" data-action="vMode" data-m="liste">Zur Liste</button><button type="button" class="btn" data-action="vocabGo" data-i="0">Von vorne</button></div></div>`;
    }
    const s = students[i];
    const r = resultOf(a.id, s.id);
    return `<div class="card" ${ccStyle(c)}>
      <div class="card-top">
        <button type="button" class="icon-btn" data-action="vocabGo" data-i="${i - 1}" ${i === 0 ? 'disabled' : ''} aria-label="Vorheriges Kind">${icon('left')}</button>
        <span class="card-pos">${i + 1} von ${students.length}</span>
        <button type="button" class="icon-btn" data-action="vocabGo" data-i="${i + 1}" aria-label="Nächstes Kind">${icon('right')}</button>
      </div>
      <div class="card-name">${esc(s.name)}</div>
      <div class="card-info">${r ? (r.value == null ? '<span class="res-chip none">fehlte</span>' : `<span class="res-chip ${valCls(r.value)}">${fmtNum(r.points, 1).replace(',0', '')} P. → ${esc(r.label)}</span>`) : '<span class="muted">noch nicht eingetragen</span>'}</div>
      <div class="pts-grid">${[10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map(p => `<button type="button" class="pbtn" data-action="vocabPts" data-p="${p}" ${S.vHalf && p === 10 ? 'disabled' : ''}>${p}${S.vHalf && p < 10 ? '<small>,5</small>' : ''}<em>${vocabLabel(p + (S.vHalf && p < 10 ? 0.5 : 0))}</em></button>`).join('')}
        <button type="button" class="pbtn half ${S.vHalf ? 'on' : ''}" data-action="vocabHalf">+0,5</button></div>
      <div class="card-extra two"><button type="button" class="btn" data-action="vocabAbsent">fehlte</button><button type="button" class="btn" data-action="vocabClear" ${r ? '' : 'disabled'}>Eintrag löschen</button></div>
      <p class="hint">Halbe Punkte: erst „+0,5“ antippen, dann die ganze Zahl. Die Note steht klein unter jeder Zahl.</p>
    </div>`;
  }
  function setResult(a, sid, patch) {
    const id = a.id + '|' + sid;
    commit(d => { d.results[id] = Object.assign({ id, assessmentId: a.id, studentId: sid }, patch, { updatedAt: now() }); nsTodoSync(d, d.assessments[a.id]); });
  }
  // Nachschrift-To-do: wer „nicht mitgeschrieben“ hat, steht auf einem To-do „Nachschrift planen“ (zur nächsten Stunde
  // des Kurses). Haben alle eine Note, ist es erledigt. Ein gelöschtes To-do kommt nicht wieder. Namen nur lokal (nsFor = IDs).
  function nsTodoSync(d, a) {
    if (!a || a.deleted || a.type !== 'schriftlich') return;
    const missing = Object.values(d.results).filter(r => !r.deleted && r.assessmentId === a.id && r.value == null).map(r => r.studentId).sort();
    const id = 'ns-' + a.id, td = d.todos[id];
    if (td && td.deleted) return;
    const same = td && JSON.stringify(td.nsFor || []) === JSON.stringify(missing);
    if (!missing.length) { if (td && !td.done) d.todos[id] = Object.assign({}, td, { done: true, doneAt: now(), nsFor: [], updatedAt: now() }); return; }
    if (same) return;
    d.todos[id] = Object.assign({ id, cat: 'korrektur', classId: a.classId, date: null, createdAt: now() }, td || {},
      { text: `Nachschrift planen: ${a.title}`.slice(0, 160), nsFor: missing, done: false, doneAt: null, updatedAt: now() });
  }
  async function pickGrade(a, s) {
    const r = resultOf(a.id, s.id);
    const res = await openModal({
      title: s.name,
      body: `<p class="muted small">${esc(a.title)} · ${fmtShort(a.date)}</p>
        <div class="grade-grid">${GRID.map(([l, v]) => `<button type="button" class="gbtn g${Math.min(6, Math.round(v + 1e-9) || 1)} ${r && r.label === l ? 'on' : ''}" data-l="${l}">${l}</button>`).join('')}</div>`,
      mount: (root, close) => root.querySelectorAll('[data-l]').forEach(b => b.addEventListener('click', () => close(b.dataset.l))),
      actions: [...(r ? [{ label: 'Entfernen', cls: 'danger', value: '__del' }] : []), { label: 'nicht mitgeschrieben', value: '__nt' }, { label: 'Abbrechen', value: null }]
    });
    if (!res) return;
    if (res === '__del') return commit(d => { d.results[a.id + '|' + s.id] = { id: a.id + '|' + s.id, deleted: true, updatedAt: now() }; });
    if (res === '__nt') return setResult(a, s.id, { value: null, label: 'nt' });
    setResult(a, s.id, { value: gridValue(res), label: res });
  }
  function vocabSave(points) {
    const a = S.data.assessments[S.assessId];
    const students = studentsOf(a.classId);
    const s = students[S.vIdx || 0];
    if (!s) return;
    const label = vocabLabel(points);
    setResult(a, s.id, { points, label, value: gridValue(label) });
    S.vHalf = false;
    S.vIdx = (S.vIdx || 0) + 1;
    render();
    toast(`${s.name}: ${fmtNum(points, 1).replace(',0', '')} P. → ${label}`);
  }
  async function editAssessment(a, preset = {}) {
    const isNew = !a;
    const type = a?.type || preset.type || 'schriftlich';
    const art = a?.art || preset.art || (/mündlich/i.test(preset.title || '') ? 'muendlich' : 'schriftlich');
    const wNow = weightOf(a);
    const c = S.data.classes[a?.classId || preset.cid || S.classId];
    const nVok = assessmentsOf(c.id, 'vokabel').length;
    const res = await openModal({
      title: isNew ? (type === 'vokabel' ? 'Neuer Vokabeltest' : 'Neue schriftliche Leistung') : 'Bearbeiten',
      autofocus: canHover(),
      body: `<label class="field"><span>Bezeichnung</span><input id="m-t" maxlength="60" value="${esc(a?.title || preset.title || (type === 'vokabel' ? `Vokabeltest ${nVok + 1}` : ''))}" placeholder="${type === 'vokabel' ? 'z. B. Vokabeltest Unit 1' : art === 'muendlich' ? 'z. B. Mündliche Prüfung' : 'z. B. Klassenarbeit 1'}"></label>
        <label class="field"><span>Datum</span><input type="date" id="m-d" value="${a?.date || preset.date || todayISO()}"></label>
        ${type !== 'vokabel' ? `<div class="two-col"><label class="field"><span>Art</span><select id="m-art"><option value="schriftlich" ${art !== 'muendlich' ? 'selected' : ''}>Klassenarbeit / Klausur</option><option value="muendlich" ${art === 'muendlich' ? 'selected' : ''}>Mündliche Prüfung</option></select></label>
          <label class="field"><span>Gewichtung</span><select id="m-w">${[0.5, 1, 1.5, 2, 3].map(w => `<option value="${w}" ${Math.abs(w - wNow) < 1e-9 ? 'selected' : ''}>×${String(w).replace('.', ',')}${w === 1 ? ' (normal)' : ''}</option>`).join('')}</select></label></div>` : ''}`,
      actions: [...(isNew ? [] : [{ label: 'Löschen', cls: 'danger', value: 'delete' }]), { label: 'Abbrechen', value: null },
        { label: isNew ? 'Anlegen' : 'Speichern', cls: 'primary', run: root => { const t = root.querySelector('#m-t').value.trim(), d = root.querySelector('#m-d').value; if (!t) { shake(root.querySelector('#m-t')); return false; } if (!d) { shake(root.querySelector('#m-d')); return false; } const out = { title: t, date: d }; if (root.querySelector('#m-art')) { out.art = root.querySelector('#m-art').value; out.weight = +root.querySelector('#m-w').value; } return out; } }]
    });
    if (!res) return null;
    if (res === 'delete') {
      if (!await confirmDialog('Löschen', `„${esc(a.title)}“ mit allen eingetragenen Noten löschen?`, 'Löschen', true)) return null;
      S.assessId = null;
      commit(d => {
        for (const r of Object.values(d.results)) if (!r.deleted && r.assessmentId === a.id) d.results[r.id] = { id: r.id, deleted: true, updatedAt: now() };
        if (a.km) for (const o of Object.values(d.obs)) if (!o.deleted && o.km === a.km) d.obs[o.id] = { id: o.id, deleted: true, updatedAt: now() };
        d.assessments[a.id] = { id: a.id, deleted: true, updatedAt: now() };
      });
      return null;
    }
    const id = a?.id || uid();
    commit(d => { d.assessments[id] = Object.assign({}, a || { id, classId: c.id, type, eventId: preset.eventId || null }, res, { updatedAt: now() }); });
    return id;
  }

  /* ---------- Korrektur-Tool-Import: nur Vorname, Nachname, Note ---------- */
  const normName = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  const WORD_GRADES = { 'sehr gut': '1', 'gut': '2', 'befriedigend': '3', 'ausreichend': '4', 'mangelhaft': '5', 'ungenugend': '6' };
  function matchStudent(first, last, students) {
    const f = normName(first), l = normName(last), f1 = f.split(' ')[0], li = l ? l[0] : '';
    const variants = new Set([`${f} ${l}`, `${f1} ${l}`, `${f} ${li}`, `${f1} ${li}`, `${l} ${f}`, `${l} ${f1}`, f, f1].map(v => v.trim()).filter(Boolean));
    const cands = students.filter(s => variants.has(normName(s.name)));
    return cands.length === 1 ? cands[0] : null;
  }
  async function importKA(file) {
    const c = ensureClass();
    if (!file || !c) return;
    let sheets;
    try { sheets = await readXlsx(file); } catch (e) { return toast(e.message, { error: true }); }
    let rows = [];
    for (const name of Object.keys(sheets)) {
      const t = sheetTable({ [name]: sheets[name] }, name, ['Vorname', 'Nachname']);
      if (t.length && t.some(r => r['note in zahlen'] != null || r['note'] != null)) { rows = t; break; }
    }
    if (!rows.length) return toast('Keine Tabelle mit „Vorname“, „Nachname“ und „Note“ gefunden.', { error: true });
    const students = studentsOf(c.id);
    // Es werden ausschließlich Vorname, Nachname und Note verwendet – alle anderen Spalten (z. B. E-Mail) werden ignoriert.
    const items = rows.map(r => {
      const first = String(r['vorname'] ?? '').trim(), last = String(r['nachname'] ?? '').trim();
      let label = r['note in zahlen'] ?? null;
      if (label == null && r['note'] != null) label = WORD_GRADES[normName(r['note'])] || r['note'];
      if (typeof label === 'number') label = String(label);
      label = label == null ? '' : String(label).trim().replace(/[−–]/g, '-');
      const value = gridValue(label);
      return { first, last, label: value != null ? label : '', value, match: matchStudent(first, last, students) };
    }).filter(x => x.first || x.last);
    const base = file.name.replace(/\.xlsx$/i, '').replace(/[-_ ]*ausgef.*$/i, '').replace(/[-_]+/g, ' ').trim();
    const existing = assessmentsOf(c.id, 'schriftlich');
    const evs = live(S.data.events).filter(e => e.type === 'pruefung' && e.classId === c.id).sort((a, b) => a.date.localeCompare(b.date));
    const pastEv = evs.filter(e => e.date <= todayISO()).pop();
    const res = await openModal({
      title: 'Noten aus dem Korrektur-Tool',
      body: `<p class="muted small">Übernommen werden nur Name und Note. Alle anderen Spalten der Datei (z. B. E-Mail-Adressen, Einzelpunkte) werden ignoriert und nicht gespeichert.</p>
        <label class="field"><span>Eintragen in</span><select id="m-a"><option value="__new">Neue Arbeit anlegen …</option>${existing.map(a => `<option value="${a.id}">${esc(a.title)} (${fmtISO(a.date)})</option>`).join('')}</select></label>
        <div id="m-newf" class="two-col"><label class="field"><span>Bezeichnung</span><input id="m-t" value="${esc(base)}" maxlength="60"></label>
          <label class="field"><span>Datum</span><input type="date" id="m-d" value="${pastEv ? pastEv.date : todayISO()}"></label></div>
        <div class="imp-list">${items.map((it, i) => `<div class="imp-row ${it.match ? '' : 'nomatch'}"><span class="imp-name">${esc(it.first)} ${esc(it.last.slice(0, 1))}.</span>
          <span class="res-chip ${it.value != null ? valCls(it.value) : 'none'}">${it.value != null ? esc(it.label) : 'keine Note'}</span>
          <select data-i="${i}" aria-label="Zuordnung"><option value="">– nicht übernehmen –</option>${students.map(s => `<option value="${s.id}" ${it.match && it.match.id === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>`).join('')}</div>
        <p class="muted small">${items.filter(i => i.match).length} von ${items.length} automatisch zugeordnet. Bitte fehlende Zuordnungen prüfen.</p>`,
      mount: root => { const sel = root.querySelector('#m-a'); const upd = () => root.querySelector('#m-newf').classList.toggle('hidden', sel.value !== '__new'); sel.addEventListener('change', upd); upd(); },
      actions: [{ label: 'Abbrechen', value: null }, {
        label: 'Übernehmen', cls: 'primary', run: root => {
          const map = [...root.querySelectorAll('select[data-i]')].map(s => ({ it: items[+s.dataset.i], sid: s.value })).filter(x => x.sid);
          const sids = map.map(x => x.sid);
          if (new Set(sids).size !== sids.length) { toast('Ein Kind ist doppelt zugeordnet.', { error: true }); return false; }
          return { aid: root.querySelector('#m-a').value, title: root.querySelector('#m-t').value.trim() || base, date: root.querySelector('#m-d').value || todayISO(), map };
        }
      }]
    });
    if (!res) return;
    let aid = res.aid;
    commit(d => {
      if (aid === '__new') { aid = uid(); d.assessments[aid] = { id: aid, classId: c.id, type: 'schriftlich', title: res.title, date: res.date, eventId: null, updatedAt: now() }; }
      for (const { it, sid } of res.map) d.results[aid + '|' + sid] = { id: aid + '|' + sid, assessmentId: aid, studentId: sid, value: it.value, label: it.value != null ? it.label : 'nt', updatedAt: now() };
      nsTodoSync(d, d.assessments[aid]);
    });
    S.assessId = aid; render();
    toast(`${plural(res.map.length, 'Note', 'Noten')} übernommen`);
  }

  /* =====================================================================
     Push-Nachricht am Freitag, wenn mündliche Noten fehlen
     Eine GitHub-Aufgabe im privaten Daten-Repo schickt die Nachricht. Dafür
     legt das Notenheft dort nur ab: das Geräte-Abo (push/abos/<id>.json) und
     den Stand push/status.json – ausschließlich Anzahlen, keine Namen/Kurse.
     ===================================================================== */
  const pushOn = () => { const p = S.data?.prefs?.push; return !!(p && !p.deleted && p.on); };
  function pushStatus() {
    const mo = toISO(mondayOf(new Date()));
    const withKids = classesSorted().filter(c => studentsOf(c.id).length);
    const wochen = [];
    for (let i = 0; i < 12; i++) {
      const ws = addDaysISO(mo, 7 * i);
      if (withKids.some(c => lessonsBetween(c.id, ws, addDaysISO(ws, 4)).some(l => !l.cancelled && !l.away))) wochen.push(ws);
    }
    const miss = missingGrades(mo);
    return { v: 1, woche: mo, fehlen: sum(miss.map(m => m.miss)), kurse: miss.length, unterrichtswochen: wochen };
  }
  function todoReminders() { // Fälligkeit mit Uhrzeit und „am Morgen um 7:15“ – Text des To-dos (keine Namen hineinschreiben)
    const t = todayISO(), out = [];
    for (const x of openTodos()) {
      const due = todoDue(x);
      if (!due || due < addDaysISO(t, -1) || due > addDaysISO(t, 30)) continue;
      const c = x.classId ? S.data.classes[x.classId] : null;
      const label = (x.text || todoCat(x.cat)[2] || 'To-do') + (c ? ` (${clsLabel(c)})` : '');
      if (x.time) out.push({ id: x.id + '|f', zeit: `${due}T${x.time}`, text: `Fällig: ${label}` });
      if (x.morning) out.push({ id: x.id + '|m', zeit: `${due}T07:15`, text: `Heute fällig: ${label}${x.time ? ` (bis ${x.time} Uhr)` : ''}` });
    }
    return out.sort((a, b) => a.zeit.localeCompare(b.zeit));
  }
  async function pushStatusWrite(force = false) {
    if (!S.data || !pushOn() || !ghReady()) return;
    const st = pushStatus(), key = JSON.stringify(st);
    if (force || S.device.pushLast !== key) {
      await GH.putText(S.device.gh, 'push/status.json', JSON.stringify(Object.assign(st, { stand: new Date().toISOString() })), 'Notenheft: Notenstand');
      S.device.pushLast = key;
    }
    const er = JSON.stringify(todoReminders());
    if (force || S.device.pushTodo !== er) {
      await GH.putText(S.device.gh, 'push/erinnerungen.json', er, 'Notenheft: Erinnerungen');
      S.device.pushTodo = er;
    }
    persistLocal();
  }
  function pushSupport() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window))
      return isIOS() ? 'Auf dem iPhone geht das nur, wenn Notenheft vom Home-Bildschirm geöffnet ist (iOS 16.4 oder neuer).' : 'Dieser Browser unterstützt keine Push-Nachrichten.';
    return null;
  }
  async function pushEnable() {
    const why = pushSupport();
    if (why) return toast(why, { error: true, ms: 7000 });
    if (!ghReady()) return toast('Bitte zuerst die Synchronisierung über GitHub einrichten.', { error: true });
    const perm = await Notification.requestPermission(); // muss direkt auf den Tipp folgen (iOS)
    if (perm !== 'granted') return toast('Mitteilungen wurden nicht erlaubt. Einstellungen → Mitteilungen → Notenheft.', { error: true, ms: 7000 });
    try {
      const g = S.device.gh;
      const keyFile = await GH.getText(g, 'push/vapid-public.txt');
      if (!keyFile) throw new Error('Im Daten-Repo fehlt die Push-Einrichtung (push/vapid-public.txt).');
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64url(keyFile.text.trim()) });
      const j = sub.toJSON();
      if (!S.device.pushId) S.device.pushId = uid();
      await GH.putText(g, `push/abos/${S.device.pushId}.json`, JSON.stringify({ endpoint: j.endpoint, keys: j.keys, geraet: isIOS() ? 'iPhone' : 'Computer', angemeldet: new Date().toISOString() }), 'Notenheft: Gerät für Push angemeldet');
      S.device.pushSub = true;
      commit(d => { d.prefs.push = { id: 'push', on: true, updatedAt: now() }; });
      await pushStatusWrite(true);
      toast('Erinnerung eingeschaltet – freitags gegen 15 Uhr, wenn Noten fehlen.', { ms: 5000 });
    } catch (e) { toast('Push einrichten hat nicht geklappt: ' + e.message, { error: true, ms: 7000 }); }
  }
  async function pushDisable() {
    try {
      const reg = await navigator.serviceWorker?.ready;
      const sub = reg && await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      if (S.device.pushId && ghReady()) await GH.del(S.device.gh, `push/abos/${S.device.pushId}.json`, 'Notenheft: Gerät für Push abgemeldet');
    } catch (e) { console.warn(e); }
    S.device.pushSub = false; persistLocal(); render();
    toast('Auf diesem Gerät ausgeschaltet');
  }
  async function pushTest() {
    try { await GH.putText(S.device.gh, 'push/test.json', JSON.stringify({ stand: new Date().toISOString() }), 'Notenheft: Testnachricht'); toast('Testnachricht angefordert – kommt in etwa einer Minute.', { ms: 5000 }); }
    catch (e) { toast(e.message, { error: true }); }
  }

  /* =====================================================================
     Klausurmanager-Anbindung
     Der Klausurmanager (PC) verschlüsselt die Noten einer ausgewerteten
     Klausur mit dem ÖFFENTLICHEN Schlüssel dieses Notenhefts (ECDH P-256 +
     HKDF-SHA256 + AES-256-GCM) und legt sie als eingang/<id>.json im privaten
     Daten-Repo ab. Lesen kann sie nur das Notenheft: Der private Schlüssel
     liegt in den Notenheft-Daten, die selbst mit dem Passwort verschlüsselt
     sind. Übertragen werden nur Kürzel (aus der Kürzel-Tabelle) und Noten.
     ===================================================================== */
  const KM_DIR = 'eingang';
  const KM_INFO = 'notenheft-klausurmanager-v1';
  const KM_CHECK_MS = 3 * 60000;
  const KM_ALG = { name: 'ECDH', namedCurve: 'P-256' };
  let kmLastCheck = 0, kmRunning = false;
  const kmKey = () => { const k = S.data?.kmkeys?.main; return k && !k.deleted && k.priv ? k : null; };
  const kmPendingList = () => Object.values(S.device?.kmPending || {});
  async function kmEnsureKey() {
    const have = kmKey();
    if (have) return have;
    const kp = await crypto.subtle.generateKey(KM_ALG, true, ['deriveBits']);
    const pub = await crypto.subtle.exportKey('jwk', kp.publicKey), priv = await crypto.subtle.exportKey('jwk', kp.privateKey);
    const rec = { id: 'main', pub: { kty: 'EC', crv: 'P-256', x: pub.x, y: pub.y }, priv: { kty: 'EC', crv: 'P-256', x: priv.x, y: priv.y, d: priv.d }, createdAt: now(), updatedAt: now() };
    commit(d => { d.kmkeys.main = rec; });
    return rec;
  }
  async function kmDecrypt(blob) {
    const k = kmKey();
    if (!k) throw new Error('Der Klausurmanager ist noch nicht verbunden (Mehr → Klausurmanager).');
    if (!blob || blob.format !== 'notenheft-km' || !blob.epk || !blob.ct) throw new Error('Das ist keine Klausurmanager-Datei.');
    let key;
    try {
      const priv = await crypto.subtle.importKey('jwk', k.priv, KM_ALG, false, ['deriveBits']);
      const epk = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: blob.epk.x, y: blob.epk.y }, KM_ALG, false, []);
      const secret = await crypto.subtle.deriveBits({ name: 'ECDH', public: epk }, priv, 256);
      const hk = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveKey']);
      key = await crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: b64ToBytes(blob.salt), info: utf8(KM_INFO) }, hk, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    } catch { throw new Error('Die Klausurmanager-Datei ist beschädigt.'); }
    let bytes;
    try { bytes = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(blob.iv) }, key, b64ToBytes(blob.ct))); }
    catch { const e = new Error('Die Datei ist für einen anderen Verbindungscode verschlüsselt.'); e.code = 'KM_KEY'; throw e; }
    return JSON.parse(unutf8(bytes));
  }
  function kmCheck(p) {
    const ok = p && p.format === 'km-ergebnis' && typeof p.id === 'string' && /^[\w.-]{1,120}$/.test(p.id)
      && /^\d{4}-\d{2}-\d{2}$/.test(p.datum || '') && Array.isArray(p.ergebnisse);
    if (!ok) throw new Error('Die Klausurmanager-Datei ist unvollständig.');
    return {
      id: p.id, quelle: String(p.quelle || p.id).slice(0, 120), titel: String(p.titel || 'Klausur').slice(0, 60),
      kurs: String(p.kurs || '').slice(0, 40), fach: String(p.fach || '').slice(0, 40), datum: p.datum,
      stand: Number(p.stand) || now(), nachschrift: !!p.nachschrift,
      ergebnisse: p.ergebnisse.filter(e => e && typeof e.k === 'string' && e.k.trim())
        .map(e => Object.assign({ k: e.k.trim().slice(0, 20), note: e.note == null ? null : String(e.note).trim().slice(0, 4) },
          typeof e.fokus === 'string' && e.fokus.trim() ? { fokus: e.fokus.trim().slice(0, 300) } : {}))
    };
  }
  // „06c“ = „6c“, „Q1-E-LK“ = „Q1 E LK“
  const normKurs = s => normName(s).replace(/[^a-z0-9]+/g, '').replace(/(^|\D)0+(?=\d)/g, '$1');
  const fachMatch = (c, fach) => { const a = normKurs(c.subject), b = normKurs(fach); return !!(a && b) && (a === b || a.startsWith(b) || b.startsWith(a)); };
  function kmFindClass(p) {
    const cs = classesSorted();
    let cands = cs.filter(c => c.kmKurs && normKurs(c.kmKurs) === normKurs(p.kurs));
    if (!cands.length) { // Kurs, in dem die meisten Kürzel vorkommen – nie ein Kurs mit anderem Fach
      const ks = new Set(p.ergebnisse.map(e => e.k));
      const fits = c => !normKurs(c.subject) || !normKurs(p.fach) || fachMatch(c, p.fach);
      const sc = cs.filter(fits).map(c => [c, studentsOf(c.id).filter(s => s.km && ks.has(s.km)).length]);
      const best = Math.max(0, ...sc.map(x => x[1]));
      cands = best ? sc.filter(x => x[1] === best).map(x => x[0]) : [];
    }
    if (cands.length > 1) { const f = cands.filter(c => fachMatch(c, p.fach)); if (f.length) cands = f; }
    if (cands.length > 1) { const f = cands.filter(c => normKurs(c.name) && normKurs(p.kurs).includes(normKurs(c.name))); if (f.length) cands = f; }
    return cands.length === 1 ? cands[0] : null;
  }
  // Eine Note pro Kind und Arbeit. Zeitstempel = Stand der Auswertung: spätere
  // Änderungen im Notenheft bleiben stehen, eine neuere Auswertung gewinnt.
  function kmApply(p, c) {
    const aid = 'km-' + p.id, stand = p.stand;
    const ex = S.data.assessments[aid];
    if (ex && ex.deleted && (ex.updatedAt || 0) >= stand) return { skipped: true, c, n: 0, missing: [] };
    const byKm = new Map(studentsOf(c.id).filter(s => s.km).map(s => [s.km, s]));
    const missing = p.ergebnisse.filter(e => !byKm.has(e.k)).map(e => e.k);
    let n = 0;
    commit(d => {
      const old = d.assessments[aid];
      if (!old || old.deleted || (!p.nachschrift && (old.updatedAt || 0) < stand)) {
        const linked = new Set(live(d.assessments).map(a => a.eventId).filter(Boolean));
        const ev = live(d.events).find(e => e.type === 'pruefung' && e.classId === c.id && e.date === p.datum && !linked.has(e.id));
        const base = old && !old.deleted ? old : { id: aid, type: 'schriftlich', eventId: ev ? ev.id : null };
        d.assessments[aid] = Object.assign({}, base, { classId: c.id, title: p.titel, date: p.datum, km: p.id, kmMissing: p.nachschrift ? (base.kmMissing || []) : missing, updatedAt: stand });
      }
      for (const e of p.ergebnisse) {
        const s = byKm.get(e.k);
        if (!s) continue;
        const id = aid + '|' + s.id, prev = d.results[id];
        // Fokusschwerpunkt als Beobachtung beim Kind (erscheint auch auf dem Elternsprechtag-Blatt)
        const oPrev = d.obs[id];
        if (e.fokus && !(oPrev && (oPrev.updatedAt || 0) >= stand)) d.obs[id] = { id, classId: c.id, studentId: s.id, date: p.datum, text: `Fokus (${p.titel}): ${e.fokus}`, km: p.id, updatedAt: stand };
        if (prev && (prev.updatedAt || 0) >= stand) continue;
        const value = e.note == null ? null : gridValue(e.note);
        if (e.note != null && value == null) continue;
        d.results[id] = Object.assign({ id, assessmentId: aid, studentId: s.id, value, label: value != null ? gridLabel(value) : 'nt', updatedAt: stand }, e.fokus ? { fokus: e.fokus } : {});
        n++;
      }
      if (c.kmKurs !== p.kurs && p.kurs) d.classes[c.id] = Object.assign({}, d.classes[c.id], { kmKurs: p.kurs, updatedAt: now() });
      nsTodoSync(d, d.assessments[aid]);
    });
    return { c, n, missing };
  }
  function kmProcess(p) {
    const ex = S.data.assessments['km-' + p.id];
    const exCls = ex && !ex.deleted && S.data.classes[ex.classId];
    const c = exCls && !exCls.deleted ? exCls : kmFindClass(p);
    const pend = S.device.kmPending || (S.device.kmPending = {});
    if (!c) { pend[p.quelle] = p; return { pending: true }; }
    delete pend[p.quelle];
    return kmApply(p, c);
  }
  function kmReport(r, p) {
    if (r.pending) return toast(`Neue Noten „${p.titel}“ (${p.kurs}) – bitte unter Kurs → Arbeiten/Klausuren einem Kurs zuordnen.`, { ms: 7000 });
    if (r.skipped) return;
    toast(`Klausurmanager: „${p.titel}“ – ${plural(r.n, 'Note', 'Noten')} in ${clsLabel(r.c)}${r.missing.length ? ` · ${plural(r.missing.length, 'Kürzel', 'Kürzel')} ohne Kind (Kürzel-Tabelle einlesen)` : ''}`, { ms: 6000 });
  }
  const kmIsTest = id => /^ewh-notentest-/.test(id || ''); // Notenabgleich des Klausurmanagers – nie ins Notenheft
  function kmRetryPending() { // z. B. nachdem die Kürzel-Tabelle eingelesen oder der Kurs auf dem anderen Gerät zugeordnet wurde
    let ch = false;
    const pend = S.device.kmPending || {};
    for (const k of Object.keys(pend)) if (kmIsTest(k) || kmIsTest(pend[k].id)) { delete pend[k]; ch = true; }
    if (live(S.data.assessments).some(a => kmIsTest(a.km))) commit(d => {
      for (const a of live(d.assessments).filter(x => kmIsTest(x.km))) {
        for (const r of Object.values(d.results)) if (!r.deleted && r.assessmentId === a.id) d.results[r.id] = { id: r.id, deleted: true, updatedAt: now() };
        d.assessments[a.id] = { id: a.id, deleted: true, updatedAt: now() };
      }
    });
    for (const p of kmPendingList()) { if (!kmFindClass(p)) continue; kmReport(kmProcess(p), p); ch = true; }
    if (ch) { persistLocal(); softRender(); }
    return ch;
  }
  async function kmInbox({ force = false } = {}) {
    if (!S.data || !kmKey() || !ghReady() || kmRunning) return;
    if (!force && now() - kmLastCheck < KM_CHECK_MS) return;
    kmRunning = true; kmLastCheck = now();
    try {
      const g = S.device.gh;
      const files = await GH.list(g, KM_DIR);
      const seen = S.device.kmSeen || (S.device.kmSeen = {});
      let ch = false;
      for (const f of files) {
        if (!/\.json$/i.test(f.name) || seen[f.name] === f.sha) continue;
        let p;
        try {
          const got = await GH.get(Object.assign({}, g, { path: f.path }));
          if (!got) continue;
          const obj = await kmDecrypt(got.blob);
          p = obj && obj.format === 'km-kalender' ? kmCalCheck(obj) : kmCheck(obj);
        } catch (e) {
          console.warn('Klausurmanager-Eingang', f.name, e.message);
          if (e.code === 'KM_KEY') { seen[f.name] = f.sha; ch = true; }
          continue;
        }
        if (!S.data) return;
        seen[f.name] = f.sha; ch = true;
        if (!p.kalender && kmIsTest(p.id)) continue;
        if (p.kalender) kmCalReport(kmCalApply(p), p); else kmReport(kmProcess(p), p);
      }
      if (kmRetryPending() || ch) { persistLocal(); softRender(); }
    } finally { kmRunning = false; }
  }
  async function kmShowCode() {
    if (!ghReady()) return toast('Bitte zuerst die Synchronisierung über GitHub einrichten (Mehr → Synchronisierung).', { error: true, ms: 6000 });
    const k = await kmEnsureKey();
    const g = S.device.gh;
    const code = 'KM1.' + b64url(utf8(JSON.stringify({ v: 1, owner: g.owner, repo: g.repo, pub: k.pub })));
    await openModal({
      title: 'Verbindungscode für den Klausurmanager',
      body: `<p>Diesen Code einmal am PC an den Klausurmanager geben. Danach kommen die Noten jeder ausgewerteten Klausur automatisch unter <strong>Kurs → Arbeiten/Klausuren</strong> an.</p>
        <p class="muted small">Der Code ist kein Geheimnis: Er enthält nur deinen GitHub-Namen, den Namen des privaten Daten-Repos und ein „offenes Schloss“ (öffentlicher Schlüssel). Damit kann der Klausurmanager Noten nur verschlüsseln, nicht lesen. Dein Passwort und dein Token sind nicht enthalten.</p>
        <textarea class="code" readonly rows="5">${code}</textarea>`,
      actions: [{ label: 'Schließen', value: null }, {
        label: 'Kopieren', cls: 'primary', run: async root => {
          try { await navigator.clipboard.writeText(code); toast('Code kopiert'); }
          catch { root.querySelector('textarea').select(); toast('Bitte markierten Code kopieren', { error: true }); }
          return false;
        }
      }]
    });
  }
  async function kmImportText(text) {
    try {
      const raw = String(text || '').trim();
      const obj = await kmDecrypt(JSON.parse(raw.slice(raw.indexOf('{'))));
      if (obj && obj.format === 'km-kalender') { const c = kmCalCheck(obj); kmCalReport(kmCalApply(c), c, true); persistLocal(); render(); return true; }
      const p = kmCheck(obj);
      const r = kmProcess(p);
      persistLocal();
      kmReport(r, p);
      render();
      return true;
    } catch (e) { toast(e instanceof SyntaxError ? 'Das ist kein Ergebnis aus dem Klausurmanager.' : e.message, { error: true, ms: 6000 }); return false; }
  }
  async function kmImportFile(file) { if (file) await kmImportText(await file.text()); }
  // „An Notenheft senden“ in der Korrektur-App kopiert das verschlüsselte Ergebnis – hier einfügen
  async function kmPasteDialog() {
    if (!kmKey()) return toast('Erst unter Mehr → Klausurmanager den Verbindungscode erstellen.', { error: true });
    const text = await openModal({
      title: 'Ergebnis aus der Korrektur-App einfügen', autofocus: true,
      body: `<p class="muted small">In der Korrektur-App „An Notenheft senden“ tippen, dann hier einfügen. Der Text ist verschlüsselt und enthält nur Kürzel, Noten und Fokusschwerpunkte.</p>
        <button type="button" class="btn small" id="m-clip">${icon('copy')} Aus der Zwischenablage holen</button>
        <textarea id="m-km" class="code" rows="5" placeholder="{&quot;format&quot;:&quot;notenheft-km&quot; …" autocapitalize="off" autocorrect="off" spellcheck="false"></textarea>`,
      mount: root => root.querySelector('#m-clip').addEventListener('click', async () => {
        try { root.querySelector('#m-km').value = await navigator.clipboard.readText(); } catch { toast('Bitte lange in das Feld tippen und „Einsetzen“ wählen.', { ms: 5000 }); }
      }),
      actions: [{ label: 'Abbrechen', value: null }, { label: 'Übernehmen', cls: 'primary', run: root => root.querySelector('#m-km').value.trim() || false }]
    });
    if (text) await kmImportText(text);
  }
  /* ---------- Kalender aus dem Klausurmanager: Outlook-Schulkonto, Google (privat), WebUntis ---------- */
  const CAL_DT = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;
  function kmCalCheck(p) {
    if (!p || p.format !== 'km-kalender' || !/^[a-z0-9_-]{1,30}$/.test(p.quelle || '') || !['schule', 'privat', 'untis'].includes(p.art) || !Array.isArray(p.termine))
      throw new Error('Die Kalenderdatei ist unvollständig.');
    return {
      kalender: true, quelle: p.quelle, name: String(p.name || p.quelle).slice(0, 40), art: p.art, stand: Number(p.stand) || now(),
      termine: p.termine.filter(t => t && CAL_DT.test(t.start || '') && CAL_DT.test(t.ende || t.start)).slice(0, 5000).map(t => ({
        id: String(t.id || '').slice(0, 40), start: t.start, ende: t.ende || t.start, ganztags: !!t.ganztags,
        titel: String(t.titel || '').slice(0, 120), ort: String(t.ort || '').slice(0, 80), entfall: !!t.entfall, aenderung: !!t.aenderung, info: String(t.info || '').slice(0, 500) }))
    };
  }
  function kmCalApply(p) {
    const old = S.data.calendars[p.quelle];
    if (old && !old.deleted && (old.updatedAt || 0) >= p.stand) return { n: 0, aus: 0 };
    let aus = 0;
    commit(d => {
      d.calendars[p.quelle] = { id: p.quelle, name: p.name, art: p.art, stand: p.stand, termine: p.termine, updatedAt: p.stand };
      if (p.art !== 'untis') return;
      // WebUntis: Entfall einer eigenen Stunde → Ausfall für diesen Kurs (eine Löschung im Notenheft bleibt bestehen)
      for (const t of p.termine.filter(x => x.entfall && !x.ganztags)) {
        const date = t.start.slice(0, 10), time = t.start.slice(11, 16);
        for (const l of lessonsOn(date).filter(x => !x.away && x.start === time)) {
          const id = 'untis-' + t.id + '-' + l.cls.id, prev = d.events[id];
          if (prev) continue;
          d.events[id] = { id, type: 'ausfall', kind: null, classId: l.cls.id, date, note: 'Entfall laut WebUntis', updatedAt: p.stand };
          aus++;
        }
      }
    });
    return { n: p.termine.length, aus };
  }
  function kmCalReport(r, p, loud = false) {
    if (r.aus) toast(`WebUntis: ${plural(r.aus, 'Ausfall', 'Ausfälle')} eingetragen`, { ms: 5000 });
    else if (loud) toast(`${p.name}: ${plural(r.n, 'Termin', 'Termine')} übernommen`);
  }
  const calTime = t => t.ganztags ? 'ganztägig' : t.start.slice(11, 16);
  const CAL_HIDE_DEFAULT = ['Offene Sprechstunde Fr. Kretschmann-Dulisch'];
  const normT = x => String(x || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const calHidden = t => { const list = (S.data.prefs?.calhide?.titles || CAL_HIDE_DEFAULT).map(normT); const n = normT(t.titel); return list.some(h => h && n.startsWith(h)); };
  // Termin vorbei? – seit etwa einer Stunde beendet (ganztägige: ab dem Folgetag)
  const calDone = t => t.ganztags ? t.ende.slice(0, 10) < todayISO() : new Date(t.ende).getTime() < now() - 3600000;
  function calItemsOn(iso, { alle = false } = {}) { // Kalendertermine eines Tages; WebUntis nur Vertretungen (Stunden, die nicht im eigenen Plan stehen)
    const out = [];
    for (const c of live(S.data.calendars)) for (const t of c.termine || []) {
      if (iso < t.start.slice(0, 10) || iso > t.ende.slice(0, 10)) continue;
      if (!alle && calDone(t)) continue;
      if (c.art === 'untis' && (t.entfall || t.ganztags || !t.aenderung)) continue; // nur ausdrücklich gekennzeichnete Vertretungen/Verlegungen
      if (calHidden(t)) continue;
      out.push(Object.assign({}, t, { art: c.art === 'privat' ? 'privat' : 'schule', untis: c.art === 'untis' }));
    }
    return out.sort((a, b) => (a.ganztags ? '0' : '1' + a.start).localeCompare(b.ganztags ? '0' : '1' + b.start));
  }
  const calLi = t => `<li class="cal-li ${t.art}"><i class="cal-dot"></i><span><b>${calTime(t)}</b> ${t.untis ? 'Vertretung: ' : ''}${esc(t.titel || 'Termin')}${t.ort ? ` <small class="muted">· ${esc(t.ort)}</small>` : ''}</span></li>`;
  function calRow(t, iso) {
    const von = t.ganztags ? 'ganztägig' : `${t.start.slice(11, 16)}–${t.ende.slice(11, 16)} Uhr`;
    const tage = t.start.slice(0, 10) !== t.ende.slice(0, 10) ? ` · bis ${fmtISO(t.ende.slice(0, 10), true)}` : '';
    return `<details class="cal-det ${t.art}"><summary class="ev-row cal-row ${t.art}">${picto('termin')}<span class="ev-date"><b>${WD[wdOf(iso)]}</b>${fmtISO(iso)}</span><span class="ev-main"><strong>${t.untis ? 'WebUntis: ' : ''}${esc(t.titel || 'Termin')}</strong><small>${calTime(t)}${t.ort ? ' · ' + esc(t.ort) : ''} · ${t.art === 'privat' ? 'Privat' : 'Schulkalender'}</small></span></summary>
      <div class="cal-more"><p><b>${von}</b>${tage}</p>${t.ort ? `<p>Ort: ${esc(t.ort)}</p>` : ''}${t.info ? `<p class="cal-info">${esc(t.info)}</p>` : ''}
        <p class="muted small">${t.art === 'privat' ? 'Privater Kalender (Google)' : t.untis ? 'WebUntis' : 'Schulkalender (Outlook)'}</p>
        ${isIOS() ? `<a class="btn small" href="calshow:${Math.floor(new Date(t.ganztags ? t.start.slice(0, 10) + 'T08:00' : t.start).getTime() / 1000) - 978307200}">${icon('cal')} Im iOS-Kalender öffnen</a>` : ''}
        <button type="button" class="btn small ghost" data-action="calHide" data-t="${esc(t.titel || '')}">Solche Termine nie mehr anzeigen</button></div></details>`;
  }
  async function ewhCatalogRefresh() { // Katalog der Korrektur-App (öffentliches Repo ewh): welche Klausuren sind fertig korrigiert?
    if (!ghReady()) return;
    const c = S.device.ewhCat;
    if (c && now() - c.at < 6 * 3600000) return;
    const g = S.device.gh;
    const r = await GH.req(g, `${GH.base}/repos/${encodeURIComponent(g.owner)}/ewh/contents/klausuren/index.json`, { headers: { Accept: 'application/vnd.github.raw+json' } });
    if (!r.ok) return;
    const j = await r.json();
    S.device.ewhCat = { at: now(), list: (j.klausuren || []).filter(e => e.status === 'fertig' && e.id && !/^ewh-notentest-/.test(e.id)).map(e => ({ id: e.id, titel: String(e.titel || e.id).slice(0, 80), kurs: String(e.kurs || ''), fertig: String(e.fertig_am || ''), ns: !!e.nachschrift_von })) };
    persistLocal();
  }
  function kmMissingResults() {
    const t = todayISO(), ign = S.data.prefs?.kmignore?.ids || [];
    return (S.device.ewhCat?.list || []).filter(e => {
      if (e.ns || ign.includes(e.id)) return false;
      const m = e.fertig.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
      if (!m || diffDays(`${m[3]}-${pad(+m[2])}-${pad(+m[1])}`, t) < 1) return false;
      const a = S.data.assessments['km-' + e.id];
      return !(a && !a.deleted) && !kmPendingList().some(p => p.id === e.id);
    });
  }
  async function kmAskDialog(id) {
    const e = kmMissingResults().find(x => x.id === id);
    if (!e) return;
    const v = await openModal({
      title: 'Noten fehlen noch',
      body: `<p><strong>${esc(e.titel)}</strong> (${esc(e.kurs)}) ist seit ${esc(e.fertig)} fertig korrigiert, aber im Notenheft sind noch keine Noten angekommen.</p>
        <p class="muted small">Entweder am PC die Auswertung laufen lassen („Auswertung liegt vor“) – die Noten kommen dann von selbst. Oder in der Korrektur-App „An Notenheft senden“ tippen und hier einfügen.</p>`,
      actions: [{ label: 'Nicht mehr fragen', value: 'ign' }, { label: 'Schließen', value: null }, { label: 'Ergebnis einfügen', cls: 'primary', value: 'paste' }]
    });
    if (v === 'paste') return kmPasteDialog();
    if (v === 'ign') commit(d => { d.prefs.kmignore = { id: 'kmignore', ids: [...(S.data.prefs?.kmignore?.ids || []), id], updatedAt: now() }; });
  }

  /* ---------- Termine verschlüsselt an den PC (Excel „Notenheft-Termine.xlsx“ in OneDrive) ---------- */
  async function kmEncryptFor(pub, obj) {
    const empf = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: pub.x, y: pub.y }, KM_ALG, false, []);
    const einmal = await crypto.subtle.generateKey(KM_ALG, true, ['deriveBits']);
    const geheim = await crypto.subtle.deriveBits({ name: 'ECDH', public: empf }, einmal.privateKey, 256);
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const hk = await crypto.subtle.importKey('raw', geheim, 'HKDF', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt, info: utf8('notenheft-pc-v1') }, hk, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, utf8(JSON.stringify(obj))));
    const epk = await crypto.subtle.exportKey('jwk', einmal.publicKey);
    return { format: 'notenheft-pc', v: 1, epk: { kty: 'EC', crv: 'P-256', x: epk.x, y: epk.y }, salt: bytesToB64(salt), iv: bytesToB64(iv), ct: bytesToB64(ct) };
  }
  // Alles für die automatisch erzeugte Ganzjahresplanung (keine Namen von Kindern)
  function planExport() {
    const tc = termCfg(), P = periods();
    const kurse = classesSorted().map(c => ({ id: c.id, kurs: clsLabel(c), name: c.name, fach: c.subject || '', raum: c.room || '', stufe: levelOf(c),
      wochenstunden: weeklyHours(c), arbeiten: { HJ1: examsRequired(c, 'HJ1'), HJ2: examsRequired(c, 'HJ2') },
      raster: (c.slots || []).map(sl => ({ tag: sl.wd, von: sl.from, bis: sl.to, raum: sl.room || '', ab: sl.validFrom || '', bisDatum: sl.validTo || '', beginn: periodTimes(sl.from, sl.to).start, ende: periodTimes(sl.from, sl.to).end })) }));
    const stunden = [];
    for (let d = tc.start; d <= tc.end; d = addDaysISO(d, 1)) {
      if (wdOf(d) >= 5) continue;
      for (const l of lessonsOn(d)) stunden.push({ datum: d, kursId: l.cls.id, kurs: clsLabel(l.cls), von: l.from, bis: l.to, std: l.hours, beginn: l.start, ende: l.end, raum: l.room || '',
        plan: l.away ? 'getauscht' : l.cancelled ? 'ausgefallen' : 'regulär', grund: l.away ? l.cancelled || 'Tausch' : l.cancelled || (l.swapIn ? `Tausch (statt ${swapName(l.swapFrom, l.cls)})` : '') });
    }
    const pruefungen = live(S.data.events).filter(e => e.type === 'pruefung' && e.classId && S.data.classes[e.classId]).map(e => {
      const a = live(S.data.assessments).find(x => x.eventId === e.id || (x.classId === e.classId && Math.abs(diffDays(x.date, e.date)) <= 7 && x.type !== 'vokabel'));
      return { id: e.id, datum: e.date, kursId: e.classId, kurs: clsLabel(S.data.classes[e.classId]), art: e.kind || 'Prüfung', notiz: e.note || '', noten: a ? live(S.data.results).filter(r => r.assessmentId === a.id && r.value != null).length : 0 };
    }).sort((a, b) => a.datum.localeCompare(b.datum));
    const feiertageListe = [];
    for (const y of [tc.sy, tc.sy + 1]) for (const [d, n] of feiertage(y)) if (d >= tc.start && d <= tc.end) feiertageListe.push({ datum: d, name: n });
    return { schuljahr: `${tc.sy}/${String(tc.sy + 1).slice(2)}`, start: tc.start, ende: tc.end, hj1Ende: tc.hj1End, perioden: P, kurse, stunden, pruefungen,
      feiertage: feiertageListe.sort((a, b) => a.datum.localeCompare(b.datum)) };
  }
  async function pcExport() {
    if (!S.data || !ghReady()) return;
    const g = S.device.gh;
    if (!S.device.pcPub || now() - (S.device.pcPubAt || 0) > 86400000) {
      const f = await GH.getText(g, 'pc/schluessel.json');
      if (!f) return;
      try { S.device.pcPub = JSON.parse(f.text).pub; S.device.pcPubAt = now(); } catch { return; }
    }
    const termine = live(S.data.events).filter(e => e.type !== 'tausch').map(e => ({ id: e.id, datum: e.date, art: e.type, titel: evTitle(e), kurs: e.classId && S.data.classes[e.classId] ? clsLabel(S.data.classes[e.classId]) : '', notiz: e.note || '', termin: e.terminId || '' }))
      .sort((a, b) => a.datum.localeCompare(b.datum));
    const ferien = live(S.data.holidays).map(h => ({ name: h.name, von: h.from, bis: h.to })).sort((a, b) => a.von.localeCompare(b.von));
    const plan = planExport();
    const key = JSON.stringify({ termine, ferien, plan });
    if (S.device.pcLast === key) return;
    const blob = await kmEncryptFor(S.device.pcPub, { format: 'nh-termine', v: 2, stand: now(), termine, ferien, plan });
    await GH.putText(g, 'ausgang/termine.json', JSON.stringify(blob), 'Notenheft: Termine für den PC');
    S.device.pcLast = key; persistLocal();
  }
  function kmPendingPanel(c) {
    const pend = kmPendingList();
    if (!pend.length) return '';
    const hasKm = studentsOf(c.id).some(s => s.km);
    return `<section class="panel km-pend"><h2>${icon('download')} Neue Noten aus dem Klausurmanager</h2>
      <p class="muted small">Der Kurs ließ sich nicht eindeutig zuordnen.${hasKm ? '' : ' Tipp: Erst unter Kinder (Zahnrad) die Kürzel-Tabelle einlesen – dann klappt die Zuordnung automatisch.'}</p>
      ${pend.map(p => `<div class="km-row"><div><strong>${esc(p.titel)}</strong><span class="muted small">${esc(p.kurs)} · ${fmtISO(p.datum, true)} · ${plural(p.ergebnisse.length, 'Kürzel', 'Kürzel')}${p.nachschrift ? ' · Nachschrift' : ''}</span></div>
        <div class="btnrow"><button type="button" class="btn small primary" data-action="kmAssign" data-key="${esc(p.quelle)}" data-cid="${c.id}">In ${esc(clsLabel(c))} eintragen</button>
        <button type="button" class="btn small ghost" data-action="kmDismiss" data-key="${esc(p.quelle)}">Verwerfen</button></div></div>`).join('')}
    </section>`;
  }

  /* ---------- Kürzel-Tabelle: Kinder samt Kürzel übernehmen (nur Vorname, Nachname, Kürzel) ---------- */
  async function importKuerzel(file) {
    const c = S.data.classes[S.courseId];
    if (!file || !c) return;
    let sheets;
    try { sheets = await readXlsx(file); } catch (e) { return toast(e.message, { error: true }); }
    // Es werden ausschließlich Vorname, Nachname und „Kürzel (final)“ gelesen – E-Mail-Adressen u. Ä. werden ignoriert.
    const tables = {};
    for (const name of Object.keys(sheets)) {
      const rows = sheetTable({ [name]: sheets[name] }, name, ['Vorname', 'Nachname', 'Kürzel'])
        .map(o => ({ first: String(o['vorname'] ?? '').trim(), last: String(o['nachname'] ?? '').trim(), km: String(o['kürzel (final)'] ?? pick(o, 'kürzel') ?? '').trim() }))
        .filter(r => r.km && (r.first || r.last));
      if (rows.length) tables[name] = rows;
    }
    const names = Object.keys(tables);
    if (!names.length) return toast('Keine Tabelle mit „Vorname“, „Nachname“ und „Kürzel (final)“ gefunden.', { error: true });
    const want = normKurs(c.name);
    const guess = names.find(n => normKurs(n) === want) || names.find(n => want && (normKurs(n).includes(want) || want.includes(normKurs(n)))) || names[0];
    const plan = sheet => {
      const sts = studentsOf(c.id), used = new Set();
      const out = tables[sheet].map(r => {
        let s = sts.find(x => x.km === r.km && !used.has(x.id));
        if (!s) s = matchStudent(r.first, r.last, sts.filter(x => !used.has(x.id) && (!x.km || x.km === r.km)));
        if (s) used.add(s.id);
        return Object.assign({}, r, { s });
      });
      // Neue Kinder heißen „Vorname N.“, bei Doppelungen im Kurs mit vollem Nachnamen
      const short = r => `${r.first} ${r.last ? r.last[0] + '.' : ''}`.trim();
      const cnt = {};
      for (const k of [...sts.map(s => normName(s.name)), ...out.filter(r => !r.s).map(r => normName(short(r)))]) cnt[k] = (cnt[k] || 0) + 1;
      for (const r of out) if (!r.s) r.name = (cnt[normName(short(r))] > 1 ? `${r.first} ${r.last}`.trim() : short(r)).slice(0, 80);
      return { out, rest: sts.filter(s => !used.has(s.id)).length };
    };
    const preview = sheet => {
      const { out, rest } = plan(sheet);
      return `<div class="imp-list">${out.map(r => `<div class="imp-row"><span class="imp-name">${esc(r.s ? r.s.name : r.name)}</span><span class="res-chip none">${esc(r.km)}</span><span class="muted small">${r.s ? (r.s.km === r.km ? 'schon da' : 'vorhanden – Kürzel ergänzt') : 'neu'}</span></div>`).join('')}</div>
        <p class="muted small">${plural(out.filter(r => r.s).length, 'Kind', 'Kinder')} erkannt, ${plural(out.filter(r => !r.s).length, 'Kind', 'Kinder')} neu.${rest ? ` ${plural(rest, 'Kind', 'Kinder')} im Kurs ${rest === 1 ? 'steht' : 'stehen'} nicht in diesem Blatt und ${rest === 1 ? 'bleibt' : 'bleiben'} unverändert.` : ''}</p>`;
    };
    const res = await openModal({
      title: 'Kinder aus der Kürzel-Tabelle',
      body: `<p class="muted small">Übernommen werden nur Vorname, Nachname und Kürzel. Die Namen bleiben auf diesem Gerät, online liegen nur die Kürzel. Vorhandene Kinder und ihre Noten bleiben erhalten.</p>
        ${names.length > 1 ? `<label class="field"><span>Tabellenblatt</span><select id="m-sh">${names.map(n => `<option value="${esc(n)}" ${n === guess ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>` : ''}
        <div id="m-prev">${preview(guess)}</div>`,
      mount: root => { const sel = root.querySelector('#m-sh'); if (sel) sel.addEventListener('change', () => { root.querySelector('#m-prev').innerHTML = preview(sel.value); }); },
      actions: [{ label: 'Abbrechen', value: null }, { label: 'Übernehmen', cls: 'primary', run: root => plan(root.querySelector('#m-sh')?.value || guess).out }]
    });
    if (!res) return;
    let upd = 0, add = 0;
    commit(d => {
      const usedC = usedCodes(d), nm = S.device.names || (S.device.names = {});
      for (const r of res) {
        if (r.s) { if (r.s.km !== r.km) { d.students[r.s.id] = Object.assign({}, d.students[r.s.id], { km: r.km, updatedAt: now() }); upd++; } }
        else { const id = uid(); nm[id] = r.name; d.students[id] = { id, classId: c.id, code: newCode(usedC), km: r.km, updatedAt: now() }; add++; }
      }
    });
    toast(upd || add ? `${plural(add, 'Kind', 'Kinder')} neu, ${upd} Kürzel ergänzt` : 'Alles war schon aktuell');
    kmRetryPending();
  }

  /* ---------- Zeugnis & Blaue Briefe ---------- */
  function termSelect(c) {
    return `<label class="sel"><span class="sr">Zeitraum</span><select data-change="setZTerm">${termsFor(levelOf(c)).map(t => `<option value="${t.key}" ${t.key === S.zTerm ? 'selected' : ''}>${t.label} (${fmtISO(t.from)}–${fmtISO(t.to)})</option>`).join('')}</select></label>`;
  }
  function viewZeugnis() {
    const c = ensureClass();
    if (!c) return emptyState('Noch kein Kurs angelegt', '', `<button type="button" class="btn primary" data-action="newClass">${icon('plus')} Kurs anlegen</button>`);
    const terms = termsFor(levelOf(c));
    if (!S.zTerm || !terms.some(t => t.key === S.zTerm)) { const t = todayISO(); S.zTerm = (terms.find(x => x.zeugnis && t >= x.from && t <= x.to) || terms.find(x => x.zeugnis)).key; }
    const ws = warnInfo(c).filter(w => w.was4 && w.drift && !w.warned).length;
    let html = `<div class="toolbar">${classSelect()}${S.zTab !== 'warn' ? termSelect(c) : ''}</div>
      <div class="seg full"><button type="button" data-action="zTab" data-tab="noten" class="${S.zTab !== 'warn' ? 'on' : ''}">Zeugnisnoten</button><button type="button" data-action="zTab" data-tab="warn" class="${S.zTab === 'warn' ? 'on' : ''}">Blaue Briefe${ws ? ` <span class="badge">${ws}</span>` : ''}</button></div>`;
    if (S.zTab === 'warn') return html + viewWarn(c);
    const t = terms.find(x => x.key === S.zTerm);
    const students = studentsOf(c.id);
    if (!students.length) return html + emptyState('Keine Kinder in diesem Kurs', '', '', 'users');
    const rows = students.map(s => ({ s, r: calc(s, t, c) }));
    html += `<p class="muted small range-info">${isSII(c) ? 'Oberstufe: Zeugnis in Punkten. ' : 'Sek I: Noten mit Tendenz (1,7 = 2+ · 2,0 = 2 · 2,3 = 2-). '}Gewichtung: schriftlich 50 % · SoMi 50 %${c.vocab ? ' (SoMi inkl. Vokabeltests, anteilig nach Anzahl)' : ''}${t.parts ? ' · SoMi = Schnitt der beiden Quartale' : ''}. Zeile antippen zum Korrigieren.</p>
      <div class="table-wrap"><table class="ov zt">
      <thead><tr><th>Name</th><th class="num">SoMi</th><th class="num">Schriftl.</th><th class="num">Vorschlag</th><th class="num">Zeugnis</th><th>Korrektur</th><th>Begründung</th></tr></thead>
      <tbody>${rows.map(({ s, r }) => `<tr data-action="zOverride" data-sid="${s.id}" tabindex="0" class="${r.override ? 'ovr' : ''}">
        <td>${esc(s.name)}</td>
        <td class="num">${r.somi != null ? fmtNum(r.somi, 2) : '–'}${r.vCount ? `<small class="sub">Vok. ${Math.round(r.vShare * 100)} %</small>` : ''}${r.quarterSomi ? `<small class="sub">${r.quarterSomi.map(q => q != null ? fmtNum(q, 1) : '–').join(' / ')}</small>` : ''}</td>
        <td class="num">${r.schr != null ? fmtNum(r.schr, 2) : '–'}</td>
        <td class="num"><span class="avg ${valCls(r.suggest)} light">${gradeText(c, r.suggest)}</span></td>
        <td class="num"><span class="avg ${valCls(r.final)}">${gradeText(c, r.final)}</span></td>
        <td>${r.override ? (dirHtml(r.dir) || '<span class="dir">manuell</span>') : ''}</td>
        <td class="reason">${r.override ? esc(r.override.reason || '') : ''}</td></tr>`).join('')}</tbody></table></div>
      <div class="export">
        <button type="button" class="btn" data-action="printConference">${icon('print')} Zeugniskonferenz drucken / PDF</button>
        <button type="button" class="btn" data-action="exportZeugnis">${icon('download')} Als CSV</button>
      </div>`;
    return html;
  }
  async function overrideDialog(c, s, t) {
    const r = calc(s, t, c);
    const sii = isSII(c);
    let val = r.final;
    const opts = sii ? Array.from({ length: 16 }, (_, i) => 15 - i).map(p => [String(p), pointsToValue(p), `${p}`]) : GRID.map(([l, v]) => [l, v, l]);
    const sel = v => v != null && opts.find(o => Math.abs(o[1] - v) < 1e-6);
    const line = (l, v, n) => `<div class="calc-row"><span>${l}</span><strong>${v != null ? fmtNum(v, 2) : '–'}</strong>${n != null ? `<small>${n}</small>` : ''}</div>`;
    const res = await openModal({
      title: `${s.name} · ${t.label}`,
      body: `<div class="calc">
          ${line('Mündlich Ø', r.mAvg, plural(r.mCount, S.data.settings.weighting === 'woche' ? 'Woche' : 'Note', S.data.settings.weighting === 'woche' ? 'Wochen' : 'Noten'))}
          ${c.vocab ? line('Vokabeltests Ø', r.vAvg, `${plural(r.vCount, 'Test', 'Tests')} · ${Math.round(r.vShare * 100)} % der SoMi`) : ''}
          ${line(t.parts ? 'SoMi (Schnitt der Quartale)' : 'SoMi', r.somi, r.quarterSomi ? r.quarterSomi.map(q => q != null ? fmtNum(q, 2) : '–').join(' / ') : null)}
          ${line(r.weighted ? 'Schriftlich Ø (gewichtet)' : 'Schriftlich Ø', r.schr, plural(r.sCount, 'Arbeit', 'Arbeiten'))}
          ${line('Gesamt (50 / 50)', r.total, null)}
          <div class="calc-row big"><span>Vorschlag</span><strong>${gradeText(c, r.suggest)}</strong></div>
        </div>
        <div class="field"><span>Zeugnisnote${sii ? ' (Punkte)' : ''}</span><div class="grade-grid ${sii ? 'pts' : ''}" id="m-g">${opts.map(o => `<button type="button" class="gbtn g${Math.min(6, Math.max(1, Math.round(o[1] + 1e-9)))} ${sel(val) && sel(val)[0] === o[0] ? 'on' : ''} ${sel(r.suggest) && sel(r.suggest)[0] === o[0] ? 'sug' : ''}" data-v="${o[1]}" data-k="${o[0]}">${o[2]}</button>`).join('')}</div>
          <small class="muted">Umrandet: Vorschlag der App</small></div>
        <label class="field"><span>Begründung (bei Korrektur)</span><input id="m-reason" maxlength="160" value="${esc(r.override?.reason || '')}" placeholder="z. B. deutliche Steigerung im 2. Quartal"></label>
        <button type="button" class="link" data-close="detail">${icon('chart')} Entwicklung &amp; Details ansehen</button>`,
      mount: (root, close) => {
        root.querySelector('#m-g').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; val = +b.dataset.v; root.querySelectorAll('#m-g button').forEach(x => x.classList.toggle('on', x === b)); });
        root.querySelector('[data-close=detail]').addEventListener('click', () => close('__detail'));
      },
      actions: [...(r.override ? [{ label: 'Vorschlag übernehmen', value: '__reset' }] : []), { label: 'Abbrechen', value: null },
        { label: 'Speichern', cls: 'primary', run: root => ({ v: val, reason: root.querySelector('#m-reason').value.trim() }) }]
    });
    if (!res) return;
    if (res === '__detail') { S.detailStudent = s.id; S.detailFrom = 'zeugnis'; S.notenTab = 'uebersicht'; render(); window.scrollTo(0, 0); return; }
    if (res === '__reset' || res.v == null || (r.suggest != null && Math.abs(res.v - r.suggest) < 1e-6 && !res.reason)) {
      if (r.override) commit(d => { d.overrides[r.key] = { id: r.key, deleted: true, updatedAt: now() }; });
      return;
    }
    commit(d => { d.overrides[r.key] = { id: r.key, classId: c.id, studentId: s.id, term: `${termCfg().sy}-${t.key}`, value: res.v, suggestAtTime: r.suggest, reason: res.reason, updatedAt: now() }; });
    toast('Zeugnisnote gespeichert');
  }
  function viewWarn(c) {
    const tc = termCfg();
    const dl = tc.warnDeadline;
    const days = dl ? diffDays(todayISO(), dl) : null;
    const info = warnInfo(c).sort((a, b) => byLastName(a.s.name, b.s.name));
    const need = info.filter(w => w.was4), extra = info.filter(w => !w.was4 && !w.was56 && w.drift), already = info.filter(w => w.was56);
    const status = w => w.now == null ? '<span class="pill soft">noch keine Noten</span>' : w.drift ? `<span class="pill red">abdriftend</span>` : w.border ? '<span class="pill amber">grenzwertig</span>' : '<span class="pill green">stabil</span>';
    const row = w => `<div class="warn-row ${w.warned ? 'done' : ''}">
        <div class="wr-name"><strong>${esc(w.s.name)}</strong><span>Halbjahreszeugnis <b>${gradeText(c, w.hj1)}</b> · jetzt <b>${w.now != null ? gradeText(c, w.nowSuggest) : '–'}</b>${w.now != null ? ` (${fmtNum(w.now, 2)})` : ''}</span></div>
        ${status(w)}
        <label class="warn-check"><input type="checkbox" data-change="toggleWarn" data-key="${w.key}" data-cid="${c.id}" data-sid="${w.s.id}" ${w.warned ? 'checked' : ''}><span>gewarnt${w.warned ? `<small>${fmtISO(w.warned.date, true)}</small>` : ''}</span></label>
      </div>`;
    const warned = info.filter(w => w.warned);
    return `<section class="panel deadline ${days != null && days < 0 ? 'over' : days != null && days <= 14 ? 'soon' : ''}">
        <div class="dl-ic">${icon('bell')}</div>
        <div class="dl-body"><strong>${dl ? (days > 0 ? `Frist in ${plural(days, 'Tag', 'Tagen')}` : days === 0 ? 'Frist ist heute' : 'Frist abgelaufen') : 'Frist noch nicht eingetragen'}</strong>
          <span>Blaue Briefe (2. Halbjahr, alle Kurse)</span></div>
        <input type="date" value="${dl || ''}" data-change="warnDeadline" aria-label="Frist für Blaue Briefe">
      </section>
      ${!inHJ2() ? `<p class="muted small pad">Wird ab dem 2. Halbjahr relevant. Grundlage ist die Note auf dem Halbjahreszeugnis (${fmtISO(tc.hj1End, true)}); „jetzt“ ist der laufende Stand des 2. Halbjahres.</p>` : ''}
      <section class="section"><div class="section-head"><h2>Halbjahreszeugnis ${isSII(c) ? '5–6 Punkte' : 'Note 4'} – Entscheidung nötig</h2></div>
        ${need.length ? `<div class="warn-list">${need.map(row).join('')}</div>` : '<p class="muted small pad">Niemand in diesem Kurs.</p>'}</section>
      ${extra.length ? `<section class="section"><div class="section-head"><h2>Zusätzlich auffällig</h2></div><p class="muted small pad">Auf dem Halbjahreszeugnis besser als ${isSII(c) ? '5 Punkte' : '4'}, jetzt aber im Bereich ${isSII(c) ? 'unter 5 Punkten' : '5/6'}.</p><div class="warn-list">${extra.map(row).join('')}</div></section>` : ''}
      ${already.length ? `<p class="muted small pad">Bereits mit ${isSII(c) ? 'Defizit' : '5 oder 6'} auf dem Halbjahreszeugnis (keine Warnung nötig): ${already.map(w => esc(w.s.name)).join(', ')}</p>` : ''}
      <section class="section"><div class="section-head"><h2>Gewarnte Schülerinnen und Schüler</h2><button type="button" class="link" data-action="printWarned">${icon('print')} Liste aller Kurse</button></div>
        ${warned.length ? `<div class="mini-list">${warned.map(w => `<div class="mini-row"><span class="mini-date">${fmtISO(w.warned.date)}</span><span class="mini-text"><strong>${esc(w.s.name)}</strong> · Halbjahreszeugnis ${gradeText(c, w.hj1)}</span></div>`).join('')}</div>` : '<p class="muted small pad">In diesem Kurs noch niemand.</p>'}
      </section>`;
  }

  /* ---------- Drucken (Elternsprechtag, Zeugniskonferenz, Warnliste) ---------- */
  function printDoc(title, html) {
    let root = $('#print-root');
    if (!root) { root = document.createElement('div'); root.id = 'print-root'; document.body.appendChild(root); }
    root.innerHTML = `<div class="print-doc"><header><img src="icons/icon.svg" alt="" width="28" height="28"><div><h1>${esc(title)}</h1><p>Stand: ${fmtISO(todayISO(), true)} · vertraulich – nach Gebrauch vernichten</p></div></header>${html}</div>`;
    document.body.classList.add('printing');
    setTimeout(() => window.print(), 80);
  }
  window.addEventListener('afterprint', () => { document.body.classList.remove('printing'); const r = $('#print-root'); if (r) r.innerHTML = ''; });
  function printSheet(sid) {
    const s = S.data.students[sid], c = S.data.classes[s.classId];
    const terms = termsFor(levelOf(c));
    const obs = live(S.data.obs).filter(o => o.studentId === sid).sort((a, b) => a.date.localeCompare(b.date));
    const results = assessmentsOf(c.id).map(a => ({ a, r: resultOf(a.id, sid) })).filter(x => x.r);
    const html = `<p class="pd-sub"><strong>${esc(s.name)}</strong> · ${esc(clsLabel(c))} · Schuljahr ${termCfg().sy}/${String(termCfg().sy + 1).slice(2)}</p>
      <table class="pt"><thead><tr><th>Zeitraum</th><th>Mündlich Ø</th>${c.vocab ? '<th>Vokabeln Ø</th>' : ''}<th>SoMi</th><th>Schriftlich Ø</th><th>Zeugnis/Stand</th></tr></thead><tbody>
      ${terms.map(t => { const r = calc(s, t, c); return `<tr class="${t.zeugnis ? 'z' : ''}"><td>${t.label}</td><td>${r.mAvg != null ? fmtNum(r.mAvg, 2) : '–'}</td>${c.vocab ? `<td>${r.vAvg != null ? fmtNum(r.vAvg, 2) : '–'}</td>` : ''}<td>${r.somi != null ? fmtNum(r.somi, 2) : '–'}</td><td>${r.schr != null ? fmtNum(r.schr, 2) : '–'}</td><td><strong>${gradeText(c, r.final)}</strong>${r.override ? ' (korrigiert)' : ''}</td></tr>`; }).join('')}
      </tbody></table>
      <h2>Entwicklung im Schuljahr</h2><div class="pd-chart">${studentChartSVG(s, c, 680, 'sj')}</div>
      ${results.length ? `<h2>Tests &amp; Arbeiten</h2><table class="pt"><tbody>${results.map(({ a, r }) => `<tr><td>${fmtISO(a.date, true)}</td><td>${esc(a.title)}</td><td>${r.value == null ? 'fehlte' : a.type === 'vokabel' ? `${fmtNum(r.points, 1)} P. – ${esc(r.label)}` : esc(r.label)}</td></tr>`).join('')}</tbody></table>` : ''}
      <h2>Beobachtungen</h2>${obs.length ? `<ul>${obs.map(o => `<li><b>${fmtISO(o.date, true)}:</b> ${esc(o.text)}</li>`).join('')}</ul>` : '<p>–</p>'}
      <h2>Gesprächsnotizen</h2><div class="pd-lines"></div>`;
    printDoc('Elternsprechtag', html);
  }
  function zeugnisRows(c, t) { return studentsOf(c.id).map(s => ({ s, r: calc(s, t, c) })); }
  function printConference() {
    const c = ensureClass(); const t = termsFor(levelOf(c)).find(x => x.key === S.zTerm);
    const rows = zeugnisRows(c, t);
    printDoc(`Zeugniskonferenz – ${clsLabel(c)}`, `<p class="pd-sub">${t.label} (${fmtISO(t.from, true)}–${fmtISO(t.to, true)}) · Gewichtung schriftlich 50 % / SoMi 50 %</p>
      <table class="pt"><thead><tr><th>Name</th><th>SoMi</th><th>Schriftl.</th><th>Vorschlag</th><th>Zeugnis</th><th>Korrektur</th><th>Begründung</th></tr></thead><tbody>
      ${rows.map(({ s, r }) => `<tr><td>${esc(s.name)}</td><td>${r.somi != null ? fmtNum(r.somi, 2) : '–'}</td><td>${r.schr != null ? fmtNum(r.schr, 2) : '–'}</td><td>${gradeText(c, r.suggest)}</td><td><strong>${gradeText(c, r.final)}</strong></td><td>${r.dir === 'up' ? '▲ nach oben' : r.dir === 'down' ? '▼ nach unten' : r.override ? 'manuell' : ''}</td><td>${r.override ? esc(r.override.reason || '') : ''}</td></tr>`).join('')}
      </tbody></table>`);
  }
  function printWarned() {
    const sy = termCfg();
    const blocks = classesSorted().map(c => ({ c, list: warnInfo(c).filter(w => w.warned).sort((a, b) => byLastName(a.s.name, b.s.name)) })).filter(b => b.list.length);
    printDoc('Gewarnte Schülerinnen und Schüler', `<p class="pd-sub">Schuljahr ${sy.sy}/${String(sy.sy + 1).slice(2)}${sy.warnDeadline ? ` · Frist ${fmtISO(sy.warnDeadline, true)}` : ''}</p>
      ${blocks.length ? blocks.map(b => `<h2>${esc(clsLabel(b.c))}</h2><table class="pt"><thead><tr><th>Name</th><th>Halbjahreszeugnis</th><th>Stand jetzt</th><th>gewarnt am</th></tr></thead><tbody>
        ${b.list.map(w => `<tr><td>${esc(w.s.name)}</td><td>${gradeText(b.c, w.hj1)}</td><td>${gradeText(b.c, w.nowSuggest)}</td><td>${fmtISO(w.warned.date, true)}</td></tr>`).join('')}</tbody></table>`).join('') : '<p>Noch niemand als gewarnt markiert.</p>'}`);
  }
  function exportZeugnis() {
    const c = ensureClass(); const t = termsFor(levelOf(c)).find(x => x.key === S.zTerm);
    const out = [['Kurs', 'Fach', 'Zeitraum', 'Name', 'Mündlich Ø', 'Vokabeln Ø', 'SoMi', 'Schriftlich Ø', 'Gesamt', 'Vorschlag', 'Zeugnis', 'Korrektur', 'Begründung']];
    for (const { s, r } of zeugnisRows(c, t)) out.push([c.name, c.subject || '', t.label, s.name, r.mAvg != null ? fmtNum(r.mAvg) : '', r.vAvg != null ? fmtNum(r.vAvg) : '', r.somi != null ? fmtNum(r.somi) : '', r.schr != null ? fmtNum(r.schr) : '', r.total != null ? fmtNum(r.total) : '', gradeText(c, r.suggest), gradeText(c, r.final), r.dir === 'up' ? 'nach oben' : r.dir === 'down' ? 'nach unten' : r.override ? 'manuell' : '', r.override?.reason || '']);
    downloadCSV(`Notenheft_${safeName(c.name)}_${safeName(c.subject || '')}_Zeugnis_${t.key}.csv`, out);
  }

  /* ---------- Hinweise auf „Heute“ ---------- */
  function reminderBanner() {
    const r = activeReminder();
    if (!r) return '';
    const missing = sum(r.miss.map(m => m.miss));
    return `<div class="remind"><div class="remind-ic">${icon('bell')}</div><div class="remind-body">
      <strong>Noten KW ${isoWeek(parseISO(r.ws))}: ${plural(missing, 'Eintrag fehlt', 'Einträge fehlen')}</strong>
      <span>in ${r.miss.map(m => esc(m.c.name)).join(', ')}</span>
      <div class="remind-btns"><button type="button" class="btn small primary" data-action="openNoten" data-cid="${r.miss[0].c.id}" data-date="${addDaysISO(r.ws, 4)}">Eintragen</button>
        <button type="button" class="btn small ghost" data-action="snooze" data-ws="${r.ws}">Morgen</button>
        <button type="button" class="btn small ghost" data-action="remindDone" data-ws="${r.ws}">Erledigt</button></div></div></div>`;
  }
  function warnCard() {
    if (!inHJ2()) return '';
    const tc = termCfg(), ws = warnSummary();
    const days = tc.warnDeadline ? diffDays(todayISO(), tc.warnDeadline) : null;
    if (days != null && days < -7) return '';
    if (!ws.total && days != null) return '';
    return `<button type="button" class="banner warn" data-action="openWarn">${icon('bell')}<div><strong>Blaue Briefe${days != null ? ` · Frist ${days >= 0 ? relDays(days) : 'abgelaufen'}` : ' · Frist eintragen'}</strong>
      <span>${ws.open ? `${plural(ws.open, 'Entscheidung', 'Entscheidungen')} offen (abdriftend, noch nicht gewarnt)` : `${plural(ws.total, 'Kind', 'Kinder')} mit Halbjahresnote 4 im Blick`}</span></div>${icon('right')}</button>`;
  }

  /* ---------- Kurse (Registerkarten) ---------- */
  const CTABS = [['ueberblick', 'Überblick', 'chart'], ['muendlich', 'Mündlich', 'edit'], ['tests', 'Arbeiten/Klausuren', 'exam'], ['uebersicht', 'Noten', 'list'], ['zeugnis', 'Zeugnis', 'award'], ['bearbeiten', 'Kurs bearbeiten', 'gear']];
  function courseRegister(activeId) {
    if (!activeId) return '';
    return `<div class="course-back"><button type="button" class="btn small ghost" data-action="openCourse" data-cid="">${icon('left')} Alle Kurse</button></div>`;
  }
  function courseRegisterAlt(activeId) {
    const cs = classesSorted();
    return `<div class="course-tabs-row reg">
      <button type="button" class="ctab all ${!activeId ? 'on' : ''}" data-action="openCourse" data-cid="">${icon('grid')}Alle</button>
      ${cs.map(c => `<button type="button" class="ctab ${c.id === activeId ? 'on' : ''}" ${ccStyle(c)} data-action="openCourse" data-cid="${c.id}"><i></i>${esc(c.name)}<small>${esc(c.subject || '')}</small></button>`).join('')}
      <button type="button" class="ctab add" data-action="newClass" aria-label="Neuen Kurs anlegen">${icon('plus')}</button></div>`;
  }
  function viewKurse() {
    const cs = classesSorted();
    if (S.courseId) {
      const c = S.data.classes[S.courseId];
      if (c && !c.deleted) return courseRegister(c.id) + viewCourse(c);
      S.courseId = null;
    }
    let html = pageHead('Kurse', cs.length ? `${plural(cs.length, 'Kurs', 'Kurse')} · ${sum(cs.map(weeklyHours))} Wochenstunden` : '', `<button type="button" class="btn small" data-action="newClass">${icon('plus')} Kurs</button>`);
    if (!cs.length) return html + emptyState('Noch keine Kurse', 'Importiere die Ganzjahresplanung (Reiter „Jahr“) oder lege Kurse von Hand an. Die Namen der Kinder kannst du direkt aus Excel einfügen.', `<button type="button" class="btn primary" data-action="newClass">${icon('plus')} Kurs anlegen</button>`);
    html += courseRegister(null);
    const [hf, ht] = rangeFor('hj');
    html += `<div class="course-grid">${cs.map(c => {
      const nl = nextLessons(c.id, 1)[0];
      const ex = upcomingExams(c.id, 90)[0];
      const n = studentsOf(c.id).length;
      const avgs = overviewRows(c, hf, ht).map(r => r.st.avg).filter(x => x != null);
      return `<button type="button" class="course-card" ${ccStyle(c)} data-action="openCourse" data-cid="${c.id}">
        <div class="cc-head"><span class="cc-name">${esc(c.name)}</span><span class="cc-subj">${esc(c.subject || '')}</span><span class="cc-level">${levelLabel(c)}</span></div>
        <div class="cc-meta"><span>${weeklyHours(c)} Std./Woche</span><span>${plural(n, 'Kind', 'Kinder')}</span>${avgs.length ? `<span>Ø ${fmtNum(mean(avgs))}</span>` : ''}</div>
        <div class="cc-lines">
          ${nl ? `<span>${icon('clock')}Nächste Stunde ${nl.date === todayISO() ? 'heute' : fmtShort(nl.date)}${nl.cancelled ? ' · <b class="x">entfällt</b>' : ''}</span>` : ''}
          ${ex ? `<span class="e">${icon('exam')}${esc(shortKind(ex.kind))} ${relDays(examInfo(ex).days)} · noch ${examInfo(ex).lessons ?? 0} Std.</span>` : ''}
        </div>
      </button>`;
    }).join('')}</div>`;
    return html;
  }
  function viewCourse(c) {
    S.classId = c.id;
    let tab = S.courseTab === 'schueler' || S.courseTab === 'stundenplan' ? 'bearbeiten' : CTABS.some(x => x[0] === S.courseTab) ? S.courseTab : 'ueberblick';
    let html = `<div class="chead" ${ccStyle(c)}>
        <div><h1><i></i>${esc(c.name)} <span>${esc(c.subject || '')}</span></h1><p>${levelLabel(c)}${c.room ? ` · ${esc(c.room)}` : ''} · ${weeklyHours(c)} Std./Woche · ${plural(studentsOf(c.id).length, 'Kind', 'Kinder')}</p></div>
        <button type="button" class="icon-btn ${tab === 'bearbeiten' ? 'on' : ''}" data-action="courseTab" data-tab="bearbeiten" aria-label="Kurs bearbeiten" title="Kurs bearbeiten: Kinder, Stunden, Einstellungen">${icon('gear')}</button>
      </div>
      <div class="subtabs">${CTABS.filter(x => x[0] !== 'bearbeiten').map(([k, l]) => `<button type="button" data-action="courseTab" data-tab="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    if (tab === 'muendlich') html += viewErfassen();
    else if (tab === 'tests') html += viewLeistungen();
    else if (tab === 'uebersicht') html += viewUebersicht();
    else if (tab === 'zeugnis') html += viewZeugnis();
    else if (tab === 'bearbeiten') html += `<h2 class="sub-h">${icon('users')} Kinder</h2>` + courseStudents(c) + `<h2 class="sub-h">${icon('clock')} Stunden im Stundenplan</h2>` + courseSlots(c) + `<h2 class="sub-h">${icon('gear')} Einstellungen</h2>` + courseEdit(c);
    else html += courseOverview(c);
    return html;
  }
  function courseOverview(c) {
    const st = courseStats(c.id);
    const exams = upcomingExams(c.id, 365);
    const t = todayISO();
    const aus = live(S.data.events).filter(e => e.type === 'ausfall' && (e.classId === c.id || !e.classId) && e.date >= st.from && e.date <= st.to)
      .filter(e => e.classId === c.id || lessonsOn(e.date, c.id).length || freeReason(e.date) === null && (c.slots || []).some(s => s.wd === wdOf(e.date) + 1))
      .sort((a, b) => a.date.localeCompare(b.date));
    const nl = nextLessons(c.id, 5);
    const pct = x => st.soll ? Math.round(x / st.soll * 100) : 0;
    const cTodos = openTodos().filter(x => x.classId === c.id).sort(todoSort);
    return `<section class="section"><div class="section-head"><h2>${picto('todo', 'sm')} To-dos</h2><span class="head-links"><button type="button" class="link" data-action="newTodo" data-cid="${c.id}" data-date="">${icon('plus')} To-do</button><button type="button" class="link" data-action="todoFilterGo" data-f="${c.id}">Alle ${icon('right')}</button></span></div>
        ${todoList(cTodos, { course: false }, 'Für diesen Kurs ist nichts offen.')}</section>
      <section class="section">
        <div class="section-head"><h2>Bis ${st.next ? esc(st.next.name) : fmtISO(st.to, true)}</h2><span class="muted small">${fmtISO(st.from)}–${fmtISO(st.to, true)}</span></div>
        <div class="sumbar four">
          <div class="sum-item"><strong>${st.soll}</strong><span>laut Plan</span></div>
          <div class="sum-item ok"><strong>${st.gehalten}</strong><span>gehalten</span></div>
          <div class="sum-item aus"><strong>${st.ausgefallen}</strong><span>ausgefallen</span></div>
          <div class="sum-item"><strong>${st.rest}</strong><span>verbleibend</span></div>
        </div>
        <div class="stack-bar" ${ccStyle(c)} title="gehalten ${pct(st.gehalten)} % · ausgefallen ${pct(st.ausgefallen)} % · verbleibend ${pct(st.rest)} %">
          <i class="ok" style="width:${pct(st.gehalten)}%"></i><i class="warn" style="width:${pct(st.ausgefallen)}%"></i><i class="rest" style="width:${pct(st.rest)}%"></i>
        </div>
      </section>
      <section class="section"><div class="section-head"><h2>Prüfungen</h2><button type="button" class="link" data-action="newEvent" data-cid="${c.id}" data-type="pruefung">${icon('plus')} Prüfung</button></div>
        ${exams.length ? `<div class="glist">${exams.map(examTile).join('')}</div>` : '<p class="empty-line">Keine anstehenden Prüfungen.</p>'}
      </section>
      <section class="section"><div class="section-head"><h2>Nächste Stunden</h2><button type="button" class="link" data-action="newEvent" data-cid="${c.id}" data-type="ausfall">${icon('ban')} Ausfall</button></div>
        ${nl.length ? `<div class="glist">${nl.map(l => lessonCard(l, { showDate: true })).join('')}</div>` : '<p class="empty-line">Keine Stunden gefunden – trage über das Zahnrad die Unterrichtszeiten ein.</p>'}
      </section>
      ${aus.length ? `<section class="section"><div class="section-head"><h2>Ausfälle bis ${st.next ? esc(st.next.name) : fmtISO(st.to)}</h2></div>${(() => {
        const up = aus.filter(e => e.date >= t), past = aus.filter(e => e.date < t);
        const row = e => `<button type="button" class="mini-row ${e.date < t ? 'past' : ''}" data-action="editEvent" data-eid="${e.id}" ${ccStyle(c)}><span class="dot ${e.classId ? '' : 'all'}"></span><span class="mini-date">${fmtShort(e.date)}</span><span class="mini-text">${e.classId ? '' : '<strong>ganzer Tag</strong> – '}${esc(e.note || 'Ausfall')}</span></button>`;
        return (up.length ? `<div class="mini-list">${up.map(row).join('')}</div>` : '<p class="empty-line">Keine weiteren Ausfälle geplant.</p>')
          + (past.length ? `<details class="past-aus"><summary>${plural(past.length, 'vergangener Ausfall', 'vergangene Ausfälle')}</summary><div class="mini-list">${past.map(row).join('')}</div></details>` : '');
      })()}</section>` : ''}`;

  }
  function courseStudents(c) {
    const sts = studentsOf(c.id);
    const others = classesSorted().filter(o => o.id !== c.id && studentsOf(o.id).length);
    return `<section class="panel">
        <h3>${plural(sts.length, 'Kind', 'Kinder')}</h3>
        ${sts.length ? `<ul class="stud-list">${sts.map(s => `<li><span>${esc(s.name)} <small class="muted">${esc(s.km || s.code || '')}</small></span>
          <button type="button" class="icon-btn plain" data-action="renameStudent" data-sid="${s.id}" aria-label="${esc(s.name)} umbenennen">${icon('pencil')}</button>
          <button type="button" class="icon-btn plain" data-action="deleteStudent" data-sid="${s.id}" aria-label="${esc(s.name)} entfernen">${icon('trash')}</button></li>`).join('')}</ul>` : '<p class="muted small">Noch keine Kinder eingetragen.</p>'}
        <form data-submit="addStudents">
          <label class="field"><span>Kinder hinzufügen – ein Name pro Zeile (auch aus Excel einfügbar)</span><textarea name="names" rows="4" placeholder="Anna M.&#10;Ben K."></textarea></label>
          <button type="submit" class="btn primary">${icon('plus')} Hinzufügen</button>
        </form>
        <div class="btnrow"><label class="btn file-btn">${icon('sheet')} Aus Kürzel-Tabelle übernehmen<input type="file" accept=".xlsx" data-change="importKuerzel"></label></div>
        <p class="muted small">Liest aus deiner Kürzel-Tabelle nur Vorname, Nachname und „Kürzel (final)“. Mit diesen Kürzeln ordnet das Notenheft die Noten aus dem Klausurmanager automatisch zu.</p>
        ${others.length ? `<div class="copy-from"><label class="field"><span>… oder Liste aus einem anderen Kurs übernehmen</span>
          <select data-change="copyStudents"><option value="">Kurs wählen …</option>${others.map(o => `<option value="${o.id}">${esc(clsLabel(o))} (${studentsOf(o.id).length})</option>`).join('')}</select></label></div>` : ''}
        <p class="muted small">Die Namen bleiben nur auf deinen Geräten. Online liegen nur die Kürzel. Vorname und Anfangsbuchstabe reichen meist aus.</p>
      </section>`;
  }
  function courseSlots(c) {
    const P = periods();
    const opts = sel => P.map((p, i) => `<option value="${i + 1}" ${i + 1 === sel ? 'selected' : ''}>${i + 1}. (${esc(p.start)})</option>`).join('');
    const slots = [...(c.slots || [])].sort((a, b) => a.wd - b.wd || a.from - b.from);
    return `<section class="panel">
        <h3>Wöchentliche Stunden</h3>
        ${slots.length ? `<ul class="slot-list">${slots.map(s => {
          const t = periodTimes(s.from, s.to);
          const past = s.validTo && s.validTo < todayISO();
          const valid = s.validFrom || s.validTo ? ` · ${s.validFrom ? 'ab ' + fmtISO(s.validFrom) : ''}${s.validFrom && s.validTo ? ' ' : ''}${s.validTo ? 'bis ' + fmtISO(s.validTo) : ''}` : '';
          return `<li ${ccStyle(c)} class="${past ? 'past' : ''}"><span class="slot-day">${WD[s.wd - 1]}</span><span class="slot-p">${pLabel(s.from, s.to)}<small>${esc(t.start)}–${esc(t.end)}${s.room ? ' · ' + esc(s.room) : ''}${valid}</small></span>
            <button type="button" class="icon-btn plain" data-action="deleteSlot" data-wd="${s.wd}" data-from="${s.from}" data-vf="${s.validFrom || ''}" aria-label="Entfernen">${icon('trash')}</button></li>`;
        }).join('')}</ul>` : '<p class="muted small">Noch keine Stunden eingetragen.</p>'}
        <form data-submit="addSlot" class="slot-form">
          <label class="field"><span>Tag</span><select name="wd">${WD.slice(0, 5).map((w, i) => `<option value="${i + 1}">${WD_LONG[i]}</option>`).join('')}</select></label>
          <label class="field"><span>von Stunde</span><select name="from">${opts(1)}</select></label>
          <label class="field"><span>bis Stunde</span><select name="to">${opts(1)}</select></label>
          <label class="field"><span>Raum</span><input name="room" placeholder="${esc(c.room || 'optional')}" maxlength="20"></label>
          <button type="submit" class="btn primary">${icon('plus')} Hinzufügen</button>
        </form>
      </section>`;
  }
  function courseEdit(c) {
    return `<section class="panel">
        <label class="field"><span>Kurs / Klasse</span><input data-change="className" value="${esc(c.name)}" maxlength="40"></label>
        <label class="field"><span>Fach</span><input data-change="classSubject" value="${esc(c.subject || '')}" maxlength="40" placeholder="optional"></label>
        <label class="field"><span>Raum</span><input data-change="classRoom" value="${esc(c.room || '')}" maxlength="20" placeholder="optional"></label>
        <label class="field"><span>Stufe (bestimmt Halbjahre/Quartale und Noten bzw. Punkte)</span><select data-change="classLevel">${LEVELS.map(([k, l]) => `<option value="${k}" ${levelOf(c) === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="field"><span>Mündliche Noten</span><select data-change="classGradeMode"><option value="woche" ${weeklyMode(c) ? 'selected' : ''}>einmal pro Woche (Standard)</option><option value="stunde" ${weeklyMode(c) ? '' : 'selected'}>für einzelne Unterrichtsstunden</option></select></label>
        <label class="field"><span>Klassenarbeiten/Klausuren pro Halbjahr</span><select data-change="classExams"><option value="">automatisch (${examsRequired(c, 'HJ1')} im 1. / ${examsRequired(c, 'HJ2')} im 2. Halbjahr)</option>${[1, 2, 3, 4].map(n => `<option value="${n}" ${c.examsPerHj === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="check"><input type="checkbox" data-change="classNoOral" ${c.noOral ? 'checked' : ''}><span>Keine mündlichen Noten mehr eintragen (zählt nicht mehr bei fehlenden Noten und Erinnerungen)</span></label>
        <label class="check"><input type="checkbox" data-change="classVocab" ${c.vocab ? 'checked' : ''}><span>Vokabeltests in diesem Kurs (zählen anteilig zur SoMi-Note)</span></label>
        <div class="field"><span>Farbe</span><div class="swatches">${COLORS.map(col => `<button type="button" class="swatch ${col === c.color ? 'on' : ''}" style="--sw:${col}" data-action="setColor" data-color="${col}" aria-label="Farbe ${col}"></button>`).join('')}</div></div>
      </section>
      <section class="panel">
        <h3>Kurs löschen</h3>
        <p class="muted small">Löscht den Kurs mit allen Kindern, Noten und kursbezogenen Terminen – auch auf deinen anderen Geräten.</p>
        <button type="button" class="btn danger" data-action="deleteClass" data-cid="${c.id}">${icon('trash')} Kurs löschen</button>
      </section>`;
  }

  /* ---------- Mehr / Einstellungen ---------- */
  function viewMehr() {
    const g = S.device.gh || {};
    const lock = S.device.lockMinutes || 10;
    const w = S.data.settings.weighting;
    const pk = Passkey.rec();
    const P = periods();
    const hols = live(S.data.holidays).sort((a, b) => a.from.localeCompare(b.from));
    const t = todayISO();
    const evs = live(S.data.events).filter(e => e.date >= addDaysISO(t, -7)).sort((a, b) => a.date.localeCompare(b.date));
    const tc = termCfg();
    return pageHead('Einstellungen') + `
      <section class="panel slim"><label class="field"><span>Dein Name für die Begrüßung</span><input data-change="myName" maxlength="30" value="${esc(S.data.prefs?.profil?.name || '')}" placeholder="z. B. Andi"></label></section>
      <section class="panel slim"><label class="check"><input type="checkbox" data-change="startMenu" ${S.startMenu !== false ? 'checked' : ''}><span><strong>Beim Öffnen das Startmenü zeigen</strong><br><span class="muted small">Sonst öffnet die App direkt die zuletzt benutzte Ansicht. Zum Startmenü kommst du immer über „Start“ bzw. das Notenheft-Symbol oben links.</span></span></label></section>
      <section class="panel">
        <h2>Namensliste &amp; Datenschutz</h2>
        <p class="muted small">Online (GitHub) liegen nur zufällige Kürzel wie <strong>K7F3Q</strong>. Die Klarnamen bleiben auf jedem Gerät lokal und verschlüsselt. Schreib deshalb keine Klarnamen in Notizen oder To-dos.</p>
        ${missingNames() ? `<p class="warn-t"><strong>Auf diesem Gerät fehlen ${missingNames()} Namen.</strong> Hole sie mit „Namensliste importieren“.</p>` : '<p class="ok-t small">Alle Namen sind auf diesem Gerät vorhanden.</p>'}
        <div class="btnrow">
          <button type="button" class="btn" data-action="makeNameList">${icon('key')} Namensliste für anderes Gerät</button>
          <button type="button" class="btn" data-action="importNameList">${icon('download')} Namensliste importieren</button>
        </div>
      </section>
      <section class="panel feature ${pk ? 'on' : ''}">
        <div class="feature-ic">${icon('face')}</div>
        <div class="feature-body">
          <h2>${Passkey.label()} zum Entsperren</h2>
          <p class="muted small">${pk ? `Aktiv auf diesem Gerät seit ${fmtDate(new Date(pk.created), true)}. Das Passwort brauchst du nur noch, wenn ${Passkey.label()} nicht klappt.`
            : `Statt das Passwort zu tippen, entsperrst du mit ${Passkey.label()}. Dafür wird ein Passkey angelegt; dein Passwort liegt dann – damit verschlüsselt – nur auf diesem Gerät.`}</p>
          <div class="btnrow">${pk ? `<button type="button" class="btn" data-action="passkeyRemove">Deaktivieren</button>` : `<button type="button" class="btn primary" data-action="passkeyEnroll">${icon('face')} ${Passkey.label()} einrichten</button>`}</div>
        </div>
      </section>

      <section class="panel">
        <h2>${icon('sheet')} Ganzjahresplanung importieren</h2>
        <p class="muted small">Liest aus deiner Excel-Datei den Stundenplan („Raster“), die Stundenzeiten, Prüfungen („Countdown“), Ausfälle und Ferien. Erneutes Importieren aktualisiert die Einträge.</p>
        <label class="btn primary file-btn">${icon('upload')} Excel-Datei wählen<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-change="importXlsx"></label>
      </section>

      <section class="panel">
        <h2>${icon('flag')} Termine, Prüfungen &amp; Ausfälle</h2>
        ${evs.length ? `<div class="mini-list">${evs.map(eventRow).join('')}</div>` : '<p class="muted small">Keine anstehenden Einträge.</p>'}
        <div class="btnrow"><button type="button" class="btn" data-action="newEvent">${icon('plus')} Neuer Eintrag</button></div>
      </section>

      <section class="panel">
        <h2>${icon('sun')} Ferien &amp; freie Tage</h2>
        <p class="muted small">Gesetzliche Feiertage in NRW werden automatisch berücksichtigt.</p>
        ${hols.length ? `<ul class="plain-list">${hols.map(h => `<li class="${h.to < t ? 'past' : ''}"><div><strong>${esc(h.name)}</strong><span>${fmtISO(h.from, true)}${h.to !== h.from ? ' – ' + fmtISO(h.to, true) : ''}</span></div>
          <button type="button" class="icon-btn plain" data-action="deleteHoliday" data-hid="${h.id}" aria-label="Löschen">${icon('trash')}</button></li>`).join('')}</ul>` : '<p class="muted small">Noch keine Ferien eingetragen.</p>'}
        <form data-submit="addHoliday" class="hol-form">
          <label class="field"><span>Bezeichnung</span><input name="name" placeholder="z. B. Beweglicher Ferientag" maxlength="60"></label>
          <label class="field"><span>von</span><input type="date" name="from"></label>
          <label class="field"><span>bis</span><input type="date" name="to"></label>
          <button type="submit" class="btn">${icon('plus')} Hinzufügen</button>
        </form>
      </section>

      <section class="panel">
        <h2>${icon('clock')} Stundenraster</h2>
        <div class="period-list">${P.map((p, i) => `<div class="period-row"><span>${i + 1}.</span>
          <input type="time" value="${esc(p.start)}" data-change="periodTime" data-i="${i}" data-k="start" aria-label="Beginn ${i + 1}. Stunde">
          <span class="muted">–</span>
          <input type="time" value="${esc(p.end)}" data-change="periodTime" data-i="${i}" data-k="end" aria-label="Ende ${i + 1}. Stunde"></div>`).join('')}</div>
        <div class="btnrow"><button type="button" class="btn small" data-action="addPeriod">${icon('plus')} Stunde</button>${P.length > 1 ? `<button type="button" class="btn small ghost" data-action="removePeriod">Letzte entfernen</button>` : ''}</div>
      </section>

      <section class="panel">
        <h2>${icon('calc')} Schuljahr &amp; Zeugnisse ${tc.sy}/${String(tc.sy + 1).slice(2)}</h2>
        <p class="muted small">Stichtage für Halbjahre und Quartale. Sek I: zwei Halbjahre. EF/Q1: vier Quartale, Zeugnis nach je zwei. Q2: eigenes, kürzeres Schuljahr.</p>
        <div class="term-form">
          ${[['hj1End', 'Ende 1. Halbjahr (alle)'], ['end', 'Ende Schuljahr (Sek I, EF, Q1)'], ['q1End', 'EF/Q1: Ende 1. Quartal'], ['q3End', 'EF/Q1: Ende 3. Quartal'],
            ['q2q1End', 'Q2: Ende 1. Quartal'], ['q2q3End', 'Q2: Ende 3. Quartal'], ['q2End', 'Q2: letzter Unterrichtstag'], ['warnDeadline', 'Frist Blaue Briefe']]
            .map(([k, l]) => `<label class="field"><span>${l}</span><input type="date" value="${esc(tc[k] || '')}" data-change="termDate" data-k="${k}"></label>`).join('')}
        </div>
      </section>

      <section class="panel">
        <h2>${icon('cloud')} Synchronisierung über GitHub</h2>
        <p class="muted small">Deine Daten werden auf dem Gerät verschlüsselt und nur so in deinem <strong>privaten</strong> Repository abgelegt.</p>
        <div id="sync-status" class="sync-status"></div>
        <form data-submit="ghSave" autocomplete="off" novalidate>
          ${ghFields(g)}
          <p class="err" hidden></p>
          <div class="btnrow">
            <button class="btn primary" type="submit">Speichern &amp; testen</button>
            ${ghReady() ? `<button type="button" class="btn" data-action="syncNow">Jetzt synchronisieren</button>
            <button type="button" class="btn" data-action="makeSetupCode">${icon('key')} Einrichtungscode</button>
            <button type="button" class="btn ghost danger" data-action="removeGh">Trennen</button>` : ''}
          </div>
        </form>
      </section>

      <section class="panel">
        <h2>${icon('exam')} Klausurmanager</h2>
        <p class="muted small">Die Noten jeder im Klausurmanager ausgewerteten Klausur kommen automatisch unter <strong>Kurs → Arbeiten/Klausuren</strong> an. Übertragen werden nur Kürzel und Noten – verschlüsselt, lesbar nur für dein Notenheft.</p>
        ${kmKey() ? `<p class="ok-t small">Verbindungscode erstellt am ${fmtDate(new Date(kmKey().createdAt), true)}.${kmPendingList().length ? ` ${plural(kmPendingList().length, 'Ergebnis wartet', 'Ergebnisse warten')} auf Zuordnung (Kurs → Arbeiten/Klausuren).` : ''}</p>` : '<p class="muted small">Noch nicht verbunden: „Verbindungscode“ antippen und den Code einmal am PC an den Klausurmanager geben.</p>'}
        ${live(S.data.calendars).length ? `<p class="muted small">Kalender vom PC: ${live(S.data.calendars).map(c => `${esc(c.name)} (${plural((c.termine || []).length, 'Termin', 'Termine')}, Stand ${fmtDate(new Date(c.stand), true)})`).join(' · ')}</p>` : ''}
        <div class="btnrow">
          <button type="button" class="btn ${kmKey() ? '' : 'primary'}" data-action="kmCode">${icon('key')} Verbindungscode</button>
          ${kmKey() && ghReady() ? `<button type="button" class="btn" data-action="kmFetch">${icon('download')} Jetzt abholen</button>` : ''}
          ${kmKey() ? `<button type="button" class="btn" data-action="kmPaste">${icon('copy')} Ergebnis einfügen</button>` : ''}
          ${kmKey() ? `<label class="btn file-btn">${icon('upload')} Ergebnisdatei importieren<input type="file" accept=".json,application/json" data-change="importKm"></label>` : ''}
        </div>
      </section>

      <section class="panel">
        <h2>${icon('bell')} Erinnerung am Freitag</h2>
        <p class="muted small">Freitags gegen 15 Uhr kommt eine Push-Nachricht aufs Gerät, wenn für die Woche noch mündliche Noten fehlen (nicht in Ferienwochen). Online liegt dafür nur die Anzahl fehlender Noten – keine Namen, keine Kurse.</p>
        ${S.device.pushSub ? '<p class="ok-t small">Auf diesem Gerät eingeschaltet.</p>' : pushOn() ? '<p class="muted small">Auf einem anderen Gerät eingeschaltet.</p>' : ''}
        <div class="btnrow">
          ${S.device.pushSub ? `<button type="button" class="btn" data-action="pushTest">${icon('bell')} Testnachricht</button><button type="button" class="btn ghost" data-action="pushOff">Auf diesem Gerät ausschalten</button>`
            : `<button type="button" class="btn primary" data-action="pushOn" ${ghReady() ? '' : 'disabled'}>${icon('bell')} Auf diesem Gerät einschalten</button>`}
        </div>
        ${isIOS() && !S.device.pushSub ? '<p class="muted small">iPhone: Notenheft muss vom Home-Bildschirm geöffnet sein (iOS 16.4 oder neuer).</p>' : ''}
      </section>

      <section class="panel">
        <h2>${icon('calc')} Durchschnitt berechnen</h2>
        <label class="radio"><input type="radio" name="w" value="note" data-change="setWeighting" ${w !== 'woche' ? 'checked' : ''}><span>Jede Note zählt gleich<small>Wer in einer Woche 3 Noten bekommt, geht dort dreifach ein.</small></span></label>
        <label class="radio"><input type="radio" name="w" value="woche" data-change="setWeighting" ${w === 'woche' ? 'checked' : ''}><span>Jede Woche zählt gleich<small>Erst Wochenschnitt, dann Schnitt über alle Wochen.</small></span></label>
      </section>

      <section class="panel">
        <h2>${icon('shield')} Sicherheit</h2>
        <label class="field"><span>Automatisch sperren nach</span>
          <select data-change="setLock">${[2, 5, 10, 30, 60].map(m => `<option value="${m}" ${m === lock ? 'selected' : ''}>${m} Minuten</option>`).join('')}</select></label>
        <div class="btnrow">
          <button type="button" class="btn" data-action="changePassword">Passwort ändern</button>
          <button type="button" class="btn" data-action="lock">${icon('lock')} Jetzt sperren</button>
        </div>
      </section>

      <section class="panel">
        <h2>${icon('save')} Sicherung</h2>
        <p class="muted small">Die Sicherungsdatei ist verschlüsselt und nur mit deinem Passwort lesbar. Beim Einspielen werden die Daten zusammengeführt.</p>
        <div class="btnrow">
          <button type="button" class="btn" data-action="backupDownload">${icon('download')} Sicherung herunterladen</button>
          <label class="btn file-btn">${icon('upload')} Sicherung einspielen<input type="file" accept=".json,application/json" data-change="backupImport"></label>
        </div>
      </section>

      <section class="panel">
        <h2>Datenschutz</h2>
        <p class="small">Notenheft speichert alles verschlüsselt (AES-256-GCM, Schlüssel aus deinem Passwort per PBKDF2 mit 600.000 Runden). Das Passwort verlässt nie das Gerät. Keine fremden Skripte, keine Tracker – die App spricht nur mit <em>api.github.com</em>.</p>
        <p class="small muted">CSV-Exporte sind <strong>unverschlüsselt</strong> – nur auf genehmigten Geräten speichern und danach löschen.</p>
        <div class="btnrow"><button type="button" class="btn ghost danger" data-action="resetDevice">Alle Daten von diesem Gerät entfernen</button></div>
        <p class="muted small">Notenheft ${APP_VERSION}</p>
      </section>`;
  }

  /* =====================================================================
     Aktionen: Noten
     ===================================================================== */
  function flashRow(sid) { requestAnimationFrame(() => document.getElementById('st-' + sid)?.classList.add('flash')); }
  function quickAdd(sid, kind, grade) {
    const st = S.data.students[sid];
    if (!st) return;
    const e = addEntry({ sid, cid: st.classId, kind, grade, date: currentDay(sid, st.classId) });
    flashRow(sid);
    toast(entryToast(e, st.name), { undo: () => undoEntry(e) });
  }
  function cardAdd(kind, grade) {
    const list = cardList();
    const s = list[S.cardIdx];
    if (!s) return;
    if (!S.onlyMissing) S.cardIdx++;
    const e = addEntry({ sid: s.id, cid: s.classId, kind, grade, date: currentDay(s.id, s.classId) });
    toast(entryToast(e, s.name), { undo: () => undoEntry(e) });
  }
  async function editEntry(entry, sid, opts = {}) {
    const isNew = !entry;
    sid = sid || entry.studentId;
    const st = S.data.students[sid];
    if (!st) return null;
    let kind = entry?.kind || 'note';
    let grade = entry?.grade || null;
    const date = entry?.date || opts.date || currentDay(sid);
    const body = `<p class="muted">${esc(st.name)}</p>
      <div class="seg full" id="m-kind">${[['note', 'Note'], ['fehlte', 'fehlte'], ['nb', 'ohne Note']].map(([k, l]) => `<button type="button" data-k="${k}" class="${k === kind ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="grade-pick ${kind !== 'note' ? 'hidden' : ''}" id="m-grades">${GRADES.map(g => `<button type="button" data-g="${g}" class="gbtn g${g} ${g === grade ? 'on' : ''}">${g}</button>`).join('')}</div>
      <label class="field"><span>Datum</span><input type="date" id="m-date" value="${date}"></label>
      <label class="field"><span>Notiz (optional)</span><input type="text" id="m-note" maxlength="200" value="${esc(entry?.note || '')}" placeholder="z. B. Referat, sehr aktiv"></label>`;
    const res = await openModal({
      title: isNew ? 'Eintrag hinzufügen' : 'Eintrag bearbeiten', body,
      mount: root => {
        root.querySelector('#m-kind').addEventListener('click', e => {
          const b = e.target.closest('[data-k]'); if (!b) return;
          kind = b.dataset.k;
          root.querySelectorAll('#m-kind button').forEach(x => x.classList.toggle('on', x === b));
          root.querySelector('#m-grades').classList.toggle('hidden', kind !== 'note');
        });
        root.querySelector('#m-grades').addEventListener('click', e => {
          const b = e.target.closest('[data-g]'); if (!b) return;
          grade = +b.dataset.g;
          root.querySelectorAll('#m-grades button').forEach(x => x.classList.toggle('on', x === b));
        });
      },
      actions: [
        ...(isNew ? [] : [{ label: 'Löschen', cls: 'danger', value: 'delete' }]),
        { label: 'Abbrechen', value: null },
        {
          label: 'Speichern', cls: 'primary', run: root => {
            if (kind === 'note' && !grade) { shake(root.querySelector('#m-grades')); return false; }
            const d = root.querySelector('#m-date').value;
            if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { shake(root.querySelector('#m-date')); return false; }
            const other = entryOn(st.classId, sid, d);
            if (!isNew && other && other.id !== entry.id) { modalErr(root, `Am ${fmtLong(d)} hat ${st.name} schon einen Eintrag (${labelEntry(other)}). Pro Stunde ist nur eine Note möglich – bitte ein anderes Datum wählen oder den anderen Eintrag ändern.`); return false; }
            return { kind, grade: kind === 'note' ? grade : null, date: d, note: root.querySelector('#m-note').value.trim() };
          }
        }
      ]
    });
    if (!res) return null;
    if (res === 'delete') { removeEntry(entry.id, true); return 'deleted'; }
    if (isNew) {
      const e = addEntry(Object.assign({ sid, cid: st.classId }, res));
      toast(entryToast(e, st.name), { undo: () => undoEntry(e) });
    } else {
      commit(d => { d.entries[entry.id] = Object.assign({}, d.entries[entry.id], res, { updatedAt: now() }); });
      toast('Eintrag geändert');
    }
    return 'saved';
  }

  /* =====================================================================
     Aktionen: Termine, Stunden, Kurse
     ===================================================================== */
  async function editEvent(ev, preset = {}) {
    if (ev?.type === 'tausch' || preset.type === 'tausch') return swapDialog(ev, preset);
    const isNew = !ev;
    const canSwap = isNew && classesSorted().length > 1;
    let type = ev?.type || preset.type || 'pruefung';
    const cs = classesSorted();
    const date = ev?.date || preset.date || todayISO();
    const cid = ev ? (ev.classId || '') : (preset.cid || (S.view === 'kurse' ? S.courseId : '') || '');
    const body = `<div class="seg full" id="m-type">${[['pruefung', 'Prüfung'], ['ausfall', 'Ausfall'], ['termin', 'Termin'], ...(canSwap ? [['tausch', 'Tausch']] : [])].map(([k, l]) => `<button type="button" data-t="${k}" class="${k === type ? 'on' : ''}">${l}</button>`).join('')}</div>
      <label class="field" id="m-kind-f"><span>Art</span><select id="m-kind">${EXAM_KINDS.map(k => `<option ${k === (ev?.kind || 'Klassenarbeit') ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
      <label class="field" id="m-tkind-f"><span>Bezeichnung</span><input id="m-tkind" maxlength="60" value="${esc(ev?.type === 'termin' ? ev.kind || '' : '')}" placeholder="z. B. Elternsprechtag, Konferenz"></label>
      <label class="field"><span>Kurs</span><select id="m-cls"><option value="" id="m-all">–</option>${cs.map(c => `<option value="${c.id}" ${c.id === cid ? 'selected' : ''}>${esc(clsLabel(c))}</option>`).join('')}</select></label>
      <label class="field"><span>Datum</span><input type="date" id="m-date" value="${date}"></label>
      <label class="field"><span id="m-note-l">Bemerkung</span><input type="text" id="m-note" maxlength="200" value="${esc(ev?.note || '')}"></label>
      <div class="field" id="m-aus-f"><span>Durch den Termin fallen Stunden aus</span><div id="m-aus" class="aus-pick"></div></div>
      <p class="muted small" id="m-info"></p>
      <p class="err" hidden></p>`;
    const linked = ev ? live(S.data.events).filter(x => x.type === 'ausfall' && x.terminId === ev.id) : [];
    const ausSel = new Set(linked.map(x => x.classId));
    let ausDate = null;
    const res = await openModal({
      title: isNew ? 'Neuer Eintrag' : 'Eintrag bearbeiten', body,
      mount: (root, close) => {
        const ausPick = () => {
          const d = root.querySelector('#m-date').value;
          root.querySelector('#m-aus-f').classList.toggle('hidden', type !== 'termin');
          if (d === ausDate) return;
          ausDate = d;
          const cls = /^\d{4}-\d{2}-\d{2}$/.test(d) ? [...new Map(lessonsOn(d).filter(l => !l.away).map(l => [l.cls.id, l])).values()] : [];
          root.querySelector('#m-aus').innerHTML = cls.length ? cls.map(l => `<label class="check"><input type="checkbox" value="${l.cls.id}" ${ausSel.has(l.cls.id) ? 'checked' : ''}><span>${esc(clsLabel(l.cls))} <small class="muted">${pLabel(l.from, l.to)}</small></span></label>`).join('')
            : '<p class="muted small">An diesem Tag hast du laut Stundenplan keinen Unterricht.</p>';
          root.querySelectorAll('#m-aus input').forEach(i => i.addEventListener('change', () => { if (i.checked) ausSel.add(i.value); else ausSel.delete(i.value); }));
        };
        const upd = () => {
          ausPick();
          root.querySelectorAll('#m-type button').forEach(x => x.classList.toggle('on', x.dataset.t === type));
          root.querySelector('#m-kind-f').classList.toggle('hidden', type !== 'pruefung');
          root.querySelector('#m-tkind-f').classList.toggle('hidden', type !== 'termin');
          root.querySelector('#m-all').textContent = type === 'ausfall' ? 'Ganzer Tag – alle Kurse' : type === 'termin' ? 'ohne Kurs' : 'Kurs wählen …';
          root.querySelector('#m-note-l').textContent = type === 'ausfall' ? 'Grund' : type === 'pruefung' ? 'Themen / Bemerkung' : 'Notiz';
          const d = root.querySelector('#m-date').value, c = root.querySelector('#m-cls').value;
          let info = '';
          if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
            const fr = freeReason(d);
            if (fr) info = `Achtung: ${fr} – kein Unterricht.`;
            else if (type === 'pruefung' && c) {
              const aus = ausfallFor(d, c);
              if (aus) info = `Achtung: An diesem Tag fällt der Unterricht aus (${aus.note || 'Ausfall'}).`;
              else if (!lessonsOn(d, c).length) info = 'Hinweis: Laut Stundenplan hat der Kurs an diesem Tag keinen Unterricht.';
              else { const inf = examInfo({ classId: c, date: d }); info = `${fmtLong(d)} · ${relDays(inf.days)} · noch ${plural(inf.lessons ?? 0, 'Unterrichtsstunde', 'Unterrichtsstunden')} bis dahin.`; }
            } else if (type === 'ausfall') {
              const ls = lessonsOn(d, c || null);
              info = ls.length ? `Betroffen: ${ls.map(l => `${l.cls.name} ${l.cls.subject || ''} (${pLabel(l.from, l.to)})`).join(', ')}` : 'An diesem Tag ist laut Stundenplan kein Unterricht betroffen.';
            }
          }
          root.querySelector('#m-info').textContent = info;
        };
        root.querySelector('#m-type').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return; if (b.dataset.t === 'tausch') { close({ toSwap: true, date: root.querySelector('#m-date').value, cid: root.querySelector('#m-cls').value }); return; } type = b.dataset.t; upd(); });
        root.querySelector('#m-date').addEventListener('change', upd);
        root.querySelector('#m-cls').addEventListener('change', upd);
        upd();
      },
      actions: [
        ...(isNew ? [] : [{ label: 'Löschen', cls: 'danger', value: 'delete' }]),
        { label: 'Abbrechen', value: null },
        {
          label: 'Speichern', cls: 'primary', run: root => {
            const d = root.querySelector('#m-date').value;
            const c = root.querySelector('#m-cls').value || null;
            if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { shake(root.querySelector('#m-date')); return false; }
            if (type === 'pruefung' && !c) { modalErr(root, 'Bitte einen Kurs wählen.'); return false; }
            const kind = type === 'pruefung' ? root.querySelector('#m-kind').value : type === 'termin' ? (root.querySelector('#m-tkind').value.trim() || 'Termin') : null;
            const ausCids = type === 'termin' ? [...root.querySelectorAll('#m-aus input:checked')].map(i => i.value) : [];
            return { type, kind, classId: c, date: d, note: root.querySelector('#m-note').value.trim(), ausCids };
          }
        }
      ]
    });
    if (!res) return;
    if (res.toSwap) return swapDialog(null, { date: res.date, cid: res.cid });
    if (res === 'delete') {
      const copy = Object.assign({}, S.data.events[ev.id]);
      const lk = linked.map(x => Object.assign({}, x));
      commit(d => { d.events[ev.id] = { id: ev.id, deleted: true, updatedAt: now() }; for (const x of lk) d.events[x.id] = { id: x.id, deleted: true, updatedAt: now() }; });
      toast('Eintrag gelöscht', { undo: () => commit(d => { d.events[ev.id] = Object.assign(copy, { updatedAt: now() }); for (const x of lk) d.events[x.id] = Object.assign(x, { updatedAt: now() }); }) });
      return;
    }
    const id = ev?.id || uid();
    const ausCids = res.ausCids || [];
    delete res.ausCids;
    commit(d => {
      d.events[id] = Object.assign({}, ev || {}, res, { id, updatedAt: now() });
      // Ausfälle, die an diesem Termin hängen: anlegen, verschieben, entfernen
      for (const x of live(d.events).filter(y => y.type === 'ausfall' && y.terminId === id)) if (res.type !== 'termin' || !ausCids.includes(x.classId)) d.events[x.id] = { id: x.id, deleted: true, updatedAt: now() };
      if (res.type === 'termin') for (const cid of ausCids) {
        const aid = id + '-a-' + cid;
        d.events[aid] = { id: aid, type: 'ausfall', kind: null, classId: cid, date: res.date, note: res.kind || 'Termin', terminId: id, updatedAt: now() };
      }
    });
    toast(isNew ? 'Gespeichert' : 'Geändert');
  }

  /* ---------- Stundentausch ---------- */
  async function swapDialog(ev, preset = {}) {
    const all = classesSorted();
    if (all.length < 2) { await openModal({ title: 'Stundentausch', body: '<p>Für einen Tausch brauchst du mindestens zwei Kurse.</p>' }); return; }
    const isNew = !ev;
    let cid = ev?.classId || preset.cid;
    // Normalfall: nur Fächer derselben Klasse. „Erweitert“ schaltet alle Kurse frei (selten nötig).
    let wide = ev ? !partnersOf(S.data.classes[ev.classId]).some(o => o.id === ev.toClassId) : false;
    if (!all.some(c => partnersOf(c).length)) wide = true;
    if (!wide && cid && !partnersOf(S.data.classes[cid]).length) wide = true;
    const srcList = () => wide ? all : all.filter(c => partnersOf(c).length);
    if (!srcList().some(c => c.id === cid)) cid = srcList()[0].id;
    const date0 = ev?.date || preset.date || todayISO();
    const sel0 = ev ? `${ev.from}-${ev.to || (lessonsOn(ev.date, ev.classId).find(x => x.away && x.away.id === ev.id)?.to ?? ev.from)}` : preset.from ? (() => { const l = lessonsOn(preset.date || todayISO(), preset.cid).find(x => x.from === preset.from); return l ? `${l.from}-${l.to}` : null; })() : null;
    const rangesOf = l => l.hours > 1 ? [[l.from, l.to, `${pLabel(l.from, l.to)} (Doppelstunde)`], ...Array.from({ length: l.hours }, (_, i) => [l.from + i, l.from + i, `nur ${l.from + i}. Std.`])] : [[l.from, l.to, pLabel(l.from, l.to)]];
    const lessonOpts = (d, c, sel, ownId) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return [];
      return lessonsOn(d, c).filter(l => !l.swapIn && !l.ausfall && (!l.away || l.away.id === ownId))
        .flatMap(l => rangesOf(l).map(([f, t, lab]) => { const v = `${f}-${t}`; const tt = periodTimes(f, t);
          return `<option value="${v}" ${v === sel ? 'selected' : ''}>${lab} · ${esc(tt.start)}–${esc(tt.end)}${l.away && l.away.id !== ownId ? ' – schon getauscht' : ''}</option>`; }));
    };
    const pair = ev?.pairId ? S.data.events[ev.pairId] : null;
    const body = `<p class="muted small">Statt des einen Fachs unterrichtest du in derselben Klasse das andere – z. B. statt Deutsch Englisch. Die Stunde zählt dann für das andere Fach (auch bei „Stunden bis zur Klassenarbeit“). Ein Rücktausch gibt sie wieder zurück.</p>
      <label class="field"><span>Kurs, der die Stunde abgibt</span><select id="s-cls"></select></label>
      <div class="two-col"><label class="field"><span>Datum</span><input type="date" id="s-date" value="${date0}"></label>
        <label class="field"><span>Stunde</span><select id="s-les"></select></label></div>
      <label class="field"><span>Stattdessen unterrichtest du</span><select id="s-to"></select></label>
      ${isNew ? `<label class="check"><input type="checkbox" id="s-back"><span>Rücktausch eintragen – an einem anderen Tag gibt das andere Fach dafür eine Stunde ab</span></label>
      <label class="field hidden" id="s-back-f"><span>Welche Stunde gibt das andere Fach ab?</span><select id="s-bles"></select></label>` : pair && !pair.deleted ? `<p class="hint-box">${icon('swap')}<span>Dazugehöriger Rücktausch: ${fmtLong(pair.date)}, ${swapText(pair)}</span></p>` : ''}
      <label class="check small-check"><input type="checkbox" id="s-wide" ${wide ? 'checked' : ''}><span>Erweitert: auch mit Kursen anderer Klassen tauschen (selten)</span></label>
      <label class="field"><span>Bemerkung (optional)</span><input id="s-note" maxlength="120" value="${esc(ev?.note || '')}" placeholder="z. B. wegen Klassenarbeit Englisch"></label>
      <p class="muted small" id="s-info"></p><p class="err" hidden></p>`;
    const res = await openModal({
      title: isNew ? 'Stundentausch eintragen' : 'Stundentausch bearbeiten', body,
      mount: root => {
        const $ = q => root.querySelector(q);
        const upd = () => {
          wide = $('#s-wide').checked;
          const prevC = $('#s-cls').value || cid;
          let src = srcList();
          if (!src.length) { $('#s-wide').checked = wide = true; src = srcList(); }
          $('#s-cls').innerHTML = src.map(o => `<option value="${o.id}" ${o.id === prevC ? 'selected' : ''}>${esc(clsLabel(o))}</option>`).join('');
          const c = $('#s-cls').value, d = $('#s-date').value, cc = S.data.classes[c];
          const prevTo = $('#s-to').value || ev?.toClassId;
          const targets = wide ? [...partnersOf(cc), ...all.filter(o => o.id !== c && !partnersOf(cc).includes(o))] : partnersOf(cc);
          $('#s-to').innerHTML = targets.map(o => `<option value="${o.id}" ${o.id === prevTo ? 'selected' : ''}>${esc(clsLabel(o))}</option>`).join('');
          const prevL = $('#s-les').value || sel0;
          const opts = lessonOpts(d, c, prevL, ev?.id);
          $('#s-les').innerHTML = opts.join('') || '<option value="">keine Stunde</option>';
          const fr = /^\d{4}-\d{2}-\d{2}$/.test(d) ? freeReason(d) : null;
          $('#s-info').textContent = fr ? `Achtung: ${fr} – kein Unterricht.` : !opts.length ? `An diesem Tag hat ${clsLabel(S.data.classes[c])} laut Stundenplan keinen Unterricht.` : '';
          if ($('#s-back')) {
            $('#s-back-f').classList.toggle('hidden', !$('#s-back').checked);
            const tc = $('#s-to').value, out = [];
            const [mf, mt] = ($('#s-les').value || '0-0').split('-').map(Number), want = mt - mf + 1;
            let prevB = $('#s-bles').value;
            let dd = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : todayISO();
            for (let i = 0; i < 100 && out.length < 40; i++, dd = addDaysISO(dd, 1))
              for (const l of lessonsOn(dd, tc)) if (!l.swapIn && !l.away && !l.ausfall && (dd > d || l.to < mf || l.from > mt))
                for (const [f, t, lab] of rangesOf(l)) out.push({ v: `${l.date}|${f}|${t}`, h: t - f + 1, lab: `${WD[wdOf(l.date)]} ${fmtISO(l.date)} · ${lab}` });
            if (!out.some(o => o.v === prevB)) prevB = (out.find(o => o.h === want) || out[0])?.v; // gleiche Stundenzahl vorschlagen
            $('#s-bles').innerHTML = out.map(o => `<option value="${o.v}" ${o.v === prevB ? 'selected' : ''}>${o.lab}</option>`).join('') || '<option value="">keine Stunde gefunden</option>';
          }
        };
        ['#s-cls', '#s-date', '#s-to', '#s-back', '#s-les', '#s-wide'].forEach(q => $(q)?.addEventListener('change', upd));
        upd();
      },
      actions: [
        ...(isNew ? [] : [{ label: 'Löschen', cls: 'danger', value: 'delete' }]),
        { label: 'Abbrechen', value: null },
        {
          label: 'Speichern', cls: 'primary', run: root => {
            const $ = q => root.querySelector(q);
            const c = $('#s-cls').value, d = $('#s-date').value, to = $('#s-to').value;
            const [f, t] = ($('#s-les').value || '').split('-').map(Number);
            if (!f) { modalErr(root, 'Bitte einen Tag mit Unterricht in diesem Fach wählen.'); return false; }
            if (!to) { modalErr(root, 'Bitte den Kurs wählen, den du stattdessen unterrichtest.'); return false; }
            const out = { main: { type: 'tausch', kind: null, classId: c, toClassId: to, date: d, from: f, to: t, note: $('#s-note').value.trim() } };
            if ($('#s-back')?.checked) {
              const [bd, bf, bt] = ($('#s-bles').value || '').split('|');
              if (!bf) { modalErr(root, 'Für den Rücktausch bitte eine Stunde des anderen Fachs wählen.'); return false; }
              out.back = { type: 'tausch', kind: null, classId: to, toClassId: c, date: bd, from: +bf, to: +bt, note: 'Rücktausch' };
            }
            return out;
          }
        }
      ]
    });
    if (!res) return;
    if (res === 'delete') {
      const copy = Object.assign({}, S.data.events[ev.id]);
      commit(d => { d.events[ev.id] = { id: ev.id, deleted: true, updatedAt: now() }; });
      toast('Tausch gelöscht', { undo: () => commit(d => { d.events[ev.id] = Object.assign(copy, { updatedAt: now() }); }) });
      return;
    }
    const id = ev?.id || uid(), bid = res.back ? uid() : null;
    commit(d => {
      d.events[id] = Object.assign({}, ev || {}, res.main, { id, updatedAt: now() }, bid ? { pairId: bid } : {});
      if (bid) d.events[bid] = Object.assign({}, res.back, { id: bid, pairId: id, updatedAt: now() });
    });
    toast(bid ? 'Tausch und Rücktausch gespeichert' : isNew ? 'Tausch gespeichert' : 'Geändert');
  }

  async function lessonSheet(cid, date, from) {
    const c0 = S.data.classes[cid];
    const l = lessonsOn(date, cid).find(x => x.from === from) || { cls: c0, date, from, to: from, hours: 1, cancelled: null, ...periodTimes(from, from), room: c0?.room };
    const c = l.cls;
    const exams = eventsOn(date).filter(e => e.type === 'pruefung' && e.classId === cid);
    const aus = l.ausfall;
    const sw = l.away || l.swapIn;
    const lTodos = openTodos().filter(x => x.classId === cid && (x.date ? x.date <= date : todoDue(x) === date || todoDue(x) === null)).sort(todoSort);
    const canSwap = !sw && !aus && partnersOf(c).length;
    const r = await openModal({
      title: clsLabel(c),
      body: `<div class="sheet-head" ${ccStyle(c)}><div class="sheet-bar"></div><div>
          <strong>${fmtLong(date)}</strong>
          <span>${pLabel(l.from, l.to)} · ${esc(l.start)}–${esc(l.end)}${l.room ? ' · ' + esc(l.room) : ''}</span></div></div>
        ${l.away ? `<div class="lesson-note swap">${icon('swap')} Getauscht: stattdessen ${esc(clsLabel(S.data.classes[l.away.toClassId]))}</div>`
          : l.swapIn ? `<div class="lesson-note swap">${icon('swap')} Tausch: diese Stunde statt ${esc(clsLabel(l.swapFrom))}</div>`
          : l.cancelled ? `<div class="lesson-note cancel">${icon('ban')} Fällt aus: ${esc(l.cancelled)}${aus && !aus.classId ? ' (ganzer Tag)' : ''}</div>` : ''}
        ${exams.map(e => `<div class="lesson-note exam">${icon('flag')} ${esc(e.kind || 'Prüfung')}${e.note ? ' – ' + esc(e.note) : ''}</div>`).join('')}
        ${lTodos.length ? `<div class="sheet-todos"><h4>${icon('todo')} Vor dieser Stunde erledigen</h4>${todoList(lTodos, { course: false })}</div>` : ''}
        <div class="sheet-actions">
          <button type="button" class="sheet-btn" data-sa="todo">${icon('todo')}<span>To-do für diese Stunde …</span></button>
          <button type="button" class="sheet-btn" data-sa="noten">${icon('edit')}<span>Mündliche Noten eintragen</span></button>
          ${sw ? `<button type="button" class="sheet-btn" data-sa="tausch-edit">${icon('swap')}<span>Tausch bearbeiten / aufheben</span></button>` : ''}
          ${canSwap ? `<button type="button" class="sheet-btn" data-sa="tausch">${icon('swap')}<span>Stundentausch: stattdessen ${esc(partnersOf(c).map(o => o.subject || o.name).join(' / '))} …</span></button>` : ''}
          ${sw ? '' : aus ? `<button type="button" class="sheet-btn" data-sa="ausfall-edit">${icon('ban')}<span>${aus.classId ? 'Ausfall aufheben / bearbeiten' : 'Ganztägigen Ausfall bearbeiten'}</span></button>`
            : `<button type="button" class="sheet-btn" data-sa="ausfall">${icon('ban')}<span>Stunde fällt aus …</span></button>`}
          <button type="button" class="sheet-btn" data-sa="pruefung">${icon('flag')}<span>Prüfung an diesem Tag eintragen</span></button>
          <button type="button" class="sheet-btn" data-sa="kurs">${icon('book')}<span>Kurs öffnen</span></button>
        </div>`,
      actions: [{ label: 'Schließen', value: null }],
      mount: (root, close) => {
        root.querySelectorAll('[data-sa]').forEach(b => b.addEventListener('click', () => close(b.dataset.sa)));
        root.addEventListener('click', e => {
          const b = e.target.closest('[data-action="todoToggle"], [data-action="todoEdit"]'); if (!b) return;
          if (b.dataset.action === 'todoToggle') { todoToggle(b.dataset.id); b.closest('.todo')?.classList.toggle('done'); }
          else { close(null); A.todoEdit(b.dataset); }
        });
      }
    });
    if (r === 'noten') openNoten(cid, date);
    else if (r === 'ausfall') {
      const reason = await openModal({
        title: 'Stunde fällt aus', autofocus: canHover(),
        body: `<p class="muted small">${esc(clsLabel(c))} · ${fmtLong(date)}</p><label class="field"><span>Grund (optional)</span><input id="m-r" maxlength="120" placeholder="z. B. Exkursion, krank, Klausuraufsicht"></label>`,
        actions: [{ label: 'Abbrechen', value: null }, { label: 'Als Ausfall speichern', cls: 'primary', run: root => root.querySelector('#m-r').value.trim() || 'Ausfall' }]
      });
      if (reason) {
        const id = uid();
        commit(d => { d.events[id] = { id, type: 'ausfall', kind: null, classId: cid, date, note: reason, updatedAt: now() }; });
        toast('Ausfall eingetragen', { undo: () => commit(d => { d.events[id] = { id, deleted: true, updatedAt: now() }; }) });
      }
    } else if (r === 'ausfall-edit') editEvent(aus);
    else if (r === 'tausch') swapDialog(null, { cid, date, from: l.from });
    else if (r === 'todo') todoDialog(null, { cid, date });
    else if (r === 'tausch-edit') swapDialog(sw);
    else if (r === 'pruefung') editEvent(null, { type: 'pruefung', cid, date });
    else if (r === 'kurs') { S.view = 'kurse'; S.courseId = cid; S.courseTab = 'ueberblick'; render(); window.scrollTo(0, 0); }
  }
  function openNoten(cid, date) {
    S.view = 'kurse'; S.courseId = cid; S.courseTab = 'muendlich'; S.classId = cid; S.detailStudent = null; S.assessId = null;
    if (date) { S.weekStart = weekKey(date); S.day = wdOf(date) < 5 ? date : null; }
    if (!weekHasLessons(cid, S.weekStart)) { S.weekStart = lessonWeek(cid, S.weekStart, -1); S.day = null; }
    S.cardIdx = 0; saveUI(); render(); window.scrollTo(0, 0);
  }

  async function newClassDialog() {
    let color = nextColor();
    const res = await openModal({
      title: 'Neuer Kurs', autofocus: canHover(),
      body: `<div class="two-col"><label class="field"><span>Kurs / Klasse</span><input id="m-name" maxlength="40" placeholder="z. B. 7b oder Q1"></label>
        <label class="field"><span>Fach</span><input id="m-subj" maxlength="40" placeholder="z. B. Deutsch"></label></div>
        <div class="field"><span>Farbe</span><div class="swatches" id="m-sw">${COLORS.map(c => `<button type="button" class="swatch ${c === color ? 'on' : ''}" style="--sw:${c}" data-c="${c}" aria-label="Farbe"></button>`).join('')}</div></div>
        <label class="field"><span>Kinder – ein Name pro Zeile (aus Excel einfügbar)</span><textarea id="m-names" rows="6" placeholder="Anna M.&#10;Ben K.&#10;…"></textarea></label>
        <p class="muted small">Die Unterrichtsstunden trägst du danach im Kurs unter „Stunden“ ein – oder importierst sie aus der Ganzjahresplanung.</p>`,
      mount: root => root.querySelector('#m-sw').addEventListener('click', e => {
        const b = e.target.closest('[data-c]'); if (!b) return;
        color = b.dataset.c;
        root.querySelectorAll('#m-sw .swatch').forEach(x => x.classList.toggle('on', x === b));
      }),
      actions: [{ label: 'Abbrechen' }, {
        label: 'Anlegen', cls: 'primary', run: root => {
          const name = root.querySelector('#m-name').value.trim();
          if (!name) { shake(root.querySelector('#m-name')); return false; }
          return { name, subject: root.querySelector('#m-subj').value.trim(), names: root.querySelector('#m-names').value };
        }
      }]
    });
    if (!res) return;
    const id = uid();
    S.classId = id; S.cardIdx = 0; S.view = 'kurse'; S.courseId = id; S.courseTab = res.names.trim() ? 'stundenplan' : 'schueler'; saveUI();
    let n = 0;
    commit(d => { d.classes[id] = { id, name: res.name, subject: res.subject, color, room: '', slots: [], updatedAt: now() }; n = addStudentsTo(d, id, res.names); });
    toast(`Kurs ${res.name} angelegt${n ? ` – ${plural(n, 'Kind', 'Kinder')}` : ''}`);
  }
  const parseNames = text => (text || '').split(/\r?\n/).map(s => s.replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean).map(s => s.slice(0, 80));
  function addStudentsTo(d, cid, text) {
    const names = parseNames(text);
    const used = usedCodes(d), nm = S.device.names || (S.device.names = {});
    for (const name of names) { const id = uid(); nm[id] = name; d.students[id] = { id, classId: cid, code: newCode(used), updatedAt: now() }; }
    return names.length;
  }
  function tombstoneStudent(d, sid) {
    for (const e of Object.values(d.entries)) if (!e.deleted && e.studentId === sid) d.entries[e.id] = { id: e.id, deleted: true, updatedAt: now() };
    d.students[sid] = { id: sid, deleted: true, updatedAt: now() };
    if (S.device.names) delete S.device.names[sid];
  }
  function updateClass(id, patch) { commit(d => { d.classes[id] = Object.assign({}, d.classes[id], patch, { updatedAt: now() }); }); }

  /* =====================================================================
     Aktionen: Passwort, Passkey, Einrichtungscode, Export, Sicherung
     ===================================================================== */
  async function askPassword(title, text) {
    return openModal({
      title, autofocus: true,
      body: `<p>${text}</p><input class="sr" type="text" autocomplete="username" value="Notenheft" tabindex="-1" aria-hidden="true"><label class="field"><span>Passwort</span><input type="password" id="m-pw" autocomplete="current-password"></label>`,
      actions: [{ label: 'Abbrechen', value: null }, { label: 'OK', cls: 'primary', run: root => root.querySelector('#m-pw').value || false }]
    });
  }
  async function askRemotePassword() {
    const pw = await openModal({
      title: 'Passwort geändert?', autofocus: true,
      body: `<p>Die Daten im GitHub-Speicher lassen sich mit dem Passwort dieses Geräts nicht entschlüsseln. Wurde das Passwort auf einem anderen Gerät geändert? Dann gib hier das <strong>neue</strong> Passwort ein.</p>
        <input class="sr" type="text" autocomplete="username" value="Notenheft" tabindex="-1" aria-hidden="true">
        <label class="field"><span>Neues Passwort</span><input type="password" id="m-pw" autocomplete="current-password"></label><p class="err" hidden></p>`,
      actions: [{ label: 'Abbrechen', value: null }, {
        label: 'Übernehmen', cls: 'primary', run: async root => {
          const p = root.querySelector('#m-pw').value;
          if (!p) return false;
          try { const r = await GH.get(S.device.gh); if (r) await Vault.decrypt(r.blob, p); return p; }
          catch (e) { modalErr(root, e.code === 'WRONG_PW' ? 'Auch dieses Passwort passt nicht.' : e.message); return false; }
        }
      }]
    });
    if (!pw) return;
    Vault.password = pw; Vault.salt = Vault.newSalt(); Vault.keys.clear();
    await persistLocal();
    const hadPk = !!Passkey.rec();
    Passkey.remove();
    S.sync.state = 'idle';
    toast(hadPk ? `Neues Passwort übernommen – bitte ${Passkey.label()} neu einrichten.` : 'Neues Passwort übernommen');
    syncNow({ force: true });
  }
  async function changePassword() {
    const res = await openModal({
      title: 'Passwort ändern', autofocus: true,
      body: `<input class="sr" type="text" autocomplete="username" value="Notenheft" tabindex="-1" aria-hidden="true">
        <label class="field"><span>Aktuelles Passwort</span><input type="password" id="m-cur" autocomplete="current-password"></label>
        <label class="field"><span>Neues Passwort (mind. 10 Zeichen)</span><input type="password" id="m-new" autocomplete="new-password"></label>
        <label class="field"><span>Neues Passwort wiederholen</span><input type="password" id="m-new2" autocomplete="new-password"></label>
        <p class="err" hidden></p>`,
      actions: [{ label: 'Abbrechen', value: null }, {
        label: 'Ändern', cls: 'primary', run: root => {
          const cur = root.querySelector('#m-cur').value, nw = root.querySelector('#m-new').value, nw2 = root.querySelector('#m-new2').value;
          if (cur !== Vault.password) { modalErr(root, 'Das aktuelle Passwort stimmt nicht.'); return false; }
          if (nw.length < 10) { modalErr(root, 'Das neue Passwort braucht mindestens 10 Zeichen.'); return false; }
          if (nw !== nw2) { modalErr(root, 'Die neuen Passwörter stimmen nicht überein.'); return false; }
          return nw;
        }
      }]
    });
    if (!res) return;
    if (ghReady() && !S.device.oldPw) S.device.oldPw = Vault.password;
    Vault.password = res; Vault.salt = Vault.newSalt(); Vault.keys.clear();
    await persistLocal();
    const hadPk = !!Passkey.rec();
    Passkey.remove();
    render();
    if (ghReady()) syncNow({ force: true });
    openModal({
      title: 'Passwort geändert',
      body: `<p>${ghReady() ? 'Auf deinen anderen Geräten fragt Notenheft beim nächsten Abgleich nach dem neuen Passwort (oben auf „Passwort?“ tippen).' : 'Das neue Passwort gilt ab sofort.'}</p>
        ${hadPk ? `<p>${Passkey.label()} wurde deaktiviert – richte es unter „Mehr“ einfach neu ein.</p>` : ''}`
    });
  }
  async function passkeyEnroll() {
    try {
      await Passkey.enroll(Vault.password);
      render();
      toast(`${Passkey.label()} ist eingerichtet`);
    } catch (e) {
      console.warn(e);
      if (e.name === 'NotAllowedError' || e.name === 'AbortError') return toast('Abgebrochen');
      openModal({ title: `${Passkey.label()} nicht verfügbar`, body: `<p>${esc(e.message || String(e))}</p><p class="muted small">Alternative: Beim Entsperren das Passwort im Schlüsselbund (iCloud bzw. Browser) speichern lassen – dann füllt ${isIOS() ? 'Face ID' : 'der Browser'} es automatisch aus.</p>` });
    }
  }
  async function passkeyUnlock() {
    const err = $('#pk-err');
    try {
      const pw = await Passkey.unlock();
      await unlockWith(pw);
    } catch (e) {
      console.warn(e);
      if (e.code === 'WRONG_PW') { Passkey.remove(); render(); toast(`${Passkey.label()} passt nicht mehr zum Passwort – bitte Passwort eingeben und neu einrichten.`, { error: true }); return; }
      if (err && e.name !== 'NotAllowedError' && e.name !== 'AbortError') { err.textContent = e.message; err.hidden = false; }
    }
  }
  async function unlockWith(pw) {
    let blob;
    try { blob = JSON.parse(localStorage.getItem(LS_VAULT)); } catch { throw new Error('Gespeicherte Daten sind beschädigt.'); }
    const obj = await Vault.decrypt(blob, pw);
    Vault.password = pw; Vault.salt = blob.salt;
    await Vault.key(blob.salt, blob.iter, pw);
    S.data = normalizeData(obj.data);
    S.device = Object.assign(defaultDevice(), obj.device || {});
    const migrated = adoptData();
    if (migrated) { persistLocal(); scheduleSync(1000); }
    S.lastActivity = now();
    S.heuteDate = null; S.planWeek = toISO(mondayOf(new Date())); S.weekStart = S.planWeek;
    if (S.startMenu !== false) S.view = 'start'; // beim Öffnen: Startmenü
    render();
    const nd = dedupeEntries();
    if (nd) toast(`${plural(nd, 'doppelte Note', 'doppelte Noten')} am selben Tag bereinigt – jeweils die zuletzt eingetragene zählt.`, { ms: 6000 });
    syncNow();
  }
  async function makeSetupCode() {
    const blob = await Vault.encrypt({ gh: S.device.gh });
    const code = 'NH1.' + b64url(utf8(JSON.stringify(blob)));
    await openModal({
      title: 'Einrichtungscode',
      body: `<p>Auf dem anderen Gerät Notenheft öffnen → <strong>Gerät verbinden</strong> → Code einfügen → Passwort eingeben.</p>
        <p class="muted small">Der Code enthält deinen GitHub-Zugang, ist aber mit deinem Passwort verschlüsselt. Du kannst ihn dir also z. B. per Mail oder über OneDrive schicken – ohne Passwort ist er wertlos.</p>
        <textarea class="code" readonly rows="6">${code}</textarea>`,
      actions: [{ label: 'Schließen', value: null }, {
        label: 'Kopieren', cls: 'primary', run: async root => {
          try { await navigator.clipboard.writeText(code); toast('Code kopiert'); }
          catch { root.querySelector('textarea').select(); toast('Bitte markierten Code kopieren', { error: true }); }
          return false;
        }
      }]
    });
  }
  async function makeNameList() {
    const list = {};
    for (const st of live(S.data.students)) { const n = (S.device.names || {})[st.id]; if (n && st.code) list[st.code] = n; }
    const blob = await Vault.encrypt({ names: list });
    const json = JSON.stringify(blob);
    const code = 'NN1.' + b64url(utf8(json));
    await openModal({
      title: 'Namensliste für ein anderes Gerät',
      body: `<p>Auf dem anderen Gerät: <strong>Mehr → Namensliste importieren</strong> → Code einfügen.</p>
        <p class="muted small">Der Code enthält die Klarnamen (${Object.keys(list).length}), ist aber mit deinem Passwort verschlüsselt. Er gehört nicht in GitHub, sondern z. B. in eine Mail an dich selbst oder in OneDrive. Danach löschen.</p>
        <textarea class="code" readonly rows="6">${code}</textarea>`,
      actions: [{ label: 'Schließen', value: null }, {
        label: 'Kopieren', cls: 'primary', run: async root => {
          try { await navigator.clipboard.writeText(code); toast('Code kopiert'); }
          catch { root.querySelector('textarea').select(); toast('Bitte markierten Code kopieren', { error: true }); }
          return false;
        }
      }]
    });
  }
  async function importNameList() {
    const code = await openModal({
      title: 'Namensliste importieren', autofocus: true,
      body: `<p class="muted small">Code vom anderen Gerät einfügen (beginnt mit NN1.). Vorhandene Namen werden überschrieben, wenn sie im Code stehen.</p>
        <textarea id="m-code" class="code" rows="6" placeholder="NN1.…" autocapitalize="off" autocorrect="off" spellcheck="false"></textarea><p class="err" hidden></p>`,
      actions: [{ label: 'Abbrechen', value: null }, { label: 'Importieren', cls: 'primary', run: root => root.querySelector('#m-code').value.replace(/\s+/g, '') || false }]
    });
    if (!code) return;
    try {
      if (!code.startsWith('NN1.')) throw new Error('Das ist keine Namensliste.');
      let blob; try { blob = JSON.parse(unutf8(fromB64url(code.slice(4)))); } catch { throw new Error('Der Code ist unvollständig oder beschädigt.'); }
      let obj; try { obj = await Vault.decrypt(blob); } catch (e) { if (e.code === 'WRONG_PW') throw new Error('Der Code wurde mit einem anderen Passwort erstellt.'); throw e; }
      const nm = S.device.names || (S.device.names = {});
      let n = 0;
      for (const st of live(S.data.students)) { const v = obj.names?.[st.code]; if (v) { nm[st.id] = v; n++; } }
      hydrateNames(); render(); persistLocal();
      toast(`${plural(n, 'Name', 'Namen')} übernommen${missingNames() ? `, ${missingNames()} fehlen noch` : ''}`);
    } catch (e) { toast(e.message, { error: true }); }
  }
  async function decodeSetupCode(code, pw) {
    code = code.replace(/\s+/g, '');
    if (!code.startsWith('NH1.')) throw new Error('Das ist kein gültiger Einrichtungscode.');
    let blob;
    try { blob = JSON.parse(unutf8(fromB64url(code.slice(4)))); } catch { throw new Error('Der Einrichtungscode ist unvollständig oder beschädigt.'); }
    try { return (await Vault.decrypt(blob, pw)).gh; }
    catch (e) { if (e.code === 'WRONG_PW') throw new Error('Das Passwort passt nicht zum Einrichtungscode.'); throw e; }
  }

  function csvCell(v) {
    if (v == null) return '';
    const s = String(v);
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }
  const safeName = s => String(s).replace(/[^\wäöüÄÖÜß.-]+/g, '_');
  async function saveFile(name, blob) {
    if (isIOS() && navigator.canShare) {
      const file = new File([blob], name, { type: blob.type });
      if (navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file] }); return; }
        catch (e) { if (e.name === 'AbortError') return; }
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  async function downloadCSV(name, rows) {
    const ok = await confirmDialog('CSV exportieren', 'Die CSV-Datei ist <strong>nicht verschlüsselt</strong>. Bitte nur auf einem dafür genehmigten Gerät speichern und nach Gebrauch löschen.', 'Exportieren');
    if (!ok) return;
    const text = '﻿' + rows.map(r => r.map(csvCell).join(';')).join('\r\n');
    saveFile(name, new Blob([text], { type: 'text/csv;charset=utf-8' }));
  }
  function exportOverview() {
    const cls = ensureClass(); if (!cls) return;
    const [from, to] = rangeFor(S.ovRange);
    const rows = overviewRows(cls, from, to);
    const { weeks, cells } = matrixCells(entriesOf(cls.id, from, to));
    const out = [['Kurs', 'Fach', 'Name', 'Durchschnitt', 'Anzahl Noten', 'fehlte', 'ohne Note', ...weeks.map(w => `KW ${isoWeek(parseISO(w))} (${fmtISO(w, true)})`)]];
    for (const { s, st } of rows) {
      out.push([cls.name, cls.subject || '', s.name, st.avg == null ? '' : fmtNum(st.avg), st.count, st.absent, st.nb,
        ...weeks.map(w => { const c = weekCell(cells.get(s.id + '|' + w)); return c.avg != null ? fmtNum(c.avg) : c.txt === '–' ? 'ohne Note' : c.txt; })]);
    }
    downloadCSV(`Notenheft_${safeName(cls.name)}_${safeName(cls.subject || '')}_Uebersicht_${todayISO()}.csv`, out);
  }
  function exportEntries() {
    const cls = ensureClass(); if (!cls) return;
    const [from, to] = rangeFor(S.ovRange);
    const out = [['Datum', 'KW', 'Kurs', 'Fach', 'Name', 'Art', 'Note', 'Notiz']];
    for (const e of entriesOf(cls.id, from, to).sort(byDate)) {
      const s = S.data.students[e.studentId];
      if (!s || s.deleted) continue;
      out.push([fmtISO(e.date, true), isoWeek(parseISO(e.date)), cls.name, cls.subject || '', s.name,
        e.kind === 'note' ? 'Note' : e.kind === 'fehlte' ? 'fehlte' : 'ohne Note', e.grade ?? '', e.note || '']);
    }
    downloadCSV(`Notenheft_${safeName(cls.name)}_${safeName(cls.subject || '')}_Eintraege_${todayISO()}.csv`, out);
  }
  async function backupDownload() {
    const blob = await Vault.encrypt({ data: S.data, names: S.device.names || {} });
    saveFile(`Notenheft_Sicherung_${todayISO()}.json`, new Blob([JSON.stringify(blob)], { type: 'application/json' }));
  }
  async function importBackup(file) {
    if (!file) return;
    let blob;
    try { blob = JSON.parse(await file.text()); } catch { return toast('Datei nicht lesbar', { error: true }); }
    let obj;
    try { obj = await Vault.decrypt(blob); }
    catch (e) {
      if (e.code !== 'WRONG_PW') return toast('Keine gültige Notenheft-Sicherung', { error: true });
      const pw = await askPassword('Sicherung entschlüsseln', 'Diese Sicherung wurde mit einem anderen Passwort erstellt.');
      if (!pw) return;
      try { obj = await Vault.decrypt(blob, pw); } catch { return toast('Passwort falsch', { error: true }); }
    }
    const ok = await confirmDialog('Sicherung einspielen', 'Die Sicherung wird mit den vorhandenen Daten zusammengeführt. Bei Unterschieden gewinnt die jeweils neuere Änderung.', 'Einspielen');
    if (!ok) return;
    const nm = S.device.names || (S.device.names = {});
    for (const [k, v] of Object.entries(obj.names || {})) if (!nm[k]) nm[k] = v;
    const merged = mergeData(S.data, normalizeData(obj.data));
    migrateNames(merged);
    commit(d => { Object.assign(d, merged); });
    toast('Sicherung eingespielt');
  }

  async function lock() {
    if (!S.data) return;
    if (S.sync.timer || S.sync.running) { try { await Promise.race([syncNow(), sleep(8000)]); } catch { /* egal */ } }
    await persistChain;
    closeModal();
    S.data = null; S.device = null; Vault.clear();
    S.detailStudent = null; S.courseId = null;
    S.sync = freshSync();
    render();
  }

  function formBusy(form, on) {
    const b = form.querySelector('[type=submit]');
    if (!b) return;
    if (on) { b.dataset.label = b.innerHTML; b.textContent = 'Bitte warten …'; b.disabled = true; }
    else { b.innerHTML = b.dataset.label || b.innerHTML; b.disabled = false; }
  }
  function formErr(form, msg) {
    const p = form.querySelector('.err');
    if (p) { p.textContent = msg; p.hidden = false; }
    shake(p);
  }
  async function runForm(form, fn) {
    formBusy(form, true);
    try { await fn(); }
    catch (e) { console.warn(e); if (document.body.contains(form)) formErr(form, e.message || String(e)); }
    finally { if (document.body.contains(form)) formBusy(form, false); }
  }

  /* =====================================================================
     Formulare, Auswahlfelder, Klick-Aktionen
     ===================================================================== */
  const F = {
    setupNew(f) {
      const el = f.elements;
      if (el.pw.value.length < 10) return formErr(f, 'Bitte mindestens 10 Zeichen.');
      if (el.pw.value !== el.pw2.value) return formErr(f, 'Die Passwörter stimmen nicht überein.');
      if (!el.ok.checked) return formErr(f, 'Bitte den Hinweis zum Passwort bestätigen.');
      return runForm(f, async () => {
        Vault.password = el.pw.value; Vault.salt = Vault.newSalt();
        S.data = emptyData(); S.device = defaultDevice();
        await persistLocal();
        requestPersist();
        S.view = 'start'; S.lastActivity = now(); saveUI();
        render();
        toast('Notenheft angelegt – importiere jetzt deine Planung oder lege Kurse an.');
      });
    },
    setupConnect(f) {
      const el = f.elements;
      const pw = el.pw.value;
      if (!pw) return formErr(f, 'Bitte das Passwort eingeben.');
      return runForm(f, async () => {
        const code = el.code.value.trim();
        let gh;
        if (code) gh = await decodeSetupCode(code, pw);
        else {
          gh = parseGh(el.owner.value, el.repo.value, el.path.value, el.token.value);
          if (!gh.owner || !gh.repo || !gh.token) throw new Error('Bitte den Einrichtungscode einfügen oder alle GitHub-Felder ausfüllen.');
        }
        await GH.checkRepo(gh);
        const remote = await GH.get(gh);
        let data;
        if (remote) {
          try { data = (await Vault.decrypt(remote.blob, pw)).data; }
          catch (e) { if (e.code === 'WRONG_PW') throw new Error('Das Passwort passt nicht zu den gespeicherten Daten.'); throw e; }
        } else {
          const ok = await confirmDialog('Noch keine Daten', 'Im Repository liegen noch keine Notenheft-Daten. Mit einem leeren Notenheft beginnen?', 'Leer beginnen');
          if (!ok) return;
          if (pw.length < 10) throw new Error('Für ein neues Notenheft bitte ein Passwort mit mindestens 10 Zeichen wählen.');
          data = emptyData();
        }
        Vault.password = pw;
        Vault.salt = remote?.blob?.salt || Vault.newSalt();
        S.data = normalizeData(data);
        S.device = Object.assign(defaultDevice(), { gh });
        adoptData();
        S.sync.repoOk = true;
        await persistLocal();
        requestPersist();
        S.view = 'start'; S.lastActivity = now(); saveUI();
        render();
        toast(missingNames() ? `Verbunden. Es fehlen noch ${missingNames()} Namen – Mehr → Namensliste importieren.` : 'Verbunden – Daten geladen.', { ms: missingNames() ? 7000 : 3200 });
        syncNow();
      });
    },
    unlock(f) {
      const pw = f.elements.pw.value;
      if (!pw) return formErr(f, 'Bitte das Passwort eingeben.');
      return runForm(f, async () => {
        try { await unlockWith(pw); }
        catch (e) { if (e.code === 'WRONG_PW') { f.elements.pw.select(); throw new Error('Falsches Passwort.'); } throw e; }
      });
    },
    ghSave(f) {
      const el = f.elements;
      const old = S.device.gh || {};
      const gh = parseGh(el.owner.value, el.repo.value, el.path.value, el.token.value || old.token);
      if (!gh.owner || !gh.repo || !gh.token) return formErr(f, 'Bitte Benutzername, Repository und Token ausfüllen.');
      return runForm(f, async () => {
        await GH.checkRepo(gh);
        S.device.gh = gh;
        S.sync.repoOk = true; S.sync.state = 'idle';
        await persistLocal();
        render();
        toast('Verbindung klappt – synchronisiere …');
        syncNow({ force: true });
      });
    },
    addStudents(f) {
      const cid = S.courseId;
      let n = 0;
      commit(d => { n = addStudentsTo(d, cid, f.elements.names.value); });
      if (n) toast(`${plural(n, 'Kind', 'Kinder')} hinzugefügt`);
    },
    addSlot(f) {
      const el = f.elements;
      const c = S.data.classes[S.courseId];
      const wd = +el.wd.value, from = +el.from.value, to = Math.max(from, +el.to.value);
      const slots = (c.slots || []).filter(s => !(s.wd === wd && s.from === from));
      slots.push({ wd, from, to, room: el.room.value.trim() });
      updateClass(c.id, { slots });
      toast(`${WD_LONG[wd - 1]}, ${pLabel(from, to)} hinzugefügt`);
    },
    addObs(f) {
      const text = f.elements.text.value.trim();
      if (!text) return shake(f.elements.text);
      const s = S.data.students[f.elements.sid.value];
      const id = uid();
      commit(d => { d.obs[id] = { id, classId: s.classId, studentId: s.id, date: f.elements.date.value || todayISO(), text, updatedAt: now() }; });
      toast('Beobachtung gespeichert');
    },
    addHoliday(f) {
      const el = f.elements;
      const name = el.name.value.trim(), from = el.from.value, to = el.to.value || el.from.value;
      if (!name || !from) return shake(f);
      const id = uid();
      commit(d => { d.holidays[id] = { id, name, from: from <= to ? from : to, to: from <= to ? to : from, updatedAt: now() }; });
      toast('Gespeichert');
    }
  };

  const C = {
    startMenu(v, el) { S.startMenu = el.checked; saveUI(); toast(el.checked ? 'Startmenü beim Öffnen: an' : 'Startmenü beim Öffnen: aus'); },
    setClass(v) { S.classId = v; S.cardIdx = 0; S.detailStudent = null; saveUI(); render(); },
    setRange(v) {
      S.ovRange = v;
      if (v === 'custom' && !S.ovFrom) { const [a, b] = rangeFor('hj'); S.ovFrom = a; S.ovTo = b; }
      render();
    },
    setFrom(v) { S.ovFrom = v || null; render(); },
    setTo(v) { S.ovTo = v || null; render(); },
    setWeighting(v) { commit(d => { d.settings = Object.assign({}, d.settings, { weighting: v, updatedAt: now() }); }); },
    setLock(v) { S.device.lockMinutes = +v; persistLocal(); toast('Gespeichert'); },
    className(v) { const c = S.data.classes[S.courseId]; if (!c || !v.trim()) return render(); updateClass(c.id, { name: v.trim() }); },
    classSubject(v) { const c = S.data.classes[S.courseId]; if (c) updateClass(c.id, { subject: v.trim() }); },
    classRoom(v) { const c = S.data.classes[S.courseId]; if (c) updateClass(c.id, { room: v.trim() }); },
    copyStudents(v) {
      if (!v) return;
      const mine = new Map(studentsOf(S.courseId).map(s => [s.name.toLowerCase(), s]));
      const src = studentsOf(v);
      let n = 0;
      commit(d => {
        const used = usedCodes(d), nm = S.device.names || (S.device.names = {});
        for (const s of src) {
          const have = mine.get(s.name.toLowerCase());
          if (have) { if (s.km && !have.km) d.students[have.id] = Object.assign({}, d.students[have.id], { km: s.km, updatedAt: now() }); continue; }
          const id = uid(); nm[id] = s.name;
          d.students[id] = Object.assign({ id, classId: S.courseId, code: newCode(used), updatedAt: now() }, s.km ? { km: s.km } : {});
          n++;
        }
      });
      toast(n ? `${plural(n, 'Kind', 'Kinder')} übernommen` : 'Alle Namen sind schon vorhanden');
      kmRetryPending();
    },
    periodTime(v, el) {
      const i = +el.dataset.i, k = el.dataset.k;
      commit(d => {
        const P = d.settings.periods.map(p => ({ ...p }));
        P[i] = Object.assign({}, P[i], { [k]: v });
        d.settings = Object.assign({}, d.settings, { periods: P, updatedAt: now() });
      });
    },
    importXlsx(v, el) { const file = el.files && el.files[0]; el.value = ''; importPlanning(file); },
    tPast(v, el) { S.tPast = el.checked; render(); },
    importKA(v, el) { const file = el.files && el.files[0]; el.value = ''; importKA(file); },
    importKuerzel(v, el) { const file = el.files && el.files[0]; el.value = ''; importKuerzel(file); },
    importKm(v, el) { const file = el.files && el.files[0]; el.value = ''; kmImportFile(file); },
    setZTerm(v) { S.zTerm = v; render(); },
    toggleWarn(v, el) {
      const key = el.dataset.key;
      commit(d => { d.warnings[key] = el.checked ? { id: key, classId: el.dataset.cid, studentId: el.dataset.sid, warned: true, date: todayISO(), updatedAt: now() } : { id: key, deleted: true, updatedAt: now() }; });
    },
    warnDeadline(v) { C.termDate(v, { dataset: { k: 'warnDeadline' } }); },
    termDate(v, el) {
      const sy = termCfg().sy, k = el.dataset.k;
      commit(d => {
        const terms = Object.assign({}, d.settings.terms || {});
        terms[sy] = Object.assign({}, terms[sy] || {}, { [k]: v || null });
        if (!v) delete terms[sy][k];
        d.settings = Object.assign({}, d.settings, { terms, updatedAt: now() });
      });
    },
    classLevel(v) { if (S.courseId) updateClass(S.courseId, { level: v }); },
    classVocab(v, el) { if (S.courseId) updateClass(S.courseId, { vocab: el.checked }); },
    fehlPick(v, el) {
      const set = new Set(S.fehlPick || []);
      if (el.checked) set.add(el.dataset.key); else set.delete(el.dataset.key);
      S.fehlPick = [...set]; render();
    },
    myName(v) { commit(d => { d.prefs.profil = { id: 'profil', name: v.trim().slice(0, 30), updatedAt: now() }; }); },
    classNoOral(v, el) { if (S.courseId) updateClass(S.courseId, { noOral: el.checked }); },
    classGradeMode(v) { if (S.courseId) updateClass(S.courseId, { gradeMode: v === 'stunde' ? 'stunde' : 'woche' }); },
    classExams(v) { if (S.courseId) updateClass(S.courseId, { examsPerHj: v ? +v : null }); },
    backupImport(v, el) { const file = el.files && el.files[0]; el.value = ''; importBackup(file); }
  };

  const A = {
    back() { goBack(); },
    togglePast() { S.showPast = !S.showPast; render(); },
    scrollTo(d) { document.getElementById(d.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    startNoten() { startNoten(); },
    startTodos() { S.view = 'heute'; S.heuteDate = null; render(); setTimeout(() => document.getElementById('h-todos')?.scrollIntoView({ block: 'start' }), 30); },
    async startExam(d) {
      const e = S.data.events[d.eid]; if (!e) return;
      openCourseTab(e.classId, 'tests');
      editAssessment(null, { cid: e.classId, type: 'schriftlich', title: e.kind || 'Klassenarbeit', date: e.date });
    },
    async startVocab() {
      const cid = await pickCourse('Vokabeltest – welcher Kurs?', classesSorted().filter(c => c.vocab && studentsOf(c.id).length));
      if (!cid) return;
      openCourseTab(cid, 'tests');
      editAssessment(null, { cid, type: 'vokabel' });
    },
    async startZeugnis() {
      const cid = await pickCourse('Zeugnisnoten – welcher Kurs?', classesSorted().filter(c => studentsOf(c.id).length), false);
      if (cid) { S.zTab = 'noten'; S.zTerm = null; openCourseTab(cid, 'zeugnis'); }
    },
    todoToggle(d) { todoToggle(d.id); },
    todoEdit(d) { const x = S.data.todos[d.id]; if (x) todoDialog(x); },
    newTodo(d) { todoDialog(null, { cid: d.cid || '', ...(d.date !== undefined ? { date: d.date } : {}) }); },
    todoFilter(d) { S.todoFilter = d.f || ''; render(); },
    todoFilterGo(d) { S.todoFilter = d.f || ''; S.view = 'todos'; saveUI(); render(); window.scrollTo(0, 0); },
    todoShowDone() { S.todoDone = !S.todoDone; render(); },
    async todoClean() {
      const f = S.todoFilter || '';
      const xs = live(S.data.todos).filter(x => x.done && (!f || (f === '-' ? !x.classId : x.classId === f)));
      if (!xs.length || !await confirmDialog('Erledigte entfernen?', `${plural(xs.length, 'erledigtes To-do wird', 'erledigte To-dos werden')} gelöscht.`, 'Entfernen', true)) return;
      commit(d => { for (const x of xs) d.todos[x.id] = { id: x.id, deleted: true, updatedAt: now() }; });
      toast('Aufgeräumt');
    },
    goto(d) {
      if (d.view === 'kurse' && S.view === 'kurse') S.courseId = null;
      S.view = d.view; S.detailStudent = null; saveUI(); render(); window.scrollTo(0, 0);
    },
    setupMode(d) { S.setupMode = d.m; render(); },
    lock() { lock(); },
    passkeyUnlock() { passkeyUnlock(); },
    passkeyEnroll() { passkeyEnroll(); },
    async passkeyRemove() {
      if (!await confirmDialog(`${Passkey.label()} deaktivieren`, 'Danach entsperrst du wieder mit dem Passwort. Den Passkey selbst kannst du zusätzlich in den Geräte-Einstellungen (Passwörter) löschen.', 'Deaktivieren')) return;
      Passkey.remove(); render(); toast('Deaktiviert');
    },
    sync() {
      if (!ghReady()) return A.goto({ view: 'mehr' });
      if (S.sync.state === 'pwchanged') return askRemotePassword();
      if (S.sync.state === 'error') {
        return openModal({ title: 'Synchronisierung', body: `<p>${esc(S.sync.msg)}</p>`, actions: [{ label: 'Schließen', value: null }, { label: 'Erneut versuchen', cls: 'primary', value: 'retry' }] })
          .then(v => { if (v === 'retry') syncNow({ force: true }); });
      }
      syncNow({ force: true });
    },
    syncNow() { syncNow({ force: true }); },
    dayPrev() { S.heuteDate = addDaysISO(S.heuteDate || todayISO(), -1); render(); },
    dayNext() { S.heuteDate = addDaysISO(S.heuteDate || todayISO(), 1); render(); },
    dayToday() { S.heuteDate = null; render(); },
    dayGo(d) { S.heuteDate = d.date; S.view = 'heute'; render(); window.scrollTo(0, 0); },
    planPrev() { S.planWeek = addDaysISO(S.planWeek, -7); render(); },
    planNext() { S.planWeek = addDaysISO(S.planWeek, 7); render(); },
    planToday() { S.planWeek = toISO(mondayOf(new Date())); render(); },
    lessonSheet(d) { lessonSheet(d.cid, d.date, +d.from); },
    newEvent(d) { editEvent(null, { cid: d.cid, type: d.type, date: d.date }); },
    editEvent(d) { const e = S.data.events[d.eid]; if (e && !e.deleted) editEvent(e); },
    openNoten(d) { openNoten(d.cid, d.date); },
    notenTab(d) { S.notenTab = d.tab; S.detailStudent = null; S.assessId = null; render(); },
    openAssess(d) { S.assessId = d.aid; S.vIdx = 0; S.vHalf = false; S.vMode = 'karte'; render(); window.scrollTo(0, 0); },
    closeAssess() { S.assessId = null; render(); },
    async newAssess(d) { const id = await editAssessment(null, { type: d.type, art: d.art, cid: S.classId }); if (id) { S.assessId = id; S.vIdx = 0; S.vMode = 'karte'; render(); } },
    async assessFromEvent(d) {
      const e = S.data.events[d.eid];
      const n = assessmentsOf(e.classId, 'schriftlich').length + 1;
      const id = await editAssessment(null, { type: e.kind === 'Vokabeltest' ? 'vokabel' : 'schriftlich', cid: e.classId, eventId: e.id, date: e.date, title: `${e.kind || 'Arbeit'} ${n}` });
      if (id) { S.assessId = id; render(); }
    },
    editAssess(d) { editAssessment(S.data.assessments[d.aid]); },
    enableVocab() { updateClass(S.classId, { vocab: true }); toast('Vokabeltests eingeschaltet'); },
    vMode(d) { S.vMode = d.m; render(); },
    vocabGo(d) { S.vMode = 'karte'; S.vIdx = Math.max(0, +d.i || 0); S.vHalf = false; render(); },
    vocabPts(d) { vocabSave(+d.p + (S.vHalf && +d.p < 10 ? 0.5 : 0)); },
    vocabHalf() { S.vHalf = !S.vHalf; render(); },
    vocabAbsent() {
      const a = S.data.assessments[S.assessId]; const s = studentsOf(a.classId)[S.vIdx || 0]; if (!s) return;
      setResult(a, s.id, { points: null, label: 'fehlte', value: null }); S.vIdx++; S.vHalf = false; render();
    },
    vocabClear() {
      const a = S.data.assessments[S.assessId]; const s = studentsOf(a.classId)[S.vIdx || 0]; if (!s) return;
      commit(dd => { dd.results[a.id + '|' + s.id] = { id: a.id + '|' + s.id, deleted: true, updatedAt: now() }; });
    },
    pickGrade(d) { pickGrade(S.data.assessments[d.aid], S.data.students[d.sid]); },
    zTab(d) { S.zTab = d.tab; render(); },
    zOverride(d) { const c = ensureClass(); overrideDialog(c, S.data.students[d.sid], termsFor(levelOf(c)).find(x => x.key === S.zTerm)); },
    printConference() { printConference(); },
    exportZeugnis() { exportZeugnis(); },
    printWarned() { printWarned(); },
    printSheet(d) { printSheet(d.sid); },
    chartRange(d) { S.chartRange = d.r; render(); },
    async deleteObs(d) {
      const o = S.data.obs[d.oid];
      commit(dd => { dd.obs[d.oid] = { id: d.oid, deleted: true, updatedAt: now() }; });
      toast('Beobachtung gelöscht', { undo: () => commit(dd => { dd.obs[d.oid] = Object.assign({}, o, { updatedAt: now() }); }) });
    },
    snooze(d) {
      const t = new Date(); const until = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1, 7, 0).getTime();
      commit(dd => { const r = dd.reminders[d.ws] || {}; dd.reminders[d.ws] = { id: d.ws, snoozeUntil: until, snoozeCount: (r.snoozeCount || 0) + 1, updatedAt: now() }; });
      toast('Ich erinnere dich morgen wieder.');
    },
    remindDone(d) { commit(dd => { dd.reminders[d.ws] = { id: d.ws, done: true, updatedAt: now() }; }); },
    openWarn() {
      const c = classesSorted().find(cc => warnInfo(cc).some(w => w.drift && !w.warned && (w.was4 || !w.was56))) || classesSorted().find(cc => warnInfo(cc).some(w => w.was4)) || classesSorted()[0];
      S.view = 'kurse'; S.courseId = c?.id || null; S.classId = S.courseId; S.courseTab = 'zeugnis'; S.zTab = 'warn'; S.assessId = null; S.detailStudent = null; render(); window.scrollTo(0, 0);
    },
    weekMode(d) { S.weekMode = d.m; render(); },
    tFilter(d) { S.tFilter = d.f; render(); },
    jRange(d) { S.jRange = d.r; render(); },
    jCourse(d) { S.jCourse = d.cid; render(); },
    openNotenWeek(d) { openNoten(d.cid, d.ws); },
    async fehlSkip() {
      const keys = (S.fehlPick || []).map(k => k.split('|')).filter(([cid]) => S.data.classes[cid]);
      if (!keys.length) return;
      const cids = [...new Set(keys.map(k => k[0]))];
      const list = keys.map(([cid, ws]) => `<li>${esc(clsLabel(S.data.classes[cid]))} · KW ${isoWeek(parseISO(ws))}</li>`).join('');
      const v = await openModal({
        title: 'Keine mündlichen Noten eintragen',
        body: `<p>Für diese Kurswochen werden keine mündlichen Noten eingetragen. Sie verschwinden aus den fehlenden Noten und aus den Erinnerungen:</p><ul class="fehl-list">${list}</ul>
          <label class="check"><input type="checkbox" id="m-ganz"><span>Für ${cids.length === 1 ? 'diesen Kurs' : 'diese Kurse'} <strong>überhaupt keine</strong> mündlichen Noten mehr eintragen</span></label>`,
        actions: [{ label: 'Abbrechen', value: null }, { label: 'Bestätigen', cls: 'primary', run: root => ({ ganz: root.querySelector('#m-ganz').checked }) }]
      });
      if (!v) return;
      commit(d => {
        for (const cid of cids) {
          const c = d.classes[cid];
          const weeks = keys.filter(k => k[0] === cid).map(k => k[1]);
          d.classes[cid] = Object.assign({}, c, { skipWeeks: [...new Set([...(c.skipWeeks || []), ...weeks])].sort() }, v.ganz ? { noOral: true } : {}, { updatedAt: now() });
        }
      });
      S.fehlPick = [];
      render();
      toast(v.ganz ? 'Diese Kurse: keine mündlichen Noten mehr' : 'Ausgenommen – keine Erinnerung mehr für diese Wochen');
    },
    async notHeld() {
      const c = S.data.classes[S.classId];
      if (!c) return;
      const dates = weeklyMode(c) ? [...new Set(lessonsBetween(c.id, S.weekStart, addDaysISO(S.weekStart, 4)).filter(l => !l.cancelled && !l.away).map(l => l.date))] : [currentDay()].filter(x => lessonsOn(x, c.id).some(l => !l.cancelled));
      if (!dates.length) return toast('In diesem Zeitraum steht kein Unterricht an.');
      if (!await confirmDialog('Nicht stattgefunden', `${esc(clsLabel(c))}: ${dates.map(x => `${WD[wdOf(x)]} ${fmtISO(x)}`).join(', ')} als ausgefallen eintragen? Dann fehlen für diese Stunden keine Noten.`, 'Eintragen')) return;
      const ids = dates.map(x => 'nh-' + c.id + '-' + x);
      commit(dd => { dates.forEach((x, i) => { dd.events[ids[i]] = { id: ids[i], type: 'ausfall', kind: null, classId: c.id, date: x, note: 'Kurs hat nicht stattgefunden', updatedAt: now() }; }); });
      toast('Als ausgefallen eingetragen', { undo: () => commit(dd => { for (const id of ids) dd.events[id] = { id, deleted: true, updatedAt: now() }; }) });
    },
    monthStep(d) { S[d.k] = (S[d.k] || 0) + (+d.d); render(); },
    dayInfo(d) { dayInfo(d.date); },
    weekPrev() { S.weekStart = S.classId ? lessonWeek(S.classId, S.weekStart, -1) : addDaysISO(S.weekStart, -7); S.day = null; S.cardIdx = 0; render(); },
    weekNext() { S.weekStart = S.classId ? lessonWeek(S.classId, S.weekStart, 1) : addDaysISO(S.weekStart, 7); S.day = null; S.cardIdx = 0; render(); },
    weekGo(d) { S.weekStart = d.ws; S.day = null; S.cardIdx = 0; render(); },
    weekToday() { S.weekStart = toISO(mondayOf(new Date())); S.day = null; S.cardIdx = 0; render(); },
    setDay(d) { S.day = d.day; render(); },
    setMode(d) { S.mode = d.mode; S.cardIdx = 0; saveUI(); render(); },
    toggleMissing() { S.onlyMissing = !S.onlyMissing; S.cardIdx = 0; render(); },
    addGrade(d) { quickAdd(d.sid, 'note', +d.g); },
    more(d) { editEntry(null, d.sid); },
    editEntry(d) { const e = S.data.entries[d.eid]; if (e && !e.deleted) editEntry(e); },
    cardGrade(d) { cardAdd('note', +d.g); },
    cardAbsent() { cardAdd('fehlte'); },
    cardNb() { cardAdd('nb'); },
    async cardNote() {
      const s = cardList()[S.cardIdx];
      if (!s) return;
      const r = await editEntry(null, s.id);
      if (r === 'saved' && !S.onlyMissing) { S.cardIdx++; render(); }
    },
    cardPrev() { if (S.cardIdx > 0) { S.cardIdx--; render(); } },
    cardNext() { if (S.cardIdx < cardList().length) { S.cardIdx++; render(); } },
    cardRestart() { S.cardIdx = 0; render(); },
    ovTab(d) { S.ovTab = d.tab; render(); },
    ovSort(d) { S.ovSort = d.k; render(); },
    studentDetail(d) { S.detailFrom = S.notenTab === 'uebersicht' ? null : S.notenTab; S.notenTab = 'uebersicht'; S.detailStudent = d.sid; render(); window.scrollTo(0, 0); },
    closeDetail() { S.detailStudent = null; if (S.detailFrom) { S.notenTab = S.detailFrom; S.detailFrom = null; } render(); },
    addEntryFor(d) { editEntry(null, d.sid, { date: todayISO() }); },
    newClass() { newClassDialog(); },
    openCourse(d) { S.view = 'kurse'; S.courseId = d.cid || null; if (d.cid) S.classId = d.cid; S.courseTab = d.tab || (S.courseTab && S.courseTab !== 'bearbeiten' ? S.courseTab : 'ueberblick'); S.detailStudent = null; S.assessId = null; saveUI(); render(); },
    closeCourse() { S.courseId = null; render(); },
    courseTab(d) { S.courseTab = d.tab; S.detailStudent = null; S.assessId = null; render(); },
    setColor(d) { updateClass(S.courseId, { color: d.color }); },
    deleteSlot(d) {
      const c = S.data.classes[S.courseId];
      updateClass(c.id, { slots: (c.slots || []).filter(s => !(s.wd === +d.wd && s.from === +d.from && (s.validFrom || '') === (d.vf || ''))) });
    },
    deleteHoliday(d) {
      const h = S.data.holidays[d.hid];
      commit(dd => { dd.holidays[d.hid] = { id: d.hid, deleted: true, updatedAt: now() }; });
      toast(`${h.name} gelöscht`, { undo: () => commit(dd => { dd.holidays[d.hid] = Object.assign({}, h, { updatedAt: now() }); }) });
    },
    addPeriod() {
      commit(d => {
        const P = d.settings.periods.map(p => ({ ...p }));
        const last = P[P.length - 1];
        const s = last?.end ? timeToMin(last.end) : 8 * 60;
        P.push({ start: minToTime(s), end: minToTime(s + 45) });
        d.settings = Object.assign({}, d.settings, { periods: P, updatedAt: now() });
      });
    },
    removePeriod() {
      commit(d => { d.settings = Object.assign({}, d.settings, { periods: d.settings.periods.slice(0, -1), updatedAt: now() }); });
    },
    async renameStudent(d) {
      const s = S.data.students[d.sid];
      const name = await openModal({
        title: 'Namen ändern', autofocus: true,
        body: `<label class="field"><span>Name</span><input id="m-name" maxlength="80" value="${esc(s.name)}"></label>`,
        actions: [{ label: 'Abbrechen', value: null }, { label: 'Speichern', cls: 'primary', run: root => root.querySelector('#m-name').value.trim() || false }]
      });
      if (name) { (S.device.names || (S.device.names = {}))[s.id] = name; commit(dd => { dd.students[s.id] = Object.assign({}, dd.students[s.id], { updatedAt: now() }); }); }
    },
    async deleteStudent(d) {
      const s = S.data.students[d.sid];
      const n = liveEntries().filter(e => e.studentId === s.id).length;
      if (await confirmDialog('Kind entfernen', `<strong>${esc(s.name)}</strong> und ${plural(n, 'Eintrag', 'Einträge')} endgültig löschen?`, 'Löschen', true)) {
        commit(dd => tombstoneStudent(dd, s.id));
        toast(`${s.name} entfernt`);
      }
    },
    async deleteClass(d) {
      const c = S.data.classes[d.cid];
      const sts = studentsOf(c.id);
      const n = liveEntries().filter(e => e.classId === c.id).length;
      if (!await confirmDialog('Kurs löschen', `Kurs <strong>${esc(clsLabel(c))}</strong> mit ${plural(sts.length, 'Kind', 'Kindern')} und ${plural(n, 'Noteneintrag', 'Noteneinträgen')} endgültig löschen?`, 'Endgültig löschen', true)) return;
      S.courseId = null;
      commit(dd => {
        for (const s of sts) tombstoneStudent(dd, s.id);
        for (const e of Object.values(dd.events)) if (!e.deleted && e.classId === c.id) dd.events[e.id] = { id: e.id, deleted: true, updatedAt: now() };
        dd.classes[c.id] = { id: c.id, deleted: true, updatedAt: now() };
      });
      toast(`Kurs ${clsLabel(c)} gelöscht`);
    },
    exportOverview() { exportOverview(); },
    exportEntries() { exportEntries(); },
    makeSetupCode() { makeSetupCode(); },
    kmCode() { kmShowCode().catch(e => toast(e.message, { error: true })); },
    kmPaste() { kmPasteDialog(); },
    pushOn() { pushEnable(); },
    kmAsk(d) { kmAskDialog(d.eid); },
    calHide(d) {
      const list = S.data.prefs?.calhide?.titles || CAL_HIDE_DEFAULT;
      if (!d.t) return;
      commit(dd => { dd.prefs.calhide = { id: 'calhide', titles: [...new Set([...list, d.t])], updatedAt: now() }; });
      toast(`„${d.t}“ wird nicht mehr angezeigt`, { undo: () => commit(dd => { dd.prefs.calhide = { id: 'calhide', titles: list, updatedAt: now() }; }) });
    },
    pushOff() { pushDisable(); },
    pushTest() { pushTest(); },
    async kmFetch() {
      try { await kmInbox({ force: true }); toast(kmPendingList().length ? 'Abgeholt – bitte unter Kurs → Arbeiten/Klausuren zuordnen' : 'Abgeholt'); }
      catch (e) { toast(e.message, { error: true }); }
    },
    kmAssign(d) {
      const p = (S.device.kmPending || {})[d.key], c = S.data.classes[d.cid];
      if (!p || !c) return;
      delete S.device.kmPending[d.key];
      kmReport(kmApply(p, c), p);
      persistLocal(); render();
    },
    async kmDismiss(d) {
      if (!await confirmDialog('Verwerfen', 'Diese Noten nicht übernehmen? Eine neue Auswertung im Klausurmanager schickt sie erneut.', 'Verwerfen')) return;
      delete (S.device.kmPending || {})[d.key];
      persistLocal(); render();
    },
    makeNameList() { makeNameList(); },
    importNameList() { importNameList(); },
    changePassword() { changePassword(); },
    backupDownload() { backupDownload(); },
    async removeGh() {
      if (!await confirmDialog('Verbindung trennen', 'Dieses Gerät synchronisiert dann nicht mehr. Die Daten in GitHub bleiben erhalten. Tipp: Das Token auf github.com widerrufen, wenn du es nicht mehr brauchst.', 'Trennen')) return;
      S.device.gh = null; S.sync.state = 'idle'; S.sync.repoOk = false;
      await persistLocal(); render();
    },
    async resetDevice() {
      const extra = ghReady() ? ' Die verschlüsselten Daten in GitHub bleiben erhalten.' : ' <strong>Achtung: Es gibt keine GitHub-Kopie – die Daten sind danach weg.</strong>';
      if (!await confirmDialog('Daten von diesem Gerät entfernen', 'Alle Notenheft-Daten werden von diesem Gerät gelöscht.' + extra, 'Entfernen', true)) return;
      if (ghReady()) { try { await syncNow({ force: true }); } catch { /* egal */ } }
      try { localStorage.removeItem(LS_VAULT); localStorage.removeItem(LS_UI); } catch { /* egal */ }
      Passkey.remove();
      S.data = null; S.device = null; Vault.clear(); S.setupMode = 'connect';
      render();
    },
    async forgot() {
      const r = await openModal({
        title: 'Passwort vergessen',
        body: `<p>Das Passwort lässt sich nicht wiederherstellen – genau das schützt die Daten. Es gibt keinen Generalschlüssel.</p>
          <p>Falls du das Passwort im iCloud- oder Browser-Schlüsselbund gespeichert hast, schau dort nach. Andernfalls kannst du dieses Gerät zurücksetzen und neu beginnen.</p>`,
        actions: [{ label: 'Schließen', value: null }, { label: 'Gerät zurücksetzen', cls: 'danger-fill', value: 'reset' }]
      });
      if (r !== 'reset') return;
      if (!await confirmDialog('Wirklich zurücksetzen?', 'Alle Notenheft-Daten auf diesem Gerät werden gelöscht.', 'Zurücksetzen', true)) return;
      try { localStorage.removeItem(LS_VAULT); } catch { /* egal */ }
      Passkey.remove();
      render();
    }
  };

  /* =====================================================================
     Ereignisse
     ===================================================================== */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled || !$('#app').contains(el)) return;
    const fn = A[el.dataset.action];
    if (fn) { e.preventDefault(); fn(el.dataset, el, e); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches('tr[data-action]')) { e.target.click(); return; }
    if (!S.data || $('#modal-root').children.length) return;
    if (e.target.matches('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (S.view === 'kurse' && S.courseTab === 'muendlich' && S.mode === 'karte') {
      if (/^[1-6]$/.test(e.key)) { e.preventDefault(); cardAdd('note', +e.key); }
      else if (e.key === 'f' || e.key === 'F') cardAdd('fehlte');
      else if (e.key === 'n' || e.key === 'N') cardAdd('nb');
      else if (e.key === 'ArrowRight') A.cardNext();
      else if (e.key === 'ArrowLeft') A.cardPrev();
    } else if (S.view === 'heute') {
      if (e.key === 'ArrowRight') A.dayNext(); else if (e.key === 'ArrowLeft') A.dayPrev();
    } else if (S.view === 'woche') {
      if (e.key === 'ArrowRight') A.planNext(); else if (e.key === 'ArrowLeft') A.planPrev();
    }
  });
  // Wischen vom linken Bildschirmrand nach rechts = zurück (wie in iOS-Apps).
  // Im Safari-Browser übernimmt das iOS selbst (über den Verlauf) – dort nur als App vom Home-Bildschirm aktiv.
  const SWIPE_BACK = () => !isIOS() || isStandalone();
  let swipe = null;
  document.addEventListener('touchstart', e => {
    if (!S.data || !Nav.stack.length || !SWIPE_BACK() || $('#modal-root').children.length || e.touches.length !== 1) return;
    const t = e.touches[0];
    if (t.clientX > 28) return;
    swipe = { x: t.clientX, y: t.clientY, dx: 0, t: Date.now(), on: false, main: $('main.main') };
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!swipe) return;
    const t = e.touches[0], dx = t.clientX - swipe.x, dy = t.clientY - swipe.y;
    if (!swipe.on) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { swipe = null; return; }
      if (dx < 10) return;
      swipe.on = true;
      document.body.classList.add('swiping');
    }
    swipe.dx = Math.max(0, dx);
    if (swipe.main) swipe.main.style.transform = `translateX(${swipe.dx}px)`;
  }, { passive: true });
  const endSwipe = () => {
    if (!swipe) return;
    const sw = swipe; swipe = null;
    if (!sw.on) return;
    const fast = sw.dx > 40 && sw.dx / Math.max(1, Date.now() - sw.t) > 0.5;
    const go = sw.dx > Math.min(120, innerWidth * 0.3) || fast;
    const m = sw.main;
    if (m) { m.style.transition = 'transform .18s ease-out'; m.style.transform = go ? `translateX(${innerWidth}px)` : 'translateX(0)'; }
    setTimeout(() => {
      document.body.classList.remove('swiping');
      if (go) goBack();
      if (m && m.isConnected) { m.style.transition = ''; m.style.transform = ''; }
    }, 180);
  };
  document.addEventListener('touchend', endSwipe, { passive: true });
  document.addEventListener('touchcancel', endSwipe, { passive: true });

  document.addEventListener('change', e => {
    const el = e.target.closest('[data-change]');
    if (!el || !$('#app').contains(el)) return;
    C[el.dataset.change]?.(el.value, el, e);
  });
  document.addEventListener('submit', e => {
    const f = e.target.closest('form[data-submit]');
    if (!f) return;
    e.preventDefault();
    F[f.dataset.submit]?.(f, e);
  });

  const lockMs = () => (S.device?.lockMinutes || 10) * 60000;
  ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(ev => document.addEventListener(ev, () => { S.lastActivity = now(); }, { passive: true }));
  let lastMinute = new Date().getMinutes();
  setInterval(() => {
    if (!S.data) return;
    if (now() - S.lastActivity > lockMs()) { lock(); return; }
    if (!document.hidden && ghReady() && !S.sync.running && !S.sync.timer
      && ['ok', 'idle', 'offline'].includes(S.sync.state) && now() - S.sync.last > 90000) syncNow();
    const m = new Date().getMinutes();
    if (m !== lastMinute) { lastMinute = m; if (['heute', 'woche'].includes(S.view) && !$('#modal-root').children.length) softRender(); }
  }, 15000);
  document.addEventListener('visibilitychange', () => {
    if (!S.data) return;
    if (document.hidden) {
      S.hiddenAt = now();
      if (S.sync.timer) syncNow();
    } else {
      if (S.hiddenAt && now() - S.hiddenAt > lockMs()) { lock(); return; }
      S.lastActivity = now();
      if (ghReady() && now() - S.sync.last > 20000) syncNow();
      softRender();
    }
  });
  window.addEventListener('online', () => { if (S.data) syncNow(); });

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w?.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) toast('Neue Version verfügbar – App einmal schließen und neu öffnen.', { ms: 6000 });
        });
      });
    }).catch(() => { /* egal */ });
  }

  if (!window.crypto?.subtle) {
    $('#app').innerHTML = '<div class="auth"><div class="auth-card"><h1>Notenheft</h1><p>Dieser Browser unterstützt die nötige Verschlüsselung nicht. Bitte die App über <strong>https://</strong> öffnen.</p></div></div>';
    return;
  }
  loadUI();
  render();

  if (location.hash === '#test') window.__nh = { S, Vault, mergeData, canon, syncNow, lock, lessonsOn, courseStats, examInfo, buildImport, readXlsx, Passkey, calc, termsFor, termCfg, vocabLabel, gridLabel, gridValue, toPoints, warnInfo, render, liveEntries, dedupeEntries,
    emptyData, defaultDevice, commit, addStudentsTo, hydrateNames, kmEnsureKey, kmDecrypt, kmCheck, kmProcess, kmApply, kmFindClass, kmInbox, kmPendingList, kmRetryPending, kmShowCode, importKuerzel, C, A, examsRequired, examsLeft, missingOverview, heuteCounts, todoReminders, kmMissingResults, pcExport, kmEncryptFor, kmImportText, planExport, weeklyGradeTodo, nsTodoSync, weekHasLessons, lessonWeek, rangeFor, rangeOptions, nameKey, kmCalCheck, kmCalApply, calItemsOn, calDone, pushStatus, pushStatusWrite, GH };
})();
