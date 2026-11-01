#!/usr/bin/env node
// Mette dentro la pagina una copia IDENTICA del file dei dati di popolazione (issue #8).
//
// La pagina deve funzionare anche aperta da sola (da file, su GitHub Pages, come artifact di Claude), quindi non
// può caricare src/data/population_1960.json da rete: ne porta con sé una copia, scritta fra due marcatori
//     <!-- DATI-POPOLAZIONE-INIZIO ... -->   e   <!-- DATI-POPOLAZIONE-FINE -->
// dentro un blocco <script type="application/json" id="population-1960-data">. La pagina legge quel blocco e riempie
// da lì tutte le schede: non esiste più nessun elenco di numeri scritto a mano nel codice.
//
//   node scripts/incorpora-popolazione.js           aggiorna la copia nella pagina
//   node scripts/incorpora-popolazione.js --check   non scrive: esce con errore se la copia nella pagina è diversa dal file
//
// Si lancia ogni volta che si cambia src/data/population_1960.json. Se ci si dimentica, la prova
// tests/population-pagina.test.js si ferma e lo dice.
const fs = require('node:fs');
const path = require('node:path');

const radice = path.join(__dirname, '..');
// I due file si possono cambiare con le variabili INCORPORA_DATI e INCORPORA_PAGINA: serve solo alle prove, per provare lo strumento
// su copie temporanee senza toccare la pagina vera.
const FILE_DATI = process.env.INCORPORA_DATI || path.join(radice, 'src', 'data', 'population_1960.json');
const FILE_PAGINA = process.env.INCORPORA_PAGINA || path.join(radice, 'src', 'storia-alternativa-prototipo.html');

const INIZIO = '<!-- DATI-POPOLAZIONE-INIZIO (copia di src/data/population_1960.json: non modificare a mano, si aggiorna con «node scripts/incorpora-popolazione.js») -->';
const FINE = '<!-- DATI-POPOLAZIONE-FINE -->';
const APERTURA = '<script type="application/json" id="population-1960-data">';
const CHIUSURA = '</script>';

// Il blocco che la pagina deve contenere, dato il testo del file dei dati.
function bloccoAtteso(testoDati) {
  return [INIZIO, APERTURA, testoDati.replace(/\s+$/, ''), CHIUSURA, FINE].join('\n');
}

// Cerca il blocco nella pagina: restituisce le posizioni di inizio e fine (la fine comprende il marcatore finale).
function trovaBlocco(html) {
  const marca = '<!-- DATI-POPOLAZIONE-INIZIO';
  const a = html.indexOf(marca);
  if (a < 0) throw new Error('nella pagina manca il marcatore «<!-- DATI-POPOLAZIONE-INIZIO»');
  if (html.indexOf(marca, a + 1) >= 0) throw new Error('nella pagina il marcatore di inizio compare più di una volta');
  const b = html.indexOf(FINE, a);
  if (b < 0) throw new Error(`nella pagina manca il marcatore «${FINE}»`);
  if (html.indexOf(FINE, b + 1) >= 0) throw new Error('nella pagina il marcatore di fine compare più di una volta');
  return { da: a, a: b + FINE.length };
}

// Il testo dei dati deve poter stare dentro un blocco <script>: niente chiusure di script né commenti HTML.
function controllaDati(testoDati) {
  JSON.parse(testoDati);                                   // se il file non è JSON valido, si ferma qui
  if (/<\/script/i.test(testoDati)) throw new Error('il file dei dati contiene «</script»: non può stare dentro la pagina');
  if (testoDati.includes('<!--')) throw new Error('il file dei dati contiene «<!--»: non può stare dentro la pagina');
}

function main(argomenti) {
  const soloControllo = argomenti.includes('--check');
  const testoDati = fs.readFileSync(FILE_DATI, 'utf8');
  controllaDati(testoDati);
  const html = fs.readFileSync(FILE_PAGINA, 'utf8');
  const { da, a } = trovaBlocco(html);
  const atteso = bloccoAtteso(testoDati);
  const uguale = html.slice(da, a) === atteso;
  if (soloControllo) {
    if (uguale) { console.log('La copia dei dati nella pagina coincide con src/data/population_1960.json.'); return 0; }
    console.error('La copia dei dati nella pagina è diversa da src/data/population_1960.json.\nPer aggiornarla: node scripts/incorpora-popolazione.js');
    return 1;
  }
  if (uguale) { console.log('Niente da fare: la copia nella pagina era già aggiornata.'); return 0; }
  fs.writeFileSync(FILE_PAGINA, html.slice(0, da) + atteso + html.slice(a));
  console.log('Copia dei dati aggiornata in ' + path.relative(radice, FILE_PAGINA).split(path.sep).join('/') + '.');
  return 0;
}

if (require.main === module) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (e) { console.error('Errore: ' + e.message); process.exitCode = 1; }
}

module.exports = { INIZIO, FINE, APERTURA, CHIUSURA, bloccoAtteso, trovaBlocco, controllaDati };
