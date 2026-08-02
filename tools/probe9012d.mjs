import { readFileSync } from 'fs';
import { decodeScreen, renderCell } from '../frozen/screen-decode.mjs';
const s = JSON.parse(readFileSync('sessions-extra/seed9012-arrive-castle.session.json','utf8'));
const st = s.segments[0].steps[16];
console.log('raw screen excerpt:', JSON.stringify(st.screen.slice(0,80)));
const grid = decodeScreen(st.screen);
console.log('cell (18,12):', JSON.stringify(grid[18][12]));
console.log('cell (4,9) known moat:', JSON.stringify(grid[4][9]));
console.log('cell (12,65):', JSON.stringify(grid[12][65]));
