// Controlli sulle copie di riferimento (versione 23, map-overlay e archive/). Nessuna è la pagina attuale e nessuna prova nel browser
// le carica, ma tutte e tre partono dal 31 dicembre 1960 come la pagina attuale e, per gli Stati degli elenchi di popolazione, dicono gli
// stessi valori e gli stessi status del file dei dati (src/data/population_1960.json). Senza browser.
// Esegui con: node --test      (che cosa distingue le copie dalla pagina attuale: src/README.md)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const COPIE = [
  ['la versione 23', 'src/storia-alternativa-prototipo-v23.html'],
  ['la map-overlay', 'src/storia-alternativa-prototipo-map-overlay.html'],
  ['la copia in archive/', 'archive/storia-alternativa-prototipo.html'],
];
const dati = JSON.parse(read('src/data/population_1960.json'));
const mapId = r => r.map_id ?? null;

// Legge un elenco scritto nella pagina («const NOME = [ … ];») valutando solo quell'elenco, non il resto del codice della pagina.
function elenco(testo, nome) {
  const marca = `const ${nome} = [`;
  const i = testo.indexOf(marca);
  assert.ok(i >= 0, `elenco ${nome} non trovato`);
  const j = testo.indexOf('\n  ];', i);
  assert.ok(j > i, `fine dell'elenco ${nome} non trovata`);
  return vm.runInNewContext('(' + testo.slice(i + marca.length - 1, j + 4) + ')', {}, { timeout: 2000 });
}

test('la data di riferimento del file dei dati è il 31 dicembre 1960 (la data che le copie devono avere)', () => {
  assert.strictEqual(dati.meta.reference_date, '1960-12-31');
});

for (const [nome, file] of COPIE) {
  const testo = read(file);

  test(`${nome} parte dal 31 dicembre 1960: titolo e anno della partita, nessun «1 gennaio»`, () => {
    assert.match(testo, /Scenario fisso — Europa, 31 dicembre 1960/, 'il titolo dello scenario non dice 31 dicembre 1960');
    assert.match(testo, /state\.year = '31 dicembre 1960';/, 'l\'anno della partita non è 31 dicembre 1960');
    assert.doesNotMatch(testo, /1 gennaio 1960|1 Jan 1960/, 'resta una data del 1 gennaio 1960');
  });

  test(`${nome}: l'etichetta dello status dice «al 31 dicembre 1960»`, () => {
    assert.ok(testo.includes("'Status al 31 dicembre 1960: '"), 'etichetta nuova non trovata');
    assert.ok(!testo.includes("'Status nel 1960: '"), 'resta l\'etichetta vecchia «Status nel 1960:»');
  });

  test(`${nome}: valori e status degli elenchi di popolazione sono quelli del file dei dati`, () => {
    const A = elenco(testo, 'POPULATION_1960');
    const B = elenco(testo, 'POPULATION_1960_B');
    assert.ok(A.length > 0 && B.length > 0, 'elenchi vuoti');
    const valoriDi = r => [r.value, ...(r.alternative_values || []).map(a => a.value)];
    const problemi = [];
    for (const r of A) {
      // elenco A: il valore deve esistere nel file dei dati (come valore o come valore alternativo; per esempio Cipro 580.000)
      if (!dati.records.some(x => mapId(x) === (r.code ?? null) && valoriDi(x).includes(r.n))) {
        problemi.push(`elenco A: ${r.stato} (${r.code}) ${r.n} non è nel file dei dati`);
      }
    }
    for (const r of B) {
      // elenco B: un solo record con lo stesso map_id e lo stesso valore, e lo stesso status
      const c = dati.records.filter(x => mapId(x) === (r.code ?? null) && x.value === r.n);
      if (c.length !== 1) { problemi.push(`elenco B: ${r.entita} (${r.code}) ${r.n}: ${c.length} record corrispondenti nel file dei dati (ne serve uno)`); continue; }
      if (c[0].status_1960_12_31 !== r.status) problemi.push(`elenco B: ${r.entita}: status «${r.status}» ≠ file dei dati «${c[0].status_1960_12_31}»`);
    }
    assert.deepStrictEqual(problemi, [], `${problemi.join('\n')}\nAllinea la copia al file dei dati (o il contrario) e ripeti la prova.`);
  });

  test(`${nome}: Cipro è uno Stato sovrano giocabile (indipendente dal 16 agosto 1960)`, () => {
    const voce = testo.match(/^\s{4}CYP:\s*\{[^\n]*\},?$/m);
    assert.ok(voce, 'la voce di Cipro non è stata trovata tra gli Stati');
    assert.match(voce[0], /playable:\s*true/, 'Cipro non è giocabile');
    assert.doesNotMatch(voce[0], /sovereign:\s*false|parentCountry/, 'Cipro risulta non sovrano o parte di un altro Stato');
    assert.doesNotMatch(voce[0], /Colonia/, 'Cipro risulta ancora una colonia');
    const provincia = testo.match(/^\s{4}CYP_MAIN:\s*mkProv\("Cipro","([A-Z]+)"/m); // nelle due copie a 95 province Cipro ha una sola provincia
    if (provincia) assert.strictEqual(provincia[1], 'CYP', 'la provincia di Cipro non appartiene a Cipro');
  });

  test(`${nome}: se uno Stato ha l'alleanza «da verificare», la legenda della mappa lo spiega`, () => {
    if (!/alliance:"da verificare"/.test(testo)) return;
    assert.match(testo, /\.dot\.nd\s*\{/, 'manca la regola di colore .dot.nd');
    assert.match(testo, /<i class="dot nd"[^>]*><\/i>Alleanza da verificare/, 'manca la voce «Alleanza da verificare» nella legenda');
  });
}
