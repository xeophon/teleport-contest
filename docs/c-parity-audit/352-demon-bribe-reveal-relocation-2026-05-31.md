# Demon bribe reveal and kindred relocation

Date: 2026-05-31

## Summary

Aligned the modeled `MS_BRIBE` path with C `demon_talk()` for demon-prince invisibility reveal and demon-polyself relocation. Artifact intimidation still wins before any reveal or demand RNG. Invisible demon princes now appear before kindred greetings or safe-passage demands, clear permanent invisibility, clear `STRAT_APPEARMSG`, and redraw the monster square. Demon-polyself chats now relocate the briber after the "Good hunting" greeting and report the visible C-style relocation feedback.

Direct `#chat` while Deaf remains intentionally short-circuited before `domonnoise()`, matching C `sounds.c`, so a visible briber does not enter the bribe path, does not compute a demand, and does not consume a turn.

## Upstream source anchors

- `nethack-c/upstream/src/minion.c:263`: `demon_talk()` entry.
- `nethack-c/upstream/src/minion.c:267`: Excalibur/Demonbane intimidation happens before the prince reveal and returns without bribe demand RNG.
- `nethack-c/upstream/src/minion.c:289`: demon princes with `minvis` clear `minvis`/`perminvis`, may print "appears before you", clear `STRAT_APPEARMSG`, and call `newsym()`.
- `nethack-c/upstream/src/minion.c:299`: demon-polyself branch prints "Good hunting, Sister/Brother", calls `tele_restrict()`, then `rloc(mtmp, RLOC_MSG)` if allowed.
- `nethack-c/upstream/src/minion.c:309`: bribe demand RNG is only reached after the kindred branch is skipped.
- `nethack-c/upstream/src/sounds.c:1141`: peaceful non-tame `MS_BRIBE` monsters route through `demon_talk()`.
- `nethack-c/upstream/src/sounds.c:1397`: direct `#chat` Deaf handling returns before `domonnoise()`.
- `nethack-c/upstream/src/teleport.c:1653`: `RLOC_MSG` enables visible vanish/appear feedback.
- `nethack-c/upstream/src/teleport.c:1950`: `tele_restrict()` reports the mysterious-force teleport block when visible.

## JS changes

- `js/cmd.js`
  - Added demon-prince bribe reveal handling before kindred/demand branches.
  - Added demon-polyself briber relocation through the shared monster relocation helper and surfaced visible relocation feedback.
  - Guarded direct chat and directed `#tip` invisible-marker writes with a fresh visibility check after bribe noise mutates or relocates the monster.
- `test/shop-billing-helpers.test.mjs`
  - Extended the demon-polyself briber test to assert relocation, relocation RNG, and visible vanish feedback.
  - Added direct-chat and directed-`#tip` tests for invisible demon-prince reveal before safe-passage demand without stale invisible markers.
  - Added a direct Deaf chat canary proving visible bribers do not reach bribe demand logic.

## Verification

- `node --check js/cmd.js`
- `node --test --test-reporter=dot --test-name-pattern='briber|invisible demon prince briber|deaf chat with visible peaceful non-tame briber' test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs`
- `npm run score` (`44/44 passing`)
- `git diff --check`

## Remaining gaps

- Automatic monster-turn demonic blackmail is still not fully modeled as a separate caller of `demon_talk()`.
- C's lower-level Deaf branch inside `demon_talk()` is only relevant to non-direct-chat callers and remains outside the current JS command path.
- The local relocation helper approximates C `rloc()` placement and feedback; broader teleport message parity should stay tied to shared monster teleport work.
