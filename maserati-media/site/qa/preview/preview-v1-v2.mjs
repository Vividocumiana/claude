import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)(process.env.PWPATH);
import fs from 'fs';
const B = 'https://stellantis-mondial-auto-p-ca5c2043669e4.webflow.io', OUT = process.env.OUT + '/';
const jq = fs.readFileSync(new URL('./lib/jquery/dist/jquery.min.js', import.meta.url));
const ART = 'data:image/svg+xml;base64,' + fs.readFileSync(new URL('./trident-art.svg', import.meta.url)).toString('base64');
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
    .header-background.event-page{background-image:url("${ART}") !important;background-repeat:no-repeat !important;background-position:center !important;background-size:auto 78% !important}
    .header-background.event-page > *{display:none !important}
    .header-background:not(.event-page){background-image:url("${ART}") !important;background-repeat:no-repeat !important;background-position:right -40px bottom -150px !important;background-size:auto 62% !important}
    #stl-gate{background:${k.main} !important}
    #stl-gate .l{height:190px !important;margin-bottom:28px !important}
    #stl-gate button{color:${k.main} !important}
    .badge.red,.testimonial-badge.documento{background-color:${k.main}1a !important}
  ` });
  await p.evaluate((art) => { const i = document.querySelector('#stl-gate .l'); if (i) i.src = art; }, ART);
  await p.waitForTimeout(2500);
  await p.screenshot({ path: OUT + name }); await c.close(); console.log(name);
}
for (const v of ['v1', 'v2']) {
  await shot(v, '/', `${v}-tridente-home.png`, true);
  await shot(v, '/events/grecale', `${v}-tridente-modello.png`, true);
  await shot(v, '/', `${v}-tridente-password.png`, false, { width: 1280, height: 800 });
  await shot(v, '/events/grecale', `${v}-tridente-telefono.png`, true, { width: 390, height: 844 }, true);
}
await b.close();
