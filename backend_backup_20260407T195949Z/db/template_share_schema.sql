-- Template sharing between users (conversations + template-only messages).
-- Run after your main schema (requires public.profiles with id, phone_number, names, profile_photo_url).
-- If your app uses a different user table, adjust routes/templateShareRoutes.js queries.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS template_share_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_low TEXT NOT NULL,
  user_high TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT template_share_pair_unique UNIQUE (user_low, user_high),
  CONSTRAINT template_share_pair_ordered CHECK (user_low < user_high)
);

CREATE INDEX IF NOT EXISTS idx_template_share_conv_user_low ON template_share_conversations (user_low);
CREATE INDEX IF NOT EXISTS idx_template_share_conv_user_high ON template_share_conversations (user_high);
CREATE INDEX IF NOT EXISTS idx_template_share_conv_updated ON template_share_conversations (updated_at DESC);

CREATE TABLE IF NOT EXISTS template_share_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES template_share_conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_template_share_msg_conv_created
  ON template_share_messages (conversation_id, created_at DESC);
