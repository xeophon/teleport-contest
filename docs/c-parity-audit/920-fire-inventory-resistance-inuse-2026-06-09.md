# Fire Inventory Resistance And In-Use Stacks

Date: 2026-06-09

## C Reference

- `nethack-c/upstream/src/zap.c:5607` through `nethack-c/upstream/src/zap.c:5631` makes fire-destroyable carried items include potions, scrolls, spellbooks, and green slime globs, while excluding artifacts and single-item `in_use` stacks.
- `nethack-c/upstream/src/zap.c:5673` through `nethack-c/upstream/src/zap.c:5718` gives carried inventory a per-selected-stack protection roll from active fire-resistance gear: 99% for worn/wielded/carried extrinsic sources and 90% for a worn dwarvish cloak.
- `nethack-c/upstream/src/zap.c:5815` through `nethack-c/upstream/src/zap.c:5817` applies that inventory protection roll before AD_FIRE item-specific damage handling.
- `nethack-c/upstream/src/zap.c:5894` through `nethack-c/upstream/src/zap.c:5898` subtracts one item from an `in_use` stack before rolling per-item `rn2(3)` destruction.
- `nethack-c/upstream/src/zap.c:5903` through `nethack-c/upstream/src/zap.c:5918` reports destruction before potion vapor, and `nethack-c/upstream/src/zap.c:5929` through `nethack-c/upstream/src/zap.c:5933` consumes destroyed items after vapor side effects.

## JS Parity Slice

- Added `fireInventoryItemProtected()` using the existing 99% active fire-resistance gear and 90% dwarvish-cloak carried inventory protection chance.
- Applied the protection roll before Book-of-the-Dead feedback and before per-item fire damage rolls.
- Kept the Book-of-the-Dead fire branch reachable when local JS metadata tags the Book as an artifact, while still skipping a single `in_use` Book before that branch.
- Changed hero `fireDamageInventory()` to destroy at most `quan - 1` items from multi-item `in_use` stacks.
- Changed `monsterFireInventoryDamage()` to use the same effective `quan - 1` destruction count for `in_use` stacks.
- Left potion vapor ordering for a separate slice because the JS helper still computes vapor side effects before adding the destruction event metadata.

## Tests

- `active fire resistance gear can protect carried inventory from fire destruction`
- `inventory fire subtracts one in-use stack item before destruction rolls`
- `inventory fire still uses Book of the Dead branch when locally artifact tagged`
- `inventory fire skips single in-use Book of the Dead before glow branch`

Verification:

```sh
node --test --test-reporter=dot --test-name-pattern "active fire resistance gear can protect carried inventory|inventory fire subtracts one in-use stack|inventory fire still uses Book of the Dead branch|inventory fire skips single in-use Book" test/shop-billing-helpers.test.mjs
node --test --test-reporter=dot --test-name-pattern "fireDamageInventory|inventory fire|destroyed inventory potion|carried fire destruction|lava survivor|fire payload|fire breath|wand of fire|fire ray|flaming sphere|fire inventory" test/shop-billing-helpers.test.mjs
git diff --check
node --test --test-reporter=dot test/shop-billing-helpers.test.mjs
```

Result: focused resistance/in-use/Book tests passed; broader fire/inventory pattern passed; `git diff --check` passed; full `test/shop-billing-helpers.test.mjs` passed.

## Remaining Gaps

- Potion vapor effects still happen before the destruction message/event in the JS generic helper, even though rendered `messages` currently place vapor text after the destruction text.
- Fatal unsaved vapor in `fireDamageInventory()` still consumes the destroyed potion in JS because C's `done()` does not return from `potionbreathe()`.
- Hallucinated `hcolor("dark red")` variation for Book glow feedback remains fixed to `dark red`.
- Direct fatal lava rescue still lacks C's repeated `safe_teleds()` failure countermeasures and manual landing `spoteffects(FALSE)` detail.
