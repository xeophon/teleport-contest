
import { readFileSync } from 'fs';
import { join } from 'path';
const PROJECT_ROOT = '/tmp/nh-cont9150';
const { game } = await import(join(PROJECT_ROOT, 'js/gstate.js'));
const { getRngLog } = await import(join(PROJECT_ROOT, 'js/rng.js'));
const sessionData = JSON.parse(readFileSync(join(PROJECT_ROOT, 'sessions-extra/seed9150-wizard-harass-intervene.session.json'), 'utf8'));
const { normalizeSession } = await import(join(PROJECT_ROOT, 'frozen/session_loader.mjs'));
const { runSegment } = await import(join(PROJECT_ROOT, 'js/jsmain.js'));
const segments = normalizeSession(sessionData).segments;
const storage = new Map();
const storageHandle = {
  getItem(k){ return storage.has(k)?storage.get(k):null; },
  setItem(k,v){ storage.set(k,String(v)); },
  removeItem(k){ storage.delete(k); },
  get length(){ return storage.size; },
  key(i){ let n=0; for (const k of storage.keys()){ if(n===i) return k; n++; } return null; },
};
let watched = false;
function watchU() {
  if (watched || !game.u) return;
  watched = true;
  let hp = game.u.uhp;
  Object.defineProperty(game.u, 'uhp', {
    get() { return hp; },
    set(v) {
      const L = getRngLog().length;
      if (L > 7000) {
        console.error(`HPDEBUG rng=${L} ${hp} -> ${v} moves=${game.moves} mode=${game._command_mode} qmsg=${JSON.stringify(game._queued_message_after_more||'')}`);
      }
      hp = v;
    },
    configurable: true,
    enumerable: true,
  });
}
for (const seg of segments) {
  const input = { seed: seg.seed, datetime: seg.datetime, nethackrc: seg.nethackrc, moves: seg.moves, storage: storageHandle };
  await runSegment(input);
  watchU();
}
