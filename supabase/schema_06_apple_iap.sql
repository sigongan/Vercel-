-- Run this once in the Supabase SQL editor, after schema_02_subscriptions.sql.
-- Lets the Pro subscription be sold either via Stripe (web) or Apple IAP
-- (the iOS app, required by App Store review guideline 3.1.1 for anything
-- purchased inside the app). plan/subscription_status/current_period_end
-- already exist and are provider-agnostic; this just adds what's specific
-- to Apple's side and a marker for which provider currently owns the row.

alter table public.profiles
  add column if not exists plan_source text,
  add column if not exists apple_original_transaction_id text;

create unique index if not exists profiles_apple_original_transaction_id_idx
  on public.profiles (apple_original_transaction_id)
  where apple_original_transaction_id is not null;

-- Subscription status changes come from either the Stripe webhook or the
-- Apple Server Notifications endpoint, both via the service-role client,
-- which bypasses RLS — no update policy needed here.
