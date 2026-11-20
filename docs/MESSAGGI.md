# I messaggi delle altre nazioni

Dalla versione 33 le altre nazioni possono **scrivere al giocatore**: una richiesta di colloquio, una proposta di accordo, una richiesta, un ultimatum. Ogni messaggio ha un **peso** da 1 a 5. Il giocatore lo accetta, lo rifiuta, risponde con un colloquio nella scheda Diplomazia oppure non fa nulla; quando il tempo avanza, la risposta cambia le relazioni con chi ha scritto, **in proporzione al peso**.

> **In breve.** I messaggi li scrive il motore (l'intelligenza artificiale): sono finzione, non storia. I numeri della tabella degli effetti sono **regole del gioco scelte dal prototipo**, non dati storici. Le risposte contano quando premi «Avanza»; un messaggio senza risposta conta come ignorato. I messaggi esistono solo nello scenario con la mappa; i colloqui nella scheda Diplomazia contano anche nelle partite libere.

## Che cosa è un messaggio

Ha un **mittente** (uno Stato della mappa che ha ancora almeno un territorio, mai lo Stato di chi gioca), un **tipo**, un **peso** e un **testo** in prima persona (1–3 frasi, al massimo 360 caratteri).

| Tipo | Nome nella pagina | Che cosa chiede il mittente |
|---|---|---|
| `colloquio` | Richiesta di colloquio | un incontro |
| `accordo` | Proposta di accordo | un patto, un'alleanza o un aiuto |
| `richiesta` | Richiesta | qualcosa al giocatore |
| `ultimatum` | Ultimatum | di fare o smettere di fare qualcosa, sotto minaccia |

| Peso | In parole | Quando |
|---|---|---|
| 1 | Minore | questione di poco conto |
| 2 | Medio | il valore di un messaggio di cui il motore non ha detto il peso |
| 3 | Rilevante | |
| 4 | Alto | solo per svolte gravi |
| 5 | Cruciale | solo per svolte gravi |

Il peso lo sceglie il motore, secondo i fatti del periodo e le relazioni (gli amici propongono, gli ostili minacciano); la pagina lo controlla (vedi sotto).

## Come arrivano

A ogni «Avanza», nello scenario con la mappa, la risposta del motore può avere il campo `messaggi`: una lista di `{"da": "FRA", "tipo": "accordo", "peso": 4, "testo": "…"}`. La pagina controlla ogni voce:

- il mittente deve essere uno Stato della mappa che ha ancora territori e che **non** è lo Stato di chi gioca (il codice si legge anche in minuscolo o con spazi);
- il tipo deve essere uno dei quattro (si leggono anche «proposta» e «patto» come accordo, «incontro» come colloquio, «minaccia» come ultimatum); un tipo che non è un testo non vale;
- il testo non deve essere vuoto: si tolgono `<` e `>`, gli a capo e i caratteri di controllo, si riducono gli spazi e ci si ferma a 360 caratteri;
- il peso è un numero intero da 1 a 5: un decimale si **arrotonda** (4,5 diventa 5), un valore fuori scala si tiene fra 1 e 5, un numero scritto come testo («3», «3,4») si legge; quello che non si legge vale 2 (Medio);
- **al massimo un messaggio per Stato e al massimo 3 per turno**; si leggono al massimo 20 voci.

Le voci non valide **non fanno danni**: la cronaca scrive una sola riga «⚠️ Messaggi scartati: N (…)» e il turno prosegue. Se `messaggi` manca o non è una lista non succede nulla e non compare nessun errore. I messaggi di prima sono chiusi dal turno (vedi sotto): nella posta restano solo quelli nuovi, e un salvataggio ne tiene al massimo 6.

## Che cosa si vede

Sotto la scheda della nazione c'è il pannello **«Messaggi in arrivo (N)»**. Ogni messaggio mostra:

- il mittente e il tipo;
- il peso, **a parole e in pallini** («Peso 4 su 5 · Alto», ●●●●○; i pallini sono solo decorativi);
- il testo, fra virgolette;
- **quanto pesa la risposta**: la relazione di adesso e i tre effetti, per esempio «Relazioni con Francia ora +35 (Amichevoli). Se accetti +16, se rifiuti −8, se non rispondi −4; con un colloquio nessun effetto automatico.»;
- lo stato: «Senza risposta», «Accettato», «Rifiutato» o «In trattativa»;
- tre pulsanti: **Accetta**, **Rifiuta** e **Rispondi**.

Accanto ad «Avanza» compare un avviso quando ci sono messaggi senza risposta («Hai 3 messaggi senza risposta: se premi «Avanza» contano come ignorati.»). Il riquadro «Come funzionano i messaggi» ripete le regole e la tabella dei valori. Nella cronaca, ogni turno ha una voce **«Messaggi»** (che cosa è successo a ciascun messaggio, poi i messaggi nuovi) e, se le relazioni cambiano, la riga «🤝 Relazioni» con il motivo («proposta di accordo (peso 4): accettato»).

## Come si risponde

- **Accetta** e **Rifiuta** sono pulsanti a commutazione (`aria-pressed`): premere lo stesso pulsante una seconda volta toglie la risposta; premere l'altro la cambia. La risposta è solo **scritta**: non cambia nulla finché non premi «Avanza».
- **Rispondi** apre un colloquio nella scheda Diplomazia (vedi «I colloqui»). Il messaggio diventa «In trattativa».
- **Senza risposta** vale come **ignorato**: ha un costo, e l'avviso accanto ad «Avanza» lo dice.
- Se un messaggio ha sia una risposta data a mano sia un colloquio, **vale la risposta a mano**.
- Mentre il tempo avanza, e a partita finita, i pulsanti sono spenti.

## Quanto pesa una risposta

Per **ogni punto di peso** le relazioni con il mittente cambiano così:

| Tipo | Accettare | Rifiutare | Ignorare |
|---|---|---|---|
| Richiesta di colloquio | +2 | −1 | −1 |
| Proposta di accordo | +4 | −2 | −1 |
| Richiesta | +3 | −3 | −2 |
| Ultimatum | 0 | −5 | −5 |

L'effetto è **valore × peso**, e la relazione si ferma sempre a −100 e +100. Per esempio:

| Tipo | Risposta | Peso 1 | Peso 2 | Peso 3 | Peso 4 | Peso 5 |
|---|---|---|---|---|---|---|
| Richiesta di colloquio | accettare | +2 | +4 | +6 | +8 | +10 |
| | rifiutare o ignorare | −1 | −2 | −3 | −4 | −5 |
| Proposta di accordo | accettare | +4 | +8 | +12 | +16 | +20 |
| | rifiutare | −2 | −4 | −6 | −8 | −10 |
| | ignorare | −1 | −2 | −3 | −4 | −5 |
| Richiesta | accettare | +3 | +6 | +9 | +12 | +15 |
| | rifiutare | −3 | −6 | −9 | −12 | −15 |
| | ignorare | −2 | −4 | −6 | −8 | −10 |
| Ultimatum | accettare | 0 | 0 | 0 | 0 | 0 |
| | rifiutare o ignorare | −5 | −10 | −15 | −20 | −25 |

Accettare un ultimatum non migliora i rapporti (0): si cede e basta. **Un colloquio non ha nessun effetto automatico**: le relazioni cambiano solo se il motore, leggendo il colloquio, lo riferisce (campo `relazioni`).

**Quando.** A ogni «Avanza», nello scenario con la mappa, le relazioni cambiano in quest'ordine: passa il tempo (ritorno lento), si applicano i cambi di mappa, **si applicano le risposte ai messaggi**, si applica quello che riferisce il motore, si applicano i costi dei territori. La cronaca scrive le righe «🤝 Relazioni» come sempre ([`RELAZIONI.md`](RELAZIONI.md)). I messaggi a cui hai risposto sono poi chiusi: il turno li regola tutti, con o senza risposta.

**Che cosa la pagina non fa.** Non esegue il contenuto del messaggio: se un messaggio chiede un territorio e lo accetti, la mappa non cambia da sola. Lo racconta e lo scrive sulla mappa solo il motore, con le regole di sempre dei cambi di mappa (solo gli ID che conosce, regola dei confini, al massimo 12 cambi).

## I colloqui

**Rispondi** apre la scheda Diplomazia con una conversazione già avviata con il mittente: la prima battuta è il suo messaggio, e l'intelligenza artificiale che risponde per lui è informata di averlo scritto e del suo peso («Poco fa hai scritto tu al giocatore questo messaggio (richiesta di colloquio, peso 2 su 5): «…». Ora il giocatore ti risponde.»). Il cursore va alla casella di testo. Premendo «Rispondi» di nuovo sullo stesso messaggio si riprende la conversazione già aperta; su un altro messaggio se ne apre una nuova. «Cambia» chiude la conversazione e la scollega dal messaggio.

**Che cosa conta per il turno.** Ogni scambio riuscito (che cosa dice il giocatore, che cosa risponde l'altra parte) è **annotato per il motore** e consegnato con il prossimo «Avanza», poi cancellato. Si tengono al massimo **12 scambi** (cadono i più vecchi); al motore ne arrivano **5, i più recenti**, con al massimo 200 caratteri del giocatore e 240 della risposta. Il messaggio a cui si risponde diventa «In trattativa». Questo vale per **qualsiasi colloquio**, anche quello avviato scrivendo a mano con chi parlare, e anche nelle partite libere (dove la richiesta non nomina il campo `relazioni`). Quello che si dice è trattato come parole, non come fatti compiuti: la richiesta al motore lo dice, e un'intesa vale solo se la narrazione la realizza. Nella richiesta le risposte ai messaggi e i colloqui stanno **subito dopo gli ordini del giocatore** e l'ultima frase li nomina (dalla versione 34: in una prova con lettori esterni un modello piccolo non ne teneva conto quando le risposte stavano in cima alla richiesta).

**Aspettare e non sovrapporsi.** Se una risposta del colloquio è ancora in arrivo, «Avanza» non parte e spiega di aspettare («Aspetta la risposta nel colloquio diplomatico, poi premi «Avanza»: il colloquio conta per questo periodo.»); in quel momento anche «Rispondi» è spento. Mentre il tempo avanza, l'invio nel colloquio è spento. Se il turno fallisce, **risposte e colloqui restano** per il tentativo dopo.

## Che cosa sa il motore

La richiesta del turno, nello scenario con la mappa, contiene:

- le **regole per scrivere i messaggi** (circa 810 caratteri): da 0 a 3 nazioni diverse fra loro, mai il giocatore; il formato con i quattro tipi e il peso intero da 1 a 5; che cosa vuol dire ogni tipo e ogni peso (4 e 5 solo per svolte gravi); che il messaggio deve seguire i fatti e le relazioni; che il motore **non decide la risposta del giocatore**; che «messaggi» è vuoto se nessuno scrive;
- i **messaggi del periodo precedente e come ha risposto il giocatore** (ACCETTATO, RIFIUTATO, IGNORATO (SENZA RISPOSTA) o IN TRATTATIVA (COLLOQUIO)), con il codice, il tipo, il peso e il testo. Si dice al motore che **l'effetto sulle relazioni lo applica già il gioco** (non va ripetuto in `relazioni`) e che deve invece raccontare le conseguenze di ciò che il giocatore ha accettato, rifiutato o lasciato cadere;
- i **colloqui avuti** nel periodo (vedi sopra);
- fra le relazioni mostrate al motore, anche gli Stati che hanno scritto.

Il consigliere sa quali messaggi il giocatore ha davanti e che cosa ha già deciso. Il motore **non è obbligato** a scrivere messaggi né a rispettare un peso: è la pagina a decidere che cosa vale (tipo, mittente, testo, peso).

**Dimensione.** Al primo turno con l'Italia la richiesta è di circa 10.200 caratteri (le regole dei messaggi sono circa 810). Nel caso peggiore (tre messaggi di 360 caratteri con le risposte e cinque colloqui lunghi) arriva a circa 14.500: la prova controlla che resti sotto 11.500 senza messaggi e sotto 15.000 nel caso peggiore.

## Salvataggio

Il formato resta quello della versione 3 (`schemaVersion` 3): i campi nuovi sono facoltativi. In `game` ci sono **`inbox`** (i messaggi ancora aperti: `id`, `from`, `type`, `weight`, `text`, `decision` e `talk`), **`talks`** (i colloqui che il motore non ha ancora letto), **`msgSeq`** (l'ultimo numero dato a un messaggio: m1, m2…) e, dentro `diplo`, **`intro`** e **`msgId`** (la conversazione aperta da un messaggio e il messaggio). Nella cronaca si salvano anche le voci «Messaggi». I salvataggi fatti prima della versione 33 non hanno i campi e si caricano con la posta e i colloqui vuoti.

Al caricamento ogni campo è controllato come se il file fosse ostile: un messaggio vale solo con un numero come «m12» che compare una volta, un mittente che è uno Stato della mappa (e non lo Stato scelto), un tipo che esiste, un peso **intero da 1 a 5**, un testo non vuoto; una risposta scritta male diventa «nessuna», un colloquio che non è vero/falso diventa «no»; si tengono al massimo 6 messaggi (i primi) e 12 colloqui (gli ultimi); il numero dell'ultimo messaggio non sta mai sotto il più alto presente e arriva al massimo a 1.000.000; il legame fra una conversazione e un messaggio che non c'è più cade. Le partite libere non hanno messaggi, anche se il documento ne porta.

## Limiti da conoscere

- **Finzione, non storia.** Chi scrive, che cosa chiede e con quale peso lo decide il modello linguistico, secondo la storia alternativa formata finora. La tabella degli effetti e i pesi sono **regole del gioco scelte dal prototipo**: sono nel codice (`MSG_TYPES`) e si possono cambiare, e le prove le controllano con una tabella scritta a mano (cambiandole, vanno cambiate insieme).
- **Non è stato provato con il motore vero.** Le prove usano risposte simulate: come il motore userà il campo `messaggi`, quanto sceglierà bene i pesi e quanto rispetterà il formato si vedrà giocando. Tre lettori esterni (modelli che non conoscono il progetto, 19-20 novembre) hanno letto la richiesta e risposto come il motore: hanno capito il formato dei messaggi, e per le risposte del giocatore si è corretto il testo nella versione 34 (vedi `CHANGELOG.md`); non sostituiscono una partita vera. La richiesta al motore è più lunga (circa 810 caratteri di regole in più, e fino a 4.300 nel caso peggiore).
- **Solo il giocatore riceve messaggi.** Fra le altre nazioni non c'è uno scambio di messaggi: il motore può raccontare che due Stati si incontrano o si accordano (campo `mosse_altre_nazioni`) e cambiare la loro relazione (campo `relazioni`, dalla versione 32), ma senza una posta propria. Una frase che chiedeva al motore anche le coppie fra altre nazioni è stata provata con lettori esterni e non è stata inclusa: smettevano di scrivere le relazioni del giocatore. Un contatto fra altre nazioni, se si farà, avrà un campo suo.
- **Un messaggio per Stato e tre per turno.** Quello che non si risponde si chiude comunque all'«Avanza» successivo: non resta in attesa all'infinito.
- **Il contenuto non si esegue da solo** (vedi sopra) e le relazioni **non bloccano nulla**: la pagina non impedisce né permette azioni in base ai numeri.
- **Non esistono nell'Editor scenario né nelle partite libere** (nelle partite libere, per i colloqui, vale quanto detto sopra).
- Le copie di riferimento in `src/` e in `archive/` non hanno i messaggi.

## Come si cambia

- Le costanti sono nel blocco «Messages from the other nations» della pagina: `MSG_TYPES` (nome e valori di ogni tipo), `MSG_ALIASES`, `MSG_WEIGHTS` (nomi dei pesi), `MSG_DEFAULT_WEIGHT`, `MAX_NEW_MESSAGES`, `MAX_INBOX`, `MAX_MSG_LEN`, `MAX_MSG_READ`, `MAX_TALKS`, `MAX_TALKS_PROMPT`, `TALK_YOU_LEN`, `TALK_THEY_LEN`. Le funzioni principali: `receiveMessages` (controlla le voci del motore), `resolveMessages` (applica le risposte), `messagesContext`, `messagesRules`, `messagesSummary` e `talksContext` (che cosa si dice al motore e al consigliere), `recordTalk`, `cleanInboxSave` e `cleanTalksSave` (salvataggio), `renderMessages`, `decideMessage` e `replyToMessage` (il pannello).
- Quando si cambia la tabella o il testo delle regole, `tests/browser/t19_messaggi.js` si ferma: ha la tabella e le frasi scritte a mano. Aggiornare le due cose insieme.

## Come si prova

- `tests/browser/t19_messaggi.js` (156 controlli, in un Chromium vero, con risposte simulate): la tabella, i tetti e i pesi; che cosa si accetta e che cosa si scarta fra i messaggi del motore (mittente, tipo, testo, peso, due per Stato, massimo 3, voci oltre le 20, non una lista); **tutte le 80 combinazioni** di tipo, risposta e peso più i colloqui, contro i valori attesi scritti nella prova e senza uscire da ±100; il percorso intero (arrivo, pannello con ogni testo e ogni nome dei pulsanti, accettare e rifiutare con mouse e tastiera, avviso, «Avanza», cronaca, richiesta al motore, dove stanno le risposte e che cosa dice l'ultima frase); i colloqui (apertura da un messaggio, scambi annotati per il motore, limiti e lunghezze, attesa di una risposta in arrivo, turno che fallisce, pulsanti spenti durante il turno); la partita libera; salvataggio e caricamento (anche con documenti rovinati messi apposta); aspetto (contrasto nei due temi, pulsante premuto distinguibile, colori forzati, dimensione dei comandi, fine partita).
- **Difetti messi apposta.** Per vedere se la prova si accorge davvero dei guasti, 117 piccole rotture nel codice e nello stile della pagina (un limite spostato, un segno cambiato, un controllo tolto, un campo non salvato…) sono state provate una alla volta: alla prima passata quattro sono sfuggite perché il controllo era troppo largo; sono stati stretti e ora tutte sono notate.
- `tests/lint.test.js` controlla che questa guida sia nell'indice dei documenti.
