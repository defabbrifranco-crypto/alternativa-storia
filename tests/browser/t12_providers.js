// Issue #1: la pagina funziona anche fuori da Claude (senza window.claude): salvataggi nel browser,
// esporta / importa, modalità manuale al posto dell'AI. Dentro Claude il comportamento non cambia.
const fs = require('fs');
const path = require('path');
const { launch, check, summary, playTurn } = require('./harness');

const TURN = (extra = {}) => Object.assign({
  evento_titolo: 'Titolo manuale', narrativa: 'Narrativa manuale.', riepilogo_mondo: 'Riepilogo manuale.', nuovo_anno: 'marzo 1961',
  stabilita: 61, economia: 62, esercito: 63, prestigio: 64, cambi_territoriali: [], cambi_controllo: [], segnaposto: [] }, extra);
const SAVE_KEY = 'storia-alternativa:save/state';

(async () => {
  // =============================================================== A. senza Claude, servita da http (come GitHub Pages)
  console.log('— A. senza Claude, da http');
  const A = await launch({ withClaude: false, serve: true, mobile: false, width: 700, height: 1100 });
  const { page, ctx, errors } = A;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const txt = sel => page.evaluate(s => document.querySelector(s).textContent, sel);
  const hid = sel => page.evaluate(s => document.querySelector(s).classList.contains('hidden'), sel);
  const dlgOpen = id => page.evaluate(i => document.getElementById(i).open, id);
  const log = () => txt('#log');
  const focusIs = id => page.waitForFunction(i => document.activeElement && document.activeElement.id === i, id, { timeout: 3000 }).then(() => true, () => false);
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(A.url).origin });

  check('nessun errore al caricamento', errors.length === 0, errors);
  check('window.claude non esiste', await ev(() => typeof window.claude === 'undefined'));
  check('la mappa c\'è: 1020 province', (await ev(() => Object.keys(window.__t.provinces).length)) === 1020);
  check('i salvataggi vanno nel browser', (await ev(() => window.__t.getStorageKind())) === 'browser');
  check('la pagina dice dove si salva', /in questo browser/.test(await txt('#saveWhere')), await txt('#saveWhere'));
  check('i pulsanti Esporta e Importa ci sono', await ev(() => !!document.getElementById('exportBtn') && !!document.getElementById('importBtn')));
  check('«Carica» senza nulla di salvato lo dice', await ev(async () => { const ok = await window.__t.loadGame(); return ok === false && document.getElementById('saveStatus').textContent === 'Nessun salvataggio trovato.'; }));
  check('nessun banner «Continua» all\'inizio', await hid('#resumeBanner'));
  check('l\'interruttore manuale è acceso e bloccato (nessuna AI)', await ev(() => { const t = document.getElementById('manualToggle'); return t.checked && t.disabled; }));
  check('l\'interruttore lo spiega', /non c'è un'AI collegata/.test(await txt('#manualToggleText')), await txt('#manualToggleText'));
  check('le funzioni di prova non sono AI di Claude', await ev(() => window.__t.aiViaClaude() === false));

  await ev(() => window.__t.startFixedScenarioGame('ITA'));
  check('la partita parte', (await ev(() => window.__t.getGameMode())) === 'fixed');
  check('avviso informativo di modalità manuale nel registro', /Modalità manuale/.test(await log()) && !/non è disponibile/.test(await log()), await log());
  check('i pulsanti di gioco sono attivi', await ev(() => !document.getElementById('sendBtn').disabled && !document.getElementById('advanceBtn').disabled && !document.getElementById('advisorBtn').disabled && !document.getElementById('diploStartBtn').disabled));
  check('il salvataggio automatico è andato nel browser', await ev(k => { const j = localStorage.getItem(k); return !!j && JSON.parse(j).game.nation.length > 0; }, SAVE_KEY));

  // ---- il turno in modalità manuale
  console.log('— A. «Avanza» in modalità manuale');
  await playTurn(page, 'Mobilito le riserve al confine');
  await page.waitForFunction(() => document.getElementById('manualDialog').open);
  check('si apre la finestra della modalità manuale', await dlgOpen('manualDialog'));
  const prompt1 = await ev(() => document.getElementById('manualPrompt').value);
  check('il testo da copiare è il prompt del motore', /Sei il motore di gioco di un sandbox di storia alternativa/.test(prompt1) && /Il giocatore guida/.test(prompt1) && prompt1.includes('Mobilito le riserve al confine') && /Rispondi SOLO con un oggetto JSON/.test(prompt1), prompt1.slice(0, 120));
  check('il prompt comprende le regole della mappa e dei segnaposto', /cambi_territoriali/.test(prompt1) && /cambi_controllo/.test(prompt1) && /segnaposto/.test(prompt1));
  check('la finestra dice che cosa sta chiedendo', /Richiesta: «Avanza»/.test(await txt('#manualWhat')) && /non c'è un'intelligenza artificiale collegata/.test(await txt('#manualWhy')));
  check('il campo prompt è in sola lettura, la risposta è vuota', await ev(() => document.getElementById('manualPrompt').readOnly && document.getElementById('manualAnswer').value === ''));
  check('il fuoco va dentro la finestra', await ev(() => document.getElementById('manualDialog').contains(document.activeElement)));
  check('il testo da copiare si legge dall\'inizio', (await ev(() => document.getElementById('manualPrompt').scrollTop)) === 0);
  check('il cursore parte dal pulsante «Copia il testo»', (await ev(() => document.activeElement.id)) === 'manualCopy');
  check('la finestra è etichettata per i lettori di schermo', await ev(() => { const d = document.getElementById('manualDialog'); const l = document.getElementById(d.getAttribute('aria-labelledby')); return !!l && l.textContent.length > 3; }));
  await page.click('#manualCopy');
  await page.waitForFunction(() => /copi/i.test(document.getElementById('manualMsg').textContent));
  check('«Copia il testo» mette il prompt negli appunti', (await ev(() => navigator.clipboard.readText())) === prompt1);
  check('e lo conferma', /Testo copiato/.test(await txt('#manualMsg')));

  console.log('— A. risposta non valida: la finestra resta aperta');
  await page.fill('#manualAnswer', 'questa non è una risposta JSON');
  await page.click('#manualApply');
  check('risposta illeggibile: messaggio chiaro, finestra aperta', (await dlgOpen('manualDialog')) && /Non riesco a leggere la risposta/.test(await txt('#manualMsg')) && await ev(() => document.getElementById('manualMsg').classList.contains('err')), await txt('#manualMsg'));
  check('la partita non è cambiata', !/Titolo manuale/.test(await log()) && (await ev(() => window.__t.getState().year)) === '31 dicembre 1960');
  await page.fill('#manualAnswer', '[1, 2, 3]');
  await page.click('#manualApply');
  check('un elenco al posto di un oggetto è rifiutato', (await dlgOpen('manualDialog')) && /Non riesco a leggere/.test(await txt('#manualMsg')));

  console.log('— A. risposta valida, dentro un blocco di codice e con frasi attorno');
  const near = await ev(() => { const P = window.__t.provinces; for (const id in P) { if (P[id].owner !== 'ITA' && P[id].neighbors.some(n => P[n] && P[n].owner === 'ITA')) return { id, owner: P[id].owner }; } return null; });
  check('c\'è una provincia straniera confinante con l\'Italia', !!near, near);
  const answer = 'Ecco la risposta richiesta:\n```json\n' + JSON.stringify(TURN({
    cambi_territoriali: [{ provincia: near.id, nuovo_proprietario: 'ITA' }],
    segnaposto: [{ azione: 'aggiungi', tipo: 'truppe', nome: 'Truppe manuali', provincia: near.id }] }), null, 2) + '\n```\nSpero vada bene!';
  await page.fill('#manualAnswer', answer);
  await page.click('#manualApply');
  await page.waitForFunction(() => !document.getElementById('manualDialog').open);
  await page.waitForFunction(() => document.getElementById('thinking').classList.contains('hidden'));
  const r1 = await ev(id => ({ year: document.getElementById('yearLabel').textContent, st: document.getElementById('v-stabilita').textContent, eco: document.getElementById('v-economia').textContent,
    log: document.getElementById('log').textContent, owner: window.__t.provinces[id].owner, markers: window.__t.getMarkers().map(m => m.nome), act: document.getElementById('advanceBtn').disabled,
    input: document.getElementById('actionInput').value }), near.id);
  check('la finestra si chiude e la storia prosegue', r1.year === 'marzo 1961' && /Titolo manuale/.test(r1.log) && /Narrativa manuale/.test(r1.log), r1);
  check('le statistiche sono aggiornate', r1.st === '61' && r1.eco === '62', r1);
  check('il cambio di territorio passa dalle stesse regole di sempre', r1.owner === 'ITA' && /da .* a Italia|Italia/.test(r1.log), r1);
  check('il segnaposto compare', r1.markers.length === 1 && r1.markers[0] === 'Truppe manuali', r1);
  check('il campo azione è vuoto, le azioni in attesa sono entrate nella storia e il pulsante torna attivo', r1.input === '' && r1.act === false && /Mobilito le riserve al confine/.test(r1.log) && (await ev(() => window.__t.getState().pending.length === 0 && document.querySelectorAll('#queueList li').length === 0)), r1);
  check('il cursore torna al pulsante da cui si era partiti', await focusIs('advanceBtn'));
  const saved1 = await ev(k => JSON.parse(localStorage.getItem(k)), SAVE_KEY);
  check('salvataggio automatico dopo il turno (nel browser)', saved1.game.year === 'marzo 1961' && saved1.schemaVersion === 3 && saved1.v === 3 && saved1.markers.length === 1, saved1 && { y: saved1.game && saved1.game.year, sv: saved1.schemaVersion });

  console.log('— A. annullare, Esc');
  await playTurn(page, 'Mossa che annullo');
  await page.waitForFunction(() => document.getElementById('manualDialog').open);
  await page.fill('#manualAnswer', 'qualcosa scritto a metà');
  await page.click('#manualCancel');
  await page.waitForFunction(() => !document.getElementById('manualDialog').open);
  await page.waitForFunction(() => document.getElementById('thinking').classList.contains('hidden'));
  const c1 = await ev(() => ({ log: document.getElementById('log').textContent, year: window.__t.getState().year, act: document.getElementById('advanceBtn').disabled, thinking: document.getElementById('thinking').classList.contains('hidden') }));
  check('annullando: lo dice, niente cambia, il pulsante è attivo', /Operazione annullata: nessuna modifica/.test(c1.log) && c1.year === 'marzo 1961' && c1.act === false && c1.thinking, c1);
  check('annullando non compare un errore', !/Errore nella generazione/.test(c1.log), c1.log);
  check('annullando, l\'azione resta in attesa nell\'elenco: non si perde e si può rimandare con «Avanza»', await ev(() => JSON.stringify(window.__t.getState().pending) === JSON.stringify(['Mossa che annullo']) && document.querySelectorAll('#queueList li').length === 1 && document.getElementById('queueList').textContent.includes('Mossa che annullo')));
  check('annullando, il messaggio dice che le azioni restano in attesa', /Le tue azioni restano in attesa/.test(c1.log), c1.log);
  check('annullando, il cursore torna al pulsante', await focusIs('advanceBtn'));
  await page.click('#advanceBtn');
  await page.waitForFunction(() => document.getElementById('manualDialog').open);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.getElementById('manualDialog').open);
  await page.waitForFunction(() => document.getElementById('thinking').classList.contains('hidden'));
  check('Esc annulla come il pulsante', (await log()).split('Operazione annullata').length === 3 && (await ev(() => window.__t.getState().year)) === 'marzo 1961');

  console.log('— A. consigliere e diplomazia');
  await page.click('#advisorBtn');
  await page.waitForFunction(() => document.getElementById('manualDialog').open);
  check('il consigliere chiede il testo da copiare', /Sei un consigliere storico/.test(await ev(() => document.getElementById('manualPrompt').value)) && /Consigliere/.test(await txt('#manualWhat')));
  await page.click('#manualApply');
  check('risposta vuota: «Incolla prima la risposta»', (await dlgOpen('manualDialog')) && /Incolla prima la risposta/.test(await txt('#manualMsg')));
  await page.fill('#manualAnswer', 'Rafforza i confini e tratta con Parigi.');
  await page.click('#manualApply');
  await page.waitForFunction(() => !document.getElementById('manualDialog').open);
  await page.waitForFunction(() => document.getElementById('thinking').classList.contains('hidden'));
  check('il consiglio entra nel registro', /Rafforza i confini e tratta con Parigi\./.test(await log()));

  await page.click('#tabDiplo');
  await page.fill('#diploTarget', 'il Presidente francese');
  await page.click('#diploStartBtn');
  await page.fill('#diploInput', 'Propongo un accordo sul confine alpino.');
  await page.click('#diploSendBtn');
  await page.waitForFunction(() => document.getElementById('manualDialog').open);
  const d1 = await ev(() => document.getElementById('manualPrompt').value);
  check('diplomazia: il testo contiene il personaggio, il contesto e il messaggio', /Sei il Presidente francese/.test(d1) && /Propongo un accordo sul confine alpino\./.test(d1) && /rispondi SOLO con la prossima battuta/.test(d1) && /Colloquio|colloquio diplomatico/.test(await txt('#manualWhat')), d1.slice(0, 160));
  await page.fill('#manualAnswer', 'Siamo disposti a trattare, ma a certe condizioni.');
  await page.click('#manualApply');
  await page.waitForFunction(() => !document.getElementById('manualDialog').open);
  await page.waitForFunction(() => document.getElementById('diploThinking').classList.contains('hidden'));
  check('la risposta diventa una battuta del colloquio', /Siamo disposti a trattare/.test(await txt('#diploLog')));
  await page.fill('#diploInput', 'Quali condizioni?');
  await page.click('#diploSendBtn');
  await page.waitForFunction(() => document.getElementById('manualDialog').open);
  const d2 = await ev(() => document.getElementById('manualPrompt').value);
  check('seconda battuta: nel testo c\'è tutta la conversazione in ordine', d2.indexOf('Propongo un accordo') < d2.indexOf('Siamo disposti a trattare') && d2.indexOf('Siamo disposti a trattare') < d2.indexOf('Quali condizioni?') && /\[Risposta del personaggio\]/.test(d2) && /\[Istruzioni e primo messaggio del giocatore\]/.test(d2), d2.slice(-260));
  await page.click('#manualCancel');
  await page.waitForFunction(() => !document.getElementById('manualDialog').open);
  await page.waitForFunction(() => document.getElementById('diploThinking').classList.contains('hidden'));
  check('colloquio annullato: lo dice e la cronologia resta alternata', /Messaggio annullato/.test(await txt('#diploLog')) && (await ev(() => window.__t.getState().diplo.history.map(h => h.role).join())) === 'user,assistant');
  await page.click('#tabActions');

  console.log('— A. una partita sostituita mentre la finestra è aperta');
  await playTurn(page, 'Mossa destinata a perdersi');
  await page.waitForFunction(() => document.getElementById('manualDialog').open);
  await ev(() => window.__t.resetGame());
  check('«Nuova partita» chiude la finestra e scarta la richiesta', !(await dlgOpen('manualDialog')) && (await hid('#thinking')) && !/annullata|Errore/.test(await log()), await log());
  await page.waitForTimeout(100);
  check('la partita sostituita non lascia tracce', (await ev(() => window.__t.getMarkers().length)) === 0 && (await ev(() => window.__t.getGameMode())) === null);

  console.log('— A. riprendere dopo aver ricaricato la pagina');
  await ev(() => window.__t.startFixedScenarioGame('ITA'));
  await playTurn(page, 'Seconda partita');
  await page.waitForFunction(() => document.getElementById('manualDialog').open);
  await page.fill('#manualAnswer', JSON.stringify(TURN({ evento_titolo: 'Da ricordare', nuovo_anno: 'giugno 1961' })));
  await page.click('#manualApply');
  await page.waitForFunction(() => !document.getElementById('manualDialog').open && document.getElementById('thinking').classList.contains('hidden'));
  await page.reload();
  await page.waitForFunction(() => window.__t);
  await page.waitForFunction(() => !document.getElementById('resumeBanner').classList.contains('hidden'));
  check('dopo il ricaricamento compare «Continua» con la partita salvata', /Partita salvata: Italia/.test(await txt('#resumeText')) && /giugno 1961/.test(await txt('#resumeText')), await txt('#resumeText'));
  await page.click('#resumeBtn');
  check('«Continua» riporta la partita com\'era', (await txt('#yearLabel')) === 'giugno 1961' && /Da ricordare/.test(await log()) && (await ev(() => window.__t.getGameMode())) === 'fixed');

  // ---- esporta
  console.log('— A. esporta');
  await page.click('#exportBtn');
  check('la finestra di esportazione si apre con il testo del salvataggio', (await dlgOpen('transferDialog')) && (await txt('#transferTitle')) === 'Esporta il salvataggio' && await hid('#transferImport') && !(await hid('#transferExport')));
  const exported = await ev(() => document.getElementById('transferOut').value);
  check('il salvataggio esportato si legge dall\'inizio', (await ev(() => document.getElementById('transferOut').scrollTop)) === 0);
  check('fuori da Claude il pulsante «Scarica file» c\'è', await ev(() => !document.getElementById('transferDownload').classList.contains('hidden')) && /Se «Scarica file» non parte/.test(await txt('#transferDownloadHint')));
  const exp = JSON.parse(exported);
  check('il testo è un salvataggio completo (v3, schemaVersion 3, partita)', exp.v === 3 && exp.schemaVersion === 3 && exp.game && exp.game.nation === 'Italia' && exp.game.year === 'giugno 1961', Object.keys(exp));
  await page.click('#transferCopy');
  await page.waitForFunction(() => /copiat/i.test(document.getElementById('transferMsg').textContent));
  check('«Copia» mette il salvataggio negli appunti', (await ev(() => navigator.clipboard.readText())) === exported);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#transferDownload')]);
  check('«Scarica file» produce un file .json con lo stesso testo', dl.suggestedFilename() === 'storia-alternativa-salvataggio.json' && fs.readFileSync(await dl.path(), 'utf8') === exported);
  await page.click('#transferClose');
  check('«Chiudi» chiude la finestra', !(await dlgOpen('transferDialog')));
  check('nessun errore in tutto il blocco A', errors.length === 0, errors);
  await A.browser.close();

  // =============================================================== B. importare in un browser pulito
  console.log('— B. importare (browser nuovo, senza Claude, da file://)');
  const B = await launch({ withClaude: false, mobile: false, width: 700, height: 1100 });
  const pb = B.page, evb = (fn, arg) => pb.evaluate(fn, arg);
  const txb = sel => pb.evaluate(s => document.querySelector(s).textContent, sel);
  check('anche da file:// nessun errore e salvataggio nel browser', B.errors.length === 0 && (await evb(() => window.__t.getStorageKind())) === 'browser', B.errors);
  await pb.click('#importBtn');
  check('la finestra di importazione si apre', (await evb(() => document.getElementById('transferDialog').open)) && (await txb('#transferTitle')) === 'Importa un salvataggio' && await evb(() => document.getElementById('transferExport').classList.contains('hidden')));
  await pb.fill('#transferIn', 'questo non è un salvataggio');
  await pb.click('#transferLoad');
  check('testo illeggibile: messaggio chiaro, finestra aperta, niente cambia', /non è un salvataggio leggibile/.test(await txb('#transferMsg')) && (await evb(() => document.getElementById('transferDialog').open)) && (await evb(() => window.__t.getGameMode())) === null);
  await pb.fill('#transferIn', '{"v":99,"changes":{}}');
  await pb.click('#transferLoad');
  check('salvataggio di una versione sconosciuta: rifiutato e detto', /non è un salvataggio valido/.test(await txb('#transferMsg')) && /non valido/.test(await txb('#saveStatus')) && (await evb(() => window.__t.getGameMode())) === null, await txb('#transferMsg'));
  await pb.fill('#transferIn', '{"v":3,"schemaVersion":3,"changes":{"__proto__":{"owner":"ITA","controller":"ITA"}},"game":null}');
  await pb.click('#transferLoad');
  await pb.waitForTimeout(150);
  check('un salvataggio con chiavi ostili è ignorato nelle chiavi e non inquina gli oggetti', await evb(() => ({}).owner === undefined && ({}).controller === undefined && Object.prototype.owner === undefined));
  if (await evb(() => document.getElementById('transferDialog').open)) await pb.click('#transferClose');
  // dal file: il file esportato prima
  await pb.click('#importBtn');
  await pb.setInputFiles('#transferFile', { name: 'salvataggio.json', mimeType: 'application/json', buffer: Buffer.from(exported) });
  await pb.waitForFunction(() => /File letto/.test(document.getElementById('transferMsg').textContent));
  check('scegliendo un file, il testo viene letto nel campo', (await evb(() => document.getElementById('transferIn').value)) === exported);
  await pb.click('#transferLoad');
  await pb.waitForFunction(() => !document.getElementById('transferDialog').open);
  const imp = await evb(k => ({ mode: window.__t.getGameMode(), year: document.getElementById('yearLabel').textContent, nation: document.getElementById('nationLabel').textContent,
    status: document.getElementById('saveStatus').textContent, stored: JSON.parse(localStorage.getItem(k)).game.year, owner: window.__t.provinces && null }), SAVE_KEY);
  check('importato: la partita è com\'era, e il salvataggio è stato scritto nel browser', imp.mode === 'fixed' && imp.year === 'giugno 1961' && imp.nation === 'Italia' && imp.stored === 'giugno 1961', imp);
  check('lo stato dell\'importazione è dichiarato', imp.status === 'Salvataggio importato.', imp.status);
  await pb.click('#importBtn');
  await pb.setInputFiles('#transferFile', { name: 'enorme.json', mimeType: 'application/json', buffer: Buffer.alloc(6 * 1024 * 1024, 'a') });
  await pb.waitForFunction(() => /troppo grande/.test(document.getElementById('transferMsg').textContent));
  check('un file enorme è rifiutato', await evb(() => document.getElementById('transferIn').value === ''));
  await pb.click('#transferClose');
  check('nessun errore nel blocco B', B.errors.length === 0, B.errors);
  await B.browser.close();

  // =============================================================== C. localStorage bloccato: si salva in memoria
  console.log('— C. browser che non lascia salvare');
  const C = await launch({ withClaude: false, blockStorage: true, mobile: false, width: 700, height: 1100 });
  const pc = C.page, evc = (fn, arg) => pc.evaluate(fn, arg);
  const txc = sel => pc.evaluate(s => document.querySelector(s).textContent, sel);
  check('nessun errore anche con localStorage che lancia eccezioni', C.errors.length === 0, C.errors);
  check('la pagina salva solo in memoria e lo dice', (await evc(() => window.__t.getStorageKind())) === 'memory' && /non permette di salvare/.test(await txc('#saveWhere')), await txc('#saveWhere'));
  await evc(() => window.__t.startFixedScenarioGame('ITA'));
  const memo = await evc(async () => {
    const T = window.__t, P = T.provinces;
    const id = Object.keys(P).find(i => P[i].owner !== 'ITA' && P[i].neighbors.some(n => P[n] && P[n].owner === 'ITA'));
    const was = P[id].owner;
    T.changeProvinceOwner(id, 'ITA');
    const saved = await T.saveGame();
    const status1 = document.getElementById('saveStatus').textContent;
    T.changeProvinceOwner(id, was);
    const loaded = await T.loadGame();
    return { saved, status1, loaded, status2: document.getElementById('saveStatus').textContent, owner: P[id].owner };
  });
  check('salvare e caricare funzionano in memoria', memo.saved === true && memo.status1 === 'Partita salvata.' && memo.loaded === true && memo.status2 === 'Partita caricata.' && memo.owner === 'ITA', memo);
  await pc.click('#exportBtn');
  const memExp = JSON.parse(await evc(() => document.getElementById('transferOut').value));
  check('anche così si può esportare il salvataggio', memExp.v === 3 && memExp.game && memExp.game.nation === 'Italia', Object.keys(memExp));
  await pc.click('#transferClose');
  await pc.click('#manualToggle', { force: true }).catch(() => {});
  check('l\'interruttore manuale non rompe nulla senza localStorage', C.errors.length === 0, C.errors);
  await C.browser.close();

  // =============================================================== D. dentro Claude: stessa cosa di prima, con l'interruttore
  console.log('— D. dentro Claude');
  const store = {};
  const D = await launch({ store, mobile: false, width: 700, height: 1100 });
  const pd = D.page, evd = (fn, arg) => pd.evaluate(fn, arg);
  const txd = sel => pd.evaluate(s => document.querySelector(s).textContent, sel);
  check('dentro Claude: salvataggi nello spazio di Claude', (await evd(() => window.__t.getStorageKind())) === 'claude' && /spazio di Claude/.test(await txd('#saveWhere')));
  check('l\'AI è quella di Claude e l\'interruttore è libero e spento', await evd(() => { const t = document.getElementById('manualToggle'); return window.__t.aiViaClaude() === true && !t.checked && !t.disabled; }));
  await evd(() => window.__t.startFixedScenarioGame('FRA'));
  check('nessun avviso di modalità manuale', !/Modalità manuale/.test(await txd('#log')));
  await playTurn(pd, 'Prima mossa con l\'AI');
  await pd.waitForFunction(() => window.__prompts.length === 1 && document.getElementById('thinking').classList.contains('hidden'));
  check('la mossa passa dall\'AI di Claude: nessuna finestra', !(await evd(() => document.getElementById('manualDialog').open)) && /Titolo di prova/.test(await txd('#log')));
  check('il salvataggio va nel db di Claude, non nel browser', !!store['save/state'] && (await evd(k => localStorage.getItem(k), SAVE_KEY)) === null && store['save/state'].schemaVersion === 3);
  await pd.click('#manualToggle');
  check('acceso l\'interruttore: l\'AI di Claude non è più usata', (await evd(() => window.__t.aiViaClaude())) === false && (await evd(() => window.__t.getManualForced())) === true);
  await playTurn(pd, 'Seconda mossa a mano');
  await pd.waitForFunction(() => document.getElementById('manualDialog').open);
  check('con l\'interruttore acceso si apre la finestra e l\'AI non viene chiamata', (await evd(() => window.__prompts.length)) === 1 && /Hai scelto la modalità manuale/.test(await txd('#manualWhy')));
  await pd.click('#manualCancel');
  await pd.waitForFunction(() => !document.getElementById('manualDialog').open && document.getElementById('thinking').classList.contains('hidden'));
  check('la scelta resta dopo aver ricaricato la pagina', await (async () => { await pd.reload(); await pd.waitForFunction(() => window.__t); return evd(() => window.__t.getManualForced() === true && localStorage.getItem('storia-alternativa:manual') === '1'); })());
  await pd.waitForFunction(() => !document.getElementById('resumeBanner').classList.contains('hidden'));
  await pd.click('#resumeBtn');
  check('ricaricata: la partita si riprende dal db di Claude e l\'interruttore è ancora acceso', (await evd(() => document.getElementById('manualToggle').checked)) && /Titolo di prova/.test(await txd('#log')));
  await pd.click('#manualToggle');
  await playTurn(pd, 'Terza mossa con l\'AI');
  // (dopo il ricaricamento l'elenco delle richieste all'AI riparte da zero: una sola, la terza mossa)
  await pd.waitForFunction(() => window.__prompts.length === 1 && document.getElementById('thinking').classList.contains('hidden'));
  check('spento l\'interruttore, torna l\'AI di Claude', (await evd(() => window.__prompts.length)) === 1 && !(await evd(() => document.getElementById('manualDialog').open)));
  check('nessun errore nel blocco D', D.errors.length === 0, D.errors);
  await D.browser.close();

  // =============================================================== D2. dentro Claude, «Scarica file» passa dalla capacità downloads
  console.log('— D2. dentro Claude: scaricare il salvataggio');
  const D2 = await launch({ mobile: false, width: 700, height: 1100 });
  const pd2 = D2.page, evd2 = (fn, arg) => pd2.evaluate(fn, arg);
  const txd2 = sel => pd2.evaluate(s => document.querySelector(s).textContent, sel);
  await evd2(() => window.__t.startFixedScenarioGame('FRA'));
  await pd2.click('#exportBtn');
  check('il pulsante «Scarica file» c\'è e il suggerimento rimanda a «Copia»', await evd2(() => !document.getElementById('transferDownload').classList.contains('hidden')) && /Se «Scarica file» non parte/.test(await txd2('#transferDownloadHint')));
  const text2 = await evd2(() => document.getElementById('transferOut').value);
  await pd2.click('#transferDownload');
  await pd2.waitForFunction(() => /Salvataggio scaricato/.test(document.getElementById('transferMsg').textContent));
  const dl2 = await evd2(() => window.__downloads);
  check('il file passa da Claude: nome .json e contenuto uguale al testo', dl2.length === 1 && dl2[0].filename === 'storia-alternativa-salvataggio.json' && dl2[0].data === text2, dl2.length);
  await evd2(() => { window.__downloadsFail = 'declined'; });
  await pd2.click('#transferDownload');
  await pd2.waitForFunction(() => /Download annullato/.test(document.getElementById('transferMsg').textContent));
  check('se chi guarda rifiuta: «Download annullato», senza segnalare un errore', !(await evd2(() => document.getElementById('transferMsg').classList.contains('err'))) && (await evd2(() => window.__downloads.length)) === 1);
  await evd2(() => { window.__downloadsFail = 'unavailable'; });
  await pd2.click('#transferDownload');
  await pd2.waitForFunction(() => /Download non riuscito/.test(document.getElementById('transferMsg').textContent));
  check('altri errori: messaggio con rimando a «Copia»', /usa «Copia»/.test(await txd2('#transferMsg')) && await evd2(() => document.getElementById('transferMsg').classList.contains('err')));
  check('nessun errore della pagina (downloads)', D2.errors.length === 0, D2.errors);
  await D2.browser.close();

  // Claude senza la capacità downloads: il pulsante non c'è (da lì un download diretto non funzionerebbe)
  const D3 = await launch({ withDownloads: false, mobile: false, width: 700, height: 1100 });
  await D3.page.evaluate(() => window.__t.startFixedScenarioGame('FRA'));
  await D3.page.click('#exportBtn');
  const d3 = await D3.page.evaluate(() => ({ hidden: document.getElementById('transferDownload').classList.contains('hidden'), display: getComputedStyle(document.getElementById('transferDownload')).display,
    hint: document.getElementById('transferDownloadHint').textContent, copy: getComputedStyle(document.getElementById('transferCopy')).display !== 'none' }));
  check('dentro Claude ma senza downloads: niente «Scarica file», resta «Copia» e lo spiega', d3.hidden && d3.display === 'none' && /usa «Copia»/.test(d3.hint) && d3.copy, d3);
  check('nessun errore della pagina (senza downloads)', D3.errors.length === 0, D3.errors);
  await D3.browser.close();

  // =============================================================== E. dentro Claude ma senza modello
  console.log('— E. Claude c\'è, il modello no');
  const E = await launch({ withSample: false, mobile: false, width: 700, height: 1100 });
  const pe = E.page, eve = (fn, arg) => pe.evaluate(fn, arg);
  check('db di Claude sì, AI no: salvataggio in Claude e modalità manuale automatica', (await eve(() => window.__t.getStorageKind())) === 'claude' && (await eve(() => { const t = document.getElementById('manualToggle'); return t.checked && t.disabled && window.__t.aiViaClaude() === false; })));
  check('nessun errore nel blocco E', E.errors.length === 0, E.errors);
  await E.browser.close();

  // =============================================================== F. versione del salvataggio e lettura della risposta incollata
  console.log('— F. funzioni di lettura');
  const F = await launch({ withClaude: false, mobile: false });
  const evf = (fn, arg) => F.page.evaluate(fn, arg);
  const sv = await evf(() => { const s = window.__t.saveVersion; return [s({ v: 2 }), s({ v: 3 }), s({ schemaVersion: 3, v: 2 }), s({ schemaVersion: 3 }), s(null), s('x'), s(Object.create({ schemaVersion: 9 }))]; });
  check('saveVersion: legge schemaVersion, altrimenti v; ignora quanto è ereditato', JSON.stringify(sv) === '[2,3,3,3,null,null,null]', sv);
  const pj = await evf(() => {
    const p = window.__t.parseManualJson, out = {};
    const t = (k, s) => { try { out[k] = p(s); } catch (e) { out[k] = 'ERRORE'; } };
    t('semplice', '{"a":1}');
    t('recinto', 'Certo!\n```json\n{"a":1,"b":{"c":"}"}}\n```\nFatto.');
    t('recinto senza lingua', '```\n{"a":2}\n```');
    t('frasi attorno', 'Ecco: {"a":3} grazie');
    t('virgolette curve', '{“a”: “b”}');
    t('virgola finale', '{"a":1,"b":[1,2,],}');
    t('elenco', '[1,2]');
    t('senza graffe', 'niente');
    t('vuota', '');
    t('rotta', '{"a":');
    return out;
  });
  check('lettura: JSON semplice, con recinto, con frasi attorno', pj.semplice.a === 1 && pj.recinto.b.c === '}' && pj['recinto senza lingua'].a === 2 && pj['frasi attorno'].a === 3, pj);
  check('lettura: virgolette curve e virgole finali sono perdonate', pj['virgolette curve'].a === 'b' && pj['virgola finale'].a === 1 && pj['virgola finale'].b.length === 2, pj);
  check('lettura: elenchi, testo senza graffe, vuoto e JSON rotto sono rifiutati', pj.elenco === 'ERRORE' && pj['senza graffe'] === 'ERRORE' && pj.vuota === 'ERRORE' && pj.rotta === 'ERRORE', pj);
  const pt = await evf(() => [window.__t.promptText('ciao'), window.__t.promptText([{ role: 'user', content: 'Sei X.\n\nCiao' }, { role: 'assistant', content: 'Salve' }, { role: 'user', content: 'Allora?' }])]);
  check('testo da copiare: una stringa resta com\'è, una conversazione diventa un copione', pt[0] === 'ciao' && /\[Istruzioni e primo messaggio del giocatore\]\nSei X\./.test(pt[1]) && /\[Risposta del personaggio\]\nSalve/.test(pt[1]) && /\[Giocatore\]\nAllora\?/.test(pt[1]), pt);
  check('nessun errore nel blocco F', F.errors.length === 0, F.errors);
  await F.browser.close();

  // =============================================================== G. su telefono
  console.log('— G. telefono, senza Claude');
  const G = await launch({ withClaude: false, mobile: true, width: 390, height: 844 });
  const pg = G.page, evg = (fn, arg) => pg.evaluate(fn, arg);
  await evg(() => window.__t.startFixedScenarioGame('ITA'));
  await playTurn(pg, 'Prova su telefono', { tap: true });
  await pg.waitForFunction(() => document.getElementById('manualDialog').open);
  const ph = await evg(() => {
    const d = document.getElementById('manualDialog').getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight;
    const btn = id => { const r = document.getElementById(id).getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: r.height }; };
    return { w: d.width, vw, left: d.left, right: d.right, top: d.top, bottom: d.bottom, vh, scrollW: document.documentElement.scrollWidth, apply: btn('manualApply'), cancel: btn('manualCancel'),
      font: parseFloat(getComputedStyle(document.getElementById('manualAnswer')).fontSize) };
  });
  check('telefono: la finestra sta nello schermo e la pagina non scorre di lato', ph.left >= 0 && ph.right <= ph.vw && ph.scrollW <= ph.vw + 1, ph);
  check('telefono: i pulsanti sono raggiungibili (la finestra scorre dentro)', ph.apply.h >= 30 && ph.cancel.h >= 30 && ph.top >= 0 && ph.bottom <= ph.vh + 1, ph);
  check('telefono: i campi di testo sono a 16 px (il telefono non ingrandisce la pagina)', ph.font >= 16, ph.font);
  if (process.env.SHOT_DIR) await pg.screenshot({ path: path.join(process.env.SHOT_DIR, 'manuale_telefono.png') });
  await pg.tap('#manualCancel');
  check('nessun errore sul telefono', G.errors.length === 0, G.errors);
  await G.browser.close();

  // =============================================================== H. salvataggi ostili o malformati (ora si possono importare da file o da testo)
  console.log('— H. salvataggi ostili e malformati');
  const H = await launch({ withClaude: false, mobile: false, width: 700, height: 1100 });
  const pH = H.page, evH = (fn, arg) => pH.evaluate(fn, arg);
  const importText = async obj => {
    await pH.click('#importBtn');
    await pH.fill('#transferIn', typeof obj === 'string' ? obj : JSON.stringify(obj));
    await pH.click('#transferLoad');
    await pH.waitForTimeout(120);
    const msg = await evH(() => ({ open: document.getElementById('transferDialog').open, note: document.getElementById('transferMsg').textContent, status: document.getElementById('saveStatus').textContent }));
    if (msg.open) await pH.click('#transferClose');
    return msg;
  };
  const X = '<img src=x onerror="window.__xss=1"><script>window.__xss=2</' + 'script><b id="xss-b">grassetto</b>';
  const stats = { stabilita: 50, economia: 50, esercito: 50, prestigio: 50 };
  const evil = { v: 3, schemaVersion: 3, changes: {}, selectedCountryId: 'ITA', savedAt: 'x',
    game: { mode: 'fixed', over: false, nation: 'Italia', year: X, premise: X, worldSummary: X, stats,
      log: [{ k: 'a', text: X }, { k: 't', year: X, headline: X, narr: X }, { k: 'v', text: X }, { k: 'g', lines: [X, X] }, { k: 'x', text: X }, { k: 'zzz', text: X }],
      diplo: { target: X, history: [{ role: 'user', content: X }, { role: 'assistant', content: X }], bubbles: [{ w: 'u', t: X }, { w: 'o', t: X }] } },
    markers: [{ id: 'S1', tipo: 'truppe', nome: X, nota: X, provincia: null, x: 1000, y: 800, stato: 'ITA', anno: X, origine: 'motore' }] };
  const r1h = await importText(evil);
  check('un salvataggio con HTML e script nei testi viene importato', r1h.status === 'Salvataggio importato.' && !r1h.open, r1h);
  const sec = await evH(() => ({ xss: window.__xss, scripts: document.querySelectorAll('script').length, imgs: document.querySelectorAll('img[src="x"]').length, b: !!document.getElementById('xss-b'),
    log: document.getElementById('log').textContent, diplo: document.getElementById('diploLog').textContent, label: document.getElementById('diploTargetLabel').textContent,
    year: document.getElementById('yearLabel').textContent, markers: window.__t.getMarkers().length }));
  check('nessuno script eseguito, nessun elemento inserito', sec.xss === undefined && sec.scripts === 2 && sec.imgs === 0 && sec.b === false, sec);
  check('i testi compaiono come testo, parola per parola', sec.log.includes('<img src=x onerror=') && sec.diplo.includes('<img src=x onerror=') && sec.label.includes('<img src=x') && sec.year.includes('<img src=x'), sec);
  check('anche il segnaposto è importato, con il nome come testo', sec.markers === 1, sec);
  check('nessun errore della pagina con il salvataggio ostile', H.errors.length === 0, H.errors);

  const junk = [
    ['righe di registro con forme sbagliate', { k: 'x' }, { log: [{ k: 'g', lines: 'stringa' }, { k: 'g', lines: 5 }, { k: 'g' }, { k: 't' }, null, 7, 'x', [], { k: 5 }, { k: 'a' }] }],
    ['conversazione con voci sbagliate', null, { diplo: { target: 'Qualcuno', history: [null, 5, 'a', { role: 'system', content: 'z' }, { role: 'user' }, { role: 'user', content: 5 }], bubbles: [null, 5, 'a', {}, { w: 'u' }] } }],
    ['registro e conversazione che non sono elenchi', null, { stats: 'abc', log: 'no', diplo: 'no' }],
    ['campi vuoti o di tipo sbagliato', null, { stats: null, log: null, diplo: null, nation: null, year: { a: 1 }, premise: [1, 2], worldSummary: 5 }],
  ];
  for (const [name, , patch] of junk) {
    const save = { v: 3, schemaVersion: 3, changes: {}, savedAt: 'x', game: Object.assign({ mode: 'fixed', over: false, nation: 'Italia', year: '1961', premise: '', worldSummary: '', stats }, patch) };
    const r = await importText(save);
    const st = await evH(() => { const s = window.__t.getState(); return { mode: window.__t.getGameMode(), log: Array.isArray(s.log), hist: Array.isArray(s.diplo.history), bub: Array.isArray(s.diplo.bubbles), stats: Object.keys(s.stats).join() }; });
    check('malformato — ' + name + ': importato senza errori e con uno stato coerente', r.status === 'Salvataggio importato.' && st.mode === 'fixed' && st.log && st.hist && st.bub && st.stats === 'stabilita,economia,esercito,prestigio' && H.errors.length === 0, [r, st, H.errors]);
  }
  const rstr = await importText({ v: 3, schemaVersion: 3, changes: {}, game: 'non un oggetto' });
  check('una partita che non è un oggetto è rifiutata con il messaggio chiaro', /non è un salvataggio valido/.test(rstr.note) && /non valido/.test(rstr.status) && rstr.open === true, rstr);
  const rarr = await importText('[1,2,3]');
  check('un elenco al posto del salvataggio è rifiutato', /non è un salvataggio valido/.test(rarr.note), rarr);
  // un salvataggio fatto da questa pagina si ricarica identico (nessun campo perso dal controllo)
  await evH(() => window.__t.startFixedScenarioGame('ITA'));
  await evH(() => window.__t.getState().log.push({ k: 'a', text: 'Prima' }, { k: 't', year: '1961', headline: 'Titolo', narr: 'Testo' }, { k: 'v', text: 'Consiglio' }, { k: 'g', lines: ['Riga 1', 'Riga 2'] }));
  await evH(() => { const s = window.__t.getState(); s.diplo = { target: 'Tizio', history: [{ role: 'user', content: 'Ciao' }, { role: 'assistant', content: 'Salve' }], bubbles: [{ w: 'u', t: 'Ciao' }, { w: 'o', t: 'Salve' }] }; });
  const before = await evH(() => JSON.stringify(window.__t.buildSavePayload().game));
  const rrt = await importText(JSON.parse(await evH(() => JSON.stringify(window.__t.buildSavePayload()))));
  const after = await evH(() => JSON.stringify(window.__t.buildSavePayload().game));
  check('esporta e reimporta: la partita è identica, campo per campo', rrt.status === 'Salvataggio importato.' && before === after && before.includes('Riga 2') && before.includes('Salve'), [before.length, after.length]);
  check('nessun errore in tutto il blocco H', H.errors.length === 0, H.errors);
  await H.browser.close();

  // =============================================================== I. il browser è pieno: il salvataggio fallisce e lo dice
  console.log('— I. spazio del browser esaurito');
  const I = await launch({ withClaude: false, mobile: false, width: 700, height: 1100 });
  const pi = I.page, evi = (fn, arg) => pi.evaluate(fn, arg);
  await evi(() => window.__t.startFixedScenarioGame('ITA'));
  await evi(() => { window.__origSet = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new DOMException('full', 'QuotaExceededError'); }; });
  await pi.click('#saveGameBtn');
  await pi.waitForTimeout(150);
  check('salvataggio non riuscito: lo dice e indica «Esporta»', (await evi(() => document.getElementById('saveStatus').textContent)) === 'Salvataggio non riuscito. Usa «Esporta» per conservare la partita.');
  await pi.click('#exportBtn');
  check('anche con il browser pieno si può esportare', JSON.parse(await evi(() => document.getElementById('transferOut').value)).game.nation === 'Italia');
  await pi.click('#transferClose');
  await evi(() => { Storage.prototype.setItem = window.__origSet; });
  await pi.click('#saveGameBtn');
  await pi.waitForTimeout(150);
  check('liberato lo spazio, il salvataggio torna a funzionare', (await evi(() => document.getElementById('saveStatus').textContent)) === 'Partita salvata.');
  check('nessun errore della pagina', I.errors.length === 0, I.errors);
  await I.browser.close();

  process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
