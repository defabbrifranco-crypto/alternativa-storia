// La pagina legge i dati di popolazione dal file src/data/population_1960.json (issue #8).
//
// La pagina deve funzionare anche aperta da sola, quindi porta con sé una copia IDENTICA del file, scritta da
// scripts/incorpora-popolazione.js dentro un blocco <script type="application/json"> fra due marcatori. Qui si controlla che:
//   - la copia nella pagina sia uguale al file (se si cambia il file e ci si dimentica di aggiornare la pagina, questa prova si ferma);
//   - nella pagina non resti nessun elenco di numeri scritto a mano (i vecchi blocchi POPULATION_1960 e POPULATION_1960_B);
//   - lo strumento di incorporazione funzioni davvero, anche quando la copia è sbagliata;
//   - status, fonti e documenti dicano la stessa cosa del file.
// Le prove nel browser (ogni scheda mostra il valore del file) stanno in tests/browser/t16_popolazione.js.
// Esegui con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const incorpora = require('../scripts/incorpora-popolazione.js');

const root = path.join(__dirname, '..');
const FILE_DATI = path.join(root, 'src', 'data', 'population_1960.json');
const FILE_PAGINA = path.join(root, 'src', 'storia-alternativa-prototipo.html');
const SCRIPT = path.join(root, 'scripts', 'incorpora-popolazione.js');
const testoDati = fs.readFileSync(FILE_DATI, 'utf8');
const data = JSON.parse(testoDati);
const schema = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'population_1960.schema.json'), 'utf8'));
const html = fs.readFileSync(FILE_PAGINA, 'utf8');
const STATUS = 'status_1960_12_31';

// Esegue lo strumento di incorporazione su una pagina e un file dei dati scelti (variabili INCORPORA_*).
function lanciaStrumento(pagina, dati, ...argomenti) {
  return spawnSync(process.execPath, [SCRIPT, ...argomenti], { encoding: 'utf8', env: { ...process.env, INCORPORA_PAGINA: pagina, INCORPORA_DATI: dati } });
}
function cartellaTemporanea() { return fs.mkdtempSync(path.join(os.tmpdir(), 'incorpora-')); }

// ---- la copia nella pagina ---------------------------------------------------------------------------------------

test('la pagina ha una copia dei dati fra i due marcatori, identica al file (parola per parola)', () => {
  const { da, a } = incorpora.trovaBlocco(html);
  assert.strictEqual(html.slice(da, a), incorpora.bloccoAtteso(testoDati),
    'La copia dei dati nella pagina è diversa da src/data/population_1960.json.\nPer aggiornarla: node scripts/incorpora-popolazione.js');
  const dentro = /<script type="application\/json" id="population-1960-data">([\s\S]*?)<\/script>/.exec(html.slice(da, a));
  assert.ok(dentro, 'dentro i marcatori manca il blocco <script type="application/json" id="population-1960-data">');
  assert.deepStrictEqual(JSON.parse(dentro[1]), data, 'il JSON letto dalla pagina non coincide con il file');
});

test('nella pagina c\'è un solo blocco dei dati, e il file dei dati non contiene nulla che lo chiuderebbe', () => {
  assert.strictEqual(html.split('\n<script type="application/json" id="population-1960-data">\n').length - 1, 1, 'nella pagina ci deve essere un solo blocco dei dati');
  assert.ok(html.includes("el('population-1960-data')"), 'il codice della pagina non legge il blocco dei dati');
  assert.ok(!/<\/script/i.test(testoDati), 'il file dei dati contiene «</script»');
  assert.ok(!testoDati.includes('<!--'), 'il file dei dati contiene «<!--»');
});

