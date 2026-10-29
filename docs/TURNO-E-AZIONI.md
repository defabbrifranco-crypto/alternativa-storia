# Il turno: azioni e tempo

Dalla versione 28 il turno ha **due comandi separati**, al posto del vecchio pulsante unico «Agisci e avanza»:

1. una **casella di testo** («Cosa fai?») con il pulsante **Invia**: serve a decidere le azioni, anche più di una, e a metterle in attesa. Il tempo non passa e il motore non viene interpellato;
2. il pulsante **Avanza**, accanto al salto temporale (1 settimana, 1 mese, 6 mesi, 1 anno): fa passare il tempo, esegue le azioni in attesa e lascia che **anche le altre nazioni agiscano**.

## Come si gioca

1. Scrivi nella casella una o più azioni, **una per riga** (Invio va a capo; **Ctrl+Invio**, o **Cmd+Invio** sul Mac, è una scorciatoia per «Invia»).
2. Premi **Invia**: le azioni passano nell'elenco **Azioni in attesa**, sotto la casella. Puoi aggiungerne altre in qualsiasi momento, o toglierne con **Rimuovi**.
3. Scegli il salto temporale e premi **Avanza**. Nella cronaca compaiono, nell'ordine: le tue azioni, la narrazione del periodo, **«Le altre nazioni»** (che cosa hanno fatto) e gli eventuali cambi sulla mappa.

Si può premere **Avanza** anche con l'elenco vuoto: il tuo governo prosegue l'ordinaria amministrazione e il mondo va avanti lo stesso.

## La coda delle azioni

| Regola | Perché |
|---|---|
| Una azione per riga; righe vuote e spazi doppi vengono ripuliti | così si possono incollare più azioni in una volta |
| Al massimo **12** azioni in attesa e **400 caratteri** ciascuna | la richiesta al motore resta di dimensioni ragionevoli |
| Se il limite verrebbe superato, **non entra nessuna** delle righe inviate; il testo resta nella casella e un messaggio spiega perché | niente si perde a metà |
| Con del testo **scritto e non inviato** nella casella, «Avanza» non parte: spiega di premere «Invia» (o di cancellare) | altrimenti quel testo andrebbe perso senza che te ne accorga |
| Mentre il motore lavora, «Invia», «Avanza» e «Rimuovi» sono spenti; la casella resta libera e quello che scrivi non si perde | una sola richiesta alla volta |
| A partita finita («Il tuo paese non controlla più alcun territorio») i comandi sono spenti | come prima |

I testi delle azioni sono mostrati **come testo**: un'azione che contiene codice HTML o script non viene eseguita.

## Le altre nazioni

A ogni «Avanza» la richiesta al motore dice che nello stesso periodo **anche le altre nazioni agiscono liberamente**, di propria iniziativa e non solo in risposta al giocatore, secondo i propri interessi, le alleanze e le rivalità e la storia alternativa formata finora. In particolare chiede di:

- far agire **da 3 a 6 nazioni diverse**, non solo le superpotenze;
- riportare le loro mosse nel campo `mosse_altre_nazioni` della risposta (una frase ciascuna), che la pagina mostra nel blocco **🌍 Le altre nazioni**;
- tenerne conto nella narrazione e nelle statistiche e, se cambiano chi possiede o controlla un territorio, elencare i cambi con le **stesse regole di sempre** (solo gli ID elencati, regola dei confini, al massimo 12 cambi per turno, con le righe «Non applicato» per quelli rifiutati).

**Chi riceve uno spazio in più.** Nello scenario con la mappa la richiesta aggiunge «dai spazio anche a: …» con **tre nazioni** scelte a rotazione. La scelta non usa il caso: dipende solo dal numero del turno, quindi la stessa partita dà sempre le stesse tre nazioni allo stesso turno, e cambiano a ogni «Avanza». Sono escluse la nazione del giocatore, le colonie e le nazioni che non possiedono più nessuna provincia. Serve a far muovere anche gli Stati piccoli; è un invito, non un obbligo, e il motore resta libero di far agire chi vuole. Nello scenario libero (senza mappa) non c'è l'elenco, ma la richiesta alle altre nazioni c'è lo stesso.

**Cosa si vede.** Il blocco mostra al massimo **10 mosse** per turno. Si accettano mosse scritte come `{"nazione": …, "mossa": …}` oppure come semplici frasi; le righe senza una mossa e i dati che non c'entrano sono ignorati; i testi sono ripuliti e accorciati (la mossa a 280 caratteri) e mostrati come testo. Se il motore non scrive nulla in `mosse_altre_nazioni`, il blocco non compare e il turno prosegue normalmente.

**Limite da conoscere.** Il motore conosce gli ID delle province del giocatore, di quelle che confinano con lui e di quelle degli Stati nominati nelle azioni o nel riepilogo del mondo. Se un'altra nazione fa qualcosa di territoriale che coinvolge province non elencate (per esempio due Stati lontani che si fanno la guerra), il motore può raccontarlo ma **non può scriverlo sulla mappa** in quel turno; entrando nel riepilogo del mondo, quegli Stati risultano «nominati» e dal turno dopo le loro province sono elencate. Le mosse delle altre nazioni sono **finzione** prodotta dal modello: non sono fatti storici.

