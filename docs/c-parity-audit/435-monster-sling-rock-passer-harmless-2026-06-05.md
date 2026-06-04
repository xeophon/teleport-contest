# Monster Sling Rock-Passer Harmless Hit

Date: 2026-06-05

## Summary

Production monster-slung stone missiles now preserve C's `stone_missile() && passes_rocks()` branch for intervening monsters. A successful accidental hit against an earth elemental or xorn still consumes the sling damage roll and wakes the target, but skips HP loss, reports the visible harmless-hit wording, and stops the projectile on that monster's square through the same `ohit=true` landing path.

This is a source-backed production broadening only. It does not add replay, seed, map, player-name, move-count, screen-trace, or hidden-test-conditioned behavior.

## Upstream Source Anchors

- `nethack-c/upstream/src/mthrowu.c:673` through `:687`: monster projectiles scan `m_at()` and call `ohitmon()` before hero or terrain handling.
- `nethack-c/upstream/src/mthrowu.c:340` through `:350`: `ohitmon()` uses the accidental-hit `rnd(20)` gate before object-hit effects.
- `nethack-c/upstream/src/mthrowu.c:369` through `:399`: non-potion object hits compute `harmless = stone_missile(otmp) && passes_rocks(mtmp->data)`, still roll `dmgval()`, and use harmless visible wording.
- `nethack-c/upstream/src/mthrowu.c:451` through `:455`: harmless hits skip HP subtraction and kill handling.
- `nethack-c/upstream/src/mthrowu.c:494` through `:499`: harmless hits still call `drop_throw(..., ohit=1)` and stop the projectile.
- `nethack-c/upstream/src/mthrowu.c:162` through `:190`: `drop_throw()` performs hit-only mulch before placement, then runs `passive_obj()` before stacking.
- `nethack-c/upstream/include/obj.h:274` through `:278`: `stone_missile()` is material `GEMSTONE` or `MINERAL`, excluding rings.
- `nethack-c/upstream/include/mondata.h:205` through `:208`: `passes_rocks()` is `passes_walls()` and not `unsolid()`, intended for xorns and earth elementals rather than ghosts or shades.
- `nethack-c/upstream/include/objects.h:1515` through `:1524` and `:1598` through `:1606`: real gems, rocks, flint, and gray stones are `GEM_CLASS` sling ammo; glass gems are `GLASS` and are not `stone_missile()`.

## JS Changes

- `js/allmain.js`
  - Adds sling-local `stone_missile()` classification for rocks, flint, gray stones, real gems, and explicit mineral/gemstone material while excluding glass and rings.
  - Adds a constrained rock-passer predicate for earth elementals, xorns, or explicit `passesRocks` test fixtures, while excluding unsolid/noncorporeal targets.
  - Keeps the existing `rnd(monsterSlingAmmoDamageSides(...))` roll on harmless hits, skips HP loss only for the harmless branch, and preserves `ohit=true` landing.
- `test/shop-billing-helpers.test.mjs`
  - Adds a loadstone versus rock-passing earth elemental production test proving no HP loss, wakeup, harmless wording, acid-passive gate ordering, and stacking.
  - Adds a glass-gem canary proving glass sling gems still damage rock-passing monsters and do not use harmless wording.

## Tests

- `production monster sling harmless rock-passer hit still runs passive before stacking`
- `production monster sling glass gem still harms intervening rock-passing monster`

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-reporter=spec --test-name-pattern "production monster sling (harmless rock-passer|glass gem still harms)" test/shop-billing-helpers.test.mjs` - 2 pass, 1663 skipped
- `node --test --test-reporter=dot --test-name-pattern "sling" test/shop-billing-helpers.test.mjs` - pass
- `node --test test/shop-billing-helpers.test.mjs` - 1665 pass
- `node --test test/*.test.mjs` - 1816 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- This slice covers only the production sling branch's stone-missile harmless-hit case. Generic `ohitmon()` extraction for launcher ammo, thrown rocks outside the sling branch, and direct hero-thrown stone missiles remain separate work.
- Real-gem hard-mulch survival on harmless intervening hits is not separately covered; this slice uses loadstones for passive-ordering and glass as the non-stone canary.
- The existing accidental-hit threshold still omits `omon_adj()` and aimed-target launcher/artifact bonuses.
- Mimic reveal, poison, acid venom, egg, cream-pie, blinding, lethal cleanup, and broader monster death/drop handling remain outside this slice.
