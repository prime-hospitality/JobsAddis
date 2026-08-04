"use client";

import { useEffect, useState } from "react";
import { requestEmployerRenewal } from "../actions";

const COOLDOWN_MS = 5 * 60 * 60 * 1000;

/** Renew Subscription button used on Billing & Plan (always shown) and, when
 *  a subscription is within 24h of expiring or has already expired, on
 *  Overview and Manage Job Postings too. Self-contained request flow: click
 *  to confirm, Send to notify JobsAdis Support, Cancel to back out. After a
 *  successful send the button stays disabled for 5 hours so an employer
 *  can't spam the request -- it re-activates on its own once the cooldown
 *  lapses. Once admin acknowledges the request (acknowledgeEmployerRenewal),
 *  the disabled state's copy switches from "waiting for admin" to "admin
 *  has seen it and will call" -- the cooldown length is unaffected either
 *  way. */
export default function RenewSubscriptionButton({
  employerId,
  initialRequestedAt,
  initialSeenAt,
}: {
  employerId: string;
  initialRequestedAt: string | null;
  initialSeenAt: string | null;
}) {
  const [requestedAt, setRequestedAt] = useState<number | null>(
    initialRequestedAt ? new Date(initialRequestedAt).getTime() : null
  );
  const [seenAt] = useState<number | null>(initialSeenAt ? new Date(initialSeenAt).getTime() : null);
  const [phase, setPhase] = useState<"idle" | "confirm" | "sending">("idle");
  const [error, setError] = useState("");
  const [, forceTick] = useState(0);

  // Cooldown lifts on its own without needing a page reload.
  useEffect(() => {
    if (!requestedAt) return;
    const msLeft = requestedAt + COOLDOWN_MS - Date.now();
    if (msLeft <= 0) return;
    const id = setTimeout(() => forceTick((n) => n + 1), Math.min(msLeft, 60_000));
    return () => clearTimeout(id);
  });

  const cooldownRemainingMs = requestedAt ? requestedAt + COOLDOWN_MS - Date.now() : 0;
  const onCooldown = cooldownRemainingMs > 0;
  const seen = !!seenAt && !!requestedAt && seenAt >= requestedAt;

  const handleSend = async () => {
    setPhase("sending");
    setError("");
    try {
      const res = await requestEmployerRenewal(employerId);
      if (res.success) {
        setRequestedAt(Date.now());
        setPhase("idle");
      } else {
        setError("Failed to notify JobsAdis Support. Please try again.");
        setPhase("confirm");
      }
    } catch (e: any) {
      setError(e.message || "Failed to notify JobsAdis Support. Please try again.");
      setPhase("confirm");
    }
  };

  if (phase === "confirm" || phase === "sending") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: "inherit", opacity: 0.85 }}>This request will be sent to JobsAdis Support.</span>
        <button
          type="button"
          onClick={handleSend}
          disabled={phase === "sending"}
          style={{ background: "#141821", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: phase === "sending" ? "not-allowed" : "pointer", opacity: phase === "sending" ? 0.7 : 1 }}
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
        {error && <span style={{ fontSize: 12, color: "#E5484D", width: "100%" }}>{error}</span>}
      </div>
    );
  }

  if (onCooldown) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
        <button
          type="button"
          disabled
          style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#141821", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, fontSize: 14, fontWeight: 700, opacity: 0.5, cursor: "not-allowed", flexShrink: 0 }}
        >
          {seen ? "Seen — Waiting for Call" : "Sent — Waiting for Admin"}
        </button>
        <span style={{ fontSize: 12, color: "inherit", opacity: 0.75 }}>
          {seen
            ? "JobsAdis Support has seen your request and will call you shortly."
            : "Your request is with JobsAdis Support."}
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPhase("confirm")}
      style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#141821", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
    >
      Renew Subscription
    </button>
  );
}
