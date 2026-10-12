// Martello 3D come cursore sul gioco: una seconda scena, disegnata sopra la principale con una
// camera ortografica in pixel, così il martello è sempre davanti e non entra nei personaggi.
// Segue il mouse con un po' di ritardo e si inclina nella direzione del movimento; al clic colpisce.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { clay, constBake, KEY_VIEW } from './personaggio.js';

const REST = 0.62, HIT = 1.42; // rotazione attorno all'impugnatura: alzato / sul colpo (radianti)

export function createHammer(renderer, envTex) {
  const scene = new THREE.Scene();
  scene.environment = envTex;
  scene.environmentIntensity = 0.55;
  const key = new THREE.DirectionalLight(0xfff3ea, 2.2);
  key.position.copy(KEY_VIEW).multiplyScalar(10);
  scene.add(key, new THREE.HemisphereLight(0xffffff, 0x2a40ff, 0.5));
  const cam = new THREE.OrthographicCamera(0, 1, 0, -1, -1000, 1000);

  // modello (unità: lunghezza del manico ≈ 1); l'impugnatura è nell'origine
  const steel = clay(0x4b4b4f, { roughness: 0.62, sheen: 0.4, sheenColor: 0x9aa0b0, rimK: 0.12 });
  const wood = clay(0xc8652a, { roughness: 0.55, sheen: 0.5, sheenColor: 0xffc49a, sss: 0x7a2a00, rimK: 0.08 });
  // qui non c'è un tavolo: niente sfumatura "dentro il buco" (lo shader la applica sotto y = uBoardY)
  for (const m of [steel, wood]) m.userData.u.uBoardY.value = -1e9;
  const handle = new THREE.Mesh(constBake(new THREE.CapsuleGeometry(0.085, 0.82, 8, 20), 1, 1), wood);
  handle.position.y = 0.45;
  const head = new THREE.Mesh(constBake(new RoundedBoxGeometry(0.62, 0.34, 0.34, 6, 0.07), 1, 1), steel);
  head.position.y = 0.98;
  const STRIKE = new THREE.Vector3(-0.31, 0.98, 0); // centro della faccia che colpisce
  const swing = new THREE.Group(); swing.add(handle, head);
  const tilt = new THREE.Group(); tilt.add(swing);
  tilt.rotation.set(-0.35, 0.45, 0); // un po' di tre quarti, come nell'immagine di riferimento
  const root = new THREE.Group(); root.add(tilt);
  root.visible = false;
  scene.add(root);

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w = 1, h = 1, size = 80;
  const target = new THREE.Vector2(), pos = new THREE.Vector2(), vel = new THREE.Vector2();
  let swingT = -1, lean = 0;

  // dove deve stare l'impugnatura perché, sul colpo, la faccia del martello sia sotto il mouse
  const hitOffset = new THREE.Vector3();
  function updateOffset() {
    const sw = new THREE.Object3D(); sw.rotation.z = HIT;
    const tl = new THREE.Object3D(); tl.rotation.copy(tilt.rotation); tl.add(sw);
    tl.updateMatrixWorld(true);
    hitOffset.copy(STRIKE).applyMatrix4(sw.matrixWorld).multiplyScalar(size);
  }

  return {
    resize(cw, ch) {
      w = cw; h = ch;
      cam.left = 0; cam.right = w; cam.top = 0; cam.bottom = -h; cam.updateProjectionMatrix();
      size = Math.max(60, Math.min(130, w * 0.09)); // proporzionato al gioco
      root.scale.setScalar(size);
      updateOffset();
    },
    move(x, y) { target.set(x, y); if (!root.visible) pos.copy(target); },
    show(v) { root.visible = v; },
    hit() { swingT = 0; },
    get visible() { return root.visible; },
    update(dt) {
      if (!root.visible) return;
      // inseguimento morbido del mouse + inclinazione nella direzione del movimento
      const k = reduce ? 1 : 1 - Math.exp(-dt / 45);
      vel.set(target.x - pos.x, target.y - pos.y);
      pos.lerp(target, k);
      lean += ((reduce ? 0 : THREE.MathUtils.clamp(vel.x * 0.006, -0.35, 0.35)) - lean) * Math.min(dt / 90, 1);

      // colpo: giù veloce, piccola pausa, ritorno con rimbalzo
      let a = REST;
      if (swingT >= 0) {
        swingT += dt;
        const t = swingT;
        if (reduce) a = t < 120 ? HIT : REST;
        else if (t < 70) a = REST + (HIT - REST) * (t / 70) ** 2;
        else if (t < 110) a = HIT;
        else if (t < 360) { const u = (t - 110) / 250, c = 1.7; a = HIT + (REST - HIT) * (1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2); }
        else swingT = -1;
      }
      swing.rotation.z = a + lean;
      root.position.set(pos.x - hitOffset.x, -pos.y - hitOffset.y, 0);
    },
    render() {
      if (!root.visible) return;
      const ac = renderer.autoClear;
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(scene, cam);
      renderer.autoClear = ac;
    },
  };
}
