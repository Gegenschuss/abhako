/* Abhako — self-hosted task manager inspired by TickTick. Vanilla JS, no build step.
   State lives on the server (SQLite); the client keeps a copy, renders views
   from it and polls /api/version to pick up changes from other devices. */
'use strict';
const APP_NAME = 'Abhako';

// ------------------------------------------------------------------ icons
const P = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  sunrise: '<path d="M12 2v8M4.93 10.93l1.41 1.41M2 18h2M20 18h2M19.07 10.93l-1.41 1.41M22 22H2M8 6l4-4 4 4M16 18a4 4 0 0 0-8 0"/>',
  week: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  all: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  done: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  list: '<path d="M3 12h18M3 6h18M3 18h12"/>',
  tag: '<path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><path d="M7 7h.01"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  habit: '<path d="M12 22c5.5 0 9-3.5 9-8 0-5-4-8-9-12C7 6 3 9 3 14c0 4.5 3.5 8 9 8z"/><path d="m9 13 2 2 4-4"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  chev: '<path d="m6 9 6 6 6-6"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  repeat: '<path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  dots: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  sub: '<path d="M9 6h11M9 12h11M9 18h11M4 6v12"/>',
  kanban: '<rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="4" height="8" rx="1"/>',
  play: '<path d="M6 4l14 8-14 8z"/>',
  pause: '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>',
  stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  sort: '<path d="M11 5h10M11 9h7M11 13h4M3 17l3 3 3-3M6 18V4"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
  select: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/>',
  timeline: '<path d="M3 6h9M7 12h11M5 18h8"/>',
  filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54z"/>',
  indent: '<path d="m3 8 4 4-4 4M21 12H11M21 6H11M21 18H11"/>',
  outdent: '<path d="m7 8-4 4 4 4M21 12H11M21 6H11M21 18H11"/>',
  alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
  skip: '<path d="m5 4 10 8-10 8z"/><path d="M19 5v14"/>',
  stopwatch: '<circle cx="12" cy="14" r="8"/><path d="M12 10v4M10 2h4M18.5 6.5 20 5"/>',
  archive: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
  clip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  pdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 15h1.5a1.5 1.5 0 0 0 0-3H8v5M13 12v5h1a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2z"/>',
};
const ic = (n, c = '') => `<svg class="i ${c}" viewBox="0 0 24 24">${P[n] || ''}</svg>`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const isMobile = () => matchMedia('(max-width:899px)').matches;
const LS = {
  get(k, d) { try { const v = localStorage.getItem('tasks.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('tasks.' + k, JSON.stringify(v)); } catch { /* private mode */ } },
};
// design per device: auto (follows the OS) | dark | light
function applyTheme() {
  const pref = LS.get('theme', 'auto');
  document.documentElement.dataset.theme = pref;
  const light = pref === 'light' || (pref === 'auto' && matchMedia('(prefers-color-scheme: light)').matches);
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = light ? '#ffffff' : '#161a21';
}
applyTheme();
try { matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyTheme); } catch { /* old browser */ }

// ------------------------------------------------------------------ dates
const pad = n => String(n).padStart(2, '0');
const ds = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return ds(d); };
const today = () => ds(new Date());
// weekday / month names + date patterns come from the language file (i18n.js: WD, WDL, MON, MONS, fmtDay), weeks still start on Monday
const WD_MO = () => [1, 2, 3, 4, 5, 6, 0].map(i => WD[i]);  // calendar header, Monday first
const fmtDate = s => pd(s).toLocaleDateString(LOCALE());
const RR_WD = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
function dayLabel(s, long) {
  const t = today();
  if (s === t) return tr('Today');
  if (s === addDays(t, 1)) return tr('Tomorrow');
  if (s === addDays(t, -1)) return tr('Yesterday');
  const d = pd(s), diff = (d - pd(t)) / 864e5;
  if (diff > 1 && diff < 7) return long ? WDL[d.getDay()] : fmtDay('near', d);
  return fmtDay(d.getFullYear() !== new Date().getFullYear() ? 'year' : 'short', d);
}
const dueClass = t => !t.due || t.status ? '' : t.due < today() ? 'over' : t.due === today() ? 'today' : '';
function mondayOf(s) { const d = pd(s); const k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return ds(d); }

// ------------------------------------------------------------------ state
const S = {
  lists: [], sections: [], tasks: new Map(), habits: [], pomo: null, pomoToday: {count: 0, minutes: 0},
  settings: {}, counts: {}, v: 0, ntfyUrl: 'https://ntfy.sh',
  route: {mod: 'tasks', key: 'today'}, sel: null, extra: null,
  collapsed: new Set(LS.get('collapsed', [])),
  calMonth: null, calSel: today(), quick: {ignore: new Set()},
  filters: [], multi: new Set(), multiMode: false, occ: {key: '', items: []},
  calMode: LS.get('calMode', 'month'), tlStart: null, quickPreset: {}, editContent: false,
};
const FEATS = [['cal', N_('Calendar')], ['timeline', N_('Timeline')], ['matrix', N_('Eisenhower matrix')], ['habits', N_('Habits')], ['pomo', N_('Focus (Pomodoro)')], ['kanban', N_('Kanban')], ['paperless', N_('Paperless link')]];
const feat = f => (S.settings.features ?? FEATS.map(x => x[0]).join(',')).split(',').includes(f);
const inbox = () => S.lists.find(l => l.is_inbox);
const listById = id => S.lists.find(l => l.id === id);
const children = id => [...S.tasks.values()].filter(t => t.parent_id === id).sort(bySort);
const bySort = (a, b) => a.sort - b.sort || a.id - b.id;
function openTasks() { return [...S.tasks.values()].filter(t => t.status === 0); }

// ------------------------------------------------------------------ api + offline outbox
// Single user, so "sync" is simple: while offline, task/habit writes are applied
// locally and queued (localStorage outbox); on reconnect they are replayed in order
// (last write wins). Tasks created offline get a negative temp id that is mapped to
// the real id during replay. The last server state is cached for offline start.
class Offline extends Error {}
const OUT = {q: LS.get('outbox', []), online: true, flushing: false};
function setOnline(b) { if (OUT.online !== b) { OUT.online = b; renderTop(); if (b) flush(); } }
async function rawFetch(method, url, body) {
  const opt = {method, headers: {}, redirect: 'manual'};
  if (body instanceof FormData) opt.body = body;
  else if (body !== undefined) { opt.body = JSON.stringify(body); opt.headers['Content-Type'] = 'application/json'; }
  let r;
  try { r = await fetch(url, opt); } catch { setOnline(false); throw new Offline('offline'); }
  setOnline(true);
  if (r.type === 'opaqueredirect' || r.status === 401 || (r.headers.get('content-type') || '').includes('text/html')) {
    location.reload();  // login session expired -> login page
    throw new Error('auth');
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || tr('Error {0}', r.status)); e.status = r.status; throw e; }
  return j;
}
const queueable = (method, url) => method !== 'GET' && /^\/api\/(tasks|habits\/\d+\/log)/.test(url);
async function api(method, url, body) {
  if (queueable(method, url) && !(body instanceof FormData) && OUT.q.length) return enqueue(method, url, body);
  try { return await rawFetch(method, url, body); }
  catch (e) {
    if (e instanceof Offline) {
      if (queueable(method, url) && !(body instanceof FormData)) return enqueue(method, url, body);
      if (method !== 'GET') toast(tr('Offline: only works again with a connection'));
    } else if (e.message !== 'auth') toast(e.message);
    throw e;
  }
}
function enqueue(method, url, body) {
  // remember what this device saw before the edit, so the server can detect edits made elsewhere
  const pm = method === 'PATCH' && url.match(/^\/api\/tasks\/(-?\d+)$/);
  if (pm && body && !body._prev && +pm[1] > 0) {
    const t = S.tasks.get(+pm[1]);
    if (t) body = {...body, _prev: Object.fromEntries(Object.keys(body).filter(k => !k.startsWith('_')).map(k => [k, k === 'tags' ? [...(t.tags || [])] : (t[k] ?? null)]))};
  }
  const e = {method, url, body};
  if (method === 'POST' && url === '/api/tasks') e.tmp = -Date.now() - Math.floor(Math.random() * 1000);
  OUT.q.push(e); LS.set('outbox', OUT.q);
  renderTop();
  if (OUT.online) setTimeout(flush, 50);
  return applyLocal(e);
}
function applyLocal(e) {
  const {method, url, body = {}} = e;
  const m = url.match(/^\/api\/tasks\/(-?\d+)(?:\/(\w+))?/);
  const nowIso = new Date().toISOString();
  if (method === 'POST' && url === '/api/tasks') {
    const par = body.parent_id && S.tasks.get(body.parent_id);
    const t = {id: e.tmp, list_id: body.list_id || (par ? par.list_id : inbox().id), section_id: body.section_id ?? null, parent_id: body.parent_id ?? null,
      title: body.title, content: body.content || '', priority: body.priority || 0, status: 0, due: body.due || null, due_time: body.due_time || null,
      reminders: body.reminders || '', repeat: body.repeat || '', repeat_from: body.repeat_from || 'due',
      sort: par ? 1e9 : Math.min(0, ...[...S.tasks.values()].map(x => x.sort)) - 1,
      created_at: nowIso, updated_at: nowIso, completed_at: null, deleted_at: null, tags: body.tags || []};
    S.tasks.set(t.id, t); return t;
  }
  if (url === '/api/tasks/batch') {
    for (const tid of body.ids || []) {
      const t = S.tasks.get(tid); if (!t) continue;
      if (body.action === 'patch') { const {add_tags, ...d} = body.data || {}; Object.assign(t, d); if (add_tags) t.tags = [...new Set([...t.tags, ...add_tags])]; }
      if (body.action === 'complete') { t.status = 2; t.completed_at = nowIso; }
      if (body.action === 'delete') S.tasks.delete(tid);
    }
    return {ok: true};
  }
  if (url === '/api/tasks/reorder') { for (const it of body.items || []) { const t = S.tasks.get(it.id); if (t) Object.assign(t, it); } return {ok: true}; }
  if (m) {
    const t = S.tasks.get(+m[1]);
    if (method === 'DELETE') { S.tasks.delete(+m[1]); return {ok: true}; }
    if (!t) return {ok: true};
    if (method === 'PATCH') { const {_prev, ...b} = body; Object.assign(t, b); if ('due' in b && !b.due) t.due_time = null; }
    if (m[2] === 'complete') { t.status = body.status ?? 2; t.completed_at = nowIso; }
    if (m[2] === 'reopen') { t.status = 0; t.completed_at = null; }
    return {...t, next_due: null};
  }
  return {ok: true};  // habit log: caller already updated S.habits
}
async function flush() {
  if (OUT.flushing || !OUT.q.length) return;
  OUT.flushing = true;
  const fix = v => (typeof v === 'number' && v < 0 && idmap[v]) ? idmap[v] : v;
  const idmap = LS.get('idmap', {});
  let dropped = 0, skipped = 0;
  try {
    while (OUT.q.length) {
      const e = OUT.q[0];
      const url = e.url.replace(/\/(-\d+)(?=\/|$)/, (_, n) => '/' + (idmap[n] || n));
      let body = e.body;
      if (body && body.parent_id) body = {...body, parent_id: fix(body.parent_id)};
      if (body && body.items) body = {...body, items: body.items.map(it => ({...it, id: fix(it.id)}))};
      if (body && body.ids) body = {...body, ids: body.ids.map(fix)};
      try {
        const j = await rawFetch(e.method, url, body);
        if (e.tmp) { idmap[e.tmp] = j.id; LS.set('idmap', idmap); if (S.sel === e.tmp) S.sel = j.id; }
        if (j && j.conflicts?.length) addConflicts(j.id, j.conflicts, j.title);
        if (j && j.skipped) skipped++;
      } catch (err) {
        if (err instanceof Offline || err.message === 'auth') return;
        console.warn('outbox: dropped', e, err);  // e.g. 404: deleted on another device
        dropped++;
      }
      OUT.q.shift(); LS.set('outbox', OUT.q);
    }
    LS.set('idmap', {});
  } finally {
    OUT.flushing = false;
    renderTop();
    if (dropped) setTimeout(() => toast(trn('{0} offline change not applied (task deleted or invalid)', '{0} offline changes not applied (task deleted or invalid)', dropped)), 400);
    else if (skipped) setTimeout(() => toast(tr('Recurring task was already checked off, not advanced twice')), 400);
  }
  await load(); render();
}
window.addEventListener('online', () => flush());

// ------------------------------------------------------------------ conflicts (edited here and elsewhere)
S.conflicts = LS.get('conflicts', []);
const FIELD_NAMES = {title: N_('Title'), content: N_('Description'), due: N_('Date'), due_time: N_('Time'), priority: N_('Priority'), list_id: N_('List'), tags: N_('Tags'), reminders: N_('Reminder'), repeat: N_('Repeat'), repeat_from: N_('Repeat from'), start: N_('Start|date'), section_id: N_('Section'), parent_id: N_('Parent task'), pinned: N_('Pinned'), duration: N_('Duration')};
function addConflicts(tid, list, title) {
  for (const c of list) {
    S.conflicts = S.conflicts.filter(x => !(x.tid === tid && x.field === c.field));
    S.conflicts.push({tid, title: title || S.tasks.get(tid)?.title || '', field: c.field, server: c.server, mine: c.mine, at: Date.now()});
  }
  LS.set('conflicts', S.conflicts);
  renderTop();
  setTimeout(() => toast(list.length === 1 ? tr('A field was changed elsewhere in the meantime, please review') : tr('{0} fields were changed elsewhere in the meantime, please review', list.length)), 300);
}
function fmtVal(field, v) {
  if (v == null || v === '' || (Array.isArray(v) && !v.length)) return tr('(empty)');
  if (field === 'priority') return tr([N_('None'), N_('Low'), '', N_('Medium'), '', N_('High')][+v] || '') || String(v);
  if (field === 'list_id') return lname(listById(+v)) || String(v);
  if (field === 'due' || field === 'start') return fmtDate(v);
  if (field === 'tags') return v.map(g => '#' + g).join(' ');
  if (field === 'repeat') return repeatLabel(v);
  if (field === 'pinned') return +v ? tr('yes') : tr('no');
  if (field === 'parent_id') return S.tasks.get(+v)?.title || String(v);
  return String(v);
}
function conflictModal() {
  const md = modal(`<h3>${tr('Conflicts')}</h3>
    <div class="muted" style="font-size:13px;margin-bottom:10px">${tr('These fields were changed on another device while you entered something else here (offline). The other version is saved.')}</div>
    <div id="cf-list"></div>
    <div class="foot"><button class="btn" data-m="all-server">${tr('All: keep the other version')}</button><span class="spacer"></span><button class="btn" data-m="close">${tr('Close')}</button></div>`);
  const draw = () => {
    $('#cf-list', md).innerHTML = S.conflicts.map((c, i) => `<div class="cfitem"><div class="cfh"><b>${esc(c.title)}</b><span class="muted">${esc(FIELD_NAMES[c.field] ? tr(FIELD_NAMES[c.field]) : c.field)}</span></div>
      <div class="cfv"><div><span>${tr('saved')}</span>${esc(fmtVal(c.field, c.server))}</div><div><span>${tr('your version')}</span>${esc(fmtVal(c.field, c.mine))}</div></div>
      <div class="cfb"><button class="btn sm" data-cf="server" data-i="${i}">${tr('Keep saved')}</button><button class="btn sm pri" data-cf="mine" data-i="${i}">${tr('Use mine')}</button></div></div>`).join('') || `<div class="muted" style="padding:10px 0">${tr('No open conflicts.')}</div>`;
  };
  draw();
  md.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.m === 'close') { md.remove(); return; }
    if (b.dataset.m === 'all-server') { S.conflicts = []; }
    if (b.dataset.cf) {
      const c = S.conflicts[+b.dataset.i];
      if (b.dataset.cf === 'mine') {
        try { const t = await api('PATCH', '/api/tasks/' + c.tid, {[c.field]: c.mine}); putTask(t); } catch { return; }
      }
      S.conflicts.splice(+b.dataset.i, 1);
    }
    LS.set('conflicts', S.conflicts); draw(); render();
    if (!S.conflicts.length) setTimeout(() => md.remove(), 300);
  });
}

function applyState(j) {
  S.lists = j.lists; S.sections = j.sections; S.habits = j.habits; S.pomo = j.pomo;
  S.pomoToday = j.pomo_today; S.settings = j.settings; S.languages = j.languages || [{code: 'en', name: 'English'}]; LS.set('lang', j.settings.lang || 'en'); document.documentElement.lang = j.settings.lang || 'en'; S.counts = j.counts; S.v = j.v; S.ntfyUrl = j.ntfy_url;
  S.tasks = new Map(j.tasks.map(t => [t.id, t]));
  S.filters = j.filters || [];
  S.paperless = j.paperless || {enabled: false};
  S.ntfyInbox = j.ntfy_inbox || {enabled: false};
  // language changed on another device: switch once its file is loaded (the boot awaits it itself)
  if (S.booted && (j.settings.lang || 'en') !== I18N.code) i18nLoad(j.settings.lang).then(ok => { if (ok) render(); });
}
const plOn = () => S.paperless?.enabled && feat('paperless');
async function load() {
  let j;
  try { j = await api('GET', '/api/state'); }
  catch (e) {
    if (!(e instanceof Offline)) throw e;
    if (!S.tasks.size) {  // offline start: last cached state + still-queued edits
      const c = LS.get('cache', null); if (!c) throw e;
      applyState(c); OUT.q.forEach(applyLocal);
    }
    return;
  }
  if (OUT.q.length) {  // flush() reloads once the queue is through
    if (!S.tasks.size) { applyState(j); OUT.q.forEach(applyLocal); }
    flush(); return;
  }
  applyState(j);
  LS.set('cache', j);
  if (S.extra) await loadExtra().catch(() => {});
}
async function loadExtra() {
  const k = S.route.key;
  if (S.route.mod === 'tasks' && (k === 'done' || k === 'trash')) {
    S.extra = (await api('GET', `/api/tasks?scope=${k}`)).tasks;
  } else S.extra = null;
}
function putTask(t) { S.tasks.set(t.id, t); }

// poll for changes made elsewhere (phone <-> desktop)
setInterval(async () => {
  if (document.hidden) return;
  try {
    if (OUT.q.length) { flush(); return; }
    const {v} = await api('GET', '/api/version');
    if (v !== S.v && !editing()) { await load(); render(); }
  } catch { /* offline */ }
}, 4000);
document.addEventListener('visibilitychange', async () => {
  if (!document.hidden) { try { await load(); render(); } catch { /* offline */ } }
});
const editing = () => { const a = document.activeElement; return a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && a.closest('#detail,.qadd,.modal,#pop'); };

// ------------------------------------------------------------------ routing
const SMART = {
  today: {name: N_('Today'), icon: 'sun'},
  tomorrow: {name: N_('Tomorrow'), icon: 'sunrise'},
  week: {name: N_('Next 7 days'), icon: 'week'},
  inbox: {name: N_('Inbox'), icon: 'inbox'},
  all: {name: N_('All'), icon: 'all'},
  done: {name: N_('Completed'), icon: 'done'},
  trash: {name: N_('Trash'), icon: 'trash'},
  search: {name: N_('Search'), icon: 'search'},
};
function parseHash() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (!h) return {mod: 'tasks', key: LS.get('lastKey', 'today')};
  const [a, b] = h.split('/');
  if (a === 't' && b) return {mod: 'tasks', key: S.route.key || 'today', task: +b};
  if (a === 'snooze' && b) return {mod: 'tasks', key: LS.get('lastKey', 'today'), snooze: +b};
  if (a === 'done' && b) return {mod: 'tasks', key: LS.get('lastKey', 'today'), complete: +b};
  if (a === 'f' && b) return {mod: 'tasks', key: 'f:' + b};
  if (a === 'l') return {mod: 'tasks', key: 'l:' + b};
  if (a === 'tag') return {mod: 'tasks', key: 'tag:' + b};
  if (['cal', 'matrix', 'habits', 'pomo'].includes(a)) return {mod: a, key: a};
  if (SMART[a]) return {mod: 'tasks', key: a};
  return {mod: 'tasks', key: 'today'};
}
function go(hash) { if (location.hash !== '#' + hash) location.hash = hash; else route(); }
async function route() {
  const r = parseHash();
  if (r.mod !== 'tasks' && !feat(r.mod)) { r.mod = 'tasks'; r.key = LS.get('lastKey', 'today'); }
  if (r.key.startsWith('f:') && !S.filters.some(f => f.id === +r.key.slice(2))) r.key = 'today';
  S.route = {mod: r.mod, key: r.key};
  if (S.route.mod !== 'tasks' || r.key !== S.lastRouteKey) { S.multi.clear(); S.multiMode = false; }
  S.lastRouteKey = r.key;
  if (r.mod === 'tasks' && r.key !== 'search') LS.set('lastKey', r.key);
  S.extra = (r.key === 'done' || r.key === 'trash') ? [] : null;
  if (S.extra) await loadExtra().catch(() => { S.extra = []; });
  closeSide();
  if (r.task) { render(); openDetail(r.task); history.replaceState(null, '', '#' + keyToHash(S.route.key)); return; }
  if (r.snooze || r.complete) {
    history.replaceState(null, '', '#' + keyToHash(S.route.key));
    render();
    const t = taskById(r.snooze || r.complete);
    if (!t) { toast(tr('Task not found')); return; }
    if (r.complete) { if (t.status === 0) toggleTask(t.id); else toast(tr('Already completed')); }
    else snoozeSheet(t.id);
    return;
  }
  render();
}
const keyToHash = k => k.startsWith('l:') ? 'l/' + k.slice(2) : k.startsWith('f:') ? 'f/' + k.slice(2) : k.startsWith('tag:') ? 'tag/' + encodeURIComponent(k.slice(4)) : k;
window.addEventListener('hashchange', route);

