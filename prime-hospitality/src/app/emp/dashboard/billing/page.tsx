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

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "48px 32px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ color: "#94a3b8", display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Billing & Plans</h2>
        <p style={{ fontSize: 15, color: "#64748b", marginBottom: 32 }}>Manage your subscription plan, view invoices, and update billing details.</p>

        {activePackage ? (
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "24px", maxWidth: 400, margin: "0 auto 32px", textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>Current Plan</h3>
              {isExpired ? (
                <span style={{ background: "#fee2e2", color: "#991b1b", padding: "4px 10px", borderRadius: 100, fontSize: 12, fontWeight: 600 }}>Expired</span>
              ) : (
                <span style={{ background: "#dcfce3", color: "#166534", padding: "4px 10px", borderRadius: 100, fontSize: 12, fontWeight: 600 }}>Active</span>
              )}
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>{activePackage.name}</div>
              <div style={{ fontSize: 14, color: "#64748b" }}>Duration: {activePackage.duration_days} Days</div>
            </div>
            {expiresAt && (
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 16, marginTop: 16, fontSize: 14, color: "#475569", display: "flex", alignItems: "center", gap: 6 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Expires: <span style={{ fontWeight: 600, color: isExpired ? "#ef4444" : "#0f172a" }}>{expiresAt.toLocaleDateString()}</span>
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "24px", maxWidth: 400, margin: "0 auto 32px" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 8px 0" }}>No Active Plan</h3>
            <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>You are currently on the free/manual tier. Upgrade to unlock more features.</p>
          </div>
        )}
        
        <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
          <Link href="/pricing" style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            gap: 8, 
            background: "#0f172a", 
            color: "#fff", 
            textDecoration: "none", 
            padding: "10px 20px", 
            borderRadius: 8, 
            fontSize: 14, 
            fontWeight: 600,
            transition: "background 0.2s"
          }}
          >
            {activePackage ? "Upgrade Plan" : "View Pricing Plans"}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
