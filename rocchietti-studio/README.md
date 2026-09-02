# Rocchietti Studio — Packages page

| File | What it is |
|---|---|
| `index.html` | **The page to send now.** Three sections: *the packages*, *side by side*, *add-ons & ongoing care*. |
| `full-page.html` | The complete version kept for later — adds hero, marquee, *meet the designer*, process, working rules, FAQ and the closing CTA. |

No build step — open the file, or drop it on any static host (Netlify, Vercel, GitHub Pages, a `/packages`
folder on the studio site). Keep `assets/` next to the HTML.

**Stack:** Tailwind (Play CDN) + GSAP 3.12.5 (ScrollTrigger), Google Fonts (Quicksand / Caveat /
Caveat Brush). Everything else is inline.

---

## Before sending it out

### 1. The logo asset

Save it in `assets/` as **`rocchietti-logo.svg`** (preferred) or **`rocchietti-logo.png`**.
The page tries the SVG first, then the PNG, and only falls back to a typeset wordmark if neither is
there — so nothing ever looks broken, but the real mark only appears once the file exists.

Export it **trimmed to the artwork**: no square canvas, no white padding. A square export renders as a
small square in the header instead of a wide wordmark. Transparent background is best; white also works
(the page blends it out with `mix-blend-mode: multiply`).

### 2. Booking link and email

Top of the `<script>` block near the end of the file:

```js
const BOOKING_URL   = "https://cal.com/rocchietti-studio/intro-call";  // ← real Cal.com / Calendly link
const CONTACT_EMAIL = "hello@rocchiettistudio.com";                    // ← real email
```

Every "Book a call" button reads from those two constants.

### 3. Only for `full-page.html`

The *meet the designer* block uses a designed placeholder (grid card with the monogram). Swap it for a
black & white cut-out portrait, per the Figma moodboard — the yellow sticker glow is already behind it:

```html
<img src="assets/designer.jpg" alt="" class="relative w-full rounded-[28px] border-[1.5px] border-ink grayscale">
```

---

## Design system (from the Figma moodboard)

| Token | Value | Use |
|---|---|---|
| `ink` | `#3E2A21` | text, borders |
| `brown` | `#5C3A2E` | logo, script accents, dark sections |
| `cream` | `#FDFBF6` | page background |
| `lemon` | `#F8E7A1` | highlighter, card shadows, stickers |
| `peri` | `#C7D0EE` | secondary shadows, featured card |
| `grid` | `#D3DDF2` | graph-paper lines |

Type: **Quicksand** (UI/body), **Caveat** (handwritten notes), **Caveat Brush** (highlighted headline
words). Cards are white with a 1.5px ink outline and a hard offset shadow — the paper / scrapbook look
from the moodboard.

## Animations (GSAP)

- Highlighter sweep on every `.hl` word, fired by ScrollTrigger
- Staggered reveals (`[data-reveal]`, grouped by `[data-reveal-group]`)
- Floating confetti dots

`full-page.html` adds the infinite marquee, dot parallax, draggable hero stickers and the animated FAQ
accordion. Everything is skipped under `prefers-reduced-motion: reduce` (highlights snap on instead).

## What is deliberately **not** on these pages

The pricing strategy notes stay internal: the reasoning behind the price ladder, how to present prices
on Instagram vs LinkedIn, and the referral arrangement with Vivido. Vivido appears only as the partner
studio for websites (in `full-page.html`), without commercial terms.

## Content

Prices, deliverables, timelines, revision counts, payment splits, add-ons and the Brand Care retainer
all match the approved offer. All prices exclude VAT; the footer states a 30-day validity.
