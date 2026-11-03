# Dati incorporati nella pagina (oltre alla popolazione)

Questo documento è l'**inventario dei dati che la pagina porta con sé oltre ai dati di popolazione**: Stati, capitali, alleanze, colori, unità regionali, valutazioni, note, province confinanti. Per ognuno dice dove sta nel codice, quanti sono, da dove viene, se è stato verificato e dove si vede nel gioco. Risponde al primo criterio della #3: *ogni dato storico rilevante ha una fonte o un'indicazione «da verificare»*.

> **In breve.** Nessun dato di questo elenco è stato controllato su una fonte. Capitali, alleanze, colori, valutazioni, note e suddivisioni sono **etichette e scelte del prototipo**, non storia, e vanno lette così. Dove la pagina non sa un dato scrive «da verificare». Gli unici dati controllati online sono gli status politici dei dati di popolazione ([`STATUS-1960.md`](STATUS-1960.md)).

Le tabelle sono **generate**: le scrive `scripts/censimento-dati.js` leggendo la pagina, quindi i numeri e gli elenchi sono quelli della pagina vera (vedi «Come si tiene aggiornato»). Il resto del documento è scritto a mano. Censimento del **2 novembre 2026**, pagina versione 29 (`src/storia-alternativa-prototipo.html`): le copie di riferimento (la versione 23, la variante «map-overlay») e `archive/` non sono incluse.

## Come leggere i livelli

I documenti ([`METODOLOGIA.md`](METODOLOGIA.md)) usano tre livelli: *verificato*, *da verificare*, *stimato*. I dati di questo inventario non sono tutti dati storici, e servono altre diciture:

| Livello | Significato |
|---|---|
| da verificare | riportato dai file dell'autore o scritto dal prototipo; mai controllato su una fonte |
| provvisorio | valore illustrativo per la demo: la pagina lo dichiara tale («(provvisorio)») |
| calcolato | ricavato dal progetto da altri dati: non è un'informazione storica |
| scelta del progetto | grafica o regola di gioco: non è un dato storico |

**Nessuna voce è «verificata».** Qualche data scritta nelle note coincide con uno status controllato altrove (per esempio la Malaya, indipendente dal 1957, in [`FONTI.md`](FONTI.md)), ma il testo delle note non è stato confrontato con la fonte.

## Quanti sono

<!-- CENSIMENTO contatori INIZIO (generato da scripts/censimento-dati.js: non modificare a mano, si aggiorna con «npm run censimento») -->
| Che cosa | Nome nel codice | Quanti |
|---|---|---|
| Stati | `countries` | 83 |
| Stati giocabili (`playable: true`) | `countries` | 83 |
| Province in tutto | `provinces` | 1.020 |
| Province di Stati senza suddivisioni | `provinces` (`mkProv`) | 36 |
| Unità regionali | `REGION_UNITS` | 984 |
| Stati suddivisi in unità regionali | `REGION_UNITS` | 47 |
| Tipi di unità (provincia, distretto, Land…) | `REGION_TYPES` | 39 |
| Modi in cui è stato trovato il punto di un'unità | `REGION_METHODS` | 7 |
| Stati con una nota sull'estensione | `TERRITORY_NOTES` | 7 |
| Unità con una nota | `UNIT_NOTES` | 2 |
| Stati suddivisi con le note dei file | `COUNTRY_NOTES` | 47 |
| Stati non suddivisi con la spiegazione del perché | `SINGLE_NOTES` | 11 |
| Province con l'elenco dei vicini | `PROV_ORDER` | 1.020 |
| Coppie di province confinanti | `ADJ` | 2.942 |
| Vecchi identificativi di province (salvataggi precedenti) | `LEGACY` | 59 |
| Divisioni del Pakistan: ala occidentale / ala orientale | `WING_UNITS` | 9 / 3 |

Forma sulla mappa delle unità regionali (`REGION_KINDS`):

| Forma | Come la descrive la scheda | Unità |
|---|---|---|
| `cell` | cella calcolata dal punto del file: confine approssimato, non storico | 939 |
| `marker` | marcatore convenzionale (isola o unità senza contorno) | 24 |
| `blob` | forma disegnata a mano (non è un confine reale) | 2 |
| `disc` | cerchio convenzionale (città) | 19 |

