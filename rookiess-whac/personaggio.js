// Rookiess — materiali clay, caricamento dei personaggi (worker) e parti rigide animate.
// Le forme stanno in shapes.js; il worker le mette in mesh e precalcola la luce.
import * as THREE from 'three';
import { bake } from './sdf.js';
import { ARCH, EYE, EYE_Z, EYE_FRONT, DEG, lerp, frontZ, torso, eyesSDF, beanie } from './shapes.js';
import LOGO_SVG from './logo-rookiess.svg';
import { buildArrays } from './worker-core.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- materiale clay con luce precalcolata ----------
// bake.x = AO (moltiplica la luce ambiente), bake.y = ombra (moltiplica la luce chiave).
// tint.x = colore "blush" del materiale (guance, labbra, barba, camicia), tint.y = interno della bocca.
// Sotto il livello del tavolo il personaggio sfuma nel colore del buco.
export const DEBUG = { value: 0 }; // 0 finale · 1 luce precalcolata · 2 normali · 3 parti
export const KEY_VIEW = new THREE.Vector3(-0.42, 0.42, 0.8).normalize(); // luce chiave, spazio camera
const PIT = 0x07116c, MOUTH = 0x5a1a22;
const ALL = new Set(); // tutti i materiali, per le viste di debug

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
    uPit: { value: new THREE.Color(PIT) }, uBoardY: { value: 0 },
    uBlush: { value: new THREE.Color(o.blush ?? 0xff7f7a) }, uMouth: { value: new THREE.Color(MOUTH) },
    uDebug: DEBUG, uPart: { value: new THREE.Color().setHSL(Math.random(), 0.7, 0.55) },
  };
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
  ALL.add(m);
  return m;
}
export const setWireframe = (on) => { for (const m of ALL) m.wireframe = on; };

// materiali comuni
const SHARED = {
  eye: clay(0xffffff, { roughness: 0.2, sheen: 0, clearcoat: 1, coatRough: 0.05, rimK: 0.04 }),
  pupil: clay(0x141414, { roughness: 0.1, sheen: 0, clearcoat: 1, coatRough: 0.02, rimK: 0 }),
  catch: new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
  mouthIn: clay(MOUTH, { roughness: 0.7, sheen: 0, rimK: 0 }),
  teeth: clay(0xfbf8f2, { roughness: 0.3, sheen: 0, clearcoat: 0.6 }),
  veneers: clay(0xffffff, { roughness: 0.12, sheen: 0, clearcoat: 1, coatRough: 0.05 }),
  tongue: clay(0xe2737a, { roughness: 0.5 }),
  beanie: clay(0xece4d2, { roughness: 0.92, sheen: 1, sheenColor: 0xfff8ec, rimK: 0.08 }),
  gold: clay(0xe2a93b, { roughness: 0.25, metalness: 1, sheen: 0, rimK: 0 }),
  lens: clay(0x0d0e14, { roughness: 0.06, metalness: 0.5, sheen: 0, clearcoat: 1, coatRough: 0.02, rimK: 0.25 }),
  plastic: clay(0x1a1a1e, { roughness: 0.3, sheen: 0, clearcoat: 0.8, rimK: 0.1 }),
  lash: clay(0x17110f, { roughness: 0.6, sheen: 0, rimK: 0 }),
  logo: logoMaterial(),
};

