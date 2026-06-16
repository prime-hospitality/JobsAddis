"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, LazyMotion, domAnimation } from "framer-motion";
import { Bell, Briefcase, CheckCircle, Clock, ExternalLink, Settings, Search, X, Check, Sparkles } from "lucide-react";
import { fetchNotifications, markNotificationsRead, fetchProfile, updateAlertCategories, Notification } from "@/lib/api";
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

const CATEGORY_ITEMS = [
  { name: "Waiter", emoji: "🍽️" },
  { name: "Chef", emoji: "👨‍🍳" },
  { name: "Barista", emoji: "☕" },
  { name: "Receptionist", emoji: "🛎️" },
  { name: "Housekeeper", emoji: "🧹" },
  { name: "Security", emoji: "🛡️" },
  { name: "Cashier", emoji: "💳" },
  { name: "Cook", emoji: "🍳" },
  { name: "Delivery", emoji: "🛵" },
  { name: "Driver", emoji: "🚗" },
  { name: "Manager", emoji: "💼" },
  { name: "Marketing & Sales", emoji: "📈" },
  { name: "F&B", emoji: "🍹" },
  { name: "Finance", emoji: "💰" },
  { name: "Cost Control", emoji: "📊" },
  { name: "Accountant", emoji: "🧮" },
  { name: "Bellboy", emoji: "🧳" },
  { name: "Phone Operator", emoji: "📞" },
  { name: "Store Keeper", emoji: "📦" },
  { name: "Maintenance", emoji: "🔧" },
  { name: "IT Officer", emoji: "💻" },
  { name: "Spa Attendant", emoji: "💆" },
  { name: "Gym Trainer", emoji: "🏋️" },
  { name: "Banquet", emoji: "🥂" },
  { name: "Other", emoji: "✨" },
];

export interface NotificationsScreenProps {
  onSelectJob?: (jobId: string) => void;
}

