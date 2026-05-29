# 142 - Metallivorous non-food #eat and refreshed adjacent gaps

## Implemented Slice

### Carried and floor non-food metal eating

Metallivorous hero forms can now select and eat metallic non-food objects from inventory and from the hero square. The slice covers ordinary `doeat_nonfood()` consumption, rust monster iron-only gating, rustproof iron spit-out behavior, and shared material classification with monster metallivores.

C anchors:

- `is_edible()` lets metallivores eat metallic objects, rejects unique objects, and restricts rust monsters to rustprone iron: `nethack-c/upstream/src/eat.c:91`, `nethack-c/upstream/src/eat.c:104`.
- `eat_ok()` advertises edible non-food metal candidates through the `#eat` object picker: `nethack-c/upstream/src/eat.c:3517`.
- `doeat()` blocks worn armor/tools/amulets/saddles but still lets rings proceed, then handles rustproof iron before ordinary non-food eating: `nethack-c/upstream/src/eat.c:2868`, `nethack-c/upstream/src/eat.c:2876`.
- Rust monster rustproof iron strips proofing, marks it known, stuns by `rn2(10)`, and spits/drops the object without nutrition: `nethack-c/upstream/src/eat.c:2883`, `nethack-c/upstream/src/eat.c:2901`.
- Slow digestion rings are edible candidates but are not consumed: `nethack-c/upstream/src/eat.c:2911`.
- `doeat_nonfood()` is a one-turn meal, computes nutrition from coins, ball/chain weight, or object nutrition/weight, and emits the C delicious/poison wording before `eatspecial()`: `nethack-c/upstream/src/eat.c:2734`, `nethack-c/upstream/src/eat.c:2751`, `nethack-c/upstream/src/eat.c:2791`.

JS changes:

- Added `js/metallivore.js` as a shared material classifier for rings, wands, tools, weapons, armor, amulets, coins, and invocation/unique exclusions. Monster floor-eating now imports this helper instead of carrying its own copy: `js/metallivore.js`, `js/allmain.js:24`, `js/allmain.js:2084`.
- `#eat` inventory prompts now include non-food metal candidates for metallivorous forms, and the command consumes them through a C-shaped one-turn path: `js/cmd.js:7456`, `js/cmd.js:18725`, `js/cmd.js:18802`, `js/cmd.js:51608`.
- The floor `#eat` prompt can target non-food metal at the hero square and routes through the same helper: `js/cmd.js:53343`, `js/cmd.js:51708`.
- Rust monster polyself rejects non-iron metal, strips rustproof iron, rolls `rn2(10)`, leaves hunger unchanged, and spits the stripped object onto the floor for carried items: `js/cmd.js:18728`, `js/cmd.js:18811`.

Tests:

- Carried non-food metal appears in the eat prompt and gives dagger-weight nutrition: `test/shop-billing-helpers.test.mjs:8704`.
- Non-metallivores and rust monster non-iron metal do not advertise the object: `test/shop-billing-helpers.test.mjs:8723`, `test/shop-billing-helpers.test.mjs:8736`.
- Rustproof carried iron is stripped and spit onto the floor without nutrition: `test/shop-billing-helpers.test.mjs:8749`.
- Floor non-food metal can be eaten from the hero square: `test/shop-billing-helpers.test.mjs:8773`.

## Fresh Deferred Findings

- Burning-oil shop-door damage/repair is still open. C records real shop entrance door damage with `SHOP_DOOR_COST`, delays repair by `REPAIR_DELAY`, and repairs from shopkeeper movement (`nethack-c/upstream/src/zap.c:5411`, `nethack-c/upstream/src/zap.c:5465`, `nethack-c/upstream/src/shk.c:4398`, `nethack-c/upstream/src/shk.c:4800`, `nethack-c/upstream/src/shk.c:4892`). JS still burns/reveals door terrain without shop damage records or repair.
- Hero-thrown and kicked down-gates through down stairs, down ladders, and branch/special stairs remain missing. C `down_gate()`/`ship_object()` includes ladder no-drop exceptions and source-level metadata for matching destination stair delivery (`nethack-c/upstream/src/dokick.c:1638`, `nethack-c/upstream/src/dokick.c:1743`, `nethack-c/upstream/src/dokick.c:1941`, `nethack-c/upstream/src/dokick.c:1802`). JS currently ships seen holes/trapdoors and delivers migrations randomly.
- Directed doppelganger/cant-revive statue animation remains missing. C maps unrevivable unique/no-traits corpstat targets to doppelgangers and directs `newcham()` into the original statue form (`nethack-c/upstream/src/read.c:3112`, `nethack-c/upstream/src/trap.c:746`, `nethack-c/upstream/src/trap.c:781`). JS still defers or direct-animates these rows.
- Monster-thrown `drop_throw(ohit)` still needs hit-state propagation, hit-only egg deletion, `should_mulch_missile()` survival/deletion, passive object effects, and better target-square semantics (`nethack-c/upstream/src/mthrowu.c:162`, `nethack-c/upstream/src/mthrowu.c:494`, `nethack-c/upstream/src/mthrowu.c:789`, `nethack-c/upstream/src/dothrow.c:1976`).
- Full hero metal accessory effects are deferred. This slice handles slow digestion's indigestible branch and ordinary removal/nutrition, but broader `eatspecial()`/accessory side effects for eaten rings and amulets still need a dedicated source-backed pass.

## Verification

- `node --check js/metallivore.js && node --check js/allmain.js && node --check js/cmd.js`
- `node --test --test-name-pattern "non-food metal|non-metallivores|rust monster polyself|rustproof carried" test/shop-billing-helpers.test.mjs` - 5 pass, 920 skipped.
- `node --test test/*.mjs` - 1006 pass.
- `npm run score` - 44/44 pass.
