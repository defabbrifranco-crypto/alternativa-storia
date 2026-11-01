# Registro delle fonti

Data di consultazione delle pagine web citate: **15 ottobre 2026** (valori di popolazione e primi status) e **25–26 ottobre 2026** (controllo degli status al 31 dicembre 1960, con le fonti elencate in [`STATUS-1960.md`](STATUS-1960.md)). Copertura: popolazione 1960 e status politici di 37 record su 77. Il resto dei dati del prototipo non è ancora schedato (per la mappa vedi [`CONFINI-MAPPA.md`](CONFINI-MAPPA.md), per i dati di terzi [`ATTRIBUZIONI.md`](../ATTRIBUZIONI.md)).

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

## Da fare

- Sostituire JetPunk con la fonte primaria ONU.
- Reperire la fonte del secondo CSV.
- Compilare con fonte i 32 status mancanti (record europei), controllare Cina, Coree, Vietnam, Mongolia e Palestina e confermare l'Oman su fonti primarie.
- Confrontare con la fonte il perimetro dell'ala occidentale del Pakistan (`PAK_W`).
- Schedare i dati territoriali della pagina diversi dalla popolazione (la costruzione della mappa è in [`CONFINI-MAPPA.md`](CONFINI-MAPPA.md)).
