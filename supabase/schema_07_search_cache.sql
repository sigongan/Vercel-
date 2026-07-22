-- Recipe Scanner result cache — same idea as recipe_cache (schema.sql), but
-- keyed by search query + language instead of a source hash. Popular dishes
-- get searched by many different people; reusing a recent result means the
-- AI (and its web-search cost) only gets called once per query per day
-- instead of once per person.
create table if not exists public.search_cache (
  query_hash text primary key,
  results jsonb not null,
  hit_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.search_cache enable row level security;
-- No public policies — only the server's service-role client reads/writes this table.
