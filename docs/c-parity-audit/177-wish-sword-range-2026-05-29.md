# Wish Sword Range 2026-05-29

Implemented the `readobjnam()` generic `sword` object-range wish row. No private fixtures were inspected or encoded.

## C Anchors

- `o_ranges[]` maps generic wish names to inclusive object type ranges, including `"sword"`: `nethack-c/upstream/src/objnam.c:3345`.
- `readobjnam_postparse2()` dispatches a matched range through `rnd_class(first, last)`: `nethack-c/upstream/src/objnam.c:4670`.
- `rnd_class()` sums inclusive `objects[i].oc_prob` values and only falls back to uniform selection when the whole range has zero probability: `nethack-c/upstream/src/objnam.c:5403`.
- The C sword row candidates and probabilities are short sword 8, elven short sword 2, orcish short sword 3, dwarvish short sword 2, scimitar 15, silver saber 6, broadsword 8, elven broadsword 4, long sword 50, two-handed sword 22, and katana 4: `nethack-c/upstream/include/objects.h:243`.
- The same `objects.h` weapon rows provide the wished-object weights used here: 30 for short-sword variants, 40 for scimitar, silver saber, long sword, and katana, 70 for broadsword variants, and 150 for two-handed sword.
- C's non-wizard post-selection substitutions do not apply to the `sword` range: `nethack-c/upstream/src/objnam.c:5001`.

## JS Work

- Added concrete JS wish metadata for the sword-range candidates that were not previously materialized by exact wishes.
- Added generic `sword` to `WISH_OBJECT_RANGES` with the C `oc_prob` weights.
- Added exact-name namedesc RNG bounds for the newly exposed sword candidates, using the local `prob + 1` convention already used by exact object wishes.
- Added wished weights for the generic sword candidates so the newly reachable appearances do not fall back to zero-weight inventory behavior.
- Added `mklev.js` specific-weapon initialization and display coverage for the newly exposed elven and orcish short-sword object ids.

JS anchors: `js/cmd.js:960`, `js/cmd.js:1388`, `js/cmd.js:1497`, `js/cmd.js:1647`, `js/mklev.js:87`, `js/mklev.js:472`, `js/mklev.js:4448`.

## Public Tests

Added focused coverage in `test/wishing.test.mjs`:

- `generic wished sword range uses C rnd_class candidates`

The test checks that a generic `sword` wish resolves to a concrete C candidate, does not leave the placeholder weapon class object or generic `sword` name, preserves C weights, and varies across public seeds.

Focused verification:

- `node --check js/cmd.js && node --check js/mklev.js`
- `node --test --test-name-pattern "generic wished object ranges|generic wished lamp range|generic wished sword range" test/wishing.test.mjs`

## Fresh Follow-Up Findings

A parallel armor/clothing range audit confirmed the remaining non-dragon generic object-range rows:

- C still has `shield`, `hat`, `helm`, `gloves`, `gauntlets`, `boots`, `shoes`, `cloak`, and `shirt` in `o_ranges[]`: `nethack-c/upstream/src/objnam.c:3345`.
- JS currently covers only `bag`, `lamp`, `candle`, `horn`, and now `sword` through `WISH_OBJECT_RANGES`.
- Armor and clothing rows should be materialized through the same weighted range path, with zero-prob candidates such as fedora and mummy wrapping excluded unless the whole row has zero probability.

A parallel dragon/venom audit split off two smaller registry follow-ups:

- Dragon scales and dragon scale mail use zero-prob ranges, so C's `rnd_class()` falls back to uniform selection over the 10 dragon colors: `nethack-c/upstream/src/objnam.c:5407`, `nethack-c/upstream/include/objects.h:497`.
- Venom is `oc_nowish`, but C singularizes plural input before range lookup and forces wished venom `spe=1` in wizard mode: `nethack-c/upstream/src/objnam.c:4435`, `nethack-c/upstream/src/objnam.c:5175`, `nethack-c/upstream/include/objects.h:1634`.

A parallel throw `getobj()` audit selected remaining prompt/menu behavior:

- C `*` can return a counted menu selection, and prompt backspace edits the typed count: `nethack-c/upstream/src/invent.c:1979`, `nethack-c/upstream/src/cmd.c:5055`.
- JS direct throw prompt counts, prompt-count backspace/delete, `?` downplayed fallback, and throw `?`/`*` inventory-menu count return are covered locally; reusable `getobj()` extraction remains open.

A parallel kicked-object audit confirmed ordinary adjacent floor-object `#kick` is absent:

- C checks adjacent floor objects before door/terrain fallback and launches the top object through `bhit(..., KICKED_WEAPON, ...)`: `nethack-c/upstream/src/dokick.c:1452`, `nethack-c/upstream/src/dokick.c:493`, `nethack-c/upstream/src/zap.c:3846`.
- `bhit()` advances from the adjacent object square before checking shipping squares, so down-gate tests should place the gate one square beyond the kicked object.

A parallel floor-statue audit selected saved traits and `cant_revive()` ordering:

- C floor spell statue animation reaches `animate_statue()`, runs `cant_revive()` before golem conversion, and restores saved `omonst` traits when allowed: `nethack-c/upstream/src/zap.c:2027`, `nethack-c/upstream/src/trap.c:746`, `nethack-c/upstream/src/trap.c:761`.
- JS currently defers broad unique/no-corpse/cant-revive cases before animation and creates a fresh monster rather than using saved statue traits.

A parallel monster-thrown audit selected `drop_throw(ohit)` hit-state fallout:

- C deletes hit eggs, applies hit-only missile mulch, then runs shipping, floor effects, passive-object mutation, and stacking: `nethack-c/upstream/src/mthrowu.c:170`, `nethack-c/upstream/src/mthrowu.c:174`, `nethack-c/upstream/src/mthrowu.c:188`.
- JS has an `ohit` parameter on `landMonsterThrownObject()`, but production callers generally omit hit state and hit-only mulch/passive fallout is still missing.

## Remaining Gaps

- Generic armor/clothing object ranges remain open.
- Dragon scale/mail zero-prob uniform ranges need dedicated coverage.
- Venom plural/range aliases and wizard-mode `spe=1` policy remain separate.
- Reusable `getobj()` extraction remains open; throw menu-count return is covered only in the throw-selection path.
- Kicked floor-object down-gate shipping, monster-thrown `drop_throw(ohit)`, and floor-statue saved traits remain separate slices.
