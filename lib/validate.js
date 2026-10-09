const STATUSES = ['new', 'contacted', 'quoted', 'booked', 'lost'];
const EVENT_TYPES = ['Wedding', 'School / community event', 'Company party', 'Birthday', 'Fair or festival', 'Something else'];

function clean(value, max = 200) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}

function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function validateLead(body) {
  const lead = {
    name: clean(body.name, 100),
    phone: clean(body.phone, 30),
    email: clean(body.email, 150),
    event_date: clean(body.event_date, 10),
    guests: body.guests === '' || body.guests === undefined ? null : Number(body.guests),
    event_type: clean(body.event_type, 60),
    town: clean(body.town, 100),
    notes: clean(body.notes, 2000)
  };
  const errors = {};

  if (lead.name.length < 2) errors.name = 'Please add your name.';
  if (lead.phone.replace(/\D/g, '').length < 10) errors.phone = 'Please add a phone number we can call or text.';
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) errors.email = 'That email doesn’t look right.';
  if (lead.event_date && !isDate(lead.event_date)) errors.event_date = 'Please pick a date from the calendar.';
  if (lead.guests !== null && (!Number.isInteger(lead.guests) || lead.guests < 1 || lead.guests > 100000)) {
    errors.guests = 'Guests should be a whole number.';
  }
  if (lead.event_type && !EVENT_TYPES.includes(lead.event_type)) lead.event_type = 'Something else';

  return { lead, errors };
}

function validateStop(body) {
  const stop = {
    start_date: clean(body.start_date, 10),
    end_date: clean(body.end_date, 10) || null,
    place: clean(body.place, 120),
    town: clean(body.town, 80),
    hours: clean(body.hours, 60),
    note: clean(body.note, 200)
  };
  const errors = {};
  if (!isDate(stop.start_date)) errors.start_date = 'Pick a start date.';
  if (stop.end_date && (!isDate(stop.end_date) || stop.end_date < stop.start_date)) {
    errors.end_date = 'End date must be on or after the start date.';
  }
  if (stop.place.length < 2) errors.place = 'Add where you’ll be.';
  return { stop, errors };
}

module.exports = { STATUSES, EVENT_TYPES, clean, validateLead, validateStop };
