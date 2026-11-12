// Il file dei dati degli Stati: src/data/states_1960.json (versione 30, issue #3).
// Nome, capitale, alleanza, colore e giocabilità di ogni Stato, e per ogni capitale e ogni alleanza se è stata verificata e su quale fonte.
// Si controlla che il file rispetti il suo schema, che nessun valore sia segnato «verificato» senza una fonte vera e che i testi dicano la stessa
// cosa dei flag. La copia nella pagina e la scheda del territorio si provano in tests/stati-pagina.test.js e tests/browser/t17_stati.js.
// Esegui con: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'states_1960.json'), 'utf8'));
const schema = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'states_1960.schema.json'), 'utf8'));
const PROTOTIPO = 'PROTOTYPE_LABEL';                         // la «fonte» di ciò che il prototipo ha scritto da sé: non è una fonte
const daVerificare = t => /da verificare/i.test(String(t || ''));

// ---- un controllo minimo dello schema -------------------------------------------------------------------------------
// Nel progetto non ci sono librerie per leggere uno schema JSON: questo controllo conosce solo le parole chiave che lo schema degli Stati usa.
// Se lo schema ne userà una nuova, la prova si ferma e lo dice (non la ignora in silenzio).
const CONOSCIUTE = new Set(['$schema', 'title', 'type', 'required', 'properties', 'items', 'pattern', 'minLength', 'enum', 'uniqueItems', 'additionalProperties']);
const tipoDi = v => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v);
function valida(v, s, p, errori) {
  for (const k of Object.keys(s)) if (!CONOSCIUTE.has(k)) errori.push(`${p}: lo schema usa «${k}», che questo controllo non conosce`);
  if (s.type) {
    const ammessi = [].concat(s.type), t = tipoDi(v);
    if (!ammessi.some(a => a === t || (a === 'number' && t === 'integer'))) { errori.push(`${p}: è di tipo ${t}, doveva essere ${ammessi.join(' o ')}`); return; }
  }
  if (s.enum && !s.enum.includes(v)) errori.push(`${p}: «${v}» non è fra i valori ammessi (${s.enum.join(', ')})`);
  if (typeof v === 'string') {
    if (s.pattern && !new RegExp(s.pattern).test(v)) errori.push(`${p}: «${v}» non rispetta ${s.pattern}`);
    if (s.minLength && v.length < s.minLength) errori.push(`${p}: il testo è troppo corto`);
  }
  if (Array.isArray(v)) {
    if (s.uniqueItems && new Set(v.map(x => JSON.stringify(x))).size !== v.length) errori.push(`${p}: ci sono elementi ripetuti`);
    if (s.items) v.forEach((x, i) => valida(x, s.items, `${p}[${i}]`, errori));
  } else if (v && typeof v === 'object') {
    for (const r of s.required || []) if (!(r in v)) errori.push(`${p}: manca «${r}»`);
    for (const [k, sub] of Object.entries(s.properties || {})) if (k in v) valida(v[k], sub, `${p}.${k}`, errori);
    if (s.additionalProperties && typeof s.additionalProperties === 'object') {
      for (const k of Object.keys(v)) if (!(s.properties && k in s.properties)) valida(v[k], s.additionalProperties, `${p}.${k}`, errori);
    }
  }
}

test('il file rispetta il suo schema, e il controllo dello schema si accorge dei guasti', () => {
  const errori = [];
  valida(data, schema, 'file', errori);
  assert.deepStrictEqual(errori, [], errori.slice(0, 8).join('\n'));
  assert.ok(data.states.length >= 80, 'la prova sta guardando pochi Stati');
  // Il controllo deve fermarsi davanti a un guasto vero, altrimenti non prova nulla.
  const guasta = f => { const copia = JSON.parse(JSON.stringify(data)); f(copia); const e = []; valida(copia, schema, 'file', e); return e; };
  assert.ok(guasta(d => { delete d.states[0].capital_verified; }).length > 0, 'manca capital_verified: non notato');
  assert.ok(guasta(d => { d.states[0].alliance_verified = 'no'; }).length > 0, 'alliance_verified non booleano: non notato');
  assert.ok(guasta(d => { d.states[0].id = 'fra'; }).length > 0, 'identificativo in minuscolo: non notato');
  assert.ok(guasta(d => { d.states[0].color = '#3B6EA5'; }).length > 0, 'colore in maiuscolo: non notato');
  assert.ok(guasta(d => { d.states[0].flags = ['flag_inventato']; }).length > 0, 'flag sconosciuto: non notato');
  assert.ok(guasta(d => { d.states[0].flags = ['capitale_da_verificare', 'capitale_da_verificare']; }).length > 0, 'flag ripetuto: non notato');
  assert.ok(guasta(d => { d.states[0].capital = ''; }).length > 0, 'capitale vuota: non notato');
  assert.ok(guasta(d => { d.meta.sources.X = 5; }).length > 0, 'fonte che non è un testo: non notato');
});

test('ogni record ha solo campi che lo schema descrive, e ogni campo richiesto è descritto', () => {
  const descritti = Object.keys(schema.properties.states.items.properties);
  const richiesti = schema.properties.states.items.required;
  for (const r of richiesti) assert.ok(descritti.includes(r), `lo schema richiede «${r}» ma non lo descrive`);
  for (const s of data.states) {
    for (const k of Object.keys(s)) assert.ok(descritti.includes(k), `${s.id}: il campo «${k}» non è descritto dallo schema (un errore di battitura?)`);
  }
});

