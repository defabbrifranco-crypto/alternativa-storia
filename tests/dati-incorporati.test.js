// Controlli sui dati che la pagina porta con sé oltre alla popolazione e sul loro inventario (issue #3): Stati, capitali, alleanze,
// unità regionali, valutazioni provvisorie, note, province confinanti. Senza browser.
// Esegui con: node --test      (lo strumento è scripts/censimento-dati.js, il documento è docs/DATI-INCORPORATI.md)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const censimento = require('../scripts/censimento-dati.js');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const SCRIPT = path.join(root, 'scripts', 'censimento-dati.js');
const pagina = read('src/storia-alternativa-prototipo.html');
const doc = read('docs/DATI-INCORPORATI.md');
const dati = censimento.leggiPagina(pagina);

const lancia = (args, env) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', env: { ...process.env, ...env } });
// Copie temporanee della pagina e del documento, per provare lo strumento senza toccare i file veri.
function copie(t, { paginaTesto = pagina, docTesto = doc } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'censimento-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const p = path.join(dir, 'pagina.html'), d = path.join(dir, 'doc.md');
  fs.writeFileSync(p, paginaTesto); fs.writeFileSync(d, docTesto);
  return { p, d, env: { CENSIMENTO_PAGINA: p, CENSIMENTO_DOC: d } };
}

test('le tabelle di docs/DATI-INCORPORATI.md coincidono con quelle ricavate dalla pagina', () => {
  const r = lancia(['--check']);
  assert.strictEqual(r.status, 0, `${r.stdout}${r.stderr}\nPer aggiornarle: npm run censimento`);
});

test('lo strumento di censimento aggiorna un documento rimasto indietro e poi lo trova a posto', t => {
  const stantio = doc.replace('| Stati | `countries` | 83 |', '| Stati | `countries` | 84 |');
  assert.notStrictEqual(stantio, doc, 'la prova non ha trovato la riga da guastare: il formato della tabella è cambiato');
  const { d, env } = copie(t, { docTesto: stantio });
  const prima = lancia(['--check'], env);
  assert.strictEqual(prima.status, 1);
  assert.match(prima.stderr, /sono diverse/);
  assert.strictEqual(fs.readFileSync(d, 'utf8'), stantio, '--check non deve scrivere');
  assert.strictEqual(lancia([], env).status, 0);
  assert.strictEqual(fs.readFileSync(d, 'utf8'), doc, 'dopo l\'aggiornamento il documento deve tornare identico a quello giusto');
  assert.strictEqual(lancia(['--check'], env).status, 0);
  const ancora = lancia([], env);
  assert.strictEqual(ancora.status, 0);
  assert.match(ancora.stdout, /Niente da fare/);
});

test('lo strumento di censimento si ferma se un marcatore manca, è doppio o è sconosciuto', t => {
  const nome = 'alleanze';
  const ini = censimento.INIZIO(nome), fin = censimento.FINE(nome);
  const casi = [
    ['marcatore di inizio mancante', doc.replace(ini, ''), /manca il marcatore/],
    ['marcatore di fine mancante', doc.replace(fin, ''), /manca il marcatore/],
    ['marcatore di inizio doppio', doc.replace(ini, ini + '\n' + ini), /più di una volta/],
    ['marcatore di fine doppio', doc.replace(fin, fin + '\n' + fin), /più di una volta/],
    ['marcatore sconosciuto', doc + '\n<!-- CENSIMENTO inventato INIZIO (x) -->\n', /sconosciuto/],
  ];
  for (const [che, docTesto, atteso] of casi) {
    assert.notStrictEqual(docTesto, doc, `${che}: la prova non ha guastato nulla`);
    const { d, env } = copie(t, { docTesto });
    const r = lancia(['--check'], env);
    assert.strictEqual(r.status, 1, che);
    assert.match(r.stderr, atteso, che);
    assert.strictEqual(lancia([], env).status, 1, `${che}: anche l'aggiornamento deve fermarsi`);
    assert.strictEqual(fs.readFileSync(d, 'utf8'), docTesto, `${che}: il documento non deve essere toccato`);
  }
});

