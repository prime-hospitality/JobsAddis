"use client";

import { useState } from "react";
import { loginAdmin } from "./actions";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [hasError, setHasError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setError("Please enter your username.");
      setHasError(true);
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      setHasError(true);
      return;
    }

    setLoading(true);
    setError("");
    setHasError(false);

    try {
      const res = await loginAdmin(username, password);
      if (res.success) {
        window.location.reload();
      } else {
        setError(res.error || "Login failed.");
        setHasError(true);
      }
    } catch (err: any) {
      setError("Something went wrong. Please try again.");
      setHasError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Left Side */}
      <div 
        className="w-full md:w-1/2 lg:flex-1 flex flex-col justify-center items-center text-white relative py-10 px-6 md:p-10 md:min-h-screen shrink-0"
        style={{ background: "linear-gradient(135deg, #4b5563 0%, #1f2937 100%)" }}
      >
        {/* Background Overlay effect */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: "radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, transparent 70%)",
          pointerEvents: "none"
        }} />

        <div style={{ zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>

          {/* PBG Logo */}
          <div 
            className="animate-pulse"
            style={{
            width: 120,
            height: 120,
            borderRadius: "16px",
            background: "rgba(255,255,255,0.12)",
            border: "1.5px solid rgba(255,255,255,0.3)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
            boxShadow: "0 4px 24px 0 rgba(0,0,0,0.18)",
            overflow: "hidden"
          }}>
            <img
              src="/pbg_logo.png"
              alt="PBG Logo"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          
          <h1 style={{ 
            fontFamily: "'Playfair Display', 'Times New Roman', serif", 
            fontSize: "clamp(28px, 6vw, 42px)", 
            fontWeight: 400, 
            marginTop: "8px",
            marginBottom: "24px",
            letterSpacing: "0.5px",
            textAlign: "center",
            lineHeight: "1.2"
          }}>
            Prime Hospitality<br/>Business Group
          </h1>

          <div style={{ width: "80%", height: "1px", background: "rgba(255,255,255,0.2)", marginBottom: "24px" }} />

          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "2px", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ fontSize: "clamp(20px, 4vw, 28px)", fontWeight: 700, letterSpacing: "-0.5px", lineHeight: "1" }}>Jobs Addis</span>
                <span style={{ fontSize: "clamp(12px, 2vw, 16px)", fontWeight: 900, letterSpacing: "0.5px", color: "#FDE047", marginTop: "4px", textTransform: "uppercase" }}>A.A Hotel Associates Union</span>
              </div>
            </div>
            <span style={{ fontSize: "clamp(20px, 4vw, 28px)", fontWeight: 300, letterSpacing: "-1px", marginTop: "8px" }}>Admin Dashboard</span>
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="w-full md:w-1/2 lg:flex-1 bg-white flex flex-col justify-center items-center relative p-8 md:p-10 min-h-[60vh] md:min-h-screen shrink-0">
        <div style={{ width: "100%", maxWidth: "380px" }}>
          <p style={{ 
            color: "#9ca3af", 
            fontSize: "15px", 
            marginBottom: "40px",
            lineHeight: "1.5",
            fontWeight: 400
          }}>
            Please enter your username and<br />password to login.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setHasError(false); setError(""); }}
                placeholder="USERNAME"
                style={{
                  width: "100%",
                  padding: "16px 48px 16px 24px",
                  borderRadius: "9999px",
                  border: `1px solid ${hasError ? "#ef4444" : "#e5e7eb"}`,
                  fontSize: "13px",
                  fontWeight: 600,
                  letterSpacing: "1px",
                  color: "#374151",
                  outline: "none",
                  boxSizing: "border-box",
                  textTransform: "uppercase",
                  transition: "border-color 0.2s"
                }}
              />
              <svg 
                width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={hasError ? "#ef4444" : "#9ca3af"} strokeWidth="2" 
                strokeLinecap="round" strokeLinejoin="round"
                style={{ position: "absolute", right: "20px", top: "50%", transform: "translateY(-50%)", transition: "stroke 0.2s" }}
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setHasError(false); setError(""); }}
                placeholder="PASSWORD"
                style={{
                  width: "100%",
                  padding: "16px 24px",
                  borderRadius: "9999px",
                  border: `1px solid ${hasError ? "#ef4444" : "#e5e7eb"}`,
                  fontSize: "13px",
                  fontWeight: 600,
                  letterSpacing: "1px",
                  color: "#374151",
                  outline: "none",
                  boxSizing: "border-box",
                  textTransform: "uppercase",
                  transition: "border-color 0.2s"
                }}
              />
            </div>

            {error && (
              <div style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "12px",
                padding: "14px 16px",
                margin: "0",
                animation: "fadeIn 0.2s ease"
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <p style={{ color: "#dc2626", fontSize: "13px", margin: 0, fontWeight: 500, lineHeight: "1.5" }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                background: "#1d4ed8",
                color: "white",
                padding: "16px 32px",
                borderRadius: "9999px",
                border: "none",
                fontSize: "14px",
                fontWeight: 600,
                letterSpacing: "1px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                width: "fit-content",
                marginTop: "12px",
                opacity: loading ? 0.7 : 1,
                boxShadow: "0 4px 14px 0 rgba(29, 78, 216, 0.39)",
                transition: "all 0.2s ease"
              }}
            >
              {loading ? "LOGGING IN..." : "LOGIN"}
              {!loading && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              )}
            </button>
          </form>
        </div>

        <div style={{
          position: "absolute",
          bottom: "16px",
          color: "#9ca3af",
          fontSize: "13px",
          display: "flex",
          gap: "12px",
          alignItems: "center"
        }}>
          <a href="#" style={{ color: "inherit", textDecoration: "none" }}>Forgot your pin?</a>
        </div>
      </div>
    </div>
  );
}
