# Note sui dati: popolazione 1960

File dati: `src/data/population_1960.json` (schema in `src/data/population_1960.schema.json`, test in `tests/population.test.js`, `tests/population-pagina.test.js` e `tests/browser/t16_popolazione.js`).

## Principi

1. **Data di riferimento**: 31 dicembre 1960, il giorno in cui parte lo scenario. Lo status politico si legge a quella data, non prima e non dopo; una data successiva può comparire fra parentesi solo come indicazione di ciò che avvenne dopo. Il campo si chiama `status_1960_12_31`. Che cosa è stato controllato e con quali fonti: [STATUS-1960.md](STATUS-1960.md).
2. **Nessun valore è stato ricontrollato** sulle fonti primarie (`verified: false` ovunque). Il dataset riporta i numeri dei due CSV forniti.
3. **Avvertenza globale** in `meta.global_warning`, non ripetuta nei record.
4. **Serie diverse non si sommano**: Maddison, Statistics and Data e ONU hanno perimetri e metodi diversi.
5. **Gli status controllati online** hanno `status_sources` (le fonti, descritte in `meta.status_sources`). Senza `status_sources` lo status è quello del file e non è stato controllato su una fonte specifica.

## Revisioni di status rispetto ai CSV

Al 31 dicembre 1960 (dettagli e fonti in [STATUS-1960.md](STATUS-1960.md)):

