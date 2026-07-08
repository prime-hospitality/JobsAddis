"use client";

import React, { useState, useEffect } from "react";
import { getContentData, upsertFaq, deleteFaq, upsertVacancyTemplate, deleteVacancyTemplate, updateOnboardingConfig } from "./actions";
import { Plus, Save, Trash2, Pencil } from "lucide-react";

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

  // FAQ State
  const [faqModal, setFaqModal] = useState<{ id?: string; question: string; answer: string; display_order: number } | null>(null);

  const handleSaveFaq = async () => {
    if (!faqModal) return;
    await upsertFaq(faqModal.id || null, faqModal.question, faqModal.answer, faqModal.display_order);
    setFaqModal(null);
    loadData();
  };

  const handleDeleteFaq = async (id: string) => {
    if (confirm("Are you sure you want to delete this FAQ?")) {
      await deleteFaq(id);
      loadData();
    }
  };

  // Template State
  const [templateModal, setTemplateModal] = useState<{ id?: string; title: string; job_category: string; description_template: string; requirements_template: string } | null>(null);

  const handleSaveTemplate = async () => {
    if (!templateModal) return;
    await upsertVacancyTemplate(templateModal.id || null, templateModal.title, templateModal.job_category, templateModal.description_template, templateModal.requirements_template);
    setTemplateModal(null);
    loadData();
  };

  const handleDeleteTemplate = async (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      await deleteVacancyTemplate(id);
      loadData();
    }
  };

  // Onboarding Config State
  const [configState, setConfigState] = useState<Record<string, string>>({});

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
    alert("Saved!");
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
                onClick={() => setTemplateModal({ title: "", job_category: "Other", description_template: "", requirements_template: "" })}
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
                      <button onClick={() => setTemplateModal(tpl)} className="p-1.5 text-gray-400 hover:text-[#0284c7] rounded-md transition-colors">
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
              <h3 className="text-lg font-bold text-gray-900">Onboarding Texts</h3>
              <p className="text-sm text-gray-500">Update the welcome screens and instructional text.</p>
            </div>
            <div className="space-y-6 max-w-2xl">
              {data.onboardingConfig.map((cfg) => (
                <div key={cfg.key} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <label className="block text-sm font-bold text-gray-900 mb-1">{cfg.label} <span className="text-gray-400 font-normal text-xs ml-2">({cfg.key})</span></label>
                  <div className="flex gap-3">
                    <textarea
                      value={configState[cfg.key] ?? ""}
                      onChange={(e) => setConfigState(prev => ({ ...prev, [cfg.key]: e.target.value }))}
                      className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0284c7] focus:border-[#0284c7] outline-none transition-all resize-none h-20"
                    />
                    <button
                      onClick={() => handleSaveConfig(cfg.key, cfg.label)}
                      className="shrink-0 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors self-end flex items-center gap-2 h-10"
                    >
                      <Save size={16} /> Save
                    </button>
                  </div>
                </div>
              ))}
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
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">{templateModal.id ? "Edit Template" : "Add Template"}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={templateModal.title}
                    onChange={(e) => setTemplateModal({ ...templateModal, title: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0284c7] outline-none"
                    placeholder="e.g. Senior Bartender"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={templateModal.job_category}
                    onChange={(e) => setTemplateModal({ ...templateModal, job_category: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0284c7] outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description Template</label>
                <textarea
                  value={templateModal.description_template}
                  onChange={(e) => setTemplateModal({ ...templateModal, description_template: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm h-24 resize-none focus:ring-2 focus:ring-[#0284c7] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requirements Template</label>
                <textarea
                  value={templateModal.requirements_template}
                  onChange={(e) => setTemplateModal({ ...templateModal, requirements_template: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm h-24 resize-none focus:ring-2 focus:ring-[#0284c7] outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setTemplateModal(null)} className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleSaveTemplate} className="px-5 py-2.5 text-sm font-medium text-white bg-[#0284c7] hover:bg-[#0369a1] rounded-xl transition-colors">Save Template</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
