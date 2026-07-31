import assert from 'node:assert/strict';
import test from 'node:test';

import { game, resetGame } from '../js/gstate.js';
import { InMemoryStorage, setStorageForTesting, vfsReadFile, vfsWriteFile } from '../js/storage.js';
import {
    DIED, PANICKED, CHOKING, STONING, STARVING, BURNING, ASCENDED,
    KILLED_BY, KILLED_BY_AN, NO_KILLER_PREFIX,
    Goodbye, an, justAn, buildEnglishList, computeEndScore, deathSummary,
    deathSummaryRows, escapedSummaryRows, farewellRow, quitSummaryLines,
} from '../js/end.js';
import { genlOutrip, ripStoneOverlayRows } from '../js/rip.js';
import { formatKiller, deathScoreLines, getRndToptenEntry, scoreWanted } from '../js/topten.js';

// These tests are source-derived from:
//   src/end.c (deaths[]/ends[] tables; really_done() score block at
//              end.c:1284-1310; done_in_by() wording at end.c:184-343),
//   src/rip.c (rip_txt[] at rip.c:27-41; center() at rip.c:67-75; wrap at
//              rip.c:113-134; gold cap at rip.c:104-106; ripYear()),
//   src/topten.c (formatkiller() topten.c:88-162; outentry()
//                 topten.c:1446-1530; topten() rank flow topten.c:755-885),
//   src/role.c:2142-2157 (Goodbye), src/objnam.c:2108-2154 (just_an/an),
//   hack.h:481-498 / :602-604 (how codes, killer formats),
//   config.h:326-345 + src/sys.c:81-84 (PERSMAX/ENTRYMAX/POINTSMIN).

/* ------------------------------------------------------------------ */

test('Goodbye matches C role farewells (role.c:2142-2157)', () => {
    assert.equal(Goodbye('Knight'), 'Fare thee well');
    assert.equal(Goodbye('Samurai'), 'Sayonara');
    assert.equal(Goodbye('Tourist'), 'Aloha');
    assert.equal(Goodbye('Valkyrie'), 'Farvel'); // C farewell is Farvel (the greeting Velkommen belongs to Hello())
    assert.equal(Goodbye('Wizard'), 'Goodbye');
    assert.equal(Goodbye('Priest'), 'Goodbye');
});

test('an()/just_an() article selection mirrors objnam.c', () => {
    assert.equal(an('gnome'), 'a gnome');
    assert.equal(an('arrow'), 'an arrow');
    assert.equal(an('small mimic'), 'a small mimic');
    assert.equal(an('unicorn'), 'a unicorn');       // long-'u' exception
    assert.equal(an('uranium bar'), 'a uranium bar');
    assert.equal(an('eucalyptus leaf'), 'a eucalyptus leaf');
    assert.equal(an('uke'), 'a uke');
    assert.equal(an('one horn'), 'a one horn');     // 'wun' sound
    assert.equal(an('one-time pass'), 'a one-time pass'); // '-' follows "one" -> stays 'a'
    assert.equal(justAn('molten lava'), '');        // no-article set
    assert.equal(justAn('the Oracle'), '');         // leading "the "
    assert.equal(an('x').slice(0, 4).trimEnd(), 'an x'); // single-letter rule ("aefhilmnosx")
    assert.equal(an('d'), 'a d');
    assert.equal(an('W'), 'a W');
});

test('buildEnglishList joins lists per end.c:1703-1749', () => {
    assert.equal(buildEnglishList('first'), 'first');
    assert.equal(buildEnglishList('first second'), 'first or second');
    assert.equal(buildEnglishList('first second third'), 'first, second, or third');
    assert.equal(buildEnglishList('a b c d'), 'a, b, c, or d');
    assert.equal(buildEnglishList(''), ''); // impossible() fallback -> empty
});

/* ------------------------------------------------------------------ */

test('formatKiller applies KILLED_BY_PREFIX[] (topten.c:96-105)', () => {
    assert.equal(formatKiller(DIED, { format: KILLED_BY_AN, name: 'gnome' }), 'killed by a gnome');
    assert.equal(formatKiller(CHOKING, { format: KILLED_BY_AN, name: 'black pudding' }),
        'choked on a black pudding');
    assert.equal(formatKiller(STARVING, { format: NO_KILLER_PREFIX, name: 'starvation' }), 'starvation');
    assert.equal(formatKiller(STONING, { format: KILLED_BY_AN, name: 'cockatrice corpse' }),
        'petrified by a cockatrice corpse');
    assert.equal(formatKiller(BURNING, { format: KILLED_BY, name: 'molten lava' }),
        'burned by molten lava');
    assert.equal(formatKiller(PANICKED, { format: NO_KILLER_PREFIX, name: 'panic' }), 'panic');
});

