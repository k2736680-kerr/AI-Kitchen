CREATE TABLE IF NOT EXISTS ai_kitchen_schema_migrations (
  migration_name VARCHAR(160) NOT NULL PRIMARY KEY,
  checksum CHAR(64) NOT NULL,
  applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_kitchen_generation_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  request_id VARCHAR(128) NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  guest_id VARCHAR(120) NOT NULL,
  schema_version VARCHAR(32) NOT NULL,
  client_version VARCHAR(80) NOT NULL,
  request_payload JSON NOT NULL,
  status ENUM('processing', 'succeeded', 'no_match', 'failed', 'timeout', 'service_unavailable', 'rate_limited') NOT NULL,
  response_payload JSON NULL,
  error_code VARCHAR(80) NULL,
  provider_request_id VARCHAR(128) NULL,
  duration_ms INT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  completed_at DATETIME(3) NULL,
  CONSTRAINT uq_ai_kitchen_generation_request_id UNIQUE (request_id),
  CONSTRAINT uq_ai_kitchen_generation_idempotency_key UNIQUE (idempotency_key),
  INDEX idx_ai_kitchen_generation_guest_created (guest_id, created_at DESC),
  INDEX idx_ai_kitchen_generation_status_updated (status, updated_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_kitchen_recipes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  recipe_id CHAR(36) NOT NULL,
  schema_version VARCHAR(40) NOT NULL,
  source ENUM('local', 'deterministic', 'provider') NOT NULL,
  provider VARCHAR(80) NULL,
  model VARCHAR(120) NULL,
  title VARCHAR(200) NOT NULL,
  recipe_payload JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT uq_ai_kitchen_recipe_id UNIQUE (recipe_id),
  INDEX idx_ai_kitchen_recipe_title (title),
  INDEX idx_ai_kitchen_recipe_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_kitchen_recipe_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  guest_id VARCHAR(120) NOT NULL,
  recipe_id CHAR(36) NOT NULL,
  source ENUM('local', 'remote') NOT NULL,
  first_visited_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_visited_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  visit_count INT UNSIGNED NOT NULL DEFAULT 1,
  CONSTRAINT uq_ai_kitchen_history_guest_recipe UNIQUE (guest_id, recipe_id),
  CONSTRAINT fk_ai_kitchen_history_recipe FOREIGN KEY (recipe_id) REFERENCES ai_kitchen_recipes (recipe_id) ON DELETE CASCADE,
  INDEX idx_ai_kitchen_history_guest_last_visited (guest_id, last_visited_at DESC, recipe_id DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
