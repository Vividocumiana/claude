// Rookiess — primo personaggio clay, costruito tutto in codice.
// Riferimento: busto col cappellino, palpebre calate, AirPods, t-shirt nera.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const DEG = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- palette (letta dalla reference) ----------
const C = {
  skin: 0xeea397, skinDeep: 0xd8847a, lip: 0xb8655c,
  eye: 0xf7f4ef, pupil: 0x141414,
  cap: 0xece4d2, capSeam: 0xd9cfba,
  tee: 0x1c1c1e, pod: 0xf5f5f3,
};

// ---------- materiali clay ----------
// Fisico + ambiente RoomEnvironment; sulla pelle una banda calda sul
// terminatore (finto subsurface) che dà l'effetto plastilina.
const KEY_DIR_VIEW = new THREE.Vector3(-0.55, 0.6, 0.6).normalize();

function clay(color, o = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    color, roughness: o.roughness ?? 0.62, metalness: 0,
    sheen: o.sheen ?? 0.35, sheenRoughness: 0.8,
    sheenColor: new THREE.Color(o.sheenColor ?? 0xffffff),
    clearcoat: o.clearcoat ?? 0, clearcoatRoughness: 0.35,
    side: o.side ?? THREE.FrontSide,
  });
  if (o.sss) {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uSSS = { value: new THREE.Color(o.sss) };
      sh.uniforms.uKey = { value: KEY_DIR_VIEW };
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uSSS; uniform vec3 uKey;')
        .replace('#include <opaque_fragment>', `
          float w = dot(normalize(normal), uKey);
          float band = smoothstep(-0.45, 0.05, w) * (1.0 - smoothstep(0.05, 0.6, w));
          float rim = pow(1.0 - saturate(dot(normalize(normal), normalize(vViewPosition))), 3.0);
          outgoingLight += uSSS * (band * 0.28 + rim * 0.12);
          #include <opaque_fragment>`);
    };
  }
  return m;
}

const M = {
  skin: clay(C.skin, { roughness: 0.55, sheen: 0.5, sheenColor: 0xffd6cc, sss: 0xff6a3d }),
  skinDeep: clay(C.skinDeep, { roughness: 0.6, sss: 0xff5a30 }),
  lip: clay(C.lip, { roughness: 0.5 }),
  eye: clay(C.eye, { roughness: 0.25, sheen: 0, clearcoat: 0.6 }),
  pupil: clay(C.pupil, { roughness: 0.15, sheen: 0, clearcoat: 1 }),
  cap: clay(C.cap, { roughness: 0.9, sheen: 0.8, sheenColor: 0xfffaf0 }),
  capSeam: clay(C.capSeam, { roughness: 0.9, sheen: 0.6 }),
  tee: clay(C.tee, { roughness: 0.92, sheen: 0.6, sheenColor: 0x5a5a64 }),
  pod: clay(C.pod, { roughness: 0.18, sheen: 0, clearcoat: 1 }),
};

// ---------- forme ----------
// Profilo della testa (r, y): mento in basso, guance piene, cupola nascosta dal cappello.
const HEAD_PROFILE = [
  [0.0, 0.0], [0.5, 0.04], [0.8, 0.2], [0.94, 0.5], [0.97, 0.85],
  [0.96, 1.2], [0.93, 1.55], [0.85, 1.85], [0.55, 2.1], [0.0, 2.2],
].map(([r, y]) => new THREE.Vector2(r, y));
const HEAD_DEPTH = 0.9; // schiacciata davanti-dietro
const headCurve = new THREE.SplineCurve(HEAD_PROFILE);
const headPts = headCurve.getSpacedPoints(160);

function headR(y) {
  for (let i = 1; i < headPts.length; i++) {
    const a = headPts[i - 1], b = headPts[i];
    if ((a.y - y) * (b.y - y) <= 0) return lerp(a.x, b.x, (y - a.y) / (b.y - a.y || 1));
  }
  return 0;
}
// punto sulla faccia davanti, dato x,y
function surfZ(x, y) {
  const r = headR(y);
  return HEAD_DEPTH * Math.sqrt(Math.max(r * r - x * x, 0));
}

function lathe(points, seg = 96) {
  const g = new THREE.LatheGeometry(points, seg);
  g.computeVertexNormals();
  return g;
}

function mesh(geo, mat, parent, cast = true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast; m.receiveShadow = true;
  parent.add(m);
  return m;
}

