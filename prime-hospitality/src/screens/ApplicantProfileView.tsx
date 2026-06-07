"use client";

import { motion, AnimatePresence, LazyMotion, domAnimation } from "framer-motion";
import { ArrowLeft, MapPin, Briefcase, Phone, FileText, CheckCircle, Star, X, Loader2 } from "lucide-react";
import { formatPhoneForDisplay } from "@/lib/phone";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ApplicantProfile {
  id: string; // application id
  telegram_id: number;
  status: "pending" | "shortlisted" | "rejected";
  created_at: string;
  profiles: {
    full_name: string;
    location: string;
    gender: string;
    age: number;
    willing_to_relocate: boolean;
    experience_levels: Record<string, string> | null;
    selected_categories: string[] | null;
    phone_number?: string | null;
    secondary_phone?: string | null;
    cv_url?: string | null;
  } | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function getInitials(name: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

interface ApplicantProfileViewProps {
  applicant: ApplicantProfile;
  onBack: () => void;
  onShortlist: () => void;
  onDecline: () => void;
  onUnshortlist: () => void;
  actionLoading: { id: string; type: "shortlist" | "decline" | "unshortlist" } | null;
}

export default function ApplicantProfileView({
  applicant,
  onBack,
  onShortlist,
  onDecline,
  onUnshortlist,
  actionLoading,
}: ApplicantProfileViewProps) {
  const p = applicant.profiles;
  const name = p?.full_name ?? "Unknown Applicant";
  const isLoading = actionLoading?.id === applicant.id;
  const isShortlisting = isLoading && actionLoading?.type === "shortlist";
  const isDeclining = isLoading && actionLoading?.type === "decline";
  const isUnshortlisting = isLoading && actionLoading?.type === "unshortlist";
  const isShortlisted = applicant.status === "shortlisted";

  const expLevels = p?.experience_levels ?? {};
  const categories = p?.selected_categories ?? [];

  return (
    <LazyMotion features={domAnimation}>
      <motion.div
        key="applicant-profile-view"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ duration: 0.22 }}
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100dvh",
          background: "transparent",
          overflowY: "auto",
          paddingBottom: 120,
        }}
      >
        {/* ── Header ── */}
        <div
          className="safe-screen-top"
          style={{
            paddingLeft: 20,
            paddingRight: 20,
            paddingBottom: 16,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={onBack}
              style={{
                width: 38, height: 38, borderRadius: 12,
                background: "var(--card)", border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0,
              }}
            >
              <ArrowLeft size={18} color="var(--text-secondary)" />
            </motion.button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Applicant Profile
              </h1>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Applied {timeAgo(applicant.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Avatar / Name Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              background: "linear-gradient(135deg, var(--surface-elevated) 0%, var(--card) 100%)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              padding: 20,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: 66, height: 66, borderRadius: "50%",
                background: p?.gender === "female"
                  ? "linear-gradient(135deg, #059669 0%, #0D9488 100%)"
                  : p?.gender === "male"
                  ? "linear-gradient(135deg, #047857 0%, #065F46 100%)"
                  : "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, fontWeight: 800, color: "#FFFFFF",
                flexShrink: 0,
                boxShadow: p?.gender === "female"
                  ? "0 4px 16px rgba(5,150,105,0.35)"
                  : "0 4px 16px rgba(4,120,87,0.35)",
              }}
            >
              {p?.gender === "female" ? (
                <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="11" r="7" fill="#FFFFFF" />
                  <path d="M20 18v3M12 27c0-3.314 3.582-6 8-6s8 2.686 8 6" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                  <path d="M14 33c0 0 1.5-4 6-4s6 4 6 4" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                  <ellipse cx="20" cy="33" rx="6" ry="3.5" fill="rgba(255,255,255,0.25)"/>
                </svg>
              ) : p?.gender === "male" ? (
                <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
                  <circle cx="20" cy="11" r="7" fill="#FFFFFF" />
                  <path d="M8 38c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none"/>
                </svg>
              ) : (
                getInitials(name)
              )}
            </div>

            {/* Name & Meta */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
                {name}
              </h2>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500, marginBottom: 6 }}>
                {p?.age ? `Age: ${p.age}` : ""}
                {p?.age && p?.willing_to_relocate !== undefined ? " · " : ""}
                {p?.willing_to_relocate ? "Willing to relocate" : "Local only"}
              </p>
              {/* Only show badge when shortlisted — pending is obvious from context */}
              {isShortlisted && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontSize: 11, fontWeight: 700,
                  borderRadius: 100, padding: "3px 10px",
                  background: "rgba(5,150,105,0.1)",
                  border: "1px solid rgba(5,150,105,0.25)",
                  color: "var(--brand)",
                }}>
                  <CheckCircle size={10} /> Shortlisted
                </span>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.06 }}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "8px 16px",
            }}
          >
            {/* Phone */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 0",
              borderBottom: "1px solid var(--border)",
            }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                <Phone size={14} color="var(--text-secondary)" /> Phone
              </span>
              <span style={{ fontSize: 13, color: p?.phone_number ? "var(--text-primary)" : "var(--text-muted)", fontWeight: 600 }}>
                {p?.phone_number ? formatPhoneForDisplay(p.phone_number) : "Not shared yet"}
              </span>
            </div>

            {/* Secondary Phone */}
            {p?.secondary_phone && (
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "14px 0",
                borderBottom: "1px solid var(--border)",
              }}>
                <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                  <Phone size={14} color="var(--text-secondary)" /> 2nd Phone
                </span>
                <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>
                  {formatPhoneForDisplay(p.secondary_phone)}
                </span>
              </div>
            )}

            {/* Location */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 0",
              borderBottom: "1px solid var(--border)",
            }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                <MapPin size={14} color="var(--text-secondary)" /> Location
              </span>
              <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>
                {p?.location || "—"}
              </span>
            </div>

            {/* Roles & Experience */}
            <div style={{
              display: "flex", flexDirection: "column",
              padding: "14px 0",
              borderBottom: "1px solid var(--border)",
              gap: 10,
            }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                <Briefcase size={14} color="var(--text-secondary)" /> Roles & Experience
              </span>
              {categories.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingLeft: 22 }}>
                  {categories.map((cat) => {
                    const exp = expLevels[cat] || "Entry Level";
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
              ) : (
                <span style={{ fontSize: 13, color: "var(--text-muted)", paddingLeft: 22 }}>No roles listed</span>
              )}
            </div>

            {/* CV */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 0",
            }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                <FileText size={14} color="var(--text-secondary)" /> Resume (CV)
              </span>
              {p?.cv_url ? (
                <span
                  onClick={() => window.open(p.cv_url!, "_blank")}
                  style={{
                    fontSize: 13, fontWeight: 600, color: "#6366F1",
                    textDecoration: "underline", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 5,
                  }}
                >
                  <CheckCircle size={12} color="var(--success)" /> View CV
                </span>
              ) : (
                <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>Not uploaded</span>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── Sticky Action Buttons ── */}
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          padding: "12px 20px calc(12px + env(safe-area-inset-bottom, 0px))",
          background: "var(--app-bg)",
          borderTop: "1px solid var(--border)",
          display: "flex", gap: 10,
          zIndex: 50,
        }}>
          {isShortlisted ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onUnshortlist}
              disabled={!!actionLoading}
              style={{
                flex: 1, padding: "14px 0", borderRadius: 14, fontSize: 14, fontWeight: 700,
                background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)",
                color: "#F59E0B", cursor: !!actionLoading ? "not-allowed" : "pointer",
                fontFamily: "inherit", opacity: !!actionLoading ? 0.6 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {isUnshortlisting && <Loader2 size={16} className="animate-spin" />}
              {isUnshortlisting ? "Moving..." : "Move Back to Pending"}
            </motion.button>
          ) : (
            <>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onShortlist}
                disabled={!!actionLoading}
                style={{
                  flex: 1, padding: "14px 0", borderRadius: 14, fontSize: 14, fontWeight: 700,
                  background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                  border: "none",
                  color: "#fff", cursor: !!actionLoading ? "not-allowed" : "pointer",
                  fontFamily: "inherit", opacity: !!actionLoading ? 0.6 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: "0 4px 16px rgba(5,150,105,0.3)",
                }}
              >
                {isShortlisting ? <Loader2 size={16} className="animate-spin" /> : <Star size={16} />}
                {isShortlisting ? "Shortlisting..." : "Shortlist"}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onDecline}
                disabled={!!actionLoading}
                style={{
                  width: 100, padding: "14px 0", borderRadius: 14, fontSize: 14, fontWeight: 700,
                  background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
                  color: "#FCA5A5", cursor: !!actionLoading ? "not-allowed" : "pointer",
                  fontFamily: "inherit", opacity: !!actionLoading ? 0.6 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                {isDeclining ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
                {isDeclining ? "..." : "Decline"}
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    </LazyMotion>
  );
}
