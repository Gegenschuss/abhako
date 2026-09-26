/* Abhako — self-hosted task manager inspired by TickTick and Asana. Vanilla JS, no build step.
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
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  at: '<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>',
  comment: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 16v-5M12 16V8M17 16v-8"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
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
// multi-user: everything under tasks.* belongs to the logged-in user (cache, outbox, tab bar, ...) except
// these device preferences. Wiped on logout and when another user logs in in the same browser.
const LS_KEEP = new Set(['tasks.theme', 'tasks.i18n']);
function clearLocal() {
  try {
    const ks = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('tasks.') && !LS_KEEP.has(k)) ks.push(k); }
    ks.forEach(k => localStorage.removeItem(k));
  } catch { /* private mode */ }
}
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
  settings: {}, counts: {}, v: 0, ntfyUrl: 'https://ntfy.sh', me: null,
  route: {mod: 'tasks', key: 'today'}, sel: null, extra: null,
  collapsed: new Set(LS.get('collapsed', [])),
  calMonth: null, calSel: today(), quick: {ignore: new Set()},
  filters: [], multi: new Set(), multiMode: false, occ: {key: '', items: []},
  calMode: LS.get('calMode', 'month'), tlStart: null, quickPreset: {}, editContent: false,
  tl: {id: null}, drafts: {}, cfiles: {}, cedit: null, editLink: false,  // comments timeline of the open task
};
const FEATS = [['cal', N_('Calendar')], ['timeline', N_('Timeline')], ['matrix', N_('Eisenhower matrix')], ['habits', N_('Habits')], ['pomo', N_('Focus (Pomodoro)')], ['kanban', N_('Kanban')], ['paperless', N_('Paperless link')], ['collab', N_('Collaboration')], ['stats', N_('Statistics')], ['time', N_('Time tracking')]];
const FEAT_DESC = {collab: N_('Comments, activity history, @mentions, News, sharing lists and assigning tasks'), stats: N_('Completed tasks, on-time rate, overdue trend, focus time and habit streaks'),
  time: N_('Timer on tasks, manual entries, reports per list and task, CSV export and a printable timesheet')};
const feat = f => (S.settings.features ?? FEATS.map(x => x[0]).join(',')).split(',').includes(f);
// collaboration module off: no comments / activity / mentions / sharing / assigning in the UI (data stays, API works)
const collab = () => feat('collab');
// module views: tasks always, News with the collaboration module, the rest by their own switch
const modOn = m => m === 'tasks' || (m === 'news' ? collab() : feat(m));
// no "+" button on views without tasks
const noFab = () => ['habits', 'pomo', 'news', 'stats', 'time'].includes(S.route.mod) || ['done', 'trash', 'search'].includes(S.route.key);
const inbox = () => S.lists.find(l => l.is_inbox);
const listById = id => S.lists.find(l => l.id === id);
// sharing: role of the logged-in user in a list (owner | edit | view); view = read only
const listRole = id => listById(id)?.role || 'owner';
const canEditList = id => listRole(id) !== 'view';
const canEdit = t => !!t && canEditList(t.list_id);
const isOwner = l => !l || !l.role || l.role === 'owner';
const hasSharing = () => collab() && S.lists.some(l => l.shared);
const listPeople = l => !l ? [] : [{user_id: l.owner_id, name: l.owner_name || S.me?.display_name || '', role: 'owner'}, ...(l.members || [])];
const personName = (lid, uid) => listPeople(listById(lid)).find(p => p.user_id === uid)?.name || '';
const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
function roToast() { toast(tr('View only: you cannot change this shared list')); }
const children = id => [...S.tasks.values()].filter(t => t.parent_id === id).sort(bySort);
const bySort = (a, b) => a.sort - b.sort || a.id - b.id;
function openTasks() { return [...S.tasks.values()].filter(t => t.status === 0); }

