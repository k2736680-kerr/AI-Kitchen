ALTER TABLE ai_kitchen_generation_requests
  ADD COLUMN locale VARCHAR(10) NOT NULL DEFAULT 'zh-CN' AFTER client_version;

ALTER TABLE ai_kitchen_recipes
  ADD COLUMN locale VARCHAR(10) NOT NULL DEFAULT 'zh-CN' AFTER title;

CREATE INDEX idx_ai_kitchen_recipe_locale_recipe
  ON ai_kitchen_recipes (locale, recipe_id);
