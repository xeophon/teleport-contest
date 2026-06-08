# Monster-Thrown Non-Launcher Lethal Intervening Cleanup

Date: 2026-06-05

## C Source Anchors

- `nethack-c/upstream/src/mthrowu.c:679` routes intervening monster projectile hits through `ohitmon()`.
- `nethack-c/upstream/src/mthrowu.c:451` subtracts the final damage, prints killed/destroyed wording, and calls death cleanup when the target dies.
- `nethack-c/upstream/src/mthrowu.c:459` uses `mondied()` during monster movement rather than hero-attributed `xkilled()`.
- `nethack-c/upstream/src/mthrowu.c:494` calls `drop_throw()` after the monster death path, so inventory/corpse cleanup precedes projectile landing.
- `nethack-c/upstream/src/mon.c:3173` and `src/mon.c:3251` cover monster inventory detachment and corpse creation from the `mondied()` path.

## JS Delta

- Added shared `killMonsterFromThrownInterveningHit()` cleanup in `js/allmain.js`.
- Kept launcher-arrow cleanup as a wrapper over the shared helper.
- Wired lethal intervening cleanup for slung ammo, spear, shuriken, plain dagger, crude/orcish dagger, knife, and dart branches.
- Added `passiveTarget` support to `landMonsterThrownObject()` so the projectile can still run passive-object handling against the just-hit monster after death cleanup removes it from `game.level.monsters`.
- Threaded deferred crude-dagger `_monster_throw_after_more` through the same passive target field.

## Coverage

- Added `production monster plain dagger lethal intervening hit cleans monster before landing`.
- Focused subset run:
  - `node --test --test-name-pattern "plain dagger hits|plain dagger hit bonus|plain dagger lethal|monster thrown non-potion|thrown silver weapons|thrown blessed weapons|poisoned thrown missiles|poisoned dart|poisoned dagger|launcher arrow kills|lethal launcher" test/shop-billing-helpers.test.mjs`

## Remaining Gaps

- Resume-index adjustment for removed intervening monsters that appear before the thrower in `game.level.monsters` is still launcher-shaped and should be generalized in a scheduler-focused slice.
- Eggs and broader generic object-hit factoring remain separate direct-delivery work; cobra-spit blinding venom intervening hits are covered in audit 781 and monster acid-spit venom is covered in audit 782.
