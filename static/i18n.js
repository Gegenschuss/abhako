/* Abhako i18n. German is the source text: tr('Deutscher Text', ...args) returns the English
   text when the UI language (server setting "lang") is 'en', else the German. {0}, {1} = args.
   An English value can be [singular, plural]: picked by the first arg (=== 1 -> singular).
   'Text|ctx' disambiguates identical German words (German shows the part before '|').
   User content (task titles, list names, tags, notes) never goes through tr(). */
'use strict';
const I18N_LS_KEY = 'tasks.lang';
function uiLang() {
  if (typeof S !== 'undefined' && S.settings && S.settings.lang) return S.settings.lang;
  try { return JSON.parse(localStorage.getItem(I18N_LS_KEY)) || 'de'; } catch { return 'de'; }
}
const isEn = () => uiLang() === 'en';
const LOCALE = () => isEn() ? 'en-GB' : 'de-DE';
function tr(de, ...a) {
  let s = de;
  if (isEn()) {
    const v = I18N_EN[de];
    s = Array.isArray(v) ? v[a[0] === 1 ? 0 : 1] : v ?? de;
  }
  const bar = s.indexOf('|'); if (bar > 0 && !/[<>]/.test(s)) s = s.slice(0, bar);
  return a.length ? s.replace(/\{(\d+)\}/g, (m, i) => a[i] ?? m) : s;
}
// array that reads the German or English variant depending on the current language
function langArr(de, en) { return new Proxy(de, {get: (_, k) => Reflect.get(isEn() ? en : de, k)}); }

