# C Parity Audit 463: Hero Projectile Hit Dexterity Exercise

Implemented C-style Dexterity exercise after successful currently modeled hero stone/gem projectile hits. No replay maps, private fixtures, player names, move-count checks, or seed-conditioned runtime branches were used.

## Source Anchors

- `nethack-c/upstream/src/dokick.c:733-749`: kicked floor objects fly through `bhit(..., KICKED_WEAPON, ..., &gk.kickedobj)` and dispatch monster impacts through `thitmonst(mon, gk.kickedobj)`.
- `nethack-c/upstream/src/dothrow.c:2021-2023`: `thitmonst()` classifies `uwep` as `HMON_APPLIED`, `gk.kickedobj` as `HMON_KICKED`, and other objects as `HMON_THROWN`.
- `nethack-c/upstream/src/dothrow.c:2152-2162`: weapon, weptool, and `GEM_CLASS` projectile hits roll `rnd(20)` and apply the kicked-ammo hit penalty for kicked ammo.
- `nethack-c/upstream/src/dothrow.c:2193-2226`: after a successful hit, C calls `hmon()`, then `exercise(A_DEX, TRUE)`, then hit-only missile mulch, then `passive_obj()`.
- `nethack-c/upstream/src/uhitm.c:1834-1909`: `hmon()` applies damage and ordinary death handling before returning to `thitmonst()`.
- `nethack-c/upstream/src/attrib.c:489-509`: positive `exercise(A_DEX, TRUE)` consumes `rn2(19)` when physical exercise is allowed and the exercise counter has not saturated.

## JS Changes

- `js/cmd.js`
  - Adds a small `exerciseHeroProjectileHitDexterity()` wrapper around the existing `exerciseAttribute(A_DEX, true)` helper.
  - Calls it after successful direct hero-thrown gem hits, direct hero-thrown stone/gray-stone harmless rock-passer hits, kicked gem hits, and kicked stone/gray-stone harmless rock-passer hits.
  - Keeps unicorn gem catch/gift paths out of this hit branch; C catches those before the hit roll and exercise path.

## Tests

- Updated direct and kicked stone/gem hit RNG canaries to expect `rn2(19)` after hit damage/harmless resolution and before mulch or landing RNG.
- Added an explicit kicked-gem canary asserting `game.u._aexe[A_DEX] === 1` when the hit exercises low Dexterity.
- Kept miss and unicorn catch/gift canaries outside the exercise path.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-reporter=spec --test-name-pattern "(command kicked stone missile|command kicked glass gem|command kicked ruby harms|command kicked flint harms|command kicked glass gem adds|command kicked glass gem negative|hero-thrown loadstone hits|hero-thrown glass gem harms|hero-thrown glass gem hit can mulch|hero-thrown ruby harms)" test/shop-billing-helpers.test.mjs` - 14 pass, 1713 skipped
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining

- Passive-object effects after surviving direct or kicked gem hits remain separate.
- Full generic `thitmonst()` extraction for ordinary kicked weapons/weptools and broader direct hero-thrown weapons remains separate.
- Exact full `omon_adj()` target-size/sleep modifiers remain separate work.
