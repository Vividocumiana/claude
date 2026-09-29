/* Stellantis Paris 2026 – media upload page */
(function () {
  "use strict";
  var BRANDS = [
    ["stellantis", "Stellantis (corporate)"], ["alfa-romeo", "Alfa Romeo"], ["citroen", "Citroën"], ["ds-automobiles", "DS Automobiles"],
    ["fiat", "FIAT"], ["lancia", "Lancia"], ["leapmotor", "Leapmotor"], ["opel", "Opel"], ["peugeot", "PEUGEOT"]
  ];
  var SINGLE_MAX = 90 * 1024 * 1024;     // above this, multipart upload
  var PART = 50 * 1024 * 1024;           // multipart part size
  var PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
  var $ = function (id) { return document.getElementById(id); };
  var token = sessionStorage.getItem("stl26_up") || "";
  var state = { folders: [], open: null, folder: null };

  // ---------- utils ----------
  function slug(s) { return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function size(b) { if (b < 1024) return b + " B"; var u = ["KB", "MB", "GB", "TB"], i = -1; do { b /= 1024; i++; } while (b >= 1024 && i < 3); return (b >= 100 ? Math.round(b) : b.toFixed(1)) + " " + u[i]; }
  function toast(msg) { var t = $("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove("show"); }, 2600); }
  function brandName(s) { for (var i = 0; i < BRANDS.length; i++) if (BRANDS[i][0] === s) return BRANDS[i][1]; return s; }
  function api(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ authorization: "Bearer " + token }, opts.headers || {});
    return fetch(path, opts).then(function (r) {
      if (r.status === 401) { logout(); throw new Error("Session expired, please sign in again"); }
      return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "Error " + r.status); return j; });
    });
  }
  function qs(o) { return Object.keys(o).filter(function (k) { return o[k] != null && o[k] !== ""; }).map(function (k) { return k + "=" + encodeURIComponent(o[k]); }).join("&"); }

  // ---------- auth ----------
  function showLogin() { $("app").hidden = true; $("login").hidden = false; $("pwd").focus(); }
  function logout() { token = ""; sessionStorage.removeItem("stl26_up"); showLogin(); }
  $("logout").onclick = logout;
  $("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    $("login-err").textContent = "";
    fetch("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: $("pwd").value }) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "Sign-in failed"); return j; }); })
      .then(function (j) { token = j.token; sessionStorage.setItem("stl26_up", token); $("pwd").value = ""; start(); })
      .catch(function (err) { $("login-err").textContent = err.message; });
  });

  function start() {
    $("login").hidden = true; $("app").hidden = false;
    loadFolders();
  }

  // ---------- sidebar ----------
  function loadFolders() {
    return api("/api/admin/folders").then(function (j) { state.folders = j.folders; renderSide(); }).catch(function (e) { toast(e.message); });
  }
  function renderSide() {
    var side = $("side");
    side.innerHTML = BRANDS.map(function (b) {
      var fs = state.folders.filter(function (f) { return f.folder.split("/")[0] === b[0]; });
      if (state.folder && state.folder.split("/")[0] === b[0] && !fs.some(function (f) { return f.folder === state.folder; }))
        fs.push({ folder: state.folder, count: 0, size: 0 });
      var open = state.open === b[0];
      return '<div class="brand' + (open ? " is-open" : "") + '"><button type="button" data-brand="' + b[0] + '" aria-expanded="' + open + '">' + esc(b[1]) + "<span>" + fs.length + (fs.length === 1 ? " folder" : " folders") + "</span></button>" +
        (open ? '<div class="folders">' + fs.map(function (f) {
          return '<button type="button" data-folder="' + esc(f.folder) + '" class="' + (f.folder === state.folder ? "is-active" : "") + '">' + esc(f.folder.split("/").slice(1).join(" / ")) + "<span>" + f.count + "</span></button>";
        }).join("") + '<button type="button" class="new" data-new="' + b[0] + '">+ New folder</button></div>' : "") + "</div>";
    }).join("");
  }
  $("side").addEventListener("click", function (e) {
    var b = e.target.closest("[data-brand]"), f = e.target.closest("[data-folder]"), n = e.target.closest("[data-new]");
    if (b) { state.open = state.open === b.dataset.brand ? null : b.dataset.brand; renderSide(); }
    else if (f) openFolder(f.dataset.folder);
    else if (n) {
      var wrap = document.createElement("form");
      wrap.className = "new-form";
      wrap.innerHTML = '<input placeholder="e.g. photos" aria-label="New folder name" required><button class="btn small primary" type="submit">Create</button>';
      n.replaceWith(wrap);
      var inp = wrap.querySelector("input"); inp.focus();
      wrap.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var name = slug(inp.value);
        if (!name) return;
        openFolder(n.dataset.new + "/" + name);
      });
    }
  });

  // ---------- folder ----------
  function openFolder(folder) {
    state.folder = folder; state.open = folder.split("/")[0];
    renderSide();
    $("pick").hidden = true; $("folder").hidden = false;
    $("crumb").textContent = brandName(state.open);
    $("folder-title").textContent = folder.split("/").slice(1).join(" / ");
    $("path").textContent = folder;
    $("preview-link").href = "/preview/?folder=" + encodeURIComponent(folder);
    $("queue").innerHTML = "";
    loadFiles();
  }
  $("copy").onclick = function () {
    var t = $("path").textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast("Folder path copied"); }, function () {
      var r = document.createRange(); r.selectNodeContents($("path")); var s = getSelection(); s.removeAllRanges(); s.addRange(r); toast("Press Ctrl/Cmd+C to copy");
    });
  };
  function loadFiles() {
    var folder = state.folder;
    return fetch("/api/list?folder=" + encodeURIComponent(folder)).then(function (r) { return r.json(); }).then(function (j) {
      if (folder !== state.folder) return;
      $("files-meta").textContent = j.count ? j.count + (j.count === 1 ? " file · " : " files · ") + size(j.total) : "";
      $("files").innerHTML = j.count ? j.files.map(function (f) {
        var th = f.thumb ? ' style="background-image:url(\'' + esc(f.thumb) + '\')"' : "";
        var ext = (/\.([^.]+)$/.exec(f.name) || [0, "FILE"])[1].toUpperCase();
        var warn = f.thumb || f.kind === "doc" ? "" : " · no preview";
        return '<div class="f"><div class="th"' + th + ">" + (f.thumb ? "" : esc(ext)) + '</div><div class="nm"><b title="' + esc(f.name) + '">' + esc(f.name) + "</b><span>" + size(f.size) + warn + (f.zippable ? "" : " · not in ZIP") + "</span></div>" +
          '<a href="' + esc(f.url) + '" target="_blank" rel="noopener">Open</a><button class="del" type="button" data-name="' + esc(f.name) + '">Delete</button></div>';
      }).join("") : '<div class="none">No files yet. Drop files above to upload them.</div>';
    });
  }
  $("files").addEventListener("click", function (e) {
    var d = e.target.closest(".del");
    if (!d || !confirm("Delete “" + d.dataset.name + "”? It will disappear from the press kit.")) return;
    api("/api/admin/file?" + qs({ folder: state.folder, name: d.dataset.name }), { method: "DELETE" })
      .then(function () { toast("File deleted"); loadFiles(); loadFolders(); }).catch(function (err) { toast(err.message); });
  });

  // ---------- drop zone ----------
  var drop = $("drop");
  ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("is-over"); }); });
  ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("is-over"); }); });
  drop.addEventListener("drop", function (e) { enqueue(e.dataTransfer.files); });
  $("file-input").addEventListener("change", function (e) { enqueue(e.target.files); e.target.value = ""; });
  window.addEventListener("beforeunload", function (e) { if (running) { e.preventDefault(); e.returnValue = ""; } });

  var jobs = [], running = 0;
  function enqueue(fileList) {
    Array.prototype.forEach.call(fileList, function (file) {
      if (/^\./.test(file.name)) return;
      var row = document.createElement("div");
      row.className = "q";
      row.innerHTML = '<div class="n"></div><div class="s">Waiting…</div><div class="bar"><i></i></div>';
      row.querySelector(".n").textContent = file.name;
      $("queue").prepend(row);
      jobs.push({ file: file, folder: state.folder, row: row });
    });
    pump();
  }
  function pump() {
    while (running < 2 && jobs.length) {
      var j = jobs.shift(); running++;
      process(j).then(function (job) {
        job.row.classList.add("done"); job.row.querySelector(".s").textContent = "Uploaded";
      }, function (err) {
        this.row.classList.add("fail"); this.row.querySelector(".s").textContent = err.message || "Upload failed";
      }.bind(j)).then(function () {
        running--;
        if (!running && !jobs.length) { loadFiles(); loadFolders(); toast("Upload complete"); }
        pump();
      });
    }
  }
  function status(job, text, pct) {
    job.row.querySelector(".s").textContent = text;
    if (pct != null) job.row.querySelector(".bar i").style.width = Math.max(2, Math.round(pct)) + "%";
  }

  function process(job) {
    var f = job.file, meta = {};
    status(job, "Preparing…", 1);
    return crc32File(f, function (p) { status(job, "Preparing… " + Math.round(p * 100) + "%", p * 5); })
      .then(function (crc) {
        meta.crc32 = crc;
        status(job, "Creating preview…", 5);
        // Previews are a bonus: never let a slow or unsupported file block the upload
        var timeout = new Promise(function (res) { setTimeout(function () { res({}); }, 30000); });
        return Promise.race([derive(f, meta).catch(function () { return {}; }), timeout]);
      })
      .then(function (d) {
        return uploadFile(job, meta).then(function () {
          var ups = [];
          if (d.thumb) ups.push(putBlob(job.folder, f.name, d.thumb, "thumb"));
          if (d.preview) ups.push(putBlob(job.folder, f.name, d.preview, "preview"));
          return Promise.all(ups);
        });
      })
      .then(function () { status(job, "Uploaded", 100); return job; });
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
        if (x.status === 401) { logout(); return rej(new Error("Session expired")); }
        x.status < 300 ? res(j) : rej(new Error(j.error || "Error " + x.status));
      };
      x.onerror = function () { rej(new Error("Network error")); };
      x.send(body);
    });
  }
  function withRetry(fn, n) { return fn().catch(function (e) { if (n > 0 && e.message !== "Session expired") return new Promise(function (r) { setTimeout(r, 1500); }).then(function () { return withRetry(fn, n - 1); }); throw e; }); }
  function putBlob(folder, name, blob, derived) {
    return withRetry(function () { return xhr("PUT", "/api/admin/put?" + qs({ folder: folder, name: name, derived: derived }), blob); }, 2);
  }
  function uploadFile(job, meta) {
    var f = job.file, base = { folder: job.folder, name: f.name };
    var q = Object.assign({}, base, meta);
    if (f.size <= SINGLE_MAX) {
      return withRetry(function () {
        return xhr("PUT", "/api/admin/put?" + qs(q), f, function (l) { status(job, "Uploading… " + size(l) + " / " + size(f.size), 5 + (l / f.size) * 94); });
      }, 2);
    }
    var parts = Math.ceil(f.size / PART), loaded = new Array(parts).fill(0), done = [];
    function prog() { var l = loaded.reduce(function (a, b) { return a + b; }, 0); status(job, "Uploading… " + size(l) + " / " + size(f.size), 5 + (l / f.size) * 94); }
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
        status(job, "Finishing…", 99);
        return api("/api/admin/mpu/complete?" + qs(Object.assign({ uploadId: m.uploadId }, base)), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ parts: done }) });
      }, function (err) {
        api("/api/admin/mpu/abort?" + qs(Object.assign({ uploadId: m.uploadId }, base)), { method: "POST" }).catch(function () {});
        throw err;
      });
    });
  }

  token ? start() : showLogin();
})();
