# Stellantis Paris 2026 – media service

Cloudflare Worker + R2 bucket that hosts the press materials of the
Mondial de l'Auto Paris 2026 press kit (Webflow site) and replaces Box.

- **Viewer** (`public/viewer.js`, `public/viewer.css`): branded grid + lightbox
  for photos, videos, PDFs and documents, "Download original" and
  "Download all" (ZIP built on the fly). Loaded by the Webflow document
  template when the CMS field **Media Folder** is filled.
- **Press Kit Manager** (`/upload`): password-protected. Everything is managed
  here, nobody needs to open Webflow:
  - pick a brand (the brands are the items of the Webflow **Events** collection);
  - **New document** creates the Webflow CMS item (title, category, description,
    technical sheet) as a draft, with its own media folder `brand/slug`;
  - drop files or whole folders (sub-folders are kept; no size limit: big files go
    up in 50 MB parts), rename or delete them; files can already be added in the
    New document window (a single dropped folder becomes the document);
  - edit the details, **Publish** / **Unpublish**, **Delete** (item + files).
  Thumbnails, previews, video posters and PDF covers are generated in the
  browser; the CRC-32 of every file is stored so ZIPs cost no Worker CPU.
  Files uploaded to a folder no document uses are listed under
  "Folders not linked to a document" with a one-click **Create document**.
- **Preview** (`/preview/?folder=fiat/photos`): the viewer outside Webflow.

## Live

- Worker: https://stl26-media.toolpress.workers.dev (bucket `stl26-media`)
- Upload: https://stl26-media.toolpress.workers.dev/upload/
- Webflow: `STL_MEDIA_HOST` set in the head code of **All Documents Template**;
  Box embed, Box CDN assets and the `box-auth-proxy` call removed. Documents
  without a Media Folder hide the viewer area.

## API

| Route | |
| --- | --- |
| `GET /api/list?folder=brand/folder` | public file list (JSON) |
| `GET /f/<key>` · `?dl` | file (range requests), `?dl` forces download |
| `GET /zip/<brand>/<folder>` · `?sub=` | streaming ZIP of the document (paths kept) or of one sub-folder |
| `POST /api/login` | `{password}` → session token (12 h) |
| `GET /api/admin/state` | brands, categories, documents (Webflow) + folder stats |
| `POST /api/admin/docs` | create a document (draft) |
| `PATCH/DELETE /api/admin/docs/:id` | edit (republished if live) / delete with its files |
| `POST /api/admin/docs/:id/publish` · `unpublish` · `folder` | publishing, media folder for older items |
| `DELETE /api/admin/folder` | delete a sub-folder, or a folder no document uses |
| `/api/admin/*` | upload, multipart, rename, delete file, folders (Bearer token) |

## Deploy

```bash
npm install
npx wrangler login                       # or CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID
npx wrangler r2 bucket create stl26-media
npx wrangler secret put UPLOAD_PASSWORD  # password for /upload
npx wrangler secret put TOKEN_SECRET     # any long random string
npx wrangler secret put WEBFLOW_TOKEN    # Webflow site API token: CMS read/write
npx wrangler deploy
```

Then set `STL_MEDIA_HOST` in the head code of the Webflow page
**All Documents Template** to the deployed URL (e.g.
`https://stl26-media.<account>.workers.dev` or a custom domain) and publish.

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
```
