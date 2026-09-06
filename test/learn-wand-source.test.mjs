import assert from 'node:assert/strict';
import test from 'node:test';
import { game, resetGame } from '../js/gstate.js';
import { OBJECT_DATA } from '../js/object_data.js';
import { learnWandType, objectTypeIsKnown } from '../js/object_knowledge.js';
import { A_WIS } from '../js/const.js';

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
