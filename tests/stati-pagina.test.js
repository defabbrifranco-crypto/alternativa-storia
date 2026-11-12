// La pagina legge gli Stati dal file src/data/states_1960.json (versione 30, issue #3).
//
// Come per la popolazione, la pagina deve funzionare anche aperta da sola, quindi porta con sé una copia IDENTICA del file, scritta da
// scripts/incorpora-stati.js dentro un blocco <script type="application/json"> fra due marcatori. Qui si controlla che:
//   - la copia nella pagina sia uguale al file (se si cambia il file e ci si dimentica di aggiornare la pagina, questa prova si ferma);
//   - nella pagina non resti nessuna capitale, alleanza o tabella degli Stati scritta a mano;
//   - lo strumento di incorporazione funzioni davvero, anche quando la copia è sbagliata, e non tocchi la copia della popolazione (né viceversa);
//   - ogni avvertenza del file abbia una frase per chi legge, e la scheda del territorio abbia gli elementi che la prova nel browser usa.
// Le prove nel browser (ogni scheda dice «non verificata» dove il file lo dice) stanno in tests/browser/t17_stati.js.
// Esegui con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const incorpora = require('../scripts/incorpora-stati.js');
const incorporaPopolazione = require('../scripts/incorpora-popolazione.js');
const censimento = require('../scripts/censimento-dati.js');

const root = path.join(__dirname, '..');
const FILE_DATI = path.join(root, 'src', 'data', 'states_1960.json');
const FILE_POPOLAZIONE = path.join(root, 'src', 'data', 'population_1960.json');
const FILE_PAGINA = path.join(root, 'src', 'storia-alternativa-prototipo.html');
const SCRIPT = path.join(root, 'scripts', 'incorpora-stati.js');
const SCRIPT_POPOLAZIONE = path.join(root, 'scripts', 'incorpora-popolazione.js');
const testoDati = fs.readFileSync(FILE_DATI, 'utf8');
const data = JSON.parse(testoDati);
const html = fs.readFileSync(FILE_PAGINA, 'utf8');

// Esegue uno dei due strumenti di incorporazione su una pagina e un file dei dati scelti (variabili INCORPORA_*).
function lancia(script, env, ...argomenti) {
  return spawnSync(process.execPath, [script, ...argomenti], { encoding: 'utf8', env: { ...process.env, ...env } });
}
const lanciaStrumento = (pagina, dati, ...argomenti) => lancia(SCRIPT, { INCORPORA_PAGINA: pagina, INCORPORA_STATI: dati }, ...argomenti);
function cartellaTemporanea() { return fs.mkdtempSync(path.join(os.tmpdir(), 'incorpora-stati-')); }

// ---- la copia nella pagina ---------------------------------------------------------------------------------------

test('la pagina ha una copia dei dati degli Stati fra i due marcatori, identica al file (parola per parola)', () => {
  const { da, a } = incorpora.trovaBlocco(html);
  assert.strictEqual(html.slice(da, a), incorpora.bloccoAtteso(testoDati),
    'La copia dei dati degli Stati nella pagina è diversa da src/data/states_1960.json.\nPer aggiornarla: node scripts/incorpora-stati.js');
  const dentro = /<script type="application\/json" id="states-1960-data">([\s\S]*?)<\/script>/.exec(html.slice(da, a));
  assert.ok(dentro, 'dentro i marcatori manca il blocco <script type="application/json" id="states-1960-data">');
  assert.deepStrictEqual(JSON.parse(dentro[1]), data, 'il JSON letto dalla pagina non coincide con il file');
});

test('nella pagina c\'è un solo blocco dei dati degli Stati, e il file non contiene nulla che lo chiuderebbe', () => {
  assert.strictEqual(html.split('\n<script type="application/json" id="states-1960-data">\n').length - 1, 1, 'nella pagina ci deve essere un solo blocco dei dati degli Stati');
  assert.ok(html.includes("el('states-1960-data')"), 'il codice della pagina non legge il blocco dei dati degli Stati');
  assert.ok(!/<\/script/i.test(testoDati), 'il file dei dati contiene «</script»');
  assert.ok(!testoDati.includes('<!--'), 'il file dei dati contiene «<!--»');
});

