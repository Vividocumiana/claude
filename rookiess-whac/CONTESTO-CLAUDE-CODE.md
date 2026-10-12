# Rookiess — gioco "Hit the Gurus" per la hero: contesto per Claude Code

Questo file serve a chi deve **sviluppare la proposta Rookiess dal design Figma e inserire il gioco nella hero**.
Il gioco è già finito e validato dal cliente (Vivido). Il tuo lavoro è l'integrazione, non il redesign del gioco.

- Branch: `claude/kind-thompson-lxjabx` del repo `vividocumiana/claude`, cartella `rookiess-whac/`
- Prova pubblicata (versione validata): https://claude.ai/artifact/Ee4T4jkHkWpCbRHtnjEMVG
- Design della hero: Figma `Proposals-Archive`, file key `iN2vzdlOw0bTIJYbV3IRnU`, nodo `1341:8409` (frame "Rookiess", 1280×832)
- Sito del cliente: https://rookiess.club/

## Il concetto

Una "acchiappa la talpa" nella hero: dai 10 buchi escono **guru** (da colpire, +10) e **rookie** (da risparmiare, −20).
Il punteggio va nel badge "Your Points" del design. Il claim del brand è "Fuck Gurus, Stay Rookiess".

**Regola di lettura, da non rompere**: il giocatore decide in mezzo secondo su una testa di ~80 px vista dall'alto.
- rookie = **beanie crema col logo Rookiess**, felpa chiara, materiali opachi, occhi aperti, sorriso
- guru = **capelli scuri e lucidi**, oro, abiti scuri, sguardo superiore

Se aggiungi o modifichi personaggi, verifica con il pulsante "Test sfocato" della pagina di prova che si distinguano ancora da sfocati.

## Il cast (in `shapes.js` → `ARCH`)

| id | gruppo | chi | segni distintivi |
|---|---|---|---|
| `leo` | rookie | uomo, pelle chiara | beanie, felpa bianca coi cordini |
| `amara` | rookie | donna nera | ricci lunghi fino alle spalle, ciglia, felpa lilla |
| `mei` | rookie | donna asiatica | caschetto nero, ciglia, felpa menta |
| `crypto` | guru | uomo bianco abbronzato | ciuffo col gel, occhiali da sole, catena d'oro |
| `thought` | guru | uomo sudasiatico | capelli brizzolati all'indietro, barba, occhialini tondi d'oro, dolcevita |
| `coach` | guru | donna latina | chignon, rossetto, sorriso a 32 denti, microfono ad archetto, cerchi d'oro, blazer |

Reazioni al colpo: i rookie strizzano gli occhi e stringono i denti; i guru fanno la "O" (o il sorriso finto si apre) e gli volano via occhiali/microfono.

## Come è fatto (tutto three.js, niente modelli esterni)

| File | Cosa contiene |
|---|---|
| `sdf.js` | primitive SDF, unione morbida, mesh con *surface nets* (normali dal gradiente), conteggio bordi aperti, luce precalcolata per vertice (AO + ombra morbida) |
| `shapes.js` | forme pure dei personaggi (testa parametrica, capelli, copricapi, busti), tinte per vertice (guance, labbra, barba, camicia), il cast `ARCH` e i gruppi `GROUPS` |
| `worker-core.js` / `worker.js` | mettono in mesh le SDF e cuociono la luce **in Web Worker paralleli** |
| `personaggio.js` | materiale "clay" (MeshPhysical + shader iniettato: luce cotta, banda calda sottopelle, fresnel, grana della plasticina, sfumatura nel buco), caricamento dei kit, parti rigide animate (occhi, palpebre, bocca, occhiali, catena, microfono, logo sul beanie) |
| `scena.js` | `mount(canvas, ui)`: camera della hero, tavolo, buchi, personaggi, gioco, effetti |
| `hero-camera.js` | camera **ricavata dal frame Figma** con un fit sulle 10 ellissi dei buchi (errore medio 0,6 px) |
| `cursor-osmo.css` + `cursors/` | cursori custom di Osmo Supply, **CSS da non modificare** (vedi sotto) |
| `logo-rookiess.svg` | logo usato sul beanie (importato come testo) |
| `pagina.html` + `main.js` | **pagina di prova** con viste di debug: NON è la hero finale, usala come riferimento d'uso di `mount` |
| `build.mjs` | impacchetta tutto in `rookiess-clay.html` (un solo file) |

