begin;

select plan(24);

select has_table('public', 'ai_kitchen_generation_requests');
select has_table('public', 'ai_kitchen_recipes');
select has_table('public', 'ai_kitchen_recipe_history');
select has_table('public', 'ai_kitchen_rate_limits');

select is((select relrowsecurity from pg_class where oid = 'public.ai_kitchen_generation_requests'::regclass), true, 'generation requests enable RLS');
select is((select relrowsecurity from pg_class where oid = 'public.ai_kitchen_recipes'::regclass), true, 'recipes enable RLS');
select is((select relrowsecurity from pg_class where oid = 'public.ai_kitchen_recipe_history'::regclass), true, 'history enables RLS');
select is((select relrowsecurity from pg_class where oid = 'public.ai_kitchen_rate_limits'::regclass), true, 'rate limits enable RLS');

select is((select count(*)::integer from pg_policies where schemaname = 'public' and tablename like 'ai_kitchen_%'), 4, 'each business table has one owner policy');
select function_privs_are('public', 'ai_kitchen_reserve_generation', array['text','text','text','text','text','text','jsonb'], 'anon', array[]::text[]);
select function_privs_are('public', 'ai_kitchen_save_recipe_success', array['text','text','jsonb','jsonb','integer'], 'anon', array[]::text[]);
select function_privs_are('public', 'ai_kitchen_visit_history', array['uuid','text'], 'anon', array[]::text[]);
select function_privs_are('public', 'ai_kitchen_get_recipe', array['uuid'], 'anon', array[]::text[]);
select function_privs_are('public', 'ai_kitchen_list_history', array['text','integer','timestamp with time zone','uuid'], 'anon', array[]::text[]);
select function_privs_are('public', 'ai_kitchen_allow_request', array['integer','integer'], 'anon', array[]::text[]);
select table_privs_are('public', 'ai_kitchen_generation_requests', 'anon', array[]::text[]);
select table_privs_are('public', 'ai_kitchen_recipes', 'anon', array[]::text[]);
select table_privs_are('public', 'ai_kitchen_recipe_history', 'anon', array[]::text[]);
select table_privs_are('public', 'ai_kitchen_generation_requests', 'authenticated', array[]::text[]);
select table_privs_are('public', 'ai_kitchen_recipes', 'authenticated', array[]::text[]);
select table_privs_are('public', 'ai_kitchen_recipe_history', 'authenticated', array[]::text[]);
select is((select prosecdef from pg_proc where oid = 'public.ai_kitchen_reserve_generation(text,text,text,text,text,text,jsonb)'::regprocedure), true, 'generation reservation is controlled security definer RPC');
select is((select prosecdef from pg_proc where oid = 'public.ai_kitchen_save_recipe_success(text,text,jsonb,jsonb,integer)'::regprocedure), true, 'recipe save is controlled security definer RPC');
select is((select prosecdef from pg_proc where oid = 'public.ai_kitchen_get_recipe(uuid)'::regprocedure), true, 'recipe read is controlled security definer RPC');

select * from finish();
rollback;