// ------------------------------------------------------------------ quick-add parser
const PRIO_WORDS = {'!!!': 5, '!3': 5, '!hoch': 5, '!high': 5, '!!': 3, '!2': 3, '!mittel': 3, '!medium': 3, '!': 1, '!1': 1, '!niedrig': 1, '!low': 1};
const WDAY = {sonntag: 0, montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4, freitag: 5, samstag: 6,
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6};
const WDAY_RE = Object.keys(WDAY).join('|');
function nextWeekday(wd, fromNextWeek) {
  const t = pd(today()); let d = (wd - t.getDay() + 7) % 7; if (d === 0) d = 7;
  if (fromNextWeek && d < 7) { const mon = pd(mondayOf(today())); mon.setDate(mon.getDate() + 7 + ((wd + 6) % 7)); return ds(mon); }
  return addDays(today(), d);
}
function parseQuick(text, ignore = new Set()) {
  const out = {title: text, chips: []};
  let s = ' ' + text + ' ';
  const take = (re, type, fn) => {
    if (ignore.has(type)) { const m = s.match(re); if (m) out.chips.push({type, label: m[0].trim(), off: true}); return; }
    const m = s.match(re);
    if (m) { const label = fn(m); if (label !== false) { out.chips.push({type, label}); s = s.replace(m[0], ' '); } }
  };
  // repeat (before dates, "jeden montag" contains a weekday)
  take(new RegExp(`\\s(täglich|jeden tag|daily|every day|werktags|jeden werktag|weekdays|every weekday|wöchentlich|jede woche|weekly|every week|monatlich|jeden monat|monthly|every month|jährlich|jedes jahr|yearly|annually|every year|(?:jeden|every) (${WDAY_RE})|(?:alle|every) (\\d+) (tage|wochen|monate|days?|weeks?|months?))(?=\\s)`, 'i'), 'repeat', m => {
    const w = m[1].toLowerCase();
    if (/täglich|jeden tag|daily|every day/.test(w)) out.repeat = 'FREQ=DAILY';
    else if (/werktag|weekday/.test(w)) { out.repeat = 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'; }
    else if (m[2]) { const wd = WDAY[m[2].toLowerCase()]; out.repeat = 'FREQ=WEEKLY;BYDAY=' + RR_WD[wd]; out.due = out.due || nextOrToday(wd); }
    else if (m[3]) { const n = +m[3], u = m[4].toLowerCase(); out.repeat = `FREQ=${u.startsWith('tag') || u.startsWith('day') ? 'DAILY' : u.startsWith('woche') || u.startsWith('week') ? 'WEEKLY' : 'MONTHLY'};INTERVAL=${n}`; }
    else if (/woch|week/.test(w)) out.repeat = 'FREQ=WEEKLY';
    else if (/monat|month/.test(w)) out.repeat = 'FREQ=MONTHLY';
    else out.repeat = 'FREQ=YEARLY';
    return repeatLabel(out.repeat);
  });
  take(/\s(übermorgen|(?:the )?day after tomorrow|heute|morgen|today|tomorrow)(?=\s)/i, 'date', m => {
    const w = m[1].toLowerCase();
    out.due = w === 'übermorgen' || w.endsWith('after tomorrow') ? addDays(today(), 2) : (w === 'morgen' || w === 'tomorrow') ? addDays(today(), 1) : today();
    return dayLabel(out.due);
  });
  if (!out.due || ignore.has('date')) take(/\s(nächste woche|next week)(?=\s)/i, 'date', () => { out.due = nextWeekday(1); return dayLabel(out.due); });
  if (!out.due || ignore.has('date')) take(/\s(nächsten monat|next month)(?=\s)/i, 'date', () => { const d = pd(today()); d.setMonth(d.getMonth() + 1, 1); out.due = ds(d); return dayLabel(out.due); });
  if (!out.due || ignore.has('date')) take(/\s(am |this |on the |next )?(wochenende|weekend)(?=\s)/i, 'date', () => { out.due = nextOrToday(6); return dayLabel(out.due); });
  if (!out.due || ignore.has('date')) take(new RegExp(`\\s(?:(am|nächsten|nächste|kommenden|next|on|this)\\s)?(${WDAY_RE})(?=\\s)`, 'i'), 'date', m => {
    const wd = WDAY[m[2].toLowerCase()]; out.due = /nächst|kommend|next/i.test(m[1] || '') ? nextWeekday(wd, true) : nextWeekday(wd); return dayLabel(out.due);
  });
  if (!out.due || ignore.has('date')) take(/\sin (\d+|an?) (tagen|tag|wochen|woche|monaten|monat|days?|weeks?|months?)(?=\s)/i, 'date', m => {
    const n = /^an?$/i.test(m[1]) ? 1 : +m[1], u = m[2].toLowerCase(); const d = pd(today());
    if (/^(tag|day)/.test(u)) d.setDate(d.getDate() + n); else if (/^(woch|week)/.test(u)) d.setDate(d.getDate() + 7 * n); else d.setMonth(d.getMonth() + n);
    out.due = ds(d); return dayLabel(out.due);
  });
  if (!out.due || ignore.has('date')) take(/\s(?:am\s)?(\d{1,2})\.(\d{1,2})\.(\d{2,4})?(?=\s)/, 'date', m => {
    const t = pd(today()); let y = m[3] ? +m[3] : t.getFullYear(); if (y < 100) y += 2000;
    const d = new Date(y, +m[2] - 1, +m[1]); if (isNaN(d) || d.getDate() !== +m[1]) return false;
    if (!m[3] && ds(d) < today()) d.setFullYear(y + 1);
    out.due = ds(d); return dayLabel(out.due);
  });
  take(/\s(?:um\s)?(\d{1,2})(?::(\d{2}))?\s?uhr(?=\s)|\sum\s(\d{1,2})(?::(\d{2}))?(?=\s)|\s(?:at\s)?(\d{1,2}):(\d{2})(?=\s)|\s(?:at\s)?(\d{1,2})(?::(\d{2}))?\s?(am|pm)(?=\s)/i, 'time', m => {
    let h = +(m[1] ?? m[3] ?? m[5] ?? m[7]), mi = +(m[2] ?? m[4] ?? m[6] ?? m[8] ?? 0);
    if (m[9]) { if (m[9].toLowerCase() === 'pm' && h < 12) h += 12; if (m[9].toLowerCase() === 'am' && h === 12) h = 0; }
    if (h > 23 || mi > 59) return false;
    out.due_time = `${pad(h)}:${pad(mi)}`; out.due = out.due || (out.due_time < nowHM() ? addDays(today(), 1) : today());
    return out.due_time;
  });
  // priority: standalone token
  take(/\s(!!!|!!|!hoch|!mittel|!niedrig|!high|!medium|!low|![123]|!)(?=\s)/i, 'prio', m => { out.priority = PRIO_WORDS[m[1].toLowerCase()]; return tr(['', N_('Low'), '', N_('Medium'), '', N_('High')][out.priority]); });
  // tags
  if (!ignore.has('tag')) {
    out.tags = [];
    s = s.replace(/\s#([\p{L}\p{N}_\-/]+)(?=\s)/gu, (_, t) => { out.tags.push(t); out.chips.push({type: 'tag', label: '#' + t}); return ' '; });
  }
  // list: ~Name (prefix match, ignores emoji / case)
  take(/\s[~^]([^\s]+)(?=\s)/, 'list', m => {
    const q = norm(m[1]); const nm = x => norm(lname(x)) + ' ' + norm(x.name);  // display name (inbox: "Inbox" in English) or stored name
    const l = S.lists.find(x => norm(lname(x)).startsWith(q) || norm(x.name).startsWith(q)) || S.lists.find(x => nm(x).includes(q));
    if (!l) return false; out.list_id = l.id; return lname(l);
  });
  if (out.repeat && !out.due) out.due = today();
  out.title = s.replace(/\s+/g, ' ').trim();
  return out;
}
// leading emoji of a list name gets a space after it ("🌀3D" -> "🌀 3D"), display only
const listName = n => String(n ?? '').replace(/^((?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\uFE0F|\u200D)+)\s*/u, '$1 ');
// display name of a list object: the inbox is stored as "Eingang" and shown in the UI language
const lname = l => !l ? '' : l.is_inbox && l.name === 'Eingang' ? tr('Inbox') : listName(l.name);
const norm = s => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
function nextOrToday(wd) { const t = pd(today()); return addDays(today(), (wd - t.getDay() + 7) % 7); }

const rrParts = r => Object.fromEntries((r || '').replace(/^RRULE:/, '').split(';').filter(Boolean).map(x => x.split('=')));
const rrBase = r => (r || '').replace(/^RRULE:/, '').split(';').filter(x => x && !/^(COUNT|UNTIL)=/.test(x)).join(';');
function rrEnd(r) {
  const p = rrParts(r);
  if (p.COUNT) return {type: 'count', val: +p.COUNT};
  if (p.UNTIL) return {type: 'until', val: `${p.UNTIL.slice(0, 4)}-${p.UNTIL.slice(4, 6)}-${p.UNTIL.slice(6, 8)}`};
  return {type: 'never'};
}
function rrSetEnd(r, end) {
  const b = rrBase(r); if (!b) return '';
  if (end.type === 'count') return `${b};COUNT=${Math.max(1, Math.min(999, +end.val || 1))}`;
  if (end.type === 'until' && end.val) return `${b};UNTIL=${end.val.replace(/-/g, '')}`;
  return b;
}
function repeatLabel(r) {
  if (!r) return '';
  const e = rrEnd(r);
  const suffix = e.type === 'count' ? ' · ' + tr('{0}× left', e.val) : e.type === 'until' ? ' · ' + tr('until {0}', fmtDate(e.val)) : '';
  return repeatLabelBase(rrBase(r)) + suffix;
}
function repeatLabelBase(r) {
  if (!r) return '';
  const p = Object.fromEntries(r.replace(/^RRULE:/, '').split(';').map(x => x.split('=')));
  const n = +(p.INTERVAL || 1);
  const days = p.BYDAY ? p.BYDAY.split(',').map(d => WD[RR_WD.indexOf(d.replace(/^[-\d]+/, ''))]).join(', ') : '';
  if (p.FREQ === 'DAILY') return n === 1 ? tr('Daily') : tr('Every {0} days', n);
  if (p.FREQ === 'WEEKLY') {
    if (p.BYDAY === 'MO,TU,WE,TH,FR') return tr('Weekdays');
    return (n === 1 ? tr('Weekly') : tr('Every {0} weeks', n)) + (days ? ` (${days})` : '');
  }
  if (p.FREQ === 'MONTHLY') return (n === 1 ? tr('Monthly') : tr('Every {0} months', n)) + (p.BYMONTHDAY ? ' ' + tr('on day {0}', p.BYMONTHDAY) : '');
  if (p.FREQ === 'YEARLY') return n === 1 ? tr('Yearly') : tr('Every {0} years', n);
  return tr('Repeats');
}
const REM_OPTS = [['0', N_('On time')], ['5', N_('5 min before')], ['15', N_('15 min')], ['30', N_('30 min')], ['60', N_('1 h')], ['120', N_('2 h')], ['1440', N_('1 day')], ['2880', N_('2 days')], ['10080', N_('1 week')]];
const remLabel = m => tr((REM_OPTS.find(o => o[0] === String(m)) || [0, m + ' min'])[1]);

// ------------------------------------------------------------------ view selection
function viewTasks() {
  const k = S.route.key, t0 = today();
  const open = openTasks();
  // completed tasks from the last 14 days stay visible (collapsed) in list views
  const doneRecent = [...S.tasks.values()].filter(t => t.status !== 0 && !t.parent_id);
  // roots = matching tasks whose parent does not match too (a subtask due today shows up in "Heute"
  // even if its parent does not); children are rendered below their root
  const pick = (pred, group, extra = {}) => {
    const m = open.filter(pred), ids = new Set(m.map(t => t.id));
    return {open: m.filter(t => !t.parent_id || !ids.has(t.parent_id)), group, ...extra};
  };
  if (k === 'today') return {...pick(t => t.due && t.due <= t0, 'date'), done: doneRecent.filter(t => t.due && t.due <= t0 && t.completed_at && t.completed_at.slice(0, 10) >= addDays(t0, -1))};
  if (k === 'tomorrow') return {...pick(t => t.due === addDays(t0, 1), 'none'), done: []};
  if (k === 'week') return {...pick(t => t.due && t.due <= addDays(t0, 6), 'date'), done: []};
  if (k === 'all') return {...pick(() => true, 'list'), done: []};
  if (k === 'inbox' || k.startsWith('l:')) {
    const lid = k === 'inbox' ? inbox().id : +k.slice(2);
    return {...pick(t => t.list_id === lid, 'section', {list: lid}), done: doneRecent.filter(t => t.list_id === lid)};
  }
  if (k.startsWith('tag:')) {
    const tg = k.slice(4);
    return {...pick(t => t.tags.includes(tg), 'list'), done: doneRecent.filter(t => t.tags.includes(tg))};
  }
  if (k.startsWith('f:')) {
    const f = S.filters.find(x => x.id === +k.slice(2));
    return f ? {...pick(t => filterMatch(t, f.rules), 'date'), done: []} : {open: [], done: [], group: 'none'};
  }
  return {open: [], done: [], group: 'none'};
}
const DATE_OPTS = [['overdue', N_('Overdue')], ['today', N_('Today')], ['tomorrow', N_('Tomorrow')], ['3d', N_('Next 3 days')], ['7d', N_('Next 7 days')], ['month', N_('This month')], ['later', N_('Later')], ['nodate', N_('No date')]];
function dateMatch(t, d) {
  const t0 = today();
  if (d === 'nodate') return !t.due;
  if (!t.due) return false;
  switch (d) {
    case 'overdue': return t.due < t0;
    case 'today': return t.due === t0;
    case 'tomorrow': return t.due === addDays(t0, 1);
    case '3d': return t.due >= t0 && t.due <= addDays(t0, 2);
    case '7d': return t.due >= t0 && t.due <= addDays(t0, 6);
    case 'month': return t.due.slice(0, 7) === t0.slice(0, 7);
    case 'later': return t.due > addDays(t0, 6);
  }
  return false;
}
// categories are OR-ed inside ("Heute oder Morgen"), combined with the filter's op (UND / ODER)
function filterMatch(t, r = {}) {
  const c = [];
  if (r.lists?.length) c.push(r.lists.includes(t.list_id));
  if (r.dates?.length) c.push(r.dates.some(d => dateMatch(t, d)));
  if (r.prios?.length) c.push(r.prios.includes(t.priority));
  if (r.tags?.length) c.push(r.tags.some(g => t.tags.includes(g)));
  if (!c.length) return true;
  return r.op === 'or' ? c.some(Boolean) : c.every(Boolean);
}
const showDone = () => S.settings.show_completed !== '0';
async function setShowDone(on) {
  S.settings.show_completed = on ? '1' : '0';
  render();
  await api('PATCH', '/api/settings', {show_completed: S.settings.show_completed});
}
// default: priority first, manual order (drag) inside each priority. 'sort2.' = new key, old per-view choices reset once
const sortMode = () => LS.get('sort2.' + S.route.key, 'prio');
function sortTasks(arr) {
  const m = sortMode();
  const dueKey = t => (t.due || '9999') + (t.due_time || '99');
  const f = {
    custom: bySort,
    date: (a, b) => dueKey(a).localeCompare(dueKey(b)) || b.priority - a.priority || bySort(a, b),
    prio: (a, b) => b.priority - a.priority || bySort(a, b),
    title: (a, b) => a.title.localeCompare(b.title, 'de'),
  }[m] || bySort;
  return arr.sort(f);
}
function groupTasks(v) {
  const all = sortTasks(v.open.slice()), pinned = all.filter(t => t.pinned);
  const g = groupRest(v, all.filter(t => !t.pinned));
  return pinned.length ? [{id: 'pinned', name: tr('Pinned'), tasks: pinned, cls: 'pin'}, ...g] : g;
}
function groupRest(v, arr) {
  const t0 = today();
  if (v.group === 'date') {
    const g = new Map();
    for (const t of arr) {
      const key = !t.due ? 'zz' : t.due < t0 ? 'over' : t.due;
      if (!g.has(key)) g.set(key, []);
      g.get(key).push(t);
    }
    return [...g.entries()].sort((a, b) => (a[0] === 'over' ? '' : a[0]).localeCompare(b[0] === 'over' ? '' : b[0]))
      .map(([k, ts]) => ({id: 'd:' + k, name: k === 'over' ? tr('Overdue') : k === 'zz' ? tr('No date') : dayLabel(k, true), cls: k === 'over' ? 'over' : '', tasks: ts}));
  }
  if (v.group === 'list') {
    const g = new Map();
    for (const t of arr) { if (!g.has(t.list_id)) g.set(t.list_id, []); g.get(t.list_id).push(t); }
    return S.lists.filter(l => g.has(l.id)).map(l => ({id: 'l:' + l.id, name: lname(l), tasks: g.get(l.id)}));
  }
  if (v.group === 'section') {
    const secs = S.sections.filter(s => s.list_id === v.list);
    if (!secs.length) return [{id: 'all', name: '', tasks: arr}];
    const out = [{id: 's:0', name: tr('Unassigned'), tasks: arr.filter(t => !t.section_id || !secs.some(s => s.id === t.section_id)), section: null}];
    for (const s of secs) out.push({id: 's:' + s.id, name: s.name, tasks: arr.filter(t => t.section_id === s.id), section: s.id});
    return out.filter((g, i) => i > 0 || g.tasks.length);
  }
  return [{id: 'all', name: '', tasks: arr}];
}
function titleFor(k) {
  if (SMART[k]) return tr(SMART[k].name);
  if (k.startsWith('l:')) return lname(listById(+k.slice(2))) || tr('List');
  if (k.startsWith('tag:')) return '#' + k.slice(4);
  if (k.startsWith('f:')) return (S.filters.find(f => f.id === +k.slice(2)) || {}).name || tr('Filters');
  return '';
}
function quickDefaults() {
  const k = S.route.key, d = {};
  if (k === 'today') d.due = today();
  if (k === 'tomorrow') d.due = addDays(today(), 1);
  if (k.startsWith('l:')) d.list_id = +k.slice(2);
  if (k === 'inbox') d.list_id = inbox().id;
  if (k.startsWith('tag:')) d.tags = [k.slice(4)];
  if (S.route.mod === 'cal') d.due = S.calSel;
  if (k.startsWith('f:')) {  // new task in a filter view should show up in it
    const r = (S.filters.find(f => f.id === +k.slice(2)) || {}).rules || {};
    if (r.lists?.length === 1) d.list_id = r.lists[0];
    if (r.prios?.length === 1) d.priority = r.prios[0];
    if (r.tags?.length) d.tags = [r.tags[0]];
    if (r.dates?.includes('today') || r.dates?.includes('3d') || r.dates?.includes('7d')) d.due = today();
  }
  return d;
}

// ------------------------------------------------------------------ render: shell
function render() {
  renderRail(); renderSide(); renderTop(); renderView(); renderTabs();
  $('#fab').innerHTML = ic('plus'); $('#fab').setAttribute('aria-label', tr('New task'));
  $('#fab').classList.toggle('gone', ['habits', 'pomo'].includes(S.route.mod) || ['done', 'trash', 'search'].includes(S.route.key) || S.multi.size > 0);
  if (S.sel && S.tasks.has(S.sel) && !$('#detail').contains(document.activeElement)) renderDetail();
  if (S.sel && !S.tasks.has(S.sel) && !(S.extra || []).some(t => t.id === S.sel)) closeDetail();
}
const MODS = [['tasks', 'done', N_('Tasks')], ['cal', 'cal', N_('Calendar')], ['matrix', 'grid', N_('Matrix')], ['habits', 'habit', N_('Habits')], ['pomo', 'timer', N_('Focus')]];
// tab bar / rail order is a server setting (same on every device), editable in the settings
function navOrder() {
  const keys = MODS.map(m => m[0]);
  const o = (S.settings.nav_order || '').split(',').filter(k => keys.includes(k));
  return [...new Set([...o, ...keys])];
}
const mods = () => navOrder().map(k => MODS.find(m => m[0] === k)).filter(([m]) => m === 'tasks' || feat(m));
function modHash(m) { return m === 'tasks' ? keyToHash(LS.get('lastKey', 'today')) : m; }
// ---- tab bar / rail per device (LS 'tabbar'): pinned modules, smart lists, lists, filters, tags,
// search, settings. null = default = the modules in the server-wide order (settings "Module").
const TAB_MAX = 5;  // phone: more than this -> first TAB_MAX-1 + "Mehr"
const SMART_TABS = ['today', 'tomorrow', 'week', 'inbox', 'all', 'done', 'trash'];
const leadEmoji = n => (String(n ?? '').match(/^((?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\uFE0F|\u200D)+)/u) || [])[1];
const tabDefault = () => mods().map(([m]) => 'm:' + m);
const tabIds = () => LS.get('tabbar', null) || tabDefault();
function tabItem(id) {
  const [kind, ...rest] = id.split(':'), v = rest.join(':');
  if (kind === 'm') {
    const md = MODS.find(x => x[0] === v);
    if (!md || (v !== 'tasks' && !feat(v))) return null;
    return {id, go: modHash(v), icon: ic(md[1], 'l'), label: tr(md[2]), mod: v};
  }
  if (kind === 's' && SMART[v]) return {id, go: v, icon: ic(SMART[v].icon, 'l'), label: v === 'week' ? tr('7 days') : tr(SMART[v].name), key: v};
  if (kind === 'l') {
    const l = listById(+v); if (!l || l.is_inbox) return null;
    const em = leadEmoji(l.name), name = em ? l.name.slice(em.length).trim() : l.name;
    return {id, go: 'l/' + v, icon: em ? `<span class="temoji">${em}</span>` : `<span class="tsw" style="${l.color ? 'background:' + l.color : ''}"></span>`, label: name, key: 'l:' + v};
  }
  if (kind === 'f') { const f = S.filters.find(x => x.id === +v); return f ? {id, go: 'f/' + v, icon: ic('filter', 'l'), label: f.name, key: 'f:' + v} : null; }
  if (kind === 'tag' && v) return {id, go: 'tag/' + encodeURIComponent(v), icon: ic('tag', 'l'), label: v, key: 'tag:' + v};
  if (id === 'search') return {id, go: 'search', icon: ic('search', 'l'), label: tr('Search'), key: 'search'};
  if (id === 'settings') return {id, act: 'settings', icon: ic('gear', 'l'), label: tr('Settings')};
  return null;
}
const tabItems = () => tabIds().map(tabItem).filter(Boolean);
// which pinned item is "on": exact key match first, else the module (Aufgaben = any task view)
function tabOn(items) {
  const r = S.route, exact = items.find(t => t.key && r.mod === 'tasks' && t.key === r.key);
  if (exact) return exact.id;
  const m = items.find(t => t.mod && t.mod === r.mod && !(r.mod === 'tasks' && r.key === 'search'));
  return m ? m.id : null;
}
function tabBtn(t, on, cls = '') {
  const tgt = t.go != null ? `data-go="${esc(t.go)}"` : `data-act="${t.act}"`;
  return `<button class="${cls} ${on ? 'on' : ''}" ${tgt} title="${esc(t.label)}">${t.icon}<span>${esc(t.label)}</span>${t.mod === 'pomo' && S.pomo ? '<span class="dot"></span>' : ''}</button>`;
}
function renderRail() {
  const items = tabItems().filter(t => t.id !== 'search' && t.id !== 'settings'), on = tabOn(items);
  const extra = mods().filter(([m]) => !items.some(t => t.mod === m)).map(([m]) => tabItem('m:' + m));  // desktop: nothing hidden
  $('#rail').innerHTML = `<div class="logo"><img src="/static/icon.svg" alt="Abhako"></div>` +
    [...items, ...extra].map(t => tabBtn(t, t.id === on && S.route.key !== 'search', 'rbtn')).join('') +
    `<button class="rbtn ${S.route.key === 'search' ? 'on' : ''}" data-go="search" title="${tr('Search (/)')}">${ic('search')}</button>
     <div class="spacer"></div>
     <button class="rbtn" data-act="settings" title="${tr('Settings')}">${ic('gear')}</button>`;
}
// what "Mehr" offers: overflow tabs + enabled modules that are not pinned + search/settings if not pinned
function tabOverflow() {
  const items = tabItems(), shown = items.length > TAB_MAX ? items.slice(0, TAB_MAX - 1) : items;
  const rest = items.slice(shown.length);
  const mods2 = mods().filter(([m]) => !items.some(t => t.mod === m)).map(([m]) => tabItem('m:' + m));
  const misc = ['search', 'settings'].filter(k => !items.some(t => t.id === k)).map(tabItem);
  // search + settings are also in the side menu: they alone do not justify a "Mehr" tab
  return {shown, more: rest.length || mods2.length ? [...rest, ...mods2, ...misc] : []};
}
function renderTabs() {
  const {shown, more} = tabOverflow(), all = tabItems(), on = tabOn(all);
  // highlight "Mehr" when the current view is only reachable through it (overflow tab, unpinned module, search)
  const moreOn = more.length > 0 && (on ? !shown.some(t => t.id === on) : S.route.mod !== 'tasks' || S.route.key === 'search');
  $('#tabs').innerHTML = shown.map(t => tabBtn(t, t.id === on)).join('') +
    (more.length ? `<button class="${moreOn ? 'on' : ''}" data-act="tabs-more">${ic('dots', 'l')}<span>${tr('More')}</span></button>` : '');
}
function tabsMore(anchor) {
  const {more} = tabOverflow();
  menu(anchor, [...more.map(t => ({label: t.label, icon: t.id === 'settings' ? 'gear' : t.id === 'search' ? 'search' : t.mod ? MODS.find(x => x[0] === t.mod)[1] : t.id.startsWith('f:') ? 'filter' : t.id.startsWith('tag:') ? 'tag' : t.id.startsWith('s:') ? SMART[t.key].icon : 'list',
    fn: () => t.act ? settingsModal() : go(t.go)})), '-', {label: tr('Customize tab bar'), icon: 'edit', fn: () => settingsModal('tabbar')}]);
}
function counts() {
  const t0 = today(), c = {today: 0, tomorrow: 0, week: 0, over: 0, all: 0, lists: {}, tags: {}, filters: {}};
  for (const f of S.filters) c.filters[f.id] = openTasks().filter(t => !t.parent_id && filterMatch(t, f.rules)).length;
  for (const t of openTasks()) {
    if (t.parent_id) continue;
    c.all++;
    c.lists[t.list_id] = (c.lists[t.list_id] || 0) + 1;
    for (const g of t.tags) c.tags[g] = (c.tags[g] || 0) + 1;
    if (!t.due) continue;
    if (t.due <= t0) c.today++;
    if (t.due < t0) c.over++;
    if (t.due === addDays(t0, 1)) c.tomorrow++;
    if (t.due <= addDays(t0, 6)) c.week++;
  }
  return c;
}
function renderSide() {
  const c = counts(), k = S.route.key, onTasks = S.route.mod === 'tasks';
  const row = (key, icon, name, n, extra = '') =>
    `<button class="srow ${onTasks && k === key ? 'on' : ''}" data-go="${keyToHash(key)}" data-drop="${key}" ${extra}>${icon}<span class="n">${esc(name)}</span><span class="c ${key === 'today' && c.over ? 'over' : ''}">${n || ''}</span></button>`;
  const lists = S.lists.filter(l => !l.is_inbox && !l.archived);
  const listRow = l => {
    const sw = l.color || /^\p{L}/u.test(l.name) ? `<span class="sw" style="${l.color ? 'background:' + l.color : ''}"></span>` : '';
    if (S.listReorder) return `<div class="srow reorder" data-list="${l.id}">${sw}<span class="n">${esc(listName(l.name))}</span><button class="iconbtn" data-lfolder="${l.id}" title="${tr('Move to folder')}">${ic('folder', 's')}</button><button class="iconbtn" data-lmove="-1" data-id="${l.id}" title="${tr('move up')}">${ic('chev', 's up')}</button><button class="iconbtn" data-lmove="1" data-id="${l.id}" title="${tr('move down')}">${ic('chev', 's')}</button></div>`;
    return row('l:' + l.id, sw, listName(l.name), c.lists[l.id], `data-list="${l.id}" ${isMobile() ? '' : 'draggable="true"'}`);
  };
  let lh = lists.filter(l => !l.folder).map(listRow).join('');
  for (const f of folderNames()) {
    const fl = lists.filter(l => l.folder === f), closed = S.collapsed.has('fold:' + f) && !S.listReorder;
    const n = fl.reduce((a, l) => a + (c.lists[l.id] || 0), 0);
    const active = fl.some(l => onTasks && k === 'l:' + l.id);
    lh += `<div class="fhead ${closed ? 'closed' : ''} ${active && closed ? 'on' : ''}" data-act="folder-toggle" data-folder="${esc(f)}" ${isMobile() || S.listReorder ? '' : 'draggable="true"'}>${ic('chev', 's fcar')}${ic('folder', 's')}<span class="n">${esc(f)}</span>${S.listReorder
      ? `<button class="iconbtn" data-fmove="-1" data-folder="${esc(f)}" title="${tr('move up')}">${ic('chev', 's up')}</button><button class="iconbtn" data-fmove="1" data-folder="${esc(f)}" title="${tr('move down')}">${ic('chev', 's')}</button>`
      : `<span class="c">${closed && n ? n : ''}</span><button class="iconbtn fmenu" data-act="folder-menu" data-folder="${esc(f)}" title="${tr('Folder')}">${ic('dots', 's')}</button>`}</div>`;
    if (!closed) lh += `<div class="fbody" data-folder="${esc(f)}">${fl.map(listRow).join('') || `<div class="fempty">${isMobile() ? tr('empty: assign lists in sort mode') : tr('empty: drag a list here')}</div>`}</div>`;
  }
  const archived = S.lists.filter(l => l.archived);
  const tags = Object.keys(c.tags).sort((a, b) => a.localeCompare(b, 'de'));
  $('#side').innerHTML = `
    ${row('today', ic('sun'), tr('Today'), c.today)}
    ${row('tomorrow', ic('sunrise'), tr('Tomorrow'), c.tomorrow)}
    ${row('week', ic('week'), tr('Next 7 days'), c.week)}
    ${row('inbox', ic('inbox'), tr('Inbox'), c.lists[inbox()?.id])}
    <div class="sgroup"><div class="shead lroot"><span class="spacer">${tr('Lists')}</span><button data-act="lists-reorder" class="${S.listReorder ? 'on' : ''}" title="${tr('Sort lists')}">${ic('sort', 's')}</button><button data-act="list-new" title="${tr('New list')}">${ic('plus', 's')}</button></div>${lh || `<div class="folder">${tr('No lists yet')}</div>`}</div>
    <div class="sgroup"><div class="shead"><span class="spacer">${tr('Filters')}</span><button data-act="filter-new" title="${tr('New filter')}">${ic('plus', 's')}</button></div>${S.filters.map(f => row('f:' + f.id, ic('filter'), f.name, c.filters[f.id])).join('') || `<div class="folder">${tr('Combine lists, dates, priorities, tags')}</div>`}</div>
    ${tags.length ? `<div class="sgroup"><div class="shead">${tr('Tags')}</div>${tags.map(t => row('tag:' + t, ic('tag'), t, c.tags[t])).join('')}</div>` : ''}
    <div class="sgroup sfoot">
      ${row('all', ic('all'), tr('All'), c.all)}
      ${row('done', ic('done'), tr('Completed'), '')}
      ${row('trash', ic('trash'), tr('Trash'), S.counts.trash || '')}
      ${archived.length ? `<div class="folder">${ic('eye', 's')}${tr('Archived')}</div>` + archived.map(l => row('l:' + l.id, `<span class="sw"></span>`, listName(l.name), '', `data-list="${l.id}"`)).join('') : ''}
      <button class="srow" data-go="search">${ic('search')}<span class="n">${tr('Search')}</span></button>
      <button class="srow" data-act="settings">${ic('gear')}<span class="n">${tr('Settings')}</span></button>
    </div>`;
}
function renderTop() {
  const m = S.route.mod, k = S.route.key;
  let title = m === 'tasks' ? titleFor(k) : tr({cal: N_('Calendar'), matrix: N_('Eisenhower matrix'), habits: N_('Habits'), pomo: N_('Focus')}[m]);
  let acts = '';
  if (m === 'tasks' && (k.startsWith('l:') || k === 'inbox')) {
    const l = k === 'inbox' ? inbox() : listById(+k.slice(2));
    if (l) {
      const v = listView(l);
      if (feat('kanban') || feat('timeline')) acts += `<div class="seg"><button class="${v === 'list' ? 'on' : ''}" data-act="view-list" title="${tr('List')}">${ic('list', 's')}</button>${feat('kanban') ? `<button class="${v === 'kanban' ? 'on' : ''}" data-act="view-kanban" title="${tr('Kanban')}">${ic('kanban', 's')}</button>` : ''}${feat('timeline') ? `<button class="${v === 'timeline' ? 'on' : ''}" data-act="view-timeline" title="${tr('Timeline')}">${ic('timeline', 's')}</button>` : ''}</div>`;
      acts += `<button class="iconbtn" data-act="list-menu" data-id="${l.id}" title="${tr('Edit list')}">${ic('dots')}</button>`;
    }
  }
  if (m === 'tasks' && !['done', 'trash', 'search'].includes(k) && !isKanban() && !isTimeline()) acts = `<button class="iconbtn ${S.multiMode ? 'on' : ''}" data-act="multi" title="${tr('Select multiple')}">${ic('select')}</button><button class="iconbtn" data-act="sort" title="${tr('Sort')}">${ic('sort')}</button>` + acts;
  if (m === 'tasks' && k.startsWith('f:')) acts += `<button class="iconbtn" data-act="filter-edit" data-id="${k.slice(2)}" title="${tr('Edit filter')}">${ic('dots')}</button>`;
  if (m === 'tasks' && k === 'trash' && (S.extra || []).length) acts += `<button class="btn sm danger" data-act="trash-empty">${tr('Empty')}</button>`;
  if (m === 'habits') acts += `<button class="iconbtn" data-act="habit-new" title="${tr('New habit')}">${ic('plus')}</button>`;
  const pm = S.pomo && m !== 'pomo' ? `<button class="pomo-mini" data-go="pomo">${ic(S.pomo.paused_at ? 'pause' : 'timer', 's')}<span data-pomo-mini>${pomoDisplay()}</span></button>` : '';
  const off = !OUT.online || OUT.q.length ? `<span class="offline" title="${tr('Changes are sent as soon as the server is reachable')}">${OUT.online ? 'sync' : 'offline'}${OUT.q.length ? ' · ' + OUT.q.length : ''}</span>` : '';
  const cf = S.conflicts?.length ? `<button class="cfpill" data-act="conflicts" title="${tr('Review conflicts')}">${ic('alert', 's')}${S.conflicts.length}</button>` : '';
  $('#top').innerHTML = `<button class="iconbtn menu" data-act="side" aria-label="${tr('Menu')}">${ic('menu')}</button><h1>${esc(title)}</h1>${cf}${off}${pm}${acts}`;
}
function routeList() {
  const k = S.route.key;
  if (S.route.mod !== 'tasks') return null;
  return k === 'inbox' ? inbox() : k.startsWith('l:') ? listById(+k.slice(2)) : null;
}
const listView = l => (l.view === 'kanban' && feat('kanban')) || (l.view === 'timeline' && feat('timeline')) ? l.view : 'list';
function isKanban() { const l = routeList(); return !!l && listView(l) === 'kanban'; }
function isTimeline() { const l = routeList(); return !!l && listView(l) === 'timeline'; }
function renderView() {
  const m = S.route.mod, el = $('#view');
  const scroll = el.scrollTop;
  const wbs = $('#wbody')?.scrollTop, tls = $('#tlscroll')?.scrollLeft;
  if (m === 'cal') el.innerHTML = viewCal();
  else if (m === 'matrix') el.innerHTML = viewMatrix();
  else if (m === 'habits') el.innerHTML = viewHabits();
  else if (m === 'pomo') { el.innerHTML = viewPomo(); loadPomoStats(); }
  else if (S.route.key === 'search') el.innerHTML = viewSearch();
  else if (S.route.key === 'done' || S.route.key === 'trash') el.innerHTML = viewHistory();
  else if (isKanban()) el.innerHTML = viewKanban();
  else if (isTimeline()) el.innerHTML = viewTimeline(routeList().id);
  else el.innerHTML = viewList();
  el.scrollTop = scroll;
  const wb = $('#wbody'); if (wb) wb.scrollTop = wbs ?? 7 * WEEK_H;
  const tl = $('#tlscroll'); if (tl) tl.scrollLeft = tls ?? Math.max(0, diffDays(S.tlStart, today()) - 2) * tlDW();
  renderMultiBar();
  if (S.route.key === 'search') { const i = $('#searchq'); if (i && document.activeElement !== i) { i.value = S.searchQ || ''; if (!isMobile()) i.focus(); } }
}

// ------------------------------------------------------------------ render: task rows
function taskRow(t, opts = {}) {
  const kids = S.tasks.size ? children(t.id) : [];
  const openKids = kids.filter(k => k.status === 0).length;
  const meta = [];
  if (t.pinned && !opts.trash) meta.push(`<span class="pinm">${ic('pin', 's')}</span>`);
  if (opts.showList && listById(t.list_id)) meta.push(`<span class="lst">${esc(lname(listById(t.list_id)))}</span>`);
  if (t.due) meta.push(`<span class="${dueClass(t)}">${ic('cal', 's')}${t.start && t.start < t.due ? dayLabel(t.start) + ' – ' : ''}${dayLabel(t.due)}${t.due_time ? ' ' + t.due_time : ''}</span>`);
  if (t.repeat) meta.push(`<span>${ic('repeat', 's')}</span>`);
  if (t.reminders && t.due) meta.push(`<span>${ic('bell', 's')}</span>`);
  if (kids.length) meta.push(`<span>${ic('sub', 's')}${kids.length - openKids}/${kids.length}</span>`);
  if (t.content && !opts.compact) meta.push(`<span>${ic('edit', 's')}</span>`);
  if (t.attachments?.length) meta.push(`<span>${ic('clip', 's')}${t.attachments.length}</span>`);
  if (t.paperless?.length && plOn()) meta.push(`<span>${ic('archive', 's')}${t.paperless.length}</span>`);
  for (const g of t.tags) meta.push(`<span class="tag">#${esc(g)}</span>`);
  if (opts.trash) meta.push(`<span>${tr('deleted {0}', dayLabel(t.deleted_at.slice(0, 10)))}</span>`);
  const chk = t.status === 2 ? 'on' : t.status === -1 ? 'wont' : 'p' + t.priority;
  const collapsed = S.collapsed.has('t' + t.id);
  const caret = opts.tree && openKids ? `<button class="caret ${collapsed ? 'closed' : ''}" data-act="collapse" data-key="t${t.id}">${ic('chev', 's')}</button>` : '';
  let h = `<div class="trow ${t.status ? 'done' : ''} ${opts.depth ? 'sub d' + opts.depth : ''} ${opts.subRow ? 'subrow' : ''} ${S.sel === t.id ? 'sel' : ''} ${S.multi.has(t.id) ? 'msel' : ''}" data-id="${t.id}" ${opts.drag !== false && !opts.trash && !isMobile() ? 'draggable="true"' : ''}>
    ${caret}
    ${opts.trash ? `<span class="chk ${chk}">${t.status === 2 ? ic('check') : ''}</span>` : `<button class="chk ${chk}" data-act="toggle" aria-label="${tr('done')}">${t.status === 2 ? ic('check') : t.status === -1 ? ic('x') : ''}</button>`}
    <div class="tmain" data-act="${opts.trash ? '' : 'open'}"><div class="ttl">${esc(t.title)}</div><div class="meta">${meta.join('')}</div></div>
    ${opts.trash ? `<button class="iconbtn" data-act="restore" title="${tr('Restore')}">${ic('undo')}</button><button class="iconbtn danger" data-act="purge" title="${tr('Delete permanently')}">${ic('x')}</button>` : ''}
  </div>`;
  if (opts.tree && openKids && !collapsed) h += kids.filter(k => k.status === 0).map(k => taskRow(k, {...opts, depth: (opts.depth || 0) + 1, showList: false})).join('');
  return h;
}
function qaddBox(extraCls = '') {
  return `<div class="qadd inline ${extraCls}"><div class="box">${ic('plus')}<input id="qinput" placeholder="${tr('Add task: “Dentist tomorrow 3pm !high #private ~list”')}" autocomplete="off" enterkeyhint="done"></div><div class="chips" id="qchips"></div></div>`;
}
function viewList() {
  const v = viewTasks();
  const groups = groupTasks(v);
  const showList = !v.list;
  let h = qaddBox();
  const total = groups.reduce((n, g) => n + g.tasks.length, 0);
  if (!total) {
    h += `<div class="empty">${ic(S.route.key === 'today' ? 'sun' : 'done')}${S.route.key === 'today' ? tr('Nothing left for today.') : tr('No tasks.')}</div>`;
  }
  for (const g of groups) {
    const closed = S.collapsed.has(g.id);
    if (g.name) h += `<div class="group"><div class="ghead ${g.cls || ''} ${closed ? 'closed' : ''}" data-act="collapse" data-key="${g.id}" ${g.section !== undefined ? `data-section="${g.section ?? ''}"` : ''}>${ic('chev', 's')}${esc(g.name)} <span class="c">${g.tasks.length}</span>${g.section ? `<button class="iconbtn gact" data-act="section-menu" data-id="${g.section}">${ic('dots', 's')}</button>` : ''}</div>`;
    if (!closed) h += g.tasks.map(t => taskRow(t, {showList, tree: true})).join('');
    if (g.name) h += '</div>';
  }
  if (v.list) h += `<button class="iconbtn" data-act="section-new" style="margin:6px 0 0 -4px">${ic('plus', 's')} ${tr('Section')}</button>`;
  if (v.done.length && showDone()) {
    const closed = !S.collapsed.has('done-open');
    h += `<div class="group"><div class="ghead ${closed ? 'closed' : ''}" data-act="collapse" data-key="done-open">${ic('chev', 's')}${tr('Completed')} <span class="c">${v.done.length}</span></div>`;
    if (!closed) h += v.done.sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || '')).map(t => taskRow(t, {showList, drag: false})).join('');
    h += '</div>';
  }
  return h;
}
function viewHistory() {
  const trash = S.route.key === 'trash';
  const arr = S.extra || [];
  if (!arr.length) return `<div class="empty">${ic(trash ? 'trash' : 'done')}${trash ? tr('Trash is empty.') : tr('Nothing completed yet.')}</div>`;
  if (trash) return arr.map(t => taskRow(t, {trash: true, showList: true})).join('');
  const g = new Map();
  for (const t of arr) { const d = (t.completed_at ? new Date(t.completed_at) : new Date()); const k = ds(d); if (!g.has(k)) g.set(k, []); g.get(k).push(t); }
  return [...g.entries()].map(([k, ts]) => `<div class="group"><div class="ghead">${dayLabel(k, true)} <span class="c">${ts.length}</span></div>${ts.map(t => taskRow(t, {showList: true, drag: false})).join('')}</div>`).join('');
}
function viewSearch() {
  return `<div class="search"><input id="searchq" placeholder="${tr('Search titles and notes')}" autocomplete="off" enterkeyhint="search"></div><div id="sresults">${S.searchRes ? renderSearchRes() : ''}</div>`;
}
function renderSearchRes() {
  if (!S.searchRes.length) return `<div class="empty">${tr('No results.')}</div>`;
  return S.searchRes.map(t => taskRow(t, {showList: true, drag: false})).join('');
}
let searchTimer;
async function doSearch(q) {
  S.searchQ = q;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    if (!q.trim()) { S.searchRes = null; $('#sresults').innerHTML = ''; return; }
    const j = await api('GET', '/api/tasks?scope=search&q=' + encodeURIComponent(q));
    S.searchRes = j.tasks; S.extra = j.tasks;
    $('#sresults').innerHTML = renderSearchRes();
  }, 200);
}

