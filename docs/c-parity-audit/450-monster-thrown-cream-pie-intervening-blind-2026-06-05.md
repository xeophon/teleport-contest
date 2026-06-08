# Monster Thrown Cream Pie Intervening Blindness

Date: 2026-06-05

## Summary

Monster-thrown cream pies now use the `ohitmon()` intervening-monster path before hero catch or hit handling. A Kop pie that crosses another monster rolls the existing accidental-hit threshold, reveals object and furniture mimics on hit, wakes the target, prints the visible hit line, applies C-style monster blindness with `rnd(25) + 20`, and breaks the pie through `drop_throw()`-equivalent cleanup. The slice is state-driven and does not depend on replay, seed, map, player-name, move-count, screen-trace, or hidden-test-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/mthrowu.c:373` through `:401`: non-potion `ohitmon()` hits compute damage, reveal mimics, wake the target, and print the ordinary hit line before post-hit side effects.
- `nethack-c/upstream/src/mthrowu.c:468` through `:489`: blinding venom and cream pies verify the target is still alive, call `can_blnd()`, print the shortened visible blindness message, set `mcansee = 0`, and add `rnd(25) + 20` to `mblinded`, capped at 127.
- `nethack-c/upstream/src/mondata.c:304` through `:356` and `:388` through `:397`: `can_blnd()` allows `CREAM_PIE` as an `AT_WEAP` object, rejects eyeless or permanently blind monsters, and does not use the visor guard for cream pies.
- `nethack-c/upstream/src/mthrowu.c:170` through `:195`: `drop_throw()` deletes cream pies on contact before ordinary floor placement, shipping, passive-object, or stacking effects.

## JS Changes

- `js/allmain.js`
  - Adds local monster cream-pie blindness helpers matching the `can_blnd()` object guard relevant to cream pies and the C `rnd(25) + 20` duration.
  - Extends the Kop cream-pie flight loop to check `monsterAtFlightSquare()` and `monsterThrownObjectAccidentalHitValue()` before terrain continuation and hero catch/hit handling.
  - Resolves an intervening hit by revealing mimics, waking the target, emitting the visible hit and blindness text, applying blindness, and calling `landMonsterThrownObject(..., ohit: true)` so the pie breaks.
- `test/shop-billing-helpers.test.mjs`
  - Lets the Kop cream-pie production harness inject extra monsters.
  - Adds a production test where a high-Dex hero would otherwise catch the pie, but an intervening goblin is hit and blinded first.

## Tests

- `production Kop cream pie hits intervening monster and blinds before hero`

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-name-pattern "Kop cream pie" test/shop-billing-helpers.test.mjs` - 7 pass, 1688 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1695 pass
- `node --test test/*.mjs` - 1846 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Acid venom and eggs remain separate `ohitmon()` slices; cobra-spit blinding venom intervening hits are covered in audit 781.
- Full monster death cleanup for non-launcher thrown intervening hits remains narrower than `xkilled()`/`mondied()` and should stay source-backed.
- Cream-pie intervening hits currently cover the production Kop path; broader generic monster object-hit factoring should wait until another concrete special object path needs it.
