// Public endpoint: someone scanned the QR and left their email.
// Saves the contact in Notion and sends the "Nice to meet you" email once.
import { findByEmail, createContact, updateContact } from './_lib/notion.js';
import { sendWelcomeEmail } from './_lib/email.js';
import { readJson, send, clean, EMAIL_RE } from './_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  let body;
  try {
    body = await readJson(req);
  } catch {
    return send(res, 400, { error: 'Invalid JSON' });
  }

  // Honeypot: bots fill every field, humans never see this one.
  if (body.website) return send(res, 200, { ok: true });

  const email = clean(body.email, 254).toLowerCase();
  const name = clean(body.name, 100);
  const company = clean(body.company, 150);
  if (!EMAIL_RE.test(email)) return send(res, 400, { error: 'Please enter a valid email.' });
  if (!body.consent) return send(res, 400, { error: 'Please tick the consent box.' });

  try {
    const existing = await findByEmail(email);
    if (existing?.emailSent) return send(res, 200, { ok: true, already: true });

    const contact = existing || (await createContact({ name, email, company, source: 'QR' }));
    await sendWelcomeEmail({ name: name || contact.name, email });
    await updateContact(contact.id, { emailSent: true });
    return send(res, 200, { ok: true });
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: 'Something went wrong. Try again in a moment.' });
  }
}
