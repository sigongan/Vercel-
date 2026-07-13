-- Run this once in the Supabase SQL editor, after schema_02.
-- Adds free-text "Collections" (folders) to saved_recipes, e.g. "Weeknight
-- Dinners", "Desserts" — the organizing feature every competitor has and
-- Avocato's flat list doesn't yet.

alter table public.saved_recipes
  add column if not exists collection text;

create index if not exists saved_recipes_collection_idx
  on public.saved_recipes (user_id, collection);
