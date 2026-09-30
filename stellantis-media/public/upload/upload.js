/* Stellantis Paris 2026 – Press Kit Manager
 * Documents are Webflow CMS items ("All Documents"); their files live in R2
 * in the folder stored in the item's "Media Folder" field.
 */
(function () {
  "use strict";
  var SINGLE_MAX = 90 * 1024 * 1024;     // above this, multipart upload
  var PART = 50 * 1024 * 1024;           // multipart part size
  var PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
  var TYPE_LABEL = { foto: "Foto", video: "Video", documento: "Documenti" };
  var ICON = {
    foto: '<svg viewBox="0 0 24 24"><path d="M4 7h3l2-3h6l2 3h3v13H4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="13" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    video: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="13" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m16 10 5-3v10l-5-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    documento: '<svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6z M14 3v4h4 M9 12h6 M9 16h6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    contact: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    other: '<svg viewBox="0 0 24 24"><path d="M3 7h7l2 2h9v11H3z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>'
  };
  var STATUS = { live: ["live", "Online sul sito"], draft: ["draft", "Bozza · non visibile"], changes: ["changes", "Online · modifiche non pubblicate"] };
  var $ = function (id) { return document.getElementById(id); };
  var token = "";
  try { token = sessionStorage.getItem("stl26_up") || ""; } catch (e) {}
  var S = { brands: [], docs: [], types: [], folders: [], site: "", brand: null, doc: null, filter: "", files: [], offline: false, cms: [], listLimit: 100, view: "" };

  // ---------- utils ----------
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function size(b) { if (b < 1024) return b + " B"; var u = ["KB", "MB", "GB", "TB"], i = -1; do { b /= 1024; i++; } while (b >= 1024 && i < 3); return (b >= 100 ? Math.round(b) : b.toFixed(1)) + " " + u[i]; }
  function toast(msg, isErr) {
    var t = $("toast"); t.textContent = msg; t.classList.toggle("err", !!isErr); t.classList.add("show");
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove("show"); }, isErr ? 6000 : 2800);
  }
  function qs(o) { return Object.keys(o).filter(function (k) { return o[k] != null && o[k] !== ""; }).map(function (k) { return k + "=" + encodeURIComponent(o[k]); }).join("&"); }
  // Requests are retried on network errors (all of them are safe to repeat except creating a document)
  function api(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ authorization: "Bearer " + token }, opts.headers || {});
    if (opts.json !== undefined) { opts.body = JSON.stringify(opts.json); opts.headers["content-type"] = "application/json"; delete opts.json; }
    var tries = opts.once ? 1 : 3, limit = opts.timeout || 30000;
    delete opts.once; delete opts.timeout;
    function attempt(n) {
      // A request that hangs (flaky network) is aborted and retried instead of spinning forever
      var ctl = window.AbortController ? new AbortController() : null, t;
      if (ctl) { opts.signal = ctl.signal; t = setTimeout(function () { ctl.abort(); }, limit); }
      return fetch(path, opts).then(function (r) { clearTimeout(t); return r; }, function () {
        clearTimeout(t);
        if (n + 1 < tries) return new Promise(function (r) { setTimeout(r, 1000 * (n + 1)); }).then(function () { return attempt(n + 1); });
        throw new Error("Connessione assente. Controlla internet e riprova.");
      });
    }
    return attempt(0).then(function (r) {
      if (r.status === 401) { logout(true); throw new Error("La sessione è scaduta, accedi di nuovo"); }
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || "Qualcosa è andato storto (" + r.status + ")"); return j; });
    });
  }
  // Run an action with a spinner on its button; errors become a red toast
  function busy(btn, fn) {
    if (btn.classList.contains("busy")) return Promise.resolve();
    btn.classList.add("busy");
    return Promise.resolve().then(fn).catch(function (e) { toast(e.message, true); }).then(function () { btn.classList.remove("busy"); });
  }
  function typeName(id) { for (var i = 0; i < S.types.length; i++) if (S.types[i].id === id) return S.types[i].name; return ""; }
  function typeLabel(id) { var n = typeName(id); return TYPE_LABEL[n] || (n ? n.charAt(0).toUpperCase() + n.slice(1) : "Senza categoria"); }
  function brandById(id) { for (var i = 0; i < S.brands.length; i++) if (S.brands[i].id === id) return S.brands[i]; return null; }
  function brandBySlug(s) { for (var i = 0; i < S.brands.length; i++) if (S.brands[i].slug === s) return S.brands[i]; return null; }
  function docById(id) { for (var i = 0; i < S.docs.length; i++) if (S.docs[i].id === id) return S.docs[i]; return null; }
  function stats(folder) { for (var i = 0; i < S.folders.length; i++) if (S.folders[i].folder === folder) return S.folders[i]; return { count: 0, size: 0 }; }
  function docUrl(d) { return S.site ? S.site.replace(/\/$/, "") + "/all-documents/" + d.slug : ""; }
  function when(iso) { if (!iso) return ""; var d = new Date(iso); return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }); }
  function show(view) { ["loading", "v-error", "v-brand", "v-doc", "v-folder", "v-help", "v-cms"].forEach(function (v) { $(v).hidden = v !== view; }); window.scrollTo(0, 0); }

  function confirmBox(title, text, yes, danger) {
    return new Promise(function (res) {
      var m = $("m-confirm"); $("c-title").textContent = title; $("c-text").textContent = text;
      var y = $("c-yes"); y.textContent = yes; y.className = "btn " + (danger ? "danger-fill" : "primary");
      m.hidden = false; y.focus();
      function done(v) { m.hidden = true; y.onclick = $("c-no").onclick = m.onkeydown = null; res(v); }
      y.onclick = function () { done(true); }; $("c-no").onclick = function () { done(false); };
      m.onkeydown = function (e) { if (e.key === "Escape") done(false); };
    });
  }

  // ---------- auth ----------
  function showLogin() { $("app").hidden = true; $("login").hidden = false; setTimeout(function () { $("pwd").focus(); }, 0); }
  function logout(expired) {
    token = ""; try { sessionStorage.removeItem("stl26_up"); } catch (e) {}
    if (expired) $("login-err").textContent = "La sessione è scaduta, accedi di nuovo.";
    showLogin();
  }
  $("logout").onclick = function () { if (!running || confirm("Gli upload in corso verranno interrotti. Uscire comunque?")) logout(); };
  $("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = this.querySelector("button");
    $("login-err").textContent = "";
    btn.classList.add("busy");
    fetch("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: $("pwd").value }) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error === "Password errata" ? "Password errata, riprova." : j.error || "Accesso non riuscito"); return j; }); }, function () { throw new Error("Connessione assente. Controlla internet e riprova."); })
      .then(function (j) { token = j.token; try { sessionStorage.setItem("stl26_up", token); } catch (x) {} $("pwd").value = ""; start(); })
      .catch(function (err) { $("login-err").textContent = err.message; $("pwd").select(); })
      .then(function () { btn.classList.remove("busy"); });
  });

  function start() {
    $("login").hidden = true; $("app").hidden = false;
    show("loading");
    load().then(route);
  }

  // ---------- data ----------
  function load() {
    return api("/api/admin/state", { timeout: 60000 }).then(function (j) {
      S.brands = j.brands; S.docs = j.docs; S.types = j.types; S.folders = j.folders; S.site = j.site; S.cms = j.cms || []; S.listLimit = j.listLimit || 100; S.offline = false;
      $("site-link").href = S.site || "#"; $("site-link").hidden = !S.site;
      renderSide();
    }, function (e) {
      S.offline = true;
      $("error-msg").textContent = e.message;
      return api("/api/admin/folders").then(function (j) { S.folders = j.folders; }, function () { S.folders = []; }).then(function () { renderSide(); });
    });
  }
  function refreshStats() { return api("/api/admin/folders").then(function (j) { S.folders = j.folders; if (!S.offline) renderSide(); }).catch(function () {}); }
  function putDoc(d) { var i = S.docs.findIndex(function (x) { return x.id === d.id; }); if (i >= 0) S.docs[i] = d; else S.docs.push(d); }

  // ---------- routing (#brand=fiat, #doc=<id>, #folder=fiat/photos) ----------
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
  window.addEventListener("hashchange", function () { if (!$("app").hidden) route(); });
  function route() {
    var h = location.hash.slice(1), k = h.split("=")[0], v = decodeURIComponent(h.slice(k.length + 1));
    if (k === "folder" && v) return openFolderOnly(v);
    if (S.offline) {
      renderFallback(); return show("v-error");
    }
    if (k === "help") return openHelp();
    if (k === "cms" && v) return openCms(v);
    if (k === "doc" && docById(v)) return openDoc(docById(v));
    if (!h) { var seen = false; try { seen = localStorage.getItem("stl26_help_seen"); } catch (e) {} if (!seen) return go("#help"); }
    var b = (k === "brand" && brandBySlug(v)) || S.brand || S.brands[0];
    if (b) openBrand(b); else show("v-brand");
  }

  // ---------- sidebar ----------
  function renderSide() {
    if (S.offline) { $("side").innerHTML = '<h4>Brand</h4><p class="sub" style="padding:0 12px">Non disponibili finché Webflow non risponde.</p>'; return; }
    var view = S.view || "";
    $("side").innerHTML = "<h4>Brand</h4>" + S.brands.map(function (b) {
      var n = S.docs.filter(function (d) { return d.brand === b.id; }).length;
      var active = view === "brand" && S.brand && S.brand.id === b.id;
      return '<button type="button" data-brand="' + esc(b.slug) + '" class="' + (active ? "is-active" : "") + '"' + (active ? ' aria-current="page"' : "") + ">" + esc(b.name) + "<span>" + n + (b.draft ? " · nascosto" : "") + "</span></button>";
    }).join("") +
      (S.cms.length ? "<h4>Contenuti del sito</h4>" + S.cms.map(function (c) {
        var active = view === "cms:" + c.key;
        return '<button type="button" data-go="#cms=' + esc(c.key) + '" class="' + (active ? "is-active" : "") + '">' + esc(c.title) + "</button>";
      }).join("") : "") +
      '<h4>Aiuto</h4><button type="button" data-go="#help" class="' + (view === "help" ? "is-active" : "") + '">Come funziona</button>';
  }
  $("side").addEventListener("click", function (e) {
    var b = e.target.closest("[data-brand]"), g = e.target.closest("[data-go]");
    if (b) { S.filter = ""; go("#brand=" + b.dataset.brand); }
    if (g) go(g.dataset.go);
  });

  // ---------- brand view ----------
  function openBrand(b) {
    S.brand = b; S.doc = null; S.view = "brand";
    // Each brand page lists at most 100 documents (Webflow collection list limit)
    var lw = $("limit-warn"), near = S.docs.filter(function (d) { return d.brand === b.id; }).length >= S.listLimit - 10;
    lw.hidden = !near;
    if (near) lw.textContent = "Il brand " + b.name + " ha " + S.docs.filter(function (d) { return d.brand === b.id; }).length + " documenti: la pagina del brand ne mostra al massimo " + S.listLimit + ". Contatta il team web prima di aggiungerne altri.";
    renderSide();
    $("brand-title").textContent = b.name;
    var docs = S.docs.filter(function (d) { return d.brand === b.id; });
    var live = docs.filter(function (d) { return d.status !== "draft"; }).length;
    $("brand-sub").textContent = docs.length ? docs.length + (docs.length === 1 ? " documento" : " documenti") + " · " + live + " online" + (b.draft ? " · la pagina di questo brand è nascosta sul sito" : "") : (b.draft ? "La pagina di questo brand è nascosta sul sito" : "");
    var chips = [["", "Tutti"]].concat(S.types.map(function (t) { return [t.id, TYPE_LABEL[t.name] || t.name]; }));
    $("chips").innerHTML = chips.map(function (c) {
      var n = c[0] ? docs.filter(function (d) { return d.type === c[0]; }).length : docs.length;
      return '<button type="button" role="tab" data-f="' + c[0] + '" class="' + (S.filter === c[0] ? "is-active" : "") + '" aria-selected="' + (S.filter === c[0]) + '">' + esc(c[1]) + " " + n + "</button>";
    }).join("");
    var order = S.types.map(function (t) { return t.id; });
    var list = docs.filter(function (d) { return !S.filter || d.type === S.filter; }).sort(function (a, b2) {
      return (order.indexOf(a.type) + 1 || 99) - (order.indexOf(b2.type) + 1 || 99) || a.name.localeCompare(b2.name, "en", { numeric: true });
    });
    $("docs").innerHTML = list.length ? list.map(function (d) {
      var st = stats(d.folder), s = STATUS[d.status];
      var files = d.folder ? (st.count ? st.count + (st.count === 1 ? " file · " : " file · ") + size(st.size) : "Nessun file") : "Nessun file";
      return '<a class="doc" href="#doc=' + d.id + '"><div class="ic">' + (ICON[typeName(d.type)] || ICON.other) + '</div><div class="t"><b>' + esc(d.name) + "</b><span>" + esc(typeLabel(d.type)) + " · " + files + (d.desc ? " · " + esc(d.desc) : "") + '</span></div><div class="r">' + (d.sheet ? '<span class="pill sheet">Scheda tecnica</span>' : "") + '<span class="pill ' + s[0] + '">' + (d.status === "live" ? "Online" : d.status === "draft" ? "Bozza" : "Modifiche da pubblicare") + "</span></div></a>";
    }).join("") : '<div class="none">' + (docs.length ? "Nessun documento in questa categoria." : "Ancora nessun documento per " + esc(b.name) + ".<br>Clicca <b>+ Nuovo documento</b> per creare il primo.") + "</div>";
    // Folders with files that no document uses (e.g. uploaded before documents existed)
    var usedF = S.docs.map(function (d) { return d.folder; });
    var loose = S.folders.filter(function (f) { return f.folder.split("/")[0] === b.slug && usedF.indexOf(f.folder) < 0 && f.count; });
    $("loose").hidden = !loose.length || !!S.filter;
    $("loose-list").innerHTML = loose.map(function (f) {
      return '<div class="doc loose-row"><div class="ic">' + ICON.other + '</div><div class="t"><b>' + esc(f.folder.split("/").slice(1).join(" / ")) + "</b><span>" + f.count + (f.count === 1 ? " file · " : " file · ") + size(f.size) + ' · non presente sul sito</span></div><div class="r"><a class="btn small ghost" href="#folder=' + encodeURIComponent(f.folder) + '">Vedi file</a><button class="btn small ghost danger-txt" type="button" data-delfolder="' + esc(f.folder) + '">Elimina</button><button class="btn small primary" type="button" data-link="' + esc(f.folder) + '">Crea documento</button></div></div>';
    }).join("");
    show("v-brand");
  }
  $("chips").addEventListener("click", function (e) { var c = e.target.closest("[data-f]"); if (c) { S.filter = c.dataset.f; openBrand(S.brand); } });

  // ---------- category picker ----------
  function renderSeg(el, value) {
    el.innerHTML = S.types.map(function (t) {
      return '<button type="button" role="radio" data-v="' + t.id + '" aria-checked="' + (t.id === value) + '" class="' + (t.id === value ? "is-on" : "") + '">' + (ICON[t.name] || ICON.other) + esc(TYPE_LABEL[t.name] || t.name) + "</button>";
    }).join("");
    el.dataset.value = value || "";
  }
  function segClick(e) {
    var b = e.target.closest("[data-v]"); if (!b) return;
    var el = e.currentTarget; el.dataset.value = b.dataset.v;
    Array.prototype.forEach.call(el.children, function (c) { var on = c === b; c.classList.toggle("is-on", on); c.setAttribute("aria-checked", on); });
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
  $("d-type").addEventListener("click", segClick);
  $("n-type").addEventListener("click", segClick);

  // ---------- new document ----------
  $("loose-list").addEventListener("click", function (e) {
    var l = e.target.closest("[data-link]"); if (l) return openNew(l.dataset.link);
    var d = e.target.closest("[data-delfolder]"); if (!d) return;
    var f = d.dataset.delfolder, st = stats(f);
    confirmBox("Eliminare la cartella “" + f + "”?", (st.count === 1 ? "Il suo file" : "I suoi " + st.count + " file") + " (" + size(st.size) + ") " + (st.count === 1 ? "verrà eliminato" : "verranno eliminati") + ". L’operazione non si può annullare.", "Elimina cartella", true).then(function (ok) {
      if (!ok) return;
      busy(d, function () { return api("/api/admin/folder?" + qs({ folder: f }), { method: "DELETE", timeout: 300000 }).then(function () { toast("Cartella eliminata"); S.folders = S.folders.filter(function (x) { return x.folder !== f; }); openBrand(S.brand); }); });
    });
  });
  $("new-doc").onclick = function () { openNew(null); };
  // Files chosen in the "New document" window, uploaded right after it is created
  var staged = [];
  function stage(items) {
    // A single dropped folder becomes the document: its content goes to the top level
    var tops = {};
    items.forEach(function (x) { tops[x.path.indexOf("/") > 0 ? x.path.split("/")[0] : ""] = 1; });
    var keys = Object.keys(tops);
    if (keys.length === 1 && keys[0]) {
      var name = keys[0];
      items = items.map(function (x) { return { file: x.file, path: x.path.slice(name.length + 1) }; });
      if (!$("n-name").value.trim()) $("n-name").value = name.replace(/[_]+/g, " ");
    }
    staged = staged.concat(items);
    var bytes = staged.reduce(function (a, x) { return a + x.file.size; }, 0);
    $("n-staged").hidden = !staged.length;
    $("n-staged").querySelector("span").textContent = staged.length + " file · " + size(bytes) + " pronti da caricare";
  }
  var nDrop = $("n-drop");
  ["dragenter", "dragover"].forEach(function (ev) { nDrop.addEventListener(ev, function (e) { e.preventDefault(); nDrop.classList.add("is-over"); }); });
  ["dragleave", "drop"].forEach(function (ev) { nDrop.addEventListener(ev, function (e) { e.preventDefault(); nDrop.classList.remove("is-over"); }); });
  nDrop.addEventListener("drop", function (e) { collectDrop(e.dataTransfer).then(stage); });
  $("n-file-input").addEventListener("change", function (e) { stage(fromInput(e.target.files)); e.target.value = ""; });
  $("n-dir-input").addEventListener("change", function (e) { stage(fromInput(e.target.files)); e.target.value = ""; });
  $("n-pick-files").onclick = function () { $("n-file-input").click(); };
  $("n-pick-dir").onclick = function () { $("n-dir-input").click(); };
  $("n-clear").onclick = function () { staged = []; stage([]); };

  function openNew(folder) {
    S.newFolder = folder;
    staged = []; $("n-staged").hidden = true;
    $("n-files-f").hidden = !!folder;
    $("n-folder").hidden = !folder; $("n-folder").textContent = folder ? "I file già presenti nella cartella “" + folder + "” faranno parte di questo documento." : "";
    $("n-brand").disabled = !!folder;
    $("n-brand").innerHTML = S.brands.map(function (b) { return '<option value="' + b.id + '"' + (S.brand && S.brand.id === b.id ? " selected" : "") + ">" + esc(b.name) + "</option>"; }).join("");
    $("n-name").value = ""; $("n-desc").value = ""; $("n-sheet").checked = false; $("n-err").textContent = "";
    renderSeg($("n-type"), S.filter || "");
    var fbr = folder && brandBySlug(folder.split("/")[0]);
    if (fbr) $("n-brand").value = fbr.id;
    if (folder) $("n-name").value = folder.split("/").slice(1).join(" ").replace(/-/g, " ").replace(/^./, function (c) { return c.toUpperCase(); });
    $("m-new").hidden = false; $("n-name").focus();
  }
  $("m-new").addEventListener("click", function (e) { if (e.target === this || e.target.closest("[data-close]")) this.hidden = true; });
  $("m-new").addEventListener("keydown", function (e) { if (e.key === "Escape") this.hidden = true; });
  $("new-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var body = { brand: $("n-brand").value, name: $("n-name").value.trim(), type: $("n-type").dataset.value, desc: $("n-desc").value.trim(), sheet: $("n-sheet").checked, folder: S.newFolder || undefined };
    $("n-err").textContent = "";
    if (!body.name) { $("n-err").textContent = "Inserisci un titolo."; return $("n-name").focus(); }
    if (!body.type) { $("n-err").textContent = "Scegli una categoria."; return; }
    var btn = $("n-create");
    if (btn.classList.contains("busy")) return;
    btn.classList.add("busy");
    api("/api/admin/docs", { method: "POST", json: body, once: true }).then(function (j) {
      putDoc(j.doc); $("m-new").hidden = true;
      S.brand = brandById(j.doc.brand) || S.brand;
      toast("Documento creato come bozza" + (staged.length ? ", caricamento dei file in corso…" : ""));
      try { history.pushState(null, "", "#doc=" + j.doc.id); } catch (x) { location.hash = "#doc=" + j.doc.id; }
      openDoc(j.doc);
      if (staged.length) { var st = staged; staged = []; enqueue(st); }
    }).catch(function (err) {
      if (!/No connection/.test(err.message)) { $("n-err").textContent = err.message; return; }
      // The connection dropped: the document may have been created anyway, never create it twice
      return load().then(function () {
        var made = S.docs.filter(function (d) { return d.brand === body.brand && d.name === body.name && Date.now() - Date.parse(d.updated) < 5 * 60000; })[0];
        if (made) { $("m-new").hidden = true; toast("Documento creato come bozza"); go("#doc=" + made.id); }
        else $("n-err").textContent = err.message;
      });
    }).then(function () { btn.classList.remove("busy"); });
  });

  // ---------- document view ----------
  function openDoc(d) {
    var changed = !S.doc || S.doc.id !== d.id;
    S.doc = d; S.folderOnly = null; S.brand = brandById(d.brand) || S.brand; S.view = "brand";
    renderSide();
    var b = brandById(d.brand);
    $("back").querySelector("span").textContent = "Documenti " + (b ? b.name : "");
    $("back").href = b ? "#brand=" + b.slug : "#";
    $("details").hidden = false; document.querySelector(".danger").hidden = false;
    renderDocHead();
    if (changed) { fillDetails(); clearQueue(); $("files").innerHTML = ""; $("files-meta").textContent = ""; }
    show("v-doc");
    loadFiles();
  }
  function renderDocHead() {
    var d = S.doc, b = brandById(d.brand), s = STATUS[d.status];
    $("doc-crumb").textContent = (b ? b.name : "") + " · " + typeLabel(d.type);
    $("doc-title").textContent = d.name;
    $("doc-pill").className = "pill " + s[0]; $("doc-pill").textContent = s[1];
    $("doc-sub").textContent = d.status !== "draft" && d.published ? "Pubblicato il " + when(d.published) : "";
    $("doc-view").hidden = d.status === "draft" || !S.site; $("doc-view").href = docUrl(d);
    $("doc-unpublish").hidden = d.status === "draft";
    $("doc-publish").hidden = d.status === "live";
    $("doc-publish").textContent = d.status === "changes" ? "Pubblica modifiche" : "Pubblica";
    var n = $("doc-notice");
    if (d.status === "draft") { n.className = "notice"; n.innerHTML = "<b>Bozza.</b> I giornalisti non vedono ancora questo documento. Aggiungi i file, controlla i dettagli e poi clicca <b>Pubblica</b>."; n.hidden = false; }
    else if (b && b.draft) { n.className = "notice warn"; n.textContent = "Questo documento è pubblicato, ma la pagina del brand " + b.name + " è nascosta sul sito: i giornalisti possono raggiungerlo solo con il link diretto."; n.hidden = false; }
    else n.hidden = true;
  }
  $("doc-notice").addEventListener("click", function (e) { var l = e.target.closest("[data-link]"); if (l) openNew(l.dataset.link); });
  $("doc-publish").onclick = function () {
    var btn = this, d = S.doc;
    busy(btn, function () {
      var st = stats(d.folder);
      return (d.folder && st.count ? Promise.resolve(true) : confirmBox("Pubblicare senza file?", "Questo documento non ha ancora file: i giornalisti vedranno una pagina vuota.", "Pubblica comunque")).then(function (ok) {
        if (!ok) return;
        return api("/api/admin/docs/" + d.id + "/publish", { method: "POST" }).then(function (j) { putDoc(j.doc); if (S.doc && S.doc.id === j.doc.id) { S.doc = j.doc; renderDocHead(); } toast("Pubblicato: ora è online sul sito"); });
      });
    });
  };
  $("doc-unpublish").onclick = function () {
    var btn = this, d = S.doc;
    confirmBox("Ritirare questo documento?", "Verrà tolto dal sito. I file restano e puoi ripubblicarlo quando vuoi.", "Ritira").then(function (ok) {
      if (!ok) return;
      busy(btn, function () { return api("/api/admin/docs/" + d.id + "/unpublish", { method: "POST" }).then(function (j) { putDoc(j.doc); if (S.doc && S.doc.id === j.doc.id) { S.doc = j.doc; renderDocHead(); } toast("Ritirato: non è più visibile sul sito"); }); });
    });
  };
  $("doc-delete").onclick = function () {
    var btn = this, d = S.doc, st = stats(d.folder);
    if (running) return toast("Attendi la fine degli upload", true);
    confirmBox("Eliminare “" + d.name + "”?", "Il documento verrà tolto dal sito" + (st.count ? " e " + (st.count === 1 ? "il suo file verrà eliminato" : "i suoi " + st.count + " file verranno eliminati") : "") + ". L’operazione non si può annullare.", "Elimina documento", true).then(function (ok) {
      if (!ok) return;
      busy(btn, function () {
        return api("/api/admin/docs/" + d.id, { method: "DELETE", timeout: 300000 }).then(function () {
          S.docs = S.docs.filter(function (x) { return x.id !== d.id; });
          toast("Documento eliminato");
          refreshStats();
          var b = brandById(d.brand); go(b ? "#brand=" + b.slug : "#");
        });
      });
    });
  };

  // details form
  function fillDetails() {
    var d = S.doc;
    $("d-name").value = d.name; $("d-desc").value = d.desc; $("d-sheet").checked = d.sheet;
    renderSeg($("d-type"), d.type);
    dirty();
  }
  function formVals() { return { name: $("d-name").value.trim(), type: $("d-type").dataset.value, desc: $("d-desc").value.trim(), sheet: $("d-sheet").checked }; }
  function dirty() {
    var d = S.doc, v = formVals();
    var ch = v.name !== d.name || v.type !== (d.type || "") || v.desc !== d.desc || v.sheet !== d.sheet;
    $("d-save").disabled = $("d-reset").disabled = !ch;
    $("d-hint").textContent = ch ? (d.status === "draft" ? "Modifiche non salvate" : "Modifiche non salvate · andranno online appena salvi") : "";
    return ch;
  }
  $("details").addEventListener("input", dirty);
  $("details").addEventListener("change", dirty);
  $("d-reset").onclick = fillDetails;
  $("details").addEventListener("submit", function (e) {
    e.preventDefault();
    var v = formVals(), d = S.doc;
    if (!v.name) { toast("Inserisci un titolo", true); return $("d-name").focus(); }
    if (!dirty()) return;
    busy($("d-save"), function () {
      return api("/api/admin/docs/" + d.id, { method: "PATCH", json: v }).then(function (j) {
        putDoc(j.doc);
        if (S.doc && S.doc.id === j.doc.id) { S.doc = j.doc; renderDocHead(); fillDetails(); }
        toast(j.doc.status === "draft" ? "Modifiche salvate" : "Modifiche salvate e pubblicate");
      });
    });
  });
  window.addEventListener("beforeunload", function (e) { if (running || (!$("v-doc").hidden && S.doc && dirty())) { e.preventDefault(); e.returnValue = ""; } });

  // ---------- files ----------
  function currentFolder() { return S.doc ? S.doc.folder : S.folderOnly; }
  function loadFiles() {
    var folder = currentFolder(), el = $("files");
    if (!folder) { renderFiles({ count: 0, files: [] }); return Promise.resolve(); }
    return api("/api/list?folder=" + encodeURIComponent(folder)).then(function (j) {
      if (folder !== currentFolder()) return;
      renderFiles(j);
    }).catch(function () { if (folder === currentFolder()) el.innerHTML = '<div class="none">Impossibile caricare i file. <button class="btn small ghost" type="button" data-reload>Riprova</button></div>'; });
  }
  function renderFiles(j) {
    S.files = j.files;
    var i = S.folders.findIndex(function (f) { return f.folder === currentFolder(); });
    if (i >= 0) { S.folders[i].count = j.count; S.folders[i].size = j.total; } else if (j.count) S.folders.push({ folder: currentFolder(), count: j.count, size: j.total });
    $("files-meta").textContent = j.count ? j.count + " file · " + size(j.total) + (j.zip ? " · i giornalisti possono scaricare tutto in ZIP" : "") : "";
    var lastDir = null;
    $("files").innerHTML = j.count ? j.files.map(function (f, idx) {
      var head = "";
      if ((f.dir || "") !== lastDir) {
        lastDir = f.dir || "";
        if (lastDir) {
          var inside = j.files.filter(function (x) { return x.dir === lastDir; });
          head = '<div class="fd"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg><b>' + esc(lastDir.split("/").join(" / ")) + "</b><span>" + inside.length + " file" + '</span><button type="button" class="del" data-dir="' + esc(lastDir) + '">Elimina cartella</button></div>';
        }
      }
      var th = f.thumb ? ' style="background-image:url(\'' + esc(f.thumb) + '\')"' : "";
      var ext = (/\.([^.]+)$/.exec(f.name) || [0, "FILE"])[1].toUpperCase().slice(0, 4);
      return head + '<div class="f' + (f.dir ? " in" : "") + '" data-i="' + idx + '"><div class="th"' + th + ">" + (f.thumb ? "" : esc(ext)) + '</div><div class="nm"><b title="' + esc(f.path || f.name) + '">' + esc(f.name) + "</b><span>" + size(f.size) + (f.width ? " · " + f.width + "×" + f.height : "") + (f.pages ? " · " + f.pages + " pagine" : "") + "</span></div>" +
        '<div class="acts"><a href="' + esc(f.url) + '" target="_blank" rel="noopener">Apri</a><button type="button" data-a="rename">Rinomina</button><button type="button" class="del" data-a="delete">Elimina</button></div></div>';
    }).join("") : '<div class="none">Ancora nessun file. Trascina file o cartelle nel riquadro qui sopra.</div>';
  }
  $("files").addEventListener("click", function (e) {
    if (e.target.closest("[data-reload]")) return loadFiles();
    var dd = e.target.closest("[data-dir]");
    if (dd) {
      var dir = dd.dataset.dir, n = S.files.filter(function (x) { return x.dir === dir || x.dir.indexOf(dir + "/") === 0; }).length;
      confirmBox("Eliminare la cartella “" + dir + "”?", (n === 1 ? "Il suo file verrà eliminato" : "I suoi " + n + " file verranno eliminati") + (S.doc && S.doc.status === "draft" ? "" : " e spariranno dal sito") + ". L’operazione non si può annullare.", "Elimina cartella", true).then(function (ok) {
        if (!ok) return;
        busy(dd, function () { return api("/api/admin/folder?" + qs({ folder: currentFolder(), sub: dir }), { method: "DELETE", timeout: 300000 }).then(function () { toast("Cartella eliminata"); refreshStats(); return loadFiles(); }); });
      });
      return;
    }
    var a = e.target.closest("[data-a]"); if (!a) return;
    var row = a.closest(".f"), f = S.files[+row.dataset.i], folder = currentFolder();
    if (a.dataset.a === "delete") {
      confirmBox("Eliminare “" + f.name + "”?", "Il file sparirà dal sito" + (S.doc && S.doc.status === "draft" ? "" : " subito") + ". L’operazione non si può annullare.", "Elimina file", true).then(function (ok) {
        if (!ok) return;
        busy(a, function () { return api("/api/admin/file?" + qs({ folder: folder, name: f.path || f.name }), { method: "DELETE" }).then(function () { toast("File eliminato"); return loadFiles(); }); });
      });
    }
    if (a.dataset.a === "rename") startRename(row, f, folder);
  });
  function startRename(row, f, folder) {
    var nm = row.querySelector(".nm"), acts = row.querySelector(".acts"), old = nm.innerHTML;
    nm.innerHTML = '<form class="ren"><input aria-label="Nuovo nome del file" maxlength="180"><button class="btn small primary" type="submit">Salva</button><button class="btn small ghost" type="button">Annulla</button></form>';
    acts.hidden = true;
    var form = nm.querySelector("form"), inp = form.querySelector("input");
    inp.value = f.name; inp.focus();
    var dot = f.name.lastIndexOf("."); inp.setSelectionRange(0, dot > 0 ? dot : f.name.length);
    function cancel() { nm.innerHTML = old; acts.hidden = false; }
    form.querySelector(".ghost").onclick = cancel;
    inp.onkeydown = function (e) { if (e.key === "Escape") cancel(); };
    form.onsubmit = function (e) {
      e.preventDefault();
      var to = inp.value.replace(/[\\/]/g, "-").replace(/\s+/g, " ").trim();
      var ext = dot > 0 ? f.name.slice(dot) : "";
      if (!to) return inp.focus();
      if (ext && to.toLowerCase().slice(-ext.length) !== ext.toLowerCase()) to += ext; // keep the extension
      if (to === f.name) return cancel();
      busy(form.querySelector(".primary"), function () {
        return api("/api/admin/rename?" + qs({ folder: folder, name: f.path || f.name, to: to }), { method: "POST", timeout: 600000 }).then(function () { toast("File rinominato"); return loadFiles(); });
      });
    };
  }

  // Older documents get their media folder when the first files are added
  function ensureFolder() {
    var d = S.doc;
    if (!d) return Promise.resolve(S.folderOnly);
    if (d.folder) return Promise.resolve(d.folder);
    return api("/api/admin/docs/" + d.id + "/folder", { method: "POST" }).then(function (j) { putDoc(j.doc); if (S.doc && S.doc.id === j.doc.id) S.doc = j.doc; return j.doc.folder; });
  }

  // ---------- Webflow offline: files only ----------
  function renderFallback() {
    $("fallback-folders").innerHTML = S.folders.length ? S.folders.map(function (f) {
      return '<a class="doc" href="#folder=' + encodeURIComponent(f.folder) + '"><div class="ic">' + ICON.other + '</div><div class="t"><b>' + esc(f.folder) + "</b><span>" + f.count + " file · " + size(f.size) + "</span></div><div></div></a>";
    }).join("") : '<p class="sub">Nessuna cartella.</p>';
  }
  $("retry").onclick = function () { busy(this, function () { return load().then(function () { if (S.offline) toast("Webflow continua a non rispondere", true); else { toast("Connessione a Webflow ripristinata"); route(); } }); }); };
  // Finished rows go; uploads still running for another document stay visible, labelled
  function clearQueue() {
    Array.prototype.forEach.call($("queue").children, function (r) {
      if (r.classList.contains("done") || r.classList.contains("fail")) return r.remove();
      var n = r.querySelector(".n");
      if (!n.dataset.to) { n.dataset.to = 1; n.textContent += "  →  " + r.dataset.doc; }
    });
  }
  // ---------- How it works ----------
  function openHelp() {
    S.view = "help"; renderSide(); show("v-help");
    try { localStorage.setItem("stl26_help_seen", "1"); } catch (e) {}
  }

  // ---------- other collections (press contacts, …) ----------
  var C = { key: null, data: null, q: "", item: null };
  // Italian labels for the Webflow fields (fallback: the Webflow name)
  var FIELD_IT = { name: "Nome e cognome", position: "Ruolo", email: "Email", "phone-number": "Telefono", country: "Brand / mercato" };
  function fieldLabel(f) { return FIELD_IT[f.slug] || f.name; }
  function openCms(key) {
    S.view = "cms:" + key; renderSide();
    if (C.key !== key) { C = { key: key, data: null, q: "", item: null }; $("cms-search").value = ""; }
    $("cms-title").textContent = (S.cms.filter(function (c) { return c.key === key; })[0] || { title: key }).title;
    $("cms-sub").textContent = ""; $("cms-list").innerHTML = '<div class="loading"><span class="spin"></span> Loading…</div>';
    $("cms-new").hidden = true;
    show("v-cms");
    return api("/api/admin/cms/" + encodeURIComponent(key), { timeout: 60000 }).then(function (j) {
      if (C.key !== key) return;
      C.data = j; renderCms();
    }).catch(function (e) { $("cms-list").innerHTML = '<div class="none">' + esc(e.message) + ' <button class="btn small ghost" type="button" data-cms-reload>Riprova</button></div>'; });
  }
  function refLabel(f, id) { var l = (C.data.refs[f.slug] || []).filter(function (r) { return r.id === id; })[0]; return l ? l.name : ""; }
  function renderCms() {
    var j = C.data, q = C.q.toLowerCase();
    $("cms-new").hidden = false; $("cms-new").textContent = "+ Nuovo " + (C.key === "contacts" ? "contatto" : "elemento");
    var live = j.items.filter(function (i) { return i.status !== "draft"; }).length;
    $("cms-sub").textContent = j.items.length + (j.items.length === 1 ? " elemento" : " elementi") + " · " + live + " online sul sito";
    var list = j.items.filter(function (i) { return !q || JSON.stringify(i.data).toLowerCase().indexOf(q) >= 0; })
      .sort(function (a, b) { return String(a.data.name || "").localeCompare(String(b.data.name || ""), "en"); });
    $("cms-list").innerHTML = list.length ? list.map(function (i) {
      var d = i.data, bits = j.fields.filter(function (f) { return f.slug !== "name"; }).map(function (f) {
        var v = d[f.slug];
        if (f.type === "MultiReference") return (v || []).map(function (id) { return refLabel(f, id); }).filter(Boolean).join(", ");
        if (f.type === "Reference") return refLabel(f, v);
        if (f.type === "Option") return ((f.options || []).filter(function (o) { return o.id === v; })[0] || {}).name || "";
        if (f.type === "Switch") return v ? fieldLabel(f) : "";
        return v || "";
      }).filter(Boolean);
      return '<a class="doc" href="#cms=' + esc(C.key) + '" data-item="' + i.id + '"><div class="ic">' + ICON.contact + '</div><div class="t"><b>' + esc(d.name || "(senza nome)") + "</b><span>" + esc(bits.join(" · ")) + '</span></div><div class="r"><span class="pill ' + STATUS[i.status][0] + '">' + (i.status === "live" ? "Online" : i.status === "draft" ? "Bozza" : "Modifiche da pubblicare") + "</span></div></a>";
    }).join("") : '<div class="none">' + (j.items.length ? "Nessun risultato per questa ricerca." : "Ancora nessun elemento.") + "</div>";
  }
  $("cms-search").addEventListener("input", function () { C.q = this.value; if (C.data) renderCms(); });
  $("cms-list").addEventListener("click", function (e) {
    if (e.target.closest("[data-cms-reload]")) return openCms(C.key);
    var a = e.target.closest("[data-item]"); if (!a) return;
    e.preventDefault();
    openItem(C.data.items.filter(function (i) { return i.id === a.dataset.item; })[0]);
  });
  $("cms-new").onclick = function () { openItem(null); };
  function openItem(item) {
    var j = C.data; C.item = item;
    var d = item ? item.data : {};
    $("i-title").textContent = item ? (d.name || "Modifica") : (C.key === "contacts" ? "Nuovo contatto" : "Nuovo elemento");
    $("i-pill").hidden = !item;
    if (item) { $("i-pill").className = "pill " + STATUS[item.status][0]; $("i-pill").textContent = STATUS[item.status][1]; }
    $("i-fields").innerHTML = j.fields.map(function (f) {
      var id = "if-" + f.slug, v = d[f.slug], label = esc(fieldLabel(f)) + (f.required ? "" : " <em>facoltativo</em>");
      if (f.type === "Switch") return '<label class="check full"><input type="checkbox" id="' + id + '"' + (v ? " checked" : "") + "> <span>" + esc(fieldLabel(f)) + "</span></label>";
      if (f.type === "Option" || f.type === "Reference") {
        var opts = f.type === "Option" ? f.options : (j.refs[f.slug] || []);
        return '<label class="field full"><span>' + label + '</span><select id="' + id + '"><option value="">—</option>' + opts.map(function (o) { return '<option value="' + o.id + '"' + (o.id === v ? " selected" : "") + ">" + esc(o.name) + "</option>"; }).join("") + "</select></label>";
      }
      if (f.type === "MultiReference") {
        var sel = v || [];
        return '<div class="field full"><span>' + label + '</span><div class="multi" id="' + id + '">' + (j.refs[f.slug] || []).map(function (o) { return '<label class="chipbox"><input type="checkbox" value="' + o.id + '"' + (sel.indexOf(o.id) >= 0 ? " checked" : "") + "><span>" + esc(o.name) + "</span></label>"; }).join("") + "</div></div>";
      }
      var type = { Email: "email", Phone: "tel", Link: "url", Number: "number" }[f.type] || "text";
      return '<label class="field full"><span>' + label + '</span><input id="' + id + '" type="' + type + '"' + (f.max ? ' maxlength="' + f.max + '"' : "") + ' value="' + esc(v == null ? "" : v) + '"></label>';
    }).join("");
    $("i-err").textContent = "";
    $("i-delete").hidden = !item;
    $("i-unpublish").hidden = !item || item.status === "draft";
    $("i-save").hidden = !!item && item.status !== "draft";
    $("i-publish").textContent = item && item.status !== "draft" ? "Salva modifiche" : "Salva e pubblica";
    $("m-item").hidden = false;
    var first = $("i-fields").querySelector("input,select"); if (first) first.focus();
  }
  function itemValues() {
    var out = {};
    C.data.fields.forEach(function (f) {
      var el = $("if-" + f.slug);
      if (f.type === "Switch") out[f.slug] = el.checked;
      else if (f.type === "MultiReference") out[f.slug] = Array.prototype.map.call(el.querySelectorAll("input:checked"), function (x) { return x.value; });
      else out[f.slug] = el.value.trim();
    });
    return out;
  }
  $("m-item").addEventListener("click", function (e) { if (e.target === this || e.target.closest("[data-close]")) this.hidden = true; });
  $("m-item").addEventListener("keydown", function (e) { if (e.key === "Escape") this.hidden = true; });
  function itemDone(item, msg) {
    var list = C.data.items, i = list.findIndex(function (x) { return x.id === item.id; });
    if (i >= 0) list[i] = item; else list.push(item);
    $("m-item").hidden = true; renderCms(); toast(msg);
  }
  $("item-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = e.submitter || $("i-publish"), mode = btn.dataset.mode, item = C.item, data = itemValues(), base = "/api/admin/cms/" + encodeURIComponent(C.key);
    $("i-err").textContent = "";
    var missing = C.data.fields.filter(function (f) { return f.required && !data[f.slug]; })[0];
    if (missing) { $("i-err").textContent = "Compila il campo “" + (FIELD_IT[missing.slug] || missing.name) + "”."; return; }
    if (btn.classList.contains("busy")) return;
    btn.classList.add("busy");
    var p = item ? api(base + "/" + item.id, { method: "PATCH", json: { data: data } }) : api(base, { method: "POST", json: { data: data }, once: true });
    p.then(function (j) {
      if (mode === "publish" && j.item.status === "draft") return api(base + "/" + j.item.id + "/publish", { method: "POST" }).then(function (k) { itemDone(k.item, "Salvato e pubblicato"); });
      itemDone(j.item, j.item.status === "draft" ? "Salvato come bozza" : "Modifiche salvate e pubblicate");
    }).catch(function (err) { $("i-err").textContent = err.message; }).then(function () { btn.classList.remove("busy"); });
  });
  $("i-unpublish").onclick = function () {
    var btn = this, item = C.item;
    busy(btn, function () { return api("/api/admin/cms/" + encodeURIComponent(C.key) + "/" + item.id + "/unpublish", { method: "POST" }).then(function (j) { itemDone(j.item, "Ritirato: non è più visibile sul sito"); }); });
  };
  $("i-delete").onclick = function () {
    var item = C.item, btn = this;
    $("m-item").hidden = true;
    confirmBox("Eliminare “" + (item.data.name || "questo elemento") + "”?", "Verrà tolto dal sito. L’operazione non si può annullare.", "Elimina", true).then(function (ok) {
      if (!ok) { $("m-item").hidden = false; return; }
      busy(btn, function () { return api("/api/admin/cms/" + encodeURIComponent(C.key) + "/" + item.id, { method: "DELETE" }).then(function () { C.data.items = C.data.items.filter(function (x) { return x.id !== item.id; }); renderCms(); toast("Eliminato"); }); });
    });
  };

  function openFolderOnly(folder) {
    // Reuse the document view without the Webflow parts
    S.doc = null; S.folderOnly = folder; S.view = "brand";
    var fb = brandBySlug(folder.split("/")[0]);
    $("back").querySelector("span").textContent = fb && !S.offline ? "Documenti " + fb.name : "Indietro"; $("back").href = fb && !S.offline ? "#brand=" + fb.slug : "#";
    $("doc-crumb").textContent = S.offline ? "Cartella (Webflow non raggiungibile)" : "Cartella non collegata a un documento"; $("doc-title").textContent = folder;
    $("doc-pill").className = "pill draft"; $("doc-pill").textContent = "Solo file"; $("doc-sub").textContent = "";
    ["doc-view", "doc-unpublish", "doc-publish", "details"].forEach(function (id) { $(id).hidden = true; });
    document.querySelector(".danger").hidden = true;
    var n = $("doc-notice");
    if (S.offline) n.hidden = true;
    else { n.className = "notice warn"; n.innerHTML = 'Questi file non sono sul sito perché nessun documento usa questa cartella. <button class="btn small primary" type="button" data-link="' + esc(folder) + '">Crea un documento con questi file</button>'; n.hidden = false; }
    clearQueue();
    show("v-doc"); loadFiles();
  }

  // ---------- drop zone ----------
  var drop = $("drop");
  ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("is-over"); }); });
  ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("is-over"); }); });
  drop.addEventListener("drop", function (e) { collectDrop(e.dataTransfer).then(enqueue); });
  $("file-input").addEventListener("change", function (e) { enqueue(fromInput(e.target.files)); e.target.value = ""; });
  $("dir-input").addEventListener("change", function (e) { enqueue(fromInput(e.target.files)); e.target.value = ""; });
  $("pick-files").onclick = function (e) { e.preventDefault(); $("file-input").click(); };
  $("pick-dir").onclick = function (e) { e.preventDefault(); $("dir-input").click(); };
  // Avoid the browser opening a file dropped outside a drop box
  ["dragover", "drop"].forEach(function (ev) { window.addEventListener(ev, function (e) { if (!e.target.closest || !e.target.closest(".drop")) e.preventDefault(); }); });

  // Files and whole folders (sub-folders kept) -> [{ file, path }]
  var JUNK = /^(\.|thumbs\.db$|desktop\.ini$|__macosx$)/i;
  function okPath(p) { return p.split("/").every(function (seg) { return seg && !JUNK.test(seg); }); }
  function fromInput(list) {
    return Array.prototype.map.call(list, function (f) { return { file: f, path: (f.webkitRelativePath || f.name).replace(/^\/+/, "") }; })
      .filter(function (x) { return okPath(x.path); });
  }
  function collectDrop(dt) {
    var items = dt.items && dt.items.length && dt.items[0].webkitGetAsEntry ? Array.prototype.map.call(dt.items, function (it) { return it.webkitGetAsEntry(); }).filter(Boolean) : null;
    if (!items) return Promise.resolve(fromInput(dt.files));
    var out = [];
    function walk(entry) {
      if (JUNK.test(entry.name)) return Promise.resolve();
      if (entry.isFile) return new Promise(function (res) { entry.file(function (f) { out.push({ file: f, path: entry.fullPath.replace(/^\/+/, "") }); res(); }, function () { res(); }); });
      var reader = entry.createReader(), all = [];
      return new Promise(function (res) {
        (function more() { reader.readEntries(function (batch) { if (!batch.length) return res(all); all = all.concat(Array.prototype.slice.call(batch)); more(); }, function () { res(all); }); })();
      }).then(function (children) { return children.reduce(function (p, c) { return p.then(function () { return walk(c); }); }, Promise.resolve()); });
    }
    return items.reduce(function (p, e) { return p.then(function () { return walk(e); }); }, Promise.resolve()).then(function () { return out; });
  }

  var jobs = [], running = 0;
  function enqueue(items) {
    var empty = items.filter(function (x) { return !x.file.size; }).length;
    items = items.filter(function (x) { return x.file.size > 0; });
    if (empty) toast(empty + (empty === 1 ? " file vuoto è stato saltato" : " file vuoti sono stati saltati"), true);
    if (!items.length) return;
    var owner = S.doc;
    ensureFolder().then(function (folder) {
      if (!folder) throw new Error("Questo documento non ha una cartella");
      items.forEach(function (it) { addJob(it, folder, owner); });
      pump();
    }).catch(function (e) { toast(e.message, true); });
  }
  function addJob(it, folder, owner) {
    var row = document.createElement("div");
    row.className = "q";
    row.innerHTML = '<div class="n"></div><div class="s">In attesa…</div><div class="bar"><i></i></div>';
    row.querySelector(".n").textContent = it.path;
    row.dataset.doc = owner ? owner.name : folder;
    $("queue").appendChild(row);
    var job = { file: it.file, path: it.path, folder: folder, row: row, doc: owner };
    row.__job = job;
    jobs.push(job); total.n++; total.bytes += it.file.size;
    summary();
  }
  // "Uploading 12 of 240 · 1.2 GB left" + retry of failed files
  var total = { n: 0, done: 0, bytes: 0, sent: 0 };
  function summary() {
    var el = $("q-sum"), failed = $("queue").querySelectorAll(".q.fail").length;
    if (!total.n && !failed) { el.hidden = true; return; }
    el.hidden = false;
    var left = Math.max(0, total.bytes - total.sent);
    el.querySelector("span").textContent = running || jobs.length
      ? "Caricamento " + Math.min(total.done + 1, total.n) + " di " + total.n + " · mancano " + size(left)
      : (failed ? (failed === 1 ? "1 file non è stato caricato" : failed + " file non sono stati caricati") : "Tutti i file sono stati caricati");
    el.querySelector("button").hidden = !failed || !!(running || jobs.length);
  }
  $("q-retry").onclick = function () {
    Array.prototype.forEach.call($("queue").querySelectorAll(".q.fail"), function (r) {
      var j = r.__job; r.classList.remove("fail"); r.querySelector(".s").textContent = "In attesa…"; r.querySelector(".bar i").style.width = "0";
      jobs.push(j); total.n++; total.bytes += j.file.size;
    });
    summary(); pump();
  };
  function pump() {
    while (running < 3 && jobs.length) {
      var j = jobs.shift(); running++;
      process(j).then(function (job) {
        job.row.classList.add("done"); job.row.querySelector(".s").textContent = "Caricato";
      }, function (err) {
        this.row.classList.add("fail"); this.row.querySelector(".s").textContent = (err.message || "Upload non riuscito");
      }.bind(j)).then(function () {
        running--; total.done++; total.sent += this.file.size; summary();
        if (!running && !jobs.length) {
          var failed = $("queue").querySelectorAll(".q.fail").length;
          loadFiles().then(function () {
            // Uploaded files now appear in the list below: keep only the failed rows
            setTimeout(function () { Array.prototype.forEach.call($("queue").querySelectorAll(".q.done"), function (r) { r.remove(); }); }, 1200);
          });
          refreshStats();
          failed ? toast((failed === 1 ? "1 file non è stato caricato" : failed + " file non sono stati caricati") + ": usa “Riprova i non riusciti”", true) : toast("Upload completato");
          total = { n: 0, done: 0, bytes: 0, sent: 0 }; summary();
        }
        pump();
      }.bind(j));
    }
  }
  function status(job, text, pct) {
    job.row.querySelector(".s").textContent = text;
    if (pct != null) job.row.querySelector(".bar i").style.width = Math.max(2, Math.round(pct)) + "%";
  }

  function process(job) {
    var f = job.file, meta = {};
    status(job, "Preparazione…", 1);
    return crc32File(f, function (p) { status(job, "Preparazione… " + Math.round(p * 100) + "%", p * 5); })
      .then(function (crc) {
        meta.crc32 = crc;
        status(job, "Creazione anteprima…", 5);
        // Previews are a bonus: never let a slow or unsupported file block the upload
        var timeout = new Promise(function (res) { setTimeout(function () { res({}); }, 30000); });
        return Promise.race([derive(f, meta).catch(function () { return {}; }), timeout]);
      })
      .then(function (d) {
        return uploadFile(job, meta).then(function () {
          var ups = [];
          if (d.thumb) ups.push(putBlob(job.folder, job.path, d.thumb, "thumb").catch(function () {}));
          if (d.preview) ups.push(putBlob(job.folder, job.path, d.preview, "preview").catch(function () {}));
          return Promise.all(ups);
        });
      })
      .then(function () { status(job, "Caricato", 100); return job; });
  }

  // ---------- CRC32 (stored so the Worker can build ZIPs without CPU work) ----------
  var TABLE = (function () { var t = new Int32Array(256 * 8); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } for (n = 0; n < 256; n++) { c = t[n]; for (k = 1; k < 8; k++) { c = t[c & 255] ^ (c >>> 8); t[k * 256 + n] = c; } } return t; })();
  function crcUpdate(crc, buf) {
    var i = 0, len = buf.length, T = TABLE;
    for (; i + 8 <= len; i += 8) {
      crc ^= buf[i] | (buf[i + 1] << 8) | (buf[i + 2] << 16) | (buf[i + 3] << 24);
      crc = T[1792 + (crc & 255)] ^ T[1536 + ((crc >>> 8) & 255)] ^ T[1280 + ((crc >>> 16) & 255)] ^ T[1024 + (crc >>> 24)] ^
            T[768 + buf[i + 4]] ^ T[512 + buf[i + 5]] ^ T[256 + buf[i + 6]] ^ T[buf[i + 7]];
    }
    for (; i < len; i++) crc = T[(crc ^ buf[i]) & 255] ^ (crc >>> 8);
    return crc;
  }
  function crc32File(file, onp) {
    var CH = 16 * 1024 * 1024, off = 0, crc = -1;
    function step() {
      if (off >= file.size) return Promise.resolve(((crc ^ -1) >>> 0).toString(16));
      return file.slice(off, off + CH).arrayBuffer().then(function (b) {
        crc = crcUpdate(crc, new Uint8Array(b)); off += CH; onp(Math.min(1, off / file.size)); return step();
      });
    }
    return step();
  }

  // ---------- thumbnails / previews made in the browser ----------
  function kind(f) {
    var e = (/\.([^.]+)$/.exec(f.name) || [0, ""])[1].toLowerCase();
    if (/^image\//.test(f.type) || ["jpg", "jpeg", "png", "webp", "gif", "avif"].indexOf(e) >= 0) return "image";
    if (/^video\//.test(f.type) || ["mp4", "mov", "m4v", "webm"].indexOf(e) >= 0) return "video";
    if (e === "pdf" || f.type === "application/pdf") return "pdf";
    return "doc";
  }
  function toJpeg(src, w, h, max, q) {
    var s = Math.min(1, max / Math.max(w, h));
    var c = document.createElement("canvas");
    c.width = Math.round(w * s); c.height = Math.round(h * s);
    var x = c.getContext("2d"); x.imageSmoothingQuality = "high";
    x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(src, 0, 0, c.width, c.height);
    return new Promise(function (res) { c.toBlob(res, "image/jpeg", q); });
  }
  function both(src, w, h) {
    return Promise.all([toJpeg(src, w, h, 720, 0.82), toJpeg(src, w, h, 2400, 0.86)]).then(function (r) { return { thumb: r[0], preview: r[1] }; });
  }
  function derive(f, meta) {
    var k = kind(f);
    if (k === "image") {
      return createImageBitmap(f).then(function (bmp) {
        meta.w = bmp.width; meta.h = bmp.height;
        return both(bmp, bmp.width, bmp.height).then(function (r) { bmp.close && bmp.close(); return r; });
      });
    }
    if (k === "video") {
      return new Promise(function (res, rej) {
        var v = document.createElement("video"), url = URL.createObjectURL(f), done = false;
        var t = setTimeout(function () { finish(null, new Error("timeout")); }, 15000);
        function finish(r, err) { if (done) return; done = true; clearTimeout(t); URL.revokeObjectURL(url); err ? rej(err) : res(r); }
        v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
        v.onloadedmetadata = function () { if (isFinite(v.duration)) meta.dur = Math.round(v.duration); meta.w = v.videoWidth; meta.h = v.videoHeight; v.currentTime = isFinite(v.duration) ? Math.min(2, v.duration * 0.1) : 0.5; };
        v.onseeked = function () { if (!v.videoWidth) return finish({}); both(v, v.videoWidth, v.videoHeight).then(function (r) { finish(r); }, function (e) { finish(null, e); }); };
        v.onerror = function () { finish(null, new Error("video not decodable")); };
      });
    }
    if (k === "pdf") {
      return loadPdfJs().then(function (lib) { return f.arrayBuffer().then(function (b) { return lib.getDocument({ data: b }).promise; }); })
        .then(function (doc) {
          meta.pages = doc.numPages;
          return doc.getPage(1).then(function (page) {
            var vp = page.getViewport({ scale: 1 }), scale = 1600 / vp.width, v2 = page.getViewport({ scale: scale });
            var c = document.createElement("canvas"); c.width = v2.width; c.height = v2.height;
            return page.render({ canvasContext: c.getContext("2d"), viewport: v2 }).promise.then(function () { doc.destroy(); return both(c, c.width, c.height); });
          });
        });
    }
    return Promise.resolve({});
  }
  var pdfjsP;
  function loadPdfJs() {
    return pdfjsP || (pdfjsP = new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = PDFJS + "pdf.min.js";
      s.onload = function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js"; res(window.pdfjsLib); };
      s.onerror = rej; document.head.appendChild(s);
    }));
  }

  // ---------- upload ----------
  function xhr(method, url, body, onp) {
    return new Promise(function (res, rej) {
      var x = new XMLHttpRequest();
      x.open(method, url); x.setRequestHeader("authorization", "Bearer " + token);
      if (body && body.type) x.setRequestHeader("content-type", body.type);
      x.upload.onprogress = function (e) { if (e.lengthComputable && onp) onp(e.loaded); };
      x.onload = function () {
        var j = {}; try { j = JSON.parse(x.responseText); } catch (e) {}
        if (x.status === 401) { logout(); return rej(new Error("Sessione scaduta")); }
        x.status < 300 ? res(j) : rej(new Error(j.error || "Errore " + x.status));
      };
      x.onerror = function () { rej(new Error("Errore di rete")); };
      x.send(body);
    });
  }
  function withRetry(fn, n) { return fn().catch(function (e) { if (n > 0 && e.message !== "Sessione scaduta") return new Promise(function (r) { setTimeout(r, 1500); }).then(function () { return withRetry(fn, n - 1); }); throw e; }); }
  function putBlob(folder, name, blob, derived) {
    return withRetry(function () { return xhr("PUT", "/api/admin/put?" + qs({ folder: folder, name: name, derived: derived }), blob); }, 2);
  }
  function uploadFile(job, meta) {
    var f = job.file, base = { folder: job.folder, name: job.path };
    var q = Object.assign({}, base, meta);
    if (f.size <= SINGLE_MAX) {
      return withRetry(function () {
        return xhr("PUT", "/api/admin/put?" + qs(q), f, function (l) { status(job, "Caricamento… " + size(l) + " / " + size(f.size), 5 + (l / f.size) * 94); });
      }, 2);
    }
    var parts = Math.ceil(f.size / PART), loaded = new Array(parts).fill(0), done = [];
    function prog() { var l = loaded.reduce(function (a, b) { return a + b; }, 0); status(job, "Caricamento… " + size(l) + " / " + size(f.size), 5 + (l / f.size) * 94); }
    return api("/api/admin/mpu/create?" + qs(Object.assign({ type: f.type || "application/octet-stream" }, q)), { method: "POST" }).then(function (m) {
      var next = 0;
      function worker() {
        if (next >= parts) return Promise.resolve();
        var i = next++, blob = f.slice(i * PART, Math.min(f.size, (i + 1) * PART));
        return withRetry(function () {
          return xhr("PUT", "/api/admin/mpu/part?" + qs(Object.assign({ uploadId: m.uploadId, part: i + 1 }, base)), blob, function (l) { loaded[i] = l; prog(); });
        }, 3).then(function (p) { loaded[i] = blob.size; done[i] = { partNumber: p.partNumber, etag: p.etag }; prog(); return worker(); });
      }
      return Promise.all([worker(), worker(), worker()]).then(function () {
        status(job, "Completamento…", 99);
        return api("/api/admin/mpu/complete?" + qs(Object.assign({ uploadId: m.uploadId }, base)), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ parts: done }) });
      }, function (err) {
        api("/api/admin/mpu/abort?" + qs(Object.assign({ uploadId: m.uploadId }, base)), { method: "POST" }).catch(function () {});
        throw err;
      });
    });
  }

  token ? start() : showLogin();
})();
