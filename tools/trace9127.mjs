// Per-step engine-state trace for seed9127: at each input wait, capture
// mode/more/death-state fields + uhp + status HP that would be displayed.
import { readFileSync } from 'fs';
import * as jsmain from '../js/jsmain.js';
import { game } from '../js/gstate.js';
const path = process.argv[2] || 'sessions-extra/seed9127-wiz-muse-items.session.json';
const lo = parseInt(process.argv[3] ?? '0'), hi = parseInt(process.argv[4] ?? '999');
const s = JSON.parse(readFileSync(path, 'utf8'));
const { normalizeSession } = await import('../frozen/session_loader.mjs');
const segs = normalizeSession(s).segments;

const rows = [];
const origHook = jsmain.NethackGame.prototype._installCaptureHook;
jsmain.NethackGame.prototype._installCaptureHook = function () {
    origHook.call(this);
    const inner = game._preNhgetchHook;
    const nhGame = this;
    game._preNhgetchHook = async () => {
        const st = {
            step: nhGame._nhgetchCount,
            mode: game._command_mode || '',
            more: game._message_more || 0,
            pend: game._pending_message || '',
            queued: game._queued_message_after_more || '',
            dpc: !!game._death_pending_confirm,
            dshp0: game._death_status_hp_before_zero,
            uhp: game.u?.uhp,
            dcm: game._death_cause || '',
        };
        rows.push(st);
        await inner();
    };
};

const storage = new Map();
const storageHandle = { getItem(k){return storage.get(k)??null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){return [...storage.keys()][i]??null;} };
for (const seg of segs) {
    await jsmain.runSegment({ ...seg, seed: seg.seed, datetime: seg.datetime, storage: storageHandle });
}
for (const r of rows) {
    if (r.step >= lo && r.step <= hi)
        console.log(r.step, 'mode=' + r.mode, 'more=' + r.more, 'pend=' + JSON.stringify(r.pend.slice(0,30)), 'queued=' + JSON.stringify(r.queued.slice(0,30)), 'dpc=' + r.dpc, 'dshp0=' + r.dshp0, 'uhp=' + r.uhp, r.dcm);
}
