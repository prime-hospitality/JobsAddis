import Link from "next/link";
import React from "react";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

// Default config matching the flat structure from AdminDashboard
const DEFAULT_CONFIG = {
  pinVacancy: "1,000",
  companyName: "Prime Hospitality Business Group PLC",
  bankName: "Awash Bank",
  accountNo: "013041457659800"
};

type PackageRow = { id: string; name: string; duration_days: number; price: number; category: "standard" | "premium" };

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getPricingConfig() {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return DEFAULT_CONFIG;

    const { data } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "pricing_config")
      .maybeSingle();

    if (data?.value) {
      const parsed = JSON.parse(data.value);
      const sanitized = Object.fromEntries(
        Object.entries(parsed).map(([k, v]) =>
          [k, typeof v === 'string' ? v.replace(/\$/g, '') : v]
        )
      );
      return { ...DEFAULT_CONFIG, ...sanitized };
    }
  } catch (e) {
    console.error("Failed to fetch pricing config:", e);
  }
  return DEFAULT_CONFIG;
}

async function getPackages(): Promise<PackageRow[]> {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return [];

    const { data } = await supabase
      .from("packages")
      .select("id, name, duration_days, price, category")
      .order("price", { ascending: true });

    return data || [];
  } catch (e) {
    console.error("Failed to fetch packages:", e);
    return [];
  }
}

function formatEtb(n: number | string) {
  return Number(n).toLocaleString("en-US");
}

// Shared brand accent — matches the employer dashboard/billing palette (sky-700 + slate neutrals)
const BRAND = "#0284c7";
const BRAND_SUBTLE = "#eff6ff";
const INK = "#0f172a";

const checkIcon = (stroke: string) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
);

function FeatureRow({ label, price, dark }: { label: string; price?: string; dark?: boolean }) {
  return (
    <li style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 15, gap: 12, fontFamily: "'Inter', sans-serif", color: dark ? "#E2E8F0" : "#334155" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <div style={{ background: dark ? "rgba(255,255,255,0.12)" : BRAND_SUBTLE, borderRadius: "50%", padding: 5, display: "flex", flexShrink: 0 }}>
          {checkIcon(dark ? "#fff" : BRAND)}
        </div>
        <span>{label}</span>
      </div>
      {price && <span style={{ fontWeight: 700, color: dark ? "#fff" : INK, textAlign: "right", whiteSpace: "nowrap", flexShrink: 0 }}>{price}</span>}
    </li>
  );
}

