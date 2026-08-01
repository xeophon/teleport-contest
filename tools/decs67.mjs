
import { readFileSync } from 'fs';
import { decodeScreen, renderCell } from '../frozen/screen-decode.mjs';
const s = JSON.parse(readFileSync(new URL('../sessions-extra/seed9007-valley-sacrifice.session.json', import.meta.url),'utf8'));
// step 67 is #wizmap display? check first couple then find where full map visible
for (const idx of [66,67,68,69]) {
  const g = decodeScreen(s.segments[0].steps[idx].screen);
  // what does the C side show at (18,16)-(22,19)?
  console.log('C step', idx, 'key', JSON.stringify(s.segments[0].steps[idx].key));
  for (let y=15;y<20;y++){
    console.log(' ', g[y].slice(15,25).map(c=>c.ch).join(''));
  }
}
