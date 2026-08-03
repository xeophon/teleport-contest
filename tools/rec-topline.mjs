
import { readFileSync } from 'fs';
import { decodeScreen, renderCell } from '/tmp/nh-fin9150b/frozen/screen-decode.mjs';
const s = JSON.parse(readFileSync(process.argv[2], 'utf8'));
for (const [si, seg] of s.segments.entries()) {
  (seg.steps||[]).forEach((st, i) => {
    if (i < +process.argv[3] || i > +process.argv[4]) return;
    const g = decodeScreen(st.screen||'');
    const top = g[0].map(renderCell).join('').trimEnd();
    const st2 = g[23].map(renderCell).join('').trimEnd();
    const n = (st.rng||[]).length;
    console.log(`${i} key=${JSON.stringify(st.key)} rng=${n} [${top}] [${st2.slice(-14)}]`);
  });
}
