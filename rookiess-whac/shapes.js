// Forme dei personaggi (solo matematica, nessun materiale): la usano sia il worker che mette
// in mesh le SDF, sia il thread principale che appoggia le parti rigide sulle superfici.
//
// Regola di lettura, valida per tutto il cast:
//   rookie = beanie crema, felpa chiara, materiali opachi, occhi aperti, sorriso   → non colpire
//   guru   = capelli scuri lucidi, oro, abiti scuri, sguardo superiore            → colpisci
import { smin, smax, ellipsoid, capsule, roundRect2 } from './sdf.js';

export const DEG = Math.PI / 180;
export const lerp = (a, b, t) => a + (b - a) * t;
export const sstep = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };

// punto della superficie davanti a (x, y): bisezione lungo z
export function frontZ(f, x, y) {
  let a = 0, b = 2;
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2; f(x, y, m) < 0 ? (a = m) : (b = m); }
  return a;
}

// ---------- testa (spazio personaggio: mento a y=0, faccia verso +z) ----------
export const EAR = { x: 0.9, y: 1.0, z: -0.05, yaw: 0.3 };
export const EYE = { x: 0.34, y: 1.24, R: 0.31, scale: [1.0, 0.82, 0.78] };

function ear(x, y, z, side) {
  const a = -side * EAR.yaw, c = Math.cos(a), s = Math.sin(a);
  const dx = x - side * EAR.x, dy = y - EAR.y, dz = z - EAR.z;
  const lx = c * dx + s * dz, lz = -s * dx + c * dz;
  let d = ellipsoid(lx - side * 0.13, dy, lz, 0.13, 0.42, 0.3);                          // padiglione
  d = smax(d, -ellipsoid(lx - side * 0.26, dy + 0.03, lz - 0.03, 0.09, 0.28, 0.19), 0.04); // conca
  return d;
}

// o: jaw (larghezza mascella), nose (raggio), smile ({ w, h } cavità a "D") o null
export function makeHead(o = {}) {
  const jaw = o.jaw ?? 0.95, noseR = o.nose ?? 0.22;
  const core = (x, y, z) => smin(ellipsoid(x, y - 1.25, z, 0.93, 1.0, 0.85), ellipsoid(x, y - 0.55, z - 0.04, jaw, 0.62, 0.82), 0.35);
  const noseZ = frontZ(core, 0, 0.9) + 0.03;
  const base = (x, y, z) => {
    let d = core(x, y, z);
    d = smin(d, capsule(x, y, z, 0, -1.6, -0.05, 0, 0.4, -0.1, 0.47), 0.22);           // collo raccordato al mento
    d = smin(d, ellipsoid(x, y - 0.9, z - noseZ, noseR, noseR * 0.95, noseR * 0.9), 0.06); // naso
    d = smin(d, ear(x, y, z, 1), 0.1);
    return smin(d, ear(x, y, z, -1), 0.1);
  };
  const mouthZ = frontZ(core, 0, 0.5);
  const cav = o.smile && ((x, y, z) => Math.max(ellipsoid(x, y - 0.53, z - (mouthZ - 0.02), o.smile.w, o.smile.h, 0.15), y - 0.54));
  const skin = cav ? (x, y, z) => smax(base(x, y, z), -cav(x, y, z), 0.03) : base;
  return { core, base, skin, cav, mouthZ };
}

const DEFAULT_HEAD = makeHead();
export const EYE_Z = frontZ(DEFAULT_HEAD.base, EYE.x, EYE.y) - 0.1;
export const EYE_FRONT = EYE_Z + EYE.R * EYE.scale[2];
export const eyesSDF = (x, y, z) => Math.min(
  ellipsoid(x - EYE.x, y - EYE.y, z - EYE_Z, EYE.R * 1.05, EYE.R * 0.86, EYE.R * 0.82),
  ellipsoid(x + EYE.x, y - EYE.y, z - EYE_Z, EYE.R * 1.05, EYE.R * 0.86, EYE.R * 0.82));

// ---------- copricapi e capelli ----------
function beanie(x, y, z) {
  let crown = ellipsoid(x, y - 1.6, z + 0.03, 1.0, 1.0, 0.94);
  crown = smax(crown, 1.58 - y, 0.05);
  const rr = Math.hypot(x, (z + 0.03) / 0.93);
  const cuff = roundRect2(rr - 1.0, y - 1.7, 0.095, 0.19, 0.085) * 0.93;     // risvolto
  const d = smin(crown, cuff, 0.035);
  const ang = Math.atan2(x, z + 0.03);                                         // coste verticali
  const amp = (y < 1.9 ? 0.016 : 0.009) * sstep(0.25, 0.7, rr);
  return d + amp * Math.cos(ang * 44);
}

