const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { validateLead } = require('../lib/validate');
const { notifyNewLead } = require('../lib/mailer');

const router = express.Router();

const quoteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests from this connection. Please call or text us instead.' }
});

const insertLead = db.prepare(`
  INSERT INTO leads (name, phone, email, event_date, guests, event_type, town, notes)
  VALUES (@name, @phone, @email, @event_date, @guests, @event_type, @town, @notes)
`);

router.post('/quote', quoteLimiter, (req, res) => {
  const body = req.body || {};

  // Honeypot: real people never fill the hidden "website" field.
  if (body.website) return res.json({ ok: true });

  const { lead, errors } = validateLead(body);
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: errors });

  insertLead.run({
    ...lead,
    email: lead.email || null,
    event_date: lead.event_date || null,
    event_type: lead.event_type || null,
    town: lead.town || null,
    notes: lead.notes || null
  });
  notifyNewLead(lead);
  res.json({ ok: true });
});

const upcomingStops = db.prepare(`
  SELECT start_date, end_date, place, town, hours, note
  FROM stops
  WHERE COALESCE(end_date, start_date) >= date('now', 'localtime')
  ORDER BY start_date
  LIMIT 8
`);

router.get('/stops', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.json({ stops: upcomingStops.all() });
});

module.exports = router;
