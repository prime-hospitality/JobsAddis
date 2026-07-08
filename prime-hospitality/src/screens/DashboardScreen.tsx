"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, LazyMotion, domAnimation } from "framer-motion";
import { Briefcase, Users, Clock, CheckCircle, AlertCircle, RefreshCw, PlusCircle, TrendingUp, X, Pencil, Trash2, Sun, Moon } from "lucide-react";
import { useTelegram } from "@/hooks/useTelegram";
import { fetchEmployerDashboard, postJob, editJob, deleteJob, updateEmployerLogo } from "@/lib/api";
import { submitSpecialRequest } from "@/app/admin/actions";
import { supabase } from "@/lib/supabase";
import { searchLocations } from "@/data/locations";
import { detectCategoryFromTitle, searchJobCategories } from "@/data/job-categories";

interface DashboardJob {
  id: string;
  title: string;
  category: string;
  neighborhood: string;
  status: "pending" | "active" | "closed" | "rejected";
  created_at: string;
  deadline: string;
  application_count: number;
  job_type?: string;
  salary_min?: number;
  salary_max?: number;
  description?: string;
  requirements?: {
    experience?: string;
    education?: string;
    languages?: string[];
    locationPreference?: string | null;
    workingHours?: string;
  };
  quantity?: number;
}

interface DashboardStats {
  totalJobs: number;
  activeJobs: number;
  totalApplicants: number;
  pendingReview: number;
}

const JOB_STATUS_CONFIG = {
  pending:  { label: "Under Review", color: "#F59E0B", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.2)"  },
  active:   { label: "Live",         color: "#4ADE80", bg: "rgba(74,222,128,0.08)",  border: "rgba(74,222,128,0.2)"  },
  closed:   { label: "Closed",       color: "#8B9BBE", bg: "rgba(139,155,190,0.08)", border: "rgba(139,155,190,0.2)" },
  rejected: { label: "Rejected",     color: "#FCA5A5", bg: "rgba(252,165,165,0.06)", border: "rgba(252,165,165,0.15)"},
};

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


// ── Post-job form constants ───────────────────────────────────────────────────
const POST_JOB_TYPES     = ["Full Time","Part Time","Contract"] as const;
const POST_EXP_LEVELS    = ["Entry level","Junior","Intermediate","Senior","Expert"] as const;

const POST_FORM_DEFAULT = {
  title: "", category: "", jobType: "Full Time",
  salaryMin: "", salaryMax: "", neighborhood: "Bole",
  description: "", experience: "Entry Level", deadline: "",
  education: "", workingHours: "", quantity: "1",
};

let dashboardCache: {
  employerName: string | null;
  isApproved: boolean | null;
  employerId: string | null;
  jobs: DashboardJob[];
  stats: DashboardStats | null;
  dailyPostLimit: number;
  todayPostCount: number;
  logoUrl: string | null;
} | null = null;

