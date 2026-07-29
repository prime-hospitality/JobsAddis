/**
 * The key these functions use to reach the database with row level security
 * bypassed.
 *
 * Supabase injects SUPABASE_SERVICE_ROLE_KEY into every function automatically,
 * and that was read directly until now. The problem is that the injected value
 * is the *legacy* JWT key, so the moment legacy keys are disabled on the project
 * every function here would start returning 401 with nothing in the code to
 * change. Reserved SUPABASE_* names cannot be overridden in the dashboard, so
 * the replacement has to arrive under a name of our own.
 *
 * SB_SECRET_KEY is that name. The fallback to the injected legacy key is what
 * makes the migration safe in either order: deploy this before the secret is
 * set and the functions keep using the legacy key exactly as before; set the
 * secret and they switch over on the next invocation. Nothing has to happen
 * within a particular window.
 *
 * Once legacy keys are disabled and every function has been confirmed working,
 * the fallback is dead weight and can go.
 */
export function serviceKey(): string {
  return Deno.env.get("SB_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
}
