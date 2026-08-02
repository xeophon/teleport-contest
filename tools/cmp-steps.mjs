
// usage: node tools/cmp-steps.mjs <session.json> <start> <end>
import { readFileSync } from 'fs';
import { normalizeSession } from '/tmp/nh-fin9150b/frozen/session_loader.mjs';
import { decodeScreen, renderCell, ROWS_24, COLS_80 } from '/tmp/nh-fin9150b/frozen/screen-decode.mjs';
const [file, a, b] = process.argv.slice(2);
const s = JSON.parse(readFileSync(file, 'utf8'));
const segments = normalizeSession(s).segments;
const storage = new Map();
const storageHandle = { getItem:k=>storage.has(k)?storage.get(k):null, setItem:(k,v)=>storage.set(k,String(v)), removeItem:k=>storage.delete(k), get length(){return storage.size;}, key(i){let n=0;for(const k of storage.keys()){if(n++===i)return k;}return null;} };
const { runSegment } = await import('/tmp/nh-fin9150b/js/jsmain.js');
let stepIdx = 0;
const cSteps = [];
for (const seg of segments) for (const st of seg.steps || []) cSteps.push(st);
for (const seg of segments) {
  const input = { seed: seg.seed, datetime: seg.datetime, nethackrc: seg.nethackrc, moves: seg.moves, storage: storageHandle };
  const g = await runSegment(input);
  const screens = g.getScreens();
  const cursors = g.getCursors();
  screens.forEach((scr, i) => {
    const gi = stepIdx++;
    if (gi < +a || gi > +b) return;
    const c = cSteps[gi];
    if (!c) { console.log(`step ${gi}: JS has extra screen`); return; }
    const cg = decodeScreen(c.screen || ''), jg = decodeScreen(scr || '');
    const diffs = [];
    for (let r = 0; r < ROWS_24; r++) for (let col = 0; col < COLS_80; col++) {
      const cc = cg[r][col], jc = jg[r][col];
      if (renderCell(cc) !== renderCell(jc)) diffs.push([r, col, renderCell(jc), renderCell(cc)]);
      else if (cc.attr !== jc.attr) diffs.push([r, col, `attr js=${jc.attr} c=${cc.attr}`]);
    }
    let cursorNote = '';
    const cur = Array.isArray(c.cursor) ? c.cursor : null;
    const jcur = cursors[gi];
    const curOk = !cur || (Array.isArray(jcur) && cur[0] === jcur[0] && cur[1] === jcur[1] && cur[2] === jcur[2]);
    if (diffs.length || !curOk) {
      console.log(`step ${gi} key=${JSON.stringify(c.key)}: ${diffs.length} cell diffs, cursor js=${JSON.stringify(jcur)} c=${JSON.stringify(cur)}`);
      const rows = new Set(diffs.map(d => d[0]));
      for (const r of rows) {
        console.log(`  C  ${cg[r].map(renderCell).join('')}`);
        console.log(`  JS ${jg[r].map(renderCell).join('')}`);
      }
    } else {
      console.log(`step ${gi}: MATCH`);
    }
  });
}
