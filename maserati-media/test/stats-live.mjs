// Live check of the visit counter on the staging site: PW=<upload password> PWPATH=<path of playwright> node test/stats-live.mjs
import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)(process.env.PWPATH);
import fs from 'fs';
const B = 'https://fastlane-2030-maserati-day-2026.webflow.io', W = 'https://mas26-media.toolpress.workers.dev';
const jq = fs.readFileSync(new URL('./lib/jquery/dist/jquery.min.js', import.meta.url));
const tok = (await (await fetch(W + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: process.env.PW }) })).json()).token;
const get = async () => (await (await fetch(W + '/api/admin/stats', { headers: { authorization: 'Bearer ' + tok } })).json()).totals;
const before = await get();
const b = await chromium.launch();
const c = await b.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 800 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' });
const sent = [];
await c.route('**/*', (r) => { const u = r.request().url();
  if (u.endsWith('/t') && r.request().method() === 'POST') sent.push(r.request().postData());
  if (u.includes('cdn.prod.website-files.com/')) return r.continue({ url: u.replace('https://cdn.prod.website-files.com/', 'https://webflow-prod-assets.s3.amazonaws.com/') });
  if (/jquery-3\.5\.1/.test(u)) return r.fulfill({ body: jq, contentType: 'application/javascript' }); return r.continue(); });
await c.addInitScript(() => { try { localStorage.setItem('mas26_access', 'f730a2591bc54c5642aa42a7bedf46c5486f007b476e4cc94a02fe80e2c56327'); } catch (e) {} });
await c.addCookies([{ name: 'mas26_consent', value: encodeURIComponent(JSON.stringify({ v: 2, ts: new Date().toISOString(), necessary: true })), url: B }]);
const p = await c.newPage();
await p.goto(B + '/?src=qr', { waitUntil: 'load' }); await p.waitForTimeout(1500);        // QR visit
await p.click('a[href="/models"]'); await p.waitForLoadState('load'); await p.waitForTimeout(1500); // inner page
await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1500);                       // reload: page view only
const p2 = await c.newPage(); await p2.goto(B + '/events/grecale', { waitUntil: 'load' }); await p2.waitForTimeout(1500); // direct link visit
console.log('beacons', JSON.stringify(sent));
console.log('cookies', (await c.cookies()).map((x) => x.name).join(','), '| storage', await p.evaluate(() => Object.keys(localStorage).join(',') + ' / ' + Object.keys(sessionStorage).join(',')));
await b.close();
let after; for (let i = 0; i < 10; i++) { after = await get(); if (after.views >= before.views + 4) break; await new Promise((r) => setTimeout(r, 1500)); }
const d = Object.fromEntries(Object.keys(after).map((k) => [k, after[k] - before[k]]));
console.log('delta', JSON.stringify(d));
console.log(d.visits === 2 && d.qr === 1 && d.link === 1 && d.views === 4 ? 'PASS' : 'FAIL');
