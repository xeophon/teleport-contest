# Bell cursed charged undead summoning

## C anchors

- `nethack-c/upstream/src/apply.c:1253` through `:1268` routes charged Bell of Opening use through the cursed branch before invocation and blessed/uncursed effects.
- `nethack-c/upstream/src/apply.c:1263` through `:1268` calls `mkundead(&mm, FALSE, NO_MINVENT)` at the hero position and sets `wakem = TRUE`; it does not print `Nothing happens.` for this branch.
- `nethack-c/upstream/src/mkroom.c:456` through `:475` makes `mkundead()` roll `(level_difficulty() + 1) / 10 + rnd(5)`, choose `morguemon()` species, place them adjacent with no inventory, and mark the level as a graveyard.
- `nethack-c/upstream/src/apply.c:1310` through `:1315` wakes nearby monsters with petcall semantics after the cursed undead branch.

## JS parity

- `js/cmd.js` now has a shared `mkundeadAroundHero()` helper for hero-centered undead creation, preserving the existing Book-of-the-Dead corpse-revival option while allowing Bell to call the no-revival `NO_MINVENT` path.
- Cursed charged Bell of Opening now summons nearby morgue monsters, marks the level graveyard, skips the stale `Nothing happens.` message, and then runs the existing petcall wake helper.
- The Book of the Dead `mkundead` path now delegates to the same helper with `reviveCorpses: true`.

## Tests

- `cursed charged Bell of Opening summons undead before petcall wake`
- `cursed charged Bell of Opening on invocation square bills without priming`

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "cursed charged Bell of Opening" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern "Bell of Opening" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern "Book of the Dead|raised the dead|deadbook|mkundead" test/shop-billing-helpers.test.mjs`

## Remaining follow-up

- Cursed ordinary bells can summon nymphs and potentially shatter; that branch is separate from the charged Bell of Opening undead path.
