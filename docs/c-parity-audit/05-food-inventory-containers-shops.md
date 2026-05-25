# 05 Food, Inventory, Containers, Shops C Parity Audit

This audit is based only on upstream C and current JS source inspection. It does not infer private-suite expectations.

## Scope

- `eat.c` food, corpse, glob, and tin behavior.
- Inventory pickup/drop, including lift limits, split/merge, and object loss paths.
- Container loot, put-in, take-out, stash, and tip flows.
- Shop billing, unpaid state, shop credit/debit, and object cost side effects.

## Upstream C Reference Map

### Eating

- `nethack-c/upstream/src/eat.c:244-288`: choking and gluttony death path.
- `nethack-c/upstream/src/eat.c:321-388`: object nutrition and `touchfood()` stack split, `oeaten`, and `costly_alteration(COST_BITE)`.
- `nethack-c/upstream/src/eat.c:519-573`: `eatfood()` occupation tick and `done_eating()` cleanup/effects.
- `nethack-c/upstream/src/eat.c:756-864`: `cprefx()` corpse pre-effects, cannibalism, stoning/sliming, Rider handling.
- `nethack-c/upstream/src/eat.c:1127-1328`: `cpostfx()` corpse post-effects and intrinsics.
- `nethack-c/upstream/src/eat.c:1386-1402`: `costly_tin()` shop charging for tins.
- `nethack-c/upstream/src/eat.c:1427-1512`: tin naming and variety selection.
- `nethack-c/upstream/src/eat.c:1527-1699`: `consume_tin()` trap, empty, smell prompt, corpse effects, conduct, nutrition, and use-up order.
- `nethack-c/upstream/src/eat.c:1701-1796`: `opentin()` and `start_tin()` occupation timing.
- `nethack-c/upstream/src/eat.c:1811-2007`: rotten food and `eatcorpse()` age, poison, sickness, timing, and first-bite behavior.
- `nethack-c/upstream/src/eat.c:2022-2074`: `start_eating()` initial bite and occupation setup.
- `nethack-c/upstream/src/eat.c:2508-2600`: `fpostfx()` non-corpse food effects.
- `nethack-c/upstream/src/eat.c:2627-2722`: edibility prompts.
- `nethack-c/upstream/src/eat.c:2817-3082`: `doeat()` command flow and victual timing/nutrition setup.
- `nethack-c/upstream/src/eat.c:3136-3154`: per-turn bite nutrition, choking check, and `oeaten` consumption.
- `nethack-c/upstream/src/eat.c:3289-3330`: `lesshungry()` saturation, choke, and full-warning handling.

### Pickup, Drop, Containers, Tip

- `nethack-c/upstream/src/pickup.c:672-907`: top-level pickup flow, pickup menus, autopickup, and object selection.
- `nethack-c/upstream/src/pickup.c:1571-1795`: `carry_count()` and `lift_object()` partial lifting, burden prompts, slots, boulders, loadstones, and special failures.
- `nethack-c/upstream/src/pickup.c:1802-1942`: `pickup_object()` and `pick_obj()`, including artifact touch, fatal/Rider corpses, scare monster scrolls, `addtobill()`, `addinv()`, and stolen value.
- `nethack-c/upstream/src/pickup.c:2022-2162`: container lookup, loot reachability, locked containers, bag of tricks bite, and `use_container()`.
- `nethack-c/upstream/src/pickup.c:2164-2345`: `doloot()`/`doloot_core()` direction, capacity, confusion/reverse-loot, multiple containers, saddles, and blind cockatrice touch.
- `nethack-c/upstream/src/pickup.c:2558-2777`: `in_container()` and `out_container()` object rejection, shop `sellobj()`, icebox, magic bag explosion, `addtobill()`, and inventory insertion.
- `nethack-c/upstream/src/pickup.c:2972-3224`: `use_container()` prompt, trap handling, BoH content loss, look-inside turn cost, and action sequencing.
- `nethack-c/upstream/src/pickup.c:3228-3394`: traditional/menu loot item selection.
- `nethack-c/upstream/src/pickup.c:3479-3677`: `dotip()` source selection, capacity checks, horn/bag special sources, and floor precedence.
- `nethack-c/upstream/src/pickup.c:3687-4055`: `tipcontainer()` target selection, tip checks, cursed BoH loss, shop billing, and item placement.
- `nethack-c/upstream/src/do.c:27-43`: deliberate drop shop state.
- `nethack-c/upstream/src/do.c:760-843`: `dropx()`, `dropy()`, `dropz()`, floor effects, `sellobj()`, and `stackobj()`.
- `nethack-c/upstream/src/invent.c:1200-1346`: `hold_another_object()`, `useup()`, and `check_unpaid`.
- `nethack-c/upstream/src/invent.c:4363-4460`: bill-aware stack merging rules.

