# Test del browser

Provano `src/storia-alternativa-prototipo.html` (la versione attuale) in un Chromium vero, senza rete e senza AI.
Complementano `tests/population.test.js` (dati) e `tests/pagina.test.js` (controlli rapidi sul file) con prove sul
comportamento della pagina.

## Come funzionano

- Ogni prova apre la pagina con Playwright e una **finta `window.claude`**: un archivio in memoria al posto di `db`
  e risposte preparate al posto di `sample`. Così si controllano partita, salvataggi e prompt senza chiamare l'AI.
  Per provare la pagina **fuori da Claude** `launch()` accetta `withClaude: false` (nessun `window.claude`),
  `blockStorage: true` (`localStorage` che lancia errori), `seedLocal` (chiavi già presenti) e `serve: true` (la pagina
  aperta da un piccolo server `http` locale, come su GitHub Pages).
- In una **copia temporanea** della pagina, in coda allo script di gioco, viene aggiunto un gancio (`window.__t`) che
  espone le funzioni interne da verificare. Il file in `src/` non viene mai modificato; la copia è cancellata alla fine.
- Il gancio cerca il punto esatto `refreshResumeBanner();` + `})();` alla fine dello script. Se cambia, `harness.js`
  si ferma con «hook point not found»: aggiornare l'ancora e l'elenco delle funzioni esposte.

## Requisiti

Node 20 o successivo e Playwright con Chromium. Dalla radice del repository:

```
npm install
npx playwright install chromium
```

(oppure Playwright installato globalmente, con `NODE_PATH` che punta ai moduli globali).

## Esecuzione

```
node tests/browser/run.js                 # tutte le prove, tranne le prestazioni
node tests/browser/run.js --perf          # comprese le prestazioni (soglie in ms: dipendono dalla macchina)
node tests/browser/t11_engine.js          # una sola prova
PAGE=percorso/altra-pagina.html node tests/browser/run.js    # un altro file HTML
SHOT_DIR=/percorso/cartella node tests/browser/t10_markers.js    # salva anche una schermata
```

Ogni prova termina con «N passed, M failed» e un codice d'uscita diverso da zero se qualcosa fallisce.

I test dei dati e quelli sul file (`tests/population.test.js`, `tests/pagina.test.js`) si lanciano a parte con
`node --test` dalla radice del repository. Con Node 22 il comando `node --test tests/` dà «Cannot find module»;
senza argomenti funziona, e non esegue queste prove del browser. `npm test` lancia le une e le altre.

Su GitHub le stesse prove partono da sole a ogni push e a ogni pull request (`.github/workflows/ci.yml`).

## Cosa coprono

| File | Argomento |
|---|---|
| `t1_basic.js` | caricamento, mappa, province |
| `t2_panel.js` | pannello della nazione, scheda della provincia |
| `t3_game.js` | partita, turni, contesto inviato all'AI |
| `t4_save.js` | salvataggio, caricamento, migrazione, versione dichiarata (`schemaVersion`) |
| `t5_touch.js` | telefono: tocco, pizzico, trascinamento |
| `t6_perf.js` | prestazioni (solo con `--perf`) |
| `t7_search.js` | ricerca di province e nazioni |
| `t8_labels.js` | etichette sulla mappa |
| `t10_markers.js` | segnaposto: tipi, posizione, raggruppamento, salvataggio |
| `t11_engine.js` | sovranità e controllo, risposte in ritardo, validazione dei salvataggi |
| `t12_providers.js` | fuori da Claude: salvataggi nel browser, esporta/importa, modalità manuale, `localStorage` bloccato |

## Attenzione

- `t3_game.js` fissa oggi la regola «per Kuwait, Cipro, Oman e Siria vale lo status della scheda dati, senza
  note storiche aggiunte». Se si adottano le correzioni di status di `docs/data-notes-population-1960.md`,
  quei controlli vanno aggiornati insieme ai dati.
- Le prove dipendono dai nomi interni della pagina: rinominare una funzione esposta dal gancio richiede di
  aggiornare `harness.js` e le prove che la usano.
