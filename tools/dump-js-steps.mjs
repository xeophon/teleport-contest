
// usage: node tools/dump-js-steps.mjs <session.json> <start> <end>
import { readFileSync } from 'fs';
import { normalizeSession } from '/tmp/nh-fin9150b/frozen/session_loader.mjs';
import { decodeScreen, renderCell } from '/tmp/nh-fin9150b/frozen/screen-decode.mjs';
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
  const screens = g.getScreens();
  const cursors = g.getCursors();
  screens.forEach((scr, i) => {
    const gi = stepIdx++;
    if (gi >= +a && gi <= +b) {
      const grid = decodeScreen(scr || '');
      console.log(`===== JS step ${gi} cursor=${JSON.stringify(cursors?.[gi])} =====`);
      grid.forEach(r => console.log(r.map(renderCell).join('')));
    }
  });
}
