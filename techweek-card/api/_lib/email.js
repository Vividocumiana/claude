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

  const font = "Geist,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
  const company = (logo, name, role, line, href) => `
        <tr><td style="padding:12px 0;border-top:1px solid #2D2D31;">
          <a href="${href}" style="text-decoration:none;color:#F4F3EF;display:block;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td width="52" valign="middle"><img src="${base}/logos/${logo}" width="40" height="40" alt="${name}" style="display:block;width:40px;height:40px;border-radius:11px;"></td>
            <td valign="middle" style="font-family:${font};">
              <div style="font-size:15px;font-weight:500;color:#F4F3EF;line-height:1.3;">${name}<span style="font-size:13px;font-weight:400;color:#9A999E;">&nbsp;&nbsp;${role}</span></div>
              <div style="font-size:13px;color:#9A999E;line-height:1.35;">${line}</div>
            </td>
            <td width="20" valign="middle" align="right" style="font-family:${font};font-size:15px;color:#9A999E;">&#8599;</td>
          </tr></table></a>
        </td></tr>`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#F1F0EB;">
<div style="display:none;max-height:0;overflow:hidden;">If what we talked about is worth 20 minutes, grab a slot.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F0EB;">
<tr><td align="center" style="padding:28px 12px 36px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;">

    <!-- Card: dark bezel, photo, panel -->
    <tr><td style="background:#121214;border-radius:36px;padding:7px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="border-radius:29px 29px 0 0;overflow:hidden;line-height:0;">
          <img src="${base}/samuele-lg.jpg" width="406" alt="Samuele Poggio" style="display:block;width:100%;max-width:406px;height:auto;border-radius:29px 29px 0 0;">
        </td></tr>
        <tr><td style="background:#1E1E21;border-radius:0 0 29px 29px;padding:20px 20px 22px;font-family:${font};color:#F4F3EF;">
          <div style="font-size:21px;font-weight:600;letter-spacing:-0.03em;line-height:1.2;">Samuele Poggio</div>
          <div style="font-size:14px;color:#9A999E;margin-top:2px;">Founder · Vivido, Nest, Nitido</div>

          <div style="font-size:24px;font-weight:600;letter-spacing:-0.03em;line-height:1.2;margin-top:22px;">${hello} at ${esc(event)}.</div>
          <div style="font-size:16px;line-height:1.55;color:#C9C8CC;margin-top:10px;">I'm Samuele: I run operations at Vivido and build Nest on the side. If what we talked about is worth 20 minutes, grab a slot below.</div>

          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px;"><tr>
            <td style="background:#FFFFFF;border-radius:9999px;"><a href="${booking}" style="display:inline-block;padding:14px 26px;font-family:${font};font-size:15px;font-weight:500;color:#111111;text-decoration:none;">Book a call &rarr;</a></td>
          </tr></table>

          <div style="font-family:'Geist Mono',ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#9A999E;margin-top:28px;">Companies</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
            ${company('vivido.png', 'Vivido', 'Co-founder', 'Product design for founders', 'https://vivido.world')}
            ${company('nest.png', 'Nest', 'Founder', 'Operations for agencies, without hiring', 'https://www.usanest.it/')}
            ${company('nitido.png', 'Nitido', 'Co-founder', 'Pitch-ready websites for funded startups', 'https://nitido.design')}
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;"><tr>
            <td width="50%" style="padding-right:4px;"><a href="https://www.linkedin.com/in/samuele-poggio-48b9a0219/" style="display:block;text-align:center;background:#2A2A2E;border-radius:14px;padding:12px;font-family:${font};font-size:14px;font-weight:500;color:#F4F3EF;text-decoration:none;">LinkedIn</a></td>
            <td width="50%" style="padding-left:4px;"><a href="https://wa.me/393335839398" style="display:block;text-align:center;background:#2A2A2E;border-radius:14px;padding:12px;font-family:${font};font-size:14px;font-weight:500;color:#F4F3EF;text-decoration:none;">WhatsApp</a></td>
          </tr></table>
        </td></tr>
      </table>
    </td></tr>

    <tr><td align="center" style="padding:22px 8px 0;font-family:${font};font-size:13px;line-height:1.6;color:#7A7976;">
      Just reply to this email to reach me directly.<br>
      <a href="${base}" style="color:#141416;">My card</a> &nbsp;·&nbsp; <a href="https://vivido.world" style="color:#141416;">vivido.world</a>
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
