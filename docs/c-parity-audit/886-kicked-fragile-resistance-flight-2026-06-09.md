# Kicked fragile resistance flight parity

## Scope

Kicked floor objects that are fragile call the C break preflight first, but only stop when the object actually breaks. If the ordinary 1% `obj_resists()` roll succeeds, C falls through to the normal kicked-object path: low-range thumps, stacks split after the preflight, and eligible objects fly or migrate like ordinary kicked objects.

This closes the remaining resisted-egg continuation from audit 477 for same-level flight without relying on replay maps, hidden seeds, player names, move counts, or fixture-specific runtime branches.

## C reference

- `nethack-c/upstream/src/dokick.c:678` through `:680`: `hero_breaks(gk.kickedobj, ...)` returns only when fragile preflight breakage succeeds.
- `nethack-c/upstream/src/dokick.c:692` through `:694`: stack splitting happens after the break preflight, so a resisted egg stack splits one egg into flight.
- `nethack-c/upstream/src/dokick.c:733` through `:738`: object extraction and kicked projectile flight are reached after resisted fragile preflight.
- `nethack-c/upstream/src/dothrow.c:2582` through `:2605`: `breaktest()` applies `obj_resists()` before reporting eggs as breakable.

## JS change

- `js/cmd.js`
  - Allows the ordinary same-level kicked-object flight path whenever there is no target monster, including fragile objects that survived `breakKickedFragileFloorObject()`.
  - Preserves the existing preflight ordering: break side effects, shop billing, and egg post-removal effects still run only when the fragile object actually breaks.

## Tests

- `command kicked fertile egg resistance continues ordinary same-level flight`
  - Forces the preflight `rn2(100)` resistance roll to succeed.
  - Asserts the source egg stack survives with one fewer egg, the split egg lands by normal same-level flight, fertile-egg Luck loss is skipped, and no `Splat!`, remote fall, thump, or impact text is emitted.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-name-pattern "command kicked fertile egg resistance continues ordinary same-level flight" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "command kicked (fragile stack resistance|fertile egg|pyrolisk egg|oartifact fragile object|oartifact glass-material object)" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `npm run score` - pass, 44/44 replay sessions

## Remaining nearby gaps

- Monster anti-magic trap resistance from worn ordinary anti-magic gear remains a separate compact candidate.
