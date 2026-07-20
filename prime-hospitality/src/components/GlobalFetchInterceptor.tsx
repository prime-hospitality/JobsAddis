"use client";

import { useEffect } from "react";
import NProgress from "nprogress";

export function GlobalFetchInterceptor() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch;
    let activeRequests = 0;
    let timer: NodeJS.Timeout | null = null;

    window.fetch = async (...args) => {
      activeRequests++;
      
      // Delay NProgress start to avoid flashing on very quick requests
      if (activeRequests === 1) {
        timer = setTimeout(() => {
          NProgress.start();
        }, 300); // 300ms threshold
      }

      try {
        const response = await originalFetch(...args);
        return response;
      } finally {
        activeRequests--;
        if (activeRequests === 0) {
          if (timer) clearTimeout(timer);
          NProgress.done();
        }
      }
    };

    return () => {
      // Restore on unmount
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
