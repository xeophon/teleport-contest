// usage: node sessions-extra/show-screen.mjs <file> <step> — dump full 24x80 screen
import { readFileSync } from 'fs';
const { decodeScreen, renderCell } = await import('../frozen/screen-decode.mjs');
const [file, a] = process.argv.slice(2);
const s = JSON.parse(readFileSync(file, 'utf8'));
for (const [si, seg] of s.segments.entries()) {
  const st = (seg.steps || [])[parseInt(a)];
  if (!st) { console.log('no step', a); continue; }
  const grid = decodeScreen(st.screen || '');
  console.log(`segment ${si} step ${a} key=${JSON.stringify(st.key)}`);
  grid.forEach(r => console.log(r.map(renderCell).join('')));
}
