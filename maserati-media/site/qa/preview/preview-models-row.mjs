import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)(process.env.PWPATH);
import fs from 'fs';
const B = 'https://fastlane-2030-maserati-day-2026.webflow.io', OUT = process.env.OUT + '/', M = 'https://mas26-media.toolpress.workers.dev/upload/models/';
const jq = fs.readFileSync(new URL('./lib/jquery/dist/jquery.min.js', import.meta.url));
const b = await chromium.launch();
async function shot(path, name, vp, mobile) {
  const c = await b.newContext({ ignoreHTTPSErrors: true, viewport: vp, deviceScaleFactor: 2, isMobile: !!mobile, hasTouch: !!mobile });
  await c.route('**/*', (r) => { const u = r.request().url();
    if (u.includes('cdn.prod.website-files.com/')) return r.continue({ url: u.replace('https://cdn.prod.website-files.com/', 'https://webflow-prod-assets.s3.amazonaws.com/') });
    if (/jquery-3\.5\.1/.test(u)) return r.fulfill({ body: jq, contentType: 'application/javascript' });
    if (/webflow-badge/.test(u)) return r.abort(); return r.continue(); });
  await c.addInitScript(() => { try { localStorage.setItem('mas26_access', 'f730a2591bc54c5642aa42a7bedf46c5486f007b476e4cc94a02fe80e2c56327'); } catch (e) {} });
  await c.addCookies([{ name: 'mas26_consent', value: encodeURIComponent(JSON.stringify({ v: 2, ts: new Date().toISOString(), necessary: true })), url: B }]);
  const p = await c.newPage();
  for (let i = 0; i < 4; i++) { try { await p.goto(B + path, { waitUntil: 'load', timeout: 45000 }); break; } catch (e) { if (i === 3) throw e; } }
  await p.addStyleTag({ content: `.w-webflow-badge{display:none !important}
    [data-bb-logo]{display:block;height:46px;width:auto;max-width:130px;object-fit:contain}
    [data-bb-link].has-logo [data-bb-name]{display:block !important;font-size:11px}
    [data-brandbar].has-renders [data-bb-link]{flex-direction:column;gap:2px;height:82px;min-width:120px}
    [data-brandbar].has-renders [data-bb-home]{height:82px}
    @media (max-width:767px){[data-bb-logo]{height:36px;max-width:100px}[data-brandbar].has-renders [data-bb-link]{height:68px;min-width:96px}[data-brandbar].has-renders [data-bb-home]{height:68px}}` });
  await p.evaluate((M) => { const bar = document.querySelector('[data-brandbar]'); if (!bar) return; bar.classList.add('has-renders');
    bar.querySelectorAll('[data-bb-link]').forEach((a) => { const s = (a.querySelector('[data-bb-slug]') || {}).textContent || ''; if (!['grecale', 'granturismo', 'grancabrio', 'gt2-stradale'].includes(s.trim())) return;
      let i = a.querySelector('[data-bb-logo]'); i.removeAttribute('srcset'); i.classList.remove('w-dyn-bind-empty'); i.src = M + s.trim() + '.webp?v=3'; i.style.display = 'block'; a.classList.add('has-logo'); }); window.dispatchEvent(new Event('resize')); }, M);
  await p.waitForTimeout(3000);
  await p.screenshot({ path: OUT + name }); await c.close(); console.log(name);
}
await shot('/events/grecale', 'riga-modelli-render.png', { width: 1440, height: 900 });
await shot('/events/grecale', 'riga-modelli-render-telefono.png', { width: 390, height: 844 }, true);
await b.close();
