"use client";

import { useState } from "react";
import { Lock, Cpu } from "lucide-react";
import { loginIdp } from "./actions";

export default function IdpLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await loginIdp(password);
      if (res.success) {
        window.location.reload();
      } else {
        setError(res.error || "Login failed");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "monospace" }}>
      <div style={{ background: "#171717", padding: "40px 32px", borderRadius: 12, width: "100%", maxWidth: 400, border: "1px solid #262626", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, background: "rgba(16, 185, 129, 0.1)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
            <Cpu size={28} color="#10b981" />
          </div>
        </div>
        
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f3f4f6", textAlign: "center", marginBottom: 8, margin: 0 }}>IDP Access</h1>
        <p style={{ color: "#9ca3af", textAlign: "center", marginBottom: 32, fontSize: 13 }}>Internal Developer Portal</p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#d1d5db", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Password</label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#6b7280", display: "flex" }}>
                <Lock size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: "100%", padding: "12px 14px 12px 42px", borderRadius: 8, border: "1px solid #3f3f46", background: "#27272a", fontSize: 15, outline: "none", color: "#fff", transition: "all 0.2s" }}
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          {error && <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "#fca5a5", padding: "12px", borderRadius: 8, fontSize: 13, border: "1px solid rgba(239, 68, 68, 0.2)" }}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "12px", background: "#10b981", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, transition: "background 0.2s", marginTop: 8 }}
          >
            {loading ? "Authenticating..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
