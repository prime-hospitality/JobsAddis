"use client";

import React, { useEffect, useState } from "react";
import {
  getEmployerPostingData,
  upsertEmployerVacancyTemplate,
  deleteEmployerVacancyTemplate,
  checkEmployerTemplateStatus,
  postJobFromEmployerTemplate,
  scheduleJobFromEmployerTemplate,
} from "./actions";
import VacancyFormModal from "./VacancyFormModal";
import { VacancyFormState, emptyVacancyForm, templateRowToForm } from "./vacancyShared";
import { Plus, Trash2, Pencil, Briefcase, MapPin, Clock, CheckCircle2, Users, Send, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Timer } from "@phosphor-icons/react";
import JobDetailScreen from "@/screens/JobDetailScreen";
import { Job } from "@/data/jobs";

export default function VacancyTemplateTab() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [businessName, setBusinessName] = useState("Your Company");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getEmployerPostingData();
      setTemplates(res.templates);
      setBusinessName(res.businessName || "Your Company");
      setLogoUrl(res.logoUrl || null);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Template form modal state
  const [formModal, setFormModal] = useState<VacancyFormState | null>(null);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  const handleSaveTemplate = async () => {
    if (!formModal) return;
    setTemplateSaving(true);
    try {
      const res = await upsertEmployerVacancyTemplate(formModal);
      if (!res.success) {
        setErrorModal(res.error || "Failed to save template.");
        return;
      }
      setFormModal(null);
      loadData();
    } finally {
      setTemplateSaving(false);
    }
  };

  // Delete confirm
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    await deleteEmployerVacancyTemplate(deleteConfirmId);
    setDeleteConfirmId(null);
    loadData();
  };

  // Preview mockup
  const [viewingTemplateJob, setViewingTemplateJob] = useState<Job | null>(null);

  // Post / confirm-post
  const [postingTemplateId, setPostingTemplateId] = useState<string | null>(null);
  const [postedTemplateId, setPostedTemplateId] = useState<string | null>(null);
  const [confirmPostData, setConfirmPostData] = useState<{ templateId: string; status: "same" | "changed" | "new" | null; lastPosted?: string } | null>(null);

  const handleConfirmPost = async () => {
    if (!confirmPostData) return;
    const templateId = confirmPostData.templateId;
    setConfirmPostData(null);
    setPostingTemplateId(templateId);
    try {
      const res = await postJobFromEmployerTemplate(templateId);
      if (!res.success) {
        setErrorModal("Failed to post job: " + res.error);
        return;
      }
      setPostedTemplateId(templateId);
      setTimeout(() => setPostedTemplateId(null), 3000);
    } catch (err) {
      setErrorModal("Failed to post job: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setPostingTemplateId(null);
    }
  };

  // Schedule modal
  const [scheduleTemplateModal, setScheduleTemplateModal] = useState<{ id: string; title: string } | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState("");

  const handleScheduleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleTemplateModal || !scheduleDate || !scheduleTime) return;
    setScheduleLoading(true);
    setScheduleError("");
    try {
      const scheduledIso = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      const res = await scheduleJobFromEmployerTemplate(scheduleTemplateModal.id, scheduledIso);
      if (!res.success) {
        setScheduleError(res.error || "Failed to schedule publication");
        return;
      }
      setScheduleTemplateModal(null);
      setScheduleDate("");
      setScheduleTime("");
      setPostedTemplateId(scheduleTemplateModal.id);
      setTimeout(() => setPostedTemplateId(null), 4000);
    } catch (err: any) {
      setScheduleError(err.message || "Failed to schedule publication");
    } finally {
      setScheduleLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-[#8e8e93]">Loading your templates...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-black">Your Vacancy Templates</h3>
          <p className="text-sm text-[#8e8e93] mt-0.5">Save reusable job templates and post them whenever a role opens up.</p>
        </div>
        <button
          onClick={() => setFormModal(emptyVacancyForm())}
          className="bg-[#0284c7] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#0369a1] transition-colors flex items-center gap-2"
        >
          <Plus size={16} /> Add Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((tpl) => {
          const salaryMin = tpl.salary_min ?? 0;
          const salaryMax = tpl.salary_max ?? 0;
          const salaryLabelText =
            tpl.salary_type === "company_scale" ? "Per Company Scale" :
            tpl.salary_type === "negotiable" ? "Negotiable" :
            salaryMin > 0
              ? `ETB ${salaryMin >= 1000 ? (salaryMin / 1000).toFixed(0) + "k" : salaryMin}${salaryMax && salaryMax !== salaryMin ? "–" + (salaryMax >= 1000 ? (salaryMax / 1000).toFixed(0) + "k" : salaryMax) : ""}/mo`
              : "Salary TBD";
          return (
            <div
              key={tpl.id}
              onClick={() => {
                const formatList = (txt: string) => txt.split("\n").filter((l) => l.trim()).map((l) => (l.trim().match(/^[-•*]/) ? l : `• ${l.trim()}`)).join("\n");
                let desc = tpl.description_template || "";
                if (tpl.responsibilities_template) desc += "\n\nResponsibilities:\n" + formatList(tpl.responsibilities_template);
                if (tpl.requirements_template) desc += "\n\nRequirements:\n" + formatList(tpl.requirements_template);
                if (tpl.benefits_template) desc += "\n\nBenefits:\n" + formatList(tpl.benefits_template);

                setViewingTemplateJob({
                  id: tpl.id,
                  businessName,
                  businessLogo: "🏢",
                  logoUrl: logoUrl || undefined,
                  businessType: "Employer",
                  title: tpl.title || "Untitled",
                  category: tpl.job_category || "Other",
                  location: tpl.location || "Addis Ababa",
                  neighborhood: tpl.location || "Addis Ababa",
                  jobType: (tpl.employment_type as any) || "Full Time",
                  salaryMin: tpl.salary_type === "company_scale" ? -2 : tpl.salary_type === "negotiable" ? -1 : (tpl.salary_min ?? -1),
                  salaryMax: tpl.salary_type === "company_scale" ? -2 : tpl.salary_type === "negotiable" ? -1 : (tpl.salary_max ?? -1),
                  currency: tpl.salary_currency || "ETB",
                  postedAt: new Date().toISOString(),
                  description: desc,
                  fullDescription: desc,
                  requirements: {
                    experience: (tpl.experience_required as any) || "Entry Level",
                    education: tpl.education_requirements || "",
                    languages: [],
                    locationPreference: null,
                  },
                  deadline: tpl.deadline || new Date().toISOString(),
                  qualificationsMet: true,
                  locationMismatch: false,
                });
              }}
              style={{ background: "var(--card, #2c2c2e)", borderRadius: 16, padding: 16, marginBottom: 0, border: "1px solid var(--border, rgba(255,255,255,0.08))", boxShadow: "0 2px 12px rgba(0,0,0,0.18)", cursor: "pointer" }}
            >
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--brand-subtle, rgba(14,165,233,0.12))", border: "1px solid var(--border, rgba(255,255,255,0.08))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                  {logoUrl ? (
                    <img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <Briefcase size={20} color="#38bdf8" />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, color: "var(--text-secondary, #94a3b8)", marginBottom: 2, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {tpl.job_category || "Template"}
                  </p>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary, #f1f5f9)", lineHeight: 1.2, marginBottom: 4 }}>
                    {tpl.title}
                  </h3>
                  <span style={{ fontSize: 11, color: "var(--text-muted, #64748b)", display: "flex", alignItems: "center", gap: 3 }}>
                    <Clock size={10} />
                    Template
                  </span>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFormModal(templateRowToForm(tpl)); }}
                    style={{ padding: "6px", borderRadius: 8, background: "rgba(14,165,233,0.12)", border: "1px solid rgba(14,165,233,0.2)", color: "#38bdf8", cursor: "pointer", display: "flex", alignItems: "center" }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(tpl.id); }}
                    style={{ padding: "6px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <p style={{ fontSize: 13, color: "var(--text-secondary, #94a3b8)", lineHeight: 1.5, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {tpl.description_template || "No description provided."}
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span className="badge badge-brand">{salaryLabelText}</span>
                <span className="badge badge-navy" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Briefcase size={9} />{tpl.employment_type || "Full Time"}
                </span>
                {tpl.location && (
                  <span className="badge badge-navy" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={9} />{tpl.location}
                  </span>
                )}
                {tpl.quantity > 1 && (
                  <span className="badge badge-navy" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Users size={9} />{tpl.quantity} openings
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12, width: "100%" }} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (postingTemplateId) return;
                    setPostingTemplateId(tpl.id);
                    try {
                      const status = await checkEmployerTemplateStatus(tpl.id);
                      setConfirmPostData({ templateId: tpl.id, status: (status?.status as "same" | "changed" | "new") || "new", lastPosted: status?.lastPosted });
                    } catch (err) {
                      setErrorModal("Failed to check status: " + (err instanceof Error ? err.message : "Unknown error"));
                    } finally {
                      setPostingTemplateId(null);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "9px 12px",
                    borderRadius: 10,
                    border: postedTemplateId === tpl.id ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(34,197,94,0.25)",
                    background: postedTemplateId === tpl.id ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.08)",
                    color: postedTemplateId === tpl.id ? "#16a34a" : "#22c55e",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: postingTemplateId === tpl.id ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    transition: "all 0.2s",
                    opacity: postingTemplateId && postingTemplateId !== tpl.id ? 0.5 : 1,
                  }}
                >
                  {postingTemplateId === tpl.id ? (
                    <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Posting...</>
                  ) : postedTemplateId === tpl.id ? (
                    <><CheckCircle2 size={14} /> Posted Successfully!</>
                  ) : (
                    <><Send size={14} /> Post</>
                  )}
                </button>

                <button
                  type="button"
                  title="Scheduled Publication"
                  onClick={(e) => { e.stopPropagation(); setScheduleTemplateModal({ id: tpl.id, title: tpl.title }); }}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(2,132,199,0.3)",
                    background: "rgba(2,132,199,0.1)",
                    color: "#0284c7",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s",
                  }}
                >
                  <Timer size={16} weight="bold" />
                </button>
              </div>
            </div>
          );
        })}
        {templates.length === 0 && <p className="text-center text-[#8e8e93] py-8 col-span-full">No templates yet. Click &quot;Add Template&quot; to create one.</p>}
      </div>

      {formModal && (
        <VacancyFormModal
          value={formModal}
          onChange={setFormModal}
          onClose={() => setFormModal(null)}
          onSubmit={handleSaveTemplate}
          saving={templateSaving}
          saveLabel="Save Template"
          headerTitle={formModal.id ? "Edit Vacancy Template" : "Create New Template"}
          headerSubtitle="Configure a predefined job posting for quick reuse."
        />
      )}

      {/* Delete confirm */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-xl font-bold text-black mb-2">Delete Template</h3>
            <p className="text-[#8e8e93] mb-6 text-sm">Are you sure you want to delete this template? This action cannot be undone.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 px-4 py-2.5 text-sm font-medium text-[#1c1c1e] bg-[#e5e5ea] hover:bg-[#e5e5ea] rounded-xl transition-colors">
                No, cancel
              </button>
              <button onClick={executeDelete} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors">
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview mockup */}
      {viewingTemplateJob && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
          onClick={() => setViewingTemplateJob(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: 390, height: 780, borderRadius: 48, background: "#111", boxShadow: "0 0 0 2px #333, 0 0 0 6px #111, 0 32px 80px rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", flexShrink: 0 }}
          >
            <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", width: 120, height: 34, background: "#111", borderRadius: 20, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#222" }} />
              <div style={{ width: 72, height: 10, borderRadius: 10, background: "#1a1a1a" }} />
            </div>
            <div style={{ flex: 1, background: "var(--app-bg, #f9fafb)", borderRadius: 46, overflow: "hidden", margin: 4 }}>
              <div style={{ height: 50, display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 24px 6px", background: "var(--app-bg, #f9fafb)" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#111827" }}>9:41</span>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 1.5, alignItems: "flex-end" }}>
                    {[3, 5, 7, 9].map((h) => <div key={h} style={{ width: 3, height: h, background: "#111827", borderRadius: 1 }} />)}
                  </div>
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="none"><path d="M7 2.5C8.7 2.5 10.2 3.2 11.3 4.3L12.7 2.9C11.2 1.5 9.2 0.5 7 0.5C4.8 0.5 2.8 1.5 1.3 2.9L2.7 4.3C3.8 3.2 5.3 2.5 7 2.5Z" fill="#111827"/><path d="M7 5.5C8 5.5 8.9 5.9 9.6 6.6L11 5.2C9.9 4.2 8.5 3.5 7 3.5C5.5 3.5 4.1 4.2 3 5.2L4.4 6.6C5.1 5.9 6 5.5 7 5.5Z" fill="#111827"/><circle cx="7" cy="9" r="1.5" fill="#111827"/></svg>
                  <div style={{ width: 22, height: 11, border: "1.5px solid #111827", borderRadius: 3, position: "relative" }}>
                    <div style={{ position: "absolute", right: -3, top: "50%", transform: "translateY(-50%)", width: 2.5, height: 5, background: "#111827", borderRadius: 1 }} />
                    <div style={{ margin: 2, height: "calc(100% - 4px)", width: "70%", background: "#111827", borderRadius: 1.5 }} />
                  </div>
                </div>
              </div>
              <div style={{ height: "calc(100% - 50px)", overflow: "hidden" }}>
                <JobDetailScreen job={viewingTemplateJob} isEmployer={false} onBack={() => setViewingTemplateJob(null)} onApply={() => {}} />
              </div>
            </div>
            <div style={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", width: 120, height: 5, background: "#444", borderRadius: 3 }} />
          </div>
          <p style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,0.4)", fontSize: 12, whiteSpace: "nowrap" }}>
            Click outside to close
          </p>
        </div>
      )}

      {/* Confirm Post Modal */}
      {confirmPostData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm" onClick={() => setConfirmPostData(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex gap-4 mb-2">
                <div className={`p-3 rounded-full flex-shrink-0 h-12 w-12 flex items-center justify-center ${
                  confirmPostData.status === "same" ? "bg-amber-100 text-amber-600" :
                  confirmPostData.status === "changed" ? "bg-blue-100 text-blue-600" :
                  "bg-green-100 text-green-600"
                }`}>
                  {confirmPostData.status === "same" ? <AlertTriangle size={24} /> :
                   confirmPostData.status === "changed" ? <RefreshCw size={24} /> :
                   <Send size={24} />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-black mb-1">
                    {confirmPostData.status === "same" ? "Post Again?" :
                     confirmPostData.status === "changed" ? "Post Updated Version?" :
                     "Confirm Post"}
                  </h3>
                  <p className="text-sm text-[#8e8e93] leading-relaxed">
                    {confirmPostData.status === "same" ? "Everything is the same as the last time you posted this. Are you sure you want to create a duplicate job post?" :
                     confirmPostData.status === "changed" ? `This template has been modified since it was last posted (on ${confirmPostData.lastPosted ? new Date(confirmPostData.lastPosted).toLocaleDateString() : "a while ago"}). Post the new version?` :
                     "Are you sure you want to post this template as a new job?"}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-[#f2f2f7] px-6 py-4 flex justify-end gap-3 border-t border-[#e5e5ea]">
              <button onClick={() => setConfirmPostData(null)} className="px-4 py-2 text-sm font-semibold text-[#1c1c1e] bg-white border border-[#c6c6c8] rounded-lg hover:bg-[#f2f2f7] transition-colors">
                Cancel
              </button>
              <button
                onClick={handleConfirmPost}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors shadow-sm flex items-center gap-2 ${
                  confirmPostData.status === "same" ? "bg-amber-500 hover:bg-amber-600" :
                  confirmPostData.status === "changed" ? "bg-blue-600 hover:bg-blue-700" :
                  "bg-green-600 hover:bg-green-700"
                }`}
              >
                <Send size={16} />
                {confirmPostData.status === "same" ? "Yes, Post Again" : confirmPostData.status === "changed" ? "Post Update" : "Confirm Post"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule modal */}
      {scheduleTemplateModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={() => { setScheduleTemplateModal(null); setScheduleError(""); }} />
          <div style={{ position: "relative", background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 420, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#e0f2fe", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Timer size={24} weight="bold" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#111827" }}>Scheduled Publication</h3>
                <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>{scheduleTemplateModal.title}</p>
              </div>
            </div>

            <form onSubmit={handleScheduleConfirm} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Publish Date</label>
                <input
                  type="date"
                  required
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, outline: "none" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Publish Time</label>
                <input
                  type="time"
                  required
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, outline: "none" }}
                />
              </div>

              {scheduleError && <p style={{ color: "#ef4444", fontSize: 12, margin: 0 }}>{scheduleError}</p>}

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => { setScheduleTemplateModal(null); setScheduleError(""); }}
                  style={{ flex: 1, padding: "10px", background: "#f3f4f6", border: "none", borderRadius: 8, color: "#374151", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduleLoading}
                  style={{ flex: 1, padding: "10px", background: "#0284c7", border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600, cursor: scheduleLoading ? "not-allowed" : "pointer" }}
                >
                  {scheduleLoading ? "Scheduling..." : "Set Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Error Modal */}
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
              <button onClick={() => setErrorModal(null)} className="px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm">
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
