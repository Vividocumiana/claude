# Tech Week Card — Samuele

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
