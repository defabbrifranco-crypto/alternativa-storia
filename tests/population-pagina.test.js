// Il file dei dati (src/data/population_1960.json) e la pagina (src/storia-alternativa-prototipo.html) devono dire
// la stessa cosa su popolazione e status politici (issue #8). La pagina tiene i suoi dati scritti dentro di sé
// (così funziona anche aperta da sola), quindi i due elenchi vanno confrontati: se uno cambia e l'altro no,
// questa prova si ferma e dice quale riga è diversa.
// Esegui con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'population_1960.json'), 'utf8'));
const schema = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'population_1960.schema.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'src', 'storia-alternativa-prototipo.html'), 'utf8');

const STATUS = 'status_1960_12_31';

// Legge un elenco scritto nella pagina come codice («const NOME = [ ... ];»). Le virgolette sono rispettate,
// quindi parentesi quadre dentro un testo non confondono la ricerca della fine dell'elenco.
function leggiElenco(nome) {
  const marca = `const ${nome} = [`;
  const inizio = html.indexOf(marca);
  assert.ok(inizio >= 0, `nella pagina manca «${marca}»`);
  const i = inizio + marca.length - 1;
  let profondita = 0, virgolette = null, esc = false, j = i;
  for (; j < html.length; j++) {
    const c = html[j];
    if (virgolette) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === virgolette) virgolette = null; continue; }
    if (c === '"' || c === "'" || c === '`') { virgolette = c; continue; }
    if (c === '[') profondita++;
    else if (c === ']' && --profondita === 0) { j++; break; }
  }
  return vm.runInNewContext('(' + html.slice(i, j) + ')');
}
const righeA = leggiElenco('POPULATION_1960');     // primo file: Stati europei, senza status
const righeB = leggiElenco('POPULATION_1960_B');   // secondo file: Asia e altri, con lo status
const senzaAccenti = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const chiave = (codice, n) => `${codice || 'nessuna entità sulla mappa'}|${n}`;

// Nella pagina l'ala occidentale del Pakistan ha il nome dell'ala in «entita» e lo status in «status»; nel file dei dati
// il nome dell'ala sta dentro lo status. Il confronto è comunque esatto: «Ala occidentale del Pakistan (<status della pagina>)».
const STATUS_CON_NOME_DELL_ALA = { PAK_W: s => `Ala occidentale del Pakistan (${s})` };

test('i due elenchi della pagina non sono vuoti (la prova sta guardando nel posto giusto)', () => {
  assert.ok(righeA.length >= 30, `trovate ${righeA.length} righe nel primo elenco`);
  assert.ok(righeB.length >= 40, `trovate ${righeB.length} righe nel secondo elenco`);
});

test('il file dei dati è riferito al 31 dicembre 1960 e il campo dello status porta quella data', () => {
  assert.strictEqual(data.meta.reference_date, '1960-12-31');
  for (const r of data.records) {
    assert.ok(STATUS in r, `${r.id}: manca il campo ${STATUS}`);
    assert.ok(!('status_1960_01_01' in r), `${r.id}: ha ancora il campo status_1960_01_01 (la data di riferimento è il 31 dicembre)`);
  }
  const proprieta = schema.properties.records.items.properties;
  assert.ok(STATUS in proprieta, `lo schema non descrive il campo ${STATUS}`);
  assert.ok(!('status_1960_01_01' in proprieta), 'lo schema descrive ancora status_1960_01_01');
});

test('le fonti degli status: ogni fonte citata è descritta, ogni fonte descritta è usata, uno status rivisto ne ha almeno una', () => {
  const descritte = Object.keys(data.meta.status_sources);
  assert.ok(descritte.length > 0, 'meta.status_sources è vuoto');
  const usate = new Set();
  for (const r of data.records) {
    const fonti = r.status_sources || [];
    if (r.status_origin === 'revisione') assert.ok(fonti.length > 0, `${r.id}: status rivisto senza status_sources`);
    if (fonti.length) assert.notStrictEqual(r[STATUS], null, `${r.id}: ha fonti dello status ma nessuno status`);
    for (const f of fonti) {
      assert.ok(descritte.includes(f), `${r.id}: la fonte «${f}» non è descritta in meta.status_sources`);
      usate.add(f);
    }
  }
  for (const f of descritte) assert.ok(usate.has(f), `la fonte «${f}» è descritta ma nessun record la usa`);
  for (const [id, testo] of Object.entries(data.meta.status_sources)) {
    assert.match(testo, /https:\/\/\S+/, `meta.status_sources.${id}: manca il collegamento`);
  }
});

