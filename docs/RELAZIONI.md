# Le relazioni fra gli Stati

Dalla versione 32 ogni coppia di Stati ha una **relazione**: un numero intero da **−100 a +100**. Da −100 a 0 le relazioni sono ostili o fredde, da +1 a +100 sono amichevoli. Le relazioni cambiano durante la partita e si vedono nel gioco.

> **In breve.** I valori di partenza al 31 dicembre 1960 sono **una stima del prototipo, non dati storici**: nessuna coppia è stata controllata su una fonte, e la pagina lo dice dove li mostra («stima provvisoria», «(provvisorio)»). Durante la partita le relazioni cambiano in quattro modi: per quello che riferisce il motore («relazioni» nella sua risposta), per le risposte del giocatore ai messaggi delle altre nazioni (una regola del gioco: [`MESSAGGI.md`](MESSAGGI.md)), per i territori che passano di mano o vengono occupati (una regola del gioco, non storia) e, lentamente, tornando verso il valore di partenza. Le relazioni esistono solo nello scenario con la mappa, non nelle partite libere.

## La scala

| Valore | Fascia | |
|---|---|---|
| da −100 a −76 | Ostilità aperta | ostili o fredde |
| da −75 a −51 | Ostili | |
| da −50 a −26 | Tese | |
| da −25 a 0 | Fredde | |
| da +1 a +25 | Cordiali | amichevoli |
| da +26 a +50 | Amichevoli | |
| da +51 a +75 | Strette | |
| da +76 a +100 | Molto strette | |

Lo zero sta dal lato freddo («Fredde»), il +1 dal lato amichevole («Cordiali»): è la scala chiesta per il gioco, «da −100 a 0 e da +1 a 100». Il valore è sempre scritto con il segno (+35, −60, 0; per i negativi con il vero segno meno «−»). La fascia è sempre scritta a parole accanto al numero: il colore non è l'unica informazione.

C'è **un solo valore per coppia**: la relazione dell'Italia con la Francia è la stessa della Francia con l'Italia. Non ci sono rapporti a senso unico.

## I valori di partenza

**Non sono dati storici.** Sono scritti in `src/data/states_1960.json`, in `meta.relations`, con `verified: false` e con un testo (`basis`) che dice da dove vengono. Si calcolano con tre sole regole, nell'ordine:

