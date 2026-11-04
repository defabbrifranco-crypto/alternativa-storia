# Una licenza separata per i dati? Valutazione e decisione

Questo documento **valuta** se il progetto debba avere una licenza separata per i dati, oltre alla licenza del codice. Risponde al punto «Valutare una licenza separata per codice e dati» della #3. **Non è un parere legale**: chi scrive non è un avvocato. La licenza la sceglie l'autore, titolare del progetto: il **3 novembre 2026 ha scelto l'opzione A, restare con la sola MIT** (vedi «Decisione dell'autore»). Le letture online citate sono del **2 novembre 2026**.

## In breve

- Oggi c'è **una sola licenza, la MIT** ([`LICENSE`](../LICENSE)), per il codice e i testi scritti per il progetto. [`ATTRIBUZIONI.md`](../ATTRIBUZIONI.md) dice che la licenza **non cambia le condizioni dei dati di terzi**.
- Nessuna licenza può dare permessi sui **numeri di terzi** (per esempio i valori di popolazione): lo può fare solo chi li possiede. Una licenza per i dati può riguardare solo ciò che ha scritto il progetto: annotazioni, status controllati, note, organizzazione dei dati.
- Finché le fonti dei numeri non sono chiare (di nessuna delle quattro dichiarate le condizioni sono accertate per i dati effettivamente usati), **aggiungere una licenza per i dati rischia di promettere più di quanto si possa promettere**. Per questo la strada più prudente è lasciare le cose come stanno, ed è quella scelta dall'autore il 3 novembre 2026 (opzione A sotto). La questione si può riaprire quando i numeri avranno fonti con condizioni note (opzione D sotto).

## Com'è oggi

- [`LICENSE`](../LICENSE): licenza MIT, titolare «defabbrifranco-crypto» (il nome utente GitHub). Il testo della MIT parla di «software» e di «file di documentazione associati»: non nomina i dati.
- [`ATTRIBUZIONI.md`](../ATTRIBUZIONI.md): spiega che la MIT copre il codice e i testi del progetto e **non** i contorni degli Stati, gli elenchi di unità e i dati di popolazione, e dice per ciascuno che cosa si sa e che cosa resta da chiarire.
- La pagina del gioco è **un solo file HTML** che contiene insieme codice e dati (contorni, elenchi, copia dei dati di popolazione). I dati di terzi dentro il file restano con le loro condizioni.

## Che cosa c'è nel repository, dal punto di vista della licenza

