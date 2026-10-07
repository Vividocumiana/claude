// vCard 3.0, built from a person's config. Photo embedded as base64 JPEG, the same
// way Samuele's hand-made samuele.vcf does it (PHOTO;ENCODING=b;TYPE=JPEG).

const escText = (s) => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

// Lines longer than 75 octets continue on the next line after a single space (RFC 2425 §5.8.1).
function fold(line) {
  const parts = [];
  for (let i = 0; i < line.length; i += parts.length ? 74 : 75) parts.push(line.slice(i, i + (parts.length ? 74 : 75)));
  return parts.join('\r\n ');
}

export function renderVcard(p, photoJpeg) {
  const g = p.vcf.generate;
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escText(p.lastName)};${escText(p.firstName)};;;`,
    `FN:${escText(p.name)}`,
    `ORG:${escText(g.org)}`,
    `TITLE:${escText(g.title)}`,
    `TEL;TYPE=CELL:${p.phone}`,
    `EMAIL;TYPE=INTERNET,WORK:${p.email}`,
    ...g.urls.map((u) => `URL:${u}`),
    `X-SOCIALPROFILE;TYPE=linkedin:${p.linkedin}`,
    ...(g.city ? [`ADR;TYPE=WORK:;;;${escText(g.city)};;;${escText(g.country || '')}`] : []),
    ...(g.note ? [`NOTE:${escText(g.note)}`] : []),
    ...(photoJpeg ? [`PHOTO;ENCODING=b;TYPE=JPEG:${photoJpeg.toString('base64')}`] : []),
    'END:VCARD',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}
