"use client";

import { useEffect, useState } from "react";
import { isEmployer } from "@/data/employers";

export interface TelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
}

/** Device hardware info exposed by Telegram Mini App SDK (Android only for now) */
export interface DeviceInfo {
  os: string | null;
  appVersion: string | null;
  sdkVersion: string | null;
  model: string | null;
  /** Telegram-computed benchmark class for the device */
  performanceClass: "high" | "medium" | "low" | null;
}

interface UseTelegramReturn {
  user: TelegramUser | null;
  initData: string | null; // Raw initData string for Edge Function auth header
  isReady: boolean;
  isEmployer: boolean;
  startParam: string | null;
  deviceInfo: DeviceInfo;
}

// Mock user for dev/browser environment (not inside Telegram)
const MOCK_DEV_USER: TelegramUser = {
  id: 123456789,
  firstName: "Biruk",
  lastName: "Tadesse",
  username: "birukt",
};

/** Dev fallback — assume high-end device so full experience renders in browser */
const MOCK_DEV_DEVICE_INFO: DeviceInfo = {
  os: "web",
  appVersion: null,
  sdkVersion: null,
  model: null,
  performanceClass: "high",
};

export function useTelegram(): UseTelegramReturn {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [initData, setInitData] = useState<string | null>(null);
  const [startParam, setStartParam] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(MOCK_DEV_DEVICE_INFO);

  useEffect(() => {
    const init = async () => {
      try {
        // Attempt to load Telegram WebApp data from window.Telegram
        const tgWebApp = (window as any).Telegram?.WebApp;
        if (typeof window !== "undefined" && tgWebApp?.initDataUnsafe?.user) {
          // ── Full-screen: expand to fill the entire Telegram screen ──
          // expand() works on all Telegram versions
          tgWebApp.expand();
          // requestFullscreen() is supported on Telegram 7.7+ (silently ignored on older)
          tgWebApp.requestFullscreen?.();
          // Disable vertical swipe-to-close so users don't accidentally dismiss the app
          tgWebApp.disableVerticalSwipes?.();
          // Enable closing confirmation to prevent accidental exits
          tgWebApp.enableClosingConfirmation?.();
          // ── Theme Syncing ──
          // Helper to apply the current active theme
          const applyActiveTheme = () => {
            // Ignore Telegram's native colorScheme to force light mode by default
            let activeScheme = "light";
            try {
              const saved = localStorage.getItem("theme");
              if (saved === "dark" || saved === "light") {
                activeScheme = saved;
              }
            } catch (e) {}

            if (activeScheme === "dark") {
              document.documentElement.setAttribute("data-theme", "dark");
            } else {
              document.documentElement.removeAttribute("data-theme");
            }

            const bgPrimary = activeScheme === "dark" ? "#121212" : "#F9FAFB";
            const surfaceColor = activeScheme === "dark" ? "#1A1A1A" : "#FFFFFF";
            
            tgWebApp.setHeaderColor?.(bgPrimary);
            tgWebApp.setBackgroundColor?.(bgPrimary);
            tgWebApp.setBottomBarColor?.(surfaceColor);
          };

          // Apply immediately on launch
          applyActiveTheme();

          // Re-evaluate if Telegram's native theme changes
          tgWebApp.onEvent?.("themeChanged", applyActiveTheme);
          
          // Add a custom event listener so our ProfileScreen toggle can notify this hook
          if (typeof window !== "undefined") {
            window.addEventListener("themeToggle", applyActiveTheme);
          }

          const tgUser = tgWebApp.initDataUnsafe.user;
          setUser({
            id: tgUser.id,
            firstName: tgUser.first_name,
            lastName: tgUser.last_name,
            username: tgUser.username,
            photoUrl: tgUser.photo_url,
          });
          // Capture the raw initData string for use in Edge Function auth headers
          setInitData(tgWebApp.initData || null);
          setStartParam(tgWebApp.initDataUnsafe.start_param || null);
          // ── Hardware device info (Telegram SDK, Android) ──
          // deviceInfo is undefined on older SDK versions — use optional chaining throughout
          const di = tgWebApp.deviceInfo;
          if (di) {
            setDeviceInfo({
              os: di.platform ?? tgWebApp.platform ?? null,
              appVersion: di.app_version ?? tgWebApp.version ?? null,
              sdkVersion: di.sdk_version ?? null,
              model: di.model ?? null,
              performanceClass: di.performance_class ?? null,
            });
          } else {
            // Older SDK: read what we can from the top-level WebApp object
            setDeviceInfo({
              os: tgWebApp.platform ?? null,
              appVersion: tgWebApp.version ?? null,
              sdkVersion: null,
              model: null,
              performanceClass: null, // unknown — treated as medium by usePerformance
            });
          }
        } else {
          // Fallback for dev/browser environment — no real initData available
          setUser(MOCK_DEV_USER);
          setInitData(null); // null in dev; Edge Function will handle gracefully
          setStartParam(null);
        }
      } catch {
        setUser(MOCK_DEV_USER);
        setInitData(null);
        setStartParam(null);
        setDeviceInfo(MOCK_DEV_DEVICE_INFO);
      } finally {
        setIsReady(true);
      }
    };

    init();
  }, []);

  return {
    user,
    initData,
    isReady,
    isEmployer: user ? isEmployer(user.id) : false,
    startParam,
    deviceInfo,
  };
}
