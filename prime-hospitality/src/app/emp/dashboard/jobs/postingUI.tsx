"use client";

import React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

/**
 * Shared visual system for the "Manage Job Postings" section (Post + Vacancy
 * Template tabs). One source of truth so both tabs are provably the same
 * design language — dashboard-native: white surfaces on #F7F8FA, blue primary,
 * Inter. Deliberately does NOT use the consumer app's theme variables.
 */

export const POSTING_STYLES = `
  .mjp-scope { color: #141821; }

  .mjp-card {
    background: #fff;
    border: 1px solid #e9eef4;
    border-radius: 16px;
    box-shadow: 0 1px 2px rgba(16,24,40,0.04);
    transition: box-shadow .18s ease, transform .18s ease, border-color .18s ease;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .mjp-card.clickable { cursor: pointer; }
  .mjp-card.clickable:hover {
    box-shadow: 0 10px 28px -14px rgba(16,24,40,0.22);
    border-color: #d7e0ec;
    transform: translateY(-2px);
  }

  .mjp-card-accent { height: 3px; flex-shrink: 0; }

  .mjp-eyebrow {
    font-size: 11px; font-weight: 700; color: #9AA1B1;
    text-transform: uppercase; letter-spacing: .06em; margin: 0 0 3px 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .mjp-title {
    font-size: 16px; font-weight: 800; color: #141821;
    line-height: 1.25; margin: 0; letter-spacing: -.01em;
  }

  .mjp-chip {
    display: inline-flex; align-items: center; gap: 5px;
    background: #F7F8FA; border: 1px solid #eef2f7; color: #4C5361;
    font-size: 11.5px; font-weight: 600; padding: 4px 10px; border-radius: 8px;
    white-space: nowrap;
  }
  .mjp-chip.salary { background: #EEF3FC; border-color: #D9E5F8; color: #164A9C; }

  .mjp-status {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 700; padding: 4px 11px; border-radius: 999px;
    border: 1px solid transparent;
  }
  .mjp-status .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

  .mjp-iconbtn {
    width: 34px; height: 34px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all .15s ease; border: 1px solid; background: #fff;
  }
  .mjp-iconbtn.edit { border-color: #E2E5EC; color: #6E7686; }
  .mjp-iconbtn.edit:hover { background: #EEF3FC; border-color: #D9E5F8; color: #1B5CBF; }
  .mjp-iconbtn.danger { border-color: #E2E5EC; color: #9AA1B1; }
  .mjp-iconbtn.danger:hover { background: #FDECEC; border-color: #fecaca; color: #E5484D; }
  .mjp-iconbtn.repost { border-color: #E2E5EC; color: #6E7686; }
  .mjp-iconbtn.repost:hover { background: #E7F7EE; border-color: #8FD9B0; color: #12A150; }
  .mjp-iconbtn.hire { border-color: #E2E5EC; color: #6E7686; }
  .mjp-iconbtn.hire:hover { background: #eef2ff; border-color: #c7d2fe; color: #4f46e5; }
  /* Telegram's own blue on hover — this is the one action on the card that
     leaves the app entirely, and colouring it like the destination is the
     cheapest way to say so before the tooltip does. */
  .mjp-iconbtn.tgboost { border-color: #E2E5EC; color: #6E7686; }
  .mjp-iconbtn.tgboost:hover:not(:disabled) { background: #e7f5fd; border-color: #a8dcfa; color: #229ED9; }
  .mjp-iconbtn:disabled { opacity: .4; cursor: not-allowed; }

  .mjp-btn-primary {
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    background: #1B5CBF; color: #fff; border: none;
    padding: 10px 16px; border-radius: 10px;
    font-size: 13.5px; font-weight: 700; cursor: pointer;
    transition: background .15s ease; box-shadow: 0 1px 2px rgba(2,132,199,0.25);
  }
  .mjp-btn-primary:hover { background: #164A9C; }
  .mjp-btn-primary:disabled { opacity: .55; cursor: not-allowed; }

  .mjp-btn-post {
    flex: 1;
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    background: #1B5CBF; color: #fff; border: none;
    padding: 10px 14px; border-radius: 10px;
    font-size: 13px; font-weight: 700; cursor: pointer;
    transition: background .15s ease;
  }
  .mjp-btn-post:hover { background: #164A9C; }
  .mjp-btn-post.posted { background: #E7F7EE; color: #0E8442; }
  .mjp-btn-post:disabled { cursor: default; }

  .mjp-btn-icon-ghost {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 10px 13px; border-radius: 10px;
    background: #fff; color: #164A9C; border: 1px solid #D9E5F8;
    cursor: pointer; transition: all .15s ease;
  }
  .mjp-btn-icon-ghost:hover { background: #EEF3FC; border-color: #bae6fd; }

  .mjp-tabs {
    display: inline-flex; background: #eef2f7; border: 1px solid #e4e9f0;
    border-radius: 12px; padding: 4px; gap: 4px;
  }
  .mjp-tab {
    display: inline-flex; align-items: center; gap: 8px;
    border: none; background: transparent; color: #6E7686;
    font-size: 14px; font-weight: 600; padding: 8px 16px; border-radius: 9px;
    cursor: pointer; transition: all .15s ease; font-family: inherit;
  }
  .mjp-tab:hover { color: #141821; }
  .mjp-tab.active { background: #fff; color: #1B5CBF; box-shadow: 0 1px 3px rgba(16,24,40,0.12); }
  .mjp-tab .count {
    font-size: 11px; font-weight: 700; padding: 1px 7px; border-radius: 999px;
    background: #E2E5EC; color: #6E7686; min-width: 20px; text-align: center;
  }
  .mjp-tab.active .count { background: #e0f2fe; color: #1B5CBF; }

  .mjp-stat {
    background: #fff; border: 1px solid #e9eef4; border-radius: 12px;
    padding: 14px 16px; display: flex; align-items: center; gap: 12px;
  }
  .mjp-stat-ico {
    width: 38px; height: 38px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .mjp-stat-val { font-size: 20px; font-weight: 800; color: #141821; line-height: 1; letter-spacing: -.02em; }
  .mjp-stat-lbl { font-size: 11px; font-weight: 600; color: #9AA1B1; text-transform: uppercase; letter-spacing: .04em; margin-top: 4px; }

  .mjp-empty {
    background: #fff; border: 1px dashed #CBD0DA; border-radius: 16px;
    padding: 56px 32px; text-align: center;
  }

  .mjp-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
  }

  .mjp-filter-select {
    appearance: none; -webkit-appearance: none;
    background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2364748b' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 12px center;
    border: 1px solid #E2E5EC; border-radius: 9px;
    padding: 8px 32px 8px 12px;
    font-size: 12.5px; font-weight: 600; color: #343A46;
    cursor: pointer; transition: border-color .15s ease; font-family: inherit;
  }
  .mjp-filter-select:hover { border-color: #CBD0DA; }
  .mjp-filter-select:focus { outline: none; border-color: #93c5fd; }

  @keyframes mjp-spin { to { transform: rotate(360deg); } }
  .mjp-spin { animation: mjp-spin 1s linear infinite; }

  .mjp-alert-overlay {
    position: fixed; inset: 0; z-index: 300;
    display: flex; align-items: center; justify-content: center; padding: 16px;
    background: rgba(15,23,42,0.46); backdrop-filter: blur(3px);
  }
  .mjp-alert-card {
    background: #fff; width: 100%; max-width: 380px; border-radius: 18px;
    border: 1px solid #e9eef4;
    box-shadow: 0 24px 48px -16px rgba(15,23,42,0.28);
    overflow: hidden;
  }
  .mjp-alert-body { padding: 28px 26px 22px; text-align: center; }
  .mjp-alert-icon {
    width: 52px; height: 52px; border-radius: 14px; margin: 0 auto;
    display: flex; align-items: center; justify-content: center;
    background: #FDECEC; border: 1px solid #fecaca; color: #E5484D;
  }
  .mjp-alert-title {
    font-size: 16.5px; font-weight: 800; color: #141821;
    letter-spacing: -.01em; margin: 14px 0 0;
  }
  .mjp-alert-message {
    font-size: 13.5px; color: #6E7686; line-height: 1.55; margin: 6px 0 0;
  }
  .mjp-alert-footer { padding: 0 22px 22px; }
  .mjp-btn-danger {
    width: 100%; display: inline-flex; align-items: center; justify-content: center;
    background: #E5484D; color: #fff; border: none;
    padding: 11px 16px; border-radius: 10px;
    font-size: 13.5px; font-weight: 700; cursor: pointer;
    transition: background .15s ease; box-shadow: 0 1px 2px rgba(220,38,38,0.25);
  }
  .mjp-btn-danger:hover { background: #b91c1c; }
  .mjp-btn-danger:disabled, .mjp-btn-neutral:disabled { opacity: .6; cursor: not-allowed; }
  .mjp-alert-footer.two { display: flex; gap: 10px; }
  .mjp-btn-neutral {
    flex: 1; display: inline-flex; align-items: center; justify-content: center;
    background: #fff; color: #4C5361; border: 1px solid #E2E5EC;
    padding: 11px 16px; border-radius: 10px;
    font-size: 13.5px; font-weight: 600; cursor: pointer;
    transition: all .15s ease; font-family: inherit;
  }
  .mjp-btn-neutral:hover { background: #F7F8FA; color: #141821; }
`;

