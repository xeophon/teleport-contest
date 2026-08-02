import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';
import { decodeScreen, renderCell } from '../frozen/screen-decode.mjs';
const [file, a, b] = process.argv.slice(2);
const s = JSON.parse(readFileSync(file, 'utf8'));
const norm = normalizeSession(s);
const cSteps = [];
for (const seg of norm.segments) for (const st of seg.steps || []) cSteps.push(st);
const storage = new Map();
const sh = { getItem:k=>storage.get(k)??null, setItem:(k,v)=>storage.set(k,String(v)), removeItem:k=>storage.delete(k), get length(){return storage.size}, key(i){let n=0;for(const k of storage.keys()){if(n++===i)return k}return null} };
let jsScreens = [], jsCursors = [];
for (const seg of norm.segments) {
  const g = await runSegment({ ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: sh });
  jsScreens = jsScreens.concat(g.getScreens?.() || []);
  jsCursors = jsCursors.concat(g.getCursors?.() || []);
}
for (let i = parseInt(a); i <= parseInt(b); i++) {
  const c = cSteps[i];
  console.log(`########## step ${i} key=${JSON.stringify(c?.key)} cursorC=${JSON.stringify(c?.cursor)} cursorJS=${JSON.stringify(jsCursors[i])}`);
  console.log('--- C ---');
  (decodeScreen(c?.screen || '') || []).map(r => r.map(renderCell).join('')).slice(0, 24).forEach(r => console.log(r.replace(/ +$/, '')));
  console.log('--- JS ---');
  (decodeScreen(jsScreens[i] || '') || []).map(r => r.map(renderCell).join('')).slice(0, 24).forEach(r => console.log(r.replace(/ +$/, '')));
}
