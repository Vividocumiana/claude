// Stellantis – Mondial de l'Auto Paris 2026 media service.
// Serves press materials stored in R2 to the Webflow site (public, read-only API)
// and powers the password-protected /upload page.
//
// Storage layout in the bucket:
//   <brand>/<folder>/<file>                      original files
//   _derived/<brand>/<folder>/<file>.thumb.jpg   grid thumbnail (made in the browser at upload)
//   _derived/<brand>/<folder>/<file>.preview.jpg large preview / video poster

import { zipPlan, streamZip } from "./zip.js";
import { Webflow } from "./webflow.js";

const DERIVED = "_derived/";
const TOKEN_TTL = 12 * 3600 * 1000;

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const p = url.pathname;
    try {
      if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
      if (p === "/upload" || p === "/upload/") return env.ASSETS.fetch(new Request(new URL("/upload/index.html", url), req));
      if (p === "/preview" || p === "/preview/") return env.ASSETS.fetch(new Request(new URL("/preview/index.html", url), req));
      if (p.startsWith("/f/")) return await serveFile(req, env, decodeKey(p.slice(3)), url.searchParams.has("dl"));
      if (p.startsWith("/zip/")) return await serveZip(req, env, ctx, cleanFolder(decodeURIComponent(p.slice(5))), url.searchParams.get("sub") || "");
      if (p === "/api/list") return cors(json(await listFolder(env, cleanFolder(url.searchParams.get("folder") || ""), url.origin)));
      if (p === "/api/login" && req.method === "POST") return await login(req, env);
      if (p.startsWith("/api/admin/")) {
        if (!(await authorized(req, env))) return json({ error: "Unauthorized" }, 401);
        return await admin(req, env, url, p.slice(11));
      }
      return env.ASSETS.fetch(req);
    } catch (e) {
      if (!e.status) console.error(e);
      return cors(json({ error: e.status ? e.message : "Server error: " + (e.message || "unknown"), }, e.status || 500));
    }
  },
};

// ---------- helpers ----------
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
function cors(res) {
  const r = new Response(res.body, res);
  r.headers.set("access-control-allow-origin", "*");
  r.headers.set("access-control-allow-methods", "GET, HEAD, OPTIONS");
  r.headers.set("access-control-allow-headers", "range");
  r.headers.set("access-control-expose-headers", "content-length, content-range, accept-ranges");
  return r;
}
function fail(msg, status = 400) { const e = new Error(msg); e.status = status; throw e; }
function decodeKey(s) { return s.split("/").map(decodeURIComponent).join("/"); }
function encodeKey(k) { return k.split("/").map(encodeURIComponent).join("/"); }

