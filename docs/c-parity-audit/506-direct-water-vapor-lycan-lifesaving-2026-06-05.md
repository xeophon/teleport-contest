# C Parity Audit 506: Direct Water Vapor Lycanthropy Lifesaving

Direct hero-thrown blessed water potion hits now propagate adjacent vapor rehumanization death state. When the potion hits a monster next to the hero, the monster-facing `potionhit()` water effect runs first, then nearby vapor can trigger `you_unwere(FALSE)` for a matching were-beast form. An unhealthy old form now either enters `deathDieMore` or consumes a worn amulet of life saving and enters `lifeSavingMore`.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The new canaries drive the live throw command with inventory selection, direction input, a visible adjacent gremlin target, and normal potion stack removal.

## Source Anchors

- `nethack-c/upstream/src/dothrow.c:1477` through `:1503`: direct thrown-object monster impacts call `thitmonst()` through `throwit_mon_hit()` and clear the thrown object when consumed.
- `nethack-c/upstream/src/dothrow.c:1674` through `:1700`: ordinary directional throwing routes `bhit()` results through `throwit_mon_hit()`.
- `nethack-c/upstream/src/dothrow.c:2262` through `:2265`: a hero-thrown potion hit calls `potionhit(mon, obj, POTHIT_HERO_THROW)` and consumes the thrown object.
- `nethack-c/upstream/src/potion.c:1679` through `:1681`: non-oil potion hits visibly evaporate after the crash message.
- `nethack-c/upstream/src/potion.c:1831` through `:1857`: water hitting monsters applies the target-specific blessed/cursed/gremlin effects before the later vapor check.
- `nethack-c/upstream/src/potion.c:1897` through `:1909`: surviving targets wake or remain peaceful, then nearby/self-hit potion vapor calls `potionbreathe()`.
- `nethack-c/upstream/src/potion.c:2080` through `:2088`: water vapor triggers were-change behavior; blessed vapor calls `you_unwere(FALSE)` and does not cure lycanthropy.
- `nethack-c/upstream/src/were.c:213` through `:225`: non-purifying `you_unwere(FALSE)` can call `rehumanize()` when the hero is a were-beast and no nearby monster blocks it.
- `nethack-c/upstream/src/hack.c:4106` through `:4124`: `monster_nearby()` only blocks rehumanization for nearby monsters that can threaten the hero; a peaceful gremlin target is a useful direct-hit canary because it does not block the were-beast rehumanize branch.
- `nethack-c/upstream/src/polyself.c:1395` through `:1405`: `rehumanize()` prints the return-to-human-form message, then kills the hero if the old form has less than 1 HP.
- `nethack-c/upstream/src/end.c:1081` through `:1094`: life saving prints the medallion messages, consumes the amulet, adjusts constitution, and calls `savelife()`.

## JS Changes

- `js/cmd.js`
  - Lets `heroThrownPotionHitMonster()` accept the same `allowLifeSaving` opt-in used by the upward vapor path.
  - Passes that option into adjacent `potionBreathe()` so rehumanization death/life-saving flags survive the direct monster-hit path.
  - Makes the direct throw command branch honor `messages.lifeSaving` and `messages.fatal` before clearing command mode or spending time.

## Tests

- `adjacent hero-thrown blessed water potion vapor rehumanizes lycanthrope after monster hit`
  - Throws blessed water at an adjacent peaceful gremlin while the hero is a matching werewolf with a healthy old form.
  - Asserts crash, evaporation, gremlin split, and return-to-human ordering; lycanthropy remains set, the original gremlin remains peaceful, and no purification or death text appears.
- `adjacent hero-thrown blessed water potion vapor rehumanize old form death uses lifesaving`
  - Uses the same direct hit, but the old form has 0 HP and the hero wears an amulet of life saving.
  - Asserts the direct-hit vapor enters `lifeSavingMore`, consumes the amulet and potion, preserves lycanthropy, and restores HP after the life-saving continuation.

## Follow-Ups

- Other direct or broken vapor delivery sites still need their own fatal/life-saving propagation before they can safely opt into amulet consumption. Some helpers spread or copy message arrays, which would drop `messages.lifeSaving`/`messages.fatal`.
- The shared non-stoning `lifeSavingMore` continuation currently prints `You feel much better!`; C also prints `The medallion crumbles to dust!`. That broader life-saving wording remains a separate slice.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "adjacent hero-thrown blessed water potion vapor" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot` - pass
- `npm run score` - pass, 44/44 public sessions
- `git diff --check` - pass
