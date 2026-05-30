# C Parity Audit 207: Stone-to-Flesh Saved Statue Traits

## Sources

- `nethack-c/upstream/src/mkobj.c:2056-2169`: `mkcorpstat()` creates corpses/statues and `save_mtraits()` copies monster traits into the object extension while clearing live links, inventory, weapon pointers, and stale positioning state.
- `nethack-c/upstream/src/mon.c:3287-3354`: `monstone()` removes/filters live monster inventory before creating the statue, stores monster traits on the statue, then places remaining inventory inside the statue contents.
- `nethack-c/upstream/src/zap.c:713-820`: `montraits()` recreates a fresh monster with `NO_MINVENT | MM_NOWAIT | MM_NOCOUNTBIRTH | MM_NOTAIL | MM_NOMSG`, overlays saved traits, heals to full HP, resets unsafe status, keeps the fresh monster ID, and preserves saved name/tame/peaceful-style state.
- `nethack-c/upstream/src/trap.c:746-880`: `animate_statue()` runs `cant_revive()` before golem conversion and saved-trait restoration; spell animation permits adjacent placement, while trap animation releases the restored monster hostile.
- `nethack-c/upstream/src/zap.c:1988-2035`: floor stone-to-flesh routes mineral/gemstone statues through the shared animation path after material and vegetarian replacements.

## JS Changes

- `mkcorpstat(STATUE, ...)` now stores a sanitized saved-traits snapshot in `oextra.omonst`, including monster data and revival-relevant status fields while intentionally excluding `minvent`.
- Floor stone-to-flesh and statue-trap animation now treat `oextra.omonst` as saved traits rather than as a broad "attached monster" skip condition.
- Saved-trait animation now follows the C ordering: `cant_revive()`, golem spell conversion, then saved-trait restoration when eligible.
- Restored statues use `NO_MINVENT | MM_NOWAIT | MM_NOCOUNTBIRTH | MM_NOTAIL | MM_NOMSG`, heal to full HP, reset sleep/frozen/blind/confused/trapped/leashed-style state, preserve saved form/name/tame/peaceful fields for spell animation, keep the fresh monster ID, and avoid stale saved inventory.
- Statue-trap animation restores the saved monster first, then applies the trap's hostile release semantics.
- Statue contents continue to transfer into the animated monster after animation text/debt handling, matching the covered C ordering.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Downward stone-to-flesh restores a saved unique Medusa statue instead of creating a directed doppelganger, heals it, resets unsafe state, transfers statue contents, and ignores stale saved `minvent`.
- Normal statue-trap activation restores saved Medusa traits before releasing the monster hostile, transfers contents, and avoids stale saved `minvent`.
- Cockatrice-egg petrification now asserts that the produced statue carries saved monster traits and no saved inventory.

## Remaining Gaps

- C also stores saved monster traits on corpses; this slice only models saved traits for statues.
- Full shopkeeper/priest/guard `mextra` restoration is not modeled yet.
- Exact C level-restoration RNG and `monhp_per_lvl()` growth are approximated by deterministic full-heal restoration.
- The post-transfer monster equipment wear pass is still missing.
- Statue-trap activation still only handles the first visible statue object at the square instead of C's loop over same-square statues when unique animation fails.
- Protection-from-shape-changers and complete `newcham()` lifecycle behavior remain tied to the broader shapechanger gap.

## Verification

- `node --check js/cmd.js`
- `node --check js/mklev.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "downward stone to flesh restores saved traits from unique floor statue|statue trap restores saved traits before releasing hostile monster|hero-thrown cockatrice egg petrifies direct-hit monster" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs` (`1073/1073`)
- `node --test test/*.mjs` (`1170/1170`)
- `npm run score` (`44/44`, including `seed0030-ten-diverse-deaths.session.json` at `RNG 105529/105529`, `Screen 1953/1953`)