export function PostingStyles() {
  return <style>{POSTING_STYLES}</style>;
}

// ── Status semantics ──────────────────────────────────────────────────────────
type StatusMeta = { label: string; text: string; bg: string; border: string; dot: string; accent: string };

export const STATUS_META: Record<string, StatusMeta> = {
  active:    { label: "Live",         text: "#0E8442", bg: "#E7F7EE", border: "#8FD9B0", dot: "#12A150", accent: "#12A150" },
  pending:   { label: "Under Review", text: "#b45309", bg: "#fffbeb", border: "#fde68a", dot: "#B45309", accent: "#B45309" },
  scheduled: { label: "Scheduled",    text: "#164A9C", bg: "#f0f9ff", border: "#bae6fd", dot: "#4A80D3", accent: "#4A80D3" },
  closed:    { label: "Closed",       text: "#4C5361", bg: "#F7F8FA", border: "#E2E5EC", dot: "#9AA1B1", accent: "#CBD0DA" },
  expired:   { label: "Expired",      text: "#b91c1c", bg: "#FDECEC", border: "#fecaca", dot: "#E5484D", accent: "#E5484D" },
  rejected:  { label: "Rejected",     text: "#b91c1c", bg: "#FDECEC", border: "#fecaca", dot: "#E5484D", accent: "#E5484D" },
};

