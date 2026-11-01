# Status politici al 31 dicembre 1960

Questo documento dice **che cosa è stato controllato** sugli status politici dei dati di popolazione del 1960, **che cosa è cambiato** rispetto ai file forniti e **che cosa non è stato controllato**. I dati stanno in `src/data/population_1960.json` (campo `status_1960_12_31`) e, scritti di nuovo dentro la pagina, in `src/storia-alternativa-prototipo.html`.

## La regola

- **La data di riferimento è il 31 dicembre 1960**, cioè il giorno in cui parte lo scenario. Lo status si legge a quella data: non prima e non dopo.
- Una data successiva può comparire **fra parentesi**, come indicazione di ciò che avvenne dopo (per esempio «indipendente dal 19 giugno 1961»). Non è mai lo status.
- La scheda del territorio mostra «Status al 31 dicembre 1960». Prima mostrava «Status nel 1960» e, in alcune voci, lo status che stava nel file fornito, che a volte era riferito a un'altra data o era approssimativo.
- Il controllo è stato fatto **online il 25 e 26 ottobre 2026**, su **fonti secondarie**: l'elenco ONU degli Stati membri con le date di ammissione, le pagine dell'Office of the Historian del Dipartimento di Stato USA, un'enciclopedia (Britannica), Country Studies della Library of Congress e Wikipedia (in inglese). **Nessuna fonte primaria d'archivio** (trattati, atti ufficiali) è stata consultata: un dubbio serio va risolto su quelle.

## Che cosa è cambiato

| Entità | Il file diceva | Ora la pagina dice | Perché |
|---|---|---|---|
| Kuwait | Stato sovrano | Protettorato britannico (indipendente dal 19 giugno 1961) | Fino al 19 giugno 1961 Kuwait era un protettorato britannico; entrò all'ONU il 14 maggio 1963. |
| Siria | Stato sovrano | Regione settentrionale della Repubblica Araba Unita (febbraio 1958 - 28 settembre 1961) | Dal febbraio 1958 la Siria era unita all'Egitto nella Repubblica Araba Unita (RAU), di cui era la «Regione settentrionale»; ne uscì il 28 settembre 1961. All'ONU la RAU era un solo membro: la Siria riprese il proprio seggio il 13 ottobre 1961. |
| Yemen del Sud | Stato sovrano | Colonia di Aden e protettorati britannici (indipendenza il 30 novembre 1967) | La zona era britannica: Colonia di Aden e protettorati di Aden (dal 1959 alcuni emirati dei protettorati formavano una federazione sotto protezione britannica). Indipendenza il 30 novembre 1967; ONU (Yemen Democratico) dal 14 dicembre 1967. |
| Maldive | Sultanato indipendente | Stato protetto britannico con autogoverno interno (fino al 1965) | Dal 1887 al 26 luglio 1965 le Maldive furono uno Stato protetto britannico: il Regno Unito controllava politica estera e difesa, l'amministrazione interna restava locale. ONU dal 21 settembre 1965. Sulla mappa non c'è un'entità. |

## Che cosa è stato precisato

Qui il file non era sbagliato, ma diceva meno di quello che serve per giocare.

| Entità | Il file diceva | Ora la pagina dice | Perché |
|---|---|---|---|
| Oman | Stato sovrano | Stato sovrano (sotto forte influenza britannica) | **Le fonti non concordano.** Nel 1951 il Regno Unito riconobbe l'indipendenza del Sultanato di Muscat e Oman, ma alcune fonti lo descrivono come protettorato britannico dal 1891, e con l'aiuto militare britannico il Sultano represse le rivolte dell'Imam. Lo status resta «sovrano» in senso formale; la dicitura aggiunta dice che il legame con il Regno Unito era stretto. ONU dal 7 ottobre 1971. |
| Bhutan | Stato sovrano | Stato sovrano, con la politica estera guidata dall'India (trattato del 1949) | Con il trattato del 1949 il Bhutan accettava la guida dell'India nelle relazioni esterne. ONU dal 21 settembre 1971. |

