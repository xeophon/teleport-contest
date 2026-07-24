// usage: node sessions-extra/rng-diff.mjs <session.json> — first positional RNG mismatches
import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';

const file = process.argv[2];
const s = JSON.parse(readFileSync(file, 'utf8'));
const norm = normalizeSession(s);
const segments = norm.segments || [];
const isRngCall = (e) => typeof e === 'string' && /^(?:rn2|rnd|rn1|rnl|rne|rnz|d)\(/.test(e);
const normalizeRng = (e) => String(e).replace(/\s*@\s.*$/, '').replace(/^\d+\s+/, '').trim();

const cFlat = []; // {call, step}
segments.forEach((seg, si) => {
  (seg.steps || []).forEach((st, i) => {
    for (const e of st.rng || []) if (isRngCall(e)) cFlat.push({ call: e, step: i, seg: si });
  });
});

const storage = new Map();
const storageHandle = {
  getItem(k) { return storage.has(k) ? storage.get(k) : null; },
  setItem(k, v) { storage.set(k, String(v)); },
  removeItem(k) { storage.delete(k); },
  get length() { return storage.size; },
  key(i) { let n = 0; for (const k of storage.keys()) { if (n++ === i) return k; } return null; },
};
let jsFlat = [];
for (const seg of segments) {
  const input = { ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime,
                  nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: storageHandle };
  const g = await runSegment(input);
  const r = (g.getRngLog?.() || []).map(e => typeof e === 'string' ? e.replace(/^\d+\s+/, '') : String(e)).filter(isRngCall);
  jsFlat = jsFlat.concat(r);
}
const N = Math.max(cFlat.length, jsFlat.length);
let shown = 0;
for (let i = 0; i < N && shown < 8; i++) {
  const c = normalizeRng(cFlat[i]?.call || '<none>');
  const j = normalizeRng(jsFlat[i] || '<none>');
  if (c !== j) {
    console.log(`first mismatch @rng[${i}] step ${cFlat[i]?.step ?? '?'}:`);
    for (let k = Math.max(0, i - 3); k < Math.min(N, i + 5); k++)
      console.log(`  [${k}] step ${cFlat[k]?.step ?? '?'} C=${normalizeRng(cFlat[k]?.call || '<none>')}  JS=${normalizeRng(jsFlat[k] || '<none>')}`);
    shown++;
    i += 4;
  }
}
if (!shown) console.log(`no positional mismatch in first ${N} calls (C=${cFlat.length} JS=${jsFlat.length})`);
else console.log(`totals: C=${cFlat.length} JS=${jsFlat.length}`);
