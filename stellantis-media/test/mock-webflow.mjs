// Minimal fake of the Webflow v2 CMS API used by src/webflow.js (for local end-to-end tests).
// node test/mock-webflow.mjs [port] [flaky]   – "flaky" answers ~25% of requests with 429
import http from "node:http";

const PORT = +process.argv[2] || 9911, FLAKY = process.argv[3] === "flaky";
const DOCS = "6ab5f7c03bc1be2290997df6", EVENTS = "6ab5f7c03bc1be2290997df3", CONTACTS = "6ab5f7c03bc1be2290997df5", MARKETS = "6ab5f7c03bc1be2290997df4";
const TYPES = [["7a9ad7e3f50e72f0112cf09a17bd8fc8", "foto"], ["fee0afe4ef58459229968b9458a1b9bf", "video"], ["dd698b63f1dd43127313941b65026013", "documento"], ["9601092c426098de9fec86e629060ce5", "embargo"]];
let seq = 0x100000;
const id = () => "6abb" + (seq++).toString(16).padStart(20, "0");
const now = () => new Date().toISOString();
const item = (fieldData, extra = {}) => ({ id: id(), cmsLocaleId: "x", lastPublished: null, lastUpdated: now(), createdOn: now(), isArchived: false, isDraft: true, fieldData, ...extra });

const brands = [["Stellantis", "stellantis", true], ["Alfa Romeo", "alfa-romeo"], ["FIAT", "fiat"], ["PEUGEOT", "peugeot"]];
const db = {
  [EVENTS]: [item({ name: "Mondial de l'Auto Paris 2026", slug: "mondial-auto-paris-2026", "main-event": true, "sort-order": 0 }, { isDraft: false, lastPublished: now() })]
    .concat(brands.map((b, i) => item({ name: b[0], slug: b[1], "main-event": false, "sort-order": i + 1 }, { isDraft: !!b[2], lastPublished: b[2] ? null : now() }))),
  [DOCS]: [],
};
db[MARKETS] = ["France", "Italy", "Germany"].map((n) => item({ name: n, slug: n.toLowerCase() }, { isDraft: false, lastPublished: now() }));
db[CONTACTS] = [item({ name: "[TEST] Fiat Press", slug: "test-fiat-press", position: "Fiat PR", email: "fiat@example.com", "phone-number": null, country: [db[MARKETS][1].id] }, { isDraft: false, lastPublished: now() })];
const SCHEMAS = {
  [CONTACTS]: { displayName: "Contacts", singularName: "Contact", fields: [
    { slug: "position", displayName: "Position", type: "PlainText" }, { slug: "phone-number", displayName: "Phone number", type: "Phone" },
    { slug: "email", displayName: "Email", type: "Email" }, { slug: "country", displayName: "Country", type: "MultiReference", validations: { collectionId: MARKETS } },
    { slug: "name", displayName: "Full name", type: "PlainText", isRequired: true, validations: { maxLength: 256 } }, { slug: "slug", displayName: "Slug", type: "PlainText", isRequired: true }] },
};
const fiat = db[EVENTS][3];
db[DOCS].push(item({ name: "[TEST] Fiat – Photos", slug: "test-fiat-photos", event: fiat.id, "tipologia-documento": TYPES[0][0], descrizione: "Photos", "media-folder": "fiat/photos", "scheda-tecnica": false }, { isDraft: false, lastPublished: now() }));
db[DOCS].push(item({ name: "[TEST] Fiat – Video – B-Roll", slug: "test-fiat-video", event: fiat.id, "tipologia-documento": TYPES[1][0], descrizione: "Legacy Box document", "media-folder": null, "box-id": "123" }, { isDraft: false, lastPublished: now() }));

function send(res, status, body) { res.writeHead(status, { "content-type": "application/json" }); res.end(body === undefined ? "" : JSON.stringify(body)); }

http.createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    if (req.headers.authorization !== "Bearer test-token") return send(res, 401, { message: "bad token" });
    if (FLAKY && Math.random() < 0.25) { res.setHeader("retry-after", "1"); return send(res, 429, { message: "Too Many Requests" }); }
    const body = raw ? JSON.parse(raw) : {};
    const u = new URL(req.url, "http://x"), p = u.pathname.replace(/^\/v2/, "").split("/").filter(Boolean);
    console.log(req.method, u.pathname);
    // /collections/:c
    if (p[0] !== "collections" || !db[p[1]]) return send(res, 404, { message: "not found" });
    const list = db[p[1]];
    if (p.length === 2 && req.method === "GET") {
      if (SCHEMAS[p[1]]) return send(res, 200, { id: p[1], ...SCHEMAS[p[1]] });
      return send(res, 200, { id: p[1], fields: [{ slug: "tipologia-documento", type: "Option", validations: { options: TYPES.map(([id, name]) => ({ id, name })) } }] });
    }
    if (p[2] !== "items") return send(res, 404, {});
    if (p.length === 3 && req.method === "GET") {
      const off = +u.searchParams.get("offset") || 0, lim = +u.searchParams.get("limit") || 100;
      return send(res, 200, { items: list.slice(off, off + lim), pagination: { limit: lim, offset: off, total: list.length } });
    }
    if (p.length === 3 && req.method === "POST") {
      if (list.some((i) => i.fieldData.slug === body.fieldData.slug)) return send(res, 409, { message: "Validation Error: slug already in use" });
      const it = item(body.fieldData, { isDraft: body.isDraft !== false });
      list.push(it); return send(res, 202, it);
    }
    if (p[3] === "publish" && req.method === "POST") {
      const ids = body.itemIds || [];
      ids.forEach((x) => { const it = list.find((i) => i.id === x); if (it) { it.isDraft = false; it.lastPublished = it.lastUpdated = now(); } });
      return send(res, 202, { publishedItemIds: ids.filter((x) => list.some((i) => i.id === x)), errors: [] });
    }
    const it = list.find((i) => i.id === p[3]);
    if (!it) return send(res, 404, { message: "Item not found" });
    if (p[4] === "live" && req.method === "DELETE") { if (!it.lastPublished || it.isDraft) return send(res, 404, { message: "not live" }); it.isDraft = true; it.lastPublished = null; return send(res, 204); }
    if (req.method === "GET") return send(res, 200, it);
    if (req.method === "PATCH") { Object.assign(it.fieldData, body.fieldData || {}); if ("isArchived" in body) it.isArchived = body.isArchived; it.lastUpdated = now(); return send(res, 200, it); }
    if (req.method === "DELETE") { list.splice(list.indexOf(it), 1); return send(res, 204); }
    send(res, 404, {});
  });
}).listen(PORT, () => console.log("mock webflow on", PORT, FLAKY ? "(flaky)" : ""));
