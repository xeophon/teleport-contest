# 894 - Chest fire uses polyself golem HP branch

## C source

- `nethack-c/upstream/src/trap.c:6438` routes chest and box fire traps to `dofiretrap(obj)`.
- `nethack-c/upstream/src/trap.c:4238` rolls the original fire damage once before the pool branch.
- `nethack-c/upstream/src/trap.c:4259` through `:4283` handles `Upolyd` separately from human HP: paper, straw, wood, and leather golems can raise `num` from `u.mhmax`; then C reduces `u.mhmax` and clamps `u.mh`.
- `nethack-c/upstream/src/trap.c:4300` through `:4304` applies that form damage with `losehp(num, tower_of_flame, KILLED_BY_AN)` and then continues into slime and inventory fire when not terminal.

## Port

- `js/cmd.js` now gives chest fire a polyself HP branch before the human max-HP path.
- The branch uses the original fire damage roll for polymorphed forms, adds the paper/straw/wood/leather golem max-HP damage adjustments, reduces active monster-form max HP, and clamps active monster-form HP.
- Direct chest fire damage now targets active monster-form HP when polymorphed. If the form dies, it reuses the existing rehumanization/life-saving plumbing; `Unchanging` keeps the local stuck-in-creature-form fatal behavior.
- Human and fire-resistant chest fire paths keep their previous damage rolls.

## Tests

- Added `#untrap known-box fire payload burns paper golem form instead of human HP`.
- Existing known-box fire canaries still cover ordinary human damage, fire resistance, carried inventory fire, direct life-saving continuation, fatal no-amulet damage, and pool steam.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=dot --test-name-pattern "known-box .*fire" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `npm run score`

## Remaining nearby gaps

- The shared floor fire-trap path still has its own direct HP/death handling and should receive the same `dofiretrap()` polyself branch in a separate slice.
- C's carried-box versus floor-box steam distinction remains open: carried boxes should use the hero underwater state rather than stale object coordinates.