test('formatKiller munges record-breaking characters (topten.c:127-149)', () => {
    // ',' -> ';' ("Killed by Mr. Asidonhopo; the shopkeeper" in 'record')
    assert.equal(formatKiller(DIED, { format: KILLED_BY, name: 'Ms. Maganasipi, the shopkeeper' }),
        'killed by Ms. Maganasipi; the shopkeeper');
    // '=' -> '_' and tab -> ' '
    assert.equal(formatKiller(DIED, { format: NO_KILLER_PREFIX, name: 'a=b\tc' }), 'a_b c');
});

test('formatKiller appends ", while ..." when helpless (topten.c:151-161)', () => {
    assert.equal(formatKiller(DIED, { format: KILLED_BY_AN, name: 'ghoul' },
                              { inclHelpless: true, multi: -1, multiReason: 'paralyzed' }),
        'killed by a ghoul, while paralyzed');
    assert.equal(formatKiller(DIED, { format: KILLED_BY_AN, name: 'ghoul' },
                              { inclHelpless: true, multi: -1, multiReason: null }),
        'killed by a ghoul, while helpless');
    // not helpless -> no suffix even if a reason exists
    assert.equal(formatKiller(DIED, { format: KILLED_BY_AN, name: 'ghoul' },
                              { inclHelpless: true, multi: 0, multiReason: 'paralyzed' }),
        'killed by a ghoul');
});

/* ------------------------------------------------------------------ */

test('computeEndScore mirrors the end.c:1284-1310 score block', () => {
    // gold gain less 10%, plus 50*(deepest-1) -- end.c:1287-1296
    assert.equal(computeEndScore({ uexp: 0, gold: 420, initialGold: 0, deepest: 3, how: DIED }),
        420 - 42 + 100);
    // negative net gain clamps to 0 (end.c:1291-1292)
    assert.equal(computeEndScore({ uexp: 5, gold: 10, initialGold: 50, deepest: 1, how: DIED }), 5);
    // PANICKED skips the 10% gold cut (end.c:1293-1294)
    assert.equal(computeEndScore({ uexp: 0, gold: 100, initialGold: 0, deepest: 1, how: PANICKED }), 100);
    // deep-dungeon bonus (end.c:1296-1298): +1000*(deepest-20) from 21+, capped at 10000 past 30
    assert.equal(computeEndScore({ uexp: 0, gold: 0, initialGold: 0, deepest: 25, how: DIED }), 50 * 24 + 5000);
    assert.equal(computeEndScore({ uexp: 0, gold: 0, initialGold: 0, deepest: 31, how: DIED }), 50 * 30 + 10000);
    // ascension doubles score when offered to the original deity (end.c:1301-1310)
    assert.equal(computeEndScore({
        uexp: 10, gold: 0, initialGold: 0, deepest: 1, how: ASCENDED,
        alignOriginal: 0, alignBaseCurrent: 0, alignBaseOriginal: 0,
    }), 20);
    // converted-then-switched-back earns only half (end.c:1305-1309)
    assert.equal(computeEndScore({
        uexp: 10, gold: 0, initialGold: 0, deepest: 1, how: ASCENDED,
        alignOriginal: 0, alignBaseCurrent: 0, alignBaseOriginal: 1,
    }), 15);
});

/* ------------------------------------------------------------------ */

test('genlOutrip centers name/gold on the stone face (rip.c center())', () => {
    const stone = genlOutrip({ name: 'Quincy', gold: 420, deathText: 'killed by a gnome', year: 2026 });
    assert.equal(stone.length, 15);
    assert.equal(stone[6], '                  |      Quincy      |');
    assert.equal(stone[7], '                  |      420 Au      |');
    assert.equal(stone[8], '                  |   killed by a    |');
    assert.equal(stone[9], '                  |      gnome       |');
    assert.equal(stone[10], '                  |                  |');
    assert.equal(stone[12], '                  |       2026       |');
    assert.equal(stone[2], '                     /    REST    \\');
    assert.equal(stone[14], '        _________)/\\\\_//(\\/(/\\)/\\//\\/|_)_______');
});

test('genlOutrip wraps death at 16 using latest-space scan (rip.c:113-134)', () => {
    const stone = genlOutrip({ name: 'Beatrix', gold: 0,
        deathText: 'killed by Ms. Maganasipi; the shopkeeper', year: 2026 });
    assert.equal(stone[8], '                  |  killed by Ms.   |');
    assert.equal(stone[9], '                  | Maganasipi; the  |');
    assert.equal(stone[10], '                  |    shopkeeper    |');
    assert.equal(stone[11], '                  |                  |');
});

