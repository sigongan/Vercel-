-- Run this once in the Supabase SQL editor, after schema_02.
-- Pro-only weekly meal plan: assigns one saved recipe to a calendar date.

create table if not exists public.meal_plan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_date date not null,
  saved_recipe_id uuid not null references public.saved_recipes (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, plan_date)
);

create index if not exists meal_plan_user_date_idx on public.meal_plan (user_id, plan_date);

alter table public.meal_plan enable row level security;

create policy "Users can read their own meal plan"
  on public.meal_plan for select
  using (auth.uid() = user_id);

-- Insert requires an active pro plan, same guard as saved_recipes.
create policy "Pro users can plan meals"
  on public.meal_plan for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles where id = auth.uid() and plan = 'pro')
  );

create policy "Users can delete their own meal plan entries"
  on public.meal_plan for delete
  using (auth.uid() = user_id);

-- One recipe per day: upserting a new recipe onto an already-planned date
-- replaces it rather than erroring, so the app can PATCH-by-date in a
-- single round trip (delete-then-insert via the service-role client).
