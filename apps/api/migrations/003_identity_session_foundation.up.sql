CREATE TABLE IF NOT EXISTS ai_kitchen_guest_identities (
  guest_id CHAR(36) NOT NULL PRIMARY KEY,
  status ENUM('active', 'revoked') NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  last_seen_at DATETIME(3) NULL,
  revoked_at DATETIME(3) NULL,
  INDEX idx_ai_kitchen_guest_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_kitchen_sessions (
  session_id CHAR(36) NOT NULL PRIMARY KEY,
  guest_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_seen_at DATETIME(3) NULL,
  revoked_at DATETIME(3) NULL,
  CONSTRAINT uq_ai_kitchen_session_token_hash UNIQUE (token_hash),
  CONSTRAINT fk_ai_kitchen_session_guest FOREIGN KEY (guest_id) REFERENCES ai_kitchen_guest_identities (guest_id) ON DELETE CASCADE,
  INDEX idx_ai_kitchen_session_guest (guest_id),
  INDEX idx_ai_kitchen_session_expiry (expires_at),
  INDEX idx_ai_kitchen_session_active_expiry (revoked_at, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