// "Fiat / Photos 2026" -> "fiat/photos-2026"
function slug(s) {
  return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function slugPart(s) { return String(s).split("/").map(slug).filter(Boolean).join("-"); }
function cleanFolder(f) {
  const parts = String(f).split("/").map(slug).filter(Boolean);
  if (parts.length > 4) fail("Folder too deep");
  return parts.join("/");
}
function cleanName(n) {
  const name = String(n).replace(/[\\/\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim().slice(0, 180);
  if (!name || name.startsWith(".")) fail("Invalid file name");
  return name;
}
// "Press photos/Day 1/img.jpg": every segment cleaned like a file name
function cleanPath(p) {
  const parts = String(p).split("/").map((x) => x.replace(/[\\\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  if (!parts.length || parts.length > 8) fail("Invalid file name");
  const out = parts.map(cleanName).join("/");
  if (out.length > 700) fail("File path too long");
  return out;
}
// Media folder of a document = first two segments (brand/document)
function docFolderOf(key) { return key.split("/").slice(0, 2).join("/"); }
function kindOf(name, type) {
  const ext = name.split(".").pop().toLowerCase();
  if (/^image\//.test(type) || ["jpg", "jpeg", "png", "webp", "gif", "tif", "tiff", "heic", "avif"].includes(ext)) return "image";
  if (/^video\//.test(type) || ["mp4", "mov", "m4v", "webm"].includes(ext)) return "video";
  if (ext === "pdf" || type === "application/pdf") return "pdf";
  return "doc";
}

// ---------- public ----------
async function listAll(env, prefix) {
  const out = [];
  let cursor;
  do {
    const r = await env.MEDIA.list({ prefix, cursor, include: ["customMetadata", "httpMetadata"] });
    out.push(...r.objects);
    cursor = r.truncated ? r.cursor : undefined;
  } while (cursor);
  return out;
}

async function listFolder(env, folder, origin) {
  if (!folder) fail("Missing folder");
  const prefix = folder + "/";
  const [objs, derived] = await Promise.all([listAll(env, prefix), listAll(env, DERIVED + prefix)]);
  const have = new Set(derived.map((o) => o.key));
  const files = objs
    .map((o) => {
      const path = o.key.slice(prefix.length), name = path.split("/").pop(), dir = path.slice(0, Math.max(0, path.length - name.length - 1));
      const m = o.customMetadata || {};
      const type = (o.httpMetadata && o.httpMetadata.contentType) || "application/octet-stream";
      const t = DERIVED + o.key + ".thumb.jpg", pv = DERIVED + o.key + ".preview.jpg";
      return {
        key: o.key, name, path, dir, size: o.size, type, kind: kindOf(name, type), uploaded: o.uploaded,
        width: +m.w || null, height: +m.h || null, duration: +m.dur || null, pages: +m.pages || null,
        url: origin + "/f/" + encodeKey(o.key),
        download: origin + "/f/" + encodeKey(o.key) + "?dl",
        thumb: have.has(t) ? origin + "/f/" + encodeKey(t) : null,
        preview: have.has(pv) ? origin + "/f/" + encodeKey(pv) : null,
        zippable: !!m.crc32,
      };
    })
    .sort((a, b) => (a.dir ? 1 : 0) - (b.dir ? 1 : 0) || a.dir.localeCompare(b.dir, "en", { numeric: true }) || a.name.localeCompare(b.name, "en", { numeric: true }));
  const total = files.reduce((s, f) => s + f.size, 0);
  const zipOf = (list, sub) => {
    const z = list.filter((f) => f.zippable);
    return z.length > 1 ? { url: origin + "/zip/" + folder + (sub ? "?sub=" + encodeURIComponent(sub) : ""), count: z.length, size: z.reduce((s, f) => s + f.size, 0) } : null;
  };
  // Sub-folders (first level) with their own "download folder" ZIP
  const dirs = [...new Set(files.filter((f) => f.dir).map((f) => f.dir.split("/")[0]))].map((d) => {
    const inside = files.filter((f) => f.dir === d || f.dir.startsWith(d + "/"));
    return { name: d, count: inside.length, size: inside.reduce((s, f) => s + f.size, 0), zip: zipOf(inside, d) };
  });
  return { folder, count: files.length, total, files, dirs, zip: zipOf(files, "") };
}

async function serveFile(req, env, key, asDownload) {
  if (!key || key.includes("..")) fail("Not found", 404);
  const range = req.headers.get("range");
  const obj = await env.MEDIA.get(key, { range: req.headers, onlyIf: req.headers });
  if (!obj) return cors(new Response("Not found", { status: 404 }));
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set("etag", obj.httpEtag);
  h.set("accept-ranges", "bytes");
  h.set("cache-control", key.startsWith(DERIVED) ? "public, max-age=86400" : "public, max-age=300");
  const name = key.split("/").pop().replace(/\.(thumb|preview)\.jpg$/, "");
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
  h.set("content-disposition", `${asDownload ? "attachment" : "inline"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`);
  if (!("body" in obj)) return cors(new Response(null, { status: 304, headers: h }));
  if (range && obj.range) {
    const { offset = 0, length = obj.size - offset } = obj.range;
    h.set("content-range", `bytes ${offset}-${offset + length - 1}/${obj.size}`);
    h.set("content-length", String(length));
    return cors(new Response(obj.body, { status: 206, headers: h }));
  }
  h.set("content-length", String(obj.size));
  return cors(new Response(obj.body, { headers: h }));
}

async function serveZip(req, env, ctx, folder, sub) {
  if (!folder) fail("Not found", 404);
  const base = folder + "/";
  const prefix = base + (sub ? cleanPath(sub) + "/" : "");
  const objs = (await listAll(env, prefix)).filter((o) => o.customMetadata && o.customMetadata.crc32);
  if (!objs.length) return cors(new Response("Not found", { status: 404 }));
  // Paths inside the ZIP keep the sub-folders (relative to the downloaded folder)
  const entries = objs.map((o) => ({ key: o.key, name: o.key.slice(prefix.length), size: o.size, crc: parseInt(o.customMetadata.crc32, 16) >>> 0, date: new Date(o.uploaded) }));
  const plan = zipPlan(entries);
  const { readable, writable } = new FixedLengthStream(plan.total);
  ctx.waitUntil(streamZip(plan, writable, (key) => env.MEDIA.get(key)));
  const fname = "stellantis-paris-2026-" + (folder + (sub ? "-" + slugPart(sub) : "")).replace(/\//g, "-") + ".zip";
  return cors(new Response(readable, {
    headers: { "content-type": "application/zip", "content-length": String(plan.total), "content-disposition": `attachment; filename="${fname}"`, "cache-control": "no-store" },
  }));
}

// ---------- auth ----------
async function hmac(env, msg) {
  const secret = env.TOKEN_SECRET || "stl26:" + (env.UPLOAD_PASSWORD || "");
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/[+/=]/g, (c) => ({ "+": "-", "/": "_", "=": "" }[c]));
}
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
async function login(req, env) {
  if (!env.UPLOAD_PASSWORD) return json({ error: "Upload password not configured" }, 503);
  const { password } = await req.json().catch(() => ({}));
  if (typeof password !== "string" || !safeEqual(password, env.UPLOAD_PASSWORD)) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return json({ error: "Wrong password" }, 401);
  }
  const exp = String(Date.now() + TOKEN_TTL);
  return json({ token: exp + "." + (await hmac(env, exp)), expires: +exp });
}
async function authorized(req, env) {
  if (!env.UPLOAD_PASSWORD) return false;
  const t = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const [exp, sig] = t.split(".");
  if (!exp || !sig || +exp < Date.now()) return false;
  return safeEqual(sig, await hmac(env, exp));
}

// ---------- admin (upload page) ----------
function metaFrom(url) {
  const m = {};
  for (const k of ["crc32", "w", "h", "dur", "pages"]) {
    const v = url.searchParams.get(k);
    if (v && /^[0-9a-f.]{1,20}$/i.test(v)) m[k] = v;
  }
  return m;
}
function targetKey(url) {
  const folder = cleanFolder(url.searchParams.get("folder") || "");
  if (!folder || !folder.includes("/")) fail("Choose a brand and a folder");
  return folder + "/" + cleanPath(url.searchParams.get("name") || "");
}

async function folderStats(env) {
  const objs = await listAll(env, "");
  const folders = {};
  for (const o of objs) {
    if (o.key.startsWith(DERIVED)) continue;
    const f = docFolderOf(o.key);
    const e = (folders[f] = folders[f] || { folder: f, count: 0, size: 0 });
    e.count++; e.size += o.size;
  }
  return Object.values(folders).sort((a, b) => a.folder.localeCompare(b.folder));
}
async function folderUsed(env, folder) {
  const r = await env.MEDIA.list({ prefix: folder + "/", limit: 1 });
  return r.objects.length > 0;
}
async function deleteFolder(env, folder) {
  for (const prefix of [folder + "/", DERIVED + folder + "/"]) {
    const keys = (await listAll(env, prefix)).map((o) => o.key);
    for (let i = 0; i < keys.length; i += 1000) await env.MEDIA.delete(keys.slice(i, i + 1000));
  }
}
async function readJson(req) {
  const j = await req.json().catch(() => null);
  if (!j || typeof j !== "object") fail("Invalid request");
  return j;
}
function docInput(j, types, partial) {
  const out = {};
  if (!partial || "name" in j) {
    const name = String(j.name || "").replace(/\s+/g, " ").trim();
    if (!name) fail("Please enter a title");
    if (name.length > 200) fail("The title is too long (200 characters max)");
    out.name = name;
  }
  if (!partial || "type" in j) {
    if (!j.type || !types.some((t) => t.id === j.type)) fail("Please choose a category");
    out.type = j.type;
  }
  if (!partial || "desc" in j) out.desc = String(j.desc || "").replace(/\s+/g, " ").trim().slice(0, 500);
  if (!partial || "sheet" in j) out.sheet = !!j.sheet;
  return out;
}

// Documents (Webflow CMS items) + their media folders
async function documents(req, env, url, action) {
  const m = req.method;
  const wf = new Webflow(env);
  if (action === "state" && m === "GET") {
    const [brands, docs, schema, folders] = await Promise.all([wf.brands(), wf.listDocs(), wf.schema(), folderStats(env)]);
    return json({ brands, docs, types: schema.types, folders, site: env.SITE_URL || "" });
  }
  if (action === "docs" && m === "POST") {
    const j = await readJson(req);
    const [brands, docs, schema] = await Promise.all([wf.brands(), wf.listDocs(), wf.schema()]);
    const brand = brands.find((b) => b.id === j.brand);
    if (!brand) fail("Please choose a brand");
    const input = docInput(j, schema.types, false);
    const slugs = new Set(docs.map((d) => d.slug)), used = new Set(docs.map((d) => d.folder).filter(Boolean));
    // Optional: link a folder that already has files (uploaded before the document existed)
    let existing = null;
    if (j.folder) {
      existing = cleanFolder(j.folder);
      if (!existing.startsWith(brand.slug + "/")) fail("This folder belongs to another brand");
      if (used.has(existing)) fail("This folder is already used by another document", 409);
    }
    const doc = await wf.createDoc(input, brand, async (slug, folder) => slugs.has(slug) || (folder && (used.has(folder) || (await folderUsed(env, folder)))), existing);
    return json({ doc });
  }
  const dm = /^docs\/([0-9a-f]{24})(?:\/(publish|unpublish|folder))?$/.exec(action);
  if (!dm) fail("Not found", 404);
  const id = dm[1], op = dm[2];
  if (!op && m === "PATCH") {
    const schema = await wf.schema();
    const input = docInput(await readJson(req), schema.types, true);
    let doc = await wf.updateDoc(id, input);
    if (doc.status !== "draft") doc = await wf.publish(id); // keep live pages in sync
    return json({ doc });
  }
  if (op === "publish" && m === "POST") return json({ doc: await wf.publish(id) });
  if (op === "unpublish" && m === "POST") return json({ doc: await wf.unpublish(id) });
  if (op === "folder" && m === "POST") {
    // Older documents (from the Box era) get a media folder the first time files are added
    let doc = await wf.getDoc(id);
    if (doc.folder) return json({ doc });
    const [brands, docs] = await Promise.all([wf.brands(), wf.listDocs()]);
    const brand = brands.find((b) => b.id === doc.brand);
    const bslug = brand ? brand.slug : "other";
    const used = new Set(docs.map((d) => d.folder).filter(Boolean));
    const base = bslug + "/" + (cleanFolder(doc.slug.startsWith(bslug + "-") ? doc.slug.slice(bslug.length + 1) : doc.slug) || "document");
    let folder = base;
    for (let n = 2; used.has(folder) || (await folderUsed(env, folder)); n++) folder = base + "-" + n;
    doc = await wf.updateDoc(id, { folder });
    if (doc.status !== "draft") doc = await wf.publish(id);
    return json({ doc });
  }
  if (!op && m === "DELETE") {
    let doc;
    try { doc = await wf.getDoc(id); } catch (e) { if (e.webflow === 404) return json({ ok: true }); throw e; } // already deleted (retried request)
    await wf.deleteDoc(id);
    // Files go only if no other document uses the same folder
    if (doc.folder) {
      const others = (await wf.listDocs()).some((d) => d.id !== id && d.folder === doc.folder);
      if (!others) await deleteFolder(env, cleanFolder(doc.folder));
    }
    return json({ ok: true });
  }
  fail("Not found", 404);
}

async function admin(req, env, url, action) {
  const m = req.method;
  if (action === "state" || action === "docs" || action.startsWith("docs/")) return documents(req, env, url, action);
  if (action === "folders" && m === "GET") return json({ folders: await folderStats(env) });
  if (action === "rename" && m === "POST") {
    const src = targetKey(url);
    const folder = src.slice(0, src.lastIndexOf("/"));
    const dst = folder + "/" + cleanName(url.searchParams.get("to") || "");
    if (dst === src) return json({ ok: true, key: dst });
    const [srcHead, dstHead] = await Promise.all([env.MEDIA.head(src), env.MEDIA.head(dst)]);
    // Retried request whose first attempt already went through
    if (!srcHead && dstHead) return json({ ok: true, key: dst });
    if (!srcHead) fail("File not found, please reload the page", 404);
    if (dstHead) fail("A file with this name already exists in this folder", 409);
    const obj = await env.MEDIA.get(src);
    if (!obj) fail("File not found, please reload the page", 404);
    if (obj.size > 4.9 * 1024 ** 3) { await obj.body.cancel(); fail("Files over 4.9 GB cannot be renamed: upload it again with the new name", 413); }
    await env.MEDIA.put(dst, obj.body, { httpMetadata: obj.httpMetadata, customMetadata: obj.customMetadata });
    for (const d of ["thumb", "preview"]) {
      const o = await env.MEDIA.get(DERIVED + src + "." + d + ".jpg");
      if (o) await env.MEDIA.put(DERIVED + dst + "." + d + ".jpg", o.body, { httpMetadata: o.httpMetadata });
    }
    const check = await env.MEDIA.head(dst);
    if (!check || check.size !== obj.size) fail("Rename failed, the original file was kept", 500);
    await env.MEDIA.delete([src, DERIVED + src + ".thumb.jpg", DERIVED + src + ".preview.jpg"]);
    return json({ ok: true, key: dst });
  }
  if (action === "put" && m === "PUT") {
    // Small files and derived images in a single request (< 95 MB)
    const derived = url.searchParams.get("derived"); // "thumb" | "preview"
    let key = targetKey(url);
    if (derived) {
      if (!["thumb", "preview"].includes(derived)) fail("Bad derived type");
      key = DERIVED + key + "." + derived + ".jpg";
    }
    const type = derived ? "image/jpeg" : req.headers.get("content-type") || "application/octet-stream";
    await env.MEDIA.put(key, req.body, { httpMetadata: { contentType: type }, customMetadata: derived ? {} : metaFrom(url) });
    return json({ ok: true, key });
  }
  if (action === "mpu/create" && m === "POST") {
    const key = targetKey(url);
    const type = url.searchParams.get("type") || "application/octet-stream";
    const up = await env.MEDIA.createMultipartUpload(key, { httpMetadata: { contentType: type }, customMetadata: metaFrom(url) });
    return json({ key, uploadId: up.uploadId });
  }
  if (action === "mpu/part" && m === "PUT") {
    const key = targetKey(url);
    const up = env.MEDIA.resumeMultipartUpload(key, url.searchParams.get("uploadId"));
    const part = await up.uploadPart(+url.searchParams.get("part"), req.body);
    return json(part);
  }
  if (action === "mpu/complete" && m === "POST") {
    const key = targetKey(url);
    const { parts } = await req.json();
    const up = env.MEDIA.resumeMultipartUpload(key, url.searchParams.get("uploadId"));
    const obj = await up.complete(parts);
    return json({ ok: true, key, size: obj.size });
  }
  if (action === "mpu/abort" && m === "POST") {
    const key = targetKey(url);
    await env.MEDIA.resumeMultipartUpload(key, url.searchParams.get("uploadId")).abort();
    return json({ ok: true });
  }
  if (action === "folder" && m === "DELETE") {
    // A sub-folder of a document (sub=...) or a whole folder that no document uses
    const folder = cleanFolder(url.searchParams.get("folder") || "");
    if (!folder || folder.split("/").length !== 2) fail("Invalid folder");
    const sub = url.searchParams.get("sub");
    if (sub) { await deleteFolder(env, folder + "/" + cleanPath(sub)); return json({ ok: true }); }
    const docs = await new Webflow(env).listDocs();
    if (docs.some((d) => d.folder === folder)) fail("This folder belongs to a document: delete the document instead", 409);
    await deleteFolder(env, folder);
    return json({ ok: true });
  }
  if (action === "file" && m === "DELETE") {
    const key = targetKey(url);
    await env.MEDIA.delete([key, DERIVED + key + ".thumb.jpg", DERIVED + key + ".preview.jpg"]);
    return json({ ok: true });
  }
  fail("Not found", 404);
}
