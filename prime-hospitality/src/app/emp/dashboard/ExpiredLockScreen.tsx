"use client";

import { useState } from "react";
import { requestEmployerRenewal, logoutEmployer } from "../actions";

export default function ExpiredLockScreen({
  session,
  initiallyRequested,
}: {
  session: any;
  initiallyRequested: boolean;
}) {
  const [requested, setRequested] = useState(initiallyRequested);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNotify = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await requestEmployerRenewal(session.employerId);
      if (res.success) {
        setRequested(true);
      }
    } catch (e: any) {
      setError(e.message || "Failed to notify admin. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logoutEmployer();
    window.location.href = "/emp";
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #f8fafc; }
        .expired-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 24px; padding: 40px 36px; width: 100%; maxWidth: 460px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); text-align: center; display: flex; flex-direction: column; align-items: center; }
        .renew-btn { background: #0f172a; color: #fff; border: none; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.15s; width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .renew-btn:hover { background: #1e293b; }
        .renew-btn:disabled { background: #94a3b8; cursor: not-allowed; }
      `}</style>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fff", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <img src="/addis_jobs_logo.png" alt="JobsAdis" style={{ width: 28, height: 28, objectFit: "contain" }} />
          </div>
          <div>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em", display: "block", lineHeight: 1 }}>JobsAdis</span>
            <span style={{ fontSize: 10, fontWeight: 900, color: "#B08D57", letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginTop: 2 }}>A.A Hotel Associates Union</span>
            <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, marginTop: 4 }}>EMPLOYER DASHBOARD</div>
          </div>
        </div>

        <div className="expired-card">
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fef2f2", border: "2px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", letterSpacing: "-0.03em", marginBottom: 8 }}>Subscription Expired</h1>
          <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, marginBottom: 24 }}>
            Your subscription package has expired. All of your active job posts have been hidden from the app.
          </p>
          
          <div style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: 20, textAlign: "left", marginBottom: 24 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>How to renew:</h4>
            <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, margin: "0 0 8px 0" }}>
              1. Choose a package from our pricing list.
            </p>
            <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, margin: "0 0 8px 0" }}>
              2. Transfer the fee to: <strong style={{ color: "#0284c7" }}>Awash Bank — 013041457659800</strong> (Prime Hospitality PLC).
            </p>
            <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, margin: "0 0 12px 0" }}>
              3. Click the button below to notify the AddisJobs team. We will reactivate your account immediately.
            </p>
          </div>

          <button
            onClick={handleNotify}
            disabled={loading || requested}
            className="renew-btn"
          >
            {loading ? (
              "Sending request..."
            ) : requested ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Admin Notified!
              </>
            ) : (
              "Notify Admin of Payment"
            )}
          </button>

          {error && <p style={{ color: "#dc2626", fontSize: 13, marginTop: 10 }}>{error}</p>}
          {requested && (
            <p style={{ color: "#16a34a", fontSize: 13, fontWeight: 600, marginTop: 10 }}>
              Your notification has been sent. The admin will reactivate your account soon!
            </p>
          )}
          
          <button 
            onClick={handleSignOut} 
            style={{ background: "none", border: "none", color: "#6b7280", fontSize: 13, fontWeight: 600, marginTop: 20, cursor: "pointer" }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
