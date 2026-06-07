"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import { Phone, MapPin, Briefcase, FileText, RefreshCw, CheckCircle, HelpCircle, ShieldCheck, Settings, AlertCircle, Upload, Loader2, Moon, Sun, X, Pencil, Lock } from "lucide-react";
import { fetchProfile as fetchProfileApi, updatePhone, updateSecondaryPhone } from "@/lib/api";
import { formatPhoneForDisplay, normalizePhoneNumber } from "@/lib/phone";
import { useTelegram } from "@/hooks/useTelegram";
import { useCvUpload } from "@/hooks/useCvUpload";
import { supabase } from "@/lib/supabase";

// ── Profile completion helpers ──────────────────────────────────────────────
interface CompletionSection {
  key: string;
  label: string;
  done: boolean;
  weight: number;
}

function getCompletionSections(profile: Profile): CompletionSection[] {
  return [
    {
      key: "personal",
      label: "Personal information incomplete",
      done: !!(profile.full_name && profile.age && profile.location),
      weight: 20,
    },
    {
      key: "contact",
      label: "Contact number not shared",
      done: !!(profile.contact_shared || profile.phone_number),
      weight: 20,
    },
    {
      key: "roles",
      label: "No job roles selected",
      done: !!(profile.selected_categories && profile.selected_categories.length > 0),
      weight: 20,
    },
    {
      key: "experience",
      label: "Experience levels not set",
      done: !!(profile.selected_categories && profile.selected_categories.length > 0 &&
        profile.selected_categories.every((c) => !!profile.experience_levels?.[c])),
      weight: 20,
    },
    {
      key: "cv",
      label: "Resume (CV) not uploaded",
      done: !!(profile.cv_url),
      weight: 20,
    },
  ];
}

function getCompletionScore(sections: CompletionSection[]) {
  return sections.reduce((acc, s) => acc + (s.done ? s.weight : 0), 0);
}

interface Profile {
  id: string;
  telegram_id: number;
  full_name: string;
  age: number;
  gender: "male" | "female" | string | null;
  location: string;
  willing_to_relocate: boolean;
  phone_number: string | null;
  secondary_phone: string | null;
  contact_shared: boolean;
  selected_categories: string[];
  experience_levels: Record<string, string>;
  cv_url: string | null;
  created_at: string;
}

