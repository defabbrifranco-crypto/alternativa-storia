# Editor scenario e modalità Gioco

Dalla versione 25 la mappa ha **due modalità**, che si scelgono con i due pulsanti sopra la legenda: **Gioco** ed **Editor scenario**. Servono a tenere separate due cose diverse: *giocare* e *preparare uno scenario di partenza*.

## Gioco

- Tocca un territorio per leggerne la scheda; scegli **Gioca come…** per iniziare una partita con quello Stato.
- Durante la partita i territori cambiano **solo per le regole e gli eventi della storia**. Non ci sono comandi per spostarli a mano.
- Ogni cambiamento proposto dall'AI (cambio di proprietario, occupazione, segnaposto) viene controllato prima di essere applicato: una provincia senza confine con lo Stato che dovrebbe riceverla, un codice sconosciuto o un cambiamento senza senso vengono scartati, e la pagina dice che cosa non è stato applicato. Le prove sono in `tests/browser/t3_game.js` e `t11_engine.js`.

## Editor scenario

Serve a cambiare la mappa di partenza **a mano**, senza partita in corso.

- Non si può accendere durante una partita: il pulsante resta spento e la pagina spiega che bisogna prima uscire con **Nuova partita**.
- Nella scheda di una provincia compaiono i comandi dell'Editor:
  - **Cedi sovranità e controllo**: la provincia passa a un altro Stato, sia come proprietario sia come controllore;
  - **Solo controllo (occupazione)**: il proprietario resta lo stesso, cambia chi la controlla (sulla mappa compaiono le righe diagonali);
  - **Aggiungi segnaposto**: un segnaposto dello scenario, di uno dei 17 tipi.
- Sopra la mappa trovi il conto delle modifiche rispetto al 31 dicembre 1960 e il pulsante **Ripristina lo scenario di partenza**, che si preme **due volte** (la seconda per confermare; se non confermi, dopo qualche secondo la richiesta decade).
- Intorno alla mappa compare un bordo tratteggiato: è il segno che stai modificando lo scenario.

### Salvare uno scenario: è un file

Le modifiche dell'Editor **non si salvano da sole**. Per conservarle usa **Esporta**:

- senza partita in corso la finestra parla di *scenario* e il file si chiama `storia-alternativa-scenario.json`;
- **Importa** lo ricarica (anche da un altro dispositivo). Uno scenario importato non avvia nessuna partita e **non sovrascrive mai la partita salvata**.

Per giocare uno scenario: torna a **Gioco**, tocca un territorio e scegli **Gioca come…**. La partita parte dalla mappa modificata. **Nuova partita** riporta la mappa al 31 dicembre 1960, perciò esporta prima lo scenario se vuoi tenerlo.

Cosa non fa: l'Editor non cambia la data di partenza (resta il 31 dicembre 1960) e non modifica i dati storici delle province (popolazione, capoluogo…); cambia solo chi possiede e chi controlla un territorio, e i segnaposto.

## Proprietario e controllore

La legenda sotto i pulsanti lo ricorda sempre:

- **Colore pieno**: il territorio è controllato dal suo proprietario.
- **Righe diagonali**: il territorio è **occupato**. Il colore di fondo è quello del proprietario (la *sovranità*), le righe sono del colore di chi lo controlla.
- **Proprietario**: lo Stato a cui il territorio appartiene di diritto. **Controllore**: lo Stato che lo tiene di fatto, con truppe e amministrazione. Di solito coincidono.
- Sotto la mappa, **Territori occupati** elenca in parole i territori occupati (chi è il proprietario e chi il controllore) e si può toccare per aprirne la scheda: le righe da sole non bastano a tutti.
- La partita finisce quando il tuo paese **non controlla più nessun territorio**, anche se ne resta il proprietario.

## Per chi sviluppa

- Uno scenario è un salvataggio **senza partita**: `{ v: 3, schemaVersion: 3, changes: { <id provincia>: { owner, controller } }, markers, markerSeq, game: null }`. È lo stesso formato dei salvataggi (`buildSavePayload`, `applySave`), quindi non serve altro per leggerlo o scriverlo.
- Lo stato delle modalità è nella variabile `editorMode` (mai salvata) e nella classe `editing` su `<body>`: i controlli riservati all'Editor hanno la classe `editor-only`, quelli del Gioco `game-only`. `updateModeUI()` riallinea pulsanti, note e riepilogo; `setEditorMode(true)` rifiuta se `gameMode` è impostato.
- I gestori dei pulsanti dell'Editor controllano comunque `editorMode`: anche se qualcosa li "cliccasse" mentre sono nascosti, durante una partita non fanno nulla.
- `applySave` rifiuta uno scenario mentre una partita è in corso (messaggio in `saveStatus`, motivo in `loadRefusal`) prima di toccare la mappa.
- «Salva partita» salva solo con una partita in corso; `transferLoad` non scrive nello slot di salvataggio quando importa uno scenario.
- Le prove sono in `tests/browser/t13_editor.js`.

## Verifica dei dati di partenza

L'ultimo punto della #2 chiedeva di verificare la coerenza dei dati di partenza in tre casi: Siria e Repubblica Araba Unita (RAU), Cipro, repubbliche sovietiche come suddivisioni dell'URSS. La #2 parla del 1° gennaio 1960; lo scenario è fissato al **31 dicembre 1960** ([`METODOLOGIA.md`](METODOLOGIA.md)) e la verifica vale per quella data. Controllo del **2 novembre 2026** sulla pagina (versione 29), sul file dei dati di popolazione e sulle fonti già schedate in [`STATUS-1960.md`](STATUS-1960.md); non è stata consultata nessuna fonte primaria d'archivio.

