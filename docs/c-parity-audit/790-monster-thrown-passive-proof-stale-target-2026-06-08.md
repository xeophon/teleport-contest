# C Parity Audit 790: Monster-Thrown Passive Proof and Stale Target Cleanup

Implemented a narrow monster-thrown passive-object landing cleanup. Visible proofed floor objects now report the C `erode_obj()` protection feedback, and lethal intervening hits no longer apply passive erosion through a stale target reference after the target has been removed. No replay maps, private fixtures, or seed-specific production logic were used.

## Source Anchors

- `nethack-c/upstream/src/mthrowu.c:162` through `:190`: `drop_throw()` handles hit-only breakage, down-gate shipping, floor effects, placement, optional passive-object follow-up, and stacking in that order.
- `nethack-c/upstream/src/mthrowu.c:397` through `:494`: intervening monster hits resolve damage/death before calling `drop_throw(obj, 1, bhitpos.x, bhitpos.y)`.
- `nethack-c/upstream/src/mthrowu.c:183` and `:188`: `drop_throw()` resolves `mtmp = m_at(x, y)` and calls `passive_obj(mtmp, obj, NULL)` only when a live monster is actually present on the landing square and `ohit` is true.
- `nethack-c/upstream/src/uhitm.c:6127` through `:6195`: `passive_obj()` selects the passive `AT_NONE` attack and routes rust, corrosion, fire, acid, and disenchantment object follow-ups.
- `nethack-c/upstream/src/trap.c:246` through `:275`: `erode_obj()` silently returns for grease or known proof, but for visible proofed objects with verbose feedback it prints `Somehow, the <object> is not affected by the <oxidation/corrosion/heat>` and sets `rknown`.

## JS Changes

- `js/cmd.js`
  - Added `liveMonsterThrownPassiveTarget()` so caller-provided passive targets are revalidated against the landing square before passive-object handling. Dead, zero-HP, or off-square stale targets are ignored and the landing square is rechecked.
  - Added the C `bythe` terms for monster-thrown passive-object erosion: oxidation, corrosion, and heat.
  - Added visible proofed floor-object feedback before setting `rknown`, while preserving silent known-proof, grease, non-vulnerable, and blessed avoidance behavior.
- `test/shop-billing-helpers.test.mjs`
  - Added a production proofed-dagger/rust-monster canary that checks the visible protection message, unchanged erosion, and `rknown` reveal before stacking.
  - Added a production lethal rust-monster canary that verifies the dead target is removed before landing and no stale passive rust mutates the landed dagger.

## Tests

- `production monster plain dagger hit reveals rustproof passive object protection before stacking`
- `production monster plain dagger lethal rust monster hit skips stale passive rust before landing`

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-reporter=dot --test-name-pattern "production monster plain dagger (hit reveals rustproof passive object protection|lethal rust monster hit skips stale passive rust)" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot --test-name-pattern "production monster plain dagger (hits and rusts intervening rust monster object before stacking|hit reveals rustproof passive object protection before stacking|lethal rust monster hit skips stale passive rust before landing|big polyself hit corrodes landing object before stacking|lethal intervening hit cleans monster before landing)" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Broader production coverage for monster-thrown `AD_FIRE`, `AD_ACID`, and `AD_CORR` passive-object erosion remains a separate source-backed projectile slice.
