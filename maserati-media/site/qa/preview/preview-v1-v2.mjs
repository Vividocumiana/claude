import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)(process.env.PWPATH);
import fs from 'fs';
const B = 'https://fastlane-2030-maserati-day-2026.webflow.io', OUT = process.env.OUT + '/';
const jq = fs.readFileSync(new URL('./lib/jquery/dist/jquery.min.js', import.meta.url));
const KV = {}; 
const V = { v1: { main: '#0C2340', soft: '#f5f5f7', hover: '#0C2340' }, v2: { main: '#971B2F', soft: '#DDE5ED', hover: '#971B2F' } };
const b = await chromium.launch();
async function shot(v, path, name, unlocked, vp = { width: 1440, height: 900 }, mobile = false) {
  const k = V[v];
  const c = await b.newContext({ ignoreHTTPSErrors: true, viewport: vp, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile });
  await c.route('**/*', (r) => { const u = r.request().url();
    if (u.includes('cdn.prod.website-files.com/')) return r.continue({ url: u.replace('https://cdn.prod.website-files.com/', 'https://webflow-prod-assets.s3.amazonaws.com/') });
    if (/jquery-3\.5\.1/.test(u)) return r.fulfill({ body: jq, contentType: 'application/javascript' });
    if (/webflow-badge/.test(u)) return r.abort(); return r.continue(); });
  if (unlocked) await c.addInitScript(() => { try { localStorage.setItem('mas26_access', 'f730a2591bc54c5642aa42a7bedf46c5486f007b476e4cc94a02fe80e2c56327'); } catch (e) {} });
  await c.addCookies([{ name: 'mas26_consent', value: encodeURIComponent(JSON.stringify({ v: 2, ts: new Date().toISOString(), necessary: true })), url: B }]);
  const p = await c.newPage();
  for (let i = 0; i < 4; i++) { try { await p.goto(B + path, { waitUntil: 'load', timeout: 45000 }); break; } catch (e) { if (i === 3) throw e; } }
  await p.addStyleTag({ content: `
    :root,body{--brandcolor:${k.main} !important}
    .w-webflow-badge{display:none !important}
    #mas-embargo{background:${k.main} !important}
    .washed-grey{background-color:${k.soft} !important}
    [data-bb-link].is-current{border-color:${k.main} !important}
    .header-background{background-color:${k.main} !important}
    #stl-gate{background:${k.main} !important}
    #stl-gate button{color:${k.main} !important}
    .badge.red,.testimonial-badge.documento{background-color:${k.main}1a !important}
  ` });
  await p.evaluate((src) => { document.querySelectorAll('img.event-image').forEach((i) => { i.removeAttribute('srcset'); i.src = src; }); const h = document.querySelector('.header-background.event-page'); if (h) { h.style.backgroundImage = 'url("' + src + '")'; h.style.backgroundSize = 'cover'; h.style.backgroundPosition = 'center'; h.querySelectorAll('img').forEach((i) => { i.removeAttribute('srcset'); i.src = src; }); } }, 'data:image/png;base64,' + fs.readFileSync(new URL('./kv-' + v + '.png', import.meta.url)).toString('base64'));
  await p.waitForTimeout(2500);
  await p.screenshot({ path: OUT + name }); await c.close(); console.log(name);
}
for (const v of ['v1', 'v2']) {
  const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.setContent('<body style="margin:0">' + fs.readFileSync(new URL('./kv-' + v + '.svg', import.meta.url), 'utf8') + '</body>'); await pg.screenshot({ path: new URL('./kv-' + v + '.png', import.meta.url).pathname }); await pg.close();
  await shot(v, '/', `${v}-tridente-evento-home.png`, true);
  await shot(v, '/events/grecale', `${v}-tridente-evento-modello.png`, true);
  await shot(v, '/', `${v}-tridente-evento-telefono.png`, true, { width: 390, height: 844 }, true);
}
await b.close();
