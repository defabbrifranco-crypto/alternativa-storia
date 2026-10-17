// Labels: no name over another name, no name over another city or island shape, capitals named where the room allows.
const { launch, check, summary } = require('./harness');
const scan = async (page) => page.evaluate(() => {
  const t = window.__t;
  const texts = () => [...document.querySelectorAll('#mapLayer text')].filter(x => x.style.display !== 'none');
  const ptIds = Object.keys(t.provinces).filter(id => t.provinces[id].region && t.provinces[id].region.kind !== 'cell');
  const bad = { names: 0, shapesPt: 0, shapesRegion: 0 };
  const probe = () => {
    const sv = document.getElementById('euroSvg').getBoundingClientRect();     // only what is on the map counts
    const clip = r => ({ left: Math.max(r.left, sv.left), right: Math.min(r.right, sv.right), top: Math.max(r.top, sv.top), bottom: Math.min(r.bottom, sv.bottom), width: Math.min(r.right, sv.right) - Math.max(r.left, sv.left) });
    const kindOf = x => { const L = t.labelEls.find(l => l.t1 === x || l.t2 === x); return L ? (L.pt ? 'pt' : L.region ? 'region' : 'state') : '?'; };
    const xs = texts().map(x => ({ n: x.textContent, kind: kindOf(x), r: clip(x.getBoundingClientRect()) })).filter(o => o.r.width > 0);
    const discs = ptIds.map(id => ({ n: (t.provinceEls[id][0].querySelector('title') || {}).textContent, rs: t.provinceEls[id].map(e => clip(e.getBoundingClientRect())) }));
    for (let i = 0; i < xs.length; i++) {
      for (let j = i + 1; j < xs.length; j++) {
        const a = xs[i].r, b = xs[j].r;
        if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2) bad.names++;
      }
      for (const d of discs) {
        for (const r of d.rs) {
          const a = xs[i].r;
          // a city's or island's name stands beside shapes, never over one; a region name keeps off them unless it has no other place (state names, drawn far out where shapes are dots, are not counted)
          if (xs[i].kind !== 'state' && r.width > 0 && Math.min(a.right, r.right) - Math.max(a.left, r.left) > 1.5 && Math.min(a.bottom, r.bottom) - Math.max(a.top, r.top) > 1.5) bad[xs[i].kind === 'pt' ? 'shapesPt' : 'shapesRegion']++;
        }
      }
    }
  };
  let views = 0;
  for (const c of Object.keys(t.countries)) { t.goHome(); t.focusCountry(c); probe(); views++; }
  const ids = Object.keys(t.provinces).filter(id => t.provinces[id].region);
  ids.forEach((id, i) => { if (i % 8) return; t.goHome(); t.focusProvince(id); probe(); views++; });
  t.labelEls.forEach((L, i) => { if (i % 12) return; [2, 5, 10, 24].forEach(s => { t.setView(L.x, L.y, s); probe(); views++; }); });
  t.goHome();
  return { views, ...bad };
});
(async () => {
  for (const [w, h, mobile] of [[390, 844, true], [1280, 800, false]]) {
    console.log('— ' + w + 'px');
    const { browser, page, errors } = await launch({ width: w, height: h, mobile });
    const r = await scan(page);
    console.log(r);
    check(w + 'px: no name over another name in ' + r.views + ' views', r.names === 0, r);
    check(w + 'px: no city or island name over any shape', r.shapesPt === 0, r);
    check(w + 'px: region names over a shape only as a last resort (at most 3 of ' + r.views + ' views)', r.shapesRegion <= 3, r);
    const q = await page.evaluate(() => {
      const t = window.__t;
      const vis = () => new Set([...document.querySelectorAll('#mapLayer text')].filter(x => x.style.display !== 'none').map(x => x.textContent));
      const out = {};
      t.goHome(); t.focusCountry('HUN'); out.HUN = vis().has('Budapest');
      t.goHome(); t.focusCountry('POL'); const p = vis(); out.POL = p.has('Varsavia-città') && p.has('Poznań-città');
      t.goHome(); t.focusCountry('GDR'); out.GDR = vis().has('Berlino Ovest');
      // every visible name has a measured width; the number of visible texts is the number of names wanted
      t.goHome(); t.focusCountry('FRA');
      const wanted = t.labelEls.filter(L => L.want);
      out.measured = wanted.every(L => (L.want === 2 ? L.m2 : L.m1) > 0);
      out.sameCount = vis().size === new Set(wanted.map(L => L.want === 2 ? L.two.join('') : L.one[0])).size || document.querySelectorAll('#mapLayer text').length > 0;
      const shown = () => [...document.querySelectorAll('#mapLayer text')].filter(x => x.style.display !== 'none').length;
      const a = shown(); t.updateLabels(); const b = shown(); t.updateLabels(); const c = shown();
      out.stable = a === b && b === c;
      out.textsMatchWanted = shown() === t.labelEls.filter(L => L.want).length;
      return out;
    });
    console.log(q);
    check(w + 'px: Budapest named in the Hungary view', q.HUN, q);
    check(w + 'px: Varsavia-città and Poznań-città named in the Poland view', q.POL, q);
    check(w + 'px: Berlino Ovest named in the GDR view', q.GDR, q);
    check(w + 'px: every name drawn has its measured width', q.measured, q);
    check(w + 'px: visible texts = names wanted; recomputing changes nothing', q.textsMatchWanted && q.stable, q);
    check(w + 'px: no page errors', errors.length === 0, errors);
    await browser.close();
  }
  process.exit(summary() ? 1 : 0);
})();
