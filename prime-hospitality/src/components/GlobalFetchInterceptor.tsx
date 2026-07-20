"use client";

import { useEffect, useState } from "react";
// import { Loader2 } from "lucide-react"; // No longer needed

export function GlobalFetchInterceptor() {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch;
    let activeRequests = 0;
    let timer: NodeJS.Timeout | null = null;

    window.fetch = async (...args) => {
      activeRequests++;
      
      // Delay loader to avoid flashing on very quick requests
      if (activeRequests === 1) {
        timer = setTimeout(() => {
          setIsLoading(true);
        }, 300); // 300ms threshold
      }

      try {
        const response = await originalFetch(...args);
        return response;
      } finally {
        activeRequests--;
        if (activeRequests === 0) {
          if (timer) clearTimeout(timer);
          setIsLoading(false);
        }
      }
    };

    return () => {
      // Restore on unmount
      window.fetch = originalFetch;
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
        <img 
          src="/addis_jobs_logo.png" 
          alt="Loading..." 
          style={{ width: 40, height: 40, objectFit: "contain", animation: "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} 
        />
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
