// Traced driver for seed9105: print NH_DBG_TRACE entries around search steps.
import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';
const s = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const storage = new Map();
const storageHandle = { getItem(k){return storage.get(k)??null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){return [...storage.keys()][i]??null;} };
const lo = parseInt(process.argv[3]||'0'), hi = parseInt(process.argv[4]||'40');
const g = await runSegment({...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, storage: storageHandle});
const traces = g.getTraceSteps?.() || [];
const keys = (seg.moves||'');
for (let i = lo; i <= Math.min(hi, traces.length-1); i++) {
    console.log(`### step ${i} key=${JSON.stringify(keys[i])}`);
    for (const t of (traces[i]||[])) console.log('   ', t);
}
