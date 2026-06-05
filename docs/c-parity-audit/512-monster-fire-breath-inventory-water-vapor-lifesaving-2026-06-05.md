# C Parity Audit 512: Monster Fire Breath Inventory Water Vapor Lifesaving

Monster fire breath that hits the hero now preserves blessed-water vapor rehumanization death metadata through the queued monster-turn `fireBreathHeroHit` continuation. The breath hit opts inventory fire into life-saving vapor, keeps the vapor messages behind the blast-hit `--More--`, and tags the final vapor message so the shared `lifeSavingMore` or `deathDieMore` command handoff runs after the rehumanization/medallion text is displayed.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canary uses a synthetic visible room, a hostile red dragon processed through `processMonsterTurns()`, worn body armor to satisfy the C body-hit gate, carried blessed water, and a worn amulet of life saving.

## Source Anchors

- `nethack-c/upstream/src/mhitu.c:873`: `mattacku()` routes monster breath attacks through `breamu()`.
- `nethack-c/upstream/src/mthrowu.c:1093`: `breamm()` handles monster breath at a target.
- `nethack-c/upstream/src/mthrowu.c:1117`: monster breath is gated by `!mtmp->mspec_used && rn2(3)`.
- `nethack-c/upstream/src/mthrowu.c:1119`: visible breathers print the breath message before the ray.
- `nethack-c/upstream/src/mthrowu.c:1123`: monster breath launches `dobuzz(BZ_M_BREATH(...))`.
- `nethack-c/upstream/src/zap.c:4962`: `dobuzz()` applies the hero AC hit check.
- `nethack-c/upstream/src/zap.c:4964`: a hero hit prints `The blast of fire hits you!`.
- `nethack-c/upstream/src/zap.c:4980`: hero ray hits call `zhitu()`.
- `nethack-c/upstream/src/zap.c:4421`: `zhitu()` fire handling rolls ordinary fire damage.
- `nethack-c/upstream/src/zap.c:4433`: `burnarmor(&gy.youmonst)` gates inventory fire to body-hit cases.
- `nethack-c/upstream/src/zap.c:4434` and `:4436`: inventory destruction and ignition are independent one-in-three rolls.
- `nethack-c/upstream/src/zap.c:5909`: carried inventory destruction prints before vapor handling.
- `nethack-c/upstream/src/zap.c:5917`: carried fire-destroyed potions call `potionbreathe(obj)`.
- `nethack-c/upstream/src/zap.c:5931`: destroyed carried items are used up after vapor handling returns.
- `nethack-c/upstream/src/potion.c:2080`: blessed water vapor handles lycanthropy.
- `nethack-c/upstream/src/potion.c:2086`: matching blessed water vapor calls `you_unwere(FALSE)`.
- `nethack-c/upstream/src/polyself.c:1397`: unhealthy old-form rehumanization calls `done(DIED)`.
- `nethack-c/upstream/src/end.c:1081` and `:1119`: life saving consumes the amulet and returns to the original caller.
- `nethack-c/upstream/src/zap.c:4588`: after life saving returns, C can still apply ordinary ray HP damage with `losehp()`.

## JS Changes

- `js/cmd.js`
  - Passes `{ allowLifeSaving: true }` to `fireDamageInventory()` from the queued `fireBreathHeroHit` path.
  - Moves vapor-fatal inventory messages into `insertAfter` follow-ups behind the blast-hit message.
  - Tags the final vapor follow-up with `lifeSaving` and `fatal` metadata for the shared command-mode handoff.
- `js/fire_breath.js`
  - Preserves `lifeSaving` and `fatal` metadata returned by the inventory-fire callback.
  - Suppresses generic breath HP/death overwrite when inventory vapor has already produced life-saving or fatal metadata.

## Tests

- `monster fire breath hero-hit inventory vapor rehumanize old form death uses lifesaving`
  - Sets up a hostile visible red dragon and runs `processMonsterTurns()` to produce the real queued `fireBreathHeroHit` continuation.
  - Asserts red-dragon breath text, blast-hit text, armor smoulder, potion boil/explode, rehumanization, medallion text, `lifeSavingMore` handoff, amulet and potion consumption, lycanthropy retention, and the life-saving continuation.

## Follow-Ups

- Monster ranged fire spell rays also reach `zhitu()` and should reuse this metadata shape when their JS path is audited.
- Fiery gaze, monster fire pillar, and monster fiery explosion sources have different C ordering and still need separate vapor metadata slices.
- Implemented explosion callers such as burning oil, scroll tower-of-flame, and pyrolisk fireball are covered in audit 513; pyrolisk fiery gaze, monster fire pillar, and natural monster fiery explosion sources still need separate source-backed JS paths/slices.
- Fatal unsaved vapor in the helper still consumes the destroyed potion in JS because `fireDamageInventory()` does not currently model C's non-returning `done()` interruption inside `potionbreathe()`.
- C continues monster breath `zhitu()` after life saving and can apply ordinary ray HP damage afterward. JS still uses delayed `lifeSavingMore` continuation and intentionally leaves full post-life-saving tail damage as a broader follow-up shared with audits 510 and 511.

## Verification

- `node --check js/cmd.js`
- `node --check js/fire_breath.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern "monster fire breath hero-hit inventory vapor" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern "monster fire breath hero-hit inventory vapor|directional wand of fire bounced ray|self-zapped wand of fire inventory vapor|fire trap command inventory fire|destroyed inventory potion" test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot`
- `npm run score` (`44/44 passing`)