// ricci voluminosi che escono dal beanie ai lati e dietro (Amara)
function curls(x, y, z) {
  let d = ellipsoid(x, y - 1.15, z + 0.32, 1.22, 1.0, 0.98);
  d = smax(d, z - 0.18, 0.12);            // la faccia resta libera
  d = smax(d, 0.15 - y, 0.12);            // lunghezza: fino alle spalle
  return d - 0.045 * Math.sin(x * 11) * Math.sin(y * 11 + 1) * Math.sin(z * 11 + 2); // boccoli
}

// caschetto dritto sotto il beanie (Mei)
function bob(x, y, z) {
  let d = ellipsoid(x, y - 1.2, z + 0.04, 1.07, 1.13, 0.98);
  d = smax(d, 0.42 - y, 0.04);                                  // taglio netto all'altezza della mascella
  const face = Math.max(0.2 - z, Math.abs(x) - 0.74);           // finestra della faccia
  d = smax(d, -face, 0.07);
  return d + 0.006 * Math.cos(Math.atan2(x, z) * 60) * sstep(1.3, 0.6, y); // ciocche verticali
}

// gel con ciuffo (Crypto Bro)
function quiff(x, y, z) {
  let d = ellipsoid(x, y - 1.27, z + 0.01, 0.99, 1.07, 0.92);
  d = smax(d, 1.56 + 0.3 * z - y, 0.05);
  d = smin(d, ellipsoid(x - 0.12, y - 2.17, z - 0.46, 0.62, 0.36, 0.5), 0.24);
  return d + 0.006 * Math.cos(x * 18 + z * 3) * sstep(1.8, 2.05, y);
}

// pettinati all'indietro, stempiato (Thought Leader)
function sweptBack(x, y, z) {
  let d = ellipsoid(x, y - 1.3, z + 0.03, 0.98, 1.06, 0.92);
  const temples = 0.16 * sstep(0.25, 0.6, Math.abs(x)) * sstep(0.0, 0.6, z);
  d = smax(d, 1.68 + 0.28 * z + temples - y, 0.05);
  d = smin(d, ellipsoid(x, y - 1.95, z - 0.1, 0.8, 0.42, 0.78), 0.2); // volume sopra
  return d + 0.006 * Math.cos(x * 24) * sstep(1.75, 2.0, y);           // solchi del pettine all'indietro
}

// tirati e lucidi con chignon alto (LinkedIn Coach)
function bun(x, y, z) {
  let d = ellipsoid(x, y - 1.28, z + 0.02, 0.985, 1.06, 0.91);
  d = smax(d, 1.6 + 0.26 * z - y, 0.05);
  d = smin(d, ellipsoid(x, y - 2.38, z + 0.32, 0.4, 0.36, 0.4), 0.14);
  return d + 0.005 * Math.cos(Math.atan2(x, z + 0.3) * 30) * sstep(2.1, 2.3, y);
}

// ---------- busti ----------
export function torso(x, y, z) {
  let d = capsule(x, y, z / 0.8, 0, -1.15, 0, 0, -5, 0, 0.98) * 0.8;
  const neckHole = Math.max(Math.hypot(x, z + 0.06) - 0.5, -0.65 - y);
  d = smax(d, -neckHole, 0.05);
  const rr = Math.hypot(x, (z + 0.06) / 0.94);
  return smin(d, Math.hypot(rr - 0.55, y + 0.31) - 0.085, 0.06);            // colletto
}
const hoodie = (x, y, z) => smin(torso(x, y, z), ellipsoid(x, y + 0.36, z + 0.5, 0.8, 0.3, 0.38), 0.14); // cappuccio arrotolato
function turtleneck(x, y, z) {
  const collar = roundRect2(Math.hypot(x, (z + 0.06) / 0.95) - 0.56, y + 0.12, 0.085, 0.24, 0.07);
  return smin(torso(x, y, z), collar + 0.008 * Math.sin(y * 42), 0.08);     // collo alto a coste morbide
}
function blazer(x, y, z) {
  // revers: due creste a V sul petto
  let d = torso(x, y, z);
  for (const s of [-1, 1]) d = smin(d, capsule(x, y, z, s * 0.42, -0.45, 0.5, s * 0.2, -1.1, 0.72, 0.06), 0.06);
  return d;
}

