// Minimal Notion REST client (no SDK, zero dependencies).
// Database schema expected (property names are case-sensitive):
//   Name (title) · Email (email) · Company (rich_text) · Event (select)
//   Status (select: New / Follow-up / Call booked / Done)
//   Notes (rich_text) · Email sent (checkbox) · Source (select: QR / Manual)
//   Created (created_time)

const NOTION_VERSION = '2022-06-28';

// Notion is optional: a card without NOTION_TOKEN + NOTION_DATABASE_ID only sends the email.
export const notionEnabled = () => Boolean(process.env.NOTION_TOKEN && process.env.NOTION_DATABASE_ID);
export const STATUSES = ['New', 'Follow-up', 'Call booked', 'Done'];

async function notion(path, { method = 'GET', body } = {}) {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Notion ${method} ${path} → ${res.status}: ${data.message || 'unknown error'}`);
  }
  return data;
}

const text = (s) => [{ type: 'text', text: { content: String(s || '').slice(0, 2000) } }];
const plain = (rt) => (rt || []).map((t) => t.plain_text).join('');

function toContact(page) {
  const p = page.properties;
  return {
    id: page.id,
    name: plain(p.Name?.title),
    email: p.Email?.email || '',
    company: plain(p.Company?.rich_text),
    event: p.Event?.select?.name || '',
    status: p.Status?.select?.name || 'New',
    notes: plain(p.Notes?.rich_text),
    emailSent: Boolean(p['Email sent']?.checkbox),
    source: p.Source?.select?.name || '',
    created: p.Created?.created_time || page.created_time,
    url: page.url,
  };
}

export async function findByEmail(email) {
  const data = await notion(`/databases/${process.env.NOTION_DATABASE_ID}/query`, {
    method: 'POST',
    body: { filter: { property: 'Email', email: { equals: email } }, page_size: 1 },
  });
  return data.results[0] ? toContact(data.results[0]) : null;
}

export async function createContact({ name, email, company, notes, source = 'QR' }) {
  const page = await notion('/pages', {
    method: 'POST',
    body: {
      parent: { database_id: process.env.NOTION_DATABASE_ID },
      properties: {
        Name: { title: text(name || email) },
        Email: { email },
        Company: { rich_text: text(company) },
        Event: { select: { name: process.env.EVENT_NAME || 'Tech Week' } },
        Status: { select: { name: 'New' } },
        Notes: { rich_text: text(notes) },
        Source: { select: { name: source } },
        'Email sent': { checkbox: false },
      },
    },
  });
  return toContact(page);
}

export async function updateContact(id, { notes, status, emailSent }) {
  const properties = {};
  if (notes !== undefined) properties.Notes = { rich_text: text(notes) };
  if (status !== undefined) {
    if (!STATUSES.includes(status)) throw new Error(`Invalid status: ${status}`);
    properties.Status = { select: { name: status } };
  }
  if (emailSent !== undefined) properties['Email sent'] = { checkbox: Boolean(emailSent) };
  const page = await notion(`/pages/${id}`, { method: 'PATCH', body: { properties } });
  return toContact(page);
}

export async function listContacts() {
  const contacts = [];
  let cursor;
  do {
    const data = await notion(`/databases/${process.env.NOTION_DATABASE_ID}/query`, {
      method: 'POST',
      body: {
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      },
    });
    contacts.push(...data.results.map(toContact));
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return contacts;
}
