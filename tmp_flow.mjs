
import { readFileSync } from 'fs';
const { decodeScreen, renderCell } = await import('./frozen/screen-decode.mjs');
const s = JSON.parse(readFileSync('sessions-extra/seed9162-wiz-gascloud.session.json','utf8'));
const steps = s.segments[0].steps;
for (let i=14;i<=45;i++){
  const st=steps[i]; if(!st) break;
  const grid=decodeScreen(st.screen||'');
  const l0=grid[0].map(renderCell).join(''), l1=grid[1].map(renderCell).join(''), l22=grid[22].map(renderCell).join('');
  console.log(i, JSON.stringify(st.key).padEnd(6), 'rng='+(st.rng||[]).length, JSON.stringify(l0).slice(0,86));
}
