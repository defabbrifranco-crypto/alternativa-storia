const { launch, check, summary } = require('./harness');
(async () => {
  const { browser, page, errors } = await launch({ width: 640, height: 900, mobile: false });
  console.log('— load & structure');
  check('no errors on load', errors.length === 0, errors);
  const r = await page.evaluate(() => {
    const t = window.__t, ids = Object.keys(t.provinces);
    const polys = document.querySelectorAll('#mapLayer .province-poly');
    const withoutEl = ids.filter(id => !t.provinceEls[id] || !t.provinceEls[id].length);
    const noNb = ids.filter(id => !t.provinces[id].neighbors.length);
    let asym = 0;
    ids.forEach(a => t.provinces[a].neighbors.forEach(b => { if (!t.provinces[b]) asym += 1000; else if (!t.provinces[b].neighbors.includes(a)) asym++; }));
    const dataIds = new Set([...polys].map(p => p.dataset.id));
    const byOwner = {}; ids.forEach(id => { const o = t.provinces[id].owner; byOwner[o] = (byOwner[o] || 0) + 1; });
    const badOwner = ids.filter(id => !t.countries[t.provinces[id].owner]);
    const labels = t.labelEls.length;
    return { n: ids.length, polys: polys.length, uniqueDataIds: dataIds.size, withoutEl: withoutEl.length, noNb: noNb.length, asym,
             badOwner: badOwner.length, labels, ITA: byOwner.ITA, FRA: byOwner.FRA, URSS: byOwner.URSS, TUR: byOwner.TUR, THA: byOwner.THA, GBR: byOwner.GBR,
             viewBox: document.getElementById('euroSvg').getAttribute('viewBox'), VBW: t.VBW,
             texts: document.querySelectorAll('#mapLayer text').length, titles: document.querySelectorAll('#mapLayer polygon > title').length };
  });
  console.log(r);
  check('1020 provinces', r.n === 1020, r.n);
  check('every province has polygon element(s) with data-id', r.withoutEl === 0 && r.uniqueDataIds === 1020, r);
  check('polygon count >= 1020', r.polys >= 1020, r.polys);
  check('every province has neighbours', r.noNb === 0, r.noNb);
  check('adjacency symmetric and valid', r.asym === 0, r.asym);
  check('all owners are known countries', r.badOwner === 0);
  check('ITA 19, FRA 21, URSS 20, TUR 65, THA 69, GBR 4', r.ITA === 19 && r.FRA === 21 && r.URSS === 20 && r.TUR === 65 && r.THA === 69 && r.GBR === 4, r);
  check('viewBox widened for the Azores', r.viewBox === '0 0 5112 2058' && r.VBW === 5112, r);
  check('labels: 83 states + 984 regions', r.labels === 83 + 984, r.labels);
  check('text nodes created lazily (far fewer than labels at start)', r.texts < 400, r.texts);
  const hd = await page.evaluate(() => ({ title: document.querySelector('#fixedScenarioPanel .section-title').textContent, pageTitle: document.title,
    legend: [...document.querySelectorAll('#fixedScenarioPanel .legend:not(.legend-own) span')].map(s => s.textContent.trim()),
    colours: ['KWT', 'CYP', 'OMN', 'QAT'].map(c => window.__t.countries[c].color + '/' + window.__t.countries[c].alliance) }));
  check('scenario title: 31 dicembre 1960', hd.title === 'Scenario fisso — Europa, 31 dicembre 1960', hd.title);
  check('page title unchanged', hd.pageTitle === 'Storia Alternativa — prototipo', hd.pageTitle);
  check('legend: 4 families + "Alleanza da verificare"', hd.legend.length === 5 && hd.legend[3] === 'Colonie e protettorati' && hd.legend[4] === 'Alleanza da verificare', hd.legend);
  check('Kuwait/Cyprus/Oman: alliance da verificare, grey; Qatar (protectorate in the sheet) unchanged', hd.colours.join(' ') === '#9a9ea0/da verificare #aeb2b4/da verificare #858b8e/da verificare #b1a680/Protettorato britannico', hd.colours);
  await browser.close();
  process.exit(summary() ? 1 : 0);
})();