| Insieme | Chi l'ha scritto | Condizioni note | Su che cosa decide l'autore |
|---|---|---|---|
| Codice della pagina, strumenti, prove | il progetto (con l'aiuto di un assistente AI, vedi il README) | MIT | la licenza del codice |
| Documenti e testi del progetto | il progetto | MIT | la licenza dei testi |
| Contorni degli Stati | rielaborazione di un file con gli attributi di Natural Earth | Natural Earth dichiara dati di pubblico dominio (pagina letta il 24 ottobre 2026, vedi [`ATTRIBUZIONI.md`](../ATTRIBUZIONI.md)); da dove l'autore abbia scaricato il file non è verificato | niente da decidere |
| Celle delle regioni e adiacenze | calcolate dal progetto dai punti dei file dell'autore | dipendono dalle condizioni di quei file, non chiarite (dubbio sul dataset MPIDR: [`ATTRIBUZIONI.md`](../ATTRIBUZIONI.md)) | da chiarire prima di decidere |
| Valori di popolazione (`src/data/population_1960.json`) | numeri di due file CSV dell'autore | miste e in parte sconosciute (vedi sotto) | niente, finché le fonti non sono chiare |
| Annotazioni del progetto nel file di popolazione (status e loro fonti, perimetri, avvertenze, note) | il progetto, con il controllo online del 25 e 26 ottobre 2026 ([`STATUS-1960.md`](STATUS-1960.md)) | nessuna licenza propria | la licenza di queste annotazioni |
| Capitali, alleanze, colori e valutazioni provvisorie ([`DATI-INCORPORATI.md`](DATI-INCORPORATI.md)) | il prototipo | nessuna licenza propria; sono da verificare | la licenza di questi testi |
| Note scritte nella pagina (`COUNTRY_NOTES` e le altre: [`DATI-INCORPORATI.md`](DATI-INCORPORATI.md)) | in parte testi dei file dell'autore (`europa-1960-regioni.md`), in parte del prototipo | quelle dei file seguono le condizioni dei file, non chiarite | da chiarire insieme agli elenchi di unità |

## Che cosa si sa delle fonti dei numeri

Le quattro fonti dichiarate nel file di popolazione ([`FONTI.md`](FONTI.md)) sono: Maddison, Statistics and Data, ONU retrospettiva tramite JetPunk, e nessuna fonte per il secondo CSV.

- **Maddison Project Database, versione 2023** (Bolt e van Zanden, Università di Groningen). La pagina del database dice: «Maddison Project Database, version 2023 by Jutta Bolt and Jan Luiten van Zanden is licensed under a Creative Commons Attribution 4.0 International License» (CC BY 4.0). Chiede di citare tutti gli articoli originali quando i dati sono mostrati «in any graphical form» o quando si usano sottoinsiemi con meno di dodici paesi; negli altri casi basta citare il database nel suo insieme. **Non si sa quale versione del Maddison abbia usato l'autore**: il primo CSV dice solo «Maddison». Perciò la licenza della versione 2023 dice che cosa vale per quella versione, non necessariamente per il file dell'autore.
- **ONU, World Population Prospects 2024.** La pubblicazione «Summary of Results» dice che «Figures and tables in this publication can be reproduced without prior permission under a Creative Commons license» (CC BY 3.0 IGO). **La licenza dei file di dati scaricabili non è scritta nelle pagine dell'ONU che si sono potute leggere.** Le due pagine del Dipartimento degli affari economici e sociali dedicate alle World Population Prospects 2024 non contengono nessuna dichiarazione di licenza; la pagina generale sul diritto d'autore delle Nazioni Unite dice che i materiali del sito non si possono usare o riprodurre senza permesso scritto, salvo le eccezioni delle condizioni d'uso; e le condizioni d'uso consentono di scaricare e copiare i materiali «for the User's personal, non-commercial use, without any right to resell or redistribute them», senza fare opere derivate, «subject to more specific restrictions that may apply to specific Material». Nessuna delle due pagine nomina le World Population Prospects. Il sito Our World in Data indica per quei dati la licenza CC BY 3.0 IGO e rinvia alla pagina dei download dell'ONU (`population.un.org/wpp/downloads/`), ma è una fonte secondaria, e quella pagina non si è potuta aprire. Da confermare sul sito dell'ONU prima di contarci.
- **Statistics and Data** e **JetPunk**: condizioni non lette. JetPunk è un sito di quiz, citato nel file come tramite per dati ONU: è una fonte secondaria da sostituire.
- **Secondo CSV** (`fb6262f2.csv`): nessuna fonte dichiarata, quindi nessuna condizione nota.
- **Creative Commons**, domande frequenti: «We recommend against using Creative Commons licenses for software» e «CC licenses can be used on databases». Le licenze 4.0 coprono anche i diritti sulle banche dati («applicable sui generis database rights are licensed under the same license conditions as copyright»).

Non sono state lette le condizioni di Statistics and Data e di JetPunk, né quelle di altri originali dei file dell'autore. Per il dataset MPIDR la pagina MOSAIC (letta il 24 ottobre 2026) non indica una licenza e dice che i dati si possono usare liberamente per scopi scientifici non commerciali, previa registrazione ([`ATTRIBUZIONI.md`](../ATTRIBUZIONI.md)).

## Le opzioni

**A. Restare con la sola MIT (come oggi). Scelta dell'autore il 3 novembre 2026.** Il codice e i testi del progetto sono MIT; i dati di terzi restano esclusi per iscritto in [`ATTRIBUZIONI.md`](../ATTRIBUZIONI.md).
- A favore: nessun lavoro; semplice da capire; non promette nulla sui dati di terzi.
- Contro: la MIT parla di software e documentazione, non di dati; chiede solo di conservare l'avviso di copyright e il testo della licenza, non di citare il progetto come fonte; chi riusa il file JSON potrebbe credere che anche i numeri siano MIT (lo si mitiga con [`ATTRIBUZIONI.md`](../ATTRIBUZIONI.md) e con l'avvertenza nella scheda del gioco).

**B. MIT per il codice, Creative Commons Attribuzione 4.0 (CC BY 4.0) per i testi e le annotazioni originali del progetto**, con i dati di terzi esclusi per iscritto.
- A favore: è una licenza pensata per testi e dati; chiede di citare l'autore; la versione 4.0 copre anche i diritti sulle banche dati; non si applica al codice, che resta MIT (Creative Commons sconsiglia le sue licenze per il software).
- Contro: serve un secondo file di licenza e una frase che dica che cosa copre; nel file JSON le annotazioni originali sono mescolate ai numeri di terzi, quindi il confine è sfumato; più cose da spiegare a chi riusa il progetto.

