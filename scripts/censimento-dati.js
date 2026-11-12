#!/usr/bin/env node
// Censimento dei dati che la pagina porta con sé oltre alla popolazione (issue #3).
//
// Legge src/storia-alternativa-prototipo.html (senza aprirla in un browser) e scrive le tabelle «generate» di
// docs/DATI-INCORPORATI.md, ognuna fra due marcatori
//     <!-- CENSIMENTO nome INIZIO (…) -->   …   <!-- CENSIMENTO nome FINE -->
// Così i numeri e gli elenchi del documento non possono restare indietro rispetto alla pagina: il resto del documento (le
// spiegazioni) è scritto a mano.
//
//   node scripts/censimento-dati.js           aggiorna le tabelle nel documento
//   node scripts/censimento-dati.js --check   non scrive: esce con errore se le tabelle del documento sono diverse da quelle della pagina
//
// Si lancia ogni volta che si cambiano il file degli Stati (src/data/states_1960.json: Stati, capitali, alleanze, verifica) o, nella pagina,
// unità regionali, valutazioni o note (npm run censimento). Se ci si dimentica, tests/dati-incorporati.test.js si ferma e lo dice.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const radice = path.join(__dirname, '..');
// I due file si possono cambiare con CENSIMENTO_PAGINA e CENSIMENTO_DOC: serve solo alle prove, per provare lo strumento su copie
// temporanee senza toccare la pagina e il documento veri.
const FILE_PAGINA = process.env.CENSIMENTO_PAGINA || path.join(radice, 'src', 'storia-alternativa-prototipo.html');
const FILE_DOC = process.env.CENSIMENTO_DOC || path.join(radice, 'docs', 'DATI-INCORPORATI.md');

const INIZIO = nome => `<!-- CENSIMENTO ${nome} INIZIO (generato da scripts/censimento-dati.js: non modificare a mano, si aggiorna con «npm run censimento») -->`;
const FINE = nome => `<!-- CENSIMENTO ${nome} FINE -->`;

// ---- Lettura della pagina ------------------------------------------------------------------------------------------------------

// Il testo del letterale (un oggetto { … } o una lista [ … ]) che comincia subito dopo «marca», per esempio «const ADJ = ».
function letterale(src, marca) {
  const a = src.indexOf(marca);
  if (a < 0) throw new Error(`nella pagina manca «${marca}»`);
  if (src.indexOf(marca, a + 1) >= 0) throw new Error(`nella pagina «${marca}» compare più di una volta`);
  const i = a + marca.length, apre = src[i];
  const chiude = apre === '{' ? '}' : apre === '[' ? ']' : null;
  if (!chiude) throw new Error(`dopo «${marca}» non c'è né «{» né «[»`);
  let profondita = 0, virgolette = null, esc = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (virgolette) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === virgolette) virgolette = null; continue; }
    if (c === '"' || c === "'" || c === '`') { virgolette = c; continue; }
    if (c === apre) profondita++;
    else if (c === chiude && --profondita === 0) return src.slice(i, j + 1);
  }
  throw new Error(`il letterale dopo «${marca}» non finisce`);
}
// Valuta un letterale scritto nel codice della pagina (è codice del progetto, già eseguito dalle prove; il limite di tempo evita solo i cicli).
const valuta = (testo, contesto) => vm.runInNewContext('(' + testo + ')', contesto || {}, { timeout: 2000 });