// ------------------------------------------------------------------ kanban
function viewKanban() {
  const k = S.route.key;
  const lid = k === 'inbox' ? inbox().id : +k.slice(2);
  const secs = S.sections.filter(s => s.list_id === lid);
  const tasks = sortTasks(openTasks().filter(t => t.list_id === lid && !t.parent_id));
  const cols = [];
  const loose = tasks.filter(t => !t.section_id || !secs.some(s => s.id === t.section_id));
  if (loose.length || !secs.length) cols.push({id: null, name: secs.length ? tr('Unassigned') : tr('Tasks'), tasks: loose});
  for (const s of secs) cols.push({id: s.id, name: s.name, tasks: tasks.filter(t => t.section_id === s.id)});
  return `<div class="kanban">${cols.map(c => `
    <div class="kcol" data-kcol="${c.id ?? ''}">
      <div class="khead">${esc(c.name)} <span class="c">${c.tasks.length}</span>${c.id ? `<button class="iconbtn" data-act="section-menu" data-id="${c.id}">${ic('dots', 's')}</button>` : ''}</div>
      <div class="kcards">${c.tasks.map(t => taskRow(t, {compact: true})).join('')}</div>
      <div class="kadd"><input placeholder="${tr('+ Task')}" data-kadd="${c.id ?? ''}" enterkeyhint="done"></div>
    </div>`).join('')}
    <div class="knew"><button class="btn sm" data-act="section-new">${ic('plus', 's')} ${tr('Column')}</button></div></div>`;
}

// ------------------------------------------------------------------ calendar
const WEEK_H = 44;  // px per hour in the week / day grid
const diffDays = (a, b) => Math.round((pd(b) - pd(a)) / 864e5);
const hm = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
function calByDay(lo, hi) {
  const byDay = new Map();
  const add = (d, t) => { if (!byDay.has(d)) byDay.set(d, []); byDay.get(d).push(t); };
  for (const t of S.tasks.values()) {
    if (!t.due || t.due < lo || t.due > hi) continue;
    if (t.status && !showDone()) continue;
    add(t.due, t);
  }
  // future repeats of recurring tasks (server-computed RRULE), shown as ghosts
  for (const o of S.occ.items) {
    const t = S.tasks.get(o.id);
    if (t && t.status === 0 && o.date >= lo && o.date <= hi) add(o.date, {...t, due: o.date, ghost: true});
  }
  for (const a of byDay.values()) a.sort((a, b) => a.status - b.status || (a.due_time || '99').localeCompare(b.due_time || '99') || b.priority - a.priority);
  ensureOcc(lo, hi);
  return byDay;
}
async function ensureOcc(lo, hi) {
  const key = lo + '|' + hi;
  if (S.occ.key === key || S.occ.loading === key) return;
  S.occ.loading = key;
  try {
    const j = await api('GET', `/api/occurrences?from=${lo}&to=${hi}`);
    S.occ = {key, items: j.items};
    if (S.route.mod === 'cal') renderView();
  } catch { S.occ.loading = ''; }
}
function calBar(title) {
  const modes = [['month', N_('Month')], ['week', N_('Week')], ['day', N_('Day')], ...(feat('timeline') ? [['timeline', N_('Timeline')]] : [])].map(([k, n]) => [k, tr(n)]);
  return `<div class="calbar"><h2>${title}</h2><div class="seg">${modes.map(([k, n]) => `<button class="${S.calMode === k ? 'on' : ''}" data-act="cal-mode" data-k="${k}">${n}</button>`).join('')}</div>
    <div class="calnav"><button class="iconbtn" data-act="cal-prev">${ic('left')}</button><button class="btn sm" data-act="cal-today">${tr('Today')}</button><button class="iconbtn" data-act="cal-next">${ic('right')}</button></div></div>`;
}
function viewCal() {
  if (S.calMode === 'timeline' && !feat('timeline')) S.calMode = 'month';
  if (S.calMode === 'week' || S.calMode === 'day') return viewWeek();
  if (S.calMode === 'timeline') return calBar(tr('Timeline')) + viewTimeline(null, true);
  const t0 = today();
  if (!S.calMonth) S.calMonth = t0.slice(0, 7);
  const [y, m] = S.calMonth.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const start = mondayOf(ds(first));
  const byDay = calByDay(start, addDays(start, 41));
  let cells = '';
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i);
    if (i === 35 && pd(d).getMonth() !== m - 1) break;
    const ts = byDay.get(d) || [];
    const out = pd(d).getMonth() !== m - 1;
    cells += `<div class="cell ${out ? 'out' : ''} ${d === t0 ? 'today' : ''} ${d === S.calSel ? 'sel' : ''}" data-day="${d}">
      <span class="dn">${pd(d).getDate()}</span>
      ${ts.slice(0, 3).map(t => `<div class="ev p${t.priority} ${t.status ? 'done' : ''} ${t.ghost ? 'ghost' : ''}" data-id="${t.id}" draggable="${t.status || t.ghost || isMobile() ? 'false' : 'true'}">${t.due_time ? `<span class="muted">${t.due_time}</span> ` : ''}${esc(t.title)}</div>`).join('')}
      ${ts.length > 3 ? `<div class="more">+${ts.length - 3}</div>` : ''}
      <div class="dots">${ts.filter(t => !t.status).slice(0, 4).map(t => `<i class="p${t.priority}"></i>`).join('')}</div>
    </div>`;
  }
  const sel = (byDay.get(S.calSel) || []).filter(t => !t.ghost);
  return `${calBar(`${MON[m - 1]} ${y}`)}
    <div class="cal">${WD_MO().map(w => `<div class="wd">${w}</div>`).join('')}${cells}</div>
    <div class="agenda"><h3>${dayLabel(S.calSel, true)}${S.calSel !== t0 && dayLabel(S.calSel, true) === WDL[pd(S.calSel).getDay()] ? '' : ''} <span class="muted" style="font-weight:400;font-size:13px">${fmtDate(S.calSel)}</span></h3>
      ${qaddBox()}
      ${sel.length ? sel.map(t => taskRow(t, {showList: true, drag: false})).join('') : `<div class="muted" style="padding:8px 4px">${tr('No tasks on this day.')}</div>`}
    </div>`;
}

function viewWeek() {
  const day = S.calMode === 'day';
  const days = day ? [S.calSel] : [...Array(7)].map((_, i) => addDays(mondayOf(S.calSel), i));
  const map = calByDay(days[0], days[days.length - 1]);
  const t0 = today(), H = WEEK_H;
  const chip = t => `<div class="ev p${t.priority} ${t.status ? 'done' : ''} ${t.ghost ? 'ghost' : ''}" data-id="${t.id}" draggable="${t.status || t.ghost || isMobile() ? 'false' : 'true'}">${esc(t.title)}</div>`;
  const now = new Date(), nowTop = (now.getHours() * 60 + now.getMinutes()) / 60 * H;
  const cols = days.map(d => {
    const blocks = layoutDay((map.get(d) || []).filter(t => t.due_time)).map(it => {
      const t = it.t, top = it.s / 60 * H, h = Math.max((it.e - it.s) / 60 * H, 20);
      return `<div class="wev p${t.priority} ${t.status ? 'done' : ''} ${t.ghost ? 'ghost' : ''}" data-id="${t.id}" draggable="${t.status || t.ghost || isMobile() ? 'false' : 'true'}" style="top:${top}px;height:${h}px;left:calc(${it.lane} * 100% / ${it.n});width:calc(100% / ${it.n} - 2px)"><b>${t.due_time}</b> ${esc(t.title)}</div>`;
    }).join('');
    return `<div class="wcol ${d === t0 ? 'today' : ''}" data-day="${d}">${blocks}${d === t0 ? `<i class="nowline" style="top:${nowTop}px"></i>` : ''}</div>`;
  }).join('');
  const title = day ? fmtDay('long', pd(S.calSel)) : `${MON[pd(days[0]).getMonth()]} ${pd(days[0]).getFullYear()} · ${tr('Week {0}', isoWeek(days[0]))}`;
  return `${calBar(title)}<div class="week ${day ? 'oneday' : ''}" style="--cols:${days.length};--h:${H}px">
    <div class="whead"><div></div>${days.map(d => `<div class="wh ${d === t0 ? 'today' : ''}" data-day="${d}"><span>${WD[pd(d).getDay()]}</span><b>${pd(d).getDate()}</b></div>`).join('')}</div>
    <div class="wallday"><div class="wlbl">${tr('all day|short')}</div>${days.map(d => `<div class="wad" data-day="${d}">${(map.get(d) || []).filter(t => !t.due_time).map(chip).join('')}</div>`).join('')}</div>
    <div class="wbody" id="wbody"><div class="wgutter">${[...Array(24)].map((_, h) => `<div class="wtime" style="top:${h * H}px">${pad(h)}:00</div>`).join('')}</div>${cols}</div></div>`;
}
function isoWeek(s) { const d = pd(s); d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7); const w1 = new Date(d.getFullYear(), 0, 4); return 1 + Math.round(((d - w1) / 864e5 - 3 + (w1.getDay() + 6) % 7) / 7); }
function layoutDay(evs) {  // side-by-side lanes for overlapping timed tasks
  const items = evs.map(t => { const s = hm(t.due_time); return {t, s, e: s + Math.max(15, t.duration || 30)}; }).sort((a, b) => a.s - b.s || b.e - a.e);
  const out = []; let cluster = [], lanes = [], end = -1;
  const close = () => { cluster.forEach(x => { x.n = lanes.length; }); out.push(...cluster); cluster = []; lanes = []; end = -1; };
  for (const it of items) {
    if (cluster.length && it.s >= end) close();
    let lane = lanes.findIndex(e => e <= it.s);
    if (lane < 0) { lane = lanes.length; lanes.push(it.e); } else lanes[lane] = it.e;
    it.lane = lane; cluster.push(it); end = Math.max(end, it.e);
  }
  if (cluster.length) close();
  return out;
}

