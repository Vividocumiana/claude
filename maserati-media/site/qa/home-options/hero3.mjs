import { createRequire } from 'module'; const { chromium } = createRequire(import.meta.url)(process.env.PWPATH);
import fs from 'fs';
const B = 'https://fastlane-2030-maserati-day-2026.webflow.io', OUT = process.env.OUT + '/';
const jq = fs.readFileSync(new URL('./lib/jquery/dist/jquery.min.js', import.meta.url));
const BASE = '.w-webflow-badge{display:none !important} .h1-heading br{display:none}';
const V = {
  A: `/* A – logo as the mark above the title */
    .header-title-left > .badge{display:none}
    .h1-heading{display:flex;flex-direction:column-reverse;align-items:flex-start}
    .hero-day-logo{width:250px !important;max-width:70% !important;margin:0 0 36px !important}
    @media (max-width:767px){.h1-heading{align-items:center}.hero-day-logo{width:210px !important;margin:0 auto 28px !important}}`,
  B: `/* B – night-blue hero, white logo as the title, "Press Kit" as a small label */
    .section-large.washed-grey.header{background-color:#131B2C !important}
    .header-title-left > .badge{display:none}
    .h1-heading{font-size:15px !important;line-height:1.4 !important;letter-spacing:.3em;text-transform:uppercase;font-weight:500;color:rgba(255,255,255,.72) !important}
    .hero-day-logo{filter:brightness(0) invert(1);width:430px !important;max-width:86% !important;margin:26px 0 30px !important}
    .header-left-wrapper .paragraph-regular{color:rgba(255,255,255,.82) !important}
    .header-feature-item .sub-heading-small{color:#fff !important}
    .header-feature-item .paragraph-small{color:rgba(255,255,255,.6) !important}
    .header-feature-item .icon-wrap-small{background:rgba(255,255,255,.08) !important;border-color:rgba(255,255,255,.14) !important;box-shadow:none !important;color:#fff !important}
    .header-feature-item .icon-wrap-small svg, .header-feature-item .icon-wrap-small svg *{color:#fff !important;fill:#fff}
    .header-button-group .button-primary{background:#fff !important;color:#131B2C !important;border-color:#fff !important}
    .header-button-group .button-primary svg{color:#131B2C !important}
    .header-button-group .button-outline{background:transparent !important;color:#fff !important;border-color:rgba(255,255,255,.4) !important;box-shadow:none !important}
    @media (max-width:767px){.hero-day-logo{width:270px !important;margin:22px auto 26px !important}}`,
  C: `/* C – centred composition, logo as the title */
    .header-title-left > .badge{display:none}
    .header-left-wrapper,.header-content-top,.header-title-left{align-items:center !important;text-align:center}
    .header-title-left{display:flex;flex-direction:column}
    .h1-heading{font-size:15px !important;line-height:1.4 !important;letter-spacing:.3em;text-transform:uppercase;font-weight:500;color:#8c8c8c !important;text-align:center;width:100%}
    .hero-day-logo{width:470px !important;max-width:90% !important;margin:28px auto 30px !important}
    .header-left-wrapper .max-width-small{margin-left:auto;margin-right:auto}
    .header-left-wrapper .paragraph-regular{text-align:center}
    .header-features{display:none !important}
    .header-button-group{justify-content:center !important;margin-top:36px}
    @media (max-width:767px){.hero-day-logo{width:280px !important}}`,
};
const b = await chromium.launch();
for (const [k, css] of Object.entries(V)) for (const [suf, vp, mob] of [['', { width: 1440, height: 900 }, false], ['-telefono', { width: 390, height: 844 }, true]]) {
  const c = await b.newContext({ ignoreHTTPSErrors: true, viewport: vp, deviceScaleFactor: 2, isMobile: mob, hasTouch: mob });
  await c.route('**/*', (r) => { const u = r.request().url();
    if (u.endsWith('/t')) return r.abort();
    if (u.includes('cdn.prod.website-files.com/')) return r.continue({ url: u.replace('https://cdn.prod.website-files.com/', 'https://webflow-prod-assets.s3.amazonaws.com/') });
    if (/jquery-3\.5\.1/.test(u)) return r.fulfill({ body: jq, contentType: 'application/javascript' });
    if (/webflow-badge/.test(u)) return r.abort(); return r.continue(); });
  await c.addCookies([{ name: 'mas26_consent', value: encodeURIComponent(JSON.stringify({ v: 2, ts: new Date().toISOString(), necessary: true })), url: B }]);
  const p = await c.newPage(); for (let i = 0; i < 4; i++) { try { await p.goto(B + '/', { waitUntil: 'load', timeout: 45000 }); break; } catch (e) { if (i === 3) throw e; } }
  await p.addStyleTag({ content: BASE + css }); await p.waitForTimeout(1800);
  await p.screenshot({ path: OUT + 'home-' + k + suf + '.png' }); await c.close(); console.log(k + suf);
}
await b.close();