// Gli Stati: dalla versione 30 non sono più un elenco scritto nel codice, ma la copia del file src/data/states_1960.json che la pagina porta
// con sé in un blocco <script type="application/json" id="states-1960-data">. Restituisce un oggetto «identificativo → record del file»
// (nome, capitale, alleanza, colore, giocabilità, e per capitale e alleanza se sono verificate), nell'ordine del file.
function leggiStati(src) {
  // L'apertura è cercata a inizio riga: nel codice della pagina un commento nomina lo stesso blocco, ma non a inizio riga.
  const apertura = '\n<script type="application/json" id="states-1960-data">\n';
  const a = src.indexOf(apertura);
  if (a < 0) throw new Error('nella pagina manca il blocco dei dati degli Stati («states-1960-data»)');
  if (src.indexOf(apertura, a + 1) >= 0) throw new Error('nella pagina il blocco dei dati degli Stati compare più di una volta');
  const b = src.indexOf('</script>', a);
  if (b < 0) throw new Error('nella pagina il blocco dei dati degli Stati non finisce');
  let blocco;
  try { blocco = JSON.parse(src.slice(a + apertura.length, b)); }
  catch (e) { throw new Error('nella pagina il blocco dei dati degli Stati non è un JSON valido: ' + e.message); }
  if (!blocco || !Array.isArray(blocco.states)) throw new Error('nel blocco dei dati degli Stati manca l\'elenco «states»');
  const stati = {};
  for (const r of blocco.states) stati[r.id] = r;
  return stati;
}

function leggiPagina(src) {
  const prendi = (marca, contesto) => {
    try { return valuta(letterale(src, marca), contesto); }
    catch (e) { throw new Error(e.message.startsWith('nella pagina') || e.message.startsWith('dopo') || e.message.startsWith('il letterale') ? e.message : `«${marca}»: ${e.message}`); }
  };
  const stati = leggiStati(src);
  // Come la pagina costruisce le province degli Stati senza suddivisioni (la sua funzione mkMain): la capitale è quella dello Stato.
  const mkMain = (name, owner, infrastructure, stability, strategicValue, units) =>
    ({ name, owner, capital: stati[owner] ? stati[owner].capital : null, infrastructure, stability, strategicValue, units: units || [] });
  const d = {
    stati,
    singole: prendi('let provinces = ', { mkMain }),
    unita: prendi('const REGION_UNITS = '),
    tipi: prendi('const REGION_TYPES = '),
    metodi: prendi('const REGION_METHODS = '),
    forme: prendi('const REGION_KINDS = '),
    testoForme: prendi('const SHAPE_TEXT = '),
    noteTerritorio: prendi('const TERRITORY_NOTES = '),
    noteUnita: prendi('const UNIT_NOTES = '),
    noteStati: prendi('const COUNTRY_NOTES = '),
    noteSingoli: prendi('const SINGLE_NOTES = '),
    ordine: prendi('const PROV_ORDER = '),
    adiacenze: prendi('const ADJ = '),
    legacy: prendi('const LEGACY = '),
  };
  // Le divisioni del Pakistan si assegnano alle due ali con la regola della pagina (posizione nell'elenco del file: fino alla 14 ovest, dopo est).
  d.ali = { ovest: d.unita.filter(u => u[2] === 'PAK' && u[5] <= 14).length, est: d.unita.filter(u => u[2] === 'PAK' && u[5] > 14).length };
  return d;
}

// ---- Piccoli aiuti per scrivere le tabelle -------------------------------------------------------------------------------------

const it = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const cella = t => String(t == null ? '' : t).replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const riga = celle => '| ' + celle.map(cella).join(' | ') + ' |';
const tabella = (intestazione, righe) => [riga(intestazione), riga(intestazione.map(() => '---')).replace(/ --- /g, '---'), ...righe.map(riga)].join('\n');
const senzaAccenti = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const perNome = (a, b) => (senzaAccenti(a) < senzaAccenti(b) ? -1 : senzaAccenti(a) > senzaAccenti(b) ? 1 : 0);
const daVerificare = t => /da verificare/i.test(String(t || ''));
const terna = r => `${r[0]}/${r[1]}/${r[2]}`;
const conta = (lista, f) => lista.reduce((o, x) => { const k = f(x); o[k] = (o[k] || 0) + 1; return o; }, {});