// ---------- colori per vertice (tint.x = colore "blush" del materiale, tint.y = interno bocca) ----------
function tintFor(o, head) {
  return (x, y, z) => {
    let a = 0, b = 0;
    if (o.blush) for (const s of [-1, 1]) a += Math.exp(-(((x - s * 0.56) / 0.2) ** 2 + ((y - 0.72) / 0.15) ** 2)) * (z > 0.3 ? o.blush : 0);
    if (head.cav) {
      const inside = sstep(-0.004, -0.03, head.core(x, y, z)) * (y < 0.6 ? 1 : 0);
      b = inside;
      if (o.lips) { // labbra: anello sottile attorno alla cavità, fuori dalla testa
        const c = head.cav(x, y, z);
        a = Math.max(a, (1 - inside) * sstep(0.07, 0.025, c) * (z > 0.4 ? o.lips : 0));
      }
    }
    if (o.beard) a = Math.max(a, o.beard * sstep(0.7, 0.56, y) * sstep(-0.18, 0.06, y) * sstep(-0.35, -0.05, z) * (1 - b));
    return [Math.min(a, 1), b];
  };
}
// camicia bianca nella V del blazer
const shirtV = (x, y, z) => [z > 0.2 && y > -1.1 && Math.abs(x) < 0.1 + 0.42 * (y + 1.1) ? 1 : 0, 0];

// ---------- cast ----------
const box = (a, b) => [a, b];
const HEAD_BOX = box([-1.35, -1.25, -1.0], [1.35, 2.35, 1.15]);
const TORSO_BOX = box([-1.15, -2.7, -1.05], [1.15, 0.0, 0.98]);

function arch(def) {
  const head = makeHead(def.head);
  const parts = [
    { name: 'skin', f: head.skin, box: HEAD_BOX, h: 0.026, mat: 'skin', clip: -1.2, tint: tintFor(def.tint ?? {}, head) },
    ...def.parts,
  ];
  return { ...def, headShape: head, parts };
}

