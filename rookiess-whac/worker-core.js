// Lavoro del worker, separato perché il thread principale possa usarlo come ripiego.
import { meshSDF, bake, openEdges } from './sdf.js';
import { ARCH, eyesSDF } from './shapes.js';
import { Vector3 } from 'three';

// restituisce { msg, transfer }: msg = { type, parts: { nome: array… }, stats }
export function buildArrays(type, L, quality = 1) {
  const A = ARCH[type];
  const t0 = performance.now();
  const geos = {};
  for (const p of A.parts) {
    const g = meshSDF(p.f, [new Vector3(...p.box[0]), new Vector3(...p.box[1])], p.h / quality);
    if (p.tint) {
      const pos = g.attributes.position, t = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) {
        const [a, b] = p.tint(pos.getX(i), pos.getY(i), pos.getZ(i));
        t[i * 2] = a; t[i * 2 + 1] = b;
      }
      g.userData.tint = t;
    }
    geos[p.name] = g;
  }
  const tMesh = performance.now();
  const scene = (x, y, z) => { let d = eyesSDF(x, y, z); for (const p of A.parts) d = Math.min(d, p.f(x, y, z)); return d; };
  const Lv = new Vector3(...L);
  for (const g of Object.values(geos)) bake(g, scene, Lv);

  const parts = {}, transfer = [];
  for (const p of A.parts) {
    const g = geos[p.name];
    const o = {
      position: g.attributes.position.array, normal: g.attributes.normal.array,
      index: g.index.array, bake: g.attributes.bake.array, tint: g.userData.tint ?? null,
      open: openEdges(g, p.clip ?? -Infinity),
    };
    parts[p.name] = o;
    for (const k of ['position', 'normal', 'index', 'bake', 'tint']) if (o[k]) transfer.push(o[k].buffer);
  }
  return { msg: { type, parts, stats: { meshMs: Math.round(tMesh - t0), bakeMs: Math.round(performance.now() - tMesh) } }, transfer };
}
