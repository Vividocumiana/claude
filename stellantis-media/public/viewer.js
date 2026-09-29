/* Stellantis – Mondial de l'Auto Paris 2026 · Media viewer
 * Usage: <div data-stl-media="fiat/photos"></div>
 *        <script src="https://<media-host>/viewer.js" defer></script>
 */
(function () {
  "use strict";
  var script = document.currentScript;
  var API = script ? new URL(script.src).origin : location.origin;

  // Stylesheet next to the script
  if (!document.querySelector('link[data-stlm-css]')) {
    var l = document.createElement("link");
    l.rel = "stylesheet"; l.href = API + "/viewer.css"; l.setAttribute("data-stlm-css", "");
    document.head.appendChild(l);
  }

  var I = {
    download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0-5-5m5 5 5-5M4 19h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
    zip: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0-5-5m5 5 5-5M4 19h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    open: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    folder: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    doc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm7 0v5h5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>'
  };
  var LABEL = { all: "All", image: "Photos", video: "Videos", pdf: "Documents", doc: "Documents" };

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function size(b) {
    if (b < 1024) return b + " B";
    var u = ["KB", "MB", "GB", "TB"], i = -1;
    do { b /= 1024; i++; } while (b >= 1024 && i < u.length - 1);
    return (b >= 100 ? Math.round(b) : b.toFixed(1)) + " " + u[i];
  }
  function dur(s) { s = Math.round(s); var m = Math.floor(s / 60); return m + ":" + ("0" + (s % 60)).slice(-2); }
  function ext(n) { var m = /\.([^.]+)$/.exec(n); return m ? m[1].toUpperCase() : "FILE"; }
  function group(k) { return k === "pdf" ? "doc" : k; }
  function title(n) { return n.replace(/\.[^.]+$/, "").replace(/[_]+/g, " "); }
  function sub(f) {
    var p = [ext(f.name), size(f.size)];
    if (f.width && f.height) p.push(f.width + " × " + f.height);
    if (f.duration) p.push(dur(f.duration));
    if (f.pages) p.push(f.pages + (f.pages > 1 ? " pages" : " page"));
    return p.join(" · ");
  }

  function mount(el, folder) {
    if (el.__stlm) return;
    el.__stlm = true;
    el.classList.add("stlm");
    el.innerHTML = '<div class="stlm-grid stlm-loading">' + new Array(7).join('<div class="stlm-skel"></div>') + "</div>";
    fetch(API + "/api/list?folder=" + encodeURIComponent(folder))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) { render(el, data); })
      .catch(function () { el.innerHTML = '<div class="stlm-empty">Materials could not be loaded. Please refresh the page.</div>'; });
  }

  function render(el, data) {
    var ORDER = { image: 0, video: 1, pdf: 2, doc: 3 };
    // Files at the top level first, then one section per sub-folder
    var top = function (f) { return (f.dir || "").split("/")[0]; };
    var dirs = (data.dirs || []).map(function (d) { return d.name; });
    var files = (data.files || []).slice().sort(function (a, b) {
      return (dirs.indexOf(top(a)) - dirs.indexOf(top(b))) || ORDER[a.kind] - ORDER[b.kind] || (a.path || a.name).localeCompare(b.path || b.name, "en", { numeric: true });
    });
    if (!files.length) { el.innerHTML = '<div class="stlm-empty">Materials will be available here soon.</div>'; return; }
    var counts = { image: 0, video: 0, doc: 0 };
    files.forEach(function (f) { counts[group(f.kind)]++; });
    var groups = Object.keys(counts).filter(function (k) { return counts[k]; });
    var tabs = groups.length > 1 ? '<div class="stlm-tabs" role="tablist">' + ["all"].concat(groups).map(function (g, i) {
      return '<button type="button" role="tab" class="stlm-tab' + (i ? "" : " is-active") + '" data-g="' + g + '" aria-selected="' + (i ? "false" : "true") + '">' + LABEL[g] + '<span>' + (g === "all" ? files.length : counts[g]) + "</span></button>";
    }).join("") + "</div>" : "";
    var zip = data.zip ? '<a class="stlm-btn stlm-btn-primary" href="' + esc(data.zip.url) + '" download>' + I.zip + '<span>Download all</span><em>' + size(data.zip.size) + "</em></a>" : "";
    var sections = [""].concat(dirs).map(function (d) {
      var idx = []; files.forEach(function (f, i) { if (top(f) === d) idx.push(i); });
      if (!idx.length) return "";
      var info = (data.dirs || []).filter(function (x) { return x.name === d; })[0];
      var head = d ? '<div class="stlm-sec-h">' + I.folder + '<div class="stlm-sec-t"><strong>' + esc(d) + "</strong><span>" + info.count + (info.count > 1 ? " files · " : " file · ") + size(info.size) + "</span></div>" +
        (info.zip ? '<a class="stlm-btn stlm-btn-ghost" href="' + esc(info.zip.url) + '" download>' + I.zip + "<span>Download folder</span><em>" + size(info.zip.size) + "</em></a>" : "") + "</div>" : "";
      return '<section class="stlm-sec"' + (d ? "" : ' data-root="1"') + ">" + head + '<div class="stlm-grid">' + idx.map(function (i) { return card(files[i], i); }).join("") + "</div></section>";
    }).join("");
    el.innerHTML =
      '<div class="stlm-bar"><div class="stlm-meta"><strong>' + files.length + (files.length > 1 ? " files" : " file") + "</strong><span>" + size(data.total) + "</span></div>" + tabs + zip + "</div>" + sections;

    var visible = Array.prototype.map.call(el.querySelectorAll(".stlm-card"), function (c) { return files[+c.getAttribute("data-i")]; });
    el.addEventListener("click", function (e) {
      var tab = e.target.closest(".stlm-tab");
      if (tab) {
        var g = tab.getAttribute("data-g");
        el.querySelectorAll(".stlm-tab").forEach(function (t) { var on = t === tab; t.classList.toggle("is-active", on); t.setAttribute("aria-selected", on); });
        visible = [];
        el.querySelectorAll(".stlm-card").forEach(function (c) {
          var f = files[+c.getAttribute("data-i")], show = g === "all" || group(f.kind) === g;
          c.hidden = !show;
          if (show) visible.push(f);
        });
        el.querySelectorAll(".stlm-sec").forEach(function (sec) { sec.hidden = !sec.querySelector(".stlm-card:not([hidden])"); });
        return;
      }
      if (e.target.closest(".stlm-card-dl")) return; // native download link
      var card = e.target.closest(".stlm-card");
      if (card) openBox(visible, visible.indexOf(files[+card.getAttribute("data-i")]));
    });
    el.addEventListener("keydown", function (e) {
      var card = e.target.closest(".stlm-card");
      if (card && (e.key === "Enter" || e.key === " ") && e.target === card) { e.preventDefault(); card.click(); }
    });
    el.querySelectorAll(".stlm-card img").forEach(function (img) {
      img.addEventListener("load", function () { img.parentNode.classList.add("is-loaded"); });
      img.addEventListener("error", function () { img.remove(); });
      if (img.complete) img.parentNode.classList.add("is-loaded");
    });

    function card(f, i) {
      var media = f.thumb ? '<img src="' + esc(f.thumb) + '" alt="" loading="lazy" decoding="async">' : '<div class="stlm-ph">' + I.doc + "<b>" + esc(ext(f.name)) + "</b></div>";
      var badge = f.kind === "video" ? '<span class="stlm-badge">' + I.play + (f.duration ? dur(f.duration) : "Video") + "</span>"
        : f.kind === "pdf" ? '<span class="stlm-badge">PDF</span>' : "";
      var deeper = f.dir && f.dir.indexOf("/") > 0 ? f.dir.split("/").slice(1).join(" / ") + " · " : "";
      return '<div class="stlm-card stlm-k-' + f.kind + '" data-i="' + i + '" role="button" tabindex="0" aria-label="Open ' + esc(f.name) + '">' +
        '<div class="stlm-thumb">' + media + badge + "</div>" +
        '<div class="stlm-info"><div class="stlm-name" title="' + esc(f.name) + '">' + esc(title(f.name)) + '</div><div class="stlm-sub">' + esc(deeper + sub(f)) + "</div></div>" +
        '<a class="stlm-card-dl" href="' + esc(f.download) + '" download aria-label="Download ' + esc(f.name) + '" title="Download original">' + I.download + "</a></div>";
    }
  }

  // ---------- Lightbox ----------
  var box, cur, list, lastFocus, touchX;
  function openBox(files, i) {
    list = files; lastFocus = document.activeElement;
    if (!box) {
      box = document.createElement("div");
      box.className = "stlm-lb";
      box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "Media viewer");
      box.innerHTML =
        '<div class="stlm-lb-top"><div class="stlm-lb-count"></div><div class="stlm-lb-title"><strong></strong><span></span></div>' +
        '<div class="stlm-lb-actions"><a class="stlm-btn stlm-btn-light stlm-lb-open" target="_blank" rel="noopener">' + I.open + '<span>Open</span></a>' +
        '<a class="stlm-btn stlm-btn-primary stlm-lb-dl" download>' + I.download + '<span>Download original</span></a>' +
        '<button type="button" class="stlm-icon stlm-lb-close" aria-label="Close">' + I.close + "</button></div></div>" +
        '<div class="stlm-lb-stage"><button type="button" class="stlm-icon stlm-lb-prev" aria-label="Previous">' + I.prev + '</button><div class="stlm-lb-media"></div>' +
        '<button type="button" class="stlm-icon stlm-lb-next" aria-label="Next">' + I.next + "</button></div>" +
        '<div class="stlm-lb-strip"></div>';
      document.body.appendChild(box);
      box.querySelector(".stlm-lb-close").onclick = closeBox;
      box.querySelector(".stlm-lb-prev").onclick = function () { go(-1); };
      box.querySelector(".stlm-lb-next").onclick = function () { go(1); };
      box.querySelector(".stlm-lb-stage").addEventListener("click", function (e) { if (e.target.classList.contains("stlm-lb-stage") || e.target.classList.contains("stlm-lb-media")) closeBox(); });
      box.querySelector(".stlm-lb-strip").addEventListener("click", function (e) { var t = e.target.closest("[data-j]"); if (t) show(+t.getAttribute("data-j")); });
      box.addEventListener("touchstart", function (e) { touchX = e.touches[0].clientX; }, { passive: true });
      box.addEventListener("touchend", function (e) {
        if (touchX == null || e.target.closest("video")) return;
        var dx = e.changedTouches[0].clientX - touchX; touchX = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      });
      document.addEventListener("keydown", function (e) {
        if (!box.classList.contains("is-open")) return;
        if (e.key === "Escape") closeBox();
        else if (e.key === "ArrowLeft") go(-1);
        else if (e.key === "ArrowRight") go(1);
        else if (e.key === "Tab") trap(e);
      });
    }
    box.querySelector(".stlm-lb-strip").innerHTML = list.length > 1 ? list.map(function (f, j) {
      return '<button type="button" data-j="' + j + '" aria-label="' + esc(f.name) + '">' + (f.thumb ? '<img src="' + esc(f.thumb) + '" alt="" loading="lazy">' : "<b>" + esc(ext(f.name)) + "</b>") + "</button>";
    }).join("") : "";
    box.classList.toggle("is-single", list.length < 2);
    document.documentElement.classList.add("stlm-noscroll");
    box.classList.add("is-open");
    show(i);
    box.querySelector(".stlm-lb-close").focus();
  }
  function trap(e) {
    var f = Array.prototype.filter.call(box.querySelectorAll("a[href],button,video"), function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function closeBox() {
    box.classList.remove("is-open");
    box.querySelector(".stlm-lb-media").innerHTML = "";
    document.documentElement.classList.remove("stlm-noscroll");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function go(d) { if (list.length > 1) show((cur + d + list.length) % list.length); }
  function show(i) {
    cur = i;
    var f = list[i], m = box.querySelector(".stlm-lb-media");
    box.querySelector(".stlm-lb-count").textContent = list.length > 1 ? (i + 1) + " / " + list.length : "";
    box.querySelector(".stlm-lb-title strong").textContent = title(f.name);
    box.querySelector(".stlm-lb-title span").textContent = sub(f);
    box.querySelector(".stlm-lb-dl").href = f.download;
    var open = box.querySelector(".stlm-lb-open");
    open.href = f.url; open.hidden = f.kind !== "pdf";
    box.querySelectorAll(".stlm-lb-strip [data-j]").forEach(function (b, j) {
      var on = j === i; b.classList.toggle("is-active", on);
      if (on && b.scrollIntoView) b.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    });
    m.className = "stlm-lb-media is-" + f.kind;
    if (f.kind === "image") {
      var src = f.preview || (f.size < 15e6 ? f.url : f.thumb);
      m.innerHTML = '<img alt="' + esc(f.name) + '" src="' + esc(src) + '">';
      [1, -1].forEach(function (d) { var n = list[(i + d + list.length) % list.length]; if (n && n.kind === "image" && n.preview) (new Image()).src = n.preview; });
    } else if (f.kind === "video") {
      m.innerHTML = '<video controls playsinline preload="metadata"' + (f.preview ? ' poster="' + esc(f.preview) + '"' : "") + ' src="' + esc(f.url) + '"></video>';
      var v = m.querySelector("video");
      v.addEventListener("error", function () {
        m.innerHTML = (f.preview ? '<img alt="" src="' + esc(f.preview) + '">' : "") +
          '<div class="stlm-lb-note">This video format cannot be played in the browser.<br>Use “Download original” to view it.</div>';
      });
    } else if (f.kind === "pdf") {
      m.innerHTML = '<iframe title="' + esc(f.name) + '" src="' + esc(f.url) + '#view=FitH"></iframe>';
    } else {
      m.innerHTML = '<div class="stlm-lb-file">' + I.doc + "<b>" + esc(ext(f.name)) + "</b><p>" + esc(f.name) + "<br><span>" + esc(size(f.size)) + "</span></p></div>";
    }
  }

  function init() {
    document.querySelectorAll("[data-stl-media]").forEach(function (el) {
      var f = (el.getAttribute("data-stl-media") || "").trim();
      if (f) mount(el, f);
    });
  }
  window.STLMedia = { mount: mount, init: init, api: API };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
