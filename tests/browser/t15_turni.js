// Il turno diviso in due: «Invia» mette le azioni in attesa (una casella, anche più azioni), «Avanza» fa passare il tempo
// e, nello stesso periodo, anche le altre nazioni agiscono liberamente. Coda, blocchi, prompt, risposte del motore
// (mosse delle altre nazioni), errori, risposte tardive, salvataggio e dati ostili.
const { launch, check, summary } = require('./harness');

const TURN = (extra = {}) => Object.assign({ evento_titolo: 'Titolo di prova', narrativa: 'Narrativa di prova.', riepilogo_mondo: 'Riepilogo di prova.',
  nuovo_anno: 'gennaio 1961', stabilita: 55, economia: 55, esercito: 55, prestigio: 55, cambi_territoriali: [], cambi_controllo: [], segnaposto: [] }, extra);
const lines = (n, base = 'Ordine numero ') => Array.from({ length: n }, (_, i) => base + (i + 1)).join('\n');

(async () => {
  const store = {};
  const { browser, page, errors } = await launch({ width: 640, height: 1100, mobile: false, store });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const q = () => ev(() => window.__t.getState().pending.slice());
  const st = () => ev(() => { const s = window.__t.getState(); return { pending: s.pending.slice(), turn: s.turn, year: s.year, log: s.log.map(e => e.k) }; });
  const nPrompts = () => ev(() => window.__prompts.length);
  const lastPrompt = () => ev(() => window.__prompts[window.__prompts.length - 1]);
  const dom = () => ev(() => {
    const m = document.getElementById('actionMsg');
    const a = document.activeElement;
    return {
      items: [...document.querySelectorAll('#queueList li .q-text')].map(n => n.textContent),
      listHidden: document.getElementById('queueList').classList.contains('hidden'),
      emptyHidden: document.getElementById('queueEmpty').classList.contains('hidden'),
      title: document.getElementById('queueTitle').textContent,
      msg: m.classList.contains('hidden') ? '' : m.textContent,
      input: document.getElementById('actionInput').value,
      send: document.getElementById('sendBtn').disabled, adv: document.getElementById('advanceBtn').disabled,
      rm: [...document.querySelectorAll('#queueList button')].map(b => ({ dis: b.disabled, label: b.getAttribute('aria-label') })),
      focus: a ? (a.id || a.tagName) : null,
      said: document.getElementById('a11yStatus').textContent.replace(/ $/, ''),
      log: document.getElementById('log').textContent,
      year: document.getElementById('yearLabel').textContent
    };
  });
  const restart = c => ev(c => { window.__queue.length = 0; window.__textQueue.length = 0; window.__t.resetGame(); window.__t.startFixedScenarioGame(c); }, c);
  const spinnerOn = () => page.waitForFunction(() => !document.getElementById('thinking').classList.contains('hidden'));
  const spinnerOff = () => page.waitForFunction(() => document.getElementById('thinking').classList.contains('hidden'));
  const queueJson = v => ev(v => { window.__queue.push(v); }, v);
  const send = async text => { await page.fill('#actionInput', text); await page.click('#sendBtn'); };
  const advance = async () => { await page.click('#advanceBtn'); await spinnerOff(); };

  check('la pagina si carica senza errori', errors.length === 0, errors);

  // =============================================================== 1. due comandi separati
  console.log('— due comandi separati: «Invia» per le azioni, «Avanza» per il tempo');
  await restart('FRG');
  const i0 = await ev(() => ({
    noOld: document.getElementById('actBtn') === null,
    tag: document.getElementById('actionInput').tagName,
    label: document.querySelector('label[for="actionInput"]').textContent.trim(),
    send: document.getElementById('sendBtn').textContent.trim(), adv: document.getElementById('advanceBtn').textContent.trim(),
    types: [document.getElementById('sendBtn').type, document.getElementById('advanceBtn').type],
    steps: [...document.querySelectorAll('#jump option')].map(o => o.value),
    advInTime: !!document.querySelector('.time-block #jump') && !!document.querySelector('.time-block #advanceBtn'),
    sendOutOfTime: !document.querySelector('.time-block #sendBtn') && !document.querySelector('.time-block #actionInput'),
    text: document.getElementById('actionsPanel').textContent,
    desc: ['actionInput', 'advanceBtn'].map(id => { const d = document.getElementById(document.getElementById(id).getAttribute('aria-describedby')); return d ? d.textContent : null; })
  }));
  check('non c\'è più un pulsante unico «Agisci e avanza»', i0.noOld && !/Agisci e avanza/.test(i0.text), i0.noOld);
  check('c\'è una casella di testo «Cosa fai?» con il pulsante «Invia»', i0.tag === 'TEXTAREA' && i0.label === 'Cosa fai?' && i0.send === 'Invia' && i0.sendOutOfTime, i0);
  check('«Avanza» sta accanto al salto temporale, separato dalla casella', i0.adv === 'Avanza' && i0.advInTime, i0);
  check('i due pulsanti non inviano moduli (type=button)', i0.types.join() === 'button,button', i0.types);
  check('i salti temporali di prima ci sono ancora', JSON.stringify(i0.steps) === JSON.stringify(['1 settimana', '1 mese', '6 mesi', '1 anno']), i0.steps);
  check('la casella e «Avanza» hanno una spiegazione collegata (aria-describedby)', /Invia.*mette in attesa|le mette in attesa/.test(i0.desc[0] || '') && /fa passare il tempo/.test(i0.desc[1] || ''), i0.desc);
  let d = await dom(), s = await st();
  check('all\'inizio nessuna azione in attesa: la lista è nascosta e c\'è la nota «puoi avanzare anche senza ordini»', d.items.length === 0 && d.listHidden && !d.emptyHidden && d.title === 'Azioni in attesa' && s.turn === 0, d);
  check('all\'inizio entrambi i pulsanti sono attivi e non c\'è nessun messaggio', !d.send && !d.adv && d.msg === '', d);

  // =============================================================== 2. «Invia» mette in attesa e basta
  console.log('— «Invia» mette le azioni in attesa e non fa altro');
  const p0 = await nPrompts();
  await page.click('#sendBtn');
  d = await dom();
  check('«Invia» con la casella vuota chiede di scrivere, non mette nulla in coda e tiene il cursore nella casella', d.msg === 'Scrivi prima cosa fai, poi premi «Invia».' && d.items.length === 0 && d.focus === 'actionInput', d);
  check('…e il messaggio è annunciato agli screen reader', d.said === 'Scrivi prima cosa fai, poi premi «Invia».', d.said);
  await page.fill('#actionInput', '   \n \r\n   ');
  check('scrivendo, il messaggio sparisce da solo', (await dom()).msg === '');
  await page.click('#sendBtn');
  d = await dom();
  check('spazi e righe vuote contano come casella vuota', d.items.length === 0 && /Scrivi prima/.test(d.msg), d);
  await send('Mobilito le riserve al confine orientale');
  d = await dom(); s = await st();
  check('un\'azione: è in coda, la casella è vuota e il cursore torna nella casella', JSON.stringify(d.items) === JSON.stringify(['Mobilito le riserve al confine orientale']) && d.input === '' && d.focus === 'actionInput', d);
  check('la lista compare, la nota «nessuna azione» sparisce e il titolo conta le azioni', !d.listHidden && d.emptyHidden && d.title === 'Azioni in attesa (1)', d);
  check('l\'esito è annunciato: «Azione aggiunta. In attesa: 1.»', d.said === 'Azione aggiunta. In attesa: 1.', d.said);
  check('non succede altro: nessuna richiesta al motore, il tempo non passa, la cronaca resta vuota', (await nPrompts()) === p0 && s.turn === 0 && s.log.length === 0 && d.year === '31 dicembre 1960', { s, year: d.year, prompts: (await nPrompts()) - p0 });
  check('la coda fa parte della partita salvata', (await ev(() => window.__t.buildSavePayload().game.pending)).join('|') === 'Mobilito le riserve al confine orientale');
  await send('Apro trattative con la Francia\r\n\r\n   Rafforzo   la  frontiera  \nTerza azione');
  s = await st(); d = await dom();
  check('più righe sono più azioni (righe vuote scartate, spazi ripuliti, a capo di Windows accettati)',
    JSON.stringify(s.pending) === JSON.stringify(['Mobilito le riserve al confine orientale', 'Apro trattative con la Francia', 'Rafforzo la frontiera', 'Terza azione']), s.pending);
  check('…annunciate come «3 azioni aggiunte. In attesa: 4.»', d.said === '3 azioni aggiunte. In attesa: 4.', d.said);
  check('le azioni sono in un elenco ordinato, nell\'ordine in cui sono state scritte', await ev(() => document.getElementById('queueList').tagName === 'OL' && [...document.querySelectorAll('#queueList > li')].length === 4 && document.getElementById('queueList').getAttribute('aria-labelledby') === 'queueTitle'));
  await send('Terza azione');
  check('la stessa azione scritta due volte resta due azioni (niente fusioni di nascosto)', (await q()).filter(a => a === 'Terza azione').length === 2);
  await page.fill('#actionInput', 'Ordine con la tastiera');
  await page.press('#actionInput', 'Control+Enter');
  check('Ctrl+Invio nella casella fa come «Invia»', (await q()).slice(-1)[0] === 'Ordine con la tastiera' && (await dom()).input === '');
  await page.fill('#actionInput', 'Riga uno');
  await page.press('#actionInput', 'Enter');
  d = await dom();
  check('Invio da solo va a capo (si possono scrivere più righe prima di inviare)', d.input === 'Riga uno\n' && (await q()).length === 6, d.input);
  await page.type('#actionInput', 'Riga due');
  await page.press('#actionInput', 'Meta+Enter');
  s = await st();
  check('Cmd+Invio funziona come Ctrl+Invio e manda le due righe come due azioni', s.pending.slice(-2).join('|') === 'Riga uno|Riga due' && s.pending.length === 8, s.pending);
  check('Ctrl+Invio con la casella vuota dice di scrivere, come «Invia»', await (async () => { await page.press('#actionInput', 'Control+Enter'); return /Scrivi prima/.test((await dom()).msg); })());

  // =============================================================== 3. limiti
  console.log('— limiti della coda: 12 azioni, 400 caratteri ciascuna');
  await restart('FRG');
  await send(lines(10));
  check('dieci azioni in una volta vanno bene', (await q()).length === 10 && (await dom()).title === 'Azioni in attesa (10)');
  await send('Undicesima\nDodicesima\nTredicesima');
  d = await dom();
  check('tre in più farebbero 13: rifiutate tutte insieme, con il motivo', (await q()).length === 10 && /al massimo 12: ne hai 10 e ne stai aggiungendo 3/.test(d.msg), d.msg);
  check('…e quello che avevi scritto resta nella casella (niente si perde), con il cursore lì', d.input === 'Undicesima\nDodicesima\nTredicesima' && d.focus === 'actionInput', d);
  check('…il rifiuto è annunciato', /al massimo 12/.test(d.said), d.said);
  await send('Undicesima\nDodicesima');
  check('due in più arrivano a 12 e sono accettate', (await q()).length === 12 && (await dom()).msg === '');
  await send('Una di troppo');
  d = await dom();
  check('con 12 in attesa non se ne aggiungono: il messaggio dice di premere «Avanza» o rimuoverne', (await q()).length === 12 && /Hai già 12 azioni in attesa, il massimo\. Premi «Avanza» oppure rimuovine qualcuna\./.test(d.msg) && d.input === 'Una di troppo', d);
  await restart('FRG');
  await send('x'.repeat(401));
  d = await dom();
  check('un\'azione più lunga di 400 caratteri è rifiutata con il motivo e resta nella casella', (await q()).length === 0 && /troppo lunga: al massimo 400 caratteri/.test(d.msg) && d.input.length === 401, { msg: d.msg, len: d.input.length });
  await send('y'.repeat(400));
  check('400 caratteri vanno bene', (await q()).length === 1 && (await q())[0].length === 400);
  await send('Prima riga ok\n' + 'z'.repeat(450));
  d = await dom();
  check('se una sola riga è troppo lunga non entra nessuna delle righe (tutto o niente)', (await q()).length === 1 && /troppo lunga/.test(d.msg) && d.input.startsWith('Prima riga ok'), d);

  // =============================================================== 4. rimuovere
  console.log('— «Rimuovi»');
  await restart('FRG');
  await send('Prima\nSeconda\nTerza');
  d = await dom();
  check('ogni azione ha il suo «Rimuovi» e il nome del pulsante dice quale azione toglie', d.rm.length === 3 && d.rm[1].label === 'Rimuovi l\'azione: Seconda' && d.rm.every(b => !b.dis), d.rm);
  await page.click('#queueList li:nth-child(2) button');
  d = await dom();
  check('«Rimuovi» toglie quell\'azione e solo quella', JSON.stringify(d.items) === JSON.stringify(['Prima', 'Terza']) && d.title === 'Azioni in attesa (2)' && JSON.stringify(await q()) === JSON.stringify(['Prima', 'Terza']), d);
  check('…lo annuncia', d.said === 'Azione rimossa. In attesa: 2.', d.said);
  check('…e il cursore passa al pulsante dell\'azione che ha preso il suo posto', await ev(() => document.activeElement === document.querySelectorAll('#queueList button')[1]));
  await page.click('#queueList li:last-child button');
  check('togliendo l\'ultima il cursore va al pulsante precedente', await ev(() => document.activeElement === document.querySelectorAll('#queueList button')[0]) && (await q()).join() === 'Prima');
  await page.click('#queueList li button');
  d = await dom();
  check('togliendo l\'ultima rimasta la lista scompare, torna la nota e il cursore va alla casella', d.listHidden && !d.emptyHidden && d.title === 'Azioni in attesa' && d.focus === 'actionInput' && (await q()).length === 0, d);
  const longText = 'Un\'azione molto lunga che continua a lungo per vedere come viene abbreviato il nome del pulsante «Rimuovi» quando il testo supera i settanta caratteri';
  await send(longText);
  d = await dom();
  check('il nome del pulsante per un\'azione lunga è abbreviato con «…», il testo in lista è intero', d.rm[0].label.endsWith('…') && d.rm[0].label.length < longText.length && d.items[0] === longText, d.rm[0]);
  await restart('FRG');
  await send('Una\nDue');
  await ev(() => window.__t.removeAction(5)); await ev(() => window.__t.removeAction(-1)); await ev(() => window.__t.removeAction(NaN));
  check('un indice che non esiste non toglie niente', (await q()).length === 2);

  // =============================================================== 5. testo con codice dentro
  console.log('— il testo scritto dal giocatore è solo testo');
  await restart('FRG');
  const evil = '<img src=x onerror="window.__pwned=1"> <b>grassetto</b> <script>window.__pwned=2<\/script>';
  await send(evil);
  check('in coda il markup è mostrato come testo e non viene eseguito', await ev(e => document.querySelector('#queueList li .q-text').textContent === e && !document.querySelector('#queueList img, #queueList b, #queueList script') && !window.__pwned, evil));
  await advance();
  check('nella cronaca l\'azione è testo, non markup', await ev(e => { const a = document.querySelector('#log .entry-action'); return !!a && a.textContent.includes(e) && !document.querySelector('#log img, #log b, #log script') && !window.__pwned; }, evil));

  // =============================================================== 6. «Avanza»: blocco con testo non inviato
  console.log('— «Avanza» con del testo scritto e non inviato');
  await restart('FRG');
  await send('Ordine già inviato');
  await page.fill('#actionInput', 'Bozza non inviata');
  const pA = await nPrompts();
  await page.click('#advanceBtn');
  d = await dom(); s = await st();
  check('«Avanza» non fa passare il tempo e spiega: premi «Invia» (oppure cancella), poi «Avanza»', (await nPrompts()) === pA && s.turn === 0 && /Nella casella c'è del testo che non hai inviato\. Premi «Invia» per metterlo tra le azioni \(oppure cancellalo\), poi «Avanza»\./.test(d.msg), { prompts: (await nPrompts()) - pA, turn: s.turn, msg: d.msg });
  check('…il cursore va nella casella e la bozza è ancora lì', d.focus === 'actionInput' && d.input === 'Bozza non inviata', d);
  check('…il messaggio è annunciato e la coda non è toccata', /testo che non hai inviato/.test(d.said) && JSON.stringify(s.pending) === JSON.stringify(['Ordine già inviato']), { said: d.said, pending: s.pending });
  check('…i pulsanti restano attivi (non è un errore del motore)', !d.send && !d.adv && !(await ev(() => !document.getElementById('thinking').classList.contains('hidden'))));
  await page.fill('#actionInput', '   \n  ');
  const pB = await nPrompts();
  await page.click('#advanceBtn'); await spinnerOff();
  check('una casella con soli spazi non blocca «Avanza»', (await nPrompts()) === pB + 1 && (await st()).turn === 1);
  await restart('FRG');
  await send('Ordine già inviato');
  await page.fill('#actionInput', 'Bozza non inviata');
  await page.click('#advanceBtn');
  check('il messaggio di blocco compare nell\'area degli avvisi e non nella cronaca', !/non hai inviato/.test((await dom()).log));
  await page.click('#sendBtn');
  d = await dom();
  check('premendo «Invia» la bozza entra in coda e il messaggio di blocco sparisce', d.msg === '' && JSON.stringify(await q()) === JSON.stringify(['Ordine già inviato', 'Bozza non inviata']), d);
  await page.selectOption('#jump', '6 mesi');
  await queueJson(TURN({ nuovo_anno: 'luglio 1961' }));
  const pC = await nPrompts();
  await advance();
  const pr = await lastPrompt();
  s = await st(); d = await dom();
  check('«Avanza» manda una sola richiesta', (await nPrompts()) === pC + 1);
  check('la richiesta porta il salto temporale scelto', pr.includes('Il tempo avanza di 6 mesi.'), pr.slice(0, 400));
  check('la richiesta elenca le azioni numerate, nell\'ordine in cui sono state scritte', pr.includes('questi 2 ordini, uno per riga') && pr.includes('1. "Ordine già inviato"') && pr.includes('2. "Bozza non inviata"') && pr.indexOf('1. "Ordine') < pr.indexOf('2. "Bozza'), pr.slice(0, 600));
  check('dopo «Avanza» la coda è vuota, il contatore dei turni sale di uno e l\'anno è quello del motore', s.pending.length === 0 && s.turn === 1 && s.year === 'luglio 1961' && d.year === 'luglio 1961' && d.listHidden && !d.emptyHidden, { s, d: d.year });
  check('le azioni entrano nella cronaca nell\'ordine, seguite dal turno', s.log.join() === 'a,a,t', s.log);
  check('«Avanza» non mette nulla nella casella e i pulsanti tornano attivi', !d.send && !d.adv && d.input === '', d);
  check('il cursore torna su «Avanza»', d.focus === 'advanceBtn', d.focus);

  // =============================================================== 7. «Avanza» senza azioni e i salti temporali
  console.log('— «Avanza» senza azioni, e ogni salto temporale');
  await restart('FRG');
  await advance();
  const pr0 = await lastPrompt(); s = await st(); d = await dom();
  check('senza azioni il tempo passa lo stesso: «il giocatore non dà ordini nuovi»', /il giocatore non dà ordini nuovi/.test(pr0) && !/Nel frattempo il giocatore dà/.test(pr0) && !pr0.includes('1. "'), pr0.slice(0, 500));
  check('…la cronaca ha il turno, il contatore è 1', s.log.join() === 't' && s.turn === 1 && /Narrativa di prova\./.test(d.log), { s });
  for (const step of ['1 settimana', '1 mese', '6 mesi', '1 anno']) {
    await page.selectOption('#jump', step);
    await advance();
    check(`il salto «${step}» arriva alla richiesta`, (await lastPrompt()).includes(`Il tempo avanza di ${step}.`));
  }
  check('dopo cinque «Avanza» il contatore dei turni è 5', (await st()).turn === 5);
  await restart('FRG');
  await send('Una sola');
  await advance();
  check('con una sola azione la frase è al singolare: «quest\'ordine»', /il giocatore dà quest'ordine:\n1\. "Una sola"/.test(await lastPrompt()), (await lastPrompt()).slice(0, 500));

  // =============================================================== 8. le altre nazioni
  console.log('— le altre nazioni agiscono: richiesta');
  await restart('FRG');
  await advance();
  const po = await lastPrompt();
  check('la richiesta chiede alle altre nazioni di agire di propria iniziativa, non solo in risposta al giocatore', /anche le altre nazioni agiscono liberamente, di propria iniziativa e non solo in risposta al giocatore/.test(po), po.slice(0, 700));
  check('…da 3 a 6 nazioni diverse, non solo le superpotenze', po.includes('Fai agire da 3 a 6 nazioni diverse, non solo le superpotenze'));
  check('…con le loro mosse che contano davvero (narrazione, statistiche e, con la mappa, i cambi territoriali)', /Le loro mosse contano davvero/.test(po) && /vanno elencate nei cambi territoriali/.test(po));
  check('…e le chiede nella risposta, in «mosse_altre_nazioni», con lo schema', po.includes('Riportale in "mosse_altre_nazioni", una frase ciascuna.') && po.includes('"mosse_altre_nazioni": [{"nazione": "nome della nazione", "mossa": "una frase su cosa fa"}]'));
  check('la narrazione deve coprire ordini del giocatore e mosse delle altre nazioni', /di tutto ciò che avviene in questo periodo \(gli ordini del giocatore e le mosse delle altre nazioni\)/.test(po));
  check('lo schema della risposta ha ancora il resto (statistiche, territori, controllo, segnaposto)', ['"evento_titolo"', '"narrativa"', '"riepilogo_mondo"', '"nuovo_anno"', '"stabilita"', '"cambi_territoriali"', '"cambi_controllo"', '"segnaposto"'].every(k => po.includes(k)));

  console.log('— le altre nazioni: chi riceve uno spazio in più (rotazione, senza caso)');
  const sp = await ev(() => {
    const T = window.__t, S = T.getState(), C = T.countries, P = T.provinces;
    const owners = new Set(Object.keys(P).map(i => P[i].owner));
    const colonyNames = Object.keys(C).filter(c => /^colonia/i.test(C[c].alliance || '')).map(c => C[c].name);
    const out = { lists: [], player: C.FRG.name, colonyNames, total: Object.keys(C).length, owners: owners.size };
    for (let t = 0; t < 60; t++) { S.turn = t; out.lists.push(T.spotlightNations(3)); }
    S.turn = 7; out.again = [T.spotlightNations(3), T.spotlightNations(3)];
    S.turn = 8; out.next = T.spotlightNations(3);
    S.turn = 0; out.all = T.spotlightNations(1000); out.two = T.spotlightNations(2); out.zero = T.spotlightNations(0);
    return out;
  });
  check('tre nazioni per turno, sempre diverse tra loro', sp.lists.every(l => l.length === 3 && new Set(l).size === 3), sp.lists.slice(0, 3));
  check('la scelta non usa il caso: stesso turno, stessa lista', JSON.stringify(sp.again[0]) === JSON.stringify(sp.again[1]));
  check('la lista cambia da un turno all\'altro (ruota)', JSON.stringify(sp.again[0]) !== JSON.stringify(sp.next) && new Set(sp.lists.map(l => l.join())).size >= 50, new Set(sp.lists.map(l => l.join())).size);
  check('in 60 turni compaiono molte nazioni diverse, non sempre le stesse', new Set(sp.lists.flat()).size >= 40, new Set(sp.lists.flat()).size);
  check('la nazione del giocatore non è mai nella lista', !sp.lists.flat().includes(sp.player) && !sp.all.includes(sp.player), sp.player);
  check('le colonie non sono mai nella lista', sp.colonyNames.length === 5 && !sp.lists.flat().some(n => sp.colonyNames.includes(n)) && sp.all.every(n => !sp.colonyNames.includes(n)), sp.colonyNames);
  check('chiedendo più nazioni di quelle possibili si ottengono tutte quelle possibili, una volta sola', sp.all.length === sp.total - 1 - sp.colonyNames.length && new Set(sp.all).size === sp.all.length, { all: sp.all.length, total: sp.total });
  check('con n più piccolo si prendono le prime della stessa classifica; con 0 la lista è vuota', JSON.stringify(sp.two) === JSON.stringify(sp.all.slice(0, 2)) && sp.zero.length === 0, sp.two);
  const sp2 = await ev(() => {
    const T = window.__t, P = T.provinces, C = T.countries;
    const one = Object.keys(C).find(c => c !== 'FRG' && !/^colonia/i.test(C[c].alliance || '') && Object.keys(P).filter(i => P[i].owner === c).length === 1);
    const prov = Object.keys(P).find(i => P[i].owner === one);
    const before = T.spotlightNations(1000).includes(C[one].name);
    T.changeProvinceOwner(prov, 'FRG'); T.changeProvinceController(prov, 'FRG');
    const after = T.spotlightNations(1000).includes(C[one].name);
    T.changeProvinceOwner(prov, one); T.changeProvinceController(prov, one);
    return { one, name: C[one].name, before, after };
  });
  check('una nazione che non possiede più nessuna provincia esce dalla lista (e rientra se la riprende)', sp2.before === true && sp2.after === false, sp2);
  const sp3 = await ev(() => { const T = window.__t, S = T.getState(); S.turn = 3; const out = {}; for (const c of ['URSS', 'ITA', 'GBR', 'CHN', 'LUX']) { T.selectCountry(c); out[c] = { name: T.countries[c].name, list: T.spotlightNations(1000) }; } T.selectCountry('FRG'); S.turn = 0; return out; });
  check('per qualunque nazione scelta dal giocatore, quella nazione non è nella lista', Object.values(sp3).every(x => !x.list.includes(x.name)), Object.keys(sp3));

  console.log('— le altre nazioni: la richiesta nomina chi ha spazio in più');
  await restart('FRG');
  await ev(() => { window.__t.getState().turn = 4; });
  await advance();
  const spotNow = await ev(() => { const S = window.__t.getState(); S.turn = 4; return window.__t.spotlightNations(3); });
  const prSp = await lastPrompt();
  check('con la mappa la richiesta cita le tre nazioni scelte: «dai spazio anche a: …»', spotNow.length === 3 && prSp.includes('dai spazio anche a: ' + spotNow.join(', ')), { spotNow, frag: prSp.slice(prSp.indexOf('dai spazio'), prSp.indexOf('dai spazio') + 120) });
  check('la stessa partita, alla stessa data, dà sempre la stessa richiesta (riproducibile)', await (async () => {
    await restart('FRG'); await ev(() => { window.__t.getState().turn = 4; });
    const a = await ev(() => window.__t.turnPrompt(['A'], '1 mese', true)); const b = await ev(() => window.__t.turnPrompt(['A'], '1 mese', true));
    return a === b;
  })());
  check('turni diversi danno nazioni in evidenza diverse nella richiesta', await ev(() => { const S = window.__t.getState(); S.turn = 10; const a = window.__t.turnPrompt([], '1 mese', true); S.turn = 11; const b = window.__t.turnPrompt([], '1 mese', true); S.turn = 0; return a !== b; }));
  check('la richiesta non è troppo lunga (con 12 azioni da 400 caratteri e la mappa)', await ev(() => { window.__t.getState().turn = 0; const big = Array.from({ length: 12 }, () => 'q'.repeat(400)); return window.__t.turnPrompt(big, '1 anno', true).length < 22000; }));
  // scenario libero: niente mappa, niente nazioni in evidenza, ma le altre nazioni agiscono lo stesso
  await ev(() => window.__t.resetGame());
  await page.fill('#nation', 'Roma'); await page.fill('#startYear', '400'); await page.click('#startBtn');
  await advance();
  const pf = await lastPrompt();
  check('scenario libero: le altre nazioni agiscono lo stesso, senza elenco di nazioni in evidenza né regole della mappa', /anche le altre nazioni agiscono liberamente/.test(pf) && pf.includes('mosse_altre_nazioni') && !pf.includes('dai spazio anche a') && !pf.includes('cambi_territoriali') && !pf.includes('vanno elencate nei cambi territoriali'), pf.slice(0, 300));
  await ev(() => window.__t.resetGame());

  // =============================================================== 9. le altre nazioni: la risposta
  console.log('— le altre nazioni: la risposta del motore entra nella cronaca');
  await restart('FRG');
  await send('Apro trattative commerciali');
  await queueJson(TURN({ mosse_altre_nazioni: [{ nazione: 'Francia', mossa: 'Propone un accordo commerciale alla Germania Ovest.' }, { nazione: 'Unione Sovietica', mossa: 'Rafforza i controlli lungo la frontiera con la RDT.' }, 'Il Regno Unito avvia consultazioni con Washington.'] }));
  await advance();
  d = await dom(); s = await st();
  const blk = await ev(() => { const b = document.querySelector('#log .entry-others'); return b ? { text: b.textContent, n: document.querySelectorAll('#log .entry-others').length } : null; });
  check('compare un blocco «Le altre nazioni» con una riga per ogni mossa', !!blk && blk.n === 1 && blk.text.includes('Le altre nazioni') && blk.text.includes('Francia: Propone un accordo commerciale alla Germania Ovest.') && blk.text.includes('Unione Sovietica: Rafforza i controlli lungo la frontiera con la RDT.') && blk.text.includes('Il Regno Unito avvia consultazioni con Washington.'), blk);
  check('la cronaca ha, nell\'ordine: l\'azione del giocatore, il turno, le altre nazioni', s.log.join() === 'a,t,n', s.log);
  check('l\'ordine nello schermo è lo stesso', await ev(() => { const c = [...document.querySelectorAll('#log .entry-action, #log .entry-year, #log .entry-others')].map(e => e.className); return c.join() === 'entry-action,entry-year,entry-others'; }));
  check('il blocco è salvato nella partita come voce «n» con le sue righe', await ev(() => { const e = window.__t.buildSavePayload().game.log.find(x => x.k === 'n'); return !!e && e.lines.length === 3 && e.lines[0] === 'Francia: Propone un accordo commerciale alla Germania Ovest.'; }));
  await restart('FRG');
  await queueJson(TURN({ mosse_altre_nazioni: [
    { nazione: 'Francia', mossa: 'Propone un accordo commerciale.' },
    { nazione: '<b>Italia</b>', mossa: '<img src=x onerror="window.__pwned=3">Avvia riforme.' },
    'Il Regno Unito consulta Washington.',
    { nazione: 'Cina' },
    { mossa: 'Una mossa senza nome.' },
    { paese: 'Egitto', azione: 'Nazionalizza il canale.' },
    { nazione: 'Spagna', mossa: 'x'.repeat(500) },
    null, 5, [], {}] }));
  await advance();
  const jn = await ev(() => ({ items: (window.__t.getState().log.find(e => e.k === 'n') || { lines: [] }).lines, html: !!document.querySelector('#log .entry-others img, #log .entry-others script, #log .entry-others *:not(b):not(br)') || document.querySelectorAll('#log .entry-others b').length !== document.querySelectorAll('#log .entry-others').length, pwned: !!window.__pwned, text: (document.querySelector('#log .entry-others') || { textContent: '' }).textContent }));
  check('righe valide accettate (anche come frasi semplici e con altri nomi dei campi), righe senza mossa e dati strani ignorati', jn.items.length === 6 && jn.items[0] === 'Francia: Propone un accordo commerciale.' && jn.items.includes('Il Regno Unito consulta Washington.') && jn.items.includes('Una mossa senza nome.') && jn.items.includes('Egitto: Nazionalizza il canale.') && !jn.items.some(x => /Cina/.test(x)), jn.items);
  check('il markup nelle mosse è neutralizzato: nessun elemento e nessuno script eseguito', !jn.html && !jn.pwned && !jn.items.some(x => /[<>]/.test(x)) && !/[<>]/.test(jn.text), { html: jn.html, pwned: jn.pwned });
  check('una mossa troppo lunga è accorciata (280 caratteri per la mossa)', jn.items.some(x => x.startsWith('Spagna: ') && x.length === 'Spagna: '.length + 280), jn.items.map(x => x.length));
  await restart('FRG');
  await queueJson(TURN({ mosse_altre_nazioni: Array.from({ length: 14 }, (_, i) => ({ nazione: 'Stato ' + (i + 1), mossa: 'Fa la mossa ' + (i + 1) + '.' })) }));
  await advance();
  const cap = await ev(() => (window.__t.getState().log.find(e => e.k === 'n') || { lines: [] }).lines);
  check('al massimo 10 mosse delle altre nazioni per turno', cap.length === 10 && cap[0] === 'Stato 1: Fa la mossa 1.' && cap[9] === 'Stato 10: Fa la mossa 10.', cap.length);
  for (const [name, bad] of [['assente', undefined], ['una stringa', 'tutti agiscono'], ['un oggetto', { nazione: 'Francia', mossa: 'x' }], ['un numero', 5], ['vuoto', []], ['solo dati inutili', [null, 5, {}, [], { nazione: 'Francia' }]]]) {
    await restart('FRG');
    await queueJson(TURN(bad === undefined ? {} : { mosse_altre_nazioni: bad }));
    await advance();
    const x = await ev(() => ({ n: window.__t.getState().log.filter(e => e.k === 'n').length, dom: document.querySelectorAll('#log .entry-others').length, log: document.getElementById('log').textContent }));
    check(`«mosse_altre_nazioni» ${name}: nessun blocco vuoto, il turno prosegue lo stesso`, x.n === 0 && x.dom === 0 && /Narrativa di prova\./.test(x.log), x);
  }
  console.log('— le altre nazioni cambiano la mappa, con le regole di sempre');
  const geo = await ev(() => {
    const P = window.__t.provinces;
    const gdr = Object.keys(P).filter(i => P[i].owner === 'GDR');
    return { A: gdr.find(i => P[i].neighbors.some(n => P[n].owner === 'FRG')), B: gdr.find(i => !P[i].neighbors.some(n => P[n].owner === 'FRG') && !P[i].neighbors.some(n => P[n].owner === 'URSS')) };
  });
  await restart('FRG');
  await queueJson(TURN({ mosse_altre_nazioni: [{ nazione: 'Unione Sovietica', mossa: 'Ritira i reparti e consegna una provincia alla Germania Ovest.' }], cambi_territoriali: [{ provincia: geo.A, nuovo_proprietario: 'FRG' }, { provincia: geo.B, nuovo_proprietario: 'URSS' }] }));
  await advance();
  const mp = await ev(g => ({ a: window.__t.provinces[g.A].owner, b: window.__t.provinces[g.B].owner, terr: [...document.querySelectorAll('#log .entry-terr')].map(e => e.textContent).join(' | '), kinds: window.__t.getState().log.map(e => e.k).join() }), geo);
  check('i cambi territoriali dello stesso turno passano dalla regola dei confini: quello valido sì, quello senza confine no, con il motivo', mp.a === 'FRG' && mp.b === 'GDR' && /Non applicato/.test(mp.terr), mp);
  check('…e la cronaca ha turno, altre nazioni e cambi sulla mappa, in quest\'ordine', mp.kinds === 't,n,g', mp.kinds);
  await ev(() => { const T = window.__t; for (const id in T.initialTerritory) { T.provinces[id].owner = T.initialTerritory[id].owner; T.provinces[id].controller = T.initialTerritory[id].controller; } T.renderMapColors(); });

  // =============================================================== 10. errore, annullamento, riprova
  console.log('— se il motore sbaglia o la richiesta è annullata, le azioni non si perdono');
  await restart('FRG');
  await send('Ordine che deve sopravvivere\nSecondo ordine');
  await ev(() => { window.__queue.push(new Error('rete assente')); });
  const pE = await nPrompts();
  await advance();
  d = await dom(); s = await st();
  check('errore del motore: è segnalato in cronaca, con la frase «Le tue azioni restano in attesa.»', /Errore nella generazione: rete assente/.test(d.log) && /Le tue azioni restano in attesa\./.test(d.log), d.log);
  check('…il contatore non si muove e nulla entra nella storia salvata', s.turn === 0 && s.log.length === 0 && d.year === '31 dicembre 1960', s);
  check('…le azioni sono ancora in coda, nell\'ordine, e nell\'elenco', JSON.stringify(s.pending) === JSON.stringify(['Ordine che deve sopravvivere', 'Secondo ordine']) && d.items.length === 2, d.items);
  check('…i pulsanti sono tornati attivi e il cursore è su «Avanza»', !d.send && !d.adv && d.rm.every(b => !b.dis) && d.focus === 'advanceBtn', d);
  await advance();
  s = await st(); d = await dom();
  check('premendo di nuovo «Avanza» le stesse azioni vengono eseguite', (await nPrompts()) === pE + 2 && s.pending.length === 0 && s.turn === 1 && s.log.join() === 'a,a,t', s);
  check('…e la riga d\'errore (solo a schermo) resta nella cronaca senza far parte della storia', /Errore nella generazione/.test(d.log) && !(await ev(() => JSON.stringify(window.__t.getState().log))).includes('Errore'));
  await send('Un ordine');
  await ev(() => { const e = new Error('annullata'); e.cancelled = true; window.__queue.push(e); });
  await advance();
  d = await dom(); s = await st();
  check('richiesta annullata: «Operazione annullata: nessuna modifica. Le tue azioni restano in attesa.» e nessun errore', /Operazione annullata: nessuna modifica\. Le tue azioni restano in attesa\./.test(d.log) && !/Errore nella generazione: annullata/.test(d.log) && s.turn === 1 && s.pending.length === 1, { log: d.log.slice(-160), s });
  await advance();
  await restart('FRG');
  await ev(() => { window.__queue.push(new Error('senza azioni')); });
  await advance();
  d = await dom();
  check('errore senza azioni in coda: nessuna frase sulle azioni che restano', /Errore nella generazione: senza azioni/.test(d.log) && !/restano in attesa/.test(d.log), d.log);
  await send('Per la risposta nulla');
  await ev(() => { window.__queue.push(Promise.resolve(null)); });
  await advance();
  d = await dom(); s = await st();
  check('una risposta nulla del motore è un errore come un altro: segnalato, azioni in coda, contatore fermo, pulsanti attivi', /Errore nella generazione/.test(d.log) && JSON.stringify(s.pending) === JSON.stringify(['Per la risposta nulla']) && s.turn === 0 && !d.send && !d.adv, { log: d.log.slice(-120), s });
  await advance();
  check('…e al tentativo dopo la partita prosegue', (await st()).turn === 1 && (await st()).pending.length === 0);
  for (const [name, bad] of [['un elenco', [1, 2, 3]], ['un testo', 'solo testo'], ['un numero', 5], ['vero', true]]) {
    await restart('FRG');
    await send('Per la risposta sbagliata');
    await ev(b => { window.__queue.push(b); }, bad);
    await advance();
    d = await dom(); s = await st();
    check(`risposta del motore che è ${name} e non un oggetto: errore chiaro, azioni in coda, contatore fermo, cronaca vuota`, /Errore nella generazione: la risposta del motore non è nel formato atteso\. Le tue azioni restano in attesa\./.test(d.log) && JSON.stringify(s.pending) === JSON.stringify(['Per la risposta sbagliata']) && s.turn === 0 && s.log.length === 0 && !d.send && !d.adv, { log: d.log.slice(-140), s });
  }
  await restart('FRG');
  await ev(() => { window.__queue.push(Object.assign(new Error('Finisce con il punto.'), {})); });
  await advance();
  check('un messaggio d\'errore che finisce già con il punto non ne riceve un secondo', /Errore nella generazione: Finisce con il punto\.\s*$/.test((await dom()).log) && !/\.\./.test((await dom()).log));

  // =============================================================== 11. mentre il motore lavora
  console.log('— mentre il motore lavora');
  await restart('FRG');
  await send('Azione A\nAzione B');
  await ev(() => { window.__d = window.__deferred(); window.__queue.push(window.__d.p); });
  const pD = await nPrompts();
  await ev(() => { const b = document.getElementById('advanceBtn'); b.click(); b.click(); b.click(); });
  await spinnerOn();
  d = await dom();
  check('premere «Avanza» più volte di fila manda una sola richiesta', (await nPrompts()) === pD + 1);
  check('mentre si aspetta: «Invia», «Avanza» e tutti i «Rimuovi» sono spenti, e la pagina lo dice', d.send && d.adv && d.rm.length === 2 && d.rm.every(b => b.dis) && /sta elaborando/.test(d.said), d);
  await ev(() => document.getElementById('advanceBtn').onclick());
  check('anche chiamata direttamente, «Avanza» non parte una seconda volta mentre una richiesta è in corso', (await nPrompts()) === pD + 1);
  await page.fill('#actionInput', 'Scritta mentre aspetto');
  await page.press('#actionInput', 'Control+Enter');
  await ev(() => window.__t.sendActions());
  check('Ctrl+Invio mentre si aspetta non mette in coda nulla (il testo resta nella casella)', (await q()).length === 2 && (await dom()).input === 'Scritta mentre aspetto');
  await ev(() => window.__t.removeAction(0));
  check('anche «Rimuovi» chiamato direttamente è ignorato mentre si aspetta', (await q()).length === 2);
  await ev(() => window.__d.res({ evento_titolo: 'Arrivato', narrativa: 'Ora è arrivata.', riepilogo_mondo: 'r', nuovo_anno: 'febbraio 1961', stabilita: 50, economia: 50, esercito: 50, prestigio: 50, cambi_territoriali: [] }));
  await spinnerOff();
  d = await dom(); s = await st();
  check('arrivata la risposta: le due azioni sono state eseguite, la coda è vuota, i pulsanti tornano', s.pending.length === 0 && s.turn === 1 && s.log.join() === 'a,a,t' && !d.send && !d.adv, { s, send: d.send });
  check('quello che avevi scritto mentre aspettavi non è perso: è ancora nella casella', d.input === 'Scritta mentre aspetto', d.input);
  await page.click('#advanceBtn');
  check('…e «Avanza» ti ricorda di inviarlo prima di far passare il tempo', /testo che non hai inviato/.test((await dom()).msg) && (await st()).turn === 1);

  // =============================================================== 12. risposte tardive
  console.log('— risposta tardiva di una partita già sostituita');
  await restart('FRG');
  await send('Ordine della vecchia partita');
  await ev(() => { window.__d = window.__deferred(); window.__queue.push(window.__d.p); });
  await page.click('#advanceBtn'); await spinnerOn();
  await restart('ITA');
  await send('Ordine della nuova partita');
  d = await dom();
  check('la nuova partita parte con i pulsanti attivi anche se la vecchia richiesta non è ancora tornata', !d.send && !d.adv, d);
  await ev(() => window.__d.res({ evento_titolo: 'Tardivo', narrativa: 'Narrativa tardiva.', riepilogo_mondo: 'Riepilogo tardivo.', nuovo_anno: 'maggio 1965', stabilita: 1, economia: 1, esercito: 1, prestigio: 1, cambi_territoriali: [], mosse_altre_nazioni: [{ nazione: 'Francia', mossa: 'Mossa tardiva.' }] }));
  await page.waitForTimeout(200);
  d = await dom(); s = await st();
  check('la risposta tardiva non tocca la nuova partita: coda, contatore, anno e cronaca restano i suoi', JSON.stringify(s.pending) === JSON.stringify(['Ordine della nuova partita']) && s.turn === 0 && s.year === '31 dicembre 1960' && s.log.length === 0 && !/tardiv/i.test(d.log), { s, log: d.log });
  check('…il pannello dice ancora la nuova nazione e i pulsanti sono attivi', !d.send && !d.adv && d.items.length === 1 && !(await ev(() => !document.getElementById('thinking').classList.contains('hidden'))));
  await ev(() => { window.__d = window.__deferred(); window.__queue.push(window.__d.p); });
  await page.click('#advanceBtn'); await spinnerOn();
  await restart('FRG');
  await ev(() => window.__d.rej(new Error('errore tardivo')));
  await page.waitForTimeout(200);
  d = await dom(); s = await st();
  check('un errore tardivo di una partita sostituita non scrive nulla nella nuova', !/tardivo/.test(d.log) && s.pending.length === 0 && !d.send && !d.adv, { log: d.log });
  // caricare un salvataggio mentre il motore lavora: vale lo stesso
  await restart('FRG');
  await send('Ordine prima del caricamento');
  const snap = await ev(() => JSON.parse(JSON.stringify(window.__t.buildSavePayload())));
  await ev(() => { window.__d = window.__deferred(); window.__queue.push(window.__d.p); });
  await page.click('#advanceBtn'); await spinnerOn();
  await ev(snap => window.__t.applySave(snap), snap);
  d = await dom(); s = await st();
  check('caricando un salvataggio mentre il motore lavora, la partita caricata ha i suoi pulsanti e la sua coda', !d.send && !d.adv && JSON.stringify(s.pending) === JSON.stringify(['Ordine prima del caricamento']) && !(await ev(() => !document.getElementById('thinking').classList.contains('hidden'))), { s, send: d.send });
  await ev(() => window.__d.res({ evento_titolo: 'Tardivo', narrativa: 'Narrativa tardiva.', riepilogo_mondo: 'x', nuovo_anno: '1999', stabilita: 1, economia: 1, esercito: 1, prestigio: 1, cambi_territoriali: [] }));
  await page.waitForTimeout(200);
  s = await st(); d = await dom();
  check('…e la risposta della partita sostituita non la altera', JSON.stringify(s.pending) === JSON.stringify(['Ordine prima del caricamento']) && s.turn === 0 && !/tardiv/i.test(d.log), s);

  // =============================================================== 13. fine partita
  console.log('— a partita finita');
  await restart('FRG');
  await send('Ordine in attesa a fine partita');
  await ev(() => { const T = window.__t; for (const id of T.getCountryProvinces('FRG')) { T.changeProvinceOwner(id, 'GDR'); T.changeProvinceController(id, 'GDR'); } T.checkGameOver(); });
  d = await dom();
  check('a partita finita «Invia», «Avanza» e «Rimuovi» sono spenti', d.send && d.adv && d.rm.every(b => b.dis), d);
  const pG = await nPrompts();
  await ev(() => { document.getElementById('actionInput').value = 'Dopo la fine'; window.__t.sendActions(); document.getElementById('advanceBtn').onclick(); window.__t.removeAction(0); });
  await page.waitForTimeout(100);
  check('…e chiamati lo stesso non fanno nulla (nessuna richiesta, la coda non cambia)', (await nPrompts()) === pG && (await q()).length === 1);
  await ev(() => window.__t.resetGame());

  // =============================================================== 14. salvataggio e caricamento
  console.log('— la coda e i turni nel salvataggio');
  await restart('FRG');
  await send('Prima azione\nSeconda azione');
  await queueJson(TURN({ mosse_altre_nazioni: [{ nazione: 'Francia', mossa: 'Mossa salvata.' }] }));
  await advance();
  await send('Azione ancora in attesa');
  await page.waitForTimeout(150);
  const doc = JSON.parse(JSON.stringify(store['save/state']));
  check('il salvataggio automatico ha la coda e il contatore dei turni', doc.game && JSON.stringify(doc.game.pending) === JSON.stringify(['Azione ancora in attesa']) && doc.game.turn === 1, doc.game && { pending: doc.game.pending, turn: doc.game.turn });
  check('…e il blocco delle altre nazioni nella cronaca', doc.game.log.some(e => e.k === 'n' && e.lines[0] === 'Francia: Mossa salvata.'));
  check('la versione del salvataggio non cambia (schemaVersion 3): i salvataggi di prima restano validi', doc.schemaVersion === 3 && doc.v === 3);
  await ev(() => window.__t.resetGame());
  check('«Nuova partita» azzera la coda, il messaggio e la casella', await ev(() => window.__t.getState().pending.length === 0 && window.__t.getState().turn === 0 && document.getElementById('actionInput').value === ''));
  const ok = await ev(() => window.__t.loadGame());
  d = await dom(); s = await st();
  check('«Carica partita» rimette la coda, il contatore e il blocco delle altre nazioni', ok === true && JSON.stringify(s.pending) === JSON.stringify(['Azione ancora in attesa']) && s.turn === 1 && d.items[0] === 'Azione ancora in attesa' && d.title === 'Azioni in attesa (1)' && /Francia: Mossa salvata\./.test(d.log), { s, items: d.items });
  check('…la lista è visibile e i pulsanti sono attivi', !d.listHidden && !d.send && !d.adv && d.rm.length === 1 && !d.rm[0].dis, d);
  await advance();
  s = await st();
  check('dopo il caricamento «Avanza» esegue l\'azione caricata e il contatore prosegue da dove era', s.turn === 2 && s.pending.length === 0 && (await lastPrompt()).includes('1. "Azione ancora in attesa"'), s);
  // salvataggio fatto con la versione precedente della pagina: niente coda, niente contatore
  const old = await ev(() => { const p = JSON.parse(JSON.stringify(window.__t.buildSavePayload())); delete p.game.pending; delete p.game.turn; return p; });
  await ev(() => window.__t.resetGame());
  const okOld = await ev(old => window.__t.applySave(old), old);
  s = await st(); d = await dom();
  check('un salvataggio della versione precedente (senza coda né contatore) si carica: coda vuota, contatore 0', okOld === true && s.pending.length === 0 && s.turn === 0 && d.listHidden && !d.emptyHidden, s);
  await advance();
  check('…e la partita prosegue normalmente', (await st()).turn === 1 && !(await dom()).adv);

  console.log('— salvataggi con dati ostili');
  const base = await ev(() => JSON.parse(JSON.stringify(window.__t.buildSavePayload())));
  const tryLoad = async patch => {
    await ev(() => window.__t.resetGame());
    const ret = await ev(([b, p]) => { const x = JSON.parse(JSON.stringify(b)); Object.assign(x.game, p); return window.__t.applySave(x); }, [base, patch]);
    return { ret, s: await st(), d: await dom() };
  };
  let h = await tryLoad({ pending: ['ok', 5, null, { a: 1 }, ['x'], '   ', 'a\u0000b\tc', 'z'.repeat(1000), ...Array.from({ length: 30 }, (_, i) => 'azione ' + i)], turn: -5 });
  check('coda ostile: restano solo le stringhe, ripulite, accorciate a 400 e al massimo 12', h.ret === true && h.s.pending.length === 12 && h.s.pending[0] === 'ok' && h.s.pending[1] === 'a b c' && h.s.pending[2] === 'z'.repeat(400) && h.s.pending[3] === 'azione 0' && h.s.pending.every(a => typeof a === 'string' && a.length > 0 && a.length <= 400 && !/[\u0000-\u001f]/.test(a)), h.s.pending.map(a => a.slice(0, 12)));
  check('…e la lista a schermo ha le stesse 12 azioni', h.d.items.length === 12 && h.d.title === 'Azioni in attesa (12)', h.d.title);
  for (const [name, val, want] of [['negativo', -5, 0], ['non numero', 'abc', 0], ['nullo', null, 0], ['infinito', Infinity, 0], ['decimale', 7.9, 7], ['enorme', 1e12, 1000000], ['testo numerico', '12', 12], ['oggetto', { a: 1 }, 0], ['lista', [3], 3]]) {
    h = await tryLoad({ turn: val });
    check(`contatore dei turni ${name}: diventa ${want}`, h.ret === true && h.s.turn === want, h.s.turn);
  }
  for (const [name, val] of [['assente', undefined], ['una stringa', 'azione'], ['un oggetto', { a: 'x' }], ['un numero', 4], ['nulla', null]]) {
    h = await tryLoad({ pending: val });
    check(`coda ${name}: si carica con la coda vuota`, h.ret === true && h.s.pending.length === 0 && h.d.listHidden, h.s.pending);
  }
  h = await tryLoad({ log: [{ k: 'n', lines: 'non una lista' }, { k: 'n', lines: ['<b>x</b><img src=x onerror="window.__pwned=4">', 5, null, 'riga ok'] }, { k: 'n' }, { k: 'n', lines: Array.from({ length: 100 }, (_, i) => 'riga ' + i) }, { k: 't', year: '1961', headline: 'T', narr: 'N' }] });
  const nn = await ev(() => ({ blocks: document.querySelectorAll('#log .entry-others').length, html: !!document.querySelector('#log .entry-others img, #log .entry-others script, #log .entry-others *:not(b):not(br)') || document.querySelectorAll('#log .entry-others b').length !== document.querySelectorAll('#log .entry-others').length, pwned: !!window.__pwned, kinds: window.__t.getState().log.map(e => e.k).join(), lens: window.__t.getState().log.filter(e => e.k === 'n').map(e => e.lines.length) }));
  check('voci «altre nazioni» ostili: markup come testo, nessuna esecuzione, righe di troppo tagliate, blocchi vuoti scartati', h.ret === true && !nn.html && !nn.pwned && nn.blocks === 2 && nn.kinds === 'n,n,t' && nn.lens[0] === 3 && nn.lens[1] === 60, nn);
  h = await tryLoad({ pending: ['<img src=x onerror="window.__pwned=5">'] });
  check('un\'azione in coda con markup si mostra come testo', await ev(() => !document.querySelector('#queueList img') && !window.__pwned && document.querySelector('#queueList .q-text').textContent.includes('<img')));
  const direct = await ev(() => { const T = window.__t; const c = T.cleanSavedGame({ mode: 'fixed', pending: ['  a   b  ', '', 3], turn: '9' }); return { pending: c.pending, turn: c.turn }; });
  check('cleanSavedGame ripulisce da solo anche senza il resto del salvataggio', JSON.stringify(direct.pending) === JSON.stringify(['a b']) && direct.turn === 9, direct);
  check('nessun errore nella console durante tutte le prove', errors.length === 0, errors);
  await browser.close();

  // =============================================================== 15. senza Claude (modalità manuale)
  console.log('— senza Claude: «Invia» non apre la finestra, «Avanza» sì');
  const M = await launch({ withClaude: false, serve: true, mobile: false, width: 700, height: 1100 });
  const mp2 = M.page, mev = (fn, arg) => mp2.evaluate(fn, arg);
  await mev(() => window.__t.startFixedScenarioGame('ITA'));
  await mp2.fill('#actionInput', 'Mobilito le riserve\nProtesto presso l\'ONU');
  await mp2.click('#sendBtn');
  await mp2.waitForTimeout(150);
  const m1 = await mev(() => ({ open: document.getElementById('manualDialog').open, pending: window.__t.getState().pending.slice(), items: document.querySelectorAll('#queueList li').length }));
  check('«Invia» in modalità manuale non apre la finestra del testo da copiare: mette solo in coda', m1.open === false && m1.pending.length === 2 && m1.items === 2, m1);
  await mp2.click('#advanceBtn');
  await mp2.waitForFunction(() => document.getElementById('manualDialog').open);
  const man = await mev(() => ({ prompt: document.getElementById('manualPrompt').value, what: document.getElementById('manualWhat').textContent }));
  check('«Avanza» apre la finestra e il testo da copiare contiene le due azioni numerate e la richiesta alle altre nazioni', man.prompt.includes('1. "Mobilito le riserve"') && man.prompt.includes('2. "Protesto presso l\'ONU"') && /le altre nazioni agiscono liberamente/.test(man.prompt) && man.prompt.includes('mosse_altre_nazioni'), man.prompt.slice(0, 200));
  check('…e la finestra dice che sta chiedendo «Avanza»', /Richiesta: «Avanza»/.test(man.what), man.what);
  await mp2.fill('#manualAnswer', 'Ecco:\n```json\n' + JSON.stringify(TURN({ mosse_altre_nazioni: [{ nazione: 'Francia', mossa: 'Risposta incollata a mano.' }] })) + '\n```');
  await mp2.click('#manualApply');
  await mp2.waitForFunction(() => !document.getElementById('manualDialog').open);
  await mp2.waitForFunction(() => document.getElementById('thinking').classList.contains('hidden'));
  const m2 = await mev(() => ({ pending: window.__t.getState().pending.length, turn: window.__t.getState().turn, others: (document.querySelector('#log .entry-others') || { textContent: '' }).textContent, log: document.getElementById('log').textContent }));
  check('incollata la risposta: la coda si svuota, il turno è contato, le mosse delle altre nazioni compaiono', m2.pending === 0 && m2.turn === 1 && /Francia: Risposta incollata a mano\./.test(m2.others) && /Mobilito le riserve/.test(m2.log), m2);
  check('nessun errore nella pagina senza Claude', M.errors.length === 0, M.errors);
  await M.browser.close();

  // =============================================================== 16. telefono
  console.log('— telefono: tocco, nessuno scorrimento in orizzontale, tema chiaro e scuro');
  for (const scheme of ['light', 'dark']) {
    const T = await launch({ width: 390, height: 844, mobile: true, colorScheme: scheme });
    const tp = T.page, tev = (fn, arg) => tp.evaluate(fn, arg);
    await tev(() => window.__t.startFixedScenarioGame('FRG'));
    await tp.fill('#actionInput', 'Mobilito le riserve al confine orientale\nApro trattative commerciali con la Francia\n' + 'Parolalunghissimasenzaspazi'.repeat(12));
    await tp.tap('#sendBtn');
    const t1 = await tev(() => ({ pending: window.__t.getState().pending.length, items: document.querySelectorAll('#queueList li').length, turn: window.__t.getState().turn }));
    check(`(${scheme}) con un tocco su «Invia» le tre azioni entrano in coda e il tempo non passa`, t1.pending === 3 && t1.items === 3 && t1.turn === 0, t1);
    const lay = await tev(() => {
      const r = id => { const b = document.getElementById(id).getBoundingClientRect(); return { w: b.width, h: b.height, right: b.right }; };
      const rm = [...document.querySelectorAll('#queueList button')].map(b => b.getBoundingClientRect());
      const lis = [...document.querySelectorAll('#queueList li')].map(l => l.getBoundingClientRect().right);
      return { scrollW: document.documentElement.scrollWidth, innerW: innerWidth, send: r('sendBtn'), adv: r('advanceBtn'), jump: r('jump'), input: r('actionInput'),
        rm: rm.map(b => ({ w: b.width, h: b.height })), lisRight: Math.max(...lis), panelRight: document.getElementById('actionsPanel').getBoundingClientRect().right };
    });
    check(`(${scheme}) nessuno scorrimento orizzontale, nemmeno con una parola lunghissima in coda`, lay.scrollW <= lay.innerW && lay.lisRight <= lay.panelRight + 1, lay);
    check(`(${scheme}) «Invia» e «Avanza» sono alti almeno 36 px, i «Rimuovi» almeno 24 px (WCAG 2.2, 2.5.8)`, lay.send.h >= 36 && lay.adv.h >= 36 && lay.rm.every(b => b.h >= 24 && b.w >= 24), lay);
    check(`(${scheme}) salto temporale e «Avanza» stanno nello schermo, affiancati`, lay.adv.right <= lay.innerW && lay.jump.w > 100, lay);
    await tp.tap('#advanceBtn');
    await tp.waitForFunction(() => window.__t.getState().turn === 1 && document.getElementById('thinking').classList.contains('hidden'));
    const t2 = await tev(() => ({ pending: window.__t.getState().pending.length, log: document.querySelectorAll('#log .entry-action').length, scrollW: document.documentElement.scrollWidth, innerW: innerWidth }));
    check(`(${scheme}) con un tocco su «Avanza» le azioni vengono eseguite`, t2.pending === 0 && t2.log === 3 && t2.scrollW <= t2.innerW, t2);
    check(`(${scheme}) nessun errore`, T.errors.length === 0, T.errors);
    await T.browser.close();
  }

  process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
