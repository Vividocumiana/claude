# Theia — Hero section (Webflow)

Built from Figma `Theia` → node `20609:159` ("Proposal 2 Desktop") into the
Webflow site **Theia New** (`theia-new`), page **Home**.

All classes are suffixed `_theia`; variants are combo classes (`is-blue_theia`,
`is-plain_theia`, …) so nothing can collide with future work on the site.

---

## What is in Webflow already

Structure and styling were built headlessly via the Webflow MCP:

```
section.hero_theia
├── img.hero_bg_theia                     background vector
├── div.nav_theia                         fixed top nav pill
│   ├── .nav_left_theia  → logo + .nav_menu_theia (5 links, 2 with caret)
│   └── a.nav_btn_theia  → "Area Riservata"
├── div.hero_inner_theia                  max-width 1440, 64px side padding
│   ├── .hero_rating_theia                Trustpilot rating + subline
│   └── .hero_headrow_theia               h1 + subcopy, bottom-aligned
├── div.marquee_wrap_theia                credential pills + edge fades
│   └── .marquee_theia[data-draggable-marquee-init]
│       └── .marquee_collection_theia[data-draggable-marquee-collection]
│           └── .marquee_list_theia[data-draggable-marquee-list]
│               └── .pill_theia × 5
├── div.radial_theia[data-radial-slider-init]
│   └── .radial_collection_theia[data-radial-slider-collection]
│       └── .radial_list_theia[data-radial-slider-list]
│           └── .radial_item_theia[data-radial-slider-item] × 5
│               └── .doccard_theia
└── a.hero_cta_theia                      fixed bottom CTA pill
```

Card order in the DOM is **not** left-to-right. The script places item 0 at the
centre and fans the rest out as offsets `0, +1, +2, −2, −1`, so the DOM order
`blue → violet → coral → olive → amber` renders as the Figma order
`olive, amber, blue, violet, coral` left-to-right.

### Site-level custom code (already written)

Lives in Site settings → Custom code → Head. It carries the Google Fonts link
and the attribute-selector rules that cannot be expressed as Webflow classes:
the slider's `--slider-rotate` / `--slider-radius`, the grab cursors, and the
Designer-mode rule that lays the cards out in a scrollable row so they stay
editable on canvas.

Arc geometry was derived from the Figma placement: cards sit 411px apart at
1440px wide, which is `4deg` of step at a `1375%` transform origin.

---

## Remaining manual steps

### 1. Fonts

`Host Grotesk` and `DM Sans` are pulled from Google Fonts by the custom code, so
the page renders correctly on publish. They are **not** in the Webflow style
panel dropdown yet. To get them there: Site settings → Fonts → Google Fonts →
add `Host Grotesk` (300–800) and `DM Sans` (400–700).

### 2. Assets

Every `<img>` was created without a bound asset — Webflow only accepts images
that already exist in the site's asset library, and the build environment cannot
reach `figma.com` to upload them. Assets must be uploaded with the Webflow
Designer open (the `asset_tool` MCP bridge), then bound to the existing image
elements.

Figma asset URLs expire ~7 days after they are issued, so re-pull them from the
Figma MCP if this is picked up later.

| Element | Figma asset |
| --- | --- |
| `.hero_bg_theia` | `4bf10142-…svg` background vector |
| `.nav_logo-img_theia` | `359117c0-…svg` THEIA wordmark |
| `.nav_caret_theia` ×2 | `049d2fad-…svg` arrow-down |
| `.hero_tp-star_theia` | `4e8a0e4d-…svg` Trustpilot star |
| `.hero_tp-type_theia` | `983b14a7-…svg` Trustpilot wordmark |
| `.pill_icon_theia` ×5 | `b0a3ca66`, `2696b709`, `3a1ec8fe`, `ff5bbe62`, `b5331b61` |
| `.doccard_img_theia` blue | `26854eba-…png` |
| `.doccard_img_theia` violet + coral | `b7b42ab2-…png` |
| `.doccard_img_theia` olive + amber | `e282e0b3-…png` |
| `.doccard_badge-glyph_theia` | `9251e078` blue, `e2f518ae` violet, `b8fc28fd` coral, `bf691512` amber |

### 3. Slater

Load these dependencies, then the two files in this folder:

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15/dist/Draggable.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15/dist/InertiaPlugin.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15/dist/CustomEase.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15/dist/Observer.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15/dist/ScrollTrigger.min.js"></script>
```

- `radial-cards-slider.js` — Osmo base **plus** the requested behaviour changes
- `draggable-marquee.js` — Osmo base, unmodified

---

## Slider behaviour changes

The Osmo radial slider ships as a click/drag carousel. Four changes were made,
each marked `THEIA:` in the source:

1. **Autoplay.** A looping relative tween rotates the wheel continuously.
   `repeatRefresh: true` re-reads the relative target every loop so a drag never
   makes it snap back to a stale start value.
2. **No prev/next.** The buttons are simply absent from the Webflow markup. The
   control code is left intact, so adding dots or arrows later still works — the
   only addition is an `onComplete` that hands the wheel back to autoplay.
3. **Smooth hover pause.** Speed is a `timeScale` eased between 1 and 0 rather
   than a hard pause, so hovering coasts to a stop over `0.6s` and spins back up
   over `0.9s`.
4. **Drag interop.** Autoplay pauses on press and resyncs after the throw
   settles. A tap with no throw never fires `onThrowComplete`, so `onRelease`
   resyncs when `isThrowing` is false.

Tuning lives in the `THEIA_RADIAL` object at the top of the file.

---

## Decisions worth a second look

- **Nav and CTA are `position: fixed`.** The Figma frame is viewport-height and
  both pills are viewport-anchored, which reads as a floating nav plus a
  persistent booking CTA. If they should scroll away with the hero instead,
  change `position` to `absolute` on `.nav_theia` and `.hero_cta_theia`.
- **Card corner radius unified to 24px.** Figma has 27px on three cards and 20px
  on two, which looks like drift rather than intent.
- **No mobile nav yet.** `.nav_menu_theia` is hidden below 991px because the
  design has no mobile menu — the burger and its panel still need designing.
- **The arc is a compromise.** Figma's card rotations (±4°, ±7.3°) do not sit on
  the same circle as their positions, so no single radius reproduces both. The
  rotation was matched, since tilt reads more strongly than a ~20px difference in
  vertical drop. Adjust `--slider-radius` in the site custom code to taste.
