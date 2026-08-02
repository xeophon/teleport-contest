import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';
import { game } from '../js/gstate.js';
import { decodeScreen, renderCell } from '../frozen/screen-decode.mjs';
const s = JSON.parse(readFileSync('sessions-extra/seed9012-arrive-castle.session.json','utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const storage = new Map();
const sh = { getItem(k){return storage.get(k)??null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){return [...storage.keys()][i]??null;} };
await runSegment({...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, storage: sh});
// C backtick cells from step16 screen
const grid = decodeScreen(seg.steps[16].screen);
const cTick = new Set();
for (let r=0;r<24;r++) for (let c=0;c<80;c++) if (renderCell(grid[r][c]) === '`') cTick.add(r+','+c);
// JS moat cells: screen = (x-1, y+1)
let jsTick = new Set();
for (let y=0;y<21;y++) for (let x=0;x<80;x++){ const t=game.level.at(x,y).typ; if (t===16||t===17||t===18) jsTick.add((y+1)+','+(x-1)); }
const onlyC = [...cTick].filter(k=>!jsTick.has(k));
const onlyJS = [...jsTick].filter(k=>!cTick.has(k));
console.log('C-only backtick (r,c):', onlyC);
console.log('JS-only water (r,c):', onlyJS);
