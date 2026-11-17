# Registro delle fonti

Data di consultazione delle pagine web citate: **15 ottobre 2026** (valori di popolazione e primi status) e **25–26 ottobre 2026** (controllo degli status al 31 dicembre 1960, con le fonti elencate in [`STATUS-1960.md`](STATUS-1960.md)). Copertura: popolazione 1960 e status politici di 37 record su 77. Gli altri dati della pagina (Stati, capitali, alleanze, unità regionali, valutazioni, note) sono **elencati** in [`DATI-INCORPORATI.md`](DATI-INCORPORATI.md), ma nessuno ha una fonte: sono etichette del prototipo o testi dei file dell'autore, da verificare. Per capitali e alleanze la mancanza di una fonte è scritta nei dati (`src/data/states_1960.json`: ogni capitale e ogni alleanza è «non verificata», con la fonte `PROTOTYPE_LABEL`, cioè l'etichetta scritta dal prototipo senza una fonte) e la scheda del territorio la mostra. Per la mappa vedi [`CONFINI-MAPPA.md`](CONFINI-MAPPA.md), per i dati di terzi [`ATTRIBUZIONI.md`](../ATTRIBUZIONI.md), per le condizioni d'uso delle fonti dei numeri [`LICENZA-DATI.md`](LICENZA-DATI.md).

## Fonti dei valori di popolazione

| ID | Descrizione | Livello | Note |
|---|---|---|---|
| MADDISON | Maddison Project / Maddison Historical Statistics, come indicato nel primo CSV | da verificare | Valori non ricontrollati sulla pubblicazione originale |
| STATISTICS_AND_DATA | Serie Statistics and Data, usata per RFT e RDT | da verificare | Serie diversa da Maddison |
| UN_VIA_JETPUNK | ONU retrospettiva tramite JetPunk | da verificare | Fonte secondaria: da sostituire con ONU, *World Population Prospects* |
| FILE_B_UNSPECIFIED | Secondo CSV (`fb6262f2.csv`) | da verificare | Nessuna fonte dichiarata nel file |

## Fonti degli status politici

Gli status si leggono al **31 dicembre 1960**. Il livello «verificato» vale per **fonti secondarie** (l'elenco ONU degli Stati membri con le date di ammissione, l'Office of the Historian del Dipartimento di Stato USA, enciclopedie, Wikipedia); nessuna fonte primaria d'archivio è stata consultata.

