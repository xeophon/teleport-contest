
import { monsterByRndName } from './js/mklev.js';
const s = monsterByRndName('shrieker');
console.log(JSON.stringify(s && {name:s.name, m1: s.m1, mres: s.mres, breathless: s.breathless, pm: s.pm}));
