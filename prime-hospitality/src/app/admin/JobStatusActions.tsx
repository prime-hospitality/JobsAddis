"use client";

import React from "react";

/**
 * Single source of truth for how a job's status is labeled and which
 * actions apply to it in the admin "Jobs by Employer" views. Previously this
 * logic (a 3-bucket badge + loose `status !== X` button checks) was
 * copy-pasted across the desktop table row, mobile card, and job-detail
 * modal, which let them drift and produced nonsensical combinations (e.g. an
 * expired job showing Set Active + Close Job + Repost at once). Used by all
 * three call sites now so a fix here can't miss one of them.
 */

export type AdminJobLike = {
  id: string;
  status: string;
  scheduled_at?: string | null;
  pre_approved?: boolean;
};

type StatusMeta = { label: string; bg: string; color: string };

function formatScheduled(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + ", " + d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function getJobStatusMeta(job: AdminJobLike): StatusMeta {
  switch (job.status) {
    case "active":
      return { label: "Active", bg: "#E7F7EE", color: "#0E8442" };
    case "pending":
      return { label: "Pending Review", bg: "#FDF1E7", color: "#B45309" };
    case "scheduled": {
      const when = formatScheduled(job.scheduled_at);
      const base = job.pre_approved ? "Scheduled ✓ Approved" : "Scheduled";
      return { label: when ? `${base} · ${when}` : base, bg: "#D9E5F8", color: "#164A9C" };
    }
    case "closed":
      return { label: "Closed", bg: "#E2E5EC", color: "#343A46" };
    case "expired":
      return { label: "Expired", bg: "#fee2e2", color: "#E5484D" };
    case "rejected":
      return { label: "Rejected", bg: "#fee2e2", color: "#E5484D" };
    default:
      return { label: job.status, bg: "#EFF1F5", color: "#4C5361" };
  }
}

export function JobStatusBadge({ job }: { job: AdminJobLike }) {
  const meta = getJobStatusMeta(job);
  return (
    <span
      style={{
        padding: "3px 9px",
        borderRadius: 100,
        fontSize: 10.5,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: ".03em",
        background: meta.bg,
        color: meta.color,
        whiteSpace: "nowrap",
      }}
    >
      {meta.label}
    </span>
  );
}

type ActionHandlers = {
  onApprove: () => void;
  onReject: () => void;
  onPause: () => void;
  onClose: () => void;
  onApproveScheduled: () => void;
  onCancelSchedule: () => void;
  onRepost: () => void;
};

const AMBER = "#B45309";
const EMERALD = "#12A150";
const RED = "#E5484D";
const NAVY = "#141821";

export function JobActionButtons({
  job,
  loading,
  size = "sm",
  onApprove,
  onReject,
  onPause,
  onClose,
  onApproveScheduled,
  onCancelSchedule,
  onRepost,
}: { job: AdminJobLike; loading: boolean; size?: "sm" | "md" } & ActionHandlers) {
  const pad = size === "sm" ? "6px 12px" : "8px 16px";
  const fontSize = size === "sm" ? 12 : 13;
  const fontWeight = size === "sm" ? 500 : 600;

  const Btn = ({ bg, label, onClick }: { bg: string; label: string; onClick: () => void }) => (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      style={{
        background: bg, color: "#fff", border: "none", padding: pad, borderRadius: 8,
        fontSize, fontWeight, cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );

  switch (job.status) {
    case "pending":
      return (
        <>
          <Btn bg={EMERALD} label="Approve" onClick={onApprove} />
          <Btn bg={RED} label="Reject" onClick={onReject} />
        </>
      );
    case "active":
      return (
        <>
          <Btn bg={AMBER} label="Pause" onClick={onPause} />
          <Btn bg={RED} label="Close" onClick={onClose} />
        </>
      );
    case "scheduled":
      return job.pre_approved ? (
        <Btn bg={RED} label="Cancel Schedule" onClick={onCancelSchedule} />
      ) : (
        <>
          <Btn bg={EMERALD} label="Approve" onClick={onApproveScheduled} />
          <Btn bg={RED} label="Cancel Schedule" onClick={onCancelSchedule} />
        </>
      );
    case "closed":
    case "expired":
    case "rejected":
      return <Btn bg={NAVY} label="Repost" onClick={onRepost} />;
    default:
      return null;
  }
}
