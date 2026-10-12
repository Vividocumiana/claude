// Rookiess — personaggi clay costruiti in SDF: un kit comune (testa, orecchie, naso, occhi)
// e due archetipi che si distinguono soprattutto in cima alla testa, la parte che dall'alto si vede di più:
//   rookie = beanie crema, materiali opachi e chiari, occhi aperti, sorriso   → non colpire
//   guru   = capelli col gel lucidi, occhiali da sole, oro, sorrisetto        → colpisci
// Le superfici morbide sono SDF messe in mesh al caricamento; occhi, palpebre, bocca e accessori
// sono pezzi rigidi perché si animano. Luce precalcolata per vertice: la vista della hero è fissa.
import * as THREE from 'three';
import { smin, smax, ellipsoid, capsule, roundRect2, meshSDF, bake, openEdges } from './sdf.js';

const DEG = Math.PI / 180;
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- palette ----------
export const C = {
  skinRookie: 0xeea397, skinGuru: 0xec9466, lip: 0xb8655c, lipGuru: 0xa9553f,
  pupil: 0x141414, beanie: 0xece4d2, hoodie: 0xdde1e8, string: 0xf6f6f4,
  tee: 0x26262a, hair: 0x2b1d16, gold: 0xe2a93b, lens: 0x0d0e14,
  blush: 0xff7f7a, mouth: 0x5a1a22, teeth: 0xfbf8f2, tongue: 0xe2737a,
  pit: 0x07116c,
};

// ---------- materiale clay con luce precalcolata ----------
// bake.x = AO (moltiplica la luce ambiente), bake.y = ombra (moltiplica la luce chiave).
// tint.x = guance rosate, tint.y = interno della bocca (solo dove la geometria lo prevede).
// Sotto il livello del tavolo il personaggio sfuma nel colore del buco.
export const DEBUG = { value: 0 }; // 0 finale · 1 luce precalcolata · 2 normali · 3 parti
export const KEY_VIEW = new THREE.Vector3(-0.42, 0.42, 0.8).normalize(); // luce chiave, spazio camera