Come è stato trovato il punto di ogni unità regionale (`REGION_METHODS`, dichiarazione dei file dell'autore):

| Metodo | Unità |
|---|---|
| Poligono amministrativo moderno di appoggio | 714 |
| Capoluogo / località omonima | 54 |
| Centro storico o capoluogo | 142 |
| Centro della nazione costitutiva | 4 |
| Capoluogo della prefettura storica | 30 |
| Centro indicativo della contea storica | 23 |
| Punto storico / centro regionale | 17 |
<!-- CENSIMENTO contatori FINE -->

## 1. Stati: nome, capitale, alleanza, colore

- **Dove.** `countries`, all'inizio del codice principale della pagina (commento «NOTE on data quality»).
- **Da dove.** Scritti nella pagina dal prototipo. Non vengono dai file forniti (gli elenchi di unità e i file di popolazione non hanno capitali né alleanze) e non hanno una fonte. Il commento nel codice dice che capitali e alleanze sono «this prototype's own simplified labels, not verified data».
- **Livello.** da verificare, tutte le voci. Un'etichetta può essere sbagliata o discutibile anche dove non c'è scritto «da verificare».

**Nomi.** Sono nomi in italiano scelti dal prototipo, in parte quelli dell'epoca (Ceylon, Birmania, Germania Ovest, Timor Portoghese…). Non sono stati confrontati con una fonte.

**Capitali.** Alcune voci hanno il nome di allora e quello di oggi (per esempio «Alma-Ata (oggi Almaty)»); per Israele la pagina scrive «Gerusalemme (status contestato)». La colonna «da verificare nella pagina» della tabella degli Stati dice quali capitali la pagina stessa segna come dubbie. Nella scheda del territorio la capitale compare solo per le province degli Stati senza suddivisioni; per le unità regionali la scheda scrive «da verificare», perché i file forniti non indicano i capoluoghi.

**Alleanze.** Le etichette mescolano tre cose diverse: blocchi militari (NATO, Patto di Varsavia, CENTO, SEATO), status (colonie e protettorati) e orientamenti («Non allineata», «Alleata USA»). Nel progetto non c'è una definizione di «Non allineata»: non va letta come appartenenza a un movimento né come neutralità giuridica. L'etichetta si vede nella legenda (cinque famiglie di colore), nella richiesta all'AI («alleanza: …», per lo Stato del giocatore) e in una regola di gioco: gli Stati con un'alleanza che comincia con «Colonia» non sono scelti fra le altre nazioni che agiscono a ogni «Avanza».

<!-- CENSIMENTO alleanze INIZIO (generato da scripts/censimento-dati.js: non modificare a mano, si aggiorna con «npm run censimento») -->
| Etichetta di alleanza | Stati | Quali (codici) |
|---|---|---|
| Non allineata | 23 | `AFG`, `AUT`, `BTN`, `CHE`, `ESP`, `FIN`, `IDN`, `IND`, `IRL`, `IRQ`, `ISR`, `JOR`, `KHM`, `LAO`, `LBN`, `LKA`, `MMR`, `NPL`, `SAU`, `SWE`, `SYR`, `YEM`, `YUG` |
| Patto di Varsavia | 22 | `ALB`, `ARM`, `AZE`, `BGR`, `BLR`, `EST`, `GDR`, `GEO`, `HUN`, `KAZ`, `KGZ`, `LTU`, `LVA`, `MDA`, `POL`, `ROU`, `TCH`, `TJK`, `TKM`, `UKR`, `URSS`, `UZB` |
| NATO | 13 | `BEL`, `DNK`, `FRA`, `FRG`, `GBR`, `GRC`, `ISL`, `ITA`, `LUX`, `NLD`, `NOR`, `PRT`, `TUR` |
| Protettorato britannico | 5 | `ARE`, `BHR`, `BRN`, `KWT`, `QAT` |
| Alleata USA | 4 | `JPN`, `KOR`, `TWN`, `VNS` |
| Blocco comunista | 4 | `CHN`, `MNG`, `PRK`, `VNN` |
| Colonia britannica | 3 | `BRB`, `HKG`, `SGP` |
| Colonia portoghese | 2 | `MAC`, `TLS` |
| da verificare | 2 | `CYP`, `OMN` |
| SEATO | 2 | `PHL`, `THA` |
| Alleata del Regno Unito | 1 | `MYS` |
| CENTO | 1 | `IRN` |
| SEATO e CENTO | 1 | `PAK` |
<!-- CENSIMENTO alleanze FINE -->

**Colori.** Una tinta per Stato, tutte diverse. Sono scelte grafiche e non hanno significato storico: di norma richiamano la famiglia di colore dell'alleanza nella legenda (blu per la NATO, rossi per il Patto di Varsavia e il blocco comunista, verdi per i non allineati, beige per colonie e protettorati), con qualche eccezione (per esempio la Svizzera). I valori esadecimali sono nel codice (`countries`).

**Giocabile.** Tutte le voci hanno `playable: true`, comprese le 14 repubbliche sovietiche: vedi «Le repubbliche sovietiche» più sotto.

**Tabella degli Stati.** Una riga per Stato, in ordine alfabetico. «Province» è il numero di province dello Stato sulla mappa; «Valutazioni provvisorie» sono infrastrutture/stabilità/importanza strategica (sezione 3).

<!-- CENSIMENTO stati INIZIO (generato da scripts/censimento-dati.js: non modificare a mano, si aggiorna con «npm run censimento») -->
| Codice | Stato | Capitale | Alleanza | Province | Valutazioni provvisorie | «da verificare» nella pagina |
|---|---|---|---|---|---|---|
| `AFG` | Afghanistan | Kabul | Non allineata | 11 | 20/50/50 | — |
| `ALB` | Albania | Tirana | Patto di Varsavia | 26 | 30/45/35 | — |
| `SAU` | Arabia Saudita | Riyad | Non allineata | 1 | 35/60/75 | — |
| `ARM` | Armenia | Erevan | Patto di Varsavia | 1 | 35/50/40 | — |
| `AUT` | Austria | Vienna | Non allineata | 9 | 55/68/40 | — |
| `AZE` | Azerbaigian | Baku | Patto di Varsavia | 1 | 35/50/40 | — |
| `BHR` | Bahrein | Manama | Protettorato britannico | 1 | 35/50/40 | — |
| `BEL` | Belgio | Bruxelles | NATO | 9 | 60/65/55 | — |
| `BTN` | Bhutan | Thimphu (da verificare) | Non allineata | 7 | 35/50/40 | capitale |
| `BLR` | Bielorussia | Minsk | Patto di Varsavia | 1 | 40/50/45 | — |
| `MMR` | Birmania | Rangoon (oggi Yangon) | Non allineata | 12 | 35/50/40 | — |
| `BRB` | Borneo Britannico (Sarawak e Nord Borneo) | da verificare | Colonia britannica | 1 | 35/50/40 | capitale |
| `BRN` | Brunei | Brunei Town (oggi Bandar Seri Begawan) | Protettorato britannico | 1 | 35/50/40 | — |
| `BGR` | Bulgaria | Sofia | Patto di Varsavia | 30 | 45/55/45 | — |
| `KHM` | Cambogia | Phnom Penh | Non allineata | 14 | 35/50/40 | — |
| `TCH` | Cecoslovacchia | Praga | Patto di Varsavia | 11 | più valori (2) | — |
| `LKA` | Ceylon | Colombo | Non allineata | 1 | 35/50/40 | — |
| `CHN` | Cina | Pechino | Blocco comunista | 28 | 45/55/90 | — |
| `CYP` | Cipro | Nicosia | da verificare | 6 | 45/50/55 | alleanza |
| `PRK` | Corea del Nord | Pyongyang | Blocco comunista | 13 | 40/55/65 | — |
| `KOR` | Corea del Sud | Seul | Alleata USA | 10 | 45/40/70 | — |
| `DNK` | Danimarca | Copenaghen | NATO | 22 | 55/68/45 | — |
| `EST` | Estonia | Tallinn | Patto di Varsavia | 1 | 40/50/55 | — |
| `PHL` | Filippine | Manila | SEATO | 54 | 40/55/55 | — |
| `FIN` | Finlandia | Helsinki | Non allineata | 12 | 45/60/50 | — |
| `FRA` | Francia | Parigi | NATO | 21 | 58/70/75 | — |
| `GEO` | Georgia | Tbilisi | Patto di Varsavia | 1 | 35/50/40 | — |
| `GDR` | Germania Est | Berlino Est | Patto di Varsavia | 15 | più valori (2) | — |
| `FRG` | Germania Ovest | Bonn | NATO | 11 | più valori (2) | — |
| `JPN` | Giappone | Tokyo | Alleata USA | 46 | 75/70/80 | — |
| `JOR` | Giordania | Amman | Non allineata | 8 | 35/50/40 | — |
| `GRC` | Grecia | Atene | NATO | 49 | 45/55/60 | — |
| `HKG` | Hong Kong | Victoria | Colonia britannica | 1 | 65/60/55 | — |
| `IND` | India | Nuova Delhi | Non allineata | 18 | 40/60/80 | — |
| `IDN` | Indonesia | Giacarta | Non allineata | 21 | 35/50/65 | — |
| `IRN` | Iran | Teheran | CENTO | 1 | 40/55/75 | — |
| `IRQ` | Iraq | Baghdad | Non allineata | 10 | 40/40/65 | — |
| `IRL` | Irlanda | Dublino | Non allineata | 27 | 45/65/25 | — |
| `ISL` | Islanda | Reykjavík | NATO | 23 | 40/70/50 | — |
| `ISR` | Israele | Gerusalemme (status contestato) | Non allineata | 1 | 60/65/70 | — |
| `ITA` | Italia | Roma | NATO | 19 | 55/55/60 | — |
| `YUG` | Iugoslavia | Belgrado | Non allineata | 8 | più valori (4) | — |
| `KAZ` | Kazakistan | Alma-Ata (oggi Almaty) | Patto di Varsavia | 1 | 45/50/60 | — |
| `KGZ` | Kirghizistan | Frunze (oggi Biškek) | Patto di Varsavia | 1 | 35/50/40 | — |
| `KWT` | Kuwait | Kuwait City | Protettorato britannico | 1 | 45/60/60 | — |
| `LAO` | Laos | Vientiane | Non allineata | 1 | 35/50/40 | — |
| `LVA` | Lettonia | Riga | Patto di Varsavia | 1 | 40/50/50 | — |
| `LBN` | Libano | Beirut | Non allineata | 1 | 35/50/40 | — |
| `LTU` | Lituania | Vilnius | Patto di Varsavia | 1 | 40/50/45 | — |
| `LUX` | Lussemburgo | Lussemburgo | NATO | 3 | 55/70/30 | — |
| `MAC` | Macao | Macao | Colonia portoghese | 1 | 35/50/40 | — |
| `MYS` | Malaya (Federazione della Malesia) | Kuala Lumpur | Alleata del Regno Unito | 11 | 45/60/50 | — |
| `MDA` | Moldavia | Chișinău | Patto di Varsavia | 1 | 35/45/35 | — |
| `MNG` | Mongolia | Ulan Bator | Blocco comunista | 19 | 35/50/40 | — |
| `NPL` | Nepal | Kathmandu | Non allineata | 1 | 35/50/40 | — |
| `NOR` | Norvegia | Oslo | NATO | 20 | 50/65/45 | — |
| `OMN` | Oman | Mascate | da verificare | 1 | 35/50/40 | alleanza |
| `NLD` | Paesi Bassi | Amsterdam | NATO | 11 | 60/65/50 | — |
| `PAK` | Pakistan | Rawalpindi (capitale provvisoria dal 1959 — da verificare) | SEATO e CENTO | 12 | 32/48/55 | capitale |
| `POL` | Polonia | Varsavia | Patto di Varsavia | 22 | 45/55/65 | — |
| `PRT` | Portogallo | Lisbona | NATO | 22 | 45/60/40 | — |
| `QAT` | Qatar | Doha | Protettorato britannico | 1 | 35/50/40 | — |
| `GBR` | Regno Unito | Londra | NATO | 4 | 65/65/70 | — |
| `TWN` | Repubblica di Cina (Taiwan) | Taipei | Alleata USA | 18 | 50/60/70 | — |
| `ROU` | Romania | Bucarest | Patto di Varsavia | 18 | 45/50/50 | — |
| `SGP` | Singapore | Singapore | Colonia britannica | 1 | 65/60/70 | — |
| `SYR` | Siria | Damasco | Non allineata | 1 | 35/40/55 | — |
| `ESP` | Spagna | Madrid | Non allineata | 50 | 40/55/45 | — |
| `ARE` | Stati della Tregua (Emirati Arabi Uniti) | da verificare | Protettorato britannico | 1 | 35/50/40 | capitale |
| `SWE` | Svezia | Stoccolma | Non allineata | 25 | 55/70/40 | — |
| `CHE` | Svizzera | Berna | Non allineata | 25 | 65/80/35 | — |
| `TJK` | Tagikistan | Stalinabad (oggi Dušanbe) | Patto di Varsavia | 1 | 35/50/40 | — |
| `THA` | Thailandia | Bangkok | SEATO | 69 | 40/60/55 | — |
| `TLS` | Timor Portoghese | Dili | Colonia portoghese | 1 | 35/50/40 | — |
| `TUR` | Turchia | Ankara | NATO | 65 | 35/50/75 | — |
| `TKM` | Turkmenistan | Ashkhabad (oggi Aşgabat) | Patto di Varsavia | 1 | 35/50/40 | — |
| `UKR` | Ucraina | Kiev | Patto di Varsavia | 1 | 45/50/60 | — |
| `HUN` | Ungheria | Budapest | Patto di Varsavia | 20 | 45/50/50 | — |
| `URSS` | Unione Sovietica | Mosca | Patto di Varsavia | 20 | 50/55/90 | — |
| `UZB` | Uzbekistan | Tashkent | Patto di Varsavia | 1 | 35/50/40 | — |
| `VNN` | Vietnam del Nord | Hanoi | Blocco comunista | 1 | 30/55/55 | — |
| `VNS` | Vietnam del Sud | Saigon | Alleata USA | 1 | 35/40/60 | — |
| `YEM` | Yemen | Sana'a | Non allineata | 1 | 35/50/40 | — |
<!-- CENSIMENTO stati FINE -->

## 2. Unità regionali e province

- **Dove.** `REGION_UNITS` (una riga per unità: identificativo, nome, Stato, tipo, metodo, posizione nell'elenco del file, forma, tre valutazioni), con i testi `REGION_TYPES`, `REGION_METHODS` e `REGION_KINDS`. Le province degli Stati senza suddivisioni sono scritte una per una in `provinces` (funzione `mkProv`).
- **Da dove.** Nomi, tipi, metodi e posizione nell'elenco vengono dai file dell'autore (`unita_europa_asia_1960.csv` e `europa-1960-regioni.md`, riferiti al 31 dicembre 1960) e non sono stati ricontrollati. Le **forme** sono calcolate dal progetto a partire da un solo punto per unità: sono celle approssimate dentro il contorno dello Stato, non confini storici ([`CONFINI-MAPPA.md`](CONFINI-MAPPA.md)).
- **Livello.** Nomi, tipi e metodi: da verificare. Forme: calcolate. Quante unità del file non sono disegnate perché la posizione è da verificare, e quante sono «contenitori», è in [`CONFINI-MAPPA.md`](CONFINI-MAPPA.md) (numeri controllati dalle prove).
- **Che cosa manca.** Capoluogo e popolazione di un'unità regionale non sono nei file: la scheda scrive «da verificare» (per la popolazione vedi [`data-notes-population-1960.md`](data-notes-population-1960.md)).

Per gli Stati che i file elencano ma che la pagina non suddivide (posizioni da verificare in troppe unità), la pagina scrive nella scheda perché:

<!-- CENSIMENTO non-suddivisi INIZIO (generato da scripts/censimento-dati.js: non modificare a mano, si aggiorna con «npm run censimento») -->
| Codice | Stato | Unità nel file | di cui con posizione da verificare | Motivo scritto nella pagina |
|---|---|---|---|---|
| `SAU` | Arabia Saudita | 6 | 2 | due unità su sei (Najd, Hejaz) hanno posizione da verificare |
| `LKA` | Ceylon | 9 | 9 | tutte le nove unità hanno posizione da verificare |
| `IRN` | Iran | 10 | 4 | quattro unità su dieci hanno posizione da verificare |
| `ISR` | Israele | 6 | 3 | tre unità su sei hanno posizione da verificare |
| `LAO` | Laos | 15 | 9 | nove unità su quindici hanno posizione da verificare |
| `LBN` | Libano | 5 | 3 | tre unità su cinque hanno posizione da verificare |
| `NPL` | Nepal | 32 | 18 | diciotto unità su trentadue hanno posizione da verificare |
| `OMN` | Oman | 7 | 4 | quattro unità su sette hanno posizione da verificare |
| `VNN` | Vietnam del Nord | 25 | 8 | otto unità su venticinque hanno posizione da verificare |
| `VNS` | Vietnam del Sud | 36 | 20 | venti unità su trentasei hanno posizione da verificare |
| `YEM` | Yemen | 7 | 1 | le unità del file coprono solo il nord, mentre il contorno sulla mappa è quello dell'intero Yemen attuale |
<!-- CENSIMENTO non-suddivisi FINE -->

## 3. Valutazioni provvisorie (infrastrutture, stabilità, importanza strategica)

- **Dove.** Le ultime tre colonne di ogni riga di `REGION_UNITS` e gli ultimi numeri di ogni `mkProv`.
- **Da dove.** Valori illustrativi del prototipo: il codice li chiama «provisional illustrative ratings for the demo, not historical statistics». Per le unità regionali sono «ereditati dalla media dello Stato nella mappa precedente».
- **Livello.** provvisorio. La scheda li scrive «NN / 100 (provvisorio)» e, per le unità regionali, ripete nelle note che non sono statistiche storiche.
- **Dove si usano.** Solo per essere mostrati nella scheda: non entrano nella richiesta all'AI, nelle regole di gioco né nei salvataggi (una prova automatica controlla che nel codice compaiano solo nella scheda).

<!-- CENSIMENTO valutazioni INIZIO (generato da scripts/censimento-dati.js: non modificare a mano, si aggiorna con «npm run censimento») -->
Le valutazioni usano **58** combinazioni diverse di infrastrutture/stabilità/importanza strategica, con valori da 20 a 95 su 100. Sono uguali per tutte le province di uno Stato, tranne che in **4** Stati:

| Codice | Stato | Combinazioni (infrastrutture/stabilità/importanza) |
|---|---|---|
| `FRG` | Germania Ovest | 60/58/70 (10 province); 60/45/95 (1 provincia) |
| `GDR` | Germania Est | 50/50/68 (14 province); 55/50/90 (1 provincia) |
| `TCH` | Cecoslovacchia | 55/55/55 (8 province); 45/50/50 (3 province) |
| `YUG` | Iugoslavia | 35/50/40 (3 province); 45/55/65 (3 province); 50/55/50 (1 provincia); 55/55/45 (1 provincia) |
<!-- CENSIMENTO valutazioni FINE -->

## 4. Note scritte nella pagina

| Nome nel codice | Che cosa dice | Dove si vede | Da dove viene |
|---|---|---|---|
| `COUNTRY_NOTES` | per ogni Stato suddiviso: livello di suddivisione, voci in più, note sui file, unità non disegnate, unità «contenitore», conteggi | «Note sulla suddivisione» della scheda | testi dei file dell'autore (`europa-1960-regioni.md`) e conteggi del progetto: da verificare |
| `SINGLE_NOTES` | perché uno Stato non è suddiviso (tabella nella sezione 2) | «Note sulla suddivisione» | conteggi del progetto sui file dell'autore |
| `TERRITORY_NOTES` | che cosa comprende lo Stato (tabella qui sotto) | «Estensione dello Stato», nelle note sulla suddivisione | note della mappa precedente: da verificare |
| `UNIT_NOTES` | note su singole unità (tabella qui sotto) | riga «Unità presenti» | prototipo: da verificare |
| ultimo argomento di `mkProv` | note sulle province degli Stati senza suddivisioni (tabella qui sotto) | riga «Unità presenti» | prototipo: da verificare |

I testi di `COUNTRY_NOTES` contengono molte affermazioni storiche precise (date di riforme e di leggi, nomi di unità): vengono dai file dell'autore e **non sono stati controllati**. Le note che dicono «da verificare» lo dicono da sole; le altre non vanno prese per verificate.

<!-- CENSIMENTO note-territori INIZIO (generato da scripts/censimento-dati.js: non modificare a mano, si aggiorna con «npm run censimento») -->
**Note sull'estensione degli Stati** (`TERRITORY_NOTES`, mostrate come «Estensione dello Stato» nelle note sulla suddivisione):

| Codice | Stato | Testo | Dice «da verificare» |
|---|---|---|---|
| `CHN` | Cina | Include il Tibet; Hong Kong, Macao e Taiwan sono entità separate | no |
| `JPN` | Giappone | Le isole Ryukyu (Okinawa) erano amministrate dagli USA — da verificare nei confini | sì |
| `JOR` | Giordania | Include la Cisgiordania, annessa nel 1950 — da verificare | sì |
| `IND` | India | Include Goa (ancora portoghese nel 1960) e il Sikkim (protettorato) — da verificare | sì |
| `IDN` | Indonesia | Esclusa la Nuova Guinea Olandese (passata all'Indonesia nel 1962-63), che qui non è rappresentata | no |
| `MYS` | Malaya (Federazione della Malesia) | Solo la parte peninsulare, indipendente dal 1957 | no |
| `URSS` | Unione Sovietica | Rappresenta il territorio della Russia (RSFSR) entro i confini attuali; le altre repubbliche sovietiche sono entità separate sulla mappa — da verificare Comprende l'exclave di Kaliningrad (sovietica dal 1945). | sì |

**Note sulle singole unità** (`UNIT_NOTES`, mostrate nella riga «Unità presenti»):

| Codice | Unità | Testo | Dice «da verificare» |
|---|---|---|---|
| `FRG_11` | Berlino Ovest (Germania Ovest) | Guarnigioni alleate (USA/UK/Francia) — da verificare nel dettaglio | sì |
| `GDR_15` | Berlino Est (Germania Est) | Guarnigione sovietica — da verificare nel dettaglio | sì |

**Note scritte nelle province degli Stati senza suddivisioni** (ultimo argomento di `mkProv`, mostrate nella riga «Unità presenti»):

| Testo | Province | Quali | Dice «da verificare» |
|---|---|---|---|
| Repubblica sovietica, non uno stato sovrano nel 1960 — da verificare per usi storici precisi | 14 | Ucraina, Bielorussia, Moldavia, Estonia, Lettonia, Lituania, Georgia, Armenia, Azerbaigian, Kazakistan, Uzbekistan, Turkmenistan, Tagikistan, Kirghizistan | sì |
| Protettorato britannico nel 1960 — da verificare per usi storici precisi | 3 | Stati della Tregua (Emirati Arabi Uniti), Qatar, Bahrein | sì |
| Colonia britannica con autogoverno dal 1959 | 1 | Singapore | no |
| Colonie britanniche fino al 1963 | 1 | Borneo Britannico (Sarawak e Nord Borneo) | no |
| Confini attuali usati come approssimazione (nel 1960 le alture del Golan erano siriane) — da verificare | 1 | Israele | sì |
| Divisione dal Vietnam del Nord al 17° parallelo (approssimata) | 1 | Vietnam del Sud | no |
| Divisione dal Vietnam del Sud al 17° parallelo (approssimata) | 1 | Vietnam del Nord | no |
| Include la Crimea, passata dalla RSFSR alla RSS Ucraina nel 1954 | 1 | Ucraina | no |
| Protettorato britannico fino al 1984 | 1 | Brunei | no |
| Yemen e Yemen del Sud non sono distinti sulla mappa: un'unica provincia | 1 | Yemen | no |
<!-- CENSIMENTO note-territori FINE -->

## 5. Dati calcolati o tecnici

- **Province confinanti** (`PROV_ORDER` e `ADJ`). Calcolate dalle forme sulla mappa: due province dello stesso Stato confinano se le loro celle si toccano; fra Stati diversi se i contorni sono a meno di circa 9 unità di mappa (contano una costa o uno stretto); una provincia rimasta senza vicini (un'isola) è collegata alle due più vicine. Livello: calcolato, non è un'informazione storica. Servono alla regola dei confini: una provincia passa solo a uno Stato che già ne tiene una confinante ([`METODOLOGIA.md`](METODOLOGIA.md)).
- **Le due ali del Pakistan** (`WING_UNITS`). Le divisioni si assegnano all'ala occidentale o orientale con la posizione nell'elenco alfabetico del file (fino alla 14 ovest, dopo est): è una deduzione, da verificare ([`FONTI.md`](FONTI.md)).
- **Salvataggi vecchi** (`LEGACY`). Dice in quali province nuove si sono trasformate 59 delle 95 province della mappa precedente (quelle poi suddivise in unità regionali, più le vecchie regioni tedesche, che non hanno un corrispondente), per aprire i vecchi salvataggi; le altre province della mappa precedente che esistono ancora conservano il loro identificativo. È tecnico; l'assegnazione è un'approssimazione.

## 6. Testi e valori di gioco (non sono dati storici)

- **Premessa dello scenario fisso** (`COLD_WAR_PREMISE`). Due frasi sulla Guerra Fredda (blocchi, paesi non allineati, tensioni alte senza conflitto diretto) che la pagina dà all'AI insieme alla data «31 dicembre 1960». È un riassunto scritto dal prototipo, non una fonte: le conseguenze che l'AI racconta sono finzione.
- **Riconoscimento degli Stati citati** (`COUNTRY_ALIASES`, `GENERIC_WORDS`). Parole usate per capire quali Stati nomina un'azione. Scelta del progetto.
- **Segnaposto** (`MARKER_TYPES` e `MARKER_ALIASES`). I tipi di segnaposto sulla mappa (truppe, base, flotta…), le parole alternative che l'AI può usare per indicarli e i limiti di numero. Scelta del progetto.
- **Statistiche del pannello di gioco** (Stabilità, Economia, Esercito, Prestigio). Partono da 50 per ogni nazione e le cambia l'AI: sono valori di gioco, non misure storiche.
- **Proiezione della mappa** (`MAPPROJ`). Le costanti che legano longitudine e latitudine al disegno: tecniche.

## 7. Dati che stanno altrove

- **Contorni, etichette e forme della mappa** (`window.MAP_SVG`, nel primo script della pagina): [`CONFINI-MAPPA.md`](CONFINI-MAPPA.md) e [`ATTRIBUZIONI.md`](../ATTRIBUZIONI.md).
- **Popolazione, fonti e status**: `src/data/population_1960.json` (la pagina ne porta una copia identica): [`FONTI.md`](FONTI.md), [`STATUS-1960.md`](STATUS-1960.md) e [`data-notes-population-1960.md`](data-notes-population-1960.md).

## Dove si vede nel gioco, e se è segnato come non verificato

| Dato | Dove si vede | La pagina dice che non è verificato? |
|---|---|---|
| Nome dello Stato | ovunque | no |
| Capitale | riga «Capoluogo» della scheda (province degli Stati senza suddivisioni) | solo dove il testo dice «da verificare»; per le unità regionali la riga dice «da verificare» e le note ripetono che il capoluogo non è nei file |
| Alleanza | legenda; richiesta all'AI | non per ogni Stato (la legenda ha una voce «Alleanza da verificare» per i casi dubbi) |
| Colore | mappa | non è un dato storico |
| Tipo di unità, posizione nel file, forma sulla mappa | scheda | sì: la forma è «approssimata, non storica», e la nota sotto la mappa dice che i confini interni non sono storici |
| Valutazioni | scheda | sì: «(provvisorio)» |
| Note | scheda («Note sulla suddivisione» e «Unità presenti») | molte dicono «da verificare» (vedi le tabelle sopra) |
| Province confinanti | scheda («Confinanti») | no: è un calcolo, non un dato storico |

## Le repubbliche sovietiche

Sulla mappa le 14 repubbliche sovietiche (Ucraina, Bielorussia, Moldavia, Estonia, Lettonia, Lituania, Georgia, Armenia, Azerbaigian, Kazakistan, Uzbekistan, Turkmenistan, Tagikistan, Kirghizistan) sono **Stati separati e giocabili**, con l'alleanza «Patto di Varsavia» e una nota «Repubblica sovietica, non uno stato sovrano nel 1960 — da verificare per usi storici precisi»; «URSS» è la sola Russia (RSFSR). Non hanno un dato di popolazione proprio. Se vadano trattate come suddivisioni dell'URSS è una scelta di progetto: vedi «Verifica dei dati di partenza» in [`EDITOR-SCENARIO.md`](EDITOR-SCENARIO.md).

## Difetti noti nei testi

Non corretti qui (questo documento non cambia la pagina):

1. La nota sull'estensione dell'URSS unisce due frasi senza punto: «… entità separate sulla mappa — da verificare Comprende l'exclave di Kaliningrad…» (`TERRITORY_NOTES`).
2. La riga «Unità presenti» della scheda mostra le note storiche delle province, non unità militari: l'etichetta è fuorviante (la riga era pensata per le unità).

## Da fare, in ordine di importanza

1. **Controllare con una fonte le alleanze e le capitali** (una per Stato, con data di consultazione), cominciando dalle voci «da verificare» e dalle repubbliche sovietiche. Per poterle schedare una per una conviene portarle in un file di dati, come è stato fatto per la popolazione, invece di scriverle nel codice.
2. **Segnare nella scheda anche capitale e alleanza come non verificate**: oggi lo sono solo le valutazioni, con «(provvisorio)».
3. **Controllare le date scritte nelle note** (per esempio la Crimea nel 1954, la Cisgiordania nel 1950) e i testi di `COUNTRY_NOTES`.
4. Correggere i due difetti di testo qui sopra.
5. Decidere come trattare le repubbliche sovietiche ([`EDITOR-SCENARIO.md`](EDITOR-SCENARIO.md)).

## Come si tiene aggiornato

- Le tabelle generate si aggiornano con `npm run censimento` (`node scripts/censimento-dati.js`); `npm run censimento:controlla` controlla senza scrivere. Si lancia ogni volta che si cambiano nella pagina Stati, capitali, alleanze, unità regionali, valutazioni o note. Se ci si dimentica, `node --test` si ferma e dice come rimediare.
- La prova `tests/dati-incorporati.test.js` controlla anche che ogni tabella di dati della pagina sia nominata in questo documento, che i colori degli Stati siano tutti diversi, che ogni provincia abbia un proprietario noto e che le province confinanti siano coerenti.
- Se si aggiunge alla pagina una nuova tabella di dati, va descritta qui (sezione, da dove viene, livello) e il suo nome va aggiunto all'elenco in `tests/dati-incorporati.test.js`.
