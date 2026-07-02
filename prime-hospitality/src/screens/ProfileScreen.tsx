"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import { Phone, MapPin, Briefcase, FileText, RefreshCw, CheckCircle, HelpCircle, ShieldCheck, Settings, AlertCircle, Upload, Loader2, Moon, Sun, X, Pencil, Lock, ChevronRight, ChevronLeft, ChevronDown, Users, Search } from "lucide-react";
import { fetchProfile as fetchProfileApi, updatePhone, updateSecondaryPhone } from "@/lib/api";
import { formatPhoneForDisplay, normalizePhoneNumber } from "@/lib/phone";
import { useTelegram } from "@/hooks/useTelegram";
import { useCvUpload } from "@/hooks/useCvUpload";
import { supabase } from "@/lib/supabase";
import { JOB_CATEGORIES } from "@/data/jobs";
import { LOCATIONS, LOCATIONS_BY_SUB_CITY } from "@/data/locations";

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
  const [settingsView, setSettingsView] = useState<null | 'roles_overview' | 'experience' | 'location' | 'faq'>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  // Editable copies while settings panel is open
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [editExperience, setEditExperience] = useState<Record<string, string>>({});
  const [editLocation, setEditLocation] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [roleSearch, setRoleSearch] = useState("");
  const [roleTeamView, setRoleTeamView] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [pendingRole, setPendingRole] = useState<string | null>(null);
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
    if (!profile?.phone_number) {
      showToast("error", "You must share your primary phone number first.");
      return;
    }
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

      if (!profile?.phone_number) {
        showToast("error", "You must share your primary phone number first.");
        setSecondaryPhoneLoading(false);
        return;
      }

      const normalizedPrimary = normalizePhoneNumber(profile.phone_number);
      if (normalizedPrimary === formatted) {
        showToast("error", "Secondary phone cannot be the same as your primary phone number.");
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
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("themeToggle"));
    }
  };

  const openSettings = () => {
    setEditRoles(profile?.selected_categories ?? []);
    setEditExperience(profile?.experience_levels ?? {});
    setEditLocation(profile?.location ?? "");
    setSettingsView(null);
    setRoleSearch("");
    setRoleTeamView(null);
    setPendingRole(null);
    setLocationSearch("");
    setSettingsOpen(true);
  };

  const saveRolesAndExperience = async () => {
    if (!profile?.telegram_id) return;
    setIsSavingSettings(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ selected_categories: editRoles, experience_levels: editExperience })
        .eq("telegram_id", profile.telegram_id);
      if (error) throw error;
      setProfile(prev => prev ? { ...prev, selected_categories: editRoles, experience_levels: editExperience } : prev);
      showToast("success", "Roles & experience updated!");
      setSettingsView(null);
    } catch (err: any) {
      showToast("error", err.message || "Failed to save.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const saveLocation = async () => {
    if (!profile?.telegram_id || !editLocation.trim()) return;
    setIsSavingSettings(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ location: editLocation.trim() })
        .eq("telegram_id", profile.telegram_id);
      if (error) throw error;
      setProfile(prev => prev ? { ...prev, location: editLocation.trim() } : prev);
      showToast("success", "Location updated!");
      setSettingsView(null);
    } catch (err: any) {
      showToast("error", err.message || "Failed to save location.");
    } finally {
      setIsSavingSettings(false);
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
                        onClick={openSettings}
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
                          const isContact = s.key === "contact";
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
                                alignItems: "flex-start",
                                gap: 10,
                                cursor: isCv ? "pointer" : "default",
                                transition: "all 0.2s ease",
                              }}
                            >
                              <div style={{
                                width: 6, height: 6, borderRadius: "50%",
                                background: "#F59E0B",
                                flexShrink: 0,
                                marginTop: 5,
                              }} />
                              <div style={{ flex: 1 }}>
                                <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>
                                  {s.label}
                                </p>
                                {isContact && (
                                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, lineHeight: 1.4 }}>
                                    Not sharing a primary phone will impact your profile — employers won't know how to contact you.
                                  </p>
                                )}
                                {isCv && (
                                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, lineHeight: 1.4 }}>
                                    {isUploadingCv ? "Uploading CV..." : "Not uploading a CV reduces your chances of being hired, as employers look for detailed work history and qualifications. Tap to upload."}
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
                    display: "flex", flexDirection: "column",
                    padding: "14px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                    <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                      <Phone size={14} color="var(--text-secondary)" /> Phone
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 13, color: profile.phone_number ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 600 }}>
                        {profile.phone_number ? formatPhoneForDisplay(profile.phone_number) : "Contact number not shared"}
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
                        /* No number yet — allow sharing via Telegram */
                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          onClick={handleShareContact}
                          style={{
                            display: "flex", alignItems: "center", gap: 5,
                            padding: "6px 12px", borderRadius: 8,
                            background: "var(--brand)",
                            border: "1px solid var(--brand)",
                            cursor: "pointer",
                            fontSize: 12, fontWeight: 600,
                            color: "#ffffff",
                            fontFamily: "inherit",
                          }}
                        >
                          <Phone size={11} />
                          Share Now
                        </motion.button>
                      )}
                    </div>
                  </div>

                </div>

                {/* Secondary Phone */}
                <div
                  style={{
                    display: "flex", flexDirection: "column",
                    padding: "14px 0",
                    borderBottom: "1px solid var(--border)",
                    gap: 4,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden", width: "100%" }}>
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
                        disabled={!profile?.phone_number}
                        whileTap={!profile?.phone_number ? undefined : { scale: 0.88 }}
                        onClick={openSecondaryPhoneModal}
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          padding: "6px 12px", borderRadius: 8,
                          background: "var(--surface-elevated)",
                          border: "1px solid var(--border)",
                          cursor: !profile?.phone_number ? "not-allowed" : "pointer",
                          opacity: !profile?.phone_number ? 0.5 : 1,
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
                  {!profile?.phone_number && (
                    <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.4, paddingLeft: 22 }}>
                      You must share your primary phone number before adding a secondary one.
                    </span>
                  )}
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
                    display: "flex", flexDirection: "column",
                    padding: "14px 0",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
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

      {/* ── Settings Right Panel ── */}
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
              onClick={() => { setSettingsOpen(false); setSettingsView(null); }}
              style={{
                position: "fixed", inset: 0, zIndex: 200,
                background: "rgba(0,0,0,0.45)",
                backdropFilter: "blur(6px)",
              }}
            />

            {/* Sliding Panel from RIGHT */}
            <motion.div
              key="settings-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 32 }}
              style={{
                position: "fixed", top: 60, right: 0, bottom: 0,
                width: "85%", maxWidth: 400,
                zIndex: 201,
                background: "var(--surface)",
                borderTopLeftRadius: 20, borderBottomLeftRadius: 20,
                boxShadow: "-8px 0 40px rgba(0,0,0,0.2)",
                display: "flex", flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* ── HEADER ── */}
              <div style={{
                padding: "20px 16px 14px",
                borderBottom: "1px solid var(--border)",
                display: "flex", alignItems: "center", gap: 10,
                flexShrink: 0, background: "var(--surface)",
              }}>
                {settingsView !== null ? (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { 
                      if (settingsView === "experience") {
                         setSettingsView("roles_overview");
                      } else {
                         setSettingsView(null); 
                         setRoleTeamView(null); 
                         setRoleSearch(""); 
                         setPendingRole(null);
                      }
                    }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 4, lineHeight: 0 }}
                  >
                    <ChevronLeft size={22} color="var(--text-primary)" />
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { setSettingsOpen(false); setSettingsView(null); }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 4, lineHeight: 0 }}
                  >
                    <X size={20} color="var(--text-primary)" />
                  </motion.button>
                )}
                <div>
                  <p style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                    {settingsView === "roles_overview" ? "Job Roles & Experience"
                      : settingsView === "experience" ? "Select Experience"
                      : settingsView === "location" ? "Change Location"
                      : settingsView === "faq" ? "Help & FAQ"
                      : "Settings"}
                  </p>
                  {settingsView === null && (
                    <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Manage your profile preferences</p>
                  )}
                </div>
              </div>

              {/* ── SCROLLABLE BODY ── */}
              <div style={{ flex: 1, overflowY: "auto" }}>

                {/* ════ MAIN SETTINGS VIEW ════ */}
                {settingsView === null && (
                  <div style={{ padding: "16px" }}>

                    {/* Profile section */}
                    <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Profile</p>

                    {/* Edit Job Roles & Experience */}
                    <button
                      onClick={() => { setRoleSearch(""); setRoleTeamView(null); setPendingRole(null); setSettingsView("roles_overview"); }}
                      style={{
                        width: "100%", padding: "14px 16px", marginBottom: 8,
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        background: "var(--surface-elevated)", border: "1px solid var(--border)",
                        borderRadius: 14, cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--brand-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Briefcase size={17} color="var(--brand)" />
                        </div>
                        <div style={{ textAlign: "left" }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Job Roles & Experience</p>
                          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                            {editRoles.length > 0 
                              ? `${editRoles.length} selected`
                              : "Not set"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={18} color="var(--text-muted)" />
                    </button>

                    {/* Edit Location */}
                    <button
                      onClick={() => { setLocationSearch(""); setSettingsView("location"); }}
                      style={{
                        width: "100%", padding: "14px 16px", marginBottom: 20,
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        background: "var(--surface-elevated)", border: "1px solid var(--border)",
                        borderRadius: 14, cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--brand-subtle)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <MapPin size={17} color="var(--brand)" />
                        </div>
                        <div style={{ textAlign: "left" }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Location</p>
                          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{profile?.location || "Not set"}</p>
                        </div>
                      </div>
                      <ChevronRight size={18} color="var(--text-muted)" />
                    </button>

                    {/* Appearance section */}
                    <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Appearance</p>

                    {/* Help & FAQ */}
                    <button
                      onClick={() => { setOpenFaqIndex(null); setSettingsView("faq"); }}
                      style={{
                        width: "100%", textAlign: "left",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        background: "var(--surface-elevated)", border: "1px solid var(--border)",
                        borderRadius: 14, padding: "14px 16px", marginBottom: 12, cursor: "pointer",
                      }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: "var(--brand-subtle)", border: "1px solid var(--border)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <HelpCircle size={17} color="var(--brand)" />
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Help & FAQ</p>
                          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Frequently Asked Questions</p>
                        </div>
                      </div>
                      <ChevronRight size={18} color="var(--text-muted)" />
                    </button>

                    {/* Dark / Light toggle */}
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      background: "var(--surface-elevated)", border: "1px solid var(--border)",
                      borderRadius: 14, padding: "14px 16px",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: isDark ? "rgba(99,102,241,0.12)" : "rgba(245,158,11,0.12)",
                          border: `1px solid ${isDark ? "rgba(99,102,241,0.25)" : "rgba(245,158,11,0.25)"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {isDark ? <Moon size={17} color="#818CF8" /> : <Sun size={17} color="#F59E0B" />}
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{isDark ? "Dark Mode" : "Light Mode"}</p>
                          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{isDark ? "Easy on the eyes at night" : "Bright and clear display"}</p>
                        </div>
                      </div>
                      <motion.button
                        onClick={() => applyTheme(!isDark)}
                        style={{
                          width: 48, height: 27, borderRadius: 100,
                          background: isDark ? "var(--brand)" : "var(--surface)",
                          border: `1.5px solid ${isDark ? "var(--brand)" : "var(--border)"}`,
                          position: "relative", cursor: "pointer", flexShrink: 0,
                          transition: "background 0.25s, border-color 0.25s",
                        }}
                      >
                        <motion.div
                          layout
                          animate={{ x: isDark ? 21 : 2 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          style={{ position: "absolute", top: 3, width: 19, height: 19, borderRadius: "50%", background: isDark ? "#fff" : "var(--text-muted)", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }}
                        />
                      </motion.button>
                    </div>

                  </div>
                )}

                {/* ════ ROLES & EXPERIENCE OVERVIEW ════ */}
                {settingsView === "roles_overview" && (() => {
                  const ROLE_TEAMS: Record<string, string[]> = {
                    "Front Office": ["Receptionist", "Night Auditor", "Guest Relations Officer", "Reservations Agent", "Phone Operator", "Bellboy"],
                    "Housekeeping": ["Housekeeper"],
                    "Food & Beverage": ["F&B", "Waiter", "Chef", "Executive Chef", "Sous Chef", "Cook", "Traditional Cook", "Kitchen Assistant", "Steward", "Barista", "Banquet"],
                    "Marketing": ["Marketing & Sales"],
                    "Human Resources": ["HR Manager", "HR Officer", "Recruiter", "Training & Development Officer", "Payroll Officer"],
                    "Engineering & Maintenance": ["Chief Engineer", "Maintenance", "Painter", "IT Officer"],
                    "Finance & Accounting": ["Finance", "Accountant", "Cost Control", "Cashier", "Store Keeper"],
                    "Unassigned": ["Manager", "General Manager", "Security", "Driver", "Delivery", "Spa Attendant", "Gym Trainer", "Lifeguard", "Other"],
                  };
                  const teamNames = Object.keys(ROLE_TEAMS).filter(t => t !== "Unassigned");
                  const isSearching = roleSearch.trim().length > 0;
                  const searchResults = JOB_CATEGORIES.filter(c => c.toLowerCase().includes(roleSearch.toLowerCase()));
                  const teamCats = roleTeamView ? (ROLE_TEAMS[roleTeamView] ?? []) : [];
                  
                  const handleRoleClick = (cat: string) => {
                    if (!editRoles.includes(cat) && editRoles.length >= 3) {
                      showToast("error", "You can only select up to 3 job roles.");
                      return;
                    }
                    setPendingRole(cat);
                  };

                  const removeRole = (cat: string) => {
                    setEditRoles(editRoles.filter(r => r !== cat));
                    const newExp = { ...editExperience };
                    delete newExp[cat];
                    setEditExperience(newExp);
                    if (pendingRole === cat) setPendingRole(null);
                  };

                  const RoleGrid = ({ cats }: { cats: string[] }) => (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {cats.map(cat => {
                        const isPending = pendingRole === cat;
                        const isAlreadyAdded = editRoles.includes(cat);
                        return (
                          <button key={cat} onClick={() => handleRoleClick(cat)} style={{
                            width: "100%", padding: "13px 14px",
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            background: isPending || isAlreadyAdded ? "var(--brand-subtle)" : "var(--surface-elevated)",
                            border: isPending || isAlreadyAdded ? "1px solid var(--brand)" : "1px solid var(--border)",
                            borderRadius: 12, cursor: "pointer",
                          }}>
                            <span style={{ fontSize: 14, fontWeight: isPending || isAlreadyAdded ? 700 : 500, color: isPending || isAlreadyAdded ? "var(--brand)" : "var(--text-primary)" }}>{cat}</span>
                            <div style={{ width: 20, height: 20, borderRadius: 6, border: isPending || isAlreadyAdded ? "none" : "2px solid var(--text-muted)", background: isPending || isAlreadyAdded ? "var(--brand)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              {(isPending || isAlreadyAdded) && <CheckCircle size={13} color="white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                  return (
                    <div style={{ padding: "16px" }}>
                      
                      {/* Selected Roles List */}
                      {editRoles.length > 0 && (
                        <div style={{ marginBottom: 24 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Selected Roles ({editRoles.length}/3)</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {editRoles.map(role => (
                              <div key={role} style={{
                                width: "100%", padding: "12px 14px",
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                background: "var(--surface-elevated)", border: "1px solid var(--brand)",
                                borderRadius: 12,
                              }}>
                                <div>
                                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--brand)", margin: 0 }}>{role}</p>
                                  <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>Exp: {editExperience[role] || "Not set"}</p>
                                </div>
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button onClick={() => { setPendingRole(role); setSettingsView("experience"); }} style={{ padding: "6px 10px", background: "var(--brand)", color: "white", borderRadius: 8, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer" }}>Edit Exp</button>
                                  <button onClick={() => removeRole(role)} style={{ padding: "6px 10px", background: "var(--surface)", color: "var(--text-muted)", borderRadius: 8, fontSize: 11, fontWeight: 700, border: "1px solid var(--border)", cursor: "pointer" }}>Remove</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add New Role Section */}
                      {editRoles.length < 3 && (
                        <>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Add Role</p>
                          {/* Search */}
                          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 14px", marginBottom: 14 }}>
                            <Search size={16} color="var(--text-muted)" />
                            <input
                              placeholder="Search roles..."
                              value={roleSearch}
                              onChange={(e) => { setRoleSearch(e.target.value); setRoleTeamView(null); setPendingRole(null); }}
                              style={{ border: "none", outline: "none", width: "100%", fontSize: 14, background: "transparent", color: "var(--text-primary)" }}
                            />
                            {roleSearch && <button onClick={() => { setRoleSearch(""); setPendingRole(null); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 0 }}><X size={14} color="var(--text-muted)" /></button>}
                          </div>
                          
                          {/* Search results */}
                          {isSearching && (
                            searchResults.length > 0 ? <RoleGrid cats={searchResults} /> : <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px 0" }}>No roles found.</p>
                          )}
                          
                          {/* Team list */}
                          {!isSearching && !roleTeamView && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              {teamNames.map(team => {
                                const cats = ROLE_TEAMS[team] ?? [];
                                const activeCount = cats.filter(c => editRoles.includes(c)).length;
                                return (
                                  <button key={team} onClick={() => { setRoleTeamView(team); setPendingRole(null); }} style={{ width: "100%", padding: "13px 4px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "transparent", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                      <div style={{ width: 36, height: 36, borderRadius: 10, background: activeCount > 0 ? "var(--brand-subtle)" : "var(--surface-elevated)", border: `1px solid ${activeCount > 0 ? "var(--brand)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <Users size={16} color={activeCount > 0 ? "var(--brand)" : "var(--text-muted)"} />
                                      </div>
                                      <div style={{ textAlign: "left" }}>
                                        <p style={{ fontSize: 14, fontWeight: 600, color: activeCount > 0 ? "var(--brand)" : "var(--text-primary)", margin: 0 }}>{team}</p>
                                        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>{cats.length} roles</p>
                                      </div>
                                    </div>
                                    <ChevronRight size={16} color="var(--text-muted)" />
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          
                          {/* Team categories */}
                          {!isSearching && roleTeamView && (
                            <>
                              <button onClick={() => { setRoleTeamView(null); setPendingRole(null); }} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: "0 0 12px 0", color: "var(--brand)", fontWeight: 600, fontSize: 13 }}>
                                <ChevronLeft size={15} /> Back to Main Category
                              </button>
                              <RoleGrid cats={teamCats} />
                            </>
                          )}
                        </>
                      )}

                      {/* Next/Save buttons sticky at bottom */}
                      <div style={{ position: "sticky", bottom: 16, marginTop: 24, display: "flex", flexDirection: "column", gap: 8 }}>
                        {pendingRole && !editRoles.includes(pendingRole) && (
                          <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setSettingsView("experience")}
                            className="btn-primary"
                            style={{ width: "100%", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}
                          >
                            Next: Select Experience for {pendingRole}
                          </motion.button>
                        )}
                        {!pendingRole && (
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={saveRolesAndExperience}
                            disabled={isSavingSettings}
                            className="btn-primary"
                            style={{ width: "100%", background: editRoles.length === 0 ? "var(--surface-elevated)" : "var(--brand)", color: editRoles.length === 0 ? "var(--text-muted)" : "white" }}
                          >
                            {isSavingSettings ? "Saving..." : "Save Changes"}
                          </motion.button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* ════ EXPERIENCE VIEW ════ */}
                {settingsView === "experience" && (() => {
                  const EXPERIENCE_OPTIONS = [
                    "Entry Level (Fresh Graduate)",
                    "Junior Level(1-3 years)",
                    "Mid Level(3-5 years)",
                    "Senior(5-8 years)",
                    "Executive(VP, Director)",
                    "Senior Executive(C Level)",
                  ];
                  
                  const currentRole = pendingRole;
                  if (!currentRole) return null;

                  const handleSaveExperience = () => {
                    if (!editExperience[currentRole]) {
                      showToast("error", "Please select an experience level.");
                      return;
                    }
                    if (!editRoles.includes(currentRole)) {
                      setEditRoles([...editRoles, currentRole]);
                    }
                    setPendingRole(null);
                    setRoleSearch("");
                    setRoleTeamView(null);
                    setSettingsView("roles_overview");
                  };

                  return (
                    <div style={{ padding: "16px" }}>
                      <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{currentRole}</p>
                      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>Select your experience level for this role.</p>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {EXPERIENCE_OPTIONS.map(opt => {
                          const isSel = editExperience[currentRole] === opt;
                          return (
                            <button key={opt} onClick={() => setEditExperience(prev => ({ ...prev, [currentRole]: opt }))} style={{
                              width: "100%", padding: "13px 14px",
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              background: isSel ? "var(--brand-subtle)" : "var(--surface-elevated)",
                              border: isSel ? "1px solid var(--brand)" : "1px solid var(--border)",
                              borderRadius: 12, cursor: "pointer",
                            }}>
                              <span style={{ fontSize: 13, fontWeight: isSel ? 700 : 500, color: isSel ? "var(--brand)" : "var(--text-primary)", textAlign: "left" }}>{opt}</span>
                              <div style={{ width: 20, height: 20, borderRadius: "50%", border: isSel ? "none" : "2px solid var(--text-muted)", background: isSel ? "var(--brand)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                {isSel && <CheckCircle size={13} color="white" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleSaveExperience}
                        className="btn-primary"
                        style={{ width: "100%", marginTop: 24 }}
                      >
                        {editRoles.includes(currentRole) ? "Update Experience" : "Add Role"}
                      </motion.button>
                    </div>
                  );
                })()}

                {/* ════ LOCATION VIEW ════ */}
                {settingsView === "location" && (() => {
                  const allLocs = LOCATIONS;
                  const filtered = locationSearch.trim()
                    ? allLocs.filter(l => l.name.toLowerCase().includes(locationSearch.toLowerCase()) || l.subCity.toLowerCase().includes(locationSearch.toLowerCase()))
                    : allLocs;
                  const grouped = locationSearch.trim() ? null : LOCATIONS_BY_SUB_CITY;
                  return (
                    <div style={{ padding: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 14px", marginBottom: 14 }}>
                        <Search size={16} color="var(--text-muted)" />
                        <input
                          placeholder="Search location..."
                          value={locationSearch}
                          onChange={(e) => setLocationSearch(e.target.value)}
                          style={{ border: "none", outline: "none", width: "100%", fontSize: 14, background: "transparent", color: "var(--text-primary)" }}
                        />
                        {locationSearch && <button onClick={() => setLocationSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 0 }}><X size={14} color="var(--text-muted)" /></button>}
                      </div>
                      {editLocation && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--brand-subtle)", border: "1px solid var(--brand)", borderRadius: 12, marginBottom: 12 }}>
                          <MapPin size={14} color="var(--brand)" />
                          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)", margin: 0 }}>Selected: {editLocation}</p>
                        </div>
                      )}
                      {locationSearch.trim() ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {filtered.map(loc => {
                            const isSel = editLocation === loc.name;
                            return (
                              <button key={loc.id} onClick={() => setEditLocation(loc.name)} style={{
                                width: "100%", padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between",
                                background: isSel ? "var(--brand-subtle)" : "var(--surface-elevated)",
                                border: isSel ? "1px solid var(--brand)" : "1px solid var(--border)",
                                borderRadius: 12, cursor: "pointer",
                              }}>
                                <div style={{ textAlign: "left" }}>
                                  <p style={{ fontSize: 13, fontWeight: 600, color: isSel ? "var(--brand)" : "var(--text-primary)", margin: 0 }}>{loc.name}</p>
                                  <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>{loc.subCity}</p>
                                </div>
                                {isSel && <CheckCircle size={16} color="var(--brand)" />}
                              </button>
                            );
                          })}
                          {filtered.length === 0 && <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px 0" }}>No locations found.</p>}
                        </div>
                      ) : (
                        Object.entries(grouped!).map(([subCity, locs]) => (
                          <div key={subCity} style={{ marginBottom: 16 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{subCity}</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {locs.map(loc => {
                                const isSel = editLocation === loc.name;
                                return (
                                  <button key={loc.id} onClick={() => setEditLocation(loc.name)} style={{
                                    width: "100%", padding: "11px 14px", display: "flex", alignItems: "center", justifyContent: "space-between",
                                    background: isSel ? "var(--brand-subtle)" : "var(--surface-elevated)",
                                    border: isSel ? "1px solid var(--brand)" : "1px solid var(--border)",
                                    borderRadius: 10, cursor: "pointer",
                                  }}>
                                    <span style={{ fontSize: 13, fontWeight: isSel ? 700 : 500, color: isSel ? "var(--brand)" : "var(--text-primary)" }}>{loc.name}</span>
                                    {isSel && <CheckCircle size={14} color="var(--brand)" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      )}
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={saveLocation}
                        disabled={isSavingSettings || !editLocation}
                        className="btn-primary"
                        style={{ width: "100%", marginTop: 16, position: "sticky", bottom: 16 }}
                      >
                        {isSavingSettings ? "Saving..." : "Save Location"}
                      </motion.button>
                    </div>
                  );
                })()}

                {/* ════ FAQ VIEW ════ */}
                {settingsView === "faq" && (
                  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <div style={{ flex: 1, overflowY: "auto", paddingBottom: "env(safe-area-inset-bottom, 20px)" }}>
                      {[
                        { q: "What is Jobs Addis?", a: "Jobs Addis by Prime Hospitality is a specialized job platform connecting hospitality professionals with leading hotels, restaurants, and service businesses across Addis Ababa." },
                        { q: "How do I apply for a job?", a: "Browse available jobs on the Home or Search tab. Tap any job card to view the full details, then press the Apply button. Your Telegram profile will be shared with the employer." },
                        { q: "Is my personal information safe?", a: "Yes. We only share information you explicitly provide during onboarding with the employers you apply to. We do not sell your data to any third parties." },
                        { q: "How long does it take to hear back from an employer?", a: "Response times vary by employer. Most active listings receive candidate reviews within 2–5 business days. You will be notified directly through this app if there is an update on your application." },
                        { q: "Can I apply to more than one job at a time?", a: "Absolutely. There is no limit on the number of jobs you can apply for. We encourage you to apply to any role that matches your experience and interests." },
                        { q: "How do I update my profile?", a: "Tap the Profile tab at the bottom of the screen. Then tap the Settings gear icon. From there you can edit your roles, experience level, and location." },
                        { q: "What if a job listing looks suspicious or fraudulent?", a: "Please report it immediately using the flag icon on the job detail page, or contact us directly via the support channels below. We take job quality very seriously and review all reports within 24 hours." },
                        { q: "I'm an employer. How do I post a job?", a: "Employer accounts are managed through our Admin Dashboard. Please reach out to us via Telegram or email to get your business registered on the platform." },
                      ].map((item, i) => {
                        const isOpen = openFaqIndex === i;
                        return (
                          <div key={i} style={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", borderRadius: 14, marginBottom: 10, overflow: "hidden" }}>
                            <button
                              onClick={() => setOpenFaqIndex(isOpen ? null : i)}
                              style={{ width: "100%", padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "transparent", border: "none", cursor: "pointer", gap: 12 }}
                            >
                              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", textAlign: "left", lineHeight: 1.4 }}>{item.q}</span>
                              <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ flexShrink: 0 }}>
                                <ChevronDown size={16} color="var(--text-muted)" />
                              </motion.div>
                            </button>
                            <AnimatePresence initial={false}>
                              {isOpen && (
                                <motion.div key="answer" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} style={{ overflow: "hidden" }}>
                                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, padding: "0 16px 16px", margin: 0 }}>{item.a}</p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}

                      {/* Support Contact */}
                      <div style={{ marginTop: 8, padding: "18px", background: "var(--surface-elevated)", border: "1px solid var(--border)", borderRadius: 16 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>Contact Support</p>
                        {[
                          { icon: <HelpCircle size={16} color="var(--brand)" />, label: "Telegram", value: "@JobsAddisSupport" },
                          { icon: <Phone size={16} color="var(--brand)" />, label: "Phone", value: "+251 91 234 5678" },
                          { icon: <AlertCircle size={16} color="var(--brand)" />, label: "Email", value: "support@jobsaddis.com" },
                        ].map((c) => (
                          <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--brand-subtle)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              {c.icon}
                            </div>
                            <div>
                              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.label}</p>
                              <p style={{ fontSize: 13, color: "var(--text-primary)", margin: 0, fontWeight: 600 }}>{c.value}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", marginTop: 20, paddingBottom: 8 }}>
                        Jobs Addis · Prime Hospitality © {new Date().getFullYear()}
                      </p>
                    </div>
                  </div>
                )}

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
