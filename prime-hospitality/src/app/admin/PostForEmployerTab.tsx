"use client";

/**
 * PFE — Post For Employer.
 *
 * Employers & Companies > Emp Config > PFE. An admin picks a registered
 * employer and types a vacancy that belongs to that employer's account: their
 * name and logo on the seeker card, their applicants in their own dashboard.
 * The admin's name is recorded on the row and in the activity log, and then
 * they step out of it.
 *
 * Two panels, then a drill-down:
 *   1. the employer picker, which refuses accounts that can't take a post
 *      (lapsed plan, daily allowance spent) *before* the vacancy is typed;
 *   2. the list of what admins have already posted, grouped by business the
 *      same way Job Posting Moderation groups jobs;
 *   3. one business's admin-posted jobs, each editable and deletable.
 *
 * The vacancy form itself is the shared VacancyFormModal — the same component
 * the employer dashboard and Content Management both use. Nothing about the
 * field entry is re-implemented here.
 */

import React, { useCallback, useEffect, useState } from "react";
import { Users, Plus, Pencil, Trash2, AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import VacancyFormModal from "@/app/emp/dashboard/jobs/VacancyFormModal";
import { VacancyFormState, emptyVacancyForm, jobRowToForm } from "@/app/emp/dashboard/jobs/vacancyShared";
import {
  getPfeEmployers,
  createJobForEmployer,
  updateJobForEmployer,
  deleteJobForEmployer,
  getPfeEmployerGroups,
  getPfeJobsForEmployer,
} from "./actions";
import type { PfeEmployer, PfeEmployerGroup, PfeJob } from "./actions";

const PAGE_SIZE = 20;

const th: React.CSSProperties = {
  padding: "12px 24px",
  color: "#4C5361",
  fontSize: 12,
  textTransform: "uppercase",
  textAlign: "left",
  fontWeight: 700,
  letterSpacing: "0.04em",
  whiteSpace: "nowrap",
};
const td: React.CSSProperties = { padding: "14px 24px", color: "#343A46", fontSize: 14 };

function Pill({ tone, children }: { tone: "ok" | "warn" | "stop" | "neutral" | "info"; children: React.ReactNode }) {
  const tones = {
    ok: { bg: "#E4F4EB", fg: "#12854A" },
    warn: { bg: "#FBF1DC", fg: "#8A5D0A" },
    stop: { bg: "#FBE9E9", fg: "#A83232" },
    neutral: { bg: "#EFF1F5", fg: "#5A6172" },
    info: { bg: "#E7EFF9", fg: "#123E85" },
  }[tone];
  return (
    <span style={{ display: "inline-block", background: tones.bg, color: tones.fg, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function statusTone(status: string): "ok" | "warn" | "stop" | "neutral" {
  if (status === "active") return "ok";
  if (status === "pending" || status === "scheduled") return "warn";
  if (status === "rejected") return "stop";
  return "neutral";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/** "2 of 15", or "2 posted" when the employer has no cap. */
function quotaLabel(emp: PfeEmployer) {
  return emp.dailyPostLimit === -1 ? `${emp.postedToday} posted` : `${emp.postedToday} of ${emp.dailyPostLimit}`;
}

export default function PostForEmployerTab() {
  // ── Picker ────────────────────────────────────────────────────────────────
  const [employers, setEmployers] = useState<PfeEmployer[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pickerLoading, setPickerLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ── Grouped list + drill-down ─────────────────────────────────────────────
  const [groups, setGroups] = useState<PfeEmployerGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [drill, setDrill] = useState<PfeEmployerGroup | null>(null);
  const [drillJobs, setDrillJobs] = useState<PfeJob[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);

  // ── Modals ────────────────────────────────────────────────────────────────
  const [postForm, setPostForm] = useState<VacancyFormState | null>(null);
  const [postEmployer, setPostEmployer] = useState<PfeEmployer | null>(null);
  const [editForm, setEditForm] = useState<VacancyFormState | null>(null);
  const [editJobId, setEditJobId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PfeJob | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  // Debounced so typing a business name doesn't fire a query per keystroke.
  useEffect(() => {
    let cancelled = false;
    setPickerLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await getPfeEmployers(search, page, PAGE_SIZE);
        if (cancelled) return;
        setEmployers(res.employers);
        setTotal(res.total);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load employers.");
      } finally {
        if (!cancelled) setPickerLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [search, page]);

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      setGroups(await getPfeEmployerGroups());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posted jobs.");
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const loadDrillJobs = useCallback(async (employerId: string) => {
    setDrillLoading(true);
    try {
      setDrillJobs(await getPfeJobsForEmployer(employerId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load this employer's jobs.");
    } finally {
      setDrillLoading(false);
    }
  }, []);

  const openDrill = (group: PfeEmployerGroup) => {
    setDrill(group);
    setDrillJobs([]);
    loadDrillJobs(group.employerId);
  };

  const selected = employers.find((e) => e.id === selectedId) || null;

  const startPost = () => {
    if (!selected || selected.blockedReason) return;
    setError("");
    setPostEmployer(selected);
    setPostForm(emptyVacancyForm());
  };

  const handlePost = async () => {
    if (!postForm || !postEmployer) return;
    setSaving(true);
    setError("");
    try {
      const res = await createJobForEmployer(postEmployer.id, postForm);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setToast(`Posted for ${postEmployer.businessName} — live now and queued for the group.`);
      setPostForm(null);
      setPostEmployer(null);
      setSelectedId(null);
      // The employer just spent one of today's posts, so the picker's counts
      // and the grouped list are both stale.
      const refreshed = await getPfeEmployers(search, page, PAGE_SIZE);
      setEmployers(refreshed.employers);
      setTotal(refreshed.total);
      await loadGroups();
      if (drill) await loadDrillJobs(drill.employerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post the job.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (job: PfeJob) => {
    setError("");
    setEditJobId(job.id);
    setEditForm(jobRowToForm(job.raw));
  };

  const handleEdit = async () => {
    if (!editForm || !editJobId) return;
    setSaving(true);
    setError("");
    try {
      const res = await updateJobForEmployer(editJobId, editForm);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setToast("Changes saved.");
      setEditForm(null);
      setEditJobId(null);
      if (drill) await loadDrillJobs(drill.employerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    setError("");
    try {
      const res = await deleteJobForEmployer(deleteTarget.id);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setToast(`Deleted "${deleteTarget.title}".`);
      setDeleteTarget(null);
      await loadGroups();
      if (drill) await loadDrillJobs(drill.employerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete the job.");
    } finally {
      setSaving(false);
    }
  };

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Drill-down: one employer's admin-posted jobs ──────────────────────────
  if (drill) {
    return (
      <div style={{ padding: "24px" }}>
        {toast && <Toast text={toast} />}
        {error && <ErrorBanner text={error} onDismiss={() => setError("")} />}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: "#141821", letterSpacing: "-0.02em" }}>{drill.businessName}</h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6E7686" }}>
              {drill.jobCount} job{drill.jobCount === 1 ? "" : "s"} posted by admins on this employer's behalf
            </p>
          </div>
          <button
            onClick={() => { setDrill(null); setDrillJobs([]); }}
            style={{ display: "flex", alignItems: "center", gap: 7, background: "#fff", border: "1px solid #E2E5EC", padding: "9px 14px", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#4C5361" }}
          >
            <ArrowLeft size={15} /> Back to employers
          </button>
        </div>

        <div style={{ background: "#fff", border: "1px solid #E2E5EC", borderRadius: 12, overflow: "hidden" }}>
          {drillLoading ? (
            <Loading label="Loading jobs…" />
          ) : drillJobs.length === 0 ? (
            <Empty text="Nothing posted for this employer yet." />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
                <thead style={{ background: "#F7F8FA", borderBottom: "1px solid #E2E5EC" }}>
                  <tr>
                    <th style={th}>Job Title</th>
                    <th style={th}>Posted</th>
                    <th style={th}>Applicants</th>
                    <th style={th}>Status</th>
                    <th style={{ ...th, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {drillJobs.map((job) => (
                    <tr key={job.id} style={{ borderBottom: "1px solid #EFF1F5" }}>
                      <td style={{ ...td, fontWeight: 650, color: "#141821" }}>
                        {job.title}
                        {job.postedByAdmin && (
                          <div style={{ marginTop: 5 }}>
                            <Pill tone="info">posted by {job.postedByAdmin}</Pill>
                          </div>
                        )}
                      </td>
                      <td style={td}>{formatDate(job.postedAt)}</td>
                      <td style={td}>{job.applicantCount}</td>
                      <td style={td}><Pill tone={statusTone(job.status)}>{job.status}</Pill></td>
                      <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          onClick={() => startEdit(job)}
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#F7F8FA", border: "1px solid #E2E5EC", color: "#4C5361", padding: "7px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 600, marginRight: 8 }}
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        <button
                          onClick={() => { setError(""); setDeleteTarget(job); }}
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#FBE9E9", border: "1px solid #F5CFCF", color: "#A83232", padding: "7px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {editForm && (
          <VacancyFormModal
            value={editForm}
            onChange={setEditForm}
            onClose={() => { setEditForm(null); setEditJobId(null); }}
            onSubmit={handleEdit}
            saving={saving}
            saveLabel="Save Changes"
            headerTitle="Edit Job Post"
            headerSubtitle={`This job belongs to ${drill.businessName} — changes show up in their dashboard too.`}
            mode="admin"
          />
        )}

        {deleteTarget && (
          <DeleteConfirm
            job={deleteTarget}
            businessName={drill.businessName}
            saving={saving}
            onCancel={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
          />
        )}
      </div>
    );
  }

  // ── Landing: picker + grouped list ────────────────────────────────────────
  return (
    <div style={{ padding: "24px" }}>
      {toast && <Toast text={toast} />}
      {error && <ErrorBanner text={error} onDismiss={() => setError("")} />}

      {/* Panel 1 — choose the employer */}
      <div style={{ background: "#fff", border: "1px solid #E2E5EC", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #E2E5EC", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#141821" }}>Post For Employer</h3>
            <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "#6E7686" }}>
              Choose the account this vacancy belongs to. The job posts under their name.
            </p>
          </div>
          <input
            type="text"
            placeholder="Search employers…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); setSelectedId(null); }}
            style={{ padding: "9px 12px", border: "1px solid #E2E5EC", borderRadius: 8, fontSize: 13, width: 240, outline: "none", color: "#141821", background: "#fff" }}
          />
        </div>

        {pickerLoading ? (
          <Loading label="Loading employers…" />
        ) : employers.length === 0 ? (
          <Empty text={search ? `No employer matches "${search}".` : "No employers registered yet."} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead style={{ background: "#F7F8FA", borderBottom: "1px solid #E2E5EC" }}>
                <tr>
                  <th style={{ ...th, width: 48 }}></th>
                  <th style={th}>Business Name</th>
                  <th style={th}>Telegram ID</th>
                  <th style={th}>Plan</th>
                  <th style={th}>Posted today</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {employers.map((emp) => {
                  const blocked = emp.blockedReason !== null;
                  const picked = emp.id === selectedId;
                  return (
                    <tr
                      key={emp.id}
                      onClick={() => !blocked && setSelectedId(emp.id)}
                      style={{
                        borderBottom: "1px solid #EFF1F5",
                        background: picked ? "#F2F7FD" : "transparent",
                        cursor: blocked ? "not-allowed" : "pointer",
                        opacity: blocked ? 0.62 : 1,
                      }}
                    >
                      <td style={td}>
                        <span
                          aria-hidden
                          style={{
                            display: "inline-block",
                            width: 15,
                            height: 15,
                            borderRadius: "50%",
                            border: picked ? "5px solid #164A9C" : "1.5px solid #C6CCD8",
                            background: "#fff",
                            verticalAlign: "-2px",
                          }}
                        />
                      </td>
                      <td style={{ ...td, fontWeight: 650, color: "#141821" }}>{emp.businessName}</td>
                      <td style={td}>{emp.telegramId ?? "—"}</td>
                      <td style={td}>{emp.packageExpiresAt ? `ends ${formatDate(emp.packageExpiresAt)}` : "No plan"}</td>
                      <td style={{ ...td, fontVariantNumeric: "tabular-nums" }}>{quotaLabel(emp)}</td>
                      <td style={td}>
                        {emp.blockedReason === "expired" ? (
                          <Pill tone="stop">Expired</Pill>
                        ) : emp.blockedReason === "limit" ? (
                          <Pill tone="warn">Limit reached</Pill>
                        ) : (
                          <Pill tone="ok">Active</Pill>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ padding: "14px 24px", borderTop: "1px solid #E2E5EC", background: "#F7F8FA", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12.5, color: "#6E7686" }}>
            {total === 0 ? "No employers" : `Page ${page} of ${lastPage} · ${total} employer${total === 1 ? "" : "s"}`}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || pickerLoading}
              style={pageBtn(page === 1 || pickerLoading)}
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              disabled={page >= lastPage || pickerLoading}
              style={pageBtn(page >= lastPage || pickerLoading)}
            >
              Next
            </button>
            <button
              onClick={startPost}
              disabled={!selected || !!selected.blockedReason}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: 9,
                border: "none",
                fontSize: 13,
                fontWeight: 700,
                cursor: !selected || selected.blockedReason ? "not-allowed" : "pointer",
                background: !selected || selected.blockedReason ? "#E7E9EE" : "linear-gradient(135deg, #141821, #2c2c2e)",
                color: !selected || selected.blockedReason ? "#A2A8B5" : "#fff",
              }}
            >
              <Plus size={15} />
              {selected ? `Post a job for ${selected.businessName}` : "Post a job"}
            </button>
          </div>
        </div>

        {selected?.blockedReason === "expired" && (
          <div style={{ padding: "12px 24px", background: "#FBE9E9", borderTop: "1px solid #F5CFCF", fontSize: 12.5, color: "#A83232" }}>
            {selected.businessName}'s subscription has expired. Renew their plan from View Emp before posting for them.
          </div>
        )}
        {selected?.blockedReason === "limit" && (
          <div style={{ padding: "12px 24px", background: "#FBF1DC", borderTop: "1px solid #F0DFB8", fontSize: 12.5, color: "#8A5D0A" }}>
            {selected.businessName} has used all {selected.dailyPostLimit} of today's posts. The allowance resets at midnight.
          </div>
        )}
      </div>

      {/* Panel 2 — what's already been posted, grouped by business */}
      <div style={{ background: "#fff", border: "1px solid #E2E5EC", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #E2E5EC", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#141821" }}>Jobs posted for employers</h3>
          <span style={{ fontSize: 12.5, color: "#6E7686" }}>grouped by business</span>
        </div>

        {groupsLoading ? (
          <Loading label="Loading…" />
        ) : groups.length === 0 ? (
          <Empty text="No jobs have been posted on an employer's behalf yet." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
              <thead style={{ background: "#F7F8FA", borderBottom: "1px solid #E2E5EC" }}>
                <tr>
                  <th style={th}>Business Name</th>
                  <th style={th}>Posted for them</th>
                  <th style={th}>Last posted</th>
                  <th style={{ ...th, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.employerId} style={{ borderBottom: "1px solid #EFF1F5" }}>
                    <td style={{ ...td, fontWeight: 650, color: "#141821" }}>{group.businessName}</td>
                    <td style={{ ...td, fontVariantNumeric: "tabular-nums" }}>{group.jobCount}</td>
                    <td style={td}>{formatDate(group.lastPostedAt)}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <button
                        onClick={() => openDrill(group)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#F7F8FA", border: "1px solid #E2E5EC", color: "#4C5361", padding: "7px 13px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}
                      >
                        <Users size={13} /> View jobs
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {postForm && postEmployer && (
        <VacancyFormModal
          value={postForm}
          onChange={setPostForm}
          onClose={() => { setPostForm(null); setPostEmployer(null); }}
          onSubmit={handlePost}
          saving={saving}
          saveLabel={`Post as ${postEmployer.businessName}`}
          headerTitle={`Post a job for ${postEmployer.businessName}`}
          headerSubtitle={
            `Posting as ${postEmployer.businessName} · ${quotaLabel(postEmployer)} posts used today` +
            (postEmployer.packageExpiresAt ? ` · plan ends ${formatDate(postEmployer.packageExpiresAt)}` : "")
          }
          maxDeadline={postEmployer.packageExpiresAt}
          mode="admin"
        />
      )}
    </div>
  );
}

function pageBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #E2E5EC",
    background: "#fff",
    color: disabled ? "#B4BAC6" : "#4C5361",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function Loading({ label }: { label: string }) {
  return (
    <div style={{ padding: "40px 24px", textAlign: "center", color: "#9AA1B1", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
      <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> {label}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ padding: "40px 24px", textAlign: "center", color: "#9AA1B1", fontSize: 13.5 }}>{text}</div>;
}

function Toast({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, background: "#12854A", color: "#fff", fontSize: 13, fontWeight: 650, padding: "12px 16px", borderRadius: 10, marginBottom: 16 }}>
      ✓ {text}
    </div>
  );
}

function ErrorBanner({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FDECEC", border: "1px solid #F5CFCF", color: "#A83232", fontSize: 13, fontWeight: 600, padding: "12px 16px", borderRadius: 10, marginBottom: 16 }}>
      <AlertTriangle size={16} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{text}</span>
      <button onClick={onDismiss} style={{ background: "transparent", border: "none", color: "#A83232", cursor: "pointer", fontSize: 16, lineHeight: 1 }} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}

/** Deleting a job takes its applications with it, so the confirmation names the
 *  job, the business, and how many people are about to lose their application —
 *  a bare "Are you sure?" can't convey which of those three is the reason to
 *  stop. Close (from Job Posting Moderation) is the non-destructive option and
 *  is pointed at here rather than left to be remembered. */
function DeleteConfirm({
  job,
  businessName,
  saving,
  onCancel,
  onConfirm,
}: {
  job: PfeJob;
  businessName: string;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 16, padding: 26, width: "100%", maxWidth: 460, border: "1px solid #E2E5EC", boxShadow: "0 24px 64px -18px rgba(15,23,42,0.4)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "#FBE9E9", color: "#A83232", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <AlertTriangle size={19} />
          </div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#141821" }}>Delete this job?</h3>
        </div>

        <p style={{ margin: "0 0 12px", fontSize: 14, color: "#4C5361", lineHeight: 1.55 }}>
          <strong style={{ color: "#141821" }}>{job.title}</strong> at {businessName} will be removed permanently. This can't be undone.
        </p>

        {job.applicantCount > 0 && (
          <p style={{ margin: "0 0 16px", fontSize: 13.5, color: "#8A5D0A", background: "#FBF1DC", border: "1px solid #F0DFB8", padding: "11px 13px", borderRadius: 9, lineHeight: 1.55 }}>
            {job.applicantCount} {job.applicantCount === 1 ? "person has" : "people have"} applied. Deleting the job deletes {job.applicantCount === 1 ? "their application" : "their applications"} too, and {businessName} loses {job.applicantCount === 1 ? "that applicant" : "those applicants"}. To take the job offline without losing anyone, close it from Job Posting Moderation instead.
          </p>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1.5px solid #E2E5EC", background: "#F7F8FA", color: "#6E7686", fontSize: 13.5, fontWeight: 650, cursor: saving ? "not-allowed" : "pointer" }}
          >
            Keep it
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: saving ? "#D89A9A" : "#B33A3A", color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "Deleting…" : "Delete job"}
          </button>
        </div>
      </div>
    </div>
  );
}
