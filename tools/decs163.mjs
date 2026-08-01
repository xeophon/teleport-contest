
import { readFileSync } from 'fs';
import { decodeScreen, renderCell } from '../frozen/screen-decode.mjs';
const s = JSON.parse(readFileSync(new URL('../sessions-extra/seed9007-valley-sacrifice.session.json', import.meta.url),'utf8'));
const st = s.segments[0].steps[163];
const g = decodeScreen(st.screen);
for (let y=0;y<20;y++){
  let row='';
  for (let x=0;x<80;x++){ const ch=g[y][x].ch; row+= ch===' '?'.':ch; }
  console.log(String(y).padStart(2)+' '+row);
}