test('i due blocchi di dati stanno prima del codice della pagina, e non si annidano né si sovrappongono', () => {
  const pop = incorporaPopolazione.trovaBlocco(html), sta = incorpora.trovaBlocco(html);
  const codice = html.indexOf('(async function(){');
  assert.ok(codice > 0, 'non trovo l\'inizio del codice della pagina');
  assert.ok(pop.a <= sta.da || sta.a <= pop.da, 'i due blocchi di dati si sovrappongono');
  assert.ok(pop.a < codice && sta.a < codice, 'un blocco di dati sta dopo l\'inizio del codice: la pagina non lo troverebbe');
});

test('lo strumento di incorporazione degli Stati: --check riconosce una copia giusta e una sbagliata, e senza --check la ripara', () => {
  const dir = cartellaTemporanea();
  try {
    const pagina = path.join(dir, 'pagina.html'), dati = path.join(dir, 'dati.json');
    fs.copyFileSync(FILE_PAGINA, pagina);
    fs.copyFileSync(FILE_DATI, dati);
    let r = lanciaStrumento(pagina, dati, '--check');
    assert.strictEqual(r.status, 0, 'la copia vera dovrebbe risultare giusta:\n' + r.stderr + r.stdout);
    // un solo colore cambiato nel file dei dati: la pagina è rimasta indietro
    fs.writeFileSync(dati, testoDati.replace('"color": "#3b6ea5"', '"color": "#3b6ea6"'));
    assert.notStrictEqual(testoDati, fs.readFileSync(dati, 'utf8'), 'la prova non è riuscita a cambiare il file di prova');
    r = lanciaStrumento(pagina, dati, '--check');
    assert.strictEqual(r.status, 1, 'una copia in ritardo sul file deve far fallire il controllo');
    assert.match(r.stderr, /node scripts\/incorpora-stati\.js/, 'il messaggio deve dire come rimediare');
    assert.strictEqual(fs.readFileSync(pagina, 'utf8'), fs.readFileSync(FILE_PAGINA, 'utf8'), '--check non deve scrivere nulla');
    // senza --check la pagina viene aggiornata, e poi il controllo passa
    r = lanciaStrumento(pagina, dati);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(fs.readFileSync(pagina, 'utf8').includes('"color": "#3b6ea6"'), 'la pagina non è stata aggiornata');
    assert.strictEqual(lanciaStrumento(pagina, dati, '--check').status, 0, 'dopo l\'aggiornamento il controllo deve passare');
    // tutto ciò che sta fuori dai marcatori resta com'era
    const dopo = fs.readFileSync(pagina, 'utf8');
    const a1 = incorpora.trovaBlocco(html), a2 = incorpora.trovaBlocco(dopo);
    assert.strictEqual(html.slice(0, a1.da), dopo.slice(0, a2.da), 'il testo prima dei marcatori è cambiato');
    assert.strictEqual(html.slice(a1.a), dopo.slice(a2.a), 'il testo dopo i marcatori è cambiato');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('lo strumento di incorporazione degli Stati si rifiuta di lavorare con dati che non possono stare in una pagina o con marcatori mancanti', () => {
  const dir = cartellaTemporanea();
  try {
    const pagina = path.join(dir, 'pagina.html'), dati = path.join(dir, 'dati.json');
    fs.copyFileSync(FILE_PAGINA, pagina);
    fs.writeFileSync(dati, testoDati.replace('"title": "Stati del prototipo: nome, capitale, alleanza, colore"', '"title": "</script><b>"'));
    assert.notStrictEqual(fs.readFileSync(dati, 'utf8'), testoDati, 'la prova non è riuscita a guastare il file');
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
    assert.match(r.stderr, /DATI-STATI-INIZIO/);
    assert.strictEqual(fs.readFileSync(pagina, 'utf8'), '<html><body>nessun marcatore</body></html>', 'la pagina non deve essere toccata');
    // un marcatore doppio: non si sa quale copia aggiornare
    const doppia = html.replace(incorpora.FINE, incorpora.FINE + '\n' + incorpora.FINE);
    assert.notStrictEqual(doppia, html);
    fs.writeFileSync(pagina, doppia);
    r = lanciaStrumento(pagina, dati);
    assert.strictEqual(r.status, 1, 'un marcatore di fine doppio deve fermare lo strumento');
    assert.match(r.stderr, /più di una volta/);
    assert.strictEqual(fs.readFileSync(pagina, 'utf8'), doppia, 'la pagina non deve essere toccata');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('i due strumenti di incorporazione lavorano ciascuno sul proprio blocco e non toccano l\'altro', () => {
  const dir = cartellaTemporanea();
  try {
    const pagina = path.join(dir, 'pagina.html');
    // una pagina con la copia degli Stati in ritardo e quella della popolazione in ritardo, in due punti diversi
    const popolazioneVecchia = html.replace('"value": 50198000', '"value": 50198001');
    const statiVecchi = popolazioneVecchia.replace('"color": "#3b6ea5"', '"color": "#3b6ea4"');
    assert.notStrictEqual(popolazioneVecchia, html, 'la prova non ha guastato la popolazione');
    assert.notStrictEqual(statiVecchi, popolazioneVecchia, 'la prova non ha guastato gli Stati');
    fs.writeFileSync(pagina, statiVecchi);
    // lo strumento degli Stati ripara solo gli Stati
    let r = lanciaStrumento(pagina, FILE_DATI);
    assert.strictEqual(r.status, 0, r.stderr);
    let dopo = fs.readFileSync(pagina, 'utf8');
    assert.ok(dopo.includes('"color": "#3b6ea5"') && !dopo.includes('"color": "#3b6ea4"'), 'la copia degli Stati non è stata riparata');
    assert.ok(dopo.includes('"value": 50198001'), 'lo strumento degli Stati ha toccato la copia della popolazione');
    assert.strictEqual(lancia(SCRIPT_POPOLAZIONE, { INCORPORA_PAGINA: pagina, INCORPORA_DATI: FILE_POPOLAZIONE }, '--check').status, 1, 'la popolazione dovrebbe risultare ancora in ritardo');
    // lo strumento della popolazione ripara solo la popolazione
    fs.writeFileSync(pagina, statiVecchi);
    r = lancia(SCRIPT_POPOLAZIONE, { INCORPORA_PAGINA: pagina, INCORPORA_DATI: FILE_POPOLAZIONE });
    assert.strictEqual(r.status, 0, r.stderr);
    dopo = fs.readFileSync(pagina, 'utf8');
    assert.ok(dopo.includes('"value": 50198000') && !dopo.includes('"value": 50198001'), 'la copia della popolazione non è stata riparata');
    assert.ok(dopo.includes('"color": "#3b6ea4"'), 'lo strumento della popolazione ha toccato la copia degli Stati');
    assert.strictEqual(lanciaStrumento(pagina, FILE_DATI, '--check').status, 1, 'gli Stati dovrebbero risultare ancora in ritardo');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ---- niente più dati degli Stati scritti a mano nella pagina ----------------------------------------------------------

// La pagina senza i due blocchi di dati: è il codice che non deve contenere capitali e alleanze.
function codiceSenzaDati() {
  const pop = incorporaPopolazione.trovaBlocco(html), sta = incorpora.trovaBlocco(html);
  const [primo, secondo] = pop.da < sta.da ? [pop, sta] : [sta, pop];
  return html.slice(0, primo.da) + html.slice(primo.a, secondo.da) + html.slice(secondo.a);
}

test('nel codice della pagina non resta nessuna tabella degli Stati scritta a mano', () => {
  const codice = codiceSenzaDati();
  assert.ok(/\blet countries = \{\};/.test(codice), 'la tabella degli Stati deve partire vuota e riempirsi dal file');
  assert.ok(!/^\s{4}[A-Z]{3,4}: \{ name:/m.test(codice), 'nel codice resta una riga di Stato scritta a mano (per esempio «FRA: { name: …»)');
  assert.ok(!/\balliance\s*:\s*["']/.test(codice), 'nel codice resta un\'alleanza scritta a mano (alliance: "…")');
  assert.ok(!/\bcapital\s*:\s*["']/.test(codice), 'nel codice resta una capitale scritta a mano (capital: "…")');
  assert.ok(!/\bplayable\s*:\s*(true|false)\b/.test(codice), 'nel codice resta un valore «playable» scritto a mano');
});

test('le 36 province degli Stati senza suddivisioni prendono la capitale dal file: nessuna è scritta nella provincia', () => {
  const codice = codiceSenzaDati();
  const chiamate = codice.match(/\bmkMain\("/g) || [];
  assert.strictEqual(chiamate.length, 36, `«mkMain(» compare ${chiamate.length} volte invece di 36`);
  const senzaCapitale = codice.match(/\bmkMain\("[^"]+","[A-Z]{3,4}",\d+,\d+,\d+/g) || [];
  assert.strictEqual(senzaCapitale.length, 36, 'ogni chiamata di mkMain deve passare il proprietario e poi tre numeri, senza capitale');
  assert.ok(!/\bmkProv\("/.test(codice), 'resta una chiamata di mkProv con testo scritto a mano (la capitale delle province degli Stati senza suddivisioni va letta dal file)');
  // la capitale di ogni provincia così costruita è quella dello Stato, e solo lì viene segnata «di quale Stato»
  assert.ok(/mkProv\(name, owner, countries\[owner\] \? countries\[owner\]\.capital : null,/.test(codice), 'mkMain non prende la capitale dallo Stato');
  assert.ok(/p\.capitalOf = owner;/.test(codice), 'mkMain non segna di quale Stato è la capitale (la scheda non saprebbe se è verificata)');
  const comuni = new Set(data.states.map(s => s.id));
  for (const m of codice.matchAll(/\bmkMain\("[^"]+","([A-Z]{3,4})"/g)) assert.ok(comuni.has(m[1]), `mkMain: lo Stato ${m[1]} non è nel file dei dati`);
});

// ---- le avvertenze hanno una frase; la scheda ha gli elementi giusti -------------------------------------------------

test('ogni avvertenza (flag) usata dal file ha una frase per chi legge nella pagina', () => {
  const frasi = vm.runInNewContext('(' + censimento.letterale(html, 'const STATE_FLAG_TEXT = ') + ')');
  const usati = new Set(data.states.flatMap(s => s.flags));
  assert.ok(usati.size >= 2, 'la prova sta guardando pochi flag');
  for (const f of usati) {
    assert.ok(Object.prototype.hasOwnProperty.call(frasi, f) && frasi[f].length > 10, `il flag «${f}» non ha una frase in STATE_FLAG_TEXT nella pagina: verrebbe mostrato col suo codice`);
  }
});

test('la scheda del territorio, la legenda e l\'avviso hanno gli elementi che il codice riempie', () => {
  for (const id of ['pp-capital', 'pp-statecap-row', 'pp-statecap', 'pp-statealliance', 'pp-statedet', 'pp-statenote', 'legendNote', 'statesError']) {
    assert.strictEqual(html.split(`id="${id}"`).length - 1, 1, `nella pagina l'elemento «${id}» deve esserci una volta sola`);
  }
  assert.ok(/id="statesError" role="alert"/.test(html), 'l\'avviso «dati degli Stati non letti» deve essere un role="alert"');
  assert.ok(/<summary>Capitale e alleanza: fonte e verifica<\/summary>/.test(html), 'manca il titolo «Capitale e alleanza: fonte e verifica»');
  assert.ok(/<span>Capitale del proprietario<\/span>/.test(html) && /<span>Alleanza del proprietario<\/span>/.test(html), 'mancano le righe «Capitale del proprietario» e «Alleanza del proprietario»');
  assert.ok(/id="statesError"[^>]*><\/div>\s*\n\s*<div id="setup">/.test(html), 'l\'avviso deve stare prima di tutto il resto della pagina');
});

test('la verifica di capitali e alleanze si legge solo nelle funzioni della scheda e della legenda, non nella richiesta all\'AI né nei salvataggi', () => {
  const codice = codiceSenzaDati();
  const da = codice.indexOf('// ---- The state part of the territory card');
  const a = codice.indexOf('// ---- The population part of the territory card');
  assert.ok(da > 0 && a > da, 'non trovo, nel codice della pagina, la parte della scheda che riguarda gli Stati');
  // i commenti possono nominare i campi del file (spiegano), il codice no: si guardano solo le righe che non sono commenti
  const fuori = (codice.slice(0, da) + codice.slice(a)).split('\n').filter(r => !r.trim().startsWith('//')).join('\n');
  for (const parola of ['capital_verified', 'alliance_verified', 'capital_source_id', 'alliance_source_id']) {
    const riga = fuori.split('\n').find(r => r.includes(parola));
    assert.ok(!riga, `«${parola}» è usato nel codice della pagina fuori dalla scheda e dalla legenda: ${riga && riga.trim().slice(0, 110)}`);
  }
  // dentro quella parte, invece, ci sono: la prova non guarda un pezzo di codice vuoto
  const dentro = codice.slice(da, a);
  for (const parola of ['capital_verified', 'alliance_verified', 'capital_source_id', 'alliance_source_id']) assert.ok(dentro.includes(parola), `«${parola}» non è usato nella scheda: la prova guarda nel posto sbagliato`);
});
