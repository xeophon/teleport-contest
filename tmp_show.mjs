
import { readFileSync } from 'fs';
const { decodeScreen, renderCell } = await import('./frozen/screen-decode.mjs');
const s = JSON.parse(readFileSync('sessions-extra/seed9162-wiz-gascloud.session.json','utf8'));
const steps = s.segments[0].steps;
const sel = process.argv[2].split(',').map(Number);
for (const i of sel) {
  const st = steps[i];
  if (!st?.screen) { console.log(`step ${i}: no screen`); continue; }
  const grid = decodeScreen(st.screen);
  console.log(`= step ${i} key=${JSON.stringify(st.key)} cursor=${JSON.stringify(st.cursor)}`);
  grid.forEach((r,y)=>{const t=r.map(renderCell).join(''); if (t.trim()) console.log(`  ${String(y).padStart(2)} ${JSON.stringify(t)}`);});
}
