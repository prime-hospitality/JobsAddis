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
  const marqueeRef = useRef<HTMLDivElement>(null);
  const isInteracting = useRef(false);
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

  // Marquee auto-scroll logic
  useEffect(() => {
    const el = marqueeRef.current;
    if (!el || shouldReduceMotion) return;

    let animationFrameId: number;
    const speed = 0.5; // pixels per frame

    const scroll = () => {
      if (!isInteracting.current && el) {
        el.scrollLeft += speed;
        // Seamless infinite loop: duplicate items must be in the list
        // Reset when scrolled past halfway point
        if (el.scrollLeft >= el.scrollWidth / 2) {
          el.scrollLeft -= el.scrollWidth / 2;
        }
      }
      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);

    const handleTouchStart = () => { isInteracting.current = true; };
    const handleTouchEnd = () => { isInteracting.current = false; };

    el.addEventListener('touchstart', handleTouchStart);
    el.addEventListener('touchend', handleTouchEnd);
    el.addEventListener('mousedown', handleTouchStart);
    el.addEventListener('mouseup', handleTouchEnd);
    el.addEventListener('mouseleave', handleTouchEnd);

    return () => {
      cancelAnimationFrame(animationFrameId);
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('mousedown', handleTouchStart);
      el.removeEventListener('mouseup', handleTouchEnd);
      el.removeEventListener('mouseleave', handleTouchEnd);
    };
  }, [shouldReduceMotion]);

  // Load real active jobs from Supabase
  const { jobs, isLoading, error, refetch } = useJobs(null);

  // Track dark mode to handle hero illustration visibility
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.getAttribute("data-theme") === "dark";
  });
  useEffect(() => {
    const handleTheme = () => setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
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
            paddingBottom: 8,
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
              marginBottom: 12,
            }}
          >
            <div>
              {/* Logo mark */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 0 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#0D1F0D",
                    flexShrink: 0,
                  }}
                >
                  <img 
                    src="/logo.png" 
                    alt="Logo" 
                    style={{ 
                      width: "100%", 
                      height: "100%", 
                      objectFit: "cover",
                      mixBlendMode: "screen"
                    }} 
                  />
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
          {/* Hero Section Carousel */}
          <div 
            style={{ 
              display: "flex", 
              overflowX: "auto", 
              scrollSnapType: "x mandatory", 
              gap: 16, 
              marginBottom: 0,
              paddingBottom: 0,
              scrollbarWidth: "none", // Firefox
              msOverflowStyle: "none", // IE
              alignItems: "flex-start",
            }}
            className="no-scrollbar"
          >
            {/* Slide 1: Original */}
            <div style={{ flex: "0 0 100%", scrollSnapAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 140, padding: "24px 0", overflow: "hidden", position: "relative" }}>
              {/* Top row: heading + illustration */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                  <div style={{ position: "absolute", width: 12, height: 12, borderRadius: "50%", background: "var(--brand-light)", top: 10, left: -20, opacity: 0.8 }} />
                  <div style={{ position: "absolute", width: 8, height: 8, borderRadius: "50%", background: "var(--brand)", bottom: 20, left: -10, opacity: 0.6 }} />
                  <div style={{ position: "absolute", width: 14, height: 14, borderRadius: "50%", background: "var(--brand-dim)", top: 40, right: -15, opacity: 0.7 }} />
                  <img 
                    src="/hero_illustration.png" 
                    alt="Briefcase illustration" 
                    style={{ 
                      position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "contain", mixBlendMode: "multiply",
                      opacity: isDark ? 0 : 1, transition: "opacity 0.3s ease" 
                    }} 
                  />
                  <img 
                    src="/hero_illustration_dark.png" 
                    alt="Briefcase illustration dark" 
                    style={{ 
                      position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "contain", mixBlendMode: "screen",
                      opacity: isDark ? 1 : 0, transition: "opacity 0.3s ease" 
                    }} 
                  />
                </div>
              </div>

              {/* Trusted By logo strip inside slide 1 */}
              <div style={{ marginTop: 20 }}>
                <p style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10, opacity: 0.5 }}>
                  Trusted by
                </p>
                <div style={{ 
                  display: "flex", 
                  overflowX: "auto", 
                  gap: 10,
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                  paddingBottom: 4,
                }}
                className="no-scrollbar"
                ref={marqueeRef}
                >
                  {([
                    { name: "Stay Easy Plus Hotel", domain: "stayeasyplus.com" },
                    { name: "Go-Fresh", domain: "gofreshet.com", logoUrl: "https://gofreshet.com/wp-content/uploads/2025/04/GoFresh.png" },
                    { name: "Marriott", domain: "marriott.com" },
                    { name: "Best Western Plus", domain: "bestwestern.com" },
                    { name: "Illy Coffee", domain: "illy.com" },
                    { name: "Harmony Hotel", domain: "harmonyhotelethiopia.com", logoUrl: "https://www.harmonyhotelethiopia.com/assets/harmony_logo.png" },
                    { name: "Sapphire Addis", domain: "sapphireaddishotel.com" },
                    { name: "Elilly Hotel", domain: "elillyhotel.com" },
                    { name: "DoubleTree by Hilton", domain: "hilton.com" },
                    { name: "Inter-Luxury Hotel", domain: "interluxuryhotel.com" },
                    { name: "Union Restaurant", domain: "union-restaurant.com", logoUrl: "https://lh6.googleusercontent.com/-axw_gU_yDAk/AAAAAAAAAAI/AAAAAAAAAAA/IO7BkLv8kwk/s128-c-k-mo/photo.jpg" },
                    { name: "Swiss Inn Nexus Hotel", domain: "swissinn.net", logoUrl: "/swiss_inn_nexus_logo.png" },
                    { name: "Getfam Hotel", domain: "getfamhotel.com" },
                    { name: "Amrogn Chicken", domain: "amrogn.com", logoUrl: "https://amrogn.com/assets/images/Amrognlogo.png" },
                    { name: "Celavie Burger & Chicken", domain: "celavie.com", logoUrl: "https://static.playfood.com/pr/ride/img/vendor/1337/logo/e53a60efaa1641ffb08f1004c9646b0d_w162h162" },
                    // Duplicate for seamless infinite auto-scroll
                    { name: "Stay Easy Plus Hotel", domain: "stayeasyplus.com" },
                    { name: "Go-Fresh", domain: "gofreshet.com", logoUrl: "https://gofreshet.com/wp-content/uploads/2025/04/GoFresh.png" },
                    { name: "Marriott", domain: "marriott.com" },
                    { name: "Best Western Plus", domain: "bestwestern.com" },
                    { name: "Illy Coffee", domain: "illy.com" },
                    { name: "Harmony Hotel", domain: "harmonyhotelethiopia.com", logoUrl: "https://www.harmonyhotelethiopia.com/assets/harmony_logo.png" },
                    { name: "Sapphire Addis", domain: "sapphireaddishotel.com" },
                    { name: "Elilly Hotel", domain: "elillyhotel.com" },
                    { name: "DoubleTree by Hilton", domain: "hilton.com" },
                    { name: "Inter-Luxury Hotel", domain: "interluxuryhotel.com" },
                    { name: "Union Restaurant", domain: "union-restaurant.com", logoUrl: "https://lh6.googleusercontent.com/-axw_gU_yDAk/AAAAAAAAAAI/AAAAAAAAAAA/IO7BkLv8kwk/s128-c-k-mo/photo.jpg" },
                    { name: "Swiss Inn Nexus Hotel", domain: "swissinn.net", logoUrl: "/swiss_inn_nexus_logo.png" },
                    { name: "Getfam Hotel", domain: "getfamhotel.com" },
                    { name: "Amrogn Chicken", domain: "amrogn.com", logoUrl: "https://amrogn.com/assets/images/Amrognlogo.png" },
                    { name: "Celavie Burger & Chicken", domain: "celavie.com", logoUrl: "https://static.playfood.com/pr/ride/img/vendor/1337/logo/e53a60efaa1641ffb08f1004c9646b0d_w162h162" },
                  ] as { name: string; domain: string; logoUrl?: string; noLogo?: boolean; initial?: string; color?: string }[]).map((hotel, i) => (
                    <div key={i} style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "6px 14px 6px 8px",
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                    }}>
                      {hotel.noLogo ? (
                        <div style={{
                          width: 30, height: 30, borderRadius: 6,
                          background: hotel.color,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: "white" }}>{hotel.initial}</span>
                        </div>
                      ) : (
                        <img
                          src={hotel.logoUrl ?? `https://www.google.com/s2/favicons?domain=${hotel.domain}&sz=64`}
                          alt={hotel.name}
                          style={{ minWidth: 30, width: "auto", maxWidth: 70, height: 30, borderRadius: 6, objectFit: "contain", background: "white" }}
                        />
                      )}
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                        {hotel.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Slide 2: New Card Design */}
            <div style={{ 
              flex: "0 0 100%", 
              scrollSnapAlign: "center", 
              background: "var(--brand-subtle)", 
              borderRadius: 20, 
              padding: "24px 20px",
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              position: "relative",
              overflow: "hidden",
              minHeight: 140
            }}>
              <div style={{ flex: 1, zIndex: 1, paddingRight: 140 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
                  Discover<br/>
                  <span style={{ color: "var(--brand)" }}>hospitality jobs</span><br/>
                  that fit you.
                </h1>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 10, marginBottom: 16, fontWeight: 500, position: "relative", zIndex: 2 }}>
                  Find top opportunities in Ethiopia and build your future.
                </p>
                <button 
                  onClick={onSearchPress}
                  style={{ 
                  background: "var(--brand)", 
                  color: "white", 
                  padding: "10px 20px", 
                  borderRadius: 12, 
                  fontWeight: 600, 
                  fontSize: 14, 
                  border: "none", 
                  display: "inline-flex", 
                  alignItems: "center", 
                  gap: 8,
                  boxShadow: "0 4px 12px rgba(34, 197, 94, 0.3)",
                  cursor: "pointer"
                }}>
                  Find Jobs <span style={{ fontSize: 16 }}>→</span>
                </button>
              </div>
              
              {/* Illustration for Slide 2 */}
              <div style={{ position: "absolute", right: -30, bottom: -10, width: 180, height: 180, zIndex: 0 }}>
                <img 
                  src="/hero_slide_2.png" 
                  alt="Chair and suitcase illustration" 
                  style={{ 
                    position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "contain", mixBlendMode: "multiply",
                    opacity: isDark ? 0 : 1, transition: "opacity 0.3s ease"
                  }} 
                />
                <img 
                  src="/hero_slide_2_dark.png" 
                  alt="Chair and suitcase illustration dark mode" 
                  style={{ 
                    position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "contain", mixBlendMode: "screen",
                    opacity: isDark ? 1 : 0, transition: "opacity 0.3s ease"
                  }} 
                />
              </div>
            </div>
          </div>
          
          <style dangerouslySetInnerHTML={{__html: `
            .no-scrollbar::-webkit-scrollbar {
              display: none;
            }
            @keyframes marquee {
              0%   { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .marquee-track {
              display: flex;
              width: max-content;
              animation: marquee 22s linear infinite;
            }
            .marquee-track:hover {
              animation-play-state: paused;
            }
          `}} />


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
                value: "1000+",
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


