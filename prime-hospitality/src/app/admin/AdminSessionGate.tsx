"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import AdminLogin from "./AdminLogin";
import { getAdminData, getCurrentAdminUsername, getLoggedInAdmin } from "./actions";
import { runSilently } from "@/lib/silentFetch";
import { AdminUiState } from "@/lib/adminUiCookie";
import { getTabUser, setTabUser, clearTabUser } from "@/lib/adminTabSession";

type Status = "checking" | "locked" | "unlocked" | "error";

// The dashboard is by far the heaviest thing on this route. Statically importing
// it put all of it in the initial bundle, so the server-rendered login form sat
// there un-hydrated until it had all downloaded — and a click in that window did
// a native form submit (a bare page reload), which is why logging in took two
// clicks. Loading it on demand keeps the login page's bundle small enough to
// hydrate before anyone can reach for the button.
const AdminDashboard = dynamic(() => import("./AdminDashboard"), {
  ssr: false,
  loading: () => <AdminLoadingScreen />,
});

// Decides, per browser tab, whether to show the dashboard or the login page.
// The auth cookie alone is not enough — a tab must have been "unlocked" by an
// actual login in that tab (see lib/adminTabSession). A brand-new tab therefore
// shows the login page even though the shared cookie is present.
export default function AdminSessionGate({ hasSession, initialUi }: { hasSession: boolean; initialUi: Partial<AdminUiState> }) {
  // With no session cookie nobody is logged in on this browser, so paint the
  // login form immediately rather than a loader that resolves to it.
  const [status, setStatus] = useState<Status>(hasSession ? "checking" : "locked");
  const [data, setData] = useState<any>(null);
  const [ui, setUi] = useState<Partial<AdminUiState>>(initialUi);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (status !== "checking") return;
    let cancelled = false;

    const tabUser = getTabUser();
    if (!tabUser) {
      // This tab was never logged into — require a fresh login.
      setStatus("locked");
      return;
    }

    (async () => {
      // Settle whether this tab is still logged in *before* asking for any
      // data, and on the cheapest call that can answer it. getAdminData builds
      // the dashboard's whole payload out of a dozen tables, so treating its
      // failure as "logged out" (which is what this did) meant any one of those
      // queries hiccupping dumped a perfectly valid session back on the login
      // form. Only a real auth verdict may lock a tab now.
      let sessionUser: string | null;
      try {
        const admin = await runSilently(() => getLoggedInAdmin());
        sessionUser = admin?.username ?? null;
      } catch {
        if (cancelled) return;
        setLoadError("Could not reach the server to check your session.");
        setStatus("error");
        return;
      }
      if (cancelled) return;

      // No session, or a takeover: the shared cookie may now belong to a
      // different admin than the one who unlocked this tab.
      if (!sessionUser || sessionUser !== tabUser) {
        clearTabUser();
        setStatus("locked");
        return;
      }

      try {
        // Fetched only after confirming this tab is unlocked, so a locked tab
        // never receives the dashboard data at all.
        const fresh = await runSilently(() => getAdminData());
        if (cancelled) return;
        setData(fresh);
        setStatus("unlocked");
      } catch {
        if (cancelled) return;
        // The session is fine — only the payload failed. Offer a retry instead
        // of pretending the login didn't happen.
        setLoadError("The dashboard could not be loaded.");
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status]);

  // Warm the dashboard chunk once the login form is up and interactive, so a
  // correct password isn't then followed by a download. Deliberately after
  // hydration — having this in the initial bundle is what left the login button
  // dead on arrival for the first click.
  useEffect(() => {
    if (status !== "locked") return;
    const timer = setTimeout(() => {
      void import("./AdminDashboard");
    }, 1000);
    return () => clearTimeout(timer);
  }, [status]);

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

  // A correct password used to be followed by window.location.reload() — a full
  // round trip through a blank document and the loader before the dashboard
  // appeared, which is the flash people saw. The gate owns both screens, so it
  // can just switch.
  const handleLoggedIn = (username: string) => {
    setTabUser(username);
    // A fresh login always starts on Overview (this is a shared computer).
    // loginAdmin drops the saved-position cookie server-side; without a reload
    // we have to drop the copy this page was rendered with as well.
    setUi({});
    setLoadError("");
    setStatus("checking");
  };

  if (status === "checking") {
    return <AdminLoadingScreen />;
  }

  if (status === "locked") {
    return <AdminLogin onSuccess={handleLoggedIn} />;
  }

  if (status === "error") {
    return (
      <AdminErrorScreen
        message={loadError}
        onRetry={() => {
          setLoadError("");
          setStatus("checking");
        }}
        onSignOut={() => {
          clearTabUser();
          setLoadError("");
          setStatus("locked");
        }}
      />
    );
  }

  return <AdminDashboard initialData={data} initialUi={ui} />;
}

// Shown when the session is good but its payload didn't arrive. Distinct from
// the login form on purpose: the difference between "sign in again" and "that
// didn't load" is the whole point of separating the two checks above.
function AdminErrorScreen({
  message,
  onRetry,
  onSignOut,
}: {
  message: string;
  onRetry: () => void;
  onSignOut: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "20px",
        background: "#fff",
        padding: "24px",
        fontFamily: "'Inter', sans-serif",
        textAlign: "center",
      }}
    >
      <p style={{ color: "#343A46", fontSize: "16px", fontWeight: 600, margin: 0 }}>
        {message || "Something went wrong."}
      </p>
      <p style={{ color: "#9AA1B1", fontSize: "14px", margin: 0, maxWidth: "340px", lineHeight: 1.5 }}>
        You are still signed in. This is usually a network blip — try again.
      </p>
      <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={onRetry}
          style={{
            background: "#1d4ed8",
            color: "white",
            padding: "14px 28px",
            borderRadius: "9999px",
            border: "none",
            fontSize: "14px",
            fontWeight: 600,
            letterSpacing: "1px",
            cursor: "pointer",
            boxShadow: "0 4px 14px 0 rgba(29, 78, 216, 0.39)",
          }}
        >
          TRY AGAIN
        </button>
        <button
          onClick={onSignOut}
          style={{
            background: "transparent",
            color: "#9AA1B1",
            padding: "14px 20px",
            borderRadius: "9999px",
            border: "1px solid #E2E5EC",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Back to login
        </button>
      </div>
    </div>
  );
}

// Shown while this tab's session is being checked, and again while the
// dashboard chunk itself is downloading.
function AdminLoadingScreen() {
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
      {/* The mark sits bare on the brand's yellow field — it is a fill, never
          an ink colour, so the blue mark reads directly against it. */}
      <div
        style={{
          width: 80, height: 80, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "#F2F012",
          border: "1.5px solid #E2E5EC",
          boxShadow: "0 4px 12px rgba(20, 24, 33, 0.05)",
          animation: "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        }}
      >
        <img
          src="/addis_jobs_logo.webp"
          alt="Loading…"
          style={{ width: 56, height: 56, objectFit: "contain" }}
        />
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .5; transform: scale(0.95); } }`}</style>
    </div>
  );
}
