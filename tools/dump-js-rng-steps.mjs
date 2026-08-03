
// usage: node tools/dump-js-rng-steps.mjs <session.json> <start> <end>
import { readFileSync } from 'fs';
import { normalizeSession } from '/tmp/nh-fin9150b/frozen/session_loader.mjs';
const [file, a, b] = process.argv.slice(2);
const s = JSON.parse(readFileSync(file, 'utf8'));
const segments = normalizeSession(s).segments;
const storage = new Map();
const storageHandle = { getItem:k=>storage.has(k)?storage.get(k):null, setItem:(k,v)=>storage.set(k,String(v)), removeItem:k=>storage.delete(k), get length(){return storage.size;}, key(i){let n=0;for(const k of storage.keys()){if(n++===i)return k;}return null;} };
const { runSegment } = await import('/tmp/nh-fin9150b/js/jsmain.js');
let stepIdx = 0;
for (const seg of segments) {
  const input = { seed: seg.seed, datetime: seg.datetime, nethackrc: seg.nethackrc, moves: seg.moves, storage: storageHandle };
  const g = await runSegment(input);
  const slices = g.getRngSlices();
  slices.forEach((sl, i) => {
    const gi = stepIdx++;
    if (gi >= +a && gi <= +b && sl.length) {
      console.log(`JS step ${gi}: n=${sl.length}`);
      for (const e of sl) console.log('   ', String(e).replace(/^\d+\s+/, ''));
    }
  });
}
