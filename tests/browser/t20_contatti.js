// Contatti fra altre nazioni (versione 35): dopo ogni «Avanza» il motore può riferire fino a 3 contatti diplomatici fra due Stati che non sono
// quello del giocatore (campo «contatti»: da, a, tipo, peso, esito, testo). I tipi e i pesi sono quelli dei messaggi (colloquio, accordo,
// richiesta, ultimatum; peso da 1 a 5); l'esito (accettato, rifiutato, ignorato) lo sceglie il motore; l'effetto sulla coppia lo applica il
// gioco con la stessa tavola dei messaggi (valore del tipo e dell'esito per il peso, una regola del gioco e non un dato storico) e il motore
// non lo ripete in «relazioni». La cronaca ha una voce propria (tipo c) e le righe delle relazioni portano il motivo «contatto: …».
// Le attese sono scritte qui, a mano o con un secondo calcolo indipendente dal codice della pagina; il file dei dati si legge dal disco.
const fs = require('fs');
const path = require('path');
const { launch, check, summary } = require('./harness');

const FILE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'data', 'states_1960.json'), 'utf8'));
const REL = FILE.meta.relations;
const ID = FILE.states.map(s => s.id);
const STATO = Object.fromEntries(FILE.states.map(s => [s.id, s]));
const NOME = Object.fromEntries(FILE.states.map(s => [s.id, s.name]));
const BLOCCO = {};
for (const [id, b] of Object.entries(REL.blocs)) for (const a of b.alliances) BLOCCO[a] = id;

// ---- il secondo calcolo dei valori di partenza (come nelle prove delle relazioni e dei messaggi), scritto qui e non letto dalla pagina
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
const chiave = (a, b) => [a, b].sort().join('|');

// ---- la tavola dei messaggi, scritta a mano: per ogni punto di peso, che cosa cambia nelle relazioni (i contatti usano la stessa)
const TAVOLA = { colloquio: { accetta: 2, rifiuta: -1, ignora: -1 }, accordo: { accetta: 4, rifiuta: -2, ignora: -1 },
  richiesta: { accetta: 3, rifiuta: -3, ignora: -2 }, ultimatum: { accetta: 0, rifiuta: -5, ignora: -5 } };
const TIPI = Object.keys(TAVOLA);
const NOME_TIPO = { colloquio: 'Richiesta di colloquio', accordo: 'Proposta di accordo', richiesta: 'Richiesta', ultimatum: 'Ultimatum' };
const minuscolo = tipo => NOME_TIPO[tipo].toLowerCase();
// ---- gli esiti: tre parole, e le parole che il gioco legge come uno dei tre
const ESITI = ['accettato', 'rifiutato', 'ignorato'];
const SCELTA = { accettato: 'accetta', rifiutato: 'rifiuta', ignorato: 'ignora' };
const effetto = (tipo, esito, peso) => TAVOLA[tipo][SCELTA[esito]] * peso;
const PAROLE_ESITO = { accettato: 'accept', accettata: 'accept', accetta: 'accept', accolto: 'accept', accolta: 'accept',
  rifiutato: 'refuse', rifiutata: 'refuse', rifiuta: 'refuse', respinto: 'refuse', respinta: 'refuse',
  ignorato: 'ignore', ignorata: 'ignore', ignora: 'ignore', 'senza risposta': 'ignore' };
const TESTO_ESITO = { accept: 'accettato', refuse: 'rifiutato', ignore: 'ignorato' };

const AVVISO_SCARTI = n => `⚠️ Contatti scartati: ${n} (Stati o tipo non validi, esito o testo mancanti, il giocatore fra i due Stati, due contatti fra gli stessi Stati, oppure oltre il massimo di 3 per periodo)`;
const CT = (da, a, tipo, peso, esito, testo = 'x') => ({ da, a, tipo, peso, esito, testo });
const riga = (da, a, tipo, peso, esito, testo) => `${NOME[da]} → ${NOME[a]}: ${minuscolo(tipo)} (peso ${peso}), ${esito} — «${testo}»`;
const motivo = (tipo, peso, esito) => `contatto: ${minuscolo(tipo)} (peso ${peso}): ${esito}`;
const PL = 'ITA';
const altri = ID.filter(c => c !== PL);
const coppia = i => [altri[i], altri[i + 1]];
const stessi = (x, y) => JSON.stringify(Object.keys(x).sort().map(k => [k, x[k]])) === JSON.stringify(Object.keys(y).sort().map(k => [k, y[k]]));
const uguali = (x, y) => JSON.stringify(x) === JSON.stringify(y);

const TURN = (extra = {}) => Object.assign({ evento_titolo: 'Titolo di prova', narrativa: 'Narrativa di prova.', riepilogo_mondo: 'Riepilogo di prova.',
  nuovo_anno: 'gennaio 1961', stabilita: 55, economia: 55, esercito: 55, prestigio: 55, cambi_territoriali: [], cambi_controllo: [], segnaposto: [] }, extra);

