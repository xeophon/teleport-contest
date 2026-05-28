# Audit 92: Stone-to-Flesh Sokoban Boulder Guilt

Date: 2026-05-28

## Implemented Slice

This slice adds the missing Sokoban conduct/luck penalty for stone-to-flesh boulder conversion:

- stone-to-flesh still checks object material and object resistance first;
- a resisted boulder remains a boulder and does not change Sokoban conduct or luck;
- a successful boulder conversion calls the existing Sokoban guilt helper before producing an enormous meatball;
- carried and floor/downward stone-to-flesh boulder conversions both apply the same successful-transform penalty on Sokoban levels.

## C Anchors

- `nethack-c/upstream/src/zap.c:2002`: `stone_to_flesh_obj()` only affects mineral or gemstone objects.
- `nethack-c/upstream/src/zap.c:2006`: object resistance returns before any boulder transform.
- `nethack-c/upstream/src/zap.c:2014`: boulders are converted through `poly_obj(obj, ENORMOUS_MEATBALL)`.
- `nethack-c/upstream/src/zap.c:1710`: `poly_obj()` calls `sokoban_guilt()` when the original object is a boulder.
- `nethack-c/upstream/src/trap.c:7039`: `sokoban_guilt()` increments `u.uconduct.sokocheat`.
- `nethack-c/upstream/src/trap.c:7043`: `sokoban_guilt()` applies `change_luck(-1)`.

## JS Touch Points

- `js/cmd.js:12395`: the boulder branch now returns before guilt when `stoneToFleshObjectResists()` succeeds.
- `js/cmd.js:12397`: successful boulder conversion calls `applySokobanGuilt()`.
- `test/shop-billing-helpers.test.mjs:3671`: carried boulder conversion now asserts `sokocheat +1` and `uluck -1`.
- `test/shop-billing-helpers.test.mjs:3705`: the object-resistance path asserts Sokoban conduct and luck are unchanged.
- `test/shop-billing-helpers.test.mjs:3974`: downward/floor boulder conversion now asserts the same successful-transform penalty.

## Deferred Gaps

- Stone-to-flesh statue and figurine rows still belong with broader monster/statue lifecycle work.
- Broader `poly_obj()` lifecycle details remain incomplete: full object polymorph replacement semantics, merge behavior across more locations, and special object side effects.
- The existing JS `applySokobanGuilt()` is intentionally narrow and still uses the local `level.flags.sokoban_rules` representation rather than a complete C dungeon/level identity model.

## Additional Subagent Follow-Ups

- Lit oil explosion collateral: JS already appears to damage bystander monsters in the 3x3 blast, but direct lit-oil potion explosions do not yet run C-style floor fire collateral for adjacent scrolls, spellbooks, green slime globs, and shop-owned floor objects (`nethack-c/upstream/src/explode.c:454`; `nethack-c/upstream/src/zap.c:5489`).
- Remote projectile shipping: ordinary non-gold hero projectiles still need the post-floor-effect, pre-placement `ship_object()` gate for seen holes/trapdoors, including `rn2(3)`, shop debt, fresh ship breakage, and migration queue ordering (`nethack-c/upstream/src/dothrow.c:1819`; `nethack-c/upstream/src/dokick.c:1660`).
- Themed buried zombies: JS themed-room generation still needs C/Lua parity for difficulty-gated species, `buriedobjlist` placement, stopped rot timers, and `zombifyTurn` in the 990-1010 turn range (`nethack-c/upstream/dat/themerms.lua:151`; `nethack-c/upstream/src/nhlobj.c:579`).
- Monster diet metadata: C diet is a bitmask where omnivore is carnivore plus herbivore, and JS still has ad hoc diet checks in pet food, polyself smell/tripe handling, and metallivore tin handling (`nethack-c/upstream/include/monflag.h:114`; `nethack-c/upstream/src/dog.c:995`).

## Verification

Checks run after code changes:

```bash
node --check js/cmd.js
node --check test/shop-billing-helpers.test.mjs
node --test --test-reporter=spec --test-name-pattern 'stone to flesh' test/shop-billing-helpers.test.mjs
node --test test/shop-billing-helpers.test.mjs
npm run score
```

Result: focused stone-to-flesh tests pass, `24` run and `731` skipped under the name filter; full helper suite passes `755/755`; public score remains `44/44`.
