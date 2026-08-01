import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { game } from '../js/gstate.js';
import { GameDisplay } from '../js/game_display.js';
import { parseNethackrc } from '../js/options.js';
import { moveloop_core } from '../js/allmain.js';
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
    nhGame._usedPregame = true;
    nhGame._pendingDisplay = display;
    nhGame._reuseInitializedRng = true;
}
await nhGame.start();
const origHook = game._preNhgetchHook;
game._preNhgetchHook = async () => {
    const idx = nhGame._nhgetchCount;
    if (idx >= lo && idx <= hi) {
        console.log(`### nhgetch#${idx} moves=${game.moves} pendTime=${game._pending_time_passed} spc=${game._search_pending_count} defTail=${game._deferred_monster_turn_tail} contMore=${game._continue_monsters_after_more} mresume=${game._monster_resume_index} more=${game._message_more} pmsg=${JSON.stringify(game._pending_message)} cmd_mode=${game._command_mode} cntpfx=${JSON.stringify(game._count_prefix)}`);
    }
    await origHook();
};
let call = 0;
for (;;) {
    call++;
    const before = `${game.moves}|pt${game._pending_time_passed}|spc${game._search_pending_count}|dt${game._deferred_monster_turn_tail}`;
    try { await moveloop_core(); }
    catch (e) { if (String(e?.message||'').includes('Input queue empty')) break; throw e; }
    if (nhGame._nhgetchCount > hi + 5) break;
}
console.log('done');
