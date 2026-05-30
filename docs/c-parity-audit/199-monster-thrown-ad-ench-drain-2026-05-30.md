# C Parity Audit 199: Monster-Thrown AD_ENCH Drain

## Sources

- `nethack-c/upstream/include/monsters.h`: disenchanters have passive `AT_NONE/AD_ENCH`.
- `nethack-c/upstream/src/mthrowu.c:170-189`: `drop_throw()` breaks hit-only eggs/missiles, ships, runs floor effects, places the object, applies `passive_obj()` only when `ohit`, then stacks.
- `nethack-c/upstream/src/uhitm.c:6127-6184`: `passive_obj()` finds passive attacks and calls `drain_item(obj, TRUE)` for uncancelled `AD_ENCH`.
- `nethack-c/upstream/src/zap.c:1382-1409`: `drain_item()` requires positive `spe` on charged/weapon/armor/weptool objects, skips drain-defense and `obj_resists(obj, 10, 90)`, bills `COST_DRAIN`, then decrements `spe`.
- `nethack-c/upstream/src/zap.c:1458-1472`: `obj_resists()` consumes `rn2(100)` for ordinary/artifact objects unless a hard special object always resists.

## JS Changes

- Added a shared `drainItem()` primitive with C-shaped eligibility, drain-defense/special-object resistance, ordinary/artifact `rn2(100)` resistance, `spe--`, wand charge sync, inventory refresh, and costly-alteration billing.
- Added `disenchanter` to passive-object fallback lookup.
- Replaced the old monster-thrown `AD_ENCH` no-op with `drainItem()` when `ohit` is true and the target is not cancelled.
- Broadened `costlyAlterationPaymentMessage()` to use existing floor-object dummy alteration billing for floor objects as well as carried objects.

## Tests

Added focused synthetic coverage in `test/shop-billing-helpers.test.mjs`:

- Monster-thrown enchanted dagger hit drains on a disenchanter before stacking.
- Post-drain `spe` can make the landing stack with a `+1` pile.
- Missed throws skip drain and skip `rn2(100)`.
- Cancelled disenchanter skips drain/RNG.
- Ordinary resistance preserves `spe` and stacks with the original pile.
- Shop-floor drain creates a used-up dummy bill before mutation and marks the live landing no-charge.

## Remaining Gaps

- Direct hero melee/wielded-object `AD_ENCH` is still open.
- Hero/polyself target passive-object handling for monster-thrown landings is still open.
- Production dart hit landing and launcher-arrow landing are still open.
- Broader floor costly-alteration consolidation remains incomplete outside covered callers.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot --test-name-pattern 'monster-thrown enchanted dagger|monster-thrown dagger (hit applies rust|miss skips rust)' test/shop-billing-helpers.test.mjs`
