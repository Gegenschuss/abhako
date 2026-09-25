#!/usr/bin/env python3
"""Abhako — self-hosted task manager (single user), inspired by TickTick.

Has NO login of its own: run it behind a reverse proxy that authenticates
(e.g. Authelia, oauth2-proxy, basic auth) or only inside a private network / VPN.
Storage: SQLite at /data/tasks.db. Dates are LOCAL ($TZ, Europe/Berlin):
tasks.due = 'YYYY-MM-DD', tasks.due_time = 'HH:MM' or NULL (all-day).

Modules: lists (+ sections = kanban columns), tasks with subtasks, tags,
priority, reminders, recurrence (RRULE via dateutil), habits, pomodoro.
A watchdog thread sends ntfy pushes for due reminders, finished focus
sessions, habit reminders and the optional daily digest.
TickTick CSV backups can be imported (idempotent via tasks.tt_id)."""
import csv
import glob
import io
import json
import mimetypes
import os
import re
import uuid
import secrets
import sqlite3
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from dateutil.rrule import rrulestr
from flask import Flask, Response, g, has_request_context, jsonify, redirect, request, send_file, send_from_directory

DB = os.environ.get("TASKS_DB", "/data/tasks.db")
TZ = ZoneInfo(os.environ.get("TZ", "Europe/Berlin"))
NTFY_TOPIC = os.environ.get("NTFY_TOPIC", "")
NTFY_URL = os.environ.get("NTFY_URL", "https://ntfy.sh")
NTFY_TOKEN = os.environ.get("NTFY_TOKEN", "")  # optional ntfy access token (write access to NTFY_TOPIC)
PUBLIC_URL = os.environ.get("PUBLIC_URL", "http://localhost:3040")
WATCHDOG_INTERVAL = int(os.environ.get("TASKS_WATCHDOG_INTERVAL", "30"))

ATT_DIR = os.environ.get("TASKS_ATTACHMENTS", os.path.join(os.path.dirname(DB), "attachments"))
MAX_FILE_MB = int(os.environ.get("TASKS_MAX_FILE_MB", "50"))
# shown in the browser; everything else is served as a download (svg/html could carry script)
INLINE_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp", "image/avif", "image/bmp",
                "image/heic", "image/heif", "application/pdf"}

# Paperless-ngx integration (link documents, send attachments). Empty token = feature off.
PL_TOKEN = os.environ.get("PAPERLESS_TOKEN", "")
PL_API = os.environ.get("PAPERLESS_API", "").rstrip("/")
PL_PUBLIC = os.environ.get("PAPERLESS_PUBLIC_URL", "").rstrip("/")

# Optional share inbox: every message on an ntfy topic becomes an inbox task (files as attachments).
# Needs a token with read access to that topic (NTFY_INBOX_TOKEN).
NTFY_IN = {"token": os.environ.get("NTFY_INBOX_TOKEN", ""), "url": os.environ.get("NTFY_INBOX_URL", "").rstrip("/"),
           "public": os.environ.get("NTFY_INBOX_PUBLIC", "").rstrip("/"), "topic": os.environ.get("NTFY_INBOX_TOPIC", "inbox")}

app = Flask(__name__, static_folder="static", static_url_path="/static")
app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_MB * 4 * 1024 * 1024  # one request may carry several files

SCHEMA = """
CREATE TABLE IF NOT EXISTS lists (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, color TEXT NOT NULL DEFAULT '',
  folder TEXT NOT NULL DEFAULT '', sort REAL NOT NULL DEFAULT 0,
  view TEXT NOT NULL DEFAULT 'list', is_inbox INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sections (
  id INTEGER PRIMARY KEY, list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL, sort REAL NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY, list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
  parent_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL, content TEXT NOT NULL DEFAULT '',
  priority INTEGER NOT NULL DEFAULT 0,          -- 0 none, 1 low, 3 medium, 5 high
  status INTEGER NOT NULL DEFAULT 0,            -- 0 open, 2 done, -1 won't do
  due TEXT, due_time TEXT,
  reminders TEXT NOT NULL DEFAULT '',           -- csv of minutes before due ("0,15")
  reminded TEXT NOT NULL DEFAULT '',            -- json list of fired keys
  repeat TEXT NOT NULL DEFAULT '',              -- RRULE body (FREQ=...)
  repeat_from TEXT NOT NULL DEFAULT 'due',      -- 'due' | 'done'
  sort REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  completed_at TEXT, deleted_at TEXT, tt_id TEXT);
CREATE INDEX IF NOT EXISTS tasks_list ON tasks(list_id);
CREATE INDEX IF NOT EXISTS tasks_parent ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS tasks_open ON tasks(status) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS tasks_tt ON tasks(tt_id) WHERE tt_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS task_tags (
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag TEXT NOT NULL, PRIMARY KEY (task_id, tag));
CREATE TABLE IF NOT EXISTS habits (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, color TEXT NOT NULL DEFAULT '',
  goal INTEGER NOT NULL DEFAULT 1, days TEXT NOT NULL DEFAULT '1234567',
  remind_at TEXT NOT NULL DEFAULT '', reminded_on TEXT NOT NULL DEFAULT '',
  sort REAL NOT NULL DEFAULT 0, archived INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS habit_logs (
  habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  day TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (habit_id, day));
CREATE TABLE IF NOT EXISTS pomos (
  id INTEGER PRIMARY KEY, task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'focus', minutes INTEGER NOT NULL,
  start TEXT NOT NULL, paused_at TEXT, paused_s INTEGER NOT NULL DEFAULT 0,
  end TEXT, done INTEGER NOT NULL DEFAULT 0, notified INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY, task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL, mime TEXT NOT NULL DEFAULT '', size INTEGER NOT NULL DEFAULT 0,
  path TEXT NOT NULL,                           -- relative to ATT_DIR
  created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS attachments_task ON attachments(task_id);
CREATE TABLE IF NOT EXISTS paperless_links (
  id INTEGER PRIMARY KEY, task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  doc_id INTEGER,                               -- NULL while an upload is still being consumed
  title TEXT NOT NULL DEFAULT '', correspondent TEXT NOT NULL DEFAULT '', created TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ok',            -- ok | pending | error
  message TEXT NOT NULL DEFAULT '', ptask TEXT, att_id INTEGER, added_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS paperless_links_task ON paperless_links(task_id);
CREATE TABLE IF NOT EXISTS filters (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL,
  rules TEXT NOT NULL DEFAULT '{}',            -- json: {op, lists, dates, prios, tags}
  sort REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
"""
# additive migrations: (table, column, ddl)
MIGRATIONS = [
    ("tasks", "pinned", "ALTER TABLE tasks ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0"),
    ("tasks", "start", "ALTER TABLE tasks ADD COLUMN start TEXT"),          # timeline: first day (local date)
    ("tasks", "duration", "ALTER TABLE tasks ADD COLUMN duration INTEGER"),  # minutes, week/day calendar blocks
    ("habits", "per_week", "ALTER TABLE habits ADD COLUMN per_week INTEGER NOT NULL DEFAULT 0"),  # 0 = fixed weekdays
    ("habit_logs", "note", "ALTER TABLE habit_logs ADD COLUMN note TEXT NOT NULL DEFAULT ''"),
]
MAX_DEPTH = 3  # task > subtask > sub-subtask
DEFAULT_SETTINGS = {
    "allday_time": "09:00",     # reminder base time for all-day tasks
    "default_reminder": "0",    # reminder preset for new timed tasks ('' = none)
    "digest_time": "",          # daily "due today" push (HH:MM, '' = off)
    "digest_sent": "",
    "pomo_focus": "25", "pomo_short": "5", "pomo_long": "15", "pomo_long_every": "4",
    "ntfy_topic": "",
    "show_completed": "1",      # show the collapsed "Completed" group / done tasks in the calendar
    # modules that can be switched off in the settings (hidden from nav, data stays)
    "features": "cal,timeline,matrix,habits,pomo,kanban,paperless",
    "nav_order": "tasks,cal,matrix,habits,pomo",   # order of the mobile tab bar / desktop rail
    "folders": "[]",
    "features_rev": "1",        # one-shot migrations of the features list
    "paperless_keep": "0",
    "ntfy_inbox_since": "",     # last imported ntfy message id (or unix time on first start)      # 1 = keep the local attachment after it was consumed by Paperless            # json list: folder order in the sidebar (also keeps empty folders)
    "lang": "en",               # UI + push language: en or a static/i18n/<code>.json (global, the watchdog sends pushes)
    "version": "1",
}
PRIO = {0: "", 1: "niedrig", 3: "mittel", 5: "hoch"}


# ---------------------------------------------------------------- i18n
# English is the source language: tr("English text", *args) returns the text in the UI language.
# Translations are the same JSON files the web client loads (static/i18n/<code>.json, see TRANSLATING.md).
# The "lang" setting is global because the watchdog sends pushes in it. A list value = [one, other] (trn()).
I18N_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "i18n")


def load_languages():
    """{code: dict} of every static/i18n/*.json; English is built in (the keys themselves)."""
    out = {"en": {"_meta": {"name": "English", "locale": "en-GB"}}}
    for fn in sorted(glob.glob(os.path.join(I18N_DIR, "*.json"))):
        code = os.path.basename(fn)[:-5]
        try:
            with open(fn, encoding="utf-8") as f:
                d = json.load(f)
            if re.fullmatch(r"[a-z]{2,3}(-[A-Za-z0-9]{2,8})?", code) and code != "en" and isinstance(d, dict):
                out[code] = d
        except (OSError, ValueError) as e:
            print("i18n: skipping", fn, e, flush=True)
    return out


LANGS = load_languages()


def languages():
    """[{code, name}] for the language selector, sorted by name."""
    return sorted(({"code": k, "name": (v.get("_meta") or {}).get("name") or k} for k, v in LANGS.items()),
                  key=lambda x: x["name"].casefold())


def lang(c=None):
    """UI language from the settings ('en' default). Works in requests and in the watchdog threads."""
    try:
        own = c is None and not has_request_context()
        c = c or (db() if has_request_context() else connect())
        try:
            r = c.execute("SELECT value FROM settings WHERE key='lang'").fetchone()
        finally:
            if own:
                c.close()
        return r[0] if r and r[0] in LANGS else "en"
    except Exception:  # noqa: BLE001
        return "en"


def N_(s):
    """Marks a key for tools/i18n_check.py; translated later by a tr call on the variable."""
    return s


def _key(k):
    """English display of a key: 'Text|ctx' -> 'Text'."""
    b = k.find("|")
    return k[:b] if b > 0 else k


def tr(key, *a, lg=None):
    v = LANGS.get(lg or lang(), {}).get(key)
    s = v if isinstance(v, str) else _key(key)
    return s.format(*a) if a else s


