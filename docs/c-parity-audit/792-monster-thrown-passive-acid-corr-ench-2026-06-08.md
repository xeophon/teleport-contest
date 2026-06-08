# C Parity Audit 792: Monster-Thrown Passive Acid, Corrosion, and Drain

Added production canaries for the remaining monster-thrown passive-object landing follow-ups after audit 791, and tightened monster-thrown floor stacking for C `mergable()` grease/proof flags. The runtime already routes these landings through `drop_throw()`-shaped passive handling before stacking; this slice locks down corrodeable `AD_ACID`, ungated `AD_CORR`, `AD_ENCH` drain-before-stack behavior, and mixed grease/proof no-merge behavior without replay maps, private fixtures, or seed-specific production logic.

## Source Anchors

- `nethack-c/upstream/src/mthrowu.c:162` through `:190`: `drop_throw()` deletes contact-broken or mulched projectiles, handles down-gate and floor effects, places the object, applies `passive_obj()` only when `ohit` is true, then calls `stackobj()`.
- `nethack-c/upstream/src/mthrowu.c:370` through `:494`: monster projectile hits resolve hit text, damage, death cleanup, and anger before calling `drop_throw(otmp, 1, ...)` on the hit square.
- `nethack-c/upstream/src/uhitm.c:6145` through `:6177`: `passive_obj()` finds the target monster's `AT_NONE` passive attack; `AD_ACID` uses a 1-in-6 gate without a cancellation check, while `AD_CORR` has no RNG gate and skips only for cancelled monsters.
- `nethack-c/upstream/src/uhitm.c:6179` through `:6184` and `nethack-c/upstream/src/zap.c:1382` through `:1401`: `AD_ENCH` calls `drain_item(obj, TRUE)`, which resists via `obj_resists(obj, 10, 90)` and decrements positive `spe` when successful.
- `nethack-c/upstream/src/trap.c:221` through `:295`: `ERODE_CORRODE` uses secondary erosion, checks grease before material/proof/max erosion, prints visible floor-object feedback, and increments `oeroded2`; passive calls do not request destruction.
- `nethack-c/upstream/src/invent.c:4416` through `:4435`: `mergable()` rejects different `spe`, `oeroded`, `oeroded2`, `greased`, and, for erosion-relevant objects, `oerodeproof`; it also rejects mismatched proof knowledge while blind or hallucinating.
- `nethack-c/upstream/include/objclass.h:200` through `:207`: iron rusts, and iron or copper corrodes.
- `nethack-c/upstream/include/objects.h:174` through `:190` and `:200`: ordinary spears, javelins, and daggers are iron; silver and wooden variants do not qualify for corrosion.

## JS Changes

- `js/cmd.js`
  - Updated `sameMonsterThrownStackObject()` so monster-thrown landings no longer merge with clean stacks when `greased`, `oerodeproof`, `rustproof`, or blind/hallucinating `rknown` state differs for erosion-relevant objects.
- `test/shop-billing-helpers.test.mjs`
  - Added a production acid-blob canary where a monster-thrown plain dagger hits a surviving `AD_ACID` target, passes the 1-in-6 gate, corrodes to `oeroded2 == 1`, and remains separate from a clean stack.
  - Added the negative `AD_ACID` gate canary where the same hit consumes a nonzero `rn2(6)` and the unchanged dagger stacks into the clean floor stack.
  - Added a greased-dagger negative `AD_ACID` gate canary proving a greased unchanged projectile does not merge into a clean stack.
  - Added a production black-pudding `AD_CORR` canary proving corrosion before stacking with no `rn2(6)` gate.
  - Added a proofed-dagger `AD_CORR` canary proving visible proof feedback, `rknown` reveal, unchanged erosion, and no clean-stack merge.
  - Added a production disenchanter `AD_ENCH` canary proving an enchanted dagger drains from `spe:2` to `spe:1` and then stacks with a clean `spe:1` dagger.

## Tests

- `production monster plain dagger acid hit can corrode before stacking`
- `production monster plain dagger acid miss gate stacks unchanged object`
- `production monster greased dagger acid miss gate does not merge clean stack`
- `production monster plain dagger corrosion hit has no acid gate before stacking`
- `production monster proofed dagger corrosion reveals proof and does not merge clean stack`
- `production monster enchanted dagger drain can stack after disenchanter hit`

## Verification

- `node --check js/cmd.js` - pass
- `node --check test/shop-billing-helpers.test.mjs` - pass
- `git diff --check` - pass
- `node --test --test-reporter=dot --test-name-pattern "production monster (plain dagger (acid hit can corrode before stacking|acid miss gate stacks unchanged object|greased dagger acid miss gate does not merge clean stack|corrosion hit has no acid gate before stacking|proofed dagger corrosion reveals proof and does not merge clean stack)|enchanted dagger drain can stack after disenchanter hit|runed spear hit can smoulder)" test/shop-billing-helpers.test.mjs` - pass
- `node --test --test-reporter=dot test/*.mjs` - pass
- `npm run score` - 44/44 passing

## Remaining Gaps

- Visible hero-hit monster-thrown landings still need a separate ordering slice where deferred hero damage/exercise resolve before passive-object landing RNG.
- Greased floor-object passive corrosion still needs a production canary for grease protection and possible grease dissolution when erosion is attempted.
