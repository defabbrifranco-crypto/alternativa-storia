# src

| File | Cosa è |
|---|---|
| `storia-alternativa-prototipo.html` | **Versione attuale** del prototipo (la versione è scritta nella pagina, sotto il titolo). Funziona dentro Claude e fuori: vedi [`../docs/USO-FUORI-DA-CLAUDE.md`](../docs/USO-FUORI-DA-CLAUDE.md). |
| `storia-alternativa-prototipo-v23.html` | Copia della versione 23, conservata come punto di riferimento. **Non aggiornata**: vedi sotto. |
| `storia-alternativa-prototipo-map-overlay.html` | File di partenza della mappa a sovrapposizione, conservato per riferimento. **Non aggiornato**: vedi sotto. |
| `data/` | Dati di popolazione del 1960 e relativo schema. La pagina attuale ne porta dentro una copia identica (`npm run dati:incorpora` la aggiorna). |

Ogni pagina è un singolo file HTML, senza dipendenze esterne.

## Le copie di riferimento non sono la pagina attuale

Le due copie qui sopra e il file di [`../archive/`](../archive/README.md) sono conservati **com'erano**. I loro numeri, i loro status e i loro testi sono quelli di allora: non vanno letti come dati o come comportamento attuali. I dati di popolazione attuali sono in `data/population_1960.json`.

Nessuna copia è collegata alla pagina o al sito (`../index.html` rinvia alla pagina attuale), nessuna prova nel browser le carica e nessun passo di «Prove automatiche» le usa. Le legge solo il controllo di sintassi di `tests/lint.test.js`, che esamina ogni file `.html` del repository.

Che cosa le distingue dalla pagina attuale (controllato sui file il 6 novembre 2026):

| | Pagina attuale (versione 29) | `storia-alternativa-prototipo-v23.html` | `storia-alternativa-prototipo-map-overlay.html` | `../archive/storia-alternativa-prototipo.html` |
|---|---|---|---|---|
| Data dello scenario | 31 dicembre 1960 | 31 dicembre 1960 | 1 gennaio 1960 | 1 gennaio 1960 |
| Territori | 1.020 province, 83 Stati | la stessa mappa e le stesse unità della pagina attuale | 95 province, 84 voci fra Stati e territori dipendenti (68 giocabili) | 95 province, 83 Stati |
| Le 14 repubbliche sovietiche | Stati separati e giocabili | Stati separati e giocabili | non giocabili e non sovrane: dipendono dall'URSS | Stati separati e giocabili |
| Siria e Cipro | Stati giocabili | Stati giocabili | non giocabili: la Siria dipende dalla Repubblica Araba Unita, Cipro dal Regno Unito | Stati giocabili |
| Dati di popolazione | letti dal file `data/population_1960.json` | elenchi scritti nella pagina | elenchi scritti nella pagina | elenchi scritti nella pagina |
| Status degli Stati | controllati online al 31 dicembre 1960 | come nei file forniti (per esempio Kuwait, Siria e Yemen del Sud: «Stato sovrano») | come nei file forniti | come nei file forniti |
| Turno | «Invia» e «Avanza»; le altre nazioni agiscono | «Agisci e avanza» | «Agisci e avanza» | «Agisci e avanza» |
| Segnaposto sulla mappa | sì | sì | no (ha le annotazioni di mappa in testo) | no |

Nessuna delle tre ha l'Editor scenario, i salvataggi con numero di versione (`schemaVersion`) o la modalità manuale. Per i salvataggi e per il modello linguistico dipendono da `claude.use`: fuori da Claude non hanno né gli uni né l'altro.

### Perché non sono state aggiornate

Il 6 novembre 2026 si è valutato di far leggere i dati dal file anche alla `map-overlay`, come fa la pagina attuale. Non è stato fatto:

- la `map-overlay` parte dal **1 gennaio 1960**, mentre gli status del file dei dati sono al **31 dicembre 1960**; nel 1960 cambia per esempio lo status di Cipro, indipendente dal 16 agosto. Leggere il file la farebbe mescolare due date;
- ha un'altra mappa (95 province) e un altro trattamento di repubbliche sovietiche, Siria e Cipro: adattarle ai dati attuali vorrebbe dire riscrivere lo scenario, e non sarebbe più il file di partenza che si voleva conservare;
- nessuno la carica: il vantaggio sarebbe solo togliere dal repository gli elenchi vecchi.

Se serve davvero, si può fare: sarebbe un lavoro a parte, da decidere prima (quale data, quali Stati) e da provare nel browser, perché oggi nessuna prova copre queste pagine.
