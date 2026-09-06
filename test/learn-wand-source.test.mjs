import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { OBJECT_DATA } from '../js/object_data.js';
import { learnWandType, objectTypeIsKnown } from '../js/object_knowledge.js';
import { A_WIS } from '../js/const.js';
import { ROOM } from '../js/const.js';
import { GameMap } from '../js/game.js';
import { rhack } from '../js/cmd.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { vision_reset } from '../js/vision.js';

for (const known of [false, true]) for (const seen of [false, true])
    for (const blind of [false, true]) for (const hallucinating of [false, true])
        test(`learnwand typeKnown=${known} seen=${seen} blind=${blind} hallucinating=${hallucinating}`, () => {
            resetGame(); const type = OBJECT_DATA.find(type => type.symbol === 'WAN_POLYMORPH');
            const item = { _c_otyp: type.id, dknown: seen, known: false, spe: 4, bknown: false };
            if (known) game._known_object_types = [type.id];
            const events = [], observed = (known || !blind) && !hallucinating;
            const learned = !known && (seen || observed);
            const D = { blind, hallucinating,
                observe: actual => { assert.equal(actual, item); events.push('observe'); },
                exercise: (attribute, positive) => { assert.equal(attribute, A_WIS); assert.equal(positive, true); events.push('exercise'); },
                discover: (actual, data) => { assert.equal(actual, item); assert.equal(data, type); events.push('discover'); },
                update: actual => { assert.equal(actual, item); events.push('update'); },
            };
            learnWandType(item, D);
            assert.equal(item.dknown, seen || observed);
            assert.equal(item.known, false); assert.equal(item.bknown, false); assert.equal(item.spe, 4);
            assert.equal(objectTypeIsKnown(item), known || learned);
            assert.deepEqual(events, [...(observed ? ['observe'] : []), ...(learned ? ['exercise', 'discover'] : []), 'update']);
            events.length = 0;
            learnWandType(item, D);
            assert.equal(events.includes('exercise'), false, 'only the first type discovery earns Wisdom credit');
        });

for (const symbol of ['FROST_HORN', 'SPE_POLYMORPH', 'GENERIC_WAND']) test(`learnwand class gating for ${symbol}`, () => {
    resetGame(); const type = OBJECT_DATA.find(type => type.symbol === symbol);
    const item = { _c_otyp: type.id, known: false, dknown: false }; const events = [];
    learnWandType(item, { observe: () => events.push('observe'), discover: () => events.push('discover'),
        exercise: () => events.push('exercise'), update: () => events.push('update') });
    assert.deepEqual(events, symbol === 'FROST_HORN' ? ['observe', 'exercise', 'discover', 'update']
        : symbol === 'GENERIC_WAND' ? ['update'] : []);
    assert.equal(item.known, false);
});

for (const kind of ['digging', 'cold']) for (const known of [false, true]) for (const seen of [false, true])
    for (const blind of [false, true]) for (const hallucinating of [false, true])
        test(`live ${kind} learning: known=${known} seen=${seen} blind=${blind} hallucinating=${hallucinating}`, async () => {
            resetGame(); initRng(17); game.flags = {}; game.context = {};
            game.u = { ux: 10, uy: 10, uz: { dnum: 0, dlevel: 1 }, ulevel: 1,
                uhp: 20, uhpmax: 20, uhunger: 900, blind, hallucinating,
                acurr: { a: [10, 10, 10, 10, 10, 10] } };
            game.level = new GameMap();
            for (let x = 1; x < 79; x++) for (let y = 0; y < 21; y++)
                Object.assign(game.level.at(x, y), { typ: ROOM, lit: true });
            vision_reset(); enableRngLog({ reset: true });
            const type = OBJECT_DATA.find(type => type.symbol === `WAN_${kind.toUpperCase()}`);
            const item = { _c_otyp: type.id, kind, cls: 'wand', glyph: '/',
                letter: 'a', spe: 4, known: false, bknown: false, dknown: seen };
            game.inventory = [item];
            if (known) game._known_object_types = [type.id];
            const learned = !known && (seen || !blind && !hallucinating);
            for (let zap = 0; zap < 2; zap++) {
                game._zap_item = item; game._command_mode = 'zapDirection';
                await rhack('l');
                assert.equal(item.known, false);
                assert.equal(item.bknown, false);
                assert.equal(item.spe, 4, 'direction processing does not spend another charge');
                assert.equal(objectTypeIsKnown(item), known || learned);
                assert.equal(game.u.urexp || 0, known ? 0 : learned ? 10 : (zap + 1) * 10);
                assert.equal(game.context.move, 1);
            }
            assert.equal(getRngLog().filter(line => line.startsWith('rn2(19)')).length, 2 + Number(learned));
            assert.equal(getRngLog().filter(line => line.startsWith(kind === 'digging' ? 'rn2(18)' : 'rn2(7)')).length, 2);
            if (kind === 'cold') {
                assert.equal(getRngLog().some(line => line.startsWith('rn2(10)')), false, 'open-room rays do not roll wall bounces');
                assert.equal(getRngLog().filter(line => line.startsWith('rn2(6)')).length, hallucinating ? 2 : 0);
            }
        });
