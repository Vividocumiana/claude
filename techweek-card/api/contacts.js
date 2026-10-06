// Private endpoint for Samuele's view (/me), protected by ADMIN_PIN (x-pin header).
//   GET   → list all contacts (newest first)
//   POST  → add a contact manually { name, email, company, notes, sendEmail }
//   PATCH → update { id, notes?, status? } or send the welcome email { id, sendEmail: true }
import { listContacts, createContact, updateContact, findByEmail } from './_lib/notion.js';
import { sendWelcomeEmail } from './_lib/email.js';
import { readJson, send, checkPin, clean, EMAIL_RE } from './_lib/http.js';

export default async function handler(req, res) {
  if (!checkPin(req)) return send(res, 401, { error: 'Wrong PIN' });

  try {
    if (req.method === 'GET') {
      return send(res, 200, { contacts: await listContacts() });
    }

    const body = await readJson(req);

    if (req.method === 'POST') {
      const email = clean(body.email, 254).toLowerCase();
      const name = clean(body.name, 100);
      if (!name && !email) return send(res, 400, { error: 'Add at least a name or an email.' });
      if (email && !EMAIL_RE.test(email)) return send(res, 400, { error: 'Invalid email.' });
      if (email && (await findByEmail(email))) return send(res, 409, { error: 'Contact already saved.' });

      let contact = await createContact({
        name,
        email: email || null,
        company: clean(body.company, 150),
        notes: clean(body.notes, 2000),
        source: 'Manual',
      });
      let emailError;
      if (body.sendEmail && email) {
        try {
          await sendWelcomeEmail({ name, email });
          contact = await updateContact(contact.id, { emailSent: true });
        } catch (err) {
          console.error(err);
          emailError = err.message;
        }
      }
      return send(res, 201, { contact, emailError });
    }

    if (req.method === 'PATCH') {
      if (!body.id) return send(res, 400, { error: 'Missing id' });
      if (body.sendEmail) {
        const c = (await listContacts()).find((x) => x.id === String(body.id));
        if (!c?.email) return send(res, 400, { error: 'This contact has no email.' });
        await sendWelcomeEmail({ name: c.name, email: c.email });
        return send(res, 200, { contact: await updateContact(c.id, { emailSent: true }) });
      }
      const contact = await updateContact(String(body.id), {
        notes: body.notes === undefined ? undefined : clean(body.notes, 2000),
        status: body.status,
      });
      return send(res, 200, { contact });
    }

    return send(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return send(res, 500, { error: err.message });
  }
}
