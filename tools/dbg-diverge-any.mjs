
process.env.RNG_SITE = '1';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const PROJECT_ROOT = process.cwd();
const argsession = process.argv[2];
const sessionPath = argsession.startsWith('/') ? argsession : join(PROJECT_ROOT, argsession);
const around = Number(process.env.AROUND || 0);
const { normalizeSession } = await import(join(PROJECT_ROOT, 'frozen/session_loader.mjs'));
const { runSegment } = await import(join(PROJECT_ROOT, 'js/jsmain.js'));
const segments = normalizeSession(JSON.parse(readFileSync(sessionPath, 'utf8'))).segments;
const cRngRaw = [];
for (const seg of segments)
  for (const step of seg.steps || [])
    for (const e of step.rng || []) cRngRaw.push(e);
let jsRngRaw = [];
const storage = new Map();
const storageHandle = {
  getItem(k){return storage.has(k)?storage.get(k):null;},
  setItem(k,v){storage.set(k,String(v));},
  removeItem(k){storage.delete(k);},
  get length(){return storage.size;},
  key(i){let n=0;for(const k of storage.keys()){if(n===i)return k;n++;}return null;},
};
for (const seg of segments) {
  const input = { seed: seg.seed, datetime: seg.datetime, nethackrc: seg.nethackrc, moves: seg.moves, storage: storageHandle };
  const g = await runSegment(input);
  const segRng = (g.getRngLog?.() || []).map(e => String(e).replace(/^\d+\s+/,'')).filter(e => /^(?:rn2|rnd|rn1|rnl|rne|rnz|d)\(/.test(e));
  jsRngRaw.push(...segRng);
}
const clean = s => s.replace(/\s*@\s.*$/, '').trim();
console.log('counts C', cRngRaw.length, 'JS', jsRngRaw.length);
let i = 0;
while (i < Math.min(cRngRaw.length, jsRngRaw.length) && clean(cRngRaw[i]) === clean(jsRngRaw[i])) i++;
console.log('first divergence at index', i);
const lo = around ? Math.max(around-6,0) : i-4;
const hi = around ? around+8 : Math.min(cRngRaw.length, i+8);
for (let j = lo; j < hi; j++)
  console.log(j, '\n  C: ', cRngRaw[j], '\n  JS:', jsRngRaw[j]);
