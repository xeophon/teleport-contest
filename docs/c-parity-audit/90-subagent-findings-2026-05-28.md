# Audit 90: Shifted-Vampire Water Revival

Date: 2026-05-28

## Implemented Slice

This slice implements the narrow lethal blessed-water gap for direct hero-thrown potion hits on shifted vampire forms:

- blessed water still follows the direct `potionhit()` body-hit path and deals `d(2,6)` damage to vampshifters;
- if the damage is lethal, JS now emits the ordinary hero kill message, then revives the same monster object in its base vampire form;
- the revived monster stays on the level, gets fresh base-form HP, wakes up, and skips ordinary corpse, inventory-drop, removal, and vanquished cleanup;
- the existing nonlethal cursed-water and werecreature water-hit behavior is unchanged.

## C Anchors

- `nethack-c/upstream/src/uhitm.c:1094`: wielded/thrown potion hits call `potionhit(mon, obj, POTHIT_HERO_BASH | POTHIT_HERO_THROW)`.
- `nethack-c/upstream/src/potion.c:1625`: `potionhit()` common monster-impact path.
- `nethack-c/upstream/src/potion.c:1831`: `POT_WATER` handles blessing-haters, werecreatures, and vampshifters.
- `nethack-c/upstream/src/potion.c:1834`: blessed water prints pain, wakes nearby monsters for vocal targets, and deals `d(2,6)`.
- `nethack-c/upstream/src/potion.c:1841`: lethal blessed-water damage calls `killed(mon)`.
- `nethack-c/upstream/include/monst.h:217`: `is_vampshifter(mon)` is keyed by the base vampire `cham` value.
- `nethack-c/upstream/src/mondata.c:531`: `mon_hates_blessings()` also includes `is_vampshifter(mon)`.
- `nethack-c/upstream/src/mon.c:2886`: `vamprises()` reverts a killed shifted vampire to base form instead of ordinary death.
- `nethack-c/upstream/src/mon.c:2922`: vampire rise restores movement and at least 10 max HP before `newcham()`.
- `nethack-c/upstream/src/mon.c:3096`: `mondead()` returns early when `vamprises()` succeeds.
- `nethack-c/upstream/src/mon.c:3470`: `killed()` routes through `xkilled(..., XKILL_GIVEMSG)`.
- `nethack-c/upstream/src/mon.c:3543`: `xkilled()` returns before corpse/drop cleanup when vampire rise made the monster alive again.

## JS Touch Points

- `js/cmd.js`: added `vampshifterRevivalBaseName()` and `reviveVampshifterFromPotionKill()`.
- `js/cmd.js`: `killMonsterFromPotionHit()` now gives shifted vampires a C-shaped rise gate before ordinary death cleanup.
- `test/shop-billing-helpers.test.mjs`: added a direct hero-thrown blessed-water regression for lethal vampire-bat-to-vampire revival, including the C-visible HP roll and no vanquished record.

## Deferred Gaps

- Full `mondead()` parity remains broader: monster life saving, genocided base form feedback, door smash/trap during vampire rise, engulf/unstick handling, conduct bookkeeping, and exact `newcham()` side effects.
- Other shifted-vampire death channels still need their own source-backed gates: acid potion, burning-oil explosion, traps, liquid/gas, monster-vs-monster kills, and petrification.
- Numeric C `cham` parity is still represented by JS `vampBase`/`chamName`/`vampshifter` fields.

## Additional Subagent Follow-Ups

- Projectile shipping: ordinary non-gold hero projectiles still need a post-floor-effect, pre-placement `ship_object()` gate for seen holes/trapdoors with `rn2(3)` drop chance, shop debt before migration, and fragile breakage before queueing (`nethack-c/upstream/src/dothrow.c:1819`; `nethack-c/upstream/src/dokick.c:1639`).
- Monster diet metadata: C uses `M1_CARNIVORE`, `M1_HERBIVORE`, `M1_OMNIVORE`, and `M1_METALLIVORE` bits plus mondata helpers (`nethack-c/upstream/include/monflag.h:114`; `nethack-c/upstream/include/mondata.h:90`). JS still has ad hoc diet checks for stone-to-flesh smell, tripe, metallivore tins, and pet food.
- Forced chest wake disturbance: blunt `#force` reaches `wake_nearby(FALSE)` before the success roll and shortens nearby buried zombie timers (`nethack-c/upstream/src/lock.c:241`; `nethack-c/upstream/src/hack.c:1798`). JS wakes sleepers but still lacks buried-zombie disturbance.
- Stone-to-flesh boulders: C `poly_obj()` applies Sokoban guilt for boulder transforms (`nethack-c/upstream/src/zap.c:1710`; `nethack-c/upstream/src/trap.c:7039`). JS has `applySokobanGuilt()` but stone-to-flesh boulder transforms do not use it yet.

## Verification

Checks run after code changes:

```bash
node --check js/cmd.js
node --check test/shop-billing-helpers.test.mjs
node --test --test-reporter=spec --test-name-pattern 'vampire|water potion|potionhit' test/shop-billing-helpers.test.mjs
node --test test/shop-billing-helpers.test.mjs
npm run score
```

Result: focused potion/water tests pass, `24` run and `730` skipped under the name filter; full helper suite passes `754/754`; public score remains `44/44`.
