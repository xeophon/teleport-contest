# Kick Ouch Levitation Hurtle

## C anchors

- `nethack-c/upstream/src/dokick.c:886` through `:904` implement `kick_ouch()`: print `Ouch!  That hurts!`, exercise Dexterity/Strength, handle map fallout, wake nearby monsters, roll wound/damage, then call `losehp()`.
- `nethack-c/upstream/src/dokick.c:904` through `:905` call `hurtle(-u.dx, -u.dy, rn1(2, 4), TRUE)` only after `losehp()` returns and only on the air level or while levitating.
- `nethack-c/upstream/src/hack.c:4256` through `:4283` route lethal `losehp()` through `done(DIED)`, so a fatal no-save kick does not reach the caller's `rn1(2, 4)`.
- `nethack-c/upstream/src/end.c:704` and `:1081` show that successful life-saving returns from `done()`, so exact C parity still needs kick continuation after the life-saving more prompt.
- `nethack-c/upstream/src/dothrow.c:1078` starts `hurtle()`, whose normal visible message is `You hurtle in the opposite direction.` for range greater than one.

## JS parity

- `js/cmd.js` now threads the kick direction into `applyKickOuchDamage()` for failed loose-source objects, low-range `Thump!` fallout, unsupported loose-source objects such as boulders, and solid terrain kicks.
- After nonfatal kick-ouch damage, `applyKickOuchDamage()` checks the shared air/levitation recoil predicate and consumes `rn1(2, 4)` only when a real kick direction and recoil state are present.
- Recoil movement and fallout reuse `heroHorizontalThrowRecoilResult()`, preserving existing shared behavior for the `You hurtle/float in the opposite direction.` message, movement, pass-over trap messages, trap-trigger results, and obstacle collisions.
- Fatal no-save kick-ouch damage returns the normal fatal result before recoil, so no recoil range RNG is consumed.

## Canaries

- `levitating command kicked object ouch hurtles after nonfatal damage` covers object-first boulder-on-closed-door failure, nonfatal `Ouch!` damage, subsequent levitation recoil, hero movement from `(5,5)` to `(1,5)`, and the exact RNG sequence ending with `rn2(2)` for `rn1(2,4)`.
- `levitating fatal command kicked object ouch does not consume recoil range` covers the same object-first path with lethal damage, no movement, no hurtle/float message, and no `rn1(2,4)` RNG consumption.

## Remaining follow-up

- Post-life-saving airlevel/levitation hurtle remains open because the current JS life-saving command mode restores HP on the follow-up input without a per-action continuation hook.
- Blind `feel_location(x, y)` and drawbridge-wall `The drawbridge is unaffected.` maploc fallout remain separate `kick_ouch()` work.
- Successful object-kick airlevel recoil remains separate from failed-object `kick_ouch()` recoil.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern 'kicked object ouch|boulder on closed door|levitating .*object ouch' test/shop-billing-helpers.test.mjs` (`6` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`2977` tests passed)
- `npm run score` (`44/44` frozen sessions passing)