### Shop Billing

- `nethack-c/upstream/src/shk.c:1135-1266`: `onbill()`, `is_unpaid()`, and `obfree()` bill invariants and used-up/merge handling.
- `nethack-c/upstream/src/shk.c:1542-1660`: itemized bills, including unpaid contents and known/unknown containers.
- `nethack-c/upstream/src/shk.c:2111-2410`: paying bills and `buy_container()`.
- `nethack-c/upstream/src/shk.c:2805-3098`: shop item cost, pricing units, contained cost, dropped/picked container `no_charge`.
- `nethack-c/upstream/src/shk.c:3195-3305`: `gem_learned()`, `alter_cost()`, and `unpaid_cost()`.
- `nethack-c/upstream/src/shk.c:3307-3710`: `addtobill()`, `splitbill()`, and `subfrombill()`.
- `nethack-c/upstream/src/shk.c:3712-3828`: stolen container/value recursion.
- `nethack-c/upstream/src/shk.c:3927-4194`: `sellobj()` returns, sale offers, credits, and no-charge state.
- `nethack-c/upstream/src/shk.c:5350-5462`: `costly_spot()`, `shop_object()`, and `price_quote()`.
- `nethack-c/upstream/src/shk.c:5688-5741`: usage fees for unpaid charged/partly used objects.
- `nethack-c/upstream/src/mkobj.c:752-826`: generic `costly_alteration()` for bite/open/destroy/cancel/etc.

## Current JS Reference Map

### Eating

- `js/cmd.js:9212-9230`: nutrition and hunger update helpers.
- `js/cmd.js:9252-9265`: food conduct bookkeeping.
- `js/cmd.js:9272-9347`: `oeaten` and touch/split helpers.
- `js/cmd.js:10277-10537`: tin naming, variety, consuming, and open-tin finishing.
- `js/cmd.js:10540-10634`: tin opening occupation timing.
- `js/cmd.js:19134-19446`: partial rotten food, royal jelly, and glob eating helpers.
- `js/cmd.js:20852-20975`: rotten non-corpse food and egg paths.
- `js/cmd.js:36237-36540`: inventory and floor eating command paths.
- `js/allmain.js:10806-10844`: turn-loop processing for tin opening and `_eating_turns_remaining`.

### Pickup, Drop, Containers, Tip

- `js/cmd.js:23979-24065`: multi-object pickup menu.
- `js/cmd.js:33037-33117`: drop command.
- `js/cmd.js:16077-16543`: container put-in menus, rejection checks, and transfer helpers.
- `js/cmd.js:16581-16667`: container sequence and stash helpers.
- `js/cmd.js:16733-16829`: container take-out preparation and tip-to-floor transfer.
- `js/cmd.js:16876-16940`: tip checks and destination selection.
- `js/cmd.js:16974-17656`: magic bag, bag of tricks, horn of plenty, and usage-fee helpers.
- `js/cmd.js:17658-17699`: tip container into another container or floor.
- `js/cmd.js:33362-34230`: loot UI modes for ice boxes, boxes, bags, put-in, take-out, and stash.
- `js/cmd.js:34414-34496`: tip command UI modes.
- `js/cmd.js:35132-35221`: command dispatch for loot and tip.
- `js/cmd.js:37577-37754`: single-object pickup path.

### Shop Billing

- `js/cmd.js:12714-12763`: shopkeeper lookup and buried-merchandise debt helper.
- `js/cmd.js:13120-13140`: `unpaidPrice` and unpaid line suffix helpers.
- `js/cmd.js:13546-13560`: used-up bill memory helper.
- `js/cmd.js:17379-17416`: unpaid charged-tool usage fee helper.
- `js/cmd.js:17418-17445`: temporary floor source billing for special tip sources.
- `js/cmd.js:17529-17549`: horn-created object billing and unpaid stack merge helper.
- `js/cmd.js:17777-18062`: shop base cost, price calculation, debt collection, and debit payment.
- `js/cmd.js:24410-24516`: shop quote and pay menu handling.
- `js/cmd.js:37958-37986`: pay command source selection.
- `js/mklev.js:4902-4921`: duplicate unpaid-price helpers used by level generation/object merging.

## Findings

### 1. Eating and Food State Are Approximate

C keeps an active `victual` with `piece`, `usedtime`, `reqtime`, `nmod`, `canchoke`, `fullwarn`, and per-bite `oeaten` updates. First bite calls `touchfood()`, which can split a stack, set `oeaten`, and bill shop alterations before eating proceeds. Nutrition is applied during occupation ticks, not only at completion.

