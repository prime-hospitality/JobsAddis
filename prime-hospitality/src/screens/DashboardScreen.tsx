"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, LazyMotion, domAnimation, motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  FileStack,
  Loader2,
  MapPin,
  Pencil,
  RefreshCw,
  Search,
  Send,
  Users,
} from "lucide-react";
import { useTelegram } from "@/hooks/useTelegram";
import {
  createEmployerJobPost,
  fetchEmployerDashboard,
  fetchEmployerPostingData,
  postJobFromTemplate,
  updateEmployerTemplate,
  type EmployerJobRow,
  type EmployerPostingData,
} from "@/lib/api";
import {
  emptyVacancyForm,
  templateRowToForm,
  validateVacancyForm,
  type VacancyFormErrors,
  type VacancyFormState,
} from "@/app/emp/dashboard/jobs/vacancyShared";
import EmployerAvatar from "@/components/EmployerAvatar";
import VacancyComposer from "@/components/VacancyComposer";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Salary chip for a template card. The sentinels match resolveSalary():
 *  -1 is negotiable, -2 is the company's own pay scale. */
function salaryChip(tpl: Record<string, any>): string {
  const type = tpl.salary_type;
  if (type === "negotiable") return "Negotiable";
  if (type === "company_scale") return "Company scale";
  const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
  const min = Number(tpl.salary_min) || 0;
  const max = Number(tpl.salary_max) || 0;
  if (min > 0 && max > min) return `ETB ${fmt(min)}–${fmt(max)}`;
  if (min > 0) return `ETB ${fmt(min)}`;
  return "Pay not set";
}

/** "12 Sep 2026" — short enough for a status rail, unambiguous about the month. */
function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ── Small building blocks ────────────────────────────────────────────────────

function Chip({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 9px",
        borderRadius: 100,
        background: "var(--card-hover)",
        color: "var(--text-secondary)",
        fontSize: 11.5,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {icon}
      {children}
    </span>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  loading,
  tone = "brand",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** "review" swaps the emerald for amber — the job is queued, not live. */
  tone?: "brand" | "review";
}) {
  const bg = tone === "review" ? "var(--warning)" : "var(--brand)";
  return (
    <motion.button
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        flex: 1,
        minHeight: 46,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "12px 18px",
        borderRadius: 100,
        border: "none",
        background: disabled ? "var(--card-hover)" : bg,
        color: disabled ? "var(--text-muted)" : "#fff",
        fontSize: 14.5,
        fontWeight: 700,
        fontFamily: "inherit",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        letterSpacing: "-0.01em",
      }}
    >
      {loading ? <Loader2 size={16} className="vc-spin" /> : null}
      {children}
    </motion.button>
  );
}

/** One posted job and its applicant tally. Read-only by design: this tab answers
 *  "did the post work", nothing more. Reviewing who applied stays on the web
 *  dashboard, so the row is not a control and must not look like one. */
function JobCountRow({ title, count }: { title: string; count: number }) {
  const hasApplicants = count > 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        minHeight: 56,
        padding: "12px 14px",
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--card)",
        color: "var(--text-primary)",
        boxSizing: "border-box",
      }}
    >
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 14.5,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </span>
      <span
        style={{
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "4px 10px",
          borderRadius: 100,
          background: hasApplicants ? "var(--brand-subtle)" : "var(--card-hover)",
          color: hasApplicants ? "var(--brand-dim)" : "var(--text-muted)",
          fontSize: 12.5,
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <Users size={12} />
        {count}
      </span>
    </div>
  );
}

const SCREEN_STYLES = `
  @keyframes dash-spin { to { transform: rotate(360deg); } }
  .vc-spin { animation: dash-spin 0.9s linear infinite; }
  @media (prefers-reduced-motion: reduce) { .vc-spin { animation-duration: 2.4s; } }
`;

// ── Screen ───────────────────────────────────────────────────────────────────

