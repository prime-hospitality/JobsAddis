"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { checkEmployerByTelegramId, loginEmployer } from "./actions";

export default function EmployerLoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<"telegram" | "auth" | "rejected" | "not_found">("telegram");
  const [telegramId, setTelegramId] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [employerName, setEmployerName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCheckTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramId.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await checkEmployerByTelegramId(telegramId.trim());
      if (!result.exists) {
        setError("not_registered");
      } else {
        setEmployerName(result.employer?.business_name || "");
        setStep("auth");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authCode.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await loginEmployer(telegramId.trim(), authCode.trim());
      if (!result.success) {
        if (result.error === "rejected") {
          setStep("rejected");
        } else if (result.error === "not_found") {
          setStep("not_found");
        } else {
          setError(result.error || "Login failed");
        }
      } else {
        router.push("/emp/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; }
        
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        
        .login-card {
          animation: fadeSlideUp 0.5s ease-out both;
        }
        .auth-step {
          animation: slideDown 0.35s ease-out both;
        }
        .error-shake {
          animation: shake 0.4s ease-out both;
        }
        .btn-primary {
          transition: all 0.2s ease;
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          background: #16a34a !important;
          box-shadow: 0 6px 16px rgba(34,197,94,0.2) !important;
        }
        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
          background: #15803d !important;
          box-shadow: none !important;
        }
        .input-field {
          transition: all 0.2s ease;
        }
        .input-field:focus {
          border-color: #22c55e !important;
          box-shadow: 0 0 0 4px rgba(34,197,94,0.1) !important;
          outline: none;
        }
        .back-btn:hover {
          color: #16a34a !important;
        }

        /* Dot pattern background */
        .dot-bg {
          background-image: radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px);
          background-size: 24px 24px;
        }
      `}</style>

      <div
        className="dot-bg"
        style={{
          minHeight: "100vh",
          background: "#F9FAFB",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Logo Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40, animation: "fadeIn 0.4s ease-out" }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#ffffff", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <img src="/addis_jobs_logo_mark_only.svg" alt="Addis Jobs" style={{ width: 28, height: 28, objectFit: "contain" }} />
          </div>
          <div>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>Addis Jobs</span>
            <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, marginTop: 1 }}>EMPLOYER DASHBOARD</div>
          </div>
        </div>

        {/* Login Card */}
        <div
          className="login-card"
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 24,
            padding: "40px 36px",
            width: "100%",
            maxWidth: 420,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)",
          }}
        >
          {/* Step indicator — hide on blocked states */}
          {step !== "rejected" && step !== "not_found" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: step === "telegram" ? "#22c55e" : "#f0fdf4", border: step === "telegram" ? "2px solid #22c55e" : "2px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: step === "telegram" ? "#fff" : "#16a34a", transition: "all 0.3s", flexShrink: 0 }}>
              {step === "auth" ? "✓" : "1"}
            </div>
            <div style={{ flex: 1, height: 2, background: step === "auth" ? "#22c55e" : "#e5e7eb", borderRadius: 2, transition: "background 0.5s" }} />
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: step === "auth" ? "#22c55e" : "#f9fafb", border: `2px solid ${step === "auth" ? "#22c55e" : "#e5e7eb"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: step === "auth" ? "#fff" : "#9ca3af", transition: "all 0.3s", flexShrink: 0 }}>
              2
            </div>
          </div>
          )}

          {/* Rejected state */}
          {step === "rejected" && (
            <div className="auth-step" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 0 }}>
              {/* Icon */}
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fef2f2", border: "2px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, flexShrink: 0 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", letterSpacing: "-0.03em", marginBottom: 8, lineHeight: 1.2 }}>Account Rejected</h2>
              <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, marginBottom: 28, maxWidth: 300 }}>
                Your employer account <strong style={{ color: "#374151" }}>{employerName}</strong> has been reviewed and rejected by the Addis Jobs team.
              </p>

              {/* Contact card */}
              <div style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", marginBottom: 24 }}>
                <div style={{ padding: "10px 16px", borderBottom: "1px solid #e2e8f0", background: "#f1f5f9" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>Contact Support</p>
                </div>
                {/* Phone */}
                <a
                  href="tel:+251911234567"
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", textDecoration: "none", borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f0fdf4")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.71 3.37 2 2 0 0 1 3.68 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.65a16 16 0 0 0 6.04 6.04l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", margin: 0, marginBottom: 2 }}>Phone</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>+251 911 234 567</p>
                  </div>
                  <svg style={{ marginLeft: "auto" }} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </a>
                {/* Telegram */}
                <a
                  href="https://t.me/AddisjobsSupport"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", textDecoration: "none", transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#eff6ff")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", margin: 0, marginBottom: 2 }}>Telegram</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>@AddisjobsSupport</p>
                  </div>
                  <svg style={{ marginLeft: "auto" }} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </a>
              </div>

              <button
                type="button"
                onClick={() => { setStep("telegram"); setTelegramId(""); setAuthCode(""); setError(""); }}
                style={{ fontSize: 13, color: "#6b7280", background: "none", border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                Try a different account
              </button>
            </div>
          )}

          {/* Not Found state — account was deleted */}
          {step === "not_found" && (
            <div className="auth-step" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 0 }}>
              {/* Icon */}
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fffbeb", border: "2px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, flexShrink: 0 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", letterSpacing: "-0.03em", marginBottom: 8, lineHeight: 1.2 }}>Account Not Found</h2>
              <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, marginBottom: 28, maxWidth: 300 }}>
                Your employer account could not be found. It may have been removed. Please contact the Addis Jobs team for assistance.
              </p>

              {/* Contact card */}
              <div style={{ width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", marginBottom: 24 }}>
                <div style={{ padding: "10px 16px", borderBottom: "1px solid #e2e8f0", background: "#fefce8", borderTop: "3px solid #fbbf24" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>Contact Support</p>
                </div>
                {/* Phone */}
                <a
                  href="tel:+251911234567"
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", textDecoration: "none", borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f0fdf4")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.71 3.37 2 2 0 0 1 3.68 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.65a16 16 0 0 0 6.04 6.04l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", margin: 0, marginBottom: 2 }}>Phone</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>+251 911 234 567</p>
                  </div>
                  <svg style={{ marginLeft: "auto" }} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </a>
                {/* Telegram */}
                <a
                  href="https://t.me/AddisjobsSupport"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", textDecoration: "none", transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#eff6ff")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", margin: 0, marginBottom: 2 }}>Telegram</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>@AddisjobsSupport</p>
                  </div>
                  <svg style={{ marginLeft: "auto" }} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </a>
              </div>

              <button
                type="button"
                onClick={() => { setStep("telegram"); setTelegramId(""); setAuthCode(""); setError(""); }}
                style={{ fontSize: 13, color: "#6b7280", background: "none", border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                Try a different account
              </button>
            </div>
          )}

          {/* Title — hide on blocked states */}
          {step !== "rejected" && step !== "not_found" && (
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: "#111827", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 6 }}>
                {step === "telegram" ? "Employer Sign In" : `Welcome back!`}
              </h1>
              <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.5 }}>
                {step === "telegram"
                  ? "Enter your Telegram ID to access your employer dashboard"
                  : `Enter the 5-digit code provided by your admin`}
              </p>
            </div>
          )}

          {/* Step 1: Telegram ID */}
          {step === "telegram" && (
            <form onSubmit={handleCheckTelegram} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4b5563", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Telegram ID
                </label>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                  </div>
                  <input
                    className="input-field"
                    type="text"
                    inputMode="numeric"
                    value={telegramId}
                    onChange={(e) => {
                      setTelegramId(e.target.value.replace(/[^0-9]/g, ""));
                      setError("");
                    }}
                    placeholder="e.g. 123456789"
                    required
                    style={{
                      width: "100%",
                      paddingLeft: 42,
                      paddingRight: 14,
                      paddingTop: 14,
                      paddingBottom: 14,
                      borderRadius: 12,
                      border: `1.5px solid ${error === "not_registered" ? "#ef4444" : "#e5e7eb"}`,
                      background: "#ffffff",
                      color: "#111827",
                      fontSize: 16,
                      fontWeight: 500,
                      fontFamily: "Inter, sans-serif",
                    }}
                  />
                </div>

                {/* Not registered error */}
                {error === "not_registered" && (
                  <div className="error-shake" style={{ marginTop: 10, display: "flex", alignItems: "flex-start", gap: 8, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ marginTop: 1, flexShrink: 0, color: "#ef4444" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#991b1b", marginBottom: 2 }}>Not Registered</p>
                      <p style={{ fontSize: 12, color: "#b91c1c", lineHeight: 1.4 }}>This Telegram ID is not registered as an employer. Please contact your administrator.</p>
                    </div>
                  </div>
                )}

                {error && error !== "not_registered" && (
                  <p style={{ marginTop: 8, fontSize: 13, color: "#ef4444" }}>{error}</p>
                )}
              </div>

              <button
                className="btn-primary"
                type="submit"
                disabled={loading || !telegramId}
                style={{
                  width: "100%",
                  padding: "15px",
                  borderRadius: 12,
                  border: "none",
                  background: loading || !telegramId ? "#86efac" : "#22c55e",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: loading || !telegramId ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {loading ? (
                  <>
                    <svg style={{ animation: "spin 1s linear infinite" }} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    Checking...
                  </>
                ) : (
                  <>
                    Continue
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 2: Authorization Code */}
          {step === "auth" && (
            <form className="auth-step" onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Employer badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 14px", marginBottom: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#16a34a", margin: 0 }}>{employerName}</p>
                  <p style={{ fontSize: 11, color: "#15803d", margin: 0 }}>ID: {telegramId}</p>
                </div>
                <button
                  type="button"
                  className="back-btn"
                  onClick={() => { setStep("telegram"); setAuthCode(""); setError(""); }}
                  style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, transition: "color 0.2s" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  Change
                </button>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4b5563", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Authorization Code
                </label>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <input
                    className="input-field"
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    value={authCode}
                    onChange={(e) => {
                      setAuthCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 5));
                      setError("");
                    }}
                    placeholder="_ _ _ _ _"
                    required
                    autoFocus
                    style={{
                      width: "100%",
                      paddingLeft: 14,
                      paddingRight: 14,
                      paddingTop: 14,
                      paddingBottom: 14,
                      borderRadius: 12,
                      border: `1.5px solid ${error ? "#ef4444" : "#e5e7eb"}`,
                      background: "#ffffff",
                      color: "#111827",
                      fontSize: 24,
                      fontWeight: 800,
                      letterSpacing: "0.4em",
                      fontFamily: "monospace",
                      textAlign: "center",
                    }}
                  />
                </div>

                {error && (
                  <div className="error-shake" style={{ marginTop: 10, display: "flex", alignItems: "flex-start", gap: 8, background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ marginTop: 1, flexShrink: 0, color: "#ef4444" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                    </div>
                    <p style={{ fontSize: 13, color: "#991b1b", margin: 0 }}>{error}</p>
                  </div>
                )}
              </div>

              <button
                className="btn-primary"
                type="submit"
                disabled={loading || authCode.length !== 5}
                style={{
                  width: "100%",
                  padding: "15px",
                  borderRadius: 12,
                  border: "none",
                  background: loading || authCode.length !== 5 ? "#86efac" : "#22c55e",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: loading || authCode.length !== 5 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {loading ? (
                  <>
                    <svg style={{ animation: "spin 1s linear infinite" }} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                    Sign In to Dashboard
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p style={{ marginTop: 28, fontSize: 12, color: "#6b7280", textAlign: "center", animation: "fadeIn 0.6s ease-out 0.3s both" }}>
          Powered by <span style={{ color: "#111827", fontWeight: 600 }}>Addis Jobs Platform</span>
        </p>
      </div>
    </>
  );
}
