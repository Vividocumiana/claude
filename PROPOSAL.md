# Gruppo Prospecta — Website Proposal

A pixel-accurate, animated build of the **PROSPECTA – PROPOSAL 1** hero from the
Figma file *Proposals-Archive* (node `31:1210`).

Plain **HTML / CSS / JS** — no build step, no runtime dependencies. Just open
`index.html` (or serve the folder) in any modern browser.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Markup — nav, hero copy, chart cluster, floating cards, mobile layout |
| `styles.css` | Design tokens, pixel-perfect layout (authored at 1280×754), animation states |
| `script.js` | Stage fit-to-viewport scaling, entrance orchestration, number counters, magnetic buttons, mouse parallax |
| `assets/fonts.css` + `assets/fonts/` | Self-hosted webfonts (woff2) — fully offline, no CDN calls |

## How it's built

The desktop composition is authored at the Figma frame size (1280×754) and
scaled to fit the viewport (capped at 1×), so it stays pixel-accurate on any
screen. Below 760px it reflows into a dedicated mobile layout.

### Motion (bold & dynamic)

- Staggered entrance: nav → badge → word-by-word headline → lede → CTA
- Bars grow up from the baseline, left → right
- The red **trend line** draws itself through the data points
- Data-point dots pop in with a spring, then gently float + pulse
- Live count-up on the **+30%** and **3X** stats
- Magnetic CTA buttons + animated grid shimmer on the panels
- Subtle multi-layer mouse parallax across bars / line / dots / cards
- Everything degrades gracefully under `prefers-reduced-motion`

## Font substitutions

The Figma file uses two commercial/foundry typefaces that aren't freely
redistributable. They're mapped to close, self-hosted open-source equivalents:

| Figma | Used here |
|-------|-----------|
| Switzer (UI / body) | **Hanken Grotesk** |
| Sole Serif Text (headline / quote) | **Source Serif 4** |
| Noto Serif (stat numbers) | **Noto Serif** *(exact match)* |

Swap these for the licensed originals by replacing the `@font-face` sources in
`assets/fonts.css` if the brand fonts are available.
