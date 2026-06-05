# C Parity Audit 462: Kicked Gem Damage Bonuses

Implemented C-style damage bonus recomputation for kicked floor `GEM_CLASS` objects that hit monsters through the existing kicked gem impact path. No replay maps, private fixtures, player names, move-count checks, or seed-conditioned runtime branches were used.

## Source Anchors

- `nethack-c/upstream/src/dothrow.c:2152-2162`: kicked weapon, weptool, and `GEM_CLASS` impacts roll `rnd(20)` and use the kicked ammo hit penalty before deciding whether the object hits.
- `nethack-c/upstream/src/dothrow.c:2205-2224`: successful projectile hits call `hmon(mon, obj, HMON_KICKED, dieroll)` before hit-only missile mulch.
- `nethack-c/upstream/src/uhitm.c:1768-1789`: `hmon()` initializes `get_dmg_bonus = TRUE` for kicked hits and records the object material.
- `nethack-c/upstream/src/uhitm.c:884-895`: ranged weapon/ammo fallback damage starts with `rnd(2)` for non-shade targets.
- `nethack-c/upstream/src/uhitm.c:1807`: positive damage is passed through `hmon_hitmon_dmg_recalc()`.
- `nethack-c/upstream/src/uhitm.c:1436-1466`: damage recomputation adds `u.udaminc`; it also adds `dbon()` except for launcher-fired `HMON_THROWN` ammo. Kicked ammo is `HMON_KICKED`, so strength damage applies.
- `nethack-c/upstream/src/uhitm.c:1807-1818`: negative total bonuses cannot turn a hit into a heal; damage bottoms out at one point for ordinary non-shade targets.
- `nethack-c/upstream/src/weapon.c:993-1014` and `nethack-c/upstream/include/attrib.h:36`: `dbon()` maps NetHack strength encoding via `STR18(x)`.

## JS Changes

- `js/cmd.js`
  - Adds `heroStrengthDamageBonus()` using the same `STR18()` thresholds as C `dbon()`, with no strength bonus while polyself is active.
  - Adds `heroDamageIncreaseBonus()` for `game.u.udaminc`.
  - Changes kicked gem hit damage from raw `rnd(2)` to `max(1, rnd(2) + strength damage bonus + damage increase bonus)`.
  - Keeps the currently modeled RNG order unchanged for this damage-only slice: hit roll, damage roll, then missile mulch rolls.

## Tests

- Updated existing kicked glass/ruby/flint hit canaries to expect C strength damage at `A_STR = 25`.
- Added `command kicked glass gem adds damage increase bonus`.
- Added `command kicked glass gem negative damage bonus still deals one damage`.

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-reporter=spec --test-name-pattern "command kicked (glass gem harms|glass gem hit can mulch|ruby harms ordinary|flint harms ordinary|glass gem adds damage increase|glass gem negative damage bonus|ruby miss against ordinary|stone missile|known ruby|known glass gem|unknown glass gem|ruby to tame unicorn|ruby to sleeping unicorn)" test/shop-billing-helpers.test.mjs` - 15 pass, 1712 skipped
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining

- Broader kicked-object `thitmonst()` conversion is still incomplete for ordinary kicked weapons/weptools.
- Successful projectile-hit Dexterity exercise is covered in audit 463 for the currently modeled stone/gem hit paths.
- Passive-object effects after surviving kicked gem hits remain separate.
- Exact full `omon_adj()` target-size/sleep modifiers remain separate work.
