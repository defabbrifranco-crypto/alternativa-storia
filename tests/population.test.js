// Esegui con: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const data = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'population_1960.json'), 'utf8')
);
const sources = Object.keys(data.meta.sources);

test('ogni record ha una fonte registrata', () => {
  for (const r of data.records) {
    assert.ok(sources.includes(r.source_id), `${r.id}: source_id non registrato (${r.source_id})`);
  }
});

test('i valori sono interi positivi', () => {
  for (const r of data.records) {
    assert.ok(Number.isInteger(r.value) && r.value > 0, `${r.id}: value non valido`);
    for (const a of r.alternative_values) {
      assert.ok(Number.isInteger(a.value) && a.value > 0, `${r.id}: alternativa non valida`);
    }
  }
});

test('gli id sono univoci', () => {
  const ids = data.records.map(r => r.id);
  assert.strictEqual(new Set(ids).size, ids.length);
});

test('un map_id condiviso richiede aggregation=show_not_sum', () => {
  const byMap = {};
  for (const r of data.records) {
    if (!r.map_id) continue;
    (byMap[r.map_id] = byMap[r.map_id] || []).push(r);
  }
  for (const [mapId, list] of Object.entries(byMap)) {
    if (list.length > 1) {
      assert.ok(list.every(r => r.aggregation === 'show_not_sum'), `${mapId}: record multipli senza show_not_sum`);
    }
  }
});

test('uno status revisionato deve avere una nota o un flag', () => {
  for (const r of data.records) {
    if (r.status_origin === 'revisione') {
      assert.ok(r.flags.length > 0 || r.note, `${r.id}: revisione senza motivazione`);
    }
  }
});

test('nessun valore verificato=true senza fonte primaria', () => {
  for (const r of data.records) {
    if (r.verified) assert.notStrictEqual(r.source_id, 'UN_VIA_JETPUNK', `${r.id}: JetPunk non e fonte primaria`);
  }
});
