"use client";

import { useState } from "react";
import { loginAdmin } from "./actions";

export default function AdminLogin() {
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
        // Reload to let server component pick up the cookie
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
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", background: "#f3f4f6", padding: 20
    }}>
      <div style={{
        background: "#fff", padding: 40, borderRadius: 16,
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)", width: "100%", maxWidth: 400
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: "#111827", textAlign: "center" }}>
          AddisJobs Admin
        </h1>
        <p style={{ color: "#6b7280", marginBottom: 24, textAlign: "center" }}>
          Please enter your password to continue.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={{
              padding: "12px 16px", borderRadius: 8, border: "1px solid #d1d5db",
              fontSize: 16, width: "100%", boxSizing: "border-box"
            }}
          />
          {error && <p style={{ color: "#dc2626", fontSize: 14 }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{
              background: "#059669", color: "#fff", padding: "12px 16px",
              borderRadius: 8, border: "none", fontSize: 16, fontWeight: 600,
              cursor: "pointer", opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? "Verifying..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
