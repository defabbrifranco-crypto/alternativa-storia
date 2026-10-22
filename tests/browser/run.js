// Esegue le prove del browser una dopo l'altra e ne riassume l'esito.
//   node tests/browser/run.js            tutte, tranne le prestazioni
//   node tests/browser/run.js --perf     comprese le prestazioni (le soglie dipendono dalla macchina)
//   PAGE=percorso/pagina.html node tests/browser/run.js    prova un altro file
// Serve Playwright (vedi README.md in questa cartella).
const { spawnSync } = require('child_process');
const path = require('path');

const SUITES = [
  ['t1_basic.js', 'Caricamento, mappa e province'],
  ['t2_panel.js', 'Pannello della nazione e scheda della provincia'],
  ['t3_game.js', 'Partita, turni e contesto inviato all\'AI (risposte simulate)'],
  ['t4_save.js', 'Salvataggio, caricamento e migrazione'],
  ['t5_touch.js', 'Telefono: tocco, pizzico, trascinamento'],
  ['t7_search.js', 'Ricerca di province e nazioni'],
  ['t8_labels.js', 'Etichette sulla mappa'],
  ['t10_markers.js', 'Segnaposto'],
  ['t11_engine.js', 'Motore: sovranità e controllo, sessioni, validazione dei salvataggi'],
  ['t12_providers.js', 'Fuori da Claude: salvataggi nel browser, esporta/importa, modalità manuale'],
  ['t13_editor.js', 'Modalità Gioco / Editor scenario, legenda di proprietà e controllo, scenario come file'],
  ['t14_a11y.js', 'Accessibilità: punti di riferimento, tastiera sulla mappa, elenco dei territori, contrasto, movimento ridotto'],
];
if (process.argv.includes('--perf')) SUITES.push(['t6_perf.js', 'Prestazioni (soglie dipendenti dalla macchina)']);

let totalPass = 0;
let totalFail = 0;
let broken = 0;

for (const [file, label] of SUITES) {
  const r = spawnSync(process.execPath, [path.join(__dirname, file)], {
    encoding: 'utf8',
    env: process.env,
    maxBuffer: 64 * 1024 * 1024,
    timeout: 5 * 60 * 1000,
  });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(/(\d+) passed, (\d+) failed/);
  if (!m) {
    broken++;
    console.log(`ROTTA  ${file}  ${label}`);
    console.log(out.split('\n').slice(-12).join('\n'));
    continue;
  }
  const pass = Number(m[1]);
  const fail = Number(m[2]);
  totalPass += pass;
  totalFail += fail;
  console.log(`${fail ? 'FALLITA' : 'ok     '} ${file}  ${label}  (${pass} controlli${fail ? `, ${fail} falliti` : ''})`);
  if (fail) console.log(out.split('\n').filter(l => /FAIL/.test(l)).join('\n'));
}

console.log(`\nTotale: ${totalPass} controlli superati, ${totalFail} falliti${broken ? `, ${broken} prove non completate` : ''}`);
process.exit(totalFail || broken ? 1 : 0);
