// End-to-end test of the Press Kit Manager in a real browser.
//   BASE=http://localhost:8787 PW=test FILES=./fixtures node test/e2e.mjs
// FILES must contain: "Grande Panda 01.jpg", "Grande Panda 02.jpg", "Grande Panda 03.jpg", "Press release.pdf", "Fact sheet.docx".
// Against production set LEGACY=0 (does not touch existing documents); the test document is deleted at the end.
import { chromium } from 'playwright';
import { tmpdir } from 'node:os';
const BASE = process.env.BASE || 'http://localhost:8799';
const PW = process.env.PW || 'test';
const DIR = (process.env.OUT || tmpdir()) + '/';
const F = (process.env.FILES || DIR + 'files') + '/';
const remote = BASE.startsWith('https');
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, proxy: remote ? { server: process.env.HTTPS_PROXY } : undefined });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, ignoreHTTPSErrors: remote });
await ctx.addInitScript(() => { try { localStorage.setItem('stl26_help_seen', '1'); } catch (e) {} });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push('pageerror ' + e.message));
p.on('console', m => { if (m.type() === 'error' && !/favicon|pdf|cdnjs|ERR_TUNNEL/.test(m.text())) errors.push(m.text()); });
p.on('dialog', d => { errors.push('unexpected dialog ' + d.message()); d.accept(); });
const step = (s) => console.log('✓', s);
const toast = async (re, t = 90000) => { await p.waitForFunction((r) => new RegExp(r).test(document.getElementById('toast').textContent) && document.getElementById('toast').classList.contains('show'), re.source, { timeout: t }).catch(async e => { await shot('fail'); console.log('toast was:', await p.textContent('#toast')); throw e; }); };
const shot = (n) => p.screenshot({ path: DIR + n + '.png' });

await p.goto(BASE + '/upload/');
await p.fill('#pwd', 'wrong'); await p.click('#login-form button');
await p.waitForFunction(() => /Wrong password/.test(document.getElementById('login-err').textContent), null, { timeout: 30000 }).catch(async e => { console.log('login-err:', await p.textContent('#login-err')); throw e; });
step('wrong password message');
await p.fill('#pwd', PW); await p.click('#login-form button');
await p.waitForSelector('#v-brand:not([hidden])', { timeout: 30000 });
step('signed in, brand view');

await p.click('#side [data-brand="fiat"]');
await p.waitForFunction(() => document.getElementById('brand-title').textContent === 'FIAT');
await shot('01-brand');
step('fiat docs: ' + await p.locator('#docs .doc').count());

// New document
await p.click('#new-doc');
await p.click('#n-create');
await p.waitForFunction(() => /title/.test(document.getElementById('n-err').textContent));
await p.fill('#n-name', 'E2E Grande Panda – Photos');
await p.click('#n-create');
await p.waitForFunction(() => /category/.test(document.getElementById('n-err').textContent));
step('validation messages');
await p.click('#n-type [data-v]:first-child');
await p.fill('#n-desc', 'Photos of the launch');
await shot('02-new');
await p.click('#n-create');
await p.waitForSelector('#v-doc:not([hidden])', { timeout: 30000 });
await p.waitForFunction(() => /Draft/.test(document.getElementById('doc-pill').textContent));
step('document created as draft: ' + await p.textContent('#doc-title'));

// Upload
await p.setInputFiles('#file-input', ['Grande Panda 01.jpg', 'Grande Panda 02.jpg', 'Grande Panda 03.jpg', 'Press release.pdf', 'Fact sheet.docx'].map(n => F + n));
await toast(/Upload complete|could not/);
await p.waitForFunction(() => document.querySelectorAll('#files .f').length === 5, null, { timeout: 20000 });
step('5 files uploaded; failed rows: ' + await p.locator('.q.fail').count());
await shot('03-doc');

