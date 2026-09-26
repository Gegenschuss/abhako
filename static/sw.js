// tasks service worker: cache the app shell so the PWA opens offline;
// API calls always go to the network (data must be live). Language files: de.json is precached,
// any other static/i18n/<code>.json lands in the cache via the network-first handler on first use
// (the client also keeps the active one in localStorage as a last offline fallback).
const CACHE = 'tasks-shell-v22';
const SHELL = ['/', '/manifest.json', '/static/app.css', '/static/i18n.js', '/static/i18n/de.json', '/static/app.js', '/static/icon-192.png', '/static/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// Android share sheet (share_target POST): keep the shared files in a cache and open the app,
// which then creates the task + uploads with the normal (login) session.
async function handleShare(req) {
  try {
    const fd = await req.formData();
    const cache = await caches.open('tasks-share');
    for (const k of await cache.keys()) await cache.delete(k);
    const files = [...fd.values()].filter(f => typeof f !== 'string' && f.size);  // any field name
    const meta = {title: fd.get('title') || '', text: fd.get('text') || '', url: fd.get('url') || '', files: []};
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      await cache.put(`/share-inbox/${i}`, new Response(f, {headers: {'Content-Type': f.type || 'application/octet-stream'}}));
      meta.files.push({name: f.name || `datei-${i + 1}`, type: f.type || '', size: f.size});
    }
    await cache.put('/share-inbox/meta', new Response(JSON.stringify(meta), {headers: {'Content-Type': 'application/json'}}));
    return Response.redirect('/?share=1', 303);
  } catch (e) {
    return Response.redirect('/?share=err', 303);
  }
}
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method === 'POST' && url.pathname === '/share') { e.respondWith(handleShare(e.request)); return; }
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  // network first, fall back to cache (a new deploy shows up immediately when online)
  e.respondWith(fetch(e.request).then(r => { if (r.ok && !r.redirected && r.type === 'basic') { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; }).catch(() => caches.match(e.request, {ignoreSearch: url.pathname === '/'})));
});
