import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AppleIdentity } from "@/lib/auth/appleToken";

/**
 * Turning a verified Apple identity into an account in our database.
 *
 * Accounts are keyed on Apple's `sub`, never on email. Email is the wrong key
 * for identity: Apple only sends it on the first authorization, users can
 * relay a private address, and addresses get changed and reassigned. `sub` is
 * stable for the life of the account and scoped to this app.
 */

export interface Account {
  id: string;
  email: string | null;
  displayName: string | null;
  isNew: boolean;
}

/** Name parts from `ASAuthorizationAppleIDCredential.fullName`, first sign-in only. */
export interface AppleNameHint {
  givenName?: string | null;
  familyName?: string | null;
}

function joinName(name: AppleNameHint | undefined): string | null {
  if (!name) return null;
  const joined = [name.givenName, name.familyName].filter(Boolean).join(" ").trim();
  return joined || null;
}

/**
 * Finds the account behind a verified Apple identity, creating one on first
 * sign-in.
 *
 * The identity argument must come from `verifyAppleIdentityToken`. Passing an
 * unverified `sub` here would let a caller assume any account, so there is
 * deliberately no overload that takes a bare string.
 */
export async function findOrCreateAccount(
  identity: AppleIdentity,
  nameHint?: AppleNameHint
): Promise<Account> {
  const supabase = createSupabaseAdminClient();

  const { data: existing, error: lookupError } = await supabase
    .from("app_users")
    .select("id, email, display_name")
    .eq("apple_sub", identity.appleSub)
    .maybeSingle();

  if (lookupError) throw new Error(`Could not look up account: ${lookupError.message}`);

  if (existing) {
    await backfillMissingDetails(existing, identity, nameHint);
    await ensureProfileRow(existing.id, existing.email ?? identity.email ?? null);
    return {
      id: existing.id,
      // Return what we'll have after the backfill, so a first-sign-in response
      // isn't missing the name the client just supplied.
      email: existing.email ?? identity.email ?? null,
      displayName: existing.display_name ?? joinName(nameHint),
      isNew: false,
    };
  }

  // `upsert` rather than `insert`: two devices signing in at the same moment
  // would otherwise race, and the loser would get a unique-violation error
  // instead of the account that was just created. Conflicting on apple_sub
  // makes the second one a no-op update that still returns the row.
  const { data: created, error: createError } = await supabase
    .from("app_users")
    .upsert(
      {
        apple_sub: identity.appleSub,
        email: identity.email ?? null,
        email_is_private: identity.isPrivateEmail,
        display_name: joinName(nameHint),
      },
      { onConflict: "apple_sub" }
    )
    .select("id, email, display_name")
    .single();

  if (createError || !created) {
    throw new Error(`Could not create account: ${createError?.message ?? "no row returned"}`);
  }

  await ensureProfileRow(created.id, created.email);

  return {
    id: created.id,
    email: created.email,
    displayName: created.display_name,
    isNew: true,
  };
}

/**
 * Fills in details we didn't have before, without ever clearing ones we did.
 *
 * Apple stops sending email and name after the first authorization, so an
 * unconditional update would wipe both on the user's second sign-in. That bug
 * is the reason this only ever writes into empty columns.
 */
async function backfillMissingDetails(
  existing: { id: string; email: string | null; display_name: string | null },
  identity: AppleIdentity,
  nameHint?: AppleNameHint
): Promise<void> {
  const patch: Record<string, unknown> = {};

  if (!existing.email && identity.email) {
    patch.email = identity.email;
    patch.email_is_private = identity.isPrivateEmail;
  }

  const name = joinName(nameHint);
  if (!existing.display_name && name) patch.display_name = name;

  // Cheap enough to always record, and it's what makes "last seen" meaningful.
  patch.last_seen_at = new Date().toISOString();

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("app_users").update(patch).eq("id", existing.id);
  if (error) throw new Error(`Could not update account: ${error.message}`);
}

/**
 * Quota, credits and plan live on `profiles`, and every gated route assumes a
 * row is there. Supabase Auth used to create it from a trigger on signup; now
 * that we create accounts ourselves, this is where that happens.
 */
async function ensureProfileRow(userId: string, email: string | null): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, email }, { onConflict: "id", ignoreDuplicates: true });

  if (error) throw new Error(`Could not create profile: ${error.message}`);
}

/**
 * Deletes the account and everything that cascades from it.
 *
 * Guideline 5.1.1(v) requires deletion to be real and available in-app, so
 * this is a hard delete rather than a flag: `profiles`, saved recipes,
 * collections and sessions all cascade from `app_users`.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("app_users").delete().eq("id", userId);
  if (error) throw new Error(`Could not delete account: ${error.message}`);
}
