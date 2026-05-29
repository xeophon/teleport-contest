# Wish Object Ranges 2026-05-29

Implemented the first `readobjnam()` generic object-range wish rows for bags, candles, and horns. No private fixtures were inspected or encoded.

## C Anchors

- `o_ranges[]` maps generic wish names to object type ranges; the covered rows are `"bag"`, `"candle"`, and `"horn"`: `nethack-c/upstream/src/objnam.c:3345`.
- `readobjnam()` dispatches a matched range through `rnd_class(first, last)`: `nethack-c/upstream/src/objnam.c:4670`.
- `rnd_class()` sums `objects[i].oc_prob`, rolls `rnd(sum)`, and returns the weighted object type: `nethack-c/upstream/src/objnam.c:5403`.
- Bag probabilities are sack 35, oilskin sack 5, bag of holding 20, and bag of tricks 20: `nethack-c/upstream/include/objects.h:905`.
- Candle probabilities are tallow candle 20 and wax candle 5: `nethack-c/upstream/include/objects.h:923`.
- Horn probabilities are tooled horn 5, frost horn 2, fire horn 2, and horn of plenty 2: `nethack-c/upstream/include/objects.h:985`.

## JS Work

- Added `WISH_OBJECT_RANGES` for generic `bag`, `candle`, and `horn` wishes with C object probabilities.
- Added a small weighted range selector using the existing NetHack-style `rnd(total)` helper.
- Routed generic range wishes through the existing concrete wish metadata/finalization path so charged tools, weights, costs, classes, and `wishedfor` handling remain shared with exact wishes.
- Left `lamp` deferred because C's range includes `magic lamp`, and the JS non-wizard magic-lamp substitution path needs a source-backed decision before adding the row.

JS anchors: `js/cmd.js:1607`, `js/cmd.js:29403`, `js/cmd.js:29507`.

## Public Tests

Added focused coverage in `test/wishing.test.mjs`:

- `generic wished object ranges use C rnd_class candidates`

Focused verification:

- `node --check js/cmd.js`
- `node --test --test-name-pattern "generic wished object ranges|wished charged tools|wished charged instruments|plural wished charged instruments|empty wished horn" test/wishing.test.mjs`

## Fresh Follow-Up Findings

A parallel kicked-object audit selected ordinary floor-object `#kick` as a narrow migration slice:

- C checks floor objects before terrain/door fallback and launches kicked objects through `bhit(..., KICKED_WEAPON, ...)`: `nethack-c/upstream/src/dokick.c:1452`, `nethack-c/upstream/src/dokick.c:489`, `nethack-c/upstream/src/dokick.c:733`.
- `bhit()` starts from the source object square and checks the next square first, so a down-gate test should place the gate one square beyond the adjacent object: `nethack-c/upstream/src/zap.c:3846`, `nethack-c/upstream/src/zap.c:4049`.
- Keep `hero_breaks()` source breakage separate from later `ship_object()` breakage: `nethack-c/upstream/src/dokick.c:678`, `nethack-c/upstream/src/dokick.c:1717`.

A parallel command audit selected throw-prompt count parsing as a small `GETOBJ_ALLOWCNT` slice:

- C `dothrow()` uses `getobj("throw", throw_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT)`: `nethack-c/upstream/src/dothrow.c:371`.
- C prompt digits call `get_count()` and reject counted non-gold throws before direction selection: `nethack-c/upstream/src/invent.c:1937`, `nethack-c/upstream/src/invent.c:2028`.
- JS currently treats digits typed in `throwObject` as inventory-letter misses and throws all selected gold: `js/cmd.js:53871`, `js/cmd.js:54414`.

A parallel monster-thrown audit selected `drop_throw(ohit)` disposition as a bounded combat slice:

- C hard-deletes cream pies, venom, and hit eggs, then applies hit-only missile mulch before shipping and floor effects: `nethack-c/upstream/src/mthrowu.c:161`, `nethack-c/upstream/src/dothrow.c:1976`.
- JS has a direct helper gate for `ohit`, but production callers do not pass hit state, and missile mulch/passive-object fallout remains missing: `js/cmd.js:27779`, `js/allmain.js:5932`.

A parallel floor-statue audit selected saved-traits and `cant_revive()` as a narrow spell slice:

- C `animate_statue()` runs `cant_revive()` before golem conversion or saved-traits restoration: `nethack-c/upstream/src/trap.c:746`, `nethack-c/upstream/src/trap.c:761`.
- `cant_revive()` maps guards/clerics/angels to human zombie, long worm tail to long worm, and unique no-traits statues to directed doppelgangers: `nethack-c/upstream/src/read.c:3112`, `nethack-c/upstream/src/read.c:3126`, `nethack-c/upstream/src/trap.c:773`.
- JS floor statue animation currently pre-defers broad `unique || noCorpse || cantRevive || noCorpstat` cases and always creates a fresh monster rather than reading saved `omonst`: `js/cmd.js:13328`, `js/cmd.js:13496`, `js/cmd.js:13532`.

## Remaining Gaps

- `lamp` object-range wishes remain separate until the magic-lamp non-wizard substitution path is handled with a C-backed test.
- Other C object ranges remain open, including armor/clothing ranges, dragon scale/mail ranges, weapon ranges, and venom.
- Throw-prompt count parsing remains separate reusable `getobj()` work.
- Kicked-object floor selection/down-gate shipping remains separate.
- Monster-thrown hit-state egg/mulch/passive behavior remains separate.
- Floor statue saved-traits and `cant_revive()` animation remain separate.
