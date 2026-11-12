// Stati: la pagina legge nome, capitale, alleanza, colore e giocabilità dal file src/data/states_1960.json (versione 30, issue #3), e la scheda
// del territorio segna ogni capitale e ogni alleanza «non verificata» finché il file non dice il contrario.
// Si prova che ogni scheda dica ciò che dice il file, che nulla venga mostrato come verificato senza che il file lo dica, che la richiesta
// all'AI e i salvataggi restino come prima, e che la pagina si fermi con un avviso chiaro (non con una pagina vuota) se i dati degli Stati
// mancano o sono rotti (guasti messi apposta). Il file dei dati si legge dal disco, non dalla pagina: così le attese non dipendono dal
// codice che si prova.
const fs = require('fs');
const path = require('path');
const { launch, check, summary } = require('./harness');

const FILE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'data', 'states_1960.json'), 'utf8'));
const STATO = Object.fromEntries(FILE.states.map(s => [s.id, s]));
const BLOCCO = /<script type="application\/json" id="states-1960-data">[\s\S]*?<\/script>/;
const dv = t => /da verificare/i.test(t);
// «valore (non verificata)», a meno che il testo dica già «da verificare» o il file dica che è verificato
const segna = (testo, verificato, parola) => (verificato === true || dv(testo) ? testo : testo + ' (' + parola + ')');
// Le frasi delle avvertenze del file, scritte qui a mano (non lette dalla pagina)
const FRASE = {
  capitale_da_verificare: 'la capitale è «da verificare»: il prototipo non la conosce',
  alleanza_da_verificare: "l'alleanza è «da verificare»: il prototipo non la conosce",
};
// Le righe della nota «Capitale e alleanza: fonte e verifica» che il file prevede per uno Stato, nell'ordine di lettura
const righeAttese = s => [
  'Fonte della capitale: ' + FILE.meta.sources[s.capital_source_id],
  'Verifica della capitale: ' + (s.capital_verified === true ? 'verificata' : 'non verificata'),
  "Fonte dell'alleanza: " + FILE.meta.sources[s.alliance_source_id],
  "Verifica dell'alleanza: " + (s.alliance_verified === true ? 'verificata' : 'non verificata'),
  ...(s.flags.length ? ['Avvertenze: ' + s.flags.map(f => FRASE[f]).join('; ')] : []),
  ...(s.note ? ['Nota: ' + s.note] : []),
  'Avvertenza generale: ' + FILE.meta.global_warning,
];
const NOTA_LEGENDA = (c, a) => `Capitali verificate: ${c} su ${FILE.states.length}. Alleanze verificate: ${a} su ${FILE.states.length}. Le altre sono etichette scritte dal prototipo: la scheda del territorio le segna «non verificata».`;