/** Repost arrow with Telegram's paper plane tucked into it.
 *
 *  The card already has a plain repost arrow that means "put this vacancy back
 *  in the app", and this action is a different thing that would otherwise look
 *  identical -- group only, its own allowance, no effect on the listing. Rather
 *  than a second bare arrow, the plane rides in the gap of the circular arrow,
 *  which reads as "repost, to Telegram" at 15px without a legend.
 *
 *  Drawn inline instead of stacking two lucide icons so the plane can be masked
 *  out of the arrow: the notch keeps the two shapes legible where they meet,
 *  which overlapping alone does not at this size. */
export function GroupRepostIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
         aria-hidden="true">
      <defs>
        {/* Everything shows except a disc behind the plane. */}
        <mask id="tg-boost-notch">
          <rect width="24" height="24" fill="white" />
          <circle cx="16.5" cy="16.5" r="7" fill="black" />
        </mask>
      </defs>
      <g mask="url(#tg-boost-notch)">
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 3v6h-6" />
      </g>
      {/* Paper plane: outline, then the fold line that gives it depth. */}
      <path d="M21.5 12.5 12 17l-.6 3.6a.4.4 0 0 0 .7.3l1.8-2.1 3.1 2.3a.4.4 0 0 0 .6-.2l2.5-8a.4.4 0 0 0-.6-.4Z" fill="currentColor" stroke="none" />
      <path d="M12 17l7.2-4.1" stroke="#fff" strokeWidth={1} />
    </svg>
  );
}

