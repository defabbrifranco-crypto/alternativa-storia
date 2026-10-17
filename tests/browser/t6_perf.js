const { launch, check, summary } = require('./harness');
(async () => {
  const t0 = Date.now();
  const { browser, page, errors } = await launch({ width: 390, height: 844, mobile: true });
  console.log('load + ready ms:', Date.now() - t0);
  const nav = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) }; });
  console.log('navigation timing (ms):', nav);
  const r = await page.evaluate(async () => {
    const t = window.__t, out = {};
    const time = (name, fn, n) => { const a = performance.now(); for (let i = 0; i < n; i++) fn(i); out[name] = +((performance.now() - a) / n).toFixed(2); };
    time('updateLabels@home (ms/call)', () => t.updateLabels(), 50);
    t.focusProvince('FRA_05');
    time('updateLabels@France-zoom (ms/call)', () => t.updateLabels(), 50);
    time('selectProvince (ms/call)', i => t.selectProvince(['FRA_01', 'FRA_02', 'ITA_03', 'ESP_10'][i % 4]), 40);
    time('selectCountry (ms/call)', i => t.selectCountry(['FRA', 'ITA', 'ESP', 'TUR'][i % 4]), 40);
    time('territoryRules (ms/call)', () => t.territoryRules('Germania Polonia Cina'), 40);
    const nodes = document.getElementsByTagName('*').length;
    out.domNodes = nodes;
    out.heapMB = performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null;
    return out;
  });
  console.log(r);
  check('label update under 3 ms at the highest zoom', r['updateLabels@France-zoom (ms/call)'] < 3, r);
  check('selecting a province under 15 ms', r['selectProvince (ms/call)'] < 15, r);
  check('DOM size reasonable (< 5000 nodes)', r.domNodes < 5000, r.domNodes);
  // frame cost while pinching: dispatch many zoom steps
  const f = await page.evaluate(async () => {
    const a = performance.now();
    for (let i = 0; i < 60; i++) { document.getElementById('zoomInBtn').click(); document.getElementById('zoomOutBtn').click(); }
    return +((performance.now() - a) / 120).toFixed(2);
  });
  console.log('ms per zoom step (button clicks, includes label update):', f);
  check('zoom step under 8 ms', f < 8, f);
  check('no errors', errors.length === 0, errors);
  await browser.close();
  process.exit(summary() ? 1 : 0);
})();
