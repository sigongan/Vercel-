-- Run this once in the Supabase SQL editor, after schema_04.
-- Pasted-text extraction is now free and unlimited for everyone (it's cheap
-- to process, and it matches what competitors offer). This table backs the
-- only remaining gate on it: a generous per-IP daily cap as an abuse/cost
-- backstop.

create table if not exists public.text_ip_usage (
  ip_hash text not null,
  day date not null,
  count integer not null default 0,
  primary key (ip_hash, day)
);

alter table public.text_ip_usage enable row level security;

create or replace function public.consume_text_ip_quota(p_ip_hash text, p_limit integer)
returns table(allowed boolean, used integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.text_ip_usage (ip_hash, day, count)
  values (p_ip_hash, current_date, 0)
  on conflict (ip_hash, day) do nothing;

  select count into v_count
  from public.text_ip_usage
  where ip_hash = p_ip_hash and day = current_date
  for update;

  if v_count < p_limit then
    update public.text_ip_usage
    set count = v_count + 1
    where ip_hash = p_ip_hash and day = current_date;
    return query select true, v_count + 1;
    return;
  end if;

  return query select false, v_count;
end;
$$;

grant execute on function public.consume_text_ip_quota(text, integer) to service_role;