Current JS has touch/split helpers and a basic `_eating_turns_remaining` occupation, but most non-corpse food is consumed immediately, and multi-turn corpse nutrition is intentionally deferred until finish (`js/cmd.js:36474-36480`, `js/allmain.js:10821-10828`). This misses C behaviors that depend on bite-by-bite state: choking/full warnings, interruption/resume with a partly eaten object, per-bite shop charging, and `oeaten` weight/nutrition changes during occupation.

Concrete gaps:

- `touchInventoryFood()` and `touchFloorFood()` split and set `oeaten` but do not call a C-equivalent `costly_alteration(COST_BITE)` (`js/cmd.js:9309-9342` vs `eat.c:360-388`, `mkobj.c:752-826`).
- Inventory corpse eating removes the item before the occupation finishes (`js/cmd.js:36274-36299`), while C keeps the food as `svc.context.victual.piece` until `done_eating()` or an effect consumes/revives it.
- Generic non-corpse food applies full nutrition and removes the object in one command (`js/cmd.js:36331-36347`, `js/cmd.js:36511-36518`), bypassing C `oc_delay`, `fprefx()`, `fpostfx()`, `lesshungry()`, and choking logic.
- `consumeOeaten()` clamps `oeaten` to at least 1 (`js/cmd.js:9278-9283`); C consumes `oeaten` toward use-up and can finish/delete the object through `done_eating()`/`useup()` (`eat.c:544-573`, `eat.c:3136-3154`).

### 2. Corpse and Glob Effects Are Partial

C corpse eating has three layers: pre-effects in `cprefx()`, rot/poison/sickness/timing in `eatcorpse()`, and post-effects in `cpostfx()`. It covers cannibalism, stoning/sliming, acidic/petrification interactions, Riders, wraiths, nurses, stalkers, lights/bats, mimics, quantum mechanics, lizards, polymorph sources, displacers, disenchanters, mind flayers, magical energy, and many intrinsic grants.

JS has some source-driven corpse and glob logic: corpse nutrition maps, poisonous/old/rotten floor corpse paths, lichen/newt cases, glob acid/poison/slime/petrification support, and royal jelly. That is not the same effect matrix.

Concrete gaps:

- Inventory corpse path is much thinner than floor corpse path and treats most corpses as a fixed short sequence (`js/cmd.js:36274-36299`).
- C tainted corpse sickness, Rider fatal/revival handling, cannibal luck/aggravation, lizard stoning cure, green slime, acid/petrification interactions, and many `cpostfx()` monster-specific outcomes are missing or only covered for a few hand-coded cases.
- Conduct tracking is broad and local (`js/cmd.js:9252-9265`); it does not mirror C's exact conduct ordering around tins, corpses, glob exceptions, eggs, and special food effects.
- Corpse rot/removal timers remember shop bills only for timeout/shrink paths (`js/cmd.js:13335-13350`, `js/cmd.js:13520-13530`), not through a central `useup()`/`obfree()` equivalent.

### 3. Tin Behavior Has Timing but Not Shop/Effect Parity

C tins are a separate path: variety is selected with blessed/health/random logic, cursed tins can explode, contents can be smelled and discarded, empty tins are handled, corpse pre/post effects can consume the tin before nutrition, metallivores eat the tin itself, and `costly_tin()` charges carried unpaid or shop-floor tins before use-up.

JS implements meaningful timing for tin openers, daggers/knives/picks/axes, blessed tins, no-hands, glib slips, and random delay (`js/cmd.js:10574-10634`). It also handles trapped/cursed explosion, empty tins, smell prompt, spinach, rotten/homemade/default nutrition, and newt energy (`js/cmd.js:10277-10537`).

Concrete gaps:

- No `costly_tin()` equivalent for opening, destroying, or eating tins from a shop (`eat.c:1386-1402` vs `js/cmd.js:10394-10537`, `js/cmd.js:10574-10634`).
- Tin contents do not run the full `cprefx()`/`cpostfx()` corpse matrix; JS handles only selected outcomes.
- C variety selection corrects rotten tins for non-rotting corpses and homemade tins with rot checks (`eat.c:1460-1512`); JS variety logic is simpler (`js/cmd.js:10346-10354`).
- Metallivore tin nutrition is only partially represented; C gives the tin itself 5 nutrition in relevant paths (`eat.c:1560`, `eat.c:1256`).

### 4. Pickup Flow Does Not Preserve C Billing and Lift Semantics

