# Metodologia

Questo documento descrive i criteri con cui sono trattati i dati storici del prototipo. **Copertura attuale: parziale.** Sono documentati i dati di popolazione e gli status politici al 1 gennaio 1960. Confini, regole di territorio e altri dati incorporati nell'HTML non sono ancora censiti (vedi "Lacune").

## Data di riferimento

Lo scenario parte il **1 gennaio 1960**. Ogni status politico va letto a quella data, non a fine anno. Un'indipendenza avvenuta dopo il 1 gennaio 1960 non vale per lo scenario: Cipro, per esempio, diventa indipendente il 16 agosto 1960 e al 1 gennaio 1960 è colonia britannica.

## Sovranità legale e controllo effettivo

Sono due attributi distinti.

- **Sovranità legale**: a quale Stato appartiene giuridicamente un territorio.
- **Controllo effettivo**: chi lo amministra o lo occupa di fatto.

I due valori possono divergere (occupazioni, protettorati, territori contesi). Il dataset non li unifica. La rappresentazione grafica delle divergenze è tracciata nella issue #2.

## Entità e perimetro

- Ogni record dichiara l'**entità** e, se serve, il **perimetro** (per esempio "Pakistan occidentale", "Intero Stato, inclusa la parte asiatica").
- Le repubbliche sovietiche non hanno un dato proprio: il valore dell'URSS è riferito all'intera Unione.
- Se più entità del file condividono un'unica entità sulla mappa (caso Yemen), i valori si **mostrano e non si sommano** (`aggregation: show_not_sum`).
- Un valore il cui perimetro è incerto (Malaysia/Malaya, Giordania) porta un flag e non va confrontato con altri stati.

## Fonti e serie

- Le fonti sono registrate in `src/data/population_1960.json` (`meta.sources`) e descritte in `docs/FONTI.md`.
- **Serie diverse non si sommano né si confrontano** senza verifica dei perimetri: Maddison, Statistics and Data e ONU hanno metodi diversi.
- Una fonte secondaria (JetPunk) è tollerata solo come segnaposto e va sostituita con la fonte primaria (ONU, *World Population Prospects*).

## Livelli di affidabilità

| Livello | Significato |
|---|---|
| verificato | Controllato su fonte consultabile e citata in `FONTI.md` |
| da verificare | Riportato dai file di origine, non ricontrollato |
| stimato | Cifra dichiaratamente approssimata o arrotondata |

Nel dataset il campo `verified` è `false` per tutti i record: nessun valore numerico è stato ricontrollato sulla fonte primaria.

## Correzioni di status

Quando lo status di un CSV di origine è incompatibile con la data di riferimento, il dataset lo corregge e lo segnala con `status_origin: "revisione"`, un flag e una nota. L'elenco è in `docs/data-notes-population-1960.md`.

## Lacune (non ancora documentate)

- Criteri di scelta dei confini e delle geometrie della mappa.
- Fonti dei dati territoriali diversi dalla popolazione.
- Regole di territorio e di diplomazia incorporate nell'HTML.
- Status per le entità del primo CSV, che non forniva questa informazione.

## Aggiornamenti

Ogni modifica ai dati passa da una pull request. Una correzione di status o di valore indica nel messaggio di commit la fonte consultata.
