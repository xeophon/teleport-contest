// Traced driver: print internal state at each nhgetch boundary around steps N..M
import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { game } from '../js/gstate.js';
import { nhgetch } from '../js/input.js';
import { GameDisplay } from '../js/game_display.js';
import { parseNethackrc } from '../js/options.js';
import { newgame, moveloop_core } from '../js/allmain.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { NethackGame } from '../js/jsmain.js';

const s = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const lo = parseInt(process.argv[3]||'20'), hi = parseInt(process.argv[4]||'36');
const storage = new Map();
const storageHandle = { getItem(k){return storage.get(k)??null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){return [...storage.keys()][i]??null;} };
const opts = parseNethackrc(seg.nethackrc);
const nhGame = new NethackGame({ seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, nethackrc: seg.nethackrc, storage: storageHandle });
const display = new GameDisplay(null);
display.onEmptyQueue = () => { throw new Error('Input queue empty - test may be missing keystrokes'); };
nhGame._pendingDisplay = display;
for (const ch of (seg.moves||'')) display.pushKey(ch.charCodeAt(0));
const needsPregame = !opts.name || !opts.role || !opts.race || !opts.gender || !opts.align;
if (needsPregame) {
    nhGame._pregameBaseOptions = opts;
    const accepted = await nhGame.runPregame(display);
    if (!accepted) { console.log('pregame not accepted'); process.exit(1); }
    nhGame._usedPregame = true;
    nhGame._pendingDisplay = display;
    nhGame._reuseInitializedRng = true;
}
await nhGame.start();
let stepIdx = 0;
const origHook = game._preNhgetchHook;
game._preNhgetchHook = async () => {
    stepIdx = nhGame._nhgetchCount; // will be incremented inside orig
    if (stepIdx >= lo && stepIdx <= hi) {
        const adj = (game.level?.monsters||[]).filter(m=>!m.dead && !m.mpeaceful && Math.abs(m.mx-game.u.ux)<=1 && Math.abs(m.my-game.u.uy)<=1).map(m=>`${m.data?.name}@${m.mx},${m.my}mv=${m.movement}mc=${m.mcanmove}`).join('|');
    console.log(`--- nhgetch#${stepIdx} moves=${game.moves} multi=${game.multi} pendmsg=${JSON.stringify(game._pending_message)} more=${game._message_more} spc=${game._search_pending_count} adj=[${adj}]`);
    }
    await origHook();
};
for (;;) {
    try { await moveloop_core(); }
    catch (e) { if (String(e?.message||'').includes('Input queue empty')) break; throw e; }
}
console.log('done, nhgetch count', nhGame._nhgetchCount);
