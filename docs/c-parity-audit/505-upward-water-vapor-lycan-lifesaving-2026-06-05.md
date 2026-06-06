# C Parity Audit 505: Upward Water Vapor Lycanthropy Lifesaving

Blessed water vapor now propagates lycanthrope rehumanization death state through the upward thrown-potion command path. When the hero is in the matching were-beast form, holy-water vapor calls the non-purifying rehumanize branch: lycanthropy remains set, no purification message is printed, and an unhealthy old form either enters `deathDieMore` or consumes a worn amulet of life saving and enters `lifeSavingMore`.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The new canaries drive the live throw command with a blessed water potion and normal inventory state.

## Source Anchors

- `nethack-c/upstream/src/dothrow.c:1256` through `:1290`: upward `toss_up()` routes potions through `potionhit(&gy.youmonst, ..., POTHIT_HERO_THROW)`.
- `nethack-c/upstream/src/potion.c:1906` through `:1909`: `potionhit()` lets nearby or self-hit potion vapor call `potionbreathe()`.
- `nethack-c/upstream/src/potion.c:2080` through `:2088`: water vapor triggers were-change behavior; blessed vapor calls `you_unwere(FALSE)` and does not cure lycanthropy.
- `nethack-c/upstream/src/were.c:213` through `:225`: non-purifying `you_unwere(FALSE)` can call `rehumanize()` when the hero is a were-beast and no nearby monster blocks it.
- `nethack-c/upstream/src/polyself.c:1395` through `:1405`: `rehumanize()` prints the return-to-human-form message, then kills the hero if the old form has less than 1 HP.
- `nethack-c/upstream/src/end.c:1081` through `:1094`: life saving prints the medallion messages, consumes the amulet, adjusts constitution, and calls `savelife()`.

## JS Changes

- `js/cmd.js`
  - Adds `appendRehumanizeDeathResultMessages()` for message arrays that need rehumanization death flags.
  - Lets `potionBreathe()` and `brokenPotionBreathe()` accept an opt-in `allowLifeSaving` option.
  - Passes that opt-in through upward thrown potion self-hit and ceiling-break vapor paths.
  - Makes the upward potion command branch honor `messages.lifeSaving` and `messages.fatal`, matching nearby toss-up handlers.

## Tests

- `upward hero-thrown blessed water vapor lycanthropy rehumanize old form death`
  - Throws blessed water upward while in matching werewolf form with an old form at 0 HP.
  - Asserts potion evaporation precedes rehumanization, then unhealthy-old-form death enters `deathDieMore` without curing lycanthropy.
- `upward hero-thrown blessed water vapor lycanthropy rehumanize old form death uses lifesaving`
  - Adds a worn amulet of life saving.
  - Asserts the amulet is consumed, the medallion glow message is shown, and the command enters `lifeSavingMore`.

## Follow-Ups

- Other vapor delivery sites still need their own fatal/life-saving propagation before they can safely opt into amulet consumption. In particular, inventory fire destruction and some broken-object helpers collapse or spread message arrays, which would otherwise drop `messages.lifeSaving`/`messages.fatal`.
- The shared amulet life-saving crumble continuation is covered in audit 572, including Escape-skip and wizard/explore non-amulet wording.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "water vapor|blessed water vapor lycanthropy rehumanize old form death|upward hero-thrown confusion potion self-hits" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "blessed water vapor lycanthropy rehumanize old form death" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot` - pass
- `npm run score` - pass, 44/44 public sessions
- `git diff --check` - pass
