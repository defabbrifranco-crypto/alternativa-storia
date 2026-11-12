# src

| File | Cosa è |
|---|---|
| `storia-alternativa-prototipo.html` | **Versione attuale** del prototipo (la versione è scritta nella pagina, sotto il titolo). Funziona dentro Claude e fuori: vedi [`../docs/USO-FUORI-DA-CLAUDE.md`](../docs/USO-FUORI-DA-CLAUDE.md). |
| `storia-alternativa-prototipo-v23.html` | Copia della versione 23, conservata come punto di riferimento. Non è la pagina attuale: vedi sotto. |
| `storia-alternativa-prototipo-map-overlay.html` | File di partenza della mappa a sovrapposizione, conservato per riferimento. Non è la pagina attuale: vedi sotto. |
| `data/` | Dati di popolazione del 1960 e dati degli Stati (nome, capitale, alleanza, colore, giocabilità e segno di verifica di capitale e alleanza), ciascuno con il suo schema. La pagina attuale ne porta dentro una copia identica (`npm run dati:incorpora` le aggiorna). |

Ogni pagina è un singolo file HTML, senza dipendenze esterne.

## Le copie di riferimento non sono la pagina attuale

Le due copie qui sopra e il file di [`../archive/`](../archive/README.md) sono conservati come punti di riferimento: hanno ancora la loro mappa, le loro regole e i loro testi, e non vanno letti come il comportamento attuale. **Dal 7 novembre 2026 partono tutte dal 31 dicembre 1960**, come la pagina attuale, e per gli Stati degli elenchi di popolazione dicono gli stessi valori e gli stessi status del file `data/population_1960.json` (status controllati online: [`../docs/STATUS-1960.md`](../docs/STATUS-1960.md)). I dati di popolazione attuali sono in quel file.

Nessuna copia è collegata alla pagina o al sito (`../index.html` rinvia alla pagina attuale) e nessuna prova nel browser le carica. Le leggono, senza aprirle, il controllo di sintassi di `tests/lint.test.js` (esamina ogni file `.html` del repository) e `tests/copie-di-riferimento.test.js`, che controlla per ognuna: data di partenza, etichetta dello status, valori e status degli elenchi di popolazione rispetto al file dei dati, Cipro Stato sovrano giocabile e voce «Alleanza da verificare» nella legenda.

Che cosa le distingue dalla pagina attuale (controllato sui file il 7 novembre 2026; la riga «Capitali e alleanze», aggiunta con la versione 30, il 9 novembre 2026):

| | Pagina attuale (versione 30) | `storia-alternativa-prototipo-v23.html` | `storia-alternativa-prototipo-map-overlay.html` | `../archive/storia-alternativa-prototipo.html` |
|---|---|---|---|---|
| Territori | 1.020 province, 83 Stati | la stessa mappa e le stesse unità della pagina attuale | 95 province, 84 voci fra Stati e territori dipendenti (69 giocabili) | 95 province, 83 Stati |
| Le 14 repubbliche sovietiche | Stati separati e giocabili | Stati separati e giocabili | non giocabili e non sovrane: dipendono dall'URSS | Stati separati e giocabili |
| Siria e Cipro | Stati giocabili | Stati giocabili | la Siria non è giocabile e dipende dalla Repubblica Araba Unita; Cipro è uno Stato sovrano giocabile | Stati giocabili |
| Dati di popolazione | letti dal file `data/population_1960.json` | elenchi scritti nella pagina | elenchi scritti nella pagina | elenchi scritti nella pagina |
| Capitali e alleanze | lette dal file `data/states_1960.json`; la scheda le segna «non verificata» | scritte nella pagina, senza segno di verifica | scritte nella pagina, senza segno di verifica | scritte nella pagina, senza segno di verifica |
| Status degli Stati | quelli del file, controllati online al 31 dicembre 1960 | gli stessi, scritti negli elenchi | gli stessi, scritti negli elenchi | gli stessi, scritti negli elenchi |
| Turno | «Invia» e «Avanza»; le altre nazioni agiscono | «Agisci e avanza» | «Agisci e avanza» | «Agisci e avanza» |
| Segnaposto sulla mappa | sì | sì | no (ha le annotazioni di mappa in testo) | no |

Nessuna delle tre ha l'Editor scenario, i salvataggi con numero di versione (`schemaVersion`) o la modalità manuale. Per i salvataggi e per il modello linguistico dipendono da `claude.use`: fuori da Claude non hanno né gli uni né l'altro.

Come nella pagina attuale, **capitali e alleanze sono etichette semplificate del prototipo, non dati verificati** ([`../docs/METODOLOGIA.md`](../docs/METODOLOGIA.md)); a differenza della pagina attuale (dalla versione 30), però, queste pagine non lo dicono: non leggono `data/states_1960.json` e la loro scheda non segna le capitali e le alleanze «non verificata». Per Cipro non c'è una fonte sull'alleanza al 31 dicembre 1960: è «da verificare».

### Che cosa è stato cambiato il 7 novembre 2026

L'autore ha chiesto di portare tutto al 31 dicembre. Prima la `map-overlay` e il file di `archive/` partivano dal 1 gennaio 1960 e la versione 23, che aveva già la data giusta, aveva ancora gli status di allora. Le tre pagine sono state aperte in un browser vero prima e dopo, confrontando la scheda di ogni provincia (95, 95 e 1.020) e i dati di ogni Stato: cambia solo quanto segue.

- **Data** (`map-overlay` e `archive/`): titolo («Scenario fisso — Europa, 31 dicembre 1960»), anno della partita e commenti.
- **Cipro** (`map-overlay` e `archive/`): è indipendente dal 16 agosto 1960 e membro dell'ONU dal 20 settembre. Nella `map-overlay` era una colonia non giocabile del Regno Unito: ora è uno Stato sovrano giocabile con la sua provincia, e il Regno Unito resta con la sola provincia sua (la scheda mostra quindi la popolazione, 52.372.000, invece di «da verificare»). In entrambe l'alleanza è «da verificare», la legenda ha la voce «Alleanza da verificare» (come la pagina attuale) e la nota della provincia dice che cosa si sa.
- **Status** (tutte e tre, compresa la versione 23): quelli del file dei dati. Cambiano sette voci: Pakistan («Ala occidentale del Pakistan (Stato sovrano)»), Yemen del Sud («Colonia di Aden e protettorati britannici (indipendenza il 30 novembre 1967)»), Siria («Regione settentrionale della Repubblica Araba Unita (febbraio 1958 - 28 settembre 1961)»), Bhutan, Kuwait («Protettorato britannico (indipendente dal 19 giugno 1961)»), Oman e Maldive (queste ultime non sono sulla mappa). L'etichetta della scheda è «Status al 31 dicembre 1960» e le parti di uno Stato si leggono «nome — status: popolazione», per non annidare parentesi.

### Come restano allineate al file dei dati

Gli elenchi sono scritti nelle pagine: le copie non leggono il file come fa la pagina attuale, che mostra anche fonte, verifica e avvertenze; farglielo fare avrebbe voluto dire riscrivere le schede di pagine che nessuno carica. Se un valore o uno status cambia in `data/population_1960.json`, vanno cambiati a mano anche i tre elenchi: `tests/copie-di-riferimento.test.js` si ferma e dice quale riga è rimasta indietro. Per capitali e alleanze non c'è nessun allineamento: le tre pagine hanno le loro, scritte nel codice e mai controllate su una fonte, e nessuna prova le confronta con `data/states_1960.json`.
