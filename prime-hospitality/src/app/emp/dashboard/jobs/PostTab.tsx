"use client";

import React, { useState } from "react";
import { Plus, Pencil, Trash2, MapPin, Briefcase, Users, Clock, CalendarClock, CheckCircle2, Radio, Hourglass, ListChecks } from "lucide-react";
import { createEmployerJob, updateEmployerJobPost, deleteEmployerJob } from "./actions";
import VacancyFormModal from "./VacancyFormModal";
import { VacancyFormState, emptyVacancyForm, jobRowToForm } from "./vacancyShared";
import { StatusPill, MetaChip, Stat, STATUS_META, salaryLabel, AttentionModal, ConfirmModal } from "./postingUI";
import type { PostingData } from "./ManageJobPostingsTab";

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "•";
}

export default function PostTab({ data, loading, reload }: { data: PostingData; loading: boolean; reload: () => Promise<void>; }) {
  const { jobs, autoPublish, dailyPostLimit, businessName, logoUrl } = data;

  const [formModal, setFormModal] = useState<{ mode: "create" | "edit"; jobId?: string; value: VacancyFormState } | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await deleteEmployerJob(deleteTarget.id);
      if (!res.success) { setDeleteTarget(null); setErrorModal(res.error || "Failed to delete job."); return; }
      setDeleteTarget(null);
      setSuccessNote("Job posting deleted.");
      setTimeout(() => setSuccessNote(null), 4000);
      await reload();
    } finally {
      setDeleting(false);
    }
  };

  const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const postedToday = jobs.filter((j) => new Date(j.created_at) >= startOfToday()).length;
  const liveCount = jobs.filter((j) => j.status === "active").length;
  const reviewCount = jobs.filter((j) => j.status === "pending").length;
  const scheduledCount = jobs.filter((j) => j.status === "scheduled").length;
  const limitReached = dailyPostLimit !== -1 && postedToday >= dailyPostLimit;

  const handleSubmit = async () => {
    if (!formModal) return;
    setSaving(true);
    try {
      if (formModal.mode === "create") {
        const res = await createEmployerJob(formModal.value);
        if (!res.success) { setErrorModal(res.error || "Something went wrong."); return; }
        setFormModal(null);
        setSuccessNote(res.status === "active" ? "Job posted and is now live!" : "Job submitted — it will go live once reviewed.");
      } else {
        const res = await updateEmployerJobPost(formModal.jobId!, formModal.value);
        if (!res.success) { setErrorModal(res.error || "Something went wrong."); return; }
        setFormModal(null);
        setSuccessNote("Job updated successfully.");
      }
      setTimeout(() => setSuccessNote(null), 4000);
      await reload();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-.02em" }}>Your Job Postings</h2>
          <p style={{ fontSize: 13, color: "#64748b", margin: "5px 0 0 0" }}>
            {autoPublish ? "Your posts go live instantly." : "New posts get a quick review before going live."}
          </p>
        </div>
        <button
          className="mjp-btn-primary"
          onClick={() => setFormModal({ mode: "create", value: emptyVacancyForm() })}
          disabled={limitReached}
          title={limitReached ? "Daily posting limit reached" : "Post a new job"}
        >
          <Plus size={16} /> Post Now
        </button>
      </div>

      {/* Stat strip */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
          <Stat icon={<ListChecks size={18} />} value={jobs.length} label="Total Posts" tint="#0284c7" />
          <Stat icon={<Radio size={18} />} value={liveCount} label="Live" tint="#059669" />
          <Stat icon={<Hourglass size={18} />} value={reviewCount} label="Under Review" tint="#d97706" />
          {scheduledCount > 0 && (
            <Stat icon={<CalendarClock size={18} />} value={scheduledCount} label="Scheduled" tint="#0ea5e9" />
          )}
          <Stat
            icon={<Clock size={18} />}
            value={dailyPostLimit === -1 ? postedToday : `${postedToday}/${dailyPostLimit}`}
            label="Posted Today"
            tint="#0891b2"
          />
        </div>
      )}

      {successNote && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#047857", borderRadius: 10, padding: "11px 14px", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          <CheckCircle2 size={16} /> {successNote}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", color: "#94a3b8", padding: "56px 0", fontSize: 14 }}>Loading your postings…</div>
      ) : jobs.length === 0 ? (
        <div className="mjp-empty">
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#eff6ff", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Briefcase size={26} strokeWidth={1.75} />
          </div>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>No job postings yet</h4>
          <p style={{ fontSize: 13.5, color: "#64748b", margin: "0 0 20px 0" }}>Publish your first vacancy and it&apos;ll show up here.</p>
          <button className="mjp-btn-primary" style={{ margin: "0 auto" }} onClick={() => setFormModal({ mode: "create", value: emptyVacancyForm() })} disabled={limitReached}>
            <Plus size={16} /> Post Now
          </button>
        </div>
      ) : (
        <div className="mjp-grid">
          {jobs.map((job) => {
            const accent = (STATUS_META[job.status] || STATUS_META.pending).accent;
            return (
              <div key={job.id} className="mjp-card">
                <div className="mjp-card-accent" style={{ background: accent }} />
                <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                  {/* Top: logo + title + status */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div className="mjp-logo">
                      {logoUrl ? <img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials(businessName)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="mjp-eyebrow">{job.category || "Other"}</p>
                      <h3 className="mjp-title" style={{ overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{job.title}</h3>
                    </div>
                    <StatusPill status={job.status} />
                  </div>

                  {/* Meta chips */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <MetaChip variant="salary">{salaryLabel(job.salary_min, job.salary_max)}</MetaChip>
                    <MetaChip icon={<Briefcase size={11} />}>{job.job_type || "Full Time"}</MetaChip>
                    {job.location && <MetaChip icon={<MapPin size={11} />}>{job.location}</MetaChip>}
                    {job.quantity > 1 && <MetaChip icon={<Users size={11} />}>{job.quantity} openings</MetaChip>}
                  </div>

                  <div style={{ flex: 1 }} />
                  <div style={{ height: 1, background: "#f1f5f9" }} />

                  {/* Footer: dates + actions */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    {job.status === "scheduled" && job.scheduled_at ? (
                      <div style={{ fontSize: 11.5, color: "#0369a1", fontWeight: 600, display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                        <CalendarClock size={12} style={{ flexShrink: 0 }} />
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          Publishes {new Date(job.scheduled_at).toLocaleDateString()} at {new Date(job.scheduled_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                    ) : (
                      <div style={{ fontSize: 11.5, color: "#94a3b8", display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                        <Clock size={12} style={{ flexShrink: 0 }} />
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {new Date(job.created_at).toLocaleDateString()}
                          {job.deadline && ` · ends ${new Date(job.deadline).toLocaleDateString()}`}
                        </span>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button className="mjp-iconbtn edit" title="Edit job" onClick={() => setFormModal({ mode: "edit", jobId: job.id, value: jobRowToForm(job) })}>
                        <Pencil size={15} />
                      </button>
                      <button className="mjp-iconbtn danger" title="Delete job" onClick={() => setDeleteTarget({ id: job.id, title: job.title })}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formModal && (
        <VacancyFormModal
          value={formModal.value}
          onChange={(next) => setFormModal({ ...formModal, value: next })}
          onClose={() => setFormModal(null)}
          onSubmit={handleSubmit}
          saving={saving}
          saveLabel={formModal.mode === "create" ? "Post Now" : "Save Changes"}
          headerTitle={formModal.mode === "create" ? "Post a New Job" : "Edit Job Posting"}
          headerSubtitle={formModal.mode === "create" ? "Fill in the details below to publish this vacancy." : "Update the details of this job posting."}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete this job posting?"
          message={<><strong style={{ color: "#0f172a" }}>{deleteTarget.title}</strong> and any applications to it will be permanently removed. This can&apos;t be undone.</>}
          confirmLabel="Delete Posting"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {errorModal && <AttentionModal message={errorModal} onClose={() => setErrorModal(null)} />}
    </div>
  );
}
