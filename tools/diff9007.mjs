import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';

const s = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const norm = normalizeSession(s);
const segments = norm.segments || [];
const isRngCall = (e) => typeof e === 'string' && /^(?:rn2|rnd|rn1|rnl|rne|rnz|d)\(/.test(e);

const cFlat = [];
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
    storage: storageHandle };
  const out = await runSegment(input);
  const r = (out.getRngLog?.() || []).map(e => String(e));
  r.forEach((e) => { if (isRngCall(e)) jsFlat.push({ call: e }); });
}
const a = Number(process.argv[3]||0), b = Number(process.argv[4]||30);
for (let i = a; i < Math.min(b, cFlat.length); i++) {
  const j = jsFlat[i];
  console.log(i, 'step', cFlat[i].step, 'C:', cFlat[i].call, '   JS:', j ? `${j.call} (s${j.step})` : '<none>');
}