// ------------------------------------------------------------------ api + offline outbox
// While offline, task/habit writes are applied locally and queued (localStorage outbox); on reconnect
// they are replayed in order (last write wins, `_prev` detects edits made elsewhere). Tasks created
// offline get a negative temp id that is mapped to the real id during replay. The last server state is
// cached for offline start. Every queued op carries the user id: ops of another user are never replayed.
class Offline extends Error {}
const OUT = {q: LS.get('outbox', []), online: true, flushing: false};
function setOnline(b) { if (OUT.online !== b) { OUT.online = b; renderTop(); if (b) flush(); } }
async function rawFetch(method, url, body) {
  const opt = {method, headers: {'X-Requested-With': 'abhako'}, redirect: 'manual'};
  if (body instanceof FormData) opt.body = body;
  else if (body !== undefined) { opt.body = JSON.stringify(body); opt.headers['Content-Type'] = 'application/json'; }
  let r;
  try { r = await fetch(url, opt); } catch { setOnline(false); throw new Offline('offline'); }
  setOnline(true);
  if (r.type === 'opaqueredirect' || (r.headers.get('content-type') || '').includes('text/html')) {
    location.reload();  // login session expired -> login page
    throw new Error('auth');
  }
  const j = await r.json().catch(() => ({}));
  if ((r.status === 401 || r.status === 403) && j.auth) { authScreen(j); throw new Error('auth'); }  // built-in login
  if (r.status === 401) { location.reload(); throw new Error('auth'); }
  if (!r.ok) { const e = new Error(j.error || tr('Error {0}', r.status)); e.status = r.status; throw e; }
  return j;
}
const queueable = (method, url) => method !== 'GET' && /^\/api\/(tasks|habits\/\d+\/log|time\/(start|stop|entries))/.test(url) && !/\/(comments|seen|timeline)$/.test(url);
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
  const e = {method, url, body, uid: S.me?.id};
  if (method === 'POST' && url === '/api/tasks') e.tmp = -Date.now() - Math.floor(Math.random() * 1000);
  OUT.q.push(e); LS.set('outbox', OUT.q);
  renderTop();
  if (OUT.online) setTimeout(flush, 50);
  const r = applyLocal(e);
  if (r && typeof r === 'object') Object.defineProperty(r, '_q', {value: e, configurable: true});  // for undo (see UNDO)
  return r;
}
function applyLocal(e) {
  const {method, url, body = {}} = e;
  const m = url.match(/^\/api\/tasks\/(-?\d+)(?:\/(\w+))?/);
  const nowIso = new Date().toISOString();
  if (url.startsWith('/api/time/')) return timeLocal(e);
  if (method === 'POST' && url === '/api/tasks') {
    const par = body.parent_id && S.tasks.get(body.parent_id);
    const t = {id: e.tmp, list_id: body.list_id || (par ? par.list_id : inbox().id), section_id: body.section_id ?? null, parent_id: body.parent_id ?? null,
      title: body.title, content: body.content || '', priority: body.priority || 0, status: 0, due: body.due || null, due_time: body.due_time || null,
      reminders: body.reminders || '', repeat: body.repeat || '', repeat_from: body.repeat_from || 'due', url: body.url || null,
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
      if (e.uid && S.me && e.uid !== S.me.id) { OUT.q.shift(); LS.set('outbox', OUT.q); continue; }  // another user's op
      const url = e.url.replace(/\/(-\d+)(?=\/|$)/, (_, n) => '/' + (idmap[n] || n));
      let body = e.body;
      if (body && body.parent_id) body = {...body, parent_id: fix(body.parent_id)};
      if (body && body.task_id) body = {...body, task_id: fix(body.task_id)};
      if (body && body.items) body = {...body, items: body.items.map(it => ({...it, id: fix(it.id)}))};
      if (body && body.ids) body = {...body, ids: body.ids.map(fix)};
      try {
        const j = await rawFetch(e.method, url, body);
        if (e.tmp) { idmap[e.tmp] = j.id; LS.set('idmap', idmap); if (S.sel === e.tmp) S.sel = j.id; }
        if (j && j.conflicts?.length) addConflicts(j.id, j.conflicts, j.title);
        if (j && j.skipped) skipped++;
        e.res = j;
      } catch (err) {
        if (err instanceof Offline || err.message === 'auth') return;
        console.warn('outbox: dropped', e, err);  // e.g. 404: deleted on another device
        dropped++; e.res = null;
      }
      e.done = true;
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
const FIELD_NAMES = {title: N_('Title'), content: N_('Description'), due: N_('Date'), due_time: N_('Time'), priority: N_('Priority'), list_id: N_('List'), tags: N_('Tags'), reminders: N_('Reminder'), repeat: N_('Repeat'), repeat_from: N_('Repeat from'), start: N_('Start|date'), section_id: N_('Section'), parent_id: N_('Parent task'), pinned: N_('Pinned'), duration: N_('Duration'), url: N_('Link')};
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
  if (j.me) {  // another user than last time in this browser: drop everything local of the previous one
    const last = LS.get('uid', null);
    if (last !== null && last !== j.me.id) { clearLocal(); LS.set('uid', j.me.id); location.reload(); throw new Error('auth'); }
    if (last === null) LS.set('uid', j.me.id);
    S.me = j.me;
  }
  S.lists = j.lists; S.sections = j.sections; S.habits = j.habits; S.pomo = j.pomo;
  S.pomoToday = j.pomo_today; S.settings = j.settings; S.languages = j.languages || [{code: 'en', name: 'English'}]; LS.set('lang', j.settings.lang || 'en'); document.documentElement.lang = j.settings.lang || 'en'; S.counts = j.counts; S.v = j.v; S.ntfyUrl = j.ntfy_url;
  S.tasks = new Map(j.tasks.map(t => [t.id, t]));
  S.filters = j.filters || [];
  S.paperless = j.paperless || {enabled: false};
  S.ntfyInbox = j.ntfy_inbox || {enabled: false};
  S.news = j.news || {unread: 0, sig: ''};
  S.templates = j.templates || [];
  S.timer = j.timer || null; S.timeTotals = j.time_totals || {};
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
  if (S.sel && collab() && S.tl.id === S.sel && S.tl.v !== S.v) loadTimeline(S.sel);
  if (S.sel && timeOn() && S.te.tid === S.sel && S.te.v !== S.v) loadTaskTime(S.sel);
}
async function loadExtra() {
  const k = S.route.key;
  if (S.route.mod === 'tasks' && (k === 'done' || k === 'trash')) {
    S.extra = (await api('GET', `/api/tasks?scope=${k}`)).tasks;
  } else if (S.route.mod !== 'news' && S.route.mod !== 'time') S.extra = null;  // News / time reports: tasks fetched on demand stay
}
function putTask(t) { S.tasks.set(t.id, t); }

// poll for changes made elsewhere (phone <-> desktop)
setInterval(async () => {
  if (document.hidden) return;
  try {
    if (OUT.q.length) { flush(); return; }
    const {v, n} = await api('GET', '/api/version');
    if ((v !== S.v || (n !== undefined && collab() && n !== S.news?.sig)) && !editing()) { await load(); render(); }
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
  assigned: {name: N_('Assigned to me'), icon: 'user'},
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
  if (['cal', 'matrix', 'habits', 'pomo', 'news', 'stats', 'time'].includes(a)) return {mod: a, key: a};
  if (SMART[a]) return {mod: 'tasks', key: a};
  return {mod: 'tasks', key: 'today'};
}
function go(hash) { if (location.hash !== '#' + hash) location.hash = hash; else route(); }
async function route() {
  const r = parseHash();
  if (!modOn(r.mod)) {  // e.g. the "News" app shortcut while collaboration is off
    const off = r.mod;
    if (S.booted && (off === 'news' || off === 'stats' || off === 'time')) setTimeout(() => toast(off === 'news' ? tr('News are part of the collaboration module, which is off (Settings > Layout)') : off === 'time' ? tr('Time tracking is off (Settings > Layout)') : tr('Statistics are off (Settings > Layout)')), 50);
    r.mod = 'tasks'; r.key = LS.get('lastKey', 'today');
  }
  if (r.key.startsWith('f:') && !S.filters.some(f => f.id === +r.key.slice(2))) r.key = 'today';
  S.route = {mod: r.mod, key: r.key};
  if (S.route.mod !== 'tasks' || r.key !== S.lastRouteKey) { S.multi.clear(); S.multiMode = false; }
  S.lastRouteKey = r.key;
  if (r.mod === 'tasks' && r.key !== 'search') LS.set('lastKey', r.key);
  S.extra = (r.key === 'done' || r.key === 'trash' || r.mod === 'news' || r.mod === 'time') ? [] : null;
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
  // website link: the first http(s) URL goes into the link field, not the title
  take(/\s(https?:\/\/[^\s]+)(?=\s)/i, 'link', m => { out.url = m[1].replace(/[.,;:!?]+$/, ''); return urlHost(out.url); });
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
    const W = S.lists.filter(x => x.role !== 'view');
    const l = W.find(x => norm(lname(x)).startsWith(q) || norm(x.name).startsWith(q)) || W.find(x => nm(x).includes(q));
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
// website link display: domain without www. (chip), domain + path (title of a bare shared link)
const urlParse = u => { try { return new URL(u); } catch { return null; } };
const urlHost = u => { const x = urlParse(u); return x ? x.hostname.replace(/^www\./, '') : String(u || ''); };
const urlTitle = u => { const x = urlParse(u); return x ? (x.hostname.replace(/^www\./, '') + x.pathname.replace(/\/+$/, '')).slice(0, 120) : String(u || '').slice(0, 120); };
// shared text -> [link, text without it]: the first http(s) URL, trailing punctuation is not part of it
function shareLink(text, url) {
  text = String(text || '');
  const clean = s => s.replace(/\s+/g, ' ').trim().replace(/^[-–—|:·\s]+|[-–—|:·\s]+$/g, '');
  if (url) return [url, clean(text.replace(url, ''))];
  const m = text.match(/https?:\/\/\S+/);
  if (!m) return ['', clean(text)];
  return [m[0].replace(/[.,;:!?]+$/, ''), clean(text.slice(0, m.index) + text.slice(m.index + m[0].length))];
}
const validUrl = u => /^https?:\/\/[^\s/?#]+\S*$/i.test(u || '') && u.length <= 2000;
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
  if (k === 'assigned') return {...pick(t => !!S.me && t.assignee_id === S.me.id, 'list'), done: []};
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
  if (k === 'assigned' && S.me) d.assignee_id = S.me.id;
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
  $('#fab').classList.toggle('gone', noFab() || S.multi.size > 0);
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
const SMART_TABS = ['today', 'tomorrow', 'week', 'inbox', 'assigned', 'all', 'done', 'trash'];
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
  if (kind === 's' && v === 'assigned' && !collab()) return null;
  if (kind === 's' && SMART[v]) return {id, go: v, icon: ic(SMART[v].icon, 'l'), label: v === 'week' ? tr('7 days') : tr(SMART[v].name), key: v};
  if (kind === 'l') {
    const l = listById(+v); if (!l || l.is_inbox) return null;
    const em = leadEmoji(l.name), name = em ? l.name.slice(em.length).trim() : l.name;
    return {id, go: 'l/' + v, icon: em ? `<span class="temoji">${em}</span>` : `<span class="tsw" style="${l.color ? 'background:' + l.color : ''}"></span>`, label: name, key: 'l:' + v};
  }
  if (kind === 'f') { const f = S.filters.find(x => x.id === +v); return f ? {id, go: 'f/' + v, icon: ic('filter', 'l'), label: f.name, key: 'f:' + v} : null; }
  if (kind === 'tag' && v) return {id, go: 'tag/' + encodeURIComponent(v), icon: ic('tag', 'l'), label: v, key: 'tag:' + v};
  if (id === 'news') return collab() ? {id, go: 'news', icon: ic('bell', 'l'), label: tr('News'), mod: 'news'} : null;
  if (id === 'stats') return feat('stats') ? {id, go: 'stats', icon: ic('chart', 'l'), label: tr('Statistics'), mod: 'stats'} : null;
  if (id === 'time') return timeOn() ? {id, go: 'time', icon: ic('clock', 'l'), label: tr('Time|tracked'), mod: 'time'} : null;
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
  const nb = t.id === 'news' && S.news?.unread ? `<span class="nbadge">${S.news.unread > 99 ? '99+' : S.news.unread}</span>` : '';
  return `<button class="${cls} ${on ? 'on' : ''}" ${tgt} title="${esc(t.label)}">${t.icon}<span>${esc(t.label)}</span>${t.mod === 'pomo' && S.pomo ? '<span class="dot"></span>' : ''}${t.mod === 'time' && S.timer ? '<span class="dot rec"></span>' : ''}${nb}</button>`;
}
function renderRail() {
  const items = tabItems().filter(t => t.id !== 'search' && t.id !== 'settings'), on = tabOn(items);
  const extra = mods().filter(([m]) => !items.some(t => t.mod === m)).map(([m]) => tabItem('m:' + m));  // desktop: nothing hidden
  $('#rail').innerHTML = `<div class="logo"><img src="/static/icon.svg" alt="Abhako"></div>` +
    [...items, ...extra].map(t => tabBtn(t, t.id === on && S.route.key !== 'search', 'rbtn')).join('') +
    `<button class="rbtn ${S.route.key === 'search' ? 'on' : ''}" data-go="search" title="${tr('Search (/)')}">${ic('search')}</button>
     ${feat('stats') && !items.some(t => t.id === 'stats') ? `<button class="rbtn ${S.route.mod === 'stats' ? 'on' : ''}" data-go="stats" title="${tr('Statistics')}">${ic('chart')}</button>` : ''}
     ${timeOn() && !items.some(t => t.id === 'time') ? `<button class="rbtn ${S.route.mod === 'time' ? 'on' : ''}" data-go="time" title="${tr('Time tracking')}">${ic('clock')}${S.timer ? '<span class="dot rec"></span>' : ''}</button>` : ''}
     <div class="spacer"></div>
     <button class="rbtn" data-act="settings" title="${tr('Settings')}">${ic('gear')}</button>`;
}
// what "Mehr" offers: overflow tabs + enabled modules that are not pinned + search/settings if not pinned
function tabOverflow() {
  const items = tabItems(), shown = items.length > TAB_MAX ? items.slice(0, TAB_MAX - 1) : items;
  const rest = items.slice(shown.length);
  const mods2 = mods().filter(([m]) => !items.some(t => t.mod === m)).map(([m]) => tabItem('m:' + m));
  const misc = ['news', 'stats', 'time', 'search', 'settings'].filter(k => !items.some(t => t.id === k)).map(tabItem).filter(Boolean);
  // search + settings are also in the side menu: they alone do not justify a "Mehr" tab
  return {shown, more: rest.length || mods2.length ? [...rest, ...mods2, ...misc] : []};
}
function renderTabs() {
  const {shown, more} = tabOverflow(), all = tabItems(), on = tabOn(all);
  // highlight "Mehr" when the current view is only reachable through it (overflow tab, unpinned module, search)
  const moreOn = more.length > 0 && (on ? !shown.some(t => t.id === on) : (S.route.mod !== 'tasks' && S.route.mod !== 'news') || S.route.key === 'search');
  $('#tabs').innerHTML = shown.map(t => tabBtn(t, t.id === on)).join('') +
    (more.length ? `<button class="${moreOn ? 'on' : ''}" data-act="tabs-more">${ic('dots', 'l')}<span>${tr('More')}</span></button>` : '');
}
function tabsMore(anchor) {
  const {more} = tabOverflow();
  menu(anchor, [...more.map(t => ({label: t.id === 'news' && S.news?.unread ? `${t.label} (${S.news.unread})` : t.label, icon: t.id === 'settings' ? 'gear' : t.id === 'search' ? 'search' : t.id === 'news' ? 'bell' : t.id === 'stats' ? 'chart' : t.id === 'time' ? 'clock' : t.mod ? MODS.find(x => x[0] === t.mod)[1] : t.id.startsWith('f:') ? 'filter' : t.id.startsWith('tag:') ? 'tag' : t.id.startsWith('s:') ? SMART[t.key].icon : 'list',
    fn: () => t.act ? settingsModal() : go(t.go)})), '-', {label: tr('Customize tab bar'), icon: 'edit', fn: () => settingsModal('tabbar')}]);
}
function counts() {
  const t0 = today(), c = {today: 0, tomorrow: 0, week: 0, over: 0, all: 0, assigned: 0, lists: {}, tags: {}, filters: {}};
  for (const f of S.filters) c.filters[f.id] = openTasks().filter(t => !t.parent_id && filterMatch(t, f.rules)).length;
  for (const t of openTasks()) {
    if (t.parent_id) continue;
    c.all++;
    if (S.me && t.assignee_id === S.me.id) c.assigned++;
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
  const row = (key, icon, name, n, extra = '', after = '') =>
    `<button class="srow ${onTasks && k === key ? 'on' : ''}" data-go="${keyToHash(key)}" data-drop="${key}" ${extra}>${icon}<span class="n">${esc(name)}</span>${after}<span class="c ${key === 'today' && c.over ? 'over' : ''}">${n || ''}</span></button>`;
  const lists = S.lists.filter(l => !l.is_inbox && !l.archived);
  const listRow = l => {
    const sw = l.color || /^\p{L}/u.test(l.name) ? `<span class="sw" style="${l.color ? 'background:' + l.color : ''}"></span>` : '';
    const shr = l.shared && collab() ? `<span class="shr" title="${esc(isOwner(l) ? tr('Shared by you') : tr('Shared by {0}', l.owner_name))}">${ic('users', 's')}</span>` : '';
    if (S.listReorder) return `<div class="srow reorder" data-list="${l.id}">${sw}<span class="n">${esc(listName(l.name))}</span>${shr}<button class="iconbtn" data-lfolder="${l.id}" title="${tr('Move to folder')}">${ic('folder', 's')}</button><button class="iconbtn" data-lmove="-1" data-id="${l.id}" title="${tr('move up')}">${ic('chev', 's up')}</button><button class="iconbtn" data-lmove="1" data-id="${l.id}" title="${tr('move down')}">${ic('chev', 's')}</button></div>`;
    return row('l:' + l.id, sw, listName(l.name), c.lists[l.id], `data-list="${l.id}" ${isMobile() ? '' : 'draggable="true"'}`, shr);
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
    ${collab() && (hasSharing() || c.assigned) ? row('assigned', ic('user'), tr('Assigned to me'), c.assigned) : ''}${collab() && (hasSharing() || S.news?.unread) ? `<button class="srow ${S.route.mod === 'news' ? 'on' : ''}" data-go="news">${ic('bell')}<span class="n">${tr('News')}</span><span class="c ${S.news?.unread ? 'nunread' : ''}">${S.news?.unread || ''}</span></button>` : ''}
    <div class="sgroup"><div class="shead lroot"><span class="spacer">${tr('Lists')}</span><button data-act="lists-reorder" class="${S.listReorder ? 'on' : ''}" title="${tr('Sort lists')}">${ic('sort', 's')}</button><button data-act="list-new" title="${tr('New list')}">${ic('plus', 's')}</button></div>${lh || `<div class="folder">${tr('No lists yet')}</div>`}</div>
    <div class="sgroup"><div class="shead"><span class="spacer">${tr('Filters')}</span><button data-act="filter-new" title="${tr('New filter')}">${ic('plus', 's')}</button></div>${S.filters.map(f => row('f:' + f.id, ic('filter'), f.name, c.filters[f.id])).join('') || `<div class="folder">${tr('Combine lists, dates, priorities, tags')}</div>`}</div>
    ${tags.length ? `<div class="sgroup"><div class="shead">${tr('Tags')}</div>${tags.map(t => row('tag:' + t, ic('tag'), t, c.tags[t])).join('')}</div>` : ''}
    <div class="sgroup sfoot">
      ${row('all', ic('all'), tr('All'), c.all)}
      ${row('done', ic('done'), tr('Completed'), '')}
      ${row('trash', ic('trash'), tr('Trash'), S.counts.trash || '')}
      ${archived.length ? `<div class="folder">${ic('eye', 's')}${tr('Archived')}</div>` + archived.map(l => row('l:' + l.id, `<span class="sw"></span>`, listName(l.name), '', `data-list="${l.id}"`)).join('') : ''}
      ${feat('stats') ? `<button class="srow ${S.route.mod === 'stats' ? 'on' : ''}" data-go="stats">${ic('chart')}<span class="n">${tr('Statistics')}</span></button>` : ''}
      ${timeOn() ? `<button class="srow ${S.route.mod === 'time' ? 'on' : ''}" data-go="time">${ic('clock')}<span class="n">${tr('Time tracking')}</span>${S.timer ? '<span class="c"><span class="recdot"></span></span>' : ''}</button>` : ''}
      <button class="srow" data-go="search">${ic('search')}<span class="n">${tr('Search')}</span></button>
      <button class="srow" data-act="settings">${ic('gear')}<span class="n">${tr('Settings')}</span></button>
      ${S.me ? `<button class="srow suser" data-act="user-menu" title="${esc(S.me.username)}"><span class="avatar">${esc(initials(S.me.display_name))}</span><span class="n">${esc(S.me.display_name)}</span></button>` : ''}
    </div>`;
}
function renderTop() {
  const m = S.route.mod, k = S.route.key;
  let title = m === 'tasks' ? titleFor(k) : tr({cal: N_('Calendar'), matrix: N_('Eisenhower matrix'), habits: N_('Habits'), pomo: N_('Focus'), news: N_('News'), stats: N_('Statistics'), time: N_('Time tracking')}[m]);
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
  $('#top').innerHTML = `<button class="iconbtn menu" data-act="side" aria-label="${tr('Menu')}">${ic('menu')}</button><h1>${esc(title)}</h1>${cf}${off}${timerPill()}${pm}${acts}${bellBtn()}`;
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
  else if (m === 'news') el.innerHTML = viewNews();
  else if (m === 'stats') el.innerHTML = viewStats();
  else if (m === 'time') el.innerHTML = viewTime();
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
  if (t.url) meta.push(`<a class="lnk" href="${esc(t.url)}" target="_blank" rel="noopener noreferrer" title="${esc(t.url)}">${ic('link', 's')}${esc(urlHost(t.url))}</a>`);
  if (timeOn() && t.id > 0) {
    const [ta, tm] = taskTime(t.id), live = S.timer && S.timer.task_id === t.id;
    if (ta >= 60 || live) meta.push(`<span class="tchip ${live ? 'live' : ''}" data-tt="${t.id}" title="${esc(live ? tr('Timer running') : ta - tm >= 60 ? tr('{0} in total, {1} by you', fmtDur(ta), fmtDur(tm)) : tr('Tracked: {0}', fmtDur(ta)))}">${ic('clock', 's')}<b>${fmtDur(ta)}</b></span>`);
  }
  if (t.comment_count && collab()) meta.push(`<span class="cmc ${t.unread ? 'unread' : ''}" title="${esc(t.unread ? trn('{0} new comment', '{0} new comments', t.unread) : trn('{0} comment', '{0} comments', t.comment_count))}">${ic('comment', 's')}${t.comment_count}</span>`);
  if (t.assignee_id && collab()) { const who = personName(t.list_id, t.assignee_id); meta.push(`<span class="who ${S.me && t.assignee_id === S.me.id ? 'me' : ''}" title="${esc(tr('Assigned to {0}', who || '?'))}">${esc(initials(who))}</span>`); }
  for (const g of t.tags) meta.push(`<span class="tag">#${esc(g)}</span>`);
  if (opts.trash) meta.push(`<span>${tr('deleted {0}', dayLabel(t.deleted_at.slice(0, 10)))}</span>`);
  const chk = t.status === 2 ? 'on' : t.status === -1 ? 'wont' : 'p' + t.priority;
  const collapsed = S.collapsed.has('t' + t.id);
  const ro = !opts.trash && !canEdit(t);
  const caret = opts.tree && openKids ? `<button class="caret ${collapsed ? 'closed' : ''}" data-act="collapse" data-key="t${t.id}">${ic('chev', 's')}</button>` : '';
  let h = `<div class="trow ${t.status ? 'done' : ''} ${opts.depth ? 'sub d' + opts.depth : ''} ${opts.subRow ? 'subrow' : ''} ${S.sel === t.id ? 'sel' : ''} ${S.multi.has(t.id) ? 'msel' : ''} ${ro ? 'ro' : ''}" data-id="${t.id}" ${opts.drag !== false && !opts.trash && !ro && !isMobile() ? 'draggable="true"' : ''}>
    ${caret}
    ${opts.trash ? `<span class="chk ${chk}">${t.status === 2 ? ic('check') : ''}</span>` : `<button class="chk ${chk}" data-act="toggle" aria-label="${tr('done')}" ${ro ? 'disabled' : ''}>${t.status === 2 ? ic('check') : t.status === -1 ? ic('x') : ''}</button>`}
    <div class="tmain" data-act="${opts.trash ? '' : 'open'}"><div class="ttl">${esc(t.title)}</div><div class="meta">${meta.join('')}</div></div>
    ${opts.trash ? `<button class="iconbtn" data-act="restore" title="${tr('Restore')}">${ic('undo')}</button><button class="iconbtn danger" data-act="purge" title="${tr('Delete permanently')}">${ic('x')}</button>` : ''}
  </div>`;
  if (opts.tree && openKids && !collapsed) h += kids.filter(k => k.status === 0).map(k => taskRow(k, {...opts, depth: (opts.depth || 0) + 1, showList: false})).join('');
  return h;
}
function qaddBox(extraCls = '') {
  return `<div class="qadd inline ${extraCls}"><div class="box">${ic('plus')}<input id="qinput" placeholder="${tr('Add task: “Dentist tomorrow 3pm !high #private ~list”')}" autocomplete="off" enterkeyhint="done">${tplBtn()}</div><div class="chips" id="qchips"></div></div>`;
}
function tplBtn() {
  return tplOf('task').length ? `<button class="iconbtn qtpl" data-act="tpl-use" title="${tr('New from template')}" aria-label="${tr('New from template')}">${ic('copy', 's')}</button>` : '';
}
function viewList() {
  const v = viewTasks();
  const groups = groupTasks(v);
  const showList = !v.list;
  const rl = v.list && listById(v.list), ro = rl && rl.role === 'view';
  let h = ro ? `<div class="rohint">${ic('eye', 's')}${esc(tr('View only, shared by {0}', rl.owner_name))}</div>` : qaddBox();
  const total = groups.reduce((n, g) => n + g.tasks.length, 0);
  if (!total) {
    h += `<div class="empty">${ic(S.route.key === 'today' ? 'sun' : 'done')}${S.route.key === 'today' ? tr('Nothing left for today.') : tr('No tasks.')}</div>`;
  }
  for (const g of groups) {
    const closed = S.collapsed.has(g.id);
    if (g.name) h += `<div class="group"><div class="ghead ${g.cls || ''} ${closed ? 'closed' : ''}" data-act="collapse" data-key="${g.id}" ${g.section !== undefined ? `data-section="${g.section ?? ''}"` : ''}>${ic('chev', 's')}${esc(g.name)} <span class="c">${g.tasks.length}</span>${g.section && !ro ? `<button class="iconbtn gact" data-act="section-menu" data-id="${g.section}">${ic('dots', 's')}</button>` : ''}</div>`;
    if (!closed) h += g.tasks.map(t => taskRow(t, {showList, tree: true})).join('');
    if (g.name) h += '</div>';
  }
  if (v.list && !ro) h += `<button class="iconbtn" data-act="section-new" style="margin:6px 0 0 -4px">${ic('plus', 's')} ${tr('Section')}</button>`;
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
  const secs = S.sections.filter(s => s.list_id === lid), ro = !canEditList(lid);
  const tasks = sortTasks(openTasks().filter(t => t.list_id === lid && !t.parent_id));
  const cols = [];
  const loose = tasks.filter(t => !t.section_id || !secs.some(s => s.id === t.section_id));
  if (loose.length || !secs.length) cols.push({id: null, name: secs.length ? tr('Unassigned') : tr('Tasks'), tasks: loose});
  for (const s of secs) cols.push({id: s.id, name: s.name, tasks: tasks.filter(t => t.section_id === s.id)});
  return `<div class="kanban">${cols.map(c => `
    <div class="kcol" data-kcol="${c.id ?? ''}">
      <div class="khead">${esc(c.name)} <span class="c">${c.tasks.length}</span>${c.id && !ro ? `<button class="iconbtn" data-act="section-menu" data-id="${c.id}">${ic('dots', 's')}</button>` : ''}</div>
      <div class="kcards">${c.tasks.map(t => taskRow(t, {compact: true})).join('')}</div>
      ${ro ? '' : `<div class="kadd"><input placeholder="${tr('+ Task')}" data-kadd="${c.id ?? ''}" enterkeyhint="done"></div>`}
    </div>`).join('')}
    ${ro ? '' : `<div class="knew"><button class="btn sm" data-act="section-new">${ic('plus', 's')} ${tr('Column')}</button></div>`}</div>`;
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
      ${ts.slice(0, 3).map(t => `<div class="ev p${t.priority} ${t.status ? 'done' : ''} ${t.ghost ? 'ghost' : ''}" data-id="${t.id}" draggable="${t.status || t.ghost || isMobile() || !canEdit(t) ? 'false' : 'true'}">${t.due_time ? `<span class="muted">${t.due_time}</span> ` : ''}${esc(t.title)}</div>`).join('')}
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
  const chip = t => `<div class="ev p${t.priority} ${t.status ? 'done' : ''} ${t.ghost ? 'ghost' : ''}" data-id="${t.id}" draggable="${t.status || t.ghost || isMobile() || !canEdit(t) ? 'false' : 'true'}">${esc(t.title)}</div>`;
  const now = new Date(), nowTop = (now.getHours() * 60 + now.getMinutes()) / 60 * H;
  const cols = days.map(d => {
    const blocks = layoutDay((map.get(d) || []).filter(t => t.due_time)).map(it => {
      const t = it.t, top = it.s / 60 * H, h = Math.max((it.e - it.s) / 60 * H, 20);
      return `<div class="wev p${t.priority} ${t.status ? 'done' : ''} ${t.ghost ? 'ghost' : ''}" data-id="${t.id}" draggable="${t.status || t.ghost || isMobile() || !canEdit(t) ? 'false' : 'true'}" style="top:${top}px;height:${h}px;left:calc(${it.lane} * 100% / ${it.n});width:calc(100% / ${it.n} - 2px)"><b>${t.due_time}</b> ${esc(t.title)}</div>`;
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
  const t = S.tasks.get(+b.dataset.id); if (!t || !canEdit(t)) return;
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
  const t = S.tasks.get(+b.dataset.id); if (!t || !canEdit(t)) return;
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
  if (tid && timeOn() && S.timer && (kind === 'focus' || kind === 'stopwatch')) setTimeout(() => toast(tr('A timer is running: this session is not tracked a second time')), 60);
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  render();
}

// ------------------------------------------------------------------ detail panel
let saveTimers = {};
function openDetail(id) {
  if (S.sel !== id) { S.editLink = false; S.cedit = null; S.mp = null; }
  S.sel = id; S.editContent = false;
  const d = $('#detail');
  d.classList.remove('hidden');
  $('#app').classList.add('detail-open');
  renderDetail();
  requestAnimationFrame(() => d.classList.add('open'));
  $$('.trow.sel').forEach(r => r.classList.remove('sel'));
  $$(`.trow[data-id="${id}"]`).forEach(r => r.classList.add('sel'));
  if (isMobile()) history.pushState({detail: id}, '', location.hash);
  if (collab() && id > 0 && S.tl.id !== id) S.tl = {id};
  loadTimeline(id);
  loadTaskTime(id);
}
function closeDetail(fromPop) {
  flushSaves();
  S.sel = null; S.tl = {id: null}; S.cedit = null; S.editLink = false; mentionClose();
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
  const ro = !canEdit(t), shared = l && l.shared;
  $('#detail').innerHTML = `
    <div class="dtop">
      <button class="iconbtn back" data-act="close-detail">${ic('back')}</button>
      <button class="chk ${t.status === 2 ? 'on' : t.status === -1 ? 'wont' : 'p' + t.priority}" data-act="toggle" data-id="${t.id}" aria-label="${tr('done')}" ${ro ? 'disabled' : ''}>${t.status === 2 ? ic('check') : ''}</button>
      <button class="dchip ${t.due ? 'set ' + dueClass(t) : ''}" data-act="date" data-id="${t.id}" ${ro ? 'disabled' : ''}>${ic('cal', 's')}${dueTxt}${t.repeat ? ' ' + ic('repeat', 's') : ''}${t.reminders && t.due ? ' ' + ic('bell', 's') : ''}</button>
      <span class="spacer"></span>
      ${ro ? `<span class="rotag" title="${esc(tr('View only, shared by {0}', l?.owner_name || ''))}">${ic('eye', 's')}${tr('View only')}</span>` : `<button class="iconbtn ${t.pinned ? 'on' : ''}" data-act="pin" data-id="${t.id}" title="${t.pinned ? tr('Unpin') : tr('Pin')}">${ic('pin')}</button>
      <button class="iconbtn ${t.priority ? 'flag-' + t.priority : ''}" data-act="prio" data-id="${t.id}" title="${tr('Priority')}">${ic('flag')}</button>
      <button class="iconbtn" data-act="task-menu" data-id="${t.id}" title="${tr('More')}">${ic('dots')}</button>`}
      <button class="iconbtn" data-act="close-detail" title="${tr('Close (Esc)')}" style="${isMobile() ? 'display:none' : ''}">${ic('x')}</button>
    </div>
    <div class="dbody">
      ${parent ? `<button class="dchip" data-act="open-id" data-id="${parent.id}" style="align-self:flex-start;padding-left:0">${ic('back', 's')}${esc(parent.title)}</button>` : ''}
      <div class="dtitle"><textarea id="d-title" rows="1" placeholder="${tr('Title')}" ${ro ? 'readonly' : ''}>${esc(t.title)}</textarea></div>
      <div class="md ${mdMode ? '' : 'hidden'}" id="d-md" title="${tr('Click to edit')}">${mdMode ? renderMd(t.content) : ''}</div>
      <textarea id="d-content" class="dcontent ${mdMode ? 'hidden' : ''}" placeholder="${tr('Description (Markdown: **bold**, - list, - [ ] checklist, links)')}" ${ro ? 'readonly' : ''}>${esc(t.content)}</textarea>
      <div class="dsec"><h5>${tr('Attachments')}</h5><div class="atts">${(t.attachments || []).map(attHtml).join('')}
        ${t.id > 0 && !ro ? `<label class="attadd" title="${tr('Images, PDFs, documents')}">${ic('clip', 's')}<span>${tr('Add file')}</span><input type="file" id="d-file" multiple hidden></label>` : ''}</div>
        ${isMobile() || ro ? '' : `<div class="muted atthint">${tr('or drop files here / paste an image with Ctrl+V')}</div>`}</div>
      ${plOn() ? `<div class="dsec"><h5>Paperless</h5><div class="plinks">${(t.paperless || []).map(plHtml).join('')}</div>
        ${t.id > 0 && !ro ? `<button class="attadd" data-act="pl-search">${ic('archive', 's')}<span>${tr('Link document')}</span></button>` : ''}</div>` : ''}
      <div class="dsec"><h5>${tr('Subtasks')}</h5><div class="subs">${kids.map(k => taskRow(k, {compact: true, subRow: true})).join('')}
        ${ro ? '' : depthOf(t) < 2 ? `<div class="subadd">${ic('plus', 's')}<input id="d-sub" placeholder="${tr('Add subtask')}" enterkeyhint="done"></div>` : `<div class="muted" style="font-size:12px;padding:4px">${tr('At most 3 levels')}</div>`}</div></div>
      <div class="dsec"><h5>${tr('Tags')}${shared && collab() ? ` <span class="muted h5note">${tr('only visible to you')}</span>` : ''}</h5><div class="tagedit">${t.tags.map(g => `<span class="tagpill">#${esc(g)}${ro ? '' : `<button data-act="tag-rm" data-tag="${esc(g)}">${ic('x', 's')}</button>`}</span>`).join('')}${ro ? '' : `<input id="d-tag" placeholder="${tr('+ Tag')}" list="taglist" enterkeyhint="done">`}<datalist id="taglist">${[...new Set([...S.tasks.values()].flatMap(x => x.tags))].map(g => `<option value="${esc(g)}">`).join('')}</datalist></div></div>
      <div class="dsec fields">
        <label>${tr('List')}</label><select id="d-list" ${ro ? 'disabled' : ''}>${S.lists.filter(x => (!x.archived && x.role !== 'view') || x.id === t.list_id).map(x => `<option value="${x.id}" ${x.id === t.list_id ? 'selected' : ''}>${esc(lname(x))}</option>`).join('')}</select>
        ${secs.length ? `<label>${tr('Section')}</label><select id="d-sec" ${ro ? 'disabled' : ''}><option value="">${tr('Unassigned')}</option>${secs.map(s => `<option value="${s.id}" ${s.id === t.section_id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>` : ''}
        <label>${tr('Link')}</label>${linkField(t, ro)}
        ${collab() && (shared || t.assignee_id) ? `<label>${tr('Assignee')}</label><select id="d-assignee" ${ro ? 'disabled' : ''}><option value="">${tr('Nobody')}</option>${listPeople(l).map(p => `<option value="${p.user_id}" ${p.user_id === t.assignee_id ? 'selected' : ''}>${esc(p.name)}${S.me && p.user_id === S.me.id ? ' ' + tr('(me)') : ''}</option>`).join('')}</select>` : ''}
      </div>
      ${timeOn() && t.id > 0 ? `<div class="dsec tesec" id="d-time">${taskTimeHtml(t)}</div>` : ''}
      ${collab() && t.id > 0 ? `<div class="dsec cmsec" id="d-tl">${timelineHtml(t)}</div>` : ''}
    </div>
    <div class="dfoot">${t.status === 2 && t.completed_at ? tr('Completed {0}', new Date(t.completed_at).toLocaleString(LOCALE(), {dateStyle: 'medium', timeStyle: 'short'})) : tr('Created {0}', new Date(t.created_at).toLocaleString(LOCALE(), {dateStyle: 'medium', timeStyle: 'short'}))}
      <span class="spacer"></span>
      ${timeOn() && t.id > 0 ? `<button class="iconbtn ${S.timer && S.timer.task_id === t.id ? 'recon' : ''}" data-act="timer-toggle" data-id="${t.id}" title="${S.timer && S.timer.task_id === t.id ? tr('Stop timer') : tr('Start timer')}">${ic(S.timer && S.timer.task_id === t.id ? 'stop' : 'clock', 's')}</button>` : ''}
      ${t.status === 0 ? `<button class="iconbtn" data-act="pomo-task" data-id="${t.id}" title="${tr('Start focus')}">${ic('timer', 's')}</button>` : ''}
      ${ro ? '' : `<button class="iconbtn danger" data-act="delete" data-id="${t.id}" title="${tr('Delete')}">${ic('trash', 's')}</button>`}</div>`;
  autosize($('#d-title')); autosize($('#d-content')); autosize($('#c-input'));
}
function linkField(t, ro) {
  if (t.url && !S.editLink) return `<div class="linkf"><a class="linkchip" href="${esc(t.url)}" target="_blank" rel="noopener noreferrer" title="${esc(t.url)}">${ic('link', 's')}<span>${esc(urlHost(t.url))}</span></a>${ro ? '' : `<button class="iconbtn" data-act="link-edit" title="${tr('Edit link')}">${ic('edit', 's')}</button><button class="iconbtn" data-act="link-rm" title="${tr('Remove website link')}">${ic('x', 's')}</button>`}</div>`;
  return ro ? '<span class="muted">–</span>' : `<input id="d-url" type="url" inputmode="url" autocomplete="off" placeholder="https://…" value="${esc(t.url || '')}" enterkeyhint="done">`;
}
async function saveLink(v) {
  const t = taskById(S.sel); if (!t) return;
  v = (v || '').trim();
  if (v && !/^https?:\/\//i.test(v) && /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v)) v = 'https://' + v;  // "github.com/x" -> https://
  if (v && !validUrl(v)) { toast(tr('The link must start with http:// or https://')); return; }
  S.editLink = false;
  if ((t.url || '') === v) { renderDetail(); return; }
  await patchTask(t.id, {url: v || null});
}

// ------------------------------------------------------------------ News ("Neuigkeiten", module "collab")
// Server feed of what concerns me (mentions, comments on my tasks, assignments, completions, sharing);
// texts are built here from structured items. Unread count + a change marker come with /api/state and
// /api/version, the feed itself is fetched while the view is open (never queued offline).
S.nf = {items: null, users: {}, sig: null, filter: LS.get('newsFilter', '')};
function bellBtn() {
  if (!collab()) return '';
  const n = S.news?.unread || 0;
  return `<button class="iconbtn bell ${S.route.mod === 'news' ? 'on' : ''}" data-go="news" title="${esc(tr('News'))}" aria-label="${esc(n ? trn('{0} unread news item', '{0} unread news items', n) : tr('News'))}">${ic('bell')}${n ? `<span class="nbadge">${n > 99 ? '99+' : n}</span>` : ''}</button>`;
}
function relTime(iso) {
  const min = Math.round((Date.now() - new Date(iso)) / 60000);
  if (min < 1) return tr('just now');
  if (min < 60) return trn('{0} min ago', '{0} min ago', min);
  if (min < 12 * 60) return trn('{0} h ago', '{0} h ago', Math.round(min / 60));
  return fmtWhen(iso);
}
// excerpt: one line, Markdown markers dropped, <@id> -> highlighted @name
const newsExcerpt = (body, U) => esc(String(body || '').replace(/\s+/g, ' ').replace(/\*\*|__|~~|`/g, '').replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1$2').replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1').trim())
  .replace(/&lt;@(\d+)&gt;/g, (_, id) => `<span class="mention ${S.me && +id === S.me.id ? 'me' : ''}">@${esc(uname(+id, U))}</span>`);
const roleLabel = r => r === 'view' ? tr('View only') : tr('Can edit');
function newsListName(it) {
  const l = it.list_id && listById(it.list_id);
  return l ? (l.is_inbox ? tr('Inbox') : listName(l.name)) : listName(it.data?.name || '');
}
function newsText(it, U) {
  const who = `<b>${esc(uname(it.actor_id, U))}</b>`, q = x => `<b>${esc(x)}</b>`, d = it.data || {};
  switch (it.kind) {
    case 'mention': return tr('{0} mentioned you', who);
    case 'comment': return it.count > 1 ? trn('{1} left {0} comments', '{1} left {0} comments', it.count, (it.actors || [it.actor_id]).map(a => `<b>${esc(uname(a, U))}</b>`).join(', ')) : tr('{0} commented', who);
    case 'assign': return tr('{0} assigned a task to you', who);
    case 'unassign': return tr('{0} removed you as assignee', who);
    case 'complete': return tr('{0} completed a task', who);
    case 'share': return d.role === 'view' ? tr('{0} shared the list {1} with you (view only)', who, q(newsListName(it))) : tr('{0} shared the list {1} with you', who, q(newsListName(it)));
    case 'role': return tr('{0} changed your role in {1} to {2}', who, q(newsListName(it)), q(roleLabel(d.role)));
    case 'unshare': return tr('{0} removed you from the list {1}', who, q(newsListName(it)));
  }
  return tr('{0} changed something', who);
}
const NEWS_ICON = {mention: 'at', comment: 'comment', assign: 'user', unassign: 'user', complete: 'check', share: 'users', role: 'users', unshare: 'users'};
function newsItemHtml(it, i) {
  const U = S.nf.users;
  const task = it.task_id ? `<div class="ntask"><span class="nt">${esc(it.task_title || '')}</span><span class="muted">${esc(newsListName(it))}</span></div>` : '';
  const ex = it.excerpt ? `<div class="nexc">${newsExcerpt(it.excerpt, U)}</div>` : '';
  return `<div class="nitem ${it.read ? '' : 'unread'} k-${it.kind}" role="button" tabindex="0" data-act="news-open" data-i="${i}">
    <span class="avatar">${esc(initials(uname(it.actor_id, U)))}<i class="nk">${ic(NEWS_ICON[it.kind] || 'bell', 's')}</i></span>
    <div class="nmain"><div class="ntext">${newsText(it, U)}</div>${task}${ex}</div>
    <time title="${esc(fmtWhen(it.created_at))}">${relTime(it.created_at)}</time></div>`;
}
function viewNews() {
  const f = S.nf.filter, fresh = S.nf.sig === (S.news?.sig ?? '') && S.nf.f === f;
  if (!fresh && !S.nf.loading) setTimeout(loadNews, 0);
  const bar = `<div class="nbar"><div class="seg"><button class="${f ? '' : 'on'}" data-act="news-filter" data-f="">${tr('All')}</button><button class="${f ? 'on' : ''}" data-act="news-filter" data-f="mentions">${ic('at', 's')}${tr('Only mentions')}</button></div><span class="spacer"></span>${S.news?.unread ? `<button class="btn sm" data-act="news-readall">${ic('check', 's')}${tr('Mark all as read')}</button>` : ''}</div>`;
  if (S.nf.err && !S.nf.items) return bar + `<div class="empty">${S.nf.err === 'offline' ? tr('News are only available online.') : esc(S.nf.err)}</div>`;
  if (!S.nf.items || S.nf.f !== f) return bar + `<div class="empty">${tr('Loading…')}</div>`;
  if (!S.nf.items.length) return bar + `<div class="empty">${ic('bell')}${f ? tr('No mentions yet.') : tr('Nothing new. Mentions, comments on your tasks, assignments and shared lists show up here.')}</div>`;
  return bar + `<div class="nlist">${S.nf.items.map(newsItemHtml).join('')}</div>`;
}
async function loadNews() {
  if (!collab() || S.nf.loading) return;
  const f = S.nf.filter;
  S.nf.loading = true;
  try {
    const j = await rawFetch('GET', '/api/news' + (f ? '?filter=' + f : ''));
    Object.assign(S.nf, {items: j.items, users: j.users || {}, sig: j.sig, f, err: null});
    const changed = !S.news || S.news.unread !== j.unread || S.news.sig !== j.sig;
    S.news = {unread: j.unread, sig: j.sig};
    if (changed) { renderTop(); renderTabs(); renderRail(); renderSide(); }
  } catch (e) {
    if (e.message === 'auth') return;
    S.nf.err = e instanceof Offline ? 'offline' : e.message; S.nf.sig = S.news?.sig ?? ''; S.nf.f = f;
  } finally { S.nf.loading = false; }
  if (S.route.mod === 'news') renderView();
}
async function newsRead(body) {
  try {
    const j = await rawFetch('POST', '/api/news/read', body);
    S.news = {unread: j.unread, sig: j.sig}; S.nf.sig = j.sig;
  } catch { /* offline: stays unread on the server */ }
  render();
}
async function newsOpen(i) {
  const it = (S.nf.items || [])[i]; if (!it) return;
  if (!it.read) { it.read = true; newsRead({ids: it.ids}); }
  if (!it.task_id) { if (it.list_id && listById(it.list_id)) go('l/' + it.list_id); return; }
  if (!taskById(it.task_id)) {  // e.g. completed long ago: not in the state
    try { (S.extra ||= []).push(await rawFetch('GET', `/api/tasks/${it.task_id}`)); }
    catch (e) { toast(e instanceof Offline ? tr('News are only available online.') : tr('Task not found')); return; }
  }
  openDetail(it.task_id);
}

// ------------------------------------------------------------------ comments + activity (module "collab")
// Loaded per task when the detail panel opens (GET /timeline), refreshed when the version changes.
// Comments are sent directly (never queued offline): offline, the text stays in the box with a notice.
const showAct = () => LS.get('showActivity', true);
const uname = (id, U) => (U || {})[id] || (id ? tr('Deleted user') : tr('Someone'));
function fmtWhen(iso) {
  const d = new Date(iso), hmTxt = d.toLocaleTimeString(LOCALE(), {hour: '2-digit', minute: '2-digit'});
  if (ds(d) === today()) return hmTxt;
  if (ds(d) === addDays(today(), -1)) return tr('Yesterday') + ' ' + hmTxt;
  return fmtDay(d.getFullYear() !== new Date().getFullYear() ? 'year' : 'short', d) + ' ' + hmTxt;
}
const fmtDayAbs = s => fmtDay(pd(s).getFullYear() !== new Date().getFullYear() ? 'year' : 'short', pd(s));
function actText(a, U) {
  const who = `<b>${esc(uname(a.user_id, U))}</b>`, d = a.data || {}, q = x => `<b>${esc(x)}</b>`;
  const due = () => q((d.start && d.start < d.due ? fmtDayAbs(d.start) + ' – ' : '') + fmtDayAbs(d.due) + (d.time ? ', ' + d.time : ''));
  switch (a.kind) {
    case 'created': return tr('{0} created the task', who);
    case 'title': return tr('{0} renamed the task to “{1}”', who, esc(d.to || ''));
    case 'content': return tr('{0} edited the description', who);
    case 'due': return d.due ? tr('{0} set the due date to {1}', who, due()) : tr('{0} removed the due date', who);
    case 'snooze': return tr('{0} snoozed the task to {1}', who, due());
    case 'priority': return tr('{0} changed the priority to {1}', who, q(tr([N_('None'), N_('Low'), '', N_('Medium'), '', N_('High')][+d.p] || N_('None'))));
    case 'assign': return d.to ? tr('{0} assigned the task to {1}', who, q(uname(d.to, U))) : tr('{0} removed the assignee', who);
    case 'list': return tr('{0} moved the task to the list {1}', who, q(d.inbox && d.name === 'Eingang' ? tr('Inbox') : listName(d.name)));
    case 'section': return d.name ? tr('{0} moved the task to the section {1}', who, q(d.name)) : tr('{0} removed the task from its section', who);
    case 'parent': return d.title ? tr('{0} made the task a subtask of {1}', who, q(d.title)) : tr('{0} made the task a main task', who);
    case 'repeat': return d.rule ? tr('{0} set the repetition to {1}', who, q(repeatLabel(d.rule))) : tr('{0} stopped the repetition', who);
    case 'link': return d.url ? tr('{0} set the link to {1}', who, q(urlHost(d.url))) : tr('{0} removed the link', who);
    case 'complete': return d.next ? tr('{0} completed the task, next occurrence {1}', who, q(fmtDayAbs(d.next))) : tr('{0} completed the task', who);
    case 'wont': return tr("{0} marked the task as won't do", who);
    case 'reopen': return tr('{0} reopened the task', who);
    case 'skip': return tr('{0} skipped an occurrence, next one {1}', who, q(fmtDayAbs(d.next)));
    case 'attach': return (d.n || 1) === 1 ? tr('{0} added the attachment {1}', who, q((d.names || [])[0] || '')) : trn('{1} added {0} attachment', '{1} added {0} attachments', d.n, who);
    case 'attach_rm': return tr('{0} removed the attachment {1}', who, q(d.name || ''));
    case 'paperless': return tr('{0} linked the Paperless document {1}', who, q(d.title || ''));
    case 'paperless_rm': return tr('{0} removed the Paperless document {1}', who, q(d.title || ''));
    case 'paperless_send': return tr('{0} sent {1} to Paperless', who, q(d.name || ''));
    case 'subtask': return tr('{0} added the subtask {1}', who, q(d.title || ''));
    case 'delete': return tr('{0} moved the task to the trash', who);
    case 'restore': return tr('{0} restored the task', who);
  }
  return tr('{0} changed the task', who);
}
// comment text: small markdown (bold, italic, code, links), line breaks, <@id> -> highlighted @name
function commentBody(body, U) {
  return String(body || '').split('\n').map(mdInline).join('<br>')
    .replace(/&lt;@(\d+)&gt;/g, (_, id) => `<span class="mention ${S.me && +id === S.me.id ? 'me' : ''}">@${esc(uname(+id, U))}</span>`);
}
const decodeMentions = (body, U) => String(body || '').replace(/<@(\d+)>/g, (_, id) => '@' + uname(+id, U));
function encodeMentions(text, people) {
  for (const p of [...(people || [])].sort((a, b) => b.name.length - a.name.length))
    text = text.replace(new RegExp('@' + p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\p{L}\\p{N}_])', 'gu'), `<@${p.id}>`);
  return text;
}
function cattHtml(a, cid, editing) {
  const del = editing ? `<button class="attdel" data-act="catt-del" data-att="${a.id}" title="${tr('Remove')}">${ic('x', 's')}</button>` : '';
  if (isImg(a)) return `<div class="att img"><a href="${attUrl(a)}" data-act="catt-view" data-att="${a.id}" data-cid="${cid}" title="${esc(a.name)}"><img src="${attUrl(a)}" loading="lazy" alt="${esc(a.name)}"></a>${del}</div>`;
  const pdf = a.mime === 'application/pdf';
  return `<div class="att file"><a href="${attUrl(a, !pdf)}" ${pdf ? 'target="_blank" rel="noopener"' : 'download'} title="${esc(a.name)}">${ic(pdf ? 'pdf' : 'file')}<span class="an">${esc(a.name)}</span><span class="as">${fmtSize(a.size)}</span></a>${del}</div>`;
}
function commentHtml(c, U) {
  const mine = S.me && c.user_id === S.me.id, editing = S.cedit === c.id;
  const isNew = !mine && c.id > (S.tl.seen || 0);
  const acts = mine || S.tl.moderator ? `<span class="cacts">${mine ? `<button class="iconbtn" data-act="c-edit" data-cid="${c.id}" title="${tr('Edit')}">${ic('edit', 's')}</button>` : ''}<button class="iconbtn" data-act="c-del" data-cid="${c.id}" title="${tr('Delete')}">${ic('trash', 's')}</button></span>` : '';
  const files = c.attachments?.length ? `<div class="atts catts">${c.attachments.map(a => cattHtml(a, c.id, editing)).join('')}</div>` : '';
  const main = editing ? `<div class="cedit"><textarea class="c-edit-input" data-cid="${c.id}" rows="2">${esc(decodeMentions(c.body, U))}</textarea><div class="mpick hidden"></div>${files}<div class="cbar"><span class="spacer"></span><button class="btn sm" data-act="c-edit-cancel">${tr('Cancel')}</button><button class="btn sm pri" data-act="c-edit-save" data-cid="${c.id}">${tr('Save')}</button></div></div>`
    : `${c.body ? `<div class="cbody">${commentBody(c.body, U)}</div>` : ''}${files}`;
  return `<div class="cm ${isNew ? 'new' : ''}" data-cid="${c.id}"><span class="avatar">${esc(initials(uname(c.user_id, U)))}</span><div class="cmain"><div class="chead"><b>${esc(uname(c.user_id, U))}</b><span class="muted">${fmtWhen(c.created_at)}${c.edited_at ? ' · ' + tr('edited') : ''}</span>${acts}</div>${main}</div></div>`;
}
function timelineItems() {
  const T = S.tl;
  if (T.err) return `<div class="muted cmempty">${T.err === 'offline' ? tr('Comments and activity are only available online.') : esc(T.err)}</div>`;
  if (!T.comments) return `<div class="muted cmempty">${tr('Loading…')}</div>`;
  const U = T.users || {};
  const items = [...T.comments.map(c => ({at: c.created_at, c})), ...(showAct() ? T.activity.map(a => ({at: a.created_at, a})) : [])]
    .sort((x, y) => new Date(x.at) - new Date(y.at) || (x.c ? 1 : 0) - (y.c ? 1 : 0));
  if (!items.length) return `<div class="muted cmempty">${tr('No comments yet.')}</div>`;
  return items.map(it => it.c ? commentHtml(it.c, U) : `<div class="actl"><span>${actText(it.a, U)}</span><time>${fmtWhen(it.a.created_at)}</time></div>`).join('');
}
function composerFiles(tid) {
  return (S.cfiles[tid] || []).map((f, i) => `<span class="cfile">${ic(/^image\//.test(f.type) ? 'clip' : 'file', 's')}<span>${esc(f.name || tr('Image'))}</span><button data-act="c-file-rm" data-i="${i}" title="${tr('Remove')}">${ic('x', 's')}</button></span>`).join('');
}
function timelineHtml(t) {
  const n = S.tl.id === t.id && S.tl.comments ? S.tl.comments.length : t.comment_count || 0;
  return `<h5 class="cmhead"><span>${tr('Comments')}</span><span class="c" id="d-tl-count">${n || ''}</span><span class="spacer"></span><button class="cmtoggle ${showAct() ? 'on' : ''}" data-act="tl-act" title="${tr('Show the history of changes between the comments')}">${ic('clock', 's')}${tr('Show activity')}</button></h5>
    <div class="cms" id="d-tl-items">${S.tl.id === t.id ? timelineItems() : `<div class="muted cmempty">${tr('Loading…')}</div>`}</div>
    <div class="ccomp"><textarea id="c-input" rows="1" placeholder="${tr('Write a comment… (@ mentions someone)')}">${esc(S.drafts[t.id] || '')}</textarea>
      <div class="mpick hidden"></div>
      <div class="cfiles" id="c-files">${composerFiles(t.id)}</div>
      <div class="cbar"><label class="iconbtn" title="${tr('Attach files')}">${ic('clip', 's')}<input type="file" id="c-file" multiple hidden></label><span class="muted chint">${isMobile() ? '' : tr('Ctrl+Enter sends')}</span><span class="spacer"></span><button class="btn sm pri" data-act="c-send">${ic('send', 's')} ${tr('Send')}</button></div></div>`;
}
function drawTimeline() {
  if (S.tl.id !== S.sel) return;
  const box = $('#d-tl-items'); if (box) box.innerHTML = timelineItems();
  const n = $('#d-tl-count'); if (n) n.textContent = S.tl.comments?.length || '';
}
async function loadTimeline(id) {
  if (!(id > 0) || !collab()) return;
  const my = S.tlSeq = (S.tlSeq || 0) + 1, v = S.v;
  let j;
  try { j = await rawFetch('GET', `/api/tasks/${id}/timeline`); }
  catch (e) {
    if (e.message === 'auth' || my !== S.tlSeq || S.sel !== id) return;
    if (S.tl.id !== id || !S.tl.comments) S.tl = {id, v, err: e instanceof Offline ? 'offline' : e.message};
    drawTimeline(); return;
  }
  if (my !== S.tlSeq || S.sel !== id) return;
  const seen = S.tl.id === id ? S.tl.seen : j.seen;  // "new" marks stay while the panel is open
  S.tl = {...j, id, v, seen};
  if (S.cedit && !j.comments.some(c => c.id === S.cedit)) S.cedit = null;
  drawTimeline();
  const t = S.tasks.get(id), top = Math.max(0, ...j.comments.map(c => c.id));
  if (t && (t.unread || t.comment_count !== j.comments.length)) { t.unread = 0; t.comment_count = j.comments.length; renderView(); }
  if (top > (j.seen || 0)) rawFetch('POST', `/api/tasks/${id}/seen`).catch(() => {});
}
async function capi(method, url, body) {  // comments: never queued, clear message when offline
  try { return await rawFetch(method, url, body); }
  catch (e) {
    if (e instanceof Offline) toast(tr('You are offline: the comment was not sent and stays in the box'));
    else if (e.message !== 'auth') toast(e.message);
    throw e;
  }
}
async function sendComment() {
  const tid = S.sel, ta = $('#c-input'); if (!ta || !tid) return;
  if (tid < 0) { toast(tr('Task is still syncing, try again in a moment')); return; }
  const raw = ta.value.trim(), files = S.cfiles[tid] || [];
  if (!raw && !files.length) { ta.focus(); return; }
  const big = files.find(f => f.size > 50 * 1024 * 1024);
  if (big) { toast(tr('{0} is larger than 50 MB', big.name)); return; }
  const text = encodeMentions(raw, S.tl.id === tid ? S.tl.people : []);
  let payload = {body: text};
  if (files.length) { payload = new FormData(); payload.append('body', text); files.forEach((f, i) => payload.append('file', f, f.name || `bild-${Date.now()}-${i}.png`)); }
  const btn = $('[data-act="c-send"]'); if (btn) btn.disabled = true;
  try { await capi('POST', `/api/tasks/${tid}/comments`, payload); }
  catch { return; }
  finally { if (btn) btn.disabled = false; }
  delete S.drafts[tid]; delete S.cfiles[tid];
  if (S.sel === tid) { const i = $('#c-input'); if (i) { i.value = ''; autosize(i); } const f = $('#c-files'); if (f) f.innerHTML = ''; }
  await loadTimeline(tid);
  const box = $('#d-tl-items'); if (box) box.lastElementChild?.scrollIntoView({block: 'nearest'});
}
function addCommentFiles(files) {
  files = [...files].filter(Boolean); if (!files.length || !S.sel) return;
  (S.cfiles[S.sel] ||= []).push(...files);
  const f = $('#c-files'); if (f) f.innerHTML = composerFiles(S.sel);
}
// @mention picker: people who can see the task (from the timeline), without me
function mentionState(ta) {
  const pick = ta.parentElement.querySelector('.mpick'); if (!pick) return null;
  const pre = ta.value.slice(0, ta.selectionStart), m = pre.match(/(?:^|\s)@([^\s@<>]{0,30}(?: [^\s@<>]{0,30})?)$/u);
  const people = (S.tl.people || []).filter(p => !S.me || p.id !== S.me.id);
  if (!m || !people.length) return {pick, items: []};
  const q = m[1].toLowerCase();
  const items = people.filter(p => { const n = p.name.toLowerCase(); return n.startsWith(q) || n.split(/\s+/).some(w => w.startsWith(q)); }).slice(0, 6);
  return {pick, items, start: pre.length - m[1].length - 1};
}
function mentionUpdate(ta) {
  const st = mentionState(ta); if (!st) return;
  S.mp = st.items.length ? {ta, ...st, i: 0} : null;
  st.pick.classList.toggle('hidden', !st.items.length);
  st.pick.innerHTML = st.items.map((p, i) => `<button class="${i === 0 ? 'on' : ''}" data-act="mention-pick" data-i="${i}"><span class="avatar">${esc(initials(p.name))}</span>${esc(p.name)}</button>`).join('');
}
function mentionPick(i) {
  const mp = S.mp; if (!mp) return;
  const p = mp.items[i], ta = mp.ta, caret = ta.selectionStart;
  ta.value = ta.value.slice(0, mp.start) + '@' + p.name + ' ' + ta.value.slice(caret);
  const pos = mp.start + p.name.length + 2;
  ta.focus(); ta.setSelectionRange(pos, pos);
  mp.pick.classList.add('hidden'); S.mp = null;
  if (ta.id === 'c-input') S.drafts[S.sel] = ta.value;
  autosize(ta);
}
function mentionClose() { if (S.mp) { S.mp.pick.classList.add('hidden'); S.mp = null; } }
document.addEventListener('keydown', e => {
  const t = e.target;
  if (!(t.id === 'c-input' || t.classList?.contains('c-edit-input'))) return;
  if (S.mp && S.mp.ta === t) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); S.mp.i = (S.mp.i + (e.key === 'ArrowDown' ? 1 : -1) + S.mp.items.length) % S.mp.items.length;
      $$('button', S.mp.pick).forEach((b, i) => b.classList.toggle('on', i === S.mp.i)); return;
    }
    if ((e.key === 'Enter' || e.key === 'Tab') && !e.isComposing) { e.preventDefault(); e.stopImmediatePropagation(); mentionPick(S.mp.i); return; }
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); mentionClose(); return; }
  }
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault(); e.stopImmediatePropagation();
    if (t.id === 'c-input') sendComment(); else $(`[data-act="c-edit-save"][data-cid="${t.dataset.cid}"]`)?.click();
  }
}, true);
document.addEventListener('mousedown', e => { if (e.target.closest('.mpick')) e.preventDefault(); });  // keep the caret in the box
// ------------------------------------------------------------------ attachments
const attUrl = (a, dl) => `/api/attachments/${a.id}${dl ? '?dl=1' : ''}`;
const fmtSize = b => b < 1024 ? b + ' B' : b < 1048576 ? Math.round(b / 1024) + ' KB' : (b / 1048576).toFixed(1).replace('.', ',') + ' MB';
const isImg = a => /^image\/(png|jpeg|gif|webp|avif|bmp)$/.test(a.mime);
function attHtml(a) {
  const t = taskById(S.sel), sending = (t?.paperless || []).some(p => p.status === 'pending' && p.att_id === a.id);
  const del = !canEdit(t) ? '' : `<button class="attdel" data-act="att-del" data-att="${a.id}" title="${tr('Remove')}">${ic('x', 's')}</button>` +
    (plOn() ? `<button class="attpl ${sending ? 'busy' : ''}" data-act="att-pl" data-att="${a.id}" title="${sending ? tr('being sent to Paperless') : tr('File in Paperless')}">${ic('archive', 's')}</button>` : '');
  if (isImg(a)) return `<div class="att img"><a href="${attUrl(a)}" data-act="att-view" data-att="${a.id}" title="${esc(a.name)}"><img src="${attUrl(a)}" loading="lazy" alt="${esc(a.name)}"></a>${del}</div>`;
  const pdf = a.mime === 'application/pdf';
  return `<div class="att file"><a href="${attUrl(a, !pdf)}" ${pdf ? 'target="_blank" rel="noopener"' : 'download'} title="${esc(a.name)}">${ic(pdf ? 'pdf' : 'file')}<span class="an">${esc(a.name)}</span><span class="as">${fmtSize(a.size)}</span></a>${del}</div>`;
}
function plHtml(p) {
  const x = !canEdit(taskById(S.sel)) ? '' : `<button class="attdel" data-act="pl-del" data-pl="${p.id}" title="${tr('Remove link')}">${ic('x', 's')}</button>`;
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
  if (!canEdit(taskById(taskId))) { roToast(); return; }
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
function attLightbox(id, list) {
  const t = taskById(S.sel), imgs = list || (t?.attachments || []).filter(isImg);
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

// ------------------------------------------------------------------ undo
// One undo at a time: a toast with "Undo" (6 s, Ctrl/Cmd+Z while it is visible). Online, the reverse
// goes to the server (signed undo payload for completions, restore for the trash, a reverse PATCH with
// _prev for moves and date changes, batch actions per task). An operation that is still waiting in the
// offline outbox is simply taken out of the queue and the local state restored (never sent); one that
// is being sent right now is waited for, then reversed on the server.
const UNDO = {cur: null};
const UNDO_FIELDS = ['list_id', 'section_id', 'parent_id', 'due', 'due_time', 'start', 'duration', 'reminders', 'repeat', 'repeat_from', 'priority', 'pinned', 'assignee_id'];
const snapTask = t => t ? JSON.parse(JSON.stringify(t)) : null;
const withKids = id => { const out = [], walk = x => { for (const k of children(x)) { out.push(snapTask(k)); walk(k.id); } }; out.push(snapTask(taskById(id))); walk(id); return out.filter(Boolean); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
// res: the api() result of the forward operation (carries its outbox entry as _q when it was queued);
// snaps: task copies from before (local restore); server(result): sends the reverse, false = no "Undone" toast
function offerUndo(msg, res, snaps, server) {
  const u = {entry: res && res._q || null, res, snaps: snaps || [], server, done: false};
  UNDO.cur = u;
  toast(msg, () => runUndo(u), 6000);
}
const cancellable = e => { const i = OUT.q.indexOf(e); return i >= 0 && !(OUT.flushing && i === 0); };
async function runUndo(u) {
  if (!u || u.done) return;
  u.done = true;
  if (UNDO.cur === u) UNDO.cur = null;
  $('#toast').classList.add('hidden');
  const e = u.entry;
  if (e) {  // queued offline: cancel it if it has not left yet, else wait for its answer
    for (let n = 0; n < 400 && !e.done && !cancellable(e); n++) await sleep(150);
    if (!e.done && cancellable(e)) {
      OUT.q.splice(OUT.q.indexOf(e), 1); LS.set('outbox', OUT.q);
      for (const t of u.snaps) S.tasks.set(t.id, t);
      if (e.tmp) S.tasks.delete(e.tmp);
      renderTop(); render(); if (S.sel && S.tasks.has(S.sel)) renderDetail();
      toast(tr('Undone')); return;
    }
    if (!e.res) { await load().catch(() => {}); render(); return; }  // was not applied (dropped) -> nothing to undo
  }
  let ok;
  try { ok = await u.server(e ? e.res : u.res); } catch { return; }  // api() showed the error
  await load().catch(() => {}); render(); if (S.sel && S.tasks.has(S.sel)) renderDetail();
  if (ok !== false) toast(tr('Undone'));
}
document.addEventListener('keydown', e => {
  if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== 'z' || !UNDO.cur) return;
  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable || $('#toast').classList.contains('hidden')) return;
  e.preventDefault(); runUndo(UNDO.cur);
});
// field changes (move, date, snooze): reverse PATCH of what actually changed; _prev = the new values, so a
// change made elsewhere in the meantime is not overwritten (reported instead)
function reverseOf(before, after, fields = UNDO_FIELDS) {
  const back = {}, prev = {};
  for (const k of fields) {
    const a = k === 'tags' ? [...(before.tags || [])].sort().join('\u0001') : before[k] ?? null, b = k === 'tags' ? [...(after.tags || [])].sort().join('\u0001') : after[k] ?? null;
    if (a !== b) { back[k] = k === 'tags' ? [...(before.tags || [])] : before[k] ?? null; prev[k] = k === 'tags' ? [...(after.tags || [])] : after[k] ?? null; }
  }
  return Object.keys(back).length ? {...back, _prev: prev} : null;
}
async function undoPatch(id, rev) {
  const j = await api('PATCH', '/api/tasks/' + id, rev);
  if (j && j.conflicts?.length) { toast(tr('Changed elsewhere in the meantime, the other version stays')); return false; }
  return true;
}
async function patchUndoable(id, body, msg) {
  const before = snapTask(taskById(id));
  const t = await patchTask(id, body);
  const rev = before && reverseOf(before, t);
  if (rev) offerUndo(msg, t, [before], () => undoPatch(id, rev));
  else if (msg) toast(msg);
  return t;
}
async function toggleTask(id) {
  const t = taskById(id); if (!t) return;
  if (!canEdit(t)) { roToast(); return; }
  const snaps = withKids(id);
  if (t.status !== 0) {
    const r = await api('POST', `/api/tasks/${id}/reopen`);
    const {undo, ...rt} = r; putTask(rt);
    if (S.extra) S.extra = S.extra.filter(x => x.id !== id);
    render();
    offerUndo(tr('Reopened'), r, snaps, res => res?.undo ? api('POST', `/api/tasks/${id}/undo`, res.undo) : false);
    return;
  }
  // optimistic: fade the row, then sync
  $$(`.trow[data-id="${id}"] .chk`).forEach(c => { c.classList.add('on'); c.innerHTML = ic('check'); });
  const j = await api('POST', `/api/tasks/${id}/complete`, t.repeat && t.due ? {expect_due: t.due} : undefined);
  await load();
  render();
  if (j.skipped) toast(tr('Already checked off (other device), not advanced twice'));
  else offerUndo(j.next_due ? tr('Next occurrence: {0}', dayLabel(j.next_due)) : tr('Completed'), j, snaps,
    res => res?.skipped ? false : res?.undo ? api('POST', `/api/tasks/${id}/undo`, res.undo) : false);
}
async function wontDo(id) {
  const snaps = withKids(id);
  const j = await api('POST', `/api/tasks/${id}/complete`, {status: -1});
  await load(); render();
  offerUndo(tr("Won't do"), j, snaps, res => res?.undo ? api('POST', `/api/tasks/${id}/undo`, res.undo) : false);
}
async function deleteTask(id) {
  const t = taskById(id);
  if (t && !canEdit(t)) { roToast(); return; }
  const snaps = withKids(id);
  const r = await api('DELETE', '/api/tasks/' + id);
  if (S.sel === id) closeDetail();
  await load(); render();
  offerUndo(tr('“{0}” deleted', t ? t.title.slice(0, 30) : ''), r, snaps, () => api('POST', `/api/tasks/${id}/restore`));
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
  if (!canEdit(t)) { roToast(); return; }
  menu(anchor, [[5, N_('High')], [3, N_('Medium')], [1, N_('Low')], [0, N_('None')]].map(([p, n]) => ({label: tr(n), icon: 'flag', on: t.priority === p, cls: p ? 'flag-' + p : '', fn: () => patchTask(id, {priority: p})})));
}
function datePop(anchor, id) {
  const t = taskById(id);
  if (!canEdit(t)) { roToast(); return; }
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
      await patchUndoable(id, {due: st.due, due_time: st.due ? st.due_time : null, reminders: st.due ? st.reminders : '', repeat: st.due ? st.repeat : '', repeat_from: st.repeat_from,
        start: st.due && st.start && st.start < st.due ? st.start : null, duration: st.due_time ? (st.duration || 30) : null}, st.due ? tr('Date: {0}', dayLabel(st.due)) : tr('Date removed'));
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
  if (!canEdit(t)) { roToast(); return; }
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
    ...(timeOn() ? [S.timer && S.timer.task_id === id ? {label: tr('Stop timer'), icon: 'stop', fn: timerStop} : {label: tr('Start timer'), icon: 'clock', fn: () => timerStart({task_id: id})},
      {label: tr('Add time…'), icon: 'plus', fn: () => entryModal(null, {task_id: id})}] : []),
    {label: t.status === -1 ? tr('Reopen') : tr("Won't do (discard)"), icon: 'ban', fn: () => t.status === -1 ? toggleTask(id) : wontDo(id)},
    {label: tr('Save as template'), icon: 'copy', fn: () => saveTemplate({task_id: id}, t.title)},
    {label: tr('Duplicate'), icon: 'sub', fn: () => createTask({title: t.title, content: t.content, list_id: t.list_id, section_id: t.section_id, priority: t.priority, due: t.due, due_time: t.due_time, reminders: t.reminders, repeat: t.repeat, repeat_from: t.repeat_from, tags: t.tags, parent_id: t.parent_id, url: t.url || null})},
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
  if (!canEdit(t)) { roToast(); return; }
  const now = new Date();
  const inH = h => { const d = new Date(now.getTime() + h * 36e5); d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0); return {due: ds(d), due_time: `${pad(d.getHours())}:${pad(d.getMinutes())}`}; };
  const go2 = (body, label) => patchUndoable(id, body, tr('Snoozed: {0}', label));
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
  const own = isOwner(l), dis = own ? '' : 'disabled';
  const m0 = l.name.match(EMO_RE);
  let emo = m0 ? m0[1] : '';
  const base = l.is_inbox && l.name === 'Eingang' ? tr('Inbox') : m0 ? l.name.slice(m0[0].length) : l.name;  // inbox keeps its stored name unless renamed
  const md = modal(`<h3>${id ? tr('Edit list') : tr('New list')}</h3>
    <div class="row"><label>${tr('Name')}</label><button class="emobtn" id="l-emo" title="${tr('Choose icon')}" ${dis}>${emo || ic('list')}</button><input id="l-name" value="${esc(base)}" ${dis}></div>
    <div class="emogrid hidden" id="l-emogrid"><button data-emo="" class="none" title="${tr('No icon')}">${ic('ban', 's')}</button>${EMOJIS.map(e => `<button data-emo="${e}" class="${e === emo ? 'on' : ''}">${e}</button>`).join('')}<input id="l-emocustom" placeholder="${tr('custom')}" maxlength="8"></div>
    <div class="row"><label>${tr('Folder')}</label><input id="l-folder" value="${esc(l.folder)}" list="l-folders" placeholder="${tr('optional')}"><datalist id="l-folders">${folderNames().map(f => `<option value="${esc(f)}">`).join('')}</datalist></div>
    <div class="row"><label>${tr('View')}</label><select id="l-view"><option value="list">${tr('List')}</option>${feat('kanban') ? `<option value="kanban" ${l.view === 'kanban' ? 'selected' : ''}>${tr('Kanban')}</option>` : ''}${feat('timeline') ? `<option value="timeline" ${l.view === 'timeline' ? 'selected' : ''}>${tr('Timeline')}</option>` : ''}</select></div>
    ${timeOn() && (own || l.rate) ? `<div class="row"><label>${tr('Hourly rate')}</label><input id="l-rate" inputmode="decimal" value="${l.rate != null ? esc(String(l.rate).replace('.', LOCALE().startsWith('de') ? ',' : '.')) : ''}" placeholder="${tr('optional')}" style="max-width:110px" ${dis}><span class="muted">${esc(S.settings.time_currency || '')} · ${tr('time reports')}</span></div>` : ''}
    <div class="row"><label>${tr('Color')}</label><div class="colors" id="l-col">${LCOLORS.map(c => `<button style="background:${c || 'var(--bg4)'}" class="${(l.color || '') === c ? 'on' : ''}" data-c="${c}" ${dis}></button>`).join('')}</div></div>
    ${id && !l.is_inbox && collab() ? `<h4>${tr('Sharing')}</h4><div class="members" id="l-members"></div>` : ''}
    <div class="foot">${id && !l.is_inbox && own ? `<button class="btn danger" data-m="del">${tr('Delete')}</button><button class="btn" data-m="arch">${l.archived ? tr('Reactivate') : tr('Archive')}</button>` : ''}${id && !own ? `<button class="btn danger" data-m="leave">${ic('logout', 's')} ${tr('Leave list')}</button>` : ''}${id ? `<button class="btn" data-m="tpl" title="${tr('Save the sections and open tasks as a template')}">${ic('copy', 's')} ${tr('Save as template')}</button>` : ''}<span class="spacer"></span><button class="btn" data-m="close">${tr('Cancel')}</button><button class="btn pri" data-m="save">${tr('Save')}</button></div>`);
  let users = null;
  const drawMembers = () => {
    const box = $('#l-members', md); if (!box) return;
    const cur = listById(id) || l, people = listPeople(cur);
    const roleName = r => r === 'owner' ? tr('Owner') : r === 'view' ? tr('View only') : tr('Can edit');
    box.innerHTML = people.map(p => `<div class="mrow" data-uid="${p.user_id}"><span class="avatar">${esc(initials(p.name))}</span><span class="n">${esc(p.name)}${S.me && p.user_id === S.me.id ? ' ' + tr('(me)') : ''}</span>${own && p.role !== 'owner'
      ? `<select data-mrole="${p.user_id}"><option value="edit" ${p.role === 'edit' ? 'selected' : ''}>${tr('Can edit')}</option><option value="view" ${p.role === 'view' ? 'selected' : ''}>${tr('View only')}</option></select><button class="iconbtn" data-mrm="${p.user_id}" title="${tr('Remove from list')}">${ic('x', 's')}</button>`
      : `<span class="muted">${roleName(p.role)}</span>`}</div>`).join('') +
      (own ? (users === null ? `<div class="muted mhint">${tr('Loading…')}</div>` : (() => {
        const cand = users.filter(u => u.id !== S.me?.id && !people.some(p => p.user_id === u.id));
        return cand.length ? `<div class="mrow madd"><select id="l-adduser"><option value="">${tr('Share with …')}</option>${cand.map(u => `<option value="${u.id}">${esc(u.display_name)}</option>`).join('')}</select><select id="l-addrole"><option value="edit">${tr('Can edit')}</option><option value="view">${tr('View only')}</option></select><button class="btn sm" data-m="share">${ic('plus', 's')} ${tr('Add')}</button></div>`
          : `<div class="muted mhint">${users.length > 1 ? tr('Shared with everyone') : tr('No other users yet. An admin can add them in the settings.')}</div>`;
      })()) : `<div class="muted mhint">${tr('Owner: {0}. Only the owner can rename, archive or share this list.', cur.owner_name)}</div>`);
  };
  if (id && !l.is_inbox && collab()) {
    drawMembers();
    if (own) api('GET', '/api/users').then(j => { users = j.users.filter(u => !u.disabled).map(u => ({id: u.id, display_name: u.display_name})); drawMembers(); }).catch(() => { users = []; drawMembers(); });
  }
  const memberAct = async (fn, msg) => { try { await fn(); await load(); render(); drawMembers(); if (msg) toast(msg); } catch { /* api() showed it */ } };
  md.addEventListener('change', e => {
    const r = e.target.closest('[data-mrole]');
    if (r) memberAct(() => api('PUT', `/api/lists/${id}/members`, {user_id: +r.dataset.mrole, role: r.value}));
  });
  md.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.m === 'share') {
      const u = +$('#l-adduser', md).value; if (!u) return;
      memberAct(() => api('PUT', `/api/lists/${id}/members`, {user_id: u, role: $('#l-addrole', md).value}), tr('Shared')); return;
    }
    if (b.dataset.mrm) {
      const p = listPeople(listById(id)).find(x => x.user_id === +b.dataset.mrm);
      if (!confirm(tr('Remove {0} from this list?', p?.name || ''))) return;
      memberAct(() => api('DELETE', `/api/lists/${id}/members/${b.dataset.mrm}`)); return;
    }
    if (b.dataset.m === 'leave') {
      if (!confirm(tr('Leave the list “{0}”? You will no longer see its tasks.', listName(l.name)))) return;
      try { await api('DELETE', `/api/lists/${id}/members/${S.me.id}`); } catch { return; }
      md.remove(); await load(); go('today'); return;
    }
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
    if (a === 'tpl') { md.remove(); saveTemplate({list_id: id}, lname(l)); return; }
    if (a === 'save') {
      const nm = $('#l-name', md).value.trim().replace(EMO_RE, '');
      if (!nm) return $('#l-name', md).focus();
      const body = own ? {name: l.is_inbox && !emo && nm === tr('Inbox') ? 'Eingang' : emo + nm, folder: $('#l-folder', md).value.trim(), view: $('#l-view', md).value, color: $('#l-col button.on', md)?.dataset.c || '', ...($('#l-rate', md) ? {rate: $('#l-rate', md).value.trim()} : {})}
        : {folder: $('#l-folder', md).value.trim(), view: $('#l-view', md).value};  // members: only their own placement / view
      if (body.folder && !folderNames().includes(body.folder)) await api('PATCH', '/api/settings', {folders: JSON.stringify([...folderNames(), body.folder])});
      if (id) { try { await api('PATCH', '/api/lists/' + id, body); } catch { return; } }
      else { const {rate, ...b0} = body; const n = await api('POST', '/api/lists', b0); if (rate) await api('PATCH', '/api/lists/' + n.id, {rate}).catch(() => {}); md.remove(); await load(); go('l/' + n.id); return; }
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
  if (!own) { setTimeout(() => $('#l-folder', md).focus(), 50); return; }
  md.addEventListener('input', e => {  // any emoji typed (or picked from the OS keyboard) into the custom field
    if (e.target.id !== 'l-emocustom') return;
    const m = e.target.value.match(EMO_RE);
    if (m) { emo = m[1]; $('#l-emo', md).innerHTML = emo; $$('#l-emogrid button', md).forEach(x => x.classList.remove('on')); }
  });
  setTimeout(() => $('#l-name', md).focus(), 50);
}
// Settings: tabbed dialog (vertical tab list on the left on desktop, a horizontally scrollable tab strip on phones).
// Every pane stays in the DOM, so one "Save" stores the server settings of all sections at once;
// language, color scheme, tab bar and the account / user actions apply immediately, as before.
// The last opened section is remembered per device (LS settingsSec).
const SET_SECS = [['account', 'user', N_('Account')], ['general', 'sliders', N_('General')], ['notify', 'bell', N_('Notifications')],
  ['layout', 'grid', N_('Layout')], ['focus', 'timer', N_('Focus')], ['time', 'clock', N_('Time tracking')], ['integr', 'link', N_('Integrations')], ['data', 'download', N_('Data')],
  ['users', 'users', N_('Users')], ['help', 'help', N_('Help')]];
const SET_SAVE = '#s-allday,#s-defrem,#s-digest,#s-pf,#s-ps,#s-pl,#s-pe,#s-showdone,#s-plkeep,#s-icalscope,#s-icalalarm,#s-trnd,#s-ttarget,#s-tcur,#s-tfocus,#s-trem,#s-tstop,[data-feat]';
function settingsModal(focus) {
  const s = S.settings;
  const topicUrl = `${S.ntfyUrl}/${s.ntfy_topic}`;
  const dev = `<span class="devtag">${tr('This device')}</span>`, hint = t => `<div class="shint">${t}</div>`;
  const chk = (id, on, label) => `<label class="chkl"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}> ${label}</label>`;
  const pane = {
    account: S.me ? accountHtml() : '',
    general: `<h4 id="s-lang-h">${tr('Language')}</h4>
      <div class="row"><div class="seg" id="s-lang">${(S.languages || []).map(({code, name}) => `<button data-lang-set="${esc(code)}" class="${(s.lang || 'en') === code ? 'on' : ''}">${esc(name)}</button>`).join('')}</div></div>
      ${hint(tr('Applies to all devices and to the notifications. Quick add always understands German and English.'))}
      <h4>${tr('Appearance')}${dev}</h4>
      <div class="row"><label>${tr('Color scheme')}</label><div class="seg" id="s-theme">${[['auto', N_('Automatic')], ['dark', N_('Dark')], ['light', N_('Light')]].map(([k, n]) => `<button data-theme-set="${k}" class="${LS.get('theme', 'auto') === k ? 'on' : ''}">${tr(n)}</button>`).join('')}</div></div>
      <h4>${tr('Completed tasks')}</h4>
      <div class="row"><label>${tr('Show in lists')}</label>${chk('s-showdone', s.show_completed !== '0', tr('Show completed|setting'))}</div>`,
    notify: `<h4>${tr('Notifications (ntfy)')}</h4>
      <div class="row"><label>${tr('Topic')}</label><code class="topic">${esc(s.ntfy_topic)}</code><button class="btn sm" data-m="test">${ic('bell', 's')} ${tr('Send test')}</button></div>
      ${hint(`${tr('Subscribe in the ntfy app: server {0}, topic as above', esc(S.ntfyUrl))}${/ntfy\.sh/.test(S.ntfyUrl) || !S.me?.ntfy_inbox ? '' : tr(', with a user that has read access')}. <a href="${esc(topicUrl)}" target="_blank" rel="noopener">${tr('Web view')}</a>`)}
      <h4>${tr('Reminders')}</h4>
      <div class="row"><label>${tr('All-day reminder at')}</label><input type="time" id="s-allday" value="${esc(s.allday_time)}"></div>
      <div class="row"><label>${tr('Default reminder')}</label><select id="s-defrem"><option value="">${tr('none')}</option>${REM_OPTS.map(([v, n]) => `<option value="${v}" ${s.default_reminder === v ? 'selected' : ''}>${tr(n)}</option>`).join('')}</select></div>
      <div class="row"><label>${tr('Daily digest at')}</label><input type="time" id="s-digest" value="${esc(s.digest_time)}"><span class="muted" style="font-size:12px">${tr('empty = off')}</span></div>`,
    layout: `<h4 id="s-tabbar-h">${tr('Tab bar')}${dev}</h4>
      ${hint(tr('At the bottom on a phone, on the left on desktop. A phone fits {0} tabs, the rest goes under “More”.', TAB_MAX))}
      <div class="navlist" id="s-tabbar"></div>
      <div class="row" style="margin-top:8px"><select id="s-tabadd" style="flex:1"></select><button class="btn sm" data-m="tab-reset">${tr('Default')}</button></div>
      <h4>${tr('Modules')}</h4>
      ${hint(tr('Checkbox = feature on/off. Order = default bar for devices without their own tab bar.'))}
      <div class="navlist" id="s-nav">${navOrder().map(k => { const [m, i, n] = MODS.find(x => x[0] === k); return `<div class="navrow" data-mod="${m}">${m === 'tasks' ? '<input type="checkbox" checked disabled>' : `<input type="checkbox" data-feat="${m}" ${feat(m) ? 'checked' : ''}>`}${ic(i, 's')}<span>${tr(n)}</span><button class="iconbtn" data-nav="-1" title="${tr('move up / left')}">${ic('chev', 's up')}</button><button class="iconbtn" data-nav="1" title="${tr('move down / right')}">${ic('chev', 's')}</button></div>`; }).join('')}</div>
      <h4>${tr('Views and features')}</h4>
      <div class="featgrid">${FEATS.filter(([k]) => !MODS.some(m => m[0] === k)).map(([k, n]) => `<label ${FEAT_DESC[k] ? 'class="wide"' : ''}><input type="checkbox" data-feat="${k}" ${feat(k) ? 'checked' : ''}><span>${tr(n)}${FEAT_DESC[k] ? `<small class="muted">${tr(FEAT_DESC[k])}</small>` : ''}</span></label>`).join('')}</div>`,
    focus: `<h4>${tr('Focus (minutes)')}</h4>
      <div class="row"><label>${tr('Focus / short / long')}</label><input type="number" id="s-pf" value="${esc(s.pomo_focus)}" min="1" style="max-width:80px"><input type="number" id="s-ps" value="${esc(s.pomo_short)}" min="1" style="max-width:80px"><input type="number" id="s-pl" value="${esc(s.pomo_long)}" min="1" style="max-width:80px"></div>
      <div class="row"><label>${tr('Long break after')}</label><input type="number" id="s-pe" value="${esc(s.pomo_long_every)}" min="1" style="max-width:80px"><span class="muted">${tr('pomos')}</span></div>`,
    time: timeOn() ? `<h4>${tr('Reports')}</h4>
      <div class="row"><label>${tr('Rounding')}</label><select id="s-trnd">${[0, 5, 6, 10, 15, 30].map(v => `<option value="${v}" ${String(v) === String(s.time_rounding || '0') ? 'selected' : ''}>${v ? tr('up to {0} min per entry', v) : tr('none')}</option>`).join('')}</select></div>
      ${hint(tr('Rounding applies to the report, the CSV export and the timesheet; the tracked times stay exact. Hourly rate: in the list dialog (owner).'))}
      <div class="row"><label>${tr('Currency')}</label><input id="s-tcur" value="${esc(s.time_currency ?? '€')}" maxlength="8" style="max-width:80px"></div>
      <div class="row"><label>${tr('Daily target')}</label><input type="number" id="s-ttarget" value="${esc(s.time_target || '0')}" min="0" max="24" step="0.25" style="max-width:80px"><span class="muted">${tr('hours, 0 = none')}</span></div>
      <h4>${tr('Timer')}</h4>
      <div class="row"><label>${tr('Reminder after')}</label><input type="number" id="s-trem" value="${esc(s.time_remind_h ?? '4')}" min="0" max="48" step="0.5" style="max-width:80px"><span class="muted">${tr('hours, push “still running?”, 0 = off')}</span></div>
      <div class="row"><label>${tr('Stop automatically after')}</label><input type="number" id="s-tstop" value="${esc(s.time_autostop_h ?? '12')}" min="0" max="72" step="0.5" style="max-width:80px"><span class="muted">${tr('hours, end = start + value, 0 = off')}</span></div>
      <div class="row"><label>${tr('Focus sessions')}</label>${chk('s-tfocus', s.time_focus !== '0', tr('count as time entries (not while a timer runs)'))}</div>` : '',
    integr: `<h4 id="s-ical-h">${tr('Calendar subscription')}</h4>
      ${hint(tr('Your open tasks with a date as a calendar for Google Calendar, Apple Calendar, Outlook or Thunderbird: read-only, the calendar app refreshes it by itself (usually every few hours, some apps every 15 minutes). Timed tasks appear with their duration, all-day tasks as all-day events, recurring tasks with all future dates.'))}
      <div id="s-ical"><div class="muted mhint">${tr('Loading…')}</div></div>
      <div class="row"><label>${tr('Tasks')}</label><select id="s-icalscope"><option value="all">${tr('All visible tasks (incl. shared lists)')}</option><option value="mine" ${s.ical_scope === 'mine' ? 'selected' : ''}>${tr('Only mine and assigned to me')}</option></select></div>
      <div class="row"><label>${tr('Reminders')}</label>${chk('s-icalalarm', s.ical_alarms !== '0', tr('as calendar alarms'))}</div>
      <details class="shelp sdet"><summary>${tr('How to subscribe')}</summary><ul class="slist">
        <li>${tr('<b>Android / Google Calendar:</b> on a computer open calendar.google.com > Other calendars > + > From URL, paste the link. It then shows up in the Calendar app on the phone (tap the calendar under Settings to sync it).')}</li>
        <li>${tr('<b>iPhone / iPad:</b> Settings > Apps > Calendar > Calendar Accounts > Add Account > Other > Add Subscribed Calendar, paste the link. <b>Mac:</b> Calendar > File > New Calendar Subscription.')}</li>
        <li>${tr('<b>Thunderbird:</b> Calendar > New Calendar > On the Network, paste the link.')}</li>
        <li>${tr('<b>Outlook:</b> Add calendar > Subscribe from web.')}</li>
        <li>${tr('<b>Only reachable at home or over a VPN?</b> Google Calendar, iCloud and Outlook.com fetch the feed from their own servers and then cannot reach it. Use an app that fetches on the device instead: on Android ICSx⁵ (the calendar then shows up in every calendar app), on a Mac the location “On My Mac” instead of iCloud, or Thunderbird.')}</li></ul></details>
      ${hint(tr('Anyone who knows the link sees these tasks. If it got out, create a new link: the old one stops working at once.'))}
      ${S.paperless?.enabled ? `<h4>Paperless</h4>
      <div class="row"><label>${tr('After upload')}</label>${chk('s-plkeep', s.paperless_keep === '1', tr('Also keep the attachment in Abhako'))}</div>` : ''}
      <h4>${tr('Sharing from Android')}</h4>
      <ul class="slist"><li>${tr('Links and text: “Share” &gt; Abhako.')}</li>
        <li>${tr('Images and files (also several): the HTTP Shortcuts app sends them to /drop with your upload token (see Account).')}</li>
        ${S.ntfyInbox?.enabled && S.me?.ntfy_inbox ? `<li>${tr('Single files also via the ntfy app:')} ${tr('In the ntfy app, add server {0} once', `<code class="topic">${esc(S.ntfyInbox.server)}</code>`)}${tr(' and log in with a user that may write to the topic (Settings > Manage users).')} ${tr('Then: share an image or text > ntfy > server as above, topic {0}. A few seconds later it is a task in the inbox, files as attachments.', `<code class="topic">${esc(S.ntfyInbox.topic)}</code>`)}</li>` : ''}</ul>`,
    data: `<h4>${tr('Import and export')}</h4>
      <div class="row"><label>${tr('TickTick import')}</label><input type="file" id="s-import" accept=".csv,text/csv"></div>
      <div class="row"><label>${tr('Export')}</label><a class="btn sm" href="/api/export.json" download>${ic('download', 's')} ${tr('Download JSON')}</a></div>
      <h4 id="s-tpl-h">${tr('Templates')}</h4>
      ${hint(tr('Private to you. Save a task (with subtasks) from its menu (…) or a list from the list dialog; use them from the template button in the add bar or under Lists > +. Dates are kept as “days after use”.'))}
      <div class="members" id="s-tpls"><div class="muted mhint">${tr('Loading…')}</div></div>
      <h4>${tr('Completed tasks')}</h4>
      <div class="row"><label>${tr('Clean up')}</label><button class="btn sm danger" data-m="purge">${ic('trash', 's')} ${tr('Delete all completed')}</button><span class="muted" style="font-size:12px">${tr('they go to the trash')}</span></div>`,
    users: S.me?.is_admin ? usersHtml() : '',
    help: `<h4>${tr('Quick add')}</h4>
      <div class="shelp">${tr('today, tomorrow, day after tomorrow, friday, next monday, in 3 days, 12.10., 3pm, at 15:00<br>daily, weekdays, weekly, every monday, every 2 weeks, monthly, yearly<br>!high / !medium / !low (or !!!, !!, !) · #tag · ~list<br>German works too: morgen 15 uhr, jeden montag, !hoch<br>Keyboard: n = new task, / = search, Esc = close')}</div>
      <h4>${tr('Undo')}</h4>
      <div class="shelp">${tr('After completing, reopening, deleting, moving to another list, snoozing / changing the date or a batch action, a message with “Undo” shows for a few seconds (Ctrl+Z / ⌘Z on a computer). Offline, the change is simply not sent.')}</div>
      <h4>${tr('Templates')}</h4>
      <div class="shelp">${tr('Task menu (…) or list dialog > Save as template. The template button in the add bar creates the task in the current list, Lists > + > New list from template a whole list. Manage them under Settings > Data.')}</div>
      ${timeOn() ? `<h4>${tr('Time tracking')}</h4><div class="shelp">${tr('Start a timer from a task (detail panel, task menu …) or add time by hand; the running timer shows in the top bar on every device. Sidebar > Time tracking: hours per list and task for a week, month or any range, CSV export and a printable timesheet. In shared lists everyone sees the time of all members, but only changes their own entries. Finished focus sessions on a task count as time unless a timer ran at the same time.')}</div>` : ''}
      ${feat('stats') ? `<h4>${tr('Statistics')}</h4><div class="shelp">${tr('Sidebar > Statistics (or pin it as a tab): completions per week / day and per list, on-time rate, overdue trend, focus time and habit streaks of the last 12 weeks.')}</div>` : ''}
      <h4>${tr('Gestures (phone)')}</h4>
      <div class="shelp">${tr('Swipe right: complete · swipe left: snooze / delete · long-press and drag: reorder, move to another column, quadrant or onto a day; drag to the left edge and hold briefly to open the lists (dropping a subtask there = standalone task in that list).')}</div>`,
  };
  const secs = SET_SECS.filter(([k]) => pane[k]);
  let cur = {tabbar: 'layout', templates: 'data', ical: 'integr'}[focus] || focus;
  if (!secs.some(([k]) => k === cur)) cur = LS.get('settingsSec', 'general');
  if (!secs.some(([k]) => k === cur)) cur = 'general';
  const md = modal(`<div class="shdr"><h3>${tr('Settings')}</h3><button class="iconbtn" data-m="close" aria-label="${tr('Close')}">${ic('x')}</button></div>
    <div class="sbody"><nav class="snav" role="tablist" aria-label="${tr('Settings')}">${secs.map(([k, i, n]) => `<button role="tab" id="st-${k}" aria-controls="sp-${k}" aria-selected="${k === cur}" data-sec="${k}" class="${k === cur ? 'on' : ''}">${ic(i, 's')}<span>${tr(n)}</span></button>`).join('')}</nav>
      <div class="spanes">${secs.map(([k]) => `<section class="spane ${k === cur ? '' : 'hidden'}" role="tabpanel" id="sp-${k}" aria-labelledby="st-${k}" data-pane="${k}">${pane[k]}</section>`).join('')}</div></div>
    <div class="foot sfoot"><span class="sdirty muted">${tr('Unsaved changes')}</span><span class="spacer"></span><button class="btn" data-m="close">${tr('Close')}</button><button class="btn pri" data-m="save">${tr('Save')}</button></div>`);
  md.classList.add('smodal');
  const show = k => {
    cur = k; LS.set('settingsSec', k);
    $$('.snav button', md).forEach(b => { b.classList.toggle('on', b.dataset.sec === k); b.setAttribute('aria-selected', b.dataset.sec === k); });
    $$('.spane', md).forEach(p => p.classList.toggle('hidden', p.dataset.pane !== k));
    $('.spanes', md).scrollTop = 0;
    if (k === 'data') templatesDraw(md);
    if (k === 'integr') icalDraw(md);
    $(`.snav [data-sec="${k}"]`, md)?.scrollIntoView({block: 'nearest', inline: 'nearest'});
  };
  const dirty = () => md.classList.add('dirty');
  md.addEventListener('change', e => { if (e.target.matches?.(SET_SAVE)) dirty(); });
  md.addEventListener('input', e => { if (e.target.matches?.(SET_SAVE)) dirty(); });
  $('.snav', md).addEventListener('click', e => { const b = e.target.closest('[data-sec]'); if (b) show(b.dataset.sec); });
  setTimeout(() => $(`.snav [data-sec="${cur}"]`, md)?.scrollIntoView({block: 'nearest', inline: 'nearest'}), 0);
  if (cur === 'data') templatesDraw(md).then(() => { if (focus === 'templates') $('#s-tpl-h', md)?.scrollIntoView({block: 'start'}); });
  if (cur === 'integr') icalDraw(md);
  const tabDraw = () => {
    const ids = tabIds();
    $('#s-tabbar', md).innerHTML = ids.map(tabItem).map((t, i) => t ? `<div class="navrow" data-tab="${esc(t.id)}">${t.icon}<span>${esc(t.label)}</span>${i === TAB_MAX - 1 && ids.length > TAB_MAX ? `<span class="muted" style="font-size:11px">${tr('from here on “More”')}</span>` : ''}<button class="iconbtn" data-tmove="-1" title="${tr('move forward')}">${ic('chev', 's up')}</button><button class="iconbtn" data-tmove="1" title="${tr('move back')}">${ic('chev', 's')}</button><button class="iconbtn" data-tdel title="${tr('remove')}">${ic('x', 's')}</button></div>` : '').join('') || `<div class="muted" style="font-size:13px">${tr('Empty: only “More”')}</div>`;
    const opt = (id, n) => ids.includes(id) ? '' : `<option value="${esc(id)}">${esc(n)}</option>`;
    const grp = (n, o) => o ? `<optgroup label="${tr(n)}">${o}</optgroup>` : '';
    $('#s-tabadd', md).innerHTML = `<option value="">${tr('+ Add tab …')}</option>` +
      grp(N_('Sections'), MODS.filter(([m]) => m === 'tasks' || feat(m)).map(([m, , n]) => opt('m:' + m, tr(n))).join('')) +
      grp(N_('Smart lists'), SMART_TABS.filter(k => k !== 'assigned' || collab()).map(k => opt('s:' + k, tr(SMART[k].name))).join('')) +
      grp(N_('Lists'), S.lists.filter(l => !l.is_inbox && !l.archived).map(l => opt('l:' + l.id, listName(l.name))).join('')) +
      grp(N_('Filters'), S.filters.map(f => opt('f:' + f.id, f.name)).join('')) +
      grp(N_('Tags'), Object.keys(counts().tags).sort((a, b) => a.localeCompare(b, 'de')).map(t => opt('tag:' + t, '#' + t)).join('')) +
      grp(N_('Other'), (collab() ? opt('news', tr('News')) : '') + (feat('stats') ? opt('stats', tr('Statistics')) : '') + (timeOn() ? opt('time', tr('Time tracking')) : '') + opt('search', tr('Search')) + opt('settings', tr('Settings')));
  };
  const tabSet = ids => { LS.set('tabbar', ids); tabDraw(); renderTabs(); renderRail(); };
  tabDraw();
  $('#s-tabadd', md).addEventListener('change', e => { if (e.target.value) tabSet([...tabIds(), e.target.value]); });
  if (S.me) accountWire(md);
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
      md.remove(); render(); settingsModal('general');
      return;
    }
    if (b.dataset.themeSet) { LS.set('theme', b.dataset.themeSet); applyTheme(); $$('#s-theme button', md).forEach(x => x.classList.toggle('on', x === b)); return; }
    if (b.dataset.nav) {
      const row = b.closest('.navrow'), sib = +b.dataset.nav < 0 ? row.previousElementSibling : row.nextElementSibling;
      if (sib) { +b.dataset.nav < 0 ? sib.before(row) : sib.after(row); dirty(); }
      return;
    }
    const trw = b.closest('[data-tpl]');
    if (trw) {
      const tp = ($('#s-tpls', md)._t || []).find(x => x.id === +trw.dataset.tpl); if (!tp) return;
      if ('tplUse' in b.dataset) { md.remove(); useTemplate(tp); }
      if ('tplEdit' in b.dataset) templateModal(tp, () => templatesDraw(md));
      return;
    }
    const a = b.dataset.m;
    if (a === 'close') md.remove();
    if (a && a.startsWith('ical-')) { icalAction(md, a.slice(5)); return; }
    if (a === 'purge') {
      const n = [...S.tasks.values()].filter(t => t.status !== 0).length;
      if (!confirm(tr('Move all completed tasks to the trash?') + (n ? ' ' + tr('(at least {0})', n) : ''))) return;
      const j = await api('POST', '/api/tasks/purge-done');
      await load(); render(); toast(j.count === undefined ? tr('Will be deleted once back online') : trn('{0} completed task moved to the trash', '{0} completed tasks moved to the trash', j.count));
    }
    if (a === 'test') { const j = await api('POST', '/api/ntfy/test'); toast(j.ok ? tr('Test sent') : tr('ntfy not reachable')); }
    if (a === 'save') {
      await api('PATCH', '/api/settings', {...($('#s-plkeep', md) ? {paperless_keep: $('#s-plkeep', md).checked ? '1' : '0'} : {}), nav_order: $$('#s-nav .navrow', md).map(r => r.dataset.mod).join(','), features: $$('[data-feat]', md).filter(x => x.checked).map(x => x.dataset.feat).join(','), show_completed: $('#s-showdone', md).checked ? '1' : '0', ical_scope: $('#s-icalscope', md).value, ical_alarms: $('#s-icalalarm', md).checked ? '1' : '0', allday_time: $('#s-allday', md).value || '09:00', default_reminder: $('#s-defrem', md).value, digest_time: $('#s-digest', md).value,
        pomo_focus: $('#s-pf', md).value, pomo_short: $('#s-ps', md).value, pomo_long: $('#s-pl', md).value, pomo_long_every: $('#s-pe', md).value,
        ...($('#s-trnd', md) ? {time_rounding: $('#s-trnd', md).value, time_currency: $('#s-tcur', md).value.trim(), time_target: String(Math.max(0, +$('#s-ttarget', md).value || 0)),
          time_remind_h: String(Math.max(0, +$('#s-trem', md).value || 0)), time_autostop_h: String(Math.max(0, +$('#s-tstop', md).value || 0)), time_focus: $('#s-tfocus', md).checked ? '1' : '0'} : {})});
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
// calendar subscription (Settings > Integrations): the secret feed link, copy / new link / off
async function icalDraw(md, j) {
  const box = $('#s-ical', md); if (!box) return;
  if (!j) { try { j = await api('GET', '/api/ical'); } catch { box.innerHTML = `<div class="muted mhint">${tr('Only available online.')}</div>`; return; } }
  if (!j.url) { box.innerHTML = `<div class="row"><button class="btn sm pri" data-m="ical-create">${ic('cal', 's')} ${tr('Create subscription link')}</button></div>`; return; }
  box.innerHTML = `<div class="row icalrow"><input id="s-icalurl" readonly value="${esc(j.url)}" aria-label="${tr('Subscription link')}"><button class="btn sm pri" data-m="ical-copy">${ic('copy', 's')} ${tr('Copy')}</button></div>
    <div class="row"><a class="btn sm" href="${esc(j.url.replace(/^https?:/, 'webcal:'))}">${ic('cal', 's')} ${tr('Open in calendar app')}</a><button class="btn sm" data-m="ical-rotate">${ic('key', 's')} ${tr('New link')}</button><button class="btn sm danger" data-m="ical-off">${tr('Turn off')}</button></div>`;
}
async function icalAction(md, a) {
  if (a === 'copy') {
    const i = $('#s-icalurl', md);
    try { await navigator.clipboard.writeText(i.value); toast(tr('Link copied')); } catch { i.focus(); i.select(); toast(tr('Copy the selected link')); }
    return;
  }
  if (a === 'rotate' && !confirm(tr('Create a new link? Calendars subscribed with the old one stop updating.'))) return;
  if (a === 'off' && !confirm(tr('Turn the calendar feed off? Subscribed calendars stop updating.'))) return;
  try { icalDraw(md, await api('POST', '/api/ical', {action: a})); } catch { /* api() showed it */ }
  if (a === 'rotate') toast(tr('New link created, the old one no longer works'));
}
// ------------------------------------------------------------------ account, users (admin), login
// settings sections: own account (name, password, upload token, log out) + user admin for admins
function accountHtml() {
  const m = S.me, pw = m.auth === 'session' || m.has_password;
  return `<h4 id="s-account-h">${tr('Account')}</h4>
    <div class="row"><label>${tr('Logged in as')}</label><span class="acct"><span class="avatar">${esc(initials(m.display_name))}</span><b>${esc(m.display_name)}</b> <span class="muted">${esc(m.username)}${m.auth === 'proxy' ? ' · ' + tr('via single sign-on') : ''}</span></span></div>
    <div class="row"><label>${tr('Display name')}</label><input id="a-name" value="${esc(m.display_name)}" maxlength="60"><button class="btn sm" data-acc="name">${tr('Save')}</button></div>
    ${pw ? `<div class="row"><label>${tr('Password')}</label><input type="password" id="a-cur" placeholder="${tr('current password')}" autocomplete="current-password"><input type="password" id="a-new" placeholder="${tr('new password')}" autocomplete="new-password"><button class="btn sm" data-acc="pw">${tr('Change')}</button></div>` : ''}
    <div class="row"><label>${tr('Upload token')}</label><button class="btn sm" data-acc="token">${ic('key', 's')} ${tr('Show')}</button><span class="muted" style="font-size:12px">${tr('for POST /drop (HTTP Shortcuts), header Authorization: Bearer …')}</span></div>
    <div class="row hidden" id="a-tokrow"><label></label><code class="topic" id="a-tok"></code><button class="btn sm danger" data-acc="token-new">${tr('New token')}</button></div>
    ${m.auth === 'session' ? `<div class="row"><label></label><button class="btn sm" data-acc="logout">${ic('logout', 's')} ${tr('Log out')}</button></div>` : ''}`;
}
const usersHtml = () => `<h4>${tr('Users')}</h4><div class="members" id="a-users"><div class="muted mhint">${tr('Loading…')}</div></div>
  <div class="row" style="margin-top:8px"><button class="btn sm" data-acc="user-new">${ic('plus', 's')} ${tr('New user')}</button></div>`;
function accountWire(md) {
  let users = [];
  const drawUsers = async () => {
    const box = $('#a-users', md); if (!box) return;
    try { users = (await api('GET', '/api/users')).users; } catch { return; }
    box.innerHTML = users.map(u => `<div class="mrow ${u.disabled ? 'off' : ''}"><span class="avatar">${esc(initials(u.display_name))}</span><span class="n">${esc(u.display_name)} <span class="muted">${esc(u.username)}${u.is_admin ? ' · ' + tr('Admin') : ''}${u.disabled ? ' · ' + tr('disabled') : ''}${u.proxy_login ? ' · ' + tr('SSO: {0}', u.proxy_login) : ''}</span></span><button class="iconbtn" data-acc="user-edit" data-uid="${u.id}" title="${tr('Edit user')}">${ic('edit', 's')}</button></div>`).join('');
  };
  drawUsers();
  md.addEventListener('click', async e => {
    const b = e.target.closest('[data-acc]'); if (!b) return;
    const a = b.dataset.acc;
    try {
      if (a === 'name') { const v = $('#a-name', md).value.trim(); if (!v) return; await api('PATCH', '/api/me', {display_name: v}); await load(); render(); toast(tr('Saved')); }
      if (a === 'pw') {
        const nw = $('#a-new', md).value;
        if (nw.length < 8) { toast(tr('Password: at least {0} characters', 8)); return; }
        await api('PATCH', '/api/me', {current_password: $('#a-cur', md).value, password: nw});
        $('#a-cur', md).value = ''; $('#a-new', md).value = ''; toast(tr('Password changed'));
      }
      if (a === 'token') { const j = await api('GET', '/api/me'); $('#a-tok', md).textContent = j.drop_token || '–'; $('#a-tokrow', md).classList.remove('hidden'); }
      if (a === 'token-new') {
        if (!confirm(tr('Create a new upload token? The old one stops working (update HTTP Shortcuts).'))) return;
        const j = await api('POST', '/api/me/drop-token'); $('#a-tok', md).textContent = j.drop_token;
      }
      if (a === 'logout') logout();
      if (a === 'user-new') userModal(null, drawUsers);
      if (a === 'user-edit') userModal(users.find(u => u.id === +b.dataset.uid), drawUsers);
    } catch { /* api() showed it */ }
  });
}
function userModal(u, done) {
  const md = modal(`<h3>${u ? tr('Edit user') : tr('New user')}</h3>
    <div class="row"><label>${tr('Username')}</label><input id="u-user" value="${esc(u?.username || '')}" ${u ? 'disabled' : ''} autocapitalize="off" placeholder="${tr('a-z, 0-9, . - _')}"></div>
    <div class="row"><label>${tr('Display name')}</label><input id="u-name" value="${esc(u?.display_name || '')}" maxlength="60"></div>
    <div class="row"><label>${tr('Password')}</label><input type="password" id="u-pw" autocomplete="new-password" placeholder="${u ? (u.has_password ? tr('unchanged') : tr('none (single sign-on only)')) : tr('optional, min. 8 characters')}"></div>
    <div class="row"><label>${tr('SSO login')}</label><input id="u-proxy" value="${esc(u?.proxy_login || '')}" autocapitalize="off" placeholder="${tr('user name at the login proxy (optional)')}"></div>
    <div class="row"><label>${tr('ntfy topic')}</label><input id="u-topic" value="${esc(u?.ntfy_topic || '')}" autocapitalize="off" placeholder="${tr('empty = random')}"></div>
    <div class="row"><label>${tr('Rights')}</label><label class="chkl"><input type="checkbox" id="u-admin" ${u?.is_admin ? 'checked' : ''}> ${tr('Admin')}</label>${u ? `<label class="chkl"><input type="checkbox" id="u-dis" ${u.disabled ? 'checked' : ''}> ${tr('disabled')}</label>` : ''}</div>
    ${u?.has_password ? `<div class="row"><label></label><label class="chkl"><input type="checkbox" id="u-nopw"> ${tr('Remove password (single sign-on only)')}</label></div>` : ''}
    <div class="muted" style="font-size:12px;line-height:1.6">${tr('Every user gets an own inbox, habits, filters, tags and settings. Lists are shared from the list dialog.')}</div>
    <div class="foot">${u && u.id !== S.me.id ? `<button class="btn danger" data-m="del">${tr('Delete')}</button>` : ''}<span class="spacer"></span><button class="btn" data-m="close">${tr('Cancel')}</button><button class="btn pri" data-m="save">${tr('Save')}</button></div>`);
  md.addEventListener('click', async e => {
    const b = e.target.closest('button[data-m]'); if (!b) return;
    if (b.dataset.m === 'close') { md.remove(); return; }
    try {
      if (b.dataset.m === 'del') {
        if (!confirm(tr('Delete user “{0}”? Their inbox, habits, filters and focus history are deleted. Lists they own must be deleted first.', u.display_name))) return;
        await api('DELETE', '/api/users/' + u.id);
      }
      if (b.dataset.m === 'save') {
        const body = {display_name: $('#u-name', md).value.trim(), proxy_login: $('#u-proxy', md).value.trim(), ntfy_topic: $('#u-topic', md).value.trim(), is_admin: $('#u-admin', md).checked};
        const pw = $('#u-pw', md).value;
        if (pw) body.password = pw; else if ($('#u-nopw', md)?.checked) body.password = '';
        if (u) { body.disabled = $('#u-dis', md).checked; await api('PATCH', '/api/users/' + u.id, body); }
        else { body.username = $('#u-user', md).value.trim().toLowerCase(); if (!body.ntfy_topic) delete body.ntfy_topic; await api('POST', '/api/users', body); }
      }
      md.remove(); toast(tr('Saved')); done && done(); await load(); render();
    } catch { /* api() showed it */ }
  });
  if (!u) setTimeout(() => $('#u-user', md).focus(), 50);
}
async function logout() {
  if (OUT.q.length && !confirm(trn('{0} change is not synced yet and will be lost. Log out anyway?', '{0} changes are not synced yet and will be lost. Log out anyway?', OUT.q.length))) return;
  try { await fetch('/api/auth/logout', {method: 'POST', headers: {'X-Requested-With': 'abhako'}}); } catch { /* offline */ }
  clearLocal(); location.replace('/');
}
// login / first-run setup / "no account" screen (built-in login; with single sign-on the proxy logs in)
async function authScreen(j) {
  if ($('.authscreen')) return;
  let info = {};
  try { info = await (await fetch('/api/auth/info')).json(); } catch { /* offline */ }
  await i18nLoad(info.lang || uiLang());
  if ($('.authscreen')) return;
  const kind = info.setup ? 'setup' : j.auth;
  const el = document.createElement('div');
  el.className = 'modal authscreen';
  const logo = `<div class="alogo"><img src="/static/icon.svg" alt=""><b>${APP_NAME}</b></div>`;
  if (kind === 'no_account' || kind === 'disabled') {
    el.innerHTML = `<div class="card">${logo}<p>${kind === 'disabled' ? esc(tr('The account “{0}” is disabled.', j.login || '')) : esc(tr('There is no {0} account for “{1}” yet.', APP_NAME, j.login || ''))}</p><p class="muted">${tr('Please ask the admin to create one (or to enable it).')}</p></div>`;
  } else {
    const setup = kind === 'setup';
    el.innerHTML = `<div class="card">${logo}
      ${setup ? `<p>${tr('Welcome! Create the first account, it becomes the admin.')}</p>${info.login ? `<p class="muted">${esc(tr('Signed in at the login proxy as “{0}”: the account is linked to it, a password is optional.', info.login))}</p>` : ''}` : ''}
      <form id="auth-form" autocomplete="on">
        <input id="au-user" name="username" placeholder="${tr('Username')}" autocapitalize="off" autocomplete="username" required value="${setup && info.login ? esc(String(info.login).toLowerCase()) : ''}">
        ${setup ? `<input id="au-name" placeholder="${tr('Display name')}" maxlength="60">` : ''}
        <input id="au-pw" name="password" type="password" placeholder="${tr('Password')}" autocomplete="${setup ? 'new-password' : 'current-password'}" ${setup && info.login ? '' : 'required'}>
        ${setup ? '' : `<label class="chkl"><input type="checkbox" id="au-rem" checked> ${tr('Stay logged in')}</label>`}
        <div class="aerr" id="au-err"></div>
        <button class="btn pri" type="submit">${setup ? tr('Create account') : tr('Log in')}</button>
      </form></div>`;
    el.querySelector('#auth-form').addEventListener('submit', async e => {
      e.preventDefault();
      const errEl = $('#au-err', el);
      const body = setup ? {username: $('#au-user', el).value.trim(), display_name: $('#au-name', el).value.trim(), password: $('#au-pw', el).value}
        : {username: $('#au-user', el).value.trim(), password: $('#au-pw', el).value, remember: $('#au-rem', el).checked};
      try {
        const r = await fetch(setup ? '/api/auth/setup' : '/api/auth/login', {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Requested-With': 'abhako'}, body: JSON.stringify(body)});
        const res = await r.json().catch(() => ({}));
        if (!r.ok) { errEl.textContent = res.error || tr('Error {0}', r.status); return; }
        location.replace('/');
      } catch { errEl.textContent = tr('Server not reachable.'); }
    });
  }
  document.body.appendChild(el);
  setTimeout(() => $('#au-user', el)?.focus(), 50);
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

// ------------------------------------------------------------------ templates (private per user)
// A task (subtasks, priority, tags, notes, repeat; dates as days after the day it was saved) or a whole
// list (sections + open tasks). Using one puts the dates relative to today. Settings > Data manages them.
const tplOf = kind => (S.templates || []).filter(x => x.kind === kind);
async function saveTemplate(src, def) {
  const name = prompt(tr('Template name'), def || '');
  if (name === null) return;
  try { await api('POST', '/api/templates', {...src, name: name.trim()}); } catch { return; }
  await load(); render(); toast(tr('Saved as template'));
}
async function useTemplate(tp) {
  if (tp.kind === 'list') {
    const name = prompt(tr('Name of the new list'), tp.name); if (name === null) return;
    let j; try { j = await api('POST', `/api/templates/${tp.id}/apply`, {name: name.trim()}); } catch { return; }
    await load(); go('l/' + j.list_id); toast(tr('List created from template')); return;
  }
  const lid = quickDefaults().list_id;
  let j; try { j = await api('POST', `/api/templates/${tp.id}/apply`, {list_id: lid && canEditList(lid) ? lid : null}); } catch { return; }
  putTask(j.task); await load(); render();
  const id = j.task.id;
  requestAnimationFrame(() => { const r = $(`#view .trow[data-id="${id}"]`); if (r) { r.classList.add('flash'); r.scrollIntoView({block: 'nearest'}); } });
  offerUndo(tr('Created from template: {0}', tp.name), j, [], () => api('DELETE', '/api/tasks/' + id));
}
function templateMenu(anchor, kind) {
  const ts = tplOf(kind);
  if (!ts.length) { toast(kind === 'list' ? tr('No list templates yet: list dialog > Save as template') : tr('No task templates yet: task menu > Save as template')); return; }
  menu(anchor, [...ts.map(tp => ({label: tp.name, icon: kind === 'list' ? 'list' : 'copy', fn: () => useTemplate(tp)})), '-', {label: tr('Manage templates'), icon: 'edit', fn: () => settingsModal('templates')}]);
}
// outline editor: one task per line, two spaces = one level deeper, "# Name" = section (list templates).
// Lines that keep their title keep their dates, priority, notes etc.
const tplOutline = (nodes, lvl = 0) => nodes.map(n => '  '.repeat(lvl) + n.title + '\n' + tplOutline(n.children || [], lvl + 1)).join('');
function tplListOutline(d) {
  const top = (d.tasks || []).filter(n => n.section == null);
  return tplOutline(top) + (d.sections || []).map((s, i) => `# ${s}\n` + tplOutline((d.tasks || []).filter(n => n.section === i))).join('');
}
function tplParse(text, old, list) {
  const pool = new Map();
  const add = n => { if (!pool.has(n.title)) pool.set(n.title, []); pool.get(n.title).push(n); (n.children || []).forEach(add); };
  old.forEach(add);
  const take = title => { const n = (pool.get(title) || []).shift(); return n ? {...n, title, children: []} : {title, children: []}; };
  const roots = [], sections = [], stack = [];
  let sec = null;
  for (const raw of String(text).split('\n')) {
    if (!raw.trim()) continue;
    if (list && /^#\s*\S/.test(raw)) { sections.push(raw.replace(/^#\s*/, '').trim().slice(0, 200)); sec = sections.length - 1; stack.length = 0; continue; }
    const lvl = Math.min(2, Math.floor(raw.match(/^\s*/)[0].replace(/\t/g, '  ').length / 2));
    const title = raw.trim().replace(/^[-*]\s+(\[[ xX]\]\s+)?/, '').slice(0, 500);
    if (!title) continue;
    const n = take(title), depth = Math.min(lvl, stack.length);
    stack.length = depth;
    if (depth === 0) { if (list) n.section = sec; else delete n.section; roots.push(n); } else stack[depth - 1].children.push(n);
    stack.push(n);
  }
  return {roots, sections};
}
function templateModal(tp, done) {
  const d = JSON.parse(JSON.stringify(tp.data)), task = tp.kind === 'task', root = task ? d.task : null;
  const prios = [[0, N_('None')], [1, N_('Low')], [3, N_('Medium')], [5, N_('High')]];
  const md = modal(`<h3>${tr('Edit template')}</h3>
    <div class="row"><label>${tr('Template name')}</label><input id="tp-name" value="${esc(tp.name)}" maxlength="200"></div>
    ${task ? `<div class="row"><label>${tr('Title')}</label><input id="tp-title" value="${esc(root.title)}"></div>
      <div class="row"><label>${tr('Description')}</label><textarea id="tp-content" rows="3">${esc(root.content || '')}</textarea></div>
      <div class="row"><label>${tr('Priority')}</label><select id="tp-prio">${prios.map(([v, n]) => `<option value="${v}" ${root.priority === v ? 'selected' : ''}>${tr(n)}</option>`).join('')}</select></div>
      <div class="row"><label>${tr('Due')}</label><input type="number" id="tp-due" min="0" max="3650" value="${root.due_offset ?? ''}" placeholder="–" style="max-width:80px"><span class="muted" style="font-size:12px">${tr('days after use (0 = same day, empty = no date)')}</span></div>
      <div class="row"><label>${tr('Time')}</label><input type="time" id="tp-time" value="${esc(root.due_time || '')}">${root.repeat ? `<span class="muted" style="font-size:12px">${ic('repeat', 's')} ${esc(repeatLabel(root.repeat))}</span>` : ''}</div>
      <div class="row"><label>${tr('Tags')}</label><input id="tp-tags" value="${esc((root.tags || []).join(', '))}" placeholder="${tr('tag1, tag2')}"></div>
      <h4>${tr('Subtasks')}</h4>`
    : `<div class="row"><label>${tr('List name')}</label><input id="tp-lname" value="${esc(d.name || '')}"></div><h4>${tr('Sections and tasks')}</h4>`}
    <textarea id="tp-outline" class="tpoutline" rows="9" spellcheck="false">${esc(task ? tplOutline(root.children || []) : tplListOutline(d))}</textarea>
    <div class="shint">${task ? tr('One subtask per line, indent with two spaces for a further level (at most 3 levels in total).') : tr('One task per line, indent with two spaces for subtasks. A line “# Name” starts a section.')} ${tr('Lines that keep their title keep their dates, priority and notes.')}</div>
    <div class="foot"><button class="btn danger" data-m="del">${tr('Delete')}</button><span class="spacer"></span><button class="btn" data-m="close">${tr('Cancel')}</button><button class="btn pri" data-m="save">${tr('Save')}</button></div>`);
  md.classList.add('tpmodal');
  md.addEventListener('click', async e => {
    const b = e.target.closest('button[data-m]'); if (!b) return;
    if (b.dataset.m === 'close') { md.remove(); return; }
    try {
      if (b.dataset.m === 'del') {
        if (!confirm(tr('Delete the template “{0}”?', tp.name))) return;
        await api('DELETE', '/api/templates/' + tp.id);
      }
      if (b.dataset.m === 'save') {
        const name = $('#tp-name', md).value.trim(); if (!name) { $('#tp-name', md).focus(); return; }
        let data;
        if (task) {
          const title = $('#tp-title', md).value.trim(); if (!title) { $('#tp-title', md).focus(); return; }
          const due = $('#tp-due', md).value.trim();
          data = {task: {...root, title, content: $('#tp-content', md).value, priority: +$('#tp-prio', md).value,
            due_offset: due === '' ? null : Math.max(0, +due), due_time: due === '' ? null : $('#tp-time', md).value || null,
            tags: $('#tp-tags', md).value.split(',').map(x => x.trim().replace(/^#/, '')).filter(Boolean),
            children: tplParse($('#tp-outline', md).value, root.children || [], false).roots}};
        } else {
          const p = tplParse($('#tp-outline', md).value, d.tasks || [], true);
          data = {...d, name: $('#tp-lname', md).value.trim(), sections: p.sections, tasks: p.roots};
        }
        await api('PATCH', '/api/templates/' + tp.id, {name, data});
      }
    } catch { return; }  // api() showed it
    md.remove(); await load(); render(); done && done(); toast(b.dataset.m === 'del' ? tr('Template deleted') : tr('Saved'));
  });
  setTimeout(() => $('#tp-name', md).focus(), 50);
}
async function templatesDraw(md) {
  const box = $('#s-tpls', md); if (!box) return;
  let ts;
  try { ts = (await api('GET', '/api/templates')).templates; } catch { box.innerHTML = `<div class="muted mhint">${tr('Templates are only available online.')}</div>`; return; }
  box._t = ts;
  box.innerHTML = ts.map(tp => `<div class="mrow" data-tpl="${tp.id}"><span class="tplic">${ic(tp.kind === 'list' ? 'list' : 'copy', 's')}</span><span class="n">${esc(tp.name)} <span class="muted">${tp.kind === 'list' ? tr('List') : tr('Task')} · ${trn('{0} task', '{0} tasks', tp.count)}</span></span><button class="iconbtn" data-tpl-use title="${tr('Use template')}">${ic('plus', 's')}</button><button class="iconbtn" data-tpl-edit title="${tr('Edit template')}">${ic('edit', 's')}</button></div>`).join('')
    || `<div class="muted mhint">${tr('No templates yet. Save one from a task menu (…) or the list dialog: “Save as template”.')}</div>`;
}

// ------------------------------------------------------------------ statistics (module "stats")
// Numbers come from GET /api/stats (per user, last 12 weeks; definitions there), habit rates and streaks
// from the habit history the client already has (same numbers as in the habit dialog). Charts are inline
// SVG drawn at the real pixel width (readable on phones), colours from the theme variables.
S.st = {data: null, loading: false, err: null, v: -1, mode: LS.get('statsMode', 'week')};
async function loadStats() {
  if (S.st.loading) return;
  S.st.loading = true;
  const v = S.v;
  try { S.st.data = await rawFetch('GET', '/api/stats'); S.st.err = null; S.st.v = v; }
  catch (e) { if (e.message !== 'auth') S.st.err = e instanceof Offline ? 'offline' : e.message; S.st.v = v; }
  finally { S.st.loading = false; }
  if (S.route.mod === 'stats') renderView();
}
const chartW = () => Math.max(260, Math.min(760, ($('#view')?.clientWidth || 720) - 48));
function niceMax(v) { for (let p = 1; ; p *= 10) for (const m of [2, 4, 6, 10]) if (m * p >= v) return m * p; }  // even: the middle grid line stays a whole number
const topRound = (x, y, w, h, r) => { r = Math.min(r, w / 2, h); return h <= 0 ? '' : `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`; };
const shortDay = s => pd(s).toLocaleDateString(LOCALE(), {day: 'numeric', month: 'short'});
function yGrid(W, padL, padT, ih, max, fmt) {
  return [0, max / 2, max].map(v => { const y = padT + ih - ih * v / max; return `<line class="ch-grid" x1="${padL}" x2="${W}" y1="${y}" y2="${y}"/><text class="ch-ax" x="${padL - 6}" y="${y + 4}" text-anchor="end">${esc(fmt(v))}</text>`; }).join('');
}
function barChart(vals, labels, {fmt = v => String(v), tip, label}) {
  const W = chartW(), H = 170, padL = 36, padT = 10, padB = 24, ih = H - padT - padB, n = vals.length;
  const max = niceMax(Math.max(1, ...vals)), slot = (W - padL) / n, bw = Math.max(4, slot - Math.max(2, Math.min(10, slot * .28)));
  const every = Math.ceil(n * 46 / (W - padL));
  let h = yGrid(W, padL, padT, ih, max, fmt);
  vals.forEach((v, i) => {
    const x = padL + i * slot + (slot - bw) / 2, bh = ih * v / max;
    h += `<path class="ch-bar" d="${topRound(x, padT + ih - bh, bw, bh, 4)}"/>`;
    if ((n - 1 - i) % every === 0) h += `<text class="ch-ax" x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${esc(labels[i])}</text>`;
    h += `<rect class="ch-hit" x="${padL + i * slot}" y="${padT}" width="${slot}" height="${ih}"><title>${esc(tip(i))}</title></rect>`;
  });
  return `<svg class="chart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label + ': ' + vals.map((v, i) => tip(i)).join('; '))}">${h}</svg>`;
}
function lineChart(vals, labels, {tip, label}) {
  const W = chartW(), H = 160, padL = 36, padT = 12, padB = 24, ih = H - padT - padB, n = vals.length;
  const max = niceMax(Math.max(1, ...vals)), slot = (W - padL - 12) / Math.max(1, n - 1);
  const X = i => padL + 6 + i * slot, Y = v => padT + ih - ih * v / max;
  const every = Math.ceil(n * 46 / (W - padL));
  let h = yGrid(W, padL, padT, ih, max, v => String(v));
  h += `<polyline class="ch-line" points="${vals.map((v, i) => `${X(i)},${Y(v)}`).join(' ')}"/>`;
  vals.forEach((v, i) => {
    h += `<circle class="ch-dot" cx="${X(i)}" cy="${Y(v)}" r="4"/>`;
    if ((n - 1 - i) % every === 0) h += `<text class="ch-ax" x="${X(i)}" y="${H - 6}" text-anchor="${i === n - 1 ? 'end' : 'middle'}">${esc(labels[i])}</text>`;
    h += `<rect class="ch-hit" x="${X(i) - slot / 2}" y="${padT}" width="${slot}" height="${ih}"><title>${esc(tip(i))}</title></rect>`;
  });
  return `<svg class="chart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label + ': ' + vals.map((v, i) => tip(i)).join('; '))}">${h}</svg>`;
}
function hbarChart(rows, {fmt = v => String(v), label}) {  // rows: [{name, v}]
  if (!rows.length) return `<div class="muted stempty">${tr('Nothing in this period.')}</div>`;
  const W = chartW(), rh = 30, H = rows.length * rh, labW = Math.min(170, W * .38), valW = 58, bw = W - labW - valW;
  const max = Math.max(1, ...rows.map(r => r.v));
  const cut = s => s.length > 24 ? s.slice(0, 23) + '…' : s;
  return `<svg class="chart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label + ': ' + rows.map(r => `${r.name} ${fmt(r.v)}`).join('; '))}">${rows.map((r, i) => {
    const y = i * rh, w = Math.max(3, bw * r.v / max);
    return `<text class="ch-lab" x="0" y="${y + 19}">${esc(cut(r.name))}</text><path class="ch-bar" d="M${labW},${y + 7}H${labW + w - 4}Q${labW + w},${y + 7} ${labW + w},${y + 11}V${y + 19}Q${labW + w},${y + 23} ${labW + w - 4},${y + 23}H${labW}Z"/><text class="ch-val" x="${labW + w + 8}" y="${y + 19}">${esc(fmt(r.v))}</text><rect class="ch-hit" x="0" y="${y}" width="${W}" height="${rh}"><title>${esc(r.name + ': ' + fmt(r.v))}</title></rect>`;
  }).join('')}</svg>`;
}
function heatmap(weeks, perDay, t0, {unit}) {  // weeks: Mondays; columns = weeks, rows = Mon..Sun
  const W = chartW(), lab = 30, gap = 3, cs = Math.max(10, Math.min(22, Math.floor((W - lab) / weeks.length) - gap));
  const H = 7 * (cs + gap) + 20, max = Math.max(1, ...Object.values(perDay));
  const lvl = v => !v ? 0 : Math.min(4, Math.ceil(4 * v / max));
  let h = [0, 2, 4, 6].map(r => `<text class="ch-ax" x="${lab - 6}" y="${r * (cs + gap) + cs * .75}" text-anchor="end">${esc(WD_MO()[r])}</text>`).join('');
  weeks.forEach((w, c) => {
    for (let r = 0; r < 7; r++) {
      const d = addDays(w, r); if (d > t0) continue;
      const v = perDay[d] || 0;
      h += `<rect class="hm l${lvl(v)}" x="${lab + c * (cs + gap)}" y="${r * (cs + gap)}" width="${cs}" height="${cs}" rx="3"><title>${esc(`${fmtDate(d)}: ${unit(v)}`)}</title></rect>`;
    }
  });
  h += `<text class="ch-ax" x="${lab}" y="${H - 4}">${esc(shortDay(weeks[0]))}</text><text class="ch-ax" x="${lab + weeks.length * (cs + gap) - gap}" y="${H - 4}" text-anchor="end">${esc(tr('Today'))}</text>`;
  return `<svg class="chart" width="${Math.min(W, lab + weeks.length * (cs + gap))}" height="${H}" role="img" aria-label="${esc(tr('Completed per day'))}">${h}</svg>
    <div class="hmleg muted">${tr('less')}${[0, 1, 2, 3, 4].map(l => `<i class="hm l${l}"></i>`).join('')}${tr('more')}</div>`;
}
const listLabel = x => x.id === -1 ? tr('No task') : x.id === 0 ? tr('Other lists') : x.is_inbox && x.name === 'Eingang' ? tr('Inbox') : listName(x.name);
function viewStats() {
  const st = S.st;
  if ((st.v !== S.v || !st.data) && !st.loading) setTimeout(loadStats, 0);
  const j = st.data;
  if (!j) return `<div class="empty">${st.err ? (st.err === 'offline' ? tr('Statistics are only available online.') : esc(st.err)) : tr('Loading…')}</div>`;
  const wl = j.weeks.map(shortDay), tipW = (i, s) => `${tr('Week of {0}', fmtDate(j.weeks[i]))}: ${s}`;
  const tiles = [
    [j.done.this_week, tr('completed this week'), trn('{0} today', '{0} today', j.done.today)],
    [j.ontime.rate == null ? '–' : j.ontime.rate + '%', tr('on time'), j.ontime.with_due ? tr('{0} of {1} with a date', j.ontime.ontime, j.ontime.with_due) : tr('no completed tasks with a date')],
    [j.streak.current, trn('day in a row', 'days in a row', j.streak.current), tr('best: {0}', j.streak.best)],
    ...(feat('pomo') ? [[fmtH(j.focus.this_week), tr('focus this week'), tr('12 weeks: {0}', fmtH(j.focus.total))]] : []),
    ...(timeOn() && j.time ? [[fmtH(j.time.this_week), tr('tracked this week'), tr('12 weeks: {0}', fmtH(j.time.total))]] : []),
  ];
  const mode = st.mode;
  let h = `<div class="stats"><div class="sttiles">${tiles.map(([v, l, s]) => `<div><b>${esc(String(v))}</b><span>${esc(l)}</span><small>${esc(s)}</small></div>`).join('')}</div>
    <section class="stcard"><div class="sthead"><h3>${tr('Completed tasks')}</h3><span class="muted">${trn('{0} in 12 weeks', '{0} in 12 weeks', j.done.total)}</span><span class="spacer"></span>
      <div class="seg"><button class="${mode === 'week' ? 'on' : ''}" data-act="stats-mode" data-k="week">${tr('Weeks')}</button><button class="${mode === 'day' ? 'on' : ''}" data-act="stats-mode" data-k="day">${tr('Days')}</button></div></div>
      ${mode === 'day' ? heatmap(j.weeks, j.done.per_day, j.today, {unit: v => trn('{0} completed', '{0} completed', v)})
        : barChart(j.done.per_week, wl, {tip: i => tipW(i, trn('{0} completed', '{0} completed', j.done.per_week[i])), label: tr('Completed per week')})}</section>
    <section class="stcard"><div class="sthead"><h3>${tr('By list')}</h3><span class="muted">${tr('last 12 weeks')}</span></div>
      ${hbarChart(j.done.by_list.map(x => ({name: listLabel(x), v: x.n})), {label: tr('Completed by list')})}</section>
    <section class="stcard"><div class="sthead"><h3>${tr('Overdue')}</h3><span class="muted">${trn('{0} overdue now', '{0} overdue now', j.overdue[j.overdue.length - 1].n)}</span></div>
      ${lineChart(j.overdue.map(x => x.n), j.overdue.map((x, i) => i === j.overdue.length - 1 ? tr('Today') : shortDay(x.date)), {label: tr('Overdue tasks at the end of each week'), tip: i => `${i === j.overdue.length - 1 ? tr('Today') : fmtDate(j.overdue[i].date)}: ${trn('{0} overdue', '{0} overdue', j.overdue[i].n)}`})}</section>`;
  if (feat('pomo')) h += `<section class="stcard"><div class="sthead"><h3>${tr('Focus time')}</h3><span class="muted">${tr('12 weeks: {0}', fmtH(j.focus.total))}</span></div>
      ${barChart(j.focus.per_week, wl, {fmt: v => fmtH(Math.round(v)), tip: i => tipW(i, fmtH(j.focus.per_week[i])), label: tr('Focus minutes per week')})}
      <h4>${tr('By list')}</h4>${hbarChart(j.focus.by_list.map(x => ({name: listLabel(x), v: x.minutes})), {fmt: fmtH, label: tr('Focus by list')})}</section>`;
  if (timeOn() && j.time) h += `<section class="stcard"><div class="sthead"><h3>${tr('Tracked time')}</h3><span class="muted">${tr('12 weeks: {0}', fmtH(j.time.total))}</span><span class="spacer"></span><button class="btn sm" data-go="time">${ic('clock', 's')} ${tr('Reports')}</button></div>
      ${barChart(j.time.per_week, wl, {fmt: v => fmtH(Math.round(v)), tip: i => tipW(i, fmtH(j.time.per_week[i])), label: tr('Tracked minutes per week')})}
      <h4>${tr('By list')}</h4>${hbarChart(j.time.by_list.map(x => ({name: listLabel(x), v: x.minutes})), {fmt: fmtH, label: tr('Tracked time by list')})}</section>`;
  const hs = feat('habits') ? S.habits.filter(x => !x.archived) : [];
  if (hs.length) h += `<section class="stcard"><div class="sthead"><h3>${tr('Habits')}</h3></div><div class="sthabits">
      <div class="shh muted"><span></span><span>${tr('rate')}</span><span>${tr('streak')}</span><span>${tr('best')}</span></div>
      ${hs.map(x => { const s = habitStats(x), col = x.color || HCOLORS[0]; return `<div class="shr" data-act="habit-open" data-id="${x.id}" title="${esc(x.per_week ? tr('Share of the last 4 weeks that reached the target') : tr('Share of the scheduled days of the last 30 days'))}"><span class="n"><i class="sw" style="background:${col}"></i>${esc(x.name)}</span>
        <span class="rate"><svg width="64" height="8" viewBox="0 0 64 8" preserveAspectRatio="none" aria-hidden="true"><rect class="ch-track" width="64" height="8" rx="4"/><rect class="ch-bar" width="${Math.round(64 * s.rate / 100)}" height="8" rx="4"/></svg><b>${s.rate}%</b></span><span><b>${s.streak}</b> ${esc(streakUnit(x))}</span><span>${s.best}</span></div>`; }).join('')}</div></section>`;
  h += `<p class="muted stnote">${tr('Last 12 weeks. A completed task counts for the person who ticked it off, also in shared lists; “won’t do” does not count. On time = completed on or before the due day. Overdue = your open tasks (assigned to you, or unassigned in your own lists) whose due date had passed at the end of each week, based on the current due dates.')}</p></div>`;
  return h;
}
let statsResize;
window.addEventListener('resize', () => { if (S.route.mod !== 'stats') return; clearTimeout(statsResize); statsResize = setTimeout(renderView, 150); });

// ------------------------------------------------------------------ time tracking (module "time")
// Timer (one per user, kept on the server, so it follows you across devices), manual entries, reports,
// CSV export and a printable timesheet. The rules (who sees which entries, focus vs. timer, days, rounding)
// are documented at the time tracking section of app.py. Start / stop carry the device time and a client
// id, so they can wait in the offline outbox and still land at the right time.
const timeOn = () => feat('time');
const hmm = s => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 3600)}:${pad(Math.floor(s % 3600 / 60))}`; };
const fmtDur = s => fmtH(Math.floor(Math.max(0, s) / 60));
const fmtClock = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const hoursDec = s => (s / 3600).toLocaleString(LOCALE(), {minimumFractionDigits: 2, maximumFractionDigits: 2});
const money = (v, cur) => v.toLocaleString(LOCALE(), {minimumFractionDigits: 2, maximumFractionDigits: 2}) + (cur ? ' ' + cur : '');
const timerElapsed = () => S.timer ? Math.max(0, (Date.now() - new Date(S.timer.start)) / 1000) : 0;
const newCid = () => (window.crypto?.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
function taskTime(id) {  // [everyone I can see, mine] in seconds, incl. my running timer
  const [a, m] = (S.timeTotals || {})[id] || [0, 0], run = S.timer && S.timer.task_id === id ? timerElapsed() : 0;
  return [a + run, m + run];
}
function addLocalTotal(tid, sec) {  // offline: keep the task chips right until the next sync
  if (!tid || !(sec > 0)) return;
  const [a, m] = (S.timeTotals ||= {})[tid] || [0, 0];
  S.timeTotals[tid] = [a + sec, m + sec];
}
function timeLocal(e) {  // applyLocal part of the outbox (start / stop / entries)
  const {url, body = {}} = e;
  if (url === '/api/time/start') {
    if (S.timer) addLocalTotal(S.timer.task_id, (new Date(body.at) - new Date(S.timer.start)) / 1000);
    const t = body.task_id ? S.tasks.get(body.task_id) : null;
    S.timer = {id: null, client_id: body.client_id, task_id: body.task_id || null, list_id: t ? t.list_id : body.list_id || null, title: t ? t.title : '',
      start: body.at, end: null, note: body.note || '', running: true, mine: true, source: 'timer', seconds: 0};
    return {entry: S.timer, timer: S.timer, stopped: null, queued: true};
  }
  if (url === '/api/time/stop') {
    if (S.timer && (!body.client_id || body.client_id === S.timer.client_id)) { addLocalTotal(S.timer.task_id, (new Date(body.at) - new Date(S.timer.start)) / 1000); S.timer = null; }
    return {entry: null, timer: null, queued: true};
  }
  return {ok: true, queued: true};
}
async function timeChanged(j) {
  if (!j || !j.queued) await load().catch(() => {});
  render();
  if (S.sel) { renderDetail(); loadTaskTime(S.sel); }
}
async function timerStart(target, note = '') {
  let j;
  try { j = await api('POST', '/api/time/start', {...target, note, at: new Date().toISOString(), client_id: newCid()}); } catch { return; }
  if (j.timer !== undefined) S.timer = j.timer;
  if (j.stopped) toast(tr('Previous timer stopped ({0})', hmm(j.stopped.seconds)));
  else if (j.queued) toast(tr('Timer started, will be sent as soon as the server is reachable'));
  await timeChanged(j);
}
async function timerStop() {
  const r = S.timer; if (!r) return;
  let j;
  try { j = await api('POST', '/api/time/stop', {...(r.id ? {id: r.id} : {}), ...(r.client_id ? {client_id: r.client_id} : {}), at: new Date().toISOString()}); } catch { return; }
  S.timer = j.timer ?? null;
  toast(j.discarded ? tr('Timer discarded (shorter than a second)') : tr('Timer stopped: {0}', hmm(j.entry ? j.entry.seconds : timerElapsed())));
  await timeChanged(j);
}
const timerToggle = tid => S.timer && S.timer.task_id === tid ? timerStop() : timerStart({task_id: tid});
function timerPill() {
  if (!S.timer || !timeOn()) return '';
  const n = S.timer.title || tr('No task');
  return `<button class="tmini" data-act="timer-pill" title="${esc(tr('Timer running: {0}', n))}"><span class="rec"></span><span data-timer-mini>${fmtT(timerElapsed())}</span><span class="tmt">${esc(n)}</span></button>`;
}
function timerMenu(a) {
  const t = S.timer; if (!t) return;
  menu(a, [{label: tr('Stop timer'), icon: 'stop', fn: timerStop},
    ...(t.task_id && taskById(t.task_id) ? [{label: tr('Open task'), icon: 'edit', fn: () => openDetail(t.task_id)}] : []),
    ...(t.id ? [{label: tr('Change start time or note…'), icon: 'clock', fn: () => entryModal(t)}] : []),
    {label: tr('Time tracking'), icon: 'clock', fn: () => go('time')}]);
}
setInterval(() => {  // live timer: top pill, detail panel, the running task's chip
  if (!S.timer) return;
  const el = timerElapsed();
  $$('[data-timer-mini],[data-timer-live]').forEach(x => { x.textContent = fmtT(el); });
  $$(`[data-tt="${S.timer.task_id}"] b`).forEach(x => { x.textContent = fmtDur(taskTime(S.timer.task_id)[0]); });
}, 1000);

// ---- entries of the open task (detail panel)
S.te = {tid: null, items: null, v: -1, all: false, err: null};
async function loadTaskTime(id) {
  if (!timeOn() || !(id > 0)) return;
  const v = S.v;
  if (S.te.tid !== id) S.te = {tid: id, items: null, v: -1, all: false, err: null};
  try { const j = await rawFetch('GET', `/api/time/entries?task_id=${id}`); if (S.te.tid === id) Object.assign(S.te, {items: j.entries, v, err: null}); }
  catch (e) { if (S.te.tid === id) Object.assign(S.te, {v, err: e instanceof Offline ? 'offline' : e.message}); }
  drawTaskTime();
}
function drawTaskTime() { const el = $('#d-time'), t = taskById(S.sel); if (el && t && S.te.tid === t.id) el.innerHTML = taskTimeHtml(t); }
function taskTimeHtml(t) {
  const [all, mine] = taskTime(t.id), run = S.timer && S.timer.task_id === t.id;
  const items = S.te.tid === t.id ? S.te.items : null;
  let h = `<h5>${tr('Time|tracked')}${all >= 60 ? ` <span class="muted h5note">${all - mine >= 60 ? tr('{0} in total, {1} by you', fmtDur(all), fmtDur(mine)) : fmtDur(all)}</span>` : ''}</h5>
    <div class="tebtns"><button class="btn sm ${run ? 'recon' : ''}" data-act="timer-toggle" data-id="${t.id}">${run ? `${ic('stop', 's')} ${tr('Stop')} <span data-timer-live>${fmtT(timerElapsed())}</span>` : `${ic('play', 's')} ${tr('Start timer')}`}</button><button class="btn sm" data-act="te-add" data-id="${t.id}">${ic('plus', 's')} ${tr('Add time')}</button></div>`;
  if (items === null) return h + (S.te.err === 'offline' ? `<div class="muted mhint">${tr('Time entries are only available online.')}</div>` : '');
  const shown = S.te.all ? items : items.slice(0, 8);
  return h + `<div class="telist">${shown.map(e => teRow(e, {task: false})).join('')}</div>` +
    (items.length > shown.length ? `<button class="btn sm telink" data-act="te-more">${tr('Show all ({0})', items.length)}</button>` : '');
}
function teRow(e, {task = true, day = true} = {}) {
  const s = new Date(e.start), en = e.end ? new Date(e.end) : null;
  const src = e.source === 'focus' ? `<span class="tesrc" title="${tr('From a focus session')}">${ic('timer', 's')}</span>`
    : e.auto_stopped ? `<span class="tesrc warn" title="${tr('Stopped automatically, please check the end')}">${ic('alert', 's')}</span>` : '';
  const who = e.mine ? '' : `<span class="who" title="${esc(e.user_name)}">${esc(initials(e.user_name))}</span>`;
  const title = task ? `<span class="tett" ${e.task_id ? `data-act="te-open" data-id="${e.task_id}"` : ''}>${esc(e.title || tr('No task'))}</span>` : '';
  const acts = e.mine ? `<span class="teacts">${!e.running && (e.task_id || e.list_id) ? `<button class="iconbtn" data-act="te-resume" data-eid="${e.id}" title="${tr('Continue (same task and note)')}">${ic('play', 's')}</button>` : ''}<button class="iconbtn" data-act="te-edit" data-eid="${e.id}" title="${tr('Edit')}">${ic('edit', 's')}</button><button class="iconbtn danger" data-act="te-del" data-eid="${e.id}" title="${tr('Delete')}">${ic('trash', 's')}</button></span>` : '';
  return `<div class="terow ${e.running ? 'live' : ''}">${day ? `<span class="ted">${esc(dayLabel(ds(s)))}</span>` : ''}<span class="tet">${fmtClock(s)}–${en ? fmtClock(en) : tr('now')}</span>${title}<span class="ten">${esc(e.note)}</span>${src}${who}<b class="tedur" ${e.running ? 'data-timer-live' : ''}>${e.running ? fmtT(timerElapsed()) : hmm(e.seconds)}</b>${acts}</div>`;
}
const findEntry = id => [...(S.te.items || []), ...(S.tv.data?.entries || []), ...(S.timer ? [S.timer] : [])].find(e => e.id === id);
// "1:30" = 90 min, "45m" = 45 min, "1.5" / "1,5h" = 90 min (a bare number means hours)
function parseDur(v) {
  v = String(v || '').trim().toLowerCase(); if (!v) return null;
  let m;
  if ((m = v.match(/^(\d+):(\d{1,2})$/))) return +m[1] * 60 + +m[2];
  if ((m = v.match(/^(\d+)\s*m(in)?$/))) return +m[1];
  const f = parseFloat(v.replace(',', '.').replace(/\s*h$/, ''));
  return isNaN(f) || f <= 0 ? null : Math.round(f * 60);
}
function targetOptions(tid, lid) {
  const lists = S.lists.filter(l => !l.archived || l.id === lid || (tid && taskById(tid)?.list_id === l.id));
  const cur = tid && taskById(tid);
  return lists.map(l => {
    const ts = sortTasks(openTasks().filter(t => t.list_id === l.id && !t.parent_id));
    if (cur && cur.list_id === l.id && !ts.includes(cur)) ts.unshift(cur);
    const sub = x => [x, ...children(x.id).filter(k => k.status === 0 || k.id === tid).flatMap(sub)];
    return `<optgroup label="${esc(lname(l))}"><option value="l:${l.id}" ${!tid && lid === l.id ? 'selected' : ''}>${esc(tr('(whole list, no task)'))}</option>${ts.flatMap(sub).map(t => `<option value="t:${t.id}" ${t.id === tid ? 'selected' : ''}>${' '.repeat(depthOf(t))}${esc(t.title)}</option>`).join('')}</optgroup>`;
  }).join('');
}
// new entry (e = null; preset {task_id} | {list_id}) or edit my entry (a running timer: start time, note, task)
function entryModal(e, preset = {}) {
  const run = !!(e && e.running), s = e ? new Date(e.start) : null, en = e && e.end ? new Date(e.end) : null;
  const tid = e ? e.task_id : preset.task_id || null, lid = e ? e.list_id : preset.list_id || (tid ? taskById(tid)?.list_id : null) || routeList()?.id || inbox()?.id;
  const md = modal(`<h3>${run ? tr('Running timer') : e ? tr('Edit time entry') : tr('Add time')}</h3>
    <div class="row"><label>${tr('Task')}</label><select id="te-target">${targetOptions(tid, lid)}</select></div>
    <div class="row"><label>${tr('Date')}</label><input type="date" id="te-date" value="${ds(s || new Date())}" max="${today()}"></div>
    <div class="row"><label>${run ? tr('Started at') : tr('From – to')}</label><input type="time" id="te-from" value="${s ? fmtClock(s) : ''}">${run ? '' : `<span class="muted">–</span><input type="time" id="te-to" value="${en ? fmtClock(en) : ''}">`}</div>
    ${run ? '' : `<div class="row"><label>${tr('or duration')}</label><input id="te-dur" placeholder="${tr('e.g. 1:30, 45m or 1.5')}" inputmode="decimal" autocomplete="off"></div>`}
    <div class="row"><label>${tr('Note')}</label><input id="te-note" value="${esc(e?.note || '')}" maxlength="500" autocomplete="off"></div>
    ${run ? '' : `<div class="shint">${tr('An end before the start means the next day. Only a duration: the entry ends now (today) or starts at 9:00.')}</div>`}
    <div class="foot">${e && !run ? `<button class="btn danger" data-m="del">${tr('Delete')}</button>` : ''}<span class="spacer"></span><button class="btn" data-m="close">${tr('Cancel')}</button><button class="btn pri" data-m="save">${tr('Save')}</button></div>`);
  const times = () => {
    const date = $('#te-date', md).value, from = $('#te-from', md).value, to = $('#te-to', md)?.value, dur = parseDur($('#te-dur', md)?.value);
    if (!date) return null;
    let a = from ? new Date(`${date}T${from}`) : null, b = null;
    if (run) return a ? {start: a} : null;
    if (a && to && !dur) { b = new Date(`${date}T${to}`); if (b <= a) b = new Date(b.getTime() + 864e5); }
    else if (dur) {
      if (a) b = new Date(a.getTime() + dur * 6e4);
      else if (date === today()) { b = new Date(); b.setSeconds(0, 0); a = new Date(b.getTime() - dur * 6e4); }
      else { a = new Date(`${date}T09:00`); b = new Date(a.getTime() + dur * 6e4); }
    }
    return a && b ? {start: a, end: b} : null;
  };
  md.addEventListener('click', async ev => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.m === 'close') { md.remove(); return; }
    if (b.dataset.m === 'del') { md.remove(); teDelete(e.id); return; }
    if (b.dataset.m !== 'save') return;
    const tm = times();
    if (!tm) { toast(run ? tr('Please enter the start time') : tr('Please enter start and end, or a duration')); return; }
    if (tm.end && tm.end - tm.start < 6e4) { toast(tr('The end is before the start')); return; }
    if (tm.start > new Date()) { toast(tr('Entries cannot lie in the future')); return; }
    const [k, v] = $('#te-target', md).value.split(':'), body = {note: $('#te-note', md).value.trim()};
    const target = k === 't' ? {task_id: +v} : {list_id: +v};
    if (!e || (k === 't' ? +v !== e.task_id : e.task_id || +v !== e.list_id)) Object.assign(body, target);
    const iso = d => d.toISOString();
    if (!e || fmtClock(tm.start) !== fmtClock(s) || ds(tm.start) !== ds(s) || (!run && (!en || fmtClock(tm.end) !== fmtClock(en) || ds(tm.end) !== ds(en)))) {
      body.start = iso(tm.start); if (!run) body.end = iso(tm.end);
    }
    let j;
    try { j = e ? await api('PATCH', `/api/time/entries/${e.id || 0}`, body) : await api('POST', '/api/time/entries', {...target, ...body}); } catch { return; }
    md.remove();
    toast(j.queued ? tr('Will be sent as soon as the server is reachable') : e ? tr('Saved') : tr('Time added: {0}', hmm(j.seconds)));
    await timeChanged(j);
  });
  md.addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.tagName === 'INPUT') $('[data-m="save"]', md).click(); });
  setTimeout(() => $(e ? '#te-note' : run ? '#te-from' : '#te-dur', md)?.focus(), 50);
}
async function teDelete(id) {
  const e = findEntry(id); if (!e) return;
  let r;
  try { r = await api('DELETE', `/api/time/entries/${id}`); } catch { return; }
  if (S.timer && S.timer.id === id) S.timer = null;
  const back = {...(e.task_id ? {task_id: e.task_id} : {list_id: e.list_id}), start: e.start, end: e.end, seconds: e.seconds, note: e.note, source: e.source};
  await timeChanged(r);
  if (e.end) offerUndo(tr('Time entry deleted ({0})', hmm(e.seconds)), r, [], () => api('POST', '/api/time/entries', back));
  else toast(tr('Timer discarded'));
}

// ---- reports view (#time)
S.tv = {data: null, loading: false, err: null, key: '', period: LS.get('timePeriod', 'week'), from: LS.get('timeFrom', ''), to: LS.get('timeTo', ''),
  scope: LS.get('timeScope', 'mine'), lists: LS.get('timeLists', []), entries: LS.get('timeEntries', false)};
const TPERIODS = [['week', N_('This week')], ['lastweek', N_('Last week')], ['month', N_('This month')], ['lastmonth', N_('Last month')], ['custom', N_('Custom')]];
const monthEnd = s => { const d = pd(s); return ds(new Date(d.getFullYear(), d.getMonth() + 1, 0)); };
function timeRange() {
  const t = today(), mon = mondayOf(t), m0 = t.slice(0, 8) + '01';
  switch (S.tv.period) {
    case 'lastweek': return [addDays(mon, -7), addDays(mon, -1)];
    case 'month': return [m0, monthEnd(m0)];
    case 'lastmonth': { const d = pd(m0), p = ds(new Date(d.getFullYear(), d.getMonth() - 1, 1)); return [p, monthEnd(p)]; }
    case 'custom': if (S.tv.from && S.tv.to) return S.tv.from <= S.tv.to ? [S.tv.from, S.tv.to] : [S.tv.to, S.tv.from]; return [mon, addDays(mon, 6)];
    default: return [mon, addDays(mon, 6)];
  }
}
const timeScope = () => hasSharing() && S.tv.scope === 'all' ? 'all' : 'mine';
const tvLists = () => S.tv.lists.filter(id => id === 0 || listById(id));
function timeQuery() {
  const [f, t] = timeRange(), q = new URLSearchParams({from: f, to: t, scope: timeScope()});
  if (tvLists().length) q.set('lists', tvLists().join(','));
  return q.toString();
}
async function loadTime() {
  if (S.tv.loading) return;
  S.tv.loading = true;
  const q = timeQuery(), key = q + '|' + S.v;
  try { S.tv.data = await rawFetch('GET', '/api/time/report?' + q); S.tv.data._q = q; S.tv.err = null; }
  catch (e) { if (e.message !== 'auth') S.tv.err = e instanceof Offline ? 'offline' : e.message; }
  finally { S.tv.loading = false; S.tv.key = key; }
  if (S.route.mod === 'time') renderView();
}
const tvListName = l => l.id === 0 ? tr('No list') : l.is_inbox && l.name === 'Eingang' ? tr('Inbox') : l.name;
const rangeLabel = (f, t) => f === t ? fmtDate(f) : `${fmtDate(f)} – ${fmtDate(t)}`;
function tvListsLabel() {
  const ids = tvLists();
  if (!ids.length) return tr('All lists');
  return ids.length === 1 ? (ids[0] === 0 ? tr('No list') : lname(listById(ids[0]))) : trn('{0} list', '{0} lists', ids.length);
}
function viewTime() {
  const tv = S.tv, [f, t] = timeRange(), q = timeQuery();
  if (tv.key !== q + '|' + S.v && !tv.loading) setTimeout(loadTime, 0);
  const j = tv.data && tv.data._q === q ? tv.data : null;
  let h = `<div class="stats timev"><div class="tvbar"><div class="seg tvseg">${TPERIODS.map(([k, n]) => `<button class="${tv.period === k ? 'on' : ''}" data-act="tv-period" data-k="${k}">${tr(n)}</button>`).join('')}</div>
      ${tv.period === 'custom' ? `<span class="tvrange"><input type="date" id="tv-from" value="${f}" aria-label="${tr('From')}"><span class="muted">–</span><input type="date" id="tv-to" value="${t}" aria-label="${tr('To')}"></span>` : `<span class="muted tvlabel">${esc(rangeLabel(f, t))}</span>`}</div>
    <div class="tvbar">${hasSharing() ? `<div class="seg"><button class="${timeScope() === 'mine' ? 'on' : ''}" data-act="tv-scope" data-k="mine">${tr('Only mine')}</button><button class="${timeScope() === 'all' ? 'on' : ''}" data-act="tv-scope" data-k="all">${tr('All members')}</button></div>` : ''}
      <button class="btn sm" data-act="tv-lists">${ic('filter', 's')} ${esc(tvListsLabel())}</button><span class="spacer"></span>
      <button class="btn sm" data-act="te-add">${ic('plus', 's')} ${tr('Entry')}</button>
      <a class="btn sm" href="/api/time/export.csv?${esc(q)}" download>${ic('download', 's')} CSV</a>
      <button class="btn sm" data-act="tv-sheet" ${j ? '' : 'disabled'}>${ic('file', 's')} ${tr('Timesheet')}</button></div>`;
  if (!j) return h + `<div class="empty">${tv.err ? (tv.err === 'offline' ? tr('Reports are only available online.') : esc(tv.err)) : tr('Loading…')}</div></div>`;
  const tot = j.total, rm = j.rounding, hasAmt = j.lists.some(l => l.rate), tgt = j.today.target_h;
  const tiles = [[hmm(tot.seconds), tr('tracked'), rm ? tr('rounded: {0}', hmm(tot.rounded)) : trn('{0} entry', '{0} entries', tot.count)],
    [hoursDec(tot.rounded) + ' h', rm ? tr('hours (rounded)') : tr('hours'), rm ? trn('{0} entry', '{0} entries', tot.count) : tr('decimal')],
    [hmm(j.today.seconds), tr('today'), tgt ? tr('{0}% of the daily target ({1} h)', Math.round(100 * j.today.seconds / 3600 / tgt), String(tgt).replace('.', LOCALE().startsWith('de') ? ',' : '.')) : tr('your time')]];
  if (hasAmt) tiles.push([money(tot.amount, j.currency), tr('amount'), tr('hourly rates of the lists')]);
  h += `<div class="sttiles">${tiles.map(([v, l, s]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span><small>${esc(s)}</small></div>`).join('')}</div>`;
  // per day (per week for long ranges)
  const days = []; for (let d = f; d <= t && days.length < 400; d = addDays(d, 1)) days.push(d);
  const per = Object.fromEntries(j.days.map(x => [x.date, x.seconds / 60]));
  if (days.length > 1) {
    const weekly = days.length > 62, keys = weekly ? [...new Set(days.map(mondayOf))] : days;
    const vals = keys.map(k => weekly ? days.filter(d => mondayOf(d) === k).reduce((n, d) => n + (per[d] || 0), 0) : per[k] || 0);
    h += `<section class="stcard"><div class="sthead"><h3>${weekly ? tr('Per week') : tr('Per day')}</h3></div>${barChart(vals, keys.map(k => weekly ? shortDay(k) : days.length <= 7 ? WD[pd(k).getDay()] : String(pd(k).getDate())),
      {fmt: v => fmtH(Math.round(v)), tip: i => `${weekly ? tr('Week of {0}', fmtDate(keys[i])) : fmtDate(keys[i])}: ${fmtH(Math.round(vals[i]))}`, label: tr('Tracked time')})}</section>`;
  }
  if (!j.lists.length) return h + `<div class="empty">${ic('clock')}${tr('No time tracked in this period.')}</div></div>`;
  const all = j.scope === 'all', ppl = us => all && us.length ? `<small class="muted">${esc(us.map(([n, s]) => `${n} ${hmm(s)}`).join(', '))}</small>` : '';
  h += `<section class="stcard"><div class="sthead"><h3>${tr('By list and task')}</h3>${rm ? `<span class="muted">${tr('rounded up to {0} min per entry', rm)}</span>` : ''}</div>
    <table class="ttable"><thead><tr><th>${tr('List / task')}</th><th class="n">${tr('Time|tracked')}</th>${rm ? `<th class="n">${tr('Rounded')}</th>` : ''}${hasAmt ? `<th class="n">${tr('Amount')}</th>` : ''}</tr></thead><tbody>
    ${j.lists.map(l => { const closed = S.collapsed.has('tvl:' + l.id); return `<tr class="tvl ${closed ? 'closed' : ''}" data-act="tv-toggle" data-key="tvl:${l.id}"><td>${ic('chev', 's')}<span>${esc(tvListName(l))}</span>${ppl(l.users)}</td><td class="n">${hmm(l.seconds)}</td>${rm ? `<td class="n">${hmm(l.rounded)}</td>` : ''}${hasAmt ? `<td class="n">${l.rate ? money(l.amount, j.currency) : ''}</td>` : ''}</tr>` +
      (closed ? '' : l.tasks.map(x => `<tr class="tvt" ${x.id ? `data-act="te-open" data-id="${x.id}"` : ''}><td><span>${esc(x.title || tr('No task'))}</span>${ppl(x.users)}</td><td class="n">${hmm(x.seconds)}</td>${rm ? `<td class="n">${hmm(x.rounded)}</td>` : ''}${hasAmt ? `<td class="n">${l.rate ? money(x.amount, j.currency) : ''}</td>` : ''}</tr>`).join('')); }).join('')}
    <tr class="tvsum"><td>${tr('Total')}</td><td class="n">${hmm(tot.seconds)}</td>${rm ? `<td class="n">${hmm(tot.rounded)}</td>` : ''}${hasAmt ? `<td class="n">${money(tot.amount, j.currency)}</td>` : ''}</tr></tbody></table></section>`;
  const byDay = {}; for (const e of j.entries) (byDay[e.day] ||= []).push(e);
  h += `<section class="stcard"><div class="sthead tvtoggle" data-act="tv-entries"><h3>${ic('chev', 's' + (tv.entries ? '' : ' closedc'))} ${tr('Entries')}</h3><span class="muted">${tot.count}</span></div>
    ${tv.entries ? Object.keys(byDay).sort().reverse().map(d => `<div class="teday"><span>${esc(dayLabel(d))}</span><b>${hmm(byDay[d].reduce((n, e) => n + e.seconds, 0))}</b></div>${byDay[d].slice().reverse().map(e => teRow(e, {day: false})).join('')}`).join('') : ''}</section>`;
  return h + `<p class="muted stnote">${tr('An entry counts on the day it starts. Rounding and the hourly rate (list settings) only apply to the report, CSV and timesheet; the tracked times stay exact.')}</p></div>`;
}
function tvListsMenu(anchor) {
  const cur = new Set(tvLists());
  const ls = S.lists.filter(l => !l.archived || cur.has(l.id));
  const p = openPop(anchor, `<div class="menu-list tvlm"><label><input type="checkbox" data-l="all" ${cur.size ? '' : 'checked'}> ${tr('All lists')}</label><hr>${ls.map(l => `<label><input type="checkbox" data-l="${l.id}" ${cur.has(l.id) ? 'checked' : ''}> ${esc(lname(l))}</label>`).join('')}<label><input type="checkbox" data-l="0" ${cur.has(0) ? 'checked' : ''}> ${tr('No list')}</label></div>`, () => { S.tv.key = ''; renderView(); });
  p.onchange = e => {
    const x = e.target.closest('[data-l]'); if (!x) return;
    if (x.dataset.l === 'all') S.tv.lists = [];
    else { const id = +x.dataset.l, s = new Set(tvLists()); x.checked ? s.add(id) : s.delete(id); S.tv.lists = [...s]; }
    LS.set('timeLists', S.tv.lists);
    $$('[data-l]', p).forEach(c => { c.checked = c.dataset.l === 'all' ? !S.tv.lists.length : S.tv.lists.includes(+c.dataset.l); });
  };
}
async function openTaskById(id) {  // a task from the report may be completed long ago (not in the state)
  if (!taskById(id)) {
    try { (S.extra ||= []).push(await rawFetch('GET', `/api/tasks/${id}`)); }
    catch (e) { toast(e instanceof Offline ? tr('Only available online.') : tr('Task not found')); return; }
  }
  openDetail(id);
}
// printable timesheet ("Stundennachweis") of the current report; the browser's print dialog saves it as PDF
function timesheet() {
  const j = S.tv.data; if (!j) return;
  const rm = j.rounding, hasAmt = j.lists.some(l => l.rate), cur = j.currency, all = j.scope === 'all';
  const who = all ? tr('All members') : j.me.display_name;
  const filt = tvLists().length ? ' · ' + tvListsLabel() : '';
  const ustr = us => esc(us.map(([n, s]) => `${n} ${hmm(s)}`).join(', '));
  const cols = (x, rate, amt) => `<td class="n">${hmm(x.rounded)}</td><td class="n">${hoursDec(x.rounded)}</td>${hasAmt ? `<td class="n">${rate}</td><td class="n">${amt}</td>` : ''}`;
  const byList = {}; for (const e of j.entries) (byList[e.list_id || 0] ||= []).push(e);
  const lname2 = id => { const l = j.lists.find(x => x.id === id); return l ? tvListName(l) : tr('No list'); };
  const doc = `<h1>${tr('Timesheet')}</h1><div class="tssub">${esc(rangeLabel(j.from, j.to))} · ${esc(who)}${esc(filt)}${rm ? ' · ' + esc(tr('rounded up to {0} min per entry', rm)) : ''} · ${esc(tr('created {0}', fmtDate(today())))}</div>
    <div class="tskpi"><div><b>${hoursDec(j.total.rounded)} h</b><span>${rm ? tr('hours (rounded)') : tr('hours')}</span></div><div><b>${hmm(j.total.rounded)}</b><span>h:mm</span></div>${hasAmt ? `<div><b>${money(j.total.amount, cur)}</b><span>${tr('amount')}</span></div>` : ''}<div><b>${j.total.count}</b><span>${trn('entry', 'entries', j.total.count)}</span></div></div>
    <table><thead><tr><th>${tr('List / task')}</th><th>${tr('People')}</th><th class="n">h:mm</th><th class="n">${tr('Hours')}</th>${hasAmt ? `<th class="n">${tr('Rate')}</th><th class="n">${tr('Amount')}</th>` : ''}</tr></thead><tbody>
    ${j.lists.map(l => `<tr class="p"><td>${esc(tvListName(l))}</td><td class="muted">${ustr(l.users)}</td>${cols(l, l.rate ? money(l.rate, cur) : '', l.rate ? money(l.amount, cur) : '')}</tr>${l.tasks.map(x => `<tr class="t"><td>${esc(x.title || tr('No task'))}</td><td class="muted">${ustr(x.users)}</td>${cols(x, '', l.rate ? money(x.amount, cur) : '')}</tr>`).join('')}`).join('')}
    <tr class="g"><td>${tr('Total')}</td><td class="muted">${esc(j.users.map(u => `${u.name} ${hmm(u.rounded)}`).join(', '))}</td><td class="n">${hmm(j.total.rounded)}</td><td class="n">${hoursDec(j.total.rounded)}</td>${hasAmt ? `<td></td><td class="n">${money(j.total.amount, cur)}</td>` : ''}</tr></tbody></table>
    <h2>${tr('Per day')}</h2><table class="tsdays"><thead><tr><th>${tr('Date')}</th><th class="n">h:mm</th><th class="n">${tr('Hours')}</th></tr></thead><tbody>${j.days.map(d => `<tr><td>${esc(fmtDay('year', pd(d.date)))}</td><td class="n">${hmm(d.rounded)}</td><td class="n">${hoursDec(d.rounded)}</td></tr>`).join('')}</tbody></table>
    <div class="tsentries">${Object.keys(byList).map(id => `<h2>${esc(lname2(+id))}</h2><table class="entries"><thead><tr><th>${tr('Date')}</th><th>${tr('Time|tracked')}</th><th>${tr('Task')}</th><th>${tr('Note')}</th>${all ? `<th>${tr('User')}</th>` : ''}<th class="n">h:mm</th>${rm ? `<th class="n">${tr('Rounded')}</th>` : ''}</tr></thead><tbody>
      ${byList[id].map(e => { const s = new Date(e.start), en = e.end ? new Date(e.end) : null; return `<tr><td>${esc(fmtDate(ds(s)))}</td><td>${fmtClock(s)} – ${en ? fmtClock(en) : tr('running')}</td><td>${esc(e.title || tr('No task'))}</td><td class="note">${esc(e.note)}</td>${all ? `<td class="muted">${esc(e.user_name)}</td>` : ''}<td class="n">${hmm(e.seconds)}</td>${rm ? `<td class="n">${hmm(e.rounded)}</td>` : ''}</tr>`; }).join('')}</tbody></table>`).join('')}</div>`;
  $('.tsheet')?.remove();
  const el = document.createElement('div');
  el.className = 'tsheet';
  el.innerHTML = `<div class="tsbar"><button class="btn pri" data-ts="print">${ic('download', 's')} ${tr('Print / save as PDF')}</button><label class="chkl"><input type="checkbox" id="ts-entries" ${LS.get('tsEntries', true) ? 'checked' : ''}> ${tr('Individual entries')}</label><span class="spacer"></span><span class="muted tshint">${tr('In the print dialog choose “Save as PDF”.')}</span><button class="iconbtn" data-ts="close" aria-label="${tr('Close')}">${ic('x')}</button></div><div class="tspage ${LS.get('tsEntries', true) ? '' : 'noentries'}" lang="${esc(document.documentElement.lang)}">${doc}</div>`;
  document.body.appendChild(el);
  document.body.classList.add('tsprint');
  const close = () => { el.remove(); document.body.classList.remove('tsprint'); document.title = APP_NAME; };
  el.addEventListener('click', ev => { const b = ev.target.closest('[data-ts]'); if (!b) return; if (b.dataset.ts === 'close') close(); else window.print(); });
  el.addEventListener('change', ev => { if (ev.target.id === 'ts-entries') { LS.set('tsEntries', ev.target.checked); $('.tspage', el).classList.toggle('noentries', !ev.target.checked); } });
  el.addEventListener('keydown', ev => { if (ev.key === 'Escape') close(); });
  document.title = `${tr('Timesheet')} ${rangeLabel(j.from, j.to)}${all ? '' : ' ' + j.me.display_name}`;
}

// ------------------------------------------------------------------ toast
let toastTimer;
function toast(msg, undo, ms) {
  const el = $('#toast');
  if (!undo) UNDO.cur = null;  // one undo at a time: any other message ends it
  el.innerHTML = `<span>${esc(msg)}</span>${undo ? `<button>${tr('Undo')}</button>${isMobile() ? '' : `<kbd>${/Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘' : 'Ctrl+'}Z</kbd>`}` : ''}`;
  el.classList.remove('hidden');
  if (undo) el.querySelector('button').onclick = () => { el.classList.add('hidden'); undo(); };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.add('hidden'); if (undo) UNDO.cur = null; }, ms || (undo ? 6000 : 2500));
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
  const url = r.url || d.url || null;
  if (!r.title && url) r.title = urlTitle(url);  // only a link typed / shared: domain + path as title
  if (!r.title && d.files?.length) r.title = d.files[0].name.replace(/\.[^.]+$/, '');  // shared file without a title
  if (!r.title) return;
  const body = {title: r.title, list_id: r.list_id || d.list_id, due: r.due || d.due, due_time: r.due_time || d.due_time, priority: r.priority ?? d.priority ?? 0,
    tags: [...(d.tags || []), ...(r.tags || [])], repeat: r.repeat || '', section_id: d.section_id, content: d.content || ''};
  if (url) body.url = url;
  if (d.assignee_id && !r.list_id) body.assignee_id = d.assignee_id;
  if (body.due_time && S.settings.default_reminder !== '') body.reminders = S.settings.default_reminder;
  input.value = ''; S.quick.ignore = new Set(); updateChips(input);
  if (input.id === 'qsheet' && (S.quickPreset.content || S.quickPreset.url || S.quickPreset.due_time || S.quickPreset.files?.length)) { S.quickPreset = {}; closePop(); }
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
    q.innerHTML = `<div class="box">${ic('plus')}<input id="qsheet" placeholder="${tr("What's next?")}" autocomplete="off" enterkeyhint="send">${tplBtn()}<button class="iconbtn" data-act="qsheet-send" aria-label="${tr('Add')}">${ic('arrow')}</button></div><div class="chips"></div><div class="qhint">${tr('tomorrow 3pm · !high · #tag · ~list · every monday')}</div>`;
    document.body.appendChild(q);
  }
  $('#scrim').classList.remove('hidden');
  popOnClose = () => { q.remove(); S.quickPreset = {}; };
  const nf = preset.files?.length || 0;
  const hint = [preset.due ? dayLabel(preset.due) + (preset.due_time ? ' ' + preset.due_time : '') : '', preset.content ? tr('Link as description') : '', preset.url ? tr('Link: {0}', urlHost(preset.url)) : '',
    nf ? (nf === 1 ? tr('Attachment: {0}', preset.files[0].name) : tr('{0} attachments', nf)) : ''].filter(Boolean).join(' · ');
  $('.qhint', q).textContent = hint || tr('tomorrow 3pm · !high · #tag · ~list · every monday');
  const inp = $('#qsheet'); inp.value = prefill; updateChips(inp);
  setTimeout(() => inp.focus(), 30);
}

// ------------------------------------------------------------------ events
document.addEventListener('click', async e => {
  if (e.target.closest('a.lnk, a.linkchip')) return;  // website link: the browser opens it (new tab)
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
  if (cb) { e.stopPropagation(); if (canEdit(taskById(S.sel))) toggleMdCheckbox(+cb.dataset.mdline); else { e.preventDefault(); roToast(); } return; }
  if (e.target.closest('#d-md') && !e.target.closest('a')) { if (canEdit(taskById(S.sel))) editContent(); return; }
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
    case 'news-open': newsOpen(+a.dataset.i); break;
    case 'news-readall': S.nf.items?.forEach(x => { x.read = true; }); newsRead({all: true}); break;
    case 'news-filter': S.nf.filter = a.dataset.f; LS.set('newsFilter', a.dataset.f); S.nf.items = null; renderView(); break;
    case 'toggle': e.stopPropagation(); toggleTask(id); break;
    case 'close-detail': closeDetail(); break;
    case 'collapse': {
      if (e.target.closest('.gact')) break;
      const k = a.dataset.key; S.collapsed.has(k) ? S.collapsed.delete(k) : S.collapsed.add(k); LS.set('collapsed', [...S.collapsed]); renderView(); break;
    }
    case 'side': $('#side').classList.add('open'); $('#scrim').classList.remove('hidden'); popOnClose = closeSide; break;
    case 'settings': closeSide(); settingsModal(); break;
    case 'user-menu': menu(a, [{label: tr('Account'), icon: 'user', fn: () => { closeSide(); settingsModal('account'); }},
      ...(S.me?.auth === 'session' ? [{label: tr('Log out'), icon: 'logout', fn: logout}] : [])]); break;
    case 'tabs-more': tabsMore(a); break;
    case 'list-new': menu(a, [{label: tr('New list'), icon: 'list', fn: () => { closeSide(); listModal(); }}, ...(tplOf('list').length ? [{label: tr('New list from template'), icon: 'copy', fn: () => { closeSide(); templateMenu($('#top h1'), 'list'); }}] : []), {label: tr('New folder'), icon: 'folder', fn: () => newFolder()}]); break;
    case 'tpl-use': if (a.closest('.qadd.sheet')) { closePop(); templateMenu($('#fab'), 'task'); } else templateMenu(a, 'task'); break;
    case 'stats-mode': S.st.mode = a.dataset.k; LS.set('statsMode', S.st.mode); renderView(); break;
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
    case 'catt-view': {
      e.preventDefault();
      const c = (S.tl.comments || []).find(x => x.id === +a.dataset.cid);
      attLightbox(+a.dataset.att, (c?.attachments || []).filter(isImg)); break;
    }
    case 'catt-del': {
      e.preventDefault(); e.stopPropagation();
      const c = (S.tl.comments || []).find(x => (x.attachments || []).some(f => f.id === +a.dataset.att)), f = c?.attachments.find(x => x.id === +a.dataset.att);
      if (!f || !confirm(tr('Remove “{0}”?', f.name))) break;
      try { await capi('DELETE', `/api/attachments/${f.id}`); } catch { break; }
      c.attachments = c.attachments.filter(x => x.id !== f.id); drawTimeline(); break;
    }
    case 'link-edit': S.editLink = true; renderDetail(); setTimeout(() => { const i = $('#d-url'); if (i) { i.focus(); i.select(); } }, 0); break;
    case 'link-rm': { const t = taskById(S.sel); if (t && confirm(tr('Remove the link?'))) patchTask(t.id, {url: null}); break; }
    case 'tl-act': LS.set('showActivity', !showAct()); a.classList.toggle('on', showAct()); drawTimeline(); break;
    case 'c-send': sendComment(); break;
    case 'c-file-rm': { const arr = S.cfiles[S.sel] || []; arr.splice(+a.dataset.i, 1); $('#c-files').innerHTML = composerFiles(S.sel); break; }
    case 'mention-pick': mentionPick(+a.dataset.i); break;
    case 'c-edit': S.cedit = +a.dataset.cid; drawTimeline(); setTimeout(() => { const i = $(`.c-edit-input[data-cid="${a.dataset.cid}"]`); if (i) { autosize(i); i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 0); break;
    case 'c-edit-cancel': S.cedit = null; mentionClose(); drawTimeline(); break;
    case 'c-edit-save': {
      const cid = +a.dataset.cid, ta = $(`.c-edit-input[data-cid="${cid}"]`); if (!ta) break;
      try { await capi('PATCH', `/api/comments/${cid}`, {body: encodeMentions(ta.value.trim(), S.tl.people)}); } catch { break; }
      S.cedit = null; mentionClose(); await loadTimeline(S.sel); break;
    }
    case 'c-del': {
      const cid = +a.dataset.cid;
      if (!confirm(tr('Delete this comment?'))) break;
      try { await capi('DELETE', `/api/comments/${cid}`); } catch { break; }
      if (S.cedit === cid) S.cedit = null;
      await loadTimeline(S.sel); break;
    }
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
    case 'mb-list': menu(a, S.lists.filter(l => !l.archived && l.role !== 'view').map(l => ({label: lname(l), fn: () => batch('patch', {list_id: l.id, section_id: null})}))); break;
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
    case 'timer-pill': timerMenu(a); break;
    case 'timer-toggle': timerToggle(id); break;
    case 'te-add': entryModal(null, id ? {task_id: id} : {}); break;
    case 'te-edit': { const en = findEntry(+a.dataset.eid); if (en) entryModal(en); break; }
    case 'te-del': teDelete(+a.dataset.eid); break;
    case 'te-resume': { const en = findEntry(+a.dataset.eid); if (en) timerStart(en.task_id ? {task_id: en.task_id} : {list_id: en.list_id}, en.note); break; }
    case 'te-more': S.te.all = true; drawTaskTime(); break;
    case 'te-open': if (id) openTaskById(id); break;
    case 'tv-period': S.tv.period = a.dataset.k; LS.set('timePeriod', S.tv.period); if (S.tv.period === 'custom' && !S.tv.from) { [S.tv.from, S.tv.to] = [addDays(today(), -29), today()]; LS.set('timeFrom', S.tv.from); LS.set('timeTo', S.tv.to); } renderView(); break;
    case 'tv-scope': S.tv.scope = a.dataset.k; LS.set('timeScope', S.tv.scope); renderView(); break;
    case 'tv-lists': tvListsMenu(a); break;
    case 'tv-toggle': { const k = a.dataset.key; S.collapsed.has(k) ? S.collapsed.delete(k) : S.collapsed.add(k); LS.set('collapsed', [...S.collapsed]); renderView(); break; }
    case 'tv-entries': S.tv.entries = !S.tv.entries; LS.set('timeEntries', S.tv.entries); renderView(); break;
    case 'tv-sheet': timesheet(); break;
  }
});
function closeSide() { $('#side').classList.remove('open'); if (!$('.qadd.sheet') && $('#pop').classList.contains('hidden')) $('#scrim').classList.add('hidden'); }
$('#scrim').addEventListener('click', () => { closeSide(); closePop(); });
$('#fab').addEventListener('click', () => openQuickSheet());

document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'qinput' || t.id === 'qsheet') updateChips(t);
  if (t.id === 'd-title') { autosize(t); queueSave(S.sel, 'title', t.value.replace(/\n/g, ' ')); }
  if (t.id === 'c-input') { autosize(t); S.drafts[S.sel] = t.value; mentionUpdate(t); }
  if (t.classList?.contains('c-edit-input')) { autosize(t); mentionUpdate(t); }
  if (t.id === 'd-content') { autosize(t); queueSave(S.sel, 'content', t.value); }
  if (t.id === 'searchq') doSearch(t.value);
});
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.id === 'd-file') { uploadFiles(S.sel, t.files); t.value = ''; return; }
  if (t.id === 'c-file') { addCommentFiles(t.files); t.value = ''; return; }
  if (t.id === 'd-url') { saveLink(t.value); return; }
  if (t.id === 'd-list') patchUndoable(S.sel, {list_id: +t.value}, tr('Moved to {0}', lname(listById(+t.value))));
  if (t.id === 'd-sec') patchTask(S.sel, {section_id: t.value ? +t.value : null});
  if (t.id === 'd-assignee') patchTask(S.sel, {assignee_id: t.value ? +t.value : null});
  if (t.id === 'pomo-task') { pomoTask = t.value; LS.set('pomoTask', t.value); }
  if ((t.id === 'tv-from' || t.id === 'tv-to') && t.value) { S.tv[t.id.slice(3)] = t.value; LS.set(t.id === 'tv-from' ? 'timeFrom' : 'timeTo', t.value); renderView(); }
});
document.addEventListener('keydown', async e => {
  const t = e.target;
  if (e.key === 'Enter' && !e.isComposing) {
    if (t.id === 'qinput' || t.id === 'qsheet') { e.preventDefault(); submitQuick(t); return; }
    if (t.id === 'd-title') { e.preventDefault(); t.blur(); return; }
    if (t.id === 'd-url') { e.preventDefault(); t.blur(); return; }
    if (t.classList?.contains('nitem')) { e.preventDefault(); newsOpen(+t.dataset.i); return; }
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
    const ts = $('.tsheet'); if (ts && !$('.modal')) { $('[data-ts="close"]', ts).click(); return; }
    if (!$('#pop').classList.contains('hidden') || $('.qadd.sheet')) { closePop(); return; }
    if (S.multi.size || S.multiMode) { S.multi.clear(); S.multiMode = false; render(); return; }
    const m = $$('.modal:not(.authscreen)').pop(); if (m) { m.remove(); return; }
    if (/INPUT|TEXTAREA/.test(t.tagName)) { t.blur(); return; }
    if (S.sel) closeDetail();
    return;
  }
  if (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'n' || e.key === 'q') { e.preventDefault(); const q = currentQuickInput(); if (q && !isMobile()) q.focus(); else openQuickSheet(); }
  if (e.key === '/') { e.preventDefault(); go('search'); }
});
document.addEventListener('focusout', e => {
  if (e.target.id === 'c-input' || e.target.classList?.contains('c-edit-input')) setTimeout(() => { if (S.mp && document.activeElement !== S.mp.ta) mentionClose(); }, 150);
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
  $('#fab').classList.toggle('gone', noFab() || S.multiMode || n > 0);
  b.innerHTML = `<span class="mcount">${n ? tr('{0} selected', n) : tr('Tap tasks')}</span>
    <button class="iconbtn" data-act="mb-all" title="${tr('All')}">${ic('all')}</button>
    ${n ? `<button class="iconbtn" data-act="mb-date" title="${tr('Date')}">${ic('cal')}</button><button class="iconbtn" data-act="mb-prio" title="${tr('Priority')}">${ic('flag')}</button><button class="iconbtn" data-act="mb-list" title="${tr('List')}">${ic('folder')}</button><button class="iconbtn" data-act="mb-tag" title="${tr('Add tag')}">${ic('tag')}</button><button class="iconbtn" data-act="mb-pin" title="${tr('Pin')}">${ic('pin')}</button><button class="iconbtn" data-act="mb-done" title="${tr('Completed')}">${ic('done')}</button><button class="iconbtn danger" data-act="mb-del" title="${tr('Delete')}">${ic('trash')}</button>` : ''}
    <button class="iconbtn" data-act="mb-close" title="${tr('Done')}">${ic('x')}</button>`;
}
async function batch(action, data, clear) {
  const ids = [...S.multi];
  if (!ids.length) return;
  const snaps = ids.flatMap(withKids);
  const j = await api('POST', '/api/tasks/batch', {ids, action, data});
  if (j.errors?.length) toast(j.errors[0]);
  if (clear) { S.multi.clear(); S.multiMode = false; }
  await load(); render();
  if (j.errors?.length) return;
  const msg = action === 'complete' ? trn('{0} task completed', '{0} tasks completed', ids.length) : action === 'delete' ? trn('{0} task deleted', '{0} tasks deleted', ids.length) : trn('{0} task changed', '{0} tasks changed', ids.length);
  if (action === 'complete') offerUndo(msg, j, snaps, res => res?.undo && Object.keys(res.undo).length ? api('POST', '/api/tasks/batch', {ids: Object.keys(res.undo).map(Number), action: 'undo', data: {items: res.undo}}) : false);
  else if (action === 'delete') offerUndo(msg, j, snaps, () => api('POST', '/api/tasks/batch', {ids, action: 'restore'}));
  else if (action === 'patch') {
    const items = {};
    for (const b of snaps) { const a = S.tasks.get(b.id); const rev = a && ids.includes(b.id) && reverseOf(b, a, [...UNDO_FIELDS, 'tags']); if (rev) items[b.id] = rev; }
    if (Object.keys(items).length) offerUndo(msg, j, snaps, () => api('POST', '/api/tasks/batch', {ids: Object.keys(items).map(Number), action: 'patch_each', data: {items}}));
    else toast(msg);
  } else toast(msg);
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
  if (e.target.closest('.ccomp')) { addCommentFiles(e.dataTransfer.files); return; }
  const id = tgt.id === 'detail' ? S.sel : +tgt.dataset.id;
  if (id) uploadFiles(id, e.dataTransfer.files);
}, true);
document.addEventListener('paste', e => {
  if (!S.sel || $('.modal') || !$('#detail').classList.contains('open') && !$('#app').classList.contains('detail-open')) return;
  const files = [...(e.clipboardData?.files || [])];
  if (!files.length) return;  // plain text paste stays normal
  e.preventDefault();
  if (document.activeElement?.id === 'c-input') { addCommentFiles(files); return; }  // image into the comment
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
  if (!canEdit(t)) { roToast(); return; }
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
      try { await patchUndoable(id, {parent_id: null, list_id: item.list_id, section_id: null}, tr('Standalone in {0}', lname(listById(item.list_id)))); } catch { return; }
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
  if (item.list_id && !canEditList(item.list_id)) { roToast(); return; }
  const before = snapTask(t);
  Object.assign(t, item);
  render();
  let res;
  try { res = await api('POST', '/api/tasks/reorder', {items: [item]}); } catch { /* api() showed it */ return; }
  await load(); render();
  // a move to another list or day can be undone (plain reordering not)
  const after = S.tasks.get(id), rev = after && (before.list_id !== after.list_id || before.due !== after.due || (before.due_time || null) !== (after.due_time || null)) && reverseOf(before, after);
  if (rev) offerUndo(before.list_id !== after.list_id ? tr('Moved to {0}', lname(listById(after.list_id))) : after.due ? tr('Date: {0}', dayLabel(after.due)) : tr('Date removed'), res, [before], () => undoPatch(id, rev));
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
  try { await load(); if (!S.lists.length) throw new Error('no state'); } catch (e) { if (e.message === 'auth') return; await i18nBoot; $('#view').innerHTML = `<div class="empty">${tr('Server not reachable.')}<br>${tr('Reload the page once the server is reachable again.')}</div>`; return; }
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
    // the link goes into the link field; a bare link gets domain + path as title
    const [u, rest] = shareLink(meta.text, meta.url);
    const title = meta.title || rest || (u ? urlTitle(u) : '') || (files[0] ? files[0].name.replace(/\.[^.]+$/, '') : '');
    openQuickSheet(title, {url: u, list_id: inbox().id, files});
  } else if (location.pathname === '/share') {  // Android share sheet (text only, old manifest) -> new task
    const q = new URLSearchParams(location.search);
    const text = (q.get('text') || '').trim();
    history.replaceState(null, '', '/#inbox');
    await route();
    const [u, rest] = shareLink(text, (q.get('url') || '').trim());
    openQuickSheet((q.get('title') || '').trim() || rest || (u ? urlTitle(u) : ''), {url: u, list_id: inbox().id});
  } else if (new URLSearchParams(location.search).get('action') === 'new') {  // app shortcut "New task"
    history.replaceState(null, '', '/' + (location.hash || ''));
    await route();
    openQuickSheet();
  } else await route();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
})();
