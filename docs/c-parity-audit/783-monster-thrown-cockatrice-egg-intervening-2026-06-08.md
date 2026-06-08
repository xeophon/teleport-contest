# C Parity Audit 783: Monster-Thrown Cockatrice Egg Intervening Hit

Implemented the production monster-thrown petrifying egg path for intervening monster hits. No replay maps, private fixtures, or seed-specific production logic were used.

## Source Anchors

- `nethack-c/upstream/src/weapon.c:484` through `:490`: `oselect()` rejects non-petrifying eggs and unsafe objects.
- `nethack-c/upstream/src/weapon.c:542` through `:547`: `select_rwep()` tries `EGG` first, before Kop pies, boulders, polearms, aklys, and ordinary ranged weapons.
- `nethack-c/upstream/src/mthrowu.c:262` through `:300`: `monshoot()` prints the throw message and routes the selected object into `m_throw()`.
- `nethack-c/upstream/src/mthrowu.c:673` through `:685`: `m_throw()` advances square-by-square and calls `ohitmon()` for an intervening monster before hero delivery.
- `nethack-c/upstream/src/mthrowu.c:340` through `:350`: intervening monster hits use `5 + find_mac() + omon_adj(...)` against `rnd(20)`.
- `nethack-c/upstream/src/mthrowu.c:383` through `:400`: egg hits use the `Splat!` wording, with known-species egg names when available.
- `nethack-c/upstream/src/mthrowu.c:444` through `:447`: petrifying eggs call monster stoning before ordinary damage subtraction.
- `nethack-c/upstream/src/mthrowu.c:170` through `:178`: `drop_throw()` deletes `ohit && EGG` objects before floor placement, floor effects, stacking, or passive-object handling.
- `nethack-c/upstream/src/mthrowu.c:705` through `:716` and `:779` through `:789`: hero delivery accepts only petrifying eggs, uses `thitu(8, 0)`, starts hero stoning on hit, and deletes the hit egg.

## JS Changes

- `js/allmain.js`
  - Adds a petrifying-egg selector for monster ranged-weapon turns, excluding ordinary eggs and preserving C's `EGG` priority before boulders and Kop cream pies.
  - Adds a monster-thrown egg branch that scans for intervening monsters before hero catch or hit handling.
  - On an intervening hit, reveals mimics, wakes the target, emits the C `Splat!` hit line, applies no-hero-credit stoning, and deletes the hit egg via `landMonsterThrownObject(..., ohit: true)`.
  - Adds hero hit/catch handling for the same production branch, including `thitu(8, 0)`-style hit threshold, catch allowance, hit-only egg deletion, and hero stoning timeout setup.
- `test/shop-billing-helpers.test.mjs`
  - Adds a production monster-thrown petrifying egg helper.
  - Adds an intervening-goblin canary that verifies the throw message, `Splat!` hit message, stoning message, statue placement, no hero stoning, and hit-only egg deletion.

## Tests

- `production monster cockatrice egg petrifies intervening monster before hero`

## Verification

- `node --check js/allmain.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-name-pattern "production monster cockatrice|monster-thrown egg|deferred monster-thrown.*egg|Kop cream pie hits intervening" test/shop-billing-helpers.test.mjs` - 6 pass, 2766 skipped
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Monster-thrown egg terrain-stop, hero catch/hit, and miss branches have only implementation support in this slice; add focused tests when those edge cases become the active source-backed target.
- Broader generic monster object-hit factoring should wait until another concrete production special-object path needs it.
