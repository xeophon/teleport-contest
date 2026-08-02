// usage: node tools/were-screendiff.mjs <file> [startStep]
import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';
import { decodeScreen, renderCell } from '../frozen/screen-decode.mjs';

const [file, startArg] = process.argv.slice(2);
const start = parseInt(startArg || '0');
const s = JSON.parse(readFileSync(file, 'utf8'));
const norm = normalizeSession(s);
const cSteps = [];
for (const seg of norm.segments) for (const st of seg.steps || []) cSteps.push(st);

const storage = new Map();
const sh = { getItem:k=>storage.has(k)?storage.get(k):null, setItem:(k,v)=>storage.set(k,String(v)), removeItem:k=>storage.delete(k), get length(){return storage.size}, key(i){let n=0;for(const k of storage.keys()){if(n++===i)return k}return null} };
let jsScreens = [], jsCursors = [];
for (const seg of norm.segments) {
  const g = await runSegment({ ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: sh });
  jsScreens = jsScreens.concat(g.getScreens?.() || []);
  jsCursors = jsCursors.concat(g.getCursors?.() || []);
}
const rows = g2 => (decodeScreen(g2) || []).map(r => r.map(renderCell).join(''));
let shown = 0;
for (let i = start; i < cSteps.length && shown < 20; i++) {
  const c = cSteps[i];
  if (!c.screen) { console.log(`step ${i}: C has no screen`); continue; }
  const j = jsScreens[i] || '';
  const cr = rows(c.screen), jr = rows(j);
  const gridSame = JSON.stringify(cr) === JSON.stringify(jr);
  const cursorSame = JSON.stringify(c.cursor) === JSON.stringify(jsCursors[i]);
  if (gridSame && cursorSame) continue;
  shown++;
  console.log(`=== step ${i} key=${JSON.stringify(c.key)} gridSame=${gridSame} cursor C=${JSON.stringify(c.cursor)} JS=${JSON.stringify(jsCursors[i])}`);
  if (!gridSame) for (let y = 0; y < 24; y++) {
    if ((cr[y] || '') !== (jr[y] || '')) {
      console.log(`C : ${cr[y] || ''}`);
      console.log(`JS: ${jr[y] || ''}`);
    }
  }
}
if (!shown) console.log('no screen diffs from step', start);
