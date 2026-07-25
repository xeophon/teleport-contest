# Findings: seed9007-valley-sacrifice

## What the session covers (ground truth, recorded with C recorder)

Wizard "Offer" (chaotic — rc has `align:chaotic` last), seed 9007,
datetime 20260720093000:

- `#wizwish` 100 gold (for the offer-gold test) and
  `#wizwish wand of teleportation` (lands on letter `o`).
- `^V` name-levelport `valley` (main→gehennom is allowed in C's wizard
  levelport; arrival shows `You arrive at the Valley of the Dead...` and
  `The odor of burnt flesh and decay pervades the air.` as TWO --More--s;
  the original stub's `#wizmap` was eaten by those mores — stub recipe
  fixed with two spaces and re-recorded).
- `#wizmap`, then `^T` position-teleport next to the altar of Moloch
  (screen (74,11); DECgraphics draws altars as `{`, dat/symbols
  `S_altar: \xfb`).
- Priest greeting: `The priest of Moloch intones: "Pilgrim, you enter a
  sacred place!"` — a hostile aligned cleric (4d10 melee, MR 50) plus an
  adjacent lich infest the shrine.
- `z` wand of teleport `o` west → `The lich vanishes!`
- `#wizgenesis tame minotaur` (0-turn debug command), step onto the altar,
  wait out the brawl with `. ` x8: `The minotaur hits the priest of
  Moloch...` (many --More--s) → `The priest of Moloch is killed!`
  (hero untouched).
- `z` `o` east → `The minotaur vanishes!` (dismisses the pet so it can't
  steal the kill).
- `#wizgenesis newt` → `A newt appears next to you.` (SW of hero).
- `Z` cast → `a` (force bolt, "Choose which spell to cast" menu) → `b`
  direction: `The spell hits it!  You kill the newt!`
- `b` step, `,` pickup → `p - a newt corpse.`, `u` back onto the altar.
- `#offer` → `What do you want to sacrifice? [p or ?*]` → `$` →
  `You cannot sacrifice gold.` (getobj GOLD_SYM rejection, invent.c).
- `#offer` → `p` → `Moloch rejects your sacrifice!` + `The voice of
  Moloch booms: "Suffer, infidel!"` — NOTE: the valley altar is
  align="noalign" (Moloch), NOT chaotic as the task sheet assumed;
  A_NONE + Inhell forces the rejection branch of
  `offer_different_alignment_altar` (pray.c): ugangr+3, align−5,
  luck−5, WIS 11→9; the corpse is NOT consumed.
- Step off, drop the corpse, step back on, `#offer` →
  `You don't have anything to sacrifice.`

Coverage: wishes (object+gold), name levelport, valley arrival mores,
wizmap, wiz-teleport, wand of teleport zaps, tame wizgenesis, pet
combat vs temple priest, force-bolt kill, corpse pickup, and all three
`#offer` paths (gold rejection, Moloch rejection, empty offer).

## Final JS score

`node frozen/ps_test_runner.mjs sessions-extra/seed9007-valley-sacrifice.session.json`
**FAIL — RNG 2254/21276, Screens 64/238 (cursors 85/238).**

## Divergence 1 (root cause): name-based levelport unsupported in JS

First RNG mismatch, flat index 2254 (the very first call of valley
level-gen, right after the wand-of-teleportation wish):

```
[2253] C:  rn2(100)=45 @ makewish(zap.c:6421)
[2253] JS: rn2(100)=45
[2254] C:  rn2(3)=0  @ getbones(bones.c:645)   <<< C starts valley gen
[2254] JS: rnd(100)=77                         <<< JS random-levelports
[2255] C:  rn2(3)=1  @ random src=nhlib.lua:8 parent=shuffle(nhlib.lua:19)
[2255] JS: rn2(19)=8
```

In C, `^V` + `valley\n` resolves through `lev_by_name(buf)`
(dungeon.c:2098) and ports to the Valley. In the JS, the
`levelTeleportText` handler parses the answer with `cAtoiLikeLevel`
(js/cmd.js:5176), which is ONLY `Number.parseInt` — there is no
`lev_by_name` equivalent at all. Any typed level name ("valley",
"castle", "oracle", "sokoban", "minetn") yields NaN, so the JS
re-prompts (`retryInvalidLevelTeleportPrompt`), consumes the following
recipe keys as more getlin input, and after 10 failures falls into
`randomLevelTeleportFromPrompt` → `rnd(100)` → the hero lands on a
RANDOM level instead of the Valley. Everything downstream desyncs.

Same failure confirmed on the provided stubs
`sessions-extra/seed9004-arrive-oracle.session.json` (FAIL 2590/5227)
and `sessions-extra/seed9005-arrive-sokoban.session.json` (FAIL
2001/5558), which also use name ports.

Suspect: `cAtoiLikeLevel` / the `levelTeleportText` command handler in
`js/cmd.js` (~lines 5176, 72488); C reference `lev_by_name`
(dungeon.c:2098), incl. its branch reachability rule
(`dlev_in_current_branch`, dungeon.c:2087, which in this build also
allows main↔gehennom — "valley" and "castle" work from Dlvl:1, while
cross-branch names like "minetn" correctly fail).

## Divergences 2+ (not independently reachable yet)

Because the whole session desyncs at the levelport, nothing after it
(wizgenesis, pet fight, force bolt, #offer paths) can be compared
positionally. After `lev_by_name` is implemented, re-score to expose
any further divergences in those areas.

## Suggested fix areas

1. Implement `lev_by_name` in the JS levelport: exact (case-insensitive)
   match against special-level proto names + mapseen annotations +
   branch names, with C's reachability rule (`dlev_in_current_branch`
   incl. the medusa↔valley and main↔gehennom allowances) and the
   wizard-mode VISITED exemption. The `?` menu path already works in
   the JS (menu port used for seed9006) and should stay equivalent.
2. Re-score; then examine the valley-gen/pet/fight/#offer steps that
   become comparable.
