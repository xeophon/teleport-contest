import assert from 'node:assert/strict';
import test from 'node:test';

import { parseNethackrc } from '../js/options.js';

// C: options.c:parseoptions toggles each !/no/no- prefix, then processes
// comma-separated options right to left; config lines remain top to bottom.
for (const [option, enabled] of [
    ['autopickup', true], ['!autopickup', false],
    ['noautopickup', false], ['NO-autopickup', false],
    ['!!autopickup', true], ['!noautopickup', true],
    ['nono-autopickup', true], ['!no-!autopickup', false],
]) {
    test(`C option negation: ${option}`, () => {
        assert.equal(parseNethackrc(`OPTIONS=${option}`).flags.pickup, enabled);
    });
}

test('the leftmost duplicate option on a config line wins', () => {
    const parsed = parseNethackrc('OPTIONS=time,!time,name:First,name:Second');
    assert.equal(parsed.flags.time, true);
    assert.equal(parsed.name, 'First');
});

test('a later config line overrides an earlier config line', () => {
    const parsed = parseNethackrc('OPTIONS=time,name:First\nOPTIONS=!time,name:Second');
    assert.equal(parsed.flags.time, false);
    assert.equal(parsed.name, 'Second');
});

// C: cfgfiles.c:find_optparam/match_config_line_stmt; options.c:string_for_opt.
for (const statement of ['OPTIONS', 'options', 'OPTIO', 'OPTI']) {
    for (const delimiter of [':', '=']) {
        test(`config statement accepts ${statement} ${delimiter}`, () => {
            const parsed = parseNethackrc(`  ${statement} ${delimiter} name=Alice,role:Wizard,!time`);
            assert.equal(parsed.name, 'Alice');
            assert.equal(parsed.role, 'Wizard');
            assert.equal(parsed.flags.time, false);
        });
    }
}

test('compound option values start at the first colon or equals sign', () => {
    assert.equal(parseNethackrc('OPTIONS=name=Alice:the=Wizard').name, 'Alice:the=Wizard');
    assert.equal(parseNethackrc('OPTIONS=name:Alice=the:Wizard').name, 'Alice=the:Wizard');
});

test('continued config lines form one option list with C precedence', () => {
    const parsed = parseNethackrc('OPTIONS=name:First,\\\n  name:Second,\\\n  !time\nOPTIONS=color');
    assert.equal(parsed.name, 'First');
    assert.equal(parsed.flags.time, false);
    assert.equal(parsed.flags.color, true);
});

test('full-line comments are ignored and hash characters in values survive', () => {
    const parsed = parseNethackrc('  # OPTIONS=name:Wrong\n\nOPTIONS=name:Alice#1');
    assert.equal(parsed.name, 'Alice#1');
});

test('an uncontinued comment terminates a pending config statement', () => {
    const parsed = parseNethackrc('OPTIONS=time, name:Alice\\\n# ignored\nOPTIONS=!time');
    assert.equal(parsed.name, 'Alice');
    assert.equal(parsed.flags.time, false);
});

test('too-short and unrelated config statement names do not match OPTIONS', () => {
    assert.equal(parseNethackrc('OPT=name:Wrong\nOPTIONS_EXTRA=name:Wrong').name, '');
});
