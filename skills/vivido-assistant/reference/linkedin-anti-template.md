---
name: feedback-linkedin-anti-template
description: "Post LinkedIn di Samuele — evitare il template ripetuto, i marker-firma vanno ruotati non stampati su ogni post"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 1f940cd9-4a38-49cd-a48d-fd1e18ccf1d6
---

Sui post LinkedIn di Samuele il tell n.1 da "scritto da AI" NON è la singola frase: è lo **stesso scheletro ripetuto** su più post (hook MAIUSCOLE 2 righe → "Per anni ho pensato X / Ho cambiato idea" → "Non è X. È Y." → punchline aforistica → CTA binaria "X o Y?"). Presi singolarmente quei marker sono voce vera di Samuele; ripetuti identici diventano formula.

**Why:** una formula ripetuta è il segnale più forte di testo generato. Un umano usa i suoi tic ogni tanto, non tutti e non sempre nello stesso punto. Il founder mi ha dato la guida Wikipedia "Signs of AI writing" chiedendo di applicarla ai suoi post (2026-06-02).

**How to apply:** quando genero 2+ bozze, max 1 marker-firma per post e ruotati; non tutti col pivot (usarlo solo se la convinzione precedente era reale, mai strawman finto); non tutti con CTA binaria; varia l'hook. Tagliare: 3+ em dash, parole-vetrina (acceleratore, ecosistema, valore aggiunto, output), rule of three meccanica, transizioni didattiche, conclusioni positive generiche. Fare sempre la passata anti-AI a 2 domande ("cosa lo rende da AI?" → "riscrivilo per non sembrarlo"). Tutto questo è ora codificato in `~/.claude/scheduled-tasks/nest-linkedin-ideas-sync/SKILL.md` (sezioni ANTI-TEMPLATE / SEGNALI DI AI / PASSATA ANTI-AI). Collegato a [[project_linkedin_ideas_sync]].
