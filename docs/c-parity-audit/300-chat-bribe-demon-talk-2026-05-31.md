# C Parity Audit 300: Chat Bribe Demon Talk

## Sources

- `nethack-c/upstream/src/sounds.c:1141-1144`: `MS_BRIBE` calls `demon_talk()` for peaceful non-tame bribers and otherwise falls through to `MS_CUSS`.
- `nethack-c/upstream/src/minion.c:263-307`: `demon_talk()` first handles Excalibur/Demonbane intimidation, then the demon-polyself kindred greeting.
- `nethack-c/upstream/src/minion.c:308-330`: ordinary bribe demand uses hero gold, `rnd(80)`, Gehennom home bonus, and same-alignment halving; zero demand makes the demon hostile without a message.
- `nethack-c/upstream/src/minion.c:331-359`: positive demand prints the safe-passage demand and asks `How much will you offer?` before resolving the payment.

## JS Status

- `tipHatMonsterNoise()` now routes peaceful non-tame `MS_BRIBE` through a local `demon_talk()`-style helper instead of returning an unhandled silent result.
- The helper covers the C branches that are self-contained in current chat/tip command plumbing:
  - Wielded Excalibur or Demonbane makes the demon hostile and reports anger/tension without demand RNG.
  - Demon polyself receives `Good hunting, Sister/Brother.` without demand RNG.
  - Ordinary demand computes and records the C demand using `rnd(80)`.
  - Zero demand consumes the command, makes the demon hostile, and leaves no visible message, matching the C no-gold branch.
- Positive demand currently records `_last_demon_bribe_prompt = "How much will you offer?"` and displays the C demand line; resolving an entered offer is still separate command-mode work.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `chat with peaceful non-tame briber and no gold spends turn and angers demon`
- `worn helmet tip makes invisible peaceful non-tame briber with no gold turn hostile`
- `chat with peaceful non-tame briber wielding Excalibur angers demon before demand RNG`
- `chat with peaceful non-tame briber in demon polyself gives kindred greeting`
- `chat with peaceful non-tame briber and gold records C demand prompt`

These tests pin turn consumption, wait-strategy clearing, hostility transitions, demand metadata, and the expected RNG shape for no-gold and positive-gold branches.

## Remaining Gaps

- The positive-demand branch does not yet run a `getlin()`/`bribe()` offer flow that transfers gold, removes satisfied demons, or handles partial-offer charisma rolls.
- Demon-prince invisibility reveal and relocation after demon-polyself greeting remain approximate in the shared sound helper.
- Broader quest `MS_LEADER`/`MS_NEMESIS`/`MS_GUARDIAN` sounds remain open follow-up slices.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern "briber|MS_BRIBE|demon polyself|demand prompt" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.mjs`
- `npm run score` (`44/44` replay sessions passed)
- `git diff --check`
