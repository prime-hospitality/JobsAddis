"use client";

import React, { useState } from "react";
import { Save, X, Briefcase, MapPin, CreditCard, Calendar, FileText, CheckCircle2 } from "lucide-react";
import { searchLocations } from "@/data/locations";
import { VacancyFormState } from "./vacancyShared";

export default function VacancyFormModal({
  value,
  onChange,
  onClose,
  onSubmit,
  saving,
  saveLabel,
  headerTitle,
  headerSubtitle,
}: {
  value: VacancyFormState;
  onChange: (next: VacancyFormState) => void;
  onClose: () => void;
  onSubmit: () => void;
  saving: boolean;
  saveLabel: string;
  headerTitle: string;
  headerSubtitle: string;
}) {
  const [requirementsTab, setRequirementsTab] = useState<"skill" | "education">("skill");
  const [locationSuggestionsOpen, setLocationSuggestionsOpen] = useState(false);

  const set = (patch: Partial<VacancyFormState>) => onChange({ ...value, ...patch });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-gray-900/40 transition-all duration-300">
      <div className="bg-white rounded-3xl w-full max-w-5xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] max-h-[90vh] overflow-hidden flex flex-col border border-[#e5e5ea] ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">

        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-[#e5e5ea] flex items-center justify-between bg-gradient-to-r from-gray-50/50 to-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0284c7] to-[#0369a1] text-white flex items-center justify-center shadow-lg shadow-[#0284c7]/20">
              <FileText size={24} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-black tracking-tight">{headerTitle}</h3>
              <p className="text-sm text-[#8e8e93] font-medium mt-1">{headerSubtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
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
                  <label className="block text-sm font-semibold text-[#1c1c1e] mb-1.5 flex justify-between">
                    Job Title <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={value.title}
                    onChange={(e) => set({ title: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-[#c6c6c8] rounded-xl text-sm focus:ring-4 focus:ring-[#0284c7]/10 focus:border-[#0284c7] transition-all outline-none shadow-sm placeholder:text-[#aeaeb2]"
                    placeholder="e.g. Senior Bartender"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#1c1c1e] mb-1.5">Department</label>
                    <input
                      type="text"
                      value={value.job_category}
                      onChange={(e) => set({ job_category: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-[#c6c6c8] rounded-xl text-sm focus:ring-4 focus:ring-[#0284c7]/10 focus:border-[#0284c7] transition-all outline-none shadow-sm placeholder:text-[#aeaeb2]"
                      placeholder="e.g. Hospitality"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#1c1c1e] mb-1.5">Employment Type</label>
                    <select
                      value={value.employment_type}
                      onChange={(e) => set({ employment_type: e.target.value })}
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
                      value={value.quantity}
                      onChange={(e) => set({ quantity: Math.max(1, Number(e.target.value)) })}
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
                      value={value.location}
                      onChange={(e) => {
                        set({ location: e.target.value });
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
                    const results = searchLocations(value.location).slice(0, 8);
                    return results.length > 0 ? (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#e5e5ea] rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] z-50 max-h-56 overflow-y-auto overflow-x-hidden">
                        {results.map((loc) => (
                          <button
                            key={loc.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              set({ location: loc.name });
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
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => set({ salary_type: opt.value })}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                          value.salary_type === opt.value
                            ? "bg-white text-black shadow-sm ring-1 ring-gray-200"
                            : "text-[#8e8e93] hover:text-[#1c1c1e] hover:bg-[#f2f2f7]/50"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {value.salary_type === "fixed" && (
                  <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div>
                      <label className="block text-sm font-semibold text-[#1c1c1e] mb-1.5">Minimum</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#aeaeb2] font-medium text-sm">ETB</span>
                        <input
                          type="number"
                          value={value.salary_min || ""}
                          onChange={(e) => set({ salary_min: e.target.value ? Number(e.target.value) : null })}
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
                          value={value.salary_max || ""}
                          onChange={(e) => set({ salary_max: e.target.value ? Number(e.target.value) : null })}
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
                <div className="flex items-center gap-2 text-[#0284c7] font-semibold text-sm uppercase tracking-wider mb-2">
                  <Calendar size={16} /> Requirements
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#1c1c1e] mb-1.5">Experience</label>
                    <select
                      value={value.experience_required}
                      onChange={(e) => set({ experience_required: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-[#c6c6c8] rounded-xl text-sm focus:ring-4 focus:ring-[#0284c7]/10 focus:border-[#0284c7] transition-all outline-none shadow-sm appearance-none cursor-pointer"
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
                      value={value.deadline}
                      onChange={(e) => set({ deadline: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-[#c6c6c8] rounded-xl text-sm focus:ring-4 focus:ring-[#0284c7]/10 focus:border-[#0284c7] transition-all outline-none shadow-sm text-[#8e8e93]"
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
                    value={value.description_template}
                    onChange={(e) => set({ description_template: e.target.value })}
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
                    value={value.responsibilities_template}
                    onChange={(e) => set({ responsibilities_template: e.target.value })}
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
                      value={value.requirements_template}
                      onChange={(e) => set({ requirements_template: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f2f2f7]/50 hover:bg-white border border-[#c6c6c8] rounded-xl text-sm h-28 resize-none focus:ring-4 focus:ring-[#0284c7]/10 focus:border-[#0284c7] transition-all outline-none leading-relaxed shadow-inner placeholder:text-[#c6c6c8]"
                      placeholder="- Required skill one&#10;- Certification...&#10;- Years of experience..."
                    />
                  ) : (
                    <textarea
                      value={value.education_requirements}
                      onChange={(e) => set({ education_requirements: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f2f2f7]/50 hover:bg-white border border-[#c6c6c8] rounded-xl text-sm h-28 resize-none focus:ring-4 focus:ring-[#0284c7]/10 focus:border-[#0284c7] transition-all outline-none leading-relaxed shadow-inner placeholder:text-[#c6c6c8]"
                      placeholder="- Bachelor's Degree in Hospitality Management&#10;- Vocational certificate in...&#10;- Minimum education level..."
                    />
                  )}
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-[#1c1c1e] mb-1.5">Benefits</label>
                  <textarea
                    value={value.benefits_template}
                    onChange={(e) => set({ benefits_template: e.target.value })}
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
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-bold text-[#8e8e93] bg-white border border-[#c6c6c8] hover:bg-[#f2f2f7] hover:text-black rounded-xl transition-all shadow-sm"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={saving}
              className="px-8 py-2.5 text-sm font-bold text-white bg-gradient-to-b from-[#0ea5e9] to-[#0284c7] hover:from-[#38bdf8] hover:to-[#0369a1] rounded-xl transition-all shadow-md shadow-[#0284c7]/30 ring-1 ring-inset ring-white/20 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <svg className="animate-spin" width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <><Save size={16} /> {saveLabel}</>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
