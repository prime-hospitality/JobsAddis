"use client";

import { useEffect, useState } from "react";
import { isSilentFetch, isRouteNavigation } from "@/lib/silentFetch";
// import { Loader2 } from "lucide-react"; // No longer needed

/** Don't show the overlay for anything faster than this — it'd be a blink. */
const SHOW_DELAY_MS = 300;
/** Once shown, hold it this long. Otherwise a 320ms request strobes on/off. */
const MIN_VISIBLE_MS = 400;

export function GlobalFetchInterceptor() {
  const [isLoading, setIsLoading] = useState(false);
  // True while the overlay is only still up to see out MIN_VISIBLE_MS — nothing
  // is actually in flight. It must not swallow clicks during that stretch: the
  // result is already on screen, so this is exactly when someone reaches for the
  // button they just got an error about.
  const [lingering, setLingering] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch;
    let activeRequests = 0;
    let showTimer: ReturnType<typeof setTimeout> | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let shownAt = 0;

    const hide = () => {
      if (showTimer) {
        clearTimeout(showTimer);
        showTimer = null;
      }
      // Never actually became visible — nothing to tear down.
      if (!shownAt) return;

      const remaining = MIN_VISIBLE_MS - (Date.now() - shownAt);
      if (remaining <= 0) {
        shownAt = 0;
        setIsLoading(false);
        return;
      }
      setLingering(true);
      hideTimer = setTimeout(() => {
        hideTimer = null;
        shownAt = 0;
        setLingering(false);
        setIsLoading(false);
      }, remaining);
    };

    window.fetch = async (...args) => {
      // Background polls (dashboard/activity-log refresh) wrap themselves in
      // runSilently() so they don't flash this overlay on every tick.
      const background = isSilentFetch() || isRouteNavigation(args[0], args[1]);

      if (!background) {
        activeRequests++;

        if (activeRequests === 1) {
          // A new request while we're waiting out MIN_VISIBLE_MS: keep the
          // overlay up rather than hiding it just to show it again.
          if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
            setLingering(false);
          }
          if (!shownAt && !showTimer) {
            showTimer = setTimeout(() => {
              showTimer = null;
              shownAt = Date.now();
              setIsLoading(true);
            }, SHOW_DELAY_MS);
          }
        }
      }

      try {
        const response = await originalFetch(...args);
        return response;
      } finally {
        if (!background) {
          activeRequests--;
          if (activeRequests === 0) hide();
        }
      }
    };

    return () => {
      // Restore on unmount
      window.fetch = originalFetch;
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  if (!isLoading) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255, 255, 255, 0.4)",
        backdropFilter: "blur(2px)",
        pointerEvents: lingering ? "none" : "auto",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "16px",
          borderRadius: "50%",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "fadeIn 0.2s ease-out",
        }}
      >
        {/* The mark sits bare on the brand's yellow field — it is a fill, never
            an ink colour, so the blue mark reads directly against it. */}
        <div
          style={{
            width: 58, height: 58, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "#F2F012",
            border: "1.5px solid #E2E5EC",
            boxShadow: "0 4px 12px rgba(20, 24, 33, 0.05)",
            animation: "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        >
          <img
            src="/addis_jobs_logo.webp"
            alt="Loading..."
            style={{ width: 40, height: 40, objectFit: "contain" }}
          />
        </div>
        <style>
          {`
            @keyframes pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: .5; transform: scale(0.95); }
            }
          `}
        </style>
      </div>
    </div>
  );
}
