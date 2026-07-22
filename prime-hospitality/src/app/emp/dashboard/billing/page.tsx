import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

async function getSession() {
  const sessionCookie = (await cookies()).get("employer_session");
  if (!sessionCookie?.value) return null;
  try {
    return JSON.parse(sessionCookie.value);
  } catch {
    return null;
  }
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
  
  // Fetch employer's active package
  const { data: employer } = await supabase
    .from("employers")
    .select("active_package_id, package_expires_at, packages(name, duration_days, price)")
    .eq("id", session.employerId)
    .maybeSingle();

  const pkgData = employer?.packages as any;
  const activePackage = Array.isArray(pkgData) ? pkgData[0] : pkgData;
  const expiresAt = employer?.package_expires_at ? new Date(employer.package_expires_at) : null;
  const isExpired = expiresAt ? expiresAt.getTime() < Date.now() : false;
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  const statusLabel = !activePackage ? "Free Tier" : isExpired ? "Expired" : "Active";
  const statusBg = !activePackage ? "rgba(255,255,255,0.15)" : isExpired ? "#fee2e2" : "#dcfce3";
  const statusColor = !activePackage ? "#fff" : isExpired ? "#991b1b" : "#166534";

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
      <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", borderRadius: 16, padding: "28px 32px", marginBottom: 24, color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Current Plan</span>
            <span style={{ background: statusBg, color: statusColor, padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>{statusLabel}</span>
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            {activePackage ? activePackage.name : "Free / Manual Tier"}
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", margin: "6px 0 0 0" }}>
            {activePackage
              ? `${activePackage.duration_days} day plan${activePackage.price ? ` · ${activePackage.price} ETB` : ""}`
              : "Upgrade to unlock job postings and applicant tracking."}
          </p>
        </div>
        <Link
          href="/pricing"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 10, padding: "10px 18px", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none", backdropFilter: "blur(8px)", transition: "background 0.2s", flexShrink: 0 }}
        >
          {activePackage ? "Upgrade Plan" : "View Pricing Plans"}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </Link>
      </div>

      {/* Stat tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "#0284c718", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ color: "#0284c7" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Plan Price</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1 }}>{activePackage?.price ? `${activePackage.price} ETB` : "Free"}</div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "#7c3aed18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ color: "#7c3aed" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Duration</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em", lineHeight: 1 }}>{activePackage ? `${activePackage.duration_days} Days` : "—"}</div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: `${isExpired ? "#ef4444" : "#059669"}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ color: isExpired ? "#ef4444" : "#059669" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{isExpired ? "Expired On" : "Renews / Expires"}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: isExpired ? "#ef4444" : "#0f172a", letterSpacing: "-0.02em", lineHeight: 1 }}>{expiresAt ? expiresAt.toLocaleDateString() : "—"}</div>
            {daysLeft !== null && !isExpired && (
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{daysLeft} day{daysLeft === 1 ? "" : "s"} left</div>
            )}
          </div>
        </div>
      </div>

      {/* What's included */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>What&apos;s Included</h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, padding: 20 }}>
          {features.map((f) => (
            <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", border: "1px solid #f1f5f9", borderRadius: 10, background: "#f8fafc" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#0284c7" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{featureIcon(f.icon)}</svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#334155" }}>{f.label}</span>
            </div>
          ))}
        </div>
        {(!activePackage || isExpired) && (
          <div style={{ padding: "18px 20px", borderTop: "1px solid #f1f5f9", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
              {isExpired ? "Your plan has expired. Renew now to keep your job posts visible." : "You're on the free/manual tier. Upgrade to unlock more features."}
            </p>
            <Link href="/pricing" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#0f172a", color: "#fff", textDecoration: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
              {isExpired ? "Renew Plan" : "View Pricing Plans"}
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
