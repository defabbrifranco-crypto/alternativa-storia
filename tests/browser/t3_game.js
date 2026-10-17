const { launch, check, summary } = require('./harness');
(async () => {
  const store = {};
  const { browser, page, errors } = await launch({ width: 640, height: 1100, mobile: false, store });
  const txt = sel => page.evaluate(s => document.querySelector(s).textContent, sel);

  console.log('— prompt helpers');
  await page.evaluate(() => window.__t.startFixedScenarioGame('FRG'));
  check('game running in fixed mode', await page.evaluate(() => window.__t.getGameMode() === 'fixed' && window.__t.getMapGameStarted()));
  check('game starts on 31 dicembre 1960', (await txt('#yearLabel')) === '31 dicembre 1960' && (await page.evaluate(() => window.__t.getState().year)) === '31 dicembre 1960', await txt('#yearLabel'));
  const allianceCtx = await page.evaluate(() => { const t = window.__t, o = {}; for (const c of ['KWT', 'CYP', 'OMN', 'SYR']) { t.selectCountry(c); o[c] = t.territoryContext(); } t.selectCountry('FRG'); return o; });
  check('prompt: Kuwait, Cyprus, Oman have alliance "da verificare", no protectorate/colony wording',
    ['KWT', 'CYP', 'OMN'].every(c => allianceCtx[c].includes('(alleanza: da verificare)') && !/protettorat|coloni|influenza/i.test(allianceCtx[c])), allianceCtx);
  check('prompt: Syria unchanged (Non allineata), no mention of the United Arab Republic', allianceCtx.SYR.includes('(alleanza: Non allineata)') && !/Repubblica Araba/i.test(allianceCtx.SYR), allianceCtx.SYR);
  const ctxTxt = await page.evaluate(() => window.__t.territoryContext());
  check('context names the player, alliance and number of territories', ctxTxt.includes('Germania Ovest') && ctxTxt.includes('NATO') && ctxTxt.includes('11 territori') && ctxTxt.includes('Baviera'), ctxTxt);
  const rules = await page.evaluate(() => window.__t.territoryRules('Voglio riunificare la Germania con la RDT'));
  check('rules list own provinces with ids', rules.includes('Territori del giocatore (ID=nome): ') && rules.includes('FRG_02=Baviera'), rules.slice(0, 200));
  check('rules list bordering foreign provinces with owner', rules.includes('Province di altri Stati che confinano') && /GDR_\d\d=[^;\[]+ \[GDR\]/.test(rules));
  check('rules list provinces of the states named in the text', rules.includes('Province degli Stati citati nella scena'));
  check('rules carry country codes and the change schema', rules.includes('URSS=Unione Sovietica') && rules.includes('cambi_territoriali') && rules.includes('al massimo 12'));
  const mc = await page.evaluate(() => ({ a: window.__t.mentionedCountries('Invado l\'Ungheria e poi la Cina'), b: window.__t.mentionedCountries('Trattativa con l\'Unione Sovietica a Mosca'),
    c: window.__t.mentionedCountries('Marcia sulla Germania'), d: window.__t.mentionedCountries('niente di particolare') }));
  check('mentioned countries: Hungary + China', mc.a.includes('HUN') && mc.a.includes('CHN'), mc.a);
  check('mentioned countries: USSR by name', mc.b.includes('URSS'), mc.b);
  check('"Germania" matches only the other German state (player excluded)', mc.c.includes('GDR') && !mc.c.includes('FRG'), mc.c);
  check('nothing mentioned -> nothing', mc.d.length === 0, mc.d);

  console.log('— prompt size for every nation as the player');
  const sizes = await page.evaluate(() => {
    const t = window.__t, out = [];
    for (const c of Object.keys(t.countries)) {
      t.selectCountry(c);
      // select by hand: territoryContext/Rules only need selectedCountryId and mapGameStarted (true)
      out.push([c, t.territoryContext().length + t.territoryRules('').length]);
    }
    t.selectCountry('FRG');
    return out;
  });
  sizes.sort((a, b) => b[1] - a[1]);
  console.log('   largest:', sizes.slice(0, 5).map(x => x.join('=')).join(', '), ' smallest:', sizes[sizes.length - 1].join('='));
  check('every nation: map part of the prompt under 14,000 characters', sizes[0][1] < 14000, sizes[0]);
  const worst = await page.evaluate(() => { const t = window.__t; t.selectCountry('URSS'); return t.territoryRules('Cina Turchia Polonia Iran Giappone Germania').length; });
  console.log('   USSR with six states named:', worst);
  check('worst case with named states under 18,000 characters', worst < 18000, worst);
  await page.evaluate(() => window.__t.selectCountry('FRG'));

  console.log('— validation of territory changes');
  const geo = await page.evaluate(() => {
    const t = window.__t, P = t.provinces;
    const gdr = Object.keys(P).filter(i => P[i].owner === 'GDR');
    const border = gdr.filter(i => P[i].neighbors.some(n => P[n].owner === 'FRG'));
    const inner = gdr.filter(i => !P[i].neighbors.some(n => P[n].owner === 'FRG'));
    // a chain: inner province B that touches a border province A
    let A = null, B = null;
    for (const a of border) { const b = inner.find(x => P[a].neighbors.includes(x)); if (b) { A = a; B = b; break; } }
    return { border, inner, A, B };
  });
  console.log('   GDR provinces next to FRG:', geo.border.length, ' inner:', geo.inner.length, ' chain:', geo.A, '<-', geo.B);
  check('the map has both border and inner GDR provinces', geo.border.length >= 3 && geo.inner.length >= 3 && geo.A && geo.B, geo);
  const reset = () => page.evaluate(() => { for (const id in window.__t.initialTerritory) { window.__t.provinces[id].owner = window.__t.initialTerritory[id].owner; window.__t.provinces[id].controller = window.__t.initialTerritory[id].controller; } });
  const apply = (list) => page.evaluate(l => { const lines = window.__t.applyTerritoryChanges(l); return { lines, own: Object.fromEntries(l.filter(x => x && window.__t.provinces[x.provincia]).map(x => [x.provincia, window.__t.provinces[x.provincia].owner + '/' + window.__t.provinces[x.provincia].controller])) }; }, list);
  let r = await apply([{ provincia: geo.A, nuovo_proprietario: 'FRG' }]);
  check('a province on the border passes to the neighbouring state (owner and controller)', r.own[geo.A] === 'FRG/FRG' && r.lines.length === 1 && r.lines[0].includes('da Germania Est a Germania Ovest'), r);
  await reset();
  r = await apply([{ provincia: geo.B, nuovo_proprietario: 'FRG' }]);
  check('an inner province is refused (no border with that state) and reported', r.own[geo.B] === 'GDR/GDR' && r.lines.length === 1 && r.lines[0].startsWith('⚠️ Non applicato'), r);
  await reset();
  r = await apply([{ provincia: geo.B, nuovo_proprietario: 'FRG' }, { provincia: geo.A, nuovo_proprietario: 'FRG' }]);
  check('order does not matter: border first opens the way to the inner one (several passes)', r.own[geo.A] === 'FRG/FRG' && r.own[geo.B] === 'FRG/FRG' && r.lines.length === 2 && !r.lines.some(l => l.startsWith('⚠️')), r);
  await reset();
  r = await apply([{ provincia: 'URSS_01', nuovo_proprietario: 'PRT' }]);
  check('a far-away transfer to an unrelated state is refused', r.own.URSS_01 === 'URSS/URSS' && r.lines[0].startsWith('⚠️'), r);
  r = await apply([{ provincia: 'NOPE_01', nuovo_proprietario: 'FRG' }, { provincia: geo.A, nuovo_proprietario: 'ZZZ' }, { provincia: geo.A, nuovo_proprietario: 'GDR' }, null, 5, {}]);
  check('unknown ids, unknown owners, same owner and junk are ignored silently', r.lines.length === 0, r);
  r = await page.evaluate(() => window.__t.applyTerritoryChanges('not an array'));
  check('non-array input is ignored', Array.isArray(r) && r.length === 0, r);
  r = await apply([{ provincia: geo.A, nuovo_proprietario: 'FRG' }, { provincia: geo.A, nuovo_proprietario: 'FRG' }]);
  check('the same province twice is applied once', r.lines.length === 1, r);
  await reset();
  // more than the cap
  const many = await page.evaluate(() => {
    const t = window.__t, P = t.provinces;
    const fr = Object.keys(P).filter(i => P[i].owner === 'FRA');
    return fr.map(id => ({ provincia: id, nuovo_proprietario: 'BEL' }));
  });
  const capped = await page.evaluate(l => { window.__t.selectCountry('BEL'); const x = window.__t.applyTerritoryChanges(l); const moved = Object.keys(window.__t.provinces).filter(i => window.__t.provinces[i].owner === 'BEL' && i.startsWith('FRA_')).length; return { lines: x.length, moved }; }, many);
  console.log('   cap test:', capped, 'of', many.length, 'offered');
  check('no more than 12 changes per turn', capped.moved <= 12 && capped.moved >= 1, capped);
  await reset(); await page.evaluate(() => window.__t.selectCountry('FRG'));

  console.log('— a turn through the interface');
  await page.evaluate(({ A }) => { window.__queue.push({ evento_titolo: 'Svolta a Suhl', narrativa: 'Le truppe occidentali passano il confine.', riepilogo_mondo: 'Suhl è passata alla RFT.', nuovo_anno: 'gennaio 1961', stabilita: 60, economia: 52, esercito: 61, prestigio: 58,
      cambi_territoriali: [{ provincia: A, nuovo_proprietario: 'FRG' }, { provincia: 'XX_99', nuovo_proprietario: 'FRG' }] }); }, geo);
  await page.fill('#actionInput', 'Avanzo verso la Germania Est');
  await page.click('#actBtn');
  await page.waitForFunction(() => document.getElementById('thinking').classList.contains('hidden') && document.querySelector('#log .entry-terr'));
  const turn = await page.evaluate(({ A }) => ({ owner: window.__t.provinces[A].owner, ctl: window.__t.provinces[A].controller, terr: [...document.querySelectorAll('#log .entry-terr')].map(e => e.textContent),
      year: document.getElementById('yearLabel').textContent, prompt: window.__prompts[window.__prompts.length - 1], saved: document.getElementById('saveStatus').textContent }), geo);
  check('the province changed on the map', turn.owner === 'FRG' && turn.ctl === 'FRG', turn);
  check('the log reports the change, and only the valid one', turn.terr.length === 1 && turn.terr[0].includes('da Germania Est a Germania Ovest') && !turn.terr[0].includes('XX_99'), turn.terr);
  check('year updated', turn.year === 'gennaio 1961');
  check('the prompt had the map part, the schema and the action', turn.prompt.includes('Territori del giocatore') && turn.prompt.includes('"cambi_territoriali"') && turn.prompt.includes('Avanzo verso la Germania Est'), turn.prompt.slice(0, 300));
  check('the prompt gives the starting date 31 dicembre 1960', turn.prompt.includes('Data attuale: 31 dicembre 1960'), turn.prompt.slice(0, 200));
  check('prompt size is moderate', turn.prompt.length < 9000, turn.prompt.length);
  const saved = await page.evaluate(() => null); // read the store from node
  await page.waitForTimeout(100);
  const doc = store['save/state'];
  check('autosave wrote a v3 document with only the changed province', doc && doc.v === 3 && Object.keys(doc.changes).length === 1 && doc.changes[geo.A].owner === 'FRG' && !doc.provinces, doc && { v: doc.v, changes: Object.keys(doc.changes || {}) });
  check('autosave status shown', (await txt('#saveStatus')) === 'Salvata automaticamente.', await txt('#saveStatus'));
  check('the saved document includes the game', doc.game && doc.game.mode === 'fixed' && doc.game.nation === 'Germania Ovest' && doc.game.log.length >= 2, doc.game && { mode: doc.game.mode, n: doc.game.log.length });

  console.log('— advisor');
  await page.click('#advisorBtn');
  await page.waitForFunction(() => document.getElementById('thinking').classList.contains('hidden') && document.querySelector('#log .entry-advisor'));
  const adv = await page.evaluate(() => window.__prompts[window.__prompts.length - 1]);
  check('advisor prompt has the territory context', adv.includes('Il giocatore guida Germania Ovest') && adv.includes('possiede 12 territori'), adv.slice(0, 250));

  console.log('— game over');
  const own = await page.evaluate(() => window.__t.getCountryProvinces('FRG'));
  await page.evaluate(ids => { for (const id of ids.slice(1)) { window.__t.changeProvinceOwner(id, 'GDR'); window.__t.changeProvinceController(id, 'GDR'); } }, own);   // a real loss: sovereignty and control both
  await page.evaluate(id => window.__t.selectProvince(id), own[0]);
  await page.selectOption('#pp-transferSelect', 'GDR');
  await page.click('#pp-transferBtn');
  const over = await page.evaluate(() => ({ log: document.getElementById('log').textContent, act: document.getElementById('actBtn').disabled }));
  check('losing the last territory ends the game', over.log.includes('la partita è finita') && over.act === true, over);

  console.log('— new game resets the map');
  await page.click('#newGameBtn');
  const rs = await page.evaluate(() => { const t = window.__t; let diff = 0; for (const id in t.initialTerritory) if (t.provinces[id].owner !== t.initialTerritory[id].owner || t.provinces[id].controller !== t.initialTerritory[id].controller) diff++; return { diff, mode: t.getGameMode(), playing: document.getElementById('playingAs').textContent, panelHidden: document.getElementById('provincePanel').classList.contains('hidden'), sel: document.querySelectorAll('#mapLayer .sel-outline').length, mine: document.querySelectorAll('.province-poly.mine').length }; });
  check('every province back to the 1960 owner and controller', rs.diff === 0, rs);
  check('game mode cleared, panel closed, selection outline gone, nothing highlighted', rs.mode === null && rs.panelHidden && rs.sel === 0 && rs.mine === 0 && rs.playing === 'Nessuna nazione selezionata.', rs);

  console.log('— free scenario does not send map data');
  await page.fill('#nation', 'Impero Romano'); await page.fill('#startYear', '400 d.C.');
  await page.click('#startBtn');
  await page.fill('#actionInput', 'Rinforzo il Reno');
  await page.click('#actBtn');
  await page.waitForFunction(() => document.getElementById('thinking').classList.contains('hidden') && document.querySelectorAll('#log .entry-narr').length >= 1);
  const fp = await page.evaluate(() => window.__prompts[window.__prompts.length - 1]);
  check('free-mode prompt has no territory block and no schema extra', !fp.includes('Territori del giocatore') && !fp.includes('cambi_territoriali') && fp.includes('Impero Romano'), fp.slice(0, 200));

  check('no page errors', errors.length === 0, errors);
  await browser.close();
  process.exit(summary() ? 1 : 0);
})();
