# Rocchietti Studio — Quote / Packages page

Single self-contained page (`index.html`) to send to leads: they discover the packages and book a call.
No build step — open the file, or drop it on any static host (Netlify, Vercel, GitHub Pages, a `/quote`
folder on the studio site).

**Stack:** Tailwind (Play CDN) + GSAP 3.12.5 (ScrollTrigger + Draggable), Google Fonts
(Quicksand / Caveat / Caveat Brush). Everything else is inline.

---

## Before sending it out — 3 things to change

1. **Booking link and email** — at the top of the `<script>` block near the end of `index.html`:

   ```js
   const BOOKING_URL   = "https://cal.com/rocchietti-studio/intro-call";  // ← real Cal.com / Calendly link
   const CONTACT_EMAIL = "hello@rocchiettistudio.com";                    // ← real email
   ```

   Every "Book a call" button on the page reads from those two constants.

2. **Logo** — the wordmark is currently typeset in Caveat (a close match to the real mark, not the mark
   itself). Drop the real file at `assets/rocchietti-logo.svg` and replace the marked block in the nav
   (and the same one in the footer) with:

   ```html
   <img src="assets/rocchietti-logo.svg" alt="Rocchietti Studio" class="h-9 w-auto">
   ```

3. **Designer photo** — the "meet the designer" block uses a designed placeholder (grid card with the
   monogram). Swap it for a real cut-out portrait, black & white, per the Figma moodboard:

   ```html
   <img src="assets/designer.jpg" alt="" class="relative w-full rounded-[28px] border-[1.5px] border-ink grayscale">
   ```

   The yellow sticker glow behind it is already in place.

Optional: the About copy is deliberately written without a first name — add one if you want it warmer.

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

Type: **Quicksand** (UI/body), **Caveat** (logo + handwritten notes), **Caveat Brush** (highlighted
headline words). Cards are white with a 1.5px ink outline and a hard offset shadow — the paper /
scrapbook look from the moodboard.

## Animations (GSAP)

- Highlighter sweep on every `.hl` word, fired by ScrollTrigger
- Staggered scroll reveals (`[data-reveal]`, grouped by `[data-reveal-group]`)
- Infinite marquee strip
- Floating + parallax confetti dots
- Draggable scrapbook stickers in the hero (`.drag-sticker`)
- GSAP-animated FAQ accordion

All of it is skipped under `prefers-reduced-motion: reduce` (highlights snap on instead).

## What is deliberately **not** on this page

The pricing strategy notes stay internal: the reasoning behind the price ladder, how to present prices
on Instagram vs LinkedIn, and the referral arrangement with Vivido. The client-facing page mentions
Vivido only as the partner studio for websites, without commercial terms.

## Content

Prices, deliverables, timelines, revision counts, payment splits, add-ons, the Brand Care retainer and
the working rules all match the approved offer. All prices exclude VAT; the footer states a 30-day
validity on the quote.
