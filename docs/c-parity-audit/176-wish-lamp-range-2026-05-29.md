# Wish Lamp Range 2026-05-29

Implemented the `readobjnam()` generic `lamp` object-range wish row. No private fixtures were inspected or encoded.

## C Anchors

- `o_ranges[]` maps generic `lamp` to the tool range `OIL_LAMP..MAGIC_LAMP`: `nethack-c/upstream/src/objnam.c:3348`.
- `readobjnam_postparse2()` dispatches matched generic ranges through `rnd_class(first, last)`: `nethack-c/upstream/src/objnam.c:4671`.
- `rnd_class()` uses `objects[i].oc_prob` weighting, falling back only when the whole range has zero probability: `nethack-c/upstream/src/objnam.c:5403`.
- Object probabilities are oil lamp 45 and magic lamp 15: `nethack-c/upstream/include/objects.h:929`, `nethack-c/upstream/include/objects.h:931`.
- Non-wizard wishes substitute `MAGIC_LAMP` to `OIL_LAMP` after `d.typ` has already been selected: `nethack-c/upstream/src/objnam.c:5001`, `nethack-c/upstream/src/objnam.c:5016`.

## JS Work

- Added generic `lamp` to `WISH_OBJECT_RANGES` with the C 45/15 weighted candidates.
- Kept the range dispatch separate from exact-name tool appearance/namedesc rolls, matching C's `o_ranges[]` path.
- Applied the non-debug magic-lamp substitution after the range roll by routing selected `magic lamp` candidates through the existing oil-lamp substitution helper.
- Preserved wizard/debug behavior: generic `lamp` can materialize either oil lamp or magic lamp.

JS anchors: `js/cmd.js:1607`, `js/cmd.js:29420`.

## Public Tests

Added focused coverage in `test/wishing.test.mjs`:

- `generic wished lamp range substitutes magic lamp after C range roll outside wizard mode`

Extended existing object-range coverage to keep the visible generic range candidates checked separately from the lamp-specific non-wizard collapse.

Focused verification:

- `node --check js/cmd.js`
- `node --test --test-name-pattern "generic wished object ranges|generic wished lamp range|non-wizard exact unique and magic-lamp" test/wishing.test.mjs`

## Fresh Follow-Up Findings

A parallel `readobjnam()` range audit confirmed the remaining generic object-range rows:

- C still has `shield`, `hat`, `helm`, `gloves`, `gauntlets`, `boots`, `shoes`, `cloak`, `shirt`, `dragon scales`, `dragon scale mail`, `sword`, and `venom` in `o_ranges[]`: `nethack-c/upstream/src/objnam.c:3345`.
- Armor and clothing rows currently fall partly into JS generic armor placeholders, while `hat`, `shoes`, and `sword` can still retry as no-match.
- The next registry slice should materialize non-dragon armor/clothing rows plus `sword` through `WISH_OBJECT_RANGES`; dragon scale/mail zero-prob uniform behavior and venom policy can stay separate.

A parallel kicked-object audit confirmed ordinary adjacent floor-object `#kick` is absent:

- C checks adjacent floor objects before door/terrain fallback and launches them through `bhit(..., KICKED_WEAPON, ...)`: `nethack-c/upstream/src/dokick.c:1452`, `nethack-c/upstream/src/dokick.c:489`, `nethack-c/upstream/src/dokick.c:733`.
- `bhit()` advances from the adjacent object square to the next square before applying down-gate shipping, so down-gate tests should place the gate one square beyond the kicked object: `nethack-c/upstream/src/zap.c:3846`, `nethack-c/upstream/src/zap.c:4049`.

A parallel floor-statue audit selected saved traits and `cant_revive()` ordering:

- C floor spell statue animation reaches `animate_statue()` after material/resistance checks, runs `cant_revive()` before golem conversion, and restores saved `omonst` traits when allowed: `nethack-c/upstream/src/zap.c:1991`, `nethack-c/upstream/src/trap.c:746`, `nethack-c/upstream/src/trap.c:761`.
- JS currently defers broad unique/no-corpse/cant-revive cases before animation and creates a fresh monster rather than using saved statue traits.

A parallel monster-thrown audit selected `drop_throw(ohit)` hit-state fallout:

- C hard-deletes cream pies, venom, and hit eggs, then applies hit-only missile mulch before shipping/floor effects and passive-object fallout: `nethack-c/upstream/src/mthrowu.c:170`, `nethack-c/upstream/src/mthrowu.c:174`, `nethack-c/upstream/src/mthrowu.c:188`.
- JS has an `ohit` parameter on `landMonsterThrownObject()`, but production callers generally omit hit state and hit-only mulch/passive fallout is still missing.

A parallel throw `getobj()` audit selected remaining menu and prompt behavior:

- C `*` can return a counted menu selection, and prompt backspace edits the typed count: `nethack-c/upstream/src/invent.c:1979`, `nethack-c/upstream/src/cmd.c:5055`.
- JS direct throw prompt counts, prompt-count backspace/delete, `?` downplayed fallback, and throw `?`/`*` inventory-menu count return are covered locally; reusable `getobj()` extraction remains open.

## Remaining Gaps

- Generic armor/clothing object ranges and `sword` should replace parser-local placeholder or no-match behavior.
- Dragon scale/mail zero-prob uniform ranges need dedicated coverage.
- Venom range aliases and wizard-only `spe=1` behavior should stay pinned as a separate source-backed slice.
- Reusable `getobj()` extraction remains open; throw menu-count return is covered only in the throw-selection path.
- Kicked floor-object down-gate shipping, monster-thrown `drop_throw(ohit)`, and floor-statue saved traits remain separate slices.