test('genlOutrip hard-cuts unbreakable words mid-word (rip.c:119-123)', () => {
    const deathText = 'killedby' + 'a'.repeat(26) + 'Wand';
    const stone = genlOutrip({ name: 'X', gold: 0, deathText, year: 2026 });
    assert.equal(stone[8], '                  | killedbyaaaaaaaa |');
    assert.equal(stone[9], '                  | aaaaaaaaaaaaaaaa |');
    assert.equal(stone[10], '                  |      aaWand      |');
});

test('genlOutrip has a fourth wrap line before the year row (rip.c:117)', () => {
    const longCause = 'killed by a very devout but careless follower of some strange demon lord';
    const stone = genlOutrip({ name: 'X', gold: 0, deathText: longCause, year: 2026 });
    assert.notEqual(stone[11], '                  |                  |');
});

test('genlOutrip caps gold at 999999999 and truncates names at 16 (rip.c:104-106)', () => {
    const stone = genlOutrip({ name: 'X'.repeat(40), gold: 2_000_000_000, deathText: 'died', year: 2026 });
    assert.equal(stone[6], `                  | ${'X'.repeat(16)} |`);
    assert.equal(stone[7], '                  |   999999999 Au   |');
});

test('ripStoneOverlayRows folds stone lines into [row, col, text] triplets', () => {
    const rows = ripStoneOverlayRows({ name: 'Quincy', gold: 420, deathText: 'killed by a gnome', year: 2026 });
    assert.equal(rows[0][0], 1);  // first stone row is screen row 1
    assert.equal(rows[0][1], 23); // col = number of leading spaces
    assert.equal(rows[0][2], '----------');
    assert.equal(rows[6][2], '|      Quincy      |');
    assert.equal(rows[13][1], 17); // "*|     *  *  *..." starts one column earlier
    assert.equal(rows[14][2].startsWith('_________'), true);
});

/* ------------------------------------------------------------------ */

function installDeathState({ over = {} } = {}) {
    resetGame();
    setStorageForTesting(new InMemoryStorage());
    Object.assign(game, {
        plname: 'Quincy',
        moves: 44,
        flags: { female: false },
        urole: { name: { m: 'Tourist', f: 'Tourist' } },
        urace: { adj: 'human' },
        inventory: [{ letter: '$', cls: 'coin', quan: 420 }],
        _initialGoldCount: 0,
        _goldCount: 420,
        _death_cause: 'killed by a gnome',
        _saved_levels: new Map(),
        dungeons: [
            { name: 'The Dungeons of Doom', depth_start: 1 },
            { name: 'The Gnomish Mines', depth_start: 1 },
        ],
        u: {
            uz: { dnum: 1, dlevel: 3 },
            uhp: 0, uhpmax: 10, ulevel: 1, uexp: 24, uen: 2, uac: 10,
            ualign: { type: 0 },
        },
        ...over,
    });
    return game;
}

test('deathSummary mirrors really_done fields and computation', () => {
    installDeathState();
    const dsum = deathSummary();
    assert.equal(dsum.name, 'Quincy');
    assert.equal(dsum.role, 'Tourist');
    assert.equal(dsum.gold, 420);
    assert.equal(dsum.depth, 3);
    // score = u.urexp (0, unused by this engine slice) + (420 - 42) gold + 50*(3-1) depth
    assert.equal(dsum.score, 378 + 100);
    const lines = deathSummaryRows(dsum);
    assert.ok(lines[0].startsWith('You died in The Gnomish Mines on dungeon level 3 with '));
    assert.equal(lines[1], 'and 420 pieces of gold, after 44 moves.');
    assert.equal(lines[2], 'You were level 1 with a maximum of 10 hit points when you died.');
    // ends[] verbs (end.c:52-61)
    installDeathState({ over: { _death_cause: 'burned by molten lava' } });
    assert.ok(deathSummaryRows(deathSummary())[0].startsWith('You burned in '));
    // g).\udlevel < 0 -> "passed away ... beyond the confines" (end.c:1378-1396)
    installDeathState({ over: { _death_outside_dungeon: 'heaven' } });
    assert.ok(deathSummaryRows(deathSummary())[0].startsWith('You passed away beyond the confines of the dungeon'));
    assert.equal(farewellRow(deathSummary()), 'Aloha Quincy the Tourist...');
});