function clay(color, o = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    color, roughness: o.roughness ?? 0.62, metalness: o.metalness ?? 0,
    sheen: o.sheen ?? 0.35, sheenRoughness: 0.8,
    sheenColor: new THREE.Color(o.sheenColor ?? 0xffffff),
    clearcoat: o.clearcoat ?? 0, clearcoatRoughness: o.coatRough ?? 0.35,
  });
  const u = {
    uSSS: { value: new THREE.Color(o.sss ?? 0x000000) }, uKey: { value: KEY_VIEW },
    uRim: { value: new THREE.Color(o.rim ?? 0xbfd0ff) }, uRimK: { value: o.rimK ?? 0.1 },
    uPit: { value: new THREE.Color(C.pit) }, uBoardY: { value: 0 },
    uBlush: { value: new THREE.Color(C.blush) }, uMouth: { value: new THREE.Color(C.mouth) },
    uDebug: DEBUG, uPart: { value: new THREE.Color().setHSL(Math.random(), 0.7, 0.55) },
  };
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 bake; attribute vec2 tint; varying vec2 vBake; varying vec2 vTint; varying float vWY;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvBake = bake; vTint = tint; vWY = (modelMatrix * vec4(transformed, 1.0)).y;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec2 vBake; varying vec2 vTint; varying float vWY;
        uniform vec3 uSSS, uKey, uRim, uPit, uPart, uBlush, uMouth; uniform float uRimK, uBoardY; uniform int uDebug;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb = mix(diffuseColor.rgb, uBlush, vTint.x);
        diffuseColor.rgb = mix(diffuseColor.rgb, uMouth, vTint.y);`)
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
        outgoingLight += (uSSS * (band * 0.28 * vBake.y + fr * 0.12) * (1.0 - vTint.y) + uRim * fr * uRimK) * vBake.x;
        outgoingLight = mix(outgoingLight, uPit, smoothstep(0.0, 0.22, uBoardY - vWY) * 0.95);
        if (uDebug == 1) outgoingLight = vec3(vBake.x * mix(0.35, 1.0, vBake.y));
        if (uDebug == 2) outgoingLight = nn * 0.5 + 0.5;
        if (uDebug == 3) outgoingLight = uPart * (0.4 + 0.6 * max(dot(nn, uKey), 0.0));
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'clay-baked';
  return m;
}

const skinOpts = { roughness: 0.55, sheen: 0.5, sheenColor: 0xffd6cc, sss: 0xff6a3d };
export const M = {
  skinRookie: clay(C.skinRookie, skinOpts),
  skinGuru: clay(C.skinGuru, { ...skinOpts, roughness: 0.45, clearcoat: 0.15 }), // abbronzatura da yacht, un po' lucida
  lip: clay(C.lip, { roughness: 0.5 }),
  lipGuru: clay(C.lipGuru, { roughness: 0.45 }),
  eye: clay(0xffffff, { roughness: 0.2, sheen: 0, clearcoat: 1, coatRough: 0.05, rimK: 0.04 }),
  pupil: clay(C.pupil, { roughness: 0.1, sheen: 0, clearcoat: 1, coatRough: 0.02, rimK: 0 }),
  mouthIn: clay(C.mouth, { roughness: 0.7, sheen: 0, rimK: 0 }),
  catch: new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
  teeth: clay(C.teeth, { roughness: 0.3, sheen: 0, clearcoat: 0.6 }),
  tongue: clay(C.tongue, { roughness: 0.5 }),
  beanie: clay(C.beanie, { roughness: 0.92, sheen: 1, sheenColor: 0xfff8ec, rimK: 0.08 }),
  hoodie: clay(C.hoodie, { roughness: 0.9, sheen: 1, sheenColor: 0xffffff, rimK: 0.08 }),
  string: clay(C.string, { roughness: 0.8, sheen: 0.5 }),
  tee: clay(C.tee, { roughness: 0.85, sheen: 0.7, sheenColor: 0x6a6a78, rimK: 0.08 }),
  hair: clay(C.hair, { roughness: 0.4, sheen: 0, clearcoat: 1, coatRough: 0.3, rimK: 0.12 }), // gel
  brow: clay(C.hair, { roughness: 0.75, sheen: 0.2, rimK: 0 }),
  gold: clay(C.gold, { roughness: 0.25, metalness: 1, sheen: 0, rimK: 0 }),
  lens: clay(C.lens, { roughness: 0.06, metalness: 0.5, sheen: 0, clearcoat: 1, coatRough: 0.02, rimK: 0.25 }),
};

// ---------- forme comuni (spazio personaggio: mento a y=0, faccia verso +z) ----------
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

export function skinBase(x, y, z) {
  let d = headCore(x, y, z);
  d = smin(d, capsule(x, y, z, 0, -1.6, -0.05, 0, 0.4, -0.1, 0.47), 0.22);  // collo raccordato al mento
  d = smin(d, ellipsoid(x, y - NOSE.y, z - NOSE.z, 0.22, 0.21, 0.2), 0.06);  // naso
  d = smin(d, ear(x, y, z, 1), 0.1);
  d = smin(d, ear(x, y, z, -1), 0.1);
  return d;
}

// busto a pillola con collo e colletto; base di t-shirt e felpa
function torso(x, y, z) {
  let d = capsule(x, y, z / 0.8, 0, -1.15, 0, 0, -5, 0, 0.98) * 0.8;
  const neckHole = Math.max(Math.hypot(x, z + 0.06) - 0.5, -0.65 - y);
  d = smax(d, -neckHole, 0.05);
  const rr = Math.hypot(x, (z + 0.06) / 0.94);
  return smin(d, Math.hypot(rr - 0.55, y + 0.31) - 0.085, 0.06);            // colletto
}

const EYE = { x: 0.34, y: 1.24, R: 0.31, scale: [1.0, 0.82, 0.78] };
const EYE_Z = frontZ(skinBase, EYE.x, EYE.y) - 0.1;
const EYE_FRONT = EYE_Z + EYE.R * EYE.scale[2];
const eyesSDF = (x, y, z) => Math.min(
  ellipsoid(x - EYE.x, y - EYE.y, z - EYE_Z, EYE.R * 1.05, EYE.R * 0.86, EYE.R * 0.82),
  ellipsoid(x + EYE.x, y - EYE.y, z - EYE_Z, EYE.R * 1.05, EYE.R * 0.86, EYE.R * 0.82));

// ---------- rookie ----------
const MOUTH_Z = frontZ(headCore, 0, 0.5);
// sorriso a "D": cavità scavata nella pelle, bordo dritto in alto
const smileCavity = (x, y, z) => Math.max(ellipsoid(x, y - 0.53, z - (MOUTH_Z - 0.02), 0.27, 0.19, 0.15), y - 0.54);

function rookieSkin(x, y, z) { return smax(skinBase(x, y, z), -smileCavity(x, y, z), 0.03); }

function beanieSDF(x, y, z) {
  let crown = ellipsoid(x, y - 1.6, z + 0.03, 1.0, 1.0, 0.94);
  crown = smax(crown, 1.58 - y, 0.05);
  const rr = Math.hypot(x, (z + 0.03) / 0.93);
  const cuff = roundRect2(rr - 1.0, y - 1.7, 0.095, 0.19, 0.085) * 0.93;     // risvolto
  const d = smin(crown, cuff, 0.035);
  const ang = Math.atan2(x, z + 0.03);                                         // coste verticali
  const amp = (y < 1.9 ? 0.016 : 0.009) * sstep(0.25, 0.7, rr);
  return d + amp * Math.cos(ang * 44);
}

function hoodieSDF(x, y, z) {
  // cappuccio arrotolato dietro al collo
  return smin(torso(x, y, z), ellipsoid(x, y + 0.36, z + 0.5, 0.8, 0.3, 0.38), 0.14);
}

// guance rosate + interno della bocca, scritti per vertice
function rookieTint(geo) {
  const p = geo.attributes.position, t = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    let blush = 0;
    for (const s of [-1, 1]) blush += Math.exp(-(((x - s * 0.56) / 0.2) ** 2 + ((y - 0.72) / 0.15) ** 2)) * (z > 0.3 ? 1 : 0);
    t[i * 2] = Math.min(blush, 1) * 0.45;
    t[i * 2 + 1] = sstep(-0.004, -0.03, headCore(x, y, z)) * (y < 0.6 ? 1 : 0); // dentro la testa = cavità
  }
  geo.setAttribute('tint', new THREE.BufferAttribute(t, 2));
}

// ---------- guru ----------
function hairSDF(x, y, z) {
  // calotta un filo più grande del cranio, attaccatura alta davanti e bassa dietro
  let d = ellipsoid(x, y - 1.27, z + 0.01, 0.99, 1.07, 0.92);
  d = smax(d, 1.56 + 0.3 * z - y, 0.05);
  // ciuffo col gel davanti, un po' spostato di lato
  d = smin(d, ellipsoid(x - 0.12, y - 2.17, z - 0.46, 0.62, 0.36, 0.5), 0.24);
  // solchi del pettine, da davanti a dietro
  return d + 0.006 * Math.cos(x * 18 + z * 3) * sstep(1.8, 2.05, y);
}

// ---------- archetipi ----------
const box = (a, b) => [V(...a), V(...b)];
const ARCH = {
  rookie: {
    skinMat: 'skinRookie',
    sdf: [
      { name: 'skin', f: rookieSkin, box: box([-1.35, -1.25, -1.0], [1.35, 2.35, 1.15]), h: 0.026, mat: 'skinRookie', clip: -1.2, tint: rookieTint },
      { name: 'beanie', f: beanieSDF, box: box([-1.2, 1.35, -1.15], [1.2, 2.7, 1.1]), h: 0.022, mat: 'beanie' },
      { name: 'hoodie', f: hoodieSDF, box: box([-1.15, -2.7, -1.05], [1.15, 0.0, 0.95]), h: 0.035, mat: 'hoodie', clip: -2.65 },
    ],
    face: { lid: 0.2, look: 0, elev: 7 * DEG, pupil: 1.12 },
  },
  guru: {
    skinMat: 'skinGuru',
    sdf: [
      { name: 'skin', f: skinBase, box: box([-1.35, -1.25, -1.0], [1.35, 2.35, 1.15]), h: 0.026, mat: 'skinGuru', clip: -1.2 },
      { name: 'hair', f: hairSDF, box: box([-1.15, 1.15, -1.05], [1.15, 2.55, 1.1]), h: 0.022, mat: 'hair' },
      { name: 'tee', f: torso, box: box([-1.15, -2.7, -0.95], [1.15, 0.0, 0.95]), h: 0.035, mat: 'tee', clip: -2.65 },
    ],
    face: { lid: 0.32, look: 8 * DEG, elev: 4 * DEG, pupil: 1 },
  },
};

// ---------- occhio con palpebre ----------
function buildEye(parent, side, skin) {
  const { R } = EYE;
  const g = new THREE.Group();
  g.position.set(side * EYE.x, EYE.y, EYE_Z);
  g.rotation.y = side * 0.2;
  g.scale.set(...EYE.scale);
  parent.add(g);
  const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); g.add(m); return m; };

  add(new THREE.SphereGeometry(R, 48, 32), M.eye);
  const pupil = add(new THREE.SphereGeometry(0.088, 32, 16), M.pupil);
  const glint = add(new THREE.SphereGeometry(0.024, 16, 8), M.catch);
  pupil.userData.moving = glint.userData.moving = true;
  const dir = (el, az) => V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  const Z = V(0, 0, 1);
  const setPupil = (el, az, size = 1) => {
    pupil.position.copy(dir(el, az)).multiplyScalar(R * 0.975);
    pupil.quaternion.setFromUnitVectors(Z, dir(el, az));
    pupil.scale.set(size, size, 0.35);
    glint.position.copy(dir(el + 0.07 * size, az - 0.1 * size)).multiplyScalar(R * 1.075);
    glint.scale.set(size, size, 0.4);
  };

  const COVER = 95 * DEG, RL = R * 1.16; // più larga di pupilla e riflesso: chiusa li copre
  const upper = new THREE.Group(); g.add(upper);
  upper.add(new THREE.Mesh(new THREE.SphereGeometry(RL, 48, 24, 0, Math.PI * 2, 0, COVER), skin));
  const rimU = new THREE.Mesh(new THREE.TorusGeometry(RL * Math.sin(COVER), 0.04, 12, 64), skin);
  rimU.rotation.x = Math.PI / 2; rimU.position.y = RL * Math.cos(COVER);
  upper.add(rimU);
  upper.children.forEach((m) => { m.userData.moving = true; });

  const LC = 55 * DEG;
  const lower = new THREE.Group(); g.add(lower);
  lower.add(new THREE.Mesh(new THREE.SphereGeometry(RL * 0.99, 48, 16, 0, Math.PI * 2, Math.PI - LC, LC), skin));
  const rimL = new THREE.Mesh(new THREE.TorusGeometry(RL * 0.99 * Math.sin(LC), 0.022, 12, 64), skin);
  rimL.rotation.x = Math.PI / 2; rimL.position.y = -RL * 0.99 * Math.cos(LC);
  lower.add(rimL);
  lower.rotation.x = 8 * DEG;

  const setLid = (closed) => { upper.rotation.x = lerp(-70, 78, closed) * DEG; };
  return { setLid, setPupil, group: g };
}

// ---------- costruzione: mesh SDF una volta per archetipo, poi istanze ----------
// L = direzione verso la luce chiave nello spazio del personaggio.
export function buildKit(type, L, quality = 1) {
  const A = ARCH[type];
  const t0 = performance.now();
  const parts = {};
  for (const s of A.sdf) {
    parts[s.name] = meshSDF(s.f, s.box, s.h / quality);
    s.tint?.(parts[s.name]);
  }
  const staticSDF = (x, y, z) => Math.min(...A.sdf.map((s) => s.f(x, y, z)));
  const sceneSDF = (x, y, z) => Math.min(staticSDF(x, y, z), eyesSDF(x, y, z));
  const tMesh = performance.now();
  for (const g of Object.values(parts)) bake(g, sceneSDF, L);
  const stats = {
    meshMs: Math.round(tMesh - t0), bakeMs: Math.round(performance.now() - tMesh),
    tris: A.sdf.reduce((n, s) => n + parts[s.name].index.count / 3, 0),
    // bordi aperti sopra i tagli voluti (collo dentro la maglia, busto dentro il buco): devono essere 0
    open: Object.fromEntries(A.sdf.map((s) => [s.name, openEdges(parts[s.name], s.clip ?? -Infinity)])),
  };
  return { type, A, parts, L, staticSDF, stats };
}

function constBake(geo, ao, sh) {
  const a = new Float32Array(geo.attributes.position.count * 2);
  for (let i = 0; i < a.length; i += 2) { a[i] = ao; a[i + 1] = sh; }
  geo.setAttribute('bake', new THREE.BufferAttribute(a, 2));
  return geo;
}

// tubo che segue la faccia
function faceCurve(f, xs, yOf, lift = 0.004) {
  return new THREE.CatmullRomCurve3(xs.map((x) => { const y = yOf(x); return V(x, y, frontZ(f, x, y) + lift); }));
}
const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => lerp(a, b, i / n));

export function buildCharacter(kit) {
  const { A, type } = kit;
  const char = new THREE.Group();
  const add = (geo, mat, parent = char) => { const m = new THREE.Mesh(geo, mat); parent.add(m); return m; };
  for (const s of A.sdf) add(kit.parts[s.name], M[s.mat]);
  const skin = M[A.skinMat];

  // "O" dello spavento, comune a tutti
  const O_Y = 0.46, O_Z = frontZ(skinBase, 0, O_Y);
  const mouthO = new THREE.Group(); char.add(mouthO);
  mouthO.position.set(0, O_Y, O_Z);
  mouthO.rotation.x = -0.12;
  const oIn = add(new THREE.SphereGeometry(1, 24, 12), M.mouthIn, mouthO);
  oIn.scale.set(0.085, 0.11, 0.025);
  const oLip = add(new THREE.TorusGeometry(0.095, 0.03, 12, 32), M[type === 'guru' ? 'lipGuru' : 'lip'], mouthO);
  oLip.scale.set(1, 1.25, 0.8);
  mouthO.traverse((o) => { if (o.isMesh) o.userData.moving = true; });

  const eyes = [buildEye(char, -1, skin), buildEye(char, 1, skin)];
  const extra = {};

  if (type === 'rookie') {
    // denti in alto e lingua in fondo alla cavità del sorriso
    const teeth = add(new THREE.CapsuleGeometry(0.05, 0.3, 6, 16), M.teeth);
    teeth.rotation.z = Math.PI / 2; teeth.scale.set(1, 1, 0.55);
    teeth.position.set(0, 0.5, MOUTH_Z - 0.05);
    const tongue = add(new THREE.SphereGeometry(1, 24, 12), M.tongue);
    tongue.scale.set(0.15, 0.07, 0.09); tongue.position.set(0, 0.39, MOUTH_Z - 0.09);
    extra.smile = [teeth, tongue];
    // cordini della felpa
    for (const s of [-1, 1]) {
      const c = new THREE.CatmullRomCurve3([V(s * 0.2, -0.36, 0.5), V(s * 0.22, -0.55, 0.62), V(s * 0.24, -0.85, 0.66)]);
      add(new THREE.TubeGeometry(c, 16, 0.032, 8), M.string);
      const tip = add(new THREE.CapsuleGeometry(0.04, 0.08, 4, 8), M.string);
      tip.position.set(s * 0.24, -0.9, 0.66);
    }
  } else {
    // sorrisetto storto: un angolo su
    extra.smirk = add(new THREE.TubeGeometry(faceCurve(skinBase, range(-0.2, 0.25, 20), (x) => 0.45 + 0.08 * sstep(-0.02, 0.25, x) - 0.012 * (x < 0 ? (x / 0.2) ** 2 : 0)), 40, 0.024, 8), M.lipGuru);
    // sopracciglio alzato sopra gli occhiali, l'altro piatto
    for (const s of [-1, 1]) {
      const b = add(new THREE.CapsuleGeometry(0.055, 0.28, 6, 12), M.brow);
      b.rotation.z = Math.PI / 2 + (s > 0 ? 0.28 : -0.05);
      b.position.set(s * 0.36, s > 0 ? 1.68 : 1.6, frontZ(skinBase, s * 0.36, 1.62) + 0.02);
    }
    // occhiali da sole: due lenti stondate, ponte e aste d'oro
    const glasses = new THREE.Group(); char.add(glasses);
    const lensShape = (() => {
      const w = 0.34, h = 0.24, r = 0.14, s = new THREE.Shape();
      s.moveTo(-w + r, -h); s.lineTo(w - r, -h); s.quadraticCurveTo(w, -h, w, -h + r);
      s.lineTo(w, h - r); s.quadraticCurveTo(w, h, w - r, h); s.lineTo(-w + r, h);
      s.quadraticCurveTo(-w, h, -w, h - r); s.lineTo(-w, -h + r); s.quadraticCurveTo(-w, -h, -w + r, -h);
      return s;
    })();
    for (const s of [-1, 1]) {
      const g = new THREE.ExtrudeGeometry(lensShape, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 4, curveSegments: 24 });
      g.translate(0, 0, -0.015);
      const lens = add(g, M.lens, glasses);
      lens.position.set(s * 0.37, 1.26, EYE_FRONT + 0.06);
      lens.rotation.set(-0.06, s * 0.2, 0);
      const temple = add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        V(s * 0.7, 1.33, EYE_FRONT - 0.02), V(s * 0.9, 1.33, 0.35), V(s * 0.97, 1.3, -0.05)]), 16, 0.025, 8), M.gold, glasses);
      temple.userData.gold = true;
    }
    const bridge = add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      V(-0.66, 1.42, EYE_FRONT + 0.04), V(0, 1.47, EYE_FRONT + 0.16), V(0.66, 1.42, EYE_FRONT + 0.04)]), 32, 0.03, 8), M.gold, glasses);
    bridge.userData.gold = true;
    glasses.traverse((o) => { if (o.isMesh) o.userData.moving = true; });
    extra.glasses = glasses;
    // catena d'oro a grani, appoggiata sulla maglia
    const BEADS = 56;
    for (let i = 0; i < BEADS; i++) {
      const th = (i / BEADS) * Math.PI * 2, front = Math.max(Math.cos(th), 0);
      const y = -0.36 - 0.12 * front ** 2;
      // da fuori verso l'asse del collo finché non si tocca la maglia
      const dx = Math.sin(th), dz = Math.cos(th);
      let r = 1.3;
      while (r > 0.3 && torso(dx * r, y, dz * r - 0.04) > 0) r -= 0.005;
      const bead = add(new THREE.SphereGeometry(0.05, 12, 8), M.gold);
      bead.position.set(dx * (r + 0.035), y, dz * (r + 0.035) - 0.04);
    }
  }

  // luce precalcolata per le parti rigide (una volta per kit; stesso ordine a ogni istanza)
  char.updateMatrixWorld(true);
  const first = !kit.rigid;
  kit.rigid ??= [];
  let n = 0;
  char.traverse((o) => {
    if (!o.isMesh || o.geometry.attributes.bake) return;
    if (first) kit.rigid.push(o.userData.moving ? constBake(o.geometry, 0.92, 1) : bake(o.geometry, kit.staticSDF, kit.L, o.matrixWorld));
    else o.geometry = kit.rigid[n];
    n++;
  });

  // ---- espressioni ----
  // scared: rookie = "ahi" (occhi strizzati), guru = occhi sbarrati e gli volano via gli occhiali
  const face = { ...A.face, scared: 0, blink: 0, fly: 0 };
  const g0 = extra.glasses && { pos: extra.glasses.position.clone() };
  function applyFace() {
    const s = face.scared;
    const hurt = type === 'rookie';
    eyes.forEach((e) => {
      const lid = hurt ? lerp(face.lid, 0.88, s) : lerp(face.lid, 0.0, s);
      e.setLid(lerp(lid, 1, face.blink * (1 - s)));
      e.setPupil(lerp(face.elev, 0, s), lerp(face.look, 0, s), lerp(face.pupil, 0.8, s));
    });
    // guru: "O" di spavento al posto del sorrisetto; rookie: denti stretti nel sorriso ("ahi")
    const o = hurt ? 0 : s;
    mouthO.visible = o > 0.02;
    mouthO.scale.setScalar(Math.max(o, 0.001));
    if (extra.smirk) extra.smirk.visible = o < 0.5;
    if (extra.smile) extra.smile[1].visible = s < 0.5; // la lingua sparisce, i denti restano
    if (extra.glasses) {
      const f = face.fly;
      extra.glasses.visible = f < 1;
      extra.glasses.position.set(g0.pos.x + 0.6 * f, g0.pos.y + 2.2 * f - 2.6 * f * f, g0.pos.z + 0.8 * f);
      extra.glasses.rotation.set(-1.4 * f, 0, -2.2 * f);
    }
  }
  applyFace();
  return { char, face, applyFace, type };
}
