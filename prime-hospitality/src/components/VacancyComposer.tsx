"use client";

import { useState } from "react";
import { MapPin, Minus, Plus } from "lucide-react";
import { DEPARTMENTS } from "@/data/job-categories";
import { searchLocations } from "@/data/locations";
import type { VacancyFormState, VacancyFormErrors } from "@/app/emp/dashboard/jobs/vacancyShared";
import { YEARS_OPTIONS, MAX_YEARS } from "@/lib/vocabulary";
import SheetSelect from "@/components/SheetSelect";

const DEPARTMENT_OPTIONS = DEPARTMENTS.map((d) => ({ value: d, label: d }));
const EMPLOYMENT_OPTIONS = ["Full Time", "Part Time", "Contract", "Internship", "Freelance"].map((v) => ({ value: v, label: v }));
/** A minimum in years, not a seniority label: "Senior" means something
 *  different at a 300-room hotel than at a 20-seat café, so the label never
 *  travelled between employers. Built from the same YEARS_OPTIONS the seeker
 *  picker uses, so both sides of the match share one scale. */
const EXPERIENCE_OPTIONS = [
  { value: "", label: "Any" },
  ...YEARS_OPTIONS.map((y) => ({
    value: String(y),
    label: y === 0 ? "No experience" : y >= MAX_YEARS ? `${MAX_YEARS}+ years` : `${y}+ ${y === 1 ? "year" : "years"}`,
  })),
];

/** "Any" first and default, stored as null: a job the employer never considered
 *  gender for must carry no gender requirement at all. The seeker app shows
 *  Male/Female as an advisory note and never blocks an application on it. */
const GENDER_OPTIONS = [
  { value: "", label: "Any" },
  { value: "male", label: "Male only" },
  { value: "female", label: "Female only" },
];

const SALARY_OPTIONS: { value: string; label: string }[] = [
  { value: "fixed", label: "Fixed" },
  { value: "company_scale", label: "Company scale" },
  { value: "negotiable", label: "Negotiable" },
];

/** Field styling that inline styles can't express — placeholders, focus rings,
 *  and the iOS date-input quirks that otherwise leave an empty date field
 *  looking like a blank box with no affordance. */
const STYLES = `
  .vc-input, .vc-textarea {
    width: 100%; min-height: 48px; background: var(--surface);
    border: 1px solid var(--border); border-radius: 12px;
    padding: 12px 14px; font-size: 15px; font-family: inherit; font-weight: 500;
    color: var(--text-primary); outline: none;
    transition: border-color .18s ease, box-shadow .18s ease;
    -webkit-appearance: none; appearance: none;
  }
  .vc-textarea { line-height: 1.55; resize: vertical; font-weight: 400; }
  .vc-input::placeholder, .vc-textarea::placeholder { color: var(--text-muted); font-weight: 400; }
  .vc-input:focus, .vc-textarea:focus { border-color: var(--brand); box-shadow: 0 0 0 3px var(--brand-subtle); }
  .vc-input.invalid, .vc-textarea.invalid { border-color: var(--error); }
  .vc-input.invalid:focus, .vc-textarea.invalid:focus { box-shadow: 0 0 0 3px rgba(239,68,68,0.14); }
  /* Safari renders an empty date input as blank; give it a visible height and
     keep the value left-aligned like every other field on the screen. */
  .vc-input[type="date"] { min-height: 48px; text-align: left; }
  .vc-input[type="date"]::-webkit-date-and-time-value { text-align: left; }
  .vc-input[type="date"]::-webkit-calendar-picker-indicator { opacity: .55; }

  .vc-step { width: 44px; height: 44px; border-radius: 12px; border: 1px solid var(--border);
    background: var(--surface); color: var(--text-primary); display: flex;
    align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
  .vc-step:disabled { opacity: .35; cursor: not-allowed; }
  .vc-step:active:not(:disabled) { background: var(--card-hover); }
`;

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <label style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.01em" }}>
        {label}
        {required && <span style={{ color: "var(--error)", marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {error ? (
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--error)", margin: 0 }}>{error}</p>
      ) : hint ? (
        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, lineHeight: 1.45 }}>{hint}</p>
      ) : null}
    </div>
  );
}

function SectionHeading({ index, title, blurb }: { index: number; title: string; blurb: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 11, marginBottom: 4 }}>
      <span
        aria-hidden
        style={{
          width: 24,
          height: 24,
          borderRadius: 8,
          background: "var(--brand-subtle)",
          color: "var(--brand-dim)",
          fontSize: 12,
          fontWeight: 800,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {index}
      </span>
      <div style={{ minWidth: 0 }}>
        <h3 style={{ fontSize: 15.5, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.015em", margin: 0 }}>{title}</h3>
        <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: "2px 0 0", lineHeight: 1.45 }}>{blurb}</p>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        boxShadow: "var(--card-shadow)",
        padding: 16,
      }}
    >
      {children}
    </div>
  );
}

