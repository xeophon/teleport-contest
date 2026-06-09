# 888 - Recoil monster setmangry

## C source

- `nethack-c/upstream/src/dothrow.c:842` through `:882` handles recoil body bumps into monsters from `hurtle_step()`.
- `nethack-c/upstream/src/dothrow.c:855` clears `mon->mundetected`, `:862` prints the bump/find message, `:866` calls `wakeup(mon, FALSE)`, `:869` calls `setmangry(mon, FALSE)`, `:870` through `:879` handle bodily petrification, and `:881` calls `wake_nearto(x, y, 10)`.
- `nethack-c/upstream/src/mon.c:4333` through `:4356` defines `wakeup()`: the `FALSE` path can print a visible non-interesting wake message, clears sleep/eating, reveals mimics, and skips the attack growl/anger wrapper tail.
- `nethack-c/upstream/src/mon.c:4265` through `:4316` defines `setmangry()`: `via_attack == FALSE` skips Elbereth hypocrisy, always clears `STRAT_WAITMASK`, preserves tame peacefulness, applies priest/non-priest alignment for peaceful non-tame targets, emits target anger/growl feedback, and allows peaceful bystanders to respond.
- `nethack-c/upstream/src/sounds.c:406` through `:424` defines `growl()`: nonhumanoid anger can emit a growl and wakes monsters near the target with distance `mlevel * 18`.

## Port

- `js/cmd.js` now runs a recoil-specific `setmangry(FALSE)` tail inside `heroHorizontalThrowRecoilMonsterCollision()`.
- Monster recoil collision messages now preserve the C order: recoil message, bump/find message, optional target wake message, target anger/growl feedback, then bodily petrification and the final `wake_nearto(..., 10)` equivalent.
- Peaceful non-tame recoil targets now become hostile/angry and apply the C alignment rule: ordinary targets penalize by 1, coaligned priests penalize by 5, and cross-aligned priests reward by 2.
- Tame and already-hostile targets still stop after wait-strategy cleanup.
- Nonhumanoid growl feedback now also runs the existing growl wake-nearby helper before the final collision wake, so nearby buried zombie timers can shorten through both C wake paths.

## Tests

- `levitating hero-thrown ordinary weapon recoil setmangry angers visible peaceful humanoid`
- `levitating hero-thrown ordinary weapon recoil setmangry uses priest alignment rule`
- Existing recoil collision tests were updated for the C growl-before-petrification and growl wake-nearby timer order.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=spec --test-name-pattern "recoil setmangry" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern "(levitating|air-level) hero-thrown ordinary weapon recoil" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `npm run score` - 44/44 passing

## Remaining nearby gaps

- Generic visible wake messages from broad `wake_nearto()` callers are still under-modeled outside this recoil target path.
- Quest-leader guardian response from the `setmangry()` target branch remains broader quest behavior.
