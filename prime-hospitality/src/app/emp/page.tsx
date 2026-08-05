"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { checkEmployerByTelegramId, loginWithPassword, verifyEmployerAuthCode, setupEmployerPassword, getEmployerAccounts } from "./actions";
import EmployerAvatar from "@/components/EmployerAvatar";
import { TIN_LENGTH, normalizeTin, validateTin } from "@/lib/ethiopianTin";

const SAVED_ID_KEY = "emp_saved_telegram_id";
const SAVED_NAME_KEY = "emp_saved_employer_name";

export default function EmployerLoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<"telegram" | "auth" | "setup_password" | "password" | "rejected" | "not_found">("telegram");
  const [telegramId, setTelegramId] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tinNumber, setTinNumber] = useState("");
  const [employerName, setEmployerName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savedName, setSavedName] = useState<string | null>(null);
  const [switcherAccounts, setSwitcherAccounts] = useState<{ employerId: string; telegramId: number; businessName: string; businessType: string; logoUrl: string | null }[]>([]);

  // Load saved Telegram ID on mount
  useEffect(() => {
    const id = localStorage.getItem(SAVED_ID_KEY);
    const name = localStorage.getItem(SAVED_NAME_KEY);
    if (id) {
      setSavedId(id);
      setSavedName(name);
    }
  }, []);

  // Accounts already signed into this browser (from the dashboard's account
  // switcher) -- picking one here still requires that account's password;
  // it's a shortcut to the right Telegram ID, not a free instant switch
  // (that only happens from inside the dashboard, where you're already
  // authenticated).
  useEffect(() => {
    getEmployerAccounts().then((res) => setSwitcherAccounts(res.accounts)).catch(() => setSwitcherAccounts([]));
  }, []);

  // Every account in switcherAccounts already has a password on file (that's
  // how it got added to the switcher in the first place), so this can skip
  // straight to the password step instead of re-checking existence/status.
  const handleSelectSwitcherAccount = (acc: { telegramId: number; businessName: string }) => {
    setTelegramId(String(acc.telegramId));
    setEmployerName(acc.businessName);
    setError("");
    setStep("password");
  };

  const handleForgetSaved = () => {
    localStorage.removeItem(SAVED_ID_KEY);
    localStorage.removeItem(SAVED_NAME_KEY);
    setSavedId(null);
    setSavedName(null);
    setTelegramId("");
  };

  const handleUseSaved = async () => {
    if (!savedId) return;
    setTelegramId(savedId);
    setLoading(true);
    setError("");
    try {
      const result = await checkEmployerByTelegramId(savedId);
      if (!result.exists) {
        setError("not_registered");
      } else {
        setEmployerName(result.employer?.business_name || "");
        if (result.has_password) {
          setStep("password");
        } else {
          setStep("auth");
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
        if (result.has_password) {
          setStep("password");
        } else {
          setStep("auth");
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuthCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authCode.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await verifyEmployerAuthCode(telegramId.trim(), authCode.trim());
      if (!result.success) {
        if (result.error === "rejected") setStep("rejected");
        else if (result.error === "not_found") setStep("not_found");
        else setError(result.error || "Verification failed");
      } else {
        setStep("setup_password");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const tinError = validateTin(tinNumber);
    if (tinError) return setError(tinError);
    if (password.length < 6) return setError("Password must be at least 6 characters");
    if (password !== confirmPassword) return setError("Passwords do not match");

    setLoading(true);
    setError("");
    try {
      const result = await setupEmployerPassword(telegramId.trim(), authCode.trim(), password, tinNumber);
      if (!result.success) {
        setError(result.error || "Failed to setup password");
      } else {
        // Save Telegram ID for next visit (never save passwords), same as
        // the returning-login path -- otherwise the very first login after
        // onboarding wouldn't get the "Continue as..." quick-login chip.
        localStorage.setItem(SAVED_ID_KEY, telegramId.trim());
        if (employerName) localStorage.setItem(SAVED_NAME_KEY, employerName);
        router.push("/emp/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await loginWithPassword(telegramId.trim(), password);
      if (!result.success) {
        if (result.error === "rejected") setStep("rejected");
        else if (result.error === "not_found") setStep("not_found");
        else setError(result.error || "Login failed");
      } else {
        // Save Telegram ID for next visit (never save passwords)
        localStorage.setItem(SAVED_ID_KEY, telegramId.trim());
        if (employerName) localStorage.setItem(SAVED_NAME_KEY, employerName);
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
          background: #F4F22B !important;
          box-shadow: 0 6px 16px rgba(242,240,18,0.38) !important;
        }
        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
          background: #D2D000 !important;
          box-shadow: none !important;
        }
        .input-field {
          transition: all 0.2s ease;
        }
        .input-field:focus {
          border-color: #1B5CBF !important;
          box-shadow: 0 0 0 4px rgba(27,92,191,0.22) !important;
          outline: none;
        }
        .back-btn:hover {
          color: #164A9C !important;
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
          background: "#F7F8FA",
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
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#F2F012", border: "1px solid #E2E5EC", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <img src="/addis_jobs_logo.webp" alt="JobsAdis" style={{ width: 28, height: 28, objectFit: "contain" }} />
          </div>
          <div>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em", display: "block", lineHeight: 1 }}>JobsAdis</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#1B5CBF", letterSpacing: "0.03em", display: "block", marginTop: 2 }}>Where Talent Meets Opportunity</span>
            <div style={{ fontSize: 11, color: "#6E7686", fontWeight: 600, marginTop: 4 }}>EMPLOYER DASHBOARD</div>
          </div>
        </div>

        {/* Login Card */}
        <div
          className="login-card"
          style={{
            background: "#ffffff",
            border: "1px solid #E2E5EC",
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
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: step === "telegram" ? "#1B5CBF" : "#EEF3FC", border: step === "telegram" ? "2px solid #1B5CBF" : "2px solid #D9E5F8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: step === "telegram" ? "#fff" : "#164A9C", transition: "all 0.3s", flexShrink: 0 }}>
              {step === "auth" ? "✓" : "1"}
            </div>
            <div style={{ flex: 1, height: 2, background: step === "auth" ? "#1B5CBF" : "#E2E5EC", borderRadius: 2, transition: "background 0.5s" }} />
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: step === "auth" ? "#1B5CBF" : "#F7F8FA", border: `2px solid ${step === "auth" ? "#1B5CBF" : "#E2E5EC"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: step === "auth" ? "#fff" : "#9AA1B1", transition: "all 0.3s", flexShrink: 0 }}>
              2
            </div>
          </div>
          )}

          {/* Rejected state */}
          {step === "rejected" && (
            <div className="auth-step" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 0 }}>
              {/* Icon */}
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#FDECEC", border: "2px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, flexShrink: 0 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E5484D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", letterSpacing: "-0.03em", marginBottom: 8, lineHeight: 1.2 }}>Account Rejected</h2>
              <p style={{ fontSize: 14, color: "#6E7686", lineHeight: 1.6, marginBottom: 28, maxWidth: 300 }}>
                Your employer account <strong style={{ color: "#343A46" }}>{employerName}</strong> has been reviewed and rejected by the JobsAdis team.
              </p>

              {/* Contact card */}
              <div style={{ width: "100%", background: "#F7F8FA", border: "1px solid #E2E5EC", borderRadius: 14, overflow: "hidden", marginBottom: 24 }}>
                <div style={{ padding: "10px 16px", borderBottom: "1px solid #E2E5EC", background: "#EFF1F5" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#6E7686", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>Contact Support</p>
                </div>
                {/* Phone */}
                <a
                  href="tel:+251911234567"
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", textDecoration: "none", borderBottom: "1px solid #EFF1F5", transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#EEF3FC")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#EEF3FC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#164A9C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.71 3.37 2 2 0 0 1 3.68 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.65a16 16 0 0 0 6.04 6.04l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#9AA1B1", margin: 0, marginBottom: 2 }}>Phone</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>+251 911 234 567</p>
                  </div>
                  <svg style={{ marginLeft: "auto" }} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AA1B1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </a>
                {/* Telegram */}
                <a
                  href="https://t.me/AddisjobsSupport"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", textDecoration: "none", transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#EEF3FC")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#D9E5F8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#9AA1B1", margin: 0, marginBottom: 2 }}>Telegram</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>@AddisjobsSupport</p>
                  </div>
                  <svg style={{ marginLeft: "auto" }} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AA1B1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </a>
              </div>

              <button
                type="button"
                onClick={() => { setStep("telegram"); setTelegramId(""); setAuthCode(""); setError(""); }}
                style={{ fontSize: 13, color: "#6E7686", background: "none", border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}
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
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", letterSpacing: "-0.03em", marginBottom: 8, lineHeight: 1.2 }}>Account Not Found</h2>
              <p style={{ fontSize: 14, color: "#6E7686", lineHeight: 1.6, marginBottom: 28, maxWidth: 300 }}>
                Your employer account could not be found. It may have been removed. Please contact the JobsAdis team for assistance.
              </p>

              {/* Contact card */}
              <div style={{ width: "100%", background: "#F7F8FA", border: "1px solid #E2E5EC", borderRadius: 14, overflow: "hidden", marginBottom: 24 }}>
                <div style={{ padding: "10px 16px", borderBottom: "1px solid #E2E5EC", background: "#FDF1E7", borderTop: "3px solid #B45309" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#B45309", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>Contact Support</p>
                </div>
                {/* Phone */}
                <a
                  href="tel:+251911234567"
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", textDecoration: "none", borderBottom: "1px solid #EFF1F5", transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#EEF3FC")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#EEF3FC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#164A9C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.71 3.37 2 2 0 0 1 3.68 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.65a16 16 0 0 0 6.04 6.04l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#9AA1B1", margin: 0, marginBottom: 2 }}>Phone</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>+251 911 234 567</p>
                  </div>
                  <svg style={{ marginLeft: "auto" }} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AA1B1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </a>
                {/* Telegram */}
                <a
                  href="https://t.me/AddisjobsSupport"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", textDecoration: "none", transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#EEF3FC")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#D9E5F8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#9AA1B1", margin: 0, marginBottom: 2 }}>Telegram</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>@AddisjobsSupport</p>
                  </div>
                  <svg style={{ marginLeft: "auto" }} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AA1B1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </a>
              </div>

              <button
                type="button"
                onClick={() => { setStep("telegram"); setTelegramId(""); setAuthCode(""); setError(""); }}
                style={{ fontSize: 13, color: "#6E7686", background: "none", border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                Try a different account
              </button>
            </div>
          )}

          {/* Title — hide on blocked and setup states */}
          {(step === "telegram" || step === "auth" || step === "password") && (
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: "#111827", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 6 }}>
                {step === "telegram" ? "Employer Sign In" : `Welcome back!`}
              </h1>
              <p style={{ fontSize: 14, color: "#6E7686", lineHeight: 1.5 }}>
                {step === "telegram" && "Enter your Telegram ID to access your employer dashboard"}
                {step === "auth" && "Enter the 5-digit code provided by your admin"}
                {step === "password" && "Enter your password to access your dashboard"}
              </p>
            </div>
          )}

          {/* Step 1: Telegram ID */}
          {step === "telegram" && (
            <form onSubmit={handleCheckTelegram} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Accounts already signed into this browser -- password still required */}
              {switcherAccounts.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, animation: "fadeSlideUp 0.3s ease-out" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#6E7686", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>
                    Signed in on this browser
                  </p>
                  {switcherAccounts.map((acc) => (
                    <button
                      key={acc.employerId}
                      type="button"
                      onClick={() => handleSelectSwitcherAccount(acc)}
                      style={{ display: "flex", alignItems: "center", gap: 10, background: "#F7F8FA", border: "1px solid #E2E5EC", borderRadius: 12, padding: "10px 14px", cursor: "pointer", textAlign: "left" }}
                    >
                      <EmployerAvatar name={acc.businessName || "?"} logoUrl={acc.logoUrl} size={34} radius={17} fontSize={14} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{acc.businessName}</p>
                        <p style={{ fontSize: 12, color: "#6E7686", margin: 0 }}>ID: {acc.telegramId}</p>
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AA1B1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                  ))}
                  <p style={{ fontSize: 12, color: "#9AA1B1", margin: "2px 0 0 0" }}>Or sign into a different account below</p>
                </div>
              )}

              {/* Saved account chip -- only when it's not already covered by the list above */}
              {savedId && !switcherAccounts.some((a) => String(a.telegramId) === savedId) && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#EEF3FC", border: "1px solid #D9E5F8", borderRadius: 12, padding: "10px 14px", animation: "fadeSlideUp 0.3s ease-out" }}>
                  <button
                    type="button"
                    onClick={handleUseSaved}
                    style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0, flex: 1, textAlign: "left" }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#1B5CBF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                    <div>
                      {savedName && <p style={{ fontSize: 13, fontWeight: 700, color: "#164A9C", margin: 0 }}>{savedName}</p>}
                      <p style={{ fontSize: 12, color: "#164A9C", margin: 0, fontWeight: 500 }}>ID: {savedId}</p>
                    </div>
                    <div style={{ marginLeft: "auto", paddingLeft: 8 }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#164A9C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={handleForgetSaved}
                    title="Forget this account"
                    style={{ marginLeft: 8, background: "none", border: "none", cursor: "pointer", color: "#9AA1B1", padding: 4, display: "flex", alignItems: "center", flexShrink: 0, borderRadius: 6, transition: "color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#E5484D")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#9AA1B1")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4b5563", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {savedId ? "Or enter a different ID" : "Telegram ID"}
                </label>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9AA1B1" }}>
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
                      border: `1.5px solid ${error === "not_registered" ? "#E5484D" : "#E2E5EC"}`,
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
                  <div className="error-shake" style={{ marginTop: 10, display: "flex", alignItems: "flex-start", gap: 8, background: "#FDECEC", border: "1px solid #F2A0A2", borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ marginTop: 1, flexShrink: 0, color: "#E5484D" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#E5484D", marginBottom: 2 }}>Not Registered</p>
                      <p style={{ fontSize: 12, color: "#b91c1c", lineHeight: 1.4 }}>This Telegram ID is not registered as an employer. Please contact your administrator.</p>
                    </div>
                  </div>
                )}

                {error && error !== "not_registered" && (
                  <p style={{ marginTop: 8, fontSize: 13, color: "#E5484D" }}>{error}</p>
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
                  background: loading || !telegramId ? "#F8F78A" : "#F2F012",
                  color: "#141821",
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
            <form className="auth-step" onSubmit={handleAuthCode} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Employer badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#EEF3FC", border: "1px solid #D9E5F8", borderRadius: 10, padding: "10px 14px", marginBottom: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1B5CBF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#164A9C", margin: 0 }}>{employerName}</p>
                  <p style={{ fontSize: 11, color: "#164A9C", margin: 0 }}>ID: {telegramId}</p>
                </div>
                <button
                  type="button"
                  className="back-btn"
                  onClick={() => { setStep("telegram"); setAuthCode(""); setError(""); }}
                  style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#6E7686", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, transition: "color 0.2s" }}
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
                  <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9AA1B1" }}>
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
                      border: `1.5px solid ${error ? "#E5484D" : "#E2E5EC"}`,
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
                  <div className="error-shake" style={{ marginTop: 10, display: "flex", alignItems: "flex-start", gap: 8, background: "#FDECEC", border: "1px solid #F2A0A2", borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ marginTop: 1, flexShrink: 0, color: "#E5484D" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                    </div>
                    <p style={{ fontSize: 13, color: "#E5484D", margin: 0 }}>{error}</p>
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
                  background: loading || authCode.length !== 5 ? "#F8F78A" : "#F2F012",
                  color: "#141821",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: loading || authCode.length !== 5 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginTop: 8
                }}
              >
                {loading ? (
                  <>
                    <svg style={{ animation: "spin 1s linear infinite" }} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    Verifying...
                  </>
                ) : (
                  <>
                    Continue to Profile
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Step 3: Setup Password (Onboarding) */}
          {step === "setup_password" && (
            <form className="auth-step" onSubmit={handleSetupPassword} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ textAlign: "center", marginBottom: 12 }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", letterSpacing: "-0.03em", marginBottom: 6 }}>Complete Your Account</h2>
                <p style={{ fontSize: 13, color: "#6E7686", lineHeight: 1.5 }}>
                  Add your business TIN number and set a password.
                </p>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4b5563", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  TIN Number
                </label>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9AA1B1" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M8 12h8"/><path d="M8 16h5"/></svg>
                  </div>
                  <input
                    className="input-field"
                    type="text"
                    inputMode="numeric"
                    value={tinNumber}
                    onChange={(e) => { setTinNumber(normalizeTin(e.target.value).replace(/\D/g, "").slice(0, TIN_LENGTH)); setError(""); }}
                    placeholder={`${TIN_LENGTH}-digit TIN`}
                    required
                    style={{ width: "100%", paddingLeft: 42, paddingRight: 14, paddingTop: 14, paddingBottom: 14, borderRadius: 12, border: "1.5px solid #E2E5EC", background: "#ffffff", color: "#111827", fontSize: 16, fontWeight: 500, fontFamily: "Inter, sans-serif", letterSpacing: "0.08em" }}
                  />
                </div>
                <p style={{ marginTop: 6, fontSize: 11.5, color: "#9AA1B1", lineHeight: 1.5 }}>
                  Your Ethiopian Taxpayer Identification Number, as printed on your TIN certificate. Job seekers never see it.
                </p>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4b5563", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  New Password
                </label>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9AA1B1" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <input
                    className="input-field"
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    placeholder="At least 6 characters"
                    required
                    style={{ width: "100%", paddingLeft: 42, paddingRight: 14, paddingTop: 14, paddingBottom: 14, borderRadius: 12, border: "1.5px solid #E2E5EC", background: "#ffffff", color: "#111827", fontSize: 16, fontWeight: 500, fontFamily: "Inter, sans-serif" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4b5563", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Confirm Password
                </label>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9AA1B1" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <input
                    className="input-field"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                    placeholder="Confirm your password"
                    required
                    style={{ width: "100%", paddingLeft: 42, paddingRight: 14, paddingTop: 14, paddingBottom: 14, borderRadius: 12, border: "1.5px solid #E2E5EC", background: "#ffffff", color: "#111827", fontSize: 16, fontWeight: 500, fontFamily: "Inter, sans-serif" }}
                  />
                </div>
              </div>

              {error && <p style={{ marginTop: 2, fontSize: 13, color: "#E5484D" }}>{error}</p>}

              <button
                className="btn-primary"
                type="submit"
                disabled={loading || !password || !confirmPassword || !!validateTin(tinNumber)}
                style={{ width: "100%", padding: "15px", borderRadius: 12, border: "none", background: loading || !password || !confirmPassword || !!validateTin(tinNumber) ? "#F8F78A" : "#F2F012", color: "#141821", fontSize: 15, fontWeight: 700, cursor: loading || !password || !confirmPassword || !!validateTin(tinNumber) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 }}
              >
                {loading ? (
                  <>
                    <svg style={{ animation: "spin 1s linear infinite" }} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    Saving...
                  </>
                ) : (
                  <>Save & Log In</>
                )}
              </button>
            </form>
          )}

          {/* Step 4: Password Login (Returning users) */}
          {step === "password" && (
            <form className="auth-step" onSubmit={handleLoginPassword} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Employer badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#EEF3FC", border: "1px solid #D9E5F8", borderRadius: 10, padding: "10px 14px", marginBottom: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1B5CBF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#164A9C", margin: 0 }}>{employerName}</p>
                  <p style={{ fontSize: 11, color: "#164A9C", margin: 0 }}>ID: {telegramId}</p>
                </div>
                <button
                  type="button"
                  className="back-btn"
                  onClick={() => { setStep("telegram"); setPassword(""); setError(""); }}
                  style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#6E7686", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, transition: "color 0.2s" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  Change
                </button>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4b5563", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9AA1B1" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <input
                    className="input-field"
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    placeholder="Enter your password"
                    required
                    style={{ width: "100%", paddingLeft: 42, paddingRight: 14, paddingTop: 14, paddingBottom: 14, borderRadius: 12, border: "1.5px solid #E2E5EC", background: "#ffffff", color: "#111827", fontSize: 16, fontWeight: 500, fontFamily: "Inter, sans-serif" }}
                  />
                </div>
                {error && <p style={{ marginTop: 8, fontSize: 13, color: "#E5484D" }}>{error}</p>}
              </div>

              <button
                className="btn-primary"
                type="submit"
                disabled={loading || !password}
                style={{ width: "100%", padding: "15px", borderRadius: 12, border: "none", background: loading || !password ? "#F8F78A" : "#F2F012", color: "#141821", fontSize: 15, fontWeight: 700, cursor: loading || !password ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 }}
              >
                {loading ? (
                  <>
                    <svg style={{ animation: "spin 1s linear infinite" }} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    Signing In...
                  </>
                ) : (
                  <>Sign In</>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p style={{ marginTop: 28, fontSize: 12, color: "#6E7686", textAlign: "center", animation: "fadeIn 0.6s ease-out 0.3s both" }}>
          Powered by <span style={{ color: "#111827", fontWeight: 600 }}>JobsAdis Platform</span>
        </p>
      </div>
    </>
  );
}
