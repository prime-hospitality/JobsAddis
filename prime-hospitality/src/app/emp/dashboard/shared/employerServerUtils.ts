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
