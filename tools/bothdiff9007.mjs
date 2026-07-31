import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';
import { decodeScreen, diffCell, ROWS_24, COLS_80 } from '../frozen/screen-decode.mjs';
const s = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const storage = new Map();
const storageHandle = { getItem(k){return storage.get(k)??null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){return [...storage.keys()][i]??null;} };
const g = await runSegment({...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, storage: storageHandle});
const jsScreens = g.getScreens?.() || [];
const jsCursors = g.getCursors?.() || [];
function preDecode(str){return String(str);}
function stEq(a,b){
  const ga = decodeScreen(preDecode(a)), gb = decodeScreen(preDecode(b));
  for (let r=0;r<ROWS_24;r++) for (let c=0;c<COLS_80;c++) if (diffCell(ga[r][c], gb[r][c])) return false;
  return true;
}
for (let i=0;i<seg.steps.length;i++){
  const c = seg.steps[i];
  const eq = stEq(c.screen, jsScreens[i] || '');
  const cj = jsCursors[i];
  const ceq = !Array.isArray(c.cursor) || (Array.isArray(cj) && cj[0]===c.cursor[0] && cj[1]===c.cursor[1] && cj[2]===c.cursor[2]);
  if (!eq || !ceq) console.log(`step ${i} key=${JSON.stringify(c.key)} screen=${eq?'OK':'X'} cursor=${ceq?'OK':`X C=${JSON.stringify(c.cursor)} JS=${JSON.stringify(cj)}`}`);
  if (process.argv[3] && !eq && Number(process.argv[3]) === i) {
    const ga = decodeScreen(preDecode(c.screen)), gb = decodeScreen(preDecode(jsScreens[i]||''));
    for (let r=0;r<ROWS_24;r++){
      const ca = ga[r].map(c=>c.ch||' ').join(''), cb = gb[r].map(c=>c.ch||' ').join('');
      if (ca!==cb) console.log('C :'+ca+'\nJS:'+cb);
    }
  }
}
console.log('total', seg.steps.length);
