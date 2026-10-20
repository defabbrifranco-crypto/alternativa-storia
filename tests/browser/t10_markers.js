// Map markers (segnaposto): kinds and symbols, placement, the engine's list, prompt, save / load, interaction.
const { launch, check, summary } = require('./harness');

(async () => {
  let { browser, page, errors, store } = await launch({ width: 1280, height: 900, mobile: false });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const scrollMap = () => page.locator('#euroSvg').evaluate(e => e.scrollIntoView({ block: 'center' }));

  console.log('— structure');
  const init = await ev(() => {
    const T = window.__t, g = id => document.getElementById(id);
    return { n: T.getMarkers().length, sum: g('markerSummary').textContent, emptyShown: !g('markerEmpty').classList.contains('hidden'),
      legend: g('markerLegend').children.length, kinds: T.MARKER_ORDER, layerLast: g('mapLayer').lastElementChild.getAttribute('class'),
      layerAfterLabels: g('mapLayer').lastElementChild.previousElementSibling.getAttribute('class'), panel: g('markerPanel').classList.contains('hidden') };
  });
  check('no markers at the start: nothing is pre-filled', init.n === 0 && init.sum === 'Segnaposto sulla mappa (0)' && init.emptyShown && init.panel, init);
  check('17 kinds, with the nuclear plant, the rifle (armed forces, rebels) and the plain dot', init.kinds.length === 17 &&
    ['nucleare', 'truppe', 'ribelli', 'altro', 'base', 'flotta', 'aviazione', 'missili', 'industria', 'energia', 'risorse', 'governo', 'proteste', 'battaglia', 'catastrofe', 'diplomazia', 'ricerca'].every(k => init.kinds.includes(k)), init.kinds);
  check('the legend lists every kind', init.legend === 17, init.legend);
  check('the marker layer is the last one, over the names', init.layerLast === 'marker-layer' && init.layerAfterLabels === 'label-layer', [init.layerLast, init.layerAfterLabels]);

  console.log('— symbols');
  const sym = await ev(() => {
    const T = window.__t, out = {};
    T.MARKER_ORDER.forEach(k => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-13 -13 26 26">' + T.markerBadge(k, null) + '</svg>';
      const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
      const T0 = T.MARKER_TYPES[k];
      out[k] = { ok: !doc.querySelector('parsererror'), shapes: doc.querySelectorAll('circle,rect,path,polygon').length, label: !!T0.label, hint: !!T0.hint };
    });
    return out;
  });
  check('every symbol is valid SVG with a shape, a label and a hint', Object.values(sym).every(s => s.ok && s.shapes >= 3 && s.label && s.hint), sym);
  const rifle = await ev(() => { const T = window.__t; return [T.markerBadge('truppe', '#2f5d8a'), T.markerBadge('ribelli', null), T.markerBadge('nucleare', null)]; });
  check('rebels are a rifle on a red diamond; the nuclear plant is yellow', /rotate\(45\)/.test(rifle[1]) && rifle[1].includes('#b3261e') && rifle[2].includes('#f2c200') && rifle[0].includes('<path'), rifle.map(s => s.slice(0, 60)));

  console.log('— adding a marker');
  const ids = await ev(() => {
    const T = window.__t, P = T.provinces;
    const first = o => Object.keys(P).find(id => P[id].owner === o);
    return { FRA: first('FRA'), FRG: first('FRG'), ITA: first('ITA'), POL: first('POL'), JPN: first('JPN'), TUR: first('TUR') };
  });
  const add1 = await ev(i => {
    const T = window.__t, r = T.addMarker({ tipo: 'nucleare', nome: 'Centrale di prova', provincia: i.FRA, nota: 'Una nota' }, 'giocatore');
    const m = r.ok ? r.m : null;
    return { ok: r.ok, m: m && { id: m.id, tipo: m.tipo, provincia: m.provincia, stato: m.stato, origine: m.origine, anno: m.anno, nota: m.nota, inside: T.inProvince(m.x, m.y, m.provincia) },
      n: T.getMarkers().length, sum: document.getElementById('markerSummary').textContent };
  }, ids);
  check('a marker is added inside its province, with the owner as state', add1.ok && add1.m.id === 'S1' && add1.m.tipo === 'nucleare' && add1.m.provincia === ids.FRA && add1.m.inside && add1.m.stato === 'FRA', add1);
  check('marked as a test marker, dated, with its note', add1.m.origine === 'giocatore' && add1.m.anno.length > 3 && add1.m.nota === 'Una nota', add1.m);
  check('the summary counts them', add1.sum === 'Segnaposto sulla mappa (1)', add1.sum);
  const dup = await ev(i => { const T = window.__t; return [T.addMarker({ tipo: 'nucleare', nome: 'CENTRALE di prova', provincia: i.FRA }, 'giocatore'), T.addMarker({ tipo: 'Centrale nucleare', nome: 'Centrale  di  próva', provincia: i.FRA }, 'motore')].map(r => [r.ok, !!r.silent]); }, ids);
  check('the same kind and name (ignoring case, accents, spaces) is not added twice, silently', dup[0][0] === false && dup[0][1] && dup[1][0] === false && dup[1][1], dup);

  console.log('— kinds the model may name');
  const kinds = await ev(() => {
    const T = window.__t;
    return ['Centrale nucleare', 'FUCILE', 'forze armate', 'ribelle', 'Rivolta', 'xyz', 'constructor', '__proto__', 'toString', '', null, undefined, 42, {}, 'base militare', 'Navi', 'missile', 'golpe', 'pallino'].map(k => T.markerKind(k));
  });
  check('synonyms map to the kinds, anything else is a plain dot, and object keys are not kinds',
    kinds.join(',') === 'nucleare,truppe,truppe,ribelli,ribelli,altro,altro,altro,altro,altro,altro,altro,altro,altro,base,flotta,missili,proteste,altro', kinds);

  console.log('— names');
  const names = await ev(i => {
    const T = window.__t;
    const a = T.addMarker({ tipo: 'altro', nome: '<img src=x onerror=window.__pwn=1>Prova\u0007 ' + 'x'.repeat(80), provincia: i.POL }, 'giocatore');
    const b = T.addMarker({ tipo: 'truppe', provincia: i.POL }, 'giocatore');
    const c = T.addMarker({ tipo: 'truppe', provincia: i.POL }, 'motore');
    const d = T.addMarker({ tipo: 'truppe', nome: '   ', provincia: i.POL }, 'motore');
    return { a: a.ok && a.m.nome, b: b.ok && b.m.nome, c: [c.ok, c.why], d: [d.ok, d.why], pwn: window.__pwn || null, imgs: document.querySelectorAll('#markerList img, #euroSvg img').length };
  }, ids);
  check('tags and control characters are stripped, the name is cut at 48', typeof names.a === 'string' && !/[<>\u0007]/.test(names.a) && names.a.length <= 48 && names.pwn === null && names.imgs === 0, names);
  check('a test marker with no name takes the name of its kind; the engine must give one', names.b === 'Forze armate' && names.c[0] === false && names.c[1] === 'manca il nome' && names.d[0] === false, names);
  await ev(() => window.__t.clearMarkers());

  console.log('— where it stands (latitude and longitude)');
  const geo = await ev(() => {
    const T = window.__t, out = {};
    const pid = (la, lo, tipo = 'altro') => { const s = T.resolveMarkerSpot(tipo, null, la, lo); return s && { p: s.pid, exact: s.exact }; };
    out.rome = pid(41.9, 12.5); out.paris = pid(48.85, 2.35); out.warsaw = pid(52.23, 21.01); out.moscow = pid(55.75, 37.62); out.tokyo = pid(35.68, 139.69);
    out.sea = pid(35.5, 18); out.seaNuclear = pid(35.5, 18, 'nucleare'); out.badLat = pid(95, 10); out.junk = pid('abc', 'def'); out.empty = pid(null, null);
    const q = T.geoToMap(41.9, 12.5), s = T.resolveMarkerSpot('altro', null, 41.9, 12.5);
    out.xy = [Math.abs(s.x - q.x) < 0.06, Math.abs(s.y - q.y) < 0.06];
    const far = T.resolveMarkerSpot('altro', Object.keys(T.provinces).find(id => T.provinces[id].owner === 'FRA'), 41.9, 12.5);
    out.far = { exact: far.exact, inside: T.inProvince(far.x, far.y, far.pid) };
    return out;
  });
  check('real places fall in the right state (the projection is the map\'s own)', geo.rome.p.startsWith('ITA') && geo.paris.p.startsWith('FRA') && geo.warsaw.p.startsWith('POL') && geo.moscow.p.startsWith('URSS') && geo.tokyo.p.startsWith('JPN') && geo.rome.exact, geo);
  check('the point is where the coordinates say', geo.xy[0] && geo.xy[1], geo.xy);
  check('at sea only the kinds that can be there; wrong or missing coordinates give nothing', geo.sea && geo.sea.p === null && geo.seaNuclear === null && geo.badLat === null && geo.junk === null && geo.empty === null, geo);
  check('a province that exists wins over coordinates that are not in it', geo.far.exact === false && geo.far.inside, geo.far);

  console.log('— the limit');
  const lim = await ev(i => {
    const T = window.__t;
    T.clearMarkers();
    let ok = 0, last = null;
    for (let k = 1; k <= 63; k++) { const r = T.addMarker({ tipo: 'altro', nome: 'Prova ' + k, provincia: i.FRG }, 'motore'); if (r.ok) ok++; else last = r.why; }
    const ms = T.getMarkers();
    const t0 = performance.now(); for (let k = 0; k < 20; k++) T.updateLabels(); const ms20 = (performance.now() - t0) / 20;
    T.clearMarkers();
    return { ok, last, n: ms.length, distinct: new Set(ms.map(m => m.x + ',' + m.y)).size, ms: Math.round(ms20 * 100) / 100 };
  }, ids);
  check('no more than 60 markers; the refusal says why', lim.ok === 60 && lim.n === 60 && /60/.test(lim.last), lim);
  check('markers in one province do not pile up on one point (while there is room)', lim.distinct >= 20, lim.distinct);
  check('60 markers: a label pass stays fast', lim.ms < 6, lim.ms);

  console.log('— the engine\'s list');
  const eng = await ev(i => {
    const T = window.__t;
    T.clearMarkers();
    const lines = T.applyMarkerChanges([
      { azione: 'aggiungi', tipo: 'truppe', nome: 'Divisione di prova', provincia: i.FRG, stato: 'FRG', nota: 'x' },
      { type: 'Centrale nucleare', name: 'Impianto Alfa', province: i.FRA },
      { tipo: 'ribelli', nome: 'Insorti', provincia: 'NON_ESISTE' },
      { tipo: 'nucleare', nome: 'In mare', lat: 35.5, lon: 18 },
      { tipo: 'flotta', nome: 'Squadra navale', lat: 35.5, lon: 18 },
      null, 'x', 42, [], { azione: 'aggiungi', tipo: 'base', nome: 'Divisione di prova', provincia: i.FRG },
      { tipo: 'truppe', nome: 'Settima', provincia: i.POL }, { tipo: 'truppe', nome: 'Ottava', provincia: i.POL }
    ]);
    const ms = T.getMarkers().map(m => [m.id, m.tipo, m.nome, m.provincia, m.origine, m.stato]);
    return { lines, ms };
  }, ids);
  check('valid entries become markers (engine origin), synonyms accepted', eng.ms.length >= 3 && eng.ms[0][1] === 'truppe' && eng.ms[0][4] === 'motore' && eng.ms[1][1] === 'nucleare' && eng.ms[1][2] === 'Impianto Alfa' && eng.ms[1][3] === ids.FRA, eng.ms);
  check('what cannot be placed is reported, never silent', eng.lines.some(l => l.startsWith('⚠️ Segnaposto non aggiunto: «Insorti»')) && eng.lines.some(l => l.includes('«In mare»')), eng.lines);
  check('a ship may stand at sea, and is said to', eng.ms.some(m => m[1] === 'flotta' && m[3] === null) && eng.lines.some(l => l.includes('Flotta «Squadra navale» — in mare')), eng.lines);
  check('the log line names kind, name and place', eng.lines[0].startsWith('📍 Nuovo segnaposto: Forze armate «Divisione di prova» — ') && eng.lines[1].startsWith('📍 Nuovo segnaposto: Impianto nucleare «Impianto Alfa»'), eng.lines.slice(0, 2));
  check('no more than 6 entries per turn; junk entries do not count and do not break anything', eng.ms.length <= 6 && !eng.ms.some(m => m[2] === 'Ottava'), eng.ms);
  const rem = await ev(() => {
    const T = window.__t, first = T.getMarkers()[0];
    const lines = T.applyMarkerChanges([{ azione: 'rimuovi', id: first.id }, { action: 'remove', id: 'S9999' }, { azione: 'rimuovi' }, { azione: 'Elimina', id: T.getMarkers()[1].id }]);
    return { lines, left: T.getMarkers().map(m => m.id), first: first.id };
  });
  check('the engine can remove a marker by its id; unknown ids are ignored', rem.lines.length === 2 && rem.lines[0].startsWith('📍 Rimosso: «Divisione di prova»') && !rem.left.includes(rem.first), rem);
  const proto = await ev(i => {
    const T = window.__t, before = T.getMarkers().length;
    let err = null, lines = null;
    try {
      lines = T.applyMarkerChanges([{ tipo: '__proto__', nome: 'A', provincia: 'constructor' }, { tipo: 'constructor', nome: 'B', provincia: 'toString', stato: 'hasOwnProperty' },
        { tipo: 'altro', nome: 'C', provincia: i.FRG, stato: '__proto__' }]);
    } catch (e) { err = String(e); }
    const c = T.getMarkers().find(m => m.nome === 'C');
    return { err, lines, added: T.getMarkers().length - before, c: c && [c.tipo, c.provincia === i.FRG, c.stato], polluted: ({}).owner !== undefined || ({}).tipo !== undefined };
  }, ids);
  check('names such as "constructor" or "__proto__" are not ids, kinds or states', proto.err === null && proto.added === 1 && proto.c && proto.c[0] === 'altro' && proto.c[1] && proto.c[2] === ids && false || (proto.err === null && proto.added === 1 && proto.c && proto.c[1] && !proto.polluted && proto.lines.length === 3), proto);
  const none = await ev(() => { const T = window.__t; return [T.applyMarkerChanges(undefined), T.applyMarkerChanges('x'), T.applyMarkerChanges({}), T.applyMarkerChanges([])].map(a => a.length); });
  check('anything that is not a list is ignored', none.join() === '0,0,0,0', none);
  await ev(() => window.__t.clearMarkers());

  console.log('— what the model is told');
  const rules = await ev(() => {
    const T = window.__t, a = T.markerRules();
    T.addMarker({ tipo: 'nucleare', nome: 'Centrale Beta', provincia: Object.keys(T.provinces).find(id => T.provinces[id].owner === 'FRA') }, 'motore');
    const b = T.markerRules();
    return { a, b, schema: T.markerSchema, kinds: T.MARKER_ORDER, ops: T.MAX_MARKER_OPS };
  });
  check('the rules name every kind, the answer field, the limits and that these are not verified history', rules.kinds.every(k => rules.a.includes(k + ' (')) && rules.a.includes('"segnaposto"') && rules.a.includes('Al massimo 6') && /non sono dati storici verificati/.test(rules.a) && rules.schema.includes('"segnaposto"'), rules.a.slice(0, 300));
  check('with no marker the block says so; with markers it lists them with their ids', /Non ci sono ancora segnaposto/.test(rules.a) && /S1=nucleare «Centrale Beta»/.test(rules.b), rules.b.slice(0, 700));
  console.log('   rules block, characters: empty ' + rules.a.length + ', with one ' + rules.b.length);
  check('the block stays short', rules.a.length < 3200, rules.a.length);
  await ev(() => window.__t.clearMarkers());

  console.log('— a turn through the interface');
  await ev(() => { const T = window.__t; T.startFixedScenarioGame('ITA'); });
  const turn = await ev(i => {
    window.__queue.push({ evento_titolo: 'Atomo', narrativa: 'Un impianto e una rivolta.', riepilogo_mondo: 'Nuovi fatti.', nuovo_anno: 'febbraio 1961', stabilita: 50, economia: 50, esercito: 50, prestigio: 50,
      cambi_territoriali: [], segnaposto: [{ azione: 'aggiungi', tipo: 'nucleare', nome: 'Centrale di Latina (prova)', provincia: i.ITA, nota: 'Costruita dal giocatore.' },
        { azione: 'aggiungi', tipo: 'ribelli', nome: 'Insorti del Nord', provincia: i.FRG }] });
    return true;
  }, ids);
  await page.fill('#actionInput', 'Costruisco una centrale nucleare');
  await page.click('#actBtn');
  await page.waitForFunction(() => document.querySelector('#log .entry-terr'), null, { timeout: 8000 });
  const t1 = await ev(() => {
    const T = window.__t, p = window.__prompts[window.__prompts.length - 1];
    return { prompt: p, ms: T.getMarkers().map(m => [m.id, m.tipo, m.nome, m.origine]), log: [...document.querySelectorAll('#log .entry-terr')].map(e => e.textContent).join(' | '), len: p.length,
      doc: JSON.parse(JSON.stringify(Object.values(window.__store || {}))) };
  });
  check('the prompt carries the rules and the answer field', t1.prompt.includes('Segnaposto sulla mappa') && t1.prompt.includes('"segnaposto"') && t1.prompt.includes('"cambi_territoriali"'), t1.prompt.slice(0, 200));
  check('the turn\'s markers are on the map, from the engine', t1.ms.length === 2 && t1.ms[0][1] === 'nucleare' && t1.ms[0][3] === 'motore' && t1.ms[1][1] === 'ribelli', t1.ms);
  check('the log reports them', t1.log.includes('📍 Nuovo segnaposto: Impianto nucleare «Centrale di Latina (prova)»') && t1.log.includes('«Insorti del Nord»'), t1.log);
  console.log('   whole turn prompt, characters: ' + t1.len);
  check('the whole turn prompt stays moderate', t1.len < 9500, t1.len);
  const saved = await ev(async () => { const T = window.__t; await T.saveGame(); const snap = await window.claude.use('db').then(d => d.doc('save/state').get()); const d = snap.data(); return { v: d.v, markers: d.markers, seq: d.markerSeq, size: JSON.stringify(d).length, game: !!d.game }; });
  check('autosave: the document is v3 with the markers and the sequence number', saved.v === 3 && saved.markers.length === 2 && saved.seq === 2 && saved.game, saved);
  console.log('   saved document, characters: ' + saved.size);

  console.log('— free scenario: no map, no markers');
  await ev(() => { window.__t.resetGame(); });
  await page.fill('#nation', 'Impero Romano'); await page.fill('#startYear', '400 d.C.');
  await ev(() => { window.__queue.push({ evento_titolo: 'x', narrativa: 'y', riepilogo_mondo: 'z', nuovo_anno: '401', stabilita: 50, economia: 50, esercito: 50, prestigio: 50, segnaposto: [{ tipo: 'altro', nome: 'Non deve comparire', lat: 41, lon: 12 }] }); });
  await page.click('#startBtn');
  await page.fill('#actionInput', 'Rinforzo il Reno');
  await page.click('#actBtn');
  await page.waitForFunction(() => document.querySelectorAll('#log .entry-narr').length >= 1 && !document.getElementById('actBtn').disabled, null, { timeout: 8000 });
  const free = await ev(() => ({ p: window.__prompts[window.__prompts.length - 1], n: window.__t.getMarkers().length }));
  check('free scenario: the prompt has no marker rules and the answer adds no marker', !free.p.includes('Segnaposto sulla mappa') && !free.p.includes('"segnaposto"') && free.n === 0, free.p.slice(0, 120));
  await ev(() => { window.__t.resetGame(); });

  console.log('— save and load');
  await ev(i => {
    const T = window.__t;
    T.addMarker({ tipo: 'truppe', nome: 'Reparto A', provincia: i.FRG, stato: 'FRG' }, 'motore');
    T.addMarker({ tipo: 'flotta', nome: 'Flotta B', lat: 35.5, lon: 18 }, 'motore');
    T.addMarker({ tipo: 'base', nome: 'Base C', lat: 48.85, lon: 2.35, nota: 'Nota C' }, 'giocatore');
  }, ids);
  const doc1 = await ev(() => { const T = window.__t; return JSON.parse(JSON.stringify(T.buildSavePayload())); });
  check('a save has the markers, the sequence number and nothing else new', doc1.markers.length === 3 && doc1.markerSeq === 3 && doc1.v === 3 && doc1.schemaVersion === 3 && Object.keys(doc1).sort().join() === 'changes,game,markerSeq,markers,savedAt,schemaVersion,selectedCountryId,v', Object.keys(doc1));
  const back = await ev(doc => {
    const T = window.__t;
    const before = JSON.stringify(T.markersForSave());
    T.clearMarkers();
    T.applySave(doc);
    const after = JSON.stringify(T.markersForSave());
    const r = T.addMarker({ tipo: 'altro', nome: 'Dopo il caricamento', provincia: Object.keys(T.provinces)[5] }, 'giocatore');
    return { same: before === after, next: r.m.id, drawn: document.querySelectorAll('#euroSvg [data-marker]').length, list: document.getElementById('markerList').children.length };
  }, doc1);
  check('after loading, markers are the same (ids, places) and the numbering goes on', back.same && back.next === 'S4' && back.list === 4, back);
  const junk = await ev(() => {
    const T = window.__t;
    const good = { id: 'S7', tipo: 'truppe', nome: 'Buono', nota: 'n', provincia: Object.keys(T.provinces)[3], x: 1000, y: 700, stato: 'FRA', anno: '1961', origine: 'motore' };
    const doc = { v: 3, changes: {}, markerSeq: 'abc', markers: [good, { ...good, id: 'S7', nome: 'Stesso id' }, { ...good, id: 'X1', nome: 'Id sbagliato' }, { ...good, id: 'S8', x: -5, nome: 'Fuori' }, { ...good, id: 'S9', y: 99999, nome: 'Fuori 2' },
      { ...good, id: 'S10', x: 'a', nome: 'Non numero' }, { ...good, id: 'S11', nome: '' }, { ...good, id: 'S12', tipo: '__proto__', nome: 'Tipo strano', provincia: 'NOPE', stato: 'XX' }, null, 'testo', 7, [], { ...good, id: 'S13', nome: '<b>Tag</b>' }] };
    T.applySave(doc);
    const ms = T.getMarkers().map(m => [m.id, m.tipo, m.nome, m.provincia, m.stato]);
    return { ms, seq: T.getMarkerSeq() };
  });
  check('a document with junk keeps only what is valid; ids are never repeated', junk.ms.some(m => m[2] === 'Buono' && m[0] === 'S7') && !junk.ms.some(m => /Fuori|Non numero/.test(m[2])) && !junk.ms.some(m => m[2] === '') && new Set(junk.ms.map(m => m[0])).size === junk.ms.length, junk);
  check('an unknown kind becomes a dot, an unknown province or state becomes none, tags are stripped', junk.ms.some(m => m[2] === 'Tipo strano' && m[1] === 'altro' && m[3] === null && m[4] === null) && junk.ms.some(m => m[2] === 'bTagb' || m[2] === 'b Tag b' || /Tag/.test(m[2]) && !/[<>]/.test(m[2])), junk.ms);
  check('the sequence never falls behind the ids in use', junk.seq >= 13, junk.seq);
  const noMk = await ev(() => { const T = window.__t; T.applySave({ v: 3, changes: {} }); return T.getMarkers().length; });
  check('a save without markers clears the ones on the map', noMk === 0, noMk);
  const many = await ev(() => { const T = window.__t; T.applySave({ v: 3, changes: {}, markers: Array.from({ length: 90 }, (_, i) => ({ id: 'S' + (i + 1), tipo: 'altro', nome: 'N' + i, x: 800 + i, y: 700, anno: '1960', origine: 'motore' })) }); return T.getMarkers().length; });
  check('at most 60 are restored', many === 60, many);
  await ev(() => { window.__t.resetGame(); });
  const afterReset = await ev(() => ({ n: window.__t.getMarkers().length, dom: document.querySelectorAll('#euroSvg [data-marker]').length, panel: document.getElementById('markerPanel').classList.contains('hidden'), sum: document.getElementById('markerSummary').textContent }));
  check('"Nuova partita" removes the markers, from the map too', afterReset.n === 0 && afterReset.dom === 0 && afterReset.panel && afterReset.sum === 'Segnaposto sulla mappa (0)', afterReset);

  console.log('— on the map');
  await scrollMap();
  const placed = await ev(() => {
    const T = window.__t;
    T.setView(900, 650, 5);
    ['Alfa', 'Beta', 'Gamma'].forEach((n, i) => T.addMarker({ tipo: ['nucleare', 'truppe', 'ribelli'][i], nome: n + ' (prova)', lat: [44.1, 50.55, 47.5][i], lon: [4.7, 9.68, 19.04][i] }, 'giocatore'));
    T.setView(1000, 640, 5);
    const els = [...document.querySelectorAll('#euroSvg [data-marker]')];
    const k = T.scale * document.getElementById('euroSvg').getBoundingClientRect().width / T.VBW;
    return { n: els.length, tr: els.map(e => e.getAttribute('transform')), scales: els.map(e => /scale\(([\d.]+)\)/.exec(e.getAttribute('transform'))[1]), k, kind: els.map(e => e.getAttribute('aria-label')) };
  });
  check('markers within the view are drawn, at a constant size (counter-scaled)', placed.n >= 2 && placed.scales.every(s => Math.abs(+s * placed.k - 1) < 0.02), placed);
  const px = await ev(() => { const r = document.querySelector('#euroSvg [data-marker] .mk-hit').getBoundingClientRect(); return Math.round(r.width); });
  check('the touch target is about 34 px', px >= 30 && px <= 40, px);
  const zoomed = await ev(() => { const T = window.__t; T.setView(1000, 640, 12); const g = document.querySelector('#euroSvg [data-marker] .mk-hit'); const w1 = g ? g.getBoundingClientRect().width : 0; T.setView(1000, 640, 3); const g2 = document.querySelector('#euroSvg [data-marker] .mk-hit'); return [Math.round(w1), g2 ? Math.round(g2.getBoundingClientRect().width) : 0]; });
  check('the size on screen does not change with the zoom', Math.abs(zoomed[0] - zoomed[1]) <= 1 || zoomed[0] === 0 || zoomed[1] === 0, zoomed);

  // a tap on a marker
  await ev(() => { window.__t.setView(1000, 640, 6); });
  const target = await ev(() => {
    const els = [...document.querySelectorAll('#euroSvg [data-marker]')].filter(e => e.style.display !== 'none');
    const e = els[0]; const r = e.querySelector('.mk-hit').getBoundingClientRect();
    return { id: e.getAttribute('data-marker'), x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(target.x, target.y);
  const sel1 = await ev(id => {
    const g = i => document.getElementById(i);
    return { sel: window.__t.getSelectedMarkerId(), panel: !g('markerPanel').classList.contains('hidden'), name: g('mp-name').textContent, type: g('mp-type').textContent, prov: g('provincePanel').classList.contains('hidden'),
      cls: document.querySelector('[data-marker="' + id + '"]').classList.contains('sel'), icon: g('mp-icon').children.length, origin: g('mp-origin').textContent, disc: g('mp-disc').textContent, selProv: window.__t.getSelectedProvince() };
  }, target.id);
  check('a tap on a marker opens its card (and not the province under it)', sel1.sel === target.id && sel1.panel && sel1.prov && sel1.cls && sel1.selProv === null && sel1.icon > 0, sel1);
  check('the card names the kind and says the marker comes from the editor', /prova/.test(sel1.name) && sel1.type.length > 3 && sel1.origin.includes('Editor') && sel1.disc.includes("Segnaposto dell'Editor"), sel1);
  // a tap on the land closes it and opens the province
  const land = await ev(() => { const T = window.__t; const pid = Object.keys(T.provinces).find(id => T.provinces[id].owner === 'POL'); T.setView(1100, 600, 5); const b = T.provinceEls[pid][0].getBoundingClientRect(); return { pid, x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  await page.mouse.click(land.x, land.y);
  const sel2 = await ev(() => ({ sel: window.__t.getSelectedMarkerId(), panel: document.getElementById('markerPanel').classList.contains('hidden'), prov: !document.getElementById('provincePanel').classList.contains('hidden'), any: document.querySelectorAll('#euroSvg .marker.sel').length }));
  check('a tap on the land closes the marker card and opens the province card', sel2.sel === null && sel2.panel && sel2.prov && sel2.any === 0, sel2);
  // drag that starts on a marker pans the map, does not select
  await ev(() => { window.__t.setView(1000, 640, 6); });
  const drag = await ev(() => { const e = [...document.querySelectorAll('#euroSvg [data-marker]')].filter(x => x.style.display !== 'none')[0]; const r = e.querySelector('.mk-hit').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, tx: window.__t.tx }; });
  await page.mouse.move(drag.x, drag.y); await page.mouse.down(); await page.mouse.move(drag.x + 60, drag.y + 20, { steps: 5 }); await page.mouse.up();
  const dragged = await ev(() => ({ tx: window.__t.tx, sel: window.__t.getSelectedMarkerId() }));
  check('dragging from a marker moves the map and does not open the card', Math.abs(dragged.tx - drag.tx) > 20 && dragged.sel === null, [drag.tx, dragged]);

  // card actions
  await ev(() => { const T = window.__t; T.setView(1000, 640, 4); T.selectMarker(T.getMarkers()[0].id); });
  await page.click('#mp-focus');
  const foc = await ev(() => {
    const T = window.__t, m = T.getMarkers()[0], r = document.getElementById('euroSvg').getBoundingClientRect(), k = T.scale * r.width / T.VBW;
    const cx = r.x + (m.x * T.scale + T.tx) * r.width / T.VBW, cy = r.y + r.height / 2 + ((m.y * T.scale + T.ty) - 1029) * r.width / T.VBW;
    return { scale: T.scale, dx: Math.abs(cx - (r.x + r.width / 2)), dy: Math.abs(cy - (r.y + r.height / 2)), k };
  });
  check('"Mostra sulla mappa" zooms in on the marker and centres it', foc.scale >= 8 && foc.dx < 25 && foc.dy < 25, foc);
  const chip = await ev(() => { const b = document.querySelector('#mp-prov .chip'); return b ? b.textContent : null; });
  check('the card shows the province as a button', !!chip, chip);
  const rm = await ev(() => { const T = window.__t, id = T.getSelectedMarkerId(), n = T.getMarkers().length; return { id, n }; });
  await page.click('#mp-remove');
  const rm2 = await ev(id => ({ n: window.__t.getMarkers().length, el: !!document.querySelector('[data-marker="' + id + '"]'), panel: document.getElementById('markerPanel').classList.contains('hidden'), sum: document.getElementById('markerSummary').textContent }), rm.id);
  check('"Rimuovi" deletes the marker from the map, the list and the count', rm2.n === rm.n - 1 && !rm2.el && rm2.panel && rm2.sum === 'Segnaposto sulla mappa (' + (rm.n - 1) + ')', rm2);

  // the list
  const lst = await ev(() => { const T = window.__t, ms = T.getMarkers(); const items = [...document.querySelectorAll('#markerList .mk-item')]; return { n: items.length, want: ms.length, first: items[0] && items[0].textContent, last: ms[ms.length - 1].nome }; });
  check('the list has every marker, newest first', lst.n === lst.want && lst.first.startsWith(lst.last), lst);
  await page.evaluate(() => { document.getElementById('markerBox').open = true; });
  await page.locator('#markerList .mk-item').last().click();
  const lst2 = await ev(() => ({ sel: window.__t.getSelectedMarkerId(), scale: window.__t.scale, panel: !document.getElementById('markerPanel').classList.contains('hidden') }));
  check('a list item opens the card and brings the marker into view', !!lst2.sel && lst2.panel && lst2.scale >= 8, lst2);
  // visibility toggle
  await scrollMap();
  await page.uncheck('#markerShow');
  const vis0 = await ev(() => document.querySelector('#euroSvg .marker-layer').style.display);
  await page.check('#markerShow');
  const vis1 = await ev(() => document.querySelector('#euroSvg .marker-layer').style.display);
  check('the switch hides and shows every marker', vis0 === 'none' && vis1 === '', [vis0, vis1]);
  // keyboard
  await ev(() => { const T = window.__t; T.closeMarkerPanel ? 0 : 0; T.setView(1000, 640, 6); });
  const kb = await ev(() => { const e = [...document.querySelectorAll('#euroSvg [data-marker]')].filter(x => x.style.display !== 'none')[0]; e.focus(); return { id: e && e.getAttribute('data-marker'), tab: e && e.getAttribute('tabindex'), role: e && e.getAttribute('role') }; });
  await page.keyboard.press('Enter');
  const kb2 = await ev(() => window.__t.getSelectedMarkerId());
  check('markers can be reached and opened with the keyboard', kb.tab === '0' && kb.role === 'button' && kb2 === kb.id, [kb, kb2]);

  console.log('— groups of markers close together');
  await ev(() => {
    const T = window.__t; T.clearMarkers();
    T.addMarker({ tipo: 'ricerca', nome: 'Laboratorio (prova)', lat: 46.23, lon: 6.05 }, 'giocatore');
    T.addMarker({ tipo: 'diplomazia', nome: 'Vertice (prova)', lat: 46.2, lon: 6.15 }, 'giocatore');
    T.addMarker({ tipo: 'industria', nome: 'Officine (prova)', lat: 46.2, lon: 7.15 }, 'giocatore');
    T.addMarker({ tipo: 'proteste', nome: 'Scioperi (prova)', lat: 52.2, lon: 21.0 }, 'giocatore');
    T.setView(830, 740, 1.6);
  });
  const cl = await ev(() => { const T = window.__t; return { n: T.getLastClusters().length, sizes: T.getLastClusters().map(c => c.list.length), dom: document.querySelectorAll('#euroSvg [data-cluster]').length, text: [...document.querySelectorAll('#euroSvg [data-cluster]')].filter(e => e.style.display !== 'none').map(e => e.textContent) }; });
  check('markers that would touch are grouped under a badge with their number', cl.n >= 1 && cl.sizes.some(s => s === 3) && cl.text.includes('3'), cl);
  const cl2 = await ev(() => { const e = [...document.querySelectorAll('#euroSvg [data-cluster]')].filter(x => x.style.display !== 'none')[0]; const r = e.querySelector('.mk-hit').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, scale: window.__t.scale }; });
  await scrollMap();
  const cl2b = await ev(() => { const e = [...document.querySelectorAll('#euroSvg [data-cluster]')].filter(x => x.style.display !== 'none')[0]; const r = e.querySelector('.mk-hit').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, scale: window.__t.scale }; });
  await page.mouse.click(cl2b.x, cl2b.y);
  const cl3 = await ev(() => ({ scale: window.__t.scale, group: !document.getElementById('mp-group').classList.contains('hidden'), panel: !document.getElementById('markerPanel').classList.contains('hidden'), items: document.querySelectorAll('#mp-group-list .mk-item').length, clusters: window.__t.getLastClusters().map(c => c.list.length) }));
  check('a tap on a group zooms in; markers that stay too close are listed in the card instead', (cl3.scale > cl2b.scale && cl3.clusters.every(n => n < 3)) || (cl3.group && cl3.items >= 2), [cl2b.scale, cl3]);
  console.log('   after tapping the group: scale ' + cl2b.scale + ' -> ' + cl3.scale + ', list ' + cl3.group + ' (' + cl3.items + '), groups ' + JSON.stringify(cl3.clusters));
  // two markers 8 units apart cannot be told apart even at the highest zoom: the card lists them
  await ev(() => { const T = window.__t; T.setView(827, 738, 24); T.updateLabels(); });
  const cl4 = await ev(() => ({ clusters: window.__t.getLastClusters().map(c => c.list.length) }));
  await ev(() => { const T = window.__t; T.showMarkerGroup(T.getMarkers().slice(0, 2)); });
  const grp = await ev(() => { const items = [...document.querySelectorAll('#mp-group-list .mk-item')]; return { n: items.length, title: document.getElementById('mp-group-title').textContent, detail: document.getElementById('mp-detail').classList.contains('hidden') }; });
  check('the group card lists the markers, each one opens', grp.n === 2 && /2 segnaposto/.test(grp.title) && grp.detail, grp);
  await page.locator('#mp-group-list .mk-item').first().click();
  const grp2 = await ev(() => ({ sel: window.__t.getSelectedMarkerId(), detail: !document.getElementById('mp-detail').classList.contains('hidden') }));
  check('choosing one from the group opens its own card', !!grp2.sel && grp2.detail, grp2);
  await page.click('#mp-close');
  check('the close button closes the card', await ev(() => document.getElementById('markerPanel').classList.contains('hidden') && window.__t.getSelectedMarkerId() === null));

  console.log('— a marker added by hand from the province card (scenario editor)');
  await ev(i => { const T = window.__t; T.clearMarkers(); T.selectProvince(i.FRG); }, ids);
  check('outside the editor the card cannot add markers', await ev(() => document.getElementById('pp-markerBtn').offsetParent === null));
  await page.click('#modeEditBtn');
  const dm = await ev(() => { const s = document.getElementById('pp-markerType'); return { opts: s.options.length, first: s.options[0].textContent }; });
  check('the province card offers every kind', dm.opts === 17, dm);
  await page.selectOption('#pp-markerType', 'nucleare');
  await page.fill('#pp-markerName', 'Reattore di prova');
  await page.click('#pp-markerBtn');
  const dm2 = await ev(i => { const T = window.__t, m = T.getMarkers()[0]; return { n: T.getMarkers().length, m: m && [m.tipo, m.nome, m.provincia === i.FRG, m.origine], msg: document.getElementById('pp-markerMsg').textContent, shown: !document.getElementById('provincePanel').classList.contains('hidden') }; }, ids);
  check('it adds a marker in that province and says so', dm2.n === 1 && dm2.m[0] === 'nucleare' && dm2.m[1] === 'Reattore di prova' && dm2.m[2] && dm2.m[3] === 'giocatore' && /Aggiunto/.test(dm2.msg) && dm2.shown, dm2);
  await page.selectOption('#pp-markerType', 'nucleare');
  await page.fill('#pp-markerName', 'Reattore di prova');
  await page.click('#pp-markerBtn');
  const dm3 = await ev(() => ({ n: window.__t.getMarkers().length, msg: document.getElementById('pp-markerMsg').textContent }));
  check('the same one twice is refused with a message', dm3.n === 1 && /già/.test(dm3.msg), dm3);

  console.log('— names keep clear of markers');
  const lab = await ev(i => {
    const T = window.__t; T.clearMarkers(); T.setView(930, 790, 3.2); T.updateLabels();
    const vis = () => T.labelEls.filter(L => L.want).length;
    const before = vis();
    const a = T.anchorOf(T.provinces[i.ITA] ? i.ITA : Object.keys(T.provinces)[0]);
    T.addMarker({ tipo: 'industria', nome: 'Sopra il nome', provincia: i.ITA }, 'giocatore');
    T.updateLabels();
    return { before, after: vis(), a };
  }, ids);
  check('a marker on the spot of a name costs at most one name', lab.after >= lab.before - 1, lab);

  check('no page errors in the desktop run', errors.length === 0, errors);
  await browser.close();

  // ---- phone, touch, dark ----
  ({ browser, page, errors } = await launch({ width: 390, height: 844, mobile: true, colorScheme: 'dark' }));
  console.log('— phone (390 px, touch, dark)');
  await page.evaluate(() => { const T = window.__t; ['nucleare', 'ribelli'].forEach((k, i) => T.addMarker({ tipo: k, nome: 'P' + i + ' (prova)', lat: [48.85, 52.2][i], lon: [2.35, 21.0][i] }, 'giocatore')); T.setView(1000, 640, 3); });
  await page.locator('#euroSvg').evaluate(e => e.scrollIntoView({ block: 'center' }));
  const ph = await page.evaluate(() => { const e = [...document.querySelectorAll('#euroSvg [data-marker]')].filter(x => x.style.display !== 'none')[0]; const r = e.querySelector('.mk-hit').getBoundingClientRect(); return { id: e.getAttribute('data-marker'), x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width }; });
  await page.touchscreen.tap(ph.x, ph.y);
  const ph2 = await page.evaluate(() => ({ sel: window.__t.getSelectedMarkerId(), panel: !document.getElementById('markerPanel').classList.contains('hidden'), w: document.getElementById('markerPanel').getBoundingClientRect().width, vw: window.innerWidth, scrollW: document.documentElement.scrollWidth }));
  check('phone: a finger tap opens the card; the page does not scroll sideways', ph2.sel === ph.id && ph2.panel && ph2.scrollW <= ph2.vw + 1 && ph2.w <= ph2.vw, ph2);
  check('phone: the touch target is at least 32 px', ph.w >= 32, ph.w);
  if (process.env.SHOT_DIR) await page.screenshot({ path: require('path').join(process.env.SHOT_DIR, 'mk_phone_card.png'), fullPage: false });
  check('no page errors on the phone', errors.length === 0, errors);
  await browser.close();

  process.exit(summary() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
