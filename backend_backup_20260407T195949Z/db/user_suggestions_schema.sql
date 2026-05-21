-- User feedback / suggestions from the mobile app (Contact tab).
-- Table is also created automatically on server start via ensureAdminContentTables in server.js.

CREATE TABLE IF NOT EXISTS user_suggestions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  subject VARCHAR(255),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_suggestions_created_at ON user_suggestions (created_at DESC);