(async () => {
  const { browser, page, errors } = await launch({ width: 640, height: 1100, mobile: false });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const restart = c => ev(c => { window.__queue.length = 0; window.__textQueue.length = 0; window.__t.resetGame(); window.__t.startFixedScenarioGame(c); }, c);
  const queueJson = v => ev(v => { window.__queue.push(v); }, v);
  const spinnerOff = () => page.waitForFunction(() => document.getElementById('thinking').classList.contains('hidden'));
  const advance = async () => { await page.click('#advanceBtn'); await spinnerOff(); };
  const turn = async extra => { await queueJson(TURN(extra)); await advance(); };
  const salto = v => ev(v => { document.getElementById('jump').value = v; }, v);
  const relOf = (a, b) => ev(([a, b]) => window.__t.relGet(a, b), [a, b]);
  const rels = () => ev(() => JSON.parse(JSON.stringify(window.__t.getState().rel)));
  const kinds = () => ev(() => window.__t.getState().log.map(e => e.k).join());
  const logLines = k => ev(k => window.__t.getState().log.filter(e => e.k === k).map(e => e.lines), k);
  const lastPrompt = () => ev(() => { const p = window.__prompts[window.__prompts.length - 1]; return Array.isArray(p) ? String(p[0].content) : String(p); });
  const applica = list => ev(l => { try { return JSON.parse(JSON.stringify(window.__t.applyContacts(l))); } catch (e) { return { events: [], lines: [], refused: -1, errore: String(e) }; } }, list);       // se la pagina si rompe, la prova lo scrive e va avanti
  const inbox = () => ev(() => JSON.parse(JSON.stringify(window.__t.getState().inbox)));

  check('la pagina si carica senza errori', errors.length === 0, errors);

  // =============================================================== 1. i tetti e le parole
  console.log('— i tetti, le parole degli esiti e il numero di Stati');
  const T0 = await ev(() => { const T = window.__t; return { tetti: [T.MAX_NEW_CONTACTS, T.MAX_CONTACT_READ, T.MAX_CONTACT_LEN], esiti: T.CONTACT_OUTCOMES, testo: T.CONTACT_OUTCOME_TEXT }; });
  check('i tetti: 3 contatti nuovi per turno, 20 voci lette, 300 caratteri di testo', uguali(T0.tetti, [3, 20, 300]), T0.tetti);
  check('le parole che il gioco legge come esito: accettato, accettata, accetta, accolto, accolta; rifiutato, rifiutata, rifiuta, respinto, respinta; ignorato, ignorata, ignora, senza risposta', stessi(T0.esiti, PAROLE_ESITO), T0.esiti);
  check('…e come si scrive ciascuno dei tre nella cronaca: accettato, rifiutato, ignorato', stessi(T0.testo, TESTO_ESITO), T0.testo);
  await restart(PL);
  check('nella partita di prova ci sono 83 Stati sulla mappa e tutti hanno territorio: 82 oltre al giocatore (le prove usano coppie prese dal file dei dati)', ID.length === 83 && (await ev(() => window.__t.relOthers().length)) === 82 && altri.length === 82, [ID.length, altri.length]);

  // =============================================================== 2. quali contatti si accettano
  console.log('— i contatti del motore: che cosa si accetta e che cosa si scarta');
  let r = await applica([CT('FRA', 'GBR', 'accordo', 4, 'accettato', 'Firmano un patto di amicizia.')]);
  const bFG = base('FRA', 'GBR');
  check('un contatto valido è accettato: una riga «Francia → Regno Unito: proposta di accordo (peso 4), accettato — «testo»», un evento per le righe delle relazioni (con il motivo), niente scartato',
    r.refused === 0 && uguali(r.lines, [riga('FRA', 'GBR', 'accordo', 4, 'accettato', 'Firmano un patto di amicizia.')]) && uguali(r.events, [{ a: 'FRA', b: 'GBR', why: motivo('accordo', 4, 'accettato') }]), r);
  check('…e la funzione applica da sola l\'effetto sulla coppia (accordo accettato di peso 4: +16), in tutti e due i sensi', (await relOf('FRA', 'GBR')) === bFG + 16 && (await relOf('GBR', 'FRA')) === bFG + 16, [bFG, await relOf('FRA', 'GBR')]);
  check('…senza toccare né la posta in arrivo né il numero dei messaggi', (await inbox()).length === 0 && (await ev(() => window.__t.getState().msgSeq)) === 0);

  await restart(PL);
  r = await applica([{ mittente: ' fra ', verso: 'gbr', genere: ' ACCORDO ', importanza: '3', risposta: 'Accettato', descrizione: 'uno' },
    { nazione_a: 'URSS', nazione_b: 'FRG', tipo: 'minaccia', peso: 5, risultato: 'respinto', contenuto: 'due' },
    { da: 'POL', destinatario: 'TCH', tipo: 'proposta', peso: 1, esito: 'ignorata', testo: 'tre' }]);
  check('i codici si leggono con spazi e minuscole, il tipo con maiuscole, il peso scritto come testo, l\'esito con la maiuscola; chiavi alternative (mittente, verso, genere, importanza, risposta, descrizione; nazione_a, nazione_b, risultato, contenuto; destinatario)',
    r.refused === 0 && uguali(r.lines, [riga('FRA', 'GBR', 'accordo', 3, 'accettato', 'uno'), riga('URSS', 'FRG', 'ultimatum', 5, 'rifiutato', 'due'), riga('POL', 'TCH', 'accordo', 1, 'ignorato', 'tre')]), r);
  check('…«minaccia» è un ultimatum, «proposta» un accordo; gli effetti sono quelli della tavola (+12, −25, −1)', (await relOf('FRA', 'GBR')) === base('FRA', 'GBR') + 12 && (await relOf('URSS', 'FRG')) === limita(base('URSS', 'FRG') - 25) && (await relOf('POL', 'TCH')) === base('POL', 'TCH') - 1,
    [await relOf('FRA', 'GBR'), await relOf('URSS', 'FRG'), await relOf('POL', 'TCH')]);

  await restart(PL);
  const quattroTipi = [];
  for (let i = 0; i < TIPI.length; i++) { const [x, y] = coppia(i * 2); quattroTipi.push((await applica([CT(x, y, TIPI[i], 3, 'accettato', 'x')])).lines.length); }
  check('i quattro tipi (colloquio, accordo, richiesta, ultimatum) sono tutti accettati', uguali(quattroTipi, [1, 1, 1, 1]), quattroTipi);
  r = await applica(['dichiarazione', '', null, 5, 'constructor', '__proto__', 'proposta di accordo', 'Richiesta di colloquio', ['accordo'], {}].map(t => CT('FRA', 'GBR', t, 3, 'accettato', 'x')));
  check('un tipo che non esiste, vuoto, non testuale o preso dal prototipo di un oggetto: scartato (10 su 10); nemmeno il nome intero scritto per esteso passa', r.lines.length === 0 && r.refused === 10, r);

  const paroleEsito = [['accettato', 'accept'], ['Accettata', 'accept'], [' ACCETTA ', 'accept'], ['accolto', 'accept'], ['accolta', 'accept'], ['rifiutato', 'refuse'], ['rifiutata', 'refuse'], ['rifiuta', 'refuse'], ['respinto', 'refuse'],
    ['respinta', 'refuse'], ['ignorato', 'ignore'], ['ignorata', 'ignore'], ['ignora', 'ignore'], ['senza risposta', 'ignore'], ['Senza  risposta', 'ignore'], ['accettato.', 'accept'], ['accettato con riserva', 'accept'],
    ['accettato-con-riserva', 'accept'], ['rifiutato, ma restano aperti', 'refuse'], ['ignorato dal governo', 'ignore'], ['senza risposta alcuna', 'ignore'],
    ['non accettato', ''], ['mai accettato', ''], ['non rifiutato', ''], ['forse', ''], ['accettatox', ''], ['accett', ''], ['accept', ''], ['ok', ''], ['rifiuto', ''], ['', ''], ['   ', ''],
    [null, ''], [undefined, ''], [5, ''], [true, ''], [['accettato'], ''], [{}, ''], ['constructor', ''], ['__proto__', '']];
  const lettiEsiti = await ev(l => l.map(v => window.__t.contactOutcomeOf(v)), paroleEsito.map(x => x[0]));
  const sbagliatiEsiti = paroleEsito.map((x, i) => [x[0], lettiEsiti[i], x[1]]).filter(x => x[1] !== x[2]);
  check('l\'esito si legge dalle parole della tavola, anche con maiuscole, spazi, punteggiatura o parole in più dopo («accettato con riserva»); «non accettato» e le altre parole, i testi vuoti e i valori non testuali non sono un esito (40 casi)', sbagliatiEsiti.length === 0, sbagliatiEsiti);
  await restart(PL);
  const cosi = await ev(() => ['boh', 'non accettato', '', null, 5, ['accettato'], {}, 'forse'].map((e, i) => { const x = window.__t.applyContacts([{ da: 'FRA', a: 'GBR', tipo: 'accordo', peso: 3, esito: e, testo: 'x' }]); return [x.lines.length, x.refused]; }));
  check('un contatto con un esito che non si legge (boh, non accettato, vuoto, null, numero, lista, oggetto, forse) è scartato (8 su 8) e non cambia nulla', cosi.every(x => x[0] === 0 && x[1] === 1) && JSON.stringify(await rels()) === '{}', cosi);

  await restart(PL);
  const pesi = await ev(() => {
    const T = window.__t, out = [], prove = [4, 1, 5, 4.4, 4.6, 0, -3, 9, '3', ' 3 ', 'abc', '', null, undefined, true, [3], {}, NaN];
    const alive = T.relOthers().map(x => x.c);
    prove.forEach((v, i) => { const x = T.applyContacts([{ da: alive[2 * i], a: alive[2 * i + 1], tipo: 'accordo', peso: v, esito: 'ignorato', testo: 'x' }]); out.push(+(/\(peso (\d)\)/.exec(x.lines[0] || '') || [0, -1])[1]); });
    const y = T.applyContacts([{ da: alive[40], a: alive[41], tipo: 'accordo', esito: 'ignorato', testo: 'x' }]); out.push(+(/\(peso (\d)\)/.exec(y.lines[0] || '') || [0, -1])[1]);
    return out;
  });
  check('il peso come per i messaggi: intero da 1 a 5, arrotondato (4,4 → 4; 4,6 → 5), tenuto fra 1 e 5, letto anche come testo; quello che non si legge, o manca, vale 2 (Medio)',
    uguali(pesi, [4, 1, 5, 4, 5, 1, 1, 5, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2]), pesi);

  await restart(PL);
  const statiNo = await ev(() => {
    const T = window.__t, out = [];
    for (const id of T.getCountryProvinces('LUX')) T.changeProvinceOwner(id, 'BEL');
    const prove = [['il giocatore', 'ITA'], ['uno Stato che non esiste', 'ZZZ'], ['vuoto', ''], ['solo spazi', '   '], ['un numero', 123], ['null', null], ['un oggetto', {}], ['una lista', ['FRA']],
      ['__proto__', '__proto__'], ['constructor', 'constructor'], ['uno Stato senza più province (Lussemburgo)', 'LUX'], ['lo stesso Stato (dopo la pulizia del codice)', ' gbr ']];
    for (const [n, v] of prove) {
      const come_da = T.applyContacts([{ da: v, a: 'GBR', tipo: 'accordo', peso: 3, esito: 'accettato', testo: 'x' }]);
      const come_a = T.applyContacts([{ da: 'GBR', a: v, tipo: 'accordo', peso: 3, esito: 'accettato', testo: 'x' }]);
      out.push([n, come_da.lines.length, come_da.refused, come_a.lines.length, come_a.refused]);
    }
    return out;
  });
  check('uno Stato che non va, come mittente o come destinatario, fa scartare il contatto (24 su 24): il giocatore, uno Stato che non c\'è, vuoto, solo spazi, non testuale, preso dal prototipo, senza più province, lo stesso Stato dei due lati',
    statiNo.every(([, a, rf, b, rg]) => a === 0 && rf === 1 && b === 0 && rg === 1), statiNo);
  check('…e nessun contatto scartato ha cambiato una relazione (nemmeno quelle del Regno Unito e del giocatore)', JSON.stringify(await rels()) === '{}', await rels());
  await restart(PL);
  r = await applica([CT('FRA', 'FRA', 'accordo', 3, 'accettato', 'a sé'), CT('fra', ' FRA ', 'accordo', 3, 'accettato', 'a sé'), CT('ITA', 'ITA', 'accordo', 3, 'accettato', 'il giocatore con se stesso')]);
  check('un contatto di uno Stato con se stesso è scartato, anche se i due codici sono scritti in modo diverso (3 su 3)', r.lines.length === 0 && r.refused === 3, r);

  r = await applica([CT(null, 'GBR', 'accordo', 3, 'accettato', 'senza mittente'), { da: 'FRA', tipo: 'accordo', peso: 3, esito: 'accettato', testo: 'senza destinatario' }, 'FRA', null, 5, ['FRA'], true,
    { da: 'FRA', a: 'GBR', peso: 3, esito: 'accettato', testo: 'senza tipo' }, { da: 'FRA', a: 'GBR', tipo: 'accordo', peso: 3, testo: 'senza esito' }, { da: 'FRA', a: 'GBR', tipo: 'accordo', peso: 3, esito: 'accettato' },
    CT('FRA', 'GBR', 'accordo', 3, 'accettato', ''), CT('FRA', 'GBR', 'accordo', 3, 'accettato', '   \n\t '), CT('FRA', 'GBR', 'accordo', 3, 'accettato', '\u0001\u0002')]);
  check('senza mittente o destinatario, voci che non sono oggetti, senza tipo, senza esito, senza testo, con il testo vuoto o fatto solo di spazi e caratteri di controllo: scartati (13 su 13)', r.lines.length === 0 && r.refused === 13, r);
  r = await applica([CT('FRA', 'GBR', 'accordo', 3, 'accettato', '<b>Ciao</b>\n\n  mondo\u0007 \t fine'), CT('URSS', 'FRG', 'accordo', 3, 'accettato', 'y'.repeat(1000))]);
  const testoPulito = (/«([\s\S]*)»$/.exec(r.lines[0] || '') || [0, ''])[1];
  check('il testo si pulisce: via < >, a capo e caratteri di controllo, spazi ripetuti', r.lines.length === 2 && !/[<>\u0000-\u001f]/.test(testoPulito) && !/ {2}/.test(testoPulito) && /Ciao/.test(testoPulito) && /mondo fine/.test(testoPulito), r.lines[0]);
  check('…e si ferma a 300 caratteri', r.lines[1] === riga('URSS', 'FRG', 'accordo', 3, 'accettato', 'y'.repeat(300)), r.lines[1].length);

  await restart(PL);
  r = await applica([CT('FRA', 'GBR', 'accordo', 3, 'accettato', 'a'), CT('GBR', 'FRA', 'richiesta', 3, 'rifiutato', 'b'), CT('fra', 'gbr', 'ultimatum', 5, 'rifiutato', 'c')]);
  check('al massimo un contatto per coppia, in qualunque verso: il primo (Francia → Regno Unito) è accettato, gli altri due scartati', uguali(r.lines, [riga('FRA', 'GBR', 'accordo', 3, 'accettato', 'a')]) && r.refused === 2 && (await relOf('FRA', 'GBR')) === bFG + 12, r);
  await restart(PL);
  r = await applica([CT('FRA', 'GBR', 'dichiarazione', 3, 'accettato', 'tipo sconosciuto'), CT('FRA', 'GBR', 'accordo', 3, 'accettato', 'questo vale')]);
  check('un contatto non valido non occupa la coppia: il valido che segue è accettato', r.lines.length === 1 && r.refused === 1 && /questo vale/.test(r.lines[0]), r);

  await restart(PL);
  const V = [CT('FRA', 'GBR', 'accordo', 3, 'accettato', 'uno'), CT('URSS', 'FRG', 'accordo', 3, 'accettato', 'due'), CT('POL', 'TCH', 'accordo', 3, 'accettato', 'tre'), CT('AUT', 'CHE', 'accordo', 3, 'accettato', 'quattro')];
  r = await applica(V.concat([CT('ESP', 'PRT', 'accordo', 3, 'accettato', 'cinque')]));
  check('al massimo 3 contatti in tutto: arrivano i primi tre (Francia–Regno Unito, Unione Sovietica–Germania Ovest, Polonia–Cecoslovacchia); il quarto e il quinto sono scartati (2)', r.lines.length === 3 && r.refused === 2 && /uno/.test(r.lines[0]) && /due/.test(r.lines[1]) && /tre/.test(r.lines[2]), r);
  check('…e le relazioni delle due coppie scartate non si sono mosse', (await relOf('AUT', 'CHE')) === base('AUT', 'CHE') && (await relOf('ESP', 'PRT')) === base('ESP', 'PRT'), [await relOf('AUT', 'CHE'), await relOf('ESP', 'PRT')]);
  await restart(PL);
  r = await applica([null, 'x', CT('ZZZ', 'GBR', 'accordo', 3, 'accettato', 'a'), V[0], V[1], V[2], V[3]]);
  check('le voci non valide non contano nel massimo di 3: scartate 4 (due non valide, lo Stato che non c\'è e la quarta valida), arrivano le tre valide', r.lines.length === 3 && r.refused === 4 && /uno/.test(r.lines[0]) && /tre/.test(r.lines[2]), r);
  await restart(PL);
  r = await applica(['a', 'b', 'c', 'd'].map((t, i) => CT(...[['FRA', 'GBR'], ['URSS', 'FRG'], ['POL', 'TCH'], ['AUT', 'CHE']][i], 'ultimatum', 3, 'accettato', t)));
  check('anche i contatti che non cambiano nulla (ultimatum accettati) contano nel massimo di 3: il quarto è scartato, e nessuna relazione si muove', r.lines.length === 3 && r.events.length === 0 && r.refused === 1 && JSON.stringify(await rels()) === '{}', r);
  await restart(PL);
  r = await applica(Array.from({ length: 25 }, (_, i) => CT(coppia(i)[0], coppia(i)[1], 'accordo', 3, 'accettato', 'x' + i)));
  check('25 voci tutte valide: ne arrivano 3, le altre 22 sono scartate (si leggono al massimo 20; le oltre 20 si contano soltanto)', r.lines.length === 3 && r.refused === 22, [r.lines.length, r.refused]);
  await restart(PL);
  const nonLista = [];
  for (const v of [undefined, null, {}, 'FRA', 5, true, { da: 'FRA', a: 'GBR', tipo: 'accordo', peso: 3, esito: 'accettato', testo: 'un oggetto solo' }]) nonLista.push(await ev(v => { try { const x = window.__t.applyContacts(v); return [x.lines.length, x.events.length, x.refused]; } catch (e) { return [-1, -1, String(e)]; } }, v === undefined ? undefined : v));
  check('se «contatti» non è una lista (manca, null, un oggetto, un testo, un numero, vero; nemmeno un contatto solo, fuori dalla lista): nessun contatto, nulla da scartare, nessuna relazione mossa', nonLista.every(x => x[0] === 0 && x[1] === 0 && x[2] === 0) && JSON.stringify(await rels()) === '{}', nonLista);
  await restart(PL);
  await applica([V[0], V[1], V[2]]);
  check('i contatti fra altri Stati non cambiano le relazioni del giocatore con nessuno di loro (Francia, Regno Unito, Unione Sovietica, Germania Ovest, Polonia, Cecoslovacchia)',
    (await Promise.all(['FRA', 'GBR', 'URSS', 'FRG', 'POL', 'TCH'].map(c => relOf(PL, c)))).every((v, i) => v === base(PL, ['FRA', 'GBR', 'URSS', 'FRG', 'POL', 'TCH'][i])));
  const lc = await ev(() => { const T = window.__t; return [T.contactLines({ lines: ['a', 'b'], refused: 0 }), T.contactLines({ lines: [], refused: 2 }), T.contactLines({ lines: ['a'], refused: 1 }), T.contactLines({ lines: [], refused: 0 })]; });
  check('le righe per la cronaca: solo i contatti; solo l\'avviso «Contatti scartati: N (…)»; i contatti e poi l\'avviso; niente se non c\'è nulla', uguali(lc, [['a', 'b'], [AVVISO_SCARTI(2)], ['a', AVVISO_SCARTI(1)], []]), lc);

  // =============================================================== 3. quanto pesa un contatto
  console.log('— l\'effetto di un contatto: tipo × esito × peso, controllato con la tavola scritta qui');
  await restart(PL);
  const casi = []; let k = 0;
  for (const tipo of TIPI) for (const esito of ESITI) for (let peso = 1; peso <= 5; peso++) { casi.push({ tipo, esito, peso, a: altri[k], b: altri[k + 1] }); k++; }
  const mat = await ev(cs => {
    const T = window.__t, out = { dopo: [], inverso: [], events: [], lines: [], refused: 0 };
    for (const c of cs) {
      const x = T.applyContacts([{ da: c.a, a: c.b, tipo: c.tipo, peso: c.peso, esito: c.esito, testo: 'prova' }]);
      out.dopo.push(T.relGet(c.a, c.b)); out.inverso.push(T.relGet(c.b, c.a));
      out.events.push(...x.events); out.lines.push(...x.lines); out.refused += x.refused;
    }
    return out;
  }, casi);
  const attesi = casi.map(c => limita(base(c.a, c.b) + effetto(c.tipo, c.esito, c.peso)));
  const sbagliati = casi.map((c, i) => [c, mat.dopo[i], attesi[i]]).filter(([, x, y]) => x !== y);
  check('tutte le 60 combinazioni (4 tipi × 3 esiti × 5 pesi) danno il valore atteso: valore di partenza della coppia + (tipo e esito) × peso, fra −100 e +100', sbagliati.length === 0 && mat.refused === 0, sbagliati.slice(0, 4));
  check('…lo stesso valore da tutti e due i lati (la relazione fra due Stati è una sola)', mat.dopo.every((v, i) => v === mat.inverso[i]));
  const conEffetto = casi.filter(c => effetto(c.tipo, c.esito, c.peso) !== 0);
  check('gli eventi per le righe delle relazioni sono 55: uno per ogni contatto che cambia qualcosa (non l\'ultimatum accettato, che vale 0), con Stati e motivo «contatto: tipo (peso N): esito»', mat.events.length === 55 && conEffetto.length === 55
    && mat.events.every((e, i) => e.a === conEffetto[i].a && e.b === conEffetto[i].b && e.why === motivo(conEffetto[i].tipo, conEffetto[i].peso, conEffetto[i].esito)), mat.events.slice(0, 2));
  check('le righe per la cronaca sono 60, una per contatto, anche per l\'ultimatum accettato', mat.lines.length === 60 && casi.every((c, i) => mat.lines[i] === riga(c.a, c.b, c.tipo, c.peso, c.esito, 'prova')), mat.lines.slice(0, 2));
  const tetto = await ev(() => {
    const T = window.__t; T.relSet('FRA', 'GBR', 95); T.relSet('URSS', 'FRG', -90); T.relSet('POL', 'TCH', 40);
    const a = T.applyContacts([{ da: 'FRA', a: 'GBR', tipo: 'accordo', peso: 5, esito: 'accettato', testo: 'x' }]);
    const b = T.applyContacts([{ da: 'URSS', a: 'FRG', tipo: 'ultimatum', peso: 5, esito: 'rifiutato', testo: 'x' }]);
    const c = T.applyContacts([{ da: 'POL', a: 'TCH', tipo: 'ultimatum', peso: 5, esito: 'accettato', testo: 'x' }]);
    return { v: [T.relGet('FRA', 'GBR'), T.relGet('URSS', 'FRG'), T.relGet('POL', 'TCH')], eventi: [a.events.length, b.events.length, c.events.length], righe: [a.lines.length, b.lines.length, c.lines.length] };
  });
  check('le relazioni non escono dalla scala: +95 con un accordo accettato di peso 5 (+20) resta +100, −90 con un ultimatum rifiutato di peso 5 (−25) resta −100', tetto.v[0] === 100 && tetto.v[1] === -100, tetto.v);
  check('un ultimatum accettato non cambia nulla (+40 resta +40) e non dà un evento per le righe delle relazioni, ma la riga della cronaca c\'è', tetto.v[2] === 40 && uguali(tetto.eventi, [1, 1, 0]) && uguali(tetto.righe, [1, 1, 1]), tetto);

  // =============================================================== 4. nel turno
  console.log('— i contatti nel turno: effetti, cronaca, righe delle relazioni');
  await restart(PL);
  const bUF = base('URSS', 'FRG'), vU = limita(bUF - 25);
  const righeRel = [{ gap: 16, testo: `${NOME.FRA} – ${NOME.GBR}: ${segno(bFG)} → ${segno(bFG + 16)} (${banda(bFG + 16)}) — ${motivo('accordo', 4, 'accettato')}` },
    { gap: Math.abs(vU - bUF), testo: `${NOME.URSS} – ${NOME.FRG}: ${segno(bUF)} → ${segno(vU)} (${banda(vU)}) — ${motivo('ultimatum', 5, 'rifiutato')}` }];
  righeRel.sort((m, n) => n.gap - m.gap);
  await turn({ contatti: [CT('FRA', 'GBR', 'accordo', 4, 'accettato', 'Firmano un patto di amicizia.'), CT('URSS', 'FRG', 'ultimatum', 5, 'rifiutato', 'Intimano il ritiro delle truppe.')] });
  check('un turno con due contatti: la cronaca ha la voce del turno, quella dei contatti e quella delle relazioni, in questo ordine', (await kinds()) === 't,c,r', await kinds());
  check('la voce dei contatti ha una riga per contatto, nell\'ordine del motore', uguali(await logLines('c'), [[riga('FRA', 'GBR', 'accordo', 4, 'accettato', 'Firmano un patto di amicizia.'), riga('URSS', 'FRG', 'ultimatum', 5, 'rifiutato', 'Intimano il ritiro delle truppe.')]]), await logLines('c'));
  check('le relazioni delle due coppie sono cambiate come dice la tavola (Francia–Regno Unito +16; Unione Sovietica–Germania Ovest −25) e non si è mossa nessun\'altra coppia', stessi(await rels(), { [chiave('FRA', 'GBR')]: bFG + 16, [chiave('URSS', 'FRG')]: vU }), await rels());
  check('le righe delle relazioni nominano le due coppie, nell\'ordine del contatto, dalla più mossa alla meno mossa, col motivo «contatto: …»', uguali(await logLines('r'), [righeRel.map(x => x.testo)]), [await logLines('r'), righeRel.map(x => x.testo)]);
  const voce = await ev(() => {
    const c = document.querySelector('#log .entry-contact'), rr = document.querySelector('#log .entry-rel');
    return { n: document.querySelectorAll('#log .entry-contact').length, testo: c ? c.innerText.replace(/\s+/g, ' ').trim() : '', prima: !!(c && rr && (c.compareDocumentPosition(rr) & Node.DOCUMENT_POSITION_FOLLOWING)) };
  });
  check('nella cronaca la voce si vede, con il simbolo, il titolo «Contatti fra le altre nazioni» e le due righe; sta prima di quella delle relazioni', voce.n === 1 && voce.prima
    && voce.testo === `📨 Contatti fra le altre nazioni ${riga('FRA', 'GBR', 'accordo', 4, 'accettato', 'Firmano un patto di amicizia.')} ${riga('URSS', 'FRG', 'ultimatum', 5, 'rifiutato', 'Intimano il ritiro delle truppe.')}`, voce);
  check('le relazioni del giocatore non si sono mosse (Francia, Regno Unito, Unione Sovietica, Germania Ovest)', (await Promise.all(['FRA', 'GBR', 'URSS', 'FRG'].map(c => relOf(PL, c)))).every((v, i) => v === base(PL, ['FRA', 'GBR', 'URSS', 'FRG'][i])));

  console.log('— senza contatti, o con contatti rovinati');
  await restart(PL);
  await turn();
  const senza1 = await kinds();
  await turn({ contatti: [] });
  const senza2 = await kinds();
  for (const v of ['FRA', {}, 5, null, true]) await turn({ contatti: v });
  check('senza il campo «contatti», con una lista vuota o con qualcosa che non è una lista (testo, oggetto, numero, null, vero): nessuna voce dei contatti nella cronaca, nessun avviso, nessuna relazione mossa',
    senza1 === 't' && senza2 === 't,t' && !(await kinds()).includes('c') && !(await kinds()).includes('r') && JSON.stringify(await rels()) === '{}', [senza1, senza2, await kinds()]);
  await restart(PL);
  await turn({ contatti: [CT('ZZZ', 'GBR', 'accordo', 3, 'accettato', 'a'), CT('FRA', 'GBR', 'accordo', 3, 'accettato', 'Valido.'), null, CT('FRA', 'URSS', 'accordo', 3, 'boh', 'esito non valido')] });
  check('con tre contatti non validi su quattro (Stato che non c\'è, voce vuota, esito che non si legge) arriva solo il valido, e la cronaca scrive la sua riga e poi l\'avviso «Contatti scartati: 3»',
    uguali(await logLines('c'), [[riga('FRA', 'GBR', 'accordo', 3, 'accettato', 'Valido.'), AVVISO_SCARTI(3)]]) && stessi(await rels(), { [chiave('FRA', 'GBR')]: bFG + 12 }), await logLines('c'));
  await restart(PL);
  await turn({ contatti: [CT('ZZZ', 'GBR', 'accordo', 3, 'accettato', 'a')] });
  check('se i contatti del turno sono tutti non validi la cronaca ha solo l\'avviso «Contatti scartati: 1»; nessuna relazione si muove e non c\'è una voce delle relazioni', uguali(await logLines('c'), [[AVVISO_SCARTI(1)]]) && JSON.stringify(await rels()) === '{}' && (await kinds()) === 't,c', [await logLines('c'), await kinds()]);

  console.log('— l\'ordine degli effetti nel turno');
  await restart(PL);
  const prov = await ev(() => window.__t.getCountryProvinces('GBR')[0]);
  await ev(() => window.__t.relSet('FRA', 'GBR', 90));
  await salto('1 settimana');
  await turn({ contatti: [CT('FRA', 'GBR', 'accordo', 5, 'accettato', 'Firmano un patto.')], relazioni: [{ nazione_a: 'FRA', nazione_b: 'GBR', variazione: -30, motivo: 'Crisi di governo' }], cambi_territoriali: [{ provincia: prov, nuovo_proprietario: 'FRA' }] });
  const passo = (v, d) => limita(v + d);
  const ordineGiusto = passo(passo(passo(90, effetto('accordo', 'accettato', 5)), -30), -10);       // prima il contatto (+20, si ferma a +100), poi «relazioni» (−30), poi il territorio (−10)
  const ordiniSbagliati = [passo(passo(passo(90, -30), 20), -10), passo(passo(passo(90, -30), -10), 20), passo(passo(passo(90, -10), 20), -30), passo(passo(passo(90, -10), -30), 20)];
  check('per essere una prova dell\'ordine, ogni altro ordine (relazioni prima del contatto; contatto dopo il territorio; territorio prima di tutto) darebbe un altro valore finale', ordineGiusto === 60 && ordiniSbagliati.every(v => v === 70), [ordineGiusto, ordiniSbagliati]);
  check('un contatto, una variazione del motore e un cambio di territorio sulla stessa coppia: prima il contatto (+20, da 90 a 100 al massimo), poi «relazioni» (−30), poi il territorio (−10) = +60', (await relOf('FRA', 'GBR')) === 60, await relOf('FRA', 'GBR'));
  check('…la cronaca ha il cambio sulla mappa, i contatti e le relazioni, in questo ordine', (await kinds()) === 't,g,c,r', await kinds());
  check('…e una sola riga delle relazioni per la coppia, che parte da +90 e ha i tre motivi (prima il territorio, poi il contatto, poi quello del motore)',
    uguali(await logLines('r'), [[`${NOME.GBR} – ${NOME.FRA}: +90 → +60 (Strette) — cambio di sovranità (1 territorio); ${motivo('accordo', 5, 'accettato')}; Crisi di governo`]]), await logLines('r'));
  await salto('1 mese');

  console.log('— contatti e messaggi nello stesso turno; la richiesta del turno dopo');
  await restart(PL);
  await turn({ messaggi: [{ da: 'FRA', tipo: 'accordo', peso: 4, testo: 'Proponiamo un patto.' }], contatti: [CT('FRA', 'GBR', 'accordo', 4, 'accettato', 'Firmano un patto di amicizia.')] });
  check('nello stesso turno arrivano un messaggio al giocatore e un contatto fra altri due Stati: tutti e due ci sono, nella posta e nella cronaca (turno, contatti, relazioni, messaggi)', (await inbox()).length === 1 && (await inbox())[0].from === 'FRA' && (await kinds()) === 't,c,r,m', [await inbox(), await kinds()]);
  await turn();
  const p2 = await lastPrompt();
  const mossa = `Francia (FRA) – Regno Unito (GBR): +${bFG + 16} (di partenza +${bFG})`;
  check('al turno dopo la richiesta al motore dice che la coppia si è mossa (Francia–Regno Unito, valore attuale e di partenza), come per ogni altra coppia', p2.includes('Altre coppie cambiate rispetto alla partenza (valore attuale): ') && p2.includes(mossa), p2.slice(p2.indexOf('Altre coppie') - 5, p2.indexOf('Altre coppie') + 300));

  // =============================================================== 5. salvataggio e caricamento
  console.log('— salvataggio, caricamento e documenti rotti messi apposta');
  await restart(PL);
  await turn({ contatti: [CT('FRA', 'GBR', 'accordo', 4, 'accettato', 'Firmano un patto di amicizia.'), CT('URSS', 'FRG', 'ultimatum', 5, 'rifiutato', 'Intimano il ritiro delle truppe.')] });
  const s1 = await ev(() => JSON.parse(JSON.stringify(window.__t.buildSavePayload())));
  const logC = await logLines('c');
  check('il salvataggio ha la voce dei contatti della cronaca (k «c») con le sue righe, e le relazioni cambiate dai contatti', s1.game.log.some(e => e.k === 'c' && uguali(e.lines, logC[0])) && stessi(s1.game.relations, { [chiave('FRA', 'GBR')]: bFG + 16, [chiave('URSS', 'FRG')]: vU }), s1.game);
  const ripristino = await ev(s1 => { const T = window.__t; T.resetGame(); const ok = T.applySave(JSON.parse(JSON.stringify(s1)));
    return { ok, kinds: T.getState().log.map(e => e.k).join(), c: T.getState().log.filter(e => e.k === 'c').map(e => e.lines), rel: JSON.parse(JSON.stringify(T.getState().rel)),
      dom: document.querySelectorAll('#log .entry-contact').length }; }, s1);
  check('caricato il salvataggio tutto torna com\'era: la voce dei contatti con le stesse righe (e disegnata nella cronaca), le relazioni, l\'ordine delle voci', ripristino.ok !== false && uguali(ripristino.c, logC) && ripristino.kinds === 't,c,r' && ripristino.dom === 1
    && stessi(ripristino.rel, s1.game.relations), ripristino);
  const carica = patch => ev(patch => { const T = window.__t, d = JSON.parse(JSON.stringify(T.buildSavePayload())); d.game.log = d.game.log.filter(e => e.k !== 'c').concat(patch); T.applySave(d);
    return { kinds: T.getState().log.map(e => e.k).join(), c: JSON.parse(JSON.stringify(T.getState().log.filter(e => e.k === 'c'))), html: (document.querySelector('#log .entry-contact') || { innerHTML: '' }).innerHTML,
      img: !!document.querySelector('#log .entry-contact img'), pwn: window.__pwn === 1 }; }, patch);
  let c = await carica([{ k: 'c', lines: ['<img src=x onerror="window.__pwn=1">', '', 7, 'ok'] }]);
  check('le righe di una voce «c» si caricano (le righe vuote no, un numero diventa testo) e il testo resta testo: niente elemento img e nessun codice eseguito', c.c.length === 1 && uguali((c.c[0] || {}).lines, ['<img src=x onerror="window.__pwn=1">', '7', 'ok']) && !c.img && !c.pwn && c.html.includes('&lt;img'), c);
  c = await carica([{ k: 'c', lines: Array.from({ length: 100 }, (_, i) => 'riga ' + i) }]);
  check('una voce «c» con più di 60 righe: ne restano 60 (le prime)', c.c.length === 1 && !!c.c[0].lines && c.c[0].lines.length === 60 && c.c[0].lines[59] === 'riga 59', c.c.map(e => (e.lines || []).length));
  c = await carica([{ k: 'c' }, { k: 'c', lines: [] }, { k: 'c', lines: 'testo' }, { k: 'c', lines: ['', '   '] }, { k: 'c', text: 'una riga che non è una lista' }]);
  check('voci «c» senza righe (manca, lista vuota, non una lista, solo righe vuote, solo «text»): non entrano nella cronaca', c.c.length === 0 && !c.kinds.includes('c'), c);
  const vecchio = await ev(() => { const T = window.__t, d = JSON.parse(JSON.stringify(T.buildSavePayload())); d.game.log = d.game.log.filter(e => e.k !== 'c'); const ok = T.applySave(d);
    return { ok, kinds: T.getState().log.map(e => e.k).join() }; });
  check('un salvataggio senza voci dei contatti (di prima della versione 35) si carica: la cronaca ha solo il resto', vecchio.ok !== false && !vecchio.kinds.includes('c'), vecchio);
  await restart(PL);
  const nuova = await ev(() => window.__t.getState().log.map(e => e.k).join());
  check('una partita nuova riparte da una cronaca senza contatti', !nuova.includes('c'), nuova);

  // =============================================================== 6. il testo per il motore
  console.log('— la richiesta al motore: regole e campo, solo con la mappa');
  const reg = await ev(() => { const T = window.__t; return { rules: T.contactsRules(), mappa: T.turnPrompt([], '1 mese', true), libera: T.turnPrompt([], '1 mese', false) }; });
  const REGOLE = 'Contatti fra altre nazioni: da 0 a 3 contatti diplomatici fra due Stati diversi che non siano il giocatore (con lui usa "messaggi") in "contatti", come {"da":"CODICE","a":"CODICE","tipo":"colloquio" | "accordo" | "richiesta" | "ultimatum","peso":intero da 1 a 5,"esito":"accettato" | "rifiutato" | "ignorato","testo":"cosa succede, una frase"}. '
    + 'Tipi e pesi come per i messaggi; l\'esito lo decidi tu secondo interessi, alleanze e relazioni (non tutto va a buon fine, specie fra Stati ostili). '
    + 'Il gioco applica da solo l\'effetto sulla coppia: non ripeterlo in "relazioni". Al massimo un contatto per coppia. Se non ce ne sono, "contatti" è un array vuoto.\n';
  const SCHEMA = '"contatti": [{"da": "CODICE", "a": "CODICE", "tipo": "colloquio, accordo, richiesta o ultimatum", "peso": numero intero da 1 a 5, "esito": "accettato, rifiutato o ignorato", "testo": "cosa succede, una frase"}], ';
  check('le regole dicono: da 0 a 3 contatti fra due Stati che non siano il giocatore (con lui «messaggi»), i campi, i tipi e i pesi come i messaggi, l\'esito scelto dal motore, l\'effetto applicato dal gioco (non va ripetuto in «relazioni»), un contatto per coppia, altrimenti lista vuota', reg.rules === REGOLE, reg.rules);
  check('con la mappa la richiesta ha le regole e il campo «contatti» nel modello della risposta', reg.mappa.includes(REGOLE) && reg.mappa.includes(SCHEMA), reg.mappa.length);
  check('le regole stanno dopo quelle dei messaggi e prima dei segnaposto; il campo sta dopo «messaggi» e prima di «segnaposto»',
    reg.mappa.indexOf('Messaggi: alla fine del periodo') < reg.mappa.indexOf(REGOLE) && reg.mappa.indexOf(REGOLE) < reg.mappa.indexOf('Segnaposto sulla mappa. Tipi ammessi')
    && reg.mappa.indexOf('"messaggi": [') < reg.mappa.indexOf('"contatti": [') && reg.mappa.indexOf('"contatti": [') < reg.mappa.lastIndexOf('"segnaposto"'), [reg.mappa.indexOf(REGOLE), reg.mappa.indexOf('"contatti": ['), reg.mappa.lastIndexOf('"segnaposto"')]);
  check('senza la mappa (partita libera) la richiesta non ha né le regole né il campo, e non parla di contatti', !reg.libera.includes('Contatti fra altre nazioni') && !reg.libera.includes('"contatti"') && !/contatti/i.test(reg.libera), reg.libera.length);
  check('il testo delle regole resta corto: meno di 800 caratteri (il campo intero, con lo schema, ne aggiunge circa 900 alla richiesta)', reg.rules.length < 800 && reg.rules.length + SCHEMA.length < 1000, [reg.rules.length, SCHEMA.length]);

  console.log('— partita libera: il campo non c\'è e, se arriva, si ignora');
  await ev(() => { window.__queue.length = 0; window.__textQueue.length = 0; window.__t.resetGame(); });
  await page.fill('#nation', 'Impero Romano'); await page.fill('#startYear', '400 d.C.');
  await page.click('#startBtn');                                   // «Inizia» apre la partita libera; la richiesta al motore parte al primo «Avanza»
  await turn({ nuovo_anno: '401', contatti: [CT('FRA', 'GBR', 'accordo', 4, 'accettato', 'Non deve comparire.')] });
  const lib = await ev(() => ({ mode: window.__t.getGameMode(), kinds: window.__t.getState().log.map(e => e.k).join(), c: document.querySelectorAll('#log .entry-contact').length, rel: JSON.stringify(window.__t.getState().rel),
    p: String(window.__prompts[window.__prompts.length - 1]) }));
  check('partita libera: il primo turno è davvero partito (la richiesta nomina «Impero Romano», la cronaca ha il turno)', lib.mode === 'free' && lib.p.includes('Impero Romano') && lib.kinds === 't', lib);
  check('…la richiesta non ha le regole dei contatti né il campo; la risposta ne portava uno, ed è ignorato: nessuna voce dei contatti nella cronaca, nessuna relazione', !lib.p.includes('"contatti"') && !lib.p.includes('Contatti fra altre nazioni') && lib.c === 0 && !lib.kinds.includes('c') && lib.rel === '{}', lib);

  // =============================================================== 7. aspetto
  console.log('— aspetto: contrasto, bordo, schermo stretto');
  await restart(PL);
  await turn({ contatti: [CT('FRA', 'GBR', 'accordo', 4, 'accettato', 'Firmano un patto di amicizia.')] });
  const contrasto = scheme => ev(() => {
    const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
    const lum = ({ r, g, b }) => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const fondo = n => { for (let e = n; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.99) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
    const rap = n => { const t = parse(getComputedStyle(n).color), s = fondo(n), a = lum(t), b = lum(s); return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100; };
    const e = document.querySelector('#log .entry-contact'); return e ? [rap(e), rap(e.querySelector('b'))] : null;
  }, scheme);
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme });
    const cr = await contrasto(scheme);
    check('contrasto del testo e del titolo della voce dei contatti nel tema ' + (scheme === 'light' ? 'chiaro' : 'scuro') + ': almeno 4,5 a 1', !!cr && cr.every(v => v >= 4.5), cr);
  }
  await page.emulateMedia({ colorScheme: 'light' });
  const stile = await ev(() => { const e = document.querySelector('#log .entry-contact'); if (!e) return { assente: true }; const s = getComputedStyle(e); return { bordo: s.borderLeftStyle, larghezza: s.borderLeftWidth, font: s.fontSize }; });
  check('la voce ha un bordo a sinistra a puntini (i messaggi del giocatore l\'hanno a trattini) e la stessa dimensione del testo delle altre voci piccole (0,88 rem = 14,08 px)', stile.bordo === 'dotted' && stile.larghezza === '3px' && stile.font === '14.08px', stile);
  await restart(PL);
  await turn({ contatti: [CT('FRA', 'GBR', 'accordo', 4, 'accettato', 'x'.repeat(300))] });
  await page.setViewportSize({ width: 360, height: 800 });
  const stretto = await ev(() => { const l = document.getElementById('log'), e = document.querySelector('#log .entry-contact') || { scrollWidth: -1, clientWidth: -2 }; return { logScroll: l.scrollWidth, logClient: l.clientWidth, entryScroll: e.scrollWidth, entryClient: e.clientWidth, pagina: document.documentElement.scrollWidth, finestra: window.innerWidth }; });
  check('con lo schermo stretto (360 pixel) e una riga di 300 caratteri senza spazi la voce non esce dal riquadro della cronaca e la pagina non scorre di lato', stretto.entryScroll >= 0 && stretto.entryScroll <= stretto.entryClient && stretto.logScroll <= stretto.logClient && stretto.pagina <= stretto.finestra, stretto);
  await page.setViewportSize({ width: 640, height: 1100 });

  check('nessun errore della pagina in tutta la prova', errors.length === 0, errors);
  await browser.close();
  process.exit(summary() ? 1 : 0);
})();
