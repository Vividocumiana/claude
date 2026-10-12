// Worker: mette in mesh le SDF di un personaggio e precalcola la luce, fuori dal thread principale.
// Riceve { type, L, quality }, restituisce gli array delle geometrie (trasferiti, non copiati).
import { buildArrays } from './worker-core.js';

self.onmessage = (e) => {
  const { msg, transfer } = buildArrays(e.data.type, e.data.L, e.data.quality);
  self.postMessage(msg, transfer);
};