/**
 * The employer's job-posting console inside the Mini App.
 *
 * Scope is deliberately narrow — post a saved template, write a new vacancy, or
 * see how many applicants each posted job pulled in — because an employer
 * opening Telegram mid-shift is trying to get one role live or check whether it
 * worked, not administer an account. Everything else (billing, analytics,
 * building the template library) stays on the web dashboard.
 *
 * The Applicants tab is a tally, not a second inbox: one row per job with its
 * count, searchable by title, and nothing to tap. Reviewing who applied is a
 * web-dashboard job, so the rows are plain readouts rather than controls that
 * would imply a drill-down this screen does not offer.
 *
 * The signature of the screen is the publishing rail under the title: every
 * posting control states its actual outcome ("Post it live" vs "Send for
 * review"), because on a moderated marketplace with per-plan posting rights,
 * "Post" alone is a promise the app can't always keep.
 *
 * Rules are enforced server-side in the `validate-telegram-auth` edge function
 * via `_shared/vacancy.ts` — subscription validity, daily post limit, deadline
 * defaulting and clamping to the plan end date, and auto_publish deciding
 * active vs pending. What the rail shows is an explanation of those rules, not
 * the enforcement of them.
 */
export default function DashboardScreen({ onJobSelect }: { onJobSelect?: (jobId: string, jobTitle: string) => void }) {
  // Reviewing applicants is a web-dashboard job; this screen only ever counts.
  void onJobSelect;

  const { initData } = useTelegram();
  const reduceMotion = useReducedMotion();

  const [data, setData] = useState<EmployerPostingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [tab, setTab] = useState<"templates" | "new" | "applicants">("templates");

  // Applicant tallies load only when the tab is first opened — posting is the
  // reason this screen exists, and counting applications is a per-job query on
  // the server that shouldn't sit in front of it.
  const [jobs, setJobs] = useState<EmployerJobRow[] | null>(null);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [jobSearch, setJobSearch] = useState("");

  // The from-scratch draft lives at screen level so switching to Templates and
  // back doesn't silently discard a half-written job.
  const [draft, setDraft] = useState<VacancyFormState>(() => emptyVacancyForm());
  const [draftErrors, setDraftErrors] = useState<VacancyFormErrors>({});

  const [editing, setEditing] = useState<{ templateId: string; title: string; form: VacancyFormState } | null>(null);
  const [editErrors, setEditErrors] = useState<VacancyFormErrors>({});
  const [savingEdit, setSavingEdit] = useState(false);

  const [confirmPost, setConfirmPost] = useState<{ templateId: string; title: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [result, setResult] = useState<{ kind: "active" | "pending" | "saved"; title: string; deadline?: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!initData) {
      // Browser dev mode has no Telegram session to authenticate with.
      setLoading(false);
      setLoadError("Open this from Telegram to manage your vacancies.");
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetchEmployerPostingData(initData);
      setData(res);
    } catch (err: any) {
      setLoadError(err?.message || "Couldn't load your dashboard. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [initData]);

  const loadJobs = useCallback(async () => {
    if (!initData) return;
    setJobsLoading(true);
    setJobsError(null);
    try {
      const res = await fetchEmployerDashboard(initData);
      setJobs(res.jobs ?? []);
    } catch (err: any) {
      setJobsError(err?.message || "Couldn't load your applicant counts. Try again.");
    } finally {
      setJobsLoading(false);
    }
  }, [initData]);

  useEffect(() => {
    load();
  }, [load]);

  // Fetch once, on first visit to the tab. A failure stops the retry here so a
  // broken connection doesn't spin — the error state offers "Try again".
  useEffect(() => {
    if (tab !== "applicants" || jobs !== null || jobsLoading || jobsError) return;
    loadJobs();
  }, [tab, jobs, jobsLoading, jobsError, loadJobs]);

  const visibleJobs = useMemo(() => {
    const query = jobSearch.trim().toLowerCase();
    const rows = jobs ?? [];
    if (!query) return rows;
    return rows.filter((job) => (job.title ?? "").toLowerCase().includes(query));
  }, [jobs, jobSearch]);

  const rules = data?.rules;
  const templates = data?.templates ?? [];
  const businessName = data?.employer.business_name ?? "";

  const limitReached = !!rules && rules.dailyPostLimit !== -1 && rules.postedToday >= rules.dailyPostLimit;
  const canPost = !!rules && !rules.isExpired && !limitReached;
  const postTone = rules?.autoPublish ? "brand" : "review";
  // Every posting control names its own outcome. When posting is off, the
  // button says why rather than offering an action that would be refused.
  const postLabel = rules?.isExpired
    ? "Posting paused"
    : limitReached
    ? "Daily limit reached"
    : rules?.autoPublish
    ? "Post it live"
    : "Send for review";

  const remainingLabel = useMemo(() => {
    if (!rules) return "";
    if (rules.dailyPostLimit === -1) return "Unlimited posts";
    const left = Math.max(0, rules.dailyPostLimit - rules.postedToday);
    return `${left} of ${rules.dailyPostLimit} left today`;
  }, [rules]);

  // Clear a result banner on its own rather than leaving it stacked above the
  // next action the employer takes.
  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => setResult(null), 9000);
    return () => clearTimeout(timer);
  }, [result]);

  // Telegram's own back button closes the edit sheet. Without this it would
  // close the whole Mini App from what looks, to the user, like a sub-page.
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg?.BackButton || !editing) return;
    const handleBack = () => setEditing(null);
    tg.BackButton.show();
    tg.BackButton.onClick(handleBack);
    return () => {
      tg.BackButton.offClick(handleBack);
      tg.BackButton.hide();
    };
  }, [editing]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const runTemplatePost = async () => {
    if (!confirmPost || !initData) return;
    const { templateId, title } = confirmPost;
    setConfirmPost(null);
    setBusyId(templateId);
    setActionError(null);
    try {
      const res = await postJobFromTemplate(initData, templateId);
      setResult({ kind: res.status, title, deadline: res.deadline });
      await load();
    } catch (err: any) {
      setActionError(err?.message || "Couldn't post this job. Try again.");
    } finally {
      setBusyId(null);
    }
  };

  const submitDraft = async () => {
    if (!initData) return;
    const errors = validateVacancyForm(draft, { maxDeadline: rules?.packageExpiresAt ?? null });
    setDraftErrors(errors || {});
    if (errors) return;

    setBusyId("new");
    setActionError(null);
    try {
      const res = await createEmployerJobPost(initData, draft as unknown as Record<string, unknown>);
      setResult({ kind: res.status, title: draft.title, deadline: res.deadline });
      setDraft(emptyVacancyForm());
      setTab("templates");
      await load();
    } catch (err: any) {
      setActionError(err?.message || "Couldn't post this job. Try again.");
    } finally {
      setBusyId(null);
    }
  };

  const saveEdit = async () => {
    if (!editing || !initData) return;
    const errors = validateVacancyForm(editing.form, { maxDeadline: rules?.packageExpiresAt ?? null });
    setEditErrors(errors || {});
    if (errors) return;

    setSavingEdit(true);
    setActionError(null);
    try {
      await updateEmployerTemplate(initData, editing.templateId, editing.form as unknown as Record<string, unknown>);
      setResult({ kind: "saved", title: editing.form.title });
      setEditing(null);
      await load();
    } catch (err: any) {
      setActionError(err?.message || "Couldn't save this template. Try again.");
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const fade = reduceMotion ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };

  return (
    <LazyMotion features={domAnimation}>
      <style>{SCREEN_STYLES}</style>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100dvh",
          background: "transparent",
          overflowY: "auto",
          // Clears the bottom nav plus the floating post button on the New tab.
          paddingBottom: tab === "new" ? 150 : 100,
        }}
        className="scroll-smooth"
      >
        {/* ── Header ── */}
        <div className="safe-screen-top" style={{ padding: "0 20px 16px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <EmployerAvatar name={businessName || "?"} logoUrl={data?.employer.logo_url} size={34} radius={10} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-secondary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {businessName || "Your business"}
            </span>
            <button
              onClick={() => {
                load();
                if (tab === "applicants") loadJobs();
              }}
              aria-label="Refresh"
              style={{
                marginLeft: "auto",
                width: 36,
                height: 36,
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <RefreshCw size={15} className={loading || jobsLoading ? "vc-spin" : undefined} />
            </button>
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.03em", margin: 0, lineHeight: 1.15 }}>
            {tab === "applicants" ? "Applicants" : "Post a vacancy"}
          </h1>

          {/* ── Publishing rail — what will actually happen when you post ──
              Hidden on Applicants: nothing there posts, so posting rights are
              not what the employer came to read. */}
          {rules && tab !== "applicants" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "6px 14px",
                marginTop: 12,
                padding: "11px 14px",
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 14,
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700, color: "var(--text-primary)" }}>
                <span
                  aria-hidden
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: rules.isExpired ? "var(--error)" : rules.autoPublish ? "var(--brand)" : "var(--warning)",
                    flexShrink: 0,
                  }}
                />
                {/* An expired plan overrides the publishing mode: nothing goes
                    live either way, so promising that it would would be a lie. */}
                {rules.isExpired ? "Posting paused" : rules.autoPublish ? "Goes live instantly" : "Reviewed before going live"}
              </span>
              {!rules.isExpired && (
                <span style={{ fontSize: 12.5, color: "var(--text-secondary)", fontWeight: 600 }}>{remainingLabel}</span>
              )}
              <span style={{ fontSize: 12.5, color: "var(--text-secondary)", fontWeight: 600 }}>
                {rules.isExpired ? "Plan expired" : `Plan ends ${shortDate(rules.packageExpiresAt)}`}
              </span>
            </div>
          )}
        </div>

        {/* ── Banners ── */}
        <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          <AnimatePresence>
            {result && (
              <motion.div
                key="result"
                {...fade}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "13px 14px",
                  borderRadius: 14,
                  background: result.kind === "pending" ? "rgba(245,158,11,0.10)" : "var(--brand-subtle)",
                  border: `1px solid ${result.kind === "pending" ? "rgba(245,158,11,0.28)" : "var(--border-active)"}`,
                }}
              >
                <CheckCircle2
                  size={18}
                  color={result.kind === "pending" ? "var(--warning)" : "var(--brand)"}
                  style={{ flexShrink: 0, marginTop: 1 }}
                />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                    {result.kind === "active" && `${result.title} is live`}
                    {result.kind === "pending" && `${result.title} sent for review`}
                    {result.kind === "saved" && `${result.title} saved`}
                  </p>
                  <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: "3px 0 0", lineHeight: 1.5 }}>
                    {result.kind === "active" &&
                      `Job seekers can see it and start applying${result.deadline ? `. Applications close ${shortDate(result.deadline)}` : ""}.`}
                    {result.kind === "pending" &&
                      `An admin approves it before seekers see it${result.deadline ? `. Applications close ${shortDate(result.deadline)}` : ""}.`}
                    {result.kind === "saved" && "Your template is updated. Post it whenever you're ready."}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {actionError && (
            <div
              style={{
                display: "flex",
                gap: 10,
                padding: "13px 14px",
                borderRadius: 14,
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.24)",
              }}
            >
              <AlertCircle size={18} color="var(--error)" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: "var(--text-primary)", margin: 0, lineHeight: 1.5 }}>{actionError}</p>
            </div>
          )}

          {rules?.isExpired && tab !== "applicants" && (
            <div
              style={{
                display: "flex",
                gap: 10,
                padding: "13px 14px",
                borderRadius: 14,
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.24)",
              }}
            >
              <AlertCircle size={18} color="var(--error)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Your plan has expired</p>
                <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: "3px 0 0", lineHeight: 1.5 }}>
                  Renew from the employer web dashboard to start posting again. You can still edit your templates here.
                </p>
              </div>
            </div>
          )}

          {!rules?.isExpired && limitReached && tab !== "applicants" && (
            <div
              style={{
                display: "flex",
                gap: 10,
                padding: "13px 14px",
                borderRadius: 14,
                background: "rgba(245,158,11,0.10)",
                border: "1px solid rgba(245,158,11,0.28)",
              }}
            >
              <CalendarClock size={18} color="var(--warning)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  That&apos;s today&apos;s {rules?.dailyPostLimit} posts used
                </p>
                <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: "3px 0 0", lineHeight: 1.5 }}>
                  Your allowance resets at midnight. Edits and template changes still work.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div style={{ padding: "16px 20px 0", flexShrink: 0 }}>
          <div
            role="tablist"
            aria-label="Dashboard sections"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, padding: 4, background: "var(--card-hover)", borderRadius: 14 }}
          >
            {([
              { id: "templates", label: "Templates" },
              { id: "new", label: "New job" },
              { id: "applicants", label: "Applicants" },
            ] as const).map((item) => {
              const isActive = tab === item.id;
              return (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setTab(item.id)}
                  style={{
                    minHeight: 44,
                    borderRadius: 11,
                    border: "none",
                    background: isActive ? "var(--surface)" : "transparent",
                    boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.10)" : "none",
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                    // Three-up: 13.5 keeps every label on one line at 320px.
                    fontSize: 13.5,
                    fontWeight: isActive ? 800 : 600,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    letterSpacing: "-0.01em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ padding: "16px 20px 0", flex: 1 }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="shimmer" style={{ height: 148, borderRadius: 16, border: "1px solid var(--border)" }} />
              ))}
            </div>
          ) : loadError ? (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <AlertCircle size={30} color="var(--text-muted)" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.55, margin: "0 0 18px" }}>{loadError}</p>
              <button
                onClick={load}
                style={{
                  minHeight: 44,
                  padding: "11px 22px",
                  borderRadius: 100,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text-primary)",
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
            </div>
          ) : tab === "applicants" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Search the jobs, not the applicants — same move as the job
                  filter on the web applicant tracker, minus the drill-down. */}
              <div style={{ position: "relative" }}>
                <Search
                  size={15}
                  color="var(--text-muted)"
                  style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                />
                <input
                  type="search"
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                  placeholder="Search your jobs…"
                  aria-label="Search your jobs"
                  style={{
                    width: "100%",
                    minHeight: 44,
                    padding: "11px 14px 11px 36px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text-primary)",
                    fontSize: 14,
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                />
              </div>

              {jobsLoading ? (
                [0, 1, 2, 3].map((i) => (
                  <div key={i} className="shimmer" style={{ height: 56, borderRadius: 14, border: "1px solid var(--border)" }} />
                ))
              ) : jobsError ? (
                <div style={{ textAlign: "center", padding: "36px 20px" }}>
                  <AlertCircle size={26} color="var(--text-muted)" style={{ marginBottom: 10 }} />
                  <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.55, margin: "0 0 16px" }}>{jobsError}</p>
                  <button
                    onClick={loadJobs}
                    style={{
                      minHeight: 44,
                      padding: "11px 22px",
                      borderRadius: 100,
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      color: "var(--text-primary)",
                      fontSize: 14,
                      fontWeight: 700,
                      fontFamily: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    Try again
                  </button>
                </div>
              ) : visibleJobs.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "36px 22px",
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                  }}
                >
                  <p style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
                    {jobs && jobs.length > 0 ? "No jobs match that search" : "No jobs posted yet"}
                  </p>
                  <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                    {jobs && jobs.length > 0
                      ? "Try a different word from the job title."
                      : "Post a vacancy and your applicant count shows up here."}
                  </p>
                </div>
              ) : (
                visibleJobs.map((job) => (
                  <JobCountRow
                    key={job.id}
                    title={job.title || "Untitled job"}
                    count={Number(job.application_count ?? 0)}
                  />
                ))
              )}
            </div>
          ) : tab === "templates" ? (
            templates.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 22px",
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                }}
              >
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 16,
                    background: "var(--brand-subtle)",
                    color: "var(--brand-dim)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  <FileStack size={24} strokeWidth={1.8} />
                </div>
                <h3 style={{ fontSize: 16.5, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
                  No templates saved yet
                </h3>
                <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 20px" }}>
                  Build your reusable roles on the employer web dashboard. They show up here, ready to post in one tap.
                </p>
                <button
                  onClick={() => setTab("new")}
                  style={{
                    minHeight: 44,
                    padding: "12px 22px",
                    borderRadius: 100,
                    border: "none",
                    background: "var(--brand)",
                    color: "#fff",
                    fontSize: 14.5,
                    fontWeight: 700,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                  }}
                >
                  Write one now <ChevronRight size={16} />
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {templates.map((tpl, i) => (
                  <motion.div
                    key={tpl.id}
                    initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
                    animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.2) }}
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 16,
                      boxShadow: "var(--card-shadow)",
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: 10.5,
                            fontWeight: 800,
                            letterSpacing: "0.07em",
                            textTransform: "uppercase",
                            color: "var(--brand-dim)",
                            margin: "0 0 4px",
                          }}
                        >
                          {tpl.job_category || "Template"}
                        </p>
                        <h3
                          style={{
                            fontSize: 17,
                            fontWeight: 800,
                            color: "var(--text-primary)",
                            letterSpacing: "-0.02em",
                            margin: 0,
                            lineHeight: 1.25,
                          }}
                        >
                          {tpl.title}
                        </h3>
                      </div>
                      <button
                        onClick={() => {
                          setEditErrors({});
                          setEditing({ templateId: tpl.id, title: tpl.title, form: templateRowToForm(tpl) });
                        }}
                        aria-label={`Edit ${tpl.title}`}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          border: "1px solid var(--border)",
                          background: "var(--surface)",
                          color: "var(--text-secondary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                    </div>

                    {tpl.description_template && (
                      <p
                        style={{
                          fontSize: 13,
                          color: "var(--text-secondary)",
                          lineHeight: 1.55,
                          margin: 0,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {tpl.description_template}
                      </p>
                    )}

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      <Chip>{salaryChip(tpl)}</Chip>
                      <Chip icon={<Briefcase size={11} />}>{tpl.employment_type || "Full Time"}</Chip>
                      {tpl.location && <Chip icon={<MapPin size={11} />}>{tpl.location}</Chip>}
                      {tpl.quantity > 1 && <Chip icon={<Users size={11} />}>{tpl.quantity} openings</Chip>}
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <PrimaryButton
                        tone={postTone}
                        disabled={!canPost}
                        loading={busyId === tpl.id}
                        onClick={() => setConfirmPost({ templateId: tpl.id, title: tpl.title })}
                      >
                        {busyId === tpl.id ? "Posting…" : (<><Send size={15} /> {postLabel}</>)}
                      </PrimaryButton>
                    </div>
                  </motion.div>
                ))}
              </div>
            )
          ) : (
            <VacancyComposer
              value={draft}
              onChange={setDraft}
              errors={draftErrors}
              maxDeadline={rules?.packageExpiresAt ?? null}
            />
          )}
        </div>
      </div>

      {/* ── Floating post action for the New vacancy tab ── */}
      <AnimatePresence>
        {tab === "new" && !loading && !loadError && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: "calc(env(safe-area-inset-bottom, 8px) + 74px)",
              zIndex: 60,
              maxWidth: 480,
              margin: "0 auto",
              padding: "0 20px",
              pointerEvents: "none",
            }}
          >
            <div style={{ display: "flex", pointerEvents: "auto", filter: "drop-shadow(0 10px 24px rgba(0,0,0,0.22))" }}>
              <PrimaryButton tone={postTone} disabled={!canPost} loading={busyId === "new"} onClick={submitDraft}>
                {busyId === "new" ? "Posting…" : (<><Send size={16} /> {postLabel}</>)}
              </PrimaryButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Confirm a template post ── */}
      <AnimatePresence>
        {confirmPost && (
          <div style={{ position: "fixed", inset: 0, zIndex: 2000 }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setConfirmPost(null)}
              style={{ position: "absolute", inset: 0, background: "rgba(9,12,20,0.55)", backdropFilter: "blur(2px)" }}
            />
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { y: "100%" }}
              animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { y: "100%" }}
              transition={reduceMotion ? { duration: 0.15 } : { type: "spring", stiffness: 420, damping: 38 }}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                maxWidth: 480,
                margin: "0 auto",
                background: "var(--surface-elevated)",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                borderTop: "1px solid var(--border)",
                padding: "10px 20px calc(env(safe-area-inset-bottom, 12px) + 20px)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <div style={{ width: 38, height: 4, borderRadius: 100, background: "var(--border)" }} />
              </div>
              <h3 style={{ fontSize: 19, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", margin: "0 0 8px" }}>
                {rules?.autoPublish ? "Post this live?" : "Send this for review?"}
              </h3>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 6px" }}>
                <strong style={{ color: "var(--text-primary)" }}>{confirmPost.title}</strong>{" "}
                {rules?.autoPublish
                  ? "goes out to job seekers straight away, exactly as saved."
                  : "goes to an admin for approval, then out to job seekers once it's cleared."}
              </p>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 20px" }}>
                It counts as one of today&apos;s posts. Applications close 30 days from today unless your template sets a
                nearer date{rules?.packageExpiresAt ? `, and never past ${shortDate(rules.packageExpiresAt)} when your plan ends` : ""}.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setConfirmPost(null)}
                  style={{
                    flex: 1,
                    minHeight: 48,
                    borderRadius: 100,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text-primary)",
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                >
                  Not yet
                </button>
                <PrimaryButton tone={postTone} onClick={runTemplatePost}>
                  <Send size={16} /> {postLabel}
                </PrimaryButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Edit template (full screen) ── */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { x: "100%" }}
            animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { x: "100%" }}
            transition={reduceMotion ? { duration: 0.15 } : { type: "spring", stiffness: 330, damping: 34 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1500,
              background: "var(--app-bg)",
              display: "flex",
              flexDirection: "column",
              maxWidth: 480,
              margin: "0 auto",
            }}
          >
            <div
              className="safe-screen-top"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "0 20px 14px",
                background: "var(--app-bg)",
                borderBottom: "1px solid var(--border)",
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => setEditing(null)}
                aria-label="Close without saving"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <ArrowLeft size={19} />
              </button>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--brand-dim)", margin: 0 }}>
                  Editing template
                </p>
                <h2
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    color: "var(--text-primary)",
                    letterSpacing: "-0.02em",
                    margin: "2px 0 0",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {editing.title}
                </h2>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px 24px" }} className="scroll-smooth">
              <VacancyComposer
                value={editing.form}
                onChange={(form) => setEditing({ ...editing, form })}
                errors={editErrors}
                maxDeadline={rules?.packageExpiresAt ?? null}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                padding: "12px 20px calc(env(safe-area-inset-bottom, 12px) + 12px)",
                borderTop: "1px solid var(--border)",
                background: "var(--surface-elevated)",
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => setEditing(null)}
                style={{
                  flex: "0 0 auto",
                  minHeight: 48,
                  padding: "0 22px",
                  borderRadius: 100,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text-primary)",
                  fontSize: 15,
                  fontWeight: 700,
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <PrimaryButton onClick={saveEdit} loading={savingEdit}>
                {savingEdit ? "Saving…" : "Save template"}
              </PrimaryButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}
