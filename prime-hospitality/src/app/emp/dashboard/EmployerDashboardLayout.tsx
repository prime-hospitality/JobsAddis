"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { logoutEmployer, getEmployerNotifications, markNotificationAsRead } from "../actions";

const navItems = [
  {
    id: "overview",
    label: "Overview",
    href: "/emp/dashboard",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    id: "jobs",
    label: "Manage Job Postings",
    href: "/emp/dashboard/jobs",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      </svg>
    ),
  },
  {
    id: "applicants",
    label: "Applicant Tracking",
    href: "/emp/dashboard/applicants",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    id: "analytics",
    label: "Analytics",
    href: "/emp/dashboard/analytics",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
  {
    id: "profile",
    label: "Company Profile",
    href: "/emp/dashboard/profile",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    id: "billing",
    label: "Billing & Plans",
    href: "/emp/dashboard/billing",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ),
  },
];

export default function EmployerDashboardLayout({
  children,
  session,
}: {
  children: React.ReactNode;
  session: any;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await getEmployerNotifications();
        setNotifications(res);
      } catch (e) {
        console.error("Failed to fetch notifications", e);
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const activeItem = navItems.find((n) => pathname === n.href || (n.href !== "/emp/dashboard" && pathname.startsWith(n.href)));
  const pageTitle = activeItem?.label || "Employer Dashboard";

  const handleLogout = async () => {
    setLoggingOut(true);
    await logoutEmployer();
    router.push("/emp");
  };

  const getInitials = (name: string) => name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #f8fafc; }

        .emp-sidebar-link {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 14px; border-radius: 10px;
          font-size: 14px; font-weight: 500; cursor: pointer;
          transition: all 0.18s ease; text-decoration: none;
          border: none; background: transparent; width: 100%; text-align: left;
          color: #64748b;
        }
        .emp-sidebar-link:hover { background: #f1f5f9; color: #0f172a; }
        .emp-sidebar-link.active { background: #eff6ff; color: #0284c7; font-weight: 600; }
        .emp-sidebar-link.active svg { stroke: #0284c7; }

        .emp-topbar-btn { background: none; border: none; cursor: pointer; padding: 8px; border-radius: 8px; display: flex; align-items: center; justify-content: center; transition: background 0.15s; color: #64748b; }
        .emp-topbar-btn:hover { background: #f1f5f9; color: #0f172a; }

        .emp-sidebar-overlay { display: none; }
        @media (max-width: 768px) {
          .emp-sidebar { transform: translateX(-100%); transition: transform 0.25s ease; position: fixed !important; }
          .emp-sidebar.open { transform: translateX(0); }
          .emp-sidebar-overlay { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 39; }
        }
      `}</style>

      <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#f8fafc" }}>
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="emp-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside
          className={`emp-sidebar${sidebarOpen ? " open" : ""}`}
          style={{
            width: 240,
            background: "#fff",
            borderRight: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            zIndex: 40,
            flexShrink: 0,
            position: "relative",
          }}
        >
          {/* Brand */}
          <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#eff6ff", border: "1px solid #bfdbfe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <img src="/addis_jobs_logo.png" alt="JobsAdis" style={{ width: 22, height: 22, objectFit: "contain" }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em", lineHeight: 1 }}>JobsAdis</div>
              <div style={{ fontSize: 8, fontWeight: 900, color: "#B08D57", letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 2 }}>A.A Hotel Associates Union</div>
              <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500, marginTop: 2 }}>Employer Dashboard</div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{ marginLeft: "auto", display: "none", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              className="md-hide-btn"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Employer info chip */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f8fafc", borderRadius: 10, padding: "8px 10px", border: "1px solid #e2e8f0" }}>
              {session?.logoUrl ? (
                <img src={session.logoUrl} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #0284c7, #0369a1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                  {getInitials(session?.businessName || "?")}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{session?.businessName}</div>
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>{session?.businessType}</div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, overflowY: "auto", padding: "12px 12px" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, paddingLeft: 4 }}>Main Menu</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/emp/dashboard" && pathname.startsWith(item.href));
                return (
                  <button
                    key={item.id}
                    className={`emp-sidebar-link${isActive ? " active" : ""}`}
                    onClick={() => { router.push(item.href); setSidebarOpen(false); }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Logout */}
          <div style={{ padding: "12px 12px", borderTop: "1px solid #f1f5f9" }}>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", borderRadius: 10, border: "none", background: "transparent", cursor: loggingOut ? "not-allowed" : "pointer", color: "#ef4444", fontSize: 14, fontWeight: 600, transition: "background 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              {loggingOut ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
          {/* Top bar */}
          <header style={{ height: 64, background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0, zIndex: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {/* Mobile hamburger */}
              <button className="emp-topbar-btn" onClick={() => setSidebarOpen(true)} style={{ display: "none" }} id="emp-hamburger">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>{pageTitle}</h1>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Notifications */}
              <div style={{ position: "relative" }}>
                <button className="emp-topbar-btn" onClick={() => setNotifOpen(!notifOpen)} style={{ position: "relative" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                  {unreadCount > 0 && (
                    <span style={{ position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>
                      {unreadCount}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <>
                    <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setNotifOpen(false)} />
                    <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)", zIndex: 50, width: 320, overflow: "hidden" }}>
                      <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Notifications</span>
                        {unreadCount > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#0284c7" }}>{unreadCount} unread</span>
                        )}
                      </div>
                      <div style={{ maxHeight: 280, overflowY: "auto" }}>
                        {notifications.length === 0 ? (
                          <div style={{ padding: "24px 16px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                            No notifications yet
                          </div>
                        ) : (
                          notifications.map((notif) => {
                            let text = "";
                            let bg = "#f8fafc";
                            if (notif.type === "job_expiring") {
                              text = `Your job post "${notif.job_title}" is expiring within 48 hours. Extend it before it goes offline!`;
                              bg = notif.read ? "#fff" : "#fffbeb";
                            } else if (notif.type === "subscription_expired") {
                              text = `Your subscription has expired. All active jobs have been hidden.`;
                              bg = notif.read ? "#fff" : "#fef2f2";
                            } else if (notif.type === "broadcast") {
                              text = notif.job_title;
                              bg = notif.read ? "#fff" : "#f5f3ff";
                            } else {
                              text = `Someone applied to your "${notif.job_title}" position.`;
                              bg = notif.read ? "#fff" : "#eff6ff";
                            }
                            return (
                              <div
                                key={notif.id}
                                onClick={async () => {
                                  if (!notif.read) {
                                    await markNotificationAsRead(notif.id);
                                    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                                  }
                                }}
                                style={{
                                  padding: "12px 16px",
                                  borderBottom: "1px solid #f1f5f9",
                                  fontSize: 13,
                                  color: "#374151",
                                  cursor: "pointer",
                                  background: bg,
                                  transition: "background 0.15s",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = bg)}
                              >
                                <p style={{ margin: 0, lineHeight: 1.4, fontWeight: notif.read ? 400 : 600 }}>{text}</p>
                                <span style={{ fontSize: 10, color: "#94a3b8", marginTop: 4, display: "block" }}>
                                  {new Date(notif.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Profile dropdown */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px 6px 6px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", transition: "border-color 0.15s" }}
                >
                  {session?.logoUrl ? (
                    <img src={session.logoUrl} alt="" style={{ width: 30, height: 30, borderRadius: 8, objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, #0284c7, #0369a1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff" }}>
                      {getInitials(session?.businessName || "?")}
                    </div>
                  )}
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", lineHeight: 1 }}>{session?.businessName || "Employer"}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{session?.businessType || "Company"}</div>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </button>

                {profileOpen && (
                  <>
                    <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setProfileOpen(false)} />
                    <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 50, minWidth: 180, overflow: "hidden" }}>
                      <div style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9" }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>{session?.businessName}</p>
                        <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0 0" }}>TG: {session?.telegramId}</p>
                      </div>
                      <button
                        onClick={() => { setProfileOpen(false); router.push("/emp/dashboard/profile"); }}
                        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#374151" }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        Company Profile
                      </button>
                      <button
                        onClick={handleLogout}
                        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#ef4444", borderTop: "1px solid #f1f5f9" }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
