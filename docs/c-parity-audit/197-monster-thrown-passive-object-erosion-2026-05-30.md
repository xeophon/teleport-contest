# Monster-Thrown Passive Object Erosion

Date: 2026-05-30

## C Source

- `drop_throw()` captures a monster on the landing square before floor effects, places surviving objects, applies hit-only `passive_obj()`, then stacks: `nethack-c/upstream/src/mthrowu.c:180`, `nethack-c/upstream/src/mthrowu.c:184`, `nethack-c/upstream/src/mthrowu.c:188`, `nethack-c/upstream/src/mthrowu.c:190`.
- `passive_obj()` finds the first `AT_NONE` passive attack when no attack is supplied: `nethack-c/upstream/src/uhitm.c:6145`.
- Object passive erosion covers `AD_FIRE`, `AD_ACID`, `AD_RUST`, `AD_CORR`, and `AD_ENCH`: `nethack-c/upstream/src/uhitm.c:6157`.
- `erode_obj()` handles grease, proofing, blessed resistance, messages, and primary/secondary erosion counters: `nethack-c/upstream/src/trap.c:171`, `nethack-c/upstream/src/trap.c:237`, `nethack-c/upstream/src/trap.c:281`.

## JS Gap

- `landMonsterThrownObject()` already modeled hit-only egg deletion and missile mulch, but surviving hit objects landed and stacked without checking a passive monster target.
- This let clean missiles merge into clean floor stacks on a rust monster square where C first mutates the landing object, preventing that merge.

## Implemented

- Added a monster-target passive object step after floor effects and before stack merging.
- Covered the object erosion subset for monster targets: fire, acid, rust, and corrosion.
- Used explicit `AT_NONE`/passive attack metadata when present, with narrow name fallbacks for currently modeled monsters whose generated JS data lacks passive attack rows.
- Preserved C ordering for hit-only activation, post-floor-effect placement, pre-stack mutation, monster cancellation for fire/rust/corrosion, `rn2(6)` fire/acid chances, grease checks, proof discovery, and blessed `rnl(4)` resistance.

## Tests

- Added `monster-thrown dagger hit applies rust monster passive object erosion before stacking`.
- Added `monster-thrown dagger miss skips rust monster passive object erosion and stacks`.

## Remaining Gaps

- Production monster projectile callers still need true `ohit` threading into every hit path.
- Hero/polyself target passive object effects are still open.
- `AD_ENCH`/`drain_item()` for disenchanters is recognized but not implemented.
- Full monster attack metadata should come from the object/monster registry rather than local passive name fallbacks.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern 'monster-thrown (egg|dart|dagger|cream pie|venom)' test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs`
- `npm run score`