**In breve.** Siria e Cipro sono coerenti. Per le repubbliche sovietiche la pagina fa una scelta **diversa da quella proposta dalla #2**: serve una decisione dell'autore.

### Siria e Repubblica Araba Unita: coerente

- **Dati.** Il record della Siria dice «Regione settentrionale della Repubblica Araba Unita (febbraio 1958 - 28 settembre 1961)»; il file fornito diceva «Stato sovrano» ed è stato corretto (status controllato online su fonti secondarie il 25 e 26 ottobre 2026, con cinque fonti: [`STATUS-1960.md`](STATUS-1960.md)). La nota ricorda che all'ONU la RAU era un solo membro e che la Siria riprese il proprio seggio il 13 ottobre 1961.
- **Pagina.** La scheda della Siria mostra quello status, il perimetro («Regione siriana») e la nota.
- **Limiti da conoscere.** L'Egitto non è sulla mappa (copre Europa e Asia), quindi la RAU non compare come Stato unico: la Siria è uno Stato giocabile a sé, con l'etichetta di alleanza «Non allineata», scritta dal prototipo e non verificata. Lo status si vede solo nella scheda: **non è mandato all'AI**, che riceve il nome dello Stato, l'alleanza e l'elenco dei territori. Chi gioca come Siria parte quindi come se guidasse uno Stato indipendente.

### Cipro: coerente

- **Dati.** Al 31 dicembre 1960 Cipro è uno Stato sovrano: indipendente dal 16 agosto 1960, membro dell'ONU dal 20 settembre 1960 (tre fonti secondarie). Al 1° gennaio 1960 non era ancora indipendente, quindi per Cipro la data dello scenario conta: la scheda mostra lo status del 31 dicembre.
- **Pagina.** Sei distretti; nei dati della pagina la capitale è Nicosia e l'alleanza è «da verificare» (la pagina stessa la segna come dubbia). I due valori di popolazione discordanti (573.000 e 580.000) sono mostrati come tali. Le basi britanniche di Akrotiri e Dhekelia sono citate nella nota del file dei dati e non sono sulla mappa.
- Niente da correggere.

### Repubbliche sovietiche: non come proposto dalla #2, serve una decisione

- **Come sono oggi.** Le 14 repubbliche (Ucraina, Bielorussia, Moldavia, Estonia, Lettonia, Lituania, Georgia, Armenia, Azerbaigian, Kazakistan, Uzbekistan, Turkmenistan, Tagikistan, Kirghizistan) sono **Stati separati e giocabili**, con l'etichetta «Patto di Varsavia» e la nota «Repubblica sovietica, non uno stato sovrano nel 1960 — da verificare per usi storici precisi». «URSS» sulla mappa è la sola Russia (RSFSR) entro i confini attuali, con 20 unità. Esiste **un solo valore di popolazione**, riferito all'intera Unione («Intero Stato, inclusa la parte asiatica»); le repubbliche non ne hanno uno proprio e la scheda lo dice.
- **Che cosa non torna.**
  1. La #2 le vorrebbe suddivisioni dell'URSS; la pagina le tratta come Stati.
  2. Il territorio dello Stato «URSS» sulla mappa è la sola RSFSR, ma la cifra della sua scheda è quella dell'intera Unione: la scheda ne scrive il perimetro e la nota, ma i due non coincidono.
  3. Fra le tre nazioni in evidenza che la richiesta all'AI cita a ogni «Avanza» ([`TURNO-E-AZIONI.md`](TURNO-E-AZIONI.md)) può capitare anche una repubblica sovietica, trattata come un paese a sé.
  4. «Non uno stato sovrano» è una semplificazione: Ucraina e Bielorussia risultano fra i membri fondatori dell'ONU, con un seggio distinto da quello dell'URSS (ratifica depositata il 24 ottobre 1945; elenco letto il 2 novembre 2026 sulla [pagina dei membri fondatori](https://research.un.org/en/unmembers/founders) della Biblioteca Dag Hammarskjöld). Le altre dodici repubbliche non sono in quell'elenco.
- **Opzioni.**
  - **A. Lasciare com'è** (consigliata per ora). Nessun lavoro e nessun rischio per i salvataggi; le schede e le note già dicono che non sono Stati sovrani e che non hanno un dato proprio. Resta il disallineamento fra il territorio dell'URSS e la sua cifra, descritto qui.
  - **B. Farne suddivisioni dell'URSS**, come nella #2. Un solo Stato «URSS» con 15 unità: la cifra di popolazione tornerebbe coerente con il territorio. È una modifica grande: schede, regole di gioco («Gioca come Ucraina» sparirebbe), salvataggi esistenti da convertire, note e prove nel browser. Va fatta in una versione a parte, con le prove.
- **Decisione richiesta** all'autore: A oppure B. Finché non c'è, vale A.

### Che cosa non è stato fatto

Nessuna modifica al codice, ai dati o alle prove: questa è solo la verifica. Gli status sono quelli di [`STATUS-1960.md`](STATUS-1960.md), controllati su fonti secondarie; nessuno è stato confrontato con fonti primarie.

## Ancora da fare

- Decidere come trattare le repubbliche sovietiche (vedi «Verifica dei dati di partenza» sopra).
- Salvare gli scenari anche nella memoria del browser (oggi solo come file).
