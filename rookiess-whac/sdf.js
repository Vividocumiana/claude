// SDF per i personaggi clay: primitive, unione morbida, mesh (surface nets)
// con normali dal gradiente, e luce precalcolata (AO + ombra morbida) per vertice.
import * as THREE from 'three';

// ---------- operatori ----------
export const smin = (a, b, k) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};
export const smax = (a, b, k) => -smin(-a, -b, k);

// ---------- primitive (p = [x, y, z]) ----------
export function ellipsoid(px, py, pz, rx, ry, rz) {
  const k0 = Math.hypot(px / rx, py / ry, pz / rz);
  const k1 = Math.hypot(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
  return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
}
export function capsule(px, py, pz, ax, ay, az, bx, by, bz, r) {
  const pax = px - ax, pay = py - ay, paz = pz - az;
  const bax = bx - ax, bay = by - ay, baz = bz - az;
  const h = Math.min(Math.max((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0), 1);
  return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - r;
}
export function roundRect2(qx, qy, hx, hy, r) {
  const dx = Math.abs(qx) - hx + r, dy = Math.abs(qy) - hy + r;
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r;
}

// ---------- mesh: surface nets ----------
// f(x,y,z) -> distanza; box = [min, max] (Vector3); h = lato cella.
export function meshSDF(f, box, h) {
  const nx = Math.ceil((box[1].x - box[0].x) / h) + 1;
  const ny = Math.ceil((box[1].y - box[0].y) / h) + 1;
  const nz = Math.ceil((box[1].z - box[0].z) / h) + 1;
  const ox = box[0].x, oy = box[0].y, oz = box[0].z;
  const field = new Float32Array(nx * ny * nz);
  const id = (i, j, k) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) field[id(i, j, k)] = f(ox + i * h, oy + j * h, oz + k * h);

  // un vertice per cella che attraversa la superficie
  const vIndex = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const cid = (i, j, k) => i + (nx - 1) * (j + (ny - 1) * k);
  const pos = [];
  const corners = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const v = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++)
    for (let j = 0; j < ny - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        let mask = 0;
        for (let c = 0; c < 8; c++) {
          v[c] = field[id(i + corners[c][0], j + corners[c][1], k + corners[c][2])];
          if (v[c] < 0) mask |= 1 << c;
        }
        if (mask === 0 || mask === 255) continue;
        let sx = 0, sy = 0, sz = 0, n = 0;
        for (const [a, b] of edges) {
          if ((v[a] < 0) === (v[b] < 0)) continue;
          const t = v[a] / (v[a] - v[b]);
          sx += corners[a][0] + t * (corners[b][0] - corners[a][0]);
          sy += corners[a][1] + t * (corners[b][1] - corners[a][1]);
          sz += corners[a][2] + t * (corners[b][2] - corners[a][2]);
          n++;
        }
        vIndex[cid(i, j, k)] = pos.length / 3;
        pos.push(ox + (i + sx / n) * h, oy + (j + sy / n) * h, oz + (k + sz / n) * h);
      }

  // proiezione sulla superficie + normali dal gradiente
  const e = h * 0.25;
  const grad = (x, y, z) => {
    const g = new THREE.Vector3(f(x + e, y, z) - f(x - e, y, z), f(x, y + e, z) - f(x, y - e, z), f(x, y, z + e) - f(x, y, z - e));
    return g.lengthSq() > 0 ? g.normalize() : g.set(0, 1, 0);
  };
  const nrm = new Float32Array(pos.length);
  for (let i = 0; i < pos.length; i += 3) {
    let x = pos[i], y = pos[i + 1], z = pos[i + 2];
    for (let it = 0; it < 2; it++) {
      const d = f(x, y, z), g = grad(x, y, z);
      if (Math.abs(d) > h) break;
      x -= g.x * d; y -= g.y * d; z -= g.z * d;
    }
    pos[i] = x; pos[i + 1] = y; pos[i + 2] = z;
    const g = grad(x, y, z);
    nrm[i] = g.x; nrm[i + 1] = g.y; nrm[i + 2] = g.z;
  }

  // facce: un quad per ogni spigolo della griglia che attraversa la superficie
  const idx = [];
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    flip ? idx.push(a, d, c, a, c, b) : idx.push(a, b, c, a, c, d);
  };
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const inside = field[id(i, j, k)] < 0;
        if (i < nx - 1 && j > 0 && k > 0 && j < ny - 1 && k < nz - 1 && (field[id(i + 1, j, k)] < 0) !== inside)
          quad(vIndex[cid(i, j - 1, k - 1)], vIndex[cid(i, j, k - 1)], vIndex[cid(i, j, k)], vIndex[cid(i, j - 1, k)], !inside);
        if (j < ny - 1 && i > 0 && k > 0 && i < nx - 1 && k < nz - 1 && (field[id(i, j + 1, k)] < 0) !== inside)
          quad(vIndex[cid(i - 1, j, k - 1)], vIndex[cid(i - 1, j, k)], vIndex[cid(i, j, k)], vIndex[cid(i, j, k - 1)], !inside);
        if (k < nz - 1 && i > 0 && j > 0 && i < nx - 1 && j < ny - 1 && (field[id(i, j, k + 1)] < 0) !== inside)
          quad(vIndex[cid(i - 1, j - 1, k)], vIndex[cid(i, j - 1, k)], vIndex[cid(i, j, k)], vIndex[cid(i - 1, j, k)], !inside);
      }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setIndex(idx);
  // orientamento: le facce devono guardare come il gradiente
  orient(geo);
  return geo;
}

