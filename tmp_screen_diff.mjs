
import { readFileSync } from 'fs';
import { normalizeSession } from './frozen/session_loader.mjs';
import { runSegment } from './js/jsmain.js';
const { decodeScreen, renderCell } = await import('./frozen/screen-decode.mjs');
const s = JSON.parse(readFileSync('sessions-extra/seed9105-wiz-archlich-spells.session.json','utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const storage = new Map();
const storageHandle = { getItem(k){return storage.has(k)?storage.get(k):null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){let n=0;for(const k of storage.keys()){if(n++===i)return k;n++;}return null;} };
const g = await runSegment({ ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: storageHandle });
const jsScreens = g.getScreens();
const a=parseInt(process.argv[2]), b=parseInt(process.argv[3]||a);
for (let i=a;i<=b;i++){
  const rec = (seg.steps||[])[i];
  const rg = rec ? decodeScreen(rec.screen||'') : null;
  const jrr = jsScreens[i]; const jg = typeof jrr === 'string' ? decodeScreen(jrr) : jrr;
  console.log(`--- step ${i} key=${JSON.stringify(rec?.key)}`);
  if (!rg) { console.log('no rec'); continue; }
  for (let r=0;r<24;r++){
    const rline = rg[r].map(renderCell).join('');
    let jline='';
    if (jg){ const jr = jg[r] || []; jline = jr.map(renderCell).join(''); }
    const mark = rline===jline?'  ':'!=';
    console.log(`${mark}R|${rline}`);
    if(mark==='!=') console.log(`  J|${jline}`);
  }
}