// logo Rookiess ricamato sul risvolto del beanie: SVG disegnato su un canvas, usato come texture con ritaglio
function logoMaterial() {
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 256;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const img = new Image();
  img.onload = () => {
    // tratto ingrossato (il logo è sottile e a distanza si perde): lo stesso disegno ripetuto in un piccolo cerchio
    const ctx = cv.getContext('2d'), w = 980, h = (w * 50) / 232, x0 = (cv.width - w) / 2, y0 = (cv.height - h) / 2;
    for (let a = 0; a < 16; a++) ctx.drawImage(img, x0 + Math.cos(a / 16 * Math.PI * 2) * 4, y0 + Math.sin(a / 16 * Math.PI * 2) * 4, w, h);
    ctx.drawImage(img, x0, y0, w, h);
    tex.needsUpdate = true;
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(LOGO_SVG);
  const m = clay(0xffffff, { roughness: 0.75, sheen: 0.8, sheenColor: 0x8090ff, rimK: 0 });
  m.map = tex; m.alphaTest = 0.45;
  m.polygonOffset = true; m.polygonOffsetFactor = -2;
  return m;
}

function materialsFor(A) {
  const c = A.colors;
  const skinOpts = { roughness: A.skinGloss ? 0.45 : 0.55, clearcoat: A.skinGloss ? 0.15 : 0, sheen: 0.5, sheenColor: 0xffd6cc, sss: 0xff6a3d, blush: c.blush };
  const dark = A.group === 'guru';
  return {
    ...SHARED,
    skin: clay(c.skin, skinOpts),
    lip: clay(c.lip, { roughness: 0.45 }),
    clothes: clay(c.clothes, dark
      ? { roughness: 0.85, sheen: 0.7, sheenColor: 0x6a6a78, rimK: 0.08, blush: c.shirt ?? c.clothes }
      : { roughness: 0.9, sheen: 1, sheenColor: 0xffffff, rimK: 0.08 }),
    string: clay(c.string ?? 0xffffff, { roughness: 0.8, sheen: 0.5 }),
    hairMatte: clay(c.hair ?? 0x222222, { roughness: 0.85, sheen: 0.6, sheenColor: 0x6b5a50, rimK: 0.1 }),
    hairGloss: clay(c.hair ?? 0x222222, { roughness: 0.4, sheen: 0, clearcoat: A.hairCoat ? 0.6 : 1, coatRough: A.hairCoat ?? 0.3, rimK: 0.12 }),
    brow: clay(c.hair ?? 0x2b1d16, { roughness: 0.75, sheen: 0.2, rimK: 0 }),
  };
}

// ---------- caricamento: worker in parallelo, uno per personaggio alla volta ----------
// onKit(kit) viene chiamata appena un personaggio è pronto.
export function loadKits(types, L, onKit, { quality = 1, workerSrc } = {}) {
  const Larr = [L.x, L.y, L.z];
  const toKit = (data) => {
    const A = ARCH[data.type];
    const parts = {};
    for (const p of A.parts) {
      const d = data.parts[p.name], g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(d.position, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(d.normal, 3));
      g.setAttribute('bake', new THREE.BufferAttribute(d.bake, 2));
      if (d.tint) g.setAttribute('tint', new THREE.BufferAttribute(d.tint, 2));
      g.setIndex(new THREE.BufferAttribute(d.index, 1));
      parts[p.name] = g;
    }
    const staticSDF = (x, y, z) => { let d = Infinity; for (const p of A.parts) d = Math.min(d, p.f(x, y, z)); return d; };
    const stats = { ...data.stats, tris: A.parts.reduce((n, p) => n + data.parts[p.name].index.length / 3, 0),
      open: Object.fromEntries(A.parts.map((p) => [p.name, data.parts[p.name].open])) };
    return { type: data.type, A, M: materialsFor(A), parts, L, staticSDF, stats };
  };

  let url = null;
  try { if (workerSrc && typeof Worker !== 'undefined') url = URL.createObjectURL(new Blob([workerSrc], { type: 'text/javascript' })); } catch { url = null; }
  if (!url) { // ripiego: nel thread principale, un personaggio per frame
    const queue = [...types];
    const step = () => { const t = queue.shift(); if (!t) return; onKit(toKit(buildArrays(t, Larr, quality).msg)); setTimeout(step, 0); };
    setTimeout(step, 0);
    return;
  }
  const n = Math.max(1, Math.min(types.length, (navigator.hardwareConcurrency || 4) - 1));
  const queue = [...types];
  for (let i = 0; i < n; i++) {
    const w = new Worker(url);
    const next = () => {
      const t = queue.shift();
      if (!t) { w.terminate(); return; }
      w.postMessage({ type: t, L: Larr, quality });
    };
    w.onmessage = (e) => { onKit(toKit(e.data)); next(); };
    w.onerror = (e) => { console.error('worker', e.message); };
    next();
  }
}

// ---------- parti rigide ----------
function constBake(geo, ao, sh) {
  const a = new Float32Array(geo.attributes.position.count * 2);
  for (let i = 0; i < a.length; i += 2) { a[i] = ao; a[i + 1] = sh; }
  geo.setAttribute('bake', new THREE.BufferAttribute(a, 2));
  return geo;
}
const range = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => lerp(a, b, i / n));
const tubeOn = (f, xs, yOf, r, lift = 0.004) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(xs.map((x) => { const y = yOf(x); return V(x, y, frontZ(f, x, y) + lift); })), 40, r, 8);
const tube = (pts, r, seg = 24) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => V(...p))), seg, r, 8);

