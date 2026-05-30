# C Parity Audit 201: Monster-Thrown Hero/Polyself Passive Targets And Dart Hit Landing

## Sources

- `nethack-c/upstream/src/mthrowu.c:162-190`: `drop_throw()` places surviving monster-thrown objects, resolves `m_at(x, y)`, falls back to `&gy.youmonst` when the landing square is the hero and no monster occupies it, and calls `passive_obj()` only for `ohit`.
- `nethack-c/upstream/src/mthrowu.c:695-789`: `m_throw()` records the hero hit result from `thitu()`; successful hero hits call `drop_throw(singleobj, hitu, u.ux, u.uy)`, while misses and path-end landings pass `ohit == 0`.
- `nethack-c/upstream/src/uhitm.c:6127-6184`: `passive_obj()` resolves the passive `AT_NONE` attack when its attack argument is null and applies erosion/drain effects to the object involved in the hit.
- `nethack-c/upstream/src/makemon.c:148-160`: monster throw stacks are real inventory objects; `m_initthrow()` creates the stack and only hard-poisons orcish arrows, not ordinary darts.

## JS Changes

- `landMonsterThrownObject()` passive-object target lookup now falls back to the hero square after checking live monsters, using the current polyself form as the target data when present.
- Monster-thrown objects that hit a rust-monster polyself now run the same hit-only passive object erosion path as monster targets before stacking.
- The kobold dart production branch now keeps a local thrown missile object, removes the thrown dart from monster inventory when the stack reaches one, and routes dart hits through `landMonsterThrownObject(..., { ohit: true })`.
- Removed the dart hit branch's hardcoded placeholder rolls in favor of the shared hit-only mulch path; mulch-broken missiles now consume the C-side deletion resistance roll (`rn2(100)`) before vanishing. The existing strength exercise roll remains through `exerciseAttribute(A_STR, false)`.
- Dart misses continue to land through the same helper with `ohit == false`, now using the local thrown missile object after inventory extraction.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Monster-thrown dagger hits on a rust-monster polyself erode the landing object before stacking and emit the visible rust message.
- Missed landings on a rust-monster polyself skip passive-object erosion and stack normally.
- Production kobold dart hits remove the thrown dart from monster inventory, deal deterministic damage, run the hit-only `rn2(3)` mulch check, and place the surviving dart on the hero square.
- Mulch-broken monster-thrown darts consume `rn2(100)` after the `rn2(3)` break decision, matching the public `seed0106` drop/delete trace.

## Remaining Gaps

- Launcher-arrow hit/miss landing still uses transient projectile cleanup and `_arrow_mulch_after_topline_more` instead of the shared landing helper.
- Broader direct passive-object erosion/burning/corrosion parity remains incomplete outside the covered direct `AD_ENCH` path.
- Dart poison and lethal-hit side effects are still modeled only narrowly in the existing production branch.

## Verification

- `node --check js/allmain.js`
- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern 'monster-thrown dagger (hit applies rust monster passive object erosion|miss skips rust monster passive object erosion|hit applies rust monster polyself passive object erosion|miss skips rust monster polyself passive object erosion)|monster-thrown dart hit can mulch|monster-thrown dart hit survives|monster-thrown blessed dart hit|monster-thrown dart miss|production kobold dart hit|production monster sling rock|production monster crude dagger catch' test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.mjs`
- `npm run score` (`44/44`, including `seed0106-priest-extcmd-sweep.session.json` at `RNG 4194/4194`, `Screen 267/267`)
