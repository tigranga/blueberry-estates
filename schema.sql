-- D1 Schema for Blueberry Estates / RiverStone Booking Site
-- Run in Cloudflare Dashboard → D1 → Console, or via wrangler

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stripe_session_id TEXT UNIQUE,
  guest_name TEXT,
  guest_email TEXT,
  checkin TEXT,
  checkout TEXT,
  guests INTEGER,
  amount_cents INTEGER,
  status TEXT DEFAULT 'pending',
  message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blocked_dates (
  date TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS site_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
