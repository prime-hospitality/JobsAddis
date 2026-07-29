"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, LazyMotion, domAnimation } from "framer-motion";
import { Search, X, MapPin, Clock, ChevronDown, CheckCircle, ChevronLeft, ChevronRight, Users, Briefcase, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Job, JobCategory, JOB_CATEGORIES } from "@/data/jobs";
import { DEPARTMENTS_WITH_ROLES, ROLES_BY_DEPARTMENT } from "@/data/job-categories";
import { SupabaseJob, mapSupabaseJobToJob, type SeekerYears } from "@/hooks/useJobs";
import { useBusinessTypes } from "@/hooks/useBusinessTypes";
import EmployerAvatar from "@/components/EmployerAvatar";
import { useT } from "@/lib/i18n";
import {
  EXPERIENCE_BANDS,
  bandById,
  type ExperienceBand,
  DATE_OPTIONS,
  DATE_LABELS,
  DEPARTMENT_LABELS,
  categoryLabel,
  categoryMatches,
  businessTypeLabel,
  businessTypeMatches,
} from "@/lib/vocabulary";

interface SearchScreenProps {
  onJobSelect: (job: Job) => void;
  /** Signed-in seeker's role -> years. Drives the advisory experience badge. */
  seekerYears?: SeekerYears;
  pageSize?: number;
  enableAnimations?: boolean;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}


// Department groupings come from the role taxonomy itself. They used to be a
// hand-maintained map here whose "Unassigned" bucket was filtered out of the
// drill-down, quietly making nine roles — Manager, Security, Driver and others
// — reachable only by typing their name into the modal's search box.
const TEAM_NAMES = DEPARTMENTS_WITH_ROLES;

/**
 * PostgREST parses `or=(...)` as a comma-delimited logic tree, so an unescaped
 * comma, parenthesis or backslash in the keyword makes the whole request 400
 * rather than returning no rows. Wrapping the value in double quotes lets
 * PostgREST treat it as one literal; `%` stays unescaped so it keeps acting as
 * the ilike wildcard we wrap the term in.
 */
function quoteForOrFilter(term: string): string {
  return `"${term.replace(/["\\]/g, (ch) => `\\${ch}`)}"`;
}

/** Used when the device tier hasn't reported a page size. */
const DEFAULT_PAGE_SIZE = 20;

/** Only well-formed uuids get interpolated into the `in(...)` list below. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Ids of employers whose business name matches the keyword.
 *
 * The search box promises to match hotel names, but PostgREST cannot put a
 * condition on an embedded table inside a top-level `or(...)`, so
 * `employers.business_name.ilike.*` is a parse error. Resolving the ids first
 * and folding them back in as `employer_id.in.(...)` gets the same result for
 * one extra round trip and no schema change.
 */
async function matchingEmployerIds(term: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("employers")
    .select("id")
    .ilike("business_name", `%${term}%`)
    .limit(100);

  if (error) {
    // Non-fatal: fall back to title/description/neighborhood matching only.
    console.error("Employer name lookup failed:", error);
    return [];
  }
  return (data ?? []).map((e) => e.id).filter((id): id is string => UUID_RE.test(id));
}

