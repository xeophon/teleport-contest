# C Parity Audit 248: Tiphat Steed Animal Noise

## Sources

- `nethack-c/upstream/src/sounds.c:1451-1456`: directed `tiphat()` with no horizontal delta and `u.dz > 0` targets `u.usteed`; helpless steeds do not notice, otherwise C calls `domonnoise(u.usteed)`.
- `nethack-c/upstream/src/sounds.c:1485-1492`: during ray scanning, adjacent responsive non-silent unseen monsters can stop the scan before blocked terrain.
- `nethack-c/upstream/src/sounds.c:1526-1528`: after humanoid target handling, adjacent non-deaf `tiphat()` responses call `domonnoise(mtmp)` and remember invisible responders with `map_invisible()`.
- `nethack-c/upstream/src/sounds.c:837-922`: common animal `domonnoise()` branches include barking/growling, mewing/growling, squeaking, hissing, buzzing, and equine neigh/whinny/whicker messages.

## JS Changes

- Added `tiphat()`-local monster helpless, silence, adjacency, sound selection, and animal-noise helpers.
- Routed mounted downward `#tip` at `game.u.usteed` before the generic vertical no-target message.
- Added helpless-steed `doesn't notice` handling and equine noise for active mounted steeds.
- Changed adjacent visible nonhumanoid `#tip` targets to use the local animal-noise helper before falling back to generic nonresponse.
- Tightened `tipHatMonsterResponsive()` to treat sleeping monsters as helpless, matching C's `helpless(mon)` macro for this command path.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `worn helmet tip down at mounted pony uses steed noise`
- `worn helmet tip down at helpless mounted pony says it does not notice`
- `worn helmet tip makes adjacent visible dog bark instead of generic nonresponse`

## Remaining Gaps

- The helper is intentionally local to `tiphat()` and does not replace full `domonnoise()`/`#chat` behavior.
- Broader shopkeeper, priest, quest, vampire, werecreature, Rider, Oracle, wake/aggravate, squawk, bellow-promotion, random laugh/groan, and hallucinated gecko special cases remain open.
- Adjacent invisible responder display canaries are covered by `docs/c-parity-audit/249-tiphat-adjacent-invisible-noise-2026-05-31.md`.
- Focused full-moon, tame hunger, and dingo no-bark animal canaries are covered by `docs/c-parity-audit/250-tiphat-animal-hunger-moon-2026-05-31.md`.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "worn helmet tip (down at mounted pony uses steed noise|down at helpless mounted pony says it does not notice|makes adjacent visible dog bark|recognizes remembered invisible target|treats floor statue|scans past floor statue|makes a peaceful humanoid without helm wave)" test/shop-billing-helpers.test.mjs` (`7` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1178/1178` tests passed)
- `node --test test/*.mjs` (`1275/1275` tests passed)
- `npm run score` (`44/44` replay sessions passed)
