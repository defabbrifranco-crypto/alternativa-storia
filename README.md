# Alternativa Storia

Prototipo di gioco di storia alternativa con mappa interattiva. Lo scenario di partenza è il **1 gennaio 1960**.

> **Stato: prototipo in sviluppo.** I dati storici e territoriali non sono ancora stati verificati su fonti. Non vanno usati come riferimento storico.

## Limiti attuali

- **AI e salvataggi** dipendono dall'ambiente Claude (`claude.use`). Aprendo il file altrove queste funzioni non sono disponibili ([#1](../../issues/1)).
- **Dati storici** con fonti documentate solo in parte: vedi [`docs/METODOLOGIA.md`](docs/METODOLOGIA.md) e [`docs/FONTI.md`](docs/FONTI.md). Nessun valore numerico di popolazione è stato ricontrollato sulla fonte primaria ([#3](../../issues/3)).
- **Accessibilità** limitata: la mappa si usa quasi solo con il puntatore ([#4](../../issues/4)).
- **Nessun test automatico** sul codice e nessuna migrazione dei salvataggi ([#5](../../issues/5)). Esistono solo test sul dataset di popolazione (`tests/population.test.js`).
- **Dataset di popolazione** presente in `src/data/population_1960.json` ma non ancora letto dal gioco ([#8](../../issues/8)).

## Struttura del repository

| Cartella | Contenuto |
|---|---|
| `src/` | Versione di lavoro: `storia-alternativa-prototipo-map-overlay.html`; dati in `src/data/` |
| `archive/` | Versione precedente: `storia-alternativa-prototipo.html` |
| `docs/` | Metodologia, registro delle fonti, note sui dati di popolazione |
| `tests/` | Test sul dataset di popolazione |

## Come provarlo

Il prototipo è un singolo file HTML. Va aperto in un ambiente che fornisca le funzioni `claude.use`; in un normale browser la mappa si carica, ma AI e salvataggi non funzionano.

Per i test del dataset: `node --test tests/`.

## Sviluppo

Il lavoro prosegue per issue. Priorità attuali:

1. Rimuovere la dipendenza da `claude.use` ([#1](../../issues/1)).
2. Separare Editor scenario e gioco ([#2](../../issues/2)).
3. Documentare fonti e metodologia ([#3](../../issues/3)), in corso.
4. Accessibilità ([#4](../../issues/4)), test ([#5](../../issues/5)), pulizia del codice ([#6](../../issues/6)).
5. Caricare il dataset di popolazione nel gioco ([#8](../../issues/8)).

## Note

Il progetto è sviluppato con l'aiuto di strumenti di intelligenza artificiale.
