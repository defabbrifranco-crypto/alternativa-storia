# Licenza, attribuzioni e dati di terzi

## Cosa copre la licenza

La licenza [MIT](LICENSE) copre **il codice del gioco e i testi scritti per il progetto** (pagine, script, prove, documenti). Il titolare indicato è il nome utente GitHub dell'autore.

La licenza **non copre i dati di terzi** che il progetto contiene. Quelli che oggi si conoscono sono i due qui sotto. Finché le loro condizioni d'uso non sono verificate, **non si può dire con certezza a quali condizioni i file `.html` di `src/` e `archive/` si possano ridistribuire**, perché i confini della mappa sono scritti dentro i file stessi, accanto al codice.

## Confini della mappa

- **Fonte: non verificata.** L'autore ha indicato di aver ottenuto il file dei confini (`custom.geo.json`) con Perplexity e di credere che il sito di origine sia <https://code.highcharts.com/mapdata/> (risposta del 24 ottobre 2026). Non c'è modo di verificarlo dai file del repository: nella pagina e nei documenti la fonte non è dichiarata.
- Il progetto ha usato anche altri file forniti dall'autore per le unità regionali di Europa e Asia (`unita_europa_asia_1960.csv`, `mappa_europa_asia_1960.zip`): per questi la fonte non è stata indicata.
- **Cosa dice Highcharts**, riassunto da pagine pubbliche lette il 24 ottobre 2026 (sono riassunti, non testo legale: vanno riletti sugli originali):
  - la raccolta di mappe «viene con la licenza dei dati di origine»; per la maggior parte delle mappe di livello Stato e regione la fonte indicata è Natural Earth, un insieme di dati di pubblico dominio ([documentazione](https://highcharts.com/docs/maps/map-collection));
  - le mappe di livello inferiore derivano spesso da file nazionali con licenze proprie, indicate nel file di ciascuna mappa;
  - il pacchetto `@highcharts/map-collection` dichiara che l'uso delle mappe richiede una licenza valida di Highcharts Maps ([LICENSE.md](https://unpkg.com/@highcharts/map-collection@2.3.1/LICENSE.md)); l'uso dalla CDN di Highcharts è soggetto a una «fair usage policy».
- Le due indicazioni non coincidono del tutto e non dicono se i confini si possano ridistribuire dentro un'altra pagina. **Da fare prima di diffondere la pagina**: confermare la fonte, leggere le condizioni del file d'origine e riportarle qui e in `docs/FONTI.md`. In alternativa si possono rifare i confini da una fonte con condizioni chiare (per esempio direttamente da Natural Earth).

## Dati di popolazione

`src/data/population_1960.json` riporta, senza ricontrollarli (`verified: false`), i numeri di due file CSV forniti dall'autore. Le fonti dichiarate nel file sono:

- Maddison Project / Maddison Historical Statistics (come indicato nel primo CSV);
- Statistics and Data (serie diversa da Maddison, usata per Germania Ovest e Germania Est);
- ONU retrospettiva tramite JetPunk (fonte secondaria, da sostituire con le World Population Prospects dell'ONU);
- il secondo CSV non indica nessuna fonte.

Le condizioni d'uso di queste fonti non sono state verificate. Vedi anche [`docs/data-notes-population-1960.md`](docs/data-notes-population-1960.md).

## Come citare il progetto

Vedi [`CITATION.cff`](CITATION.cff) (GitHub mostra il pulsante «Cite this repository»). Il file è ancora una bozza: mancano versione e data di rilascio.
