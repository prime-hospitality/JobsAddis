"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { checkEmployerByTelegramId, loginEmployer } from "./actions";

export default function EmployerLoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<"telegram" | "auth">("telegram");
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
        setError(result.error || "Login failed");
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
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(14,165,233,0.3); }
          50% { box-shadow: 0 0 0 12px rgba(14,165,233,0); }
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
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(14,165,233,0.4) !important;
        }
        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }
        .input-field:focus {
          border-color: #0ea5e9;
          box-shadow: 0 0 0 4px rgba(14,165,233,0.1);
          outline: none;
        }
        .back-btn:hover {
          color: #0ea5e9;
        }

        /* Dot pattern background */
        .dot-bg {
          background-image: radial-gradient(circle, rgba(148,163,184,0.15) 1px, transparent 1px);
          background-size: 28px 28px;
        }
      `}</style>

      <div
        className="dot-bg"
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0c4a6e 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient glows */}
        <div style={{ position: "absolute", top: "-20%", left: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Logo Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40, animation: "fadeIn 0.4s ease-out" }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(14,165,233,0.15)", border: "1px solid rgba(14,165,233,0.3)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}>
            <img src="/addis_jobs_logo_mark_only.svg" alt="Addis Jobs" style={{ width: 28, height: 28, objectFit: "contain" }} />
          </div>
          <div>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em" }}>Addis Jobs</span>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 500, marginTop: 1 }}>Employer Portal</div>
          </div>
        </div>

        {/* Login Card */}
        <div
          className="login-card"
          style={{
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 24,
            padding: "40px 36px",
            width: "100%",
            maxWidth: 420,
            boxShadow: "0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
          }}
        >
          {/* Step indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: step === "telegram" ? "linear-gradient(135deg, #0ea5e9, #0284c7)" : "rgba(14,165,233,0.2)", border: "2px solid rgba(14,165,233,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", transition: "all 0.3s", flexShrink: 0 }}>
              {step === "auth" ? "✓" : "1"}
            </div>
            <div style={{ flex: 1, height: 2, background: step === "auth" ? "linear-gradient(90deg, #0ea5e9, rgba(14,165,233,0.3))" : "rgba(255,255,255,0.08)", borderRadius: 2, transition: "background 0.5s" }} />
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: step === "auth" ? "linear-gradient(135deg, #0ea5e9, #0284c7)" : "rgba(255,255,255,0.05)", border: `2px solid ${step === "auth" ? "rgba(14,165,233,0.5)" : "rgba(255,255,255,0.1)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: step === "auth" ? "#fff" : "#64748b", transition: "all 0.3s", flexShrink: 0 }}>
              2
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 6 }}>
              {step === "telegram" ? "Employer Sign In" : `Welcome back!`}
            </h1>
            <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.5 }}>
              {step === "telegram"
                ? "Enter your Telegram ID to access your employer portal"
                : `Enter the 5-digit code provided by your admin`}
            </p>
          </div>

          {/* Step 1: Telegram ID */}
          {step === "telegram" && (
            <form onSubmit={handleCheckTelegram} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Telegram ID
                </label>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#475569" }}>
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
                      border: `1.5px solid ${error === "not_registered" ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
                      background: "rgba(255,255,255,0.06)",
                      color: "#f1f5f9",
                      fontSize: 16,
                      fontWeight: 500,
                      fontFamily: "Inter, sans-serif",
                      transition: "all 0.2s",
                    }}
                  />
                </div>

                {/* Not registered error */}
                {error === "not_registered" && (
                  <div className="error-shake" style={{ marginTop: 10, display: "flex", alignItems: "flex-start", gap: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ marginTop: 1, flexShrink: 0, color: "#f87171" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#f87171", marginBottom: 2 }}>Not Registered</p>
                      <p style={{ fontSize: 12, color: "#fca5a5", lineHeight: 1.4 }}>This Telegram ID is not registered as an employer. Please contact your administrator.</p>
                    </div>
                  </div>
                )}

                {error && error !== "not_registered" && (
                  <p style={{ marginTop: 8, fontSize: 13, color: "#f87171" }}>{error}</p>
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
                  background: loading || !telegramId ? "rgba(14,165,233,0.3)" : "linear-gradient(135deg, #0ea5e9, #0284c7)",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: loading || !telegramId ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.2s",
                  boxShadow: loading || !telegramId ? "none" : "0 4px 16px rgba(14,165,233,0.3)",
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
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #0ea5e9, #0284c7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🏢</div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#38bdf8", margin: 0 }}>{employerName}</p>
                  <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>ID: {telegramId}</p>
                </div>
                <button
                  type="button"
                  className="back-btn"
                  onClick={() => { setStep("telegram"); setAuthCode(""); setError(""); }}
                  style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, transition: "color 0.2s" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  Change
                </button>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Authorization Code
                </label>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#475569" }}>
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
                      border: `1.5px solid ${error ? "#ef4444" : "rgba(255,255,255,0.1)"}`,
                      background: "rgba(255,255,255,0.06)",
                      color: "#f1f5f9",
                      fontSize: 24,
                      fontWeight: 800,
                      letterSpacing: "0.4em",
                      fontFamily: "monospace",
                      textAlign: "center",
                      transition: "all 0.2s",
                    }}
                  />
                </div>

                {error && (
                  <div className="error-shake" style={{ marginTop: 10, display: "flex", alignItems: "flex-start", gap: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ marginTop: 1, flexShrink: 0, color: "#f87171" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                    </div>
                    <p style={{ fontSize: 13, color: "#fca5a5", margin: 0 }}>{error}</p>
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
                  background: loading || authCode.length !== 5 ? "rgba(14,165,233,0.3)" : "linear-gradient(135deg, #0ea5e9, #0284c7)",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: loading || authCode.length !== 5 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.2s",
                  boxShadow: loading || authCode.length !== 5 ? "none" : "0 4px 16px rgba(14,165,233,0.3)",
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
        <p style={{ marginTop: 28, fontSize: 12, color: "#334155", textAlign: "center", animation: "fadeIn 0.6s ease-out 0.3s both" }}>
          Powered by <span style={{ color: "#0ea5e9", fontWeight: 600 }}>Addis Jobs Platform</span>
        </p>
      </div>
    </>
  );
}