## Se qualcosa va storto

- **Errore del motore**, rete assente o **risposta che non è un oggetto** (per esempio una lista o un testo): il turno **non viene contato** e non entra nulla nella storia; la cronaca lo dice e aggiunge «Le tue azioni restano in attesa.». Premendo di nuovo «Avanza» le stesse azioni vengono eseguite.
- **Annullamento** (in modalità manuale, con Annulla o Esc): «Operazione annullata: nessuna modifica.», con le azioni ancora in attesa.
- Una **risposta che arriva tardi** da una partita nel frattempo sostituita (con «Nuova partita» o caricando un salvataggio) viene scartata: non tocca né la coda, né il contatore, né la cronaca della partita nuova.

## Salvataggio

L'elenco delle azioni in attesa e il numero di turni fatti sono parte della partita salvata (campi `pending` e `turn` nella sezione `game`). La versione del salvataggio resta `schemaVersion` 3: i salvataggi di prima si caricano ancora, con la coda vuota e il contatore a 0. Quello che c'è in un salvataggio importato viene sempre controllato: le azioni devono essere testi, vengono ripulite e accorciate a 400 caratteri e se ne tengono al massimo 12; il contatore dei turni è riportato a un numero intero tra 0 e 1 000 000; le righe di «Le altre nazioni» sono limitate a 60 e quelle vuote (o i blocchi rimasti vuoti) scartate.

La bozza scritta nella casella e non inviata **non** fa parte del salvataggio (come un testo in un modulo qualunque).

## Senza intelligenza artificiale collegata (modalità manuale)

**Invia** mette in coda e basta, anche in modalità manuale. È **Avanza** a mostrare la finestra con il testo da copiare, che contiene le azioni numerate e la richiesta alle altre nazioni; la risposta incollata può contenere `mosse_altre_nazioni` e viene trattata come quella di un modello collegato. Vedi `USO-FUORI-DA-CLAUDE.md`.

## Che cosa è stato provato

`tests/browser/t15_turni.js` (181 controlli) prova, in un Chromium vero con risposte simulate: la coda (una o più righe, Ctrl/Cmd+Invio, limiti, rimozione e dove va il cursore, annunci per i lettori di schermo, testo con codice), il blocco di «Avanza», la richiesta al motore (azioni numerate, salto temporale, richiesta alle altre nazioni, schema), la rotazione delle nazioni in evidenza (senza caso, ogni turno una lista diversa, esclusioni), la risposta (righe valide e dati strani, tetto di 10, nessun blocco vuoto), gli errori e gli annullamenti, la risposta di un oggetto non valido, i pulsanti spenti durante l'attesa, le risposte tardive, la fine partita, il salvataggio e il caricamento (anche di salvataggi della versione precedente e di dati ostili), la modalità manuale e il telefono (tocco, niente scorrimento di lato, tema chiaro e scuro). Per controllare che le prove se ne accorgano, nella pagina sono stati inseriti apposta 55 difetti (coda che non si riempie, controllo del testo non inviato tolto, azioni perse dopo un errore, risposte tardive applicate, nazione del giocatore tra quelle in evidenza, testi non protetti, limiti tolti, salvataggio senza coda…): tutti sono stati notati, tranne due modifiche che in realtà non cambiavano il comportamento. Le prove di accessibilità (`t14_a11y.js`) misurano contrasto, dimensione dei comandi e nomi anche sui comandi nuovi.

**Che cosa NON è stato provato.** Nessun turno con il **modello vero dentro Claude**: le risposte nelle prove sono simulate. Non so quindi quanto il modello rispetti «da 3 a 6 nazioni» o il formato di `mosse_altre_nazioni` (la pagina tollera risposte diverse, ma la qualità e la plausibilità delle mosse dipendono dal modello), né quanto più a lungo possa durare l'attesa con una risposta più ricca. Nessuna prova con un lettore di schermo vero (vedi `ACCESSIBILITA.md`).

## Per chi sviluppa

- Nello script di gioco: `splitActions`, `cleanAction`, `sendActions`, `removeAction`, `renderQueue`, `setActionMsg` (mostra e annuncia il messaggio), `spotlightNations(n)`, `otherMoveLines(lista)`, `turnPrompt(azioni, salto, conMappa)` e il gestore di **Avanza**. Costanti: `MAX_PENDING` (12), `MAX_ACTION_LEN` (400), `MAX_OTHER_MOVES` (10).
- La coda è `state.pending` (testi); il contatore è `state.turn`. Le voci della cronaca hanno un tipo: `a` azione del giocatore, `t` turno, `n` altre nazioni (nuovo), `v` consigliere, `g` avvisi sulla mappa, `x` avvisi solo a schermo (non salvati).
- Il turno è occupato quando `busySession === gameSession`: una richiesta di una partita già sostituita non occupa quella nuova.
- Quando si cambia il testo della richiesta, `t15_turni.js` controlla le frasi chiave (azioni numerate, salto temporale, richiesta alle altre nazioni, schema): aggiornare le due cose insieme.
- Prove: `node tests/browser/t15_turni.js`, oppure tutte con `node tests/browser/run.js`.