function orient(geo) {
  // ogni triangolo deve guardare come il gradiente (normale del vertice)
  const p = geo.attributes.position, n = geo.attributes.normal, ix = geo.index.array;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), fn = new THREE.Vector3(), vn = new THREE.Vector3();
  for (let t = 0; t < ix.length; t += 3) {
    a.fromBufferAttribute(p, ix[t]); b.fromBufferAttribute(p, ix[t + 1]); c.fromBufferAttribute(p, ix[t + 2]);
    fn.subVectors(b, a).cross(c.sub(a));
    vn.fromBufferAttribute(n, ix[t]);
    if (fn.dot(vn) < 0) { const s = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = s; }
  }
}

// bordi aperti (spigoli usati da una sola faccia): deve essere 0 per una superficie chiusa
export function openEdges(geo, clipY = -Infinity) {
  const ix = geo.index.array, p = geo.attributes.position, m = new Map();
  for (let t = 0; t < ix.length; t += 3)
    for (let e = 0; e < 3; e++) {
      const a = ix[t + e], b = ix[t + ((e + 1) % 3)];
      const key = a < b ? a * 1e7 + b : b * 1e7 + a;
      m.set(key, (m.get(key) || 0) + 1);
    }
  let open = 0;
  for (const [key, c] of m) {
    if (c !== 1) continue;
    const a = Math.floor(key / 1e7);
    if (p.getY(a) > clipY) open++;
  }
  return open;
}

// ---------- luce precalcolata ----------
// scene(x,y,z): distanza da tutto il personaggio; L: direzione verso la luce chiave (spazio personaggio).
// Scrive l'attributo 'bake' = (ao, ombra) in [0,1].
export function bake(geo, scene, L, toLocal = null) {
  const p = geo.attributes.position, n = geo.attributes.normal;
  const out = new Float32Array(p.count * 2);
  const P = new THREE.Vector3(), N = new THREE.Vector3();
  const nm = toLocal ? new THREE.Matrix3().getNormalMatrix(toLocal) : null;
  for (let i = 0; i < p.count; i++) {
    P.fromBufferAttribute(p, i); N.fromBufferAttribute(n, i);
    if (toLocal) { P.applyMatrix4(toLocal); N.applyMatrix3(nm).normalize(); }
    // AO: quanto è vicina altra materia lungo la normale
    let occ = 0, w = 1;
    for (let s = 1; s <= 5; s++) {
      const t = 0.05 * s;
      const d = scene(P.x + N.x * t, P.y + N.y * t, P.z + N.z * t);
      occ += w * Math.max(t - d, 0);
      w *= 0.6;
    }
    const ao = Math.min(Math.max(1 - occ * 2.6, 0), 1);
    // ombra morbida verso la luce (solo se la faccia è rivolta alla luce)
    let sh = 1;
    if (N.dot(L) > -0.2) {
      let t = 0.04;
      for (let s = 0; s < 48 && t < 4; s++) {
        const d = scene(P.x + N.x * 0.02 + L.x * t, P.y + N.y * 0.02 + L.y * t, P.z + N.z * 0.02 + L.z * t);
        if (d < 0.001) { sh = 0; break; }
        sh = Math.min(sh, (4 * d) / t);
        t += Math.min(Math.max(d, 0.02), 0.25);
      }
      sh = sh * sh * (3 - 2 * sh);
    }
    out[i * 2] = ao; out[i * 2 + 1] = Math.max(sh, 0);
  }
  geo.setAttribute('bake', new THREE.BufferAttribute(out, 2));
  return geo;
}