def trn(one, other, n, *a, lg=None):
    """Plural: one/other picked by n (n == 1 -> one); {0} = n, {1}.. = a."""
    v = LANGS.get(lg or lang(), {}).get(one)
    s = v[0 if n == 1 else 1] if isinstance(v, list) and len(v) == 2 else _key(one if n == 1 else other)
    return s.format(n, *a)


def now_utc():
    return datetime.now(timezone.utc)


def iso(dt):
    return dt.astimezone(timezone.utc).isoformat(timespec="seconds")


def parse_iso(s):
    return datetime.fromisoformat(s)


def local_now():
    return datetime.now(TZ)


def db():
    if "db" not in g:
        g.db = connect()
    return g.db


def connect():
    c = sqlite3.connect(DB, timeout=10)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA foreign_keys=ON")
    c.execute("PRAGMA journal_mode=WAL")
    return c


@app.teardown_appcontext
def close_db(_):
    c = g.pop("db", None)
    if c is not None:
        c.close()


def init_db():
    os.makedirs(os.path.dirname(DB), exist_ok=True)
    os.makedirs(ATT_DIR, exist_ok=True)
    c = connect()
    c.executescript(SCHEMA)
    for table, col, ddl in MIGRATIONS:
        if col not in {r[1] for r in c.execute(f"PRAGMA table_info({table})")}:
            c.execute(ddl)
    for k, v in DEFAULT_SETTINGS.items():
        c.execute("INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)", (k, v))
    # topic: env wins, otherwise a random private one generated once
    if NTFY_TOPIC:
        c.execute("UPDATE settings SET value=? WHERE key='ntfy_topic'", (NTFY_TOPIC,))
    elif not c.execute("SELECT value FROM settings WHERE key='ntfy_topic'").fetchone()[0]:
        c.execute("UPDATE settings SET value=? WHERE key='ntfy_topic'",
                  ("abhako-" + secrets.token_urlsafe(9).replace("_", "").replace("-", "").lower(),))
    # features_rev 2: paperless module added -> on by default for existing installs
    if int(c.execute("SELECT value FROM settings WHERE key='features_rev'").fetchone()[0] or 1) < 2:
        f = c.execute("SELECT value FROM settings WHERE key='features'").fetchone()[0]
        if "paperless" not in f.split(","):
            c.execute("UPDATE settings SET value=? WHERE key='features'", (f + ",paperless",))
        c.execute("UPDATE settings SET value='2' WHERE key='features_rev'")
    if not c.execute("SELECT 1 FROM lists WHERE is_inbox=1").fetchone():
        c.execute("INSERT INTO lists(name,is_inbox,sort,created_at) VALUES('Eingang',1,-1,?)",
                  (iso(now_utc()),))
    c.commit()
    c.close()


def settings(c=None):
    c = c or db()
    return {r["key"]: r["value"] for r in c.execute("SELECT key,value FROM settings")}


def bump(c):
    c.execute("UPDATE settings SET value=CAST(value AS INTEGER)+1 WHERE key='version'")


def err(msg, code=400):
    return jsonify(error=msg), code  # msg is already translated


def body():
    return request.get_json(silent=True) or {}


# ---------------------------------------------------------------- serializers

def task_dict(r, tags):
    d = dict(r)
    d.pop("reminded", None)
    d["tags"] = tags.get(r["id"], [])
    return d


def tags_for(c, ids=None):
    out = {}
    q = "SELECT task_id, tag FROM task_tags"
    for r in c.execute(q + " ORDER BY tag"):
        if ids is None or r["task_id"] in ids:
            out.setdefault(r["task_id"], []).append(r["tag"])
    return out


def load_tasks(c, where, args=()):
    rows = c.execute(f"SELECT * FROM tasks WHERE {where}", args).fetchall()
    ids = {r["id"] for r in rows}
    tags = tags_for(c, ids)
    atts = {}
    for a in c.execute("SELECT id, task_id, name, mime, size, created_at FROM attachments ORDER BY id"):
        if a["task_id"] in ids:
            atts.setdefault(a["task_id"], []).append({k: a[k] for k in ("id", "name", "mime", "size", "created_at")})
    pls = {}
    for p in c.execute("SELECT id, task_id, doc_id, title, correspondent, created, status, message, att_id "
                       "FROM paperless_links ORDER BY id"):
        if p["task_id"] in ids:
            pls.setdefault(p["task_id"], []).append({k: p[k] for k in p.keys() if k != "task_id"})
    out = []
    for r in rows:
        d = task_dict(r, tags)
        d["attachments"] = atts.get(r["id"], [])
        d["paperless"] = pls.get(r["id"], [])
        out.append(d)
    return out


def attachment_files(c, task_ids):
    """Paths of all attachments of these tasks (and their subtasks), to unlink after a hard delete."""
    ids = set(task_ids)
    for t in list(ids):
        ids.update(descendants(c, t))
    if not ids:
        return []
    q = ",".join("?" * len(ids))
    return [r[0] for r in c.execute(f"SELECT path FROM attachments WHERE task_id IN ({q})", list(ids))]


def unlink_files(paths):
    for p in paths:
        try:
            full = os.path.join(ATT_DIR, p)
            os.remove(full)
            d = os.path.dirname(full)
            if d != ATT_DIR and not os.listdir(d):
                os.rmdir(d)
        except OSError:
            pass


def running_pomo(c):
    r = c.execute("SELECT * FROM pomos WHERE end IS NULL ORDER BY id DESC LIMIT 1").fetchone()
    return dict(r) if r else None


# ---------------------------------------------------------------- pages

CSP = ("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
       "img-src 'self' data:; connect-src 'self'; manifest-src 'self'; worker-src 'self'")


@app.after_request
def headers(resp):
    resp.headers.setdefault("Content-Security-Policy", CSP)
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("Referrer-Policy", "same-origin")
    if request.path.startswith("/api/") and not request.path.startswith("/api/attachments/"):
        resp.headers["Cache-Control"] = "no-store"
    return resp


@app.errorhandler(413)
def too_large(_):  # json, not flask's html page (the client treats html as "session expired")
    return err(tr("Upload too large (max. {0} MB per file)", MAX_FILE_MB), 413)


