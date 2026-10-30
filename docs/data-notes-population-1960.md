# Note sui dati: popolazione 1960

File dati: `src/data/population_1960.json` (schema in `src/data/population_1960.schema.json`, test in `tests/population.test.js` e `tests/population-pagina.test.js`).

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

La pagina `src/storia-alternativa-prototipo.html` non carica questo JSON: contiene copie scritte dentro, negli elenchi `POPULATION_1960` e `POPULATION_1960_B`. La prova `tests/population-pagina.test.js` verifica che le due versioni dicano la stessa cosa (popolazioni e status, riga per riga). La patch di `src/storia-alternativa-prototipo-map-overlay.html` che sostituisce i blocchi `POPULATION_1960`, `POPULATION_1960_B` e `regionalPopulationProvinces` con il caricamento di questo JSON non è ancora applicata.
