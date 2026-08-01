
import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';
import { decodeScreen, renderCell } from '../frozen/screen-decode.mjs';
const s = JSON.parse(readFileSync(new URL('../sessions-extra/seed9007-valley-sacrifice.session.json', import.meta.url), 'utf8'));
const norm = normalizeSession(s); const seg = norm.segments[0];
const storage = new Map();
const h = { getItem(k){return storage.get(k)??null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){return [...storage.keys()][i]??null;} };
const g = await runSegment({ ...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, moves: seg.moves, storage: h });
const log = g.getRngLog();
const jsScreens = g.getScreens();
// rng: find step boundaries by chasing lengths? getScreens aligns to steps 1..238
// We know step i's rng prefix length from C side; but JS may diverge counts.
// Print rng events with stack site filtered to combat-ish lines for the range around a given log index
const cSteps = s.segments[0].steps;
// naive: we know first divergence index; print all js rng from 18140..18230 with counts
for (let i=18140;i<=18230;i++) console.log(i, log[i].replace(/^\d+\s+/,''));
