
import { attackList, pmOf } from './js/mhitm.js';
const mon = { data: { name: 'orc-captain', mlevel: 5, hpLevel: 6 } };
console.log(JSON.stringify(pmOf(mon)?.name), JSON.stringify(attackList(mon)));
