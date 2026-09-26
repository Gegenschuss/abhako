#!/usr/bin/env python3
"""Abhako — self-hosted task manager (multi-user, shared lists), inspired by TickTick and Asana.

Login: either a trusted reverse proxy that sends the user name in a header (AUTH_PROXY_HEADER, only
honoured from AUTH_TRUSTED_PROXIES and, if set, only on AUTH_PROXY_PORT) or the built-in
username/password login with a session cookie. The first start without users shows a setup page.
Storage: SQLite at /data/tasks.db. Dates are LOCAL ($TZ, Europe/Berlin):
tasks.due = 'YYYY-MM-DD', tasks.due_time = 'HH:MM' or NULL (all-day).

Modules: lists (+ sections = kanban columns), tasks with subtasks, tags, priority, reminders,
recurrence (RRULE via dateutil), habits, pomodoro. Lists have one owner and can be shared with other
users (role edit / view); tasks in shared lists can be assigned. Tasks have comments (with @mentions
and files), an activity history and a website link. Habits, focus sessions, filters,
folders, tags and settings are per user. A watchdog thread sends ntfy pushes (per user topic) for due
reminders, finished focus sessions, habit reminders and the optional daily digest.
TickTick CSV backups can be imported (idempotent via tasks.tt_id per user).

CSRF: every state-changing /api request must carry the header "X-Requested-With: abhako" (the web
client always sends it; a cross-site page cannot set it without a CORS preflight, which is never
allowed). Session cookies are HttpOnly + SameSite=Lax."""
import csv
import glob
import hashlib
import hmac
import io
import ipaddress
import json
import math
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
from werkzeug.security import check_password_hash, generate_password_hash

DB = os.environ.get("TASKS_DB", "/data/tasks.db")
TZ = ZoneInfo(os.environ.get("TZ", "Europe/Berlin"))
NTFY_TOPIC = os.environ.get("NTFY_TOPIC", "")  # topic of the first admin (seed); other users: settings
NTFY_URL = os.environ.get("NTFY_URL", "https://ntfy.sh")
NTFY_TOKEN = os.environ.get("NTFY_TOKEN", "")  # optional ntfy access token (write access to NTFY_TOPIC)
PUBLIC_URL = os.environ.get("PUBLIC_URL", "http://localhost:3040")
APP_NAME = "Abhako"
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
           "public": os.environ.get("NTFY_INBOX_PUBLIC", "").rstrip("/"), "topic": os.environ.get("NTFY_INBOX_TOPIC", "inbox"),
           "user": os.environ.get("NTFY_INBOX_USER", "").strip().lower()}  # username; empty = first admin


def _nets(s):
    out = []
    for part in (s or "").replace(";", ",").split(","):
        part = part.strip()
        if part:
            try:
                out.append(ipaddress.ip_network(part, strict=False))
            except ValueError:
                print("AUTH_TRUSTED_PROXIES: ignoring invalid entry", repr(part), flush=True)
    return out


# ---- login. Proxy mode: the header is trusted only from these peers (and only on AUTH_PROXY_PORT
# if set: a second listener, so other containers that share the docker gateway IP cannot spoof it).
AUTH_HEADER = os.environ.get("AUTH_PROXY_HEADER", "").strip()
AUTH_TRUSTED = _nets(os.environ.get("AUTH_TRUSTED_PROXIES", ""))
AUTH_PROXY_PORT = os.environ.get("AUTH_PROXY_PORT", "").strip()
BOOT_USER = (os.environ.get("AUTH_BOOTSTRAP_USER") or "admin").strip().lower()
BOOT_NAME = (os.environ.get("AUTH_BOOTSTRAP_NAME") or BOOT_USER.capitalize()).strip()
BOOT_PROXY = os.environ.get("AUTH_BOOTSTRAP_PROXY_LOGIN", "").strip() or None
SESSION_DAYS = int(os.environ.get("AUTH_SESSION_DAYS", "30"))
COOKIE = "abhako_session"
CSRF_HEADER, CSRF_VALUE = "X-Requested-With", "abhako"
# reachable without a user; the proxy header is never read on PROXY_IGNORE paths (they bypass the
# proxy login, so a client could send its own header there)
OPEN_PATHS = {"/", "/sw.js", "/manifest.json", "/api/health", "/drop",
              "/api/auth/info", "/api/auth/login", "/api/auth/setup", "/api/auth/logout"}
PROXY_IGNORE = {"/drop", "/manifest.json", "/sw.js", "/api/health"}
ICAL_PREFIX = "/ical/"  # calendar feed: the secret token in the path is the only credential (never the proxy header)
USERNAME_RE = re.compile(r"[a-z0-9][a-z0-9._-]{0,31}")
MIN_PASSWORD = 8

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
CREATE TABLE IF NOT EXISTS task_tags (                -- tags are per user (user_id)
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL DEFAULT 0,
  tag TEXT NOT NULL, PRIMARY KEY (task_id, user_id, tag));
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
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);  -- global (server-internal)
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
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL DEFAULT '',
  password_hash TEXT,                           -- NULL = no built-in login (proxy only)
  proxy_login TEXT UNIQUE,                      -- value of AUTH_PROXY_HEADER that maps to this user
  is_admin INTEGER NOT NULL DEFAULT 0, drop_token TEXT, created_at TEXT NOT NULL,
  disabled INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS user_settings (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (user_id, key));
CREATE TABLE IF NOT EXISTS list_members (             -- shared lists: role edit | view; folder/sort/view = the member's own
  list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'edit', folder TEXT NOT NULL DEFAULT '', sort REAL NOT NULL DEFAULT 0,
  view TEXT, added_at TEXT NOT NULL, PRIMARY KEY (list_id, user_id));
CREATE INDEX IF NOT EXISTS list_members_user ON list_members(user_id);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL, expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS comments (                 -- task comments; soft delete (deleted_at, body wiped)
  id INTEGER PRIMARY KEY, task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL DEFAULT '',                -- mentions as <@user_id> tokens
  mentions TEXT NOT NULL DEFAULT '',            -- csv of mentioned user ids
  created_at TEXT NOT NULL, edited_at TEXT, deleted_at TEXT);
CREATE TABLE IF NOT EXISTS activity (                 -- task history, structured (rendered by the client)
  id INTEGER PRIMARY KEY, task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id INTEGER, kind TEXT NOT NULL, data TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS task_seen (                -- unread comments: highest comment id a user has seen
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  seen_id INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, task_id));
CREATE TABLE IF NOT EXISTS task_push (                -- burst rule for collaboration pushes (per recipient + task)
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  sent_at REAL NOT NULL DEFAULT 0,              -- unix time of the last push
  pending INTEGER NOT NULL DEFAULT 0,           -- comments / changes counted since then (summary)
  events INTEGER NOT NULL DEFAULT 0, mentioned INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, task_id));
CREATE TABLE IF NOT EXISTS notifications (            -- "News" feed per user (structured, rendered by the client)
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                           -- mention|comment|assign|unassign|complete|share|role|unshare
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  list_id INTEGER REFERENCES lists(id) ON DELETE SET NULL,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  comment_id INTEGER,                           -- comment kinds: the (live) comment, excerpt read at display time
  data TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, read_at TEXT);
