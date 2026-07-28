"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";

export interface SheetOption {
  value: string;
  label: string;
  /** Second line, for context that would crowd the label. */
  hint?: string;
}

/**
 * A picker built for a thumb. The desktop FilterSelect drops a menu anchored to
 * its trigger, which on a 375px screen either runs off the bottom or covers the
 * field you're trying to fill. This slides a sheet up from the bottom edge
 * instead — the option rows land where the thumb already is, and each one is a
 * full-width 52px target rather than a 28px menu line.
 *
 * The trigger is styled to read as a form field, not a button, so a screen of
 * inputs stays visually level.
 */
export default function SheetSelect({
  value,
  onChange,
  options,
  label,
  title,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SheetOption[];
  label: string;
  /** Sheet heading. Defaults to the field label. */
  title?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const selected = options.find((o) => o.value === value);

  const sheet = (
    <AnimatePresence>
      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000 }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
            style={{ position: "absolute", inset: 0, background: "rgba(9, 12, 20, 0.55)", backdropFilter: "blur(2px)" }}
          />
          <motion.div
            role="listbox"
            aria-label={title || label}
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
              maxHeight: "78dvh",
              display: "flex",
              flexDirection: "column",
              background: "var(--surface-elevated)",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTop: "1px solid var(--border)",
              paddingBottom: "env(safe-area-inset-bottom, 12px)",
            }}
          >
            <div style={{ padding: "10px 0 4px", display: "flex", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: 38, height: 4, borderRadius: 100, background: "var(--border)" }} />
            </div>
            <h3
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: "var(--text-primary)",
                letterSpacing: "-0.01em",
                padding: "6px 20px 12px",
                margin: 0,
                flexShrink: 0,
              }}
            >
              {title || label}
            </h3>
            <div style={{ overflowY: "auto", padding: "0 12px 12px" }} className="scroll-smooth">
              {options.map((opt) => {
                const isActive = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    style={{
                      width: "100%",
                      minHeight: 52,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "12px 14px",
                      background: isActive ? "var(--brand-subtle)" : "transparent",
                      border: "none",
                      borderRadius: 12,
                      cursor: "pointer",
                      textAlign: "left",
                      font: "inherit",
                    }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: "block",
                          fontSize: 15,
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? "var(--brand-dim)" : "var(--text-primary)",
                        }}
                      >
                        {opt.label}
                      </span>
                      {opt.hint && (
                        <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{opt.hint}</span>
                      )}
                    </span>
                    {isActive && <Check size={18} color="var(--brand)" strokeWidth={2.5} style={{ flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <label style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.01em" }}>{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        style={{
          width: "100%",
          minHeight: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "12px 14px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          color: selected ? "var(--text-primary)" : "var(--text-muted)",
          fontSize: 15,
          fontWeight: 500,
          fontFamily: "inherit",
          textAlign: "left",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected?.label ?? "Choose…"}</span>
        <ChevronDown size={17} color="var(--text-muted)" style={{ flexShrink: 0 }} />
      </button>
      {typeof document !== "undefined" && createPortal(sheet, document.body)}
    </div>
  );
}
