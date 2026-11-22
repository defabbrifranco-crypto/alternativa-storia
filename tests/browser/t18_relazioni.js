// Relazioni fra gli Stati (versione 32): ogni coppia di Stati ha un numero intero da -100 a +100 (da -100 a 0 ostili o fredde, da +1 a +100
// amichevoli). I valori di partenza sono una stima provvisoria scritta nel file dei dati (meta.relations); in partita cambiano per quello che
// riferisce il motore, per i territori che passano di mano e, lentamente, tornano verso il valore di partenza.
// Le attese sono scritte qui, a mano o con un secondo calcolo indipendente dal codice della pagina; il file dei dati si legge dal disco.
const fs = require('fs');
const path = require('path');
const { launch, check, summary, playTurn } = require('./harness');

const FILE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'data', 'states_1960.json'), 'utf8'));
const REL = FILE.meta.relations;
const ID = FILE.states.map(s => s.id);
const STATO = Object.fromEntries(FILE.states.map(s => [s.id, s]));
const NOME = Object.fromEntries(FILE.states.map(s => [s.id, s.name]));
const BLOCCO = {};
for (const [id, b] of Object.entries(REL.blocs)) for (const a of b.alliances) BLOCCO[a] = id;
// Quanto è grande uno Stato, per scegliere fra valori uguali: la popolazione del 1960 quando il file ne dà una sola cifra, poi il numero di province
const POPF = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'data', 'population_1960.json'), 'utf8'));
const POPREC = {};
POPF.records.forEach(r => { if (r.map_id) (POPREC[r.map_id] = POPREC[r.map_id] || []).push(r); });
const POPOLAZIONE = c => (POPREC[c] && POPREC[c].length === 1 && Number.isFinite(POPREC[c][0].value) && POPREC[c][0].value > 0 ? POPREC[c][0].value : 0);

// ---- il secondo calcolo, scritto qui e non letto dalla pagina
const chiave = (a, b) => [a, b].sort().join('|');
function base(a, b) {
  if (a === b) return 0;
  for (const g of REL.groups) if (g.members.includes(a) && g.members.includes(b)) return g.value;       // gruppo (Unione Sovietica e repubbliche)
  const A = STATO[a].alliance, B = STATO[b].alliance;
  if (REL.metropoles[A] === b || REL.metropoles[B] === a) return REL.metropole_value;                    // colonia e madrepatria
  return REL.bloc_values[[BLOCCO[A], BLOCCO[B]].sort().join('|')];                                       // i due blocchi
}
const val = (a, b, dev = {}) => (Object.prototype.hasOwnProperty.call(dev, chiave(a, b)) ? dev[chiave(a, b)] : base(a, b));
const BANDE = [[-100, -76, 'Ostilità aperta'], [-75, -51, 'Ostili'], [-50, -26, 'Tese'], [-25, 0, 'Fredde'], [1, 25, 'Cordiali'], [26, 50, 'Amichevoli'], [51, 75, 'Strette'], [76, 100, 'Molto strette']];
const banda = v => (BANDE.find(([lo, hi]) => v >= lo && v <= hi) || [0, 0, ''])[2];
const segno = v => (v > 0 ? '+' + v : v < 0 ? '−' + (-v) : '0');
const perNome = (x, y) => (x.name < y.name ? -1 : x.name > y.name ? 1 : 0);
// L'elenco che il giocatore P deve vedere: gli altri Stati, dal valore più alto; a parità quelli che si sono mossi di più, poi il nome
const elenco = (P, dev = {}) => ID.filter(c => c !== P).map(c => ({ c, name: NOME[c], v: val(P, c, dev), d: val(P, c, dev) - base(P, c) }))
  .sort((x, y) => y.v - x.v || Math.abs(y.d) - Math.abs(x.d) || perNome(x, y));
// A parità di valore e di spostamento: lo Stato più popoloso, poi quello con più province, poi il codice. N = province per Stato (letto dalla mappa all'inizio)
let N = {};
const perTaglia = (x, y) => POPOLAZIONE(y.c) - POPOLAZIONE(x.c) || (N[y.c] || 0) - (N[x.c] || 0) || (x.c < y.c ? -1 : x.c > y.c ? 1 : 0);
const piuVicine = (P, dev, k) => elenco(P, dev).filter(x => x.v > 0).sort((x, y) => y.v - x.v || Math.abs(y.d) - Math.abs(x.d) || perTaglia(x, y)).slice(0, k);
const piuOstili = (P, dev, k) => elenco(P, dev).filter(x => x.v < 0).sort((x, y) => x.v - y.v || Math.abs(y.d) - Math.abs(x.d) || perTaglia(x, y)).slice(0, k);
const txt = v => (v > 0 ? '+' + v : String(v));                                   // il segno semplice, per il motore
// Il ritorno lento: ogni mese lo scarto dal valore di partenza si riduce del 4% (di un punto almeno, mai oltre il valore di partenza)
const passo = (v, b) => { const g = v - b; if (!g) return v; return v - Math.sign(g) * Math.min(Math.abs(g), Math.max(1, Math.ceil(Math.abs(g) * 0.04))); };
const dopo = (v, b, mesi) => { for (let i = 0; i < mesi; i++) v = passo(v, b); return v; };
const conquista = n => Math.max(-20, -10 - 2 * (n - 1));
const occupazione = n => Math.max(-12, -6 - (n - 1));
const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrasto = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
// Due elenchi di relazioni sono uguali se hanno le stesse coppie con gli stessi valori, in qualunque ordine
const ordinato = o => JSON.stringify(Object.keys(o).sort().map(k => [k, o[k]]));
const igual = (a, b) => ordinato(a) === ordinato(b);

const TURN = (extra = {}) => Object.assign({ evento_titolo: 'Titolo di prova', narrativa: 'Narrativa di prova.', riepilogo_mondo: 'Riepilogo di prova.',
  nuovo_anno: 'gennaio 1961', stabilita: 55, economia: 55, esercito: 55, prestigio: 55, cambi_territoriali: [], cambi_controllo: [], segnaposto: [] }, extra);
const AVVISO = n => `⚠️ Variazioni di relazione ignorate: ${n} (Stati o valori non validi, oppure oltre il massimo di 12 per turno)`;

