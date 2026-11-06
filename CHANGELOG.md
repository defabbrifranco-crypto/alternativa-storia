# Registro delle modifiche

Qui sono annotate le modifiche rilevanti del progetto, dalla più recente alla più vecchia. Il formato segue [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Il numero di versione è quello di `package.json`: la pagina mostra «Versione N» per la versione 0.N.0.

Le date sono quelle di consegna dei pacchetti di modifiche. Prima della versione 23 il progetto non aveva un registro: le versioni fino alla 22 non sono documentate in questo repository (`archive/` conserva una versione precedente; `src/storia-alternativa-prototipo-map-overlay.html` è il file di partenza della mappa a sovrapposizione). Il numero 0.23.0 è stato assegnato a posteriori: allora non c'era ancora `package.json`.

## [Non rilasciato]

Solo documenti, strumenti e prove: la pagina non cambia (resta la versione 29) e nessun dato viene modificato. Lavoro sulle issue [#3](../../issues/3) (fonti e stato di verifica dei dati) e [#2](../../issues/2) (dati di partenza). Non le chiude. Il 3 novembre 2026 l'autore ha deciso due cose: le repubbliche sovietiche restano Stati separati e giocabili (opzione A) e i dati non hanno una licenza separata, resta la sola MIT (opzione A).

### Aggiunto
- **`docs/DATI-INCORPORATI.md`**: inventario di tutti i dati che la pagina porta con sé oltre alla popolazione (Stati, capitali, alleanze, colori, unità regionali, valutazioni provvisorie, note, province confinanti, vecchi identificativi, testi e valori di gioco). Per ognuno dice dove sta nel codice, quanti sono, da dove viene, che livello ha (nessuno è verificato) e dove si vede nel gioco; poi i difetti noti e le cose da fare. Le tabelle (contatori, alleanze, Stati, Stati non suddivisi, valutazioni, note) sono **generate** dalla pagina.
- **`scripts/censimento-dati.js`** (`npm run censimento`; `npm run censimento:controlla` controlla senza scrivere): legge la pagina senza eseguirla e riscrive le tabelle generate del documento fra i marcatori `CENSIMENTO … INIZIO/FINE`. Si ferma, senza toccare il documento, se un marcatore manca, è doppio o è sconosciuto, o se la pagina non ha più una tabella che legge.
- **`tests/dati-incorporati.test.js`** (10 prove, con `node --test`): le tabelle del documento coincidono con la pagina; lo strumento aggiorna un documento rimasto indietro e si ferma davanti ai guasti; ogni tabella di dati della pagina è nominata nel documento e il documento non nomina codici che non esistono più; i dati sono coerenti fra loro (campi, colori tutti diversi, proprietari esistenti, valutazioni da 0 a 100, note e conteggi, province confinanti reciproche, vecchi identificativi); le valutazioni provvisorie compaiono solo nella scheda; l'indice dei documenti elenca ogni documento di `docs/` e i documenti nuovi sono collegati. Provata con 27 difetti messi apposta nella pagina e nei documenti: tutti notati.
- **`docs/LICENZA-DATI.md`**: valutazione se serva una licenza separata per i dati, con la decisione dell'autore (non è un parere legale). Dice che cosa copre oggi la MIT, che cosa si sa delle fonti dei numeri (pagine lette il 2 novembre 2026: Maddison Project Database 2023, ONU, Creative Commons), che cosa non si sa, quattro opzioni (A restare con la sola MIT, B CC BY 4.0 per i testi e le annotazioni originali, C CC0, D rimandare finché le fonti non sono chiare), le tre risposte che servirebbero per riaprire la questione e la **decisione dell'autore del 3 novembre 2026: A, restare con la sola MIT** (nessun file di licenza cambia).
- **«Verifica dei dati di partenza»** in `docs/EDITOR-SCENARIO.md`: l'ultimo punto della #2. Siria/RAU e Cipro sono coerenti; le repubbliche sovietiche sono Stati separati e non suddivisioni dell'URSS, e la cifra di popolazione dell'URSS è quella dell'intera Unione mentre il territorio sulla mappa è la sola RSFSR. Due opzioni (A lasciare com'è; B farne suddivisioni dell'URSS) e la **decisione dell'autore del 3 novembre 2026: A, lasciare com'è**.

### Modificato
- `README.md`, `docs/README.md`, `docs/FONTI.md`, `docs/METODOLOGIA.md` e `ATTRIBUZIONI.md` rinviano ai documenti nuovi. Le frasi «non ancora censiti» e «non ancora schedati» diventano «elencati, ma non verificati»; la frase di `ATTRIBUZIONI.md` «le condizioni d'uso non sono state verificate» dice ora che cosa si è letto e che cosa no. Il README spiega quando lanciare `npm run censimento`.
- `docs/STATUS-1960.md`: i nomi delle due ali del Pakistan dopo la versione 29 (la pagina legge i nomi dal file dei dati: «Pakistan occidentale» e «Pakistan orientale (futuro Bangladesh)»).
- `package.json`: due comandi nuovi; la versione non cambia (0.29.0).
- Le due decisioni dell'autore del 3 novembre 2026 sono registrate in `docs/LICENZA-DATI.md`, `docs/EDITOR-SCENARIO.md`, `docs/DATI-INCORPORATI.md`, `docs/README.md`, `README.md` («Limiti», «Guide e documenti», «Sviluppo», «Licenza») e `ATTRIBUZIONI.md`. Nessuna modifica a codice, dati o licenze.
- `src/README.md` dice in che cosa le due copie di riferimento (la versione 23 e la `map-overlay`) e il file di `archive/` sono diversi dalla pagina attuale: data dello scenario, territori, repubbliche sovietiche, Siria e Cipro, dati di popolazione, status, turno, segnaposto (controllato sui file il 6 novembre 2026). `README.md`, `archive/README.md` e `docs/DATI-INCORPORATI.md` rinviano a quella sezione. **Le copie non sono state aggiornate** (era un'idea facoltativa rimasta dopo la pull request #13): la `map-overlay` parte dal 1 gennaio 1960 e tratta in altro modo repubbliche sovietiche, Siria e Cipro, quindi farle leggere i dati attuali, con gli status al 31 dicembre 1960, mescolerebbe due date. Il motivo è scritto nel documento.

### Non cambia
- La pagina, i dati di popolazione e di territorio, i salvataggi e le prove nel browser. `LICENSE` e `CITATION.cff`: per i dati si resta con la sola MIT (decisione dell'autore), quindi nessun file di licenza cambia.

### Da sapere
- **Difetti trovati e non corretti** (qui la pagina non cambia): la nota sull'estensione dell'URSS unisce due frasi senza punto («… da verificare Comprende l'exclave di Kaliningrad…»); la riga «Unità presenti» della scheda mostra le note storiche delle province, non unità militari, quindi l'etichetta è fuorviante. Sono elencati in `docs/DATI-INCORPORATI.md` («Difetti noti nei testi»).
- **Capitali e alleanze** sono scritte dal prototipo e non hanno una fonte; la scheda non le segna come non verificate (solo le valutazioni portano «(provvisorio)»). Portarle in un file di dati, come la popolazione, permetterebbe di schedarle una per una: proposta in `docs/DATI-INCORPORATI.md`, non fatta.
- I fatti sulle licenze (Maddison, ONU, Creative Commons) sono stati letti online il 2 novembre 2026 e non sono un parere legale. La licenza dei file di dati scaricabili dell'ONU non si è potuta confermare sulle pagine dell'ONU.
- Le copie di riferimento `src/storia-alternativa-prototipo-map-overlay.html` e `src/storia-alternativa-prototipo-v23.html` non sono incluse nell'inventario: non sono la pagina attuale (che cosa le distingue è in `src/README.md`).

## [0.29.0] - 2026-11-01

La pagina legge i dati di popolazione dal file `src/data/population_1960.json` e la scheda del territorio mostra fonte, verifica, status, perimetro e avvertenze ([#8](../../issues/8)). Comprende anche le modifiche della pull request #11, già unita: documenti allineati e prove automatiche su Ubuntu 24.04.

### Aggiunto
- **`scripts/incorpora-popolazione.js`** (`npm run dati:incorpora`): mette nella pagina una copia **identica** del file dei dati, in un blocco `<script type="application/json" id="population-1960-data">` fra i marcatori `DATI-POPOLAZIONE-INIZIO` e `DATI-POPOLAZIONE-FINE`. La pagina deve funzionare anche aperta da sola, quindi non scarica il file: ne porta una copia. `npm run dati:controlla` (`--check`) controlla senza scrivere. Rifiuta un file dei dati che non è JSON o che contiene «</script» o «<!--».
- **Scheda del territorio, più completa.** Per ogni cifra mostra: la **fonte** (il nome dal registro `meta.sources`, mai «undefined»: un codice non registrato si legge com'è), la **verifica** (`verified`: oggi «non ricontrollato sulla fonte primaria» ovunque), lo **status al 31 dicembre 1960** (con «controllato online su fonti secondarie il 26 ottobre 2026», oppure «come nel file fornito, non ricontrollato», oppure «da verificare» dove il file non ha status), il **perimetro**, le **avvertenze** (i flag, in frasi), l'**altro valore** (`alternative_values`: per Cipro 580.000 con la sua fonte) e la **nota**; in fondo l'**avvertenza generale** (`meta.global_warning`). Le fonti degli status sono collegamenti, chiusi in un elenco a scomparsa («Fonti dello status»): si aprono, in un'altra scheda del browser, solo se li tocchi.
- Se la pagina non riesce a leggere i dati (blocco assente, rotto o senza `records`), si apre lo stesso: la scheda scrive «I dati di popolazione non sono stati letti (…)», non mostra valori e l'errore va nella console.
- `tests/browser/t16_popolazione.js` (69 controlli): la copia nella pagina è quella del file; **ognuna delle 1020 schede** mostra il valore del file (proprio, dello Stato, dell'ala del Pakistan o i due dello Yemen, mai sommati né divisi); nessuna scheda mostra «undefined»; fonte, verifica, status, perimetro, avvertenze e altro valore su casi scelti; collegamenti sicuri, grandi almeno 24 × 24 px e con contrasto sufficiente nei due temi; guasti messi apposta. Provata con 21 difetti inseriti nella pagina: tutti notati.
- `tests/population-pagina.test.js` riscritta (13 prove): la copia nella pagina è identica al file; lo strumento di incorporazione funziona anche quando la copia è sbagliata; nel codice non resta nessun valore di popolazione scritto a mano; ogni flag del file ha una frase; i testi del file hanno gli accenti. Provata con 10 difetti inseriti: tutti notati.
- `tests/browser/harness.js`: opzione `transform` per aprire la pagina con un guasto messo apposta, e nel gancio di prova i dati di popolazione.

### Modificato
- **La pagina non ha più i due elenchi scritti a mano** (`POPULATION_1960` e `POPULATION_1960_B`) né le loro ripetizioni nel codice: ogni scheda è riempita dai record del file. I numeri mostrati **non cambiano**: aprendo la scheda di tutte le 1020 province con la pagina di prima e con quella nuova, il valore proprio, la riga «Popolazione dello Stato / dell'ala», le sue etichette, gli status e le fonti coincidono; cambiano solo tre diciture (Yemen: lo status è passato dalla riga alle note; ala occidentale del Pakistan: da «Pakistan (Stato sovrano)» a «Pakistan occidentale», ala orientale: da «Bangladesh (Pakistan Orientale (non Stato sovrano))» a «Pakistan orientale (futuro Bangladesh)»: sono i nomi corretti del file dei dati).
- **Testi del file dei dati con gli accenti**: 17 testi li avevano persi («il valore e riferito», «entita», «Citta del Vaticano», «a se», «ne usci»…). Cambiano solo gli accenti: nessun numero, identificativo, status, fonte o flag (verificato con uno script: tolti gli accenti dal testo nuovo si ottiene esattamente il vecchio).
- Pagina: versione 29. Le prove `t2_panel.js` (nuove diciture) e `t12_providers.js` (il controllo «nessuno script eseguito» ora distingue i due script della pagina dal blocco dei dati, che non è codice) sono adattate.
- `README.md`, `docs/METODOLOGIA.md` e `docs/FONTI.md`, riscritti dalla pull request #9 con la data del 1 gennaio 1960, sono allineati allo stato attuale: scenario al 31 dicembre 1960, status controllati online (con rinvio a `docs/STATUS-1960.md`), limiti aggiornati (la pagina funziona anche fuori da Claude, ci sono prove automatiche, l'accessibilità e l'Editor scenario sono fatti), sezioni «Licenza» e «Come citare», rinvii a tutte le guide. `docs/README.md` diventa l'indice dei documenti. `docs/STATUS-1960.md`, `docs/data-notes-population-1960.md`, `tests/browser/README.md` e `src/README.md` descrivono la lettura dei dati dal file e dicono che per uno status basta cambiarlo in due posti (file dei dati e documento) e lanciare `npm run dati:incorpora`.
- Il workflow «Prove automatiche» gira su Ubuntu 24.04 (`runs-on: ubuntu-24.04`) invece che su `ubuntu-latest`: il 30 ottobre 2026 il passo che installa il browser di prova è fallito subito, prima di ogni prova, mentre `ubuntu-latest` stava passando a Ubuntu 26 (dal 19 ottobre 2026). Da rivedere quando si aggiorna Playwright.

### Non cambia
- Numeri, identificativi, fonti, status, flag e note del file dei dati (a parte gli accenti). Nessun valore è stato ricontrollato (`verified: false` ovunque).
- `src/storia-alternativa-prototipo-map-overlay.html` (copia di riferimento) conserva i vecchi elenchi di popolazione e `regionalPopulationProvinces`: non è la pagina attuale e nessuno la carica.
- Salvataggi: `schemaVersion` resta 3; i dati di popolazione non finiscono nei salvataggi.

### Da sapere
- **Dopo ogni modifica al file dei dati va lanciato `npm run dati:incorpora`**: altrimenti la pagina resta con la copia vecchia e `node --test` si ferma.
- Le 14 repubbliche sovietiche (Stati separati sulla mappa) non hanno un dato proprio: la scheda lo dice e rinvia al dato dell'intera URSS.
- I collegamenti alle fonti degli status portano a siti esterni (ONU, Dipartimento di Stato USA, Wikipedia…): non è stato riaperto oggi ogni indirizzo per vedere che risponda.

## [0.28.0] - 2026-10-29

Il turno diviso in due comandi, «Invia» (le azioni) e «Avanza» (il tempo), e le altre nazioni che agiscono a ogni «Avanza». Richiesta dell'utente; guida in `docs/TURNO-E-AZIONI.md`.

### Aggiunto
- **Casella delle azioni con «Invia».** Nella casella «Cosa fai?» si scrivono una o più azioni, una per riga; «Invia» le mette in un elenco **Azioni in attesa** senza far passare il tempo e senza interpellare il motore. Si possono togliere con «Rimuovi». Al massimo 12 azioni in attesa e 400 caratteri ciascuna: se il limite verrebbe superato nessuna delle righe inviate entra, il testo resta nella casella e un messaggio spiega perché. Ctrl+Invio (Cmd+Invio sul Mac) fa come «Invia»; Invio da solo va a capo. I testi sono mostrati come testo, mai come codice.
- **«Avanza»**, accanto al salto temporale (1 settimana, 1 mese, 6 mesi, 1 anno): manda al motore le azioni in attesa (numerate, nell'ordine in cui sono state scritte) e fa passare il tempo. Si può premere anche con l'elenco vuoto: il mondo va avanti lo stesso. Se nella casella c'è del testo scritto e **non inviato**, «Avanza» non parte e dice di premere «Invia» (o di cancellare), perché quel testo andrebbe perso.
- **Le altre nazioni agiscono.** La richiesta al motore dice che nello stesso periodo anche le altre nazioni agiscono liberamente, di propria iniziativa, e chiede di far agire da 3 a 6 nazioni diverse, non solo le superpotenze, riportandone le mosse nel nuovo campo `mosse_altre_nazioni` della risposta. Nello scenario con la mappa la richiesta cita anche **tre nazioni in evidenza**, scelte a rotazione dal numero del turno, senza caso (stessa partita, stessi nomi allo stesso turno); sono escluse la nazione del giocatore, le colonie e le nazioni senza province. Nella cronaca compare il blocco **🌍 Le altre nazioni** (fino a 10 mosse, una frase ciascuna, ripulite e mostrate come testo). I cambi di territorio che ne derivano passano dalle stesse regole di sempre.
- Nel salvataggio, nella sezione `game`: la coda delle azioni (`pending`) e il numero dei turni fatti (`turn`), e le voci «altre nazioni» della cronaca. `schemaVersion` resta 3: i salvataggi di prima si caricano, con la coda vuota. Quello che si importa è controllato come il resto (azioni ripulite e accorciate, al massimo 12; contatore intero tra 0 e 1 000 000; righe vuote e blocchi rimasti vuoti scartati).
- Accessibilità dei comandi nuovi: la casella è descritta dalla nota che spiega «Invia» e «Avanza»; l'elenco è ordinato e ha un nome; ogni «Rimuovi» dice quale azione toglie; annunci («Azione aggiunta. In attesa: 1.», «Azione rimossa…», i rifiuti, il blocco di «Avanza»); dopo «Invia» il cursore resta nella casella, dopo «Rimuovi» passa al pulsante seguente o alla casella, dopo la risposta torna su «Avanza».
- `docs/TURNO-E-AZIONI.md`: come funziona il turno, le regole della coda, le altre nazioni (cosa si chiede, cosa si vede, il limite sui territori non elencati al motore), gli errori, il salvataggio, che cosa è stato provato e che cosa no.
- `tests/browser/t15_turni.js` (181 controlli): coda, blocchi, richiesta al motore, rotazione delle nazioni in evidenza, risposta con le mosse (anche dati strani), errori e annullamenti, risposte tardive, fine partita, salvataggio e caricamento (anche di salvataggi vecchi e ostili), modalità manuale, telefono in tema chiaro e scuro. Provata con 55 difetti inseriti apposta nella pagina: tutti notati, tranne due modifiche che non cambiavano il comportamento.

### Modificato
- **Il pulsante «Agisci e avanza» non c'è più**: è sostituito da «Invia» e «Avanza». Il testo per l'AI cambia di conseguenza: «Il tempo avanza di …», gli ordini numerati (o «il giocatore non dà ordini nuovi»), la richiesta alle altre nazioni e lo schema della risposta con `mosse_altre_nazioni`; la narrazione passa da 2-4 a 3-5 frasi e deve comprendere sia gli ordini del giocatore sia le mosse delle altre nazioni.
- **Errori e annullamenti non fanno perdere le azioni.** Se il motore sbaglia, la rete manca, la risposta non è un oggetto (una lista, un testo, un valore nullo) o la richiesta è annullata, il turno non viene contato, nulla entra nella storia e le azioni restano in attesa («Le tue azioni restano in attesa.»): si riprova premendo di nuovo «Avanza». Prima il testo scritto andava perso. Il messaggio d'errore riceve il punto finale se non l'ha già.
- Una risposta del motore che arriva dopo che la partita è stata sostituita (con «Nuova partita» o caricando un salvataggio) non tocca la partita nuova: né la coda, né il contatore, né la cronaca.
- Il Consigliere sa quali azioni sono già in attesa e non le ripete. La modalità manuale mostra la finestra a ogni «Avanza» (e non a «Invia»).
- Prove già esistenti (`t3_game.js`, `t4_save.js`, `t10_markers.js`–`t14_a11y.js`) adattate al nuovo flusso: l'aiuto `playTurn` di `harness.js` scrive nella casella, preme «Invia» e poi «Avanza». `t14_a11y.js` misura contrasto, dimensione e nomi anche sui comandi nuovi, con azioni in attesa, avviso e blocco delle altre nazioni sullo schermo (147 controlli). Con `t15_turni.js` le prove del browser sono 920.
- `docs/USO-FUORI-DA-CLAUDE.md` (modalità manuale) e `docs/ACCESSIBILITA.md` aggiornati.

### Non cambia
- Le copie di riferimento `src/storia-alternativa-prototipo-map-overlay.html`, `src/storia-alternativa-prototipo-v23.html` e `archive/` conservano il vecchio pulsante «Agisci e avanza»: non sono la pagina attuale.
- Dati, mappa, status e popolazioni: nessuna modifica.

### Da sapere
- **Nessun turno è stato provato con il modello vero dentro Claude**: nelle prove le risposte sono simulate. Quanto il modello rispetti «da 3 a 6 nazioni» o il formato di `mosse_altre_nazioni`, la plausibilità delle mosse e la lunghezza dell'attesa con una risposta più ricca vanno visti giocando; la pagina tollera risposte diverse (nessun blocco, frasi semplici, dati strani ignorati).
- Le mosse delle altre nazioni arrivano sulla **mappa** solo per le province che il motore conosce (quelle del giocatore, i confini e gli Stati nominati nelle azioni o nel riepilogo del mondo); per le altre restano racconto, e dal turno dopo gli Stati nominati nel riepilogo risultano elencati. Le tre nazioni in evidenza sono un invito, non un obbligo.

## [0.27.0] - 2026-10-26

Data di riferimento e status politici al 31 dicembre 1960, controllati online ([#8](../../issues/8)); pulizia del progetto ([#6](../../issues/6)).

### Aggiunto
- `docs/STATUS-1960.md`: che cosa è stato controllato online sugli status politici al 31 dicembre 1960 (il 25 e 26 ottobre 2026, su fonti secondarie), che cosa è cambiato, che cosa non è stato controllato e le fonti.
- `tests/population-pagina.test.js`: confronta riga per riga status e popolazioni scritti nella pagina con quelli di `src/data/population_1960.json` e controlla che le fonti degli status e `docs/STATUS-1960.md` siano coerenti con i dati. Provato con nove difetti inseriti apposta ([#8](../../issues/8)).
- Nel file dei dati: `status_sources` in ogni record controllato e, in `meta`, `status_policy`, `status_check` e `status_sources` (descrizione delle fonti); lo schema è aggiornato.
- `LICENSE` (licenza MIT, titolare: il nome utente GitHub dell'autore) e `ATTRIBUZIONI.md`, che spiega cosa la licenza copre e cosa no (i dati di terzi) e da dove vengono i dati: i contorni degli Stati derivano da un file con gli attributi di Natural Earth (pubblico dominio), le regioni sono celle approssimate calcolate dai punti di un file dell'autore, mentre le fonti dei dati di popolazione e di parte degli elenchi di unità restano da verificare ([#6](../../issues/6)).
- `docs/CONFINI-MAPPA.md`: come è costruita la mappa (file di partenza, passi, linee tracciate a mano, unità non disegnate) e cosa non va letto come storico ([#3](../../issues/3)).
- Questo registro (`CHANGELOG.md`) e una **bozza** di `CITATION.cff` (autore: il nome utente GitHub; mancano versione e data di rilascio) ([#6](../../issues/6)).
- `tests/lint.test.js`: controllo di sintassi e di coerenza, senza dipendenze esterne. Verifica la sintassi dei file `.js` e degli script dentro le pagine, che i file `.json` si leggano, che il codice rimosso non ricompaia, che `package.json`, questo registro e la pagina dichiarino la stessa versione, che i collegamenti relativi dei documenti portino a file esistenti (e che quelli verso issue e pull request stiano solo nei file della radice, dove funzionano), che i numeri sulle unità in `docs/CONFINI-MAPPA.md` coincidano con le note della pagina e che `CITATION.cff` abbia le chiavi obbligatorie. Parte con `node --test`, quindi a ogni push; `npm run lint` lo lancia da solo. Non è ESLint e non giudica lo stile ([#6](../../issues/6)).

### Modificato
- **Data di riferimento degli status: 31 dicembre 1960** (prima: 1 gennaio 1960 nei documenti e nel dataset). Il campo `status_1960_01_01` si chiama ora `status_1960_12_31` e `meta.reference_date` è `1960-12-31`.
- **Status corretti**, dopo il controllo online (`docs/STATUS-1960.md`): Kuwait «Protettorato britannico (indipendente dal 19 giugno 1961)»; Siria «Regione settentrionale della Repubblica Araba Unita (febbraio 1958 - 28 settembre 1961)»; Yemen del Sud «Colonia di Aden e protettorati britannici (indipendenza il 30 novembre 1967)»; Maldive «Stato protetto britannico con autogoverno interno (fino al 1965)». **Precisati**: Oman «Stato sovrano (sotto forte influenza britannica)» (le fonti non concordano) e Bhutan «Stato sovrano, con la politica estera guidata dall'India (trattato del 1949)». **Confermato**: Cipro «Stato sovrano» (indipendente dal 16 agosto 1960); la revisione precedente del dataset, «Colonia britannica», valeva per il 1 gennaio 1960.
- Pagina (versione 27): la scheda del territorio mostra «Status al 31 dicembre 1960» (prima «Status nel 1960») e, per i casi qui sopra, lo status corretto invece di «Stato sovrano», che era quello del file fornito. L'alleanza del Kuwait, prima «da verificare», ora è «Protettorato britannico», con il colore della famiglia «Colonie e protettorati»; Cipro e Oman restano «da verificare». I testi per l'AI non cambiano, tranne l'alleanza del Kuwait.
- `docs/data-notes-population-1960.md` riscritto: nuova data, tabella delle revisioni, voci aperte. Prove nel browser (`t1_basic.js`, `t2_panel.js`, `t3_game.js`) e il loro `README.md` aggiornati: la vecchia regola «vale lo status della scheda dati, senza note storiche» è sostituita dagli status verificati.
- Variante `src/storia-alternativa-prototipo-map-overlay.html` ([#6](../../issues/6)): tolta la funzione `legacyTerritoryRules`, definita e mai chiamata (usava il vecchio campo `cambi_territoriali`); riscritti due commenti che dicevano il contrario di ciò che fa il codice, cioè la nota sulla qualità dei dati e il commento del pulsante «Trasferisci controllo», che cambia solo il controllo e non il proprietario. Il comportamento della pagina non cambia.

## [0.26.0] - 2026-10-22

Accessibilità della mappa e della pagina ([#4](../../issues/4)).

### Aggiunto
- Struttura della pagina: `<main>`, sezioni con nome, titoli in ordine, collegamento «Vai al contenuto principale» (è il primo Tab) e area degli annunci per i lettori di schermo.
- Mappa da tastiera: tutti i territori sono un solo punto di sosta; le frecce passano al territorio vicino nella direzione scelta, Invio o Spazio aprono la scheda, `+`, `-` e `0` cambiano lo zoom; il cerchio di focus compare solo per chi usa la tastiera. Ogni territorio ha un nome accessibile (proprietario ed eventuale occupante).
- «Elenco dei territori per Stato» e «Come usare la mappa da tastiera» sotto la mappa; la ricerca è una *combobox*; schede (tab) e registri (log) con i ruoli corretti; annunci e focus a ogni cambio di schermata.
- `docs/ACCESSIBILITA.md`: come si usa la pagina da tastiera e con un lettore di schermo, cosa è stato provato e cosa no, procedura di prova di dieci minuti.
- `tests/browser/t14_a11y.js` e quattro controlli rapidi in `tests/pagina.test.js`.

### Modificato
- Colori: contrasto AA del testo in entrambi i temi (nel tema scuro il testo dei pulsanti arancioni è ora scuro: prima era bianco, con contrasto 3,1 su 1); bordi dei campi più visibili; segnaposto dei campi leggibili.
- Rispetto di `prefers-reduced-motion` e dell'alto contrasto di Windows; comandi di almeno 24 × 24 px; a 320 px di larghezza la pagina non scorre di lato; il titolo «Partita in corso» è visibile solo ai lettori di schermo.

### Da sapere
- Non provata con un lettore di schermo vero (NVDA, VoiceOver, TalkBack) né con axe: l'issue #4 resta aperta.
- I segnaposto sono ancora un punto di sosta ciascuno; i colori delle regioni della mappa non sono stati misurati contro il contrasto 3 su 1 degli elementi grafici.

## [0.25.0] - 2026-10-20

Editor scenario separato dal gioco ([#2](../../issues/2)).

### Aggiunto
- Due modalità sopra la mappa: «Gioco» ed «Editor scenario». L'Editor non si accende durante una partita; i comandi manuali (cedere sovranità e controllo, solo controllo, aggiungere un segnaposto) esistono solo lì.
- Uno scenario è un salvataggio senza partita: si conserva come file con «Esporta» e si ricarica con «Importa»; non sovrascrive mai la partita salvata e non si importa durante una partita.
- Legenda fissa «Proprietà e controllo» (colore pieno, righe diagonali) con la spiegazione di proprietario e controllore, ed elenco in parole dei territori occupati.
- `docs/EDITOR-SCENARIO.md` e `tests/browser/t13_editor.js`.

### Modificato
- «Salva partita» salva solo con una partita in corso (prima, senza partita, poteva scrivere una mappa sopra la partita salvata).
- Durante la partita il territorio cambia solo per i cambiamenti proposti dal motore, che dalla versione 23 vengono controllati prima di essere applicati.

## [0.24.0] - 2026-10-19

La pagina funziona anche fuori da Claude ([#1](../../issues/1)); i salvataggi dichiarano la versione ([#5](../../issues/5)).

### Aggiunto
- Salvataggio nel browser (`localStorage`, altrimenti in memoria) quando non c'è il database di Claude; «Esporta» e «Importa» come testo o come file `.json`.
- Modalità manuale al posto dell'AI: finestra con il testo da copiare e campo per la risposta incollata, con «Annulla».
- `schemaVersion: 3` in ogni salvataggio, migrazione dei salvataggi della versione 2 e rifiuto chiaro delle versioni sconosciute; importazione controllata (testi mostrati come testo, parti malformate scartate).
- Nome stabile `src/storia-alternativa-prototipo.html` e `index.html` per GitHub Pages.
- `package.json` e `.github/workflows/ci.yml`: le prove partono a ogni push e a ogni pull request.
- `tests/pagina.test.js`, `tests/browser/t12_providers.js` e `docs/USO-FUORI-DA-CLAUDE.md`.

## [0.23.0] - 2026-10-17

### Aggiunto
- `src/storia-alternativa-prototipo-v23.html`: versione 23 in un unico file, con segnaposto sulla mappa (17 tipi), sovranità e controllo separati (l'occupazione è disegnata con righe diagonali), salvataggi validati, risposte dell'AI arrivate in ritardo scartate e scenario fisso al 31 dicembre 1960.
- `tests/browser/`: prove in un Chromium vero (Playwright) con `window.claude` simulata, senza rete né AI.
