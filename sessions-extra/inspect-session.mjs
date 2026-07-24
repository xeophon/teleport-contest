// usage: node /tmp/inspect-session.mjs <file> [first] [last]
import { readFileSync } from 'fs';
const { decodeScreen, renderCell } = await import('../frozen/screen-decode.mjs');
const [file, a, b] = process.argv.slice(2);
const s = JSON.parse(readFileSync(file, 'utf8'));
for (const [si, seg] of s.segments.entries()) {
  const steps = seg.steps || [];
  console.log(`== segment ${si}: ${steps.length} steps ==`);
  const lo = a ? parseInt(a) : 0, hi = b ? parseInt(b) : steps.length - 1;
  for (let i = lo; i <= hi && i < steps.length; i++) {
    const st = steps[i];
    const grid = decodeScreen(st.screen || '');
    const rows = grid.map(r => r.map(renderCell).join(''));
    const top = rows.slice(0, 3).filter(l => l.trim()).join(' | ').replace(/\s+/g, ' ').slice(0, 150);
    console.log(String(i).padStart(4), JSON.stringify(st.key), '::', top);
  }
}
