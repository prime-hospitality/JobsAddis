"use client";

import { motion, useReducedMotion, LazyMotion, domAnimation } from "framer-motion";
import { ArrowLeft, MapPin, Wallet, Briefcase, Calendar, CheckCircle, AlertCircle, Clock, Users } from "lucide-react";
import { Job } from "@/data/jobs";
import EmployerAvatar from "@/components/EmployerAvatar";
import { useT, timeAgo, formatDate, formatNumber } from "@/lib/i18n";
import { minYearsLabel, yearsLabel, categoryLabel } from "@/lib/vocabulary";
import type { SeekerYears } from "@/hooks/useJobs";

interface JobDetailScreenProps {
  job: Job;
  isEmployer?: boolean;
  /** Signed-in seeker's role -> years, so the advisory banner can name the gap. */
  seekerYears?: SeekerYears;
  /** True when this seeker already has an application on file for this job. */
  hasApplied?: boolean;
  /** Surfaced when the apply flow can't start (e.g. the profile failed to load). */
  applyError?: string | null;
  onBack: () => void;
  onApply: (job: Job) => void;
}

function isDeadlinePassed(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime()) && d.getTime() < Date.now();
}

function renderWithLinks(text: string) {
  if (!text) return text;
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|t\.me\/[^\s]+)/gi;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      let href = part;
      if (!href.startsWith('http://') && !href.startsWith('https://')) {
        href = 'https://' + href;
      }
      return (
        <a 
          key={i} 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ color: "#3B82F6", textDecoration: "underline", fontWeight: 500 }}
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export default function JobDetailScreen({ job, isEmployer, seekerYears, hasApplied, applyError, onBack, onApply }: JobDetailScreenProps) {
  const t = useT();
  const shouldReduceMotion = useReducedMotion();
  const deadlinePassed = isDeadlinePassed(job.deadline);

  const infoItems = [
    { icon: MapPin, label: t("jobDetail.labels.location"), value: job.location },
    {
      icon: Wallet,
      label: t("jobDetail.labels.salary"),
      // -1 is negotiable and -2 is company scale, per resolveSalary(). Swapped.
      value: job.salaryMin === -1
        ? t("jobDetail.salaryNegotiable")
        : job.salaryMin === -2
        ? t("jobDetail.salaryPerScale")
        : job.salaryMin === job.salaryMax
        ? t("jobDetail.salarySingle", { amount: formatNumber(job.salaryMin, t.lang) })
        : t("jobDetail.salaryRange", {
            min: formatNumber(job.salaryMin, t.lang),
            max: formatNumber(job.salaryMax, t.lang),
          })
    },
    { icon: Briefcase, label: t("jobDetail.labels.jobType"), value: job.jobType },
    { icon: Calendar, label: t("jobDetail.labels.deadline"), value: formatDate(job.deadline, t.lang) },
  ];

  if (job.requirements?.workingHours) {
    infoItems.push({ icon: Clock, label: t("jobDetail.labels.workingHours"), value: job.requirements.workingHours });
  }

  const openingsCount = (job as any).quantity ?? 1;
  infoItems.push({
    icon: Users,
    label: t("jobDetail.labels.openings"),
    value: t(openingsCount === 1 ? "jobDetail.openingsCount" : "jobDetail.openingsCountPlural", { count: openingsCount }),
  });

  const validInfoItems = infoItems.filter(item => item.value && String(item.value).trim() !== "");

  return (
    <LazyMotion features={domAnimation}>
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100dvh",
          background: "transparent",
          willChange: "transform",
          overflow: "hidden",
        }}
      >
        {/* ── HEADER ── */}
        <div
          className="safe-screen-top"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "var(--surface-elevated)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderBottom: "1px solid var(--border)",
            paddingLeft: 20,
            paddingRight: 20,
            paddingBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <motion.button
            id="job-detail-back"
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: "var(--surface-elevated)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={18} color="var(--text-primary)" />
          </motion.button>
          <div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, marginBottom: 1 }}>
              {t("jobDetail.header")}
            </p>
            <h1
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1.2,
              }}
            >
              {job.title}
            </h1>
          </div>
        </div>

        {/* ── SCROLLABLE CONTENT ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"],
          }}
        >
        <div style={{ padding: "20px 20px 0" }}>

          {/* Business hero card */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.05 }}
            style={{
              background: "linear-gradient(135deg, var(--surface-elevated) 0%, var(--card) 100%)",
              border: "1px solid rgba(5,150,105,0.15)",
              borderRadius: 20,
              padding: 20,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <EmployerAvatar name={job.businessName} logoUrl={job.logoUrl} size={64} radius={16} />
            <div>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  lineHeight: 1.2,
                  marginBottom: 4,
                  letterSpacing: "-0.02em",
                }}
              >
                {job.title}
                {/* Sits with the title rather than in a banner of its own: it
                    qualifies the role, so it belongs where the role is named. */}
                {!job.qualificationsMet && (
                  <span
                    className="experience-tag"
                    style={{
                      marginLeft: 8,
                      verticalAlign: "middle",
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t("jobDetail.experienceGapTag", { min: job.minYearsExperience ?? 0 })}
                  </span>
                )}
              </h2>
              {job.businessName && (
                <p style={{ fontSize: 14, color: "var(--brand)", fontWeight: 600 }}>
                  {job.businessName}
                </p>
              )}
              {job.businessType && (
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {job.businessType}
                </p>
              )}
            </div>
          </motion.div>

          {/* Info grid */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.1 }}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 20,
            }}
          >
            {validInfoItems.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                style={{
                  background: "var(--surface-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "12px 14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <Icon size={13} color="var(--brand)" />
                  <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {label}
                  </span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>
                  {value}
                </p>
              </div>
            ))}
          </motion.div>

          {/* Experience note.
              A muted purple, not a warning palette, and no icon: this is an
              aside about fit, not an alert. The amber it replaced was unreadable
              on a light background and framed a difference of opinion about
              seniority as a problem with the candidate. Neutral surface colours
              were tried in between and were worse in a quieter way -- identical
              to every card around them, so nobody spotted the note at all.

              Shown only when the seeker has actually claimed this job's role.
              Someone who listed Waiter, Spa Attendant and Banquet gets nothing
              here on a Chef posting -- we have no basis to comment on experience
              they never claimed. meetsExperience() returns true for an unknown
              role, so that case never reaches this branch. */}
          {!job.qualificationsMet && (
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.12 }}
              className="experience-note"
              style={{
                borderRadius: 12,
                padding: "12px 14px",
                marginBottom: 20,
              }}
            >
              <p style={{ fontSize: 13, lineHeight: 1.6 }}>
                {t("jobDetail.experienceNote", {
                  min: job.minYearsExperience ?? 0,
                  actual: yearsLabel(seekerYears?.[job.category] ?? null, t),
                  role: categoryLabel(job.category, t.lang),
                })}
              </p>
            </motion.div>
          )}

          {/* About section */}
          {job.fullDescription && job.fullDescription.trim() !== "" && (
            <motion.section
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.15 }}
              style={{ marginBottom: 20 }}
            >
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {t("jobDetail.aboutHeading")}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--text-secondary)",
                  lineHeight: 1.7,
                  background: "var(--surface-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 14,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {renderWithLinks(job.fullDescription)}
              </p>
            </motion.section>
          )}


          {/* Requirements section */}
          {(() => {
            const reqItems = [
              { label: t("jobDetail.labels.experience"), value: minYearsLabel(job.minYearsExperience, t) },
              { label: t("jobDetail.labels.education"), value: job.requirements?.education },
              { label: t("jobDetail.labels.languages"), value: job.requirements?.languages?.length ? job.requirements.languages.join(", ") : null },
              ...(job.requirements?.locationPreference
                ? [{ label: t("jobDetail.labels.location"), value: job.requirements.locationPreference }]
                : []),
            ].filter(item => item.value && String(item.value).trim() !== "");

            if (reqItems.length === 0) return null;

            return (
              <motion.section
                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: 0.2 }}
                style={{ marginBottom: 20 }}
              >
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    marginBottom: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {t("jobDetail.requirementsHeading")}
                </h3>
                <div
                  style={{
                    background: "var(--surface-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  {reqItems.map(({ label, value }, i, arr) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        padding: "12px 14px",
                        borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
                        gap: 12,
                      }}
                    >
                      <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500, flexShrink: 0 }}>
                        {label}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          color: "var(--text-primary)",
                          fontWeight: 600,
                          textAlign: "right",
                        }}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.section>
            );
          })()}

          {/* Posted info */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
            }}
          >
            <CheckCircle size={13} color="var(--success)" />
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {t("jobDetail.postedAndHiring", { when: timeAgo(job.postedAt, t.lang) })}
            </span>
          </div>
        </div>
        {/* bottom padding so last content clears the apply bar */}
        {!isEmployer && <div style={{ height: 16 }} />}
        </div>

        {/* ── APPLY BUTTON BAR (sibling to scroll container, NOT fixed) ── */}
        {!isEmployer && (
          <div
            style={{
              flexShrink: 0,
              padding: "12px 20px",
              paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
              background: "var(--surface-elevated)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderTop: "1px solid var(--border)",
            }}
          >
            {applyError && (
              <div
                style={{
                  marginBottom: 10, padding: "10px 14px", borderRadius: 10,
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                <AlertCircle size={15} color="var(--error)" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: "#FCA5A5", margin: 0, lineHeight: 1.4 }}>{applyError}</p>
              </div>
            )}
            {hasApplied ? (
              <button
                id="apply-now-btn"
                className="btn-primary"
                disabled
                style={{ opacity: 0.6, cursor: "default" }}
              >
                {t("jobDetail.applied")}
              </button>
            ) : deadlinePassed ? (
              <button
                id="apply-now-btn"
                className="btn-primary"
                disabled
                style={{ opacity: 0.6, cursor: "default" }}
              >
                {t("jobDetail.applicationsClosed")}
              </button>
            ) : (
              <motion.button
                id="apply-now-btn"
                className="btn-primary"
                whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
                onClick={() => onApply(job)}
                style={{ willChange: "transform" }}
              >
                {t("jobDetail.applyNow")}
              </motion.button>
            )}
          </div>
        )}
      </motion.div>
    </LazyMotion>
  );
}
