# Alternativa Storia

Prototipo di gioco di storia alternativa con mappa interattiva. Lo scenario di partenza è il **1 gennaio 1960**.

> **Stato: prototipo in sviluppo.** I dati storici e territoriali non sono ancora stati verificati su fonti. Non vanno usati come riferimento storico.

## Limiti attuali

- **AI e salvataggi** dipendono dall'ambiente Claude (`claude.use`). Aprendo il file altrove queste funzioni non sono disponibili ([#1](../../issues/1)).
- **Dati storici** privi di fonti formalizzate ([#3](../../issues/3)).
- **Accessibilità** limitata: la mappa si usa quasi solo con il puntatore ([#4](../../issues/4)).
- **Nessun test automatico** e nessuna migrazione dei salvataggi ([#5](../../issues/5)).

## Struttura del repository

| Cartella | Contenuto |
|---|---|
| `src/` | Versione di lavoro: `storia-alternativa-prototipo-map-overlay.html` |
| `archive/` | Versione precedente: `storia-alternativa-prototipo.html` |
| `docs/` | Documentazione, metodologia e fonti (in preparazione) |

## Come provarlo

Il prototipo è un singolo file HTML. Va aperto in un ambiente che fornisca le funzioni `claude.use`; in un normale browser la mappa si carica, ma AI e salvataggi non funzionano.

## Sviluppo

Il lavoro prosegue per issue. Priorità attuali:

1. Rimuovere la dipendenza da `claude.use` ([#1](../../issues/1)).
2. Separare Editor scenario e gioco ([#2](../../issues/2)).
3. Documentare fonti e metodologia ([#3](../../issues/3)).
4. Accessibilità ([#4](../../issues/4)), test ([#5](../../issues/5)), pulizia del codice ([#6](../../issues/6)).

## Note

Il progetto è sviluppato con l'aiuto di strumenti di intelligenza artificiale.
