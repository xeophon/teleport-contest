# C Parity Audit 772: Direct Melee Potion Bash Survivor Wakeup

## Sources

- `nethack-c/upstream/src/uhitm.c:1095-1116`: wielded potion melee splits/unwields/removes the potion, calls `potionhit(..., POTHIT_HERO_BASH)`, then seeds survivor bash damage as `1` except against shades.
- `nethack-c/upstream/src/potion.c:1817-1820`: `POT_SPEED` is a compact non-angering potion effect; it speeds the monster and clears `angermon`.
- `nethack-c/upstream/src/potion.c:1897-1903`: `potionhit()` still clears sleep or wakes/angers according to its own `angermon` value before returning.
- `nethack-c/upstream/src/uhitm.c:1840-1926`: after potion bash damage is applied, surviving direct melee still reaches the ordinary `wakeup(mon, TRUE)` tail.

## JS Changes

- Changed wielded potion bash survivor damage from strength/`udaminc`-scaled damage to C's fixed one-point bash damage, preserving the shade zero-damage exception.
- After nonfatal potion bash messages, run the existing direct-melee nonlethal wakeup tail before the survivor flee roll so non-angering potion effects still anger a peaceful monster through the later melee `wakeup(TRUE)` path.
- Kept ordinary direct hit text suppressed for potion bashes; C marks the potion hit text handled by `potionhit()`.

## Tests

Added focused command-path coverage in `test/shop-billing-helpers.test.mjs`:

- a force-fought peaceful goblin hit with a wielded speed potion is sped by `potionhit()` without being angered there;
- the same survivor is then angered by the post-bash melee wakeup tail;
- high strength and `udaminc` do not increase survivor bash damage beyond one HP;
- the existing wielded blessed-water gremlin vapor case now expects the surviving struck gremlin to become angry through the same tail;
- adjacent vapor is gated off without changing the potion-specific crash/chip/vapor-roll/flee-roll ordering.

## Remaining Gaps

- Sleeping potion-bash survivors should get a dedicated growl/nearby-wakeup canary.
- Wielded egg bash still has a separate survivor wake/anger audit pending.
- Broader special targets such as priests, watchmen, saddle hits, and lifesaving/polymorph potion branches remain best covered as separate narrow slices.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=spec --test-name-pattern "wielded speed potion bash survivor|wielded confusion potion bash|wielded potion stack bash" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "wielded .*potion bash" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.mjs`
- `npm run score` (`44/44`)
