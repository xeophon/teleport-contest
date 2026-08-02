
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const PROJECT_ROOT = process.cwd();
const argsession = process.argv[2];
const sessionPath = argsession.startsWith('/') ? argsession : join(PROJECT_ROOT, argsession);
const { normalizeSession } = await import(join(PROJECT_ROOT, 'frozen/session_loader.mjs'));
const { runSegment } = await import(join(PROJECT_ROOT, 'js/jsmain.js'));
const segments = normalizeSession(JSON.parse(readFileSync(sessionPath, 'utf8'))).segments;
const cScr = [], cCur = [];
for (const seg of segments) for (const step of seg.steps || []) { if (step.screen) { cScr.push(step.screen); cCur.push(step.cursor||null);} }
const storage = new Map();
const sh = { getItem:k=>storage.has(k)?storage.get(k):null, setItem:(k,v)=>storage.set(k,String(v)), removeItem:k=>storage.delete(k), get length(){return storage.size;}, key(i){let n=0;for(const k of storage.keys()){if(n===i)return k;n++;}return null;} };
const jScr = [], jCur = [];
for (const seg of segments) {
  const g = await runSegment({ seed: seg.seed, datetime: seg.datetime, nethackrc: seg.nethackrc, moves: seg.moves, storage: sh });
  jScr.push(...(g.getScreens?.() || []));
  jCur.push(...(g.getCursors?.() || []));
}
// visual-ish strip: decode DEC span chars approximately per line
const decMap = { q:'-', x:'|', l:'+', k:'+', m:'+', j:'+', t:'+', u:'+', v:'+', w:'+', n:'+' };
function deAnsi(s){
  s = s.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
  let dec=false, out='';
  for (const ch of s) {
    if (ch === '\x0e') { dec = true; continue; }
    if (ch === '\x0f') { dec = false; continue; }
    out += dec ? (decMap[ch] || ch) : ch;
  }
  return out;
}
function topLine(s){ return deAnsi(s).split('\n')[0]; }
function status(s){ const L = deAnsi(s).split('\n'); return L[L.length-2] + ' | ' + L[L.length-1]; }
for (let i=0;i<Math.min(cScr.length,jScr.length);i++){
  const ct = topLine(cScr[i]), jt = topLine(jScr[i]);
  if (ct !== jt) {
    console.log('first topline mismatch', i);
    console.log('C :', JSON.stringify(ct));
    console.log('JS:', JSON.stringify(jt));
    console.log('status C :', status(cScr[i]));
    console.log('status JS:', status(jScr[i]));
    console.log('cursor C', JSON.stringify(cCur[i]), 'JS', JSON.stringify(jCur[i]));
    // context: previous few toplines
    for (let k=Math.max(0,i-4); k<i; k++) console.log('  prev', k, JSON.stringify(topLine(cScr[k])));
    break;
  }
}
