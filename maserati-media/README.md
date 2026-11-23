# Maserati – FaSTLAne 2030 / Maserati Day – media service

Copy of `stellantis-media/` adapted for the Maserati press kit (10 December 2026, English only).
How the whole thing works: `../PRESSKIT-PLAYBOOK.md` and `../stellantis-media/README.md`.

- Site: https://fastlane-2030-maserati-day-2026.com (Webflow duplicate of "Stellantis Mondial Auto Paris 2026")
- Worker / bucket: `mas26-media` (planned URL https://mas26-media.toolpress.workers.dev, upload at `/upload/`)
- The Stellantis "brands" are the 6 **models**, in this order: Concept, Grecale, GranTurismo, GranCabrio,
  MCPura, GT2 Stradale (Events items, `sort-order` 1–6). The Press Kit Manager calls them "Modelli".
- Top row: Maserati logo + the 6 model names (the "Logo" field of a model takes the render when it exists).
- Contacts: HQ only, no tabs; new contacts get the HQ Markets item by default.
- No "Info" link in the navbar. Embargo notice on every page and on the gate:
  "Contents under embargo until 10/12/2026 7:00 p.m."
- Storage keys: gate `mas26_access`, cookie `mas26_consent`.

## Webflow IDs

Site `6b045175d646a29758a3b1b6` ("Copy of Stellantis Mondial Auto Paris 2026", workspace `66cfb3b0e610bf8a12df2fb9`).
Collections (prefix `6b045175d646a29758a3b`): Events `…1a5`, Markets `…1a6`, Contacts `…1a7`, All Documents `…1a8`.
Pages: Home `…18d`, Models (`/models`, was Brands) `…195`, Contact `…198`, Events Template `…194`,
All Documents Template `…199`, Cookie `…19c`, Privacy `…19d`, Terms `…19e`, 404 `…19f`.
Items: main event `…25d` (slug `fastlane-2030-maserati-day`), Markets "Maserati HQ" `…269`;
models `concept`, `grecale`, `granturismo`, `grancabrio`, `mcpura`, `gt2-stradale` (sort-order 1–6).

## Status (23 Nov 2026): staging only, domain NOT connected

Staging: https://stellantis-mondial-auto-p-ca5c2043669e4.webflow.io (rename the subdomain in Webflow).
Gate and upload password: temporary. Colours: option 3 (night blue `#131B2C`, red `#B3121F`), draft to be confirmed.
Worker deployed: https://mas26-media.toolpress.workers.dev (bucket `mas26-media`).

Open points:

| What | Where |
| --- | --- |
| `WEBFLOW_TOKEN` secret is rejected by Webflow (401/403): create a site API token on THIS site (CMS read/write) and `npx wrangler secret put WEBFLOW_TOKEN` | Press Kit Manager cannot list models/documents until then |
| Final passwords, unlock time confirmed | gate `HASH`/`UNLOCK_AT` in `site/webflow-code/site-head.html` (+ embargo notice), `UPLOAD_PASSWORD` secret |
| Colour confirmation; light tint `#2536831a` still on a few badge styles in Webflow | Webflow variable `BrandColor`, code files, `public/*.css` |
| Model covers (now the event key visual as placeholder), descriptions, renders for the models row | Events items (`event-key-visual`, `event-description`, `logo`) |
| Key visual at full quality (now the 2000 px copy from chat) | `site/covers/`, `public/upload/cover*.webp`, `og.jpg` |
| Favicon / webclip: upload by hand (no API) | `site/favicon/` |
| Legal pages: see `site/webflow-code/legal-pages.md` | Webflow |
| e2e fixtures still use Stellantis brand names; e2e not run for this copy | `test/mock-webflow.mjs`, `test/e2e-cms.mjs` |
| Document page (viewer, lightbox, video, PDF, ZIP) not tested: no documents yet | — |
| Media Site link of the models = https://www.media.stellantis.com/em-en/maserati (to confirm) | Events items |

## API

| Route | |
| --- | --- |
| `GET /api/list?folder=brand/folder` | public file list (JSON) |
| `GET /api/sheets` | slugs of the documents flagged "Technical sheet" |
| `GET /f/<key>` · `?dl` | file (range requests), `?dl` forces download |
| `GET /zip/<brand>/<folder>` · `?sub=` | streaming ZIP of the document (paths kept) or of one sub-folder |
| `POST /api/login` | `{password}` → session token (12 h) |
| `GET /api/admin/state` | brands, categories, documents (Webflow) + folder stats |
| `POST /api/admin/docs` | create a document (draft) |
| `PATCH/DELETE /api/admin/docs/:id` | edit (republished if live) / delete with its files |
| `POST /api/admin/docs/:id/publish` · `unpublish` · `folder` | publishing, media folder for older items |
| `/api/admin/cms/<key>[/<id>[/publish\|unpublish]]` | other collections (brands, press contacts) |
| `POST /api/admin/image?name=` | image for a CMS image field (body = file, max 8 MB) → `{ url }` |
| `DELETE /api/admin/folder` | delete a sub-folder, or a folder no document uses |
| `/api/admin/*` | upload, multipart, rename, delete file, folders (Bearer token) |

## Deploy

```bash
npm install
npx wrangler login                       # or CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID
npx wrangler r2 bucket create mas26-media
npx wrangler secret put UPLOAD_PASSWORD  # password for /upload
npx wrangler secret put TOKEN_SECRET     # any long random string
npx wrangler secret put WEBFLOW_TOKEN    # Webflow site API token: CMS read/write
npx wrangler deploy
```

Then set `STL_MEDIA_HOST` in the head code of the Webflow page
**All Documents Template** to the deployed URL (e.g.
`https://mas26-media.<account>.workers.dev` or a custom domain) and publish.

Collection IDs and the site URL are `vars` in `wrangler.jsonc`.

## Reliability

- Webflow calls are retried on rate limits (429) and outages (5xx, network).
- In the page every request has a timeout and is retried on network errors;
  every retried operation is safe to repeat (rename and delete are idempotent),
  creating a document is never sent twice.
- If Webflow is down the manager says so and still lets you manage files.
- The Webflow field slugs used are in `src/webflow.js` (`F`).

## Local development

```bash
printf 'UPLOAD_PASSWORD="test"\nTOKEN_SECRET="dev"\nWEBFLOW_TOKEN="test-token"\nWEBFLOW_API="http://localhost:9911/v2"\n' > .dev.vars
node test/mock-webflow.mjs 9911 flaky &   # fake Webflow CMS API, 25% of calls answer 429
npx wrangler dev          # local R2, http://localhost:8787/upload/ (password: test)
node test/zip.test.mjs && node test/zip64.test.mjs /tmp/t64.zip
# browser end-to-end (needs `npm i --no-save playwright`), see the header of the file
BASE=http://localhost:8787 PW=test FILES=/path/to/fixtures node test/e2e.mjs
BASE=http://localhost:8787 PW=test FIXTURES=/path/to/fixtures node test/e2e-folders.mjs
BASE=http://localhost:8787 PW=test node test/e2e-cms.mjs
```

## Brand pages and the "Brand" field

Documents carry a plain-text **Brand** field (brand slug) filled by the manager
(new documents, and any missing value every time the manager opens). The
documents list of the Events template is filtered by `Brand = current Event's
Slug`, so each brand page can list up to 100 documents of its own brand.
