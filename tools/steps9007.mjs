
import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';
import { decodeScreen, renderCell } from '../frozen/screen-decode.mjs';
const s = JSON.parse(readFileSync(new URL('../sessions-extra/seed9007-valley-sacrifice.session.json', import.meta.url), 'utf8'));
const norm = normalizeSession(s); const seg = norm.segments[0];
const storage = new Map();
const h = { getItem(k){return storage.get(k)??null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){return [...storage.keys()][i]??null;} };
const g = await runSegment({ ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, moves: seg.moves, storage: h });
const slices = g.getRngSlices();
const cSteps = s.segments[0].steps;
for (let i=166;i<=188;i++){
  const jsr = (slices[i]||[]).map(e=>e.replace(/^\d+\s+/,'').replace(/\s*@.*$/,''));
  const cr = (cSteps[i].rng||[]).filter(e=>/^(?:rn2|rnd|rn1|rnl|rne|rnz|d)\(/.test(e)).map(e=>e.replace(/\s*@.*$/,''));
  const cmsg = cSteps[i].screen.split('\n')[0].trim();
  const jg = decodeScreen(g.getScreens()[i]||'');
  const jmsg = jg[0].map(renderCell).join('').trim();
  console.log(`STEP ${i} key=${JSON.stringify(cSteps[i].key)} JSrng=${jsr.length} Crng=${cr.length}`);
  console.log(`   JSmsg=${JSON.stringify(jmsg)}`);
  console.log(`   Cmsg =${JSON.stringify(cmsg)}`);
}
