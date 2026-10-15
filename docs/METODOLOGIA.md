# Metodologia

Questo documento descrive i criteri con cui il prototipo rappresenta lo scenario storico e dichiara cosa **non** è ancora verificato. Riferimento: issue #3.

## Stato del documento

Bozza. Le sezioni marcate **[da verificare]** descrivono intenzioni o ipotesi, non fatti accertati sul codice o sui dati.

## Natura del prototipo

Il prototipo è dimostrativo. Dall'interfaccia del file `src/storia-alternativa-prototipo-map-overlay.html`: le conseguenze delle azioni sono generate da un modello linguistico, non da un motore a regole fisse. Le conseguenze narrate non sono quindi previsioni storiche e non hanno valore predittivo.

## Scenario fisso

Lo scenario fisso dichiarato nell'interfaccia è "Europa, 1 gennaio 1960", con quattro categorie di appartenenza mostrate in legenda: NATO e alleati, Patto di Varsavia e blocco comunista, Non allineata, Colonie e protettorati.

La data di riferimento è il **1 gennaio 1960**: ogni dato storico dello scenario fisso deve essere riferito a quella data, non a date precedenti o successive. **[da verificare nel dataset]**

## Concetti usati

L'interfaccia distingue per ogni territorio i campi **Proprietario**, **Controllore**, **Capoluogo**, **Popolazione 1960**, **Popolazione dello Stato**, **Infrastrutture**, **Stabilità locale**, **Importanza strategica**, **Unità presenti**.

Criterio adottato (principio di progetto):

- **Proprietario**: chi detiene la sovranità legale sul territorio.
- **Controllore**: chi esercita il controllo effettivo, che può differire dal proprietario in caso di occupazione.
- Le repubbliche sovietiche sono trattate come suddivisioni dell'URSS e non come Stati sovrani. **[da verificare nel dataset]**

## Valori numerici

I campi numerici (popolazione, infrastrutture, stabilità, importanza strategica, unità) non hanno per ora una fonte dichiarata. Finché non compare una fonte in `FONTI.md`, vanno considerati **stime di gioco** e non dati storici.

Gli indicatori di nazione (Stabilità, Economia, Esercito, Prestigio) partono da 50 nell'interfaccia e sono parametri di gioco, non misure storiche.

## Casi dubbi da documentare

Territori il cui status al 1 gennaio 1960 richiede una scheda con fonte e motivazione della scelta. L'elenco è provvisorio e non ancora confrontato con il dataset:

- Siria e Egitto nella Repubblica Araba Unita. **[da verificare]**
- Cipro. **[da verificare]**
- Territori coloniali e protettorati. **[da verificare]**

## Modifiche proposte dal modello linguistico

Le variazioni territoriali suggerite dall'AI devono essere validate prima dell'applicazione (vedi issue #2). **[da verificare nel codice]**

## Criteri per le fonti

Ordine di preferenza:

1. Fonti primarie e statistiche ufficiali dell'epoca o censimenti nazionali.
2. Opere storiografiche accademiche e atlanti storici.
3. Enciclopedie e fonti secondarie, solo come supporto.

Ogni voce in `FONTI.md` indica fonte, data di consultazione e livello di affidabilità.

## Limiti noti

- Nessun dato dello scenario è al momento collegato a una fonte.
- Il censimento dei dati incorporati nel file non è stato fatto.
- Il prototipo dichiara di ispirarsi al funzionamento di un altro gioco di storia alternativa; non ne riusa materiali documentati qui.
