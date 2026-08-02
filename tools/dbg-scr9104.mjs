
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const PROJECT_ROOT = process.cwd();
const argsession = process.argv[2];
const sessionPath = argsession.startsWith('/') ? argsession : join(PROJECT_ROOT, argsession);
const { normalizeSession } = await import(join(PROJECT_ROOT, 'frozen/session_loader.mjs'));
const { runSegment } = await import(join(PROJECT_ROOT, 'js/jsmain.js'));
const src = readFileSync(join(PROJECT_ROOT, 'frozen/ps_test_runner.mjs'), 'utf8');
const m = src.match(/function screensVisuallyEqual[\s\S]*?\n}\n/);
const m2 = src.match(/function cursorsEqual[\s\S]*?\n}\n/);
const pre = src.match(/function normalizeScreen[\s\S]*?\n}\n/);
const preD = src.match(/function preDecode[\s\S]*?\n}\n/);
const diffC = src.match(/function diffCell[\s\S]*?\n}\n/);
const start = src.match(/const STARTUP_VARIANT_LINES[\s\S]*?\n];/);
const canonSrc = src.match(/function canonSGR[\s\S]*?\n}\n/);
const translateDec = src.match(/function translateDecSpans[\s\S]*?\n}\n/);
const { decodeScreen, ROWS_24, COLS_80 } = await import(join(PROJECT_ROOT, 'frozen/screen-decode.mjs'));
let STARTUP_VARIANT_LINES=[]; eval(start[0]);
let diffCellFn = null;
eval(canonSrc[0]); eval(translateDec[0]); if (preD) eval(preD[0]); eval(pre[0]);
const SD = await import(join(PROJECT_ROOT, 'frozen/screen-decode.mjs'));
const diffCell = SD.diffCell;
const grids = SD;
globalThis.decodeScreen = SD.decodeScreen; globalThis.diffCell = SD.diffCell;
globalThis.ROWS_24 = SD.ROWS_24; globalThis.COLS_80 = SD.COLS_80;
globalThis.canonSGR = eval(canonSrc[0] + '; canonSGR');
globalThis.translateDecSpans = eval(translateDec[0] + '; translateDecSpans');
if (preD) globalThis.preDecodeFn = eval(preD[0] + '; preDecode');
globalThis.normalizeScreenFn = eval(pre[0] + '; normalizeScreen');
const screensVisuallyEqual = (a,b) => {
  const ga = SD.decodeScreen((globalThis.preDecodeFn||((x)=>x))(globalThis.normalizeScreenFn(a)));
  const gb = SD.decodeScreen((globalThis.preDecodeFn||((x)=>x))(globalThis.normalizeScreenFn(b)));
  for (let rr=0; rr<SD.ROWS_24; rr++) for (let cc=0; cc<SD.COLS_80; cc++) if (SD.diffCell(ga[rr][cc], gb[rr][cc])) return false;
  return true;
};
// frozen runner doesn't export helpers; inline simple compare after strip-step
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
console.log('screens', cScr.length, jScr.length);
let firstBad=-1, firstCurBad=-1;
for (let i=0;i<Math.min(cScr.length,jScr.length);i++){
  if (!screensVisuallyEqual(jScr[i]||'', cScr[i]||'')) { firstBad=i; break; }
}
for (let i=0;i<Math.min(cScr.length,jScr.length);i++){
  if (!cursorsEqual(cCur[i], jCur[i])) { firstCurBad=i; break; }
}
console.log('first visual mismatch', firstBad, 'first cursor mismatch', firstCurBad, 'cursor C', JSON.stringify(cCur[firstCurBad]), 'JS', JSON.stringify(jCur[firstCurBad]));
if (firstBad >= 0) {
  const cb = cScr[firstBad].split('\\n'), jb = (jScr[firstBad]||'').split('\\n');
  for (let li=0; li<Math.max(cb.length, jb.length); li++) {
    const c = (cb[li]||'').replace(/\x1b\[[0-9;]*m/g,'~').replace(/[\x0e\x0f]/g,'/');
    const j = (jb[li]||'').replace(/\x1b\[[0-9;]*m/g,'~').replace(/[\x0e\x0f]/g,'/');
    if (c!==j) { console.log('line',li); console.log('C :', JSON.stringify(c)); console.log('JS:', JSON.stringify(j)); }
  }
  console.log('cursor C', JSON.stringify(cCur[firstBad]), 'JS', JSON.stringify(jCur[firstBad]));
}
