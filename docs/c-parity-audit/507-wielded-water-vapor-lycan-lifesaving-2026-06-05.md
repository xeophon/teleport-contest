# C Parity Audit 507: Wielded Water Vapor Lycanthropy Lifesaving

Wielded blessed water potion bashes now preserve adjacent vapor rehumanization death state. A potion used as a melee weapon is consumed through the `POTHIT_HERO_BASH` route, then nearby vapor can trigger the same non-purifying lycanthrope rehumanization path covered by upward and direct thrown potion hits. If the old form is unhealthy, JS now keeps the returned message-array metadata and enters either `deathDieMore` or `lifeSavingMore` instead of losing those flags when copying potion messages into the melee message list.

No replay maps, private seeds, player names, move-count branches, or session-specific checks are used. The new canaries use live melee input with a wielded potion and an adjacent peaceful gremlin target so the C `monster_nearby()` gate does not suppress rehumanization.

## Source Anchors

- `nethack-c/upstream/include/obj.h:474` through `:477`: `POTHIT_HERO_BASH` is the distinct direct-delivery mode for potions wielded by the hero.
- `nethack-c/upstream/src/uhitm.c:1095` through `:1116`: melee potion hits split one bottle from a stack or unwield a singleton, remove it from inventory, call `potionhit(mon, obj, POTHIT_HERO_BASH)`, and then apply fixed bash damage to surviving non-shade targets.
- `nethack-c/upstream/src/uhitm.c:1421` through `:1424`: `hmon()` routes melee potion objects through `hmon_hitmon_potion()`.
- `nethack-c/upstream/src/mkobj.c:450` through `:456`: `splitobj()` clears worn/wielded state on the split-off object, leaving the original carried stack in place.
- `nethack-c/upstream/src/wield.c:99` through `:104`: `setuwep(NULL)` clears the wielded singleton before the potion is removed.
- `nethack-c/upstream/src/potion.c:1679` through `:1681`: non-oil potion hits visibly evaporate after the crash message.
- `nethack-c/upstream/src/potion.c:1831` through `:1857`: water hitting monsters applies target-specific blessed/cursed/gremlin effects before vapor.
- `nethack-c/upstream/src/potion.c:1906` through `:1927`: adjacent/self-hit potion vapor calls `potionbreathe()`, then shop billing and `obfree()` finish object cleanup.
- `nethack-c/upstream/src/potion.c:2080` through `:2088`: blessed water vapor calls `you_unwere(FALSE)` for a matching lycanthrope beast form without curing lycanthropy.
- `nethack-c/upstream/src/were.c:213` through `:225`: non-purifying `you_unwere(FALSE)` can rehumanize only when no qualifying nearby monster blocks it.
- `nethack-c/upstream/src/hack.c:4106` through `:4124`: `monster_nearby()` ignores peaceful monsters, which makes a peaceful gremlin a focused bash-vapor canary.
- `nethack-c/upstream/src/polyself.c:1395` through `:1405`: unhealthy old-form rehumanization prints the return message, then death text and killer state.
- `nethack-c/upstream/src/end.c:1081` through `:1094`: life saving prints medallion messages, consumes the amulet, adjusts constitution, and calls `savelife()`.

## JS Changes

- `js/cmd.js`
  - Passes `{ allowLifeSaving: true }` into the shared potion-hit helper for wielded potion bashes.
  - Copies `lifeSaving`, `fatal`, and `more` metadata from the returned potion message array before spreading its text into the broader melee message list.
  - Skips fixed bash damage only for fatal old-form death; life-saving returns can still pass through the existing bash-damage path before handing off to `lifeSavingMore`.
  - Handles fatal/life-saving melee potion metadata before normal monster-kill or non-kill melee returns.

## Tests

- `wielded blessed water potion bash vapor rehumanizes lycanthrope after monster hit`
  - Force-fights an adjacent peaceful gremlin with a wielded blessed water potion while the hero is a matching werewolf with a healthy old form.
  - Asserts crash, evaporation, gremlin split, and return-to-human ordering; lycanthropy remains set, the potion is consumed, no weapon-hit conduct is counted, and no purification or death text appears.
- `wielded blessed water potion bash vapor rehumanize old form death uses lifesaving`
  - Uses the same bash path with an old form at 0 HP and a worn amulet of life saving.
  - Asserts `lifeSavingMore`, amulet and potion consumption, lycanthropy retention, old-form death text, medallion glow text, and HP restoration after the life-saving continuation.

## Follow-Ups

- Other vapor delivery sites that copy or flatten message arrays still need their own fatal/life-saving propagation before they can safely opt into amulet consumption.
- Broader C life-saving wording remains incomplete: the shared non-stoning continuation currently prints `You feel much better!`, while C also prints `The medallion crumbles to dust!`.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "wielded blessed water potion bash vapor|wielded potion" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot` - pass
- `npm run score` - pass, 44/44 public sessions
- `git diff --check` - pass
