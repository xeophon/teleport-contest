
import { readFileSync, writeFileSync } from 'fs';
import { normalizeSession } from './frozen/session_loader.mjs';
import { runSegment } from './js/jsmain.js';
const s = JSON.parse(readFileSync('sessions-extra/seed9104-wiz-conflict-mvm.session.json', 'utf8'));
const norm = normalizeSession(s);
const segments = norm.segments || [];
const isRngCall = (e) => typeof e === 'string' && /^(?:rn2|rnd|rn1|rnl|rne|rnz|d)\(/.test(e);
const storage = new Map();
const storageHandle = { getItem(k){return storage.has(k)?storage.get(k):null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){let n=0; for(const k of storage.keys()){if(n++===i)return k;} return null;} };
let flat = [];
for (const seg of segments) {
  const input = { ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime,
                  nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: storageHandle };
  const g = await runSegment(input);
  const r = (g.getRngLog?.() || []).map(e => typeof e === 'string' ? e.replace(/^\d+\s+/, '') : String(e)).filter(isRngCall);
  flat.push(...r);
}
writeFileSync('/tmp/nh9104-jsannot.txt', flat.map((e,i)=>`[${i}] ${e}`).join('\n'));
console.log('total', flat.length);