// Per ogni Stato: quante province ha sulla mappa e quali valutazioni provvisorie (infrastrutture/stabilità/importanza strategica).
function perStato(d) {
  const out = {};
  for (const id of Object.keys(d.stati)) out[id] = { province: 0, terne: {} };
  for (const u of d.unita) {
    const s = out[u[2]]; if (!s) continue;
    s.province++; const t = terna([u[7], u[8], u[9]]); s.terne[t] = (s.terne[t] || 0) + 1;
  }
  for (const p of Object.values(d.singole)) {
    const s = out[p.owner]; if (!s) continue;
    s.province++; const t = terna([p.infrastructure, p.stability, p.strategicValue]); s.terne[t] = (s.terne[t] || 0) + 1;
  }
  return out;
}

// ---- Le tabelle generate -------------------------------------------------------------------------------------------------------

function contatori(d) {
  const nStati = Object.keys(d.stati).length;
  const giocabili = Object.values(d.stati).filter(s => s.playable).length;
  const capVerificate = Object.values(d.stati).filter(s => s.capital_verified === true).length;
  const allVerificate = Object.values(d.stati).filter(s => s.alliance_verified === true).length;
  const nSingole = Object.keys(d.singole).length;
  const statiSuddivisi = new Set(d.unita.map(u => u[2])).size;
  const coppie = d.adiacenze.reduce((n, r) => n + r.length, 0) / 2;
  const principali = [
    ['Stati', '`states_1960.json`', nStati],
    ['Stati giocabili (`playable: true`)', '`states_1960.json`', giocabili],
    ['Capitali verificate su una fonte (`capital_verified`)', '`states_1960.json`', `${capVerificate} su ${nStati}`],
    ['Alleanze verificate su una fonte (`alliance_verified`)', '`states_1960.json`', `${allVerificate} su ${nStati}`],
    ['Province in tutto', '`provinces`', nSingole + d.unita.length],
    ['Province di Stati senza suddivisioni', '`provinces` (`mkMain`)', nSingole],
    ['Unità regionali', '`REGION_UNITS`', d.unita.length],
    ['Stati suddivisi in unità regionali', '`REGION_UNITS`', statiSuddivisi],
    ['Tipi di unità (provincia, distretto, Land…)', '`REGION_TYPES`', d.tipi.length],
    ['Modi in cui è stato trovato il punto di un\'unità', '`REGION_METHODS`', d.metodi.length],
    ['Stati con una nota sull\'estensione', '`TERRITORY_NOTES`', Object.keys(d.noteTerritorio).length],
    ['Unità con una nota', '`UNIT_NOTES`', Object.keys(d.noteUnita).length],
    ['Stati suddivisi con le note dei file', '`COUNTRY_NOTES`', Object.keys(d.noteStati).length],
    ['Stati non suddivisi con la spiegazione del perché', '`SINGLE_NOTES`', Object.keys(d.noteSingoli).length],
    ['Province con l\'elenco dei vicini', '`PROV_ORDER`', d.ordine.length],
    ['Coppie di province confinanti', '`ADJ`', coppie],
    ['Vecchi identificativi di province (salvataggi precedenti)', '`LEGACY`', Object.keys(d.legacy).length],
    ['Divisioni del Pakistan: ala occidentale / ala orientale', '`WING_UNITS`', `${d.ali.ovest} / ${d.ali.est}`],
  ].map(r => [r[0], r[1], typeof r[2] === 'number' ? it(r[2]) : r[2]]);   // i numeri grandi con il punto delle migliaia, come nei documenti
  const forme = conta(d.unita, u => d.forme[u[6]]);
  const metodi = conta(d.unita, u => d.metodi[u[4]]);
  return [
    tabella(['Che cosa', 'Nome nel codice', 'Quanti'], principali),
    '',
    'Forma sulla mappa delle unità regionali (`REGION_KINDS`):',
    '',
    tabella(['Forma', 'Come la descrive la scheda', 'Unità'], d.forme.map(k => [`\`${k}\``, d.testoForme[k] || '—', forme[k] || 0])),
    '',
    'Come è stato trovato il punto di ogni unità regionale (`REGION_METHODS`, dichiarazione dei file dell\'autore):',
    '',
    tabella(['Metodo', 'Unità'], d.metodi.map(m => [m, metodi[m] || 0])),
  ].join('\n');
}

