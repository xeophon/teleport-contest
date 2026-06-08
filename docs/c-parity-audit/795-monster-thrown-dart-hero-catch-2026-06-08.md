# C Parity Audit 795: Monster-Thrown Dart Hero Catch

Closed the next production dart follow-up after audit 794: monster-thrown darts now run the generic hero catch gate before dart damage, hit rolling, poison tails, and hero-square `drop_throw()` landing. The implementation reuses the existing thrown-object catch helpers and does not add replay-map or seed-specific production logic.

## Source Anchors

- `nethack-c/upstream/src/mthrowu.c:198` through `:246`: dart stacks can receive `monmulti()` multishot handling as weapon-class missiles before `monshoot()`.
- `nethack-c/upstream/src/mthrowu.c:274` through `:291`: visible dart volleys use `throws` wording because darts are not launcher ammo.
- `nethack-c/upstream/src/mthrowu.c:593` through `:646`: `m_throw()` extracts or splits one in-flight object and handles cursed/greased misfire before normal delivery.
- `nethack-c/upstream/src/mthrowu.c:687` through `:696`: after flight reaches the hero square, C first checks unicorn gem catch, then `u_catch_thrown_obj(singleobj)` for every non-tethered thrown object.
- `nethack-c/upstream/src/mthrowu.c:531` through `:549`: `u_catch_thrown_obj()` requires sight, no confusion/stun/fumbling, non-venom object, hands, a free hand, non-overloaded capacity, and a successful `rn2(catch_chance)` roll; success calls `hold_another_object()`.
- `nethack-c/upstream/src/mthrowu.c:722` through `:742`: only after catch fails does a dart compute weapon damage and call `thitu()`.
- `nethack-c/upstream/src/mthrowu.c:787`: only uncaught delivery reaches `drop_throw(singleobj, hitu, u.ux, u.uy)`.

## JS Changes

- `js/allmain.js`
  - Added the generic catch gate to the production kobold-family dart hero-delivery branch before dart damage and hit-roll handling, replacing the stale local `rn2(90)` with the C catch roll.
  - Reused `heroCanAttemptThrownObjectCatch()` and `holdCaughtThrownObject()` so caught darts follow the same inventory merge/new-letter/full-inventory drop behavior as other monster-thrown objects.
  - Preserved audit-794 visible throw More handling by queueing `You catch the dart!` after the visible `throws a dart!` boundary.
- `test/shop-billing-helpers.test.mjs`
  - Extended `runMonsterDartHitLanding()` with a `heroDex` parameter for deterministic catch canaries.
  - Added `production visible kobold dart catch retains split dart in inventory`.
  - Updated the visible dart hit canary for the newly source-shaped catch-fail RNG before hit damage.

## Tests

- `production visible kobold dart catch retains split dart in inventory`
- Existing production kobold dart hit, visible hit ordering, stack split, kobold-family selection, intervening, and iron-bars canaries.

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- Focused `node --test --test-reporter=spec --test-name-pattern "production .*kobold dart" test/shop-billing-helpers.test.mjs` - pass
- Focused adjacent catch/public replay checks - pass:
  - `node --test --test-reporter=dot --test-name-pattern "production .*kobold dart|production monster (sling .* catch|potion catch|spear catch|shuriken catch|plain dagger catch|knife catch|crude dagger catch)" test/shop-billing-helpers.test.mjs`
  - `node frozen/ps_test_runner.mjs sessions/seed0106-priest-extcmd-sweep.session.json`
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Production dart delivery still lacks broader C `m_throw()` fidelity for cursed/greased misfire, full `thitu()` AC/range/bigmon/`Maybe_Half_Phys()` details, poison side effects, and more passive-object variants. Keep those as separate source-backed slices.
