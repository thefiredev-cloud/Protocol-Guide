-- Add push_tokens table for storing Expo push notification tokens
CREATE TABLE IF NOT EXISTS push_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL,
    platform VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS push_tokens_user_idx ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS push_tokens_token_idx ON push_tokens(token);

-- Add drip_emails_sent table for tracking onboarding email sequence
CREATE TABLE IF NOT EXISTS drip_emails_sent (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    email_type VARCHAR(50) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS drip_emails_user_idx ON drip_emails_sent(user_id);
CREATE INDEX IF NOT EXISTS drip_emails_type_idx ON drip_emails_sent(email_type);
