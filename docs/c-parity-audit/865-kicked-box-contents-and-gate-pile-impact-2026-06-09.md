# Kicked Box Contents And Gate Pile Impact

## C anchors

- `nethack-c/upstream/src/dokick.c:649` enters the kicked box/chest branch for command kicks.
- `nethack-c/upstream/src/dokick.c:653` prints `THUD!` for low range, then calls `container_impact_dmg()` before lock/lid RNG.
- `nethack-c/upstream/src/dokick.c:422` makes `container_impact_dmg()` meaningful only for non-magic containers with contents.
- `nethack-c/upstream/src/dokick.c:433` through `:461` break glass and egg contents, emit muffled messages, update luck/shop debt, and refresh container weight.
- `nethack-c/upstream/src/dokick.c:656` through `:670` return early on lock break or lid slam after content impact.
- `nethack-c/upstream/src/dokick.c:673` returns for low-range box kicks after content impact; otherwise boxes fall through into ordinary kicked-object flight.
- `nethack-c/upstream/src/dokick.c:733` launches the surviving kicked box through `bhit(..., KICKED_WEAPON, ...)`.
- `nethack-c/upstream/src/zap.c:4049` calls `ship_object()` for kicked weapons on each down-gate square.
- `nethack-c/upstream/src/dokick.c:1657` rolls non-ladder no-drop with `rn2(3)`.
- `nethack-c/upstream/src/dokick.c:1665` counts other pile objects on the gate square for impact messaging.
- `nethack-c/upstream/src/dokick.c:1687` runs `impact_drop()` on no-drop before returning false to `bhit()`.
- `nethack-c/upstream/src/dokick.c:1559` gives impacted non-boulder pile objects independent `rn2(3)` fall chances.
- `nethack-c/upstream/src/zap.c:4076` continues kicked flight after `ship_object()` returns false.

## JS parity

- `js/cmd.js` now exempts boxes/chests from the command-kick non-empty contents rejection while keeping non-box container/object contents unsupported.
- `applyKickedBoxImpact()` now calls `projectileContainerImpactDmg()` with `fromInventory: false` before lock/lid rolls, matching C's kicked-container impact order.
- A command-kicked non-empty box can now break fragile contents, then continue into down-stair migration when the local lid roll fails.
- A command-kicked box that no-drops on an occupied down-gate square now has a command canary for the C impact side effect: the pile may migrate while the box continues same-level flight.

## Remaining follow-up

- Broader shop-floor command kicks remain conservative for non-gate cases because `kickFloorObjectSupported()` still rejects shop-floor objects outside the remote-gate path.
- The new non-empty command canary covers a non-shop source; a separate shop-floor contents-damage canary would be useful once broader shop-floor kicks are enabled.

## Verification

- `node --test --test-name-pattern "command kicked box|command kick locked trapped empty box|command kick unlocked trapped empty box|projectileContainerImpactDmg|remote projectile fall impacts" test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `npm run score` (`44/44 passing`)
