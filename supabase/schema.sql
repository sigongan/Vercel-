-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  credits integer not null default 0,
  free_used_this_period integer not null default 0,
  free_period_start date not null default date_trunc('month', now())::date,
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- All writes (usage increments, credit grants) go through the server using the
-- service role key, which bypasses RLS — no insert/update policy is needed here.

-- Auto-create a profile row whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Result cache: identical source (same file bytes / URL / pasted text, same
-- output language) skips both extraction and the AI call entirely.
create table if not exists public.recipe_cache (
  content_hash text primary key,
  recipe jsonb not null,
  hit_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.recipe_cache enable row level security;
-- No public policies — only the server's service-role client reads/writes this table.

-- Atomically consumes one unit of quota: free monthly allowance first (reset
-- when the period has rolled over), then purchased credits. `for update`
-- locks the row for the duration of the transaction so concurrent requests
-- from the same user can't both succeed past the limit.
create or replace function public.consume_quota(p_user_id uuid, p_free_limit integer)
returns table(allowed boolean, via text, free_used integer, credits integer)
language plpgsql
security definer set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_month_start date := date_trunc('month', now())::date;
begin
  select * into v_profile from public.profiles where id = p_user_id for update;

  if v_profile.id is null then
    insert into public.profiles (id) values (p_user_id) returning * into v_profile;
  end if;

  if v_profile.free_period_start < v_month_start then
    v_profile.free_used_this_period := 0;
    v_profile.free_period_start := v_month_start;
  end if;

  if v_profile.free_used_this_period < p_free_limit then
    v_profile.free_used_this_period := v_profile.free_used_this_period + 1;
    update public.profiles
      set free_used_this_period = v_profile.free_used_this_period,
          free_period_start = v_profile.free_period_start
      where id = p_user_id;
    return query select true, 'free'::text, v_profile.free_used_this_period, v_profile.credits;
    return;
  end if;

  if v_profile.credits > 0 then
    v_profile.credits := v_profile.credits - 1;
    update public.profiles
      set credits = v_profile.credits,
          free_period_start = v_profile.free_period_start,
          free_used_this_period = v_profile.free_used_this_period
      where id = p_user_id;
    return query select true, 'credit'::text, v_profile.free_used_this_period, v_profile.credits;
    return;
  end if;

  update public.profiles
    set free_period_start = v_profile.free_period_start,
        free_used_this_period = v_profile.free_used_this_period
    where id = p_user_id;
  return query select false, 'none'::text, v_profile.free_used_this_period, v_profile.credits;
end;
$$;

grant execute on function public.consume_quota(uuid, integer) to service_role;

-- Adds purchased credits (called from the Stripe webhook after payment).
create or replace function public.add_credits(p_user_id uuid, p_amount integer)
returns void
language sql
security definer set search_path = public
as $$
  update public.profiles set credits = credits + p_amount where id = p_user_id;
$$;

grant execute on function public.add_credits(uuid, integer) to service_role;
