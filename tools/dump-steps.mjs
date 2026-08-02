
// usage: node /tmp/nh-fin9150b/tools/dump-steps.mjs <session.json> <start> <end> [js|rec]
import { readFileSync } from 'fs';
import { normalizeSession } from '/tmp/nh-fin9150b/frozen/session_loader.mjs';
import { decodeScreen, renderCell } from '/tmp/nh-fin9150b/frozen/screen-decode.mjs';
const [file, a, b, mode] = process.argv.slice(2);
const s = JSON.parse(readFileSync(file, 'utf8'));
const norm = normalizeSession(s);
const segments = norm.segments || [];
function show(label, scr){
  const grid = decodeScreen(scr || '');
  console.log(`===== ${label} =====`);
  grid.forEach(r => console.log(r.map(renderCell).join('')));
}
if ((mode||'rec') === 'rec') {
  segments.forEach((seg, si) => {
    (seg.steps||[]).forEach((st, i) => { if (i >= +a && i <= +b) show(`step ${i} key=${JSON.stringify(st.key)}`, st.screen); });
  });
} else {
  const { runSegment } = await import('/tmp/nh-fin9150b/js/jsmain.js');
  const storage = new Map();
  const storageHandle = { getItem:k=>storage.has(k)?storage.get(k):null, setItem:(k,v)=>storage.set(k,String(v)), removeItem:k=>storage.delete(k), get length(){return storage.size;}, key(i){let n=0;for(const k of storage.keys()){if(n++===i)return k;}return null;} };
  let stepIdx = 0;
  for (const seg of segments) {
    // need per-step screens: simulate by running moves incrementally? jsmain API -- check
    const input = { ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime,
                    nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: storageHandle };
    const g = await runSegment(input);
    console.log('game keys:', Object.keys(g));
    break;
  }
}
