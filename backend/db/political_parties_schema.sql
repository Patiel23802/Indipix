-- Political parties for profile / GET /api/political-parties?state_id=
-- Run: node scripts/seed-political-parties.js (after seed-locations.js)

CREATE TABLE IF NOT EXISTS political_parties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(64),
  logo_url TEXT,
  color VARCHAR(32),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_national BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_political_parties_active ON political_parties (is_active)
WHERE
  is_active = true;

-- Regional parties: which states they appear in (national parties need no rows here)
CREATE TABLE IF NOT EXISTS political_party_states (
  party_id INTEGER NOT NULL REFERENCES political_parties (id) ON DELETE CASCADE,
  state_id INTEGER NOT NULL REFERENCES states (id) ON DELETE CASCADE,
  PRIMARY KEY (party_id, state_id)
);

CREATE INDEX IF NOT EXISTS idx_political_party_states_state ON political_party_states (state_id);

-- Existing DBs created before is_national column:
ALTER TABLE political_parties
ADD COLUMN IF NOT EXISTS is_national BOOLEAN NOT NULL DEFAULT false;
