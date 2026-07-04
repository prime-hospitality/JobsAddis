"use client";

import { useState } from "react";
import { logoutIdp } from "./actions";
import { LogOut, Cpu, Users, Smartphone, Server, Activity } from "lucide-react";

export default function IdpDashboard({ initialData, error }: { initialData: any, error?: string | null }) {
  const [data] = useState(initialData);

  const handleLogout = async () => {
    await logoutIdp();
    window.location.reload();
  };

  const getPerfColor = (perf: string) => {
    if (perf === "high") return { bg: "rgba(16, 185, 129, 0.1)", text: "#10b981", border: "rgba(16, 185, 129, 0.2)" };
    if (perf === "medium" || !perf) return { bg: "rgba(59, 130, 246, 0.1)", text: "#3b82f6", border: "rgba(59, 130, 246, 0.2)" };
    if (perf === "low") return { bg: "rgba(239, 68, 68, 0.1)", text: "#ef4444", border: "rgba(239, 68, 68, 0.2)" };
    return { bg: "rgba(107, 114, 128, 0.1)", text: "#9ca3af", border: "rgba(107, 114, 128, 0.2)" };
  };

  const pct = (val: number) => {
    if (!data || data.stats.totalUsers === 0) return 0;
    return Math.round((val / data.stats.totalUsers) * 100);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e5e7eb", fontFamily: "monospace" }}>
      {/* Header */}
      <header style={{ background: "#171717", borderBottom: "1px solid #262626", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, background: "rgba(16, 185, 129, 0.1)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
            <Cpu size={18} color="#10b981" />
          </div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#f3f4f6" }}>IDP Console</h1>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>Internal Developer Portal</p>
          </div>
        </div>
        <button onClick={handleLogout} style={{ background: "transparent", border: "1px solid #3f3f46", color: "#d1d5db", padding: "8px 16px", borderRadius: 6, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, transition: "background 0.2s" }} className="hover:bg-zinc-800">
          <LogOut size={14} /> Logout
        </button>
      </header>

      <main style={{ padding: 32, maxWidth: 1200, margin: "0 auto" }}>
        {error && (
          <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "#fca5a5", padding: "20px", borderRadius: 12, marginBottom: 32, border: "1px solid rgba(239, 68, 68, 0.2)", display: "flex", flexDirection: "column", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Telemetry Load Failure</h3>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>{error}</p>
            <p style={{ margin: 0, fontSize: 12, color: "#9ca3af", marginTop: 8 }}>
              💡 Common issue: Ensure the `device_performance` column exists on your `users` table in Supabase.
            </p>
          </div>
        )}

        {!error && data && (
          <>
            {/* Telemetry Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24, marginBottom: 32 }}>
              
              <div style={{ background: "#171717", border: "1px solid #262626", borderRadius: 12, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ background: "rgba(168, 85, 247, 0.1)", padding: 8, borderRadius: 8, color: "#a855f7" }}><Users size={18} /></div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#d1d5db" }}>Total Tracked Users</h3>
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, color: "#fff" }}>{data.stats.totalUsers}</div>
              </div>

              <div style={{ background: "#171717", border: "1px solid #262626", borderRadius: 12, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: 8, borderRadius: 8, color: "#10b981" }}><Server size={18} /></div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#d1d5db" }}>High Performance</h3>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: "#10b981" }}>{data.stats.performanceBreakdown.high}</div>
                  <div style={{ fontSize: 14, color: "#9ca3af" }}>({pct(data.stats.performanceBreakdown.high)}%)</div>
                </div>
              </div>

              <div style={{ background: "#171717", border: "1px solid #262626", borderRadius: 12, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ background: "rgba(59, 130, 246, 0.1)", padding: 8, borderRadius: 8, color: "#3b82f6" }}><Smartphone size={18} /></div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#d1d5db" }}>Medium Performance</h3>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: "#3b82f6" }}>{data.stats.performanceBreakdown.medium}</div>
                  <div style={{ fontSize: 14, color: "#9ca3af" }}>({pct(data.stats.performanceBreakdown.medium)}%)</div>
                </div>
              </div>

              <div style={{ background: "#171717", border: "1px solid #262626", borderRadius: 12, padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ background: "rgba(239, 68, 68, 0.1)", padding: 8, borderRadius: 8, color: "#ef4444" }}><Activity size={18} /></div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#d1d5db" }}>Low Performance</h3>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <div style={{ fontSize: 32, fontWeight: 700, color: "#ef4444" }}>{data.stats.performanceBreakdown.low}</div>
                  <div style={{ fontSize: 14, color: "#9ca3af" }}>({pct(data.stats.performanceBreakdown.low)}%)</div>
                </div>
              </div>

            </div>

            {/* User Data Table */}
            <div style={{ background: "#171717", border: "1px solid #262626", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid #262626" }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: "#f3f4f6" }}>Raw User Telemetry</h2>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#121212", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      <th style={{ padding: "12px 24px", fontWeight: 600 }}>Telegram ID</th>
                      <th style={{ padding: "12px 24px", fontWeight: 600 }}>Name</th>
                      <th style={{ padding: "12px 24px", fontWeight: 600 }}>Role</th>
                      <th style={{ padding: "12px 24px", fontWeight: 600 }}>Performance Tier</th>
                      <th style={{ padding: "12px 24px", fontWeight: 600 }}>Join Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((user: any) => {
                      const perf = user.device_performance || "medium";
                      const color = getPerfColor(perf);
                      return (
                        <tr key={user.id} style={{ borderBottom: "1px solid #262626" }}>
                          <td style={{ padding: "16px 24px", color: "#d1d5db" }}>{user.telegram_id}</td>
                          <td style={{ padding: "16px 24px", color: "#9ca3af" }}>{user.profiles?.full_name || "—"}</td>
                          <td style={{ padding: "16px 24px", color: "#9ca3af", textTransform: "capitalize" }}>{user.role}</td>
                          <td style={{ padding: "16px 24px" }}>
                            <span style={{
                              background: color.bg,
                              color: color.text,
                              border: `1px solid ${color.border}`,
                              padding: "4px 10px",
                              borderRadius: 100,
                              fontSize: 11,
                              fontWeight: 600,
                              textTransform: "uppercase"
                            }}>
                              {perf}
                            </span>
                          </td>
                          <td style={{ padding: "16px 24px", color: "#6b7280" }}>
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                    {data.users.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>No telemetry data available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
