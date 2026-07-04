"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, CheckCircle, XCircle, MessageCircle, Sparkles, ExternalLink } from "lucide-react";
import { fetchNotifications, markNotificationsRead, Notification } from "@/lib/api";
import { useTelegram } from "@/hooks/useTelegram";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isEmployer?: boolean; // hidden — used for role-based filtering in the future
  onSelectJob?: (jobId: string) => void;
  onUnreadCleared?: () => void; // callback so parent can clear badge count
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function NotificationIcon({ type }: { type: Notification["type"] }) {
  const base: React.CSSProperties = {
    width: 38, height: 38, borderRadius: 12,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  };

  if (type === "shortlisted") return (
    <div style={{ ...base, background: "rgba(5,150,105,0.12)", border: "1px solid rgba(5,150,105,0.2)" }}>
      <CheckCircle size={18} color="#059669" />
    </div>
  );
  if (type === "rejected") return (
    <div style={{ ...base, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
      <XCircle size={18} color="#EF4444" />
    </div>
  );
  if (type === "vacancy_alert") return (
    <div style={{ ...base, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
      <Sparkles size={18} color="#6366F1" />
    </div>
  );
  return (
    <div style={{ ...base, background: "var(--surface-elevated)", border: "1px solid var(--border)" }}>
      <MessageCircle size={18} color="var(--text-secondary)" />
    </div>
  );
}

function notificationTitle(n: Notification): string {
  if (n.type === "shortlisted") return "You've been shortlisted! 🎉";
  if (n.type === "rejected") return "Application update";
  if (n.type === "vacancy_alert") return "New job match";
  return "New message";
}

function notificationBody(n: Notification): string {
  if (n.type === "shortlisted") return `${n.company_name} shortlisted your application for ${n.job_title}.`;
  if (n.type === "rejected") return `${n.company_name} reviewed your application for ${n.job_title}.`;
  if (n.type === "vacancy_alert") return `${n.company_name} is hiring a ${n.job_title}.`;
  return `Update from ${n.company_name} regarding ${n.job_title}.`;
}

export default function NotificationPanel({ isOpen, onClose, isEmployer = false, onSelectJob, onUnreadCleared }: NotificationPanelProps) {
  const { initData } = useTelegram();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load & mark read when panel opens
  useEffect(() => {
    if (!isOpen || !initData) return;

    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetchNotifications(initData);
        if (res.notifications) {
          // Role filtering (hidden): employers only see employer-type notifications in the future
          // Job seekers only see seeker-type notifications
          // For now show all — the isEmployer flag is wired up for future use
          setNotifications(res.notifications);
        }
      } catch (e) {
        // silent fail
      } finally {
        setIsLoading(false);
      }
    };

    load();

    // Mark all as read after a short delay
    const markTimer = setTimeout(async () => {
      try {
        await markNotificationsRead(initData);
        onUnreadCleared?.();
      } catch {}
    }, 1000);

    return () => clearTimeout(markTimer);
  }, [isOpen, initData]);

  const hasUnread = notifications.some(n => !n.read);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="notif-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0, zIndex: 8000,
              background: "rgba(0,0,0,0.45)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          />

          {/* Slide-up panel */}
          <motion.div
            key="notif-panel"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            style={{
              position: "fixed",
              bottom: 0, left: 0, right: 0,
              zIndex: 8001,
              maxWidth: 480,
              margin: "0 auto",
              height: "78dvh",
              background: "var(--app-bg)",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.25)",
            }}
          >
            {/* Drag handle */}
            <div style={{ width: 40, height: 4, borderRadius: 4, background: "var(--border)", margin: "12px auto 0", flexShrink: 0 }} />

            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px 14px",
              borderBottom: "1px solid var(--border)", flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: "var(--brand-subtle)", border: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Bell size={16} color="var(--brand)" />
                </div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Notifications</p>
                  {hasUnread && (
                    <p style={{ fontSize: 11, color: "var(--brand)", margin: 0, fontWeight: 600 }}>New updates</p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: "var(--surface-elevated)", border: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}
              >
                <X size={16} color="var(--text-muted)" />
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", paddingBottom: "env(safe-area-inset-bottom, 20px)" }}>
              {isLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} className="shimmer" style={{ height: 72, borderRadius: 16 }} />
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div style={{ textAlign: "center", paddingTop: 48 }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: 18,
                    background: "var(--surface-elevated)", border: "1px solid var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 16px",
                  }}>
                    <Bell size={28} color="var(--text-muted)" />
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px" }}>All caught up</p>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                    No notifications yet. Apply to jobs to<br />start receiving updates here.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {notifications.map((n) => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 12,
                        padding: "14px 14px",
                        background: n.read ? "var(--surface-elevated)" : "var(--brand-subtle)",
                        border: `1px solid ${n.read ? "var(--border)" : "rgba(5,150,105,0.2)"}`,
                        borderRadius: 16, cursor: n.job_id ? "pointer" : "default",
                        position: "relative",
                      }}
                      onClick={() => {
                        if (n.job_id && onSelectJob) {
                          onSelectJob(n.job_id);
                          onClose();
                        }
                      }}
                    >
                      <NotificationIcon type={n.type} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", margin: 0, lineHeight: 1.3 }}>
                            {notificationTitle(n)}
                          </p>
                          <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>{timeAgo(n.created_at)}</span>
                        </div>
                        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0 0", lineHeight: 1.5 }}>
                          {notificationBody(n)}
                        </p>
                        {n.job_id && onSelectJob && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
                            <ExternalLink size={11} color="var(--brand)" />
                            <span style={{ fontSize: 11, color: "var(--brand)", fontWeight: 600 }}>View job</span>
                          </div>
                        )}
                      </div>
                      {!n.read && (
                        <div style={{
                          position: "absolute", top: 12, right: 12,
                          width: 8, height: 8, borderRadius: "50%",
                          background: "var(--brand)",
                        }} />
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