C pickup computes what can be carried before transferring the object. `carry_count()` and `lift_object()` can reduce quantity, reject based on slots or special objects, ask burden prompts, and trigger special cases. `pick_obj()` calls `addtobill()` before `addinv()` so unpaid merges and bill identity stay correct.

JS single pickup computes a shop price, shows a quote, and stores `unpaid`/`unpaidPrice` on the picked object (`js/cmd.js:37631-37714`). It then computes weight after adding the object and only reports burden feedback (`js/cmd.js:37716-37754`). Multi-pickup moves selected objects directly into inventory (`js/cmd.js:23979-24065`).

Concrete gaps:

- Multi-object pickup bypasses shop quote and unpaid setup entirely (`js/cmd.js:24000-24055`).
- Single pickup merges matching food into an existing inventory stack without carrying forward the current shop price or unpaid state (`js/cmd.js:37656-37691`).
- There is no bill ledger call before inventory insertion, so C's `addtobill()`/`addinv()` merge invariant is absent.
- Lift limits are not C-parity: no pre-transfer partial pickup, no inventory-slot failure, no C boulder/loadstone/scare monster/fatal corpse/artifact touch matrix, and burden is handled after full insertion.
- Stolen value when carrying merchandise out of a shop is not tied to recursive bill/container state the way `pick_obj()` and `stolen_value()` are in C.

### 5. Drop Flow Does Not Implement `sellobj()` Semantics

C drop unwields/unquivers as needed, removes from inventory, applies floor effects, places/stacks the object, and calls `sellobj()` when on a costly spot. `sellobj()` handles unpaid returns, deliberate sale offers, credit, no-charge state for dropped containers, and bill removal.

JS drop clones the inventory object to the floor, clears basic equipment flags, applies earth/ice effects, and prints a message (`js/cmd.js:33037-33117`). It does not call a shop sale/return path.

Concrete gaps:

- Dropping unpaid merchandise in a shop does not return it through `subfrombill()`/`sellobj()`.
- Dropping paid items in a shop does not offer sale/credit or mark contained items `no_charge`.
- Dropped containers do not recursively mark contents `no_charge` or preserve C's `dropped_container()`/`picked_container()` state.
- Drop stacking is not bill-aware. C `mergable()` checks unpaid, bill price, `no_charge`, `oeaten`, corpse/egg/tin identity, and related state; JS drop pushes a new floor object.

### 6. Container Loot Exists but Shop Ownership Is Missing

C container operations are deeply tied to shops. Putting an inventory object into a shop-floor container can sell it. Taking an object out of a shop-floor container bills it. Tipping a shop-floor container can bill, steal, or suppress price depending on source and target. Ice boxes, cursed bags of holding, bag of tricks, horn of plenty, traps, locked state, and weight all route through those same object/bill invariants.

JS has a substantial UI implementation for boxes, bags, ice boxes, take-out, put-in, stash, and tip (`js/cmd.js:16077-17699`, `js/cmd.js:33362-34230`, `js/cmd.js:34414-34496`). It also implements some magic bag, bag of tricks, and horn of plenty behavior.

Concrete gaps:

- `putInventoryObjectIntoContainer()` directly removes inventory and inserts into the target container (`js/cmd.js:16504-16543`); it does not call `sellobj()` or equivalent when the target is a shop-floor container.
- `addContainerTakeoutObjectToInventory()` and loot take-out directly add items to inventory (`js/cmd.js:16742-16756`, `js/cmd.js:34123-34159`); they do not call `addtobill()` when taking from a shop-floor container.
- `tipContainerToFloor()` and `tipContainerIntoContainer()` move contents without C's per-item shop billing/stolen-value rules, except for narrow magic bag gold/debit handling (`js/cmd.js:16803-16829`, `js/cmd.js:17658-17699`).
- Loot reachability is simplified. C checks water/lava access, limbs/free hand, multiple containers, confusion reverse-loot, blind cockatrice touch, saddles, and directional cases (`pickup.c:2022-2345`).
- Trap handling for tip/loot is placeholder-level in JS (`js/cmd.js:16876-16884`) compared with C `chest_trap()` and `use_container()` effects.
- Take-out does not run C `lift_object()` for capacity, slot, artifact, Rider corpse, or fatal-corpse checks.

### 7. Shop Billing Is Field-Based, Not Ledger-Based

C uses shopkeeper bill entries with explicit invariants: an object is unpaid iff it is on a bill, except used-up bill entries. The system supports split/merge, contained unpaid objects, hidden containers, used-up items, itemized payment, partial usage fees, price quote learning, `no_charge`, stolen value, and alteration billing.

