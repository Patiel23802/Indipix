-- Location hierarchy for profile / admin (used by GET /api/locations/*)
-- Run once, then: node scripts/seed-locations.js

CREATE TABLE IF NOT EXISTS states (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  state_code VARCHAR(10) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS districts (
  id SERIAL PRIMARY KEY,
  state_id INTEGER NOT NULL REFERENCES states (id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  district_code VARCHAR(10) NOT NULL,
  UNIQUE (state_id, district_code)
);

CREATE INDEX IF NOT EXISTS idx_districts_state_id ON districts (state_id);

CREATE TABLE IF NOT EXISTS tehsils (
  id SERIAL PRIMARY KEY,
  district_id INTEGER NOT NULL REFERENCES districts (id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  UNIQUE (district_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tehsils_district_id ON tehsils (district_id);
