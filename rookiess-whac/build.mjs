// node build.mjs  (NODE_PATH deve puntare a una cartella con three + esbuild)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const esbuild = process.env.ESBUILD || 'esbuild';
const bundle = (entry) => execFileSync(esbuild, [join(here, entry), '--bundle', '--format=iife', '--minify', '--target=es2020', '--loader:.svg=text'],
  { env: process.env, maxBuffer: 64 << 20 }).toString();
const js = bundle('main.js');
const worker = bundle('worker.js'); // finisce in un <script type="text/plain"> e parte come Worker da un Blob
for (const [n, b] of [['main', js], ['worker', worker]]) if (b.includes('</script')) throw new Error(n + ' contiene </script');
const hero = process.env.HERO_B64 ? readFileSync(process.env.HERO_B64, 'utf8').trim() : '';
// cursori Osmo: il CSS resta com'è; nella pagina di prova gli SVG del CDN (bloccato negli Artifact) diventano data URI
let cursorCss = readFileSync(join(here, 'cursor-osmo.css'), 'utf8');
cursorCss = cursorCss.replace(/url\("https:\/\/cdn\.prod\.website-files\.com\/[^"]*?(cursor-[a-z]+\.svg)"\)/g, (_, f) =>
  'url("data:image/svg+xml;base64,' + readFileSync(join(here, 'cursors', f)).toString('base64') + '")');
const html = readFileSync(join(here, 'pagina.html'), 'utf8').replace('/*__CURSOR_CSS__*/', () => cursorCss).replace('/*__WORKER__*/', () => worker).replace('/*__BUNDLE__*/', () => js).replace('__HERO__', () => hero);
writeFileSync(join(here, 'rookiess-clay.html'), html);
console.log('rookiess-clay.html', (html.length / 1024).toFixed(0) + ' KB');
