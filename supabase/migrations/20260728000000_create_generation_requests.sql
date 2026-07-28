create table if not exists public.generation_requests (
  request_id text primary key,
  idempotency_key text not null unique,
  request_hash text not null,
  request_version text not null,
  identity_type text not null check (identity_type in ('guest', 'anonymous', 'registered')),
  owner_id uuid null,
  status text not null check (status in ('processing', 'completed', 'failed')),
  response_json jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz null
);

create index if not exists generation_requests_owner_id_idx
  on public.generation_requests (owner_id, created_at desc);

alter table public.generation_requests enable row level security;

-- No client policies are intentionally created. The Edge Function uses the
-- server-only service role for this internal table; direct client access is denied.
