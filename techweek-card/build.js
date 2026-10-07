// Renders one person's card into dist/ (Vercel outputDirectory).
//   CARD=alessandro node build.js     (default CARD: samuele)
// dist/ = public/ (shared) + people/<id>/public/ (photos, logos, vCard) + templates/*.html rendered.
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPerson } from './people/index.js';
import { renderVcard } from './lib/vcard.js';

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, 'dist');

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const PIN_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';

function pill({ label, img, icon, href }) {
  const inner = (img ? `<img src="${esc(img)}" alt="">` : icon === 'pin' ? PIN_ICON : '') + esc(label);
  return href
    ? `    <a class="pill" href="${esc(href)}" target="_blank" rel="noopener">${inner}</a>`
    : `    <span class="pill">${inner}</span>`;
}

// Without href the row stays an <a> with no link and no arrow, like Samuele's Nest fallback.
function company({ id, href, logo, logoClass, name, role, line }) {
  const attrs = (id ? ` id="${esc(id)}"` : '') + (href ? ` href="${esc(href)}" target="_blank" rel="noopener"` : '');
  return [
    `        <a class="co"${attrs}>`,
    `          <span class="${logoClass ? `logo ${logoClass}` : 'logo'}"><img src="${esc(logo)}" alt=""></span>`,
    `          <span class="txt"><b>${esc(name)}<small>${esc(role)}</small></b><span>${esc(line)}</span></span>`,
    ...(href ? ['          <span class="go">↗</span>'] : []),
    '        </a>',
  ].join('\n');
}

export function pageValues(p) {
  if (/['\\]/.test(p.bookingUrl)) throw new Error('bookingUrl goes into a JS string: no quotes or backslashes');
  const text = {
    title: p.title, description: p.description, ogDescription: p.ogDescription, ogImage: p.photoLg,
    name: p.name, firstName: p.firstName, role: p.role, bio: p.bio, photo: p.photo, photoLg: p.photoLg,
    linkedin: p.linkedin, whatsapp: p.whatsapp, vcfPath: p.vcf.path, consentFrom: p.consentFrom,
    contactsLabel: p.contactsLabel, email: p.email, phone: p.phone,
    vcardN: `${p.lastName};${p.firstName};;;`, qrOrg: p.qr.org, qrTitle: p.qr.title,
  };
  const raw = {
    bookingUrl: p.bookingUrl,
    robotsMeta: p.noindex ? '<meta name="robots" content="noindex, nofollow">' : '',
    themeColorMeta: p.themeColor
      ? `<meta name="theme-color" content="${esc(p.themeColor)}">`
      : '<meta name="theme-color" content="#F1F0EB" media="(prefers-color-scheme: light)">\n<meta name="theme-color" content="#0B0B0C" media="(prefers-color-scheme: dark)">',
    themeCss: p.themeCss || '',
    topPills: p.pills.map(pill).join('\n'),
    companies: p.companies.map(company).join('\n'),
    sign: [
      '  <div class="sign">',
      `    <img src="${esc(p.sign.logo)}" alt="">`,
      `    <div><b>${esc(p.sign.title)}</b><span>${esc(p.sign.line)}</span></div>`,
      '  </div>',
    ].join('\n'),
    scriptConfig: p.scriptConfig || '',
    scriptExtra: p.scriptExtra || '',
  };
  return { ...Object.fromEntries(Object.entries(text).map(([k, v]) => [k, esc(v)])), ...raw };
}

// {{key}} → value. A line that is only a placeholder rendering to '' is dropped entirely.
export function render(template, values) {
  return template
    .split('\n')
    .flatMap((line) => {
      const only = line.match(/^\{\{(\w+)\}\}$/);
      if (only && values[only[1]] === '') return [];
      return [line.replace(/\{\{(\w+)\}\}/g, (_, k) => {
        if (!(k in values)) throw new Error(`Template placeholder {{${k}}} has no value`);
        return values[k];
      })];
    })
    .join('\n');
}

export function build(person = getPerson(), dest = out) {
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  cpSync(join(root, 'public'), dest, { recursive: true });
  const own = join(root, 'people', person.id, 'public');
  if (existsSync(own)) cpSync(own, dest, { recursive: true });

  const values = pageValues(person);
  for (const f of readdirSync(join(root, 'templates'))) {
    writeFileSync(join(dest, f), render(readFileSync(join(root, 'templates', f), 'utf8'), values));
  }

  const g = person.vcf.generate;
  if (g) {
    const photo = g.photo ? readFileSync(join(root, 'people', person.id, g.photo)) : null;
    writeFileSync(join(dest, person.vcf.path), renderVcard(person, photo));
  }
  if (person.noindex) writeFileSync(join(dest, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  return dest;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const person = getPerson();
  build(person);
  console.log(`Built ${person.name}'s card into dist/`);
}
