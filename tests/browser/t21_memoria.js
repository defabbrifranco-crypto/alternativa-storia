// Quaderno delle nazioni (versione 36): ogni nazione ha una memoria, cioè poche voci brevi con la data e l'origine, salvate con la partita.
// La pagina scrive da sola i fatti che conosce (i messaggi e come il giocatore ha risposto, i contatti fra due altre nazioni, i colloqui, le mosse
// riferite dal motore); il motore aggiunge note su ciò che una nazione deve ricordare (campo «memoria»: da 0 a 4 per periodo). Il motore a ogni
// «Avanza», i colloqui nella scheda Diplomazia e il Consigliere leggono il quaderno; il motore ricorda anche gli ultimi ordini eseguiti e il
// Consigliere i suoi ultimi consigli. Il quaderno di uno Stato sta sotto il suo codice; un nome che la pagina non riesce a legare a uno Stato
// della mappa (un capo di governo, «il Cancelliere tedesco», che vale per due Stati) ha un quaderno suo, e senza la mappa ogni nome è così.
// Le attese sono scritte qui, a mano; il file dei dati si legge dal disco.
const fs = require('fs');
const path = require('path');
const { launch, check, summary } = require('./harness');

const FILE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'data', 'states_1960.json'), 'utf8'));
const ID = FILE.states.map(s => s.id);
const NOME = Object.fromEntries(FILE.states.map(s => [s.id, s.name]));
const PL = 'ITA';
const altri = ID.filter(c => c !== PL);
const uguali = (x, y) => JSON.stringify(x) === JSON.stringify(y);
const TAG = { m: 'messaggio', c: 'contatto', t: 'colloquio', o: 'mossa', e: 'nota' };
const PARTENZA = '31 dicembre 1960';
const AVVISO_NOTE = n => `⚠️ Note di memoria scartate: ${n} (nazione non valida o uguale alla tua, testo mancante, oppure oltre il massimo di 4 per periodo)`;

const TURN = (extra = {}) => Object.assign({ evento_titolo: 'Titolo di prova', narrativa: 'Narrativa di prova.', riepilogo_mondo: 'Riepilogo di prova.',
  nuovo_anno: 'gennaio 1961', stabilita: 55, economia: 55, esercito: 55, prestigio: 55, cambi_territoriali: [], cambi_controllo: [], segnaposto: [] }, extra);
const MSG = (da, tipo, peso, testo) => ({ da, tipo, peso, testo });
const CT = (da, a, tipo, peso, esito, testo = 'x') => ({ da, a, tipo, peso, esito, testo });
const NOTA = (nazione, nota) => ({ nazione, nota });
const M3 = [MSG('FRA', 'accordo', 4, 'Proponiamo un patto di amicizia.'), MSG('URSS', 'ultimatum', 5, 'Ritirate le truppe.'), MSG('GBR', 'colloquio', 2, 'Vorremmo incontrarvi.')];