JS uses object fields (`unpaid`, `unpaidPrice`) plus loose shopkeeper counters/debit and a global `_usedUpShopBills` list (`js/cmd.js:13120-13140`, `js/cmd.js:13546-13560`, `js/cmd.js:18030-18062`). This supports visible unpaid suffixes and basic payment, but does not preserve C's ownership and bill-entry semantics.

Concrete gaps:

- There is no equivalent of `bill_x` entries, `onbill()`, `splitbill()`, `subfrombill()`, or `obfree()`; object identity changes and merges can lose bill state.
- `billct` is approximate. Single pickup sets it to at least one (`js/cmd.js:37712`), horn-created objects increment it (`js/cmd.js:17537`), and payment decrements by selected item count (`js/cmd.js:24483-24485`), but it is not authoritative.
- `collectPayableShopDebts()` scans inventory and floor objects globally, so payable objects are not strictly tied to a specific shopkeeper's bill (`js/cmd.js:18021-18048`).
- Multi-select payment uses `total` in the final message, but the defined accumulator is `cashTotal` (`js/cmd.js:24446-24514`). That is a current JS bug independent of C parity.
- `get_cost()` parity is incomplete: JS has base tables, unknown-name surcharge, enchantment surcharge, charisma adjustment, and pricing units (`js/cmd.js:17777-18002`), but not full C role/status/shopkeeper anger/tourist/dunce/artifact/contained/no-charge/price-quote side effects.
- Generic `costly_alteration()` is absent. JS has local billing for buried merchandise, charged bag/horn use, and horn-created objects, but not the shared bite/open/destroy/cancel/degrade billing hook used across C.
- Used-up unpaid items are not centralized. C `useup()`/`obfree()` preserve bills for consumed unpaid objects; JS only remembers some corpse rot/glob shrink paths.

## Recommended Implementation Slices

1. Build the shop ledger foundation first.
   - Add a C-shaped bill model keyed by shopkeeper, object identity, quantity, price, and used-up status.
   - Implement source-equivalent helpers for `onbill`, `addtobill`, `splitbill`, `subfrombill`, `unpaid_cost`, `contained_cost`, `sellobj`, `dropped_container`, `picked_container`, `check_unpaid_usage`, and `costly_alteration`.
   - Keep `unpaid`/`unpaidPrice` as derived display state, not the source of truth.

2. Port `touchfood()` and the victual core.
   - Model `piece`, `usedtime`, `reqtime`, `nmod`, `canchoke`, and `fullwarn`.
   - Charge `COST_BITE` on first touch, consume `oeaten` per tick, and route finished/used-up unpaid food through the shop ledger.
   - Preserve interruption/resume behavior before expanding more corpse effects.

3. Port tins on top of the ledger and victual/use-up helpers.
   - Implement `costly_tin()`, C tin variety corrections, use-up ordering, metallivore nutrition, and full corpse pre/post effect routing for tin contents.
   - Keep the current tin opener timing as a base, but drive billing and effects from C-shaped helpers.

4. Port pickup/drop around shop and stack invariants.
   - Move pickup through `carry_count()`/`lift_object()` style preflight and `pick_obj()` style bill-before-inventory insertion.
   - Move drop through `dropx()`/`dropy()`/`dropz()` style removal, floor effects, `sellobj()`, and bill-aware stack merging.
   - Fix multi-pickup and same-food merge as part of this slice because both currently lose shop state.

5. Port container operations after pickup/drop and shop billing.
   - Rework put-in, take-out, and tip to call ledger-aware `sellobj`, `addtobill`, `subfrombill`, stolen-value, and no-charge helpers.
   - Add C reachability, trap, confusion reverse-loot, blind cockatrice, weight/slot, and target-container checks.
   - Keep current menu plumbing where it matches C prompts, but make object movement flow through C-equivalent transfer helpers.

6. Fill the corpse/non-corpse effect matrix last.
   - Once victual and shop use-up are stable, port `cprefx()`, `eatcorpse()`, `cpostfx()`, `fprefx()`, and `fpostfx()` in source-sized groups.
   - Prefer small slices by source section, with visible behavior checks for each special corpse/food class rather than broad hidden-suite assumptions.

## Highest-Risk Current Behaviors

- Eating unpaid shop food or tins can avoid C billing because `costly_alteration()` and `costly_tin()` are missing.
- Multi-pickup and pickup merge can lose unpaid/shop state.
- Dropping or container-moving objects in shops does not exercise C `sellobj()`/`addtobill()`/`subfrombill()` paths.
- Container take-out/tip can move shop-owned contents without becoming unpaid or stolen.
- Payment is not backed by a bill ledger, and the multi-item pay message references an undefined `total`.
