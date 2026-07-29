"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence, LazyMotion, domAnimation } from "framer-motion";
import { Bell, Briefcase, CheckCircle, Clock, ExternalLink, Settings, ChevronDown, X, Check, Sparkles } from "lucide-react";
import { fetchNotifications, markNotificationsRead, fetchProfile, updateAlertCategories, Notification } from "@/lib/api";
import { useTelegram } from "@/hooks/useTelegram";
import { useT, timeAgo } from "@/lib/i18n";
import { categoryLabel, categoryMatches, YEARS_OPTIONS, minYearsLabel } from "@/lib/vocabulary";
import { JOB_ROLE_NAMES } from "@/data/job-categories";

// Alerts fire by comparing these against jobs.category, so they have to be the
// same role names employers post under. This was a separate hand-kept copy that
// had drifted — it listed "Reception", which is not a role any job can have.
const CATEGORY_NAMES = JOB_ROLE_NAMES;

// Caps how much experience an alerted job may ask for. Compared numerically
// against jobs.min_years_experience -- the old version matched two different
// label vocabularies with string equality, so most preferences matched nothing.
const EXPERIENCE_LEVELS = YEARS_OPTIONS;

export interface NotificationsScreenProps {
  onSelectJob?: (jobId: string) => void;
  isEmployer?: boolean; // Used internally to filter/route notifications by role. Not rendered in UI.
}

