import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { game } from '../js/gstate.js';
import { Terminal } from '../js/terminal.js';
const s = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const lo = parseInt(process.argv[3]||'22'), hi = parseInt(process.argv[4]||'36');
let keyIdx = 0;
const orig = Terminal.prototype.readKey;
Terminal.prototype.readKey = function(...args) {
    const p = orig.apply(this, args);
    return Promise.resolve(p).then(k => {
        if (keyIdx >= lo && keyIdx <= hi) {
            console.error(`>>> key#${keyIdx}=${JSON.stringify(String.fromCharCode(k))} moves=${game.moves} pt=${game._pending_time_passed} spc=${game._search_pending_count} pmsg=${JSON.stringify(game._pending_message)} more=${game._message_more} ptm=${game._process_time_with_more}`);
        }
        keyIdx++;
        return k;
    });
};
const storage = new Map();
const storageHandle = { getItem(k){return storage.get(k)??null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){return [...storage.keys()][i]??null;} };
const { runSegment } = await import('../js/jsmain.js');
const g = await runSegment({...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, storage: storageHandle});
console.error('keys consumed total', keyIdx, 'of', (seg.moves||'').length);
