# Email da samuele@vivido.world (Resend + GoDaddy + Vercel)

**Problema:** oggi Resend rifiuta ogni destinatario diverso da `hello@vivido.world`,
perché il dominio `vivido.world` non è verificato. Le mail "Nice to meet you" quindi
non arrivano ai contatti.

**Obiettivo:** dominio verificato su Resend → mittente
`Samuele from Vivido <samuele@vivido.world>`.

Tempo: ~15 min di lavoro + attesa DNS (di solito 5–30 min).

---

## 1. Resend — aggiungi il dominio

1. resend.com → **Domains**.
2. Se `vivido.world` non c'è: **Add domain** → `vivido.world`, region **eu-west-1 (Ireland)**.
3. Apri il dominio: Resend mostra 3 record. Tieni la pagina aperta, ti servono i valori.

| Tipo | Nome (Host) | Valore | Priorità |
|---|---|---|---|
| TXT | `resend._domainkey` | chiave DKIM lunga (`p=MIGf...`) — copiala da Resend | — |
| MX | `send` | `feedback-smtp.eu-west-1.amazonses.com` | 10 |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | — |

> Usa sempre i valori esatti mostrati da Resend: se differiscono da questa tabella, vince Resend.

## 2. GoDaddy — aggiungi i 3 record

1. GoDaddy → **My Products** → `vivido.world` → **DNS** → **Manage DNS**.
2. **Prima di tutto:** fai uno screenshot della lista record attuale (backup).
3. **Add New Record** per ciascuno dei 3 record sopra. Nel campo *Name* scrivi solo
   `send` o `resend._domainkey` (GoDaddy aggiunge `.vivido.world` da solo). TTL: default.

**Non toccare** nient'altro: record `@` (A, MX della posta, TXT esistenti), `www`,
`samuele` (CNAME verso Vercel) restano come sono.

Se esiste già un record con lo stesso *Name* e *Type* (es. un altro TXT su `send`),
fermati e chiedi prima di cambiarlo.

## 3. Resend — verifica

1. Torna su Resend → dominio → **Verify DNS Records**.
2. Ricarica ogni qualche minuto finché tutti e 3 i record sono **Verified** e il
   dominio è **Verified**.
3. Se dopo ~30 min uno è ancora *Pending/Failed*: ricontrolla in GoDaddy che il
   *Name* non sia `send.vivido.world.vivido.world` e che il valore DKIM sia completo.

## 4. Vercel — mittente e deploy

Progetto: **samuele-techweek-card** (team *vividoprojects*).

1. **Settings → Environment Variables** → `MAIL_FROM` (crea o modifica):
   `Samuele from Vivido <samuele@vivido.world>` — ambienti **Production** e **Preview**.
2. **Deployments** → ultimo deploy di produzione → `•••` → **Redeploy**
   (le env nuove valgono solo dopo un nuovo deploy).

## 5. Test

1. Apri https://samuele-techweek-card.vercel.app, compila il form con un'email
   qualsiasi (non `hello@vivido.world`) → la mail deve arrivare, mittente `samuele@vivido.world`.
2. Controlla che non sia in spam e che rispondendo arrivi nella casella giusta.
3. Contatti rimasti in sospeso: apri `/me` (PIN = env `ADMIN_PIN` su Vercel) →
   **Send email ✉️** su ciascuno.

## Checklist

- [ ] Dominio `vivido.world` presente su Resend (eu-west-1)
- [ ] Screenshot backup DNS GoDaddy
- [ ] 3 record aggiunti su GoDaddy
- [ ] Dominio **Verified** su Resend
- [ ] `MAIL_FROM` aggiornata su Vercel (Production + Preview)
- [ ] Redeploy produzione
- [ ] Test form OK
- [ ] Mail inviate ai contatti in sospeso da `/me`

## Sicurezza

Un token GoDaddy (`gd_pat_…`) è stato incollato in una chat il 2026-10-06:
revocalo su developer.godaddy.com → API Keys e, se serve, creane uno nuovo.
Non salvare token in questo repo.
