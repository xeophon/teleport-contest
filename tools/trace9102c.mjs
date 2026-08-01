import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';
import { game } from '../js/gstate.js';
const s = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const storage = new Map();
const storageHandle = { getItem(k){return storage.get(k)??null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){return [...storage.keys()][i]??null;} };
// wrap capture: replace after runSegment constructs game? Instead, hook via game global once start() sets it.
const orig = console.error;
let nhCount = 0;
// poll: wrap game's hook lazily
const p = runSegment({...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, storage: storageHandle});
const iv = setInterval(() => {
    if (!game._preNhgetchHookWrapped && game._preNhgetchHook) {
        game._preNhgetchHookWrapped = 1;
        const origHook = game._preNhgetchHook;
        let localCount = -1;
        game._preNhgetchHook = async () => {
            const idx = ++localCount;
            if (idx >= 22 && idx <= 36) orig(`>>> nhgetch#${idx} key=${JSON.stringify(seg.steps[idx]?.key)} moves=${game.moves} pt=${game._pending_time_passed} spc=${game._search_pending_count} pmsg=${JSON.stringify(game._pending_message)} more=${game._message_more} mresume=${game._monster_resume_index}`);
            await origHook();
        };
    }
}, 0);
const g = await p;
clearInterval(iv);
