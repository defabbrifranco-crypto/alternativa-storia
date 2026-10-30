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
  assert.ok(Number(page[1]) >= 26, 'la versione scritta nella pagina non è aggiornata');
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

// ---- Accessibilità (issue #4): controlli che non richiedono il browser. Le prove vere sono in tests/browser/t14_a11y.js.
const bodyStart = html.indexOf('<body');
const body = html.slice(bodyStart, html.indexOf('<script', bodyStart));      // il documento, senza il codice
const css = html.slice(html.indexOf('<style'), html.indexOf('</style>'));
const bodyIds = [...body.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);

test('accessibilità: un solo <main>, collegamento «Vai al contenuto», area per gli annunci', () => {
  assert.strictEqual((body.match(/<main[ >]/g) || []).length, 1, 'ci deve essere un solo <main>');
  assert.ok(/<a class="skip-link" href="#main" id="skipLink">/.test(body), 'manca il collegamento «Vai al contenuto»');
  assert.ok(/<main[^>]*id="main"[^>]*tabindex="-1"/.test(body), 'il <main> deve poter ricevere il focus');
  assert.ok(/id="a11yStatus" role="status" aria-live="polite"/.test(body), 'manca l\'area degli annunci (role="status")');
  assert.ok(/<html lang="it">/.test(html));
});

test('accessibilità: nessun id ripetuto, riferimenti ARIA che puntano a qualcosa, nessun tabindex positivo', () => {
  assert.deepStrictEqual(bodyIds.filter((id, i) => bodyIds.indexOf(id) !== i), [], 'id ripetuti');
  for (const attr of ['aria-labelledby', 'aria-describedby', 'aria-controls']) {
    for (const m of body.matchAll(new RegExp(attr + '="([^"]+)"', 'g'))) {
      for (const id of m[1].split(/\s+/)) assert.ok(bodyIds.includes(id), `${attr}="${id}" non punta a nessun elemento`);
    }
  }
  assert.ok(!/tabindex="[1-9]/.test(html), 'tabindex positivo: cambia l\'ordine naturale della tastiera');
});

test('accessibilità: ogni etichetta è legata a un campo, ogni pulsante ha un nome', () => {
  for (const m of body.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/g)) {
    const f = /\bfor="([^"]+)"/.exec(m[1]);
    if (f) assert.ok(bodyIds.includes(f[1]), `<label for="${f[1]}"> non punta a nessun campo`);
    else assert.ok(/<(input|select|textarea)\b/.test(m[2]), 'etichetta senza campo: ' + m[0].slice(0, 80));
  }
  // un pulsante senza testo (il testo può arrivare dal codice) deve avere almeno aria-label
  for (const m of body.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    const text = m[2].replace(/<span aria-hidden="true">[^<]*<\/span>/g, '').replace(/<[^>]+>/g, '').trim();
    const id = (/\bid="([^"]+)"/.exec(m[1]) || [])[1] || m[0].slice(0, 40);
    assert.ok(text || /aria-label="[^"]+"/.test(m[1]), 'pulsante senza nome: ' + id);
  }
});

test('accessibilità: il foglio di stile rispetta le preferenze di sistema e non nasconde il focus', () => {
  for (const q of ['@media (prefers-reduced-motion: reduce)', '@media (forced-colors: active)', ':focus-visible']) {
    assert.ok(css.includes(q), 'manca ' + q);
  }
  // ogni «outline: none» deve avere un'alternativa visibile: oggi sono tre, tutte con un segno di sostituzione provato in t14_a11y.js
  const lines = css.split('\n').filter(l => /outline\s*:\s*(none|0)\b/.test(l)).map(l => l.trim());
  const allowed = ['.marker-layer .marker, .marker-layer .mk-cluster {', 'main:focus {', '.province-poly:focus {'];
  for (const l of lines) assert.ok(allowed.some(a => l.startsWith(a)), 'outline tolto senza alternativa: ' + l.slice(0, 80));
});

test('index.html porta alla pagina e il file esiste', () => {
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const m = index.match(/http-equiv="refresh" content="0; url=([^"]+)"/);
  assert.ok(m, 'manca il reindirizzamento');
  assert.strictEqual(m[1], PAGE_REL);
  assert.ok(fs.existsSync(path.join(root, m[1])));
  assert.ok(index.includes(`href="${PAGE_REL}"`), 'manca il collegamento di riserva');
});
