-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    window_start TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_expires ON rate_limits(expires_at);

-- User storage tracking
CREATE TABLE IF NOT EXISTS user_storage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    total_size INTEGER DEFAULT 0,
    file_count INTEGER DEFAULT 0,
    last_updated TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_storage_user_id ON user_storage(user_id);

-- Failed login attempts tracking
CREATE TABLE IF NOT EXISTS failed_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT NOT NULL,
    attempt_count INTEGER DEFAULT 1,
    locked_until TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_failed_attempts_identifier ON failed_attempts(identifier);
CREATE INDEX IF NOT EXISTS idx_failed_attempts_locked_until ON failed_attempts(locked_until);
