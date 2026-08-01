
import { readFileSync } from 'fs';
import { normalizeSession } from './frozen/session_loader.mjs';
import { runSegment } from './js/jsmain.js';
const { decodeScreen, renderCell } = await import('./frozen/screen-decode.mjs');
const s = JSON.parse(readFileSync('sessions-extra/seed9105-wiz-archlich-spells.session.json','utf8'));
const seg = normalizeSession(s).segments[0];
const storage = new Map();
const h = { getItem(k){return storage.has(k)?storage.get(k):null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){let n=0;for(const k of storage.keys()){if(n++===i)return k;n++;}return null;} };
const g = await runSegment(seg);
const scr = g.getScreens();
const a=parseInt(process.argv[2]), b=parseInt(process.argv[3]||a);
for (let i=a;i<=b;i++){
  const rec=(seg.steps||[])[i];
  const rg=decodeScreen(rec?.screen||'');
  const jg=typeof scr[i]==='string'?decodeScreen(scr[i]):null;
  const rt=rg[0].map(renderCell).join('').trim();
  const jt=jg?jg[0].map(renderCell).join('').trim():'<missing>';
  console.log(i, JSON.stringify(rec?.key), rt===jt?'OK   ':'DIFF', '|' +rt+'|');
  if (rt!==jt) console.log('          J:', jt);
}