function buildEye(parent, side, M, lashes) {
  const { R } = EYE;
  const g = new THREE.Group();
  g.position.set(side * EYE.x, EYE.y, EYE_Z);
  g.rotation.y = side * 0.2;
  g.scale.set(...EYE.scale);
  parent.add(g);
  const add = (geo, mat, p = g) => { const m = new THREE.Mesh(geo, mat); p.add(m); return m; };

  add(new THREE.SphereGeometry(R, 40, 28), M.eye);
  const pupil = add(new THREE.SphereGeometry(0.088, 24, 12), M.pupil);
  const glint = add(new THREE.SphereGeometry(0.024, 12, 8), M.catch);
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
  add(new THREE.SphereGeometry(RL, 40, 20, 0, Math.PI * 2, 0, COVER), M.skin, upper);
  // bordo della palpebra; le ciglia sono una linea sottile solo sul davanti (un anello intero sembrerebbe un paio d'occhiali)
  const rimU = add(new THREE.TorusGeometry(RL * Math.sin(COVER), 0.04, 12, 48), M.skin, upper);
  rimU.rotation.x = Math.PI / 2; rimU.position.y = RL * Math.cos(COVER);
  if (lashes) {
    const line = add(new THREE.TorusGeometry(RL * Math.sin(COVER) + 0.012, 0.03, 8, 32, Math.PI * 0.8), M.lash, upper);
    line.rotation.set(Math.PI / 2, 0, Math.PI * 0.1); line.position.y = RL * Math.cos(COVER) + 0.01;
  }
  if (lashes) {
    const wing = add(new THREE.CapsuleGeometry(0.03, 0.12, 4, 8), M.lash, upper);
    wing.position.set(side * RL * 0.98, RL * Math.cos(COVER) + 0.03, 0.06);
    wing.rotation.set(0.3, 0, side * -0.9);
  }
  upper.children.forEach((m) => { m.userData.moving = true; });

  const LC = 55 * DEG;
  const lower = new THREE.Group(); g.add(lower);
  add(new THREE.SphereGeometry(RL * 0.99, 40, 12, 0, Math.PI * 2, Math.PI - LC, LC), M.skin, lower);
  const rimL = add(new THREE.TorusGeometry(RL * 0.99 * Math.sin(LC), 0.022, 10, 48), M.skin, lower);
  rimL.rotation.x = Math.PI / 2; rimL.position.y = -RL * 0.99 * Math.cos(LC);
  lower.rotation.x = 8 * DEG;

  const setLid = (closed) => { upper.rotation.x = lerp(-70, 78, closed) * DEG; };
  return { setLid, setPupil };
}