const I18N_EN = {
  // dates, relative labels
  'Heute': 'Today', 'Morgen': 'Tomorrow', 'Gestern': 'Yesterday', 'morgen': 'tomorrow',
  'Überfällig': 'Overdue', 'Ohne Datum': 'No date', 'Nächste 7 Tage': 'Next 7 days', '7 Tage': '7 days',
  'Nächste 3 Tage': 'Next 3 days', 'Dieser Monat': 'This month', 'Später': 'Later', 'KW {0}': 'Week {0}',
  'Monat': 'Month', 'Woche': 'Week', 'Tag|day': 'Day', 'Timeline': 'Timeline', 'ganzt.': 'all day',
  'Datum': 'Date', 'Kein Datum': 'No date', 'Nä. Woche': 'Next week', 'Ganztägig': 'All day', 'ganztägig': 'all day',
  'Dauer {0}': 'Duration {0}', 'Beginn': 'Start', 'Kein Zeitraum': 'No date range', 'Uhrzeit': 'Time',
  'Datum wählen…': 'Pick a date…', 'Nächste Woche (Mo)': 'Next week (Mon)', 'In 1 Stunde': 'In 1 hour', 'in 1 h': 'in 1 h',
  'In 3 Stunden': 'In 3 hours', 'in 3 h': 'in 3 h', 'Heute Abend (19:00)': 'Tonight (7 pm)', 'heute 19:00': 'today 7 pm',
  'Morgen 9:00': 'Tomorrow 9 am', 'morgen 9:00': 'tomorrow 9 am',
  // repeat
  'Täglich': 'Daily', 'Alle {0} Tage': 'Every {0} days', 'Werktags': 'Weekdays', 'Wöchentlich': 'Weekly',
  'Alle {0} Wochen': 'Every {0} weeks', 'Monatlich': 'Monthly', 'Alle {0} Monate': 'Every {0} months', 'am {0}.': 'on day {0}',
  'Jährlich': 'Yearly', 'Alle {0} Jahre': 'Every {0} years', 'Wiederholt': 'Repeats', 'noch {0}×': '{0}× left', 'bis {0}': 'until {0}',
  'Wöchentlich ({0})': 'Weekly ({0})', 'Alle 2 Wochen ({0})': 'Every 2 weeks ({0})', 'Monatlich (am {0}.)': 'Monthly (on day {0})',
  'Benutzerdefiniert (RRULE)…': 'Custom (RRULE)…', 'Ende': 'Ends', 'nie': 'never', 'nach Anzahl': 'after count', 'am Datum': 'on date',
  'mal': ['time', 'times'], 'ab Erledigung wiederholen': 'repeat from completion date', 'RRULE, z.B. FREQ=WEEKLY;INTERVAL=3;BYDAY=MO,TH': 'RRULE, e.g. FREQ=WEEKLY;INTERVAL=3;BYDAY=MO,TH',
  // reminders
  'Pünktlich': 'On time', '5 min vorher': '5 min before', '15 min': '15 min', '30 min': '30 min', '1 h': '1 h', '2 h': '2 h',
  '1 Tag': '1 day', '2 Tage': '2 days', '1 Woche': '1 week',
  // priority
  'Hoch': 'High', 'Mittel': 'Medium', 'Niedrig': 'Low', 'Keine': 'None', 'keine': 'none', 'Priorität': 'Priority', 'Priorität: {0}': 'Priority: {0}',
  // smart lists, modules, navigation
  'Eingang': 'Inbox', 'Alle': 'All', 'Erledigt': 'Completed', 'Papierkorb': 'Trash', 'Suche': 'Search', 'Suche (/)': 'Search (/)',
  'Aufgaben': 'Tasks', 'Kalender': 'Calendar', 'Matrix': 'Matrix', 'Eisenhower-Matrix': 'Eisenhower matrix', 'Gewohnheiten': 'Habits',
  'Fokus': 'Focus', 'Fokus (Pomodoro)': 'Focus (Pomodoro)', 'Kanban': 'Kanban', 'Paperless-Verknüpfung': 'Paperless link',
  'Einstellungen': 'Settings', 'Mehr': 'More', 'Menü': 'Menu', 'Tab-Leiste anpassen': 'Customize tab bar', 'Neue Aufgabe': 'New task',
  'Listen': 'Lists', 'Liste': 'List', 'Filter': 'Filters', 'Tags': 'Tags', 'Tag': 'Tag', 'Ordner': 'Folder', 'Archiviert': 'Archived',
  'Listen sortieren': 'Sort lists', 'Neue Liste': 'New list', 'Noch keine Listen': 'No lists yet', 'Neuer Filter': 'New filter',
  'Listen, Datum, Priorität, Tags kombinieren': 'Combine lists, dates, priorities, tags', 'In Ordner verschieben': 'Move to folder',
  'nach oben': 'move up', 'nach unten': 'move down', 'leer: im Sortiermodus Listen zuordnen': 'empty: assign lists in sort mode',
  'leer: Liste hierher ziehen': 'empty: drag a list here', 'Liste bearbeiten': 'Edit list', 'Mehrere auswählen': 'Select multiple',
  'Sortieren': 'Sort', 'Filter bearbeiten': 'Edit filter', 'Leeren': 'Empty', 'Neue Gewohnheit': 'New habit',
  'Änderungen werden gesendet, sobald der Server erreichbar ist': 'Changes are sent as soon as the server is reachable',
  'Konflikte prüfen': 'Review conflicts', 'Angeheftet': 'Pinned', 'Nicht zugeordnet': 'Unassigned', 'Abschnitt': 'Section', 'Spalte': 'Column',
  // task rows, lists, empty states
  'gelöscht {0}': 'deleted {0}', 'erledigt': 'done', 'Wiederherstellen': 'Restore', 'Endgültig löschen': 'Delete permanently',
  'Aufgabe hinzufügen: „Zahnarzt morgen 15 Uhr !hoch #privat ~Liste“': 'Add task: “Dentist tomorrow 3pm !high #private ~list”',
  'Nichts mehr für heute.': 'Nothing left for today.', 'Keine Aufgaben.': 'No tasks.', 'Papierkorb ist leer.': 'Trash is empty.',
  'Noch nichts erledigt.': 'Nothing completed yet.', 'Titel oder Notiz durchsuchen': 'Search titles and notes', 'Keine Treffer.': 'No results.',
  '+ Aufgabe': '+ Task', 'Keine Aufgaben an diesem Tag.': 'No tasks on this day.', 'Keine datierten Aufgaben': 'No dated tasks',
  'Balken lange drücken und ziehen: Mitte verschiebt, Enden ändern Beginn / Fälligkeit.': 'Long-press and drag a bar: the middle moves it, the ends change start / due date.',
  'Balken ziehen verschiebt, Enden ziehen ändern Beginn / Fälligkeit.': 'Drag a bar to move it, drag its ends to change start / due date.',
  'Zeitraum über „Beginn“ im Datumsdialog.': 'Set a date range via “Start” in the date dialog.',
  '{0} Aufgaben ohne Datum sind nicht dargestellt.': ['{0} task without a date is not shown.', '{0} tasks without a date are not shown.'],
  // matrix
  'Dringend & wichtig': 'Urgent & important', 'Nicht dringend, aber wichtig': 'Not urgent, but important',
  'Dringend, nicht wichtig': 'Urgent, not important', 'Weder dringend noch wichtig': 'Neither urgent nor important', 'leer': 'empty',
  // habits
  'Noch keine Gewohnheiten.': 'No habits yet.', 'Gewohnheit anlegen': 'Create habit', 'Serie': 'Streak',
  '{0}/{1} diese Woche': '{0}/{1} this week', '{0}/{1} heute': '{0}/{1} today', 'heute erledigt': 'done today', 'heute offen': 'open today',
  'heute frei': 'day off today', 'nicht erledigt': 'not done', 'Notiz zu diesem Tag': 'Note for this day',
  'Tag antippen: abhaken oder Notiz schreiben': 'Tap a day: check it off or write a note', 'aktuelle Serie': 'current streak',
  'beste Serie': 'best streak', 'Tage gesamt': 'days total', 'letzte 30 Tage': 'last 30 days', 'Name': 'Name',
  'z.B. Lesen, Sport, Wasser': 'e.g. reading, workout, water', 'Ziel pro Tag': 'Goal per day', 'Häufigkeit': 'Frequency',
  'Feste Tage': 'Fixed days', 'X-mal pro Woche': 'X times a week', 'Tage': ['day', 'days'], 'Wochen': ['week', 'weeks'],
  'Mal pro Woche': 'Times per week', 'an beliebigen Tagen': 'on any days', 'Erinnerung (ntfy)': 'Reminder (ntfy)', 'Farbe': 'Color',
  '„{0}“ samt Verlauf löschen?': 'Delete “{0}” including its history?',
  // pomodoro
  'pausiert': 'paused', 'Stoppuhr läuft': 'stopwatch running', 'Pause': 'Break', 'Pause|btn': 'Pause', 'Stoppuhr': 'Stopwatch', 'bereit': 'ready',
  'Kurze Pause': 'Short break', 'Lange Pause': 'Long break', 'Start': 'Start', 'Weiter': 'Resume', 'Beenden': 'Stop', 'Ohne Aufgabe': 'No task',
  'Pomos heute': 'Pomos today', 'Fokuszeit heute': 'Focus time today', 'Pomos 7 Tage': 'Pomos 7 days', 'Fokus 7 Tage': 'Focus 7 days',
  'Fokus nach Aufgabe (30 Tage)': 'Focus by task (30 days)', 'Fokus beendet. Zeit für eine Pause.': 'Focus done. Time for a break.',
  'Pause vorbei.': 'Break is over.', 'Fokus beendet': 'Focus done', 'Pause vorbei': 'Break is over', 'Fokus starten': 'Start focus',
  'Gestoppt: {0} erfasst': 'Stopped: {0} logged',
  // detail panel
  'Lösen': 'Unpin', 'Anheften': 'Pin', 'Schließen (Esc)': 'Close (Esc)', 'Titel': 'Title', 'Klicken zum Bearbeiten': 'Click to edit',
  'Beschreibung (Markdown: **fett**, - Liste, - [ ] Checkliste, Links)': 'Description (Markdown: **bold**, - list, - [ ] checklist, links)',
  'Anhänge': 'Attachments', 'Bilder, PDFs, Dokumente': 'Images, PDFs, documents', 'Datei hinzufügen': 'Add file',
  'oder Dateien hierher ziehen / Bild mit Strg+V einfügen': 'or drop files here / paste an image with Ctrl+V',
  'Dokument verknüpfen': 'Link document', 'Unteraufgaben': 'Subtasks', 'Unteraufgabe hinzufügen': 'Add subtask', 'Maximal 3 Ebenen': 'At most 3 levels',
  '+ Tag': '+ Tag', 'Erledigt {0}': 'Completed {0}', 'Erstellt {0}': 'Created {0}', 'Löschen': 'Delete', 'Entfernen': 'Remove',
  'Herunterladen': 'Download', 'Schließen': 'Close',
  // attachments, paperless
  'wird an Paperless übertragen': 'being sent to Paperless', 'In Paperless ablegen': 'File in Paperless', 'Verknüpfung entfernen': 'Remove link',
  'Paperless verarbeitet das Dokument…': 'Paperless is processing the document…', 'Fehler': 'Error', 'Fehler {0}': 'Error {0}',
  'Paperless-Dokument verknüpfen': 'Link Paperless document', 'Suchen: Titel, Inhalt, Korrespondent': 'Search: title, content, correspondent',
  'Zuletzt hinzugefügt': 'Recently added', 'Lädt…': 'Loading…', 'Paperless öffnen': 'Open Paperless', '{0} Treffer': ['{0} result', '{0} results'],
  '{0} S.': ['{0} page', '{0} pages'], 'Nichts gefunden.': 'Nothing found.', 'Schon verknüpft': 'Already linked', 'Verknüpft': 'Linked',
  'Aufgabe wird noch synchronisiert, gleich nochmal versuchen': 'Task is still syncing, try again in a moment',
  '{0} ist größer als 50 MB': '{0} is larger than 50 MB', 'Lade hoch…': 'Uploading…', 'Lade {0} Dateien hoch…': 'Uploading {0} files…',
  'Angehängt': 'Attached', '{0} Dateien angehängt': '{0} files attached',
  'Verknüpfung zu „{0}“ entfernen? Das Dokument bleibt in Paperless.': 'Remove the link to “{0}”? The document stays in Paperless.',
  '„{0}“ in Paperless ablegen?': 'File “{0}” in Paperless?', 'Der Anhang bleibt zusätzlich hier.': 'The attachment also stays here.',
  'Nach der Übernahme ersetzt die Verknüpfung den Anhang.': 'Once consumed, the link replaces the attachment.',
  'An Paperless übertragen, wird verarbeitet': 'Sent to Paperless, processing', '„{0}“ entfernen?': 'Remove “{0}”?',
  // task actions, toasts
  'Offline: geht erst wieder mit Verbindung': 'Offline: only works again with a connection',
  'Wiederkehrende Aufgabe war schon abgehakt, nicht doppelt weitergesetzt': 'Recurring task was already checked off, not advanced twice',
  '{0} Offline-Änderung nicht übernommen (Aufgabe gelöscht oder ungültig)': '{0} offline change not applied (task deleted or invalid)',
  '{0} Offline-Änderungen nicht übernommen (Aufgabe gelöscht oder ungültig)': '{0} offline changes not applied (task deleted or invalid)',
  'Aufgabe nicht gefunden': 'Task not found', 'Schon erledigt': 'Already completed',
  'War schon abgehakt (anderes Gerät), nicht doppelt weitergesetzt': 'Already checked off (other device), not advanced twice',
  'Nächste Wiederholung: {0}': 'Next occurrence: {0}', '„{0}“ gelöscht': '“{0}” deleted', 'Rückgängig': 'Undo',
  'Verschieben…': 'Snooze…', 'Diesen Termin überspringen': 'Skip this occurrence', 'Übersprungen, nächster Termin: {0}': 'Skipped, next occurrence: {0}',
  'Wird übertragen, sobald der Server erreichbar ist': 'Will be sent as soon as the server is reachable', 'Einrücken (unter „{0}“)': 'Indent (under “{0}”)',
  'Ausrücken': 'Outdent', 'Wieder öffnen': 'Reopen', 'Nicht erledigen (verwerfen)': "Won't do (discard)", 'Duplizieren': 'Duplicate',
  'Zur Hauptaufgabe machen': 'Make it a main task', 'Verschoben: {0}': 'Snoozed: {0}',
  'Priorität, darin manuell': 'Priority, then manual', 'Nur manuell': 'Manual only', 'Erledigte ausblenden': 'Hide completed',
  'Erledigte anzeigen': 'Show completed', 'Eigenständig in {0}': 'Standalone in {0}', 'Unteraufgabe ist jetzt eigenständig': 'Subtask is now standalone',
  // conflicts
  'Konflikte': 'Conflicts', 'Diese Felder wurden auf einem anderen Gerät geändert, während du hier (offline) etwas anderes eingetragen hast. Gespeichert ist die andere Version.':
    'These fields were changed on another device while you entered something else here (offline). The other version is saved.',
  'Alle: andere Version behalten': 'All: keep the other version', 'gespeichert': 'saved', 'deine Version': 'your version',
  'Gespeicherte behalten': 'Keep saved', 'Meine übernehmen': 'Use mine', 'Keine offenen Konflikte.': 'No open conflicts.',
  'Ein Feld wurde inzwischen woanders geändert, bitte prüfen': 'A field was changed elsewhere in the meantime, please review',
  '{0} Felder wurden inzwischen woanders geändert, bitte prüfen': '{0} fields were changed elsewhere in the meantime, please review',
  '(leer)': '(empty)', 'ja': 'yes', 'nein': 'no', 'Beschreibung': 'Description', 'Erinnerung': 'Reminder', 'Wiederholung': 'Repeat',
  'Wiederholung ab': 'Repeat from', 'Hauptaufgabe': 'Parent task', 'Dauer': 'Duration',
  // multi-select
  '{0} ausgewählt': '{0} selected', 'Aufgaben antippen': 'Tap tasks', 'Tag hinzufügen': 'Add tag', 'Fertig': 'Done',
  '{0} Aufgaben löschen?': ['Delete {0} task?', 'Delete {0} tasks?'], '{0} Aufgaben geändert': ['{0} task changed', '{0} tasks changed'],
  // list / section / folder
  'Symbol wählen': 'Choose icon', 'Kein Symbol': 'No icon', 'eigenes': 'custom', 'optional': 'optional', 'Ansicht': 'View',
  'Reaktivieren': 'Reactivate', 'Archivieren': 'Archive', 'Abbrechen': 'Cancel', 'Speichern': 'Save', 'OK': 'OK',
  'Liste „{0}“ löschen?': 'Delete list “{0}”?', '{0} offene Aufgaben wandern in den Papierkorb.': ['{0} open task goes to the trash.', '{0} open tasks go to the trash.'],
  'Umbenennen': 'Rename', 'Nach links / oben': 'Move left / up', 'Nach rechts / unten': 'Move right / down',
  'Löschen (Aufgaben bleiben)': 'Delete (tasks stay)', 'Name des Abschnitts / der Spalte': 'Name of the section / column',
  'Kein Ordner': 'No folder', 'Neuer Ordner…': 'New folder…', 'Neuer Ordner': 'New folder', 'Name des Ordners': 'Folder name',
  'Ordner gibt es schon': 'Folder already exists', 'Neue Liste in diesem Ordner': 'New list in this folder', 'Neuer Name': 'New name',
  'Ordner auflösen (Listen bleiben)': 'Dissolve folder (lists stay)', 'Ordner „{0}“ auflösen? Die Listen bleiben erhalten.': 'Dissolve folder “{0}”? The lists stay.',
  'Endgültig löschen?': 'Delete permanently?', 'Papierkorb endgültig leeren?': 'Empty the trash permanently?', 'Wiederhergestellt': 'Restored',
  // filter editor
  'z.B. Wichtig diese Woche': 'e.g. Important this week', 'Verknüpfung': 'Match', 'UND: alle Bedingungen': 'AND: all conditions',
  'ODER: eine reicht': 'OR: any one', 'Trifft aktuell auf {0} offene Aufgaben zu. Innerhalb einer Kategorie gilt „oder“.':
    ['Currently matches {0} open task. Within a category, “or” applies.', 'Currently matches {0} open tasks. Within a category, “or” applies.'],
  'Filter „{0}“ löschen? Aufgaben bleiben erhalten.': 'Delete filter “{0}”? Tasks are kept.',
  // settings
  'Benachrichtigungen (ntfy)': 'Notifications (ntfy)', 'Topic': 'Topic',
  'In der ntfy-App abonnieren: Server {0}, Topic wie oben': 'Subscribe in the ntfy app: server {0}, topic as above',
  ', mit einem Benutzer mit Leserecht': ', with a user that has read access', 'Web-Ansicht': 'Web view', 'Test senden': 'Send test',
  'Ganztägig erinnern um': 'All-day reminder at', 'Standard-Erinnerung': 'Default reminder', 'Tagesübersicht um': 'Daily digest at',
  'leer = aus': 'empty = off', 'Fokus (Minuten)': 'Focus (minutes)', 'Fokus / kurz / lang': 'Focus / short / long', 'Lange Pause nach': 'Long break after',
  'Pomos': 'pomos', 'Tab-Leiste (dieses Gerät)': 'Tab bar (this device)',
  'Gilt nur auf diesem Gerät, unten am Handy bzw. links am Desktop. Am Handy passen {0} Tabs, der Rest und alles Nicht-Angeheftete steckt unter „Mehr“.':
    'Applies to this device only, at the bottom on a phone or on the left on desktop. A phone fits {0} tabs, the rest and everything not pinned goes under “More”.',
  'Standard': 'Default', 'Module': 'Modules',
  'Häkchen = Funktion an/aus. Reihenfolge = Standard-Leiste für Geräte ohne eigene Tab-Leiste.': 'Checkbox = feature on/off. Order = default bar for devices without their own tab bar.',
  'nach oben / links': 'move up / left', 'nach unten / rechts': 'move down / right', 'Nach Upload': 'After upload',
  'Anhang zusätzlich in Abhako behalten': 'Also keep the attachment in Abhako', 'Teilen über ntfy (Android)': 'Share via ntfy (Android)',
  'In der ntfy-App einmal Server {0}': 'In the ntfy app, add server {0} once',
  ' mit einem Benutzer anmelden, der auf das Topic schreiben darf (Einstellungen > Benutzer verwalten).':
    ' and log in with a user that may write to the topic (Settings > Manage users).',
  'Dann: Bild oder Text teilen > ntfy > Server wie oben, Topic {0}. Nach ein paar Sekunden liegt es als Aufgabe im Eingang, Dateien als Anhang.':
    'Then: share an image or text > ntfy > server as above, topic {0}. A few seconds later it is a task in the inbox, files as attachments.',
  'Design (dieses Gerät)': 'Appearance (this device)', 'Farbschema': 'Color scheme', 'Automatisch': 'Automatic', 'Dunkel': 'Dark', 'Hell': 'Light',
  'Sprache': 'Language', 'Gilt für alle Geräte und die Benachrichtigungen. Die Schnell-Eingabe versteht immer Deutsch und Englisch.':
    'Applies to all devices and to the notifications. Quick add always understands German and English.',
  'Erledigte': 'Completed tasks', 'In Listen anzeigen': 'Show in lists', 'Erledigte einblenden': 'Show completed', 'Aufräumen': 'Clean up',
  'Alle erledigten löschen': 'Delete all completed', 'landen im Papierkorb': 'they go to the trash', 'Daten': 'Data', 'TickTick-Import': 'TickTick import',
  'Export': 'Export', 'JSON herunterladen': 'Download JSON', 'Handy': 'Phone',
  'Nach rechts wischen: erledigt · nach links wischen: verschieben / löschen · lange drücken und ziehen: umsortieren, in andere Spalte, Quadrant oder auf einen Tag; an den linken Rand ziehen und kurz halten öffnet die Listen (Unteraufgabe dort ablegen = eigenständige Aufgabe in dieser Liste). Android: Links direkt „Teilen“ &gt; Abhako, Bilder und Dateien (auch mehrere) über die App HTTP Shortcuts, einzeln auch über die ntfy-App.':
    'Swipe right: complete · swipe left: snooze / delete · long-press and drag: reorder, move to another column, quadrant or onto a day; drag to the left edge and hold briefly to open the lists (dropping a subtask there = standalone task in that list). Android: share links directly via “Share” &gt; Abhako, images and files (also several) via the HTTP Shortcuts app, single ones also via the ntfy app.',
  'Schnell-Eingabe': 'Quick add',
  'heute, morgen, übermorgen, freitag, nächsten montag, in 3 tagen, 12.10., 15 uhr, um 9:30<br>täglich, werktags, wöchentlich, jeden montag, alle 2 wochen, monatlich, jährlich<br>!hoch / !mittel / !niedrig (oder !!!, !!, !) · #tag · ~liste<br>Tastatur: n = neue Aufgabe, / = Suche, Esc = schließen':
    'today, tomorrow, day after tomorrow, friday, next monday, in 3 days, 12.10., 3pm, at 15:00<br>daily, weekdays, weekly, every monday, every 2 weeks, monthly, yearly<br>!high / !medium / !low (or !!!, !!, !) · #tag · ~list<br>German works too: morgen 15 uhr, jeden montag, !hoch<br>Keyboard: n = new task, / = search, Esc = close',
  'ab hier „Mehr“': 'from here on “More”', 'nach vorne': 'move forward', 'nach hinten': 'move back', 'entfernen': 'remove',
  'Leer: nur „Mehr“': 'Empty: only “More”', '+ Tab hinzufügen …': '+ Add tab …', 'Bereiche': 'Sections', 'Smart-Listen': 'Smart lists',
  'Sonstiges': 'Other', 'Standard-Leiste': 'Default bar', 'Alle erledigten Aufgaben in den Papierkorb verschieben?': 'Move all completed tasks to the trash?',
  '(mind. {0})': '(at least {0})', 'Wird gelöscht, sobald wieder online': 'Will be deleted once back online',
  '{0} erledigte Aufgaben im Papierkorb': ['{0} completed task moved to the trash', '{0} completed tasks moved to the trash'],
  'Test gesendet': 'Test sent', 'ntfy nicht erreichbar': 'ntfy not reachable', 'Gespeichert': 'Saved',
  'Import: {0} Aufgaben, {1} neue Listen': 'Import: {0} tasks, {1} new lists', ', {0} schon vorhanden': ', {0} already there',
  // quick add
  'wieder erkennen': 'recognize again', 'nicht erkennen': "don't recognize", 'Was steht an?': "What's next?", 'Hinzufügen': 'Add',
  'morgen 15 uhr · !hoch · #tag · ~liste · jeden montag': 'tomorrow 3pm · !high · #tag · ~list · every monday',
  'Link als Beschreibung': 'Link as description', 'Anhang: {0}': 'Attachment: {0}', '{0} Anhänge': '{0} attachments',
  // boot / share
  'Server nicht erreichbar.': 'Server not reachable.', 'Seite neu laden, sobald der Server wieder erreichbar ist.': 'Reload the page once the server is reachable again.',
  'Teilen: Datei konnte nicht übernommen werden': 'Share: the file could not be received',
  'Bilder und Dateien bitte über die ntfy-App teilen (Topic inbox)': 'Please share images and files via the ntfy app (topic inbox)',
};
