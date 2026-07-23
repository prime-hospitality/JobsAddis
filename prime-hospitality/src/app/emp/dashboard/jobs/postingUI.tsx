"use client";

import React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

/**
 * Shared visual system for the "Manage Job Postings" section (Post + Vacancy
 * Template tabs). One source of truth so both tabs are provably the same
 * design language — dashboard-native: white surfaces on #f8fafc, blue primary,
 * Inter. Deliberately does NOT use the consumer app's theme variables.
 */

export const POSTING_STYLES = `
  .mjp-scope { color: #0f172a; }

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

  .mjp-logo {
    width: 46px; height: 46px; border-radius: 12px;
    background: linear-gradient(135deg, #0284c7, #0369a1);
    display: flex; align-items: center; justify-content: center;
    color: #fff; flex-shrink: 0; overflow: hidden;
    font-weight: 800; font-size: 15px; letter-spacing: -.02em;
  }

  .mjp-eyebrow {
    font-size: 11px; font-weight: 700; color: #94a3b8;
    text-transform: uppercase; letter-spacing: .06em; margin: 0 0 3px 0;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .mjp-title {
    font-size: 16px; font-weight: 800; color: #0f172a;
    line-height: 1.25; margin: 0; letter-spacing: -.01em;
  }

  .mjp-chip {
    display: inline-flex; align-items: center; gap: 5px;
    background: #f8fafc; border: 1px solid #eef2f7; color: #475569;
    font-size: 11.5px; font-weight: 600; padding: 4px 10px; border-radius: 8px;
    white-space: nowrap;
  }
  .mjp-chip.salary { background: #eff6ff; border-color: #dbeafe; color: #0369a1; }

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
  .mjp-iconbtn.edit { border-color: #e2e8f0; color: #64748b; }
  .mjp-iconbtn.edit:hover { background: #eff6ff; border-color: #bfdbfe; color: #0284c7; }
  .mjp-iconbtn.danger { border-color: #e2e8f0; color: #94a3b8; }
  .mjp-iconbtn.danger:hover { background: #fef2f2; border-color: #fecaca; color: #ef4444; }

  .mjp-btn-primary {
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    background: #0284c7; color: #fff; border: none;
    padding: 10px 16px; border-radius: 10px;
    font-size: 13.5px; font-weight: 700; cursor: pointer;
    transition: background .15s ease; box-shadow: 0 1px 2px rgba(2,132,199,0.25);
  }
  .mjp-btn-primary:hover { background: #0369a1; }
  .mjp-btn-primary:disabled { opacity: .55; cursor: not-allowed; }

  .mjp-btn-post {
    flex: 1;
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    background: #0284c7; color: #fff; border: none;
    padding: 10px 14px; border-radius: 10px;
    font-size: 13px; font-weight: 700; cursor: pointer;
    transition: background .15s ease;
  }
  .mjp-btn-post:hover { background: #0369a1; }
  .mjp-btn-post.posted { background: #ecfdf5; color: #047857; }
  .mjp-btn-post:disabled { cursor: default; }

  .mjp-btn-icon-ghost {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 10px 13px; border-radius: 10px;
    background: #fff; color: #0369a1; border: 1px solid #dbeafe;
    cursor: pointer; transition: all .15s ease;
  }
  .mjp-btn-icon-ghost:hover { background: #eff6ff; border-color: #bae6fd; }

  .mjp-tabs {
    display: inline-flex; background: #eef2f7; border: 1px solid #e4e9f0;
    border-radius: 12px; padding: 4px; gap: 4px;
  }
  .mjp-tab {
    display: inline-flex; align-items: center; gap: 8px;
    border: none; background: transparent; color: #64748b;
    font-size: 14px; font-weight: 600; padding: 8px 16px; border-radius: 9px;
    cursor: pointer; transition: all .15s ease; font-family: inherit;
  }
  .mjp-tab:hover { color: #0f172a; }
  .mjp-tab.active { background: #fff; color: #0284c7; box-shadow: 0 1px 3px rgba(16,24,40,0.12); }
  .mjp-tab .count {
    font-size: 11px; font-weight: 700; padding: 1px 7px; border-radius: 999px;
    background: #e2e8f0; color: #64748b; min-width: 20px; text-align: center;
  }
  .mjp-tab.active .count { background: #e0f2fe; color: #0284c7; }

  .mjp-stat {
    background: #fff; border: 1px solid #e9eef4; border-radius: 12px;
    padding: 14px 16px; display: flex; align-items: center; gap: 12px;
  }
  .mjp-stat-ico {
    width: 38px; height: 38px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .mjp-stat-val { font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1; letter-spacing: -.02em; }
  .mjp-stat-lbl { font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .04em; margin-top: 4px; }

  .mjp-empty {
    background: #fff; border: 1px dashed #cbd5e1; border-radius: 16px;
    padding: 56px 32px; text-align: center;
  }

  .mjp-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
  }

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
    background: #fef2f2; border: 1px solid #fecaca; color: #dc2626;
  }
  .mjp-alert-title {
    font-size: 16.5px; font-weight: 800; color: #0f172a;
    letter-spacing: -.01em; margin: 14px 0 0;
  }
  .mjp-alert-message {
    font-size: 13.5px; color: #64748b; line-height: 1.55; margin: 6px 0 0;
  }
  .mjp-alert-footer { padding: 0 22px 22px; }
  .mjp-btn-danger {
    width: 100%; display: inline-flex; align-items: center; justify-content: center;
    background: #dc2626; color: #fff; border: none;
    padding: 11px 16px; border-radius: 10px;
    font-size: 13.5px; font-weight: 700; cursor: pointer;
    transition: background .15s ease; box-shadow: 0 1px 2px rgba(220,38,38,0.25);
  }
  .mjp-btn-danger:hover { background: #b91c1c; }
  .mjp-btn-danger:disabled, .mjp-btn-neutral:disabled { opacity: .6; cursor: not-allowed; }
  .mjp-alert-footer.two { display: flex; gap: 10px; }
  .mjp-btn-neutral {
    flex: 1; display: inline-flex; align-items: center; justify-content: center;
    background: #fff; color: #475569; border: 1px solid #e2e8f0;
    padding: 11px 16px; border-radius: 10px;
    font-size: 13.5px; font-weight: 600; cursor: pointer;
    transition: all .15s ease; font-family: inherit;
  }
  .mjp-btn-neutral:hover { background: #f8fafc; color: #0f172a; }
`;

