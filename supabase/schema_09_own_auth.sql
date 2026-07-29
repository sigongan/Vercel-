-- Own the account and session tables, instead of leaning on Supabase Auth.
--
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- It is written to be safe to re-run, and safe to run while the site is live:
-- nothing here drops a column, deletes a row, or changes an existing user's id.
--
-- What changes: identity stops living in Supabase's `auth.users` and moves to
-- `public.app_users`, which we control. Supabase remains the database — this
-- migration only stops treating its Auth *service* as the source of truth for
-- who a user is.
--
-- What deliberately does NOT change yet: the existing Supabase Auth sign-in
-- paths keep working. `handle_new_user` is rewritten below to populate both
-- tables, so a signup through the old path still lands a usable account while
-- the app is mid-migration. Removing that bridge is a later, separate step,
-- once nothing signs in through Supabase Auth any more.

-- ---------------------------------------------------------------------------
-- 1. Accounts
-- ---------------------------------------------------------------------------

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),

  -- Apple's stable, app-scoped user identifier. The real login key: unlike an
  -- email it cannot be changed, transferred, or re-registered by someone else.
  -- Nullable only so accounts created through the old Supabase path (which may
  -- predate Apple sign-in) can be backfilled without inventing a value.
  apple_sub text unique,

  -- Apple sends an address only on the *first* authorization, and the user may
  -- relay a private one. Treated as a display convenience, never as identity.
  email text,
  email_is_private boolean not null default false,

  -- Also first-authorization-only, and only if the user agrees to share it.
  display_name text,

  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

comment on column public.app_users.apple_sub is
  'Apple''s `sub` claim. Stable per (user, app); the value we match returning users on.';
comment on column public.app_users.email is
  'Best-effort, for display and support only. Apple omits it after first sign-in, so never overwrite a stored value with null.';

alter table public.app_users enable row level security;
-- No policies: every read and write goes through the server's service-role
-- client. A user-facing client should never be able to enumerate accounts.

-- ---------------------------------------------------------------------------
-- 2. Bring existing users across, keeping their ids
-- ---------------------------------------------------------------------------
--
-- Ids are preserved on purpose. `profiles`, `saved_recipes`, collections and
-- everything else already reference these uuids; minting new ones would orphan
-- every row a user owns. This is the single most important property of this
-- migration.

-- 2a. From Supabase Auth, including the Apple subject where one exists, so
--     users who already signed in with Apple are recognised rather than
--     duplicated on their next sign-in.
insert into public.app_users (id, apple_sub, email, created_at)
select
  u.id,
  (
    select i.provider_id
    from auth.identities i
    where i.user_id = u.id and i.provider = 'apple'
    limit 1
  ),
  u.email,
  u.created_at
from auth.users u
on conflict (id) do nothing;

-- 2b. Belt and braces: any profile without a matching auth user still gets an
--     account row, so the foreign key below cannot fail on legacy data.
insert into public.app_users (id, email, created_at)
select p.id, p.email, p.created_at
from public.profiles p
on conflict (id) do nothing;

-- 2c. Fill in the Apple subject for accounts that arrived via 2b or predate
--     the identities backfill. Skips rows that already have one.
update public.app_users a
set apple_sub = i.provider_id
from auth.identities i
where i.user_id = a.id
  and i.provider = 'apple'
  and a.apple_sub is null
  and not exists (
    select 1 from public.app_users other
    where other.apple_sub = i.provider_id and other.id <> a.id
  );

-- ---------------------------------------------------------------------------
-- 3. Point profiles at accounts we own
-- ---------------------------------------------------------------------------
--
-- Same column, same values — only the table it references changes. Dropping
-- the old constraint first is what lets Supabase Auth rows eventually be
-- deleted without taking user data with them.

alter table public.profiles drop constraint if exists profiles_id_fkey;

alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id) references public.app_users (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- 4. Sessions
-- ---------------------------------------------------------------------------
--
-- Opaque random tokens, not JWTs. The app already touches this database on
-- essentially every request (quota, saved recipes), so the extra lookup costs
-- nothing measurable — and in exchange, revocation is immediate and total.
-- With a stateless JWT, a signed-out or deleted user's token would keep
-- working until it expired.
--
-- Only the SHA-256 of the token is stored. If this table ever leaked, the
-- hashes would not be usable as credentials.

create table if not exists public.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users (id) on delete cascade,

  -- Hex sha256 of the token. Unique so a duplicate can never be issued, and
  -- so lookup is a single index probe.
  token_hash text not null unique,

  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at timestamptz not null,

  -- Set rather than deleting the row: it keeps "you signed out" distinguishable
  -- from "it expired" when working out why someone was logged out.
  revoked_at timestamptz,

  -- Free-text, for the user's own "signed-in devices" list later. Never trusted
  -- for any decision — it comes from the client.
  client_name text
);

comment on table public.auth_sessions is
  'Server-side sessions. The raw token is never stored, only its sha256.';

create index if not exists auth_sessions_user_id_idx
  on public.auth_sessions (user_id);

-- Supports the periodic cleanup of dead rows without scanning live sessions.
create index if not exists auth_sessions_expires_at_idx
  on public.auth_sessions (expires_at);

alter table public.auth_sessions enable row level security;
-- No policies, for the same reason as app_users: server-only, service role.

-- ---------------------------------------------------------------------------
-- 5. Keep the old signup path working during the transition
-- ---------------------------------------------------------------------------
--
-- `profiles` now references `app_users`, so the existing trigger would fail on
-- a Supabase Auth signup unless it creates the account row first. This keeps
-- the web app's current sign-in working unchanged until it is migrated too.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.app_users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Housekeeping
-- ---------------------------------------------------------------------------

-- Clears out sessions that can no longer authenticate anyone. Safe to call
-- from a scheduled job; returns how many rows it removed.
create or replace function public.purge_dead_sessions(p_keep_revoked_days integer default 30)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.auth_sessions
  where expires_at < now()
     or (revoked_at is not null and revoked_at < now() - make_interval(days => p_keep_revoked_days));

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

grant execute on function public.purge_dead_sessions(integer) to service_role;
