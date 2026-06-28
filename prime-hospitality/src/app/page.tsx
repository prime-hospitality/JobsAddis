"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, LazyMotion, domAnimation } from "framer-motion";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Job } from "@/data/jobs";
import { JobSeekerProfile } from "@/data/profile";
import { useTelegram } from "@/hooks/useTelegram";
import { useCvUpload } from "@/hooks/useCvUpload";
import { fetchProfile, getUnreadCount } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { mapSupabaseJobToJob } from "@/hooks/useJobs";

import BottomNav, { NavTab } from "@/components/BottomNav";
import HomeScreen from "@/screens/HomeScreen";
import JobDetailScreen from "@/screens/JobDetailScreen";
import ProfileCheckScreen from "@/screens/ProfileCheckScreen";
import ApplicationScreen from "@/screens/ApplicationScreen";
import ConfirmationScreen from "@/screens/ConfirmationScreen";
import OnboardingScreen from "@/screens/OnboardingScreen";
import ApplicationsScreen from "@/screens/ApplicationsScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import SearchScreen from "@/screens/SearchScreen";
import DashboardScreen from "@/screens/DashboardScreen";
import ApplicantManagementScreen from "@/screens/ApplicantManagementScreen";
import NotificationsScreen from "@/screens/NotificationsScreen";

// ── App navigation state ──
type AppView =
  | { screen: "home" }
  | { screen: "jobDetail"; job: Job }
  | { screen: "profileCheck"; job: Job }
  | { screen: "application"; job: Job; profile: JobSeekerProfile }
  | { screen: "confirmation"; job: Job }
  | { screen: "applicantManagement"; jobId: string; jobTitle: string };

// Keys to wipe when a user is deleted or needs to re-onboard.
// 'theme' is intentionally excluded — we keep their display preference.
const USER_LOCAL_KEYS = ["profile_privacy_dismissed"];

function clearUserLocalData() {
  try {
    USER_LOCAL_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {}
}

export default function App() {
  const { user, isEmployer: telegramIsEmployer, isReady: isTelegramReady, initData, startParam } = useTelegram();
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
  const [cvJustDone, setCvJustDone] = useState(false);
  const [cvFailed, setCvFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const prevUploadingRef = useRef(false);
  const [activeTab, setActiveTab] = useState<NavTab>(telegramIsEmployer ? "dashboard" : "home");
  const [view, setView] = useState<AppView>({ screen: "home" });
  const [unreadCount, setUnreadCount] = useState(0);

  // Track when upload transitions from true → false to flash a "Done" tick or show error
  useEffect(() => {
    if (prevUploadingRef.current && !isUploadingCv) {
      if (cvUploadError) {
        setCvFailed(true);
        setErrorMessage(cvUploadError);
        const t = setTimeout(() => setCvFailed(false), 4000);
        return () => clearTimeout(t);
      } else {
        setCvJustDone(true);
        const t = setTimeout(() => setCvJustDone(false), 3000);
        return () => clearTimeout(t);
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
            .select(`
              id,
              employer_id,
              title,
              category,
              location,
              neighborhood,
              job_type,
              salary_min,
              salary_max,
              currency,
              description,
              full_description,
              requirements,
              deadline,
              status,
              created_at,
              quantity,
              employers (
                business_name,
                business_type,
                logo_url
              )
            `)
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
        .select(`
          id,
          employer_id,
          title,
          category,
          location,
          neighborhood,
          job_type,
          salary_min,
          salary_max,
          currency,
          description,
          full_description,
          requirements,
          deadline,
          status,
          created_at,
          quantity,
          employers (
            business_name,
            business_type,
            logo_url
          )
        `)
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
    setView({ screen: "profileCheck", job });
  };

  const handleProfileChecked = (job: Job, profile: JobSeekerProfile) => {
    setView({ screen: "application", job, profile });
  };

  const handleApplicationSubmit = (job: Job) => {
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
          animate={{ scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: 72, height: 72, borderRadius: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
            background: "linear-gradient(145deg, rgba(45,50,70,1) 0%, rgba(15,20,35,1) 100%)",
            boxShadow: "0 12px 24px rgba(0,0,0,0.7), 0 4px 8px rgba(0,0,0,0.5), inset 0 2px 2px rgba(255,255,255,0.15), inset 0 -2px 4px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(5,150,105,0.5)",
          }}
        >
          <img src="/logo.png" alt="Prime Hospitality Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </motion.div>
      </div>
    );
  }

  // Handle Banned State
  if (isBanned) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', padding: 20, textAlign: 'center', background: '#f9fafb' }}>
        <AlertCircle size={64} color="#EF4444" style={{ marginBottom: 24 }} />
        <h2 style={{ color: '#111827', fontSize: 28, fontWeight: 'bold', marginBottom: 12 }}>Account Suspended</h2>
        <p style={{ color: '#6B7280', fontSize: 16, lineHeight: 1.5 }}>
          You have been banned from using this application.
          <br />
          Please contact support if you believe this is a mistake.
        </p>
      </div>
    );
  }

  // Handle Onboarding Flow
  if (!isOnboarded) {
    return <OnboardingScreen onComplete={() => setIsOnboarded(true)} />;
  }

  // ── Determine which full-screen flow is active ──
  const isInFlow =
    view.screen !== "home" &&
    view.screen !== "confirmation" &&
    view.screen !== "applicantManagement";

  // Decide what main content to render
  const renderMainContent = () => {
    // Full-screen flows override tab content
    if (view.screen === "jobDetail") {
      return (
        <JobDetailScreen
          key="jobDetail"
          job={view.job}
          isEmployer={isEmployer}
          onBack={goBackToList}
          onApply={handleApply}
        />
      );
    }

    if (view.screen === "profileCheck") {
      return (
        <ProfileCheckScreen
          key="profileCheck"
          job={view.job}
          onBack={() => setView({ screen: "jobDetail", job: view.job })}
          onProceed={(profile) => handleProfileChecked(view.job, profile)}
        />
      );
    }

    if (view.screen === "application") {
      return (
        <ApplicationScreen
          key="application"
          job={view.job}
          profile={view.profile}
          onBack={() => setView({ screen: "profileCheck", job: view.job })}
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
            profileName={userProfile?.full_name}
          />
        );
      case "search":
        return <SearchScreen key="search" onJobSelect={handleJobSelect} />;
      case "applications":
        return <ApplicationsScreen key="applications" />;
      case "notifications":
        return <NotificationsScreen key="notifications" onSelectJob={handleSelectJobById} />;
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
            profileName={userProfile?.full_name}
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
                    ? "linear-gradient(135deg, #059669 0%, #047857 100%)"
                    : cvFailed
                    ? "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)"
                    : "var(--surface-elevated)",
                  border: cvJustDone
                    ? "1px solid rgba(74,222,128,0.4)"
                    : cvFailed
                    ? "1px solid rgba(248,113,113,0.4)"
                    : "1px solid var(--border-active)",
                  boxShadow: cvJustDone
                    ? "0 8px 24px rgba(5,150,105,0.35)"
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
                      CV uploaded!
                    </span>
                  </>
                ) : cvFailed ? (
                  <>
                    <AlertCircle size={16} color="#fff" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", textOverflow: "ellipsis", overflow: "hidden" }}>
                      {errorMessage || "Upload failed"}
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
                      Uploading CV…
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
