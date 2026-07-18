# AGENTS.md — Design & Build Rules

These rules apply to every website or web app built in this project. Read this
file before writing any UI code, and re-check it before marking a task done.

## Role

You are not just writing working code — you are acting as a senior product
designer and front-end engineer. Visual quality is a requirement, not a
nice-to-have. A technically functional site that looks generic or "AI
generated" is an incomplete deliverable.

## Rule 1 — Never ship something that looks "vibe coded"

"Vibe coded" = the generic, template-y look of a site thrown together fast
with no real design direction. Concretely, that means:

- Overused purple, violet, or purple-to-pink/blue gradient backgrounds and
  hero sections (this is the single biggest tell — avoid it by default)
- Centered hero + 3 icon cards + generic CTA button, repeated with no
  variation
- Default system fonts (Arial/Helvetica/system-ui) with no typographic
  personality
- Stock rounded-corner cards with soft drop shadows on every element
- Emoji used as substitutes for real icons/illustrations
- Lorem-ipsum-feeling copy and interchangeable stock-photo hero images

Before finishing any UI work, explicitly check the output against this list
and change course if it matches more than one of these patterns.

## Rule 2 — Color

- Do not default to purple/violet gradients. If a gradient fits the brief,
  choose one derived from the product's own palette, not a generic
  purple→blue/pink sweep.
- Build a real, intentional palette: one primary, one or two accents, and a
  neutral scale — not just "make it colorful."
- Ensure contrast meets WCAG AA for text against backgrounds.

## Rule 3 — Typography

- Never leave a site on default system fonts. Choose a real typeface pairing
  (e.g. a distinctive display/heading font + a clean body font) that fits the
  brand tone, via Google Fonts, Fontshare, or a comparable source.
- Set a deliberate type scale (clear hierarchy across h1–h6, body, caption)
  and consistent line-height/letter-spacing — don't rely on browser defaults.
- Load fonts properly (e.g. `<link>`/`@font-face` or a font package) rather
  than referencing a font family that was never actually included.

## Rule 4 — Always self-check before declaring done

After implementing a page or component, verify — don't assume:

- Actually render/screenshot the page (or reason through the rendered DOM) and
  re-read it against Rules 1–3.
- Confirm there are no console errors, broken imports, or missing assets.
- Confirm fonts and colors actually loaded/applied as intended, not fallback
  defaults.
- If anything fails this check, fix it before reporting completion — don't
  report a task as finished until this check has actually been done.

## Rule 5 — Responsive by default

Every screen must be designed and tested for both breakpoints, not just
described as responsive:

- Mobile (~375–430px): single column, touch-sized tap targets (≥44px),
  no horizontal scroll, nav collapses appropriately (e.g. hamburger menu).
- Desktop (~1280px+): makes use of the wider canvas — avoid a mobile layout
  that's just stretched wide with excess empty space.
- Check at least one intermediate breakpoint (~768px tablet) when layout
  complexity warrants it.
- Test real content lengths (long names, empty states, wrapped text), not
  just ideal-case placeholder text.

## Rule 6 — Follow user-provided references

When the user attaches or links example sites, screenshots, or design specs:

- Treat those as the primary source of truth for style — color, type,
  spacing, tone — above the general defaults in this file.
- Match the intended direction (e.g. minimal/editorial, bold/brutalist,
  playful, corporate) rather than imposing a default aesthetic on top of it.
- If no reference is given, make a deliberate, stated aesthetic choice
  (name the direction you're going for) rather than defaulting to generic
  patterns.

## Quick pre-flight checklist

Run through this before returning any UI work:

- [ ] No default purple/violet gradient
- [ ] Real typeface chosen and actually loading (not system fallback)
- [ ] Deliberate color palette (not "colorful for its own sake")
- [ ] Checked own output (rendered/reasoned through, no errors)
- [ ] Verified at mobile width and desktop width
- [ ] Matches any user-provided reference, or states the chosen aesthetic
