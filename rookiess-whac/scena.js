// Scena di prova: tavolo della hero ricostruito con la camera ricavata da Figma,
// 10 personaggi nei buchi, vista "Studio" ravvicinata con le viste di debug.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { HERO } from './hero-camera.js';
import { loadKits, buildCharacter, setWireframe, DEBUG, KEY_VIEW, FX } from './personaggio.js';
import { GROUPS } from './shapes.js';

const DEG = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const S = 0.195;          // scala personaggio: testa con le orecchie larga quanto il buco
const LEAN = -25 * DEG;   // inclinato all'indietro, verso la camera
const PIVOT = 0.6;        // punto del personaggio (sotto il mento) che sta al livello del tavolo
const RING = { inner: HERO.holeInnerR, outer: 0.343, h: 0.05 };

export function mount(canvas, ui) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  // ---- camera della hero ----
  const camera = new THREE.PerspectiveCamera(HERO.fovYDeg, HERO.frame.w / HERO.frame.h, 0.1, 100);
  const T = new THREE.Vector3(...HERO.target);
  const e = HERO.elevationDeg * DEG;
  camera.position.copy(T).add(new THREE.Vector3(0, Math.sin(e), Math.cos(e)).multiplyScalar(HERO.distance));
  camera.lookAt(T);
  camera.updateMatrixWorld();
  const heroCam = { pos: camera.position.clone(), quat: camera.quaternion.clone() };

  // ---- luci ferme rispetto alla camera ----
  const keyDir = KEY_VIEW.clone().applyQuaternion(camera.quaternion);
  const key = new THREE.DirectionalLight(0xfff3ea, 2.4);
  key.position.copy(keyDir).multiplyScalar(10);
  const rim = new THREE.DirectionalLight(0xffffff, 1.4);
  rim.position.copy(new THREE.Vector3(0.4, 0.7, -0.6).applyQuaternion(camera.quaternion)).multiplyScalar(10);
  scene.add(key, rim);
  // luce riflessa dal tavolo blu: le parti basse dei personaggi prendono un po' di blu
  const bounce = new THREE.HemisphereLight(0xffffff, 0x2a40ff, 0.5);
  scene.add(bounce);
  const fxObjects = [bounce];

  // luce chiave nello spazio del personaggio (inclinato, rivolto alla camera)
  const leanQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(LEAN, 0, 0));
  const Lchar = keyDir.clone().applyQuaternion(leanQ.clone().invert());
  const kits = {}; // si riempie man mano che i worker consegnano i personaggi

  // ---- tavolo: occlusore invisibile con i buchi, anelli, pozzi scuri ----
  const holes = [];
  for (const row of HERO.rows) for (const x of row.xs) holes.push(new THREE.Vector3(x, 0, row.z * HERO.rowDepth));

  const floorShape = new THREE.Shape().absarc(0, 0, 20, 0, Math.PI * 2);
  for (const h of holes) floorShape.holes.push(new THREE.Path().absarc(h.x, -h.z, RING.inner, 0, Math.PI * 2, true));
  const floor = new THREE.Mesh(new THREE.ShapeGeometry(floorShape, 48), new THREE.MeshBasicMaterial({ colorWrite: false }));
  floor.rotation.x = -Math.PI / 2;
  floor.renderOrder = -1;
  scene.add(floor);

  // interno del buco illuminato dalla luce chiave: il bordo fa ombra sulla parete dalla parte della luce,
  // la parete opposta resta in luce, più giù è più buio. P e N nello spazio del buco (centro in 0).
  const LIT = new THREE.Color('#1729b4'), SHADE = new THREE.Color('#070f5e');
  const jitter = [[0, 0], [0.07, 0], [-0.07, 0], [0, 0.07], [0, -0.07], [0.05, 0.05], [-0.05, -0.05]];
  function holeShade(P, N) {
    let lit = 0;
    for (const [jx, jz] of jitter) {
      const L = new THREE.Vector3(keyDir.x + jx, keyDir.y, keyDir.z + jz).normalize();
      const t = (RING.h - P.y) / L.y;
      lit += Math.hypot(P.x + L.x * t, P.z + L.z * t) < RING.inner * 0.985 ? 1 : 0;
    }
    lit /= jitter.length;
    const lambert = 0.5 + 0.5 * Math.max(N.dot(keyDir), 0);
    const depth = 1 - 0.6 * THREE.MathUtils.smoothstep(-P.y, 0, 0.45);
    return SHADE.clone().lerp(LIT, lit * lambert).multiplyScalar(depth);
  }

  const makeRing = (shine) => {
    const { inner: a, outer: b, h } = RING, r = 0.012;
    const prof = [new THREE.Vector2(a, -0.002)];
    for (let k = 0; k <= 5; k++) { const t = (k / 5) * Math.PI / 2; prof.push(new THREE.Vector2(a + r - r * Math.cos(t), h - r + r * Math.sin(t))); }
    for (let k = 0; k <= 5; k++) { const t = (k / 5) * Math.PI / 2; prof.push(new THREE.Vector2(b - r + r * Math.sin(t), h - r + r * Math.cos(t))); }
    prof.push(new THREE.Vector2(b, -0.002));
    const g = new THREE.LatheGeometry(prof, 96);
    // colori presi dal design: piano come il fondo, fianco scuro, interno come il buco;
    // con gli effetti, i bordi arrotondati prendono un riflesso dalla luce chiave
    const top = new THREE.Color('#2135e7'), side = new THREE.Color('#0f1a6e'), inner = new THREE.Color('#0b1680'), hi = new THREE.Color('#7f8fff');
    const col = [], p = g.attributes.position, n = g.attributes.normal, N = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      const rr = Math.hypot(p.getX(i), p.getZ(i)), y = p.getY(i);
      const isTop = y > h - 0.0005 && rr > a + r - 0.001 && rr < b - r + 0.001;
      let c = (isTop ? top : y > h - r ? top.clone().lerp(rr < (a + b) / 2 ? inner : side, (h - y) / r) : rr < (a + b) / 2 ? inner : side).clone();
      if (shine && rr < a + 0.002 && y < h - r) { // parete interna: stessa luce dell'interno del buco
        N.fromBufferAttribute(n, i);
        if (N.x * p.getX(i) + N.z * p.getZ(i) > 0) N.negate();
        c = holeShade(new THREE.Vector3(p.getX(i), y, p.getZ(i)), N);
      }
      if (shine && !isTop && y > h - r - 0.001) c.lerp(hi, Math.pow(Math.max(N.fromBufferAttribute(n, i).dot(keyDir), 0), 3) * 0.75);
      col.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  };
  const ringGeo = makeRing(true), ringGeoPlain = makeRing(false);
  const rings = [];

  // ombre: alone di contatto attorno a ogni buco + ombra del personaggio sul tavolo
  // alphaMap legge la luminosità: bianco = ombra piena, nero = niente. Dentro "inner" resta vuoto (il buco).
  const softTex = (inner, outer) => {
    const cv = Object.assign(document.createElement('canvas'), { width: 256, height: 256 });
    const x = cv.getContext('2d'), gr = x.createRadialGradient(128, 128, 0, 128, 128, outer * 128);
    if (inner > 0) { gr.addColorStop(0, '#000'); gr.addColorStop(inner / outer - 0.01, '#000'); gr.addColorStop(inner / outer, '#fff'); }
    else gr.addColorStop(0, '#fff');
    gr.addColorStop(1, '#000');
    x.fillStyle = '#000'; x.fillRect(0, 0, 256, 256);
    x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(cv);
  };
  const flat = (tex, size, opacity) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({
      color: 0x040a40, alphaMap: tex, transparent: true, opacity, depthWrite: false, toneMapped: false }));
    m.rotation.x = -Math.PI / 2;
    return m;
  };
  const aoTex = softTex(RING.outer / (RING.outer + 0.07), 1), blobTex = softTex(0, 1);
  const ringMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });

  const makePit = (lit) => {
    const g = new THREE.CylinderGeometry(RING.inner, RING.inner * 0.9, 0.9, 72, 18, false);
    g.translate(0, -0.45, 0);
    const p = g.attributes.position, n = g.attributes.normal, col = [];
    const top = new THREE.Color('#0e1b8c'), deep = new THREE.Color('#050b4a');
    const P = new THREE.Vector3(), N = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      P.fromBufferAttribute(p, i); N.fromBufferAttribute(n, i).negate(); // si vede da dentro
      const c = lit ? holeShade(P, N) : top.clone().lerp(deep, Math.min(-P.y / 0.5, 1));
      col.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  };
  const pitGeo = makePit(true), pitGeoPlain = makePit(false);
  const pits = [];
  const pitMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, toneMapped: false });

  // ---- personaggi ----
  // ---- personaggi: uno per buco, nascosti sotto il tavolo finché non salgono ----
  const DOWN = -(2.75 + PIVOT) * S - 0.05; // lungo l'asse: cima del beanie sotto il piano
  const chars = holes.map((h, i) => {
    const ring = new THREE.Mesh(ringGeo, ringMat); ring.position.copy(h); scene.add(ring); rings.push(ring);
    // ombra dell'anello: spostata dalla parte opposta alla luce (mezzaluna), non un alone uguale tutto intorno
    const ao = flat(aoTex, (RING.outer + 0.07) * 2, 0.3);
    ao.position.copy(h).add(new THREE.Vector3(-keyDir.x / keyDir.y, 0, -keyDir.z / keyDir.y).multiplyScalar(RING.h * 1.6)).setY(0.001);
    scene.add(ao); fxObjects.push(ao);
    // ombra del personaggio: cade a destra e verso il fondo, lontano dalla luce
    const blob = flat(blobTex, 0.5, 0); blob.position.copy(h).add(new THREE.Vector3(0.16, RING.h + 0.002, -0.1)); blob.scale.set(1, 0.7, 1);
    blob.renderOrder = 1; scene.add(blob); fxObjects.push(blob);
    const pit = new THREE.Mesh(pitGeo, pitMat); pit.position.copy(h); scene.add(pit); pits.push(pit);

    const root = new THREE.Group(); root.position.copy(h); scene.add(root);
    // sale lungo il proprio asse inclinato: l'asse passa sempre per il centro del buco
    const orient = new THREE.Group(); root.add(orient);
    orient.rotation.order = 'YXZ';
    orient.rotation.set(LEAN, Math.atan2(camera.position.x - h.x, camera.position.z - h.z), 0);
    const pop = new THREE.Group(); orient.add(pop);
    const squash = new THREE.Group(); pop.add(squash);
    // in ogni buco c'è un'istanza di ogni personaggio (geometrie condivise); a ogni uscita se ne mostra uno
    pop.position.y = DOWN;
    root.visible = false;
    return { i, h, root, pop, squash, blob, prevY: DOWN, actors: {}, rk: null, phase: 'down', t: 0, stay: 0, peak: 1, from: DOWN, cool: 0,
      blinkT: -1, nextBlink: 800 + Math.random() * 4000 };
  });

  const ready = { rookie: [], guru: [] };
  const allStats = {};
  loadKits([...GROUPS.rookie, ...GROUPS.guru].sort((a, b) => (a === 'leo' || a === 'crypto' ? -1 : 0) - (b === 'leo' || b === 'crypto' ? -1 : 0)), Lchar, (kit) => {
    kits[kit.type] = kit;
    buildCharacter(kit); // la prima istanza cuoce la luce delle parti rigide; le altre si creano quando servono
    ready[kit.A.group].push(kit.type);
    allStats[kit.type] = kit.stats;
    ui.onStats?.(allStats, Object.keys(kits).length, GROUPS.rookie.length + GROUPS.guru.length);
    if (mode === 'studio') setMode('studio');
  }, { quality: ui.quality ?? 1, workerSrc: ui.workerSrc });

  // ---- vista: hero (camera Figma, con spostamento ottico) o studio (ravvicinata) ----
  let mode = 'hero';
  function setActor(c, type) {
    if (!c.actors[type] && kits[type]) { // istanza creata al primo uso in questo buco
      const a = buildCharacter(kits[type]);
      a.char.scale.setScalar(S);
      a.char.position.y = PIVOT * S;
      a.char.traverse((o) => { if (o.isMesh) o.userData.slot = c.i; });
      c.squash.add(a.char);
      c.actors[type] = a;
    }
    for (const [k, a] of Object.entries(c.actors)) a.char.visible = k === type;
    if (!c.actors[type]) return;
    c.rk = c.actors[type];
    c.rk.face.fly = 0; c.rk.face.scared = 0;
  }
  function setMode(m) {
    if (mode === 'studio' && m === 'hero') for (const c of chars) Object.assign(c, { phase: 'fall', t: 0, from: c.pop.position.y });
    mode = m;
    if (m === 'hero') {
      camera.position.copy(heroCam.pos); camera.quaternion.copy(heroCam.quat);
      camera.fov = HERO.fovYDeg;
    } else {
      // confronto: i 3 rookie nella fila dietro, i 3 guru in quella davanti, stessa angolazione della hero
      for (const c of chars) { c.phase = 'down'; c.pop.position.y = DOWN; c.root.visible = false; }
      const cast = [[0, 'leo'], [1, 'amara'], [2, 'mei'], [7, 'crypto'], [8, 'thought'], [9, 'coach']];
      for (const [i, type] of cast) {
        if (!kits[type]) continue;
        setActor(chars[i], type);
        Object.assign(chars[i], { phase: 'up', t: 0, stay: 1e12, peak: 1 });
        chars[i].pop.position.y = 0; chars[i].root.visible = true;
      }
      const center = new THREE.Vector3(0, 0.25, 0);
      const dir = heroCam.pos.clone().sub(center).normalize();
      camera.position.copy(center).addScaledVector(dir, 4.6);
      camera.lookAt(center);
      camera.fov = 30;
    }
    resize();
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (mode === 'hero') {
      // il centro ottico sta HERO.viewShiftPx sotto il centro del frame
      const fh = HERO.frame.h, shift = HERO.viewShiftPx;
      const full = fh + 2 * shift;
      camera.fov = 2 * Math.atan((full / fh) * Math.tan((HERO.fovYDeg * DEG) / 2)) / DEG;
      camera.setViewOffset(HERO.frame.w, full, 0, 0, HERO.frame.w, fh);
    } else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);

  // ---- gioco ----
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TIME = { rise: reduce ? 1 : 240, fall: reduce ? 1 : 200, sink: reduce ? 1 : 240, hold: 380, cool: 450 };
  const POINTS = { guru: 10, rookie: -20 };
  const GURU_SHARE = 0.62;
  let score = 0, elapsed = 0, nextSpawn = 700;
  const easeOutBack = (t) => { const c = 1.6; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
  const easeIn = (t) => t * t * t;

  function spawn() {
    if (mode !== 'hero') return;
    const free = chars.filter((c) => c.phase === 'down' && c.cool <= 0);
    const busy = chars.length - free.length;
    if (!free.length || busy >= 3) return;
    const c = free[Math.floor(Math.random() * free.length)];
    let group = Math.random() < GURU_SHARE ? 'guru' : 'rookie';
    if (!ready[group].length) group = group === 'guru' ? 'rookie' : 'guru';
    if (!ready[group].length) return;
    const pool = ready[group], type = pool[Math.floor(Math.random() * pool.length)];
    setActor(c, type);
    const peek = Math.random() < 0.2;
    // il guru esce e rientra più in fretta; il rookie si trattiene (ed è la tentazione)
    const base = group === 'guru' ? 600 + Math.random() * 450 : 900 + Math.random() * 700;
    Object.assign(c, { phase: 'rise', t: 0, from: DOWN, peak: peek ? 0.6 : 1,
      stay: (peek ? 450 : base) * Math.max(0.6, 1 - elapsed / 120000) });
    c.root.visible = true;
  }

  function popLabel(c, text, bad) {
    if (!ui.labels) return;
    const p = new THREE.Vector3(0, 2.2, 0).applyMatrix4(c.rk.char.matrixWorld).project(camera);
    const el = document.createElement('span');
    el.className = 'pop-label' + (bad ? ' bad' : '');
    el.textContent = text;
    el.style.left = ((p.x + 1) / 2) * 100 + '%';
    el.style.top = ((1 - p.y) / 2) * 100 + '%';
    ui.labels.appendChild(el);
    setTimeout(() => el.remove(), 900);
    if (!fxOn || reduce) return;
    const burst = document.createElement('span');
    burst.className = 'burst' + (bad ? ' bad' : '');
    burst.style.left = el.style.left;
    burst.style.top = ((1 - p.y) / 2) * 100 + 6 + '%';
    for (let k = 0; k < 7; k++) {
      const s = document.createElement('i');
      s.style.setProperty('--a', (k / 7) * 360 + Math.random() * 20 + 'deg');
      s.style.setProperty('--d', 26 + Math.random() * 22 + 'px');
      burst.appendChild(s);
    }
    ui.labels.appendChild(burst);
    setTimeout(() => burst.remove(), 650);
  }

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  canvas.addEventListener('pointerdown', (ev) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const live = chars.filter((c) => c.phase === 'rise' || c.phase === 'up');
    const hit = ray.intersectObjects(live.map((c) => c.rk.char), true)[0];
    if (!hit) return;
    const c = chars[hit.object.userData.slot];
    Object.assign(c, { phase: 'hit', t: 0, from: c.pop.position.y });
    const pts = POINTS[c.rk.group];
    score += pts;
    ui.onScore?.(score, pts);
    popLabel(c, pts > 0 ? `+${pts}` : `−${-pts}`, pts < 0);
  });

  ui.mode?.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  ui.debug?.forEach((b) => b.addEventListener('click', () => {
    const d = b.dataset.debug;
    DEBUG.value = { final: 0, bake: 1, normals: 2, parts: 3, wire: 3 }[d] ?? 0;
    setWireframe(d === 'wire');
  }));

  let last = performance.now(), clock = 0, paused = false;
  function step(c, dt) {
    c.t += dt;
    let y = c.pop.position.y, sq = 0, scared = 0;
    const top = lerp(DOWN, 0, c.peak);
    if (c.phase === 'down') { c.cool -= dt; y = DOWN; }
    else if (c.phase === 'rise') {
      const k = Math.min(c.t / TIME.rise, 1);
      y = lerp(c.from, top, easeOutBack(k));
      if (k >= 1) Object.assign(c, { phase: 'up', t: 0 });
    } else if (c.phase === 'up') {
      y = top;
      if (c.t > c.stay) Object.assign(c, { phase: 'fall', t: 0, from: y });
    } else if (c.phase === 'fall') {
      const k = Math.min(c.t / TIME.fall, 1);
      y = lerp(c.from, DOWN, easeIn(k));
      if (k >= 1) Object.assign(c, { phase: 'down', t: 0, cool: TIME.cool });
    } else if (c.phase === 'hit') {
      // schiacciato sul posto, faccia spaventata, poi giù di corsa
      const t = c.t / 1000;
      sq = reduce ? 0.6 * Math.max(1 - t * 3, 0) : Math.exp(-t * 7) * Math.cos(t * 24) * (t < 0.04 ? t / 0.04 : 1);
      scared = 1;
      c.rk.face.fly = reduce ? 1 : Math.min(c.t / 520, 1);
      const k = Math.min(Math.max(c.t - TIME.hold, 0) / TIME.sink, 1);
      y = lerp(c.from, DOWN, easeIn(k));
      if (k >= 1) { Object.assign(c, { phase: 'down', t: 0, cool: TIME.cool }); c.rk.face.fly = 0; }
    }
    c.pop.position.y = y;
    c.root.visible = c.phase !== 'down';
    const out = Math.min(Math.max((y - DOWN) / -DOWN, 0), 1);
    let st = 0, land = 0, sway = 0;
    if (fxOn && !reduce) {
      st = THREE.MathUtils.clamp(((y - c.prevY) / Math.max(dt, 1)) * 60, -0.12, 0.18); // velocità → allungamento
      if (c.phase === 'up' && c.t < 180) land = Math.sin((c.t / 180) * Math.PI) * 0.08;  // atterraggio
      if (c.phase === 'up') sway = Math.sin(clock / 650 + c.i * 1.7) * 0.035;
    }
    c.prevY = y;
    const sy = 1 - sq * 0.32 + st - land, sxz = 1 + sq * 0.2 - st * 0.45 + land * 0.6;
    c.squash.scale.set(sxz, sy, sxz);
    c.squash.rotation.z = sway;
    c.blob.material.opacity = fxOn && c.rk ? 0.32 * out : 0;
    c.blob.scale.set(0.7 + 0.3 * out, 0.5 + 0.2 * out, 1);

    if (!reduce && c.blinkT < 0 && clock > c.nextBlink) c.blinkT = 0;
    let blink = 0;
    if (c.blinkT >= 0) {
      c.blinkT += dt;
      blink = Math.sin(Math.min(c.blinkT / 160, 1) * Math.PI);
      if (c.blinkT > 160) { c.blinkT = -1; c.nextBlink = clock + 2200 + Math.random() * 3500; }
    }
    if (!c.rk) return;
    c.rk.face.scared = scared;
    c.rk.face.blink = blink;
    c.rk.applyFace();
  }

  function frame(now) {
    const dt = Math.min(now - last, 50); last = now;
    if (!paused) {
      clock += dt; elapsed += dt;
      nextSpawn -= dt;
      if (nextSpawn <= 0) { spawn(); nextSpawn = Math.max(380, 850 - elapsed / 150) * (reduce ? 2 : 1) * (0.7 + Math.random() * 0.6); }
      for (const c of chars) step(c, dt);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => { last = performance.now(); });
  setMode(ui.startMode || 'hero');
  requestAnimationFrame(frame);
  let fxOn = true;
  function setFx(on) {
    fxOn = on;
    FX.grain.value = on ? 1 : 0;
    for (const o of fxObjects) o.visible = on;
    for (const r of rings) r.geometry = on ? ringGeo : ringGeoPlain;
    for (const q of pits) q.geometry = on ? pitGeo : pitGeoPlain;
    ui.fx?.setAttribute('aria-pressed', String(on));
  }
  ui.fx?.addEventListener('click', () => setFx(!fxOn));
  setFx(true);
  ui.blur?.addEventListener('click', () => {
    const on = canvas.classList.toggle('squint');
    ui.blur.setAttribute('aria-pressed', String(on));
  });
  return {
    renderer, scene, camera, chars, kits, setMode, setActor, DEBUG,
    pause: (v) => { paused = v; },
    // per i test: fa salire subito un personaggio
    show: (i, peak = 1) => Object.assign(chars[i], { phase: 'up', t: -1e9, peak, stay: 1e9 }),
  };
}
