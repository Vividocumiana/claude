// Stellantis – Mondial de l'Auto Paris 2026 media service.
// Serves press materials stored in R2 to the Webflow site (public, read-only API)
// and powers the password-protected /upload page.
//
// Storage layout in the bucket:
//   <brand>/<folder>/<file>                      original files
//   _derived/<brand>/<folder>/<file>.thumb.jpg   grid thumbnail (made in the browser at upload)
//   _derived/<brand>/<folder>/<file>.preview.jpg large preview / video poster

import { zipPlan, streamZip } from "./zip.js";

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
      if (p.startsWith("/f/")) return serveFile(req, env, decodeKey(p.slice(3)), url.searchParams.has("dl"));
      if (p.startsWith("/zip/")) return serveZip(req, env, ctx, cleanFolder(decodeURIComponent(p.slice(5))));
      if (p === "/api/list") return cors(json(await listFolder(env, cleanFolder(url.searchParams.get("folder") || ""), url.origin)));
      if (p === "/api/login" && req.method === "POST") return login(req, env);
      if (p.startsWith("/api/admin/")) {
        if (!(await authorized(req, env))) return json({ error: "Unauthorized" }, 401);
        return admin(req, env, url, p.slice(11));
      }
      return env.ASSETS.fetch(req);
    } catch (e) {
      return json({ error: e.message || "Server error" }, e.status || 500);
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
    .filter((o) => !o.key.slice(prefix.length).includes("/"))
    .map((o) => {
      const name = o.key.slice(prefix.length);
      const m = o.customMetadata || {};
      const type = (o.httpMetadata && o.httpMetadata.contentType) || "application/octet-stream";
      const t = DERIVED + o.key + ".thumb.jpg", pv = DERIVED + o.key + ".preview.jpg";
      return {
        key: o.key, name, size: o.size, type, kind: kindOf(name, type), uploaded: o.uploaded,
        width: +m.w || null, height: +m.h || null, duration: +m.dur || null, pages: +m.pages || null,
        url: origin + "/f/" + encodeKey(o.key),
        download: origin + "/f/" + encodeKey(o.key) + "?dl",
        thumb: have.has(t) ? origin + "/f/" + encodeKey(t) : null,
        preview: have.has(pv) ? origin + "/f/" + encodeKey(pv) : null,
        zippable: !!m.crc32,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
  const total = files.reduce((s, f) => s + f.size, 0);
  const zipFiles = files.filter((f) => f.zippable);
  return {
    folder, count: files.length, total, files,
    zip: zipFiles.length > 1 ? { url: origin + "/zip/" + folder, count: zipFiles.length, size: zipFiles.reduce((s, f) => s + f.size, 0) } : null,
  };
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

async function serveZip(req, env, ctx, folder) {
  if (!folder) fail("Not found", 404);
  const prefix = folder + "/";
  const objs = (await listAll(env, prefix)).filter((o) => !o.key.slice(prefix.length).includes("/") && o.customMetadata && o.customMetadata.crc32);
  if (!objs.length) return cors(new Response("Not found", { status: 404 }));
  const entries = objs.map((o) => ({ key: o.key, name: o.key.slice(prefix.length), size: o.size, crc: parseInt(o.customMetadata.crc32, 16) >>> 0, date: new Date(o.uploaded) }));
  const plan = zipPlan(entries);
  const { readable, writable } = new FixedLengthStream(plan.total);
  ctx.waitUntil(streamZip(plan, writable, (key) => env.MEDIA.get(key)));
  const fname = "stellantis-paris-2026-" + folder.replace(/\//g, "-") + ".zip";
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
  return folder + "/" + cleanName(url.searchParams.get("name") || "");
}

async function admin(req, env, url, action) {
  const m = req.method;
  if (action === "folders" && m === "GET") {
    const objs = await listAll(env, "");
    const folders = {};
    for (const o of objs) {
      if (o.key.startsWith(DERIVED)) continue;
      const f = o.key.slice(0, o.key.lastIndexOf("/"));
      const e = (folders[f] = folders[f] || { folder: f, count: 0, size: 0 });
      e.count++; e.size += o.size;
    }
    return json({ folders: Object.values(folders).sort((a, b) => a.folder.localeCompare(b.folder)) });
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
  if (action === "file" && m === "DELETE") {
    const key = targetKey(url);
    await env.MEDIA.delete([key, DERIVED + key + ".thumb.jpg", DERIVED + key + ".preview.jpg"]);
    return json({ ok: true });
  }
  fail("Not found", 404);
}
