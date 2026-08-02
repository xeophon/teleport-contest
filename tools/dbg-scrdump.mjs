
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const PROJECT_ROOT = process.cwd();
const argsession = process.argv[2];
const sessionPath = argsession.startsWith('/') ? argsession : join(PROJECT_ROOT, argsession);
const { normalizeSession } = await import(join(PROJECT_ROOT, 'frozen/session_loader.mjs'));
const { runSegment } = await import(join(PROJECT_ROOT, 'js/jsmain.js'));
const segments = normalizeSession(JSON.parse(readFileSync(sessionPath, 'utf8'))).segments;
const cScr = [];
for (const seg of segments) for (const step of seg.steps || []) if (step.screen) cScr.push(step.screen);
const storage = new Map();
const sh = { getItem:k=>storage.has(k)?storage.get(k):null, setItem:(k,v)=>storage.set(k,String(v)), removeItem:k=>storage.delete(k), get length(){return storage.size;}, key(i){let n=0;for(const k of storage.keys()){if(n===i)return k;n++;}return null;} };
const jScr = [];
for (const seg of segments) {
  const g = await runSegment({ seed: seg.seed, datetime: seg.datetime, nethackrc: seg.nethackrc, moves: seg.moves, storage: sh });
  jScr.push(...(g.getScreens?.() || []));
}
const countMsg=(arr)=>arr.filter(sx=>(sx||'').includes('You stop searching.')).length;
console.log('C', countMsg(cScr), 'JS', countMsg(jScr));
for (let i=0;i<Math.min(cScr.length,jScr.length);i++){
  if (false) {
    console.log('first screen mismatch at', i);
    const cb = cScr[i].split('\n'), jb = jScr[i].split('\n');
    cb.forEach((cl,li)=>{ if (cl!==jb[li]) { console.log('C :', JSON.stringify(cl)); console.log('JS:', JSON.stringify(jb[li])); }});
    break;
  }
}