// ---------- occhio con palpebre animabili ----------
function buildEye(parent, x, y, side) {
  const R = 0.31;
  const g = new THREE.Group();
  g.position.set(x, y, surfZ(x, y) - 0.1);
  g.rotation.y = side * 0.2;
  g.scale.set(1.0, 0.82, 0.78);
  parent.add(g);

  mesh(new THREE.SphereGeometry(R, 48, 32), M.eye, g, false);

  // pupilla: appena sotto il bordo della palpebra, sguardo un po' di lato
  const pupil = mesh(new THREE.SphereGeometry(0.075, 32, 16), M.pupil, g, false);
  const setPupil = (elev, az) => {
    pupil.position.set(Math.sin(az) * Math.cos(elev), Math.sin(elev), Math.cos(az) * Math.cos(elev)).multiplyScalar(R * 0.97);
    pupil.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pupil.position.clone().normalize());
    pupil.scale.set(1, 1, 0.35);
  };

  // palpebra superiore: calotta + bordo arrotondato, ruota attorno a X
  const COVER = 95 * DEG, RL = R * 1.05;
  const upper = new THREE.Group(); g.add(upper);
  mesh(new THREE.SphereGeometry(RL, 48, 24, 0, Math.PI * 2, 0, COVER), M.skin, upper);
  const rimU = mesh(new THREE.TorusGeometry(RL * Math.sin(COVER), 0.04, 12, 64), M.skin, upper);
  rimU.rotation.x = Math.PI / 2; rimU.position.y = RL * Math.cos(COVER);

  // palpebra inferiore, fissa
  const LCOVER = 55 * DEG;
  const lower = new THREE.Group(); g.add(lower);
  mesh(new THREE.SphereGeometry(RL * 0.99, 48, 16, 0, Math.PI * 2, Math.PI - LCOVER, LCOVER), M.skin, lower);
  const rimL = mesh(new THREE.TorusGeometry(RL * 0.99 * Math.sin(LCOVER), 0.022, 12, 64), M.skin, lower);
  rimL.rotation.x = Math.PI / 2; rimL.position.y = -RL * 0.99 * Math.cos(LCOVER);
  lower.rotation.x = 8 * DEG;

  // closed: 0 = spalancato, 1 = chiuso. Bordo frontale a elev = -5° - a.
  const setLid = (closed) => { upper.rotation.x = lerp(-70, 78, closed) * DEG; };
  return { setLid, setPupil, group: g };
}

// ---------- cappellino ----------
function buildCap(parent) {
  const cap = new THREE.Group();
  cap.position.y = 1.74;
  parent.add(cap);
  const RX = 1.0, RY = 0.98, RZ = 0.97;

  const dome = mesh(new THREE.SphereGeometry(1, 96, 48, 0, Math.PI * 2, 0, Math.PI / 2), M.cap, cap);
  dome.scale.set(RX, RY, RZ);
  // bordino interno, chiude il bordo inferiore della calotta
  const band = mesh(new THREE.TorusGeometry(1, 0.035, 12, 96), M.cap, cap);
  band.rotation.x = Math.PI / 2; band.scale.set(RX, RZ, 1);

  // cuciture lungo i meridiani + bottone in cima
  for (let i = 0; i < 6; i++) {
    const az = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const pts = [];
    for (let k = 0; k <= 24; k++) {
      const el = (k / 24) * (Math.PI / 2 - 0.05);
      pts.push(new THREE.Vector3(Math.cos(el) * Math.sin(az) * RX, Math.sin(el) * RY, Math.cos(el) * Math.cos(az) * RZ).multiplyScalar(1.004));
    }
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.012, 6), M.capSeam, cap, false);
  }
  const btn = mesh(new THREE.SphereGeometry(0.085, 24, 12), M.cap, cap);
  btn.position.y = RY * 0.99; btn.scale.y = 0.55;

  // visiera: mezzaluna estrusa, poi piegata verso il basso ai lati
  const sh = new THREE.Shape();
  const OX = 1.1, OZ = 1.72, A = 74 * DEG, N = 48;
  for (let i = 0; i <= N; i++) {
    const t = lerp(-A, A, i / N);
    const p = [Math.sin(t) * OX, -Math.cos(t) * OZ];
    i ? sh.lineTo(...p) : sh.moveTo(...p);
  }
  for (let i = N; i >= 0; i--) {
    const t = lerp(-A, A, i / N);
    sh.lineTo(Math.sin(t) * RX * 0.98, -Math.cos(t) * RZ * 0.6);
  }
  const vg = new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 4, curveSegments: 48 });
  vg.rotateX(-Math.PI / 2); // shape (x, -z) -> piano orizzontale
  const p = vg.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    p.setY(i, p.getY(i) - 0.22 * (x / OX) ** 2 - 0.06 * Math.max(z - 0.8, 0));
  }
  vg.computeVertexNormals();
  const visor = mesh(vg, M.cap, cap);
  visor.position.y = 0.02;
  visor.rotation.x = -2 * DEG;
  return cap;
}

