// Scena di prova: tavolo della hero ricostruito con la camera ricavata da Figma,
// 10 personaggi nei buchi, vista "Studio" ravvicinata con le viste di debug.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { HERO } from './hero-camera.js';
import { buildKit, buildRookie, M, DEBUG, KEY_VIEW } from './personaggio.js';

const DEG = Math.PI / 180;
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
  const kit = buildKit(Lchar, ui.quality ?? 1);
  ui.onStats?.(kit.stats);

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
  const chars = holes.map((h, i) => {
    const ring = new THREE.Mesh(ringGeo, ringMat); ring.position.copy(h); scene.add(ring);
    const pit = new THREE.Mesh(pitGeo, pitMat); pit.position.copy(h); scene.add(pit);

    const root = new THREE.Group(); root.position.copy(h); scene.add(root);
    const pop = new THREE.Group(); root.add(pop);
    const orient = new THREE.Group(); pop.add(orient);
    orient.rotation.order = 'YXZ';
    orient.rotation.set(LEAN, Math.atan2(camera.position.x - h.x, camera.position.z - h.z), 0);
    const squash = new THREE.Group(); orient.add(squash);
    const rk = buildRookie(kit);
    rk.char.scale.setScalar(S);
    rk.char.position.y = PIVOT * S;
    squash.add(rk.char);
    rk.char.traverse((o) => { if (o.isMesh) o.userData.slot = i; });
    return { h, root, pop, squash, rk, up: 1, hitT: -1, blinkT: -1, nextBlink: 800 + Math.random() * 4000 };
  });

  // ---- vista: hero (camera Figma, con spostamento ottico) o studio (ravvicinata) ----
  let mode = 'hero';
  function setMode(m) {
    mode = m;
    if (m === 'hero') {
      camera.position.copy(heroCam.pos); camera.quaternion.copy(heroCam.quat);
      camera.fov = HERO.fovYDeg;
    } else {
      // stessa direzione della hero, vicino al personaggio centrale della fila davanti
      const c = chars[8].rk.char;
      const head = new THREE.Vector3(0, 1.2, 0).applyMatrix4(c.matrixWorld);
      const dir = heroCam.pos.clone().sub(holes[8]).normalize();
      camera.position.copy(head).addScaledVector(dir, 2.2);
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

  // ---- colpo: clic su un personaggio ----
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  canvas.addEventListener('pointerdown', (ev) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(chars.map((c) => c.rk.char), true)[0];
    if (hit) chars[hit.object.userData.slot].hitT = 0;
  });

  ui.mode?.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  ui.debug?.forEach((b) => b.addEventListener('click', () => {
    const d = b.dataset.debug;
    const wire = d === 'wire';
    DEBUG.value = { final: 0, bake: 1, normals: 2, parts: 3, wire: 3 }[d] ?? 0;
    for (const m of Object.values(M)) m.wireframe = wire;
  }));

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let last = performance.now(), clock = 0;
  function frame(now) {
    const dt = Math.min(now - last, 50); last = now; clock += dt;
    for (const c of chars) {
      if (!reduce && c.blinkT < 0 && clock > c.nextBlink) c.blinkT = 0;
      let blink = 0;
      if (c.blinkT >= 0) {
        c.blinkT += dt;
        blink = Math.sin(Math.min(c.blinkT / 160, 1) * Math.PI);
        if (c.blinkT > 160) { c.blinkT = -1; c.nextBlink = clock + 2200 + Math.random() * 3500; }
      }
      let sq = 0, scared = 0;
      if (c.hitT >= 0) {
        c.hitT += dt;
        const t = c.hitT / 1000;
        sq = Math.exp(-t * 6) * Math.cos(t * 22);
        scared = t < 0.9 ? 1 : Math.max(1 - (t - 0.9) / 0.3, 0);
        if (t > 1.6) c.hitT = -1;
      }
      c.squash.scale.set(1 + sq * 0.18, 1 - sq * 0.28, 1 + sq * 0.18);
      c.rk.face.scared = scared;
      c.rk.face.blink = blink;
      c.rk.applyFace();
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  setMode(ui.startMode || 'hero');
  requestAnimationFrame(frame);
  return { renderer, scene, camera, chars, kit, setMode, DEBUG, hit: (i) => (chars[i].hitT = 0) };
}