test('ogni capitale e ogni alleanza ha una fonte registrata, e ogni fonte registrata è usata', () => {
  const registrate = Object.keys(data.meta.sources);
  assert.ok(registrate.length > 0, 'meta.sources è vuoto');
  const usate = new Set();
  for (const s of data.states) {
    for (const campo of ['capital_source_id', 'alliance_source_id']) {
      assert.ok(registrate.includes(s[campo]), `${s.id}: ${campo} «${s[campo]}» non è registrato in meta.sources`);
      usate.add(s[campo]);
    }
  }
  for (const f of registrate) assert.ok(usate.has(f), `la fonte «${f}» è registrata ma nessuno Stato la usa`);
});

test('nessuna capitale e nessuna alleanza è segnata «verificata» con la fonte che dice «scritta dal prototipo»', () => {
  assert.ok(Object.prototype.hasOwnProperty.call(data.meta.sources, PROTOTIPO), `manca la fonte ${PROTOTIPO}`);
  assert.match(data.meta.sources[PROTOTIPO], /non è un dato verificato/, `${PROTOTIPO} deve dire che non è un dato verificato`);
  for (const s of data.states) {
    if (s.capital_verified) assert.notStrictEqual(s.capital_source_id, PROTOTIPO, `${s.id}: capitale «verificata» con la fonte ${PROTOTIPO}: serve una fonte vera`);
    if (s.alliance_verified) assert.notStrictEqual(s.alliance_source_id, PROTOTIPO, `${s.id}: alleanza «verificata» con la fonte ${PROTOTIPO}: serve una fonte vera`);
  }
  // La regola è scritta nel file, vicino ai dati, e rinvia a questa prova.
  assert.ok(data.meta.verification_policy.includes(PROTOTIPO), 'meta.verification_policy non nomina la fonte ' + PROTOTIPO);
  assert.ok(data.meta.verification_policy.includes('tests/stati.test.js'), 'meta.verification_policy non rinvia a tests/stati.test.js');
  assert.ok(fs.existsSync(path.join(root, 'tests', 'stati.test.js')), 'il file della prova citata in meta.verification_policy non esiste');
});

test('i flag dicono la stessa cosa dei testi: «da verificare» nel testo se e solo se c\'è il flag', () => {
  for (const s of data.states) {
    assert.strictEqual(s.flags.includes('capitale_da_verificare'), daVerificare(s.capital), `${s.id}: il flag capitale_da_verificare e il testo «${s.capital}» non coincidono`);
    assert.strictEqual(s.flags.includes('alleanza_da_verificare'), daVerificare(s.alliance), `${s.id}: il flag alleanza_da_verificare e il testo «${s.alliance}» non coincidono`);
  }
  const con = data.states.filter(s => s.flags.length).map(s => s.id).sort();
  assert.deepStrictEqual(con, ['ARE', 'BRB', 'BTN', 'CYP', 'OMN', 'PAK'], 'gli Stati con un\'avvertenza sono cambiati: aggiornare questa prova e docs/DATI-INCORPORATI.md');
});

test('gli identificativi sono univoci, i nomi e i colori sono tutti diversi', () => {
  const ids = data.states.map(s => s.id);
  assert.strictEqual(new Set(ids).size, ids.length, 'identificativi ripetuti');
  assert.strictEqual(new Set(data.states.map(s => s.name)).size, ids.length, 'due Stati hanno lo stesso nome');
  assert.strictEqual(new Set(data.states.map(s => s.color)).size, ids.length, 'due Stati hanno lo stesso colore: docs/DATI-INCORPORATI.md dice che sono tutti diversi');
});

test('l\'avvertenza generale sta in meta.global_warning e non è ripetuta nei record', () => {
  assert.ok(data.meta.global_warning && data.meta.global_warning.length > 40, 'manca meta.global_warning');
  assert.match(data.meta.global_warning, /non dati storici verificati/, 'l\'avvertenza deve dire che capitali e alleanze non sono dati verificati');
  const chiave = data.meta.global_warning.slice(0, 40);
  for (const s of data.states) assert.ok(!JSON.stringify(s).includes(chiave), `${s.id}: ripete l'avvertenza generale`);
});

test('il file è riferito al 31 dicembre 1960, come la popolazione e la pagina', () => {
  assert.strictEqual(data.meta.reference_date, '1960-12-31');
  const popolazione = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'population_1960.json'), 'utf8'));
  assert.strictEqual(data.meta.reference_date, popolazione.meta.reference_date);
});

test('i testi del file sono in italiano con gli accenti (la pagina li mostra così come sono)', () => {
  // Errori tipici di un testo scritto «senza accenti»: la «e» al posto di «è», «entita» al posto di «entità», eccetera.
  const sbagliati = [/ e (?:riferito|riportato|indipendente|stato|stata|quello)\b/, /\bentita\b/i, /\bcitta\b/i, /\bcosi\b/, /\bcio che\b/, /\ba se\b/, /\bne usci\b/, /\bpiu\b/, /\bnon e\b/];
  const testi = [];
  (function raccogli(x, p) {
    if (typeof x === 'string') testi.push([p, x]);
    else if (Array.isArray(x)) x.forEach((y, i) => raccogli(y, `${p}[${i}]`));
    else if (x && typeof x === 'object') for (const k of Object.keys(x)) if (k !== 'flags' && !k.endsWith('_source_id')) raccogli(x[k], p ? `${p}.${k}` : k);   // i flag e gli identificativi di fonte sono codici
  })(data, '');
  assert.ok(testi.length > 300, 'la prova sta guardando pochi testi');
  for (const [p, t] of testi) for (const re of sbagliati) assert.ok(!re.test(t), `${p}: il testo sembra scritto senza accenti («${(re.exec(t) || [''])[0]}»): «${t.slice(0, 90)}…»`);
});