export default function NotificationsScreen({ onSelectJob, isEmployer = false }: NotificationsScreenProps) {
  const t = useT();
  const { initData } = useTelegram();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Saved preferences
  const [alertCategories, setAlertCategories] = useState<string[]>([]);
  const [alertExpLevel, setAlertExpLevel] = useState<number | null>(null);

  // Modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Temp state inside modal
  const [tempCategories, setTempCategories] = useState<string[]>([]);
  const [tempExpLevel, setTempExpLevel] = useState<number | null>(null);

  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");
  const [shakeId, setShakeId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    if (!initData) {
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
      if (res.notifications.some(n => !n.read)) {
        markNotificationsRead(initData).catch(console.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [initData]);

  // Load saved preferences from profile
  useEffect(() => {
    async function loadProfile() {
      if (!initData) return;
      try {
        const res = await fetchProfile(initData);
        if (res.success && res.profile) {
          const p = res.profile as any;
          const cats = (p.alert_categories && p.alert_categories.length > 0)
            ? p.alert_categories
            : (p.selected_categories || []);
          setAlertCategories(cats);
          setAlertExpLevel(p.alert_max_years ?? null);
        }
      } catch (err) {
        console.error("Failed to load profile for alerts preferences:", err);
      }
    }
    loadProfile();
  }, [initData]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpenSettings = () => {
    setTempCategories([...alertCategories]);
    setTempExpLevel(alertExpLevel);
    setDropdownSearch("");
    setIsDropdownOpen(false);
    setSaveSuccess(false);
    setIsSettingsOpen(true);
  };

  const handleToggleCategory = (catName: string) => {
    setTempCategories(prev => {
      if (prev.includes(catName)) {
        return prev.filter(c => c !== catName);
      } else {
        if (prev.length >= 3) {
          setShakeId(catName);
          setTimeout(() => setShakeId(null), 500);
          return prev;
        }
        return [...prev, catName];
      }
    });
  };

  const handleRemoveCategory = (catName: string) => {
    setTempCategories(prev => prev.filter(c => c !== catName));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      if (initData) {
        await updateAlertCategories(initData, tempCategories, tempExpLevel);
      }
      setAlertCategories(tempCategories);
      setAlertExpLevel(tempExpLevel);
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

  const filteredDropdownItems = CATEGORY_NAMES.filter(n =>
    categoryMatches(n, dropdownSearch) && !tempCategories.includes(n)
  );

  return (
    <LazyMotion features={domAnimation}>
      <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflowY: "auto", paddingBottom: 96 }}>
        {/* Header */}
        <div className="safe-screen-top" style={{ padding: "0 20px 20px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{t("notifications.title")}</h1>
          <button
            onClick={handleOpenSettings}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              width: 40, height: 40,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "var(--text-primary)"
            }}
          >
            <Settings size={20} />
          </button>
        </div>

        {/* Subscribed Alerts Summary */}
        <div style={{ padding: "0 20px 16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("notifications.yourAlerts")}</h2>
            <span style={{ fontSize: 12, color: "var(--brand)", fontWeight: 600 }}>{t("notifications.activeCount", { count: alertCategories.length })}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {alertCategories.length > 0 ? (
              <>
                {alertCategories.map(cat => (
                  <div key={cat} style={{ background: "rgba(139, 92, 246, 0.1)", color: "var(--brand)", padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                    {categoryLabel(cat, t.lang)}
                  </div>
                ))}
                {alertExpLevel != null && (
                  <div style={{ background: "rgba(139, 92, 246, 0.06)", color: "var(--text-secondary)", padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 500, border: "1px solid var(--border)" }}>
                    {minYearsLabel(alertExpLevel, t)}
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{t("notifications.noAlerts")}</div>
            )}
          </div>
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
              <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{t("notifications.allCaughtUp")}</p>
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
                        {n.type === "shortlisted"
                          ? t.node("notifications.bodyShortlisted", { company: n.company_name, job: n.job_title })
                          : n.type === "vacancy_alert"
                          ? t.node("notifications.bodyVacancyAlert", { company: n.company_name, job: n.job_title })
                          : t.node("notifications.bodyDefault", { company: n.company_name, job: n.job_title })}
                      </p>

                      {n.type === "vacancy_alert" && n.job_id && onSelectJob && (
                        <button
                          onClick={() => onSelectJob(n.job_id!)}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            marginTop: 4, marginBottom: 8,
                            padding: "6px 12px", borderRadius: 8,
                            background: "var(--surface-elevated)",
                            border: "1px solid var(--border)",
                            color: "var(--brand)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                          }}
                        >
                          {t("notifications.viewJob")} <ExternalLink size={14} />
                        </button>
                      )}

                      <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={12} /> {timeAgo(n.created_at, t.lang)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>

        {/* Settings Bottom Sheet */}
        <AnimatePresence>
          {isSettingsOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
                onClick={() => !isSaving && setIsSettingsOpen(false)}
                style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "#000", zIndex: 100 }}
              />

              {/* Sheet */}
              <motion.div
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                style={{
                  position: "fixed", bottom: 0, left: 0, right: 0,
                  maxHeight: "88vh",
                  background: "var(--card)",
                  borderTopLeftRadius: 24, borderTopRightRadius: 24,
                  borderTop: "1px solid var(--border)",
                  zIndex: 101, display: "flex", flexDirection: "column",
                  paddingBottom: "env(safe-area-inset-bottom, 24px)",
                }}
              >
                {/* Handle & Header */}
                <div style={{ padding: "16px 20px 16px 20px", display: "flex", flexDirection: "column", gap: 12, borderBottom: "1px solid var(--border)" }}>
                  <div style={{ width: 36, height: 4, background: "var(--border)", borderRadius: 2, margin: "0 auto" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>{t("notifications.settingsTitle")}</h2>
                      <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{t("notifications.settingsSubtitle")}</p>
                    </div>
                    <button
                      onClick={() => !isSaving && setIsSettingsOpen(false)}
                      style={{ background: "var(--surface-elevated)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-muted)" }}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Scrollable body */}
                <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 0 20px" }}>

                  {/* ── Category Dropdown ── */}
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                    {t("notifications.jobCategories")} <span style={{ color: "var(--text-muted)", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>{t("notifications.upToThree")}</span>
                  </p>

                  {/* Selected chips inside input */}
                  <div ref={dropdownRef} style={{ position: "relative" }}>
                    <div
                      onClick={() => setIsDropdownOpen(v => !v)}
                      style={{
                        display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6,
                        minHeight: 48, padding: "8px 12px",
                        background: "var(--surface-elevated)",
                        border: `1px solid ${isDropdownOpen ? "var(--brand)" : "var(--border)"}`,
                        borderRadius: isDropdownOpen ? "12px 12px 0 0" : 12,
                        cursor: "pointer",
                        transition: "border-color 0.15s",
                      }}
                    >
                      {tempCategories.length === 0 && (
                        <span style={{ fontSize: 14, color: "var(--text-muted)", flex: 1 }}>{t("notifications.selectCategories")}</span>
                      )}
                      {tempCategories.map(cat => (
                        <span
                          key={cat}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            background: "var(--brand)", color: "#fff",
                            padding: "3px 8px 3px 10px", borderRadius: 6,
                            fontSize: 12, fontWeight: 600,
                          }}
                        >
                          {categoryLabel(cat, t.lang)}
                          <button
                            onClick={e => { e.stopPropagation(); handleRemoveCategory(cat); }}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.8)", display: "flex", padding: 0, lineHeight: 1 }}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                      <span style={{ marginLeft: "auto", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
                        <ChevronDown size={16} style={{ transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                      </span>
                    </div>

                    {/* Dropdown list */}
                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          style={{
                            position: "absolute", left: 0, right: 0, top: "100%",
                            background: "var(--card)",
                            border: "1px solid var(--brand)",
                            borderTop: "none",
                            borderRadius: "0 0 12px 12px",
                            zIndex: 200,
                            overflow: "hidden",
                          }}
                        >
                          {/* Search inside dropdown */}
                          <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
                            <input
                              type="text"
                              placeholder={t("notifications.searchPlaceholder")}
                              value={dropdownSearch}
                              onChange={e => setDropdownSearch(e.target.value)}
                              onClick={e => e.stopPropagation()}
                              style={{
                                width: "100%", background: "none", border: "none", outline: "none",
                                fontSize: 13, color: "var(--text-primary)",
                              }}
                            />
                          </div>

                          {/* Scrollable list - limited height */}
                          <div style={{ maxHeight: 200, overflowY: "auto" }}>
                            {filteredDropdownItems.length === 0 ? (
                              <div style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
                                {tempCategories.length >= 3 ? t("notifications.maxSelected") : t("notifications.noResults")}
                              </div>
                            ) : (
                              filteredDropdownItems.map(name => (
                                <motion.button
                                  key={name}
                                  animate={shakeId === name ? { x: [-4, 4, -4, 4, 0] } : {}}
                                  transition={{ duration: 0.3 }}
                                  onClick={e => { e.stopPropagation(); handleToggleCategory(name); }}
                                  style={{
                                    width: "100%", textAlign: "left",
                                    padding: "11px 16px",
                                    background: "none", border: "none",
                                    borderBottom: "1px solid var(--border)",
                                    fontSize: 14, color: "var(--text-primary)",
                                    cursor: tempCategories.length >= 3 ? "not-allowed" : "pointer",
                                    opacity: tempCategories.length >= 3 ? 0.45 : 1,
                                    fontFamily: "inherit",
                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                  }}
                                >
                                  {categoryLabel(name, t.lang)}
                                  {tempCategories.length >= 3 && (
                                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("notifications.maxReached")}</span>
                                  )}
                                </motion.button>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* ── Experience Level Radio Group ── */}
                  <div style={{ marginTop: isDropdownOpen ? 220 : 24 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                      {t("notifications.experienceLevel")}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {EXPERIENCE_LEVELS.map(level => {
                        const isSelected = tempExpLevel === level;
                        return (
                          <button
                            key={level}
                            onClick={() => setTempExpLevel(isSelected ? null : level)}
                            style={{
                              display: "flex", alignItems: "center", gap: 14,
                              padding: "13px 16px", borderRadius: 12,
                              background: isSelected ? "rgba(139, 92, 246, 0.07)" : "transparent",
                              border: isSelected ? "1px solid rgba(139, 92, 246, 0.25)" : "1px solid transparent",
                              cursor: "pointer", fontFamily: "inherit",
                              transition: "all 0.15s ease",
                              textAlign: "left",
                            }}
                          >
                            {/* Radio button */}
                            <div style={{
                              width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                              border: isSelected ? "6px solid var(--brand)" : "2px solid var(--border)",
                              background: "transparent",
                              transition: "all 0.15s ease",
                            }} />
                            <div>
                              <p style={{ fontSize: 14, fontWeight: isSelected ? 700 : 500, color: isSelected ? "var(--brand)" : "var(--text-primary)", margin: 0 }}>
                                {minYearsLabel(level, t)}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                      {/* No preference option */}
                      <button
                        onClick={() => setTempExpLevel(null)}
                        style={{
                          display: "flex", alignItems: "center", gap: 14,
                          padding: "13px 16px", borderRadius: 12,
                          background: tempExpLevel === null ? "rgba(139, 92, 246, 0.07)" : "transparent",
                          border: tempExpLevel === null ? "1px solid rgba(139, 92, 246, 0.25)" : "1px solid transparent",
                          cursor: "pointer", fontFamily: "inherit",
                          transition: "all 0.15s ease",
                          textAlign: "left",
                        }}
                      >
                        <div style={{
                          width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                          border: tempExpLevel === null ? "6px solid var(--brand)" : "2px solid var(--border)",
                          background: "transparent",
                          transition: "all 0.15s ease",
                        }} />
                        <p style={{ fontSize: 14, fontWeight: tempExpLevel === null ? 700 : 500, color: tempExpLevel === null ? "var(--brand)" : "var(--text-muted)", margin: 0 }}>
                          {t("notifications.anyLevel")}
                        </p>
                      </button>
                    </div>
                  </div>

                  <div style={{ height: 20 }} />
                </div>

                {/* Save Button */}
                <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
                  <button
                    onClick={handleSaveSettings}
                    disabled={isSaving || saveSuccess}
                    style={{
                      width: "100%", padding: "14px", borderRadius: 12,
                      background: saveSuccess ? "#10B981" : "var(--brand)",
                      border: "none", color: "#fff", fontSize: 15, fontWeight: 700,
                      cursor: (isSaving || saveSuccess) ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      opacity: isSaving ? 0.8 : 1,
                      transition: "background 0.2s",
                    }}
                  >
                    {isSaving ? t("notifications.saving") : saveSuccess ? <><Check size={18} /> {t("notifications.saved")}</> : t("notifications.savePreferences")}
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
