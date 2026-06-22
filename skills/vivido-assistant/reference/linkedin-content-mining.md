# LinkedIn Content Mining — framework Vivido

> Fonte canonica per la routine `routines/linkedin.md`. Tono di voce, pillar, hook,
> struttura post, mapping sul DB "Piano Editoriale", checklist e few-shot.
> Tutto **Vivido**: design consultancy founder-to-founder per startup early-stage.
> Deliverable a catalogo: **Blueprint**, **MVP**, **Website (Pro)**, **Design Pod**,
> **Cycles** (retainer), **Partnership**. Founder: Samuele Poggio (Growth) + Federico
> Garzena (Design/Product). Mai contenuti Nest.

## 0. Cosa produce la routine

**2 idee post LinkedIn al giorno**, scritte come bozze pronte da rivedere, salvate
come 2 righe `Bozza` nel DB **Piano Editoriale** (Piattaforma = LinkedIn). Le 2 idee
devono essere **diverse tra loro per pillar e per angolo** — non due varianti dello
stesso pensiero. Una può essere più "personale/founder", l'altra più "valore/insight".

## 1. Tono di voce

- **Lingua**: italiano. **Voce**: prima persona del founder (Samuele o Vivido come "noi").
- **Founder-to-founder**: parli a chi sta costruendo una startup, non a un cliente da convertire.
- **Vulnerabilità reale** > flex. Errori, dubbi, decisioni difficili performano più dei successi.
- **Frasi brevi**. Una riga = un'idea. Spazi bianchi generosi (il post si legge su mobile).
- **MAIUSCOLE solo nell'hook** (1 frase), mai sparse nel corpo.
- **Concreto**: numeri veri (€, ore, giorni, %, n° clienti), nomi di deliverable, situazioni reali.
- **Zero pitch**: niente "prenota una call", "scopri di più", "contattaci". Il valore è il post.

## 2. Pillar — usa la tassonomia REALE del DB

Il DB "Piano Editoriale" ha una proprietà `Pillar`. Scegli **uno** dei suoi valori
esatti (case-sensitive) per ogni idea:

| Pillar (DB) | Quando usarlo | Esempio di angolo Vivido |
|---|---|---|
| `PAIN TARGET` | Nomini il dolore preciso del founder early-stage | "Hai speso 6 mesi a costruire la feature sbagliata" |
| `Educational` | Insegni un framework/metodo/processo | "Come validare un'idea con un Blueprint in 2 settimane" |
| `Behind the Scenes` | Mostri come lavora Vivido dentro un progetto | "Cosa succede davvero nei primi 3 giorni di un MVP" |
| `Social Proof` | Caso cliente con numeri/risultato | "Da idea a 20 utenti paganti: il sito che abbiamo rifatto" |
| `Promo` | Spingi un deliverable/offerta (raro, max 1/sett.) | "Apriamo 2 slot Cycles per Q3" |
| `Entertainment` | Tono leggero, meme di settore, opinione divertente | "Le 5 frasi che ogni founder dice prima di un rebrand" |
| `Thought Leadership` | Opinione forte/contrarian sul design e le startup | "Il sito perfetto non esiste, e va benissimo così" |

**Bilanciamento settimanale (guida, non regola ferrea):** privilegia
`PAIN TARGET` / `Educational` / `Thought Leadership` / `Social Proof`.
`Promo` max 1 volta a settimana. `Entertainment` come jolly quando il materiale è leggero.

## 3. Hook — scegline uno per idea

1. **Vulnerabilità (MAIUSCOLE)** — "HO PERSO UN CLIENTE PER UNA HOMEPAGE." → archetipo top reach.
2. **Contro-intuitivo** — "Il miglior sito che abbiamo fatto quest'anno è il più brutto."
3. **Statistica shock** — "9 founder su 10 ci chiedono un sito. A 7 diciamo di no."
4. **Domanda provocatoria** — "Perché continui a rifare il sito invece di validare l'idea?"

Alterna gli archetipi: le 2 idee dello stesso giorno usano **hook diversi**, e non
ripetere lo stesso hook+pillar di ieri (vedi anti-ripetizione §7).

## 4. Struttura del post

```
[HOOK 1-2 righe — MAIUSCOLE se vulnerabilità]
[riga bianca]
Contesto rapido (1-2 righe)
[riga bianca]
Il punto centrale (1-2 righe)
[riga bianca]
Breakdown (max 3 punti, 1 frase ognuno, con un dato dove possibile)
[riga bianca]
Lesson learned applicabile (1-2 righe)
[riga bianca]
Domanda finale specifica (NO "cosa ne pensi?")
[riga bianca]
#Hashtag1 #Hashtag2 #Hashtag3
```

- **Lunghezza**: max ~1.300 caratteri (spazi inclusi). Post singolo LinkedIn.
- **Hashtag**: 3-5, sempre `#StartupItalia` come core. Set per area:
  - Validazione/prodotto → `#MVP #ProductValidation #LeanStartup #StartupItalia`
  - Design/sito → `#WebDesign #StartupDesign #ProductDesign #StartupItalia`
  - Founder/crescita → `#FounderJourney #BuildInPublic #ItalianStartups #StartupItalia`

## 5. Formato (proprietà `Formato` del DB)

Imposta `Formato` coerente con l'idea:
- **Post Singolo** → default per il testo LinkedIn.
- **Carousel** → se l'idea è un breakdown in 3-5 step (spesso `Educational`).
- **Articolo** → se è un'opinione lunga (`Thought Leadership`).

