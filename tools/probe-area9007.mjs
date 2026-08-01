
import { readFileSync } from 'fs';
import { normalizeSession } from '../frozen/session_loader.mjs';
import { runSegment } from '../js/jsmain.js';
import { game } from '../js/gstate.js';
const s = JSON.parse(readFileSync(new URL('../sessions-extra/seed9007-valley-sacrifice.session.json', import.meta.url), 'utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const storage = new Map();
const storageHandle = { getItem(k){return storage.get(k)??null;}, setItem(k,v){storage.set(k,String(v));}, removeItem(k){storage.delete(k);}, get length(){return storage.size;}, key(i){return [...storage.keys()][i]??null;} };
const nkeys = norm.segments[0].moves.length;
console.log('total moves', seg.moves.length);
// need to stop right before step 167 moves... moves vs steps: run all moves minus last (steps = moves+1?)
await runSegment({...seg, seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime, moves: seg.moves.slice(0, seg.moves.length - (238-167) ), storage: storageHandle});
const ettin = (game.level?.monsters||[]).find(m=>m.data?.name==='ettin mummy');
console.log('ettin:', ettin ? `${ettin.mx},${ettin.my} hp=${ettin.mhp}` : 'gone');
if (ettin) {
  for (let y=1;y<=9;y++){
    const parts=[];
    for (let x=34;x<=44;x++){
      const l = game.level.at(x,y);
      const mon = (game.level.monsters||[]).find(m=>m.mx===x&&m.my===y);
      parts.push(`${x},${y}:t${l.typ}${mon?'/M:'+mon.data.name:''}`);
    }
    console.log(parts.join(' | '));
  }
  console.log('flags', (game.level.at(ettin.mx,ettin.my).flags), 'flagsN');
}
