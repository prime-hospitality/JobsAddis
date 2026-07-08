"use client";

import React, { useState, useEffect } from "react";
import { getContentData, upsertFaq, deleteFaq, upsertVacancyTemplate, deleteVacancyTemplate, updateOnboardingConfig } from "./actions";
import { Plus, Save, Trash2, Pencil } from "lucide-react";
import { searchLocations } from "@/data/locations";

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
    deadline_days: number;
  } | null>(null);
  const [locationSuggestionsOpen, setLocationSuggestionsOpen] = useState(false);

  const handleSaveTemplate = async () => {
    if (!templateModal) return;
    await upsertVacancyTemplate(
      templateModal.id || null,
      templateModal.title,
      templateModal.job_category,
      templateModal.description_template,
      templateModal.requirements_template,
      templateModal.location,
      templateModal.employment_type,
      templateModal.salary_type,
      templateModal.salary_min,
      templateModal.salary_max,
      templateModal.salary_currency,
      templateModal.salary_period,
      templateModal.experience_required,
      templateModal.responsibilities_template,
      templateModal.benefits_template,
      templateModal.deadline_days
    );
    setTemplateModal(null);
    loadData();
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
    return <div className="p-8 text-center text-gray-500">Loading content data...</div>;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Sub Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50/50">
        <button
          onClick={() => setActiveSubTab("faqs")}
          className={`px-6 py-4 text-sm font-medium transition-colors ${activeSubTab === "faqs" ? "text-[#0284c7] border-b-2 border-[#0284c7] bg-white" : "text-gray-500 hover:text-gray-700"}`}
        >
          FAQs
        </button>
        <button
          onClick={() => setActiveSubTab("templates")}
          className={`px-6 py-4 text-sm font-medium transition-colors ${activeSubTab === "templates" ? "text-[#0284c7] border-b-2 border-[#0284c7] bg-white" : "text-gray-500 hover:text-gray-700"}`}
        >
          Vacancy Templates
        </button>
        <button
          onClick={() => setActiveSubTab("onboarding")}
          className={`px-6 py-4 text-sm font-medium transition-colors ${activeSubTab === "onboarding" ? "text-[#0284c7] border-b-2 border-[#0284c7] bg-white" : "text-gray-500 hover:text-gray-700"}`}
        >
          Onboarding Texts
        </button>
      </div>

      <div className="p-6 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
        {/* FAQs */}
        {activeSubTab === "faqs" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">Manage FAQs</h3>
              <button
                onClick={() => setFaqModal({ question: "", answer: "", display_order: (data.faqs.length + 1) * 10 })}
                className="bg-[#0284c7] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#0369a1] transition-colors flex items-center gap-2"
              >
                <Plus size={16} /> Add FAQ
              </button>
            </div>
            <div className="space-y-4">
              {data.faqs.map((faq) => (
                <div key={faq.id} className="border border-gray-200 rounded-xl p-4 flex gap-4 bg-gray-50/30">
                  <div className="flex flex-col items-center justify-center text-gray-400 bg-white border border-gray-200 rounded-lg w-10 h-10 shrink-0 font-bold text-sm">
                    {faq.display_order}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 mb-1">{faq.question}</h4>
                    <p className="text-sm text-gray-600 line-clamp-2">{faq.answer}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setFaqModal(faq)} className="p-2 text-gray-400 hover:text-[#0284c7] hover:bg-blue-50 rounded-lg transition-colors">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => handleDeleteFaq(faq.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {data.faqs.length === 0 && <p className="text-center text-gray-500 py-8">No FAQs found.</p>}
            </div>
          </div>
        )}

        {/* Templates */}
        {activeSubTab === "templates" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">Vacancy Templates</h3>
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
                  experience_required: "",
                  responsibilities_template: "",
                  benefits_template: "",
                  deadline_days: 30
                })}
                className="bg-[#0284c7] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#0369a1] transition-colors flex items-center gap-2"
              >
                <Plus size={16} /> Add Template
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.templates.map((tpl) => (
                <div key={tpl.id} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">{tpl.title}</h4>
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md mt-1">{tpl.job_category}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setTemplateModal({
                        id: tpl.id,
                        title: tpl.title || "",
                        job_category: tpl.job_category || "Other",
                        description_template: tpl.description_template || "",
                        requirements_template: tpl.requirements_template || "",
                        location: tpl.location || "",
                        employment_type: tpl.employment_type || "Full Time",
                        salary_type: tpl.salary_type || "fixed",
                        salary_min: tpl.salary_min,
                        salary_max: tpl.salary_max,
                        salary_currency: tpl.salary_currency || "ETB",
                        salary_period: tpl.salary_period || "Monthly",
                        experience_required: tpl.experience_required || "",
                        responsibilities_template: tpl.responsibilities_template || "",
                        benefits_template: tpl.benefits_template || "",
                        deadline_days: tpl.deadline_days || 30
                      })} className="p-1.5 text-gray-400 hover:text-[#0284c7] rounded-md transition-colors">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDeleteTemplate(tpl.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-md transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="mb-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</p>
                    <p className="text-sm text-gray-700 line-clamp-2">{tpl.description_template}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Requirements</p>
                    <p className="text-sm text-gray-700 line-clamp-2">{tpl.requirements_template}</p>
                  </div>
                </div>
              ))}
              {data.templates.length === 0 && <p className="text-center text-gray-500 py-8 col-span-full">No templates found.</p>}
            </div>
          </div>
        )}

        {/* Onboarding Config */}
        {activeSubTab === "onboarding" && (
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900">Onboarding Texts & Options</h3>
              <p className="text-sm text-gray-500">Configure text and selectable options for each onboarding step.</p>
            </div>
            
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {[1, 2, 3, 4, 5, 6].map(step => (
                <button
                  key={step}
                  onClick={() => setActiveOnboardingStep(step)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${activeOnboardingStep === step ? "bg-[#0284c7] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
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
                    <div key={cfg.key} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <label className="block text-sm font-bold text-gray-900">{cfg.label}</label>
                        <button onClick={() => handleSaveConfig(cfg.key, cfg.label)} className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors flex items-center gap-2">
                          Save Options
                        </button>
                      </div>
                      
                      <div className="space-y-2 mb-4 max-h-80 overflow-y-auto pr-2">
                        {parsedArray.map((item, idx) => (
                          <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                              <input 
                                value={isCategories ? item.label : item} 
                                onChange={(e) => {
                                  const newArr = [...parsedArray];
                                  if (isCategories) { newArr[idx] = { ...newArr[idx], label: e.target.value }; }
                                  else { newArr[idx] = e.target.value; }
                                  setConfigState(prev => ({ ...prev, [cfg.key]: JSON.stringify(newArr) }));
                                  setDirtyKeys(prev => new Set(prev).add(cfg.key));
                                }}
                                className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded text-sm" 
                                placeholder={isCategories ? "Category Label" : "Experience Level"}
                              />
                            <button 
                              onClick={() => {
                                const label = isCategories ? item.label : item;
                                setDeleteConfirmModal({ type: "arrayRemove", configKey: cfg.key, itemIndex: idx, itemLabel: label });
                              }}
                              className="p-1.5 px-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded bg-white border border-gray-200"
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
                        className="w-full py-2 bg-gray-50 border border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 flex items-center justify-center gap-1"
                      >
                        Add Option
                      </button>
                    </div>
                  );
                }

                return (
                  <div key={cfg.key} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <label className="block text-sm font-bold text-gray-900 mb-1">{cfg.label}</label>
                    <div className="flex gap-3">
                      <textarea
                        value={configState[cfg.key] ?? ""}
                        onChange={(e) => setConfigState(prev => ({ ...prev, [cfg.key]: e.target.value }))}
                        className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0284c7] outline-none resize-none h-20"
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
                <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
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
            <h3 className="text-xl font-bold text-gray-900 mb-4">{faqModal.id ? "Edit FAQ" : "Add FAQ"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                <input
                  type="text"
                  value={faqModal.question}
                  onChange={(e) => setFaqModal({ ...faqModal, question: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0284c7] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
                <textarea
                  value={faqModal.answer}
                  onChange={(e) => setFaqModal({ ...faqModal, answer: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm h-32 resize-none focus:ring-2 focus:ring-[#0284c7] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Order (lowest first)</label>
                <input
                  type="number"
                  value={faqModal.display_order}
                  onChange={(e) => setFaqModal({ ...faqModal, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0284c7] outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setFaqModal(null)} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleSaveFaq} className="px-5 py-2.5 text-sm font-medium text-white bg-[#0284c7] hover:bg-[#0369a1] rounded-xl transition-colors">Save FAQ</button>
            </div>
          </div>
        </div>
      )}

      {templateModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-6">{templateModal.id ? "Edit Template" : "Add Template"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    value={templateModal.title}
                    onChange={(e) => setTemplateModal({ ...templateModal, title: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0284c7] outline-none"
                    placeholder="e.g. Senior Bartender"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <input
                      type="text"
                      value={templateModal.job_category}
                      onChange={(e) => setTemplateModal({ ...templateModal, job_category: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0284c7] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                    <select
                      value={templateModal.employment_type}
                      onChange={(e) => setTemplateModal({ ...templateModal, employment_type: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0284c7] outline-none"
                    >
                      <option value="Full Time">Full Time</option>
                      <option value="Part Time">Part Time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                      <option value="Freelance">Freelance</option>
                    </select>
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={templateModal.location}
                    onChange={(e) => {
                      setTemplateModal({ ...templateModal, location: e.target.value });
                      setLocationSuggestionsOpen(true);
                    }}
                    onFocus={() => setLocationSuggestionsOpen(true)}
                    onBlur={() => setTimeout(() => setLocationSuggestionsOpen(false), 200)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0284c7] outline-none"
                    placeholder="e.g. Bole, Kazanchis..."
                    autoComplete="off"
                  />
                  {locationSuggestionsOpen && (() => {
                    const results = searchLocations(templateModal.location).slice(0, 8);
                    return results.length > 0 ? (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                        {results.map(loc => (
                          <button
                            key={loc.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setTemplateModal({ ...templateModal, location: loc.name });
                              setLocationSuggestionsOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm border-b border-gray-100 last:border-0"
                          >
                            <div className="font-medium text-gray-900">{loc.name}</div>
                            <div className="text-xs text-gray-500">{loc.subCity} • {loc.type.charAt(0).toUpperCase() + loc.type.slice(1)}</div>
                          </button>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary Mode</label>
                  <div className="flex gap-2">
                    {[
                      { value: "fixed", label: "Fixed Amount" },
                      { value: "company_scale", label: "Per Company Scale" },
                      { value: "negotiable", label: "Negotiable" },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTemplateModal({ ...templateModal, salary_type: opt.value })}
                        className={`flex-1 px-3 py-2 text-xs font-medium rounded-xl border transition-colors ${templateModal.salary_type === opt.value ? "bg-[#f0f9ff] border-[#0284c7] text-[#0284c7]" : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {templateModal.salary_type === "fixed" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min Salary</label>
                      <input
                        type="number"
                        value={templateModal.salary_min || ""}
                        onChange={(e) => setTemplateModal({ ...templateModal, salary_min: e.target.value ? Number(e.target.value) : null })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0284c7] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Salary</label>
                      <input
                        type="number"
                        value={templateModal.salary_max || ""}
                        onChange={(e) => setTemplateModal({ ...templateModal, salary_max: e.target.value ? Number(e.target.value) : null })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0284c7] outline-none"
                      />
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Experience Required</label>
                    <input
                      type="text"
                      value={templateModal.experience_required}
                      onChange={(e) => setTemplateModal({ ...templateModal, experience_required: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0284c7] outline-none"
                      placeholder="e.g. 2+ Years"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deadline (Days)</label>
                    <input
                      type="number"
                      value={templateModal.deadline_days}
                      onChange={(e) => setTemplateModal({ ...templateModal, deadline_days: parseInt(e.target.value) || 30 })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0284c7] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description Template</label>
                  <textarea
                    value={templateModal.description_template}
                    onChange={(e) => setTemplateModal({ ...templateModal, description_template: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm h-28 resize-none focus:ring-2 focus:ring-[#0284c7] outline-none"
                    placeholder="Brief overview of the role..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Responsibilities Template</label>
                  <textarea
                    value={templateModal.responsibilities_template}
                    onChange={(e) => setTemplateModal({ ...templateModal, responsibilities_template: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm h-28 resize-none focus:ring-2 focus:ring-[#0284c7] outline-none"
                    placeholder="- Key responsibility 1..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requirements Template</label>
                  <textarea
                    value={templateModal.requirements_template}
                    onChange={(e) => setTemplateModal({ ...templateModal, requirements_template: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm h-28 resize-none focus:ring-2 focus:ring-[#0284c7] outline-none"
                    placeholder="- Required skill 1..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Benefits Template</label>
                  <textarea
                    value={templateModal.benefits_template}
                    onChange={(e) => setTemplateModal({ ...templateModal, benefits_template: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm h-24 resize-none focus:ring-2 focus:ring-[#0284c7] outline-none"
                    placeholder="- Health insurance..."
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
              <button onClick={() => setTemplateModal(null)} className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleSaveTemplate} className="px-6 py-2.5 text-sm font-medium text-white bg-[#0284c7] hover:bg-[#0369a1] rounded-xl transition-colors">Save Template</button>
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
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {deleteConfirmModal.type === "faq" ? "Delete FAQ" : deleteConfirmModal.type === "template" ? "Delete Template" : "Remove Option"}
            </h3>
            <p className="text-gray-500 mb-6 text-sm">
              {deleteConfirmModal.type === "arrayRemove"
                ? <>Are you sure you want to remove <strong>&ldquo;{deleteConfirmModal.itemLabel}&rdquo;</strong>? You still need to click <strong>Save Options</strong> for it to take effect.</>
                : <>Are you sure you want to delete this {deleteConfirmModal.type === "faq" ? "FAQ" : "template"}? This action cannot be undone.</>
              }
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
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
    </div>
  );
}
