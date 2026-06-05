# C Parity Audit 455: Direct Hero-Thrown Rock-Passer Harmless Hit

Implemented the narrow direct hero-thrown `stone_missile() && passes_rocks()` branch. No replay maps, private fixtures, player names, move-count checks, or seed-conditioned runtime branches were used.

## Source Anchors

- `nethack-c/upstream/src/dothrow.c:1481-1493`: direct hero throws route a monster-square impact through `throwit_mon_hit()` and `thitmonst(mon, obj)`.
- `nethack-c/upstream/src/dothrow.c:1695-1704`: after `throwit_mon_hit()`, a cleared thrown object means the missile was already handled; otherwise it continues through the normal landing path.
- `nethack-c/upstream/src/uhitm.c:1397-1406`: in `hmon()`, thrown or kicked stone missiles against rock-passing monsters print the harmless-hit text, wake the monster, return early, and do not apply damage.
- `nethack-c/upstream/include/obj.h:274-278`: `stone_missile()` is material `GEMSTONE` or `MINERAL`, excluding rings.
- `nethack-c/upstream/include/mondata.h:205-208`: `passes_rocks()` requires `passes_walls()` and not `unsolid()`, matching xorns and earth elementals rather than ghosts or shades.

## JS Changes

- `js/cmd.js`
  - Adds direct-throw stone-missile classification using the existing stone-to-flesh object material proxy, while excluding ring-class objects.
  - Adds a constrained rock-passer predicate for earth elementals, xorns, and explicit `passesRocks` fixtures, while still requiring wall-passing metadata and excluding unsolid targets.
  - Threads the branch into the horizontal hero throw path before the generic non-combat miss branch.
  - Preserves the existing direct-throw hit-roll style, wakes/angers the monster on harmless hit, skips HP damage, and keeps the ordinary landing path for the surviving object.

## Tests

- `hero-thrown loadstone hits rock-passing monster harmlessly`
- `hero-thrown stone missile miss against rock-passer stays a miss`

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-name-pattern "hero-thrown (loadstone|stone missile)" test/shop-billing-helpers.test.mjs` - 2 pass, 1701 skipped
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining

- This is not a full direct `thitmonst()`/`hmon()` conversion for ordinary thrown weapons, gems, and rocks. Generic direct object-hit damage, monster pickup/handling semantics, glass gem damage, boulder kicking, and broader passive-object delivery remain separate work.
- Kicked stone missiles use the same C branch but are outside this direct hero-throw slice.
