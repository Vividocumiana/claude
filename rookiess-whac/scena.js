// Scena di prova: tavolo della hero ricostruito con la camera ricavata da Figma,
// 10 personaggi nei buchi, vista "Studio" ravvicinata con le viste di debug.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { HERO } from './hero-camera.js';
import { buildKit, buildCharacter, M, DEBUG, KEY_VIEW } from './personaggio.js';

const DEG = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const S = 0.225;          // scala personaggio: testa larga ~ quanto il buco
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

  // luce chiave nello spazio del personaggio (inclinato, rivolto alla camera)
  const leanQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(LEAN, 0, 0));
  const Lchar = keyDir.clone().applyQuaternion(leanQ.clone().invert());
  const kits = { rookie: buildKit('rookie', Lchar, ui.quality ?? 1), guru: buildKit('guru', Lchar, ui.quality ?? 1) };
  ui.onStats?.(Object.fromEntries(Object.entries(kits).map(([k, v]) => [k, v.stats])));

  // ---- tavolo: occlusore invisibile con i buchi, anelli, pozzi scuri ----
  const holes = [];
  for (const row of HERO.rows) for (const x of row.xs) holes.push(new THREE.Vector3(x, 0, row.z * HERO.rowDepth));

  const floorShape = new THREE.Shape().absarc(0, 0, 20, 0, Math.PI * 2);
  for (const h of holes) floorShape.holes.push(new THREE.Path().absarc(h.x, -h.z, RING.inner, 0, Math.PI * 2, true));
  const floor = new THREE.Mesh(new THREE.ShapeGeometry(floorShape, 48), new THREE.MeshBasicMaterial({ colorWrite: false }));
  floor.rotation.x = -Math.PI / 2;
  floor.renderOrder = -1;
  scene.add(floor);

  const ringGeo = (() => {
    const { inner: a, outer: b, h } = RING, r = 0.008;
    const g = new THREE.LatheGeometry([
      new THREE.Vector2(a, -0.002), new THREE.Vector2(a, h - r), new THREE.Vector2(a + r, h),
      new THREE.Vector2(b - r, h), new THREE.Vector2(b, h - r), new THREE.Vector2(b, -0.002),
    ], 96);
    // colori presi dal design: piano come il fondo, fianco scuro, interno come il buco
    const top = new THREE.Color('#2135e7'), side = new THREE.Color('#0f1a6e'), inner = new THREE.Color('#0b1680');
    const col = [], p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const rr = Math.hypot(p.getX(i), p.getZ(i)), y = p.getY(i);
      const c = y > RING.h - 0.004 && rr > a + 0.002 && rr < b - 0.002 ? top : rr < (a + b) / 2 ? inner : side;
      col.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  })();
  const ringMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });

  const pitGeo = (() => {
    const g = new THREE.CylinderGeometry(RING.inner, RING.inner * 0.9, 0.9, 64, 8, false);
    g.translate(0, -0.45, 0);
    const p = g.attributes.position, col = [];
    const top = new THREE.Color('#0e1b8c'), deep = new THREE.Color('#050b4a');
    for (let i = 0; i < p.count; i++) {
      const c = top.clone().lerp(deep, Math.min(-p.getY(i) / 0.5, 1));
      col.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  })();
  const pitMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, toneMapped: false });

  // ---- personaggi ----
  // ---- personaggi: uno per buco, nascosti sotto il tavolo finché non salgono ----
  const DOWN = -(2.7 + PIVOT) * S - 0.04; // cima del beanie sotto il piano
  const chars = holes.map((h, i) => {
    const ring = new THREE.Mesh(ringGeo, ringMat); ring.position.copy(h); scene.add(ring);
    const pit = new THREE.Mesh(pitGeo, pitMat); pit.position.copy(h); scene.add(pit);

    const root = new THREE.Group(); root.position.copy(h); scene.add(root);
    const pop = new THREE.Group(); root.add(pop);
    const orient = new THREE.Group(); pop.add(orient);
    orient.rotation.order = 'YXZ';
    orient.rotation.set(LEAN, Math.atan2(camera.position.x - h.x, camera.position.z - h.z), 0);
    const squash = new THREE.Group(); orient.add(squash);
    // in ogni buco ci sono entrambi; a ogni uscita se ne mostra uno
    const actors = {};
    for (const type of ['rookie', 'guru']) {
      const a = buildCharacter(kits[type]);
      a.char.scale.setScalar(S);
      a.char.position.y = PIVOT * S;
      a.char.visible = false;
      a.char.traverse((o) => { if (o.isMesh) o.userData.slot = i; });
      squash.add(a.char);
      actors[type] = a;
    }
    pop.position.y = DOWN;
    root.visible = false;
    const c = { i, h, root, pop, squash, actors, rk: actors.rookie, phase: 'down', t: 0, stay: 0, peak: 1, from: DOWN, cool: 0,
      blinkT: -1, nextBlink: 800 + Math.random() * 4000 };
    return c;
  });

  // ---- vista: hero (camera Figma, con spostamento ottico) o studio (ravvicinata) ----
  let mode = 'hero';
  function setActor(c, type) {
    for (const [k, a] of Object.entries(c.actors)) a.char.visible = k === type;
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
      // confronto: rookie e guru fuori dai due buchi centrali della fila di mezzo, stessa angolazione della hero
      for (const c of chars) { c.phase = 'down'; c.pop.position.y = DOWN; c.root.visible = false; }
      [[4, 'rookie'], [5, 'guru']].forEach(([i, type]) => { setActor(chars[i], type); Object.assign(chars[i], { phase: 'up', t: 0, stay: 1e12, peak: 1 }); chars[i].pop.position.y = 0; chars[i].root.visible = true; });
      scene.updateMatrixWorld(true);
      const head = new THREE.Vector3(0, 1.2, 0).applyMatrix4(chars[4].rk.char.matrixWorld)
        .add(new THREE.Vector3(0, 1.2, 0).applyMatrix4(chars[5].rk.char.matrixWorld)).multiplyScalar(0.5);
      const mid = holes[4].clone().add(holes[5]).multiplyScalar(0.5);
      const dir = heroCam.pos.clone().sub(mid).normalize();
      camera.position.copy(head).addScaledVector(dir, 3.2);
      camera.lookAt(head);
      camera.fov = 26;
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
    const type = Math.random() < GURU_SHARE ? 'guru' : 'rookie';
    setActor(c, type);
    const peek = Math.random() < 0.2;
    // il guru esce e rientra più in fretta; il rookie si trattiene (ed è la tentazione)
    const base = type === 'guru' ? 600 + Math.random() * 450 : 900 + Math.random() * 700;
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
    const pts = POINTS[c.rk.type];
    score += pts;
    ui.onScore?.(score, pts);
    popLabel(c, pts > 0 ? `+${pts}` : `−${-pts}`, pts < 0);
  });

  ui.mode?.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  ui.debug?.forEach((b) => b.addEventListener('click', () => {
    const d = b.dataset.debug;
    DEBUG.value = { final: 0, bake: 1, normals: 2, parts: 3, wire: 3 }[d] ?? 0;
    for (const m of Object.values(M)) m.wireframe = d === 'wire';
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
    c.squash.scale.set(1 + sq * 0.2, 1 - sq * 0.32, 1 + sq * 0.2);

    if (!reduce && c.blinkT < 0 && clock > c.nextBlink) c.blinkT = 0;
    let blink = 0;
    if (c.blinkT >= 0) {
      c.blinkT += dt;
      blink = Math.sin(Math.min(c.blinkT / 160, 1) * Math.PI);
      if (c.blinkT > 160) { c.blinkT = -1; c.nextBlink = clock + 2200 + Math.random() * 3500; }
    }
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