(async () => {
  const { browser, page, errors } = await launch({ width: 390, height: 844 });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  // La scheda di una provincia: le righe visibili (etichetta → testo), la nota su fonte e verifica, e il titolo del suo «details»
  const card = id => ev(i => {
    window.__t.openProvincePanel(i);
    const g = x => document.getElementById(x), clean = s => s.replace(/\s+/g, ' ').trim();
    const rows = {};
    document.querySelectorAll('#provincePanel .pp-row').forEach(r => {
      if (r.classList.contains('hidden') || r.closest('.editor-only')) return;
      rows[clean(r.children[0].textContent)] = clean(r.children[1].textContent);
    });
    const det = g('pp-statedet');
    return { rows, lines: [...g('pp-statenote').children].map(c => clean(c.textContent)),
      det: { hidden: det.classList.contains('hidden'), open: det.open, summary: clean(det.querySelector('summary').textContent) }, all: clean(g('provincePanel').textContent) };
  }, id);
  const idOf = (name, owner) => ev(([n, o]) => Object.keys(window.__t.provinces).find(id => window.__t.provinces[id].name === n && (!o || window.__t.provinces[id].owner === o)), [name, owner]);
  const firstOf = state => ev(s => Object.keys(window.__t.provinces).find(id => window.__t.initialTerritory[id].owner === s), state);

  console.log('— la pagina ha la copia identica del file degli Stati');
  check('i dati nella pagina sono quelli del file, parola per parola', (await ev(() => JSON.stringify(window.__t.STATES))) === JSON.stringify(FILE));
  check('la pagina ha tanti Stati quanti il file (' + FILE.states.length + '), nello stesso ordine', JSON.stringify(await ev(() => Object.keys(window.__t.countries))) === JSON.stringify(FILE.states.map(s => s.id)));
  const diversi = await ev(file => {
    const bad = [];
    for (const s of file.states) {
      const c = window.__t.countries[s.id];
      for (const k of ['name', 'capital', 'alliance', 'color', 'playable']) if (c[k] !== s[k]) bad.push(s.id + '.' + k);
      if (c.record !== window.__t.STATES.states.find(x => x.id === s.id)) bad.push(s.id + '.record');
    }
    return bad;
  }, FILE);
  check('ogni Stato ha nome, capitale, alleanza, colore e giocabilità del file, e il suo record', diversi.length === 0, diversi.slice(0, 5));
  const flagSenzaTesto = await ev(l => l.filter(x => !Object.prototype.hasOwnProperty.call(window.__t.STATE_FLAG_TEXT, x)), [...new Set(FILE.states.flatMap(s => s.flags))]);
  check('ogni avvertenza (flag) usata dal file ha una frase per chi legge', flagSenzaTesto.length === 0, flagSenzaTesto);
  const main = await ev(() => Object.keys(window.__t.provinces).filter(id => /_MAIN$/.test(id)).map(id => { const p = window.__t.provinces[id]; return [id, p.owner, p.capital, p.capitalOf]; }));
  check('le ' + main.length + ' province degli Stati senza suddivisioni hanno la capitale del file e sanno di chi è', main.length === 36 && main.every(([id, o, cap, di]) => id === o + '_MAIN' && STATO[o] && cap === STATO[o].capital && di === o), main.filter(([id, o, cap, di]) => !(STATO[o] && cap === STATO[o].capital && di === o)).slice(0, 4));

  console.log('— per ogni provincia la scheda dice ciò che dice il file (tutte le schede)');
  const tutte = await ev(() => {
    const T = window.__t, g = x => document.getElementById(x), clean = s => s.replace(/\s+/g, ' ').trim(), out = {};
    for (const id in T.provinces) {
      T.openProvincePanel(id);
      const rows = {};
      document.querySelectorAll('#provincePanel .pp-row').forEach(r => {
        if (r.classList.contains('hidden') || r.closest('.editor-only')) return;
        rows[clean(r.children[0].textContent)] = clean(r.children[1].textContent);
      });
      const det = g('pp-statedet');
      out[id] = { owner: T.provinces[id].owner, rows, lines: [...g('pp-statenote').children].map(c => clean(c.textContent)),
        det: { hidden: det.classList.contains('hidden'), open: det.open, summary: clean(det.querySelector('summary').textContent) } };
    }
    return out;
  });
  const ids = Object.keys(tutte);
  const sbagliate = { alleanza: [], capitale: [], capoluogo: [], nota: [], dettagli: [] };
  let nMain = 0, nUnita = 0;
  for (const id of ids) {
    const c = tutte[id], s = STATO[c.owner], main = /_MAIN$/.test(id);
    if (!s) { sbagliate.nota.push(id + ': proprietario ' + c.owner + ' non nel file'); continue; }
    if (c.rows['Alleanza del proprietario'] !== segna(s.alliance, s.alliance_verified, 'non verificata')) sbagliate.alleanza.push(id + ' «' + c.rows['Alleanza del proprietario'] + '»');
    if (main) {
      nMain++;
      if (c.rows['Capitale del proprietario'] !== undefined) sbagliate.capitale.push(id + ': riga «Capitale del proprietario» che ripete il capoluogo');
      if (c.rows['Capoluogo'] !== segna(s.capital, s.capital_verified, 'non verificato')) sbagliate.capoluogo.push(id + ' «' + c.rows['Capoluogo'] + '»');
    } else {
      nUnita++;
      if (c.rows['Capitale del proprietario'] !== segna(s.capital, s.capital_verified, 'non verificata')) sbagliate.capitale.push(id + ' «' + c.rows['Capitale del proprietario'] + '»');
      if (c.rows['Capoluogo'] !== 'da verificare') sbagliate.capoluogo.push(id + ' «' + c.rows['Capoluogo'] + '»');
    }
    if (JSON.stringify(c.lines) !== JSON.stringify(righeAttese(s))) sbagliate.nota.push(id + ' ' + JSON.stringify(c.lines).slice(0, 160));
    if (c.det.hidden || c.det.open || c.det.summary !== 'Capitale e alleanza: fonte e verifica') sbagliate.dettagli.push(id + ' ' + JSON.stringify(c.det));
  }
  check('tutte le ' + ids.length + ' schede: «Alleanza del proprietario» è l\'alleanza del file, «non verificata» dove il file non dice altro', ids.length > 1000 && sbagliate.alleanza.length === 0, sbagliate.alleanza.slice(0, 4));
  check('le ' + nMain + ' province di Stati senza suddivisioni: «Capoluogo» è la capitale del file, «non verificato», e non c\'è una seconda riga uguale', nMain === 36 && sbagliate.capoluogo.length === 0, sbagliate.capoluogo.slice(0, 4));
  check('le ' + nUnita + ' unità regionali: «Capoluogo» resta «da verificare» e «Capitale del proprietario» è la capitale del file, «non verificata»', nUnita === 984 && sbagliate.capitale.length === 0, sbagliate.capitale.slice(0, 4));
  check('ogni scheda ha la nota su fonte e verifica come la prevede il file (fonti, verifica, avvertenze, nota, avvertenza generale)', sbagliate.nota.length === 0, sbagliate.nota.slice(0, 3));
  check('la nota «Capitale e alleanza: fonte e verifica» c\'è su ogni scheda ed è chiusa finché non la si apre', sbagliate.dettagli.length === 0, sbagliate.dettagli.slice(0, 3));
  check('nessuna scheda mostra «undefined», «null», «NaN» o «[object»', (await ev(() => {
    const T = window.__t, bad = [];
    for (const id in T.provinces) { T.openProvincePanel(id); if (/\b(undefined|NaN|null)\b|\[object/.test(document.getElementById('provincePanel').textContent)) bad.push(id); }
    return bad;
  })).length === 0);
  const senzaVerifica = ids.filter(id => /\bverificat[ao]\b/.test(Object.values(tutte[id].rows).join(' | ').replace(/non verificat[ao]/g, '').replace(/da verificare/g, '')));
  check('nessuna riga della scheda dice «verificata» o «verificato» senza «non»: finché il file non lo dice, niente è verificato', senzaVerifica.length === 0, senzaVerifica.slice(0, 4));

  console.log('— casi scelti a mano (le frasi sono scritte qui, non ricavate dal file)');
  const fra = await card(await firstOf('FRA'));
  check('Francia (unità regionale): capoluogo «da verificare», capitale «Parigi (non verificata)», alleanza «NATO (non verificata)»',
    fra.rows['Capoluogo'] === 'da verificare' && fra.rows['Capitale del proprietario'] === 'Parigi (non verificata)' && fra.rows['Alleanza del proprietario'] === 'NATO (non verificata)', fra.rows);
  check('Francia: la nota dice che la fonte è l\'etichetta del prototipo e che la capitale non è verificata',
    fra.lines[0] === 'Fonte della capitale: Etichetta scritta dal prototipo (versione 29 e precedenti), senza una fonte: non è un dato verificato.' && fra.lines[1] === 'Verifica della capitale: non verificata' && fra.lines[3] === "Verifica dell'alleanza: non verificata", fra.lines.slice(0, 4));
  const ukr = await card('UKR_MAIN');
  check('Ucraina: «Kiev (non verificato)» e «Patto di Varsavia (non verificata)»; la riga della capitale non è ripetuta',
    ukr.rows['Capoluogo'] === 'Kiev (non verificato)' && ukr.rows['Alleanza del proprietario'] === 'Patto di Varsavia (non verificata)' && !('Capitale del proprietario' in ukr.rows), ukr.rows);
  const kwt = await card('KWT_MAIN');
  check('Kuwait: «Kuwait City (non verificato)» e «Protettorato britannico (non verificata)»', kwt.rows['Capoluogo'] === 'Kuwait City (non verificato)' && kwt.rows['Alleanza del proprietario'] === 'Protettorato britannico (non verificata)', kwt.rows);
  check('Kuwait: la nota dice che l\'etichetta segue lo status controllato online ma non è segnata come verificata',
    kwt.lines.some(t => t.startsWith('Nota: L\'etichetta di alleanza segue lo status politico al 31 dicembre 1960') && t.includes('docs/STATUS-1960.md') && t.includes('non è segnata come verificata')), kwt.lines);
  const cyp = await card(await firstOf('CYP'));
  check('Cipro: l\'alleanza dice «da verificare» e basta (niente «non verificata» in più), la capitale è «Nicosia (non verificata)»', cyp.rows['Alleanza del proprietario'] === 'da verificare' && cyp.rows['Capitale del proprietario'] === 'Nicosia (non verificata)', cyp.rows);
  check('Cipro: l\'avvertenza dice che il prototipo non conosce l\'alleanza', cyp.lines.includes("Avvertenze: l'alleanza è «da verificare»: il prototipo non la conosce"), cyp.lines);
  const omn = await card('OMN_MAIN');
  check('Oman: «Mascate (non verificato)» e alleanza «da verificare»', omn.rows['Capoluogo'] === 'Mascate (non verificato)' && omn.rows['Alleanza del proprietario'] === 'da verificare', omn.rows);
  const are = await card('ARE_MAIN');
  check('Stati della Tregua: capoluogo «da verificare» e basta, alleanza «Protettorato britannico (non verificata)»', are.rows['Capoluogo'] === 'da verificare' && are.rows['Alleanza del proprietario'] === 'Protettorato britannico (non verificata)', are.rows);
  check('Stati della Tregua: l\'avvertenza dice che il prototipo non conosce la capitale', are.lines.includes('Avvertenze: la capitale è «da verificare»: il prototipo non la conosce'), are.lines);
  const brb = await card('BRB_MAIN');
  check('Borneo Britannico: capoluogo «da verificare» e basta', brb.rows['Capoluogo'] === 'da verificare' && brb.rows['Alleanza del proprietario'] === 'Colonia britannica (non verificata)', brb.rows);
  const pak = await card(await idOf('Bahawalpur', 'PAK'));
  check('Pakistan (una divisione): la capitale dice già «da verificare», quindi resta com\'è; l\'alleanza «SEATO e CENTO (non verificata)»',
    pak.rows['Capitale del proprietario'] === 'Rawalpindi (capitale provvisoria dal 1959 — da verificare)' && pak.rows['Alleanza del proprietario'] === 'SEATO e CENTO (non verificata)', pak.rows);
  const btn = await card(await firstOf('BTN'));
  check('Bhutan (un\'unità): «Thimphu (da verificare)» resta com\'è, senza «non verificata» in più', btn.rows['Capitale del proprietario'] === 'Thimphu (da verificare)', btn.rows);
  const isr = await card('ISR_MAIN');
  check('Israele: «Gerusalemme (status contestato) (non verificato)»: il testo del prototipo resta intero, con la sua parentesi', isr.rows['Capoluogo'] === 'Gerusalemme (status contestato) (non verificato)', isr.rows);
  const kaz = await card('KAZ_MAIN');
  check('Kazakistan: il nome di allora e di oggi restano nel testo: «Alma-Ata (oggi Almaty) (non verificato)»', kaz.rows['Capoluogo'] === 'Alma-Ata (oggi Almaty) (non verificato)', kaz.rows);
  const sovietici = ['UKR', 'BLR', 'MDA', 'EST', 'LVA', 'LTU', 'GEO', 'ARM', 'AZE', 'KAZ', 'UZB', 'TKM', 'TJK', 'KGZ'];
  const schedeSov = [];
  for (const sid of sovietici) schedeSov.push((await card(sid + '_MAIN')).rows['Alleanza del proprietario']);
  check('le 14 repubbliche sovietiche (Stati separati e giocabili): alleanza «Patto di Varsavia (non verificata)», come nel file', schedeSov.every(t => t === 'Patto di Varsavia (non verificata)'), schedeSov);

  console.log('— la legenda dice quante capitali e alleanze sono verificate');
  const leg = await ev(() => ({ testo: document.getElementById('legendNote').textContent, dopoLegenda: document.getElementById('legendNote').previousElementSibling.className }));
  check('legenda: «Capitali verificate: 0 su 83. Alleanze verificate: 0 su 83…», scritta dai dati', leg.testo === NOTA_LEGENDA(0, 0), leg.testo);
  check('la nota sta subito dopo le cinque famiglie di alleanza', leg.dopoLegenda === 'legend', leg.dopoLegenda);

  console.log('— la richiesta all\'AI e i salvataggi non cambiano');
  await ev(() => { window.__t.resetGame && window.__t.resetGame(); window.__t.startFixedScenarioGame('FRA'); });
  const richiesta = await ev(() => window.__t.turnPrompt(['azione di prova'], '1 mese', true));
  check('la richiesta nomina l\'alleanza come prima: «Il giocatore guida Francia (alleanza: NATO)»', richiesta.includes('Il giocatore guida Francia (alleanza: NATO)'), richiesta.slice(0, 200));
  check('la richiesta non contiene nulla della verifica («non verificat», PROTOTYPE_LABEL, capital_verified)', !/non verificat|PROTOTYPE_LABEL|_verified|_source_id/.test(richiesta));
  const salvataggio = await ev(() => JSON.stringify(window.__t.buildSavePayload()));
  check('il salvataggio non contiene nulla degli Stati del file (verifica, fonti, flag): schemaVersion e contenuto restano quelli di prima', !/PROTOTYPE_LABEL|_verified|_source_id|capitale_da_verificare|alleanza_da_verificare/.test(salvataggio) && /"schemaVersion":3/.test(salvataggio), salvataggio.slice(0, 160));

  console.log('— un territorio ceduto a un altro Stato: la scheda segue il nuovo proprietario');
  await ev(() => { window.__t.resetGame && window.__t.resetGame(); });
  const ceduto = await ev(() => {
    const T = window.__t, p = T.provinces.KWT_MAIN, vecchio = p.owner, g = x => document.getElementById(x), clean = s => s.replace(/\s+/g, ' ').trim();
    try {
      p.owner = 'FRA';
      T.openProvincePanel('KWT_MAIN');
      return { rows: Object.fromEntries([...document.querySelectorAll('#provincePanel .pp-row')].filter(r => !r.classList.contains('hidden') && !r.closest('.editor-only')).map(r => [clean(r.children[0].textContent), clean(r.children[1].textContent)])),
        prima: clean(g('pp-statenote').children[0].textContent) };
    } finally { p.owner = vecchio; T.openProvincePanel('KWT_MAIN'); }
  });
  check('Kuwait ceduto alla Francia: il capoluogo resta «Kuwait City (non verificato)»; compaiono la capitale e l\'alleanza della Francia, «non verificate»',
    ceduto.rows['Capoluogo'] === 'Kuwait City (non verificato)' && ceduto.rows['Capitale del proprietario'] === 'Parigi (non verificata)' && ceduto.rows['Alleanza del proprietario'] === 'NATO (non verificata)', ceduto.rows);
  check('la nota è quella della Francia, non del Kuwait', ceduto.prima === 'Fonte della capitale: ' + FILE.meta.sources[STATO.FRA.capital_source_id]);
  const dopo = await card('KWT_MAIN');
  check('restituito il territorio, la scheda del Kuwait torna com\'era (nessuna riga in più)', dopo.rows['Alleanza del proprietario'] === 'Protettorato britannico (non verificata)' && !('Capitale del proprietario' in dopo.rows), dopo.rows);

  console.log('— la nota si apre da tastiera, ha un\'area di tocco da 24 px e non fa scorrere la pagina di lato');
  await card(await idOf('Bahawalpur', 'PAK'));
  await page.focus('#pp-statedet summary');
  await page.keyboard.press('Enter');
  const k1 = await ev(() => document.getElementById('pp-statedet').open);
  await page.keyboard.press('Space');
  const k2 = await ev(() => document.getElementById('pp-statedet').open);
  check('da tastiera: Invio apre la nota su fonte e verifica, Spazio la richiude', k1 === true && k2 === false, [k1, k2]);
  await page.evaluate(() => { document.getElementById('pp-statedet').open = true; });
  const dim = await ev(() => { const r = document.querySelector('#pp-statedet summary').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height * 10) / 10]; });
  check('il titolo «Capitale e alleanza: fonte e verifica» è grande almeno 24 × 24 px', dim[0] >= 24 && dim[1] >= 23.5, dim);
  const sbordi = [];
  for (const id of [await idOf('Bahawalpur', 'PAK'), 'KWT_MAIN', 'ARE_MAIN', await firstOf('CYP')]) {
    await card(id);
    await page.evaluate(() => { document.getElementById('pp-statedet').open = true; document.querySelectorAll('#pp-popnote details').forEach(d => { d.open = true; }); });
    sbordi.push(await ev(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
  }
  check('su un telefono (390 px), con la nota aperta, Pakistan, Kuwait, Stati della Tregua e Cipro non fanno scorrere la pagina di lato', sbordi.every(x => x <= 0), sbordi);
  await page.evaluate(() => { document.getElementById('pp-statedet').open = false; });
  const contrasto = () => ev(() => {
    const lum = c => { const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const out = {};
    for (const [k, sel, fondo] of [['riga della nota', '#pp-statenote > div', '#provincePanel'], ['grassetto', '#pp-statenote b', '#provincePanel'], ['titolo', '#pp-statedet summary', '#provincePanel'], ['legenda', '#legendNote', '#fixedScenarioPanel']]) {
      const e = document.querySelector(sel); out[k] = e ? Math.round(ratio(getComputedStyle(e).color, getComputedStyle(document.querySelector(fondo)).backgroundColor) * 10) / 10 : null;
    }
    return out;
  });
  await page.evaluate(() => { document.getElementById('pp-statedet').open = true; });
  const chiaro = await contrasto();
  check('tema chiaro: la nota, il titolo e la legenda hanno almeno 4,5 : 1', Object.values(chiaro).every(v => v !== null && v >= 4.5), chiaro);
  await page.emulateMedia({ colorScheme: 'dark' });
  const scuro = await contrasto();
  check('tema scuro: la nota, il titolo e la legenda hanno almeno 4,5 : 1', Object.values(scuro).every(v => v !== null && v >= 4.5), scuro);
  await page.emulateMedia({ colorScheme: 'light' });

  check('nessun errore della pagina (prove con la pagina intera)', errors.length === 0, errors);
  await browser.close();

  console.log('— guasti messi apposta nei dati: la scheda non mente e non si rompe');
  // Ogni variante cambia il testo della pagina (il file su disco non cambia). Tutte devono aprirsi e mostrare ciò che dicono i dati cambiati.
  const cambia = (da, a) => h => { if (!h.includes(da)) throw new Error('il guasto non trova il testo da cambiare: ' + da); return h.replace(da, a); };
  const FRA_CAP = '"capital": "Parigi", "capital_verified": false';
  const v1 = await launch({ width: 390, height: 844, transform: cambia(FRA_CAP, '"capital": "Parigi", "capital_verified": true') });
  const f1 = await v1.page.evaluate(() => {
    const T = window.__t, id = Object.keys(T.provinces).find(i => T.initialTerritory[i].owner === 'FRA'), ita = Object.keys(T.provinces).find(i => T.initialTerritory[i].owner === 'ITA');
    const riga = (i, label) => { T.openProvincePanel(i); return [...document.querySelectorAll('#provincePanel .pp-row')].filter(r => r.children[0].textContent === label).map(r => r.children[1].textContent)[0]; };
    T.openProvincePanel(id);
    return { cap: riga(id, 'Capitale del proprietario'), all: riga(id, 'Alleanza del proprietario'), v: document.getElementById('pp-statenote').children[1].textContent, leg: document.getElementById('legendNote').textContent, ita: riga(ita, 'Capitale del proprietario') };
  });
  check('capitale della Francia segnata verificata nel file: la scheda dice «Parigi» senza «(non verificata)» e «Verifica della capitale: verificata»', f1.cap === 'Parigi' && f1.v === 'Verifica della capitale: verificata', f1);
  check('…ma l\'alleanza della Francia resta «NATO (non verificata)» e l\'Italia resta «non verificata»', f1.all === 'NATO (non verificata)' && f1.ita === 'Roma (non verificata)', f1);
  check('…e la legenda conta una capitale verificata su 83', f1.leg === NOTA_LEGENDA(1, 0), f1.leg);
  check('…senza errori della pagina', v1.errors.length === 0, v1.errors);
  await v1.browser.close();

  const v2 = await launch({ width: 390, height: 844, transform: cambia('"alliance": "Protettorato britannico", "alliance_verified": false, "alliance_source_id": "PROTOTYPE_LABEL", "color": "#ab9e78"',
    '"alliance": "Protettorato britannico", "alliance_verified": true, "alliance_source_id": "PROTOTYPE_LABEL", "color": "#ab9e78"') });
  const f2 = await v2.page.evaluate(() => { window.__t.openProvincePanel('KWT_MAIN'); return { rows: [...document.querySelectorAll('#provincePanel .pp-row')].map(r => r.children[0].textContent + '=' + r.children[1].textContent), leg: document.getElementById('legendNote').textContent }; });
  check('alleanza del Kuwait segnata verificata nel file: la scheda dice «Protettorato britannico» senza «non verificata»; il capoluogo resta «non verificato»',
    f2.rows.includes('Alleanza del proprietario=Protettorato britannico') && f2.rows.includes('Capoluogo=Kuwait City (non verificato)'), f2.rows);
  check('…e la legenda conta un\'alleanza verificata su 83', f2.leg === NOTA_LEGENDA(0, 1), f2.leg);
  await v2.browser.close();

  const v3 = await launch({ width: 390, height: 844, transform: cambia('"capital": "Parigi", "capital_verified": false, "capital_source_id": "PROTOTYPE_LABEL", "alliance": "NATO", "alliance_verified": false, "alliance_source_id": "PROTOTYPE_LABEL", "color": "#3b6ea5", "playable": true, "flags": []',
    '"capital": "Parigi", "capital_verified": false, "capital_source_id": "FONTE_NON_REGISTRATA", "alliance": "NATO", "alliance_verified": false, "alliance_source_id": "PROTOTYPE_LABEL", "color": "#3b6ea5", "playable": true, "flags": ["flag_mai_visto", "constructor", "capitale_da_verificare"]') });
  const f3 = await v3.page.evaluate(() => { const T = window.__t, id = Object.keys(T.provinces).find(i => T.initialTerritory[i].owner === 'FRA'); T.openProvincePanel(id); return { l: [...document.getElementById('pp-statenote').children].map(c => c.textContent), all: document.getElementById('provincePanel').textContent }; });
  check('fonte non registrata: si legge il codice, non «undefined»', f3.l[0] === 'Fonte della capitale: FONTE_NON_REGISTRATA' && !f3.all.includes('undefined'), f3.l);
  check('avvertenza sconosciuta o con il nome di un attributo di JavaScript: si legge il codice; quella nota ha la sua frase',
    f3.l.includes('Avvertenze: flag_mai_visto; constructor; la capitale è «da verificare»: il prototipo non la conosce'), f3.l);
  await v3.browser.close();

  const v4 = await launch({ width: 390, height: 844, transform: h => cambia('"capital": "Parigi", "capital_verified": false, ', '"capital": "Parigi", ')(cambia('"playable": true, "flags": [], "note": null},\n    {"id": "BEL"', '"playable": true, "note": null},\n    {"id": "BEL"')(h)) });
  const f4 = await v4.page.evaluate(() => { const T = window.__t, id = Object.keys(T.provinces).find(i => T.initialTerritory[i].owner === 'FRA'); T.openProvincePanel(id);
    return { cap: [...document.querySelectorAll('#provincePanel .pp-row')].filter(r => r.children[0].textContent === 'Capitale del proprietario').map(r => r.children[1].textContent)[0], l: [...document.getElementById('pp-statenote').children].map(c => c.textContent) }; });
  check('record senza «capital_verified» né «flags»: la scheda lo tratta da non verificato, senza avvertenze e senza rompersi', f4.cap === 'Parigi (non verificata)' && f4.l[1] === 'Verifica della capitale: non verificata' && !f4.l.some(t => t.startsWith('Avvertenze:')), f4);
  check('…senza errori della pagina', v4.errors.length === 0, v4.errors);
  await v4.browser.close();

  console.log('— guasti messi apposta nella pagina: dati degli Stati assenti o rotti → avviso chiaro, non una pagina vuota');
  const pezzo = '{"id": "FRA", "name": "Francia"';
  const varianti = [
    ['senza il blocco dei dati', h => h.replace(BLOCCO, ''), 'nella pagina manca il blocco dei dati degli Stati'],
    ['con un blocco che non è JSON', h => h.replace(BLOCCO, '<script type="application/json" id="states-1960-data">{ rotto</script>'), 'JSON'],
    ['con un blocco senza «states»', h => h.replace(BLOCCO, '<script type="application/json" id="states-1960-data">{"meta":{},"states":5}</script>'), "nel file dei dati manca l'elenco «states»"],
    ['con l\'elenco degli Stati vuoto', h => h.replace(BLOCCO, '<script type="application/json" id="states-1960-data">{"meta":{},"states":[]}</script>'), "nel file dei dati manca l'elenco «states»"],
    ['con una capitale mancante nel primo Stato', cambia('"name": "Francia", "capital": "Parigi", ', '"name": "Francia", '), 'lo Stato n. 1: il campo «capital» manca o non è valido'],
    ['con «playable» scritto come testo', cambia('"color": "#3b6ea5", "playable": true', '"color": "#3b6ea5", "playable": "sì"'), 'lo Stato n. 1: il campo «playable» manca o non è valido'],
    ['con un identificativo in minuscolo', cambia(pezzo, '{"id": "fra", "name": "Francia"'), 'lo Stato n. 1: il campo «id» manca o non è valido'],
    ['con l\'identificativo «__proto__»', cambia(pezzo, '{"id": "__proto__", "name": "Francia"'), 'lo Stato n. 1: il campo «id» manca o non è valido'],
    ['con uno Stato scritto due volte', cambia('{"id": "BEL"', '{"id": "FRA", "name": "Doppione", "capital": "X", "alliance": "Y", "color": "#000000", "playable": true},\n    {"id": "BEL"'), 'lo Stato «FRA» compare due volte'],
  ];
  for (const [nome, transform, atteso] of varianti) {
    const v = await launch({ width: 390, height: 844, transform, waitForHook: false });
    const s = await v.page.evaluate(() => {
      const box = document.getElementById('statesError'), setup = document.getElementById('setup'), game = document.getElementById('game');
      return { visibile: !box.classList.contains('hidden') && getComputedStyle(box).display !== 'none', ruolo: box.getAttribute('role'), testo: box.textContent,
        setup: setup && getComputedStyle(setup).display, game: game && getComputedStyle(game).display, gancio: typeof window.__t, titolo: document.title };
    });
    check(nome + ': compare l\'avviso «Il prototipo non può partire…» con il motivo, ed è un role="alert"', s.visibile && s.ruolo === 'alert' && s.testo.startsWith('Il prototipo non può partire: i dati degli Stati non sono stati letti (') && s.testo.includes(atteso) && s.testo.includes('Prova a ricaricare la pagina'), s);
    check(nome + ': il resto della pagina non si vede e non parte', s.setup === 'none' && s.game === 'none' && s.gancio === 'undefined', s);
    check(nome + ': l\'unico errore è il messaggio nella console, non un\'eccezione', v.errors.length === 1 && v.errors[0].startsWith('console.error: Dati degli Stati non letti: ') && v.errors[0].includes(atteso), v.errors);
    await v.browser.close();
  }

  process.exit(summary() ? 1 : 0);
})();