// ------------------------------------------------------------------ timeline (gantt)
const tlDW = () => isMobile() ? 30 : 36;
const TL_DAYS = 70;
function viewTimeline(listId, inCal) {
  const DW = tlDW();
  if (!S.tlStart) S.tlStart = addDays(mondayOf(today()), -7);
  const start = S.tlStart, end = addDays(start, TL_DAYS - 1), t0 = today();
  const all = openTasks().filter(t => !listId || t.list_id === listId);
  const dated = all.filter(t => t.due && t.due >= start && (t.start || t.due) <= end);
  const undated = all.filter(t => !t.due).length;
  const groups = S.lists.filter(l => dated.some(t => t.list_id === l.id)).map(l => ({l, ts: dated.filter(t => t.list_id === l.id).sort((a, b) => (a.start || a.due).localeCompare(b.start || b.due) || bySort(a, b))}));
  let head = '', months = '', lastM = '';
  for (let i = 0; i < TL_DAYS; i++) {
    const d = addDays(start, i), dd = pd(d), wk = dd.getDay() === 0 || dd.getDay() === 6;
    head += `<div class="tl-d ${d === t0 ? 'today' : ''} ${wk ? 'we' : ''}"><span>${WD[dd.getDay()].slice(0, 1)}</span>${dd.getDate()}</div>`;
    if (d.slice(0, 7) !== lastM) { months += `<div class="tl-m" style="left:${i * DW}px">${MON[dd.getMonth()]} ${dd.getFullYear()}</div>`; lastM = d.slice(0, 7); }
  }
  const todayX = diffDays(start, t0) * DW;
  const bar = t => {
    const s = (t.start && t.start < t.due ? t.start : t.due) < start ? start : (t.start && t.start < t.due ? t.start : t.due);
    const e = t.due > end ? end : t.due;
    const x = diffDays(start, s) * DW, w = (diffDays(s, e) + 1) * DW;
    return `<div class="tl-bar p${t.priority} ${w < 110 ? 'short' : ''}" data-id="${t.id}" style="left:${x + 2}px;width:${w - 4}px" title="${esc(t.title)}"><span>${esc(t.title)}</span><i class="h l"></i><i class="h r"></i></div>`;
  };
  const rows = groups.map(g => `<div class="tl-row tl-grp"><div class="tl-name">${esc(lname(g.l))}</div><div class="tl-track"></div></div>` +
    g.ts.map(t => `<div class="tl-row"><div class="tl-name" data-act="open" data-id="${t.id}">${t.parent_id ? '<span class="muted">↳ </span>' : ''}${esc(t.title)}</div><div class="tl-track">${bar(t)}</div></div>`).join('')).join('');
  return `${inCal ? '' : `<div class="calbar"><h2>${tr('Timeline')}</h2><div class="calnav"><button class="iconbtn" data-act="tl-prev">${ic('left')}</button><button class="btn sm" data-act="tl-today">${tr('Today')}</button><button class="iconbtn" data-act="tl-next">${ic('right')}</button></div></div>`}
    <div class="tl" style="--dw:${DW}px;--days:${TL_DAYS}">
    <div class="tl-scroll" id="tlscroll"><div class="tl-inner">
      <div class="tl-row tl-headrow"><div class="tl-name"></div><div class="tl-track tl-headtrack"><div class="tl-months">${months}</div><div class="tl-days">${head}</div></div></div>
      ${rows || `<div class="tl-row"><div class="tl-name muted">${tr('No dated tasks')}</div><div class="tl-track"></div></div>`}
      <i class="tl-now" style="left:calc(var(--tl-name) + ${todayX + DW / 2}px)"></i>
    </div></div>
    <div class="muted tl-foot">${isMobile() ? tr('Long-press and drag a bar: the middle moves it, the ends change start / due date.') : tr('Drag a bar to move it, drag its ends to change start / due date.')} ${tr('Set a date range via “Start” in the date dialog.')}${undated ? ' ' + trn('{0} task without a date is not shown.', '{0} tasks without a date are not shown.', undated) : ''}</div></div>`;
}
let tlDrag = null, tlDragged = false;
function tlApply(d, clientX) {
  const DW = tlDW(), n = Math.round((clientX - d.x) / DW), {b, mode, left, width} = d;
  d.days = n;
  if (mode === 'm') b.style.left = left + n * DW + 'px';
  if (mode === 'r') b.style.width = Math.max(DW - 4, width + n * DW) + 'px';
  if (mode === 'l') { const w = Math.max(DW - 4, width - n * DW); b.style.left = left + (width - w) + 'px'; b.style.width = w + 'px'; }
}
async function tlCommit(d) {
  const {t, mode, days, b} = d;
  b.classList.remove('drag', 'mode-l', 'mode-r', 'mode-m');
  if (!days) return;
  tlDragged = true; setTimeout(() => { tlDragged = false; }, 400);
  const s0 = t.start && t.start < t.due ? t.start : t.due;
  let start = t.start || null, due = t.due;
  if (mode === 'm') { due = addDays(t.due, days); start = t.start ? addDays(t.start, days) : null; }
  if (mode === 'r') { due = addDays(t.due, days); if (due < s0) due = s0; if (!t.start && due !== t.due && due > t.due) start = t.due; }
  if (mode === 'l') { start = addDays(s0, days); if (start >= due) start = null; }
  await patchTask(t.id, {start, due});
}
// touch: hold a bar ~0.3 s, then drag. Grabbed near an end = change start / due, middle = move.
let tlTouch = null;
document.addEventListener('touchstart', e => {
  const b = e.target.closest('.tl-bar'); if (!b) return;
  const t = S.tasks.get(+b.dataset.id); if (!t) return;
  const p = e.touches[0], r = b.getBoundingClientRect(), rel = p.clientX - r.left, edge = Math.min(24, r.width / 3);
  const mode = r.width >= 56 && rel < edge ? 'l' : r.width >= 56 && rel > r.width - edge ? 'r' : 'm';
  tlTouch = {b, t, mode, x: p.clientX, y: p.clientY, left: b.offsetLeft, width: b.offsetWidth, days: 0, active: false};
  tlTouch.timer = setTimeout(() => {
    if (!tlTouch) return;
    tlTouch.active = true;
    b.classList.add('drag', 'mode-' + mode);
    if (navigator.vibrate) navigator.vibrate(12);
  }, 300);
}, {passive: true});
document.addEventListener('touchmove', e => {
  if (!tlTouch) return;
  const p = e.touches[0];
  if (!tlTouch.active) { if (Math.hypot(p.clientX - tlTouch.x, p.clientY - tlTouch.y) > 8) { clearTimeout(tlTouch.timer); tlTouch = null; } return; }
  e.preventDefault();
  const sc = $('#tlscroll');
  if (sc) {  // scroll along at the edges, keep the finger's day under the finger
    const r = sc.getBoundingClientRect(), before = sc.scrollLeft;
    if (p.clientX > r.right - 28) sc.scrollLeft += 10;
    else if (p.clientX < r.left + 140) sc.scrollLeft -= 10;
    tlTouch.x -= sc.scrollLeft - before;
  }
  tlApply(tlTouch, p.clientX);
}, {passive: false});
function tlTouchEnd() {
  if (!tlTouch) return;
  clearTimeout(tlTouch.timer);
  const d = tlTouch; tlTouch = null;
  if (d.active) { tlDragged = true; setTimeout(() => { tlDragged = false; }, 400); tlCommit(d); }
}
document.addEventListener('touchend', tlTouchEnd);
document.addEventListener('touchcancel', tlTouchEnd);
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('.tl-bar');
  if (!b || e.pointerType !== 'mouse' || e.button !== 0) return;
  const t = S.tasks.get(+b.dataset.id); if (!t) return;
  tlDrag = {b, t, mode: e.target.classList.contains('l') ? 'l' : e.target.classList.contains('r') ? 'r' : 'm', x: e.clientX, left: b.offsetLeft, width: b.offsetWidth, days: 0};
  b.setPointerCapture(e.pointerId); b.classList.add('drag'); e.preventDefault();
});
document.addEventListener('pointermove', e => { if (tlDrag) tlApply(tlDrag, e.clientX); });
document.addEventListener('pointerup', () => { if (!tlDrag) return; const d = tlDrag; tlDrag = null; tlCommit(d); });

// ------------------------------------------------------------------ matrix
const QUADS = [[5, N_('Urgent & important')], [3, N_('Not urgent, but important')], [1, N_('Urgent, not important')], [0, N_('Neither urgent nor important')]];
function viewMatrix() {
  const all = openTasks().filter(t => !t.parent_id);
  const dueKey = t => (t.due || '9999') + (t.due_time || '99');
  return `<div class="matrix">${QUADS.map(([p, n]) => {
    const ts = all.filter(t => t.priority === p).sort((a, b) => dueKey(a).localeCompare(dueKey(b)) || bySort(a, b));
    return `<div class="quad q${p}" data-quad="${p}"><h3><span class="${p ? 'flag-' + p : 'muted'}">${ic('flag', 's')}</span>${tr(n)} <span class="c">${ts.length}</span></h3>
      <div class="qlist">${ts.map(t => taskRow(t, {showList: true, compact: true})).join('') || `<div class="muted" style="padding:8px 6px;font-size:13px">${tr('empty')}</div>`}</div>
      <div class="kadd"><input placeholder="${tr('+ Task')}" data-qadd="${p}" enterkeyhint="done"></div></div>`;
  }).join('')}</div>`;
}

// ------------------------------------------------------------------ habits
const HCOLORS = ['#2dd4bf', '#6d8cff', '#6ee7b7', '#4ade80', '#f5b041', '#f87171', '#c084fc', '#f472b6', '#94a3b8'];
const habitScheduled = (h, d) => h.per_week ? true : h.days.includes(String(((pd(d).getDay() + 6) % 7) + 1));
const weekDone = (h, mon) => [...Array(7)].reduce((n, _, i) => n + ((h.logs[addDays(mon, i)] || 0) >= h.goal ? 1 : 0), 0);
function weekStreak(h) {  // "x times a week": consecutive weeks that reached the target (this week counts once reached)
  let mon = mondayOf(today()), n = 0, guard = 0;
  if (weekDone(h, mon) < h.per_week) mon = addDays(mon, -7);
  while (guard++ < 300 && weekDone(h, mon) >= h.per_week) { n++; mon = addDays(mon, -7); }
  return n;
}
const streakUnit = h => h.per_week ? trn('week', 'weeks', habitStreak(h)) : trn('day', 'days', habitStreak(h));
function habitStreak(h) {
  if (h.per_week) return weekStreak(h);
  const t0 = today(); let d = t0, n = 0, guard = 0;
  if ((h.logs[t0] || 0) < h.goal) d = addDays(t0, -1);
  while (guard++ < 800) {
    if (habitScheduled(h, d)) { if ((h.logs[d] || 0) >= h.goal) n++; else break; }
    d = addDays(d, -1);
    if (d < h.created_at.slice(0, 10)) break;
  }
  return n;
}
function habitStats(h) {
  const days = Object.entries(h.logs).filter(([, c]) => c >= h.goal).map(([d]) => d).sort();
  let best = 0, cur = 0, prev = null;
  for (const d of days) {
    if (prev) { let x = addDays(prev, 1); while (x < d && !habitScheduled(h, x)) x = addDays(x, 1); cur = x === d ? cur + 1 : 1; } else cur = 1;
    best = Math.max(best, cur); prev = d;
  }
  let sched = 0, hit = 0;
  if (h.per_week) {  // best run of weeks + share of the last 4 full weeks that hit the target
    const first = mondayOf(h.created_at.slice(0, 10)); let mon = mondayOf(today()), run = 0; best = 0;
    for (let g = 0; g < 300 && mon >= first; g++, mon = addDays(mon, -7)) { if (weekDone(h, mon) >= h.per_week) { run++; best = Math.max(best, run); } else if (g) run = 0; }
    for (let w = 1; w <= 4; w++) { const m = addDays(mondayOf(today()), -7 * w); if (m < first) break; sched++; if (weekDone(h, m) >= h.per_week) hit++; }
    return {total: days.length, best, streak: habitStreak(h), rate: sched ? Math.round(100 * hit / sched) : 0};
  }
  for (let i = 0; i < 30; i++) { const d = addDays(today(), -i); if (d < h.created_at.slice(0, 10)) break; if (habitScheduled(h, d)) { sched++; if ((h.logs[d] || 0) >= h.goal) hit++; } }
  return {total: days.length, best, streak: habitStreak(h), rate: sched ? Math.round(100 * hit / sched) : 0};
}
function viewHabits() {
  const hs = S.habits.filter(h => !h.archived);
  if (!S.habits.length) return `<div class="empty">${ic('habit')}${tr('No habits yet.')}<br><br><button class="btn pri" data-act="habit-new">${ic('plus', 's')} ${tr('Create habit')}</button></div>`;
  const mon = mondayOf(today()), t0 = today();
  const days = [...Array(7)].map((_, i) => addDays(mon, i));
  let h = `<div class="hweek head"><span></span>${days.map(d => `<span class="${d === t0 ? 'today' : ''}">${WD[pd(d).getDay()]}<br>${pd(d).getDate()}</span>`).join('')}<span style="text-align:right">${tr('Streak')}</span></div>`;
  for (const x of hs) {
    const col = x.color || HCOLORS[0];
    h += `<div class="hweek" style="--hc:${col}"><div class="hname" data-act="habit-open" data-id="${x.id}"><span class="sw" style="background:${col}"></span><div style="min-width:0"><b>${esc(x.name)}</b><small>${x.per_week ? tr('{0}/{1} this week', weekDone(x, mon), x.per_week) : x.goal > 1 ? tr('{0}/{1} today', x.logs[t0] || 0, x.goal) : habitScheduled(x, t0) ? ((x.logs[t0] || 0) >= 1 ? tr('done today') : tr('open today')) : tr('day off today')}</small></div></div>
      ${days.map(d => {
        const c = x.logs[d] || 0, sch = habitScheduled(x, d);
        const cls = [d > t0 ? 'future' : '', !sch ? 'off' : '', c >= x.goal ? 'full' : c ? 'part' : '', d === t0 ? 'today' : ''].join(' ');
        const note = (x.notes || {})[d];
        return `<button class="hc ${cls} ${note ? 'noted' : ''}" data-act="habit-tick" data-id="${x.id}" data-day="${d}" ${note ? `title="${esc(note)}"` : ''}>${c >= x.goal ? ic('check') : c ? c : ''}</button>`;
      }).join('')}
      <div class="hstreak"><b>${habitStreak(x)}</b>${streakUnit(x)}</div></div>`;
  }
  const arch = S.habits.filter(x => x.archived);
  if (arch.length) h += `<div class="ghead" style="margin-top:16px">${tr('Archived')}</div>` + arch.map(x => `<div class="srow" data-act="habit-open" data-id="${x.id}"><span class="sw" style="background:${x.color || HCOLORS[0]}"></span><span class="n muted">${esc(x.name)}</span></div>`).join('');
  return h;
}
function habitModal(id) {
  const x = id ? S.habits.find(h => h.id === id) : {name: '', goal: 1, days: '1234567', per_week: 0, color: HCOLORS[1], remind_at: '', logs: {}, notes: {}, created_at: new Date().toISOString()};
  x.notes = x.notes || {};
  let selDay = null, noteTimer;
  const st = id ? habitStats(x) : null;
  let month = S.habitMonth || today().slice(0, 7);
  const heat = () => {
    const [y, m] = month.split('-').map(Number);
    const first = ds(new Date(y, m - 1, 1)), lead = (pd(first).getDay() + 6) % 7;
    const n = new Date(y, m, 0).getDate();
    let g = WD_MO().map(w => `<div class="wd">${w}</div>`).join('') + '<div class="d blank"></div>'.repeat(lead);
    for (let i = 1; i <= n; i++) {
      const d = `${month}-${pad(i)}`, c = x.logs[d] || 0;
      g += `<div class="d ${c >= x.goal ? 'full' : c ? 'part' : ''} ${d === today() ? 'today' : ''} ${x.notes[d] ? 'noted' : ''} ${d === selDay ? 'selday' : ''} ${d > today() ? 'fut' : ''}" data-hday="${d}">${i}</div>`;
    }
    const c = selDay ? (x.logs[selDay] || 0) : 0;
    const panel = selDay ? `<div class="hday"><div class="hdh"><b>${dayLabel(selDay, true)}</b><span class="muted">${fmtDate(selDay)}</span><span class="spacer"></span>
      ${x.goal > 1 ? `<button class="iconbtn" data-hcnt="-1">−</button><span class="mono">${c}/${x.goal}</span><button class="iconbtn" data-hcnt="1">+</button>` : `<button class="btn sm ${c >= 1 ? 'pri' : ''}" data-hcnt="toggle">${c >= 1 ? ic('check', 's') + ' ' + tr('done') : tr('not done')}</button>`}</div>
      <textarea id="h-note" rows="2" placeholder="${tr('Note for this day')}">${esc(x.notes[selDay] || '')}</textarea></div>` : `<div class="muted hdhint">${tr('Tap a day: check it off or write a note')}</div>`;
    return `<div class="mcal"><div class="mh"><button class="iconbtn" data-hm="-1">${ic('left')}</button>${MON[m - 1]} ${y}<button class="iconbtn" data-hm="1">${ic('right')}</button></div></div><div class="heat" style="--hc:${x.color || HCOLORS[0]}">${g}</div>${panel}`;
  };
  const md = modal(`<h3>${id ? esc(x.name) : tr('New habit')}</h3>
    ${st ? `<div class="hstats"><div><b>${st.streak}</b><span>${tr('current streak')}</span></div><div><b>${st.best}</b><span>${tr('best streak')}</span></div><div><b>${st.total}</b><span>${tr('days total')}</span></div><div><b>${st.rate}%</b><span>${tr('last 30 days')}</span></div></div><div id="heatwrap">${heat()}</div><h4>${tr('Settings')}</h4>` : ''}
    <div class="row"><label>${tr('Name')}</label><input id="h-name" value="${esc(x.name)}" placeholder="${tr('e.g. reading, workout, water')}"></div>
    <div class="row"><label>${tr('Goal per day')}</label><input id="h-goal" type="number" min="1" max="50" value="${x.goal}"></div>
    <div class="row"><label>${tr('Frequency')}</label><div class="seg" id="h-freq"><button data-freq="days" class="${x.per_week ? '' : 'on'}">${tr('Fixed days')}</button><button data-freq="week" class="${x.per_week ? 'on' : ''}">${tr('X times a week')}</button></div></div>
    <div class="row ${x.per_week ? 'hidden' : ''}" id="h-daysrow"><label>${tr('days|label')}</label><div class="wdays" id="h-days">${WD_MO().map((w, i) => `<button class="${x.days.includes(String(i + 1)) ? 'on' : ''}" data-wd="${i + 1}">${w}</button>`).join('')}</div></div>
    <div class="row ${x.per_week ? '' : 'hidden'}" id="h-pwrow"><label>${tr('Times per week')}</label><input id="h-pw" type="number" min="1" max="7" value="${x.per_week || 3}" style="max-width:90px"><span class="muted" style="font-size:12px">${tr('on any days')}</span></div>
    <div class="row"><label>${tr('Reminder (ntfy)')}</label><input id="h-rem" type="time" value="${esc(x.remind_at)}"></div>
    <div class="row"><label>${tr('Color')}</label><div class="colors" id="h-col">${HCOLORS.map(c => `<button style="background:${c}" class="${(x.color || HCOLORS[0]) === c ? 'on' : ''}" data-c="${c}"></button>`).join('')}</div></div>
    <div class="foot">${id ? `<button class="btn danger" data-m="del">${tr('Delete')}</button><button class="btn" data-m="arch">${x.archived ? tr('Reactivate') : tr('Archive')}</button>` : ''}<span class="spacer"></span><button class="btn" data-m="close">${tr('Cancel')}</button><button class="btn pri" data-m="save">${tr('Save')}</button></div>`);
  md.addEventListener('click', async e => {
    const b = e.target.closest('button,[data-hday]'); if (!b) return;
    if (b.dataset.wd) b.classList.toggle('on');
    if (b.dataset.c) { $$('#h-col button', md).forEach(x => x.classList.remove('on')); b.classList.add('on'); }
    if (b.dataset.hm) { const [y, m] = month.split('-').map(Number); const d = new Date(y, m - 1 + +b.dataset.hm, 1); month = ds(d).slice(0, 7); S.habitMonth = month; $('#heatwrap', md).innerHTML = heat(); }
    if (b.dataset.freq) {
      $$('#h-freq button', md).forEach(y => y.classList.toggle('on', y === b));
      $('#h-daysrow', md).classList.toggle('hidden', b.dataset.freq === 'week');
      $('#h-pwrow', md).classList.toggle('hidden', b.dataset.freq !== 'week');
      return;
    }
    if (b.dataset.hday) {  // select the day: tick / note panel below the month
      if (b.dataset.hday > today()) return;
      selDay = selDay === b.dataset.hday ? null : b.dataset.hday;
      $('#heatwrap', md).innerHTML = heat();
      return;
    }
    if (b.dataset.hcnt && selDay) {
      const c = x.logs[selDay] || 0;
      const n = b.dataset.hcnt === 'toggle' ? (c >= 1 ? 0 : x.goal) : Math.max(0, Math.min(x.goal, c + +b.dataset.hcnt));
      if (n) x.logs[selDay] = n; else delete x.logs[selDay];
      $('#heatwrap', md).innerHTML = heat(); render();
      await api('POST', `/api/habits/${x.id}/log`, {day: selDay, count: n});
      return;
    }
    const act = b.dataset.m;
    if (act === 'close') md.remove();
    if (act === 'save') {
      const days = $$('#h-days button.on', md).map(b => b.dataset.wd).join('') || '1234567';
      const perWeek = $('#h-freq button.on', md)?.dataset.freq === 'week' ? Math.max(1, Math.min(7, +$('#h-pw', md).value || 1)) : 0;
      const body = {name: $('#h-name', md).value.trim(), goal: Math.max(1, +$('#h-goal', md).value || 1), days, per_week: perWeek, remind_at: $('#h-rem', md).value, color: $('#h-col button.on', md)?.dataset.c || HCOLORS[0]};
      if (!body.name) return $('#h-name', md).focus();
      if (id) await api('PATCH', '/api/habits/' + id, body); else await api('POST', '/api/habits', body);
      md.remove(); await load(); render();
    }
    if (act === 'arch') { await api('PATCH', '/api/habits/' + id, {archived: x.archived ? 0 : 1}); md.remove(); await load(); render(); }
    if (act === 'del' && confirm(tr('Delete “{0}” including its history?', x.name))) { await api('DELETE', '/api/habits/' + id); md.remove(); await load(); render(); }
  });
  md.addEventListener('input', e => {
    if (e.target.id !== 'h-note' || !selDay || !id) return;
    const day = selDay, v = e.target.value;
    if (v.trim()) x.notes[day] = v.trim(); else delete x.notes[day];
    clearTimeout(noteTimer);
    noteTimer = setTimeout(async () => { await api('POST', `/api/habits/${x.id}/log`, {day, note: v}); render(); }, 600);
  });
  if (!id) setTimeout(() => $('#h-name', md).focus(), 50);
}

// ------------------------------------------------------------------ pomodoro
let pomoKind = LS.get('pomoKind', 'focus'), pomoTask = LS.get('pomoTask', ''), pomoCount = 0, pomoStatsCache = null;
const fmtMS = s => { s = Math.max(0, Math.round(s)); return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; };
function pomoElapsed(p) {
  const end = p.end ? new Date(p.end) : p.paused_at ? new Date(p.paused_at) : new Date();
  return Math.max(0, (end - new Date(p.start)) / 1000 - p.paused_s);
}
const pomoRemaining = () => S.pomo ? S.pomo.minutes * 60 - pomoElapsed(S.pomo) : pomoMinutes(pomoKind) * 60;
const fmtT = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600); return h ? `${h}:${pad(Math.floor(s % 3600 / 60))}:${pad(s % 60)}` : fmtMS(s); };
const isSW = () => S.pomo ? S.pomo.kind === 'stopwatch' : pomoKind === 'stopwatch';
const pomoDisplay = () => S.pomo?.kind === 'stopwatch' ? fmtT(pomoElapsed(S.pomo)) : fmtMS(pomoRemaining());
const pomoMinutes = k => +(S.settings['pomo_' + ({focus: 'focus', short: 'short', long: 'long'}[k])] || 25);
function viewPomo() {
  const p = S.pomo, kind = p ? (p.kind === 'focus' || p.kind === 'stopwatch' ? p.kind : pomoKind) : pomoKind;
  const sw = kind === 'stopwatch', el = p ? pomoElapsed(p) : 0;
  const total = sw ? 3600 : p ? p.minutes * 60 : pomoMinutes(kind) * 60;
  const rem = sw ? total - (el % 3600) : pomoRemaining();
  const C = 2 * Math.PI * 46;
  const opts = sortTasks(openTasks().filter(t => !t.parent_id)).map(t => `<option value="${t.id}" ${String(p ? p.task_id : pomoTask) === String(t.id) ? 'selected' : ''}>${esc(t.title)}</option>`).join('');
  const tt = p && p.task_id && S.tasks.get(p.task_id);
  return `<div class="pomo">
    <div class="seg">${[['focus', N_('Focus')], ['short', N_('Short break')], ['long', N_('Long break')], ['stopwatch', N_('Stopwatch')]].map(([k, n]) => `<button class="${kind === k ? 'on' : ''}" data-act="pomo-kind" data-k="${k}" ${p ? 'disabled' : ''}>${tr(n)}</button>`).join('')}</div>
    <div class="ring"><svg viewBox="0 0 100 100"><circle class="bgc" cx="50" cy="50" r="46"/><circle class="fgc" id="pring" cx="50" cy="50" r="46" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - rem / total)}"/></svg>
      <div class="t"><b id="ptime">${sw ? fmtT(el) : fmtMS(rem)}</b><span>${p ? (p.paused_at ? tr('paused') : tt ? esc(tt.title) : p.kind === 'focus' ? tr('Focus') : sw ? tr('stopwatch running') : tr('Break')) : sw ? tr('Stopwatch') : kind === 'focus' ? tr('ready') : tr('Break')}</span></div></div>
    <div class="ctrls">${!p ? `<button class="btn pri" data-act="pomo-start">${ic('play', 's')} ${tr('Start')}</button>`
      : `${p.paused_at ? `<button class="btn pri" data-act="pomo-resume">${ic('play', 's')} ${tr('Resume')}</button>` : `<button class="btn" data-act="pomo-pause">${ic('pause', 's')} ${tr('Pause')}</button>`}<button class="btn" data-act="pomo-stop">${ic('stop', 's')} ${tr('Stop')}</button>`}</div>
    ${kind === 'focus' || sw ? `<select id="pomo-task" ${p ? 'disabled' : ''}><option value="">${tr('No task')}</option>${opts}</select>` : ''}
    <div id="pstats">${pomoStatsCache ? pomoStatsHtml(pomoStatsCache) : ''}</div>
  </div>`;
}
function pomoStatsHtml(j) {
  const days = [...Array(7)].map((_, i) => addDays(today(), i - 6));
  const max = Math.max(1, ...days.map(d => j.per_day[d] || 0));
  return `<div class="pstats"><div><b>${j.today.count}</b><span>${tr('Pomos today')}</span></div><div><b>${fmtH(j.today.minutes)}</b><span>${tr('Focus time today')}</span></div><div><b>${j.week.count}</b><span>${tr('Pomos 7 days')}</span></div><div><b>${fmtH(j.week.minutes)}</b><span>${tr('Focus 7 days')}</span></div></div>
    <div class="bars">${days.map(d => `<div><i style="height:${Math.round(100 * (j.per_day[d] || 0) / max)}%" title="${j.per_day[d] || 0} min"></i><span>${WD[pd(d).getDay()]}</span></div>`).join('')}</div>
    ${j.per_task.length ? `<div class="ptasks"><div class="muted" style="border:0;font-size:12px">${tr('Focus by task (30 days)')}</div>${j.per_task.map(([n, m]) => `<div><span>${esc(n)}</span><span class="muted">${fmtH(m)}</span></div>`).join('')}</div>` : ''}`;
}
const fmtH = m => m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
async function loadPomoStats() { try { pomoStatsCache = await api('GET', '/api/pomo/stats'); const el = $('#pstats'); if (el) el.innerHTML = pomoStatsHtml(pomoStatsCache); } catch { /* ignore */ } }
let finishing = false;
setInterval(async () => {
  if (!S.pomo) return;
  const C = 2 * Math.PI * 46;
  if (S.pomo.kind === 'stopwatch') {  // counts up, no end
    const el = pomoElapsed(S.pomo);
    const t = $('#ptime'); if (t) t.textContent = fmtT(el);
    const r = $('#pring'); if (r) r.setAttribute('stroke-dashoffset', C * ((el % 3600) / 3600));
    const mini = $('[data-pomo-mini]'); if (mini) mini.textContent = fmtT(el);
    document.title = S.pomo.paused_at ? APP_NAME : `${fmtT(el)} · ${APP_NAME}`;
    return;
  }
  const rem = pomoRemaining();
  const t = $('#ptime'); if (t) t.textContent = fmtMS(rem);
  const r = $('#pring'); if (r) r.setAttribute('stroke-dashoffset', C * (1 - rem / (S.pomo.minutes * 60)));
  const mini = $('[data-pomo-mini]'); if (mini) mini.textContent = fmtMS(rem);
  document.title = S.pomo.paused_at ? APP_NAME : `${fmtMS(rem)} · ${APP_NAME}`;
  if (rem <= 0 && !S.pomo.paused_at && !finishing) {
    finishing = true;
    const wasFocus = S.pomo.kind === 'focus';
    try {
      const j = await api('POST', `/api/pomo/${S.pomo.id}/finish`);
      S.pomo = j.pomo; S.pomoToday = j.today;
      beep();
      if (wasFocus) { pomoCount++; pomoKind = pomoCount % (+S.settings.pomo_long_every || 4) === 0 ? 'long' : 'short'; }
      else pomoKind = 'focus';
      LS.set('pomoKind', pomoKind);
      document.title = APP_NAME;
      toast(wasFocus ? tr('Focus done. Time for a break.') : tr('Break is over.'));
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) new Notification(wasFocus ? tr('Focus done') : tr('Break is over'));
      render();
    } finally { finishing = false; }
  }
}, 1000);
function beep() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    [0, .25, .5].forEach(off => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(.2, ac.currentTime + off); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + off + .2); o.connect(g); g.connect(ac.destination); o.start(ac.currentTime + off); o.stop(ac.currentTime + off + .2); });
  } catch { /* no audio */ }
}
async function pomoStart(taskId) {
  const kind = taskId ? (pomoKind === 'stopwatch' ? 'stopwatch' : 'focus') : pomoKind;
  const tid = taskId || (kind === 'focus' || kind === 'stopwatch' ? ($('#pomo-task')?.value || '') : '');
  if (kind === 'focus' || kind === 'stopwatch') { pomoTask = tid; LS.set('pomoTask', tid); }
  S.pomo = await api('POST', '/api/pomo/start', {kind: kind === 'focus' || kind === 'stopwatch' ? kind : 'break', minutes: kind === 'stopwatch' ? 0 : pomoMinutes(kind), task_id: tid ? +tid : null});
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  render();
}

