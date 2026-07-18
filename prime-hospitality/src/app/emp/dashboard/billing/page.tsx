import Link from "next/link";

export default function BillingPage() {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "48px 32px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ color: "#94a3b8", display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Billing & Plans</h2>
        <p style={{ fontSize: 15, color: "#64748b", marginBottom: 24 }}>Manage your subscription plan, view invoices, and update billing details.</p>
        
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12 }}>
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
            View Pricing Plans
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
