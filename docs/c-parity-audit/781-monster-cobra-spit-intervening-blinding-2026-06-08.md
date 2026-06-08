# C Parity Audit 781: Monster Cobra Spit Intervening Blinding

Implemented the cobra blinding-venom `m_throw()` intervening-monster branch. No replay maps, private fixtures, or seed-specific production logic were used.

## Source Anchors

- `nethack-c/upstream/src/mthrowu.c:1027`: cobra `AD_BLND` spit creates `BLINDING_VENOM`.
- `nethack-c/upstream/src/mthrowu.c:1048`: visible cobra spit prints the venom message, then routes through `m_throw()`.
- `nethack-c/upstream/src/mthrowu.c:673` through `:685`: `m_throw()` advances square-by-square and calls `ohitmon()` for an intervening monster before hero delivery.
- `nethack-c/upstream/src/mthrowu.c:340` through `:350`: accidental intervening hits use `5 + find_mac() + omon_adj(...)` against `rnd(20)`.
- `nethack-c/upstream/src/mthrowu.c:380` through `:401`: confirmed non-potion hits reveal mimics, wake the target, and print the hit message before object-specific fallout.
- `nethack-c/upstream/src/mthrowu.c:468` through `:489`: blinding venom calls `can_blnd()` with `AT_SPIT`, prints the shortened visible blindness message, clears `mcansee`, and adds `rnd(25) + 20` to `mblinded`, capped at 127.
- `nethack-c/upstream/src/mthrowu.c:170` through `:195`: venom is deleted by `drop_throw()` on contact instead of landing, shipping, running floor effects, or stacking.

## JS Changes

- `js/allmain.js`
  - Constructs a concrete blinding-venom splash for cobra spit instead of using a hero-only placeholder path.
  - Scans the cobra flight line for intervening monsters before the hero hit check while preserving the no-intervening flight `rn2(5)` sequence.
  - On an intervening hit, reveals mimics, wakes the target, prints the hit message, applies C-style monster blindness, and calls `landMonsterThrownObject(..., ohit: true)` so the venom is consumed.
  - Generalizes the existing monster thrown-object blindness helper while preserving the cream-pie wrapper names.
- `test/shop-billing-helpers.test.mjs`
  - Lets the cobra spit production helper inject extra monsters.
  - Adds a production test where an intervening goblin is hit and blinded before the venom can reach the hero.

## Tests

- `automatic hostile cobra spit blinds intervening monster before hero`

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-name-pattern "cobra spit" test/shop-billing-helpers.test.mjs` - 4 pass, 2763 skipped
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Eggs remain a separate `ohitmon()` special-object slice; monster acid-spit venom is covered in audit 782.
- Broader generic monster object-hit factoring should wait until another concrete production special-object path needs it.
