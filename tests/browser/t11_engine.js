// Engine robustness (answers that arrive late, UI restored, validated saves) and the split between sovereignty and control.
const { launch, check, summary } = require('./harness');
(async () => {
  const store = {};
  const { browser, page, errors } = await launch({ width: 640, height: 1100, mobile: false, store });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const txt = sel => page.evaluate(s => document.querySelector(s).textContent, sel);
  const hid = sel => page.evaluate(s => document.querySelector(s).classList.contains('hidden'), sel);
  const settle = (name, value) => ev(({ name, value }) => window[name].res(value), { name, value });
  const defer = name => ev(name => { window[name] = window.__deferred(); return true; }, name);
  const queueJson = name => ev(name => { window.__queue.push(window[name].p); }, name);
  const queueText = name => ev(name => { window.__textQueue.push(window[name].p); }, name);
  const spinnerOn = () => page.waitForFunction(() => !document.getElementById('thinking').classList.contains('hidden'));
  const spinnerOff = () => page.waitForFunction(() => document.getElementById('thinking').classList.contains('hidden'));
  const restart = c => ev(c => { window.__t.resetGame(); window.__t.startFixedScenarioGame(c); }, c);
  const restoreMap = () => ev(() => { const t = window.__t; for (const id in t.initialTerritory) { t.provinces[id].owner = t.initialTerritory[id].owner; t.provinces[id].controller = t.initialTerritory[id].controller; } t.renderMapColors(); });
  const digest = () => ev(() => { const P = window.__t.provinces; let h = 0; for (const id in P) { const s = id + P[id].owner + P[id].controller; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; } return h; });

  // a province A of the GDR that touches the FRG, and B that only touches A
  const geo = await ev(() => {
    const P = window.__t.provinces;
    const gdr = Object.keys(P).filter(i => P[i].owner === 'GDR');
    const border = gdr.filter(i => P[i].neighbors.some(n => P[n].owner === 'FRG'));
    const inner = gdr.filter(i => !P[i].neighbors.some(n => P[n].owner === 'FRG'));
    let A = null, B = null;
    for (const a of border) { const b = inner.find(x => P[a].neighbors.includes(x)); if (b) { A = a; B = b; break; } }
    return { border, inner, A, B, A2: border.find(i => i !== A) };
  });
  check('test map: two border provinces and a province behind them', geo.A && geo.B && geo.A2, geo);

  const late = (p, extra = {}) => Object.assign({ evento_titolo: 'Titolo tardivo', narrativa: 'Narrativa tardiva.', riepilogo_mondo: 'Riepilogo tardivo.', nuovo_anno: 'maggio 1965',
    stabilita: 1, economia: 1, esercito: 1, prestigio: 1, cambi_territoriali: [{ provincia: p, nuovo_proprietario: 'FRG' }], cambi_controllo: [],
    segnaposto: [{ azione: 'aggiungi', tipo: 'truppe', nome: 'Truppe tardive', provincia: p }] }, extra);

  // ------------------------------------------------------------------ answers on their way when the game is replaced
  console.log('— a turn answered after the game was replaced');
  await restart('FRG');
  await defer('__d1'); await queueJson('__d1');
  await page.fill('#actionInput', 'Mossa destinata a perdersi');
  await page.click('#actBtn');
  await spinnerOn();
  check('while the answer is on its way the spinner shows and the button is off', await ev(() => document.getElementById('actBtn').disabled));
  const s0 = await ev(() => window.__t.getGameSession());
  await ev(() => window.__t.resetGame());
  check('a reset makes the pending answers obsolete (new session)', (await ev(() => window.__t.getGameSession())) > s0);
  await settle('__d1', late(geo.A));
  await page.waitForTimeout(200);
  const l1 = await ev(A => ({ owner: window.__t.provinces[A].owner, ctl: window.__t.provinces[A].controller, markers: window.__t.getMarkers().length,
    log: document.getElementById('log').textContent, year: window.__t.getState().year, summary: window.__t.getState().worldSummary, logN: window.__t.getState().log.length }), geo.A);
  check('answer after a reset: the map is untouched', l1.owner === 'GDR' && l1.ctl === 'GDR', l1);
  check('answer after a reset: no marker appears', l1.markers === 0, l1);
  check('answer after a reset: nothing in the log nor in the state', !/tardiv/i.test(l1.log) && l1.year === '' && l1.summary === '' && l1.logN === 0, l1);
  check('answer after a reset: the spinner stays off', await hid('#thinking'));

  console.log('— …and a new game running its own turn');
  await restart('FRG');
  await defer('__d1'); await queueJson('__d1');
  await page.fill('#actionInput', 'Prima mossa');
  await page.click('#actBtn');
  await spinnerOn();
  await ev(() => { window.__t.resetGame(); window.__t.startFixedScenarioGame('ITA'); });
  await defer('__d2'); await queueJson('__d2');
  await page.fill('#actionInput', 'Seconda mossa');
  await page.click('#actBtn');
  await spinnerOn();
  await settle('__d1', late(geo.A));                       // the first game's answer arrives while the second game still waits
  await page.waitForTimeout(200);
  const mid = await ev(A => ({ spinnerHidden: document.getElementById('thinking').classList.contains('hidden'), actOff: document.getElementById('actBtn').disabled,
    owner: window.__t.provinces[A].owner, log: document.getElementById('log').textContent, nation: window.__t.getState().nation, itName: window.__t.countries.ITA.name,
    markers: window.__t.getMarkers().length }), geo.A);
  check('the old answer does not hide the new spinner nor re-enable the new button', !mid.spinnerHidden && mid.actOff, mid);
  check('the old answer does not touch the new game', mid.owner === 'GDR' && !/tardiv/i.test(mid.log) && mid.nation === mid.itName && mid.markers === 0, mid);
  await settle('__d2', { evento_titolo: 'Titolo seconda partita', narrativa: 'Narrativa seconda partita.', riepilogo_mondo: 'Riepilogo.', nuovo_anno: 'febbraio 1961', stabilita: 51, economia: 52, esercito: 53, prestigio: 54, cambi_territoriali: [], cambi_controllo: [], segnaposto: [] });
  await spinnerOff();
  const fin = await ev(() => ({ year: document.getElementById('yearLabel').textContent, act: document.getElementById('actBtn').disabled, log: document.getElementById('log').textContent, input: document.getElementById('actionInput').value }));
  check('the new game receives its own answer normally', fin.year === 'febbraio 1961' && fin.log.includes('Titolo seconda partita') && fin.act === false && fin.input === '', fin);

  console.log('— …and a saved game loaded meanwhile');
  await restart('FRG');
  await ev(A => { window.__t.applyTerritoryChanges([{ provincia: A, nuovo_proprietario: 'FRG' }]); }, geo.A);
  await ev(() => window.__t.saveGame());
  await defer('__d1'); await queueJson('__d1');
  await page.fill('#actionInput', 'Mossa mentre carico');
  await page.click('#actBtn');
  await spinnerOn();
  const loaded = await ev(() => window.__t.loadGame());
  check('a saved game loads while a turn is pending', loaded === true, loaded);
  check('the load hides the pending spinner', await hid('#thinking'));
  await settle('__d1', late(geo.A2));
  await page.waitForTimeout(200);
  const l3 = await ev(([A, A2]) => ({ a: window.__t.provinces[A].owner, a2: window.__t.provinces[A2].owner, log: document.getElementById('log').textContent,
    year: window.__t.getState().year, markers: window.__t.getMarkers().length, act: document.getElementById('actBtn').disabled }), [geo.A, geo.A2]);
  check('after the load the late answer is dropped: the saved situation stays', l3.a === 'FRG' && l3.a2 === 'GDR' && !/tardiv/i.test(l3.log) && l3.year === '31 dicembre 1960' && l3.markers === 0, l3);
  check('the loaded game can play (button enabled)', l3.act === false, l3);

  console.log('— the advisor');
  await restart('FRG');
  await defer('__dt'); await queueText('__dt');
  await page.click('#advisorBtn');
  await spinnerOn();
  await ev(() => window.__t.resetGame());
  await settle('__dt', { text: 'Consiglio tardivo' });
  await page.waitForTimeout(150);
  const adv = await ev(() => ({ n: document.querySelectorAll('#log .entry-advisor').length, log: document.getElementById('log').textContent, logN: window.__t.getState().log.length }));
  check('an advisor answer after a reset is dropped', adv.n === 0 && !adv.log.includes('Consiglio tardivo') && adv.logN === 0, adv);
  await restart('FRG');
  await ev(() => window.__textQueue.push(new Error('consigliere giù')));
  await page.click('#advisorBtn');
  await page.waitForFunction(() => document.querySelector('#log .entry-narr') && document.getElementById('thinking').classList.contains('hidden'));
  const advErr = await ev(() => ({ log: document.getElementById('log').textContent, off: document.getElementById('advisorBtn').disabled }));
  check('advisor failure: reported, spinner off, button back', advErr.log.includes('Consigliere non disponibile ora') && advErr.off === false, advErr);

  console.log('— diplomacy');
  const talk = () => ev(() => { const s = window.__t.getState(); return { target: s.diplo.target, hist: s.diplo.history.length, bub: s.diplo.bubbles.length,
    dom: document.querySelectorAll('#diploLog .bubble').length, domText: document.getElementById('diploLog').textContent, sendOff: document.getElementById('diploSendBtn').disabled,
    spinnerHidden: document.getElementById('diploThinking').classList.contains('hidden'), chatHidden: document.getElementById('diploChat').classList.contains('hidden'),
    input: document.getElementById('diploInput').value }; });
  const startTalk = who => ev(w => { document.getElementById('diploTarget').value = w; document.getElementById('diploStartBtn').click(); }, who);
  const say = m => ev(m => { document.getElementById('diploInput').value = m; document.getElementById('diploSendBtn').click(); }, m);
  const endTalk = () => ev(() => document.getElementById('diploResetBtn').click());
  await restart('FRG');
  await startTalk('Kennedy');
  await defer('__dt'); await queueText('__dt');
  await say('Primo messaggio');
  let d = await talk();
  check('talk: message sent, spinner on, send button off', d.hist === 1 && !d.spinnerHidden && d.sendOff && d.dom === 1, d);
  await endTalk();
  d = await talk();
  check('closing the talk clears it and frees the send button', d.target === '' && d.hist === 0 && d.dom === 0 && d.spinnerHidden && !d.sendOff && d.chatHidden && d.input === '', d);
  await settle('__dt', { text: 'Risposta tardiva di Kennedy' });
  await page.waitForTimeout(150);
  d = await talk();
  check('the answer of a closed talk is dropped', d.hist === 0 && d.dom === 0 && d.bub === 0 && !d.domText.includes('tardiva') && d.target === '', d);
  await startTalk('Kennedy');
  await defer('__dt'); await queueText('__dt');
  await say('Messaggio a Kennedy');
  await endTalk();
  await startTalk('De Gaulle');
  await settle('__dt', { text: 'Risposta tardiva di Kennedy a De Gaulle' });
  await page.waitForTimeout(150);
  d = await talk();
  check('a late answer from the first talk does not enter the next one', d.target === 'De Gaulle' && d.hist === 0 && d.dom === 0 && !d.domText.includes('tardiva') && d.spinnerHidden && !d.sendOff, d);
  await say('Buongiorno generale');
  await page.waitForFunction(() => document.querySelectorAll('#diploLog .bubble').length === 2 && document.getElementById('diploThinking').classList.contains('hidden'));
  d = await talk();
  check('a normal exchange: two bubbles, history of two, input cleared, button back', d.hist === 2 && d.dom === 2 && d.input === '' && !d.sendOff && d.spinnerHidden, d);
  await ev(() => window.__textQueue.push(new Error('linea caduta')));
  await say('Altro messaggio');
  await page.waitForFunction(() => document.getElementById('diploLog').textContent.includes('Nessuna risposta al momento') && document.getElementById('diploThinking').classList.contains('hidden'));
  d = await talk();
  check('a failed answer: history keeps alternating (message withdrawn), button back', d.hist === 2 && d.bub === 3 && !d.sendOff, d);

  // ------------------------------------------------------------------ the interface is restored whatever happens
  console.log('— the turn restores the interface');
  await restart('FRG');
  await ev(() => window.__queue.push(new Error('boom')));
  await page.fill('#actionInput', 'Mossa che fallisce');
  await page.click('#actBtn');
  await spinnerOff();
  const er = await ev(() => ({ log: document.getElementById('log').textContent, act: document.getElementById('actBtn').disabled, input: document.getElementById('actionInput').value }));
  check('a failed turn is reported in the log', er.log.includes('Errore nella generazione: boom'), er);
  check('a failed turn gives the button back and clears the field', er.act === false && er.input === '', er);
  await ev(() => window.__queue.push(null));        // an empty answer from the engine is a failure, not a crash
  await page.fill('#actionInput', 'Mossa con risposta vuota');
  await page.click('#actBtn');
  await page.waitForTimeout(150);
  await spinnerOff();
  check('after an empty answer the game is still usable', await ev(() => document.getElementById('actBtn').disabled === false));

  // ------------------------------------------------------------------ saves are checked
  console.log('— saves are validated');
  await restart('FRG');
  const d0 = await digest();
  const bad = [['null', null], ['a number', 5], ['a string', 'x'], ['an array', []], ['no version', { changes: {} }], ['version 1', { v: 1, changes: {} }], ['version 9', { v: 9, changes: {} }],
    ['v3 with changes as array', { v: 3, changes: [] }], ['v3 with changes as text', { v: 3, changes: 'x' }], ['v3 without changes', { v: 3 }], ['v3 changes null', { v: 3, changes: null }],
    ['v2 with provinces as array', { v: 2, provinces: [] }], ['v2 without provinces', { v: 2 }], ['game as text', { v: 3, changes: {}, game: 'x' }], ['game as array', { v: 3, changes: {}, game: [] }], ['game as number', { v: 3, changes: {}, game: 7 }]];
  for (const [name, data] of bad) {
    const r = await ev(dat => { document.getElementById('saveStatus').textContent = ''; return { ret: window.__t.applySave(dat), status: document.getElementById('saveStatus').textContent }; }, data);
    check(`refused: ${name}`, r.ret === false && r.status === 'Salvataggio non valido o versione non supportata.', r);
  }
  check('refused saves leave map and game as they were', (await digest()) === d0 && (await ev(() => window.__t.getGameMode())) === 'fixed' && (await ev(() => window.__t.getState().nation)) === 'Germania Ovest');
  const okMinimal = await ev(() => [window.__t.applySave({ v: 3, changes: {}, game: null }), window.__t.applySave({ v: 3, changes: {} }), window.__t.applySave({ v: 2, provinces: {} })]);
  check('minimal valid saves are accepted', okMinimal.every(x => x === true), okMinimal);
  const okChange = await ev(A => { const r = window.__t.applySave({ v: 3, changes: { [A]: { owner: 'FRG', controller: 'FRG' } }, game: null }); return [r, window.__t.provinces[A].owner]; }, geo.A);
  check('a valid territory-only save is applied', okChange[0] === true && okChange[1] === 'FRG', okChange);
  await restoreMap();
  const host = await ev(([a, b]) => {
    const t = window.__t;
    const poison = JSON.parse('{"__proto__": {"owner":"FRG","controller":"FRG"}, "constructor": {"owner":"FRG","controller":"FRG"}, "toString": {"owner":"FRG","controller":"FRG"}}');
    const r1 = t.applySave({ v: 3, changes: poison, game: null });
    const r2 = t.applySave({ v: 2, provinces: poison });
    const r3 = t.applySave({ v: 3, changes: { [a]: { owner: 'constructor', controller: '__proto__' }, [b]: { owner: 'FRG', controller: 'toString' } }, selectedCountryId: 'constructor', game: null });
    return { r1, r2, r3, polluted: ({}).owner !== undefined || ({}).controller !== undefined || Object.prototype.hasOwnProperty.call(Object.prototype, 'owner'),
      a: [t.provinces[a].owner, t.provinces[a].controller], b: [t.provinces[b].owner, t.provinces[b].controller], ctx: t.territoryContext() };
  }, [geo.A, geo.A2]);
  check('hostile keys (__proto__, constructor, toString) are ignored, nothing is polluted', host.r1 === true && host.r2 === true && host.polluted === false, host);
  check('hostile owners/controllers are ignored province by province', host.a.join() === 'GDR,GDR' && host.b.join() === 'GDR,GDR', host);
  check('a hostile selected country is ignored', host.ctx.includes('Il giocatore guida Germania Ovest'), host.ctx.slice(0, 120));
  store['save/state'] = { v: 7, changes: {} };
  const lg1 = await ev(() => window.__t.loadGame().then(r => ({ r, status: document.getElementById('saveStatus').textContent, mode: window.__t.getGameMode() })));
  check('"Carica" with an unusable save: refused, said so, game kept', lg1.r === false && lg1.status === 'Salvataggio non valido o versione non supportata.' && lg1.mode === 'fixed', lg1);
  await ev(() => window.__t.saveGame());
  const lg2 = await ev(() => window.__t.loadGame().then(r => ({ r, status: document.getElementById('saveStatus').textContent })));
  check('"Carica" with a good save works', lg2.r === true && lg2.status === 'Partita caricata.', lg2);

  // ------------------------------------------------------------------ sovereignty and control apart
  console.log('— occupation: control without sovereignty');
  await restart('FRG');
  check('transfers of sovereignty done earlier in this run never painted a half-way "occupation"', (await ev(() => document.querySelectorAll('pattern').length)) === 0);
  const ctl = async list => ev(l => { const lines = window.__t.applyControlChanges(l); const o = {};
    for (const x of l) if (x && window.__t.provinces[x.provincia] && typeof x.provincia === 'string' && Object.prototype.hasOwnProperty.call(window.__t.provinces, x.provincia)) {
      const p = window.__t.provinces[x.provincia]; o[x.provincia] = p.owner + '/' + p.controller; }
    return { lines, o }; }, list);
  let r = await ctl([{ provincia: geo.A, nuovo_controllore: 'FRG' }]);
  check('a border province can be occupied: controller changes, owner stays', r.o[geo.A] === 'GDR/FRG' && r.lines.length === 1 && /: occupata da Germania Ovest \(resta di Germania Est\)$/.test(r.lines[0]), r);
  const hatch = await ev(A => { const f = window.__t.provinceEls[A][0].getAttribute('fill'); const id = (f.match(/^url\(#(.+)\)$/) || [])[1]; const pat = id && document.getElementById(id);
    const rects = pat ? [...pat.querySelectorAll('rect')].map(x => x.getAttribute('fill')) : [];
    return { f, tag: pat && pat.tagName, rects, gdr: window.__t.countries.GDR.color, frg: window.__t.countries.FRG.color, note: !document.getElementById('occNote').classList.contains('hidden'),
      allEls: window.__t.provinceEls[A].every(e => e.getAttribute('fill') === f), patterns: document.querySelectorAll('pattern').length, twoPaints: window.__t.provinceEls[A].length }; }, geo.A);
  check('an occupied province is painted with a pattern (owner colour + stripes of the occupier)', /^url\(#occ\d+\)$/.test(hatch.f) && hatch.tag === 'pattern' && hatch.rects[0] === hatch.gdr && hatch.rects[1] === hatch.frg && hatch.allEls, hatch);
  check('the legend note about the stripes appears', hatch.note);
  const zoomK = async s => ev(([A, s]) => { const t = window.__t; const poly = window.MAP_SVG.provincePolys[A][0].split(' ')[0].split(','); t.setView(+poly[0], +poly[1], s);
    const f = t.provinceEls[A][0].getAttribute('fill'); const pat = document.getElementById(f.slice(5, -1));
    const m = /scale\(([\d.eE+-]+)\)/.exec(pat.getAttribute('patternTransform')); const k = t.scale * document.getElementById('euroSvg').getBoundingClientRect().width / t.VBW;
    return { stripe: m ? +m[1] : null, want: 1 / k, tf: pat.getAttribute('patternTransform') }; }, [geo.A, s]);
  const z1 = await zoomK(1), z2 = await zoomK(8), z3 = await zoomK(2.5);
  const near = z => z.stripe && Math.abs(z.stripe - z.want) / z.want < 0.01;
  check('the stripes keep their width on screen: pattern scale follows the zoom (x1, x8, x2.5)', near(z1) && near(z2) && near(z3) && z1.stripe / z2.stripe > 6, [z1, z2, z3]);
  r = await ctl([{ provincia: geo.A2, nuovo_controllore: 'FRG' }]);
  const reuse = await ev(() => ({ patterns: document.querySelectorAll('pattern').length, list: [...document.querySelectorAll('pattern')].map(p => p.id + ' ' + [...p.querySelectorAll('rect')].map(x => x.getAttribute('fill')).join('|')) }));
  check('another province occupied by the same state reuses the same pattern', reuse.patterns === 1 && r.o[geo.A2] === 'GDR/FRG', reuse);
  const fresh = await ev(A2 => { const f = window.__t.provinceEls[A2][0].getAttribute('fill'); const pat = document.getElementById(f.slice(5, -1)); return pat.getAttribute('patternTransform'); }, geo.A2);
  check('a pattern created while zoomed is already at the right scale', Math.abs(+/scale\(([\d.eE+-]+)\)/.exec(fresh)[1] - z3.want) / z3.want < 0.01, [fresh, z3]);
  r = await ctl([{ provincia: geo.A, nuovo_controllore: 'GDR' }, { provincia: geo.A2, nuovo_controllore: 'GDR' }]);
  const back = await ev(A => ({ f: window.__t.provinceEls[A][0].getAttribute('fill'), gdr: window.__t.countries.GDR.color, note: !document.getElementById('occNote').classList.contains('hidden') }), geo.A);
  check('control handed back: log says so, colour returns to the owner, the note disappears', r.lines.length === 2 && r.lines.every(x => /torna sotto il controllo di Germania Est$/.test(x)) && back.f === back.gdr && back.note === false, [r, back]);
  await restoreMap();

  r = await ctl([{ provincia: geo.B, nuovo_controllore: 'FRG' }]);
  check('an inner province is refused for occupation too (no border), and reported', r.o[geo.B] === 'GDR/GDR' && r.lines.length === 1 && r.lines[0].startsWith('⚠️ Non applicato: controllo di') && r.lines[0].includes('Germania Ovest'), r);
  r = await ctl([{ provincia: geo.B, nuovo_controllore: 'FRG' }, { provincia: geo.A, nuovo_controllore: 'FRG' }]);
  check('order does not matter for occupation either (several passes)', r.o[geo.A] === 'GDR/FRG' && r.o[geo.B] === 'GDR/FRG' && r.lines.length === 2 && !r.lines.some(x => x.startsWith('⚠️')), r);
  await restoreMap();
  await ev(() => window.__t.changeProvinceController('URSS_01', 'PRT'));
  r = await ctl([{ provincia: 'URSS_01', nuovo_controllore: 'URSS' }]);
  check('returning control to the owner needs no border', r.o.URSS_01 === 'URSS/URSS' && r.lines.length === 1 && /torna sotto il controllo/.test(r.lines[0]), r);
  r = await ctl([{ provincia: 'URSS_01', nuovo_controllore: 'PRT' }]);
  check('a far-away occupation is refused', r.o.URSS_01 === 'URSS/URSS' && r.lines[0].startsWith('⚠️'), r);
  await restoreMap();
  const junk = [null, 5, 'x', {}, { provincia: 'NOPE_01', nuovo_controllore: 'FRG' }, { provincia: geo.A, nuovo_controllore: 'ZZZ' }, { provincia: geo.A, nuovo_controllore: 'GDR' },
    { provincia: '__proto__', nuovo_controllore: 'FRG' }, { provincia: 'constructor', nuovo_controllore: 'FRG' }, { provincia: geo.A, nuovo_controllore: 'constructor' },
    { provincia: geo.A, nuovo_controllore: '__proto__' }, { provincia: geo.A, nuovo_controllore: 7 }, { provincia: 7, nuovo_controllore: 'FRG' }, { provincia: [geo.A], nuovo_controllore: ['FRG'] }];
  r = await ctl(junk);
  const poll = await ev(() => ({ polluted: ({}).controller !== undefined || ({}).owner !== undefined }));
  check('unknown ids, unknown or hostile countries, same controller and junk are ignored silently', r.lines.length === 0 && r.o[geo.A] === 'GDR/GDR' && !poll.polluted, [r, poll]);
  const nonArr = await ev(() => [window.__t.applyControlChanges('x'), window.__t.applyControlChanges(null), window.__t.applyControlChanges({}), window.__t.applyControlChanges(5), window.__t.applyControlChanges(undefined)]);
  check('non-array input to the control list gives nothing', nonArr.every(x => Array.isArray(x) && x.length === 0), nonArr);
  r = await ctl([{ provincia: geo.A, nuovo_controllore: 'FRG' }, { provincia: geo.A, nuovo_controllore: 'FRG' }]);
  check('the same province twice is applied once', r.lines.length === 1, r);
  await restoreMap();
  const many = await ev(() => Object.keys(window.__t.provinces).filter(i => window.__t.provinces[i].owner === 'FRA').map(id => ({ provincia: id, nuovo_controllore: 'BEL' })));
  const capped = await ev(l => { window.__t.applyControlChanges(l); return Object.keys(window.__t.provinces).filter(i => window.__t.provinces[i].owner === 'FRA' && window.__t.provinces[i].controller === 'BEL').length; }, many);
  check('no more than 12 occupations per turn', capped >= 1 && capped <= 12, { capped, offered: many.length });
  await restoreMap();

  console.log('— the model is told about the difference');
  await ev(A => window.__t.applyControlChanges([{ provincia: A, nuovo_controllore: 'FRG' }]), geo.A);
  const prom = await ev(A => ({ ctx: window.__t.territoryContext(), rules: window.__t.territoryRules('niente'), name: window.__t.provinces[A].name.replace(/ \([^)]*\)/g, '') }), geo.A);
  check('context: "Controlla senza possederli" lists the occupied province', prom.ctx.includes('Controlla senza possederli') && prom.ctx.includes(prom.name), prom.ctx.slice(-260));
  check('rules: the occupied province is marked with its owner and its controller', prom.rules.includes(`${geo.A}=`) && /\[GDR; controllo: FRG\]/.test(prom.rules), prom.rules.slice(0, 400));
  check('rules explain cambi_territoriali (both) and cambi_controllo (control only)', prom.rules.includes('cambi_territoriali') && prom.rules.includes('cambi_controllo') && /occupata/.test(prom.rules), prom.rules.slice(-700));
  await ev(() => window.__t.selectCountry('GDR'));
  const prom2 = await ev(() => window.__t.territoryContext());
  check('context for the owner: "Possiede ma non controlla" names it', prom2.includes('Possiede ma non controlla'), prom2.slice(-260));
  await ev(() => window.__t.selectCountry('FRG'));
  const plain = await restoreMap().then(() => ev(() => window.__t.territoryContext()));
  check('with no occupation neither sentence appears', !plain.includes('Possiede ma non controlla') && !plain.includes('Controlla senza possederli'), plain.slice(-200));
  const sizes = await ev(() => { const t = window.__t, out = []; for (const c of Object.keys(t.countries)) { t.selectCountry(c); out.push(t.territoryContext().length + t.territoryRules('').length); } t.selectCountry('FRG'); return Math.max(...out); });
  check('map part of the prompt still under 14,000 characters for every nation', sizes < 14000, sizes);

  console.log('— a whole turn through the interface: sovereignty, occupation and markers together');
  await restart('FRG');
  await ev(({ A, B, A2 }) => window.__queue.push({ evento_titolo: 'Occupazione di Gera', narrativa: 'Truppe occidentali occupano una provincia.', riepilogo_mondo: 'Occupazione.', nuovo_anno: 'marzo 1961',
    stabilita: 60, economia: 52, esercito: 61, prestigio: 58, cambi_territoriali: [{ provincia: A2, nuovo_proprietario: 'FRG' }, { provincia: 'XX_99', nuovo_proprietario: 'FRG' }],
    cambi_controllo: [{ provincia: A, nuovo_controllore: 'FRG' }, { provincia: B, nuovo_controllore: 'FRG' }, { provincia: 'XX_99', nuovo_controllore: 'FRG' }],
    segnaposto: [{ azione: 'aggiungi', tipo: 'truppe', nome: 'Forze di occupazione', provincia: A }] }), geo);
  await page.fill('#actionInput', 'Avanzo e occupo');
  await page.click('#actBtn');
  await page.waitForFunction(() => document.getElementById('thinking').classList.contains('hidden') && document.querySelector('#log .entry-terr'));
  const turn = await ev(({ A, B, A2 }) => { const P = window.__t.provinces; return { a2: P[A2].owner + '/' + P[A2].controller, a: P[A].owner + '/' + P[A].controller, b: P[B].owner + '/' + P[B].controller,
    terr: document.querySelector('#log .entry-terr').textContent, markers: window.__t.getMarkers().length, note: !document.getElementById('occNote').classList.contains('hidden') }; }, geo);
  check('sovereignty change applied (owner and controller)', turn.a2 === 'FRG/FRG', turn);
  check('the two occupations applied (a border one, then the one behind it)', turn.a === 'GDR/FRG' && turn.b === 'GDR/FRG', turn);
  check('one log entry lists changes, occupations and the marker, and not the invalid ids', turn.terr.includes('da Germania Est a Germania Ovest') && (turn.terr.match(/occupata da Germania Ovest/g) || []).length === 2 && turn.terr.includes('Nuovo segnaposto') && !turn.terr.includes('XX_99'), turn.terr);
  check('the marker was added by the same answer', turn.markers === 1 && turn.note, turn);
  const prompt = await ev(() => window.__prompts[window.__prompts.length - 1]);
  check('the turn prompt carries the schema for cambi_controllo and for segnaposto', prompt.includes('"cambi_controllo"') && prompt.includes('"nuovo_controllore"') && prompt.includes('"segnaposto"'), prompt.slice(-900));

  console.log('— saves keep the occupation');
  await page.waitForTimeout(150);
  const doc = store['save/state'];
  check('autosave: the occupied provinces are stored with owner and controller apart', doc && doc.v === 3 && doc.changes[geo.A] && doc.changes[geo.A].owner === 'GDR' && doc.changes[geo.A].controller === 'FRG', doc && doc.changes);
  await ev(() => window.__t.resetGame());
  check('a reset clears the occupations (colours, note)', await ev(A => window.__t.provinces[A].controller === 'GDR' && document.getElementById('occNote').classList.contains('hidden') && window.__t.provinceEls[A][0].getAttribute('fill') === window.__t.countries.GDR.color, geo.A));
  const back2 = await ev(() => window.__t.loadGame().then(ok => ok));
  const restored = await ev(A => ({ o: window.__t.provinces[A].owner, c: window.__t.provinces[A].controller, fill: window.__t.provinceEls[A][0].getAttribute('fill'), note: !document.getElementById('occNote').classList.contains('hidden'),
    text: (window.__t.openProvincePanel(A), document.getElementById('pp-controller').textContent), markers: window.__t.getMarkers().length }), geo.A);
  check('loading brings the occupation back (map, panel text, marker)', back2 === true && restored.o === 'GDR' && restored.c === 'FRG' && /^url\(#occ\d+\)$/.test(restored.fill) && restored.note && restored.text.includes('(occupazione)') && restored.markers === 1, restored);

  console.log('— the province card: two separate buttons');
  await restart('FRG');
  await ev(A => window.__t.selectProvince(A), geo.A);
  check('both buttons exist and say what they do', await ev(() => /sovranit/i.test(document.getElementById('pp-transferBtn').textContent) && /controllo/i.test(document.getElementById('pp-controlBtn').textContent)));
  await page.selectOption('#pp-transferSelect', 'FRG');
  await page.click('#pp-controlBtn');
  const c1 = await ev(A => ({ o: window.__t.provinces[A].owner, c: window.__t.provinces[A].controller, text: document.getElementById('pp-controller').textContent, owner: document.getElementById('pp-owner').textContent }), geo.A);
  check('"Solo controllo": the controller changes, the owner stays, the card says occupation', c1.o === 'GDR' && c1.c === 'FRG' && c1.text.includes('(occupazione)') && c1.owner === 'Germania Est', c1);
  await page.selectOption('#pp-transferSelect', 'GDR');
  await page.click('#pp-controlBtn');
  const c2 = await ev(A => ({ c: window.__t.provinces[A].controller, text: document.getElementById('pp-controller').textContent }), geo.A);
  check('handing control back from the card removes the "occupazione" tag', c2.c === 'GDR' && !c2.text.includes('(occupazione)'), c2);
  await page.selectOption('#pp-transferSelect', 'FRG');
  await page.click('#pp-transferBtn');
  const c3 = await ev(A => ({ o: window.__t.provinces[A].owner, c: window.__t.provinces[A].controller }), geo.A);
  check('"Cedi sovranità e controllo": both change', c3.o === 'FRG' && c3.c === 'FRG', c3);

  console.log('— game over follows control');
  await restart('FRG');
  await ev(() => { const t = window.__t; for (const id of t.getCountryProvinces('FRG')) t.changeProvinceOwner(id, 'GDR'); t.checkGameOver(); });
  check('owning nothing but still holding the ground: the game goes on', (await ev(() => window.__t.getGameOver())) === false);
  await ev(() => { const t = window.__t; for (const id of t.getCountryProvinces('GDR').filter(i => t.provinces[i].controller === 'FRG')) t.changeProvinceController(id, 'GDR'); t.checkGameOver(); });
  check('holding nothing any more: the game is over', (await ev(() => window.__t.getGameOver())) === true && (await txt('#log')).includes('la partita è finita'));
  await restart('FRG');
  await ev(() => { const t = window.__t; for (const id of t.getCountryProvinces('FRG')) t.changeProvinceController(id, 'GDR'); t.checkGameOver(); });
  check('a state wholly occupied (it still owns the land, holds none): the game is over', (await ev(() => window.__t.getGameOver())) === true);
  await restart('FRG');
  const sv = await ev(() => { const t = window.__t; const n = t.getControlledProvinces('FRG').length; return { n, owned: t.getCountryProvinces('FRG').length }; });
  check('controlled and owned provinces coincide at the start', sv.n === sv.owned && sv.n > 0, sv);

  console.log('— the "continue" banner and the start guard');
  await ev(() => window.__t.resetGame());
  const banner = async doc => { store['save/state'] = doc; await ev(() => window.__t.refreshResumeBanner()); return ev(() => ({ hidden: document.getElementById('resumeBanner').classList.contains('hidden'), text: document.getElementById('resumeText').textContent })); };
  let bn = await banner({ v: 3, changes: {}, game: { nation: 'Italia', year: '1962', over: false } });
  check('a good saved game is offered with its nation and date', !bn.hidden && bn.text.includes('Italia') && bn.text.includes('1962'), bn);
  bn = await banner({ v: 3, changes: {}, game: 'oops' });
  check('a corrupted "game" (text) is not offered', bn.hidden, bn);
  bn = await banner({ v: 3, changes: {}, game: [] });
  check('a corrupted "game" (array) is not offered', bn.hidden, bn);
  bn = await banner({ v: 9, changes: {}, game: { nation: 'X', year: '1' } });
  check('an unknown version is not offered', bn.hidden, bn);
  bn = await banner({ v: 3, changes: {}, game: {} });
  check('missing fields never print "undefined"', !bn.text.includes('undefined'), bn);
  const guard = await ev(() => { const t = window.__t; t.resetGame(); const c = t.countries.ITA; c.playable = false; t.startFixedScenarioGame('ITA'); const blocked = t.getGameMode() === null; c.playable = true;
    t.startFixedScenarioGame('constructor'); const hostile = t.getGameMode() === null; t.startFixedScenarioGame('__proto__'); const proto = t.getGameMode() === null;
    t.startFixedScenarioGame('ITA'); return { blocked, hostile, proto, started: t.getGameMode() === 'fixed' }; });
  check('a non-playable nation and hostile ids cannot start a game; a normal one can', guard.blocked && guard.hostile && guard.proto && guard.started, guard);

  console.log('— errors in the page');
  check('no script errors during the whole run', errors.length === 0, errors);
  await browser.close();
  process.exit(summary() ? 1 : 0);
})();
