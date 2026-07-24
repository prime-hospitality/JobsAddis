"use client";

import React, { useState } from "react";
import { Save, X, Briefcase, MapPin, CreditCard, ClipboardList, FileText } from "lucide-react";
import { searchLocations } from "@/data/locations";
import { VacancyFormState } from "./vacancyShared";

const CHEVRON =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>\")";

const STYLES = `
  .vfm-overlay { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(15,23,42,0.45); backdrop-filter: blur(4px); font-family: 'Inter', sans-serif; }
  .vfm-modal { background: #fff; border: 1px solid #e6ebf2; border-radius: 20px; width: 100%; max-width: 900px; max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 24px 64px -18px rgba(15,23,42,0.4); }

  .vfm-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 22px; border-bottom: 1px solid #eef2f7; flex-shrink: 0; }
  .vfm-header-l { display: flex; align-items: center; gap: 13px; min-width: 0; }
  .vfm-header-ico { width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, #0284c7, #0369a1); color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 12px -3px rgba(2,132,199,0.5); }
  .vfm-title { font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -.02em; margin: 0; line-height: 1.2; }
  .vfm-sub { font-size: 12.5px; color: #64748b; margin: 2px 0 0 0; }
  .vfm-close { width: 36px; height: 36px; border-radius: 9px; border: 1px solid #e2e8f0; background: #fff; color: #94a3b8; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .15s ease; flex-shrink: 0; }
  .vfm-close:hover { background: #f1f5f9; color: #0f172a; }

  .vfm-body { flex: 1; overflow-y: auto; padding: 20px 22px; background: #f8fafc; }
  .vfm-cols { display: grid; grid-template-columns: 1fr; gap: 16px; align-items: stretch; }
  @media (min-width: 860px) { .vfm-cols { grid-template-columns: 340px 1fr; } }

  .vfm-panel { background: #fff; border: 1px solid #e9eef4; border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 18px; }

  .vfm-panel-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 800; color: #0f172a; letter-spacing: -.01em; padding-bottom: 12px; border-bottom: 1px solid #eef2f7; }

  .vfm-sec { display: flex; flex-direction: column; gap: 12px; }
  .vfm-sec-h { display: flex; align-items: center; gap: 7px; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
  .vfm-sec-h.blue { color: #0284c7; }
  .vfm-sec-h.green { color: #059669; }
  .vfm-divider { height: 1px; background: #eef2f7; }

  .vfm-field { display: flex; flex-direction: column; gap: 6px; }
  .vfm-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .vfm-label { font-size: 12.5px; font-weight: 600; color: #334155; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .vfm-req { color: #ef4444; font-weight: 700; }
  .vfm-error-text { font-size: 11.5px; font-weight: 600; color: #dc2626; margin: -2px 0 0; }

  .vfm-input, .vfm-select, .vfm-textarea {
    width: 100%; background: #fff; border: 1px solid #dbe3ec; border-radius: 10px;
    padding: 10px 12px; font-size: 13.5px; color: #0f172a; font-family: inherit;
    outline: none; transition: border-color .15s ease, box-shadow .15s ease;
  }
  .vfm-input::placeholder, .vfm-textarea::placeholder { color: #9aa7b8; }
  .vfm-input:focus, .vfm-select:focus, .vfm-textarea:focus { border-color: #0284c7; box-shadow: 0 0 0 3px rgba(2,132,199,0.12); }
  .vfm-input.error, .vfm-textarea.error { border-color: #ef4444; }
  .vfm-input.error:focus, .vfm-textarea.error:focus { box-shadow: 0 0 0 3px rgba(239,68,68,0.12); }
  .vfm-select { appearance: none; -webkit-appearance: none; cursor: pointer; padding-right: 34px; background-image: ${CHEVRON}; background-repeat: no-repeat; background-position: right 11px center; }
  .vfm-textarea { resize: none; line-height: 1.55; }

  .vfm-input-icon { position: relative; }
  .vfm-input-icon > .ico { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; display: flex; }
  .vfm-input-icon .vfm-input { padding-left: 34px; }

  .vfm-money { position: relative; }
  .vfm-money-cur { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 12px; font-weight: 600; color: #94a3b8; pointer-events: none; }
  .vfm-money .vfm-input { padding-left: 44px; }

  .vfm-seg { display: flex; background: #eef2f7; border: 1px solid #e4e9f0; border-radius: 10px; padding: 3px; gap: 3px; }
  .vfm-seg-btn { flex: 1; border: none; background: transparent; color: #64748b; font-size: 12px; font-weight: 700; padding: 7px 8px; border-radius: 7px; cursor: pointer; transition: all .15s ease; font-family: inherit; white-space: nowrap; }
  .vfm-seg-btn:hover:not(.active) { color: #334155; }
  .vfm-seg-btn.active { background: #fff; color: #0284c7; box-shadow: 0 1px 2px rgba(16,24,40,0.14); }
  .vfm-seg.inline { display: inline-flex; }
  .vfm-seg.inline .vfm-seg-btn { flex: 0 0 auto; padding: 6px 14px; }

  .vfm-hint { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #94a3b8; background: #eef2f7; padding: 2px 8px; border-radius: 999px; flex-shrink: 0; }

  .vfm-suggest { position: absolute; top: 100%; left: 0; right: 0; margin-top: 6px; background: #fff; border: 1px solid #e6ebf2; border-radius: 10px; box-shadow: 0 14px 34px -12px rgba(15,23,42,0.28); z-index: 60; max-height: 224px; overflow-y: auto; }
  .vfm-suggest-item { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 9px 12px; border: none; border-bottom: 1px solid #f1f5f9; background: #fff; cursor: pointer; text-align: left; font-family: inherit; transition: background .12s ease; }
  .vfm-suggest-item:last-child { border-bottom: none; }
  .vfm-suggest-item:hover { background: #f0f9ff; }
  .vfm-suggest-name { font-size: 13px; font-weight: 600; color: #0f172a; }
  .vfm-suggest-meta { font-size: 11px; color: #94a3b8; background: #f1f5f9; padding: 1px 8px; border-radius: 999px; white-space: nowrap; }

  .vfm-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 22px; border-top: 1px solid #eef2f7; background: #fff; flex-shrink: 0; }
  .vfm-foot-note { font-size: 12px; color: #94a3b8; }
  .vfm-actions { display: flex; gap: 10px; }
  .vfm-btn-cancel { padding: 9px 18px; border: 1px solid #e2e8f0; background: #fff; color: #475569; font-size: 13.5px; font-weight: 600; border-radius: 10px; cursor: pointer; transition: all .15s ease; font-family: inherit; }
  .vfm-btn-cancel:hover { background: #f8fafc; color: #0f172a; }
  .vfm-btn-save { padding: 9px 22px; border: none; background: #0284c7; color: #fff; font-size: 13.5px; font-weight: 700; border-radius: 10px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; transition: background .15s ease; font-family: inherit; box-shadow: 0 1px 2px rgba(2,132,199,0.3); }
  .vfm-btn-save:hover { background: #0369a1; }
  .vfm-btn-save:disabled { opacity: .6; cursor: not-allowed; }

  @keyframes vfm-spin { to { transform: rotate(360deg); } }
  .vfm-spin { animation: vfm-spin 1s linear infinite; }
`;

