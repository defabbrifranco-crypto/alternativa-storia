const { launch, check, summary } = require('./harness');
(async () => {
  console.log('— phone viewport 390x844 with touch');
  const { browser, ctx, page, errors } = await launch({ width: 390, height: 844, mobile: true });
  const txt = sel => page.evaluate(s => document.querySelector(s).textContent, sel);
  const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  check('no horizontal page scroll on a phone', noOverflow, await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]));
  const homeScale = await page.evaluate(() => window.__t.scale);
  check('map opens on Europe (scale ~ VBW / 2085)', Math.abs(homeScale - 5112 / 2085) < 0.01, homeScale);

  // screen position of a point in map units
  const screenOf = (x, y) => page.evaluate(([x, y]) => {
    const svg = document.getElementById('euroSvg'), g = document.getElementById('mapLayer');
    const p = svg.createSVGPoint(); p.x = x; p.y = y; const s = p.matrixTransform(g.getScreenCTM()); return { x: s.x, y: s.y };
  }, [x, y]);
  const label = id => page.evaluate(id => window.MAP_SVG.regionLabels[id], id);

  console.log('— tap on a province at home zoom (a large one: Russia)');
  const ru = await label('URSS_01');
  let sp = await screenOf(ru[0], ru[1]);
  await page.touchscreen.tap(sp.x, sp.y);
  await page.waitForTimeout(100);
  check('tap opens RSFS Russa', (await txt('#pp-name')).startsWith('RSFS Russa'), await txt('#pp-name'));

  console.log('— zoom in on a small region and tap it');
  await page.evaluate(() => window.__t.focusProvince('FRG_09'));    // Saarland
  const sa = await label('FRG_09');
  sp = await screenOf(sa[0], sa[1]);
  const rect = await page.evaluate(() => { const r = document.querySelector('.map-wrap').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  check('focusProvince brings the province to the centre of the map', Math.abs(sp.x - (rect.x + rect.w / 2)) < rect.w * 0.12 && Math.abs(sp.y - (rect.y + rect.h / 2)) < rect.h * 0.15, [sp, rect]);
  await page.touchscreen.tap(sp.x, sp.y);
  await page.waitForTimeout(100);
  check('tap opens Saarland', (await txt('#pp-name')) === 'Saarland', await txt('#pp-name'));

  console.log('— tap on a city disc at the highest zoom');
  await page.evaluate(() => window.__t.focusProvince('POL_21'));
  const wd = await label('POL_21');
  sp = await screenOf(wd[0], wd[1]);
  await page.touchscreen.tap(sp.x, sp.y);
  await page.waitForTimeout(100);
  check('tap opens Varsavia-città (small disc stays tappable)', (await txt('#pp-name')) === 'Varsavia-città', await txt('#pp-name'));
  check('scale at its maximum there', await page.evaluate(() => window.__t.scale) === 24);

  console.log('— a drag does not select');
  await page.evaluate(() => { window.__t.goHome(); });
  const before = await page.evaluate(() => ({ sel: window.__t.getSelectedProvince(), tx: window.__t.tx }));
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i + 1 })) });
  const c0 = await screenOf(1000, 600);
  await touch('touchStart', [[c0.x, c0.y]]);
  for (let i = 1; i <= 6; i++) await touch('touchMove', [[c0.x + i * 15, c0.y]]);
  await touch('touchEnd', []);
  await page.waitForTimeout(100);
  const after = await page.evaluate(() => ({ sel: window.__t.getSelectedProvince(), tx: window.__t.tx }));
  check('the map moved with the finger', after.tx > before.tx + 20, [before, after]);
  check('and no province was selected by the drag', after.sel === before.sel, [before, after]);

  console.log('— pinch to zoom');
  await page.evaluate(() => window.__t.goHome());
  const s0 = await page.evaluate(() => window.__t.scale);
  const mid = await screenOf(1000, 600);
  await touch('touchStart', [[mid.x - 30, mid.y], [mid.x + 30, mid.y]]);
  for (let i = 1; i <= 8; i++) await touch('touchMove', [[mid.x - 30 - i * 10, mid.y], [mid.x + 30 + i * 10, mid.y]]);
  await touch('touchEnd', []);
  await page.waitForTimeout(100);
  const s1 = await page.evaluate(() => window.__t.scale);
  check('pinch out zooms in', s1 > s0 * 1.8, [s0, s1]);
  check('pinch did not select a province', (await page.evaluate(() => window.__t.getSelectedProvince())) === after.sel);

  console.log('— buttons and wheel');
  await page.evaluate(() => window.__t.goHome());
  await page.click('#zoomInBtn'); await page.click('#zoomInBtn');
  const z = await page.evaluate(() => window.__t.scale);
  check('zoom-in button x1.3 twice', Math.abs(z - homeScale * 1.69) < 0.02, z);
  await page.click('#zoomOutBtn');
  await page.click('#worldBtn');
  check('world button: whole canvas', (await page.evaluate(() => [window.__t.scale, window.__t.tx, window.__t.ty])).join() === '1,0,0');
  await page.click('#recenterBtn');
  check('recenter button: back to Europe', Math.abs((await page.evaluate(() => window.__t.scale)) - homeScale) < 0.01);

  console.log('— names appear with zoom, state name steps aside');
  // invariant: a state whose region names are showing never shows its own name as well
  const names = () => page.evaluate(() => {
    const L = window.__t.labelEls;
    const shown = L.filter(l => l.mode > 0);
    const states = {};
    L.forEach(l => { const s = states[l.state] || (states[l.state] = { own: 0, regions: 0 }); if (l.mode > 0) { if (l.region) s.regions++; else s.own++; } });
    const clash = Object.keys(states).filter(k => states[k].own > 0 && states[k].regions > 0);
    return { total: shown.length, regions: shown.filter(l => l.region).length, ownNames: shown.filter(l => !l.region).length, clash,
      visTexts: [...document.querySelectorAll('#mapLayer text')].filter(t => t.style.display !== 'none').length,
      fraOwn: states.FRA ? states.FRA.own : null, fraRegions: states.FRA ? states.FRA.regions : null };
  });
  let n = await names();
  console.log('   home:', n);
  check('at home zoom names show, and no state shows both its name and region names', n.total > 5 && n.clash.length === 0, n);
  await page.evaluate(() => window.__t.focusProvince('FRA_05'));
  n = await names();
  console.log('   zoomed on France:', n);
  check('zoomed on France: region names show and the state name is hidden', n.fraRegions > 0 && n.fraOwn === 0 && n.clash.length === 0, n);
  check('shown text nodes match the labels flagged visible', n.visTexts === n.total, n);
  await page.evaluate(() => window.__t.focusProvince('ITA_07'));
  n = await names();
  check('zoomed on Italy: same invariant', n.clash.length === 0 && n.regions > 3, n);
  await page.click('#worldBtn');
  n = await names();
  check('whole map: same invariant', n.clash.length === 0, n);
  await page.evaluate(() => window.__t.focusProvince('PRT_22'));  // Funchal marker
  n = await names();
  const fun = await page.evaluate(() => { const L = window.__t.labelEls.find(l => l.pt && l.one[0] === 'Funchal'); return L ? { mode: L.mode, y: L.y, ty: L.t1 && L.t1.getAttribute('y') } : null; });
  check('island marker name shown only when zoomed right in, set below the marker', fun && fun.mode === 1 && +fun.ty > fun.y, fun);

  console.log('— selection outline follows the selected province');
  await page.evaluate(() => window.__t.selectProvince('ITA_03'));
  const so = await page.evaluate(() => ({ n: document.querySelectorAll('#mapLayer .sel-outline').length, c: document.querySelectorAll('#mapLayer .sel-casing').length, rings: window.MAP_SVG.provincePolys.ITA_03.length }));
  check('outline = one casing + one stroke per ring', so.n === so.rings && so.c === so.rings, so);

  console.log('— rendering sanity (non-scaling strokes)');
  const css = await page.evaluate(() => { const p = document.querySelector('.province-poly'); const cs = getComputedStyle(p); return { ve: cs.vectorEffect, sw: cs.strokeWidth }; });
  check('province strokes do not scale with zoom', css.ve === 'non-scaling-stroke', css);

  check('no page errors', errors.length === 0, errors);
  await browser.close();
  process.exit(summary() ? 1 : 0);
})();
