import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)('/opt/node-tools/node_modules/playwright/index.js');
import fs from 'fs';
const B = 'https://stellantis-mondial-auto-p-ca5c2043669e4.webflow.io', DIR = new URL('./shots/', import.meta.url).pathname;
const jq = fs.readFileSync(new URL('./lib/jquery/dist/jquery.min.js', import.meta.url)), mix = fs.readFileSync(new URL('./lib/mixitup/dist/mixitup.min.js', import.meta.url));
const PAGES = ['/', '/models', '/contact', '/events/concept', '/events/grecale', '/events/granturismo', '/events/grancabrio', '/events/mcpura', '/events/gt2-stradale', '/cookie-policy', '/privacy-policy', '/terms-and-conditions'];
const out = [], log = (k, ok, d = '') => { out.push([ok ? 'PASS' : 'FAIL', k, d]); console.log(ok ? 'PASS' : 'FAIL', k, d); };
const b = await chromium.launch();
async function ctx(opts = {}, unlocked = true, consent = true) {
  const c = await b.newContext({ ignoreHTTPSErrors: true, ...opts });
  await c.route('**/*', (r) => {
    const u = r.request().url();
    if (u.includes('cdn.prod.website-files.com/')) return r.continue({ url: u.replace('https://cdn.prod.website-files.com/', 'https://webflow-prod-assets.s3.amazonaws.com/') });
    if (/jquery-3\.5\.1/.test(u)) return r.fulfill({ body: jq, contentType: 'application/javascript' });
    if (/mixitup/.test(u)) return r.fulfill({ body: mix, contentType: 'application/javascript' });
    return r.continue();
  });
  if (unlocked) await c.addInitScript(() => { try { localStorage.setItem('mas26_access', 'f730a2591bc54c5642aa42a7bedf46c5486f007b476e4cc94a02fe80e2c56327'); } catch (e) {} });
  if (consent) await c.addCookies([{ name: 'mas26_consent', value: encodeURIComponent(JSON.stringify({ v: 2, ts: new Date().toISOString(), necessary: true, comfort: false, performance: false, advertising: false })), url: B }]);
  return c;
}
async function go(p, path) { for (let i = 0; i < 4; i++) { try { const r = await p.goto(B + path, { waitUntil: 'load', timeout: 45000 }); await p.waitForTimeout(1200); return r; } catch (e) { if (i === 3) throw e; } } }
// 1. crawl desktop
let c = await ctx({ viewport: { width: 1440, height: 900 } }), p = await c.newPage();
const failed = []; p.on('requestfailed', (r) => failed.push(r.url())); p.on('response', (r) => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()); });
for (const path of PAGES) {
  const r = await go(p, path);
  const info = await p.evaluate(() => ({
    title: document.title,
    text: document.body.innerText,
    broken: [...document.images].filter((i) => i.offsetParent !== null && (!i.complete || !i.naturalWidth)).map((i) => i.currentSrc || i.src).filter((u) => !/webflow-badge/.test(u)),
    links: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
    navLogo: (document.querySelector('.navbar img') || {}).src, logoBox: (() => { const i = document.querySelector('.navbar img').getBoundingClientRect(), n = document.querySelector('.navbar').getBoundingClientRect(), e = document.querySelector('#mas-embargo').getBoundingClientRect(); return [Math.round(i.top), Math.round(i.bottom), Math.round(n.top), Math.round(n.bottom), Math.round(e.bottom)]; })(), bar: !!document.querySelector('#mas-embargo'),
  }));
  const legal = /privacy|terms|cookie/.test(path);
  const left = (info.text.match(/[^\n]*(Stellantis|Mondial|Paris|Hall 4|\bbrands\b|\b[Aa] brand\b|this brand)[^\n]*/gi) || []).filter((l) => !legal || /Mondial|Paris|Hall 4/i.test(l));
  log('page ' + path, r.status() === 200 && !info.broken.length && !left.length && info.bar && /maserati-logo/.test(info.navLogo || ''), JSON.stringify({ s: r.status(), title: info.title, broken: info.broken, left: left.slice(0, 4), bar: info.bar, logoBox: info.logoBox }));
  const bad = info.links.filter((h) => /\/brands|#info|stellantis/i.test(h)); if (bad.length) log('links ' + path, legal, JSON.stringify([...new Set(bad)].slice(0, 6)));
  await p.screenshot({ path: DIR + 'd' + path.replace(/\//g, '_') + '.png' });
}
const r404 = await go(p, '/does-not-exist'); log('404 page', r404.status() === 404 && /Back to the press kit/.test(await p.innerText('body')), ''); await p.screenshot({ path: DIR + 'd_404.png' });
// model row
await go(p, '/events/grecale');
const row = await p.evaluate(() => ({ names: [...document.querySelectorAll('[data-bb-link]')].map((a) => a.innerText.trim()), cur: (document.querySelector('[data-bb-link].is-current') || {}).innerText, home: !!document.querySelector('[data-bb-home] img'), hrefs: [...document.querySelectorAll('[data-bb-link]')].map((a) => a.getAttribute('href')), filters: [...document.querySelectorAll('.filtri [data-filter]')].map((a) => a.innerText.trim()), h1: (document.querySelector('h1') || {}).innerText }));
log('models row', row.names.join('|') === 'Concept|Grecale|GranTurismo|GranCabrio|MCPura|GT2 Stradale' && row.cur === 'Grecale' && row.home, JSON.stringify(row));
// hover colours on home
await go(p, '/');
const cols = await p.evaluate(() => { const s = new Set(); document.querySelectorAll('a,button,.badge,[class*=button]').forEach((e) => { const cs = getComputedStyle(e); s.add(cs.backgroundColor); s.add(cs.color); }); return [...s]; });
log('no old blue on home', !cols.some((x) => /rgb\(36, 55, 130\)|rgb\(26, 40, 98\)/.test(x)), cols.join(' ').slice(0, 300));
log('failed requests', failed.filter((u) => !/google|gstatic|favicon|webflow-badge|does-not-exist/.test(u)).length === 0, JSON.stringify([...new Set(failed)].slice(0, 8)));
await c.close();
// 2. mobile
c = await ctx({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); p = await c.newPage();
for (const path of ['/', '/models', '/contact', '/events/grecale', '/cookie-policy', '/privacy-policy']) {
  await go(p, path);
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  log('mobile overflow ' + path, ov <= 0, 'overflow=' + ov);
  if (path === '/' || path === '/events/grecale') await p.screenshot({ path: DIR + 'm' + path.replace(/\//g, '_') + '.png' });
}
await go(p, '/');
await p.click('.w-nav-button'); await p.waitForTimeout(700);
const open = await p.evaluate(() => ({ open: !!document.querySelector('.w-nav-button.w--open'), links: [...document.querySelectorAll('.w-nav-overlay a, .w-nav-menu a')].filter((a) => a.offsetParent).map((a) => a.innerText.trim()) }));
await p.screenshot({ path: DIR + 'm_menu.png' });
await p.click('.w-nav-button'); await p.waitForTimeout(700);
const closed = await p.evaluate(() => !document.querySelector('.w-nav-button.w--open'));
log('mobile menu open/close, no Info', open.open && closed && !open.links.some((l) => /info/i.test(l)) && open.links.some((l) => /contacts/i.test(l)), JSON.stringify(open.links));
await c.close();
// 3. gate
c = await ctx({ viewport: { width: 1280, height: 800 } }, false, true); p = await c.newPage();
await go(p, '/');
const g1 = await p.evaluate(() => ({ gate: !!document.querySelector('#stl-gate'), txt: (document.querySelector('#stl-gate') || {}).innerText, logo: (document.querySelector('#stl-gate img') || {}).naturalWidth, hidden: getComputedStyle(document.body).visibility }));
await p.screenshot({ path: DIR + 'gate.png' });
log('gate shows', g1.gate && g1.logo > 0 && g1.hidden === 'hidden' && /Contents under embargo until 10\/12\/2026 7:00 p\.m\./.test(g1.txt) && /FaSTLAne 2030 \/ Maserati Day/.test(g1.txt), JSON.stringify(g1.txt));
await p.fill('#stl-gate input', 'wrong'); await p.click('#stl-gate button'); await p.waitForTimeout(500);
log('gate wrong password', /Incorrect password/.test(await p.innerText('#stl-gate .e')) && await p.isVisible('#stl-gate'), '');
await p.fill('#stl-gate input', process.env.GATE_PW); await p.click('#stl-gate button'); await p.waitForTimeout(500);
log('gate right password unlocks', !(await p.$('#stl-gate')) && await p.evaluate(() => getComputedStyle(document.body).visibility) === 'visible', '');
await go(p, '/models'); log('gate remembered', !(await p.$('#stl-gate')), '');
await c.close();
// 4. cookie banner
c = await ctx({ viewport: { width: 1280, height: 800 } }, true, false); p = await c.newPage();
await go(p, '/');
log('cookie banner shows', await p.isVisible('#stl-cc'), ''); await p.screenshot({ path: DIR + 'cookie.png' });
await p.click('#stl-cc [data-a="skip"]'); await p.waitForTimeout(300);
let ck = (await c.cookies()).find((x) => x.name === 'mas26_consent'); log('cookie reject', !(await p.$('#stl-cc')) && ck && !JSON.parse(decodeURIComponent(ck.value)).performance, '');
await go(p, '/models'); log('cookie choice remembered', !(await p.$('#stl-cc')), '');
const fl = await p.$('.footer a[href="#cookie-settings"]'); log('cookie settings link in footer', !!fl, '');
if (fl) { await fl.click(); await p.waitForTimeout(300); await p.check('#stl-cc input[data-cat="performance"]'); await p.click('#stl-cc [data-a="save"]'); await p.waitForTimeout(300);
  ck = (await c.cookies()).find((x) => x.name === 'mas26_consent'); log('cookie settings save', JSON.parse(decodeURIComponent(ck.value)).performance === true, ''); }
await c.clearCookies(); await go(p, '/'); await p.click('#stl-cc .cc-btn[data-a="accept"]'); await p.waitForTimeout(300);
ck = (await c.cookies()).find((x) => x.name === 'mas26_consent'); log('cookie accept all', ck && JSON.parse(decodeURIComponent(ck.value)).advertising === true, '');
await go(p, '/cookie-policy'); const names = await p.evaluate(() => document.querySelector('.stl-ck').innerText.match(/(stl26|mas26)_\w+/g)); log('cookie list names', names && names.every((n) => n.startsWith('mas26')), JSON.stringify(names));
await c.close(); await b.close();
fs.writeFileSync(new URL('./result.json', import.meta.url), JSON.stringify(out, null, 1));
console.log('TOTAL', out.filter((x) => x[0] === 'PASS').length, 'pass,', out.filter((x) => x[0] === 'FAIL').length, 'fail');
