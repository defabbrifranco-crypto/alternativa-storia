// «Gioco» ed «Editor scenario» sono due modalità separate; la legenda fissa spiega proprietario e controllore.
// Durante la partita il territorio cambia solo per le regole e gli eventi della storia; lo scenario modificato
// a mano è un salvataggio senza partita, che si conserva in un file e non sovrascrive mai la partita salvata.
const { launch, check, summary, playTurn } = require('./harness');
(async () => {
  // una partita salvata in precedenza: né l'editor né i file di scenario devono sovrascriverla
  const savedGame = { v: 3, schemaVersion: 3, changes: {}, savedAt: '2026-10-01T10:00:00.000Z',
    game: { mode: 'fixed', over: false, nation: 'Italia', year: 'marzo 1961', premise: 'p', worldSummary: 'w', stats: { stabilita: 51, economia: 52, esercito: 53, prestigio: 54 },
      log: [{ k: 't', year: 'marzo 1961', headline: 'T', narr: 'N' }], diplo: { target: '', history: [], bubbles: [] } } };
  const store = { 'save/state': JSON.parse(JSON.stringify(savedGame)) };
  const { browser, page, errors } = await launch({ width: 640, height: 1100, mobile: false, store });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const txt = sel => page.evaluate(s => document.querySelector(s).textContent, sel);
  const hid = sel => page.evaluate(s => document.querySelector(s).classList.contains('hidden'), sel);
  const CTL = ['pp-transferSelect', 'pp-transferBtn', 'pp-controlBtn', 'pp-markerType', 'pp-markerBtn'];
  const shown = ids => ev(l => l.map(i => document.getElementById(i).offsetParent !== null), ids);
  const unchangedSlot = () => JSON.stringify(store['save/state']) === JSON.stringify(savedGame);

  const geo = await ev(() => {
    const P = window.__t.provinces;
    const A = Object.keys(P).filter(i => P[i].owner === 'CHE').find(i => P[i].neighbors.some(n => P[n].owner === 'ITA'));      // a Swiss province touching Italy
    const G = Object.keys(P).filter(i => P[i].owner === 'GDR').find(i => P[i].neighbors.some(n => P[n].owner === 'FRG'));      // a GDR province touching the FRG
    const lom = Object.keys(P).find(i => P[i].name === 'Lombardia' && P[i].owner === 'ITA');
    return { A, G, lom, U: 'URSS_01' };
  });
  check('test map: a Swiss province next to Italy, a GDR border province, Lombardia, a Soviet province', geo.A && geo.G && geo.lom && !!(await ev(() => window.__t.provinces.URSS_01)), geo);

  // ------------------------------------------------------------------ the page opens in «Gioco»
  console.log('— the page opens in «Gioco»');
  const m0 = await ev(() => ({ g: document.getElementById('modeGameBtn').getAttribute('aria-pressed'), e: document.getElementById('modeEditBtn').getAttribute('aria-pressed'),
    ed: document.body.classList.contains('editing'), note: document.getElementById('modeNote').textContent, eMode: window.__t.getEditorMode(),
    disabled: document.getElementById('modeEditBtn').getAttribute('aria-disabled'), group: document.querySelector('.mode-switch').getAttribute('aria-label') }));
  check('«Gioco» is on, the editor is off, the editor is available', m0.g === 'true' && m0.e === 'false' && !m0.ed && m0.eMode === false && m0.disabled === 'false' && m0.group === 'Modalità della mappa', m0);
  check('the note says how to play and where the editor is', /Gioca come/.test(m0.note) && /Editor scenario/.test(m0.note), m0.note);

  // ------------------------------------------------------------------ the fixed legend
  console.log('— the fixed legend: owner and controller');
  const lg = await ev(() => { const L = document.getElementById('ownLegend'), sw = [...L.querySelectorAll('.sw')];
    return { shown: L.offsetParent !== null, text: L.textContent, n: sw.length, ariaHidden: sw.every(s => s.getAttribute('aria-hidden') === 'true'),
      solid: getComputedStyle(L.querySelector('.sw-solid')).backgroundColor, occ: getComputedStyle(L.querySelector('.sw-occ')).backgroundImage,
      role: L.getAttribute('role'), label: L.getAttribute('aria-label') }; });
  check('the legend is on view from the start, before any occupation', lg.shown && (await hid('#occNote')), lg);
  check('it explains the solid colour and the diagonal stripes in words', /Colore pieno/.test(lg.text) && /proprietario controlla/.test(lg.text) && /Righe diagonali/.test(lg.text) && /occupato/.test(lg.text) && /chi lo controlla/.test(lg.text), lg.text);
  check('two swatches (solid, hatched), hidden from screen readers; the group is labelled', lg.n === 2 && lg.ariaHidden && /rgb\(74, 120, 168\)/.test(lg.solid) && /repeating-linear-gradient/.test(lg.occ) && lg.role === 'group' && lg.label === 'Proprietà e controllo', lg);
  await page.click('#ownHelp > summary');
  const help = await ev(() => ({ open: document.getElementById('ownHelp').open, text: document.getElementById('ownHelp').textContent }));
  check('the help defines owner (sovereignty), controller and when the game ends', help.open && /Proprietario\W+\(sovranità\)/.test(help.text) && /Controllore/.test(help.text) && /non controlla più nessun territorio/.test(help.text), help.text);

  // ------------------------------------------------------------------ the card in «Gioco»
  console.log('— the province card in «Gioco»');
  await ev(l => window.__t.selectProvince(l), geo.lom);
  const c0 = await ev(ctl => ({ play: document.getElementById('pp-playBtn').offsetParent !== null, playText: document.getElementById('pp-playBtn').textContent,
    ctl: ctl.map(i => document.getElementById(i).offsetParent !== null), lock: document.getElementById('pp-lockNote').offsetParent !== null ? document.getElementById('pp-lockNote').textContent : null }), CTL);
  check('«Gioca come…» is there; the editing controls are not', c0.play && c0.playText === 'Gioca come Italia' && c0.ctl.every(v => v === false), c0);
  check('a note says the territories change by hand only in the editor', c0.lock === 'Per cambiare i territori a mano usa «Editor scenario».', c0.lock);

  // ------------------------------------------------------------------ the editor
  console.log('— the editor');
  await page.click('#modeEditBtn');
  const e0 = await ev(ctl => { const g = i => document.getElementById(i); return { g: g('modeGameBtn').getAttribute('aria-pressed'), e: g('modeEditBtn').getAttribute('aria-pressed'),
    ed: document.body.classList.contains('editing'), eMode: window.__t.getEditorMode(), note: g('modeNote').textContent, outline: getComputedStyle(document.querySelector('.map-wrap')).outlineStyle,
    tools: g('editorTools').offsetParent !== null, summary: g('editorSummary').textContent, play: g('pp-playBtn').offsetParent !== null, ctl: ctl.map(i => g(i).offsetParent !== null),
    lock: g('pp-lockNote').offsetParent !== null, saveRow: g('saveGameBtn').offsetParent !== null, where: g('saveWhere').offsetParent !== null,
    exp: g('exportBtn').offsetParent !== null, imp: g('importBtn').offsetParent !== null, focus: document.activeElement.id }; }, CTL);
  check('the editor is on and says so (pressed button, dashed outline on the map, note)', e0.g === 'false' && e0.e === 'true' && e0.ed && e0.eMode === true && e0.outline === 'dashed' && /^Editor scenario/.test(e0.note), e0);
  check('the editor tools and the editing controls appear; «Gioca come…» and the note go', e0.tools && e0.ctl.every(v => v === true) && !e0.play && !e0.lock, e0);
  check('a clean scenario says there is no change', e0.summary === 'Nessuna modifica rispetto al 31 dicembre 1960.', e0.summary);
  check('the game save buttons are not shown in the editor; export and import are', !e0.saveRow && !e0.where && e0.exp && e0.imp, e0);
  check('the focus stays on the button just pressed', e0.focus === 'modeEditBtn', e0.focus);

  // ------------------------------------------------------------------ editing a scenario
  console.log('— editing a scenario');
  await ev(u => window.__t.selectProvince(u), geo.U);
  await page.selectOption('#pp-transferSelect', 'FIN');
  await page.click('#pp-transferBtn');
  const d1 = await ev(u => ({ o: window.__t.provinces[u].owner, c: window.__t.provinces[u].controller, summary: document.getElementById('editorSummary').textContent }), geo.U);
  check('«Cedi sovranità e controllo» hands the province over and the summary counts it', d1.o === 'FIN' && d1.c === 'FIN' && d1.summary === 'Modifiche rispetto al 31 dicembre 1960: 1 provincia, 0 segnaposto.', d1);
  await ev(g => window.__t.selectProvince(g), geo.G);
  await page.selectOption('#pp-transferSelect', 'FRG');
  await page.click('#pp-controlBtn');
  const d2 = await ev(g => { const q = i => document.getElementById(i), items = [...document.querySelectorAll('#occList .occ-item')];
    return { o: window.__t.provinces[g].owner, c: window.__t.provinces[g].controller, shown: q('occNote').offsetParent !== null, sum: q('occSummary').textContent, n: items.length,
      first: items[0] && items[0].textContent, summary: q('editorSummary').textContent }; }, geo.G);
  check('«Solo controllo» occupies: the owner stays, the controller changes', d2.o === 'GDR' && d2.c === 'FRG', d2);
  check('the list of occupied territories appears, with owner and controller in words', d2.shown && d2.sum === 'Territori occupati (1)' && d2.n === 1 && /Proprietario: Germania Est · controllo: Germania Ovest/.test(d2.first), d2);
  check('the summary counts both changes', d2.summary === 'Modifiche rispetto al 31 dicembre 1960: 2 province, 0 segnaposto.', d2.summary);
  await ev(u => window.__t.selectProvince(u), geo.U);
  check('the list is folded until it is opened (the summary shows the count)', await ev(() => !document.getElementById('occNote').open && document.getElementById('occSummary').textContent === 'Territori occupati (1)'));
  await page.click('#occSummary');
  await page.click('#occList .occ-item');
  check('tapping an item of the list opens that province', (await ev(() => window.__t.getSelectedProvince())) === geo.G && /\(occupazione\)/.test(await txt('#pp-controller')), await txt('#pp-controller'));
  await ev(l => window.__t.selectProvince(l), geo.lom);
  await page.selectOption('#pp-markerType', 'industria');
  await page.fill('#pp-markerName', 'Officine dello scenario');
  await page.click('#pp-markerBtn');
  const d3 = await ev(() => ({ n: window.__t.getMarkers().length, origin: window.__t.getMarkers()[0] && window.__t.getMarkers()[0].origine, summary: document.getElementById('editorSummary').textContent }));
  check('a marker added in the editor counts as a change', d3.n === 1 && d3.origin === 'giocatore' && d3.summary === 'Modifiche rispetto al 31 dicembre 1960: 2 province, 1 segnaposto.', d3);
  check('the editor writes nothing by itself: the saved game is untouched', unchangedSlot(), store['save/state']);

  // ------------------------------------------------------------------ back to «Gioco»
  console.log('— back to «Gioco»: the scenario stays on the map');
  await page.click('#modeGameBtn');
  const g1 = await ev(({ g, ctl }) => ({ ed: document.body.classList.contains('editing'), ctl: ctl.map(i => document.getElementById(i).offsetParent !== null), c: window.__t.provinces[g].controller,
    markers: window.__t.getMarkers().length, note: document.getElementById('modeNote').textContent }), { g: geo.G, ctl: CTL });
  check('the editing controls are gone, the map keeps the changes', !g1.ed && g1.ctl.every(v => v === false) && g1.c === 'FRG' && g1.markers === 1, g1);
  check('the note says the game will start from the edited scenario', /modificata nell'Editor/.test(g1.note) && /partenza|partirà/.test(g1.note), g1.note);

  // ------------------------------------------------------------------ the scenario as a file
  console.log('— the scenario as a file');
  await page.click('#exportBtn');
  const x1 = await ev(() => ({ title: document.getElementById('transferTitle').textContent, help: document.getElementById('transferHelp').textContent, label: document.getElementById('transferOutLabel').textContent,
    text: document.getElementById('transferOut').value }));
  const sc = JSON.parse(x1.text);
  check('with no game running the export dialog is about the scenario', x1.title === 'Esporta lo scenario' && /lo scenario/.test(x1.help) && x1.label === 'Scenario (testo)', x1);
  check('the text is a v3 save without a game: the two changes and the marker', sc.schemaVersion === 3 && sc.v === 3 && sc.game === null && Object.keys(sc.changes).length === 2 && sc.changes[geo.G].owner === 'GDR' && sc.changes[geo.G].controller === 'FRG' && sc.markers && sc.markers.length === 1, sc);
  await page.click('#transferDownload');
  await page.waitForFunction(() => window.__downloads.length === 1);
  const dl = await ev(() => ({ name: window.__downloads[0].filename, data: window.__downloads[0].data, msg: document.getElementById('transferMsg').textContent }));
  check('the file is named as a scenario and holds the same text', dl.name === 'storia-alternativa-scenario.json' && dl.data === x1.text && /Scenario scaricato/.test(dl.msg), dl.name);
  await page.click('#transferClose');

  // ------------------------------------------------------------------ back to the starting scenario
  console.log('— back to the starting scenario (two presses)');
  await page.click('#modeEditBtn');
  await page.click('#editorResetBtn');
  const r1 = await ev(() => ({ armed: document.getElementById('editorResetBtn').classList.contains('armed'), text: document.getElementById('editorResetBtn').textContent, edits: window.__t.scenarioEdits(), markers: window.__t.getMarkers().length }));
  check('the first press only asks for confirmation; nothing changes', r1.armed && /Premi ancora/.test(r1.text) && r1.edits === 2 && r1.markers === 1, r1);
  await page.click('#modeGameBtn');
  await page.click('#modeEditBtn');
  check('switching mode cancels the request', await ev(() => !document.getElementById('editorResetBtn').classList.contains('armed') && document.getElementById('editorResetBtn').textContent === 'Ripristina lo scenario di partenza'));
  await page.click('#editorResetBtn');
  await page.waitForTimeout(6300);
  check('an unconfirmed request lapses by itself after a few seconds', await ev(() => !document.getElementById('editorResetBtn').classList.contains('armed') && window.__t.scenarioEdits() === 2));
  await page.click('#editorResetBtn');
  await page.click('#editorResetBtn');
  const r2 = await ev(() => ({ armed: document.getElementById('editorResetBtn').classList.contains('armed'), edits: window.__t.scenarioEdits(), markers: window.__t.getMarkers().length,
    summary: document.getElementById('editorSummary').textContent, status: document.getElementById('saveStatus').textContent, occHidden: document.getElementById('occNote').classList.contains('hidden') }));
  check('the second press restores the 1960 start: map, markers, occupations', r2.edits === 0 && r2.markers === 0 && r2.occHidden && r2.summary === 'Nessuna modifica rispetto al 31 dicembre 1960.' && r2.status === 'Scenario di partenza ripristinato.' && !r2.armed, r2);
  check('the saved game is still untouched', unchangedSlot(), store['save/state']);

  // ------------------------------------------------------------------ the scenario comes back from the file
  console.log('— the scenario comes back from the file');
  await page.click('#importBtn');
  await page.fill('#transferIn', x1.text);
  await page.click('#transferLoad');
  await page.waitForTimeout(150);
  const i1 = await ev(g => ({ edits: window.__t.scenarioEdits(), c: window.__t.provinces[g].controller, markers: window.__t.getMarkers().length, mode: window.__t.getGameMode(), ed: window.__t.getEditorMode(),
    status: document.getElementById('saveStatus').textContent, open: document.getElementById('transferDialog').open, occ: document.getElementById('occSummary').textContent }), geo.G);
  check('the import restores map, occupation and marker; no game starts; the editor stays as it was', i1.edits === 2 && i1.c === 'FRG' && i1.markers === 1 && i1.mode === null && i1.ed === true && !i1.open && i1.occ === 'Territori occupati (1)', i1);
  check('the page says it was a scenario', /^Scenario importato/.test(i1.status), i1.status);
  check('and the saved game was not overwritten by it', unchangedSlot(), store['save/state']);

  // ------------------------------------------------------------------ playing from the edited scenario
  console.log('— playing from the edited scenario');
  await page.click('#modeGameBtn');
  await ev(l => window.__t.selectProvince(l), geo.lom);
  await page.click('#pp-playBtn');
  const p1 = await ev(({ g, u }) => ({ mode: window.__t.getGameMode(), ed: window.__t.getEditorMode(), edBtn: document.getElementById('modeEditBtn').getAttribute('aria-disabled'), pressed: document.getElementById('modeEditBtn').getAttribute('aria-pressed'),
    note: document.getElementById('modeNote').textContent, body: document.body.classList.contains('editing'), c: window.__t.provinces[g].controller, o: window.__t.provinces[u].owner,
    markers: window.__t.getMarkers().length }), { g: geo.G, u: geo.U });
  check('the game starts from the edited map (changes and marker kept)', p1.mode === 'fixed' && p1.c === 'FRG' && p1.o === 'FIN' && p1.markers === 1, p1);
  check('the editor is locked during the game: button marked disabled, the note says why', p1.edBtn === 'true' && p1.pressed === 'false' && /^Partita in corso/.test(p1.note) && !p1.body && !p1.ed, p1);
  await page.click('#modeEditBtn', { force: true });      // aria-disabled, not disabled: a real click reaches the page, and the page answers
  const l1 = await ev(() => ({ ed: window.__t.getEditorMode(), note: document.getElementById('modeNote').textContent, body: document.body.classList.contains('editing') }));
  check('pressing it anyway changes nothing and explains', !l1.ed && !l1.body && l1.note === "L'Editor non è disponibile durante una partita. Per usarlo esci prima con «Nuova partita».", l1);
  check('setEditorMode(true) is refused too', (await ev(() => window.__t.setEditorMode(true))) === false && (await ev(() => window.__t.getEditorMode())) === false);
  await ev(u => window.__t.selectProvince(u), geo.U);
  const l2 = await ev(ctl => ({ ctl: ctl.map(i => document.getElementById(i).offsetParent !== null), lock: document.getElementById('pp-lockNote').textContent, play: document.getElementById('pp-playBtn').offsetParent !== null }), CTL);
  check('during the game the card has no editing controls and says why', l2.ctl.every(v => v === false) && l2.lock === 'Durante la partita i territori cambiano solo per le regole e gli eventi della storia.' && !l2.play, l2);
  await ev(() => { document.getElementById('pp-transferSelect').value = 'URSS'; document.getElementById('pp-transferBtn').click(); document.getElementById('pp-controlBtn').click(); document.getElementById('pp-markerBtn').click(); });
  check('even if something clicks the hidden buttons, they do nothing', await ev(u => window.__t.provinces[u].owner === 'FIN' && window.__t.provinces[u].controller === 'FIN' && window.__t.getMarkers().length === 1, geo.U));
  await page.click('#importBtn');
  await page.fill('#transferIn', x1.text);
  await page.click('#transferLoad');
  const l3 = await ev(() => ({ msg: document.getElementById('transferMsg').textContent, err: document.getElementById('transferMsg').classList.contains('err'), open: document.getElementById('transferDialog').open,
    mode: window.__t.getGameMode(), status: document.getElementById('saveStatus').textContent }));
  check('importing a scenario during a game is refused, with the reason; the dialog stays open', l3.open && l3.err && l3.msg === 'Una partita è in corso: per caricare uno scenario esci prima con «Nuova partita».' && l3.mode === 'fixed', l3);
  await page.click('#transferClose');
  await page.click('#exportBtn');
  const x2 = await ev(() => ({ title: document.getElementById('transferTitle').textContent, text: document.getElementById('transferOut').value }));
  check('during a game the export is the whole game', x2.title === 'Esporta il salvataggio' && JSON.parse(x2.text).game.nation === 'Italia', x2.title);
  await page.click('#transferDownload');
  await page.waitForFunction(() => window.__downloads.length === 2);
  check('and its file is named as a save', (await ev(() => window.__downloads[1].filename)) === 'storia-alternativa-salvataggio.json');
  await page.click('#transferClose');
  // in a game the territory changes through the story (every change is checked by the engine)
  await ev(a => window.__queue.push({ evento_titolo: 'Ticino', narrativa: 'Un plebiscito.', riepilogo_mondo: 'Un cantone passa all\'Italia.', nuovo_anno: 'febbraio 1961',
    stabilita: 50, economia: 50, esercito: 50, prestigio: 50, cambi_territoriali: [{ provincia: a, nuovo_proprietario: 'ITA' }] }), geo.A);
  await playTurn(page, 'Chiedo un plebiscito');
  await page.waitForFunction(() => document.getElementById('thinking').classList.contains('hidden') && document.querySelector('#log .entry-terr'));
  check('the story can change the map during a game, and the editor stays off', await ev(a => window.__t.provinces[a].owner === 'ITA' && !window.__t.getEditorMode(), geo.A));
  // a marker can still be removed from its card during a game
  await ev(() => window.__t.selectMarker(window.__t.getMarkers()[0].id));
  check('the marker card still offers «Rimuovi» during a game', await ev(() => document.getElementById('mp-remove').offsetParent !== null));
  await page.click('#mp-remove');
  check('and removing works', await ev(() => window.__t.getMarkers().length === 0));

  // ------------------------------------------------------------------ «Nuova partita»
  console.log('— «Nuova partita»');
  await page.click('#newGameBtn');
  const n1 = await ev(() => ({ edits: window.__t.scenarioEdits(), mode: window.__t.getGameMode(), ed: window.__t.getEditorMode(), edBtn: document.getElementById('modeEditBtn').getAttribute('aria-disabled'),
    note: document.getElementById('modeNote').textContent, markers: window.__t.getMarkers().length }));
  check('back to the starting situation, in «Gioco», with the editor available again', n1.edits === 0 && n1.mode === null && !n1.ed && n1.edBtn === 'false' && /^Gioco: tocca un territorio/.test(n1.note) && n1.markers === 0, n1);
  await page.click('#modeEditBtn');
  check('the editor can be switched on again', await ev(() => window.__t.getEditorMode() === true));

  // ------------------------------------------------------------------ a game loaded while the editor is on
  console.log('— a game loaded while the editor is on');
  await page.click('#importBtn');
  await page.fill('#transferIn', JSON.stringify(savedGame));
  await page.click('#transferLoad');
  await page.waitForTimeout(150);
  const j1 = await ev(() => ({ mode: window.__t.getGameMode(), ed: window.__t.getEditorMode(), body: document.body.classList.contains('editing'), btn: document.getElementById('modeEditBtn').getAttribute('aria-disabled'),
    status: document.getElementById('saveStatus').textContent }));
  check('importing a game turns the editor off and starts the game', j1.mode === 'fixed' && !j1.ed && !j1.body && j1.btn === 'true' && j1.status === 'Salvataggio importato.', j1);

  // ------------------------------------------------------------------ the buttons «Salva partita» / «Carica partita»
  console.log('— «Salva partita» belongs to the game');
  await page.click('#newGameBtn');
  await page.click('#saveGameBtn');
  await page.waitForTimeout(100);
  check('with no game it says there is nothing to save', (await txt('#saveStatus')) === 'Nessuna partita in corso da salvare. Per conservare uno scenario usa «Esporta».', await txt('#saveStatus'));
  check('and the saved game is still there', await ev(() => window.__t.refreshResumeBanner().then(() => !document.getElementById('resumeBanner').classList.contains('hidden'))) && /Partita salvata: Italia/.test(await txt('#resumeText')), await txt('#resumeText'));

  // ------------------------------------------------------------------ keyboard
  console.log('— keyboard');
  await page.focus('#modeEditBtn');
  await page.keyboard.press('Enter');
  check('Enter on «Editor scenario» turns the editor on', await ev(() => document.getElementById('modeEditBtn').getAttribute('aria-pressed') === 'true'));
  await page.focus('#modeGameBtn');
  await page.keyboard.press('Space');
  check('Space on «Gioco» turns it off', await ev(() => document.getElementById('modeEditBtn').getAttribute('aria-pressed') === 'false' && document.getElementById('modeGameBtn').getAttribute('aria-pressed') === 'true'));

  // ------------------------------------------------------------------ a long list of occupations
  console.log('— a long list of occupations');
  const many = await ev(() => { const T = window.__t; let n = 0; for (const id in T.provinces) { if (T.provinces[id].owner !== 'FIN' && n < 70) { T.changeProvinceController(id, 'FIN'); n++; } } return n; });
  const big = await ev(() => ({ items: document.querySelectorAll('#occList .occ-item').length, more: (document.querySelector('#occList .pp-note') || {}).textContent, sum: document.getElementById('occSummary').textContent }));
  check('the list stops at 60 and says how many more', many > 60 && big.items === 60 && big.more === '…e altri ' + (many - 60) && big.sum === 'Territori occupati (' + many + ')', [many, big]);
  await ev(() => window.__t.restoreStartingScenario());
  check('restoring the start empties it and hides it', await ev(() => document.getElementById('occNote').classList.contains('hidden') && document.querySelectorAll('#occList .occ-item').length === 0));

  check('no page errors', errors.length === 0, errors);
  await browser.close();

  // ------------------------------------------------------------------ phone
  console.log('— phone width');
  const ph = await launch({ width: 390, height: 844, mobile: true });
  const L = await ph.page.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect(); return { sw: document.documentElement.scrollWidth, iw: window.innerWidth,
    g: r('modeGameBtn'), e: r('modeEditBtn'), leg: r('ownLegend') }; });
  check('no horizontal scroll on a phone', L.sw <= L.iw, L);
  check('both mode buttons and the legend fit the width', L.g.left >= 0 && L.e.right <= L.iw && L.leg.right <= L.iw && L.g.width > 120 && L.e.width > 120 && Math.abs(L.g.width - L.e.width) < 2, L);
  await ph.page.tap('#modeEditBtn');
  const L2 = await ph.page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, ed: window.__t.getEditorMode(), tools: document.getElementById('editorTools').offsetParent !== null }));
  check('a tap turns the editor on, still without horizontal scroll', L2.ed && L2.tools && L2.sw <= L2.iw, L2);
  check('no page errors on the phone', ph.errors.length === 0, ph.errors);
  await ph.browser.close();

  // ------------------------------------------------------------------ outside Claude (the browser's own storage)
  console.log('— outside Claude: the scenario is a file; the browser keeps only the game');
  const fs = require('fs');
  const ob = await launch({ width: 900, height: 1000, mobile: false, withClaude: false, serve: true });
  const oev = (fn, a) => ob.page.evaluate(fn, a);
  const keys = () => oev(() => Object.keys(localStorage).filter(k => k.startsWith('storia-alternativa:save/')));
  await ob.page.click('#modeEditBtn');
  await oev(u => window.__t.selectProvince(u), 'URSS_01');
  await ob.page.selectOption('#pp-transferSelect', 'FIN');
  await ob.page.click('#pp-transferBtn');
  check('outside Claude the editor works the same', await oev(() => window.__t.provinces.URSS_01.owner === 'FIN' && window.__t.getStorageKind() === 'browser'));
  check('editing writes nothing to the browser', (await keys()).length === 0, await keys());
  await ob.page.click('#modeGameBtn');
  await ob.page.click('#saveGameBtn');
  check('with no game «Salva partita» writes nothing here either', (await keys()).length === 0 && /Nessuna partita in corso/.test(await ob.page.textContent('#saveStatus')), await keys());
  await ob.page.click('#exportBtn');
  const [dlo] = await Promise.all([ob.page.waitForEvent('download'), ob.page.click('#transferDownload')]);
  check('the downloaded file is named as a scenario', dlo.suggestedFilename() === 'storia-alternativa-scenario.json', dlo.suggestedFilename());
  const scText = fs.readFileSync(await dlo.path(), 'utf8');
  check('and holds the scenario: no game, the change', JSON.parse(scText).game === null && JSON.parse(scText).changes.URSS_01.owner === 'FIN');
  await ob.page.click('#transferClose');
  await oev(() => window.__t.restoreStartingScenario());
  await ob.page.click('#importBtn');
  await ob.page.fill('#transferIn', scText);
  await ob.page.click('#transferLoad');
  await ob.page.waitForTimeout(150);
  check('importing it brings the map back and still writes nothing to the browser', (await oev(() => window.__t.provinces.URSS_01.owner === 'FIN')) && (await keys()).length === 0, await keys());
  await oev(() => window.__t.startFixedScenarioGame('ITA'));
  await ob.page.waitForTimeout(200);
  const k2 = await keys();
  check('a game that runs is autosaved in the browser: only the game', k2.length === 1 && JSON.parse(await oev(k => localStorage.getItem(k), k2[0])).game.nation === 'Italia', k2);
  check('no page errors outside Claude', ob.errors.length === 0, ob.errors);
  await ob.browser.close();
  process.exit(summary() ? 1 : 0);
})();
