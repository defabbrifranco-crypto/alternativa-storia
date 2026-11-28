// Messaggi in arrivo dalle altre nazioni (versione 33): dopo ogni «Avanza» il motore può far scrivere al giocatore fino a 3 Stati (richiesta di
// colloquio, proposta di accordo, richiesta, ultimatum). Ogni messaggio ha un peso da 1 a 5. Il giocatore accetta, rifiuta, risponde con un
// colloquio nella scheda Diplomazia oppure non fa nulla; le risposte contano quando il tempo avanza: le relazioni con chi scrive cambiano del
// valore del tipo di messaggio e di risposta per il peso (una regola del gioco, non un dato storico). I colloqui li legge il motore.
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

// ---- il secondo calcolo dei valori di partenza (come nella prova delle relazioni), scritto qui e non letto dalla pagina
function base(a, b) {
  if (a === b) return 0;
  for (const g of REL.groups) if (g.members.includes(a) && g.members.includes(b)) return g.value;
  const A = STATO[a].alliance, B = STATO[b].alliance;
  if (REL.metropoles[A] === b || REL.metropoles[B] === a) return REL.metropole_value;
  return REL.bloc_values[[BLOCCO[A], BLOCCO[B]].sort().join('|')];
}
const BANDE = [[-100, -76, 'Ostilità aperta'], [-75, -51, 'Ostili'], [-50, -26, 'Tese'], [-25, 0, 'Fredde'], [1, 25, 'Cordiali'], [26, 50, 'Amichevoli'], [51, 75, 'Strette'], [76, 100, 'Molto strette']];
const banda = v => (BANDE.find(([lo, hi]) => v >= lo && v <= hi) || [0, 0, ''])[2];
const segno = v => (v > 0 ? '+' + v : v < 0 ? '−' + (-v) : '0');
const limita = v => Math.max(-100, Math.min(100, v));

// ---- la tavola dei messaggi, scritta a mano: per ogni punto di peso, che cosa cambia nelle relazioni con chi scrive
const TAVOLA = { colloquio: { accetta: 2, rifiuta: -1, ignora: -1 }, accordo: { accetta: 4, rifiuta: -2, ignora: -1 },
  richiesta: { accetta: 3, rifiuta: -3, ignora: -2 }, ultimatum: { accetta: 0, rifiuta: -5, ignora: -5 } };
const TIPI = Object.keys(TAVOLA), SCELTE = ['accetta', 'rifiuta', 'ignora'];
const NOME_TIPO = { colloquio: 'Richiesta di colloquio', accordo: 'Proposta di accordo', richiesta: 'Richiesta', ultimatum: 'Ultimatum' };
const PAROLA = { accetta: 'accettato', rifiuta: 'rifiutato', ignora: 'ignorato (senza risposta)', trattativa: 'in trattativa (colloquio)' };
const PAROLE_PESO = ['Minore', 'Medio', 'Rilevante', 'Alto', 'Cruciale'];
const effetto = (tipo, scelta, peso) => TAVOLA[tipo][scelta] * peso;
const minuscolo = tipo => NOME_TIPO[tipo].toLowerCase();
const PL = 'ITA';
const stakes = (da, tipo, peso) => { const v = base(PL, da); return `Relazioni con ${NOME[da]} ora ${segno(v)} (${banda(v)}). Se accetti ${segno(effetto(tipo, 'accetta', peso))}, se rifiuti ${segno(effetto(tipo, 'rifiuta', peso))}, se non rispondi ${segno(effetto(tipo, 'ignora', peso))}; con un colloquio nessun effetto automatico.`; };
const etichetta = (act, da, tipo, peso) => { const quale = `messaggio di ${NOME[da]} (${minuscolo(tipo)}, peso ${peso})`;
  return act === 'accept' ? `Accetta il ${quale}` : act === 'refuse' ? `Rifiuta il ${quale}` : `Rispondi al ${quale} con un colloquio nella scheda Diplomazia`; };
const STATUS = { nuovo: 'Senza risposta: se fai avanzare il tempo conta come ignorato.', accettato: 'Accettato: avrà effetto quando fai avanzare il tempo.',
  rifiutato: 'Rifiutato: avrà effetto quando fai avanzare il tempo.', trattativa: 'In trattativa: il colloquio conta per questo periodo, senza effetto automatico sulle relazioni.' };
const AVVISO_SCARTI = n => `⚠️ Messaggi scartati: ${n} (mittente, tipo o testo non validi, due messaggi dallo stesso Stato, oppure oltre il massimo di 3 per periodo)`;

const TURN = (extra = {}) => Object.assign({ evento_titolo: 'Titolo di prova', narrativa: 'Narrativa di prova.', riepilogo_mondo: 'Riepilogo di prova.',
  nuovo_anno: 'gennaio 1961', stabilita: 55, economia: 55, esercito: 55, prestigio: 55, cambi_territoriali: [], cambi_controllo: [], segnaposto: [] }, extra);
const MSG = (da, tipo, peso, testo) => ({ da, tipo, peso, testo });
const M3 = [MSG('FRA', 'accordo', 4, 'Proponiamo un patto di amicizia.'), MSG('URSS', 'ultimatum', 5, 'Ritirate le truppe.'), MSG('GBR', 'colloquio', 2, 'Vorremmo incontrarvi.')];
const INBOX3 = M3.map((m, i) => ({ id: 'm' + (i + 1), from: m.da, type: m.tipo, weight: m.peso, text: m.testo, decision: '', talk: false }));

