import assert from 'node:assert/strict';
import test from 'node:test';
import { GameMap } from '../js/game.js';
import { resetGame } from '../js/gstate.js';
import * as generation from '../js/mklev.js';
import { MONS, PM_ARCHEOLOGIST, PM_WIZARD, PM_VALKYRIE, PM_SAMURAI, PM_MONK, PM_BARBARIAN, PM_KNIGHT, PM_CLERIC } from '../js/permonst.js';
import { findMac } from '../js/mhitm.js';
import { initRng, enableRngLog, getRngLog } from '../js/rng.js';
import { ROOM, W_ARM, W_ARMC, W_ARMG } from '../js/const.js';

function setup(seed, endgame = true) {
    const g = resetGame(); initRng(seed); enableRngLog();
    Object.assign(g, { moves: 100, in_mklev: true, inventory: [], level: new GameMap(),
        astral_level: { dnum: 1, dlevel: 1 },
        u: { ux: 1, uy: 1, ulevel: 30, uhave: {}, uz: { dnum: endgame ? 1 : 0, dlevel: 1 }, ualign: { type: 0, record: 10 } },
        dungeons: [{ name: 'The Dungeons of Doom', depth_start: 1 }, { name: 'The Elemental Planes', depth_start: -1, ledger_start: 60 }] });
    for (let x=1;x<80;x++) for (let y=0;y<21;y++) g.level.at(x,y).typ=ROOM;
    return g;
}

for (const species of MONS.slice(PM_ARCHEOLOGIST, PM_WIZARD + 1)) {
    test(`${species.name} endgame player receives a developer rank, fake Amulet and worn enchanted armor`, async () => {
        for (const seed of [1,19,731]) {
            setup(seed);
            const mon = await generation.mk_mplayer(species, 20, 10, true);
            assert.ok(mon.m_lev >= 15 && mon.m_lev <= 30);
            assert.ok(mon.mhp >= mon.m_lev + 31 && mon.mhp <= mon.m_lev*10 + 60);
            assert.ok(mon.givenName.includes(' the '));
            assert.equal(mon.mpeaceful, 0);
            const fakeIndex = mon.minvent.findIndex(obj => obj.fakeAmuletOfYendor);
            assert.ok(fakeIndex > -1);
            assert.equal(mon.minvent[fakeIndex].actualKind, 'cheap plastic imitation of the Amulet of Yendor');
            assert.ok(mon.minvent.some(obj => obj.owornmask));
            assert.ok(findMac(mon) < 10);
            if (species.pm === PM_MONK) {
                assert.ok(!mon.minvent.some(obj => obj.owornmask & W_ARM));
                assert.equal(mon.minvent.find(obj => obj.owornmask & W_ARMC)?.kind, 'robe');
            }
            if (species.pm !== PM_MONK) {
                const weapon = mon.minvent[fakeIndex-1];
                assert.equal(weapon.cls === 'weapon' || weapon.actualKind === 'unicorn horn', true);
                assert.ok(weapon.spe >= (weapon.artifact === 'Magicbane' ? 1 : 4) && weapon.spe <= (weapon.artifact === 'Magicbane' ? 4 : 8));
            }
        }
    });
}

test('special player requests outside the endgame follow the ordinary RNG path', async () => {
    setup(19, false); const ordinary = await generation.mk_mplayer(MONS[PM_SAMURAI],20,10,false); const rolls = [...getRngLog()];
    setup(19, false); const requested = await generation.mk_mplayer(MONS[PM_SAMURAI],20,10,true);
    assert.deepEqual(getRngLog(), rolls); assert.equal(requested.mhp,ordinary.mhp);
    assert.ok(!requested.givenName); assert.ok(!requested.minvent.some(obj=>obj.fakeAmuletOfYendor));
});

test('female endgame players use the C female developer-name rules and female rank', async () => {
    const names = new Set();
    for (let seed=1;seed<=30;seed++) {
        setup(seed); const mon = await generation.mk_mplayer(MONS[PM_VALKYRIE],20,10,true);
        assert.equal(mon.female, true);
        const [name,rank] = mon.givenName.split(' the ');
        assert.ok(['Eve','Maud','Janet'].includes(name)); names.add(name);
        assert.ok(['Warrior','Swashbuckler','Heroine','Champion','Lady'].includes(rank));
        const fakeIndex=mon.minvent.findIndex(obj=>obj.fakeAmuletOfYendor);
        if (mon.minvent[fakeIndex-1].actualKind === 'war hammer')
            assert.equal(mon.minvent.find(obj=>obj.owornmask & W_ARMG)?.kind,'gauntlets of power');
    }
    assert.ok(names.size>=2);
});

test('player creation relocates the original occupant before placing the requested player', async () => {
    const g=setup(19); const old={mx:20,my:10,data:MONS[PM_SAMURAI]}; g.level.monsters.push(old);
    const mon=await generation.mk_mplayer(MONS[PM_SAMURAI],20,10,true);
    assert.deepEqual([mon.mx,mon.my],[20,10]); assert.notDeepEqual([old.mx,old.my],[20,10]);
    assert.equal(g.level.monsters.filter(other=>other.mx===20&&other.my===10).length,1);
});

test('create_mplayers places the requested number using the C role and coordinate ranges', async () => {
    assert.equal(typeof generation.create_mplayers,'function');
    const g=setup(19); await generation.create_mplayers(8,true);
    assert.equal(g.level.monsters.length,8);
    const coords=new Set();
    for(const mon of g.level.monsters) {
        assert.ok(mon.data.pm>=PM_ARCHEOLOGIST&&mon.data.pm<=PM_WIZARD);
        assert.ok(mon.mx>=2&&mon.mx<=77&&mon.my>=1&&mon.my<=19);
        coords.add(`${mon.mx},${mon.my}`); assert.ok(mon.givenName);
    }
    assert.equal(coords.size,8);
    assert.deepEqual(getRngLog().slice(0,3).map(e=>e.split('=')[0]),['rn2(13)','rn2(76)','rnd(19)']);
});

for (const pm of [PM_BARBARIAN, PM_KNIGHT, PM_CLERIC, PM_VALKYRIE]) {
    test(`${MONS[pm].name} can receive either ordinary heavy armor or dragon scale mail`, async () => {
        const suits = new Set();
        for (let seed = 1; seed <= 30; seed++) {
            setup(seed);
            const mon = await generation.mk_mplayer(MONS[pm],20,10,true);
            const suit = mon.minvent.find(obj => obj.owornmask & W_ARM);
            assert.ok(suit);
            suits.add(suit.actualKind || suit.kind);
        }
        assert.ok([...suits].some(kind => kind.endsWith('dragon scale mail')));
        assert.ok([...suits].some(kind => ['plate mail','crystal plate mail','bronze plate mail','splint mail','banded mail',
            'dwarvish mithril-coat','elven mithril-coat','chain mail'].includes(kind)));
    });
}
