revoke all on table public.ai_kitchen_generation_requests from anon, authenticated;
revoke all on table public.ai_kitchen_recipes from anon, authenticated;
revoke all on table public.ai_kitchen_recipe_history from anon, authenticated;
revoke all on table public.ai_kitchen_rate_limits from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

alter function public.ai_kitchen_reserve_generation(text, text, text, text, text, text, jsonb) security definer;
alter function public.ai_kitchen_complete_generation(text, text, text, jsonb, integer) security definer;
alter function public.ai_kitchen_fail_generation(text, text, text, text, integer) security definer;
alter function public.ai_kitchen_save_recipe_success(text, text, jsonb, jsonb, integer) security definer;
alter function public.ai_kitchen_visit_history(uuid, text) security definer;
alter function public.ai_kitchen_get_recipe(uuid) security definer;
alter function public.ai_kitchen_list_history(text, integer, timestamptz, uuid) security definer;
alter function public.ai_kitchen_allow_request(integer, integer) security definer;

comment on function public.ai_kitchen_reserve_generation(text, text, text, text, text, text, jsonb)
  is 'Security definer is required because client roles have no direct table privileges. Ownership is always derived from auth.uid().';