test('lo strumento di censimento si ferma se la pagina non ha più una tabella che legge', t => {
  for (const marca of ['const ADJ = ', 'let countries = ', 'const REGION_UNITS = ', 'const SINGLE_NOTES = ']) {
    const guasta = pagina.replace(marca, marca.replace(' = ', '_Z = '));
    assert.notStrictEqual(guasta, pagina);
    const { env } = copie(t, { paginaTesto: guasta });
    const r = lancia(['--check'], env);
    assert.strictEqual(r.status, 1, marca);
    assert.match(r.stderr, /manca/, marca);
  }
  // una tabella doppia non si sa quale leggere
  const doppia = pagina.replace('const WING_UNITS = ', 'const SINGLE_NOTES = {};\n  const WING_UNITS = ');
  const { env } = copie(t, { paginaTesto: doppia });
  const r = lancia(['--check'], env);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /più di una volta/);
});

test('ogni tabella di dati della pagina è nominata nel documento, e il documento non nomina tabelle che non esistono più', () => {
  // Se si aggiunge una tabella di dati alla pagina: descriverla in docs/DATI-INCORPORATI.md e aggiungerla qui.
  const TABELLE = ['countries', 'provinces', 'REGION_UNITS', 'REGION_TYPES', 'REGION_METHODS', 'REGION_KINDS', 'TERRITORY_NOTES', 'UNIT_NOTES',
    'COUNTRY_NOTES', 'SINGLE_NOTES', 'PROV_ORDER', 'ADJ', 'WING_UNITS', 'LEGACY', 'COLD_WAR_PREMISE', 'COUNTRY_ALIASES', 'GENERIC_WORDS',
    'MARKER_TYPES', 'MARKER_ALIASES', 'MAPPROJ'];
  for (const nome of TABELLE) {
    assert.ok(new RegExp(`\\b(const|let) ${nome} =`).test(pagina), `nella pagina non c'è più «${nome}»: aggiornare il documento e l'elenco di questa prova`);
    assert.ok(doc.includes('`' + nome + '`'), `docs/DATI-INCORPORATI.md non nomina «${nome}»`);
  }
  assert.ok(doc.includes('`mkProv`'));
  // ogni nome in MAIUSCOLO fra apici (tabelle, codici di Stati e di unità) deve esistere ancora nella pagina
  const nomi = new Set([...doc.matchAll(/`([A-Z][A-Z0-9_]{2,})`/g)].map(m => m[1]));
  assert.ok(nomi.size > 100, 'il documento nomina pochi codici: il controllo non sta guardando nei posti giusti');
  for (const n of nomi) assert.ok(pagina.includes(n), `docs/DATI-INCORPORATI.md nomina «${n}», che nella pagina non c'è`);
});