// ---------- orecchio + AirPod ----------
function buildEar(parent, side) {
  const y = 0.98, x = side * headR(y) * 0.95;
  const g = new THREE.Group();
  g.position.set(x, y, -0.05);
  g.rotation.set(0, side * 0.3, side * -0.08);
  g.scale.setScalar(1.3);
  parent.add(g);

  const outer = mesh(new THREE.SphereGeometry(1, 40, 24), M.skin, g);
  outer.scale.set(0.16, 0.34, 0.24);
  outer.position.x = side * 0.1;
  const inner = mesh(new THREE.SphereGeometry(1, 32, 16), M.skinDeep, g, false);
  inner.scale.set(0.07, 0.22, 0.14);
  inner.position.set(side * 0.2, -0.02, 0.03);

  // AirPod: gemma nel padiglione, stelo verso il basso e un po' in avanti
  const pod = new THREE.Group();
  pod.position.set(side * 0.24, -0.02, 0.08);
  g.add(pod);
  const bud = mesh(new THREE.SphereGeometry(0.095, 32, 16), M.pod, pod);
  bud.scale.set(1, 1, 1.15);
  const stem = mesh(new THREE.CapsuleGeometry(0.042, 0.3, 8, 16), M.pod, pod);
  stem.position.set(side * 0.03, -0.2, 0.05);
  stem.rotation.set(0.2, 0, side * 0.12);
}

// ---------- personaggio ----------
export function buildRookie() {
  const root = new THREE.Group();     // pivot alla base: qui si fa lo squash
  const body = new THREE.Group();
  root.add(body);
  body.position.y = 2.6;

  // busto: t-shirt, colletto, collo
  const torsoPts = [[0.5, -0.4], [0.62, -0.5], [1.05, -0.62], [1.55, -0.88], [1.78, -1.3], [1.85, -2.0], [1.82, -2.7]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const tg = lathe(new THREE.SplineCurve(torsoPts).getSpacedPoints(60), 128);
  const tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i), r = Math.hypot(x, z);
    tp.setZ(i, z * lerp(1, 0.58, THREE.MathUtils.smoothstep(r, 0.6, 1.5)));
  }
  tg.computeVertexNormals();
  mesh(tg, M.tee, body);
  const collar = mesh(new THREE.TorusGeometry(0.57, 0.1, 20, 96), M.tee, body);
  collar.rotation.x = Math.PI / 2; collar.position.y = -0.46;

  const neck = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.7, 64, 1, true), M.skin, body);
  neck.position.y = -0.13;

  // testa
  const head = new THREE.Group();
  head.position.y = -0.3;
  body.add(head);
  const hg = lathe(headPts, 128);
  hg.scale(1, 1, HEAD_DEPTH);
  hg.computeVertexNormals();
  mesh(hg, M.skin, head);

  // naso
  const nose = mesh(new THREE.SphereGeometry(0.22, 48, 32), M.skin, head);
  nose.position.set(0, 0.9, surfZ(0, 0.9) + 0.08);
  nose.scale.set(1, 0.95, 0.9);

  // bocca: linea piatta, un filo all'ingiù; più una "O" per lo spavento
  const mouthPts = [];
  for (let i = 0; i <= 20; i++) {
    const x = lerp(-0.24, 0.24, i / 20);
    const y = 0.44 - 0.035 * (x / 0.24) ** 2;
    mouthPts.push(new THREE.Vector3(x, y, surfZ(x, y) + 0.004));
  }
  const mouth = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(mouthPts), 40, 0.017, 8), M.lip, head, false);
  const mouthO = mesh(new THREE.SphereGeometry(0.11, 32, 16), M.pupil, head, false);
  mouthO.position.set(0, 0.42, surfZ(0, 0.42) - 0.04);
  mouthO.scale.set(0.9, 1.15, 0.4).multiplyScalar(0.001);

  const eyes = [buildEye(head, -0.34, 1.24, -1), buildEye(head, 0.34, 1.24, 1)];
  buildEar(head, -1); buildEar(head, 1);
  buildCap(head);

  // ---- espressioni ----
  const face = { lid: 0.3, look: 8 * DEG, scared: 0 };
  function applyFace() {
    const s = face.scared;
    eyes.forEach((e) => {
      e.setLid(lerp(face.lid, 0.02, s));
      e.setPupil(lerp(4, 0, s) * DEG, lerp(face.look, 0, s));
    });
    mouth.scale.setScalar(Math.max(1 - s * 1.2, 0.001));
    const o = Math.max(s, 0.001);
    mouthO.scale.set(0.9 * o, 1.15 * o, 0.4 * o);
  }
  applyFace();

  return { root, head, face, applyFace };
}

