// Accessibilità (issue #4): punti di riferimento e titoli, nomi dei controlli, mappa da tastiera (un solo punto di sosta,
// frecce, Invio), elenco dei territori per Stato, schede e annunci, contrasto dei colori, focus visibile, movimento ridotto.
// Il «lettore di schermo» qui è l'albero dell'accessibilità che Chromium calcola (nomi, ruoli, stati): non sostituisce
// una prova con un lettore vero (NVDA, VoiceOver…), che resta da fare a mano.
const { launch, check, summary } = require('./harness');

// Misura il contrasto di ogni testo visibile (WCAG 1.4.3: 4,5 su 1; 3 su 1 per il testo grande), segnaposto compresi.
function scanContrast() {
  const parse = c => { const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return null; const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = c => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgOf = el => {
    const layers = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage !== 'none') return null;                 // sfumature e immagini: non misurabili qui
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    return base;
  };
  const opacityOf = el => { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity); return o; };
  const label = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : '');
  const inClosedDetails = el => {
    for (let a = el.parentElement; a; a = a.parentElement) {
      if (a.tagName === 'DETAILS' && !a.open) { const sm = a.querySelector(':scope > summary'); if (!sm || !sm.contains(el)) return true; }
    }
    return false;
  };
  const bad = [];
  let checked = 0;
  const test = (el, fg, text, size, weight) => {
    const bg = bgOf(el);
    if (!bg || !fg) return;
    const col = over({ r: fg.r, g: fg.g, b: fg.b, a: fg.a * opacityOf(el) }, bg);
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5, r = ratio(col, bg);
    checked++;
    if (r < need - 0.005) bad.push({ el: label(el), text: text.slice(0, 40), ratio: +r.toFixed(2), need });
  };
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('svg, script, style, template, option, .sr-only, [hidden]')) continue;
    if (!el.checkVisibility({ checkVisibilityCSS: true }) || inClosedDetails(el)) continue;
    if (el.closest('[disabled], [aria-disabled="true"]')) continue;     // i comandi spenti non devono rispettare il contrasto
    const cs = getComputedStyle(el);
    const own = [...el.childNodes].filter(c => c.nodeType === 3 && c.textContent.trim()).map(c => c.textContent.trim()).join(' ');
    if (own) test(el, parse(cs.color), own, parseFloat(cs.fontSize), +cs.fontWeight || 400);
    if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.placeholder && !el.value) {
      test(el, parse(getComputedStyle(el, '::placeholder').color), el.placeholder, parseFloat(cs.fontSize), 400);
    }
  }
  return { checked, bad };
}

// Cerca ciò che «sembra cliccabile» (cursore a mano) ma non si raggiunge né si usa da tastiera: sarebbe un comando solo per il mouse.
function scanMouseOnly() {
  const OK = 'button, a[href], input, select, textarea, summary, label, [role="button"][tabindex], [role="option"], [role="tab"], [tabindex]:not([tabindex="-1"])';
  const label = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : (el.getAttribute('class') ? '.' + el.getAttribute('class').trim().split(/\s+/).join('.') : ''));
  const bad = [];
  let checked = 0;
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('.sr-only, [hidden]') || !el.checkVisibility({ checkVisibilityCSS: true })) continue;
    if (getComputedStyle(el).cursor !== 'pointer') continue;
    checked++;
    if (el.closest(OK)) continue;                                        // it is, or is inside, a control
    if (el.classList.contains('province-poly') && el.getAttribute('aria-hidden') === 'true') continue;   // another ring of a territory whose first ring is the button
    bad.push(label(el));
  }
  return { checked, bad };
}

// Dimensione dei comandi (WCAG 2.5.8, livello AA): almeno 24 × 24 px, senza ricorrere all'eccezione della distanza.
// I territori sulla mappa non contano: sono regioni, non pulsanti da colpire con precisione.
function scanTargets() {
  const bad = [];
  let checked = 0;
  for (const el of document.body.querySelectorAll('button, select, summary, input:not([type="hidden"]), textarea, [role="tab"], a[href]')) {
    if (!el.checkVisibility({ checkVisibilityCSS: true }) || el.closest('.sr-only')) continue;
    let closed = false;                                                  // inside a closed <details>, only its own summary is on screen
    for (let a = el.parentElement; a && !closed; a = a.parentElement) {
      if (a.tagName === 'DETAILS' && !a.open) { const sm = a.querySelector(':scope > summary'); closed = !(sm && sm.contains(el)); }
    }
    if (closed) continue;
    const r = el.getBoundingClientRect();
    checked++;
    if (r.width < 23.5 || r.height < 23.5) bad.push((el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '')) + ' ' + Math.round(r.width) + '×' + Math.round(r.height));
  }
  return { checked, bad };
}

