"use client";

import React from "react";

/**
 * Makes an employer's name or logo open their company profile, from inside a
 * card that is itself one big tap target for the job.
 *
 * Every place this is used sits within a clickable card, so the whole point is
 * the stopPropagation: without it the card's own handler also fires and the
 * seeker lands on the job they were trying to look past. It is deliberately a
 * wrapper rather than a styled control — the four call sites lay the avatar and
 * the name out differently, and a component that owned the layout would have to
 * grow a prop per site. This one inherits whatever it wraps and only adds the
 * behaviour.
 *
 * Renders a real <button> so it is reachable by keyboard and announced as a
 * control. `display: contents` is deliberately NOT used: it would remove the
 * button from the layout, and with it the hit area.
 */
export default function CompanyTap({
  employerId,
  companyName,
  onOpen,
  display = "inline-flex",
  children,
}: {
  employerId: string;
  /** Names the destination for screen readers — "Skylight Hotel, view company". */
  companyName: string;
  /** Omit to render children plainly, with no tap behaviour at all. That is how
   *  the company profile's own job list avoids linking a company to itself. */
  onOpen?: (employerId: string) => void;
  /** Match the layout the wrapped element had before wrapping: `flex` for a
   *  logo tile that is a flex child, `inline-flex` for a run of text. */
  display?: "flex" | "inline-flex";
  children: React.ReactNode;
}) {
  if (!onOpen || !employerId) return <>{children}</>;

  return (
    <button
      type="button"
      aria-label={`${companyName}, view company`}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(employerId);
      }}
      style={{
        display,
        alignItems: "center",
        // A button brings its own chrome and its own font; strip both so the
        // wrapped content looks exactly as it did before.
        padding: 0,
        margin: 0,
        border: "none",
        background: "none",
        font: "inherit",
        color: "inherit",
        textAlign: "inherit",
        cursor: "pointer",
        // Without this a long business name stops eliding and pushes the card
        // wider, because a button does not inherit the min-width:0 its parent
        // flex item relies on.
        minWidth: 0,
        maxWidth: "100%",
      }}
    >
      {children}
    </button>
  );
}