export default function ProfileScreen() {
  const { user, initData } = useTelegram();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [privacyDismissed, setPrivacyDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem("profile_privacy_dismissed") === "true"; } catch { return false; }
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  
  // Primary Phone States
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);

  // Secondary Phone States
  const [secondaryPhoneModalOpen, setSecondaryPhoneModalOpen] = useState(false);
  const [secondaryPhoneInput, setSecondaryPhoneInput] = useState("");
  const [secondaryPhoneLoading, setSecondaryPhoneLoading] = useState(false);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const openPhoneModal = () => {
    const displayVal = formatPhoneForDisplay(profile?.phone_number);
    setPhoneInput(displayVal === "Not set" ? "" : displayVal);
    setPhoneModalOpen(true);
  };

  const handleSaveManualPhone = async () => {
    const cleaned = phoneInput.trim();
    if (!cleaned) { showToast("error", "Please enter a phone number."); return; }
    
    const formatted = normalizePhoneNumber(cleaned);
    if (!formatted) {
      showToast("error", "Invalid phone number. Use 09XXXXXXXX or 07XXXXXXXX.");
      return;
    }

    setPhoneLoading(true);
    try {
      await updatePhone(initData, formatted);
      // Optimistically update local state immediately so it shows in the UI
      setProfile((prev) => prev ? { ...prev, phone_number: formatted, contact_shared: true } : prev);
      setPhoneModalOpen(false);
      showToast("success", "Phone number saved successfully!");
      fetchProfile(); // background refresh to sync with DB
    } catch (err: any) {
      showToast("error", err.message || "Failed to save phone number.");
    } finally {
      setPhoneLoading(false);
    }
  };

  const openSecondaryPhoneModal = () => {
    const displayVal = formatPhoneForDisplay(profile?.secondary_phone);
    setSecondaryPhoneInput(displayVal === "Not set" ? "" : displayVal);
    setSecondaryPhoneModalOpen(true);
  };

  const handleSaveSecondaryPhone = async () => {
    const cleaned = secondaryPhoneInput.trim();
    setSecondaryPhoneLoading(true);
    try {
      if (!cleaned) {
        // Remove secondary phone
        await updateSecondaryPhone(initData, null);
        // Optimistically clear from local state
        setProfile((prev) => prev ? { ...prev, secondary_phone: null } : prev);
        setSecondaryPhoneModalOpen(false);
        showToast("success", "Secondary phone number removed.");
        fetchProfile(); // background refresh
        return;
      }
      
      const formatted = normalizePhoneNumber(cleaned);
      if (!formatted) {
        showToast("error", "Invalid phone number. Use 09XXXXXXXX or 07XXXXXXXX.");
        setSecondaryPhoneLoading(false);
        return;
      }

      await updateSecondaryPhone(initData, formatted);
      // Optimistically update local state immediately so it shows in the UI
      setProfile((prev) => prev ? { ...prev, secondary_phone: formatted } : prev);
      setSecondaryPhoneModalOpen(false);
      showToast("success", "Secondary phone number saved successfully!");
      fetchProfile(); // background refresh to sync with DB
    } catch (err: any) {
      showToast("error", err.message || "Failed to save secondary phone number.");
    } finally {
      setSecondaryPhoneLoading(false);
    }
  };

  const [isDark, setIsDark] = useState<boolean>(() => {
    try { return localStorage.getItem("theme") === "dark"; } catch { return false; }
  });

  const applyTheme = (dark: boolean) => {
    setIsDark(dark);
    try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch {}
    if (dark) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    // Notify the useTelegram hook to update native chrome bars
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("themeToggle"));
    }
  };

  const dismissPrivacy = () => {
    setPrivacyDismissed(true);
    try { localStorage.setItem("profile_privacy_dismissed", "true"); } catch {}
  };
  const restorePrivacy = () => {
    setPrivacyDismissed(false);
    try { localStorage.removeItem("profile_privacy_dismissed"); } catch {}
  };

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // No real Telegram session — can't securely fetch profile
    if (!initData) {
      setError("Open the app inside Telegram to view your profile.");
      setIsLoading(false);
      return;
    }

    try {
      const result = await fetchProfileApi(initData);
      if (!result.profile) {
        setError("Profile not found. Please complete registration.");
      } else {
        setProfile(result.profile as unknown as Profile);
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      setError("Could not load your profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [initData]);

  useEffect(() => {
    fetchProfile();

    // Listen for background CV upload success so we can refetch
    const handleCvSuccess = () => fetchProfile();
    window.addEventListener("cvUploadSuccess", handleCvSuccess);

    // Listen for CV upload toast events from useCvUpload hook
    const handleCvToast = (e: Event) => {
      const { type, message } = (e as CustomEvent).detail;
      showToast(type, message);
    };
    window.addEventListener("cvToast", handleCvToast);

    return () => {
      window.removeEventListener("cvUploadSuccess", handleCvSuccess);
      window.removeEventListener("cvToast", handleCvToast);
    };
  }, [fetchProfile]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isUploadingCv, cvUploadError, uploadCv } = useCvUpload();

  const triggerCvUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadCv(e.target.files[0]);
    }
  };

  const handleShareContact = async () => {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg && tg.requestContact) {
        tg.requestContact(async (shared: boolean, data: any) => {
          if (shared) {
            let phone = data?.contact?.phone_number || data?.phone_number || "";
            if (phone && !phone.startsWith("+")) {
              phone = "+" + phone;
            }
            if (profile?.telegram_id) {
              setIsLoading(true);
              try {
                const { error } = await supabase
                  .from("profiles")
                  .update({ contact_shared: true, phone_number: phone })
                  .eq("telegram_id", profile.telegram_id);
                if (error) throw error;
                await fetchProfile();
                showToast("success", "Phone number shared successfully!");
              } catch (err: any) {
                console.error("Error updating phone:", err);
                showToast("error", "Failed to save phone number.");
              } finally {
                setIsLoading(false);
              }
            }
          }
        });
      } else {
        showToast("error", "This feature is only available inside Telegram.");
      }
    } catch (e) {
      console.warn("Telegram SDK requestContact error:", e);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <LazyMotion features={domAnimation}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100dvh",
          background: "transparent",
          overflowY: "auto",
          paddingBottom: 96,
        }}
      >
        {/* ── Toast Notification ── */}
        <AnimatePresence>
          {toast && (
            <motion.div
              key="toast"
              initial={{ opacity: 0, y: -80, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -80, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              style={{
                position: "fixed",
                top: "max(24px, env(safe-area-inset-top, 0px))",
                left: 20,
                right: 20,
                zIndex: 9999,
                maxWidth: 380,
                margin: "0 auto",
                background: toast.type === "success"
                  ? "linear-gradient(135deg, rgba(5,150,105,0.97) 0%, rgba(4,120,87,0.97) 100%)"
                  : "linear-gradient(135deg, rgba(220,38,38,0.97) 0%, rgba(185,28,28,0.97) 100%)",
                borderRadius: 18,
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                boxShadow: toast.type === "success"
                  ? "0 8px 32px rgba(5,150,105,0.45), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)"
                  : "0 8px 32px rgba(220,38,38,0.45), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
                backdropFilter: "blur(12px)",
              }}
            >
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.08 }}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {toast.type === "success" ? (
                  <CheckCircle size={20} color="#fff" />
                ) : (
                  <AlertCircle size={20} color="#fff" />
                )}
              </motion.div>
              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#fff",
                  lineHeight: 1.3,
                  margin: 0,
                }}>
                  {toast.type === "success" ? "Success!" : "Something went wrong"}
                </p>
                <p style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.82)",
                  marginTop: 2,
                  lineHeight: 1.4,
                }}>
                  {toast.message}
                </p>
              </div>
              {/* Progress bar */}
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: 3.5, ease: "linear" }}
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  borderRadius: "0 0 18px 18px",
                  background: "rgba(255,255,255,0.35)",
                  transformOrigin: "left",
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
        {/* Header */}
        <div className="safe-screen-top" style={{ paddingLeft: 20, paddingRight: 20, paddingBottom: 20, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", marginBottom: 4 }}>
                My Profile
              </h1>
              <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                Manage your job seeker profile
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={fetchProfile}
              style={{
                width: 38, height: 38, borderRadius: 12,
                background: "var(--surface-elevated)",
                border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={16} color="var(--text-secondary)" />
            </motion.button>
          </div>
        </div>

        <div style={{ padding: "0 20px" }}>
          {/* Loading state */}
          {isLoading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="shimmer" style={{ height: 110, borderRadius: 20 }} />
              <div className="shimmer" style={{ height: 260, borderRadius: 16 }} />
            </div>
          )}

          {/* Error state */}
          {!isLoading && error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 14, padding: 20, textAlign: "center",
              }}
            >
              <p style={{ color: "#FCA5A5", fontSize: 14, marginBottom: 12 }}>{error}</p>
              <button
                onClick={fetchProfile}
                style={{
                  fontSize: 13, fontWeight: 600, color: "var(--brand)",
                  background: "none", border: "none", cursor: "pointer",
                }}
              >
                Try again
              </button>
            </motion.div>
          )}

          {/* Profile Details */}
          {!isLoading && !error && profile && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              {(() => {
                const sections = getCompletionSections(profile);
                const score = getCompletionScore(sections);
                const incomplete = sections.filter((s) => !s.done);
                const isFullyDone = score === 100;
                return (
                  <>
                    {/* ── Avatar / name card ── */}
                    <div
                      style={{
                        background: "linear-gradient(135deg, var(--surface-elevated) 0%, var(--card) 100%)",
                        border: "1px solid var(--border)",
                        borderRadius: 20,
                        padding: 20,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 16,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        {/* Avatar */}
                        <div
                          style={{
                            width: 60, height: 60, borderRadius: "50%",
                            background: profile.gender === "female"
                              ? "linear-gradient(135deg, #059669 0%, #0D9488 100%)"
                              : profile.gender === "male"
                              ? "linear-gradient(135deg, #047857 0%, #065F46 100%)"
                              : "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 22, fontWeight: 800, color: "#FFFFFF",
                            flexShrink: 0,
                            boxShadow: profile.gender === "female"
                              ? "0 4px 16px rgba(5,150,105,0.35)"
                              : profile.gender === "male"
                              ? "0 4px 16px rgba(4,120,87,0.35)"
                              : "0 4px 16px rgba(16,185,129,0.3)",
                          }}
                        >
                          {profile.gender === "female" ? (
                            <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
                              <circle cx="20" cy="11" r="7" fill="#FFFFFF" />
                              <path d="M20 18v3M12 27c0-3.314 3.582-6 8-6s8 2.686 8 6" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                              <path d="M14 33c0 0 1.5-4 6-4s6 4 6 4" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                              <ellipse cx="20" cy="33" rx="6" ry="3.5" fill="rgba(255,255,255,0.25)"/>
                            </svg>
                          ) : profile.gender === "male" ? (
                            <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
                              <circle cx="20" cy="11" r="7" fill="#FFFFFF" />
                              <path d="M8 38c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none"/>
                            </svg>
                          ) : (
                            getInitials(profile.full_name)
                          )}
                        </div>
                        <div>
                          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginBottom: 2 }}>
                            {profile.full_name}
                          </h2>
                          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, fontWeight: 600 }}>
                            Age: {profile.age} · {profile.willing_to_relocate ? "Willing to relocate" : "Local only"}
                          </p>
                          <span
                            style={{
                              fontSize: 11, fontWeight: 600,
                              color: isFullyDone ? "var(--success)" : "#F59E0B",
                              background: isFullyDone ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
                              border: isFullyDone ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(245,158,11,0.25)",
                              borderRadius: 100, padding: "3px 10px",
                              display: "inline-flex", alignItems: "center", gap: 4
                            }}
                          >
                            {isFullyDone ? (
                              <><CheckCircle size={10} /> Profile Complete</>
                            ) : (
                              <><AlertCircle size={10} /> {score}% Complete</>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Settings button */}
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setSettingsOpen(true)}
                        style={{
                          width: 38, height: 38, borderRadius: 12,
                          background: "var(--surface-elevated)",
                          border: "1px solid var(--border)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        <Settings size={18} color="var(--text-secondary)" />
                      </motion.button>
                    </div>

                    {/* ── Profile Completion Progress Bar ── */}
                    <div
                      style={{
                        background: "var(--card)",
                        border: isFullyDone ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(245,158,11,0.2)",
                        borderRadius: 16,
                        padding: 16,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                          Profile Strength
                        </span>
                        <span style={{
                          fontSize: 13, fontWeight: 800,
                          color: isFullyDone ? "var(--success)" : "#F59E0B",
                        }}>
                          {score}%
                        </span>
                      </div>

                      {/* Track */}
                      <div style={{ height: 8, background: "var(--surface-elevated)", borderRadius: 100, overflow: "hidden" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${score}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          style={{
                            height: "100%",
                            borderRadius: 100,
                            background: isFullyDone
                              ? "linear-gradient(90deg, #4ADE80 0%, #22C55E 100%)"
                              : "linear-gradient(90deg, #F59E0B 0%, #EAB308 100%)",
                          }}
                        />
                      </div>

                    </div>

                    {/* ── Incomplete section nudge cards ── */}
                    {incomplete.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
                          Pending
                        </p>
                        {incomplete.map((s) => {
                          const isCv = s.key === "cv";
                          return (
                            <motion.div
                              key={s.key}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              whileTap={isCv ? { scale: 0.98 } : undefined}
                              onClick={isCv ? triggerCvUpload : undefined}
                              style={{
                                background: "rgba(245,158,11,0.06)",
                                border: "1px solid rgba(245,158,11,0.2)",
                                borderRadius: 10,
                                padding: "11px 14px",
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                cursor: isCv ? "pointer" : "default",
                                transition: "all 0.2s ease",
                              }}
                            >
                              <div style={{
                                width: 6, height: 6, borderRadius: "50%",
                                background: "#F59E0B",
                                flexShrink: 0,
                              }} />
                              <div style={{ flex: 1 }}>
                                <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>
                                  {s.label}
                                </p>
                                {isCv && (
                                  <p style={{ fontSize: 11, color: "#F59E0B", fontWeight: 600, marginTop: 2 }}>
                                    {isUploadingCv ? "Uploading CV..." : "Tap to upload CV"}
                                  </p>
                                )}
                              </div>
                              <span style={{
                                fontSize: 11, fontWeight: 700,
                                color: "#F59E0B",
                                flexShrink: 0,
                              }}>
                                +{s.weight}%
                              </span>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Privacy Notice */}
              <AnimatePresence mode="wait">
                {privacyDismissed ? (
                  /* Collapsed — just a small "i" button */
                  <motion.div
                    key="info-btn"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.18 }}
                    style={{ display: "flex", justifyContent: "flex-end" }}
                  >
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onClick={() => restorePrivacy()}
                      title="Show privacy notice"
                      style={{
                        width: 28, height: 28,
                        borderRadius: "50%",
                        background: "rgba(99,102,241,0.1)",
                        border: "1px solid rgba(99,102,241,0.25)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      <HelpCircle size={14} color="#6366F1" />
                    </motion.button>
                  </motion.div>
                ) : (
                  /* Expanded — full notice with OK button */
                  <motion.div
                    key="privacy-box"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    style={{
                      background: "rgba(99,102,241,0.05)",
                      border: "1px solid rgba(99,102,241,0.18)",
                      borderRadius: 16,
                      padding: "14px 16px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <div style={{ marginTop: 2, background: "rgba(99,102,241,0.12)", borderRadius: "50%", padding: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <ShieldCheck size={18} color="#6366F1" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#6366F1", marginBottom: 4 }}>
                        Only Visible to Employers
                      </p>
                      <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                        Your profile and contact info are strictly confidential. They are only viewable by verified companies, and never by other job seekers.
                      </p>
                    </div>
                    {/* OK button */}
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onClick={() => dismissPrivacy()}
                      style={{
                        flexShrink: 0,
                        alignSelf: "center",
                        height: 26,
                        padding: "0 12px",
                        borderRadius: 100,
                        background: "rgba(99,102,241,0.12)",
                        border: "1px solid rgba(99,102,241,0.3)",
                        color: "#6366F1",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        letterSpacing: "0.03em",
                      }}
                    >
                      OK
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Details sections */}
              <div
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                  padding: "8px 16px",
                }}
              >
                {/* Phone — locked once shared */}
                <div
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "14px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                    <Phone size={14} color="var(--text-secondary)" /> Phone
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 13, color: profile.phone_number ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 600 }}>
                      {formatPhoneForDisplay(profile.phone_number)}
                    </span>
                    {profile.phone_number ? (
                      /* Locked — number already shared, cannot be edited */
                      <span style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        padding: "6px", borderRadius: 8,
                        background: "rgba(245,158,11,0.08)",
                        border: "1px solid rgba(245,158,11,0.2)",
                        color: "#F59E0B",
                      }}>
                        <Lock size={14} />
                      </span>
                    ) : (
                      /* No number yet — allow adding */
                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={openPhoneModal}
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          padding: "6px 12px", borderRadius: 8,
                          background: "var(--surface-elevated)",
                          border: "1px solid var(--border)",
                          cursor: "pointer",
                          fontSize: 12, fontWeight: 600,
                          color: "var(--text-secondary)",
                          fontFamily: "inherit",
                        }}
                      >
                        <Pencil size={11} />
                        Add
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Secondary Phone */}
                <div
                  style={{
                    display: "flex", alignItems: "center",
                    padding: "14px 0",
                    borderBottom: "1px solid var(--border)",
                    gap: 8,
                    overflow: "hidden",
                  }}
                >
                  {/* Label — fixed width, never wraps */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    flexShrink: 0, whiteSpace: "nowrap",
                  }}>
                    <Phone size={14} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
                        2nd Phone
                      </span>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.6, marginTop: -1 }}>
                        optional
                      </span>
                    </div>
                  </div>

                  {/* Value + button — fills remaining space, value truncates if needed */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    flex: 1, minWidth: 0, justifyContent: "flex-end",
                  }}>
                    <span style={{
                      fontSize: 13,
                      color: profile.secondary_phone ? "var(--text-primary)" : "var(--text-muted)",
                      fontWeight: 600,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      flex: 1, minWidth: 0, textAlign: "right",
                    }}>
                      {formatPhoneForDisplay(profile.secondary_phone)}
                    </span>
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onClick={openSecondaryPhoneModal}
                      style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "6px 12px", borderRadius: 8,
                        background: "var(--surface-elevated)",
                        border: "1px solid var(--border)",
                        cursor: "pointer",
                        fontSize: 12, fontWeight: 600,
                        color: "var(--text-secondary)",
                        fontFamily: "inherit",
                        flexShrink: 0,
                      }}
                    >
                      <Pencil size={11} />
                      {profile.secondary_phone ? "Edit" : "Add"}
                    </motion.button>
                  </div>
                </div>

                {/* Location */}
                <div
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "14px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                    <MapPin size={14} color="var(--text-secondary)" /> Location
                  </span>
                  <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>
                    {profile.location}
                  </span>
                </div>

                {/* Experience Map */}
                <div
                  style={{
                    display: "flex", flexDirection: "column",
                    padding: "14px 0",
                    borderBottom: "1px solid var(--border)",
                    gap: 8
                  }}
                >
                  <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                    <Briefcase size={14} color="var(--text-secondary)" /> Roles & Experience
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingLeft: 22 }}>
                    {profile.selected_categories.map((cat) => {
                      const exp = profile.experience_levels[cat] || "Entry Level";
                      return (
                        <div
                          key={cat}
                          style={{
                            background: "var(--surface-elevated)",
                            border: "1px solid var(--border)",
                            borderRadius: 10,
                            padding: "6px 10px",
                            fontSize: 12,
                            color: "var(--text-primary)",
                          }}
                        >
                          <span style={{ fontWeight: 700 }}>{cat}</span>
                          <span style={{ color: "var(--text-secondary)", marginLeft: 6, fontWeight: 500 }}>· {exp}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* CV File */}
                <div
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "14px 0",
                  }}
                >
                  <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                    <FileText size={14} color="var(--text-secondary)" /> Resume (CV)
                  </span>
                  <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    {isUploadingCv ? (
                      <span style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                        <Loader2 size={12} className="animate-spin" /> Uploading...
                      </span>
                    ) : profile.cv_url ? (
                      <>
                        <CheckCircle size={12} color="var(--success)" />
                        <span style={{ textDecoration: "underline", color: "#6366F1", cursor: "pointer" }} onClick={() => profile.cv_url && window.open(profile.cv_url, "_blank")}>
                          View CV
                        </span>
                        <span style={{ color: "var(--text-muted)", fontSize: 11, marginLeft: 2, marginRight: 2 }}>|</span>
                        <span style={{ textDecoration: "underline", color: "var(--text-secondary)", cursor: "pointer" }} onClick={triggerCvUpload}>
                          Change
                        </span>
                      </>
                    ) : (
                      <span style={{ textDecoration: "underline", color: "#6366F1", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }} onClick={triggerCvUpload}>
                        <Upload size={12} /> Upload CV
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
        <input
          type="file"
          ref={fileInputRef}
          accept=".pdf,.doc,.docx"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </div>

      {/* ── Settings Bottom Sheet ── */}
      <AnimatePresence>
        {settingsOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="settings-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSettingsOpen(false)}
              style={{
                position: "fixed", inset: 0, zIndex: 100,
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(4px)",
              }}
            />

            {/* Sheet */}
            <motion.div
              key="settings-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              style={{
                position: "fixed", bottom: 0, left: 0, right: 0,
                zIndex: 101,
                background: "var(--surface)",
                borderRadius: "24px 24px 0 0",
                padding: "0 0 env(safe-area-inset-bottom, 24px)",
                boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
                maxWidth: 480,
                margin: "0 auto",
              }}
            >
              {/* Handle bar */}
              <div style={{
                width: 40, height: 4, borderRadius: 100,
                background: "var(--border)", margin: "12px auto 0",
              }} />

              {/* Header */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "16px 20px 8px",
                borderBottom: "1px solid var(--border)",
              }}>
                <div>
                  <p style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>Settings</p>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>Customize your experience</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setSettingsOpen(false)}
                  style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: "var(--surface-elevated)",
                    border: "1px solid var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", flexShrink: 0,
                  }}
                >
                  <X size={16} color="var(--text-secondary)" />
                </motion.button>
              </div>

              {/* Settings options */}
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>

                {/* Appearance section label */}
                <p style={{
                  fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
                  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4,
                }}>
                  Appearance
                </p>

                {/* Dark / Light toggle row */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "var(--surface-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 16, padding: "14px 16px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* Icon that switches with theme */}
                    <div style={{
                      width: 38, height: 38, borderRadius: 12,
                      background: isDark ? "rgba(99,102,241,0.12)" : "rgba(245,158,11,0.12)",
                      border: `1px solid ${isDark ? "rgba(99,102,241,0.25)" : "rgba(245,158,11,0.25)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {isDark
                        ? <Moon size={18} color="#818CF8" />
                        : <Sun size={18} color="#F59E0B" />
                      }
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                        {isDark ? "Dark Mode" : "Light Mode"}
                      </p>
                      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {isDark ? "Easy on the eyes at night" : "Bright and clear display"}
                      </p>
                    </div>
                  </div>

                  {/* Toggle switch */}
                  <motion.button
                    onClick={() => applyTheme(!isDark)}
                    style={{
                      width: 50, height: 28, borderRadius: 100,
                      background: isDark ? "var(--brand)" : "var(--surface)",
                      border: `1.5px solid ${isDark ? "var(--brand)" : "var(--border)"}`,
                      position: "relative", cursor: "pointer", flexShrink: 0,
                      transition: "background 0.25s ease, border-color 0.25s ease",
                    }}
                  >
                    <motion.div
                      layout
                      animate={{ x: isDark ? 22 : 2 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      style={{
                        position: "absolute", top: 3,
                        width: 20, height: 20, borderRadius: "50%",
                        background: isDark ? "#fff" : "var(--text-muted)",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                      }}
                    />
                  </motion.button>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
        {/* ── Phone Number Modal ── */}
        <AnimatePresence>
          {phoneModalOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                key="phone-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setPhoneModalOpen(false)}
                style={{
                  position: "fixed", inset: 0, zIndex: 9998,
                  background: "rgba(0,0,0,0.55)",
                  backdropFilter: "blur(4px)",
                }}
              />
              {/* Bottom Sheet */}
              <motion.div
                key="phone-sheet"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 350, damping: 32 }}
                style={{
                  position: "fixed",
                  bottom: 0, left: 0, right: 0,
                  zIndex: 9999,
                  background: "var(--surface)",
                  borderRadius: "24px 24px 0 0",
                  padding: "24px 20px",
                  paddingBottom: "max(28px, env(safe-area-inset-bottom, 0px))",
                  boxShadow: "0 -8px 40px rgba(0,0,0,0.3)",
                  border: "1px solid var(--border)",
                  borderBottom: "none",
                }}
              >
                {/* Drag Handle */}
                <div style={{ width: 40, height: 4, borderRadius: 4, background: "var(--border)", margin: "0 auto 20px" }} />

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div>
                    <p style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                      {profile?.phone_number ? "Edit Phone Number" : "Add Phone Number"}
                    </p>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                      This will be shared with employers
                    </p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setPhoneModalOpen(false)}
                    style={{
                      width: 34, height: 34, borderRadius: 10,
                      background: "var(--surface-elevated)",
                      border: "1px solid var(--border)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <X size={16} color="var(--text-secondary)" />
                  </motion.button>
                </div>

                {/* Phone Input */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "var(--card)",
                  border: "1.5px solid var(--brand)",
                  borderRadius: 14,
                  padding: "0 16px",
                  marginBottom: 20,
                  boxShadow: "0 0 0 3px rgba(5,150,105,0.1)",
                }}
                >
                  <Phone size={18} color="var(--brand)" />
                  <input
                    type="tel"
                    placeholder="+251 9XX XXX XXXX"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    autoFocus
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      fontSize: 16,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      padding: "16px 0",
                      fontFamily: "inherit",
                    }}
                  />
                  {phoneInput && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setPhoneInput("")}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}
                    >
                      <X size={14} color="var(--text-muted)" />
                    </motion.button>
                  )}
                </div>

                {/* Save Button */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSaveManualPhone}
                  disabled={phoneLoading}
                  style={{
                    width: "100%",
                    padding: 16, borderRadius: 14,
                    background: "var(--brand)",
                    border: "none",
                    color: "#fff",
                    fontSize: 16, fontWeight: 700,
                    cursor: phoneLoading ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    opacity: phoneLoading ? 0.7 : 1,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  {phoneLoading ? (
                    <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                  ) : (
                    <CheckCircle size={18} />
                  )}
                  {phoneLoading ? "Saving..." : "Save Phone Number"}
                </motion.button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── Secondary Phone Number Modal ── */}
        <AnimatePresence>
          {secondaryPhoneModalOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                key="sec-phone-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSecondaryPhoneModalOpen(false)}
                style={{
                  position: "fixed", inset: 0, zIndex: 9998,
                  background: "rgba(0,0,0,0.55)",
                  backdropFilter: "blur(4px)",
                }}
              />
              {/* Bottom Sheet */}
              <motion.div
                key="sec-phone-sheet"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 350, damping: 32 }}
                style={{
                  position: "fixed",
                  bottom: 0, left: 0, right: 0,
                  zIndex: 9999,
                  background: "var(--surface)",
                  borderRadius: "24px 24px 0 0",
                  padding: "24px 20px",
                  paddingBottom: "max(28px, env(safe-area-inset-bottom, 0px))",
                  boxShadow: "0 -8px 40px rgba(0,0,0,0.3)",
                  border: "1px solid var(--border)",
                  borderBottom: "none",
                }}
              >
                {/* Drag Handle */}
                <div style={{ width: 40, height: 4, borderRadius: 4, background: "var(--border)", margin: "0 auto 20px" }} />

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div>
                    <p style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                      {profile?.secondary_phone ? "Edit Secondary Phone" : "Add Secondary Phone"}
                    </p>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                      This will be shared with employers as a backup contact
                    </p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSecondaryPhoneModalOpen(false)}
                    style={{
                      width: 34, height: 34, borderRadius: 10,
                      background: "var(--surface-elevated)",
                      border: "1px solid var(--border)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <X size={16} color="var(--text-secondary)" />
                  </motion.button>
                </div>

                {/* Phone Input */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "var(--card)",
                  border: "1.5px solid var(--brand)",
                  borderRadius: 14,
                  padding: "0 16px",
                  marginBottom: 20,
                  boxShadow: "0 0 0 3px rgba(5,150,105,0.1)",
                }}
                >
                  <Phone size={18} color="var(--brand)" />
                  <input
                    type="tel"
                    placeholder="+251 9XX XXX XXXX"
                    value={secondaryPhoneInput}
                    onChange={(e) => setSecondaryPhoneInput(e.target.value)}
                    autoFocus
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      fontSize: 16,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      padding: "16px 0",
                      fontFamily: "inherit",
                    }}
                  />
                  {secondaryPhoneInput && (
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSecondaryPhoneInput("")}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}
                    >
                      <X size={14} color="var(--text-muted)" />
                    </motion.button>
                  )}
                </div>

                {/* Save Button */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSaveSecondaryPhone}
                  disabled={secondaryPhoneLoading}
                  style={{
                    width: "100%",
                    padding: 16, borderRadius: 14,
                    background: "var(--brand)",
                    border: "none",
                    color: "#fff",
                    fontSize: 16, fontWeight: 700,
                    cursor: secondaryPhoneLoading ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    opacity: secondaryPhoneLoading ? 0.7 : 1,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  {secondaryPhoneLoading ? (
                    <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                  ) : (
                    <CheckCircle size={18} />
                  )}
                  {secondaryPhoneLoading ? "Saving..." : "Save Phone Number"}
                </motion.button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

    </LazyMotion>
  );
}
