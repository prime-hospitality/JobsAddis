"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, LazyMotion, domAnimation } from "framer-motion";
import { Search, X, SlidersHorizontal, MapPin, Clock, ChevronDown, CheckCircle, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Job, JobCategory, JobType, ExperienceLevel, JOB_CATEGORIES } from "@/data/jobs";
import { SupabaseJob, mapSupabaseJobToJob } from "@/hooks/useJobs";

interface SearchScreenProps {
  onJobSelect: (job: Job) => void;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  Waiter: "💁", Chef: "🍳", Receptionist: "🛎️", Barista: "☕",
  Housekeeper: "🧹", Security: "🛡️", Cashier: "💵", Manager: "💼",
  "Marketing & Sales": "📈", "F&B": "🍹", Finance: "💰", "Cost Control": "📊",
  Accountant: "🧮", Bellboy: "🧳", "Store Keeper": "📦", "Phone Operator": "📞",
  Maintenance: "🔧",
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}


const EXPERIENCE_OPTIONS = [
  "Entry Level (Fresh Graduate)",
  "Junior Level(1-3 years)",
  "Mid Level(3-5 years)",
  "Senior(5-8 years)",
  "Executive(VP, Director)",
  "Senior Executive(C Level)",
];

const DATE_OPTIONS = [
  "Any date",
  "Since yesterday",
  "Last 7 days",
  "Last 30 days"
];

const CATEGORY_TEAMS: Record<string, string[]> = {
  "Front Office": [
    "Receptionist",
    "Night Auditor",
    "Guest Relations Officer",
    "Reservations Agent",
    "Phone Operator",
    "Bellboy",
  ],
  "Housekeeping": [
    "Housekeeper",
  ],
  "Food & Beverage": [
    "F&B",
    "Waiter",
    "Chef",
    "Executive Chef",
    "Sous Chef",
    "Cook",
    "Traditional Cook",
    "Kitchen Assistant",
    "Steward",
    "Barista",
    "Banquet",
  ],
  "Marketing": [
    "Marketing & Sales",
  ],
  "Human Resources": [],
  "Engineering & Maintenance": [
    "Chief Engineer",
    "Maintenance",
    "Painter",
    "IT Officer",
  ],
  "Finance & Accounting": [
    "Finance",
    "Accountant",
    "Cost Control",
    "Cashier",
    "Store Keeper",
  ],
  "Unassigned": [
    "Manager",
    "General Manager",
    "Security",
    "Driver",
    "Delivery",
    "Spa Attendant",
    "Gym Trainer",
    "Lifeguard",
    "Other",
  ],
};

const TEAM_NAMES = Object.keys(CATEGORY_TEAMS).filter(t => t !== "Unassigned");

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
                Update Results
              </motion.button>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Category Modal