export function PostingStyles() {
  return <style>{POSTING_STYLES}</style>;
}

// ── Status semantics ──────────────────────────────────────────────────────────
type StatusMeta = { label: string; text: string; bg: string; border: string; dot: string; accent: string };

export const STATUS_META: Record<string, StatusMeta> = {
  active:    { label: "Live",         text: "#047857", bg: "#ecfdf5", border: "#a7f3d0", dot: "#10b981", accent: "#10b981" },
  pending:   { label: "Under Review", text: "#b45309", bg: "#fffbeb", border: "#fde68a", dot: "#f59e0b", accent: "#f59e0b" },
  scheduled: { label: "Scheduled",    text: "#0369a1", bg: "#f0f9ff", border: "#bae6fd", dot: "#0ea5e9", accent: "#0ea5e9" },
  closed:    { label: "Closed",       text: "#475569", bg: "#f8fafc", border: "#e2e8f0", dot: "#94a3b8", accent: "#cbd5e1" },
  expired:   { label: "Expired",      text: "#b91c1c", bg: "#fef2f2", border: "#fecaca", dot: "#ef4444", accent: "#ef4444" },
  rejected:  { label: "Rejected",     text: "#b91c1c", bg: "#fef2f2", border: "#fecaca", dot: "#ef4444", accent: "#ef4444" },
};

export function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span className="mjp-status" style={{ background: m.bg, color: m.text, borderColor: m.border }}>
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
  loading = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mjp-alert-overlay" onClick={loading ? undefined : onCancel}>
      <div className="mjp-alert-card" onClick={(e) => e.stopPropagation()}>
        <div className="mjp-alert-body">
          <div className="mjp-alert-icon">
            <Trash2 size={24} strokeWidth={1.75} />
          </div>
          <h3 className="mjp-alert-title">{title}</h3>
          <p className="mjp-alert-message">{message}</p>
        </div>
        <div className="mjp-alert-footer two">
          <button className="mjp-btn-neutral" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className="mjp-btn-danger" style={{ flex: 1 }} onClick={onConfirm} disabled={loading}>
            {loading ? "Deleting…" : confirmLabel}
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
