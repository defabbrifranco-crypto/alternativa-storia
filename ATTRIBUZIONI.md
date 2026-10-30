# Licenza, attribuzioni e dati di terzi

## Cosa copre la licenza

La licenza [MIT](LICENSE) copre **il codice del gioco e i testi scritti per il progetto** (pagine, script, prove, documenti). Il titolare indicato è il nome utente GitHub dell'autore.

La licenza **non cambia le condizioni dei dati di terzi** che il progetto contiene: i contorni degli Stati, gli elenchi delle unità regionali e i dati di popolazione. Qui sotto, per ciascuno, è scritto cosa si sa e cosa resta da verificare. I contorni sono scritti dentro i file `.html` di `src/` e `archive/`, accanto al codice.

## Confini della mappa

Come la mappa è costruita è spiegato in [`docs/CONFINI-MAPPA.md`](docs/CONFINI-MAPPA.md). Per le fonti (verifiche del 24 ottobre 2026):

- **Contorni degli Stati: Natural Earth, dati di pubblico dominio.** Il file dei confini fornito dall'autore (`custom.geo.json`, 258 elementi) ha la tabella di attributi del dataset Natural Earth «Admin 0 – Countries»: ogni elemento ha `featurecla: "Admin-0 country"` e i campi `sovereignt`, `adm0_a3`, `name_ciawf`, `woe_id` e molti altri di quel dataset, e non ha i campi che Highcharts usa nelle sue mappe (come `hc-key`). Natural Earth dichiara: «No permission is needed to use Natural Earth. Crediting the authors is unnecessary.»; la citazione suggerita è «Made with Natural Earth. Free vector and raster map data @ naturalearthdata.com.» ([condizioni d'uso](https://www.naturalearthdata.com/about/terms-of-use/), pagina letta il 24 ottobre 2026). I contorni della pagina attuale (`src/storia-alternativa-prototipo.html`) e della versione 23 sono una rielaborazione di quel file (semplificata e ricomposta). Anche le pagine più vecchie (`archive/` e la variante `map-overlay`) hanno la stessa base: le posizioni delle 83 etichette degli Stati coincidono con quelle della pagina attuale a meno di uno spostamento costante di 110 unità in orizzontale (81 su 83; fanno eccezione Germania Ovest e Germania Est, divise in modo diverso) e di piccole differenze di semplificazione. È un indizio forte, non una prova: di come quelle mappe furono costruite non resta una traccia scritta nel repository.
- **Non verificato:** da dove l'autore abbia scaricato il file. Il 24 ottobre 2026 ha detto di averlo ottenuto con Perplexity e di credere che il sito sia <https://code.highcharts.com/mapdata/>; gli attributi del file non lo confermano. La documentazione di Highcharts indica comunque Natural Earth come fonte della maggior parte delle sue mappe di livello Stato e regione ([documentazione](https://highcharts.com/docs/maps/map-collection), letta il 24 ottobre 2026). Il file non è stato confrontato con gli originali di Natural Earth (la rete dell'ambiente di lavoro non lo permette): l'indicazione si basa sulla tabella di attributi.
- **Regioni interne (pagina attuale e versione 23): celle approssimate, non confini storici.** Sono calcolate dal progetto a partire dai punti del file `unita_europa_asia_1960.csv` fornito dall'autore. Il file `LEGGIMI.md` che lo accompagnava dichiara che i punti derivano, caso per caso, da capoluogo o località omonima, centro storico o regionale, punto rappresentativo di un poligono amministrativo moderno di Natural Earth 1:10m o centro indicativo dello Stato (dichiarazione del file, non controllata).
- **Elenchi e note sulle unità del 1960** (nomi, livello di suddivisione, note storiche): vengono da file dell'autore (`unita_europa_asia_1960.csv`, `europa-1960-regioni.md`) e non sono verificati. Il `LEGGIMI.md` dice che per il quadro storico europeo è stato «consultato» il dataset *Europe (1900–2003)* della raccolta MPIDR Population History GIS Collection. La pagina da cui quel dataset si scarica ([MOSAIC](https://mosaic.ipums.org/historical-gis-datafiles), letta il 24 ottobre 2026) non indica una licenza e dice che i dati si possono usare liberamente per scopi scientifici non commerciali, purché ci si registri come utenti del progetto; la ridistribuzione non è trattata. Il repository **non contiene geometrie** di quel dataset, ma **non si può escludere** dai file che gli elenchi di unità ne dipendano in parte.
- **Linee tracciate a mano, senza fonte.** Il file di partenza ha la Germania e il Vietnam uniti: la loro divisione in due Stati, presente in tutte le pagine, è un'approssimazione fatta a mano. Nella pagina attuale le linee sono quelle del confine interno tedesco, dei confini fra Inghilterra, Scozia e Galles e della separazione fra Vietnam del Nord e del Sud (una retta all'altezza del 17° parallelo), scritte dall'assistente AI nello script di costruzione della mappa. Non sono confini rilevati.
- **OpenStreetMap:** il `LEGGIMI.md` cita OpenStreetMap come base della pagina Leaflet di quel pacchetto, che non fa parte di questo repository; la pagina del gioco non carica dati né tessere da OpenStreetMap. Non è noto con quali servizi siano stati trovati i punti «capoluogo o località omonima» (il `LEGGIMI.md` non lo dice).

**Da fare**, in ordine di importanza:

1. Chiarire con chi ha compilato i file dell'autore quanto dell'elenco delle unità venga dal dataset MPIDR e a quali condizioni. Finché non è chiarito il rischio è basso (nessuna geometria di quel dataset è nel repository) ma non escluso.
2. Facoltativo: citare Natural Earth nel `README.md`.
3. Rendere la mappa riproducibile: gli script di costruzione e i file di partenza non sono nel repository (vedi `docs/CONFINI-MAPPA.md`).

## Dati di popolazione

`src/data/population_1960.json` riporta, senza ricontrollarli (`verified: false`), i numeri di due file CSV forniti dall'autore. Le fonti dichiarate nel file sono:

- Maddison Project / Maddison Historical Statistics (come indicato nel primo CSV);
- Statistics and Data (serie diversa da Maddison, usata per Germania Ovest e Germania Est);
- ONU retrospettiva tramite JetPunk (fonte secondaria, da sostituire con le World Population Prospects dell'ONU);
- il secondo CSV non indica nessuna fonte.

Le condizioni d'uso di queste fonti non sono state verificate. Vedi anche [`docs/data-notes-population-1960.md`](docs/data-notes-population-1960.md).

## Come citare il progetto

Vedi [`CITATION.cff`](CITATION.cff) (GitHub mostra il pulsante «Cite this repository»). Il file è ancora una bozza: mancano versione e data di rilascio.