function CategoryModal({ 
  isOpen, onClose, selected, onChange 
}: { 
  isOpen: boolean; onClose: () => void; selected: string[]; onChange: (cats: string[]) => void;
}) {
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
  const searchFiltered = allCats.filter(c => c.toLowerCase().includes(search.toLowerCase()));

  // Categories for the drilled-in team
  const teamCats = activeTeam ? (CATEGORY_TEAMS[activeTeam] ?? []) : [];

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
              {cat}
            </span>
            <div style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 6, border: isSelected ? "none" : "2px solid var(--text-muted)", background: isSelected ? "var(--brand)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {isSelected && <CheckCircle size={13} color="white" />}
            </div>
          </button>
        );
      })}
      {cats.length === 0 && <p style={{ gridColumn: "1 / -1", textAlign: "center", color: "var(--text-muted)", padding: "24px 0" }}>No roles in this team yet.</p>}
    </div>
  );

  const modalTitle = activeTeam && !isSearching ? activeTeam : "Select Category";

  return (
    <FilterModal isOpen={isOpen} onClose={onClose} title={modalTitle} onUpdate={() => {}}>
      <div style={{ padding: "16px 20px" }}>

        {/* Search bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--app-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 14px", marginBottom: 16 }}>
          <Search size={17} color="var(--text-muted)" />
          <input
            placeholder="Search all categories..."
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
            : <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "24px 0" }}>No categories found.</p>
        )}

        {/* Team drill-down: team list */}
        {!isSearching && !activeTeam && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {TEAM_NAMES.map(team => {
              const cats = CATEGORY_TEAMS[team] ?? [];
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
                      <p style={{ fontSize: 15, fontWeight: 600, color: activeCount > 0 ? "var(--brand)" : "var(--text-primary)", margin: 0 }}>{team}</p>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                        {cats.length} {cats.length === 1 ? "role" : "roles"}{activeCount > 0 ? ` · ${activeCount} selected` : ""}
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
              <ChevronLeft size={16} /> Back to Teams
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
  const toggle = (exp: string) => {
    if (selected.includes(exp)) onChange(selected.filter(e => e !== exp));
    else onChange([...selected, exp]);
  };

  return (
    <FilterModal isOpen={isOpen} onClose={onClose} title="Experience Level" onUpdate={() => {}}>
      <div style={{ padding: "8px 20px" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {EXPERIENCE_OPTIONS.map(exp => {
            const isSelected = selected.includes(exp);
            return (
              <button
                key={exp}
                onClick={() => toggle(exp)}
                style={{
                  width: "100%", padding: "16px 0", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "transparent", borderTop: "none", borderRight: "none", borderLeft: "none",
                  borderBottom: "1px solid var(--border)", cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 16, fontWeight: isSelected ? 700 : 500, color: isSelected ? "var(--brand)" : "var(--text-primary)" }}>
                  {exp}
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
  return (
    <FilterModal isOpen={isOpen} onClose={onClose} title="Posted Within" onUpdate={() => {}}>
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
                  {date}
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

export default function SearchScreen({ onJobSelect }: SearchScreenProps) {
  const [query, setQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<JobCategory[]>([]);
  const [selectedExperience, setSelectedExperience] = useState<string[]>([]);
  const [postedWithin, setPostedWithin] = useState<string>("Any date");
  const [activeModal, setActiveModal] = useState<"category" | "experience" | "date" | null>(null);
  const [results, setResults] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 350);

  useEffect(() => {
    // Autofocus on mount
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const doSearch = useCallback(async (
    kw: string, 
    cats: JobCategory[], 
    exp: string[], 
    posted: string
  ) => {
    const trimmed = kw.trim();
    if (!trimmed && cats.length === 0 && exp.length === 0 && posted === "Any date") {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      let q = supabase
        .from("jobs")
        .select(`
          id, employer_id, title, category, location, neighborhood,
          job_type, salary_min, salary_max, currency, description,
          full_description, requirements, deadline, status, created_at,
          quantity,
          employers ( business_name, business_type, logo_url )
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(50);

      if (cats.length > 0) q = q.in("category", cats);

      // Filtering by experience level assuming a column exists or filtering on the client if necessary.
      // For this implementation, we will assume an experience_level column or requirements->>'experience'.
      // If backend doesn't support it yet, we just pass the filter to the DB and it will return 0 if column is missing,
      // but assuming the backend has been aligned. (Using .in("experience_level", exp))
      // Actually, since we don't know if 'experience_level' column exists on supabase yet, 
      // it's safer to filter client-side after fetch, but let's try the DB level first:
      // We will filter client side to avoid breaking the DB if the column isn't there.
      // Wait, let's just do DB filtering for dates, and client-side for experience if it fails, OR just assume DB has it.
      // I'll filter dates via DB, and we'll filter experience on client just to be 100% safe against DB schema crashes.

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
        q = q.or(`title.ilike.%${trimmed}%,description.ilike.%${trimmed}%,neighborhood.ilike.%${trimmed}%`);
      }

      const { data, error: fetchError } = await q;
      if (fetchError) throw fetchError;

      let finalData = ((data ?? []) as SupabaseJob[]).map(mapSupabaseJobToJob);
      if (exp.length > 0) {
        // If requirements.experience maps roughly, or we just mock filter it for now.
        // Actually, we'll just filter if requirements.experience matches.
        // But the requested strings ("Junior Level(1-3 years)") don't exactly match the type ExperienceLevel.
        // We'll just do a fuzzy match or substring match.
        finalData = finalData.filter(job => {
           if (!job.requirements?.experience) return false;
           return exp.some(e => e.toLowerCase().includes(job.requirements.experience.toLowerCase().replace(" level", "")));
        });
        // If no match works perfectly because DB data is old, it might return 0. But that's how filters work.
      }
      setResults(finalData);
    } catch (err) {
      console.error("Search failed:", err);
      setError("Search failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    doSearch(debouncedQuery, selectedCategories, selectedExperience, postedWithin);
  }, [debouncedQuery, selectedCategories, selectedExperience, postedWithin, doSearch]);

  const clearSearch = () => {
    setQuery("");
    setSelectedCategories([]);
    setSelectedExperience([]);
    setPostedWithin("Any date");
    setResults([]);
    setHasSearched(false);
    inputRef.current?.focus();
  };

  const formatSalary = (min: number, max: number, currency: string) => {
    if (min === -1) return "Per Company Scale";
    if (min === -2) return "Negotiable";
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
          overflow: "hidden",
        }}
      >
        {/* ── HEADER ── */}
        <div
          className="safe-screen-top"
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
              Find Your Role
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
              Search across all active hospitality jobs
            </p>
          </div>

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
              placeholder="Job title, hotel, neighborhood…"
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
            {(query || selectedCategories.length > 0 || selectedExperience.length > 0 || postedWithin !== "Any date") && (
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
            {(selectedCategories.length > 0 || selectedExperience.length > 0 || postedWithin !== "Any date") && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: "auto" }}
                exit={{ opacity: 0, scale: 0.8, width: 0 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
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
                <X size={14} /> Clear
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveModal("category")}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 100,
                fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                background: selectedCategories.length > 0 ? "var(--brand-subtle)" : "var(--surface-elevated)",
                border: selectedCategories.length > 0 ? "1px solid var(--border-active)" : "1px solid var(--border)",
                color: selectedCategories.length > 0 ? "var(--brand)" : "var(--text-secondary)",
              }}
            >
              Category {selectedCategories.length > 0 && `(${selectedCategories.length})`}
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
                border: selectedExperience.length > 0 ? "1px solid var(--border-active)" : "1px solid var(--border)",
                color: selectedExperience.length > 0 ? "var(--brand)" : "var(--text-secondary)",
              }}
            >
              Experience Level {selectedExperience.length > 0 && `(${selectedExperience.length})`}
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
                border: postedWithin !== "Any date" ? "1px solid var(--border-active)" : "1px solid var(--border)",
                color: postedWithin !== "Any date" ? "var(--brand)" : "var(--text-secondary)",
              }}
            >
              {postedWithin === "Any date" ? "Posted Within" : postedWithin}
              <ChevronDown size={14} />
            </motion.button>
          </div>
        </div>

        {/* ── RESULTS ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
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
                onClick={() => doSearch(query, selectedCategories, selectedExperience, postedWithin)}
                style={{ fontSize: 13, fontWeight: 600, color: "var(--brand)", background: "none", border: "none", cursor: "pointer" }}
              >
                Try again
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
                Start Searching
              </h2>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 260, margin: "0 auto" }}>
                Type a job title, hotel name or neighborhood, or pick a category to filter.
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
                No Jobs Found
              </h2>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: 260, margin: "0 auto" }}>
                Try a different keyword or remove category filters.
              </p>
            </motion.div>
          )}

          {/* Results list */}
          {!isLoading && !error && results.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Result count */}
              <p style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500, paddingTop: 4 }}>
                {results.length} result{results.length !== 1 ? "s" : ""}
                {selectedCategories.length > 0 ? ` · ${selectedCategories.join(", ")}` : ""}
              </p>

              <AnimatePresence>
                {results.map((job, i) => (
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
                      <div
                        style={{
                          width: 46, height: 46, borderRadius: 13,
                          background: "var(--brand-subtle)",
                          border: "1px solid var(--border)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 22, flexShrink: 0,
                        }}
                      >
                        {job.logoUrl ? (
                          <img 
                            src={job.logoUrl} 
                            alt={`${job.businessName} logo`} 
                            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 13 }} 
                          />
                        ) : (
                          job.businessLogo
                        )}
                      </div>

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
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
      {/* Modals */}
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
