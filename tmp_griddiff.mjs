
import { readFileSync } from 'fs';
import { normalizeSession } from './frozen/session_loader.mjs';
import { runSegment } from './js/jsmain.js';
const { decodeScreen, renderCell } = await import('./frozen/screen-decode.mjs');
const file = process.argv[2];
const s = JSON.parse(readFileSync(file,'utf8'));
const norm = normalizeSession(s);
const storage = new Map();
const h = { getItem(k){return storage.has(k)?storage.get(k):null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){let n=0;for(const k of storage.keys()){if(n++===i)return k;n++;}return null;} };
let screens=[], steps=[];
for (const seg of norm.segments){
  const g = await runSegment({ ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: h });
  const ss=g.getScreens(); screens=screens.concat(ss); steps=steps.concat(seg.steps);
}
for (let i=0;i<steps.length;i++){
  const rec=steps[i];
  const rg=decodeScreen(rec?.screen||"");
  const jg=typeof screens[i]==="string"?decodeScreen(screens[i]):null;
  const rt=rg.map(r=>r.map(renderCell).join('')).join('|');
  const jt=jg?jg.map(r=>r.map(renderCell).join('')).join('|'):"<missing>";
  if (rt!==jt && [22,60,75,78,80,81,83,84,90,93,98,99,108].includes(i)){
    console.log('=== diff step',i,'key',JSON.stringify(rec?.key));
    const R=rg.map(r=>r.map(renderCell).join(''));
    const Jx=jg?jg.map(r=>r.map(renderCell).join('')):[];
    for (let r=0;r<24;r++){
      if (R[r]!==Jx[r]) { console.log(` R${r}|${R[r]}`); console.log(` J${r}|${Jx[r]}`); }
    }
  }
}
