-- app_config table: stores key-value config like admin_password
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security: only service role can read/write
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- No public access; only server-side service role key can interact
-- Insert default admin_password placeholder (empty = use env var)
INSERT INTO app_config (key, value) VALUES ('admin_password', '')
  ON CONFLICT (key) DO NOTHING;