export default function VacancyFormModal({
  value,
  onChange,
  onClose,
  onSubmit,
  saving,
  saveLabel,
  headerTitle,
  headerSubtitle,
  requireDeadline,
}: {
  value: VacancyFormState;
  onChange: (next: VacancyFormState) => void;
  onClose: () => void;
  onSubmit: () => void;
  saving: boolean;
  saveLabel: string;
  headerTitle: string;
  headerSubtitle: string;
  requireDeadline?: boolean;
}) {
  const [requirementsTab, setRequirementsTab] = useState<"skill" | "education">("skill");
  const [locationSuggestionsOpen, setLocationSuggestionsOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ title?: boolean; description_template?: boolean; deadline?: boolean }>({});

  const set = (patch: Partial<VacancyFormState>) => {
    onChange({ ...value, ...patch });
    setFieldErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(patch) as (keyof VacancyFormState)[]) {
        if (key === "title" || key === "description_template" || key === "deadline") delete next[key];
      }
      return next;
    });
  };

  const handleSave = () => {
    const errors: typeof fieldErrors = {};
    if (!value.title.trim()) errors.title = true;
    if (!value.description_template.trim()) errors.description_template = true;
    if (requireDeadline) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (!value.deadline || new Date(value.deadline) < today) errors.deadline = true;
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length === 0) onSubmit();
  };

  return (
    <div className="vfm-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <style>{STYLES}</style>
      <div className="vfm-modal">

        {/* Header */}
        <div className="vfm-header">
          <div className="vfm-header-l">
            <div className="vfm-header-ico">
              <FileText size={22} strokeWidth={1.75} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 className="vfm-title">{headerTitle}</h3>
              <p className="vfm-sub">{headerSubtitle}</p>
            </div>
          </div>
          <button className="vfm-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="vfm-body">
          <div className="vfm-cols">

            {/* Left panel — structured details */}
            <div className="vfm-panel">
              {/* Basic Details */}
              <div className="vfm-sec">
                <div className="vfm-sec-h blue"><Briefcase size={15} /> Basic Details</div>

                <div className="vfm-field">
                  <label className="vfm-label">Job Title <span className="vfm-req">*</span></label>
                  <input
                    className={`vfm-input${fieldErrors.title ? " error" : ""}`}
                    type="text"
                    value={value.title}
                    onChange={(e) => set({ title: e.target.value })}
                    placeholder="e.g. Senior Bartender"
                  />
                  {fieldErrors.title && <p className="vfm-error-text">This field is required.</p>}
                </div>

                <div className="vfm-row2">
                  <div className="vfm-field">
                    <label className="vfm-label">Department</label>
                    <input
                      className="vfm-input"
                      type="text"
                      value={value.job_category}
                      onChange={(e) => set({ job_category: e.target.value })}
                      placeholder="e.g. Hospitality"
                    />
                  </div>
                  <div className="vfm-field">
                    <label className="vfm-label">Employment Type</label>
                    <select className="vfm-select" value={value.employment_type} onChange={(e) => set({ employment_type: e.target.value })}>
                      <option value="Full Time">Full Time</option>
                      <option value="Part Time">Part Time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                      <option value="Freelance">Freelance</option>
                    </select>
                  </div>
                </div>

                <div className="vfm-row2">
                  <div className="vfm-field">
                    <label className="vfm-label">No. of Openings</label>
                    <input
                      className="vfm-input"
                      type="number"
                      min={1}
                      value={value.quantity}
                      onChange={(e) => set({ quantity: Math.max(1, Number(e.target.value)) })}
                      placeholder="1"
                    />
                  </div>
                  <div className="vfm-field">
                    <label className="vfm-label">Experience</label>
                    <select className="vfm-select" value={value.experience_required} onChange={(e) => set({ experience_required: e.target.value })}>
                      <option value="Entry level">Entry level</option>
                      <option value="Junior">Junior</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Senior">Senior</option>
                      <option value="Expert">Expert</option>
                    </select>
                  </div>
                </div>

                <div className="vfm-field" style={{ position: "relative" }}>
                  <label className="vfm-label">Place of Work</label>
                  <div className="vfm-input-icon">
                    <span className="ico"><MapPin size={16} /></span>
                    <input
                      className="vfm-input"
                      type="text"
                      value={value.location}
                      onChange={(e) => { set({ location: e.target.value }); setLocationSuggestionsOpen(true); }}
                      onFocusCapture={() => setLocationSuggestionsOpen(true)}
                      onBlur={() => setTimeout(() => setLocationSuggestionsOpen(false), 200)}
                      placeholder="Search neighborhood or sub-city..."
                      autoComplete="off"
                    />
                  </div>
                  {locationSuggestionsOpen && (() => {
                    const results = searchLocations(value.location).slice(0, 8);
                    return results.length > 0 ? (
                      <div className="vfm-suggest">
                        {results.map((loc) => (
                          <button
                            key={loc.id}
                            type="button"
                            className="vfm-suggest-item"
                            onMouseDown={(e) => { e.preventDefault(); set({ location: loc.name }); setLocationSuggestionsOpen(false); }}
                          >
                            <span className="vfm-suggest-name">{loc.name}</span>
                            <span className="vfm-suggest-meta">{loc.subCity} • {loc.type.charAt(0).toUpperCase() + loc.type.slice(1)}</span>
                          </button>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>

                <div className="vfm-field">
                  <label className="vfm-label">
                    <span>Application Deadline {requireDeadline && <span className="vfm-req">*</span>}</span>
                  </label>
                  <input
                    className={`vfm-input${fieldErrors.deadline ? " error" : ""}`}
                    type="date"
                    value={value.deadline}
                    min={requireDeadline ? new Date().toISOString().split("T")[0] : undefined}
                    onChange={(e) => set({ deadline: e.target.value })}
                  />
                  {fieldErrors.deadline && (
                    <p className="vfm-error-text">
                      {!value.deadline ? "A new deadline is required to repost this job." : "Deadline must be today or later."}
                    </p>
                  )}
                </div>
              </div>

              <div className="vfm-divider" />

              {/* Compensation */}
              <div className="vfm-sec">
                <div className="vfm-sec-h green"><CreditCard size={15} /> Compensation</div>

                <div className="vfm-field">
                  <label className="vfm-label">Salary Structure</label>
                  <div className="vfm-seg">
                    {[
                      { value: "fixed", label: "Fixed" },
                      { value: "company_scale", label: "Company Scale" },
                      { value: "negotiable", label: "Negotiable" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`vfm-seg-btn${value.salary_type === opt.value ? " active" : ""}`}
                        onClick={() => set({ salary_type: opt.value })}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {value.salary_type === "fixed" && (
                  <div className="vfm-row2">
                    <div className="vfm-field">
                      <label className="vfm-label">Minimum</label>
                      <div className="vfm-money">
                        <span className="vfm-money-cur">ETB</span>
                        <input
                          className="vfm-input"
                          type="number"
                          value={value.salary_min || ""}
                          onChange={(e) => set({ salary_min: e.target.value ? Number(e.target.value) : null })}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="vfm-field">
                      <label className="vfm-label">Maximum</label>
                      <div className="vfm-money">
                        <span className="vfm-money-cur">ETB</span>
                        <input
                          className="vfm-input"
                          type="number"
                          value={value.salary_max || ""}
                          onChange={(e) => set({ salary_max: e.target.value ? Number(e.target.value) : null })}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right panel — content */}
            <div className="vfm-panel">
              <div className="vfm-panel-title"><ClipboardList size={17} color="#0284c7" /> Job Content</div>

              <div className="vfm-field">
                <label className="vfm-label">
                  <span>Job Description <span className="vfm-req">*</span></span>
                  <span className="vfm-hint">Main overview</span>
                </label>
                <textarea
                  className={`vfm-textarea${fieldErrors.description_template ? " error" : ""}`}
                  style={{ height: 112 }}
                  value={value.description_template}
                  onChange={(e) => set({ description_template: e.target.value })}
                  placeholder="Provide a compelling overview of the role and what it entails..."
                />
                {fieldErrors.description_template && <p className="vfm-error-text">This field is required.</p>}
              </div>

              <div className="vfm-field">
                <label className="vfm-label">
                  <span>Responsibilities</span>
                  <span className="vfm-hint">Bulleted list</span>
                </label>
                <textarea
                  className="vfm-textarea"
                  style={{ height: 92 }}
                  value={value.responsibilities_template}
                  onChange={(e) => set({ responsibilities_template: e.target.value })}
                  placeholder={"- Daily task one\n- Daily task two\n- Key deliverable..."}
                />
              </div>

              <div className="vfm-field">
                <div className="vfm-seg inline" style={{ alignSelf: "flex-start" }}>
                  <button
                    type="button"
                    className={`vfm-seg-btn${requirementsTab === "skill" ? " active" : ""}`}
                    onClick={() => setRequirementsTab("skill")}
                  >
                    Requirement Skills
                  </button>
                  <button
                    type="button"
                    className={`vfm-seg-btn${requirementsTab === "education" ? " active" : ""}`}
                    onClick={() => setRequirementsTab("education")}
                  >
                    Education
                  </button>
                </div>
                {requirementsTab === "skill" ? (
                  <textarea
                    className="vfm-textarea"
                    style={{ height: 92 }}
                    value={value.requirements_template}
                    onChange={(e) => set({ requirements_template: e.target.value })}
                    placeholder={"- Required skill one\n- Certification...\n- Years of experience..."}
                  />
                ) : (
                  <textarea
                    className="vfm-textarea"
                    style={{ height: 92 }}
                    value={value.education_requirements}
                    onChange={(e) => set({ education_requirements: e.target.value })}
                    placeholder={"- Bachelor's Degree in Hospitality Management\n- Vocational certificate in...\n- Minimum education level..."}
                  />
                )}
              </div>

              <div className="vfm-field">
                <label className="vfm-label">Benefits</label>
                <textarea
                  className="vfm-textarea"
                  style={{ height: 92 }}
                  value={value.benefits_template}
                  onChange={(e) => set({ benefits_template: e.target.value })}
                  placeholder={"- Paid time off\n- Health insurance..."}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="vfm-footer">
          <span className="vfm-foot-note">Fields marked <span className="vfm-req">*</span> are required.</span>
          <div className="vfm-actions">
            <button className="vfm-btn-cancel" onClick={onClose}>Cancel</button>
            <button className="vfm-btn-save" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <svg className="vfm-spin" width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
                    <path fill="currentColor" opacity="0.75" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Saving...
                </>
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
