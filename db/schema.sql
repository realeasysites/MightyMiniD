CREATE TABLE IF NOT EXISTS leads (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  name         TEXT    NOT NULL,
  phone        TEXT    NOT NULL,
  email        TEXT,
  event_date   TEXT,
  guests       INTEGER,
  event_type   TEXT,
  town         TEXT,
  notes        TEXT,
  status       TEXT    NOT NULL DEFAULT 'new'
               CHECK (status IN ('new', 'contacted', 'quoted', 'booked', 'lost')),
  admin_notes  TEXT
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads (created_at);

-- "Where to find us" stops the owner manages from the dashboard
CREATE TABLE IF NOT EXISTS stops (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  start_date  TEXT NOT NULL,          -- YYYY-MM-DD
  end_date    TEXT,                   -- YYYY-MM-DD, for multi-day events like a fair
  place       TEXT NOT NULL,
  town        TEXT,
  hours       TEXT,
  note        TEXT
);

CREATE INDEX IF NOT EXISTS idx_stops_dates ON stops (start_date, end_date);
