import { readFileSync } from 'fs';
const sessionData = JSON.parse(readFileSync('sessions-extra/seed9170-wiz-pray-outcomes.session.json','utf8'));
const { normalizeSession } = await import('../frozen/session_loader.mjs');
const { runSegment } = await import('../js/jsmain.js');
const seg = normalizeSession(sessionData).segments[0];
const input = { seed: seg.seed, datetime: seg.datetime, nethackrc: seg.nethackrc, moves: seg.moves,
  storage: { _m:new Map(), getItem(k){return this._m.has(k)?this._m.get(k):null}, setItem(k,v){this._m.set(k,String(v))}, removeItem(k){this._m.delete(k)}, get length(){return this._m.size}, key(i){let n=0; for(const k of this._m.keys()){if(n===i)return k;n++;} return null;} } };
let g;
try { g = await runSegment(input); } catch (e) { console.log('JS ERROR:', e.stack); process.exit(0); }
const jScreens = g.getScreens?.()||[];
const { decodeScreen } = await import('../frozen/screen-decode.mjs');
console.log('first JS screen decoded:');
console.log(decodeScreen(jScreens[0]));