| Entità | CSV | Ora | Tipo |
|---|---|---|---|
| Kuwait | Stato sovrano | Protettorato britannico (indipendente dal 19 giugno 1961) | corretto |
| Siria | Stato sovrano | Regione settentrionale della Repubblica Araba Unita (febbraio 1958 - 28 settembre 1961) | corretto |
| Yemen del Sud | Stato sovrano | Colonia di Aden e protettorati britannici (indipendenza il 30 novembre 1967) | corretto |
| Maldive | Sultanato indipendente | Stato protetto britannico con autogoverno interno (fino al 1965) | corretto |
| Oman | Stato sovrano | Stato sovrano (sotto forte influenza britannica) | precisato (fonti discordanti) |
| Bhutan | Stato sovrano | Stato sovrano, con la politica estera guidata dall'India (trattato del 1949) | precisato |
| Pakistan (ala occidentale) | Stato sovrano (valore dell'ala occidentale) | Ala occidentale del Pakistan (Stato sovrano) | etichetta corretta |
| Cipro | Stato sovrano | Stato sovrano | confermato |

Cipro: una revisione precedente del dataset scriveva «Colonia britannica (indipendente dal 16 agosto 1960)», che valeva per il 1 gennaio 1960. Con la data del 31 dicembre il CSV aveva ragione.

I flag nuovi: `status_corretto` (lo status del file era sbagliato per la data), `status_precisato` (lo status del file resta valido ma incompleto).

## Voci aperte (da verificare su fonte primaria)

- **Malaysia/Malaya (8.160.000)**: perimetro incerto; possibile doppio conteggio con Singapore.
- **Giordania (933.000)**: verificare l'inclusione della Cisgiordania; sovrapposizione possibile con la riga Palestina.
- **Cipro**: 573.000 (secondo CSV) contro 580.000 (primo CSV, JetPunk).
- **Fonti secondarie**: sostituire JetPunk con l'ONU *World Population Prospects*; gli status sono stati controllati su fonti secondarie (ONU, Dipartimento di Stato USA, Britannica, Wikipedia), non su atti d'archivio.
- **Oman**: le fonti non concordano (indipendenza riconosciuta nel 1951, ma protettorato britannico dal 1891 secondo alcune); la dicitura è una sintesi prudente.
- **Secondo CSV**: manca la colonna fonte (`FILE_B_UNSPECIFIED`).
- **Cifre arrotondate**: Vietnam, Yemen del Sud, Libano, Emirati, Maldive, Palestina.
- **Status nulli**: il primo CSV non forniva lo status; i 32 record europei restano senza status, da compilare con fonte. Cina, Coree, Vietnam, Mongolia e Palestina hanno lo status del file, non controllato su una fonte specifica.

## Integrazione nel codice

La pagina `src/storia-alternativa-prototipo.html` **legge questo file**. Deve funzionare anche aperta da sola (da file, da GitHub Pages, dentro Claude), quindi non lo scarica: ne porta dentro una **copia identica**, in un blocco `<script type="application/json" id="population-1960-data">` fra i marcatori `DATI-POPOLAZIONE-INIZIO` e `DATI-POPOLAZIONE-FINE`. Nel codice non ci sono più elenchi di numeri scritti a mano (`POPULATION_1960` e `POPULATION_1960_B` sono spariti con la versione 29).

- **Dopo ogni modifica al file dei dati**: `npm run dati:incorpora` (cioè `node scripts/incorpora-popolazione.js`) ricopia i dati nella pagina. `npm run dati:controlla` controlla soltanto, senza scrivere.
- **Se ci si dimentica**: `node --test` si ferma («La copia dei dati nella pagina è diversa da src/data/population_1960.json») e dice come rimediare; lo stesso fa GitHub.
- Lo strumento rifiuta un file dei dati che non è JSON o che contiene «</script» o «<!--» (non potrebbe stare dentro la pagina).
- Se il blocco manca o è rotto, la pagina si apre lo stesso: la scheda scrive «I dati di popolazione non sono stati letti (…)», nessun valore è mostrato e l'errore va nella console del browser.

### Legame fra i record e la mappa

- `map_id` è il codice di uno Stato sulla mappa: la cifra compare nelle schede delle sue province. Con **una sola provincia** (per esempio il Kuwait) la cifra è anche quella della provincia («Popolazione (1960)»); con più province la cifra resta quella dello Stato («Popolazione dello Stato»), mai divisa in quote.
- `PAK_W` e `PAK_E` sono le due ali del Pakistan: ogni divisione dell'ala mostra la cifra dell'ala («Popolazione dell'ala») e dice che non è la sua. Il Pakistan nel suo insieme non ha una cifra.
- `map_id: null`: entità che non sono sulla mappa (Monaco, Liechtenstein, San Marino, Andorra, Città del Vaticano, Maldive, Palestina). Restano nel file, la pagina non le mostra.
- Due record con lo stesso `map_id` (Yemen) hanno `aggregation: show_not_sum`: la scheda mostra i due valori affiancati e le righe di ciascuno, mai la somma.
- Le **14 repubbliche sovietiche** (Ucraina, Bielorussia, Moldavia, Estonia, Lettonia, Lituania, Georgia, Armenia, Azerbaigian, Kazakistan, Uzbekistan, Turkmenistan, Tagikistan, Kirghizistan) sono Stati separati sulla mappa ma non hanno un record: la scheda dice che nel 1960 facevano parte dell'URSS, il cui dato è riferito all'intero Stato.

### Che cosa mostra la scheda per ogni cifra

Fonte (il nome dal registro `meta.sources`; se un `source_id` non è nel registro, il codice stesso: mai «undefined»), verifica (`verified`), status al 31 dicembre 1960 (con «controllato online su fonti secondarie» e la data, oppure «come nel file fornito, non ricontrollato», oppure «da verificare» se il file non ha status; le fonti dello status sono collegamenti, chiusi in un elenco a scomparsa), perimetro, avvertenze (i `flags`, in frasi: sono scritte nella pagina, in `POP_FLAG_TEXT`; un flag nuovo nel file senza frase fa fermare `node --test`), altro valore (`alternative_values`, per esempio i 580.000 di Cipro), nota, e in fondo l'avvertenza generale (`meta.global_warning`, scritta una volta sola nel file).

I collegamenti alle fonti degli status si aprono solo se li tocchi, in un'altra scheda del browser: la pagina non contatta nessun sito da sola.

### Testi del file

I testi che la scheda mostra (note, perimetri, nomi) sono in italiano con gli accenti. Con la versione 29 sono stati corretti 17 testi che li avevano persi («e» al posto di «è», «entita», «Citta del Vaticano», «a se»…): cambiano solo gli accenti, nessun numero, identificativo, status, fonte o flag. `tests/population-pagina.test.js` si ferma se ricompaiono errori di questo tipo.

### Prove

`tests/population.test.js` (il file dei dati), `tests/population-pagina.test.js` (la copia nella pagina, lo strumento, i documenti) e `tests/browser/t16_popolazione.js` (ogni scheda di ogni provincia mostra il valore del file; guasti messi apposta).
