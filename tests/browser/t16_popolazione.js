// Popolazione 1960: la pagina legge i dati dal file src/data/population_1960.json (issue #8).
// Si prova che ogni scheda mostri ciò che dice il file (valore, stato, perimetro, fonte, verifica, avvertenze, altro valore),
// che nessuna scheda mostri «undefined», che i valori non vengano sommati né divisi, e che la pagina resti viva
// anche se il blocco dei dati manca o è rotto (guasti messi apposta). Il file dei dati si legge dal disco, non dalla pagina:
// così le attese non dipendono dal codice che si prova.
const fs = require('fs');
const path = require('path');
const { launch, check, summary } = require('./harness');

const FILE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'data', 'population_1960.json'), 'utf8'));
const f = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const BLOCCO = /<script type="application\/json" id="population-1960-data">[\s\S]*?<\/script>/;

(async () => {
  const { browser, page, errors } = await launch({ width: 390, height: 844 });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const card = id => ev(i => {
    window.__t.openProvincePanel(i);
    const g = x => document.getElementById(x);
    return {
      own: g('pp-population').textContent, rowShown: !g('pp-statepop-row').classList.contains('hidden'), label: g('pp-statepop-label').textContent,
      statepop: g('pp-statepop').textContent, note: g('pp-popnote').textContent, all: g('provincePanel').textContent,
      lines: [...g('pp-popnote').children].map(c => c.textContent),
    };
  }, id);
  const L = (c, label) => c.lines.find(t => t.startsWith(label)) || null;
  const idOf = (name, owner) => ev(([n, o]) => Object.keys(window.__t.provinces).find(id => window.__t.provinces[id].name === n && (!o || window.__t.provinces[id].owner === o)), [name, owner]);
  const firstOf = state => ev(s => Object.keys(window.__t.provinces).find(id => window.__t.initialTerritory[id].owner === s), state);
  const rec = id => FILE.records.find(r => r.id === id);

  console.log('— la pagina ha la copia identica del file dei dati');
  check('i dati nella pagina sono quelli del file, parola per parola', (await ev(() => JSON.stringify(window.__t.POP))) === JSON.stringify(FILE));
  const senzaPosto = await ev(file => file.records.filter(r => r.map_id && !(window.__t.countries[r.map_id] || r.map_id === 'PAK_W' || r.map_id === 'PAK_E')).map(r => r.id), FILE);
  check('ogni map_id del file è uno Stato della mappa o un\'ala del Pakistan (nessun record perso in silenzio)', senzaPosto.length === 0, senzaPosto);
  check('la pagina non ha messo da parte nessun record «senza posto»', (await ev(() => window.__t.popUnplaced.map(r => r.id))).length === 0, await ev(() => window.__t.popUnplaced.map(r => r.id)));
  check('la pagina non ha segnalato errori di lettura', (await ev(() => window.__t.getPopLoadError())) === null);
  const flagUsati = [...new Set(FILE.records.flatMap(r => r.flags))];
  const flagSenzaTesto = await ev(l => l.filter(x => !Object.prototype.hasOwnProperty.call(window.__t.POP_FLAG_TEXT, x)), flagUsati);
  check('ogni avvertenza (flag) usata dal file ha una frase per chi legge (' + flagUsati.length + ' codici)', flagSenzaTesto.length === 0, flagSenzaTesto);

  console.log('— per ogni provincia il valore mostrato è quello del file (tutte le schede)');
  const sbagliate = await ev(file => {
    const T = window.__t, bad = [], fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const g = x => document.getElementById(x);
    const byMap = {};
    file.records.forEach(r => { if (r.map_id) (byMap[r.map_id] = byMap[r.map_id] || []).push(r); });
    const howMany = {};
    for (const id in T.provinces) howMany[T.initialTerritory[id].owner] = (howMany[T.initialTerritory[id].owner] || 0) + 1;
    let n = 0;
    for (const id in T.provinces) {
      n++;
      T.openProvincePanel(id);
      const home = T.initialTerritory[id].owner, recs = byMap[home] || [];
      const got = { own: g('pp-population').textContent, shown: !g('pp-statepop-row').classList.contains('hidden'), label: g('pp-statepop-label').textContent, sp: g('pp-statepop').textContent };
      let want;
      if (home === 'PAK') {                 // una divisione del Pakistan mostra il dato della sua ala, preso dal file
        const w = T.provinces[id].popGroup, fileRec = w && byMap[w.map_id] && byMap[w.map_id][0];
        want = fileRec && (w.map_id === 'PAK_W' || w.map_id === 'PAK_E') && JSON.stringify(w) === JSON.stringify(fileRec)
          ? { own: 'da verificare', shown: true, label: "Popolazione dell'ala", sp: fileRec.entity + ': ' + fmt(fileRec.value) }
          : { broken: "una divisione del Pakistan senza il dato (uguale al file) della sua ala" };
      } else if (recs.length === 0) want = { own: 'da verificare', shown: false, label: 'Popolazione dello Stato', sp: '' };
      else if (recs.length > 1) want = { own: 'da verificare', shown: true, label: 'Popolazione dello Stato', sp: recs.map(r => r.entity + ': ' + fmt(r.value)).join(' · ') };
      else if (howMany[home] === 1) want = { own: fmt(recs[0].value), shown: false, label: 'Popolazione dello Stato', sp: '' };
      else want = { own: 'da verificare', shown: true, label: 'Popolazione dello Stato', sp: T.countries[home].name + ': ' + fmt(recs[0].value) };
      if (want.broken) { bad.push(id + ': ' + want.broken); continue; }
      if (got.own !== want.own || got.shown !== want.shown || got.label !== want.label || got.sp !== want.sp) bad.push(id + ' ' + JSON.stringify(got) + ' ≠ ' + JSON.stringify(want));
    }
    return { n, bad };
  }, FILE);
  check('tutte le ' + sbagliate.n + ' schede mostrano il valore del file: proprio, dello Stato, dell\'ala o i due dello Yemen', sbagliate.n > 900 && sbagliate.bad.length === 0, sbagliate.bad.slice(0, 4));
  const tutteLeSchede = await ev(() => {
    const T = window.__t, bad = [];
    for (const id in T.provinces) {
      T.openProvincePanel(id);
      const t = document.getElementById('provincePanel').textContent;
      if (/\b(undefined|NaN|null)\b|\[object/.test(t)) bad.push(id);
    }
    return bad;
  });
  check('nessuna scheda mostra «undefined», «null», «NaN» o «[object»', tutteLeSchede.length === 0, tutteLeSchede.slice(0, 5));
  const garanzie = await ev(() => {
    const T = window.__t, c = T.countries;
    return { pakistan: [c.PAK.population, c.PAK.populationRecords.length], yemen: [c.YEM.population, c.YEM.populationRecords.length] };
  });
  check('il Pakistan nel suo insieme non ha un dato: solo le due ali ne hanno uno', garanzie.pakistan[0] === null && garanzie.pakistan[1] === 0, garanzie.pakistan);
  check('lo Yemen non ha un valore unico (due record, mai sommati)', garanzie.yemen[0] === null && garanzie.yemen[1] === 2, garanzie.yemen);
  const wingCheck = await ev(() => {
    const T = window.__t, ids = Object.keys(T.provinces).filter(i => T.initialTerritory[i].owner === 'PAK');
    return { n: ids.length, w: ids.filter(i => T.provinces[i].popGroup && T.provinces[i].popGroup.map_id === 'PAK_W').length, e: ids.filter(i => T.provinces[i].popGroup && T.provinces[i].popGroup.map_id === 'PAK_E').length,
      own: ids.filter(i => T.provinces[i].population != null).length };
  });
  check('le divisioni del Pakistan stanno in una delle due ali, nessuna ha un valore proprio', wingCheck.n > 0 && wingCheck.w + wingCheck.e === wingCheck.n && wingCheck.w > 0 && wingCheck.e > 0 && wingCheck.own === 0, wingCheck);

  console.log('— che cosa dice la scheda: fonte, verifica, status, perimetro, avvertenze, altro valore');
  const lom = await card(await idOf('Lombardia', 'ITA'));
  check('Italia (primo file): fonte con il nome del registro', (L(lom, 'Fonte:') || '').startsWith('Fonte: Maddison Project / Maddison Historical Statistics'), L(lom, 'Fonte:'));
  check('Italia: «non ricontrollato sulla fonte primaria» (verified è false)', (L(lom, 'Verifica:') || '').includes('non ricontrollato sulla fonte primaria'), L(lom, 'Verifica:'));
  check('Italia: lo status manca nel file e la scheda lo dice, senza inventarlo', L(lom, 'Status al 31 dicembre 1960:') === 'Status al 31 dicembre 1960: da verificare (nessuno status nei file forniti)', L(lom, 'Status al 31 dicembre 1960:'));
  check('Italia: nessun perimetro, nessuna avvertenza, nessuna nota', !L(lom, 'Perimetro:') && !L(lom, 'Avvertenze:') && !L(lom, 'Nota:') && !L(lom, 'Altro valore:'), lom.lines);
  check('l\'avvertenza generale viene da meta.global_warning, una sola volta', L(lom, 'Avvertenza generale:') === 'Avvertenza generale: ' + FILE.meta.global_warning && lom.lines.filter(t => t.startsWith('Avvertenza generale:')).length === 1, L(lom, 'Avvertenza generale:'));
  check('l\'avvertenza generale non è ripetuta nei record del file', FILE.records.every(r => !JSON.stringify(r).includes(FILE.meta.global_warning.slice(0, 40))));
  const frg = await card(await firstOf('FRG'));
  check('Germania Ovest: perimetro, serie diversa e fonte propria', L(frg, 'Perimetro:') === 'Perimetro: Germania Ovest' && (L(frg, 'Avvertenze:') || '').includes('serie statistica diversa') && (L(frg, 'Fonte:') || '').includes('Statistics and Data'), frg.lines);
  const jor = await card(await firstOf('JOR'));
  check('Giordania: perimetro «da verificare» e avvertenza', (L(jor, 'Perimetro:') || '').includes('Da verificare (inclusione della Cisgiordania)') && (L(jor, 'Avvertenze:') || '').includes('perimetro da verificare'), jor.lines);
  const mys = await card(await firstOf('MYS'));
  check('Malaysia: doppio conteggio con Singapore segnalato', (L(mys, 'Avvertenze:') || '').includes('possibile doppio conteggio con Singapore') && (L(mys, 'Perimetro:') || '').includes('Malaya sola'), mys.lines);
  const cyp = await card(await firstOf('CYP'));
  check('Cipro: 573.000 come valore, 580.000 come «Altro valore» con la sua fonte e la sua nota', cyp.statepop === 'Cipro: 573.000' && (L(cyp, 'Altro valore:') || '').startsWith('Altro valore: 580.000 (fonte: ONU retrospettiva tramite JetPunk') && (L(cyp, 'Altro valore:') || '').includes('Primo CSV: incluso per convenzione politica'), cyp.lines);
  check('Cipro: i due valori discordanti sono segnalati e lo status è quello del 31 dicembre 1960', (L(cyp, 'Avvertenze:') || '').includes('valori diversi') && (L(cyp, 'Status al 31 dicembre 1960:') || '').startsWith('Status al 31 dicembre 1960: Stato sovrano (controllato online'), cyp.lines);
  const kwt = await card('KWT_MAIN');
  check('Kuwait: protettorato britannico, controllato online il 26 ottobre 2026 su fonti secondarie', L(kwt, 'Status al 31 dicembre 1960:') === 'Status al 31 dicembre 1960: Protettorato britannico (indipendente dal 19 giugno 1961) (controllato online su fonti secondarie il 26 ottobre 2026)', L(kwt, 'Status al 31 dicembre 1960:'));
  check('Kuwait: l\'avvertenza dice che lo status del file è stato corretto', (L(kwt, 'Avvertenze:') || '').includes('lo status del file era sbagliato per il 31 dicembre 1960 ed è stato corretto'), L(kwt, 'Avvertenze:'));
  check('secondo file: la fonte è quella del registro («nessuna colonna fonte fornita»), mai «undefined»', (L(kwt, 'Fonte:') || '') === 'Fonte: ' + FILE.meta.sources.FILE_B_UNSPECIFIED && !kwt.note.includes('undefined'), L(kwt, 'Fonte:'));
  const chn = await card(await firstOf('CHN'));
  check('Cina: status del file, non ricontrollato su una fonte (la scheda non finge un controllo)', L(chn, 'Status al 31 dicembre 1960:') === 'Status al 31 dicembre 1960: Stato sovrano (come nel file fornito, non ricontrollato)', L(chn, 'Status al 31 dicembre 1960:'));
  const bth = await card(await firstOf('BTN'));
  check('Bhutan: status precisato (trattato del 1949) con la sua avvertenza', (L(bth, 'Status al 31 dicembre 1960:') || '').includes("Stato sovrano, con la politica estera guidata dall'India (trattato del 1949)") && (L(bth, 'Avvertenze:') || '').includes('è stato precisato'), bth.lines);
  const pakW = await card(await idOf('Bahawalpur', 'PAK'));
  check('ala occidentale: «Pakistan occidentale: 45.928.000» (non «Pakistan»: è solo l\'ala)', pakW.label === "Popolazione dell'ala" && pakW.statepop === 'Pakistan occidentale: 45.928.000' && pakW.own === 'da verificare', [pakW.label, pakW.statepop]);
  check('ala occidentale: perimetro «Solo ala occidentale», dato dell\'intera ala, etichetta corretta', L(pakW, 'Perimetro:') === 'Perimetro: Solo ala occidentale' && pakW.lines.some(t => t.startsWith("Dato dell'intera ala")) && (L(pakW, 'Avvertenze:') || '').includes("l'etichetta del file era imprecisa") && (L(pakW, 'Avvertenze:') || '').includes('solo una parte dello Stato'), pakW.lines);
  const pakE = await card(await idOf('Chittagong', 'PAK'));
  check('ala orientale: «Pakistan orientale (futuro Bangladesh): 50.980.000»', pakE.statepop === 'Pakistan orientale (futuro Bangladesh): 50.980.000', pakE.statepop);
  check('ala orientale: perimetro «Solo ala orientale» e status «non Stato sovrano»', L(pakE, 'Perimetro:') === 'Perimetro: Solo ala orientale' && (L(pakE, 'Status al 31 dicembre 1960:') || '').includes('Pakistan Orientale (non Stato sovrano)'), pakE.lines);
  const yem = await card('YEM_MAIN');
  check('Yemen: due gruppi di righe, uno per record, ciascuno con perimetro e status propri', yem.lines.filter(t => t === 'Yemen').length === 1 && yem.lines.includes('Yemen del Sud (Aden e protettorati)') && yem.lines.includes('Perimetro: Yemen settentrionale') && yem.lines.includes('Perimetro: Yemen meridionale'), yem.lines);
  check('Yemen: l\'avvertenza dice che i valori non si sommano; la somma non compare', yem.lines.filter(t => t.includes('i valori si mostrano, non si sommano')).length === 2 && !yem.all.includes('6.168.000'), yem.lines.filter(t => t.startsWith('Avvertenze:')));
  const ukr = await card('UKR_MAIN');
  check('Repubblica sovietica: nessun dato proprio, la scheda spiega perché, nessuna quota dell\'URSS', ukr.own === 'da verificare' && !ukr.rowShown && ukr.note === "Nessun dato proprio nei file forniti: nel 1960 faceva parte dell'URSS, il cui dato è riferito all'intero Stato.", ukr.note);
  const senzaDati = await ev(() => {
    const T = window.__t, ids = T.POP.records.filter(r => r.map_id).map(r => r.map_id), sov = T.POP_SOVIET_STATES;
    return Object.keys(T.countries).find(c => !ids.includes(c) && !sov.includes(c) && c !== 'PAK');
  });
  if (senzaDati) {
    const nd = await card(await firstOf(senzaDati));
    check('uno Stato senza record (' + senzaDati + '): «Nessun dato nei file forniti.»', nd.own === 'da verificare' && !nd.rowShown && nd.note === 'Nessun dato nei file forniti.', nd.note);
  } else check('(nessuno Stato della mappa è privo di record: controllo non necessario)', true);

  console.log('— le fonti dello status: a portata di dito, chiuse all\'inizio, collegamenti sicuri');
  await card('KWT_MAIN');
  const fonti = await ev(() => {
    const d = document.querySelector('#pp-popnote details');
    if (!d) return null;
    const links = [...d.querySelectorAll('a')];
    return { open: d.open, summary: d.querySelector('summary').textContent, n: links.length, hrefs: links.map(a => a.href), targets: links.map(a => a.target + '|' + a.rel), names: links.map(a => a.textContent), items: d.querySelectorAll('li').length };
  });
  const attese = rec('kwt').status_sources;
  check('Kuwait: «Fonte/Fonti dello status» c\'è, ed è chiusa finché non la si apre', !!fonti && fonti.open === false && /^Fonti? dello status/.test(fonti.summary), fonti);
  check('un collegamento per ogni fonte dello status del record (' + attese.length + '), tutti https', !!fonti && fonti.n === attese.length && fonti.items === attese.length && fonti.hrefs.every(h => h.startsWith('https://')), fonti);
  check('i collegamenti si aprono in un\'altra scheda senza passare il controllo alla pagina (noopener)', !!fonti && fonti.targets.every(t => t.startsWith('_blank|') && /noopener/.test(t)), fonti && fonti.targets);
  check('ogni collegamento ha un nome che si capisce (non l\'indirizzo nudo)', !!fonti && fonti.names.every(n => n.length > 8 && !n.startsWith('http')), fonti && fonti.names);
  check('le fonti dello status sono quelle scritte nel file, con i loro indirizzi', !!fonti && attese.every(id => fonti.hrefs.includes(FILE.meta.status_sources[id].match(/https:\/\/\S+/)[0])), { attese, hrefs: fonti && fonti.hrefs });
  await page.focus('#pp-popnote summary');
  await page.keyboard.press('Enter');
  const k1 = await ev(() => document.querySelector('#pp-popnote details').open);
  await page.keyboard.press('Tab');
  const k2 = await ev(() => document.activeElement.tagName + ':' + document.activeElement.closest('#pp-popnote').id);
  await page.focus('#pp-popnote summary');
  await page.keyboard.press('Space');
  const k3 = await ev(() => document.querySelector('#pp-popnote details').open);
  check('da tastiera: Invio apre le fonti dello status, Tab porta al primo collegamento, Spazio le richiude', k1 === true && k2 === 'A:pp-popnote' && k3 === false, [k1, k2, k3]);
  await page.evaluate(() => { document.querySelector('#pp-popnote details').open = true; });
  const dim = await ev(() => [...document.querySelectorAll('#pp-popnote a, #pp-popnote summary')].map(e => { const r = e.getBoundingClientRect(); return Math.round(r.width) + '×' + Math.round(r.height); }));
  const troppoPiccoli = await ev(() => [...document.querySelectorAll('#pp-popnote a, #pp-popnote summary')].filter(e => { const r = e.getBoundingClientRect(); return r.width < 23.5 || r.height < 23.5; }).length);
  check('aperte, i collegamenti e il titolo sono grandi almeno 24 × 24 px', dim.length >= 3 && troppoPiccoli === 0, dim);
  const sbordo = await ev(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('su un telefono (390 px) la scheda più lunga non fa scorrere la pagina di lato', sbordo <= 0, sbordo);
  const carte = [];
  for (const id of ['YEM_MAIN', await firstOf('JOR'), await firstOf('MYS'), await firstOf('CYP'), 'KWT_MAIN']) {
    await card(id);
    await page.evaluate(() => document.querySelectorAll('#pp-popnote details').forEach(d => { d.open = true; }));
    carte.push(await ev(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
  }
  check('stesso controllo con Yemen, Giordania, Malaysia, Cipro e Kuwait (tutto aperto)', carte.every(x => x <= 0), carte);

  console.log('— contrasto delle righe della scheda (tema chiaro e scuro)');
  const contrasto = () => ev(() => {
    const lum = c => { const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const bg = getComputedStyle(document.getElementById('provincePanel')).backgroundColor;
    const out = {};
    for (const [k, sel] of [['testo', '#pp-popnote > div'], ['grassetto', '#pp-popnote b'], ['collegamento', '#pp-popnote a'], ['titolo', '#pp-popnote summary']]) {
      const e = document.querySelector(sel); out[k] = e ? Math.round(ratio(getComputedStyle(e).color, bg) * 10) / 10 : null;
    }
    return out;
  });
  const chiaro = await contrasto();
  check('tema chiaro: tutte le righe e i collegamenti hanno almeno 4,5 : 1', Object.values(chiaro).every(v => v !== null && v >= 4.5), chiaro);
  await page.emulateMedia({ colorScheme: 'dark' });
  const scuro = await contrasto();
  check('tema scuro: tutte le righe e i collegamenti hanno almeno 4,5 : 1', Object.values(scuro).every(v => v !== null && v >= 4.5), scuro);
  await page.emulateMedia({ colorScheme: 'light' });

  console.log('— guasti messi apposta nei dati (la scheda non mente e non si rompe)');
  const guasto = async (id, cambia) => {
    await ev(([i, c]) => { const r = window.__t.POP.records.find(x => x.id === i); r.__salva = JSON.stringify(r); new Function('r', c)(r); }, [id, cambia]);
    const c = await card(await firstOf('ITA'));
    await ev(i => { const r = window.__t.POP.records.find(x => x.id === i); const s = JSON.parse(r.__salva); for (const k of Object.keys(r)) delete r[k]; Object.assign(r, s); }, id);
    return c;
  };
  const g1 = await guasto('ita', 'r.verified = true');
  check('verified = true: «ricontrollato sulla fonte primaria»', L(g1, 'Verifica:') === 'Verifica: ricontrollato sulla fonte primaria', L(g1, 'Verifica:'));
  const g2 = await guasto('ita', "r.source_id = 'FONTE_NON_REGISTRATA'");
  check('fonte non registrata: si legge il codice, non «undefined»', L(g2, 'Fonte:') === 'Fonte: FONTE_NON_REGISTRATA' && !g2.note.includes('undefined'), L(g2, 'Fonte:'));
  const g3 = await guasto('ita', 'r.source_id = null');
  check('fonte assente: «non indicata»', L(g3, 'Fonte:') === 'Fonte: non indicata', L(g3, 'Fonte:'));
  const g4 = await guasto('ita', "r.flags = ['flag_mai_visto', 'constructor', 'serie_diversa']");
  check('avvertenza sconosciuta o con il nome di un attributo di JavaScript: si legge il codice, le note note hanno la frase', (L(g4, 'Avvertenze:') || '') === 'Avvertenze: flag_mai_visto; constructor; serie statistica diversa dalle altre: non confrontarla né sommarla senza verificare il perimetro', L(g4, 'Avvertenze:'));
  const g5 = await guasto('ita', "r.alternative_values = [{ value: 49000000, source_id: 'X' }, { value: 51000000, source_id: 'MADDISON', note: 'prova' }]");
  check('due valori alternativi: due righe «Altro valore», anche senza nota e con fonte non registrata', g5.lines.filter(t => t.startsWith('Altro valore:')).length === 2 && g5.lines.includes('Altro valore: 49.000.000 (fonte: X)'), g5.lines.filter(t => t.startsWith('Altro valore:')));
  const g6 = await guasto('ita', 'r.status_1960_12_31 = "Stato prova"; r.status_sources = ["UN_MEMBERS", "NON_REGISTRATA"]');
  check('status con una fonte non registrata: la scheda regge e non scrive «undefined»', (L(g6, 'Status al 31 dicembre 1960:') || '').startsWith('Status al 31 dicembre 1960: Stato prova (controllato online') && !g6.all.includes('undefined'), L(g6, 'Status al 31 dicembre 1960:'));
  const g7 = await guasto('ita', 'r.value = "molti"');
  check('un valore che non è un numero: «da verificare», non «NaN»', g7.statepop === 'Italia: da verificare' && !g7.all.includes('NaN'), g7.statepop);
  check('i guasti non lasciano tracce: la scheda torna come prima', JSON.stringify((await card(await idOf('Lombardia', 'ITA'))).lines) === JSON.stringify(lom.lines));
  check('formattazione dei numeri: 1.000, 573.000, 667.070.000; non numeri → «da verificare»', await ev(() => { const f = window.__t.fmtPop; return f(1000) === '1.000' && f(573000) === '573.000' && f(667070000) === '667.070.000' && f(undefined) === 'da verificare' && f(NaN) === 'da verificare' && f('x') === 'da verificare' && f(null) === 'da verificare'; }));

  check('nessun errore della pagina (prove con la pagina intera)', errors.length === 0, errors);
  await browser.close();

  console.log('— guasti messi apposta nella pagina: blocco dei dati assente, rotto, senza «records»');
  const varianti = [
    ['senza il blocco dei dati', h => h.replace(BLOCCO, ''), 'nella pagina manca il blocco dei dati'],
    ['con un blocco che non è JSON', h => h.replace(BLOCCO, '<script type="application/json" id="population-1960-data">{ rotto</script>'), 'JSON'],
    ['con un blocco senza «records»', h => h.replace(BLOCCO, '<script type="application/json" id="population-1960-data">{"meta":{},"records":5}</script>'), "manca l'elenco «records»"],
  ];
  for (const [nome, transform, atteso] of varianti) {
    const v = await launch({ width: 390, height: 844, transform });
    const ok = await v.page.evaluate(() => typeof window.__t.selectProvince === 'function' && Object.keys(window.__t.provinces).length > 900);
    const c = await v.page.evaluate(() => { window.__t.openProvincePanel('KWT_MAIN'); const g = x => document.getElementById(x); return { own: g('pp-population').textContent, row: !g('pp-statepop-row').classList.contains('hidden'), note: g('pp-popnote').textContent, all: g('provincePanel').textContent }; });
    const err = await v.page.evaluate(() => window.__t.getPopLoadError());
    check(nome + ': la pagina si apre e la mappa funziona', ok);
    check(nome + ': la scheda lo dice («I dati di popolazione non sono stati letti») e non inventa valori', c.own === 'da verificare' && !c.row && c.note.startsWith('I dati di popolazione non sono stati letti (') && c.note.includes(atteso) && !c.all.includes('undefined'), c);
    check(nome + ': l\'unico errore è il messaggio nella console, non un\'eccezione', v.errors.length === 1 && v.errors[0].startsWith('console.error: Dati di popolazione non letti'), v.errors);
    check(nome + ': la pagina ricorda il motivo', typeof err === 'string' && err.includes(atteso), err);
    await v.browser.close();
  }

  console.log('— un record del file che punta a un luogo che non c\'è sulla mappa non viene perso in silenzio');
  const orfano = '{"id": "zzz", "entity": "Luogo inventato", "map_id": "ZZZ", "value": 1000, "status_1960_12_31": null, "source_id": "MADDISON", "verified": false, "flags": [], "alternative_values": []},';
  const vo = await launch({ width: 390, height: 844, transform: h => h.replace(BLOCCO, m => m.replace(/("records":\s*\[)/, '$1\n' + orfano)) });
  const po = await vo.page.evaluate(() => ({ unplaced: window.__t.popUnplaced.map(r => r.id), err: window.__t.getPopLoadError(), n: window.__t.POP.records.length }));
  check('il record «zzz» è tra quelli senza posto e la pagina si apre lo stesso', po.err === null && po.unplaced.length === 1 && po.unplaced[0] === 'zzz' && po.n === FILE.records.length + 1, po);
  check('la pagina lo segnala nella console (avviso, non errore)', vo.errors.length === 0, vo.errors);
  await vo.browser.close();

  process.exit(summary() ? 1 : 0);
})();
