/* ============================================================
   Prospecta proposal — motion layer
   ============================================================ */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var stage = document.getElementById("stage");
  var wrap = document.querySelector(".stage-wrap");

  /* ---------- 1. Scale the 1280×754 stage to fit viewport ---------- */
  function fitStage() {
    if (!stage || !wrap) return;
    var vw = wrap.clientWidth;
    var scale = Math.min(1, vw / 1280);
    stage.style.transform = "scale(" + scale + ")";
    // collapse the wrapper to the scaled height so no dead space follows
    wrap.style.height = 754 * scale + "px";
  }
  fitStage();
  window.addEventListener("resize", fitStage, { passive: true });

  /* ---------- 2. Trend line length (for the draw animation) ---------- */
  var trend = document.getElementById("trendLine");
  if (trend && trend.getTotalLength) {
    try {
      var len = trend.getTotalLength();
      trend.style.setProperty("--len", len);
    } catch (e) { /* noop */ }
  }

  /* ---------- 3. Orchestrate entrance ---------- */
  function reveal() {
    document.body.classList.add("is-revealed");
    runCounters();
    // start ambient loops once the entrance has mostly played out
    var aliveDelay = reduce ? 0 : 2100;
    window.setTimeout(function () {
      document.body.classList.add("is-alive");
    }, aliveDelay);
  }
  // wait a beat so first paint shows the "before" state, then play
  if (document.readyState === "complete") {
    window.requestAnimationFrame(function () { window.setTimeout(reveal, 120); });
  } else {
    window.addEventListener("load", function () {
      window.requestAnimationFrame(function () { window.setTimeout(reveal, 120); });
    });
  }

  /* ---------- 4. Number counters ---------- */
  function runCounters() {
    var nums = document.querySelectorAll(".stage .card__num[data-to]");
    nums.forEach(function (el) {
      var to = parseFloat(el.getAttribute("data-to")) || 0;
      var prefix = el.getAttribute("data-prefix") || "";
      var suffix = el.getAttribute("data-suffix") || "";
      if (reduce) { el.textContent = prefix + to + suffix; return; }
      var start = null;
      var dur = 1200;
      // sync start with the card's reveal delay
      var delay = 1250;
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + Math.round(to * eased) + suffix;
        if (p < 1) window.requestAnimationFrame(step);
        else el.textContent = prefix + to + suffix;
      }
      window.setTimeout(function () { window.requestAnimationFrame(step); }, delay);
    });
  }

  if (reduce) return; // skip interactive motion below

  /* ---------- 5. Magnetic buttons ---------- */
  document.querySelectorAll("[data-magnetic]").forEach(function (btn) {
    var label = btn.querySelector(".btn__label");
    var strength = 0.35;
    btn.addEventListener("mousemove", function (e) {
      var r = btn.getBoundingClientRect();
      var x = e.clientX - r.left - r.width / 2;
      var y = e.clientY - r.top - r.height / 2;
      btn.style.transform = "translate(" + x * strength + "px," + y * strength + "px)";
      if (label) label.style.transform = "translate(" + x * strength * 0.4 + "px," + y * strength * 0.4 + "px)";
    });
    btn.addEventListener("mouseleave", function () {
      btn.style.transform = "";
      if (label) label.style.transform = "";
    });
  });

  /* ---------- 6. Mouse parallax across depth layers ---------- */
  var layers = Array.prototype.slice.call(document.querySelectorAll(".chart .layer"));
  var target = { x: 0, y: 0 };
  var current = { x: 0, y: 0 };
  var raf = null;

  if (stage) {
    stage.addEventListener("mousemove", function (e) {
      var r = stage.getBoundingClientRect();
      // normalized -0.5..0.5
      target.x = (e.clientX - r.left) / r.width - 0.5;
      target.y = (e.clientY - r.top) / r.height - 0.5;
      if (!raf) raf = window.requestAnimationFrame(loop);
    });
    stage.addEventListener("mouseleave", function () {
      target.x = 0; target.y = 0;
      if (!raf) raf = window.requestAnimationFrame(loop);
    });
  }

  function loop() {
    current.x += (target.x - current.x) * 0.08;
    current.y += (target.y - current.y) * 0.08;
    layers.forEach(function (layer) {
      var depth = parseFloat(layer.getAttribute("data-depth")) || 0;
      var tx = -current.x * depth;
      var ty = -current.y * depth;
      layer.style.transform = "translate3d(" + tx + "px," + ty + "px,0)";
    });
    if (Math.abs(target.x - current.x) > 0.001 || Math.abs(target.y - current.y) > 0.001) {
      raf = window.requestAnimationFrame(loop);
    } else {
      raf = null;
    }
  }
})();
