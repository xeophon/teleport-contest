# C Parity Audit 205: Stone-to-Flesh Directed Doppelganger Statue

## Sources

- `nethack-c/upstream/src/zap.c:1991-2029`: stone-to-flesh processes objects after material/resistance checks and sends floor statues to `animate_statue(..., ANIMATE_SPELL, ...)`.
- `nethack-c/upstream/src/read.c:3112-3132`: `cant_revive()` maps guards/clerics/angels to human zombies, long worm tails to long worms, and unique corpses/statues without saved monster traits to doppelgangers.
- `nethack-c/upstream/src/trap.c:746-785`: `animate_statue()` runs `cant_revive()` before golem or saved-trait handling; unique no-traits statues create a doppelganger with `MM_NOCOUNTBIRTH | MM_ADJACENTOK`, then call `newcham(mon, original_mptr, NO_NC_FLAGS)`.
- `nethack-c/upstream/src/trap.c:801-880`: successful statue animation christens only non-unique results, clears sleep/hidden state, prints animation text before shop debt/historic side effects, transfers contents, and removes the statue.

## JS Changes

- Replaced the broad floor-statue `unique || noCorpse || cantRevive` deferral with a C-shaped resolver for spell animation.
- Added floor-statue `cant_revive()` substitutes for human zombies, long worms, and unique/cant-revive doppelganger fallback.
- The directed doppelganger path now creates a doppelganger first with `MM_NOCOUNTBIRTH | MM_ADJACENTOK`, then retargets the visible monster form to the original statue monster while preserving `chamBase: 'doppelganger'`.
- Non-vegetarian `noCorpse` floor statues now attempt animation instead of being skipped; failure still preserves the original statue when C would not leave a corpse fallback.
- Saved attached monster-trait statues remain deferred for a later `montraits()` slice rather than being incorrectly fresh-animated.
- Unique statue and figurine display now omits the indefinite article, so a Medusa statue is named `statue of Medusa` instead of `statue of a Medusa`.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- Downward stone-to-flesh on a unique Medusa floor statue removes the statue, creates a monster displayed as Medusa, keeps `chamBase: 'doppelganger'`, clears sleep/hidden flags, and avoids meat/object-polymorph side effects.

## Remaining Gaps

- Saved `omonst`/`montraits()` restoration is still not implemented; C creates a base monster, overlays saved traits, heals it, and restores shapechanger state.
- Statue traps still use their older direct animation path and need a shared `animate_statue()` helper before broadening this behavior there.
- Protection-from-shape-changers keeps the observable doppelganger form, but exact RNG suppression inside `makemon(PM_DOPPELGANGER)` remains a broader shapechanger-generation gap.
- Wider object-polymorph fallout, upward hiding-under targeting, and boulder/restack cleanup remain separate slices.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "downward stone to flesh animates unique floor statue as directed doppelganger" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs` (`1070/1070`)
- `node --test test/wishing.test.mjs` (`79/79`)
- `node --test test/*.mjs` (`1167/1167`)
- `npm run score` (`44/44`, including `seed0030-ten-diverse-deaths.session.json` at `RNG 105529/105529`, `Screen 1953/1953`)
