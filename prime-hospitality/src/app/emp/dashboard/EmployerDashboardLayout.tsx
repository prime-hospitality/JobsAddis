"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { logoutEmployer, getEmployerNotifications, markAllNotificationsAsRead, getEmployerAccounts, switchEmployerAccount, removeEmployerAccount } from "../actions";
import { getApplicantCounts } from "./applicants/actions";
import EmployerAvatar from "@/components/EmployerAvatar";
import { runSilently } from "@/lib/silentFetch";

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
  const [newApplicantCount, setNewApplicantCount] = useState(0);
  const [accounts, setAccounts] = useState<{ employerId: string; businessName: string; businessType: string; logoUrl: string | null }[]>([]);
  const [switchingAccount, setSwitchingAccount] = useState(false);

  // Both background polls below run through runSilently: they resolve via fetch
  // (server actions), which would otherwise trip GlobalFetchInterceptor and
  // flash the full-screen loading overlay on every 30s tick, on every page of
  // the dashboard. They only feed header/nav badges, so there is nothing for
  // the user to wait on.
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await runSilently(() => getEmployerNotifications());
        setNotifications(res);
      } catch (e) {
        console.error("Failed to fetch notifications", e);
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  // Opening the bell clears the badge on its own, after a beat so it doesn't
  // vanish before the count has registered — same pattern as the seeker-side
  // NotificationPanel.
  useEffect(() => {
    if (!notifOpen) return;
    const markTimer = setTimeout(() => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      runSilently(() => markAllNotificationsAsRead()).catch((e) =>
        console.error("Failed to mark notifications read", e)
      );
    }, 1000);
    return () => clearTimeout(markTimer);
  }, [notifOpen]);

  // Badge the Applicant Tracking nav item with applicants nobody has opened yet.
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const { newCount } = await runSilently(() => getApplicantCounts());
        setNewApplicantCount(newCount);
      } catch (e) {
        console.error("Failed to fetch applicant counts", e);
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [pathname]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const activeItem = navItems.find((n) => pathname === n.href || (n.href !== "/emp/dashboard" && pathname.startsWith(n.href)));
  const pageTitle = activeItem?.label || "Employer Dashboard";

  const handleLogout = async () => {
    setLoggingOut(true);
    await logoutEmployer();
    router.push("/emp");
  };

  const loadAccounts = async () => {
    try {
      const res = await getEmployerAccounts();
      setAccounts(res.accounts);
    } catch (e) {
      console.error("Failed to fetch employer accounts", e);
    }
  };

  const handleToggleProfile = () => {
    const next = !profileOpen;
    setProfileOpen(next);
    if (next) loadAccounts();
  };

  const handleSwitchAccount = async (employerId: string) => {
    if (employerId === session?.employerId || switchingAccount) return;
    setSwitchingAccount(true);
    try {
      const res = await switchEmployerAccount(employerId);
      if (res.success) {
        setProfileOpen(false);
        router.refresh();
      }
    } catch (e) {
      console.error("Failed to switch account", e);
    } finally {
      setSwitchingAccount(false);
    }
  };

  const handleRemoveAccount = async (e: React.MouseEvent, employerId: string) => {
    e.stopPropagation();
    try {
      const res = await removeEmployerAccount(employerId);
      if (res.loggedOut) {
        router.push("/emp");
      } else {
        if (res.switchedTo) router.refresh();
        await loadAccounts();
      }
    } catch (err) {
      console.error("Failed to remove account", err);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #F7F8FA; }

        .emp-sidebar-link {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 14px; border-radius: 10px;
          font-size: 14px; font-weight: 500; cursor: pointer;
          transition: all 0.18s ease; text-decoration: none;
          border: none; background: transparent; width: 100%; text-align: left;
          color: #6E7686;
        }
        .emp-sidebar-link:hover { background: #EFF1F5; color: #141821; }
        .emp-sidebar-link.active { background: #EEF3FC; color: #1B5CBF; font-weight: 600; }
        .emp-sidebar-link.active svg { stroke: #1B5CBF; }

        .emp-topbar-btn { background: none; border: none; cursor: pointer; padding: 8px; border-radius: 8px; display: flex; align-items: center; justify-content: center; transition: background 0.15s; color: #6E7686; }
        .emp-topbar-btn:hover { background: #EFF1F5; color: #141821; }

        .emp-sidebar-overlay { display: none; }
        /* Hamburger and the drawer's close button only exist on mobile. Keep
           their visibility in CSS (never an inline style) so the media query
           below can actually turn them on. */
        .emp-hamburger { display: none; }
        .emp-sidebar-close { display: none; }
        @media (max-width: 768px) {
          .emp-sidebar {
            transform: translateX(-100%); transition: transform 0.25s ease;
            position: fixed !important; top: 0; left: 0; height: 100%;
            box-shadow: 4px 0 24px rgba(15, 23, 42, 0.15);
          }
          .emp-sidebar.open { transform: translateX(0); }
          .emp-sidebar-overlay { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 39; }
          .emp-hamburger { display: flex; }
          .emp-sidebar-close { display: flex; }
          .emp-shell { height: 100dvh !important; }
          .emp-topbar { padding: 0 14px !important; gap: 8px; }
          .emp-page-title { font-size: 16px !important; }
          .emp-main { padding: 16px !important; }
          /* The avatar alone identifies the account here; the name/type text
             would squeeze the page title out of the top bar. */
          .emp-profile-meta, .emp-profile-caret { display: none !important; }
          .emp-profile-btn { padding: 4px !important; }
          .emp-notif-panel { width: calc(100vw - 28px) !important; max-width: 320px; }
        }
      `}</style>

      <div className="emp-shell" style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#F7F8FA" }}>
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
            borderRight: "1px solid #E2E5EC",
            display: "flex",
            flexDirection: "column",
            zIndex: 40,
            flexShrink: 0,
            position: "relative",
          }}
        >
          {/* Brand */}
          <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #EFF1F5", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#F2F012", border: "1px solid #E2E5EC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <img src="/addis_jobs_logo.webp" alt="JobsAdis" style={{ width: 22, height: 22, objectFit: "contain" }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#141821", letterSpacing: "-0.01em", lineHeight: 1 }}>JobsAdis</div>
              <div style={{ fontSize: 8, fontWeight: 600, color: "#1B5CBF", letterSpacing: "0.03em", marginTop: 2 }}>Where Talent Meets Opportunity</div>
              <div style={{ fontSize: 10, color: "#9AA1B1", fontWeight: 500, marginTop: 2 }}>Employer Dashboard</div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation menu"
              style={{ marginLeft: "auto", alignItems: "center", background: "none", border: "none", cursor: "pointer", color: "#9AA1B1", padding: 4 }}
              className="emp-sidebar-close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Employer info chip */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #EFF1F5" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#F7F8FA", borderRadius: 10, padding: "8px 10px", border: "1px solid #E2E5EC" }}>
              <EmployerAvatar name={session?.businessName || "?"} logoUrl={session?.logoUrl} size={32} radius={8} fontSize={14} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#141821", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{session?.businessName}</div>
                <div style={{ fontSize: 10, color: "#9AA1B1", marginTop: 1 }}>{session?.businessType}</div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, overflowY: "auto", padding: "12px 12px" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#CBD0DA", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, paddingLeft: 4 }}>Main Menu</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/emp/dashboard" && pathname.startsWith(item.href));
                const badge = item.id === "applicants" ? newApplicantCount : 0;
                return (
                  <button
                    key={item.id}
                    className={`emp-sidebar-link${isActive ? " active" : ""}`}
                    onClick={() => { router.push(item.href); setSidebarOpen(false); }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {badge > 0 && (
                      <span style={{ marginLeft: "auto", background: "#E5484D", color: "#fff", borderRadius: 20, minWidth: 20, height: 20, padding: "0 6px", fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Logout */}
          <div style={{ padding: "12px 12px", borderTop: "1px solid #EFF1F5" }}>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 14px", borderRadius: 10, border: "none", background: "transparent", cursor: loggingOut ? "not-allowed" : "pointer", color: "#E5484D", fontSize: 14, fontWeight: 600, transition: "background 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#FDECEC")}
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
          <header className="emp-topbar" style={{ height: 64, background: "#fff", borderBottom: "1px solid #E2E5EC", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0, zIndex: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
              {/* Mobile hamburger */}
              <button
                className="emp-topbar-btn emp-hamburger"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation menu"
                aria-expanded={sidebarOpen}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
              <h1 className="emp-page-title" style={{ fontSize: 20, fontWeight: 800, color: "#141821", letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pageTitle}</h1>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Notifications */}
              <div style={{ position: "relative" }}>
                <button className="emp-topbar-btn" onClick={() => setNotifOpen(!notifOpen)} style={{ position: "relative" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                  {unreadCount > 0 && (
                    <span style={{ position: "absolute", top: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: "#E5484D", color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #fff" }}>
                      {unreadCount}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <>
                    <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setNotifOpen(false)} />
                    <div className="emp-notif-panel" style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: "#fff", border: "1px solid #E2E5EC", borderRadius: 16, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)", zIndex: 50, width: 320, overflow: "hidden" }}>
                      <div style={{ padding: "12px 16px", borderBottom: "1px solid #EFF1F5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#141821" }}>Notifications</span>
                        {unreadCount > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: "#1B5CBF" }}>{unreadCount} unread</span>
                        )}
                      </div>
                      <div style={{ maxHeight: 280, overflowY: "auto" }}>
                        {notifications.length === 0 ? (
                          <div style={{ padding: "24px 16px", textAlign: "center", color: "#9AA1B1", fontSize: 13 }}>
                            No notifications yet
                          </div>
                        ) : (
                          notifications.map((notif) => {
                            let text = "";
                            let bg = "#F7F8FA";
                            if (notif.type === "job_expiring") {
                              text = `Your job post "${notif.job_title}" has 2 days left. Extend it before it goes offline!`;
                              bg = "#fffbeb";
                            } else if (notif.type === "subscription_expired") {
                              text = `Your subscription has expired. Your existing job posts stay live until their own deadline, but new applicants are locked until you renew.`;
                              bg = "#FDECEC";
                            } else if (notif.type === "subscription_expiring") {
                              text = `Your subscription has a day left. Once it ends, you won't be able to post new jobs until you renew.`;
                              bg = "#fffbeb";
                            } else if (notif.type === "broadcast") {
                              text = notif.job_title;
                              bg = "#f5f3ff";
                            } else if (notif.type === "posted_for_you") {
                              // An admin typed this vacancy on the employer's
                              // behalf. Told plainly, because a job appearing
                              // under their name that they never posted is
                              // otherwise alarming rather than helpful.
                              text = `JobsAddis posted "${notif.job_title}" for you. It's live now — tap to see it and its applicants.`;
                              bg = "#EEF3FC";
                            } else {
                              text = `Someone applied to your "${notif.job_title}" position.`;
                              bg = "#EEF3FC";
                            }
                            return (
                              <div
                                key={notif.id}
                                onClick={() => {
                                  setNotifOpen(false);
                                  // A click is stronger evidence of "seen" than the
                                  // open-and-wait timer, and navigating away right after
                                  // opening cancels that timer before it fires -- so mark
                                  // read immediately rather than leaving it to that alone.
                                  setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                                  runSilently(() => markAllNotificationsAsRead()).catch((e) =>
                                    console.error("Failed to mark notifications read", e)
                                  );
                                  if (notif.type === "new_applicant" || notif.type === "job_expiring") {
                                    router.push(notif.job_id ? `/emp/dashboard/applicants?job=${notif.job_id}` : "/emp/dashboard/jobs");
                                  } else if (notif.type === "posted_for_you") {
                                    router.push("/emp/dashboard/jobs");
                                  } else if (notif.type === "subscription_expiring" || notif.type === "subscription_expired") {
                                    router.push("/emp/dashboard/billing");
                                  }
                                }}
                                style={{
                                  padding: "12px 16px",
                                  borderBottom: "1px solid #EFF1F5",
                                  fontSize: 13,
                                  color: "#343A46",
                                  cursor: "pointer",
                                  background: bg,
                                  transition: "background 0.15s",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#EFF1F5")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = bg)}
                              >
                                <p style={{ margin: 0, lineHeight: 1.4, fontWeight: 600 }}>{text}</p>
                                <span style={{ fontSize: 10, color: "#9AA1B1", marginTop: 4, display: "block" }}>
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
                  className="emp-profile-btn"
                  onClick={handleToggleProfile}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px 6px 6px", borderRadius: 10, border: "1px solid #E2E5EC", background: "#fff", cursor: "pointer", transition: "border-color 0.15s" }}
                >
                  <EmployerAvatar name={session?.businessName || "?"} logoUrl={session?.logoUrl} size={30} radius={8} fontSize={13} />
                  <div className="emp-profile-meta" style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#141821", lineHeight: 1 }}>{session?.businessName || "Employer"}</div>
                    <div style={{ fontSize: 10, color: "#9AA1B1", marginTop: 2 }}>{session?.businessType || "Company"}</div>
                  </div>
                  <svg className="emp-profile-caret" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9AA1B1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </button>

                {profileOpen && (
                  <>
                    <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setProfileOpen(false)} />
                    <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: "#fff", border: "1px solid #E2E5EC", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 50, minWidth: 180, overflow: "hidden" }}>
                      <div style={{ padding: "12px 14px", borderBottom: "1px solid #EFF1F5" }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#141821", margin: 0 }}>{session?.businessName}</p>
                        <p style={{ fontSize: 11, color: "#9AA1B1", margin: "2px 0 0 0" }}>TG: {session?.telegramId}</p>
                      </div>

                      {accounts.length > 1 && (
                        <div style={{ borderBottom: "1px solid #EFF1F5", padding: "6px 0" }}>
                          {accounts.map((acc) => {
                            const isActive = acc.employerId === session?.employerId;
                            return (
                              <div
                                key={acc.employerId}
                                onClick={() => handleSwitchAccount(acc.employerId)}
                                style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 14px", cursor: isActive || switchingAccount ? "default" : "pointer", background: isActive ? "#f0f9ff" : "transparent" }}
                              >
                                <EmployerAvatar name={acc.businessName || "?"} logoUrl={acc.logoUrl} size={26} radius={7} fontSize={11} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 12.5, fontWeight: 600, color: "#141821", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{acc.businessName}</div>
                                </div>
                                {isActive ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1B5CBF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                ) : (
                                  <button
                                    onClick={(e) => handleRemoveAccount(e, acc.employerId)}
                                    title="Sign out of this account"
                                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "#CBD0DA", padding: 2, display: "flex", flexShrink: 0 }}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <button
                        onClick={() => { setProfileOpen(false); router.push("/emp"); }}
                        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#1B5CBF", borderBottom: "1px solid #EFF1F5" }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Add Another Account
                      </button>
                      <button
                        onClick={() => { setProfileOpen(false); router.push("/emp/dashboard/profile"); }}
                        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#343A46" }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        Company Profile
                      </button>
                      <button
                        onClick={handleLogout}
                        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 500, color: "#E5484D", borderTop: "1px solid #EFF1F5" }}
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
          <main className="emp-main" style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
