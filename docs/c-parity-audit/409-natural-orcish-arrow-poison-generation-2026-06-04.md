# Natural Orcish Arrow Poison Generation

Date: 2026-06-04

## Summary

Natural Uruk-style orc inventory generation now follows the C `m_initthrow()` hard-poison rule for `ORCISH_ARROW` stacks. Uruk-hai and the Uruk branch of orc-captains now receive an orcish bow plus a crude-arrow stack whose mechanical kind is `orcish arrow`, display appearance is `crude arrow`, quantity remains `rn2(12)+3`, and `opoisoned` is forced true after object initialization.

This does not add replay, seed, map, player-name, move-count, or trace-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/makemon.c:147` through `:160`: `m_initthrow()` creates a real object with `mksobj(otyp, TRUE, FALSE)`, overwrites quantity with `rn1(oquan, 3)`, recomputes weight, and force-poisons only `ORCISH_ARROW`.
- `nethack-c/upstream/src/makemon.c:412` through `:437`: `PM_ORC_CAPTAIN` randomly uses the Mordor-orc or Uruk-hai loadout; the Uruk-hai branch gives `ORCISH_BOW` and `m_initthrow(..., ORCISH_ARROW, 12)`.
- `nethack-c/upstream/include/objects.h:147` through `:149`: `ORCISH_ARROW` is the `crude arrow`, has d5 small-monster damage, iron material, bow ammo skill, and black color.
- `nethack-c/upstream/include/objects.h:397` through `:400`: `ORCISH_BOW` is the `crude bow` and black-colored bow launcher.

## JS Changes

- `js/mklev.js`
  - Adds specific object IDs and display/init handling for natural `ORCISH_ARROW` and `ORCISH_BOW` creation.
  - Extends projectile stack initialization so specific orcish arrows receive the same initial projectile rolls as ordinary arrows before `m_initthrow()` overwrites quantity.
  - Forces `opoisoned = true` only when `m_initthrow()` created an `ORCISH_ARROW` stack.
  - Factors the Uruk launcher loadout into `m_initorcish_launcher()` and uses it for Uruk-hai and the Uruk half of orc-captain generation.
- `test/mklev-themerooms.test.mjs`
  - Adds a production `makemon()` inventory test for natural Uruk-hai and orc-captain Uruk launcher generation.

## Tests

- `natural Uruk-style orcs generate hard-poisoned orcish arrow stacks`

## Verification

- `node --check js/mklev.js`
- `node --check test/mklev-themerooms.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "natural Uruk-style orcs" test/mklev-themerooms.test.mjs` - 1 pass, 45 skipped
- `node --test test/mklev-themerooms.test.mjs` - 46 pass
- `node --test test/shop-billing-helpers.test.mjs` - 1614 pass
- `node --test test/*.test.mjs` - 1759 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- The broader Uruk-hai, Mordor-orc, and orc-captain armor/sidearm tables still contain placeholder JS equipment outside this narrow launcher/ammo slice.
- Natural elf `ELVEN_BOW`/`ELVEN_ARROW`, forest-centaur bow ammo, crossbow-bolt natural generation, and full launcher selection/wielding parity remain separate source-backed slices.
- Physical-hit life-saving before poison, poison-caused life-saving, and full poison-death cleanup ordering remain open from the previous launcher-poison slice.