// ------------------------------------------------------------------ detail panel
let saveTimers = {};
function openDetail(id) {
  S.sel = id; S.editContent = false;
  const d = $('#detail');
  d.classList.remove('hidden');
  $('#app').classList.add('detail-open');
  renderDetail();
  requestAnimationFrame(() => d.classList.add('open'));
  $$('.trow.sel').forEach(r => r.classList.remove('sel'));
  $$(`.trow[data-id="${id}"]`).forEach(r => r.classList.add('sel'));
  if (isMobile()) history.pushState({detail: id}, '', location.hash);
}
function closeDetail(fromPop) {
  flushSaves();
  S.sel = null;
  const d = $('#detail');
  d.classList.remove('open');
  $('#app').classList.remove('detail-open');
  $$('.trow.sel').forEach(r => r.classList.remove('sel'));
  setTimeout(() => { if (!S.sel) d.classList.add('hidden'); }, isMobile() ? 230 : 0);
  if (isMobile() && !fromPop && history.state && history.state.detail) history.back();
}
window.addEventListener('popstate', () => { if (S.sel && isMobile()) closeDetail(true); });
function taskById(id) { return S.tasks.get(id) || (S.extra || []).find(t => t.id === id); }
function renderDetail() {
  const t = taskById(S.sel); if (!t) return;
  const l = listById(t.list_id);
  const kids = children(t.id);
  const parent = t.parent_id && S.tasks.get(t.parent_id);
  const secs = S.sections.filter(s => s.list_id === t.list_id);
  const dueTxt = t.due ? (t.start && t.start < t.due ? dayLabel(t.start) + ' – ' : '') + dayLabel(t.due) + (t.due_time ? ', ' + t.due_time : '') : tr('Date');
  const mdMode = t.content && !S.editContent;
  $('#detail').innerHTML = `
    <div class="dtop">
      <button class="iconbtn back" data-act="close-detail">${ic('back')}</button>
      <button class="chk ${t.status === 2 ? 'on' : t.status === -1 ? 'wont' : 'p' + t.priority}" data-act="toggle" data-id="${t.id}" aria-label="${tr('done')}">${t.status === 2 ? ic('check') : ''}</button>
      <button class="dchip ${t.due ? 'set ' + dueClass(t) : ''}" data-act="date" data-id="${t.id}">${ic('cal', 's')}${dueTxt}${t.repeat ? ' ' + ic('repeat', 's') : ''}${t.reminders && t.due ? ' ' + ic('bell', 's') : ''}</button>
      <span class="spacer"></span>
      <button class="iconbtn ${t.pinned ? 'on' : ''}" data-act="pin" data-id="${t.id}" title="${t.pinned ? tr('Unpin') : tr('Pin')}">${ic('pin')}</button>
      <button class="iconbtn ${t.priority ? 'flag-' + t.priority : ''}" data-act="prio" data-id="${t.id}" title="${tr('Priority')}">${ic('flag')}</button>
      <button class="iconbtn" data-act="task-menu" data-id="${t.id}" title="${tr('More')}">${ic('dots')}</button>
      <button class="iconbtn" data-act="close-detail" title="${tr('Close (Esc)')}" style="${isMobile() ? 'display:none' : ''}">${ic('x')}</button>
    </div>
    <div class="dbody">
      ${parent ? `<button class="dchip" data-act="open-id" data-id="${parent.id}" style="align-self:flex-start;padding-left:0">${ic('back', 's')}${esc(parent.title)}</button>` : ''}
      <div class="dtitle"><textarea id="d-title" rows="1" placeholder="${tr('Title')}">${esc(t.title)}</textarea></div>
      <div class="md ${mdMode ? '' : 'hidden'}" id="d-md" title="${tr('Click to edit')}">${mdMode ? renderMd(t.content) : ''}</div>
      <textarea id="d-content" class="dcontent ${mdMode ? 'hidden' : ''}" placeholder="${tr('Description (Markdown: **bold**, - list, - [ ] checklist, links)')}">${esc(t.content)}</textarea>
      <div class="dsec"><h5>${tr('Attachments')}</h5><div class="atts">${(t.attachments || []).map(attHtml).join('')}
        ${t.id > 0 ? `<label class="attadd" title="${tr('Images, PDFs, documents')}">${ic('clip', 's')}<span>${tr('Add file')}</span><input type="file" id="d-file" multiple hidden></label>` : ''}</div>
        ${isMobile() ? '' : `<div class="muted atthint">${tr('or drop files here / paste an image with Ctrl+V')}</div>`}</div>
      ${plOn() ? `<div class="dsec"><h5>Paperless</h5><div class="plinks">${(t.paperless || []).map(plHtml).join('')}</div>
        ${t.id > 0 ? `<button class="attadd" data-act="pl-search">${ic('archive', 's')}<span>${tr('Link document')}</span></button>` : ''}</div>` : ''}
      <div class="dsec"><h5>${tr('Subtasks')}</h5><div class="subs">${kids.map(k => taskRow(k, {compact: true, subRow: true})).join('')}
        ${depthOf(t) < 2 ? `<div class="subadd">${ic('plus', 's')}<input id="d-sub" placeholder="${tr('Add subtask')}" enterkeyhint="done"></div>` : `<div class="muted" style="font-size:12px;padding:4px">${tr('At most 3 levels')}</div>`}</div></div>
      <div class="dsec"><h5>${tr('Tags')}</h5><div class="tagedit">${t.tags.map(g => `<span class="tagpill">#${esc(g)}<button data-act="tag-rm" data-tag="${esc(g)}">${ic('x', 's')}</button></span>`).join('')}<input id="d-tag" placeholder="${tr('+ Tag')}" list="taglist" enterkeyhint="done"><datalist id="taglist">${[...new Set([...S.tasks.values()].flatMap(x => x.tags))].map(g => `<option value="${esc(g)}">`).join('')}</datalist></div></div>
      <div class="dsec fields">
        <label>${tr('List')}</label><select id="d-list">${S.lists.filter(x => !x.archived || x.id === t.list_id).map(x => `<option value="${x.id}" ${x.id === t.list_id ? 'selected' : ''}>${esc(lname(x))}</option>`).join('')}</select>
        ${secs.length ? `<label>${tr('Section')}</label><select id="d-sec"><option value="">${tr('Unassigned')}</option>${secs.map(s => `<option value="${s.id}" ${s.id === t.section_id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>` : ''}
      </div>
    </div>
    <div class="dfoot">${t.status === 2 && t.completed_at ? tr('Completed {0}', new Date(t.completed_at).toLocaleString(LOCALE(), {dateStyle: 'medium', timeStyle: 'short'})) : tr('Created {0}', new Date(t.created_at).toLocaleString(LOCALE(), {dateStyle: 'medium', timeStyle: 'short'}))}
      <span class="spacer"></span>
      ${t.status === 0 ? `<button class="iconbtn" data-act="pomo-task" data-id="${t.id}" title="${tr('Start focus')}">${ic('timer', 's')}</button>` : ''}
      <button class="iconbtn danger" data-act="delete" data-id="${t.id}" title="${tr('Delete')}">${ic('trash', 's')}</button></div>`;
  autosize($('#d-title')); autosize($('#d-content'));
}
// ------------------------------------------------------------------ attachments
const attUrl = (a, dl) => `/api/attachments/${a.id}${dl ? '?dl=1' : ''}`;
const fmtSize = b => b < 1024 ? b + ' B' : b < 1048576 ? Math.round(b / 1024) + ' KB' : (b / 1048576).toFixed(1).replace('.', ',') + ' MB';
const isImg = a => /^image\/(png|jpeg|gif|webp|avif|bmp)$/.test(a.mime);
function attHtml(a) {
  const t = taskById(S.sel), sending = (t?.paperless || []).some(p => p.status === 'pending' && p.att_id === a.id);
  const del = `<button class="attdel" data-act="att-del" data-att="${a.id}" title="${tr('Remove')}">${ic('x', 's')}</button>` +
    (plOn() ? `<button class="attpl ${sending ? 'busy' : ''}" data-act="att-pl" data-att="${a.id}" title="${sending ? tr('being sent to Paperless') : tr('File in Paperless')}">${ic('archive', 's')}</button>` : '');
  if (isImg(a)) return `<div class="att img"><a href="${attUrl(a)}" data-act="att-view" data-att="${a.id}" title="${esc(a.name)}"><img src="${attUrl(a)}" loading="lazy" alt="${esc(a.name)}"></a>${del}</div>`;
  const pdf = a.mime === 'application/pdf';
  return `<div class="att file"><a href="${attUrl(a, !pdf)}" ${pdf ? 'target="_blank" rel="noopener"' : 'download'} title="${esc(a.name)}">${ic(pdf ? 'pdf' : 'file')}<span class="an">${esc(a.name)}</span><span class="as">${fmtSize(a.size)}</span></a>${del}</div>`;
}
function plHtml(p) {
  const x = `<button class="attdel" data-act="pl-del" data-pl="${p.id}" title="${tr('Remove link')}">${ic('x', 's')}</button>`;
  if (p.status === 'pending') return `<div class="plink pending"><span class="spin"></span><div class="pt"><b>${esc(p.title)}</b><span>${tr('Paperless is processing the document…')}</span></div></div>`;
  if (p.status === 'error') return `<div class="plink err">${ic('archive')}<div class="pt"><b>${esc(p.title)}</b><span>${esc(p.message || tr('Error'))}</span></div>${x}</div>`;
  const sub = [p.correspondent, p.created ? fmtDate(p.created) : '', p.message].filter(Boolean).join(' · ');
  return `<div class="plink"><a href="${esc(S.paperless.url)}/documents/${p.doc_id}/details" target="_blank" rel="noopener"><img src="/api/paperless/thumb/${p.doc_id}" loading="lazy" alt=""><div class="pt"><b>${esc(p.title)}</b><span>${esc(sub)}</span></div></a>${x}</div>`;
}
function plSearchModal(taskId) {
  const md = modal(`<h3>${tr('Link Paperless document')}</h3>
    <input id="pl-q" placeholder="${tr('Search: title, content, correspondent')}" autocomplete="off" enterkeyhint="search" style="width:100%">
    <div class="muted" id="pl-info" style="font-size:12px;margin:8px 2px">${tr('Recently added')}</div>
    <div class="plres" id="pl-res"><div class="muted" style="padding:12px">${tr('Loading…')}</div></div>
    <div class="foot"><a class="btn" href="${esc(S.paperless.url)}" target="_blank" rel="noopener">${ic('archive', 's')} ${tr('Open Paperless')}</a><span class="spacer"></span><button class="btn" data-m="close">${tr('Close')}</button></div>`);
  md.classList.add('plmodal');
  const linked = new Set((taskById(taskId)?.paperless || []).map(p => p.doc_id));
  let timer, seq = 0;
  const run = async q => {
    const my = ++seq;
    try {
      const j = await api('GET', '/api/paperless/search?q=' + encodeURIComponent(q));
      if (my !== seq) return;
      $('#pl-info', md).textContent = q ? trn('{0} result', '{0} results', j.count) : tr('Recently added');
      $('#pl-res', md).innerHTML = j.items.map(d => `<button class="plitem ${linked.has(d.id) ? 'on' : ''}" data-doc="${d.id}"><img src="/api/paperless/thumb/${d.id}" loading="lazy" alt=""><div class="pt"><b>${esc(d.title)}</b><span>${esc([d.correspondent, d.created ? fmtDate(d.created) : '', d.pages ? trn('{0} page', '{0} pages', d.pages) : ''].filter(Boolean).join(' · '))}</span>${d.snippet ? `<small>${esc(d.snippet)}</small>` : ''}</div>${linked.has(d.id) ? ic('check', 's') : ''}</button>`).join('') || `<div class="muted" style="padding:12px">${tr('Nothing found.')}</div>`;
    } catch (e) { $('#pl-res', md).innerHTML = `<div class="muted" style="padding:12px">${esc(e.message)}</div>`; }
  };
  run('');
  $('#pl-q', md).addEventListener('input', e => { clearTimeout(timer); timer = setTimeout(() => run(e.target.value.trim()), 250); });
  md.addEventListener('click', async e => {
    if (e.target.closest('[data-m="close"]')) { md.remove(); return; }
    const b = e.target.closest('[data-doc]'); if (!b) return;
    if (b.classList.contains('on')) { toast(tr('Already linked')); return; }
    const t = await api('POST', `/api/tasks/${taskId}/paperless`, {doc_id: +b.dataset.doc});
    putTask(t); md.remove(); render(); if (S.sel === taskId) renderDetail(); toast(tr('Linked'));
  });
  if (!isMobile()) setTimeout(() => $('#pl-q', md).focus(), 50);
}
async function uploadFiles(taskId, files) {
  files = [...files].filter(Boolean);
  if (!files.length) return;
  if (taskId < 0) { toast(tr('Task is still syncing, try again in a moment')); return; }
  const max = 50 * 1024 * 1024, big = files.find(f => f.size > max);
  if (big) { toast(tr('{0} is larger than 50 MB', big.name)); return; }
  const fd = new FormData();
  files.forEach((f, i) => fd.append('file', f, f.name || `bild-${Date.now()}-${i}.png`));
  toast(files.length === 1 ? tr('Uploading…') : tr('Uploading {0} files…', files.length));
  try {
    const t = await api('POST', `/api/tasks/${taskId}/attachments`, fd);
    putTask(t); render(); if (S.sel === taskId) renderDetail();
    toast(files.length === 1 ? tr('Attached') : tr('{0} files attached', files.length));
  } catch (e) { /* api() already showed the error / offline notice */ }
}
function attLightbox(id) {
  const t = taskById(S.sel), imgs = (t?.attachments || []).filter(isImg);
  let i = Math.max(0, imgs.findIndex(a => a.id === id));
  const m = document.createElement('div');
  m.className = 'lightbox';
  const draw = () => { const a = imgs[i]; m.innerHTML = `<img src="${attUrl(a)}" alt="${esc(a.name)}"><div class="lbbar"><span>${esc(a.name)} · ${fmtSize(a.size)}</span><span class="spacer"></span>${imgs.length > 1 ? `<button data-lb="-1">${ic('left')}</button><button data-lb="1">${ic('right')}</button>` : ''}<a href="${attUrl(a, true)}" download title="${tr('Download')}">${ic('download')}</a><button data-lb="x" title="${tr('Close')}">${ic('x')}</button></div>`; };
  draw();
  m.addEventListener('click', e => {
    const b = e.target.closest('[data-lb]');
    if (b && b.dataset.lb !== 'x') { i = (i + +b.dataset.lb + imgs.length) % imgs.length; draw(); return; }
    if (b || e.target === m || e.target.tagName === 'IMG') m.remove();
  });
  document.body.appendChild(m);
}
function depthOf(t) { let n = 0, p = t; while (p && p.parent_id && n < 5) { p = S.tasks.get(p.parent_id); n++; } return n; }
// small, safe markdown: everything is escaped first, only whitelisted inline / block syntax is turned into html
function mdInline(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<i>$2</i>')
    .replace(/~~([^~]+)~~/g, '<s>$1</s>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
}
function renderMd(src) {
  const lines = String(src || '').split('\n');
  let h = '', list = null, para = [];
  const flushPara = () => { if (para.length) { h += `<p>${para.join('<br>')}</p>`; para = []; } };
  const closeList = () => { if (list) { h += `</${list}>`; list = null; } };
  const openList = tag => { if (list !== tag) { closeList(); h += `<${tag}>`; list = tag; } };
  lines.forEach((ln, i) => {
    let m;
    if ((m = ln.match(/^(#{1,3})\s+(.*)/))) { flushPara(); closeList(); h += `<h${m[1].length + 3}>${mdInline(m[2])}</h${m[1].length + 3}>`; }
    else if ((m = ln.match(/^\s*[-*]\s+\[( |x|X)\]\s*(.*)/))) { flushPara(); openList('ul'); h += `<li class="cb ${m[1] !== ' ' ? 'on' : ''}"><input type="checkbox" data-mdline="${i}" ${m[1] !== ' ' ? 'checked' : ''}><span>${mdInline(m[2])}</span></li>`; }
    else if ((m = ln.match(/^\s*[-*•]\s+(.*)/))) { flushPara(); openList('ul'); h += `<li>${mdInline(m[1])}</li>`; }
    else if ((m = ln.match(/^\s*\d+[.)]\s+(.*)/))) { flushPara(); openList('ol'); h += `<li>${mdInline(m[1])}</li>`; }
    else if (!ln.trim()) { flushPara(); closeList(); }
    else { closeList(); para.push(mdInline(ln)); }
  });
  flushPara(); closeList();
  return h;
}
function autosize(el) { if (!el) return; el.style.height = 'auto'; if (el.scrollHeight) el.style.height = el.scrollHeight + 'px'; }
function queueSave(id, field, value) {
  const key = id + ':' + field;
  const old = saveTimers[key], t = taskById(id);
  clearTimeout(old?.t);
  const base = old ? old.base : (t ? t[field] : undefined);  // value before this round of typing
  saveTimers[key] = {t: setTimeout(() => doSave(key), 600), id, field, value, base};
}
async function doSave(key) {
  const s = saveTimers[key]; if (!s) return;
  delete saveTimers[key];
  if (s.field === 'title' && !s.value.trim()) return;
  const body = {[s.field]: s.value};
  if (s.base !== undefined && s.id > 0) body._prev = {[s.field]: s.base};
  const t = await api('PATCH', '/api/tasks/' + s.id, body);
  if (t.conflicts?.length) { addConflicts(s.id, t.conflicts, t.title); putTask(t); if (S.sel === s.id) renderDetail(); return; }
  putTask(t);
  const row = $$(`#view .trow[data-id="${s.id}"] .ttl`); row.forEach(r => { r.textContent = t.title; });
}
function flushSaves() { Object.keys(saveTimers).forEach(k => { clearTimeout(saveTimers[k].t); doSave(k); }); }

async function patchTask(id, body) {
  const t = await api('PATCH', '/api/tasks/' + id, body);
  putTask(t); render(); if (S.sel === id) renderDetail();
  return t;
}
async function toggleTask(id) {
  const t = taskById(id); if (!t) return;
  if (t.status !== 0) {
    putTask(await api('POST', `/api/tasks/${id}/reopen`));
    if (S.extra) S.extra = S.extra.filter(x => x.id !== id);
    render(); return;
  }
  // optimistic: fade the row, then sync
  $$(`.trow[data-id="${id}"] .chk`).forEach(c => { c.classList.add('on'); c.innerHTML = ic('check'); });
  const j = await api('POST', `/api/tasks/${id}/complete`, t.repeat && t.due ? {expect_due: t.due} : undefined);
  await load();
  render();
  if (j.skipped) toast(tr('Already checked off (other device), not advanced twice'));
  else if (j.next_due) toast(tr('Next occurrence: {0}', dayLabel(j.next_due)));
  else toast(tr('Completed'), async () => { await api('POST', `/api/tasks/${id}/reopen`); await load(); render(); });
}
async function deleteTask(id) {
  const t = taskById(id);
  await api('DELETE', '/api/tasks/' + id);
  if (S.sel === id) closeDetail();
  await load(); render();
  toast(tr('“{0}” deleted', t ? t.title.slice(0, 30) : ''), async () => { await api('POST', `/api/tasks/${id}/restore`); await load(); render(); });
}
async function createTask(body) {
  const t = await api('POST', '/api/tasks', body);
  putTask(t); render();
  requestAnimationFrame(() => { const r = $(`#view .trow[data-id="${t.id}"]`); if (r) { r.classList.add('flash'); r.scrollIntoView({block: 'nearest'}); } });
  return t;
}

// ------------------------------------------------------------------ popovers
function closePop() { $('#pop').classList.add('hidden'); $('#pop').classList.remove('sheet'); $('#scrim').classList.add('hidden'); $('#scrim').classList.remove('clear'); popOnClose && popOnClose(); popOnClose = null; }
let popOnClose = null;
function openPop(anchor, html, onClose) {
  const p = $('#pop');
  p.innerHTML = html; p.classList.remove('hidden');
  $('#scrim').classList.remove('hidden');
  popOnClose = onClose || null;
  if (isMobile()) { p.classList.add('sheet'); return p; }
  $('#scrim').classList.add('clear');
  const r = anchor.getBoundingClientRect();
  const w = p.offsetWidth, h = p.offsetHeight;
  let x = Math.min(r.left, innerWidth - w - 12), y = r.bottom + 6;
  if (y + h > innerHeight - 12) y = Math.max(12, r.top - h - 6);
  p.style.left = Math.max(12, x) + 'px'; p.style.top = y + 'px';
  return p;
}
function menu(anchor, items) {
  const p = openPop(anchor, `<div class="menu-list">${items.map((it, i) => it === '-' ? '<hr>' : `<button data-i="${i}" class="${it.on ? 'on' : ''} ${it.cls || ''}">${it.icon ? ic(it.icon, 's') : ''}${esc(it.label)}</button>`).join('')}</div>`);
  p.onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; const it = items[+b.dataset.i]; closePop(); it.fn(); };
}
function prioMenu(anchor, id) {
  const t = taskById(id);
  menu(anchor, [[5, N_('High')], [3, N_('Medium')], [1, N_('Low')], [0, N_('None')]].map(([p, n]) => ({label: tr(n), icon: 'flag', on: t.priority === p, cls: p ? 'flag-' + p : '', fn: () => patchTask(id, {priority: p})})));
}
function datePop(anchor, id) {
  const t = taskById(id);
  const st = {due: t.due, due_time: t.due_time, reminders: t.reminders, repeat: t.repeat, repeat_from: t.repeat_from, start: t.start, duration: t.duration, month: (t.due || today()).slice(0, 7)};
  const draw = () => {
    const [y, m] = st.month.split('-').map(Number);
    const start = mondayOf(`${st.month}-01`);
    let g = WD_MO().map(w => `<div class="wd">${w}</div>`).join('');
    for (let i = 0; i < 42; i++) { const d = addDays(start, i); if (i === 35 && pd(d).getMonth() !== m - 1) break; g += `<button class="d ${pd(d).getMonth() !== m - 1 ? 'out' : ''} ${d === today() ? 'today' : ''} ${d === st.due ? 'sel' : ''}" data-d="${d}">${pd(d).getDate()}</button>`; }
    const rems = new Set((st.reminders || '').split(',').filter(Boolean));
    const wd = st.due ? RR_WD[pd(st.due).getDay()] : 'MO', md = st.due ? pd(st.due).getDate() : 1;
    const presets = [['', tr('None')], ['FREQ=DAILY', tr('Daily')], ['FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', tr('Weekdays')], [`FREQ=WEEKLY;BYDAY=${wd}`, tr('Weekly ({0})', WD[RR_WD.indexOf(wd)])], [`FREQ=WEEKLY;INTERVAL=2;BYDAY=${wd}`, tr('Every 2 weeks ({0})', WD[RR_WD.indexOf(wd)])], [`FREQ=MONTHLY;BYMONTHDAY=${md}`, tr('Monthly (on day {0})', md)], ['FREQ=YEARLY', tr('Yearly')]];
    const cur = rrBase(st.repeat), end = rrEnd(st.repeat);
    const custom = cur && !presets.some(p => p[0] === cur);
    return `<div class="quick">
        <button data-q="0">${ic('sun')}${tr('Today')}</button><button data-q="1">${ic('sunrise')}${tr('Tomorrow')}</button><button data-q="w">${ic('week')}${tr('Next week')}</button><button data-q="x">${ic('ban')}${tr('No date|clear')}</button></div>
      <div class="mcal"><div class="mh"><button class="iconbtn" data-mm="-1">${ic('left')}</button>${MON[m - 1]} ${y}<button class="iconbtn" data-mm="1">${ic('right')}</button></div><div class="grid">${g}</div></div>
      <div class="prow">${ic('clock', 's')}<input type="time" id="p-time" value="${st.due_time || ''}">${st.due_time ? `<button class="iconbtn" data-q="notime" title="${tr('All day')}">${ic('x', 's')}</button>` : `<span class="muted" style="font-size:12px">${tr('all day')}</span>`}</div>
      ${st.due_time ? `<div class="prow">${ic('timer', 's')}<select id="p-dur">${[15, 30, 45, 60, 90, 120, 180, 240].map(v => `<option value="${v}" ${(st.duration || 30) === v ? 'selected' : ''}>${tr('Duration {0}', v < 60 ? v + ' min' : v / 60 + ' h')}</option>`).join('')}</select></div>` : ''}
      <div class="prow">${ic('timeline', 's')}<span class="muted" style="font-size:12px">${tr('Start|date')}</span><input type="date" id="p-start" value="${st.start || ''}" ${st.due ? `max="${st.due}"` : ''}>${st.start ? `<button class="iconbtn" data-q="nostart" title="${tr('No date range')}">${ic('x', 's')}</button>` : ''}</div>
      <div class="prow">${ic('bell', 's')}<div class="remchips">${REM_OPTS.slice(0, 7).map(([v, n]) => `<button class="${rems.has(v) ? 'on' : ''}" data-rem="${v}">${tr(n)}</button>`).join('')}</div></div>
      <div class="prow">${ic('repeat', 's')}<select id="p-rep">${presets.map(([v, n]) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${n}</option>`).join('')}${custom ? `<option value="${esc(cur)}" selected>${esc(repeatLabelBase(cur))}</option>` : ''}<option value="__custom">${tr('Custom (RRULE)…')}</option></select></div>
      ${st.repeat ? `<div class="prow" style="padding-left:22px"><span class="muted" style="font-size:12px">${tr('Ends')}</span><select id="p-end" style="max-width:130px"><option value="never" ${end.type === 'never' ? 'selected' : ''}>${tr('never')}</option><option value="count" ${end.type === 'count' ? 'selected' : ''}>${tr('after count')}</option><option value="until" ${end.type === 'until' ? 'selected' : ''}>${tr('on date')}</option></select>${end.type === 'count' ? `<input type="number" id="p-endn" min="1" max="999" value="${end.val}" style="max-width:74px"><span class="muted" style="font-size:12px">${trn('time', 'times', end.val)}</span>` : end.type === 'until' ? `<input type="date" id="p-endd" value="${end.val}">` : ''}</div>` : ''}
      ${st.repeat ? `<div class="prow" style="padding-left:22px"><label style="display:flex;gap:8px;align-items:center;font-size:13px"><input type="checkbox" id="p-from" ${st.repeat_from === 'done' ? 'checked' : ''} style="flex:none"> ${tr('repeat from completion date')}</label></div>` : ''}
      <div class="popfoot"><button class="btn" data-q="cancel">${tr('Cancel')}</button><button class="btn pri" data-q="ok">${tr('OK')}</button></div>`;
  };
  const p = openPop(anchor, draw());
  const redraw = () => { p.innerHTML = draw(); };
  p.onclick = async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.d) { st.due = b.dataset.d; redraw(); }
    if (b.dataset.mm) { const [y, m] = st.month.split('-').map(Number); st.month = ds(new Date(y, m - 1 + +b.dataset.mm, 1)).slice(0, 7); redraw(); }
    if (b.dataset.rem !== undefined) { const s = new Set((st.reminders || '').split(',').filter(Boolean)); s.has(b.dataset.rem) ? s.delete(b.dataset.rem) : s.add(b.dataset.rem); st.reminders = [...s].join(','); if (!st.due) st.due = today(); redraw(); }
    const q = b.dataset.q;
    if (q === '0' || q === '1') { st.due = addDays(today(), +q); st.month = st.due.slice(0, 7); redraw(); }
    if (q === 'w') { st.due = nextWeekday(1); st.month = st.due.slice(0, 7); redraw(); }
    if (q === 'x') { st.due = null; st.due_time = null; st.reminders = ''; st.repeat = ''; st.start = null; redraw(); }
    if (q === 'nostart') { st.start = null; redraw(); }
    if (q === 'notime') { st.due_time = null; redraw(); }
    if (q === 'cancel') closePop();
    if (q === 'ok') {
      closePop();
      await patchTask(id, {due: st.due, due_time: st.due ? st.due_time : null, reminders: st.due ? st.reminders : '', repeat: st.due ? st.repeat : '', repeat_from: st.repeat_from,
        start: st.due && st.start && st.start < st.due ? st.start : null, duration: st.due_time ? (st.duration || 30) : null});
    }
  };
  p.onchange = e => {
    if (e.target.id === 'p-time') {
      st.due_time = e.target.value || null; if (!st.due) st.due = today();
      if (st.due_time && !st.reminders && S.settings.default_reminder !== '') st.reminders = S.settings.default_reminder;
      redraw();
    }
    if (e.target.id === 'p-rep') {
      let v = e.target.value;
      if (v === '__custom') { v = prompt(tr('RRULE, e.g. FREQ=WEEKLY;INTERVAL=3;BYDAY=MO,TH'), st.repeat || 'FREQ=WEEKLY;BYDAY=MO') || st.repeat; }
      st.repeat = !v ? '' : /COUNT=|UNTIL=/.test(v) ? v : rrSetEnd(v, rrEnd(st.repeat)); if (v && !st.due) st.due = today(); redraw();
    }
    if (e.target.id === 'p-end') {
      const ty = e.target.value;
      st.repeat = rrSetEnd(st.repeat, ty === 'count' ? {type: 'count', val: 5} : ty === 'until' ? {type: 'until', val: addDays(st.due || today(), 30)} : {type: 'never'});
      redraw();
    }
    if (e.target.id === 'p-endn') st.repeat = rrSetEnd(st.repeat, {type: 'count', val: +e.target.value});
    if (e.target.id === 'p-endd') st.repeat = rrSetEnd(st.repeat, {type: 'until', val: e.target.value});
    if (e.target.id === 'p-from') st.repeat_from = e.target.checked ? 'done' : 'due';
    if (e.target.id === 'p-dur') st.duration = +e.target.value;
    if (e.target.id === 'p-start') { st.start = e.target.value || null; if (st.start && !st.due) st.due = st.start; redraw(); }
  };
}
function taskMenu(anchor, id) {
  const t = taskById(id);
  const sib = siblings(t), i = sib.findIndex(x => x.id === t.id);
  menu(anchor, [
    {label: t.pinned ? tr('Unpin') : tr('Pin'), icon: 'pin', fn: () => patchTask(id, {pinned: t.pinned ? 0 : 1})},
    {label: tr('Snooze…'), icon: 'clock', fn: () => snoozeSheet(id, anchor)},
    ...(t.repeat && t.due && t.status === 0 ? [{label: tr('Skip this occurrence'), icon: 'skip', fn: async () => {
      const j = await api('POST', `/api/tasks/${id}/skip`);
      putTask(j); render(); if (S.sel === id) renderDetail();
      toast(j.next_due ? tr('Skipped, next occurrence: {0}', dayLabel(j.next_due)) : tr('Will be sent as soon as the server is reachable'));
    }}] : []),
    ...(i > 0 && depthOf(sib[i - 1]) < 2 ? [{label: tr('Indent (under “{0}”)', sib[i - 1].title.slice(0, 24)), icon: 'indent', fn: () => patchTask(id, {parent_id: sib[i - 1].id})}] : []),
    ...(t.parent_id ? [{label: tr('Outdent'), icon: 'outdent', fn: () => patchTask(id, {parent_id: S.tasks.get(t.parent_id)?.parent_id || null})}] : []),
    ...(feat('pomo') ? [{label: tr('Start focus'), icon: 'timer', fn: () => { pomoStart(id); go('pomo'); }}] : []),
    {label: t.status === -1 ? tr('Reopen') : tr("Won't do (discard)"), icon: 'ban', fn: async () => { if (t.status === -1) await api('POST', `/api/tasks/${id}/reopen`); else await api('POST', `/api/tasks/${id}/complete`, {status: -1}); await load(); render(); }},
    {label: tr('Duplicate'), icon: 'sub', fn: () => createTask({title: t.title, content: t.content, list_id: t.list_id, section_id: t.section_id, priority: t.priority, due: t.due, due_time: t.due_time, reminders: t.reminders, repeat: t.repeat, repeat_from: t.repeat_from, tags: t.tags, parent_id: t.parent_id})},
    ...(t.parent_id && S.tasks.get(t.parent_id)?.parent_id ? [{label: tr('Make it a main task'), icon: 'arrow', fn: () => patchTask(id, {parent_id: null})}] : []),
    '-',
    {label: tr('Delete'), icon: 'trash', cls: 'flag-5', fn: () => deleteTask(id)},
  ]);
}
function siblings(t) {  // same parent (or same list at top level), in custom order
  return [...S.tasks.values()].filter(x => x.status === 0 && x.parent_id === t.parent_id && (t.parent_id || x.list_id === t.list_id)).sort(bySort);
}
function snoozeSheet(id, anchor, extra = []) {
  const t = taskById(id); if (!t) return;
  const now = new Date();
  const inH = h => { const d = new Date(now.getTime() + h * 36e5); d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0); return {due: ds(d), due_time: `${pad(d.getHours())}:${pad(d.getMinutes())}`}; };
  const go2 = async (body, label) => { await patchTask(id, body); toast(tr('Snoozed: {0}', label)); };
  menu(anchor || $('#top h1'), [
    {label: tr('In 1 hour'), icon: 'clock', fn: () => go2(inH(1), tr('in 1 h'))},
    {label: tr('In 3 hours'), icon: 'clock', fn: () => go2(inH(3), tr('in 3 h'))},
    ...(now.getHours() < 18 ? [{label: tr('Tonight (7 pm)'), icon: 'sun', fn: () => go2({due: today(), due_time: '19:00'}, tr('today 7 pm'))}] : []),
    {label: tr('Tomorrow'), icon: 'sunrise', fn: () => go2({due: addDays(today(), 1), due_time: t.due_time}, tr('tomorrow'))},
    {label: tr('Tomorrow 9 am'), icon: 'sunrise', fn: () => go2({due: addDays(today(), 1), due_time: '09:00'}, tr('tomorrow 9 am'))},
    {label: tr('Next week (Mon)'), icon: 'week', fn: () => go2({due: nextWeekday(1), due_time: t.due_time}, dayLabel(nextWeekday(1)))},
    {label: tr('Pick a date…'), icon: 'cal', fn: () => datePop(anchor || $('#top h1'), id)},
    ...extra,
  ]);
}
function sortMenu(anchor) {
  const cur = sortMode();
  const set = m => { LS.set('sort2.' + S.route.key, m); render(); };
  menu(anchor, [...[['prio', N_('Priority, then manual')], ['custom', N_('Manual only')], ['date', N_('Date')], ['title', N_('Title')]].map(([m, n]) => ({label: tr(n), on: cur === m, fn: () => set(m)})),
    '-', {label: showDone() ? tr('Hide completed') : tr('Show completed'), icon: 'eye', fn: () => setShowDone(!showDone())}]);
}

// ------------------------------------------------------------------ modals
function modal(html) {
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="card">${html}</div>`;
  m.addEventListener('mousedown', e => { if (e.target === m) m.remove(); });
  document.body.appendChild(m);
  return m;
}
const LCOLORS = ['', '#2dd4bf', '#6d8cff', '#6ee7b7', '#4ade80', '#f5b041', '#f87171', '#c084fc', '#f472b6', '#94a3b8'];
const EMOJIS = ['📥', '📌', '⭐', '🔥', '✅', '📅', '⏰', '🎯', '💡', '🧠', '🏠', '🏡', '🛒', '🍎', '🍳', '☕', '💼', '🖥️', '💻', '📱', '📞', '✉️', '📝', '📚', '📖', '✏️', '🎓', '💰', '💳', '🧾', '🏦', '📊', '🚗', '🚲', '✈️', '🏖️', '🧳', '🗺️', '🎁', '🎉', '🎵', '🎹', '🎧', '🎬', '📷', '🎨', '🌀', '🧵', '🛠️', '🔧', '🏃', '🏋️', '🧘', '❤️', '🩺', '💊', '👶', '🧒', '👪', '🐶', '🐱', '🐭', '🌱', '🌻', '☀️', '🌙', '♻️', '🔒', '🤶', '🎄'];
const EMO_RE = /^((?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\uFE0F|\u200D)+)\s*/u;
function listModal(id, folder = '') {
  const l = id ? listById(id) : {name: '', color: '', folder, view: 'list'};
  const m0 = l.name.match(EMO_RE);
  let emo = m0 ? m0[1] : '';
  const base = l.is_inbox && l.name === 'Eingang' ? tr('Inbox') : m0 ? l.name.slice(m0[0].length) : l.name;  // inbox keeps its stored name unless renamed
  const md = modal(`<h3>${id ? tr('Edit list') : tr('New list')}</h3>
    <div class="row"><label>${tr('Name')}</label><button class="emobtn" id="l-emo" title="${tr('Choose icon')}">${emo || ic('list')}</button><input id="l-name" value="${esc(base)}"></div>
    <div class="emogrid hidden" id="l-emogrid"><button data-emo="" class="none" title="${tr('No icon')}">${ic('ban', 's')}</button>${EMOJIS.map(e => `<button data-emo="${e}" class="${e === emo ? 'on' : ''}">${e}</button>`).join('')}<input id="l-emocustom" placeholder="${tr('custom')}" maxlength="8"></div>
    <div class="row"><label>${tr('Folder')}</label><input id="l-folder" value="${esc(l.folder)}" list="l-folders" placeholder="${tr('optional')}"><datalist id="l-folders">${folderNames().map(f => `<option value="${esc(f)}">`).join('')}</datalist></div>
    <div class="row"><label>${tr('View')}</label><select id="l-view"><option value="list">${tr('List')}</option>${feat('kanban') ? `<option value="kanban" ${l.view === 'kanban' ? 'selected' : ''}>${tr('Kanban')}</option>` : ''}${feat('timeline') ? `<option value="timeline" ${l.view === 'timeline' ? 'selected' : ''}>${tr('Timeline')}</option>` : ''}</select></div>
    <div class="row"><label>${tr('Color')}</label><div class="colors" id="l-col">${LCOLORS.map(c => `<button style="background:${c || 'var(--bg4)'}" class="${(l.color || '') === c ? 'on' : ''}" data-c="${c}"></button>`).join('')}</div></div>
    <div class="foot">${id && !l.is_inbox ? `<button class="btn danger" data-m="del">${tr('Delete')}</button><button class="btn" data-m="arch">${l.archived ? tr('Reactivate') : tr('Archive')}</button>` : ''}<span class="spacer"></span><button class="btn" data-m="close">${tr('Cancel')}</button><button class="btn pri" data-m="save">${tr('Save')}</button></div>`);
  md.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.c !== undefined) { $$('#l-col button', md).forEach(x => x.classList.remove('on')); b.classList.add('on'); }
    if (b.id === 'l-emo') { $('#l-emogrid', md).classList.toggle('hidden'); return; }
    if (b.dataset.emo !== undefined) {
      emo = b.dataset.emo;
      $$('#l-emogrid button', md).forEach(x => x.classList.toggle('on', x === b && !!emo));
      $('#l-emo', md).innerHTML = emo || ic('list');
      $('#l-emogrid', md).classList.add('hidden');
      return;
    }
    const a = b.dataset.m;
    if (a === 'close') md.remove();
    if (a === 'save') {
      const nm = $('#l-name', md).value.trim().replace(EMO_RE, '');
      if (!nm) return $('#l-name', md).focus();
      const body = {name: l.is_inbox && !emo && nm === tr('Inbox') ? 'Eingang' : emo + nm, folder: $('#l-folder', md).value.trim(), view: $('#l-view', md).value, color: $('#l-col button.on', md)?.dataset.c || ''};
      if (body.folder && !folderNames().includes(body.folder)) await api('PATCH', '/api/settings', {folders: JSON.stringify([...folderNames(), body.folder])});
      if (id) await api('PATCH', '/api/lists/' + id, body);
      else { const n = await api('POST', '/api/lists', body); md.remove(); await load(); go('l/' + n.id); return; }
      md.remove(); await load(); render();
    }
    if (a === 'arch') { await api('PATCH', '/api/lists/' + id, {archived: l.archived ? 0 : 1}); md.remove(); await load(); render(); }
    if (a === 'del') {
      const n = openTasks().filter(t => t.list_id === id).length;
      if (!confirm(tr('Delete list “{0}”?', l.name) + (n ? ' ' + trn('{0} open task goes to the trash.', '{0} open tasks go to the trash.', n) : ''))) return;
      await api('DELETE', '/api/lists/' + id); md.remove(); await load(); go('today');
    }
  });
  md.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.id !== 'l-emocustom') $('[data-m="save"]', md).click(); });
  md.addEventListener('input', e => {  // any emoji typed (or picked from the OS keyboard) into the custom field
    if (e.target.id !== 'l-emocustom') return;
    const m = e.target.value.match(EMO_RE);
    if (m) { emo = m[1]; $('#l-emo', md).innerHTML = emo; $$('#l-emogrid button', md).forEach(x => x.classList.remove('on')); }
  });
  setTimeout(() => $('#l-name', md).focus(), 50);
}
function settingsModal(focus) {
  const s = S.settings;
  const topicUrl = `${S.ntfyUrl}/${s.ntfy_topic}`;
  const md = modal(`<h3>${tr('Settings')}</h3>
    <h4>${tr('Notifications (ntfy)')}</h4>
    <div class="row"><label>${tr('Topic')}</label><code class="topic">${esc(s.ntfy_topic)}</code></div>
    <div class="row"><label></label><span class="muted" style="font-size:13px;flex:1">${tr('Subscribe in the ntfy app: server {0}, topic as above', esc(S.ntfyUrl))}${/ntfy\.sh/.test(S.ntfyUrl) ? '' : tr(', with a user that has read access')}. <a href="${esc(topicUrl)}" target="_blank" rel="noopener" style="color:var(--accent)">${tr('Web view')}</a></span></div>
    <div class="row"><label></label><button class="btn sm" data-m="test">${ic('bell', 's')} ${tr('Send test')}</button></div>
    <div class="row"><label>${tr('All-day reminder at')}</label><input type="time" id="s-allday" value="${esc(s.allday_time)}"></div>
    <div class="row"><label>${tr('Default reminder')}</label><select id="s-defrem"><option value="">${tr('none')}</option>${REM_OPTS.map(([v, n]) => `<option value="${v}" ${s.default_reminder === v ? 'selected' : ''}>${tr(n)}</option>`).join('')}</select></div>
    <div class="row"><label>${tr('Daily digest at')}</label><input type="time" id="s-digest" value="${esc(s.digest_time)}"><span class="muted" style="font-size:12px">${tr('empty = off')}</span></div>
    <h4>${tr('Focus (minutes)')}</h4>
    <div class="row"><label>${tr('Focus / short / long')}</label><input type="number" id="s-pf" value="${esc(s.pomo_focus)}" min="1" style="max-width:80px"><input type="number" id="s-ps" value="${esc(s.pomo_short)}" min="1" style="max-width:80px"><input type="number" id="s-pl" value="${esc(s.pomo_long)}" min="1" style="max-width:80px"></div>
    <div class="row"><label>${tr('Long break after')}</label><input type="number" id="s-pe" value="${esc(s.pomo_long_every)}" min="1" style="max-width:80px"><span class="muted">${tr('pomos')}</span></div>
    <h4 id="s-tabbar-h">${tr('Tab bar (this device)')}</h4>
    <div class="muted" style="font-size:12px;margin:-2px 0 8px">${tr('Applies to this device only, at the bottom on a phone or on the left on desktop. A phone fits {0} tabs, the rest and everything not pinned goes under “More”.', TAB_MAX)}</div>
    <div class="navlist" id="s-tabbar"></div>
    <div class="row" style="margin-top:8px"><select id="s-tabadd" style="flex:1"></select><button class="btn sm" data-m="tab-reset">${tr('Default')}</button></div>
    <h4>${tr('Modules')}</h4>
    <div class="muted" style="font-size:12px;margin:-2px 0 8px">${tr('Checkbox = feature on/off. Order = default bar for devices without their own tab bar.')}</div>
    <div class="navlist" id="s-nav">${navOrder().map(k => { const [m, i, n] = MODS.find(x => x[0] === k); return `<div class="navrow" data-mod="${m}">${m === 'tasks' ? '<input type="checkbox" checked disabled>' : `<input type="checkbox" data-feat="${m}" ${feat(m) ? 'checked' : ''}>`}${ic(i, 's')}<span>${tr(n)}</span><button class="iconbtn" data-nav="-1" title="${tr('move up / left')}">${ic('chev', 's up')}</button><button class="iconbtn" data-nav="1" title="${tr('move down / right')}">${ic('chev', 's')}</button></div>`; }).join('')}</div>
    <div class="featgrid" style="margin-top:10px">${FEATS.filter(([k]) => !MODS.some(m => m[0] === k)).map(([k, n]) => `<label><input type="checkbox" data-feat="${k}" ${feat(k) ? 'checked' : ''}> ${tr(n)}</label>`).join('')}</div>
    ${S.paperless?.enabled ? `<h4>Paperless</h4>
    <div class="row"><label>${tr('After upload')}</label><label style="display:flex;gap:8px;align-items:center;min-width:0;color:var(--text)"><input type="checkbox" id="s-plkeep" ${s.paperless_keep === '1' ? 'checked' : ''} style="flex:none"> ${tr('Also keep the attachment in Abhako')}</label></div>` : ''}
    ${S.ntfyInbox?.enabled ? `<h4>${tr('Share via ntfy (Android)')}</h4>
    <div class="muted" style="font-size:13px;line-height:1.7">${tr('In the ntfy app, add server {0} once', `<code class="topic">${esc(S.ntfyInbox.server)}</code>`)}${tr(' and log in with a user that may write to the topic (Settings > Manage users).')} ${tr('Then: share an image or text > ntfy > server as above, topic {0}. A few seconds later it is a task in the inbox, files as attachments.', `<code class="topic">${esc(S.ntfyInbox.topic)}</code>`)}</div>` : ''}
    <h4>${tr('Appearance (this device)')}</h4>
    <div class="row"><label>${tr('Color scheme')}</label><div class="seg" id="s-theme">${[['auto', N_('Automatic')], ['dark', N_('Dark')], ['light', N_('Light')]].map(([k, n]) => `<button data-theme-set="${k}" class="${LS.get('theme', 'auto') === k ? 'on' : ''}">${tr(n)}</button>`).join('')}</div></div>
    <h4 id="s-lang-h">Sprache / Language</h4>
    <div class="row"><label>${tr('Language')}</label><div class="seg" id="s-lang">${(S.languages || []).map(({code, name}) => `<button data-lang-set="${esc(code)}" class="${(s.lang || 'en') === code ? 'on' : ''}">${esc(name)}</button>`).join('')}</div></div>
    <div class="muted" style="font-size:12px;margin:-4px 0 8px">${tr('Applies to all devices and to the notifications. Quick add always understands German and English.')}</div>
    <h4>${tr('Completed tasks')}</h4>
    <div class="row"><label>${tr('Show in lists')}</label><label style="display:flex;gap:8px;align-items:center;min-width:0;color:var(--text)"><input type="checkbox" id="s-showdone" ${s.show_completed !== '0' ? 'checked' : ''} style="flex:none"> ${tr('Show completed|setting')}</label></div>
    <div class="row"><label>${tr('Clean up')}</label><button class="btn sm danger" data-m="purge">${ic('trash', 's')} ${tr('Delete all completed')}</button><span class="muted" style="font-size:12px">${tr('they go to the trash')}</span></div>
    <h4>${tr('Data')}</h4>
    <div class="row"><label>${tr('TickTick import')}</label><input type="file" id="s-import" accept=".csv,text/csv"></div>
    <div class="row"><label>${tr('Export')}</label><a class="btn sm" href="/api/export.json" download>${ic('download', 's')} ${tr('Download JSON')}</a></div>
    <h4>${tr('Phone')}</h4>
    <div class="muted" style="font-size:13px;line-height:1.7">${tr('Swipe right: complete · swipe left: snooze / delete · long-press and drag: reorder, move to another column, quadrant or onto a day; drag to the left edge and hold briefly to open the lists (dropping a subtask there = standalone task in that list). Android: share links directly via “Share” &gt; Abhako, images and files (also several) via the HTTP Shortcuts app, single ones also via the ntfy app.')}</div>
    <h4>${tr('Quick add')}</h4>
    <div class="muted" style="font-size:13px;line-height:1.7">${tr('today, tomorrow, day after tomorrow, friday, next monday, in 3 days, 12.10., 3pm, at 15:00<br>daily, weekdays, weekly, every monday, every 2 weeks, monthly, yearly<br>!high / !medium / !low (or !!!, !!, !) · #tag · ~list<br>German works too: morgen 15 uhr, jeden montag, !hoch<br>Keyboard: n = new task, / = search, Esc = close')}</div>
    <div class="foot"><button class="btn" data-m="close">${tr('Close')}</button><button class="btn pri" data-m="save">${tr('Save')}</button></div>`);
  const tabDraw = () => {
    const ids = tabIds();
    $('#s-tabbar', md).innerHTML = ids.map(tabItem).map((t, i) => t ? `<div class="navrow" data-tab="${esc(t.id)}">${t.icon}<span>${esc(t.label)}</span>${i === TAB_MAX - 1 && ids.length > TAB_MAX ? `<span class="muted" style="font-size:11px">${tr('from here on “More”')}</span>` : ''}<button class="iconbtn" data-tmove="-1" title="${tr('move forward')}">${ic('chev', 's up')}</button><button class="iconbtn" data-tmove="1" title="${tr('move back')}">${ic('chev', 's')}</button><button class="iconbtn" data-tdel title="${tr('remove')}">${ic('x', 's')}</button></div>` : '').join('') || `<div class="muted" style="font-size:13px">${tr('Empty: only “More”')}</div>`;
    const opt = (id, n) => ids.includes(id) ? '' : `<option value="${esc(id)}">${esc(n)}</option>`;
    const grp = (n, o) => o ? `<optgroup label="${tr(n)}">${o}</optgroup>` : '';
    $('#s-tabadd', md).innerHTML = `<option value="">${tr('+ Add tab …')}</option>` +
      grp(N_('Sections'), MODS.filter(([m]) => m === 'tasks' || feat(m)).map(([m, , n]) => opt('m:' + m, tr(n))).join('')) +
      grp(N_('Smart lists'), SMART_TABS.map(k => opt('s:' + k, tr(SMART[k].name))).join('')) +
      grp(N_('Lists'), S.lists.filter(l => !l.is_inbox && !l.archived).map(l => opt('l:' + l.id, listName(l.name))).join('')) +
      grp(N_('Filters'), S.filters.map(f => opt('f:' + f.id, f.name)).join('')) +
      grp(N_('Tags'), Object.keys(counts().tags).sort((a, b) => a.localeCompare(b, 'de')).map(t => opt('tag:' + t, '#' + t)).join('')) +
      grp(N_('Other'), opt('search', tr('Search')) + opt('settings', tr('Settings')));
  };
  const tabSet = ids => { LS.set('tabbar', ids); tabDraw(); renderTabs(); renderRail(); };
  tabDraw();
  $('#s-tabadd', md).addEventListener('change', e => { if (e.target.value) tabSet([...tabIds(), e.target.value]); });
  if (focus === 'tabbar') setTimeout(() => $('#s-tabbar-h', md)?.scrollIntoView({block: 'start'}), 0);
  md.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    const trow = b.closest('[data-tab]');
    if (trow && (b.dataset.tmove || 'tdel' in b.dataset)) {
      const ids = tabIds().filter(id => tabItem(id)), i = ids.indexOf(trow.dataset.tab);
      if ('tdel' in b.dataset) ids.splice(i, 1);
      else { const j = i + +b.dataset.tmove; if (j < 0 || j >= ids.length) return; [ids[i], ids[j]] = [ids[j], ids[i]]; }
      tabSet(ids); return;
    }
    if (b.dataset.m === 'tab-reset') { LS.set('tabbar', null); tabDraw(); renderTabs(); renderRail(); toast(tr('Default bar')); return; }
    if (b.dataset.langSet) {  // global (server) setting: also the language of the push notifications
      if (b.dataset.langSet === (S.settings.lang || 'en')) return;
      await api('PATCH', '/api/settings', {lang: b.dataset.langSet});
      await i18nLoad(b.dataset.langSet);
      S.settings.lang = b.dataset.langSet; LS.set('lang', S.settings.lang); document.documentElement.lang = S.settings.lang;
      md.remove(); render(); settingsModal(); setTimeout(() => $('#s-lang-h')?.scrollIntoView({block: 'center'}), 0);
      return;
    }
    if (b.dataset.themeSet) { LS.set('theme', b.dataset.themeSet); applyTheme(); $$('#s-theme button', md).forEach(x => x.classList.toggle('on', x === b)); return; }
    if (b.dataset.nav) {
      const row = b.closest('.navrow'), sib = +b.dataset.nav < 0 ? row.previousElementSibling : row.nextElementSibling;
      if (sib) +b.dataset.nav < 0 ? sib.before(row) : sib.after(row);
      return;
    }
    const a = b.dataset.m;
    if (a === 'close') md.remove();
    if (a === 'purge') {
      const n = [...S.tasks.values()].filter(t => t.status !== 0).length;
      if (!confirm(tr('Move all completed tasks to the trash?') + (n ? ' ' + tr('(at least {0})', n) : ''))) return;
      const j = await api('POST', '/api/tasks/purge-done');
      await load(); render(); toast(j.count === undefined ? tr('Will be deleted once back online') : trn('{0} completed task moved to the trash', '{0} completed tasks moved to the trash', j.count));
    }
    if (a === 'test') { const j = await api('POST', '/api/ntfy/test'); toast(j.ok ? tr('Test sent') : tr('ntfy not reachable')); }
    if (a === 'save') {
      await api('PATCH', '/api/settings', {...($('#s-plkeep', md) ? {paperless_keep: $('#s-plkeep', md).checked ? '1' : '0'} : {}), nav_order: $$('#s-nav .navrow', md).map(r => r.dataset.mod).join(','), features: $$('[data-feat]', md).filter(x => x.checked).map(x => x.dataset.feat).join(','), show_completed: $('#s-showdone', md).checked ? '1' : '0', allday_time: $('#s-allday', md).value || '09:00', default_reminder: $('#s-defrem', md).value, digest_time: $('#s-digest', md).value,
        pomo_focus: $('#s-pf', md).value, pomo_short: $('#s-ps', md).value, pomo_long: $('#s-pl', md).value, pomo_long_every: $('#s-pe', md).value});
      md.remove(); await load(); await route(); toast(tr('Saved'));
    }
  });
  $('#s-import', md).addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    const fd = new FormData(); fd.append('file', f);
    const j = await api('POST', '/api/import/ticktick', fd);
    toast(tr('Import: {0} tasks, {1} new lists', j.tasks, j.lists) + (j.skipped ? tr(', {0} already there', j.skipped) : ''));
    await load(); render();
  });
}
function sectionMenu(anchor, sid) {
  const s = S.sections.find(x => x.id === sid);
  menu(anchor, [
    {label: tr('Rename'), icon: 'edit', fn: async () => { const n = prompt(tr('Name'), s.name); if (n && n.trim()) { await api('PATCH', '/api/sections/' + sid, {name: n.trim()}); await load(); render(); } }},
    {label: tr('Move left / up'), icon: 'left', fn: () => moveSection(sid, -1)},
    {label: tr('Move right / down'), icon: 'right', fn: () => moveSection(sid, 1)},
    '-',
    {label: tr('Delete (tasks stay)'), icon: 'trash', cls: 'flag-5', fn: async () => { await api('DELETE', '/api/sections/' + sid); await load(); render(); }},
  ]);
}
async function moveSection(sid, dir) {
  const s = S.sections.find(x => x.id === sid);
  const secs = S.sections.filter(x => x.list_id === s.list_id);
  const i = secs.indexOf(s), j = i + dir;
  if (j < 0 || j >= secs.length) return;
  [secs[i], secs[j]] = [secs[j], secs[i]];
  await Promise.all(secs.map((x, k) => api('PATCH', '/api/sections/' + x.id, {sort: k})));
  await load(); render();
}

