import { readFileSync } from 'fs';
const sessionData = JSON.parse(readFileSync('sessions-extra/seed9170-wiz-pray-outcomes.session.json','utf8'));
const { normalizeSession } = await import('../frozen/session_loader.mjs');
const { runSegment } = await import('../js/jsmain.js');
const seg = normalizeSession(sessionData).segments[0];
const cRng = [];
for (const step of seg.steps || []) for (const e of (step.rng||[])) if (/^(?:rn2|rnd|rn1|rnl|rne|rnz|d)\(/.test(e)) cRng.push(e);
const input = { seed: seg.seed, datetime: seg.datetime, nethackrc: seg.nethackrc, moves: seg.moves,
  storage: { _m:new Map(), getItem(k){return this._m.has(k)?this._m.get(k):null}, setItem(k,v){this._m.set(k,String(v))}, removeItem(k){this._m.delete(k)}, get length(){return this._m.size}, key(i){let n=0; for(const k of this._m.keys()){if(n===i)return k;n++;} return null;} } };
const g = await runSegment(input);
const jRng = (g.getRngLog?.()||[]).map(e=>String(e).replace(/^\d+\s+/,'')).filter(e=>/^(?:rn2|rnd|rn1|rnl|rne|rnz|d)\(/.test(e));
console.log('C rng calls:', cRng.length, 'JS rng calls:', jRng.length);
const norm = e => e.replace(/\s*@\s.*$/,'').replace(/^\d+\s+/,'').trim();
let first = -1;
for (let i=0;i<Math.max(cRng.length,jRng.length);i++){
  if (norm(cRng[i]||'') !== norm(jRng[i]||'')) { first=i; break; }
}
console.log('first rng divergence index:', first);
if (first>=0) for (let i=Math.max(0,first-4); i<first+6; i++) console.log(i, 'C:', cRng[i], ' | JS:', jRng[i]);
const jScreens = g.getScreens?.()||[];
console.log('JS screens:', jScreens.length, 'C screens:', (seg.steps||[]).filter(s=>s.screen).length);
