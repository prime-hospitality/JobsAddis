"use client";

import { useEffect, useState } from "react";
import AdminDashboard from "./AdminDashboard";
import AdminLogin from "./AdminLogin";
import { getAdminData, getCurrentAdminUsername } from "./actions";
import { runSilently } from "@/lib/silentFetch";
import { AdminUiState } from "@/lib/adminUiCookie";
import { getTabUser, clearTabUser } from "@/lib/adminTabSession";

type Status = "checking" | "locked" | "unlocked";

// Decides, per browser tab, whether to show the dashboard or the login page.
// The auth cookie alone is not enough — a tab must have been "unlocked" by an
// actual login in that tab (see lib/adminTabSession). A brand-new tab therefore
// shows the login page even though the shared cookie is present.
export default function AdminSessionGate({ initialUi }: { initialUi: Partial<AdminUiState> }) {
  const [status, setStatus] = useState<Status>("checking");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;

    const tabUser = getTabUser();
    if (!tabUser) {
      // This tab was never logged into — require a fresh login.
      setStatus("locked");
      return;
    }

    (async () => {
      try {
        // Fetch data only after confirming this tab is unlocked, so a locked
        // tab never receives the dashboard data at all.
        const fresh = await runSilently(() => getAdminData());
        if (cancelled) return;
        // Guard against a session takeover: the shared cookie may now belong to
        // a different admin than the one who unlocked this tab.
        if (!fresh?.loggedInAdmin || fresh.loggedInAdmin.username !== tabUser) {
          clearTabUser();
          setStatus("locked");
          return;
        }
        setData(fresh);
        setStatus("unlocked");
      } catch {
        // No/invalid session — show login.
        if (cancelled) return;
        clearTabUser();
        setStatus("locked");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // While unlocked, keep watching for a session takeover (a different admin
  // logging in on another tab replaces the shared cookie). If the current
  // session no longer matches this tab's user, drop back to the login screen.
  useEffect(() => {
    if (status !== "unlocked") return;

    const check = async () => {
      const tabUser = getTabUser();
      if (!tabUser) {
        setStatus("locked");
        return;
      }
      try {
        const current = await runSilently(() => getCurrentAdminUsername());
        if (current !== tabUser) {
          clearTabUser();
          setStatus("locked");
        }
      } catch {
        /* transient failure — leave the tab as-is, next check will retry */
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status]);

  if (status === "checking") {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff",
        }}
      >
        <img
          src="/addis_jobs_logo.png"
          alt="Loading…"
          style={{ width: 56, height: 56, objectFit: "contain", animation: "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}
        />
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .5; transform: scale(0.95); } }`}</style>
      </div>
    );
  }

  if (status === "locked") {
    return <AdminLogin />;
  }

  return <AdminDashboard initialData={data} initialUi={initialUi} />;
}
