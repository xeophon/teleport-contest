# C Parity Audit 459: Direct Hero-Thrown Gem Unicorn Acceptance

Implemented direct hero-thrown gem handling for ordinary monster hits and unicorn catch/acceptance before the normal hit roll. No replay maps, private fixtures, player names, move-count checks, or seed-conditioned runtime branches were used.

## Source Anchors

- `nethack-c/upstream/src/dothrow.c:1477-1503`: direct hero throws route monster-square impacts through `throwit_mon_hit()` and `thitmonst(mon, obj)`.
- `nethack-c/upstream/src/dothrow.c:1562-1700` and `:1780-1838`: surviving thrown objects continue through the ordinary projectile landing tail.
- `nethack-c/upstream/src/dothrow.c:1913-1945`: `omon_adj()` can thaw immobile targets before the monster-hit branch and applies target-state hit adjustments.
- `nethack-c/upstream/src/dothrow.c:1949-1966`: `tmiss(..., maybe_wakeup)` supports miss wording without waking helpless targets.
- `nethack-c/upstream/src/dothrow.c:2011-2098`: `thitmonst()` runs the unicorn gem branch before the generic `rnd(20)` object-hit roll.
- `nethack-c/upstream/src/dothrow.c:2152-2162`: non-unicorn weapon, weptool, and gem-class projectile hits use `rnd(20)`; direct thrown gem ammo without a launcher takes the no-launcher penalty.
- `nethack-c/upstream/src/dothrow.c:2200-2225`: successful object hits can still run `should_mulch_missile()` before landing.
- `nethack-c/upstream/src/dothrow.c:2308-2381`: `gem_accept()` handles unicorn peace/revenge state, tame catch/drop, real-gem Luck, known/named glass rejection, unknown-glass acceptance, monster inventory, and relocation.
- `nethack-c/upstream/src/uhitm.c:884-895`: ranged weapon-style object hits deal `rnd(2)` damage.
- `nethack-c/upstream/src/uhitm.c:1397-1407`: rock-passer harmless hits only apply to `stone_missile()` objects, so glass and real gems still use the ordinary damage path when not caught by a unicorn.
- `nethack-c/upstream/include/objects.h:1526-1607`: real gems, glass gems, and gray stones use distinct materials.
- `nethack-c/upstream/include/mondata.h:144-149`: `likes_gems()` and `is_unicorn()` define the unicorn gem branch predicate.
- `nethack-c/upstream/include/obj.h:274-277`: `stone_missile()` is material-based and does not include glass gems.

## JS Changes

- `js/cmd.js`
  - Adds shared gem-class classification for direct hero-thrown projectiles while still excluding rings.
  - Adds unicorn target detection and gem-kind classification that accepts real gems and glass gems but leaves mineral gray stones outside `gem_accept()`.
  - Adds the direct unicorn catch branch before the normal object-hit roll, including pre-catch immobile thaw, helpless miss without wake, tame catch/drop, peace/revenge clearing, real-gem Luck deltas, known/named glass junk rejection, unknown-glass gift acceptance, monster inventory transfer, and silent relocation when teleport is allowed.
  - Broadens direct hero-thrown gem hits from only glass gems to generic gem-class objects, using the existing C-shaped hit value, `rnd(20)` hit roll, `rnd(2)` damage, wake/anger side effects, hit-only mulch, and ordinary landing for survivors.
  - Keeps the stone-missile rock-passer harmless branch ahead of generic gem damage, so minerals and gray stones preserve the earlier audits' behavior.

## Tests

- `hero-thrown ruby harms ordinary monster and survives landing`
- `hero-thrown known ruby to coaligned unicorn is accepted before hit roll`
- `hero-thrown known glass gem to unicorn is rejected as junk and lands`
- `hero-thrown unknown glass gem to unicorn is accepted without luck`
- `hero-thrown ruby to tame unicorn is caught and dropped without gift effects`

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-reporter=spec --test-name-pattern "hero-thrown (ruby harms|known ruby|known glass gem|unknown glass gem|ruby to tame unicorn)" test/shop-billing-helpers.test.mjs` - 5 pass, 1712 skipped
- `node --test --test-reporter=dot --test-name-pattern "hero-thrown (ruby|known ruby|known glass gem|unknown glass gem|loadstone|stone missile|glass gem)|command kicked (stone missile|glass gem)" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining

- Full relocation message/RNG canaries, cross-aligned random Luck, named/called real-gem Luck, and helpless-thaw edge cases remain separate work. Direct kicked gem-to-unicorn parity is covered in audit 460.
- This does not complete full `thitmonst()`/`hmon()` for every direct object class. Broader thrown weapon damage, passive-object side effects, monster pickup/catch handling, shop billing inside `gem_accept()`, and exact full `omon_adj()` target-size/sleep modifiers remain open.
