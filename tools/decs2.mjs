
import { readFileSync } from 'fs';
import { decodeScreen } from '../frozen/screen-decode.mjs';
const s = JSON.parse(readFileSync(new URL('../sessions-extra/seed9007-valley-sacrifice.session.json', import.meta.url),'utf8'));
const g = decodeScreen(s.segments[0].steps[163].screen);
for (let y=0;y<20;y++){
  for (let x=0;x<80;x++){
    const ch = g[y][x].ch;
    if ('@L{H:<>^%'.includes(ch)) { const c=g[y][x].color; console.log(`${ch} @ ${x},${y} color=${c}`); }
  }
}
