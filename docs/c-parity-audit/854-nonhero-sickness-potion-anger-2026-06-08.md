# Non-hero sickness potion anger

Date: 2026-06-08.

## C anchors

- `nethack-c/upstream/include/obj.h:474` defines potion hit propeller modes; monster and other-thrown hits are beyond `POTHIT_HERO_THROW`.
- `nethack-c/upstream/src/potion.c:1631` sets `your_fault = (how <= POTHIT_HERO_THROW)`.
- `nethack-c/upstream/src/potion.c:1728` initializes `angermon` from `your_fault`.
- `nethack-c/upstream/src/potion.c:1759` `POT_SICKNESS` makes ordinary targets ill or reports resistance without changing `angermon`.
- `nethack-c/upstream/src/potion.c:1898` only calls `wakeup(mon, TRUE)` when `angermon`; otherwise it clears `msleeping`.
- `nethack-c/upstream/src/mthrowu.c:361` routes monster-thrown potion hits against intervening monsters through `potionhit(..., POTHIT_OTHER_THROW)`.

## JS update

- `js/cmd.js` `sicknessPotionHitMonster()` now accepts the potion-hit `yourFault` option and returns anger only for hero-fault sickness hits.
- The `heroThrownPotionHitMonster()` sickness branch now passes its existing `yourFault` option through to the sickness helper.
- `test/shop-billing-helpers.test.mjs` adds a direct `monsterThrownPotionHitMonster()` canary where a peaceful goblin is made ill and woken without becoming hostile.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "sickness potion" test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.mjs`
- `npm run score` (44/44)