## Che cosa è stato confermato

- **Cipro: Stato sovrano.** Cipro è indipendente dal 16 agosto 1960 ed è entrata all'ONU il 20 settembre 1960; il Regno Unito conserva le basi sovrane di Akrotiri e Dhekelia. Una revisione precedente del dataset scriveva «Colonia britannica (indipendente dal 16 agosto 1960)»: valeva per il **1 gennaio** 1960, non per il 31 dicembre. Con la data del 31 dicembre il file fornito aveva ragione.
- **Yemen (nord): Stato sovrano.** Il Regno dello Yemen era membro dell'ONU dal 1947; dal 1958 al 1961 era in confederazione con la RAU (Stati Arabi Uniti), ma restava uno Stato sovrano.
- **Pakistan: Stato sovrano, di cui le due ali fanno parte.** Il Pakistan è membro dell'ONU dal 1947 ed è una repubblica islamica dal 23 marzo 1956. Nel file dei dati l'ala occidentale è «Ala occidentale del Pakistan (Stato sovrano)» (il valore copre solo quell'ala) e l'ala orientale «Pakistan Orientale (non Stato sovrano)», cioè non uno Stato a sé.
- **Singapore: Stato autonomo britannico**; **Malaya (Malaysia): Stato sovrano**, indipendente dal 31 agosto 1957 e membro dell'ONU dal 17 settembre 1957; **Qatar, Bahrein, Emirati della Costa dei Pirati (Stati della Tregua) e Brunei: protettorati britannici**; **Hong Kong: territorio britannico**; **Macao e Timor portoghese: territori portoghesi**.
- **Taiwan (Repubblica di Cina): «Stato de facto»**, come nel file. Nel 1960 la Repubblica di Cina occupava all'ONU il seggio della Cina (fino al 25 ottobre 1971) e controllava soltanto Taiwan e alcune isole minori.
- **Stati sovrani e membri dell'ONU prima del 31 dicembre 1960** (la data di ammissione conferma che erano Stati indipendenti): India (30 ottobre 1945), Indonesia (28 settembre 1950), Giappone (18 dicembre 1956), Filippine (24 ottobre 1945), Thailandia (16 dicembre 1946), Iran (24 ottobre 1945), Birmania (19 aprile 1948), Iraq (21 dicembre 1945), Afghanistan (19 novembre 1946), Arabia Saudita (24 ottobre 1945), Giordania (14 dicembre 1955), Israele (11 maggio 1949), Libano (24 ottobre 1945), Nepal (14 dicembre 1955), Sri Lanka o Ceylon (14 dicembre 1955), Cambogia (14 dicembre 1955), Laos (14 dicembre 1955).

## Che cosa NON è stato controllato

- **Senza una fonte specifica**: Cina (la Repubblica Popolare non era all'ONU: il seggio era della Repubblica di Cina), Corea del Nord e del Sud, Vietnam del Nord e del Sud, Mongolia (entrò all'ONU il 27 ottobre 1961, quindi il 31 dicembre 1960 non era ancora membro), Palestina («Territori non sovrani», Gaza e Cisgiordania). Il file dice «Stato sovrano» per quasi tutti e nessuna fonte letta lo smentisce, ma nessuna l'ha confermato: per questi casi `status_sources` è vuoto.
- **Turchia**: «Stato transcontinentale» è una definizione geografica, non uno status politico. Non è stata toccata.
- **32 record senza status** (Europa e microstati, dal primo file): il file non forniva alcuno status e non ne è stato inventato uno. Restano `null` nei dati e la scheda non mostra nessuno status. Per compilarli serve una fonte per ciascuno: alcuni casi (per esempio la Germania Ovest e la Germania Est) meritano una scheda a parte.
- **Capitali e «alleanza»** della pagina sono etichette semplificate del prototipo, non dati verificati (vedi il commento «NOTE on data quality» nella pagina). Cambia una sola: l'alleanza del Kuwait, che prima era «da verificare», ora segue il suo status («Protettorato britannico», nella famiglia di colori «Colonie e protettorati»). Cipro e Oman restano «da verificare».

## Altre differenze note

- Nella pagina l'ala occidentale del Pakistan si chiama «Pakistan» e l'ala orientale «Bangladesh», come nel secondo file; nel file dei dati si chiamano «Pakistan occidentale» e «Pakistan orientale (futuro Bangladesh)». Gli status coincidono (la prova automatica confronta «Ala occidentale del Pakistan (…)» con quello della pagina). I nomi non sono stati unificati: non è un controllo di status.
- **Documenti allineati.** `README.md`, `docs/FONTI.md` e `docs/METODOLOGIA.md` dicevano «1 gennaio 1960» e che un'indipendenza avvenuta dopo quella data «non vale». Dopo l'unione della pull request #9, che li aveva riscritti, sono stati allineati al 31 dicembre 1960 (30 ottobre 2026); il campo dello status è `status_1960_12_31`. La variante `src/storia-alternativa-prototipo-map-overlay.html` e la cartella `archive/` conservano invece la data e gli status vecchi: sono copie di riferimento e non sono state toccate.

## Fonti

- ONU, elenco degli Stati membri con la data di ammissione: https://www.un.org/sites/un2.un.org/files/un_member_states_2025.pdf
- US Department of State, Office of the Historian: https://history.state.gov/countries/cyprus , https://history.state.gov/countries/kuwait , https://history.state.gov/countries/syria , https://history.state.gov/countries/yemen , https://history.state.gov/countries/oman , https://history.state.gov/countries/brunei
- Encyclopaedia Britannica, United Arab Republic: https://www.britannica.com/print/article/615447
- Country Studies (Library of Congress), Syria: https://countrystudies.us/syria/14.htm
- Sorby, articolo in PDF (per la denominazione «Regione settentrionale»): https://www.sav.sk/journals/uploads/092611431_Sorby.pdf
- Wikipedia (inglese): https://en.wikipedia.org/wiki/Cyprus , https://en.wikipedia.org/wiki/Aden_Colony , https://en.wikipedia.org/wiki/Aden_Protectorate , https://en.wikipedia.org/wiki/Federation_of_the_Emirates_of_South_Arabia , https://en.wikipedia.org/wiki/Muscat_and_Oman , https://en.wikipedia.org/wiki/Said_bin_Taimur , https://en.wikipedia.org/wiki/Kingdom_of_Yemen , https://en.wikipedia.org/wiki/United_Arab_States , https://en.wikipedia.org/wiki/Persian_Gulf_Residency , https://en.wikipedia.org/wiki/Trucial_States , https://en.wikipedia.org/wiki/Bhutan%E2%80%93India_relations , https://en.wikipedia.org/wiki/State_of_Singapore , https://en.wikipedia.org/wiki/Independence_of_the_Maldives , https://en.wikipedia.org/wiki/Dominion_of_Pakistan , https://en.wikipedia.org/wiki/Federation_of_Malaya , https://en.wikipedia.org/wiki/British_Hong_Kong , https://en.wikipedia.org/wiki/Portuguese_Macau , https://en.wikipedia.org/wiki/Portuguese_Timor , https://en.wikipedia.org/wiki/Taiwan_and_the_United_Nations

Ogni record controllato elenca le proprie fonti in `status_sources`; le descrizioni complete stanno in `meta.status_sources` del file dei dati.

## Come si tengono allineati i dati

- `tests/population-pagina.test.js` confronta, riga per riga, status e popolazioni scritti nella pagina con quelli del file dei dati, controlla che ogni fonte citata sia descritta e che questo documento riporti ogni status rivisto e ogni collegamento alle fonti.
- Se si cambia uno status, va cambiato in **tre** posti: `src/data/population_1960.json`, l'elenco `POPULATION_1960_B` della pagina e questo documento. La prova si ferma se uno dei tre resta indietro.
