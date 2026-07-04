"use client";

import { useState, useEffect } from "react";
import { logoutIdp, changeAdminPassword, getManagedUsers, setUserPasswordOverride, getUserPasswordOverrides, getAdminPasswordInfo } from "./actions";
import { LogOut, Cpu, Users, Smartphone, Server, Activity, Search, Filter, KeyRound, ShieldCheck, ChevronRight, Eye, EyeOff, Check, X } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────
type View = "telemetry" | "password-management";

interface ManagedUser {
  id: string;
  telegram_id: number;
  role: string;
  is_banned: boolean;
  profiles: { full_name: string } | null;
}

interface PasswordOverride {
  userId: string;
  updatedAt: string;
}

// ── Sub-components ───────────────────────────────────────────────────

function AdminPasswordPanel() {
  const [info, setInfo] = useState<{ source: string; updatedAt: string | null } | null>(null);
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    getAdminPasswordInfo().then(setInfo).catch(() => {});
  }, []);

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirm) { setStatus({ ok: false, msg: "Passwords do not match." }); return; }
    setLoading(true); setStatus(null);
    const res = await changeAdminPassword(current, newPass);
    setLoading(false);
    if (res.success) {
      setStatus({ ok: true, msg: "Admin password updated successfully." });
      setCurrent(""); setNewPass(""); setConfirm("");
      getAdminPasswordInfo().then(setInfo).catch(() => {});
    } else {
      setStatus({ ok: false, msg: res.error || "Failed." });
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, background: "rgba(168, 85, 247, 0.1)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(168, 85, 247, 0.2)" }}>
          <ShieldCheck size={18} color="#a855f7" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#f3f4f6" }}>Admin Password</h2>
          {info && (
            <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>
              Source: <span style={{ color: info.source === "database" ? "#10b981" : "#f59e0b" }}>{info.source}</span>
              {info.updatedAt && ` · Last changed ${new Date(info.updatedAt).toLocaleDateString()}`}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleChange} style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 420 }}>
        <div>
          <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>Current Password</label>
          <div style={{ position: "relative" }}>
            <input
              type={showCurrent ? "text" : "password"}
              value={current}
              onChange={e => setCurrent(e.target.value)}
              required
              placeholder="Enter current password"
              style={inputStyle}
            />
            <button type="button" onClick={() => setShowCurrent(v => !v)} style={eyeBtnStyle}>
              {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>New Password</label>
          <div style={{ position: "relative" }}>
            <input
              type={showNew ? "text" : "password"}
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              required
              placeholder="Min. 6 characters"
              style={inputStyle}
            />
            <button type="button" onClick={() => setShowNew(v => !v)} style={eyeBtnStyle}>
              {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>Confirm New Password</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            placeholder="Repeat new password"
            style={inputStyle}
          />
        </div>

        {status && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: status.ok ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)", border: `1px solid ${status.ok ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`, color: status.ok ? "#10b981" : "#ef4444", fontSize: 13 }}>
            {status.ok ? <Check size={14} /> : <X size={14} />} {status.msg}
          </div>
        )}

        <button type="submit" disabled={loading} style={submitBtnStyle(loading)}>
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}

