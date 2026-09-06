import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { bodyPart, locomotion, heroLocomotion } from '../js/mondata.js';
import { resetGame } from '../js/gstate.js';
import { MONS, M1_NOLIMBS, S_HUMAN } from '../js/permonst.js';

const source = await readFile(new URL('../nethack-c/upstream/src/polyself.c', import.meta.url), 'utf8');
const partNames = ['arm', 'eye', 'face', 'finger', 'fingertip', 'foot', 'hand', 'handed',
    'head', 'leg', 'light headed', 'neck', 'spine', 'toe', 'hair', 'blood', 'lung', 'nose', 'stomach'];
for (const [family, species] of [
    ['humanoid', 'human'], ['jelly', 'green slime'], ['animal', 'giant ant'], ['bird', 'raven'],
    ['horse', 'pony'], ['sphere', 'gas spore'], ['fungus', 'violet fungus'], ['vortex', 'fire vortex'],
    ['snake', 'pit viper'], ['worm', 'long worm'], ['spider', 'giant spider'], ['fish', 'electric eel'],
]) {
    test(`${species} anatomy matches all 19 source ${family} parts`, () => {
        const literal = new RegExp(`\\*${family}_parts\\[\\] = \\{([\\s\\S]*?)\\}`).exec(source)[1];
        const expected = [...literal.matchAll(/"([^"]+)"/g)].map(match => match[1]);
        assert.equal(expected.length, 19);
        assert.deepEqual(partNames.map(part => bodyPart({ name: species }, part)), expected);
    });
}

for (const [species, part, expected] of [
    ['dog', 'hand', 'paw'], ['kitten', 'handed', 'pawed'], ['sewer rat', 'foot', 'rear paw'],
    ['owlbear', 'arm', 'foreleg'], ['owlbear', 'leg', 'rear leg'], ['yeti', 'arm', 'arm'],
    ['monkey', 'foot', 'foot'], ['troll', 'hand', 'claw'], ['troll', 'handed', 'clawed'],
    ['human', 'hand', 'hand'], ['stone golem', 'hand', 'hand'], ['amorous demon', 'hand', 'hand'],
    ['mumak', 'nose', 'trunk'], ['mastodon', 'nose', 'trunk'], ['shark', 'hair', 'skin'],
    ['jellyfish', 'arm', 'tentacle'], ['kraken', 'foot', 'tentacle'], ['kraken', 'hand', 'tentacle'],
    ['floating eye', 'eye', 'cornea'], ['plains centaur', 'hand', 'hand'], ['forest centaur', 'leg', 'rear leg'],
    ['cockatrice', 'hair', 'scales'], ['cockatrice', 'hand', 'wing'], ['rothe', 'hair', 'fur'],
    ['rothe', 'foot', 'rear hoof'], ['yellow light', 'hand', 'ray'], ['black light', 'handed', 'rayed'],
    ['yellow light', 'leg', 'beam'], ['stalker', 'head', 'head'], ['red dragon', 'hair', 'scales'],
]) {
    test(`${species} ${part} uses source exception ${expected}`, () => {
        assert.equal(bodyPart({ name: species }, part), expected);
    });
}

test('body-part lookup accepts canonical rows, monster objects, and numeric selectors', () => {
    const dog = MONS.find(mon => mon.name === 'dog');
    assert.equal(bodyPart(dog, 9), 'rear leg');
    assert.equal(bodyPart({ data: dog }, 'LEG'), 'rear leg');
    assert.equal(bodyPart(null, 'leg'), 'leg');
    assert.equal(bodyPart(dog, -1), 'mystery part');
});

for (const [species, verb] of [
    ['floating eye', 'float'], ['bat', 'fly'], ['red dragon', 'fly'], ['pit viper', 'slither'],
    ['gray ooze', 'ooze'], ['brown mold', 'wiggle'], ['human', 'move'],
]) {
    test(`${species} locomotion preserves capitalization`, () => {
        assert.equal(locomotion({ name: species }, 'move'), verb);
        assert.equal(locomotion({ name: species }, 'Move'), verb[0].toUpperCase() + verb.slice(1));
    });
}

test('limbless mobile forms crawl after earlier locomotion predicates are excluded', () => {
    assert.equal(locomotion({ m1: M1_NOLIMBS, mlet: S_HUMAN, mmove: 3 }, 'move'), 'crawl');
});

test('ordinary forms retain the supplied verb', () => {
    assert.equal(locomotion({ name: 'human' }, 'stride'), 'stride');
    assert.equal(locomotion({ name: 'human' }, 'Advance'), 'Advance');
});

test('hero levitation precedes flight and both precede polymorph locomotion', () => {
    const g = resetGame();
    g.u = { _polyself_form: { name: 'pit viper' }, levitating: true, flying: true };
    assert.equal(heroLocomotion('move'), 'float');
    assert.equal(heroLocomotion('Move'), 'Float');
    g.u.levitating = false;
    assert.equal(heroLocomotion('move'), 'fly');
    g.u.flying = false;
    assert.equal(heroLocomotion('move'), 'slither');
    g.u._polyself_form = null;
    assert.equal(heroLocomotion('move'), 'move');
});