export function buildCharacter(kit) {
  const { A, M, type } = kit;
  const head = A.headShape, ex = new Set(A.extras ?? []);
  const char = new THREE.Group();
  const add = (geo, mat, parent = char) => { const m = new THREE.Mesh(geo, mat); parent.add(m); return m; };
  for (const p of A.parts) add(kit.parts[p.name], M[p.mat]);
  const extra = { fly: [] };

  const eyes = [buildEye(char, -1, M, ex.has('lashes')), buildEye(char, 1, M, ex.has('lashes'))];

  // "O" di spavento (guru): interno rosso scuro a filo della faccia + labbro ad anello
  const O_Y = 0.46, O_Z = frontZ(head.base, 0, O_Y);
  const mouthO = new THREE.Group(); char.add(mouthO);
  mouthO.position.set(0, O_Y, O_Z); mouthO.rotation.x = -0.12;
  add(new THREE.SphereGeometry(1, 20, 10), M.mouthIn, mouthO).scale.set(0.085, 0.11, 0.025);
  add(new THREE.TorusGeometry(0.095, 0.03, 10, 28), M.lip, mouthO).scale.set(1, 1.25, 0.8);
  mouthO.traverse((o) => { if (o.isMesh) o.userData.moving = true; });

  if (ex.has('smile')) { // denti in alto e lingua in fondo alla cavità del sorriso
    const { w, h } = A.head.smile;
    const teeth = add(new THREE.CapsuleGeometry(0.05, w * 1.1, 6, 12), M.teeth);
    teeth.rotation.z = Math.PI / 2; teeth.scale.set(1, 1, 0.55);
    teeth.position.set(0, 0.5, head.mouthZ - 0.05);
    const tongue = add(new THREE.SphereGeometry(1, 20, 10), M.tongue);
    tongue.scale.set(w * 0.55, 0.07, 0.09); tongue.position.set(0, 0.53 - h * 0.75, head.mouthZ - 0.09);
    extra.tongue = tongue;
  }
  if (ex.has('veneers')) { // sorriso a 32 denti: denti singoli lungo l'arco, sopra e sotto
    const { w } = A.head.smile;
    const toothShape = (tw, th, r) => {
      const s = new THREE.Shape(), x0 = -tw / 2, y0 = -th / 2;
      s.moveTo(x0 + r, y0); s.lineTo(x0 + tw - r, y0); s.quadraticCurveTo(x0 + tw, y0, x0 + tw, y0 + r);
      s.lineTo(x0 + tw, y0 + th); s.lineTo(x0, y0 + th); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
      return s;
    };
    const teethG = new THREE.Group(); char.add(teethG);
    const row = (n, y, th, back, flip) => {
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n * 2 - 1;                        // -1..1 lungo il sorriso
        const tw = (w * 2 * 0.9) / n * (1.15 - 0.3 * u * u);     // incisivi più larghi, laterali più stretti
        const g = new THREE.ExtrudeGeometry(toothShape(tw * 0.9, th, 0.025), { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 6 });
        const t = add(g, M.veneers, teethG);
        const x = u * w * 0.86;
        // appesi al bordo superiore della bocca, che sale ai lati
        t.position.set(x, (head.smileTop ? head.smileTop(x) : y) - th / 2 - 0.012, head.mouthZ - back - 0.32 * x * x);
        t.rotation.set(0, -x * 1.3, flip ? Math.PI : 0);
      }
    };
    row(8, 0.475, 0.11, 0.035, false);  // solo l'arcata superiore: il sorriso da pubblicità
    extra.teeth = [teethG];
  }
  if (ex.has('logo')) { // logo sulla calotta del beanie: una striscia che segue la superficie (coste comprese)
    const SEG_U = 80, SEG_V = 16, TH = 0.58, Y0 = 2.06, H = 0.24; // sulla calotta, sopra il risvolto: dall'alto si vede bene
    const pos = [], uv = [], idx = [];
    for (let j = 0; j <= SEG_V; j++) for (let i = 0; i <= SEG_U; i++) {
      const u = i / SEG_U, v = j / SEG_V, th = (u * 2 - 1) * TH, y = Y0 + (v - 0.5) * H;
      const dx = Math.sin(th), dz = Math.cos(th);
      let a = 0.3, b = 1.6; // bisezione lungo il raggio fino alla superficie del beanie
      for (let k = 0; k < 30; k++) { const m = (a + b) / 2; beanie(dx * m, y, dz * m - 0.03) < 0 ? (a = m) : (b = m); }
      const r = a + 0.006;
      pos.push(dx * r, y, dz * r - 0.03);
      uv.push(u, v);
    }
    for (let j = 0; j < SEG_V; j++) for (let i = 0; i < SEG_U; i++) {
      const a = j * (SEG_U + 1) + i, b = a + 1, c = a + SEG_U + 1, d = c + 1;
      idx.push(a, b, d, a, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    add(g, M.logo);
  }
  if (ex.has('strings')) for (const s of [-1, 1]) { // cordini della felpa
    add(tube([[s * 0.2, -0.36, 0.5], [s * 0.22, -0.55, 0.62], [s * 0.24, -0.85, 0.66]], 0.032, 16), M.string);
    add(new THREE.CapsuleGeometry(0.04, 0.08, 4, 8), M.string).position.set(s * 0.24, -0.9, 0.66);
  }
  if (A.smirk) extra.smirk = add(tubeOn(head.base, range(-0.2, 0.25, 20), A.smirk, 0.024), M.lip);
  for (const [i, b] of (A.brows ?? []).entries()) { // sopracciglia
    const s = i ? 1 : -1;
    const m = add(new THREE.CapsuleGeometry(b.thin ? 0.035 : 0.055, 0.28, 6, 10), M.brow);
    m.rotation.z = Math.PI / 2 + b.rot * s;
    m.position.set(s * 0.36, b.y, frontZ(head.base, s * 0.36, b.y) + 0.02);
  }
  if (ex.has('sunglasses')) {
    const glasses = new THREE.Group(); char.add(glasses);
    const sh = (() => {
      const w = 0.34, h = 0.24, r = 0.14, s = new THREE.Shape();
      s.moveTo(-w + r, -h); s.lineTo(w - r, -h); s.quadraticCurveTo(w, -h, w, -h + r);
      s.lineTo(w, h - r); s.quadraticCurveTo(w, h, w - r, h); s.lineTo(-w + r, h);
      s.quadraticCurveTo(-w, h, -w, h - r); s.lineTo(-w, -h + r); s.quadraticCurveTo(-w, -h, -w + r, -h);
      return s;
    })();
    for (const s of [-1, 1]) {
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 4, curveSegments: 20 });
      g.translate(0, 0, -0.015);
      const lens = add(g, M.lens, glasses);
      lens.position.set(s * 0.37, 1.26, EYE_FRONT + 0.06); lens.rotation.set(-0.06, s * 0.2, 0);
      add(tube([[s * 0.7, 1.33, EYE_FRONT - 0.02], [s * 0.9, 1.33, 0.35], [s * 0.97, 1.3, -0.05]], 0.025, 16), M.gold, glasses);
    }
    add(tube([[-0.66, 1.42, EYE_FRONT + 0.04], [0, 1.47, EYE_FRONT + 0.16], [0.66, 1.42, EYE_FRONT + 0.04]], 0.03, 32), M.gold, glasses);
    extra.fly.push(glasses);
  }
  if (ex.has('roundGlasses')) { // occhialini tondi d'oro, sottili: gli occhi socchiusi restano visibili
    const glasses = new THREE.Group(); char.add(glasses);
    for (const s of [-1, 1]) {
      const ring = add(new THREE.TorusGeometry(0.27, 0.022, 10, 40), M.gold, glasses);
      ring.position.set(s * 0.36, 1.25, EYE_FRONT + 0.05); ring.rotation.y = s * 0.2;
      add(tube([[s * 0.62, 1.3, EYE_FRONT - 0.02], [s * 0.88, 1.32, 0.35], [s * 0.97, 1.3, -0.05]], 0.018, 16), M.gold, glasses);
    }
    add(tube([[-0.1, 1.3, EYE_FRONT + 0.1], [0, 1.34, EYE_FRONT + 0.14], [0.1, 1.3, EYE_FRONT + 0.1]], 0.02, 12), M.gold, glasses);
    extra.fly.push(glasses);
  }
  if (ex.has('chain')) { // catena d'oro a grani appoggiata sulla maglia, chiusa davanti
    const BEADS = 56;
    for (let i = 0; i < BEADS; i++) {
      const th = (i / BEADS) * Math.PI * 2, front = Math.max(Math.cos(th), 0);
      const y = -0.36 - 0.12 * front ** 2, dx = Math.sin(th), dz = Math.cos(th);
      let r = 1.3;
      while (r > 0.3 && torso(dx * r, y, dz * r - 0.04) > 0) r -= 0.005;
      add(new THREE.SphereGeometry(0.05, 10, 6), M.gold).position.set(dx * (r + 0.035), y, dz * (r + 0.035) - 0.04);
    }
  }
  if (ex.has('hoops')) for (const s of [-1, 1]) { // cerchi d'oro ai lobi
    const hoop = add(new THREE.TorusGeometry(0.1, 0.022, 8, 28), M.gold);
    hoop.position.set(s * 1.0, 0.5, 0.0); hoop.rotation.y = Math.PI / 2;
  }
  if (ex.has('headset')) { // microfono ad archetto dall'orecchio destro alla bocca
    const end = [0.36, 0.5, head.mouthZ + 0.07];
    const headset = new THREE.Group(); char.add(headset);
    add(tube([[1.0, 1.45, -0.05], [1.06, 1.05, 0.0], [0.95, 0.62, 0.32], [0.6, 0.48, 0.62], end], 0.022, 40), M.plastic, headset);
    add(new THREE.SphereGeometry(0.11, 16, 10), M.plastic, headset).position.set(1.0, 1.05, -0.02); // auricolare
    const mic = add(new THREE.CapsuleGeometry(0.045, 0.07, 4, 10), M.plastic, headset);
    mic.position.set(...end); mic.rotation.z = Math.PI / 2;
    extra.fly.push(headset);
  }

  // luce precalcolata per le parti rigide (una volta per personaggio; stesso ordine a ogni istanza)
  for (const f of extra.fly) f.traverse((o) => { if (o.isMesh) o.userData.moving = true; });
  char.updateMatrixWorld(true);
  const first = !kit.rigid;
  kit.rigid ??= [];
  let n = 0;
  const staticAndEyes = (x, y, z) => Math.min(kit.staticSDF(x, y, z), eyesSDF(x, y, z) + 0.02);
  char.traverse((o) => {
    if (!o.isMesh || o.geometry.attributes.bake) return;
    if (first) kit.rigid.push(o.userData.moving ? constBake(o.geometry, 0.92, 1) : bake(o.geometry, staticAndEyes, kit.L, o.matrixWorld));
    else o.geometry = kit.rigid[n];
    n++;
  });
  for (const f of extra.fly) f.userData.p0 = f.position.clone();

  // ---- espressioni ----
  // hurt: grit = rookie, occhi strizzati e denti stretti · O = bocca a "O" · open = il sorriso finto si apre
  const face = { ...A.face, scared: 0, blink: 0, fly: 0 };
  function applyFace() {
    const s = face.scared, hurt = A.hurt;
    eyes.forEach((e) => {
      const lid = hurt === 'grit' ? lerp(face.lid, 0.88, s) : lerp(face.lid, 0.0, s);
      e.setLid(lerp(lid, 1, face.blink * (1 - s)));
      e.setPupil(lerp(face.elev, 0, s), lerp(face.look, 0, s), lerp(face.pupil, 0.8, s));
    });
    const o = hurt === 'O' ? s : 0;
    mouthO.visible = o > 0.02;
    mouthO.scale.setScalar(Math.max(o, 0.001));
    if (extra.smirk) extra.smirk.visible = o < 0.5;
    if (extra.tongue) extra.tongue.visible = s < 0.5;
    if (extra.teeth) extra.teeth.forEach((t) => { t.visible = hurt !== 'open' || s < 0.5; });
    for (const [i, g] of extra.fly.entries()) {
      const f = face.fly, dir = i % 2 ? -1 : 1;
      g.visible = f < 1;
      g.position.set(g.userData.p0.x + 0.6 * f * dir, g.userData.p0.y + 2.2 * f - 2.6 * f * f, g.userData.p0.z + 0.8 * f);
      g.rotation.set(-1.4 * f, 0, -2.2 * f * dir);
    }
  }
  applyFace();
  return { char, face, applyFace, type, group: A.group };
}

export { ARCH };
