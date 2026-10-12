// Camera della hero, ricavata dal design Figma (Proposals-Archive, nodo 1341:8409, 1280×832)
// con un fit sulle 10 ellissi dei buchi: errore medio 0,6 px.
// Unità: 1 = distanza orizzontale fra i centri di due buchi della stessa fila.
export const HERO = {
  frame: { w: 1280, h: 832 },
  elevationDeg: 37.7,     // camera guarda il piano dall'alto di ~38°
  distance: 7.9,          // dal punto mirato
  fovYDeg: 36.1,
  target: [0, 0, -0.34],  // punto mirato sul piano dei buchi
  viewShiftPx: 184,       // il tavolo sta 184 px sotto il centro del frame (lens shift)
  rowDepth: 0.734,        // distanza in profondità fra le file (non esagonale: 0,866)
  holeInnerR: 0.228,      // raggio del buco scuro
  rows: [                 // x dei centri per fila, z = indice fila × rowDepth
    { z: -1, xs: [-1, 0, 1] },
    { z: 0, xs: [-1.5, -0.5, 0.5, 1.5] },
    { z: 1, xs: [-1, 0, 1] },
  ],
};
