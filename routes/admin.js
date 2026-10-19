const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { passwordMatches, setSession, clearSession, requireAuth, isAuthed } = require('../lib/auth');
const { STATUSES, clean, validateStop } = require('../lib/validate');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Wait 15 minutes and try again.' }
});

// Dashboard page: send people who aren't logged in to the login page.
router.get(['/', '/index.html'], (req, res, next) => {
  if (!isAuthed(req)) return res.redirect('/admin/login');
  next(); // falls through to express.static -> public/admin/index.html
});

router.post('/login', loginLimiter, (req, res) => {
  if (!passwordMatches((req.body || {}).password)) {
    return res.status(401).json({ error: 'That password is not right.' });
  }
  setSession(req, res);
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

// Everything below needs a valid login.
router.use('/api', requireAuth);

router.get('/api/stats', (req, res) => {
  const rows = db.prepare('SELECT status, COUNT(*) AS n FROM leads GROUP BY status').all();
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  rows.forEach((r) => { counts[r.status] = r.n; });
  res.json({ counts, total: rows.reduce((sum, r) => sum + r.n, 0) });
});

router.get('/api/leads', (req, res) => {
  const status = clean(req.query.status, 20);
  const rows = STATUSES.includes(status)
    ? db.prepare('SELECT * FROM leads WHERE status = ? ORDER BY created_at DESC').all(status)
    : db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
  res.json({ leads: rows });
});

router.patch('/api/leads/:id', (req, res) => {
  const id = Number(req.params.id);
  const body = req.body || {};
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  if (!lead) return res.status(404).json({ error: 'That lead no longer exists.' });

  const status = body.status === undefined ? lead.status : clean(body.status, 20);
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Unknown status.' });
  const adminNotes = body.admin_notes === undefined ? lead.admin_notes : clean(body.admin_notes, 2000);

  db.prepare("UPDATE leads SET status = ?, admin_notes = ?, updated_at = datetime('now') WHERE id = ?")
    .run(status, adminNotes, id);
  res.json({ lead: db.prepare('SELECT * FROM leads WHERE id = ?').get(id) });
});

// Delete a request that isn't a real lead (spam, test, wrong number).
router.delete('/api/leads/:id', (req, res) => {
  const info = db.prepare('DELETE FROM leads WHERE id = ?').run(Number(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

router.get('/api/leads.csv', (req, res) => {
  const rows = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
  const cols = ['created_at', 'status', 'name', 'phone', 'email', 'event_type', 'event_date', 'guests', 'town', 'notes', 'admin_notes'];
  const esc = (v) => {
    let s = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@]/.test(s)) s = "'" + s; // stop spreadsheet formula injection
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename="mighty-mini-donuts-leads.csv"');
  res.send(csv);
});

router.get('/api/stops', (req, res) => {
  res.json({ stops: db.prepare('SELECT * FROM stops ORDER BY start_date DESC').all() });
});

router.post('/api/stops', (req, res) => {
  const { stop, errors } = validateStop(req.body || {});
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: errors });
  const info = db.prepare(`
    INSERT INTO stops (start_date, end_date, place, town, hours, note)
    VALUES (@start_date, @end_date, @place, @town, @hours, @note)
  `).run(stop);
  res.status(201).json({ stop: db.prepare('SELECT * FROM stops WHERE id = ?').get(info.lastInsertRowid) });
});

router.delete('/api/stops/:id', (req, res) => {
  const info = db.prepare('DELETE FROM stops WHERE id = ?').run(Number(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'That stop was already removed.' });
  res.json({ ok: true });
});

module.exports = router;
