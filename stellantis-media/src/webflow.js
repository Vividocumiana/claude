// Webflow CMS bridge: every document of the press kit is an item of the
// "All Documents" collection whose "Media Folder" field points to an R2 folder.
// Brands are the items of the "Events" collection (the main event excluded).

const F = { type: "tipologia-documento", desc: "descrizione", event: "event", sheet: "scheda-tecnica", folder: "media-folder", brand: "brand" };
const RETRIES = 4;

function fail(msg, status = 400) { const e = new Error(msg); e.status = status; throw e; }

export function slugify(s) {
  return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "");
}

export class Webflow {
  constructor(env) {
    if (!env.WEBFLOW_TOKEN) fail("Webflow non è collegato (manca WEBFLOW_TOKEN)", 503);
    this.env = env;
    this.base = (env.WEBFLOW_API || "https://api.webflow.com/v2").replace(/\/$/, "");
    this.docs = env.WEBFLOW_DOCS_COLLECTION;
    this.events = env.WEBFLOW_EVENTS_COLLECTION;
  }

  // Retries rate limits (429) and Webflow hiccups (5xx, network) with backoff.
  async call(method, path, body) {
    let last;
    for (let i = 0; i <= RETRIES; i++) {
      let r;
      try {
        r = await fetch(this.base + path, {
          method,
          headers: { authorization: "Bearer " + this.env.WEBFLOW_TOKEN, accept: "application/json", ...(body ? { "content-type": "application/json" } : {}) },
          body: body ? JSON.stringify(body) : undefined,
        });
      } catch (e) {
        last = new Error("Webflow non è raggiungibile");
        last.status = 502;
      }
      if (r) {
        if (r.status === 204) return {};
        const text = await r.text();
        let j = {};
        try { j = text ? JSON.parse(text) : {}; } catch (e) { j = { message: text.slice(0, 200) }; }
        if (r.ok) return j;
        last = new Error(webflowMessage(r.status, j));
        last.status = r.status >= 500 ? 502 : r.status;
        last.webflow = r.status;
        if (r.status !== 429 && r.status < 500) throw last;
        const wait = +r.headers.get("retry-after");
        if (i < RETRIES) { await sleep(wait > 0 ? Math.min(wait, 20) * 1000 : 600 * 2 ** i); continue; }
      }
      if (i < RETRIES) await sleep(600 * 2 ** i);
    }
    throw last;
  }

  async all(collection) {
    const out = [];
    for (let offset = 0; ; offset += 100) {
      const j = await this.call("GET", `/collections/${collection}/items?limit=100&offset=${offset}`);
      out.push(...(j.items || []));
      const total = j.pagination ? j.pagination.total : out.length;
      if (!j.items || !j.items.length || out.length >= total) break;
    }
    return out;
  }

  async schema() {
    const c = await this.call("GET", `/collections/${this.docs}`);
    const typeField = (c.fields || []).find((f) => f.slug === F.type);
    const types = typeField && typeField.validations && typeField.validations.options ? typeField.validations.options.map((o) => ({ id: o.id, name: o.name })) : [];
    return { types };
  }

  async brands() {
    const items = await this.all(this.events);
    return items
      .filter((i) => !i.isArchived && !i.fieldData["main-event"])
      .map((i) => ({ id: i.id, name: i.fieldData.name, slug: i.fieldData.slug, draft: !!i.isDraft, order: +i.fieldData["sort-order"] || 0 }))
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  }

  async listDocs() {
    return (await this.all(this.docs)).filter((i) => !i.isArchived).map(docOut);
  }

  async getDoc(id) {
    if (!/^[0-9a-f]{24}$/.test(id)) fail("Documento non trovato", 404);
    return docOut(await this.call("GET", `/collections/${this.docs}/items/${id}`));
  }

  // isTaken(slug, folder) -> true when the slug or the R2 folder is already used
  async createDoc(input, brand, isTaken, folder) {
    const own = slugify(input.name);
    const base = (own === brand.slug || own.startsWith(brand.slug + "-") ? own : slugify(brand.slug + " " + input.name)) || brand.slug + "-document";
    const folderOf = (slug) => folder || brand.slug + "/" + (slug.startsWith(brand.slug + "-") ? slug.slice(brand.slug.length + 1) : slug);
    let slug = base;
    for (let n = 2; await isTaken(slug, folder ? null : folderOf(slug)); n++) slug = base + "-" + n;
    for (let attempt = 0; ; attempt++) {
      const fieldData = { name: input.name, slug, [F.event]: brand.id, [F.brand]: brand.slug, [F.type]: input.type || null, [F.desc]: input.desc || "", [F.sheet]: !!input.sheet, [F.folder]: folderOf(slug) };
      try {
        return docOut(await this.call("POST", `/collections/${this.docs}/items`, { isArchived: false, isDraft: true, fieldData }));
      } catch (e) {
        // Slug taken by an item we could not see (e.g. created meanwhile): try another one
        if (attempt < 5 && e.webflow && e.webflow < 500 && /slug/i.test(e.message)) { slug = base + "-" + Math.random().toString(36).slice(2, 6); continue; }
        throw e;
      }
    }
  }

