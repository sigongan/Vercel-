-- Run this once in the Supabase SQL editor, after schema.sql and schema_02.
-- Hardens the anonymous 1-free-trial gate: the existing cookie-based check
-- is easy to bypass (incognito, clearing cookies). This adds a server-side
-- counter keyed by a hash of the visitor's IP address as a second gate —
-- both the cookie AND the IP must have quota remaining. The raw IP is never
-- stored, only a SHA-256 hash of it.

create table if not exists public.anon_ip_usage (
  ip_hash text primary key,
  count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.anon_ip_usage enable row level security;
-- No public policies — only the server's service-role client reads/writes this table.

create or replace function public.consume_anon_ip_quota(p_ip_hash text, p_limit integer)
returns table(allowed boolean, used integer)
language plpgsql
security definer set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.anon_ip_usage (ip_hash, count)
    values (p_ip_hash, 0)
    on conflict (ip_hash) do nothing;

  select count into v_count from public.anon_ip_usage where ip_hash = p_ip_hash for update;

  if v_count < p_limit then
    update public.anon_ip_usage set count = v_count + 1, updated_at = now() where ip_hash = p_ip_hash;
    return query select true, v_count + 1;
    return;
  end if;

  return query select false, v_count;
end;
$$;

grant execute on function public.consume_anon_ip_quota(text, integer) to service_role;
