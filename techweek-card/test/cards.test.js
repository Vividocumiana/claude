import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { build } from '../build.js';
import { PEOPLE } from '../people/index.js';
import { renderWelcomeEmail } from '../api/_lib/email.js';

const files = (dir) => readdirSync(dir, { recursive: true, withFileTypes: true }).filter((d) => d.isFile()).map((d) => join(d.parentPath, d.name));

for (const person of Object.values(PEOPLE)) {
  test(`${person.id}: builds with every placeholder filled`, () => {
    const out = build(person, mkdtempSync(join(tmpdir(), `card-${person.id}-`)));
    for (const f of ['index.html', 'me.html', 'qr.html']) {
      const html = readFileSync(join(out, f), 'utf8');
      assert.doesNotMatch(html, /\{\{\w+\}\}/, f);
      assert.match(html, new RegExp(person.firstName), f);
    }
    assert.match(readFileSync(join(out, person.vcf.path), 'utf8'), /^BEGIN:VCARD/);
  });
}

test("alessandro: nothing from Samuele's card leaks into the build or the email", () => {
  const out = build(PEOPLE.alessandro, mkdtempSync(join(tmpdir(), 'card-alessandro-')));
  const banned = /samuele|poggio|lisbon|tech week|\bnest\b|nitido/i;
  for (const f of files(out)) assert.doesNotMatch(readFileSync(f, 'latin1'), banned, f);

  const mail = renderWelcomeEmail({ name: 'Mario Rossi' }, PEOPLE.alessandro);
  for (const part of [mail.subject, mail.html, mail.text]) assert.doesNotMatch(part, banned);
  assert.match(mail.html, /alessandromartinengov/);
});
