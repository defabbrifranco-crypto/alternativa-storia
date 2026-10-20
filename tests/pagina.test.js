// Controlli rapidi sul file della pagina, senza browser.
// Esegui con: node --test   (le prove nel browser sono in tests/browser, vedi il README di quella cartella)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const PAGE_REL = 'src/storia-alternativa-prototipo.html';
const html = fs.readFileSync(path.join(root, PAGE_REL), 'utf8');

test('la pagina è un documento completo, in italiano, adatto al telefono', () => {
  assert.match(html, /^<!DOCTYPE html>/i);
  assert.match(html, /<html lang="it">/);
  assert.match(html, /<meta name="viewport" content="[^"]*width=device-width/);
  assert.match(html, /<title>[^<]+<\/title>/);
  assert.strictEqual((html.match(/<h1[ >]/g) || []).length, 1, 'ci deve essere un solo titolo di primo livello');
});

test('la pagina non carica nulla da internet', () => {
  assert.strictEqual((html.match(/<script[^>]*\ssrc=/g) || []).length, 0, 'script esterni');
  assert.strictEqual((html.match(/<link[^>]*\shref=/g) || []).length, 0, 'fogli di stile o icone esterni');
  assert.strictEqual((html.match(/<img[^>]*\ssrc=["']https?:/g) || []).length, 0, 'immagini esterne');
});

test('la pagina non fa richieste di rete: i dati restano nel browser (le risposte dell\'AI passano solo da Claude o da chi le incolla)', () => {
  for (const api of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'EventSource', 'importScripts']) {
    assert.ok(!html.includes(api), `la pagina usa ${api}`);
  }
});

test('la pagina dichiara la propria versione e la versione dei salvataggi', () => {
  const page = html.match(/id="versionNote"[^>]*>Versione (\d+)</);
  assert.ok(page, 'manca la nota «Versione N» nella pagina');
  const save = html.match(/schemaVersion: (\d+)/);
  assert.ok(save, 'il salvataggio non dichiara schemaVersion');
  assert.ok(Number(page[1]) >= 25, 'la versione scritta nella pagina non è aggiornata');
  assert.ok(Number(save[1]) >= 3);
});

test('la pagina funziona anche senza Claude: sono previsti il salvataggio nel browser e la modalità manuale', () => {
  for (const id of ['manualDialog', 'transferDialog', 'exportBtn', 'importBtn', 'manualToggle']) {
    assert.ok(html.includes(`id="${id}"`), `manca l'elemento ${id}`);
  }
  assert.ok(html.includes("const LS_PREFIX = 'storia-alternativa:'"));
});

test('Gioco ed Editor scenario sono modalità separate, e la legenda di proprietà e controllo c\'è sempre', () => {
  for (const id of ['modeGameBtn', 'modeEditBtn', 'modeNote', 'editorResetBtn', 'ownLegend', 'ownHelp', 'occNote', 'pp-lockNote']) {
    assert.ok(html.includes(`id="${id}"`), `manca l'elemento ${id}`);
  }
  // i comandi manuali (cedere una provincia, aggiungere un segnaposto) stanno solo nell'Editor
  assert.ok(/<div class="demo-box editor-only">\s*<label for="pp-transferSelect">/.test(html), 'i comandi di cessione non sono riservati all\'Editor');
  assert.ok(/<div class="demo-box editor-only">\s*<label for="pp-markerType">/.test(html), 'l\'aggiunta di segnaposto non è riservata all\'Editor');
  assert.ok(html.includes('body.editing .editor-only { display:block; }') && html.includes('.editor-only { display:none; }'));
  // la legenda spiega proprietario e controllore a parole
  assert.ok(html.includes('<b>Colore pieno</b>') && html.includes('<b>Righe diagonali</b>'));
  assert.ok(html.includes('Proprietario e controllore: che differenza c'));
});

test('index.html porta alla pagina e il file esiste', () => {
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const m = index.match(/http-equiv="refresh" content="0; url=([^"]+)"/);
  assert.ok(m, 'manca il reindirizzamento');
  assert.strictEqual(m[1], PAGE_REL);
  assert.ok(fs.existsSync(path.join(root, m[1])));
  assert.ok(index.includes(`href="${PAGE_REL}"`), 'manca il collegamento di riserva');
});
