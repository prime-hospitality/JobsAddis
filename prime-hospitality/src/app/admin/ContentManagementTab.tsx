"use client";

import React, { useState, useEffect } from "react";
import { getContentData, upsertFaq, deleteFaq, upsertVacancyTemplate, deleteVacancyTemplate, updateOnboardingConfig, postJobFromTemplate, checkTemplateStatus } from "./actions";
import { Plus, Save, Trash2, Pencil, X, Briefcase, MapPin, CreditCard, Calendar, FileText, CheckCircle2, Clock, Users, Send, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { searchLocations } from "@/data/locations";
import JobDetailScreen from "@/screens/JobDetailScreen";
import { Job } from "@/data/jobs";


export default function ContentManagementTab() {
  const [activeSubTab, setActiveSubTab] = useState<"faqs" | "templates" | "onboarding">("faqs");
  const [data, setData] = useState<{ faqs: any[]; templates: any[]; onboardingConfig: any[] }>({ faqs: [], templates: [], onboardingConfig: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getContentData();
      setData(res);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // Delete Confirm State
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<
    | { type: "faq" | "template"; id: string }
    | { type: "arrayRemove"; configKey: string; itemIndex: number; itemLabel: string }
    | null
  >(null);

  const executeDelete = async () => {
    if (!deleteConfirmModal) return;
    if (deleteConfirmModal.type === "faq") {
      await deleteFaq(deleteConfirmModal.id);
    } else if (deleteConfirmModal.type === "template") {
      await deleteVacancyTemplate(deleteConfirmModal.id);
    } else if (deleteConfirmModal.type === "arrayRemove") {
      const { configKey, itemIndex } = deleteConfirmModal;
      let parsedArray: any[] = [];
      try { parsedArray = JSON.parse(configState[configKey] || "[]"); } catch (e) {}
      const newArr = parsedArray.filter((_, i) => i !== itemIndex);
      setConfigState(prev => ({ ...prev, [configKey]: JSON.stringify(newArr) }));
      setDirtyKeys(prev => new Set(prev).add(configKey));
    }
    setDeleteConfirmModal(null);
    if (deleteConfirmModal.type !== "arrayRemove") loadData();
  };

  // FAQ State
  const [faqModal, setFaqModal] = useState<{ id?: string; question: string; answer: string; display_order: number } | null>(null);

  const handleSaveFaq = async () => {
    if (!faqModal) return;
    await upsertFaq(faqModal.id || null, faqModal.question, faqModal.answer, faqModal.display_order);
    setFaqModal(null);
    loadData();
  };

  const handleDeleteFaq = (id: string) => {
    setDeleteConfirmModal({ id, type: "faq" });
  };

  // Template State
  const [requirementsTab, setRequirementsTab] = useState<"skill" | "education">("skill");
  const [templateModal, setTemplateModal] = useState<{
    id?: string;
    title: string;
    job_category: string;
    description_template: string;
    requirements_template: string;
    location: string;
    employment_type: string;
    salary_type: string;
    salary_min: number | null;
    salary_max: number | null;
    salary_currency: string;
    salary_period: string;
    experience_required: string;
    responsibilities_template: string;
    benefits_template: string;
    deadline: string;
    quantity: number;
    education_requirements: string;
  } | null>(null);
  const [viewingTemplateJob, setViewingTemplateJob] = useState<Job | null>(null);
  const [postingTemplateId, setPostingTemplateId] = useState<string | null>(null);
  const [postedTemplateId, setPostedTemplateId] = useState<string | null>(null);
  const [confirmPostData, setConfirmPostData] = useState<{
    templateId: string;
    status: "same" | "changed" | "new" | null;
    lastPosted?: string;
  } | null>(null);

  const handleConfirmPost = async () => {
    if (!confirmPostData) return;
    const templateId = confirmPostData.templateId;
    setConfirmPostData(null);
    setPostingTemplateId(templateId);
    try {
      await postJobFromTemplate(templateId);
      setPostedTemplateId(templateId);
      setTimeout(() => setPostedTemplateId(null), 3000);
    } catch (err) {
      setErrorModal("Failed to post job: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setPostingTemplateId(null);
    }
  };
  const [locationSuggestionsOpen, setLocationSuggestionsOpen] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  const handleSaveTemplate = async () => {
    if (!templateModal) return;
    if (!templateModal.description_template.trim()) {
      setErrorModal("Job Description is required.");
      return;
    }
    setTemplateSaving(true);
    try {
      await upsertVacancyTemplate(templateModal);
      setTemplateModal(null);
      loadData();
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleDeleteTemplate = (id: string) => {
    setDeleteConfirmModal({ id, type: "template" });
  };

  // Onboarding Config State
  const [configState, setConfigState] = useState<Record<string, string>>({});
  const [activeOnboardingStep, setActiveOnboardingStep] = useState<number>(1);
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (data.onboardingConfig.length > 0) {
      const c: Record<string, string> = {};
      data.onboardingConfig.forEach((item) => {
        c[item.key] = item.value;
      });
      setConfigState(c);
    }
  }, [data.onboardingConfig]);

  const handleSaveConfig = async (key: string, label: string) => {
    await updateOnboardingConfig(key, label, configState[key] || "");
    setDirtyKeys(prev => { const next = new Set(prev); next.delete(key); return next; });
    loadData();
  };

  if (loading) {
    return <div className="p-8 text-center text-[#8e8e93]">Loading content data...</div>;
  }

  return (
    <div className="bg-white rounded-2xl border border-[#c6c6c8] shadow-sm overflow-hidden flex flex-col h-full">
      {/* Sub Tabs */}
      <div className="flex border-b border-[#c6c6c8] bg-[#f2f2f7]/50">
        <button
          onClick={() => setActiveSubTab("faqs")}
          className={`px-6 py-4 text-sm font-medium transition-colors ${activeSubTab === "faqs" ? "text-[#0284c7] border-b-2 border-[#0284c7] bg-white" : "text-[#8e8e93] hover:text-[#1c1c1e]"}`}
        >
          FAQs
        </button>
        <button
          onClick={() => setActiveSubTab("templates")}
          className={`px-6 py-4 text-sm font-medium transition-colors ${activeSubTab === "templates" ? "text-[#0284c7] border-b-2 border-[#0284c7] bg-white" : "text-[#8e8e93] hover:text-[#1c1c1e]"}`}
        >
          Vacancy Templates
        </button>
        <button
          onClick={() => setActiveSubTab("onboarding")}
          className={`px-6 py-4 text-sm font-medium transition-colors ${activeSubTab === "onboarding" ? "text-[#0284c7] border-b-2 border-[#0284c7] bg-white" : "text-[#8e8e93] hover:text-[#1c1c1e]"}`}
        >
          Onboarding Texts
        </button>
      </div>

      <div className="p-6 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
        {/* FAQs */}
        {activeSubTab === "faqs" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-black">Manage FAQs</h3>
              <button
                onClick={() => setFaqModal({ question: "", answer: "", display_order: (data.faqs.length + 1) * 10 })}
                className="bg-[#0284c7] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#0369a1] transition-colors flex items-center gap-2"
              >
                <Plus size={16} /> Add FAQ
              </button>
            </div>
            <div className="space-y-4">
              {data.faqs.map((faq) => (
                <div key={faq.id} className="border border-[#c6c6c8] rounded-xl p-4 flex gap-4 bg-[#f2f2f7]/30">
                  <div className="flex flex-col items-center justify-center text-[#aeaeb2] bg-white border border-[#c6c6c8] rounded-lg w-10 h-10 shrink-0 font-bold text-sm">
                    {faq.display_order}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-black mb-1">{faq.question}</h4>
                    <p className="text-sm text-[#8e8e93] line-clamp-2">{faq.answer}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setFaqModal(faq)} className="p-2 text-[#aeaeb2] hover:text-[#0284c7] hover:bg-blue-50 rounded-lg transition-colors">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => handleDeleteFaq(faq.id)} className="p-2 text-[#aeaeb2] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {data.faqs.length === 0 && <p className="text-center text-[#8e8e93] py-8">No FAQs found.</p>}
            </div>
          </div>
        )}

        {/* Templates */}
        {activeSubTab === "templates" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-black">Vacancy Templates</h3>
              <button
                onClick={() => setTemplateModal({
                  title: "",
                  job_category: "Other",
                  description_template: "",
                  requirements_template: "",
                  location: "",
                  employment_type: "Full Time",
                  salary_type: "fixed",
                  salary_min: null,
                  salary_max: null,
                  salary_currency: "ETB",
                  salary_period: "Monthly",
                  experience_required: "Entry level",
                  responsibilities_template: "",
                  benefits_template: "",
                  deadline: "",
                  quantity: 1,
                  education_requirements: ""
                })}
                className="bg-[#0284c7] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#0369a1] transition-colors flex items-center gap-2"
              >
                <Plus size={16} /> Add Template
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.templates.map((tpl) => {
                const salaryMin = tpl.salary_min ?? 0;
                const salaryMax = tpl.salary_max ?? 0;
                const salaryLabel =
                  tpl.salary_type === "company_scale" ? "Per Company Scale" :
                  tpl.salary_type === "negotiable" ? "Negotiable" :
                  salaryMin > 0
                    ? `ETB ${salaryMin >= 1000 ? (salaryMin/1000).toFixed(0)+"k" : salaryMin}${salaryMax && salaryMax !== salaryMin ? "–"+(salaryMax >= 1000 ? (salaryMax/1000).toFixed(0)+"k" : salaryMax) : ""}/mo`
                    : "Salary TBD";
                return (
                  <div
                    key={tpl.id}
                    onClick={() => {
                      const formatList = (txt: string) => txt.split('\n').filter(l=>l.trim()).map(l => l.trim().match(/^[-•*]/) ? l : `• ${l.trim()}`).join('\n');
                      let desc = tpl.description_template || "";
                      if (tpl.responsibilities_template) desc += "\n\nResponsibilities:\n" + formatList(tpl.responsibilities_template);
                      if (tpl.requirements_template) desc += "\n\nRequirements:\n" + formatList(tpl.requirements_template);
                      if (tpl.benefits_template) desc += "\n\nBenefits:\n" + formatList(tpl.benefits_template);

                      setViewingTemplateJob({
                        id: tpl.id,
                        businessName: "Jobs Addis",
                        businessLogo: "🏢",
                        logoUrl: "/addis_jobs_logo_mark_only.svg",
                        businessType: "Platform",
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
                      {/* Logo */}
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--brand-subtle, rgba(14,165,233,0.12))", border: "1px solid var(--border, rgba(255,255,255,0.08))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <img src="/addis_jobs_logo_mark_only.svg" alt="Addis Jobs Logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 6 }} />
                      </div>
                      {/* Title + category */}
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
                      {/* Action buttons */}
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setRequirementsTab("skill"); setTemplateModal({ id: tpl.id, title: tpl.title || "", job_category: tpl.job_category || "Other", description_template: tpl.description_template || "", requirements_template: tpl.requirements_template || "", location: tpl.location || "", employment_type: tpl.employment_type || "Full Time", salary_type: tpl.salary_type || "fixed", salary_min: tpl.salary_min, salary_max: tpl.salary_max, salary_currency: tpl.salary_currency || "ETB", salary_period: tpl.salary_period || "Monthly", experience_required: tpl.experience_required || "Entry level", responsibilities_template: tpl.responsibilities_template || "", benefits_template: tpl.benefits_template || "", deadline: tpl.deadline || "", quantity: tpl.quantity || 1, education_requirements: tpl.education_requirements || "" }); }}
                          style={{ padding: "6px", borderRadius: 8, background: "rgba(14,165,233,0.12)", border: "1px solid rgba(14,165,233,0.2)", color: "#38bdf8", cursor: "pointer", display: "flex", alignItems: "center" }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(tpl.id); }}
                          style={{ padding: "6px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    <p style={{ fontSize: 13, color: "var(--text-secondary, #94a3b8)", lineHeight: 1.5, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {tpl.description_template || "No description provided."}
                    </p>

                    {/* Badges */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span className="badge badge-brand">{salaryLabel}</span>
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

                    {/* Post button */}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (postingTemplateId) return;
                        setPostingTemplateId(tpl.id);
                        try {
                          const status = await checkTemplateStatus(tpl.id);
                          setConfirmPostData({
                            templateId: tpl.id,
                            status: (status?.status as "same" | "changed" | "new") || "new",
                            lastPosted: status?.lastPosted
                          });
                        } catch (err) {
                          setErrorModal("Failed to check status: " + (err instanceof Error ? err.message : "Unknown error"));
                        } finally {
                          setPostingTemplateId(null);
                        }
                      }}
                      style={{
                        marginTop: 12,
                        width: "100%",
                        padding: "9px 16px",
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
                  </div>
                );
              })}
              {data.templates.length === 0 && <p className="text-center text-[#8e8e93] py-8 col-span-full">No templates found.</p>}
            </div>
          </div>
        )}

        {/* Onboarding Config */}
        {activeSubTab === "onboarding" && (
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-bold text-black">Onboarding Texts & Options</h3>
              <p className="text-sm text-[#8e8e93]">Configure text and selectable options for each onboarding step.</p>
            </div>
            
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {[1, 2, 3, 4, 5, 6].map(step => (
                <button
                  key={step}
                  onClick={() => setActiveOnboardingStep(step)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${activeOnboardingStep === step ? "bg-[#0284c7] text-white" : "bg-[#e5e5ea] text-[#8e8e93] hover:bg-[#e5e5ea]"}`}
                >
                  Step {step}
                </button>
              ))}
            </div>

            <div className="space-y-6 max-w-3xl">
              {data.onboardingConfig.filter(cfg => cfg.key.startsWith(`step${activeOnboardingStep}_`)).map((cfg) => {
                const isJson = cfg.key.includes("categories") || cfg.key.includes("experience_levels");
                
                if (isJson) {
                  let parsedArray: any[] = [];
                  try { parsedArray = JSON.parse(configState[cfg.key] || "[]"); } catch (e) {}
                  
                  const isCategories = cfg.key.includes("categories");
                  
                  return (
                    <div key={cfg.key} className="bg-white border border-[#c6c6c8] rounded-xl p-5 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <label className="block text-sm font-bold text-black">{cfg.label}</label>
                        <button onClick={() => handleSaveConfig(cfg.key, cfg.label)} className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2">
                          Save Options
                        </button>
                      </div>
                      
                      <div className="space-y-2 mb-4 max-h-80 overflow-y-auto pr-2">
                        {parsedArray.map((item, idx) => (
                          <div key={idx} className="flex gap-2 items-center bg-[#f2f2f7] p-2 rounded-lg border border-[#e5e5ea]">
                              <input 
                                value={isCategories ? item.label : item} 
                                onChange={(e) => {
                                  const newArr = [...parsedArray];
                                  if (isCategories) { newArr[idx] = { ...newArr[idx], label: e.target.value }; }
                                  else { newArr[idx] = e.target.value; }
                                  setConfigState(prev => ({ ...prev, [cfg.key]: JSON.stringify(newArr) }));
                                  setDirtyKeys(prev => new Set(prev).add(cfg.key));
                                }}
                                className="flex-1 px-3 py-1.5 bg-white border border-[#c6c6c8] rounded text-sm" 
                                placeholder={isCategories ? "Category Label" : "Experience Level"}
                              />
                            <button 
                              onClick={() => {
                                const label = isCategories ? item.label : item;
                                setDeleteConfirmModal({ type: "arrayRemove", configKey: cfg.key, itemIndex: idx, itemLabel: label });
                              }}
                              className="p-1.5 px-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded bg-white border border-[#c6c6c8]"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      {dirtyKeys.has(cfg.key) && (
                        <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium">
                          ⚠️ You have unsaved changes — click <strong>Save Options</strong> to apply them.
                        </div>
                      )}

                      <button 
                        onClick={() => {
                          const newItem = isCategories ? { label: "New Option", emoji: "✨" } : "New Option";
                          const newArr = [...parsedArray, newItem];
                          setConfigState(prev => ({ ...prev, [cfg.key]: JSON.stringify(newArr) }));
                          setDirtyKeys(prev => new Set(prev).add(cfg.key));
                        }}
                        className="w-full py-2 bg-[#f2f2f7] border border-dashed border-[#c6c6c8] rounded-lg text-sm font-medium text-[#8e8e93] hover:bg-[#e5e5ea] flex items-center justify-center gap-1"
                      >
                        Add Option
                      </button>
                    </div>
                  );
                }

                return (
                  <div key={cfg.key} className="bg-white border border-[#c6c6c8] rounded-xl p-5 shadow-sm">
                    <label className="block text-sm font-bold text-black mb-1">{cfg.label}</label>
                    <div className="flex gap-3">
                      <textarea
                        value={configState[cfg.key] ?? ""}
                        onChange={(e) => setConfigState(prev => ({ ...prev, [cfg.key]: e.target.value }))}
                        className="flex-1 px-4 py-3 bg-[#f2f2f7] border border-[#c6c6c8] rounded-xl text-sm focus:ring-2 focus:ring-[#0284c7] outline-none resize-none h-20"
                      />
                      <button
                        onClick={() => handleSaveConfig(cfg.key, cfg.label)}
                        className="shrink-0 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 self-end flex items-center gap-2 h-10"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                );
              })}
              
              {data.onboardingConfig.filter(cfg => cfg.key.startsWith(`step${activeOnboardingStep}_`)).length === 0 && (
                <div className="text-center py-10 text-[#8e8e93] bg-[#f2f2f7] rounded-xl border border-dashed border-[#c6c6c8]">
                  No configuration fields mapped for Step {activeOnboardingStep} yet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {faqModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <h3 className="text-xl font-bold text-black mb-4">{faqModal.id ? "Edit FAQ" : "Add FAQ"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1c1c1e] mb-1">Question</label>
                <input
                  type="text"
                  value={faqModal.question}
                  onChange={(e) => setFaqModal({ ...faqModal, question: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#f2f2f7] border border-[#c6c6c8] rounded-xl text-sm focus:ring-2 focus:ring-[#0284c7] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1c1c1e] mb-1">Answer</label>
                <textarea
                  value={faqModal.answer}
                  onChange={(e) => setFaqModal({ ...faqModal, answer: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#f2f2f7] border border-[#c6c6c8] rounded-xl text-sm h-32 resize-none focus:ring-2 focus:ring-[#0284c7] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1c1c1e] mb-1">Display Order (lowest first)</label>
                <input
                  type="number"
                  value={faqModal.display_order}
                  onChange={(e) => setFaqModal({ ...faqModal, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 bg-[#f2f2f7] border border-[#c6c6c8] rounded-xl text-sm focus:ring-2 focus:ring-[#0284c7] outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setFaqModal(null)} className="px-5 py-2.5 text-sm font-medium text-[#8e8e93] hover:bg-[#e5e5ea] rounded-xl transition-colors">Cancel</button>
              <button onClick={handleSaveFaq} className="px-5 py-2.5 text-sm font-medium text-white bg-[#0284c7] hover:bg-[#0369a1] rounded-xl transition-colors">Save FAQ</button>
            </div>
          </div>
        </div>
      )}

      {templateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-gray-900/40 transition-all duration-300">
          <div className="bg-white rounded-3xl w-full max-w-5xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] max-h-[90vh] overflow-hidden flex flex-col border border-[#e5e5ea] ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-[#e5e5ea] flex items-center justify-between bg-gradient-to-r from-gray-50/50 to-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0284c7] to-[#0369a1] text-white flex items-center justify-center shadow-lg shadow-[#0284c7]/20">
                  <FileText size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-black tracking-tight">
                    {templateModal.id ? "Edit Vacancy Template" : "Create New Template"}
                  </h3>
                  <p className="text-sm text-[#8e8e93] font-medium mt-1">Configure predefined job postings for quick reuse.</p>
                </div>
              </div>
              <button 
                onClick={() => setTemplateModal(null)} 
                className="p-2 text-[#aeaeb2] hover:text-[#1c1c1e] hover:bg-[#e5e5ea] rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#f2f2f7]/30">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                
                {/* Left Column - Core Info */}
                <div className="lg:col-span-5 space-y-8">
                  {/* Section: Basic Details */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-2 text-[#0284c7] font-semibold text-sm uppercase tracking-wider mb-2">
                      <Briefcase size={16} /> Basic Details
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-[#1c1c1e] mb-1.5">Job Title</label>
                      <input
                        type="text"
                        value={templateModal.title}
                        onChange={(e) => setTemplateModal({ ...templateModal, title: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-[#c6c6c8] rounded-xl text-sm focus:ring-4 focus:ring-[#0284c7]/10 focus:border-[#0284c7] transition-all outline-none shadow-sm placeholder:text-[#aeaeb2]"
                        placeholder="e.g. Senior Bartender"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-[#1c1c1e] mb-1.5">Department</label>
                        <input
                          type="text"
                          value={templateModal.job_category}
                          onChange={(e) => setTemplateModal({ ...templateModal, job_category: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-[#c6c6c8] rounded-xl text-sm focus:ring-4 focus:ring-[#0284c7]/10 focus:border-[#0284c7] transition-all outline-none shadow-sm placeholder:text-[#aeaeb2]"
                          placeholder="e.g. Hospitality"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#1c1c1e] mb-1.5">Employment Type</label>
                        <select
                          value={templateModal.employment_type}
                          onChange={(e) => setTemplateModal({ ...templateModal, employment_type: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-[#c6c6c8] rounded-xl text-sm focus:ring-4 focus:ring-[#0284c7]/10 focus:border-[#0284c7] transition-all outline-none shadow-sm appearance-none cursor-pointer"
                        >
                          <option value="Full Time">Full Time</option>
                          <option value="Part Time">Part Time</option>
                          <option value="Contract">Contract</option>
                          <option value="Internship">Internship</option>
                          <option value="Freelance">Freelance</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-[#1c1c1e] mb-1.5">Number of Required</label>
                        <input
                          type="number"
                          min={1}
                          value={templateModal.quantity}
                          onChange={(e) => setTemplateModal({ ...templateModal, quantity: Math.max(1, Number(e.target.value)) })}
                          className="w-full px-4 py-3 bg-white border border-[#c6c6c8] rounded-xl text-sm focus:ring-4 focus:ring-[#0284c7]/10 focus:border-[#0284c7] transition-all outline-none shadow-sm placeholder:text-[#aeaeb2]"
                          placeholder="1"
                        />
                      </div>
                    </div>

                    <div className="relative">
                      <label className="block text-sm font-semibold text-[#1c1c1e] mb-1.5">Place of Work</label>
                      <div className="relative">
                        <MapPin size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#aeaeb2]" />
                        <input
                          type="text"
                          value={templateModal.location}
                          onChange={(e) => {
                            setTemplateModal({ ...templateModal, location: e.target.value });
                            setLocationSuggestionsOpen(true);
                          }}
                          onFocus={() => setLocationSuggestionsOpen(true)}
                          onBlur={() => setTimeout(() => setLocationSuggestionsOpen(false), 200)}
                          className="w-full pl-10 pr-4 py-3 bg-white border border-[#c6c6c8] rounded-xl text-sm focus:ring-4 focus:ring-[#0284c7]/10 focus:border-[#0284c7] transition-all outline-none shadow-sm placeholder:text-[#aeaeb2]"
                          placeholder="Search neighborhood or sub-city..."
                          autoComplete="off"
                        />
                      </div>
                      {locationSuggestionsOpen && (() => {
                        const results = searchLocations(templateModal.location).slice(0, 8);
                        return results.length > 0 ? (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#e5e5ea] rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] z-50 max-h-56 overflow-y-auto overflow-x-hidden">
                            {results.map(loc => (
                              <button
                                key={loc.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setTemplateModal({ ...templateModal, location: loc.name });
                                  setLocationSuggestionsOpen(false);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-[#f0f9ff] text-sm border-b border-gray-50 last:border-0 transition-colors group flex items-center justify-between"
                              >
                                <div className="font-semibold text-[#1c1c1e] group-hover:text-[#0284c7] transition-colors">{loc.name}</div>
                                <div className="text-[11px] font-medium text-[#aeaeb2] bg-[#f2f2f7] group-hover:bg-white px-2 py-0.5 rounded-full border border-[#e5e5ea] transition-colors">
                                  {loc.subCity} • {loc.type.charAt(0).toUpperCase() + loc.type.slice(1)}
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>

                  <hr className="border-[#c6c6c8]/60" />

                  {/* Section: Compensation */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-2 text-[#059669] font-semibold text-sm uppercase tracking-wider mb-2">
                      <CreditCard size={16} /> Compensation
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-[#1c1c1e] mb-2">Salary Structure</label>
                      <div className="flex p-1 bg-[#e5e5ea] rounded-xl border border-[#c6c6c8]/60">
                        {[
                          { value: "fixed", label: "Fixed Amount" },
                          { value: "company_scale", label: "Company Scale" },
                          { value: "negotiable", label: "Negotiable" },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setTemplateModal({ ...templateModal, salary_type: opt.value })}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                              templateModal.salary_type === opt.value 
                                ? "bg-white text-black shadow-sm ring-1 ring-gray-200" 
                                : "text-[#8e8e93] hover:text-[#1c1c1e] hover:bg-[#f2f2f7]/50"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {templateModal.salary_type === "fixed" && (
                      <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 fade-in duration-200">
                        <div>
                          <label className="block text-sm font-semibold text-[#1c1c1e] mb-1.5">Minimum</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#aeaeb2] font-medium text-sm">ETB</span>
                            <input
                              type="number"
                              value={templateModal.salary_min || ""}
                              onChange={(e) => setTemplateModal({ ...templateModal, salary_min: e.target.value ? Number(e.target.value) : null })}
                              className="w-full pl-12 pr-4 py-3 bg-white border border-[#c6c6c8] rounded-xl text-sm focus:ring-4 focus:ring-[#059669]/10 focus:border-[#059669] transition-all outline-none shadow-sm"
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-[#1c1c1e] mb-1.5">Maximum</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#aeaeb2] font-medium text-sm">ETB</span>
                            <input
                              type="number"
                              value={templateModal.salary_max || ""}
                              onChange={(e) => setTemplateModal({ ...templateModal, salary_max: e.target.value ? Number(e.target.value) : null })}
                              className="w-full pl-12 pr-4 py-3 bg-white border border-[#c6c6c8] rounded-xl text-sm focus:ring-4 focus:ring-[#059669]/10 focus:border-[#059669] transition-all outline-none shadow-sm"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <hr className="border-[#c6c6c8]/60" />

                  {/* Section: Timeline & Exp */}
                  <div className="space-y-5">
                    <div className="flex items-center gap-2 text-[#7c3aed] font-semibold text-sm uppercase tracking-wider mb-2">
                      <Calendar size={16} /> Requirements
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-[#1c1c1e] mb-1.5">Experience</label>
                        <select
                          value={templateModal.experience_required}
                          onChange={(e) => setTemplateModal({ ...templateModal, experience_required: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-[#c6c6c8] rounded-xl text-sm focus:ring-4 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] transition-all outline-none shadow-sm appearance-none cursor-pointer"
                        >
                          <option value="Entry level">Entry level</option>
                          <option value="Junior">Junior</option>
                          <option value="Intermediate">Intermediate</option>
                          <option value="Senior">Senior</option>
                          <option value="Expert">Expert</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#1c1c1e] mb-1.5">Deadline</label>
                        <input
                          type="date"
                          value={templateModal.deadline}
                          onChange={(e) => setTemplateModal({ ...templateModal, deadline: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-[#c6c6c8] rounded-xl text-sm focus:ring-4 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] transition-all outline-none shadow-sm text-[#8e8e93]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Templates */}
                <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-[#c6c6c8]/60 shadow-sm flex flex-col gap-5">
                  <div className="flex items-center gap-2 text-[#1c1c1e] font-bold text-base border-b border-[#e5e5ea] pb-3 mb-2">
                    Content Templates
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-5">
                    <div className="group">
                      <label className="block text-sm font-semibold text-[#1c1c1e] mb-1.5 flex justify-between">
                        Job Description <span style={{ color: "#ef4444" }}>*</span>
                        <span className="text-[10px] font-bold text-[#aeaeb2] uppercase tracking-wider bg-[#e5e5ea] px-2 py-0.5 rounded-full group-focus-within:bg-[#0284c7] group-focus-within:text-white transition-colors">Main overview</span>
                      </label>
                      <textarea
                        value={templateModal.description_template}
                        onChange={(e) => setTemplateModal({ ...templateModal, description_template: e.target.value })}
                        className="w-full px-4 py-3 bg-[#f2f2f7]/50 hover:bg-white border border-[#c6c6c8] rounded-xl text-sm h-32 resize-none focus:ring-4 focus:ring-[#0284c7]/10 focus:border-[#0284c7] transition-all outline-none leading-relaxed shadow-inner placeholder:text-[#c6c6c8]"
                        placeholder="Provide a compelling overview of the role and what it entails..."
                      />
                    </div>
                    
                    <div className="group">
                      <label className="block text-sm font-semibold text-[#1c1c1e] mb-1.5 flex justify-between">
                        Responsibilities
                        <span className="text-[10px] font-bold text-[#aeaeb2] uppercase tracking-wider bg-[#e5e5ea] px-2 py-0.5 rounded-full group-focus-within:bg-[#0284c7] group-focus-within:text-white transition-colors">Bulleted list</span>
                      </label>
                      <textarea
                        value={templateModal.responsibilities_template}
                        onChange={(e) => setTemplateModal({ ...templateModal, responsibilities_template: e.target.value })}
                        className="w-full px-4 py-3 bg-[#f2f2f7]/50 hover:bg-white border border-[#c6c6c8] rounded-xl text-sm h-28 resize-none focus:ring-4 focus:ring-[#0284c7]/10 focus:border-[#0284c7] transition-all outline-none leading-relaxed shadow-inner placeholder:text-[#c6c6c8]"
                        placeholder="- Daily task one&#10;- Daily task two&#10;- Key deliverable..."
                      />
                    </div>

                    <div className="group">
                      {/* Toggle between Requirement skill & Education Requirements */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex p-0.5 bg-[#e5e5ea] rounded-lg border border-[#c6c6c8]/60">
                          <button
                            type="button"
                            onClick={() => setRequirementsTab("skill")}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-200 ${
                              requirementsTab === "skill"
                                ? "bg-white text-black shadow-sm ring-1 ring-gray-200"
                                : "text-[#8e8e93] hover:text-[#1c1c1e]"
                            }`}
                          >
                            Requirement Skill
                          </button>
                          <button
                            type="button"
                            onClick={() => setRequirementsTab("education")}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-200 ${
                              requirementsTab === "education"
                                ? "bg-white text-black shadow-sm ring-1 ring-gray-200"
                                : "text-[#8e8e93] hover:text-[#1c1c1e]"
                            }`}
                          >
                            Education Requirements
                          </button>
                        </div>
                      </div>

                      {requirementsTab === "skill" ? (
                        <textarea
                          value={templateModal.requirements_template}
                          onChange={(e) => setTemplateModal({ ...templateModal, requirements_template: e.target.value })}
                          className="w-full px-4 py-3 bg-[#f2f2f7]/50 hover:bg-white border border-[#c6c6c8] rounded-xl text-sm h-28 resize-none focus:ring-4 focus:ring-[#0284c7]/10 focus:border-[#0284c7] transition-all outline-none leading-relaxed shadow-inner placeholder:text-[#c6c6c8]"
                          placeholder="- Required skill one&#10;- Certification...&#10;- Years of experience..."
                        />
                      ) : (
                        <textarea
                          value={templateModal.education_requirements}
                          onChange={(e) => setTemplateModal({ ...templateModal, education_requirements: e.target.value })}
                          className="w-full px-4 py-3 bg-[#f2f2f7]/50 hover:bg-white border border-[#c6c6c8] rounded-xl text-sm h-28 resize-none focus:ring-4 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] transition-all outline-none leading-relaxed shadow-inner placeholder:text-[#c6c6c8]"
                          placeholder="- Bachelor's Degree in Hospitality Management&#10;- Vocational certificate in...&#10;- Minimum education level..."
                        />
                      )}
                    </div>

                    <div className="group">
                      <label className="block text-sm font-semibold text-[#1c1c1e] mb-1.5">Benefits</label>
                      <textarea
                        value={templateModal.benefits_template}
                        onChange={(e) => setTemplateModal({ ...templateModal, benefits_template: e.target.value })}
                        className="w-full px-4 py-3 bg-[#f2f2f7]/50 hover:bg-white border border-[#c6c6c8] rounded-xl text-sm h-28 resize-none focus:ring-4 focus:ring-[#0284c7]/10 focus:border-[#0284c7] transition-all outline-none leading-relaxed shadow-inner placeholder:text-[#c6c6c8]"
                        placeholder="- Paid time off&#10;- Health insurance..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-5 border-t border-[#e5e5ea] bg-[#f2f2f7]/80 flex items-center justify-between">
              <div className="text-sm text-[#8e8e93] flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-500" /> Auto-saves standard fields securely.
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setTemplateModal(null)} 
                  className="px-6 py-2.5 text-sm font-bold text-[#8e8e93] bg-white border border-[#c6c6c8] hover:bg-[#f2f2f7] hover:text-black rounded-xl transition-all shadow-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveTemplate}
                  disabled={templateSaving}
                  className="px-8 py-2.5 text-sm font-bold text-white bg-gradient-to-b from-[#0ea5e9] to-[#0284c7] hover:from-[#38bdf8] hover:to-[#0369a1] rounded-xl transition-all shadow-md shadow-[#0284c7]/30 ring-1 ring-inset ring-white/20 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {templateSaving ? (
                    <svg className="animate-spin" width={16} height={16} viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  ) : (
                    <><Save size={16} /> Save Template</>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {deleteConfirmModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-xl font-bold text-black mb-2">
              {deleteConfirmModal.type === "faq" ? "Delete FAQ" : deleteConfirmModal.type === "template" ? "Delete Template" : "Remove Option"}
            </h3>
            <p className="text-[#8e8e93] mb-6 text-sm">
              {deleteConfirmModal.type === "arrayRemove"
                ? <>Are you sure you want to remove <strong>&ldquo;{deleteConfirmModal.itemLabel}&rdquo;</strong>? You still need to click <strong>Save Options</strong> for it to take effect.</>
                : <>Are you sure you want to delete this {deleteConfirmModal.type === "faq" ? "FAQ" : "template"}? This action cannot be undone.</>
              }
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-[#1c1c1e] bg-[#e5e5ea] hover:bg-[#e5e5ea] rounded-xl transition-colors"
              >
                No, cancel
              </button>
              <button
                onClick={executeDelete}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingTemplateJob && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
          onClick={() => setViewingTemplateJob(null)}
        >
          {/* Phone frame */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 390,
              height: 780,
              borderRadius: 48,
              background: "#111",
              boxShadow: "0 0 0 2px #333, 0 0 0 6px #111, 0 32px 80px rgba(0,0,0,0.6)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              position: "relative",
              flexShrink: 0,
            }}
          >
            {/* Dynamic island */}
            <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", width: 120, height: 34, background: "#111", borderRadius: 20, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#222" }} />
              <div style={{ width: 72, height: 10, borderRadius: 10, background: "#1a1a1a" }} />
            </div>
            {/* Screen */}
            <div style={{ flex: 1, background: "var(--app-bg, #f9fafb)", borderRadius: 46, overflow: "hidden", margin: 4 }}>
              {/* Status bar */}
              <div style={{ height: 50, display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 24px 6px", background: "var(--app-bg, #f9fafb)" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#111827" }}>9:41</span>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 1.5, alignItems: "flex-end" }}>
                    {[3, 5, 7, 9].map(h => <div key={h} style={{ width: 3, height: h, background: "#111827", borderRadius: 1 }} />)}
                  </div>
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="none"><path d="M7 2.5C8.7 2.5 10.2 3.2 11.3 4.3L12.7 2.9C11.2 1.5 9.2 0.5 7 0.5C4.8 0.5 2.8 1.5 1.3 2.9L2.7 4.3C3.8 3.2 5.3 2.5 7 2.5Z" fill="#111827"/><path d="M7 5.5C8 5.5 8.9 5.9 9.6 6.6L11 5.2C9.9 4.2 8.5 3.5 7 3.5C5.5 3.5 4.1 4.2 3 5.2L4.4 6.6C5.1 5.9 6 5.5 7 5.5Z" fill="#111827"/><circle cx="7" cy="9" r="1.5" fill="#111827"/></svg>
                  <div style={{ width: 22, height: 11, border: "1.5px solid #111827", borderRadius: 3, position: "relative" }}>
                    <div style={{ position: "absolute", right: -3, top: "50%", transform: "translateY(-50%)", width: 2.5, height: 5, background: "#111827", borderRadius: 1 }} />
                    <div style={{ margin: 2, height: "calc(100% - 4px)", width: "70%", background: "#111827", borderRadius: 1.5 }} />
                  </div>
                </div>
              </div>
              {/* Job detail */}
              <div style={{ height: "calc(100% - 50px)", overflow: "hidden" }}>
                <JobDetailScreen
                  job={viewingTemplateJob}
                  isEmployer={false}
                  onBack={() => setViewingTemplateJob(null)}
                  onApply={() => {}}
                />
              </div>
            </div>
            {/* Home indicator */}
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
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
                     confirmPostData.status === "changed" ? `This template has been modified since it was last posted (on ${confirmPostData.lastPosted ? new Date(confirmPostData.lastPosted).toLocaleDateString() : 'a while ago'}). Post the new version?` :
                     "Are you sure you want to post this template to the main app?"}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-[#f2f2f7] px-6 py-4 flex justify-end gap-3 border-t border-[#e5e5ea]">
              <button
                onClick={() => setConfirmPostData(null)}
                className="px-4 py-2 text-sm font-semibold text-[#1c1c1e] bg-white border border-[#c6c6c8] rounded-lg hover:bg-[#f2f2f7] transition-colors"
              >
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
                {confirmPostData.status === "same" ? "Yes, Post Again" :
                 confirmPostData.status === "changed" ? "Post Update" :
                 "Confirm Post"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {errorModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm" onClick={() => setErrorModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
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
