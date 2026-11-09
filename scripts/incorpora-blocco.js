// Parte comune degli strumenti che mettono dentro la pagina una copia IDENTICA di un file di dati:
//   scripts/incorpora-popolazione.js   (src/data/population_1960.json, issue #8)
//   scripts/incorpora-stati.js         (src/data/states_1960.json, versione 30)
//
// La pagina deve funzionare anche aperta da sola (da file, su GitHub Pages, come artifact di Claude), quindi non può caricare i file
// dei dati da rete: ne porta con sé una copia, scritta fra due marcatori
//     <!-- DATI-XXX-INIZIO ... -->   e   <!-- DATI-XXX-FINE -->
// dentro un blocco <script type="application/json" id="...">. Ogni strumento ha il suo nome di marcatore, il suo identificativo di blocco
// e i suoi file; il modo di lavorare è lo stesso e sta qui, in un posto solo, così le due copie non possono comportarsi in modo diverso.
//
// Non si lancia da solo: lo usano i due strumenti qui sopra.
const fs = require('node:fs');
const path = require('node:path');

// config: {
//   radice        cartella del progetto (serve solo per scrivere i percorsi nei messaggi)
//   marcatore     parte del nome dei marcatori, per esempio «DATI-POPOLAZIONE» (i marcatori sono «<!-- DATI-POPOLAZIONE-INIZIO …» e «<!-- DATI-POPOLAZIONE-FINE -->»)
//   idBlocco      attributo id del blocco <script>, per esempio «population-1960-data»
//   nomeFileDati  percorso del file dei dati come si scrive nei messaggi, per esempio «src/data/population_1960.json»
//   nomeStrumento percorso dello strumento come si scrive nei messaggi, per esempio «scripts/incorpora-popolazione.js»
//   fileDati      file dei dati da leggere davvero (di norma quello di nomeFileDati; le prove lo sostituiscono con una copia)
//   filePagina    pagina da leggere e aggiornare (le prove la sostituiscono con una copia)
//   descrizione   come si chiama la copia nei messaggi, per esempio «dei dati»
// }
function creaIncorporatore(config) {
  const { radice, marcatore, idBlocco, nomeFileDati, nomeStrumento, fileDati, filePagina, descrizione } = config;
  for (const [nome, valore] of Object.entries({ radice, marcatore, idBlocco, nomeFileDati, nomeStrumento, fileDati, filePagina, descrizione })) {
    if (!valore) throw new Error(`creaIncorporatore: manca «${nome}»`);
  }

  const INIZIO = `<!-- ${marcatore}-INIZIO (copia di ${nomeFileDati}: non modificare a mano, si aggiorna con «node ${nomeStrumento}») -->`;
  const FINE = `<!-- ${marcatore}-FINE -->`;
  const APERTURA = `<script type="application/json" id="${idBlocco}">`;
  const CHIUSURA = '</script>';

  // Il blocco che la pagina deve contenere, dato il testo del file dei dati.
  function bloccoAtteso(testoDati) {
    return [INIZIO, APERTURA, testoDati.replace(/\s+$/, ''), CHIUSURA, FINE].join('\n');
  }

  // Cerca il blocco nella pagina: restituisce le posizioni di inizio e fine (la fine comprende il marcatore finale).
  function trovaBlocco(html) {
    const marca = `<!-- ${marcatore}-INIZIO`;
    const a = html.indexOf(marca);
    if (a < 0) throw new Error(`nella pagina manca il marcatore «${marca}»`);
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
    const testoDati = fs.readFileSync(fileDati, 'utf8');
    controllaDati(testoDati);
    const html = fs.readFileSync(filePagina, 'utf8');
    const { da, a } = trovaBlocco(html);
    const atteso = bloccoAtteso(testoDati);
    const uguale = html.slice(da, a) === atteso;
    if (soloControllo) {
      if (uguale) { console.log(`La copia ${descrizione} nella pagina coincide con ${nomeFileDati}.`); return 0; }
      console.error(`La copia ${descrizione} nella pagina è diversa da ${nomeFileDati}.\nPer aggiornarla: node ${nomeStrumento}`);
      return 1;
    }
    if (uguale) { console.log('Niente da fare: la copia nella pagina era già aggiornata.'); return 0; }
    fs.writeFileSync(filePagina, html.slice(0, da) + atteso + html.slice(a));
    console.log(`Copia ${descrizione} aggiornata in ${path.relative(radice, filePagina).split(path.sep).join('/')}.`);
    return 0;
  }

  // Per lo strumento lanciato dalla riga di comando: stampa l'errore e imposta il codice di uscita.
  function eseguiDaRigaDiComando(argomenti) {
    try { process.exitCode = main(argomenti); }
    catch (e) { console.error('Errore: ' + e.message); process.exitCode = 1; }
  }

  return { INIZIO, FINE, APERTURA, CHIUSURA, bloccoAtteso, trovaBlocco, controllaDati, main, eseguiDaRigaDiComando };
}

module.exports = { creaIncorporatore };