(async () => {
  const { browser, page, errors, store } = await launch({ width: 640, height: 1100, mobile: false });     // «store» è il contenitore di prova del salvataggio (il database di Claude)
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const restart = c => ev(c => { window.__queue.length = 0; window.__textQueue.length = 0; window.__prompts.length = 0; window.__t.resetGame(); window.__t.startFixedScenarioGame(c); }, c);
  const restartLibera = async (nazione = 'Impero Romano', anno = '400 d.C.') => {
    await ev(() => { window.__queue.length = 0; window.__textQueue.length = 0; window.__prompts.length = 0; window.__t.resetGame(); });
    await page.fill('#nation', nazione); await page.fill('#startYear', anno);
    await page.click('#startBtn');                                  // «Inizia» apre la partita libera; la richiesta al motore parte al primo «Avanza»
  };
  const queueJson = v => ev(v => { window.__queue.push(v); }, v);
  const queueText = t => ev(t => { window.__textQueue.push({ text: t }); }, t);
  const spinnerOff = () => page.waitForFunction(() => document.getElementById('thinking').classList.contains('hidden'));
  const advance = async () => { await page.click('#advanceBtn'); await spinnerOff(); };
  const turn = async extra => { await queueJson(TURN(extra)); await advance(); };
  const ordine = async testo => { await page.fill('#actionInput', testo); await page.click('#sendBtn'); };
  const memory = () => ev(() => JSON.parse(JSON.stringify(window.__t.getState().memory)));
  const voci = async k => ((await memory())[k] || { e: [] }).e.map(e => [e.s, e.x]);                       // coppie origine / testo
  const chiavi = async () => Object.keys(await memory()).sort();
  const kinds = () => ev(() => window.__t.getState().log.map(e => e.k).join());
  const logLines = k => ev(k => window.__t.getState().log.filter(e => e.k === k).map(e => e.lines), k);
  const lastPrompt = () => ev(() => { const p = window.__prompts[window.__prompts.length - 1]; return Array.isArray(p) ? String(p[0].content) : String(p); });
  const stato = () => ev(() => { const S = window.__t.getState(); return { year: S.year, turn: S.turn, orders: JSON.parse(JSON.stringify(S.orders)), advice: JSON.parse(JSON.stringify(S.advice)), memSeq: S.memSeq, seen: S.diplo.seen }; });
  const tabAzioni = () => page.click('#tabActions');
  const tabDiplo = () => page.click('#tabDiplo');
  const apriColloquio = con => ev(con => { document.getElementById('diploTarget').value = con; document.getElementById('diploStartBtn').click(); }, con);
  const scrivi = async testo => { await page.fill('#diploInput', testo); await page.click('#diploSendBtn'); await page.waitForFunction(() => document.getElementById('diploThinking').classList.contains('hidden') && !window.__t.getDiploBusy()); };
  const storia = () => ev(() => JSON.parse(JSON.stringify(window.__t.getState().diplo.history)));
  const chiudiColloquio = () => ev(() => document.getElementById('diploResetBtn').click());
  const testoDi = sel => ev(sel => { const e = document.querySelector(sel); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }, sel);
  const promptAt = i => ev(i => { const p = window.__prompts[i]; return Array.isArray(p) ? String(p[0].content) : String(p); }, i);
  const clicca = (id, act) => page.click(`#msgList button[data-id="${id}"][data-act="${act}"]`);
  const perChiave = o => Object.fromEntries(Object.keys(o).sort().map(k => [k, o[k]]));      // gli stessi quaderni, nell'ordine alfabetico dei nomi
  const voce = (n, w, s, x) => ({ n, w, s, x });
  const blocco = (extra, caldi) => ev(([x, h]) => window.__t.memoryBook(x, h), [extra, caldi]);

  check('la pagina si carica senza errori', errors.length === 0, errors);
  check('appena caricata la pagina, prima di una partita, il pannello del quaderno non si vede e l\'elenco è vuoto',
    (await ev(() => document.getElementById('memPanel').classList.contains('hidden') && document.getElementById('memList').children.length === 0)) === true, 'pannello');

  // =============================================================== 1. i tetti e le parole
  console.log('— i tetti e le parole del quaderno');
  const T0 = await ev(() => { const T = window.__t; return { quaderno: [T.MAX_MEM_BOOKS, T.MAX_MEM_ENTRIES, T.MEM_NOTE_LEN, T.MEM_DATE_LEN, T.MEM_NAME_LEN], motore: [T.MAX_MEM_NEW, T.MAX_MEM_READ],
    richiesta: [T.MEM_PROMPT_BOOKS, T.MEM_PROMPT_ENTRIES, T.MEM_PROMPT_CHARS, T.MEM_LOOSE_PROMPT], colloquio: [T.MEM_CHAT_ENTRIES, T.MEM_ADVISOR_BOOKS, T.MEM_ADVISOR_ENTRIES],
    ordini: [T.MAX_ORDERS_KEPT, T.MAX_ORDERS_PROMPT, T.ORDER_MEM_LEN], consigli: [T.MAX_ADVICE_KEPT, T.ADVICE_MEM_LEN], tag: T.MEM_TAGS, scelte: T.MSG_PLAYER_DID }; });
  check('i tetti del quaderno: 30 quaderni, 10 voci ciascuno, 160 caratteri a voce, 24 alla data, 60 al nome', uguali(T0.quaderno, [30, 10, 160, 24, 60]), T0.quaderno);
  check('dal motore si leggono al massimo 12 note e se ne tengono 4 per periodo', uguali(T0.motore, [4, 12]), T0.motore);
  check('il motore legge al massimo 8 quaderni (3 voci ciascuno, 2.400 caratteri in tutto, 2 nomi che non sono Stati); il colloquio 6 voci; il Consigliere 5 quaderni da 2 voci', uguali(T0.richiesta, [8, 3, 2400, 2]) && uguali(T0.colloquio, [6, 5, 2]), [T0.richiesta, T0.colloquio]);
  check('gli ultimi ordini: se ne tengono 8, al motore e al Consigliere ne arrivano 4, ognuno al massimo di 100 caratteri; i consigli: gli ultimi 3, 220 caratteri', uguali(T0.ordini, [8, 4, 100]) && uguali(T0.consigli, [3, 220]), [T0.ordini, T0.consigli]);
  check('le origini di una voce sono cinque: messaggio, contatto, colloquio, mossa, nota', uguali(T0.tag, TAG), T0.tag);
  check('che cosa ha fatto il giocatore di un messaggio: ha accettato, ha rifiutato, non ha risposto, ha risposto con un colloquio', uguali(T0.scelte, { accept: 'ha accettato', refuse: 'ha rifiutato', ignore: 'non ha risposto', talk: 'ha risposto con un colloquio' }), T0.scelte);
  await restart(PL);
  const S0 = await stato();
  check('la partita di prova parte dal 31 dicembre 1960, senza quaderno, senza ordini e senza consigli', S0.year === PARTENZA && S0.turn === 0 && uguali(S0.orders, []) && uguali(S0.advice, []) && S0.memSeq === 0 && (await chiavi()).length === 0, S0);

  // =============================================================== 2. a quale quaderno appartiene un nome
  console.log('— a quale quaderno appartiene un nome');
  const CHIAVI = [
    ['FRA', 'FRA', 'FRA'], ['fra', 'FRA', 'FRA'], ['Francia', 'FRA', 'FRA'], ['  francia  ', 'FRA', 'FRA'], ['FRANCIA', 'FRA', 'FRA'],
    ['Germania Ovest', 'FRG', 'FRG'], ['Germania Est', 'GDR', 'GDR'], ['Unione Sovietica', 'URSS', 'URSS'], ['URSS', 'URSS', 'URSS'], ['Russia', 'URSS', 'URSS'],
    ['Taiwan', 'TWN', 'TWN'], ['Stati della Tregua (Emirati Arabi Uniti)', 'ARE', 'ARE'], ['il presidente della Francia', 'FRA', 'FRA'],
    ['Kennedy', '~kennedy', ''], ['il Cancelliere tedesco', '~il cancelliere tedesco', ''], ['Germania', '~germania', ''], ['Francia e Regno Unito', '~francia e regno unito', ''],
    ['ITA', '', ''], ['Italia', '', ''], ['', '', ''], ['   ', '', ''], [null, '', ''], [undefined, '', ''],
    ['x'.repeat(100), '~' + 'x'.repeat(40), ''], ['Chi è? <b>Lui</b>!', '~chi e b lui b', ''], ['x'.repeat(39) + ' coda', '~' + 'x'.repeat(39), ''] ];
  const lette = await ev(l => l.map(([t]) => [window.__t.memKeyOf(t, false), window.__t.memKeyOf(t, true)]), CHIAVI);
  const sbagliate = CHIAVI.map(([t, a, b], i) => [t, lette[i], [a, b]]).filter(([, got, want]) => !uguali(got, want));
  check('in una partita sulla mappa (Italia) il quaderno è: il codice di uno Stato se il testo è il codice, il nome esatto o nomina uno Stato solo; altrimenti uno suo sotto le parole scritte; mai quello del giocatore; dal motore un nome che non è uno Stato non vale; il taglio a 40 caratteri non lascia lo spazio in fondo (26 casi)', sbagliate.length === 0, sbagliate);
  check('un quaderno con parole scritte comincia con «~», ha solo lettere minuscole senza accenti, cifre e spazi, al massimo 40 caratteri, e il nome lungo si taglia', lette.filter(x => x[0][0] === '~').every(x => /^~[a-z0-9 ]{1,40}$/.test(x[0])), lette.filter(x => x[0][0] === '~'));

  await restartLibera('Impero Romano', '400 d.C.');
  const libere = [['Francia', '~francia'], ['ITA', '~ita'], ['il Cancelliere tedesco', '~il cancelliere tedesco'], ['Impero Romano', ''], ['impero  ROMANO', ''], ['Roma', '~roma'], ['', '']];
  const letteLibere = await ev(l => l.map(([t]) => [window.__t.memKeyOf(t, false), window.__t.memKeyOf(t, true)]), libere);
  check('senza la mappa ogni nome ha un quaderno suo (anche «Francia» e «ITA»), uguale dal motore o dal giocatore, tranne la nazione del giocatore che non ne ha (7 casi)', libere.every(([, k], i) => uguali(letteLibere[i], [k, k])), libere.map(([t], i) => [t, letteLibere[i]]));

  // =============================================================== 3. scrivere una voce: tetti, origini, che cosa cade
  console.log('— una voce: che cosa si scrive e che cosa cade quando il quaderno è pieno');
  await restart(PL);
  const A = await ev(() => {
    const T = window.__t, S = T.getState(), out = {};
    out.ok = [T.memAdd('FRA', 'e', 'Promessa A'), T.memAdd('FRA', 'o', '  Mossa   B  ')];
    out.no = [T.memAdd('', 'e', 'x'), T.memAdd('FRA', 'z', 'x'), T.memAdd('FRA', 'e', ''), T.memAdd('FRA', 'e', '   '), T.memAdd('FRA', 'constructor', 'x'), T.memAdd('FRA', 5, 'x'), T.memAdd('FRA', undefined, 'x')];
    out.book = JSON.parse(JSON.stringify(S.memory)); out.seq = S.memSeq; return out; });
  check('una voce valida si scrive (testo ripulito, data di oggi, numero d\'ordine 1, 2); senza quaderno, con un\'origine che non c\'è, senza testo: non si scrive e non consuma numeri',
    uguali(A.ok, [true, true]) && uguali(A.no, [false, false, false, false, false, false, false]) && A.seq === 2
    && uguali(A.book, { FRA: { n: '', e: [{ n: 1, w: PARTENZA, s: 'e', x: 'Promessa A' }, { n: 2, w: PARTENZA, s: 'o', x: 'Mossa B' }] } }), A);
  const B = await ev(() => {
    const T = window.__t, S = T.getState();
    T.memAdd('BEL', 'e', 'x'.repeat(300));
    S.year = 'una data molto molto lunga oltre ogni limite'; T.memAdd('BEL', 'e', 'data lunga');
    T.memAdd('~il cancelliere tedesco', 't', 'Colloquio', 'il Cancelliere tedesco'); T.memAdd('~kennedy', 't', 'Colloquio', '  Kennedy <b> ' + 'k'.repeat(100));
    return JSON.parse(JSON.stringify(S.memory)); });
  check('il testo di una voce si taglia a 160 caratteri e la data a 24; un quaderno con parole scritte ricorda il nome com\'era scritto (ripulito e tagliato a 60), uno con il codice di uno Stato no',
    B.BEL.e[0].x === 'x'.repeat(160) && B.BEL.e[1].w === 'una data molto molto lun' && B.BEL.n === '' && B['~il cancelliere tedesco'].n === 'il Cancelliere tedesco'
    && B['~kennedy'].n === ('Kennedy b ' + 'k'.repeat(50)) && B['~kennedy'].n.length === 60, [B.BEL.e.map(e => [e.w, e.x.length]), B['~kennedy'].n]);

  await restart(PL);
  const C = await ev(() => {
    const T = window.__t, S = T.getState(), out = {}, x = k => S.memory[k].e.map(e => e.x).join();
    for (let i = 1; i <= 8; i++) T.memAdd('GBR', 'o', 'm' + i);
    T.memAdd('GBR', 'e', 'n1'); T.memAdd('GBR', 'e', 'n2');
    out.pieno = x('GBR');
    out.nota3 = T.memAdd('GBR', 'e', 'n3'); out.dopoNota = x('GBR');
    out.colloquio = T.memAdd('GBR', 't', 't1'); out.dopoColloquio = x('GBR');
    for (let i = 1; i <= 10; i++) T.memAdd('BEL', 'e', 'e' + i);
    out.mossaInPiu = T.memAdd('BEL', 'o', 'tardiva'); out.dopoMossa = x('BEL');
    out.notaInPiu = T.memAdd('BEL', 'e', 'e11'); out.dopoNotaBel = x('BEL');
    out.contatto = T.memAdd('BEL', 'c', 'c1'); out.messaggio = T.memAdd('BEL', 'm', 'm1'); out.dopoAltre = x('BEL');
    return out; });
  check('un quaderno pieno (10 voci: 8 mosse e 2 note) perde per prime le mosse e i colloqui, dalla più vecchia: una nota in più fa cadere m1, un colloquio in più fa cadere m2',
    C.pieno === 'm1,m2,m3,m4,m5,m6,m7,m8,n1,n2' && C.nota3 === true && C.dopoNota === 'm2,m3,m4,m5,m6,m7,m8,n1,n2,n3' && C.colloquio === true && C.dopoColloquio === 'm3,m4,m5,m6,m7,m8,n1,n2,n3,t1', C);
  check('un quaderno pieno di sole note: una mossa in più non entra (e lo dice), una nota in più fa cadere la più vecchia (e1), poi un contatto e un messaggio fanno cadere e2 ed e3',
    C.mossaInPiu === false && C.dopoMossa === 'e1,e2,e3,e4,e5,e6,e7,e8,e9,e10' && C.notaInPiu === true && C.dopoNotaBel === 'e2,e3,e4,e5,e6,e7,e8,e9,e10,e11'
    && C.contatto === true && C.messaggio === true && C.dopoAltre === 'e4,e5,e6,e7,e8,e9,e10,e11,c1,m1', C);

  await restart(PL);
  const D = await ev(ids => {
    const T = window.__t, S = T.getState(), out = {};
    ids.slice(0, 30).forEach((c, i) => T.memAdd(c, 'e', 'voce ' + i));
    out.trenta = Object.keys(S.memory).length;
    T.memAdd(ids[1], 'e', 'riscritto');                                  // il secondo quaderno viene scritto di nuovo: ora è il più recente dopo l'ultimo
    T.memAdd(ids[30], 'e', 'il trentunesimo');
    out.dopo31 = Object.keys(S.memory).sort(); out.primo = ids[0]; out.secondo = ids[1]; out.terzo = ids[2]; out.n31 = ids[30];
    T.memAdd('~nuovo nome', 't', 'x', 'Nuovo nome');
    out.dopo32 = Object.keys(S.memory).sort();
    return out; }, altri);
  check('con 30 quaderni, il 31° fa cadere quello scritto meno di recente (il primo); se uno più vecchio è stato riscritto salva sé stesso: il 32° (un nome con parole scritte) fa cadere il terzo',
    D.trenta === 30 && D.dopo31.length === 30 && !D.dopo31.includes(D.primo) && D.dopo31.includes(D.secondo) && D.dopo31.includes(D.n31)
    && D.dopo32.length === 30 && !D.dopo32.includes(D.terzo) && D.dopo32.includes(D.secondo) && D.dopo32.includes('~nuovo nome'), [D.dopo31.length, D.dopo32.length, D.primo, D.terzo]);

  // =============================================================== 4. un turno intero: che cosa scrive la pagina da sola e che cosa legge il motore dopo
  console.log('— un turno intero: che cosa scrive la pagina da sola e che cosa legge il motore dopo');
  const GEN = 'gennaio 1961', LUG = 'luglio 1961';
  const CONTATTO = 'Francia → Regno Unito: proposta di accordo (peso 4), accettato — «Firmano un patto di amicizia.»';
  const STATO_MONDO = 'Stato del mondo finora: ';
  const INTESTAZIONE = 'Quaderno delle nazioni (ciò che gli Stati ricordano; tienine conto e non contraddirlo):\n';
  const REGOLE = 'Memoria: il quaderno dice ciò che ogni Stato ricorda (promesse, accordi, offese, favori): tienine conto e non contraddirlo finché la storia non lo cambia. '
    + 'Se in questo periodo uno Stato prende o riceve un impegno, una promessa, una minaccia, un favore o un rancore che deve ricordare, scrivilo in "memoria" come {"nazione":"CODICE","nota":"una frase"}: da 0 a 4 note, mai sul giocatore stesso. '
    + 'Non ripetere ciò che il gioco registra da solo (messaggi, contatti, colloqui e mosse delle altre nazioni). Se non c\'è nulla da ricordare, "memoria" è un array vuoto.\n';
  const REGOLE_LIBERA = 'Memoria: il quaderno dice ciò che ogni Stato ricorda (promesse, accordi, offese, favori): tienine conto e non contraddirlo finché la storia non lo cambia. '
    + 'Se in questo periodo uno Stato prende o riceve un impegno, una promessa, una minaccia, un favore o un rancore che deve ricordare, scrivilo in "memoria" come {"nazione":"nome della nazione","nota":"una frase"}: da 0 a 4 note, mai sul giocatore stesso. '
    + 'Non ripetere ciò che il gioco registra da solo (colloqui e mosse delle altre nazioni). Se non c\'è nulla da ricordare, "memoria" è un array vuoto.\n';
  const CONSEGUENZE = ' e aggiorna le statistiche in modo coerente.';
  const CURA_MSG = 'di come il giocatore ha risposto ai messaggi (chi ha avuto un sì, un no o nessuna risposta reagisce di conseguenza)';
  const CURA_NOTE = 'di ciò che le nazioni ricordano (quaderno)';
  const SOMMARIO2 = 'Francia, Cina, Regno Unito, Unione Sovietica e Germania Ovest sono in fermento.';     // nomina tutti gli Stati che avranno un quaderno: sono tutti «in primo piano»
  await restart(PL);
  await turn({ nuovo_anno: GEN, messaggi: M3,
    mosse_altre_nazioni: [{ nazione: 'Francia', mossa: 'Parigi invia osservatori a Londra.' }, { nazione: 'Cina', mossa: 'Pechino riconosce il nuovo governo.' }, 'Voci di crisi a Berlino.', { nazione: 'il Cancelliere tedesco', mossa: 'Il Cancelliere parla di riarmo.' }],
    contatti: [CT('FRA', 'GBR', 'accordo', 4, 'accettato', 'Firmano un patto di amicizia.')],
    memoria: [NOTA('FRA', 'Ha promesso aiuti a Londra entro l\'estate.'), NOTA('Unione Sovietica', 'Non perdona la nota di protesta.')] });
  const P1 = await promptAt(0);
  check('la richiesta del primo turno, a quaderno ancora vuoto: niente quaderno e niente ordini già eseguiti; le regole della memoria stanno subito dopo lo stato del mondo; la frase finale non nomina il quaderno; in fondo allo schema c\'è «memoria» con il codice dello Stato',
    P1.includes(STATO_MONDO + '(inizio partita, nessun evento ancora)\n' + REGOLE + 'Statistiche attuali (0-100):') && !P1.includes('Quaderno delle nazioni') && !P1.includes('Ordini recenti del giocatore')
    && P1.includes(CONSEGUENZE + ' Rispondi SOLO con un oggetto JSON: {') && P1.endsWith(', "memoria": [{"nazione": "CODICE", "nota": "da ricordare, una frase"}]}'), P1.slice(-260));
  const ATTESO1 = {
    CHN: { n: '', e: [voce(2, GEN, 'o', 'Pechino riconosce il nuovo governo.')] },
    FRA: { n: '', e: [voce(1, GEN, 'o', 'Parigi invia osservatori a Londra.'), voce(3, GEN, 'c', CONTATTO), voce(5, GEN, 'e', 'Ha promesso aiuti a Londra entro l\'estate.')] },
    GBR: { n: '', e: [voce(4, GEN, 'c', CONTATTO)] },
    URSS: { n: '', e: [voce(6, GEN, 'e', 'Non perdona la nota di protesta.')] } };
  const Q1 = await memory(), S1 = await stato();
  check('dopo il primo turno i quaderni sono quattro, scritti nell\'ordine mosse, contatto, note del motore (numeri da 1 a 6, data di fine periodo): la mossa di Francia e Cina, il contatto nei quaderni di Francia e Regno Unito, le note di Francia e Unione Sovietica',
    uguali(perChiave(Q1), ATTESO1) && S1.memSeq === 6 && uguali(S1.orders, []), Q1);
  check('la mossa senza nome di uno Stato, quella del «Cancelliere tedesco» (vale per due Stati) e i messaggi non ancora risolti non scrivono nulla: il quaderno non ha voci di messaggio e non c\'è un quaderno «~»',
    Object.keys(Q1).every(k => k[0] !== '~') && Object.values(Q1).every(b => b.e.every(x => x.s !== 'm')), Object.keys(Q1));
  check('la cronaca del primo turno: turno, mosse, contatto, relazioni, messaggi e, per ultima, la voce «Da ricordare» con le due note del motore; sullo schermo è la scheda 📓',
    (await kinds()) === 't,n,c,r,m,q' && uguali(await logLines('q'), [['Francia: Ha promesso aiuti a Londra entro l\'estate.', 'Unione Sovietica: Non perdona la nota di protesta.']])
    && (await testoDi('.entry-mem')) === '📓 Da ricordare Francia: Ha promesso aiuti a Londra entro l\'estate. Unione Sovietica: Non perdona la nota di protesta.', [await kinds(), await testoDi('.entry-mem')]);

  await clicca('m1', 'accept'); await clicca('m2', 'refuse'); await ordine('Mobilito le riserve.');            // il terzo messaggio (Regno Unito) resta senza risposta
  await turn({ nuovo_anno: LUG, riepilogo_mondo: SOMMARIO2, mosse_altre_nazioni: [{ nazione: 'Germania Ovest', mossa: 'Bonn rafforza i confini.' }],
    memoria: [NOTA('GBR', 'Vuole un incontro con Roma in autunno.')] });
  const P2 = await promptAt(1);
  const RIGHE2 = [
    `- Unione Sovietica (URSS): [${GEN}, nota] Non perdona la nota di protesta.`,
    `- Francia (FRA): [${GEN}, mossa] Parigi invia osservatori a Londra.; [${GEN}, contatto] ${CONTATTO}; [${GEN}, nota] Ha promesso aiuti a Londra entro l'estate.`,
    `- Regno Unito (GBR): [${GEN}, contatto] ${CONTATTO}`,
    `- Cina (CHN): [${GEN}, mossa] Pechino riconosce il nuovo governo.`];
  check('la richiesta del secondo turno ha il quaderno scritto nel primo, subito dopo lo stato del mondo: prima i tre Stati che hanno scritto al giocatore (Unione Sovietica, Francia, Regno Unito, dal più recente), poi la Cina; Francia ha tutte e tre le voci; gli ordini non sono ancora «già eseguiti»',
    P2.includes(STATO_MONDO + 'Riepilogo di prova.\n' + INTESTAZIONE + RIGHE2.join('\n') + '\n' + REGOLE + 'Statistiche attuali (0-100):') && !P2.includes('Ordini recenti del giocatore')
    && P2.includes('Nel frattempo il giocatore dà quest\'ordine:\n1. "Mobilito le riserve."'), P2.slice(P2.indexOf('Quaderno'), P2.indexOf('Quaderno') + 400));
  check('…e la frase finale dice che si deve tener conto sia delle risposte ai messaggi sia del quaderno',
    P2.includes('(gli ordini del giocatore, le sue risposte ai messaggi e le mosse delle altre nazioni)' + CONSEGUENZE + ' Nella narrativa e nel riepilogo del mondo tieni conto ' + CURA_MSG + ' e ' + CURA_NOTE + '. Rispondi SOLO con un oggetto JSON: {'), P2.slice(-1500, -900));
  const ATTESO2 = {
    CHN: ATTESO1.CHN,
    FRA: { n: '', e: ATTESO1.FRA.e.concat([voce(8, LUG, 'm', 'Proposta di accordo al giocatore (peso 4); il giocatore ha accettato — «Proponiamo un patto di amicizia.»')]) },
    FRG: { n: '', e: [voce(7, LUG, 'o', 'Bonn rafforza i confini.')] },
    GBR: { n: '', e: ATTESO1.GBR.e.concat([voce(10, LUG, 'm', 'Richiesta di colloquio al giocatore (peso 2); il giocatore non ha risposto — «Vorremmo incontrarvi.»'), voce(11, LUG, 'e', 'Vuole un incontro con Roma in autunno.')]) },
    URSS: { n: '', e: ATTESO1.URSS.e.concat([voce(9, LUG, 'm', 'Ultimatum al giocatore (peso 5); il giocatore ha rifiutato — «Ritirate le truppe.»')]) } };
  const Q2 = await memory(), S2 = await stato();
  check('dopo il secondo turno: chi ha scritto ricorda che cosa ha fatto il giocatore del suo messaggio (Francia accettato, Unione Sovietica rifiutato, Regno Unito senza risposta), nell\'ordine dei messaggi; la mossa della Germania Ovest e la nota del motore sul Regno Unito',
    uguali(perChiave(Q2), ATTESO2) && S2.memSeq === 11, Q2);
  check('l\'ordine dato è ricordato con la data di quando è stato dato (e non la data nuova); la cronaca del secondo turno: ordine, turno, mosse, relazioni, messaggi, note',
    uguali(S2.orders, [{ w: GEN, x: 'Mobilito le riserve.' }]) && (await kinds()) === 't,n,c,r,m,q,a,t,n,r,m,q', [S2.orders, await kinds()]);

  await turn({ nuovo_anno: 'gennaio 1962' });
  const P3 = await promptAt(2);
  const RIGHE3 = [
    `- Regno Unito (GBR): [${GEN}, contatto] ${CONTATTO}; [${LUG}, messaggio] Richiesta di colloquio al giocatore (peso 2); il giocatore non ha risposto — «Vorremmo incontrarvi.»; [${LUG}, nota] Vuole un incontro con Roma in autunno.`,
    `- Unione Sovietica (URSS): [${GEN}, nota] Non perdona la nota di protesta.; [${LUG}, messaggio] Ultimatum al giocatore (peso 5); il giocatore ha rifiutato — «Ritirate le truppe.»`,
    `- Francia (FRA): [${GEN}, contatto] ${CONTATTO}; [${GEN}, nota] Ha promesso aiuti a Londra entro l'estate.; [${LUG}, messaggio] Proposta di accordo al giocatore (peso 4); il giocatore ha accettato — «Proponiamo un patto di amicizia.»`,
    `- Germania Ovest (FRG): [${LUG}, mossa] Bonn rafforza i confini.`,
    `- Cina (CHN): [${GEN}, mossa] Pechino riconosce il nuovo governo.`];
  const ORDINI3 = `Ordini recenti del giocatore, già eseguiti: [${GEN}] «Mobilito le riserve.».\n`;
  check('la richiesta del terzo turno ha i cinque quaderni dal più recente (Regno Unito, Unione Sovietica, Francia, Germania Ovest, Cina), di ognuno al massimo tre voci: per Francia, che ne ha quattro, resta fuori la mossa (le note, i messaggi e i contatti contano più delle mosse); poi gli ordini già eseguiti e le regole',
    P3.includes(STATO_MONDO + SOMMARIO2 + '\n' + INTESTAZIONE + RIGHE3.join('\n') + '\n' + ORDINI3 + REGOLE + 'Statistiche attuali (0-100):') && !P3.includes('Parigi invia osservatori'), P3.slice(P3.indexOf('Quaderno'), P3.indexOf('Quaderno') + 300));
  check('…senza risposte ai messaggi né colloqui la frase finale nomina soltanto il quaderno',
    P3.includes('(gli ordini del giocatore e le mosse delle altre nazioni)' + CONSEGUENZE + ' Nella narrativa e nel riepilogo del mondo tieni conto ' + CURA_NOTE + '. Rispondi SOLO con un oggetto JSON: {'), P3.slice(-1500, -900));

  // gli ordini: se ne tengono 8, al motore ne arrivano 4, ognuno al massimo di 100 caratteri (con i puntini se più lungo)
  const O = await ev(() => {
    const T = window.__t, S = T.getState();
    S.orders.length = 0;
    T.rememberOrders(['uno', 'due', 'tre', 'quattro', 'cinque', 'sei'], 'marzo 1961');
    T.rememberOrders(['sette', 'otto', 'nove', 'x'.repeat(150)], 'aprile 1961');
    return { kept: S.orders.map(o => [o.w, o.x.length]), text: T.memoryOrders(), lungo: S.orders[7].x };
  });
  check('degli ordini eseguiti se ne tengono otto (i più vecchi cadono) e al motore ne arrivano gli ultimi quattro, ciascuno con la sua data; un ordine di 150 caratteri si taglia a 100 con i puntini',
    uguali(O.kept, [['marzo 1961', 3], ['marzo 1961', 7], ['marzo 1961', 6], ['marzo 1961', 3], ['aprile 1961', 5], ['aprile 1961', 4], ['aprile 1961', 4], ['aprile 1961', 100]])
    && O.text === 'Ordini recenti del giocatore, già eseguiti: [aprile 1961] «sette»; [aprile 1961] «otto»; [aprile 1961] «nove»; [aprile 1961] «' + 'x'.repeat(99) + '…».\n' && O.lungo.endsWith('…'), O);

  // =============================================================== 5. le note del motore: che cosa vale e che cosa si scarta
  console.log('— le note del motore: che cosa vale e che cosa si scarta');
  await restart(PL);
  const NV = await ev(() => {
    const T = window.__t, S = T.getState(), out = {}, run = l => { try { const r = T.applyMemoryNotes(l); return [r.lines, r.refused]; } catch (e) { return ['ERRORE: ' + e.message]; } };     // un errore della pagina è un controllo fallito, non una prova che si ferma
    out.nonLista = [undefined, null, 'testo', 5, { nazione: 'FRA', nota: 'x' }].map(run);
    out.dopoNonLista = Object.keys(S.memory).length;
    out.nomi = run([{ nazione: 'FRA', nota: 'a' }, { paese: 'GBR', testo: 'b' }, { stato: 'Belgio', ricordo: 'c' }, { codice: 'URSS', memoria: 'd' }]);
    out.dopoNomi = Object.keys(S.memory).sort();
    const cattive = [{ nazione: 'ITA', nota: 'x' }, { nazione: 'Italia', nota: 'x' }, { nazione: 'Kennedy', nota: 'x' }, { nazione: 'ZZZ', nota: 'x' }, { nazione: 'FRA', nota: '' }, { nazione: 'FRA', nota: '   ' },
      { nazione: 'FRA' }, { nota: 'x' }, { nazione: 5, nota: 'x' }, { nazione: '', nota: 'x' }, 'FRA: x', null, [], 5];
    out.cattive = cattive.map(c => run([c]));
    out.dopoCattive = Object.keys(S.memory).length;
    const buone = n => Array.from({ length: n }, (_, i) => ({ nazione: 'FRA', nota: 'n' + (i + 1) }));
    out.sei = run(buone(6)); out.quattordici = run(buone(14)); out.tardive = run(Array.from({ length: 8 }, () => null).concat(buone(6)));
    S.memory = {}; S.memSeq = 0;
    const r = T.applyMemoryNotes([{ nazione: 'francia', nota: '  Promette   <b>aiuti</b>  ' }, { nazione: '  REGNO UNITO ', nota: 'y'.repeat(300) }, { nazione: 'il presidente della Francia', nota: 'z' }]);
    out.pulite = [r.lines, S.memory.FRA.e.map(x => x.x), S.memory.GBR.e[0].x.length, r.refused];
    return out;
  });
  check('una risposta che non è una lista (niente, testo, numero, un oggetto solo) non scrive nulla e non conta scarti',
    NV.nonLista.every(x => uguali(x, [[], 0])) && NV.dopoNonLista === 0, NV.nonLista);
  check('i nomi dei campi si leggono anche in altre parole (paese, stato, codice; testo, ricordo, memoria), e uno Stato si indica con il codice o il nome: quattro note buone, quattro quaderni',
    uguali(NV.nomi, [['Francia: a', 'Regno Unito: b', 'Belgio: c', 'Unione Sovietica: d'], 0]) && uguali(NV.dopoNomi, ['BEL', 'FRA', 'GBR', 'URSS']), NV.nomi);
  check('si scartano (e si contano) le note sul giocatore (codice o nome), su un nome che non è uno Stato della mappa (un capo di governo, un codice che non c\'è), senza testo o con testo vuoto, senza nazione, con la nazione che non è un testo, e le voci che non sono oggetti (14 casi): nessun quaderno nuovo',
    NV.cattive.length === 14 && NV.cattive.every(x => uguali(x, [[], 1])) && NV.dopoCattive === 4, NV.cattive.filter(x => !uguali(x, [[], 1])));
  check('al massimo quattro note per periodo: con sei buone, quattro si scrivono e due si scartano; delle voci se ne leggono dodici, il resto si scarta senza guardarlo (14 buone: quattro scritte, dieci scartate; otto vuote e poi sei buone: quattro scritte, dieci scartate)',
    uguali(NV.sei, [['Francia: n1', 'Francia: n2', 'Francia: n3', 'Francia: n4'], 2]) && uguali(NV.quattordici, [['Francia: n1', 'Francia: n2', 'Francia: n3', 'Francia: n4'], 10])
    && uguali(NV.tardive, [['Francia: n1', 'Francia: n2', 'Francia: n3', 'Francia: n4'], 10]), [NV.sei, NV.quattordici, NV.tardive]);
  check('il testo della nota si ripulisce (spazi, segni < >) e si taglia a 160 caratteri; il nome si legge in minuscole e con spazi, e «il presidente della Francia» vale Francia',
    uguali(NV.pulite[0], ['Francia: Promette b aiuti /b', 'Regno Unito: ' + 'y'.repeat(160), 'Francia: z']) && uguali(NV.pulite[1], ['Promette b aiuti /b', 'z']) && NV.pulite[2] === 160 && NV.pulite[3] === 0, NV.pulite);

  await restart(PL);
  await turn({ memoria: [NOTA('FRA', 'Buona'), NOTA('Kennedy', 'Chi?'), NOTA('ITA', 'Su di noi'), NOTA('GBR', ''), 'stringa', null, NOTA('BEL', 'Altra')] });
  check('un turno con sette note, due buone: la voce «Da ricordare» ha le due note e l\'avviso «scartate: 5»; i quaderni sono solo Belgio e Francia',
    uguali(await logLines('q'), [['Francia: Buona', 'Belgio: Altra', AVVISO_NOTE(5)]]) && uguali(await chiavi(), ['BEL', 'FRA']) && (await kinds()) === 't,q', [await logLines('q'), await chiavi()]);
  await turn({ memoria: [NOTA('ITA', 'x'), 'x'] });
  check('un turno con note tutte da scartare ha nella cronaca solo l\'avviso (due scartate) e non cambia i quaderni',
    uguali((await logLines('q'))[1], [AVVISO_NOTE(2)]) && uguali(await chiavi(), ['BEL', 'FRA']) && (await stato()).memSeq === 2, await logLines('q'));
  await turn({ memoria: 'una frase' }); await turn({ memoria: [] }); await turn({});
  check('se il motore scrive «memoria» come un testo, come una lista vuota o non la scrive affatto, la cronaca non ha la voce «Da ricordare»',
    (await kinds()) === 't,q,t,q,t,t,t', await kinds());
  await turn({ memoria: [1, 2, 3, 4, 5, 6].map(i => NOTA('FRA', 'Voce ' + i)) });
  check('sei note buone in un periodo: se ne scrivono quattro e l\'avviso dice che due sono oltre il massimo; il quaderno di Francia ha le quattro voci nuove in ordine, dopo quella di prima',
    uguali((await logLines('q'))[2], ['Francia: Voce 1', 'Francia: Voce 2', 'Francia: Voce 3', 'Francia: Voce 4', AVVISO_NOTE(2)]) && uguali(await voci('FRA'), [['e', 'Buona'], ['e', 'Voce 1'], ['e', 'Voce 2'], ['e', 'Voce 3'], ['e', 'Voce 4']]),
    [await logLines('q'), await voci('FRA')]);

  // =============================================================== 6. che cosa legge il motore: quali quaderni, quante voci, quanti caratteri
  console.log('— che cosa legge il motore: quali quaderni, quante voci, quanti caratteri');
  await restart(PL);
  const DIECI = ['FRA', 'GBR', 'BEL', 'ESP', 'PRT', 'GRC', 'TUR', 'SWE', 'CHN', 'URSS'];                  // scritti in quest'ordine: il primo è il più vecchio
  check('i dieci Stati della prova ci sono e hanno il nome che si aspetta la prova', uguali(DIECI.map(c => NOME[c]), ['Francia', 'Regno Unito', 'Belgio', 'Spagna', 'Portogallo', 'Grecia', 'Turchia', 'Svezia', 'Cina', 'Unione Sovietica']), DIECI.map(c => NOME[c]));
  await ev(l => { const T = window.__t; l.forEach((c, i) => T.memAdd(c, 'e', 'ricordo ' + (i + 1))); }, DIECI);
  const riga = c => `- ${NOME[c]} (${c}): [${PARTENZA}, nota] ricordo ${DIECI.indexOf(c) + 1}`;
  const come = (testo, codici) => testo === (codici.length ? INTESTAZIONE + codici.map(riga).join('\n') + '\n' : '');
  const B0 = await blocco('', []);
  check('il motore legge al massimo otto quaderni: i più recenti, dal più recente (i due più vecchi, Francia e Regno Unito, restano fuori)',
    come(B0, ['URSS', 'CHN', 'SWE', 'TUR', 'GRC', 'PRT', 'ESP', 'BEL']), B0);
  const B1 = await blocco('Mando una delegazione in Francia.', []), B2 = await blocco('', ['GBR']), B3 = await blocco('Mando una delegazione in Francia.', ['GBR']);
  check('uno Stato nominato negli ordini o nel riepilogo del mondo passa avanti anche se è il più vecchio (Francia); lo stesso per uno Stato dato come «in primo piano» (Regno Unito); se sono due, il più recente prima (Regno Unito, poi Francia); gli altri posti vanno ai più recenti',
    come(B1, ['FRA', 'URSS', 'CHN', 'SWE', 'TUR', 'GRC', 'PRT', 'ESP']) && come(B2, ['GBR', 'URSS', 'CHN', 'SWE', 'TUR', 'GRC', 'PRT', 'ESP']) && come(B3, ['GBR', 'FRA', 'URSS', 'CHN', 'SWE', 'TUR', 'GRC', 'PRT']), [B1, B2, B3].map(b => b.split('\n').length));
  await ev(() => { const S = window.__t.getState(); window.__t.memAdd('~kennedy', 't', 'Colloquio: il giocatore tace; nessuna risposta', 'Kennedy'); window.__t.memAdd('~de gaulle', 't', 'Colloquio: il giocatore tace; nessuna risposta', 'De Gaulle'); window.__t.memAdd('~il cancelliere', 'e', 'Mi deve un favore', 'il Cancelliere'); });
  const B4 = await blocco('', []);
  const loose = (nome, tag, testo) => `- «${nome}» (nome scritto dal giocatore: può essere uno Stato o un suo capo): [${PARTENZA}, ${tag}] ${testo}`;
  check('in una partita sulla mappa il motore legge al massimo due quaderni di nomi che non sono Stati (i due più recenti: il Cancelliere e De Gaulle; Kennedy no) e li presenta come nomi scritti dal giocatore; il posto che resta libero va a un quaderno di uno Stato',
    B4 === INTESTAZIONE + [loose('il Cancelliere', 'nota', 'Mi deve un favore'), loose('De Gaulle', 'colloquio', 'Colloquio: il giocatore tace; nessuna risposta')].concat(['URSS', 'CHN', 'SWE', 'TUR', 'GRC', 'PRT'].map(riga)).join('\n') + '\n', B4);
  await ev(() => { const T = window.__t; for (const id of T.getCountryProvinces('SWE')) T.changeProvinceOwner(id, 'NOR'); });
  const B5 = await blocco('', []);
  check('uno Stato che non esiste più (la Svezia, senza province) non è nel quaderno che legge il motore, e il suo posto va al successivo; il suo quaderno resta (si vede nel pannello)',
    B5.includes('(SWE)') === false && B5.includes('(ESP)') && B5.split('\n').length === 1 + 8 + 1 && (await memory()).SWE.e.length === 1, B5);
  // quante voci di un quaderno: al massimo tre, e quali
  await restart(PL);
  const V = await ev(() => {
    const T = window.__t;
    [['FRA', 'o', 'm1'], ['FRA', 'o', 'm2'], ['FRA', 'e', 'n3'], ['FRA', 'c', 'c4'], ['FRA', 't', 't5'], ['FRA', 'm', 'm6'], ['GBR', 'o', 'a'], ['GBR', 't', 'b'], ['GBR', 'o', 'c'], ['GBR', 'e', 'd']].forEach(([k, s, x]) => T.memAdd(k, s, x));
    return T.memoryBook('', []);
  });
  check('di un quaderno il motore legge al massimo tre voci: prima le note, i messaggi e i contatti (le più recenti), poi le mosse e i colloqui se c\'è posto (le più recenti); mostrate nell\'ordine in cui sono state scritte',
    V === INTESTAZIONE + `- Regno Unito (GBR): [${PARTENZA}, colloquio] b; [${PARTENZA}, mossa] c; [${PARTENZA}, nota] d\n- Francia (FRA): [${PARTENZA}, nota] n3; [${PARTENZA}, contatto] c4; [${PARTENZA}, messaggio] m6\n`, V);
  // al massimo 2.400 caratteri in tutto: quanti quaderni entrano
  const LUNGO = await ev(() => {
    const T = window.__t, x = 'a'.repeat(160);
    ['FRA', 'GBR', 'BEL', 'ESP', 'PRT', 'GRC', 'TUR', 'CHN'].forEach(c => { for (let i = 0; i < 3; i++) T.memAdd(c, 'e', x); });
    const b = T.memoryBook('', []), righe = b.split('\n').filter(l => l.startsWith('- '));
    return { righe: righe.length, somma: righe.reduce((n, l) => n + l.length, 0), codici: righe.map(l => l.slice(l.indexOf('(') + 1, l.indexOf(')'))) };
  });
  check('il quaderno che legge il motore ha al massimo 2.400 caratteri di righe: con otto quaderni da tre voci lunghe entrano i quattro più recenti (Cina, Turchia, Grecia, Portogallo: 573 + 576 + 575 + 579 = 2.303 caratteri); il quinto sarebbe di troppo',
    LUNGO.righe === 4 && LUNGO.somma === 2303 && uguali(LUNGO.codici, ['CHN', 'TUR', 'GRC', 'PRT']), LUNGO);

  // senza la mappa: ogni nome ha il suo quaderno; il motore legge tutti i nomi (non c'è il limite dei due) e i nomi sono semplici
  await restartLibera('Impero Romano', '400 d.C.');
  await turn({ nuovo_anno: '401 d.C.', mosse_altre_nazioni: [{ nazione: 'Persia', mossa: 'Ctesifonte arma i cavalieri.' }, { nazione: 'Impero Romano', mossa: 'Il giocatore stesso.' }, { nazione: 'Unni', mossa: 'Attila raduna le tribù.' }, 'Voci dal confine.'],
    memoria: [NOTA('Persia', 'Ha giurato vendetta.'), NOTA('Impero Romano', 'su di noi'), NOTA('Unni', 'Chiedono tributi.')] });
  const L1 = await memory();
  check('in una partita libera ogni nome ha un quaderno suo, con il nome com\'era scritto: Persia e Unni (mosse e note); la nazione del giocatore e la frase senza nome non scrivono nulla; la nota sul giocatore si scarta e si conta',
    uguali(perChiave(L1), { '~persia': { n: 'Persia', e: [voce(1, '401 d.C.', 'o', 'Ctesifonte arma i cavalieri.'), voce(3, '401 d.C.', 'e', 'Ha giurato vendetta.')] },
      '~unni': { n: 'Unni', e: [voce(2, '401 d.C.', 'o', 'Attila raduna le tribù.'), voce(4, '401 d.C.', 'e', 'Chiedono tributi.')] } })
    && uguali(await logLines('q'), [['Persia: Ha giurato vendetta.', 'Unni: Chiedono tributi.', AVVISO_NOTE(1)]]), L1);
  await turn({ nuovo_anno: '402 d.C.' });
  const PL2 = await promptAt(1);
  check('la richiesta del turno dopo, in una partita libera: i nomi senza codice, il più recente prima; le regole dicono «nome della nazione» e parlano solo di colloqui e mosse (non di messaggi e contatti, che senza mappa non ci sono); in fondo allo schema c\'è «memoria» con il nome',
    PL2.includes(STATO_MONDO + 'Riepilogo di prova.\n' + INTESTAZIONE + '- Unni: [401 d.C., mossa] Attila raduna le tribù.; [401 d.C., nota] Chiedono tributi.\n- Persia: [401 d.C., mossa] Ctesifonte arma i cavalieri.; [401 d.C., nota] Ha giurato vendetta.\n' + REGOLE_LIBERA + 'Statistiche attuali (0-100):')
    && PL2.endsWith(', "memoria": [{"nazione": "nome della nazione", "nota": "da ricordare, una frase"}]}') && !/messagg|contatt/i.test(PL2.slice(PL2.indexOf('Memoria: il quaderno'), PL2.indexOf('Statistiche attuali'))),
    PL2.slice(PL2.indexOf('Quaderno'), PL2.indexOf('Quaderno') + 500));

  // =============================================================== 7. i colloqui nella scheda Diplomazia: la nazione legge il suo quaderno, e ciò che si dice vi entra
  console.log('— i colloqui nella scheda Diplomazia');
  await restart(PL);
  await ev(() => { const T = window.__t; T.memAdd('FRA', 'o', 'Parigi manda osservatori'); T.memAdd('FRA', 'c', 'Patto con Londra'); T.memAdd('FRA', 'e', 'Promessa di aiuti'); T.memAdd('BEL', 'e', 'Debito di guerra'); });
  const elenco = await ev(() => [...document.querySelectorAll('#diploNations option')].map(o => o.value));
  const ordinato = await ev(l => l.slice().sort((a, b) => a.localeCompare(b, 'it')), elenco);
  check('in una partita sulla mappa il campo del nome del colloquio ha l\'elenco degli Stati (tutti tranne il tuo: 82), in ordine alfabetico, e una nota che dice di scrivere il nome di uno Stato per usare i suoi ricordi',
    elenco.length === 82 && !elenco.includes('Italia') && elenco.includes('Francia') && uguali(ordinato, elenco) && uguali(elenco.slice().sort(), altri.map(c => NOME[c]).sort())
    && (await testoDi('#diploTargetNote')) === 'Scrivi il nome di uno Stato (per esempio «Francia») per usare i suoi ricordi nel quaderno; con altri nomi, come un capo di governo, il colloquio ha un quaderno suo.', [elenco.length, elenco.slice(0, 3)]);
  await tabDiplo();
  await apriColloquio('Francia');
  check('aprendo un colloquio con «Francia» sotto il nome c\'è di chi è il quaderno e quante voci ha', (await testoDi('#diploMemNote')) === 'Quaderno di Francia: 3 voci.', await testoDi('#diploMemNote'));
  const RIC3 = ` Ciò che ricordi (dal più vecchio al più recente): [${PARTENZA}, mossa] Parigi manda osservatori; [${PARTENZA}, contatto] Patto con Londra; [${PARTENZA}, nota] Promessa di aiuti`;
  await queueText('Buongiorno, Italia'); await scrivi('Salve, Presidente');
  const H1 = await storia(), F1 = await voci('FRA');
  check('il primo messaggio del colloquio porta il quaderno di Francia («Ciò che ricordi», dal più vecchio, le tre voci) subito prima della frase sul rispondere in character',
    H1.length === 2 && H1[0].content.includes(RIC3 + '. Rispondi sempre in character, in italiano, con 2-4 frasi per turno, restando coerente col contesto storico.\n\nSalve, Presidente'), H1[0].content.slice(-420));
  check('ciò che si è detto entra nel quaderno di Francia come voce «colloquio» (che cosa ha detto il giocatore, che cosa ha risposto la nazione); sotto il nome ora le voci sono quattro',
    F1.length === 4 && uguali(F1[3], ['t', 'Colloquio: il giocatore dice «Salve, Presidente»; risposta: «Buongiorno, Italia»']) && (await testoDi('#diploMemNote')) === 'Quaderno di Francia: 4 voci.', [F1, await testoDi('#diploMemNote')]);
  await queueText('Il grano è caro'); await scrivi('Parliamo di grano');
  const H2 = await storia();
  check('un secondo messaggio nello stesso periodo parte così com\'è, senza nota davanti (il tempo non è passato); anche questo scambio entra nel quaderno',
    H2.length === 4 && H2[2].content === 'Parliamo di grano' && (await voci('FRA')).length === 5, [H2.map(m => m.content.slice(0, 40)), (await voci('FRA')).length]);
  await tabAzioni();
  await turn({ nuovo_anno: GEN, riepilogo_mondo: 'La Francia chiede un prestito', memoria: [NOTA('FRA', 'Chiede un prestito')] });
  await tabDiplo();
  await queueText('Il prestito è in esame'); await scrivi('Allora, il prestito?');
  const H3 = await storia();
  const RIC6 = ` Ciò che ricordi (dal più vecchio al più recente): [${PARTENZA}, mossa] Parigi manda osservatori; [${PARTENZA}, contatto] Patto con Londra; [${PARTENZA}, nota] Promessa di aiuti; `
    + `[${PARTENZA}, colloquio] Colloquio: il giocatore dice «Salve, Presidente»; risposta: «Buongiorno, Italia»; [${PARTENZA}, colloquio] Colloquio: il giocatore dice «Parliamo di grano»; risposta: «Il grano è caro»; [${GEN}, nota] Chiede un prestito`;
  check('dopo che il tempo è passato il messaggio successivo ha davanti una nota del gioco: la data, lo stato del mondo e il quaderno aggiornato di Francia (sei voci, dalla più vecchia, compresa la nota che il motore ha scritto), poi la frase del giocatore',
    H3.length === 6 && H3[4].content.startsWith('[Nota del gioco, non citarla: dall\'ultimo scambio il tempo è passato; ora è gennaio 1961. Stato del mondo: La Francia chiede un prestito.')
    && H3[4].content.endsWith(RIC6 + '. Tienine conto restando in character.]\n\nAllora, il prestito?'), H3[4].content);
  await queueText('Va bene'); await scrivi('Grazie');
  const H4 = await storia();
  check('…e una volta arrivata la nota, il messaggio dopo parte di nuovo così com\'è', H4.length === 8 && H4[6].content === 'Grazie', H4[6].content.slice(0, 80));

  // se la risposta non arriva, il messaggio non resta e il quaderno non cambia; il tentativo dopo porta di nuovo il contesto
  await chiudiColloquio(); await apriColloquio('Belgio');
  check('un quaderno con una voce: «Quaderno di Belgio: 1 voce.»', (await testoDi('#diploMemNote')) === 'Quaderno di Belgio: 1 voce.', await testoDi('#diploMemNote'));
  await ev(() => { window.__textQueue.push(new Error('guasto di prova')); });
  await scrivi('Salve');
  const HB1 = await storia(), BB1 = await voci('BEL');
  check('se la risposta non arriva il messaggio non resta nella storia del colloquio e nel quaderno non entra nulla (Belgio ha ancora la voce di prima)', HB1.length === 0 && uguali(BB1, [['e', 'Debito di guerra']]), [HB1, BB1]);
  await queueText('Salve a voi'); await scrivi('Salve di nuovo');
  const HB2 = await storia();
  check('…e il tentativo dopo è di nuovo il primo messaggio: ha il contesto con il quaderno di Belgio; ora le voci sono due',
    HB2.length === 2 && HB2[0].content.includes(` Ciò che ricordi (dal più vecchio al più recente): [${PARTENZA}, nota] Debito di guerra. Rispondi sempre in character`) && HB2[0].content.endsWith('\n\nSalve di nuovo') && (await voci('BEL')).length === 2, HB2[0] && HB2[0].content.slice(-300));

  // un nome che non è uno Stato della mappa: un quaderno suo, con il nome com'era scritto, che si ritrova scrivendolo di nuovo
  await chiudiColloquio(); await apriColloquio('il Cancelliere tedesco');
  const NOTA_NOME = 'Nome non riconosciuto come uno Stato della mappa: questo interlocutore ha un quaderno suo. Per usare quello di uno Stato scrivi il nome dello Stato (per esempio «Francia»).';
  check('con un nome che non è uno Stato della mappa la nota sotto il nome lo dice e spiega come usare il quaderno di uno Stato', (await testoDi('#diploMemNote')) === NOTA_NOME, await testoDi('#diploMemNote'));
  await queueText('Guten Tag'); await scrivi('Buongiorno, Cancelliere');
  const HC1 = await storia(), QC = (await memory())['~il cancelliere tedesco'];
  check('il primo messaggio non ha «Ciò che ricordi» (non c\'era un quaderno); dopo lo scambio c\'è un quaderno «~il cancelliere tedesco» che ricorda il nome com\'era scritto e la voce del colloquio',
    !HC1[0].content.includes('Ciò che ricordi') && QC && QC.n === 'il Cancelliere tedesco' && uguali(QC.e.map(x => [x.s, x.x]), [['t', 'Colloquio: il giocatore dice «Buongiorno, Cancelliere»; risposta: «Guten Tag»']]), [HC1[0].content.slice(-200), QC]);
  await chiudiColloquio(); await apriColloquio('IL  CANCELLIERE   TEDESCO');
  await queueText('Ancora lei'); await scrivi('Un\'altra cosa');
  const HC2 = await storia();
  check('riaprendo il colloquio con lo stesso nome scritto in altro modo (maiuscole, spazi) si ritrova lo stesso quaderno: il primo messaggio porta la voce di prima; i quaderni con parole sono ancora uno solo',
    HC2[0].content.includes(` Ciò che ricordi (dal più vecchio al più recente): [${GEN}, colloquio] Colloquio: il giocatore dice «Buongiorno, Cancelliere»; risposta: «Guten Tag». Rispondi sempre in character`)
    && (await chiavi()).filter(k => k[0] === '~').length === 1 && (await memory())['~il cancelliere tedesco'].e.length === 2, HC2[0].content.slice(-300));
  // il quaderno del giocatore non c'è: parlare con la propria nazione non scrive nulla
  const prima = (await chiavi()).join();
  await chiudiColloquio(); await apriColloquio('Italia');
  check('con la nazione del giocatore sotto il nome non c\'è nessuna nota di quaderno', (await testoDi('#diploMemNote')) === '', await testoDi('#diploMemNote'));
  await queueText('Siamo noi'); await scrivi('Parlo da solo');
  check('…e lo scambio non crea nessun quaderno', (await chiavi()).join() === prima, [await chiavi(), prima]);
  await chiudiColloquio();

  // «Rispondi» a un messaggio: il quaderno è davanti al messaggio che la nazione aveva scritto; la risposta con un colloquio vale «ha risposto con un colloquio»
  await restart(PL); await tabAzioni();
  await ev(() => { window.__t.memAdd('FRA', 'e', 'Promessa di aiuti'); });
  await turn({ messaggi: M3 });
  await clicca('m1', 'reply');
  await queueText('Accettiamo volentieri'); await scrivi('Volentieri, parliamone');
  const HM = await storia();
  check('un colloquio aperto con «Rispondi» porta il quaderno di Francia prima del messaggio che la nazione aveva scritto',
    HM[0].content.includes(` Ciò che ricordi (dal più vecchio al più recente): [${PARTENZA}, nota] Promessa di aiuti. Poco fa hai scritto tu al giocatore questo messaggio (`), HM[0].content.slice(-520));
  await tabAzioni();
  await turn({ nuovo_anno: LUG });
  const PM = await lastPrompt(), QM = await memory();
  check('il turno dopo: il messaggio a cui si è risposto con un colloquio vale «ha risposto con un colloquio» (gli altri due, senza risposta, «non ha risposto»), dopo la voce del colloquio; il motore legge nel quaderno anche il colloquio',
    uguali(QM.FRA.e.map(x => [x.s, x.x]), [['e', 'Promessa di aiuti'], ['t', 'Colloquio: il giocatore dice «Volentieri, parliamone»; risposta: «Accettiamo volentieri»'], ['m', 'Proposta di accordo al giocatore (peso 4); il giocatore ha risposto con un colloquio — «Proponiamo un patto di amicizia.»']])
    && uguali(QM.URSS.e.map(x => [x.s, x.x]), [['m', 'Ultimatum al giocatore (peso 5); il giocatore non ha risposto — «Ritirate le truppe.»']])
    && uguali(QM.GBR.e.map(x => [x.s, x.x]), [['m', 'Richiesta di colloquio al giocatore (peso 2); il giocatore non ha risposto — «Vorremmo incontrarvi.»']])
    && PM.includes(`- Francia (FRA): [${PARTENZA}, nota] Promessa di aiuti; [${GEN}, colloquio] Colloquio: il giocatore dice «Volentieri, parliamone»; risposta: «Accettiamo volentieri»\n`), QM.FRA.e.map(x => x.x));

  // senza la mappa: nessun elenco di Stati; ogni nome ha il suo quaderno
  await restartLibera('Impero Romano', '400 d.C.');
  await tabDiplo();
  check('senza la mappa il campo del nome non ha l\'elenco degli Stati e la nota dice che ogni nome ha il suo quaderno',
    (await ev(() => document.querySelectorAll('#diploNations option').length)) === 0 && (await testoDi('#diploTargetNote')) === 'Il colloquio ha un quaderno suo per ogni nome: si ritrova scrivendo lo stesso nome.', await testoDi('#diploTargetNote'));
  await apriColloquio('Persia');
  check('…e sotto il nome di un colloquio la nota dice che l\'interlocutore ha un quaderno suo', (await testoDi('#diploMemNote')) === 'Questo interlocutore ha un quaderno suo: si ritrova scrivendo lo stesso nome.', await testoDi('#diploMemNote'));
  await queueText('Salve, console'); await scrivi('Pace?');
  check('il colloquio entra in un quaderno «~persia» che ricorda il nome com\'era scritto',
    uguali(perChiave(await memory()), { '~persia': { n: 'Persia', e: [voce(1, '400 d.C.', 't', 'Colloquio: il giocatore dice «Pace?»; risposta: «Salve, console»')] } }), await memory());
  await chiudiColloquio(); await apriColloquio('PERSIA');
  await queueText('Ancora voi'); await scrivi('Un\'altra cosa');
  const HL = await storia();
  check('riaprendo con «PERSIA» si ritrova lo stesso quaderno: il primo messaggio porta la voce di prima; il quaderno resta uno solo',
    HL[0].content.includes(' Ciò che ricordi (dal più vecchio al più recente): [400 d.C., colloquio] Colloquio: il giocatore dice «Pace?»; risposta: «Salve, console». Rispondi sempre in character') && (await chiavi()).join() === '~persia', HL[0].content.slice(-300));
  await chiudiColloquio();

  // =============================================================== 8. il Consigliere: legge il quaderno, gli ordini già eseguiti e i suoi ultimi consigli
  console.log('— il Consigliere');
  await restart(PL); await tabAzioni();
  const consiglia = async testo => { if (testo !== undefined) await queueText(testo); await page.click('#advisorBtn'); await spinnerOff(); };
  await consiglia('Rafforza il fronte orientale');
  const A1 = await lastPrompt();
  check('a quaderno vuoto, senza ordini eseguiti e senza consigli la richiesta al Consigliere non ha nulla di tutto questo e finisce come sempre',
    !A1.includes('Quaderno delle nazioni') && !A1.includes('Ordini già eseguiti') && !A1.includes('Consigli che hai già dato') && A1.endsWith(' Dai un breve consiglio strategico (2-3 frasi) su cosa potrebbe fare ora, in italiano.'), A1.slice(-300));
  check('il consiglio dato si salva con la data e sta anche nella cronaca; è l\'unico', uguali((await stato()).advice, [{ w: PARTENZA, x: 'Rafforza il fronte orientale' }]) && (await kinds()) === 'v', [(await stato()).advice, await kinds()]);
  await ev(() => {
    const T = window.__t;
    ['GBR', 'BEL', 'ESP', 'PRT', 'GRC'].forEach(c => T.memAdd(c, 'e', 'ricordo ' + c));
    T.memAdd('FRA', 'o', 'm1'); T.memAdd('FRA', 'e', 'n2'); T.memAdd('FRA', 'c', 'c3');
    T.rememberOrders(['Ordine uno', 'Ordine due'], 'marzo 1961');
  });
  await consiglia('Tratta con Parigi');
  const A2 = await lastPrompt();
  const ATTESO_A2 = ` Quaderno delle nazioni (ciò che ricordano): Francia: [${PARTENZA}, nota] n2; [${PARTENZA}, contatto] c3 | Grecia: [${PARTENZA}, nota] ricordo GRC | Portogallo: [${PARTENZA}, nota] ricordo PRT`
    + ` | Spagna: [${PARTENZA}, nota] ricordo ESP | Belgio: [${PARTENZA}, nota] ricordo BEL.`
    + ' Ordini già eseguiti di recente: [marzo 1961] «Ordine uno»; [marzo 1961] «Ordine due».'
    + ` Consigli che hai già dato (non ripeterli: dì se la situazione è cambiata, altrimenti dai un consiglio nuovo): [${PARTENZA}] «Rafforza il fronte orientale».`
    + ' Dai un breve consiglio strategico (2-3 frasi) su cosa potrebbe fare ora, in italiano.';
  check('con quaderno, ordini e un consiglio già dato la richiesta al Consigliere li porta in fondo, prima dell\'invito a consigliare: i cinque quaderni scritti per ultimi (Francia, Grecia, Portogallo, Spagna, Belgio: il Regno Unito, il più vecchio, resta fuori), di ognuno due voci (note e contatti prima delle mosse), gli ordini e il consiglio già dato tra virgolette',
    A2.endsWith(ATTESO_A2), A2.slice(-900));
  await consiglia('Terzo consiglio'); await consiglia('Quarto: ' + 'q'.repeat(300));
  const AD = (await stato()).advice;
  check('dei consigli se ne tengono tre (il più vecchio cade); il testo si taglia a 220 caratteri con i puntini',
    AD.length === 3 && uguali(AD.map(a => a.x.slice(0, 12)), ['Tratta con P', 'Terzo consig', 'Quarto: qqqq']) && AD[2].x.length === 220 && AD[2].x.endsWith('…'), AD.map(a => a.x.length));
  await ev(() => { window.__t.rememberOrders(['O3', 'O4', 'O5', 'O6'], 'maggio 1961'); });
  await consiglia('Quinto');
  const A5 = await lastPrompt();
  check('la richiesta dopo quattro consigli ha gli ultimi tre, dal più vecchio, ognuno tra virgolette con la sua data; degli ordini ne arrivano gli ultimi quattro (O3…O6) e i due più vecchi non ci sono più',
    A5.includes(` Consigli che hai già dato (non ripeterli: dì se la situazione è cambiata, altrimenti dai un consiglio nuovo): [${PARTENZA}] «Tratta con Parigi» | [${PARTENZA}] «Terzo consiglio» | [${PARTENZA}] «Quarto: ${'q'.repeat(211)}…».`)
    && A5.includes(' Ordini già eseguiti di recente: [maggio 1961] «O3»; [maggio 1961] «O4»; [maggio 1961] «O5»; [maggio 1961] «O6».') && !A5.includes('Ordine uno') && !A5.includes('Ordine due') && !A5.includes('Rafforza il fronte'), A5.slice(-700));
  await tabAzioni(); await turn({ nuovo_anno: GEN });
  const PC = await lastPrompt();
  check('i consigli non vanno al motore: la richiesta del turno non li nomina; gli ordini già eseguiti sì (sono fatti del gioco)',
    !PC.includes('Terzo consiglio') && !PC.includes('Quarto: qqq') && !PC.includes('Quinto') && !PC.includes('Consigli che hai già dato') && PC.includes('Ordini recenti del giocatore, già eseguiti: [maggio 1961] «O3»; [maggio 1961] «O4»; [maggio 1961] «O5»; [maggio 1961] «O6».\n'), PC.slice(PC.indexOf('Ordini recenti'), PC.indexOf('Ordini recenti') + 200));
  const nAdv = (await stato()).advice.length;
  await ev(() => { window.__textQueue.push(new Error('guasto di prova')); });
  await page.click('#advisorBtn'); await spinnerOff();
  check('se il Consigliere non risponde la cronaca ha l\'avviso e i consigli restano come erano (Terzo, Quarto, Quinto)',
    (await testoDi('#log')).includes('Consigliere non disponibile ora.') && (await stato()).advice.length === nAdv && uguali((await stato()).advice.map(a => a.x.slice(0, 6)), ['Terzo ', 'Quarto', 'Quinto']), (await stato()).advice);

  // =============================================================== 9. il salvataggio, il caricamento e i documenti rotti messi apposta
  console.log('— il salvataggio, il caricamento e i documenti rotti messi apposta');
  await restart(PL);
  const VUOTO = await ev(() => JSON.parse(JSON.stringify(window.__t.buildSavePayload())));
  check('con il quaderno vuoto, senza ordini e senza consigli il salvataggio non ha i tre campi', !('memory' in VUOTO.game) && !('orders' in VUOTO.game) && !('advice' in VUOTO.game), Object.keys(VUOTO.game));
  await ev(() => {
    const T = window.__t;
    T.memAdd('FRA', 'o', 'Mossa uno'); T.memAdd('GBR', 'c', 'Contatto due'); T.memAdd('FRA', 'e', 'Nota tre');
    T.memAdd('~il cancelliere tedesco', 't', 'Colloquio quattro', 'il Cancelliere tedesco');
    T.rememberOrders(['Ordine A', 'Ordine B'], 'marzo 1961'); T.rememberAdvice('Consiglio X'); T.rememberAdvice('Consiglio Y');
  });
  const SV = await ev(() => JSON.parse(JSON.stringify(window.__t.buildSavePayload())));
  const LISTA = [
    { k: '~il cancelliere tedesco', n: 'il Cancelliere tedesco', e: [{ n: 4, w: PARTENZA, s: 't', x: 'Colloquio quattro' }] },
    { k: 'FRA', n: '', e: [{ n: 1, w: PARTENZA, s: 'o', x: 'Mossa uno' }, { n: 3, w: PARTENZA, s: 'e', x: 'Nota tre' }] },
    { k: 'GBR', n: '', e: [{ n: 2, w: PARTENZA, s: 'c', x: 'Contatto due' }] }];
  check('il salvataggio ha il quaderno come lista (in cima il quaderno scritto per ultimo), gli ultimi ordini e gli ultimi consigli, ciascuno con la sua data',
    uguali(SV.game.memory, LISTA) && uguali(SV.game.orders, [{ w: 'marzo 1961', x: 'Ordine A' }, { w: 'marzo 1961', x: 'Ordine B' }]) && uguali(SV.game.advice, [{ w: PARTENZA, x: 'Consiglio X' }, { w: PARTENZA, x: 'Consiglio Y' }]), SV.game.memory);
  await ev(() => { const T = window.__t; T.memAdd('BEL', 'e', 'da cancellare'); T.rememberOrders(['da cancellare'], 'x'); T.rememberAdvice('da cancellare'); });
  await ev(d => { window.__t.applySave(d); }, SV);
  const R = await memory(), SR = await stato();
  const ATTESO_R = { FRA: { n: '', e: [voce(1, PARTENZA, 'o', 'Mossa uno'), voce(3, PARTENZA, 'e', 'Nota tre')] }, GBR: { n: '', e: [voce(2, PARTENZA, 'c', 'Contatto due')] },
    '~il cancelliere tedesco': { n: 'il Cancelliere tedesco', e: [voce(4, PARTENZA, 't', 'Colloquio quattro')] } };
  check('ricaricando il salvataggio il quaderno, gli ordini e i consigli sono quelli salvati (ciò che c\'era prima sparisce); il numero progressivo riparte dal più alto (4)',
    uguali(perChiave(R), perChiave(ATTESO_R)) && SR.memSeq === 4 && uguali(SR.orders, SV.game.orders) && uguali(SR.advice, SV.game.advice), [R, SR]);
  await ev(() => { window.__t.memAdd('FRA', 'e', 'Nota cinque'); });
  check('la voce scritta dopo il caricamento ha il numero 5', (await memory()).FRA.e.slice(-1)[0].n === 5, (await memory()).FRA.e);
  const VECCHIO = await ev(d => { const c = JSON.parse(JSON.stringify(d)); delete c.game.memory; delete c.game.orders; delete c.game.advice; window.__t.applySave(c);
    const S = window.__t.getState(); return { mem: Object.keys(S.memory).length, orders: S.orders.length, advice: S.advice.length, seq: S.memSeq }; }, SV);
  check('un salvataggio di una versione precedente (senza quaderno, ordini e consigli) si carica con tutto vuoto', uguali(VECCHIO, { mem: 0, orders: 0, advice: 0, seq: 0 }), VECCHIO);

  // il documento rotto: ogni voce sbagliata se ne va, il resto resta
  const DOC = [
    { k: 'FRA', n: 'ignorato', e: [{ n: 5, w: 'gennaio', s: 'e', x: 'Nota cinque' }, { n: 2, w: 'gennaio', s: 'm', x: 'Messaggio due' }] },
    { k: 'FRA', e: [{ n: 1, w: 'x', s: 'e', x: 'doppione' }] },
    { k: 'fra', e: [{ n: 1, w: 'x', s: 'e', x: 'minuscolo' }] },
    { k: 'ZZZ', e: [{ n: 1, w: 'x', s: 'e', x: 'non esiste' }] },
    { k: 'ITA', e: [{ n: 3, w: 'x', s: 'e', x: 'il giocatore' }] },
    { k: '~Maiuscole', e: [{ n: 1, w: 'x', s: 'e', x: 'chiave non valida' }] },
    { k: '~' + 'x'.repeat(41), e: [{ n: 1, w: 'x', s: 'e', x: 'chiave troppo lunga' }] },
    { k: '~ok key', n: '<b>Ok</b> Key', e: [{ n: 4, w: 'luglio', s: 't', x: 'Colloquio' }] },
    { k: 'BEL', e: [{ n: 1, w: 'w', s: 'z', x: 'origine ignota' }, { n: 2, w: 'w', s: 'e', x: '' }, 'testo', null, { n: 6, w: 'w'.repeat(40), s: 'e', x: 'y'.repeat(300) }] },
    { k: 'DNK', e: [] },
    { k: 'NLD', e: Array.from({ length: 12 }, (_, i) => ({ n: 10 + i, w: 'x', s: 'o', x: 'v' + (i + 1) })) },
    'testo', null, [], { e: [] }, { k: 5, e: [] }];
  const carica = doc => ev(([d, doc]) => { const c = JSON.parse(JSON.stringify(d)); c.game.memory = doc; window.__t.applySave(c);
    const S = window.__t.getState(); return { mem: JSON.parse(JSON.stringify(S.memory)), seq: S.memSeq }; }, [SV, doc]);
  const HO = await carica(DOC);
  const ATTESO_HO = {
    FRA: { n: '', e: [voce(1, 'gennaio', 'm', 'Messaggio due'), voce(4, 'gennaio', 'e', 'Nota cinque')] },
    '~ok key': { n: 'b Ok /b Key', e: [voce(3, 'luglio', 't', 'Colloquio')] },
    BEL: { n: '', e: [voce(5, 'w'.repeat(24), 'e', 'y'.repeat(160))] },
    NLD: { n: '', e: Array.from({ length: 10 }, (_, i) => voce(6 + i, 'x', 'o', 'v' + (i + 3))) } };
  check('un documento con quaderni rotti: restano solo quelli validi (Francia con le voci rimesse in ordine, «~ok key» con il nome ripulito, Belgio con l\'unica voce buona, data a 24 e testo a 160, Paesi Bassi con le ultime dieci voci); se ne vanno il doppione, il codice in minuscolo o che non c\'è, il quaderno del giocatore, le chiavi con maiuscole o troppo lunghe, i quaderni senza voci e le voci che non sono quaderni',
    uguali(perChiave(HO.mem), perChiave(ATTESO_HO)) && HO.seq === 15, [Object.keys(HO.mem), HO.seq]);
  const MOLTI = await carica(altri.slice(0, 40).map((c, i) => ({ k: c, e: [{ n: i + 1, w: 'x', s: 'e', x: 'voce ' + c }] })));
  check('un documento con quaranta quaderni ne tiene i primi trenta', Object.keys(MOLTI.mem).length === 30 && uguali(Object.keys(MOLTI.mem).sort(), altri.slice(0, 30).sort()), Object.keys(MOLTI.mem).length);
  const NONLISTA = [];
  for (const v of ['testo', 5, {}, null, true]) NONLISTA.push(Object.keys((await carica(v)).mem).length);
  check('un campo «memory» che non è una lista (testo, numero, oggetto, nulla) dà un quaderno vuoto', NONLISTA.every(n => n === 0), NONLISTA);
  const HA = await ev(([d]) => {
    const c = JSON.parse(JSON.stringify(d));
    c.game.orders = [{ w: 'a', x: 'ok1' }, { w: 'b', x: '' }, 'x', null, [], ...Array.from({ length: 10 }, (_, i) => ({ w: 'w' + i, x: 'o' + i })), { w: 'z'.repeat(40), x: 'L'.repeat(300) }];
    c.game.advice = ['x', null, ...Array.from({ length: 5 }, (_, i) => ({ w: 'd' + i, x: 'c' + i })), { w: 'e', x: 'M'.repeat(400) }];
    window.__t.applySave(c);
    const S = window.__t.getState(); return { orders: JSON.parse(JSON.stringify(S.orders)), advice: JSON.parse(JSON.stringify(S.advice)) };
  }, [SV]);
  check('ordini e consigli di un documento rotto: valgono solo quelli con data e testo, gli ultimi otto ordini (testo a 100 caratteri, data a 24) e gli ultimi tre consigli (testo a 220)',
    uguali(HA.orders, ['o3', 'o4', 'o5', 'o6', 'o7', 'o8', 'o9'].map(x => ({ w: 'w' + x.slice(1), x })).concat([{ w: 'z'.repeat(24), x: 'L'.repeat(100) }]))
    && uguali(HA.advice, [{ w: 'd3', x: 'c3' }, { w: 'd4', x: 'c4' }, { w: 'e', x: 'M'.repeat(220) }]), [HA.orders.map(o => o.x.length), HA.advice.map(a => a.x.length)]);
  await restartLibera('Impero Romano', '400 d.C.');
  const LS = await ev(() => JSON.parse(JSON.stringify(window.__t.buildSavePayload())));
  const HL2 = await ev(d => { const c = JSON.parse(JSON.stringify(d)); c.game.memory = [{ k: 'FRA', e: [{ n: 1, w: 'x', s: 'e', x: 'codice' }] }, { k: '~persia', n: 'Persia', e: [{ n: 2, w: '400 d.C.', s: 'e', x: 'vendetta' }] }];
    window.__t.applySave(c); return JSON.parse(JSON.stringify(window.__t.getState().memory)); }, LS);
  check('un documento di partita libera con un quaderno di uno Stato (codice) lo scarta e tiene quello con il nome scritto; i numeri ripartono da 1', uguali(HL2, { '~persia': { n: 'Persia', e: [voce(1, '400 d.C.', 'e', 'vendetta')] } }), HL2);

  // =============================================================== 10. che cosa vede il giocatore: il pannello, la cronaca, l'aspetto
  console.log('— il pannello «Quaderno delle nazioni», la cronaca e l\'aspetto');
  const pann = () => ev(() => {
    const b = document.getElementById('memBox');
    return { hidden: document.getElementById('memPanel').classList.contains('hidden'), title: document.getElementById('memTitle').textContent, gist: document.getElementById('memGist').textContent,
      summary: document.getElementById('memSummary').textContent, open: b.open, note: document.getElementById('memNote').textContent,
      items: [...document.querySelectorAll('#memList > li')].map(li => ({ name: li.querySelector('.mem-name').textContent, entries: [...li.querySelectorAll('.mem-entries li')].map(e => e.textContent) })) };
  });
  const NOTA_MAPPA = 'Ogni nazione ricorda ciò che le succede: i messaggi che ti ha scritto e come hai risposto, i contatti con altre nazioni, i colloqui, le sue mosse e le note che il motore scrive quando c\'è una promessa, un impegno o un rancore da ricordare. '
    + 'Il motore a ogni «Avanza», i colloqui nella scheda Diplomazia e il Consigliere leggono il quaderno. Le note del motore fanno parte della storia generata, non sono storia vera. '
    + 'Ogni nazione tiene al massimo 10 voci: quando sono troppe cadono prima le più vecchie fra mosse e colloqui. Un nome che non è uno Stato della mappa (un capo di governo, un titolo) ha un quaderno suo. Il quaderno si salva con la partita.';
  const NOTA_LIBERA = 'Ogni nazione ricorda ciò che le succede: i colloqui, le sue mosse e le note che il motore scrive quando c\'è una promessa, un impegno o un rancore da ricordare. '
    + 'Il motore a ogni «Avanza», i colloqui nella scheda Diplomazia e il Consigliere leggono il quaderno. Le note del motore fanno parte della storia generata, non sono storia vera. '
    + 'Ogni nazione tiene al massimo 10 voci: quando sono troppe cadono prima le più vecchie fra mosse e colloqui. Senza la mappa ogni nome ha il suo quaderno: si ritrova scrivendolo allo stesso modo. Il quaderno si salva con la partita.';
  await ev(() => window.__t.resetGame());
  const p0 = await pann();
  check('prima di una partita il pannello del quaderno non si vede e l\'elenco è vuoto', p0.hidden && p0.items.length === 0, p0);
  await restart(PL);
  const p1 = await pann();
  check('in una partita sulla mappa, a quaderno vuoto, il pannello c\'è («Quaderno delle nazioni»), dice che è ancora vuoto, il riquadro «Che cosa ricordano le nazioni» è chiuso e spiega, con la mappa, che cosa ricorda ogni nazione',
    !p1.hidden && p1.title === 'Quaderno delle nazioni' && p1.gist === 'Ancora vuoto: si riempie man mano che passa il tempo, che rispondi ai messaggi e che parli con le nazioni.'
    && p1.summary === 'Che cosa ricordano le nazioni' && p1.open === false && p1.note === NOTA_MAPPA && p1.items.length === 0, p1);
  await ev(() => { const T = window.__t; T.memAdd('FRA', 'o', 'Mossa uno'); T.renderMemory(); });
  const p2 = await pann();
  check('con una sola voce in un solo quaderno il riassunto va al singolare e il riquadro dice «(1)»',
    p2.gist === '1 voce nel quaderno, di 1 nazione. Scritta per ultima: Francia.' && p2.summary === 'Che cosa ricordano le nazioni (1)'
    && uguali(p2.items, [{ name: 'Francia', entries: [`${PARTENZA} · mossa: Mossa uno`] }]), p2);
  await ev(() => { const T = window.__t; T.memAdd('GBR', 'c', 'Contatto due'); T.memAdd('FRA', 'e', 'Nota tre'); T.memAdd('~il cancelliere tedesco', 't', 'Colloquio quattro', 'il Cancelliere tedesco'); T.renderMemory(); });
  const p3 = await pann();
  check('con quattro voci in tre quaderni: «4 voci nel quaderno, di 3 nazioni. Scritta per ultima: il Cancelliere tedesco.», il riquadro dice «(3)»; i quaderni stanno dal più recente, ogni voce ha data, origine e testo; il nome che non è uno Stato dice che non lo è',
    p3.gist === '4 voci nel quaderno, di 3 nazioni. Scritta per ultima: il Cancelliere tedesco.' && p3.summary === 'Che cosa ricordano le nazioni (3)'
    && uguali(p3.items, [{ name: 'il Cancelliere tedesco (non è uno Stato della mappa)', entries: [`${PARTENZA} · colloquio: Colloquio quattro`] },
      { name: 'Francia', entries: [`${PARTENZA} · mossa: Mossa uno`, `${PARTENZA} · nota: Nota tre`] }, { name: 'Regno Unito', entries: [`${PARTENZA} · contatto: Contatto due`] }]), p3);
  await page.focus('#memSummary'); await page.keyboard.press('Enter');
  const aperto = await ev(() => document.getElementById('memBox').open);
  await page.keyboard.press('Enter');
  const chiuso = await ev(() => !document.getElementById('memBox').open);
  const altezza = await ev(() => document.getElementById('memSummary').getBoundingClientRect().height);
  check('il riquadro si apre e si chiude con la tastiera (Invio sul titolo) e il titolo è abbastanza grande da toccare (almeno 24 pixel)', aperto && chiuso && altezza >= 24, [aperto, chiuso, altezza]);
  const XSS = await ev(() => {
    const T = window.__t, S = T.getState();
    S.memory.FRA.e[0].x = '<img src=x onerror="window.__pwn=1"> <b>grassetto</b>';
    S.memory['~x y'] = { n: '<i>nome</i>', e: [{ n: 99, w: '<u>data</u>', s: 'e', x: '<script>window.__pwn=2<\/script>' }] };
    T.renderMemory();
    return { tag: document.querySelectorAll('#memList img, #memList b, #memList i, #memList u, #memList script').length, pwn: window.__pwn === undefined,
      testo: [...document.querySelectorAll('#memList .mem-entries li')].map(l => l.textContent).join(' | '), nome: [...document.querySelectorAll('#memList .mem-name')].map(l => l.textContent).join(' | ') };
  });
  check('un testo, una data o un nome con tag HTML nel quaderno si vede come testo: nessun elemento nato da lì e nessuno script eseguito',
    XSS.tag === 0 && XSS.pwn && XSS.testo.includes('<img src=x onerror="window.__pwn=1"> <b>grassetto</b>') && XSS.testo.includes('<script>window.__pwn=2</script>') && XSS.nome.includes('<i>nome</i>'), XSS);

  // senza la mappa il riquadro spiega altro, e nessun nome dice «non è uno Stato»
  await restartLibera('Impero Romano', '400 d.C.');
  await ev(() => { const T = window.__t; T.memAdd('~persia', 'e', 'Vendetta', 'Persia'); T.renderMemory(); });
  const pl = await pann();
  check('in una partita libera il pannello c\'è, il riquadro non nomina messaggi e contatti, e il nome di un quaderno è semplice (senza «non è uno Stato della mappa»)',
    !pl.hidden && pl.note === NOTA_LIBERA && !/messagg|contatt/i.test(pl.note) && uguali(pl.items, [{ name: 'Persia', entries: ['400 d.C. · nota: Vendetta'] }]) && pl.gist === '1 voce nel quaderno, di 1 nazione. Scritta per ultima: Persia.', pl);

  // la cronaca e il pannello dopo un turno vero e dopo un colloquio: si ridisegnano da soli
  await restart(PL); await tabAzioni();
  await turn({ nuovo_anno: GEN, mosse_altre_nazioni: [{ nazione: 'Francia', mossa: 'Parigi invia osservatori.' }], memoria: [NOTA('Unione Sovietica', 'Non perdona la nota')] });
  const pt = await pann();
  check('dopo un turno il pannello mostra da solo le voci nuove: Unione Sovietica (nota) prima, poi Francia (mossa), con la data del turno',
    uguali(pt.items, [{ name: 'Unione Sovietica', entries: [`${GEN} · nota: Non perdona la nota`] }, { name: 'Francia', entries: [`${GEN} · mossa: Parigi invia osservatori.`] }]) && pt.gist === '2 voci nel quaderno, di 2 nazioni. Scritta per ultima: Unione Sovietica.', pt);
  await tabDiplo(); await apriColloquio('Belgio'); await queueText('Salve'); await scrivi('Buongiorno');
  const pc = await pann();
  check('dopo uno scambio in un colloquio il pannello mostra da solo la voce del colloquio (Belgio per primo)',
    pc.items[0].name === 'Belgio' && uguali(pc.items[0].entries, [`${GEN} · colloquio: Colloquio: il giocatore dice «Buongiorno»; risposta: «Salve»`]) && pc.gist === '3 voci nel quaderno, di 3 nazioni. Scritta per ultima: Belgio.', pc);
  await chiudiColloquio(); await tabAzioni();

  // l'aspetto: stretto (360 px) con parole lunghe senza spazi, e i contrasti dei testi nei due temi
  await restart(PL); await tabAzioni();
  const LUNGA = 'a'.repeat(160), NOME_LUNGO = 'n'.repeat(60);
  await turn({ memoria: [NOTA('FRA', LUNGA)] });
  await ev(([l, n]) => { const T = window.__t; T.memAdd('~' + n, 'e', l, n); T.renderMemory(); document.getElementById('memBox').open = true; }, [LUNGA, NOME_LUNGO]);
  await page.setViewportSize({ width: 360, height: 800 });
  const larg = await ev(() => { const de = document.documentElement, ok = (id) => { const e = document.getElementById(id); return e.scrollWidth <= e.clientWidth + 1; };
    const q = document.querySelector('.entry-mem'); return { pagina: de.scrollWidth <= de.clientWidth, log: ok('log'), elenco: ok('memList'), voce: q.scrollWidth <= q.clientWidth + 1, righe: document.querySelectorAll('#memList .mem-entries li').length }; });
  check('a 360 pixel di larghezza una voce di 160 lettere senza spazi e un nome di 60 lettere vanno a capo: né la pagina né la cronaca né l\'elenco del quaderno si allargano', larg.pagina && larg.log && larg.elenco && larg.voce && larg.righe === 2, larg);
  await page.setViewportSize({ width: 640, height: 1100 });
  await ev(() => { document.getElementById('memBox').open = false; });
  const contrasti = () => ev(() => {
    const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
    const lum = ({ r, g, b }) => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const fondo = n => { for (let e = n; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.99) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
    const rap = n => { const t = parse(getComputedStyle(n).color), s = fondo(n), a = lum(t), b = lum(s); return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100; };
    const out = {};
    for (const s of ['#memTitle', '#memGist', '#memSummary', '#memNote', '.mem-name', '.mem-tag', '.mem-entries li', '.entry-mem', '#diploMemNote', '#diploTargetNote']) { const n = document.querySelector(s); out[s] = n ? rap(n) : null; }
    return out;
  });
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme });
    const cr = await contrasti();
    const bassi = Object.entries(cr).filter(([, v]) => v === null || v < 4.5);
    check('contrasto dei testi del quaderno (pannello, nota sotto il nome di un colloquio, voce nella cronaca) nel tema ' + (scheme === 'light' ? 'chiaro' : 'scuro') + ': almeno 4,5 a 1', bassi.length === 0, bassi);
  }
  await page.emulateMedia({ colorScheme: 'light' });

  // =============================================================== 11. un turno che non riesce non scrive nulla, e nemmeno una risposta che arriva tardi
  console.log('— un turno che non riesce non scrive nulla');
  const spinnerOn = () => page.waitForFunction(() => !document.getElementById('thinking').classList.contains('hidden'));
  await restart(PL); await tabAzioni();
  await ev(() => { window.__t.memAdd('FRA', 'e', 'Nota prima'); });
  await turn({ messaggi: M3 });
  await clicca('m1', 'accept'); await ordine('Un ordine');
  const fotografia = () => ev(() => { const S = window.__t.getState(); return JSON.stringify({ memory: S.memory, memSeq: S.memSeq, orders: S.orders, advice: S.advice, pending: S.pending, inbox: S.inbox, year: S.year, turn: S.turn, kinds: S.log.map(e => e.k) }); });
  const FOTO0 = await fotografia();
  await ev(() => { window.__queue.push(new Error('guasto di prova')); });
  await advance();
  const FOTO1 = await fotografia();
  await queueJson([]); await advance();
  const FOTO2 = await fotografia();
  await queueJson('testo'); await advance();
  const FOTO3 = await fotografia();
  check('un turno che non riesce (il motore non risponde, o la risposta non ha il formato giusto: una lista, un testo) non scrive nulla: quaderni, numero progressivo, ordini, coda degli ordini, messaggi con la risposta data, data, turno e cronaca restano com\'erano',
    FOTO1 === FOTO0 && FOTO2 === FOTO0 && FOTO3 === FOTO0 && JSON.parse(FOTO0).pending.length === 1, [FOTO0.length, FOTO1.length, FOTO2.length, FOTO3.length]);
  await queueJson(TURN({ nuovo_anno: LUG, memoria: [NOTA('GBR', 'Vuole un incontro')] })); await advance();
  const Q11 = await memory(), S11 = await stato();
  check('…e quando il tentativo riesce si scrive tutto, una volta sola: l\'ordine con la data di quando è stato dato, ogni messaggio nel quaderno di chi l\'ha scritto (accettato, poi due senza risposta), la nota del motore; i numeri vanno da 1 a 5 senza buchi',
    uguali(perChiave(Q11), perChiave({
      FRA: { n: '', e: [voce(1, PARTENZA, 'e', 'Nota prima'), voce(2, LUG, 'm', 'Proposta di accordo al giocatore (peso 4); il giocatore ha accettato — «Proponiamo un patto di amicizia.»')] },
      URSS: { n: '', e: [voce(3, LUG, 'm', 'Ultimatum al giocatore (peso 5); il giocatore non ha risposto — «Ritirate le truppe.»')] },
      GBR: { n: '', e: [voce(4, LUG, 'm', 'Richiesta di colloquio al giocatore (peso 2); il giocatore non ha risposto — «Vorremmo incontrarvi.»'), voce(5, LUG, 'e', 'Vuole un incontro')] } }))
    && S11.memSeq === 5 && uguali(S11.orders, [{ w: GEN, x: 'Un ordine' }]), [Q11, S11]);

  const TARDIVO = TURN({ nuovo_anno: 'maggio 1965', messaggi: M3, mosse_altre_nazioni: [{ nazione: 'Francia', mossa: 'Mossa tardiva.' }], contatti: [CT('FRA', 'GBR', 'accordo', 4, 'accettato', 'Tardivo')], memoria: [NOTA('FRA', 'Nota tardiva')] });
  await restart(PL); await tabAzioni();
  await ordine('Ordine della prima partita');
  await ev(() => { window.__d = window.__deferred(); window.__queue.push(window.__d.p); });
  await page.click('#advanceBtn'); await spinnerOn();
  await restart(PL);
  await ev(r => window.__d.res(r), TARDIVO);
  await page.waitForTimeout(250);
  const TARDI1 = await stato();
  check('la risposta del motore che arriva quando la partita è già un\'altra non scrive nulla nel quaderno della nuova (né mosse, né contatti, né note, né ordini)',
    (await chiavi()).length === 0 && TARDI1.memSeq === 0 && uguali(TARDI1.orders, []) && TARDI1.year === PARTENZA, [await chiavi(), TARDI1]);
  await restart(PL); await tabAzioni();
  await ev(() => { window.__t.memAdd('GBR', 'e', 'Nota del salvataggio'); });
  const SNAP = await ev(() => JSON.parse(JSON.stringify(window.__t.buildSavePayload())));
  await ev(() => { window.__d = window.__deferred(); window.__queue.push(window.__d.p); });
  await page.click('#advanceBtn'); await spinnerOn();
  await ev(s => { window.__t.applySave(s); }, SNAP);
  await ev(r => window.__d.res(r), TARDIVO);
  await page.waitForTimeout(250);
  const TARDI2 = await stato();
  check('lo stesso se nel frattempo si carica un salvataggio: il quaderno resta quello salvato (una sola voce, di Regno Unito)',
    uguali(await memory(), { GBR: { n: '', e: [voce(1, PARTENZA, 'e', 'Nota del salvataggio')] } }) && TARDI2.memSeq === 1 && uguali(TARDI2.orders, []), [await memory(), TARDI2]);
  await restart(PL); await tabDiplo();
  await apriColloquio('Francia');
  await page.fill('#diploInput', 'Messaggio tardivo');
  await ev(() => { window.__d = window.__deferred(); window.__textQueue.push(window.__d.p); });
  await page.click('#diploSendBtn');
  await restart(PL);
  await ev(() => window.__d.res({ text: 'Risposta tardiva' }));
  await page.waitForTimeout(250);
  check('la risposta di un colloquio che arriva quando la partita è già un\'altra non scrive nulla nel quaderno della nuova', (await chiavi()).length === 0 && (await stato()).memSeq === 0, await memory());

  // =============================================================== 12. la lunghezza della richiesta al motore con il quaderno al massimo
  console.log('— la lunghezza della richiesta al motore con il quaderno al massimo');
  await restart(PL);
  const LP = await ev(() => {
    const T = window.__t, x = 'a'.repeat(160);
    const vuoto = T.turnPrompt([], '1 mese', true);
    ['FRA', 'GBR', 'BEL', 'ESP', 'PRT', 'GRC', 'TUR', 'CHN'].forEach(c => { for (let i = 0; i < 3; i++) T.memAdd(c, 'e', x); });
    T.rememberOrders(Array.from({ length: 6 }, () => 'x'.repeat(150)), 'd'.repeat(30));
    return { vuoto, pieno: T.turnPrompt([], '1 mese', true) };
  });
  const i0 = LP.pieno.indexOf(INTESTAZIONE), i1 = LP.pieno.indexOf('Ordini recenti del giocatore');
  const righe12 = LP.pieno.slice(i0 + INTESTAZIONE.length, i1).split('\n').filter(Boolean), somma12 = righe12.reduce((n, r) => n + r.length, 0);
  const ORD12 = 'Ordini recenti del giocatore, già eseguiti: ' + Array(4).fill(`[${'d'.repeat(24)}] «${'x'.repeat(99)}…»`).join('; ') + '.\n';
  const CURA12 = ' Nella narrativa e nel riepilogo del mondo tieni conto ' + CURA_NOTE + '.';
  const delta12 = LP.pieno.length - LP.vuoto.length;
  check('con otto quaderni da tre voci di 160 caratteri e sei ordini lunghi la richiesta cresce solo di: l\'intestazione, quattro righe di quaderno (entrano 2.400 caratteri, non una riga in più), gli ultimi quattro ordini e la frase finale; in tutto meno di 3.200 caratteri',
    i0 > 0 && i1 > i0 && righe12.length === 4 && somma12 >= 2290 && somma12 <= 2400 && delta12 === INTESTAZIONE.length + somma12 + righe12.length + ORD12.length + CURA12.length && delta12 < 3200,
    { righe: righe12.length, somma: somma12, delta: delta12, attesa: INTESTAZIONE.length + somma12 + righe12.length + ORD12.length + CURA12.length });

  // =============================================================== 13. i punti che i guasti messi apposta hanno mostrato scoperti
  // Dopo aver rotto la pagina in 267 punti (una copia alla volta, v. docs/MEMORIA.md) 43 guasti erano sfuggiti alle prove sopra: ognuno è coperto da un controllo qui sotto.
  console.log('— i punti che i guasti messi apposta hanno mostrato scoperti');
  await restart(PL); await tabAzioni();
  const T13 = await ev(() => {
    const T = window.__t, S = T.getState(), out = {};
    out.frasi = [T.memLine('h'.repeat(100), 'q'.repeat(200)), T.memLine('h'.repeat(150), 'quote'), T.memLine('h'.repeat(143), 'q'.repeat(50)), T.memLine('h'.repeat(200), 'quote'), T.memLine('solo testa', ''), T.memLine('solo testa')];
    out.tagli = [T.clip('aaaa bbbb', 6), T.clip('aaaa bbbb', 9), T.clip('abcdefghij', 5), T.clip('  spazi   interni  ', 50)];
    T.rememberMoves([{ who: 'Francia', what: 'm'.repeat(200) }]);
    out.mossa = JSON.parse(JSON.stringify(S.memory.FRA.e[0]));
    S.memory = {}; S.memSeq = 0;
    T.rememberTalk('Francia', 'y'.repeat(100), 'z'.repeat(120)); T.rememberTalk('Francia', '', 'Buongiorno'); T.rememberTalk('Francia', 'Ciao', ''); T.rememberTalk('Francia', '', '');
    out.colloqui = S.memory.FRA.e.map(e => [e.s, e.x]);
    S.orders.length = 0; T.rememberOrders(['a'.repeat(98) + ' ' + 'b'.repeat(50)], 'x');
    out.ordine = S.orders[0].x;
    S.advice.length = 0; ['', '   ', undefined, null].forEach(v => T.rememberAdvice(v));
    out.consigliVuoti = S.advice.length;
    S.memory = {}; S.memSeq = 0; S.orders.length = 0;
    return out;
  });
  check('una riga del quaderno: la citazione prende il posto che resta nei 160 caratteri (con una testa di 100 lettere la riga è di 160 e la citazione finisce con i puntini); con meno di 12 caratteri di posto la citazione non c\'è; una testa troppo lunga si taglia a 160',
    uguali(T13.frasi, ['h'.repeat(100) + ' — «' + 'q'.repeat(54) + '…»', 'h'.repeat(150), 'h'.repeat(143) + ' — «' + 'q'.repeat(11) + '…»', 'h'.repeat(160), 'solo testa', 'solo testa']), T13.frasi.map(f => f.length));
  check('il taglio di un testo: i puntini al posto dell\'ultima lettera e, se il taglio cade dopo uno spazio, senza lo spazio prima; niente se il testo ci sta; spazi doppi ripuliti',
    uguali(T13.tagli, ['aaaa…', 'aaaa bbbb', 'abcd…', 'spazi interni']), T13.tagli);
  check('una mossa di 200 lettere entra nel quaderno tagliata a 160 con i puntini', T13.mossa.x === 'm'.repeat(159) + '…' && T13.mossa.s === 'o', T13.mossa);
  check('il colloquio nel quaderno: ciò che dice il giocatore si cita fino a 50 caratteri e la risposta fino a 60 (con i puntini); chi non dice nulla «tace»; senza risposta lo scrive',
    uguali(T13.colloqui, [['t', `Colloquio: il giocatore dice «${'y'.repeat(49)}…»; risposta: «${'z'.repeat(59)}…»`], ['t', 'Colloquio: il giocatore tace; risposta: «Buongiorno»'],
      ['t', 'Colloquio: il giocatore dice «Ciao»; nessuna risposta'], ['t', 'Colloquio: il giocatore tace; nessuna risposta']]), T13.colloqui);
  check('un ordine che si taglia dopo uno spazio non ha lo spazio prima dei puntini', T13.ordine === 'a'.repeat(98) + '…', T13.ordine);
  check('un consiglio vuoto (niente, spazi, nulla) non si conserva', T13.consigliVuoti === 0, T13.consigliVuoti);

  // senza la mappa: una nota con la nazione che non è un testo si scarta; il motore legge tutti i nomi, non solo due
  await restartLibera('Impero Romano', '400 d.C.');
  const NL = await ev(() => { const r = window.__t.applyMemoryNotes([{ nazione: 1960, nota: 'x' }, { nazione: true, nota: 'x' }, { nazione: ['Persia'], nota: 'x' }, { nazione: { n: 'Persia' }, nota: 'x' }]);
    return [r.lines, r.refused, Object.keys(window.__t.getState().memory)]; });
  check('in una partita libera una nota con la nazione che non è un testo (un numero, vero/falso, una lista, un oggetto) si scarta e si conta, e non nasce nessun quaderno', uguali(NL, [[], 4, []]), NL);
  await ev(() => { const T = window.__t; [['~persia', 'Persia'], ['~unni', 'Unni'], ['~goti', 'Goti'], ['~franchi', 'Franchi']].forEach(([k, n], i) => T.memAdd(k, 'e', 'ricordo ' + (i + 1), n)); });
  const BL = await blocco('', []);
  check('senza la mappa il motore legge tutti i quaderni dei nomi, non solo due: con quattro nomi le righe sono quattro, dal più recente',
    BL === INTESTAZIONE + [['Franchi', 4], ['Goti', 3], ['Unni', 2], ['Persia', 1]].map(([n, i]) => `- ${n}: [400 d.C., nota] ricordo ${i}`).join('\n') + '\n', BL);

  // 2.400 caratteri: quando una riga non ci sta il motore smette di leggere, non salta la riga per cercarne una più corta
  await restart(PL);
  const BRK = await ev(() => {
    const T = window.__t, x = 'a'.repeat(160);
    T.memAdd('FRA', 'e', 'breve');                                                          // il più vecchio e il più corto
    ['ESP', 'PRT', 'GRC', 'TUR', 'CHN'].forEach(c => { for (let i = 0; i < 3; i++) T.memAdd(c, 'e', x); });
    return T.memoryBook('', []).split('\n').filter(l => l.startsWith('- ')).map(l => l.slice(l.indexOf('(') + 1, l.indexOf(')')));
  });
  check('dopo Cina, Turchia, Grecia e Portogallo (2.303 caratteri) la riga lunga della Spagna non ci sta: il motore smette lì e non va a prendere la Francia, che sarebbe corta', uguali(BRK, ['CHN', 'TUR', 'GRC', 'PRT']), BRK);

  // nella richiesta di un turno vero passano avanti i quaderni «in evidenza» (ordini, Stati in primo piano, chi ha scritto) anche se sono i più vecchi
  await restart(PL); await tabAzioni();
  await turn({ messaggi: [MSG('GBR', 'colloquio', 2, 'Vorremmo incontrarvi.')] });                // un messaggio del Regno Unito aspetta una risposta
  const CODICE = Object.fromEntries(FILE.states.map(s => [s.name, s.id]));
  const spot13 = (await ev(() => window.__t.spotlightNations(3))).map(n => CODICE[n]);
  const vivi13 = await ev(() => { const T = window.__t; return [...new Set(Object.keys(T.provinces).map(id => T.provinces[id].owner))].sort(); });
  const B13 = spot13.find(c => c !== 'GBR' && c !== 'FRA');
  const usati13 = new Set(['GBR', 'FRA', PL].concat(spot13));
  const riempi13 = vivi13.filter(c => ID.includes(c) && !usati13.has(c)).slice(0, 8);
  await ev(([prima, riemp]) => { const T = window.__t; prima.concat(riemp).forEach(c => T.memAdd(c, 'e', 'ricordo ' + c)); }, [['GBR', B13, 'FRA'], riempi13]);   // i tre «in evidenza» sono i più vecchi, poi otto altri
  await ordine('Mando una delegazione in Francia.');
  await queueJson(TURN({ nuovo_anno: LUG })); await advance();
  const P13 = await lastPrompt();
  const codici13 = P13.split('\n').map(l => l.match(/^- .* \(([A-Z]+)\): \[/)).filter(Boolean).map(m => m[1]);
  check('nella richiesta di un turno vero i tre quaderni «in evidenza» passano avanti anche se sono i più vecchi: Francia (nominata negli ordini), uno Stato in primo piano e il Regno Unito (ha un messaggio in attesa), dal più recente; poi i cinque più recenti degli altri',
    spot13.length === 3 && B13 !== undefined && riempi13.length === 8 && uguali(codici13, ['FRA', B13, 'GBR'].concat(riempi13.slice().reverse().slice(0, 5))), { spot13, B13, codici13, riempi13 });

  // un colloquio aperto: la riga sotto il nome, e il messaggio che non arriva a destinazione
  await restart(PL); await tabDiplo();
  await apriColloquio('Francia');
  check('un colloquio con uno Stato che non ha ancora voci: sotto il nome «Quaderno di Francia: ancora vuoto.»', (await testoDi('#diploMemNote')) === 'Quaderno di Francia: ancora vuoto.', await testoDi('#diploMemNote'));
  await queueText('Buongiorno'); await scrivi('Salve');
  const N1 = await testoDi('#diploMemNote');
  await tabAzioni(); await turn({ nuovo_anno: GEN, riepilogo_mondo: 'La Francia chiede un prestito', memoria: [NOTA('FRA', 'Chiede un prestito')] });
  await tabDiplo();
  const N2 = await testoDi('#diploMemNote');
  check('dopo uno scambio e dopo un turno vero la riga sotto il nome di un colloquio aperto si aggiorna da sola: una voce (il colloquio), poi due (con la nota che il motore ha scritto su Francia)', N1 === 'Quaderno di Francia: 1 voce.' && N2 === 'Quaderno di Francia: 2 voci.', [N1, N2]);
  await ev(() => { window.__textQueue.push(new Error('guasto di prova')); });
  await scrivi('Allora?');
  const VISTO1 = (await stato()).seen;
  await queueText('Ci penso'); await scrivi('Allora, il prestito?');
  const HR = await storia(), VISTO2 = (await stato()).seen;
  check('se il messaggio mandato dopo che il tempo è passato non riceve risposta, la nazione non risulta aggiornata (turno 0) e il tentativo dopo porta di nuovo la nota del gioco; poi risulta aggiornata (turno 1)',
    VISTO1 === 0 && VISTO2 === 1 && HR.length === 4 && HR[2].content.startsWith('[Nota del gioco, non citarla: dall\'ultimo scambio il tempo è passato; ora è gennaio 1961. Stato del mondo: La Francia chiede un prestito.')
    && HR[2].content.endsWith('\n\nAllora, il prestito?'), [VISTO1, VISTO2, HR.length, HR[2] && HR[2].content.slice(0, 120)]);
  await chiudiColloquio();
  check('chiudendo il colloquio la riga sotto il nome si svuota', (await ev(() => document.getElementById('diploMemNote').textContent)) === '', await ev(() => document.getElementById('diploMemNote').textContent));

  // nello stesso turno il messaggio risolto si scrive prima del contatto
  await restart(PL); await tabAzioni();
  await turn({ messaggi: [MSG('FRA', 'accordo', 4, 'Proponiamo un patto di amicizia.')] });
  await clicca('m1', 'accept');
  await turn({ nuovo_anno: LUG, contatti: [CT('FRA', 'GBR', 'accordo', 4, 'accettato', 'Firmano un patto di amicizia.')] });
  const Q13 = await memory();
  check('nello stesso turno il messaggio risolto viene scritto prima del contatto: in Francia prima il messaggio (n. 1) e poi il contatto (n. 2), nel Regno Unito il contatto (n. 3)',
    uguali(perChiave(Q13), perChiave({ FRA: { n: '', e: [voce(1, LUG, 'm', 'Proposta di accordo al giocatore (peso 4); il giocatore ha accettato — «Proponiamo un patto di amicizia.»'), voce(2, LUG, 'c', CONTATTO)] },
      GBR: { n: '', e: [voce(3, LUG, 'c', CONTATTO)] } })), Q13);

  // «la nazione è già aggiornata» si salva con la partita; un salvataggio di prima la conta come aggiornata al turno del salvataggio
  await restart(PL); await tabDiplo();
  await apriColloquio('Francia'); await queueText('Buongiorno'); await scrivi('Salve');
  await tabAzioni(); await turn({ nuovo_anno: GEN }); await turn({ nuovo_anno: LUG });
  const SVN = await ev(() => JSON.parse(JSON.stringify(window.__t.buildSavePayload())));
  check('il salvataggio di un colloquio aperto ricorda quando la nazione ha avuto l\'ultimo aggiornamento (turno 0, mentre la partita è al turno 2)', SVN.game.diplo.seen === 0 && SVN.game.turn === 2, [SVN.game.diplo.seen, SVN.game.turn]);
  await ev(d => { window.__t.applySave(d); }, SVN);
  await tabDiplo(); await queueText('Ci penso'); await scrivi('Allora?');
  const HN = await storia();
  check('…e ricaricata la partita il messaggio successivo ha davanti la nota del gioco (il tempo è passato)', HN.length === 4 && HN[2].content.startsWith('[Nota del gioco, non citarla:') && HN[2].content.endsWith('\n\nAllora?'), HN[2] && HN[2].content.slice(0, 80));
  const VEC = await ev(d => { const c = JSON.parse(JSON.stringify(d)); delete c.game.diplo.seen; window.__t.applySave(c); const S = window.__t.getState(); return [S.diplo.seen, S.turn]; }, SVN);
  check('un salvataggio di prima (senza quel campo) conta la nazione come aggiornata al turno del salvataggio: nessuna nota sul primo messaggio', VEC[0] === 2 && VEC[1] === 2, VEC);

  // documenti rotti: ordini e consigli senza testo, numeri d'ordine che non sono interi positivi, cronaca con tag HTML
  await restart(PL);
  const SB = await ev(() => JSON.parse(JSON.stringify(window.__t.buildSavePayload())));
  const HS = await ev(([d]) => {
    const c = JSON.parse(JSON.stringify(d));
    c.game.orders = [{ w: 'a', x: 'ok' }, { w: 'b', x: '' }, { w: 'c' }, { w: 'd', x: '   ' }];
    c.game.advice = [{ w: 'a', x: 'ok' }, { w: 'b' }, { w: 'c', x: '  ' }];
    c.game.memory = [{ k: 'FRA', e: [{ n: '7', w: 'a', s: 'e', x: 'a' }, { n: 3, w: 'b', s: 'e', x: 'b' }, { n: 1.5, w: 'c', s: 'e', x: 'c' }, { n: -2, w: 'd', s: 'e', x: 'd' }, { n: 4, w: 'e', s: 'e', x: 'e' }, { n: true, w: 'f', s: 'e', x: 'f' }] }];
    c.game.log = [{ k: 'q', lines: ['<img src=x onerror="window.__pwn=3"> <b>forte</b>', 'riga due'] }];
    window.__t.applySave(c);
    const S = window.__t.getState(), q = document.querySelector('.entry-mem');
    return { orders: JSON.parse(JSON.stringify(S.orders)), advice: JSON.parse(JSON.stringify(S.advice)), fra: S.memory.FRA.e.map(e => [e.n, e.x]),
      img: document.querySelectorAll('.entry-mem img').length, grassetti: document.querySelectorAll('.entry-mem b').length, pwn: window.__pwn === undefined, testo: q ? q.textContent : null };
  }, [SB]);
  check('ordini e consigli senza testo (vuoto, solo spazi, mancante) non si caricano', uguali(HS.orders, [{ w: 'a', x: 'ok' }]) && uguali(HS.advice, [{ w: 'a', x: 'ok' }]), [HS.orders, HS.advice]);
  check('un numero d\'ordine che non è un intero positivo (testo, con la virgola, negativo, vero/falso) vale 0: quelle voci vanno prima, nell\'ordine del documento, poi le altre per numero; poi tutte rinumerate da 1',
    uguali(HS.fra, [[1, 'a'], [2, 'c'], [3, 'd'], [4, 'f'], [5, 'b'], [6, 'e']]), HS.fra);
  check('una voce «Da ricordare» di un salvataggio con tag HTML si vede come testo: nessun elemento nato da lì (un solo grassetto, il titolo) e nessuno script eseguito',
    HS.img === 0 && HS.grassetti === 1 && HS.pwn && HS.testo !== null && HS.testo.includes('<img src=x onerror="window.__pwn=3"> <b>forte</b>'), HS);
  await restart(PL); await tabAzioni();
  await turn({ memoria: [NOTA('FRA', 'Promessa di aiuti')] });
  const SQ = await ev(() => JSON.parse(JSON.stringify(window.__t.buildSavePayload())));
  await ev(d => { window.__t.applySave(d); }, SQ);
  check('ricaricando un salvataggio la cronaca ha ancora la voce «Da ricordare» con le sue righe',
    uguali(await logLines('q'), [['Francia: Promessa di aiuti']]) && (await testoDi('.entry-mem')) === '📓 Da ricordare Francia: Promessa di aiuti', [await logLines('q'), await testoDi('.entry-mem')]);

  // le risposte che arrivano tardi, quando la partita (o il colloquio) è già un altro: il Consigliere e i colloqui
  await restart(PL); await tabAzioni();
  await ev(() => { window.__d = window.__deferred(); window.__textQueue.push(window.__d.p); });
  await page.click('#advisorBtn'); await spinnerOn();
  await restart(PL);
  await ev(() => window.__d.res({ text: 'Consiglio tardivo' }));
  await page.waitForTimeout(250);
  const CTARDI = await stato();
  check('la risposta del Consigliere che arriva quando la partita è già un\'altra non scrive nulla: né fra i consigli né nella cronaca', CTARDI.advice.length === 0 && (await kinds()) === '', [CTARDI.advice, await kinds()]);
  await restart(PL); await tabDiplo(); await apriColloquio('Francia');
  await page.fill('#diploInput', 'Messaggio tardivo');
  await ev(() => { window.__d = window.__deferred(); window.__textQueue.push(window.__d.p); });
  await page.click('#diploSendBtn');
  await restart(PL);
  await ev(() => window.__d.res({ text: 'Risposta tardiva' }));
  await page.waitForTimeout(250);
  const TARDC = await ev(() => { const S = window.__t.getState(); return { storia: S.diplo.history.length, fumetti: S.diplo.bubbles.length, colloqui: S.talks.length }; });
  check('la risposta di un colloquio che arriva quando la partita è già un\'altra non entra nella storia, nei fumetti né nei colloqui della partita nuova', TARDC.storia === 0 && TARDC.fumetti === 0 && TARDC.colloqui === 0, TARDC);

  // gli attributi per chi legge lo schermo e l'aspetto fissato (bordo, grandezza dei testi, distanza)
  await restart(PL); await tabAzioni();
  await turn({ messaggi: [MSG('FRA', 'accordo', 4, 'Un patto.')], contatti: [CT('GBR', 'BEL', 'accordo', 3, 'accettato', 'Patto.')], memoria: [NOTA('FRA', 'Promessa di aiuti')] });
  await ev(() => { document.getElementById('memBox').open = true; });
  const AT = await ev(() => {
    const cs = (sel, p) => { const n = document.querySelector(sel); return n ? getComputedStyle(n)[p] : null; };
    const pan = document.getElementById('memPanel'), lab = document.getElementById(pan.getAttribute('aria-labelledby') || '_'), inp = document.getElementById('diploTarget');
    const desc = document.getElementById(inp.getAttribute('aria-describedby') || '_');
    return { pannello: lab ? lab.textContent : null, elenco: document.getElementById('memList').getAttribute('aria-label'), lista: inp.list ? inp.list.id : null, nota: desc ? desc.id : null, notaTesto: desc ? desc.textContent.length > 0 : false,
      bordi: ['.entry-msg', '.entry-contact', '.entry-mem'].map(s => cs(s, 'borderLeftStyle')), spessore: cs('.entry-mem', 'borderLeftWidth'),
      font: [cs('.entry-mem', 'fontSize'), cs('.entry-contact', 'fontSize'), cs('.mem-entries li', 'fontSize'), cs('.mem-tag', 'fontSize')], sotto: getComputedStyle(document.getElementById('diploMemNote')).marginBottom };
  });
  check('il pannello ha il nome «Quaderno delle nazioni» per chi legge lo schermo, l\'elenco ha un nome, il campo del colloquio ha i suggerimenti (l\'elenco degli Stati) e la nota collegata che lo spiega',
    AT.pannello === 'Quaderno delle nazioni' && AT.elenco === 'Che cosa ricorda ogni nazione' && AT.lista === 'diploNations' && AT.nota === 'diploTargetNote' && AT.notaTesto, AT);
  check('la voce «Da ricordare» della cronaca si distingue dalle altre dal bordo (messaggi a trattini, contatti a puntini, quaderno doppio, 3 pixel) e ha il testo grande come le altre voci; nel pannello i testi sono di 13,12 e 11,84 pixel; la riga sotto il nome ha 8 pixel di spazio sotto',
    uguali(AT.bordi, ['dashed', 'dotted', 'double']) && AT.spessore === '3px' && uguali(AT.font, ['14.08px', '14.08px', '13.12px', '11.84px']) && AT.sotto === '8px', AT);

  // dopo un consiglio la partita si salva da sola (il consiglio dato fa parte del salvataggio)
  await restart(PL); await tabAzioni();
  await queueText('Rafforza il fronte orientale'); await page.click('#advisorBtn'); await spinnerOff();
  await page.waitForTimeout(250);
  const SALVATO = store['save/state'] && store['save/state'].game ? store['save/state'].game.advice : null;
  check('dopo un consiglio la partita si salva da sola, con il consiglio appena dato', uguali(SALVATO, [{ w: PARTENZA, x: 'Rafforza il fronte orientale' }]), SALVATO);

  check('nessun errore della pagina in tutta la prova', errors.length === 0, errors);
  await browser.close();
  process.exit(summary() ? 1 : 0);
})();
