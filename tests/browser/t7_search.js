const { launch, check, summary } = require('./harness');
(async () => {
  let { browser, page, errors } = await launch({ width: 640, height: 1100, mobile: false });
  const txt = sel => page.evaluate(s => document.querySelector(s).textContent, sel);
  const vis = sel => page.evaluate(s => !document.querySelector(s).classList.contains('hidden'), sel);
  const rows = () => page.evaluate(() => [...document.querySelectorAll('#terrResults .search-item')].map(b => [b.children[0].textContent, b.children[1].textContent]));
  const idOf = (name, state) => page.evaluate(([n, s]) => Object.keys(window.__t.provinces).find(id => window.__t.provinces[id].name === n && (!s || window.__t.provinces[id].owner === s)), [name, state]);
  // where the view is, in map units: the box of the map the screen shows
  const view = () => page.evaluate(() => { const t = window.__t, r = document.getElementById('euroSvg').getBoundingClientRect(), vh = t.VBW * r.height / r.width;
    return { x0: -t.tx / t.scale, x1: (t.VBW - t.tx) / t.scale, y0: (1029 - vh / 2 - t.ty) / t.scale, y1: (1029 + vh / 2 - t.ty) / t.scale, scale: t.scale }; });
  const inView = (v, b) => b.x0 >= v.x0 - 1 && b.x1 <= v.x1 + 1 && b.y0 >= v.y0 - 1 && b.y1 <= v.y1 + 1;
  // how much of the screen the box takes along its tighter side (0..1)
  const fill = (v, b) => Math.max((b.x1 - b.x0) / (v.x1 - v.x0), (b.y1 - b.y0) / (v.y1 - v.y0));

  console.log('— structure');
  const st = await page.evaluate(() => { const i = document.getElementById('terrSearch'); return { type: i.type, role: i.getAttribute('role'), label: i.getAttribute('aria-label'), exp: i.getAttribute('aria-expanded'), fs: getComputedStyle(i).fontSize,
    hidden: document.getElementById('terrResults').classList.contains('hidden'), sub: document.querySelector('#fixedScenarioPanel .sub').textContent,
    before: i.compareDocumentPosition(document.querySelector('.map-wrap')) & Node.DOCUMENT_POSITION_FOLLOWING }; });
  check('search input above the map, accessible, list hidden at start', st.type === 'search' && st.role === 'combobox' && st.label && st.exp === 'false' && st.hidden && st.before, st);
  check('input is 16px (a phone does not zoom the page on focus)', st.fs === '16px', st.fs);
  check('intro text mentions the search', st.sub.includes('cercalo per nome'), st.sub);

  console.log('— names are folded');
  const f = await page.evaluate(() => ['Chișinău', 'Łódź', 'Đà Nẵng', "Sana'a", 'Reykjavík', 'Mazar-i-Sharif/Turkestan', 'Ærø'].map(window.__t.foldName));
  check('fold: accents, special letters, apostrophes, punctuation', f.join('|') === 'chisinau|lodz|da nang|sanaa|reykjavik|mazar i sharif turkestan|aero', f);

  console.log('— matching and order');
  await page.fill('#terrSearch', 'lombardia');
  check('region: first row is Lombardia · Italia, list shown', JSON.stringify((await rows())[0]) === '["Lombardia","Italia"]' && (await vis('#terrResults')) && (await page.getAttribute('#terrSearch', 'aria-expanded')) === 'true', await rows());
  await page.fill('#terrSearch', 'LOMBARDÍA');
  check('case and accents do not matter', JSON.stringify((await rows())[0]) === '["Lombardia","Italia"]', await rows());
  const diac = await page.evaluate(() => { const t = window.__t; const id = Object.keys(t.provinces).find(i => t.provinces[i].region && /[^\x00-\x7F]/.test(t.provinces[i].name));
    const plain = t.provinces[id].name.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase(); return { id, name: t.provinces[id].name, plain, found: t.searchTerritories(plain).items.some(e => e.id === id) }; });
  check('a region with accents is found from its plain upper-case spelling', diac.found, diac);
  await page.fill('#terrSearch', 'italia');
  check('state first, with its number of regions', JSON.stringify((await rows())[0]) === '["Italia","Stato · 19 regioni"]', await rows());
  await page.fill('#terrSearch', 'urss');
  check('code works: urss -> Unione Sovietica', (await rows())[0][0] === 'Unione Sovietica', await rows());
  await page.fill('#terrSearch', 'gdr');
  check('code works: gdr -> Germania Est', (await rows())[0][0] === 'Germania Est', await rows());
  await page.fill('#terrSearch', 'kuwait');
  check('single-province state: Kuwait · Stato', JSON.stringify((await rows())[0]) === '["Kuwait","Stato"]', await rows());
  await page.fill('#terrSearch', 'corea sud');
  check('several words: all must match', (await rows())[0][0] === 'Corea del Sud' && (await rows()).every(r => /cor|sud/i.test(r[0] + r[1])), await rows());
  await page.fill('#terrSearch', 'germania');
  const g = await rows();
  check('"germania": the two German states first', g[0][0].startsWith('Germania') && g[1][0].startsWith('Germania') && g[0][1].startsWith('Stato'), g.slice(0, 3));
  await page.fill('#terrSearch', 'zzzz');
  check('no match: "Nessun risultato", no rows', (await txt('#terrResults')) === 'Nessun risultato' && (await rows()).length === 0, await txt('#terrResults'));
  await page.fill('#terrSearch', 'a');
  const many = await page.evaluate(() => ({ rows: document.querySelectorAll('#terrResults .search-item').length, more: (document.querySelector('#terrResults .search-more') || {}).textContent, total: window.__t.searchTerritories('a').total }));
  check('many matches: 8 rows and a line with how many more', many.rows === 8 && many.more === 'Altri ' + (many.total - 8) + ' risultati: scrivi di più per restringere.' && many.total > 100, many);
  await page.fill('#terrSearch', '<img src=x onerror=window.__pwn=1>');
  const xss = await page.evaluate(() => ({ imgs: document.querySelectorAll('#terrResults img').length, pwn: window.__pwn, t: document.getElementById('terrResults').textContent }));
  check('typed markup is never interpreted', xss.imgs === 0 && xss.pwn === undefined, xss);
  await page.fill('#terrSearch', '');
  check('list hidden when empty', await page.evaluate(() => document.getElementById('terrResults').classList.contains('hidden')));

  console.log('— choosing a region');
  await page.evaluate(() => window.__t.selectCountry('FRG'));
  await page.fill('#terrSearch', 'lombardia');
  await page.click('#terrResults .search-item');
  const lom = await idOf('Lombardia', 'ITA');
  const a = await page.evaluate(() => ({ sel: window.__t.getSelectedProvince(), name: document.getElementById('pp-name').textContent, val: document.getElementById('terrSearch').value,
    hidden: document.getElementById('terrResults').classList.contains('hidden'), playing: document.getElementById('playingAs').textContent, outline: document.querySelectorAll('#mapLayer .sel-outline').length }));
  check('Lombardia selected, panel open, input emptied, list closed', a.sel === lom && a.name === 'Lombardia' && a.val === '' && a.hidden, a);
  check('selection outline drawn', a.outline >= 1, a.outline);
  check('the nation being played is untouched', a.playing === 'Stai giocando come: Germania Ovest', a.playing);
  const vLom = await view();
  const lomCentre = await page.evaluate(id => { const rs = window.MAP_SVG.provincePolys[id]; const pts = rs[0].split(' ').map(p => p.split(',').map(Number)); const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }; }, lom);
  check('the view zoomed in and shows the whole region', vLom.scale > 2 && inView(vLom, lomCentre), { vLom, lomCentre });

  console.log('— choosing a state');
  await page.fill('#terrSearch', 'italia');
  await page.click('#terrResults .search-item');
  const it = await page.evaluate(() => { const t = window.__t, s = t.getSelectedProvince(); return { s, owner: t.provinces[s].owner, btn: document.getElementById('pp-playBtn').textContent, btnVis: !document.getElementById('pp-playBtn').classList.contains('hidden'), playing: document.getElementById('playingAs').textContent }; });
  check('Italy: one of its regions opens, with "Gioca come Italia"', it.owner === 'ITA' && it.btnVis && it.btn === 'Gioca come Italia', it);
  check('Italy: nation still untouched', it.playing === 'Stai giocando come: Germania Ovest', it.playing);
  const vIt = await view(), bIt = await page.evaluate(() => window.__t.stateBounds('ITA'));
  check('Italy: the whole main body is in view and fills the screen', inView(vIt, bIt) && fill(vIt, bIt) > 0.6 && fill(vIt, bIt) < 0.95, { vIt, bIt, f: fill(vIt, bIt) });
  await page.fill('#terrSearch', 'kuwait');
  await page.press('#terrSearch', 'Enter');
  const kw = await page.evaluate(() => ({ s: window.__t.getSelectedProvince(), btn: document.getElementById('pp-playBtn').textContent, scale: window.__t.scale }));
  check('Kuwait (Enter): its only province opens, zoomed in', kw.s === 'KWT_MAIN' && kw.btn === 'Gioca come Kuwait' && kw.scale > 8, kw);
  await page.fill('#terrSearch', 'portogallo');
  await page.press('#terrSearch', 'Enter');
  const vPt = await view(), bPt = await page.evaluate(() => window.__t.stateBounds('PRT'));
  check('Portugal: shows the mainland (not stretched to the islands), well zoomed', inView(vPt, bPt) && vPt.scale >= 10 && fill(vPt, bPt) > 0.6 && fill(vPt, bPt) < 0.95, { vPt, bPt, f: fill(vPt, bPt) });
  await page.fill('#terrSearch', 'unione sovietica');
  await page.press('#terrSearch', 'Enter');
  const vSu = await view(), bSu = await page.evaluate(() => window.__t.stateBounds('URSS'));
  check('USSR: whole body in view at a low zoom', inView(vSu, bSu) && vSu.scale < 2.5 && fill(vSu, bSu) > 0.6, { vSu, bSu, f: fill(vSu, bSu) });
  const rep = await page.evaluate(() => { const t = window.__t; const L = window.MAP_SVG.labels.ITA; const id = t.mainProvinceOf('ITA'); return { id, owner: t.provinces[id].owner, L: L.slice(0, 2) }; });
  check('representative region of a state belongs to it', rep.owner === 'ITA', rep);
  const everyState = await page.evaluate(() => { const t = window.__t; return Object.keys(t.countries).filter(c => { const id = t.mainProvinceOf(c); return !id || t.initialTerritory[id].owner !== c || !t.stateBounds(c); }); });
  check('every one of the 83 states has a box and a region to open', everyState.length === 0, everyState);

  console.log('— keyboard and closing');
  await page.fill('#terrSearch', 'germania');
  const k0 = await page.evaluate(() => [...document.querySelectorAll('#terrResults .search-item')].findIndex(b => b.classList.contains('act')));
  await page.press('#terrSearch', 'ArrowDown');
  const k1 = await page.evaluate(() => [...document.querySelectorAll('#terrResults .search-item')].findIndex(b => b.classList.contains('act')));
  await page.press('#terrSearch', 'ArrowUp');
  const k2 = await page.evaluate(() => [...document.querySelectorAll('#terrResults .search-item')].findIndex(b => b.classList.contains('act')));
  await page.press('#terrSearch', 'ArrowUp');
  const k3 = await page.evaluate(() => [...document.querySelectorAll('#terrResults .search-item')].findIndex(b => b.classList.contains('act')));
  check('arrows move the highlight (and wrap round)', k0 === 0 && k1 === 1 && k2 === 0 && k3 === (await rows()).length - 1, [k0, k1, k2, k3]);
  await page.press('#terrSearch', 'Escape');
  check('Escape empties the field and closes the list', (await page.inputValue('#terrSearch')) === '' && (await page.evaluate(() => document.getElementById('terrResults').classList.contains('hidden'))));
  await page.fill('#terrSearch', 'ital');
  await page.dispatchEvent('#fixedScenarioPanel .section-title', 'pointerdown');
  check('a tap elsewhere closes the list, keeping the text', (await page.evaluate(() => document.getElementById('terrResults').classList.contains('hidden'))) && (await page.inputValue('#terrSearch')) === 'ital');
  await page.click('#terrSearch');
  check('tapping into the field again reopens the list', await vis('#terrResults'));
  await page.dispatchEvent('#fixedScenarioPanel .section-title', 'pointerdown');
  await page.evaluate(() => document.getElementById('terrSearch').blur());
  await page.focus('#terrSearch');
  check('focusing the field again reopens the list', await vis('#terrResults'));
  await page.press('#terrSearch', 'Escape');

  console.log('— while a game is running');
  await page.evaluate(() => window.__t.startFixedScenarioGame('FRG'));
  const before = await page.evaluate(() => ({ nation: window.__t.getState().nation, year: window.__t.getState().year, log: document.querySelectorAll('#log .entry').length }));
  await page.fill('#terrSearch', 'baviera');
  await page.press('#terrSearch', 'Enter');
  const during = await page.evaluate(() => ({ nation: window.__t.getState().nation, year: window.__t.getState().year, log: document.querySelectorAll('#log .entry').length, sel: window.__t.getSelectedProvince(), name: document.getElementById('pp-name').textContent, playing: document.getElementById('playingAs').textContent }));
  check('search works during the game and changes nothing in it', during.name === 'Baviera' && during.nation === before.nation && during.year === before.year && during.log === before.log && during.playing === 'Stai giocando come: Germania Ovest', { before, during });

  check('no page errors (desktop)', errors.length === 0, errors);
  console.log('— speed');
  await browser.close();
  ({ browser, page, errors } = await launch({ width: 640, height: 900, mobile: false }));
  const sp = await page.evaluate(() => { const t = window.__t; const p0 = performance.now(); t.searchTerritories('a'); const first = performance.now() - p0; const p1 = performance.now(); for (let i = 0; i < 50; i++) t.searchTerritories('mar'); return { first, each: (performance.now() - p1) / 50 }; });
  console.log('   first search (builds the index) ms:', sp.first.toFixed(1), ' later ms/search:', sp.each.toFixed(2));
  check('first search under 100 ms, later ones under 10 ms', sp.first < 100 && sp.each < 10, sp);
  await browser.close();

  console.log('— phone (390 px, touch) and dark theme');
  ({ browser, page, errors } = await launch({ width: 390, height: 844, mobile: true, colorScheme: 'dark' }));
  await page.fill('#terrSearch', 'a');
  const ph = await page.evaluate(() => { const r = document.getElementById('terrResults').getBoundingClientRect(), i = document.getElementById('terrSearch').getBoundingClientRect();
    return { left: r.left, right: r.right, w: innerWidth, sw: document.documentElement.scrollWidth, h: r.height, vh: innerHeight, bg: getComputedStyle(document.getElementById('terrResults')).backgroundColor, inputW: i.width, items: document.querySelectorAll('#terrResults .search-item').length,
      itemH: document.querySelector('#terrResults .search-item').getBoundingClientRect().height }; });
  check('phone: the list stays inside the screen width, no sideways scroll', ph.left >= 0 && ph.right <= ph.w && ph.sw <= ph.w, ph);
  check('phone: rows are big enough to tap (>= 36 px)', ph.itemH >= 36, ph.itemH);
  check('dark theme: the list takes the dark panel colour', ph.bg === 'rgb(38, 32, 25)', ph.bg);
  await page.fill('#terrSearch', 'lombardia');
  await page.tap('#terrResults .search-item');
  const pt = await page.evaluate(() => ({ name: document.getElementById('pp-name').textContent, val: document.getElementById('terrSearch').value, active: document.activeElement === document.getElementById('terrSearch') }));
  check('phone: tapping a row opens the region, empties and leaves the field', pt.name === 'Lombardia' && pt.val === '' && !pt.active, pt);

  check('no page errors', errors.length === 0, errors);
  await browser.close();
  process.exit(summary() ? 1 : 0);
})();
