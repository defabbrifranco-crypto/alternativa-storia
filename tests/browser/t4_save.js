const { launch, check, summary, playTurn } = require('./harness');
(async () => {
  const store = {};
  let { browser, page, errors } = await launch({ width: 640, height: 1100, mobile: false, store });
  const txt = sel => page.evaluate(s => document.querySelector(s).textContent, sel);
  const vis = sel => page.evaluate(s => !document.querySelector(s).classList.contains('hidden'), sel);

  console.log('— nothing saved yet');
  check('no resume banner on a fresh start', !(await vis('#resumeBanner')));
  await page.click('#loadGameBtn');
  await page.waitForTimeout(100);
  check('loading with no save says so', (await txt('#saveStatus')) === 'Nessun salvataggio trovato.', await txt('#saveStatus'));

  console.log('— play, change territory, save');
  const geo = await page.evaluate(() => {
    const P = window.__t.provinces;
    // a Swiss province bordering Italy: Italy can take it
    const A = Object.keys(P).filter(i => P[i].owner === 'CHE').find(i => P[i].neighbors.some(n => P[n].owner === 'ITA'));
    return { A };
  });
  await page.evaluate(() => window.__t.startFixedScenarioGame('ITA'));
  await page.evaluate(g => { window.__queue.push({ evento_titolo: 'Ticino', narrativa: 'Un plebiscito.', riepilogo_mondo: 'Un cantone passa all\'Italia.', nuovo_anno: 'febbraio 1961', stabilita: 50, economia: 50, esercito: 50, prestigio: 50, cambi_territoriali: [{ provincia: g.A, nuovo_proprietario: 'ITA' }] }); }, geo);
  await playTurn(page, 'Chiedo un plebiscito');
  await page.waitForFunction(() => document.getElementById('thinking').classList.contains('hidden') && document.querySelector('#log .entry-terr'));
  await page.waitForTimeout(150);
  await page.click('#saveGameBtn');
  await page.waitForTimeout(150);
  check('manual save confirmed', (await txt('#saveStatus')) === 'Partita salvata.', await txt('#saveStatus'));
  const doc = store['save/state'];
  check('v3 document with exactly the one changed province', doc.v === 3 && doc.schemaVersion === 3 && JSON.stringify(Object.keys(doc.changes)) === JSON.stringify([geo.A]) && doc.changes[geo.A].owner === 'ITA', doc.changes);
  check('document size is small', JSON.stringify(doc).length < 6000, JSON.stringify(doc).length);
  await browser.close();

  console.log('— reopen the page: resume banner, continue');
  ({ browser, page, errors } = await launch({ width: 640, height: 1100, mobile: false, store }));
  await page.waitForFunction(() => !document.getElementById('resumeBanner').classList.contains('hidden'), null, { timeout: 5000 });
  check('resume banner offers the saved game', (await txt('#resumeText')).includes('Partita salvata: Italia, febbraio 1961'), await txt('#resumeText'));
  check('before continuing the map is at the 1960 starting situation', await page.evaluate(g => window.__t.provinces[g.A].owner === 'CHE', geo));
  await page.click('#resumeBtn');
  await page.waitForTimeout(150);
  const rs = await page.evaluate(g => ({ owner: window.__t.provinces[g.A].owner, ctl: window.__t.provinces[g.A].controller, mode: window.__t.getGameMode(), nation: document.getElementById('nationLabel').textContent,
    year: document.getElementById('yearLabel').textContent, terr: document.querySelectorAll('#log .entry-terr').length, mine: document.querySelectorAll('.province-poly.mine').length, playing: document.getElementById('playingAs').textContent,
    changed: Object.keys(window.__t.provinces).filter(i => window.__t.provinces[i].owner !== window.__t.initialTerritory[i].owner).length }), geo);
  check('territory, nation, year and log restored', rs.owner === 'ITA' && rs.ctl === 'ITA' && rs.mode === 'fixed' && rs.nation === 'Italia' && rs.year === 'febbraio 1961' && rs.terr === 1 && rs.changed === 1, rs);
  check('player highlighted on the map and in the text', rs.mine > 19 && rs.playing === 'Stai giocando come: Italia', rs);

  console.log('— "Carica partita" restores the same state after a reset');
  await page.click('#newGameBtn');
  const cleared = await page.evaluate(g => window.__t.provinces[g.A].owner, geo);
  check('new game puts the province back', cleared === 'CHE', cleared);
  await page.click('#loadGameBtn');
  await page.waitForTimeout(150);
  check('load brings it back', await page.evaluate(g => window.__t.provinces[g.A].owner === 'ITA' && window.__t.getGameMode() === 'fixed', geo));
  check('status says loaded', (await txt('#saveStatus')) === 'Partita caricata.', await txt('#saveStatus'));
  await browser.close();

  console.log('— a save made with the previous map (v2, 95 provinces) is migrated');
  const v2 = { v: 2, selectedCountryId: 'ITA', savedAt: '2026-10-01T10:00:00.000Z',
    provinces: {
      FRA_MAIN: { owner: 'GBR', controller: 'GBR' },          // whole old France now British -> 21 regions
      BEL_MAIN: { owner: 'BEL', controller: 'BEL' },          // unchanged
      CZE: { owner: 'POL', controller: 'POL' },               // Bohemia+Moravia (old) -> the Czech regions of the new map, not Slovakia
      SVK: { owner: 'TCH', controller: 'TCH' },
      PAK_W: { owner: 'IND', controller: 'PAK' },             // western wing
      UKR_MAIN: { owner: 'POL', controller: 'POL' },          // a province that still exists unchanged
      FRG_N: { owner: 'GDR', controller: 'GDR' },             // old simplified German region: no counterpart
      GDR_BERLIN: { owner: 'FRG', controller: 'FRG' },        // Berlin East -> the Berlin East shape
      ZZZ_MAIN: { owner: 'FRA', controller: 'FRA' },          // unknown id
      ITA_MAIN: { owner: 'NOPE', controller: 'NOPE' }         // invalid owner: ignored
    },
    game: { mode: 'fixed', over: false, nation: 'Italia', year: '31 dicembre 1960', premise: 'p', worldSummary: 'w', stats: { stabilita: 51, economia: 52, esercito: 53, prestigio: 54 },
      log: [{ k: 'a', text: 'prova' }, { k: 't', year: '31 dicembre 1960', headline: 'T', narr: 'N' }], diplo: { target: '', history: [], bubbles: [] } } };
  const store2 = { 'save/state': v2 };
  ({ browser, page, errors } = await launch({ width: 640, height: 1100, mobile: false, store: store2 }));
  await page.waitForFunction(() => !document.getElementById('resumeBanner').classList.contains('hidden'), null, { timeout: 5000 });
  await page.click('#resumeBtn');
  await page.waitForTimeout(150);
  const mg = await page.evaluate(() => {
    const t = window.__t, P = t.provinces, by = (st, o, c) => Object.keys(P).filter(i => P[i].owner === o && (c ? P[i].controller === c : true) && t.initialTerritory[i].owner === st).length;
    const tch = Object.keys(P).filter(i => t.initialTerritory[i].owner === 'TCH');
    return { fra: by('FRA', 'GBR'), fraTot: Object.keys(P).filter(i => t.initialTerritory[i].owner === 'FRA').length,
      bel: by('BEL', 'BEL'), belTot: Object.keys(P).filter(i => t.initialTerritory[i].owner === 'BEL').length,
      czPOL: tch.filter(i => P[i].owner === 'POL').length, svTCH: tch.filter(i => !t.REGION_UNITS.find(u => u[0] === i) ? false : P[i].name.startsWith('Slovacchia') && P[i].owner === 'TCH').length,
      pakW: by('PAK', 'IND', 'PAK'), pakE: Object.keys(P).filter(i => t.initialTerritory[i].owner === 'PAK' && P[i].owner === 'PAK').length,
      ukr: P.UKR_MAIN.owner, frgChanged: Object.keys(P).filter(i => t.initialTerritory[i].owner === 'FRG' && P[i].owner !== 'FRG').length,
      gdrB: P.GDR_15.owner, gdrBc: P.GDR_15.controller, ita: P.ITA_MAIN ? P.ITA_MAIN.owner : 'n/a', itaRegions: Object.keys(P).filter(i => t.initialTerritory[i].owner === 'ITA' && P[i].owner === 'ITA').length,
      note: [...document.querySelectorAll('#log .entry-terr')].map(e => e.textContent), nat: document.getElementById('nationLabel').textContent, logN: document.querySelectorAll('#log > div').length };
  });
  console.log('   ', mg);
  check('old whole-state change carried to all 21 French regions', mg.fra === 21 && mg.fraTot === 21, mg);
  check('unchanged old provinces change nothing', mg.bel === mg.belTot, mg);
  check('old Czech province -> only the Czech/Moravian regions + Prague', mg.czPOL === 8 && mg.svTCH === 3, mg);
  check('western wing divisions carried (owner IND, controller PAK); eastern wing untouched', mg.pakW === 9 && mg.pakE === 3, mg);
  check('a province that still exists keeps its change', mg.ukr === 'POL', mg);
  check('old German simplified region: nothing invented', mg.frgChanged === 0, mg);
  check('Berlin East carried to the Berlin East shape', mg.gdrB === 'FRG' && mg.gdrBc === 'FRG', mg);
  check('invalid owner ignored', mg.itaRegions === 19, mg);
  check('the user is told what could not be carried over', mg.note.some(x => x.includes('1 provincia della vecchia Germania semplificata non ha')), mg.note);
  check('game restored', mg.nat === 'Italia' && mg.logN >= 3, mg);
  check('no page errors during migration', errors.length === 0, errors);
  await browser.close();

  console.log('— a scenario (a save without a game) and the game buttons');
  const store3 = {};
  ({ browser, page, errors } = await launch({ width: 640, height: 1100, mobile: false, store: store3 }));
  await page.evaluate(() => { window.__t.changeProvinceOwner('URSS_01', 'FIN'); window.__t.changeProvinceController('URSS_01', 'FIN'); });
  await page.click('#saveGameBtn');
  await page.waitForTimeout(150);
  check('without a game «Salva partita» says there is nothing to save, and writes nothing', (await txt('#saveStatus')) === 'Nessuna partita in corso da salvare. Per conservare uno scenario usa «Esporta».' && store3['save/state'] === undefined, [await txt('#saveStatus'), store3]);
  // what the previous version wrote when the button was pressed with no game: a scenario in the slot
  store3['save/state'] = await page.evaluate(() => JSON.parse(JSON.stringify(window.__t.buildSavePayload())));
  const d3 = store3['save/state'];
  check('a scenario is a v3 document with game null and only the changed province', d3 && d3.v === 3 && d3.schemaVersion === 3 && d3.game === null && Object.keys(d3.changes).length === 1, d3);
  await page.evaluate(() => window.__t.changeProvinceOwner('URSS_01', 'URSS'));
  await page.click('#loadGameBtn');
  await page.waitForTimeout(150);
  check('«Carica partita» still reads a scenario from the slot: the territory comes back', await page.evaluate(() => window.__t.provinces.URSS_01.owner === 'FIN'));
  check('and no game starts', await page.evaluate(() => window.__t.getGameMode() === null));
  await browser.close();

  console.log('— a v3 document with junk entries is tolerated');
  const store4 = { 'save/state': { v: 3, changes: { URSS_01: { owner: 'FIN', controller: 'FIN' }, NOPE_1: { owner: 'FIN', controller: 'FIN' }, ITA_01: { owner: 'XXX', controller: 'ITA' }, ITA_02: null }, game: null } };
  ({ browser, page, errors } = await launch({ width: 640, height: 1100, mobile: false, store: store4 }));
  await page.click('#loadGameBtn');
  await page.waitForTimeout(150);
  const j = await page.evaluate(() => ({ u: window.__t.provinces.URSS_01.owner, i1: window.__t.provinces.ITA_01.owner, i2: window.__t.provinces.ITA_02.owner }));
  check('valid entry applied, junk ignored, no crash', j.u === 'FIN' && j.i1 === 'ITA' && j.i2 === 'ITA' && errors.length === 0, [j, errors]);
  await browser.close();

  console.log('— the version a save declares: schemaVersion (v24), else v (older saves)');
  const fin = { URSS_01: { owner: 'FIN', controller: 'FIN' } };
  const cases = [
    ['schemaVersion only (no v)', { schemaVersion: 3, changes: fin, game: null }, 'FIN', 'Partita caricata.'],
    ['v and schemaVersion agree', { v: 3, schemaVersion: 3, changes: fin, game: null }, 'FIN', 'Partita caricata.'],
    ['an older save with v only', { v: 3, changes: fin, game: null }, 'FIN', 'Partita caricata.'],
    ['schemaVersion wins over v: an unknown future version is refused', { v: 3, schemaVersion: 99, changes: fin, game: null }, 'URSS', 'Salvataggio non valido o versione non supportata.'],
    ['schemaVersion 2 reads the old province table', { schemaVersion: 2, provinces: { FRA_MAIN: { owner: 'GBR', controller: 'GBR' } }, game: null }, 'URSS', 'Partita caricata.'],
    ['an unknown v without schemaVersion is refused', { v: 99, changes: {}, game: null }, 'URSS', 'Salvataggio non valido o versione non supportata.'],
  ];
  for (const [name, saved, expectOwner, expectStatus] of cases) {
    ({ browser, page, errors } = await launch({ width: 640, height: 1100, mobile: false, store: { 'save/state': saved } }));
    await page.click('#loadGameBtn');
    await page.waitForTimeout(150);
    const r = await page.evaluate(() => ({ owner: window.__t.provinces.URSS_01.owner, status: document.getElementById('saveStatus').textContent, fra: window.__t.provinces.FRA_01 ? window.__t.provinces.FRA_01.owner : null }));
    check(name, r.owner === expectOwner && r.status === expectStatus && errors.length === 0, [r, errors]);
    await browser.close();
  }
  process.exit(summary() ? 1 : 0);
})();
