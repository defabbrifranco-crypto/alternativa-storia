# Registro delle modifiche

Qui sono annotate le modifiche rilevanti del progetto, dalla più recente alla più vecchia. Il formato segue [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Il numero di versione è quello di `package.json`: la pagina mostra «Versione N» per la versione 0.N.0.

Le date sono quelle di consegna dei pacchetti di modifiche. Prima della versione 23 il progetto non aveva un registro: le versioni fino alla 22 non sono documentate in questo repository (`archive/` conserva una versione precedente; `src/storia-alternativa-prototipo-map-overlay.html` è il file di partenza della mappa a sovrapposizione). Il numero 0.23.0 è stato assegnato a posteriori: allora non c'era ancora `package.json`.

## [Non rilasciato]

### Aggiunto
- `LICENSE` (licenza MIT, titolare: il nome utente GitHub dell'autore) e `ATTRIBUZIONI.md`, che spiega cosa la licenza copre e cosa no: i dati di terzi (confini della mappa e dati di popolazione) hanno condizioni proprie, ancora da verificare ([#6](../../issues/6)).
- Questo registro (`CHANGELOG.md`) e una **bozza** di `CITATION.cff` (autore: il nome utente GitHub; mancano versione e data di rilascio) ([#6](../../issues/6)).
- `tests/lint.test.js`: controllo di sintassi e di coerenza, senza dipendenze esterne. Verifica la sintassi dei file `.js` e degli script dentro le pagine, che i file `.json` si leggano, che il codice rimosso non ricompaia, che `package.json`, questo registro e la pagina dichiarino la stessa versione, che i collegamenti relativi dei documenti portino a file esistenti e che `CITATION.cff` abbia le chiavi obbligatorie. Parte con `node --test`, quindi a ogni push; `npm run lint` lo lancia da solo. Non è ESLint e non giudica lo stile ([#6](../../issues/6)).

### Modificato
- Variante `src/storia-alternativa-prototipo-map-overlay.html` ([#6](../../issues/6)): tolta la funzione `legacyTerritoryRules`, definita e mai chiamata (usava il vecchio campo `cambi_territoriali`); riscritti due commenti che dicevano il contrario di ciò che fa il codice, cioè la nota sulla qualità dei dati e il commento del pulsante «Trasferisci controllo», che cambia solo il controllo e non il proprietario. Il comportamento della pagina non cambia.

## [0.26.0] - 2026-10-22

Accessibilità della mappa e della pagina ([#4](../../issues/4)).

### Aggiunto
- Struttura della pagina: `<main>`, sezioni con nome, titoli in ordine, collegamento «Vai al contenuto principale» (è il primo Tab) e area degli annunci per i lettori di schermo.
- Mappa da tastiera: tutti i territori sono un solo punto di sosta; le frecce passano al territorio vicino nella direzione scelta, Invio o Spazio aprono la scheda, `+`, `-` e `0` cambiano lo zoom; il cerchio di focus compare solo per chi usa la tastiera. Ogni territorio ha un nome accessibile (proprietario ed eventuale occupante).
- «Elenco dei territori per Stato» e «Come usare la mappa da tastiera» sotto la mappa; la ricerca è una *combobox*; schede (tab) e registri (log) con i ruoli corretti; annunci e focus a ogni cambio di schermata.
- `docs/ACCESSIBILITA.md`: come si usa la pagina da tastiera e con un lettore di schermo, cosa è stato provato e cosa no, procedura di prova di dieci minuti.
- `tests/browser/t14_a11y.js` e quattro controlli rapidi in `tests/pagina.test.js`.

### Modificato
- Colori: contrasto AA del testo in entrambi i temi (nel tema scuro il testo dei pulsanti arancioni è ora scuro: prima era bianco, con contrasto 3,1 su 1); bordi dei campi più visibili; segnaposto dei campi leggibili.
- Rispetto di `prefers-reduced-motion` e dell'alto contrasto di Windows; comandi di almeno 24 × 24 px; a 320 px di larghezza la pagina non scorre di lato; il titolo «Partita in corso» è visibile solo ai lettori di schermo.

### Da sapere
- Non provata con un lettore di schermo vero (NVDA, VoiceOver, TalkBack) né con axe: l'issue #4 resta aperta.
- I segnaposto sono ancora un punto di sosta ciascuno; i colori delle regioni della mappa non sono stati misurati contro il contrasto 3 su 1 degli elementi grafici.

## [0.25.0] - 2026-10-20

Editor scenario separato dal gioco ([#2](../../issues/2)).

### Aggiunto
- Due modalità sopra la mappa: «Gioco» ed «Editor scenario». L'Editor non si accende durante una partita; i comandi manuali (cedere sovranità e controllo, solo controllo, aggiungere un segnaposto) esistono solo lì.
- Uno scenario è un salvataggio senza partita: si conserva come file con «Esporta» e si ricarica con «Importa»; non sovrascrive mai la partita salvata e non si importa durante una partita.
- Legenda fissa «Proprietà e controllo» (colore pieno, righe diagonali) con la spiegazione di proprietario e controllore, ed elenco in parole dei territori occupati.
- `docs/EDITOR-SCENARIO.md` e `tests/browser/t13_editor.js`.

### Modificato
- «Salva partita» salva solo con una partita in corso (prima, senza partita, poteva scrivere una mappa sopra la partita salvata).
- Durante la partita il territorio cambia solo per i cambiamenti proposti dal motore, che dalla versione 23 vengono controllati prima di essere applicati.

## [0.24.0] - 2026-10-19

La pagina funziona anche fuori da Claude ([#1](../../issues/1)); i salvataggi dichiarano la versione ([#5](../../issues/5)).

### Aggiunto
- Salvataggio nel browser (`localStorage`, altrimenti in memoria) quando non c'è il database di Claude; «Esporta» e «Importa» come testo o come file `.json`.
- Modalità manuale al posto dell'AI: finestra con il testo da copiare e campo per la risposta incollata, con «Annulla».
- `schemaVersion: 3` in ogni salvataggio, migrazione dei salvataggi della versione 2 e rifiuto chiaro delle versioni sconosciute; importazione controllata (testi mostrati come testo, parti malformate scartate).
- Nome stabile `src/storia-alternativa-prototipo.html` e `index.html` per GitHub Pages.
- `package.json` e `.github/workflows/ci.yml`: le prove partono a ogni push e a ogni pull request.
- `tests/pagina.test.js`, `tests/browser/t12_providers.js` e `docs/USO-FUORI-DA-CLAUDE.md`.

## [0.23.0] - 2026-10-17

### Aggiunto
- `src/storia-alternativa-prototipo-v23.html`: versione 23 in un unico file, con segnaposto sulla mappa (17 tipi), sovranità e controllo separati (l'occupazione è disegnata con righe diagonali), salvataggi validati, risposte dell'AI arrivate in ritardo scartate e scenario fisso al 31 dicembre 1960.
- `tests/browser/`: prove in un Chromium vero (Playwright) con `window.claude` simulata, senza rete né AI.
