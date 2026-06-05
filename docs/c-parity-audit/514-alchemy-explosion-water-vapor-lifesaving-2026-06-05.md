# C Parity Audit 514: Alchemy Explosion Water Vapor Lifesaving

Implemented `#dip` alchemy explosions now preserve blessed-water vapor rehumanization death metadata. Exploding potion mixtures opt `potionBreathe()` into life-saving vapor and the potion-source dip command handoff propagates `lifeSaving`/`fatal` metadata instead of flattening the vapor result into ordinary alchemic blast damage.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canary uses synthetic command state, carried blessed water, a separate source potion, a worn amulet of life saving, and an unhealthy werewolf old form.

## Source Anchors

- `nethack-c/upstream/src/potion.c:2415`: alchemy explosion helper for dipped potions.
- `nethack-c/upstream/src/potion.c:2427`: explosion prints `They explode!`.
- `nethack-c/upstream/src/potion.c:2429`: explosion exercises strength before vapor handling.
- `nethack-c/upstream/src/potion.c:2430`: vapor is only skipped when the hero cannot receive it.
- `nethack-c/upstream/src/potion.c:2431`: explosion calls `potionbreathe(obj)` before using up the exploded stack.
- `nethack-c/upstream/src/potion.c:2432`: exploded potion stack is consumed after vapor handling returns.
- `nethack-c/upstream/src/potion.c:2433`: ordinary alchemic blast HP loss happens after vapor and useup.
- `nethack-c/upstream/src/potion.c:2080`: water vapor handles gremlin and lycanthropy effects.
- `nethack-c/upstream/src/potion.c:2086`: blessed water vapor in matching were-form calls `you_unwere(FALSE)`.

## JS Changes

- `js/cmd.js`
  - `dipPotionAlchemyExplosion()` calls `potionBreathe(..., { allowLifeSaving: true })`.
  - Alchemy blast HP loss is skipped when vapor already produced a life-saving or fatal result.
  - `dipIntoTarget` and `dipOilSource` command continuations preserve message `more` metadata and call the shared life-saving/fatal command-mode handoff after rendering the dip message.

## Tests

- `alchemy explosion holy water vapor uses lifesaving for old-form death`
  - Drives the real `#dip` command flow for a blessed water target and a separate source potion.
  - Asserts mix text, `They explode!`, rehumanization, unhealthy old-form death, medallion text, `lifeSavingMore`, amulet/source/target consumption, lycanthropy retention, and life-saving continuation.

## Follow-Ups

- C can continue after life saving and apply later alchemic blast HP damage. JS still uses delayed `lifeSavingMore` continuation and leaves full post-life-saving tail damage as a broader follow-up shared with audits 510-513.
- Fatal unsaved vapor still consumes the exploded target in JS because `potionBreathe()` does not currently model C's non-returning `done()` interruption inside `potionbreathe()`.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern "alchemy explosion holy water vapor|cursed potion alchemy|wet worn towel blocks alchemy|known blindness vapor from alchemy" test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot`
- `npm run score` (`44/44 passing`)
