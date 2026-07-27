import crypto from "crypto";

// Reuses the Supabase service-role key as the HMAC secret rather than
// introducing a new required env var -- it's already a per-deployment
// secret that's never shipped to the client, so it doubles as a signing
// key without adding a manual step to the deploy runbook.
function getSigningSecret() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "insecure-dev-fallback-secret-do-not-use-in-production";
}

/** Serializes and HMAC-signs a session payload for use as a cookie value.
 *  Plain JSON.stringify cookies can be handcrafted by anyone who can write
 *  a cookie for the domain -- this makes tampering detectable. */
export function signSessionValue(payload: unknown): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", getSigningSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

/** Verifies and parses a cookie value produced by signSessionValue. Returns
 *  null for anything missing, malformed, or with a bad signature -- callers
 *  should treat that identically to "no session". */
export function verifySessionValue<T = any>(value: string | null | undefined): T | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot === -1) return null;
  const body = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = crypto.createHmac("sha256", getSigningSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
