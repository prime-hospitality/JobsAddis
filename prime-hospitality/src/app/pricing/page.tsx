import Link from "next/link";
import React from "react";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

// Default config matching the flat structure from AdminDashboard
const DEFAULT_CONFIG = {
  threeDays: "1,983.75",
  fiveDays: "2,645.00",
  oneWeek: "3,306.25",
  twoWeeks: "5,290.00",
  oneMonth: "7,273.75",
  threeMonths: "16,531.25",
  sixMonths: "25,127.50",
  oneYear: "46,287.50",
  pinVacancy: "1,000",
  companyName: "Prime Hospitality Business Group PLC",
  bankName: "Awash Bank",
  accountNo: "013041457659800"
};

async function getPricingConfig() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (!supabaseUrl || !supabaseServiceKey) return DEFAULT_CONFIG;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "pricing_config")
      .maybeSingle();

    if (data?.value) {
      const parsed = JSON.parse(data.value);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (e) {
    console.error("Failed to fetch pricing config:", e);
  }
  return DEFAULT_CONFIG;
}

export default async function PricingPage() {
  const sessionCookie = (await cookies()).get("employer_session");
  const isAuthenticated = !!sessionCookie?.value;
  const config = await getPricingConfig();

  const standardPackages = [
    { label: 'Three Days Package', price: config.threeDays },
    { label: 'Five Days Package', price: config.fiveDays },
    { label: 'One Week Package', price: config.oneWeek },
    { label: 'Two Weeks Package', price: config.twoWeeks },
    { label: 'One Month Package', price: config.oneMonth },
    { label: "Three Month's Package", price: config.threeMonths },
  ];

  const premiumPackages = [
    { label: "Six Month's Membership", price: config.sixMonths },
    { label: 'One Year Membership', price: config.oneYear },
  ];

  const addOns = [
    { label: 'Pin Your Vacancy', price: `${config.pinVacancy} / Day` }
  ];

  const checkIcon = (stroke: string) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", fontFamily: "'Inter', sans-serif" }}>
      {/* Navigation */}
      <nav style={{ padding: "24px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E2E8F0", backgroundColor: "#fff" }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo.png" alt="Prime Hospitality Logo" style={{ width: 36, height: 36, objectFit: "contain" }} />
          <span style={{ letterSpacing: "-0.01em" }}>Prime Hospitality</span>
        </div>
        
        {isAuthenticated && (
          <Link href="/emp/dashboard/billing" style={{ 
            color: "#475569", 
            textDecoration: "none", 
            fontWeight: 600, 
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #E2E8F0",
            backgroundColor: "#fff",
            transition: "all 0.2s"
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Back to Dashboard
          </Link>
        )}
      </nav>

      {/* Hero */}
      <div style={{ padding: "80px 24px 60px", textAlign: "center" }}>
        <h1 style={{ fontSize: 42, fontWeight: 800, color: "#0F172A", marginBottom: 20, letterSpacing: "-0.03em" }}>
          Welcome! We're so glad you're here.
        </h1>
        <p style={{ fontSize: 18, color: "#64748B", maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>
          Thank you for choosing JobsAddis to grow your team. Take a look at our flexible pricing packages below and find the perfect fit for your hiring needs.
        </p>
      </div>

      {/* Pricing Cards */}
      <div style={{ 
        maxWidth: 1200, 
        margin: "0 auto", 
        padding: "0 24px 40px", 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", 
        gap: 32,
        alignItems: "stretch"
      }}>
        {/* Standard Packages */}
        <div style={{ 
          backgroundColor: "#fff", 
          borderRadius: 24, 
          padding: 40, 
          border: "1px solid #E2E8F0",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
          display: "flex",
          flexDirection: "column"
        }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>Standard Packages</h3>
          <p style={{ fontSize: 15, color: "#64748B", marginBottom: 28, minHeight: 44, lineHeight: 1.5 }}>
            Posted <strong>(3) Times Per Day</strong>. Prices are in ETB.
          </p>
          <div style={{ marginBottom: 32, display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 36, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>
              From {config.threeDays}
            </span>
            <span style={{ fontSize: 16, color: "#64748B", fontWeight: 500 }}>ETB</span>
          </div>
          
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16, flexGrow: 1 }}>
            {standardPackages.map((pkg, i) => (
              <li key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 15, color: "#475569" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ backgroundColor: "#ECFDF5", borderRadius: "50%", padding: 4, display: "flex", minWidth: 22, minHeight: 22 }}>
                    {checkIcon("#10B981")}
                  </div>
                  <span>{pkg.label}</span>
                </div>
                <span style={{ fontWeight: 600, color: "#0F172A", textAlign: "right" }}>{pkg.price}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Premium Memberships Plan */}
        <div style={{ 
          backgroundColor: "#0F172A", 
          borderRadius: 24, 
          padding: "44px 40px", 
          border: "1px solid #1E293B",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          position: "relative",
          display: "flex",
          flexDirection: "column"
        }}>
          <div style={{ 
            position: "absolute", 
            top: -14, 
            left: "50%", 
            transform: "translateX(-50%)", 
            backgroundColor: "#0ea5e9", 
            color: "#fff", 
            padding: "6px 16px", 
            borderRadius: 20, 
            fontSize: 12, 
            fontWeight: 700, 
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            boxShadow: "0 4px 6px -1px rgba(14, 165, 233, 0.4)"
          }}>
            Memberships
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Long Term Memberships</h3>
          <p style={{ fontSize: 15, color: "#94A3B8", marginBottom: 28, minHeight: 44, lineHeight: 1.5 }}>
            Posted <strong>(5) Times Per Day</strong>. Best for frequent hiring.
          </p>
          <div style={{ marginBottom: 32, display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 36, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
              From {config.sixMonths}
            </span>
            <span style={{ fontSize: 16, color: "#94A3B8", fontWeight: 500 }}>ETB</span>
          </div>
          
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16, flexGrow: 1, marginBottom: 24 }}>
            {premiumPackages.map((pkg, i) => (
              <li key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 15, color: "#E2E8F0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ backgroundColor: "rgba(56, 189, 248, 0.2)", borderRadius: "50%", padding: 4, display: "flex", minWidth: 22, minHeight: 22 }}>
                    {checkIcon("#38BDF8")}
                  </div>
                  <span>{pkg.label}</span>
                </div>
                <span style={{ fontWeight: 600, color: "#fff", textAlign: "right", whiteSpace: "nowrap" }}>{pkg.price}</span>
              </li>
            ))}
          </ul>
          
          <div style={{ backgroundColor: "rgba(255,255,255,0.05)", padding: 16, borderRadius: 12, marginTop: "auto" }}>
            <p style={{ fontSize: 14, color: "#E2E8F0", lineHeight: 1.5, margin: 0 }}>
              <span style={{ color: "#38BDF8", fontWeight: 600, marginRight: 6 }}>📌 Note:</span>
              Any of the Package Doesn&apos;t Have a Position limitation. It Means, You can Post Multiple Positions Under Any of the Package.
            </p>
          </div>
        </div>

        {/* Add-ons Plan */}
        <div style={{ 
          backgroundColor: "#fff", 
          borderRadius: 24, 
          padding: 40, 
          border: "1px solid #E2E8F0",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
          display: "flex",
          flexDirection: "column"
        }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>Add-ons &amp; Consulting</h3>
          <p style={{ fontSize: 15, color: "#64748B", marginBottom: 28, minHeight: 44, lineHeight: 1.5 }}>Extra services for your business in your preference.</p>
          <div style={{ marginBottom: 32, display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 36, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>Custom</span>
          </div>
          
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16, flexGrow: 1 }}>
            {addOns.map((addon, i) => (
              <li key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 15, color: "#475569", paddingBottom: i < addOns.length - 1 ? 16 : 0, borderBottom: i < addOns.length - 1 ? "1px solid #E2E8F0" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ backgroundColor: "#EFF6FF", borderRadius: "50%", padding: 4, display: "flex", minWidth: 22, minHeight: 22 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  </div>
                  <span style={{ fontWeight: 500 }}>{addon.label}</span>
                </div>
                <span style={{ fontWeight: 600, color: "#0F172A", textAlign: "right" }}>{addon.price}</span>
              </li>
            ))}
            
            <div style={{ fontSize: 13, fontWeight: 600, color: "#64748B", textTransform: "uppercase", marginTop: 8, letterSpacing: "0.05em" }}>We Also Provide:</div>
            {['Screening & Hiring', 'Training', 'Cost & Operational Audit', 'Food Safety Audit', 'Menu Development', 'Monthly Financial Review', 'Hospitality Consultancy'].map((feature, i) => (
              <li key={`extra-${i}`} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 15, color: "#475569" }}>
                <div style={{ backgroundColor: "#ECFDF5", borderRadius: "50%", padding: 4, display: "flex", minWidth: 22, minHeight: 22 }}>
                  {checkIcon("#10B981")}
                </div>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Details Section */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ 
          backgroundColor: "#fff", 
          borderRadius: 24, 
          padding: 40, 
          border: "1px solid #E2E8F0",
          display: "flex",
          flexDirection: "column",
          gap: 32,
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)"
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 40 }}>
            {/* Payment Details */}
            <div>
              <h4 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                Payment Detail
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>Company Name</span>
                  <span style={{ fontSize: 16, color: "#0F172A", fontWeight: 600 }}>{config.companyName}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>Bank</span>
                  <span style={{ fontSize: 16, color: "#0F172A", fontWeight: 600 }}>{config.bankName}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>Account No</span>
                  <span style={{ fontSize: 18, color: "#0284c7", fontWeight: 700, letterSpacing: "0.05em" }}>{config.accountNo}</span>
                </div>
              </div>
            </div>

            {/* Important Notes & Contact */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <h4 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Important Information
                </h4>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                  <li style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 15, color: "#475569", lineHeight: 1.5 }}>
                    <span style={{ marginTop: 2 }}>📍</span>
                    <span>Posting Days for Any Package is Only <strong>Consecutive Days</strong> as of the Starting day.</span>
                  </li>
                  <li style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 15, color: "#475569", lineHeight: 1.5 }}>
                    <span style={{ marginTop: 2 }}>📌</span>
                    <span>Call Us for Further Discussion regarding Consulting and Custom Services.</span>
                  </li>
                </ul>
              </div>
              
              <div style={{ marginTop: 24, padding: "16px 20px", backgroundColor: "#F8FAFC", borderRadius: 12, border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#64748B", marginBottom: 8 }}>Contact Us</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                  <a href="tel:+251904885295" style={{ display: "flex", alignItems: "center", gap: 8, color: "#0F172A", fontWeight: 600, textDecoration: "none", fontSize: 16 }}>
                    <span>☎️</span> +251 90 488 5295
                  </a>
                  <a href="tel:+251985661540" style={{ display: "flex", alignItems: "center", gap: 8, color: "#0F172A", fontWeight: 600, textDecoration: "none", fontSize: 16 }}>
                    <span>☎️</span> +251 98 566 1540
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 24, textAlign: "center", color: "#64748B", fontSize: 16 }}>
            Thank you,<br/>
            <span style={{ fontWeight: 700, color: "#0F172A", fontSize: 18, marginTop: 4, display: "inline-block" }}>JobsAddis</span>
          </div>
        </div>
      </div>
    </div>
  );
}
