// Fills the press kit with sample documents through the Press Kit Manager (3 per model: photos, video, press release).
// PW=<upload password> DEMO=<folder with one sub-folder of files per model slug> [ONLY=slug,slug] node test/fill-samples.mjs
import { chromium } from 'playwright'; import fs from 'fs';
const BASE = 'https://mas26-media.toolpress.workers.dev', D = process.env.DEMO + '/';
const MODELS = [['concept', 'Concept'], ['grecale', 'Grecale'], ['granturismo', 'GranTurismo'], ['grancabrio', 'GranCabrio'], ['mcpura', 'MCPura'], ['gt2-stradale', 'GT2 Stradale']];
const only = (process.env.ONLY || '').split(',').filter(Boolean);
const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY } });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, ignoreHTTPSErrors: true });
await ctx.addInitScript(() => { try { localStorage.setItem('mas26_help_seen', '1'); } catch (e) {} });
const p = await ctx.newPage(); p.on('dialog', (d) => d.accept());
const toast = async (re, t = 240000) => { await p.waitForFunction((r) => new RegExp(r).test(document.getElementById('toast').textContent) && document.getElementById('toast').classList.contains('show'), re.source, { timeout: t }); };
await p.goto(BASE + '/upload/'); await p.fill('#pwd', process.env.PW); await p.click('#login-form button');
await p.waitForSelector('#v-brand:not([hidden])', { timeout: 30000 });
for (const [slug, name] of MODELS) {
  if (only.length && !only.includes(slug)) continue;
  const files = fs.readdirSync(D + slug).map((f) => D + slug + '/' + f);
  const docs = [
    [`${name} – Photo gallery`, 1, 'Sample photo gallery for the mockup.', files.filter((f) => f.endsWith('.jpg'))],
    [`${name} – Video`, 2, 'Sample video for the mockup.', files.filter((f) => f.endsWith('.mp4'))],
    [`${name} – Press release`, 3, 'Sample press release for the mockup.', files.filter((f) => f.endsWith('.pdf'))],
  ];
  for (const [title, type, desc, list] of docs) {
    await p.goto(BASE + '/upload/#brand=' + slug); await p.waitForFunction((n) => document.getElementById('brand-title').textContent === n && !document.getElementById('v-brand').hidden, name, { timeout: 60000 });
    if (await p.locator('#docs .doc', { hasText: title }).count()) { console.log('skip', title); continue; }
    await p.click('#new-doc'); await p.fill('#n-name', title); await p.click(`#n-type [data-v]:nth-child(${type})`); await p.fill('#n-desc', desc);
    await p.click('#n-create'); await p.waitForSelector('#v-doc:not([hidden])', { timeout: 60000 });
    await p.setInputFiles('#file-input', list); await toast(/Upload completato|non (è|sono) stat/);
    await p.waitForFunction((n) => document.querySelectorAll('#files .f').length === n, list.length, { timeout: 60000 });
    await p.click('#doc-publish'); await toast(/Pubblicato/);
    console.log('ok', title, list.length);
  }
}
await b.close();
