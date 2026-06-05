# C Parity Audit 511: Fire Ray Inventory Water Vapor Lifesaving

Directional fire rays that hit the hero now preserve blessed-water vapor rehumanization death metadata through the existing queued ray follow-ups. The hero-hit fire-ray branch opts inventory fire into life-saving vapor, keeps vapor follow-ups behind the potion-destruction `--More--`, and tags the final vapor message so the shared `lifeSavingMore` or `deathDieMore` command handoff runs after the rehumanization/medallion text is displayed.

No replay maps, private seeds, player names, move-count branches, or seed-specific runtime checks are used. The canary uses a synthetic room with a one-square stone bounce, a live wand-of-fire command, worn body armor to satisfy the C body-hit gate, carried blessed water, and a worn amulet of life saving.

## Source Anchors

- `nethack-c/upstream/src/zap.c:4980`: `dobuzz()` routes ray hits on the hero into `zhitu()`.
- `nethack-c/upstream/src/zap.c:4401`: `zhitu()` handles ray effects on the hero.
- `nethack-c/upstream/src/zap.c:4421`: the fire branch rolls `orig_dam = d(nd,6)`.
- `nethack-c/upstream/src/zap.c:4423`: fire resistance prints `You don't feel hot!` and does not skip inventory-fire processing.
- `nethack-c/upstream/src/zap.c:4428`: non-resistant fire rays set ordinary ray HP damage from `orig_dam`.
- `nethack-c/upstream/src/zap.c:4433`: `burnarmor(&gy.youmonst)` gates the inventory-fire calls to body-hit cases.
- `nethack-c/upstream/src/zap.c:4434` and `:4436`: directional fire ray inventory destruction and ignition are independent one-in-three rolls.
- `nethack-c/upstream/src/zap.c:5913` and `:5929`: destroyed carried potions call `potionbreathe(obj)` before `useup(obj)`.
- `nethack-c/upstream/src/potion.c:2080`: blessed water vapor can call `you_unwere(FALSE)` for a matching lycanthrope beast form.
- `nethack-c/upstream/src/polyself.c:1397`: unhealthy old-form rehumanization sets death state and calls `done(DIED)`.
- `nethack-c/upstream/src/end.c:1081` and `:1119`: life saving consumes the amulet and returns to the original caller.
- `nethack-c/upstream/src/zap.c:4588`: after the fire branch, `zhitu()` can still apply ordinary ray HP damage with `losehp()`.

## JS Changes

- `js/cmd.js`
  - Passes `{ allowLifeSaving: true }` to `fireDamageInventory()` in the directional fire-ray hero-hit branch.
  - Copies inventory-fire `lifeSaving` and `fatal` metadata onto the final queued vapor follow-up, not the outer potion-destruction entry.
  - Marks inventory-destruction queue entries with `insertAfter` as `more` prompts so vapor follow-ups are drainable.
  - Marks ordinary lethal inventory-destruction follow-ups as `more` prompts so subsequent queued death text and command consumption match C.
  - Suppresses generic delayed ray damage/death assignment when inventory vapor has already produced life-saving or fatal metadata.

## Tests

- `directional wand of fire bounced ray hits hero and vapor lifesaves old-form death`
  - Builds a small synthetic level where a wand-of-fire ray bounces off stone and hits the hero.
  - Asserts bounce/hit text, potion boil/explode text, rehumanization, medallion text, `lifeSavingMore` handoff, amulet and potion consumption, lycanthropy retention, wand identification, and the life-saving continuation.

## Follow-Ups

- Monster fire-breath hero-hit inventory fire still needs separate queued-event metadata propagation.
- Explosion callers such as burning oil, scroll tower-of-flame, and pyrolisk fireball still flatten inventory-fire vapor metadata.
- Fatal unsaved vapor in the helper still consumes the destroyed potion in JS because `fireDamageInventory()` does not currently model C's non-returning `done()` interruption inside `potionbreathe()`.
- C continues `zhitu()` after life saving and can apply ordinary ray HP damage afterward. JS still uses delayed `lifeSavingMore` continuation and intentionally leaves full post-life-saving tail damage as a broader follow-up shared with audit 510.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern "directional wand of fire bounced ray|self-zapped wand of fire inventory vapor|fire trap command inventory fire|destroyed inventory potion" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern "directional wand of fire bounced ray|self-zapped wand of fire inventory vapor" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node frozen/ps_test_runner.mjs sessions/seed5002-wizard-coverage-pair.session.json`
- `node --test --test-reporter=dot`
- `git diff --check`
- `npm run score` (`44/44 passing`)