test('quitSummaryLines match the #quit overlay text', () => {
    installDeathState();
    game._quit_game = 1;
    const rows = quitSummaryLines();
    assert.equal(rows[0][2], 'Aloha Quincy the Tourist...');
    assert.ok(rows[1][2].startsWith('You quit in '));
    assert.ok(rows[2][2].startsWith('and 420 pieces of gold, after 44 moves.'));
    assert.ok(rows[3][2].endsWith('when you quit.'));
    assert.equal(rows[4][2], '--More--');
});

test('escapedSummaryRows follow really_done ESCAPED branch (end.c:1584-1705)', () => {
    installDeathState();
    const rows = escapedSummaryRows(deathSummary());
    assert.equal(rows[0], 'Aloha Quincy the Tourist...');
    assert.ok(rows[2].startsWith('You escaped from the dungeon with '));
});

/* ------------------------------------------------------------------ */

test('deathScoreLines ranks and persists the current entry (topten.c:764-865)', () => {
    installDeathState();
    const rows = deathScoreLines();
    const texts = rows.map(r => r[2]);
    assert.equal(texts[0], 'You made the top ten list!');
    assert.ok(texts[1].startsWith('No  Points'));
    const entryRows = rows.filter(r => r[3] === 2).map(r => r[2]).join('\n'); // bold, wrapped
    assert.ok(entryRows.includes('Quincy-Tou-Hum-Mal-Neu'), entryRows);
    assert.ok(entryRows.includes('died in The Gnomish Mines on\n'), entryRows);
    assert.ok(entryRows.includes('level 3.  Killed by a gnome.'), entryRows);
    // hp 0 renders as '-' with max hp in brackets (topten.c:1156-1189)
    assert.ok(entryRows.includes('-  [10]'), entryRows);
    const stored = JSON.parse(vfsReadFile('/record'));
    assert.equal(stored.length, 1);
    assert.equal(stored[0].name, 'Quincy');
    assert.equal(stored[0].cause, 'killed by a gnome');
});

test('deathScoreLines orders by points and keeps older entry on ties (topten.c:764-779)', () => {
    installDeathState();
    vfsWriteFile('/record', JSON.stringify([
        { score: 502, name: 'One', role: 'Wizard', race: 'elven', gender: 'female', align: 'chaotic',
          dungeon: 'The Dungeons of Doom', depth: 2, maxlvl: 2, hp: 0, hpmax: 11,
          cause: 'killed by a goblin' },
        { score: 100, name: 'Two', role: 'Samurai', race: 'human', gender: 'male', align: 'lawful',
          dungeon: 'The Dungeons of Doom', depth: 1, maxlvl: 1, hp: 1, hpmax: 15, cause: 'killed by a jackal' },
    ]));
    const rows = deathScoreLines();
    // current entry ties 'One' (502) -> inserted after it
    const stored = JSON.parse(vfsReadFile('/record'));
    assert.deepEqual(stored.map(e => e.name), ['One', 'Quincy', 'Two']);
    const rankLine = rows.find(r => typeof r[2] === 'string' && r[2].includes('Quincy-Tou'));
    assert.ok(rankLine[2].startsWith('  2'), rankLine[2]);
});

test('deathScoreLines leaves a 0-point game unrecorded (POINTSMIN)', () => {
    installDeathState({ over: {
        _quit_game: 1, _escaped_game: 0,
        inventory: [],
        _goldCount: 0,
        moves: 13,
        u: {
            uz: { dnum: 0, dlevel: 1 },
            uhp: 3, uhpmax: 15, ulevel: 1, uexp: 0, uen: 2, uac: 10,
            ualign: { type: 0 },
        },
    } });
    const rows = deathScoreLines();
    const texts = rows.map(r => r[2]);
    assert.ok(texts[0].startsWith(' No  Points'), texts[0]); // header, no banner
    const entryRows = rows.filter(r => r[3] === 2).map(r => r[2]).join('\n');
    assert.ok(entryRows.includes('quit in The Dungeons of Doom'), entryRows);
    assert.ok(entryRows.includes('on level 1.'), entryRows);
    assert.ok(vfsReadFile('/record') === null || JSON.parse(vfsReadFile('/record')).length === 0);
});

