#!/usr/bin/env node
// Mette dentro la pagina una copia IDENTICA del file dei dati di popolazione (issue #8).
//
// La pagina deve funzionare anche aperta da sola (da file, su GitHub Pages, come artifact di Claude), quindi non può
// caricare src/data/population_1960.json da rete: ne porta con sé una copia, scritta fra due marcatori
//     <!-- DATI-POPOLAZIONE-INIZIO ... -->   e   <!-- DATI-POPOLAZIONE-FINE -->
// dentro un blocco <script type="application/json" id="population-1960-data">. La pagina legge quel blocco e riempie
// da lì tutte le schede: non esiste più nessun elenco di numeri scritto a mano nel codice.
//
//   node scripts/incorpora-popolazione.js           aggiorna la copia nella pagina
//   node scripts/incorpora-popolazione.js --check   non scrive: esce con errore se la copia nella pagina è diversa dal file
//
// Si lancia ogni volta che si cambia src/data/population_1960.json. Se ci si dimentica, la prova
// tests/population-pagina.test.js si ferma e lo dice.
//
// Il modo di lavorare è comune a questo strumento e a scripts/incorpora-stati.js (i dati degli Stati, dalla versione 30): sta in
// scripts/incorpora-blocco.js. Qui ci sono solo i nomi e i file della popolazione.
const path = require('node:path');
const { creaIncorporatore } = require('./incorpora-blocco.js');

const radice = path.join(__dirname, '..');

const incorporatore = creaIncorporatore({
  radice,
  marcatore: 'DATI-POPOLAZIONE',
  idBlocco: 'population-1960-data',
  nomeFileDati: 'src/data/population_1960.json',
  nomeStrumento: 'scripts/incorpora-popolazione.js',
  // I due file si possono cambiare con le variabili INCORPORA_DATI e INCORPORA_PAGINA: serve solo alle prove, per provare lo strumento
  // su copie temporanee senza toccare la pagina vera.
  fileDati: process.env.INCORPORA_DATI || path.join(radice, 'src', 'data', 'population_1960.json'),
  filePagina: process.env.INCORPORA_PAGINA || path.join(radice, 'src', 'storia-alternativa-prototipo.html'),
  descrizione: 'dei dati',
});

if (require.main === module) incorporatore.eseguiDaRigaDiComando(process.argv.slice(2));

const { INIZIO, FINE, APERTURA, CHIUSURA, bloccoAtteso, trovaBlocco, controllaDati } = incorporatore;
module.exports = { INIZIO, FINE, APERTURA, CHIUSURA, bloccoAtteso, trovaBlocco, controllaDati };
