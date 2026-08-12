# Theia hero — asset upload & binding (run this locally)

The hero section is already built in Webflow: structure, classes, fluid styles
and the `codes` embeds are all in place. The only thing missing is the images.

Every `<img>` element exists but has no bound asset. Webflow only accepts images
already in the site's asset library, and putting them there goes through
`asset_tool`, which needs the Designer bridge — and that bridge only works when
the MCP server runs on the same machine as the browser. A remote session cannot
reach it, which is why this step is a local one.

Everything below is a single job: upload 17 assets, bind them to 20 image
elements.

---

## IDs

| | |
| --- | --- |
| Site | `6a759e0a6e6f2aee302e20c2` — Theia New |
| Page | `6a759e0c6e6f2aee302e2100` — Home |
| Workspace | `fedevivido-workspace` |

## Before starting

Open the Webflow Designer for Theia New with the MCP app running, and keep that
tab in the foreground while the upload runs.

⚠️ **The Figma URLs below expire around 19 Aug 2026** (7 days from issue). If
they 404, re-pull them with the Figma MCP from node `20609:159` of file
`QhvR97sXKVaejwSOodCrNX` and substitute — the mapping stays the same.

---

## Step 1 — upload the 17 assets

`asset_tool > upload_image_by_url`, site `6a759e0a6e6f2aee302e20c2`.
Batch them 5–6 at a time; the bridge is slow with long batches.

| Asset name | URL |
| --- | --- |
| `theia-hero-bg-vector` | `https://www.figma.com/api/mcp/asset/4bf10142-fbdf-41eb-8a6f-799fb5c71111.svg` |
| `theia-logo` | `https://www.figma.com/api/mcp/asset/359117c0-f350-423f-b352-42e3d8817633.svg` |
| `theia-icon-arrow-down` | `https://www.figma.com/api/mcp/asset/049d2fad-38cd-4911-91f8-d82df84ed384.svg` |
| `theia-trustpilot-star` | `https://www.figma.com/api/mcp/asset/4e8a0e4d-845b-437f-95de-d360ee2e06df.svg` |
| `theia-trustpilot-wordmark` | `https://www.figma.com/api/mcp/asset/983b14a7-0669-418b-9658-46295384f2c0.svg` |
| `theia-pill-1` | `https://www.figma.com/api/mcp/asset/b0a3ca66-6d19-4303-8823-80b7406116b8.svg` |
| `theia-pill-2` | `https://www.figma.com/api/mcp/asset/2696b709-c861-464c-bf7e-d2857587f933.svg` |
| `theia-pill-3` | `https://www.figma.com/api/mcp/asset/3a1ec8fe-ed10-4435-8754-9e6a94bc87f0.svg` |
| `theia-pill-4` | `https://www.figma.com/api/mcp/asset/ff5bbe62-7e7a-42ae-8a9b-45ff20644c83.svg` |
| `theia-pill-5` | `https://www.figma.com/api/mcp/asset/b5331b61-82de-4413-b3e0-ac68030e6f30.svg` |
| `theia-doctor-blue` | `https://www.figma.com/api/mcp/asset/26854eba-81d7-4f75-b81c-6b966f99dae3.png` |
| `theia-doctor-violet` | `https://www.figma.com/api/mcp/asset/b7b42ab2-829f-46f1-9153-f39fc2ac1bb3.png` |
| `theia-doctor-amber` | `https://www.figma.com/api/mcp/asset/e282e0b3-8cf8-4841-98e0-71dafa590ac0.png` |
| `theia-badge-blue` | `https://www.figma.com/api/mcp/asset/9251e078-6107-4289-a927-7cadfe913134.svg` |
| `theia-badge-violet` | `https://www.figma.com/api/mcp/asset/e2f518ae-c8f5-49c7-a5b4-cee194ab4c08.svg` |
| `theia-badge-coral` | `https://www.figma.com/api/mcp/asset/b8fc28fd-b519-472e-b071-29e693428ceb.svg` |
| `theia-badge-amber` | `https://www.figma.com/api/mcp/asset/bf691512-2dd5-4b55-9e50-0ac4b63d3f35.svg` |

Then `data_assets_tool > list_assets` to collect the asset IDs.

---

## Step 2 — bind them to the image elements

Find elements with `data_element_tool > query_elements` filtering on
`element_filter.style`, then bind with `set_image_asset`.

**Order matters** where a class repeats. `query_elements` returns elements in
document order, and the DOM order is not the visual left-to-right order for the
slider — see the note below.

| Class | Count | Asset, in document order |
| --- | --- | --- |
| `hero_bg_theia` | 1 | `theia-hero-bg-vector` |
| `nav_logo-img_theia` | 1 | `theia-logo` |
| `nav_caret_theia` | 2 | `theia-icon-arrow-down` on both |
| `hero_tp-star_theia` | 1 | `theia-trustpilot-star` |
| `hero_tp-type_theia` | 1 | `theia-trustpilot-wordmark` |
| `pill_icon_theia` | 5 | `theia-pill-1` … `theia-pill-5` |
| `doccard_img_theia` | 5 | blue, violet, **violet**, amber, **amber** |
| `doccard_badge-glyph_theia` | 4 | blue, violet, coral, amber |

Two things that look like mistakes but are not:

- **`doccard_img_theia` reuses two photos.** There are five cards but only three
  photos: `theia-doctor-violet` covers cards 2 and 3, `theia-doctor-amber`
  covers cards 4 and 5. That matches the Figma design.
- **`doccard_badge-glyph_theia` has 4 entries, not 5.** The olive card
  ("Medico Oncologo", 4th in DOM order) uses the `is-plain_theia` badge variant,
  which is a plain labelled box with no icon.

### Why DOM order ≠ visual order

The radial slider places item 0 at the centre of the arc and fans the rest out
as offsets `0, +1, +2, −2, −1`. So DOM order `blue, violet, coral, olive, amber`
renders left-to-right as `olive, amber, blue, violet, coral`. Bind by DOM order
as tabulated above and it will look right on canvas.

---

## Step 3 — verify

1. `query_elements` for each class above and confirm every image element now
   reports a bound asset.
2. Publish to `theia-new.webflow.io` and check: the arc renders with the blue
   card centred, the marquee scrolls and stops smoothly on hover, and dragging
   the cards works.

---

## Still open after this

- **Fonts.** Host Grotesk and DM Sans currently load from Google Fonts via the
  site head custom code, so the page renders correctly, but they are not in the
  Webflow style panel dropdown. Add them under Site settings → Fonts → Google
  Fonts: Host Grotesk 300–800, DM Sans 400–700.
- **Mobile nav.** `.nav_menu_theia` is hidden below 991px because the design has
  no mobile menu yet.

See `README.md` in this folder for the full build: structure, the fluid sizing
system, the `codes` embeds, and the slider behaviour changes.
