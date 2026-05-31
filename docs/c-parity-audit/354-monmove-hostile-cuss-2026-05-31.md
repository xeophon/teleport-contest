# Monster-turn hostile cuss

Date: 2026-05-31

## Summary

Modeled the automatic monster-turn hostile `MS_CUSS` branch from `monmove.c`. A hostile cussing monster now has the C 1-in-5 chance to insult the hero after normal monster action when it is in range, visible by `couldsee()`, and not invisible. The scheduler path reuses the existing hostile `cuss()` message helper so visible cussers can produce the aspersions/pager-style output and wake nearby sleepers.

## Upstream source anchors

- `nethack-c/upstream/src/monmove.c:966`: hostile standard attacks happen before quest talk and emotional cussing.
- `nethack-c/upstream/src/monmove.c:979`: quest talk happens before the hostile `MS_CUSS` branch.
- `nethack-c/upstream/src/monmove.c:983`: hostile `MS_CUSS` cussing requires `inrange`, hostile state, `couldsee()`, `!minvis`, and `!rn2(5)`.
- `nethack-c/upstream/src/wizard.c:844`: `cuss()` returns silently for deaf heroes.
- `nethack-c/upstream/src/wizard.c:871`: lawful minions use `angel_cuss`; other non-Wizard hostile cussers use either aspersions or `demon_cuss`.
- `nethack-c/upstream/src/wizard.c:882`: successful audible cussing wakes nearby sleepers with radius squared `25`.
- `nethack-c/upstream/src/questpgr.c:566`: pager-backed cuss text chooses a random table entry.

## JS changes

- `js/cmd.js`
  - Exported `monsterHostileCussNoise()` as a scheduler-safe wrapper around the existing hostile `tiphat()` cuss helper.
- `js/allmain.js`
  - Added `maybeMonsterTurnHostileCuss()` with the C guard order: sound key, hostility, invisibility, apparent-target range, `couldsee()`, then `rn2(5)`.
  - Added a small deafness check so scheduler-side cussing still consumes the outer C chance but produces no audible noise.
  - Called the helper from the adjacent attack/no-attack paths and the general post-action point so ordinary automatic monster turns can reach the emotional attack branch.
- `test/shop-billing-helpers.test.mjs`
  - Added a visible hostile imp regression that cusses and wakes a nearby sleeper.
  - Added an invisible hostile imp regression that compares against a silent baseline to verify the invisibility guard suppresses cussing without consuming extra cuss RNG.

## Verification

- `node --check js/allmain.js`
- `node --check js/cmd.js`
- `node --test --test-name-pattern="automatic hostile MS_CUSS" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs`
- `npm run score`
- `git diff --check`

## Remaining gaps

- The helper is now wired into the common adjacent/no-attack/post-action scheduler paths, but a future broader monster-turn phase refactor should keep this as one shared post-quest/post-attack step so uncommon early-continue action paths cannot skip it.
- Full `demon_talk()` scheduling for true apparent-target monster-turn `MS_BRIBE` remains separate.
- Broader generated monster `msound` metadata and shared `domonnoise()`/`#chat` reuse remain separate from this narrow scheduler slice.
