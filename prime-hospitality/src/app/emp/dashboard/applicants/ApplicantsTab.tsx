"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  getApplicants,
  setApplicationStatus,
  markApplicantReviewed,
  getCvSignedUrl,
  type ApplicantRow,
  type ApplicationStatus,
} from "./actions";
import { runSilently } from "@/lib/silentFetch";
import { cvActionLabel } from "@/lib/cvStorage";
import FilterSelect from "@/components/FilterSelect";
import { writeEmployerUi } from "@/lib/employerUiCookie";

type TabKey = "all" | "shortlisted" | "rejected";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "rejected", label: "Declined" },
];

const STATUS_BG: Record<string, string> = {
  pending: "#fef3c7", reviewed: "#dbeafe", shortlisted: "#ede9fe", rejected: "#fee2e2",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "#92400e", reviewed: "#1e40af", shortlisted: "#5b21b6", rejected: "#991b1b",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "New", reviewed: "Reviewed", shortlisted: "Shortlisted", rejected: "Declined",
};

function fmtTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function fmtPhone(phone: string | null): string {
  if (!phone) return "Not shared";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("251")) {
    return `+251 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return phone;
}

interface Props {
  initialApplicants: ApplicantRow[];
  jobs: Array<{ id: string; title: string }>;
  initialJobFilter?: string;
  initialTab?: TabKey;
}

export default function ApplicantsTab({ initialApplicants, jobs, initialJobFilter = "", initialTab = "all" }: Props) {
  const [applicants, setApplicants] = useState(initialApplicants);
  const [jobFilter, setJobFilter] = useState<string>(initialJobFilter);
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Set when un-shortlisting someone the seeker has already been told about. */
  const [pendingUndo, setPendingUndo] = useState<{ id: string; status: ApplicationStatus } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Remember which status tab the employer was on so a reload lands back here.
  useEffect(() => {
    writeEmployerUi({ applicantsTab: tab });
  }, [tab]);

  // Re-query when the job filter changes; status and search filter locally.
  // The first render already has the server's list, so skip that round-trip.
  const [loadedFilter, setLoadedFilter] = useState(initialJobFilter);
  useEffect(() => {
    if (jobFilter === loadedFilter) return;
    let cancelled = false;
    startTransition(async () => {
      try {
        // runSilently: the list already dims itself while isPending, so the
        // global full-screen overlay on top of it is redundant flicker.
        const res = await runSilently(() => getApplicants(jobFilter || undefined));
        if (!cancelled) {
          setApplicants(res.applicants);
          setLoadedFilter(jobFilter);
        }
      } catch {
        if (!cancelled) setError("Could not load applicants. Please refresh.");
      }
    });
    return () => { cancelled = true; };
  }, [jobFilter, loadedFilter]);

  const counts = useMemo(
    () => ({
      all: applicants.length,
      shortlisted: applicants.filter((a) => a.status === "shortlisted").length,
      rejected: applicants.filter((a) => a.status === "rejected").length,
    }),
    [applicants]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applicants.filter((a) => {
      if (tab !== "all" && a.status !== tab) return false;
      if (q && !(a.profile?.full_name ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [applicants, tab, search]);

  const open = applicants.find((a) => a.id === openId) ?? null;

  function applyLocalStatus(id: string, status: ApplicationStatus) {
    setApplicants((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  function handleOpen(row: ApplicantRow) {
    setOpenId(row.id);
    setError(null);
    // Opening a card counts as reviewing it — this is what lights up the
    // "Reviewed" badge the seeker sees in their app.
    if (row.status === "pending") {
      applyLocalStatus(row.id, "reviewed");
      // Silent: the badge already flipped optimistically, so an overlay here
      // would flash over a card the employer is in the middle of reading.
      startTransition(async () => { await runSilently(() => markApplicantReviewed(row.id)); });
    }
  }

  function handleStatus(id: string, status: ApplicationStatus, confirmed = false) {
    const previous = applicants.find((a) => a.id === id)?.status;
    applyLocalStatus(id, status);
    setError(null);
    startTransition(async () => {
      // Silent for the same reason: the status change is already applied
      // locally and rolls back below if the server rejects it.
      const res = await runSilently(() => setApplicationStatus(id, status, { confirmed }));
      if (!res.success) {
        if (previous) applyLocalStatus(id, previous);
        // The seeker has already been told they were shortlisted. Nothing has
        // changed yet — ask before taking it back.
        if (res.needsConfirmation) setPendingUndo({ id, status });
        else setError(res.error || "Could not update this applicant.");
      }
    });
  }

  async function handleViewCv(id: string) {
    setError(null);
    const res = await getCvSignedUrl(id);
    if ("url" in res) window.open(res.url, "_blank", "noopener,noreferrer");
    else setError(res.error);
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
          Applicant Tracking
        </h2>
        <p style={{ fontSize: 14, color: "#64748b", margin: "4px 0 0 0" }}>
          Review, shortlist and manage everyone who applied to your jobs.
        </p>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 500, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <FilterSelect
          value={jobFilter}
          onChange={setJobFilter}
          ariaLabel="Filter applicants by job"
          searchPlaceholder="Search jobs…"
          minWidth={240}
          options={[
            { value: "", label: "All jobs", count: applicants.length },
            ...jobs.map((j) => ({
              value: j.id,
              label: j.title,
              count: applicants.filter((a) => a.job_id === j.id).length,
            })),
          ]}
        />

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "9px 14px", fontSize: 13, color: "#0f172a", flex: 1, minWidth: 200 }}
        />

        <div style={{ display: "flex", gap: 6, background: "#f1f5f9", borderRadius: 10, padding: 4 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                border: "none", cursor: "pointer", borderRadius: 8, padding: "7px 14px",
                fontSize: 13, fontWeight: 700,
                background: tab === t.key ? "#fff" : "transparent",
                color: tab === t.key ? "#0f172a" : "#64748b",
                boxShadow: tab === t.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {t.label} ({counts[t.key]})
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", opacity: isPending ? 0.7 : 1, transition: "opacity 0.15s" }}>
        {visible.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <div style={{ color: "#94a3b8", display: "flex", justifyContent: "center", marginBottom: 14 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <p style={{ fontSize: 14, color: "#94a3b8", fontWeight: 500, margin: 0 }}>
              {applicants.length === 0 ? "No applications yet." : "No applicants match these filters."}
            </p>
          </div>
        ) : (
          visible.map((a) => (
            <div
              key={a.id}
              onClick={() => handleOpen(a)}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
            >
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                {(a.profile?.full_name || "?").charAt(0).toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                  {a.profile?.full_name || "Anonymous"}
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                  {a.job_title}
                  {a.profile?.location ? ` · ${a.profile.location}` : ""}
                  {a.profile?.cv_url ? " · CV ✓" : ""}
                </div>
              </div>

              <span style={{ fontSize: 11, fontWeight: 700, color: a.score >= 80 ? "#059669" : a.score >= 50 ? "#d97706" : "#94a3b8", flexShrink: 0 }}>
                {a.score}%
              </span>
              <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: STATUS_BG[a.status], color: STATUS_COLOR[a.status], flexShrink: 0 }}>
                {STATUS_LABEL[a.status]}
              </span>
              <span style={{ fontSize: 11, color: "#cbd5e1", flexShrink: 0, minWidth: 62, textAlign: "right" }}>
                {fmtTime(a.created_at)}
              </span>
            </div>
          ))
        )}
      </div>

      {open && (
        <ApplicantDetail
          applicant={open}
          onClose={() => setOpenId(null)}
          onStatus={handleStatus}
          onViewCv={handleViewCv}
        />
      )}

      {pendingUndo && (
        <div
          onClick={() => setPendingUndo(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 110 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 420, padding: 24, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}
          >
            <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", margin: 0 }}>
              They&apos;ve already been told
            </h3>
            <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.55, margin: "10px 0 0 0" }}>
              This applicant has seen a message saying they were shortlisted. Moving them
              out will remove it, but there is no way to know whether they already read it.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                onClick={() => setPendingUndo(null)}
                style={{ flex: 1, border: "1px solid #e2e8f0", background: "#fff", borderRadius: 10, padding: "11px 16px", fontSize: 14, fontWeight: 700, color: "#64748b", cursor: "pointer" }}
              >
                Keep shortlisted
              </button>
              <button
                onClick={() => {
                  const { id, status } = pendingUndo;
                  setPendingUndo(null);
                  handleStatus(id, status, true);
                }}
                style={{ flex: 1, border: "none", background: "#ef4444", borderRadius: 10, padding: "11px 16px", fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer" }}
              >
                Move them anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ApplicantDetail({
  applicant, onClose, onStatus, onViewCv,
}: {
  applicant: ApplicantRow;
  onClose: () => void;
  onStatus: (id: string, status: ApplicationStatus) => void;
  onViewCv: (id: string) => void;
}) {
  const p = applicant.profile;
  const categories = p?.selected_categories ?? [];

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 100 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
            {(p?.full_name || "?").charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", margin: 0 }}>{p?.full_name || "Anonymous"}</h3>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: "3px 0 0 0" }}>
              Applied to {applicant.job_title} · {fmtTime(applicant.created_at)}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ border: "none", background: "#f1f5f9", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "#64748b", fontSize: 18, lineHeight: 1 }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
          <Field label="Phone" value={fmtPhone(p?.phone_number ?? null)} />
          {p?.secondary_phone && <Field label="Secondary phone" value={fmtPhone(p.secondary_phone)} />}
          <Field
            label="Location"
            value={`${p?.location || "Not shared"}${p?.willing_to_relocate ? " · willing to relocate" : ""}`}
          />
          {(p?.age || p?.gender) && (
            <Field label="About" value={[p?.age ? `${p.age} years old` : null, p?.gender].filter(Boolean).join(" · ")} />
          )}

          {categories.length > 0 && (
            <div>
              <FieldLabel>Roles &amp; experience</FieldLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {categories.map((c) => (
                  <span key={c} style={{ background: "#f1f5f9", borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: "#0f172a" }}>
                    {c}
                    {p?.experience_levels?.[c] ? ` · ${p.experience_levels[c]}` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* The one thing the applicant actually wrote — show it prominently. */}
          {applicant.cover_note && (
            <div>
              <FieldLabel>Cover note</FieldLabel>
              <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, margin: 0, background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 10, padding: "12px 14px", whiteSpace: "pre-wrap" }}>
                {applicant.cover_note}
              </p>
            </div>
          )}

          <div>
            <FieldLabel>CV / Resume</FieldLabel>
            {p?.cv_url ? (
              <button
                onClick={() => onViewCv(applicant.id)}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, color: "#0284c7", cursor: "pointer" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                {cvActionLabel(p.cv_url)}
              </button>
            ) : (
              <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>No CV uploaded.</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 10, position: "sticky", bottom: 0, background: "#fff" }}>
          {applicant.status === "shortlisted" ? (
            <button
              onClick={() => onStatus(applicant.id, "reviewed")}
              style={{ flex: 1, border: "1px solid #e2e8f0", background: "#fff", borderRadius: 10, padding: "11px 16px", fontSize: 14, fontWeight: 700, color: "#64748b", cursor: "pointer" }}
            >
              Move back to All
            </button>
          ) : (
            <button
              onClick={() => onStatus(applicant.id, "shortlisted")}
              style={{ flex: 1, border: "none", background: "#059669", borderRadius: 10, padding: "11px 16px", fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer" }}
            >
              Shortlist
            </button>
          )}

          {applicant.status === "rejected" ? (
            <button
              onClick={() => onStatus(applicant.id, "reviewed")}
              style={{ flex: 1, border: "1px solid #e2e8f0", background: "#fff", borderRadius: 10, padding: "11px 16px", fontSize: 14, fontWeight: 700, color: "#64748b", cursor: "pointer" }}
            >
              Undo decline
            </button>
          ) : (
            <button
              onClick={() => onStatus(applicant.id, "rejected")}
              style={{ flex: 1, border: "1px solid #fecaca", background: "#fff", borderRadius: 10, padding: "11px 16px", fontSize: 14, fontWeight: 700, color: "#991b1b", cursor: "pointer" }}
            >
              Decline
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px 0" }}>
      {children}
    </p>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", margin: 0 }}>{value}</p>
    </div>
  );
}
