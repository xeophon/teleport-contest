import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';
const s = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const storage = new Map();
const storageHandle = {
  getItem(k){return storage.has(k)?storage.get(k):null;},
  setItem(k,v){storage.set(k,String(v));},
  removeItem(k){storage.delete(k);},
  get length(){return storage.size;},
  key(i){let n=0;for(const k of storage.keys()){if(n++===i)return k;}return null;},
};
const g = await runSegment({...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, storage: storageHandle});
const jsScreens = g.getScreens?.() || [];
const jsPerStep = g.getScreensByStep?.() || null;
const a = Number(process.argv[3]), b = Number(process.argv[4]);
for (let i=a;i<=b;i++){
  const c = seg.steps[i];
  console.log('===== STEP', i, 'key', JSON.stringify(c.key), '=====');
  console.log('--- C screen (top message lines) ---');
  const lines = c.screen.split('\n');
  console.log(lines.slice(0,10).join('\n'));
  const j = jsScreens[i];
  console.log('--- JS screen ---');
  console.log((j||'').split('\n').slice(0,10).join('\n'));
}
