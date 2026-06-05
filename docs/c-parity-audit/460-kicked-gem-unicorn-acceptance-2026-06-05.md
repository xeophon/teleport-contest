# C Parity Audit 460: Kicked Gem Unicorn Acceptance

Implemented kicked floor-gem handling for the unicorn catch/acceptance branch. No replay maps, private fixtures, player names, move-count checks, or seed-conditioned runtime branches were used.

## Source Anchors

- `nethack-c/upstream/src/dokick.c:733-747`: floor-object kicks extract `gk.kickedobj`, route flight through `bhit(..., KICKED_WEAPON, ..., &gk.kickedobj)`, and call `thitmonst(mon, gk.kickedobj)` when a monster is hit.
- `nethack-c/upstream/src/dokick.c:771`: when `thitmonst()` returns false and the object still exists, the kicked object lands at the `bhit` position.
- `nethack-c/upstream/src/zap.c:3846-3994`: `bhit()` starts kicked-object travel one square in front of the hero and returns the contacted monster without applying object-hit logic itself.
- `nethack-c/upstream/src/dothrow.c:2021-2023`: `thitmonst()` classifies `gk.kickedobj` impacts as `HMON_KICKED`.
- `nethack-c/upstream/src/dothrow.c:2082-2098`: non-mineral `GEM_CLASS` objects hitting unicorns while not slung run the unicorn catch branch before the ordinary `rnd(20)` hit roll.
- `nethack-c/upstream/src/dothrow.c:2152-2162`: the generic projectile hit roll is later and should be skipped for unicorn gem gifts.
- `nethack-c/upstream/src/dothrow.c:2308-2381`: `gem_accept()` handles peace/revenge clearing, real-gem Luck, known/named glass rejection, unknown-glass acceptance, monster inventory pickup, and relocation.
- `nethack-c/upstream/include/mondata.h:144-149`: `is_unicorn()` requires the unicorn monster letter and `likes_gems()`.
- `nethack-c/upstream/include/monst.h:251`: helpless monsters are sleeping or immobile.
- `nethack-c/upstream/include/objects.h:1526-1607`: real gems are `GEMSTONE`, glass gems are `GLASS`, and gray stones/rocks/loadstones are `MINERAL`.
- `nethack-c/upstream/src/dothrow.c:2594`: glass gem-class objects are excluded from pre-kick fragile breakage.

## JS Changes

- `js/cmd.js`
  - Allows the existing first-square floor-kick monster impact path to handle non-mineral gems kicked at unicorns.
  - Reuses the direct unicorn gem helper before kicked stone/glass hit helpers, preserving C ordering ahead of `rnd(20)`.
  - Treats accepted unicorn gifts as consumed by the monster so the kicked floor object is removed and not landed.
  - Keeps rejected, tame, and helpless unicorn cases on the existing kicked-object landing path.

## Tests

- `command kicked known ruby to coaligned unicorn is accepted before hit roll`
- `command kicked known glass gem to unicorn is rejected as junk and lands`
- `command kicked unknown glass gem to unicorn is accepted without luck`
- `command kicked ruby to tame unicorn is caught and dropped without gift effects`
- `command kicked ruby to sleeping unicorn misses without waking it`

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-reporter=spec --test-name-pattern "command kicked (known ruby|known glass gem|unknown glass gem|ruby to tame unicorn|ruby to sleeping unicorn)" test/shop-billing-helpers.test.mjs` - 5 pass, 1717 skipped
- `node --test --test-reporter=dot --test-name-pattern "command kicked (stone missile|glass gem|known ruby|known glass gem|unknown glass gem|ruby to tame unicorn|ruby to sleeping unicorn)|hero-thrown (ruby|known ruby|known glass gem|unknown glass gem|loadstone|stone missile|glass gem)" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining

- Broad kicked-object `thitmonst()` conversion is still incomplete for ordinary kicked weapons/weptools, full kicked-ammo damage bonuses, and passive-object fallout beyond the later generic gem branch.
- Full unicorn relocation message/RNG canaries, cross-aligned and named/called real-gem Luck, shop billing inside `gem_accept()`, monster pickup/catch merging details, and exact full `omon_adj()` target-size/sleep modifiers remain separate work.
