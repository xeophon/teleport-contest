# Fatal Lava Inventory Obj Resists

Date: 2026-06-09

## C Reference

- `nethack-c/upstream/src/trap.c:6818` through `nethack-c/upstream/src/trap.c:6848` premarks fatal-lava carried inventory before any player-facing lava messages.
- `nethack-c/upstream/src/trap.c:6842` through `nethack-c/upstream/src/trap.c:6847` only reaches `obj_resists(obj, 0, 0)` for organic objects or potions that are not erosion-proof, do not confer fire resistance, and are not scrolls of fire or spellbooks of fireball.
- `nethack-c/upstream/src/zap.c:1458` through `nethack-c/upstream/src/zap.c:1472` makes `obj_resists(obj, 0, 0)` preserve the Amulet of Yendor, invocation items, and Rider corpses without RNG; ordinary and artifact objects consume `rn2(100)` but cannot resist because both chances are zero.
- `nethack-c/upstream/src/trap.c:6888` through `nethack-c/upstream/src/trap.c:6918` deletes premarked fatal-lava inventory before the fatal burn line, while protected objects remain carried.

## JS Parity Slice

- Added `lavaFatalInventoryObjResists()` for the carried fatal-lava premark pass.
- Reordered `lavaFatalInventoryBurnSelection()` to match the C gate: candidate organic/potion first, fire/fireball/fire-resistance exemptions second, then `obj_resists(0,0)`.
- Ordinary carried organic/potion candidates now consume one `rn2(100)` each before being selected for fatal lava destruction.
- Hard `obj_resists()` objects, including Rider corpses, are preserved without consuming RNG.
- Split fatal carried-lava organic material matching from direct lava material matching. Direct lava still burns bone material where the JS floor helper already modeled it, but carried fatal-lava inventory treats bone horns as non-organic to match C's `is_organic()` material order.
- Kept floor-lava `lavaObjectProtectedByObjResists()` unchanged because it has Book-of-the-Dead feedback behavior specific to floor object fire damage.

## Tests

- `m-prefix fatal lava consumes obj_resists rng only for ordinary burn candidates`
- `m-prefix fatal lava preserves rider corpse without obj_resists rng`
- `m-prefix fatal lava preserves invocation objects without obj_resists rng`
- `m-prefix fatal lava treats bone horns as non-organic but burns wooden harp`
- Updated `m-prefix fatal lava consumes life saving and teleports to safety` seed to account for the new C-order `rn2(100)` calls before amulet consumption and safe teleport.

Verification:

```sh
node --test --test-reporter=dot --test-name-pattern "m-prefix fatal lava consumes obj_resists rng only for ordinary burn candidates|m-prefix fatal lava preserves rider corpse without obj_resists rng|m-prefix fatal lava preserves invocation objects without obj_resists rng|m-prefix fatal lava treats bone horns as non-organic but burns wooden harp|m-prefix fatal lava consumes life saving and teleports to safety" test/shop-billing-helpers.test.mjs
node --test --test-reporter=dot --test-name-pattern "lava|LAVA" test/shop-billing-helpers.test.mjs
git diff --check
node --test --test-reporter=dot test/shop-billing-helpers.test.mjs
```

Result: focused fatal-lava inventory set passed; broader lava-name slice passed; `git diff --check` passed; full `test/shop-billing-helpers.test.mjs` passed.

## Remaining Gaps

- Failed `safe_teleds()` countermeasures after repeated lava rescue are not modeled.
- Direct fatal lava rescue still uses the shared same-level teleport helper rather than modeling C's suppressed landing `spoteffects(TRUE)` followed by manual `spoteffects(FALSE)` in detail.
- Generic `fireDamageInventory()` still lacks C's fire inventory resistance chance.
- Generic `fireDamageInventory()` still uses full selected `in_use` stack quantity instead of subtracting one first.
- Potion vapor effects still happen before the destruction message in the JS generic helper.
- The Book of the Dead survives fatal carried lava, but the survivor-only dark-red glow feedback line is not modeled yet.
