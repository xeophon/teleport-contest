import { readFileSync } from 'fs';
import { decodeScreen, renderCell } from '../frozen/screen-decode.mjs';
const s = JSON.parse(readFileSync('sessions-extra/seed9012-arrive-castle.session.json','utf8'));
const st = s.segments[0].steps[16];
const grid = decodeScreen(st.screen);
for (let r=0;r<24;r++) for (let c=0;c<80;c++){
  const ch = grid[r][c].ch ?? renderCell(grid[r][c]);
  if ('\\{#<'.includes(ch)) console.log(r,c,ch);
}
