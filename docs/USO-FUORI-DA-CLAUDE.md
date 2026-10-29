# Usare il gioco fuori da Claude

Dalla versione 24 la pagina funziona **dentro Claude e anche fuori**: da GitHub Pages, da un file sul computer o sul telefono. Qui è spiegato come.

## In breve

| Cosa | Dentro Claude | Fuori da Claude |
|---|---|---|
| Salvataggio delle partite | nello spazio di Claude | **nel browser** che stai usando |
| Risposte della storia, del Consigliere e della diplomazia | le scrive il modello di Claude | **le scrivi tu**, con un assistente AI a tua scelta (*modalità manuale*) |
| Copia di sicurezza | «Esporta» | «Esporta» |

La pagina non contatta nessun server e non carica nulla da internet: le partite restano sul tuo dispositivo. Un controllo automatico (`tests/pagina.test.js`) verifica che sia così.

## Aprire il gioco

**Da GitHub Pages** (consigliato per giocare dal telefono)

1. Nel repository apri **Settings → Pages**.
2. In «Build and deployment» scegli **Deploy from a branch**, ramo **main**, cartella **/ (root)**, poi **Save**.
3. Dopo un paio di minuti il gioco è all'indirizzo `https://defabbrifranco-crypto.github.io/alternativa-storia/` (la pagina `index.html` porta da sola a `src/storia-alternativa-prototipo.html`).

**Da un file sul computer**

1. Scarica il repository (**Code → Download ZIP**) e decomprimilo.
2. Apri con un doppio clic `src/storia-alternativa-prototipo.html`.

In alcuni browser un file aperto così non può salvare nel browser. In quel caso la pagina lo scrive sotto i pulsanti («Questo browser non permette di salvare…»): la partita resta solo finché la pagina è aperta, e conviene usare **Esporta**.

## Dove si salvano le partite

Fuori da Claude i pulsanti **Salva partita** e **Carica partita**, il salvataggio automatico e il banner **Continua** funzionano come prima, ma usano la memoria del browser (`localStorage`). Quindi:

- la partita si ritrova solo **con lo stesso browser, sullo stesso dispositivo e sullo stesso indirizzo**;
- si perde se cancelli i dati del sito; alcuni browser (soprattutto Safari) possono cancellare i dati dei siti che non apri da tempo;
- per le partite a cui tieni, o per spostarle su un altro dispositivo, usa **Esporta** e **Importa**.

Questi pulsanti riguardano la **partita in corso**: senza una partita, «Salva partita» lo dice e non scrive nulla (così non può sovrascrivere una partita salvata prima). Uno scenario preparato con l'**Editor scenario** non si salva qui: si conserva come file con **Esporta** (vedi [EDITOR-SCENARIO.md](EDITOR-SCENARIO.md)).

## Esportare e importare una partita

- **Esporta** mostra tutta la partita come testo (se nessuna partita è in corso, mostra lo **scenario**: la mappa e i segnaposto). Puoi **Copiarlo** (per esempio in un appunto o in una chat con te stesso) oppure **Scaricare il file** `storia-alternativa-salvataggio.json` (`storia-alternativa-scenario.json` per uno scenario). Se il download non parte (alcune viste lo bloccano) usa «Copia».
- **Importa** chiede di scegliere un file di salvataggio o di scenario, o di incollarne il testo, poi **Carica**. Uno scenario non si può importare mentre una partita è in corso (la pagina lo dice e non cambia nulla); una partita importata prende il posto di quella salvata. Se il testo non è un salvataggio leggibile, o è di una versione che la pagina non conosce, lo dice e non cambia nulla.
- Un salvataggio importato viene sempre controllato: le parti malformate sono scartate, e i testi con codice HTML o script sono mostrati come testo, senza eseguirli. Per sicurezza importa solo salvataggi di cui ti fidi.
- I salvataggi dichiarano la propria versione (`schemaVersion`). Quelli delle versioni precedenti si caricano ancora; quelli troppo vecchi o sconosciuti vengono rifiutati con un messaggio chiaro.

