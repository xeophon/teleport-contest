import { readFileSync } from 'fs';
import { runSegment } from './js/jsmain.js';
import { normalizeSession } from './frozen/session_loader.mjs';

const s = JSON.parse(readFileSync('sessions-extra/seed9163-wiz-cockatrice.session.json','utf8'));
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
const nh = await runSegment({ ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime,
  nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: storageHandle });
const mt = globalThis.__mt || [];
// print entries with text around cockatrice bites + stop searching + stone
for (const e of mt) {
  const t = e.text;
  if ((e.moves ?? e.from ?? -1) >= 14 && (e.moves ?? e.from ?? -1) <= 24)
    console.log(`f=${(e.f||'').padEnd(10)} moves=${e.moves ?? e.from} mm=${e.mm} rng=${e.rngidx ?? ''} [${e.stack||''}] pend=${JSON.stringify(((e.pend)||'').slice(0,45))} :: ${String(t||'').slice(0,80)}`);
}
