"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, LazyMotion, domAnimation } from "framer-motion";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Job } from "@/data/jobs";
import { JobSeekerProfile, mapProfileRowToJobSeekerProfile } from "@/data/profile";
import { useTelegram } from "@/hooks/useTelegram";
import { usePerformance } from "@/hooks/usePerformance";
import { useT } from "@/lib/i18n";
import { useCvUpload } from "@/hooks/useCvUpload";
import { fetchProfile, getUnreadCount, fetchApplications } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { mapSupabaseJobToJob, JOB_SELECT } from "@/hooks/useJobs";

import BottomNav, { NavTab } from "@/components/BottomNav";
import HomeScreen from "@/screens/HomeScreen";
import JobDetailScreen from "@/screens/JobDetailScreen";
import ApplicationScreen from "@/screens/ApplicationScreen";
import ConfirmationScreen from "@/screens/ConfirmationScreen";
import OnboardingScreen from "@/screens/OnboardingScreen";
import ApplicationsScreen from "@/screens/ApplicationsScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import SearchScreen from "@/screens/SearchScreen";
import DashboardScreen from "@/screens/DashboardScreen";
import ApplicantManagementScreen from "@/screens/ApplicantManagementScreen";
import NotificationsScreen from "@/screens/NotificationsScreen";
import NotificationPanel from "@/components/NotificationPanel";

// ── App navigation state ──
type AppView =
  | { screen: "home" }
  | { screen: "jobDetail"; job: Job }
  | { screen: "application"; job: Job; profile: JobSeekerProfile }
  | { screen: "confirmation"; job: Job }
  | { screen: "applicantManagement"; jobId: string; jobTitle: string };

// Keys to wipe when a user is deleted or needs to re-onboard.
const USER_LOCAL_KEYS = ["profile_privacy_dismissed", "theme", "lang"];