**C. MIT per il codice, CC0 (rinuncia ai diritti) per le annotazioni originali.**
- A favore: massima libertà di riuso, nessuna citazione richiesta.
- Contro: è irrevocabile; non chiede di citare l'autore; stesso confine sfumato di B; non copre i dati di terzi.

**D. Rimandare la scelta** finché i numeri non hanno fonti primarie con condizioni chiare, poi decidere fra B e C. Nel frattempo vale A. Il passo che sblocca la decisione è quello già in elenco in [`FONTI.md`](FONTI.md) («Sostituire JetPunk con la fonte primaria ONU», «Reperire la fonte del secondo CSV»): con numeri presi da fonti a licenza aperta e citate (come il Maddison 2023 con CC BY 4.0, o le tabelle ONU) il progetto potrebbe pubblicare il file dei dati con una licenza che chieda la citazione.
- A favore: non promette ciò che non si può promettere; la scelta si fa quando i dati sono chiari.
- Contro: nel frattempo resta la situazione di oggi (A).

## Che cosa servirebbe per rivedere la scelta

Per riaprire la questione servirebbero tre risposte che solo l'autore può dare (con la scelta A non sono necessarie):

1. **Da dove vengono i due file CSV di popolazione e i punti delle unità regionali** (strumento, sito, data): dalla risposta dipende se si può dire qualcosa sulle condizioni di quei numeri.
2. **Se vuole che chi riusa i dati o i testi debba citare il progetto.** Se sì, A non basta (la MIT non lo chiede) e B è la strada più comune; se no, A o C.
3. **Se pensa al file dei dati come a un prodotto che altri possano riusare**, o solo come supporto al gioco. Nel secondo caso A basta.

## Decisione dell'autore

Il **3 novembre 2026** l'autore ha scelto **A: restare con la sola MIT**. Non cambia nessun file: [`LICENSE`](../LICENSE), [`CITATION.cff`](../CITATION.cff) e le sezioni «Licenza» restano come sono, e i dati di terzi restano esclusi per iscritto in [`ATTRIBUZIONI.md`](../ATTRIBUZIONI.md). Oggi quindi: il codice e i testi scritti per il progetto sono MIT; i numeri e gli altri dati di terzi **non** lo sono e seguono le condizioni delle loro fonti, in gran parte non accertate.

La scelta si può rivedere. Conviene farlo se si sostituiscono le fonti dei numeri con fonti a licenza aperta e citata (opzione D), se qualcuno chiede di riusare il file dei dati, o se l'autore vuole che chi riusa il progetto debba citarlo (la MIT chiede solo di conservare l'avviso di copyright). In quel caso si sceglie fra B e C e servono un file di licenza per i dati e due frasi nel README e in [`ATTRIBUZIONI.md`](../ATTRIBUZIONI.md).

## Che cosa non è stato fatto

- Nessun legale ha letto questo documento e nessuna parte di esso è un parere legale.
- Non sono stati cambiati [`LICENSE`](../LICENSE), [`CITATION.cff`](../CITATION.cff) né le sezioni «Licenza» del README e di [`ATTRIBUZIONI.md`](../ATTRIBUZIONI.md), a parte un rinvio a questo documento e la frase che registra la decisione.

## Pagine lette (2 novembre 2026)

- Maddison Project Database 2023: <https://www.rug.nl/ggdc/historicaldevelopment/maddison/releases/maddison-project-database-2023>
- ONU, World Population Prospects 2024, Summary of Results (sezione «Copyright information»): <https://population.un.org/wpp/assets/Files/WPP2024_Summary-of-Results.pdf>
- ONU, pagine sulle World Population Prospects 2024, diritto d'autore e condizioni d'uso (nessuna parla della licenza dei file di dati): <https://www.un.org/development/desa/pd/node/4327>, <https://www.un.org/development/desa/pd/world-population-prospects-2024>, <https://www.un.org/en/about-us/copyright>, <https://www.un.org/en/about-us/terms-of-use>
- Our World in Data, informazioni sulla licenza dei dati ONU (fonte secondaria): <https://archive.ourworldindata.org/api/v1/indicators/953892.2xrsfuk6q8.metadata.json>
- Creative Commons, domande frequenti: <https://creativecommons.org/faq/>