(async () => {
  const { browser, page, errors } = await launch({ width: 640, height: 1100, mobile: false });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const restart = c => ev(c => { window.__queue.length = 0; window.__textQueue.length = 0; window.__t.resetGame(); window.__t.startFixedScenarioGame(c); }, c);
  const queueJson = v => ev(v => { window.__queue.push(v); }, v);
  const queueText = t => ev(t => { window.__textQueue.push({ text: t }); }, t);
  const spinnerOff = () => page.waitForFunction(() => document.getElementById('thinking').classList.contains('hidden'));
  const advance = async () => { await page.click('#advanceBtn'); await spinnerOff(); };
  const turn = async extra => { await queueJson(TURN(extra)); await advance(); };
  const conMessaggi = async (list = M3, extra = {}) => { await restart(PL); await turn(Object.assign({ messaggi: list }, extra)); };
  const inbox = () => ev(() => JSON.parse(JSON.stringify(window.__t.getState().inbox)));
  const talks = () => ev(() => JSON.parse(JSON.stringify(window.__t.getState().talks)));
  const relOf = (a, b) => ev(([a, b]) => window.__t.relGet(a, b), [a, b]);
  const kinds = () => ev(() => window.__t.getState().log.map(e => e.k).join());
  const logLines = k => ev(k => window.__t.getState().log.filter(e => e.k === k).map(e => e.lines), k);
  const lastPrompt = () => ev(() => { const p = window.__prompts[window.__prompts.length - 1]; return Array.isArray(p) ? String(p[0].content) : String(p); });
  const nPrompts = () => ev(() => window.__prompts.length);
  const annuncio = () => ev(() => document.getElementById('a11yStatus').textContent.replace(/ /g, ''));
  const clicca = (id, act) => page.click(`#msgList button[data-id="${id}"][data-act="${act}"]`);
  const attivo = () => ev(() => { const a = document.activeElement; return a ? (a.dataset && a.dataset.id ? a.dataset.id + ':' + a.dataset.act : a.id) : null; });
  // Il pannello «Messaggi in arrivo» così com'è nella pagina
  const pannello = () => ev(() => {
    const g = id => document.getElementById(id), clean = s => s.replace(/\s+/g, ' ').trim(), p = g('msgPanel');
    return {
      hidden: p.classList.contains('hidden') || p.offsetParent === null, tag: p.tagName, labelled: p.getAttribute('aria-labelledby'), title: clean(g('msgTitle').textContent), titleTag: g('msgTitle').tagName,
      empty: clean(g('msgEmpty').textContent), emptyHidden: g('msgEmpty').classList.contains('hidden') || g('msgEmpty').offsetParent === null,
      listTag: g('msgList').tagName, listLabelled: g('msgList').getAttribute('aria-labelledby'), listHidden: g('msgList').classList.contains('hidden') || g('msgList').offsetParent === null,
      warn: clean(g('msgWarn').textContent), warnHidden: g('msgWarn').classList.contains('hidden') || g('msgWarn').offsetParent === null, note: clean(g('msgNote').textContent),
      howTag: g('msgHow').tagName, howOpen: g('msgHow').open, howSummary: clean(g('msgHow').querySelector('summary').textContent),
      items: [...g('msgList').children].map(li => ({ tag: li.tagName, id: li.dataset.id, from: clean(li.querySelector('.msg-from').textContent), type: clean(li.querySelector('.msg-type').textContent),
        weight: clean([...li.querySelector('.msg-weight').childNodes].filter(n => !(n.classList && n.classList.contains('msg-dots'))).map(n => n.textContent).join('')), dots: li.querySelector('.msg-dots').textContent, dotsHidden: li.querySelector('.msg-dots').getAttribute('aria-hidden'),
        text: clean(li.querySelector('.msg-text').textContent), stakes: clean(li.querySelector('.msg-stakes').textContent), status: clean(li.querySelector('.msg-status').textContent),
        buttons: [...li.querySelectorAll('.msg-actions button')].map(b => ({ act: b.dataset.act, text: b.textContent, label: b.getAttribute('aria-label'), pressed: b.getAttribute('aria-pressed'), disabled: b.disabled, type: b.type, tag: b.tagName })) }))
    };
  });
  const bolle = () => ev(() => [...document.getElementById('diploLog').children].map(n => n.textContent.replace(/\s+/g, ' ').trim()));
  const tabAzioni = () => page.click('#tabActions');
  const tabDiplo = () => page.click('#tabDiplo');
  const selezionata = () => ev(() => ({ diplo: document.getElementById('tabDiplo').getAttribute('aria-selected'), azioni: document.getElementById('tabActions').getAttribute('aria-selected') }));
  const scrivi = async testo => { await page.fill('#diploInput', testo); await page.click('#diploSendBtn'); await page.waitForFunction(() => document.getElementById('diploThinking').classList.contains('hidden') && !window.__t.getDiploBusy()); };

  check('la pagina si carica senza errori', errors.length === 0, errors);
  let p = await pannello();
  check('prima di una partita sulla mappa il pannello dei messaggi è nascosto, e anche l\'avviso accanto ad «Avanza»', p.hidden && p.warnHidden && p.items.length === 0, p);

  // =============================================================== 1. la tavola e i tetti
  console.log('— la tavola dei messaggi: tipi, valori delle risposte, pesi e tetti');
  const T0 = await ev(() => { const T = window.__t, M = T.MSG_TYPES; return { tavola: Object.fromEntries(Object.entries(M).map(([k, t]) => [k, { accetta: t.accept, rifiuta: t.refuse, ignora: t.ignore }])),
    nomi: Object.fromEntries(Object.entries(M).map(([k, t]) => [k, t.label])), pesi: T.MSG_WEIGHTS, tetti: [T.MAX_NEW_MESSAGES, T.MAX_INBOX, T.MAX_MSG_LEN, T.MAX_MSG_READ, T.MAX_TALKS, T.MAX_TALKS_PROMPT, T.TALK_YOU_LEN, T.TALK_THEY_LEN, T.MSG_DEFAULT_WEIGHT],
    alias: T.MSG_ALIASES }; });
  check('i quattro tipi di messaggio e il valore di ogni risposta (accettare, rifiutare, ignorare, per ogni punto di peso) sono quelli della tavola scritta qui', JSON.stringify(T0.tavola) === JSON.stringify(TAVOLA), T0.tavola);
  check('…con i loro nomi: Richiesta di colloquio, Proposta di accordo, Richiesta, Ultimatum', JSON.stringify(T0.nomi) === JSON.stringify(NOME_TIPO), T0.nomi);
  check('…e i cinque pesi a parole: Minore, Medio, Rilevante, Alto, Cruciale', JSON.stringify(T0.pesi) === JSON.stringify(PAROLE_PESO), T0.pesi);
  check('i tetti: 3 messaggi nuovi per turno, 6 in un salvataggio, 360 caratteri di testo, 20 voci lette, 12 colloqui tenuti e 5 raccontati al motore (200 + 240 caratteri), peso 2 se non si legge',
    JSON.stringify(T0.tetti) === JSON.stringify([3, 6, 360, 20, 12, 5, 200, 240, 2]), T0.tetti);
  check('i nomi alternativi dei tipi: proposta e patto sono un accordo, incontro un colloquio, minaccia un ultimatum', JSON.stringify(T0.alias) === JSON.stringify({ proposta: 'accordo', patto: 'accordo', incontro: 'colloquio', minaccia: 'ultimatum' }), T0.alias);

  // =============================================================== 2. quali messaggi si accettano
  console.log('— i messaggi del motore: che cosa si accetta e che cosa si scarta');
  const ricevi = list => ev(l => JSON.parse(JSON.stringify(window.__t.receiveMessages(l))), list);
  await restart(PL);
  let r = await ricevi([MSG('FRA', 'accordo', 4, 'Proponiamo un patto di amicizia.')]);
  check('un messaggio valido è accettato: id m1, mittente, tipo, peso e testo; né deciso né in colloquio', r.refused === 0 && r.added.length === 1
    && JSON.stringify(r.added[0]) === JSON.stringify({ id: 'm1', from: 'FRA', type: 'accordo', weight: 4, text: 'Proponiamo un patto di amicizia.', decision: '', talk: false }), r);
  check('…e la funzione non riempie la posta in arrivo: lo fa chi la chiama, all\'«Avanza»', (await inbox()).length === 0);
  await restart(PL);
  r = await ricevi([{ da: ' fra ', tipo: ' ACCORDO ', peso: '3', testo: 'uno' }, { mittente: 'GBR', genere: 'Proposta', importanza: 4, messaggio: 'due' }, { nazione: 'URSS', tipo: 'minaccia', peso: 5, contenuto: 'tre' }]);
  check('il codice si legge anche con spazi e minuscole, il tipo con maiuscole, il peso scritto come testo; chiavi alternative (mittente, genere, importanza, messaggio, nazione, contenuto)',
    r.refused === 0 && JSON.stringify(r.added.map(m => [m.from, m.type, m.weight, m.text])) === JSON.stringify([['FRA', 'accordo', 3, 'uno'], ['GBR', 'accordo', 4, 'due'], ['URSS', 'ultimatum', 5, 'tre']]), r);
  r = await ricevi([{ paese: 'FRG', tipo: 'incontro', peso: 1, testo: 'quattro' }, { da: 'AUT', tipo: 'patto', peso: 1, testo: 'cinque' }]);
  check('«incontro» è un colloquio, «patto» un accordo; la numerazione continua (m4, m5)', JSON.stringify(r.added.map(m => [m.id, m.from, m.type])) === JSON.stringify([['m4', 'FRG', 'colloquio'], ['m5', 'AUT', 'accordo']]), r);
  await restart(PL);
  r = await ricevi(TIPI.map(t => MSG('FRA', t, 3, 'x')).slice(0, 1));
  const quattroTipi = [];
  for (const t of TIPI) quattroTipi.push((await ricevi([MSG('FRA', t, 3, 'x')])).added.map(m => m.type)[0]);
  check('i quattro tipi (colloquio, accordo, richiesta, ultimatum) sono tutti accettati', JSON.stringify(quattroTipi) === JSON.stringify(TIPI) && r.added.length === 1, quattroTipi);
  await restart(PL);
  r = await ricevi(['dichiarazione', '', null, 5, 'constructor', '__proto__', 'proposta di accordo', 'Richiesta di colloquio', ['accordo'], {}].map(t => ({ da: 'FRA', tipo: t, peso: 3, testo: 'x' })));
  check('un tipo che non esiste, vuoto, non testuale o preso dal prototipo di un oggetto: scartato (10 su 10); nemmeno il nome intero scritto per esteso passa', r.added.length === 0 && r.refused === 10, r);
  const pesi = await ev(() => {
    const T = window.__t, out = [];
    const prove = [4, 1, 5, 4.4, 4.5, 4.6, 0, -3, 9, 100, '3', ' 3 ', '3,4', '4.7', '', '   ', 'abc', null, undefined, true, [3], {}, NaN, Infinity, -Infinity, '5', '0', '-2'];
    for (const v of prove) out.push(T.receiveMessages([{ da: 'FRA', tipo: 'accordo', peso: v, testo: 'x' }]).added[0].weight);
    out.push(T.receiveMessages([{ da: 'FRA', tipo: 'accordo', testo: 'x' }]).added[0].weight);
    return out;
  });
  check('il peso: un intero da 1 a 5; si arrotonda (4,5 → 5), si tiene fra 1 e 5 (0 → 1, 100 → 5), si legge anche scritto come testo; quello che non si legge vale 2 (Medio)',
    JSON.stringify(pesi) === JSON.stringify([4, 1, 5, 4, 5, 5, 1, 1, 5, 5, 3, 3, 3, 5, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 5, 1, 1, 2]), pesi);
  await restart(PL);
  const mittenti = await ev(() => {
    const T = window.__t;
    for (const id of T.getCountryProvinces('LUX')) T.changeProvinceOwner(id, 'BEL');
    const prove = [['il giocatore stesso', 'ITA'], ['uno Stato che non esiste', 'ZZZ'], ['vuoto', ''], ['solo spazi', '   '], ['un numero', 123], ['null', null], ['un oggetto', {}], ['una lista', ['FRA']],
      ['__proto__', '__proto__'], ['constructor', 'constructor'], ['uno Stato senza più province (Lussemburgo)', 'LUX']];
    return prove.map(([n, v]) => { const x = T.receiveMessages([{ da: v, tipo: 'accordo', peso: 3, testo: 'x' }]); return [n, x.added.length, x.refused]; });
  });
  check('un mittente che non va è scartato: il giocatore stesso, uno Stato che non c\'è, vuoto, non testuale, preso dal prototipo, o che non ha più province', mittenti.every(([, a, rf]) => a === 0 && rf === 1), mittenti);
  r = await ricevi([{ tipo: 'accordo', peso: 3, testo: 'senza mittente' }, 'FRA', null, 5, ['FRA'], true, { da: 'FRA', tipo: 'accordo', peso: 3 }, { da: 'FRA', tipo: 'accordo', peso: 3, testo: '' }, { da: 'FRA', tipo: 'accordo', peso: 3, testo: '   \n\t ' },
    { da: 'FRA', tipo: 'accordo', peso: 3, testo: '\u0001\u0002' }]);
  check('senza mittente, voci che non sono oggetti, senza testo, con il testo vuoto o fatto solo di spazi e caratteri di controllo: scartati (10 su 10)', r.added.length === 0 && r.refused === 10, r);
  r = await ricevi([{ da: 'FRA', tipo: 'accordo', peso: 3, testo: '<b>Ciao</b>\n\n  mondo\u0007 \t fine' }, { da: 'GBR', tipo: 'accordo', peso: 3, testo: 'y'.repeat(1000) }]);
  check('il testo si pulisce: via < >, a capo e caratteri di controllo, spazi ripetuti', r.added.length === 2 && !/[<>\u0000-\u001f]/.test(r.added[0].text) && !/ {2}/.test(r.added[0].text) && /Ciao/.test(r.added[0].text) && /mondo fine/.test(r.added[0].text), r.added[0]);
  check('…e si ferma a 360 caratteri', r.added[1].text.length === 360 && /^y+$/.test(r.added[1].text), r.added[1].text.length);
  await restart(PL);
  r = await ricevi([MSG('FRA', 'accordo', 3, 'a'), MSG('FRA', 'richiesta', 3, 'b'), MSG('GBR', 'colloquio', 3, 'c'), MSG('URSS', 'ultimatum', 3, 'd'), MSG('TUR', 'accordo', 3, 'e')]);
  check('al massimo uno per Stato (il secondo di Francia è scartato) e al massimo 3 in tutto (il quarto, Turchia, è scartato): arrivano Francia, Regno Unito, Unione Sovietica; scartati 2',
    JSON.stringify(r.added.map(m => m.from)) === JSON.stringify(['FRA', 'GBR', 'URSS']) && r.refused === 2 && r.added[0].text === 'a', r);
  await restart(PL);
  r = await ricevi([null, 'x', MSG('ZZZ', 'accordo', 3, 'a'), MSG('FRA', 'accordo', 3, 'b'), MSG('GBR', 'accordo', 3, 'c'), MSG('URSS', 'accordo', 3, 'd'), MSG('TUR', 'accordo', 3, 'e')]);
  check('le voci non valide non contano nel massimo di 3: scartate 3 (due non valide e la quarta valida), arrivano le tre valide', r.added.length === 3 && r.refused === 4 && JSON.stringify(r.added.map(m => m.from)) === JSON.stringify(['FRA', 'GBR', 'URSS']), r);
  const altri = ID.filter(c => c !== PL);
  await restart(PL);
  r = await ricevi(altri.slice(0, 25).map(c => MSG(c, 'accordo', 3, 'x')));
  check('25 voci tutte valide: ne arrivano 3, le altre 22 sono scartate (si leggono al massimo 20; le oltre 20 si contano soltanto)', r.added.length === 3 && r.refused === 22, [r.added.length, r.refused]);
  await restart(PL);
  const nonLista = [];
  for (const v of [undefined, null, {}, 'FRA', 5, true]) nonLista.push(await ev(v => { const x = window.__t.receiveMessages(v); return [x.added.length, x.refused, window.__t.getState().msgSeq]; }, v === undefined ? undefined : v));
  check('se «messaggi» non è una lista (manca, null, un oggetto, un testo, un numero, vero): nessun messaggio, nulla da scartare, nessun numero consumato', nonLista.every(x => x[0] === 0 && x[1] === 0 && x[2] === 0), nonLista);
  await restart(PL);
  await ricevi([MSG('ZZZ', 'accordo', 3, 'a'), MSG('FRA', 'accordo', 3, 'b')]);
  r = await ricevi([MSG('GBR', 'accordo', 3, 'c')]);
  check('i numeri (m1, m2, …) si consumano solo per i messaggi accettati: uno scartato non ne prende uno', r.added[0].id === 'm2', r);

  // =============================================================== 3. quanto pesa una risposta
  console.log('— l\'effetto di una risposta: tipo × risposta × peso, controllato con la tavola scritta qui');
  await restart(PL);
  const casi = []; let k = 0;
  for (const tipo of TIPI) for (const scelta of SCELTE) for (let peso = 1; peso <= 5; peso++) casi.push({ tipo, scelta, peso, da: altri[k++] });
  const colloqui = [];
  for (const tipo of TIPI) for (let peso = 1; peso <= 5; peso++) colloqui.push({ tipo, scelta: 'trattativa', peso, da: altri[k++] });
  const tutti = casi.concat(colloqui);
  const mat = await ev(tutti => {
    const T = window.__t;
    const lista = tutti.map((c, i) => ({ id: 'm' + (i + 1), from: c.da, type: c.tipo, weight: c.peso, text: 't', decision: c.scelta === 'accetta' ? 'accept' : c.scelta === 'rifiuta' ? 'refuse' : '', talk: c.scelta === 'trattativa' }));
    const res = T.resolveMessages(lista);
    return { dopo: lista.map(m => T.relGet('ITA', m.from)), events: res.events, lines: res.lines, nomi: lista.map(m => T.countries[m.from].name) };
  }, tutti);
  const attesi = tutti.map(c => limita(base(PL, c.da) + (c.scelta === 'trattativa' ? 0 : effetto(c.tipo, c.scelta, c.peso))));
  const sbagliati = tutti.map((c, i) => [c, mat.dopo[i], attesi[i]]).filter(([, a, b]) => a !== b);
  check('tutte le 80 combinazioni (4 tipi × 3 risposte × 5 pesi, più 20 colloqui) danno il valore atteso: valore di partenza + (tipo e risposta) × peso, fra −100 e +100', sbagliati.length === 0, sbagliati.slice(0, 4));
  check('i colloqui (20 su 20) non cambiano nulla da soli', tutti.every((c, i) => c.scelta !== 'trattativa' || mat.dopo[i] === base(PL, c.da)));
  const conEffetto = tutti.filter(c => c.scelta !== 'trattativa' && effetto(c.tipo, c.scelta, c.peso) !== 0);
  check('gli eventi per le righe delle relazioni sono 55: uno per ogni risposta che cambia qualcosa (non l\'ultimatum accettato, non i colloqui), con Stato e motivo', mat.events.length === 55 && conEffetto.length === 55
    && mat.events.every((e, i) => e.a === PL && e.b === conEffetto[i].da && e.why === `${minuscolo(conEffetto[i].tipo)} (peso ${conEffetto[i].peso}): ${PAROLA[conEffetto[i].scelta]}`), mat.events.slice(0, 2));
  check('le righe per la cronaca sono 80, una per messaggio: «Messaggio di … (tipo, peso N): risposta»', mat.lines.length === 80
    && tutti.every((c, i) => mat.lines[i] === `Messaggio di ${mat.nomi[i]} (${minuscolo(c.tipo)}, peso ${c.peso}): ${PAROLA[c.scelta]}`), mat.lines.slice(0, 2));
  const fermi = await ev(() => {
    const T = window.__t, S = T.getState(), m = (id, d, t) => ({ id, from: 'FRA', type: 'accordo', weight: 2, text: 't', decision: d, talk: t });
    return { stato: [m('a', '', false), m('b', '', true), m('c', 'accept', false), m('d', 'refuse', true)].map(x => [T.messageStatus(x), T.messageChoice(x)]),
      zero: [T.messageEffect(m('e', '', true), 'talk'), T.messageEffect(m('f', '', false), 'label'), T.messageEffect(m('g', '', false), '__proto__'), T.messageEffect(m('h', 'accept', true), 'accept')], senza: T.resolveMessages([{ id: 'x', from: 'ZZZ', type: 'accordo', weight: 3, text: 't', decision: 'accept', talk: false }]) };
  });
  check('lo stato di un messaggio: senza risposta = nuovo (si conta come ignorato), colloquio = in trattativa, accettato, rifiutato; la risposta data a mano vale più del colloquio', JSON.stringify(fermi.stato) === JSON.stringify([['nuovo', 'ignore'], ['trattativa', 'talk'], ['accettato', 'accept'], ['rifiutato', 'refuse']]), fermi.stato);
  check('«talk» e parole che non sono una risposta (label, __proto__) non danno un effetto (0); l\'accettazione di un accordo di peso 2 vale +8', fermi.zero[0] === 0 && fermi.zero[1] === 0 && fermi.zero[2] === 0 && fermi.zero[3] === 8, fermi.zero);
  check('un messaggio di uno Stato che non c\'è non fa nulla e non dà errori', fermi.senza.events.length === 0 && fermi.senza.lines.length === 0);
  const tetto = await ev(() => {
    const T = window.__t; T.relSet('ITA', 'FRA', 95); T.relSet('ITA', 'URSS', -90);
    T.resolveMessages([{ id: 'a', from: 'FRA', type: 'accordo', weight: 5, text: 't', decision: 'accept', talk: false }, { id: 'b', from: 'URSS', type: 'ultimatum', weight: 5, text: 't', decision: 'refuse', talk: false }]);
    return [T.relGet('ITA', 'FRA'), T.relGet('ITA', 'URSS')];
  });
  check('le relazioni non escono dalla scala: +95 con un accordo accettato di peso 5 (+20) resta +100, −90 con un ultimatum rifiutato di peso 5 (−25) resta −100', tetto[0] === 100 && tetto[1] === -100, tetto);

  // =============================================================== 4. dall'arrivo alla risposta: l'intero percorso nella pagina
  console.log('— i messaggi arrivano, il giocatore risponde, il tempo avanza');
  await restart(PL);
  p = await pannello();
  check('a inizio partita il pannello c\'è ed è vuoto: titolo «Messaggi in arrivo», spiegazione, nessun elenco, nessun avviso accanto ad «Avanza»', !p.hidden && p.title === 'Messaggi in arrivo' && /^Nessun messaggio in arrivo\./.test(p.empty) && !p.emptyHidden && p.listHidden && p.items.length === 0 && p.warnHidden && p.warn === '', p);
  const p1 = await ev(() => window.__prompts.length);
  await conMessaggi();
  check('arrivano 3 messaggi: nella posta ci sono m1, m2, m3 con mittente, tipo, peso e testo, tutti senza risposta', JSON.stringify(await inbox()) === JSON.stringify(INBOX3), await inbox());
  p = await pannello();
  check('il pannello è una sezione col titolo di terzo livello «Messaggi in arrivo (3)», collegata con aria-labelledby; l\'elenco è una vera lista (ul) con un elemento (li) per messaggio',
    !p.hidden && p.tag === 'SECTION' && p.labelled === 'msgTitle' && p.titleTag === 'H3' && p.title === 'Messaggi in arrivo (3)' && p.listTag === 'UL' && p.listLabelled === 'msgTitle' && !p.listHidden && p.emptyHidden
    && p.items.length === 3 && p.items.every(i => i.tag === 'LI'), p);
  check('ogni messaggio mostra mittente, tipo, peso a parole e in pallini (nascosti ai lettori di schermo), testo fra virgolette e stato',
    p.items.every((it, i) => it.id === INBOX3[i].id && it.from === NOME[M3[i].da] && it.type === NOME_TIPO[M3[i].tipo] && it.weight === `Peso ${M3[i].peso} su 5 · ${PAROLE_PESO[M3[i].peso - 1]}`
      && it.dots === '●'.repeat(M3[i].peso) + '○'.repeat(5 - M3[i].peso) && it.dotsHidden === 'true' && it.text === '«' + M3[i].testo + '»' && it.status === STATUS.nuovo), p.items);
  check('…e quanto pesa la risposta: la relazione di ora e i tre effetti (Francia +35 Amichevoli: +16, −8, −4; Unione Sovietica −60 Ostili: 0, −25, −25; Regno Unito +35: +4, −2, −2)',
    p.items.every((it, i) => it.stakes === stakes(M3[i].da, M3[i].tipo, M3[i].peso)) && p.items[0].stakes.includes('ora +35 (Amichevoli). Se accetti +16, se rifiuti −8, se non rispondi −4')
    && p.items[1].stakes.includes('ora −60 (Ostili). Se accetti 0, se rifiuti −25, se non rispondi −25'), p.items.map(i => i.stakes));
  check('ogni messaggio ha tre pulsanti veri (button, type=button): Accetta e Rifiuta (a commutazione, aria-pressed=false) e Rispondi; il nome dice a quale messaggio si riferisce',
    p.items.every((it, i) => JSON.stringify(it.buttons.map(b => [b.act, b.text, b.label, b.pressed, b.disabled, b.type, b.tag])) === JSON.stringify([
      ['accept', 'Accetta', etichetta('accept', M3[i].da, M3[i].tipo, M3[i].peso), 'false', false, 'button', 'BUTTON'], ['refuse', 'Rifiuta', etichetta('refuse', M3[i].da, M3[i].tipo, M3[i].peso), 'false', false, 'button', 'BUTTON'],
      ['reply', 'Rispondi', etichetta('reply', M3[i].da, M3[i].tipo, M3[i].peso), null, false, 'button', 'BUTTON']])), p.items[0].buttons);
  check('…i nomi dei nove pulsanti sono tutti diversi e cominciano con il testo che si vede (etichetta nel nome)', new Set(p.items.flatMap(i => i.buttons.map(b => b.label))).size === 9 && p.items.every(i => i.buttons.every(b => b.label.startsWith(b.text))));
  check('accanto ad «Avanza» c\'è l\'avviso «Hai 3 messaggi senza risposta…», collegato al pulsante (aria-describedby)', !p.warnHidden && p.warn === 'Hai 3 messaggi senza risposta: se premi «Avanza» contano come ignorati.'
    && (await ev(() => document.getElementById('advanceBtn').getAttribute('aria-describedby'))) === 'advanceNote msgWarn', p.warn);
  check('la cronaca ha una voce «Messaggi» con una riga per messaggio nuovo; i valori delle relazioni non si sono mossi', (await kinds()) === 't,m' && JSON.stringify((await logLines('m'))[0]) === JSON.stringify([
    'Nuovo messaggio da Francia (proposta di accordo, peso 4): «Proponiamo un patto di amicizia.»', 'Nuovo messaggio da Unione Sovietica (ultimatum, peso 5): «Ritirate le truppe.»', 'Nuovo messaggio da Regno Unito (richiesta di colloquio, peso 2): «Vorremmo incontrarvi.»'])
    && (await relOf(PL, 'FRA')) === 35 && (await relOf(PL, 'URSS')) === -60 && (await relOf(PL, 'GBR')) === 35, await logLines('m'));
  check('…la voce si vede nella cronaca (con il simbolo e il titolo «Messaggi»), e chi usa un lettore di schermo sente «3 nuovi messaggi da altre nazioni.»', (await ev(() => { const e = document.querySelector('#log .entry-msg'); return !!e && e.textContent.includes('Messaggi') && e.textContent.includes('Nuovo messaggio da Francia'); }))
    && (await annuncio()) === '3 nuovi messaggi da altre nazioni.', await annuncio());
  check('la richiesta del primo turno non parlava di risposte ai messaggi (ancora non ce n\'erano)', !/Messaggi che il giocatore aveva ricevuto/.test(String(await ev(n => window.__prompts[n], p1))), p1);

  console.log('— il giocatore sceglie: la risposta si scrive, ma conta solo all\'«Avanza»');
  await clicca('m1', 'accept');
  p = await pannello();
  check('«Accetta» sul messaggio della Francia: il pulsante risulta premuto (aria-pressed=true), Rifiuta no; lo stato dice «Accettato…»; il cursore resta su quel pulsante',
    p.items[0].buttons[0].pressed === 'true' && p.items[0].buttons[1].pressed === 'false' && p.items[0].status === STATUS.accettato && (await attivo()) === 'm1:accept', [p.items[0], await attivo()]);
  check('…la risposta è scritta nella posta ma le relazioni non si muovono ancora (Francia resta +35); l\'avviso scende a 2 messaggi; chi ascolta sente cosa è successo',
    (await inbox())[0].decision === 'accept' && (await relOf(PL, 'FRA')) === 35 && p.warn === 'Hai 2 messaggi senza risposta: se premi «Avanza» contano come ignorati.' && (await annuncio()) === 'Messaggio di Francia: accettato. Avrà effetto quando fai avanzare il tempo.', await annuncio());
  await clicca('m1', 'accept');
  p = await pannello();
  check('lo stesso pulsante ancora una volta toglie la risposta: non più premuto, di nuovo «senza risposta», avviso a 3, annuncio «risposta annullata»',
    p.items[0].buttons[0].pressed === 'false' && p.items[0].status === STATUS.nuovo && (await inbox())[0].decision === '' && p.warn.startsWith('Hai 3 messaggi') && (await annuncio()) === 'Messaggio di Francia: risposta annullata.', [p.items[0].status, await annuncio()]);
  await clicca('m1', 'refuse');
  p = await pannello();
  check('«Rifiuta» dopo nessuna risposta: premuto solo Rifiuta (stato «Rifiutato…»)', p.items[0].buttons[1].pressed === 'true' && p.items[0].buttons[0].pressed === 'false' && p.items[0].status === STATUS.rifiutato && (await inbox())[0].decision === 'refuse');
  await clicca('m1', 'accept');
  p = await pannello();
  check('«Accetta» dopo «Rifiuta» cambia la risposta (le due non stanno insieme): premuto solo Accetta', p.items[0].buttons[0].pressed === 'true' && p.items[0].buttons[1].pressed === 'false' && (await inbox())[0].decision === 'accept' && (await attivo()) === 'm1:accept');
  await clicca('m2', 'refuse');
  check('Unione Sovietica: «Rifiuta» (ultimatum); il Regno Unito resta senza risposta; l\'avviso dice «Hai 1 messaggio senza risposta… conta come ignorato»', (await pannello()).warn === 'Hai 1 messaggio senza risposta: se premi «Avanza» conta come ignorato.'
    && JSON.stringify((await inbox()).map(m => m.decision)) === JSON.stringify(['accept', 'refuse', '']));
  await page.focus('button[data-id="m3"][data-act="accept"]');
  await page.keyboard.press('Space');
  check('con la tastiera: Spazio su «Accetta» del Regno Unito lo preme, e il cursore non si perde', (await inbox())[2].decision === 'accept' && (await attivo()) === 'm3:accept');
  await page.keyboard.press('Enter');
  check('…Invio lo toglie di nuovo, il cursore è ancora lì; Tab porta a «Rifiuta» e poi a «Rispondi»', (await inbox())[2].decision === '' && (await attivo()) === 'm3:accept'
    && (await (async () => { await page.keyboard.press('Tab'); const a = await attivo(); await page.keyboard.press('Tab'); return a + ',' + (await attivo()); })()) === 'm3:refuse,m3:reply');
  const salv = await ev(() => JSON.parse(JSON.stringify(window.__t.buildSavePayload())));
  check('il salvataggio ha già la posta con le risposte, il numero dell\'ultimo messaggio e lo stesso formato di prima (schemaVersion 3)', salv.schemaVersion === 3 && salv.game.msgSeq === 3
    && JSON.stringify(salv.game.inbox) === JSON.stringify(INBOX3.map((m, i) => Object.assign({}, m, { decision: ['accept', 'refuse', ''][i] }))) && !('talks' in salv.game), salv.game.inbox);

  console.log('— «Avanza»: le risposte contano, i messaggi si chiudono, ne arrivano di nuovi');
  const nBefore = await nPrompts();
  await turn({ messaggi: [MSG('GBR', 'richiesta', 3, 'Chiediamo aiuto.')] });
  const dopo = { FRA: await relOf(PL, 'FRA'), URSS: await relOf(PL, 'URSS'), GBR: await relOf(PL, 'GBR') };
  check('le relazioni: Francia accordo accettato (peso 4) +35 → +51; Unione Sovietica ultimatum rifiutato (peso 5) −60 → −85; Regno Unito colloquio ignorato (peso 2) +35 → +33 (valori scritti a mano)',
    dopo.FRA === 51 && dopo.URSS === -85 && dopo.GBR === 33, dopo);
  check('…e coincidono con il secondo calcolo: valore di partenza + tipo × risposta × peso', dopo.FRA === base(PL, 'FRA') + effetto('accordo', 'accetta', 4) && dopo.URSS === base(PL, 'URSS') + effetto('ultimatum', 'rifiuta', 5) && dopo.GBR === base(PL, 'GBR') + effetto('colloquio', 'ignora', 2));
  const rl = await logLines('r');
  const rigaRel = (nome, da, a, why) => `Italia – ${nome}: ${segno(da)} → ${segno(a)} (${banda(a)}) — ${why}`;
  check('la voce «Relazioni» ha una riga per Stato, dal cambio più grande al più piccolo, con valore prima e dopo, fascia e motivo (il peso nel motivo)',
    JSON.stringify(rl[0]) === JSON.stringify([rigaRel('Unione Sovietica', -60, -85, 'ultimatum (peso 5): rifiutato'), rigaRel('Francia', 35, 51, 'proposta di accordo (peso 4): accettato'), rigaRel('Regno Unito', 35, 33, 'richiesta di colloquio (peso 2): ignorato (senza risposta)')]), rl[0]);
  const ml = await logLines('m');
  check('la voce «Messaggi» dice che cosa è successo a ciascuno (accettato, rifiutato, ignorato) e poi i messaggi nuovi', JSON.stringify(ml[1]) === JSON.stringify([
    'Messaggio di Francia (proposta di accordo, peso 4): accettato', 'Messaggio di Unione Sovietica (ultimatum, peso 5): rifiutato', 'Messaggio di Regno Unito (richiesta di colloquio, peso 2): ignorato (senza risposta)',
    'Nuovo messaggio da Regno Unito (richiesta, peso 3): «Chiediamo aiuto.»']) && (await kinds()) === 't,m,t,r,m', ml[1]);
  check('la posta ora ha solo il messaggio nuovo (m4, numerazione che continua), senza risposta; i tre di prima sono chiusi', JSON.stringify(await inbox()) === JSON.stringify([{ id: 'm4', from: 'GBR', type: 'richiesta', weight: 3, text: 'Chiediamo aiuto.', decision: '', talk: false }]));
  p = await pannello();
  check('il pannello mostra il nuovo messaggio con il suo peso e i suoi effetti (+9, −9, −6: richiesta di peso 3 con Regno Unito a +33)', p.title === 'Messaggi in arrivo (1)' && p.items.length === 1 && p.items[0].from === 'Regno Unito' && p.items[0].weight === 'Peso 3 su 5 · Rilevante'
    && p.items[0].stakes === 'Relazioni con Regno Unito ora +33 (Amichevoli). Se accetti +9, se rifiuti −9, se non rispondi −6; con un colloquio nessun effetto automatico.' && p.warn === 'Hai 1 messaggio senza risposta: se premi «Avanza» conta come ignorato.', p.items[0]);
  check('chi ascolta sente «Nuovo messaggio da un\'altra nazione.»', (await annuncio()) === 'Nuovo messaggio da un\'altra nazione.', await annuncio());
  const pr2 = String(await ev(n => window.__prompts[n], nBefore));
  const intest = 'Messaggi che il giocatore aveva ricevuto e come ha risposto (il gioco applica da solo l\'effetto sulle relazioni: non ripeterlo in "relazioni"; racconta invece le conseguenze di ciò che ha accettato, rifiutato o lasciato cadere, anche con statistiche e territori se valgono):';
  check('al motore si dice come ha risposto il giocatore: intestazione e una riga per messaggio (Francia ACCETTATO, Unione Sovietica RIFIUTATO, Regno Unito IGNORATO (SENZA RISPOSTA)), con il codice, il tipo, il peso e il testo',
    pr2.includes(intest + '\n- Francia (FRA), proposta di accordo, peso 4/5: ACCETTATO. Testo: «Proponiamo un patto di amicizia.»\n- Unione Sovietica (URSS), ultimatum, peso 5/5: RIFIUTATO. Testo: «Ritirate le truppe.»\n- Regno Unito (GBR), richiesta di colloquio, peso 2/5: IGNORATO (SENZA RISPOSTA). Testo: «Vorremmo incontrarvi.»\n'), pr2.slice(pr2.indexOf('Messaggi che') - 5, pr2.indexOf('Messaggi che') + 700));
  check('le risposte ai messaggi stanno subito dopo gli ordini, non in cima alla richiesta: dopo «Il tempo avanza», prima delle mosse delle altre nazioni e dell\'ultima frase',
    pr2.indexOf('Il tempo avanza di') < pr2.indexOf('Messaggi che il giocatore aveva ricevuto') && pr2.indexOf('Messaggi che il giocatore aveva ricevuto') < pr2.indexOf('Nello stesso periodo anche le altre nazioni') && pr2.indexOf('Nello stesso periodo anche le altre nazioni') < pr2.indexOf('Genera le conseguenze'),
    [pr2.indexOf('Il tempo avanza di'), pr2.indexOf('Messaggi che il giocatore aveva ricevuto'), pr2.indexOf('Nello stesso periodo anche le altre nazioni'), pr2.indexOf('Genera le conseguenze')]);
  const ultimaFrase = pr2.slice(pr2.indexOf('Genera le conseguenze'));
  check('l\'ultima frase nomina le risposte ai messaggi e chiede di tenerne conto nella narrativa e nel riepilogo del mondo (senza colloqui non parla di colloqui)',
    ultimaFrase.includes('di tutto ciò che avviene in questo periodo (gli ordini del giocatore, le sue risposte ai messaggi e le mosse delle altre nazioni) e aggiorna le statistiche in modo coerente. Nella narrativa e nel riepilogo del mondo tieni conto di come il giocatore ha risposto ai messaggi (chi ha avuto un sì, un no o nessuna risposta reagisce di conseguenza). Rispondi SOLO con un oggetto JSON')
    && !/colloqui/.test(ultimaFrase.slice(0, ultimaFrase.indexOf('Rispondi SOLO'))), ultimaFrase.slice(0, 600));
  await turn({ messaggi: [] });
  const pr3 = await lastPrompt();
  // nella parte sulle risposte (non nel quaderno delle nazioni, che dalla versione 36 ricorda anche i messaggi chiusi: v. t21_memoria.js)
  const bloccoRisposte = pr3.slice(pr3.indexOf('Messaggi che il giocatore aveva ricevuto'), pr3.indexOf('Nello stesso periodo anche le altre nazioni'));
  check('al turno dopo si parla solo del messaggio rimasto aperto (Regno Unito, richiesta, IGNORATO): quelli già chiusi non tornano', bloccoRisposte.includes('- Regno Unito (GBR), richiesta, peso 3/5: IGNORATO (SENZA RISPOSTA). Testo: «Chiediamo aiuto.»') && !/Proponiamo un patto|Ritirate le truppe/.test(bloccoRisposte) && bloccoRisposte.length > 200, bloccoRisposte.slice(0, 500));
  p = await pannello();
  check('dopo un turno senza messaggi nuovi la posta è vuota: pannello con la spiegazione, nessuna lista, nessun avviso; «messaggi: []» non dà errori', (await inbox()).length === 0 && p.title === 'Messaggi in arrivo' && !p.emptyHidden && p.listHidden && p.warnHidden && p.items.length === 0);
  const pr4 = (await (async () => { await turn(); return lastPrompt(); })());
  check('…e il turno seguente non ha più la parte sulle risposte', !/Messaggi che il giocatore aveva ricevuto/.test(pr4));

  console.log('— messaggi non validi fra quelli del motore: si scartano, e la cronaca dice quanti');
  await restart(PL);
  await turn({ messaggi: [MSG('ZZZ', 'accordo', 3, 'Stato che non c\'è'), MSG('FRA', 'accordo', 3, 'Questo è valido.'), MSG('FRA', 'richiesta', 3, 'Secondo della Francia.'), null, MSG('GBR', 'dichiarazione', 3, 'tipo sconosciuto')] });
  check('con quattro messaggi non validi su cinque (Stato che non c\'è, secondo della Francia, voce vuota, tipo sconosciuto) arriva solo quello valido, e la cronaca scrive la riga del nuovo messaggio e poi l\'avviso «Messaggi scartati: 4»',
    JSON.stringify((await logLines('m'))[0]) === JSON.stringify(['Nuovo messaggio da Francia (proposta di accordo, peso 3): «Questo è valido.»', AVVISO_SCARTI(4)]) && JSON.stringify((await inbox()).map(m => [m.id, m.from, m.text])) === JSON.stringify([['m1', 'FRA', 'Questo è valido.']])
    && (await annuncio()) === 'Nuovo messaggio da un\'altra nazione.', await logLines('m'));
  await turn({ messaggi: [MSG('ZZZ', 'accordo', 3, 'Ancora uno che non c\'è')] });
  p = await pannello();
  check('se i messaggi del turno sono tutti non validi la cronaca dice che cosa è successo al messaggio di prima (ignorato) e l\'avviso «Messaggi scartati: 1»; la posta è vuota e nessun nuovo messaggio è annunciato',
    JSON.stringify((await logLines('m'))[1]) === JSON.stringify(['Messaggio di Francia (proposta di accordo, peso 3): ignorato (senza risposta)', AVVISO_SCARTI(1)]) && (await inbox()).length === 0 && p.items.length === 0 && p.warnHidden
    && !/nuov[oi] messagg/.test(await annuncio()), [await logLines('m'), await annuncio()]);

  // =============================================================== 5. i colloqui
  console.log('— «Rispondi» apre un colloquio con chi ha scritto, e il colloquio conta per il turno');
  await conMessaggi();
  await clicca('m3', 'reply');
  check('«Rispondi» sul messaggio del Regno Unito apre la scheda Diplomazia, con la conversazione già avviata con quello Stato e il suo messaggio come prima battuta', (await selezionata()).diplo === 'true' && (await selezionata()).azioni === 'false'
    && (await ev(() => document.getElementById('diploTargetLabel').textContent)) === 'Regno Unito' && JSON.stringify(await bolle()) === JSON.stringify(['Vorremmo incontrarvi.'])
    && (await ev(() => !document.getElementById('diploChat').classList.contains('hidden') && document.getElementById('diploSetup').classList.contains('hidden'))), [await bolle(), await selezionata()]);
  check('…il cursore va alla casella del messaggio, e chi ascolta sente che il colloquio è aperto', (await attivo()) === 'diploInput' && (await annuncio()) === 'Colloquio con Regno Unito aperto: scrivi la tua risposta.', [await attivo(), await annuncio()]);
  const dip = await ev(() => { const d = window.__t.getState().diplo; return JSON.parse(JSON.stringify(d)); });
  check('nello stato il colloquio sa a quale messaggio risponde (m3) e ha la presentazione: «Poco fa hai scritto tu al giocatore questo messaggio (richiesta di colloquio, peso 2 su 5): «…». Ora il giocatore ti risponde.»',
    dip.msgId === 'm3' && dip.target === 'Regno Unito' && dip.history.length === 0 && dip.intro === 'Poco fa hai scritto tu al giocatore questo messaggio (richiesta di colloquio, peso 2 su 5): «Vorremmo incontrarvi.». Ora il giocatore ti risponde.', dip);
  await queueText('Ci vediamo a Ginevra in primavera.');
  await scrivi('Accogliamo volentieri la vostra richiesta di incontro.');
  const primo = await ev(() => { const h = window.__prompts[window.__prompts.length - 1]; return Array.isArray(h) ? h.map(x => [x.role, String(x.content)]) : null; });
  check('al primo messaggio la AI riceve il contesto (con la presentazione del messaggio e il suo peso) e la frase del giocatore; la sua replica si aggiunge alla stessa conversazione', primo && primo.length === 2 && primo[0][0] === 'user' && primo[1][0] === 'assistant' && primo[1][1] === 'Ci vediamo a Ginevra in primavera.' && primo[0][1].includes('Sei Regno Unito, una figura di potere straniera')
    && primo[0][1].includes('Poco fa hai scritto tu al giocatore questo messaggio (richiesta di colloquio, peso 2 su 5): «Vorremmo incontrarvi.». Ora il giocatore ti risponde. Rispondi sempre in character')
    && primo[0][1].endsWith('Accogliamo volentieri la vostra richiesta di incontro.'), primo && primo[0][1].slice(0, 600));
  check('la conversazione ha ora tre battute: il messaggio, la risposta del giocatore, la replica', JSON.stringify(await bolle()) === JSON.stringify(['Vorremmo incontrarvi.', 'Accogliamo volentieri la vostra richiesta di incontro.', 'Ci vediamo a Ginevra in primavera.']), await bolle());
  check('il colloquio è annotato per il motore (a chi, che cosa hai detto, che cosa ha risposto) e il messaggio è «in trattativa»', JSON.stringify(await talks()) === JSON.stringify([{ to: 'Regno Unito', you: 'Accogliamo volentieri la vostra richiesta di incontro.', they: 'Ci vediamo a Ginevra in primavera.' }])
    && (await inbox())[2].talk === true && (await inbox())[2].decision === '', [await talks(), (await inbox())[2]]);
  await tabAzioni();
  p = await pannello();
  check('nel pannello il messaggio mostra «In trattativa…», e non conta fra quelli senza risposta (restano 2)', p.items[2].status === STATUS.trattativa && p.warn === 'Hai 2 messaggi senza risposta: se premi «Avanza» contano come ignorati.', [p.items[2].status, p.warn]);
  await clicca('m1', 'accept'); await clicca('m2', 'refuse');
  const nP = await nPrompts();
  await turn({ messaggi: [] });
  const pc = String(await ev(n => window.__prompts[n], nP));
  check('al motore arrivano il colloquio (a chi, che cosa si è detto, la risposta, l\'avvertenza che sono parole e non fatti) e la riga del messaggio «IN TRATTATIVA (COLLOQUIO)»',
    pc.includes('Colloqui avuti dal giocatore in questo periodo (scheda Diplomazia; sono parole, non fatti compiuti):\n- con Regno Unito: il giocatore dice «Accogliamo volentieri la vostra richiesta di incontro.»; risposta: «Ci vediamo a Ginevra in primavera.»\nTienine conto nelle conseguenze: promesse, minacce, intese o offese possono cambiare i rapporti (campo "relazioni") e gli eventi, ma un\'intesa vale solo se la narrazione la realizza.')
    && pc.includes('- Regno Unito (GBR), richiesta di colloquio, peso 2/5: IN TRATTATIVA (COLLOQUIO). Testo: «Vorremmo incontrarvi.»'), pc.slice(pc.indexOf('Colloqui avuti') - 5, pc.indexOf('Colloqui avuti') + 600));
  check('il colloquio sta nella richiesta fra gli ordini e le mosse delle altre nazioni (non prima del tempo che avanza)', pc.indexOf('Il tempo avanza di') < pc.indexOf('Colloqui avuti') && pc.indexOf('Colloqui avuti') < pc.indexOf('Genera le conseguenze'), [pc.indexOf('Il tempo avanza di'), pc.indexOf('Colloqui avuti'), pc.indexOf('Genera le conseguenze')]);
  check('con le risposte e i colloqui insieme: prima le risposte ai messaggi, poi i colloqui, poi le mosse delle altre nazioni; l\'ultima frase nomina anche i colloqui',
    pc.indexOf('Il tempo avanza di') < pc.indexOf('Messaggi che il giocatore aveva ricevuto') && pc.indexOf('Messaggi che il giocatore aveva ricevuto') < pc.indexOf('Colloqui avuti') && pc.indexOf('Colloqui avuti') < pc.indexOf('Nello stesso periodo anche le altre nazioni')
    && pc.includes('(gli ordini del giocatore, le sue risposte ai messaggi, i suoi colloqui e le mosse delle altre nazioni) e aggiorna le statistiche in modo coerente. Nella narrativa e nel riepilogo del mondo tieni conto di come il giocatore ha risposto ai messaggi (chi ha avuto un sì, un no o nessuna risposta reagisce di conseguenza) e di ciò che si è detto nei colloqui e di ciò che le nazioni ricordano (quaderno). Rispondi SOLO'), pc.slice(pc.indexOf('Genera le conseguenze'), pc.indexOf('Genera le conseguenze') + 700));
  check('un messaggio in trattativa non cambia le relazioni da solo (Regno Unito resta +35), gli altri sì (Francia +51, Unione Sovietica −85); la cronaca dice «in trattativa (colloquio)»',
    (await relOf(PL, 'GBR')) === 35 && (await relOf(PL, 'FRA')) === 51 && (await relOf(PL, 'URSS')) === -85 && (await logLines('m'))[1].includes('Messaggio di Regno Unito (richiesta di colloquio, peso 2): in trattativa (colloquio)')
    && !(await logLines('r'))[0].some(x => /Regno Unito/.test(x)), await logLines('m'));
  check('dopo il turno i colloqui letti dal motore sono cancellati: non tornano né nel turno dopo né nel salvataggio', (await talks()).length === 0 && !('talks' in (await ev(() => JSON.parse(JSON.stringify(window.__t.buildSavePayload())).game))));
  check('la conversazione aperta resta (le battute si possono ancora leggere) ma non è più legata a un messaggio chiuso: al salvataggio e al caricamento il legame cade', (await ev(() => window.__t.getState().diplo.msgId)) === 'm3' && (await bolle()).length === 3);

  console.log('— un turno che fallisce non perde risposte né colloqui');
  await conMessaggi();
  await clicca('m3', 'reply');
  await queueText('Volentieri.'); await scrivi('Ci incontriamo.');
  await tabAzioni();
  await clicca('m1', 'accept');
  await ev(() => { window.__queue.push(new Error('guasto di prova')); });
  await advance();
  check('con l\'errore: le relazioni non cambiano, i colloqui e le risposte restano, il messaggio è ancora lì, la cronaca dice l\'errore e non ha né «Relazioni» né nuove voci «Messaggi»',
    (await relOf(PL, 'FRA')) === 35 && (await talks()).length === 1 && JSON.stringify((await inbox()).map(m => [m.decision, m.talk])) === JSON.stringify([['accept', false], ['', false], ['', true]])
    && (await kinds()) === 't,m' && (await ev(() => document.getElementById('log').textContent)).includes('Errore nella generazione: guasto di prova.'), [await kinds(), await talks()]);
  p = await pannello();
  check('…e i pulsanti dei messaggi sono di nuovo attivi, con Accetta ancora premuto per la Francia', p.items.every(i => i.buttons.every(b => !b.disabled)) && p.items[0].buttons[0].pressed === 'true');
  await turn({ messaggi: [] });
  check('rifatto il turno, tutto conta: Francia +51 e il colloquio arriva al motore', (await relOf(PL, 'FRA')) === 51 && (await lastPrompt()).includes('- con Regno Unito: il giocatore dice «Ci incontriamo.»; risposta: «Volentieri.»') && (await talks()).length === 0);

  console.log('— «Avanza» aspetta un colloquio in corso; durante il turno i messaggi e il colloquio sono fermi');
  await conMessaggi();
  await clicca('m3', 'reply');
  await ev(() => { window.__d = window.__deferred(); window.__textQueue.push(window.__d.p); });
  await page.fill('#diploInput', 'Siamo pronti a parlarne.');
  await page.click('#diploSendBtn');
  p = await pannello();
  check('mentre la risposta del colloquio è in arrivo il pulsante «Rispondi» di tutti i messaggi è spento (Accetta e Rifiuta no)', (await ev(() => window.__t.getDiploBusy())) === true && p.items.every(i => i.buttons[2].disabled && !i.buttons[0].disabled && !i.buttons[1].disabled), p.items.map(i => i.buttons.map(b => b.disabled)));
  check('…e anche da programma «Rispondi» non fa nulla mentre la risposta è in arrivo: la conversazione aperta resta quella del messaggio m3', (await ev(() => [window.__t.replyToMessage('m1'), window.__t.getState().diplo.msgId])).join() === 'false,m3');
  await tabAzioni();
  const n0 = await nPrompts();
  await page.click('#advanceBtn');
  check('«Avanza» in quel momento non parte: nessuna richiesta nuova, il tempo non passa e un messaggio spiega di aspettare', (await nPrompts()) === n0 && (await ev(() => window.__t.getState().turn)) === 1
    && (await ev(() => document.getElementById('actionMsg').textContent)) === 'Aspetta la risposta nel colloquio diplomatico, poi premi «Avanza»: il colloquio conta per questo periodo.', await ev(() => document.getElementById('actionMsg').textContent));
  await ev(() => window.__d.res({ text: 'Allora ci vediamo presto.' }));
  await page.waitForFunction(() => !window.__t.getDiploBusy());
  p = await pannello();
  check('arrivata la risposta il colloquio è annotato e «Rispondi» torna attivo', (await talks()).length === 1 && (await talks())[0].they === 'Allora ci vediamo presto.' && p.items.every(i => !i.buttons[2].disabled));
  await advance();
  check('ora «Avanza» parte, e il colloquio arriva al motore', (await ev(() => window.__t.getState().turn)) === 2 && (await lastPrompt()).includes('- con Regno Unito: il giocatore dice «Siamo pronti a parlarne.»; risposta: «Allora ci vediamo presto.»'));
  await conMessaggi();
  await ev(() => { window.__dt = window.__deferred(); window.__queue.push(window.__dt.p); });
  await page.click('#advanceBtn');
  p = await pannello();
  const fermo = await ev(() => { const T = window.__t; return { occupato: T.getBusy(), invio: document.getElementById('diploSendBtn').disabled, accetta: T.decideMessage('m1', 'accept'), rispondi: T.replyToMessage('m1'), dec: T.getState().inbox[0].decision }; });
  check('mentre il tempo avanza tutti i pulsanti dei messaggi sono spenti, l\'invio nel colloquio pure; accettare o rispondere da programma non fa nulla (la risposta non cambia)',
    fermo.occupato && fermo.invio && p.items.every(i => i.buttons.every(b => b.disabled)) && fermo.accetta === false && fermo.rispondi === false && fermo.dec === '', [fermo, p.items[0].buttons]);
  await ev(() => window.__dt.res({ evento_titolo: 'T', narrativa: 'N', riepilogo_mondo: 'R', nuovo_anno: 'febbraio 1961', stabilita: 55, economia: 55, esercito: 55, prestigio: 55, cambi_territoriali: [], messaggi: [{ da: 'TUR', tipo: 'accordo', peso: 1, testo: 'Ci interessa un accordo commerciale.' }] }));
  await spinnerOff();
  p = await pannello();
  check('finito il turno i pulsanti tornano attivi (sul messaggio nuovo) e l\'invio nel colloquio pure', p.items.length === 1 && p.items[0].from === 'Turchia' && p.items[0].buttons.every(b => !b.disabled) && (await ev(() => !document.getElementById('diploSendBtn').disabled)), p.items);

  console.log('— più colloqui, lo stesso messaggio, un colloquio scritto a mano');
  await conMessaggi();
  await clicca('m3', 'reply');
  await queueText('Prima risposta.'); await scrivi('Primo messaggio.');
  await tabAzioni();
  await clicca('m3', 'reply');
  check('«Rispondi» due volte sullo stesso messaggio riprende la conversazione già aperta (stesse battute, nessuna nuova apertura)', JSON.stringify(await bolle()) === JSON.stringify(['Vorremmo incontrarvi.', 'Primo messaggio.', 'Prima risposta.'])
    && (await ev(() => window.__t.getState().diplo.history.length)) === 2 && (await selezionata()).diplo === 'true', await bolle());
  await tabAzioni();
  await clicca('m1', 'reply');
  check('«Rispondi» su un altro messaggio (Francia) apre una nuova conversazione; il colloquio di prima resta annotato per il motore e il suo messaggio resta «in trattativa»',
    (await ev(() => document.getElementById('diploTargetLabel').textContent)) === 'Francia' && JSON.stringify(await bolle()) === JSON.stringify(['Proponiamo un patto di amicizia.']) && (await ev(() => window.__t.getState().diplo.msgId)) === 'm1'
    && (await talks()).length === 1 && (await talks())[0].to === 'Regno Unito' && (await inbox())[2].talk === true && (await inbox())[0].talk === false, [await bolle(), await talks()]);
  await queueText('Francia risponde.'); await scrivi('Parliamone.');
  check('un secondo colloquio si aggiunge al primo (due annotati, in ordine) e anche la Francia è «in trattativa»', JSON.stringify((await talks()).map(t => t.to)) === JSON.stringify(['Regno Unito', 'Francia']) && (await inbox())[0].talk === true);
  await ev(() => document.getElementById('diploResetBtn').click());
  check('«Cambia» chiude la conversazione e la scollega dal messaggio; le risposte e i colloqui già annotati restano', (await ev(() => { const d = window.__t.getState().diplo; return [d.target, d.msgId, d.intro, d.history.length, d.bubbles.length]; })).join('|') === '|||0|0' && (await talks()).length === 2 && (await inbox())[0].talk === true);
  await ev(() => { document.getElementById('diploTarget').value = 'il Presidente della Francia'; document.getElementById('diploStartBtn').click(); });
  await queueText('Qui il Presidente.'); await scrivi('Buongiorno, Presidente.');
  check('un colloquio avviato a mano (scrivendo con chi) conta lo stesso per il motore, ma non tocca i messaggi', JSON.stringify((await talks()).map(t => t.to)) === JSON.stringify(['Regno Unito', 'Francia', 'il Presidente della Francia'])
    && (await ev(() => window.__t.getState().diplo.msgId)) === '' && (await inbox()).filter(m => m.talk).length === 2);
  await tabAzioni();
  await clicca('m2', 'reply');
  await ev(() => document.getElementById('diploResetBtn').click());
  check('«Rispondi» e poi «Cambia» senza scrivere nulla: nessun colloquio annotato in più e il messaggio resta senza risposta', (await talks()).length === 3 && (await inbox())[1].talk === false);
  const lim = await ev(() => {
    const T = window.__t, S = T.getState(); S.talks.length = 0;
    for (let i = 1; i <= 14; i++) T.recordTalk('Francia', 'a' + i + ' ' + 'x'.repeat(300), 'b' + i + ' ' + 'y'.repeat(300));
    T.recordTalk('', 'senza destinatario', 'x'); T.recordTalk('Francia', '', ''); T.recordTalk('Francia', '<i>ciao</i>', '\u0001');
    const ctx = T.talksContext(true);
    return { n: S.talks.length, first: S.talks[0].you.slice(0, 3), last: S.talks[S.talks.length - 1], righe: ctx.split('\n').filter(l => l.startsWith('- con ')), free: T.talksContext(false) };
  });
  // 14 colloqui + quello con le parole da ripulire = 15 annotati: ne restano 12, cadono i 3 più vecchi (a1, a2, a3) e il primo rimasto è a4; senza destinatario o senza parole non si annota nulla;
  // i segni < e > diventano spazi: «<i>ciao</i>» si legge «i ciao /i»
  check('i colloqui annotati sono al massimo 12 (i più vecchi cadono: di 15 annotati restano gli ultimi 12), senza destinatario o senza parole non si annotano, e le parole si ripuliscono dai segni < e >', lim.n === 12 && lim.first === 'a4 ' && lim.last.you === 'i ciao /i' && lim.last.they === '', lim);
  check('al motore ne arrivano solo 5, i più recenti (a11, a12, a13, a14 e l\'ultimo)', lim.righe.length === 5 && lim.righe[0].includes('«a11 ') && lim.righe[3].includes('«a14 ') && lim.righe[4].includes('«i ciao /i»'), lim.righe.map(x => x.slice(0, 40)));
  check('…ognuno con al massimo 200 + 240 caratteri di parole; nelle partite libere l\'avvertenza non nomina il campo «relazioni»', lim.righe.slice(0, 4).every(x => /«a\d+ x{1,}»; risposta: «b\d+ y{1,}»$/.test(x)) && lim.righe[0].length <= 'a'.length + 200 + 240 + 60 && !/relazioni/.test(lim.free) && /Tienine conto/.test(lim.free), lim.free);

  // =============================================================== 6. la richiesta al motore
  console.log('— ciò che si dice al motore: le regole per scrivere i messaggi, la forma della risposta e che cosa resta fuori');
  await restart(PL);
  await turn({ messaggi: [] });
  const q = await lastPrompt();
  check('la richiesta ha le regole: da 0 a 3 nazioni diverse, mai il giocatore, il formato del messaggio con i quattro tipi e il peso intero da 1 a 5',
    /Messaggi: alla fine del periodo da 0 a 3 altre nazioni \(diverse fra loro, mai il giocatore\) possono scrivergli: elencali in "messaggi" come \{"da":"CODICE","tipo":"colloquio" \| "accordo" \| "richiesta" \| "ultimatum","peso":intero da 1 a 5,"testo":"il messaggio in prima persona, 1-3 frasi"\}\./.test(q), q.slice(q.indexOf('Messaggi:'), q.indexOf('Messaggi:') + 400));
  check('…che cosa vuol dire ogni tipo e ogni peso (4 e 5 solo per svolte gravi), che il messaggio segue i fatti e le relazioni, che il motore non decide la risposta del giocatore, e «messaggi» vuoto se nessuno scrive',
    /colloquio = chiede un incontro; accordo = propone un patto, un'alleanza o un aiuto; richiesta = chiede qualcosa al giocatore; ultimatum = intima di fare o smettere di fare qualcosa sotto minaccia\./.test(q)
    && /1 minore, 2 medio, 3 rilevante, 4 alto, 5 cruciale: 4 e 5 solo per svolte gravi/.test(q) && /gli amici propongono, gli ostili minacciano/.test(q) && /Non decidere tu la risposta del giocatore\. Se nessuna nazione scrive, "messaggi" è un array vuoto\./.test(q), q.slice(q.indexOf('Messaggi:')).slice(0, 1000));
  check('lo schema della risposta ha il campo «messaggi» con le sue quattro chiavi', q.includes('"messaggi": [{"da": "CODICE", "tipo": "colloquio, accordo, richiesta o ultimatum", "peso": numero intero da 1 a 5, "testo": "il messaggio, 1-3 frasi"}]'));
  const mis = await ev(() => { const T = window.__t, S = T.getState(); S.inbox = [];
    const vuoto = T.turnPrompt([], '1 mese', true).length;
    const lungo = 'x'.repeat(360);
    S.inbox = [['FRA', 'accordo', 4], ['URSS', 'ultimatum', 5], ['GBR', 'colloquio', 2]].map(([c, t, w], i) => ({ id: 'm' + (i + 1), from: c, type: t, weight: w, text: lungo, decision: 'accept', talk: false }));
    for (let i = 0; i < 12; i++) T.recordTalk('Francia', 'a'.repeat(300), 'b'.repeat(300));
    return { rules: T.messagesRules().length, ctx: T.messagesContext().length, talks: T.talksContext(true).length, vuoto, pieno: T.turnPrompt([], '1 mese', true).length, sommario: T.messagesSummary().length }; });
  check('le regole sono brevi (sotto 1.100 caratteri), la parte sulle risposte con 3 messaggi lunghi sotto 1.800, quella sui colloqui sotto 2.900', mis.rules < 1100 && mis.ctx < 1800 && mis.talks < 2900, mis);
  // i limiti erano 11.500 e 15.000 fino alla versione 34; i contatti fra altre nazioni (versione 35) aggiungono circa 900 caratteri a tutte e due le misure;
  // le regole del quaderno (versione 36) circa 650 a quella senza messaggi, e il quaderno stesso (qui: 10 voci di colloquio di Francia, ne passano 3) altri 600 al caso peggiore
  check('la richiesta intera resta moderata: sotto 12.000 caratteri senza messaggi, sotto 17.500 nel caso peggiore (3 messaggi da 360 caratteri e 5 colloqui lunghi)', mis.vuoto < 12000 && mis.pieno < 17500, mis);
  const scelto = await ev(() => { const T = window.__t, S = T.getState(); S.inbox = []; S.talks.length = 0;
    const cand = ['LKA', 'THA', 'NPL', 'PRK', 'BTN', 'MNG']; const senza = T.turnPrompt([], '1 mese', true);
    const c = cand.find(x => !senza.includes('(' + x + ')'));
    S.inbox = [{ id: 'm1', from: c, type: 'accordo', weight: 3, text: 'x', decision: '', talk: false }];
    const con = T.turnPrompt([], '1 mese', true); S.inbox = [];
    return { c, nome: T.countries[c].name, riga: (con.match(new RegExp(T.countries[c].name.replace(/[()]/g, '\\$&') + ' \\(' + c + '\\) [+−-]?\\d+')) || [null])[0] }; });
  check('lo Stato che ha scritto compare fra le relazioni mostrate al motore, anche se non sarebbe stato scelto: ' + scelto.nome, scelto.c && scelto.riga, scelto);
  await restart(PL);
  await turn({ messaggi: M3 });
  await clicca('m1', 'accept');
  await page.click('#advisorBtn');
  await page.waitForFunction(() => document.querySelector('#log .entry-advisor') && document.getElementById('thinking').classList.contains('hidden'));
  const cons = await lastPrompt();
  check('anche il consigliere sa dei messaggi: nomi, tipi, pesi e che cosa è già deciso', cons.includes(' Messaggi ricevuti dalle altre nazioni, ai quali risponde prima di avanzare: Francia (proposta di accordo, peso 4/5; già deciso: accettare); Unione Sovietica (ultimatum, peso 5/5); Regno Unito (richiesta di colloquio, peso 2/5).'), cons.slice(cons.indexOf('Messaggi ricevuti') - 5, cons.indexOf('Messaggi ricevuti') + 300));
  const vuote = await ev(() => { const T = window.__t, S = T.getState(); S.inbox = []; S.talks.length = 0; const a = [T.messagesContext(), T.talksContext(true), T.messagesSummary()]; T.resetGame(); return a.concat([T.messagesContext(), T.messagesSummary()]); });
  check('senza messaggi e senza colloqui le tre parti sono vuote; e senza partita sulla mappa nessuna parte compare', vuote.every(x => x === ''), vuote);

  // =============================================================== 7. partita libera (senza mappa)
  console.log('— una partita libera non ha messaggi, ma i colloqui contano lo stesso');
  await ev(() => { window.__queue.length = 0; window.__textQueue.length = 0; window.__t.resetGame(); });
  await page.fill('#nation', 'Impero Romano'); await page.fill('#startYear', '400 d.C.');
  await page.click('#startBtn');                                   // «Inizia» apre la partita libera; la richiesta al motore parte al primo «Avanza»
  await turn({ nuovo_anno: '401', messaggi: [MSG('FRA', 'accordo', 4, 'Non deve comparire.')] });
  const lib = await ev(() => ({ inbox: window.__t.getState().inbox.length, hidden: document.getElementById('msgPanel').classList.contains('hidden'), warn: document.getElementById('msgWarn').classList.contains('hidden'),
    m: document.querySelectorAll('#log .entry-msg').length, kinds: window.__t.getState().log.map(e => e.k).join(), mode: window.__t.getGameMode(), p: String(window.__prompts[window.__prompts.length - 1]) }));
  check('partita libera: la richiesta non ha le regole dei messaggi né il campo «messaggi»; se la risposta ne porta, vengono ignorati: posta vuota, pannello e avviso nascosti, nessuna voce nella cronaca',
    lib.mode === 'free' && lib.p.includes('Impero Romano') && lib.kinds === 't' && !lib.p.includes('"messaggi"') && !lib.p.includes('Messaggi:') && lib.inbox === 0 && lib.hidden && lib.warn && lib.m === 0, lib);
  await page.click('#tabDiplo');
  await ev(() => { document.getElementById('diploTarget').value = 'Carlo Magno'; document.getElementById('diploStartBtn').click(); });
  await queueText('Saluti, imperatore.'); await scrivi('Propongo un trattato.');
  await tabAzioni();
  await turn();
  const libp = await lastPrompt();
  check('…il colloquio di una partita libera arriva al motore, senza il campo «relazioni» (che qui non c\'è)', libp.includes('- con Carlo Magno: il giocatore dice «Propongo un trattato.»; risposta: «Saluti, imperatore.»') && !/\(campo "relazioni"\)/.test(libp) && (await talks()).length === 0, libp.slice(libp.indexOf('Colloqui avuti') - 5, libp.indexOf('Colloqui avuti') + 400));
  const libSave = await ev(() => { const d = JSON.parse(JSON.stringify(window.__t.buildSavePayload())); d.game.inbox = [{ id: 'm1', from: 'FRA', type: 'accordo', weight: 3, text: 'x', decision: '', talk: false }]; d.game.msgSeq = 1;
    window.__t.applySave(d); return { inbox: window.__t.getState().inbox.length, hidden: document.getElementById('msgPanel').classList.contains('hidden') }; });
  check('un documento di partita libera che porta dei messaggi li scarta', libSave.inbox === 0 && libSave.hidden, libSave);

  // =============================================================== 8. salvataggio e caricamento
  console.log('— salvataggio, caricamento e documenti rotti messi apposta');
  await conMessaggi();
  await clicca('m1', 'accept'); await clicca('m2', 'refuse');
  await clicca('m3', 'reply');
  await queueText('Ci vedremo.'); await scrivi('Va bene, ci vediamo.');
  const s1 = await ev(() => JSON.parse(JSON.stringify(window.__t.buildSavePayload())));
  check('il salvataggio ha le tre cose nuove: la posta con le risposte e il colloquio fatto (talk), i colloqui da leggere, il numero dell\'ultimo messaggio; e la conversazione aperta con il suo messaggio',
    s1.game.msgSeq === 3 && JSON.stringify(s1.game.inbox.map(m => [m.id, m.decision, m.talk])) === JSON.stringify([['m1', 'accept', false], ['m2', 'refuse', false], ['m3', '', true]])
    && JSON.stringify(s1.game.talks) === JSON.stringify([{ to: 'Regno Unito', you: 'Va bene, ci vediamo.', they: 'Ci vedremo.' }]) && s1.game.diplo.msgId === 'm3' && /Poco fa hai scritto tu al giocatore/.test(s1.game.diplo.intro), s1.game);
  const restoreCheck = await ev(s1 => { const T = window.__t; T.resetGame(); const ok = T.applySave(JSON.parse(JSON.stringify(s1)));
    return { ok, inbox: JSON.parse(JSON.stringify(T.getState().inbox)), talks: JSON.parse(JSON.stringify(T.getState().talks)), seq: T.getState().msgSeq, diplo: [T.getState().diplo.msgId, T.getState().diplo.target, T.getState().diplo.intro],
      items: document.querySelectorAll('#msgList li').length, warn: document.getElementById('msgWarn').textContent, log: T.getState().log.map(e => e.k).join() }; }, s1);
  check('caricato il salvataggio tutto torna com\'era: posta e risposte, colloqui, numero, conversazione e legame con il messaggio, pannello e avviso, voci della cronaca',
    restoreCheck.ok !== false && JSON.stringify(restoreCheck.inbox) === JSON.stringify(s1.game.inbox) && JSON.stringify(restoreCheck.talks) === JSON.stringify(s1.game.talks) && restoreCheck.seq === 3
    && restoreCheck.diplo[0] === 'm3' && restoreCheck.diplo[1] === 'Regno Unito' && restoreCheck.diplo[2] === s1.game.diplo.intro && restoreCheck.items === 3 && restoreCheck.warn === '' && restoreCheck.log === 't,m', restoreCheck);
  const carica = async (patch, prima = null) => { await restart(PL); await turn({ messaggi: [MSG('FRA', 'accordo', 4, 'Uno.')] });
    return ev(({ patch, prima }) => { const T = window.__t, d = JSON.parse(JSON.stringify(T.buildSavePayload())); Object.assign(d.game, patch);
      if (patch.__diplo) { d.game.diplo = Object.assign({}, d.game.diplo, patch.__diplo); delete d.game.__diplo; }
      const res = T.applySave(d), S = T.getState();
      return { res, inbox: JSON.parse(JSON.stringify(S.inbox)), talks: JSON.parse(JSON.stringify(S.talks)), seq: S.msgSeq, msgId: S.diplo.msgId, intro: S.diplo.intro }; }, { patch, prima }); };
  const brutta = [
    { id: 'm1', from: 'FRA', type: 'accordo', weight: 4, text: 'valido', decision: 'accept', talk: true },
    { id: 'm1', from: 'GBR', type: 'accordo', weight: 4, text: 'stesso id' }, { id: 'x2', from: 'GBR', type: 'accordo', weight: 4, text: 'id sbagliato' }, { id: 'm3', from: 'ZZZ', type: 'accordo', weight: 4, text: 'Stato che non c\'è' },
    { id: 'm4', from: 'GBR', type: 'dichiarazione', weight: 4, text: 'tipo sconosciuto' }, { id: 'm5', from: 'GBR', type: 'accordo', weight: 2.5, text: 'peso con la virgola' }, { id: 'm6', from: 'GBR', type: 'accordo', weight: '3', text: 'peso testo' },
    { id: 'm7', from: 'GBR', type: 'accordo', weight: 6, text: 'peso fuori scala' }, { id: 'm8', from: 'GBR', type: 'accordo', weight: 3, text: '   ' }, { id: 'm9', from: 'ITA', type: 'accordo', weight: 3, text: 'il giocatore a se stesso' },
    { id: 'm0', from: 'GBR', type: 'accordo', weight: 0, text: 'peso zero' }, { id: 'm12', from: 'GBR', type: 'accordo', text: 'senza peso' },
    'testo', null, 5, [1], { id: 'm10', from: 'URSS', type: 'ultimatum', weight: 5, text: '<b>testo</b> pulito', decision: 'boh', talk: 'si' }];
  let c = await carica({ inbox: brutta, msgSeq: 0 });
  check('un documento con una posta rovinata: restano solo i messaggi in regola (m1 e m10; peso con la virgola, scritto come testo, fuori scala, zero o mancante: scartati; id doppio o sbagliato, Stato che non c\'è, tipo sconosciuto, testo vuoto, il giocatore stesso, voci che non sono oggetti: scartati)',
    c.res !== false && JSON.stringify(c.inbox.map(m => m.id)) === JSON.stringify(['m1', 'm10']) && c.inbox[0].decision === 'accept' && c.inbox[0].talk === true, c.inbox);
  check('…una risposta o un colloquio scritti male diventano «nessuno» (non vale «boh» né «si»), il testo si pulisce, e il numero dell\'ultimo messaggio non sta mai sotto il più alto presente (10)',
    c.inbox[1].decision === '' && c.inbox[1].talk === false && !/[<>]/.test(c.inbox[1].text) && /testo/.test(c.inbox[1].text) && /pulito/.test(c.inbox[1].text) && c.seq === 10, c.inbox[1]);
  const sei = Array.from({ length: 9 }, (_, i) => ({ id: 'm' + (i + 1), from: altri[i], type: 'colloquio', weight: 1, text: 'x' + i }));
  c = await carica({ inbox: sei });
  check('più di 6 messaggi in un documento: ne restano 6 (i primi)', JSON.stringify(c.inbox.map(m => m.id)) === JSON.stringify(['m1', 'm2', 'm3', 'm4', 'm5', 'm6']));
  for (const [v, att] of [[5, 5], [0, 0], [-3, 0], [1e9, 1000000], ['x', 0], [null, 0], [2.7, 2], [Infinity, 0], [NaN, 0]]) {
    c = await carica({ inbox: [], msgSeq: v });
    check('numero dell\'ultimo messaggio ' + JSON.stringify(v) + ' → ' + att + ' (intero da 0 a 1.000.000)', c.seq === att, c.seq);
  }
  for (const [nome, v] of [['una lista di testi', ['x']], ['un testo', 'abc'], ['un numero', 5], ['null', null], ['un oggetto', { a: 1 }], ['vero', true]]) {
    c = await carica({ inbox: v });
    check('«inbox» che è ' + nome + ': ignorato, partita normale e posta vuota', c.res !== false && c.inbox.length === 0, c);
  }
  c = await carica({ talks: [{ to: 'Francia', you: 'a', they: 'b' }, { to: '', you: 'x', they: 'y' }, { to: 'X', you: '', they: '' }, 'testo', null, { to: 'Y', you: '<i>ciao</i>', they: 'z'.repeat(1000) }] });
  check('colloqui rovinati: restano i due in regola, il secondo ripulito e tagliato a 240 caratteri', c.talks.length === 2 && c.talks[0].to === 'Francia' && c.talks[1].you === 'i ciao /i' && c.talks[1].they.length === 240, c.talks);
  c = await carica({ talks: Array.from({ length: 20 }, (_, i) => ({ to: 'Francia', you: 'n' + i, they: 'r' })) });
  check('più di 12 colloqui: restano gli ultimi 12', c.talks.length === 12 && c.talks[0].you === 'n8' && c.talks[11].you === 'n19', c.talks.map(t => t.you));
  for (const [nome, v] of [['un testo', 'abc'], ['un numero', 5], ['null', null], ['un oggetto', { a: 1 }]]) {
    c = await carica({ talks: v });
    check('«talks» che è ' + nome + ': ignorato', c.res !== false && c.talks.length === 0, c);
  }
  c = await carica({ inbox: [{ id: 'm1', from: 'FRA', type: 'accordo', weight: 4, text: 'Uno.' }], msgSeq: 1, __diplo: { target: 'Francia', history: [], bubbles: [], intro: '<b>ciao</b> ' + 'z'.repeat(2000), msgId: 'm1' } });
  check('la conversazione legata a un messaggio che c\'è tiene il legame; la presentazione si pulisce e si ferma a 700 caratteri', c.msgId === 'm1' && c.intro.length === 700 && !/[<>]/.test(c.intro), [c.msgId, c.intro.length]);
  for (const [nome, v] of [['di un messaggio che non c\'è', 'm9'], ['scritto male', 'FRA'], ['un numero', 5], ['vuoto', '']]) {
    c = await carica({ __diplo: { target: 'Francia', msgId: v } });
    check('legame con la conversazione ' + nome + ': cade (nessun legame)', c.msgId === '', c.msgId);
  }
  const dirette = await ev(() => { const T = window.__t; const m = v => T.cleanSavedGame({ mode: 'fixed', diplo: { target: 'Francia', history: [], bubbles: [], msgId: v } }).diplo.msgId; return ['m5', 'm1234567', 'm12345678', 'FRA', 5, '', null, 'm', 'M5', ' m5', 'm5 ', 'x5', '__proto__'].map(m); });
  check('«cleanSavedGame», da sola, tiene il legame del colloquio solo se è un numero di messaggio fatto come «m5» (da una a sette cifre): «m12345678», «FRA», un numero, vuoto, «M5», con spazi, «x5» o «__proto__» cadono',
    JSON.stringify(dirette) === JSON.stringify(['m5', 'm1234567', '', '', '', '', '', '', '', '', '', '', '']), dirette);
  await restart(PL); await turn({ messaggi: [MSG('FRA', 'accordo', 4, 'Uno.')] });
  const vecchio = await ev(() => { const T = window.__t, d = JSON.parse(JSON.stringify(T.buildSavePayload())); delete d.game.inbox; delete d.game.talks; delete d.game.msgSeq; if (d.game.diplo) { delete d.game.diplo.intro; delete d.game.diplo.msgId; }
    const res = T.applySave(d); return { res, inbox: T.getState().inbox.length, talks: T.getState().talks.length, seq: T.getState().msgSeq, panel: document.getElementById('msgPanel').classList.contains('hidden') }; });
  check('un salvataggio di prima (senza posta, colloqui e numero) si carica: tutto vuoto, il pannello c\'è', vecchio.res !== false && vecchio.inbox === 0 && vecchio.talks === 0 && vecchio.seq === 0 && !vecchio.panel, vecchio);
  const pieno = await ev(() => { const T = window.__t; const d = JSON.parse(JSON.stringify(T.buildSavePayload())); d.game.inbox = [{ id: 'm1', from: 'ITA', type: 'accordo', weight: 3, text: 'a se stesso', decision: '', talk: false }, { id: 'm2', from: 'FRA', type: 'accordo', weight: 3, text: 'va bene', decision: '', talk: false }];
    T.applySave(d); return T.getState().inbox.map(m => m.id); });
  check('un messaggio del giocatore a se stesso (Stato scelto = mittente) si scarta al caricamento, gli altri restano', JSON.stringify(pieno) === JSON.stringify(['m2']), pieno);
  const log = await ev(() => { const T = window.__t; const d = JSON.parse(JSON.stringify(T.buildSavePayload())); d.game.log.push({ k: 'm', lines: ['Messaggio di Francia (proposta di accordo, peso 4): accettato', '', 7] }); T.applySave(d);
    return JSON.parse(JSON.stringify(T.getState().log.filter(e => e.k === 'm').slice(-1)[0])); });
  check('le voci «Messaggi» della cronaca si salvano e si caricano (le righe vuote o non di testo no)', log.lines.length === 2 && log.lines[0].startsWith('Messaggio di Francia') && log.lines[1] === '7', log);
  await ev(() => { window.__t.resetGame(); window.__t.startFixedScenarioGame('FRA'); });
  const nuova = await ev(() => { const S = window.__t.getState(); return [S.inbox.length, S.talks.length, S.msgSeq, S.diplo.msgId, S.diplo.intro]; });
  check('una partita nuova riparte da zero: posta, colloqui, numero, legame', nuova.join('|') === '0|0|0||', nuova);

  // =============================================================== 9. aspetto, tastiera, contrasto
  console.log('— aspetto: fine partita, spiegazione, contrasto e colori forzati');
  await conMessaggi();
  await page.click('#msgHow > summary');
  p = await pannello();
  const tavolaTesto = 'Richiesta di colloquio: accettare +2, rifiutare −1, ignorare −1; Proposta di accordo: accettare +4, rifiutare −2, ignorare −1; Richiesta: accettare +3, rifiutare −3, ignorare −2; Ultimatum: accettare 0, rifiutare −5, ignorare −5';
  check('«Come funzionano i messaggi» è un riquadro che si apre (details/summary): peso da 1 a 5, risposte che contano all\'«Avanza», senza risposta = ignorato, «Rispondi» = colloquio, la tavola dei valori, «regole del gioco, non dati storici»',
    p.howTag === 'DETAILS' && p.howOpen && p.howSummary === 'Come funzionano i messaggi' && p.note.includes('Ogni messaggio ha un peso da 1 a 5, scelto dal motore: più è alto, più pesa la tua risposta sulle relazioni con chi lo scrive.')
    && p.note.includes('Le risposte contano quando fai avanzare il tempo. Un messaggio senza risposta conta come ignorato.') && p.note.includes('«Rispondi» apre un colloquio nella scheda Diplomazia: il motore lo legge e non c\'è un effetto automatico.')
    && p.note.includes('Per ogni punto di peso le relazioni cambiano così — ' + tavolaTesto + '. Sono regole del gioco, non dati storici.'), p.note);
  const misure = await ev(() => [...document.querySelectorAll('#msgList .msg-actions button')].map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
  check('i pulsanti sono abbastanza grandi da toccare (almeno 24 × 24 pixel)', misure.length === 9 && misure.every(([w, h]) => w >= 24 && h >= 24), misure);
  await clicca('m1', 'accept');
  const contrasti = scheme => ev(scheme => {
    const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
    const lum = ({ r, g, b }) => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const fondo = n => { for (let e = n; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.99) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
    const rap = n => { const t = parse(getComputedStyle(n).color), s = fondo(n), a = lum(t), b = lum(s); return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100; };
    const sel = ['#msgEmpty', '.msg-from', '.msg-type', '.msg-weight', '.msg-text', '.msg-stakes', '.msg-status', '.msg-actions button[aria-pressed="true"]', '.msg-actions button[aria-pressed="false"]', '.msg-actions button:not([aria-pressed])', '#msgHow summary', '#msgNote', '#msgWarn', '#msgTitle', '.entry-msg'];
    const out = {}; for (const s of sel) { const n = document.querySelector(s); out[s] = n ? rap(n) : null; }
    out['.msg-dots'] = rap(document.querySelector('.msg-dots')); return out;
  }, scheme);
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme });
    const cr = await contrasti(scheme);
    const bassi = Object.entries(cr).filter(([s, v]) => v === null || v < (s === '.msg-dots' ? 3 : 4.5));
    check('contrasto del testo del pannello nel tema ' + (scheme === 'light' ? 'chiaro' : 'scuro') + ': almeno 4,5 a 1 (3 a 1 per i pallini del peso), pulsante premuto compreso', bassi.length === 0, bassi);
    const sfondi = await ev(() => [...document.querySelectorAll('#msgList li:first-child .msg-actions button')].map(b => getComputedStyle(b).backgroundColor));
    check('nel tema ' + (scheme === 'light' ? 'chiaro' : 'scuro') + ' il pulsante premuto (Accetta) si distingue da quelli non premuti anche per lo sfondo, non solo per il nome', sfondi.length === 3 && sfondi[0] !== sfondi[1] && sfondi[1] === sfondi[2], sfondi);
  }
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ forcedColors: 'active' });
  const forzati = await ev(() => [...document.querySelectorAll('#msgList li:first-child .msg-actions button')].map(b => [b.getAttribute('aria-pressed'), getComputedStyle(b).backgroundColor, getComputedStyle(b).color]));
  check('con i colori forzati (alto contrasto) il pulsante premuto si distingue da quelli non premuti (sfondo evidenziato e testo di contrasto)', forzati[0][0] === 'true' && forzati[0][1] !== forzati[1][1] && forzati[0][2] !== forzati[1][2], forzati);
  const sistema = await ev(() => { const d = document.createElement('div'); d.style.cssText = 'background:Highlight;color:HighlightText'; document.body.appendChild(d); const c = getComputedStyle(d), r = [c.backgroundColor, c.color]; d.remove(); return r; });
  check('…e il pulsante premuto usa i colori del sistema (Highlight e HighlightText), non quelli della pagina', forzati[0][1] === sistema[0] && forzati[0][2] === sistema[1], [forzati[0], sistema]);
  await page.emulateMedia({ forcedColors: 'none' });
  // l'ultimo territorio si perde in un turno vero, che porta anche un messaggio nuovo (m4): è il turno a chiudere la partita e a ridisegnare il pannello
  await ev(() => { const t = window.__t; for (const id of t.getCountryProvinces('ITA')) { t.changeProvinceOwner(id, 'FRA'); t.changeProvinceController(id, 'FRA'); } });
  await turn({ messaggi: [MSG('GBR', 'accordo', 3, 'Questo messaggio arriva a partita finita.')] });
  p = await pannello();
  check('il turno che toglie l\'ultimo territorio chiude la partita: il pannello e l\'avviso spariscono anche se in quel turno è arrivato un messaggio, «Avanza» è spento, e quel messaggio non si può né decidere né aprire in colloquio',
    (await ev(() => window.__t.getGameOver())) === true && p.hidden && p.warnHidden && p.items.length === 0 && (await inbox()).length === 1 && (await inbox())[0].id === 'm4'
    && (await ev(() => [window.__t.decideMessage('m4', 'accept'), window.__t.replyToMessage('m4')])).join() === 'false,false' && (await ev(() => document.getElementById('advanceBtn').disabled)) === true, [p.hidden, p.warnHidden, await inbox()]);
  await ev(() => { window.__t.resetGame(); });
  p = await pannello();
  check('senza partita il pannello e l\'avviso sono nascosti', p.hidden && p.warnHidden && p.items.length === 0);

  check('nessun errore della pagina in tutta la prova', errors.length === 0, errors);
  await browser.close();
  process.exit(summary() ? 1 : 0);
})();
