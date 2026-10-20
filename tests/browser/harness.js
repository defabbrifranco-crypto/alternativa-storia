// Harness condiviso: carica la pagina in un Chromium reale con una finta window.claude (db + sample),
// senza rete e senza AI. Il file della pagina non viene mai modificato: il gancio di prova (window.__t)
// viene iniettato in una copia temporanea, cancellata alla fine.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');
// Pagina da provare: variabile PAGE, altrimenti la versione attuale del repository.
const SRC = path.resolve(process.env.PAGE || path.join(__dirname, '..', '..', 'src', 'storia-alternativa-prototipo.html'));
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'storia-test-'));
process.on('exit', () => { try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); } catch (e) { /* niente */ } });

function instrument(html) {
  const tail = '  refreshResumeBanner();\n})();';
  if (!html.includes(tail)) throw new Error('hook point not found');
  const hook = `  refreshResumeBanner();
  window.__t = { countries, provinces, initialTerritory, selectCountry, selectProvince, changeProvinceOwner, changeProvinceController,
    getCountryProvinces, applyTerritoryChanges, territoryContext, territoryRules, relevantProvinces, buildSavePayload, applySave,
    saveGame, loadGame, startFixedScenarioGame, openProvincePanel, focusProvince, updateLabels, goHome, mentionedCountries, resetGame,
    labelEls, provinceEls, get scale(){return scale}, get tx(){return tx}, get ty(){return ty}, get VBW(){return VBW},
    getState: () => state, getMapGameStarted: () => mapGameStarted, getGameMode: () => gameMode, getSelectedProvince: () => selectedProvinceId,
    legacyTargets, LEGACY, MAX_CHANGES, REGION_UNITS, searchTerritories, focusCountry, stateBounds, mainProvinceOf, foldName,
    setView: (x, y, s) => { scale = s; tx = VBW / 2 - s * x; ty = 1029 - s * y; updateTransform(); updateLabels(); } };
  if (typeof markers !== 'undefined') Object.assign(window.__t, {
    getMarkers: () => markers, getSelectedMarkerId: () => selectedMarkerId, getLastClusters: () => lastClusters, getMarkerSeq: () => markerSeq,
    MARKER_TYPES, MARKER_ORDER, MARKER_ALIASES, MAX_MARKERS, MAX_MARKER_OPS, addMarker, removeMarker, clearMarkers, applyMarkerChanges, selectMarker,
    showMarkerGroup, layoutMarkers, resolveMarkerSpot, anchorOf, provinceAt, inProvince, geoToMap, markerRules, markerSchema, markersForSave,
    applyMarkersSave, markerKind, markerBadge, focusMarker, tapCluster, markerEls, clusterEls });
  if (typeof gameSession !== 'undefined') Object.assign(window.__t, { getGameSession: () => gameSession, getDiploSession: () => diplomacySession,
    applyControlChanges: typeof applyControlChanges === 'undefined' ? null : applyControlChanges, getGameOver: () => gameOver, checkGameOver, getControlledProvinces: typeof getControlledProvinces === 'undefined' ? null : getControlledProvinces, renderMapColors, refreshResumeBanner });
  if (typeof storageKind !== 'undefined') Object.assign(window.__t, { getStorageKind: () => storageKind, aiViaClaude, getManualForced: () => manualForced,
    parseManualJson, promptText, openTransfer, cancelManual, saveVersion, askManual });
  if (typeof editorMode !== 'undefined') Object.assign(window.__t, { getEditorMode: () => editorMode, setEditorMode, updateModeUI, scenarioEdits,
    restoreStartingScenario, transferProvince, renderOccupations });
})();`;
  return html.replace(tail, hook);
}

