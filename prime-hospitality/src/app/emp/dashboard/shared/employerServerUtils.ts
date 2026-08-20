import { createClient } from "@supabase/supabase-js";
import { getEmployerSession } from "../../actions";

export const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";
  return createClient(supabaseUrl, supabaseServiceKey);
};

export async function requireEmployer() {
  const session = await getEmployerSession();
  if (!session?.employerId) return null;
  return session as { employerId: string; telegramId: number; businessName: string; businessType: string; logoUrl?: string | null };
}

/** Opens this employer's bonus term if their subscription has lapsed with
 *  bonus days banked (see 20260820000000_employer_bonus_days.sql).
 *
 *  The every-minute platform sweep does this for everybody, so the only thing
 *  this call buys is the minute in between -- but that minute is the one where
 *  an employer whose plan ended at midnight opens the dashboard, sees "Post a
 *  Job" greyed out and concludes the bonus they were promised isn't real. It
 *  runs before the reads that gate posting and before the billing page, which
 *  is where that impression would form.
 *
 *  Idempotent and cheap: an employer with nothing due matches no rows. Failure
 *  is swallowed on purpose -- the sweep will pick the activation up shortly,
 *  and a hiccup here must not take down the dashboard the employer came for. */
export async function activateBonusDays(supabase: ReturnType<typeof getSupabase>, employerId: string) {
  try {
    await supabase.rpc("activate_due_bonus_days", { p_employer_id: employerId });
  } catch (err) {
    console.error("Bonus day activation failed:", err);
  }
}

/** Records an employer-originated action to the shared activity_log table, so
 *  the admin dashboard's "Employer Activity" panel has a real, actor-accurate
 *  trail instead of inferring activity from current `jobs` row state (which
 *  can't tell an employer's action from an admin's, loses the timestamp of
 *  any status change, and vanishes entirely on delete). Reuses the existing
 *  activity_log table (actor/action/target/metadata are all generic) — admin
 *  actions tag `actor` with the admin username; this tags it with the
 *  employer's business name and stamps metadata.source = "employer" so the
 *  two trails stay cleanly distinguishable in the same table. */
export async function logEmployerActivity(
  session: { employerId: string; businessName: string },
  action: string,
  target?: string | null,
  metadata?: Record<string, any>
) {
  try {
    await getSupabase().from("activity_log").insert({
      actor: session.businessName,
      action,
      target: target || null,
      metadata: { ...metadata, source: "employer", employerId: session.employerId },
    });
  } catch (err) {
    console.error("Failed to write employer activity log:", err);
  }
}
