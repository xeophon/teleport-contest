
import { readFileSync } from 'fs';
import { decodeScreen, renderCell } from './frozen/screen-decode.mjs';
const s = JSON.parse(readFileSync('sessions-extra/seed9163-wiz-cockatrice.session.json','utf8'));
const steps = s.segments[0].steps;
for (let i=104;i<=131;i++){
  const st = steps[i]; if(!st) break;
  const g = decodeScreen(st.screen||'');
  const t = g.map(r=>r.map(renderCell).join(''))[0].replace(/\s+$/,'');
  console.error(i, JSON.stringify(st.key), t);
}
