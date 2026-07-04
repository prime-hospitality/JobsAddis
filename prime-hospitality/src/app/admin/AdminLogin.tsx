"use client";

import { useState } from "react";
import { loginAdmin } from "./actions";

const MercedesLogo = () => (
  <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="46" fill="none" stroke="white" strokeWidth="2.5"/>
    <path d="M50 4 L54 48 L93 71 L50 53 L7 71 L46 48 Z" fill="white"/>
  </svg>
);

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await loginAdmin(password);
      if (res.success) {
        window.location.reload();
      } else {
        setError(res.error || "Login failed");
      }
    } catch (err: any) {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      {/* Left Side */}
      <div style={{
        flex: 1,
        background: "linear-gradient(135deg, #4b5563 0%, #1f2937 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
        position: "relative",
        padding: "40px"
      }}>
        {/* Background Overlay effect */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: "radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, transparent 70%)",
          pointerEvents: "none"
        }} />

        <div style={{ zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <MercedesLogo />
          
          <h1 style={{ 
            fontFamily: "'Playfair Display', 'Times New Roman', serif", 
            fontSize: "42px", 
            fontWeight: 400, 
            marginTop: "24px",
            marginBottom: "32px",
            letterSpacing: "0.5px",
            textAlign: "center"
          }}>
            Prime Hospitality<br/>Business Group
          </h1>

          <div style={{ width: "80%", height: "1px", background: "rgba(255,255,255,0.2)", marginBottom: "32px" }} />

          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "28px", fontWeight: 300, letterSpacing: "-0.5px" }}>Manage</span>
            <span style={{ fontSize: "36px", fontWeight: 700, letterSpacing: "-1px" }}>System</span>
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div style={{
        flex: 1,
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        padding: "40px"
      }}>
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
                onChange={(e) => setUsername(e.target.value)}
                placeholder="USERNAME"
                style={{
                  width: "100%",
                  padding: "16px 48px 16px 24px",
                  borderRadius: "9999px",
                  border: "1px solid #e5e7eb",
                  fontSize: "13px",
                  fontWeight: 600,
                  letterSpacing: "1px",
                  color: "#374151",
                  outline: "none",
                  boxSizing: "border-box",
                  textTransform: "uppercase"
                }}
              />
              <svg 
                width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" 
                strokeLinecap="round" strokeLinejoin="round"
                style={{ position: "absolute", right: "20px", top: "50%", transform: "translateY(-50%)" }}
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="PASSWORD"
                style={{
                  width: "100%",
                  padding: "16px 24px",
                  borderRadius: "9999px",
                  border: "1px solid #e5e7eb",
                  fontSize: "13px",
                  fontWeight: 600,
                  letterSpacing: "1px",
                  color: "#374151",
                  outline: "none",
                  boxSizing: "border-box",
                  textTransform: "uppercase"
                }}
              />
            </div>

            {error && <p style={{ color: "#ef4444", fontSize: "14px", margin: "0" }}>{error}</p>}

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
          bottom: "40px",
          color: "#9ca3af",
          fontSize: "13px",
          display: "flex",
          gap: "12px",
          alignItems: "center"
        }}>
          <a href="#" style={{ color: "inherit", textDecoration: "none" }}>Forgot your login?</a>
          <span>•</span>
          <a href="#" style={{ color: "inherit", textDecoration: "none" }}>Privacy Policy</a>
        </div>
      </div>
    </div>
  );
}