test('outentry special-cases quit/starved/escaped text (topten.c:1066-1094)', () => {
    installDeathState();
    vfsWriteFile('/record', JSON.stringify([
        { score: 900, name: 'Starver', role: 'Wizard', race: 'elven', gender: 'male', align: 'chaotic',
          dungeon: 'The Dungeons of Doom', depth: 4, maxlvl: 4, hp: 0, hpmax: 11, cause: 'died of starvation' },
        { score: 800, name: 'Escaper', role: 'Tourist', race: 'human', gender: 'female', align: 'neutral',
          dungeon: 'The Dungeons of Doom', depth: 1, maxlvl: 5, hp: 10, hpmax: 12, cause: 'escaped' },
    ]));
    const rows = deathScoreLines().map(r => r[2]);
    const joined = rows.join('\n');
    assert.ok(joined.includes('Starver-Wiz-Elf-Mal-Cha starved to death'), joined);
    // no "in ... on level ..." clause follows "starved to death" (second_line=FALSE...)
    assert.ok(joined.includes('Escaper-Tou-Hum-Fem-Neu escaped the dungeon\n')
              && joined.includes('[max level 5].'), joined);
});

test('getRndToptenEntry follows topten.c:1408-1439 rank walk', () => {
    installDeathState();
    vfsWriteFile('/record', JSON.stringify([
        { score: 500, name: 'One', cause: 'killed by a gnome' },
        { score: 100, name: 'Two', cause: 'died' },
    ]));
    // C rnd(N) yields 1..N
    assert.equal(getRndToptenEntry(n => 1).name, 'One');
    assert.equal(getRndToptenEntry(n => 2).name, 'Two');
    assert.equal(getRndToptenEntry(n => 9).name, 'One'); // wraps back to rank 1
    // empty record -> no entry (get_rnd_toptenentry returns NULL)
    setStorageForTesting(new InMemoryStorage());
    assert.equal(getRndToptenEntry(n => 1), null);
});

test('scoreWanted mirrors prscore selection (topten.c:1051-1080)', () => {
    const e = { name: 'Galen', role: 'Sam' };
    assert.equal(scoreWanted({ rank: 1, entry: e, players: ['all'] }), true);
    assert.equal(scoreWanted({ rank: 1, entry: e, players: ['Galen'] }), true);
    assert.equal(scoreWanted({ rank: 5, entry: e, players: ['3'] }), false);
    assert.equal(scoreWanted({ rank: 5, entry: e, players: ['7'] }), true);
});

/* ------------------------------------------------------------------ */
/* Epitaph selection math (levelgen-owned machinery used by graves;   */
/* makedefs-padded random text + rn2 positioning, rumors.c:67-130)    */
/* ------------------------------------------------------------------ */

import { get_rnd_line } from '../js/mklev.js';

// The pool file stores makedefs-padded + xcrypt'd lines (see mklev.js
// pad_random_text_line()/xcrypt_text(), mirroring makedefs.c and
// hacklib.c xcrypt()); build test data through the same pipeline.
function padLine(content, pad) {
    return content.padEnd(pad, '_') + '\n';
}
function xcrypt(str) {
    let out = '';
    let bitmask = 1;
    for (const ch of str) {
        let code = ch.charCodeAt(0);
        if (code & (32 | 64)) code ^= bitmask;
        out += String.fromCharCode(code);
        bitmask = bitmask >= 16 ? 1 : bitmask * 2;
    }
    return out;
}

test('get_rnd_line picks the line following a random offset (rumors.c:67-130)', () => {
    const text = xcrypt(padLine('ab', 5)) + xcrypt(padLine('cde', 5));
    // rng lands at offset 0: the "current" line is 'ab' (read rest of it),
    // so the returned line is the *next* one
    assert.equal(get_rnd_line(text, () => 0, 5), 'cde');
    // rng lands inside the last line: reaching EOF wraps to the first line
    assert.equal(get_rnd_line(text, () => 9, 5), 'ab');
    // rng lands mid first line
    assert.equal(get_rnd_line(text, () => 4, 5), 'cde');
});

test('get_rnd_line retries when landing in long-tail padding (rumors.c:101-108)', () => {
    // first line exceeds pad+1 incl. '\n': rng offsets inside it with a
    // remainder longer than pad+1 cause a re-roll (trylimit loop)
    const text = xcrypt('abcdefgh\n') + xcrypt(padLine('next', 3));
    // offset 0 lands in the 9-char line; remainder is 9 > pad+1 -> re-roll
    // hits offset 1, 2, ... up to trylimit exhaustion (10x), then the Next
    // line follows -- matching C's accept-and-advance fallback
    assert.equal(get_rnd_line(text, n => 0, 3), 'next');
    // offset 4 leaves 'fgh' + newline = 4 chars <= pad+1 -> 'next' is next line
    assert.equal(get_rnd_line(text, n => 4, 3), 'next');
});
