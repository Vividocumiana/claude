# LinkedIn Content Mining — framework Vivido

> Fonte canonica per la routine `routines/linkedin.md`. Voce, pillar, hook,
> struttura, mapping sul DB "Piano Editoriale", anti-template, passata anti-AI, few-shot.
> Tutto **Vivido**: design consultancy founder-to-founder per startup early-stage.
> Deliverable: **Blueprint**, **MVP**, **Website (Pro)**, **Design Pod**, **Cycles** (retainer),
> **Partnership**. Founder che firma i post: **Samuele Poggio** (Growth). Mai contenuti Nest.

> **Leggi SEMPRE anche** (sono parte di questo framework, non opzionali):
> - `reference/samuele-voice-authentic.md` — com'è la voce vera di Samuele.
> - `reference/linkedin-anti-template.md` — perché lo scheletro ripetuto = tell #1 da AI.

## 0. Cosa produce la routine

**2 idee post LinkedIn al giorno**, scritte come bozze pronte da rivedere, salvate come 2 righe
`Bozza` nel DB **Piano Editoriale** (Piattaforma = LinkedIn). Le 2 idee devono essere diverse
per **pillar, angolo E forma**. Il rischio più grave di generarne 2 insieme è che escano con lo
**stesso scheletro**: è esattamente ciò che le fa suonare "da AI". Vedi §3 (Anti-template).

## 1. La voce vera di Samuele

