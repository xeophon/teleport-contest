# C Parity Audit 782: Monster Acid-Spit Venom

Implemented the monster acid-venom `spitmm()` path for hero delivery and intervening monster hits. No replay maps, private fixtures, or seed-specific production logic were used.

## Source Anchors

- `nethack-c/upstream/include/monsters.h:2017`: black nagas have `AT_SPIT`/`AD_ACID`.
- `nethack-c/upstream/include/monsters.h:2041`: guardian nagas have `AT_SPIT`/`AD_DRST`, which `spitmm()` maps to blinding venom.
- `nethack-c/upstream/include/monsters.h:2215`: cobras have `AT_SPIT`/`AD_BLND`.
- `nethack-c/upstream/include/monsters.h:3057`: Juiblex has `AT_SPIT`/`AD_ACID`.
- `nethack-c/upstream/src/mthrowu.c:1037`: `AD_ACID` spit creates `ACID_VENOM`.
- `nethack-c/upstream/src/mthrowu.c:673` through `:685`: `m_throw()` advances square-by-square and checks an intervening monster before hero delivery.
- `nethack-c/upstream/src/mthrowu.c:340` through `:350`: intervening monster hits use `5 + find_mac() + omon_adj(...)` against `rnd(20)`.
- `nethack-c/upstream/src/mthrowu.c:373` through `:374`: acid venom rolls `dmgval()` before acid resistance zeroes damage.
- `nethack-c/upstream/src/mthrowu.c:433` through `:442`: visible acid venom either reports the monster is unaffected or that the acid burns it.
- `nethack-c/upstream/src/mthrowu.c:722` through `:742`: hero acid-venom delivery uses ordinary projectile damage and `thitu()` without `Maybe_Half_Phys`.
- `nethack-c/upstream/src/mthrowu.c:123` and `:146`: acid-resistant heroes get the harmless message; nonresistant heroes burn and lose HP.
- `nethack-c/upstream/src/weapon.c:245` and `:292`: acid venom damage is the base `d6` plus an extra `rnd(6)`.
- `nethack-c/upstream/src/mthrowu.c:170` through `:195`: venom is deleted on contact by `drop_throw()`, with no floor placement or breaktest roll.

## JS Changes

- `js/allmain.js`
  - Adds `ACID_VENOM` plus compact source-backed spitter fallbacks for JS monster data that does not yet carry full C attack arrays.
  - Selects spit venom from explicit `AT_SPIT` attack metadata first, falling back to C-backed names for black naga, Juiblex, cobra, and guardian naga.
  - Builds acid and blinding venom through the same monster-spit object factory.
  - Applies acid-venom `2d6` damage before acid resistance checks for both hero and intervening monster hits.
  - Preserves intervening-monster order, mimic reveal, wakeup, hit wording, acid burn/unaffected feedback, HP loss, lethal cleanup, and hit-only venom deletion.
- `test/shop-billing-helpers.test.mjs`
  - Generalizes the cobra-spit helper so black-naga fixtures can reuse the same monster-turn setup.
  - Adds black-naga hero-hit, acid-resistant hero-hit, intervening burn, and acid-resistant intervening canaries.

## Tests

- `automatic hostile acid spit hits hero with acid venom damage`
- `automatic hostile acid spit respects hero acid resistance after damage roll`
- `automatic hostile acid spit burns intervening monster before hero`
- `automatic hostile acid spit is harmless against acid-resistant intervening monster`

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-name-pattern "acid spit|cobra spit" test/shop-billing-helpers.test.mjs` - 8 pass, 2763 skipped
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Eggs remain a separate `ohitmon()` special-object slice.
- Broader generic monster object-hit factoring should wait until another concrete production special-object path needs it.
