"use client";

import { useState, useEffect } from "react";
import { motion, useReducedMotion, LazyMotion, domAnimation } from "framer-motion";
import { ArrowLeft, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Job } from "@/data/jobs";
import { JOB_SELECT, mapSupabaseJobToJob, type SupabaseJob, type SeekerYears } from "@/hooks/useJobs";
import EmployerAvatar from "@/components/EmployerAvatar";
import JobCard from "@/components/JobCard";
import { useT } from "@/lib/i18n";
import { businessTypeLabel } from "@/lib/vocabulary";

/**
 * A company as a seeker sees it: who they are, and what they are hiring for.
 *
 * Reached only by tapping an employer's name or logo on a card or a job detail
 * — it is deliberately absent from the tab bar, because a company is something
 * you arrive at from a job you were already looking at, not somewhere you go
 * to browse.
 *
 * `employers.description` has existed and been editable in the employer
 * dashboard for a long time, under a prompt asking them to tell job seekers
 * about their business. Until this screen there was nowhere it was ever shown.
 */

interface Company {
  id: string;
  business_name: string;
  business_type: string | null;
  logo_url: string | null;
  description: string | null;
}

export default function CompanyProfileScreen({
  employerId,
  onBack,
  onJobSelect,
  seekerYears,
}: {
  employerId: string;
  onBack: () => void;
  onJobSelect: (job: Job) => void;
  /** Passed straight through to the job cards so their experience badge reads
   *  the same here as it does in the feed. */
  seekerYears?: SeekerYears;
}) {
  const t = useT();
  const shouldReduceMotion = useReducedMotion();

  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Null until the load settles, because which tab opens depends on whether
  // there is an About to open onto. Picking one before the data arrives would
  // show Overview for a beat and then jump.
  const [tab, setTab] = useState<"overview" | "jobs" | null>(null);

  const seekerYearsKey = JSON.stringify(seekerYears ?? {});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(false);
      try {
        const [companyRes, jobsRes] = await Promise.all([
          supabase
            .from("employers")
            .select("id, business_name, business_type, logo_url, description")
            .eq("id", employerId)
            .maybeSingle(),
          supabase
            .from("jobs")
            .select(JOB_SELECT)
            .eq("employer_id", employerId)
            .eq("status", "active")
            .order("last_posted_at", { ascending: false }),
        ]);

        if (cancelled) return;
        if (companyRes.error || !companyRes.data) {
          setError(true);
          return;
        }

        const years = JSON.parse(seekerYearsKey) as SeekerYears;
        const mapped = ((jobsRes.data ?? []) as unknown as SupabaseJob[]).map((sj) =>
          mapSupabaseJobToJob(sj, years)
        );

        setCompany(companyRes.data as Company);
        setJobs(mapped);
        // Land on the tab that has something on it. Most employers have not
        // written a description yet, and opening every profile onto an empty
        // panel would read as a broken page rather than an unfilled field.
        setTab((companyRes.data as Company).description?.trim() ? "overview" : "jobs");
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [employerId, seekerYearsKey]);

  const about = company?.description?.trim() ?? "";

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
            id="company-back"
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
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, marginBottom: 1 }}>
              {t("company.header")}
            </p>
            <h1
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {company?.business_name ?? " "}
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
          <div style={{ padding: "20px 20px 24px" }}>
            {loading ? (
              <p style={{ fontSize: 14, color: "var(--text-muted)", textAlign: "center", padding: "40px 0" }}>
                {t("common.loading")}
              </p>
            ) : error || !company ? (
              <p style={{ fontSize: 14, color: "var(--text-muted)", textAlign: "center", padding: "40px 0" }}>
                {t("company.notFound")}
              </p>
            ) : (
              <>
                {/* Business hero — same construction as the job detail's hero, so
                    arriving here from a job feels like the same place. */}
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
                  <EmployerAvatar
                    name={company.business_name}
                    logoUrl={company.logo_url ?? undefined}
                    size={64}
                    radius={16}
                  />
                  <div style={{ minWidth: 0 }}>
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
                      {company.business_name}
                    </h2>
                    {company.business_type && (
                      <p style={{ fontSize: 13, color: "var(--brand)", fontWeight: 600 }}>
                        {businessTypeLabel(company.business_type, t.lang)}
                      </p>
                    )}
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      {t(jobs.length === 1 ? "company.openCount" : "company.openCountPlural", {
                        count: jobs.length,
                      })}
                    </p>
                  </div>
                </motion.div>

                {/* ── TABS ── Two equal halves rather than a scrolling strip:
                    there are exactly two and there will not be a third, so the
                    control can afford to show both at full width and let the
                    active one be obvious at a glance. */}
                <div
                  role="tablist"
                  aria-label={t("company.header")}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 6,
                    padding: 4,
                    background: "var(--surface-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    marginBottom: 18,
                  }}
                >
                  {(["overview", "jobs"] as const).map((key) => {
                    const active = tab === key;
                    return (
                      <button
                        key={key}
                        role="tab"
                        aria-selected={active}
                        onClick={() => setTab(key)}
                        style={{
                          padding: "9px 8px",
                          borderRadius: 9,
                          border: "none",
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 700,
                          fontFamily: "inherit",
                          background: active ? "var(--brand)" : "transparent",
                          color: active ? "#fff" : "var(--text-secondary)",
                          transition: "background .15s ease, color .15s ease",
                        }}
                      >
                        {t(key === "overview" ? "company.tabs.overview" : "company.tabs.jobs")}
                      </button>
                    );
                  })}
                </div>

                {/* ── OVERVIEW ── */}
                {tab === "overview" && (
                  <motion.section
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24 }}
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
                      {t("company.aboutHeading")}
                    </h3>
                    {about ? (
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
                        {about}
                      </p>
                    ) : (
                      /* One quiet line, and nothing that sounds like the company
                         is at fault. A seeker reading this cannot act on it. */
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          background: "var(--surface-elevated)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          padding: 14,
                        }}
                      >
                        <Building2 size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                        <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                          {t("company.noAbout")}
                        </p>
                      </div>
                    )}
                  </motion.section>
                )}

                {/* ── OPEN JOBS ── */}
                {tab === "jobs" && (
                  <motion.section
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24 }}
                  >
                    {jobs.length === 0 ? (
                      <div
                        style={{
                          background: "var(--surface-elevated)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          padding: 14,
                        }}
                      >
                        <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                          {t("company.noJobs")}
                        </p>
                      </div>
                    ) : (
                      /* The same JobCard the feed uses. A second card style for
                         the same object would be one more place for the two to
                         drift. No onCompanySelect is passed, so the employer
                         name here is inert rather than a link back to the page
                         it is already on. */
                      jobs.map((job, i) => (
                        <JobCard key={job.id} job={job} onClick={onJobSelect} index={i} showCompany={false} />
                      ))
                    )}
                  </motion.section>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
    </LazyMotion>
  );
}
