# Come è costruita la mappa

La mappa del gioco è una **carta schematica**, non un atlante storico dei confini del 1960. Questo documento dice da quali file parte, come sono stati ricavati i contorni e le regioni, quali linee sono tracciate a mano e cosa non va letto come storico. Le fonti e le condizioni d'uso dei file di partenza sono in [`ATTRIBUZIONI.md`](../ATTRIBUZIONI.md). Data di riferimento dello scenario: 31 dicembre 1960.

I numeri sono misurati sulla versione 26 della pagina (24 ottobre 2026).

## In breve

- I **contorni degli Stati** sono quelli di oggi (da un file con gli attributi di Natural Earth, semplificato), con tre correzioni fatte a mano: il confine interno tedesco, la separazione fra Inghilterra, Scozia e Galles e quella fra Vietnam del Nord e del Sud.
- Le **regioni** dentro gli Stati sono **celle approssimate**: ogni punto di uno Stato appartiene all'unità del 1960 il cui punto di riferimento è più vicino. **Non sono confini storici**: una cella può uscire dai limiti della regione vera o non coprirla tutta.
- Il disegno ha **82 Stati o entità** e **1.020 province** (1.506 poligoni: alcune province hanno più isole).
- **30 unità** dell'elenco di partenza non sono disegnate, perché la loro posizione è da verificare.
- Gli script che hanno costruito la mappa e i file di partenza **non sono in questo repository**: oggi la mappa non si può rifare partendo solo da qui (vedi «Come rifarla»).

## File di partenza

Tutti forniti dall'autore e non inclusi nel repository:

1. `custom.geo.json`: 258 contorni di Stati e territori, con gli attributi di Natural Earth «Admin 0 – Countries» (vedi `ATTRIBUZIONI.md`). Sono contorni di oggi.
2. `unita_europa_asia_1960.csv`: elenco delle unità territoriali del 1960 (Stato, nome, tipo, coordinate di un punto e metodo con cui il punto è stato collocato).
3. `europa-1960-regioni.md`: testo con il livello di suddivisione considerato per ogni Stato europeo e le note storiche mostrate nelle schede («Livello considerato per…»).

## Passi

1. **Contorni.** I contorni sono assegnati agli Stati dell'elenco. Gli Stati confinanti sono ricomposti in un'unica rete, in modo che si tocchino esattamente, e ogni confine fra due Stati è semplificato una sola volta (la tolleranza è di pochi chilometri sulla carta). Le isole molto piccole sono omesse, tranne quelle su cui cade un'unità dell'elenco.
2. **Correzioni a mano ai contorni di oggi.**
   - Germania: il file ha la Germania unita. È tagliata lungo una linea del confine interno tracciata a mano per punti (scarto stimato di circa 0,1°), che separa Germania Ovest e Germania Est.
   - Regno Unito: Inghilterra, Scozia e Galles sono separate da due linee tracciate a mano, con la stessa approssimazione.
   - Vietnam: il file ha il Vietnam unito. È tagliato con una retta all'altezza del 17° parallelo.

   Le repubbliche sovietiche (tranne la Russia) sono entità separate, disegnate con i contorni degli Stati di oggi. Le linee a mano sono approssimazioni scritte dall'assistente AI nello script di costruzione, senza una fonte: non sono confini rilevati.
3. **Regioni.** Per 47 Stati ogni unità dell'elenco con una posizione nota diventa un punto di riferimento e il contorno dello Stato è diviso in celle, una per punto (diagramma di Voronoi). Altri 11 Stati restano **una sola provincia**: dieci perché molte unità dell'elenco hanno la posizione da verificare (Iran, Arabia Saudita, Israele, Laos, Libano, Ceylon, Nepal, Oman, Vietnam del Nord, Vietnam del Sud), lo Yemen perché l'elenco copre solo il nord mentre il contorno è quello dell'intero Yemen di oggi. La scheda di ogni Stato dice quante unità ha il file e quante sono disegnate.
4. **Forme convenzionali.** Alcune città-unità (per esempio Amburgo, Brema, Praga, Vienna, Budapest, Varsavia) sono disegnate come cerchi; Berlino Ovest e Berlino Est come forme disegnate a mano. Le unità che sono isole sono disegnate con la loro forma se abbastanza grandi, altrimenti come piccoli ottagoni, con il nome accanto.

## Le unità del file che non sono disegnate

Nei 47 Stati suddivisi l'elenco ha 1.030 unità: 984 sono disegnate, 30 non lo sono perché la posizione è da verificare e 16 sono unità «contenitore» che raggruppano altre unità (14 repubbliche sovietiche sotto l'URSS e le due ali del Pakistan, Occidentale e Orientale).

Le 30 non disegnate sono: Turchia 2, URSS 2, Afghanistan 3, Bhutan 2, Birmania 2, Cambogia 1, Cina 1, Filippine 1, India 3, Iraq 4, Pakistan 4, Taiwan 3, Thailandia 2. I nomi sono nella scheda di ogni Stato («Unità del file non disegnate»).

## Cosa non va letto come storico

- Le celle non sono confini del 1960: forma ed estensione di ogni regione sono un'approssimazione, e le superfici disegnate non sono proporzionali a quelle reali.
- Un contorno che nel 1960 era diverso da quello di oggi resta com'è, a parte le tre correzioni sopra; alcune schede lo segnalano («Confini attuali usati come approssimazione»). Per i territori contesi la mappa segue il file di partenza, senza prendere posizione.
- Le coste sono semplificate e le isole piccole possono mancare.

## Le pagine più vecchie

La variante `src/storia-alternativa-prototipo-map-overlay.html` e la versione in `archive/` hanno una mappa più semplice, ma costruita sulla stessa base: le posizioni delle 83 etichette degli Stati coincidono con quelle della pagina attuale a meno di uno spostamento costante (81 su 83; Germania Ovest e Germania Est sono divise in modo diverso). Questo documento descrive la pagina attuale (e la versione 23, che ha la stessa mappa); di come furono costruite le mappe più vecchie non resta una traccia scritta.

## Come rifarla

Oggi non è possibile partendo da questo repository: lo script di costruzione (in Python) leggeva i tre file da una cartella esterna e non è stato aggiunto qui. Per rendere la mappa riproducibile servono tre cose: aggiungere gli script, aggiungere i tre file di partenza (o indicare dove scaricarli) e chiarire le condizioni d'uso dell'elenco delle unità (vedi `ATTRIBUZIONI.md`).

Per la metodologia generale e i livelli di affidabilità dei dati vedi [`METODOLOGIA.md`](METODOLOGIA.md) e [`FONTI.md`](FONTI.md).
