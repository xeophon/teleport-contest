
import { readFileSync } from 'fs';
const { decodeScreen, renderCell } = await import('./frozen/screen-decode.mjs');
const s = JSON.parse(readFileSync('sessions-extra/seed9162-wiz-gascloud.session.json','utf8'));
for (const stepNo of [93,97]) {
  const st = s.segments[0].steps[stepNo];
  const grid = decodeScreen(st.screen||'');
  console.log('step',stepNo);
  grid.forEach((r,y)=>{
    const t=r.map(renderCell).join('');
    if (t.trim()) console.log(y, JSON.stringify(t));
  });
}
