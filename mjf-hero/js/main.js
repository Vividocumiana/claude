/* ============================================================================
   MJF Professional Network — Hero interactions
   Lenis (smooth scroll) + GSAP (floating tiles, person<->grey state crossfade,
   typewriter badge, hover, entrance). Degrades gracefully if libs are absent
   and respects prefers-reduced-motion.
   ============================================================================ */
(function () {
  "use strict";

  var html = document.documentElement;
  html.classList.add("js");

  var hasGSAP = typeof window.gsap !== "undefined";
  var gsap = window.gsap;
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var MOBILE_BP = 720;

  var stage = document.getElementById("stage");
  var scaler = document.getElementById("heroScaler");
  var tilesWrap = document.getElementById("tiles");
  var tiles = Array.prototype.slice.call(document.querySelectorAll(".tile"));
  var nav = document.getElementById("nav");
  var content = document.getElementById("heroContent");
  var contentKids = content ? Array.prototype.slice.call(content.children) : [];

  var STAGE_W = 1280;
  var STAGE_H = 754;

  /* Deterministic pseudo-random so builds/reloads are stable (no Math.random). */
  function seeded(i, salt) {
    var x = Math.sin((i + 1) * 12.9898 + (salt || 0) * 78.233) * 43758.5453;
    return x - Math.floor(x); // 0..1
  }
  function range(i, salt, min, max) { return min + seeded(i, salt) * (max - min); }

  /* ------------------------------------------------------------ responsive scale */
  function isMobile() { return window.innerWidth <= MOBILE_BP; }

  function applyScale() {
    if (!scaler) return;
    if (isMobile()) {
      scaler.style.removeProperty("--scale");
      scaler.style.marginBottom = "";
      return;
    }
    var avail = window.innerWidth;
    var scale = Math.min(1, avail / STAGE_W);
    scaler.style.setProperty("--scale", scale.toFixed(4));
    // collapse the empty space left below the transform-scaled (top-anchored) box
    scaler.style.marginBottom = (-STAGE_H * (1 - scale)).toFixed(2) + "px";
  }

  /* --------------------------------------------------- build state layers on tiles */
  // Photo pool for revealing people inside grey tiles.
  var photoPool = [];
  for (var p = 1; p <= 21; p++) {
    photoPool.push("assets/img/person-" + String(p).padStart(2, "0") + ".svg");
  }

  tiles.forEach(function (tile, i) {
    var op = parseFloat(tile.getAttribute("data-op")) || 1;
    tile.style.setProperty("--base-op", op);
    tile._baseOp = op;
    tile._type = tile.getAttribute("data-type");
    tile._state = tile._type; // current visible state: "photo" | "grey"

    if (tile._type === "photo") {
      // add a grey layer we can crossfade in to switch the tile to its grey state
      var grey = document.createElement("div");
      grey.className = "tile__grey-layer";
      tile.appendChild(grey);
      tile._greyLayer = grey;
    } else {
      // grey tile: add a hidden person layer we can crossfade in
      var img = document.createElement("img");
      img.alt = "";
      img.src = photoPool[Math.floor(seeded(i, 3) * photoPool.length)];
      img.style.opacity = "0";
      img.style.transition = "none";
      tile.appendChild(img);
      tile._personLayer = img;
    }
  });

  /* ------------------------------------------------------------- no GSAP fallback */
  if (!hasGSAP || prefersReduced) {
    // Show everything statically at its base opacity.
    contentKids.forEach(function (el) { el.style.opacity = 1; });
    if (nav) nav.style.opacity = 1;
    tiles.forEach(function (t) { t.style.opacity = t._baseOp; });
    if (isMobile()) markMobileTiles();
    applyScale();
    window.addEventListener("resize", debounce(function () {
      applyScale(); toggleMobileTiles();
    }, 150));
    initTypewriter(false); // still cycle words (pure JS), unless reduced motion
    if (prefersReduced) freezeTypewriter();
    initBurger();
    return;
  }

  /* --------------------------------------------------------- Lenis smooth scroll */
  if (typeof window.Lenis !== "undefined") {
    var lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ------------------------------------------------------------------- entrance */
  gsap.set(tiles, { opacity: 0, scale: 0.55 });
  gsap.set([nav].concat(contentKids), { opacity: 0, y: 16 });

  // distance from stage center → outward stagger
  var cx = STAGE_W / 2, cy = STAGE_H / 2;
  tiles.forEach(function (t) {
    var r = t.getBoundingClientRect();
    // approximate center in stage coords via offsetLeft/Top
    t._dist = Math.hypot((t.offsetLeft + 41) - cx, (t.offsetTop + 41) - cy);
  });
  var maxDist = Math.max.apply(null, tiles.map(function (t) { return t._dist; })) || 1;

  var intro = gsap.timeline({ onComplete: startAmbient });
  intro
    .to(nav, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, 0.1)
    .to(contentKids, { opacity: 1, y: 0, duration: 0.7, stagger: 0.09, ease: "power3.out" }, 0.2);

  tiles.forEach(function (t) {
    var delay = 0.15 + (t._dist / maxDist) * 0.55;
    intro.to(t, {
      opacity: t._baseOp,
      scale: 1,
      duration: 0.7,
      ease: "back.out(1.6)"
    }, delay);
  });

  /* --------------------------------------------------- floating + state ambient */
  function startAmbient() {
    if (isMobile()) markMobileTiles();
    floatTiles();
    scheduleStateChanges();
  }

  function floatTiles() {
    tiles.forEach(function (t, i) {
      var dx = range(i, 1, 6, 14) * (seeded(i, 5) > 0.5 ? 1 : -1);
      var dy = range(i, 2, 8, 16) * (seeded(i, 6) > 0.5 ? 1 : -1);
      var rot = range(i, 7, 0.6, 2.2) * (seeded(i, 8) > 0.5 ? 1 : -1);
      var dur = range(i, 3, 4.2, 7.5);
      var del = range(i, 4, 0, 2.5);

      gsap.to(t, {
        x: dx, y: dy, rotation: rot,
        duration: dur, delay: del,
        ease: "sine.inOut", yoyo: true, repeat: -1
      });
    });
  }

  // Softly crossfade a random tile between its person and grey states.
  function scheduleStateChanges() {
    function tick() {
      var pool = isMobile()
        ? tiles.filter(function (t) { return t.classList.contains("is-mobile"); })
        : tiles;
      if (pool.length) {
        var howMany = 1 + Math.round(seeded(Date.now() % 997, 9)); // 1–2 tiles
        for (var k = 0; k < howMany; k++) {
          var t = pool[Math.floor(Math.random() * pool.length)];
          flipTileState(t);
        }
      }
      gsap.delayedCall(range((Date.now() % 500), 11, 0.7, 1.5), tick);
    }
    gsap.delayedCall(0.8, tick);
  }

  function flipTileState(t) {
    if (t._busy) return;
    t._busy = true;
    var toGrey = t._state === "photo";
    var layer = t._type === "photo" ? t._greyLayer : t._personLayer;
    // For a photo tile: greyLayer 0->1 = becomes grey. For a grey tile: personLayer 0->1 = reveals person.
    var targetLayerOp;
    if (t._type === "photo") {
      targetLayerOp = toGrey ? 1 : 0;
    } else {
      targetLayerOp = toGrey ? 0 : 1; // grey tile: showing person means personLayer=1
    }
    var tl = gsap.timeline({ onComplete: function () { t._busy = false; } });
    tl.to(t, { scale: 0.94, duration: 0.5, ease: "sine.inOut" }, 0)
      .to(t, { scale: 1, duration: 0.6, ease: "sine.out" }, 0.5)
      .to(layer, { opacity: targetLayerOp, duration: 0.9, ease: "power1.inOut" }, 0);
    t._state = toGrey ? "grey" : "photo";
  }

  /* ----------------------------------------------------------- mobile scatter */
  var mobilePositions = [
    { l: "4%",  t: "8%",  extra: false },
    { l: "80%", t: "13%", extra: false },
    { l: "1%",  t: "46%", extra: true  },
    { l: "83%", t: "52%", extra: false },
    { l: "9%",  t: "85%", extra: true  },
    { l: "76%", t: "82%", extra: false }
  ];

  function markMobileTiles() {
    var photos = tiles.filter(function (t) { return t._type === "photo"; });
    mobilePositions.forEach(function (pos, idx) {
      var t = photos[idx];
      if (!t) return;
      t.classList.add("is-mobile");
      if (pos.extra) t.classList.add("is-mobile-extra");
      t.style.left = pos.l;
      t.style.top = pos.t;
      t.style.setProperty("--base-op", "0.55");
      t._baseOp = 0.55;
      if (hasGSAP) gsap.set(t, { opacity: 0.55, scale: 1, clearProps: "" });
      else t.style.opacity = 0.55;
    });
  }

  function toggleMobileTiles() {
    if (isMobile()) {
      markMobileTiles();
    } else {
      // restore desktop: clear inline mobile overrides
      tiles.forEach(function (t) {
        t.classList.remove("is-mobile", "is-mobile-extra");
        if (t.getAttribute("data-op")) {
          var op = parseFloat(t.getAttribute("data-op")) || 1;
          t.style.left = "";  // inline coords come back from the original style attr? no—
          // NOTE: original left/top are in the style attribute so they persist; we only
          // added left/top overrides for the first 6 photos. Re-apply from data if needed.
        }
      });
      restoreDesktopPositions();
    }
  }

  // Cache the original inline left/top so we can restore after mobile overrides.
  tiles.forEach(function (t) {
    t._origLeft = t.style.left;
    t._origTop = t.style.top;
  });
  function restoreDesktopPositions() {
    tiles.forEach(function (t) {
      t.style.left = t._origLeft;
      t.style.top = t._origTop;
      var op = parseFloat(t.getAttribute("data-op")) || 1;
      t.style.setProperty("--base-op", op);
      t._baseOp = op;
      if (hasGSAP) gsap.set(t, { opacity: op });
    });
  }

  /* ------------------------------------------------------------------ typewriter */
  function initTypewriter(animated) {
    var el = document.getElementById("personeText");
    var caret = document.querySelector(".persone__caret");
    if (!el) return;
    var words = ["Persone", "Professionisti", "Manager", "Consulenti", "Avvocati", "Giornalisti"];
    var wi = 0, ci = words[0].length; // start fully typed on "Persone"
    var deleting = false;
    var TYPE = 70, DEL = 42, HOLD = 1500, PAUSE = 380;
    el.textContent = words[0];

    // blinking caret
    if (caret) {
      caret.classList.add("is-on");
      window._twCaret = setInterval(function () {
        caret.classList.toggle("is-on");
      }, 530);
    }

    window._twStop = false;
    function step() {
      if (window._twStop) return;
      var word = words[wi];
      if (!deleting) {
        ci++;
        el.textContent = word.slice(0, ci);
        if (ci >= word.length) {
          deleting = true;
          return schedule(HOLD);
        }
        return schedule(TYPE + seeded(ci, 20) * 40);
      } else {
        ci--;
        el.textContent = word.slice(0, Math.max(0, ci));
        if (ci <= 0) {
          deleting = false;
          wi = (wi + 1) % words.length;
          return schedule(PAUSE);
        }
        return schedule(DEL);
      }
    }
    function schedule(ms) { window._twTimer = setTimeout(step, ms); }
    schedule(HOLD); // hold "Persone" first, then begin cycling
  }
  function freezeTypewriter() {
    window._twStop = true;
    if (window._twTimer) clearTimeout(window._twTimer);
    if (window._twCaret) clearInterval(window._twCaret);
    var caret = document.querySelector(".persone__caret");
    if (caret) caret.classList.remove("is-on");
  }

  /* --------------------------------------------------------------- mobile burger */
  function initBurger() {
    var burger = document.getElementById("navBurger");
    if (!burger || !nav) return;
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Chiudi menu" : "Apri menu");
    });
  }

  /* --------------------------------------------------------------------- utils */
  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  /* ------------------------------------------------------------------- boot */
  applyScale();
  initTypewriter(true);
  initBurger();
  window.addEventListener("resize", debounce(function () {
    applyScale();
    toggleMobileTiles();
  }, 150));
})();
