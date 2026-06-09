# Kick Object Success Air Recoil

## C anchors

- `nethack-c/upstream/src/dokick.c:1452` through `:1461` dispatch floor-object kicks before terrain. If `kick_object(x, y, kickobjnam)` returns true, the caller attempts a one-square recoil only when `Is_airlevel(&u.uz)` is true.
- `nethack-c/upstream/src/dokick.c:517` through `:529` show that `kick_object()` false is reserved for unsupported boulder/ball/chain-style object kicks; pit/web refusals still return true.
- `nethack-c/upstream/src/dokick.c:686` through `:689` show low-range `Thump!` returns `(!rn2(3) || martial())`, so failed low-range object kicks still fall through to `kick_ouch()`.
- `nethack-c/upstream/src/dothrow.c:1078` through `:1117` implement `hurtle()`, whose verbose range-1 message is `You float in the opposite direction.`

## JS parity

- `kickFloorObjectToward()` now returns an explicit `kickObjectSucceeded` discriminator for handled object-kick paths instead of inferring success from `handled` or `moved`.
- Failed object kicks that route through `applyKickOuchDamage()` mark `kickObjectSucceeded: false`, preserving the existing failed-object `kick_ouch()` Air/Levitation recoil path and its variable `rn1(2, 4)` range.
- Successful object-kick paths, including pit/web refusals, loose-object handled returns, box/fragile/gold/monster/ordinary-flight handling, and remote migration handling, mark `kickObjectSucceeded: true`.
- The `kickDirection` command handler appends `heroHorizontalThrowRecoilResult(dir, 1)` only for successful object kicks on `Is_airlevel(game.u?.uz)`, giving Air level the C `You float in the opposite direction.` recoil while leaving ordinary Levitation-only success unchanged.
- Statue trap kicks are still handled before the generic object-kick helper, so that branch now applies the same Air-only successful object-kick recoil after `activateStatueTrap()` returns.

## Canaries

- `air-level command kick successful floor object recoils after object flight` covers successful same-level dagger flight on Air level, the Air range `rnd(3)` increment, object landing at `(15,5)`, hero recoil to `(4,5)`, and the appended `You float in the opposite direction.` message.
- `levitating command kick successful floor object does not get air-level success recoil` covers the same successful floor-object kick while levitating on an ordinary level, proving no success-only recoil message, movement, or RNG is added.

## Remaining follow-up

- Post-life-saving airlevel/levitation continuation remains open for failed-object `kick_ouch()` because the current JS life-saving command mode restores HP on the follow-up input without a per-action continuation hook.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "air-level command kick successful floor object recoils|levitating command kick successful floor object does not get air-level success recoil|command kick ordinary same-level floor object stacks|command kick low-range ordinary floor object thumps|levitating command kicked object ouch|fatal command kick at drawbridge wall" test/shop-billing-helpers.test.mjs` (`6` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`2982` tests passed)
- `npm run score` (`44/44` frozen sessions passing)
