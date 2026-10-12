// node build.mjs  (NODE_PATH deve puntare a una cartella con three + esbuild)
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const esbuild = process.env.ESBUILD || 'esbuild';
const js = execFileSync(esbuild, [join(here, 'main.js'), '--bundle', '--format=iife', '--minify', '--target=es2020'],
  { env: process.env, maxBuffer: 64 << 20 }).toString();
if (js.includes('</script')) throw new Error('bundle contiene </script');
const html = readFileSync(join(here, 'pagina.html'), 'utf8').replace('/*__BUNDLE__*/', () => js);
writeFileSync(join(here, 'rookiess-clay.html'), html);
console.log('rookiess-clay.html', (html.length / 1024).toFixed(0) + ' KB');
