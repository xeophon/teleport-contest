# 308 - Chat Demon Bribe Offer

## C anchors

- `nethack-c/upstream/src/sounds.c:1141`: peaceful non-tame `MS_BRIBE` dispatches to `demon_talk()`.
- `nethack-c/upstream/src/sounds.c:1241`: successful monster speech consumes a turn after the sound handler returns.
- `nethack-c/upstream/src/minion.c:329`: visible non-Deaf positive demands print the safe-passage demand.
- `nethack-c/upstream/src/minion.c:335`: positive non-Deaf demands call `bribe()` with `How much will you offer?`.
- `nethack-c/upstream/src/minion.c:336`: offers greater than or equal to demand make the demon vanish without a charisma roll.
- `nethack-c/upstream/src/minion.c:339`: partial positive offers transfer gold, then roll `rnd(5 * CHA)` against `demand - offer`.
- `nethack-c/upstream/src/minion.c:343`: failed offers make the demon hostile.
- `nethack-c/upstream/src/minion.c:367`: `bribe()` parses the leading integer with `sscanf("%ld", ...)`; non-numeric input becomes zero.
- `nethack-c/upstream/src/minion.c:373`: negative offers use the shortchange/fumble message and transfer no gold.
- `nethack-c/upstream/src/minion.c:376`: zero offers use `You refuse.` and transfer no gold.
- `nethack-c/upstream/src/minion.c:379`: offers at least the hero's current purse transfer all gold.
- `nethack-c/upstream/src/minion.c:383`: smaller positive offers transfer exactly that many zorkmids.
- `nethack-c/upstream/src/minion.c:385`: accepted positive offer amounts are moved from hero inventory to monster inventory before the resolution branch.
- `nethack-c/upstream/src/minion.c:356`: successful full or partial bribes remove the demon with `mongone()`.

## JS changes

- Positive direct `#chat` demon bribe demands now leave the command in `demonBribeOffer` mode instead of consuming a turn immediately.
- The offer prompt is included in the direct chat message and stored as bribe input state; worn-helmet `#tip` can still reuse the sound helper without entering offer mode or displaying an input prompt.
- Added bribe input parsing with C-style leading signed integer behavior.
- Added offer resolution for negative, zero, non-numeric, all-gold, exact, partial-success, and partial-failure cases.
- Positive offers now transfer zorkmids out of the hero purse and into monster inventory before the resolution check.
- Full success removes the demon without extra RNG.
- Partial success uses one `rnd(5 * CHA)` roll, transfers the offered gold, then removes the demon with the scowling message.
- Failed offers leave transferred gold with the demon and make it hostile.
- The chat turn is consumed when the offer is submitted, matching the C split between demand prompt and final resolution.

## Focused tests

- `chat with peaceful non-tame briber and gold records C demand prompt`
- `worn helmet tip reports positive briber demand without entering offer mode`
- `demon bribe full offer transfers gold and removes demon without extra RNG`
- `demon bribe refusal keeps gold and angers demon without charisma RNG`
- `negative demon bribe offer fumbles and angers demon without gold transfer`
- `partial demon bribe failure transfers gold before angering demon`
- `partial demon bribe success transfers gold before scowling vanish`

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern='bribe|briber' test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern='bribe|briber' test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern='bribe|briber|chat with|worn helmet tip' test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.test.mjs`
- `npm run score` (44/44)
- `git diff --check`

## Remaining gaps

- The Deaf branch in `demon_talk()` still needs a separate pass: C replaces the demand with an unreachable amount and avoids the `bribe()` input prompt.
- Demon-prince invisibility reveal and relocation after demon-polyself greeting remain approximate in the shared sound helper.
