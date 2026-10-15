# Fonti e stato di verifica dei dati

Registro dei dati storici usati dal prototipo. Riferimento: issue #3.

## Legenda dei livelli

| Livello | Significato |
|---|---|
| Verificato | Confrontato con almeno una fonte autorevole, citata nella voce |
| Da verificare | Presente nel dataset, non ancora confrontato con una fonte |
| Stimato | Valore di gioco, non storico |

## Stato complessivo

Al momento **nessuna voce è Verificata**. Il censimento dei dati incorporati in `src/storia-alternativa-prototipo-map-overlay.html` non è stato eseguito: questa tabella è un modello da compilare, non un inventario.

## Modello di voce

| Territorio | Dato | Valore nel prototipo | Fonte | Consultata il | Livello |
|---|---|---|---|---|---|
| (esempio) | Popolazione 1960 | (da compilare) | (da compilare) | (da compilare) | Da verificare |

## Voci prioritarie

| Tema | Verifica richiesta | Livello |
|---|---|---|
| Status di Siria ed Egitto al 1 gennaio 1960 | Appartenenza alla Repubblica Araba Unita | Da verificare |
| Status di Cipro al 1 gennaio 1960 | Sovranità e controllo | Da verificare |
| Repubbliche sovietiche | Trattamento come suddivisioni dell'URSS | Da verificare |
| Popolazione 1960 | Fonte per ogni territorio | Da verificare |
| Appartenenza ai blocchi | Criterio di assegnazione alle quattro categorie | Da verificare |
| Colonie e protettorati | Elenco e status al 1 gennaio 1960 | Da verificare |

## Come aggiungere una fonte

1. Individuare il dato nel file `src/`.
2. Cercare una fonte secondo l'ordine indicato in `METODOLOGIA.md`.
3. Inserire una riga con fonte e data di consultazione.
4. Portare il livello a Verificato solo se il valore coincide con la fonte; altrimenti correggere il dataset e annotare la differenza.
