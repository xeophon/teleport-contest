# Monster-turn demon blackmail false image

Date: 2026-05-31

## Summary

Modeled the automatic monster-turn `MS_BRIBE` false apparent-target branch from `monmove.c`. A peaceful non-tame briber that is adjacent to an apparent hero image now whispers at thin air when that apparent target is not the real hero. Ordinary heroes reveal and anger the briber without entering the safe-passage demand path; demon-polyself heroes make the briber relocate without anger or demand.

This slice intentionally covers only the false-image branch. The true apparent-target monster-turn path that calls `demon_talk()` remains a separate follow-up because it can require prompt/pager integration during the monster scheduler.

## Upstream source anchors

- `nethack-c/upstream/src/monmove.c:784`: covetous tactics can refresh `set_apparxy()` before the distance/flee checks.
- `nethack-c/upstream/src/monmove.c:791`: `distfleeck()` computes `nearby` against `mtmp->mux`/`mtmp->muy`.
- `nethack-c/upstream/src/monmove.c:794`: defensive and miscellaneous item use occurs before demonic blackmail.
- `nethack-c/upstream/src/monmove.c:802`: blackmail guard requires nearby, `MS_BRIBE`, peaceful, non-tame, and not swallowed.
- `nethack-c/upstream/src/monmove.c:806`: false apparent-target branch prints "whispers at thin air" using `Monnam(mtmp)` only when the apparent target square is visible.
- `nethack-c/upstream/src/monmove.c:810`: demon-polyself heroes skip `demon_talk()` and relocate the briber when teleport is allowed.
- `nethack-c/upstream/src/monmove.c:815`: ordinary heroes clear briber invisibility, anger it, and call `set_malign()`.
- `nethack-c/upstream/src/monmove.c:823`: true apparent-target branch calls `demon_talk()` and remains outside this slice.

## JS changes

- `js/allmain.js`
  - Added a monster sound-key helper for scheduler-side `MS_BRIBE` checks.
  - Added scheduler-local demon-polyself detection and C-style briber relocation feedback.
  - Added `maybeDemonicBlackmailFalseImage()` after monster miscellaneous handling and before movement/combat branches.
  - Ordinary heroes now reveal and anger the false-image briber without rolling a bribe demand.
  - Demon-polyself heroes now relocate the briber and leave it peaceful.
- `test/shop-billing-helpers.test.mjs`
  - Added an ordinary-hero automatic monster-turn false-image blackmail regression.
  - Added a demon-polyself automatic monster-turn false-image relocation regression.

## Verification

- `node --check js/allmain.js`
- `node --test --test-name-pattern="automatic monster turn briber" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs`
- `npm run score` (`44/44 passing`)
- `git diff --check`

## Remaining gaps

- The true apparent-target monster-turn branch still needs shared `demon_talk()` scheduling so a peaceful non-tame `MS_BRIBE` monster can demand safe passage during monster turns.
- This slice reuses the existing JS `rlocNoMsg()` placement approximation. Broader `rloc(RLOC_MSG)`/`tele_restrict()` message parity should stay tied to shared monster teleport work.
- Full generated monster `msound` metadata and broader shared `domonnoise()` reuse remain separate from this narrow scheduler branch.
