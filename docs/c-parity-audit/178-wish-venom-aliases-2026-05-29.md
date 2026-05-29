# Wish Venom Aliases 2026-05-29

Implemented the remaining wizard-only venom wish alias and `spe` policy rows. No private fixtures were inspected or encoded.

## C Anchors

- Venom objects are actual `splash of blinding venom` and `splash of acid venom`, share the description `splash of venom`, have `oc_prob=500`, `oc_merge=1`, `oc_nowish=1`, and weigh 1: `nethack-c/upstream/include/objects.h:1634`, `nethack-c/upstream/include/objects.h:1637`, `nethack-c/upstream/include/objects.h:1640`.
- `readobjnam()` singularizes plural input before object matching and changes implicit count 1 to 2 when singularization changes the name: `nethack-c/upstream/src/objnam.c:4435`.
- C's singularizer preserves `of venom` compounds and handles `splashes` by dropping `es`: `nethack-c/upstream/src/objnam.c:3068`, `nethack-c/upstream/src/objnam.c:3111`.
- `o_ranges[]` includes generic `venom` as `BLINDING_VENOM..ACID_VENOM`: `nethack-c/upstream/src/objnam.c:3346`.
- `rnd_class()` resolves generic `venom` through `rnd(1000)`, selecting blinding for rolls 1..500 and acid for 501..1000: `nethack-c/upstream/src/objnam.c:5403`, `nethack-c/upstream/src/objnam.c:5413`.
- Description/name lookup handles `splash of venom`, `splash of acid venom`, `acid venom`, and corresponding blinding forms through `rnd_otyp_by_namedesc()`: `nethack-c/upstream/src/objnam.c:3495`, `nethack-c/upstream/src/objnam.c:3521`, `nethack-c/upstream/src/objnam.c:4749`.
- Non-wizard wishes reject `oc_nowish` venom after type selection; wizard mode bypasses that rejection: `nethack-c/upstream/src/objnam.c:5001`, `nethack-c/upstream/src/objnam.c:5020`.
- Wished venom always ends with `spe=1`, ignoring requested enchantment or charge suffixes: `nethack-c/upstream/src/objnam.c:5175`.
- Wizard-mode mergeable quantity is honored and weight is recomputed after quantity changes: `nethack-c/upstream/src/objnam.c:5071`, `nethack-c/upstream/src/objnam.c:5395`.

## JS Work

- Kept the existing special venom resolver instead of folding venom into `WISH_OBJECT_RANGES`, because C uses different RNG paths for generic `venom` and description/name forms.
- Added C-shaped singularization for `venoms`, `splashes of venom`, `splashes of blinding venom`, and `splashes of acid venom`.
- Added plural quantity handling for those plural venom forms.
- Marked wished venom mergeable and added plural display metadata so wizard plural wishes become two splashes with correct final weight.
- Added `_wish_ignore_requested_spe` to venom objects so `+N venom` and `venom (N)` still finish with C's forced `spe=1`.
- Preserved non-wizard `oc_nowish` behavior by resolving the venom type before returning no-match, without creating a real object or spending wish conduct.

JS anchors: `js/cmd.js:19164`, `js/cmd.js:19178`, `js/cmd.js:29042`, `js/cmd.js:29240`, `js/cmd.js:29412`, `js/cmd.js:49642`.

## Public Tests

Extended `test/wishing.test.mjs` coverage in `wizard-only venom wishes follow C oc_nowish policy`:

- wizard `venom`, `splash of venom`, exact acid/blinding forms, and partial `acid venom`/`blinding venom`;
- wizard `venoms`, `splashes of venom`, and `splashes of acid venom` quantity/weight/display;
- `+7 venom` and `venom (7)` still force `spe=1`;
- non-wizard `splash of blinding venom`, `venom`, `splash of venom`, and `venoms` retry as no-match without wish conduct.

Focused verification:

