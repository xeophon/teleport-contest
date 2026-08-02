
import { readFileSync } from 'fs';
import { normalizeSession } from './frozen/session_loader.mjs';
import { runSegment } from './js/jsmain.js';
const s = JSON.parse(readFileSync('sessions-extra/seed9162-wiz-gascloud.session.json', 'utf8'));
const norm = normalizeSession(s);
// find step 98 segment: figure which segment/step holds the '.' input
let count=0;
(norm.segments||[]).forEach((seg,si)=>{(seg.steps||[]).forEach((st,i)=>{
  const inp = (st.input||st.keys||[]);
});});
// Just print step info around 90-105
let idx=0;
for (const seg of norm.segments||[]) {
  for (const st of seg.steps||[]) {
    if (idx>=93 && idx<=103) console.log(idx, JSON.stringify(st).slice(0,240));
    idx++;
  }
  console.log('--- segment end, steps:', (seg.steps||[]).length);
}
console.log('total steps', idx);