test('lo strumento di incorporazione: --check riconosce una copia giusta e una sbagliata, e senza --check la ripara', () => {
  const dir = cartellaTemporanea();
  try {
    const pagina = path.join(dir, 'pagina.html'), dati = path.join(dir, 'dati.json');
    fs.copyFileSync(FILE_PAGINA, pagina);
    fs.copyFileSync(FILE_DATI, dati);
    let r = lanciaStrumento(pagina, dati, '--check');
    assert.strictEqual(r.status, 0, 'la copia vera dovrebbe risultare giusta:\n' + r.stderr + r.stdout);
    // un solo numero cambiato nel file dei dati: la pagina è rimasta indietro
    fs.writeFileSync(dati, testoDati.replace('"value": 50198000', '"value": 50198001'));
    assert.notStrictEqual(testoDati, fs.readFileSync(dati, 'utf8'), 'la prova non è riuscita a cambiare il file di prova');
    r = lanciaStrumento(pagina, dati, '--check');
    assert.strictEqual(r.status, 1, 'una copia in ritardo sul file deve far fallire il controllo');
    assert.match(r.stderr, /node scripts\/incorpora-popolazione\.js/, 'il messaggio deve dire come rimediare');
    assert.strictEqual(fs.readFileSync(pagina, 'utf8'), fs.readFileSync(FILE_PAGINA, 'utf8'), '--check non deve scrivere nulla');
    // senza --check la pagina viene aggiornata, e poi il controllo passa
    r = lanciaStrumento(pagina, dati);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(fs.readFileSync(pagina, 'utf8').includes('"value": 50198001'), 'la pagina non è stata aggiornata');
    assert.strictEqual(lanciaStrumento(pagina, dati, '--check').status, 0, 'dopo l\'aggiornamento il controllo deve passare');
    // tutto ciò che sta fuori dai marcatori resta com\'era
    const prima = html, dopo = fs.readFileSync(pagina, 'utf8');
    const a1 = incorpora.trovaBlocco(prima), a2 = incorpora.trovaBlocco(dopo);
    assert.strictEqual(prima.slice(0, a1.da), dopo.slice(0, a2.da), 'il testo prima dei marcatori è cambiato');
    assert.strictEqual(prima.slice(a1.a), dopo.slice(a2.a), 'il testo dopo i marcatori è cambiato');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('lo strumento di incorporazione si rifiuta di lavorare con dati che non possono stare in una pagina o con marcatori mancanti', () => {
  const dir = cartellaTemporanea();
  try {
    const pagina = path.join(dir, 'pagina.html'), dati = path.join(dir, 'dati.json');
    fs.copyFileSync(FILE_PAGINA, pagina);
    fs.writeFileSync(dati, testoDati.replace('"title": "Popolazione 1960 per entità"', '"title": "</script><b>"'));
    let r = lanciaStrumento(pagina, dati);
    assert.strictEqual(r.status, 1, 'dati con «</script» devono essere rifiutati');
    assert.match(r.stderr, /<\/script/);
    fs.writeFileSync(dati, '{ non è json');
    r = lanciaStrumento(pagina, dati);
    assert.strictEqual(r.status, 1, 'un file dei dati che non è JSON deve essere rifiutato');
    fs.writeFileSync(dati, testoDati);
    fs.writeFileSync(pagina, '<html><body>nessun marcatore</body></html>');
    r = lanciaStrumento(pagina, dati);
    assert.strictEqual(r.status, 1, 'una pagina senza marcatori deve essere rifiutata');
    assert.match(r.stderr, /DATI-POPOLAZIONE-INIZIO/);
    assert.strictEqual(fs.readFileSync(pagina, 'utf8'), '<html><body>nessun marcatore</body></html>', 'la pagina non deve essere toccata');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ---- niente più dati scritti a mano nella pagina --------------------------------------------------------------------

test('nella pagina non restano i vecchi elenchi di popolazione scritti a mano', () => {
  for (const nome of ['POPULATION_1960', 'POPULATION_1960_B', 'regionalPopulationProvinces', 'populationSource', 'populationParts', 'populationStatus']) {
    assert.ok(!html.includes(nome), `la pagina contiene ancora «${nome}»`);
  }
});

test('nel codice della pagina (fuori dal blocco dei dati) non compare nessun valore di popolazione del file', () => {
  const { da, a } = incorpora.trovaBlocco(html);
  const fuori = html.slice(0, da) + html.slice(a);
  // Numeri tondi che nel codice compaiono per un altro motivo (non sono popolazioni): ogni eccezione dice quale.
  const ALTRO_USO = { 1000000: 'limite massimo del numero di turni di una partita salvata' };
  const grandi = [...data.records.map(r => r.value), ...data.records.flatMap(r => r.alternative_values.map(x => x.value))].filter(v => v >= 100000 && !(v in ALTRO_USO));
  assert.ok(grandi.length > 30, 'la prova sta guardando pochi valori');
  for (const v of new Set(grandi)) {
    assert.ok(!new RegExp(`(^|[^\\d.])${v}([^\\d.]|$)`).test(fuori), `il numero ${v} è scritto a mano nel codice della pagina: deve stare solo nel file dei dati`);
  }
});

// ---- le avvertenze (flag) hanno una frase ---------------------------------------------------------------------------

function leggiOggetto(nome) {
  const marca = `const ${nome} = {`;
  const inizio = html.indexOf(marca);
  assert.ok(inizio >= 0, `nella pagina manca «${marca}»`);
  const i = inizio + marca.length - 1;
  let profondita = 0, virgolette = null, esc = false, j = i;
  for (; j < html.length; j++) {
    const c = html[j];
    if (virgolette) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === virgolette) virgolette = null; continue; }
    if (c === '"' || c === "'" || c === '`') { virgolette = c; continue; }
    if (c === '{') profondita++;
    else if (c === '}' && --profondita === 0) { j++; break; }
  }
  return vm.runInNewContext('(' + html.slice(i, j) + ')');
}

test('ogni avvertenza (flag) usata dal file ha una frase per chi legge nella pagina', () => {
  const frasi = leggiOggetto('POP_FLAG_TEXT');
  const usati = new Set(data.records.flatMap(r => r.flags));
  assert.ok(usati.size >= 8, 'la prova sta guardando pochi flag');
  for (const f of usati) assert.ok(Object.prototype.hasOwnProperty.call(frasi, f) && frasi[f].length > 10, `il flag «${f}» non ha una frase in POP_FLAG_TEXT nella pagina: verrebbe mostrato col suo codice`);
});

// ---- il file dei dati --------------------------------------------------------------------------------------------

test('l\'avvertenza generale sta in meta.global_warning e non è ripetuta nei record', () => {
  assert.ok(data.meta.global_warning && data.meta.global_warning.length > 40, 'manca meta.global_warning');
  const chiave = data.meta.global_warning.slice(0, 40);
  for (const r of data.records) assert.ok(!JSON.stringify(r).includes(chiave), `${r.id}: ripete l'avvertenza generale`);
});

test('i testi del file dei dati sono in italiano con gli accenti (la pagina li mostra così come sono)', () => {
  // Errori tipici di un testo scritto «senza accenti»: la «e» al posto di «è», «entita» al posto di «entità», eccetera.
  const sbagliati = [/ e (?:riferito|riportato|indipendente|stato|stata|quello)\b/, /\bentita\b/i, /\bcitta\b/i, /\bcosi\b/, /\bcio che\b/, /\ba se\b/, /\bne usci\b/];
  const testi = [];
  (function raccogli(x, p) {
    if (typeof x === 'string') testi.push([p, x]);
    else if (Array.isArray(x)) x.forEach((y, i) => raccogli(y, `${p}[${i}]`));
    else if (x && typeof x === 'object') for (const k of Object.keys(x)) if (k !== 'flags') raccogli(x[k], p ? `${p}.${k}` : k);   // i flag sono codici, non frasi
  })(data, '');
  for (const [p, t] of testi) for (const re of sbagliati) assert.ok(!re.test(t), `${p}: il testo sembra scritto senza accenti («${(re.exec(t) || [''])[0]}»): «${t.slice(0, 90)}…»`);
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

test('la scheda del territorio scrive «Status al 31 dicembre 1960», non la vecchia etichetta «Status nel 1960»', () => {
  assert.ok(html.includes("label: 'Status al 31 dicembre 1960:'"), 'manca l\'etichetta «Status al 31 dicembre 1960» nella scheda del territorio');
  assert.ok(!html.includes('Status nel 1960'), 'nella pagina resta la vecchia etichetta «Status nel 1960»');
});