Il default NON è lo staccato punchy. La voce naturale di Samuele è **lunga, calda, concatenata
a virgole**: periodi che si srotolano sul beat emotivo e poi una frase corta che atterra. Lo
staccato (una riga = un'idea) è la *compressione* di questa voce, da usare con parsimonia, non
la regola su ogni post.

- **Ritmo base**: frase lunga che si srotola → frase corta che chiude.
- **Suoi intensificatori** (usali, non inventarne di "da brand"): "davvero", "un sacco", "così",
  "da morire", "non ha avuto prezzo", "non vedo l'ora".
- **Polisindeto** ("e… e… e…") ed enumerazioni lunghe e concrete (5-7 item), non la triade ordinata.
- **Ancore sensoriali**: ogni emozione agganciata a un dettaglio fisico preciso.
- **Ripetizione come ritmo**, dichiarative corte che chiudono ("Sono fiero di noi.").
- **Zero hedging, zero ironia difensiva**: dice il sentimento dritto.

Almeno **una** delle 2 idee del giorno dovrebbe stare in questo registro lungo-caldo. L'altra può
essere più compressa/insight — ma mai tutt'e due con lo stesso ritmo meccanico.

## 2. Tono e regole base

- **Lingua**: italiano, prima persona del founder.
- **Founder-to-founder**: parli a chi costruisce una startup, non a un cliente da convertire.
- **Vulnerabilità reale** > flex. Dubbi e decisioni difficili performano più dei successi.
- **MAIUSCOLE**: solo se servono per un hook, mai sparse. Non su ogni post (vedi §3).
- **Concreto**: numeri veri (€, ore, giorni, %, n° clienti), nomi di deliverable, fatti reali.
- **Zero pitch**: niente "prenota una call", "scopri di più". Il valore è il post.
- **Lunghezza**: max ~1.300 caratteri. Hashtag 3-5, sempre `#StartupItalia` come core.

## 3. Anti-template — la regola che viene prima di tutte

Il tell #1 da "scritto da AI" non è la frase singola: è lo **stesso scheletro ripetuto**. Lo
scheletro-trappola è:

> hook MAIUSCOLE 2 righe → "Per anni ho pensato X / ho cambiato idea" → "Non è X. È Y." →
> punchline aforistica → CTA binaria ("X o Y?").

Presi uno alla volta, questi sono tic veri di Samuele. Stampati tutti, sempre nello stesso punto,
su tutt'e due i post → formula. Regole operative quando generi le 2 bozze:

- **Max 1 marker-firma per post**, e **ruotati** tra i due. Se A usa il pivot "Non è X, è Y",
  B non lo usa. Se A chiude con domanda, B chiude in dichiarativa o con un dettaglio.
- **Non tutte e due con il pivot**, e il pivot solo se la convinzione precedente era reale (mai
  strawman finto "per anni ho creduto che…" se non è vero).
- **Non tutte e due con CTA binaria.** Una domanda finale va bene su un post, non come stampo.
- **Varia l'hook** tra i due (tipi in §4).
- **Varia il ritmo**: uno lungo-caldo (§1), uno più compresso. Non due staccati gemelli.

**Taglia sempre**: 3+ em dash in un post, parole-vetrina ("acceleratore", "ecosistema",
"valore aggiunto", "output", "soluzione", "sinergia", "innovativo", "disruptive"), rule of three
meccanica, transizioni didattiche ("In questo post ti spiego…"), conclusioni positive generiche
("il successo è un viaggio").

## 4. Hook — scegline uno per idea, diversi tra i due

1. **Vulnerabilità** (event. MAIUSCOLE) — "Ho detto no a 8.000€."
2. **Contro-intuitivo** — "Il sito migliore di quest'anno è il più brutto."
3. **Statistica/fatto** — "9 founder su 10 ci chiedono un sito. A 7 diciamo di no."
4. **Scena concreta** — apri dentro un momento reale (un meeting, una frase di un cliente),
   non con una tesi. Spesso il più umano e il meno "da AI".

Non ripetere lo stesso hook+pillar di ieri (anti-ripetizione §8).

## 5. Pillar — tassonomia REALE del DB

Scegli **uno** dei valori esatti della proprietà `Pillar` del DB (case-sensitive):

| Pillar (DB) | Quando | Angolo Vivido |
|---|---|---|
| `PAIN TARGET` | Nomini il dolore preciso del founder early-stage | "6 mesi sulla feature sbagliata" |
| `Educational` | Insegni un metodo/framework | "Validare un'idea con un Blueprint in 2 settimane" |
| `Behind the Scenes` | Mostri come lavora Vivido dentro un progetto | "I primi 3 giorni di un MVP" |
| `Social Proof` | Caso cliente con numeri | "Da idea a 20 utenti paganti" |
| `Promo` | Spingi un deliverable (raro, max 1/sett.) | "2 slot Cycles per Q3" |
| `Entertainment` | Tono leggero, opinione di settore | "Le frasi che ogni founder dice prima di un rebrand" |
| `Thought Leadership` | Opinione forte/contrarian | "Il sito perfetto non esiste" |

Le 2 idee del giorno usano **pillar diversi**. Privilegia `PAIN TARGET` / `Educational` /
`Thought Leadership` / `Social Proof`; `Promo` max 1/settimana.

## 6. Formato (proprietà `Formato` del DB)

- **Post Singolo** → default testo LinkedIn.
- **Carousel** → breakdown in 3-5 step (spesso `Educational`).
- **Articolo** → opinione lunga (`Thought Leadership`).

Il corpo che scrivi è sempre il copy del post (per Carousel: sequenza step come copy +
nota "[Carousel: 1 concetto per slide]").

## 7. Mapping sul DB "Piano Editoriale"

Ogni idea = 1 pagina:

| Proprietà | Valore |
|---|---|
| `Name` | titolo interno breve (NON l'hook completo) — es. "PAIN: feature sbagliata 6 mesi" |
| `Status` | `Bozza` |
| `Piattaforma` | `["LinkedIn"]` (JSON array) |
| `Pillar` | uno dei valori §5 |
| `Formato` | uno dei valori §6 |
| `Priorità` | `🔴 Alta` se angolo forte con numeri, altrimenti `🟡 Media` |

**Corpo pagina** (replica il template "Nuovo Post", copy in code block):

```
# ✍️ Copy
​```
<POST COMPLETO, come va pubblicato, hashtag inclusi>
​```

---

## Fonte
<1 riga: meeting/task/email/evento delle ultime 24h da cui nasce l'angolo>

## Meta
Pillar: <pillar> · Hook: <tipo> · Registro: <lungo-caldo | compresso> · Caratteri: <n>/1300

# ✅ Checklist
- [ ] Copy approvato
- [ ] Grafica/Video pronta
- [ ] Orario confermato
- [ ] Contenuto programmato
```

## 8. Anti-ripetizione (storico)

Leggi `/tmp/vivido-linkedin-history.jsonl` (crealo se non esiste). Riga:
`{date, pillar, hook_type, register, topic}`. Regole:
- Le 2 idee di oggi: pillar + hook + registro diversi tra loro.
- Non ripetere lo stesso pillar+hook di ieri, né lo stesso topic entro 7 giorni.
Dopo aver creato le pagine, appendi 2 righe (una per idea).

## 9. Passata anti-AI (obbligatoria prima di salvare)

Per **ogni** bozza, fai due domande a te stesso e agisci:
1. **"Cosa la fa sembrare scritta da AI?"** — scheletro-trappola? CTA binaria stampata?
   rule of three? parole-vetrina? em dash a raffica? ritmo staccato meccanico?
2. **"Riscrivila perché non lo sembri."** — applica la correzione, non limitarti a notarla.

Poi la checklist (riscrivi se una voce non negoziabile fallisce, max 2 tentativi/idea):
- [ ] Hook forte (uno dei 4 tipi), **diverso** dall'altra idea
- [ ] Almeno un dato/numero/fatto concreto
- [ ] Sotto ~1.300 caratteri, zero link nel corpo
- [ ] Zero emoji sparse / bullet con simboli / bold-corsivo-header dentro il copy
- [ ] 3-5 hashtag, niente pitch diretto
- [ ] Vivido = design consultancy founder-to-founder (mai "agenzia", mai SaaS)
- [ ] **Le 2 idee non condividono lo scheletro** (§3): hook, pivot, chiusura, registro ruotati
- [ ] Almeno una delle due nel registro lungo-caldo (§1)
- [ ] Passata anti-AI fatta

## 10. VIETATO ASSOLUTO

- Inventare numeri, clienti o citazioni non presenti nel materiale.
- Parlare di Nest (Nest OS, Growth Partner, outbound Nest).
- Due post con lo stesso scheletro / stesso ritmo / stessa chiusura.
- Pubblicare automaticamente: la routine crea solo **Bozze**.

## 11. Few-shot (archetipi target — NOTA: scheletri diversi tra loro)

> Sono modelli di *registro e varietà*, non stampi da ricalcare. Non riusare la stessa apertura
> o la stessa chiusura di questi esempi su un post reale.

**#1 — Registro lungo-caldo / PAIN TARGET / Post Singolo (chiude in dichiarativa, niente CTA)**
```
Stamattina un founder mi ha detto al telefono che era pronto a darci ottomila euro per un sito nuovo, dodici pagine, tutto bello, e mentre parlava sentivo l'entusiasmo e capivo benissimo da dove veniva, perché anch'io quando ho iniziato volevo prima la cosa bella e poi la cosa giusta.

Gli ho chiesto quanti clienti paganti aveva. Zero.

E allora gli ho proposto un Blueprint invece del sito, due settimane invece di due mesi, un quinto del budget, per capire se l'idea sta in piedi prima di vestirla.

Ha detto no. Voleva il sito.

Tre mesi dopo mi ha riscritto: avevi ragione, ho rifatto tutto.

Non mi è dispiaciuto avergli detto no. Mi è dispiaciuto che gli sia costato tre mesi per crederci.

#MVP #ProductValidation #StartupItalia
```

**#2 — Registro compresso / Thought Leadership / Articolo (apre con tesi, chiude con domanda)**
```
Il sito perfetto è il nemico della tua startup.

Ogni founder vuole la homepage definitiva. Ma la homepage definitiva presuppone che tu sappia già chi sei, e da early-stage non lo sai ancora.

Quello che ti serve non è perfetto. È vivo: pubblicato in giorni, abbastanza chiaro da far capire cosa vendi, abbastanza grezzo da poterlo buttare via senza piangere.

Il sito è un'ipotesi, non un monumento.

Cosa stai rifinendo da settimane invece di pubblicarlo?

#StartupDesign #BuildInPublic #StartupItalia
```

**#3 — Scena concreta / Social Proof / Carousel (apre dentro un momento, niente pivot, niente CTA binaria)**
```
"Non capisco cosa vendete." Me l'ha detto un founder leggendo il suo stesso sito, ad alta voce, in call.
[Carousel: 1 concetto per slide]

Non era un problema di traffico. Le visite c'erano. Era che in cinque secondi non si capiva chi aiutavano.

Abbiamo tenuto lo stesso traffico e cambiato tre cose: una frase sola sopra la piega, una prova vera al posto del "chi siamo", una call to action ripetuta invece di sei sparse.

Tre settimane dopo: venti richieste.

Il design qui non ha aggiunto niente di bello. Ha tolto il rumore.

#WebDesign #StartupDesign #StartupItalia
```

Nota su come differiscono: #1 apre con una scena lunga e chiude in dichiarativa; #2 apre con una
tesi e chiude con domanda; #3 apre con una citazione e chiude con un'osservazione. **Nessuno dei
tre condivide hook, pivot o chiusura** — è così che devono stare le 2 bozze di ogni giorno.
