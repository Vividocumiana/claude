# Prompt per la sessione che sviluppa la proposta Rookiess

> Copia tutto quello che segue (dalla riga "Ciao" fino alla fine, appendici comprese) come primo messaggio della nuova sessione Claude Code.

---

Ciao. Devi sviluppare la **proposta web per Rookiess** (https://rookiess.club/) partendo dal design Figma, e inserire nella hero un gioco three.js che è già finito e validato.

## Fonti

- **Figma**: https://www.figma.com/design/iN2vzdlOw0bTIJYbV3IRnU/Proposals-Archive?node-id=1341-8409 (file key `iN2vzdlOw0bTIJYbV3IRnU`, nodo `1341:8409`, frame "Rookiess" 1280×832). Leggilo con il Figma MCP (`get_design_context`, `get_screenshot`, `get_metadata`), carica prima la skill di design-to-code se è disponibile, e scarica gli asset (logo, immagine della card evento, sticker "Fuck Gurus").
- **Gioco**: repo `vividocumiana/claude`, branch `claude/kind-thompson-lxjabx`, cartella `rookiess-whac/`. **Leggi per prima cosa `rookiess-whac/CONTESTO-CLAUDE-CODE.md`**: spiega architettura, API (`mount(canvas, ui)`), vincoli (il canvas deve coprire l'intera hero in proporzione 1280:832, il testo resta HTML sopra) e cosa resta da fare. Il gioco non va ridisegnato.
- **Logo Rookiess**: `rookiess-whac/logo-rookiess.svg` (viewBox `0 0 232 50`, blu `#2135E7`).
- **Cursori**: `rookiess-whac/cursor-osmo.css` (Osmo Supply, da non modificare) e `data-cursor="pointer"` sul canvas del gioco.
- Se è disponibile la skill `vivido-proposal-design`, caricala: stabilisce stack e convenzioni delle proposte Vivido. Altrimenti scegli lo stack più semplice che regga GSAP + three.js e dimmelo prima di partire.

## Cosa costruire

### 1. Pagina fedele al Figma, responsive e fluida
- Layout, tipografia, colori e spaziature dal Figma. Tipografia e spaziature **fluide** (`clamp()`), niente salti tra breakpoint.
- Sfondo della hero: gradiente `#0f1c93` → `#192ac1` → `#2135e7`.
- **Mobile**: il gioco è inquadrato per 1280:832 e in verticale il tavolo diventa piccolo. Proponimi 2 opzioni (es. frame ridotto a tutta larghezza sotto il titolo, oppure crop del frame) con uno screenshot ciascuna, e aspetta che scelga prima di implementare.

### 2. Loader (Osmo "Logo Reveal Loader", appendice A)
Usa la risorsa **così com'è**: stessa struttura, stessi attributi `data-load-*`, stessa timeline GSAP. Cambia solo quello che segue:
- **Sfondo bianco** (`.loader__bg { background-color: #fff }`), **logo e barra di avanzamento blu** `#2135E7` (`.loader { color: #2135E7 }`, `.loader__bg-bar { background-color: #2135E7 }`).
- **Logo**: sostituisci i due SVG (base e top) con il logo Rookiess, con `fill="currentColor"` al posto di `#2135E7`. Adegua `.loader__logo-wrap` alle proporzioni del logo (232:50). La base resta al 20% di opacità; il riempimento da sinistra a destra resta com'è.
- Testi: lascia "Hold tight" / "Hi there!" finché non ti dico altro. Font: il mono del progetto al posto di Haffer Mono.
- **Collegalo al gioco**: il gioco prepara i personaggi nei Web Worker in qualche secondo. Fai partire `mount` subito, dietro il loader, così quando il loader esce il gioco è pronto. Se dopo il loader i personaggi non sono ancora tutti pronti, il gioco deve comunque partire senza bloccare (lo fa già: entrano man mano).

### 3. Animazioni di entrata con GSAP (dopo il loader)
Una sequenza unica e misurata, non effetti sparsi: logo in alto → titolo per righe (SplitText, maschera per riga) → card evento → tavolo e buchi → scritte curve "Hit the Gurus!" e "Your Points" → fascia di sticker che entra dal basso. Il gioco inizia a far uscire personaggi solo a sequenza finita (`app.pause(true)` durante l'entrata, poi `app.pause(false)`).
Rispetta `prefers-reduced-motion`: niente movimenti, solo comparse.

### 4. Sticker "Fuck Gurus" come coriandoli quando si colpisce un guru
- `mount` chiama `onScore(score, delta)`: quando `delta > 0` (guru colpito), **2–3 sticker a caso** della fascia in basso saltano su come coriandoli (GSAP: salto verso l'alto, rotazione leggera, ricaduta al posto con un piccolo rimbalzo), poi tornano esattamente dove erano.
- **Senza dare fastidio**: salto contenuto, al massimo un'esplosione ogni ~400 ms, niente sui colpi ai rookie (`delta < 0`), `pointer-events: none`, niente con `prefers-reduced-motion`.
- Collega anche il badge "Your Points" a `onScore`.

### 5. Card evento con il TiltCard di Bencho (appendice B)
Applica il componente **TiltCard di Bencho** (licenza MIT, bencho.dev/licence) alla card "Next event", con queste modifiche:
- **Niente ombra nera, solo glow**: il `boxShadow` scuro (`rgba(15, 23, 42, …)`) diventa un **bagliore** chiaro/blu che cresce sotto il dito, e il gradiente scuro della "fossetta" (`rgba(9, 14, 28, …)`) va tolto o reso trasparente. Il riflesso chiaro sul bordo opposto resta: è quello che dà il glow.
- La card del Figma è orizzontale (circa 558×155) e contiene testo: le misure fisse `W`/`H` (260×320) non vanno bene. Il componente deve avvolgere il contenuto della card e prendere le misure dal contenuto, in modo fluido.
- `BUTTERFLY` (immagine di Bencho, non licenziata) non va usata: la card ha già il suo contenuto. Togli lo sfondo immagine, oppure usa l'immagine della card evento dal Figma se serve.
- `--surface-2`: mappalo al colore di superficie della card nel progetto (nel Figma è vetro smerigliato su blu); se il progetto non ha un equivalente, definiscilo **localmente** sulla radice del componente.
- **Tieni i commenti**: spiegano perché i numeri sono quelli che sono.
- Il componente è in React. Se lo stack non è React, portalo in JS vanilla mantenendo identici logica, numeri e commenti, e dimmelo.

## Come lavorare e verificare
- Prima di scrivere codice: leggi il Figma e `CONTESTO-CLAUDE-CODE.md`, poi mandami un piano breve (stack, struttura dei file, sequenza delle animazioni) e aspetta l'ok.
- Verifica con screenshot a 375, 768, 1280 e 1440 px: nessuno scroll orizzontale, il tavolo del gioco coincide con il Figma (sovrapponi lo screenshot del frame), testo leggibile.
- Prova il gioco con clic veri: guru +10 con gli sticker che saltano, rookie −20 senza sticker.
- Lavora su un branch dedicato e fai commit chiari. Pubblica un'anteprima (Artifact o quello che prevede lo stack) e mandami il link; **non fare deploy in produzione senza chiedermelo**.

---

## Appendice A — Osmo Supply: Logo Reveal Loader (risorsa originale, testuale)

Regole della risorsa: non modificare né rifattorizzare il codice oltre a quanto chiesto sopra; non rimuovere o rinominare gli attributi `data-`; mantieni l'approccio GSAP.

### Dipendenze
```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15/dist/CustomEase.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15/dist/SplitText.min.js"></script>
```

### HTML
```html
<div data-load-wrap class="loader">
  <div data-load-bg class="loader__bg">
    <div data-load-progress class="loader__bg-bar"></div>
  </div>
  <div data-load-container class="loader__container">
    <div class="loader__logo-wrap">
      <div class="loader__logo-item is--base">
        <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewbox="0 0 178 40" fill="none" class="loader__logo-img">
          <path d="M161.77 13.4645C161.143 14.0944 160.07 13.6483 160.07 12.7574V0H156.085V15C156.085 16.6569 154.747 18 153.097 18H138.154V22H150.863C151.75 22 152.195 23.0771 151.567 23.7071L142.722 32.5858L145.54 35.4142L154.385 26.5356C155.01 25.9075 156.079 26.3491 156.085 27.2347V40L160.07 40L160.07 25C160.07 23.3431 161.408 22 163.058 22H178.001V18H165.284C164.405 17.9936 163.965 16.9273 164.583 16.2985L164.588 16.2929L173.433 7.41421L170.615 4.58582L161.77 13.4645Z" fill="currentColor"></path>
          <path d="M16.084 37.178C6.27782 37.178 0 29.956 0 20.066C0 10.176 6.27782 3 16.084 3C25.8903 3 32.1681 10.176 32.1681 20.066C32.1681 29.956 25.8903 37.178 16.084 37.178ZM5.2697 20.066C5.2697 26.828 8.33987 32.808 16.084 32.808C23.8282 32.808 26.8984 26.828 26.8984 20.066C26.8984 13.304 23.8282 7.37 16.084 7.37C8.33987 7.37 5.2697 13.304 5.2697 20.066Z" fill="currentColor"></path>
          <path d="M45.478 37.178C38.3754 37.178 34.847 33.498 34.7095 28.714H39.246C39.4293 31.428 41.0789 33.544 45.4322 33.544C49.373 33.544 50.4269 31.796 50.4269 30.094C50.4269 27.15 47.3109 26.828 44.2866 26.184C40.2083 25.218 35.5343 24.022 35.5343 19.146C35.5343 15.098 38.7878 12.384 44.4241 12.384C50.8393 12.384 53.9095 15.834 54.2303 19.882H49.6938C49.373 18.088 48.4107 16.018 44.5157 16.018C41.4914 16.018 40.2083 17.214 40.2083 18.962C40.2083 21.4 42.8202 21.63 46.1195 22.366C50.4269 23.378 55.1009 24.62 55.1009 29.864C55.1009 34.418 51.6183 37.178 45.478 37.178Z" fill="currentColor"></path>
          <path d="M72.6642 21.492C72.6642 18.364 72.0227 16.248 68.5859 16.248C65.2408 16.248 63.1329 18.594 63.1329 22.136V36.534H58.6422V13.074H63.1329V16.018H63.2246C64.4618 14.224 66.6155 12.384 70.1439 12.384C73.3974 12.384 75.4136 13.856 76.3301 16.478H76.4217C78.1172 14.224 80.5 12.384 84.0742 12.384C88.7941 12.384 91.1769 15.236 91.1769 20.25V36.534H86.6862V21.492C86.6862 18.364 86.0447 16.248 82.6079 16.248C79.2628 16.248 77.1549 18.594 77.1549 22.136V36.534H72.6642V21.492Z" fill="currentColor"></path>
          <path d="M106.545 37.224C99.2594 37.224 94.8603 32.164 94.8603 24.804C94.8603 17.49 99.2594 12.338 106.591 12.338C113.831 12.338 118.23 17.444 118.23 24.758C118.23 32.118 113.831 37.224 106.545 37.224ZM99.5343 24.804C99.5343 29.68 101.734 33.498 106.591 33.498C111.357 33.498 113.556 29.68 113.556 24.804C113.556 19.882 111.357 16.11 106.591 16.11C101.734 16.11 99.5343 19.882 99.5343 24.804Z" fill="currentColor"></path>
        </svg>
      </div>
      <div data-load-logo class="loader__logo-item is--top">
        <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewbox="0 0 178 40" fill="none" class="loader__logo-img">
          <path d="M161.77 13.4645C161.143 14.0944 160.07 13.6483 160.07 12.7574V0H156.085V15C156.085 16.6569 154.747 18 153.097 18H138.154V22H150.863C151.75 22 152.195 23.0771 151.567 23.7071L142.722 32.5858L145.54 35.4142L154.385 26.5356C155.01 25.9075 156.079 26.3491 156.085 27.2347V40L160.07 40L160.07 25C160.07 23.3431 161.408 22 163.058 22H178.001V18H165.284C164.405 17.9936 163.965 16.9273 164.583 16.2985L164.588 16.2929L173.433 7.41421L170.615 4.58582L161.77 13.4645Z" fill="currentColor"></path>
          <path d="M16.084 37.178C6.27782 37.178 0 29.956 0 20.066C0 10.176 6.27782 3 16.084 3C25.8903 3 32.1681 10.176 32.1681 20.066C32.1681 29.956 25.8903 37.178 16.084 37.178ZM5.2697 20.066C5.2697 26.828 8.33987 32.808 16.084 32.808C23.8282 32.808 26.8984 26.828 26.8984 20.066C26.8984 13.304 23.8282 7.37 16.084 7.37C8.33987 7.37 5.2697 13.304 5.2697 20.066Z" fill="currentColor"></path>
          <path d="M45.478 37.178C38.3754 37.178 34.847 33.498 34.7095 28.714H39.246C39.4293 31.428 41.0789 33.544 45.4322 33.544C49.373 33.544 50.4269 31.796 50.4269 30.094C50.4269 27.15 47.3109 26.828 44.2866 26.184C40.2083 25.218 35.5343 24.022 35.5343 19.146C35.5343 15.098 38.7878 12.384 44.4241 12.384C50.8393 12.384 53.9095 15.834 54.2303 19.882H49.6938C49.373 18.088 48.4107 16.018 44.5157 16.018C41.4914 16.018 40.2083 17.214 40.2083 18.962C40.2083 21.4 42.8202 21.63 46.1195 22.366C50.4269 23.378 55.1009 24.62 55.1009 29.864C55.1009 34.418 51.6183 37.178 45.478 37.178Z" fill="currentColor"></path>
          <path d="M72.6642 21.492C72.6642 18.364 72.0227 16.248 68.5859 16.248C65.2408 16.248 63.1329 18.594 63.1329 22.136V36.534H58.6422V13.074H63.1329V16.018H63.2246C64.4618 14.224 66.6155 12.384 70.1439 12.384C73.3974 12.384 75.4136 13.856 76.3301 16.478H76.4217C78.1172 14.224 80.5 12.384 84.0742 12.384C88.7941 12.384 91.1769 15.236 91.1769 20.25V36.534H86.6862V21.492C86.6862 18.364 86.0447 16.248 82.6079 16.248C79.2628 16.248 77.1549 18.594 77.1549 22.136V36.534H72.6642V21.492Z" fill="currentColor"></path>
          <path d="M106.545 37.224C99.2594 37.224 94.8603 32.164 94.8603 24.804C94.8603 17.49 99.2594 12.338 106.591 12.338C113.831 12.338 118.23 17.444 118.23 24.758C118.23 32.118 113.831 37.224 106.545 37.224ZM99.5343 24.804C99.5343 29.68 101.734 33.498 106.591 33.498C111.357 33.498 113.556 29.68 113.556 24.804C113.556 19.882 111.357 16.11 106.591 16.11C101.734 16.11 99.5343 19.882 99.5343 24.804Z" fill="currentColor"></path>
        </svg>
      </div>
    </div>
    <div class="loader__text-wrap">
      <span data-load-text data-load-reset class="loader__text-el">Hold tight</span>
      <span data-load-text data-load-reset class="loader__text-el">Hi there!</span>
    </div>
  </div>
</div>
```

### CSS
```css
.loader {
  z-index: 100;
  color: #fff;
  width: 100%;
  height: 100dvh;
  position: fixed;
  inset: 0% 0% auto;
}

.loader__bg {
  background-color: #0a0a0a;
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0%;
}

.loader__container {
  z-index: 2;
  flex-flow: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  display: flex;
  position: relative;
}

.loader__bg-bar {
  z-index: 1;
  transform-origin: 0%;
  transform-style: preserve-3d;
  background-color: #fff;
  width: 100%;
  height: .5em;
  position: absolute;
  inset: auto 0% 0%;
  transform: scale3d(0, 1, 1);
}

.loader__logo-wrap {
  justify-content: center;
  align-items: center;
  width: 12em;
  height: 3em;
  display: flex;
  position: relative;
}

.loader__logo-item {
  width: 100%;
  position: absolute;
}

.loader__logo-item.is--base {
  opacity: .2;
}

.loader__logo-item.is--top {
  -webkit-clip-path: inset(0% 100% 0% 0%);
  clip-path: inset(0% 100% 0% 0%);
}

.loader__logo-img {
  width: 100%;
  display: block;
}

.loader__text-wrap {
  flex-flow: column;
  justify-content: center;
  align-items: center;
  display: flex;
  position: absolute;
  bottom: 3.5em;
}

.loader__text-el {
  text-transform: uppercase;
  white-space: nowrap;
  margin-bottom: -.25em;
  padding-bottom: .25em;
  font-family: Haffer Mono, Arial, sans-serif;
  position: absolute;
}

[data-load-reset]{ opacity: 0; }
```

### JavaScript
```js
gsap.registerPlugin(CustomEase, SplitText);
CustomEase.create('loader', '0.65, 0.01, 0.05, 0.99');

function initLogoRevealLoader() {
  const wrap = document.querySelector('[data-load-wrap]');
  if (!wrap) return;

  const container = wrap.querySelector('[data-load-container]');
  const bg = wrap.querySelector('[data-load-bg]');
  const progressBar = wrap.querySelector('[data-load-progress]');
  const logo = wrap.querySelector('[data-load-logo]');
  const textElements = Array.from(wrap.querySelectorAll('[data-load-text]'));

  // Reset targets that are * not * split text targets
  const resetTargets = Array.from(wrap.querySelectorAll('[data-load-reset]:not([data-load-text])'));

  // Main loader timeline
  const loadTimeline = gsap
    .timeline({
      defaults: {
        ease: 'loader',
        duration: 3,
      },
    })
    .set(wrap, { display: 'block' })
    .to(progressBar, { scaleX: 1 })
    .to(logo, { clipPath: 'inset(0% 0% 0% 0%)' }, '<')
    .to(container, { autoAlpha: 0, duration: 0.5 })
    .to(progressBar, { scaleX: 0, transformOrigin: 'right center', duration: 0.5 }, '<')
    .add('hideContent', '<')
    .to(bg, { yPercent: -101, duration: 1 }, 'hideContent')
    .set(wrap, { display: 'none' });

  // If there are items to hide FOUC for, reset them at the start
  if (resetTargets.length) {
    loadTimeline.set(resetTargets, { autoAlpha: 1 }, 0);
  }

  // If there's text items, split them, and add to load timeline
  if (textElements.length >= 2) {
    const firstWord = new SplitText(textElements[0], { type: 'lines,chars', mask: 'lines' });
    const secondWord = new SplitText(textElements[1], { type: 'lines,chars', mask: 'lines' });

    // Set initial states of the text elements and letters
    gsap.set([firstWord.chars, secondWord.chars], { autoAlpha: 0, yPercent: 125 });
    gsap.set(textElements, { autoAlpha: 1 });

    // first text in
    loadTimeline.to(
      firstWord.chars,
      {
        autoAlpha: 1,
        yPercent: 0,
        duration: 0.6,
        stagger: { each: 0.02 },
      },
      0,
    );

    // first text out while second text in
    loadTimeline.to(
      firstWord.chars,
      {
        autoAlpha: 0,
        yPercent: -125,
        duration: 0.4,
        stagger: { each: 0.02 },
      },
      '>+=0.4',
    );

    loadTimeline.to(
      secondWord.chars,
      {
        autoAlpha: 1,
        yPercent: 0,
        duration: 0.6,
        stagger: { each: 0.02 },
      },
      '<',
    );

    // second text out
    loadTimeline.to(
      secondWord.chars,
      {
        autoAlpha: 0,
        yPercent: -125,
        duration: 0.4,
        stagger: { each: 0.02 },
      },
      'hideContent-=0.5',
    );
  }
}

// Initialize Logo Reveal Loader
document.addEventListener('DOMContentLoaded', () => {
  initLogoRevealLoader();
});
```

### Documentazione della risorsa (sintesi)
- **Durata**: è la somma delle animazioni della timeline; le principali sono la barra `[data-load-progress]` e il riempimento `[data-load-logo]`, 3 s da `defaults`.
- **Logo**: la versione piena si rivela con `clip-path` sul div con `[data-load-logo]`; `inset(0% 100% 0% 0%)` = riempimento da sinistra a destra.
- **Barra**: div con `[data-load-progress]`, `transform-origin` a sinistra, scala x da 0 a 1.
- **Testi**: due blocchi `[data-load-text]`, divisi in caratteri con SplitText e animati in sequenza.
- **FOUC**: gli elementi con `[data-load-reset]` partono a `opacity: 0` in CSS e la timeline li rimette visibili come primo passo.

---

## Appendice B — Bencho: TiltCard (MIT, bencho.dev/licence; istruzioni e sorgente originali, testuali)

Istruzioni originali di Bencho:

1. Create the component at a sensible path for this project, named TiltCard, from the source below.
2. It needs nothing beyond React.
3. Add the CSS to the project's stylesheet.
4. THE PART THAT NEEDS YOUR JUDGEMENT. The CSS reads these custom properties and does not define them: `--surface-2`. They are Bencho's design tokens. Map each one to whatever this project already uses for the same job — its own ink, ground, surface and UI font — rather than defining them as new globals. If the project has no equivalent, define it locally on the component's own root so nothing leaks out. Anything ending -rgb wants three bare numbers, because the CSS builds rgba() from it.
5. BUTTERFLY is a stub — Bencho's own pictures are not licensed to travel. Point it at this project's images, or leave the placeholder and tell me.

Keep the comments. They say why the numbers are what they are, and they are most of what makes this worth copying rather than rewriting.

### TiltCard.tsx
```tsx
import { useEffect, useRef, useState } from "react";

/* ── inlined from lab/spring ──────────────────────── */
/* ── one spring, for everything that settles ───────────────
   The maths was already on this bench twice, copied by hand:
   Humidity's wheel and Brightness's column both accumulate
   velocity toward a target, damp it, and snap when both the
   delta and the velocity fall under 0.02. Two copies is a
   coincidence; five would be a policy, so it comes out here
   before the elastic blocks are written against it.

   The two shipped copies are deliberately NOT refactored onto
   this. They work, they are tuned, and rewriting the innards
   of two live components to prove a point about duplication
   is how a good afternoon becomes a bad one. This is the one
   new code uses.

   Frames, not milliseconds. `dt` is expressed in sixtieths of
   a second and the damping is RAISED to it rather than
   multiplied by it, so a dropped frame decays the same amount
   of energy as the two frames it replaced. Multiplying is the
   version that makes a spring behave differently on a busy
   page, which is the hardest kind of bug to see.

   The loop parks itself the moment the value has settled.
   CLAUDE.md is not complimentary about the one permanent
   requestAnimationFrame already on this bench and there is no
   case for five more. */

/* 0..100 into the two numbers a spring actually has.

   50 is what Humidity and Brightness were tuned at, which is
   the rule every elastic knob on this bench follows — see
   lab/motion. Turn the panel to the middle and nothing has
   changed.

   Both ends have to be usable, which is what fixes the range:
   at 0 it is slow and heavy and still arrives, at 100 it is
   quick with a visible overshoot, and nowhere in between does
   it ring for longer than it takes to read. */
/* The pair is chosen by DAMPING RATIO and then written back
   as stiffness and decay, because the ratio is the thing a
   person is actually setting and the two numbers on their own
   do not say what they add up to.

     zeta = -ln(d) / (2 * sqrt(k))

   The first version of this ran 0.06..0.26 stiffness against
   0.93..0.74 decay, which reads as a sensible spread and is
   not one: it puts zeta between 0.15 and 0.16 across the
   WHOLE range, so every setting overshot by about sixty per
   cent and the knob only changed how fast it did it. Pull's
   return went 130px past its own resting position and lifted
   the content off the top of the card.

     0   → zeta ~0.85, heavy, arrives without a ring
     50  → zeta ~0.41, near where Humidity and Brightness sit
     100 → zeta ~0.20, lively, two visible rebounds

   Both ends shippable, which is the constraint that fixed the
   numbers rather than taste. */
const springOf = (tune: number) => ({
  /* stiffness: how hard it is pulled toward the target */
  k: 0.08 + (tune / 100) * 0.16,
  /* decay, per frame: how much of the velocity survives */
  d: 0.62 + (tune / 100) * 0.2,
});

/* Units matter. The snap threshold is absolute, so a caller
   works in pixels or in 0..100 — a spring driven over 0..1
   would be "settled" before it had visibly moved. */
function useSpring(target: number, tune = 50, instant = false) {
  const [at, setAt] = useState(target);
  const cur = useRef(target);
  const vel = useRef(0);
  const raf = useRef(0);

  useEffect(() => {
    if (instant) {
      cur.current = target;
      vel.current = 0;
      setAt(target);
      return;
    }
    const { k, d } = springOf(tune);
    let prev = 0;
    const tick = (t: number) => {
      const dt = prev ? clamp((t - prev) / 16.67, 0, 2.5) : 1;
      prev = t;
      vel.current += (target - cur.current) * k * dt;
      vel.current *= Math.pow(d, dt);
      cur.current += vel.current * dt;
      if (Math.abs(target - cur.current) < 0.02 && Math.abs(vel.current) < 0.02) {
        cur.current = target;
        vel.current = 0;
        setAt(target);
        raf.current = 0;
        return;
      }
      setAt(cur.current);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
    /* `tune` sits here beside `target` for the reason
       Brightness spells out: the loop closes over it, so
       without it a knob turned mid-flight would do nothing
       until something else restarted the effect. Restarting
       picks up from the refs, so it continues rather than
       snapping. */
  }, [target, tune, instant]);

  return at;
}

/* Read once, the way the wheel and the pill nav do. A
   preference, not a live input. */
const stillness = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* BUTTERFLY was Bencho's own pictures, which is not licensed
   to travel. Point this at yours. */
const BUTTERFLY: string = "";

/* ══ Tilt ═════════════════════════════════════════════════
   A picture card that gives under the pointer.

   IT SINKS, IT DOES NOT LIFT. Every tilt card on the internet
   rotates TOWARD the cursor: the corner you are nearest rises
   to meet you and the card reads as a slab of glass catching
   the light. This one does the opposite — the point you are
   over goes AWAY, and the far side comes up. The difference
   is one minus sign and it is the whole component: a surface
   that rises to your finger is being displayed to you, and a
   surface that gives under it is being touched.

   Which means the sign is not a detail to get right by
   fiddling. Cursor at the top → the top edge has to go back,
   which is a POSITIVE rotateX; cursor at the right → the
   right edge goes back, which is a positive rotateY. Hence
   `rx = -ny` and `ry = +nx`, the negation of the usual pair.

   THE ROTATION ALONE IS NOT ENOUGH. A rotation about the
   centre is symmetric — the near side down, the far side up
   by the same amount — and on its own it reads as a card
   pivoting, not as one being pressed. What makes it a press
   is that the darkest point tracks the pointer: a depression
   catches shadow at its deepest, and the rim opposite catches
   light. Those two gradients are doing at least as much of
   the work as the transform is, and neither would convince on
   its own.

   ONE PAIR OF NUMBERS IS THE STATE. Two springs hold where
   the pointer is, normalised to -1..1, and the rotation, both
   gradients and the shadow are all read off them. Nothing
   here has a transition of its own — see the note on Sound
   for why that matters, which is the same reason. */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/* Portrait, and the picture is cropped to it by
   scripts/butterfly.sh rather than being fitted at runtime —
   change one and change the other or the crop moves. */
const W = 260;
const H = 320;

/* ── how deep the room is ──────────────────────────────────
   The one number that decides whether this reads as a card
   turning or as a poster being sheared. Perspective is the
   distance from the viewer to the screen, so a small number
   is a face close to the glass: the near corner grows, the
   far corner shrinks, and ten degrees looks like thirty.

   800 against a 320px card is about two and a half card
   heights back — far enough that the foreshortening is a
   suggestion rather than a fisheye, close enough that the
   corners are visibly different sizes. It is not a knob
   because it is not a separate idea from the tilt: both
   answer "how 3D", and two sliders for one feeling is how a
   panel stops meaning anything. */
const DEPTH = 800;

/* how far the whole card retreats while it is being touched.
   Small on purpose — this is the difference between a card
   that tips and a card that is pushed, and at anything past
   about twenty it stops being a press and becomes a zoom. */
const SINK = 14;

const CORNER = 20;
const TILT = 10;
const SHADE = 60;

export function Tilt({
  /* the most either axis turns, in degrees */
  tilt = TILT,
  corner = CORNER,
  /* how dark the dent gets, 0..100 */
  shade = SHADE,
}: { tilt?: number; corner?: number; shade?: number } = {}) {
  const skin = useRef<HTMLDivElement | null>(null);
  const [at, setAt] = useState({ x: 0, y: 0 });
  const [on, setOn] = useState(false);
  const still = stillness();

  /* ── the state, and there is only this ───────────────────
     Where the pointer is, as -1..1 on each axis, sprung. The
     spring is on the POSITION rather than on the rotation, so
     the gradients and the transform can never disagree about
     where the finger is — they are three readings of one
     number instead of three things being animated towards
     the same place.

     Sprung rather than tracked one-to-one because a card with
     no weight follows the cursor exactly and reads as a
     texture pinned to the mouse. The lag is what gives it
     mass, and the settle on the way out is the only reason
     leaving the card feels like anything at all. */
  const sx = useSpring(on ? at.x : 0, 50, still);
  const sy = useSpring(on ? at.y : 0, 50, still);
  /* one more for how much of any of this applies, so the
     shadow and the sheen fade rather than cutting */
  const lit = useSpring(on ? 1 : 0, 50, still);

  const max = clamp(tilt, 0, 20);
  const rx = -sy * max;
  const ry = sx * max;

  /* the pointer in the card's own terms, as a PERCENTAGE —
     the wall and the overlay both draw this block at their
     own scale, and a gradient placed in pixels would land
     somewhere else in each of them */
  const px = ((sx + 1) / 2) * 100;
  const py = ((sy + 1) / 2) * 100;

  const dark = (clamp(shade, 0, 100) / 100) * 0.55 * lit;
  const rim = (clamp(shade, 0, 100) / 100) * 0.34 * lit;

  const track = (e: React.PointerEvent) => {
    const el = skin.current;
    if (!el) return;
    /* measured from the FRAME, which never moves. Reading the
       card instead would be asking a rotating object where it
       is, and near the edges it has already turned away from
       the pointer that is asking. */
    const r = el.getBoundingClientRect();
    setAt({
      x: clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1),
      y: clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1),
    });
    setOn(true);
  };

  return (
    <div
      className="tlt"
      ref={skin}
      style={{ width: W, height: H, perspective: DEPTH }}
      /* pointer, not mouse: the same handler carries a finger
         dragged across the card, so a phone gets the effect
         while it is being touched rather than getting nothing
         at all. */
      onPointerMove={track}
      /* ── `out` with a containment test, NOT `leave` ───────
         Which is what leave IS — the browser derives it from
         exactly this event by asking whether the thing you
         moved to is inside the thing you were on — so this is
         not a second mechanism, it is the same one written
         out. What it buys is the case React would not
         synthesise: the rehearsal drives a scripted pointer by
         dispatching `pointerout`, and its final beat walks off
         the card carrying `relatedTarget: null`. Measured, no
         `onPointerLeave` came of it, and every card on the
         wall finished its demo still sunk under a cursor that
         had gone.

         Null counts as outside, which is also the honest
         answer for a real pointer leaving the window. */
      onPointerOut={(e) => {
        const el = skin.current;
        const to = e.relatedTarget as Node | null;
        if (!el || !to || !el.contains(to)) setOn(false);
      }}
      /* a touch taken over by a scroll never reports leaving */
      onPointerCancel={() => setOn(false)}
    >
      <div
        className="tlt-card"
        style={{
          borderRadius: clamp(corner, 0, 40),
          backgroundImage: `url(${BUTTERFLY})`,
          /* translateZ FIRST, so the retreat is measured in
             the room's axes rather than in the card's own —
             after a rotation, the card's z points somewhere
             off to the side and "back" stops meaning back. */
          transform: `translateZ(${-SINK * lit}px) rotateX(${rx}deg) rotateY(${ry}deg)`,
          /* ── the shadow TIGHTENS ────────────────────────
             A thing pressed into a surface has less air under
             it, so the gap closes and the shadow draws in.
             Growing it on hover is the reflex — it is what a
             card that LIFTS would do — and it fights every
             other cue here. */
          boxShadow: `0 ${mix(20, 9, lit)}px ${mix(44, 24, lit)}px -8px rgba(15, 23, 42, ${mix(
            0.22,
            0.15,
            lit,
          )})`,
        }}
      >
        {/* ── the dent, and the rim opposite it ───────────
            The shadow pools where the surface is deepest,
            which is under the pointer, and the light catches
            the far edge that has risen — so the two are
            placed at mirrored points and neither is centred
            on anything. This is the layer that makes the
            transform read as a press. */}
        <span
          className="tlt-sheen"
          aria-hidden="true"
          style={{
            backgroundImage: `radial-gradient(42% 34% at ${px}% ${py}%, rgba(9, 14, 28, ${dark}) 0%, rgba(9, 14, 28, 0) 100%), radial-gradient(52% 42% at ${
              100 - px
            }% ${100 - py}%, rgba(255, 255, 255, ${rim}) 0%, rgba(255, 255, 255, 0) 100%)`,
          }}
        />
      </div>
    </div>
  );
}
```

### CSS
```css
/* ══ Tilt ═══════════════════════════════════════════════════
   A picture card that gives under the pointer. Almost nothing
   is here: the rotation, both gradients and the shadow are
   written per frame from the pointer's position, and a rule
   in this file that also had an opinion about any of them
   would be a second author. What is left is the things that
   are true whatever the pointer is doing. */
.tlt {
  position: relative;
  /* The frame is what the pointer is measured against and it
     is deliberately the ONLY thing in here that never moves.
     The perspective lives on it rather than on the card for
     the usual reason: on the card itself, `perspective` is
     applied per element and the vanishing point rides along
     with the rotation instead of staying put in the room. */}

.tlt-card {
  position: absolute;
  inset: 0;
  background-color: var(--surface-2);
  background-size: cover;
  background-position: center;
  /* `cover` and a fixed frame, so the crop is the one
     scripts/butterfly.sh already made rather than a second
     one on top of it */
  overflow: hidden;
  /* NO `will-change`. It would hold a composited layer for
     every copy of this block on the wall, permanently, to
     save one frame on a hover that may never come — the same
     bookkeeping CLAUDE.md objects to for permanent rAF. The
     browser promotes this on its own once the transform
     starts moving. */}

/* ── the dent and the rim ───────────────────────────────────
   One element, two gradients, both placed from the pointer —
   the dark one under it and the light one at its mirror. It
   inherits the corner rather than being told one, so the knob
   only has to reach the card. */
.tlt-sheen {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;}
```
