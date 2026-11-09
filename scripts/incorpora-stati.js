#!/usr/bin/env node
// Mette dentro la pagina una copia IDENTICA del file dei dati degli Stati: nome, capitale, alleanza, colore, giocabilità
// e, per ogni capitale e ogni alleanza, se è stata verificata (versione 30, issue #3).
//
// Come per la popolazione (scripts/incorpora-popolazione.js), la pagina non può caricare src/data/states_1960.json da rete: ne porta con sé
// una copia, scritta fra due marcatori
//     <!-- DATI-STATI-INIZIO ... -->   e   <!-- DATI-STATI-FINE -->
// dentro un blocco <script type="application/json" id="states-1960-data">. La pagina legge quel blocco e costruisce da lì la tabella
// degli Stati: non esiste più nessun elenco di capitali e alleanze scritto a mano nel codice.
//
//   node scripts/incorpora-stati.js           aggiorna la copia nella pagina
//   node scripts/incorpora-stati.js --check   non scrive: esce con errore se la copia nella pagina è diversa dal file
//
// Si lancia ogni volta che si cambia src/data/states_1960.json. Se ci si dimentica, la prova tests/stati-pagina.test.js si ferma e lo dice.
//
// Il modo di lavorare è comune a questo strumento e a scripts/incorpora-popolazione.js: sta in scripts/incorpora-blocco.js.
const path = require('node:path');
const { creaIncorporatore } = require('./incorpora-blocco.js');

const radice = path.join(__dirname, '..');

const incorporatore = creaIncorporatore({
  radice,
  marcatore: 'DATI-STATI',
  idBlocco: 'states-1960-data',
  nomeFileDati: 'src/data/states_1960.json',
  nomeStrumento: 'scripts/incorpora-stati.js',
  // I due file si possono cambiare con le variabili INCORPORA_STATI (il file dei dati) e INCORPORA_PAGINA (la pagina, la stessa variabile
  // dello strumento della popolazione): serve solo alle prove, per provare lo strumento su copie temporanee senza toccare la pagina vera.
  fileDati: process.env.INCORPORA_STATI || path.join(radice, 'src', 'data', 'states_1960.json'),
  filePagina: process.env.INCORPORA_PAGINA || path.join(radice, 'src', 'storia-alternativa-prototipo.html'),
  descrizione: 'dei dati degli Stati',
});

if (require.main === module) incorporatore.eseguiDaRigaDiComando(process.argv.slice(2));

const { INIZIO, FINE, APERTURA, CHIUSURA, bloccoAtteso, trovaBlocco, controllaDati } = incorporatore;
module.exports = { INIZIO, FINE, APERTURA, CHIUSURA, bloccoAtteso, trovaBlocco, controllaDati };
