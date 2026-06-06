# Life Saving Medallion Crumble

Shared amulet life-saving continuation wording now matches the C message sequence for ordinary More dismissal while preserving C's message-skip behavior. Pressing space or enter after the medallion glow/warm message shows `You feel much better!  The medallion crumbles to dust!`; pressing Escape skips the remaining crumble message and leaves only `You feel much better!`. Wizard/explore-mode survival also keeps the non-amulet `You feel much better!` continuation.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canaries use synthetic `lifeSavingMore` state plus the existing live amulet life-saving paths.

## C Anchors

- `nethack-c/upstream/src/end.c:1081` through `:1094`: amulet life saving prints `But wait...`, medallion glow/warm feedback, `You feel much better!`, `The medallion crumbles to dust!`, consumes the amulet, adjusts Constitution, and calls `savelife()`.
- `nethack-c/upstream/src/timeout.c:511`: slime follow-up distinguishes the amulet path by following `The medallion crumbles to dust.` rather than wizard/explore `OK, so you don't die.`

## JS Changes

- `js/cmd.js`
  - Updates shared `lifeSavingMore` handling to include the crumble sentence for normal amulet continuations.
  - Keeps wizard/explore survival on the non-amulet `You feel much better!` wording using the existing queued/pending explore-life-saving flags.
  - Treats Escape as skipped remaining More text, so the follow-up crumble sentence is omitted when the player dismisses the medallion prompt with Escape.

## Tests

- `test/shop-billing-helpers.test.mjs`
  - Updates existing amulet continuation assertions across fire trap, fire scroll, self-zap fire, fire ray, monster fire breath, dart trap, gas spore, flaming sphere, alchemy, choking, wielded water vapor, upward water vapor, and adjacent thrown water vapor.
  - Adds `wizard or explore lifesaving continuation omits amulet crumble wording`.
  - Adds `escape at amulet lifesaving continuation skips crumble wording`.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-name-pattern "lifesaving|life saving|life-saving" test/shop-billing-helpers.test.mjs` - pass, 18 matching tests
- `bash frozen/score.sh sessions/seed0399-wizard-hallu-actions.session.json` - pass, 1/1 public session
- `node --test test/shop-billing-helpers.test.mjs` - pass, 2140/2140
- `node --test test/*.mjs` - pass, 2291/2291
- `npm run score` - pass, 44/44 public sessions
- `git diff --check` - pass
