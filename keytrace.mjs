import { readFileSync } from 'fs';
import { runSegment } from './js/jsmain.js';
import { normalizeSession } from './frozen/session_loader.mjs';
import * as inputMod from './js/input.js';

const orig = inputMod.nhgetch;
const keyLog = [];
const s = JSON.parse(readFileSync('sessions-extra/seed9163-wiz-cockatrice.session.json','utf8'));
const norm = normalizeSession(s);
const seg = norm.segments[0];
const storage = new Map();
const sh = {getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k),get length(){return storage.size},key(i){let n=0;for(const k of storage.keys()){if(n++===i)return k;}return null;},
};
// monkeypatch nhgetch to log
const inputModule = await import('./js/input.js');
// nhgetch is exported as function; can't reassign module export easily in same module graph...
// instead: pass a custom nhgetch? Not possible. Use display.readKey path? game uses pushKey queue.
// Fallback: instrument via a wrapper on Array.prototype? no. Just count queue consumption using a Proxy on the display.