export default function DashboardScreen({ onJobSelect }: { onJobSelect?: (jobId: string, jobTitle: string) => void }) {
  const { user, initData } = useTelegram();
  const [jobs, setJobs] = useState<DashboardJob[]>(dashboardCache?.jobs ?? []);
  const [stats, setStats] = useState<DashboardStats | null>(dashboardCache?.stats ?? null);
  const [isLoading, setIsLoading] = useState(!dashboardCache);
  const [error, setError] = useState<string | null>(null);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [employerName, setEmployerName] = useState<string | null>(dashboardCache?.employerName ?? null);
  const [isApproved, setIsApproved] = useState<boolean | null>(dashboardCache?.isApproved ?? null);
  const [employerId, setEmployerId] = useState<string | null>(dashboardCache?.employerId ?? null);

  // ── Post-job modal state ──
  const [showPostModal, setShowPostModal] = useState(false);
  const [postForm, setPostForm] = useState(POST_FORM_DEFAULT);
  const [postLoading, setPostLoading] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [postSuccess, setPostSuccess] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [salaryMode, setSalaryMode] = useState<"amount" | "company" | "negotiable">("amount");
  const [locationSuggestionsOpen, setLocationSuggestionsOpen] = useState(false);
  const [categorySuggestionsOpen, setCategorySuggestionsOpen] = useState(false);

  // ── Daily post limit ──
  const [dailyPostLimit, setDailyPostLimit] = useState<number>(dashboardCache?.dailyPostLimit ?? 3);
  const [todayPostCount, setTodayPostCount] = useState<number>(dashboardCache?.todayPostCount ?? 0);
  const isAtLimit = dailyPostLimit !== -1 && todayPostCount >= dailyPostLimit;

  // ── Logo Upload ──
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(dashboardCache?.logoUrl ?? null);

  // ── Theme State ──
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

  useEffect(() => {
    const syncTheme = () => {
      try {
        setIsDark(localStorage.getItem("theme") === "dark");
      } catch {}
    };
    if (typeof window !== "undefined") {
      window.addEventListener("themeToggle", syncTheme);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("themeToggle", syncTheme);
      }
    };
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employerId) return;
    
    setLogoUploading(true);
    try {
      // 1) Delete the old logo from storage if one exists
      if (logoUrl) {
        const oldPath = logoUrl.split("/logos/")[1];
        if (oldPath) {
          await supabase.storage.from("logos").remove([oldPath]);
        }
      }

      // 2) Upload the new logo
      const fileExt = file.name.split(".").pop();
      const fileName = `${employerId}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("logos").upload(fileName, file);
      if (uploadError) throw new Error(uploadError.message);
      
      const { data: publicUrlData } = supabase.storage.from("logos").getPublicUrl(fileName);
      await updateEmployerLogo(initData, publicUrlData.publicUrl);
      
      // 3) Update local state and cache
      setLogoUrl(publicUrlData.publicUrl);
      if (dashboardCache) dashboardCache.logoUrl = publicUrlData.publicUrl;
      
    } catch (err: any) {
      console.error(err);
      alert("Failed to upload logo: " + err.message);
    } finally {
      setLogoUploading(false);
    }
  };

  const fetchDashboard = useCallback(async (force = false) => {
    if (!force && dashboardCache) {
      setIsLoading(false);
      return;
    }

    // No real Telegram session (browser dev mode) — show error
    if (!initData) {
      setError("Open the app inside Telegram to view your employer dashboard.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchEmployerDashboard(initData);
      
      const updatedCache = {
        employerName: result.employer.business_name,
        isApproved: result.employer.status === "approved",
        employerId: result.employer.id,
        jobs: result.jobs as unknown as DashboardJob[],
        stats: result.stats,
        dailyPostLimit: result.employer.daily_post_limit ?? 3,
        todayPostCount: result.employer.today_post_count ?? 0,
        logoUrl: result.employer.logo_url ?? null,
      };
      dashboardCache = updatedCache;

      setEmployerName(updatedCache.employerName);
      setIsApproved(updatedCache.isApproved);
      setEmployerId(updatedCache.employerId);
      setJobs(updatedCache.jobs);
      setStats(updatedCache.stats);
      setDailyPostLimit(updatedCache.dailyPostLimit);
      setTodayPostCount(updatedCache.todayPostCount);
      // Only set logo from server if employer hasn't already uploaded a new one this session
      setLogoUrl((prev) => prev ?? updatedCache.logoUrl);
    } catch (err: any) {
      console.error("Dashboard fetch failed:", err);
      // 404 means the employer record was deleted by an admin
      const is404 =
        err?.statusCode === 404 ||
        (typeof err?.message === "string" &&
          (err.message.toLowerCase().includes("not found") ||
            err.message.toLowerCase().includes("employer not found")));
      if (is404) {
        setIsDeleted(true);
      } else {
        setError("Could not load your dashboard. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [initData]);

  const handleRequestJobSeeker = async () => {
    if (!user?.id) return;
    setIsRequesting(true);
    try {
      await submitSpecialRequest(user.id);
      setRequestSent(true);
    } catch (err) {
      console.error("Failed to request job seeker account:", err);
      alert("Failed to submit request. Please try again or contact us directly.");
    } finally {
      setIsRequesting(false);
    }
  };

  useEffect(() => {
    fetchDashboard(false);
  }, [fetchDashboard]);

  // ── Post a new job ─────────────────────────────────────────────────────────
  const updatePost = (key: string, value: string) =>
    setPostForm((f) => ({ ...f, [key]: value }));

  const handlePostJob = async () => {
    if (!employerId) return;
    const { title, description, deadline, salaryMin, education, workingHours, quantity } = postForm;
    if (!title.trim() || !description.trim() || !deadline) {
      setPostError("Please fill in all required fields.");
      return;
    }

    const qtyVal = quantity?.trim() || "1";
    if (isNaN(Number(qtyVal)) || Number(qtyVal) <= 0 || !Number.isInteger(Number(qtyVal))) {
      setPostError("Please enter a valid positive integer for number of openings.");
      return;
    }

    let finalSalaryMin = "";
    let finalSalaryMax = "";

    if (salaryMode === "company") {
      finalSalaryMin = "-1";
      finalSalaryMax = "-1";
    } else if (salaryMode === "negotiable") {
      finalSalaryMin = "-2";
      finalSalaryMax = "-2";
    } else {
      if (!salaryMin.trim() || isNaN(Number(salaryMin)) || Number(salaryMin) <= 0) {
        setPostError("Please enter a valid salary amount.");
        return;
      }
      finalSalaryMin = salaryMin.trim();
      finalSalaryMax = salaryMin.trim();
    }

    setPostLoading(true);
    setPostError(null);
    try {
      if (editingJobId) {
        await editJob({
          initData,
          jobId: editingJobId,
          jobData: {
            title: title.trim(),
            category: postForm.category,
            jobType: postForm.jobType,
            salaryMin: finalSalaryMin,
            salaryMax: finalSalaryMax,
            neighborhood: postForm.neighborhood,
            description: description.trim(),
            deadline,
            experience: postForm.experience,
            education: education.trim(),
            workingHours: workingHours.trim(),
            quantity: qtyVal,
          },
        });
      } else {
        await postJob({
          initData,
          jobData: {
            title: title.trim(),
            category: postForm.category,
            jobType: postForm.jobType,
            salaryMin: finalSalaryMin,
            salaryMax: finalSalaryMax,
            neighborhood: postForm.neighborhood,
            description: description.trim(),
            deadline,
            experience: postForm.experience,
            education: education.trim(),
            workingHours: workingHours.trim(),
            quantity: qtyVal,
          },
        });
      }
      setPostSuccess(true);
      setPostForm(POST_FORM_DEFAULT);
      setTimeout(() => {
        setPostSuccess(false);
        setShowPostModal(false);
        setEditingJobId(null);
        fetchDashboard(true);
      }, 2200);
    } catch (err) {
      console.error("Job operation failed:", err);
      setPostError(err instanceof Error ? err.message : (editingJobId ? "Failed to update job. Please try again." : "Failed to post job. Please try again."));
    } finally {
      setPostLoading(false);
    }
  };

  const handleOpenPostModal = () => {
    setEditingJobId(null);
    setPostForm(POST_FORM_DEFAULT);
    setSalaryMode("amount");
    setPostError(null);
    setPostSuccess(false);
    setShowPostModal(true);
  };

  const handleOpenEditModal = (job: DashboardJob) => {
    setEditingJobId(job.id);
    const mode = job.salary_min === -1 ? "company" : job.salary_min === -2 ? "negotiable" : "amount";
    setSalaryMode(mode);
    setPostForm({
      title: job.title,
      category: job.category,
      jobType: (job.job_type || "Full Time") as any,
      salaryMin: mode === "amount" ? String(job.salary_min) : "",
      salaryMax: mode === "amount" ? String(job.salary_max) : "",
      neighborhood: job.neighborhood,
      description: job.description || "",
      experience: (job.requirements?.experience || "Entry Level") as any,
      deadline: job.deadline ? job.deadline.split("T")[0] : "",
      education: job.requirements?.education || "",
      workingHours: job.requirements?.workingHours || "",
      quantity: String(job.quantity || 1),
    });
    setPostError(null);
    setPostSuccess(false);
    setShowPostModal(true);
  };

  const handleDeleteJob = async (jobId: string) => {
    setDeleteLoading(true);
    try {
      await deleteJob({ initData, jobId });
      setDeleteConfirmId(null);
      fetchDashboard(true);
    } catch (err) {
      console.error("Failed to delete job:", err);
      alert("Failed to delete job. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
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
        {/* ── Header ── */}
        <div className="safe-screen-top" style={{ paddingLeft: 20, paddingRight: 20, paddingBottom: 20, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
              <h1
                style={{
                  fontSize: 22, fontWeight: 800,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em", marginBottom: 4,
                }}
              >
                {employerName ? `${employerName}` : "Employer Dashboard"}
              </h1>
              <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                {isApproved === false
                  ? "Your account is pending approval"
                  : "Manage your job listings"}
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {/* Circular avatar — tap to upload logo */}
              <label
                title="Tap to change profile photo"
                style={{
                  width: 48, height: 48, borderRadius: "50%",
                  flexShrink: 0,
                  cursor: logoUploading ? "wait" : "pointer",
                  opacity: logoUploading ? 0.6 : 1,
                  position: "relative",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} disabled={logoUploading} />
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    style={{
                      width: 48, height: 48, borderRadius: "50%",
                      objectFit: "cover",
                      border: "2px solid var(--brand)",
                    }}
                  />
                ) : (
                  <div style={{
                    width: 48, height: 48, borderRadius: "50%",
                    background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, fontWeight: 800, color: "#fff",
                    letterSpacing: "-0.01em",
                    boxShadow: "0 4px 14px rgba(5,150,105,0.35)",
                    border: "2px solid rgba(5,150,105,0.3)",
                    userSelect: "none",
                  }}>
                    {employerName
                      ? employerName.trim().split(/\s+/).map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
                      : "?"}
                  </div>
                )}
                {/* Small camera badge */}
                <div style={{
                  position: "absolute", bottom: 0, right: 0,
                  width: 16, height: 16, borderRadius: "50%",
                  background: "var(--brand)", border: "2px solid var(--bg)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="white">
                    <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z"/>
                    <path d="M9 3L7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.17L15 3H9zm3 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/>
                  </svg>
                </div>
              </label>

              {/* Theme Toggle Button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => applyTheme(!isDark)}
                style={{
                  width: 38, height: 38, borderRadius: 12,
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--card-shadow)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                {isDark ? <Sun size={16} color="#F59E0B" /> : <Moon size={16} color="#818CF8" />}
              </motion.button>

              {/* Refresh Button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => fetchDashboard(true)}
                style={{
                  width: 38, height: 38, borderRadius: 12,
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--card-shadow)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={16} color="var(--text-secondary)" />
              </motion.button>
            </div>
          </div>
        </div>

        <div style={{ padding: "0 20px" }}>
          {/* Loading skeletons */}
          {isLoading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="shimmer" style={{ height: 110, borderRadius: 16 }} />
              <div className="shimmer" style={{ height: 200, borderRadius: 16 }} />
              <div className="shimmer" style={{ height: 140, borderRadius: 16 }} />
            </div>
          )}

          {/* Account deleted — contact AddisJobs */}
          {!isLoading && isDeleted && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 18,
                padding: 28,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 64, height: 64, borderRadius: "50%",
                  background: "linear-gradient(135deg, rgba(5,150,105,0.15) 0%, rgba(4,120,87,0.08) 100%)",
                  border: "1px solid rgba(5,150,105,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 4,
                }}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.9 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.8 2.7h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <div>
                <p
                  style={{
                    fontSize: 17, fontWeight: 800,
                    color: "var(--text-primary)",
                    marginBottom: 8, letterSpacing: "-0.01em",
                  }}
                >
                  Account No Longer Active
                </p>
                <p
                  style={{
                    fontSize: 14, color: "var(--text-secondary)",
                    lineHeight: 1.6, marginBottom: 0,
                  }}
                >
                  Your employer account is not active on AddisJobs.
                  Please reach out to our team and we'll be happy to help.
                </p>
              </div>
              <div
                style={{
                  marginTop: 4,
                  padding: "12px 20px",
                  borderRadius: 12,
                  background: "var(--brand-subtle, rgba(5,150,105,0.08))",
                  border: "1px solid rgba(5,150,105,0.2)",
                  width: "100%",
                }}
              >
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Contact us on Telegram</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: "var(--brand, #059669)" }}>@AddisJobs</p>
              </div>

              {/* Request Job seeker account button */}
              <div style={{ width: "100%", marginTop: 8 }}>
                {requestSent ? (
                  <div
                    style={{
                      background: "rgba(74,222,128,0.1)",
                      border: "1px solid rgba(74,222,128,0.2)",
                      borderRadius: 12, padding: "12px 16px",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  >
                    <CheckCircle size={18} color="#4ADE80" />
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#4ADE80" }}>Request sent successfully</span>
                  </div>
                ) : (
                  <button
                    onClick={handleRequestJobSeeker}
                    disabled={isRequesting}
                    style={{
                      width: "100%", padding: "12px 16px",
                      borderRadius: 12,
                      background: "transparent",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                      fontSize: 14, fontWeight: 600,
                      cursor: isRequesting ? "wait" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      opacity: isRequesting ? 0.7 : 1,
                    }}
                  >
                    {isRequesting ? (
                      <span className="shimmer" style={{ width: 16, height: 16, borderRadius: "50%", display: "inline-block" }} />
                    ) : (
                      <Users size={16} />
                    )}
                    Request Job seeker account instead
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* Generic Error */}
          {!isLoading && !isDeleted && error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 14, padding: 20, textAlign: "center",
              }}
            >
              <AlertCircle size={28} color="#FCA5A5" style={{ margin: "0 auto 12px" }} />
              <p style={{ color: "#FCA5A5", fontSize: 14, marginBottom: 12 }}>{error}</p>
              <button
                onClick={() => fetchDashboard(true)}
                style={{ fontSize: 13, fontWeight: 600, color: "var(--brand)", background: "none", border: "none", cursor: "pointer" }}
              >
                Try again
              </button>
            </motion.div>
          )}

          {/* Pending approval banner */}
          {!isLoading && !error && isApproved === false && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.25)",
                borderRadius: 14, padding: 16,
                display: "flex", gap: 12, alignItems: "flex-start",
                marginBottom: 20,
              }}
            >
              <Clock size={20} color="#F59E0B" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#FDE68A", marginBottom: 4 }}>Account Under Review</p>
                <p style={{ fontSize: 13, color: "rgba(253,230,138,0.7)", lineHeight: 1.5 }}>
                  Your employer account is being verified by our team. You'll be notified once approved and can start posting jobs.
                </p>
              </div>
            </motion.div>
          )}

          {/* Stats cards */}
          {!isLoading && !error && stats && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              {/* Stat grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { icon: <Briefcase size={20} color="var(--brand)" />, value: stats.totalJobs, label: "Total Listings" },
                  { icon: <CheckCircle size={20} color="#4ADE80" />, value: stats.activeJobs, label: "Active Jobs" },
                  { icon: <Users size={20} color="#60A5FA" />, value: stats.totalApplicants, label: "Total Applicants" },
                  { icon: <TrendingUp size={20} color="#F59E0B" />, value: stats.pendingReview, label: "Under Review" },
                ].map(({ icon, value, label }) => (
                  <div
                    key={label}
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      padding: "14px 16px",
                    }}
                  >
                    <div style={{ marginBottom: 8 }}>{icon}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginBottom: 2 }}>
                      {value}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Daily Post Limit Card */}
              {isApproved && (
                <div
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Clock size={16} color="var(--brand)" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                        Daily Post Limit
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: isAtLimit ? "#FCA5A5" : "var(--brand)",
                        background: isAtLimit ? "rgba(239,68,68,0.1)" : "var(--brand-subtle)",
                        padding: "2px 8px",
                        borderRadius: 8,
                      }}
                    >
                      {dailyPostLimit === -1 ? "Unlimited" : `${todayPostCount} / ${dailyPostLimit}`}
                    </span>
                  </div>
                  {dailyPostLimit !== -1 && (
                    <>
                      <div style={{ width: "100%", height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
                        <div
                          style={{
                            width: `${Math.min(100, (todayPostCount / dailyPostLimit) * 100)}%`,
                            height: "100%",
                            background: isAtLimit ? "linear-gradient(90deg, #EF4444 0%, #DC2626 100%)" : "linear-gradient(90deg, #10B981 0%, #059669 100%)",
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                      <p style={{ fontSize: 12, color: isAtLimit ? "#FCA5A5" : "var(--text-secondary)", lineHeight: 1.4 }}>
                        {isAtLimit
                          ? "⚠️ You have reached your daily post limit. Upgrade or wait until tomorrow to post more."
                          : `You can post ${dailyPostLimit - todayPostCount} more job${(dailyPostLimit - todayPostCount) !== 1 ? "s" : ""} today.`}
                      </p>
                    </>
                  )}
                  {dailyPostLimit === -1 && (
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                      Premium Account: You have unlimited daily job postings.
                    </p>
                  )}
                </div>
              )}

              {/* Post a job CTA */}
              {isApproved && (
                <motion.button
                  whileTap={isAtLimit ? {} : { scale: 0.97 }}
                  onClick={isAtLimit ? undefined : handleOpenPostModal}
                  disabled={isAtLimit}
                  style={{
                    width: "100%",
                    padding: "14px 20px",
                    borderRadius: 14,
                    background: isAtLimit
                      ? "var(--border)"
                      : "linear-gradient(135deg, #059669 0%, #047857 100%)",
                    border: "none",
                    cursor: isAtLimit ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    color: isAtLimit ? "var(--text-muted)" : "#0A0F1E",
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: "inherit",
                    boxShadow: isAtLimit ? "none" : "0 4px 16px rgba(5,150,105,0.25)",
                    opacity: isAtLimit ? 0.6 : 1,
                  }}
                >
                  <PlusCircle size={18} />
                  {isAtLimit ? "Daily Post Limit Reached" : "Post a New Job"}
                </motion.button>
              )}

              {/* Jobs list */}
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
                  Your Job Listings
                </h2>

                {jobs.length === 0 ? (
                  <div
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 14, padding: 24,
                      textAlign: "center",
                    }}
                  >
                    <Briefcase size={28} color="var(--text-muted)" style={{ margin: "0 auto 10px", display: "block" }} />
                    <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                      You haven't posted any jobs yet.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {jobs.map((job, i) => {
                      const cfg = JOB_STATUS_CONFIG[job.status] ?? JOB_STATUS_CONFIG.pending;
                      return (
                        <motion.div
                          key={job.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: i * 0.05 }}
                          onClick={() => onJobSelect?.(job.id, job.title)}
                          style={{
                            background: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: 14, padding: 14,
                            cursor: onJobSelect ? "pointer" : "default",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                            <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                              <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {job.title}
                              </p>
                              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                {job.neighborhood} · {timeAgo(job.created_at)} {job.quantity && job.quantity > 1 ? `· ${job.quantity} openings` : ""}
                              </p>
                            </div>
                            <span
                              style={{
                                fontSize: 11, fontWeight: 600,
                                color: cfg.color,
                                background: cfg.bg,
                                border: `1px solid ${cfg.border}`,
                                borderRadius: 100, padding: "3px 10px",
                                whiteSpace: "nowrap", flexShrink: 0,
                              }}
                            >
                              {cfg.label}
                            </span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Users size={13} color="var(--text-muted)" />
                              <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>
                                {job.application_count} applicant{job.application_count !== 1 ? "s" : ""}
                              </span>
                            </div>

                            {/* Edit / Delete Actions */}
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditModal(job);
                                }}
                                style={{
                                  background: "rgba(96,165,250,0.1)",
                                  border: "1px solid rgba(96,165,250,0.2)",
                                  borderRadius: 8,
                                  width: 30, height: 30,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  cursor: "pointer",
                                }}
                                title="Edit Job"
                              >
                                <Pencil size={13} color="#60A5FA" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(job.id);
                                }}
                                style={{
                                  background: "rgba(239,68,68,0.1)",
                                  border: "1px solid rgba(239,68,68,0.2)",
                                  borderRadius: 8,
                                  width: 30, height: 30,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  cursor: "pointer",
                                }}
                                title="Delete Job"
                              >
                                <Trash2 size={13} color="#FCA5A5" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── POST JOB BOTTOM SHEET ─────────────────────────────────────── */}
      <AnimatePresence>
        {showPostModal && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !postLoading && setShowPostModal(false)}
              style={{
                position: "fixed", inset: 0,
                background: "rgba(0,0,0,0.65)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                zIndex: 100,
              }}
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              style={{
                position: "fixed", bottom: 0, left: 0, right: 0,
                background: "var(--surface-elevated)",
                borderRadius: "22px 22px 0 0",
                border: "1px solid var(--border)",
                borderBottom: "none",
                zIndex: 101,
                maxHeight: "92dvh",
                overflowY: "auto",
                paddingBottom: "env(safe-area-inset-bottom, 20px)",
              }}
            >
              {/* Drag handle */}
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4 }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)" }} />
              </div>

              {/* Header */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 20px 16px",
                borderBottom: "1px solid var(--border)",
              }}>
                <div>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>{editingJobId ? "Update Listing" : "New Listing"}</p>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{editingJobId ? "Edit Job" : "Post a Job"}</h2>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => !postLoading && setShowPostModal(false)}
                  style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: "var(--card)", border: "1px solid var(--border)",
                    boxShadow: "var(--card-shadow)",
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  }}
                >
                  <X size={16} color="var(--text-muted)" />
                </motion.button>
              </div>

              {/* Success state */}
              {postSuccess ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ padding: 40, textAlign: "center" }}
                >
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 250, damping: 20 }}
                    style={{
                      width: 72, height: 72, borderRadius: "50%",
                      background: "linear-gradient(135deg, rgba(5,150,105,0.2), rgba(5,150,105,0.05))",
                      border: "2px solid rgba(5,150,105,0.4)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      margin: "0 auto 20px",
                    }}
                  >
                    <CheckCircle size={36} color="#059669" />
                  </motion.div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>{editingJobId ? "Job Updated!" : "Job Posted!"}</h3>
                  <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    {editingJobId ? "Your job changes have been saved." : "Your listing is now live. Applicants can apply immediately."}
                  </p>
                </motion.div>
              ) : (
                <div style={{ padding: "20px 20px 8px", display: "flex", flexDirection: "column", gap: 16 }}>

                  {/* Job Title */}
                  <PostField label="Job Title *">
                    <input
                      className="input-base"
                      placeholder="e.g. Senior Waiter"
                      value={postForm.title}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        updatePost("title", newTitle);
                        // Auto-detect and fill category from title
                        const detected = detectCategoryFromTitle(newTitle);
                        if (detected) {
                          updatePost("category", detected);
                        }
                      }}
                    />
                  </PostField>

                  {/* Category — free-text with autocomplete */}
                  <PostField label="Category">
                    <div style={{ position: "relative" }}>
                      <input
                        className="input-base"
                        type="text"
                        placeholder="e.g. Waiter, Chef, Accountant…"
                        value={postForm.category}
                        onChange={(e) => {
                          updatePost("category", e.target.value);
                          setCategorySuggestionsOpen(true);
                        }}
                        onFocus={() => setCategorySuggestionsOpen(true)}
                        onBlur={() => setTimeout(() => setCategorySuggestionsOpen(false), 150)}
                        autoComplete="off"
                      />
                      {categorySuggestionsOpen && (() => {
                        const results = searchJobCategories(postForm.category).slice(0, 10);
                        return results.length > 0 ? (
                          <div style={{
                            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                            background: "var(--card)", border: "1px solid var(--border)",
                            borderRadius: 12, overflow: "hidden",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                            zIndex: 100, maxHeight: 240, overflowY: "auto",
                          }}>
                            {results.map((cat) => (
                              <button
                                key={cat.id}
                                type="button"
                                onMouseDown={() => {
                                  updatePost("category", cat.name);
                                  setCategorySuggestionsOpen(false);
                                }}
                                style={{
                                  display: "flex", flexDirection: "column", alignItems: "flex-start",
                                  width: "100%", textAlign: "left",
                                  padding: "9px 14px", fontSize: 14,
                                  color: "var(--text-primary)", background: "none",
                                  border: "none", borderBottom: "1px solid var(--border)",
                                  cursor: "pointer", fontFamily: "inherit",
                                  gap: 2, transition: "background 0.12s",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-elevated)")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                              >
                                <span style={{ fontWeight: 600 }}>{cat.name}</span>
                                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{cat.department}</span>
                              </button>
                            ))}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </PostField>

                  {/* Job Type */}
                  <PostField label="Job Type">
                    <div style={{ display: "flex", gap: 8 }}>
                      {POST_JOB_TYPES.map((t) => {
                        const active = postForm.jobType === t;
                        return (
                          <button key={t} onClick={() => updatePost("jobType", t)}
                            style={{
                              flex: 1, padding: "10px 4px", borderRadius: 10, fontSize: 13,
                              fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                              background: active ? "var(--brand-subtle)" : "var(--card)",
                              border: active ? "1px solid var(--brand)" : "1px solid var(--border)",
                              color: active ? "var(--brand)" : "var(--text-secondary)",
                            }}
                          >{t}</button>
                        );
                      })}
                    </div>
                  </PostField>

                  {/* Salary Option Selector */}
                  <PostField label="Salary Mode">
                    <div style={{ display: "flex", gap: 8, marginBottom: salaryMode === "amount" ? 10 : 0 }}>
                      {[
                        { mode: "amount", label: "Fixed Amount" },
                        { mode: "company", label: "Per Company Scale" },
                        { mode: "negotiable", label: "Negotiable" },
                      ].map((opt) => {
                        const active = salaryMode === opt.mode;
                        return (
                          <button
                            key={opt.mode}
                            type="button"
                            onClick={() => setSalaryMode(opt.mode as any)}
                            style={{
                              flex: 1, padding: "10px 4px", borderRadius: 10, fontSize: 12,
                              fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                              background: active ? "var(--brand-subtle)" : "var(--card)",
                              border: active ? "1px solid var(--brand)" : "1px solid var(--border)",
                              color: active ? "var(--brand)" : "var(--text-secondary)",
                              transition: "all 0.2s ease",
                            }}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </PostField>

                  {/* Salary Input (only shown if Fixed Amount is selected) */}
                  {salaryMode === "amount" && (
                    <PostField label="Salary (ETB / month)">
                      <input
                        className="input-base"
                        type="number"
                        placeholder="e.g. 8000"
                        value={postForm.salaryMin}
                        onChange={(e) => updatePost("salaryMin", e.target.value)}
                      />
                    </PostField>
                  )}

                  {/* Location — free-text with autocomplete suggestions */}
                  <PostField label="Location">
                    <div style={{ position: "relative" }}>
                      <input
                        className="input-base"
                        type="text"
                        placeholder="e.g. Bole, Kazanchis, CMC…"
                        value={postForm.neighborhood}
                        onChange={(e) => {
                          updatePost("neighborhood", e.target.value);
                          setLocationSuggestionsOpen(true);
                        }}
                        onFocus={() => setLocationSuggestionsOpen(true)}
                        onBlur={() => setTimeout(() => setLocationSuggestionsOpen(false), 150)}
                        autoComplete="off"
                      />
                      {locationSuggestionsOpen && (() => {
                        const results = searchLocations(postForm.neighborhood).slice(0, 12);
                        return results.length > 0 ? (
                          <div style={{
                            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                            background: "var(--card)", border: "1px solid var(--border)",
                            borderRadius: 12, overflow: "hidden",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                            zIndex: 100, maxHeight: 220, overflowY: "auto",
                          }}>
                            {results.map((loc) => (
                              <button
                                key={loc.id}
                                type="button"
                                onMouseDown={() => {
                                  updatePost("neighborhood", loc.name);
                                  setLocationSuggestionsOpen(false);
                                }}
                                style={{
                                  display: "flex", flexDirection: "column", alignItems: "flex-start",
                                  width: "100%", textAlign: "left",
                                  padding: "9px 14px", fontSize: 14,
                                  color: "var(--text-primary)", background: "none",
                                  border: "none", borderBottom: "1px solid var(--border)",
                                  cursor: "pointer", fontFamily: "inherit",
                                  gap: 2, transition: "background 0.12s",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-elevated)")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                              >
                                <span style={{ fontWeight: 600 }}>{loc.name}</span>
                                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{loc.subCity}</span>
                              </button>
                            ))}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </PostField>

                  {/* Required Experience */}
                  <PostField label="Experience Required">
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {POST_EXP_LEVELS.map((lvl) => {
                        const active = postForm.experience === lvl;
                        return (
                          <button key={lvl} onClick={() => updatePost("experience", lvl)}
                            style={{
                              padding: "8px 14px", borderRadius: 100, fontSize: 13,
                              fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                              background: active ? "var(--brand-subtle)" : "var(--card)",
                              border: active ? "1px solid var(--brand)" : "1px solid var(--border)",
                              color: active ? "var(--brand)" : "var(--text-secondary)",
                            }}
                          >{lvl}</button>
                        );
                      })}
                    </div>
                  </PostField>

                  {/* Education Required */}
                  <PostField label="Education Level Required">
                    <textarea
                      className="input-base"
                      placeholder="e.g. High school diploma, Hospitality Degree, or write any specific educational requirements..."
                      rows={2}
                      value={postForm.education}
                      onChange={(e) => updatePost("education", e.target.value)}
                      style={{ resize: "none", lineHeight: 1.6 }}
                    />
                  </PostField>

                  {/* Working Hours (Optional) */}
                  <PostField label="Working Hours (Optional)">
                    <input
                      className="input-base"
                      type="text"
                      placeholder="e.g. 8:00 AM - 5:00 PM, Shifts, Flexible..."
                      value={postForm.workingHours}
                      onChange={(e) => updatePost("workingHours", e.target.value)}
                    />
                  </PostField>

                  {/* Quantity (Number of Openings) */}
                  <PostField label="Number of Openings (Quantity)">
                    <input
                      className="input-base"
                      type="number"
                      min="1"
                      placeholder="e.g. 1, 2, 5..."
                      value={postForm.quantity}
                      onChange={(e) => updatePost("quantity", e.target.value)}
                    />
                  </PostField>

                  {/* Description */}
                  <PostField label="Job Description *">
                    <textarea
                      className="input-base"
                      placeholder="Describe the role, responsibilities, and what you're looking for…"
                      rows={4}
                      value={postForm.description}
                      onChange={(e) => updatePost("description", e.target.value)}
                      style={{ resize: "none", lineHeight: 1.6 }}
                    />
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, textAlign: "right" }}>
                      {postForm.description.length} chars
                    </p>
                  </PostField>

                  {/* Deadline */}
                  <PostField label="Application Deadline *">
                    <input
                      className="input-base"
                      type="date"
                      value={postForm.deadline}
                      onChange={(e) => updatePost("deadline", e.target.value)}
                      style={{ colorScheme: "dark" }}
                    />
                  </PostField>

                  {/* Error */}
                  {postError && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      style={{
                        background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                        borderRadius: 10, padding: "10px 14px",
                      }}
                    >
                      <p style={{ fontSize: 13, color: "#FCA5A5" }}>{postError}</p>
                    </motion.div>
                  )}

                  {/* Submit */}
                  <div style={{ paddingTop: 4, paddingBottom: 16 }}>
                    <motion.button
                      className="btn-primary"
                      whileTap={{ scale: 0.97 }}
                      onClick={handlePostJob}
                      disabled={postLoading}
                      style={{ opacity: postLoading ? 0.7 : 1, willChange: "transform" }}
                    >
                      {postLoading ? (
                        <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                          {editingJobId ? "Updating Listing…" : "Submitting for Review…"}
                        </motion.span>
                      ) : editingJobId ? "Update Job Listing →" : "Submit Job Listing →"}
                    </motion.button>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
                      {editingJobId ? "Edits are reviewed before going live." : "Listings are reviewed by our team before going live (usually within 24 hrs)."}
                    </p>
                  </div>

                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── DELETE CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {deleteConfirmId && (
          <>
            {/* Backdrop */}
            <motion.div
              key="delete-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deleteLoading && setDeleteConfirmId(null)}
              style={{
                position: "fixed", inset: 0,
                background: "rgba(0,0,0,0.65)",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                zIndex: 110,
              }}
            />

            {/* Dialog */}
            <div
              style={{
                position: "fixed", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: 20, zIndex: 111,
                pointerEvents: "none",
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                style={{
                  width: "100%", maxWidth: 360,
                  background: "var(--surface-elevated)",
                  borderRadius: 18, border: "1px solid var(--border)",
                  padding: 20, pointerEvents: "auto",
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <AlertCircle size={40} color="#FCA5A5" style={{ margin: "0 auto 12px" }} />
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
                    Delete Job Listing?
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 20 }}>
                    Are you sure you want to delete this job listing? All corresponding applications will be permanently deleted. This action cannot be undone.
                  </p>
                  
                  <div style={{ display: "flex", gap: 10 }}>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setDeleteConfirmId(null)}
                      disabled={deleteLoading}
                      style={{
                        flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 13, fontWeight: 600,
                        background: "var(--card)", border: "1px solid var(--border)",
                        color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit",
                        opacity: deleteLoading ? 0.7 : 1,
                      }}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleDeleteJob(deleteConfirmId)}
                      disabled={deleteLoading}
                      style={{
                        flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 13, fontWeight: 600,
                        background: "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)",
                        border: "none", color: "#fff", cursor: "pointer", fontFamily: "inherit",
                        opacity: deleteLoading ? 0.7 : 1,
                      }}
                    >
                      {deleteLoading ? "Deleting..." : "Delete"}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}

// ── Helper component ──────────────────────────────────────────────────────────
function PostField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
        {label}
      </p>
      {children}
    </div>
  );
}
