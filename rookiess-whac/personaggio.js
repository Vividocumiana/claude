// Rookiess — personaggio clay costruito in SDF.
// Pelle, beanie e maglia sono superfici uniche (unione morbida) messe in mesh al caricamento;
// occhi, palpebre e bocca sono pezzi rigidi perché si animano.
// Luce precalcolata per vertice: la vista della hero è fissa.
import * as THREE from 'three';
import { smin, smax, ellipsoid, capsule, roundRect2, meshSDF, bake, openEdges } from './sdf.js';

const DEG = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };

// ---------- palette ----------
export const C = {
  skin: 0xeea397, lip: 0xb8655c,
  pupil: 0x141414, beanie: 0xece4d2, tee: 0x26262a,
  pit: 0x07116c,
};

// ---------- materiale clay con luce precalcolata ----------
// bake.x = AO (moltiplica la luce ambiente), bake.y = ombra (moltiplica la luce chiave).
// Sotto il livello del tavolo il personaggio sfuma nel colore del buco.
export const DEBUG = { value: 0 }; // 0 finale · 1 luce precalcolata · 2 normali · 3 parti
export const KEY_VIEW = new THREE.Vector3(-0.42, 0.42, 0.8).normalize(); // luce chiave, spazio camera

function clay(color, o = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    color, roughness: o.roughness ?? 0.62, metalness: 0,
    sheen: o.sheen ?? 0.35, sheenRoughness: 0.8,
    sheenColor: new THREE.Color(o.sheenColor ?? 0xffffff),
    clearcoat: o.clearcoat ?? 0, clearcoatRoughness: o.coatRough ?? 0.35,
  });
  const u = {
    uSSS: { value: new THREE.Color(o.sss ?? 0x000000) }, uKey: { value: KEY_VIEW },
    uRim: { value: new THREE.Color(o.rim ?? 0xbfd0ff) }, uRimK: { value: o.rimK ?? 0.1 },
    uPit: { value: new THREE.Color(C.pit) }, uBoardY: { value: 0 },
    uDebug: DEBUG, uPart: { value: new THREE.Color().setHSL(Math.random(), 0.7, 0.55) },
  };
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 bake; varying vec2 vBake; varying float vWY;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvBake = bake; vWY = (modelMatrix * vec4(transformed, 1.0)).y;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec2 vBake; varying float vWY;
        uniform vec3 uSSS, uKey, uRim, uPit, uPart; uniform float uRimK, uBoardY; uniform int uDebug;`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        reflectedLight.directDiffuse *= vBake.y;
        reflectedLight.directSpecular *= vBake.y;
        reflectedLight.indirectDiffuse *= vBake.x;
        reflectedLight.indirectSpecular *= mix(1.0, vBake.x, 0.7);`)
      .replace('#include <opaque_fragment>', `
        vec3 nn = normalize(normal);
        float w = dot(nn, uKey);
        float band = smoothstep(-0.45, 0.05, w) * (1.0 - smoothstep(0.05, 0.6, w));
        float fr = pow(1.0 - saturate(dot(nn, normalize(vViewPosition))), 3.0);
        outgoingLight += (uSSS * (band * 0.28 * vBake.y + fr * 0.12) + uRim * fr * uRimK) * vBake.x;
        outgoingLight = mix(outgoingLight, uPit, smoothstep(0.0, 0.22, uBoardY - vWY) * 0.95);
        if (uDebug == 1) outgoingLight = vec3(vBake.x * mix(0.35, 1.0, vBake.y));
        if (uDebug == 2) outgoingLight = nn * 0.5 + 0.5;
        if (uDebug == 3) outgoingLight = uPart * (0.4 + 0.6 * max(dot(nn, uKey), 0.0));
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'clay-baked';
  return m;
}

export const M = {
  skin: clay(C.skin, { roughness: 0.55, sheen: 0.5, sheenColor: 0xffd6cc, sss: 0xff6a3d }),
  lip: clay(C.lip, { roughness: 0.5 }),
  eye: clay(0xffffff, { roughness: 0.2, sheen: 0, clearcoat: 1, coatRough: 0.05, rimK: 0.04 }),
  pupil: clay(C.pupil, { roughness: 0.1, sheen: 0, clearcoat: 1, coatRough: 0.02, rimK: 0 }),
  catch: new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
  beanie: clay(C.beanie, { roughness: 0.92, sheen: 1, sheenColor: 0xfff8ec, rimK: 0.08 }),
  tee: clay(C.tee, { roughness: 0.85, sheen: 0.7, sheenColor: 0x6a6a78, rimK: 0.08 }),
};

// ---------- forme (spazio personaggio: mento a y=0, faccia verso +z) ----------
const EAR = { x: 0.9, y: 1.0, z: -0.05, yaw: 0.3 };

function headCore(x, y, z) {
  let d = ellipsoid(x, y - 1.25, z, 0.93, 1.0, 0.85);                     // cranio
  d = smin(d, ellipsoid(x, y - 0.55, z - 0.04, 0.95, 0.62, 0.82), 0.35);   // guance e mascella
  return d;
}
// punto della faccia davanti a (x, y): bisezione lungo z
function frontZ(f, x, y) {
  let a = 0, b = 2;
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2; f(x, y, m) < 0 ? (a = m) : (b = m); }
  return a;
}
const NOSE = { y: 0.9, z: frontZ(headCore, 0, 0.9) + 0.03 };

function ear(x, y, z, side) {
  const a = -side * EAR.yaw, c = Math.cos(a), s = Math.sin(a);
  const dx = x - side * EAR.x, dy = y - EAR.y, dz = z - EAR.z;
  const lx = c * dx + s * dz, lz = -s * dx + c * dz;
  let d = ellipsoid(lx - side * 0.13, dy, lz, 0.13, 0.42, 0.3);                          // padiglione
  d = smax(d, -ellipsoid(lx - side * 0.26, dy + 0.03, lz - 0.03, 0.09, 0.28, 0.19), 0.04); // conca
  return d;
}

export function skinSDF(x, y, z) {
  let d = headCore(x, y, z);
  d = smin(d, capsule(x, y, z, 0, -1.6, -0.05, 0, 0.4, -0.1, 0.47), 0.22);  // collo raccordato al mento
  d = smin(d, ellipsoid(x, y - NOSE.y, z - NOSE.z, 0.22, 0.21, 0.2), 0.06);  // naso
  d = smin(d, ear(x, y, z, 1), 0.1);
  d = smin(d, ear(x, y, z, -1), 0.1);
  return d;
}

export function beanieSDF(x, y, z) {
  let crown = ellipsoid(x, y - 1.6, z + 0.03, 1.0, 1.0, 0.94);
  crown = smax(crown, 1.58 - y, 0.05);
  const rr = Math.hypot(x, (z + 0.03) / 0.93);
  const cuff = roundRect2(rr - 1.0, y - 1.7, 0.095, 0.19, 0.085) * 0.93;     // risvolto
  const d = smin(crown, cuff, 0.035);
  // coste verticali: più marcate sul risvolto, sfumano verso la cima
  const ang = Math.atan2(x, z + 0.03);
  const amp = (y < 1.9 ? 0.016 : 0.009) * sstep(0.25, 0.7, rr);
  return d + amp * Math.cos(ang * 44);
}

export function teeSDF(x, y, z) {
  let d = capsule(x, y, z / 0.8, 0, -1.15, 0, 0, -5, 0, 0.98) * 0.8;          // busto a pillola
  const neckHole = Math.max(Math.hypot(x, z + 0.06) - 0.5, -0.65 - y);
  d = smax(d, -neckHole, 0.05);
  const rr = Math.hypot(x, (z + 0.06) / 0.94);
  d = smin(d, Math.hypot(rr - 0.55, y + 0.31) - 0.085, 0.06);                // colletto
  return d;
}

// ---------- occhio con palpebre ----------
const EYE = { x: 0.34, y: 1.24, R: 0.31, scale: [1.0, 0.82, 0.78] };
let eyeZ = null; // calcolato al primo uso (dipende dalla pelle)
const getEyeZ = () => (eyeZ ??= frontZ(skinSDF, EYE.x, EYE.y) - 0.1);

function buildEye(parent, side) {
  const { R } = EYE;
  const g = new THREE.Group();
  g.position.set(side * EYE.x, EYE.y, getEyeZ());
  g.rotation.y = side * 0.2;
  g.scale.set(...EYE.scale);
  parent.add(g);
  const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); g.add(m); return m; };

  add(new THREE.SphereGeometry(R, 48, 32), M.eye);
  const pupil = add(new THREE.SphereGeometry(0.088, 32, 16), M.pupil);
  const glint = add(new THREE.SphereGeometry(0.024, 16, 8), M.catch);
  pupil.userData.moving = glint.userData.moving = true;
  const dir = (el, az) => new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  const Z = new THREE.Vector3(0, 0, 1);
  const setPupil = (el, az) => {
    pupil.position.copy(dir(el, az)).multiplyScalar(R * 0.975);
    pupil.quaternion.setFromUnitVectors(Z, dir(el, az));
    pupil.scale.set(1, 1, 0.35);
    glint.position.copy(dir(el + 0.07, az - 0.1)).multiplyScalar(R * 1.075);
    glint.scale.set(1, 1, 0.4);
  };

  const COVER = 95 * DEG, RL = R * 1.14; // più larga di pupilla e riflesso: chiusa li copre
  const upper = new THREE.Group(); g.add(upper);
  upper.add(new THREE.Mesh(new THREE.SphereGeometry(RL, 48, 24, 0, Math.PI * 2, 0, COVER), M.skin));
  const rimU = new THREE.Mesh(new THREE.TorusGeometry(RL * Math.sin(COVER), 0.04, 12, 64), M.skin);
  rimU.rotation.x = Math.PI / 2; rimU.position.y = RL * Math.cos(COVER);
  upper.add(rimU);
  upper.children.forEach((m) => { m.userData.moving = true; });

  const LC = 55 * DEG;
  const lower = new THREE.Group(); g.add(lower);
  lower.add(new THREE.Mesh(new THREE.SphereGeometry(RL * 0.99, 48, 16, 0, Math.PI * 2, Math.PI - LC, LC), M.skin));
  const rimL = new THREE.Mesh(new THREE.TorusGeometry(RL * 0.99 * Math.sin(LC), 0.022, 12, 64), M.skin);
  rimL.rotation.x = Math.PI / 2; rimL.position.y = -RL * 0.99 * Math.cos(LC);
  lower.add(rimL);
  lower.rotation.x = 8 * DEG;

  const setLid = (closed) => { upper.rotation.x = lerp(-70, 78, closed) * DEG; };
  return { setLid, setPupil, group: g };
}

// distanza da tutto il personaggio (per AO e ombre); gli occhi come ellissoidi
function sceneSDF(x, y, z) {
  let d = Math.min(skinSDF(x, y, z), beanieSDF(x, y, z), teeSDF(x, y, z));
  const ez = getEyeZ();
  for (const s of [-1, 1])
    d = Math.min(d, ellipsoid(x - s * EYE.x, y - EYE.y, z - ez, EYE.R * 1.05, EYE.R * 0.86, EYE.R * 0.82));
  return d;
}
const staticSDF = (x, y, z) => Math.min(skinSDF(x, y, z), beanieSDF(x, y, z), teeSDF(x, y, z));

// ---------- costruzione: mesh SDF una volta sola, poi istanze ----------
// L = direzione verso la luce chiave nello spazio del personaggio.
export function buildKit(L, quality = 1) {
  const t0 = performance.now();
  const h = (v) => v / quality;
  const parts = {
    skin: meshSDF(skinSDF, [new THREE.Vector3(-1.35, -1.25, -1.0), new THREE.Vector3(1.35, 2.35, 1.15)], h(0.026)),
    beanie: meshSDF(beanieSDF, [new THREE.Vector3(-1.2, 1.35, -1.15), new THREE.Vector3(1.2, 2.7, 1.1)], h(0.022)),
    tee: meshSDF(teeSDF, [new THREE.Vector3(-1.15, -2.7, -0.95), new THREE.Vector3(1.15, 0.0, 0.95)], h(0.035)),
  };
  const tMesh = performance.now();
  for (const g of Object.values(parts)) bake(g, sceneSDF, L);
  const stats = {
    meshMs: Math.round(tMesh - t0), bakeMs: Math.round(performance.now() - tMesh),
    tris: Object.fromEntries(Object.entries(parts).map(([k, g]) => [k, g.index.count / 3])),
    // bordi aperti sopra i tagli voluti (collo dentro la maglia, busto dentro il buco)
    open: { skin: openEdges(parts.skin, -1.2), beanie: openEdges(parts.beanie), tee: openEdges(parts.tee, -2.65) },
  };
  return { parts, L, stats };
}

function constBake(geo, ao, sh) {
  const a = new Float32Array(geo.attributes.position.count * 2);
  for (let i = 0; i < a.length; i += 2) { a[i] = ao; a[i + 1] = sh; }
  geo.setAttribute('bake', new THREE.BufferAttribute(a, 2));
  return geo;
}

export function buildRookie(kit) {
  const char = new THREE.Group();
  const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); char.add(m); return m; };
  add(kit.parts.skin, M.skin);
  add(kit.parts.beanie, M.beanie);
  add(kit.parts.tee, M.tee);

  // bocca: linea un filo all'ingiù, più la "O" dello spavento
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const x = lerp(-0.24, 0.24, i / 20), y = 0.44 - 0.035 * (x / 0.24) ** 2;
    pts.push(new THREE.Vector3(x, y, frontZ(skinSDF, x, y) + 0.004));
  }
  const mouth = add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.017, 8), M.lip);
  const mouthO = add(new THREE.SphereGeometry(0.11, 32, 16), M.pupil);
  mouthO.position.set(0, 0.42, frontZ(skinSDF, 0, 0.42) - 0.04);

  const eyes = [buildEye(char, -1), buildEye(char, 1)];

  // le parti rigide prendono la luce precalcolata come le altre (una volta per kit)
  char.updateMatrixWorld(true);
  // (stesso ordine di attraversamento a ogni istanza: si riusano le geometrie già cotte)
  const first = !kit.rigid;
  kit.rigid ??= [];
  let n = 0;
  char.traverse((o) => {
    if (!o.isMesh || o.geometry.attributes.bake) return;
    // le parti che si muovono (palpebra, pupilla) non possono avere luce cotta in una posa:
    // prendono un valore costante
    if (first) kit.rigid.push(o.userData.moving ? constBake(o.geometry, 0.92, 1) : bake(o.geometry, staticSDF, kit.L, o.matrixWorld));
    else o.geometry = kit.rigid[n];
    n++;
  });

  const face = { lid: 0.3, look: 8 * DEG, scared: 0, blink: 0 };
  function applyFace() {
    const s = face.scared;
    eyes.forEach((e) => {
      e.setLid(lerp(lerp(face.lid, 0.02, s), 1, face.blink * (1 - s)));
      e.setPupil(lerp(4, 0, s) * DEG, lerp(face.look, 0, s));
    });
    mouth.scale.setScalar(Math.max(1 - s * 1.2, 0.001));
    const o = Math.max(s, 0.001);
    mouthO.scale.set(0.9 * o, 1.15 * o, 0.4 * o);
  }
  applyFace();
  return { char, face, applyFace };
}
