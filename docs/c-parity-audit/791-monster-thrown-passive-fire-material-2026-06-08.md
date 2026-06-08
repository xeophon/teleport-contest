# C Parity Audit 791: Monster-Thrown Passive Fire Material

Implemented a narrow monster-thrown passive-object erosion cleanup for material-backed fire damage. Unidentified wooden spear appearances now burn as C wooden objects instead of being inferred as iron-like by their broad spear wording, and visible floor-object erosion feedback can use the object's appearance name when the canonical kind is not available. No replay maps, private fixtures, or seed-specific production logic were used.

## Source Anchors

- `nethack-c/upstream/src/mthrowu.c:162` through `:190`: `drop_throw()` deletes broken/mulched projectiles, runs down-gate and floor effects, places the object, applies `passive_obj()` when `ohit` is true, then stacks.
- `nethack-c/upstream/src/mthrowu.c:397` through `:494`: monster projectile hit feedback and damage resolve before `drop_throw(obj, 1, bhitpos.x, bhitpos.y)`.
- `nethack-c/upstream/src/uhitm.c:6157` through `:6162`: `AD_FIRE` passive object erosion uses a 1-in-6 gate, checks cancellation, excludes steam vortex, and calls `erode_obj(..., ERODE_BURN, EF_NONE)`.
- `nethack-c/upstream/src/trap.c:240` through `:287`: floor-object `erode_obj()` naming falls back to `cxname(otmp)` and visible burn feedback prints `The <object> smoulders!` before incrementing primary erosion.
- `nethack-c/upstream/include/objclass.h:12` through `:31`, `:200` through `:207`, and `nethack-c/upstream/src/mkobj.c:2269` through `:2285`: material controls erosion predicates; `IRON` rusts, `IRON`/`COPPER` corrode, and fire vulnerability is material `<= WOOD` except liquid, plus plastic.
- `nethack-c/upstream/include/objects.h:153` through `:178`: `ya`/`bamboo arrow` is generic `METAL`, while `elven spear`/`runed spear` is `WOOD`.

## JS Changes

- `js/cmd.js`
  - Taught `wishedDamageProfile()` to prefer explicit `material`/`oc_material` metadata before falling back to name heuristics.
  - Removed `ya`/`bamboo arrow` from inferred rust-prone projectiles and removed bone from the C-shaped fire material set.
  - Added an appearance fallback for anonymous floor-object base names so visible erosion feedback can say `runed spear` instead of `object`.
- `test/shop-billing-helpers.test.mjs`
  - Added a production monster-thrown runed-spear/red-mold canary that verifies `AD_FIRE` burns the landed wooden projectile before stacking and leaves the pre-existing clean stack unchanged.

## Tests

- `production monster runed spear hit can smoulder from intervening red mold before stacking`

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-reporter=dot --test-name-pattern "production monster (spear hits and rusts intervening rust monster object before stacking|runed spear hit can smoulder from intervening red mold before stacking|runed spear hit uses elven spear damage from appearance|silver and elven spear selection follows C ranged order)" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Add production `AD_ACID` and `AD_CORR` canaries for dagger/spear corrosion before stacking, including the `AD_ACID` 1-in-6 gate and `AD_CORR` no-gate path.
- Add production `AD_ENCH` drain-before-stack coverage for monster-thrown weapons into disenchanters.
- Visible hero-hit monster-thrown landings still need a separate ordering slice where deferred hero damage should resolve before passive-object landing RNG.
