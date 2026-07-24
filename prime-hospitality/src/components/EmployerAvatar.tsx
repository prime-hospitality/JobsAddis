import React from "react";

/** Curated gradient pairs for the "no logo yet" fallback. A business is
 *  deterministically hashed onto one of these so the same employer always
 *  lands on the same color, while different employers spread across the
 *  set instead of all showing one repeated tile. */
const PALETTE: { from: string; to: string; letter: string }[] = [
  { from: "#4338ca", to: "#1e1b4b", letter: "#e0e7ff" }, // indigo
  { from: "#b45309", to: "#78350f", letter: "#fde68a" }, // amber
  { from: "#0f766e", to: "#134e4a", letter: "#ccfbf1" }, // teal
  { from: "#15803d", to: "#14532d", letter: "#dcfce7" }, // forest
  { from: "#be185d", to: "#831843", letter: "#fbcfe8" }, // rose
  { from: "#c2410c", to: "#7c2d12", letter: "#fed7aa" }, // terracotta
];

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash;
}

export function monogramPalette(name: string) {
  const key = name?.trim() || "?";
  return PALETTE[hashSeed(key) % PALETTE.length];
}

export function monogramLetter(name: string) {
  const trimmed = name?.trim();
  return trimmed ? trimmed[0].toUpperCase() : "•";
}

/** Renders an employer's uploaded logo, or — when there isn't one yet — a
 *  monogram tile: first letter of the business name, serif, on a gradient
 *  chosen deterministically from the business name. Used everywhere an
 *  employer's "profile picture" appears: job cards, job detail, search,
 *  the application screen, and the employer dashboard itself. */
export default function EmployerAvatar({
  name,
  logoUrl,
  size,
  radius,
  fontSize,
}: {
  name: string;
  logoUrl?: string | null;
  size: number;
  radius: number;
  fontSize?: number;
}) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${name} logo`}
        style={{ width: size, height: size, borderRadius: radius, objectFit: "cover", flexShrink: 0 }}
      />
    );
  }

  const { from, to, letter } = monogramPalette(name);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${from}, ${to})`,
        overflow: "hidden",
      }}
    >
      <span
        style={{
          fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
          fontWeight: 500,
          color: letter,
          fontSize: fontSize ?? Math.round(size * 0.46),
          lineHeight: 1,
        }}
      >
        {monogramLetter(name)}
      </span>
    </div>
  );
}
