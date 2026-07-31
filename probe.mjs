
import { readFileSync } from 'fs';
import { normalizeSession } from './frozen/session_loader.mjs';
import { runSegment } from './js/jsmain.js';
import { game } from './js/gstate.js';
const s = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const mov = seg.moves;
const ni = mov.indexOf('orc-captain\n');
const head = mov.slice(0, ni + 'orc-captain\n'.length);
const tail = mov.slice(ni + 'orc-captain\n'.length);
console.log('tail prefix', JSON.stringify(tail.slice(0, 12)));
const keep = Number(process.argv[4]); // tail chars to keep
const input = { seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime,
                nethackrc: seg.nethackrc ?? norm.nethackrc, moves: head + tail.slice(0, keep), storage: null };
const g = await runSegment(input);
console.log('hero at', game.u?.ux, game.u?.uy, 'hp', game.u?.uhp, 'moves', game.moves);
for (const m of (game.level?.monsters || []))
  console.log(m.m_id, m.data?.name, '@', m.mx, m.my, 'hp', m.mhp+'/'+m.mhpmax, 'mw=', m.mw?.kind || null, 'items:', (m.minvent||[]).map(i=>i.kind).join(','), 'wc', m.weapon_check, 'mov', m.movement, 'mconf', m.mconf);
