# MJF Professional Network — Hero Section

Riproduzione fedele (1:1) della hero Figma **MJFNETWORK – PROPOSAL 4**
(`node-id 31:1537`), in HTML/CSS/JS vanilla, con animazioni fluide tramite
**GSAP** e **Lenis**.

## Come aprirlo

Il sito è self-contained. Servilo con un piccolo static server (necessario perché
carica moduli/asset locali):

```bash
cd mjf-hero
python3 -m http.server 8000
# poi apri http://localhost:8000
```

> Aprire `index.html` con doppio click (`file://`) può bloccare il caricamento di
> alcuni asset per policy del browser: usa il server statico.

## Cosa contiene

```
mjf-hero/
├── index.html            # markup della hero (coordinate scatter trascritte dal Figma)
├── css/style.css         # design tokens, layout, hover, responsive, reduced-motion
├── js/main.js            # Lenis + GSAP: floating, cambio-stato, typewriter, entrata
└── assets/
    ├── vendor/           # GSAP + Lenis self-hosted (nessun CDN richiesto)
    │   ├── gsap.min.js
    │   ├── ScrollTrigger.min.js
    │   └── lenis.min.js
    └── img/              # 21 tile-ritratto (person-01..21) + tile grigie via CSS
```

## Animazioni implementate

| Richiesta | Implementazione |
|-----------|-----------------|
| Immagini che si muovono in modo morbido (floating) | `gsap.to` infinito `yoyo`, drift x/y + rotazione, durata/delay sfalsati per tile (`sine.inOut`) |
| Cambio di stato immagine ↔ grigia | Crossfade `gsap` di un layer grigio/foto su tile scelte casualmente, con leggero pulse di scala |
| Diverse opacità delle immagini | Opacità base per-tile (1 / .6 / .3 / .2) come nel Figma |
| Typewriter nel box azzurro | `Persone → Professionisti → Manager → Consulenti → Avvocati → Giornalisti → …`, cancella/scrive lettera per lettera, cursore lampeggiante, box che si adatta |
| Hover menu (link + button) | Underline animata + color shift sui link; lift + shadow sul button |
| Hover button hero (primario/secondario) | Lift + shadow, scurimento (primario) / bordo blu (secondario) |
| Smooth & fluido | Lenis smooth scroll agganciato al ticker GSAP |
| Responsive | Stage 1280px scalato proporzionalmente (desktop/tablet); su mobile layout a flusso, nav a burger, scatter ridotto ai bordi |
| Accessibilità | Rispetta `prefers-reduced-motion` (disattiva loop e typewriter) |

## Font

Il titolo usa **Switzer** (via Fontshare CDN nel `<head>`). In assenza di rete il
sito ricade su uno stack di sistema equivalente senza rompersi.

## Sostituire i ritratti con le foto reali del Figma

Le immagini in `assets/img/person-01..21.svg` sono **placeholder generati**
(ritratti stilizzati): le foto originali del Figma non erano scaricabili
dall'ambiente di build per policy di rete. Per avere la hero pixel-perfect con le
foto vere:

1. In Figma apri il file `Proposals-Archive`, node `31:1537`.
2. Esporta le 21 immagini-persona (le tile con foto) come PNG/JPG.
3. Salvale in `assets/img/` sovrascrivendo `person-01` … `person-21`
   (puoi mantenere l'estensione aggiornando il `src` in `index.html`, oppure
   esportare in SVG per non toccare il markup).

L'ordine `person-01..21` segue le tile-foto del Figma da in alto/al centro verso i
bordi; qualsiasi assegnazione va bene, la composizione resta fedele.

## Note tecniche

- GSAP e Lenis sono **vendored** da npm in `assets/vendor/`: nessuna dipendenza
  CDN a runtime, il sito funziona anche offline.
- Le coordinate delle ~39 tile (`left`/`top`/opacità) sono trascritte 1:1 dal nodo
  Figma dentro uno stage fisso di 1280px, scalato via `--scale` da `js/main.js`.
