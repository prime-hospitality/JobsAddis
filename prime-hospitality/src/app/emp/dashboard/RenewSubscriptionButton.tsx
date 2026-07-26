"use client";

import { useState } from "react";
import { requestEmployerRenewal } from "../actions";

/** Renew Subscription button used on Billing & Plan (always shown) and, when
 *  a subscription is within 24h of expiring or has already expired, on
 *  Overview and Manage Job Postings too. Self-contained request flow: click
 *  to confirm, Send to notify the admin, Cancel to back out. */
export default function RenewSubscriptionButton({
  employerId,
  initialRequested,
}: {
  employerId: string;
  initialRequested: boolean;
}) {
  const [phase, setPhase] = useState<"idle" | "confirm" | "sending" | "sent">(initialRequested ? "sent" : "idle");
  const [error, setError] = useState("");

  const handleSend = async () => {
    setPhase("sending");
    setError("");
    try {
      const res = await requestEmployerRenewal(employerId);
      if (res.success) {
        setPhase("sent");
      } else {
        setError("Failed to notify admin. Please try again.");
        setPhase("confirm");
      }
    } catch (e: any) {
      setError(e.message || "Failed to notify admin. Please try again.");
      setPhase("confirm");
    }
  };

  if (phase === "sent") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#059669" }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        Admin will be in contact shortly.
      </div>
    );
  }

  if (phase === "confirm" || phase === "sending") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: "inherit", opacity: 0.85 }}>This request will be sent to admin.</span>
        <button
          type="button"
          onClick={handleSend}
          disabled={phase === "sending"}
          style={{ background: "#0f172a", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: phase === "sending" ? "not-allowed" : "pointer", opacity: phase === "sending" ? 0.7 : 1 }}
        >
          {phase === "sending" ? "Sending..." : "Send"}
        </button>
        <button
          type="button"
          onClick={() => setPhase("idle")}
          disabled={phase === "sending"}
          style={{ background: "transparent", color: "inherit", opacity: 0.7, border: "1px solid currentColor", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: phase === "sending" ? "not-allowed" : "pointer" }}
        >
          Cancel
        </button>
        {error && <span style={{ fontSize: 12, color: "#ef4444", width: "100%" }}>{error}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPhase("confirm")}
      style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0f172a", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
    >
      Renew Subscription
    </button>
  );
}