## Modalità manuale (senza intelligenza artificiale collegata)

Quando la pagina non è collegata a un modello, ogni volta che il gioco avrebbe chiesto una risposta all'AI mostra una finestra con due campi. Funziona così:

1. Scrivi le tue azioni e premi **Invia** (mette le azioni in attesa e basta: non apre nessuna finestra), poi premi **Avanza** (oppure **Chiedi consiglio al Consigliere**, oppure invia un messaggio nella **Diplomazia**). Le due cose sono separate dalla versione 28: vedi `TURNO-E-AZIONI.md`.
2. Nella finestra premi **Copia il testo**.
3. Incolla il testo in un assistente AI a tua scelta (per esempio Claude o ChatGPT), meglio in una conversazione nuova.
4. Copia **tutta** la risposta dell'assistente. Per «Avanza» è un testo che comincia con `{` e finisce con `}` (comprende anche le mosse delle altre nazioni); per il Consigliere e per la diplomazia è un testo normale.
5. Torna alla pagina, incolla la risposta nel secondo campo e premi **Applica la risposta**.

Cose utili da sapere:

- Se l'assistente scrive frasi prima o dopo il testo, o lo mette in un riquadro di codice, va bene: la pagina lo ripulisce.
- Se la risposta non si legge, la finestra resta aperta e spiega il problema: puoi incollare di nuovo.
- **Annulla** (o il tasto Esc) chiude la finestra senza cambiare nulla; le azioni restano **in attesa** nell'elenco sotto la casella, così puoi riprovare premendo di nuovo **Avanza**.
- Le regole sono le stesse di sempre: i cambi di territorio e i segnaposto proposti dall'assistente passano dagli stessi controlli, e quelli non validi vengono ignorati.
- In **Diplomazia** il testo da copiare contiene tutta la conversazione fin lì, così l'assistente può continuare la scena.
- Dentro Claude la modalità manuale si può accendere lo stesso con l'interruttore sotto i pulsanti della partita, per esempio per usare un altro assistente. La scelta resta memorizzata nel browser.

I dati e i fatti storici delle risposte sono quelli che produce l'assistente: vanno trattati come finzione, non come fonte storica.

## Se qualcosa non va

| Problema | Cosa fare |
|---|---|
| La finestra della modalità manuale non si apre o è strana | La pagina usa l'elemento `<dialog>`: serve un browser recente (per Safari, dalla versione 15.4). |
| «Questo browser non permette di salvare» | Apri la pagina da un indirizzo `https://` (GitHub Pages) oppure usa **Esporta** per conservare la partita. |
| «Il testo non è un salvataggio leggibile» | Il testo incollato è incompleto: copialo di nuovo per intero, dalla prima `{` all'ultima `}`. |
| «Non riesco a leggere la risposta» | La risposta dell'assistente è tagliata o non è nel formato richiesto: chiedigli di ripeterla per intero, solo come testo `{ … }`. |

## Per chi sviluppa

- Nel codice la pagina cerca `window.claude.use("db")` e `window.claude.use("sample")`. Se non ci sono, sostituisce:
  - il **database** con un oggetto che ha la stessa forma (`doc(path).set/get`) basato su `localStorage` (chiavi con prefisso `storia-alternativa:`) oppure, se anche quello non è disponibile, sulla memoria della pagina;
  - il **modello** con `askManual`, che apre la finestra e restituisce la risposta incollata già interpretata (`parseManualJson`).
- Il resto della pagina continua a chiamare `dbCap`, `sample(...)` e `sample.json(...)` senza sapere quale fornitore c'è dietro.
- Il salvataggio ha `schemaVersion: 3` (e `v: 3`, per i lettori più vecchi); `saveVersion()` legge `schemaVersion` e, se manca, `v`.
- Le prove sono in `tests/browser/t12_providers.js` (senza Claude, con `localStorage` bloccato, modalità manuale, esporta/importa), `tests/browser/t4_save.js` (versioni dei salvataggi) e `tests/browser/t13_editor.js` (Editor scenario e scenari come file).