// Helper Modal Component
function FilterModal({ 
  isOpen, 
  onClose, 
  title, 
  children,
  onUpdate
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  children: React.ReactNode;
  onUpdate: () => void;
}) {
  const t = useT();
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "flex-end",
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            style={{
              width: "100%",
              height: "85dvh",
              background: "var(--app-bg)",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 -8px 32px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: "20px 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>{title}</h3>
              <button 
                onClick={onClose}
                style={{ background: "transparent", border: "none", fontSize: 24, color: "var(--text-muted)", cursor: "pointer", padding: 0, lineHeight: 1 }}
              >
                &times;
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: "auto", background: "var(--surface)" }}>
              {children}
            </div>

            {/* Footer / Update Button */}
            <div style={{ padding: "16px 20px 32px", borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  onUpdate();
                  onClose();
                }}
                className="btn-primary"
                style={{ width: "100%" }}
              >
                {t("search.updateResults")}
              </motion.button>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Business Type Modal
function TypeModal({
  isOpen, onClose, options, isLoading, selected, onChange
}: {
  isOpen: boolean; onClose: () => void; options: string[]; isLoading: boolean;
  selected: string[]; onChange: (types: string[]) => void;
}) {
  const t = useT();
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) setSearch("");
  }, [isOpen]);

  const toggle = (type: string) => {
    if (selected.includes(type)) onChange(selected.filter(x => x !== type));
    else onChange([...selected, type]);
  };

  const filtered = options.filter(o => businessTypeMatches(o, search));
  // The search field only earns its space once the list outgrows a glance.
  const showSearch = options.length > 8;

  return (
    <FilterModal isOpen={isOpen} onClose={onClose} title={t("search.selectType")} onUpdate={() => {}}>
      <div style={{ padding: "16px 20px" }}>

        {showSearch && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 14px", marginBottom: 16 }}>
            <Search size={17} color="var(--text-muted)" />
            <input
              placeholder={t("search.searchAllTypes")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: "none", outline: "none", width: "100%", fontSize: 15, background: "transparent", color: "var(--text-primary)" }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 0 }}>
                <X size={15} color="var(--text-muted)" />
              </button>
            )}
          </div>
        )}

        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3].map(i => <div key={i} className="shimmer" style={{ height: 56, borderRadius: 12 }} />)}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px 0" }}>{t("search.noTypesFound")}</p>
        )}

        {!isLoading && filtered.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(type => {
              const isSelected = selected.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggle(type)}
                  style={{
                    width: "100%", padding: "14px 14px", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                    background: isSelected ? "var(--brand-subtle)" : "var(--surface-elevated)",
                    border: isSelected ? "1px solid var(--brand)" : "1px solid var(--border)",
                    borderRadius: 12, cursor: "pointer",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <Building2 size={18} color={isSelected ? "var(--brand)" : "var(--text-muted)"} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 15, fontWeight: isSelected ? 700 : 500, color: isSelected ? "var(--brand)" : "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {businessTypeLabel(type, t.lang)}
                    </span>
                  </span>
                  <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 6, border: isSelected ? "none" : "2px solid var(--text-muted)", background: isSelected ? "var(--brand)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {isSelected && <CheckCircle size={14} color="white" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}

      </div>
    </FilterModal>
  );
}

// Category Modal
function CategoryModal({
  isOpen, onClose, selected, onChange 
}: { 
  isOpen: boolean; onClose: () => void; selected: string[]; onChange: (cats: string[]) => void;
}) {
  const t = useT();
  const [search, setSearch] = useState("");
  const [activeTeam, setActiveTeam] = useState<string | null>(null);

  // Reset drill-down state when modal closes
  useEffect(() => {
    if (!isOpen) { setSearch(""); setActiveTeam(null); }
  }, [isOpen]);

  const toggle = (cat: string) => {
    if (selected.includes(cat)) onChange(selected.filter(c => c !== cat));
    else onChange([...selected, cat]);
  };

  // When searching, flat-list ALL categories across every team
  const isSearching = search.trim().length > 0;
  const allCats = JOB_CATEGORIES;
  const searchFiltered = allCats.filter(c => categoryMatches(c, search));

  // Categories for the drilled-in team
  const teamCats = activeTeam ? (ROLES_BY_DEPARTMENT[activeTeam] ?? []) : [];

  const CatGrid = ({ cats }: { cats: string[] }) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {cats.map(cat => {
        const isSelected = selected.includes(cat);
        return (
          <button
            key={cat}
            onClick={() => toggle(cat)}
            style={{
              width: "100%", padding: "13px 12px", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between",
              background: isSelected ? "var(--brand-subtle)" : "var(--surface-elevated)",
              border: isSelected ? "1px solid var(--brand)" : "1px solid var(--border)",
              borderRadius: 12, cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: isSelected ? "var(--brand)" : "var(--text-primary)", lineHeight: 1.3 }}>
              {categoryLabel(cat, t.lang)}
            </span>
            <div style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 6, border: isSelected ? "none" : "2px solid var(--text-muted)", background: isSelected ? "var(--brand)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {isSelected && <CheckCircle size={13} color="white" />}
            </div>
          </button>
        );
      })}
      {cats.length === 0 && <p style={{ gridColumn: "1 / -1", textAlign: "center", color: "var(--text-muted)", padding: "24px 0" }}>{t("search.noRolesInTeam")}</p>}
    </div>
  );

  const teamLabel = (team: string) => (DEPARTMENT_LABELS[team] ? t(DEPARTMENT_LABELS[team]) : team);
  const modalTitle = activeTeam && !isSearching ? teamLabel(activeTeam) : t("search.selectCategory");

  return (
    <FilterModal isOpen={isOpen} onClose={onClose} title={modalTitle} onUpdate={() => {}}>
      <div style={{ padding: "16px 20px" }}>

        {/* Search bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 14px", marginBottom: 16 }}>
          <Search size={17} color="var(--text-muted)" />
          <input
            placeholder={t("search.searchAllCategories")}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setActiveTeam(null); }}
            style={{ border: "none", outline: "none", width: "100%", fontSize: 15, background: "transparent", color: "var(--text-primary)" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 0 }}>
              <X size={15} color="var(--text-muted)" />
            </button>
          )}
        </div>

        {/* Search results */}
        {isSearching && (
          searchFiltered.length > 0
            ? <CatGrid cats={searchFiltered} />
            : <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px 0" }}>{t("search.noCategoriesFound")}</p>
        )}

        {/* Team drill-down: team list */}
        {!isSearching && !activeTeam && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {TEAM_NAMES.map(team => {
              const cats = ROLES_BY_DEPARTMENT[team] ?? [];
              const activeCount = cats.filter(c => selected.includes(c)).length;
              return (
                <button
                  key={team}
                  onClick={() => setActiveTeam(team)}
                  style={{
                    width: "100%", padding: "15px 4px", display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: "transparent", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: activeCount > 0 ? "var(--brand-subtle)" : "var(--surface-elevated)", border: `1px solid ${activeCount > 0 ? "var(--brand)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Users size={17} color={activeCount > 0 ? "var(--brand)" : "var(--text-muted)"} />
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: activeCount > 0 ? "var(--brand)" : "var(--text-primary)", margin: 0 }}>{teamLabel(team)}</p>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                        {t(cats.length === 1 ? "search.roleCount" : "search.roleCountPlural", { count: cats.length })}
                        {activeCount > 0 ? t("search.selectedSuffix", { count: activeCount }) : ""}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} color="var(--text-muted)" />
                </button>
              );
            })}
          </div>
        )}

        {/* Team drill-down: category list */}
        {!isSearching && activeTeam && (
          <>
            <button
              onClick={() => setActiveTeam(null)}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: "0 0 14px 0", color: "var(--brand)", fontWeight: 600, fontSize: 14 }}
            >
              <ChevronLeft size={16} /> {t("search.backToMainCategory")}
            </button>
            <CatGrid cats={teamCats} />
          </>
        )}

      </div>
    </FilterModal>
  );
}

// Experience Modal
function ExperienceModal({ 
  isOpen, onClose, selected, onChange 
}: { 
  isOpen: boolean; onClose: () => void; selected: string[]; onChange: (exp: string[]) => void;
}) {
  const t = useT();
  /** `selected` holds band ids ("1-2", "6+"), not labels — the numeric ranges
   *  live on EXPERIENCE_BANDS, so translating a label can't break the query. */
  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter(e => e !== id));
    else onChange([...selected, id]);
  };

  return (
    <FilterModal isOpen={isOpen} onClose={onClose} title={t("search.experienceChip")} onUpdate={() => {}}>
      <div style={{ padding: "8px 20px" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {EXPERIENCE_BANDS.map(band => {
            const isSelected = selected.includes(band.id);
            return (
              <button
                key={band.id}
                onClick={() => toggle(band.id)}
                style={{
                  width: "100%", padding: "16px 0", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "transparent", borderTop: "none", borderRight: "none", borderLeft: "none",
                  borderBottom: "1px solid var(--border)", cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 16, fontWeight: isSelected ? 700 : 500, color: isSelected ? "var(--brand)" : "var(--text-primary)" }}>
                  {t(band.labelKey)}
                </span>
                <div style={{ width: 24, height: 24, borderRadius: 6, border: isSelected ? "none" : "2px solid var(--text-muted)", background: isSelected ? "var(--brand)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isSelected && <CheckCircle size={16} color="white" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </FilterModal>
  );
}

// Date Modal
function DateModal({ 
  isOpen, onClose, selected, onChange 
}: { 
  isOpen: boolean; onClose: () => void; selected: string; onChange: (date: string) => void;
}) {
  const t = useT();
  return (
    <FilterModal isOpen={isOpen} onClose={onClose} title={t("search.postedWithinChip")} onUpdate={() => {}}>
      <div style={{ padding: "8px 20px" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {DATE_OPTIONS.map(date => {
            const isSelected = selected === date;
            return (
              <button
                key={date}
                onClick={() => onChange(date)}
                style={{
                  width: "100%", padding: "16px 0", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "transparent", borderTop: "none", borderRight: "none", borderLeft: "none",
                  borderBottom: "1px solid var(--border)", cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 16, fontWeight: isSelected ? 700 : 500, color: isSelected ? "var(--brand)" : "var(--text-primary)" }}>
                  {DATE_LABELS[date] ? t(DATE_LABELS[date]) : date}
                </span>
                <div style={{ width: 24, height: 24, borderRadius: 12, border: isSelected ? "none" : "2px solid var(--text-muted)", background: isSelected ? "var(--brand)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isSelected && <div style={{ width: 10, height: 10, borderRadius: 5, background: "white" }} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </FilterModal>
  );
}

export default function SearchScreen({ onJobSelect, seekerYears, pageSize, enableAnimations = true }: SearchScreenProps) {
  const seekerYearsKey = JSON.stringify(seekerYears ?? {});
  const t = useT();
  const [query, setQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<JobCategory[]>([]);
  const [selectedExperience, setSelectedExperience] = useState<string[]>([]);
  const [postedWithin, setPostedWithin] = useState<string>("Any date");
  const [activeModal, setActiveModal] = useState<"type" | "category" | "experience" | "date" | null>(null);
  const { types: businessTypes, isLoading: typesLoading } = useBusinessTypes();
  const [results, setResults] = useState<Job[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Guards against out-of-order responses: only the newest search may write
  // state. Without it a slow page-1 request can land after a newer one and
  // repopulate the list with results for filters the seeker already changed.
  const requestIdRef = useRef(0);

  const debouncedQuery = useDebounce(query, 350);
  const limit = pageSize && pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE;

  useEffect(() => {
    // Autofocus on mount
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const doSearch = useCallback(async (
    kw: string,
    types: string[],
    cats: JobCategory[],
    exp: string[],
    posted: string,
    nextPage = 0
  ) => {
    const trimmed = kw.trim();
    if (!trimmed && types.length === 0 && cats.length === 0 && exp.length === 0 && posted === "Any date") {
      requestIdRef.current += 1; // cancel anything in flight
      setResults([]);
      setTotalCount(null);
      setPage(0);
      setHasSearched(false);
      setError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    const isFirstPage = nextPage === 0;

    if (isFirstPage) setIsLoading(true);
    else setIsLoadingMore(true);
    setError(null);
    setHasSearched(true);

    try {
      const employerIds = trimmed ? await matchingEmployerIds(trimmed) : [];
      if (requestId !== requestIdRef.current) return;

      const from = nextPage * limit;

      // `!inner` rather than a plain embed so `employers.business_type` is
      // filterable. Safe as a default: `jobs.employer_id` is NOT NULL with an
      // FK, so every job has exactly one employer row either way.
      // `count: "exact"` makes the result line honest about how many jobs
      // match rather than how many happened to fit on this page.
      let q = supabase
        .from("jobs")
        .select(`
          id, employer_id, title, category, location, neighborhood,
          job_type, salary_min, salary_max, currency, description,
          full_description, min_years_experience, requirements, deadline, status, created_at,
          last_posted_at, quantity,
          employers!inner ( business_name, business_type, logo_url )
        `, { count: "exact" })
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .range(from, from + limit - 1);

      if (types.length > 0) q = q.in("employers.business_type", types);

      if (cats.length > 0) q = q.in("category", cats);

      // Selected bands become an OR of inclusive numeric ranges over the real
      // `min_years_experience` column. An OR of ranges rather than one min/max
      // span because the bands need not be adjacent — picking "0" and "6+"
      // must not silently drag in everything between them.
      //
      // Filtering here rather than client-side matters: a client-side pass
      // could only ever filter the rows already on this page.
      if (exp.length > 0) {
        const ranges = exp
          .map(bandById)
          .filter((b): b is ExperienceBand => !!b)
          .map((b) => `and(min_years_experience.gte.${b.min},min_years_experience.lte.${b.max})`);
        if (ranges.length > 0) q = q.or(ranges.join(","));
      }

      if (posted !== "Any date") {
        const now = new Date();
        if (posted === "Since yesterday") {
          now.setDate(now.getDate() - 1);
          q = q.gte("created_at", now.toISOString());
        } else if (posted === "Last 7 days") {
          now.setDate(now.getDate() - 7);
          q = q.gte("created_at", now.toISOString());
        } else if (posted === "Last 30 days") {
          now.setDate(now.getDate() - 30);
          q = q.gte("created_at", now.toISOString());
        }
      }

      if (trimmed) {
        const term = quoteForOrFilter(`%${trimmed}%`);
        const conditions = [
          `title.ilike.${term}`,
          `description.ilike.${term}`,
          `neighborhood.ilike.${term}`,
        ];
        if (employerIds.length > 0) conditions.push(`employer_id.in.(${employerIds.join(",")})`);
        q = q.or(conditions.join(","));
      }

      const { data, count, error: fetchError } = await q;
      if (fetchError) throw fetchError;
      if (requestId !== requestIdRef.current) return;

      const mapped = ((data ?? []) as unknown as SupabaseJob[]).map((sj) =>
        mapSupabaseJobToJob(sj, JSON.parse(seekerYearsKey) as SeekerYears)
      );
      setResults((prev) => (isFirstPage ? mapped : [...prev, ...mapped]));
      setTotalCount(count ?? null);
      setPage(nextPage);
    } catch (err) {
      console.error("Search failed:", err);
      if (requestId === requestIdRef.current) setError(t("search.failed"));
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
    // Keyed on contents, not identity: the map is a fresh object on every
    // profile fetch, so depending on the object itself would re-run the search
    // on each render — but a seeker who edits their years must still get
    // badges recomputed rather than served against the old numbers.
  }, [limit, t, seekerYearsKey]);

  useEffect(() => {
    doSearch(debouncedQuery, selectedTypes, selectedCategories, selectedExperience, postedWithin, 0);
  }, [debouncedQuery, selectedTypes, selectedCategories, selectedExperience, postedWithin, doSearch]);

  const hasMore = totalCount !== null && results.length < totalCount;

  const loadMore = () => {
    if (isLoading || isLoadingMore || !hasMore) return;
    doSearch(debouncedQuery, selectedTypes, selectedCategories, selectedExperience, postedWithin, page + 1);
  };

  const clearSearch = () => {
    setQuery("");
    setSelectedTypes([]);
    setSelectedCategories([]);
    setSelectedExperience([]);
    setPostedWithin("Any date");
    setResults([]);
    setTotalCount(null);
    setPage(0);
    setHasSearched(false);
    inputRef.current?.focus();
  };

  const hasActiveFilters =
    selectedTypes.length > 0 ||
    selectedCategories.length > 0 ||
    selectedExperience.length > 0 ||
    postedWithin !== "Any date";

  const formatSalary = (min: number, max: number, currency: string) => {
    if (min === -1) return t("jobDetail.salaryPerScale");
    if (min === -2) return t("jobDetail.salaryNegotiable");
    const fmt = (n: number) =>
      n >= 1000 ? `${(n / 1000).toFixed(0)}k` : `${n}`;
    if (min === max) return `${currency} ${fmt(min)}/mo`;
    return `${currency} ${fmt(min)}–${fmt(max)}/mo`;
  };

  return (
    <LazyMotion features={domAnimation}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100dvh",
          background: "transparent",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {/* Holds the Telegram-header band open, then stays pinned there so the
            title can scroll away underneath it rather than through it. */}
        <div className="safe-top-cover" />

        {/* ── HEADER ── */}
        <div
          style={{
            paddingLeft: 20,
            paddingRight: 20,
            paddingBottom: 12,
            background: "var(--app-bg)",
            flexShrink: 0,
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em", marginBottom: 4 }}>
              {t("search.title")}
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
              {t("search.subtitle")}
            </p>
          </div>
        </div>

        {/* STICKY SEARCH & FILTERS — parks just below the Telegram header, not
            under it, so the field stays tappable however far the list scrolls. */}
        <div style={{ position: "sticky", top: "var(--safe-top)", zIndex: 50, background: "var(--app-bg)", padding: "0 20px 12px" }}>
          {/* Search input */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "var(--surface-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "12px 16px",
              marginBottom: 10,
            }}
          >
            <Search size={18} color="var(--brand)" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search.placeholder")}
              autoComplete="off"
              style={{
                flex: 1,
                background: "none",
                border: "none",
                outline: "none",
                fontSize: 15,
                color: "var(--text-primary)",
                fontFamily: "inherit",
              }}
            />
            {(query || hasActiveFilters) && (
              <motion.button
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                whileTap={{ scale: 0.9 }}
                onClick={clearSearch}
                style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: "var(--surface-elevated)",
                  border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <X size={12} color="var(--text-muted)" />
              </motion.button>
            )}
          </div>

          {/* Filter Chips */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
            {hasActiveFilters && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: "auto" }}
                exit={{ opacity: 0, scale: 0.8, width: 0 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSelectedTypes([]);
                  setSelectedCategories([]);
                  setSelectedExperience([]);
                  setPostedWithin("Any date");
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "8px 12px", borderRadius: 100,
                  fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                  background: "rgba(239, 68, 68, 0.1)", 
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  color: "#EF4444",
                }}
              >
                <X size={14} /> {t("search.clear")}
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveModal("type")}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 100,
                fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                background: selectedTypes.length > 0 ? "var(--brand-subtle)" : "var(--surface-elevated)",
                border: selectedTypes.length > 0 ? "2px solid var(--brand)" : "2px solid #9CA3AF",
                color: selectedTypes.length > 0 ? "var(--brand)" : "var(--text-primary)",
              }}
            >
              {/* One selection reads better as the type itself; past that, a count. */}
              {selectedTypes.length === 1
                ? businessTypeLabel(selectedTypes[0], t.lang)
                : `${t("search.typeChip")}${selectedTypes.length > 1 ? ` (${selectedTypes.length})` : ""}`}
              <ChevronDown size={14} />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveModal("category")}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 100,
                fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                background: selectedCategories.length > 0 ? "var(--brand-subtle)" : "var(--surface-elevated)",
                border: selectedCategories.length > 0 ? "2px solid var(--brand)" : "2px solid #9CA3AF",
                color: selectedCategories.length > 0 ? "var(--brand)" : "var(--text-primary)",
              }}
            >
              {t("search.categoryChip")} {selectedCategories.length > 0 && `(${selectedCategories.length})`}
              <ChevronDown size={14} />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveModal("experience")}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 100,
                fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                background: selectedExperience.length > 0 ? "var(--brand-subtle)" : "var(--surface-elevated)",
                border: selectedExperience.length > 0 ? "2px solid var(--brand)" : "2px solid #9CA3AF",
                color: selectedExperience.length > 0 ? "var(--brand)" : "var(--text-primary)",
              }}
            >
              {t("search.experienceChip")} {selectedExperience.length > 0 && `(${selectedExperience.length})`}
              <ChevronDown size={14} />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveModal("date")}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 100,
                fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                background: postedWithin !== "Any date" ? "var(--brand-subtle)" : "var(--surface-elevated)",
                border: postedWithin !== "Any date" ? "2px solid var(--brand)" : "2px solid #9CA3AF",
                color: postedWithin !== "Any date" ? "var(--brand)" : "var(--text-primary)",
              }}
            >
              {postedWithin === "Any date" ? t("search.postedWithinChip") : (DATE_LABELS[postedWithin] ? t(DATE_LABELS[postedWithin]) : postedWithin)}
              <ChevronDown size={14} />
            </motion.button>
          </div>
        </div>

        {/* ── RESULTS ── */}
        <div
          style={{
            flex: 1,
            padding: "8px 20px 96px",
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
          } as React.CSSProperties}
        >
          {/* Loading skeletons */}
          {isLoading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="shimmer" style={{ height: 110, borderRadius: 16 }} />
              ))}
            </div>
          )}

          {/* Error state */}
          {!isLoading && error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 14, padding: 20, textAlign: "center", marginTop: 20,
              }}
            >
              <p style={{ color: "#FCA5A5", fontSize: 14, marginBottom: 12 }}>{error}</p>
              <button
                onClick={() => doSearch(query, selectedTypes, selectedCategories, selectedExperience, postedWithin, 0)}
                style={{ fontSize: 13, fontWeight: 600, color: "var(--brand)", background: "none", border: "none", cursor: "pointer" }}
              >
                {t("search.tryAgain")}
              </button>
            </motion.div>
          )}

          {/* Idle / prompt state */}
          {!isLoading && !error && !hasSearched && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ textAlign: "center", padding: "60px 20px" }}
            >
              <div
                style={{
                  width: 72, height: 72, borderRadius: 20,
                  background: "rgba(5,150,105,0.06)",
                  border: "1px solid rgba(5,150,105,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 20px", fontSize: 32,
                }}
              >
                🔍
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
                {t("search.idleHeading")}
              </h2>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 260, margin: "0 auto" }}>
                {t("search.idleBody")}
              </p>
            </motion.div>
          )}

          {/* Empty results */}
          {!isLoading && !error && hasSearched && results.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ textAlign: "center", padding: "60px 20px" }}
            >
              <div
                style={{
                  width: 72, height: 72, borderRadius: 20,
                  background: "var(--surface-elevated)",
                  border: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 20px", fontSize: 32,
                }}
              >
                😶
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
                {t("search.emptyHeading")}
              </h2>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 260, margin: "0 auto" }}>
                {t("search.emptyBody")}
              </p>
            </motion.div>
          )}

          {/* Results list */}
          {!isLoading && !error && results.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Result count */}
              <p style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500, paddingTop: 4 }}>
                {/* Counts the whole match set, not just the page on screen. */}
                {totalCount !== null && totalCount > results.length
                  ? t("search.resultCountShowing", { shown: results.length, total: totalCount })
                  : t(results.length === 1 ? "search.resultCount" : "search.resultCountPlural", { count: results.length })}
                {selectedTypes.length > 0 ? ` · ${selectedTypes.map((x) => businessTypeLabel(x, t.lang)).join(", ")}` : ""}
                {selectedCategories.length > 0 ? ` · ${selectedCategories.map((c) => categoryLabel(c, t.lang)).join(", ")}` : ""}
              </p>

              <AnimatePresence>
                {results.map((job, i) => {
                  if (!enableAnimations) {
                    return (
                      <div
                        key={job.id}
                        onClick={() => onJobSelect(job)}
                        style={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 16,
                          padding: 16,
                          cursor: "pointer",
                          marginBottom: 12,
                        }}
                      >
                        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                          {/* Logo */}
                          <EmployerAvatar name={job.businessName} logoUrl={job.logoUrl} size={46} radius={13} />

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {job.title}
                            </p>
                            <p style={{ fontSize: 13, color: "var(--brand)", marginBottom: 8, fontWeight: 600 }}>
                              {job.businessName}
                            </p>

                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                              <span className="badge badge-navy"><Briefcase size={10} /> {job.jobType}</span>
                              <span className="badge badge-navy"><MapPin size={10} /> {job.neighborhood}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: Math.min(i * 0.05, 0.3) }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => onJobSelect(job)}
                      style={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 16,
                        padding: 16,
                        cursor: "pointer",
                        willChange: "transform",
                      }}
                    >
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        {/* Logo */}
                        <EmployerAvatar name={job.businessName} logoUrl={job.logoUrl} size={46} radius={13} />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {job.title}
                          </p>
                          <p style={{ fontSize: 13, color: "var(--brand)", marginBottom: 8, fontWeight: 600 }}>
                            {job.businessName}
                          </p>

                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                            {/* Salary */}
                            <span
                              style={{
                                fontSize: 12, fontWeight: 700,
                                color: "var(--success)",
                                background: "rgba(74,222,128,0.08)",
                                border: "1px solid rgba(74,222,128,0.2)",
                                borderRadius: 100, padding: "3px 9px",
                              }}
                            >
                              {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
                            </span>

                            {/* Location */}
                            <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
                              <MapPin size={10} /> {job.neighborhood}
                            </span>

                            {/* Job type */}
                            <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
                              <Clock size={10} /> {job.jobType}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {hasMore && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  style={{
                    width: "100%", padding: "14px 0", marginTop: 4,
                    borderRadius: 14,
                    background: "var(--surface-elevated)",
                    border: "1px solid var(--border)",
                    color: isLoadingMore ? "var(--text-muted)" : "var(--brand)",
                    fontSize: 14, fontWeight: 700,
                    cursor: isLoadingMore ? "default" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {isLoadingMore ? t("search.loadingMore") : t("search.loadMore")}
                </motion.button>
              )}
            </div>
          )}
        </div>
      </div>
      {/* Modals */}
      <TypeModal
        isOpen={activeModal === "type"}
        onClose={() => setActiveModal(null)}
        options={businessTypes}
        isLoading={typesLoading}
        selected={selectedTypes}
        onChange={setSelectedTypes}
      />
      <CategoryModal
        isOpen={activeModal === "category"} 
        onClose={() => setActiveModal(null)} 
        selected={selectedCategories} 
        onChange={setSelectedCategories} 
      />
      <ExperienceModal 
        isOpen={activeModal === "experience"} 
        onClose={() => setActiveModal(null)} 
        selected={selectedExperience} 
        onChange={setSelectedExperience} 
      />
      <DateModal 
        isOpen={activeModal === "date"} 
        onClose={() => setActiveModal(null)} 
        selected={postedWithin} 
        onChange={setPostedWithin} 
      />

    </LazyMotion>
  );
}