// ------------------------------------------------------------------ toast
let toastTimer;
function toast(msg, undo) {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(msg)}</span>${undo ? `<button>${tr('Undo')}</button>` : ''}`;
  el.classList.remove('hidden');
  if (undo) el.querySelector('button').onclick = () => { el.classList.add('hidden'); undo(); };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), undo ? 5000 : 2500);
}

// ------------------------------------------------------------------ quick add wiring
function currentQuickInput() { return $('#qinput'); }
function updateChips(input) {
  const chips = input.closest('.qadd').querySelector('.chips');
  if (!chips) return;
  const r = parseQuick(input.value, S.quick.ignore);
  chips.innerHTML = r.chips.map(c => `<button class="qchip ${c.off ? 'off' : ''}" data-qtype="${c.type}" title="${c.off ? tr('recognize again') : tr("don't recognize")}">${esc(c.label)}</button>`).join('');
}
async function submitQuick(input, extra = {}) {
  const d = {...quickDefaults(), ...(input.id === 'qsheet' ? S.quickPreset : {}), ...extra};
  const txt = input.value.trim(); if (!txt && !d.files?.length) return;
  const r = parseQuick(txt, S.quick.ignore);
  if (!r.title && d.files?.length) r.title = d.files[0].name.replace(/\.[^.]+$/, '');  // shared file without a title
  if (!r.title) return;
  const body = {title: r.title, list_id: r.list_id || d.list_id, due: r.due || d.due, due_time: r.due_time || d.due_time, priority: r.priority ?? d.priority ?? 0,
    tags: [...(d.tags || []), ...(r.tags || [])], repeat: r.repeat || '', section_id: d.section_id, content: d.content || ''};
  if (body.due_time && S.settings.default_reminder !== '') body.reminders = S.settings.default_reminder;
  input.value = ''; S.quick.ignore = new Set(); updateChips(input);
  if (input.id === 'qsheet' && (S.quickPreset.content || S.quickPreset.due_time || S.quickPreset.files?.length)) { S.quickPreset = {}; closePop(); }
  const created = await createTask(body);
  if (d.files?.length && created?.id) { await uploadFiles(created.id, d.files); openDetail(created.id); }
  if (document.body.contains(input)) input.focus();
}
function openQuickSheet(prefill = '', preset = {}) {
  S.quickPreset = preset;
  let q = $('.qadd.sheet');
  if (!q) {
    q = document.createElement('div');
    q.className = 'qadd sheet';
    q.innerHTML = `<div class="box">${ic('plus')}<input id="qsheet" placeholder="${tr("What's next?")}" autocomplete="off" enterkeyhint="send"><button class="iconbtn" data-act="qsheet-send" aria-label="${tr('Add')}">${ic('arrow')}</button></div><div class="chips"></div><div class="qhint">${tr('tomorrow 3pm · !high · #tag · ~list · every monday')}</div>`;
    document.body.appendChild(q);
  }
  $('#scrim').classList.remove('hidden');
  popOnClose = () => { q.remove(); S.quickPreset = {}; };
  const nf = preset.files?.length || 0;
  const hint = [preset.due ? dayLabel(preset.due) + (preset.due_time ? ' ' + preset.due_time : '') : '', preset.content ? tr('Link as description') : '',
    nf ? (nf === 1 ? tr('Attachment: {0}', preset.files[0].name) : tr('{0} attachments', nf)) : ''].filter(Boolean).join(' · ');
  $('.qhint', q).textContent = hint || tr('tomorrow 3pm · !high · #tag · ~list · every monday');
  const inp = $('#qsheet'); inp.value = prefill; updateChips(inp);
  setTimeout(() => inp.focus(), 30);
}

