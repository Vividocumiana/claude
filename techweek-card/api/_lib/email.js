// "Nice to meet you" email: table-based HTML with inline styles so it renders
// the same in Gmail, Apple Mail and Outlook. Whose card it is comes from CARD (people/).
import { getPerson } from '../../people/index.js';

const esc = (s) =>
  String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || '';
}

export function renderWelcomeEmail({ name }, person = getPerson()) {
  const p = person;
  const m = p.mail;
  const base = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  const booking = process.env.BOOKING_URL || p.bookingUrl || `${base}/#book`;
  const event = m.usesEvent ? process.env.EVENT_NAME || 'Tech Week' : '';
  const first = esc(firstName(name));
  const hello = first ? `Hey ${first}, nice to meet you` : 'Nice to meet you';
  const at = event ? ` at ${event}` : '';

  const subject = `${first ? `${firstName(name)}, nice` : 'Nice'} to meet you${at} 👋`;

  const textBody = [
    `${hello}${at}!`,
    '',
    ...m.text({ event, booking }),
    '',
    `My card: ${base}`,
    ...m.textLinks.map(([label, href]) => `${label}: ${href}`),
    '',
    'Talk soon,',
    p.firstName,
  ].join('\n');

  const font = "Geist,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
  const company = (logo, name, role, line, href) => `
        <tr><td style="padding:12px 0;border-top:1px solid #2D2D31;">
          ${href ? `<a href="${href}" style="text-decoration:none;color:#F4F3EF;display:block;">` : '<div style="color:#F4F3EF;">'}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td width="52" valign="middle"><img src="${base}/logos/${logo}" width="40" height="40" alt="${name}" style="display:block;width:40px;height:40px;border-radius:11px;"></td>
            <td valign="middle" style="font-family:${font};">
              <div style="font-size:15px;font-weight:500;color:#F4F3EF;line-height:1.3;">${name}<span style="font-size:13px;font-weight:400;color:#9A999E;">&nbsp;&nbsp;${role}</span></div>
              <div style="font-size:13px;color:#9A999E;line-height:1.35;">${line}</div>
            </td>
            <td width="20" valign="middle" align="right" style="font-family:${font};font-size:15px;color:#9A999E;">${href ? '&#8599;' : ''}</td>
          </tr></table>${href ? '</a>' : '</div>'}
        </td></tr>`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#F1F0EB;">
<div style="display:none;max-height:0;overflow:hidden;">${esc(m.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F0EB;">
<tr><td align="center" style="padding:28px 12px 36px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;">

    <!-- Card: dark bezel, photo, panel -->
    <tr><td style="background:#121214;border-radius:36px;padding:7px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="border-radius:29px 29px 0 0;overflow:hidden;line-height:0;">
          <img src="${base}${p.photoLg}" width="406" alt="${esc(p.name)}" style="display:block;width:100%;max-width:406px;height:auto;border-radius:29px 29px 0 0;">
        </td></tr>
        <tr><td style="background:#1E1E21;border-radius:0 0 29px 29px;padding:20px 20px 22px;font-family:${font};color:#F4F3EF;">
          <div style="font-size:21px;font-weight:600;letter-spacing:-0.03em;line-height:1.2;">${esc(p.name)}</div>
          <div style="font-size:14px;color:#9A999E;margin-top:2px;">${esc(p.role)}</div>

          <div style="font-size:24px;font-weight:600;letter-spacing:-0.03em;line-height:1.2;margin-top:22px;">${hello}${esc(at)}.</div>
          <div style="font-size:16px;line-height:1.55;color:#C9C8CC;margin-top:10px;">${m.intro}</div>

          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px;"><tr>
            <td style="background:${m.button?.bg || '#FFFFFF'};border-radius:9999px;"><a href="${booking}" style="display:inline-block;padding:14px 26px;font-family:${font};font-size:15px;font-weight:500;color:${m.button?.color || '#111111'};text-decoration:none;">Book a call &rarr;</a></td>
          </tr></table>

          <div style="font-family:'Geist Mono',ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#9A999E;margin-top:28px;">Companies</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
            ${p.companies.map((c) => company(c.emailLogo, esc(c.name), esc(c.role), esc(c.line), c.emailHref || c.href)).join('\n            ')}
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;"><tr>
            <td width="50%" style="padding-right:4px;"><a href="${p.linkedin}" style="display:block;text-align:center;background:#2A2A2E;border-radius:14px;padding:12px;font-family:${font};font-size:14px;font-weight:500;color:#F4F3EF;text-decoration:none;">LinkedIn</a></td>
            <td width="50%" style="padding-left:4px;"><a href="${p.whatsapp}" style="display:block;text-align:center;background:#2A2A2E;border-radius:14px;padding:12px;font-family:${font};font-size:14px;font-weight:500;color:#F4F3EF;text-decoration:none;">WhatsApp</a></td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>

    <tr><td align="center" style="padding:22px 8px 0;font-family:${font};font-size:13px;line-height:1.6;color:#7A7976;">
      Just reply to this email to reach me directly.<br>
      <a href="${base}" style="color:#141416;">My card</a> &nbsp;·&nbsp; <a href="${m.site.href}" style="color:#141416;">${esc(m.site.label)}</a>
    </td></tr>

  </table>
</td></tr>
</table>
</body></html>`;

  return { subject, html, text: textBody };
}

// The vCard is attached by URL: Resend downloads it from the deployed site (PUBLIC_URL).
export function vcardAttachment(person = getPerson()) {
  const base = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  if (!person.mail.attachVcard || !base) return undefined;
  return [{ path: `${base}${person.vcf.path}`, filename: person.vcf.filename }];
}

export async function sendWelcomeEmail({ name, email }) {
  const { subject, html, text } = renderWelcomeEmail({ name });
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [email],
      reply_to: process.env.MAIL_REPLY_TO || undefined,
      subject,
      html,
      text,
      attachments: vcardAttachment(),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend → ${res.status}: ${data.message || 'unknown error'}`);
  return data.id;
}