Il **corpo del testo** che scrivi è comunque il copy del post (anche per Carousel:
scrivi la sequenza degli step come copy + nota "[Carousel: 1 concetto per slide]").

## 6. Mapping sul DB "Piano Editoriale"

Ogni idea = 1 pagina con:

| Proprietà | Valore |
|---|---|
| `Name` | titolo interno breve dell'idea (NON l'hook completo) — es. "PAIN: feature sbagliata 6 mesi" |
| `Status` | `Bozza` |
| `Piattaforma` | `["LinkedIn"]` (JSON array) |
| `Pillar` | uno dei valori §2 |
| `Formato` | uno dei valori §5 |
| `Priorità` | `🔴 Alta` se angolo forte con numeri, altrimenti `🟡 Media` |

**Corpo della pagina** (Notion Markdown) — replica il template "Nuovo Post":

```
# ✍️ Copy
​```
<POST COMPLETO qui, esattamente come va pubblicato, hashtag inclusi>
​```

---

## Fonte
<1 riga: da quale meeting/task/email/evento delle ultime 24h nasce l'angolo>

## Meta
Pillar: <pillar> · Hook: <tipo hook> · Caratteri: <n>/1300

# ✅ Checklist
- [ ] Copy approvato
- [ ] Grafica/Video pronta
- [ ] Orario confermato
- [ ] Contenuto programmato
```

Il copy va dentro un **blocco di codice** (come il template), così il founder può
copiarlo pulito con un click.

## 7. Anti-ripetizione

Leggi `/tmp/vivido-linkedin-history.jsonl` (crealo se non esiste). Ogni riga:
`{date, pillar, hook_type, topic}`. Regole:
- Le 2 idee di oggi hanno pillar+hook diversi tra loro.
- Non ripetere lo stesso pillar+hook di ieri.
- Non ripetere lo stesso topic entro 7 giorni.
Dopo aver creato le pagine, appendi 2 righe (una per idea).

## 8. Checklist pre-salvataggio (per OGNI idea)

Se una voce fallisce → riscrivi (max 2 tentativi). Non negoziabili:
- [ ] Hook forte nelle prime 2 righe (uno dei 4 tipi)
- [ ] MAIUSCOLE solo nell'hook
- [ ] UN pillar, UNA idea
- [ ] Almeno un dato/numero/esempio concreto
- [ ] Domanda finale specifica
- [ ] Sotto ~1.300 caratteri
- [ ] Zero link nel corpo
- [ ] Zero emoji sparse / bullet con simboli nel testo del post
- [ ] Zero bold/corsivo/header markdown DENTRO il copy del post
- [ ] 3-5 hashtag alla fine
- [ ] Niente pitch diretto
- [ ] Vivido = design consultancy founder-to-founder (mai "agenzia", mai SaaS)
- [ ] Le 2 idee sono davvero diverse (pillar + angolo)

## 9. VIETATO ASSOLUTO

- Inventare numeri, clienti o citazioni non presenti nel materiale.
- Parlare di Nest (Nest OS, Growth Partner, outbound Nest) — è un altro brand.
- Buzzword: "soluzione", "sinergia", "innovativo", "disruptive", "rivoluzionario".
- Frasi motivazionali vuote ("il successo è un viaggio").
- Due post quasi identici.
- Pubblicare automaticamente: la routine crea solo **Bozze**, mai `Programmato`/`Pubblicato`.

## 10. Few-shot (archetipi target)

**#1 — Vulnerabilità / PAIN TARGET / Post Singolo**
```
HO DETTO NO A UN CLIENTE CHE VOLEVA PAGARMI 8.000€.

Voleva un sito nuovo. Bello, completo, 12 pagine.

Il problema: non aveva ancora un solo utente che pagava.

Gli ho proposto un Blueprint invece del sito:
- 2 settimane invece di 2 mesi
- validare l'idea prima di vestirla
- spendere 1/5 del budget

Ha detto no. Voleva il sito.

3 mesi dopo mi ha riscritto: "avevi ragione, ho rifatto tutto".

Costruire la cosa giusta viene prima di costruirla bene.

Tu quante volte hai vestito un'idea che non avevi ancora validato?

#MVP #ProductValidation #StartupItalia
```

**#2 — Contro-intuitivo / Thought Leadership / Articolo**
```
Il sito perfetto è il nemico della tua startup.

Ogni founder che incontro vuole la homepage definitiva.

Ma la homepage definitiva presuppone che tu sappia già chi sei.

Da early-stage non lo sai ancora. E va bene così.

Quello che ti serve non è perfetto, è vivo:
- pubblicato in giorni, non mesi
- abbastanza chiaro da far capire cosa vendi
- abbastanza grezzo da poterlo buttare

Il sito è un'ipotesi, non un monumento.

Qual è la cosa che stai rifinendo invece di pubblicare?

#StartupDesign #BuildInPublic #StartupItalia
```

**#3 — Social Proof / Carousel**
```
Da "non capisco cosa vendete" a 20 richieste in 3 settimane.
[Carousel: 1 concetto per slide]

Un founder è arrivato con un sito pieno di parole e zero richieste.

Non era un problema di traffico. Era un problema di messaggio.

Cosa abbiamo cambiato:
1. Una sola frase sopra la piega: chi aiuti e come
2. Una prova sociale vera al posto del "chi siamo"
3. Una call to action sola, ripetuta

Stesso traffico. 20 richieste in 3 settimane.

Il design non è decorazione: è chiarezza.

Cosa capisce un estraneo dal tuo sito in 5 secondi?

#WebDesign #StartupDesign #StartupItalia
```