// ------------------------------------------------------------------ events
document.addEventListener('click', async e => {
  const lm = e.target.closest('[data-lmove]');
  if (lm) { e.preventDefault(); moveList(+lm.dataset.id, +lm.dataset.lmove); return; }
  const fm = e.target.closest('[data-fmove]');
  if (fm) {
    e.preventDefault(); e.stopPropagation();
    const arr = folderNames(), i = arr.indexOf(fm.dataset.folder), j = i + +fm.dataset.fmove;
    if (j >= 0 && j < arr.length) { [arr[i], arr[j]] = [arr[j], arr[i]]; saveFolders(arr); }
    return;
  }
  const lf = e.target.closest('[data-lfolder]');
  if (lf) {
    e.preventDefault(); e.stopPropagation();
    const id = +lf.dataset.lfolder, cur = listById(id)?.folder || '';
    menu(lf, [{label: tr('No folder'), icon: 'list', on: !cur, fn: () => setListFolder(id, '')},
      ...folderNames().map(f => ({label: f, icon: 'folder', on: cur === f, fn: () => setListFolder(id, f)})),
      '-', {label: tr('New folder…'), icon: 'plus', fn: () => newFolder(id)}]);
    return;
  }
  const g = e.target.closest('[data-go]');
  if (g) { e.preventDefault(); if (S.sel && isMobile()) closeDetail(); go(g.dataset.go); return; }
  const qc = e.target.closest('.qchip');
  if (qc) { const t = qc.dataset.qtype; S.quick.ignore.has(t) ? S.quick.ignore.delete(t) : S.quick.ignore.add(t); const inp = qc.closest('.qadd').querySelector('input'); updateChips(inp); inp.focus(); return; }
  const cb = e.target.closest('.md input[data-mdline]');
  if (cb) { e.stopPropagation(); toggleMdCheckbox(+cb.dataset.mdline); return; }
  if (e.target.closest('#d-md') && !e.target.closest('a')) { editContent(); return; }
  const bar = e.target.closest('.tl-bar');
  if (bar) { if (!tlDragged) openDetail(+bar.dataset.id); return; }
  const wev = e.target.closest('.wev');
  if (wev) { openDetail(+wev.dataset.id); return; }
  const wc = e.target.closest('.wcol');
  if (wc) { const y = e.clientY - wc.getBoundingClientRect().top, m = Math.max(0, Math.min(23 * 60 + 30, Math.floor(y / WEEK_H * 2) * 30)); openQuickSheet('', {due: wc.dataset.day, due_time: `${pad(Math.floor(m / 60))}:${pad(m % 60)}`}); return; }
  const wh = e.target.closest('.wh, .wad');
  if (wh && !e.target.closest('.ev')) { S.calSel = wh.dataset.day; S.calMode = 'day'; LS.set('calMode', 'day'); renderView(); return; }
  // multi-select: ctrl/cmd/shift-click, or tap while in select mode
  const mrow = e.target.closest('#view .trow');
  if (mrow && !e.target.closest('.caret') && (S.multiMode || e.ctrlKey || e.metaKey || (e.shiftKey && S.multi.size))) {
    e.preventDefault(); e.stopPropagation();
    const id = +mrow.dataset.id;
    if (e.shiftKey && S.multiLast) {
      const ids = $$('#view .trow').map(r => +r.dataset.id), a = ids.indexOf(S.multiLast), b = ids.indexOf(id);
      if (a >= 0 && b >= 0) ids.slice(Math.min(a, b), Math.max(a, b) + 1).forEach(x => S.multi.add(x));
    } else S.multi.has(id) ? S.multi.delete(id) : S.multi.add(id);
    S.multiLast = id;
    $$('#view .trow').forEach(r => r.classList.toggle('msel', S.multi.has(+r.dataset.id)));
    renderMultiBar();
    return;
  }
  const cell = e.target.closest('.cal .cell');
  if (cell && !e.target.closest('.ev')) { S.calSel = cell.dataset.day; if (!cell.classList.contains('out')) { renderView(); } else { S.calMonth = S.calSel.slice(0, 7); renderView(); } return; }
  const ev = e.target.closest('.cal .ev, .week .ev');
  if (ev) { if (!swiped) openDetail(+ev.dataset.id); return; }
  const a = e.target.closest('[data-act]');
  if (!a) return;
  const act = a.dataset.act;
  const row = a.closest('.trow');
  const id = +(a.dataset.id || (row && row.dataset.id) || 0);
  switch (act) {
    case 'open': if (!swiped) openDetail(id); break;
    case 'open-id': openDetail(id); break;
    case 'toggle': e.stopPropagation(); toggleTask(id); break;
    case 'close-detail': closeDetail(); break;
    case 'collapse': {
      if (e.target.closest('.gact')) break;
      const k = a.dataset.key; S.collapsed.has(k) ? S.collapsed.delete(k) : S.collapsed.add(k); LS.set('collapsed', [...S.collapsed]); renderView(); break;
    }
    case 'side': $('#side').classList.add('open'); $('#scrim').classList.remove('hidden'); popOnClose = closeSide; break;
    case 'settings': closeSide(); settingsModal(); break;
    case 'tabs-more': tabsMore(a); break;
    case 'list-new': menu(a, [{label: tr('New list'), icon: 'list', fn: () => { closeSide(); listModal(); }}, {label: tr('New folder'), icon: 'folder', fn: () => newFolder()}]); break;
    case 'folder-toggle': { const k = 'fold:' + a.dataset.folder; S.collapsed.has(k) ? S.collapsed.delete(k) : S.collapsed.add(k); LS.set('collapsed', [...S.collapsed]); renderSide(); break; }
    case 'folder-menu': e.stopPropagation(); folderMenu(a, a.dataset.folder); break;
    case 'lists-reorder': S.listReorder = !S.listReorder; renderSide(); break;
    case 'list-menu': listModal(id); break;
    case 'view-list': case 'view-kanban': case 'view-timeline': {
      const l = routeList();
      await api('PATCH', '/api/lists/' + l.id, {view: act.slice(5)}); await load(); render(); break;
    }
    case 'pin': { const t = taskById(id); patchTask(id, {pinned: t.pinned ? 0 : 1}); break; }
    case 'conflicts': conflictModal(); break;
    case 'att-view': e.preventDefault(); attLightbox(+a.dataset.att); break;
    case 'pl-search': plSearchModal(S.sel); break;
    case 'pl-del': {
      const t = taskById(S.sel), p = t?.paperless?.find(x => x.id === +a.dataset.pl);
      if (!p || !confirm(tr('Remove the link to “{0}”? The document stays in Paperless.', p.title))) break;
      putTask(await api('DELETE', `/api/paperless-links/${p.id}`)); render(); renderDetail(); break;
    }
    case 'att-pl': {
      e.preventDefault(); e.stopPropagation();
      const t = taskById(S.sel), at = t?.attachments?.find(x => x.id === +a.dataset.att);
      if (!at || a.classList.contains('busy')) break;
      if (!confirm(tr('File “{0}” in Paperless?', at.name) + ' ' + (S.settings.paperless_keep === '1' ? tr('The attachment also stays here.') : tr('Once consumed, the link replaces the attachment.')))) break;
      putTask(await api('POST', `/api/attachments/${at.id}/to-paperless`)); render(); renderDetail();
      toast(tr('Sent to Paperless, processing')); break;
    }
    case 'att-del': {
      const t = taskById(S.sel), at = t?.attachments?.find(x => x.id === +a.dataset.att);
      if (!at || !confirm(tr('Remove “{0}”?', at.name))) break;
      putTask(await api('DELETE', `/api/attachments/${at.id}`)); render(); renderDetail(); break;
    }
    case 'multi': S.multiMode = !S.multiMode; if (!S.multiMode) S.multi.clear(); render(); break;
    case 'filter-new': closeSide(); filterModal(); break;
    case 'filter-edit': filterModal(id); break;
    case 'cal-mode': S.calMode = a.dataset.k; LS.set('calMode', S.calMode); if (S.calMode === 'month') S.calMonth = S.calSel.slice(0, 7); renderView(); break;
    case 'tl-prev': case 'tl-next': S.tlStart = addDays(S.tlStart, act === 'tl-next' ? 14 : -14); renderView(); break;
    case 'tl-today': S.tlStart = addDays(mondayOf(today()), -7); { const tl = $('#tlscroll'); renderView(); const n = $('#tlscroll'); if (n) n.scrollLeft = 5 * tlDW(); } break;
    case 'sort': sortMenu(a); break;
    case 'section-new': {
      const n = prompt(tr('Name of the section / column')); if (!n || !n.trim()) break;
      const lid = S.route.key === 'inbox' ? inbox().id : +S.route.key.slice(2);
      await api('POST', '/api/sections', {list_id: lid, name: n.trim()}); await load(); render(); break;
    }
    case 'section-menu': e.stopPropagation(); sectionMenu(a, id); break;
    case 'date': datePop(a, id); break;
    case 'prio': prioMenu(a, id); break;
    case 'task-menu': taskMenu(a, id); break;
    case 'delete': deleteTask(id); break;
    case 'restore': await api('POST', `/api/tasks/${id}/restore`); await load(); render(); toast(tr('Restored')); break;
    case 'purge': if (confirm(tr('Delete permanently?'))) { await api('DELETE', `/api/tasks/${id}?hard=1`); await load(); render(); } break;
    case 'trash-empty': if (confirm(tr('Empty the trash permanently?'))) { await api('DELETE', '/api/trash'); await load(); render(); } break;
    case 'tag-rm': { const t = taskById(S.sel); patchTask(t.id, {tags: t.tags.filter(g => g !== a.dataset.tag)}); break; }
    case 'cal-prev': case 'cal-next': {
      const dir = act === 'cal-next' ? 1 : -1;
      if (S.calMode === 'week') S.calSel = addDays(S.calSel, 7 * dir);
      else if (S.calMode === 'day') S.calSel = addDays(S.calSel, dir);
      else if (S.calMode === 'timeline') S.tlStart = addDays(S.tlStart, 14 * dir);
      else { const [y, m] = S.calMonth.split('-').map(Number); S.calMonth = ds(new Date(y, m - 1 + dir, 1)).slice(0, 7); }
      renderView(); break;
    }
    case 'cal-today': S.calMonth = today().slice(0, 7); S.calSel = today(); S.tlStart = addDays(mondayOf(today()), -7); renderView(); break;
    case 'habit-new': habitModal(); break;
    case 'habit-open': habitModal(id); break;
    case 'habit-tick': {
      const h = S.habits.find(x => x.id === id), d = a.dataset.day, c = h.logs[d] || 0;
      const n = c >= h.goal ? 0 : c + 1;
      if (n) h.logs[d] = n; else delete h.logs[d];
      renderView();
      await api('POST', `/api/habits/${id}/log`, {day: d, count: n});
      break;
    }
    case 'pomo-kind': pomoKind = a.dataset.k; LS.set('pomoKind', pomoKind); renderView(); break;
    case 'pomo-start': pomoStart(); break;
    case 'pomo-task': pomoStart(id); closeDetail(); go('pomo'); break;
    case 'mb-date': multiDateMenu(a); break;
    case 'mb-prio': menu(a, [[5, N_('High')], [3, N_('Medium')], [1, N_('Low')], [0, N_('None')]].map(([p, n]) => ({label: tr(n), icon: 'flag', cls: p ? 'flag-' + p : '', fn: () => batch('patch', {priority: p})}))); break;
    case 'mb-list': menu(a, S.lists.filter(l => !l.archived).map(l => ({label: lname(l), fn: () => batch('patch', {list_id: l.id, section_id: null})}))); break;
    case 'mb-tag': { const g = prompt(tr('Add tag')); if (g && g.trim()) batch('patch', {add_tags: [g.trim().replace(/^#/, '')]}); break; }
    case 'mb-pin': batch('patch', {pinned: [...S.multi].every(i => S.tasks.get(i)?.pinned) ? 0 : 1}); break;
    case 'mb-done': batch('complete', {}, true); break;
    case 'mb-del': if (confirm(trn('Delete {0} task?', 'Delete {0} tasks?', S.multi.size))) batch('delete', {}, true); break;
    case 'mb-all': $$('#view .trow').forEach(r => S.multi.add(+r.dataset.id)); render(); break;
    case 'mb-close': S.multi.clear(); S.multiMode = false; render(); break;
    case 'pomo-pause': case 'pomo-resume': case 'pomo-stop': {
      const swStop = act === 'pomo-stop' && S.pomo?.kind === 'stopwatch' ? Math.round(pomoElapsed(S.pomo) / 60) : null;
      const j = await api('POST', `/api/pomo/${S.pomo.id}/${act.slice(5)}`);
      if (swStop !== null) setTimeout(() => toast(tr('Stopped: {0} logged', fmtH(swStop))), 50);
      S.pomo = j.pomo; S.pomoToday = j.today; document.title = APP_NAME; render(); break;
    }
    case 'qsheet-send': submitQuick($('#qsheet')); break;
  }
});
function closeSide() { $('#side').classList.remove('open'); if (!$('.qadd.sheet') && $('#pop').classList.contains('hidden')) $('#scrim').classList.add('hidden'); }
$('#scrim').addEventListener('click', () => { closeSide(); closePop(); });
$('#fab').addEventListener('click', () => openQuickSheet());

document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'qinput' || t.id === 'qsheet') updateChips(t);
  if (t.id === 'd-title') { autosize(t); queueSave(S.sel, 'title', t.value.replace(/\n/g, ' ')); }
  if (t.id === 'd-content') { autosize(t); queueSave(S.sel, 'content', t.value); }
  if (t.id === 'searchq') doSearch(t.value);
});
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.id === 'd-file') { uploadFiles(S.sel, t.files); t.value = ''; return; }
  if (t.id === 'd-list') patchTask(S.sel, {list_id: +t.value});
  if (t.id === 'd-sec') patchTask(S.sel, {section_id: t.value ? +t.value : null});
  if (t.id === 'pomo-task') { pomoTask = t.value; LS.set('pomoTask', t.value); }
});
document.addEventListener('keydown', async e => {
  const t = e.target;
  if (e.key === 'Enter' && !e.isComposing) {
    if (t.id === 'qinput' || t.id === 'qsheet') { e.preventDefault(); submitQuick(t); return; }
    if (t.id === 'd-title') { e.preventDefault(); t.blur(); return; }
    if (t.id === 'd-sub' && t.value.trim()) {
      const p = taskById(S.sel);
      const r = parseQuick(t.value.trim(), new Set());
      const v = t.value; t.value = '';
      await api('POST', '/api/tasks', {title: r.title || v, parent_id: p.id, list_id: p.list_id, due: r.due, due_time: r.due_time, priority: r.priority || 0});
      await load(); renderDetail(); render(); $('#d-sub').focus(); return;
    }
    if (t.id === 'd-tag' && t.value.trim()) {
      const p = taskById(S.sel); const v = t.value.trim().replace(/^#/, ''); t.value = '';
      await patchTask(p.id, {tags: [...p.tags, v]}); $('#d-tag')?.focus(); return;
    }
    if (t.dataset.kadd !== undefined && t.value.trim()) {
      const lid = S.route.key === 'inbox' ? inbox().id : +S.route.key.slice(2);
      const r = parseQuick(t.value.trim()); t.value = '';
      await createTask({title: r.title, list_id: lid, section_id: t.dataset.kadd ? +t.dataset.kadd : null, due: r.due, due_time: r.due_time, priority: r.priority || 0, tags: r.tags || [], repeat: r.repeat || ''});
      $(`[data-kadd="${t.dataset.kadd}"]`)?.focus(); return;
    }
    if (t.dataset.qadd !== undefined && t.value.trim()) {
      const r = parseQuick(t.value.trim()); t.value = '';
      await createTask({title: r.title, priority: +t.dataset.qadd, due: r.due, due_time: r.due_time, tags: r.tags || [], list_id: r.list_id, repeat: r.repeat || ''});
      $(`[data-qadd="${t.dataset.qadd}"]`)?.focus(); return;
    }
  }
  if (e.key === 'Escape') {
    const lb = $('.lightbox'); if (lb) { lb.remove(); return; }
    if (!$('#pop').classList.contains('hidden') || $('.qadd.sheet')) { closePop(); return; }
    if (S.multi.size || S.multiMode) { S.multi.clear(); S.multiMode = false; render(); return; }
    const m = $('.modal'); if (m) { m.remove(); return; }
    if (/INPUT|TEXTAREA/.test(t.tagName)) { t.blur(); return; }
    if (S.sel) closeDetail();
    return;
  }
  if (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'n' || e.key === 'q') { e.preventDefault(); const q = currentQuickInput(); if (q && !isMobile()) q.focus(); else openQuickSheet(); }
  if (e.key === '/') { e.preventDefault(); go('search'); }
});
document.addEventListener('focusout', e => {
  if (e.target.id === 'd-title' || e.target.id === 'd-content') flushSaves();
  if (e.target.id === 'd-content' && e.target.value.trim()) {  // back to the rendered markdown
    const t = taskById(S.sel); if (t) t.content = e.target.value;
    S.editContent = false;
    const md = $('#d-md'); if (md) { md.innerHTML = renderMd(e.target.value); md.classList.remove('hidden'); e.target.classList.add('hidden'); }
  }
});
function editContent() {
  S.editContent = true;
  const ta = $('#d-content'), md = $('#d-md'); if (!ta) return;
  md.classList.add('hidden'); ta.classList.remove('hidden'); autosize(ta); ta.focus();
}
function toggleMdCheckbox(i) {
  const t = taskById(S.sel); if (!t) return;
  const lines = t.content.split('\n');
  lines[i] = lines[i].replace(/\[( |x|X)\]/, m => m === '[ ]' ? '[x]' : '[ ]');
  t.content = lines.join('\n');
  $('#d-content').value = t.content; $('#d-md').innerHTML = renderMd(t.content);
  queueSave(t.id, 'content', t.content);
}

// ------------------------------------------------------------------ multi-select bar
function renderMultiBar() {
  let b = $('#mbar');
  if (!b) { b = document.createElement('div'); b.id = 'mbar'; document.body.appendChild(b); }
  const n = S.multi.size;
  b.classList.toggle('hidden', !(S.multiMode || n));
  $('#fab').classList.toggle('gone', ['habits', 'pomo'].includes(S.route.mod) || ['done', 'trash', 'search'].includes(S.route.key) || S.multiMode || n > 0);
  b.innerHTML = `<span class="mcount">${n ? tr('{0} selected', n) : tr('Tap tasks')}</span>
    <button class="iconbtn" data-act="mb-all" title="${tr('All')}">${ic('all')}</button>
    ${n ? `<button class="iconbtn" data-act="mb-date" title="${tr('Date')}">${ic('cal')}</button><button class="iconbtn" data-act="mb-prio" title="${tr('Priority')}">${ic('flag')}</button><button class="iconbtn" data-act="mb-list" title="${tr('List')}">${ic('folder')}</button><button class="iconbtn" data-act="mb-tag" title="${tr('Add tag')}">${ic('tag')}</button><button class="iconbtn" data-act="mb-pin" title="${tr('Pin')}">${ic('pin')}</button><button class="iconbtn" data-act="mb-done" title="${tr('Completed')}">${ic('done')}</button><button class="iconbtn danger" data-act="mb-del" title="${tr('Delete')}">${ic('trash')}</button>` : ''}
    <button class="iconbtn" data-act="mb-close" title="${tr('Done')}">${ic('x')}</button>`;
}
async function batch(action, data, clear) {
  const ids = [...S.multi];
  if (!ids.length) return;
  const j = await api('POST', '/api/tasks/batch', {ids, action, data});
  if (j.errors?.length) toast(j.errors[0]);
  if (clear) { S.multi.clear(); S.multiMode = false; }
  await load(); render();
  if (!j.errors?.length) toast(trn('{0} task changed', '{0} tasks changed', ids.length));
}
function multiDateMenu(a) {
  menu(a, [
    {label: tr('Today'), icon: 'sun', fn: () => batch('patch', {due: today()})},
    {label: tr('Tomorrow'), icon: 'sunrise', fn: () => batch('patch', {due: addDays(today(), 1)})},
    {label: tr('Next week (Mon)'), icon: 'week', fn: () => batch('patch', {due: nextWeekday(1)})},
    {label: tr('Pick a date…'), icon: 'cal', fn: () => {
      const p = openPop(a, `<div class="prow" style="margin:0">${ic('cal', 's')}<input type="date" id="mb-d" value="${today()}"></div><div class="popfoot"><button class="btn pri" data-q="ok">${tr('OK')}</button></div>`);
      p.onclick = e => { if (e.target.closest('[data-q="ok"]')) { const v = $('#mb-d').value; closePop(); if (v) batch('patch', {due: v}); } };
    }},
    {label: tr('No date|clear'), icon: 'ban', fn: () => batch('patch', {due: null})},
  ]);
}

// ------------------------------------------------------------------ filter lists
function filterModal(id) {
  const f = id ? S.filters.find(x => x.id === id) : {name: '', rules: {}};
  if (!f) return;
  const r = {op: 'and', lists: [], dates: [], prios: [], tags: [], ...JSON.parse(JSON.stringify(f.rules || {}))};
  const tags = [...new Set([...S.tasks.values()].flatMap(t => t.tags))].sort((a, b) => a.localeCompare(b, 'de'));
  const chips = (key, opts, translate) => `<div class="fchips" data-key="${key}">${opts.map(([v, n]) => (translate ? [v, tr(n)] : [v, n])).map(([v, n]) => `<button class="${r[key].includes(v) ? 'on' : ''}" data-v="${esc(String(v))}">${esc(n)}</button>`).join('')}</div>`;
  const md = modal(`<h3>${id ? tr('Edit filter') : tr('New filter')}</h3>
    <div class="row"><label>${tr('Name')}</label><input id="f-name" value="${esc(f.name)}" placeholder="${tr('e.g. Important this week')}"></div>
    <div class="row"><label>${tr('Match')}</label><div class="seg" id="f-op"><button data-op="and" class="${r.op !== 'or' ? 'on' : ''}">${tr('AND: all conditions')}</button><button data-op="or" class="${r.op === 'or' ? 'on' : ''}">${tr('OR: any one')}</button></div></div>
    <h4>${tr('Lists')}</h4>${chips('lists', S.lists.filter(l => !l.archived).map(l => [l.id, lname(l)]))}
    <h4>${tr('Date')}</h4>${chips('dates', DATE_OPTS, true)}
    <h4>${tr('Priority')}</h4>${chips('prios', [[5, N_('High')], [3, N_('Medium')], [1, N_('Low')], [0, N_('None')]], true)}
    ${tags.length ? `<h4>${tr('Tags')}</h4>${chips('tags', tags.map(g => [g, '#' + g]))}` : ''}
    <div class="muted" id="f-count" style="font-size:13px;margin-top:14px"></div>
    <div class="foot">${id ? `<button class="btn danger" data-m="del">${tr('Delete')}</button>` : ''}<span class="spacer"></span><button class="btn" data-m="close">${tr('Cancel')}</button><button class="btn pri" data-m="save">${tr('Save')}</button></div>`);
  const count = () => { const n = openTasks().filter(t => !t.parent_id && filterMatch(t, r)).length; $('#f-count', md).textContent = trn('Currently matches {0} open task. Within a category, “or” applies.', 'Currently matches {0} open tasks. Within a category, “or” applies.', n); };
  count();
  md.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    const box = b.closest('.fchips');
    if (box) {
      const key = box.dataset.key, v = key === 'lists' || key === 'prios' ? +b.dataset.v : b.dataset.v;
      const i = r[key].indexOf(v); i >= 0 ? r[key].splice(i, 1) : r[key].push(v);
      b.classList.toggle('on', i < 0); count(); return;
    }
    if (b.dataset.op) { r.op = b.dataset.op; $$('#f-op button', md).forEach(x => x.classList.toggle('on', x === b)); count(); return; }
    const a = b.dataset.m;
    if (a === 'close') md.remove();
    if (a === 'save') {
      const name = $('#f-name', md).value.trim(); if (!name) return $('#f-name', md).focus();
      if (id) { await api('PATCH', '/api/filters/' + id, {name, rules: r}); md.remove(); await load(); render(); }
      else { const j = await api('POST', '/api/filters', {name, rules: r}); md.remove(); await load(); go('f/' + j.id); }
    }
    if (a === 'del' && confirm(tr('Delete filter “{0}”? Tasks are kept.', f.name))) { await api('DELETE', '/api/filters/' + id); md.remove(); await load(); go('today'); }
  });
  if (!id) setTimeout(() => $('#f-name', md).focus(), 50);
}

