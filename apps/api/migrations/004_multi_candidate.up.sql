-- 004_multi_candidate.up.sql
-- 多候选菜谱生成:为 ai_kitchen_recipes 增加烹饪方式/菜系/口味结构化列,
-- 并回填历史数据。旧版单菜谱 response_payload 回填为 recipes 数组。

-- 1. 结构化列
ALTER TABLE ai_kitchen_recipes
  ADD COLUMN cooking_method VARCHAR(32) NULL AFTER locale,
  ADD COLUMN cuisine VARCHAR(32) NULL AFTER cooking_method,
  ADD COLUMN flavor VARCHAR(32) NULL AFTER cuisine;

-- 回填已存在的菜谱维度字段
UPDATE ai_kitchen_recipes
SET cooking_method = JSON_UNQUOTE(JSON_EXTRACT(recipe_payload, '$.cookingMethod')),
    cuisine = JSON_UNQUOTE(JSON_EXTRACT(recipe_payload, '$.cuisine')),
    flavor = JSON_UNQUOTE(JSON_EXTRACT(recipe_payload, '$.flavor'))
WHERE recipe_payload IS NOT NULL;

-- 2. 旧版单 recipe 响应回填为 recipes 数组
-- 新契约要求 success 响应包含 recipes 数组;旧数据只有 recipe 单对象。
-- 对 status='succeeded' 且 response_payload 含 $.recipe 的行做转换。
UPDATE ai_kitchen_generation_requests
SET response_payload = JSON_SET(
      JSON_REMOVE(response_payload, '$.recipe'),
      '$.recipes',
      JSON_ARRAY(JSON_EXTRACT(response_payload, '$.recipe'))
    )
WHERE status = 'succeeded'
  AND response_payload IS NOT NULL
  AND JSON_CONTAINS_PATH(response_payload, 'one', '$.recipe') = 1
  AND JSON_CONTAINS_PATH(response_payload, 'one', '$.recipes') = 0;
