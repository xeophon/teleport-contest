# Production Kop Cream Pie Throwing

Date: 2026-06-04

## Summary

Hostile Keystone Kops now use naturally generated cream-pie stacks in the production monster-turn ranged path. The branch is Kop-specific, prefers cream pies before generic thrown weapons or launcher shortcuts, splits one pie from a stack for flight, applies the C `thitu(8, 0)` hit test with zero damage, creams eligible heroes with `rnd(25)`, and lets the shared monster-thrown landing helper splat the pie on hit or miss. No replay, seed, map, player-name, move-count, or trace-conditioned behavior was added.

## Upstream Source Anchors

- `nethack-c/upstream/src/weapon.c:531` through `:545`: `select_rwep()` checks `S_KOP` and returns `CREAM_PIE` before boulders, polearms, aklys, and the generic ranged list.
- `nethack-c/upstream/src/weapon.c:498` through `:502`: `CREAM_PIE` is also in the generic ranged list, but Kop selection reaches the dedicated branch first.
- `nethack-c/upstream/include/objects.h:1100`: cream pie is a `FOOD_CLASS` object, not launcher ammunition.
- `nethack-c/upstream/src/mthrowu.c:198` through `:248`: monster multishot applies to launcher ammo or stackable `WEAPON_CLASS`; cream pies do not qualify, so only one pie is thrown.
- `nethack-c/upstream/src/mthrowu.c:593` through `:613`: `m_throw()` extracts a singleton object or splits one object from a stack before flight.
- `nethack-c/upstream/src/mthrowu.c:274` through `:291`: visible monster throws print `"<Mon> throws a cream pie!"`.
- `nethack-c/upstream/src/mthrowu.c:714`: cream pies call `thitu(8, 0, &singleobj, NULL)` against the hero.
- `nethack-c/upstream/src/mthrowu.c:106` through `:125`: `thitu()` misses when `u.uac + tlev <= rnd(20)`, otherwise prints the hit wording and deals the supplied damage.
- `nethack-c/upstream/src/mthrowu.c:755` through `:764`: cream-pie hits roll `rnd(25)` blindness and print either the creamed or sticky-face message.
- `nethack-c/upstream/src/mthrowu.c:836` through `:839`: successful creaming increments `u.ucreamed` and blindness timeout by the rolled duration.
- `nethack-c/upstream/src/mondata.c:315` through `:345`: hero cream-pie blinding requires eyes and is blocked by a worn blindfold.
- `nethack-c/upstream/src/mthrowu.c:170` through `:178`: `drop_throw()` destroys cream pies regardless of hit or miss.

## JS Changes

- `js/allmain.js`
  - Adds Kop cream-pie projectile recognition and hero creaming helpers.
  - Adds a Kop-specific production monster-turn branch gated by hostile, armed `S_KOP` data, `mon.missile` cream pie, straight ranged line, and non-adjacent range.
  - Excludes available Kop cream pies from the earlier launcher ready/shoot shortcuts so the C Kop preference wins.
  - Splits one pie from stacks with a fresh object id and leaves the residual stack in `minvent`.
  - Uses the C hit formula `uac + 8 > rnd(20)`, zero damage, `rnd(25)` creaming, blindfold/no-eyes blocking, C hit/miss wording, and shared splat-on-contact landing.
- `test/shop-billing-helpers.test.mjs`
  - Adds production Kop cream-pie harness coverage for hit/blinding, stack splitting, blindfold blocking, and miss splatting.
  - Adds a concrete `CREAM_PIE` object id to the local cream-pie test helper.

## Tests

- `production hostile Kop throws cream pie and creams hero on hit`
- `production Kop cream pie stack splits one thrown pie`
- `production Kop cream pie blindfold blocks hero creaming`
- `production Kop cream pie miss breaks without blinding hero`

## Verification

- `node --check js/allmain.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "Kop cream pie|hostile Kop throws cream pie" test/shop-billing-helpers.test.mjs` - 4 pass, 1618 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1622 pass
- `node --test test/*.test.mjs` - 1773 pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Hero catching a monster-thrown cream pie remains open. Upstream can catch non-venom thrown objects before hit resolution; the existing JS monster-thrown projectile branches have uneven catch/inventory insertion behavior, so this needs its own focused parity slice.
- Broader `hits_bars()` food/object-class behavior remains separate from this Kop runtime branch.
