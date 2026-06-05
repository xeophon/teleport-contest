# C Parity Audit 467: Hero Kicked Dagger/Knife Direct Hit

Implemented ordinary non-artifact hero-kicked dagger and knife direct monster hits through the existing kicked-floor-object impact path. No replay maps, private fixtures, player names, move-count checks, or seed-conditioned runtime branches were used.

## Source Anchors

- `nethack-c/upstream/src/dokick.c:1257`, `nethack-c/upstream/src/dokick.c:1452`, and `nethack-c/upstream/src/dokick.c:733`: kicking a floor object extracts it and sends it through `bhit(..., KICKED_WEAPON, ..., &gk.kickedobj)`.
- `nethack-c/upstream/src/dokick.c:742`: non-gold kicked-object monster impact calls `thitmonst(mon, gk.kickedobj)`.
- `nethack-c/upstream/src/dokick.c:771`: a surviving kicked object lands through `flooreffects()`, placement, zombie disturbance, stacking, and `newsym()`.
- `nethack-c/upstream/src/dothrow.c:2021`: `thitmonst()` treats `obj == gk.kickedobj` as `HMON_KICKED`.
- `nethack-c/upstream/src/dothrow.c:2036`, `nethack-c/upstream/src/dothrow.c:2074`, `nethack-c/upstream/src/dothrow.c:2152`, `nethack-c/upstream/src/dothrow.c:2156`, and `nethack-c/upstream/src/dothrow.c:2193`: kicked projectile hit value uses the object hit bonus and target adjustments, rolls `rnd(20)`, skips the thrown-weapon to-hit bonus/skill branch, and applies the kicked non-ammo `-3` adjustment before comparing.
- `nethack-c/upstream/src/dothrow.c:2205`, `nethack-c/upstream/src/dothrow.c:2209`, `nethack-c/upstream/src/dothrow.c:2220`, and `nethack-c/upstream/src/dothrow.c:2226`: a successful projectile monster hit calls `hmon()`, exercises Dexterity, checks hit-only missile mulch, then calls `passive_obj()` for surviving objects.
- `nethack-c/upstream/src/uhitm.c:819`, `nethack-c/upstream/src/uhitm.c:942`, `nethack-c/upstream/src/uhitm.c:1075`, `nethack-c/upstream/src/uhitm.c:1415`, `nethack-c/upstream/src/uhitm.c:1436`, and `nethack-c/upstream/src/weapon.c:216`: `hmon()` and `dmgval()` route weapon damage through the object small/large target dice and later hero damage modifiers.
- `nethack-c/upstream/src/uhitm.c:6122`, `nethack-c/upstream/src/uhitm.c:6145`, and `nethack-c/upstream/src/uhitm.c:6156`: passive object effects run after the successful hit and before the object resumes normal landing.
- `nethack-c/upstream/include/objects.h:114`: weapon object data includes small damage, large damage, and hit bonus fields.
- `nethack-c/upstream/include/objects.h:200`: ordinary daggers have `1d4` small-target damage, `1d3` large-target damage, and `+2` object hit bonus.
- `nethack-c/upstream/include/objects.h:218`: ordinary knives have `1d3` small-target damage, `1d2` large-target damage, and no object hit bonus.
- `nethack-c/upstream/src/attrib.c:509`: successful projectile hits can consume the Dexterity exercise `rn2(19)` check after damage.
- `nethack-c/upstream/src/zap.c:3547`: hit punctuation uses `exclam(dmg)`, with damage up to 4 producing `.` and larger damage producing `!`.

## JS Changes

- `js/cmd.js`
  - Generalizes the narrow direct thrown dagger/knife helpers into shared hero projectile weapon helpers.
  - Preserves direct thrown dagger/knife hit behavior while adding a kicked variant that uses the existing kicked projectile hit-value penalty instead of the thrown-weapon `+2` path.
  - Lets `kickFloorObjectToward()` handle ordinary dagger/knife monster impacts alongside the existing kicked unicorn, stone, and gem cases.
  - Reuses the existing kicked landing path so surviving daggers/knives apply passive-object follow-up on hit, then land, stack, and redraw from `placeKickedFloorObject()`.
  - Keeps the current local slice limited to ordinary dagger/knife base dice, enchantment, erosion, hero damage-increase, and strength modifiers; broader full-`hmon()` skill, artifact, blessed, silver, poison, and special weapon behavior remains separate.

## Tests

- Added a kicked dagger hit against a sleeping peaceful goblin, asserting hit message punctuation, damage, wake/anger cleanup, survival, landing coordinates, and RNG order.
- Added a kicked knife hit against the same ordinary-monster baseline, asserting knife damage dice, survival, landing, object type, and RNG order.
- Kept the tests adjacent to the kicked flint/gem monster-impact cases to cover shared kicked-object ordering.

## Verification

- `node --test --test-name-pattern "(command kicked (dagger|knife)|hero-thrown (dagger|knife))" test/shop-billing-helpers.test.mjs` - pass
- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `node --test test/shop-billing-helpers.test.mjs` - pass
- `node --test` - pass
- `node --test test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining

- Full shared `thitmonst()`/`hmon()` extraction, including weapon damage skill bonuses, remains separate.
- Artifacts, blessed weapon to-hit/damage, silver/searing behavior, poisoned weapons, spear-vs-kebabable to-hit, launcher/ammo handling, and hit-only missile mulch remain separate.
- Broader kicked-object landing through shop, breakage, traps, liquids, iron bars, sinks, web/bars travel, object mimics, and passive erosion internals beyond the existing passive call order remain separate.
