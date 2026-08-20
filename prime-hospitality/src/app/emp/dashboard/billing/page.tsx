import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import RenewSubscriptionButton from "../RenewSubscriptionButton";
import { verifySessionValue } from "@/lib/signedSession";
import { readBonusStatus } from "@/lib/bonusDays";

async function getSession() {
  const sessionCookie = (await cookies()).get("employer_session");
  return verifySessionValue(sessionCookie?.value);
}

const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";
  return createClient(supabaseUrl, supabaseServiceKey);
};

export default async function BillingPage() {
  const session = await getSession();
  if (!session) redirect("/emp");

  const supabase = getSupabase();

  // This is the page an employer opens the morning their plan ran out, so the
  // bonus term is opened here rather than left to the next platform sweep --
  // otherwise the page they came to for exactly this answer could spend a
  // minute telling them "Expired" with the bonus days sitting beside it,
  // unstarted. Idempotent; see 20260820000000_employer_bonus_days.sql.
  try {
    await supabase.rpc("activate_due_bonus_days", { p_employer_id: session.employerId });
  } catch (err) {
    console.error("Bonus day activation failed:", err);
  }

  // Fetch employer's active package
  const { data: employer } = await supabase
    .from("employers")
    .select("active_package_id, package_expires_at, renewal_requested_at, renewal_seen_at, daily_post_limit, bonus_days, bonus_started_at, bonus_expires_at, bonus_days_active, packages(name, duration_days, price)")
    .eq("id", session.employerId)
    .maybeSingle();

  const pkgData = employer?.packages as any;
  const activePackage = Array.isArray(pkgData) ? pkgData[0] : pkgData;
  const expiresAt = employer?.package_expires_at ? new Date(employer.package_expires_at) : null;

  // Bonus days. While a bonus term runs it IS package_expires_at -- the days
  // were added to the subscription rather than parked next to it -- so
  // everything below that reads the expiry keeps working, and the only thing
  // this changes is what the page calls the days it's counting.
  const bonus = readBonusStatus(employer);
  const dailyPostLimit = employer?.daily_post_limit ?? 15;
  const limitPhrase = dailyPostLimit === -1 ? "unlimited posts a day" : `${dailyPostLimit} posts a day`;

  // Deliberately NOT the shared isSubscriptionExpired() null-is-expired
  // convention: this page needs to tell "never subscribed" (Free Tier /
  // Upgrade copy) apart from "subscribed, then lapsed" (Renew copy), so no
  // package must read as not-expired here.
  const isExpired = expiresAt ? expiresAt.getTime() < Date.now() : false;
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  // Same 24h-before-expiry gate as the Overview/Manage Job Postings nudge --
  // the Renew button only needs to show up once renewing is actually relevant.
  const showRenewalNudge = !expiresAt || expiresAt.getTime() - Date.now() <= 24 * 60 * 60 * 1000;

  // "Bonus Days" outranks "Active" here: both mean they can post, but only one
  // of them explains why the plan they last paid for is still letting them.
  const statusLabel = !activePackage ? "Free Tier" : bonus.running ? "Bonus Days" : isExpired ? "Expired" : "Active";
  const statusBg = !activePackage ? "rgba(255,255,255,0.15)" : bonus.running ? "#D9E5F8" : isExpired ? "#fee2e2" : "#dcfce3";
  const statusColor = !activePackage ? "#fff" : bonus.running ? "#113978" : isExpired ? "#E5484D" : "#166534";

  const bonusHeadline = bonus.running
    ? "Your bonus days are running"
    : `${bonus.banked} bonus day${bonus.banked === 1 ? "" : "s"} waiting for you`;

  const bonusBody = bonus.running
    ? `${bonus.daysLeft} of ${bonus.activeDays} left — they end on ${bonus.endsAt!.toLocaleDateString()}. Nothing else changed when they started: you're still posting on your ${activePackage?.name || "current"} terms, with the same ${limitPhrase}.` +
      (bonus.banked > 0 ? ` Another ${bonus.banked} start once these finish.` : "")
    : expiresAt
      ? `Free posting days from JobsAddis. They start on their own the moment your ${activePackage?.name || "current"} plan ends on ${expiresAt.toLocaleDateString()} — and while they run you post exactly the way you do today: same plan, same ${limitPhrase}.`
      : "Free posting days from JobsAddis. They'll start on their own once you're on a plan and that plan runs out, and while they run you'll post on those same terms.";

  const features = [
    { label: "Post job openings", icon: "briefcase" },
    { label: "Applicant tracking & shortlisting", icon: "users" },
    { label: "Recruitment analytics", icon: "chart" },
    { label: "Priority support", icon: "shield" },
  ];

  const featureIcon = (name: string) => {
    switch (name) {
      case "briefcase":
        return <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></>;
      case "users":
        return <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>;
      case "chart":
        return <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>;
      case "shield":
        return <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>;
      default:
        return null;
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>

      {/* Hero banner - current plan */}
      <div style={{ background: "linear-gradient(135deg, #141821 0%, #212630 100%)", borderRadius: 16, padding: "28px 32px", marginBottom: 24, color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Current Plan</span>
            <span style={{ background: statusBg, color: statusColor, padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>{statusLabel}</span>
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            {activePackage ? activePackage.name : "Free / Manual Tier"}
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", margin: "6px 0 0 0" }}>
            {!activePackage
              ? "Upgrade to unlock job postings and applicant tracking."
              : bonus.running
                ? `Your ${activePackage.duration_days} day plan has ended — you're posting on bonus days, on the same terms.`
                : `${activePackage.duration_days} day plan${activePackage.price ? ` · ${Number(activePackage.price).toLocaleString("en-US")} ETB` : ""}`}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", color: "#fff" }}>
          {showRenewalNudge && (
            <RenewSubscriptionButton employerId={session.employerId} initialRequestedAt={employer?.renewal_requested_at ?? null} initialSeenAt={employer?.renewal_seen_at ?? null} />
          )}
          <Link
            href="/pricing"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 10, padding: "10px 18px", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none", backdropFilter: "blur(8px)", transition: "background 0.2s", flexShrink: 0 }}
          >
            {activePackage ? "Upgrade Plan" : "View Pricing Plans"}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>
      </div>

      {/* Stat tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", border: "1px solid #E2E5EC", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "#1B5CBF18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ color: "#1B5CBF" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9AA1B1", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Plan Price</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#141821", letterSpacing: "-0.02em", lineHeight: 1 }}>{activePackage?.price ? `${Number(activePackage.price).toLocaleString("en-US")} ETB` : "Free"}</div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", border: "1px solid #E2E5EC", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "#164A9C18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ color: "#164A9C" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9AA1B1", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Duration</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#141821", letterSpacing: "-0.02em", lineHeight: 1 }}>{activePackage ? `${activePackage.duration_days} Days` : "—"}</div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", border: "1px solid #E2E5EC", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: `${isExpired ? "#E5484D" : bonus.running ? "#164A9C" : "#12A150"}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ color: isExpired ? "#E5484D" : bonus.running ? "#164A9C" : "#12A150" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9AA1B1", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{bonus.running ? "Bonus Ends" : isExpired ? "Expired On" : "Renews / Expires"}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: isExpired ? "#E5484D" : "#141821", letterSpacing: "-0.02em", lineHeight: 1 }}>{expiresAt ? expiresAt.toLocaleDateString() : "—"}</div>
            {daysLeft !== null && !isExpired && (
              <div style={{ fontSize: 12, color: "#9AA1B1", marginTop: 4 }}>{daysLeft} {bonus.running ? "bonus " : ""}day{daysLeft === 1 ? "" : "s"} left</div>
            )}
          </div>
        </div>

        {/* Only worth a tile when there is something in it. An employer with no
            bonus should not be shown a permanent "0 Days" reminder of a thing
            they were never given. */}
        {bonus.hasAny && (
          <div style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", border: "1px solid #E2E5EC", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "#12A15018", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ color: "#12A150" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9AA1B1", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{bonus.running ? "Bonus Days Left" : "Bonus Days"}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#141821", letterSpacing: "-0.02em", lineHeight: 1 }}>
                {bonus.running ? `${bonus.daysLeft} of ${bonus.activeDays}` : bonus.banked}
              </div>
              <div style={{ fontSize: 12, color: "#9AA1B1", marginTop: 4 }}>
                {bonus.running
                  ? bonus.banked > 0 ? `${bonus.banked} more waiting after` : "Running now"
                  : "Waiting — free"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bonus days. Worth a panel of its own rather than a line in a tile:
          "free days, which begin later, on the terms you have now" is three
          separate facts, and an employer who gets any one of them wrong turns a
          gift into a support call. */}
      {bonus.hasAny && (
        <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${bonus.running ? "#B7E4CB" : "#E2E5EC"}`, marginBottom: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", display: "flex", alignItems: "flex-start", gap: 16, padding: "20px 22px" }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "#12A15018", color: "#12A150", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#141821", margin: 0 }}>{bonusHeadline}</h3>
            <p style={{ fontSize: 13, color: "#4C5361", margin: "6px 0 0 0", lineHeight: 1.6 }}>{bonusBody}</p>
          </div>
        </div>
      )}

      {/* What's included */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E5EC", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #EFF1F5" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#141821", margin: 0 }}>What&apos;s Included</h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, padding: 20 }}>
          {features.map((f) => (
            <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", border: "1px solid #EFF1F5", borderRadius: 10, background: "#F7F8FA" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#EEF3FC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#1B5CBF" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{featureIcon(f.icon)}</svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#343A46" }}>{f.label}</span>
            </div>
          ))}
        </div>
        {(!activePackage || isExpired) && (
          <div style={{ padding: "18px 20px", borderTop: "1px solid #EFF1F5", background: "#F7F8FA", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <p style={{ fontSize: 13, color: "#6E7686", margin: 0 }}>
              {isExpired ? "Your plan has expired. Renew now to keep your job posts visible." : "You're on the free/manual tier. Upgrade to unlock more features."}
            </p>
            <Link href="/pricing" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#141821", color: "#fff", textDecoration: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
              {isExpired ? "Renew Plan" : "View Pricing Plans"}
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