(async () => {
  const { browser, ctx, page, errors } = await launch({ width: 900, height: 1100, mobile: false });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const ax = async () => (await cdp.send('Accessibility.getFullAXTree')).nodes.filter(n => !n.ignored);
  const role = n => (n.role && n.role.value) || '';
  const nameOf = n => (n.name && n.name.value) || '';
  const status = () => ev(() => document.getElementById('a11yStatus').textContent.replace(/ $/, ''));
  const active = () => ev(() => { const a = document.activeElement; return { id: a.id || '', prov: a.dataset && a.dataset.id || null, tag: a.tagName, role: a.getAttribute('role'), label: a.getAttribute('aria-label') }; });
  // waits until the map stops moving (zoom, pan and slide animations end)
  const settleView = async () => {
    let last = '', same = 0;
    for (let i = 0; i < 60 && same < 3; i++) {
      const cur = await ev(() => [window.__t.scale, window.__t.tx, window.__t.ty].map(v => v.toFixed(3)).join());
      same = cur === last ? same + 1 : 0; last = cur;
      await page.waitForTimeout(100);
    }
  };

  // ------------------------------------------------------------------ structure
  console.log('— structure: landmarks, headings, names');
  const meta = await ev(() => ({ lang: document.documentElement.lang, title: document.title, tabPos: [...document.querySelectorAll('[tabindex]')].filter(e => +e.getAttribute('tabindex') > 0).length }));
  check('the page declares its language and keeps its title; no positive tabindex', meta.lang === 'it' && meta.title === 'Storia Alternativa — prototipo' && meta.tabPos === 0, meta);
  let nodes = await ax();
  const byRole = r => nodes.filter(n => role(n) === r);
  // the title of the page sits inside <main> (the usual advice for a single-page tool), so it is not a second landmark
  check('one main landmark, with the whole page inside it (no stray banner or footer outside)', byRole('main').length === 1 && byRole('banner').length === 0 && byRole('contentinfo').length === 0,
    { main: byRole('main').length, banner: byRole('banner').length, footer: byRole('contentinfo').length });
  const regions = byRole('region').map(nameOf);
  check('the two panels of the start page are regions with a name', regions.includes('Scenario fisso — Europa, 31 dicembre 1960') && regions.includes('Scenario libero'), regions);
  const heads = await ev(() => [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]')].filter(h => h.checkVisibility()).map(h => ({ t: h.textContent.trim().slice(0, 30), l: +(h.getAttribute('aria-level') || h.tagName[1]) })));
  check('one h1, first, and the levels never skip', heads.filter(h => h.l === 1).length === 1 && heads[0].l === 1 && heads.every((h, i) => i === 0 || h.l <= heads[i - 1].l + 1), heads);
  const INTERACTIVE = ['button', 'textbox', 'searchbox', 'combobox', 'checkbox', 'radio', 'listbox', 'tab', 'link', 'spinbutton', 'slider', 'switch', 'menuitem', 'option'];
  const unnamed = nodes.filter(n => INTERACTIVE.includes(role(n)) && !nameOf(n).trim()).map(n => role(n));
  check('every control in the accessibility tree has a name', unnamed.length === 0, unnamed);
  const btnNames = nodes.filter(n => role(n) === 'button').map(nameOf);
  check('the map controls are named in words', ['Ingrandisci', 'Riduci', "Torna all'Europa", 'Mostra tutta la mappa'].every(x => btnNames.includes(x)), btnNames.slice(0, 12));
  check('emoji are not read: the buttons are named by their words', ['Gioco', 'Editor scenario', 'Salva partita', 'Carica partita', 'Esporta', 'Importa'].every(x => btnNames.includes(x)), btnNames.slice(0, 20));
  const EMOJI = /\p{Extended_Pictographic}/u;
  const withEmoji = ns => ns.filter(n => ['button', 'link', 'tab', 'heading', 'textbox', 'combobox', 'option'].includes(role(n)) && EMOJI.test(nameOf(n))).map(n => role(n) + ': ' + nameOf(n));
  check('…and no name of a control or heading contains an emoji, on the start page', withEmoji(nodes).length === 0, withEmoji(nodes));
  const refs = await ev(() => {
    const all = [...document.querySelectorAll('[id]')].map(e => e.id), ids = new Set(all), missing = [];
    for (const attr of ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-activedescendant'])
      document.querySelectorAll('[' + attr + ']').forEach(e => e.getAttribute(attr).split(/\s+/).forEach(r => { if (r && !ids.has(r)) missing.push(attr + ' → ' + r); }));
    return { dup: all.filter((id, i) => all.indexOf(id) !== i), missing };
  });
  check('no repeated id, and every aria reference points to something', refs.dup.length === 0 && refs.missing.length === 0, refs);
  const pr = await ev(() => {
    const P = [...document.querySelectorAll('#mapLayer .province-poly')], btn = P.filter(p => p.getAttribute('role') === 'button');
    return { n: Object.keys(window.__t.provinces).length, polys: P.length, btn: btn.length, unnamed: btn.filter(p => !p.getAttribute('aria-label')).length,
      restHidden: P.filter(p => p.getAttribute('role') !== 'button').every(p => p.getAttribute('aria-hidden') === 'true'), tab0: P.filter(p => p.getAttribute('tabindex') === '0').length,
      svgRole: document.getElementById('euroSvg').getAttribute('role'), svgLabel: document.getElementById('euroSvg').getAttribute('aria-label'), desc: document.getElementById('euroSvg').getAttribute('aria-describedby'),
      namesHidden: document.querySelector('#mapLayer .label-layer').getAttribute('aria-hidden') };
  });
  check('every province is one button with a name; the other rings of a province are hidden', pr.btn === pr.n && pr.unnamed === 0 && pr.restHidden && pr.polys > pr.btn, pr);
  check('exactly one province is a tab stop; the map is a labelled group with keyboard instructions; the names drawn on the map are hidden', pr.tab0 === 1 && pr.svgRole === 'group' && !!pr.svgLabel && pr.desc === 'mapHint' && pr.namesHidden === 'true', pr);
  await ev(() => { const a = document.activeElement; if (a && a.blur) a.blur(); window.scrollTo(0, 0); });
  await page.keyboard.press('Tab');
  check('the first Tab stop is the skip link', (await active()).id === 'skipLink', await active());
  await page.keyboard.press('Enter');
  check('it moves the focus to the main content', (await active()).id === 'main', await active());

  // ------------------------------------------------------------------ the map by keyboard
  console.log('— the map by keyboard');
  await ev(() => window.__t.goHome());
  const home = await ev(() => ({ s: window.__t.scale, id: document.querySelector('#mapLayer .province-poly[tabindex="0"]').dataset.id }));
  await page.focus('#worldBtn');
  await page.keyboard.press('Tab');
  const f1 = await ev(() => { const a = document.activeElement; return { id: a.dataset.id, role: a.getAttribute('role'), label: a.getAttribute('aria-label'), ring: document.querySelectorAll('#mapLayer .foc-ring').length,
    rings: (window.MAP_SVG.provincePolys[a.dataset.id] || []).length }; });
  check('Tab from the map controls lands on the territory that is the tab stop: a button with a name', f1.id === home.id && f1.role === 'button' && /\S/.test(f1.label || ''), f1);
  check('a ring is drawn around it (one outline per ring of the territory)', f1.ring === f1.rings && f1.rings >= 1, f1);
  // the arrow keys go to the neighbouring territory that lies that way
  const dirs = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
  const moves = {};
  for (const key of Object.keys(dirs)) {
    await ev(id => window.__t.provinceEls[id][0].focus(), home.id);
    const want = await ev(o => window.__t.nextProvince(o.id, o.d), { id: home.id, d: dirs[key] });
    await page.keyboard.press(key);
    const got = await ev(o => { const T = window.__t, a = document.activeElement, c0 = T.provCenter(o.id), c1 = T.provCenter(a.dataset.id);
      const dx = c1.x - c0.x, dy = c1.y - c0.y, d = Math.hypot(dx, dy) || 1;
      return { id: a.dataset.id, cos: (dx * o.d[0] + dy * o.d[1]) / d, ring: document.querySelectorAll('#mapLayer .foc-ring').length, ringPts: document.querySelector('#mapLayer .foc-ring') && document.querySelector('#mapLayer .foc-ring').getAttribute('points') === window.MAP_SVG.provincePolys[a.dataset.id][0] }; },
      { id: home.id, d: dirs[key] });
    moves[key] = { want, got };
  }
  const moved = Object.keys(moves).filter(k => moves[k].want);
  check('from a territory in the middle of the map each arrow has somewhere to go', moved.length >= 3, moves);
  check('the focus goes where the arrow points (within 60 degrees), exactly where nextProvince says', moved.every(k => moves[k].got.id === moves[k].want && moves[k].got.id !== home.id && moves[k].got.cos >= 0.5), moves);
  check('the ring follows the focus', moved.every(k => moves[k].got.ring >= 1 && moves[k].got.ringPts === true), moves);
  // Enter opens the card and announces it; the focus stays on the map
  const aId = (await active()).prov;
  await page.keyboard.press('Enter');
  const e1 = await ev(() => ({ card: !document.getElementById('provincePanel').classList.contains('hidden'), name: document.getElementById('pp-name').textContent, sel: window.__t.getSelectedProvince(),
    cur: [...document.querySelectorAll('#mapLayer [aria-current]')].map(x => x.dataset.id), active: document.activeElement.dataset.id, label: window.__t.provLabel(document.activeElement.dataset.id) }));
  check('Enter opens the card of the territory', e1.card && e1.sel === aId && e1.name === (await ev(id => window.__t.provinces[id].name, aId)), e1);
  check('aria-current marks it and only it; the focus stays on it', e1.cur.length === 1 && e1.cur[0] === aId && e1.active === aId, e1);
  check('the page announces «Scheda aperta» with its name', (await status()) === 'Scheda aperta: ' + e1.label + '.', await status());
  // Space on another territory
  await page.keyboard.press('ArrowLeft');
  const bId = (await active()).prov;
  await page.keyboard.press('Space');
  const e2 = await ev(() => ({ sel: window.__t.getSelectedProvince(), cur: [...document.querySelectorAll('#mapLayer [aria-current]')].map(x => x.dataset.id) }));
  check('Space does the same, and aria-current moves with the selection', bId && e2.sel === bId && e2.cur.length === 1 && e2.cur[0] === bId, e2);
  // Tab leaves the map; Shift+Tab comes back to the territory that was opened
  await page.keyboard.press('Tab');
  const away = await active();
  await page.keyboard.press('Shift+Tab');
  const back = await active();
  check('Tab leaves the map (all the territories are one stop); Shift+Tab returns to the territory that was opened', !away.prov && back.prov === bId, { away, back });
  // + - 0
  const z0 = await ev(() => window.__t.scale);
  await page.keyboard.press('+');
  const z1 = await ev(id => { const T = window.__t, c = T.provCenter(id); return { s: T.scale, vx: T.tx + T.scale * c.x, vy: T.ty + T.scale * c.y }; }, bId);
  check('+ zooms in, around the territory that has the focus', z1.s > z0 * 1.25 && Math.abs(z1.vx - 2556) < 2 && Math.abs(z1.vy - 1029) < 2, { z0, z1 });
  await page.keyboard.press('-');
  check('− zooms out', (await ev(() => window.__t.scale)) < z1.s);
  await page.keyboard.press('0');
  check('0 goes back to Europe', Math.abs((await ev(() => window.__t.scale)) - home.s) < 0.01, { want: home.s, got: await ev(() => window.__t.scale) });
  // nowhere to go: the page says so and the focus stays
  const none = await ev(() => { const T = window.__t, D = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    for (const id of Object.keys(T.provinces)) for (const k in D) if (T.nextProvince(id, D[k]) === null) return { id, k }; return null; });
  check('some territory has nowhere to go in some direction (the edge of the map)', !!none, none);
  if (none) {
    await ev(id => window.__t.provinceEls[id][0].focus(), none.id);
    await page.keyboard.press(none.k);
    check('there the page says «Nessun altro territorio in questa direzione» and the focus stays', (await status()) === 'Nessun altro territorio in questa direzione.' && (await active()).prov === none.id, { st: await status(), a: await active() });
    // the same sentence a second time still reaches the reader: a live region is spoken only when its text changes
    const raw1 = await ev(() => document.getElementById('a11yStatus').textContent);
    await page.keyboard.press(none.k);
    const raw2 = await ev(() => document.getElementById('a11yStatus').textContent);
    check('the same message twice in a row changes the live region (so it is announced again) and reads the same', raw1 !== raw2 && raw2.replace(/ $/, '') === raw1.replace(/ $/, ''), { raw1, raw2 });
  }
  // a territory that is off the visible part of the map is brought into view (the zoom does not change)
  const pan = await ev(() => { const T = window.__t, rect = document.getElementById('euroSvg').getBoundingClientRect(), viewH = 5112 * (rect.height / rect.width);
    const D = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    const ids = Object.keys(T.provinces).filter(i => (T.provinces[i].neighbors || []).length >= 3).slice(0, 300);
    for (const id of ids) { const c = T.provCenter(id); T.setView(c.x, c.y, 14);
      for (const k in D) { const n = T.nextProvince(id, D[k]); if (!n) continue; const q = T.provCenter(n), vx = T.tx + T.scale * q.x, vy = T.ty + T.scale * q.y;
        if (vx < 511 || vx > 4601 || vy < 1029 - viewH / 2 + viewH * 0.1 || vy > 1029 + viewH / 2 - viewH * 0.1) return { id, k, n }; } }
    return null; });
  check('a start can be found from which the next territory lies out of view at high zoom', !!pan, pan);
  if (pan) {
    await ev(o => { const T = window.__t, c = T.provCenter(o.id); T.setView(c.x, c.y, 14); T.provinceEls[o.id][0].focus(); }, pan);
    await page.keyboard.press(pan.k);
    const pv = await ev(o => { const T = window.__t, q = T.provCenter(o.n), rect = document.getElementById('euroSvg').getBoundingClientRect(), viewH = 5112 * (rect.height / rect.width);
      const vx = T.tx + T.scale * q.x, vy = T.ty + T.scale * q.y;
      return { at: document.activeElement.dataset.id, s: T.scale, inX: vx >= 511 && vx <= 4601, inY: vy >= 1029 - viewH / 2 && vy <= 1029 + viewH / 2 }; }, pan);
    check('the territory that gets the focus is in view afterwards, at the same zoom', pv.at === pan.n && pv.s === 14 && pv.inX && pv.inY, pv);
  }
  await ev(() => window.__t.goHome());
  // a tap or a click selects without drawing the keyboard ring; the tab stop follows
  const lombId = await ev(() => { const T = window.__t, id = Object.keys(T.provinces).find(i => T.provinces[i].name === 'Lombardia' && T.provinces[i].owner === 'ITA'); T.focusProvince(id); return id; });
  await settleView();                                        // focusProvince slides the map: measure only when it has stopped
  const tap = await ev(id => { const T = window.__t, els = T.provinceEls[id], b = els[0].getBoundingClientRect();
    for (let i = 1; i < 12; i++) for (let j = 1; j < 12; j++) { const x = b.x + b.width * i / 12, y = b.y + b.height * j / 12; const hit = document.elementFromPoint(x, y); if (hit && hit.dataset && hit.dataset.id === id) return { id, x, y }; }
    return { id, x: null, y: null }; }, lombId);
  check('a point on Lombardia can be found on screen', tap.x !== null, tap);
  await ev(() => document.activeElement.blur());
  await page.mouse.click(tap.x, tap.y);
  const t1 = await ev(id => ({ sel: window.__t.getSelectedProvince(), ring: document.querySelectorAll('#mapLayer .foc-ring').length, stop: document.querySelector('#mapLayer .province-poly[tabindex="0"]').dataset.id, nStops: document.querySelectorAll('#mapLayer .province-poly[tabindex="0"]').length }), tap.id);
  check('a click selects the territory and draws no keyboard ring', t1.sel === tap.id && t1.ring === 0, t1);
  check('the tab stop moved to the territory that was clicked (still just one)', t1.stop === tap.id && t1.nStops === 1, t1);
  // names follow the map
  const lab = await ev(() => { const T = window.__t, id = Object.keys(T.provinces).find(i => T.provinces[i].owner === 'ITA' && T.provinces[i].name === 'Lombardia'), el = () => T.provinceEls[id][0].getAttribute('aria-label');
    const r = { before: el() }; T.changeProvinceController(id, 'URSS'); r.occupied = el(); T.transferProvince(id, 'URSS'); r.given = el(); T.restoreStartingScenario(); r.back = el(); r.urss = T.countries.URSS.name; return r; });
  check('the name says who owns the territory', lab.before === 'Lombardia, Italia', lab);
  check('…and who holds it when that is somebody else', lab.occupied === 'Lombardia, Italia, sotto controllo di ' + lab.urss, lab);
  check('…and changes with a transfer, and with the reset', lab.given === 'Lombardia, ' + lab.urss && lab.back === lab.before, lab);

  // ------------------------------------------------------------------ the territories as text
  console.log('— the territories as text, by state');
  const l0 = await ev(() => ({ open: document.getElementById('terrListBox').open, n: document.getElementById('terrList').children.length, sum: document.getElementById('terrListSummary').textContent }));
  check('the list is closed and still empty (it is built when opened)', !l0.open && l0.n === 0, l0);
  await page.click('#terrListSummary');
  await page.waitForFunction(() => document.querySelectorAll('#terrList .tl-state').length > 0, null, { timeout: 5000 });   // the list is built when the box has opened
  const l1 = await ev(() => { const T = window.__t, groups = [...document.querySelectorAll('#terrList .tl-state')], owners = new Set(Object.keys(T.provinces).map(i => T.provinces[i].owner));
    return { n: groups.length, owners: owners.size, items: document.querySelectorAll('#terrList .tl-item').length, provs: Object.keys(T.provinces).length,
      first: groups.slice(0, 3).map(g => g.querySelector('summary').textContent), sorted: groups.map(g => g.querySelector('summary').textContent.replace(/ \(\d+\)$/, '')).every((x, i, a) => i === 0 || a[i - 1].localeCompare(x, 'it') <= 0),
      sum: document.getElementById('terrListSummary').textContent }; });
  check('one group per state, sorted by name, with its number of territories', l1.n === l1.owners && l1.sorted && /^[^(]+ \(\d+\)$/.test(l1.first[0]), l1);
  check('every territory is on the list once', l1.items === l1.provs && /Stati\)$/.test(l1.sum), l1);
  const fr = await ev(() => { const g = [...document.querySelectorAll('#terrList .tl-state')].find(d => d.dataset.code === 'FRA'); g.open = true; const b = g.querySelector('.tl-item'); return { id: b.dataset.id, name: b.textContent, label: window.__t.provLabel(b.dataset.id) }; });
  await page.click('#terrList .tl-state[data-code="FRA"] .tl-item');
  const l2 = await ev(() => ({ sel: window.__t.getSelectedProvince(), cur: [...document.querySelectorAll('#mapLayer [aria-current]')].map(x => x.dataset.id), st: document.getElementById('a11yStatus').textContent, card: document.getElementById('pp-name').textContent }));
  check('a button on the list opens the card of that territory, announces it and marks it', l2.sel === fr.id && l2.cur.length === 1 && l2.cur[0] === fr.id && l2.st === 'Scheda aperta: ' + fr.label + '.', { fr, l2 });
  const l3 = await ev(() => { const T = window.__t, id = Object.keys(T.provinces).find(i => T.provinces[i].owner === 'ITA' && T.provinces[i].name === 'Lombardia'); T.transferProvince(id, 'FRA');
    const fra = [...document.querySelectorAll('#terrList .tl-state')].find(d => d.dataset.code === 'FRA'), ita = [...document.querySelectorAll('#terrList .tl-state')].find(d => d.dataset.code === 'ITA');
    const r = { inFra: !!fra.querySelector('.tl-item[data-id="' + id + '"]'), inIta: !!ita.querySelector('.tl-item[data-id="' + id + '"]'), fraOpen: fra.open, sum: fra.querySelector('summary').textContent }; T.restoreStartingScenario(); return r; });
  check('when ownership changes the list follows, and the state that was open stays open', l3.inFra && !l3.inIta && l3.fraOpen, l3);
  await page.click('#terrListSummary');

  // ------------------------------------------------------------------ the search box is a combobox that says which option is active
  console.log('— the search box');
  await page.fill('#terrSearch', 'fran');
  const s1 = await ev(() => ({ ad: document.getElementById('terrSearch').getAttribute('aria-activedescendant'), ids: [...document.querySelectorAll('#terrResults [role="option"]')].map(o => o.id), role: document.getElementById('terrResults').getAttribute('role'),
    tabs: [...document.querySelectorAll('#terrResults [role="option"]')].every(o => o.tabIndex === -1) }));
  check('the first option is the active descendant; the options are not tab stops', s1.ids.length >= 2 && s1.ad === s1.ids[0] && s1.role === 'listbox' && s1.tabs, s1);
  await page.press('#terrSearch', 'ArrowDown');
  const s2 = await ev(() => ({ ad: document.getElementById('terrSearch').getAttribute('aria-activedescendant'), sel: document.querySelector('#terrResults [aria-selected="true"]').id }));
  check('ArrowDown moves the active descendant with the selected option', s2.ad === s1.ids[1] && s2.sel === s2.ad, s2);
  await page.press('#terrSearch', 'Escape');
  check('Escape closes the list and drops the active descendant', await ev(() => !document.getElementById('terrSearch').hasAttribute('aria-activedescendant') && document.getElementById('terrSearch').getAttribute('aria-expanded') === 'false'));
  await page.fill('#terrSearch', 'zzzzqq');
  const s3 = await ev(() => ({ role: document.getElementById('terrResults').getAttribute('role'), opts: document.querySelectorAll('#terrResults [role="option"]').length, text: document.getElementById('terrResults').textContent, ad: document.getElementById('terrSearch').hasAttribute('aria-activedescendant') }));
  check('with no result the box is a message, not a list without options', s3.role === 'status' && s3.opts === 0 && /Nessun risultato/.test(s3.text) && !s3.ad, s3);
  await page.fill('#terrSearch', '');
  await ev(() => { document.getElementById('terrSearch').blur(); });

  // ------------------------------------------------------------------ colours
  console.log('— contrast of the text (4.5:1, large text 3:1), both themes');
  // a second opinion: the contrast audit of Chromium itself (the one behind its DevTools), on a viewport tall enough to show the
  // whole page (it measures what is on screen)
  const audit = [];
  cdp.on('Audits.issueAdded', e => audit.push(e.issue));
  let auditOk = true;
  try { await cdp.send('Audits.enable'); } catch (e) { auditOk = false; console.log('  (the contrast audit of Chromium is not available in this build: skipped)'); }
  const chromiumLow = async () => {
    const vp = page.viewportSize();
    await page.setViewportSize({ width: vp.width, height: 6000 });
    await page.waitForTimeout(300);
    audit.length = 0;
    await cdp.send('Audits.checkContrast', { reportAAA: false });
    let seen = -1, calm = 0;
    for (let i = 0; i < 30 && calm < 2; i++) { await page.waitForTimeout(300); calm = seen === audit.length ? calm + 1 : 0; seen = audit.length; }
    const out = [];
    for (const i of audit.filter(x => x.code === 'LowTextContrastIssue')) {
      const d = i.details.lowTextContrastIssueDetails;
      let what = {};
      try {
        const { object } = await cdp.send('DOM.resolveNode', { backendNodeId: d.violatingNodeId });
        what = (await cdp.send('Runtime.callFunctionOn', { objectId: object.objectId, returnByValue: true,
          functionDeclaration: `function() {
            let closed = false;                                  // inside a closed <details> (its summary stays visible)
            for (let a = this.parentElement; a && !closed; a = a.parentElement) {
              if (a.tagName !== 'DETAILS' || a.open) continue;
              let c = this; while (c && c.parentElement !== a) c = c.parentElement;
              closed = !(c && c.tagName === 'SUMMARY' && c === a.querySelector(':scope > summary'));
            }
            return { text: (this.textContent || '').trim().slice(0, 50), parent: this.parentElement ? this.parentElement.tagName + '#' + this.parentElement.id : '', closed };
          }` })).result.value;
      } catch (e) { what = { text: '?', parent: String(e).slice(0, 60) }; }
      // text inside a closed <details> is laid out but never painted: the audit measures empty pixels there (a ratio near 1)
      if (what.closed) continue;
      // a colour emoji is a picture, not text in the colour of the page: the audit measures its pixels, which says nothing about readability
      if (what.text && !/[\p{L}\p{N}]/u.test(what.text) && EMOJI.test(what.text)) continue;
      out.push(d.violatingNodeSelector + ' ' + d.contrastRatio.toFixed(2) + ' (needs ' + d.thresholdAA + ') «' + what.text + '» in ' + what.parent);
    }
    await page.setViewportSize(vp);
    return out;
  };
  const scan = async (what) => {
    const r = await ev(scanContrast);
    check('contrast: ' + what + ' (' + r.checked + ' texts)', r.bad.length === 0 && r.checked > 10, r.bad.slice(0, 6));
    if (auditOk) {
      const low = await chromiumLow();
      check('contrast, by Chromium\'s own audit: ' + what, low.length === 0, low.slice(0, 6));
    }
    const mo = await ev(scanMouseOnly);
    check('nothing works with the mouse only: ' + what + ' (' + mo.checked + ' clickable things)', mo.bad.length === 0 && mo.checked > 5, mo.bad.slice(0, 6));
    const tg = await ev(scanTargets);
    check('every control is at least 24 × 24 px: ' + what + ' (' + tg.checked + ' controls)', tg.bad.length === 0 && tg.checked > 10, tg.bad.slice(0, 6));
  };
  // the scanners themselves: a scanner that never complains is worthless, so each must catch a deliberate fault
  await ev(() => {
    const d = document.createElement('div');
    d.id = 'selftest';
    d.innerHTML = '<p id="st-low" style="color:#b8b8b8;background:#fff;margin:0;font-size:16px">Testo grigio chiaro su bianco</p><div id="st-click" style="cursor:pointer">Un comando solo per il mouse</div>';
    document.getElementById('main').appendChild(d);
  });
  const self1 = await ev(scanContrast), self2 = await ev(scanMouseOnly);
  check('the contrast scanner catches light grey text on white', self1.bad.some(b => b.el === 'p#st-low'), self1.bad.slice(0, 4));
  check('the mouse-only scanner catches a clickable <div> that is not a control', self2.bad.includes('div#st-click'), self2.bad.slice(0, 4));
  if (auditOk) {
    const selfLow = await chromiumLow();
    check('Chromium\'s audit catches the same light grey text', selfLow.some(s => /Testo grigio chiaro/.test(s)), selfLow.slice(0, 4));
  }
  await ev(() => document.getElementById('selftest').remove());
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme });
    await ev(() => window.__t.selectProvince(Object.keys(window.__t.provinces).find(i => window.__t.provinces[i].owner === 'FRG')));
    await scan(scheme + ', start page with a card open');
    await page.click('#modeEditBtn');
    await scan(scheme + ', editor on');
    await ev(() => window.__t.setEditorMode(false));
    await page.click('#exportBtn');
    await scan(scheme + ', export dialog open');
    await page.click('#transferClose');
    await page.click('#importBtn');
    await scan(scheme + ', import dialog open');
    await page.click('#transferClose');
    await ev(() => { const T = window.__t, id = Object.keys(T.provinces).find(i => T.provinces[i].owner === 'FRG'); T.addMarker({ tipo: 'truppe', nome: 'Prova del contrasto', provincia: id }, 'giocatore'); });
    await page.click('#markerBox > summary');
    await page.click('#ownHelp > summary');
    await page.click('#terrListSummary');
    await page.waitForFunction(() => document.querySelectorAll('#terrList .tl-state').length > 0, null, { timeout: 5000 });
    await ev(() => { document.querySelector('#terrList .tl-state').open = true; });
    await scan(scheme + ', help, marker list and territory list open');
    await page.click('#terrListSummary');
    await page.click('#markerBox > summary');
    await page.click('#ownHelp > summary');
    await ev(() => window.__t.clearMarkers());
  }
  await page.emulateMedia({ colorScheme: 'light' });
  // the same on a phone-wide screen: the text wraps, the controls do not shrink
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const tp = await ev(scanTargets);
  check('on a phone-wide screen too every control is at least 24 × 24 px (' + tp.checked + ' controls)', tp.bad.length === 0 && tp.checked > 15, tp.bad.slice(0, 6));
  // WCAG 1.4.10 (reflow): at 320 px wide (a 1280 px window zoomed to 400 %) the page must not scroll sideways
  await page.setViewportSize({ width: 320, height: 640 });
  await page.waitForTimeout(300);
  const wide = await ev(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
    over: [...document.body.querySelectorAll('*')].filter(e => !e.closest('svg') && e.checkVisibility() && e.getBoundingClientRect().right > document.documentElement.clientWidth + 1).slice(0, 4).map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '')) }));
  check('at 320 px wide the page does not scroll sideways (reflow, WCAG 1.4.10)', wide.sw <= wide.cw, wide);
  await page.setViewportSize({ width: 900, height: 1100 });
  await page.waitForTimeout(200);

  // ------------------------------------------------------------------ every Tab stop shows where the focus is
  console.log('— a visible focus on every Tab stop');
  await ev(() => { const T = window.__t, id = Object.keys(T.provinces).find(i => T.provinces[i].owner === 'FRG'); T.goHome(); T.addMarker({ tipo: 'truppe', nome: 'Prova della tastiera', provincia: id }, 'giocatore'); T.updateLabels(); });
  await ev(() => { document.activeElement.blur(); window.scrollTo(0, 0); });
  const stops = [];
  for (let i = 0; i < 90; i++) {
    await page.keyboard.press('Tab');
    const s = await ev(() => { const a = document.activeElement; if (!a || a === document.body) return null; const cs = getComputedStyle(a);
      const ring = a.classList.contains('province-poly') ? document.querySelectorAll('#mapLayer .foc-ring').length > 0 : null;
      const mk = a.hasAttribute('data-marker') ? parseFloat(getComputedStyle(a.querySelector('.mk-selbg')).opacity) === 1 && parseFloat(getComputedStyle(a.querySelector('.mk-sel')).opacity) === 1 : null;
      return { id: a.id || a.getAttribute('class') || a.tagName, outline: cs.outlineStyle, w: parseFloat(cs.outlineWidth), shadow: cs.boxShadow, ring, mk }; });
    if (!s || (stops.length && s.id === stops[0].id)) break;
    stops.push(s);
  }
  const hidden = stops.filter(s => !(s.ring === true || s.mk === true || (s.ring === null && s.mk === null && ((s.outline !== 'none' && s.w >= 2) || s.shadow !== 'none'))));
  check('the page has Tab stops (' + stops.length + ') and each shows a focus indicator (outline of 2 px or more, or the ring on the map)', stops.length >= 20 && hidden.length === 0, hidden.slice(0, 5));
  check('the whole map is one stop, and a marker shows its ring on a dark casing', stops.filter(s => s.ring !== null).length === 1 && stops.some(s => s.mk === true), stops.filter(s => s.ring !== null || s.mk !== null));
  await ev(() => window.__t.clearMarkers());

  // ------------------------------------------------------------------ the main actions, with the keyboard only
  console.log('— from the map to a saved game, with the keyboard only (no mouse)');
  const tabTo = async (sel, max = 90) => {
    for (let i = 1; i <= max; i++) {
      await page.keyboard.press('Tab');
      if (await ev(s => document.activeElement.matches(s), sel)) return i;
    }
    return -1;
  };
  await ev(() => { document.activeElement.blur(); window.__t.goHome(); window.scrollTo(0, 0); });
  const k1 = await tabTo('#mapLayer .province-poly');
  check('Tab reaches the map', k1 > 0, k1);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  const k2 = await ev(() => ({ card: !document.getElementById('provincePanel').classList.contains('hidden'), sel: window.__t.getSelectedProvince() }));
  check('an arrow and Enter open the card of a territory', k2.card && !!k2.sel, k2);
  const k3 = await tabTo('#pp-playBtn');
  check('Tab reaches «Gioca come …» in the card (' + k3 + ' presses from the map)', k3 > 0, k3);
  await page.keyboard.press('Enter');
  const k4 = await ev(() => ({ mode: window.__t.getGameMode(), focus: document.activeElement.id }));
  check('Enter starts the game and the focus goes to its heading', !!k4.mode && k4.focus === 'gameTitle', k4);
  const k5 = await tabTo('#actionInput');
  await page.keyboard.type('Mobilito le riserve');
  const k6 = await tabTo('#actBtn', 8);
  check('Tab reaches the action field (' + k5 + ' presses) and then «Agisci e avanza»', k5 > 0 && k6 > 0, { k5, k6 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  const k7 = await ev(() => ({ log: document.getElementById('log').textContent, prompts: window.__prompts.length }));
  check('Enter sends the action: the answer of the engine is in the story', k7.log.includes('Narrativa di prova.') && k7.prompts >= 1, { prompts: k7.prompts, log: k7.log.slice(0, 120) });
  const k8 = await tabTo('#advisorBtn', 40);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  const k9 = await ev(() => document.body.textContent.includes('Risposta di prova del consigliere.'));
  check('the advisor can be asked with the keyboard', k8 > 0 && k9, { k8, k9 });
  const k10 = await tabTo('#saveGameBtn', 60);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  const k11 = await ev(() => document.getElementById('saveStatus').textContent);
  check('«Salva partita» works from the keyboard and says so', k10 > 0 && /alvat/i.test(k11), { k10, k11 });
  const k12 = await tabTo('#exportBtn', 8);
  await page.keyboard.press('Enter');
  const k13 = await ev(() => ({ open: document.getElementById('transferDialog').open, inside: document.getElementById('transferDialog').contains(document.activeElement) }));
  await page.keyboard.press('Escape');
  const k14 = await ev(() => ({ open: document.getElementById('transferDialog').open, focus: document.activeElement.id }));
  check('«Esporta» opens a dialog with the focus inside, and Escape closes it and returns to the button', k12 > 0 && k13.open && k13.inside && !k14.open && k14.focus === 'exportBtn', { k12, k13, k14 });
  const k15 = await tabTo('#newGameBtn', 40);
  await page.keyboard.press('Enter');
  const k16 = await ev(() => ({ mode: window.__t.getGameMode(), focus: document.activeElement.id }));
  check('«Nuova partita» ends the game and brings the focus back to the title of the page', k15 > 0 && !k16.mode && k16.focus === 'appTitle', { k15, k16 });

  // ------------------------------------------------------------------ the game screen
  console.log('— the game: focus, headings, tabs, logs, announcements');
  await ev(() => window.__t.startFixedScenarioGame('ITA'));
  await page.waitForTimeout(150);
  const g1 = await ev(() => ({ focus: document.activeElement.id, level: document.getElementById('gameTitle').getAttribute('aria-level'), region: !!document.querySelector('section#game[aria-labelledby="gameTitle"]'),
    heads: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]')].filter(h => h.checkVisibility()).map(h => +(h.getAttribute('aria-level') || h.tagName[1])),
    log: { role: document.getElementById('log').getAttribute('role'), label: document.getElementById('log').getAttribute('aria-label'), tab: document.getElementById('log').tabIndex },
    tabs: ['tabActions', 'tabDiplo'].map(i => { const t = document.getElementById(i); return { role: t.getAttribute('role'), sel: t.getAttribute('aria-selected'), ti: t.tabIndex, ctl: t.getAttribute('aria-controls') }; }),
    list: document.querySelector('.tabs').getAttribute('role'), panels: [['actionsPanel', 'tabActions'], ['diploPanel', 'tabDiplo']].map(([p, t]) => document.getElementById(p).getAttribute('role') + ':' + document.getElementById(p).getAttribute('aria-labelledby') === 'tabpanel:' + t),
    meters: [...document.querySelectorAll('.meter-track')].every(m => m.getAttribute('aria-hidden') === 'true'), stats: document.getElementById('stats').getAttribute('aria-label') }));
  check('starting a game moves the focus to the game heading (the button that was pressed is gone)', g1.focus === 'gameTitle' && g1.region, g1);
  check('with the map on the page the game heading is a level 2; the levels still never skip', g1.level === '2' && g1.heads[0] === 1 && g1.heads.every((l, i) => i === 0 || l <= g1.heads[i - 1] + 1), g1.heads);
  check('the story is a log (focusable, labelled); the stats are a labelled group and their bars are decoration', g1.log.role === 'log' && g1.log.label === 'Cronaca della partita' && g1.log.tab === 0 && g1.meters && g1.stats === 'Statistiche della nazione', g1);
  check('the two sections are tabs: a tablist, selected state, one tab stop, labelled panels', g1.list === 'tablist' && g1.tabs[0].role === 'tab' && g1.tabs[0].sel === 'true' && g1.tabs[1].sel === 'false' && g1.tabs[0].ti === 0 && g1.tabs[1].ti === -1 && g1.panels.every(Boolean), g1);
  nodes = await ax();
  check('…and none on the game screen either (buttons, tabs, headings)', withEmoji(nodes).length === 0, withEmoji(nodes));
  await page.focus('#tabActions');
  await page.keyboard.press('ArrowRight');
  const g2 =await ev(() => ({ a: document.activeElement.id, sel: document.getElementById('tabDiplo').getAttribute('aria-selected'), diplo: !document.getElementById('diploPanel').classList.contains('hidden'), act: document.getElementById('actionsPanel').classList.contains('hidden') }));
  check('ArrowRight selects and focuses «Diplomazia» and shows its panel', g2.a === 'tabDiplo' && g2.sel === 'true' && g2.diplo && g2.act, g2);
  await page.keyboard.press('Home');
  const g3 = await ev(() => ({ a: document.activeElement.id, sel: document.getElementById('tabActions').getAttribute('aria-selected'), ti: document.getElementById('tabDiplo').tabIndex }));
  check('Home goes back to «Azioni»; the other tab leaves the tab order', g3.a === 'tabActions' && g3.sel === 'true' && g3.ti === -1, g3);
  // the engine thinks: announced; its answer lands in the log (a loaded game is not read out entry by entry)
  await ev(() => { window.__d = window.__deferred(); window.__queue.push(window.__d.p); });
  await page.fill('#actionInput', 'Prova');
  await page.click('#actBtn');
  check('while the engine thinks the page says so', (await status()) === 'Il motore storico sta elaborando…', await status());
  await ev(() => window.__d.res({ evento_titolo: 'Titolo', narrativa: 'Narrativa di prova.', riepilogo_mondo: 'r', nuovo_anno: 'gennaio 1961', stabilita: 55, economia: 55, esercito: 55, prestigio: 55,
    cambi_territoriali: [], cambi_controllo: [{ provincia: Object.keys(window.__t.provinces).find(i => window.__t.provinces[i].owner === 'FRG' && window.__t.provinces[i].neighbors.some(n => window.__t.provinces[n].owner === 'ITA' || window.__t.provinces[n].owner === 'FRG')), nuovo_controllore: 'ITA' }] }));
  await page.waitForTimeout(250);
  check('the answer is in the log', (await ev(() => document.getElementById('log').textContent)).includes('Narrativa di prova.'));
  const loaded = await ev(() => { const p = window.__t.buildSavePayload(); const T = window.__t; T.applySave(JSON.parse(JSON.stringify(p))); const l = document.getElementById('log'); return { live: l.getAttribute('aria-live'), entries: l.children.length }; });
  check('loading a game puts the log back without being read aloud entry by entry (aria-live off for a moment, then back to the role\'s own)', loaded.live === 'off' && loaded.entries >= 2, loaded);
  await page.waitForTimeout(500);
  check('…and the live behaviour of the log comes back', (await ev(() => document.getElementById('log').hasAttribute('aria-live'))) === false);
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme });
    await scan(scheme + ', game screen (stats, log, tabs, card)');
    await page.click('#tabDiplo');
    await scan(scheme + ', diplomacy tab');
    await page.click('#tabActions');
  }
  await page.emulateMedia({ colorScheme: 'light' });
  await page.click('#newGameBtn');
  const g4 = await ev(() => ({ focus: document.activeElement.id, game: document.getElementById('game').classList.contains('hidden') }));
  check('«Nuova partita» moves the focus to the title of the page (the button is gone)', g4.focus === 'appTitle' && g4.game, g4);

  // ------------------------------------------------------------------ free scenario: labels, focus, one h1
  console.log('— free scenario and form labels');
  const lb = await ev(() => ['nation', 'startYear', 'premise', 'actionInput', 'jump', 'diploTarget'].map(id => { const e = document.getElementById(id); return { id, label: e.labels && e.labels[0] ? e.labels[0].textContent.trim() : null }; }));
  check('every field has a label tied to it (for / id)', lb.every(x => !!x.label), lb);
  check('the diplomacy message and the marker name have an accessible name', (await ev(() => !!document.getElementById('diploInput').getAttribute('aria-label') && !!document.getElementById('pp-markerName').getAttribute('aria-label'))));
  await page.fill('#nation', 'Roma');
  await page.fill('#startYear', '400');
  await page.click('#startBtn');
  const g5 = await ev(() => ({ focus: document.activeElement.id, level: document.getElementById('gameTitle').getAttribute('aria-level'), h1: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]')].filter(h => h.checkVisibility() && +(h.getAttribute('aria-level') || h.tagName[1]) === 1).length, setup: document.getElementById('setup').classList.contains('hidden') }));
  check('a free game: the focus is on the game heading, which is the only level 1 (the title of the setup page is hidden)', g5.focus === 'gameTitle' && g5.level === '1' && g5.h1 === 1 && g5.setup, g5);
  await page.click('#tabDiplo');
  await page.fill('#diploTarget', 'il Papa');
  await page.click('#diploStartBtn');
  await ev(() => { window.__textQueue.push({ text: 'Ti ascolto.' }); });
  await page.fill('#diploInput', 'Buongiorno');
  await page.click('#diploSendBtn');
  await page.waitForTimeout(250);
  check('the diplomacy conversation is a log too', (await ev(() => ({ role: document.getElementById('diploLog').getAttribute('role'), has: document.getElementById('diploLog').textContent.includes('Ti ascolto.') }))).role === 'log');
  await page.click('#newGameBtn');

  // ------------------------------------------------------------------ dialogs
  console.log('— dialogs');
  await ev(() => { document.activeElement.blur(); });
  await page.focus('#exportBtn');
  await page.keyboard.press('Enter');
  const d1 = await ev(() => ({ open: document.getElementById('transferDialog').open, inside: document.getElementById('transferDialog').contains(document.activeElement) }));
  const snap = await page.locator('#transferDialog').ariaSnapshot();
  check('a dialog opens with the focus inside, and is a dialog with a name for the reader', d1.open && d1.inside && /dialog "Esporta lo scenario"/.test(snap), { d1, snap: snap.slice(0, 120) });
  await page.keyboard.press('Escape');
  const d2 = await ev(() => ({ open: document.getElementById('transferDialog').open, focus: document.activeElement.id }));
  check('Escape closes it and the focus returns to the button that opened it', !d2.open && d2.focus === 'exportBtn', d2);

  // ------------------------------------------------------------------ reduced motion
  console.log('— reduced motion');
  const mo0 = await ev(() => { const T = window.__t, id = Object.keys(T.provinces)[0], p = T.provinceEls[id][0]; p.classList.add('flash');
    const r = { reduce: matchMedia('(prefers-reduced-motion: reduce)').matches, anim: getComputedStyle(p).animationName, behavior: T.scrollBehavior(), transition: getComputedStyle(document.querySelector('.meter-fill')).transitionDuration }; p.classList.remove('flash'); return r; });
  check('without a preference the flash pulses, the bars slide and the page scrolls smoothly (control)', mo0.reduce === false && mo0.anim === 'flashpulse' && mo0.behavior === 'smooth' && mo0.transition === '0.5s', mo0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const mo1 = await ev(() => { const T = window.__t, id = Object.keys(T.provinces)[0], p = T.provinceEls[id][0]; p.classList.add('flash');
    T.addMarker({ tipo: 'base', nome: 'Prova del movimento', provincia: id }, 'motore'); T.updateLabels();
    const r = { reduce: matchMedia('(prefers-reduced-motion: reduce)').matches, anim: getComputedStyle(p).animationName, behavior: T.scrollBehavior(), transition: getComputedStyle(document.querySelector('.meter-fill')).transitionDuration,
      running: document.getAnimations().filter(a => a.constructor.name === 'CSSAnimation' && a.playState === 'running').length, stroke: getComputedStyle(p).strokeWidth };
    p.classList.remove('flash'); T.clearMarkers(); return r; });
  check('with reduced motion: no pulse, no sliding bars, no smooth scrolling, no animation running', mo1.reduce && mo1.anim === 'none' && mo1.behavior === 'auto' && parseFloat(mo1.transition) <= 0.001 && mo1.running === 0, mo1);
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  // ------------------------------------------------------------------ forced colours (Windows high-contrast themes)
  console.log('— high-contrast mode (forced colours)');
  await page.emulateMedia({ forcedColors: 'active' });
  await ev(() => { document.activeElement.blur(); const T = window.__t, id = Object.keys(T.provinces).find(i => T.provinces[i].owner === 'FRG'); T.goHome(); T.provinceEls[id][0].focus(); });
  await page.keyboard.press('ArrowRight');
  const fc = await ev(() => {
    const ring = document.querySelector('#mapLayer .foc-ring'), cas = document.querySelector('#mapLayer .foc-casing');
    const act = document.querySelector('.mode-btn.active'), off = document.querySelector('.mode-btn:not(.active)'), dot = document.querySelector('.dot.nato');
    return { on: matchMedia('(forced-colors: active)').matches, ring: ring && getComputedStyle(ring).stroke, casing: cas && getComputedStyle(cas).stroke,
      active: getComputedStyle(act).backgroundColor, inactive: getComputedStyle(off).backgroundColor, dot: dot && getComputedStyle(dot).backgroundColor, canvas: getComputedStyle(document.body).backgroundColor };
  });
  check('in forced colours the focus ring and its casing take two different system colours (one of them always shows)', fc.on && !!fc.ring && !!fc.casing && fc.ring !== fc.casing, fc);
  check('…the active mode button still looks different from the other one', fc.active !== fc.inactive, fc);
  check('…and the colour keys of the legend keep their colours', !!fc.dot && fc.dot !== fc.canvas && fc.dot !== 'rgba(0, 0, 0, 0)', fc);
  await page.emulateMedia({ forcedColors: 'none' });

  check('no page errors', errors.length === 0, errors);
  await browser.close();
  process.exit(summary() ? 1 : 0);
})();