export function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span
      className="mjp-status"
      style={{ background: m.bg, color: m.text, borderColor: m.border }}
      title={status === "rejected" ? "Your job post has been rejected. Contact the JobsAddis Support team for details." : undefined}
    >
      <span className="dot" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
}

export function MetaChip({ icon, children, variant }: { icon?: React.ReactNode; children: React.ReactNode; variant?: "salary" }) {
  return (
    <span className={`mjp-chip${variant === "salary" ? " salary" : ""}`}>
      {icon}
      {children}
    </span>
  );
}

export function Stat({ icon, value, label, tint }: { icon: React.ReactNode; value: React.ReactNode; label: string; tint: string }) {
  return (
    <div className="mjp-stat">
      <div className="mjp-stat-ico" style={{ background: `${tint}18`, color: tint }}>{icon}</div>
      <div>
        <div className="mjp-stat-val">{value}</div>
        <div className="mjp-stat-lbl">{label}</div>
      </div>
    </div>
  );
}

export function AttentionModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="mjp-alert-overlay" onClick={onClose}>
      <div className="mjp-alert-card" onClick={(e) => e.stopPropagation()}>
        <div className="mjp-alert-body">
          <div className="mjp-alert-icon">
            <AlertTriangle size={24} strokeWidth={1.75} />
          </div>
          <h3 className="mjp-alert-title">Attention Needed</h3>
          <p className="mjp-alert-message">{message}</p>
        </div>
        <div className="mjp-alert-footer">
          <button className="mjp-btn-danger" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = "Delete",
  loadingLabel = "Deleting…",
  loading = false,
  icon = <Trash2 size={24} strokeWidth={1.75} />,
  tone = "danger",
  onConfirm,
  onCancel,
}: {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  loadingLabel?: string;
  loading?: boolean;
  icon?: React.ReactNode;
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const iconBg = tone === "danger" ? "#FDECEC" : "#EEF3FC";
  const iconBorder = tone === "danger" ? "#fecaca" : "#D9E5F8";
  const iconColor = tone === "danger" ? "#E5484D" : "#1B5CBF";
  const confirmClass = tone === "danger" ? "mjp-btn-danger" : "mjp-btn-primary";
  return (
    <div className="mjp-alert-overlay" onClick={loading ? undefined : onCancel}>
      <div className="mjp-alert-card" onClick={(e) => e.stopPropagation()}>
        <div className="mjp-alert-body">
          <div className="mjp-alert-icon" style={{ background: iconBg, borderColor: iconBorder, color: iconColor }}>
            {icon}
          </div>
          <h3 className="mjp-alert-title">{title}</h3>
          <p className="mjp-alert-message">{message}</p>
        </div>
        <div className="mjp-alert-footer two">
          <button className="mjp-btn-neutral" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className={confirmClass} style={{ flex: 1 }} onClick={onConfirm} disabled={loading}>
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function salaryLabel(salaryMin: number | null | undefined, salaryMax: number | null | undefined) {
  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n));
  if (salaryMin === -1) return "Negotiable";
  if (salaryMin === -2) return "Per Company Scale";
  if (salaryMin && salaryMin > 0) return `ETB ${fmt(salaryMin)}${salaryMax && salaryMax !== salaryMin ? "–" + fmt(salaryMax) : ""}/mo`;
  return "Salary TBD";
}
