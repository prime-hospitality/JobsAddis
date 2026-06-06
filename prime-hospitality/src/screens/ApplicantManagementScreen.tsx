"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, LazyMotion, domAnimation } from "framer-motion";
import { ArrowLeft, Users, Star, X, CheckCircle, Clock, MapPin, Briefcase, Loader2, AlertCircle } from "lucide-react";
import { useTelegram } from "@/hooks/useTelegram";
import { fetchJobApplicants, shortlistApplicant, declineApplicant, unshortlistApplicant } from "@/lib/api";
import { getMockEmployer } from "@/data/employers";
import ApplicantProfileView from "@/screens/ApplicantProfileView";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Applicant {
  id: string;
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
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// Profile completion score (0–100) mirrors the job seeker's own scoring
function getApplicantScore(a: Applicant): number {
  const p = a.profiles;
  if (!p) return 0;
  let score = 0;
  if (p.full_name && p.age && p.location) score += 20;           // personal info
  if (p.phone_number) score += 20;                                // contact
  if (p.selected_categories && p.selected_categories.length > 0) score += 20; // roles
  if (
    p.selected_categories &&
    p.selected_categories.length > 0 &&
    p.selected_categories.every((c) => !!p.experience_levels?.[c])
  ) score += 20;                                                  // experience levels
  if (p.cv_url) score += 20;                                     // CV
  return score;
}

// ── Applicant Card ────────────────────────────────────────────────────────────
function ApplicantCard({
  applicant,
  onShortlist,
  onDecline,
  onUnshortlist,
  onViewProfile,
  showUnshortlist,
  actionLoading,
  score,
}: {
  applicant: Applicant;
  onShortlist?: () => void;
  onDecline?: () => void;
  onUnshortlist?: () => void;
  onViewProfile?: () => void;
  showUnshortlist?: boolean;
  actionLoading: { id: string; type: "shortlist" | "decline" | "unshortlist" } | null;
  score: number;
}) {
  const p = applicant.profiles;
  const name = p?.full_name ?? "Unknown";
  const isLoading = actionLoading?.id === applicant.id;
  const isShortlisting = isLoading && actionLoading?.type === "shortlist";
  const isDeclining = isLoading && actionLoading?.type === "decline";
  const isUnshortlisting = isLoading && actionLoading?.type === "unshortlist";
  const expLevel = p?.experience_levels
    ? Object.values(p.experience_levels)[0] ?? "Not specified"
    : "Not specified";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, scale: 0.97 }}
      transition={{ duration: 0.22 }}
      onClick={onViewProfile}
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: 14,
        opacity: isLoading ? 0.6 : 1,
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {/* Avatar */}
        <div
          style={{
            width: 46, height: 46, borderRadius: "50%", flexShrink: 0,
            background: p?.gender === "female"
              ? "linear-gradient(135deg, #059669 0%, #0D9488 100%)"
              : "linear-gradient(135deg, #047857 0%, #065F46 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 800, color: "#fff",
            boxShadow: "0 4px 12px rgba(5,150,105,0.25)",
          }}
        >
          {getInitials(name)}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              {name}
            </p>
            {/* Profile completion badge */}
            <span style={{
              fontSize: 10, fontWeight: 700, borderRadius: 100, padding: "2px 7px",
              background: score === 100
                ? "rgba(5,150,105,0.12)"
                : score >= 80
                ? "rgba(99,102,241,0.1)"
                : "rgba(245,158,11,0.09)",
              border: score === 100
                ? "1px solid rgba(5,150,105,0.28)"
                : score >= 80
                ? "1px solid rgba(99,102,241,0.22)"
                : "1px solid rgba(245,158,11,0.28)",
              color: score === 100 ? "var(--brand)" : score >= 80 ? "#818CF8" : "#F59E0B",
              flexShrink: 0,
            }}>
              {score}%
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
              <MapPin size={11} /> {p?.location ?? "—"}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
              <Briefcase size={11} /> {expLevel}
            </span>
            <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
              <Clock size={11} /> Applied {timeAgo(applicant.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {showUnshortlist ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={(e) => { e.stopPropagation(); onUnshortlist?.(); }}
            disabled={!!actionLoading}
            style={{
              flex: 1, padding: "9px 0", borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
              color: "#F59E0B", cursor: !!actionLoading ? "not-allowed" : "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              opacity: isUnshortlisting ? 0.7 : 1,
            }}
          >
            {isUnshortlisting ? <Loader2 size={13} className="animate-spin" /> : null}
            {isUnshortlisting ? "Moving..." : "Move Back"}
          </motion.button>
        ) : (
          <>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={(e) => { e.stopPropagation(); onShortlist?.(); }}
              disabled={!!actionLoading}
              style={{
                flex: 1, padding: "9px 0", borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: "linear-gradient(135deg, rgba(5,150,105,0.15), rgba(5,150,105,0.05))",
                border: "1px solid rgba(5,150,105,0.3)",
                color: "var(--brand)", cursor: !!actionLoading ? "not-allowed" : "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                opacity: isShortlisting ? 0.7 : 1,
              }}
            >
              {isShortlisting ? <Loader2 size={13} className="animate-spin" /> : <Star size={13} />}
              {isShortlisting ? "Shortlisting..." : "Shortlist"}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={(e) => { e.stopPropagation(); onDecline?.(); }}
              disabled={!!actionLoading}
              style={{
                width: 80, padding: "9px 0", borderRadius: 10, fontSize: 13, fontWeight: 600,
                background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
                color: "#FCA5A5", cursor: !!actionLoading ? "not-allowed" : "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                opacity: isDeclining ? 0.7 : 1,
              }}
            >
              {isDeclining ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
              {isDeclining ? "..." : "Decline"}
            </motion.button>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ApplicantManagementScreen({
  jobId,
  jobTitle,
  onBack,
}: {
  jobId: string;
  jobTitle: string;
  onBack: () => void;
}) {
  const { initData, user } = useTelegram();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "shortlisted">("all");
  const [actionLoading, setActionLoading] = useState<{ id: string; type: "shortlist" | "decline" | "unshortlist" } | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [viewingApplicant, setViewingApplicant] = useState<Applicant | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadApplicants = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!initData) {
        // Dev mode — use mock data
        const employer = user ? getMockEmployer(user.id) : null;
        const job = employer?.jobs.find((j) => j.id === jobId);
        const mocked = (job?.applicants ?? []).map((a) => ({
          id: a.id,
          telegram_id: a.telegram_id,
          status: a.status,
          created_at: a.created_at,
          profiles: {
            full_name: a.full_name,
            location: a.location,
            gender: a.gender,
            age: a.age,
            willing_to_relocate: a.willing_to_relocate,
            experience_levels: { "": a.experience_level },
            selected_categories: null,
          },
        }));
        setApplicants(mocked as unknown as Applicant[]);
      } else {
        const result = await fetchJobApplicants(initData, jobId);
        setApplicants(result.applicants as unknown as Applicant[]);
      }
    } catch (e) {
      setError("Could not load applicants. Try again.");
    } finally {
      setIsLoading(false);
      setLoaded(true);
    }
  }, [initData, jobId, user]);

  useEffect(() => {
    loadApplicants();
  }, [loadApplicants]);
  const pending = applicants.filter((a) => a.status === "pending");
  const shortlisted = applicants.filter((a) => a.status === "shortlisted");

  // Sort: highest profile completion first; ties broken by earliest application date
  const sortApplicants = (list: Applicant[]) =>
    [...list].sort((a, b) => {
      const scoreDiff = getApplicantScore(b) - getApplicantScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  const displayed = sortApplicants(activeTab === "all" ? pending : shortlisted);

  const handleShortlist = async (app: Applicant) => {
    setActionLoading({ id: app.id, type: "shortlist" });
    try {
      if (initData) {
        await shortlistApplicant(initData, app.id);
      }
      setSuccessId(app.id);
      setTimeout(() => setSuccessId(null), 1200);
      setApplicants((prev) => prev.map((a) => a.id === app.id ? { ...a, status: "shortlisted" } : a));
      setActiveTab("shortlisted");
      return true;
    } catch (e: any) {
      showToast(`Error: ${e.message || "Failed to shortlist"}`);
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (app: Applicant) => {
    setActionLoading({ id: app.id, type: "decline" });
    try {
      if (initData) await declineApplicant(initData, app.id);
      setApplicants((prev) => prev.filter((a) => a.id !== app.id));
      return true;
    } catch (e: any) {
      showToast(`Error: ${e.message || "Failed to decline"}`);
      return false;
    } finally { 
      setActionLoading(null); 
    }
  };

  const handleUnshortlist = async (app: Applicant) => {
    setActionLoading({ id: app.id, type: "unshortlist" });
    try {
      if (initData) await unshortlistApplicant(initData, app.id);
      setApplicants((prev) => prev.map((a) => a.id === app.id ? { ...a, status: "pending" } : a));
      setActiveTab("all");
      return true;
    } catch (e: any) {
      showToast(`Error: ${e.message || "Failed to move back"}`);
      return false;
    } finally { 
      setActionLoading(null); 
    }
  };

  return (
    <LazyMotion features={domAnimation}>
      {/* Error toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="action-toast"
            initial={{ opacity: 0, y: -60, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -60, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            style={{
              position: "fixed", top: "max(24px, env(safe-area-inset-top, 0px))",
              left: 20, right: 20, zIndex: 9999, maxWidth: 380, margin: "0 auto",
              background: "linear-gradient(135deg, rgba(220,38,38,0.97), rgba(185,28,28,0.97))",
              borderRadius: 16, padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 12,
              boxShadow: "0 8px 32px rgba(220,38,38,0.35)",
            }}
          >
            <AlertCircle size={20} color="#fff" />
            <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", margin: 0 }}>{toast}</p>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {viewingApplicant && (
          <ApplicantProfileView
            key="profile-view"
            applicant={viewingApplicant}
            onBack={() => setViewingApplicant(null)}
            onShortlist={async () => {
              const ok = await handleShortlist(viewingApplicant);
              if (ok) {
                // Close profile → employer lands on Shortlisted tab (setActiveTab called in handleShortlist)
                setViewingApplicant(null);
              }
            }}
            onDecline={async () => {
              const ok = await handleDecline(viewingApplicant);
              if (ok) setViewingApplicant(null);
            }}
            onUnshortlist={async () => {
              const ok = await handleUnshortlist(viewingApplicant);
              if (ok) {
                // Close profile → employer lands on All Applicants tab (setActiveTab called in handleUnshortlist)
                setViewingApplicant(null);
              }
            }}
            actionLoading={actionLoading}
          />
        )}
      </AnimatePresence>
      {viewingApplicant ? null : <>
      <motion.div
        key="applicant-mgmt"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 30 }}
        transition={{ duration: 0.22 }}
        style={{
          display: "flex", flexDirection: "column",
          height: "100dvh", background: "transparent",
          overflowY: "auto", paddingBottom: 96,
        }}
      >
        {/* Header */}
        <div className="safe-screen-top" style={{ paddingLeft: 20, paddingRight: 20, paddingBottom: 16, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
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
                {jobTitle}
              </h1>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {applicants.filter(a => a.status !== "rejected").length} applicant{applicants.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", background: "var(--card)", borderRadius: 12, padding: 4, border: "1px solid var(--border)" }}>
            {(["all", "shortlisted"] as const).map((tab) => {
              const isActive = activeTab === tab;
              const count = tab === "all" ? pending.length : shortlisted.length;
              return (
                <motion.button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1, padding: "8px 0", borderRadius: 9, fontSize: 13, fontWeight: 600,
                    background: isActive ? "var(--brand)" : "transparent",
                    border: "none", cursor: "pointer", fontFamily: "inherit",
                    color: isActive ? "#fff" : "var(--text-muted)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    transition: "all 0.15s",
                  }}
                >
                  {tab === "all" ? <Users size={14} /> : <Star size={14} />}
                  {tab === "all" ? "All Applicants" : "Shortlisted"}
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    background: isActive ? "rgba(255,255,255,0.2)" : "var(--surface-elevated)",
                    borderRadius: 100, padding: "1px 6px", minWidth: 20, textAlign: "center",
                  }}>
                    {count}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "0 20px", flex: 1 }}>
          {isLoading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[1, 2, 3].map((i) => <div key={i} className="shimmer" style={{ height: 110, borderRadius: 16 }} />)}
            </div>
          )}

          {!isLoading && error && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <p style={{ color: "#FCA5A5", fontSize: 14, marginBottom: 12 }}>{error}</p>
              <button onClick={loadApplicants} style={{ fontSize: 13, fontWeight: 600, color: "var(--brand)", background: "none", border: "none", cursor: "pointer" }}>Try again</button>
            </div>
          )}

          {!isLoading && !error && displayed.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: "var(--card)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                {activeTab === "all" ? <Users size={28} color="var(--text-muted)" /> : <Star size={28} color="var(--text-muted)" />}
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                {activeTab === "all" ? "No applicants yet" : "No shortlisted candidates"}
              </p>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {activeTab === "all" ? "Applicants will appear here as they apply." : "Shortlist candidates from the All Applicants tab."}
              </p>
            </motion.div>
          )}

          {!isLoading && !error && displayed.length > 0 && (
            <AnimatePresence mode="popLayout">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {displayed.map((app) => (
                  <div key={app.id} style={{ position: "relative" }}>
                    {successId === app.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                        style={{
                          position: "absolute", inset: 0, zIndex: 10, borderRadius: 16,
                          background: "linear-gradient(135deg, rgba(5,150,105,0.15), rgba(5,150,105,0.05))",
                          border: "2px solid rgba(5,150,105,0.4)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <CheckCircle size={32} color="#059669" />
                      </motion.div>
                    )}
                    <ApplicantCard
                      applicant={app}
                      onShortlist={() => handleShortlist(app)}
                      onDecline={() => handleDecline(app)}
                      onUnshortlist={() => handleUnshortlist(app)}
                      onViewProfile={() => setViewingApplicant(app)}
                      showUnshortlist={activeTab === "shortlisted"}
                      actionLoading={actionLoading}
                      score={getApplicantScore(app)}
                    />
                  </div>
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>
      </motion.div>
      </>}
    </LazyMotion>
  );
}
