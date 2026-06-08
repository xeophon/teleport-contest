# Rotten confusion follow-up message

Date: 2026-06-08.

## C anchors

- `nethack-c/upstream/src/eat.c:1813` `rottenfood()` prints `Blecch!` and, on the first rotten-effect branch, reports either `You feel rather trippy.` while hallucinating or `You feel rather light headed.` before applying confusion.
- `nethack-c/upstream/src/eat.c:2911` the slow-digestion ring branch prints `This ring is indigestible!` and then routes through `rottenfood()`.

## JS update

- `js/cmd.js` `rottenFoodEffect()` now appends the C-visible confusion follow-up before returning the shared rotten-food message.
- `test/shop-billing-helpers.test.mjs` tightens the metallivorous slow-digestion ring canary to require `This ring is indigestible!  Blecch!  Awful metal!  You feel rather light headed.` while preserving the ring, hunger, and confusion checks.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "metallivorous slow digestion ring rotten metal" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=dot test/*.mjs`
- `npm run score` (44/44)
