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

## Ancora da fare

- Verificare che i dati di partenza siano coerenti (Siria/RAU, Cipro, repubbliche sovietiche come suddivisioni dell'URSS): dipende dalle decisioni sullo status dei territori, non dal codice.
- Salvare gli scenari anche nella memoria del browser (oggi solo come file).
