# Alternativa Storia

Prototipo di gioco di storia alternativa con mappa interattiva. Lo scenario di partenza è il **31 dicembre 1960**: si sceglie uno Stato dell'Europa o dell'Asia, si scrivono le azioni, si fa passare il tempo e un modello linguistico (l'«AI») racconta che cosa succede, comprese le mosse delle altre nazioni.

> **Stato: prototipo in sviluppo.** I dati storici e territoriali sono verificati solo in parte e non vanno usati come riferimento storico. Le narrazioni e le mosse delle altre nazioni sono generate da un modello linguistico: sono finzione, non storia.

## Come si gioca

1. Tocca uno Stato sulla mappa e scegli «Gioca come…».
2. Scrivi nella casella una o più azioni, una per riga, e premi **Invia**: finiscono nell'elenco delle azioni in attesa. Il tempo non passa.
3. Scegli il salto di tempo (1 settimana, 1 mese, 6 mesi, 1 anno) e premi **Avanza**: le azioni sono eseguite e anche le altre nazioni agiscono liberamente.

Il turno è spiegato in [`docs/TURNO-E-AZIONI.md`](docs/TURNO-E-AZIONI.md). Con la mappa in modalità **Editor scenario** si possono invece modificare chi possiede e chi controlla i territori e salvare lo scenario come file: [`docs/EDITOR-SCENARIO.md`](docs/EDITOR-SCENARIO.md).

## Limiti attuali

- **Dati storici verificati solo in parte.** Nessun valore di popolazione è stato ricontrollato sulla fonte primaria (`verified: false` in tutti i record). Gli status politici al 31 dicembre 1960 sono stati controllati online per 37 record su 77, su fonti secondarie e non d'archivio; 32 record europei non hanno status. Vedi [`docs/METODOLOGIA.md`](docs/METODOLOGIA.md), [`docs/FONTI.md`](docs/FONTI.md) e [`docs/STATUS-1960.md`](docs/STATUS-1960.md) ([#3](../../issues/3)).
- **La mappa è approssimata.** I contorni degli Stati derivano da un file con gli attributi di Natural Earth; le regioni sono celle calcolate da elenchi di punti, non confini storici; tre linee sono tracciate a mano senza fonte. Vedi [`docs/CONFINI-MAPPA.md`](docs/CONFINI-MAPPA.md) e [`ATTRIBUZIONI.md`](ATTRIBUZIONI.md).
- **L'AI non è provata dal vivo dalle prove automatiche.** Queste usano risposte simulate: la qualità delle mosse delle altre nazioni e il rispetto del formato dipendono dal modello. Le mosse territoriali delle altre nazioni arrivano sulla mappa solo per le province che il motore conosce.
- **Accessibilità.** Tastiera, struttura per i lettori di schermo, contrasto e movimento ridotto sono curati e misurati con strumenti, ma la pagina non è mai stata provata con un lettore di schermo vero ([#4](../../issues/4)). Vedi [`docs/ACCESSIBILITA.md`](docs/ACCESSIBILITA.md).
- **Dataset di popolazione non letto dalla pagina.** `src/data/population_1960.json` esiste, ma la pagina ne tiene una copia scritta dentro; una prova automatica controlla che coincidano ([#8](../../issues/8)).
- **Solo Chromium.** La pagina è provata solo con Chromium e non è stata aperta da GitHub Pages.

## Struttura del repository

| Percorso | Contenuto |
|---|---|
| `src/` | La pagina del gioco (`storia-alternativa-prototipo.html`, un solo file HTML), due copie di riferimento (la versione 23 e la variante «map-overlay») e i dati in `src/data/` |
| `archive/` | Versione precedente: `storia-alternativa-prototipo.html` |
| `docs/` | Guide e documenti: vedi l'[indice](docs/README.md) |
| `tests/` | Prove sui dati e sulla pagina (`node --test`) e prove nel browser (`tests/browser/`) |
| `index.html` | Reindirizza alla pagina del gioco (per GitHub Pages) |
| `LICENSE`, `ATTRIBUZIONI.md`, `CHANGELOG.md`, `CITATION.cff` | Licenza, provenienza dei dati, registro delle modifiche, bozza di citazione |

## Come provarlo

La pagina è un singolo file HTML senza dipendenze esterne: [`src/storia-alternativa-prototipo.html`](src/storia-alternativa-prototipo.html). Dentro Claude usa il modello di Claude e il suo spazio di salvataggio. In un normale browser la mappa e il gioco si aprono lo stesso: la partita si salva nel browser (oppure si esporta in un file) e l'AI funziona in **modalità manuale**, cioè la pagina mostra il testo da copiare in un assistente e un campo in cui incollare la risposta. Vedi [`docs/USO-FUORI-DA-CLAUDE.md`](docs/USO-FUORI-DA-CLAUDE.md).

Prove automatiche (serve Node 20 o più recente):

- `node --test`: prove sui dati, sul file della pagina e sui documenti (sintassi, versioni, collegamenti);
- `npm install` e `npx playwright install chromium` (una volta), poi `npm run test:browser`: prove della pagina in un Chromium vero, con risposte dell'AI simulate;
- `npm test` le esegue tutte.

GitHub le esegue a ogni push e a ogni pull request (workflow «Prove automatiche»).

## Guide e documenti

| Documento | Di cosa parla |
|---|---|
| [`docs/TURNO-E-AZIONI.md`](docs/TURNO-E-AZIONI.md) | Il turno: «Invia», «Avanza» e le altre nazioni |
| [`docs/EDITOR-SCENARIO.md`](docs/EDITOR-SCENARIO.md) | Modalità Gioco ed Editor scenario |
| [`docs/ACCESSIBILITA.md`](docs/ACCESSIBILITA.md) | Uso con tastiera e lettore di schermo; come provarlo a mano |
| [`docs/USO-FUORI-DA-CLAUDE.md`](docs/USO-FUORI-DA-CLAUDE.md) | Salvataggi nel browser, esportazione, modalità manuale |
| [`docs/METODOLOGIA.md`](docs/METODOLOGIA.md) e [`docs/FONTI.md`](docs/FONTI.md) | Come sono trattati i dati storici e da dove vengono |
| [`docs/STATUS-1960.md`](docs/STATUS-1960.md) | Status politici al 31 dicembre 1960: che cosa è stato controllato |
| [`docs/CONFINI-MAPPA.md`](docs/CONFINI-MAPPA.md) | Come è costruita la mappa |
| [`CHANGELOG.md`](CHANGELOG.md) | Registro delle modifiche, versione per versione |

## Sviluppo

Il lavoro prosegue per issue. Da fare, in ordine:

1. Provare un turno con il modello vero dentro Claude e rifinire la richiesta all'AI.
2. Provare la pagina con un lettore di schermo vero (NVDA, VoiceOver o TalkBack) e riferire l'esito ([#4](../../issues/4)).
3. Completare con fonti gli status mancanti e sostituire le fonti secondarie dei dati ([#3](../../issues/3)).
4. Far leggere alla pagina il dataset di popolazione ([#8](../../issues/8)).
5. ESLint e axe nelle prove automatiche; aggiungere `package-lock.json`.
6. Rendere la mappa riproducibile (aggiungere gli script di costruzione o indicare dove scaricare i file di partenza).

## Licenza

Il codice e i testi del progetto sono distribuiti con licenza **MIT** (vedi [`LICENSE`](LICENSE)). La licenza non cambia le condizioni dei dati di terzi (contorni degli Stati, elenchi di unità, dati di popolazione): da dove vengono e che cosa resta da chiarire è in [`ATTRIBUZIONI.md`](ATTRIBUZIONI.md).

## Come citare

Il file [`CITATION.cff`](CITATION.cff) contiene una **bozza** di citazione: mancano ancora la versione e la data di rilascio e non è stata controllata con lo strumento ufficiale. Se GitHub la accetta, sulla pagina del progetto compare il pulsante «Cite this repository».

## Note

Il progetto è sviluppato con l'aiuto di strumenti di intelligenza artificiale.
