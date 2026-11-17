# Test del browser

Provano `src/storia-alternativa-prototipo.html` (la versione attuale) in un Chromium vero, senza rete e senza AI.
Complementano `tests/population.test.js` (dati) e `tests/pagina.test.js` (controlli rapidi sul file) con prove sul
comportamento della pagina.

## Come funzionano

- Ogni prova apre la pagina con Playwright e una **finta `window.claude`**: un archivio in memoria al posto di `db`
  e risposte preparate al posto di `sample`. Così si controllano partita, salvataggi e prompt senza chiamare l'AI.
  Per provare la pagina **fuori da Claude** `launch()` accetta `withClaude: false` (nessun `window.claude`),
  `blockStorage: true` (`localStorage` che lancia errori), `seedLocal` (chiavi già presenti) e `serve: true` (la pagina
  aperta da un piccolo server `http` locale, come su GitHub Pages). `transform(html)` cambia il testo della pagina
  prima di aprirla, per provare un guasto messo apposta (il file su disco non cambia); `waitForHook: false` non
  aspetta il gancio di prova, e serve per una pagina che si ferma subito (per esempio perché i dati degli Stati non
  si leggono) e quindi non lo definisce mai.
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
| `t13_editor.js` | modalità «Gioco» ed «Editor scenario», legenda fissa di proprietà e controllo, scenario come file, blocco dell'Editor durante la partita |
| `t14_a11y.js` | accessibilità: punti di riferimento e titoli, nomi dei controlli, mappa da tastiera, elenco dei territori, annunci, contrasto (due misure indipendenti), dimensione dei comandi, movimento ridotto, alto contrasto, partita intera con la sola tastiera |
| `t15_turni.js` | il turno diviso in due: «Invia» (coda delle azioni, una per riga, limiti, rimozione, tastiera), «Avanza» (blocco con testo non inviato, richiesta al motore, salti temporali), mosse delle altre nazioni (richiesta, rotazione senza caso, risposta, dati ostili), errori e annullamenti (le azioni restano in attesa), risposte tardive, fine partita, salvataggio e caricamento (anche di salvataggi vecchi e ostili), modalità manuale, telefono |
| `t16_popolazione.js` | popolazione 1960: la pagina ha la copia identica del file dei dati; **ognuna delle 1020 schede** mostra il valore del file (proprio, dello Stato, dell'ala o i due dello Yemen, mai sommati); nessuna scheda mostra «undefined»; fonte, verifica, status, perimetro, avvertenze e altro valore (Italia, Germania Ovest, Giordania, Malaysia, Cipro, Kuwait, Cina, Bhutan, Pakistan, Yemen, repubbliche sovietiche); fonti dello status come collegamenti sicuri, grandi almeno 24 × 24 px, contrasto in tema chiaro e scuro; guasti messi apposta (fonte non registrata, flag sconosciuto, valore non numerico, blocco dei dati assente o rotto) |
| `t17_stati.js` | Stati: la pagina ha la copia identica del file degli Stati (`src/data/states_1960.json`); **ognuna delle 1020 schede** dice ciò che dice il file (capoluogo, capitale e alleanza del proprietario «non verificata» solo dove il file lo dice, nota con fonte e verifica, avvertenze); casi scelti a mano con le frasi scritte nella prova; la legenda dice quante capitali e alleanze sono verificate; la richiesta all'AI e i salvataggi non cambiano; un territorio ceduto segue il nuovo proprietario; la nota si apre da tastiera, il titolo è grande almeno 24 × 24 px, contrasto in tema chiaro e scuro, nessuno scorrimento di lato a 390 px; guasti messi apposta nei dati (nulla è mostrato verificato senza che il file lo dica) e nella pagina (dati assenti o rotti: un avviso chiaro, non una pagina vuota) |
| `t18_relazioni.js` | relazioni fra gli Stati (versione 32): **tutte le 3.403 coppie** hanno il valore di partenza di un secondo calcolo scritto nella prova e indipendente dal codice della pagina; le 8 fasce (da -100 a 0 ostili o fredde, da +1 a +100 amichevoli) e i loro bordi; lettura e scrittura dei valori (arrotondati, mai oltre ±100, solo gli scarti si conservano); il pannello «Relazioni» (ordine, «dall'inizio», «Più vicine» e «Più ostili», barre, nota «stima provvisoria», 320 px, contrasto nei due temi) e la riga «Relazione con il proprietario» nella scheda; le risposte del motore (voci valide, sporche, zero, somme per coppia, limite ±30, 12 voci, avviso unico, nessun errore); i territori che passano di mano (−10 e −2 in più, occupazioni −6 e −1 in più, tetti −20 e −12, nessun effetto se il controllo ritorna); il ritorno lento (4% al mese, un punto almeno, settimane che si sommano, mai oltre il valore di partenza); salvataggio e caricamento (solo gli scarti, salvataggi vecchi, documenti ostili, 6.000 voci inventate, `relClock`); ciò che si dice al motore, al consigliere e nelle conversazioni (i cinque più vicini e i cinque più ostili, i più popolosi a parità); partita libera senza relazioni; 15 guasti messi apposta nei dati e il caso «verificato» |

## Come funziona `t14_a11y.js`

- Il «lettore di schermo» della prova è l'**albero dell'accessibilità** che Chromium calcola per ogni pagina (ruoli, nomi, stati: la stessa fonte da cui attingono i lettori veri). Non sostituisce una prova con NVDA, VoiceOver o TalkBack, che resta da fare a mano (vedi `docs/ACCESSIBILITA.md`).
- Il **contrasto** si misura in due modi indipendenti: un controllo scritto per la prova (testo e segnaposto, tema chiaro e scuro, soglie 4,5 su 1 e 3 su 1 per il testo grande) e il controllo del contrasto di Chromium stesso (`Audits.checkContrast`). Quest'ultimo ignora le emoji (immagini a colori) e il testo dentro un `<details>` chiuso (calcolato ma mai disegnato, quindi misurato su pixel vuoti). Se il Chromium in uso non ha `Audits.checkContrast` (così è Chromium 153), la prova lo dice e salta quel controllo: restano le misure scritte per la prova.
- Un controllo cerca i **comandi solo per il mouse** (cursore a mano ma non raggiungibili con Tab) e un altro la **dimensione minima di 24 × 24 px**. Prima di usarli la prova li mette alla prova con un difetto messo apposta: uno strumento che non si lamenta mai non vale nulla.
- Non è `axe`: nel nostro ambiente di sviluppo il registro dei pacchetti non era raggiungibile, quindi `axe-core` non è stato eseguito (vedi `docs/ACCESSIBILITA.md`).

## Attenzione

- `t2_panel.js` (scheda del territorio), `t1_basic.js` (colore e alleanza del Kuwait) e `t3_game.js` (alleanza nel testo
  per l'AI) fissano gli status al **31 dicembre 1960** controllati online (`docs/STATUS-1960.md`). Se si cambia uno
  status vanno cambiati insieme: `src/data/population_1960.json` (poi `npm run dati:incorpora`, che ricopia i dati
  nella pagina), `docs/STATUS-1960.md` e questi controlli (la prova `tests/population-pagina.test.js` si ferma se
  dati, pagina e documento non coincidono). Gli elenchi delle tre copie di riferimento vanno cambiati a mano:
  `tests/copie-di-riferimento.test.js` si ferma se una copia resta indietro.
- Le prove dipendono dai nomi interni della pagina: rinominare una funzione esposta dal gancio richiede di
  aggiornare `harness.js` e le prove che la usano.
