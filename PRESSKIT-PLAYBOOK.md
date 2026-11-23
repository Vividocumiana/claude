# Press kit sites (Webflow + Cloudflare) – playbook

How the **Stellantis – Mondial de l'Auto Paris 2026** press kit was built (Sept–Oct 2026),
written so a new session can build the next one (e.g. **Maserati**) without the old chat.
Everything reusable is in `stellantis-media/`.

Live reference: https://stellantis-mondial-auto-paris-2026.com
(staging https://alfaromeopresskit-b75e626c62ba0a8ba3bb9.webflow.io).

## 1. What the site is

- **Webflow** site, duplicated from the old "Alfa Romeo presskit" template, all in English.
- **Home** (corporate): hero, a card for the main event ("Access Press Kit"), an **Info** section
  (`#info`), contacts. **Brands** page (`/brands`): grid of all brands, no anchors.
- **Brand page** (`/events/<slug>`, template "Events Template"): key visual, description,
  "Media Site" + social buttons, logo row of all brands, list of documents with filters
  (All / Photos / Videos / Documents / Under Embargo / Technical sheets, MixItUp).
- **Document page** (`/all-documents/<slug>`): title, badges (type, brand, embargo, technical
  sheet) and the **media viewer** (our own, files on Cloudflare R2: grid, lightbox, video, PDF,
  "Download original", "Download all" ZIP). Box was used at first and fully removed.
- **Contacts** (`/contact`): tabs per brand + "Corporate" tab first.
- **Timed password gate** (client-side, low security on purpose) until the embargo end, then public.
- **Own cookie banner** (no cookie-script / third-party CMP), Cookie Policy, Privacy Policy, Terms.
- Branded **404**, favicon/webclip, SEO titles and OG image on every page; QR code to the domain.
- **Press Kit Manager** (`https://<worker>/upload/`, Italian UI, password): the client never opens
  Webflow. They create documents, upload files/folders, edit brands and press contacts, publish.

## 2. CMS model (Webflow)

The template's "multimarket event" mechanism is reused as "multibrand":

| Collection | Use |
| --- | --- |
| **Events** | 1 *main event* (`main-event` = true, the show) + 1 item per brand (`multimarket-event` = true, `event-reference` = main event). Added fields: `sort-order`, `media-site-link`, `logo`, socials. Brand slug = URL `/events/<slug>`. |
| **Markets** | renamed "Brands": one per brand (used by contacts' `country` reference). |
| **All Documents** | press items: `tipologia-documento` (foto / video / documento / embargo), `descrizione`, `event` (brand), `media-folder` (R2 folder `brand/slug`), `brand` (slug text), `scheda-tecnica`. Old Box fields unused. |
| **Contacts** | press contacts: name, position, email, phone, `country` → Markets. |
| Private Areas, Schede | not used (Private Area pages set to draft). |

Stellantis IDs (site `6ab5f7c03bc1be2290997e01`): Events `…df3`, Markets `…df4`, Contacts `…df5`,
All Documents `…df6`; pages Home `…dd7`, Brands `…ddf`, Contact `…de2`, Events Template `…dde`,
All Documents Template `…de3`, Cookie `…de6`, Privacy `…de7`, Terms `…de8`, 404 `…de9`
(prefix `6ab5f7c03bc1be229099`). **A new site has different IDs: always look them up.**

## 3. Where the code lives

| What | File |
| --- | --- |
| Site head code (nav fix, brand logo row, password gate) | `stellantis-media/site/webflow-code/site-head.html` |
| Site footer code (cookie banner) | `stellantis-media/site/cookie-policy/site-footer.html` |
| Brand page (Events Template) head + footer | `stellantis-media/site/webflow-code/brand-template.html` |
| Document page (All Documents Template) head | `stellantis-media/site/webflow-code/document-template.html` |
| Contact page + 404 | `stellantis-media/site/webflow-code/contact-and-404.html` |
| Cookie / Privacy policy texts | `stellantis-media/site/cookie-policy/`, `site/privacy-policy/` |
| Brand covers generator, favicon | `stellantis-media/site/covers/`, `site/favicon/` |
| Media service (Worker, viewer, Press Kit Manager, tests) | `stellantis-media/` – read its `README.md` |

Elements the code expects on the Webflow pages (create them in the Designer / via MCP):
- brand template: hidden text `.ev-slug` bound to the document's Event slug inside each list item;
  a collection list with attribute `data-brandbar` (links `data-bb-link`, image `data-bb-logo`,
  name `data-bb-name`, hidden slug `data-bb-slug`) for the logo row;
- document template: hidden text with attribute `data-media-folder` bound to **Media Folder**;
  hidden text `data-doc-cat` bound to the type (embargo badge); Embed `<div class="stl-media"></div>`
  in `.box-container`;
- contact page: corporate list (`.collection-list-wrapper-2`) and lists with `data-brand-tab="<Brand>"`
  in `.timeline-top`.

## 4. Recipe for a new press kit (e.g. Maserati)

Ask the client first (checklist in §6). Then:

1. **Webflow**: duplicate the Stellantis site (best: it already has everything) into the agency
   workspace, rename it. Connect the Webflow MCP to the new site. Note the new site/page/collection IDs.
2. **Brand**: logo SVG (dark + white), brand colour → Webflow variable `BrandColor` and every hard-coded
   `#243782` / `#1a2862` in the code files and in `stellantis-media/public/*.css`; font (`--mainfont`).
   Replace logo in navbar + footer components, 404, gate, favicon/webclip, OG image.
3. **Texts**: replace "Stellantis", "Mondial de l'Auto Paris 2026", dates, hall, socials in pages,
   components, SEO titles and in the code files (tab-title scripts, gate texts, cookie texts).
   If it is a single brand (Maserati) the "brands" become *models / topics / days*, or keep one
   brand item and use document categories; decide with the client (§6).
4. **CMS**: delete Stellantis items; create main event + one Events item per brand/section with
   `sort-order`; Markets items; contacts; a few `[TEST]` documents to try the layout.
5. **Custom code**: paste the files of §3 with the new values: `STL_MEDIA_HOST`, gate `UNLOCK_AT`,
   `HASH` (= `printf 'password' | sha256sum`), `KEY` (unique, e.g. `mas27_access`), cookie name
   (`stl26_consent` → new), logo URLs, contact tab names.
6. **Media service**: copy `stellantis-media/` to `<client>-media/`, then in `wrangler.jsonc` change
   `name`, bucket name, `SITE_URL`, collection IDs and `CMS_COLLECTIONS` (ids, defaults incl.
   `event-reference` and `status` option IDs, `createRef` collection). Brand list/labels in
   `public/upload/upload.js` and `src/webflow.js` (field slugs `F`) if fields differ. Covers/favicons
   in `public/upload/`. Deploy (README → Deploy): needs `CLOUDFLARE_API_TOKEN`,
   `CLOUDFLARE_ACCOUNT_ID` in the session environment and `api.cloudflare.com` allowed; secrets
   `UPLOAD_PASSWORD`, `TOKEN_SECRET`, `WEBFLOW_TOKEN` (Webflow site API token, CMS read/write).
   Cloudflare account: `toolpress` (workers.dev subdomain), R2 enabled; cost ≈ 0 (downloads free).
7. **Legal**: cookie banner follows the client's cookie requirements (Stellantis gave a docx; ask
   Maserati/Stellantis legal for theirs); Privacy (controller entity, email), Terms (governing law).
8. **Publish + QA** (§5), custom domain + Webflow site plan (removes "Made in Webflow"), QR code.
9. After the event: unlock date passes by itself; usage report (`site/report/` is the template);
   empty the R2 bucket when the site is closed.

## 5. QA checklist (done with Playwright in the session)

- In the cloud session `cdn.prod.website-files.com` and Google/Box CDNs are blocked: route
  `cdn.prod.website-files.com/…` to `webflow-prod-assets.s3.amazonaws.com/…`, serve jQuery/MixItUp
  from npm, `ignoreHTTPSErrors: true`, retry page loads. Chromium: `/opt/pw-browsers/...`.
- Crawl every page: 200, no broken images, no leftover old-brand text, no mobile horizontal overflow
  (390 px), menu open/close on mobile, hovers in brand colour (no leftover red).
- Gate shows, wrong password errors, right one unlocks; cookie banner: reject/accept/settings, link in
  footer, choice remembered.
- Brand page: only its documents, filters, embargo badge; document page: viewer, lightbox, video,
  PDF, ZIP (`unzip -t`), embargo/technical sheet badges.
- Press Kit Manager e2e: `stellantis-media/test/e2e*.mjs` against `wrangler dev` + `mock-webflow.mjs`.
- Webflow API rate limit (429): wait ~60 s and retry. `set_text` doesn't work on div text: use
  `set_settings` key `text`. Publishing CMS items needs their referenced items published first.

## 6. What to ask the client

Brand list (or sections) and order · logos SVG · cover per brand (1920×1080, subject centred) ·
one-line description per brand · Media Site / social links · photos, videos, documents, embargo items
and their release date/time · press contacts (name, role, email, phone) · info section (venue, hall,
press conference times, accreditation) · password + unlock date/time · domain (who buys it, DNS) and
who pays the Webflow plan · cookie/privacy requirements, controller entity, governing law ·
analytics wanted? · who uploads during the event (client via Press Kit Manager, or us).