// files from the desktop: drop on the open detail or on a task row; images from the clipboard
const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
document.addEventListener('dragover', e => {
  if (!hasFiles(e)) return;
  const tgt = e.target.closest('#detail, #view .trow');
  $$('.filedrop').forEach(x => x.classList.remove('filedrop'));
  if (!tgt || (tgt.id === 'detail' && !S.sel)) return;
  e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
  tgt.classList.add('filedrop');
});
document.addEventListener('dragleave', e => { if (hasFiles(e) && !e.relatedTarget) $$('.filedrop').forEach(x => x.classList.remove('filedrop')); });
document.addEventListener('drop', e => {
  if (!hasFiles(e)) return;
  $$('.filedrop').forEach(x => x.classList.remove('filedrop'));
  const tgt = e.target.closest('#detail, #view .trow');
  if (!tgt) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const id = tgt.id === 'detail' ? S.sel : +tgt.dataset.id;
  if (id) uploadFiles(id, e.dataTransfer.files);
}, true);
document.addEventListener('paste', e => {
  if (!S.sel || $('.modal') || !$('#detail').classList.contains('open') && !$('#app').classList.contains('detail-open')) return;
  const files = [...(e.clipboardData?.files || [])];
  if (!files.length) return;  // plain text paste stays normal
  e.preventDefault();
  uploadFiles(S.sel, files);
});

// ------------------------------------------------------------------ list order (sidebar)
function folderNames() {  // settings order first (keeps empty folders), then any other folder a list uses
  let arr = [];
  try { arr = JSON.parse(S.settings.folders || '[]'); } catch { /* bad json */ }
  const used = S.lists.filter(l => !l.is_inbox && !l.archived && l.folder).map(l => l.folder);
  return [...new Set([...arr.filter(Boolean), ...used])];
}
function sideOrder() {  // lists as shown: top-level lists first, then folder by folder
  const ls = S.lists.filter(l => !l.is_inbox && !l.archived);
  return [...ls.filter(l => !l.folder), ...folderNames().flatMap(f => ls.filter(l => l.folder === f))];
}
async function saveFolders(arr) {
  S.settings.folders = JSON.stringify([...new Set(arr)]);
  renderSide();
  await api('PATCH', '/api/settings', {folders: S.settings.folders});
}
async function setListFolder(id, f) {
  const l = listById(id); if (!l || l.folder === f) return;
  const order = sideOrder().filter(x => x.id !== id);
  l.folder = f;
  const last = order.map(x => x.folder).lastIndexOf(f);  // append at the end of the target folder
  order.splice(last < 0 ? (f ? order.length : 0) : last + 1, 0, l);
  if (f && !folderNames().includes(f)) S.settings.folders = JSON.stringify([...folderNames(), f]);
  await saveListOrder(order, {[id]: f});
  if (f) await api('PATCH', '/api/settings', {folders: JSON.stringify(folderNames())});
}
async function newFolder(thenList) {
  const n = (prompt(tr('Folder name')) || '').trim(); if (!n) return;
  if (folderNames().includes(n)) { toast(tr('Folder already exists')); return; }
  await saveFolders([...folderNames(), n]);
  if (thenList) setListFolder(thenList, n);
}
function folderMenu(anchor, f) {
  menu(anchor, [
    {label: tr('New list in this folder'), icon: 'plus', fn: () => listModal(null, f)},
    {label: tr('Rename'), icon: 'edit', fn: async () => {
      const n = (prompt(tr('New name'), f) || '').trim(); if (!n || n === f) return;
      await api('POST', '/api/folders/rename', {old: f, new: n}); await load(); render();
    }},
    '-',
    {label: tr('Dissolve folder (lists stay)'), icon: 'trash', cls: 'flag-5', fn: async () => {
      if (!confirm(tr('Dissolve folder “{0}”? The lists stay.', f))) return;
      await api('POST', '/api/folders/delete', {name: f}); await load(); render();
    }},
  ]);
}
async function saveListOrder(order, folder) {
  const rest = S.lists.filter(l => !l.is_inbox && !order.includes(l));
  order.concat(rest).forEach((l, i) => { l.sort = i; });
  if (folder) for (const [id, f] of Object.entries(folder)) listById(+id).folder = f;
  S.lists.sort((a, b) => b.is_inbox - a.is_inbox || a.sort - b.sort || a.id - b.id);
  renderSide();
  await api('POST', '/api/lists/reorder', {ids: order.concat(rest).map(l => l.id), folder});
}
function moveList(id, dir) {
  const order = sideOrder(), i = order.findIndex(l => l.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= order.length || order[j].folder !== order[i].folder) return;
  [order[i], order[j]] = [order[j], order[i]];
  saveListOrder(order);
}
// sidebar drag & drop (desktop): lists before lists, lists into folders (header or empty body),
// lists out of folders (onto the "Listen" header), folders before folders
let listDrag = null, folderDrag = null;
document.addEventListener('dragstart', e => {
  const r = e.target.closest && e.target.closest('#side .srow[data-list][draggable="true"]');
  const fh = e.target.closest && e.target.closest('#side .fhead[draggable="true"]');
  if (r) { listDrag = +r.dataset.list; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'list:' + listDrag); }
  else if (fh) { folderDrag = fh.dataset.folder; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'folder:' + folderDrag); }
});
const sideDropTarget = el => folderDrag !== null ? el.closest('#side .fhead') : el.closest('#side .srow[data-list], #side .fhead, #side .fempty, #side .shead.lroot');
document.addEventListener('dragover', e => {
  if (!listDrag && folderDrag === null) return;
  const t = sideDropTarget(e.target);
  $$('#side .dropbefore, #side .drop').forEach(x => x.classList.remove('dropbefore', 'drop'));
  if (!t || (t.dataset.list && +t.dataset.list === listDrag) || (folderDrag !== null && t.dataset.folder === folderDrag)) return;
  e.preventDefault();
  t.classList.add(t.classList.contains('srow') || folderDrag !== null ? 'dropbefore' : 'drop');
});
document.addEventListener('drop', e => {
  if (!listDrag && folderDrag === null) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const id = listDrag, fd = folderDrag; listDrag = null; folderDrag = null;
  $$('#side .dropbefore, #side .drop').forEach(x => x.classList.remove('dropbefore', 'drop'));
  const t = sideDropTarget(e.target); if (!t) return;
  if (fd !== null) {  // folder before folder
    const arr = folderNames().filter(x => x !== fd);
    arr.splice(arr.indexOf(t.dataset.folder), 0, fd);
    saveFolders(arr); return;
  }
  if (t.classList.contains('fhead') || t.classList.contains('fempty')) { setListFolder(id, (t.closest('[data-folder]') || t).dataset.folder); return; }
  if (t.classList.contains('lroot')) { setListFolder(id, ''); return; }
  const order = sideOrder(), moving = order.find(l => l.id === id), target = listById(+t.dataset.list);
  if (!moving || !target || moving === target) return;
  order.splice(order.indexOf(moving), 1);
  order.splice(order.indexOf(target), 0, moving);
  saveListOrder(order, moving.folder !== target.folder ? {[moving.id]: target.folder} : undefined);
}, true);
document.addEventListener('dragend', () => { listDrag = null; folderDrag = null; });

// ------------------------------------------------------------------ drag & drop (desktop)
let dragId = null;
document.addEventListener('dragstart', e => {
  const r = e.target.closest('.trow[draggable="true"], .cal .ev[draggable="true"], .week .ev[draggable="true"], .wev[draggable="true"]'); if (!r) return;
  dragId = +r.dataset.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(dragId));
  requestAnimationFrame(() => r.classList.add('dragging'));
});
document.addEventListener('dragend', () => { dragId = null; $$('.dragging,.dropbefore,.dropafter,.drop').forEach(x => x.classList.remove('dragging', 'dropbefore', 'dropafter', 'drop')); });
const DROP_SEL = '.trow, .kcol, .quad, .cal .cell, .srow[data-drop], .wcol, .wad, .wh';
// lower half of a row = drop after it (so the end of a block / list is reachable)
const dropAfter = (row, y) => { const r = row.getBoundingClientRect(); return y != null && r.height > 0 && y > r.top + r.height / 2; };
function markDrop(el, id, y) {
  $$('.dropbefore,.dropafter,.drop').forEach(x => x.classList.remove('dropbefore', 'dropafter', 'drop'));
  const tgt = el && el.closest(DROP_SEL);
  if (!tgt || tgt.closest('#detail')) return false;
  if (tgt.classList.contains('trow') && +tgt.dataset.id === id) return false;
  if (tgt.classList.contains('trow')) { if (+tgt.dataset.id !== id) tgt.classList.add(dropAfter(tgt, y) ? 'dropafter' : 'dropbefore'); const c = tgt.closest('.kcol,.quad'); if (c) c.classList.add('drop'); }
  else tgt.classList.add('drop');
  return true;
}
document.addEventListener('dragover', e => {
  if (!dragId) return;
  if (markDrop(e.target, dragId, e.clientY)) e.preventDefault();
});
document.addEventListener('drop', async e => {
  if (!dragId) return;
  e.preventDefault();
  const id = dragId; dragId = null;
  dropTask(id, e.target, e.clientY);
});
async function dropTask(id, el, clientY) {
  const t = S.tasks.get(id); if (!t || !el) return;
  const side = el.closest('.srow[data-drop]');
  const row = el.closest('.trow');
  const kcol = el.closest('.kcol');
  const quad = el.closest('.quad');
  const cell = el.closest('.cal .cell');
  const wcol = el.closest('.wcol'), wad = el.closest('.wad, .wh');
  $$('.dragging,.dropbefore,.dropafter,.drop').forEach(x => x.classList.remove('dragging', 'dropbefore', 'dropafter', 'drop'));
  if (el.closest('#detail')) return;
  const item = {id};
  if (side) {
    const k = side.dataset.drop;
    if (k.startsWith('l:')) item.list_id = +k.slice(2);
    else if (k === 'inbox') item.list_id = inbox().id;
    else if (k === 'today') item.due = today();
    else if (k === 'tomorrow') item.due = addDays(today(), 1);
    else if (k === 'trash') { deleteTask(id); return; }
    else if (k === 'done') { toggleTask(id); return; }
    else return;
    if (item.list_id && t.parent_id) {
      try { await patchTask(id, {parent_id: null, list_id: item.list_id, section_id: null}); } catch { return; }
      toast(tr('Standalone in {0}', lname(listById(item.list_id))));
      return;
    }
    if (item.list_id && item.list_id !== t.list_id) item.section_id = null;
  } else if (cell) {
    item.due = cell.dataset.day;
  } else if (wcol) {
    const y = clientY - wcol.getBoundingClientRect().top, m = Math.max(0, Math.min(23 * 60 + 45, Math.round(y / WEEK_H * 4) * 15));
    item.due = wcol.dataset.day; item.due_time = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  } else if (wad) {
    item.due = wad.dataset.day; item.due_time = null;
  } else if (quad) {
    item.priority = +quad.dataset.quad;
  } else {
    if (kcol) item.section_id = kcol.dataset.kcol ? +kcol.dataset.kcol : null;
    if (kcol && t.parent_id && !row) { try { await patchTask(id, {parent_id: null, section_id: item.section_id}); } catch { return; } toast(tr('Subtask is now standalone')); return; }
    if (row && +row.dataset.id !== id) {
      const target = S.tasks.get(+row.dataset.id);
      if (!target) return;
      // insert before target: sort between the target and its predecessor in the rendered order
      const mode = sortMode();
      let rows = $$('#view .trow').map(r => S.tasks.get(+r.dataset.id)).filter(x => x && x.parent_id === target.parent_id && x.id !== id);
      if (mode === 'prio' && !kcol) {  // dropping into another priority block takes over that priority
        if (target.priority !== t.priority) { item.priority = target.priority; toast(tr('Priority: {0}', tr([N_('None'), N_('Low'), '', N_('Medium'), '', N_('High')][target.priority]))); }
        rows = rows.filter(x => x.priority === target.priority);
      }
      const i = rows.findIndex(x => x.id === target.id);
      if (dropAfter(row, clientY)) {  // after the target: between it and its successor
        const next = rows[i + 1];
        item.sort = next && next.list_id === target.list_id ? (target.sort + next.sort) / 2 : target.sort + 1;
      } else {
        const prev = rows[i - 1];
        item.sort = prev && prev.list_id === target.list_id ? (prev.sort + target.sort) / 2 : target.sort - 1;
      }
      if (target.list_id !== t.list_id) item.list_id = target.list_id;
      if (target.parent_id !== t.parent_id) {
        try { await patchTask(id, {parent_id: target.parent_id, ...(target.list_id !== t.list_id ? {list_id: target.list_id} : {})}); } catch { return; }
        if (!target.parent_id) toast(tr('Subtask is now standalone'));
      }
      if (!kcol) { const g = row.closest('.group')?.querySelector('.ghead[data-section]'); if (g) item.section_id = g.dataset.section ? +g.dataset.section : null; }
      if ((mode === 'date' || mode === 'title') && !kcol) LS.set('sort2.' + S.route.key, 'prio');  // a manual drop switches to prio + manual
    } else if (!kcol) return;
  }
  Object.assign(t, item);
  render();
  await api('POST', '/api/tasks/reorder', {items: [item]});
  await load(); render();
}

// ------------------------------------------------------------------ swipe (touch)
let swipe = null, swiped = false;
document.addEventListener('touchstart', e => {
  const r = e.target.closest('#view .trow'); swiped = false;
  if (!r || e.target.closest('.chk')) { swipe = null; return; }
  swipe = {r, x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0, lock: null};
}, {passive: true});
document.addEventListener('touchmove', e => {
  if (!swipe || (lp && lp.active)) return;
  const dx = e.touches[0].clientX - swipe.x, dy = e.touches[0].clientY - swipe.y;
  if (swipe.lock === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) swipe.lock = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
  if (swipe.lock !== 'x') return;
  swipe.dx = dx;
  swipe.r.style.transform = `translateX(${dx}px)`;
  swipe.r.style.background = dx > 60 ? 'color-mix(in srgb,var(--ok) 25%,var(--bg))' : dx < -60 ? 'color-mix(in srgb,var(--danger) 25%,var(--bg))' : 'var(--bg2)';
}, {passive: true});
document.addEventListener('touchend', () => {
  if (!swipe) return;
  const {r, dx, lock} = swipe; swipe = null;
  r.style.transition = 'transform .18s'; r.style.transform = ''; r.style.background = '';
  setTimeout(() => { r.style.transition = ''; }, 200);
  if (lock !== 'x') return;
  swiped = true; setTimeout(() => { swiped = false; }, 350);
  const id = +r.dataset.id;
  if (dx > 90) toggleTask(id);
  else if (dx < -90) snoozeSheet(id, r, ['-', {label: tr('Completed'), icon: 'done', fn: () => toggleTask(id)}, {label: tr('Delete'), icon: 'trash', cls: 'flag-5', fn: () => deleteTask(id)}]);
});

// long press (380 ms) on a row / chip, then drag: reorder, other kanban column, quadrant, calendar day
let lp = null;
document.addEventListener('touchstart', e => {
  const r = e.target.closest('#view .trow, #view .ev, #view .wev, #detail .subs .trow');
  if (!r || !r.dataset.id || e.target.closest('.chk, input, .caret') || S.multiMode || r.classList.contains('ghost')) { lp = null; return; }
  const t0 = e.touches[0];
  lp = {r, id: +r.dataset.id, x: t0.clientX, y: t0.clientY, active: false};
  lp.timer = setTimeout(startTouchDrag, 380);
}, {passive: true});
function startTouchDrag() {
  if (!lp || !S.tasks.has(lp.id)) { lp = null; return; }
  lp.active = true; swipe = null;
  const rect = lp.r.getBoundingClientRect();
  const g = lp.r.cloneNode(true);
  g.classList.add('ghost-drag');
  g.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;z-index:95;pointer-events:none`;
  document.body.appendChild(g);
  lp.ghost = g; lp.dy = lp.y - rect.top; lp.dx0 = lp.x - rect.left;
  lp.r.classList.add('dragging');
  if (navigator.vibrate) navigator.vibrate(12);
}
document.addEventListener('touchmove', e => {
  if (!lp) return;
  const t = e.touches[0];
  if (!lp.active) { if (Math.hypot(t.clientX - lp.x, t.clientY - lp.y) > 8) { clearTimeout(lp.timer); lp = null; } return; }
  e.preventDefault();
  lp.ghost.style.top = (t.clientY - lp.dy) + 'px';
  lp.ghost.style.left = (t.clientX - lp.dx0) + 'px';
  lp.lx = t.clientX; lp.ly = t.clientY;
  markDrop(document.elementFromPoint(t.clientX, t.clientY), lp.id, t.clientY);
  // hold at the left edge: open the list drawer so the task can be dropped on another list
  if (isMobile() && t.clientX < 26 && !$('#side').classList.contains('open')) {
    if (!lp.edge) lp.edge = setTimeout(() => { $('#side').classList.add('open'); if (S.sel) $('#detail').style.visibility = 'hidden'; lp && (lp.opened = true); }, 450);
  } else if (lp.edge && t.clientX >= 26) { clearTimeout(lp.edge); lp.edge = null; }
  const v = $('#view'), vr = v.getBoundingClientRect();
  if (t.clientY < vr.top + 60) v.scrollBy(0, -14); else if (t.clientY > vr.bottom - 110) v.scrollBy(0, 14);
  const k = $('.kanban'); if (k) { if (t.clientX < 30) k.scrollBy(-16, 0); else if (t.clientX > innerWidth - 30) k.scrollBy(16, 0); }
  const wb = $('#wbody'); if (wb) { const r = wb.getBoundingClientRect(); if (t.clientY < r.top + 40) wb.scrollBy(0, -12); else if (t.clientY > r.bottom - 40) wb.scrollBy(0, 12); }
}, {passive: false});
function endTouchDrag() {
  if (!lp) return;
  clearTimeout(lp.timer);
  const st = lp; lp = null;
  if (!st.active) return;
  clearTimeout(st.edge);
  st.ghost.remove(); st.r.classList.remove('dragging');
  if (st.opened) setTimeout(() => { closeSide(); $('#detail').style.visibility = ''; }, 150);
  swiped = true; setTimeout(() => { swiped = false; }, 400);
  const el = st.ly != null ? document.elementFromPoint(st.lx, st.ly) : null;
  $$('.dropbefore,.dropafter,.drop').forEach(x => x.classList.remove('dropbefore', 'dropafter', 'drop'));
  if (el) dropTask(st.id, el, st.ly);
}
document.addEventListener('touchend', endTouchDrag);
document.addEventListener('touchcancel', endTouchDrag);

// ------------------------------------------------------------------ boot
(async () => {
  const i18nBoot = i18nLoad(uiLang());  // last used language (localStorage), in parallel with the state
  try { await load(); if (!S.lists.length) throw new Error('no state'); } catch (e) { await i18nBoot; $('#view').innerHTML = `<div class="empty">${tr('Server not reachable.')}<br>${tr('Reload the page once the server is reachable again.')}</div>`; return; }
  await i18nBoot; await i18nLoad(uiLang()); S.booted = true;  // render in the server-side language
  if (new URLSearchParams(location.search).get('share') === 'err') {
    history.replaceState(null, '', '/#inbox'); await route();
    toast(tr('Share: the file could not be received'));
  } else if (new URLSearchParams(location.search).get('share') === '1') {  // files shared via the service worker
    let meta = {title: '', text: '', url: '', files: []}, files = [];
    try {
      const c = await caches.open('tasks-share');
      const m = await c.match('/share-inbox/meta');
      if (m) meta = await m.json();
      files = await Promise.all(meta.files.map(async (f, i) => { const r = await c.match(`/share-inbox/${i}`); return r ? new File([await r.blob()], f.name, {type: f.type}) : null; }));
      files = files.filter(Boolean);
      await caches.delete('tasks-share');
    } catch { /* no cache api */ }
    // Chrome on Android currently hands over no files to installed web apps (verified 2026-09-25)
    if (!files.length && !meta.text && !meta.url && !meta.title) toast(tr('Please share images and files via the ntfy app (topic inbox)'));
    history.replaceState(null, '', '/#inbox');
    await route();
    const url = meta.url || (meta.text.match(/https?:\/\/\S+/) || [])[0] || '';
    const title = meta.title || meta.text.replace(url, '').trim() || (url ? url : '') || (files[0] ? files[0].name.replace(/\.[^.]+$/, '') : '');
    openQuickSheet(title, {content: url && url !== title ? url : '', list_id: inbox().id, files});
  } else if (location.pathname === '/share') {  // Android share sheet (text only, old manifest) -> new task
    const q = new URLSearchParams(location.search);
    const text = (q.get('text') || '').trim(), url = (q.get('url') || (text.match(/https?:\/\/\S+/) || [])[0] || '').trim();
    const title = (q.get('title') || '').trim() || text.replace(url, '').trim() || url;
    history.replaceState(null, '', '/#inbox');
    await route();
    openQuickSheet(title, {content: url && url !== title ? url : '', list_id: inbox().id});
  } else await route();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
})();
