"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { motion, useReducedMotion, LazyMotion, domAnimation } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Search, Bell } from "lucide-react";
import { Job } from "@/data/jobs";

import JobCard from "@/components/JobCard";

import { useJobs } from "@/hooks/useJobs";
import { useTelegram } from "@/hooks/useTelegram";

interface HomeScreenProps {
  onJobSelect: (job: Job) => void;
  onSearchPress?: () => void;
  profileName?: string;
}

let businessAnimationHasRun = false;

export default function HomeScreen({ onJobSelect, onSearchPress, profileName }: HomeScreenProps) {

  const shouldReduceMotion = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useTelegram();
  
  // Animated businesses counter
  const [businessCount, setBusinessCount] = useState(businessAnimationHasRun ? 200 : 0);

  useEffect(() => {
    if (businessAnimationHasRun) return;

    let startTimestamp: number | null = null;
    const duration = 1200; // 1.2 seconds
    const startValue = 0;
    const endValue = 200;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      
      const currentCount = Math.floor(progress * (endValue - startValue) + startValue);
      setBusinessCount(currentCount);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        businessAnimationHasRun = true;
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Load real active jobs from Supabase
  const { jobs, isLoading, error, refetch } = useJobs(null);

  // Track dark mode so hero illustration blend mode is correct
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.getAttribute("data-theme") === "dark";
  });

  useEffect(() => {
    const handleTheme = () => {
      setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    };
    window.addEventListener("themeToggle", handleTheme);
    return () => window.removeEventListener("themeToggle", handleTheme);
  }, []);

  const virtualizer = useVirtualizer({
    count: jobs.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: useCallback(() => 180, []),
    measureElement: useCallback((el: Element) => el.getBoundingClientRect().height, []),
    overscan: 3,
  });

  return (
    <LazyMotion features={domAnimation}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100dvh",
          background: "transparent",
          overflow: "hidden",
        }}
      >
        {/* ── HEADER ── */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="safe-screen-top"
          style={{
            paddingLeft: 20,
            paddingRight: 20,
            paddingBottom: 16,
            background: "var(--app-bg)",
            position: "relative",
            flexShrink: 0,
          }}
        >
          {/* Brand row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <div>
              {/* Logo mark */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 0 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(145deg, rgba(45,50,70,1) 0%, rgba(15,20,35,1) 100%)",
                    boxShadow: "0 6px 12px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -1px 2px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(5,150,105,0.5)"
                  }}
                >
                  <img src="/logo.png" alt="Logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <span
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    color: "var(--text-primary)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Prime{" "}
                  <span
                    className="text-brand-gradient"
                    style={{ fontWeight: 800 }}
                  >
                    Hospitality
                  </span>
                </span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)", marginLeft: 40, marginTop: -2 }}>
                Jobs Addis
              </p>
            </div>

            {/* Notification bell */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "var(--card)",
                border: "1px solid var(--border)",
                boxShadow: "var(--card-shadow)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <Bell size={18} color="var(--text-secondary)" />
            </motion.button>
          </div>

          {/* Hero Section */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 34, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.15, letterSpacing: "-0.03em" }}>
                Find your<br />
                <span style={{ color: "var(--brand)", position: "relative", display: "inline-block" }}>
                  next job
                  {/* Decorative curved underline */}
                  <svg style={{ position: "absolute", bottom: -8, left: 0, width: "100%", height: 12 }} viewBox="0 0 100 12" preserveAspectRatio="none">
                    <path d="M0 8 Q 50 0 100 8" stroke="var(--brand)" strokeWidth="3" fill="none" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 16, fontWeight: 500 }}>
                Top hospitality jobs in Ethiopia.
              </p>
            </div>
            
            {/* Illustration */}
            <div style={{ 
              width: 120, 
              height: 120, 
              borderRadius: "50%", 
              background: "var(--brand-subtle)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              position: "relative",
              flexShrink: 0,
              marginLeft: 16
            }}>
              {/* Decorative floating dots */}
              <div style={{ position: "absolute", width: 12, height: 12, borderRadius: "50%", background: "var(--brand-light)", top: 10, left: -20, opacity: 0.8 }} />
              <div style={{ position: "absolute", width: 8, height: 8, borderRadius: "50%", background: "var(--brand)", bottom: 20, left: -10, opacity: 0.6 }} />
              <div style={{ position: "absolute", width: 14, height: 14, borderRadius: "50%", background: "var(--brand-dim)", top: 40, right: -15, opacity: 0.7 }} />
              
              <img 
                src="/hero_illustration.png" 
                alt="Briefcase illustration" 
                style={{ 
                  width: "140%", 
                  height: "140%", 
                  objectFit: "contain", 
                  position: "absolute", 
                  right: -10, 
                  top: -10,
                  mixBlendMode: isDark ? "screen" : "multiply",
                }} 
              />
            </div>
          </div>

          {/* Search bar — tapping navigates to Search tab */}
          <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={onSearchPress}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "var(--card)",
              border: "1px solid var(--border)",
              boxShadow: "var(--card-shadow)",
              borderRadius: 14,
              padding: "12px 16px",
              marginBottom: 16,
              cursor: onSearchPress ? "pointer" : "default",
            }}
          >
            <Search size={18} color="var(--text-muted)" />
            <span style={{ fontSize: 15, color: "var(--text-muted)" }}>
              Search jobs in Addis Ababa…
            </span>
          </motion.div>

          {/* Stats bar */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 4,
            }}
          >
            {[
              {
                value: `${jobs.length}+`,
                label: "Open Jobs",
                valueColor: "var(--brand)",
              },
              {
                value: businessCount === 200 ? "200+" : `${businessCount}`,
                label: "Businesses",
                valueColor: "var(--brand)",
              },
              {
                value: "50k+",
                label: "Job Seekers",
                valueColor: "var(--brand)",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  flex: 1,
                  background: "transparent",
                  borderRadius: 10,
                  padding: "8px 6px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: stat.valueColor,
                    lineHeight: 1,
                    marginBottom: 2,
                  }}
                >
                  {stat.value}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </motion.div>



        {/* ── SECTION HEADER ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingLeft: 20,
            paddingRight: 20,
            marginBottom: 8,
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            All Jobs{" "}
            <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>
              ({jobs.length})
            </span>
          </h2>
          <button
            onClick={refetch}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--brand)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>

        {/* ── JOB LIST OR STATES ── */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            paddingLeft: 20,
            paddingRight: 20,
            paddingBottom: 80, // space for bottom nav
            scrollBehavior: "smooth",
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
          } as React.CSSProperties}
        >
          {isLoading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="shimmer"
                  style={{
                    height: 140,
                    borderRadius: 16,
                    border: "1px solid var(--border)",
                  }}
                />
              ))}
            </div>
          )}

          {!isLoading && error && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <p style={{ color: "#FCA5A5", fontSize: 14, marginBottom: 12 }}>{error}</p>
              <button
                onClick={refetch}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--brand)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
            </div>
          )}

          {!isLoading && !error && jobs.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                No active jobs found.
              </p>
            </div>
          )}

          {!isLoading && !error && jobs.length > 0 && (
            <div
              style={{
                height: virtualizer.getTotalSize(),
                width: "100%",
                position: "relative",
              }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const job = jobs[virtualItem.index];
                if (!job) return null;
                return (
                  <div
                    key={job.id}
                    data-index={virtualItem.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <JobCard
                      job={job}
                      onClick={onJobSelect}
                      index={virtualItem.index}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </LazyMotion>
  );
}


