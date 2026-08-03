import { readFileSync } from 'fs';
const jsdir = process.argv[2];
const f = process.argv[3];
const nSteps = parseInt(process.argv[4]);
const sessionData = JSON.parse(readFileSync(f,'utf8'));
const seg = sessionData.segments[0];
const moves = seg.moves.split('').slice(0, nSteps).join('');
const { runSegment } = await import(jsdir + '/jsmain.js');
function mkStorage(){ const m=new Map(); return { getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k), get length(){return m.size}, key(i){let n=0; for(const k of m.keys()){if(n===i)return k;n++;} return null;} }; }
const g = await runSegment({ seed: seg.seed, datetime: seg.datetime, nethackrc: seg.nethackrc, moves, storage: mkStorage() });
const { game } = await import(jsdir + '/gstate.js');
const flagSummary = Object.entries(game).filter(([k,v])=>k.startsWith('_') && (v === true || (typeof v === 'number' && v !== 0) || (typeof v === 'string' && v))).map(([k,v])=>`${k}=${v}`).sort().join(' ');
console.log('moves=', game.moves, 'mode=', game._command_mode, 'pending=', JSON.stringify(game._pending_message), 'more=', game._message_more);
console.log(flagSummary);
