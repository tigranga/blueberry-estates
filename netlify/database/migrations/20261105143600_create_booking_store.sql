CREATE TABLE site_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bookings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  stripe_session_id TEXT UNIQUE,
  guest_name TEXT,
  guest_email TEXT,
  checkin TEXT,
  checkout TEXT,
  guests INTEGER,
  amount_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE blocked_dates (
  date TEXT PRIMARY KEY
);
