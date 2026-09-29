# Stellantis Paris 2026 – media service

Cloudflare Worker + R2 bucket that hosts the press materials of the
Mondial de l'Auto Paris 2026 press kit (Webflow site) and replaces Box.

- **Viewer** (`public/viewer.js`, `public/viewer.css`): branded grid + lightbox
  for photos, videos, PDFs and documents, "Download original" and
  "Download all" (ZIP built on the fly). Loaded by the Webflow document
  template when the CMS field **Media Folder** is filled.
- **Upload page** (`/upload`): password-protected. Pick a brand, create a
  folder, drag & drop files (no size limit: big files go up in 50 MB parts).
  Thumbnails, previews, video posters and PDF covers are generated in the
  browser; the CRC-32 of every file is stored so ZIPs cost no Worker CPU.
- **Preview** (`/preview/?folder=fiat/photos`): the viewer outside Webflow.

## API

| Route | |
| --- | --- |
| `GET /api/list?folder=brand/folder` | public file list (JSON) |
| `GET /f/<key>` · `?dl` | file (range requests), `?dl` forces download |
| `GET /zip/<brand>/<folder>` | streaming ZIP of the folder |
| `POST /api/login` | `{password}` → session token (12 h) |
| `/api/admin/*` | upload, multipart, delete, folders (Bearer token) |

## Deploy

```bash
npm install
npx wrangler login                       # or CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID
npx wrangler r2 bucket create stl26-media
npx wrangler secret put UPLOAD_PASSWORD  # password for /upload
npx wrangler secret put TOKEN_SECRET     # any long random string
npx wrangler deploy
```

Then set `STL_MEDIA_HOST` in the head code of the Webflow page
**All Documents Template** to the deployed URL (e.g.
`https://stl26-media.<account>.workers.dev` or a custom domain) and publish.

## Local development

```bash
printf 'UPLOAD_PASSWORD="test"\nTOKEN_SECRET="dev"\n' > .dev.vars
npx wrangler dev          # local R2, http://localhost:8787/upload/
node test/zip.test.mjs && node test/zip64.test.mjs /tmp/t64.zip
```
