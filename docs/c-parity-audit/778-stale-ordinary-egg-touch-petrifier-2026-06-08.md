# C Parity Audit 778: Stale Ordinary Egg Touch-Petrifier Hits

## C Source Anchors

- `nethack-c/upstream/include/obj.h:315-317`: `MAX_EGG_HATCH_TIME` is 200 and `stale_egg(egg)` is true when `moves - age > 400`.
- `nethack-c/upstream/src/uhitm.c:1186-1256`: ordinary egg `hmon()` hits use nominal one-point damage, print the egg hit text, and only transform a live ordinary egg into a rock when the target touch-petrifies and `!stale_egg(obj)`.
- `nethack-c/upstream/src/uhitm.c:1231-1253`: a stale ordinary egg hitting a cockatrice/chickatrice skips the "isn't alive any more" rock transform, prints `Splat!`, and is consumed through `useup_eggs(obj)`.
- `nethack-c/upstream/src/dothrow.c:2256`: hero-thrown eggs route into the same `hmon()` egg handling after the thrown-hit gate lands.

## JS Parity Notes

- `js/cmd.js` already shared stale-egg handling between thrown and wielded ordinary egg hit paths through `isStaleEggItem()`.
- This slice extends `isStaleEggItem()` to honor the existing JS compatibility markers `staleEgg` and `oldEgg`, matching `allmain.js` pet-food stale egg handling and avoiding a false live-egg rock transform when no `age` field is present.
- Stale ordinary eggs remain consumed before direct melee passive stoning checks, so a wielded stale egg splat does not leave a weaponless bare-hand cockatrice/chickatrice contact.

## Tests Added

- `hero-thrown stale ordinary egg marker hitting cockatrice splats instead of becoming rock`
- `wielded old ordinary egg bash against chickatrice splats instead of transforming`

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "stale ordinary egg|old ordinary egg|live ordinary egg hitting cockatrice|live egg bash against cockatrice" test/shop-billing-helpers.test.mjs` - 4 pass, 2757 skipped
- `git diff --check`
- `node --test --test-reporter=dot test/*.mjs`
- `npm run score` - 44/44 passing