Scelte che contano:
- **Vista fissa**: i personaggi non ruotano mai rispetto alla luce → AO e ombre sono cotte una volta al caricamento. Niente shadow map, niente post-produzione.
- **Inclinazione di 25° verso la camera** e salita lungo il proprio asse inclinato (l'asse passa sempre per il centro del buco).
- **Scala** `S = 0.195`: testa con le orecchie larga quanto il buco. Capelli/accessori nuovi non devono superare quella larghezza.
- Il tavolo è un **occlusore invisibile**: lo sfondo blu lo dà la pagina (CSS), il canvas è trasparente.

## Integrazione nella hero

### 1. Il canvas deve coprire esattamente il frame della hero
La camera riproduce il frame Figma 1280×832 con uno spostamento ottico (`viewShiftPx: 184`, via `camera.setViewOffset`).
Quindi il canvas va posizionato **sopra l'intera hero con le stesse proporzioni 1280:832**, non solo sulla fascia del tavolo, altrimenti i buchi non cadono dove sono nel design.
Nella pagina di prova: `.frame { aspect-ratio: 1280 / 832 }` con canvas e overlay in `position:absolute; inset:0`.

Il canvas è trasparente: dietro serve lo sfondo della hero. Gradiente del design: `#0f1c93` (alto) → `#192ac1` → `#2135e7` (basso).

### 2. Tutto il testo resta HTML sopra il canvas
Titolo, card "Next event", "Hit the Gurus!" e "Your Points" (in Figma sono `text-path` curvi), fascia di sticker "Fuck Gurus".
Posizioni nel frame 1280×832 (da Figma): "Hit the Gurus!" ~ x 226, y 598; "Your Points:" ~ x 951, y 505; "250" ~ x 911, y 545; sticker da y ~760 in giù.
Usa percentuali del frame così restano allineati al gioco a ogni larghezza.

### 3. Chiamare `mount`
```js
import { mount } from './rookiess-whac/scena.js';
const app = mount(canvas, {
  workerSrc,                 // sorgente del worker come stringa (vedi sotto); senza, ripiega sul thread principale
  labels: overlayEl,         // contenitore assoluto sopra il canvas: ci finiscono "+10/−20" e le stelline
  onScore: (score, delta) => { /* aggiorna il badge "Your Points" */ },
  onStats: (stats, done, total) => { /* opzionale: stato di caricamento "done/total" */ },
  // opzionali, solo per debug: mode, debug, blur, fx (pulsanti), quality (1 = default), startMode ('hero')
});
// app.pause(true|false), app.setMode('hero'|'studio'), app.chars, app.kits
```
Le classi CSS che servono nell'overlay sono in `pagina.html`: `.pop-label`, `.pop-label.bad`, `.burst`, `.burst i`, `.burst.bad i` e le keyframes `rise`/`pop`. Copiale.

### 4. Il worker
`build.mjs` impacchetta `worker.js` a parte (esbuild, iife) e lo mette in `<script type="text/plain" id="worker-src">`; `main.js` lo passa a `mount`, che crea i Worker da un **Blob URL**.
Nel tuo stack puoi fare lo stesso oppure usare il bundler (`new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })` adattando `loadKits` in `personaggio.js`).
Se il sito ha una CSP, serve `worker-src blob:` (o `'self'`).

### 5. Cursori (Osmo Supply)
- `cursor-osmo.css` è il CSS fornito da Osmo: **non modificarlo, non rinominare gli attributi `data-cursor`**.
- Sul sito vero gli URL del CDN Webflow funzionano così come sono. Solo nella pagina di prova (Artifact, CDN bloccato) `build.mjs` li sostituisce con data URI dagli SVG in `cursors/`.
- Il canvas del gioco ha `data-cursor="pointer"` (manina). Il cliente ha **scartato** il martello 3D come cursore: non reintrodurlo.

### 6. Dipendenze e build
three `0.180.0`, esbuild `0.25.10` (non sono nel repo).
```bash
npm i three@0.180.0 esbuild@0.25.10           # in una cartella di tool
NODE_PATH=<tool>/node_modules ESBUILD=<tool>/node_modules/.bin/esbuild HERO_B64=<png in base64, opzionale> node rookiess-whac/build.mjs
```
`build.mjs` usa `--loader:.svg=text` (il logo è importato come stringa).

## Da fare in integrazione (non ancora fatto)

1. **Caricamento**: i 6 personaggi arrivano dai worker in qualche secondo. Serve uno stato di attesa curato (es. buchi vuoti + "Preparo i personaggi…") e far partire il gioco quando c'è almeno un guru e un rookie (oggi parte da solo appena il primo è pronto).
2. **Blocchi del thread principale** rimasti: ~0,7–1,2 s all'avvio (parsing + compilazione shader) e 0,1–0,6 s all'arrivo di ogni personaggio (luce cotta delle parti rigide in `buildCharacter`). Rimedi: spostare anche quella cottura nel worker; `renderer.compileAsync(scene, camera)` prima di mostrare i personaggi.
3. **Pausa fuori schermo**: il loop gira sempre; aggiungi un `IntersectionObserver` sulla hero che chiama `app.pause(true/false)` e ferma anche il rendering.
4. **Mobile**: il framing è quello desktop 1280×832. In verticale il tavolo diventa piccolo: serve una decisione di design (crop del frame, camera dedicata o tavolo ridotto). Il tocco funziona già (`pointerdown`).
5. **Punteggio**: oggi può andare sotto zero; il badge "Your Points" del design è curvo (text-path) e va collegato a `onScore`.
6. **Accessibilità**: `prefers-reduced-motion` è già rispettato (niente rimbalzi, ondeggi, stelline). Dai al canvas un `aria-label` e una descrizione testuale del gioco; il gioco è decorativo, il contenuto della hero deve restare leggibile senza.

## Come verificare (metodo usato finora)
- `openEdges` nei kit: ogni superficie SDF deve avere **0 bordi aperti** (la pagina di prova li mostra in basso a sinistra).
- Screenshot con Playwright + Chromium (`/opt/pw-browsers/chromium`, flag `--use-angle=swiftshader`), clic veri del mouse proiettando la testa del personaggio in coordinate schermo.
- Overlay del PNG Figma (slider "Figma" nella pagina di prova) per controllare che il tavolo coincida al pixel.
- "Test sfocato" per la leggibilità rookie/guru.
