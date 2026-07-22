"use client";

import React, { useEffect, useState } from "react";
import { Plus, Pencil, MapPin, Briefcase, Users, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { getEmployerPostingData, createEmployerJob, updateEmployerJobPost } from "./actions";
import VacancyFormModal from "./VacancyFormModal";
import { VacancyFormState, emptyVacancyForm, jobRowToForm } from "./vacancyShared";

function salaryLabel(job: any) {
  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n));
  if (job.salary_min === -1) return "Negotiable";
  if (job.salary_min === -2) return "Per Company Scale";
  if (job.salary_min > 0) return `ETB ${fmt(job.salary_min)}${job.salary_max && job.salary_max !== job.salary_min ? "–" + fmt(job.salary_max) : ""}/mo`;
  return "Salary TBD";
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: "#dcfce7", color: "#166534", label: "Live" },
  pending: { bg: "#fef3c7", color: "#92400e", label: "Under Review" },
  scheduled: { bg: "#e0f2fe", color: "#0369a1", label: "Scheduled" },
  closed: { bg: "#f1f5f9", color: "#475569", label: "Closed" },
  expired: { bg: "#fee2e2", color: "#991b1b", label: "Expired" },
  rejected: { bg: "#fee2e2", color: "#991b1b", label: "Rejected" },
};

export default function PostTab() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [autoPublish, setAutoPublish] = useState(false);
  const [dailyPostLimit, setDailyPostLimit] = useState(3);
  const [loading, setLoading] = useState(true);

  const [formModal, setFormModal] = useState<{ mode: "create" | "edit"; jobId?: string; value: VacancyFormState } | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getEmployerPostingData();
      setJobs(res.jobs);
      setAutoPublish(res.autoPublish);
      setDailyPostLimit(res.dailyPostLimit);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const postedToday = jobs.filter((j) => {
    const created = new Date(j.created_at);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return created >= start;
  }).length;

  const handleSubmit = async () => {
    if (!formModal) return;
    setSaving(true);
    try {
      if (formModal.mode === "create") {
        const res = await createEmployerJob(formModal.value);
        if (!res.success) {
          setErrorModal(res.error || "Something went wrong.");
          return;
        }
        setFormModal(null);
        setSuccessNote(res.status === "active" ? "Job posted and is now live!" : "Job submitted — it will go live once reviewed.");
      } else {
        const res = await updateEmployerJobPost(formModal.jobId!, formModal.value);
        if (!res.success) {
          setErrorModal(res.error || "Something went wrong.");
          return;
        }
        setFormModal(null);
        setSuccessNote("Job updated successfully.");
      }
      setTimeout(() => setSuccessNote(null), 4000);
      loadData();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", margin: 0 }}>Your Job Postings</h3>
          <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0 0" }}>
            {autoPublish ? "Your posts go live instantly." : "New posts require a quick review before going live."}
            {dailyPostLimit !== -1 && <> · {postedToday}/{dailyPostLimit} posted today</>}
          </p>
        </div>
        <button
          onClick={() => setFormModal({ mode: "create", value: emptyVacancyForm() })}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0284c7", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(2,132,199,0.25)" }}
        >
          <Plus size={16} /> Post Now
        </button>
      </div>

      {successNote && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          <CheckCircle2 size={16} /> {successNote}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", color: "#94a3b8", padding: "48px 0", fontSize: 14 }}>Loading your postings...</div>
      ) : jobs.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px dashed #cbd5e1", padding: "48px 32px", textAlign: "center" }}>
          <div style={{ color: "#94a3b8", display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <Briefcase size={44} strokeWidth={1.5} />
          </div>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>No job postings yet</h4>
          <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Click &quot;Post Now&quot; to publish your first vacancy.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {jobs.map((job) => {
            const status = STATUS_STYLE[job.status] || STATUS_STYLE.pending;
            return (
              <div key={job.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 18, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", margin: "0 0 2px 0", textTransform: "uppercase", letterSpacing: "0.04em" }}>{job.category || "Other"}</p>
                    <h4 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0, lineHeight: 1.25 }}>{job.title}</h4>
                  </div>
                  <button
                    onClick={() => setFormModal({ mode: "edit", jobId: job.id, value: jobRowToForm(job) })}
                    title="Edit job"
                    style={{ flexShrink: 0, padding: 8, borderRadius: 8, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#0284c7", cursor: "pointer", display: "flex", alignItems: "center" }}
                  >
                    <Pencil size={14} />
                  </button>
                </div>

                <span style={{ alignSelf: "flex-start", background: status.bg, color: status.color, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999 }}>
                  {status.label}
                </span>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#334155", fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999 }}>
                    {salaryLabel(job)}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#334155", fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999 }}>
                    <Briefcase size={10} /> {job.job_type || "Full Time"}
                  </span>
                  {job.location && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#334155", fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999 }}>
                      <MapPin size={10} /> {job.location}
                    </span>
                  )}
                  {job.quantity > 1 && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#f8fafc", border: "1px solid #e2e8f0", color: "#334155", fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999 }}>
                      <Users size={10} /> {job.quantity} openings
                    </span>
                  )}
                </div>

                <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, display: "flex", alignItems: "center", gap: 4 }}>
                  <Clock size={11} /> Posted {new Date(job.created_at).toLocaleDateString()}
                  {job.deadline && <> · Deadline {new Date(job.deadline).toLocaleDateString()}</>}
                </p>
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

      {errorModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm" onClick={() => setErrorModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex gap-4 items-start">
                <div className="p-3 rounded-full flex-shrink-0 h-12 w-12 flex items-center justify-center bg-red-100 text-red-600">
                  <AlertTriangle size={24} />
                </div>
                <div className="pt-1">
                  <h3 className="text-lg font-bold text-black mb-1">Attention Needed</h3>
                  <p className="text-sm text-[#8e8e93] leading-relaxed">{errorModal}</p>
                </div>
              </div>
            </div>
            <div className="bg-[#f2f2f7] px-6 py-4 flex justify-end border-t border-[#e5e5ea]">
              <button
                onClick={() => setErrorModal(null)}
                className="px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
