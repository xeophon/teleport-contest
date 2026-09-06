import assert from 'node:assert/strict';
import test from 'node:test';

import { game } from '../js/gstate.js';
import { runSegment } from '../js/jsmain.js';
import { parseNethackrc } from '../js/options.js';
import { InMemoryStorage } from '../js/storage.js';

// C: cfgfiles.c parse_conf_str()/parse_conf_file() stop at EOF; the
// unfinished buffer is discarded by cnf_parser_done(), not processed.
test('EOF does not terminate a pending continued config statement', () => {
    assert.equal(parseNethackrc('OPTIONS=name:Discarded\\').name, '');
    assert.equal(parseNethackrc('OPTIONS=name:Discarded\\\n').name, '');
    assert.equal(parseNethackrc('OPTIONS=name:Accepted\\\n\n').name, 'Accepted');
});

test('C config syntax selects a character without entering pregame input', async () => {
    const result = await runSegment({
        seed: 1,
        datetime: '20260608120000',
        storage: new InMemoryStorage(),
        nethackrc: [
            'OPTI : name=Alice,role=Wizard,race=human,gender=female,align=neutral,\\',
            '  !tutorial,!legacy,noautopickup,time,!time,pettype=none',
        ].join('\n'),
        moves: '',
    });

    assert.equal(result._usedPregame, undefined);
    assert.equal(game.plname, 'Alice');
    assert.equal(game._startup_role, 'Wizard');
    assert.equal(game._startup_race, 'human');
    assert.equal(game._startup_gender, 'female');
    assert.equal(game._startup_align, 'neutral');
    assert.equal(game._autopickup, false);
    assert.equal(game.flags.time, true);
    assert.equal(game.preferred_pet, 'n');
    assert.equal(game.tutorial_set_in_config, true);
    assert.ok(result.getScreens().length > 0);
});

test('later config lines reach startup flags after continued-option precedence', async () => {
    await runSegment({
        seed: 1,
        datetime: '20260608120000',
        storage: new InMemoryStorage(),
        nethackrc: [
            'OPTIONS=name:Alice,role:Wizard,race:human,gender:male,align:neutral',
            'OPTIONS=noautopickup,!time,!tutorial,!legacy,pettype:none',
            'OPTIONS=!!autopickup,time',
        ].join('\n'),
        moves: '',
    });

    assert.equal(game._autopickup, true);
    assert.equal(game.flags.pickup, true);
    assert.equal(game.flags.time, true);
    assert.equal(game.flags.legacy, false);
});
