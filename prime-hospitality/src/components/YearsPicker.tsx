"use client";

import React from "react";
import { motion } from "framer-motion";
import { useT, useLocale } from "@/lib/i18n";
import {
  YEARS_OPTIONS,
  MAX_YEARS,
  yearsLabel,
  businessTypeLabel,
} from "@/lib/vocabulary";

interface YearsPickerProps {
  /** Canonical role name — the key these years are stored under. */
  role: string;
  /** Display name for the role, already localised by the caller. */
  roleLabel: string;
  years: number | null;
  context: string;
  /** Establishment types, from useBusinessTypes(). */
  establishmentTypes: string[];
  onYearsChange: (role: string, years: number) => void;
  onContextChange: (role: string, context: string) => void;
}

/**
 * Years-of-experience input for one role, plus where those years were earned.
 *
 * A tap-per-value chip row rather than a text field or stepper: this runs
 * inside a Telegram Mini App, so avoiding the keyboard matters, and storing the
 * exact integer keeps the data usable for later analysis in a way that coarse
 * bands would throw away at write time.
 *
 * The establishment picker appears only once years > 0 — there is nowhere to
 * have earned zero years, and hiding it keeps the tap count down for seekers
 * who selected several roles.
 */
export default function YearsPicker({
  role,
  roleLabel,
  years,
  context,
  establishmentTypes,
  onYearsChange,
  onContextChange,
}: YearsPickerProps) {
  const t = useT();
  const { lang } = useLocale();

  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 700,
          color: "var(--brand)",
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {roleLabel}
      </label>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {YEARS_OPTIONS.map((y) => {
          const selected = years === y;
          return (
            <motion.button
              key={y}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => onYearsChange(role, y)}
              aria-pressed={selected}
              style={{
                minWidth: 46,
                padding: "10px 12px",
                borderRadius: 12,
                border: selected ? "1.5px solid var(--brand)" : "1px solid var(--border)",
                background: selected ? "rgba(34,197,94,0.10)" : "var(--card)",
                color: selected ? "var(--brand)" : "var(--text-primary)",
                fontSize: 15,
                fontWeight: selected ? 700 : 500,
                cursor: "pointer",
              }}
            >
              {y >= MAX_YEARS ? `${MAX_YEARS}+` : y}
            </motion.button>
          );
        })}
      </div>

      <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 8 }}>
        {years == null ? t("onboarding.selectExperience") : yearsLabel(years, t)}
      </p>

      {years != null && years > 0 && establishmentTypes.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>
            {t("experience.earnedAt")}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {establishmentTypes.map((type) => {
              const selected = context === type;
              return (
                <motion.button
                  key={type}
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => onContextChange(role, selected ? "" : type)}
                  aria-pressed={selected}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 100,
                    border: selected ? "1.5px solid var(--brand)" : "1px solid var(--border)",
                    background: selected ? "rgba(34,197,94,0.10)" : "var(--card)",
                    color: selected ? "var(--brand)" : "var(--text-primary)",
                    fontSize: 13,
                    fontWeight: selected ? 700 : 500,
                    cursor: "pointer",
                  }}
                >
                  {businessTypeLabel(type, lang)}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
