import { readFileSync } from 'fs';
const sessionData = JSON.parse(readFileSync('sessions-extra/seed9170-wiz-pray-outcomes.session.json','utf8'));
const { normalizeSession } = await import('../frozen/session_loader.mjs');
const { runSegment } = await import('../js/jsmain.js');
const seg = normalizeSession(sessionData).segments[0];
function mkStorage(){ const m=new Map(); return { getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k), get length(){return m.size}, key(i){let n=0; for(const k of m.keys()){if(n===i)return k;n++;} return null;} }; }
const g = await runSegment({ seed: seg.seed, datetime: seg.datetime, nethackrc: seg.nethackrc, moves: seg.moves, storage: mkStorage() });
const { decodeScreen } = await import('../frozen/screen-decode.mjs');
const txt = sc => decodeScreen(sc).map(r=>r.map(c=>c.ch).join('').replace(/\s+$/,'')).join('\n').replace(/\n+$/,'');
const js = g.getScreens?.()||[];
const steps = seg.steps||[];
for (let i=0;i<steps.length;i++){
  const c = txt(steps[i].screen), j = txt(js[i]||'');
  if (c !== j) {
    console.log('=== FIRST DIFF at step', i, 'key:', JSON.stringify(steps[i].keys ?? steps[i].key ?? '?'));
    console.log('--- C ---');  console.log(c);
    console.log('--- JS ---'); console.log(j);
    if (i+1 < steps.length && process.argv[2]==='all') {
      console.log('=== next step', i+1, '--- C ---'); console.log(txt(steps[i+1].screen));
      console.log('--- JS ---'); console.log(txt(js[i+1]||''));
    }
    break;
  }
}
// rng per-step diff
const isRng = e => /^(?:rn2|rnd|rn1|rnl|rne|rnz|d)\(/.test(e);
const jAll = (g.getRngLog?.()||[]).map(e=>String(e));
const jSlices = g.getRngSlices?.()||[];
for (let i=0;i<steps.length;i++){
  const cR = (steps[i].rng||[]).filter(isRng).map(e=>e.replace(/\s*@\s.*$/,''));
  const jR = (jSlices[i]||[]).map(e=>String(e).replace(/^\d+\s+/,'').replace(/\s*@\s.*$/,'')).filter(isRng);
  if (cR.join('|') !== jR.join('|')) {
    console.log('=== RNG diff at step', i, JSON.stringify(steps[i].keys ?? ''));
    console.log('C  :', JSON.stringify(cR.slice(0,30)));
    console.log('JS :', JSON.stringify(jR.slice(0,30)));
    break;
  }
}