function alleanze(d) {
  const gruppi = {};
  for (const [id, s] of Object.entries(d.stati)) (gruppi[s.alliance] = gruppi[s.alliance] || []).push(id);
  const etichette = Object.keys(gruppi).sort((a, b) => gruppi[b].length - gruppi[a].length || perNome(a, b));
  return tabella(['Etichetta di alleanza', 'Stati', 'Quali (codici)'], etichette.map(e => [e, gruppi[e].length, gruppi[e].slice().sort().map(c => `\`${c}\``).join(', ')]));
}

function stati(d) {
  const ps = perStato(d);
  const ids = Object.keys(d.stati).sort((a, b) => perNome(d.stati[a].name, d.stati[b].name) || (a < b ? -1 : 1));
  const righe = ids.map(id => {
    const s = d.stati[id], t = Object.keys(ps[id].terne);
    const segnato = [daVerificare(s.capital) ? 'capitale' : '', daVerificare(s.alliance) ? 'alleanza' : ''].filter(Boolean).join(' e ');
    const verificate = `${s.capital_verified === true ? 'sì' : 'no'} / ${s.alliance_verified === true ? 'sì' : 'no'}`;
    return [`\`${id}\``, s.name, s.capital, s.alliance, verificate, ps[id].province, t.length === 1 ? t[0] : `più valori (${t.length})`, segnato || '—'];
  });
  return tabella(['Codice', 'Stato', 'Capitale', 'Alleanza', 'Verificate (capitale / alleanza)', 'Province', 'Valutazioni provvisorie', '«da verificare» nella pagina'], righe);
}

function valutazioni(d) {
  const ps = perStato(d);
  const tutte = new Set(), numeri = [];
  Object.values(ps).forEach(s => Object.keys(s.terne).forEach(t => { tutte.add(t); t.split('/').forEach(n => numeri.push(Number(n))); }));
  const varie = Object.keys(ps).filter(id => Object.keys(ps[id].terne).length > 1).sort();
  const righe = varie.map(id => [`\`${id}\``, d.stati[id].name, Object.entries(ps[id].terne).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([t, n]) => `${t} (${n} ${n === 1 ? 'provincia' : 'province'})`).join('; ')]);
  return [
    `Le valutazioni usano **${tutte.size}** combinazioni diverse di infrastrutture/stabilità/importanza strategica, con valori da ${Math.min(...numeri)} a ${Math.max(...numeri)} su 100. Sono uguali per tutte le province di uno Stato, tranne che in **${varie.length}** Stati:`,
    '',
    tabella(['Codice', 'Stato', 'Combinazioni (infrastrutture/stabilità/importanza)'], righe),
  ].join('\n');
}

function noteTerritori(d) {
  const nomeStato = id => (d.stati[id] ? d.stati[id].name : id);
  const nomeUnita = id => { const u = d.unita.find(x => x[0] === id); return u ? `${u[1]} (${nomeStato(u[2])})` : id; };
  const estensione = Object.entries(d.noteTerritorio).sort((a, b) => perNome(nomeStato(a[0]), nomeStato(b[0])))
    .map(([id, t]) => [`\`${id}\``, nomeStato(id), t, daVerificare(t) ? 'sì' : 'no']);
  const unita = Object.entries(d.noteUnita).flatMap(([id, lista]) => lista.map(t => [`\`${id}\``, nomeUnita(id), t, daVerificare(t) ? 'sì' : 'no']));
  const testi = {};
  Object.values(d.singole).forEach(p => p.units.forEach(t => { (testi[t] = testi[t] || []).push(p.name); }));
  const nelleProvince = Object.keys(testi).sort((a, b) => testi[b].length - testi[a].length || perNome(a, b))
    .map(t => [t, testi[t].length, testi[t].join(', '), daVerificare(t) ? 'sì' : 'no']);
  return [
    '**Note sull\'estensione degli Stati** (`TERRITORY_NOTES`, mostrate come «Estensione dello Stato» nelle note sulla suddivisione):',
    '',
    tabella(['Codice', 'Stato', 'Testo', 'Dice «da verificare»'], estensione),
    '',
    '**Note sulle singole unità** (`UNIT_NOTES`, mostrate nella riga «Unità presenti»):',
    '',
    tabella(['Codice', 'Unità', 'Testo', 'Dice «da verificare»'], unita),
    '',
    '**Note scritte nelle province degli Stati senza suddivisioni** (ultimo argomento di `mkMain`, mostrate nella riga «Unità presenti»):',
    '',
    tabella(['Testo', 'Province', 'Quali', 'Dice «da verificare»'], nelleProvince),
  ].join('\n');
}