// ---------- scena di prova ----------
export function mount(canvas, ui) {
  THREE.ColorManagement.enabled = true;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  camera.position.set(0, 3.4, 14.5);
  camera.lookAt(0, 3.0, 0);

  // luci ferme rispetto alla camera: chiave in alto a sinistra, controluce dietro
  const rig = new THREE.Group(); scene.add(rig);
  const key = new THREE.DirectionalLight(0xfff3ea, 2.4);
  key.position.set(-5, 7, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 18; key.shadow.blurSamples = 24;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 6, bottom: -2, near: 1, far: 25 });
  key.target.position.set(0, 3, 0);
  const fill = new THREE.DirectionalLight(0xdfe6ff, 0.5);
  fill.position.set(6, 2, 5);
  const rim = new THREE.DirectionalLight(0xffffff, 1.6);
  rim.position.set(3, 6, -7);
  rig.add(key, key.target, fill, rim);

  const char = buildRookie();
  scene.add(char.root);

  // ---- interazione: trascina per ruotare (yaw + un po' di pitch), inerzia ----
  let yaw = -12 * DEG, pitch = 0, vy = 0, drag = null;
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, t: performance.now() }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y, now = performance.now();
    const k = (1.5 * Math.PI) / canvas.clientWidth;
    yaw += dx * k; pitch = THREE.MathUtils.clamp(pitch + dy * k * 0.5, -0.35, 0.35);
    vy = (dx * k) / Math.max(now - drag.t, 1);
    drag = { x: e.clientX, y: e.clientY, t: now };
  });
  const up = () => { if (drag && performance.now() - drag.t > 90) vy = 0; drag = null; };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  // ---- colpo: squash dal basso + faccia spaventata, poi torna ----
  let hitT = -1;
  const hit = () => { hitT = 0; };
  ui.hit?.addEventListener('click', hit);
  canvas.addEventListener('dblclick', hit);
  ui.bg?.forEach((b) => b.addEventListener('click', () => { document.body.dataset.bg = b.dataset.bg; }));

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let nextBlink = 1500, blinkT = -1, last = performance.now(), clock = 0;

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  function frame(now) {
    const dt = Math.min(now - last, 50); last = now; clock += dt;

    if (!drag && vy) { yaw += vy * dt; vy *= Math.exp(-dt / 320); if (Math.abs(vy) < 1e-5) vy = 0; }
    const idle = reduce ? 0 : Math.sin(clock / 1400) * 0.03;
    char.root.rotation.set(pitch, yaw + idle, 0);

    // blink
    if (!reduce && blinkT < 0 && clock > nextBlink) blinkT = 0;
    let blink = 0;
    if (blinkT >= 0) {
      blinkT += dt;
      blink = Math.sin(Math.min(blinkT / 160, 1) * Math.PI);
      if (blinkT > 160) { blinkT = -1; nextBlink = clock + 2200 + Math.random() * 3000; }
    }

    // colpo: squash con molla smorzata
    let sq = 0, scared = 0;
    if (hitT >= 0) {
      hitT += dt;
      const t = hitT / 1000;
      sq = Math.exp(-t * 6) * Math.cos(t * 22);
      scared = t < 0.9 ? 1 : Math.max(1 - (t - 0.9) / 0.3, 0);
      if (t > 1.6) hitT = -1;
    }
    char.root.scale.set(1 + sq * 0.18, 1 - sq * 0.28, 1 + sq * 0.18);
    char.face.scared = scared;
    const baseLid = char.face.lid;
    char.face.lid = lerp(baseLid, 1, blink * (1 - scared));
    char.applyFace();
    char.face.lid = baseLid;

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { renderer, scene, camera, char, hit };
}
