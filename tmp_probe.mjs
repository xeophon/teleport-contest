
import { readFileSync } from 'fs';
import { normalizeSession } from './frozen/session_loader.mjs';
import { runSegment } from './js/jsmain.js';
const s = JSON.parse(readFileSync('sessions-extra/seed9162-wiz-gascloud.session.json','utf8'));
const norm = normalizeSession(s);
const storage=new Map();
const shH={getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k),get length(){return storage.size},key(i){let n=0;for(const k of storage.keys()){if(n++===i)return k;}return null}};
const seg = norm.segments[0];
const input = { seed: seg.seed ?? norm.seed, datetime: seg.datetime ?? norm.datetime,
                nethackrc: seg.nethackrc ?? norm.nethackrc, moves: seg.moves, storage: shH };
await runSegment(input);
const { game } = await import('./js/gstate.js');
for (const m of game.level.monsters||[]) console.log(JSON.stringify({
  name:m.data?.name, m1:m.data?.m1?.toString(16), mres:m.data?.mres?.toString(16), msound:m.data?.sound,
  mx:m.mx, my:m.my, mhp:m.mhp, dead:m.dead}), );
console.log('hero', game.u.ux, game.u.uy, 'blind', game.u.blind, game.u._blindTimeout);
console.log('regions', JSON.stringify(game.level.regions?.map(r=>({ttl:r.ttl,damage:r.damage,n:r.coords?.length,coords:r.coords})).slice(0,3)));
