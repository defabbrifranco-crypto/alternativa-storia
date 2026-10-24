// Controllo di sintassi e di coerenza dei file, senza dipendenze esterne (issue #6).
//
// Non è ESLint: non giudica lo stile. Trova gli errori che rompono la pagina o i controlli automatici senza
// che nessuno se ne accorga: sintassi sbagliata, JSON rotto, codice rimosso rimasto per sbaglio, numeri di
// versione che non coincidono, collegamenti dei documenti che non portano a nulla.
// Esegui con: node --test   (oppure, solo questo controllo: npm run lint)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['.git', 'node_modules']);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
const files = walk(root).map(p => path.relative(root, p).split(path.sep).join('/')).sort();
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const byExt = ext => files.filter(f => f.endsWith(ext));

// Codice tolto di proposito: non deve ricomparire (issue #6).
const RIMOSSI = ['legacyTerritoryRules'];

test('ogni file .js ha una sintassi valida', () => {
  const js = byExt('.js');
  assert.ok(js.length >= 10, 'trovati pochi file .js: il controllo non sta guardando nei posti giusti');
  for (const f of js) {
    const r = spawnSync(process.execPath, ['--check', path.join(root, f)], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0, `${f}: errore di sintassi\n${r.stderr}`);
  }
});

test('gli script dentro le pagine HTML hanno una sintassi valida', () => {
  const pages = byExt('.html');
  assert.ok(pages.length >= 4, 'trovate poche pagine HTML: il controllo non sta guardando nei posti giusti');
  for (const f of pages) {
    const scripts = [...read(f).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
      .filter(m => !/\ssrc\s*=/.test(m[1]))                                  // solo il codice scritto nella pagina
      .filter(m => !/type\s*=\s*["']?(module|application\/json|application\/ld\+json|text\/template)/i.test(m[1]));
    scripts.forEach((m, i) => {
      try { new vm.Script(m[2], { filename: `${f}#script${i + 1}` }); }
      catch (e) { assert.fail(`${f}, script ${i + 1}: ${e.message}`); }
    });
  }
});

test('ogni file .json si legge', () => {
  const js = byExt('.json');
  assert.ok(js.length >= 3, 'trovati pochi file .json: il controllo non sta guardando nei posti giusti');
  for (const f of js) {
    try { JSON.parse(read(f)); } catch (e) { assert.fail(`${f}: ${e.message}`); }
  }
});

test('il codice rimosso non ricompare', () => {
  for (const f of files.filter(f => /\.(html|js)$/.test(f) && f !== 'tests/lint.test.js')) {
    const text = read(f);
    for (const nome of RIMOSSI) assert.ok(!text.includes(nome), `${f} contiene ancora «${nome}»`);
  }
});

test('package.json, CHANGELOG.md e pagina dichiarano la stessa versione', () => {
  const pkg = JSON.parse(read('package.json'));
  const m = /^0\.(\d+)\.0$/.exec(pkg.version);
  assert.ok(m, `package.json: la versione ${pkg.version} non è nella forma 0.N.0`);
  const page = /id="versionNote"[^>]*>Versione (\d+)</.exec(read('src/storia-alternativa-prototipo.html'));
  assert.ok(page, 'manca la nota «Versione N» nella pagina');
  assert.strictEqual(Number(page[1]), Number(m[1]), `la pagina dice «Versione ${page[1]}», package.json dice ${pkg.version}`);
  const log = /^## \[(\d+\.\d+\.\d+)\]/m.exec(read('CHANGELOG.md'));
  assert.ok(log, 'CHANGELOG.md: nessuna versione con il titolo «## [x.y.z]»');
  assert.strictEqual(log[1], pkg.version, `CHANGELOG.md: l'ultima versione è ${log[1]}, package.json dice ${pkg.version}`);
});

test('CITATION.cff c\'è e ha le chiavi obbligatorie del formato 1.2.0', () => {
  assert.ok(files.includes('CITATION.cff'), 'manca CITATION.cff');
  const cff = read('CITATION.cff');
  assert.match(cff, /^cff-version: ["']?1\.2\.0["']?\s*$/m, 'CITATION.cff: cff-version deve essere 1.2.0');
  for (const k of ['message', 'title']) assert.match(cff, new RegExp('^' + k + ':\\s*\\S', 'm'), `CITATION.cff: manca «${k}:»`);
  assert.match(cff, /^authors:\s*\n\s+- \S/m, 'CITATION.cff: serve almeno un autore sotto «authors:»');
});

test('se CITATION.cff dichiara una licenza, il file LICENSE esiste ed è quella', (t) => {
  const dichiarata = /^license:\s*["']?([A-Za-z0-9.+-]+)["']?\s*$/m.exec(read('CITATION.cff'));
  if (!dichiarata) return t.skip('nessuna licenza dichiarata in CITATION.cff');
  assert.ok(files.includes('LICENSE'), `CITATION.cff dichiara «${dichiarata[1]}» ma manca il file LICENSE`);
  const segni = {
    'MIT': 'Permission is hereby granted, free of charge',
    'GPL-3.0-only': 'GNU GENERAL PUBLIC LICENSE',
    'GPL-3.0-or-later': 'GNU GENERAL PUBLIC LICENSE',
  };
  if (segni[dichiarata[1]]) assert.ok(read('LICENSE').includes(segni[dichiarata[1]]), `LICENSE non sembra la licenza «${dichiarata[1]}»`);
});

test('i collegamenti relativi dei documenti portano a file che esistono', () => {
  const docs = byExt('.md');
  assert.ok(docs.length >= 5, 'trovati pochi documenti: il controllo non sta guardando nei posti giusti');
  for (const f of docs) {
    const dir = path.posix.dirname(f);
    const testo = read(f).replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');   // niente blocchi di codice
    for (const m of testo.matchAll(/\[[^\]\n]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      let dest = m[1];
      if (/^(https?:|mailto:|#)/.test(dest)) continue;
      if (/^\.\.\/\.\.\/(issues|pull|pulls|actions|wiki|discussions)\b/.test(dest)) continue;   // collegamenti di GitHub verso issue e pull request
      dest = decodeURIComponent(dest.split('#')[0]);
      if (!dest) continue;
      const risolto = path.posix.normalize(path.posix.join(dir, dest));
      assert.ok(fs.existsSync(path.join(root, risolto)), `${f}: il collegamento «${m[1]}» non porta a un file esistente`);
    }
  }
});

// Legge una costante in forma JSON scritta nella pagina (per esempio «const COUNTRY_NOTES = {...};»).
function leggiCostante(src, nome) {
  const marca = `const ${nome} = `;
  const inizio = src.indexOf(marca);
  assert.ok(inizio >= 0, `nella pagina manca «${marca}»`);
  const i = inizio + marca.length, apre = src[i], chiude = apre === '{' ? '}' : ']';
  let profondita = 0, inStringa = false, esc = false, j = i;
  for (; j < src.length; j++) {
    const c = src[j];
    if (inStringa) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStringa = false; continue; }
    if (c === '"') { inStringa = true; continue; }
    if (c === apre) profondita++;
    else if (c === chiude && --profondita === 0) { j++; break; }
  }
  return JSON.parse(src.slice(i, j));
}

test('i numeri sulle unità in docs/CONFINI-MAPPA.md coincidono con le note della pagina', () => {
  // Solo i numeri che si leggono dal file senza aprire un browser (stati suddivisi, unità disegnate e non).
  // Il documento cita anche il numero delle province: quello si misura nel browser e non è controllato qui.
  const doc = read('docs/CONFINI-MAPPA.md');
  const src = read('src/storia-alternativa-prototipo.html');
  const note = Object.values(leggiCostante(src, 'COUNTRY_NOTES'));
  const singoli = Object.keys(leggiCostante(src, 'SINGLE_NOTES'));
  const somma = f => note.reduce((n, x) => n + f(x), 0);
  const it = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const attese = [
    `Per ${note.length} Stati ogni unità`,
    `Altri ${singoli.length} Stati restano`,
    `l'elenco ha ${it(somma(x => x.nCsv))} unità: ${it(somma(x => x.nUnits))} sono disegnate, ${somma(x => x.unplaced.length)} non lo sono perché la posizione è da verificare e ${somma(x => x.containers.length)} sono unità «contenitore»`,
  ];
  for (const frase of attese) {
    assert.ok(doc.includes(frase), `docs/CONFINI-MAPPA.md non contiene più «${frase}»: i numeri della pagina sono cambiati o il testo è stato modificato`);
  }
});