function nonSuddivisi(d) {
  const righe = Object.entries(d.noteSingoli).map(([id, s]) => [`\`${id}\``, d.stati[id] ? d.stati[id].name : id, s.nCsv, s.nFlag, s.why])
    .sort((a, b) => perNome(a[1], b[1]));
  return tabella(['Codice', 'Stato', 'Unità nel file', 'di cui con posizione da verificare', 'Motivo scritto nella pagina'], righe);
}

const GENERATORI = { contatori, alleanze, stati, valutazioni, 'note-territori': noteTerritori, 'non-suddivisi': nonSuddivisi };

// ---- Il documento --------------------------------------------------------------------------------------------------------------

// Il documento con tutte le tabelle generate rimesse a posto; solleva un errore se manca o è doppio un marcatore, o se ne compare uno sconosciuto.
function costruisciDoc(doc, dati) {
  const trovati = [...doc.matchAll(/<!-- CENSIMENTO ([A-Za-z0-9-]+) INIZIO/g)].map(m => m[1]);
  for (const nome of trovati) if (!GENERATORI[nome]) throw new Error(`nel documento c'è un marcatore sconosciuto: «CENSIMENTO ${nome}»`);
  let out = doc;
  for (const nome of Object.keys(GENERATORI)) {
    const ini = INIZIO(nome), fin = FINE(nome);
    const a = out.indexOf(ini);
    if (a < 0) throw new Error(`nel documento manca il marcatore «${ini}»`);
    if (out.indexOf(ini, a + 1) >= 0) throw new Error(`nel documento il marcatore di inizio «CENSIMENTO ${nome}» compare più di una volta`);
    const b = out.indexOf(fin, a);
    if (b < 0) throw new Error(`nel documento manca il marcatore «${fin}»`);
    if (out.indexOf(fin, b + 1) >= 0) throw new Error(`nel documento il marcatore di fine «CENSIMENTO ${nome}» compare più di una volta`);
    out = out.slice(0, a) + ini + '\n' + GENERATORI[nome](dati).trim() + '\n' + fin + out.slice(b + fin.length);
  }
  return out;
}

function main(argomenti) {
  const soloControllo = argomenti.includes('--check');
  const dati = leggiPagina(fs.readFileSync(FILE_PAGINA, 'utf8'));
  const doc = fs.readFileSync(FILE_DOC, 'utf8');
  const nuovo = costruisciDoc(doc, dati);
  const nomeDoc = path.relative(radice, FILE_DOC).split(path.sep).join('/');
  if (soloControllo) {
    if (nuovo === doc) { console.log(`Le tabelle di ${nomeDoc} coincidono con la pagina.`); return 0; }
    console.error(`Le tabelle di ${nomeDoc} sono diverse da quelle ricavate dalla pagina.\nPer aggiornarle: node scripts/censimento-dati.js   (oppure npm run censimento)`);
    return 1;
  }
  if (nuovo === doc) { console.log('Niente da fare: le tabelle erano già aggiornate.'); return 0; }
  fs.writeFileSync(FILE_DOC, nuovo);
  console.log(`Tabelle aggiornate in ${nomeDoc}.`);
  return 0;
}

if (require.main === module) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (e) { console.error('Errore: ' + e.message); process.exitCode = 1; }
}

module.exports = { INIZIO, FINE, GENERATORI, letterale, leggiStati, leggiPagina, costruisciDoc, perStato };
