-- 004_multi_candidate.down.sql
-- 回滚多候选生成改动。

-- 回滚 response_payload:recipes 数组拆回单个 recipe(取第一个)
UPDATE ai_kitchen_generation_requests
SET response_payload = JSON_SET(
      JSON_REMOVE(response_payload, '$.recipes'),
      '$.recipe',
      JSON_EXTRACT(response_payload, '$.recipes[0]')
    )
WHERE status = 'succeeded'
  AND response_payload IS NOT NULL
  AND JSON_CONTAINS_PATH(response_payload, 'one', '$.recipes') = 1;

-- 移除结构化列
ALTER TABLE ai_kitchen_recipes
  DROP COLUMN flavor,
  DROP COLUMN cuisine,
  DROP COLUMN cooking_method;
