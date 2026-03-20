-- ============================================================
-- AI Chat Sessions — tracks AI chatbot usage for analytics
-- Messages are stored in localStorage on the client side.
-- This table only tracks session metadata.
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id              TEXT PRIMARY KEY,
    user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    guest_email     TEXT,
    message_count   INT DEFAULT 0,
    last_active_at  TIMESTAMPTZ DEFAULT now(),
    created_at      TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE ai_chat_sessions IS 'Tracks AI chatbot session metadata for analytics. Messages live in client localStorage.';
COMMENT ON COLUMN ai_chat_sessions.id IS 'Client-generated session/conversation ID';
COMMENT ON COLUMN ai_chat_sessions.user_id IS 'Authenticated user ID (NULL for guest email users)';
COMMENT ON COLUMN ai_chat_sessions.guest_email IS 'Email provided by unauthenticated guests via EmailGate';
COMMENT ON COLUMN ai_chat_sessions.message_count IS 'Total messages in the conversation (user + assistant)';

CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user
    ON ai_chat_sessions (user_id)
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_active
    ON ai_chat_sessions (last_active_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_email
    ON ai_chat_sessions (guest_email)
    WHERE guest_email IS NOT NULL;

-- RLS: allow backend service role full access (no public access needed)
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
