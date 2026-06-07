"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, LazyMotion, domAnimation } from "framer-motion";
import { Bell, Briefcase, CheckCircle, Clock, ExternalLink } from "lucide-react";
import { fetchNotifications, markNotificationsRead, Notification } from "@/lib/api";
import { useTelegram } from "@/hooks/useTelegram";

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

export default function NotificationsScreen() {
  const { initData } = useTelegram();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!initData) {
      // Dev mode mock
      setNotifications([
        {
          id: "1",
          user_telegram_id: 123,
          company_name: "Skylight Hotel",
          job_title: "Senior Waiter",
          type: "shortlisted",
          read: false,
          created_at: new Date().toISOString(),
        },
      ]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetchNotifications(initData);
      setNotifications(res.notifications);
      
      // Mark read in background if any unread
      if (res.notifications.some(n => !n.read)) {
        markNotificationsRead(initData).catch(console.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [initData]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  return (
    <LazyMotion features={domAnimation}>
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflowY: "auto", paddingBottom: 96 }}>
        <div className="safe-screen-top" style={{ padding: "0 20px 20px 20px" }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Notifications</h1>
        </div>

        <div style={{ padding: "0 20px" }}>
          {isLoading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[1, 2].map(i => <div key={i} className="shimmer" style={{ height: 80, borderRadius: 16 }} />)}
            </div>
          )}

          {!isLoading && notifications.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: "var(--card)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Bell size={28} color="var(--text-muted)" />
              </div>
              <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>You're all caught up!</p>
            </div>
          )}

          {!isLoading && notifications.length > 0 && (
            <AnimatePresence>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {notifications.map((n, i) => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    style={{
                      background: n.read ? "var(--card)" : "rgba(5,150,105,0.06)",
                      border: n.read ? "1px solid var(--border)" : "1px solid rgba(5,150,105,0.2)",
                      borderRadius: 16, padding: 16,
                      display: "flex", gap: 14, alignItems: "flex-start",
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      background: n.type === "shortlisted" ? "linear-gradient(135deg, #059669 0%, #047857 100%)" : "var(--surface-elevated)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {n.type === "shortlisted" ? <CheckCircle size={20} color="#fff" /> : <Briefcase size={20} color="var(--text-muted)" />}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.5, marginBottom: 6 }}>
                        {n.type === "shortlisted" ? (
                          <>You've been <b>shortlisted</b> by <b>{n.company_name}</b> for the <b>{n.job_title}</b> position! They will contact you soon.</>
                        ) : (
                          <>Update on your application for <b>{n.job_title}</b> at <b>{n.company_name}</b>.</>
                        )}
                      </p>
                      <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={12} /> {timeAgo(n.created_at)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </LazyMotion>
  );
}
