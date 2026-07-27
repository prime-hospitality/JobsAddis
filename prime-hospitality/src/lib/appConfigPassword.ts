import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";
  return createClient(supabaseUrl, supabaseServiceKey);
};

function looksHashed(value: string) {
  return /^\$2[aby]\$/.test(value);
}

/** Verifies a password attempt against a bcrypt-hashed app_config value.
 *  Existing rows predate hashing and still hold plaintext -- when a
 *  plaintext value matches, it's transparently upgraded to a hash on the
 *  spot, so nobody has to reset a password to benefit from this. */
export async function verifyConfigPassword(key: string, passwordAttempt: string, fallback: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data } = await supabase.from("app_config").select("value").eq("key", key).maybeSingle();
  const stored = data?.value?.trim() || fallback;

  if (looksHashed(stored)) {
    return bcrypt.compare(passwordAttempt, stored);
  }
  if (passwordAttempt !== stored) return false;
  await supabase.from("app_config").upsert({ key, value: await bcrypt.hash(passwordAttempt, 10), updated_at: new Date().toISOString() });
  return true;
}

/** Sets a new app_config-backed credential, always stored hashed. */
export async function setConfigPassword(key: string, newPassword: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.from("app_config").upsert({ key, value: await bcrypt.hash(newPassword, 10), updated_at: new Date().toISOString() });
}