let launches = 0;
// Opzioni: withClaude=false prova la pagina senza window.claude (come su GitHub Pages); blockStorage=true fa lanciare
// un errore a localStorage; seedLocal precarica chiavi di localStorage (una sola volta); serve=true apre la pagina
// da un piccolo server http locale invece che da file://. withDownloads=false toglie a Claude la capacità «downloads».
async function launch({ width = 390, height = 844, store = {}, withSample = true, withDb = true, withClaude = true, withDownloads = true,
  blockStorage = false, seedLocal = null, serve = false, mobile = true, colorScheme = 'light' } = {}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: mobile, isMobile: mobile, colorScheme });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  await page.exposeFunction('__dbGet', async p => (p in store ? JSON.stringify(store[p]) : null));
  await page.exposeFunction('__dbSet', async (p, j) => { store[p] = JSON.parse(j); });
  await page.addInitScript(({ withSample, withDb, withClaude, withDownloads, blockStorage, seedLocal }) => {
    if (seedLocal && !blockStorage) {
      try {
        if (!localStorage.getItem('__seeded')) { for (const k in seedLocal) localStorage.setItem(k, seedLocal[k]); localStorage.setItem('__seeded', '1'); }
      } catch (e) { /* niente */ }
    }
    if (blockStorage) {
      Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('denied', 'SecurityError'); } });
    }
    window.__prompts = []; window.__queue = [];
    const db = { doc: path => ({
      set: async d => { await window.__dbSet(path, JSON.stringify(d)); },
      get: async () => { const j = await window.__dbGet(path); return { exists: j !== null, data: () => (j ? JSON.parse(j) : null) }; }
    }) };
    window.__textQueue = [];
    // a queued value may be an Error (thrown) or a promise (an answer still on its way: tests settle it later)
    window.__deferred = () => { let res, rej; const p = new Promise((a, b) => { res = a; rej = b; }); return { p, res, rej }; };
    const sample = async (p) => {
      window.__prompts.push(p);
      const r = window.__textQueue.shift();
      if (r instanceof Error) throw r;
      if (r && typeof r.then === 'function') return await r;
      return r || { text: 'Risposta di prova del consigliere.' };
    };
    sample.json = async (p) => {
      window.__prompts.push(p);
      const r = window.__queue.shift();
      if (r instanceof Error) throw r;
      if (r && typeof r.then === 'function') return await r;
      return r || { evento_titolo: 'Titolo di prova', narrativa: 'Narrativa di prova.', riepilogo_mondo: 'Riepilogo.', nuovo_anno: 'gennaio 1961', stabilita: 55, economia: 55, esercito: 55, prestigio: 55, cambi_territoriali: [] };
    };
    // downloads: the viewer's save dialog; window.__downloadsFail = 'declined' (or another code) makes it refuse
    window.__downloads = []; window.__downloadsFail = null;
    const downloads = { save: async req => {
      if (window.__downloadsFail) { const e = new Error('refused'); e.code = window.__downloadsFail; throw e; }
      window.__downloads.push({ filename: req.filename, data: req.data });
      return { status: 'saved' };
    } };
    if (withClaude) window.claude = { use: async (name) => (name === 'db' ? (withDb ? db : null) : name === 'sample' ? (withSample ? sample : null) : name === 'downloads' ? (withDownloads ? downloads : null) : null) };
  }, { withSample, withDb, withClaude, withDownloads, blockStorage, seedLocal });
  const html = instrument(fs.readFileSync(SRC, 'utf8'));
  const tmp = path.join(TMP_DIR, 'pagina-' + (++launches) + '.html');
  fs.writeFileSync(tmp, html);
  let server = null;
  let url = 'file://' + tmp;
  if (serve) {
    const http = require('http');
    const body = Buffer.from(html);
    server = http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(body); });
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    url = 'http://127.0.0.1:' + server.address().port + '/';
    const close = browser.close.bind(browser);
    browser.close = async () => { await close(); server.close(); };
  }
  await page.goto(url);
  await page.waitForFunction(() => window.__t, null, { timeout: 15000 });
  await page.waitForTimeout(150);
  return { browser, ctx, page, errors, store, url };
}

let pass = 0, fail = 0; const fails = [];
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; fails.push(name); console.log('  FAIL ' + name + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); }
}
function summary() { console.log(`\n${pass} passed, ${fail} failed`); if (fail) console.log('FAILED:', fails); return fail; }
module.exports = { launch, check, summary, SRC };