function UserPasswordPanel() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [overrides, setOverrides] = useState<PasswordOverride[]>([]);
  const [search, setSearch] = useState("");
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [newPass, setNewPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    Promise.all([getManagedUsers(), getUserPasswordOverrides()])
      .then(([u, o]) => { setUsers(u as ManagedUser[]); setOverrides(o); })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const hasOverride = (userId: string) => overrides.some(o => o.userId === userId);

  const filteredUsers = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.telegram_id?.toString().includes(q) ||
      (u.profiles?.full_name || "").toLowerCase().includes(q)
    );
  });

  const handleSetPassword = async (userId: string) => {
    setLoading(true);
    const res = await setUserPasswordOverride(userId, newPass);
    setLoading(false);
    setStatuses(prev => ({ ...prev, [userId]: { ok: !!res.success, msg: res.success ? "Password set!" : (res.error || "Failed.") } }));
    if (res.success) {
      setEditUserId(null);
      setNewPass("");
      getUserPasswordOverrides().then(setOverrides).catch(() => {});
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, background: "rgba(59, 130, 246, 0.1)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
          <Users size={18} color="#3b82f6" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#f3f4f6" }}>User Passwords</h2>
          <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>Set or override individual user passwords</p>
        </div>
      </div>

      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
        <input
          type="text"
          placeholder="Search by name or Telegram ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, paddingLeft: 32 }}
        />
      </div>

      {fetching ? (
        <p style={{ color: "#6b7280", fontSize: 13, textAlign: "center", padding: 40 }}>Loading users...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredUsers.map(user => (
            <div key={user.id} style={{ background: "#121212", border: "1px solid #262626", borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1f2937", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 700 }}>
                      {(user.profiles?.full_name || "?")[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, color: "#e5e7eb", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {user.profiles?.full_name || "—"}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>
                      ID: {user.telegram_id} · <span style={{ textTransform: "capitalize" }}>{user.role}</span>
                      {hasOverride(user.id) && <span style={{ marginLeft: 6, color: "#10b981" }}>· Password set</span>}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setEditUserId(editUserId === user.id ? null : user.id); setNewPass(""); setShowPass(false); }}
                  style={{ background: editUserId === user.id ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.1)", color: editUserId === user.id ? "#ef4444" : "#3b82f6", border: `1px solid ${editUserId === user.id ? "rgba(239,68,68,0.2)" : "rgba(59,130,246,0.2)"}`, borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}
                >
                  <KeyRound size={12} /> {editUserId === user.id ? "Cancel" : "Set Password"}
                </button>
              </div>

              {statuses[user.id] && editUserId !== user.id && (
                <div style={{ marginTop: 8, fontSize: 12, color: statuses[user.id].ok ? "#10b981" : "#ef4444", display: "flex", alignItems: "center", gap: 4 }}>
                  {statuses[user.id].ok ? <Check size={12} /> : <X size={12} />} {statuses[user.id].msg}
                </div>
              )}

              {editUserId === user.id && (
                <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <input
                      type={showPass ? "text" : "password"}
                      value={newPass}
                      onChange={e => setNewPass(e.target.value)}
                      placeholder="New password (min 4 chars)"
                      style={{ ...inputStyle, margin: 0 }}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (newPass.length >= 4) handleSetPassword(user.id); } }}
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)} style={eyeBtnStyle}>
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button
                    onClick={() => handleSetPassword(user.id)}
                    disabled={loading || newPass.length < 4}
                    style={{ ...submitBtnStyle(loading || newPass.length < 4), padding: "10px 16px", fontSize: 12, whiteSpace: "nowrap" }}
                  >
                    {loading ? "..." : "Save"}
                  </button>
                </div>
              )}
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <p style={{ color: "#6b7280", fontSize: 13, textAlign: "center", padding: 40 }}>No users found.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Shared Styles ────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#121212",
  border: "1px solid #3f3f46",
  color: "#e5e7eb",
  padding: "10px 40px 10px 14px",
  borderRadius: 8,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const eyeBtnStyle: React.CSSProperties = {
  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
  background: "transparent", border: "none", color: "#6b7280", cursor: "pointer",
  display: "flex", padding: 0,
};

const submitBtnStyle = (disabled: boolean): React.CSSProperties => ({
  background: disabled ? "#374151" : "rgba(168, 85, 247, 0.8)",
  color: disabled ? "#6b7280" : "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 20px",
  fontSize: 13,
  fontWeight: 600,
  cursor: disabled ? "not-allowed" : "pointer",
  transition: "background 0.2s",
});

// ── Main Dashboard ───────────────────────────────────────────────────
export default function IdpDashboard({ initialData, error }: { initialData: any, error?: string | null }) {
  const [data] = useState(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [view, setView] = useState<View>("telemetry");
  const [pwSubView, setPwSubView] = useState<"admin" | "users">("admin");
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

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

  const navItem = (id: View, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setView(id)}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%",
        background: view === id ? "rgba(16, 185, 129, 0.1)" : "transparent",
        border: `1px solid ${view === id ? "rgba(16, 185, 129, 0.2)" : "transparent"}`,
        color: view === id ? "#10b981" : "#9ca3af",
        borderRadius: 8, padding: "10px 12px", cursor: "pointer",
        fontSize: 13, fontWeight: view === id ? 600 : 400, textAlign: "left",
        transition: "all 0.15s"
      }}
    >
      {icon}
      {sidebarExpanded && <span>{label}</span>}
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e5e7eb", fontFamily: "monospace", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{ background: "#171717", borderBottom: "1px solid #262626", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, background: "rgba(16, 185, 129, 0.1)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
            <Cpu size={18} color="#10b981" />
          </div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#f3f4f6" }}>IDP Console</h1>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>Internal Developer Portal</p>
          </div>
        </div>
        <button onClick={handleLogout} style={{ background: "transparent", border: "1px solid #3f3f46", color: "#d1d5db", padding: "8px 16px", borderRadius: 6, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
          <LogOut size={14} /> Logout
        </button>
      </header>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <aside style={{ width: sidebarExpanded ? 220 : 60, background: "#111111", borderRight: "1px solid #1f1f1f", padding: "16px 10px", display: "flex", flexDirection: "column", gap: 4, transition: "width 0.2s", flexShrink: 0, overflow: "hidden" }}>
          <button
            onClick={() => setSidebarExpanded(v => !v)}
            style={{ display: "flex", alignItems: "center", justifyContent: sidebarExpanded ? "flex-end" : "center", background: "transparent", border: "none", color: "#6b7280", cursor: "pointer", padding: "4px 4px 12px", marginBottom: 4 }}
          >
            <ChevronRight size={16} style={{ transform: sidebarExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          </button>

          {navItem("telemetry", <Activity size={16} />, "Telemetry")}

          {/* Password Management section */}
          <div style={{ marginTop: 12 }}>
            {sidebarExpanded && <p style={{ fontSize: 10, color: "#4b5563", letterSpacing: 1, textTransform: "uppercase", padding: "0 4px", marginBottom: 6 }}>Security</p>}
            <button
              onClick={() => setView("password-management")}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                background: view === "password-management" ? "rgba(168, 85, 247, 0.1)" : "transparent",
                border: `1px solid ${view === "password-management" ? "rgba(168, 85, 247, 0.2)" : "transparent"}`,
                color: view === "password-management" ? "#a855f7" : "#9ca3af",
                borderRadius: 8, padding: "10px 12px", cursor: "pointer",
                fontSize: 13, fontWeight: view === "password-management" ? 600 : 400, textAlign: "left",
                transition: "all 0.15s"
              }}
            >
              <KeyRound size={16} />
              {sidebarExpanded && <span>Password Mgmt</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, padding: "clamp(16px, 3vw, 32px)", overflow: "auto" }}>

          {/* ── Telemetry View ── */}
          {view === "telemetry" && (
            <>
              {error && (
                <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "#fca5a5", padding: "20px", borderRadius: 12, marginBottom: 32, border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Telemetry Load Failure</h3>
                  <p style={{ margin: 0, fontSize: 13, opacity: 0.8, marginTop: 4 }}>{error}</p>
                </div>
              )}

              {!error && data && (
                <>
                  {/* Stats */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "clamp(4px, 1.5vw, 12px)", marginBottom: 32 }}>
                    <div style={{ background: "#171717", border: "1px solid #262626", borderRadius: 12, padding: "clamp(6px, 1.5vw, 16px)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                        <div style={{ background: "rgba(168, 85, 247, 0.1)", padding: 4, borderRadius: 4, color: "#a855f7", display: "flex" }}><Users size={12} /></div>
                        <h3 style={{ fontSize: "clamp(8px, 1.8vw, 13px)", fontWeight: 600, margin: 0, color: "#d1d5db" }}>Users</h3>
                      </div>
                      <div style={{ fontSize: "clamp(14px, 3vw, 28px)", fontWeight: 700, color: "#fff" }}>{data.stats.totalUsers}</div>
                    </div>
                    <div style={{ background: "#171717", border: "1px solid #262626", borderRadius: 12, padding: "clamp(6px, 1.5vw, 16px)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                        <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: 4, borderRadius: 4, color: "#10b981", display: "flex" }}><Server size={12} /></div>
                        <h3 style={{ fontSize: "clamp(8px, 1.8vw, 13px)", fontWeight: 600, margin: 0, color: "#d1d5db" }}>High</h3>
                      </div>
                      <div style={{ fontSize: "clamp(14px, 3vw, 28px)", fontWeight: 700, color: "#10b981" }}>{data.stats.performanceBreakdown.high}</div>
                      <div style={{ fontSize: "clamp(8px, 1.5vw, 12px)", color: "#9ca3af" }}>{pct(data.stats.performanceBreakdown.high)}%</div>
                    </div>
                    <div style={{ background: "#171717", border: "1px solid #262626", borderRadius: 12, padding: "clamp(6px, 1.5vw, 16px)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                        <div style={{ background: "rgba(59, 130, 246, 0.1)", padding: 4, borderRadius: 4, color: "#3b82f6", display: "flex" }}><Smartphone size={12} /></div>
                        <h3 style={{ fontSize: "clamp(8px, 1.8vw, 13px)", fontWeight: 600, margin: 0, color: "#d1d5db" }}>Mid</h3>
                      </div>
                      <div style={{ fontSize: "clamp(14px, 3vw, 28px)", fontWeight: 700, color: "#3b82f6" }}>{data.stats.performanceBreakdown.medium}</div>
                      <div style={{ fontSize: "clamp(8px, 1.5vw, 12px)", color: "#9ca3af" }}>{pct(data.stats.performanceBreakdown.medium)}%</div>
                    </div>
                    <div style={{ background: "#171717", border: "1px solid #262626", borderRadius: 12, padding: "clamp(6px, 1.5vw, 16px)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                        <div style={{ background: "rgba(239, 68, 68, 0.1)", padding: 4, borderRadius: 4, color: "#ef4444", display: "flex" }}><Activity size={12} /></div>
                        <h3 style={{ fontSize: "clamp(8px, 1.8vw, 13px)", fontWeight: 600, margin: 0, color: "#d1d5db" }}>Low</h3>
                      </div>
                      <div style={{ fontSize: "clamp(14px, 3vw, 28px)", fontWeight: 700, color: "#ef4444" }}>{data.stats.performanceBreakdown.low}</div>
                      <div style={{ fontSize: "clamp(8px, 1.5vw, 12px)", color: "#9ca3af" }}>{pct(data.stats.performanceBreakdown.low)}%</div>
                    </div>
                  </div>

                  {/* User Table */}
                  <div style={{ background: "#171717", border: "1px solid #262626", borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ padding: "16px 24px", borderBottom: "1px solid #262626", display: "flex", flexDirection: "column", gap: 12 }}>
                      <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: "#f3f4f6" }}>Raw User Telemetry</h2>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div style={{ position: "relative", flex: 1 }}>
                          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                          <input
                            type="text"
                            placeholder="Search ID or Name..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ width: "100%", background: "#121212", border: "1px solid #3f3f46", color: "#e5e7eb", padding: "6px 12px 6px 30px", borderRadius: 6, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                          />
                        </div>
                        <div style={{ position: "relative" }}>
                          <select
                            value={genderFilter}
                            onChange={e => setGenderFilter(e.target.value)}
                            style={{ appearance: "none", background: "#121212", border: "1px solid #3f3f46", color: "#e5e7eb", padding: "6px 28px 6px 12px", borderRadius: 6, fontSize: 13, outline: "none", cursor: "pointer" }}
                          >
                            <option value="all">All Genders</option>
                            <option value="male">Men</option>
                            <option value="female">Women</option>
                          </select>
                          <Filter size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ overflow: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13, tableLayout: "fixed" }}>
                        <thead>
                          <tr style={{ background: "#121212", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 }}>
                            <th style={{ padding: "12px 24px", fontWeight: 600, width: "22%" }}>ID</th>
                            <th style={{ padding: "12px 24px", fontWeight: 600, width: "25%" }}>Name</th>
                            <th style={{ padding: "12px 24px", fontWeight: 600, width: "18%" }}>Role</th>
                            <th style={{ padding: "12px 24px", fontWeight: 600, width: "18%" }}>Tier</th>
                            <th style={{ padding: "12px 24px", fontWeight: 600, width: "17%" }}>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const filteredUsers = data.users.filter((user: any) => {
                              const gender = user.profiles?.gender?.toLowerCase() || "";
                              if (genderFilter === "male" && gender !== "male" && gender !== "m") return false;
                              if (genderFilter === "female" && gender !== "female" && gender !== "f") return false;
                              if (searchQuery) {
                                const query = searchQuery.toLowerCase();
                                const name = (user.profiles?.full_name || "").toLowerCase();
                                const id = (user.telegram_id || "").toString().toLowerCase();
                                if (!name.includes(query) && !id.includes(query)) return false;
                              }
                              return true;
                            });
                            if (filteredUsers.length === 0) {
                              return <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>No telemetry data matches your filter.</td></tr>;
                            }
                            return filteredUsers.map((user: any) => {
                              const rawPerf = user.device_performance || "medium";
                              const perf = rawPerf === "medium" ? "mid" : rawPerf;
                              const color = getPerfColor(rawPerf);
                              return (
                                <tr key={user.id} style={{ borderBottom: "1px solid #262626" }}>
                                  <td style={{ padding: "14px 24px", color: "#d1d5db", wordBreak: "break-all" }}>{user.telegram_id}</td>
                                  <td style={{ padding: "14px 24px", color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.profiles?.full_name || "—"}</td>
                                  <td style={{ padding: "14px 24px", color: "#9ca3af", textTransform: "capitalize" }}>{user.role}</td>
                                  <td style={{ padding: "14px 24px" }}>
                                    <span style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}`, padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>{perf}</span>
                                  </td>
                                  <td style={{ padding: "14px 24px", color: "#6b7280" }}>
                                    {new Date(user.created_at).toLocaleDateString(undefined, { month: "numeric", day: "numeric", year: "2-digit" })}
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
          {view === "password-management" && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: "#f3f4f6", margin: 0 }}>Password Management</h1>
                <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>Manage admin and user credentials</p>
              </div>

              {/* Tab bar */}
              <div style={{ display: "flex", gap: 4, marginBottom: 28, background: "#171717", border: "1px solid #262626", borderRadius: 10, padding: 4, width: "fit-content" }}>
                {(["admin", "users"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setPwSubView(tab)}
                    style={{
                      padding: "8px 20px", borderRadius: 7, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      background: pwSubView === tab ? "#262626" : "transparent",
                      color: pwSubView === tab ? "#f3f4f6" : "#6b7280",
                      transition: "all 0.15s"
                    }}
                  >
                    {tab === "admin" ? "Admin Password" : "User Passwords"}
                  </button>
                ))}
              </div>

              <div style={{ background: "#171717", border: "1px solid #262626", borderRadius: 12, padding: "24px" }}>
                {pwSubView === "admin" ? <AdminPasswordPanel /> : <UserPasswordPanel />}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
