"use client";

import Link from "next/link";
import React from "react";

export default function PricingPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F8FAFC", fontFamily: "'Inter', sans-serif" }}>
      {/* Navigation */}
      <nav style={{ padding: "24px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E2E8F0", backgroundColor: "#fff" }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ backgroundColor: "#0284c7", borderRadius: 8, padding: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <span style={{ letterSpacing: "-0.01em" }}>Prime Hospitality</span>
        </div>
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
      </nav>

      {/* Hero */}
      <div style={{ padding: "80px 24px 60px", textAlign: "center" }}>
        <div style={{ display: "inline-block", padding: "6px 16px", backgroundColor: "#E0F2FE", color: "#0284C7", borderRadius: 20, fontSize: 13, fontWeight: 700, marginBottom: 24, letterSpacing: "0.05em", textTransform: "uppercase" }}>Pricing Plans</div>
        <h1 style={{ fontSize: 52, fontWeight: 800, color: "#0F172A", marginBottom: 20, letterSpacing: "-0.03em" }}>
          Simple, transparent pricing
        </h1>
        <p style={{ fontSize: 18, color: "#64748B", maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>
          Choose the perfect plan for your hiring needs. No hidden fees, cancel at any time.
        </p>
      </div>

      {/* Pricing Cards */}
      <div style={{ 
        maxWidth: 1100, 
        margin: "0 auto", 
        padding: "0 24px 100px", 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", 
        gap: 32,
        alignItems: "start"
      }}>
        {/* Starter Plan */}
        <div style={{ 
          backgroundColor: "#fff", 
          borderRadius: 24, 
          padding: 40, 
          border: "1px solid #E2E8F0",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)"
        }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>Starter</h3>
          <p style={{ fontSize: 15, color: "#64748B", marginBottom: 28, minHeight: 44, lineHeight: 1.5 }}>Perfect for small businesses hiring occasionally.</p>
          <div style={{ marginBottom: 32, display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 48, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>Free</span>
          </div>
          <Link href="/emp/dashboard" style={{ 
            display: "block", 
            width: "100%", 
            textAlign: "center", 
            backgroundColor: "#F1F5F9", 
            color: "#0F172A", 
            padding: "14px 0", 
            borderRadius: 12, 
            fontWeight: 600, 
            textDecoration: "none",
            marginBottom: 36,
            border: "1px solid #E2E8F0"
          }}>
            Current Plan
          </Link>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
            {['1 active job post', 'Basic applicant tracking', 'Standard support', '7-day post visibility'].map((feature, i) => (
              <li key={i} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 15, color: "#475569" }}>
                <div style={{ backgroundColor: "#ECFDF5", borderRadius: "50%", padding: 4, display: "flex" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Professional Plan */}
        <div style={{ 
          backgroundColor: "#0F172A", 
          borderRadius: 24, 
          padding: "44px 40px", 
          border: "1px solid #1E293B",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          position: "relative",
          transform: "translateY(-16px)"
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
            Most Popular
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Professional</h3>
          <p style={{ fontSize: 15, color: "#94A3B8", marginBottom: 28, minHeight: 44, lineHeight: 1.5 }}>For growing teams that need more power and reach.</p>
          <div style={{ marginBottom: 32, display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 48, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>2,500</span>
            <span style={{ fontSize: 16, color: "#94A3B8", fontWeight: 500 }}>ETB / mo</span>
          </div>
          <button style={{ 
            display: "block", 
            width: "100%", 
            textAlign: "center", 
            backgroundColor: "#0ea5e9", 
            color: "#fff", 
            padding: "14px 0", 
            borderRadius: 12, 
            fontWeight: 600, 
            border: "none",
            cursor: "pointer",
            fontSize: 16,
            marginBottom: 36,
            boxShadow: "0 4px 6px -1px rgba(14, 165, 233, 0.2)"
          }}>
            Upgrade to Pro
          </button>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
            {['Up to 5 active job posts', 'Advanced candidate filtering', 'Priority support', '30-day post visibility', 'Featured job highlights'].map((feature, i) => (
              <li key={i} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 15, color: "#E2E8F0" }}>
                <div style={{ backgroundColor: "rgba(56, 189, 248, 0.2)", borderRadius: "50%", padding: 4, display: "flex" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Enterprise Plan */}
        <div style={{ 
          backgroundColor: "#fff", 
          borderRadius: 24, 
          padding: 40, 
          border: "1px solid #E2E8F0",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)"
        }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>Enterprise</h3>
          <p style={{ fontSize: 15, color: "#64748B", marginBottom: 28, minHeight: 44, lineHeight: 1.5 }}>Custom solutions for large hospitality chains.</p>
          <div style={{ marginBottom: 32, display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 48, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>Custom</span>
          </div>
          <button style={{ 
            display: "block", 
            width: "100%", 
            textAlign: "center", 
            backgroundColor: "#fff", 
            color: "#0F172A", 
            padding: "14px 0", 
            borderRadius: 12, 
            fontWeight: 600, 
            border: "1px solid #E2E8F0",
            cursor: "pointer",
            fontSize: 16,
            marginBottom: 36
          }}>
            Contact Sales
          </button>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
            {['Unlimited job posts', 'Dedicated account manager', 'API access & integrations', 'Custom branding', 'SLA support'].map((feature, i) => (
              <li key={i} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 15, color: "#475569" }}>
                <div style={{ backgroundColor: "#ECFDF5", borderRadius: "50%", padding: 4, display: "flex" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
