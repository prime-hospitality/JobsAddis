"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

export interface FilterOption {
  value: string;
  label: string;
  /** Small colour dot before the label — used by the status filter. */
  dot?: string;
  /** Trailing number, e.g. how many applicants a job has. */
  count?: number;
  /** Second line under the label, for context that would crowd it. */
  hint?: string;
}

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  placeholder?: string;
  /** Search box above the list. On by default; pass false for short fixed lists. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Scroll past this many pixels of options rather than growing the menu. */
  maxMenuHeight?: number;
  minWidth?: number;
  /** Stretch to the container — for form fields rather than filter bars. */
  fullWidth?: boolean;
  ariaLabel?: string;
  /** Leading icon in the trigger, e.g. a funnel. */
  icon?: React.ReactNode;
}

/**
 * A select that behaves. The native control renders an OS menu we cannot style,
 * grows to whatever height it likes, and offers no way to find one job among
 * fifty. This keeps the same keyboard contract — arrows move, Enter picks,
 * Escape closes, typing filters — inside a menu that stays a fixed height and
 * scrolls.
 *
 * Deliberately not a combobox: the value is always one of `options`, never free
 * text, so the trigger shows the chosen label and the search box only filters.
 */
export default function FilterSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchable = true,
  searchPlaceholder = "Search…",
  maxMenuHeight = 280,
  minWidth = 200,
  fullWidth = false,
  ariaLabel,
  icon,
}: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  /** Menu opens upward when there isn't room below — near the page bottom. */
  const [dropUp, setDropUp] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q));
  }, [options, query]);

  // Reopening should not inherit the last search or a stale highlight.
  useEffect(() => {
    if (open) {
      setQuery("");
      const i = options.findIndex((o) => o.value === value);
      setActiveIndex(i >= 0 ? i : 0);
      if (searchable) requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open, options, value, searchable]);

  // Typing narrows the list, so the old highlight may no longer exist.
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom;
    setDropUp(below < maxMenuHeight + 24 && rect.top > below);
  }, [open, maxMenuHeight]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function commit(option: FilterOption) {
    onChange(option.value);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(filtered.length - 1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[activeIndex];
      if (opt) commit(opt);
    }
  }

  return (
    <div
      ref={rootRef}
      style={{ position: "relative", minWidth, ...(fullWidth ? { width: "100%" } : null) }}
      onKeyDown={onKeyDown}
    >
      <style>{`
        @keyframes fs-in {
          from { opacity: 0; transform: translateY(var(--fs-from, -4px)); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fs-menu { animation: fs-in .13s cubic-bezier(0.16, 1, 0.3, 1); }
        .fs-opt:hover { background: #f8fafc; }
        .fs-opt[data-active="true"] { background: #f1f5f9; }
        .fs-opt[data-selected="true"] { background: #eff6ff; }
        .fs-trigger:hover { border-color: #cbd5e1; }
        .fs-trigger[data-open="true"] { border-color: #93c5fd; box-shadow: 0 0 0 3px rgba(147,197,253,0.25); }
        .fs-search:focus { outline: none; border-color: #93c5fd; }
      `}</style>

      <button
        type="button"
        className="fs-trigger"
        data-open={open}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8,
          background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
          padding: "9px 12px", fontSize: 13, fontWeight: 600,
          color: selected ? "#0f172a" : "#94a3b8",
          cursor: "pointer", fontFamily: "inherit", textAlign: "left",
          transition: "border-color .15s ease, box-shadow .15s ease",
        }}
      >
        {icon}
        {selected?.dot && (
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: selected.dot, flexShrink: 0 }} />
        )}
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? selected.label : placeholder}
        </span>
        {typeof selected?.count === "number" && (
          <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", background: "#f1f5f9", borderRadius: 6, padding: "2px 7px", flexShrink: 0 }}>
            {selected.count}
          </span>
        )}
        <svg
          width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s ease" }}
        >
          <path d="M1 1L5 5L9 1" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className="fs-menu"
          role="listbox"
          aria-label={ariaLabel}
          style={{
            ["--fs-from" as string]: dropUp ? "4px" : "-4px",
            position: "absolute", zIndex: 60, left: 0, right: 0,
            ...(dropUp ? { bottom: "calc(100% + 6px)" } : { top: "calc(100% + 6px)" }),
            background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
            boxShadow: "0 12px 28px rgba(15,23,42,0.12)", overflow: "hidden",
          }}
        >
          {searchable && (
            <div style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>
              <input
                ref={searchRef}
                className="fs-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8,
                  padding: "8px 10px", fontSize: 12.5, color: "#0f172a", fontFamily: "inherit",
                }}
              />
            </div>
          )}

          <div ref={listRef} style={{ maxHeight: maxMenuHeight, overflowY: "auto", padding: 4 }}>
            {filtered.length === 0 ? (
              <p style={{ margin: 0, padding: "18px 12px", fontSize: 12.5, color: "#94a3b8", textAlign: "center" }}>
                Nothing matches “{query}”
              </p>
            ) : (
              filtered.map((o, i) => {
                const isSelected = o.value === value;
                return (
                  <div
                    key={o.value}
                    className="fs-opt"
                    data-idx={i}
                    data-active={i === activeIndex}
                    data-selected={isSelected}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => commit(o)}
                    style={{
                      display: "flex", alignItems: "center", gap: 9,
                      padding: "9px 10px", borderRadius: 8, cursor: "pointer",
                      // The selected row carries a left bar in its own colour —
                      // on the status filter that is the status colour itself.
                      boxShadow: isSelected ? `inset 3px 0 0 ${o.dot ?? "#0284c7"}` : "none",
                    }}
                  >
                    {o.dot && <span style={{ width: 7, height: 7, borderRadius: "50%", background: o.dot, flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: isSelected ? 700 : 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {o.label}
                      </div>
                      {o.hint && (
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {o.hint}
                        </div>
                      )}
                    </div>
                    {typeof o.count === "number" && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: o.count > 0 ? "#0284c7" : "#94a3b8", background: o.count > 0 ? "#eff6ff" : "#f8fafc", borderRadius: 6, padding: "2px 7px", flexShrink: 0 }}>
                        {o.count}
                      </span>
                    )}
                    {isSelected && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
