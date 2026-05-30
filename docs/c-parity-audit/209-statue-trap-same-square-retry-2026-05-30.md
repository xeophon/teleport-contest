# C Parity Audit 209: Statue-Trap Same-Square Retry

## Sources

- `nethack-c/upstream/src/trap.c:907-935`: `activate_statue_trap()` removes the trap once, tries to animate a same-square statue, and refreshes the square before returning.
- `nethack-c/upstream/src/trap.c:923-931`: the retry loop advances only when `animate_statue()` failed with `AS_MON_IS_UNIQUE`.
- `nethack-c/upstream/src/trap.c:713-720` and `nethack-c/upstream/src/trap.c:793-800`: failed monster creation leaves the attempted statue intact and classifies the failure from the original statue monster type.
- `nethack-c/upstream/src/invent.c:1466-1489`: `sobj_at()` finds the first matching floor object and `nxtobj(..., TRUE)` advances through the same-square object chain.

## JS Changes

- `activateStatueTrap()` now gathers same-square statues and attempts them in floor-object order instead of stopping at the first one unconditionally.
- Failed unique-style animation leaves the failed statue on the floor and retries the next same-square statue.
- Failed non-unique animation still stops immediately, matching C's `AS_NO_MON` branch.
- Trap removal, successful statue deletion, content transfer, shatter billing, saved-trait restoration, and normal/shatter messages remain on the successfully animated statue only.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- A unique Medusa statue whose doppelganger substitute is genocided remains on the floor while a later same-square goblin statue animates.
- A non-unique genocided goblin statue stops the trap activation and does not skip ahead to a later same-square newt statue.

## Remaining Gaps

- Exact floor object stack ordering still follows the JS level object array rather than a dedicated `nexthere` chain.
- Broader `animate_statue()` gaps remain separate: full shopkeeper/priest/guard `mextra`, exact level-restoration RNG, post-transfer monster equipment wear, and complete shapechanger lifecycle behavior.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "statue trap retries next same-square statue|statue trap stops after non-unique same-square statue|statue trap animates unique no-traits statue|statue trap restores saved traits" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs` (`1081/1081`)
- `node --test test/*.mjs` (`1178/1178`)
- `npm run score` (`44/44`, including `seed0030-ten-diverse-deaths.session.json` at `RNG 105529/105529`, `Screen 1953/1953`)
