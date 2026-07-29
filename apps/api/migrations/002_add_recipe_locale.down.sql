DROP INDEX idx_ai_kitchen_recipe_locale_recipe ON ai_kitchen_recipes;

ALTER TABLE ai_kitchen_recipes DROP COLUMN locale;

ALTER TABLE ai_kitchen_generation_requests DROP COLUMN locale;