CREATE TABLE IF NOT EXISTS templates (                -- private per user: a task (+ subtasks) or a whole list
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'task',            -- task | list
  name TEXT NOT NULL, data TEXT NOT NULL DEFAULT '{}',   -- json, see tpl_* below
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS time_entries (             -- time tracking (module "time"), see the section below
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,   -- NULL: list-level entry, or the task was purged
  list_id INTEGER REFERENCES lists(id) ON DELETE SET NULL,   -- the task's list (kept in sync by a trigger)
  task_title TEXT NOT NULL DEFAULT '',          -- snapshot (trigger), shown once the task is purged
  start TEXT NOT NULL, end TEXT,                -- UTC ISO; end NULL = the running timer
  seconds INTEGER NOT NULL DEFAULT 0,           -- duration (focus: without pauses); 0 while running
  note TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'manual',        -- timer | manual | focus
  pomo_id INTEGER,                              -- focus: the session it came from (imported once)
  client_id TEXT,                               -- timer: id chosen by the device (offline start -> matching stop)
  reminded INTEGER NOT NULL DEFAULT 0, auto_stopped INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS time_user_start ON time_entries(user_id, start);
CREATE INDEX IF NOT EXISTS time_task ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS time_list ON time_entries(list_id, start);
CREATE UNIQUE INDEX IF NOT EXISTS time_running ON time_entries(user_id) WHERE end IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS time_pomo ON time_entries(pomo_id) WHERE pomo_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS time_client ON time_entries(user_id, client_id) WHERE client_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS task_deps (                -- dependencies: task_id waits on ("is blocked by") blocker_id
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  blocker_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_by INTEGER, created_at TEXT NOT NULL, PRIMARY KEY (task_id, blocker_id));
CREATE INDEX IF NOT EXISTS task_deps_blocker ON task_deps(blocker_id);
CREATE TABLE IF NOT EXISTS list_fields (              -- custom fields of a list (defined by the owner)
  id INTEGER PRIMARY KEY, list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL, type TEXT NOT NULL,       -- text | number | select | date | checkbox | person | url
  options TEXT NOT NULL DEFAULT '{}',           -- json: number {unit}, select {options: [{id, name, color}]}
  pinned INTEGER NOT NULL DEFAULT 0,            -- 1 = shown as a chip on the task rows (at most 2 per list)
  sort REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS list_fields_list ON list_fields(list_id);
CREATE TABLE IF NOT EXISTS task_field_values (        -- one value per task and field, shared by all list members
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  field_id INTEGER NOT NULL REFERENCES list_fields(id) ON DELETE CASCADE,
  value TEXT NOT NULL, PRIMARY KEY (task_id, field_id));
CREATE INDEX IF NOT EXISTS task_field_values_field ON task_field_values(field_id);
CREATE TABLE IF NOT EXISTS list_status (              -- project status updates of a list (history; current one on lists)
  id INTEGER PRIMARY KEY, list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS list_status_list ON list_status(list_id, id);
CREATE TRIGGER IF NOT EXISTS time_task_list AFTER UPDATE OF list_id ON tasks WHEN NEW.list_id IS NOT OLD.list_id
BEGIN UPDATE time_entries SET list_id=NEW.list_id WHERE task_id=NEW.id; END;
CREATE TRIGGER IF NOT EXISTS time_task_title AFTER UPDATE OF title ON tasks WHEN NEW.title IS NOT OLD.title
BEGIN UPDATE time_entries SET task_title=NEW.title WHERE task_id=NEW.id; END;
"""
# additive migrations: (table, column, ddl)
MIGRATIONS = [
    ("tasks", "pinned", "ALTER TABLE tasks ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0"),
    ("tasks", "start", "ALTER TABLE tasks ADD COLUMN start TEXT"),          # timeline: first day (local date)
    ("tasks", "duration", "ALTER TABLE tasks ADD COLUMN duration INTEGER"),  # minutes, week/day calendar blocks
    ("habits", "per_week", "ALTER TABLE habits ADD COLUMN per_week INTEGER NOT NULL DEFAULT 0"),  # 0 = fixed weekdays
    ("habit_logs", "note", "ALTER TABLE habit_logs ADD COLUMN note TEXT NOT NULL DEFAULT ''"),
    # multi-user (2026-09-26)
    ("lists", "owner_id", "ALTER TABLE lists ADD COLUMN owner_id INTEGER"),
    ("tasks", "created_by", "ALTER TABLE tasks ADD COLUMN created_by INTEGER"),
    ("tasks", "assignee_id", "ALTER TABLE tasks ADD COLUMN assignee_id INTEGER"),
    ("habits", "user_id", "ALTER TABLE habits ADD COLUMN user_id INTEGER"),
    ("pomos", "user_id", "ALTER TABLE pomos ADD COLUMN user_id INTEGER"),
    ("filters", "user_id", "ALTER TABLE filters ADD COLUMN user_id INTEGER"),
    # comments, activity, link (2026-09-26)
    ("tasks", "url", "ALTER TABLE tasks ADD COLUMN url TEXT"),                         # website link (http/https)
    ("attachments", "comment_id", "ALTER TABLE attachments ADD COLUMN comment_id INTEGER"),  # file of a comment
    ("tasks", "assigned_by", "ALTER TABLE tasks ADD COLUMN assigned_by INTEGER"),       # who set the assignee (pushes)
    # package 1 (2026-09-26): statistics count completions for the person who completed; calendar feed
    ("tasks", "completed_by", "ALTER TABLE tasks ADD COLUMN completed_by INTEGER"),
    ("users", "ical_token", "ALTER TABLE users ADD COLUMN ical_token TEXT"),           # secret of GET /ical/<uid>.<token>.ics
    # time tracking (2026-09-27): hourly rate of a list (reports / CSV amount), set by the owner
    ("lists", "rate", "ALTER TABLE lists ADD COLUMN rate REAL"),
    # package 3 (2026-09-27): project status of a list ('' = none; history in list_status)
    ("lists", "status", "ALTER TABLE lists ADD COLUMN status TEXT NOT NULL DEFAULT ''"),
    ("lists", "status_note", "ALTER TABLE lists ADD COLUMN status_note TEXT NOT NULL DEFAULT ''"),
    ("lists", "status_by", "ALTER TABLE lists ADD COLUMN status_by INTEGER"),
    ("lists", "status_at", "ALTER TABLE lists ADD COLUMN status_at TEXT"),
]
INDEXES = """
CREATE INDEX IF NOT EXISTS lists_owner ON lists(owner_id);
CREATE INDEX IF NOT EXISTS tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS habits_user ON habits(user_id);
CREATE INDEX IF NOT EXISTS pomos_user ON pomos(user_id);
CREATE INDEX IF NOT EXISTS filters_user ON filters(user_id);
CREATE INDEX IF NOT EXISTS task_tags_user ON task_tags(user_id, tag);
CREATE UNIQUE INDEX IF NOT EXISTS tasks_tt_user ON tasks(created_by, tt_id) WHERE tt_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS comments_task ON comments(task_id);
CREATE INDEX IF NOT EXISTS activity_task ON activity(task_id, id);
CREATE INDEX IF NOT EXISTS attachments_comment ON attachments(comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS notifications_user ON notifications(user_id, id);
CREATE INDEX IF NOT EXISTS notifications_task ON notifications(task_id);
CREATE INDEX IF NOT EXISTS tasks_completed_by ON tasks(completed_by, completed_at) WHERE completed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS templates_user ON templates(user_id);
"""
MAX_DEPTH = 3  # task > subtask > sub-subtask
# per user (table user_settings)
USER_DEFAULTS = {
    "allday_time": "09:00",     # reminder base time for all-day tasks
    "default_reminder": "0",    # reminder preset for new timed tasks ('' = none)
    "digest_time": "",          # daily "due today" push (HH:MM, '' = off)
    "digest_sent": "",
    "pomo_focus": "25", "pomo_short": "5", "pomo_long": "15", "pomo_long_every": "4",
    "ntfy_topic": "",           # set by an admin (a user could otherwise push into someone else's topic)
    "show_completed": "1",      # show the collapsed "Completed" group / done tasks in the calendar
    # modules that can be switched off in the settings (hidden from nav, data stays)
    # collab = comments, activity, mentions, News feed, sharing / assigning UI
    # progress = progress bar in the list header + the "Where is it stuck?" overview
    "features": "cal,timeline,matrix,habits,pomo,kanban,paperless,collab,stats,time,progress",
    "nav_order": "tasks,cal,matrix,habits,pomo",   # order of the mobile tab bar / desktop rail
    "folders": "[]",            # json list: folder order in the sidebar (also keeps empty folders)
    "features_rev": "7",        # one-shot migrations of the features list
    "paperless_keep": "0",      # 1 = keep the local attachment after it was consumed by Paperless
    "lang": "en",               # UI + push language: en or a static/i18n/<code>.json
    "ical_scope": "all",        # calendar feed: all = every visible open task with a date, mine = mine / assigned to me
    "ical_alarms": "1",         # calendar feed: reminders as VALARM
    # time tracking
    "time_rounding": "0",       # minutes: every entry is rounded UP in reports / CSV / timesheet (0 = off)
    "time_remind_h": "4",       # push "timer still running" after N hours (0 = off)
    "time_autostop_h": "12",    # stop a forgotten timer after N hours, end = start + N h (0 = off)
    "time_focus": "1",          # finished focus / stopwatch sessions on a task become time entries
    "time_currency": "€",       # amounts (hourly rate of a list)
    "time_target": "0",         # daily target in hours (0 = none)
    # package 3
    "hide_blocked_today": "0",  # 1 = tasks waiting on an open blocker are left out of "Today"
    "progress_subtasks": "0",   # 1 = the list progress counts subtasks too (else only main tasks)
}
# global, server-internal (table settings); the legacy single-user rows stay there untouched
GLOBAL_DEFAULTS = {
    "version": "1",             # bumped on every change; clients poll it
    "ntfy_inbox_since": "",     # last imported ntfy message id (or unix time on first start)
}
PRIO = {0: "", 1: "niedrig", 3: "mittel", 5: "hoch"}


# ---------------------------------------------------------------- i18n
# English is the source language: tr("English text", *args) returns the text in the UI language.
# Translations are the same JSON files the web client loads (static/i18n/<code>.json, see TRANSLATING.md).
# The language is a per-user setting; pushes use the recipient's language. A list value = [one, other] (trn()).
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


def lang(c=None, uid=None):
    """UI language of a user (request: the logged-in user; no user: the first admin). Works in
    requests and in the watchdog threads."""
    try:
        if uid is None and has_request_context() and getattr(g, "user", None):
            uid = g.user["id"]
        own = c is None and not has_request_context()
        c = c or (db() if has_request_context() else connect())
        try:
            if uid is None:
                uid = default_uid(c)
            r = c.execute("SELECT value FROM user_settings WHERE user_id=? AND key='lang'", (uid,)).fetchone() \
                if uid else None
        finally:
            if own:
                c.close()
        v = r[0] if r else USER_DEFAULTS["lang"]
        return v if v in LANGS else "en"
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


def iso_ms(dt):
    """Timeline timestamps (comments, activity): milliseconds keep their order within one second."""
    return dt.astimezone(timezone.utc).isoformat(timespec="milliseconds")


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


def random_topic():
    return "abhako-" + secrets.token_urlsafe(9).replace("_", "").replace("-", "").lower()


def default_uid(c):
    """First enabled admin (owner of the migrated single-user data, target of env defaults)."""
    r = c.execute("SELECT id FROM users WHERE is_admin=1 AND disabled=0 ORDER BY id LIMIT 1").fetchone() \
        or c.execute("SELECT id FROM users ORDER BY id LIMIT 1").fetchone()
    return r[0] if r else None


def ensure_inbox(c, uid):
    if not c.execute("SELECT 1 FROM lists WHERE is_inbox=1 AND owner_id=?", (uid,)).fetchone():
        c.execute("INSERT INTO lists(name,is_inbox,sort,created_at,owner_id) VALUES('Eingang',1,-1,?,?)",
                  (iso(now_utc()), uid))


def adopt_orphans(c, uid):
    """Rows from the single-user era (no owner) belong to uid. Idempotent (only NULL owners)."""
    n = c.execute("UPDATE lists SET owner_id=? WHERE owner_id IS NULL", (uid,)).rowcount
    n += c.execute("UPDATE tasks SET created_by=? WHERE created_by IS NULL", (uid,)).rowcount
    for t in ("habits", "pomos", "filters"):
        n += c.execute(f"UPDATE {t} SET user_id=? WHERE user_id IS NULL", (uid,)).rowcount
    n += c.execute("UPDATE task_tags SET user_id=? WHERE user_id=0", (uid,)).rowcount
    return n


def create_user(c, username, display_name="", password=None, proxy_login=None, is_admin=False,
                ntfy_topic=None, seed_global=False, drop_token=None):
    """Inserts a user with settings (+ inbox unless the caller adopts an existing one). Returns the id."""
    uid = c.execute("""INSERT INTO users(username,display_name,password_hash,proxy_login,is_admin,drop_token,created_at)
                       VALUES(?,?,?,?,?,?,?)""",
                    (username, display_name or username, generate_password_hash(password) if password else None,
                     proxy_login or None, 1 if is_admin else 0, drop_token or secrets.token_urlsafe(24),
                     iso(now_utc()))).lastrowid
    vals = dict(USER_DEFAULTS)
    if seed_global:  # the single-user settings become this user's settings
        for r in c.execute("SELECT key, value FROM settings"):
            if r["key"] in USER_DEFAULTS:
                vals[r["key"]] = r["value"]
    if ntfy_topic is not None:
        vals["ntfy_topic"] = ntfy_topic
    if not vals["ntfy_topic"]:
        vals["ntfy_topic"] = random_topic()
    for k, v in vals.items():
        c.execute("INSERT OR REPLACE INTO user_settings(user_id,key,value) VALUES(?,?,?)", (uid, k, v))
    return uid


def init_db():
    os.makedirs(os.path.dirname(DB), exist_ok=True)
    os.makedirs(ATT_DIR, exist_ok=True)
    c = connect()
    c.executescript(SCHEMA)
    c.isolation_level = None
    c.execute("BEGIN IMMEDIATE")
    try:
        for table, col, ddl in MIGRATIONS:
            if col not in {r[1] for r in c.execute(f"PRAGMA table_info({table})")}:
                c.execute(ddl)
        # task_tags from the single-user era: (task_id, tag) -> (task_id, user_id, tag); 0 = adopted below
        if "user_id" not in {r[1] for r in c.execute("PRAGMA table_info(task_tags)")}:
            c.execute("""CREATE TABLE task_tags_mu (task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                         user_id INTEGER NOT NULL DEFAULT 0, tag TEXT NOT NULL, PRIMARY KEY (task_id, user_id, tag))""")
            c.execute("INSERT INTO task_tags_mu(task_id,user_id,tag) SELECT task_id, 0, tag FROM task_tags")
            c.execute("DROP TABLE task_tags")
            c.execute("ALTER TABLE task_tags_mu RENAME TO task_tags")
        c.execute("DROP INDEX IF EXISTS tasks_tt")  # tt_id is unique per user now (tasks_tt_user)
        for stmt in INDEXES.strip().split(";"):
            if stmt.strip():
                c.execute(stmt)
        for k, v in GLOBAL_DEFAULTS.items():
            c.execute("INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)", (k, v))
        # migration of a single-user install: its data belongs to the bootstrap admin
        if not c.execute("SELECT 1 FROM users").fetchone():
            has_data = (c.execute("SELECT COUNT(*) FROM lists").fetchone()[0] > 1
                        or c.execute("SELECT 1 FROM tasks").fetchone() or c.execute("SELECT 1 FROM habits").fetchone()
                        or c.execute("SELECT 1 FROM filters").fetchone() or c.execute("SELECT 1 FROM pomos").fetchone())
            if has_data:
                legacy_topic = (c.execute("SELECT value FROM settings WHERE key='ntfy_topic'").fetchone() or [""])[0]
                uid = create_user(c, BOOT_USER, BOOT_NAME, None, BOOT_PROXY, True,
                                  ntfy_topic=legacy_topic or NTFY_TOPIC or None, seed_global=True,
                                  drop_token=os.environ.get("TASKS_DROP_TOKEN") or None)
                n = adopt_orphans(c, uid)
                print(f"multi-user migration: created user {BOOT_USER!r} (id {uid}), adopted {n} rows", flush=True)
        first = default_uid(c)
        if first:
            n = adopt_orphans(c, first)
            if n:
                print("adopted", n, "ownerless rows for user", first, flush=True)
            if NTFY_TOPIC:  # env topic seeds the first admin's topic when it is still empty
                c.execute("UPDATE user_settings SET value=? WHERE user_id=? AND key='ntfy_topic' AND value=''",
                          (NTFY_TOPIC, first))
        for (uid,) in c.execute("SELECT id FROM users").fetchall():
            ensure_inbox(c, uid)
            for k, v in USER_DEFAULTS.items():
                c.execute("INSERT OR IGNORE INTO user_settings(user_id,key,value) VALUES(?,?,?)", (uid, k, v))
            # features_rev 2: paperless module added -> on by default for existing installs
            # features_rev 3: collab added (2026-09-26) -> on by default
            # features_rev 4: the "links" switch is gone (website link always on) -> dropped from the list
            # features_rev 5: statistics module added (2026-09-26) -> on by default
            # features_rev 6: time tracking module added (2026-09-27) -> on by default
            # features_rev 7: project progress / overview added (2026-09-27) -> on by default
            s = usettings(c, uid)
            rev, fs = int(s.get("features_rev") or 1), [x for x in s["features"].split(",") if x]
            if rev < 7:
                for f, since in (("paperless", 2), ("collab", 3), ("stats", 5), ("time", 6), ("progress", 7)):
                    if rev < since and f not in fs:
                        fs.append(f)
                fs = [f for f in fs if f != "links"]
                uset(c, uid, "features", ",".join(fs))
                uset(c, uid, "features_rev", "7")
        if not gsetting(c, "undo_key"):  # signs the undo payloads handed to the client
            gset(c, "undo_key", secrets.token_hex(32))
        # one-shot: completions from before completed_by existed belong to the task's creator (else the list owner)
        if gsetting(c, "migr_completed_by") != "1":
            n = c.execute("""UPDATE tasks SET completed_by=COALESCE(created_by, (SELECT owner_id FROM lists WHERE lists.id=tasks.list_id))
                             WHERE completed_by IS NULL AND status!=0 AND completed_at IS NOT NULL""").rowcount
            gset(c, "migr_completed_by", "1")
            print("completed_by: attributed", n, "earlier completions", flush=True)
        c.execute("COMMIT")
    except Exception:
        c.execute("ROLLBACK")
        raise
    c.close()


def gsetting(c, key):
    r = c.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    return r[0] if r else GLOBAL_DEFAULTS.get(key, "")


def gset(c, key, value):
    c.execute("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
              (key, str(value)))


def usettings(c, uid):
    s = dict(USER_DEFAULTS)
    s.update({r["key"]: r["value"] for r in c.execute("SELECT key, value FROM user_settings WHERE user_id=?", (uid,))})
    return s


def uset(c, uid, key, value):
    c.execute("INSERT INTO user_settings(user_id,key,value) VALUES(?,?,?) "
              "ON CONFLICT(user_id,key) DO UPDATE SET value=excluded.value", (uid, key, str(value)))


def bump(c):
    c.execute("UPDATE settings SET value=CAST(value AS INTEGER)+1 WHERE key='version'")


def err(msg, code=400):
    return jsonify(error=msg), code  # msg is already translated


def body():
    return request.get_json(silent=True) or {}


# ---------------------------------------------------------------- auth

def me():
    return g.user["id"]


def _peer_trusted():
    """Direct peer is a trusted proxy (and the request came in on the proxy port, if one is set)."""
    try:
        ip = ipaddress.ip_address(request.remote_addr or "")
    except ValueError:
        return False
    if not any(ip in n for n in AUTH_TRUSTED):
        return False
    return not AUTH_PROXY_PORT or str(request.environ.get("SERVER_PORT", "")) == AUTH_PROXY_PORT


def proxy_login_value():
    """The trusted proxy header of this request, or '' (not configured / untrusted peer / bypassed path)."""
    if not AUTH_HEADER or request.path in PROXY_IGNORE or request.path.startswith(("/static/", ICAL_PREFIX)):
        return ""
    v = (request.headers.get(AUTH_HEADER) or "").strip()
    return v if v and _peer_trusted() else ""


def _token_hash(t):
    return hashlib.sha256(t.encode()).hexdigest()


def client_ip():
    xff = request.headers.get("X-Forwarded-For", "")
    if xff and _peer_trusted():
        return xff.split(",")[0].strip()
    return request.remote_addr or ""


def _is_open(path, method):
    return path in OPEN_PATHS or path.startswith(("/static/", ICAL_PREFIX)) or (path == "/share" and method == "GET")


@app.before_request
def authenticate():
    g.user, g.auth_via, g.auth_error, g.proxy_login, g.pushes = None, None, None, "", []
    c = db()
    val = proxy_login_value()
    if val:
        u = c.execute("SELECT * FROM users WHERE proxy_login=? COLLATE NOCASE", (val,)).fetchone()
        if u and not u["disabled"]:
            g.user, g.auth_via = u, "proxy"
        else:
            g.auth_error, g.proxy_login = ("disabled" if u else "no_account"), val
    if not g.user and not g.auth_error:
        tok = request.cookies.get(COOKIE)
        if tok:
            r = c.execute("""SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id
                             WHERE s.token_hash=? AND s.expires_at>? AND u.disabled=0""",
                          (_token_hash(tok), iso(now_utc()))).fetchone()
            if r:
                g.user, g.auth_via = r, "session"
    path = request.path
    if request.method not in ("GET", "HEAD", "OPTIONS") and path.startswith("/api/") \
            and request.headers.get(CSRF_HEADER) != CSRF_VALUE:
        return err(tr("Request blocked: header {0} missing", CSRF_HEADER), 403)
    if g.user or _is_open(path, request.method):
        return None
    if path.startswith("/api/"):
        if g.auth_error:
            msg = tr("This account is disabled") if g.auth_error == "disabled" else tr("No account for {0}", g.proxy_login)
            return jsonify(error=msg, auth=g.auth_error, login=g.proxy_login), 403
        setup = not c.execute("SELECT 1 FROM users").fetchone()
        return jsonify(error=tr("Please log in"), auth="setup" if setup else "login"), 401
    return redirect("/", 303)


_fails, _fail_lock = {}, threading.Lock()
FAIL_WINDOW = 900  # s


def _rate_keys(username):
    return [("u:" + username, 5), ("ip:" + client_ip(), 20)]


def _rate_blocked(keys):
    now = time.time()
    with _fail_lock:
        for k, limit in keys:
            arr = [t for t in _fails.get(k, []) if now - t < FAIL_WINDOW]
            _fails[k] = arr
            if len(arr) >= limit:
                return True
    return False


def _rate_fail(keys):
    with _fail_lock:
        for k, _ in keys:
            _fails.setdefault(k, []).append(time.time())


def start_session(c, uid, remember):
    tok = secrets.token_urlsafe(32)
    days = SESSION_DAYS if remember else 1
    c.execute("DELETE FROM sessions WHERE expires_at<?", (iso(now_utc()),))
    c.execute("INSERT INTO sessions(token_hash,user_id,created_at,expires_at) VALUES(?,?,?,?)",
              (_token_hash(tok), uid, iso(now_utc()), iso(now_utc() + timedelta(days=days))))
    return tok, (days * 86400 if remember else None)


def set_cookie(resp, tok, max_age):
    secure = request.is_secure or request.headers.get("X-Forwarded-Proto", "") == "https"
    resp.set_cookie(COOKIE, tok, max_age=max_age, httponly=True, samesite="Lax", secure=secure, path="/")
    return resp


def user_public(u):
    return {"id": u["id"], "username": u["username"], "display_name": u["display_name"] or u["username"]}


@app.get("/api/auth/info")
def auth_info():
    """What the login screen needs (open): setup needed?, language, why a proxy login failed."""
    c = db()
    return jsonify(setup=not c.execute("SELECT 1 FROM users").fetchone(), lang=lang(),
                   languages=languages(), user=user_public(g.user) if g.user else None,
                   auth_error=g.auth_error, login=g.proxy_login or proxy_login_value())


@app.post("/api/auth/login")
def auth_login():
    b = body()
    username = (b.get("username") or "").strip().lower()
    keys = _rate_keys(username)
    if _rate_blocked(keys):
        return err(tr("Too many failed logins, please wait a few minutes"), 429)
    c = db()
    u = c.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
    ok = bool(u and u["password_hash"] and not u["disabled"]
              and check_password_hash(u["password_hash"], b.get("password") or ""))
    if not u or not u["password_hash"]:
        check_password_hash(generate_password_hash("x"), "y")  # same timing for unknown users
    if not ok:
        _rate_fail(keys)
        print("login failed for", repr(username), "from", client_ip(), flush=True)
        return err(tr("Wrong username or password"), 401)
    with _fail_lock:
        _fails.pop("u:" + username, None)
    tok, age = start_session(c, u["id"], bool(b.get("remember", True)))
    c.commit()
    return set_cookie(jsonify(ok=True, user=user_public(u)), tok, age)


@app.post("/api/auth/setup")
def auth_setup():
    """First start without users: creates the first admin. With a trusted proxy header the account is
    bound to that login and the password is optional."""
    b = body()
    c = db()
    c.execute("BEGIN IMMEDIATE")
    if c.execute("SELECT 1 FROM users").fetchone():
        c.rollback()
        return err(tr("Setup is already done"), 409)
    username = (b.get("username") or "").strip().lower()
    pw = b.get("password") or ""
    proxy = proxy_login_value() or None
    if not USERNAME_RE.fullmatch(username):
        c.rollback()
        return err(tr("Username: 1-32 characters a-z, 0-9, dot, dash, underscore"))
    if (pw or not proxy) and len(pw) < MIN_PASSWORD:
        c.rollback()
        return err(tr("Password: at least {0} characters", MIN_PASSWORD))
    uid = create_user(c, username, (b.get("display_name") or "").strip()[:60] or username, pw or None, proxy, True,
                      ntfy_topic=NTFY_TOPIC or None, seed_global=True,
                      drop_token=os.environ.get("TASKS_DROP_TOKEN") or None)
    adopt_orphans(c, uid)
    ensure_inbox(c, uid)
    bump(c)
    tok, age = start_session(c, uid, True) if pw else (None, None)
    c.commit()
    resp = jsonify(ok=True)
    return set_cookie(resp, tok, age) if tok else resp


@app.post("/api/auth/logout")
def auth_logout():
    c = db()
    tok = request.cookies.get(COOKIE)
    if tok:
        c.execute("DELETE FROM sessions WHERE token_hash=?", (_token_hash(tok),))
        c.commit()
    resp = jsonify(ok=True, proxy=g.auth_via == "proxy")
    resp.delete_cookie(COOKIE, path="/")
    return resp


# ---------------------------------------------------------------- access control
# A list is visible to its owner and its members; role 'view' is read-only. Objects the user cannot
# see answer 404 (their existence is not revealed), writes with a view-only role 403.

class Denied(Exception):
    def __init__(self, code=404):
        super().__init__(code)
        self.code = code


@app.errorhandler(Denied)
def denied(e):
    return err(tr("No permission (view only)") if e.code == 403 else tr("unknown"), e.code)


def vis_sql():
    """Subquery of the list ids the current user may see (two ? = user id)."""
    return "(SELECT id FROM lists WHERE owner_id=? UNION SELECT list_id FROM list_members WHERE user_id=?)"


def wr_sql():
    """Subquery of the list ids the current user may change (two ? = user id)."""
    return "(SELECT id FROM lists WHERE owner_id=? UNION SELECT list_id FROM list_members WHERE user_id=? AND role='edit')"


def list_role(c, lid, uid=None):
    uid = uid or me()
    r = c.execute("SELECT owner_id FROM lists WHERE id=?", (lid,)).fetchone()
    if not r:
        return None
    if r[0] == uid:
        return "owner"
    m = c.execute("SELECT role FROM list_members WHERE list_id=? AND user_id=?", (lid, uid)).fetchone()
    return m[0] if m else None


def need_list(c, lid, write=True, owner=False):
    role = list_role(c, lid) if lid else None
    if not role:
        raise Denied(404)
    if (owner and role != "owner") or (write and role == "view"):
        raise Denied(403)
    return role


def need_task(c, tid, write=True):
    r = c.execute("SELECT list_id FROM tasks WHERE id=?", (tid,)).fetchone()
    if not r:
        raise Denied(404)
    return need_list(c, r[0], write)


def list_people(c, lid):
    """Owner + member ids of a list."""
    r = c.execute("SELECT owner_id FROM lists WHERE id=?", (lid,)).fetchone()
    ids = {r[0]} if r else set()
    ids.update(x[0] for x in c.execute("SELECT user_id FROM list_members WHERE list_id=?", (lid,)))
    return ids


def my_inbox(c, uid=None):
    uid = uid or me()
    r = c.execute("SELECT id FROM lists WHERE is_inbox=1 AND owner_id=?", (uid,)).fetchone()
    if r:
        return r[0]
    ensure_inbox(c, uid)
    return c.execute("SELECT id FROM lists WHERE is_inbox=1 AND owner_id=?", (uid,)).fetchone()[0]


def my_max_sort(c, uid):
    a = c.execute("SELECT COALESCE(MAX(sort),0) FROM lists WHERE owner_id=?", (uid,)).fetchone()[0]
    b = c.execute("SELECT COALESCE(MAX(sort),0) FROM list_members WHERE user_id=?", (uid,)).fetchone()[0]
    return max(a, b)


# ---------------------------------------------------------------- serializers

def task_dict(r, tags):
    d = dict(r)
    d.pop("reminded", None)
    d["tags"] = tags.get(r["id"], [])
    return d


def tags_for(c, ids=None, uid=None):
    out = {}
    uid = uid or me()
    for r in c.execute("SELECT task_id, tag FROM task_tags WHERE user_id=? ORDER BY tag", (uid,)):
        if ids is None or r["task_id"] in ids:
            out.setdefault(r["task_id"], []).append(r["tag"])
    return out


def load_tasks(c, where, args=()):
    rows = c.execute(f"SELECT * FROM tasks WHERE {where}", args).fetchall()
    ids = {r["id"] for r in rows}
    tags = tags_for(c, ids)
    atts = {}  # the task's own files; files of comments are shown inside their comment (timeline)
    for a in c.execute("SELECT id, task_id, name, mime, size, created_at FROM attachments WHERE comment_id IS NULL ORDER BY id"):
        if a["task_id"] in ids:
            atts.setdefault(a["task_id"], []).append({k: a[k] for k in ("id", "name", "mime", "size", "created_at")})
    pls = {}
    for p in c.execute("SELECT id, task_id, doc_id, title, correspondent, created, status, message, att_id "
                       "FROM paperless_links ORDER BY id"):
        if p["task_id"] in ids:
            pls.setdefault(p["task_id"], []).append({k: p[k] for k in p.keys() if k != "task_id"})
    # comment count + unread (comments of others newer than the last one I have seen)
    cms, uid = {}, (g.user["id"] if has_request_context() and getattr(g, "user", None) else None)
    if uid and ids:
        for r in c.execute("""SELECT k.task_id, COUNT(*) AS n,
                                     SUM(CASE WHEN k.id > COALESCE(s.seen_id, 0) AND k.user_id IS NOT ? THEN 1 ELSE 0 END) AS u
                              FROM comments k LEFT JOIN task_seen s ON s.task_id=k.task_id AND s.user_id=?
                              WHERE k.deleted_at IS NULL GROUP BY k.task_id""", (uid, uid)):
            if r["task_id"] in ids:
                cms[r["task_id"]] = (r["n"], r["u"] or 0)
    # custom field values (fields of the task's current list) and dependencies: blocked = open blockers
    # (also ones I cannot see), blockers = the open ones I can see, blocking = open tasks waiting on it
    fvs, blk, bing = {}, {}, {}
    if ids:
        for r in c.execute("""SELECT v.task_id, v.field_id, v.value FROM task_field_values v JOIN list_fields f ON f.id=v.field_id
                              JOIN tasks t ON t.id=v.task_id WHERE f.list_id=t.list_id"""):
            if r["task_id"] in ids:
                fvs.setdefault(r["task_id"], {})[str(r["field_id"])] = r["value"]
        for r in c.execute("""SELECT d.task_id, d.blocker_id, b.list_id FROM task_deps d JOIN tasks b ON b.id=d.blocker_id
                              WHERE b.status=0 AND b.deleted_at IS NULL"""):
            if r["task_id"] in ids:
                blk.setdefault(r["task_id"], []).append((r["blocker_id"], r["list_id"]))
        for r in c.execute("""SELECT d.blocker_id, COUNT(*) AS n FROM task_deps d JOIN tasks t ON t.id=d.task_id
                              WHERE t.status=0 AND t.deleted_at IS NULL GROUP BY d.blocker_id"""):
            if r["blocker_id"] in ids:
                bing[r["blocker_id"]] = r["n"]
    vis = vis_ids(c, uid) if blk and uid else set()
    out = []
    for r in rows:
        d = task_dict(r, tags)
        d["attachments"] = atts.get(r["id"], [])
        d["paperless"] = pls.get(r["id"], [])
        d["comment_count"], d["unread"] = cms.get(r["id"], (0, 0))
        d["fields"] = fvs.get(r["id"], {})
        d["blocked"] = len(blk.get(r["id"], []))
        d["blockers"] = [b for b, lid in blk.get(r["id"], []) if lid in vis]
        d["blocking"] = bing.get(r["id"], 0)
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


def running_pomo(c, uid=None):
    r = c.execute("SELECT * FROM pomos WHERE end IS NULL AND user_id=? ORDER BY id DESC LIMIT 1", (uid or me(),)).fetchone()
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


def new_inbox_task(c, uid, title, content="", tt_id=None, url=None):
    inbox = my_inbox(c, uid)
    ts = iso(now_utc())
    srt = c.execute("SELECT COALESCE(MIN(sort),0)-1 FROM tasks WHERE list_id=? AND parent_id IS NULL", (inbox,)).fetchone()[0]
    tid = c.execute("INSERT INTO tasks(list_id,title,content,sort,created_at,updated_at,tt_id,created_by,url) VALUES(?,?,?,?,?,?,?,?,?)",
                    (inbox, (title or tr("Shared", lg=lang(c, uid)))[:300], content or "", srt, ts, ts, tt_id, uid,
                     url if valid_url(url) else None)).lastrowid
    log_act(c, tid, "created", uid=uid)
    return tid


# ---- website link (tasks.url): http/https only, no server-side fetching
URL_RE = re.compile(r"https?://[^\s<>\"']+", re.I)


def valid_url(u):
    return bool(u) and len(u) <= 2000 and bool(re.fullmatch(r"https?://[^\s/?#]+[^\s]*", u, re.I))


def url_title(u):
    """Readable title for a bare link: domain (without www.) + path."""
    p = urllib.parse.urlsplit(u)
    host = p.netloc.lower().split("@")[-1]
    host = host[4:] if host.startswith("www.") else host
    return (host + p.path.rstrip("/"))[:120] or u[:120]


def split_link(title, content=""):
    """Shared text -> (title, content, url): the first URL goes into the link field. A URL in the title is
    removed from it (a title that was only the URL becomes domain + path); a URL in the content stays there."""
    for where, txt in (("title", title or ""), ("content", content or "")):
        m = URL_RE.search(txt)
        if not m:
            continue
        url = m.group(0).rstrip(".,;:!?")
        if where == "title":
            title = re.sub(r"\s+", " ", txt[:m.start()] + txt[m.end():]).strip(" -–—|:·")
        return title or url_title(url), content, url
    return title, content, None


def save_attachment_bytes(c, tid, name, mime, data):
    name = safe_name(name)
    os.makedirs(os.path.join(ATT_DIR, str(tid)), exist_ok=True)
    rel = os.path.join(str(tid), f"{uuid.uuid4().hex[:12]}-{name}")
    with open(os.path.join(ATT_DIR, rel), "wb") as f:
        f.write(data)
    mime = mime if mime and mime != "application/octet-stream" else (mimetypes.guess_type(name)[0] or "application/octet-stream")
    c.execute("INSERT INTO attachments(task_id,name,mime,size,path,created_at) VALUES(?,?,?,?,?,?)",
              (tid, name, mime, len(data), rel, iso(now_utc())))


def inbox_user(c):
    """User whose inbox receives the ntfy share inbox (NTFY_INBOX_USER, default the first admin)."""
    if NTFY_IN["user"]:
        r = c.execute("SELECT id FROM users WHERE username=? AND disabled=0", (NTFY_IN["user"],)).fetchone()
        if r:
            return r[0]
    return default_uid(c)


def ntfy_inbox_import(c, m):
    """One ntfy message -> one inbox task (+ attachment). Idempotent via tt_id 'ntfy:<id>'."""
    mid = m["id"]
    uid = inbox_user(c)
    if uid and not c.execute("SELECT 1 FROM tasks WHERE tt_id=?", ("ntfy:" + mid,)).fetchone():
        att = m.get("attachment") or None
        msg = (m.get("message") or "").strip()
        if att and any(msg.startswith(p) for p in SHARE_PLACEHOLDERS):  # ntfy / Android placeholder texts
            msg = ""
        first = msg.split("\n", 1)[0].strip()
        if (m.get("title") or "").strip():
            title, content = m["title"].strip(), msg
        else:  # first line becomes the title, the rest the description
            title = first or (os.path.splitext(att["name"])[0] if att else tr("Shared", lg=lang(c, uid)))
            content = msg.split("\n", 1)[1].strip() if "\n" in msg else ""
        title, content, url = split_link(title, content)
        tid = new_inbox_task(c, uid, title, content, "ntfy:" + mid, url)
        if att and att.get("url"):
            url = att["url"]
            if NTFY_IN["public"] and url.startswith(NTFY_IN["public"]):  # fetch via the internal URL
                url = NTFY_IN["url"] + url[len(NTFY_IN["public"]):]
            req = urllib.request.Request(url, headers={"Authorization": f"Bearer {NTFY_IN['token']}"})
            with urllib.request.urlopen(req, timeout=120) as r:
                data = r.read(MAX_FILE_MB * 1024 * 1024 + 1)
            if len(data) <= MAX_FILE_MB * 1024 * 1024:
                save_attachment_bytes(c, tid, att.get("name") or "datei", att.get("type") or "", data)
        print("ntfy inbox: task", tid, "user", uid, repr(title), "attachment" if att else "", flush=True)
    gset(c, "ntfy_inbox_since", mid)
    bump(c)
    c.commit()


def ntfy_inbox_loop():
    """Stream the inbox topic (ntfy sends keepalives every 45 s); reconnect with the last id."""
    while True:
        try:
            c = connect()
            since = gsetting(c, "ntfy_inbox_since") or ""
            if not since:  # first start: only messages from now on
                since = str(int(time.time()))
                gset(c, "ntfy_inbox_since", since)
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
    m = None if url else URL_RE.search(text)  # most apps put the link into "text"
    if m:
        url, text = m.group(0).rstrip(".,;:!?"), text[:m.start()] + text[m.end():]
    title = (request.form.get("title") or "").strip() or re.sub(r"\s+", " ", text.replace(url, "") if url else text).strip(" -–—|:·") \
        or (url_title(url) if url else "") or (os.path.splitext(safe_name(files[0].filename))[0] if files else tr("Shared"))
    tid = new_inbox_task(c, me(), title, "", url=url or None)  # the link goes into the link field
    save_attachments(c, tid, files)
    bump(c)
    c.commit()
    return redirect(f"/#t/{tid}", 303)


# Placeholder texts some Android apps put next to a shared file; never a useful title.
SHARE_PLACEHOLDERS = ("You received a file:", "Ein Bild wurde mit Dir geteilt", "Ein Bild wurde mit dir geteilt")


def drop_user(c, auth):
    """User whose personal drop token is in the Authorization header (constant-time compare)."""
    if not auth.startswith("Bearer "):
        return None
    got, hit = auth[7:].encode(), None
    for r in c.execute("SELECT * FROM users WHERE drop_token IS NOT NULL AND drop_token!='' AND disabled=0"):
        if secrets.compare_digest(got, r["drop_token"].encode()):
            hit = r
    return hit


@app.post("/drop")
def drop_post():
    """Upload endpoint for the Android app HTTP Shortcuts (Chrome drops files shared to PWAs):
    one request = one inbox task with every file attached. Exclude /drop from the proxy login;
    the bearer token (TASKS_DROP_TOKEN) is its lock. Every user has an own token (task lands in their inbox)."""
    auth = request.headers.get("Authorization", "")
    c = db()
    u = drop_user(c, auth)
    if not u:
        print("drop: 403, auth header", "missing" if not auth else
              f"len {len(auth)} starts {auth[:7]!r} ends-with-space {auth != auth.rstrip()}", flush=True)
        return Response(tr("not allowed") + "\n", 403, mimetype="text/plain")
    lg = lang(c, u["id"])
    files = [f for key in request.files for f in request.files.getlist(key) if f and f.filename]
    text = (request.form.get("text") or "").strip()
    if any(text.startswith(p) for p in SHARE_PLACEHOLDERS):
        text = ""
    if not files and not text:
        return Response(tr("nothing received", lg=lg) + "\n", 400, mimetype="text/plain")
    first, _, rest = text.partition("\n")
    first, rest, url = split_link(first.strip(), rest.strip())
    title = first or (os.path.splitext(safe_name(files[0].filename))[0] if len(files) == 1
                      else tr("{0} files shared", len(files), lg=lg))
    tid = new_inbox_task(c, u["id"], title, rest, url=url)
    e = save_attachments(c, tid, files) if files else None
    bump(c)
    c.commit()
    print("drop: task", tid, "user", u["id"], repr(title), len(files), "files", e or "", flush=True)
    n = trn(", {0} file", ", {0} files", len(files), lg=lg) if files and title != tr("{0} files shared", len(files), lg=lg) else ""
    return Response(f"Abhako: {title}{n}" + (f" ({tr('error: {0}', e, lg=lg)})" if e else "") + "\n", mimetype="text/plain")


@app.get("/manifest.json")
def manifest():
    """static/manifest.json with description + lang in the UI language."""
    with open(os.path.join(app.static_folder, "manifest.json"), encoding="utf-8") as f:
        m = json.load(f)
    lg = lang()
    m["lang"], m["description"] = lg, tr("Tasks, lists, calendar, habits, focus", lg=lg)
    # long-press menu of the installed app (Android / desktop); the client handles these start URLs
    m["shortcuts"] = [{"name": tr(n, lg=lg), "short_name": tr(n, lg=lg), "url": u,
                       "icons": [{"src": f"/static/shortcuts/{k}-{z}.png", "sizes": f"{z}x{z}", "type": "image/png"} for z in (96, 192)]}
                      for k, n, u in (("new", N_("New task"), "/?action=new"), ("today", N_("Today"), "/#today"),
                                      ("news", N_("News"), "/#news"), ("search", N_("Search"), "/#search"))]
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
    c = db()
    return jsonify(v=int(gsetting(c, "version")), n=news_sig(c, me()))


# ---------------------------------------------------------------- state

def visible_lists(c, uid):
    """Lists the user sees, with role, sharing info and the user's own folder / sort / view."""
    rows = c.execute("""SELECT l.*, m.role AS m_role, m.folder AS m_folder, m.sort AS m_sort, m.view AS m_view
                        FROM lists l LEFT JOIN list_members m ON m.list_id=l.id AND m.user_id=?
                        WHERE l.owner_id=? OR m.user_id IS NOT NULL""", (uid, uid)).fetchall()
    ids = [r["id"] for r in rows]
    members, names = {}, {}
    if ids:
        q = ",".join("?" * len(ids))
        for m in c.execute(f"""SELECT m.list_id, m.role, u.id, u.username, u.display_name FROM list_members m
                               JOIN users u ON u.id=m.user_id WHERE m.list_id IN ({q}) ORDER BY m.added_at, u.id""", ids):
            members.setdefault(m["list_id"], []).append({"user_id": m["id"], "name": m["display_name"] or m["username"],
                                                         "role": m["role"]})
        owners = {r["owner_id"] for r in rows}
        q2 = ",".join("?" * len(owners))
        names = {u["id"]: u["display_name"] or u["username"]
                 for u in c.execute(f"SELECT id, username, display_name FROM users WHERE id IN ({q2})", list(owners))}
    subs = usettings(c, uid).get("progress_subtasks") == "1"
    prog = list_progress(c, ids, subs)
    snames = user_names(c, [r["status_by"] for r in rows])
    out = []
    for r in rows:
        d = {k: r[k] for k in r.keys() if not k.startswith("m_")}
        d["progress"] = prog.get(r["id"], {"done": 0, "total": 0, "overdue": 0, "next_due": None})
        d["status_by_name"] = snames.get(r["status_by"], "")
        if r["owner_id"] != uid:
            d.update(folder=r["m_folder"], sort=r["m_sort"], view=r["m_view"] or r["view"], role=r["m_role"])
        else:
            d["role"] = "owner"
        d["members"] = members.get(r["id"], [])
        d["shared"] = bool(d["members"])
        d["owner_name"] = names.get(r["owner_id"], "")
        out.append(d)
    out.sort(key=lambda d: (-d["is_inbox"], d["sort"], d["id"]))
    return out


@app.get("/api/state")
def state():
    c = db()
    uid = me()
    s = usettings(c, uid)
    cutoff = iso(now_utc() - timedelta(days=14))
    tasks = load_tasks(c, f"list_id IN {vis_sql()} AND deleted_at IS NULL AND (status=0 OR completed_at>=?) ORDER BY id",
                       (uid, uid, cutoff))
    habits = [dict(r) for r in c.execute("SELECT * FROM habits WHERE user_id=? ORDER BY archived, sort, id", (uid,))]
    since = (local_now().date() - timedelta(days=400)).isoformat()
    logs, notes = {}, {}
    for r in c.execute("""SELECT l.habit_id, l.day, l.count, l.note FROM habit_logs l JOIN habits h ON h.id=l.habit_id
                          WHERE h.user_id=? AND l.day>=?""", (uid, since)):
        if r["count"]:
            logs.setdefault(r["habit_id"], {})[r["day"]] = r["count"]
        if r["note"]:
            notes.setdefault(r["habit_id"], {})[r["day"]] = r["note"]
    for h in habits:
        h["logs"] = logs.get(h["id"], {})
        h["notes"] = notes.get(h["id"], {})
    u = g.user
    return jsonify(
        v=int(gsetting(c, "version")),
        me={**user_public(u), "is_admin": bool(u["is_admin"]), "auth": g.auth_via, "has_password": bool(u["password_hash"]),
            "ntfy_inbox": bool(NTFY_IN["token"]) and inbox_user(c) == uid},
        lists=visible_lists(c, uid),
        filters=[{**dict(r), "rules": json.loads(r["rules"] or "{}")}
                 for r in c.execute("SELECT * FROM filters WHERE user_id=? ORDER BY sort, id", (uid,))],
        sections=[dict(r) for r in c.execute(f"SELECT * FROM sections WHERE list_id IN {vis_sql()} ORDER BY sort, id",
                                             (uid, uid))],
        fields=[field_dict(r) for r in c.execute(f"SELECT * FROM list_fields WHERE list_id IN {vis_sql()} ORDER BY sort, id",
                                                 (uid, uid))],
        tasks=tasks,
        habits=habits,
        pomo=running_pomo(c),
        pomo_today=pomo_stats(c, days=1),
        counts=dict(
            done=c.execute(f"SELECT COUNT(*) FROM tasks WHERE list_id IN {vis_sql()} AND deleted_at IS NULL AND status!=0",
                           (uid, uid)).fetchone()[0],
            trash=c.execute(f"SELECT COUNT(*) FROM tasks WHERE list_id IN {wr_sql()} AND deleted_at IS NOT NULL",
                            (uid, uid)).fetchone()[0]),
        settings={k: v for k, v in s.items() if k not in ("digest_sent",)},
        paperless={"enabled": bool(PL_TOKEN), "url": PL_PUBLIC},
        ntfy_inbox={"enabled": bool(NTFY_IN["token"]), "server": NTFY_IN["public"], "topic": NTFY_IN["topic"]},
        ntfy_url=NTFY_URL,
        languages=languages(),
        news={"unread": news_unread(c, uid, s), "sig": news_sig(c, uid)},
        templates=[dict(r) for r in c.execute("SELECT id, kind, name FROM templates WHERE user_id=? ORDER BY name COLLATE NOCASE, id",
                                              (uid,))],
        timer=time_running(c, uid),
        time_totals=time_totals(c, uid),
    )


@app.get("/api/tasks")
def task_query():
    c = db()
    uid = me()
    scope = request.args.get("scope", "done")
    limit = min(int(request.args.get("limit", 300)), 2000)
    if scope == "trash":
        rows = load_tasks(c, f"list_id IN {wr_sql()} AND deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT ?",
                          (uid, uid, limit))
    elif scope == "search":
        raw = request.args.get('q', '').strip()
        q = f"%{raw}%"
        fids = sorted(search_field_ids(c, uid, raw))[:2000] if raw else []
        rows = load_tasks(c, f"list_id IN {vis_sql()} AND deleted_at IS NULL AND (title LIKE ? OR content LIKE ? OR url LIKE ? "
                             f"OR id IN ({','.join('?' * len(fids)) or 'NULL'})) "
                             "ORDER BY status, updated_at DESC LIMIT ?", (uid, uid, q, q, q, *fids, limit))
    else:
        rows = load_tasks(c, f"list_id IN {vis_sql()} AND deleted_at IS NULL AND status!=0 ORDER BY completed_at DESC LIMIT ?",
                          (uid, uid, limit))
    return jsonify(tasks=rows)


@app.get("/api/tasks/<int:tid>")
def task_get(tid):
    """One task I can see (e.g. an old completed one opened from the News feed)."""
    c = db()
    need_task(c, tid, write=False)
    rows = load_tasks(c, "id=? AND deleted_at IS NULL", (tid,))
    if not rows:
        raise Denied(404)
    return jsonify(rows[0])


# ---------------------------------------------------------------- lists / sections

LIST_FIELDS = ("name", "color", "folder", "sort", "view", "archived")
MEMBER_LIST_FIELDS = ("folder", "sort", "view")  # a member's own sidebar placement / view


@app.post("/api/lists")
def list_create():
    b = body()
    name = (b.get("name") or "").strip()
    if not name:
        return err(tr("Name missing"))
    c = db()
    uid = me()
    srt = my_max_sort(c, uid) + 1
    cur = c.execute("INSERT INTO lists(name,color,folder,sort,view,created_at,owner_id) VALUES(?,?,?,?,?,?,?)",
                    (name, b.get("color", ""), b.get("folder", ""), srt, b.get("view", "list"), iso(now_utc()), uid))
    bump(c)
    c.commit()
    return jsonify(dict(c.execute("SELECT * FROM lists WHERE id=?", (cur.lastrowid,)).fetchone()))


@app.patch("/api/lists/<int:lid>")
def list_update(lid):
    b = body()
    c = db()
    role = need_list(c, lid, write=False)
    if role == "owner":
        for k in LIST_FIELDS:
            if k in b:
                c.execute(f"UPDATE lists SET {k}=? WHERE id=?", (b[k], lid))
        if "rate" in b:  # hourly rate for the time reports (None / '' = none)
            try:
                rate = None if b["rate"] in (None, "") else round(float(str(b["rate"]).replace(",", ".")), 2)
            except ValueError:
                return err(tr("Hourly rate: number expected"))
            if rate is not None and not 0 <= rate <= 1e6:
                return err(tr("Hourly rate: number expected"))
            c.execute("UPDATE lists SET rate=? WHERE id=?", (rate, lid))
    else:
        if "rate" in b or any(k in b for k in LIST_FIELDS if k not in MEMBER_LIST_FIELDS):
            return err(tr("Only the owner can change this list"), 403)
        for k in MEMBER_LIST_FIELDS:
            if k in b:
                c.execute(f"UPDATE list_members SET {k}=? WHERE list_id=? AND user_id=?", (b[k], lid, me()))
    bump(c)
    c.commit()
    return jsonify(ok=True)


@app.post("/api/lists/reorder")
def list_reorder():
    """{ids: [...], folder?: {id: name}} -- sidebar order after a drag / arrow move (per user)."""
    b = body()
    c = db()
    uid = me()
    for i, lid in enumerate(b.get("ids", [])):
        c.execute("UPDATE lists SET sort=? WHERE id=? AND is_inbox=0 AND owner_id=?", (i, int(lid), uid))
        c.execute("UPDATE list_members SET sort=? WHERE list_id=? AND user_id=?", (i, int(lid), uid))
    for lid, folder in (b.get("folder") or {}).items():
        c.execute("UPDATE lists SET folder=? WHERE id=? AND owner_id=?", (folder, int(lid), uid))
        c.execute("UPDATE list_members SET folder=? WHERE list_id=? AND user_id=?", (folder, int(lid), uid))
    bump(c)
    c.commit()
    return jsonify(ok=True)


@app.delete("/api/lists/<int:lid>")
def list_delete(lid):
    c = db()
    need_list(c, lid, owner=True)
    r = c.execute("SELECT is_inbox FROM lists WHERE id=?", (lid,)).fetchone()
    if r["is_inbox"]:
        return err(tr("The inbox cannot be deleted"))
    # tasks go to the trash inside the owner's inbox so they stay restorable
    inbox = my_inbox(c)
    ts = iso(now_utc())
    c.execute("UPDATE tasks SET deleted_at=COALESCE(deleted_at,?), list_id=?, section_id=NULL, assignee_id=NULL WHERE list_id=?",
              (ts, inbox, lid))
    c.execute("DELETE FROM lists WHERE id=?", (lid,))
    bump(c)
    c.commit()
    return jsonify(ok=True)


@app.put("/api/lists/<int:lid>/members")
def member_set(lid):
    """{user_id, role: edit|view} -- owner shares the list (or changes a member's role)."""
    b = body()
    c = db()
    need_list(c, lid, owner=True)
    if c.execute("SELECT is_inbox FROM lists WHERE id=?", (lid,)).fetchone()[0]:
        return err(tr("The inbox cannot be shared"))
    role = b.get("role", "edit")
    if role not in ("edit", "view"):
        return err(tr("Role must be edit or view"))
    try:
        uid = int(b.get("user_id") or 0)
    except (TypeError, ValueError):
        uid = 0
    u = c.execute("SELECT id FROM users WHERE id=? AND disabled=0", (uid,)).fetchone()
    if not u or uid == me():
        return err(tr("unknown user"), 404)
    lname = c.execute("SELECT name FROM lists WHERE id=?", (lid,)).fetchone()[0]
    old = c.execute("SELECT role FROM list_members WHERE list_id=? AND user_id=?", (lid, uid)).fetchone()
    if old:
        c.execute("UPDATE list_members SET role=? WHERE list_id=? AND user_id=?", (role, lid, uid))
        if old[0] != role:
            news_add(c, uid, "role", list_id=lid, data={"role": role, "old": old[0], "name": lname})
    else:
        c.execute("INSERT INTO list_members(list_id,user_id,role,sort,added_at) VALUES(?,?,?,?,?)",
                  (lid, uid, role, my_max_sort(c, uid) + 1, iso(now_utc())))
        news_add(c, uid, "share", list_id=lid, data={"role": role, "name": lname})
    bump(c)
    c.commit()
    return jsonify(ok=True)


@app.delete("/api/lists/<int:lid>/members/<int:uid>")
def member_remove(lid, uid):
    """Owner removes a member, or a member leaves (uid = self)."""
    c = db()
    role = need_list(c, lid, write=False)
    if uid != me() and role != "owner":
        raise Denied(403)
    if not c.execute("SELECT 1 FROM list_members WHERE list_id=? AND user_id=?", (lid, uid)).fetchone():
        return err(tr("unknown"), 404)
    c.execute("DELETE FROM list_members WHERE list_id=? AND user_id=?", (lid, uid))
    c.execute("UPDATE tasks SET assignee_id=NULL WHERE list_id=? AND assignee_id=?", (lid, uid))
    c.execute("DELETE FROM task_field_values WHERE value=? AND field_id IN (SELECT id FROM list_fields WHERE list_id=? AND type='person')",
              (str(uid), lid))
    if uid != me():  # removed by the owner (leaving on your own is no news for you)
        news_add(c, uid, "unshare", list_id=lid,
                 data={"name": c.execute("SELECT name FROM lists WHERE id=?", (lid,)).fetchone()[0]})
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
    srt = c.execute("SELECT COALESCE(MAX(sort),0)+1 FROM filters WHERE user_id=?", (me(),)).fetchone()[0]
    cur = c.execute("INSERT INTO filters(name,rules,sort,created_at,user_id) VALUES(?,?,?,?,?)",
                    (name, json.dumps(b.get("rules") or {}), srt, iso(now_utc()), me()))
    bump(c)
    c.commit()
    return jsonify(id=cur.lastrowid)


def need_filter(c, fid):
    if not c.execute("SELECT 1 FROM filters WHERE id=? AND user_id=?", (fid, me())).fetchone():
        raise Denied(404)


@app.patch("/api/filters/<int:fid>")
def filter_update(fid):
    b = body()
    c = db()
    need_filter(c, fid)
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
    need_filter(c, fid)
    c.execute("DELETE FROM filters WHERE id=?", (fid,))
    bump(c)
    c.commit()
    return jsonify(ok=True)


def _folders(c):
    try:
        return json.loads(usettings(c, me()).get("folders") or "[]")
    except (TypeError, ValueError):
        return []


@app.post("/api/folders/rename")
def folder_rename():
    b = body()
    old, new = (b.get("old") or "").strip(), (b.get("new") or "").strip()
    if not old or not new:
        return err(tr("Name missing"))
    c = db()
    c.execute("UPDATE lists SET folder=? WHERE folder=? AND owner_id=?", (new, old, me()))
    c.execute("UPDATE list_members SET folder=? WHERE folder=? AND user_id=?", (new, old, me()))
    f = [new if x == old else x for x in _folders(c)]
    uset(c, me(), "folders", json.dumps(list(dict.fromkeys(f)), ensure_ascii=False))
    bump(c)
    c.commit()
    return jsonify(ok=True)


@app.post("/api/folders/delete")
def folder_delete():
    """Removes the folder only; its lists move to the top level."""
    name = (body().get("name") or "").strip()
    c = db()
    c.execute("UPDATE lists SET folder='' WHERE folder=? AND owner_id=?", (name, me()))
    c.execute("UPDATE list_members SET folder='' WHERE folder=? AND user_id=?", (name, me()))
    uset(c, me(), "folders", json.dumps([x for x in _folders(c) if x != name], ensure_ascii=False))
    bump(c)
    c.commit()
    return jsonify(ok=True)


def need_section(c, sid):
    r = c.execute("SELECT list_id FROM sections WHERE id=?", (sid,)).fetchone()
    if not r:
        raise Denied(404)
    need_list(c, r[0])


@app.post("/api/sections")
def section_create():
    b = body()
    name = (b.get("name") or "").strip()
    if not name or not b.get("list_id"):
        return err(tr("Name/list missing"))
    c = db()
    need_list(c, b["list_id"])
    srt = c.execute("SELECT COALESCE(MAX(sort),0)+1 FROM sections WHERE list_id=?", (b["list_id"],)).fetchone()[0]
    cur = c.execute("INSERT INTO sections(list_id,name,sort) VALUES(?,?,?)", (b["list_id"], name, srt))
    bump(c)
    c.commit()
    return jsonify(dict(c.execute("SELECT * FROM sections WHERE id=?", (cur.lastrowid,)).fetchone()))


@app.patch("/api/sections/<int:sid>")
def section_update(sid):
    b = body()
    c = db()
    need_section(c, sid)
    for k in ("name", "sort"):
        if k in b:
            c.execute(f"UPDATE sections SET {k}=? WHERE id=?", (b[k], sid))
    bump(c)
    c.commit()
    return jsonify(ok=True)


@app.delete("/api/sections/<int:sid>")
def section_delete(sid):
    c = db()
    need_section(c, sid)
    c.execute("DELETE FROM sections WHERE id=?", (sid,))
    bump(c)
    c.commit()
    return jsonify(ok=True)


# ---------------------------------------------------------------- tasks

TASK_FIELDS = ("list_id", "section_id", "parent_id", "title", "content", "priority",
               "due", "due_time", "reminders", "repeat", "repeat_from", "sort",
               "pinned", "start", "duration", "assignee_id", "url")


# ---------------------------------------------------------------- activity (task history)
# Structured events, rendered (and translated) by the client: kind + data. Logged by the mutation
# endpoints, never for noise (sort order, pin, reminders, private tags, view state). Repeated edits of
# the same kind by the same user within ACT_MERGE_S update the last entry instead of adding lines
# (typing in the title / description, clicking through dates).
ACT_MERGE = {"title", "content", "due", "snooze", "priority", "assign", "list", "section", "repeat", "link", "parent", "field"}
ACT_MERGE_S = 600


def log_act(c, tid, kind, data=None, uid=None):
    if uid is None and has_request_context() and getattr(g, "user", None):
        uid = g.user["id"]
    ts, js = iso_ms(now_utc()), json.dumps(data or {}, ensure_ascii=False)
    if kind in ACT_MERGE:
        last = c.execute("SELECT id, user_id, kind, data, created_at FROM activity WHERE task_id=? ORDER BY id DESC LIMIT 1",
                         (tid,)).fetchone()
        if last and last["kind"] == kind and last["user_id"] == uid \
                and (kind != "field" or json.loads(last["data"] or "{}").get("id") == (data or {}).get("id")) \
                and (now_utc() - parse_iso(last["created_at"])).total_seconds() < ACT_MERGE_S:
            c.execute("UPDATE activity SET data=?, created_at=? WHERE id=?", (js, ts, last["id"]))
            return
    c.execute("INSERT INTO activity(task_id,user_id,kind,data,created_at) VALUES(?,?,?,?,?)", (tid, uid, kind, js, ts))


def log_changes(c, tid, old, act=None):
    """Compares the task row before a change (old) with the stored row now and logs what a person
    would care about."""
    new = c.execute("SELECT * FROM tasks WHERE id=?", (tid,)).fetchone()
    if not old or not new:
        return
    ch = lambda k: _norm(old[k]) != _norm(new[k])  # noqa: E731
    if ch("title"):
        log_act(c, tid, "title", {"to": new["title"][:200]})
    if ch("content"):
        log_act(c, tid, "content")
    if ch("due") or ch("due_time") or ch("start"):
        log_act(c, tid, "snooze" if act == "snooze" and new["due"] else "due",
                {"due": new["due"], "time": new["due_time"], "start": new["start"]})
    if ch("priority"):
        log_act(c, tid, "priority", {"p": new["priority"]})
    if ch("assignee_id"):
        log_act(c, tid, "assign", {"to": new["assignee_id"], "from": old["assignee_id"]})
    if ch("list_id"):
        lst = c.execute("SELECT name, is_inbox FROM lists WHERE id=?", (new["list_id"],)).fetchone()
        log_act(c, tid, "list", {"name": lst["name"] if lst else "", "inbox": bool(lst and lst["is_inbox"])})
    elif ch("section_id") and not ch("parent_id"):  # indenting follows the parent's section: not a move
        sec = c.execute("SELECT name FROM sections WHERE id=?", (new["section_id"],)).fetchone() if new["section_id"] else None
        log_act(c, tid, "section", {"name": sec["name"] if sec else None})
    if ch("parent_id"):
        par = c.execute("SELECT title FROM tasks WHERE id=?", (new["parent_id"],)).fetchone() if new["parent_id"] else None
        log_act(c, tid, "parent", {"title": par["title"][:200] if par else None})
    if ch("repeat"):
        log_act(c, tid, "repeat", {"rule": new["repeat"]})
    if ch("url"):
        log_act(c, tid, "link", {"url": new["url"]})


def check_url(f):
    """Normalizes f['url'] ('' -> NULL); error message if it is not an http(s) link."""
    if "url" not in f:
        return None
    u = (f["url"] or "").strip() if isinstance(f["url"], (str, type(None))) else ""
    f["url"] = u or None
    return tr("The link must start with http:// or https://") if u and not valid_url(u) else None


def clean_task(b):
    out = {}
    for k in TASK_FIELDS:
        if k in b:
            v = b[k]
            if k in ("due", "due_time", "section_id", "parent_id", "start", "duration") and v in ("", None):
                v = None
            if k == "assignee_id" and v in ("", None, 0):
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


def set_tags(c, tid, tags, uid=None):
    uid = uid or me()
    c.execute("DELETE FROM task_tags WHERE task_id=? AND user_id=?", (tid, uid))
    for t in dict.fromkeys(x.strip().lstrip("#") for x in tags if x and x.strip().lstrip("#")):
        c.execute("INSERT INTO task_tags(task_id,user_id,tag) VALUES(?,?,?)", (tid, uid, t))


def my_tags(c, tid):
    return [r[0] for r in c.execute("SELECT tag FROM task_tags WHERE task_id=? AND user_id=?", (tid, me()))]


def one_task(c, tid):
    return load_tasks(c, "id=?", (tid,))[0]


def check_assignee(c, lid, aid):
    """None if aid may be assigned in list lid, else an error message."""
    if aid is None:
        return None
    try:
        aid = int(aid)
    except (TypeError, ValueError):
        return tr("unknown user")
    return None if aid in list_people(c, lid) else tr("Only the owner or a member of the list can be assigned")


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
    if f.get("parent_id"):  # subtasks live in their parent's list
        need_task(c, f["parent_id"])
        f["list_id"] = c.execute("SELECT list_id FROM tasks WHERE id=?", (f["parent_id"],)).fetchone()[0]
    elif f.get("list_id"):
        need_list(c, f["list_id"])
    else:
        f["list_id"] = my_inbox(c)
    if f.get("section_id") and not c.execute("SELECT 1 FROM sections WHERE id=? AND list_id=?",
                                              (f["section_id"], f["list_id"])).fetchone():
        f["section_id"] = None
    e = check_assignee(c, f["list_id"], f.get("assignee_id")) or check_url(f)
    if e:
        return err(e)
    if "sort" not in f:
        f["sort"] = c.execute("SELECT COALESCE(MIN(sort),0)-1 FROM tasks WHERE list_id=? AND parent_id IS ?",
                              (f["list_id"], f.get("parent_id"))).fetchone()[0]
        if f.get("parent_id"):  # subtasks append at the end
            f["sort"] = c.execute("SELECT COALESCE(MAX(sort),0)+1 FROM tasks WHERE parent_id=?",
                                  (f["parent_id"],)).fetchone()[0]
    ts = iso(now_utc())
    f["created_by"] = me()
    if f.get("assignee_id"):
        f["assigned_by"] = me()
    cols = list(f) + ["created_at", "updated_at"]
    cur = c.execute(f"INSERT INTO tasks({','.join(cols)}) VALUES({','.join('?' * len(cols))})",
                    [f[k] for k in f] + [ts, ts])
    if b.get("tags"):
        set_tags(c, cur.lastrowid, b["tags"])
    if b.get("fields"):
        set_field_values(c, cur.lastrowid, f["list_id"], b["fields"], log=False)  # BadInput: 400, nothing stored
    log_act(c, cur.lastrowid, "created")
    if f.get("assignee_id"):
        task_event(c, cur.lastrowid, "assign")
    if f.get("parent_id"):
        log_act(c, f["parent_id"], "subtask", {"id": cur.lastrowid, "title": f["title"][:200]})
    bump(c)
    c.commit()
    return jsonify(one_task(c, cur.lastrowid))


@app.patch("/api/tasks/<int:tid>")
def task_update(tid):
    c = db()
    need_task(c, tid)
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
    overwritten but reported back as a conflict (client lets the user pick).
    The caller checked write access to the task; moves are checked here (Denied)."""
    prev = b.get("_prev") if isinstance(b.get("_prev"), dict) else None
    if prev:
        row = c.execute("SELECT * FROM tasks WHERE id=?", (tid,)).fetchone()
        b = dict(b)
        for k, old in prev.items():
            if k not in b or k.startswith("_"):
                continue
            if k == "tags":
                cur = my_tags(c, tid)
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
    e = check_url(f)
    if e:
        return e
    cur = c.execute("SELECT * FROM tasks WHERE id=?", (tid,)).fetchone()  # also the "before" of the activity log
    if "start" in f or "due" in f:  # keep start <= due against the stored other half
        st, du = f.get("start", cur["start"]), f.get("due", cur["due"])
        if st and (not du or st > du):
            f["start"] = du
    if "parent_id" in f:
        e = check_parent(c, tid, f["parent_id"])
        if e:
            return e
        if f["parent_id"]:  # indent: follow the new parent's list / section
            need_task(c, f["parent_id"])
            p = c.execute("SELECT list_id, section_id FROM tasks WHERE id=?", (f["parent_id"],)).fetchone()
            f["list_id"] = p["list_id"]
            f["section_id"] = p["section_id"]
    if "list_id" in f:
        if not f["list_id"]:
            del f["list_id"]
        elif f["list_id"] != cur["list_id"]:
            need_list(c, f["list_id"])  # moving out needs write on the source (caller), in on the target
    lid = f.get("list_id", cur["list_id"])
    if f.get("section_id") and not c.execute("SELECT 1 FROM sections WHERE id=? AND list_id=?", (f["section_id"], lid)).fetchone():
        f["section_id"] = None
    if "assignee_id" in f:
        e = check_assignee(c, lid, f["assignee_id"])
        if e:
            return e
    elif lid != cur["list_id"] and cur["assignee_id"] and cur["assignee_id"] not in list_people(c, lid):
        f["assignee_id"] = None  # the assignee has no access to the new list
    if "assignee_id" in f and _norm(f["assignee_id"]) != _norm(cur["assignee_id"]):
        f["assigned_by"] = me() if f["assignee_id"] else None
    if "fields" in b:  # custom field values: validated before anything is written
        try:
            fl = {r["id"]: r for r in c.execute("SELECT * FROM list_fields WHERE list_id=?", (lid,))}
            if not isinstance(b["fields"], dict) or any(not str(k).isdigit() or int(k) not in fl for k in b["fields"]):
                raise BadInput(tr("Unknown field"))
            for k, v in b["fields"].items():
                field_value(c, fl[int(k)], v, lid)
        except BadInput as e:
            return str(e)
    if f:
        # a changed date / reminder set re-arms the reminder
        if any(k in f for k in ("due", "due_time", "reminders", "assignee_id")):
            f["reminded"] = "[]"
        f["updated_at"] = iso(now_utc())
        c.execute(f"UPDATE tasks SET {','.join(k + '=?' for k in f)} WHERE id=?", [*f.values(), tid])
        if "list_id" in f:  # subtasks follow their parent (all levels)
            people = list_people(c, f["list_id"])
            for d in descendants(c, tid):
                c.execute("UPDATE tasks SET list_id=? WHERE id=?", (f["list_id"], d))
                a = c.execute("SELECT assignee_id FROM tasks WHERE id=?", (d,)).fetchone()[0]
                if a and a not in people:
                    c.execute("UPDATE tasks SET assignee_id=NULL WHERE id=?", (d,))
            if "section_id" not in f:
                c.execute("UPDATE tasks SET section_id=NULL WHERE id=?", (tid,))
    if f:
        log_changes(c, tid, cur, b.get("_act"))
        new_a = c.execute("SELECT assignee_id FROM tasks WHERE id=?", (tid,)).fetchone()[0]
        assignment_events(c, tid, cur["assignee_id"], new_a)
    if "tags" in b:
        set_tags(c, tid, b["tags"])
    elif "add_tags" in b:
        set_tags(c, tid, my_tags(c, tid) + list(b["add_tags"]))
    if "fields" in b and set_field_values(c, tid, lid, b["fields"]):
        c.execute("UPDATE tasks SET updated_at=? WHERE id=?", (iso(now_utc()), tid))
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
    need_task(c, tid)
    t = c.execute("SELECT * FROM tasks WHERE id=?", (tid,)).fetchone()
    b = body()
    # the same recurring task ticked on two devices (one offline): only the first tick advances it
    if t["repeat"] and b.get("expect_due") and t["status"] == 0 and b["expect_due"] != t["due"]:
        return jsonify({**one_task(c, tid), "next_due": None, "skipped": True})
    st = int(b.get("status", 2))
    undo = {}
    nxt = do_complete(c, tid, st, undo)
    log_act(c, tid, "wont" if st == -1 else "reopen" if st == 0 else "complete", {"next": nxt} if nxt else None)
    if st == 2:
        task_event(c, tid, "complete")
    if st != 0:
        unblock_events(c, completed_ids(c, tid))
    bump(c)
    c.commit()
    return jsonify({**one_task(c, tid), "next_due": nxt, "undo": signed(tid, undo)})


def do_complete(c, tid, status=2, undo=None):
    """undo (dict, filled in): what POST /api/tasks/<id>/undo needs to take this completion back."""
    t = c.execute("SELECT * FROM tasks WHERE id=?", (tid,)).fetchone()
    ts = iso(now_utc())
    who = me() if status != 0 else None
    cnt = rr_count(t["repeat"])
    nxt = next_due(t) if status == 2 and (cnt is None or cnt > 1) else None
    if undo is not None:
        undo.update(op="complete", at=ts, status=t["status"], repeat=t["repeat"], due=t["due"], start=t["start"],
                    reminded=t["reminded"], copy_id=None, kids=[])
    if status == 2 and t["repeat"] and not nxt:  # last repeat (COUNT used up / past UNTIL): done for good
        c.execute("UPDATE tasks SET repeat='' WHERE id=?", (tid,))
    if nxt:
        # keep a completed copy in the history, move the original forward
        cols = [k for k in t.keys() if k not in ("id", "tt_id")]
        vals = {k: t[k] for k in cols}
        vals.update(status=2, repeat="", completed_at=ts, updated_at=ts, reminded="[]", completed_by=who)
        cur = c.execute(f"INSERT INTO tasks({','.join(cols)}) VALUES({','.join('?' * len(cols))})",
                        [vals[k] for k in cols])
        for r in c.execute("SELECT user_id, tag FROM task_tags WHERE task_id=?", (tid,)).fetchall():
            c.execute("INSERT INTO task_tags(task_id,user_id,tag) VALUES(?,?,?)", (cur.lastrowid, r["user_id"], r["tag"]))
        c.execute("INSERT INTO task_field_values(task_id,field_id,value) SELECT ?, field_id, value FROM task_field_values WHERE task_id=?",
                  (cur.lastrowid, tid))
        start = t["start"]
        if start:  # timeline range moves along with the due date
            start = (date.fromisoformat(start) + (date.fromisoformat(nxt) - date.fromisoformat(t["due"]))).isoformat()
        c.execute("UPDATE tasks SET due=?, start=?, reminded='[]', updated_at=? WHERE id=?", (nxt, start, ts, tid))
        if cnt:
            c.execute("UPDATE tasks SET repeat=? WHERE id=?", (rr_with_count(t["repeat"], cnt - 1), tid))
        for d in descendants(c, tid):
            k = c.execute("SELECT status, completed_at, completed_by FROM tasks WHERE id=?", (d,)).fetchone()
            if undo is not None and k["status"] != 0:
                undo["kids"].append([d, k["status"], k["completed_at"], k["completed_by"]])
            c.execute("UPDATE tasks SET status=0, completed_at=NULL, completed_by=NULL WHERE id=?", (d,))
        if undo is not None:
            undo.update(copy_id=cur.lastrowid, next=nxt)
    else:
        c.execute("UPDATE tasks SET status=?, completed_at=?, completed_by=?, updated_at=? WHERE id=?",
                  (status, ts, who, ts, tid))
        if status != 0:  # completing a parent completes its open subtasks (all levels)
            for d in descendants(c, tid):
                c.execute("UPDATE tasks SET status=?, completed_at=?, completed_by=?, updated_at=? WHERE id=? AND status=0",
                          (status, ts, who, ts, d))
    return nxt


def undo_sig(tid, u):
    """HMAC over an undo payload (task, user, content): the client hands it back unchanged or not at all."""
    key = UNDO_KEY.get("k") or UNDO_KEY.setdefault("k", gsetting(db(), "undo_key"))
    msg = json.dumps({"tid": tid, "uid": me(), **{k: v for k, v in u.items() if k != "sig"}}, sort_keys=True, default=str)
    return hmac.new(key.encode(), msg.encode(), hashlib.sha256).hexdigest()


def signed(tid, u):
    return {**u, "sig": undo_sig(tid, u)} if u else u


UNDO_KEY = {}


def undo_status(c, tid, u):
    """Takes back a completion (op complete: the dict do_complete filled) or a reopen (op reopen: the
    status / completed_at / completed_by the task had). The caller checked write access. Returns an
    error text or None. Only acts while the task is still in the state the action left it in."""
    t = c.execute("SELECT * FROM tasks WHERE id=?", (tid,)).fetchone()
    if not t or not isinstance(u, dict) or not hmac.compare_digest(str(u.get("sig") or ""), undo_sig(tid, u)):
        return tr("unknown")
    ts = iso(now_utc())
    people = list_people(c, t["list_id"])

    def who(v):  # a completer from the client: only someone of this list, else me
        try:
            return int(v) if int(v) in people else me()
        except (TypeError, ValueError):
            return me()

    def when(v):
        try:
            parse_iso(str(v))
            return str(v)
        except ValueError:
            return ts
    if u.get("op") == "reopen":
        st = int(u.get("status") or 0)
        if t["status"] != 0 or st not in (2, -1):
            return tr("Changed in the meantime, nothing to undo")
        c.execute("UPDATE tasks SET status=?, completed_at=?, completed_by=?, updated_at=? WHERE id=?",
                  (st, when(u.get("completed_at")), who(u.get("completed_by")), ts, tid))
        log_act(c, tid, "wont" if st == -1 else "complete")
        return None
    if u.get("op") != "complete" or not u.get("at"):
        return tr("unknown")
    at = str(u["at"])
    cp = u.get("copy_id")
    if cp:  # recurring: drop the completed copy, move the task back to the occurrence it was on
        row = c.execute("SELECT * FROM tasks WHERE id=?", (int(cp),)).fetchone()
        if t["status"] != 0 or t["due"] != u.get("next") or not row or row["list_id"] != t["list_id"] or row["completed_at"] != at or row["status"] == 0 \
                or row["created_at"] != t["created_at"] or row["title"] != t["title"] or row["repeat"] \
                or row["id"] < tid or row["parent_id"] != t["parent_id"]:
            return tr("Changed in the meantime, nothing to undo")
        files = attachment_files(c, [row["id"]])
        c.execute("DELETE FROM tasks WHERE id=?", (row["id"],))
        unlink_files(files)
        try:
            due = date.fromisoformat(str(u.get("due"))).isoformat()
            start = date.fromisoformat(str(u["start"])).isoformat() if u.get("start") else None
            rem = json.dumps([str(x) for x in json.loads(u.get("reminded") or "[]")][-20:])
        except (ValueError, TypeError):
            return tr("unknown")
        c.execute("UPDATE tasks SET due=?, start=?, repeat=?, reminded=?, updated_at=? WHERE id=?",
                  (due, start, str(u.get("repeat") or "")[:500], rem, ts, tid))
        for k in u.get("kids") or []:
            try:
                d, st, cat, cby = int(k[0]), int(k[1]), when(k[2]), who(k[3])
            except (TypeError, ValueError, IndexError):
                continue
            if st not in (2, -1):
                continue
            c.execute("UPDATE tasks SET status=?, completed_at=?, completed_by=? WHERE id=? AND parent_id IS NOT NULL AND status=0 AND list_id=?",
                      (st, cat, cby, d, t["list_id"]))
    else:
        if t["status"] == 0 or t["completed_at"] != at:
            return tr("Changed in the meantime, nothing to undo")
        c.execute("UPDATE tasks SET status=0, completed_at=NULL, completed_by=NULL, updated_at=? WHERE id=?", (ts, tid))
        if u.get("repeat") and not t["repeat"]:  # the last occurrence had ended the repetition
            c.execute("UPDATE tasks SET repeat=? WHERE id=?", (str(u["repeat"])[:500], tid))
        for d in descendants(c, tid):  # subtasks completed together with it
            c.execute("UPDATE tasks SET status=0, completed_at=NULL, completed_by=NULL, updated_at=? WHERE id=? AND completed_at=?",
                      (ts, d, at))
    # the "completed" News items this completion created for others
    c.execute("DELETE FROM notifications WHERE task_id=? AND kind='complete' AND actor_id=? AND created_at>=?",
              (tid, me(), at))
    fam = [tid, *descendants(c, tid)]  # ... and the "unblock" items / lines it caused (the tasks wait again)
    q = ",".join("?" * len(fam))
    c.execute(f"DELETE FROM notifications WHERE kind='unblock' AND actor_id=? AND created_at>=? AND json_extract(data,'$.blocker') IN ({q})",
              (me(), at, *fam))
    c.execute(f"DELETE FROM activity WHERE kind='unblocked' AND user_id=? AND created_at>=? AND json_extract(data,'$.id') IN ({q})",
              (me(), at, *fam))
    log_act(c, tid, "reopen")
    return None


@app.post("/api/tasks/<int:tid>/undo")
def task_undo(tid):
    """Undo toast: takes back the completion / reopen described by the body (see undo_status)."""
    c = db()
    need_task(c, tid)
    e = undo_status(c, tid, body())
    if e:
        c.rollback()
        return err(e, 409)
    bump(c)
    c.commit()
    return jsonify(one_task(c, tid))


@app.post("/api/tasks/<int:tid>/skip")
def task_skip(tid):
    """'Skip this occurrence': move a recurring task to its next date without a done copy."""
    c = db()
    need_task(c, tid)
    t = c.execute("SELECT * FROM tasks WHERE id=?", (tid,)).fetchone()
    if not t["repeat"] or not t["due"]:
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
    log_act(c, tid, "skip", {"next": nxt})
    bump(c)
    c.commit()
    return jsonify({**one_task(c, tid), "next_due": nxt})


@app.post("/api/tasks/<int:tid>/reopen")
def task_reopen(tid):
    c = db()
    need_task(c, tid)
    old = c.execute("SELECT status, completed_at, completed_by FROM tasks WHERE id=?", (tid,)).fetchone()
    if old["status"] != 0:
        log_act(c, tid, "reopen")
    c.execute("UPDATE tasks SET status=0, completed_at=NULL, completed_by=NULL, updated_at=? WHERE id=?", (iso(now_utc()), tid))
    bump(c)
    c.commit()
    undo = {"op": "reopen", "status": old["status"], "completed_at": old["completed_at"], "completed_by": old["completed_by"]}
    return jsonify({**one_task(c, tid), "undo": signed(tid, undo) if old["status"] != 0 else None})


@app.delete("/api/tasks/<int:tid>")
def task_delete(tid):
    c = db()
    need_task(c, tid)
    files = []
    if request.args.get("hard") == "1":
        files = attachment_files(c, [tid])
        c.execute("DELETE FROM tasks WHERE id=?", (tid,))
    else:
        do_delete(c, tid)
        log_act(c, tid, "delete")
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
    need_task(c, tid)
    restore_task(c, tid)
    bump(c)
    c.commit()
    return jsonify(ok=True)


def restore_task(c, tid):
    r = c.execute("SELECT deleted_at FROM tasks WHERE id=?", (tid,)).fetchone()
    if r:
        c.execute("UPDATE tasks SET deleted_at=NULL WHERE id=?", (tid,))
        for d in descendants(c, tid):  # children deleted together with it come back too
            c.execute("UPDATE tasks SET deleted_at=NULL WHERE id=? AND deleted_at=?", (d, r["deleted_at"]))
        # restoring a subtask whose parent is gone makes it top-level
        c.execute("""UPDATE tasks SET parent_id=NULL WHERE id=? AND parent_id IN
                     (SELECT id FROM tasks WHERE deleted_at IS NOT NULL)""", (tid,))
        if r["deleted_at"]:
            log_act(c, tid, "restore")


@app.post("/api/tasks/purge-done")
def purge_done():
    """Settings > 'Delete all completed': every done / won't-do task in MY lists -> trash
    (shared lists of other owners are left alone)."""
    c = db()
    n = c.execute("""UPDATE tasks SET deleted_at=? WHERE status!=0 AND deleted_at IS NULL
                     AND list_id IN (SELECT id FROM lists WHERE owner_id=?)""", (iso(now_utc()), me())).rowcount
    bump(c)
    c.commit()
    return jsonify(count=n)


@app.delete("/api/trash")
def trash_empty():
    """Hard-deletes the trash the user sees: deleted tasks in lists they may change."""
    c = db()
    ids = [r[0] for r in c.execute(f"SELECT id FROM tasks WHERE deleted_at IS NOT NULL AND list_id IN {wr_sql()}",
                                   (me(), me()))]
    files = attachment_files(c, ids)
    for i in ids:
        c.execute("DELETE FROM tasks WHERE id=?", (i,))
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
    need_task(c, tid)
    files = request.files.getlist("file")
    if not files:
        return err(tr("File missing"))
    saved = []
    e = save_attachments(c, tid, files, saved=saved)
    if e:
        c.rollback()
        unlink_files(saved)
        return err(e)
    log_act(c, tid, "attach", {"names": [safe_name(f.filename) for f in files][:20], "n": len(files)})
    bump(c)
    c.commit()
    return jsonify(one_task(c, tid))


def save_attachments(c, tid, files, comment_id=None, saved=None):
    """Store uploaded werkzeug files for a task (or one of its comments). Returns an error message or
    None (caller commits; on an error the caller rolls back and unlinks `saved`)."""
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
        if saved is not None:
            saved.append(rel)
        mime = (f.mimetype if f.mimetype and f.mimetype != "application/octet-stream" else None) \
            or mimetypes.guess_type(name)[0] or "application/octet-stream"
        c.execute("INSERT INTO attachments(task_id,name,mime,size,path,created_at,comment_id) VALUES(?,?,?,?,?,?,?)",
                  (tid, name, mime, size, rel, ts, comment_id))
    if comment_id is None:
        c.execute("UPDATE tasks SET updated_at=? WHERE id=?", (ts, tid))
    return None


def need_attachment(c, aid, write):
    """Task files: read = sees the task, write = may change it. Comment files: read = sees the task
    (and the comment is not deleted), write = the comment's author (or the list owner, moderation)."""
    a = c.execute("SELECT * FROM attachments WHERE id=?", (aid,)).fetchone()
    if not a:
        raise Denied(404)
    if a["comment_id"] is None:
        need_task(c, a["task_id"], write)
        return a
    role = need_task(c, a["task_id"], write=False)
    cm = c.execute("SELECT user_id, deleted_at FROM comments WHERE id=?", (a["comment_id"],)).fetchone()
    if not cm or cm["deleted_at"]:
        raise Denied(404)
    if write and cm["user_id"] != me() and role != "owner":
        raise Denied(403)
    return a


@app.get("/api/attachments/<int:aid>")
def attachment_get(aid):
    a = need_attachment(db(), aid, False)
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
    need_task(c, tid)
    doc_id = int(body().get("doc_id") or 0)
    if not c.execute("SELECT 1 FROM paperless_links WHERE task_id=? AND doc_id=?", (tid, doc_id)).fetchone():
        d = pl_doc(doc_id)
        c.execute("""INSERT INTO paperless_links(task_id,doc_id,title,correspondent,created,status,added_at)
                     VALUES(?,?,?,?,?,'ok',?)""", (tid, d["doc_id"], d["title"], d["correspondent"], d["created"],
                                                  iso(now_utc())))
        log_act(c, tid, "paperless", {"title": d["title"]})
        bump(c)
        c.commit()
    return jsonify(one_task(c, tid))


@app.delete("/api/paperless-links/<int:lid>")
def paperless_unlink(lid):
    c = db()
    r = c.execute("SELECT task_id, title FROM paperless_links WHERE id=?", (lid,)).fetchone()
    if not r:
        return err(tr("unknown"), 404)
    need_task(c, r["task_id"])
    c.execute("DELETE FROM paperless_links WHERE id=?", (lid,))
    log_act(c, r["task_id"], "paperless_rm", {"title": r["title"]})
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
    a = need_attachment(c, aid, True)
    if a["comment_id"] is not None:
        return err(tr("Files in comments cannot be sent to Paperless"))
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
    log_act(c, a["task_id"], "paperless_send", {"name": a["name"]})
    bump(c)
    c.commit()
    return jsonify(one_task(c, a["task_id"]))


def task_owner(c, tid):
    """Owner of the list a task is in (settings for server-side work on the task)."""
    r = c.execute("SELECT l.owner_id FROM tasks t JOIN lists l ON l.id=t.list_id WHERE t.id=?", (tid,)).fetchone()
    return r[0] if r else default_uid(c)


def paperless_poll(c):
    """Watchdog: resolve pending uploads (success -> link doc + drop the local attachment)."""
    rows = c.execute("SELECT * FROM paperless_links WHERE status='pending'").fetchall()
    for p in rows:
        try:
            j = pl_req("/api/tasks/?task_id=" + urllib.parse.quote(p["ptask"] or ""))
        except PaperlessError as e:
            print("paperless poll:", e, flush=True)
            return
        owner = task_owner(c, p["task_id"])
        lst = j if isinstance(j, list) else j.get("results", [])
        t = next((x for x in lst if x.get("task_id") == p["ptask"]), None)
        age = (now_utc() - parse_iso(p["added_at"])).total_seconds()
        if not t:
            if age > 1800:
                c.execute("UPDATE paperless_links SET status='error', message=? WHERE id=?",
                          (tr("Paperless did not confirm the upload", lg=lang(c, owner)), p["id"]))
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
                          ((res_txt or tr("Paperless could not consume the document", lg=lang(c, owner)))[:300], p["id"]))
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
        keep = usettings(c, owner).get("paperless_keep") == "1"
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
    a = need_attachment(c, aid, True)
    c.execute("DELETE FROM attachments WHERE id=?", (aid,))
    if a["comment_id"] is None:
        log_act(c, a["task_id"], "attach_rm", {"name": a["name"]})
    else:
        c.execute("UPDATE comments SET edited_at=? WHERE id=?", (iso(now_utc()), a["comment_id"]))
    bump(c)
    c.commit()
    unlink_files([a["path"]])
    return jsonify(one_task(c, a["task_id"]) if a["comment_id"] is None else {"ok": True})


@app.post("/api/tasks/reorder")
def task_reorder():
    """[{id, sort, section_id?, list_id?, priority?, due?}] — one call per drag. All items are checked
    first (write on the task, and on the target list for moves); nothing changes if one is forbidden."""
    c = db()
    ts = iso(now_utc())
    items = []
    for it in body().get("items", []):
        if not isinstance(it, dict) or not it.get("id"):
            continue
        r = c.execute("SELECT list_id FROM tasks WHERE id=?", (int(it["id"]),)).fetchone()
        if not r or not list_role(c, r[0]):
            continue  # unknown (e.g. deleted elsewhere, or not visible): nothing to do
        need_list(c, r[0])
        if it.get("list_id"):
            need_list(c, int(it["list_id"]))
        items.append(it)
    for it in items:
        f = clean_task({k: v for k, v in it.items()
                        if k in ("sort", "section_id", "list_id", "priority", "due", "start", "due_time")})
        if "list_id" in f and not f["list_id"]:
            del f["list_id"]
        if f:
            cur = c.execute("SELECT list_id, assignee_id FROM tasks WHERE id=?", (it["id"],)).fetchone()
            lid = f.get("list_id", cur["list_id"])
            if f.get("section_id") and not c.execute("SELECT 1 FROM sections WHERE id=? AND list_id=?",
                                                     (f["section_id"], lid)).fetchone():
                f["section_id"] = None
            if lid != cur["list_id"] and cur["assignee_id"] and cur["assignee_id"] not in list_people(c, lid):
                f["assignee_id"] = None
            f["updated_at"] = ts
            before = c.execute("SELECT * FROM tasks WHERE id=?", (it["id"],)).fetchone()
            c.execute(f"UPDATE tasks SET {','.join(k + '=?' for k in f)} WHERE id=?", [*f.values(), it["id"]])
            log_changes(c, it["id"], before)
            if "list_id" in f:
                for d in descendants(c, it["id"]):
                    c.execute("UPDATE tasks SET list_id=? WHERE id=?", (f["list_id"], d))
    bump(c)
    c.commit()
    return jsonify(ok=True)


@app.post("/api/tasks/batch")
def task_batch():
    """{ids: [...], action: patch|complete|reopen|delete, data: {...}} — multi-select.
    Tasks the user may not change are skipped and reported in errors."""
    b = body()
    c = db()
    ids = [int(i) for i in b.get("ids", [])]
    action, data = b.get("action"), b.get("data") or {}
    ts = iso(now_utc())
    errors, done, undo, finished = [], 0, {}, []
    per = data.get("items") if isinstance(data.get("items"), dict) else {}  # patch_each / undo: per task id
    for tid in ids:
        deleted = c.execute("SELECT deleted_at FROM tasks WHERE id=?", (tid,)).fetchone()
        if not deleted or (deleted[0] and action != "restore") or (not deleted[0] and action == "restore"):
            continue
        try:
            need_task(c, tid)
            if action == "patch":
                e = apply_update(c, tid, data)
                if e:
                    errors.append(e)
                    continue
            elif action == "patch_each":  # undo of a batch edit: every task back to its own values
                if str(tid) not in per:
                    continue
                e = apply_update(c, tid, per[str(tid)])
                if e:
                    errors.append(e)
                    continue
            elif action == "complete":
                st = int(data.get("status", 2))
                u = {}
                if c.execute("SELECT status FROM tasks WHERE id=?", (tid,)).fetchone()[0] != 0:
                    continue  # already completed: nothing to do (and nothing to undo)
                nxt = do_complete(c, tid, st, u)
                undo[str(tid)] = signed(tid, u)
                log_act(c, tid, "wont" if st == -1 else "reopen" if st == 0 else "complete", {"next": nxt} if nxt else None)
                if st == 2:
                    task_event(c, tid, "complete")
                if st != 0:
                    finished += completed_ids(c, tid)
            elif action == "undo":
                e = undo_status(c, tid, per.get(str(tid)))
                if e:
                    errors.append(e)
                    continue
            elif action == "reopen":
                c.execute("UPDATE tasks SET status=0, completed_at=NULL, completed_by=NULL, updated_at=? WHERE id=?", (ts, tid))
                log_act(c, tid, "reopen")
            elif action == "delete":
                do_delete(c, tid)
                log_act(c, tid, "delete")
            elif action == "restore":
                restore_task(c, tid)
            done += 1
        except Denied as e:
            errors.append(tr("No permission (view only)") if e.code == 403 else tr("unknown"))
    unblock_events(c, finished)
    bump(c)
    c.commit()
    return jsonify(ok=True, count=done, errors=list(dict.fromkeys(errors)), undo=undo)


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
    for t in db().execute(f"""SELECT id, due, repeat FROM tasks WHERE status=0 AND deleted_at IS NULL
                              AND repeat!='' AND due IS NOT NULL AND due<=? AND list_id IN {vis_sql()}""",
                          (hi.isoformat(), me(), me())):
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


# ---------------------------------------------------------------- comments + activity timeline
# Everyone who sees a task may comment on it (view-only members too; they still cannot change the
# task). A private task's comments are a personal log. Authors edit / delete their own comments; the
# list owner may delete any comment in the list (moderation). Admins have no extra rights here.
# Deleted comments disappear (soft delete: body, mentions and files are wiped).
# Mentions are stored as <@user_id> tokens (+ comments.mentions); only people who see the task count.
MAX_COMMENT = 10000
MENTION_RE = re.compile(r"<@(\d+)>")


def user_names(c, ids):
    ids = [i for i in set(ids) if i]
    if not ids:
        return {}
    q = ",".join("?" * len(ids))
    return {r["id"]: r["display_name"] or r["username"]
            for r in c.execute(f"SELECT id, username, display_name FROM users WHERE id IN ({q})", ids)}


def task_people(c, lid):
    """Enabled users who can see the tasks of a list (owner + members): the mention picker."""
    ids = list_people(c, lid)
    q = ",".join("?" * len(ids)) or "NULL"
    return [{"id": r["id"], "name": r["display_name"] or r["username"]}
            for r in c.execute(f"SELECT id, username, display_name FROM users WHERE id IN ({q}) AND disabled=0 ORDER BY id",
                               list(ids))]


def clean_mentions(c, lid, text):
    """Keeps <@id> tokens of people who see the list; any other token becomes plain '@name'."""
    allowed = {p["id"] for p in task_people(c, lid)}
    names = user_names(c, [int(x) for x in MENTION_RE.findall(text)])
    found = []

    def sub(m):
        uid = int(m.group(1))
        if uid in allowed:
            found.append(uid)
            return m.group(0)
        return "@" + names.get(uid, "?")
    text = MENTION_RE.sub(sub, text)
    return text, list(dict.fromkeys(found))


def comment_plain(c, text, names=None):
    """Comment text for a push: tokens -> @name, whitespace collapsed."""
    names = names or user_names(c, [int(x) for x in MENTION_RE.findall(text)])
    return re.sub(r"\s+", " ", MENTION_RE.sub(lambda m: "@" + names.get(int(m.group(1)), "?"), text)).strip()


def att_dicts(c, where, args):
    out = {}
    for a in c.execute(f"SELECT id, comment_id, name, mime, size, created_at FROM attachments WHERE {where} ORDER BY id", args):
        out.setdefault(a["comment_id"], []).append({k: a[k] for k in ("id", "name", "mime", "size", "created_at")})
    return out


def comment_dict(r, atts):
    return {"id": r["id"], "user_id": r["user_id"], "body": r["body"], "created_at": r["created_at"],
            "edited_at": r["edited_at"], "mentions": [int(x) for x in (r["mentions"] or "").split(",") if x],
            "attachments": atts.get(r["id"], [])}


def need_live_comment(c, cid):
    """(comment row, my role in its list): 404 if the comment is gone or its task is not visible."""
    r = c.execute("SELECT * FROM comments WHERE id=? AND deleted_at IS NULL", (cid,)).fetchone()
    if not r:
        raise Denied(404)
    return r, need_task(c, r["task_id"], write=False)


@app.get("/api/tasks/<int:tid>/timeline")
def timeline(tid):
    """Comments + activity of a task (loaded when the detail panel opens) and the mention picker."""
    c = db()
    role = need_task(c, tid, write=False)
    t = c.execute("SELECT list_id FROM tasks WHERE id=?", (tid,)).fetchone()
    rows = c.execute("SELECT * FROM comments WHERE task_id=? AND deleted_at IS NULL ORDER BY id", (tid,)).fetchall()
    atts = att_dicts(c, "task_id=? AND comment_id IS NOT NULL", (tid,))
    acts = [{"id": a["id"], "user_id": a["user_id"], "kind": a["kind"], "data": json.loads(a["data"] or "{}"),
             "created_at": a["created_at"]}
            for a in c.execute("SELECT * FROM activity WHERE task_id=? ORDER BY id", (tid,))]
    vis = None
    for a in acts:
        if a["kind"] in DEP_ACTS and a["data"].get("id"):
            vis = vis if vis is not None else vis_ids(c, me())
            o = c.execute("SELECT list_id FROM tasks WHERE id=?", (a["data"]["id"],)).fetchone()
            if not o or o["list_id"] not in vis:
                a["data"] = {"hidden": True}
    comments = [comment_dict(r, atts) for r in rows]
    ids = {x["user_id"] for x in comments + acts} | {m for x in comments for m in x["mentions"]} \
        | {a["data"].get("to") for a in acts if a["kind"] == "assign"}
    seen = c.execute("SELECT seen_id FROM task_seen WHERE user_id=? AND task_id=?", (me(), tid)).fetchone()
    return jsonify(comments=comments, activity=acts, users={str(k): v for k, v in user_names(c, ids).items()},
                   people=task_people(c, t["list_id"]), seen=seen[0] if seen else 0, moderator=role == "owner")


@app.post("/api/tasks/<int:tid>/seen")
def timeline_seen(tid):
    """Marks every comment of the task as seen by me (no version bump: only my unread dot changes)."""
    c = db()
    need_task(c, tid, write=False)
    top = c.execute("SELECT COALESCE(MAX(id),0) FROM comments WHERE task_id=?", (tid,)).fetchone()[0]
    c.execute("INSERT INTO task_seen(user_id,task_id,seen_id) VALUES(?,?,?) "
              "ON CONFLICT(user_id,task_id) DO UPDATE SET seen_id=MAX(seen_id, excluded.seen_id)", (me(), tid, top))
    c.execute("UPDATE notifications SET read_at=? WHERE user_id=? AND task_id=? AND read_at IS NULL", (iso(now_utc()), me(), tid))
    c.commit()
    return jsonify(ok=True, seen=top)


def comment_input():
    """(text, files) from a JSON body or a multipart form (comment with files)."""
    if request.files or request.form:
        return (request.form.get("body") or "").strip(), [f for f in request.files.getlist("file") if f and f.filename]
    return (body().get("body") or "").strip(), []


@app.post("/api/tasks/<int:tid>/comments")
def comment_create(tid):
    c = db()
    need_task(c, tid, write=False)  # view-only members may comment
    t = c.execute("SELECT * FROM tasks WHERE id=?", (tid,)).fetchone()
    if t["deleted_at"]:
        return err(tr("The task is in the trash"), 409)
    text, files = comment_input()
    if len(text) > MAX_COMMENT:
        return err(tr("The comment is too long (max. {0} characters)", MAX_COMMENT))
    if not text and not files:
        return err(tr("The comment is empty"))
    text, mentions = clean_mentions(c, t["list_id"], text)
    cid = c.execute("INSERT INTO comments(task_id,user_id,body,mentions,created_at) VALUES(?,?,?,?,?)",
                    (tid, me(), text, ",".join(map(str, mentions)), iso_ms(now_utc()))).lastrowid
    saved = []
    e = save_attachments(c, tid, files, comment_id=cid, saved=saved) if files else None
    if e:
        c.rollback()
        unlink_files(saved)
        return err(e)
    c.execute("INSERT INTO task_seen(user_id,task_id,seen_id) VALUES(?,?,?) "
              "ON CONFLICT(user_id,task_id) DO UPDATE SET seen_id=MAX(seen_id, excluded.seen_id)", (me(), tid, cid))
    pushes = comment_pushes(c, t, cid, text, mentions, mentions, len(files))
    bump(c)
    c.commit()
    send_pushes(pushes)
    r = c.execute("SELECT * FROM comments WHERE id=?", (cid,)).fetchone()
    return jsonify(comment_dict(r, att_dicts(c, "comment_id=?", (cid,))))


@app.patch("/api/comments/<int:cid>")
def comment_update(cid):
    """Only the author edits a comment; people mentioned for the first time are notified."""
    c = db()
    r, _ = need_live_comment(c, cid)
    if r["user_id"] != me():
        return err(tr("Only the author can edit this comment"), 403)
    t = c.execute("SELECT * FROM tasks WHERE id=?", (r["task_id"],)).fetchone()
    text = (body().get("body") or "").strip()
    if len(text) > MAX_COMMENT:
        return err(tr("The comment is too long (max. {0} characters)", MAX_COMMENT))
    nfiles = c.execute("SELECT COUNT(*) FROM attachments WHERE comment_id=?", (cid,)).fetchone()[0]
    if not text and not nfiles:
        return err(tr("The comment is empty"))
    text, mentions = clean_mentions(c, t["list_id"], text)
    old = {int(x) for x in (r["mentions"] or "").split(",") if x}
    c.execute("UPDATE comments SET body=?, mentions=?, edited_at=? WHERE id=?",
              (text, ",".join(map(str, mentions)), iso(now_utc()), cid))
    new_m = [m for m in mentions if m not in old]
    pushes = comment_pushes(c, t, cid, text, mentions, new_m, 0, only=new_m) if new_m and not t["deleted_at"] else []
    bump(c)
    c.commit()
    send_pushes(pushes)
    return jsonify(comment_dict(c.execute("SELECT * FROM comments WHERE id=?", (cid,)).fetchone(),
                                att_dicts(c, "comment_id=?", (cid,))))


@app.delete("/api/comments/<int:cid>")
def comment_delete(cid):
    """Author, or the owner of the list (moderation). The comment disappears with its files."""
    c = db()
    r, role = need_live_comment(c, cid)
    if r["user_id"] != me() and role != "owner":
        return err(tr("Only the author or the list owner can delete this comment"), 403)
    files = [a[0] for a in c.execute("SELECT path FROM attachments WHERE comment_id=?", (cid,))]
    c.execute("DELETE FROM attachments WHERE comment_id=?", (cid,))
    c.execute("UPDATE comments SET body='', mentions='', deleted_at=? WHERE id=?", (iso(now_utc()), cid))
    bump(c)
    c.commit()
    unlink_files(files)
    return jsonify(ok=True)


# ---- collaboration pushes (module "collab" of the recipient must be on; never to the person who acted;
# only users who still see the task; each via their own ntfy topic, in their own language; click opens it)
#  - comment: assignee, creator, everyone who commented before + mentioned people (even non-participants)
#  - assign / unassign: the new assignee / the previous one when someone else (re)assigns the task
#  - complete: creator + whoever assigned it, when someone else completes a task in a shared list
# Burst rule, shared by all of them (per recipient and task): the first push goes out right away; anything
# else on that task in the next TASK_PUSH_GAP seconds is only counted, and once that minute is over the
# watchdog sends ONE summary ("2 more comments · 1 more change", "you were mentioned").
TASK_PUSH_GAP = int(os.environ.get("TASKS_PUSH_GAP", "60"))  # seconds


def collab_on(s):
    return "collab" in (s.get("features") or "").split(",")


def collab_user(c, uid, lid=None):
    """Settings of a user who takes part in collaboration notifications (News feed and pushes) about
    list lid -- enabled, module "collab" on, still sees the list (lid None: no list check) -- else None.
    The feed entry is written for every such user; the push additionally needs an ntfy topic + burst gate."""
    u = c.execute("SELECT disabled FROM users WHERE id=?", (uid,)).fetchone()
    if not u or u["disabled"] or (lid is not None and not list_role(c, lid, uid)):
        return None
    s = usettings(c, uid)
    return s if collab_on(s) else None


def burst_gate(c, uid, tid, mentioned=False, event=False):
    """True = push now (time remembered); False = counted for the watchdog's summary."""
    now = time.time()
    st = c.execute("SELECT sent_at FROM task_push WHERE user_id=? AND task_id=?", (uid, tid)).fetchone()
    if st and now - st["sent_at"] < TASK_PUSH_GAP:
        c.execute("""UPDATE task_push SET pending=pending+?, events=events+?, mentioned=MAX(mentioned,?)
                     WHERE user_id=? AND task_id=?""", (0 if event else 1, 1 if event else 0, 1 if mentioned else 0, uid, tid))
        return False
    c.execute("INSERT INTO task_push(user_id,task_id,sent_at) VALUES(?,?,?) ON CONFLICT(user_id,task_id) "
              "DO UPDATE SET sent_at=excluded.sent_at, pending=0, events=0, mentioned=0", (uid, tid, now))
    return True


def lang_of(s):
    return s.get("lang") if s.get("lang") in LANGS else "en"


def comment_pushes(c, t, cid, text, mentions, notify_mentions, nfiles, only=None):
    """Decides who gets a push for this comment (burst state updated in c, caller commits).
    Returns [(topic, title, message, click)] to send after the commit."""
    author = me()
    ids = {t["assignee_id"], t["created_by"]} | set(notify_mentions)
    ids |= {r[0] for r in c.execute("SELECT DISTINCT user_id FROM comments WHERE task_id=? AND deleted_at IS NULL", (t["id"],))}
    if only is not None:
        ids = set(only)
    ids.discard(None)
    ids.discard(author)
    if not ids:
        return []
    names = user_names(c, [author] + [int(x) for x in MENTION_RE.findall(text)])
    snippet = comment_plain(c, text, names)
    snippet = snippet[:280] + ("…" if len(snippet) > 280 else "")
    out = []
    for uid in sorted(ids):
        s = collab_user(c, uid, t["list_id"])
        if not s:
            continue
        mentioned = uid in notify_mentions
        news_add(c, uid, "mention" if mentioned else "comment", task_id=t["id"], comment_id=cid, actor=author)
        if not s.get("ntfy_topic") or not burst_gate(c, uid, t["id"], mentioned=mentioned):
            continue
        lg = lang_of(s)
        what = snippet or trn("{0} file", "{0} files", nfiles, lg=lg)
        who = names.get(author, "?")
        msg = tr("{0} mentioned you: {1}", who, what, lg=lg) if mentioned else tr("{0} commented: {1}", who, what, lg=lg)
        out.append((s["ntfy_topic"], t["title"], msg, f"{PUBLIC_URL}/#t/{t['id']}"))
    return out


def push_day(due, due_time, lg):
    day = tr("today", lg=lg) if due == local_now().date().isoformat() else \
        date.fromisoformat(due).strftime("%d.%m." if lg == "de" else "%d %b")
    return day + (" " + due_time if due_time else "")


def task_event(c, tid, kind, prev_assignee=None):
    """assign / unassign / complete pushes; queued in g.pushes and sent once the request succeeded."""
    actor = me()
    t = c.execute("""SELECT t.*, l.name AS list_name, l.is_inbox AS list_inbox FROM tasks t JOIN lists l ON l.id=t.list_id
                     WHERE t.id=?""", (tid,)).fetchone()
    if not t or t["deleted_at"]:
        return
    if kind == "assign":
        rcpt = {t["assignee_id"]}
    elif kind == "unassign":
        rcpt = {prev_assignee}
    else:  # complete: only in shared lists (in a private list the creator is the one completing)
        if not c.execute("SELECT 1 FROM list_members WHERE list_id=?", (t["list_id"],)).fetchone():
            return
        rcpt = {t["created_by"], t["assigned_by"]}
    rcpt.discard(None)
    rcpt.discard(actor)
    who = user_names(c, [actor]).get(actor, "?")
    for uid in sorted(rcpt):
        s = collab_user(c, uid, t["list_id"])
        if not s:
            continue
        news_add(c, uid, kind, task_id=tid, actor=actor)
        if not s.get("ntfy_topic") or not burst_gate(c, uid, tid, event=True):
            continue
        lg = lang_of(s)
        lname = tr("Inbox", lg=lg) if t["list_inbox"] and t["list_name"] == "Eingang" else t["list_name"]
        if kind == "assign":
            title = tr("{0} assigned you: {1}", who, t["title"], lg=lg)
            msg = lname + (" · " + tr("due {0}", push_day(t["due"], t["due_time"], lg), lg=lg) if t["due"] else "")
        elif kind == "unassign":
            title, msg = tr("{0} unassigned you from: {1}", who, t["title"], lg=lg), lname
        else:
            title, msg = tr("{0} completed: {1}", who, t["title"], lg=lg), lname
        g.pushes.append((s["ntfy_topic"], title, msg, f"{PUBLIC_URL}/#t/{tid}"))


def assignment_events(c, tid, old_assignee, new_assignee):
    if old_assignee == new_assignee:
        return
    if new_assignee:
        task_event(c, tid, "assign")
    if old_assignee:
        task_event(c, tid, "unassign", prev_assignee=old_assignee)


def send_pushes(pushes):
    if pushes:
        threading.Thread(target=lambda: [ntfy(ti, m, "default", cl, topic=tp) for tp, ti, m, cl in pushes],
                         daemon=True).start()


@app.after_request
def send_queued_pushes(resp):
    p = g.pop("pushes", None) if has_request_context() else None
    if p and resp.status_code < 400:
        send_pushes(p)
    return resp


def task_push_tick(c, users, S, LG):
    """Watchdog: one summary push for everything collected during the burst window."""
    now = time.time()
    rows = c.execute("""SELECT p.*, t.title, t.list_id, t.deleted_at FROM task_push p JOIN tasks t ON t.id=p.task_id
                        WHERE (p.pending>0 OR p.events>0) AND p.sent_at<=?""", (now - TASK_PUSH_GAP,)).fetchall()
    for p in rows:
        c.execute("UPDATE task_push SET sent_at=?, pending=0, events=0, mentioned=0 WHERE user_id=? AND task_id=?",
                  (now, p["user_id"], p["task_id"]))
        c.commit()
        uid = p["user_id"]
        if uid not in users or p["deleted_at"] or not collab_on(S[uid]) or not list_role(c, p["list_id"], uid):
            continue
        lg = LG[uid]
        parts = ([trn("{0} more comment", "{0} more comments", p["pending"], lg=lg)] if p["pending"] else []) + \
            ([trn("{0} more change", "{0} more changes", p["events"], lg=lg)] if p["events"] else []) + \
            ([tr("you were mentioned", lg=lg)] if p["mentioned"] else [])
        ntfy(p["title"], " · ".join(parts), "default", f"{PUBLIC_URL}/#t/{p['task_id']}", topic=S[uid]["ntfy_topic"])
    c.execute("DELETE FROM task_push WHERE pending=0 AND events=0 AND sent_at<?", (now - 86400,))
    c.commit()


# ---------------------------------------------------------------- News feed ("Neuigkeiten")
# One row per event that concerns a user, written at the same points (and for the same recipients) as
# the collaboration pushes, plus list sharing (share / role / unshare; these have no push). Never my own
# actions; only users with module "collab" on get entries (collab off: nothing is written, the feed and
# its badge are hidden). The push burst rule does not apply: the feed keeps every item; consecutive
# plain comments on the same task are grouped into one row (with a count) when the feed is read.
# Visibility is re-checked at read time: items of tasks / lists I no longer see, tasks in the trash and
# deleted comments disappear. Retention: NEWS_KEEP_DAYS days and at most NEWS_KEEP_MAX items per user
# (watchdog, hourly).
NEWS_KEEP_DAYS = int(os.environ.get("TASKS_NEWS_DAYS", "90"))
NEWS_KEEP_MAX = int(os.environ.get("TASKS_NEWS_MAX", "500"))
NEWS_KINDS = ("mention", "comment", "assign", "unassign", "complete", "share", "role", "unshare", "unblock", "status")
NEWS_LIST_KINDS = ("share", "role", "unshare", "status")  # about a list, not a task
NEWS_EXCERPT = 300


def news_add(c, uid, kind, task_id=None, list_id=None, comment_id=None, data=None, actor=None):
    """Feed entry for uid (caller commits). Skipped for my own actions and for users without collab."""
    actor = actor or me()
    if not uid or uid == actor or not collab_user(c, uid, None):
        return
    c.execute("INSERT INTO notifications(user_id,kind,task_id,list_id,actor_id,comment_id,data,created_at) "
              "VALUES(?,?,?,?,?,?,?,?)", (uid, kind, task_id, list_id, actor, comment_id,
                                          json.dumps(data or {}, ensure_ascii=False), iso_ms(now_utc())))


def news_sig(c, uid):
    """Cheap change marker of my unread items (in /api/version): clients reload the state when it moves."""
    r = c.execute("SELECT COUNT(*), COALESCE(MAX(id),0) FROM notifications WHERE user_id=? AND read_at IS NULL",
                  (uid,)).fetchone()
    return f"{r[0]}.{r[1]}"


def news_items(c, uid, s=None, mentions_only=False):
    """My visible feed, newest first, consecutive comments on one task grouped. [] if collab is off."""
    if not collab_on(s or usettings(c, uid)):
        return [], {}
    rows = c.execute("""SELECT n.*, t.title AS t_title, t.list_id AS t_list, t.deleted_at AS t_del,
                               k.body AS c_body, k.deleted_at AS c_del
                        FROM notifications n LEFT JOIN tasks t ON t.id=n.task_id LEFT JOIN comments k ON k.id=n.comment_id
                        WHERE n.user_id=? ORDER BY n.id DESC LIMIT ?""", (uid, NEWS_KEEP_MAX)).fetchall()
    roles = {}

    def sees(lid):
        if lid not in roles:
            roles[lid] = bool(lid) and bool(list_role(c, lid, uid))
        return roles[lid]
    out, uids = [], set()
    for r in rows:
        kind = r["kind"]
        if mentions_only and kind != "mention":
            continue
        if kind in ("share", "role", "status"):
            if not sees(r["list_id"]):
                continue
        elif kind != "unshare":
            if r["t_title"] is None or r["t_del"] or not sees(r["t_list"]):
                continue
            if kind in ("mention", "comment") and (r["c_body"] is None or r["c_del"]):
                continue
        read = r["read_at"] is not None
        prev = out[-1] if out else None
        if kind == "comment" and prev and prev["kind"] == "comment" and prev["task_id"] == r["task_id"]:
            prev["ids"].append(r["id"])
            prev["count"] += 1
            prev["read"] = prev["read"] and read
            if r["actor_id"] not in prev["actors"]:
                prev["actors"].append(r["actor_id"])
            uids.add(r["actor_id"])
            continue
        body = ""
        if kind in ("mention", "comment"):
            body = r["c_body"] or ""
            if len(body) > NEWS_EXCERPT:
                body = re.sub(r"<@?\d*$", "", body[:NEWS_EXCERPT]).rstrip() + "…"
            uids.update(int(x) for x in MENTION_RE.findall(body))
        data = json.loads(r["data"] or "{}")
        if kind == "status":
            body = data.get("note") or ""
        if kind == "unblock":  # the blocker's title only if I (still) see it
            bl = c.execute("SELECT title, list_id FROM tasks WHERE id=?", (data.get("blocker"),)).fetchone()
            data = {"title": bl["title"], "hidden": False} if bl and sees(bl["list_id"]) else {"title": None, "hidden": True}
        uids.add(r["actor_id"])
        lk = kind in NEWS_LIST_KINDS
        out.append({"id": r["id"], "ids": [r["id"]], "kind": kind, "count": 1, "actor_id": r["actor_id"],
                    "actors": [r["actor_id"]], "task_id": r["task_id"] if not lk else None,
                    "task_title": r["t_title"] if not lk else None,
                    "list_id": r["t_list"] if r["task_id"] and not lk else r["list_id"],
                    "comment_id": r["comment_id"], "excerpt": body, "data": data, "created_at": r["created_at"],
                    "read": read})
    return out, user_names(c, uids)


def news_unread(c, uid, s=None):
    return sum(1 for x in news_items(c, uid, s)[0] if not x["read"])


@app.get("/api/news")
def news_list():
    """My feed (only my own rows). ?filter=mentions: mentions only."""
    c = db()
    uid = me()
    s = usettings(c, uid)
    items, names = news_items(c, uid, s, mentions_only=request.args.get("filter") == "mentions")
    return jsonify(items=items, users={str(k): v for k, v in names.items()}, unread=news_unread(c, uid, s),
                   sig=news_sig(c, uid), enabled=collab_on(s))


@app.post("/api/news/read")
def news_read():
    """{ids: [...]} or {all: true}: marks my items read (other users' ids are ignored). No version bump."""
    b = body()
    c = db()
    uid = me()
    ts = iso(now_utc())
    if b.get("all"):
        c.execute("UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL", (ts, uid))
    else:
        try:
            ids = [int(x) for x in (b.get("ids") or [])][:1000]
        except (TypeError, ValueError):
            return err(tr("Invalid data"))
        for i in range(0, len(ids), 500):
            part = ids[i:i + 500]
            c.execute(f"UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL AND id IN ({','.join('?' * len(part))})",
                      (ts, uid, *part))
    c.commit()
    return jsonify(ok=True, unread=news_unread(c, uid), sig=news_sig(c, uid))


NEWS_CLEAN = {"at": 0.0}


def news_cleanup(c, force=False):
    """Watchdog, at most hourly: drops items older than NEWS_KEEP_DAYS and all but the newest NEWS_KEEP_MAX per user."""
    if not force and time.time() - NEWS_CLEAN["at"] < 3600:
        return 0
    NEWS_CLEAN["at"] = time.time()
    n = c.execute("DELETE FROM notifications WHERE created_at<?",
                  (iso(now_utc() - timedelta(days=NEWS_KEEP_DAYS)),)).rowcount
    n += c.execute("""DELETE FROM notifications WHERE id IN (SELECT id FROM (SELECT id, ROW_NUMBER() OVER
                      (PARTITION BY user_id ORDER BY id DESC) AS rn FROM notifications) WHERE rn>?)""",
                   (NEWS_KEEP_MAX,)).rowcount
    c.commit()
    return n


# ---------------------------------------------------------------- habits (private per user)

HABIT_FIELDS = ("name", "color", "goal", "days", "remind_at", "sort", "archived", "per_week")


def need_habit(c, hid):
    if not c.execute("SELECT 1 FROM habits WHERE id=? AND user_id=?", (hid, me())).fetchone():
        raise Denied(404)


@app.post("/api/habits")
def habit_create():
    b = body()
    name = (b.get("name") or "").strip()
    if not name:
        return err(tr("Name missing"))
    c = db()
    srt = c.execute("SELECT COALESCE(MAX(sort),0)+1 FROM habits WHERE user_id=?", (me(),)).fetchone()[0]
    cur = c.execute("INSERT INTO habits(name,color,goal,days,remind_at,sort,per_week,created_at,user_id) VALUES(?,?,?,?,?,?,?,?,?)",
                    (name, b.get("color", ""), int(b.get("goal") or 1), b.get("days") or "1234567",
                     b.get("remind_at", ""), srt, int(b.get("per_week") or 0), iso(now_utc()), me()))
    bump(c)
    c.commit()
    return jsonify(id=cur.lastrowid)


@app.patch("/api/habits/<int:hid>")
def habit_update(hid):
    b = body()
    c = db()
    need_habit(c, hid)
    for k in HABIT_FIELDS:
        if k in b:
            c.execute(f"UPDATE habits SET {k}=? WHERE id=?", (b[k], hid))
    bump(c)
    c.commit()
    return jsonify(ok=True)


@app.delete("/api/habits/<int:hid>")
def habit_delete(hid):
    c = db()
    need_habit(c, hid)
    c.execute("DELETE FROM habits WHERE id=?", (hid,))
    bump(c)
    c.commit()
    return jsonify(ok=True)


@app.post("/api/habits/<int:hid>/log")
def habit_log(hid):
    b = body()
    day = b.get("day") or local_now().date().isoformat()
    c = db()
    need_habit(c, hid)
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


# ---------------------------------------------------------------- pomodoro (private per user)

def pomo_elapsed(p, ref=None):
    ref = ref or now_utc()
    end = parse_iso(p["end"]) if p["end"] else (parse_iso(p["paused_at"]) if p["paused_at"] else ref)
    return max(0, (end - parse_iso(p["start"])).total_seconds() - p["paused_s"])


def pomo_stats(c, days=1, uid=None):
    since = local_now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days - 1)
    rows = c.execute("SELECT * FROM pomos WHERE kind IN ('focus','stopwatch') AND end IS NOT NULL AND start>=? AND user_id=?",
                     (iso(since), uid or me())).fetchall()
    return dict(count=sum(1 for r in rows if r["done"] and r["kind"] == "focus"),
                minutes=round(sum(pomo_elapsed(r) for r in rows) / 60))


@app.post("/api/pomo/start")
def pomo_start():
    b = body()
    c = db()
    s = usettings(c, me())
    kind = b.get("kind", "focus")
    mins = 0 if kind == "stopwatch" else int(b.get("minutes") or s["pomo_" + ("focus" if kind == "focus" else "short")])
    ts = iso(now_utc())
    for p in c.execute("SELECT * FROM pomos WHERE end IS NULL AND user_id=?", (me(),)).fetchall():  # one at a time
        c.execute("UPDATE pomos SET end=? WHERE id=?", (ts, p["id"]))
        focus_to_entry(c, p["id"])
    task = b.get("task_id")
    try:
        if task:
            need_task(c, int(task), write=False)
    except (Denied, TypeError, ValueError):
        task = None
    c.execute("INSERT INTO pomos(task_id,kind,minutes,start,user_id) VALUES(?,?,?,?,?)",
              (task, kind, mins, ts, me()))
    bump(c)
    c.commit()
    return jsonify(running_pomo(c))


@app.post("/api/pomo/<int:pid>/<action>")
def pomo_action(pid, action):
    c = db()
    p = c.execute("SELECT * FROM pomos WHERE id=? AND user_id=?", (pid, me())).fetchone()
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
        focus_to_entry(c, pid)
    bump(c)
    c.commit()
    return jsonify(pomo=running_pomo(c), today=pomo_stats(c, 1))


@app.get("/api/pomo/stats")
def pomo_stats_api():
    c = db()
    since = local_now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=29)
    rows = c.execute(f"""SELECT p.*, t.title FROM pomos p
                         LEFT JOIN tasks t ON t.id=p.task_id AND t.list_id IN {vis_sql()}
                         WHERE p.user_id=? AND p.kind IN ('focus','stopwatch') AND p.end IS NOT NULL AND p.start>=?
                         ORDER BY p.start DESC""", (me(), me(), me(), iso(since))).fetchall()
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


# ---------------------------------------------------------------- time tracking (module "time")
# Time entries per user on a task (or on a whole list). Decisions:
# - Visibility: my own entries always; in a shared list every member sees everyone's entries on the list's
#   tasks (task totals, reports "all members"), read-only: only the author edits or deletes an entry. Entries
#   in lists I cannot see (someone else's private list) are never returned. Logging time needs read access
#   to the task (a view-only member can track own time). time_entries.list_id follows the task (trigger).
# - One running timer per user (unique index). Starting one stops the previous at the new start. Every
#   start / stop carries the device time ("at", clamped to [now - 7 days, now]) and the device's client_id,
#   so an offline start / stop replayed later lands at the right time; a replayed start that is older than
#   the timer running now becomes a finished entry that ends where that timer starts.
# - Focus: a finished focus / stopwatch session on a task becomes an entry (source focus, duration without
#   pauses, at least 1 min) unless it overlaps one of the user's timer entries: the timer wins, nothing is
#   counted twice. Only with the module on and the setting "Count focus sessions" on.
# - Days: an entry belongs to the local day (server time zone) on which it starts; entries crossing
#   midnight are not split. Durations are real elapsed time (UTC), so DST changes are exact. Periods are
#   local days, weeks start on Monday.
# - Rounding (per user, reports / CSV / timesheet only): every entry is rounded UP to N minutes, stored
#   durations stay exact. Amount = rounded hours x hourly rate of the list (set by the list owner).
TIME_BACK_DAYS = 7
TIME_MAX_S = 7 * 86400
TIME_SOURCES = ("timer", "manual", "focus")


class BadInput(Exception):
    pass


@app.errorhandler(BadInput)
def bad_input(e):
    return err(str(e), 400)


def parse_when(v):
    """ISO date-time from the client (Z / offset; naive = server time zone) -> aware UTC (whole seconds)."""
    if not v or not isinstance(v, str):
        return None
    try:
        dt = datetime.fromisoformat(v.strip().replace("Z", "+00:00"))
    except ValueError:
        raise BadInput(tr("Invalid date or time")) from None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=TZ)
    return dt.astimezone(timezone.utc).replace(microsecond=0)


def time_at(v, ref):
    """Device time of a timer start / stop, clamped to [ref - 7 days, ref]."""
    try:
        t = parse_when(v)
    except BadInput:
        t = None
    if not t or t > ref:
        return ref
    return max(t, ref - timedelta(days=TIME_BACK_DAYS))


def vis_ids(c, uid):
    return {r[0] for r in c.execute("SELECT id FROM lists WHERE owner_id=? UNION SELECT list_id FROM list_members WHERE user_id=?",
                                    (uid, uid))}


def rnd_up(sec, minutes):
    if minutes <= 0 or sec <= 0:
        return sec
    step = minutes * 60
    return -(-sec // step) * step


def time_rounding(s):
    try:
        return max(0, min(60, int(s.get("time_rounding") or 0)))
    except (TypeError, ValueError):
        return 0


def entry_secs(r, ref):
    return max(0, int((ref - parse_iso(r["start"])).total_seconds())) if r["end"] is None else r["seconds"]


def time_on(s):
    return "time" in (s.get("features") or "").split(",")


TIME_Q = """SELECT e.*, t.title AS t_title, u.display_name AS u_name, u.username AS u_login
            FROM time_entries e LEFT JOIN tasks t ON t.id=e.task_id LEFT JOIN users u ON u.id=e.user_id"""


def entry_out(r, uid, vis, ref, rm):
    sec, seen = entry_secs(r, ref), r["list_id"] in vis
    title = r["t_title"] if seen and r["t_title"] is not None else r["task_title"]
    return {"id": r["id"], "user_id": r["user_id"], "user_name": r["u_name"] or r["u_login"] or "",
            "task_id": r["task_id"] if seen else None, "list_id": r["list_id"] if seen else None,
            "title": title or "", "start": r["start"], "end": r["end"], "seconds": sec, "rounded": rnd_up(sec, rm),
            "note": r["note"], "source": r["source"], "running": r["end"] is None, "mine": r["user_id"] == uid,
            "auto_stopped": bool(r["auto_stopped"]), "client_id": r["client_id"] if r["user_id"] == uid else None}


def one_entry(c, eid):
    uid = me()
    r = c.execute(TIME_Q + " WHERE e.id=?", (eid,)).fetchone()
    return entry_out(r, uid, vis_ids(c, uid), now_utc(), time_rounding(usettings(c, uid))) if r else None


def need_entry(c, eid):
    """My own entry (to change it). Someone else's visible entry: 403, anything else: 404."""
    uid = me()
    r = c.execute("SELECT * FROM time_entries WHERE id=?", (eid,)).fetchone()
    if not r or (r["user_id"] != uid and r["list_id"] not in vis_ids(c, uid)):
        raise Denied(404)
    if r["user_id"] != uid:
        return err(tr("Only the person who tracked it can change this entry"), 403)
    return r


def time_target(c, b):
    """task_id or list_id of an entry from the request -> (task_id, list_id, title); read access needed."""
    tid = b.get("task_id")
    if tid not in (None, "", 0):
        try:
            tid = int(tid)
        except (TypeError, ValueError):
            raise Denied(404) from None
        need_task(c, tid, write=False)
        t = c.execute("SELECT list_id, title FROM tasks WHERE id=?", (tid,)).fetchone()
        return tid, t["list_id"], t["title"]
    try:
        lid = int(b.get("list_id"))
    except (TypeError, ValueError):
        raise BadInput(tr("Task or list missing")) from None
    need_list(c, lid, write=False)
    return None, lid, ""


def time_running(c, uid):
    r = c.execute(TIME_Q + " WHERE e.user_id=? AND e.end IS NULL", (uid,)).fetchone()
    if not r:
        return None
    return entry_out(r, uid, vis_ids(c, uid), now_utc(), 0)


def time_totals(c, uid):
    """{task_id: [seconds of everyone I can see, my seconds]} of finished entries (the client adds my running timer)."""
    out = {}
    for r in c.execute(f"""SELECT task_id, SUM(seconds) AS s, SUM(CASE WHEN user_id=? THEN seconds ELSE 0 END) AS m
                           FROM time_entries WHERE task_id IS NOT NULL AND end IS NOT NULL
                             AND (user_id=? OR list_id IN {vis_sql()}) GROUP BY task_id""", (uid, uid, uid, uid)):
        if r["s"]:
            out[r["task_id"]] = [r["s"], r["m"]]
    return out


def stop_timer(c, r, at, ts):
    end = max(parse_iso(r["start"]), at)
    sec = int((end - parse_iso(r["start"])).total_seconds())
    c.execute("UPDATE time_entries SET end=?, seconds=?, updated_at=? WHERE id=?", (iso(end), sec, ts, r["id"]))
    return sec


@app.post("/api/time/start")
def time_start():
    """{task_id | list_id, note?, at?, client_id?} -- starts my timer; a running one stops at the new start."""
    b = body()
    c = db()
    uid, ref = me(), now_utc().replace(microsecond=0)
    ts = iso(ref)
    cid = str(b.get("client_id") or "")[:64] or None
    if cid:  # replayed (outbox) or sent twice: the first one counts
        r = c.execute("SELECT id FROM time_entries WHERE user_id=? AND client_id=?", (uid, cid)).fetchone()
        if r:
            return jsonify(entry=one_entry(c, r["id"]), stopped=None, timer=time_running(c, uid))
    tid, lid, title = time_target(c, b)
    at = time_at(b.get("at"), ref)
    note = str(b.get("note") or "").strip()[:500]
    stopped, end = None, None
    run = c.execute("SELECT * FROM time_entries WHERE user_id=? AND end IS NULL", (uid,)).fetchone()
    if run:
        if parse_iso(run["start"]) <= at:
            stopped = {"id": run["id"], "seconds": stop_timer(c, run, at, ts), "task_id": run["task_id"]}
        else:  # an older start arrives late (offline): it ends where the running timer began
            end = parse_iso(run["start"])
    eid = c.execute("""INSERT INTO time_entries(user_id,task_id,list_id,task_title,start,end,seconds,note,source,client_id,
                       created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,'timer',?,?,?)""",
                    (uid, tid, lid, title, iso(at), iso(end) if end else None,
                     int((end - at).total_seconds()) if end else 0, note, cid, ts, ts)).lastrowid
    bump(c)
    c.commit()
    return jsonify(entry=one_entry(c, eid), stopped=stopped, timer=time_running(c, uid))


@app.post("/api/time/stop")
def time_stop():
    """{id? | client_id?, at?} -- stops that timer entry (else the running one). A replayed stop of an entry
    that another start already ended keeps the earlier end."""
    b = body()
    c = db()
    uid, ref = me(), now_utc().replace(microsecond=0)
    at = time_at(b.get("at"), ref)
    if b.get("id"):
        r = c.execute("SELECT * FROM time_entries WHERE id=? AND user_id=?", (int(b["id"]), uid)).fetchone()
    elif b.get("client_id"):
        r = c.execute("SELECT * FROM time_entries WHERE client_id=? AND user_id=?", (str(b["client_id"])[:64], uid)).fetchone()
    else:
        r = c.execute("SELECT * FROM time_entries WHERE user_id=? AND end IS NULL", (uid,)).fetchone()
        if not r:
            return jsonify(entry=None, timer=None, already=True)
    if not r:
        return err(tr("unknown"), 404)
    sec = None
    if r["end"] is None or (r["source"] == "timer" and at < parse_iso(r["end"])):
        sec = stop_timer(c, r, at, iso(ref))
    if sec == 0:  # started and stopped within the same second (misclick): nothing to keep
        c.execute("DELETE FROM time_entries WHERE id=?", (r["id"],))
    bump(c)
    c.commit()
    return jsonify(entry=one_entry(c, r["id"]), timer=time_running(c, uid), discarded=sec == 0)


def entry_times(b, start, end, sec):
    """start / end / minutes (or seconds) of a manual entry or an edit -> (start, end, seconds)."""
    if "start" in b:
        start = parse_when(b.get("start"))
    if not start:
        raise BadInput(tr("Start missing"))
    if b.get("minutes") not in (None, ""):
        try:
            sec = int(round(float(str(b["minutes"]).replace(",", ".")) * 60))
        except ValueError:
            raise BadInput(tr("Duration: number of minutes expected")) from None
        end = start + timedelta(seconds=sec)
    elif "end" in b and b.get("end"):
        end = parse_when(b.get("end"))
        full = int((end - start).total_seconds())
        try:  # focus entry (restored by undo): its duration without pauses
            sec = min(full, int(b["seconds"])) if b.get("seconds") not in (None, "") else full
        except (TypeError, ValueError):
            sec = full
    elif "start" in b and end is not None:  # moved start, same duration
        end = start + timedelta(seconds=sec)
    if end is None:
        raise BadInput(tr("End or duration missing"))
    if end < start or sec <= 0:
        raise BadInput(tr("The end is before the start"))
    if sec > TIME_MAX_S:
        raise BadInput(tr("At most 7 days per entry"))
    if end > now_utc() + timedelta(days=1):
        raise BadInput(tr("Entries cannot lie in the future"))
    return start, end, sec


@app.post("/api/time/entries")
def time_create():
    """Manual entry: {task_id | list_id, start, end | minutes, note}."""
    b = body()
    c = db()
    uid, ts = me(), iso(now_utc())
    tid, lid, title = time_target(c, b)
    start, end, sec = entry_times(b, None, None, 0)
    src = b.get("source") if b.get("source") in TIME_SOURCES else "manual"
    eid = c.execute("""INSERT INTO time_entries(user_id,task_id,list_id,task_title,start,end,seconds,note,source,created_at,updated_at)
                       VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
                    (uid, tid, lid, title, iso(start), iso(end), sec, str(b.get("note") or "").strip()[:500], src, ts, ts)).lastrowid
    bump(c)
    c.commit()
    return jsonify(one_entry(c, eid))


@app.patch("/api/time/entries/<int:eid>")
def time_update(eid):
    """My entry: {start?, end?, minutes?, note?, task_id? | list_id?}. A running timer: start / note / task only."""
    b = body()
    c = db()
    r = need_entry(c, eid)
    if not isinstance(r, sqlite3.Row):
        return r
    sets, args = [], []
    if "note" in b:
        sets.append("note=?")
        args.append(str(b.get("note") or "").strip()[:500])
    if "task_id" in b or "list_id" in b:
        tid, lid, title = time_target(c, b)
        sets += ["task_id=?", "list_id=?", "task_title=?"]
        args += [tid, lid, title]
    if r["end"] is None:  # running
        if "start" in b:
            st = parse_when(b.get("start"))
            if not st or st > now_utc():
                raise BadInput(tr("Invalid date or time"))
            sets.append("start=?")
            args.append(iso(st))
    elif any(k in b for k in ("start", "end", "minutes")):
        start, end, sec = entry_times(b, parse_iso(r["start"]), parse_iso(r["end"]), r["seconds"])
        sets += ["start=?", "end=?", "seconds=?"]
        args += [iso(start), iso(end), sec]
    if sets:
        c.execute(f"UPDATE time_entries SET {', '.join(sets)}, updated_at=? WHERE id=?", (*args, iso(now_utc()), eid))
        bump(c)
        c.commit()
    return jsonify(one_entry(c, eid))


@app.delete("/api/time/entries/<int:eid>")
def time_delete(eid):
    c = db()
    r = need_entry(c, eid)
    if not isinstance(r, sqlite3.Row):
        return r
    old = one_entry(c, eid)
    c.execute("DELETE FROM time_entries WHERE id=?", (eid,))
    bump(c)
    c.commit()
    return jsonify(ok=True, entry=old)


def focus_to_entry(c, pid):
    """A finished focus / stopwatch session on a task -> time entry (see the decisions above)."""
    p = c.execute("SELECT * FROM pomos WHERE id=?", (pid,)).fetchone()
    if not p or p["end"] is None or p["kind"] not in ("focus", "stopwatch") or not p["task_id"] or not p["user_id"]:
        return None
    uid = p["user_id"]
    s = usettings(c, uid)
    if s.get("time_focus") != "1" or not time_on(s):
        return None
    sec = int(pomo_elapsed(p))
    if sec < 60 or c.execute("SELECT 1 FROM time_entries WHERE pomo_id=?", (pid,)).fetchone():
        return None
    t = c.execute("SELECT list_id, title FROM tasks WHERE id=?", (p["task_id"],)).fetchone()
    if not t or not list_role(c, t["list_id"], uid):
        return None
    if c.execute("SELECT 1 FROM time_entries WHERE user_id=? AND source='timer' AND start<? AND (end IS NULL OR end>?)",
                 (uid, p["end"], p["start"])).fetchone():
        return None  # a timer ran at the same time: it already counts this time
    ts = iso(now_utc())
    return c.execute("""INSERT INTO time_entries(user_id,task_id,list_id,task_title,start,end,seconds,source,pomo_id,created_at,updated_at)
                        VALUES(?,?,?,?,?,?,?,'focus',?,?,?)""",
                     (uid, p["task_id"], t["list_id"], t["title"], p["start"], p["end"], sec, pid, ts, ts)).lastrowid


def local_bounds(d1, d2):
    """Local days d1..d2 (inclusive) -> UTC ISO [lo, hi)."""
    d3 = d2 + timedelta(days=1)
    return (iso(datetime(d1.year, d1.month, d1.day, tzinfo=TZ)), iso(datetime(d3.year, d3.month, d3.day, tzinfo=TZ)))


def time_rows(c, uid, a):
    """Visible entries for the entry list / report. a: from, to (local dates, inclusive), scope (mine | all),
    user, task_id, lists (csv of list ids; 0 = no list / a list I cannot see)."""
    where, args = [f"(e.user_id=? OR e.list_id IN {vis_sql()})"], [uid, uid, uid]
    try:
        f = date.fromisoformat(a["from"]) if a.get("from") else None
        t = date.fromisoformat(a["to"]) if a.get("to") else None
    except ValueError:
        raise BadInput(tr("Invalid date or time")) from None
    if f and t and t < f:
        f, t = t, f
    if f:
        where.append("e.start>=?")
        args.append(local_bounds(f, f)[0])
    if t:
        where.append("e.start<?")
        args.append(local_bounds(t, t)[1])
    if a.get("scope", "mine") == "mine":
        where.append("e.user_id=?")
        args.append(uid)
    for k, col in (("user", "e.user_id"), ("task_id", "e.task_id")):
        if a.get(k):
            try:
                args.append(int(a[k]))
            except ValueError:
                raise BadInput(tr("unknown")) from None
            where.append(f"{col}=?")
    rows = c.execute(TIME_Q + f" WHERE {' AND '.join(where)} ORDER BY e.start, e.id", args).fetchall()
    wanted = None
    if a.get("lists"):
        try:
            wanted = {int(x) for x in str(a["lists"]).split(",") if x.strip()}
        except ValueError:
            raise BadInput(tr("unknown")) from None
    return rows, f, t, wanted


@app.get("/api/time/entries")
def time_list():
    """?task_id= (entries of one task I can see) or the report filters; newest first."""
    c = db()
    uid = me()
    a = dict(request.args)
    if a.get("task_id"):
        try:
            need_task(c, int(a["task_id"]), write=False)
        except ValueError:
            raise Denied(404) from None
        a.setdefault("scope", "all")
    rows, _, _, wanted = time_rows(c, uid, a)
    vis, ref, rm = vis_ids(c, uid), now_utc(), time_rounding(usettings(c, uid))
    out = [entry_out(r, uid, vis, ref, rm) for r in rows]
    if wanted is not None:
        out = [e for e in out if (e["list_id"] or 0) in wanted]
    out.reverse()
    return jsonify(entries=out[:int(request.args.get("limit", 2000))], seconds=sum(e["seconds"] for e in out),
                   mine=sum(e["seconds"] for e in out if e["mine"]))


def time_report(c, uid, a):
    s = usettings(c, uid)
    rm, ref, vis = time_rounding(s), now_utc(), vis_ids(c, uid)
    lists = {l["id"]: l for l in visible_lists(c, uid)}
    rows, f, t, wanted = time_rows(c, uid, a)
    L, D, U, entries = {}, {}, {}, []
    tot = {"seconds": 0, "rounded": 0, "amount": 0.0, "count": 0}

    def add(d, e, amt):
        d["seconds"] += e["seconds"]
        d["rounded"] += e["rounded"]
        d["amount"] = d.get("amount", 0.0) + amt
    for r in rows:
        e = entry_out(r, uid, vis, ref, rm)
        lid = e["list_id"] if e["list_id"] in lists else 0
        if wanted is not None and lid not in wanted:
            continue
        l = lists.get(lid)
        rate = l["rate"] if l and l.get("rate") else None
        amt = e["rounded"] / 3600 * rate if rate else 0.0
        e["amount"] = round(amt, 2) if rate else None
        e["day"] = parse_iso(e["start"]).astimezone(TZ).date().isoformat()
        entries.append(e)
        add(tot, e, amt)
        tot["count"] += 1
        grp = L.setdefault(lid, {"id": lid, "name": l["name"] if l else "", "is_inbox": bool(l and l["is_inbox"]),
                               "color": l["color"] if l else "", "rate": rate, "seconds": 0, "rounded": 0, "amount": 0.0,
                               "tasks": {}, "users": {}})
        add(grp, e, amt)
        k = e["task_id"] or "x:" + e["title"]
        tk = grp["tasks"].setdefault(k, {"id": e["task_id"], "title": e["title"], "seconds": 0, "rounded": 0,
                                       "amount": 0.0, "users": {}})
        add(tk, e, amt)
        tk["users"][e["user_name"]] = tk["users"].get(e["user_name"], 0) + e["rounded"]
        grp["users"][e["user_name"]] = grp["users"].get(e["user_name"], 0) + e["rounded"]
        dd = D.setdefault(e["day"], {"date": e["day"], "seconds": 0, "rounded": 0})
        add(dd, e, 0)
        uu = U.setdefault(e["user_id"], {"id": e["user_id"], "name": e["user_name"], "seconds": 0, "rounded": 0})
        add(uu, e, 0)
    out_lists = []
    for grp in sorted(L.values(), key=lambda x: (-x["seconds"], x["id"] == 0, x["name"].casefold())):
        grp["tasks"] = sorted(grp["tasks"].values(), key=lambda x: (-x["seconds"], x["title"].casefold()))
        for x in [grp, *grp["tasks"]]:
            x["amount"] = round(x["amount"], 2)
            x["users"] = sorted(x["users"].items(), key=lambda kv: -kv[1])
        out_lists.append(grp)
    tot["amount"] = round(tot["amount"], 2)
    for d in D.values():
        d.pop("amount", None)
    for u in U.values():
        u.pop("amount", None)
    today = local_now().date()
    lo, hi = local_bounds(today, today)
    mine_today = sum(entry_secs(r, ref) for r in c.execute(
        "SELECT start, end, seconds FROM time_entries WHERE user_id=? AND start>=? AND start<?", (uid, lo, hi)))
    return {"from": f.isoformat() if f else None, "to": t.isoformat() if t else None, "scope": a.get("scope", "mine"),
            "rounding": rm, "currency": s.get("time_currency") or "", "total": tot, "lists": out_lists,
            "days": sorted(D.values(), key=lambda x: x["date"]), "users": sorted(U.values(), key=lambda x: -x["seconds"]),
            "entries": entries, "now": iso(ref), "today": {"seconds": mine_today, "target_h": _num(s.get("time_target"))},
            "me": user_public(g.user)}


def _num(v):
    try:
        return max(0.0, float(str(v or 0).replace(",", ".")))
    except ValueError:
        return 0.0


@app.get("/api/time/report")
def time_report_api():
    c = db()
    return jsonify(time_report(c, me(), dict(request.args)))


def _csv_cell(v):
    v = str(v or "")
    return "'" + v if v[:1] in ("=", "+", "-", "@", "\t", "\r") else v


@app.get("/api/time/export.csv")
def time_csv():
    """Same filters as the report, one row per entry. German: ';' and decimal comma (Excel)."""
    c = db()
    uid = me()
    rep = time_report(c, uid, dict(request.args))
    lg = lang()
    de = lg == "de"
    num = (lambda x: f"{x:.2f}".replace(".", ",")) if de else (lambda x: f"{x:.2f}")
    names = {l["id"]: l["name"] for l in rep["lists"]}
    buf = io.StringIO()
    w = csv.writer(buf, delimiter=";" if de else ",", lineterminator="\r\n")
    w.writerow([tr("List"), tr("Task"), tr("User"), tr("Start|time"), tr("End|time"), tr("Duration (h)"),
                tr("Duration (h:mm)"), tr("Rounded (h)"), tr("Amount ({0})", rep["currency"]), tr("Note")])
    for e in rep["entries"]:
        lid = e["list_id"] if e["list_id"] in names else 0
        ln = names.get(lid, "")
        lst = next((x for x in rep["lists"] if x["id"] == lid), None)
        ln = tr("Inbox") if lst and lst["is_inbox"] and ln == "Eingang" else (ln or tr("No list"))
        s0 = parse_iso(e["start"]).astimezone(TZ)
        en = parse_iso(e["end"]).astimezone(TZ) if e["end"] else None
        sec, rs = e["seconds"], e["rounded"]
        w.writerow([_csv_cell(ln), _csv_cell(e["title"] or tr("No task")), _csv_cell(e["user_name"]),
                    s0.strftime("%Y-%m-%d %H:%M"), en.strftime("%Y-%m-%d %H:%M") if en else tr("running"),
                    num(sec / 3600), f"{sec // 3600}:{sec % 3600 // 60:02d}", num(rs / 3600),
                    num(e["amount"]) if e["amount"] is not None else "", _csv_cell(e["note"])])
    name = f"{tr('timesheet|file')}-{rep['from'] or 'all'}-{rep['to'] or local_now().date().isoformat()}.csv"
    name = re.sub(r"[^A-Za-z0-9._-]", "_", name)
    return Response("﻿" + buf.getvalue(), mimetype="text/csv; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{name}"'})


def time_watchdog(c, users, S, LG):
    """Forgotten timers: a push after time_remind_h, auto-stop after time_autostop_h (end = start + N h)."""
    ref = now_utc()
    for r in c.execute("SELECT e.*, t.title AS t_title FROM time_entries e LEFT JOIN tasks t ON t.id=e.task_id "
                       "WHERE e.end IS NULL").fetchall():
        uid = r["user_id"]
        if uid not in users:
            continue
        s, lg = S[uid], LG[uid]
        rem_h, stop_h = _num(s.get("time_remind_h")), _num(s.get("time_autostop_h"))
        start = parse_iso(r["start"])
        hrs = (ref - start).total_seconds() / 3600
        label = r["t_title"] or r["task_title"] or tr("No task", lg=lg)
        fnum = (lambda x: f"{x:.1f}".rstrip("0").rstrip(".").replace(".", "," if lg == "de" else "."))
        if stop_h > 0 and hrs >= stop_h:
            end = start + timedelta(hours=stop_h)
            n = c.execute("UPDATE time_entries SET end=?, seconds=?, auto_stopped=1, updated_at=? WHERE id=? AND end IS NULL",
                          (iso(end), int(stop_h * 3600), iso(ref), r["id"])).rowcount
            bump(c)
            c.commit()
            if n:
                ntfy(tr("Timer stopped automatically", lg=lg),
                     tr("{0} ran {1} h and was stopped at {2}. Correct the end time if needed.", label, fnum(stop_h),
                        end.astimezone(TZ).strftime("%H:%M"), lg=lg), "high", f"{PUBLIC_URL}/#time", topic=s["ntfy_topic"])
        elif rem_h > 0 and hrs >= rem_h and not r["reminded"]:
            c.execute("UPDATE time_entries SET reminded=1 WHERE id=?", (r["id"],))
            c.commit()
            ntfy(tr("Timer still running", lg=lg), tr("{0} has been running for {1} h. Still on it?", label, fnum(hrs), lg=lg),
                 "default", f"{PUBLIC_URL}/#time", topic=s["ntfy_topic"])


# ---------------------------------------------------------------- settings / export (per user)

@app.patch("/api/settings")
def settings_update():
    b = body()
    c = db()
    for k, v in b.items():
        if k in USER_DEFAULTS and k not in ("digest_sent", "ntfy_topic"):
            if k == "lang" and v not in LANGS:
                continue
            if k == "time_currency":
                v = str(v).strip()[:8]
            uset(c, me(), k, str(v))
    bump(c)
    c.commit()
    return jsonify(ok=True)


@app.post("/api/ntfy/test")
def ntfy_test():
    ok = ntfy("Abhako: Test", tr("Notifications are arriving."), "default", PUBLIC_URL,
              topic=usettings(db(), me())["ntfy_topic"])
    return jsonify(ok=ok)


@app.get("/api/export.json")
def export_json():
    """My data: lists I own (also shared ones, with their tasks incl. link / sections / files / comments /
    activity / custom fields + values / dependencies / status updates), my tags, habits, focus sessions, my time entries, filters and settings. Attachment files stay in data/attachments/."""
    c = db()
    uid = me()
    own = "(SELECT id FROM lists WHERE owner_id=?)"
    task_ids = f"(SELECT id FROM tasks WHERE list_id IN {own})"
    q = {
        "lists": ("SELECT * FROM lists WHERE owner_id=?", (uid,)),
        "list_members": (f"SELECT * FROM list_members WHERE list_id IN {own}", (uid,)),
        "sections": (f"SELECT * FROM sections WHERE list_id IN {own}", (uid,)),
        "tasks": (f"SELECT * FROM tasks WHERE list_id IN {own}", (uid,)),
        "task_tags": ("SELECT * FROM task_tags WHERE user_id=?", (uid,)),
        "habits": ("SELECT * FROM habits WHERE user_id=?", (uid,)),
        "habit_logs": ("SELECT * FROM habit_logs WHERE habit_id IN (SELECT id FROM habits WHERE user_id=?)", (uid,)),
        "pomos": ("SELECT * FROM pomos WHERE user_id=?", (uid,)),
        "filters": ("SELECT * FROM filters WHERE user_id=?", (uid,)),
        "attachments": (f"SELECT * FROM attachments WHERE task_id IN {task_ids}", (uid,)),
        "paperless_links": (f"SELECT * FROM paperless_links WHERE task_id IN {task_ids}", (uid,)),
        "comments": (f"SELECT * FROM comments WHERE task_id IN {task_ids} AND deleted_at IS NULL", (uid,)),
        "activity": (f"SELECT * FROM activity WHERE task_id IN {task_ids}", (uid,)),
        "settings": ("SELECT key, value FROM user_settings WHERE user_id=?", (uid,)),
        "templates": ("SELECT id, kind, name, data, created_at, updated_at FROM templates WHERE user_id=?", (uid,)),
        "time_entries": ("SELECT * FROM time_entries WHERE user_id=? ORDER BY start", (uid,)),
        "list_fields": (f"SELECT * FROM list_fields WHERE list_id IN {own}", (uid,)),
        "task_field_values": (f"SELECT * FROM task_field_values WHERE task_id IN {task_ids}", (uid,)),
        "task_deps": (f"SELECT * FROM task_deps WHERE task_id IN {task_ids} OR blocker_id IN {task_ids}", (uid, uid)),
        "list_status": (f"SELECT * FROM list_status WHERE list_id IN {own}", (uid,)),
    }
    data = {t: [dict(r) for r in c.execute(sql, args)] for t, (sql, args) in q.items()}
    data["user"] = user_public(g.user)
    name = f"abhako-export-{local_now():%Y-%m-%d}.json"
    return Response(json.dumps(data, ensure_ascii=False, indent=1), mimetype="application/json",
                    headers={"Content-Disposition": f'attachment; filename="{name}"'})


# ---------------------------------------------------------------- users / account

def need_admin():
    if not g.user["is_admin"]:
        raise Denied(403)


def user_admin_dict(c, u):
    return {**user_public(u), "is_admin": bool(u["is_admin"]), "disabled": bool(u["disabled"]),
            "has_password": bool(u["password_hash"]), "proxy_login": u["proxy_login"] or "",
            "created_at": u["created_at"], "ntfy_topic": usettings(c, u["id"])["ntfy_topic"],
            "lists": c.execute("SELECT COUNT(*) FROM lists WHERE owner_id=? AND is_inbox=0", (u["id"],)).fetchone()[0]}


@app.get("/api/users")
def users_list():
    """Everyone: enabled users (for sharing). Admins: all users with account details."""
    c = db()
    if g.user["is_admin"]:
        return jsonify(users=[user_admin_dict(c, u) for u in c.execute("SELECT * FROM users ORDER BY id")])
    return jsonify(users=[user_public(u) for u in c.execute("SELECT * FROM users WHERE disabled=0 ORDER BY id")])


def _proxy_taken(c, login, uid=None):
    return bool(login) and bool(c.execute("SELECT 1 FROM users WHERE proxy_login=? COLLATE NOCASE AND id IS NOT ?",
                                          (login, uid)).fetchone())


def _active_admins(c, without=None):
    return c.execute("SELECT COUNT(*) FROM users WHERE is_admin=1 AND disabled=0 AND id IS NOT ?", (without,)).fetchone()[0]


@app.post("/api/users")
def user_create():
    need_admin()
    b = body()
    c = db()
    username = (b.get("username") or "").strip().lower()
    if not USERNAME_RE.fullmatch(username):
        return err(tr("Username: 1-32 characters a-z, 0-9, dot, dash, underscore"))
    if c.execute("SELECT 1 FROM users WHERE username=?", (username,)).fetchone():
        return err(tr("Username already exists"), 409)
    pw = b.get("password") or ""
    if pw and len(pw) < MIN_PASSWORD:
        return err(tr("Password: at least {0} characters", MIN_PASSWORD))
    proxy = (b.get("proxy_login") or "").strip() or None
    if _proxy_taken(c, proxy):
        return err(tr("This proxy login is already assigned"), 409)
    uid = create_user(c, username, (b.get("display_name") or "").strip()[:60] or username, pw or None, proxy,
                      bool(b.get("is_admin")), ntfy_topic=(b.get("ntfy_topic") or "").strip() or None)
    uset(c, uid, "lang", usettings(c, me())["lang"])  # start in the admin's language
    ensure_inbox(c, uid)
    bump(c)
    c.commit()
    return jsonify(user_admin_dict(c, c.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()))


@app.patch("/api/users/<int:uid>")
def user_update(uid):
    need_admin()
    b = body()
    c = db()
    u = c.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    if not u:
        return err(tr("unknown user"), 404)
    if uid == me() and (("is_admin" in b and not b["is_admin"]) or b.get("disabled")):
        return err(tr("You cannot remove your own admin rights or disable yourself"))
    if (("is_admin" in b and not b["is_admin"]) or b.get("disabled")) and u["is_admin"] and not _active_admins(c, uid):
        return err(tr("At least one active admin is needed"))
    if "display_name" in b:
        c.execute("UPDATE users SET display_name=? WHERE id=?", ((b["display_name"] or "").strip()[:60] or u["username"], uid))
    if "proxy_login" in b:
        proxy = (b["proxy_login"] or "").strip() or None
        if _proxy_taken(c, proxy, uid):
            return err(tr("This proxy login is already assigned"), 409)
        c.execute("UPDATE users SET proxy_login=? WHERE id=?", (proxy, uid))
    if "is_admin" in b:
        c.execute("UPDATE users SET is_admin=? WHERE id=?", (1 if b["is_admin"] else 0, uid))
    if "disabled" in b:
        c.execute("UPDATE users SET disabled=? WHERE id=?", (1 if b["disabled"] else 0, uid))
        if b["disabled"]:
            c.execute("DELETE FROM sessions WHERE user_id=?", (uid,))
    if "password" in b:  # reset ('' = remove the built-in login)
        pw = b["password"] or ""
        if pw and len(pw) < MIN_PASSWORD:
            return err(tr("Password: at least {0} characters", MIN_PASSWORD))
        c.execute("UPDATE users SET password_hash=? WHERE id=?", (generate_password_hash(pw) if pw else None, uid))
        c.execute("DELETE FROM sessions WHERE user_id=?", (uid,))
    if "ntfy_topic" in b:
        uset(c, uid, "ntfy_topic", (b["ntfy_topic"] or "").strip())
    bump(c)
    c.commit()
    return jsonify(user_admin_dict(c, c.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()))


@app.delete("/api/users/<int:uid>")
def user_delete(uid):
    """Refused while the user owns lists besides the inbox (the safer option: nothing shared with
    others disappears). Deletes their inbox (+ its tasks), habits, focus sessions, time entries, filters, tags and
    settings; tasks they created in other people's lists stay (creator cleared)."""
    need_admin()
    c = db()
    u = c.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    if not u:
        return err(tr("unknown user"), 404)
    if uid == me():
        return err(tr("You cannot delete yourself"))
    n = c.execute("SELECT COUNT(*) FROM lists WHERE owner_id=? AND is_inbox=0", (uid,)).fetchone()[0]
    if n:
        return err(trn("The user still owns {0} list. Delete it or disable the user instead.",
                       "The user still owns {0} lists. Delete them or disable the user instead.", n), 409)
    inbox = [r[0] for r in c.execute("SELECT id FROM lists WHERE owner_id=?", (uid,))]
    files = attachment_files(c, [r[0] for r in c.execute(
        f"SELECT id FROM tasks WHERE list_id IN ({','.join('?' * len(inbox)) or 'NULL'})", inbox)])
    for lid in inbox:
        c.execute("DELETE FROM lists WHERE id=?", (lid,))
    c.execute("DELETE FROM habits WHERE user_id=?", (uid,))
    c.execute("DELETE FROM pomos WHERE user_id=?", (uid,))
    c.execute("DELETE FROM time_entries WHERE user_id=?", (uid,))
    c.execute("DELETE FROM filters WHERE user_id=?", (uid,))
    c.execute("DELETE FROM task_tags WHERE user_id=?", (uid,))
    c.execute("UPDATE tasks SET assignee_id=NULL WHERE assignee_id=?", (uid,))
    c.execute("UPDATE tasks SET created_by=NULL WHERE created_by=?", (uid,))
    c.execute("DELETE FROM task_field_values WHERE value=? AND field_id IN (SELECT id FROM list_fields WHERE type='person')", (str(uid),))
    c.execute("DELETE FROM users WHERE id=?", (uid,))  # cascades: settings, memberships, sessions
    bump(c)
    c.commit()
    unlink_files(files)
    return jsonify(ok=True)


@app.get("/api/me")
def me_get():
    c = db()
    u = g.user
    return jsonify({**user_public(u), "is_admin": bool(u["is_admin"]), "auth": g.auth_via,
                    "has_password": bool(u["password_hash"]), "proxy_login": u["proxy_login"] or "",
                    "drop_token": u["drop_token"] or "", "ntfy_topic": usettings(c, u["id"])["ntfy_topic"]})


@app.patch("/api/me")
def me_update():
    """Own display name and password (the current password is required when one is set)."""
    b = body()
    c = db()
    u = g.user
    if "display_name" in b:
        c.execute("UPDATE users SET display_name=? WHERE id=?", ((b["display_name"] or "").strip()[:60] or u["username"], u["id"]))
    if "password" in b:
        keys = _rate_keys(u["username"])
        if _rate_blocked(keys):
            return err(tr("Too many failed logins, please wait a few minutes"), 429)
        if u["password_hash"] and not check_password_hash(u["password_hash"], b.get("current_password") or ""):
            _rate_fail(keys)
            return err(tr("Current password is wrong"), 403)
        pw = b["password"] or ""
        if len(pw) < MIN_PASSWORD:
            return err(tr("Password: at least {0} characters", MIN_PASSWORD))
        c.execute("UPDATE users SET password_hash=? WHERE id=?", (generate_password_hash(pw), u["id"]))
        tok = request.cookies.get(COOKIE)  # other sessions end, this one stays
        c.execute("DELETE FROM sessions WHERE user_id=? AND token_hash IS NOT ?", (u["id"], _token_hash(tok) if tok else None))
    bump(c)
    c.commit()
    return jsonify(ok=True)


@app.post("/api/me/drop-token")
def me_drop_token():
    c = db()
    tok = secrets.token_urlsafe(24)
    c.execute("UPDATE users SET drop_token=? WHERE id=?", (tok, me()))
    c.commit()
    return jsonify(drop_token=tok)


# ---------------------------------------------------------------- templates (private per user)
# A task template = {"task": node}, a list template = {"name", "color", "view", "sections": [name, ...],
# "tasks": [node + "section": index into sections | null]}. node = {title, content, priority, tags, url,
# due_offset, start_offset, due_time, duration, reminders, repeat, repeat_from, children: [node, ...]}.
# Offsets are days relative to the day the template was saved (never negative); a template used
# today puts the dates relative to today. Subtasks up to MAX_DEPTH levels; assignees are not kept.
TPL_MAX_NODES = 500
TPL_MAX_PER_USER = 200
HHMM_RE = re.compile(r"(?:[01]\d|2[0-3]):[0-5]\d")


def tpl_node_from_task(c, t, base, uid, depth=0, fidx=None):
    """fidx (list templates): ({field id: index}, {field id: type}) -> the node keeps its custom field values
    as fv {index: value} (dates as days after use, people are not kept)."""
    def off(d):
        return max(0, (date.fromisoformat(d) - base).days) if d else None
    tags = [r[0] for r in c.execute("SELECT tag FROM task_tags WHERE task_id=? AND user_id=? ORDER BY tag", (t["id"], uid))]
    kids = c.execute("SELECT * FROM tasks WHERE parent_id=? AND deleted_at IS NULL ORDER BY sort, id",
                     (t["id"],)).fetchall() if depth < MAX_DEPTH - 1 else []
    n = {"title": t["title"], "content": t["content"] or "", "priority": t["priority"] or 0, "tags": tags,
         "url": t["url"], "due_offset": off(t["due"]), "start_offset": off(t["start"]) if t["due"] else None,
         "due_time": t["due_time"] if t["due"] else None, "duration": t["duration"] if t["due_time"] else None,
         "reminders": t["reminders"] or "", "repeat": t["repeat"] or "", "repeat_from": t["repeat_from"] or "due",
         "children": [tpl_node_from_task(c, k, base, uid, depth + 1, fidx) for k in kids]}
    if fidx:
        fv = {}
        for r in c.execute("SELECT field_id, value FROM task_field_values WHERE task_id=?", (t["id"],)):
            i, ty = fidx[0].get(r["field_id"]), fidx[1].get(r["field_id"])
            if i is None or ty == "person":
                continue
            try:
                fv[str(i)] = (date.fromisoformat(r["value"]) - base).days if ty == "date" else r["value"]
            except ValueError:
                continue
        if fv:
            n["fv"] = fv
    return n


def tpl_clean_node(n, depth, count):
    """Validates one node from the client (edited template); raises ValueError with a message."""
    if not isinstance(n, dict):
        raise ValueError(tr("Invalid template"))
    count[0] += 1
    if count[0] > TPL_MAX_NODES:
        raise ValueError(tr("Template too large (at most {0} tasks)", TPL_MAX_NODES))
    title = str(n.get("title") or "").strip()[:500]
    if not title:
        raise ValueError(tr("Title missing"))

    def num(k, lo, hi):
        v = n.get(k)
        if v in (None, ""):
            return None
        try:
            v = int(v)
        except (TypeError, ValueError):
            raise ValueError(tr("Invalid template")) from None
        return min(hi, max(lo, v))
    due_off = num("due_offset", 0, 3650)
    due_time = n.get("due_time") if isinstance(n.get("due_time"), str) and HHMM_RE.fullmatch(n.get("due_time")) else None
    rep = str(n.get("repeat") or "").strip()[:300]
    if rep:
        try:
            rrulestr(rep.removeprefix("RRULE:"), dtstart=datetime(2026, 1, 1))
        except (ValueError, TypeError):
            rep = ""
    rems = ",".join(dict.fromkeys(x.strip() for x in str(n.get("reminders") or "").split(",") if x.strip().isdigit()))
    url = str(n.get("url") or "").strip() or None
    kids = n.get("children") or []
    fv = n.get("fv") if isinstance(n.get("fv"), dict) else {}
    return {"title": title, "content": str(n.get("content") or "")[:20000],
            **({"fv": {k: v for k, v in list(fv.items())[:FIELD_MAX] if re.fullmatch(r"\d{1,2}", str(k))
                       and isinstance(v, (str, int, float)) and not isinstance(v, bool) and len(str(v)) <= 2000}} if fv else {}),
            "priority": num("priority", 0, 5) if num("priority", 0, 5) in (0, 1, 3, 5) else 0,
            "tags": [str(x).strip().lstrip("#")[:60] for x in (n.get("tags") or []) if str(x).strip().lstrip("#")][:30]
            if isinstance(n.get("tags"), list) else [],
            "url": url if url and valid_url(url) else None,
            "due_offset": due_off, "start_offset": num("start_offset", 0, 3650) if due_off is not None else None,
            "due_time": due_time if due_off is not None else None,
            "duration": num("duration", 5, 1440) if due_time and due_off is not None else None,
            "reminders": rems if due_off is not None else "", "repeat": rep if due_off is not None else "",
            "repeat_from": "done" if n.get("repeat_from") == "done" else "due",
            "children": [tpl_clean_node(k, depth + 1, count) for k in kids] if depth < MAX_DEPTH - 1 and isinstance(kids, list) else []}


def tpl_clean(kind, d):
    if not isinstance(d, dict):
        raise ValueError(tr("Invalid template"))
    count = [0]
    if kind == "task":
        return {"task": tpl_clean_node(d.get("task"), 0, count)}
    secs = [str(x).strip()[:200] for x in (d.get("sections") or []) if str(x).strip()][:50]
    tasks = []
    for n in d.get("tasks") or []:
        x = tpl_clean_node(n, 0, count)
        si = n.get("section") if isinstance(n, dict) else None
        x["section"] = si if isinstance(si, int) and not isinstance(si, bool) and 0 <= si < len(secs) else None
        tasks.append(x)
    color = str(d.get("color") or "")
    return {"name": str(d.get("name") or "").strip()[:200], "color": color if re.fullmatch(r"#[0-9a-fA-F]{3,8}", color) else "",
            "view": d.get("view") if d.get("view") in ("list", "kanban", "timeline") else "list",
            "sections": secs, "tasks": tasks, "fields": tpl_clean_fields(d.get("fields"))}


def tpl_count(d):
    def n(x):
        return 1 + sum(n(k) for k in x.get("children") or [])
    return n(d["task"]) if "task" in d else sum(n(x) for x in d.get("tasks") or [])


def tpl_dict(r):
    d = json.loads(r["data"] or "{}")
    return {"id": r["id"], "kind": r["kind"], "name": r["name"], "data": d, "count": tpl_count(d),
            "created_at": r["created_at"], "updated_at": r["updated_at"]}


def need_template(c, tid):
    r = c.execute("SELECT * FROM templates WHERE id=? AND user_id=?", (tid, me())).fetchone()
    if not r:
        raise Denied(404)
    return r


@app.get("/api/templates")
def templates_list():
    return jsonify(templates=[tpl_dict(r) for r in db().execute(
        "SELECT * FROM templates WHERE user_id=? ORDER BY kind DESC, name COLLATE NOCASE, id", (me(),))])


@app.post("/api/templates")
def template_create():
    """{task_id} = this task with its subtasks, {list_id} = the list's sections and open tasks (with subtasks),
    or {kind, data} as sent by the template editor. name optional (default: the task title / list name)."""
    b = body()
    c = db()
    uid = me()
    if c.execute("SELECT COUNT(*) FROM templates WHERE user_id=?", (uid,)).fetchone()[0] >= TPL_MAX_PER_USER:
        return err(tr("At most {0} templates", TPL_MAX_PER_USER))
    base = local_now().date()
    try:
        if b.get("task_id"):
            tid = int(b["task_id"])
            need_task(c, tid, write=False)
            t = c.execute("SELECT * FROM tasks WHERE id=? AND deleted_at IS NULL", (tid,)).fetchone()
            if not t:
                raise Denied(404)
            kind, data, name = "task", {"task": tpl_node_from_task(c, t, base, uid)}, t["title"]
        elif b.get("list_id"):
            lid = int(b["list_id"])
            need_list(c, lid, write=False)
            lst = c.execute("SELECT * FROM lists WHERE id=?", (lid,)).fetchone()
            secs = c.execute("SELECT id, name FROM sections WHERE list_id=? ORDER BY sort, id", (lid,)).fetchall()
            sidx = {s["id"]: i for i, s in enumerate(secs)}
            fdefs, fidx, ftypes = tpl_fields_of(c, lid)
            tasks = []
            for t in c.execute("""SELECT * FROM tasks WHERE list_id=? AND parent_id IS NULL AND status=0 AND deleted_at IS NULL
                                  ORDER BY sort, id""", (lid,)).fetchall():
                n = tpl_node_from_task(c, t, base, uid, fidx=(fidx, ftypes))
                n["section"] = sidx.get(t["section_id"])
                tasks.append(n)
            role = list_role(c, lid)
            name = tr("Inbox") if lst["is_inbox"] and lst["name"] == "Eingang" else lst["name"]
            kind, data = "list", {"name": name, "color": lst["color"],
                                  "view": lst["view"] if role == "owner" else (c.execute(
                                      "SELECT COALESCE(view, ?) FROM list_members WHERE list_id=? AND user_id=?",
                                      (lst["view"], lid, uid)).fetchone() or ["list"])[0],
                                  "sections": [s["name"] for s in secs], "tasks": tasks, "fields": fdefs}
        else:
            kind = b.get("kind") if b.get("kind") in ("task", "list") else None
            if not kind:
                return err(tr("Invalid template"))
            data = b.get("data")
            name = ""
        data = tpl_clean(kind, data)
    except (ValueError, TypeError) as e:
        return err(str(e) or tr("Invalid template"))
    name = (str(b.get("name") or "").strip() or name or (data.get("name") if kind == "list" else data["task"]["title"]))[:200]
    if not name:
        return err(tr("Name missing"))
    ts = iso(now_utc())
    cur = c.execute("INSERT INTO templates(user_id,kind,name,data,created_at,updated_at) VALUES(?,?,?,?,?,?)",
                    (uid, kind, name, json.dumps(data, ensure_ascii=False), ts, ts))
    bump(c)
    c.commit()
    return jsonify(tpl_dict(c.execute("SELECT * FROM templates WHERE id=?", (cur.lastrowid,)).fetchone()))


@app.patch("/api/templates/<int:tid>")
def template_update(tid):
    b = body()
    c = db()
    r = need_template(c, tid)
    if "name" in b:
        name = str(b["name"] or "").strip()[:200]
        if not name:
            return err(tr("Name missing"))
        c.execute("UPDATE templates SET name=? WHERE id=?", (name, tid))
    if "data" in b:
        try:
            data = tpl_clean(r["kind"], b["data"])
        except (ValueError, TypeError) as e:
            return err(str(e) or tr("Invalid template"))
        c.execute("UPDATE templates SET data=? WHERE id=?", (json.dumps(data, ensure_ascii=False), tid))
    c.execute("UPDATE templates SET updated_at=? WHERE id=?", (iso(now_utc()), tid))
    bump(c)
    c.commit()
    return jsonify(tpl_dict(c.execute("SELECT * FROM templates WHERE id=?", (tid,)).fetchone()))


@app.delete("/api/templates/<int:tid>")
def template_delete(tid):
    c = db()
    need_template(c, tid)
    c.execute("DELETE FROM templates WHERE id=?", (tid,))
    bump(c)
    c.commit()
    return jsonify(ok=True)


def tpl_insert(c, n, lid, sec, parent, base, sort, uid, fmap=None):
    """Creates the task of one template node (and its subtasks); returns the new id. fmap (list templates):
    [new field rows by template index] for the node's custom field values (invalid ones are skipped)."""
    due = (base + timedelta(days=n["due_offset"])).isoformat() if n.get("due_offset") is not None else None
    start = (base + timedelta(days=n["start_offset"])).isoformat() if due and n.get("start_offset") is not None else None
    if start and start >= due:
        start = None
    tm = n.get("due_time") if due else None
    f = {"list_id": lid, "section_id": sec, "parent_id": parent, "title": n["title"], "content": n.get("content") or "",
         "priority": n.get("priority") or 0, "due": due, "due_time": tm, "start": start,
         "duration": n.get("duration") if tm else None, "reminders": n.get("reminders") or "" if due else "",
         "repeat": n.get("repeat") or "" if due else "", "repeat_from": n.get("repeat_from") or "due",
         "url": n.get("url"), "sort": sort, "created_by": uid}
    ts = iso(now_utc())
    cols = list(f) + ["created_at", "updated_at"]
    tid = c.execute(f"INSERT INTO tasks({','.join(cols)}) VALUES({','.join('?' * len(cols))})",
                    [f[k] for k in f] + [ts, ts]).lastrowid
    if n.get("tags"):
        set_tags(c, tid, n["tags"], uid)
    for k, v in (n.get("fv") or {}).items() if fmap else ():
        f = fmap[int(k)] if int(k) < len(fmap) else None
        if not f:
            continue
        try:
            if f["type"] == "date":
                v = (base + timedelta(days=max(-3650, min(3650, int(v))))).isoformat()
            val = field_value(c, f, v, lid)
        except (BadInput, ValueError, TypeError):
            continue
        if val is not None:
            c.execute("INSERT OR REPLACE INTO task_field_values(task_id,field_id,value) VALUES(?,?,?)", (tid, f["id"], val))
    log_act(c, tid, "created")
    for i, k in enumerate(n.get("children") or []):
        tpl_insert(c, k, lid, sec, tid, base, i + 1, uid, fmap)
    return tid


@app.post("/api/templates/<int:tid>/apply")
def template_apply(tid):
    """Task template: new task (+ subtasks) in {list_id, section_id} (default: inbox).
    List template: a new list of mine ({name} optional). Dates relative to today."""
    b = body()
    c = db()
    uid = me()
    r = need_template(c, tid)
    d = json.loads(r["data"] or "{}")
    base = local_now().date()
    if r["kind"] == "task":
        lid = int(b.get("list_id") or 0) or my_inbox(c)
        need_list(c, lid)
        sec = b.get("section_id")
        if sec and not c.execute("SELECT 1 FROM sections WHERE id=? AND list_id=?", (sec, lid)).fetchone():
            sec = None
        srt = c.execute("SELECT COALESCE(MIN(sort),0)-1 FROM tasks WHERE list_id=? AND parent_id IS NULL", (lid,)).fetchone()[0]
        new = tpl_insert(c, d["task"], lid, sec or None, None, base, srt, uid)
        bump(c)
        c.commit()
        return jsonify(task=one_task(c, new))
    name = str(b.get("name") or "").strip()[:200] or d.get("name") or r["name"]
    lid = c.execute("INSERT INTO lists(name,color,folder,sort,view,created_at,owner_id) VALUES(?,?,?,?,?,?,?)",
                    (name, d.get("color") or "", "", my_max_sort(c, uid) + 1, d.get("view") or "list", iso(now_utc()), uid)).lastrowid
    secs = [c.execute("INSERT INTO sections(list_id,name,sort) VALUES(?,?,?)", (lid, s, i)).lastrowid
            for i, s in enumerate(d.get("sections") or [])]
    fmap = []
    for i, fd in enumerate(d.get("fields") or []):
        fid = c.execute("INSERT INTO list_fields(list_id,name,type,options,pinned,sort,created_at) VALUES(?,?,?,?,?,?,?)",
                        (lid, fd["name"], fd["type"], json.dumps(fd.get("options") or {}, ensure_ascii=False), fd.get("pinned") or 0,
                         i + 1, iso(now_utc()))).lastrowid
        fmap.append(c.execute("SELECT * FROM list_fields WHERE id=?", (fid,)).fetchone())
    for i, n in enumerate(d.get("tasks") or []):
        si = n.get("section")
        tpl_insert(c, n, lid, secs[si] if isinstance(si, int) and 0 <= si < len(secs) else None, None, base, i, uid, fmap)
    bump(c)
    c.commit()
    return jsonify(list_id=lid)


# ---------------------------------------------------------------- dependencies ("waiting on"), package 3
# task_deps(task_id, blocker_id): task_id waits on blocker_id. A blocker is open while status=0 and it is
# not in the trash (a trashed blocker is ignored until it is restored; done / won't do resolves it; a
# recurring blocker stays open, its done copies do not unblock). Adding or removing a dependency changes
# the waiting task: it needs write access to that task, and both tasks must be visible to the user. No
# self-dependency, no cycles (checked on the whole graph, also through tasks the user cannot see).
# Titles of tasks the user cannot see are never sent ("a task you cannot see").
# When the LAST open blocker of a task is completed (done or won't do), the waiting task gets an activity
# line and its assignee (else its creator) a News item "unblock" + push (module collab of the recipient,
# burst rule, never the person who completed it).
DEP_MAX = 50


def dep_reaches(c, start, target):
    """True if target is reachable from start along "waits on" edges (start waits on ... on target)."""
    seen, todo = set(), [start]
    while todo:
        x = todo.pop()
        if x == target:
            return True
        if x in seen or len(seen) > 10000:
            continue
        seen.add(x)
        todo.extend(r[0] for r in c.execute("SELECT blocker_id FROM task_deps WHERE task_id=?", (x,)))
    return False


def open_blockers(c, tid):
    return c.execute("""SELECT COUNT(*) FROM task_deps d JOIN tasks b ON b.id=d.blocker_id
                        WHERE d.task_id=? AND b.status=0 AND b.deleted_at IS NULL""", (tid,)).fetchone()[0]


def dep_rows(c, sql, tid, vis):
    out = []
    for r in c.execute(sql, (tid,)):
        if r["deleted_at"]:
            continue  # in the trash: ignored while it is there
        if r["list_id"] in vis:
            out.append({"id": r["id"], "title": r["title"], "status": r["status"], "list_id": r["list_id"],
                        "due": r["due"], "assignee_id": r["assignee_id"], "hidden": False})
        else:
            out.append({"id": None, "title": None, "status": r["status"], "hidden": True})
    return out


@app.get("/api/tasks/<int:tid>/deps")
def deps_get(tid):
    """What the task waits on (blocked_by) and what waits on it (blocking), for the detail panel."""
    c = db()
    need_task(c, tid, write=False)
    vis = vis_ids(c, me())
    return jsonify(
        blocked_by=dep_rows(c, "SELECT t.* FROM task_deps d JOIN tasks t ON t.id=d.blocker_id WHERE d.task_id=? ORDER BY d.created_at, t.id", tid, vis),
        blocking=dep_rows(c, "SELECT t.* FROM task_deps d JOIN tasks t ON t.id=d.task_id WHERE d.blocker_id=? ORDER BY d.created_at, t.id", tid, vis))


def dep_ids(b):
    try:
        return int(b.get("task_id")), int(b.get("blocker_id"))
    except (TypeError, ValueError):
        raise BadInput(tr("Invalid data")) from None


@app.post("/api/deps")
def dep_add():
    """{task_id, blocker_id}: task_id waits on blocker_id."""
    c = db()
    t, bl = dep_ids(body())
    need_task(c, t)                 # the waiting task changes: write access
    need_task(c, bl, write=False)   # the blocker must be visible
    if t == bl:
        return err(tr("A task cannot wait on itself"))
    rows = {r["id"]: r for r in c.execute("SELECT id, title, deleted_at FROM tasks WHERE id IN (?,?)", (t, bl))}
    if rows[t]["deleted_at"] or rows[bl]["deleted_at"]:
        return err(tr("The task is in the trash"), 409)
    if not c.execute("SELECT 1 FROM task_deps WHERE task_id=? AND blocker_id=?", (t, bl)).fetchone():
        if dep_reaches(c, bl, t):
            return err(tr("That would create a circular dependency"))
        if c.execute("SELECT COUNT(*) FROM task_deps WHERE task_id=?", (t,)).fetchone()[0] >= DEP_MAX:
            return err(tr("At most {0} dependencies per task", DEP_MAX))
        c.execute("INSERT INTO task_deps(task_id,blocker_id,created_by,created_at) VALUES(?,?,?,?)",
                  (t, bl, me(), iso_ms(now_utc())))
        log_act(c, t, "dep_add", {"id": bl, "title": rows[bl]["title"][:200]})
        log_act(c, bl, "blocks_add", {"id": t, "title": rows[t]["title"][:200]})
        bump(c)
        c.commit()
    return jsonify(ok=True, task=one_task(c, t))


@app.delete("/api/deps/<int:t>/<int:bl>")
def dep_remove(t, bl):
    """Removes "t waits on bl". bl = 0: every blocker of t the user cannot see (lost access)."""
    c = db()
    need_task(c, t)
    if bl == 0:
        vis = vis_ids(c, me())
        gone = [r[0] for r in c.execute("SELECT d.blocker_id, b.list_id FROM task_deps d JOIN tasks b ON b.id=d.blocker_id WHERE d.task_id=?", (t,))
                if r[1] not in vis]
        for x in gone:
            c.execute("DELETE FROM task_deps WHERE task_id=? AND blocker_id=?", (t, x))
        if gone:
            log_act(c, t, "dep_rm", {"hidden": True, "n": len(gone)})
    else:
        r = c.execute("SELECT b.title, b.list_id FROM task_deps d JOIN tasks b ON b.id=d.blocker_id WHERE d.task_id=? AND d.blocker_id=?",
                      (t, bl)).fetchone()
        if not r or not list_role(c, r["list_id"]):
            raise Denied(404)
        c.execute("DELETE FROM task_deps WHERE task_id=? AND blocker_id=?", (t, bl))
        title = c.execute("SELECT title FROM tasks WHERE id=?", (t,)).fetchone()[0]
        log_act(c, t, "dep_rm", {"id": bl, "title": r["title"][:200]})
        log_act(c, bl, "blocks_rm", {"id": t, "title": title[:200]})
    bump(c)
    c.commit()
    return jsonify(ok=True, task=one_task(c, t))


def unblock_events(c, done_ids):
    """done_ids: tasks just completed (done / won't do, incl. subtasks completed with them). Each open task
    that waited on one of them and has no open blocker left: activity line + News / push (see above)."""
    done_ids = list(dict.fromkeys(done_ids))
    if not done_ids:
        return
    q = ",".join("?" * len(done_ids))
    waiting = {}
    for r in c.execute(f"""SELECT d.task_id, d.blocker_id FROM task_deps d JOIN tasks t ON t.id=d.task_id JOIN tasks b ON b.id=d.blocker_id
                           WHERE d.blocker_id IN ({q}) AND b.status!=0 AND t.status=0 AND t.deleted_at IS NULL
                           ORDER BY d.created_at""", done_ids):
        waiting.setdefault(r["task_id"], r["blocker_id"])
    actor = me()
    for w, bl in waiting.items():
        if open_blockers(c, w):
            continue
        b = c.execute("SELECT title, list_id FROM tasks WHERE id=?", (bl,)).fetchone()
        log_act(c, w, "unblocked", {"id": bl, "title": b["title"][:200]})
        t = c.execute("""SELECT t.*, l.name AS list_name, l.is_inbox AS list_inbox FROM tasks t JOIN lists l ON l.id=t.list_id
                         WHERE t.id=?""", (w,)).fetchone()
        uid = t["assignee_id"] or t["created_by"]
        if not uid or uid == actor:
            continue
        s = collab_user(c, uid, t["list_id"])
        if not s:
            continue
        news_add(c, uid, "unblock", task_id=w, data={"blocker": bl}, actor=actor)
        if not s.get("ntfy_topic") or not burst_gate(c, uid, w, event=True):
            continue
        lg = lang_of(s)
        who = user_names(c, [actor]).get(actor, "?")
        bt = b["title"] if list_role(c, b["list_id"], uid) else tr("a task you cannot see", lg=lg)
        lname = tr("Inbox", lg=lg) if t["list_inbox"] and t["list_name"] == "Eingang" else t["list_name"]
        g.pushes.append((s["ntfy_topic"], tr("Unblocked: {0}", t["title"], lg=lg),
                         tr("{0} completed {1}", who, bt, lg=lg) + " · " + lname, f"{PUBLIC_URL}/#t/{w}"))


def completed_ids(c, tid):
    """The task + its subtasks that are completed now (after do_complete)."""
    return [x for x in [tid, *descendants(c, tid)]
            if (c.execute("SELECT status FROM tasks WHERE id=?", (x,)).fetchone() or [0])[0] != 0]


DEP_ACTS = ("dep_add", "dep_rm", "blocks_add", "blocks_rm", "unblocked")


# ---------------------------------------------------------------- project status + progress, package 3
# Status of a list (owner or edit members set it, with a short note; history in list_status) and a
# News item "status" for the other list members (collab). Progress (in /api/state per list): main tasks
# (subtasks too with the user setting progress_subtasks), all time, done vs. open, won't do and the trash
# left out; done copies of recurring tasks are not counted (a recurring task counts once, as open).
LIST_STATUSES = ("on_track", "at_risk", "off_track", "on_hold", "complete")
STATUS_NOTE_MAX = 500


def list_progress(c, ids, subtasks):
    if not ids:
        return {}
    t0 = local_now().date().isoformat()
    q = ",".join("?" * len(ids))
    sub = "" if subtasks else "AND t.parent_id IS NULL"
    out = {}
    for r in c.execute(f"""SELECT t.list_id, SUM(t.status=0) AS open, SUM(t.status=2) AS done,
                                  SUM(t.status=0 AND t.due IS NOT NULL AND t.due<?) AS overdue,
                                  MIN(CASE WHEN t.status=0 AND t.due>=? THEN t.due END) AS next_due
                           FROM tasks t WHERE t.list_id IN ({q}) AND t.deleted_at IS NULL AND t.status IN (0, 2) {sub}
                             AND NOT (t.status=2 AND EXISTS (SELECT 1 FROM tasks o WHERE o.list_id=t.list_id AND o.id<t.id
                                      AND o.created_at=t.created_at AND o.title=t.title))
                           GROUP BY t.list_id""", (t0, t0, *ids)):
        out[r["list_id"]] = {"done": r["done"] or 0, "total": (r["open"] or 0) + (r["done"] or 0),
                             "overdue": r["overdue"] or 0, "next_due": r["next_due"]}
    return out


@app.post("/api/lists/<int:lid>/status")
def list_status_set(lid):
    """{status: on_track|at_risk|off_track|on_hold|complete|'' (none), note}: owner or edit member."""
    b = body()
    c = db()
    need_list(c, lid)
    lst = c.execute("SELECT * FROM lists WHERE id=?", (lid,)).fetchone()
    if lst["is_inbox"]:
        return err(tr("The inbox has no project status"))
    st = b.get("status") or ""
    if st not in LIST_STATUSES + ("",):
        return err(tr("Unknown status"))
    note = str(b.get("note") or "").strip()[:STATUS_NOTE_MAX] if st else ""
    ts = iso_ms(now_utc())
    c.execute("UPDATE lists SET status=?, status_note=?, status_by=?, status_at=? WHERE id=?", (st, note, me(), ts, lid))
    c.execute("INSERT INTO list_status(list_id,user_id,status,note,created_at) VALUES(?,?,?,?,?)", (lid, me(), st, note, ts))
    for uid in sorted(list_people(c, lid)):
        if uid != me() and collab_user(c, uid, lid):
            news_add(c, uid, "status", list_id=lid, data={"status": st, "note": note, "name": lst["name"]})
    bump(c)
    c.commit()
    return jsonify(ok=True)


@app.get("/api/lists/<int:lid>/status")
def list_status_history(lid):
    """The last status updates of a list (newest first)."""
    c = db()
    need_list(c, lid, write=False)
    rows = c.execute("SELECT * FROM list_status WHERE list_id=? ORDER BY id DESC LIMIT 30", (lid,)).fetchall()
    names = user_names(c, [r["user_id"] for r in rows])
    return jsonify(items=[{"id": r["id"], "user_id": r["user_id"], "name": names.get(r["user_id"], ""), "status": r["status"],
                           "note": r["note"], "created_at": r["created_at"]} for r in rows])


# ---------------------------------------------------------------- custom fields, package 3
# Defined per list by its owner; values are shared by everyone who sees the list (one value per task and
# field), changed by whoever may change the task (not view-only). A task moved to another list keeps its
# values, but only the fields of its current list are shown / filtered (moving it back brings them back).
# Deleting a field deletes its values. Values are stored as text: number canonical ("12.5"), select =
# option id, date = YYYY-MM-DD, checkbox = "1" (unchecked = no row), person = user id (a member of the list).
FIELD_TYPES = ("text", "number", "select", "date", "checkbox", "person", "url")
FIELD_MAX = 20          # per list
FIELD_PINNED_MAX = 2    # chips on the task rows
COLOR_RE = re.compile(r"#[0-9a-fA-F]{3,8}")


def field_dict(r):
    return {"id": r["id"], "list_id": r["list_id"], "name": r["name"], "type": r["type"],
            "options": json.loads(r["options"] or "{}"), "pinned": int(r["pinned"] or 0), "sort": r["sort"]}


def field_clean_def(b, old=None):
    """(name, type, options) of a field definition from the client; raises BadInput."""
    name = str(b.get("name", old["name"] if old else "") or "").strip()[:60]
    if not name:
        raise BadInput(tr("Name missing"))
    ftype = old["type"] if old else b.get("type")
    if ftype not in FIELD_TYPES:
        raise BadInput(tr("Unknown field type"))
    raw = b.get("options") if "options" in b else (json.loads(old["options"] or "{}") if old else {})
    raw = raw if isinstance(raw, dict) else {}
    opts = {}
    if ftype == "number":
        unit = str(raw.get("unit") or "").strip()[:12]
        if unit:
            opts["unit"] = unit
    if ftype == "select":
        items, seen = [], set()
        for o in (raw.get("options") if isinstance(raw.get("options"), list) else [])[:50]:
            if not isinstance(o, dict):
                continue
            nm = str(o.get("name") or "").strip()[:60]
            if not nm:
                continue
            oid = str(o.get("id") or "")
            if not re.fullmatch(r"[A-Za-z0-9_-]{1,16}", oid) or oid in seen:
                oid = secrets.token_hex(4)
            seen.add(oid)
            col = str(o.get("color") or "")
            items.append({"id": oid, "name": nm, "color": col if COLOR_RE.fullmatch(col) else ""})
        if not items:
            raise BadInput(tr("A selection field needs at least one option"))
        opts["options"] = items
    return name, ftype, opts


def fmt_num(x):
    s = ("%.6f" % x).rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def field_value(c, f, v, lid):
    """Validated stored value of field f (row) for a task in list lid; None = no value. Raises BadInput."""
    t, name = f["type"], f["name"]
    if v is None or v == "" or v is False:
        return None
    if isinstance(v, (dict, list)):
        raise BadInput(tr("{0}: invalid value", name))
    if t == "text":
        return str(v).strip()[:1000] or None
    if t == "url":
        s = str(v).strip()
        if not valid_url(s):
            raise BadInput(tr("The link must start with http:// or https://"))
        return s
    if t == "number":
        try:
            x = float(str(v).strip().replace(",", "."))
        except ValueError:
            raise BadInput(tr("{0}: number expected", name)) from None
        if not math.isfinite(x) or abs(x) >= 1e12:
            raise BadInput(tr("{0}: number expected", name))
        return fmt_num(x)
    if t == "date":
        try:
            return date.fromisoformat(str(v)[:10]).isoformat()
        except ValueError:
            raise BadInput(tr("{0}: date expected", name)) from None
    if t == "checkbox":
        return "1" if v in (True, 1, "1", "true") else None
    if t == "select":
        if str(v) not in {o["id"] for o in json.loads(f["options"] or "{}").get("options", [])}:
            raise BadInput(tr("{0}: unknown option", name))
        return str(v)
    if t == "person":
        try:
            uid = int(v)
        except (TypeError, ValueError):
            raise BadInput(tr("unknown user")) from None
        if uid not in list_people(c, lid):
            raise BadInput(tr("Only the owner or a member of the list can be assigned"))
        return str(uid)
    raise BadInput(tr("Unknown field type"))


def field_act(c, f, v):
    """Activity data of a changed value (display snapshot: option name, person name)."""
    d = {"id": f["id"], "name": f["name"], "type": f["type"], "v": v}
    if v is not None and f["type"] == "select":
        o = next((o for o in json.loads(f["options"] or "{}").get("options", []) if o["id"] == v), None)
        d["v"] = o["name"] if o else None
    if v is not None and f["type"] == "person":
        d["v"] = user_names(c, [int(v)]).get(int(v), "?")
    if f["type"] == "number":
        d["unit"] = json.loads(f["options"] or "{}").get("unit", "")
    return d


def set_field_values(c, tid, lid, vals, log=True):
    """{field_id: value|null} for task tid in list lid. Validates everything first (BadInput), then writes."""
    if not isinstance(vals, dict):
        raise BadInput(tr("Invalid data"))
    fields = {r["id"]: r for r in c.execute("SELECT * FROM list_fields WHERE list_id=?", (lid,))}
    new = {}
    for k, v in list(vals.items())[:FIELD_MAX * 2]:
        try:
            fid = int(k)
        except (TypeError, ValueError):
            raise BadInput(tr("Invalid data")) from None
        if fid not in fields:
            raise BadInput(tr("Unknown field"))
        new[fid] = field_value(c, fields[fid], v, lid)
    for fid, v in new.items():
        old = c.execute("SELECT value FROM task_field_values WHERE task_id=? AND field_id=?", (tid, fid)).fetchone()
        if (old[0] if old else None) == v:
            continue
        if v is None:
            c.execute("DELETE FROM task_field_values WHERE task_id=? AND field_id=?", (tid, fid))
        else:
            c.execute("INSERT INTO task_field_values(task_id,field_id,value) VALUES(?,?,?) "
                      "ON CONFLICT(task_id,field_id) DO UPDATE SET value=excluded.value", (tid, fid, v))
        if log:
            log_act(c, tid, "field", field_act(c, fields[fid], v))
    return bool(new)


def need_field(c, fid, owner=True):
    r = c.execute("SELECT * FROM list_fields WHERE id=?", (fid,)).fetchone()
    if not r:
        raise Denied(404)
    need_list(c, r["list_id"], write=owner, owner=owner)
    return r


def fields_pinned_ok(c, lid, fid=None):
    n = c.execute("SELECT COUNT(*) FROM list_fields WHERE list_id=? AND pinned=1 AND id IS NOT ?", (lid, fid)).fetchone()[0]
    return n < FIELD_PINNED_MAX


@app.post("/api/lists/<int:lid>/fields")
def field_create(lid):
    """{name, type, options?, pinned?}: owner only."""
    b = body()
    c = db()
    need_list(c, lid, owner=True)
    if c.execute("SELECT COUNT(*) FROM list_fields WHERE list_id=?", (lid,)).fetchone()[0] >= FIELD_MAX:
        return err(tr("At most {0} fields per list", FIELD_MAX))
    name, ftype, opts = field_clean_def(b)
    pinned = 1 if b.get("pinned") else 0
    if pinned and not fields_pinned_ok(c, lid):
        return err(tr("At most {0} fields can be shown on the task rows", FIELD_PINNED_MAX))
    srt = c.execute("SELECT COALESCE(MAX(sort),0)+1 FROM list_fields WHERE list_id=?", (lid,)).fetchone()[0]
    fid = c.execute("INSERT INTO list_fields(list_id,name,type,options,pinned,sort,created_at) VALUES(?,?,?,?,?,?,?)",
                    (lid, name, ftype, json.dumps(opts, ensure_ascii=False), pinned, srt, iso(now_utc()))).lastrowid
    bump(c)
    c.commit()
    return jsonify(field_dict(c.execute("SELECT * FROM list_fields WHERE id=?", (fid,)).fetchone()))


@app.patch("/api/fields/<int:fid>")
def field_update(fid):
    """{name?, options?, pinned?, sort?}: owner only; the type cannot change. Removed select options
    lose their values."""
    b = body()
    c = db()
    r = need_field(c, fid)
    name, _, opts = field_clean_def(b, r)
    if "pinned" in b:
        pinned = 1 if b["pinned"] else 0
        if pinned and not r["pinned"] and not fields_pinned_ok(c, r["list_id"], fid):
            return err(tr("At most {0} fields can be shown on the task rows", FIELD_PINNED_MAX))
        c.execute("UPDATE list_fields SET pinned=? WHERE id=?", (pinned, fid))
    if "sort" in b:
        try:
            c.execute("UPDATE list_fields SET sort=? WHERE id=?", (float(b["sort"]), fid))
        except (TypeError, ValueError):
            return err(tr("Invalid data"))
    if r["type"] == "select":
        keep = {o["id"] for o in opts["options"]}
        for (oid,) in c.execute("SELECT DISTINCT value FROM task_field_values WHERE field_id=?", (fid,)).fetchall():
            if oid not in keep:
                c.execute("DELETE FROM task_field_values WHERE field_id=? AND value=?", (fid, oid))
    c.execute("UPDATE list_fields SET name=?, options=? WHERE id=?", (name, json.dumps(opts, ensure_ascii=False), fid))
    bump(c)
    c.commit()
    return jsonify(field_dict(c.execute("SELECT * FROM list_fields WHERE id=?", (fid,)).fetchone()))


@app.delete("/api/fields/<int:fid>")
def field_delete(fid):
    c = db()
    need_field(c, fid)
    n = c.execute("DELETE FROM task_field_values WHERE field_id=?", (fid,)).rowcount
    c.execute("DELETE FROM list_fields WHERE id=?", (fid,))
    bump(c)
    c.commit()
    return jsonify(ok=True, values=n)


def search_field_ids(c, uid, q):
    """Task ids whose text / link / select value matches q (fields of the task's current list, visible lists)."""
    ql = q.casefold()
    hits = set()
    for f in c.execute(f"SELECT * FROM list_fields WHERE list_id IN {vis_sql()}", (uid, uid)).fetchall():
        if f["type"] in ("text", "url"):
            hits.update(r[0] for r in c.execute("""SELECT v.task_id FROM task_field_values v JOIN tasks t ON t.id=v.task_id
                                                   WHERE v.field_id=? AND t.list_id=? AND v.value LIKE ?""", (f["id"], f["list_id"], f"%{q}%")))
        elif f["type"] == "select":
            oids = [o["id"] for o in json.loads(f["options"] or "{}").get("options", []) if ql in o["name"].casefold()]
            for oid in oids:
                hits.update(r[0] for r in c.execute("""SELECT v.task_id FROM task_field_values v JOIN tasks t ON t.id=v.task_id
                                                       WHERE v.field_id=? AND t.list_id=? AND v.value=?""", (f["id"], f["list_id"], oid)))
    return hits


def tpl_fields_of(c, lid):
    """List template: the field definitions (in order) + {field id: index}."""
    rows = c.execute("SELECT * FROM list_fields WHERE list_id=? ORDER BY sort, id", (lid,)).fetchall()
    return ([{"name": r["name"], "type": r["type"], "options": json.loads(r["options"] or "{}"), "pinned": int(r["pinned"] or 0)} for r in rows],
            {r["id"]: i for i, r in enumerate(rows)}, {r["id"]: r["type"] for r in rows})


def tpl_clean_fields(defs):
    out = []
    for d in (defs if isinstance(defs, list) else [])[:FIELD_MAX]:
        if not isinstance(d, dict):
            continue
        try:
            name, ftype, opts = field_clean_def(d)
        except BadInput as e:
            raise ValueError(str(e)) from None
        out.append({"name": name, "type": ftype, "options": opts, "pinned": 1 if d.get("pinned") else 0})
    pins = 0
    for d in out:  # at most FIELD_PINNED_MAX pinned
        pins += d["pinned"]
        if pins > FIELD_PINNED_MAX:
            d["pinned"] = 0
    return out


# ---------------------------------------------------------------- statistics (per user)
# Completions count for the person who completed (tasks.completed_by; done copies of recurring tasks
# are the completions of their occurrences), won't-do is not a completion. Tasks in the trash still
# count until the trash is emptied. Window: the last 12 weeks (Monday-based, incl. the current one).
# Overdue trend: at the end of each week (today for the current one), the tasks I am responsible for
# (assigned to me, or unassigned in my own lists) whose due date had passed and that were still open,
# based on today's due dates. On time: completed on or before the due day.
STATS_WEEKS = 12


def _local_day(ts):
    return parse_iso(ts).astimezone(TZ).date() if ts else None


@app.get("/api/stats")
def stats_api():
    c = db()
    uid = me()
    today = local_now().date()
    mon0 = today - timedelta(days=today.weekday()) - timedelta(weeks=STATS_WEEKS - 1)
    weeks = [mon0 + timedelta(weeks=i) for i in range(STATS_WEEKS)]
    lo = iso(datetime(mon0.year, mon0.month, mon0.day, tzinfo=TZ))
    vis = {l["id"]: l for l in visible_lists(c, uid)}
    wk = lambda d: (d - mon0).days // 7  # noqa: E731

    days_all, per_day, per_week, by_list = set(), {}, [0] * STATS_WEEKS, {}
    with_due = ontime = 0
    for r in c.execute("""SELECT list_id, due, completed_at FROM tasks WHERE completed_by=? AND status=2
                          AND completed_at IS NOT NULL""", (uid,)):
        d = _local_day(r["completed_at"])
        days_all.add(d)
        if d < mon0 or d > today:
            continue
        per_day[d.isoformat()] = per_day.get(d.isoformat(), 0) + 1
        per_week[wk(d)] += 1
        k = r["list_id"] if r["list_id"] in vis else 0
        by_list[k] = by_list.get(k, 0) + 1
        if r["due"]:
            with_due += 1
            ontime += d.isoformat() <= r["due"]

    # streak: days in a row with at least one completion (today still counts as "running" when empty)
    cur, d = 0, today if today in days_all else today - timedelta(days=1)
    while d in days_all:
        cur, d = cur + 1, d - timedelta(days=1)
    best, run, prev = 0, 0, None
    for d in sorted(days_all):
        run = run + 1 if prev and (d - prev).days == 1 else 1
        best, prev = max(best, run), d

    samples = [w + timedelta(days=6) for w in weeks[:-1]] + [today]
    over = [0] * len(samples)
    for r in c.execute("""SELECT t.due, t.status, t.created_at, t.completed_at, t.deleted_at FROM tasks t JOIN lists l ON l.id=t.list_id
                          WHERE t.due IS NOT NULL AND t.due<? AND (t.assignee_id=? OR (t.assignee_id IS NULL AND l.owner_id=?))
                            AND (t.status=0 OR t.completed_at>=?)""", (today.isoformat(), uid, uid, lo)):
        created, done, deleted = _local_day(r["created_at"]), _local_day(r["completed_at"]), _local_day(r["deleted_at"])
        if r["status"] != 0 and not done:
            continue
        for i, s in enumerate(samples):
            if r["due"] < s.isoformat() and created <= s and (not deleted or deleted > s) \
                    and (r["status"] == 0 or done > s):
                over[i] += 1

    f_day, f_week, f_list = {}, [0.0] * STATS_WEEKS, {}
    for p in c.execute("""SELECT p.*, t.list_id FROM pomos p LEFT JOIN tasks t ON t.id=p.task_id
                          WHERE p.user_id=? AND p.kind IN ('focus','stopwatch') AND p.end IS NOT NULL AND p.start>=?""", (uid, lo)):
        d = _local_day(p["start"])
        if d < mon0 or d > today:
            continue
        m = pomo_elapsed(p) / 60
        f_day[d.isoformat()] = f_day.get(d.isoformat(), 0) + m
        f_week[wk(d)] += m
        k = (p["list_id"] if p["list_id"] in vis else 0) if p["task_id"] else -1
        f_list[k] = f_list.get(k, 0) + m

    # tracked time (module "time"): my entries by the local day they start (running timer up to now)
    t_week, t_list, ref = [0] * STATS_WEEKS, {}, now_utc()
    for e in c.execute("SELECT start, end, seconds, list_id FROM time_entries WHERE user_id=? AND start>=?", (uid, lo)):
        d = _local_day(e["start"])
        if d < mon0 or d > today:
            continue
        sec = entry_secs(e, ref)
        t_week[wk(d)] += sec
        k = e["list_id"] if e["list_id"] in vis else 0
        t_list[k] = t_list.get(k, 0) + sec

    def lst(k):
        l = vis.get(k)
        return {"id": k, "name": l["name"] if l else "", "is_inbox": bool(l and l["is_inbox"]), "color": l["color"] if l else ""}
    return jsonify(
        today=today.isoformat(), weeks=[w.isoformat() for w in weeks],
        done={"per_day": per_day, "per_week": per_week, "total": sum(per_week),
              "today": per_day.get(today.isoformat(), 0), "this_week": per_week[-1],
              "by_list": sorted(({**lst(k), "n": n} for k, n in by_list.items()), key=lambda x: (-x["n"], x["id"] == 0))},
        ontime={"with_due": with_due, "ontime": ontime, "rate": round(100 * ontime / with_due) if with_due else None},
        streak={"current": cur, "best": best},
        overdue=[{"date": s.isoformat(), "n": n} for s, n in zip(samples, over)],
        focus={"per_day": {k: round(v) for k, v in f_day.items()}, "per_week": [round(v) for v in f_week],
               "total": round(sum(f_week)), "this_week": round(f_week[-1]),
               "by_list": sorted(({**lst(k), "minutes": round(v)} for k, v in f_list.items() if round(v)),
                                 key=lambda x: -x["minutes"])},
        time={"per_week": [round(v / 60) for v in t_week], "total": round(sum(t_week) / 60), "this_week": round(t_week[-1] / 60),
              "by_list": sorted(({**lst(k), "minutes": round(v / 60)} for k, v in t_list.items() if round(v / 60)),
                                key=lambda x: -x["minutes"])},
    )


# ---------------------------------------------------------------- calendar feed (ICS subscription)
# GET /ical/<user id>.<secret>.ics — a subscribable calendar of the user's open tasks with a date (all
# visible lists, or only "mine": unassigned in my own lists + assigned to me). The token in the path is
# the only credential: this path must bypass a login proxy and never trusts the proxy header.
# Timed tasks are events with their duration (default 30 min) in the server time zone (VTIMEZONE
# included), all-day tasks all-day events (a start date makes it a range). Recurring tasks carry their
# RRULE, so calendars show every future occurrence of the open instance (completing it moves the
# series on); "repeat from completion date" tasks only show their next date. Reminders -> VALARM.
ICAL_FAIL_LIMIT = 30  # wrong tokens per client IP within FAIL_WINDOW, then 429
ICAL_MAX = 3000


def ics_text(s):
    return (str(s or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,")
            .replace("\r\n", "\n").replace("\r", "\n").replace("\n", "\\n"))


def ics_fold(line):
    """RFC 5545 folding: lines of at most 75 octets, never inside a UTF-8 sequence."""
    if len(line.encode("utf-8")) <= 75:
        return line
    out, cur, n, limit = [], "", 0, 75
    for ch in line:
        k = len(ch.encode("utf-8"))
        if n + k > limit:
            out.append(cur)
            cur, n, limit = "", 0, 74  # continuation lines start with a space
        cur += ch
        n += k
    out.append(cur)
    return "\r\n ".join(out)


def ics_utc(dt):
    return dt.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def ics_dur(minutes):
    sign, m = ("-" if minutes < 0 else ""), abs(int(minutes))
    d, m = divmod(m, 1440)
    h, m = divmod(m, 60)
    t = (f"{h}H" if h else "") + (f"{m}M" if m else "")
    return f"{sign}P{f'{d}D' if d else ''}{'T' + t if t else ''}" if d or t else "PT0S"


def ics_vtimezone(tz, year):
    """VTIMEZONE of tz, derived from its transitions in `year` (yearly rules like the EU / US ones)."""
    key = getattr(tz, "key", "UTC")

    def off(x):
        o = int(x.utcoffset().total_seconds() // 60)
        return f"{'+' if o >= 0 else '-'}{abs(o) // 60:02d}{abs(o) % 60:02d}"
    utc0 = datetime(year, 1, 1, tzinfo=timezone.utc)
    trans, prev = [], utc0.astimezone(tz)
    for h in range(1, 366 * 24):
        cur = (utc0 + timedelta(hours=h)).astimezone(tz)
        if cur.utcoffset() != prev.utcoffset():
            for m in range(60):  # to the minute
                x = (utc0 + timedelta(hours=h - 1, minutes=m + 1)).astimezone(tz)
                if x.utcoffset() != prev.utcoffset():
                    trans.append((prev, x))
                    break
        prev = cur
    lines = ["BEGIN:VTIMEZONE", f"TZID:{key}"]
    if not trans:
        o = off(utc0.astimezone(tz))
        return lines + ["BEGIN:STANDARD", "DTSTART:19700101T000000", f"TZOFFSETFROM:{o}", f"TZOFFSETTO:{o}",
                        f"TZNAME:{utc0.astimezone(tz).tzname()}", "END:STANDARD", "END:VTIMEZONE"]
    from dateutil.rrule import rrule, YEARLY, weekdays
    for before, after in trans[:2]:
        wall = (after.astimezone(timezone.utc) + before.utcoffset()).replace(tzinfo=None)  # old wall clock
        last = (wall.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
        nth = -1 if wall.day + 7 > last.day else (wall.day - 1) // 7 + 1
        wd = weekdays[wall.weekday()]
        first = rrule(YEARLY, bymonth=wall.month, byweekday=wd(nth), dtstart=datetime(1970, 1, 1, wall.hour, wall.minute))[0]
        kind = "DAYLIGHT" if after.utcoffset() > before.utcoffset() else "STANDARD"
        lines += [f"BEGIN:{kind}", f"DTSTART:{first:%Y%m%dT%H%M%S}",
                  f"RRULE:FREQ=YEARLY;BYMONTH={wall.month};BYDAY={nth}{['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'][wall.weekday()]}",
                  f"TZOFFSETFROM:{off(before)}", f"TZOFFSETTO:{off(after)}", f"TZNAME:{after.tzname()}", f"END:{kind}"]
    return lines + ["END:VTIMEZONE"]


RRULE_OK = re.compile(r"[A-Z]+=[A-Za-z0-9,+\-]+(;[A-Z]+=[A-Za-z0-9,+\-]+)*")


def ics_rrule(rep, dtstart, timed):
    """-> (rule text for the calendar or None, first occurrence). The rule is only used when dateutil can
    parse it; UNTIL becomes a UTC date-time for timed events (RFC 5545)."""
    rep = (rep or "").removeprefix("RRULE:").strip().rstrip(";")
    if not rep or not RRULE_OK.fullmatch(rep):
        return None, None
    parts = []
    for p in rep.split(";"):
        k, v = p.split("=", 1)
        if k == "UNTIL":
            try:
                d = date(int(v[:4]), int(v[4:6]), int(v[6:8]))
            except ValueError:
                return None, None
            v = ics_utc(datetime(d.year, d.month, d.day, 23, 59, 59, tzinfo=TZ)) if timed else f"{d:%Y%m%d}"
        parts.append(f"{k}={v}")
    rule = ";".join(parts)
    try:
        first = next(iter(rrulestr(rule.replace("Z", "") if timed else rule, dtstart=dtstart,
                                   ignoretz=True)), None)
    except (ValueError, TypeError, StopIteration):
        return None, None
    return rule, first


def ics_event(t, s, lg, host, key, stamp):
    """VEVENT lines (1 or 2: an occurrence that does not fit its own RRULE is split off)."""
    due = date.fromisoformat(t["due"])
    timed = bool(t["due_time"])
    if timed:
        hh, mm = map(int, t["due_time"].split(":"))
        start = datetime(due.year, due.month, due.day, hh, mm)
    else:
        start = datetime(due.year, due.month, due.day)
    lname = tr("Inbox", lg=lg) if t["list_inbox"] and t["list_name"] == "Eingang" else t["list_name"]
    deep = f"{PUBLIC_URL}/#t/{t['id']}"
    desc = ([t["content"].strip()] if (t["content"] or "").strip() else []) + \
        [tr("List: {0}", lname, lg=lg)] + ([tr("Link: {0}", t["url"], lg=lg)] if t["url"] else []) + \
        [tr("Open in Abhako: {0}", deep, lg=lg)]
    rule, first = (None, None)
    if t["repeat"] and t["repeat_from"] != "done":
        rule, first = ics_rrule(t["repeat"], start, timed)

    def when(st):
        if timed:
            en = st + timedelta(minutes=max(5, t["duration"] or 30))
            return [f"DTSTART;TZID={key}:{st:%Y%m%dT%H%M%S}", f"DTEND;TZID={key}:{en:%Y%m%dT%H%M%S}"]
        s0 = st.date()
        if t["start"] and t["start"] < t["due"]:  # timeline range: same length for every occurrence
            s0 -= due - date.fromisoformat(t["start"])
        return [f"DTSTART;VALUE=DATE:{s0:%Y%m%d}", f"DTEND;VALUE=DATE:{st.date() + timedelta(days=1):%Y%m%d}"]

    def alarms():
        if s.get("ical_alarms") == "0" or not t["reminders"]:
            return []
        out = []
        base = 0 if timed else hm_minutes(s.get("allday_time") or "09:00")
        for off in t["reminders"].split(","):
            if off.strip().isdigit():
                out += ["BEGIN:VALARM", "ACTION:DISPLAY", f"DESCRIPTION:{ics_text(t['title'])}",
                        f"TRIGGER:{ics_dur(base - int(off))}", "END:VALARM"]
        return out

    def vevent(uid, st, rr):
        prio = {5: 1, 3: 5, 1: 9}.get(t["priority"])
        return (["BEGIN:VEVENT", f"UID:{uid}", f"DTSTAMP:{stamp}", f"CREATED:{ics_utc(parse_iso(t['created_at']))}",
                 f"LAST-MODIFIED:{ics_utc(parse_iso(t['updated_at']))}", f"SUMMARY:{ics_text(t['title'])}"] + when(st) +
                ([f"RRULE:{rr}"] if rr else []) +
                [f"DESCRIPTION:{ics_text(chr(10).join(desc))}", f"URL:{deep}", "TRANSP:TRANSPARENT"] +
                ([f"PRIORITY:{prio}"] if prio else []) + alarms() + ["END:VEVENT"])
    uid = f"task-{t['id']}@{host}"
    if not rule:
        return vevent(uid, start, None)
    if first == start:
        return vevent(uid, start, rule)
    # the open occurrence is not on the rule's pattern (moved by hand): own event + the series after it
    cnt = rr_count(rule)
    if cnt is not None:
        if cnt <= 1:
            return vevent(uid, start, None)
        rule = rr_with_count(rule, cnt - 1)
    return vevent(uid, start, None) + (vevent(f"task-{t['id']}-series@{host}", first, rule) if first else [])


def hm_minutes(s):
    try:
        h, m = map(int, s.split(":"))
        return h * 60 + m
    except ValueError:
        return 540


def ics_build(c, u):
    uid = u["id"]
    s = usettings(c, uid)
    lg = s.get("lang") if s.get("lang") in LANGS else "en"
    where, args = f"t.status=0 AND t.deleted_at IS NULL AND t.due IS NOT NULL AND t.list_id IN {vis_sql()}", [uid, uid]
    if s.get("ical_scope") == "mine":
        where += " AND ((l.owner_id=? AND (t.assignee_id IS NULL OR t.assignee_id=?)) OR t.assignee_id=?)"
        args += [uid, uid, uid]
    rows = c.execute(f"""SELECT t.*, l.name AS list_name, l.is_inbox AS list_inbox FROM tasks t JOIN lists l ON l.id=t.list_id
                         WHERE {where} ORDER BY t.due, t.id LIMIT {ICAL_MAX}""", args).fetchall()
    host = urllib.parse.urlparse(PUBLIC_URL).hostname or "abhako"
    key = getattr(TZ, "key", "UTC")
    stamp = ics_utc(now_utc())
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Abhako//Tasks//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
             f"X-WR-CALNAME:{ics_text(APP_NAME + ' · ' + (u['display_name'] or u['username']))}",
             f"X-WR-CALDESC:{ics_text(tr('Open tasks with a date', lg=lg))}", f"X-WR-TIMEZONE:{key}",
             "REFRESH-INTERVAL;VALUE=DURATION:PT15M", "X-PUBLISHED-TTL:PT15M"]
    if any(r["due_time"] for r in rows):
        lines += ics_vtimezone(TZ, local_now().year)
    for t in rows:
        try:
            lines += ics_event(t, s, lg, host, key, stamp)
        except (ValueError, TypeError) as e:  # one broken row never breaks the whole feed
            print("ical: skipping task", t["id"], e, flush=True)
    lines.append("END:VCALENDAR")
    return "\r\n".join(ics_fold(x) for x in lines) + "\r\n"


@app.get("/ical/<token>.ics")
def ical_feed(token):
    keys = [("ical:" + client_ip(), ICAL_FAIL_LIMIT)]
    if _rate_blocked(keys):
        return Response("Too many requests\n", 429, content_type="text/plain; charset=utf-8")
    c = db()
    uid_s, _, secret = token.partition(".")
    u = None
    if uid_s.isdigit() and secret:
        r = c.execute("SELECT * FROM users WHERE id=? AND disabled=0", (int(uid_s),)).fetchone()
        if r and r["ical_token"] and hmac.compare_digest(r["ical_token"].encode(), secret.encode()):
            u = r
    if not u:
        _rate_fail(keys)
        return Response("Not found\n", 404, content_type="text/plain; charset=utf-8")
    return Response(ics_build(c, u), content_type="text/calendar; charset=utf-8",
                    headers={"Cache-Control": "no-cache, private", "Content-Disposition": 'inline; filename="abhako.ics"',
                             "X-Robots-Tag": "noindex"})


def ical_url(u):
    return f"{PUBLIC_URL}/ical/{u['id']}.{u['ical_token']}.ics" if u["ical_token"] else None


@app.get("/api/ical")
def ical_info():
    u = db().execute("SELECT id, ical_token FROM users WHERE id=?", (me(),)).fetchone()
    return jsonify(url=ical_url(u))


@app.post("/api/ical")
def ical_set():
    """{action: create | rotate | off}: create keeps an existing link, rotate replaces it (the old URL
    stops working at once), off removes it."""
    a = body().get("action")
    c = db()
    u = c.execute("SELECT id, ical_token FROM users WHERE id=?", (me(),)).fetchone()
    if a == "off":
        c.execute("UPDATE users SET ical_token=NULL WHERE id=?", (me(),))
    elif a == "rotate" or (a == "create" and not u["ical_token"]):
        c.execute("UPDATE users SET ical_token=? WHERE id=?", (secrets.token_urlsafe(32), me()))
    elif a != "create":
        return err(tr("unknown"))
    c.commit()
    return jsonify(url=ical_url(c.execute("SELECT id, ical_token FROM users WHERE id=?", (me(),)).fetchone()))


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


def import_ticktick(c, text, uid):
    """Imports into the lists of user uid (matched by name among the lists they own)."""
    text = text.lstrip("﻿")
    i = text.find('"Folder Name"')
    if i < 0:
        raise ValueError(tr("Not a TickTick CSV (header 'Folder Name' missing)", lg=lang(c, uid)))
    rows = list(csv.DictReader(io.StringIO(text[i:])))
    lists = {r["name"]: r["id"] for r in c.execute("SELECT id, name FROM lists WHERE owner_id=? AND is_inbox=0", (uid,))}
    inbox = my_inbox(c, uid)
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
            srt = my_max_sort(c, uid) + 1
            lid = c.execute("INSERT INTO lists(name,folder,sort,view,created_at,owner_id) VALUES(?,?,?,?,?,?)",
                            (name, r.get("Folder Name") or "", srt,
                             "kanban" if r.get("View Mode") == "kanban" else "list", ts, uid)).lastrowid
            lists[name] = lid
            stats["lists"] += 1
        tt = r.get("taskId") or None
        old = c.execute("SELECT id FROM tasks WHERE tt_id=? AND created_by=?", (tt, uid)).fetchone() if tt else None
        if old:
            idmap[tt] = old[0]
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
               reminded,repeat,sort,created_at,updated_at,completed_at,tt_id,start,created_by,completed_by)
               VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (lid, sec, (r.get("Title") or tr("(untitled)", lg=lang(c, uid))).strip(), content, int(r.get("Priority") or 0),
             status, due, due_time, rems, json.dumps(reminded), repeat, stats["tasks"], created, ts, completed, tt,
             start, uid, uid if completed else None))
        idmap[tt] = cur.lastrowid
        tags = [t.strip() for t in (r.get("Tags") or "").split(",") if t.strip()]
        if tags:
            set_tags(c, cur.lastrowid, tags, uid)
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
        stats = import_ticktick(db(), f.read().decode("utf-8-sig"), me())
    except (ValueError, KeyError) as e:
        return err(str(e))
    return jsonify(stats)


# ---------------------------------------------------------------- watchdog / ntfy

def ntfy(title, msg, prio="default", click=None, topic=None, actions=None):
    if not topic:
        return False
    hdr = {"Title": title.encode("utf-8"), "Priority": prio}  # no Tags header: no emoji icon in the push
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


def reminder_recipient(c, t, users):
    """Assignee, else the creator, else the list owner -- the first one that (still) sees the list."""
    for uid in (t["assignee_id"], t["created_by"], t["list_owner"]):
        if uid and uid in users and (uid == t["list_owner"] or list_role(c, t["list_id"], uid)):
            return uid
    return None


def watchdog_tick(c):
    if PL_TOKEN:
        paperless_poll(c)
    users = {r["id"]: r for r in c.execute("SELECT * FROM users WHERE disabled=0")}
    S = {uid: usettings(c, uid) for uid in users}
    LG = {uid: s.get("lang") if s.get("lang") in LANGS else "en" for uid, s in S.items()}
    task_push_tick(c, users, S, LG)
    news_cleanup(c)
    time_watchdog(c, users, S, LG)
    now = local_now()
    # task reminders -- fire once per (due, offset); skip if missed by > 6 h. Goes to the assignee,
    # unassigned tasks to their creator.
    rows = c.execute("""SELECT t.*, l.name AS list_name, l.is_inbox AS list_inbox, l.owner_id AS list_owner
                        FROM tasks t JOIN lists l ON l.id=t.list_id
                        WHERE t.status=0 AND t.deleted_at IS NULL AND t.due IS NOT NULL
                          AND t.reminders!=''""").fetchall()
    for t in rows:
        rcpt = reminder_recipient(c, t, users)
        s, lg = S.get(rcpt, USER_DEFAULTS), LG.get(rcpt, "en")
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
            if now - at > timedelta(hours=6) or not rcpt:
                continue
            when = tr("all day", lg=lg) if not t["due_time"] else tr("at {0}", t["due_time"], lg=lg)
            day = tr("today", lg=lg) if t["due"] == now.date().isoformat() else \
                date.fromisoformat(t["due"]).strftime("%d.%m." if lg == "de" else "%d %b")
            lname = tr("Inbox", lg=lg) if t["list_inbox"] and t["list_name"] == "Eingang" else t["list_name"]
            ntfy(t["title"], tr("Due {0} {1} · {2}", day, when, lname, lg=lg),
                 "high" if t["priority"] == 5 else "default", f"{PUBLIC_URL}/#t/{t['id']}", topic=s["ntfy_topic"],
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
            if p["user_id"] not in users:
                continue
            s, lg = S[p["user_id"]], LG[p["user_id"]]
            if p["kind"] == "focus":
                ntfy(tr("Focus done", lg=lg), tr("{0} min{1}. Time for a break.", p["minutes"], " · " + p["title"] if p["title"] else "", lg=lg),
                     "default", f"{PUBLIC_URL}/#pomo", topic=s["ntfy_topic"])
            else:
                ntfy(tr("Break is over", lg=lg), tr("Back to it.", lg=lg), "default", f"{PUBLIC_URL}/#pomo", topic=s["ntfy_topic"])
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
        if h["user_id"] not in users:
            continue
        s, lg = S[h["user_id"]], LG[h["user_id"]]
        done = c.execute("SELECT count FROM habit_logs WHERE habit_id=? AND day=?", (h["id"], today)).fetchone()
        if not done or done[0] < h["goal"]:
            ntfy(tr("Habit: {0}", h["name"], lg=lg), tr("Still open today.", lg=lg), "default", f"{PUBLIC_URL}/#habits",
                 topic=s["ntfy_topic"])
    # daily digest per user: tasks in my own lists (unassigned or mine) + tasks assigned to me
    for uid in users:
        s, lg = S[uid], LG[uid]
        dt = s.get("digest_time") or ""
        if not dt or s.get("digest_sent") == today or now.strftime("%H:%M") < dt:
            continue
        uset(c, uid, "digest_sent", today)
        c.commit()
        rows = c.execute(f"""SELECT t.title, t.due, t.due_time FROM tasks t JOIN lists l ON l.id=t.list_id
                             WHERE t.status=0 AND t.deleted_at IS NULL AND t.parent_id IS NULL
                               AND t.due IS NOT NULL AND t.due<=?
                               AND ((l.owner_id=? AND (t.assignee_id IS NULL OR t.assignee_id=?))
                                    OR (t.assignee_id=? AND t.list_id IN {vis_sql()}))
                             ORDER BY t.due, t.due_time IS NULL, t.due_time, t.priority DESC""",
                         (today, uid, uid, uid, uid, uid)).fetchall()
        if rows:
            over = sum(1 for r in rows if r["due"] < today)
            lines = [f"- {r['title']}" + (f" ({r['due_time']})" if r["due_time"] else "") for r in rows[:15]]
            head = trn("{0} task today", "{0} tasks today", len(rows), lg=lg) + \
                (tr(", {0} of them overdue", over, lg=lg) if over else "")
            ntfy(tr("Today", lg=lg), head + "\n" + "\n".join(lines), "default", f"{PUBLIC_URL}/#today", topic=s["ntfy_topic"])


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
    if len(sys.argv) >= 3 and sys.argv[1] == "import":
        c = connect()
        uid = default_uid(c)
        if len(sys.argv) == 4:
            uid = c.execute("SELECT id FROM users WHERE username=?", (sys.argv[3].lower(),)).fetchone()[0]
        print(import_ticktick(c, open(sys.argv[2], encoding="utf-8-sig").read(), uid))
        c.close()
        sys.exit(0)
    if len(sys.argv) == 3 and sys.argv[1] == "set-password":  # docker exec -it <container> python app.py set-password <user>
        import getpass
        c = connect()
        pw = getpass.getpass("new password: ")
        if len(pw) < MIN_PASSWORD or pw != getpass.getpass("again: "):
            sys.exit(f"passwords differ or shorter than {MIN_PASSWORD} characters")
        n = c.execute("UPDATE users SET password_hash=?, disabled=0 WHERE username=?",
                      (generate_password_hash(pw), sys.argv[2].lower())).rowcount
        c.commit()
        c.close()
        sys.exit(0 if n else f"no user {sys.argv[2]!r}")
    from waitress import serve
    port = int(os.environ.get("PORT", 3040))
    listen = f"0.0.0.0:{port}" + (f" 0.0.0.0:{AUTH_PROXY_PORT}" if AUTH_PROXY_PORT and AUTH_PROXY_PORT != str(port) else "")
    serve(app, listen=listen, threads=8)
