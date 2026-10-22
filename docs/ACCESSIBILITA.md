# Accessibilità

Dalla versione 26 la pagina si può usare **senza mouse**, con un **lettore di schermo**, con **meno animazioni** e con colori **più leggibili**. Questo documento dice cosa è stato fatto, come si usa, che cosa è stato provato e che cosa **no** (issue [#4](../../issues/4)).

## Come si usa

### Con la tastiera

| Tasto | Cosa fa |
|---|---|
| **Tab** / **Maiusc+Tab** | passa al comando successivo / precedente. Il primo è «Vai al contenuto principale» (con **Invio** salta direttamente al contenuto) |
| **Tab** sulla mappa | tutti i territori contano come **un solo punto di sosta**: non serve attraversarli uno per uno |
| **← ↑ → ↓** | passa al territorio vicino nella direzione scelta; se è fuori dalla parte visibile, la mappa scorre da sola (senza cambiare lo zoom) |
| **Invio** o **Spazio** | apre la scheda del territorio; la pagina annuncia «Scheda aperta: nome, proprietario» |
| **+** e **−** | ingrandisce e riduce attorno al territorio che ha il focus |
| **0** | torna all'Europa |
| **Esc** | chiude le finestre (Esporta, Importa, modalità manuale) e l'elenco dei risultati della ricerca; il focus torna al pulsante che le aveva aperte |
| **← →**, **Home**, **Fine** | tra le schede «Azioni» e «Diplomazia» durante la partita |

Un cerchio **bianco con bordo scuro** (due strati, così si vede su qualunque colore) mostra a quale territorio è il focus. Un tocco o un clic su un territorio lo seleziona senza disegnare il cerchio.

### Senza usare la mappa

Tutto ciò che si fa toccando la mappa si può fare anche a parole:

- **Cerca uno Stato o una regione** sopra la mappa: i risultati sono un elenco con frecce, Invio ed Esc.
- **Elenco dei territori per Stato** sotto la mappa: un gruppo per Stato (con il numero di territori), ogni territorio è un pulsante che apre la scheda. L'elenco si costruisce quando lo si apre e segue i cambiamenti di proprietà.
- **Territori occupati** e **Segnaposto sulla mappa**: elenchi in parole, già presenti prima.

### Con un lettore di schermo

- La pagina ha un `<main>`, sezioni con nome («Scenario fisso — Europa, 31 dicembre 1960», «Scenario libero», «Partita in corso», «Scheda del territorio») e titoli in ordine, senza salti di livello. Il titolo principale (livello 1) è «Storia Alternativa»; durante una partita nello scenario libero, che non mostra la mappa, è «Partita in corso».
- Ogni territorio è un **pulsante con un nome**: «Lombardia, Italia»; se qualcuno lo occupa, «Lombardia, Italia, sotto controllo di Unione Sovietica». Il territorio la cui scheda è aperta è segnato come *corrente*.
- Le scritte disegnate sulla mappa e le emoji sono decorazioni: non vengono lette (le parole bastano).
- Gli **annunci** passano da un'area a parte (`role="status"`): scheda aperta, «Nessun altro territorio in questa direzione», «Il motore storico sta elaborando…», «Il Consigliere sta preparando un consiglio…», «In attesa di risposta…», cessione di sovranità o di controllo dall'Editor. La stessa frase ripetuta due volte di seguito viene annunciata di nuovo.
- La cronaca della partita e la conversazione diplomatica sono **registri** (`role="log"`): i nuovi paragrafi si leggono da soli; quando si carica un salvataggio il registro si riempie in silenzio, senza leggere tutto il passato.
- I campi hanno un'etichetta legata (`for`/`id`), le finestre hanno un nome e il focus entra e torna dove deve; quando un pulsante sparisce (per esempio «Nuova partita») il focus passa al titolo della pagina invece di perdersi.

### Colori e movimento

- **Contrasto**: tutti i testi arrivano a 4,5 su 1 (3 su 1 per il testo grande), anche nel tema scuro (dove il testo sul colore d'accento ora è scuro: prima era 3,1 su 1) e anche i segnaposto dei campi. I bordi dei campi arrivano a 3 su 1.
- **Movimento ridotto**: se il sistema chiede meno animazioni, spariscono il lampeggio dei territori, la pulsazione dei segnaposto e lo scorrimento delle barre, e la pagina scorre senza effetto «morbido».
- **Alto contrasto** (temi di Windows): il cerchio sulla mappa usa due colori di sistema che si vedono sempre; i pulsanti attivi, le barre e la legenda restano distinguibili.
- **Dimensione dei comandi**: almeno 24 × 24 px (anche le righe «Come usare la mappa…», «Elenco dei territori…» e le caselle di spunta). A 320 px di larghezza la pagina non scorre di lato.

## Che cosa chiedeva l'issue e a che punto siamo

| Richiesta | Stato |
|---|---|
| Landmark semantici e titoli in ordine | fatto (`<main>`, sezioni con nome, titoli senza salti; il titolo sta dentro `<main>` e non c'è un `<nav>` perché la pagina non ha una navigazione) |
| Territori selezionabili con Tab e frecce, con ruolo, nome e stato | fatto (un solo punto di sosta, frecce, Invio/Spazio, `aria-current`) |
| Focus visibile | fatto (ogni comando; sulla mappa il cerchio a due strati; i segnaposto hanno il loro) |
| Contrasto WCAG AA | fatto per il **testo** (misurato in due modi); vedi i limiti per le regioni della mappa |
| `prefers-reduced-motion` | fatto |
| Elenco testuale dei territori | fatto (per Stato, oltre alla ricerca) |
| Tutte le azioni principali da tastiera | provato con una partita intera usando solo la tastiera (dalla mappa a «Salva partita», «Esporta» e «Nuova partita») |
| Ogni territorio ha un nome accessibile | provato su tutti i territori |
| **Verifica con uno screen reader e con axe** | **non fatta** (vedi sotto): l'issue non si chiude con questa versione |

## Che cosa è stato provato e come

La prova è `tests/browser/t14_a11y.js` (143 controlli), più quattro controlli rapidi in `tests/pagina.test.js` e tutte le prove già esistenti (la partita, i salvataggi, l'Editor… non devono peggiorare).

- **L'albero dell'accessibilità di Chromium** (ruoli, nomi e stati: la fonte da cui attingono i lettori di schermo): punti di riferimento, titoli, nome di ogni controllo, nessun id ripetuto, riferimenti ARIA che puntano a qualcosa, schede, registri, finestre.
- **La tastiera**: ordine di Tab, un solo punto di sosta sulla mappa, direzione delle frecce, Invio e Spazio, più/meno/zero, scorrimento automatico, Esc, dove va il focus dopo ogni cambio di schermata, e una partita intera senza mouse.
- **Il focus visibile** su ogni punto di sosta della pagina.
- **Il contrasto**, con due misure indipendenti in quattordici situazioni (tema chiaro e scuro; scheda aperta, Editor, finestre, elenchi, partita, diplomazia): un controllo scritto per la prova e quello di Chromium stesso (`Audits.checkContrast`). Entrambi sono stati messi alla prova con un difetto messo apposta.
- **Comandi solo per il mouse** (cercati in ogni situazione), **dimensione minima** dei comandi, **reflow** a 320 px, **movimento ridotto**, **alto contrasto**.
- Una **verifica a occhio** su schermate a 390 e 900 px, in tema chiaro e scuro (cerchio sulla mappa, link «Vai al contenuto», elenchi, partita).

## Che cosa NON è stato provato

- **Nessun lettore di schermo vero** (NVDA, JAWS, VoiceOver, TalkBack). L'albero dell'accessibilità è ciò che i lettori leggono, ma il modo in cui ognuno lo pronuncia e lo naviga va sentito da una persona.
- **Nessun `axe`** (né Lighthouse): nell'ambiente in cui è stata scritta la versione il registro dei pacchetti non era raggiungibile. Le prove sopra coprono gran parte di ciò che `axe` controlla (nomi, ruoli, contrasto, id, etichette), ma non sono la stessa cosa.
- **Solo Chromium**: non Firefox, né Safari, né i browser dei telefoni.
- **Nessuna esecuzione su GitHub** (CI, GitHub Pages) al momento della scrittura.

### Prova a mano con un lettore di schermo (circa dieci minuti)

Windows: NVDA (gratuito); Mac e iPhone: VoiceOver (Cmd+F5 sul Mac); Android: TalkBack.

1. Apri la pagina e premi **Tab** una volta: deve dire «Vai al contenuto principale»; **Invio** porta al contenuto.
2. Scorri per titoli (in NVDA il tasto **H**): «Storia Alternativa», «Scenario fisso — Europa, 31 dicembre 1960», «Scenario libero».
3. Premi **Tab** fino alla mappa (dopo i pulsanti di zoom): deve leggere il nome di un territorio e «pulsante». Con le **frecce** passa ai vicini, con **Invio** si sente «Scheda aperta: …».
4. Apri **Elenco dei territori per Stato**, apri uno Stato, scegli un territorio: si apre la scheda.
5. Avvia una partita («Gioca come…»): deve annunciare la fase di attesa e poi trovare la risposta nella cronaca.
6. Apri **Esporta** e chiudi con **Esc**: il focus torna al pulsante.
7. Scrivi cosa si sente di strano (nomi poco chiari, cose lette due volte, cose non lette) nell'issue #4.

## Limiti noti

- **Segnaposto**: ognuno è un punto di sosta a parte (a differenza dei territori, che sono un solo punto). Con molti segnaposto il percorso con Tab lungo la mappa si allunga; l'elenco «Segnaposto sulla mappa» è l'alternativa.
- **Colore come unica informazione**: i colori degli Stati e delle alleanze sulla mappa non sono stati misurati contro la regola del contrasto per gli elementi grafici (WCAG 1.4.11, 3 su 1). Il nome di ogni territorio e l'elenco per Stato dicono le stesse cose a parole, e le occupazioni hanno righe diagonali oltre al colore.
- **Scorrere la mappa**: da tastiera si passa da un territorio all'altro (e la mappa scorre da sola); non c'è uno scorrimento libero a passi.
- **I testi generati dall'AI** non sono controllati per leggibilità.
- **Nomi stranieri**: la pagina è in italiano (`lang="it"`); un lettore pronuncia all'italiana anche i nomi di luoghi stranieri.

## Per chi sviluppa

- **Funzioni** (nello script di gioco): `announce(testo)` scrive nell'area `#a11yStatus`; `provLabel(id)` costruisce il nome di un territorio; `setRoving(id)` sposta l'unico `tabindex="0"` tra i territori; `nextProvince(id, [dx, dy])` sceglie il vicino nella direzione (cono di circa 60 gradi sui confinanti, poi fino a tre salti); `ensureVisible(id)` sposta la mappa solo se serve; `renderTerrList()` costruisce l'elenco per Stato; `focusEl`, `focusCardTitle`, `revealCard` spostano il focus; `reduceMotion()` e `scrollBehavior()` leggono la preferenza di movimento.
- **Regole da rispettare** quando si aggiunge qualcosa:
  - un comando è un `<button>` (o `role="button"` con `tabindex` e gestione dei tasti) e ha un nome: testo o `aria-label`;
  - un'emoji decorativa va in `<span aria-hidden="true">🗺️ </span>` con lo spazio dentro lo span, così il nome del comando inizia con una lettera;
  - un testo che cambia per via dello script e che conta va annunciato con `announce()` o messo in un `role="status"`/`role="log"`;
  - **non** mettere ascoltatori di `focusin`/`focusout` direttamente su un elemento SVG: in Chromium un elemento SVG che ascolta eventi di focus diventa un punto di sosta a sé (una tappa vuota prima dei territori); si ascolta il `<div class="map-wrap">` che lo contiene;
  - un `outline: none` è ammesso solo con un'alternativa visibile (oggi: `main:focus`, `.province-poly:focus` con il cerchio, i segnaposto con il loro anello); `tests/pagina.test.js` ne tiene l'elenco;
  - niente cursore a mano su ciò che non è un comando raggiungibile da tastiera, e niente comandi sotto i 24 px;
  - i colori passano dai token (`--on-accent`, `--field-border`, `--focus`, `--muted`…) e vanno controllati nei due temi.
- **Prove**: `node tests/browser/t14_a11y.js` (o l'intera suite con `node tests/browser/run.js`); la prova del contrasto ignora le emoji e il testo nei `<details>` chiusi per i motivi spiegati in `tests/browser/README.md`.