test('i dati incorporati sono coerenti fra loro: Stati, province, unità regionali', () => {
  const stati = Object.entries(dati.stati);
  assert.ok(stati.length >= 80);
  for (const [id, s] of stati) {
    for (const campo of ['name', 'capital', 'alliance']) assert.ok(typeof s[campo] === 'string' && s[campo].trim(), `${id}: manca ${campo}`);
    assert.match(s.color, /^#[0-9a-f]{6}$/i, `${id}: colore non valido`);
    assert.strictEqual(typeof s.playable, 'boolean', `${id}: playable non è vero/falso`);
  }
  // il documento dice che ogni Stato ha una tinta diversa
  assert.strictEqual(new Set(stati.map(([, s]) => s.color.toLowerCase())).size, stati.length, 'due Stati hanno lo stesso colore: il documento dice che sono tutti diversi');
  assert.strictEqual(new Set(stati.map(([, s]) => s.name)).size, stati.length, 'due Stati hanno lo stesso nome');

  const ids = dati.unita.map(u => u[0]);
  assert.strictEqual(new Set(ids).size, ids.length, 'identificativi di unità ripetuti');
  for (const u of dati.unita) {
    assert.strictEqual(u.length, 10, `${u[0]}: la riga non ha 10 campi`);
    assert.ok(dati.stati[u[2]], `${u[0]}: lo Stato ${u[2]} non esiste`);
    assert.ok(u[3] >= 0 && u[3] < dati.tipi.length, `${u[0]}: tipo fuori elenco`);
    assert.ok(u[4] >= 0 && u[4] < dati.metodi.length, `${u[0]}: metodo fuori elenco`);
    assert.ok(Number.isInteger(u[5]) && u[5] > 0, `${u[0]}: posizione nell'elenco non valida`);
    assert.ok(u[6] >= 0 && u[6] < dati.forme.length, `${u[0]}: forma fuori elenco`);
    for (const i of [7, 8, 9]) assert.ok(Number.isInteger(u[i]) && u[i] >= 0 && u[i] <= 100, `${u[0]}: valutazione fuori da 0-100`);
  }
  for (const [chiave, p] of Object.entries(dati.singole)) {
    assert.strictEqual(chiave, p.owner + '_MAIN', `${chiave}: l'identificativo non è «Stato_MAIN»`);
    assert.ok(dati.stati[p.owner], `${chiave}: lo Stato ${p.owner} non esiste`);
    assert.strictEqual(typeof p.capital, 'string', `${chiave}: manca la capitale`);
    for (const k of ['infrastructure', 'stability', 'strategicValue']) assert.ok(Number.isInteger(p[k]) && p[k] >= 0 && p[k] <= 100, `${chiave}: ${k} fuori da 0-100`);
    assert.ok(Array.isArray(p.units) && p.units.every(t => typeof t === 'string' && t.trim()), `${chiave}: note non valide`);
  }
  // ogni Stato ha almeno una provincia, e nessuno ne ha di tutti e due i tipi
  const suddivisi = new Set(dati.unita.map(u => u[2])), singoli = new Set(Object.values(dati.singole).map(p => p.owner));
  for (const [id] of stati) assert.ok(suddivisi.has(id) !== singoli.has(id), `${id}: o ha unità regionali o è una provincia sola, non tutti e due né nessuno`);
});

test('le note sono coerenti con le unità: conteggi, Stati e unità esistenti', () => {
  const suddivisi = [...new Set(dati.unita.map(u => u[2]))].sort();
  assert.deepStrictEqual(Object.keys(dati.noteStati).sort(), suddivisi, 'COUNTRY_NOTES deve avere una voce per ogni Stato suddiviso e nessun\'altra');
  for (const [id, n] of Object.entries(dati.noteStati)) {
    assert.strictEqual(n.nUnits, dati.unita.filter(u => u[2] === id).length, `${id}: nUnits non coincide con le unità disegnate`);
    assert.strictEqual(n.nCsv, n.nUnits + n.unplaced.length + n.containers.length, `${id}: le unità del file non tornano (disegnate + non disegnate + contenitori)`);
  }
  const singoli = new Set(Object.values(dati.singole).map(p => p.owner));
  for (const id of Object.keys(dati.noteSingoli)) assert.ok(singoli.has(id), `SINGLE_NOTES: ${id} non è uno Stato senza suddivisioni`);
  for (const id of Object.keys(dati.noteTerritorio)) assert.ok(dati.stati[id], `TERRITORY_NOTES: lo Stato ${id} non esiste`);
  for (const id of Object.keys(dati.noteUnita)) assert.ok(dati.unita.some(u => u[0] === id), `UNIT_NOTES: l'unità ${id} non esiste`);
});

test('le province confinanti e i vecchi identificativi sono coerenti: ogni provincia c\'è, i vicini sono reciproci', () => {
  const province = new Set([...dati.unita.map(u => u[0]), ...Object.keys(dati.singole)]);
  assert.strictEqual(dati.ordine.length, province.size, 'PROV_ORDER non ha una voce per ogni provincia');
  assert.strictEqual(new Set(dati.ordine).size, dati.ordine.length, 'PROV_ORDER ha identificativi ripetuti');
  for (const id of dati.ordine) assert.ok(province.has(id), `PROV_ORDER: ${id} non è una provincia`);
  assert.strictEqual(dati.adiacenze.length, dati.ordine.length, 'ADJ deve avere una riga per ogni provincia di PROV_ORDER');
  dati.adiacenze.forEach((riga, i) => {
    assert.strictEqual(new Set(riga).size, riga.length, `ADJ: ${dati.ordine[i]} ha un vicino ripetuto`);
    for (const j of riga) {
      assert.ok(Number.isInteger(j) && j >= 0 && j < dati.ordine.length, `ADJ: ${dati.ordine[i]} ha un indice fuori elenco`);
      assert.notStrictEqual(j, i, `ADJ: ${dati.ordine[i]} è vicina di se stessa`);
      assert.ok(dati.adiacenze[j].includes(i), `ADJ: ${dati.ordine[i]} confina con ${dati.ordine[j]} ma non viceversa`);
    }
  });
  for (const [vecchio, [stato, nuovi]] of Object.entries(dati.legacy)) {
    assert.ok(dati.stati[stato], `LEGACY: ${vecchio}: lo Stato ${stato} non esiste`);
    if (nuovi !== '*') for (const n of nuovi) assert.ok(province.has(n), `LEGACY: ${vecchio} rinvia a ${n}, che non è una provincia`);
  }
});

test('le valutazioni provvisorie si usano solo per essere mostrate nella scheda del territorio', () => {
  // docs/DATI-INCORPORATI.md dice che non entrano nella richiesta all'AI, nelle regole né nei salvataggi.
  const righe = pagina.split('\n');
  for (const [campo, elemento] of [['infrastructure', 'pp-infra'], ['stability', 'pp-stability'], ['strategicValue', 'pp-strategic']]) {
    const usi = righe.filter(r => new RegExp(`\\.${campo}\\b`).test(r));
    assert.strictEqual(usi.length, 1, `«.${campo}» compare in ${usi.length} righe della pagina (deve comparire solo nella scheda): aggiornare anche docs/DATI-INCORPORATI.md se è voluto`);
    assert.ok(usi[0].includes(`el('${elemento}')`), `«.${campo}» è usato fuori dalla scheda: ${usi[0].trim().slice(0, 120)}`);
  }
});

test('l\'indice dei documenti elenca ogni documento di docs/ e i documenti nuovi sono collegati', () => {
  const indice = read('docs/README.md');
  const documenti = fs.readdirSync(path.join(root, 'docs')).filter(f => f.endsWith('.md') && f !== 'README.md');
  assert.ok(documenti.length >= 10);
  for (const f of documenti) assert.ok(indice.includes(`](${f})`), `docs/README.md non elenca ${f}`);
  const licenza = read('docs/LICENZA-DATI.md');
  for (const dest of ['../LICENSE', '../ATTRIBUZIONI.md']) assert.ok(licenza.includes(`](${dest})`), `docs/LICENZA-DATI.md non rinvia a ${dest}`);
  assert.ok(read('README.md').includes('](docs/DATI-INCORPORATI.md)') && read('README.md').includes('](docs/LICENZA-DATI.md)'), 'il README non rinvia ai due documenti nuovi');
  assert.ok(read('ATTRIBUZIONI.md').includes('](docs/LICENZA-DATI.md)'), 'ATTRIBUZIONI.md non rinvia a docs/LICENZA-DATI.md');
  assert.ok(read('docs/FONTI.md').includes('](DATI-INCORPORATI.md)') && read('docs/METODOLOGIA.md').includes('](DATI-INCORPORATI.md)'), 'FONTI.md e METODOLOGIA.md devono rinviare all\'inventario');
});
