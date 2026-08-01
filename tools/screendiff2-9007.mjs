
import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';
import { decodeScreen, renderCell, diffCell } from '../frozen/screen-decode.mjs';

const s = JSON.parse(readFileSync(new URL('../sessions-extra/seed9007-valley-sacrifice.session.json', import.meta.url), 'utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const cSteps = s.segments[0].steps;

const storage = new Map();
const storageHandle = { getItem(k){return storage.get(k)??null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){return [...storage.keys()][i]??null;} };
const g = await runSegment({ ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, moves: seg.moves, storage: storageHandle });
const jsScreens = g.getScreens();
const jsCursors = g.getCursors?.() || [];
console.log('cSteps', cSteps.length, 'jsScreens', jsScreens.length);

const args = process.argv.slice(2);
const want = args.length ? args[0] : null;
let first = -1;
for (let i = 0; i < cSteps.length; i++) {
  const ok = (()=>{ const ga = decodeScreen(cSteps[i].screen||''); const gb = decodeScreen(jsScreens[i]||'');
    for (let r=0;r<24;r++) for (let c=0;c<80;c++) if (diffCell(ga[r][c], gb[r][c])) return false; return true; })();
  const curOk = (()=>{ const c = cSteps[i].cursor; const j = jsCursors[i]; if (!Array.isArray(c)) return true; if (!Array.isArray(j)) return false; return c[0]===j[0]&&c[1]===j[1]&&c[2]===j[2]; })();
  if (!ok || !curOk) {
    if (first < 0) { first = i; console.log(`FIRST DIFF at step ${i} key=${JSON.stringify(cSteps[i].key)} cellsOk=${ok} cursorOk=${curOk}`); }
    if (want != null && parseInt(want) === i) {
      const ga = decodeScreen(cSteps[i].screen||''); const gb = decodeScreen(jsScreens[i]||'');
      for (let r=0;r<24;r++){
        let ca = ga[r].map(renderCell).join('');
        let cb = gb[r].map(renderCell).join('');
        console.log(`C${r.toString().padStart(2)}|${ca}`);
        if (ca!==cb) console.log(`J${r.toString().padStart(2)}|${cb}`);
      }
      console.log('C cursor', cSteps[i].cursor, 'JS cursor', jsCursors[i]);
    } else if (parseInt(want) < 0) {
      console.log(`step ${i} cellsOk=${ok} cursorOk=${curOk}`);
    }
  }
}
console.log('total failing', ...(()=>{let n=0; return [n]})(), '');
