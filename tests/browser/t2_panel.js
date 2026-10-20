const { launch, check, summary } = require('./harness');
(async () => {
  const { browser, page, errors } = await launch({ width: 640, height: 1100, mobile: false });
  const txt = sel => page.evaluate(s => document.querySelector(s).textContent, sel);
  const vis = sel => page.evaluate(s => !document.querySelector(s).classList.contains('hidden'), sel);
  const idOf = (name, state) => page.evaluate(([n, s]) => Object.keys(window.__t.provinces).find(id => window.__t.provinces[id].name === n && (!s || window.__t.provinces[id].owner === s)), [name, state]);

  console.log('— country selection');
  await page.evaluate(() => window.__t.selectCountry('ITA'));
  check('playing-as text', (await txt('#playingAs')) === 'Stai giocando come: Italia');
  const mine = await page.evaluate(() => ({ n: window.__t.getCountryProvinces('ITA').length, dom: document.querySelectorAll('.province-poly.mine').length,
    expectEls: window.__t.getCountryProvinces('ITA').reduce((a, id) => a + window.__t.provinceEls[id].length, 0) }));
  check('ITA has 19 regions, all highlighted as mine', mine.n === 19 && mine.dom === mine.expectEls, mine);

  console.log('— region panel (Italy: Lombardia)');
  const lom = await idOf('Lombardia', 'ITA');
  check('Lombardia exists', !!lom, lom);
  await page.evaluate(id => window.__t.selectProvince(id), lom);
  check('panel visible', await vis('#provincePanel'));
  check('name', (await txt('#pp-name')) === 'Lombardia');
  check('owner Italia / controller Italia', (await txt('#pp-owner')) === 'Italia' && (await txt('#pp-controller')) === 'Italia');
  check('unit type row shown', (await vis('#pp-type-row')) && (await txt('#pp-type')).length > 3, await txt('#pp-type'));
  check('capital da verificare', (await txt('#pp-capital')) === 'da verificare');
  check('own population da verificare', (await txt('#pp-population')) === 'da verificare');
  check('state population row shows Italy 50.198.000', (await vis('#pp-statepop-row')) && (await txt('#pp-statepop')) === 'Italia: 50.198.000', await txt('#pp-statepop'));
  check('state-pop label is "Popolazione dello Stato"', (await txt('#pp-statepop-label')) === 'Popolazione dello Stato');
  check('source note present', (await txt('#pp-popnote')).includes('Fonte: Maddison'), await txt('#pp-popnote'));
  check('ratings marked provvisorio', (await txt('#pp-infra')).includes('provvisorio') && (await txt('#pp-stability')).includes('provvisorio') && (await txt('#pp-strategic')).includes('provvisorio'));
  check('units nessuna', (await txt('#pp-units')) === 'nessuna');
  check('method + shape rows shown', (await vis('#pp-method-row')) && (await vis('#pp-shape-row')) && (await txt('#pp-shape')).includes('approssimato'), [await txt('#pp-method'), await txt('#pp-shape')]);
  const det = await page.evaluate(() => document.getElementById('pp-detbody').textContent);
  check('details: level of subdivision + 31 dicembre 1960', det.includes('Livello considerato per Italia') && det.includes('31 dicembre 1960') && det.includes('19 regioni costituzionali'), det.slice(0, 300));
  check('details visible and collapsed by default', await page.evaluate(() => { const d = document.getElementById('pp-det'); return !d.classList.contains('hidden') && !d.open; }));
  const nbN = await page.evaluate(() => document.querySelectorAll('#pp-neighbors .chip').length);
  check('neighbour chips shown', nbN >= 3, nbN);
  // tapping a chip opens that neighbour and keeps the map consistent
  const nbInfo = await page.evaluate(() => { const b = document.querySelector('#pp-neighbors .chip'); const label = b.textContent; b.click(); return { label, sel: window.__t.getSelectedProvince(), name: window.__t.provinces[window.__t.getSelectedProvince()].name }; });
  check('chip opens the neighbour', nbInfo.label.startsWith(nbInfo.name) && nbInfo.sel !== lom, nbInfo);
  check('selection outline drawn for the new province', await page.evaluate(() => document.querySelectorAll('#mapLayer .sel-outline').length >= 1));

  console.log('— Pakistan: wing figures');
  const pak3 = await idOf('Bahawalpur', 'PAK'), pak15 = await idOf('Chittagong', 'PAK');
  await page.evaluate(id => window.__t.selectProvince(id), pak3);
  check('West wing label', (await txt('#pp-statepop-label')) === "Popolazione dell'ala");
  check('West wing figure as provided', (await txt('#pp-statepop')) === 'Pakistan (Stato sovrano): 45.928.000', await txt('#pp-statepop'));
  check('wing note says whole wing', (await txt('#pp-popnote')).includes("intera ala"), await txt('#pp-popnote'));
  await page.evaluate(id => window.__t.selectProvince(id), pak15);
  check('East wing figure as provided', (await txt('#pp-statepop')) === 'Bangladesh (Pakistan Orientale (non Stato sovrano)): 50.980.000', await txt('#pp-statepop'));
  check('Pakistan divisions have no own population', await page.evaluate(() => Object.keys(window.__t.provinces).filter(i => i.startsWith('PAK_')).every(i => window.__t.provinces[i].population == null)));
  const pakDet = await page.evaluate(() => document.getElementById('pp-detbody').textContent);
  check('Pakistan details list undrawn units and containers', pakDet.includes('Kalat') && pakDet.includes('Dacca') && pakDet.includes('Pakistan Occidentale'), pakDet.slice(0, 400));

  console.log('— single-province states keep their behaviour');
  await page.evaluate(() => window.__t.selectProvince('YEM_MAIN'));
  check('Yemen parts shown, not summed', (await txt('#pp-statepop')).includes('Yemen (Stato sovrano): 5.168.000') && (await txt('#pp-statepop')).includes('Yemen del Sud'), await txt('#pp-statepop'));
  check('Yemen: why not subdivided', (await page.evaluate(() => document.getElementById('pp-detbody').textContent)).includes('Perché non è suddiviso'));
  check('Yemen: no region rows', !(await vis('#pp-type-row')) && !(await vis('#pp-method-row')));
  await page.evaluate(() => window.__t.selectProvince('SYR_MAIN'));
  check('Syria own population 4.574.000', (await txt('#pp-population')) === '4.574.000', await txt('#pp-population'));
  await page.evaluate(() => window.__t.selectProvince('UKR_MAIN'));
  check('Ukraine (kept single) still has the Soviet-republic note', (await txt('#pp-units')).includes('Repubblica sovietica'));

  console.log('— Kuwait, Cyprus, Oman, South Yemen, Syria: only the status of the data sheet');
  // whole panel text, collapsed notes included: nothing about a protectorate, colony, United Arab Republic or Aden
  const panelText = () => page.evaluate(() => document.getElementById('provincePanel').textContent);
  const conflicting = /protettorat|coloni|Repubblica Araba|\bRAU\b|Aden|influenza britannica|mandato/i;
  const cypId = await page.evaluate(() => window.__t.REGION_UNITS.find(u => u[2] === 'CYP')[0]);
  for (const [label, id, pop] of [['Kuwait', 'KWT_MAIN', '321.000'], ['Oman', 'OMN_MAIN', '552.000'], ['Syria', 'SYR_MAIN', '4.574.000']]) {
    await page.evaluate(i => window.__t.selectProvince(i), id);
    check(label + ': own population as in the sheet', (await txt('#pp-population')) === pop, await txt('#pp-population'));
    check(label + ': status of the sheet "Stato sovrano"', (await txt('#pp-popnote')).includes('Status nel 1960: Stato sovrano'), await txt('#pp-popnote'));
    check(label + ': no unit/historical note of mine', (await txt('#pp-units')) === 'nessuna', await txt('#pp-units'));
    check(label + ': nothing about protectorate, colony, UAR, Aden anywhere in the panel', !conflicting.test(await panelText()), (await panelText()).match(conflicting));
  }
  await page.evaluate(() => window.__t.selectProvince('YEM_MAIN'));
  check('South Yemen: status of the sheet next to its figure', (await txt('#pp-statepop')).includes('Yemen del Sud (Stato sovrano): 1.000.000'), await txt('#pp-statepop'));
  check('Yemen: the only unit note says the map does not tell north from south', (await txt('#pp-units')).includes('non sono distinti sulla mappa'), await txt('#pp-units'));
  check('Yemen: nothing about protectorate, colony, Aden anywhere in the panel', !conflicting.test(await panelText()), (await panelText()).match(conflicting));
  await page.evaluate(i => window.__t.selectProvince(i), cypId);
  check('Cyprus (a district): state figure and status of the sheet', (await txt('#pp-statepop')) === 'Cipro: 573.000' && (await txt('#pp-popnote')).includes('Status nel 1960: Stato sovrano'), [await txt('#pp-statepop'), await txt('#pp-popnote')]);
  const cypDet = await page.evaluate(() => document.getElementById('pp-detbody').textContent);
  check('Cyprus: file level kept, my colonial note gone', cypDet.includes('6 distretti') && !cypDet.includes('Estensione dello Stato'), cypDet.slice(0, 300));
  check('Cyprus: nothing about protectorate, colony anywhere in the panel', !conflicting.test(await panelText()), (await panelText()).match(conflicting));

  console.log('— special shapes and inherited notes');
  await page.evaluate(() => window.__t.selectProvince('FRG_11'));
  check('West Berlin units note', (await txt('#pp-units')).includes('Guarnigioni alleate'), await txt('#pp-units'));
  check('West Berlin hand-drawn', (await txt('#pp-shape')).includes('disegnata a mano'), await txt('#pp-shape'));
  const ru = await idOf('RSFS Russa (parte europea)', 'URSS');
  await page.evaluate(id => window.__t.selectProvince(id), ru);
  const ruDet = await page.evaluate(() => document.getElementById('pp-detbody').textContent);
  check('USSR details carry the RSFSR extent note', ruDet.includes('Rappresenta il territorio della Russia') && ruDet.includes('Estensione dello Stato'), ruDet.slice(0, 300));
  check('USSR population: state figure only', (await txt('#pp-statepop')).includes('Unione Sovietica: 213.780.000'), await txt('#pp-statepop'));
  const mag = await idOf('Madeira', null) || await idOf('Funchal', 'PRT');
  await page.evaluate(id => window.__t.selectProvince(id), mag);
  check('Funchal marker described as conventional', (await txt('#pp-shape')).includes('marcatore convenzionale'), await txt('#pp-shape'));

  console.log('— hand a province over from the card (scenario editor)');
  const ch = await idOf('Vaud', 'CHE') || (await page.evaluate(() => Object.keys(window.__t.provinces).find(i => i.startsWith('CHE_'))));
  await page.evaluate(id => window.__t.selectProvince(id), ch);
  const shown = ids => page.evaluate(l => l.map(i => document.getElementById(i).offsetParent !== null), ids);
  check('in «Gioco» the card has no editing controls', (await shown(['pp-transferSelect', 'pp-transferBtn', 'pp-controlBtn', 'pp-markerBtn'])).every(v => v === false), await shown(['pp-transferSelect', 'pp-transferBtn', 'pp-controlBtn', 'pp-markerBtn']));
  await page.click('#modeEditBtn');
  check('in the editor the controls appear', (await shown(['pp-transferSelect', 'pp-transferBtn', 'pp-controlBtn', 'pp-markerBtn'])).every(v => v === true));
  await page.selectOption('#pp-transferSelect', 'FRA');
  await page.click('#pp-transferBtn');
  const after = await page.evaluate(id => ({ o: window.__t.provinces[id].owner, c: window.__t.provinces[id].controller, fill: window.__t.provinceEls[id][0].getAttribute('fill'), fra: window.__t.countries.FRA.color, own: document.getElementById('pp-owner').textContent }), ch);
  check('owner and controller changed, map recoloured, panel refreshed', after.o === 'FRA' && after.c === 'FRA' && after.fill === after.fra && after.own === 'Francia', after);
  const homeC = await txt('#pp-statepop');
  check('state population still that of the home state (Switzerland)', homeC.startsWith('Svizzera'), homeC);

  check('no page errors', errors.length === 0, errors);
  await browser.close();
  process.exit(summary() ? 1 : 0);
})();
