// "Nice to meet you" email: table-based HTML with inline styles so it renders
// the same in Gmail, Apple Mail and Outlook.

const esc = (s) =>
  String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || '';
}

export function renderWelcomeEmail({ name }) {
  const base = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  const booking = process.env.BOOKING_URL || `${base}/#book`;
  const event = process.env.EVENT_NAME || 'Tech Week';
  const first = esc(firstName(name));
  const hello = first ? `Hey ${first}, nice to meet you` : 'Nice to meet you';

  const subject = `${first ? `${firstName(name)}, nice` : 'Nice'} to meet you at ${event} 👋`;

  const textBody = [
    `${hello} at ${event}!`,
    '',
    `I'm Samuele: I run operations at Vivido and build Nest on the side.`,
    `If what we talked about at ${event} is worth 20 minutes, grab a slot here: ${booking}`,
    '',
    'Vivido helps founders validate ideas fast, without wasting budget or time.',
    'Product design, websites and prototypes for startups and scale-ups.',
    '',
    `My card: ${base}`,
    'LinkedIn: https://www.linkedin.com/in/samuele-poggio-48b9a0219/',
    'Vivido: https://vivido.world',
    '',
    'Talk soon,',
    'Samuele',
  ].join('\n');

  const btn = (href, label, bg, color = '#FFFFFF') =>
    `<a href="${href}" style="display:inline-block;background:${bg};color:${color};text-decoration:none;font-weight:600;font-size:15px;padding:14px 26px;border-radius:9999px;">${label}</a>`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#F5F5F0;font-family:Poppins,'Helvetica Neue',Arial,sans-serif;color:#1D1D1F;">
<div style="display:none;max-height:0;overflow:hidden;">If what we talked about is worth 20 minutes, grab a slot.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F0;padding:32px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

    <!-- Card -->
    <tr><td style="background:#644BF6;background-image:linear-gradient(135deg,#644BF6 0%,#3B1FC2 100%);border-radius:28px;padding:36px 32px;color:#FFFFFF;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="72" valign="middle"><img src="${base}/samuele.jpg" width="64" height="64" alt="Samuele" style="display:block;width:64px;height:64px;border-radius:50%;border:3px solid #FFFFFF;object-fit:cover;"></td>
        <td valign="middle" style="padding-left:14px;">
          <div style="font-size:18px;font-weight:700;line-height:1.2;">Samuele Poggio</div>
          <div style="font-size:13px;opacity:.85;line-height:1.4;">Co-founder · Vivido &nbsp;|&nbsp; Founder · Nest</div>
        </td>
      </tr></table>
      <div style="height:28px;"></div>
      <div style="font-size:30px;line-height:1.1;font-weight:800;letter-spacing:-0.02em;">${hello} at <span style="color:#FFD300;">${esc(event)}.</span></div>
      <div style="height:14px;"></div>
      <div style="font-size:16px;line-height:1.6;opacity:.95;">I'm Samuele: I run operations at Vivido and build Nest on the side. If what we talked about is worth 20 minutes, grab a slot below.</div>
      <div style="height:26px;"></div>
      ${btn(booking, 'Book a call →', '#EC612A')}
    </td></tr>

    <tr><td style="height:16px;"></td></tr>

    <!-- What we do -->
    <tr><td style="background:#FFFFFF;border-radius:24px;padding:28px 32px;">
      <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#644BF6;">Vivido</div>
      <div style="font-size:16px;line-height:1.6;margin-top:6px;">Vivido helps founders validate ideas fast, without wasting budget or time. Product design, websites and prototypes for startups and scale-ups.</div>
      <div style="height:18px;"></div>
      <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#EC612A;">Nest</div>
      <div style="font-size:16px;line-height:1.6;margin-top:6px;">Your operations team, without hiring one. I help agencies build systems that run without them.</div>
      <div style="height:22px;"></div>
      ${btn('https://vivido.world', 'See Vivido', '#1D1D1F')}
      &nbsp;
      ${btn('https://www.linkedin.com/in/samuele-poggio-48b9a0219/', 'LinkedIn', '#F2F2F0', '#1D1D1F')}
    </td></tr>

    <tr><td style="padding:22px 8px 0;font-size:13px;line-height:1.6;color:#6B6B70;text-align:center;">
      Just reply to this email to reach me directly.<br>
      <a href="${base}" style="color:#644BF6;">My card</a> · <a href="https://vivido.world" style="color:#644BF6;">vivido.world</a>
    </td></tr>

  </table>
</td></tr>
</table>
</body></html>`;

  return { subject, html, text: textBody };
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
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend → ${res.status}: ${data.message || 'unknown error'}`);
  return data.id;
}
