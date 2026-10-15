# Note sui dati: popolazione 1960

File dati: `src/data/population_1960.json` (schema in `src/data/population_1960.schema.json`, test in `tests/population.test.js`).

## Principi

1. **Data di riferimento**: 1 gennaio 1960. Lo status politico si legge a quella data, non a fine anno.
2. **Nessun valore e stato ricontrollato** sulle fonti primarie (`verified: false` ovunque). Il dataset riporta i numeri dei due CSV forniti.
3. **Avvertenza globale** in `meta.global_warning`, non ripetuta nei record.
4. **Serie diverse non si sommano**: Maddison, Statistics and Data e ONU hanno perimetri e metodi diversi.

## Correzioni di status rispetto ai CSV

| Entita | CSV | Revisione | Motivo |
|---|---|---|---|
| Cipro | Stato sovrano | Colonia britannica | Indipendenza il 16 agosto 1960 |
| Kuwait | Stato sovrano | Protettorato britannico | Indipendenza il 19 giugno 1961 |
| Siria | Stato sovrano | Regione della Repubblica Araba Unita | UAR 1958-1961 |
| Pakistan | Stato sovrano (valore dell'ala occidentale) | Ala occidentale del Pakistan | Il valore non copre l'intero Stato |
| Yemen del Sud | Stato sovrano | Possedimenti britannici (da verificare) | Aden e protettorati ancora britannici |

## Voci aperte (da verificare su fonte primaria)

- **Malaysia/Malaya (8.160.000)**: perimetro incerto; possibile doppio conteggio con Singapore.
- **Giordania (933.000)**: verificare l'inclusione della Cisgiordania; sovrapposizione possibile con la riga Palestina.
- **Cipro**: 573.000 (secondo CSV) contro 580.000 (primo CSV, JetPunk).
- **Fonti secondarie**: sostituire JetPunk con l'ONU *World Population Prospects*.
- **Secondo CSV**: manca la colonna fonte (`FILE_B_UNSPECIFIED`).
- **Cifre arrotondate**: Vietnam, Yemen del Sud, Libano, Emirati, Maldive, Palestina.
- **Status nulli**: il primo CSV non forniva lo status; da compilare con fonte.

## Integrazione nel codice

La patch di `src/storia-alternativa-prototipo-map-overlay.html` che sostituisce i blocchi `POPULATION_1960`, `POPULATION_1960_B` e `regionalPopulationProvinces` con il caricamento di questo JSON non e ancora applicata.