  async updateDoc(id, fields) {
    const fieldData = {};
    if ("name" in fields) fieldData.name = fields.name;
    if ("type" in fields) fieldData[F.type] = fields.type || null;
    if ("desc" in fields) fieldData[F.desc] = fields.desc || "";
    if ("sheet" in fields) fieldData[F.sheet] = !!fields.sheet;
    if ("folder" in fields) fieldData[F.folder] = fields.folder;
    return docOut(await this.call("PATCH", `/collections/${this.docs}/items/${id}`, { fieldData }));
  }

  // The brand page lists documents whose "Brand" text field equals the brand slug:
  // fill it where missing or wrong (bulk update, then republish the live ones).
  async syncBrandField(docs, brands) {
    const slugOf = Object.fromEntries(brands.map((b) => [b.id, b.slug]));
    const todo = docs.filter((d) => d.brand && slugOf[d.brand] && d.brandSlug !== slugOf[d.brand]);
    for (let i = 0; i < todo.length; i += 100) {
      const part = todo.slice(i, i + 100);
      await this.call("PATCH", `/collections/${this.docs}/items`, { items: part.map((d) => ({ id: d.id, fieldData: { [F.brand]: slugOf[d.brand] } })) });
      const live = part.filter((d) => d.status !== "draft").map((d) => d.id);
      if (live.length) await this.call("POST", `/collections/${this.docs}/items/publish`, { itemIds: live });
      part.forEach((d) => { d.brandSlug = slugOf[d.brand]; });
    }
    return todo.length;
  }

  async publish(id) { await this.publishItem(this.docs, id); return this.getDoc(id); }
  async unpublish(id) { await this.unpublishItem(this.docs, id); return this.getDoc(id); }

  // ---------- any collection (contacts, …) ----------
  async fields(collection) {
    const c = await this.call("GET", `/collections/${collection}`);
    return { name: c.displayName, singular: c.singularName, fields: c.fields || [] };
  }
  async items(collection) { return (await this.all(collection)).filter((i) => !i.isArchived).map(itemOut); }
  async getItem(collection, id) {
    if (!/^[0-9a-f]{24}$/.test(id)) fail("Elemento non trovato", 404);
    return itemOut(await this.call("GET", `/collections/${collection}/items/${id}`));
  }
  async createItem(collection, fieldData) {
    return itemOut(await this.call("POST", `/collections/${collection}/items`, { isArchived: false, isDraft: true, fieldData }));
  }
  async updateItem(collection, id, fieldData) {
    return itemOut(await this.call("PATCH", `/collections/${collection}/items/${id}`, { fieldData }));
  }
  async publishItem(collection, id) {
    const j = await this.call("POST", `/collections/${collection}/items/publish`, { itemIds: [id] });
    if (j.errors && j.errors.length && !(j.publishedItemIds || []).includes(id)) fail("Webflow non è riuscito a pubblicare: " + [].concat(j.errors).map((e) => e.message || e).join("; "), 502);
  }
  async unpublishItem(collection, id) {
    try { await this.call("DELETE", `/collections/${collection}/items/${id}/live`); }
    catch (e) { if (e.webflow !== 404 && e.webflow !== 409 && e.webflow !== 400) throw e; }
  }
  async deleteItem(collection, id) {
    await this.unpublishItem(collection, id);
    try { await this.call("DELETE", `/collections/${collection}/items/${id}`); }
    catch (e) { if (e.webflow !== 404) throw e; }
  }
  async archiveItem(collection, id) {
    await this.unpublishItem(collection, id);
    await this.call("PATCH", `/collections/${collection}/items/${id}`, { isArchived: true });
  }

  async deleteDoc(id) {
    await this.unpublish(id).catch((e) => { if (e.status !== 404) throw e; });
    try { await this.call("DELETE", `/collections/${this.docs}/items/${id}`); }
    catch (e) { if (e.webflow !== 404) throw e; }
  }
}

function statusOf(i) {
  const lp = i.lastPublished ? Date.parse(i.lastPublished) : 0, lu = i.lastUpdated ? Date.parse(i.lastUpdated) : 0;
  return lp && !i.isDraft ? (lu - lp > 5000 ? "changes" : "live") : "draft";
}
function itemOut(i) { return { id: i.id, data: i.fieldData || {}, status: statusOf(i), updated: i.lastUpdated || null }; }

function docOut(i) {
  const d = i.fieldData || {};
  const lp = i.lastPublished ? Date.parse(i.lastPublished) : 0, lu = i.lastUpdated ? Date.parse(i.lastUpdated) : 0;
  const live = !!lp && !i.isDraft;
  return {
    id: i.id, name: d.name || "", slug: d.slug || "", brand: d[F.event] || null, type: d[F.type] || null,
    desc: d[F.desc] || "", sheet: !!d[F.sheet], folder: (d[F.folder] || "").trim() || null, brandSlug: d[F.brand] || null,
    status: live ? (lu - lp > 5000 ? "changes" : "live") : "draft",
    updated: i.lastUpdated || null, published: i.lastPublished || null,
  };
}

function webflowMessage(status, j) {
  const detail = j && (j.message || j.msg || (j.details && JSON.stringify(j.details)) || j.code);
  if (status === 401 || status === 403) return "Webflow ha rifiutato la richiesta (controlla i permessi del token API)";
  if (status === 429) return "Webflow è occupato, riprova tra un minuto";
  if (status >= 500) return "Webflow è temporaneamente non disponibile, riprova";
  return "Webflow: " + (detail || "errore " + status);
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