Qui sono schedati i casi che la versione precedente di questo registro già citava. Gli altri status controllati (Oman, Bhutan, Maldive, Yemen, Singapore, Qatar, Bahrein, Emirati, Brunei, Hong Kong, Macao, Timor portoghese, Taiwan e i 17 Stati sovrani già membri dell'ONU) e tutte le fonti sono in [`STATUS-1960.md`](STATUS-1960.md); ogni record controllato elenca le proprie fonti in `status_sources`.

| Dato | Livello | Fonte consultata |
|---|---|---|
| Cipro: Stato sovrano (indipendente dal 16 agosto 1960, ONU dal 20 settembre 1960) | verificato (fonti secondarie) | [1960 in Cyprus (Wikipedia)](https://en.wikipedia.org/wiki/1960_in_Cyprus); [Cyprus Mail, cronologia 1960](https://cyprus-mail.com/divided-island/a-chronology-of-events/1960); [Office of the Historian](https://history.state.gov/countries/cyprus); [ONU, elenco degli Stati membri](https://www.un.org/sites/un2.un.org/files/un_member_states_2025.pdf) |
| Kuwait: protettorato britannico dal 1899, indipendenza il 19 giugno 1961 | verificato (fonti secondarie) | [Office of the Historian](https://history.state.gov/countries/kuwait); [Amiri Diwan](https://www.da.gov.kw/en/kuwait-history/); [ONU, elenco degli Stati membri](https://www.un.org/sites/un2.un.org/files/un_member_states_2025.pdf) |
| Malaysia: formata il 16 settembre 1963 da Malaya, Singapore, Sabah e Sarawak | verificato | [The Edge Malaysia](https://theedgemalaysia.com/article/special-report-ties-bind) |
| Malaya: Stato sovrano al 31 dicembre 1960 (indipendente dal 31 agosto 1957) | verificato (fonti secondarie) | [Federation of Malaya (Wikipedia)](https://en.wikipedia.org/wiki/Federation_of_Malaya); [ONU, elenco degli Stati membri](https://www.un.org/sites/un2.un.org/files/un_member_states_2025.pdf) |
| Siria: regione settentrionale della Repubblica Araba Unita (febbraio 1958 - 28 settembre 1961) | verificato (fonti secondarie) | [Britannica, United Arab Republic](https://www.britannica.com/print/article/615447); [Country Studies, Syria](https://countrystudies.us/syria/14.htm); [Office of the Historian](https://history.state.gov/countries/syria); [Sorby (PDF)](https://www.sav.sk/journals/uploads/092611431_Sorby.pdf), per la denominazione «Regione settentrionale» |
| Yemen del Sud: Colonia di Aden e protettorati britannici (indipendenza il 30 novembre 1967) | verificato (fonti secondarie) | [Aden Colony (Wikipedia)](https://en.wikipedia.org/wiki/Aden_Colony); [Aden Protectorate (Wikipedia)](https://en.wikipedia.org/wiki/Aden_Protectorate); [Federation of the Emirates of South Arabia (Wikipedia)](https://en.wikipedia.org/wiki/Federation_of_the_Emirates_of_South_Arabia); [ONU, elenco degli Stati membri](https://www.un.org/sites/un2.un.org/files/un_member_states_2025.pdf) |
| Pakistan: Stato sovrano (ONU dal 1947, repubblica islamica dal 23 marzo 1956) | verificato (fonti secondarie) | [Dominion of Pakistan (Wikipedia)](https://en.wikipedia.org/wiki/Dominion_of_Pakistan); [ONU, elenco degli Stati membri](https://www.un.org/sites/un2.un.org/files/un_member_states_2025.pdf) |
| Pakistan: il valore `PAK_W` copre solo l'ala occidentale | da verificare | Dedotto dall'etichetta del CSV, da confrontare con la fonte |

## Valori con perimetro incerto

| Entità | Valore | Problema | Livello |
|---|---|---|---|
| Malaysia (Federazione della Malaya) | 8.160.000 | Non è chiaro se copra la sola Malaya o i territori della Malaysia del 1963; possibile doppio conteggio con Singapore | da verificare |
| Giordania | 933.000 | Da verificare l'inclusione della Cisgiordania; possibile sovrapposizione con la riga Palestina | da verificare |
| Cipro | 573.000 / 580.000 | Due valori discordanti da due file | da verificare |

## Valori stimati o arrotondati

Vietnam del Nord (16.600.000), Vietnam del Sud (15.000.000), Yemen del Sud (1.000.000), Libano (1.900.000), Emirati della Costa dei Pirati (90.000), Maldive (90.000), Palestina (1.200.000): cifre tonde, trattate come stime.

## Capitali degli Stati

Le capitali dei 83 Stati della pagina stanno in `src/data/states_1960.json`. Fino alla versione 29 erano etichette scritte dal prototipo, senza una fonte. Nella versione 31 otto sono state controllate su fonti consultate l'11 e il 12 novembre 2026 e sono segnate «verificate»; per ognuna il file registra, in `meta.sources`, l'indirizzo delle pagine lette, la data di lettura e che cosa dicono. In due casi il controllo ha cambiato il valore (Filippine e Yemen).

«Verificata» qui vuol dire: scritta da almeno due fonti che concordano, oppure da un documento d'epoca. Le fonti sono secondarie (enciclopedie, siti istituzionali, Wikipedia) e un documento del Dipartimento di Stato americano del 1959; nessuna è d'archivio. **Alcune pagine non le ha lette chi ha scritto il file ma un assistente di ricerca**: ogni registrazione lo dice («letta da un assistente di ricerca») e le frasi che ne sono state riportate sono frammenti brevi, non riaperti uno per uno.

| Stato | Capitale nel file | Che cosa dicono le fonti | Che cosa non è stato accertato |
|---|---|---|---|
| Paesi Bassi | Amsterdam (capitale riconosciuta dal 1814; governo e parlamento all'Aia) | Wikipedia: Amsterdam è riconosciuta come capitale dal 1814; la sede del governo e del parlamento è L'Aia. NH Nieuws: per secoli la città del governo fu L'Aia; la Costituzione ha fissato per iscritto la capitale solo nel 1983 | Il testo della Costituzione in vigore nel 1960 |
| Germania Ovest | Bonn (capitale provvisoria dal 1949) | Bundestag: Bonn restò per molti anni la capitale federale provvisoria e il «segnaposto» di Berlino. berlin.de: il 10 maggio 1949 il Consiglio parlamentare indicò Bonn come capitale provvisoria | Il testo della decisione del 1949 |
| Germania Est | Berlino Est (capitale per la RDT; non riconosciuta dalle potenze occidentali) | Costituzione della RDT del 7 ottobre 1949, articolo 2: la capitale è Berlino. Wikipedia: le potenze occidentali non riconobbero Berlino Est come capitale | Il mancato riconoscimento poggia su una sola fonte secondaria |
| Filippine | Quezon City (capitale ufficiale dal 1948 al 1976; molte funzioni di governo restavano a Manila). **Era «Manila»** | Sito della Città di Quezon: la legge n. 333 del 17 luglio 1948 fece di Quezon City la capitale; il decreto n. 940 del 24 giugno 1976 restituì il ruolo a Manila. Britannica: capitale dal 1948 al 1976, ma molte funzioni di governo restarono a Manila | I testi delle leggi; dove sedessero di fatto presidente e Congresso nel 1960 |
| Laos | Vientiane (capitale amministrativa; Luang Prabang residenza reale) | Britannica: Luang Prabang restò residenza reale e centro religioso, Vientiane fu fatta capitale amministrativa. Keesing's (ottobre 1960): il governo prestò giuramento a Vientiane il 2 settembre 1960 | Nessuna pagina letta copre i combattimenti di Vientiane del dicembre 1960; non si sa quando Vientiane divenne capitale amministrativa |
| Israele | Gerusalemme (sede del governo; status contestato; ambasciate a Tel Aviv) | Documento del Dipartimento di Stato americano del 20 febbraio 1959 (FRUS 1958-1960, volume XIII, documento 65): la sede del governo israeliano si era spostata a Gerusalemme; l'ambasciata americana e quasi tutte le altre missioni restavano a Tel Aviv | La proclamazione di Gerusalemme capitale e la sede della Knesset nel 1960 non sono state lette |
| Yemen | Taiz (capitale dal 1948 al 1962; Sana'a prima e dopo). **Era «Sana'a»** | Britannica (voce «Sanaa»): sotto l'imam Ahmad la capitale fu spostata a Taiz; Sanaa tornò capitale con la rivoluzione del 1962. Wikipedia: capitale Sanaa fino al 1948, poi Taiz | Se Sana'a conservò un ruolo formale dopo il 1948; dove stessero le legazioni straniere |
| Borneo Britannico | Kuching (Sarawak); Jesselton (Borneo Settentrionale) | Wikipedia: le schede delle due colonie indicano Kuching e Jesselton come capitali. Britannica: il sito di Jesselton fu scelto nel 1946 per la nuova capitale del Borneo Settentrionale | Quando Jesselton divenne capitale. Sono due colonie distinte, che il prototipo tratta come una sola unità |

Cercate e non concluse. Restano «non verificate»; la ricerca è scritta qui perché non vada rifatta.

| Stato | Nel file | Che cosa si è trovato | Perché non basta |
|---|---|---|---|
| Bhutan | Thimphu (capitale di fatto dal 1955; ufficiale dal 1961) | Wikipedia, voce «Thimphu» (12 novembre 2026): Thimphu sostituì Punakha nel 1955 e fu dichiarata ufficialmente capitale nel 1961 | Una sola fonte secondaria, che dà anche il 1952 per la decisione: le date non coincidono. Nessuna fonte ufficiale letta. La fonte è registrata nel file (`CAPITALE_BTN`) |
| Pakistan | Rawalpindi (capitale provvisoria dal 1959 — da verificare) | Wikipedia, voce «List of capitals in Pakistan», e Britannica, voce «Islamabad» (12 novembre 2026): Karachi fu la sede del governo fino al 1959, Rawalpindi fu capitale provvisoria, Islamabad è capitale ufficiale dal 1967 | Nessuna delle due pagine dà le date di Rawalpindi |
| Repubblica di Cina (Taiwan) | Taipei | Wikipedia, voce «1949 in Taiwan» (12 novembre 2026): nel dicembre 1949 il governo si trasferì a Taipei come capitale di fatto | Una sola pagina; non è stato accertato lo status di Nanchino |
| Siria | Damasco | Wikipedia, voce «United Arab Republic» (11 novembre 2026, letta da un assistente): la capitale della RAU è Il Cairo | Nessuna pagina letta dice quale fosse la capitale della regione siriana al 31 dicembre 1960 |
| Arabia Saudita | Riyad | history.state.gov (l'ambasciata americana restò a Gedda fino al 1984) e Aramco World, 1980 (Riad è la capitale ma non ha ambasciate): pagine lette l'11 novembre 2026 da un assistente | Nessuna pagina data lo stato di capitale di Riad al 1960 |
| Oman | Mascate | countrystudies.us: dopo il 1958 il sultano Said bin Taimur risiedeva ad Al Hisn, presso Salalah. Mascate compare come capitale solo nella scheda di una copia di Wikipedia (11 novembre 2026, letta da un assistente) | Nessuna frase letta dice che Mascate fosse la capitale al 31 dicembre 1960; non è stato accertato se il sultano governasse da Salalah |
| Stati della Tregua (Emirati Arabi Uniti) | da verificare | Wikipedia (11 novembre 2026, letta da un assistente): l'agente politico britannico stava a Dubai dal 20 maggio 1953 (prima a Sharjah); il Consiglio degli Stati della Tregua era presieduto dall'agente politico; la scheda della voce indica Abu Dhabi come capitale | Nessuna pagina dice che non ci fosse una capitale comune; la scheda che indica Abu Dhabi non è confermata altrove |

Le altre 68 capitali non sono ancora state cercate: sono quelle senza un dubbio evidente (Parigi, Roma, Mosca...), ma restano «non verificate» finché non hanno una fonte registrata.

## Da fare

- Sostituire JetPunk con la fonte primaria ONU.
- Reperire la fonte del secondo CSV.
- Compilare con fonte i 32 status mancanti (record europei), controllare Cina, Coree, Vietnam, Mongolia e Palestina e confermare l'Oman su fonti primarie.
- Confrontare con la fonte il perimetro dell'ala occidentale del Pakistan (`PAK_W`).
- Controllare con una fonte, una per una, le capitali rimaste (75 su 83), le alleanze e le note degli Stati della pagina (otto capitali sono già verificate: vedi sopra): l'elenco, con il livello di ciascuno, è in [`DATI-INCORPORATI.md`](DATI-INCORPORATI.md). Per ogni capitale o alleanza controllata si registra la fonte (con la data di consultazione) in `meta.sources` di `src/data/states_1960.json`, si mette `capital_verified` o `alliance_verified` a `true` con l'identificativo della fonte, poi si lancia `npm run dati:incorpora`. La costruzione della mappa è in [`CONFINI-MAPPA.md`](CONFINI-MAPPA.md).
- Chiarire le condizioni d'uso delle fonti dei numeri (sono accertate per nessuna delle quattro): [`LICENZA-DATI.md`](LICENZA-DATI.md).
