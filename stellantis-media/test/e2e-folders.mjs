// Browser test of folder uploads (modal + document view), sub-folder ZIPs and the viewer sections.
//   BASE=http://localhost:8787 PW=test FIXTURES=./fixtures node test/e2e-folders.mjs
// FIXTURES must contain "tree/Grande Panda launch/..." (a folder with sub-folders) and "files/" (a few files).
import { chromium } from 'playwright';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
const DIR = (process.env.FIXTURES || '.') + '/';
const OUT = (process.env.OUT || tmpdir()) + '/';
const BASE = process.env.BASE || 'http://localhost:8799', PW = process.env.PW || 'test';
const remote = BASE.startsWith('https');
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, proxy: remote ? { server: process.env.HTTPS_PROXY } : undefined });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, ignoreHTTPSErrors: remote });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
const step = s => console.log('✓', s);
const toast = async (re, t = 120000) => p.waitForFunction(r => new RegExp(r).test(document.getElementById('toast').textContent) && document.getElementById('toast').classList.contains('show'), re.source, { timeout: t });
await p.goto(BASE + '/upload/#brand=fiat');
await p.fill('#pwd', PW); await p.click('#login-form button');
await p.waitForSelector('#v-brand:not([hidden])', { timeout: 60000 });
const font = await p.evaluate(async () => { await document.fonts.ready; return [getComputedStyle(document.body).fontFamily, getComputedStyle(document.querySelector('#brand-title')).fontWeight]; });
step('font ' + font.join(' / '));

// New document from the modal with a whole folder
await p.click('#new-doc');
await p.setInputFiles('#n-dir-input', DIR + 'tree/Grande Panda launch');
await p.waitForSelector('#n-staged:not([hidden])');
step('modal staged: ' + await p.textContent('#n-staged span') + ' | title prefilled: ' + await p.inputValue('#n-name'));
await p.screenshot({ path: OUT + '10-modal.png' });
await p.click('#n-type [data-v]:first-child');
await p.click('#n-create');
await p.waitForSelector('#v-doc:not([hidden])', { timeout: 60000 });
await toast(/Upload complete|could not/);
await p.waitForFunction(() => document.querySelectorAll('#files .f').length === 5, null, { timeout: 30000 });
const groups = await p.$$eval('#files .fd b', els => els.map(e => e.textContent));
step('doc created with 5 files, folders: ' + JSON.stringify(groups));
await p.screenshot({ path: OUT + '11-doc-folders.png', fullPage: true });
const folder = await p.evaluate(() => location.hash);

// Add another folder from the document view: kept as a sub-folder
await p.setInputFiles('#dir-input', DIR + 'files');
await toast(/Upload complete|could not/);
await p.waitForFunction(() => [...document.querySelectorAll('#files .fd b')].some(b => b.textContent === 'files'), null, { timeout: 30000 });
step('folder added as sub-folder "files"');

// Viewer + ZIP
const mf = await p.evaluate(() => document.querySelector('#files .f a').href.split('/f/')[1].split('/').slice(0, 2).join('/'));
const list = await (await p.request.get(BASE + '/api/list?folder=' + mf)).json();
step('api dirs: ' + list.dirs.map(d => d.name + '(' + d.count + (d.zip ? ',zip' : '') + ')').join(' '));
const vp = await ctx.newPage();
await vp.goto(BASE + '/preview/?folder=' + mf);
await vp.waitForSelector('.stlm-sec-h', { timeout: 30000 });
step('viewer sections: ' + JSON.stringify(await vp.$$eval('.stlm-sec-t strong', e => e.map(x => x.textContent))));
await vp.screenshot({ path: OUT + '12-viewer.png', fullPage: true });
await vp.click('.stlm-tab[data-g="doc"]');
step('filter documents -> visible sections: ' + await vp.locator('.stlm-sec:not([hidden])').count());
await vp.close();
const zip = await p.request.get(BASE + '/zip/' + mf);
require: {
  const fs = await import('node:fs'); fs.writeFileSync(OUT + 'tree.zip', await zip.body());
  step('zip listing:\n' + execSync('unzip -Z1 ' + OUT + 'tree.zip').toString().trim().split('\n').map(x => '     ' + x).join('\n'));
  execSync('unzip -tq ' + OUT + 'tree.zip'); step('zip integrity ok');
  const z2 = await p.request.get(BASE + '/zip/' + mf + '?sub=Exterior'); fs.writeFileSync(OUT + 'ext.zip', await z2.body());
  step('folder zip: ' + execSync('unzip -Z1 ' + OUT + 'ext.zip').toString().trim().replace(/\n/g, ', '));
}

// Delete a sub-folder
await p.click('#files .fd:has(b:text-is("files")) .del');
await p.click('#c-yes');
await toast(/Folder deleted/);
await p.waitForFunction(() => document.querySelectorAll('#files .f').length === 5);
step('sub-folder deleted');
// Rename inside a sub-folder
const idx = await p.evaluate(() => [...document.querySelectorAll('#files .f b')].findIndex(b => b.title === 'Interior/dash.jpg'));
const row = p.locator('#files .f').nth(idx);
await row.locator('[data-a=rename]').click(); await row.locator('.ren input').fill('Dashboard'); await row.locator('.ren .primary').click();
await toast(/renamed/);
await p.waitForSelector('#files .f b[title="Interior/Dashboard.jpg"]');
step('renamed inside sub-folder');

// Clean up: delete the document
await p.click('#doc-delete'); await p.click('#c-yes'); await toast(/Document deleted/);
step('document deleted');
console.log('ERRORS', JSON.stringify(errs));
await b.close();
