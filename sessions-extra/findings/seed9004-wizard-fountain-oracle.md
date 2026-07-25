# seed9004-wizard-fountain-oracle — findings

Ground truth: `sessions-extra/seed9004-wizard-fountain-oracle.session.json`
(recipe: `sessions-extra/recipes/seed9004-wizard-fountain-oracle.session.json`)

## Coverage achieved

- Wizard levelport to the Oracle special level (Delphi, dlvl 8), arrival at a
  room whose only exit requires stepping onto a known **magic trap**
  ("Really step onto that magic trap? [yn]" → "You feel tired.").
- Melee vs a gas spore; its explosion is fatal → wizard-mode **"Die? [yn]"**
  death refusal ("OK, so you don't die.").
- 5 species genocides from wished uncursed scrolls (little dog, grid bug,
  newt, water moccasin, water nymph). Note: "water demon" can NOT be
  genocided ("No, mortal! That will not be done."), nor were-creatures.
- Entry into Delphi ("Hello, wizard, welcome to Delphi!") — the sub-room has
  a walkable opening in its NW wall, no digging needed.
- **10 fountain quaffs** across two Delphi fountains: tepid water,
  contaminated (poison), bad breath, cool draught, and two
  "You unleash a water demon!" summons (both removed via `#wizkill`).
- 3 wizard-mode **"Dry up fountain? [yn]"** prompts, all refused.
- **#dip** of the starting quarterstaff (letter `a`) into a fountain
  ("Nothing seems to happen.").

## Final JS score

`FAIL (RNG 5286/6617, Screen 15/248 (cursors 40/248))`

## Divergences

### 0. (recipe design note) `^V<name>` levelports are unsupported in JS

The natural recipe starts `^Voracle`. With that prefix the JS hero never
leaves Dlvl:1: the JS levelport text handler (js/cmd.js:72449,
`_command_mode === 'levelTeleportText'`) only parses **numeric** targets via
`cAtoiLikeLevel()`; any name ("oracle", "sokoban", "soko1") falls into
`retryInvalidLevelTeleportPrompt()` and, after 10 invalid tries,
`randomLevelTeleportFromPrompt()`. C resolves names through
`lev_by_name()` (nethack-c/upstream/src/dungeon.c:2098).
C also rejects *named cross-branch* ports ("soko1" by name fails:
`dlev_in_current_branch` check), but the `?` menu (`print_dungeon`) offers
all branches. The shipped recipe therefore uses the numeric `^V8`, which
produces byte-identical C ground truth from arrival onward (verified:
screens and all 4027 post-arrival C rng annotations identical between the
two variants). Under `^Voracle` the score was RNG 2607/6617, screens 8/253.
**Fix area:** implement `lev_by_name`/`find_level` name resolution in the JS
levelport prompt.

### 1. Magic trap roll sequence (first RNG divergence, index 5270, step 15)

C, stepping onto the known magic trap:

```
rn2(5)=1  @ dotrap(trap.c:3038)               /* "You escape ..." avoidance roll for already-seen traps */
rn2(30)=18 @ trapeffect_magic_trap(trap.c:2300) /* 1/30 "magical explosion" delete check */
rnd(20)=18 @ domagictrap(trap.c:4319)          /* fate table */
```

JS at the same positions: `rn2(30)=1`, then `rnd(20)=9` — the JS magic-trap
path (`movementMagicTrapResult` js/cmd.js:23559 / `magicTrapResult`
js/cmd.js:57520) **lacks the `rn2(5)` escape roll of C's dotrap**
(trap.c:3038) and therefore starts its effect rolls one call early; values
and all downstream calls shift. Screens match until step 15; the stream is
offset from here onward.
**Fix area:** js/cmd.js trap handling — add the already-seen avoidance
`rn2(5)` before the magic-trap effect table, in C's call order.

## Suggested fix areas

1. js/cmd.js levelport prompt: name lookup (`lev_by_name`, `find_level`,
   branch names) for wizard levelport.
2. js/cmd.js magic trap: C trap.c:3038 escape roll ordering.