@app.get("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.get("/share")
def share():
    # Android Web Share Target (manifest share_target): the client reads ?title&text&url
    return send_from_directory(app.static_folder, "index.html")


def new_inbox_task(c, title, content="", tt_id=None):
    inbox = c.execute("SELECT id FROM lists WHERE is_inbox=1").fetchone()[0]
    ts = iso(now_utc())
    srt = c.execute("SELECT COALESCE(MIN(sort),0)-1 FROM tasks WHERE list_id=? AND parent_id IS NULL", (inbox,)).fetchone()[0]
    return c.execute("INSERT INTO tasks(list_id,title,content,sort,created_at,updated_at,tt_id) VALUES(?,?,?,?,?,?,?)",
                     (inbox, (title or tr("Shared"))[:300], content or "", srt, ts, ts, tt_id)).lastrowid


def save_attachment_bytes(c, tid, name, mime, data):
    name = safe_name(name)
    os.makedirs(os.path.join(ATT_DIR, str(tid)), exist_ok=True)
    rel = os.path.join(str(tid), f"{uuid.uuid4().hex[:12]}-{name}")
    with open(os.path.join(ATT_DIR, rel), "wb") as f:
        f.write(data)
    mime = mime if mime and mime != "application/octet-stream" else (mimetypes.guess_type(name)[0] or "application/octet-stream")
    c.execute("INSERT INTO attachments(task_id,name,mime,size,path,created_at) VALUES(?,?,?,?,?,?)",
              (tid, name, mime, len(data), rel, iso(now_utc())))


def ntfy_inbox_import(c, m):
    """One ntfy message -> one inbox task (+ attachment). Idempotent via tt_id 'ntfy:<id>'."""
    mid = m["id"]
    if not c.execute("SELECT 1 FROM tasks WHERE tt_id=?", ("ntfy:" + mid,)).fetchone():
        att = m.get("attachment") or None
        msg = (m.get("message") or "").strip()
        if att and any(msg.startswith(p) for p in SHARE_PLACEHOLDERS):  # ntfy / Android placeholder texts
            msg = ""
        first = msg.split("\n", 1)[0].strip()
        if (m.get("title") or "").strip():
            title, content = m["title"].strip(), msg
        else:  # first line becomes the title, the rest the description
            title = first or (os.path.splitext(att["name"])[0] if att else tr("Shared"))
            content = msg.split("\n", 1)[1].strip() if "\n" in msg else ""
        tid = new_inbox_task(c, title, content, "ntfy:" + mid)
        if att and att.get("url"):
            url = att["url"]
            if NTFY_IN["public"] and url.startswith(NTFY_IN["public"]):  # fetch via the internal URL
                url = NTFY_IN["url"] + url[len(NTFY_IN["public"]):]
            req = urllib.request.Request(url, headers={"Authorization": f"Bearer {NTFY_IN['token']}"})
            with urllib.request.urlopen(req, timeout=120) as r:
                data = r.read(MAX_FILE_MB * 1024 * 1024 + 1)
            if len(data) <= MAX_FILE_MB * 1024 * 1024:
                save_attachment_bytes(c, tid, att.get("name") or "datei", att.get("type") or "", data)
        print("ntfy inbox: task", tid, repr(title), "attachment" if att else "", flush=True)
    c.execute("UPDATE settings SET value=? WHERE key='ntfy_inbox_since'", (mid,))
    bump(c)
    c.commit()


def ntfy_inbox_loop():
    """Stream the inbox topic (ntfy sends keepalives every 45 s); reconnect with the last id."""
    while True:
        try:
            c = connect()
            since = settings(c).get("ntfy_inbox_since") or ""
            if not since:  # first start: only messages from now on
                since = str(int(time.time()))
                c.execute("UPDATE settings SET value=? WHERE key='ntfy_inbox_since'", (since,))
                c.commit()
            c.close()
            req = urllib.request.Request(f"{NTFY_IN['url']}/{NTFY_IN['topic']}/json?since={since}",
                                         headers={"Authorization": f"Bearer {NTFY_IN['token']}"})
            # read timeout > ntfy keepalive-interval (ntfy server setting)
            with urllib.request.urlopen(req, timeout=300) as r:
                for line in r:
                    m = json.loads(line or b"{}")
                    if m.get("event") == "message":
                        c = connect()
                        try:
                            ntfy_inbox_import(c, m)
                        finally:
                            c.close()
        except Exception as e:  # noqa: BLE001
            print("ntfy inbox:", e, flush=True)
        time.sleep(10)


@app.post("/share")
def share_post():
    """Android share sheet with files, when the service worker did not catch it (first launch):
    create the task in the inbox right away and open it."""
    c = db()
    files = [f for key in request.files for f in request.files.getlist(key) if f and f.filename]
    print("share POST (server path): content_length", request.content_length, "form keys", list(request.form.keys()),
          "file keys", list(request.files.keys()), {k: request.form.get(k) for k in ("title", "text", "url")},
          [(f.filename, f.mimetype) for f in files], flush=True)
    text, url = (request.form.get("text") or "").strip(), (request.form.get("url") or "").strip()
    title = (request.form.get("title") or "").strip() or text.replace(url, "").strip() or url \
        or (os.path.splitext(safe_name(files[0].filename))[0] if files else tr("Shared"))
    tid = new_inbox_task(c, title, url if url and url != title else "")
    save_attachments(c, tid, files)
    bump(c)
    c.commit()
    return redirect(f"/#t/{tid}", 303)


# Placeholder texts some Android apps put next to a shared file; never a useful title.
SHARE_PLACEHOLDERS = ("You received a file:", "Ein Bild wurde mit Dir geteilt", "Ein Bild wurde mit dir geteilt")
DROP_TOKEN = os.environ.get("TASKS_DROP_TOKEN", "")


@app.post("/drop")
def drop_post():
    """Upload endpoint for the Android app HTTP Shortcuts (Chrome drops files shared to PWAs):
    one request = one inbox task with every file attached. Exclude /drop from the proxy login;
    the bearer token (TASKS_DROP_TOKEN) is its lock."""
    auth = request.headers.get("Authorization", "")
    if not DROP_TOKEN or not secrets.compare_digest(auth.encode(), f"Bearer {DROP_TOKEN}".encode()):
        print("drop: 403, auth header", "missing" if not auth else
              f"len {len(auth)} starts {auth[:7]!r} ends-with-space {auth != auth.rstrip()}", flush=True)
        return Response(tr("not allowed") + "\n", 403, mimetype="text/plain")
    c = db()
    files = [f for key in request.files for f in request.files.getlist(key) if f and f.filename]
    text = (request.form.get("text") or "").strip()
    if any(text.startswith(p) for p in SHARE_PLACEHOLDERS):
        text = ""
    if not files and not text:
        return Response(tr("nothing received") + "\n", 400, mimetype="text/plain")
    first, _, rest = text.partition("\n")
    title = first.strip() or (os.path.splitext(safe_name(files[0].filename))[0] if len(files) == 1
                              else tr("{0} files shared", len(files)))
    tid = new_inbox_task(c, title, rest.strip())
    e = save_attachments(c, tid, files) if files else None
    bump(c)
    c.commit()
    print("drop: task", tid, repr(title), len(files), "files", e or "", flush=True)
    n = trn(", {0} file", ", {0} files", len(files)) if files and title != tr("{0} files shared", len(files)) else ""
    return Response(f"Abhako: {title}{n}" + (f" ({tr('error: {0}', e)})" if e else "") + "\n", mimetype="text/plain")


@app.get("/manifest.json")
def manifest():
    """static/manifest.json with description + lang in the UI language."""
    with open(os.path.join(app.static_folder, "manifest.json"), encoding="utf-8") as f:
        m = json.load(f)
    lg = lang()
    m["lang"], m["description"] = lg, tr("Tasks, lists, calendar, habits, focus", lg=lg)
    return Response(json.dumps(m, ensure_ascii=False, indent=2), mimetype="application/json")


@app.get("/sw.js")
def sw():
    r = send_from_directory(app.static_folder, "sw.js")
    r.headers["Cache-Control"] = "no-cache"
    return r


@app.get("/api/health")
def health():
    db().execute("SELECT 1").fetchone()
    return jsonify(ok=True)


@app.get("/api/version")
def version():
    return jsonify(v=int(settings()["version"]))


# ---------------------------------------------------------------- state

@app.get("/api/state")
def state():
    c = db()
    s = settings(c)
    cutoff = iso(now_utc() - timedelta(days=14))
    tasks = load_tasks(c, "deleted_at IS NULL AND (status=0 OR completed_at>=?)", (cutoff,))
    habits = [dict(r) for r in c.execute("SELECT * FROM habits ORDER BY archived, sort, id")]
    since = (local_now().date() - timedelta(days=400)).isoformat()
    logs, notes = {}, {}
    for r in c.execute("SELECT habit_id, day, count, note FROM habit_logs WHERE day>=?", (since,)):
        if r["count"]:
            logs.setdefault(r["habit_id"], {})[r["day"]] = r["count"]
        if r["note"]:
            notes.setdefault(r["habit_id"], {})[r["day"]] = r["note"]
    for h in habits:
        h["logs"] = logs.get(h["id"], {})
        h["notes"] = notes.get(h["id"], {})
    return jsonify(
        v=int(s["version"]),
        lists=[dict(r) for r in c.execute("SELECT * FROM lists ORDER BY is_inbox DESC, sort, id")],
        filters=[{**dict(r), "rules": json.loads(r["rules"] or "{}")}
                 for r in c.execute("SELECT * FROM filters ORDER BY sort, id")],
        sections=[dict(r) for r in c.execute("SELECT * FROM sections ORDER BY sort, id")],
        tasks=tasks,
        habits=habits,
        pomo=running_pomo(c),
        pomo_today=pomo_stats(c, days=1),
        counts=dict(
            done=c.execute("SELECT COUNT(*) FROM tasks WHERE deleted_at IS NULL AND status!=0").fetchone()[0],
            trash=c.execute("SELECT COUNT(*) FROM tasks WHERE deleted_at IS NOT NULL").fetchone()[0]),
        settings={k: v for k, v in s.items() if k not in ("digest_sent", "version")},
        paperless={"enabled": bool(PL_TOKEN), "url": PL_PUBLIC},
        ntfy_inbox={"enabled": bool(NTFY_IN["token"]), "server": NTFY_IN["public"], "topic": NTFY_IN["topic"]},
        ntfy_url=NTFY_URL,
        languages=languages(),
    )


@app.get("/api/tasks")
def task_query():
    c = db()
    scope = request.args.get("scope", "done")
    limit = min(int(request.args.get("limit", 300)), 2000)
    if scope == "trash":
        rows = load_tasks(c, "deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT ?", (limit,))
    elif scope == "search":
        q = f"%{request.args.get('q', '').strip()}%"
        rows = load_tasks(c, "deleted_at IS NULL AND (title LIKE ? OR content LIKE ?) "
                             "ORDER BY status, updated_at DESC LIMIT ?", (q, q, limit))
    else:
        rows = load_tasks(c, "deleted_at IS NULL AND status!=0 ORDER BY completed_at DESC LIMIT ?", (limit,))
    return jsonify(tasks=rows)


# ---------------------------------------------------------------- lists / sections

LIST_FIELDS = ("name", "color", "folder", "sort", "view", "archived")


@app.post("/api/lists")
def list_create():
    b = body()
    name = (b.get("name") or "").strip()
    if not name:
        return err(tr("Name missing"))
    c = db()
    srt = c.execute("SELECT COALESCE(MAX(sort),0)+1 FROM lists").fetchone()[0]
    cur = c.execute("INSERT INTO lists(name,color,folder,sort,view,created_at) VALUES(?,?,?,?,?,?)",
                    (name, b.get("color", ""), b.get("folder", ""), srt, b.get("view", "list"), iso(now_utc())))
    bump(c)
    c.commit()
    return jsonify(dict(c.execute("SELECT * FROM lists WHERE id=?", (cur.lastrowid,)).fetchone()))


@app.patch("/api/lists/<int:lid>")
def list_update(lid):
    b = body()
    c = db()
    for k in LIST_FIELDS:
        if k in b:
            c.execute(f"UPDATE lists SET {k}=? WHERE id=?", (b[k], lid))
    bump(c)
    c.commit()
    return jsonify(ok=True)


@app.post("/api/lists/reorder")
def list_reorder():
    """{ids: [...], folder?: {id: name}} -- sidebar order after a drag / arrow move."""
    b = body()
    c = db()
    for i, lid in enumerate(b.get("ids", [])):
        c.execute("UPDATE lists SET sort=? WHERE id=? AND is_inbox=0", (i, int(lid)))
    for lid, folder in (b.get("folder") or {}).items():
        c.execute("UPDATE lists SET folder=? WHERE id=?", (folder, int(lid)))
    bump(c)
    c.commit()
    return jsonify(ok=True)


@app.delete("/api/lists/<int:lid>")
def list_delete(lid):
    c = db()
    r = c.execute("SELECT is_inbox FROM lists WHERE id=?", (lid,)).fetchone()
    if not r:
        return err(tr("unknown"), 404)
    if r["is_inbox"]:
        return err(tr("The inbox cannot be deleted"))
    # tasks go to the trash inside the inbox so they stay restorable
    inbox = c.execute("SELECT id FROM lists WHERE is_inbox=1").fetchone()[0]
    ts = iso(now_utc())
    c.execute("UPDATE tasks SET deleted_at=COALESCE(deleted_at,?), list_id=?, section_id=NULL WHERE list_id=?",
              (ts, inbox, lid))
    c.execute("DELETE FROM lists WHERE id=?", (lid,))
    bump(c)
    c.commit()
    return jsonify(ok=True)


@app.post("/api/filters")
def filter_create():
    b = body()
    name = (b.get("name") or "").strip()
    if not name:
        return err(tr("Name missing"))
    c = db()
    srt = c.execute("SELECT COALESCE(MAX(sort),0)+1 FROM filters").fetchone()[0]
    cur = c.execute("INSERT INTO filters(name,rules,sort,created_at) VALUES(?,?,?,?)",
                    (name, json.dumps(b.get("rules") or {}), srt, iso(now_utc())))
    bump(c)
    c.commit()
    return jsonify(id=cur.lastrowid)


@app.patch("/api/filters/<int:fid>")
def filter_update(fid):
    b = body()
    c = db()
    if "name" in b and (b["name"] or "").strip():
        c.execute("UPDATE filters SET name=? WHERE id=?", (b["name"].strip(), fid))
    if "rules" in b:
        c.execute("UPDATE filters SET rules=? WHERE id=?", (json.dumps(b["rules"] or {}), fid))
    if "sort" in b:
        c.execute("UPDATE filters SET sort=? WHERE id=?", (b["sort"], fid))
    bump(c)
    c.commit()
    return jsonify(ok=True)


@app.delete("/api/filters/<int:fid>")
def filter_delete(fid):
    c = db()
    c.execute("DELETE FROM filters WHERE id=?", (fid,))
    bump(c)
    c.commit()
    return jsonify(ok=True)


def _folders(c):
    try:
        return json.loads(c.execute("SELECT value FROM settings WHERE key='folders'").fetchone()[0] or "[]")
    except (TypeError, ValueError):
        return []


@app.post("/api/folders/rename")
def folder_rename():
    b = body()
    old, new = (b.get("old") or "").strip(), (b.get("new") or "").strip()
    if not old or not new:
        return err(tr("Name missing"))
    c = db()
    c.execute("UPDATE lists SET folder=? WHERE folder=?", (new, old))
    f = [new if x == old else x for x in _folders(c)]
    c.execute("UPDATE settings SET value=? WHERE key='folders'", (json.dumps(list(dict.fromkeys(f)), ensure_ascii=False),))
    bump(c)
    c.commit()
    return jsonify(ok=True)


@app.post("/api/folders/delete")
def folder_delete():
    """Removes the folder only; its lists move to the top level."""
    name = (body().get("name") or "").strip()
    c = db()
    c.execute("UPDATE lists SET folder='' WHERE folder=?", (name,))
    c.execute("UPDATE settings SET value=? WHERE key='folders'",
              (json.dumps([x for x in _folders(c) if x != name], ensure_ascii=False),))
    bump(c)
    c.commit()
    return jsonify(ok=True)


@app.post("/api/sections")
def section_create():
    b = body()
    name = (b.get("name") or "").strip()
    if not name or not b.get("list_id"):
        return err(tr("Name/list missing"))
    c = db()
    srt = c.execute("SELECT COALESCE(MAX(sort),0)+1 FROM sections WHERE list_id=?", (b["list_id"],)).fetchone()[0]
    cur = c.execute("INSERT INTO sections(list_id,name,sort) VALUES(?,?,?)", (b["list_id"], name, srt))
    bump(c)
    c.commit()
    return jsonify(dict(c.execute("SELECT * FROM sections WHERE id=?", (cur.lastrowid,)).fetchone()))


@app.patch("/api/sections/<int:sid>")
def section_update(sid):
    b = body()
    c = db()
    for k in ("name", "sort"):
        if k in b:
            c.execute(f"UPDATE sections SET {k}=? WHERE id=?", (b[k], sid))
    bump(c)
    c.commit()
    return jsonify(ok=True)


@app.delete("/api/sections/<int:sid>")
def section_delete(sid):
    c = db()
    c.execute("DELETE FROM sections WHERE id=?", (sid,))
    bump(c)
    c.commit()
    return jsonify(ok=True)


# ---------------------------------------------------------------- tasks

TASK_FIELDS = ("list_id", "section_id", "parent_id", "title", "content", "priority",
               "due", "due_time", "reminders", "repeat", "repeat_from", "sort",
               "pinned", "start", "duration")


def clean_task(b):
    out = {}
    for k in TASK_FIELDS:
        if k in b:
            v = b[k]
            if k in ("due", "due_time", "section_id", "parent_id", "start", "duration") and v in ("", None):
                v = None
            if k == "title":
                v = (v or "").strip()
            if k in ("priority", "pinned"):
                v = int(v or 0)
            if k in ("reminders", "repeat", "content") and v is None:
                v = ""
            out[k] = v
    if out.get("due") is None and "due" in out:
        out["due_time"] = None
        out["start"] = None
        out["reminders"] = out.get("reminders", "")
    if out.get("start") and out.get("due") and out["start"] > out["due"]:
        out["start"] = out["due"]
    return out


def descendants(c, tid):
    return [r[0] for r in c.execute("""WITH RECURSIVE d(id) AS (
        SELECT id FROM tasks WHERE parent_id=? UNION ALL
        SELECT t.id FROM tasks t JOIN d ON t.parent_id=d.id) SELECT id FROM d""", (tid,))]


def depth(c, tid):
    """0 = top level. Walks up the parent chain."""
    n, cur = 0, tid
    while n < 10:
        r = c.execute("SELECT parent_id FROM tasks WHERE id=?", (cur,)).fetchone()
        if not r or not r[0]:
            return n
        cur, n = r[0], n + 1
    return n


def subtree_height(c, tid):
    h, level = 0, [tid]
    while level and h < 10:
        q = ",".join("?" * len(level))
        level = [r[0] for r in c.execute(f"SELECT id FROM tasks WHERE parent_id IN ({q})", level)]
        if level:
            h += 1
    return h


def check_parent(c, tid, parent):
    """None if tid may become a child of parent, else an error message."""
    if parent is None:
        return None
    if tid is not None and (parent == tid or parent in descendants(c, tid)):
        return tr("A task cannot be nested under itself")
    if depth(c, parent) + 1 + (subtree_height(c, tid) if tid else 0) >= MAX_DEPTH:
        return tr("At most {0} levels", MAX_DEPTH)
    return None


def set_tags(c, tid, tags):
    c.execute("DELETE FROM task_tags WHERE task_id=?", (tid,))
    for t in dict.fromkeys(x.strip().lstrip("#") for x in tags if x and x.strip().lstrip("#")):
        c.execute("INSERT INTO task_tags(task_id,tag) VALUES(?,?)", (tid, t))


def one_task(c, tid):
    return load_tasks(c, "id=?", (tid,))[0]


@app.post("/api/tasks")
def task_create():
    b = body()
    f = clean_task(b)
    if not f.get("title"):
        return err(tr("Title missing"))
    c = db()
    e = check_parent(c, None, f.get("parent_id"))
    if e:
        return err(e)
    if not f.get("list_id"):
        if f.get("parent_id"):
            f["list_id"] = c.execute("SELECT list_id FROM tasks WHERE id=?", (f["parent_id"],)).fetchone()[0]
        else:
            f["list_id"] = c.execute("SELECT id FROM lists WHERE is_inbox=1").fetchone()[0]
    if "sort" not in f:
        f["sort"] = c.execute("SELECT COALESCE(MIN(sort),0)-1 FROM tasks WHERE list_id=? AND parent_id IS ?",
                              (f["list_id"], f.get("parent_id"))).fetchone()[0]
        if f.get("parent_id"):  # subtasks append at the end
            f["sort"] = c.execute("SELECT COALESCE(MAX(sort),0)+1 FROM tasks WHERE parent_id=?",
                                  (f["parent_id"],)).fetchone()[0]
    ts = iso(now_utc())
    cols = list(f) + ["created_at", "updated_at"]
    cur = c.execute(f"INSERT INTO tasks({','.join(cols)}) VALUES({','.join('?' * len(cols))})",
                    [f[k] for k in f] + [ts, ts])
    if b.get("tags"):
        set_tags(c, cur.lastrowid, b["tags"])
    bump(c)
    c.commit()
    return jsonify(one_task(c, cur.lastrowid))


@app.patch("/api/tasks/<int:tid>")
def task_update(tid):
    c = db()
    if not c.execute("SELECT 1 FROM tasks WHERE id=?", (tid,)).fetchone():
        return err(tr("unknown"), 404)
    conflicts = []
    e = apply_update(c, tid, body(), conflicts)
    if e:
        return err(e)
    bump(c)
    c.commit()
    return jsonify({**one_task(c, tid), "conflicts": conflicts})


def _norm(v):
    if isinstance(v, list):
        return sorted(str(x) for x in v)
    return None if v in ("", None) else str(v)


def apply_update(c, tid, b, conflicts=None):
    """b may carry `_prev` = the values the client saw before its edit (offline replay, detail typing).
    A field whose server value differs from `_prev` was changed elsewhere meanwhile: it is NOT
    overwritten but reported back as a conflict (client lets the user pick)."""
    prev = b.get("_prev") if isinstance(b.get("_prev"), dict) else None
    if prev:
        row = c.execute("SELECT * FROM tasks WHERE id=?", (tid,)).fetchone()
        b = dict(b)
        for k, old in prev.items():
            if k not in b or k.startswith("_"):
                continue
            if k == "tags":
                cur = [r[0] for r in c.execute("SELECT tag FROM task_tags WHERE task_id=?", (tid,))]
            elif k in row.keys():
                cur = row[k]
            else:
                continue
            if _norm(cur) != _norm(old) and _norm(cur) != _norm(b[k]):
                if conflicts is not None:
                    conflicts.append({"field": k, "server": cur, "mine": b[k]})
                del b[k]
    f = clean_task(b)
    if "title" in f and not f["title"]:
        return tr("Title missing")
    if "start" in f or "due" in f:  # keep start <= due against the stored other half
        cur = c.execute("SELECT start, due FROM tasks WHERE id=?", (tid,)).fetchone()
        st, du = f.get("start", cur["start"]), f.get("due", cur["due"])
        if st and (not du or st > du):
            f["start"] = du
    if "parent_id" in f:
        e = check_parent(c, tid, f["parent_id"])
        if e:
            return e
        if f["parent_id"]:  # indent: follow the new parent's list / section
            p = c.execute("SELECT list_id, section_id FROM tasks WHERE id=?", (f["parent_id"],)).fetchone()
            f.setdefault("list_id", p["list_id"])
            f["section_id"] = p["section_id"]
    if f:
        # a changed date / reminder set re-arms the reminder
        if any(k in f for k in ("due", "due_time", "reminders")):
            f["reminded"] = "[]"
        f["updated_at"] = iso(now_utc())
        c.execute(f"UPDATE tasks SET {','.join(k + '=?' for k in f)} WHERE id=?", [*f.values(), tid])
        if "list_id" in f:  # subtasks follow their parent (all levels)
            for d in descendants(c, tid):
                c.execute("UPDATE tasks SET list_id=? WHERE id=?", (f["list_id"], d))
            if "section_id" not in f:
                c.execute("UPDATE tasks SET section_id=NULL WHERE id=?", (tid,))
    if "tags" in b:
        set_tags(c, tid, b["tags"])
    elif "add_tags" in b:
        cur = [r[0] for r in c.execute("SELECT tag FROM task_tags WHERE task_id=?", (tid,))]
        set_tags(c, tid, cur + list(b["add_tags"]))
    return None


def next_due(t):
    """Next occurrence (date, keeps due_time) for a recurring task, or None."""
    if not t["repeat"] or not t["due"]:
        return None
    try:
        base = date.fromisoformat(t["due"])
        if t["repeat_from"] == "done":
            base = local_now().date()
        start = datetime(base.year, base.month, base.day)
        rule = rrulestr(t["repeat"].removeprefix("RRULE:"), dtstart=start)
        nxt = rule.after(start)
        return nxt.date().isoformat() if nxt else None
    except (ValueError, TypeError) as e:
        print("rrule error:", t["id"], t["repeat"], e, flush=True)
        return None


def rr_count(repeat):
    m = re.search(r"(?:^|;)COUNT=(\d+)", repeat or "")
    return int(m.group(1)) if m else None


def rr_with_count(repeat, n):
    return re.sub(r"(^|;)COUNT=\d+", lambda m: f"{m.group(1)}COUNT={n}", repeat)


@app.post("/api/tasks/<int:tid>/complete")
def task_complete(tid):
    c = db()
    t = c.execute("SELECT * FROM tasks WHERE id=?", (tid,)).fetchone()
    if not t:
        return err(tr("unknown"), 404)
    b = body()
    # the same recurring task ticked on two devices (one offline): only the first tick advances it
    if t["repeat"] and b.get("expect_due") and t["status"] == 0 and b["expect_due"] != t["due"]:
        return jsonify({**one_task(c, tid), "next_due": None, "skipped": True})
    nxt = do_complete(c, tid, int(b.get("status", 2)))
    bump(c)
    c.commit()
    return jsonify({**one_task(c, tid), "next_due": nxt})


def do_complete(c, tid, status=2):
    t = c.execute("SELECT * FROM tasks WHERE id=?", (tid,)).fetchone()
    ts = iso(now_utc())
    cnt = rr_count(t["repeat"])
    nxt = next_due(t) if status == 2 and (cnt is None or cnt > 1) else None
    if status == 2 and t["repeat"] and not nxt:  # last repeat (COUNT used up / past UNTIL): done for good
        c.execute("UPDATE tasks SET repeat='' WHERE id=?", (tid,))
    if nxt:
        # keep a completed copy in the history, move the original forward
        cols = [k for k in t.keys() if k not in ("id", "tt_id")]
        vals = {k: t[k] for k in cols}
        vals.update(status=2, repeat="", completed_at=ts, updated_at=ts, reminded="[]")
        cur = c.execute(f"INSERT INTO tasks({','.join(cols)}) VALUES({','.join('?' * len(cols))})",
                        [vals[k] for k in cols])
        for r in c.execute("SELECT tag FROM task_tags WHERE task_id=?", (tid,)).fetchall():
            c.execute("INSERT INTO task_tags(task_id,tag) VALUES(?,?)", (cur.lastrowid, r["tag"]))
        start = t["start"]
        if start:  # timeline range moves along with the due date
            start = (date.fromisoformat(start) + (date.fromisoformat(nxt) - date.fromisoformat(t["due"]))).isoformat()
        c.execute("UPDATE tasks SET due=?, start=?, reminded='[]', updated_at=? WHERE id=?", (nxt, start, ts, tid))
        if cnt:
            c.execute("UPDATE tasks SET repeat=? WHERE id=?", (rr_with_count(t["repeat"], cnt - 1), tid))
        for d in descendants(c, tid):
            c.execute("UPDATE tasks SET status=0, completed_at=NULL WHERE id=?", (d,))
    else:
        c.execute("UPDATE tasks SET status=?, completed_at=?, updated_at=? WHERE id=?", (status, ts, ts, tid))
        if status != 0:  # completing a parent completes its open subtasks (all levels)
            for d in descendants(c, tid):
                c.execute("UPDATE tasks SET status=?, completed_at=?, updated_at=? WHERE id=? AND status=0",
                          (status, ts, ts, d))
    return nxt


@app.post("/api/tasks/<int:tid>/skip")
def task_skip(tid):
    """'Skip this occurrence': move a recurring task to its next date without a done copy."""
    c = db()
    t = c.execute("SELECT * FROM tasks WHERE id=?", (tid,)).fetchone()
    if not t or not t["repeat"] or not t["due"]:
        return err(tr("Not a recurring task"))
    cnt = rr_count(t["repeat"])
    base = dict(t)
    base["repeat_from"] = "due"  # skipping always means: the next regular date
    nxt = next_due(base) if cnt is None or cnt > 1 else None
    if not nxt:
        return err(tr("This is already the last occurrence"))
    start = t["start"]
    if start:
        start = (date.fromisoformat(start) + (date.fromisoformat(nxt) - date.fromisoformat(t["due"]))).isoformat()
    rep_new = rr_with_count(t["repeat"], cnt - 1) if cnt else t["repeat"]
    c.execute("UPDATE tasks SET due=?, start=?, repeat=?, reminded='[]', updated_at=? WHERE id=?",
              (nxt, start, rep_new, iso(now_utc()), tid))
    bump(c)
    c.commit()
    return jsonify({**one_task(c, tid), "next_due": nxt})


@app.post("/api/tasks/<int:tid>/reopen")
def task_reopen(tid):
    c = db()
    c.execute("UPDATE tasks SET status=0, completed_at=NULL, updated_at=? WHERE id=?", (iso(now_utc()), tid))
    bump(c)
    c.commit()
    return jsonify(one_task(c, tid))


@app.delete("/api/tasks/<int:tid>")
def task_delete(tid):
    c = db()
    files = []
    if request.args.get("hard") == "1":
        files = attachment_files(c, [tid])
        c.execute("DELETE FROM tasks WHERE id=?", (tid,))
    else:
        do_delete(c, tid)
    bump(c)
    c.commit()
    unlink_files(files)
    return jsonify(ok=True)


def do_delete(c, tid):
    ts = iso(now_utc())
    for i in [tid, *descendants(c, tid)]:
        c.execute("UPDATE tasks SET deleted_at=COALESCE(deleted_at, ?) WHERE id=?", (ts, i))


@app.post("/api/tasks/<int:tid>/restore")
def task_restore(tid):
    c = db()
    r = c.execute("SELECT deleted_at FROM tasks WHERE id=?", (tid,)).fetchone()
    if r:
        c.execute("UPDATE tasks SET deleted_at=NULL WHERE id=?", (tid,))
        for d in descendants(c, tid):  # children deleted together with it come back too
            c.execute("UPDATE tasks SET deleted_at=NULL WHERE id=? AND deleted_at=?", (d, r["deleted_at"]))
        # restoring a subtask whose parent is gone makes it top-level
        c.execute("""UPDATE tasks SET parent_id=NULL WHERE id=? AND parent_id IN
                     (SELECT id FROM tasks WHERE deleted_at IS NOT NULL)""", (tid,))
    bump(c)
    c.commit()
    return jsonify(ok=True)


@app.post("/api/tasks/purge-done")
def purge_done():
    """Settings > 'Delete all completed': every done / won't-do task -> trash."""
    c = db()
    n = c.execute("UPDATE tasks SET deleted_at=? WHERE status!=0 AND deleted_at IS NULL",
                  (iso(now_utc()),)).rowcount
    bump(c)
    c.commit()
    return jsonify(count=n)


@app.delete("/api/trash")
def trash_empty():
    c = db()
    files = attachment_files(c, [r[0] for r in c.execute("SELECT id FROM tasks WHERE deleted_at IS NOT NULL")])
    c.execute("DELETE FROM tasks WHERE deleted_at IS NOT NULL")
    bump(c)
    c.commit()
    unlink_files(files)
    return jsonify(ok=True)


# ---------------------------------------------------------------- attachments

def safe_name(n):
    n = os.path.basename((n or "").replace("\\", "/")).strip()
    n = re.sub(r"[\x00-\x1f/\\:*?\"<>|]", "_", n)[:150]
    return n or "datei"


@app.post("/api/tasks/<int:tid>/attachments")
def attachment_upload(tid):
    c = db()
    if not c.execute("SELECT 1 FROM tasks WHERE id=?", (tid,)).fetchone():
        return err(tr("unknown"), 404)
    files = request.files.getlist("file")
    if not files:
        return err(tr("File missing"))
    e = save_attachments(c, tid, files)
    if e:
        return err(e)
    bump(c)
    c.commit()
    return jsonify(one_task(c, tid))


def save_attachments(c, tid, files):
    """Store uploaded werkzeug files for a task. Returns an error message or None (caller commits)."""
    os.makedirs(os.path.join(ATT_DIR, str(tid)), exist_ok=True)
    ts = iso(now_utc())
    for f in files:
        name = safe_name(f.filename)
        rel = os.path.join(str(tid), f"{uuid.uuid4().hex[:12]}-{name}")
        full = os.path.join(ATT_DIR, rel)
        f.save(full)
        size = os.path.getsize(full)
        if size > MAX_FILE_MB * 1024 * 1024:
            os.remove(full)
            return tr("{0}: larger than {1} MB", name, MAX_FILE_MB)
        mime = (f.mimetype if f.mimetype and f.mimetype != "application/octet-stream" else None) \
            or mimetypes.guess_type(name)[0] or "application/octet-stream"
        c.execute("INSERT INTO attachments(task_id,name,mime,size,path,created_at) VALUES(?,?,?,?,?,?)",
                  (tid, name, mime, size, rel, ts))
    c.execute("UPDATE tasks SET updated_at=? WHERE id=?", (ts, tid))
    return None


@app.get("/api/attachments/<int:aid>")
def attachment_get(aid):
    a = db().execute("SELECT * FROM attachments WHERE id=?", (aid,)).fetchone()
    if not a:
        return err(tr("unknown"), 404)
    full = os.path.join(ATT_DIR, a["path"])
    if not os.path.isfile(full):
        return err(tr("File missing on the server"), 404)
    inline = a["mime"] in INLINE_TYPES and request.args.get("dl") != "1"
    resp = send_file(full, mimetype=a["mime"] if inline else "application/octet-stream",
                     as_attachment=not inline, download_name=a["name"], conditional=True, max_age=0)
    if a["mime"] != "application/pdf":  # the browser pdf viewer does not run inside a sandboxed CSP
        resp.headers["Content-Security-Policy"] = "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox"
    resp.headers["Cache-Control"] = "private, max-age=86400"
    return resp


# ---------------------------------------------------------------- paperless

class PaperlessError(Exception):
    pass


def pl_req(path, method="GET", body=None, ctype=None, raw=False, timeout=20):
    if not PL_TOKEN:
        raise PaperlessError(tr("Paperless is not set up"))
    hdr = {"Authorization": f"Token {PL_TOKEN}", "Accept": "application/json"}
    if ctype:
        hdr["Content-Type"] = ctype
    req = urllib.request.Request(PL_API + path, data=body, headers=hdr, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = r.read()
            return (data, r.headers.get("Content-Type", "")) if raw else json.loads(data or b"null")
    except urllib.error.HTTPError as e:
        msg = {401: N_("invalid token"), 403: N_("no permission"), 404: N_("document not found")}.get(e.code)
        raise PaperlessError(f"Paperless: {tr(msg)}" if msg else
                             f"Paperless: HTTP {e.code} {e.read()[:200].decode('utf-8', 'replace')}") from e
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        raise PaperlessError(tr("Paperless not reachable ({0})", e)) from e


_corr = {"at": 0, "map": {}}


def pl_correspondents():
    if time.time() - _corr["at"] > 600:
        j = pl_req("/api/correspondents/?page_size=1000&fields=id,name")
        _corr["map"] = {r["id"]: r["name"] for r in j.get("results", [])}
        _corr["at"] = time.time()
    return _corr["map"]


def pl_doc(doc_id):
    d = pl_req(f"/api/documents/{int(doc_id)}/?fields=id,title,created,correspondent")
    return {"doc_id": d["id"], "title": d.get("title") or tr("Document {0}", d['id']),
            "correspondent": pl_correspondents().get(d.get("correspondent"), "") if d.get("correspondent") else "",
            "created": (d.get("created") or "")[:10]}


@app.errorhandler(PaperlessError)
def paperless_error(e):
    return err(str(e), 502)


@app.get("/api/paperless/search")
def paperless_search():
    q = (request.args.get("q") or "").strip()
    fields = "id,title,created,correspondent,page_count,mime_type"
    base = f"/api/documents/?page_size=20&fields={fields}"
    if q:
        j = pl_req(base + "&query=" + urllib.parse.quote(q))
        if not j.get("count") and re.fullmatch(r"[\w\s.-]+", q):  # word fragments: prefix search ("stadtw*")
            j = pl_req(base + "&query=" + urllib.parse.quote(" ".join(w + "*" for w in q.split())))
        if not j.get("count"):  # last resort: plain title match
            j = pl_req(base + "&ordering=-created&title__icontains=" + urllib.parse.quote(q))
    else:
        j = pl_req(base + "&ordering=-added")
    corr = pl_correspondents()
    items = []
    for d in j.get("results", []):
        hit = (d.get("__search_hit__") or {}).get("highlights") or ""
        items.append({"id": d["id"], "title": d.get("title") or "", "created": (d.get("created") or "")[:10],
                      "correspondent": corr.get(d.get("correspondent"), "") if d.get("correspondent") else "",
                      "pages": d.get("page_count"),
                      "snippet": re.sub(r"\s+", " ", re.sub(r"</?b>", "", hit)).strip()[:160]})
    return jsonify(items=items, count=j.get("count", 0), url=PL_PUBLIC)


@app.get("/api/paperless/thumb/<int:doc_id>")
def paperless_thumb(doc_id):
    data, ctype = pl_req(f"/api/documents/{doc_id}/thumb/", raw=True)
    resp = Response(data, mimetype=ctype.split(";")[0] or "image/webp")
    resp.headers["Cache-Control"] = "private, max-age=86400"
    return resp


@app.post("/api/tasks/<int:tid>/paperless")
def paperless_link(tid):
    c = db()
    if not c.execute("SELECT 1 FROM tasks WHERE id=?", (tid,)).fetchone():
        return err(tr("unknown"), 404)
    doc_id = int(body().get("doc_id") or 0)
    if not c.execute("SELECT 1 FROM paperless_links WHERE task_id=? AND doc_id=?", (tid, doc_id)).fetchone():
        d = pl_doc(doc_id)
        c.execute("""INSERT INTO paperless_links(task_id,doc_id,title,correspondent,created,status,added_at)
                     VALUES(?,?,?,?,?,'ok',?)""", (tid, d["doc_id"], d["title"], d["correspondent"], d["created"],
                                                  iso(now_utc())))
        bump(c)
        c.commit()
    return jsonify(one_task(c, tid))


@app.delete("/api/paperless-links/<int:lid>")
def paperless_unlink(lid):
    c = db()
    r = c.execute("SELECT task_id FROM paperless_links WHERE id=?", (lid,)).fetchone()
    if not r:
        return err(tr("unknown"), 404)
    c.execute("DELETE FROM paperless_links WHERE id=?", (lid,))
    bump(c)
    c.commit()
    return jsonify(one_task(c, r["task_id"]))


def multipart(fields, files):
    """fields: {name: value}; files: [(field, filename, mime, bytes)] -> (body, content-type)."""
    b = uuid.uuid4().hex
    out = io.BytesIO()
    for k, v in fields.items():
        out.write(f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    for field, name, mime, data in files:
        fn = urllib.parse.quote(name)
        out.write(f'--{b}\r\nContent-Disposition: form-data; name="{field}"; filename="{fn}"; filename*=UTF-8\'\'{fn}\r\n'
                  f'Content-Type: {mime}\r\n\r\n'.encode())
        out.write(data)
        out.write(b"\r\n")
    out.write(f"--{b}--\r\n".encode())
    return out.getvalue(), f"multipart/form-data; boundary={b}"


@app.post("/api/attachments/<int:aid>/to-paperless")
def attachment_to_paperless(aid):
    """Upload an attachment into Paperless. The link is 'pending' until Paperless has consumed it;
    the watchdog then swaps it for the real document and removes the local copy."""
    c = db()
    a = c.execute("SELECT * FROM attachments WHERE id=?", (aid,)).fetchone()
    if not a:
        return err(tr("unknown"), 404)
    if c.execute("SELECT 1 FROM paperless_links WHERE att_id=? AND status='pending'", (aid,)).fetchone():
        return err(tr("Already being sent to Paperless"))
    with open(os.path.join(ATT_DIR, a["path"]), "rb") as f:
        data = f.read()
    title = os.path.splitext(a["name"])[0]
    payload, ctype = multipart({"title": title}, [("document", a["name"], a["mime"], data)])
    ptask = pl_req("/api/documents/post_document/", "POST", payload, ctype, timeout=120)
    if isinstance(ptask, dict):
        ptask = ptask.get("task_id") or ptask.get("id") or json.dumps(ptask)
    c.execute("""INSERT INTO paperless_links(task_id,title,status,message,ptask,att_id,added_at)
                 VALUES(?,?,'pending','Paperless verarbeitet das Dokument…',?,?,?)""",
              (a["task_id"], title, str(ptask), aid, iso(now_utc())))
    bump(c)
    c.commit()
    return jsonify(one_task(c, a["task_id"]))


def paperless_poll(c):
    """Watchdog: resolve pending uploads (success -> link doc + drop the local attachment)."""
    rows = c.execute("SELECT * FROM paperless_links WHERE status='pending'").fetchall()
    for p in rows:
        try:
            j = pl_req("/api/tasks/?task_id=" + urllib.parse.quote(p["ptask"] or ""))
        except PaperlessError as e:
            print("paperless poll:", e, flush=True)
            return
        lst = j if isinstance(j, list) else j.get("results", [])
        t = next((x for x in lst if x.get("task_id") == p["ptask"]), None)
        age = (now_utc() - parse_iso(p["added_at"])).total_seconds()
        if not t:
            if age > 1800:
                c.execute("UPDATE paperless_links SET status='error', message=? WHERE id=?",
                          (tr("Paperless did not confirm the upload", lg=lang(c)), p["id"]))
                bump(c)
                c.commit()
            continue
        status = (t.get("status") or "").lower()
        res = t.get("result_data") if "result_data" in t else t.get("result")
        if isinstance(res, dict):  # paperless 3.x: {"error_type", "error_message", "traceback"} on failure
            res_txt = res.get("error_message") or res.get("message") or json.dumps(res, ensure_ascii=False)
        else:
            res_txt = res or ""
        doc_id = None
        if status == "success":
            ids = t.get("related_document_ids") or ([t["related_document"]] if t.get("related_document") else [])
            doc_id = ids[0] if ids else None
            if not doc_id:
                m = re.search(r"(?:id|#)\s*(\d+)", res_txt or "")
                doc_id = int(m.group(1)) if m else None
        elif status == "failure":
            m = re.search(r"duplicate.*?#(\d+)", res_txt or "", re.I | re.S)
            if m:  # already in Paperless: link the existing document
                doc_id = int(m.group(1))
            else:
                c.execute("UPDATE paperless_links SET status='error', message=? WHERE id=?",
                          ((res_txt or tr("Paperless could not consume the document", lg=lang(c)))[:300], p["id"]))
                bump(c)
                c.commit()
                continue
        else:
            continue  # pending / started
        if not doc_id:
            continue
        try:
            d = pl_doc(doc_id)
        except PaperlessError:
            d = {"doc_id": doc_id, "title": p["title"], "correspondent": "", "created": ""}
        dup = status == "failure"
        c.execute("""UPDATE paperless_links SET doc_id=?, title=?, correspondent=?, created=?, status='ok',
                     message=?, att_id=NULL WHERE id=?""",
                  (d["doc_id"], d["title"], d["correspondent"], d["created"],
                   "war schon in Paperless" if dup else "", p["id"]))
        files = []
        keep = settings(c).get("paperless_keep") == "1"
        if p["att_id"] and not keep:
            a = c.execute("SELECT path FROM attachments WHERE id=?", (p["att_id"],)).fetchone()
            if a:
                files.append(a["path"])
                c.execute("DELETE FROM attachments WHERE id=?", (p["att_id"],))
        bump(c)
        c.commit()
        unlink_files(files)


@app.delete("/api/attachments/<int:aid>")
def attachment_delete(aid):
    c = db()
    a = c.execute("SELECT * FROM attachments WHERE id=?", (aid,)).fetchone()
    if not a:
        return err(tr("unknown"), 404)
    c.execute("DELETE FROM attachments WHERE id=?", (aid,))
    bump(c)
    c.commit()
    unlink_files([a["path"]])
    return jsonify(one_task(c, a["task_id"]))


@app.post("/api/tasks/reorder")
def task_reorder():
    """[{id, sort, section_id?, list_id?, priority?, due?}] — one call per drag."""
    c = db()
    ts = iso(now_utc())
    for it in body().get("items", []):
        f = clean_task({k: v for k, v in it.items()
                        if k in ("sort", "section_id", "list_id", "priority", "due", "start", "due_time")})
        if f:
            f["updated_at"] = ts
            c.execute(f"UPDATE tasks SET {','.join(k + '=?' for k in f)} WHERE id=?", [*f.values(), it["id"]])
            if "list_id" in f:
                for d in descendants(c, it["id"]):
                    c.execute("UPDATE tasks SET list_id=? WHERE id=?", (f["list_id"], d))
    bump(c)
    c.commit()
    return jsonify(ok=True)


@app.post("/api/tasks/batch")
def task_batch():
    """{ids: [...], action: patch|complete|reopen|delete, data: {...}} — multi-select."""
    b = body()
    c = db()
    ids = [int(i) for i in b.get("ids", [])]
    action, data = b.get("action"), b.get("data") or {}
    ts = iso(now_utc())
    errors = []
    for tid in ids:
        if not c.execute("SELECT 1 FROM tasks WHERE id=? AND deleted_at IS NULL", (tid,)).fetchone():
            continue
        if action == "patch":
            e = apply_update(c, tid, data)
            if e:
                errors.append(e)
        elif action == "complete":
            do_complete(c, tid, int(data.get("status", 2)))
        elif action == "reopen":
            c.execute("UPDATE tasks SET status=0, completed_at=NULL, updated_at=? WHERE id=?", (ts, tid))
        elif action == "delete":
            do_delete(c, tid)
    bump(c)
    c.commit()
    return jsonify(ok=True, count=len(ids), errors=list(dict.fromkeys(errors)))


@app.get("/api/occurrences")
def occurrences():
    """Future repeats of open recurring tasks in [from, to] (calendar ghosts)."""
    try:
        lo = date.fromisoformat(request.args["from"])
        hi = date.fromisoformat(request.args["to"])
    except (KeyError, ValueError):
        return err(tr("from/to missing"))
    if (hi - lo).days > 400:
        return err(tr("Date range too large"))
    out = []
    for t in db().execute("""SELECT id, due, repeat FROM tasks WHERE status=0 AND deleted_at IS NULL
                             AND repeat!='' AND due IS NOT NULL AND due<=?""", (hi.isoformat(),)):
        try:
            d0 = date.fromisoformat(t["due"])
            start = datetime(d0.year, d0.month, d0.day)
            rule = rrulestr(t["repeat"].removeprefix("RRULE:"), dtstart=start)
            for occ in rule.between(datetime(lo.year, lo.month, lo.day), datetime(hi.year, hi.month, hi.day, 23, 59), inc=True)[:120]:
                if occ.date() != d0:
                    out.append({"id": t["id"], "date": occ.date().isoformat()})
        except (ValueError, TypeError):
            continue
    return jsonify(items=out)


# ---------------------------------------------------------------- habits

HABIT_FIELDS = ("name", "color", "goal", "days", "remind_at", "sort", "archived", "per_week")


@app.post("/api/habits")
def habit_create():
    b = body()
    name = (b.get("name") or "").strip()
    if not name:
        return err(tr("Name missing"))
    c = db()
    srt = c.execute("SELECT COALESCE(MAX(sort),0)+1 FROM habits").fetchone()[0]
    cur = c.execute("INSERT INTO habits(name,color,goal,days,remind_at,sort,per_week,created_at) VALUES(?,?,?,?,?,?,?,?)",
                    (name, b.get("color", ""), int(b.get("goal") or 1), b.get("days") or "1234567",
                     b.get("remind_at", ""), srt, int(b.get("per_week") or 0), iso(now_utc())))
    bump(c)
    c.commit()
    return jsonify(id=cur.lastrowid)


@app.patch("/api/habits/<int:hid>")
def habit_update(hid):
    b = body()
    c = db()
    for k in HABIT_FIELDS:
        if k in b:
            c.execute(f"UPDATE habits SET {k}=? WHERE id=?", (b[k], hid))
    bump(c)
    c.commit()
    return jsonify(ok=True)


@app.delete("/api/habits/<int:hid>")
def habit_delete(hid):
    c = db()
    c.execute("DELETE FROM habits WHERE id=?", (hid,))
    bump(c)
    c.commit()
    return jsonify(ok=True)


@app.post("/api/habits/<int:hid>/log")
def habit_log(hid):
    b = body()
    day = b.get("day") or local_now().date().isoformat()
    c = db()
    old = c.execute("SELECT count, note FROM habit_logs WHERE habit_id=? AND day=?", (hid, day)).fetchone()
    cnt = max(0, int(b["count"])) if "count" in b else (old["count"] if old else 0)
    note = (b.get("note") or "").strip()[:500] if "note" in b else (old["note"] if old else "")
    if cnt or note:  # a note keeps the day even when it is not ticked
        c.execute("INSERT INTO habit_logs(habit_id,day,count,note) VALUES(?,?,?,?) "
                  "ON CONFLICT(habit_id,day) DO UPDATE SET count=excluded.count, note=excluded.note",
                  (hid, day, cnt, note))
    else:
        c.execute("DELETE FROM habit_logs WHERE habit_id=? AND day=?", (hid, day))
    bump(c)
    c.commit()
    return jsonify(ok=True)


# ---------------------------------------------------------------- pomodoro

def pomo_elapsed(p, ref=None):
    ref = ref or now_utc()
    end = parse_iso(p["end"]) if p["end"] else (parse_iso(p["paused_at"]) if p["paused_at"] else ref)
    return max(0, (end - parse_iso(p["start"])).total_seconds() - p["paused_s"])


def pomo_stats(c, days=1):
    since = local_now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days - 1)
    rows = c.execute("SELECT * FROM pomos WHERE kind IN ('focus','stopwatch') AND end IS NOT NULL AND start>=?",
                     (iso(since),)).fetchall()
    return dict(count=sum(1 for r in rows if r["done"] and r["kind"] == "focus"),
                minutes=round(sum(pomo_elapsed(r) for r in rows) / 60))


@app.post("/api/pomo/start")
def pomo_start():
    b = body()
    c = db()
    s = settings(c)
    kind = b.get("kind", "focus")
    mins = 0 if kind == "stopwatch" else int(b.get("minutes") or s["pomo_" + ("focus" if kind == "focus" else "short")])
    ts = iso(now_utc())
    for p in c.execute("SELECT * FROM pomos WHERE end IS NULL").fetchall():  # one at a time
        c.execute("UPDATE pomos SET end=? WHERE id=?", (ts, p["id"]))
    c.execute("INSERT INTO pomos(task_id,kind,minutes,start) VALUES(?,?,?,?)",
              (b.get("task_id"), kind, mins, ts))
    bump(c)
    c.commit()
    return jsonify(running_pomo(c))


@app.post("/api/pomo/<int:pid>/<action>")
def pomo_action(pid, action):
    c = db()
    p = c.execute("SELECT * FROM pomos WHERE id=?", (pid,)).fetchone()
    if not p:
        return err(tr("unknown"), 404)
    ts = now_utc()
    if action == "pause" and not p["paused_at"] and not p["end"]:
        c.execute("UPDATE pomos SET paused_at=? WHERE id=?", (iso(ts), pid))
    elif action == "resume" and p["paused_at"]:
        add = int((ts - parse_iso(p["paused_at"])).total_seconds())
        c.execute("UPDATE pomos SET paused_at=NULL, paused_s=paused_s+? WHERE id=?", (add, pid))
    elif action in ("stop", "finish") and not p["end"]:
        done = 1 if action == "finish" or pomo_elapsed(p) >= p["minutes"] * 60 - 5 else 0
        c.execute("UPDATE pomos SET end=?, done=?, paused_at=NULL, paused_s=paused_s+? WHERE id=?",
                  (iso(ts), done,
                   int((ts - parse_iso(p["paused_at"])).total_seconds()) if p["paused_at"] else 0, pid))
    bump(c)
    c.commit()
    return jsonify(pomo=running_pomo(c), today=pomo_stats(c, 1))


@app.get("/api/pomo/stats")
def pomo_stats_api():
    c = db()
    since = local_now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=29)
    rows = c.execute("""SELECT p.*, t.title FROM pomos p LEFT JOIN tasks t ON t.id=p.task_id
                        WHERE p.kind IN ('focus','stopwatch') AND p.end IS NOT NULL AND p.start>=? ORDER BY p.start DESC""",
                     (iso(since),)).fetchall()
    per_day, per_task = {}, {}
    for r in rows:
        d = parse_iso(r["start"]).astimezone(TZ).date().isoformat()
        m = pomo_elapsed(r) / 60
        per_day[d] = per_day.get(d, 0) + m
        k = r["title"] or tr("No task")
        per_task[k] = per_task.get(k, 0) + m
    recent = [dict(id=r["id"], title=r["title"], start=r["start"], minutes=round(pomo_elapsed(r) / 60),
                   done=r["done"]) for r in rows[:30]]
    return jsonify(today=pomo_stats(c, 1), week=pomo_stats(c, 7),
                   per_day={k: round(v) for k, v in per_day.items()},
                   per_task=sorted(([k, round(v)] for k, v in per_task.items()), key=lambda x: -x[1])[:10],
                   recent=recent)


# ---------------------------------------------------------------- settings / export

@app.patch("/api/settings")
def settings_update():
    b = body()
    c = db()
    for k, v in b.items():
        if k in DEFAULT_SETTINGS and k not in ("version", "digest_sent", "ntfy_topic"):
            if k == "lang" and v not in LANGS:
                continue
            c.execute("UPDATE settings SET value=? WHERE key=?", (str(v), k))
    bump(c)
    c.commit()
    return jsonify(ok=True)


@app.post("/api/ntfy/test")
def ntfy_test():
    ok = ntfy("Abhako: Test", tr("Notifications are arriving."), "default", PUBLIC_URL)
    return jsonify(ok=ok)


@app.get("/api/export.json")
def export_json():
    c = db()
    data = {t: [dict(r) for r in c.execute(f"SELECT * FROM {t}")]
            for t in ("lists", "sections", "tasks", "task_tags", "habits", "habit_logs", "pomos", "filters",
                      "attachments", "paperless_links")}  # attachment files themselves stay in data/attachments/
    name = f"abhako-export-{local_now():%Y-%m-%d}.json"
    return Response(json.dumps(data, ensure_ascii=False, indent=1), mimetype="application/json",
                    headers={"Content-Disposition": f'attachment; filename="{name}"'})


# ---------------------------------------------------------------- TickTick import

def tt_date(s, all_day):
    """TickTick '2026-10-14T22:00:00+0000' -> (local date, local HH:MM | None)."""
    if not s:
        return None, None
    dt = datetime.strptime(s, "%Y-%m-%dT%H:%M:%S%z").astimezone(TZ)
    if all_day:
        return dt.date().isoformat(), None
    return dt.date().isoformat(), dt.strftime("%H:%M")


def tt_reminders(s):
    """'-PT0S,-PT15M,-P1D' / 'TRIGGER:-PT30M' -> '0,15,1440'."""
    out = []
    for part in (s or "").replace("TRIGGER:", "").split(","):
        p = part.strip().lstrip("-")
        if not p.startswith("P"):
            continue
        mins, num, in_time = 0, "", False
        for ch in p[1:]:
            if ch == "T":
                in_time = True
            elif ch.isdigit():
                num += ch
            else:
                n = int(num or 0)
                num = ""
                mins += {"W": 10080, "D": 1440}.get(ch, 0) * n if not in_time else \
                    {"H": 60, "M": 1, "S": 0}.get(ch, 0) * n
        out.append(str(mins))
    return ",".join(dict.fromkeys(out))


def import_ticktick(c, text):
    text = text.lstrip("﻿")
    i = text.find('"Folder Name"')
    if i < 0:
        raise ValueError(tr("Not a TickTick CSV (header 'Folder Name' missing)"))
    rows = list(csv.DictReader(io.StringIO(text[i:])))
    lists = {r["name"]: r["id"] for r in c.execute("SELECT id, name FROM lists")}
    inbox = c.execute("SELECT id FROM lists WHERE is_inbox=1").fetchone()[0]
    sections = {}
    stats = dict(tasks=0, skipped=0, lists=0)
    idmap = {}
    ts = iso(now_utc())
    now = local_now()
    # list order = first appearance; task order = TickTick "Order" within list
    rows.sort(key=lambda r: int(r.get("Order") or 0))
    for r in rows:
        name = (r.get("List Name") or "").strip()
        if name.lower() == "inbox" or not name:
            lid = inbox
        elif name in lists:
            lid = lists[name]
        else:
            srt = c.execute("SELECT COALESCE(MAX(sort),0)+1 FROM lists").fetchone()[0]
            lid = c.execute("INSERT INTO lists(name,folder,sort,view,created_at) VALUES(?,?,?,?,?)",
                            (name, r.get("Folder Name") or "", srt,
                             "kanban" if r.get("View Mode") == "kanban" else "list", ts)).lastrowid
            lists[name] = lid
            stats["lists"] += 1
        tt = r.get("taskId") or None
        if tt and c.execute("SELECT id FROM tasks WHERE tt_id=?", (tt,)).fetchone():
            idmap[tt] = c.execute("SELECT id FROM tasks WHERE tt_id=?", (tt,)).fetchone()[0]
            stats["skipped"] += 1
            continue
        sec = None
        col = (r.get("Column Name") or "").strip()
        if col:
            key = (lid, col)
            if key not in sections:
                row = c.execute("SELECT id FROM sections WHERE list_id=? AND name=?", key).fetchone()
                sections[key] = row[0] if row else c.execute(
                    "INSERT INTO sections(list_id,name,sort) VALUES(?,?,?)",
                    (lid, col, float(r.get("Column Order") or 0))).lastrowid
            sec = sections[key]
        all_day = (r.get("Is All Day") or "").lower() == "true"
        due, due_time = tt_date(r.get("Due Date") or r.get("Start Date"), all_day)
        start = None
        if r.get("Start Date") and r.get("Due Date"):
            sd, _ = tt_date(r["Start Date"], all_day)
            start = sd if sd and due and sd < due else None
        content = (r.get("Content") or "").replace("\\!", "!").replace("\r", "")
        if (r.get("Is Check list") or "N") == "Y":  # checklist lines -> content bullets
            content = "\n".join("- " + ln.lstrip("▫▪ ").strip() for ln in content.split("\n") if ln.strip())
        status = int(r.get("Status") or 0)
        status = 2 if status == 2 else (-1 if status == -1 else 0)
        completed = None
        if status and r.get("Completed Time"):
            completed = iso(datetime.strptime(r["Completed Time"], "%Y-%m-%dT%H:%M:%S%z"))
        created = r.get("Created Time")
        created = iso(datetime.strptime(created, "%Y-%m-%dT%H:%M:%S%z")) if created else ts
        rems = tt_reminders(r.get("Reminder"))
        # don't fire reminders that are already in the past at import time
        reminded = []
        if due and rems:
            base = datetime.fromisoformat(f"{due}T{due_time or '09:00'}").replace(tzinfo=TZ)
            for off in rems.split(","):
                if base - timedelta(minutes=int(off)) <= now:
                    reminded.append(f"{due} {due_time or ''}|{off}")
        repeat = r.get("Repeat") or ""
        if repeat and "FREQ=" not in repeat.upper():
            repeat = ""  # ERULE / custom date lists are not supported
        cur = c.execute(
            """INSERT INTO tasks(list_id,section_id,title,content,priority,status,due,due_time,reminders,
               reminded,repeat,sort,created_at,updated_at,completed_at,tt_id,start)
               VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (lid, sec, (r.get("Title") or tr("(untitled)", lg=lang(c))).strip(), content, int(r.get("Priority") or 0),
             status, due, due_time, rems, json.dumps(reminded), repeat, stats["tasks"], created, ts, completed, tt,
             start))
        idmap[tt] = cur.lastrowid
        tags = [t.strip() for t in (r.get("Tags") or "").split(",") if t.strip()]
        if tags:
            set_tags(c, cur.lastrowid, tags)
        stats["tasks"] += 1
        r["_id"] = cur.lastrowid
    for r in rows:  # second pass: parents
        p = r.get("parentId")
        if p and r.get("_id") and p in idmap:
            c.execute("UPDATE tasks SET parent_id=? WHERE id=?", (idmap[p], r["_id"]))
    bump(c)
    c.commit()
    return stats


@app.post("/api/import/ticktick")
def import_api():
    f = request.files.get("file")
    if not f:
        return err(tr("File missing"))
    try:
        stats = import_ticktick(db(), f.read().decode("utf-8-sig"))
    except (ValueError, KeyError) as e:
        return err(str(e))
    return jsonify(stats)


# ---------------------------------------------------------------- watchdog / ntfy

def ntfy(title, msg, prio="default", click=None, topic=None, actions=None):
    topic = topic or NTFY_TOPIC
    if not topic:
        return False
    hdr = {"Title": title.encode("utf-8"), "Priority": prio, "Tags": "white_check_mark"}
    if click:
        hdr["Click"] = click
    if NTFY_TOKEN:
        hdr["Authorization"] = f"Bearer {NTFY_TOKEN}"
    if actions:  # view actions open the browser (login cookie), http actions could not pass a login proxy
        hdr["Actions"] = "; ".join(f"view, {label}, {url}" for label, url in actions)
    try:
        req = urllib.request.Request(f"{NTFY_URL}/{topic}", data=msg.encode("utf-8"), headers=hdr)
        urllib.request.urlopen(req, timeout=10).read()
        return True
    except Exception as e:  # noqa: BLE001
        print("ntfy error:", e, flush=True)
        return False


def watchdog_tick(c):
    global NTFY_TOPIC
    if PL_TOKEN:
        paperless_poll(c)
    s = settings(c)
    NTFY_TOPIC = s["ntfy_topic"]
    lg = s.get("lang") if s.get("lang") in LANGS else "en"
    now = local_now()
    # task reminders -- fire once per (due, offset); skip if missed by > 6 h
    rows = c.execute("""SELECT t.*, l.name AS list_name, l.is_inbox AS list_inbox FROM tasks t JOIN lists l ON l.id=t.list_id
                        WHERE t.status=0 AND t.deleted_at IS NULL AND t.due IS NOT NULL
                          AND t.reminders!=''""").fetchall()
    for t in rows:
        base = datetime.fromisoformat(f"{t['due']}T{t['due_time'] or s['allday_time'] or '09:00'}").replace(tzinfo=TZ)
        fired = json.loads(t["reminded"] or "[]")
        changed = False
        for off in t["reminders"].split(","):
            if not off.strip():
                continue
            at = base - timedelta(minutes=int(off))
            key = f"{t['due']} {t['due_time'] or ''}|{off}"
            if key in fired or at > now:
                continue
            fired.append(key)
            changed = True
            if now - at > timedelta(hours=6):
                continue
            when = tr("all day", lg=lg) if not t["due_time"] else tr("at {0}", t["due_time"], lg=lg)
            day = tr("today", lg=lg) if t["due"] == now.date().isoformat() else \
                date.fromisoformat(t["due"]).strftime("%d.%m." if lg == "de" else "%d %b")
            lname = tr("Inbox", lg=lg) if t["list_inbox"] and t["list_name"] == "Eingang" else t["list_name"]
            ntfy(t["title"], tr("Due {0} {1} · {2}", day, when, lname, lg=lg),
                 "high" if t["priority"] == 5 else "default", f"{PUBLIC_URL}/#t/{t['id']}",
                 actions=[(tr("Snooze", lg=lg), f"{PUBLIC_URL}/#snooze/{t['id']}"),
                          (tr("Done|action", lg=lg), f"{PUBLIC_URL}/#done/{t['id']}")])
        if changed:
            c.execute("UPDATE tasks SET reminded=? WHERE id=?", (json.dumps(fired[-20:]), t["id"]))
            c.commit()
    # focus sessions finished while the tab is closed
    for p in c.execute("SELECT p.*, t.title FROM pomos p LEFT JOIN tasks t ON t.id=p.task_id "
                       "WHERE p.end IS NULL AND p.paused_at IS NULL AND p.notified=0").fetchall():
        if p["minutes"] > 0 and pomo_elapsed(p) >= p["minutes"] * 60:  # stopwatch (0 min) never ends by itself
            c.execute("UPDATE pomos SET notified=1 WHERE id=?", (p["id"],))
            c.commit()
            if p["kind"] == "focus":
                ntfy(tr("Focus done", lg=lg), tr("{0} min{1}. Time for a break.", p["minutes"], " · " + p["title"] if p["title"] else "", lg=lg),
                     "default", f"{PUBLIC_URL}/#pomo")
            else:
                ntfy(tr("Break is over", lg=lg), tr("Back to it.", lg=lg), "default", f"{PUBLIC_URL}/#pomo")
    # habit reminders
    today = now.date().isoformat()
    wd = str(now.isoweekday())
    for h in c.execute("SELECT * FROM habits WHERE archived=0 AND remind_at!='' AND reminded_on!=?",
                       (today,)).fetchall():
        if (not h["per_week"] and wd not in h["days"]) or now.strftime("%H:%M") < h["remind_at"]:
            continue
        if h["per_week"]:  # "x times a week": no reminder once this week's target is reached
            mon = (now.date() - timedelta(days=now.weekday())).isoformat()
            done_w = c.execute("SELECT COUNT(*) FROM habit_logs WHERE habit_id=? AND day>=? AND day<=? AND count>=?",
                               (h["id"], mon, today, h["goal"])).fetchone()[0]
            if done_w >= h["per_week"]:
                continue
        c.execute("UPDATE habits SET reminded_on=? WHERE id=?", (today, h["id"]))
        c.commit()
        done = c.execute("SELECT count FROM habit_logs WHERE habit_id=? AND day=?", (h["id"], today)).fetchone()
        if not done or done[0] < h["goal"]:
            ntfy(tr("Habit: {0}", h["name"], lg=lg), tr("Still open today.", lg=lg), "default", f"{PUBLIC_URL}/#habits")
    # daily digest
    dt = s.get("digest_time") or ""
    if dt and s.get("digest_sent") != today and now.strftime("%H:%M") >= dt:
        c.execute("UPDATE settings SET value=? WHERE key='digest_sent'", (today,))
        c.commit()
        rows = c.execute("""SELECT title, due, due_time FROM tasks WHERE status=0 AND deleted_at IS NULL
                            AND parent_id IS NULL AND due IS NOT NULL AND due<=?
                            ORDER BY due, due_time IS NULL, due_time, priority DESC""", (today,)).fetchall()
        if rows:
            over = sum(1 for r in rows if r["due"] < today)
            lines = [f"- {r['title']}" + (f" ({r['due_time']})" if r["due_time"] else "") for r in rows[:15]]
            head = trn("{0} task today", "{0} tasks today", len(rows), lg=lg) + \
                (tr(", {0} of them overdue", over, lg=lg) if over else "")
            ntfy(tr("Today", lg=lg), head + "\n" + "\n".join(lines), "default", f"{PUBLIC_URL}/#today")


def watchdog():
    while True:
        time.sleep(WATCHDOG_INTERVAL)
        try:
            c = connect()
            watchdog_tick(c)
            c.close()
        except Exception as e:  # noqa: BLE001
            print("watchdog error:", e, flush=True)


init_db()
if os.environ.get("TASKS_WATCHDOG", "1") == "1":
    threading.Thread(target=watchdog, daemon=True).start()
    if NTFY_IN["token"] and NTFY_IN["url"]:
        threading.Thread(target=ntfy_inbox_loop, daemon=True).start()

if __name__ == "__main__":
    import sys
    if len(sys.argv) == 3 and sys.argv[1] == "import":
        c = connect()
        print(import_ticktick(c, open(sys.argv[2], encoding="utf-8-sig").read()))
        c.close()
        sys.exit(0)
    from waitress import serve
    serve(app, host="0.0.0.0", port=int(os.environ.get("PORT", 3040)), threads=8)
