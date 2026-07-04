"use client";

import { useState, useEffect } from "react";
import { logoutIdp, changeAdminUsername, changeAdminPassword, getAdminUsername } from "./actions";
import { LogOut, Cpu, Users, Smartphone, Server, Activity, Search, Filter, KeyRound, Menu, X, Check, AlertCircle } from "lucide-react";

type View = "telemetry" | "password-management";

// ── Shared input style ────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#121212",
  border: "1px solid #3f3f46",
  color: "#e5e7eb",
  padding: "11px 16px",
  borderRadius: 8,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "monospace",
};

// ── Password Management Panel ─────────────────────────────────────────
function PasswordManagementPanel() {
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  const [newUsername, setNewUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [savingUsername, setSavingUsername] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    getAdminUsername().then(setCurrentUsername).catch(() => setCurrentUsername("admin"));
  }, []);

  const handleSaveUsername = async () => {
    if (!newUsername.trim()) return;
    setSavingUsername(true);
    setUsernameStatus(null);
    const res = await changeAdminUsername(newUsername.trim());
    setSavingUsername(false);
    setUsernameStatus({ ok: !!res.success, msg: res.success ? "Username updated!" : (res.error || "Failed.") });
    if (res.success) {
      setCurrentUsername(newUsername.trim());
      setNewUsername("");
    }
  };

  const handleSavePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ ok: false, msg: "Passwords do not match." });
      return;
    }
    setSavingPassword(true);
    setPasswordStatus(null);
    const res = await changeAdminPassword(newPassword);
    setSavingPassword(false);
    setPasswordStatus({ ok: !!res.success, msg: res.success ? "Password updated!" : (res.error || "Failed.") });
    if (res.success) {
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const StatusBadge = ({ status }: { status: { ok: boolean; msg: string } }) => (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "10px 14px", borderRadius: 8,
      background: status.ok ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
      border: `1px solid ${status.ok ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
      color: status.ok ? "#10b981" : "#ef4444",
      fontSize: 13,
    }}>
      {status.ok ? <Check size={14} /> : <AlertCircle size={14} />}
      {status.msg}
    </div>
  );

  const SaveBtn = ({ onClick, loading, disabled }: { onClick: () => void; loading: boolean; disabled?: boolean }) => (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      style={{
        background: (loading || disabled) ? "#27272a" : "#a855f7",
        color: (loading || disabled) ? "#52525b" : "#fff",
        border: "none", borderRadius: 8,
        padding: "11px 24px", fontSize: 13, fontWeight: 700,
        cursor: (loading || disabled) ? "not-allowed" : "pointer",
        transition: "background 0.2s", whiteSpace: "nowrap",
        fontFamily: "monospace",
      }}
    >
      {loading ? "Saving..." : "Save"}
    </button>
  );

  return (
    <div style={{ maxWidth: 500 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#f3f4f6", margin: "0 0 4px" }}>Password Management</h1>
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
          Manage the /admin dashboard credentials
        </p>
      </div>

      {/* ── Username ── */}
      <div style={{ background: "#171717", border: "1px solid #262626", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <KeyRound size={15} color="#a855f7" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#f3f4f6" }}>Admin Username</p>
            <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
              Current: <span style={{ color: "#a855f7" }}>{currentUsername ?? "..."}</span>
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <input
            type="text"
            value={newUsername}
            onChange={e => { setNewUsername(e.target.value); setUsernameStatus(null); }}
            placeholder="New username"
            style={inputStyle}
            onKeyDown={e => { if (e.key === "Enter") handleSaveUsername(); }}
          />
          <SaveBtn onClick={handleSaveUsername} loading={savingUsername} disabled={!newUsername.trim()} />
        </div>

        {usernameStatus && <div style={{ marginTop: 12 }}><StatusBadge status={usernameStatus} /></div>}
      </div>

      {/* ── Password ── */}
      <div style={{ background: "#171717", border: "1px solid #262626", borderRadius: 12, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <KeyRound size={15} color="#3b82f6" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#f3f4f6" }}>Admin Password</p>
            <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>Min. 6 characters</p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="password"
            value={newPassword}
            onChange={e => { setNewPassword(e.target.value); setPasswordStatus(null); }}
            placeholder="New password"
            style={inputStyle}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setPasswordStatus(null); }}
              placeholder="Confirm password"
              style={inputStyle}
              onKeyDown={e => { if (e.key === "Enter") handleSavePassword(); }}
            />
            <SaveBtn onClick={handleSavePassword} loading={savingPassword} disabled={!newPassword || !confirmPassword} />
          </div>
        </div>

        {passwordStatus && <div style={{ marginTop: 12 }}><StatusBadge status={passwordStatus} /></div>}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────
export default function IdpDashboard({ initialData, error }: { initialData: any; error?: string | null }) {
  const [data] = useState(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [view, setView] = useState<View>("telemetry");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logoutIdp();
    window.location.reload();
  };

  const getPerfColor = (perf: string) => {
    if (perf === "high") return { bg: "rgba(16,185,129,0.1)", text: "#10b981", border: "rgba(16,185,129,0.2)" };
    if (perf === "medium" || !perf) return { bg: "rgba(59,130,246,0.1)", text: "#3b82f6", border: "rgba(59,130,246,0.2)" };
    if (perf === "low") return { bg: "rgba(239,68,68,0.1)", text: "#ef4444", border: "rgba(239,68,68,0.2)" };
    return { bg: "rgba(107,114,128,0.1)", text: "#9ca3af", border: "rgba(107,114,128,0.2)" };
  };

  const pct = (val: number) => {
    if (!data || data.stats.totalUsers === 0) return 0;
    return Math.round((val / data.stats.totalUsers) * 100);
  };

  const NavItem = ({ id, icon, label }: { id: View; icon: React.ReactNode; label: string }) => (
    <button
      onClick={() => { setView(id); setMobileMenuOpen(false); }}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%",
        background: view === id ? "rgba(16,185,129,0.1)" : "transparent",
        border: `1px solid ${view === id ? "rgba(16,185,129,0.2)" : "transparent"}`,
        color: view === id ? "#10b981" : "#9ca3af",
        borderRadius: 8, padding: "10px 14px", cursor: "pointer",
        fontSize: 14, fontWeight: view === id ? 600 : 400, textAlign: "left",
        fontFamily: "monospace",
      }}
    >
      {icon}<span>{label}</span>
    </button>
  );

  const SidebarContent = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <NavItem id="telemetry" icon={<Activity size={16} />} label="Telemetry" />
      <div style={{ marginTop: 16 }}>
        <p style={{ fontSize: 10, color: "#4b5563", letterSpacing: 1, textTransform: "uppercase", padding: "0 4px", marginBottom: 6 }}>Security</p>
        <NavItem id="password-management" icon={<KeyRound size={16} />} label="Password Mgmt" />
      </div>
    </div>
  );

  return (
    <>
      {/* Global styles for responsive layout */}
      <style>{`
        .idp-layout { display: flex; min-height: 100vh; background: #0a0a0a; color: #e5e7eb; font-family: monospace; flex-direction: column; }
        .idp-body { display: flex; flex: 1; overflow: hidden; }
        .idp-sidebar { width: 210px; background: #111; border-right: 1px solid #1f1f1f; padding: 20px 12px; flex-shrink: 0; }
        .idp-main { flex: 1; padding: 28px 32px; overflow: auto; }
        .idp-hamburger { display: none; }
        .idp-mobile-overlay { display: none; }
        @media (max-width: 768px) {
          .idp-sidebar { display: none; }
          .idp-hamburger { display: flex; }
          .idp-main { padding: 20px 16px; }
          .idp-mobile-overlay { display: block; position: fixed; inset: 0; z-index: 40; }
          .idp-mobile-sidebar { position: fixed; top: 0; left: 0; bottom: 0; width: 240px; background: #111; border-right: 1px solid #1f1f1f; padding: 20px 12px; z-index: 50; }
          .stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      <div className="idp-layout">
        {/* Header */}
        <header style={{ background: "#171717", borderBottom: "1px solid #262626", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Hamburger — mobile only */}
            <button
              className="idp-hamburger"
              onClick={() => setMobileMenuOpen(true)}
              style={{ background: "transparent", border: "1px solid #3f3f46", color: "#d1d5db", padding: "7px", borderRadius: 6, cursor: "pointer", alignItems: "center", justifyContent: "center" }}
            >
              <Menu size={18} />
            </button>

            <div style={{ width: 32, height: 32, background: "rgba(16,185,129,0.1)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(16,185,129,0.2)" }}>
              <Cpu size={18} color="#10b981" />
            </div>
            <div>
              <h1 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "#f3f4f6" }}>IDP Console</h1>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>Internal Developer Portal</p>
            </div>
          </div>

          <button onClick={handleLogout} style={{ background: "transparent", border: "1px solid #3f3f46", color: "#d1d5db", padding: "8px 14px", borderRadius: 6, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, fontFamily: "monospace" }}>
            <LogOut size={14} /> Logout
          </button>
        </header>

        {/* Mobile overlay + sidebar */}
        {mobileMenuOpen && (
          <>
            <div className="idp-mobile-overlay" onClick={() => setMobileMenuOpen(false)} style={{ background: "rgba(0,0,0,0.6)" }} />
            <div className="idp-mobile-sidebar">
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                <button onClick={() => setMobileMenuOpen(false)} style={{ background: "transparent", border: "none", color: "#9ca3af", cursor: "pointer", padding: 4 }}>
                  <X size={18} />
                </button>
              </div>
              <SidebarContent />
            </div>
          </>
        )}

        <div className="idp-body">
          {/* Desktop Sidebar */}
          <aside className="idp-sidebar">
            <SidebarContent />
          </aside>

          {/* Main Content */}
          <main className="idp-main">

            {/* ── Telemetry View ── */}
            {view === "telemetry" && (
              <>
                {error && (
                  <div style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5", padding: 20, borderRadius: 12, marginBottom: 28, border: "1px solid rgba(239,68,68,0.2)" }}>
                    <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700 }}>Telemetry Load Failure</h3>
                    <p style={{ margin: 0, fontSize: 13 }}>{error}</p>
                  </div>
                )}

                {!error && data && (
                  <>
                    {/* Stats Grid */}
                    <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
                      {[
                        { label: "Users", value: data.stats.totalUsers, color: "#a855f7", icon: <Users size={12} /> },
                        { label: "High", value: data.stats.performanceBreakdown.high, color: "#10b981", sub: `${pct(data.stats.performanceBreakdown.high)}%`, icon: <Server size={12} /> },
                        { label: "Mid", value: data.stats.performanceBreakdown.medium, color: "#3b82f6", sub: `${pct(data.stats.performanceBreakdown.medium)}%`, icon: <Smartphone size={12} /> },
                        { label: "Low", value: data.stats.performanceBreakdown.low, color: "#ef4444", sub: `${pct(data.stats.performanceBreakdown.low)}%`, icon: <Activity size={12} /> },
                      ].map(({ label, value, color, sub, icon }) => (
                        <div key={label} style={{ background: "#171717", border: "1px solid #262626", borderRadius: 12, padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                            <div style={{ background: `${color}1a`, padding: 4, borderRadius: 6, color, display: "flex" }}>{icon}</div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af" }}>{label}</span>
                          </div>
                          <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
                          {sub && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{sub}</div>}
                        </div>
                      ))}
                    </div>

                    {/* Table */}
                    <div style={{ background: "#171717", border: "1px solid #262626", borderRadius: 12, overflow: "hidden" }}>
                      <div style={{ padding: "16px 20px", borderBottom: "1px solid #262626", display: "flex", flexDirection: "column", gap: 12 }}>
                        <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#f3f4f6" }}>Raw User Telemetry</h2>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
                            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                            <input
                              type="text"
                              placeholder="Search ID or Name..."
                              value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                              style={{ width: "100%", background: "#121212", border: "1px solid #3f3f46", color: "#e5e7eb", padding: "7px 12px 7px 30px", borderRadius: 6, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "monospace" }}
                            />
                          </div>
                          <div style={{ position: "relative" }}>
                            <select
                              value={genderFilter}
                              onChange={e => setGenderFilter(e.target.value)}
                              style={{ appearance: "none", background: "#121212", border: "1px solid #3f3f46", color: "#e5e7eb", padding: "7px 30px 7px 12px", borderRadius: 6, fontSize: 13, outline: "none", cursor: "pointer", fontFamily: "monospace" }}
                            >
                              <option value="all">All Genders</option>
                              <option value="male">Men</option>
                              <option value="female">Women</option>
                            </select>
                            <Filter size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
                          </div>
                        </div>
                      </div>

                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                          <thead>
                            <tr style={{ background: "#121212", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, fontSize: 11 }}>
                              {["Telegram ID", "Name", "Role", "Tier", "Joined"].map(h => (
                                <th key={h} style={{ padding: "10px 16px", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const filtered = data.users.filter((user: any) => {
                                const gender = user.profiles?.gender?.toLowerCase() || "";
                                if (genderFilter === "male" && gender !== "male" && gender !== "m") return false;
                                if (genderFilter === "female" && gender !== "female" && gender !== "f") return false;
                                if (searchQuery) {
                                  const q = searchQuery.toLowerCase();
                                  const name = (user.profiles?.full_name || "").toLowerCase();
                                  const id = String(user.telegram_id || "").toLowerCase();
                                  if (!name.includes(q) && !id.includes(q)) return false;
                                }
                                return true;
                              });

                              if (!filtered.length) {
                                return (
                                  <tr>
                                    <td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#4b5563" }}>No users match your filter.</td>
                                  </tr>
                                );
                              }

                              return filtered.map((user: any) => {
                                const rawPerf = user.device_performance || "medium";
                                const perf = rawPerf === "medium" ? "mid" : rawPerf;
                                const color = getPerfColor(rawPerf);
                                return (
                                  <tr key={user.id} style={{ borderBottom: "1px solid #1f1f1f" }}>
                                    <td style={{ padding: "12px 16px", color: "#d1d5db" }}>{user.telegram_id}</td>
                                    <td style={{ padding: "12px 16px", color: "#9ca3af", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.profiles?.full_name || "—"}</td>
                                    <td style={{ padding: "12px 16px", color: "#9ca3af", textTransform: "capitalize" }}>{user.role}</td>
                                    <td style={{ padding: "12px 16px" }}>
                                      <span style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}`, padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{perf}</span>
                                    </td>
                                    <td style={{ padding: "12px 16px", color: "#6b7280", whiteSpace: "nowrap" }}>
                                      {new Date(user.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" })}
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── Password Management View ── */}
            {view === "password-management" && <PasswordManagementPanel />}
          </main>
        </div>
      </div>
    </>
  );
}
