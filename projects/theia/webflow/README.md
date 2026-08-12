# Theia — Hero section (Webflow)

Built from Figma `Theia` → node `20609:159` ("Proposal 2 Desktop") into the
Webflow site **Theia New** (`theia-new`), page **Home**.

All classes are suffixed `_theia`; variants are combo classes (`is-blue_theia`,
`is-plain_theia`, …) so nothing can collide with future work on the site.

---

## Structure

```
body
├── section.hero_theia
│   ├── img.hero_bg_theia                 background vector
│   ├── div.nav_theia                     fixed top nav pill
│   ├── div.hero_inner_theia              rating + h1 + subcopy
│   ├── div.marquee_wrap_theia            credential pills + edge fades
│   ├── div.radial_theia                  5 doctor cards on an arc
│   └── a.hero_cta_theia                  fixed bottom CTA pill
└── div.codes_theia  ("codes")
    ├── embed  code / global — deps + base
    ├── embed  code / marquee — style + script
    └── embed  code / radial slider — style + script
```

Card order in the DOM is **not** left-to-right. The script places item 0 at the
centre and fans the rest out as offsets `0, +1, +2, −2, −1`, so the DOM order
`blue → violet → coral → olive → amber` renders as the Figma order
`olive, amber, blue, violet, coral` left-to-right.

---

## Sizing system — no fixed pixels

Two rules carry the whole layout.

**1. Fluid rem via `clamp()`.** Every root-level size interpolates between a
20rem (320px) and a 90rem (1440px) viewport, holding flat outside that range:

| Role | Value |
| --- | --- |
| small text | `clamp(0.875rem, 0.8393rem + 0.1786vw, 1rem)` |
| lead text | `clamp(1rem, 0.9643rem + 0.1786vw, 1.125rem)` |
| display | `clamp(2.125rem, 1.4464rem + 3.3929vw, 4.5rem)` |
| page gutter | `clamp(1.25rem, 0.4643rem + 3.9286vw, 4rem)` |
| card scale | `clamp(0.9375rem, 0.7885rem + 0.745vw, 1.459rem)` |

**2. Components scale as one block.** Each component sets its own fluid
`font-size` and lays its internals out in `em`. A doctor card is `16em` wide
with every inset, radius, gap and label expressed against that same em, so the
card resizes as a single object rather than as loose parts drifting apart.
The nav, the pills and the CTA work the same way.

Consequences worth knowing:

- Widths that were fixed in Figma became ratios: the headline is `60.3%` and
  the subcopy `32.45%` of the container, which is exactly their Figma ratio.
- Letter-spacing and line-height are unitless or `em`, so they track font size
  instead of breaking at odd viewports.
- Hairlines stay at `0.0625rem` — borders should not scale with the layout, but
  they should still respond to a user's root font-size preference.
- Media queries now carry **layout changes only** — `width: 100%`,
  `display: none`, `flex-direction: column`. There is not a single pixel
  sizing override left to fight the fluid scale.

The slider arc scales the same way: `--slider-radius` is a percentage of card
height, so the wheel's geometry is proportional at every width. Only the
angular step is tuned per breakpoint, because a tighter screen wants a denser
arc, not merely a smaller one.

---

## The `codes` div

All component CSS and JS live in HTML embeds inside a `codes` div at the end of
the body, one embed per component. Page-level custom code returns HTTP 406 on
this site's plan, so embeds are also the only writable place for the
attribute-driven CSS the sliders need.

Order matters: the **global** embed loads GSAP and its plugins, so the two
component embeds below it can rely on those globals being present.

Site settings → Custom code → Head holds **only** the Google Fonts links, which
need to resolve before first paint.

To move a component to Slater later, replace that embed's `<script>` body with a
`<script src>` — the `<style>` block stays where it is.

---

## Slider behaviour changes

The Osmo radial slider ships as a click/drag carousel. Five changes were made,
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
5. **Reduced motion.** `prefers-reduced-motion: reduce` leaves the wheel static
   and draggable; the marquee stops looping entirely.

Tuning lives in the `THEIA_RADIAL` object at the top of the file.

---

## Assets — still outstanding

Every `<img>` element exists but has no bound asset. Webflow only accepts images
already present in the site's asset library, and there are exactly two ways in:

- **Designer bridge.** `asset_tool` has Webflow's own servers fetch the Figma
  URL. It needs the Designer opened through the MCP app link — having the
  Designer merely open is not enough, the app has to be running inside it.
- **Manual upload.** Export from Figma, drag into the Webflow asset manager.
  The assets API is readable headlessly, so binding them to the right elements
  afterwards is automatic and needs no Designer.

Downloading the bytes here and pushing them over the REST API is **not**
available: `www.figma.com` is blocked by this environment's egress policy
(403 on CONNECT), and the proxy documentation is explicit that policy denials
must be reported rather than routed around.

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

---

## Also outstanding

**Fonts.** `Host Grotesk` and `DM Sans` load from Google Fonts, so the page
renders correctly on publish, but they are not in the Webflow style panel
dropdown. Add them under Site settings → Fonts → Google Fonts:
Host Grotesk 300–800, DM Sans 400–700.

---

## Decisions worth a second look

- **Nav and CTA are `position: fixed`.** Both are viewport-anchored in Figma,
  which reads as a floating nav plus a persistent booking CTA. One property to
  flip if they should scroll away with the hero instead.
- **Card corner radius unified.** Figma has 27px on three cards and 20px on two,
  which looks like drift rather than intent.
- **No mobile nav yet.** `.nav_menu_theia` is hidden below 991px because the
  design has no mobile menu — the burger and its panel still need designing.
- **The arc is a compromise.** Figma's card rotations (±4°, ±7.3°) do not sit on
  the same circle as their positions, so no single radius reproduces both. The
  rotation was matched, since tilt reads more strongly than a ~20px difference in
  vertical drop.
