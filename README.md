# Nouwen Documentary Deck — Next.js Port

Port the existing HTML deck to **Next.js 14 (App Router) + TypeScript + Framer Motion + Tailwind**. The HTML file in this bundle is the authoritative visual + content spec. Match it pixel-for-pixel and motion-for-motion.

## What this bundle contains
- `Nouwen Documentary Deck.html` — the design source of truth (open in a browser to see exact target)
- `deck-stage.js` — current scaling/nav web component (reference only; reimplement in React)
- `photos/` — 15 production photos (copy into `public/photos/`)

## Target structure
```
app/
  layout.tsx
  page.tsx                    # router landing → /deck/0
  deck/[index]/page.tsx       # one slide per route, ← / → / Space navigation
components/
  DeckStage.tsx               # 1920×1080 scaled stage, keyboard + tap nav, slide-count overlay
  slides/                     # one file per slide, Slide00…Slide34
  motifs/
    MotifLayer.tsx            # router by type
    WildernessMotif.tsx       # port .m-terrain + .ml mist (slides 14, 15)
    LadderMotif.tsx           # port .m-ladder (slide 05)
    DocumentaryMotif.tsx      # port .m-frame (slides 18, 19)
    WaitingLineMotif.tsx      # port .m-wait (slides 20, 28)
    DoorGlowMotif.tsx         # port .m-door (slides 30, 31, 32)
    PewsMotif.tsx             # port .m-pews (slides 09, 10)
    NestedFramesMotif.tsx     # port .nest (slide 25)
    BelovedRingsMotif.tsx     # NEW — concentric warm rings, slides 17, 31
    TakenBlessedBrokenGivenMotif.tsx  # NEW — 4-stage glyph: stage prop "taken"|"blessed"|"broken"|"given"
    ThreadMotif.tsx           # NEW — single drawn line connecting story layers, slides 25, 26, 27
lib/
  slides.ts                   # SLIDES array: {index, label, bg, motif?, motifStage?, content}
```

## Required behavior (do not skip)
- **Scaling:** stage authored at 1920×1080, CSS-transform scales to fit viewport, letterboxed on black.
- **Navigation:** `→` / `Space` / right-click-area → next; `←` / left-click-area → previous; `f` toggles fullscreen.
- **Reveals:** elements with `.r`, `.r2`, `.r3`, `.r4`, `.r5`, `.rs`, `.rss` classes fade-up on slide enter with cascading delays (0 / 600 / 1200 / 1800 / 2400 ms; `rs` slower / `rss` slowest). Reimplement with Framer Motion `initial`/`animate`/`transition` + `key` reset on slide change.
- **Breath:** `.breathe` class applies 22s vignette pulse. Reimplement as Framer Motion infinite loop.
- **Photo Ken Burns:** `.photo.pin .pi img` runs a 48s `transform: scale(1.04) translate(…)` push-in. Port to Framer.
- **Reduced motion:** honor `prefers-reduced-motion: reduce` everywhere — disable breath, drift, Ken Burns; keep only fade-in.
- **Slide count overlay:** small "NN / 33" indicator, bottom-right, fades after 3s of inactivity.
- **`/print` route:** static one-page-per-slide render for PDF export.

## Color tokens (Tailwind extend)
```ts
colors: {
  ink:         '#0d0a07',
  'ink-cold':  '#0a0c10',
  'ink-mist':  '#1a1c20',
  'ink-warm':  '#1c140e',
  'ink-warmest': '#2a1d10',
  cream:       '#ece2cf',
  'cream-dim': '#b8a386',
  mist:        '#948e80',
  warm:        '#dac4a8',
}
```

## Type
- Body / UI: **Geist** (`next/font/google`)
- Mono: **Geist Mono**
- Display: **Cormorant Garamond** for `.serif` and major lines

## Slide spec
The HTML file is the canonical source. Each `<section data-label="…">` is one slide; port them in order. Slide 00 = pre-roll black, Slide 34 = production-only pacing table (gate behind `?edit=1`).

## New motif specs (the three to design from scratch)

### BelovedRingsMotif (slides 17, 31)
Three or four very low-opacity (5–10%) concentric circles radiating from center, warm color (`--warm`), drawn with SVG `<circle>` and animated outward over 18s with `<motion.circle>` (`strokeDasharray` animation). Reads as quiet expanding presence behind "Just — loved." and "You are here to be loved." Avoid: any halo, sunburst, mandala, lens-flare aesthetic. Geometry must be barely-there architecture, not a graphic.

### TakenBlessedBrokenGivenMotif
Single SVG glyph with a `stage` prop. Geometry is **a square (the eucharistic loaf)** drawn at low opacity, modified per stage:
- `taken` — square outline, full
- `blessed` — same square, faint warm radial behind
- `broken` — square outline with a single diagonal crack drawn across it
- `given` — square outline opening from the top, contents radiating outward as faint lines
Animate stage transitions with `<motion.path>` `pathLength` over 4–6s. Use on slides 05 (taken), 17 (blessed), 12 (broken), 32 (given). Position: dead center, 25% viewport size, behind text, max 15% opacity.

### ThreadMotif (slides 25, 26, 27)
One thin warm line that draws itself horizontally across the slide as it enters, lingers, then dissolves. Use Framer's `pathLength` over 8s in, hold 6s, fade out. Implies the through-line connecting Jesus → Rembrandt → Nouwen → Greg → John → tonight. No arrows, no labels, no end-caps. Just a line, slightly off-center, slightly variable in thickness.

## What NOT to add
- No icons (cross, dove, halo, hands, candle, road, mountain, heart)
- No particle systems, no confetti, no parallax beyond what's specified
- No spring/bouncy easing — only ease-in-out with long durations
- No new copy, no rewrites, no extra slides
- No SaaS-y gradients, no glow shaders, no glassmorphism

## Quality bar
Greg Whiteley documentary + Apple Keynote restraint. The audience should feel the structure before they understand it. Motion is editorial, not decorative. When in doubt, *subtract*.

## Acceptance
- Open at `/` → identical to opening the HTML file
- All 33 audience-facing slides match the HTML reference at 1920×1080
- All existing motifs (ladder, pews, terrain, frame, waiting line, door, nested frames) preserved
- Three new motifs (BelovedRings, TakenBlessedBrokenGiven, Thread) wired into the slides listed above
- `prefers-reduced-motion` respected
- Builds clean, no console errors, projector-ready in Chrome and Safari