(async () => {
  const { browser, page, errors } = await launch({ width: 640, height: 1100, mobile: false });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const restart = c => ev(c => { window.__queue.length = 0; window.__textQueue.length = 0; window.__t.resetGame(); window.__t.startFixedScenarioGame(c); }, c);
  const queueJson = v => ev(v => { window.__queue.push(v); }, v);
  const spinnerOff = () => page.waitForFunction(() => document.getElementById('thinking').classList.contains('hidden'));
  const advance = async () => { await page.click('#advanceBtn'); await spinnerOff(); };
  const turn = async extra => { await queueJson(TURN(extra)); await advance(); };                 // un turno con la risposta data
  const rel = () => ev(() => JSON.parse(JSON.stringify(window.__t.getState().rel)));
  const relLines = () => ev(() => window.__t.getState().log.filter(e => e.k === 'r').map(e => e.lines));
  const kinds = () => ev(() => window.__t.getState().log.map(e => e.k).join());
  const lastPrompt = () => ev(() => window.__prompts[window.__prompts.length - 1]);
  // Il pannello «Relazioni» così com'è nella pagina
  const panel = () => ev(() => {
    const g = id => document.getElementById(id), clean = s => s.replace(/\s+/g, ' ').trim(), p = g('relPanel');
    return {
      hidden: p.classList.contains('hidden') || p.offsetParent === null, tag: p.tagName, labelled: p.getAttribute('aria-labelledby'), title: clean(g('relTitle').textContent), titleTag: g('relTitle').tagName,
      best: clean(g('relBest').textContent), worst: clean(g('relWorst').textContent), summary: clean(g('relSummary').textContent), note: clean(g('relNote').textContent),
      basis: clean(g('relBasis').textContent), open: g('relBox').open, listLabel: g('relList').getAttribute('aria-label'),
      items: [...g('relList').children].map(li => ({ name: li.children[0].textContent, val: li.children[1].textContent, sub: clean(li.children[2].textContent),
        barHidden: li.children[3].getAttribute('aria-hidden'), cls: li.children[3].firstChild.className, w: li.children[3].firstChild.style.width }))
    };
  });
  // La scheda di una provincia: le righe visibili (etichetta → testo)
  const card = id => ev(i => {
    window.__t.selectProvince(i);
    const clean = s => s.replace(/\s+/g, ' ').trim(), rows = {};
    document.querySelectorAll('#provincePanel .pp-row').forEach(r => { if (!r.classList.contains('hidden') && !r.closest('.editor-only')) rows[clean(r.children[0].textContent)] = clean(r.children[1].textContent); });
    return rows;
  }, id);
  const firstOf = s => ev(s => Object.keys(window.__t.provinces).find(id => window.__t.initialTerritory[id].owner === s), s);
  const RIGA = 'Relazione con il proprietario';

  check('la pagina si carica senza errori', errors.length === 0, errors);

  // =============================================================== 1. i valori di partenza
  console.log('— i valori di partenza: la pagina li prende dal file dei dati, per tutte le coppie');
  check('la descrizione dei valori di partenza nella pagina è quella del file, parola per parola', (await ev(() => JSON.stringify(window.__t.REL))) === JSON.stringify(REL));
  check('il file dice che i valori NON sono verificati, e la pagina li tratta da provvisori', REL.verified === false && (await ev(() => window.__t.REL_PROVISIONAL)) === true);
  check('il file spiega da dove vengono i valori e dice che non sono dati storici', /stima del prototipo, non dati storici/.test(REL.basis));
  await restart('ITA');
  N = await ev(() => { const n = {}; for (const id in window.__t.provinces) n[window.__t.provinces[id].owner] = (n[window.__t.provinces[id].owner] || 0) + 1; return n; });
  check('ogni Stato ha almeno una provincia sulla mappa (sono tutti in gioco)', ID.every(c => N[c] > 0), ID.filter(c => !N[c]));
  const coppie = [];
  for (let i = 0; i < ID.length; i++) for (let j = i + 1; j < ID.length; j++) coppie.push([ID[i], ID[j]]);
  check('ci sono 3.403 coppie (83 Stati)', ID.length === 83 && coppie.length === 3403, coppie.length);
  const pag = await ev(cp => cp.map(([a, b]) => [window.__t.relBaseline(a, b), window.__t.relBaseline(b, a), window.__t.relGet(a, b)]), coppie);
  const att = coppie.map(([a, b]) => base(a, b));
  const diversi = coppie.map((c, i) => [c, pag[i][0], att[i]]).filter(([, p, a]) => p !== a);
  check('tutte le 3.403 coppie hanno il valore di partenza del secondo calcolo indipendente', diversi.length === 0, diversi.slice(0, 5));
  check('…e il valore non cambia se si scambiano i due Stati', pag.every(p => p[0] === p[1]));
  check('…e a inizio partita il valore letto è quello di partenza', pag.every((p, i) => p[2] === att[i]));
  check('…tutti numeri interi da -100 a +100', pag.every(p => Number.isInteger(p[0]) && p[0] >= -100 && p[0] <= 100));
  check('la scala usa i due lati: ci sono valori negativi, zero e positivi', att.some(v => v < 0) && att.some(v => v === 0) && att.some(v => v > 0), [Math.min(...att), Math.max(...att)]);
  // Valori scritti a mano (non calcolati): se il file o la regola cambiano, bisogna accorgersene
  const A_MANO = { 'FRA|ITA': 35, 'ITA|URSS': -60, 'UKR|URSS': 80, 'BLR|EST': 80, 'GBR|HKG': 60, 'MAC|PRT': 60, 'ITA|YUG': 0, 'ITA|SGP': 10, 'POL|URSS': 45, 'GBR|URSS': -60, 'FRG|GDR': -60 };
  const aMano = await ev(m => Object.keys(m).map(k => { const [a, b] = k.split('|'); return [k, window.__t.relBaseline(a, b)]; }), A_MANO);
  check('alcune coppie, con il valore scritto a mano: ' + Object.keys(A_MANO).join(', '), aMano.every(([k, v]) => v === A_MANO[k]), aMano.filter(([k, v]) => v !== A_MANO[k]));
  check('uno Stato con se stesso e un codice che non esiste valgono 0', (await ev(() => [window.__t.relBaseline('ITA', 'ITA'), window.__t.relBaseline('ITA', 'ZZZ'), window.__t.relBaseline('__proto__', 'ITA'), window.__t.relGet('ITA', 'ITA')])).every(v => v === 0));

  // =============================================================== 2. le fasce e la scrittura dei valori
  console.log('— le fasce: da -100 a 0 ostili o fredde, da +1 a +100 amichevoli');
  const fasce = await ev(() => Array.from({ length: 201 }, (_, i) => [i - 100, window.__t.relBand(i - 100), window.__t.fmtRel(i - 100), window.__t.relText(i - 100)]));
  check('ognuno dei 201 valori sta in una fascia, e in quella giusta', fasce.every(([v, b]) => b === banda(v)), fasce.filter(([v, b]) => b !== banda(v)).slice(0, 3));
  const bordi = await ev(() => [-100, -76, -75, -51, -50, -26, -25, -1, 0, 1, 25, 26, 50, 51, 75, 76, 100].map(v => window.__t.relBand(v)));
  check('i bordi delle fasce (scritti a mano)', JSON.stringify(bordi) === JSON.stringify(['Ostilità aperta', 'Ostilità aperta', 'Ostili', 'Ostili', 'Tese', 'Tese', 'Fredde', 'Fredde', 'Fredde', 'Cordiali', 'Cordiali', 'Amichevoli', 'Amichevoli', 'Strette', 'Strette', 'Molto strette', 'Molto strette']), bordi);
  check('lo zero sta fra le relazioni fredde (lato negativo), +1 fra le cordiali: «da -100 a 0 e da +1 a 100»', bordi[8] === 'Fredde' && bordi[9] === 'Cordiali');
  check('il segno si scrive sempre: +35, 0, e il vero segno meno (−) per i negativi', fasce.every(([v, , f]) => f === segno(v)) && fasce.find(f => f[0] === -7)[2] === '−7' && fasce.find(f => f[0] === 0)[2] === '0');
  check('per il motore il segno meno è il trattino semplice: -7, +7, 0', fasce.find(f => f[0] === -7)[3] === '-7' && fasce.find(f => f[0] === 7)[3] === '+7' && fasce.find(f => f[0] === 0)[3] === '0');

  console.log('— lettura e scrittura di un valore');
  const w = await ev(() => {
    const T = window.__t, r = () => JSON.parse(JSON.stringify(T.getState().rel)), out = {};
    out.start = [T.relGet('ITA', 'FRA'), T.relGet('FRA', 'ITA'), JSON.stringify(r())];
    T.relSet('ITA', 'FRA', 120); out.alto = [T.relGet('ITA', 'FRA'), T.relGet('FRA', 'ITA'), JSON.stringify(r())];
    T.relSet('FRA', 'ITA', -250); out.basso = [T.relGet('ITA', 'FRA'), JSON.stringify(r())];
    T.relSet('ITA', 'FRA', 12.6); out.tondo = T.relGet('ITA', 'FRA');
    T.relAdd('ITA', 'FRA', -5); out.somma = T.relGet('ITA', 'FRA');
    T.relSet('ITA', 'FRA', 35); out.ritorno = [T.relGet('ITA', 'FRA'), JSON.stringify(r())];
    T.relSet('ITA', 'ITA', 5); T.relSet('ITA', 'ZZZ', 5); T.relSet('__proto__', 'ITA', 5); T.relSet('ITA', 'constructor', 5); out.vuote = JSON.stringify(r());
    return out;
  });
  check('all\'inizio il valore è lo stesso in entrambe le direzioni e non c\'è nulla da salvare', w.start[0] === 35 && w.start[1] === 35 && w.start[2] === '{}', w.start);
  check('un valore sopra +100 si ferma a +100, in entrambe le direzioni, con una sola voce (coppia in ordine alfabetico)', w.alto[0] === 100 && w.alto[1] === 100 && w.alto[2] === '{"FRA|ITA":100}', w.alto);
  check('…e sotto -100 si ferma a -100', w.basso[0] === -100 && w.basso[1] === '{"FRA|ITA":-100}', w.basso);
  check('un valore con la virgola si arrotonda (12,6 → 13) e «relAdd» somma (13 - 5 = 8)', w.tondo === 13 && w.somma === 8, [w.tondo, w.somma]);
  check('una coppia che torna al valore di partenza non occupa più spazio', w.ritorno[0] === 35 && w.ritorno[1] === '{}', w.ritorno);
  check('Stati uguali, codici che non esistono o «__proto__» non scrivono nulla', w.vuote === '{}', w.vuote);

  // =============================================================== 3. il pannello «Relazioni»
  console.log('— il pannello «Relazioni»');
  await ev(() => { window.__t.resetGame(); });
  check('fuori da una partita il pannello è nascosto', (await panel()).hidden);
  await restart('ITA');
  let P = await panel();
  check('in una partita sulla mappa il pannello si vede: sezione con titolo «Relazioni» (h3) a cui è collegata', !P.hidden && P.tag === 'SECTION' && P.labelled === 'relTitle' && P.title === 'Relazioni' && P.titleTag === 'H3', P);
  const E0 = elenco('ITA');
  check('l\'elenco ha tutti gli altri Stati (82) e non quello del giocatore, e il titolo lo dice', P.items.length === 82 && !P.items.some(i => i.name === 'Italia') && P.summary === 'Tutte le relazioni (82)', [P.items.length, P.summary]);
  check('l\'elenco è nell\'ordine giusto: dal valore più alto, a parità per nome; con i valori giusti', JSON.stringify(P.items.map(i => [i.name, i.val])) === JSON.stringify(E0.map(x => [x.name, segno(x.v)])),
    P.items.map(i => [i.name, i.val]).slice(0, 4));
  check('ogni voce dice la fascia a parole (non solo col colore) e, all\'inizio, non dice «dall\'inizio»', P.items.every((i, k) => i.sub === banda(E0[k].v)), P.items.slice(0, 3));
  check('la barra è solo un ripetitore: nascosta ai lettori di schermo, verso giusto e larghezza giusta (metà del valore)',
    P.items.every((i, k) => i.barHidden === 'true' && i.cls === (E0[k].v < 0 ? 'neg' : 'pos') && parseFloat(i.w) === Math.abs(E0[k].v) / 2), P.items.slice(0, 2));
  check('«Più vicine»: i primi tre con valore positivo; «Più ostili»: i primi tre con valore negativo; a parità lo Stato più popoloso (nell\'elenco completo, invece, l\'ordine alfabetico)',
    P.best === 'Più vicine: ' + piuVicine('ITA', {}, 3).map(x => x.name + ' ' + segno(x.v)).join(' · ')
    && P.worst === 'Più ostili: ' + piuOstili('ITA', {}, 3).map(x => x.name + ' ' + segno(x.v)).join(' · '), [P.best, P.worst]);
  check('…all\'inizio, per l\'Italia: più vicine Giappone, Germania Ovest, Regno Unito (+35); più ostili Cina, Unione Sovietica, Polonia (−60) (valori scritti a mano)',
    P.best === 'Più vicine: Giappone +35 · Germania Ovest +35 · Regno Unito +35' && P.worst === 'Più ostili: Cina −60 · Unione Sovietica −60 · Polonia −60', [P.best, P.worst]);
  check('l\'elenco completo è chiuso all\'inizio (il pannello occupa poco posto)', P.open === false);
  check('la nota dice la scala, che i valori di partenza sono una stima provvisoria e non dati storici, e come cambiano', /da −100 a \+100/.test(P.note) && /da −100 a 0 relazioni ostili o fredde, da \+1 a \+100 amichevoli/.test(P.note)
    && /stima provvisoria del prototipo, non dati storici/.test(P.note) && /territori che passano di mano/.test(P.note) && /tornano lentamente verso il valore di partenza/.test(P.note), P.note);
  check('«Come sono calcolati i valori di partenza» mostra il testo del file', P.basis === REL.basis.replace(/\s+/g, ' ').trim(), P.basis.slice(0, 80));
  check('l\'elenco ha un nome per i lettori di schermo', P.listLabel === 'Relazioni della tua nazione con gli altri Stati', P.listLabel);

  console.log('— il pannello segue i valori (con scarti dall\'inizio)');
  const DEV = { 'GBR|ITA': 100, 'ITA|URSS': -100, 'ITA|YUG': 5, 'FRA|ITA': 12, 'ITA|POL': 0 };       // Polonia: da -60 a 0, come molti Stati che partono da 0 (a parità prima quelli che si sono mossi)
  await ev(d => { const T = window.__t; for (const k of Object.keys(d)) { const [a, b] = k.split('|'); T.relSet(a, b, d[k]); } T.renderRelations(); document.getElementById('relBox').open = true; }, DEV);
  P = await panel();
  const E1 = elenco('ITA', DEV);
  check('dopo i cambiamenti l\'elenco è riordinato come previsto', JSON.stringify(P.items.map(i => [i.name, i.val])) === JSON.stringify(E1.map(x => [x.name, segno(x.v)])), P.items.slice(0, 3).map(i => [i.name, i.val]));
  check('le voci che si sono mosse dicono «dall\'inizio» con il segno (le altre no): Regno Unito +65, Unione Sovietica −40, Iugoslavia +5, Francia −23, Polonia +60', JSON.stringify(P.items.filter(i => /dall'inizio/.test(i.sub)).map(i => [i.name, i.sub]).sort())
    === JSON.stringify([['Francia', 'Cordiali · dall\'inizio −23'], ['Iugoslavia', 'Cordiali · dall\'inizio +5'], ['Polonia', 'Fredde · dall\'inizio +60'], ['Regno Unito', 'Molto strette · dall\'inizio +65'], ['Unione Sovietica', 'Ostilità aperta · dall\'inizio −40']].sort()), P.items.filter(i => /dall'inizio/.test(i.sub)));
  const zeri = P.items.filter(i => i.val === '0').map(i => i.name);
  check('a parità di valore (0) prima lo Stato che si è mosso (Polonia, da −60 a 0), poi gli altri in ordine alfabetico', zeri[0] === 'Polonia' && zeri.length > 3
    && JSON.stringify(zeri.slice(1)) === JSON.stringify(zeri.slice(1).slice().sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))), zeri.slice(0, 5));
  check('«Più vicine» e «Più ostili» si aggiornano (Regno Unito +100 in testa; Unione Sovietica −100 in testa), con lo stesso ordine del calcolo indipendente',
    P.best.startsWith('Più vicine: Regno Unito +100 · ') && P.worst.startsWith('Più ostili: Unione Sovietica −100 · ')
    && P.best === 'Più vicine: ' + piuVicine('ITA', DEV, 3).map(x => x.name + ' ' + segno(x.v)).join(' · ') && P.worst === 'Più ostili: ' + piuOstili('ITA', DEV, 3).map(x => x.name + ' ' + segno(x.v)).join(' · '), [P.best, P.worst]);
  check('il titolo conta ancora 82 voci', P.summary === 'Tutte le relazioni (82)');
  const geom = await ev(() => {
    const out = {}, items = [...document.querySelectorAll('#relList li')];
    for (const name of ['Regno Unito', 'Unione Sovietica', 'Francia']) {
      const li = items.find(l => l.children[0].textContent === name), bar = li.children[3].getBoundingClientRect(), fill = li.children[3].firstChild.getBoundingClientRect();
      out[name] = { centro: bar.left + bar.width / 2, fillL: fill.left, fillR: fill.right, barW: bar.width, fillW: fill.width };
    }
    return out;
  });
  check('+100: la barra riempie la metà destra, a partire dal centro', Math.abs(geom['Regno Unito'].fillL - geom['Regno Unito'].centro) < 1.5 && Math.abs(geom['Regno Unito'].fillW - geom['Regno Unito'].barW / 2) < 1.5, geom['Regno Unito']);
  check('-100: la barra riempie la metà sinistra, che finisce al centro', Math.abs(geom['Unione Sovietica'].fillR - geom['Unione Sovietica'].centro) < 1.5 && Math.abs(geom['Unione Sovietica'].fillW - geom['Unione Sovietica'].barW / 2) < 1.5, geom['Unione Sovietica']);
  check('+12: una barra corta, a destra del centro (12/200 della barra)', geom['Francia'].fillL >= geom['Francia'].centro - 1.5 && Math.abs(geom['Francia'].fillW - geom['Francia'].barW * 12 / 200) < 1.5, geom['Francia']);

  console.log('— il pannello nei vari casi: nascosto senza partita o in una partita libera, sul telefono, con i colori');
  await ev(() => { window.__t.resetGame(); });
  P = await panel();
  check('dopo «Nuova partita» il pannello è nascosto e svuotato', P.hidden && P.items.length === 0, P.items.length);
  await restart('ITA');
  P = await panel();
  check('una nuova partita non porta con sé nessuno scarto della precedente: tutto è di nuovo al valore di partenza', P.items.every((i, k) => !/dall'inizio/.test(i.sub)) && P.items[0].name === E0[0].name && P.best === 'Più vicine: Giappone +35 · Germania Ovest +35 · Regno Unito +35', P.best);
  await page.setViewportSize({ width: 320, height: 700 });
  await ev(() => { document.getElementById('relBox').open = true; document.getElementById('relBasisBox').open = true; });
  const stretto = await ev(() => { const p = document.getElementById('relPanel'); return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, pw: p.scrollWidth, pc: p.clientWidth,
    sum: [...p.querySelectorAll('summary')].map(s => Math.round(s.getBoundingClientRect().height)) }; });
  check('a 320 px di larghezza il pannello aperto non fa scorrere la pagina di lato', stretto.sw <= stretto.cw && stretto.pw <= stretto.pc + 1, stretto);
  check('i titoli apribili («Tutte le relazioni», «Come sono calcolati…») sono alti almeno 24 px', stretto.sum.length === 2 && stretto.sum.every(h => h >= 24), stretto.sum);
  await page.setViewportSize({ width: 640, height: 1100 });
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme });
    const c = await ev(() => { const s = getComputedStyle(document.documentElement), g = n => s.getPropertyValue(n).trim(); return { pos: g('--rel-pos'), neg: g('--rel-neg'), panel: g('--panel'), track: g('--border') }; });
    check(`tema ${scheme}: le barre (positiva ${c.pos}, negativa ${c.neg}) si distinguono dal fondo del pannello e dalla guida della barra (almeno 3:1)`,
      [c.pos, c.neg].every(x => /^#[0-9a-f]{6}$/i.test(x) && contrasto(x, c.panel) >= 3 && contrasto(x, c.track) >= 3), { c, pos: [contrasto(c.pos, c.panel), contrasto(c.pos, c.track)], neg: [contrasto(c.neg, c.panel), contrasto(c.neg, c.track)] });
  }
  await page.emulateMedia({ colorScheme: 'light' });

  // =============================================================== 4. la scheda del territorio
  console.log('— la scheda del territorio: «Relazione con il proprietario»');
  await restart('ITA');
  const fra = await firstOf('FRA'), ita = await firstOf('ITA'), urss = await firstOf('URSS');
  let c = await card(fra);
  check('il territorio di un altro Stato dice la relazione, con la fascia e «(provvisorio)»: +35 · Amichevoli', c[RIGA] === '+35 · Amichevoli (provvisorio)', c);
  c = await card(urss);
  check('quello dell\'Unione Sovietica: −60 · Ostili (provvisorio)', c[RIGA] === '−60 · Ostili (provvisorio)', c);
  c = await card(ita);
  check('il tuo territorio non ha la riga (non ha senso una relazione con se stessi)', !(RIGA in c), c);
  await card(fra);
  await ev(() => { window.__t.relSet('ITA', 'FRA', 8); window.__t.renderRelations(); });
  c = await ev(() => document.getElementById('pp-rel').textContent);
  check('con la scheda aperta, se la relazione cambia la riga si aggiorna da sola: +8 · Cordiali', c === '+8 · Cordiali (provvisorio)', c);
  await ev(() => { window.__t.relSet('ITA', 'FRA', 0); window.__t.renderRelations(); });
  check('lo zero si scrive «0 · Fredde»', (await ev(() => document.getElementById('pp-rel').textContent)) === '0 · Fredde (provvisorio)');
  await ev(() => { window.__t.resetGame(); });
  c = await card(fra);
  check('senza partita (editor, o prima di cominciare) la scheda non ha la riga', !(RIGA in c), c);
  check('la riga sta subito dopo la nota su capitale e alleanza del proprietario', await ev(() => document.getElementById('pp-statedet').nextElementSibling === document.getElementById('pp-rel-row')));
  // Uno scenario caricato da file può portare con sé uno «Stato scelto» senza che ci sia una partita: nemmeno allora ci sono pannello e riga.
  await ev(() => { const pl = window.__t.buildSavePayload(); pl.selectedCountryId = 'ITA'; window.__t.applySave(pl); });
  const scenario = await ev(() => ({ mode: window.__t.getGameMode(), started: window.__t.getMapGameStarted(), nascosto: document.getElementById('relPanel').classList.contains('hidden') }));
  c = await card(fra);
  check('uno scenario caricato da file con uno Stato scelto non è una partita: pannello nascosto e scheda senza la riga', scenario.mode === null && !scenario.started && scenario.nascosto && !(RIGA in c), { scenario, c });
  // Un salvataggio di partita sulla mappa senza uno Stato valido per chi gioca si carica lo stesso, ma senza relazioni (non si sa per chi calcolarle).
  await restart('ITA');
  const salvato = await ev(() => JSON.parse(JSON.stringify(window.__t.buildSavePayload())));
  for (const [nome, valore] of [['uno Stato che non esiste', 'XXX'], ['nessuno Stato', null]]) {
    await ev(() => { window.__t.resetGame(); });
    const erroriPrima = errors.length;
    const r = await ev(([pl, v]) => { pl.selectedCountryId = v; const ok = window.__t.applySave(pl);
      return { ok, mode: window.__t.getGameMode(), started: window.__t.getMapGameStarted(), nascosto: document.getElementById('relPanel').classList.contains('hidden') }; }, [salvato, valore]);
    c = await card(fra);
    check(`un salvataggio di partita con ${nome} per chi gioca si carica senza errori, ma senza pannello e senza riga nella scheda`,
      r.ok === true && r.mode === 'fixed' && r.nascosto && !(RIGA in c) && errors.length === erroriPrima, { r, c, errori: errors.slice(erroriPrima) });
  }

  // =============================================================== 5. le risposte del motore
  console.log('— le risposte del motore: variazioni valide');
  await restart('ITA');
  await turn({ relazioni: [
    { nazione_a: 'ITA', nazione_b: 'FRA', variazione: -20, motivo: 'Crisi di frontiera' },
    { nazione_a: 'URSS', nazione_b: 'ita', variazione: '+15', motivo: 'Accordo commerciale' },
    { nazione_a: 'FRA', nazione_b: 'GBR', variazione: 7.6, motivo: 'Tom & Jerry <b>navale</b>' },
  ] });
  check('le tre variazioni sono applicate: -20, +15 (anche con il codice in minuscolo e il numero scritto come testo), +8 (7,6 arrotondato)',
    igual(await rel(), { 'FRA|GBR': 43, 'FRA|ITA': 15, 'ITA|URSS': -45 }), await rel());
  const L1 = (await relLines())[0];
  check('il diario dice una riga per coppia, dalla variazione più grande, con valore prima → dopo, fascia e motivo; il tuo Stato per primo',
    JSON.stringify(L1) === JSON.stringify(['Italia – Francia: +35 → +15 (Cordiali) — Crisi di frontiera', 'Italia – Unione Sovietica: −60 → −45 (Tese) — Accordo commerciale', 'Francia – Regno Unito: +35 → +43 (Amichevoli) — Tom & Jerry b navale /b']), L1);
  check('la cronaca ha turno e relazioni, in quest\'ordine', (await kinds()) === 't,r', await kinds());
  const dom1 = await ev(() => ({ n: document.querySelectorAll('#log .entry-rel').length, text: document.querySelector('#log .entry-rel').textContent, bold: document.querySelectorAll('#log .entry-rel b').length, inner: document.querySelector('#log .entry-rel').innerHTML }));
  check('nel diario la voce ha il titolo «Relazioni» e il testo del motore resta testo (le parentesi angolari sono tolte, la & è scritta bene)', dom1.n === 1 && dom1.text.startsWith('🤝 Relazioni') && dom1.bold === 1 && dom1.inner.includes('Tom &amp; Jerry'), dom1);
  P = await panel();
  check('il pannello si è aggiornato: Francia +15, Unione Sovietica −45 («dall\'inizio» +20 e +15), Regno Unito +43', P.items.find(i => i.name === 'Francia').val === '+15' && P.items.find(i => i.name === 'Francia').sub === 'Cordiali · dall\'inizio −20'
    && P.items.find(i => i.name === 'Unione Sovietica').val === '−45' && P.items.find(i => i.name === 'Regno Unito').val === '+35', [P.items.find(i => i.name === 'Francia'), P.items.find(i => i.name === 'Regno Unito')]);
  // Nota: Regno Unito con l'Italia resta +35; la coppia che si è mossa è Francia–Regno Unito, che non è una relazione del giocatore.

  await restart('ITA');
  await turn({ relazioni: [{ nazione_a: ' ita ', nazione_b: ' frg ', variazione: '−5', motivo: 'Spazi e segno meno vero' }, { nazione_a: 'ITA', nazione_b: 'BEL', variazione: '  +4 ' }] });
  check('i codici con spazi e minuscole (« ita »), il numero con il vero segno meno («−5») o con gli spazi («  +4 ») sono letti: Germania Ovest 35 → 30, Belgio 35 → 39',
    igual(await rel(), { 'FRG|ITA': 30, 'BEL|ITA': 39 }) && (await relLines())[0].length === 2, [await rel(), await relLines()]);

  console.log('— le risposte del motore: voci non valide, somme, limiti');
  await restart('ITA');
  const sporche = [{ nazione_a: 'XXX', nazione_b: 'FRA', variazione: 5 }, { nazione_a: 'FRA', nazione_b: 'FRA', variazione: 5 }, { nazione_a: 'FRA', nazione_b: 'GBR', variazione: 'molto' },
    { nazione_a: 'FRA', nazione_b: 'GBR' }, { nazione_a: 'FRA', nazione_b: 'GBR', variazione: null }, { nazione_a: 'FRA', nazione_b: 'GBR', variazione: '1e999' },
    'testo', 42, null, [], { nazione_a: ['FRA'], nazione_b: {}, variazione: 5 }, { nazione_a: '__proto__', nazione_b: 'FRA', variazione: 5 }];
  await turn({ relazioni: sporche });
  check('dodici voci sbagliate (codice che non esiste, Stato uguale, numero che non è un numero, valore mancante o infinito, voci che non sono oggetti, «__proto__»): nessuna è applicata', JSON.stringify(await rel()) === '{}', await rel());
  check('…e il diario lo dice con una sola riga: «Variazioni di relazione ignorate: 12»', JSON.stringify(await relLines()) === JSON.stringify([[AVVISO(12)]]), await relLines());
  check('…senza errori nella pagina', errors.length === 0, errors);
  await restart('ITA');
  await turn({ relazioni: [{ nazione_a: 'FRA', nazione_b: 'GBR', variazione: 0, motivo: 'Nulla' }, { nazione_a: 'ITA', nazione_b: 'FRA', variazione: 0.4 }] });
  check('una variazione zero (o che si arrotonda a zero) non cambia nulla, non è un errore e non lascia nessuna riga', JSON.stringify(await rel()) === '{}' && (await relLines()).length === 0 && (await kinds()) === 't', [await rel(), await kinds()]);
  for (const [nome, valore] of [['un oggetto', { nazione_a: 'ITA', nazione_b: 'FRA', variazione: 5 }], ['un testo', 'molto'], ['null', null], ['un numero', 7], ['vuoto', []]]) {
    await restart('ITA');
    await turn({ relazioni: valore });
    check('«relazioni» che è ' + nome + ' (non una lista): ignorato senza errori, nessuna riga', JSON.stringify(await rel()) === '{}' && (await relLines()).length === 0 && (await kinds()) === 't' && errors.length === 0, [await rel(), await kinds(), errors]);
  }
  await restart('ITA');
  await turn();
  check('«relazioni» assente (come nelle vecchie risposte): il turno va avanti, niente voce nel diario', (await kinds()) === 't' && JSON.stringify(await rel()) === '{}');
  await restart('ITA');
  await turn({ relazioni: [{ nazione_a: 'ITA', nazione_b: 'FRA', variazione: 500 }, { nazione_a: 'FRA', nazione_b: 'ITA', variazione: 20 }, { nazione_a: 'ITA', nazione_b: 'GBR', variazione: -500 },
    { nazione_a: 'ITA', nazione_b: 'URSS', variazione: 10 }, { nazione_a: 'URSS', nazione_b: 'ITA', variazione: -4 }, { nazione_a: 'ITA', nazione_b: 'YUG', variazione: 7, motivo: 'a' }, { nazione_a: 'YUG', nazione_b: 'ITA', variazione: 3, motivo: 'b' }] });
  check('al massimo 30 per volta: +500 e +20 sulla stessa coppia si sommano e si fermano a +30 (35 → 65); -500 vale -30 (35 → 5)', (await rel())['FRA|ITA'] === 65 && (await rel())['GBR|ITA'] === 5, await rel());
  check('le voci della stessa coppia si sommano prima del limite: +10 e -4 danno +6 (−60 → −54); +7 e +3 danno +10 (0 → +10)', (await rel())['ITA|URSS'] === -54 && (await rel())['ITA|YUG'] === 10, await rel());
  check('…e una coppia ha una riga sola, con il motivo della prima voce che lo ha', (await relLines())[0].filter(l => l.startsWith('Italia – Iugoslavia')).length === 1 && (await relLines())[0].find(l => l.startsWith('Italia – Iugoslavia')) === 'Italia – Iugoslavia: 0 → +10 (Cordiali) — a', await relLines());
  await restart('ITA');
  const altri = ID.filter(x => x !== 'ITA').slice(0, 14);
  await turn({ relazioni: altri.map(x => ({ nazione_a: 'ITA', nazione_b: x, variazione: 1 })) });
  const r12 = await rel(), L12 = (await relLines())[0];
  check('al massimo 12 voci per turno: le prime 12 sono applicate, le altre 2 ignorate e contate', Object.keys(r12).length === 12 && altri.slice(0, 12).every(x => r12[chiave('ITA', x)] === val('ITA', x) + 1) && altri.slice(12).every(x => !(chiave('ITA', x) in r12)), Object.keys(r12).length);
  check('…il diario ha 12 righe e l\'avviso «ignorate: 2»', L12.length === 13 && L12[12] === AVVISO(2), L12.slice(-2));
  await restart('ITA');
  await ev(() => { window.__t.relSet('ITA', 'GBR', 90); window.__t.relSet('ITA', 'URSS', -95); });
  await turn({ relazioni: [{ nazione_a: 'ITA', nazione_b: 'GBR', variazione: 30, motivo: 'Alleanza' }, { nazione_a: 'ITA', nazione_b: 'URSS', variazione: -30, motivo: 'Guerra' }] });
  check('il risultato non esce mai da -100 e +100: +30 su 90 dà +100, -30 su -95 dà -100', (await rel())['GBR|ITA'] === 100 && (await rel())['ITA|URSS'] === -100, await rel());
  check('…e le righe dicono quello che è successo davvero, dalla più grande: +90 → +100 (10 punti), −95 → −100 (5 punti)',
    JSON.stringify((await relLines())[0]) === JSON.stringify(['Italia – Regno Unito: +90 → +100 (Molto strette) — Alleanza', 'Italia – Unione Sovietica: −95 → −100 (Ostilità aperta) — Guerra']), await relLines());
  await turn({ relazioni: [{ nazione_a: 'ITA', nazione_b: 'GBR', variazione: 30 }] });
  check('una variazione che non cambia più nulla (già a +100) non lascia nessuna riga', (await relLines()).length === 1 && (await rel())['GBR|ITA'] === 100, await relLines());

  // =============================================================== 6. i territori che passano di mano
  console.log('— i territori che passano di mano peggiorano da soli le relazioni (regola del gioco)');
  await restart('FRG');
  const geo = await ev(() => {
    const P = window.__t.provinces, gdr = Object.keys(P).filter(i => P[i].owner === 'GDR');
    const border = gdr.filter(i => P[i].neighbors.some(n => P[n].owner === 'FRG')), inner = gdr.filter(i => !P[i].neighbors.some(n => P[n].owner === 'FRG'));
    let A = null, B = null;
    for (const a of border) { const b = inner.find(x => P[a].neighbors.includes(x)); if (b) { A = a; B = b; break; } }
    return { A, B, A2: border.find(i => i !== A) };
  });
  check('la mappa di prova ha due province di confine e una dietro', geo.A && geo.B && geo.A2, geo);
  await turn({ cambi_territoriali: [{ provincia: geo.A, nuovo_proprietario: 'FRG' }] });
  check('una provincia della Germania Est passa alla Germania Ovest: la relazione scende di 10 (−60 → −70)', (await rel())['FRG|GDR'] === -70, await rel());
  check('…il diario ha il cambio sulla mappa e poi la riga delle relazioni, col motivo', (await kinds()) === 't,g,r' && JSON.stringify(await relLines()) === JSON.stringify([['Germania Ovest – Germania Est: −60 → −70 (Ostili) — cambio di sovranità (1 territorio)']]), [await kinds(), await relLines()]);
  await restart('FRG');
  await turn({ cambi_territoriali: [{ provincia: geo.A, nuovo_proprietario: 'FRG' }, { provincia: geo.B, nuovo_proprietario: 'FRG' }] });
  check('due province: −12 (−10 e −2 per la seconda)', (await rel())['FRG|GDR'] === -60 + conquista(2) && (await relLines())[0][0].endsWith('(2 territori)'), [await rel(), await relLines()]);
  await restart('FRG');
  await turn({ cambi_controllo: [{ provincia: geo.A2, nuovo_controllore: 'FRG' }] });
  check('una provincia solo occupata (resta della Germania Est, la controlla la Germania Ovest): −6', (await rel())['FRG|GDR'] === -60 + occupazione(1) && (await relLines())[0][0] === 'Germania Ovest – Germania Est: −60 → −66 (Ostili) — occupazione (1 territorio)', [await rel(), await relLines()]);
  await restart('FRG');
  await turn({ cambi_territoriali: [{ provincia: geo.A, nuovo_proprietario: 'FRG' }], relazioni: [{ nazione_a: 'FRG', nazione_b: 'GDR', variazione: 4, motivo: 'Accordo sui confini' }] });
  check('cambio di sovranità e variazione del motore sulla stessa coppia: si sommano (−10 e +4), una riga sola con tutti e due i motivi', (await rel())['FRG|GDR'] === -66
    && JSON.stringify(await relLines()) === JSON.stringify([['Germania Ovest – Germania Est: −60 → −66 (Ostili) — cambio di sovranità (1 territorio); Accordo sui confini']]), [await rel(), await relLines()]);
  await restart('FRG');
  await turn({ cambi_territoriali: [{ provincia: 'XX_99', nuovo_proprietario: 'FRG' }, { provincia: geo.A, nuovo_proprietario: 'ZZZ' }] });
  check('un cambio non applicato (provincia che non esiste, proprietario che non esiste) non costa nulla alle relazioni e non lascia righe', JSON.stringify(await rel()) === '{}' && (await kinds()) === 't', [await rel(), await kinds()]);
  await restart('ITA');
  const polBorder = await ev(() => { const P = window.__t.provinces; return Object.keys(P).find(i => P[i].owner === 'GDR' && P[i].neighbors.some(n => P[n].owner === 'POL')); });
  check('c\'è una provincia della Germania Est che confina con la Polonia', !!polBorder, polBorder);
  await turn({ cambi_territoriali: [{ provincia: polBorder, nuovo_proprietario: 'POL' }] });
  check('un cambio di territorio fra altri due Stati (non il tuo) pesa lo stesso: Germania Est → Polonia, da +45 a +35; è l\'unica coppia che si muove, e la riga non nomina Italia',
    igual(await rel(), { 'GDR|POL': base('GDR', 'POL') + conquista(1) }) && base('GDR', 'POL') === 45
    && JSON.stringify(await relLines()) === JSON.stringify([['Germania Est – Polonia: +45 → +35 (Amichevoli) — cambio di sovranità (1 territorio)']]), [await rel(), await relLines()]);
  await restart('ITA');
  const gdrIds = await ev(() => Object.keys(window.__t.provinces).filter(i => window.__t.provinces[i].owner === 'GDR').slice(0, 14));
  check('la Germania Est ha almeno 12 province per queste prove', gdrIds.length >= 12, gdrIds.length);
  const unit = await ev(gdr => {
    const T = window.__t, P = T.provinces, out = {};
    const snap = () => T.territorySnapshot();
    const prova = (nome, mossa) => { const s = snap(); mossa(); const e = T.territoryRelationEffects(s); out[nome] = [T.relGet('FRG', 'GDR'), e.map(x => x.why)]; T.relSet('FRG', 'GDR', -60); for (const id of Object.keys(T.initialTerritory)) { P[id].owner = T.initialTerritory[id].owner; P[id].controller = T.initialTerritory[id].controller; } };
    const passa = n => gdr.slice(0, n).forEach(id => { P[id].owner = 'FRG'; P[id].controller = 'FRG'; });
    const occupa = n => gdr.slice(0, n).forEach(id => { P[id].controller = 'FRG'; });
    for (const n of [1, 2, 3, 6, 7, 12]) prova('sovranità ' + n, () => passa(n));
    for (const n of [1, 2, 7, 8, 12]) prova('occupazione ' + n, () => occupa(n));
    prova('sovranità 2 e occupazione 3', () => { passa(2); gdr.slice(2, 5).forEach(id => { P[id].controller = 'FRG'; }); });
    prova('nessun cambiamento', () => {});
    prova('passa e ritorna nello stesso turno', () => { passa(3); gdr.slice(0, 3).forEach(id => { P[id].owner = 'GDR'; P[id].controller = 'GDR'; }); });
    // il controllo torna al proprietario in un turno successivo: nessun effetto (né in meglio né in peggio)
    gdr.slice(0, 2).forEach(id => { P[id].controller = 'FRG'; });
    const s2 = snap(); gdr.slice(0, 2).forEach(id => { P[id].controller = 'GDR'; }); const e2 = T.territoryRelationEffects(s2); out.ritorno = [T.relGet('FRG', 'GDR'), e2.length];
    for (const id of Object.keys(T.initialTerritory)) { P[id].owner = T.initialTerritory[id].owner; P[id].controller = T.initialTerritory[id].controller; }
    return out;
  }, gdrIds);
  check('sovranità: 1 → −10, 2 → −12, 3 → −14, 6 → −20, 7 e 12 → ancora −20 (il massimo per coppia e per turno)', [1, 2, 3, 6, 7, 12].every(n => unit['sovranità ' + n][0] === -60 + conquista(n)) && unit['sovranità 7'][0] === -80 && unit['sovranità 12'][0] === -80, unit);
  check('occupazione: 1 → −6, 2 → −7, 7 → −12, 8 e 12 → ancora −12', [1, 2, 7, 8, 12].every(n => unit['occupazione ' + n][0] === -60 + occupazione(n)) && unit['occupazione 8'][0] === -72, unit);
  check('sovranità e occupazione nello stesso turno si sommano (2 passate: −12; 3 occupate: −8) = −20', unit['sovranità 2 e occupazione 3'][0] === -60 - 12 - 8 && unit['sovranità 2 e occupazione 3'][1].length === 2, unit['sovranità 2 e occupazione 3']);
  check('nessun cambiamento sulla mappa: nessun effetto; una provincia che passa e torna nello stesso turno: nessun effetto', unit['nessun cambiamento'][0] === -60 && unit['nessun cambiamento'][1].length === 0 && unit['passa e ritorna nello stesso turno'][0] === -60 && unit['passa e ritorna nello stesso turno'][1].length === 0, [unit['nessun cambiamento'], unit['passa e ritorna nello stesso turno']]);
  check('il controllo che torna al proprietario non cambia la relazione (non si sa se per trattato o per forza)', unit.ritorno[0] === -60 && unit.ritorno[1] === 0, unit.ritorno);
  check('il motivo dice il numero di territori, con singolare e plurale', unit['sovranità 1'][1][0] === 'cambio di sovranità (1 territorio)' && unit['sovranità 3'][1][0] === 'cambio di sovranità (3 territori)' && unit['occupazione 2'][1][0] === 'occupazione (2 territori)', [unit['sovranità 1'], unit['sovranità 3'], unit['occupazione 2']]);

  // =============================================================== 7. il ritorno lento ai valori di partenza
  console.log('— il tempo guarisce: ogni mese lo scarto dal valore di partenza si riduce del 4% (di un punto almeno)');
  await restart('ITA');
  const dr = await ev(() => {
    const T = window.__t, out = {}, get = (a, b) => T.relGet(a, b), st = () => T.getState();
    T.relSet('ITA', 'FRA', 65); T.driftRelations('1 mese'); out.mese = get('ITA', 'FRA');                                  // +30 sul valore di partenza (35): passo 2
    T.relSet('ITA', 'FRA', 65); T.driftRelations('1 anno'); out.anno = get('ITA', 'FRA');
    T.relSet('ITA', 'FRA', 65); T.driftRelations('6 mesi'); out.seimesi = get('ITA', 'FRA');
    T.relSet('ITA', 'URSS', -100); T.driftRelations('1 mese'); out.negativo = get('ITA', 'URSS');                           // −40 sul valore di partenza (−60): passo 2, verso l'alto
    T.relSet('ITA', 'URSS', -61); T.relSet('ITA', 'FRA', 36); T.driftRelations('1 mese'); out.piccoli = [get('ITA', 'URSS'), get('ITA', 'FRA'), JSON.stringify(st().rel)];
    T.relSet('ITA', 'FRA', 37); T.driftRelations('1 mese'); out.dueP = [get('ITA', 'FRA'), JSON.stringify(st().rel)];     // da 2 punti: scende di 1, non oltre
    T.relSet('ITA', 'FRA', 100); T.relSet('ITA', 'URSS', -100); T.relSet('ITA', 'YUG', 40);
    for (let i = 0; i < 60; i++) T.driftRelations('1 anno');
    out.dopoTanto = [JSON.stringify(st().rel), get('ITA', 'FRA'), get('ITA', 'URSS'), get('ITA', 'YUG')];
    T.relSet('ITA', 'FRA', 50); out.sconosciuto = (T.driftRelations('un attimo'), get('ITA', 'FRA'));                          // un salto che non si conosce vale un mese
    T.relSet('ITA', 'FRA', 35); T.relSet('ITA', 'YUG', 0); out.fermi = (T.driftRelations('1 anno'), [JSON.stringify(st().rel), get('ITA', 'FRA')]);
    // i salti di una settimana si sommano: quattro settimane fanno un mese
    st().relClock = 0; T.relSet('ITA', 'FRA', 65);
    const sett = [];
    for (let i = 0; i < 4; i++) { T.driftRelations('1 settimana'); sett.push([get('ITA', 'FRA'), st().relClock]); }
    out.sett = sett;
    T.driftRelations('1 settimana'); T.driftRelations('6 mesi'); out.sett2 = [get('ITA', 'FRA'), st().relClock];
    return out;
  });
  check('un mese da +30: scende di 2 (ceil(30 × 4%) = 2) → 63 (valore scritto a mano) e come il calcolo indipendente', dr.mese === 63 && dr.mese === dopo(65, 35, 1), dr.mese);
  check('un anno da +30 (12 mesi): 50, come il calcolo indipendente, mai oltre il valore di partenza', dr.anno === dopo(65, 35, 12) && dr.anno === 50 && dr.anno > 35, dr.anno);
  check('sei mesi da +30: come il calcolo indipendente', dr.seimesi === dopo(65, 35, 6), [dr.seimesi, dopo(65, 35, 6)]);
  check('anche gli scarti negativi tornano verso il valore di partenza (da −100 a −98, verso il valore di partenza −60)', dr.negativo === -98 && dr.negativo === dopo(-100, -60, 1), dr.negativo);
  check('uno scarto piccolo scende di un punto per mese (mai di meno), e a zero la coppia sparisce dall\'elenco di quelle da salvare', dr.piccoli[0] === -60 && dr.piccoli[1] === 35 && dr.piccoli[2] === '{}', dr.piccoli);
  check('uno scarto di 2 punti scende di 1 e non passa oltre il valore di partenza', dr.dueP[0] === 36 && dr.dueP[1] === '{"FRA|ITA":36}', dr.dueP);
  check('dopo sessanta turni da «1 anno» tutto è tornato al valore di partenza e non resta nulla da salvare', dr.dopoTanto[0] === '{}' && dr.dopoTanto[1] === 35 && dr.dopoTanto[2] === -60 && dr.dopoTanto[3] === 0, dr.dopoTanto);
  check('un salto che la pagina non conosce conta come un mese: 50 → 49 (ceil(15 × 4%) = 1)', dr.sconosciuto === 49, dr.sconosciuto);
  check('le coppie al valore di partenza non si muovono', dr.fermi[0] === '{}' && dr.fermi[1] === 35, dr.fermi);
  check('quattro «1 settimana» fanno un mese: le prime tre non cambiano nulla (65, 65, 65), la quarta scende di 2; il tempo non contato si ricorda', JSON.stringify(dr.sett) === JSON.stringify([[65, 0.25], [65, 0.5], [65, 0.75], [63, 0]]), dr.sett);
  check('una settimana e poi sei mesi: sei mesi interi contati e il quarto di mese resta da parte', dr.sett2[0] === dopo(63, 35, 6) && dr.sett2[1] === 0.25, dr.sett2);

  console.log('— …dentro il turno: il tempo passa prima delle novità del turno');
  await restart('ITA');
  await ev(() => { window.__t.relSet('ITA', 'FRA', 65); window.__t.relSet('ITA', 'URSS', -100); window.__t.relSet('FRA', 'GBR', 50); });
  await turn({ relazioni: [{ nazione_a: 'ITA', nazione_b: 'FRA', variazione: -10, motivo: 'Dazi' }] });
  const t1 = await rel();
  check('il turno di 1 mese: la coppia nominata scende prima di 2 (65 → 63) e poi di 10 = 53; le altre (−100 → −98; 50 → 49) solo per il tempo', t1['FRA|ITA'] === 53 && t1['ITA|URSS'] === -98 && t1['FRA|GBR'] === 49, t1);
  check('…la riga del diario parte dal valore che c\'era a inizio turno (65), non da quello già ammorbidito dal tempo; il solo tempo non fa scrivere righe', JSON.stringify(await relLines()) === JSON.stringify([['Italia – Francia: +65 → +53 (Strette) — Dazi']]), await relLines());
  await ev(() => { document.getElementById('jump').value = '1 settimana'; });
  const ck = await ev(() => window.__t.getState().relClock);
  await turn();
  check('il salto «1 settimana» nel turno conta un quarto di mese', (await ev(() => window.__t.getState().relClock)) === ck + 0.25, [ck, await ev(() => window.__t.getState().relClock)]);

  // =============================================================== 8. salvataggio e caricamento
  console.log('— salvataggio: solo le coppie che differiscono dal valore di partenza');
  await restart('ITA');
  let sv = await ev(() => JSON.parse(JSON.stringify(window.__t.buildSavePayload())));
  check('a inizio partita il salvataggio non ha né «relations» né «relClock»', sv.game && !('relations' in sv.game) && !('relClock' in sv.game) && sv.schemaVersion === 3 && sv.v === 3, Object.keys(sv.game || {}));
  await ev(() => { const T = window.__t; T.relSet('URSS', 'ITA', -45); T.relSet('ITA', 'FRA', 20); T.relSet('GBR', 'FRA', 43); T.relSet('ITA', 'YUG', 0); T.getState().relClock = 0.5; });
  sv = await ev(() => JSON.parse(JSON.stringify(window.__t.buildSavePayload())));
  check('il salvataggio ha solo gli scarti, con le chiavi in ordine alfabetico, e il tempo non ancora contato', JSON.stringify(sv.game.relations) === JSON.stringify({ 'FRA|GBR': 43, 'FRA|ITA': 20, 'ITA|URSS': -45 }) && sv.game.relClock === 0.5, sv.game);
  check('il formato resta lo stesso (v 3, schemaVersion 3): i campi nuovi sono facoltativi', sv.v === 3 && sv.schemaVersion === 3);
  await ev(async () => { await window.__t.saveGame(); });
  await ev(() => { window.__t.resetGame(); });
  check('dopo «Nuova partita» non resta nulla', JSON.stringify(await rel()) === '{}');
  const ok = await ev(() => window.__t.loadGame());
  check('«Carica» riporta le relazioni com\'erano, con il tempo non contato', ok === true && igual(await rel(), { 'FRA|GBR': 43, 'FRA|ITA': 20, 'ITA|URSS': -45 }) && (await ev(() => window.__t.getState().relClock)) === 0.5, await rel());
  P = await panel();
  check('…e il pannello le mostra: Francia +20, Unione Sovietica −45, e il diario porta le righe delle relazioni', !P.hidden && P.items.find(i => i.name === 'Francia').val === '+20' && P.items.find(i => i.name === 'Unione Sovietica').val === '−45', P.items.find(i => i.name === 'Francia'));
  // Il diario con le righe delle relazioni passa dal salvataggio
  await restart('ITA');
  await turn({ relazioni: [{ nazione_a: 'ITA', nazione_b: 'FRA', variazione: -20, motivo: 'Crisi <i>grave</i> & dazi' }] });
  const logPrima = await relLines();
  await ev(async () => { await window.__t.saveGame(); window.__t.resetGame(); await window.__t.loadGame(); });
  check('le righe «Relazioni» del diario tornano dopo il caricamento, uguali, e il testo resta testo', JSON.stringify(await relLines()) === JSON.stringify(logPrima) && (await ev(() => document.querySelectorAll('#log .entry-rel').length)) === 1
    && (await ev(() => document.querySelector('#log .entry-rel i') === null && document.querySelector('#log .entry-rel').innerHTML.includes('&amp;'))), [await relLines(), logPrima]);

  console.log('— salvataggio: un documento rotto, vecchio o ostile non rompe la partita');
  await restart('ITA');
  const base0 = await ev(() => JSON.parse(JSON.stringify(window.__t.buildSavePayload())));
  // «relationsJson» è il testo del documento: la pagina lo legge con JSON.parse, come farebbe con un file vero (così arrivano anche chiavi come «__proto__»)
  const carica = async (relationsJson, extra = {}) => ev(([b, r, x]) => {
    const d = JSON.parse(JSON.stringify(b));
    if (r === undefined) delete d.game.relations; else d.game.relations = JSON.parse(r);
    Object.assign(d.game, x);
    const res = window.__t.applySave(d);
    const s = window.__t.getState();
    return { res, rel: JSON.parse(JSON.stringify(s.rel)), clock: s.relClock };
  }, [base0, relationsJson, extra]);
  let r = await carica(undefined);
  check('un salvataggio senza «relations» (fatto prima della versione 32) si carica: ogni coppia al valore di partenza', r.res !== false && JSON.stringify(r.rel) === '{}' && r.clock === 0, r);
  const ostile = '{"FRA|ITA":20,"ITA|URSS":-45,"AUT|ITA":-7,"ITA|FRA":12,"ita|fra":12,"FRA|ZZZ":5,"ITA|ITA":5,"FRA|GBR":12.5,"GBR|ITA":"40","ITA|YUG":101,"FRG|ITA":-101,"BEL|ITA":35,'
    + '"CHE|ITA":-0,"DNK|ITA":null,"NLD|ITA":true,"__proto__":5,"constructor|ITA":5,"ITA|":5,"|":5,"AB|CD":5,"ITA|URSS|X":5,"CHN|ITA":[-5],"ESP|ITA":{"v":5},"ISL|ITA":1e999,"AUT|ITA ":4,"PRT|ITA":9}';
  r = await carica(ostile);
  check('voci buone sì (FRA|ITA 20, ITA|URSS −45, AUT|ITA −7); no: chiave non in ordine, minuscola, Stato che non esiste, Stato uguale, numero con la virgola, testo, fuori da ±100, uguale al valore di partenza (anche −0), null, vero/falso, «__proto__», liste e oggetti, infinito, spazi, forme strane',
    igual(r.rel, { 'FRA|ITA': 20, 'ITA|URSS': -45, 'AUT|ITA': -7 }), r.rel);
  for (const [nome, v] of [['una lista', '[1,2,3]'], ['un testo', '"FRA|ITA"'], ['un numero', '5'], ['null', 'null'], ['vera', 'true']]) {
    r = await carica(v);
    check('«relations» che è ' + nome + ': ignorato, partita normale', r.res !== false && JSON.stringify(r.rel) === '{}', r);
  }
  const tanti = {}; for (let i = 0; i < 6000; i++) tanti['AAA|B' + String(i).padStart(3, '0')] = 5;
  tanti['FRA|ITA'] = 20;
  const t0 = Date.now();
  r = await carica(JSON.stringify(tanti));
  check('seimila voci inventate: nessuna passa (e si legge in fretta, il tetto è 4.000 voci)', JSON.stringify(r.rel) === '{}' && Date.now() - t0 < 3000, [r.rel, Date.now() - t0]);
  for (const [v, atteso] of [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75], [0.3, 0.25], [0.99, 0.75], [1, 0], [5, 0], [-1, 0], [0, 0], ['x', 0], [null, 0], [NaN, 0]]) {
    r = await carica('{}', { relClock: v });
    check('«relClock» ' + JSON.stringify(v) + ' → ' + atteso + ' (solo multipli di un quarto di mese, sotto un mese)', r.clock === atteso, r);
  }
  // una partita libera (senza mappa) non ha relazioni, anche se il documento le porta
  await ev(() => { window.__t.resetGame(); });
  await page.fill('#nation', 'Impero Romano'); await page.fill('#startYear', '400 d.C.');
  await queueJson(TURN({ nuovo_anno: '401', relazioni: [{ nazione_a: 'ITA', nazione_b: 'FRA', variazione: 20 }] }));
  await page.click('#startBtn');
  await playTurn(page, 'Rinforzo il Reno');
  await spinnerOff();
  const lib =await ev(() => ({ p: window.__prompts[window.__prompts.length - 1], rel: JSON.stringify(window.__t.getState().rel), clock: window.__t.getState().relClock, mode: window.__t.getGameMode(),
    save: JSON.parse(JSON.stringify(window.__t.buildSavePayload())).game, hidden: document.getElementById('relPanel').classList.contains('hidden'), n: document.querySelectorAll('#log .entry-rel').length }));
  check('partita libera (senza mappa): niente relazioni nella richiesta, nella risposta, nel salvataggio e sullo schermo', lib.mode === 'free' && !/Relazioni|"relazioni"|relazioni/.test(lib.p) && lib.rel === '{}' && lib.clock === 0
    && !('relations' in lib.save) && !('relClock' in lib.save) && lib.hidden && lib.n === 0, { mode: lib.mode, p: /elazioni/.test(lib.p), rel: lib.rel, hidden: lib.hidden });
  const libSave = await ev(() => { const d = JSON.parse(JSON.stringify(window.__t.buildSavePayload())); d.game.relations = { 'FRA|ITA': 20 }; d.game.relClock = 0.5; window.__t.applySave(d); return { rel: JSON.stringify(window.__t.getState().rel), clock: window.__t.getState().relClock }; });
  check('…e un documento di partita libera che porta delle relazioni le scarta', libSave.rel === '{}' && libSave.clock === 0, libSave);

  // =============================================================== 9. ciò che si dice all'AI
  console.log('— ciò che si dice all\'AI: le relazioni di chi gioca, le regole e il formato della risposta');
  await restart('ITA');
  await turn({ relazioni: [] });
  const p0 = await lastPrompt();
  const sezione = (p, da, fino) => { const i = p.indexOf(da); const j = p.indexOf(fino, i); return i < 0 || j < 0 ? '' : p.slice(i, j); };
  const ctx = sezione(p0, 'Relazioni fra gli Stati, da -100', 'Relazioni: se un fatto');
  check('la richiesta ha la scala, dice che i valori di partenza sono una stima provvisoria e non dati storici', /Relazioni fra gli Stati, da -100 a \+100 \(da -100 a 0 ostili o fredde, da \+1 a \+100 amichevoli; valori di partenza: stima provvisoria, non dati storici\)\./.test(ctx), ctx.slice(0, 220));
  check('…poi le relazioni di Italia, con il codice (la risposta usa i codici) e il segno: Unione Sovietica (URSS) -60 e almeno uno Stato amico con +35',
    /Relazioni di Italia \(valore attuale\): .*Unione Sovietica \(URSS\) -60/.test(ctx) && /\([A-Z]{3,4}\) \+35/.test(ctx), ctx);
  const righe = (ctx.match(/Relazioni di Italia \(valore attuale\): (.*)\.\n/) || [0, ''])[1].split('; ');
  const codici = righe.map(x => (/\(([A-Z]{3,4})\)/.exec(x) || [])[1]);
  const amici5 = elenco('ITA').filter(x => x.v >= 26).sort((x, y) => y.v - x.v || perTaglia(x, y)).slice(0, 5).map(x => x.c);
  const ostili5 = elenco('ITA').filter(x => x.v <= -26).sort((x, y) => x.v - y.v || perTaglia(x, y)).slice(0, 5).map(x => x.c);
  check('…i cinque più vicini e i cinque più ostili, i più popolosi a parità: Giappone, Germania Ovest, Regno Unito, Francia, Turchia; Cina, Unione Sovietica, Polonia, Romania, Germania Est (a mano)',
    JSON.stringify(amici5) === JSON.stringify(['JPN', 'FRG', 'GBR', 'FRA', 'TUR']) && JSON.stringify(ostili5) === JSON.stringify(['CHN', 'URSS', 'POL', 'ROU', 'GDR']) && [...amici5, ...ostili5].every(c => codici.includes(c)), [amici5, ostili5, codici]);
  check('…in più al massimo 3 Stati messi in primo piano in questo turno: da 10 a 13 voci, ognuna con il suo codice, senza doppioni (non tutti e 82)', righe.length >= 10 && righe.length <= 13 && codici.every(Boolean) && new Set(codici).size === righe.length, righe);
  check('…non ci sono le coppie «cambiate» finché nulla è cambiato', !/Altre coppie cambiate/.test(ctx));
  const somm0 = await ev(() => window.__t.relationsSummary());
  check('il riassunto per il consigliere, all\'inizio: i tre più vicini e i tre più ostili, i più popolosi a parità (valori scritti a mano)',
    somm0 === ' Relazioni, da -100 a +100: più vicini Giappone +35, Germania Ovest +35, Regno Unito +35; più ostili Cina -60, Unione Sovietica -60, Polonia -60.', somm0);
  check('la richiesta ha le regole: formato della voce, limite ±30, 12 voci, niente doppioni dei cambi di territorio, ritorno verso la partenza, array vuoto', /"relazioni" come \{"nazione_a":"CODICE","nazione_b":"CODICE","variazione":intero da -30 a 30,"motivo":"frase breve"\}/.test(p0)
    && /al massimo 12 voci/.test(p0) && /Passaggi di sovranità e occupazioni peggiorano già da soli i rapporti: non ripeterli/.test(p0) && /i valori tornano verso quello di partenza/.test(p0) && /"relazioni" è un array vuoto/.test(p0), p0.slice(p0.indexOf('Relazioni: se')).slice(0, 300));
  check('lo schema della risposta ha il campo «relazioni» con le sue quattro chiavi', /"relazioni": \[\{"nazione_a": "CODICE", "nazione_b": "CODICE", "variazione": numero intero da -30 a 30, "motivo": "frase breve"\}\]/.test(p0));
  const parte = await ev(() => ({ ctx: window.__t.relationsContext('', []).length, rules: window.__t.relationsRules().length }));
  check('la parte sulle relazioni è breve: contesto sotto 1.000 caratteri e regole sotto 1.000 (insieme sotto 2.000)', parte.ctx < 1000 && parte.rules < 1000 && parte.ctx + parte.rules < 2000, parte);
  check('la richiesta intera resta moderata (sotto 12.000 caratteri)', p0.length < 12000, p0.length);       // 11.000 fino alla versione 34; i contatti fra altre nazioni (versione 35) aggiungono circa 900 caratteri
  // dopo qualche cambiamento: le coppie fra altri Stati e le relazioni nominate negli ordini
  await ev(() => { const T = window.__t; T.relSet('FRA', 'GBR', 60); T.relSet('GDR', 'URSS', 20); T.relSet('ITA', 'AUT', 15); T.relSet('ITA', 'POL', 5); });
  await page.fill('#actionInput', 'Mando un ambasciatore in Polonia'); await page.click('#sendBtn');
  await turn();
  const p1 = await lastPrompt();
  const ctx1 = sezione(p1, 'Relazioni fra gli Stati, da -100', 'Relazioni: se un fatto');
  check('dopo i cambiamenti: «Altre coppie cambiate rispetto alla partenza» ha le coppie fra altri Stati, con il valore attuale e quello di partenza (Francia–Regno Unito +60 (di partenza +35), Germania Est–Unione Sovietica +20 (di partenza +45))',
    base('GDR', 'URSS') === 45 && /Altre coppie cambiate rispetto alla partenza \(valore attuale\): .*Francia \(FRA\) – Regno Unito \(GBR\): \+60 \(di partenza \+35\)/.test(ctx1)
    && /Germania Est \(GDR\) – Unione Sovietica \(URSS\): \+20 \(di partenza \+45\)/.test(ctx1), ctx1.slice(-300));
  check('…la relazione con uno Stato che il giocatore nomina negli ordini («Polonia», ora +5) c\'è; e c\'è quella che si è mossa di almeno 5 punti dall\'inizio (Austria, +15 su 0)', /Polonia \(POL\) \+5[;.]/.test(ctx1) && /Austria \(AUT\) \+15[;.]/.test(ctx1), ctx1.slice(0, 700));
  const sommario = await ev(() => window.__t.relationsSummary());
  check('il consigliere riceve un riassunto: «Relazioni, da -100 a +100: più vicini …; più ostili …»', /^ Relazioni, da -100 a \+100: più vicini .+; più ostili .+\.$/.test(sommario), sommario);
  await page.click('#advisorBtn');
  await page.waitForFunction(() => document.querySelector('#log .entry-advisor') && document.getElementById('thinking').classList.contains('hidden'));
  check('…ed è nella richiesta al consigliere', /Relazioni, da -100 a \+100: più vicini .+; più ostili .+\./.test(await lastPrompt()), (await lastPrompt()).slice(0, 400));
  await page.click('#tabDiplo');
  await ev(() => { document.getElementById('diploTarget').value = 'il Presidente della Francia'; document.getElementById('diploStartBtn').click(); });
  await ev(() => { document.getElementById('diploInput').value = 'Salve'; document.getElementById('diploSendBtn').click(); });
  await page.waitForFunction(() => document.getElementById('diploThinking').classList.contains('hidden'));
  // la conversazione manda alla AI l'elenco dei messaggi: il primo porta il contesto
  const pd = await ev(() => { const p = window.__prompts[window.__prompts.length - 1]; return Array.isArray(p) ? String(p[0].content) : String(p); });
  check('nella conversazione con un\'altra nazione, il primo messaggio porta la relazione con lo Stato nominato: «Francia +35 (Amichevoli)»', / Relazioni attuali con Italia, da -100 a \+100: Francia \+35 \(Amichevoli\)\./.test(pd), pd.slice(0, 700));
  await ev(() => { document.getElementById('diploResetBtn').click(); });
  const senza = await ev(() => { const T = window.__t; T.resetGame(); return [T.relationsContext('x', []), T.relationsSummary(), T.relationsWith('la Francia')]; });
  check('senza partita sulla mappa le tre parti sono vuote', senza.every(x => x === ''), senza);

  // =============================================================== 10. dati rotti messi apposta
  console.log('— dati delle relazioni rotti messi apposta: la pagina si ferma con un avviso chiaro');
  const cambia = (da, a) => h => { if (!h.includes(da)) throw new Error('il guasto non trova il testo da cambiare: ' + da); return h.replace(da, a); };
  const varianti = [
    ['senza «relations»', cambia('"relations": {', '"relazioni_rinominate": {'), 'nel file dei dati manca «relations», i valori di partenza delle relazioni'],
    ['con «verified» scritto come testo', cambia('"verified": false,\n      "basis"', '"verified": "no",\n      "basis"'), '«relations.verified» manca o non è vero/falso'],
    ['senza «basis»', cambia('"basis": "Valori di partenza', '"base": "Valori di partenza'), '«relations.basis» manca'],
    ['senza «blocs»', cambia('"blocs": {', '"blocchi": {'), '«relations.blocs» manca o è vuoto'],
    ['con un\'alleanza che non sta in nessun blocco', cambia('"alliances": ["NATO", ', '"alliances": ['), 'non sta in nessun blocco delle relazioni'],
    ['con un\'alleanza in due blocchi', cambia('"alliances": ["Patto di Varsavia", "Blocco comunista"]', '"alliances": ["Patto di Varsavia", "Blocco comunista", "NATO"]'), 'l\'alleanza «NATO» sta in due blocchi delle relazioni'],
    ['senza «bloc_values»', cambia('"bloc_values": {', '"valori_blocchi": {'), '«relations.bloc_values» manca'],
    ['con un valore fra blocchi mancante', cambia('"west|west": 35', '"west|west2": 35'), 'il valore «west|west» fra blocchi manca o non è un intero da -100 a 100'],
    ['con un valore fuori da ±100', cambia('"east|west": -60', '"east|west": -160'), 'il valore «east|west» fra blocchi manca o non è un intero da -100 a 100'],
    ['con un valore con la virgola', cambia('"east|east": 45', '"east|east": 45.5'), 'il valore «east|east» fra blocchi manca o non è un intero da -100 a 100'],
    ['con un gruppo che nomina uno Stato che non c\'è', cambia('"TJK", "KGZ"], "value": 80', '"TJK", "KGX"], "value": 80'), 'un gruppo delle relazioni non è valido'],
    ['con un gruppo a 800', cambia('"value": 80}', '"value": 800}'), 'un gruppo delle relazioni non è valido'],
    ['con una madrepatria che non c\'è', cambia('"Colonia portoghese": "PRT"', '"Colonia portoghese": "XXX"'), '«relations.metropoles» non è valido'],
    ['con una colonia di un\'alleanza che non esiste', cambia('"Colonia portoghese": "PRT"', '"Colonia lusitana": "PRT"'), '«relations.metropoles» non è valido'],
    ['con «metropole_value» scritto come testo', cambia('"metropole_value": 60', '"metropole_value": "60"'), '«relations.metropole_value» non è un intero da -100 a 100'],
  ];
  for (const [nome, transform, atteso] of varianti) {
    const v = await launch({ width: 390, height: 844, transform, waitForHook: false });
    const s = await v.page.evaluate(() => { const box = document.getElementById('statesError'), setup = document.getElementById('setup'), game = document.getElementById('game');
      return { visibile: !box.classList.contains('hidden') && getComputedStyle(box).display !== 'none', ruolo: box.getAttribute('role'), testo: box.textContent,
        setup: setup && getComputedStyle(setup).display, game: game && getComputedStyle(game).display, gancio: typeof window.__t }; });
    check(nome + ': compare l\'avviso con il motivo (role="alert") e la pagina non parte', s.visibile && s.ruolo === 'alert' && s.testo.startsWith('Il prototipo non può partire: i dati degli Stati non sono stati letti (') && s.testo.includes(atteso) && s.setup === 'none' && s.game === 'none' && s.gancio === 'undefined', s);
    check(nome + ': l\'unico errore è il messaggio nella console, non un\'eccezione', v.errors.length === 1 && v.errors[0].startsWith('console.error: Dati degli Stati non letti: ') && v.errors[0].includes(atteso), v.errors);
    await v.browser.close();
  }
  console.log('— se il file dicesse che i valori sono verificati, la pagina lo direbbe (e nient\'altro prima)');
  const vv = await launch({ width: 640, height: 1100, transform: cambia('"verified": false,\n      "basis"', '"verified": true,\n      "basis"') });
  await vv.page.evaluate(() => window.__t.startFixedScenarioGame('ITA'));
  const ver = await vv.page.evaluate(() => { const T = window.__t; T.openProvincePanel(Object.keys(T.provinces).find(i => T.initialTerritory[i].owner === 'FRA'));
    return { prov: T.REL_PROVISIONAL, nota: document.getElementById('relNote').textContent, riga: document.getElementById('pp-rel').textContent, ctx: T.relationsContext('', []) }; });
  check('«verified: true» nel file: la nota dice «segnati come verificati», la scheda non dice «(provvisorio)», la richiesta non dice «stima provvisoria»',
    ver.prov === false && /segnati come verificati nel file dei dati/.test(ver.nota) && !/stima provvisoria/.test(ver.nota) && ver.riga === '+35 · Amichevoli' && !/stima provvisoria/.test(ver.ctx) && /^Relazioni fra gli Stati, da -100 a \+100 \(da -100 a 0 ostili o fredde, da \+1 a \+100 amichevoli\)\./.test(ver.ctx), ver);
  check('…senza errori', vv.errors.length === 0, vv.errors);
  await vv.browser.close();

  check('nessun errore della pagina in tutta la prova', errors.length === 0, errors);
  await browser.close();
  process.exit(summary() ? 1 : 0);
})();