1. **Unione Sovietica e repubbliche sovietiche** (le 15 voci del gruppo «urss», cioè l'Unione Sovietica e le 14 repubbliche giocabili a parte): fra loro **+80**.
2. **Una colonia o un protettorato e la sua madrepatria**: **+60** (colonie e protettorati britannici con il Regno Unito, colonie portoghesi con il Portogallo).
3. **Altrimenti, i due blocchi** a cui appartengono le alleanze dei due Stati. Il blocco si ricava dall'etichetta di alleanza della pagina, che a sua volta **non è verificata**:

| Blocco | Etichette di alleanza | Stati |
|---|---|---|
| Occidentale (`west`) | NATO, CENTO, SEATO, SEATO e CENTO, Alleata USA, Alleata del Regno Unito | 22 |
| Orientale (`east`) | Patto di Varsavia, Blocco comunista | 26 |
| Non allineati (`neutral`) | Non allineata | 23 |
| Colonie e protettorati (`colonial`) | Colonia britannica, Colonia portoghese, Protettorato britannico | 10 |
| Alleanza da verificare (`unknown`) | da verificare | 2 |

| Fra i blocchi | Valore | | Fra i blocchi | Valore |
|---|---|---|---|---|
| occidentale – occidentale | +35 | | non allineati – non allineati | +10 |
| orientale – orientale | +45 | | coloniale – occidentale | +10 |
| occidentale – orientale | −60 | | coloniale – orientale | −10 |
| tutti gli altri abbinamenti | 0 | | | |

Per esempio: Italia–Francia +35, Italia–Unione Sovietica −60, Polonia–Unione Sovietica +45 (la Polonia non è nel gruppo sovietico), Ucraina–Unione Sovietica +80, Regno Unito–Hong Kong +60, Italia–Jugoslavia 0.

**Che cosa questo non è.** Non dice nulla sulla storia vera delle singole coppie: il Marocco e la Francia, la Cina e l'Unione Sovietica (nel 1960 già in rottura) o la Grecia e la Turchia hanno tutte il valore che discende dai blocchi, non quello che avevano. Cambiare un valore per una coppia singola richiede una fonte e una regola nuova nel file (vedi «Come si cambia»). Finché non c'è una fonte, `verified` resta `false`: lo impone la prova `tests/stati.test.js`.

## Come cambiano durante la partita

A ogni «Avanza», nello scenario con la mappa, succede in quest'ordine:

1. **Passa il tempo.** Ogni scarto dal valore di partenza si riduce un poco (vedi sotto).
2. **Si applicano i cambi di mappa** dell'ordine e della risposta del motore (come sempre, con la regola dei confini).
3. **Si applicano le risposte ai messaggi** delle altre nazioni (accettare, rifiutare, ignorare: [`MESSAGGI.md`](MESSAGGI.md)).
4. **Si applica quello che riferisce il motore** (campo `relazioni`).
5. **Si applicano i costi dei territori** che sono passati di mano o sono stati occupati.

La cronaca scrive **una riga «🤝 Relazioni»** per ogni coppia mossa da un evento (non dal solo passare del tempo), dal valore che la coppia aveva a inizio turno: per esempio «Italia – Francia: +35 → +15 (Cordiali) — Crisi di frontiera». Prima viene lo Stato di chi gioca; le righe sono ordinate dalla variazione più grande.

### 1. Quello che riferisce il motore

Il motore (l'intelligenza artificiale che racconta il turno) può elencare in «relazioni» i fatti che cambiano davvero i rapporti fra due Stati: `{"nazione_a": "FRA", "nazione_b": "ITA", "variazione": -20, "motivo": "Crisi di frontiera"}`. Dice **solo la variazione**, non il nuovo valore. La pagina controlla ogni voce:

- i due Stati devono essere diversi e stare sulla mappa (i codici si leggono anche in minuscolo o con spazi);
- la variazione deve essere un numero (anche scritto come testo, anche con il vero segno meno «−»), **arrotondato all'intero**; zero non cambia nulla e non è un errore;
- **da −30 a +30 per coppia e per turno**: più voci sulla stessa coppia si sommano, poi il totale si ferma a ±30;
- **al massimo 12 voci** per turno (di norma ne servono da 0 a 5): le altre non si leggono;
- il risultato si ferma sempre a −100 e +100.

Le voci non valide (Stato che non esiste, Stato uguale, valore che non è un numero, voce che non è un oggetto, voci oltre le 12) **non fanno danni**: la cronaca scrive una sola riga «⚠️ Variazioni di relazione ignorate: N» e il turno prosegue. Se «relazioni» manca o non è una lista (risposte vecchie, o motore che sbaglia) non succede nulla e non compare nessun errore.

### 2. I territori che passano di mano

È **una regola del gioco, non storia**: chi prende un territorio a un altro Stato, o lo occupa, viene guardato con ostilità. Si calcola confrontando la mappa prima e dopo il turno, per ogni coppia di Stati:

| | Primo territorio | Ogni territorio in più | Massimo per coppia e per turno |
|---|---|---|---|
| **Cambio di sovranità** (cambia il proprietario) | −10 | −2 | −20 |
| **Occupazione** (cambia chi controlla, il proprietario resta) | −6 | −1 | −12 |

Valgono per **qualsiasi coppia**, anche se il tuo Stato non c'entra (se la Polonia prende un territorio alla Germania Est, scende la relazione fra Polonia e Germania Est). Se nello stesso turno la stessa coppia ha sia passaggi di sovranità sia occupazioni, i due costi si sommano (al massimo −32). **Non c'è nessun effetto positivo** quando il controllo ritorna al proprietario o un territorio passa «per accordo»: la pagina non può sapere se è stato un trattato o la forza. Se un cambio è stato concordato, al motore è chiesto di compensarlo con una variazione positiva.

### 3. Il ritorno lento ai valori di partenza

Col tempo gli scarti si riducono. A ogni mese di gioco lo scarto dal valore di partenza si riduce del **4%**, di **un punto** almeno e mai oltre il valore di partenza (si arrotonda per eccesso: con uno scarto di 30 si perdono 2 punti al mese, con uno scarto di 25 o meno 1 punto). Per esempio, uno scarto di 30 punti (una relazione portata da +35 a +65) diventa 21 dopo 6 mesi, 15 dopo un anno, 3 dopo due anni e sparisce dopo 27 mesi; uno scarto di 60 diventa 32 dopo un anno e sparisce dopo 40 mesi; uno scarto di 100 diventa 57 dopo un anno e sparisce dopo 51 mesi. I salti di tempo valgono: **1 settimana = ¼ di mese**, 1 mese = 1, 6 mesi = 6, 1 anno = 12 (un salto sconosciuto vale 1 mese). Le frazioni di mese si accumulano (`relClock` nel salvataggio): quattro «1 settimana» fanno un mese, e il ritorno lento avviene anche in una partita giocata a settimane.

### 4. Le risposte ai messaggi delle altre nazioni

Dalla versione 33 le altre nazioni possono scrivere al giocatore (richiesta di colloquio, proposta di accordo, richiesta, ultimatum), ognuna con un **peso** da 1 a 5. Quando il giocatore preme «Avanza», ogni messaggio aperto cambia la relazione con chi l'ha scritto di **valore × peso**: per esempio un accordo di peso 4 accettato vale +16, un ultimatum di peso 5 rifiutato −25, un colloquio di peso 2 ignorato −2. Un messaggio senza risposta conta come ignorato; un colloquio nella scheda Diplomazia non ha effetto automatico (se cambia qualcosa, lo riferisce il motore). È **una regola del gioco, non storia**. La cronaca scrive una riga «🤝 Relazioni» anche per questi cambi, con il motivo («proposta di accordo (peso 4): accettato»). La tabella completa e il resto sono in [`MESSAGGI.md`](MESSAGGI.md).

## Che cosa si vede

- **Il pannello «Relazioni»**, sotto la scheda della nazione, nello scenario con la mappa: «Più vicine» (i tre Stati con il valore più alto, fra quelli con un valore positivo) e «Più ostili» (i tre con il valore più basso, fra quelli con un valore negativo); a parità di valore prima quelli che si sono mossi di più, poi il più popoloso; se non ce n'è nessuno la riga dice «nessuna», **«Tutte le relazioni (82)»** (l'elenco completo, chiuso all'inizio, dal valore più alto; a parità prima chi si è mosso, poi in ordine alfabetico; ogni voce dice la fascia a parole e, se è cambiata, «dall'inizio +20»), una nota che dice la scala e che i valori di partenza sono una stima provvisoria, e «Come sono calcolati i valori di partenza» (il testo del file). Gli Stati senza più territori non compaiono.
- **La scheda del territorio** ha la riga **«Relazione con il proprietario»** («+35 · Amichevoli (provvisorio)»): non c'è per i tuoi territori. Si aggiorna da sola se la relazione cambia mentre la scheda è aperta.
- **La cronaca** ha le righe «🤝 Relazioni» descritte sopra.
- Nelle **partite libere** (senza la mappa) non c'è niente di tutto questo.

## Che cosa sa il motore

A ogni turno la richiesta contiene: la scala; le relazioni del tuo Stato con **fino a cinque Stati vicini (almeno +26) e fino a cinque ostili (al massimo −26)** (a parità di valore il più popoloso: la popolazione si legge dal file della popolazione 1960, che non è verificato, e **serve solo a mettere in ordine**, non viene mostrata), con fino a otto Stati con cui il rapporto si è mosso di almeno 5 punti dall'inizio, con fino a quattro Stati nominati nelle tue azioni e nel racconto e con quelli messi in primo piano nel turno, compresi gli Stati che hanno scritto al giocatore (in tutto al massimo 30); poi fino a 20 coppie **fra altri Stati** cambiate di almeno 5 punti rispetto alla partenza (con il valore attuale e quello di partenza). Ogni nome ha il suo codice (la risposta usa i codici). Seguono le regole: come elencare le variazioni, che le risposte del giocatore ai messaggi e i cambi di territorio pesano già da soli («non ripeterli»; se un cambio è concordato, compensarlo con una variazione positiva), che col tempo i valori tornano verso quello di partenza, che rapporti molto ostili frenano la collaborazione e molto stretti la favoriscono ma le svolte restano possibili. Il consigliere riceve un riassunto (i tre più vicini e i tre più ostili); le istruzioni della conversazione con un'altra nazione portano la relazione fra il tuo Stato e quello con cui parli, se il suo nome corrisponde a uno Stato della mappa.

Il motore **non è obbligato** a seguire i numeri: è una guida, non una regola che blocca azioni. La pagina non impedisce nulla in base alla relazione (per ora i numeri sono letti dal motore e mostrati al giocatore).

## Salvataggio

Il formato resta quello della versione 3 (`schemaVersion` 3): i campi nuovi sono facoltativi. In `game` ci sono **`relations`** (`{"FRA|ITA": 15}`: solo le coppie diverse dal valore di partenza, chiavi in ordine alfabetico) e **`relClock`** (la frazione di mese non ancora contata: 0,25, 0,5 o 0,75). I salvataggi fatti prima della versione 32 non hanno i campi e si caricano con tutte le coppie al valore di partenza.

Al caricamento ogni voce è controllata come se il file fosse ostile: vale solo una chiave «AAA|BBB» con due Stati della mappa in ordine alfabetico, con un valore **intero da −100 a +100 e diverso da quello di partenza**; tutto il resto (chiavi minuscole, Stati che non esistono, valori con la virgola, testi, null, `__proto__`, oltre 4.000 voci) si scarta senza rompere la partita. Le partite libere non hanno relazioni, anche se il documento ne porta.

## I dati che non tornano

Se `meta.relations` manca o è sbagliato (un'alleanza in nessun blocco o in due blocchi, un valore fra blocchi mancante o fuori da ±100, un gruppo con uno Stato che non esiste, una madrepatria che non esiste, `verified` che non è vero/falso…), la pagina **non parte** e mostra, come per gli altri dati degli Stati, l'avviso «Il prototipo non può partire: i dati degli Stati non sono stati letti (…)» con il motivo. La prova `tests/browser/t18_relazioni.js` ha 15 di questi guasti messi apposta.

## Limiti da conoscere

- **I valori di partenza sono una stima.** Tre sole regole (blocchi, Unione Sovietica, colonie); nessuna coppia è stata controllata. Le coppie che nel 1960 erano diverse dalla regola (rotture dentro un blocco, amicizie fra blocchi) non lo sono nel gioco.
- **I costi dei territori e il ritorno lento sono scelte del prototipo**, non misure storiche: sono costanti nel codice (`REL_CONQUEST`, `REL_OCCUPATION`, `REL_DRIFT`) e si possono cambiare.
- **Non si possono modificare nell'Editor scenario**: le relazioni cambiano solo giocando.
- **Non è stato provato con il motore vero.** Le prove usano risposte simulate: come il motore vero userà i numeri e il campo «relazioni» si vedrà giocando. La richiesta al motore è più lunga: al primo turno, con l'Italia, la parte sulle relazioni è di circa 1.300 caratteri su 9.200 in tutto (la prova controlla che il contesto e le regole restino sotto i 1.000 caratteri ciascuno e la richiesta intera sotto gli 11.000).
- **Per ora le relazioni non decidono nulla da sole**: non bloccano né permettono azioni; le legge il motore e le vede il giocatore.
- **La popolazione** usata per mettere in ordine gli Stati a parità è quella del file (non verificata) quando ha una sola cifra; per i 17 Stati senza cifra unica (le 14 repubbliche sovietiche, il Pakistan, lo Yemen e il Borneo Britannico) conta il numero di territori sulla mappa, poi il codice.

## Come si cambia

- I valori di partenza, i blocchi, il gruppo sovietico e le madrepatrie stanno in `src/data/states_1960.json`, `meta.relations` (schema in `src/data/states_1960.schema.json`). Dopo ogni modifica: `npm run dati:incorpora` (copia i dati nella pagina), poi `node --test`. Una coppia che deve valere diversamente dalla regola richiede una **fonte** e un cambiamento della regola, non un numero scritto a mano: finché non c'è una fonte, `verified` resta `false`.
- Le costanti del gioco (limiti per turno, costi dei territori, ritorno lento, fasce) sono nel blocco «relations between the states» della pagina.

## Come si prova

- `tests/stati.test.js`: i dati (blocchi, gruppi, madrepatrie, ogni coppia di Stati con un valore intero da −100 a +100, `verified: false`, lo schema che si accorge dei guasti).
- `tests/browser/t18_relazioni.js` (192 controlli, in un Chromium vero): tutte le 3.403 coppie contro un secondo calcolo scritto nella prova; le fasce e i loro bordi; il pannello e la scheda (anche a 320 px e nei due temi); le risposte del motore (valide, sporche, somme, limiti); i territori (costi e tetti, anche fra altri Stati); il ritorno lento (contro un calcolo indipendente, anche a settimane); salvataggio e caricamento (anche con documenti ostili); la richiesta al motore, al consigliere e nelle conversazioni; la partita libera; i guasti messi apposta nei dati.
- I **difetti messi apposta** sono stati provati uno alla volta, rimettendo a posto il file dopo ognuno: 69 piccole rotture nel codice della pagina (un limite spostato, un segno cambiato, un controllo tolto…) e 34 nel file dei dati. Ognuno ha fatto fallire almeno una prova. Un settantesimo, che toglieva una condizione sempre vera insieme a un'altra, non cambiava nulla di visibile e non conta; due difetti vicini a quello hanno mostrato una lacuna, che ora le prove coprono (scenario caricato da file con uno Stato scelto; salvataggio di una partita senza uno Stato valido per chi gioca). Gli script di queste prove non sono nel repository: servono a chi cambia le regole e vanno riscritti per le regole nuove. `FAIL_FAST=1` fa fermare una prova del browser al primo controllo fallito, per rifarle in fretta.