// Rename (extension kept automatically)
const idx = async (n) => p.evaluate((n) => [...document.querySelectorAll('#files .f b')].findIndex(b => b.title === n), n);
const row = p.locator('#files .f').nth(await idx('Grande Panda 02.jpg'));
await row.locator('[data-a=rename]').click();
await row.locator('.ren input').fill('Grande Panda front');
await row.locator('.ren .primary').click();
await toast(/renamed/);
await p.waitForSelector('#files .f b[title="Grande Panda front.jpg"]');
step('renamed to "Grande Panda front.jpg"');
// Rename onto an existing name is refused
const row2 = p.locator('#files .f').nth(await idx('Grande Panda 03.jpg'));
await row2.locator('[data-a=rename]').click();
await row2.locator('.ren input').fill('Grande Panda 01');
await row2.locator('.ren .primary').click();
await toast(/already exists/);
await row2.locator('.ren .ghost').click();
step('rename onto existing name refused');

// Delete file
await p.locator('#files .f', { hasText: 'Fact sheet.docx' }).locator('[data-a=delete]').click();
await p.click('#c-yes');
await toast(/File deleted/);
await p.waitForFunction(() => document.querySelectorAll('#files .f').length === 4);
step('file deleted');

// Edit details
await p.fill('#d-name', 'E2E Grande Panda – Launch photos');
await p.click('#d-type [data-v]:nth-child(3)');
await p.check('#d-sheet');
await p.click('#d-save');
await toast(/Changes saved/);
await p.waitForFunction(() => document.getElementById('doc-title').textContent === 'E2E Grande Panda – Launch photos');
step('details saved');

// Publish / edit live / unpublish
await p.click('#doc-publish');
await toast(/Published/);
await p.waitForFunction(() => /Live/.test(document.getElementById('doc-pill').textContent));
step('published, view link: ' + await p.getAttribute('#doc-view', 'href'));
await p.fill('#d-desc', 'Edited while live');
await p.click('#d-save');
await toast(/saved and published/);
step('edit while live republished');
await p.click('#doc-unpublish'); await p.click('#c-yes');
await toast(/Unpublished/);
step('unpublished');

if (process.env.LEGACY !== '0') {
// Legacy document without folder: first upload assigns one
await p.click('#back');
await p.click('#docs .doc:has-text("B-Roll")');
await p.waitForSelector('#v-doc:not([hidden])');
await p.setInputFiles('#file-input', [F + 'Grande Panda 01.jpg']);
await toast(/Upload complete|could not/);
await p.waitForFunction(() => document.querySelectorAll('#files .f').length === 1, null, { timeout: 20000 });
step('legacy doc got a folder and a file');

}
// Reload keeps the position (hash routing)
await p.reload();
await p.waitForSelector('#v-doc:not([hidden])', { timeout: 60000 }).catch(async e => { await shot('reload-fail'); console.log('views:', await p.evaluate(() => ['loading','v-error','v-brand','v-doc'].filter(v => !document.getElementById(v).hidden) + ' ' + location.hash + ' login:' + !document.getElementById('login').hidden + ' err:' + document.getElementById('error-msg').textContent)); throw e; });
step('reload returns to: ' + await p.textContent('#doc-title'));

// Delete the new document
await p.click('#back');
await p.click('#docs .doc:has-text("E2E Grande Panda")');
await p.waitForSelector('#v-doc:not([hidden])');
await p.click('#doc-delete'); await shot('04-confirm'); await p.click('#c-yes');
await toast(/Document deleted/);
await p.waitForSelector('#v-brand:not([hidden])');
step('document deleted, docs left: ' + await p.locator('#docs .doc').count());

// Mobile layout
await p.setViewportSize({ width: 390, height: 844 });
await p.click('#docs .doc:has-text("B-Roll")');
await p.waitForSelector('#v-doc:not([hidden])');
await shot('05-mobile');
const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
step('mobile horizontal overflow: ' + overflow);

console.log('ERRORS:', JSON.stringify(errors));
await b.close();
