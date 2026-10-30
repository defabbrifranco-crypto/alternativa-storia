# Metodologia

Questo documento descrive i criteri con cui sono trattati i dati storici del prototipo. **Copertura attuale: parziale.** Sono documentati i dati di popolazione, gli status politici al 31 dicembre 1960 (controllati online su fonti secondarie: vedi [`STATUS-1960.md`](STATUS-1960.md)) e la costruzione della mappa ([`CONFINI-MAPPA.md`](CONFINI-MAPPA.md)). Gli altri dati incorporati nell'HTML non sono ancora censiti (vedi "Lacune").

## Data di riferimento

Lo scenario parte il **31 dicembre 1960**. Ogni status politico va letto a quella data, non prima e non dopo. Una data successiva compare solo **fra parentesi**, come indicazione di ciò che avvenne dopo, mai come status. Cipro, per esempio, è indipendente dal 16 agosto 1960 e al 31 dicembre 1960 è Stato sovrano; il Kuwait al 31 dicembre 1960 è ancora un protettorato britannico («indipendente dal 19 giugno 1961»).

## Sovranità legale e controllo effettivo

Sono due attributi distinti.

- **Sovranità legale**: a quale Stato appartiene giuridicamente un territorio.
- **Controllo effettivo**: chi lo amministra o lo occupa di fatto.

I due valori possono divergere (occupazioni, protettorati, territori contesi). Il dataset di popolazione non li unifica. Sulla mappa la pagina li tiene separati: la provincia ha il colore del proprietario e, se è occupata, righe diagonali nel colore di chi la controlla; una legenda fissa e l'elenco «Territori occupati» lo dicono anche a parole (vedi [`EDITOR-SCENARIO.md`](EDITOR-SCENARIO.md)). Durante una partita la risposta del motore elenca i cambi di sovranità e quelli di controllo in due liste distinte (`cambi_territoriali` e `cambi_controllo`); ogni cambio deve rispettare la regola dei confini (una provincia passa solo a uno Stato che già ne tiene una confinante) e per turno ne sono applicati al massimo 12. Il turno è descritto in [`TURNO-E-AZIONI.md`](TURNO-E-AZIONI.md).

## Entità e perimetro

- Ogni record dichiara l'**entità** e, se serve, il **perimetro** (per esempio "Pakistan occidentale", "Intero Stato, inclusa la parte asiatica").
- Le repubbliche sovietiche non hanno un dato proprio: il valore dell'URSS è riferito all'intera Unione.
- Se più entità del file condividono un'unica entità sulla mappa (caso Yemen), i valori si **mostrano e non si sommano** (`aggregation: show_not_sum`).
- Un valore il cui perimetro è incerto (Malaysia/Malaya, Giordania) porta un flag e non va confrontato con altri stati.

## Fonti e serie

- Le fonti dei valori di popolazione sono registrate in `src/data/population_1960.json` (`meta.sources`), quelle degli status controllati in `meta.status_sources`; sono descritte in [`FONTI.md`](FONTI.md) e [`STATUS-1960.md`](STATUS-1960.md).
- **Serie diverse non si sommano né si confrontano** senza verifica dei perimetri: Maddison, Statistics and Data e ONU hanno metodi diversi.
- Una fonte secondaria (JetPunk) è tollerata solo come segnaposto e va sostituita con la fonte primaria (ONU, *World Population Prospects*).

## Livelli di affidabilità

| Livello | Significato |
|---|---|
| verificato | Controllato su fonte consultabile e citata in `FONTI.md` |
| da verificare | Riportato dai file di origine, non ricontrollato |
| stimato | Cifra dichiaratamente approssimata o arrotondata |

Nel dataset il campo `verified` è `false` per tutti i record: nessun valore numerico è stato ricontrollato sulla fonte primaria.

**Status politici.** Un record con `status_sources` è stato controllato online (il 25 e 26 ottobre 2026) su fonti secondarie: sono 37 record su 77. Senza `status_sources` lo status è quello del file fornito e non è stato controllato su una fonte specifica; 32 record europei non hanno status (`null`). Nessuno status è stato controllato su fonti primarie d'archivio (trattati, atti ufficiali): un dubbio serio va risolto su quelle.

## Correzioni di status

Quando lo status di un CSV di origine è incompatibile con la data di riferimento, il dataset lo corregge e lo segnala con `status_origin: "revisione"`, `status_sources` e una nota; gli status sbagliati per la data hanno anche il flag `status_corretto`, quelli validi ma incompleti `status_precisato`. L'elenco è in [`data-notes-population-1960.md`](data-notes-population-1960.md) e in [`STATUS-1960.md`](STATUS-1960.md).

## Lacune e parti documentate solo in parte

- **Confini e geometrie della mappa**: i criteri sono in [`CONFINI-MAPPA.md`](CONFINI-MAPPA.md). Restano da chiarire le tre linee tracciate a mano senza fonte, le unità non disegnate e le condizioni degli elenchi di unità (vedi [`ATTRIBUZIONI.md`](../ATTRIBUZIONI.md)).
- **Dati territoriali diversi dalla popolazione**: capitali, «alleanze» e colori della pagina sono etichette semplificate del prototipo, non dati verificati.
- **Regole di territorio e di diplomazia incorporate nell'HTML**: descritte solo in parte ([`TURNO-E-AZIONI.md`](TURNO-E-AZIONI.md), [`EDITOR-SCENARIO.md`](EDITOR-SCENARIO.md)).
- **Status**: 32 record europei senza status; Cina, Coree, Vietnam, Mongolia e Palestina hanno lo status del file, non controllato su una fonte specifica; per l'Oman le fonti non concordano; nessuno status è stato controllato su fonti primarie.

## Aggiornamenti

Ogni modifica ai dati passa da una pull request. Una correzione di status o di valore indica nel messaggio di commit la fonte consultata.