export default function NotificationsScreen({ onSelectJob }: NotificationsScreenProps) {
  const { initData } = useTelegram();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Alert preferences states
  const [alertCategories, setAlertCategories] = useState<string[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tempCategories, setTempCategories] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
        {
          id: "2",
          user_telegram_id: 123,
          company_name: "Sheraton Addis",
          job_title: "Night Security Officer",
          type: "vacancy_alert",
          read: false,
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          job_id: "job-007",
        }
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

  // Load profile alerts preferences
  useEffect(() => {
    async function loadProfile() {
      if (!initData) {
        // Dev mode mock
        setAlertCategories(["Waiter", "Barista"]);
        return;
      }
      try {
        const res = await fetchProfile(initData);
        if (res.success && res.profile) {
          const profileData = res.profile as any;
          const currentAlerts = (profileData.alert_categories && profileData.alert_categories.length > 0)
            ? profileData.alert_categories
            : (profileData.selected_categories || []);
          setAlertCategories(currentAlerts);
        }
      } catch (err) {
        console.error("Failed to load profile for alerts preferences:", err);
      }
    }
    loadProfile();
  }, [initData]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleOpenSettings = () => {
    setTempCategories([...alertCategories]);
    setSearchQuery("");
    setSaveSuccess(false);
    setIsSettingsOpen(true);
  };

  const handleToggleCategory = (catName: string) => {
    setTempCategories(prev => {
      if (prev.includes(catName)) {
        return prev.filter(c => c !== catName);
      } else {
        return [...prev, catName];
      }
    });
  };

  const filteredCategories = CATEGORY_ITEMS.filter(cat => 
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAll = () => {
    const filteredNames = filteredCategories.map(c => c.name);
    setTempCategories(prev => {
      const unique = new Set([...prev, ...filteredNames]);
      return Array.from(unique);
    });
  };

  const handleClearAll = () => {
    const filteredNamesSet = new Set(filteredCategories.map(c => c.name));
    setTempCategories(prev => prev.filter(c => !filteredNamesSet.has(c)));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      if (initData) {
        await updateAlertCategories(initData, tempCategories);
      }
      setAlertCategories(tempCategories);
      setSaveSuccess(true);
      setTimeout(() => {
        setIsSettingsOpen(false);
        setSaveSuccess(false);
      }, 1000);
    } catch (err) {
      console.error("Failed to save alert preferences:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <LazyMotion features={domAnimation}>
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflowY: "auto", paddingBottom: 96 }}>
        {/* Header */}
        <div className="safe-screen-top" style={{ padding: "0 20px 20px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>Notifications</h1>
          <button 
            onClick={handleOpenSettings}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-primary)"
            }}
          >
            <Settings size={20} />
          </button>
        </div>

        {/* Notifications list */}
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
                      background: n.read 
                        ? "var(--card)" 
                        : n.type === "vacancy_alert"
                        ? "rgba(139, 92, 246, 0.08)"
                        : "rgba(5,150,105,0.06)",
                      border: n.read 
                        ? "1px solid var(--border)" 
                        : n.type === "vacancy_alert"
                        ? "1px solid rgba(139, 92, 246, 0.2)"
                        : "1px solid rgba(5,150,105,0.2)",
                      borderRadius: 16, padding: 16,
                      display: "flex", gap: 14, alignItems: "flex-start",
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      background: n.type === "shortlisted" 
                        ? "linear-gradient(135deg, #059669 0%, #047857 100%)" 
                        : n.type === "vacancy_alert"
                        ? "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)"
                        : "var(--surface-elevated)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {n.type === "shortlisted" ? (
                        <CheckCircle size={20} color="#fff" />
                      ) : n.type === "vacancy_alert" ? (
                        <Sparkles size={20} color="#fff" />
                      ) : (
                        <Briefcase size={20} color="var(--text-muted)" />
                      )}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.5, marginBottom: 6 }}>
                        {n.type === "shortlisted" ? (
                          <>You've been <b>shortlisted</b> by <b>{n.company_name}</b> for the <b>{n.job_title}</b> position! They will contact you soon.</>
                        ) : n.type === "vacancy_alert" ? (
                          <>New job opening matching your alert subscription: <b>{n.company_name}</b> is looking for a <b>{n.job_title}</b>.</>
                        ) : (
                          <>Update on your application for <b>{n.job_title}</b> at <b>{n.company_name}</b>.</>
                        )}
                      </p>
                      
                      {n.type === "vacancy_alert" && n.job_id && onSelectJob && (
                        <button
                          onClick={() => onSelectJob(n.job_id!)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            marginTop: 4,
                            marginBottom: 8,
                            padding: "6px 12px",
                            borderRadius: 8,
                            background: "var(--surface-elevated)",
                            border: "1px solid var(--border)",
                            color: "var(--brand)",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          View Job <ExternalLink size={14} />
                        </button>
                      )}

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

        {/* Settings Preferences Bottom Sheet Modal */}
        <AnimatePresence>
          {isSettingsOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => !isSaving && setIsSettingsOpen(false)}
                style={{
                  position: "fixed",
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: "#000",
                  zIndex: 100,
                }}
              />

              {/* Bottom Sheet */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                style={{
                  position: "fixed",
                  bottom: 0, left: 0, right: 0,
                  maxHeight: "85vh",
                  background: "var(--card)",
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  borderTop: "1px solid var(--border)",
                  zIndex: 101,
                  display: "flex",
                  flexDirection: "column",
                  paddingBottom: "env(safe-area-inset-bottom, 24px)",
                }}
              >
                {/* Drag Handle & Header */}
                <div style={{ padding: "16px 20px 8px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ width: 36, height: 4, background: "var(--border)", borderRadius: 2, margin: "0 auto" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>Alert Subscriptions</h2>
                      <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Subscribe to categories to receive vacancy alerts</p>
                    </div>
                    <button 
                      onClick={() => setIsSettingsOpen(false)}
                      disabled={isSaving}
                      style={{
                        background: "var(--surface-elevated)",
                        border: "none",
                        borderRadius: "50%",
                        width: 32, height: 32,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", color: "var(--text-muted)"
                      }}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div style={{ padding: "0 20px 12px 20px" }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: "var(--surface-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: "8px 12px",
                  }}>
                    <Search size={16} color="var(--text-muted)" />
                    <input 
                      type="text"
                      placeholder="Search categories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        background: "none", border: "none", outline: "none",
                        width: "100%", fontSize: 14, color: "var(--text-primary)"
                      }}
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery("")}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Selection Actions */}
                <div style={{ padding: "0 20px 12px 20px", display: "flex", gap: 10 }}>
                  <button 
                    onClick={handleSelectAll}
                    style={{
                      background: "none", border: "none", color: "var(--brand)",
                      fontSize: 13, fontWeight: 700, cursor: "pointer"
                    }}
                  >
                    Select All
                  </button>
                  <span style={{ color: "var(--border)" }}>|</span>
                  <button 
                    onClick={handleClearAll}
                    style={{
                      background: "none", border: "none", color: "var(--text-muted)",
                      fontSize: 13, fontWeight: 600, cursor: "pointer"
                    }}
                  >
                    Clear All
                  </button>
                </div>

                {/* Categories Grid (Scrollable) */}
                <div style={{ 
                  flex: 1, overflowY: "auto", padding: "4px 20px 20px 20px",
                  maxHeight: "40vh"
                }}>
                  {filteredCategories.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: 14 }}>
                      No categories match your search
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {filteredCategories.map(cat => {
                        const isSelected = tempCategories.includes(cat.name);
                        return (
                          <button
                            key={cat.name}
                            onClick={() => handleToggleCategory(cat.name)}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 6,
                              padding: "8px 12px", borderRadius: 12,
                              fontSize: 13, fontWeight: 600,
                              cursor: "pointer", border: "1px solid",
                              background: isSelected ? "var(--brand)" : "var(--surface-elevated)",
                              color: isSelected ? "#fff" : "var(--text-primary)",
                              borderColor: isSelected ? "var(--brand)" : "var(--border)",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <span>{cat.emoji}</span>
                            <span>{cat.name}</span>
                            {isSelected && <Check size={14} color="#fff" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
                  <button
                    onClick={handleSaveSettings}
                    disabled={isSaving || saveSuccess}
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: 12,
                      background: saveSuccess ? "#10B981" : "var(--brand)",
                      border: "none",
                      color: "#fff",
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: (isSaving || saveSuccess) ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      opacity: isSaving ? 0.8 : 1,
                      transition: "background 0.2s"
                    }}
                  >
                    {isSaving ? (
                      "Saving Preferences..."
                    ) : saveSuccess ? (
                      <>
                        <Check size={18} /> Preferences Saved
                      </>
                    ) : (
                      "Save Preferences"
                    )}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </LazyMotion>
  );
}
