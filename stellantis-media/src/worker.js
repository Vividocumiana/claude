// Stellantis – Mondial de l'Auto Paris 2026 media service.
// Serves press materials stored in R2 to the Webflow site (public, read-only API)
// and powers the password-protected /upload page.
//
// Storage layout in the bucket:
//   <brand>/<folder>/<file>                      original files
//   _derived/<brand>/<folder>/<file>.thumb.jpg   grid thumbnail (made in the browser at upload)
//   _derived/<brand>/<folder>/<file>.preview.jpg large preview / video poster

import { zipPlan, streamZip } from "./zip.js";
import { Webflow, slugify } from "./webflow.js";

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
      if (p === "/api/sheets") return await sheets(env);
      if (p.startsWith("/api/admin/")) {
        if (!(await authorized(req, env))) return json({ error: "Unauthorized" }, 401);
        return await admin(req, env, url, p.slice(11));
      }
      return env.ASSETS.fetch(req);
    } catch (e) {
      if (!e.status) console.error(e);
      return cors(json({ error: e.status ? e.message : "Errore del server: " + (e.message || "unknown"), }, e.status || 500));
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
  if (parts.length > 4) fail("Cartella troppo annidata");
  return parts.join("/");
}
function cleanName(n) {
  const name = String(n).replace(/[\\/\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim().slice(0, 180);
  if (!name || name.startsWith(".")) fail("Nome del file non valido");
  return name;
}
// "Press photos/Day 1/img.jpg": every segment cleaned like a file name
function cleanPath(p) {
  const parts = String(p).split("/").map((x) => x.replace(/[\\\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  if (!parts.length || parts.length > 8) fail("Nome del file non valido");
  const out = parts.map(cleanName).join("/");
  if (out.length > 700) fail("Percorso del file troppo lungo");
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
  if (!folder) fail("Cartella mancante");
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

// Slugs of the documents flagged "Technical sheet", read by the brand pages of the website.
// Stored in R2 so the public website never waits on the Webflow API.
const SHEETS_KEY = "_meta/sheets.json";
async function sheets(env) {
  const o = await env.MEDIA.get(SHEETS_KEY);
  const body = o ? await o.text() : '{"slugs":[]}';
  return cors(new Response(body, { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=60" } }));
}
async function saveSheets(env, docs) {
  const slugs = docs.filter((d) => d.sheet).map((d) => d.slug).sort();
  await env.MEDIA.put(SHEETS_KEY, JSON.stringify({ slugs, updated: new Date().toISOString() }), { httpMetadata: { contentType: "application/json" } });
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
  if (!env.UPLOAD_PASSWORD) return json({ error: "Password di upload non configurata" }, 503);
  const { password } = await req.json().catch(() => ({}));
  if (typeof password !== "string" || !safeEqual(password, env.UPLOAD_PASSWORD)) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return json({ error: "Password errata" }, 401);
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
  if (!folder || !folder.includes("/")) fail("Scegli un brand e una cartella");
  return folder + "/" + cleanPath(url.searchParams.get("name") || "");
}

async function folderStats(env) {
  const objs = await listAll(env, "");
  const folders = {};
  for (const o of objs) {
    if (o.key.startsWith(DERIVED) || o.key.startsWith("_meta/") || o.key.startsWith("_img/")) continue;
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
  if (!j || typeof j !== "object") fail("Richiesta non valida");
  return j;
}
function docInput(j, types, partial) {
  const out = {};
  if (!partial || "name" in j) {
    const name = String(j.name || "").replace(/\s+/g, " ").trim();
    if (!name) fail("Inserisci un titolo");
    if (name.length > 200) fail("Il titolo è troppo lungo (massimo 200 caratteri)");
    out.name = name;
  }
  if (!partial || "type" in j) {
    if (!j.type || !types.some((t) => t.id === j.type)) fail("Scegli una categoria");
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
    await saveSheets(env, docs).catch(() => {});
    await wf.syncBrandField(docs, brands).catch((e) => console.error("brand sync", e.message));
    const extra = Object.entries(cmsConfig(env)).map(([key, c]) => ({ key, title: c.title || key }));
    return json({ brands, docs, types: schema.types, folders, site: env.SITE_URL || "", cms: extra, listLimit: 100 });
  }
  if (action === "docs" && m === "POST") {
    const j = await readJson(req);
    const [brands, docs, schema] = await Promise.all([wf.brands(), wf.listDocs(), wf.schema()]);
    const brand = brands.find((b) => b.id === j.brand);
    if (!brand) fail("Scegli un brand");
    const input = docInput(j, schema.types, false);
    const slugs = new Set(docs.map((d) => d.slug)), used = new Set(docs.map((d) => d.folder).filter(Boolean));
    // Optional: link a folder that already has files (uploaded before the document existed)
    let existing = null;
    if (j.folder) {
      existing = cleanFolder(j.folder);
      if (!existing.startsWith(brand.slug + "/")) fail("Questa cartella appartiene a un altro brand");
      if (used.has(existing)) fail("Questa cartella è già usata da un altro documento", 409);
    }
    const doc = await wf.createDoc(input, brand, async (slug, folder) => slugs.has(slug) || (folder && (used.has(folder) || (await folderUsed(env, folder)))), existing);
    if (doc.sheet) await saveSheets(env, docs.concat(doc)).catch(() => {});
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
    if ("sheet" in input) await wf.listDocs().then((all) => saveSheets(env, all)).catch(() => {});
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
    if (doc.sheet) await wf.listDocs().then((all) => saveSheets(env, all)).catch(() => {});
    return json({ ok: true });
  }
  fail("Not found", 404);
}

// ---------- other CMS collections (contacts, …), configured in CMS_COLLECTIONS ----------
function cmsConfig(env) {
  let c = env.CMS_COLLECTIONS || {};
  if (typeof c === "string") { try { c = JSON.parse(c); } catch (e) { c = {}; } }
  return c;
}
const EDITABLE = ["PlainText", "Email", "Phone", "Link", "Switch", "Option", "Number", "Reference", "MultiReference", "Image"];
const IMG_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg", "image/gif": "gif" };
async function cmsSchema(wf, conf) {
  const meta = await wf.fields(conf.id);
  const bySlug = Object.fromEntries(meta.fields.map((f) => [f.slug, f]));
  const labels = conf.labels || {}, help = conf.help || {};
  const fields = (conf.fields || meta.fields.map((f) => f.slug)).map((slug) => bySlug[slug]).filter((f) => f && EDITABLE.includes(f.type)).map((f) => ({
    slug: f.slug, name: f.displayName, label: labels[f.slug] || "", type: f.type, required: !!f.isRequired, help: help[f.slug] || "",
    options: f.type === "Option" ? ((f.validations && f.validations.options) || []).map((o) => ({ id: o.id, name: o.name })) : undefined,
    ref: f.type === "Reference" || f.type === "MultiReference" ? f.validations && f.validations.collectionId : undefined,
    max: f.validations && f.validations.maxLength,
  }));
  return { name: meta.name, singular: meta.singular, fields };
}
function cmsValue(f, v, refIds) {
  const empty = v == null || v === "" || (Array.isArray(v) && !v.length);
  if (empty) { if (f.required) fail("Compila il campo “" + f.name + "”"); return f.type === "Switch" ? false : f.type === "MultiReference" ? [] : null; }
  switch (f.type) {
    case "Switch": return !!v;
    case "Number": { const n = Number(v); if (!isFinite(n)) fail("“" + f.name + "” deve essere un numero"); return n; }
    case "Email": { const e = String(v).trim(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) fail("L’indirizzo email non è valido"); return e; }
    case "Link": { let u = String(v).trim(); if (!/^https?:\/\//i.test(u)) u = "https://" + u; try { new URL(u); } catch (e) { fail("“" + f.name + "” non è un link valido"); } return u; }
    case "Option": if (!f.options.some((o) => o.id === v)) fail("Scelta non valida per “" + f.name + "”"); return v;
    case "Reference": if (!refIds.has(v)) fail("Scelta non valida per “" + f.name + "”"); return v;
    case "MultiReference": { const a = [].concat(v).filter((x) => refIds.has(x)); return a; }
    case "Image": {
      // Only images uploaded through /api/admin/image (served by this service) are accepted
      const u = String(v && v.url || "");
      if (!/^https?:\/\/[^/]+\/f\/_img\//.test(u)) fail("Carica di nuovo l’immagine “" + f.name + "”");
      return { url: u, alt: String(v.alt || "").slice(0, 200) };
    }
    default: { const t = String(v).replace(/\s+/g, " ").trim(); if (f.max && t.length > f.max) fail("“" + f.name + "” è troppo lungo"); return t; }
  }
}
async function cms(req, env, url, rest) {
  const m = req.method, conf = cmsConfig(env);
  const [key, id, op] = rest.split("/");
  const c = conf[key];
  if (!c || !c.id) fail("Not found", 404);
  const wf = new Webflow(env);
  const schema = await cmsSchema(wf, c);
  const refCols = [...new Set(schema.fields.filter((f) => f.ref).map((f) => f.ref))];
  const refLists = Object.fromEntries(await Promise.all(refCols.map(async (rc) => [rc, (await wf.items(rc)).map((i) => ({ id: i.id, name: i.data.name || i.data.slug }))])));
  const input = async () => {
    const body = await readJson(req), data = body.data || {}, out = {};
    for (const f of schema.fields) {
      if (id && !(f.slug in data)) continue; // partial update
      out[f.slug] = cmsValue(f, data[f.slug], new Set((refLists[f.ref] || []).map((x) => x.id)));
    }
    return out;
  };
  // conf.filter: only items whose fields match (e.g. brands: not the main event)
  const visible = (i) => Object.entries(c.filter || {}).every(([k, v]) => (i.data[k] == null ? false : i.data[k]) === v);
  if (!id && m === "GET") {
    const items = (await wf.items(c.id)).filter(visible);
    return json({ key, title: c.title || schema.name, singular: c.singular || schema.singular, sort: c.sort || "name", canDelete: !c.noDelete, fields: schema.fields, refs: Object.fromEntries(schema.fields.filter((f) => f.ref).map((f) => [f.slug, refLists[f.ref]])), items });
  }
  if (!id && m === "POST") {
    const data = await input();
    const taken = new Set((await wf.items(c.id)).map((i) => i.data.slug));
    const base = slugify(data.name || "item") || "item";
    let s = base;
    for (let n = 2; taken.has(s); n++) s = base + "-" + n;
    const extra = { ...(c.defaults || {}) };
    // conf.createRef: also create a linked item (e.g. a new brand gets its own contacts group)
    if (c.createRef && data.name) {
      const r = c.createRef, existing = (await wf.items(r.collection)).find((i) => String(i.data.name || "").toLowerCase() === String(data.name).toLowerCase());
      const ref = existing || await wf.createItem(r.collection, { name: data.name, slug: slugify(data.name) || s });
      if (!existing) await wf.publishItem(r.collection, ref.id).catch(() => {});
      extra[r.field] = ref.id;
    }
    const fieldData = { ...extra, slug: s };
    for (const [k, v] of Object.entries(data)) if (!(v == null && k in extra)) fieldData[k] = v; // empty field keeps the default
    return json({ item: await wf.createItem(c.id, fieldData) });
  }
  if (!/^[0-9a-f]{24}$/.test(id || "")) fail("Not found", 404);
  if (!op && m === "PATCH") {
    let item = await wf.updateItem(c.id, id, await input());
    if (item.status !== "draft") { await wf.publishItem(c.id, id); item = await wf.getItem(c.id, id); }
    return json({ item });
  }
  if (op === "publish" && m === "POST") { await wf.publishItem(c.id, id); return json({ item: await wf.getItem(c.id, id) }); }
  if (op === "unpublish" && m === "POST") { await wf.unpublishItem(c.id, id); return json({ item: await wf.getItem(c.id, id) }); }
  if (!op && m === "DELETE") {
    if (c.noDelete) fail("Questo elemento non si può eliminare da qui: puoi ritirarlo dal sito");
    await wf.deleteItem(c.id, id); return json({ ok: true });
  }
  fail("Not found", 404);
}

// Images for CMS image fields: stored in R2 under _img/, served by /f/ so Webflow can import them
async function uploadImage(req, env, url) {
  const type = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const ext = IMG_TYPES[type];
  if (!ext) fail("Formato non supportato: usa PNG, JPG, WebP, SVG o GIF");
  const size = +req.headers.get("content-length") || 0;
  if (size > 8 * 1024 * 1024) fail("Immagine troppo grande (massimo 8 MB)");
  const body = await req.arrayBuffer();
  if (!body.byteLength) fail("File vuoto");
  if (body.byteLength > 8 * 1024 * 1024) fail("Immagine troppo grande (massimo 8 MB)");
  const base = slug(String(url.searchParams.get("name") || "image").replace(/\.[a-z0-9]+$/i, "")).slice(0, 60) || "image";
  const key = "_img/" + crypto.randomUUID().slice(0, 8) + "-" + base + "." + ext;
  await env.MEDIA.put(key, body, { httpMetadata: { contentType: type, cacheControl: "public, max-age=31536000, immutable" } });
  return json({ url: url.origin + "/f/" + encodeKey(key) });
}

async function admin(req, env, url, action) {
  const m = req.method;
  if (action.startsWith("cms/")) return cms(req, env, url, action.slice(4));
  if (action === "image" && m === "POST") return uploadImage(req, env, url);
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
    if (!srcHead) fail("File non trovato, ricarica la pagina", 404);
    if (dstHead) fail("In questa cartella esiste già un file con questo nome", 409);
    const obj = await env.MEDIA.get(src);
    if (!obj) fail("File non trovato, ricarica la pagina", 404);
    if (obj.size > 4.9 * 1024 ** 3) { await obj.body.cancel(); fail("I file oltre 4,9 GB non si possono rinominare: caricalo di nuovo con il nome nuovo", 413); }
    await env.MEDIA.put(dst, obj.body, { httpMetadata: obj.httpMetadata, customMetadata: obj.customMetadata });
    for (const d of ["thumb", "preview"]) {
      const o = await env.MEDIA.get(DERIVED + src + "." + d + ".jpg");
      if (o) await env.MEDIA.put(DERIVED + dst + "." + d + ".jpg", o.body, { httpMetadata: o.httpMetadata });
    }
    const check = await env.MEDIA.head(dst);
    if (!check || check.size !== obj.size) fail("Rinomina non riuscita, il file originale è stato mantenuto", 500);
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
    if (!folder || folder.split("/").length !== 2) fail("Cartella non valida");
    const sub = url.searchParams.get("sub");
    if (sub) { await deleteFolder(env, folder + "/" + cleanPath(sub)); return json({ ok: true }); }
    const docs = await new Webflow(env).listDocs();
    if (docs.some((d) => d.folder === folder)) fail("Questa cartella appartiene a un documento: elimina il documento", 409);
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