- `node --check js/cmd.js`
- `node --test --test-name-pattern "wizard-only venom wishes" test/wishing.test.mjs`

## Fresh Follow-Up Findings

A parallel dragon-armor audit found a separate generic range RNG gap:

- C `dragon scales` and `dragon scale mail` ranges use `oc_prob=40` for each color, so generic ranges consume `rnd(400)`, not `rn2(10)`: `nethack-c/upstream/src/objnam.c:3345`, `nethack-c/upstream/include/objects.h:493`, `nethack-c/upstream/include/objects.h:502`, `nethack-c/upstream/src/objnam.c:5403`.
- JS currently uses the right color order but bypasses `WISH_OBJECT_RANGES` for generic dragon wishes and uses `rn1(10, 0)`.
- C exact colored `dragon scale armor` reaches the scale-mail namedesc retry path and consumes `rn2(67)`; JS currently consumes `rn2(1)`.

A parallel armor/clothing range audit confirmed remaining non-dragon object ranges:

- C rows still open: `shield`, `hat`, `helm`, `gloves`, `gauntlets`, `boots`, `shoes`, `cloak`, and `shirt`: `nethack-c/upstream/src/objnam.c:3345`.
- Zero-prob candidates such as fedora and mummy wrapping remain in range but are not selected unless the row sum is zero.
- Smallest implementation order should start with `shirt` and `shoes`, then shared `gloves`/`gauntlets`, before larger shield/helm/boots/cloak rows.

A parallel throw `getobj()` audit confirmed remaining command-menu work:

- C `?` falls back to downplayed inventory when there are no suggested throw items, `*` can return counted menu selections, and backspace/delete edit prompt counts: `nethack-c/upstream/src/invent.c:1963`, `nethack-c/upstream/src/invent.c:1979`, `nethack-c/upstream/src/cmd.c:5055`.
- JS direct throw prompt counts are covered, but downplayed fallback, menu-count return, and count editing remain open.

A parallel floor-object kick audit confirmed ordinary adjacent object kicking is absent:

- C `dokick()` checks adjacent floor objects before non-door/door terrain and launches the top object through `bhit(..., KICKED_WEAPON, ...)`: `nethack-c/upstream/src/dokick.c:1393`, `nethack-c/upstream/src/dokick.c:493`, `nethack-c/upstream/src/dokick.c:733`.
- The first shipping candidate is one square beyond the adjacent object because `bhit()` starts in front of the hero and then advances: `nethack-c/upstream/src/zap.c:3846`, `nethack-c/upstream/src/zap.c:4049`.
- A first JS slice should exclude boulders, gold, containers, monster hits/catches, and broader shop settlement while adding ordinary non-gold floor-object movement and down-gate shipping.

A parallel monster-thrown `drop_throw(ohit)` audit confirmed hit-state gaps:

- C hit callers pass `ohit=true`, miss/end callers pass false, and `drop_throw()` deletes hit eggs, runs hit-only missile mulch, ships before occupant/passive handling, places, applies `passive_obj()`, then stacks: `nethack-c/upstream/src/mthrowu.c:170`, `nethack-c/upstream/src/mthrowu.c:180`, `nethack-c/upstream/src/mthrowu.c:184`, `nethack-c/upstream/src/mthrowu.c:494`, `nethack-c/upstream/src/mthrowu.c:789`.
- JS has an `ohit` option but live callers generally omit it, hit-only mulch is missing, occupied down-gates are too restricted, and surviving hit objects stack before any passive-object mutation.

## Remaining Gaps

- Generic dragon scale/mail range RNG and colored `dragon scale armor` retry RNG remain open.
- Generic armor/clothing object ranges remain open.
- Throw menu-count/downplayed-fallback/backspace behavior remains open reusable `getobj()` work.
- Ordinary adjacent floor-object `#kick` shipping remains open.
- Monster-thrown `drop_throw(ohit)` hit-state fallout remains open.
