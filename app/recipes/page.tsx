import { redirect } from "next/navigation";

// Saved-recipes list moved to /library (now merged with on-device Recent
// recipes under one Library tab in the bottom nav). /recipes/[id] — the
// per-recipe costing calculator — is unaffected and stays at its own route.
export default function RecipesRedirect() {
  redirect("/library");
}
