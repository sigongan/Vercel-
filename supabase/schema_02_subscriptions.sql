-- Run this once in the Supabase SQL editor, after schema.sql.
-- Adds the "My Recipes" subscription: profiles.plan tracks Stripe
-- subscription state, saved_recipes stores what pro users bookmark.

alter table public.profiles
  add column if not exists plan text not null default 'free',
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text,
  add column if not exists current_period_end timestamptz;

create table if not exists public.saved_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe jsonb not null,
  title text not null,
  created_at timestamptz not null default now()
);

create index if not exists saved_recipes_user_id_idx on public.saved_recipes (user_id, created_at desc);

alter table public.saved_recipes enable row level security;

create policy "Users can read their own saved recipes"
  on public.saved_recipes for select
  using (auth.uid() = user_id);

-- Insert requires an active pro plan — enforced here too (not just in the
-- UI) so a direct API call can't bypass the paywall.
create policy "Pro users can save recipes"
  on public.saved_recipes for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles where id = auth.uid() and plan = 'pro')
  );

create policy "Users can delete their own saved recipes"
  on public.saved_recipes for delete
  using (auth.uid() = user_id);

-- Subscription status changes come from the Stripe webhook via the
-- service-role client, which bypasses RLS — no update policy needed here.