function clearUserLocalData() {
  try {
    USER_LOCAL_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {}
}

export default function App() {
  const t = useT();
  const { user, isEmployer: telegramIsEmployer, isReady: isTelegramReady, initData, startParam, deviceInfo } = useTelegram();
  const { enableAnimations, pageSize, performanceClass } = usePerformance(deviceInfo);
  const [isEmployer, setIsEmployer] = useState<boolean>(telegramIsEmployer);
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);

  useEffect(() => {
    setIsEmployer(telegramIsEmployer);
    // When employer status is confirmed, redirect away from job-seeker-only tabs
    if (telegramIsEmployer) {
      setActiveTab((prev) =>
        ["profile", "applications", "notifications"].includes(prev) ? "dashboard" : prev
      );
    }
  }, [telegramIsEmployer]);
  const { isUploadingCv, cvUploadError } = useCvUpload();

  // Apply performance class as a data attribute on <html> so CSS rules take effect globally
  useEffect(() => {
    document.documentElement.setAttribute("data-perf", performanceClass);
    return () => {
      document.documentElement.removeAttribute("data-perf");
    };
  }, [performanceClass]);

  const [cvJustDone, setCvJustDone] = useState(false);
  const [cvFailed, setCvFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const prevUploadingRef = useRef(false);
  const [activeTab, setActiveTab] = useState<NavTab>(telegramIsEmployer ? "dashboard" : "home");
  const [view, setView] = useState<AppView>({ screen: "home" });
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  /** Job IDs this seeker has already applied to — drives the "Applied" state on job detail. */
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  /** Cover note kept at the app level so stepping back to re-read the job doesn't discard it. */
  const [coverNoteDraft, setCoverNoteDraft] = useState<{ jobId: string; text: string } | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Track when upload transitions from true → false to flash a "Done" tick or show error
  useEffect(() => {
    if (prevUploadingRef.current && !isUploadingCv) {
      if (cvUploadError) {
        setCvFailed(true);
        setErrorMessage(cvUploadError);
        const timer = setTimeout(() => setCvFailed(false), 4000);
        return () => clearTimeout(timer);
      } else {
        setCvJustDone(true);
        const timer = setTimeout(() => setCvJustDone(false), 3000);
        return () => clearTimeout(timer);
      }
    }
    prevUploadingRef.current = isUploadingCv;
  }, [isUploadingCv, cvUploadError]);
  
  // Onboarding state
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isBanned, setIsBanned] = useState<boolean>(false);

  // Check onboarding status via Edge Function (uses service-role key, bypasses RLS)
  useEffect(() => {
    async function checkOnboarding() {
      if (!isTelegramReady) return;
      console.log("[Prime Hospitality] Launching onboarding check for Telegram user:", user?.id || "Dev Mode");

      // No real Telegram session (browser dev mode) — always show onboarding
      if (!initData) {
        setIsOnboarded(false);
        return;
      }

      try {
        const result = await fetchProfile(initData);
        if (!result.onboarding_completed) {
          // User exists in auth but hasn't completed onboarding,
          // OR was deleted by admin (profile row gone). Clear stale local data.
          clearUserLocalData();
        }
        setIsOnboarded(result.onboarding_completed);
        setUserProfile(result.profile);
        if (result.is_employer) {
          setIsEmployer(true);
        }
      } catch (err: any) {
        console.error("Error checking onboarding status:", err);
        if (err?.statusCode === 403 || (err?.message && err.message.toLowerCase().includes("banned"))) {
          setIsBanned(true);
        } else {
          // Could be a deleted user (404) or network error — clear local data and show onboarding
          clearUserLocalData();
          setIsOnboarded(false);
        }
      }

      // Track device performance silently
      if (initData && user?.id) {
        fetch("/api/device", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            telegramId: user.id,
            performanceClass: performanceClass
          })
        }).catch(e => console.error("Telemetry error:", e));
      }
    }

    checkOnboarding();
  }, [isTelegramReady, initData]);

  // Check deep link status (directing to specific job if app launched via button)
  useEffect(() => {
    if (!isTelegramReady || isOnboarded === null || deepLinkHandled) return;

    async function handleDeepLink() {
      if (startParam && startParam.startsWith("job_")) {
        const jobId = startParam.replace("job_", "");
        console.log("[Prime Hospitality] Handling deep link for job:", jobId);
        try {
          const { data, error } = await supabase
            .from("jobs")
            .select(JOB_SELECT)
            .eq("id", jobId)
            .single();

          if (error) throw error;
          if (data) {
            const mappedJob = mapSupabaseJobToJob(data as any);
            setView({ screen: "jobDetail", job: mappedJob });
          }
        } catch (err) {
          console.error("Failed to fetch deep-linked job:", err);
        }
      }
      setDeepLinkHandled(true);
    }

    handleDeepLink();
  }, [isTelegramReady, isOnboarded, startParam, deepLinkHandled]);

  // Load which jobs this seeker has already applied to, so the job detail screen can
  // say so up front instead of letting them fill in the form and fail at the last step.
  useEffect(() => {
    if (!isTelegramReady || !initData || !isOnboarded || isEmployer) return;

    async function loadAppliedJobs() {
      if (!initData) return;
      try {
        const res = await fetchApplications(initData);
        setAppliedJobIds(
          new Set((res.applications ?? []).map((a) => a.job_id as string).filter(Boolean))
        );
      } catch {
        // Non-fatal — the server still rejects duplicates, this is only a UI hint.
      }
    }

    loadAppliedJobs();
  }, [isTelegramReady, initData, isOnboarded, isEmployer]);

  // Check unread notifications count
  useEffect(() => {
    if (!isTelegramReady || !initData || !isOnboarded) return;
    
    let interval: NodeJS.Timeout;
    
    async function checkUnread() {
      if (!initData) return;
      try {
        const res = await getUnreadCount(initData);
        setUnreadCount(res.unread_count);
      } catch (e) {
        // silent fail
      }
    }

    checkUnread();
    interval = setInterval(checkUnread, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [isTelegramReady, initData, isOnboarded]);

  // ── Navigation handlers ──

  /** Go back to whichever tab was active — does NOT reset the active tab. */
  const goBackToList = () => {
    setView({ screen: "home" });
  };

  /** Explicitly navigate to the home tab (e.g. after onboarding or "Browse More"). */
  const goHome = () => {
    setView({ screen: "home" });
    setActiveTab("home");
  };

  /** Navigate to the My Applications tab. */
  const goToApplications = () => {
    setView({ screen: "home" });
    setActiveTab("applications");
  };

  const handleJobSelect = (job: Job) => {
    setApplyError(null);
    setView({ screen: "jobDetail", job });
  };

  const handleEmployerJobSelect = (jobId: string, jobTitle: string) => {
    setView({ screen: "applicantManagement", jobId, jobTitle });
  };

  /** Navigate to job detail from a notification vacancy alert */
  const handleSelectJobById = async (jobId: string) => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select(JOB_SELECT)
        .eq("id", jobId)
        .single();

      if (error) throw error;
      if (data) {
        const mappedJob = mapSupabaseJobToJob(data as any);
        setView({ screen: "jobDetail", job: mappedJob });
      }
    } catch (err) {
      console.error("Failed to fetch job from notification:", err);
    }
  };

  const handleApply = (job: Job) => {
    // The onboarding gate above guarantees a profile exists by the time a seeker can
    // reach a job, but a failed refresh could still leave it empty — say so rather
    // than sending them to a form that would be rejected on submit.
    if (!userProfile) {
      setApplyError(t("app.profileLoadFailed"));
      return;
    }
    setApplyError(null);
    setView({
      screen: "application",
      job,
      profile: mapProfileRowToJobSeekerProfile(userProfile, job.category),
    });
  };

  const handleApplicationSubmit = (job: Job) => {
    setAppliedJobIds((prev) => new Set(prev).add(job.id));
    setCoverNoteDraft(null);
    setView({ screen: "confirmation", job });
  };

  const handleTabChange = (tab: NavTab) => {
    // Employers cannot access job-seeker-only tabs
    if (isEmployer && ["profile", "applications", "notifications"].includes(tab)) return;
    setActiveTab(tab);
    if (tab === "notifications") {
      setUnreadCount(0); // optimistically clear badge
    }
    // Switching to the home tab resets any lingering view state
    if (tab === "home") {
      setView({ screen: "home" });
    }
  };

  // ── Telegram BackButton integration ──
  // Show the native Telegram back button whenever we're not on the home screen.
  // This replaces the default close button behaviour in those sub-screens.
  useEffect(() => {
    const tgWebApp = (window as any).Telegram?.WebApp;
    if (!tgWebApp) return;

    const isSubScreen = view.screen !== "home";

    if (isSubScreen) {
      // Build the appropriate back handler for the current screen
      const handleBack = () => {
        if (view.screen === "jobDetail") {
          goBackToList();
        } else if (view.screen === "application") {
          setView({ screen: "jobDetail", job: view.job });
        } else if (view.screen === "applicantManagement") {
          setView({ screen: "home" });
        } else if (view.screen === "confirmation") {
          goHome();
        }
      };

      tgWebApp.BackButton?.show();
      tgWebApp.BackButton?.onClick(handleBack);

      return () => {
        tgWebApp.BackButton?.offClick(handleBack);
        tgWebApp.BackButton?.hide();
      };
    } else {
      tgWebApp.BackButton?.hide();
    }
  }, [view]);


  // Loading state
  const isReady = isTelegramReady && isOnboarded !== null;
  if (!isReady) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100dvh",
          background: "transparent",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ scale: [0.92, 1, 1.06, 1], opacity: [0, 1, 1, 1] }}
          transition={{ duration: 0.5, ease: "easeOut", times: [0, 0.4, 0.7, 1] }}
          style={{
            width: 72, height: 72, borderRadius: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
            // The lockup is a rounded tile on a transparent canvas, and its own
            // corner radius is ~10% of its width against this container's 22%.
            // Anything behind it therefore shows through as four arcs at the
            // corners -- which is why the old dark gradient read as a deformed
            // edge. Filling with the tile's own Signal Yellow makes the seam
            // disappear and the container's radius define the silhouette.
            background: "#F2F012",
            boxShadow: "var(--shadow-raised)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.webp" alt="JobsAdis" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </motion.div>
      </div>
    );
  }

  // Handle Banned State
  if (isBanned) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', padding: 20, textAlign: 'center', background: '#F7F8FA' }}>
        <AlertCircle size={64} color="#E5484D" style={{ marginBottom: 24 }} />
        <h2 style={{ color: '#111827', fontSize: 28, fontWeight: 'bold', marginBottom: 12 }}>{t("app.accountSuspended")}</h2>
        <p style={{ color: '#6E7686', fontSize: 16, lineHeight: 1.5 }}>
          {t("app.bannedLine1")}
          <br />
          {t("app.bannedLine2")}
        </p>
      </div>
    );
  }

  // Handle Onboarding Flow
  if (!isOnboarded) {
    return <OnboardingScreen onComplete={() => setIsOnboarded(true)} />;
  }

  // Decide what main content to render
  const renderMainContent = () => {
    // Full-screen flows override tab content
    if (view.screen === "jobDetail") {
      return (
        <JobDetailScreen
          key="jobDetail"
          job={view.job}
          isEmployer={isEmployer}
          seekerYears={userProfile?.experience_years}
          seekerGender={userProfile?.gender}
          hasApplied={appliedJobIds.has(view.job.id)}
          applyError={applyError}
          onBack={goBackToList}
          onApply={handleApply}
        />
      );
    }

    if (view.screen === "application") {
      return (
        <ApplicationScreen
          key="application"
          job={view.job}
          profile={view.profile}
          coverNote={coverNoteDraft?.jobId === view.job.id ? coverNoteDraft.text : ""}
          onCoverNoteChange={(text) => setCoverNoteDraft({ jobId: view.job.id, text })}
          onBack={() => setView({ screen: "jobDetail", job: view.job })}
          onSubmit={() => handleApplicationSubmit(view.job)}
        />
      );
    }

    if (view.screen === "confirmation") {
      return (
        <ConfirmationScreen
          key="confirmation"
          businessName={view.job.businessName}
          jobTitle={view.job.title}
          onBrowseMore={goHome}
          onViewApplications={goToApplications}
        />
      );
    }

    if (view.screen === "applicantManagement") {
      return (
        <ApplicantManagementScreen
          key="applicantManagement"
          jobId={view.jobId}
          jobTitle={view.jobTitle}
          onBack={() => setView({ screen: "home" })}
        />
      );
    }

    // Tab-based content
    switch (activeTab) {
      case "home":
        return (
          <HomeScreen
            key="home"
            onJobSelect={handleJobSelect}
            onSearchPress={() => setActiveTab("search")}
            onBellPress={() => setNotifPanelOpen(true)}
            unreadCount={unreadCount}
            profileName={userProfile?.full_name}
            seekerYears={userProfile?.experience_years}
            pageSize={pageSize}
            enableAnimations={enableAnimations}
          />
        );
      case "search":
        return <SearchScreen key="search" onJobSelect={handleJobSelect} seekerYears={userProfile?.experience_years} seekerCategories={userProfile?.selected_categories} pageSize={pageSize} enableAnimations={enableAnimations} />;
      case "applications":
        return <ApplicationsScreen key="applications" />;
      case "notifications":
        return <NotificationsScreen key="notifications" onSelectJob={handleSelectJobById} isEmployer={isEmployer} />;
      case "profile":
        return <ProfileScreen key="profile" />;
      case "dashboard":
        return <DashboardScreen key="dashboard" onJobSelect={handleEmployerJobSelect} />;
      default:
        return (
          <HomeScreen
            key="home"
            onJobSelect={handleJobSelect}
            onSearchPress={() => setActiveTab("search")}
            onBellPress={() => setNotifPanelOpen(true)}
            unreadCount={unreadCount}
            profileName={userProfile?.full_name}
            seekerYears={userProfile?.experience_years}
            pageSize={pageSize}
            enableAnimations={enableAnimations}
          />
        );
    }
  };

  return (
    <LazyMotion features={domAnimation}>
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 480,
          margin: "0 auto",
          minHeight: "100dvh",
          background: "transparent",
          overflow: "hidden",
        }}
      >
        {/* ── Main content with AnimatePresence ── */}
        <AnimatePresence mode="wait">
          {renderMainContent()}
        </AnimatePresence>

        {/* ── Bottom navigation — only shown on the home screen ── */}
        {view.screen === "home" && (
          <BottomNav
            activeTab={activeTab}
            onTabChange={handleTabChange}
            isEmployer={isEmployer}
            unreadCount={unreadCount}
          />
        )}

        {/* ── Global Notification Slide-up Panel ── */}
        <NotificationPanel
          isOpen={notifPanelOpen}
          onClose={() => setNotifPanelOpen(false)}
          isEmployer={isEmployer}
          onSelectJob={(jobId) => {
            setNotifPanelOpen(false);
            handleSelectJobById(jobId);
          }}
          onUnreadCleared={() => setUnreadCount(0)}
        />

        {/* ── Global CV Upload Progress Pill ── */}
        {/* Stays visible on ALL tabs so the user knows upload is ongoing */}
        <AnimatePresence>
          {(isUploadingCv || cvJustDone || cvFailed) && (
            <div
              style={{
                position: "fixed",
                bottom: view.screen === "home" ? 90 : 24,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 9000,
                pointerEvents: "none",
                width: "max-content",
                maxWidth: "90%",
              }}
            >
              <motion.div
                key="cv-upload-pill"
                initial={{ opacity: 0, y: 20, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.92 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 18px",
                  borderRadius: 100,
                  background: cvJustDone
                    ? "linear-gradient(135deg, #1B5CBF 0%, #164A9C 100%)"
                    : cvFailed
                    ? "linear-gradient(135deg, #E5484D 0%, #B91C1C 100%)"
                    : "var(--surface-elevated)",
                  border: cvJustDone
                    ? "1px solid rgba(74,222,128,0.4)"
                    : cvFailed
                    ? "1px solid rgba(248,113,113,0.4)"
                    : "1px solid var(--border-active)",
                  boxShadow: cvJustDone
                    ? "0 8px 24px rgba(27,92,191,0.35)"
                    : cvFailed
                    ? "0 8px 24px rgba(220,38,38,0.35)"
                    : "0 8px 24px rgba(0,0,0,0.2)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  whiteSpace: "nowrap",
                  pointerEvents: "auto",
                }}
              >
                {cvJustDone ? (
                  <>
                    <CheckCircle size={16} color="#fff" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                      {t("app.cvUploaded")}
                    </span>
                  </>
                ) : cvFailed ? (
                  <>
                    <AlertCircle size={16} color="#fff" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", textOverflow: "ellipsis", overflow: "hidden" }}>
                      {errorMessage || t("app.cvUploadFailed")}
                    </span>
                  </>
                ) : (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    >
                      <Loader2 size={16} color="var(--brand)" />
                    </motion.div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                      {t("app.cvUploading")}
                    </span>
                  </>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </LazyMotion>
  );
}
