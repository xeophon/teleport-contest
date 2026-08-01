
import { readFileSync } from 'fs';
import { decodeScreen, renderCell } from '../frozen/screen-decode.mjs';
const s = JSON.parse(readFileSync(new URL('../sessions/seed4500-knight-coverage.session.json', import.meta.url),'utf8'));
const st = s.segments[0].steps[1034];
const g = decodeScreen(st.screen);
for (let y=0;y<22;y++) console.log(String(y).padStart(2)+'|'+g[y].map(renderCell).join(''));