test('gli status scritti nella pagina sono quelli del file dei dati, riga per riga', () => {
  const perChiave = new Map();
  for (const r of data.records) {
    const k = chiave(r.map_id, r.value);
    assert.ok(!perChiave.has(k), `due record con lo stesso codice e lo stesso valore: ${k}`);
    perChiave.set(k, r);
  }
  const viste = new Set();
  for (const riga of righeB) {
    const k = chiave(riga.code, riga.n);
    const r = perChiave.get(k);
    assert.ok(r, `pagina: «${riga.entita}» (${k}) non ha un record corrispondente nel file dei dati`);
    viste.add(r.id);
    const atteso = STATUS_CON_NOME_DELL_ALA[riga.code] ? STATUS_CON_NOME_DELL_ALA[riga.code](riga.status) : riga.status;
    assert.strictEqual(r[STATUS], atteso, `«${riga.entita}»: la pagina dice «${riga.status}», il file dei dati dice «${r[STATUS]}»`);
  }
  for (const r of data.records) {
    if (r[STATUS] !== null) assert.ok(viste.has(r.id), `${r.id} (${r.entity}) ha uno status nel file dei dati ma non compare nella pagina`);
  }
});

test('le popolazioni scritte nella pagina sono quelle del file dei dati (valore principale o alternativo, per Cipro)', () => {
  const perChiave = new Map(data.records.map(r => [chiave(r.map_id, r.value), r]));
  for (const riga of righeB) {
    const r = perChiave.get(chiave(riga.code, riga.n));
    assert.ok(r, `secondo elenco: «${riga.entita}» ha un valore (${riga.n}) che il file dei dati non ha`);
  }
  for (const riga of righeA) {
    const candidati = riga.code
      ? data.records.filter(r => r.map_id === riga.code)
      : data.records.filter(r => senzaAccenti(r.entity) === senzaAccenti(riga.stato));
    assert.strictEqual(candidati.length, 1, `primo elenco: «${riga.stato}» corrisponde a ${candidati.length} record del file dei dati`);
    const r = candidati[0];
    const valori = [r.value, ...r.alternative_values.map(a => a.value)];
    assert.ok(valori.includes(riga.n), `primo elenco: «${riga.stato}» vale ${riga.n} nella pagina e ${valori.join(' o ')} nel file dei dati`);
  }
});

test('docs/STATUS-1960.md riporta ogni status rivisto e ogni collegamento alle fonti degli status', () => {
  const doc = fs.readFileSync(path.join(root, 'docs', 'STATUS-1960.md'), 'utf8');
  for (const r of data.records) {
    if (r.status_origin === 'revisione') assert.ok(doc.includes(r[STATUS]), `docs/STATUS-1960.md non riporta lo status rivisto di ${r.id}: «${r[STATUS]}»`);
  }
  for (const [id, testo] of Object.entries(data.meta.status_sources)) {
    const url = testo.match(/https:\/\/\S+/)[0];
    assert.ok(doc.includes(url), `docs/STATUS-1960.md non cita la fonte ${id} (${url})`);
  }
});

test('la pagina scrive «Status al 31 dicembre 1960», non la vecchia etichetta «Status nel 1960»', () => {
  assert.ok(html.includes("'Status al 31 dicembre 1960: '"), 'manca l\'etichetta «Status al 31 dicembre 1960» nella scheda del territorio');
  assert.ok(!html.includes('Status nel 1960'), 'nella pagina resta la vecchia etichetta «Status nel 1960»');
});