export const ARCH = {
  leo: arch({
    group: 'rookie', label: 'Leo',
    head: { smile: { w: 0.27, h: 0.19 } }, tint: { blush: 0.45 },
    colors: { skin: 0xeea397, lip: 0xb8655c, blush: 0xff7f7a, clothes: 0xdde1e8, string: 0xf6f6f4 },
    parts: [
      { name: 'beanie', f: beanie, box: box([-1.2, 1.35, -1.15], [1.2, 2.7, 1.1]), h: 0.022, mat: 'beanie' },
      { name: 'hoodie', f: hoodie, box: TORSO_BOX, h: 0.035, mat: 'clothes', clip: -2.65 },
    ],
    face: { lid: 0.2, look: 0, elev: 7 * DEG, pupil: 1.12 },
    extras: ['smile', 'strings'], hurt: 'grit',
  }),
  amara: arch({
    group: 'rookie', label: 'Amara',
    head: { jaw: 0.88, nose: 0.2, smile: { w: 0.3, h: 0.22 } }, tint: { blush: 0.3, lips: 0.85 },
    colors: { skin: 0x8a5236, lip: 0x6e3226, blush: 0xb4524a, clothes: 0xe7ddf6, string: 0xffffff, hair: 0x2a1a14 },
    parts: [
      { name: 'hair', f: curls, box: box([-1.5, 0.0, -1.5], [1.5, 2.3, 0.6]), h: 0.03, mat: 'hairMatte' },
      { name: 'beanie', f: beanie, box: box([-1.2, 1.35, -1.15], [1.2, 2.7, 1.1]), h: 0.022, mat: 'beanie' },
      { name: 'hoodie', f: hoodie, box: TORSO_BOX, h: 0.035, mat: 'clothes', clip: -2.65 },
    ],
    face: { lid: 0.16, look: -6 * DEG, elev: 8 * DEG, pupil: 1.15 },
    extras: ['smile', 'strings', 'lashes'], hurt: 'grit',
  }),
  mei: arch({
    group: 'rookie', label: 'Mei',
    head: { jaw: 0.86, nose: 0.18, smile: { w: 0.22, h: 0.15 } }, tint: { blush: 0.5, lips: 0.6 },
    colors: { skin: 0xf3c9a6, lip: 0xc0706a, blush: 0xf28a86, clothes: 0xd6efe4, string: 0xffffff, hair: 0x17141a },
    parts: [
      { name: 'hair', f: bob, box: box([-1.25, 0.2, -1.15], [1.25, 2.45, 1.05]), h: 0.026, mat: 'hairMatte' },
      { name: 'beanie', f: beanie, box: box([-1.2, 1.35, -1.15], [1.2, 2.7, 1.1]), h: 0.022, mat: 'beanie' },
      { name: 'hoodie', f: hoodie, box: TORSO_BOX, h: 0.035, mat: 'clothes', clip: -2.65 },
    ],
    face: { lid: 0.22, look: 6 * DEG, elev: 6 * DEG, pupil: 1.1 },
    extras: ['smile', 'strings', 'lashes'], hurt: 'grit',
  }),
  crypto: arch({
    group: 'guru', label: 'Crypto Bro',
    colors: { skin: 0xec9466, lip: 0xa9553f, clothes: 0x26262a, hair: 0x2b1d16 },
    skinGloss: true,
    parts: [
      { name: 'hair', f: quiff, box: box([-1.15, 1.15, -1.05], [1.15, 2.6, 1.1]), h: 0.022, mat: 'hairGloss' },
      { name: 'tee', f: torso, box: TORSO_BOX, h: 0.035, mat: 'clothes', clip: -2.65 },
    ],
    face: { lid: 0.32, look: 8 * DEG, elev: 4 * DEG, pupil: 1 },
    brows: [{ y: 1.6, rot: -0.05 }, { y: 1.68, rot: 0.28 }],
    smirk: (x) => 0.45 + 0.08 * sstep(-0.02, 0.25, x) - 0.012 * (x < 0 ? (x / 0.2) ** 2 : 0),
    extras: ['sunglasses', 'chain'], hurt: 'O',
  }),
  thought: arch({
    group: 'guru', label: 'Thought Leader',
    head: { jaw: 0.97, nose: 0.23 }, tint: { beard: 0.85 },
    colors: { skin: 0xa8694a, lip: 0x6f3a2a, blush: 0x2a211d, clothes: 0x1d1d21, hair: 0x48443f },
    skinGloss: true,
    parts: [
      { name: 'hair', f: sweptBack, box: box([-1.15, 1.2, -1.05], [1.15, 2.5, 1.1]), h: 0.022, mat: 'hairGloss' },
      { name: 'turtleneck', f: turtleneck, box: box([-1.15, -2.7, -1.05], [1.15, 0.3, 0.98]), h: 0.032, mat: 'clothes', clip: -2.65 },
    ],
    face: { lid: 0.44, look: 10 * DEG, elev: 2 * DEG, pupil: 0.95 },
    brows: [{ y: 1.6, rot: -0.08 }, { y: 1.74, rot: 0.38 }],
    smirk: (x) => 0.46 + 0.035 * sstep(0.05, 0.25, x),
    extras: ['roundGlasses'], hurt: 'O',
  }),
  coach: arch({
    group: 'guru', label: 'LinkedIn Coach',
    head: { jaw: 0.87, nose: 0.19, smile: { w: 0.36, h: 0.17 } }, tint: { lips: 1 },
    colors: { skin: 0xd9946e, lip: 0x9e2232, blush: 0xc4182e, clothes: 0x1b1b20, shirt: 0xf4f4f2, hair: 0x120f12 },
    skinGloss: true,
    parts: [
      { name: 'hair', f: bun, box: box([-1.15, 1.2, -1.05], [1.15, 2.8, 1.05]), h: 0.022, mat: 'hairGloss' },
      { name: 'blazer', f: blazer, box: TORSO_BOX, h: 0.035, mat: 'clothes', clip: -2.65, tint: shirtV },
    ],
    face: { lid: 0.24, look: -6 * DEG, elev: 4 * DEG, pupil: 1 },
    brows: [{ y: 1.66, rot: -0.18, thin: true }, { y: 1.66, rot: 0.18, thin: true }],
    extras: ['veneers', 'headset', 'hoops', 'lashes'], hurt: 'open',
  }),
};
export const GROUPS = { rookie: ['leo', 'amara', 'mei'], guru: ['crypto', 'thought', 'coach'] };
