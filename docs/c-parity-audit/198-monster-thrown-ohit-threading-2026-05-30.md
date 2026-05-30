# Monster-Thrown `ohit` Threading

Date: 2026-05-30

## C Source

- `drop_throw()` receives `ohit` from monster projectile callers and uses it for hit-only egg breakage, missile mulch, and `passive_obj()`: `nethack-c/upstream/src/mthrowu.c:162`, `nethack-c/upstream/src/mthrowu.c:170`, `nethack-c/upstream/src/mthrowu.c:174`, `nethack-c/upstream/src/mthrowu.c:188`.
- Monster-target misses call `drop_throw(..., FALSE)`, while hits call it with a true hit flag: `nethack-c/upstream/src/mthrowu.c:357`, `nethack-c/upstream/src/mthrowu.c:494`.
- Hero-target throws distinguish hit/catch/miss before the final landing call; only actual hits are `ohit`: `nethack-c/upstream/src/mthrowu.c:633`, `nethack-c/upstream/src/mthrowu.c:639`, `nethack-c/upstream/src/mthrowu.c:787`, `nethack-c/upstream/src/mthrowu.c:798`, `nethack-c/upstream/src/mthrowu.c:815`.

## JS Gap

- `landMonsterThrownObject()` already accepted `ohit`, but live monster throw callers mostly omitted it.
- Deferred `_monster_throw_after_more` landings dropped the hit/miss result, so hit-only egg breaking, missile mulch, and passive object erosion could be skipped or applied from the wrong default.
- Visible caught crude daggers queued a later landing despite the catch message.

## Implemented

- Threaded `ohit: !missed` through production sling rock and plain dagger landings.
- Threaded actual hit state through visible crude-dagger deferred landings and hidden immediate landings.
- Kept caught crude daggers from queueing or performing a drop-throw landing; visible catches still clear their transient projectile after `--More--`.
- Passed queued `_monster_throw_after_more.ohit` into `landMonsterThrownObject()`.

## Tests

- Added deferred hit/miss egg tests proving queued `ohit` controls hit-only egg deletion.
- Added production sling rock hit/miss tests proving only hits enter the missile mulch roll.
- Added a production crude-dagger catch test proving catches do not queue a later drop-throw landing.

## Remaining Gaps

- Launcher arrow live landings are still incomplete.
- Dart production hit landings still need true hit-path `ohit` threading.
- Hero/polyself target passive object effects remain open.
- `AD_ENCH`/`drain_item()` for disenchanters remains recognized but unimplemented.

## Verification

- `node --check js/allmain.js`
- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern 'monster-thrown|monster sling rock|monster crude dagger' test/shop-billing-helpers.test.mjs`