/** Renders every field of a vacancy, and nothing else — no header, no submit
 *  button, no data fetching. The dashboard uses it twice with different chrome:
 *  inline for a job written from scratch, and inside a full-screen sheet when
 *  editing a saved template. Both edit the same VacancyFormState the employer
 *  web dashboard uses, so a template touched on a phone stays readable there. */
export default function VacancyComposer({
  value,
  onChange,
  errors,
  maxDeadline,
}: {
  value: VacancyFormState;
  onChange: (next: VacancyFormState) => void;
  errors: VacancyFormErrors;
  /** The employer's plan end date (YYYY-MM-DD) — the deadline can't go past it. */
  maxDeadline: string | null;
}) {
  const [locationOpen, setLocationOpen] = useState(false);
  const set = (patch: Partial<VacancyFormState>) => onChange({ ...value, ...patch });
  const today = new Date().toISOString().split("T")[0];
  const locationMatches = locationOpen ? searchLocations(value.location).slice(0, 6) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <style>{STYLES}</style>

      {/* ── 1. The role ── */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionHeading index={1} title="The role" blurb="What you're hiring for, and where." />
        <Card>
          <Field label="Job title" required error={errors.title}>
            <input
              className={`vc-input${errors.title ? " invalid" : ""}`}
              type="text"
              value={value.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="e.g. Senior waiter"
              enterKeyHint="next"
            />
          </Field>

          <SheetSelect
            label="Department"
            title="Which department?"
            value={value.job_category}
            onChange={(v) => set({ job_category: v })}
            options={
              value.job_category && !DEPARTMENTS.includes(value.job_category as (typeof DEPARTMENTS)[number])
                ? [{ value: value.job_category, label: value.job_category }, ...DEPARTMENT_OPTIONS]
                : DEPARTMENT_OPTIONS
            }
          />

          <SheetSelect
            label="Employment type"
            title="Type of employment"
            value={value.employment_type}
            onChange={(v) => set({ employment_type: v })}
            options={EMPLOYMENT_OPTIONS}
          />

          <SheetSelect
            label="Experience"
            title="Experience"
            value={String(value.min_years_experience ?? "")}
            onChange={(v) => set({ min_years_experience: v === "" ? null : Number(v) })}
            options={EXPERIENCE_OPTIONS}
          />

          <SheetSelect
            label="Gender"
            title="Gender"
            value={value.gender_preference ?? ""}
            onChange={(v) => set({ gender_preference: v === "" ? null : (v as "male" | "female") })}
            options={GENDER_OPTIONS}
          />

          <Field label="Openings">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                className="vc-step"
                aria-label="One fewer opening"
                disabled={value.quantity <= 1}
                onClick={() => set({ quantity: Math.max(1, value.quantity - 1) })}
              >
                <Minus size={18} />
              </button>
              <input
                className="vc-input"
                type="number"
                inputMode="numeric"
                min={1}
                value={value.quantity}
                onChange={(e) => set({ quantity: Math.max(1, Number(e.target.value) || 1) })}
                style={{ textAlign: "center", fontWeight: 700 }}
              />
              <button
                type="button"
                className="vc-step"
                aria-label="One more opening"
                onClick={() => set({ quantity: value.quantity + 1 })}
              >
                <Plus size={18} />
              </button>
            </div>
          </Field>

          <Field label="Place of work">
            <div style={{ position: "relative" }}>
              <MapPin
                size={17}
                color="var(--text-muted)"
                style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
              />
              <input
                className="vc-input"
                style={{ paddingLeft: 40 }}
                type="text"
                value={value.location}
                onChange={(e) => {
                  set({ location: e.target.value });
                  setLocationOpen(true);
                }}
                onFocus={() => setLocationOpen(true)}
                // Delayed so a tap on a suggestion lands before the list unmounts.
                onBlur={() => setTimeout(() => setLocationOpen(false), 180)}
                placeholder="Bole, Kazanchis, Piassa…"
                autoComplete="off"
              />
              {locationMatches.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    right: 0,
                    zIndex: 30,
                    background: "var(--surface-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    boxShadow: "0 12px 28px rgba(0,0,0,0.14)",
                    overflow: "hidden",
                  }}
                >
                  {locationMatches.map((loc) => (
                    <button
                      key={loc.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        set({ location: loc.name });
                        setLocationOpen(false);
                      }}
                      style={{
                        width: "100%",
                        minHeight: 46,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        padding: "10px 14px",
                        background: "transparent",
                        border: "none",
                        borderBottom: "1px solid var(--border)",
                        cursor: "pointer",
                        textAlign: "left",
                        font: "inherit",
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{loc.name}</span>
                      <span style={{ fontSize: 11.5, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{loc.subCity}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>

          <Field
            label="Applications close"
            error={errors.deadline}
            hint={
              maxDeadline
                ? `Leave empty to close 30 days from today. Your plan ends ${maxDeadline}, so the deadline can't go past that.`
                : "Leave empty to close 30 days from today."
            }
          >
            <input
              className={`vc-input${errors.deadline ? " invalid" : ""}`}
              type="date"
              value={value.deadline}
              min={today}
              max={maxDeadline || undefined}
              onChange={(e) => set({ deadline: e.target.value })}
            />
          </Field>
        </Card>
      </section>

      {/* ── 2. Pay ── */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionHeading index={2} title="Pay" blurb="Seekers filter by salary — a real range gets more applicants." />
        <Card>
          <Field label="Salary structure">
            <div
              role="radiogroup"
              aria-label="Salary structure"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 4,
                padding: 4,
                background: "var(--card-hover)",
                borderRadius: 14,
              }}
            >
              {SALARY_OPTIONS.map((opt) => {
                const isActive = value.salary_type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => set({ salary_type: opt.value })}
                    style={{
                      minHeight: 44,
                      padding: "9px 6px",
                      borderRadius: 11,
                      border: "none",
                      background: isActive ? "var(--surface)" : "transparent",
                      boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.10)" : "none",
                      color: isActive ? "var(--brand-dim)" : "var(--text-secondary)",
                      fontSize: 12.5,
                      fontWeight: isActive ? 800 : 600,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      lineHeight: 1.25,
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* One figure, written to both columns. The From/To pair this
              replaces let an employer fill only one side, which stored
              min=0/max=25000 and announced a real salary as negotiable. A
              fixed salary is one number, so there is one box. */}
          {value.salary_type === "fixed" && (
            <Field label="Amount (ETB)">
              <input
                className="vc-input"
                type="number"
                inputMode="numeric"
                value={value.salary_min ?? ""}
                onChange={(e) => {
                  const amount = e.target.value ? Number(e.target.value) : null;
                  set({ salary_min: amount, salary_max: amount });
                }}
                placeholder="0"
              />
            </Field>
          )}
        </Card>
      </section>

      {/* ── 3. The description ── */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionHeading index={3} title="The description" blurb="One point per line — each becomes a bullet in the listing." />
        <Card>
          <Field label="About the job" required error={errors.description_template}>
            <textarea
              className={`vc-textarea${errors.description_template ? " invalid" : ""}`}
              style={{ minHeight: 108 }}
              value={value.description_template}
              onChange={(e) => set({ description_template: e.target.value })}
              placeholder={"Join our fine-dining floor team\nBusy Bole location, 6 shifts a week"}
            />
          </Field>

          <Field label="Responsibilities">
            <textarea
              className="vc-textarea"
              style={{ minHeight: 92 }}
              value={value.responsibilities_template}
              onChange={(e) => set({ responsibilities_template: e.target.value })}
              placeholder={"Take orders and serve guests\nHandle POS and close the till"}
            />
          </Field>

          <Field label="Required skills">
            <textarea
              className="vc-textarea"
              style={{ minHeight: 84 }}
              value={value.requirements_template}
              onChange={(e) => set({ requirements_template: e.target.value })}
              placeholder={"Fluent Amharic and English\nFood handling certificate"}
            />
          </Field>

          <Field label="Experience">
            <textarea
              className="vc-textarea"
              style={{ minHeight: 84 }}
              value={value.experience_template}
              onChange={(e) => set({ experience_template: e.target.value })}
              placeholder={"2+ years in a similar role\nHotel or fine-dining background preferred"}
            />
          </Field>

          <Field label="Education">
            <textarea
              className="vc-textarea"
              style={{ minHeight: 84 }}
              value={value.education_requirements}
              onChange={(e) => set({ education_requirements: e.target.value })}
              placeholder={"Diploma in hotel management, or equivalent"}
            />
          </Field>

          <Field label="Benefits">
            <textarea
              className="vc-textarea"
              style={{ minHeight: 84 }}
              value={value.benefits_template}
              onChange={(e) => set({ benefits_template: e.target.value })}
              placeholder={"Staff meals and transport allowance\nService charge share"}
            />
          </Field>
        </Card>
      </section>
    </div>
  );
}
