# Monster-Thrown Hit Mulch Prelude

Date: 2026-05-30

## C Source

- `drop_throw()` breaks cream pies and venom unconditionally, breaks eggs only when `ohit` is true, and otherwise delegates hit missiles to `should_mulch_missile()`: `nethack-c/upstream/src/mthrowu.c:162`, `nethack-c/upstream/src/mthrowu.c:170`, `nethack-c/upstream/src/mthrowu.c:174`.
- Surviving objects then pass through down-gate shipping, floor effects, placement, hit-only passive object effects, and stacking: `nethack-c/upstream/src/mthrowu.c:180`, `nethack-c/upstream/src/mthrowu.c:184`.
- `should_mulch_missile()` applies only to ammo and missiles except boomerangs and magic stones, uses `3 + greatest_erosion(obj) - obj->spe`, gives blessed monster-thrown missiles a `rn2(3)` survival roll, and gives flint and hard gems a second survival roll: `nethack-c/upstream/src/dothrow.c:1976`, `nethack-c/upstream/src/dothrow.c:1990`.

## JS Gap

- `landMonsterThrownObject()` already accepted `ohit` for egg hit deletion, but ordinary hit missiles always landed unless an earlier cream-pie or venom rule consumed them.
- This skipped the hit-only C mulch roll for monster-thrown darts, arrows, bolts, shuriken, rocks, and flint.

## Implemented

- Added a local monster-thrown `should_mulch_missile()` prelude before shipping, floor effects, and stacking.
- Kept the check hit-only by routing it through `ohit`.
- Covered currently modeled ammo and missile identities by object id, class, glyph, and kind fallback while excluding boomerangs and magic stones.
- Preserved C RNG shape for enchantment/erosion, blessed monster-thrown survival, and hard flint/gem survival.

## Tests

- Added `monster-thrown egg hit breaks before ordinary floor placement`.
- Added dart hit tests for mulch breakage, mulch survival, miss/no-roll behavior, and blessed survival RNG after initial survival.

## Remaining Gaps

- Production monster projectile callers still need true `ohit` threading into every hero/monster target path.
- Surviving hit objects still need `passive_obj()`-style effects before stack merging.
- Full ammo/missile classification should move to shared object metadata instead of the local kind/id fallback used by this narrow slice.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern 'monster-thrown (egg|dart|cream pie|venom)' test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `git diff --check`
