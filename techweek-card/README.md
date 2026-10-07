# Contact cards — Samuele, Alessandro

One codebase, one card per person. `CARD` (Vercel env var) picks the person; each
person is a Vercel project with its own domain and env vars.

| Person | Config | Domain | Vercel project |
|---|---|---|---|
| Samuele Poggio | `people/samuele/` | samuele.vivido.world | `samuele-techweek-card` (CARD unset = samuele) |
| Alessandro Martinengo | `people/alessandro/` | alessandrostaging.vivido.world (staging, noindex) | `alessandro-card` |

```
people/<id>/person.js   all text, links, companies, theme, email copy for that person
people/<id>/public/     that person's photos, logos (and hand-made vCard, if any)
public/                 shared files (favicon, QR library)
templates/*.html        pages with {{placeholders}}
build.js                CARD=<id> node build.js → dist/ (the Vercel output)
```

To add a person: copy `people/alessandro/`, edit `person.js`, register it in
`people/index.js`, create a Vercel project with Root Directory `techweek-card` and
`CARD=<id>`. `npm test` checks every card builds and Alessandro's has nothing of Samuele's.

---

## Samuele's card (original setup notes)

Samuele shows a QR → people land on his card → if they leave their email, the
contact is saved in Notion and they get a "Nice to meet you" email (via Resend)
with a Book-a-call button. Samuele manages contacts and notes from a private
view (`/me`) that reads and writes the same Notion database.

```
/qr        QR fullscreen (open on Samuele's phone, "Add to Home Screen")
/          public card: bio, Book a call, Save contact (vCard), email form
/me        private view (PIN): list, status, quick notes, manual add → Notion
/api/contact    POST  public — save contact + send email (once per email)
/api/contacts   GET/POST/PATCH  private (x-pin) — used by /me
```

Zero dependencies: plain HTML + Vercel serverless functions using `fetch`.

## Setup (≈20 min)

### 1. Resend — do this first (DNS takes time)
1. Create an account at resend.com → **Domains → Add domain** → `vivido.world`
   (or a subdomain like `mail.vivido.world`, so the root setup isn't touched).
2. Add the DNS records Resend shows (SPF/DKIM, optional DMARC) where vivido.world's DNS is managed.
3. Wait for **Verified**, then **API Keys → Create** (permission: sending).

### 2. Notion
The database **Tech Week Contacts** already exists
(https://app.notion.com/p/ea9aaa17fa194f76b46e33db6d7d81b2 — move it wherever you like).
1. notion.so/profile/integrations → **New integration** (internal) → copy the token.
2. Open the database → `•••` → **Connections** → add the integration.
3. `NOTION_DATABASE_ID=ea9aaa17fa194f76b46e33db6d7d81b2`

Property names are used by the code — don't rename them:
`Name, Email, Company, Event, Status, Notes, Email sent, Source, Created`.

### 3. Vercel
1. **Add New → Project** → import this repo → **Root Directory: `techweek-card`**, Framework: Other.
2. Add the environment variables from `.env.example`.
3. Deploy, then **Settings → Domains** → add `samuele.vivido.world` (CNAME to Vercel) and set `PUBLIC_URL` to it.

### 4. Content to finish
- `public/samuele.jpg` — square photo (≥400px). Used in the card and in the email.
  Until it exists, the card shows initials "SP".
- `BOOKING_URL` — in `public/index.html` (top of the `<script>`) **and** in the Vercel env (email button).

### 5. On Samuele's phone
- Open `https://samuele.vivido.world/qr` → Share → **Add to Home Screen**. Take a
  screenshot too, as an offline backup.
- Open `/me`, enter the PIN once (it's remembered on that phone) → Add to Home Screen.

## Test before the event
1. Scan the QR with another phone → form → check the email arrives (and isn't in spam).
2. Reply to the email → it must land in Samuele's inbox.
3. Check the row in Notion, then change status / add a note from `/me` → it shows in Notion.
4. Send the same email again → no duplicate email.

## Notes
- The same email is never emailed twice (dedup on Notion `Email` + `Email sent`).
- Bots: honeypot field + server-side validation.
- To reuse for another event: change `EVENT_NAME` and the "Tech Week" labels in `public/`.

## Alessandro's card (staging)

Vercel project settings: Root Directory `techweek-card`, Framework **Other**
(build command and output come from `vercel.json`). Environment variables:

```
CARD=alessandro
PUBLIC_URL=https://alessandrostaging.vivido.world
BOOKING_URL=https://cal.com/jessica-pretti-k562b0/30min
RESEND_API_KEY=<same Resend key as Samuele>
MAIL_FROM="Alessandro Martinengo <alessandro@vivido.world>"   # must be on a Resend-verified domain
MAIL_REPLY_TO=alessandro@salesmagic.tech
ADMIN_PIN=<4+ digits>                                          # only matters once Notion is connected
# NOTION_TOKEN / NOTION_DATABASE_ID: not set yet — the form just sends the email
```

Domain: Vercel → project → Settings → Domains → add `alessandrostaging.vivido.world`,
then at the DNS provider of vivido.world add `CNAME alessandrostaging → cname.vercel-dns.com`
(if vivido.world uses Vercel nameservers, the record is created automatically).

The welcome email attaches `/alessandro.vcf`, which Resend downloads from `PUBLIC_URL`,
so it only works once the domain is live.

Placeholders to replace in `people/alessandro/`: `public/logos/salesmagic.svg|png` and
`public/favicon.svg` (redrawn from a screenshot of salesmagic.tech), `public/logos/wearefounders.png`
(neutral "WF" tile).

DNS (vivido.world is on GoDaddy): `CNAME alessandrostaging → a71550f6828995dd.vercel-dns-016.com`.
