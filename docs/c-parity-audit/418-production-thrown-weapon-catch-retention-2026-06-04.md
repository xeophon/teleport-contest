# Production Thrown Weapon Catch Retention

Date: 2026-06-04

## Summary

Monster-thrown spears, shuriken, plain/silver daggers, crude/orcish daggers, and knives now split or extract a one-unit projectile before catch, hit, miss, terrain-stop, and landing handling. Successful catches use the shared C-shaped catch gate and inventory/drop helper, so caught weapons are retained, merged, or catch-but-dropped instead of only printing catch text.

No replay, seed, map, player-name, move-count, or trace-conditioned production behavior was added.

## Upstream Source Anchors

- `nethack-c/upstream/src/weapon.c:498` through `:502`: monster ranged weapon selection includes spears, shuriken, daggers, orcish daggers, and knives in C rank order.
- `nethack-c/upstream/src/mthrowu.c:593` through `:613`: `m_throw()` extracts a singleton object or splits one object from a stack before flight.
- `nethack-c/upstream/src/mthrowu.c:604` through `:608`: singleton extraction unwields the monster weapon before removing it from monster inventory.
- `nethack-c/upstream/src/mthrowu.c:687` through `:695`: when the missile reaches the hero, non-tethered thrown objects call `u_catch_thrown_obj(singleobj)` before potion handling and before `thitu()`.
- `nethack-c/upstream/src/mthrowu.c:531` through `:545`: `u_catch_thrown_obj()` applies the status, venom, hands, free-hand, and capacity gates before `rn2(catch_chance)`, then calls `hold_another_object()`.
- `nethack-c/upstream/src/invent.c:1208` through `:1298`: `hold_another_object()` adds the caught object to inventory, merges where possible, or drops it with the catch-but-drop message when it cannot be retained.
- `nethack-c/upstream/src/mthrowu.c:787` and `:798` through `:816`: uncaught objects reach the ordinary hit/miss `drop_throw()` paths.

## JS Changes

- `js/allmain.js`
  - Adds `splitMonsterThrownInventoryObject()` for one-unit monster projectile extraction.
  - Applies the splitter to spear, shuriken, plain/silver dagger, crude/orcish dagger, and knife branches.
  - Clears `mon.mw` when a wielded singleton is extracted, matching C's unwield-before-extract behavior.
  - Replaces local catch predicates in these branches with `heroCanAttemptThrownObjectCatch(thrownMissile)`.
  - Calls `holdCaughtThrownObject(thrownMissile)` on catch success with each branch's display name.
  - Routes terrain stops, hit/miss landing, and deferred crude-dagger landing through the thrown singleton instead of residual monster stacks.
- `test/shop-billing-helpers.test.mjs`
  - Adds split-stack catch regressions for crude dagger, spear, shuriken, plain dagger, and knife.
  - Adds a wielded singleton spear catch regression that verifies monster weapon state is cleared on extraction.

## Tests

- `production monster crude dagger catch does not queue drop-throw landing`
- `production monster spear catch retains split spear in inventory`
- `production monster wielded spear catch unwields extracted singleton`
- `production monster shuriken catch retains split shuriken in inventory`
- `production monster plain dagger catch retains split dagger in inventory`
- `production monster knife catch retains split knife in inventory`

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "catch retains split|wielded spear catch|crude dagger catch" test/shop-billing-helpers.test.mjs` - 7 pass, 1624 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1631 pass
- `node --test test/*.test.mjs` - 1782 pass
- `git diff --check`
- `npm run score` - 44/44 passing

## Remaining Gaps

- Monster-slung ammo and monster-thrown potions still need object retention wired through the shared catch helper.
- Full-inventory/drop-path coverage for this ordinary-weapon group is not yet separate; the production branches now share the helper covered by Kop cream-pie catch tests.
- Broader C `dmgval()` parity for enchanted/eroded daggers and knives remains separate from catch retention.