export default async function PricingPage() {
  const sessionCookie = (await cookies()).get("employer_session");
  const isAuthenticated = !!sessionCookie?.value;
  const [config, allPackages] = await Promise.all([getPricingConfig(), getPackages()]);

  const standardPackageRows = allPackages.filter(p => (p.category || "standard") === "standard");
  const premiumPackageRows = allPackages.filter(p => p.category === "premium");

  const standardPackages = standardPackageRows.map(p => ({ label: p.name, price: `${formatEtb(p.price)} ETB` }));
  const premiumPackages = premiumPackageRows.map(p => ({ label: p.name, price: `${formatEtb(p.price)} ETB` }));

  const standardFrom = standardPackageRows.length ? formatEtb(Math.min(...standardPackageRows.map(p => p.price))) : "—";
  const premiumFrom = premiumPackageRows.length ? formatEtb(Math.min(...premiumPackageRows.map(p => p.price))) : "—";

  const addOns = [
    { label: 'Pin Your Vacancy', price: `${config.pinVacancy} ETB / Day` }
  ];

  const extraServices = ['Screening & Hiring', 'Training', 'Cost & Operational Audit', 'Food Safety Audit', 'Menu Development', 'Monthly Financial Review', 'Hospitality Consultancy'];

  const headingFont = "'Plus Jakarta Sans', 'Inter', sans-serif";
  const bodyFont = "'Inter', sans-serif";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", fontFamily: bodyFont }}>
      <style>{`
        @media (max-width: 640px) {
          .pr-nav { padding: 16px 20px !important; }
          .pr-hero { padding: 48px 20px 40px !important; }
          .pr-hero h1 { font-size: 30px !important; }
          .pr-cards-wrap { padding: 0 16px 32px !important; }
          .pr-details-wrap { padding: 0 16px 56px !important; }
          .pr-details-card { padding: 24px !important; }
          .pr-card { padding: 28px 24px !important; }
        }
      `}</style>

      {/* Navigation */}
      <nav className="pr-nav" style={{ padding: "22px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E2E8F0", backgroundColor: "#fff" }}>
        <div style={{ fontSize: 19, fontWeight: 800, color: INK, display: "flex", alignItems: "center", gap: 10, fontFamily: headingFont, letterSpacing: "-0.01em" }}>
          <img src="/logo.png" alt="Prime Hospitality Logo" style={{ width: 34, height: 34, objectFit: "contain" }} />
          <span>Prime Hospitality</span>
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
      <div className="pr-hero" style={{ padding: "72px 24px 52px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 100, background: BRAND_SUBTLE, marginBottom: 20 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: BRAND, fontFamily: bodyFont }}>Prices in Ethiopian Birr (ETB)</span>
        </div>
        <h1 style={{ fontSize: 40, fontWeight: 800, color: INK, marginBottom: 16, letterSpacing: "-0.03em", fontFamily: headingFont }}>
          Thank You for Choosing JobsAddis
        </h1>
        <p style={{ fontSize: 17, color: "#64748B", maxWidth: 560, margin: "0 auto", lineHeight: 1.6, fontFamily: bodyFont }}>
          Review our job advertisement packages below and select the one that fits your hiring need.
        </p>
      </div>

      {/* Pricing Cards Container */}
      <div className="pr-cards-wrap" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 44px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 28,
          alignItems: "stretch"
        }}>
          {/* Long Term Memberships */}
          <div className="pr-card" style={{
            backgroundColor: "#fff",
            borderRadius: 20,
            padding: 36,
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            display: "flex",
            flexDirection: "column"
          }}>
            <h3 style={{ fontSize: 19, fontWeight: 700, color: INK, marginBottom: 8, fontFamily: headingFont }}>Long Term Memberships</h3>
            <p style={{ fontSize: 14, color: "#64748B", marginBottom: 26, minHeight: 40, lineHeight: 1.5 }}>
              Posted <strong>(5) Times Per Day</strong>. Best for frequent hiring.
            </p>
            <div style={{ marginBottom: 28, display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#94A3B8" }}>From</span>
              <span style={{ fontSize: 32, fontWeight: 800, color: INK, letterSpacing: "-0.02em", whiteSpace: "nowrap", fontFamily: headingFont }}>
                {premiumFrom}
              </span>
              <span style={{ fontSize: 15, color: "#94A3B8", fontWeight: 500 }}>ETB</span>
            </div>

            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16, flexGrow: 1 }}>
              {premiumPackages.map((pkg, i) => (
                <FeatureRow key={i} label={pkg.label} price={pkg.price} />
              ))}
            </ul>
          </div>

          {/* Standard Packages (Middle, Dark, Popular) */}
          <div className="pr-card" style={{
            background: `linear-gradient(135deg, ${INK} 0%, #1e293b 100%)`,
            borderRadius: 20,
            padding: "40px 36px",
            border: "1px solid #1E293B",
            boxShadow: "0 20px 40px -12px rgba(15, 23, 42, 0.35)",
            position: "relative",
            display: "flex",
            flexDirection: "column"
          }}>
            <div style={{
              position: "absolute",
              top: -13,
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: BRAND,
              color: "#fff",
              padding: "6px 16px",
              borderRadius: 100,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              boxShadow: "0 4px 10px -2px rgba(2, 132, 199, 0.5)"
            }}>
              Most Popular
            </div>
            <h3 style={{ fontSize: 19, fontWeight: 700, color: "#fff", marginBottom: 8, fontFamily: headingFont }}>Standard Packages</h3>
            <p style={{ fontSize: 14, color: "#94A3B8", marginBottom: 26, minHeight: 40, lineHeight: 1.5 }}>
              Posted <strong>(3) Times Per Day</strong>.
            </p>
            <div style={{ marginBottom: 28, display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#94A3B8" }}>From</span>
              <span style={{ fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", whiteSpace: "nowrap", fontFamily: headingFont }}>
                {standardFrom}
              </span>
              <span style={{ fontSize: 15, color: "#94A3B8", fontWeight: 500 }}>ETB</span>
            </div>

            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16, flexGrow: 1, marginBottom: 24 }}>
              {standardPackages.map((pkg, i) => (
                <FeatureRow key={i} label={pkg.label} price={pkg.price} dark />
              ))}
            </ul>

            <div style={{ backgroundColor: "rgba(255,255,255,0.06)", padding: 14, borderRadius: 12, marginTop: "auto", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7dd3fc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              <p style={{ fontSize: 13, color: "#CBD5E1", lineHeight: 1.55, margin: 0 }}>
                No package has a position limit — post as many roles as you need under any package.
              </p>
            </div>
          </div>

          {/* Add-ons Plan */}
          <div className="pr-card" style={{
            backgroundColor: "#fff",
            borderRadius: 20,
            padding: 36,
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            display: "flex",
            flexDirection: "column"
          }}>
            <h3 style={{ fontSize: 19, fontWeight: 700, color: INK, marginBottom: 8, fontFamily: headingFont }}>Add-ons &amp; Consulting</h3>
            <p style={{ fontSize: 14, color: "#64748B", marginBottom: 26, minHeight: 40, lineHeight: 1.5 }}>Extra services for your business, tailored to your needs.</p>
            <div style={{ marginBottom: 28, display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: INK, letterSpacing: "-0.02em", fontFamily: headingFont }}>Custom</span>
            </div>

            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16, flexGrow: 1 }}>
              {addOns.map((addon, i) => (
                <React.Fragment key={i}>
                  <FeatureRow label={addon.label} price={addon.price} />
                  <div style={{ height: 1, background: "#F1F5F9" }} />
                </React.Fragment>
              ))}

              <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>We Also Provide</div>
              {extraServices.map((feature, i) => (
                <FeatureRow key={`extra-${i}`} label={feature} />
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Details Section */}
      <div className="pr-details-wrap" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 72px" }}>
        <div className="pr-details-card" style={{
          backgroundColor: "#fff",
          borderRadius: 20,
          padding: 36,
          border: "1px solid #E2E8F0",
          display: "flex",
          flexDirection: "column",
          gap: 28,
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 36 }}>
            {/* Payment Details */}
            <div>
              <h4 style={{ fontSize: 16, fontWeight: 700, color: INK, marginBottom: 16, display: "flex", alignItems: "center", gap: 8, fontFamily: headingFont }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                Payment Detail
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>Company Name</span>
                  <span style={{ fontSize: 15, color: INK, fontWeight: 600 }}>{config.companyName}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>Bank</span>
                  <span style={{ fontSize: 15, color: INK, fontWeight: 600 }}>{config.bankName}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>Account No</span>
                  <span style={{ fontSize: 17, color: BRAND, fontWeight: 700, letterSpacing: "0.03em" }}>{config.accountNo}</span>
                </div>
              </div>
            </div>

            {/* Important Notes & Contact */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: INK, marginBottom: 16, display: "flex", alignItems: "center", gap: 8, fontFamily: headingFont }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Important Information
                </h4>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                  <li style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#475569", lineHeight: 1.5 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <span>Posting days for any package are <strong>consecutive days</strong> starting from the activation date.</span>
                  </li>
                  <li style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#475569", lineHeight: 1.5 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    <span>Call us for further discussion regarding consulting and custom services.</span>
                  </li>
                </ul>
              </div>

              <div style={{ marginTop: 24, padding: "16px 20px", backgroundColor: "#F8FAFC", borderRadius: 12, border: "1px solid #E2E8F0" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#64748B", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Contact Us</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                  <a href="tel:+251904885295" style={{ display: "flex", alignItems: "center", gap: 8, color: INK, fontWeight: 600, textDecoration: "none", fontSize: 15 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    +251 90 488 5295
                  </a>
                  <a href="tel:+251985661540" style={{ display: "flex", alignItems: "center", gap: 8, color: INK, fontWeight: 600, textDecoration: "none", fontSize: 15 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    +251 98 566 1540
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 24, textAlign: "center", color: "#64748B", fontSize: 15 }}>
            Thank you,<br/>
            <span style={{ fontWeight: 700, color: INK, fontSize: 17, marginTop: 4, display: "inline-block", fontFamily: headingFont }}>JobsAddis</span>
          </div>
        </div>
      </div>
    </div>
  );
}
