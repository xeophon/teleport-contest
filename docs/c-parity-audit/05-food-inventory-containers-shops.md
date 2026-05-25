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
- `nethack-c/upstream/src/artifact.c:895-970`: `touch_artifact()` self-willed/restricted checks, blast damage, Wisdom exercise, and evasion/refusal return.
- `nethack-c/upstream/src/do.c:27-43`: deliberate drop shop state.
- `nethack-c/upstream/src/do.c:760-843`: `dropx()`, `dropy()`, `dropz()`, floor effects, `sellobj()`, and `stackobj()`.
- `nethack-c/upstream/src/invent.c:1200-1346`: `hold_another_object()`, `useup()`, and `check_unpaid`.
- `nethack-c/upstream/src/invent.c:4363-4460`: bill-aware stack merging rules.

### Shop Billing

- `nethack-c/upstream/src/shk.c:1135-1266`: `onbill()`, `is_unpaid()`, and `obfree()` bill invariants and used-up/merge handling.
- `nethack-c/upstream/src/shk.c:1542-1660`: itemized bills, including unpaid contents and known/unknown containers.
- `nethack-c/upstream/src/shk.c:2111-2410`: paying bills and `buy_container()`.
- `nethack-c/upstream/src/shk.c:2805-3098`: shop item cost, pricing units, contained cost, dropped/picked container `no_charge`.
- `nethack-c/upstream/src/shk.c:3102-3139`: `special_stock()` candelabrum refusal for CANDLESHOP/Izchak before invocation.
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

- `js/cmd.js:24588-24674`: multi-object pickup menu.
- `js/cmd.js:33688-33774`: drop command, direct gold-drop donation, and unpaid-drop shop hook.
- `js/cmd.js:37612-37683`, `js/cmd.js:37808-37933`: fired and thrown projectile split/landing paths.
- `js/cmd.js:19609-20230`: container put-in menus, rejection checks, and transfer helpers.
- `js/cmd.js:15580-15972`, `js/cmd.js:16983-17090`, `js/cmd.js:20249-20445`, `js/cmd.js:38560-38625`: container take-out shop billing, pre-lift touch/weight checks, preparation, and inventory insertion.
- `js/cmd.js:20489-20658`, `js/cmd.js:38873-38899`: tip checks and destination selection.
- `js/cmd.js:17542-18220`: magic bag, bag of tricks, horn of plenty, usage-fee helpers, and tip into another container.
- `js/cmd.js:33982-34818`: loot UI modes for ice boxes, boxes, bags, put-in, take-out, and stash.
- `js/cmd.js:35034-35129`: tip command UI modes.
- `js/cmd.js:35823-35841`, `js/cmd.js:36434-36478`: command dispatch for tip and loot direction.
- `js/cmd.js:38249-38420`: single-object pickup path.

### Shop Billing

- `js/cmd.js:12715-12743`: shopkeeper lookup helpers.
- `js/cmd.js:12804-13487`: starter shop bill entries, split/subtract helpers, carried projectile bill split, same-shop unpaid projectile return, projectile debt conversion, bill-aware floor stack merging, pickup bill merge helpers, loose-gold credit/donation helpers, loose floor-gold pickup charging, shop-floor container take-out/tip billing, unpaid drop return, and test exports.
- `js/cmd.js:15153-15420`: ordinary `sellobj()` sale helpers, CANDLESHOP special-stock refusal, uninterested no-sale handling, paid drop sale info, and shop-floor container put-in sale info.
- `js/cmd.js:7305-7315`, `js/cmd.js:8262-8304`, `js/cmd.js:32637-32664`: carried inventory `useup()` helper, carried fire destruction, and failed spellbook read destruction now preserve final-copy unpaid objects as used-up bill rows while leaving partial stacks to the `bquan > quan` debt path.
- `js/cmd.js:7660-7700`, `js/cmd.js:7716-7750`, `js/cmd.js:22893-22896`, `js/cmd.js:28474`, `js/cmd.js:28525`, `js/cmd.js:31410`: floor fire now carries C's hero-caused billing flag; hero traps and hero rays bill, monster breath continuations do not, and destroyed shop-floor stacks split before `useupf()`-style used-up billing or outside-shop robbed value.
- `js/cmd.js:13442-13458`: buried-merchandise debt helper.
- `js/cmd.js:13819-13826`: unpaid line synchronization.
- `js/cmd.js:14240-14268`: used-up bill naming and memory helper.
- `js/cmd.js:168-176`, `js/cmd.js:19300-19373`: unpaid charged-object usage fee and charge-spend helpers.
- `js/cmd.js:9332-9472`, `js/cmd.js:9480-9575`, `js/cmd.js:21796-21803`, `js/cmd.js:34066-34123`, `js/cmd.js:34151-34153`, `js/cmd.js:34339-34341`, `js/cmd.js:35678-35695`, `js/cmd.js:39921-39932`: lamp and potion-of-oil apply paths plus lamp `#rub` paths that light/snuff, split oil-potion stacks, convert magic lamps before djinni handling, and route unpaid usage through C-style debit/used-up billing.
- `js/cmd.js:9698-10108`, `js/cmd.js:35330-35365`: shared musical instrument apply shell for ordinary flute/harp/horn/bugle/drum no-charge behavior, underwater and no-blow gates, prompt/cancel timing, C-shaped improvisation RNG, magic flute/harp billing, frost/fire horn direction zaps, charged mundane fallback, and drum-of-earthquake charges.
- `js/cmd.js:23328-23398`: normal spellbook study completion now charges unpaid library usage before learning/discovery finalization.
- `js/cmd.js:34232-34266`, `js/cmd.js:34490-34616`: expensive-camera and can-of-grease apply paths that spend charges through unpaid usage billing.
- `js/cmd.js:17950-18009`: magic bag shop debit context for special tip sources.
- `js/cmd.js:18254-18276`: horn-created object billing and unpaid stack merge helper.
- `js/cmd.js:18504-19046`: shop base cost, price calculation, ledger-first debt collection, itemized bill-row payment, credit/debit handling.
- `js/cmd.js:25450-25513`: shop quote and pay menu handling.
- `js/cmd.js:38977-39013`: pay command source selection.
- `js/mklev.js:4681-4701`: container stacking now rejects `unpaid`/`no_charge` mismatches and unpaid container merges.
- `js/mklev.js:4902-4921`: duplicate unpaid-price helpers used by level generation/object merging.

## Findings

### 1. Eating and Food State Are Approximate

C keeps an active `victual` with `piece`, `usedtime`, `reqtime`, `nmod`, `canchoke`, `fullwarn`, and per-bite `oeaten` updates. First bite calls `touchfood()`, which can split a stack, set `oeaten`, and bill shop alterations before eating proceeds. Nutrition is applied during occupation ticks, not only at completion.

Current JS has touch/split helpers and a basic `_eating_turns_remaining` occupation, but most non-corpse food is consumed immediately, and multi-turn corpse nutrition is intentionally deferred until finish (`js/cmd.js:36474-36480`, `js/allmain.js:10821-10828`). This misses C behaviors that depend on bite-by-bite state: choking/full warnings, interruption/resume with a partly eaten object, per-bite shop charging, and `oeaten` weight/nutrition changes during occupation.

Concrete gaps:

- `touchInventoryFood()` and `touchFloorFood()` now split, set `oeaten`, and charge unpaid shop food through a C-equivalent `costly_alteration(COST_BITE)` path; remaining victual gaps are per-turn nutrition/use-up and interruption parity.
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

- JS now has narrow `costly_tin(COST_OPEN/COST_DSTROY)`-style billing for opened or trap-destroyed tins, including one-tin stack splits before used-up billing; remaining tin gaps are exact C split/use-up integration across all effect paths, tin variety corrections, metallivore details, and full corpse pre/post effects.
- Tin contents do not run the full `cprefx()`/`cpostfx()` corpse matrix; JS handles only selected outcomes.
- C variety selection corrects rotten tins for non-rotting corpses and homemade tins with rot checks (`eat.c:1460-1512`); JS variety logic is simpler (`js/cmd.js:10346-10354`).
- Metallivore tin nutrition is only partially represented; C gives the tin itself 5 nutrition in relevant paths (`eat.c:1560`, `eat.c:1256`).

### 4. Pickup Flow Does Not Preserve C Billing and Lift Semantics

C pickup computes what can be carried before transferring the object. `carry_count()` and `lift_object()` can reduce quantity, reject based on slots or special objects, ask burden prompts, and trigger special cases. `pick_obj()` calls `addtobill()` before `addinv()` so unpaid merges and bill identity stay correct.

JS single pickup computes a shop price, shows a quote, and then transfers the picked object (`js/cmd.js:42200-42386`). It now has a starter floor-pickup preflight before transfer/billing for artifact blast/evasion/death, fatal barehanded cockatrice/chickatrice corpse touch, floor Rider corpse revival, maximum-carry failure, and inventory-slot failure (`js/cmd.js:17048-17136`). It still computes ordinary burden feedback after adding the object. Multi-pickup preflights selected non-gold objects before mutating floor or inventory state, then moves selected objects into inventory after ledger/merge checks (`js/cmd.js:28123-28222`).

Concrete gaps:

- Multi-object pickup still bypasses the C quote flow and only has starter floor preflight, though ordinary picked objects now enter the JS shop ledger.
- Single food pickup and ordinary stackable non-food pickup now reject paid/unpaid mismatches and carry compatible same-price unpaid bill totals forward.
- Bill ledger calls exist for ordinary shop pickup and compatible inventory merges, but they are not yet a full C `addtobill()`/`addinv()` merge invariant across every transfer path.
- Lift limits are not full C parity: starter pre-transfer slot/max-carry failure, artifact/fatal-corpse touch gates, and floor Rider corpse revival exist for ordinary floor pickup, but partial stack pickup, burden prompts, boulder/loadstone/scare monster scroll behavior, and the full artifact bane/silver/life-saving matrix remain incomplete.
- Stolen value when carrying merchandise out of a shop is not tied to recursive bill/container state the way `pick_obj()` and `stolen_value()` are in C.

### 5. Drop Flow Only Partially Implements `sellobj()` Semantics

C drop unwields/unquivers as needed, removes from inventory, applies floor effects, places/stacks the object, and calls `sellobj()` when on a costly spot. `sellobj()` handles unpaid returns, deliberate sale offers, credit, no-charge state for dropped containers, and bill removal.

JS drop clones the inventory object to the floor, clears basic equipment flags, applies earth/ice effects, and prints a message (`js/cmd.js:33688-33774`). It now handles ordinary unpaid non-container returns, including the narrow split-stack residual bill branch, paid non-container sale/credit offers with declined-sale `no_charge`, ordinary dropped-container sale/no-sale state for saleable contents, contained gold, recursive no-charge marking, and contained bill-row cleanup, angry/hostile shopkeeper no-pay takeover, robbed-shop restock contribution handling, CANDLESHOP candelabrum special-stock refusal, generic no-sale/full-bill uninterested handling, C-ordered ordinary drop stacking after unpaid return or sale prompt resolution, ordinary gold `donate_gold()` drops with debt, loan, credit, and gold-specific robbed/angry handling, and matching floor-gold `costly_gold()` charges when shop-floor gold is picked back up. Ordinary whole-container pickup now runs a starter `addtobill()`/`picked_container()` path that recursively bills chargeable contents/contained gold, clears reclaimed `no_charge` containers and contents, and re-parents cloned carried contents. Remaining `sellobj()` gaps are complete recursive `subfrombill()` integration and less ordinary transfer paths.

Concrete gaps:

- Split-stack unpaid returns have starter `splitbill`/`subfrombill` helpers, partial inventory use preserves C's `bquan > quan` representation, and throw/fire projectile splits now create child bill rows, return same-shop landings, convert off-shop child rows to debt/robbed value, and merge compatible unpaid floor bill rows. Broken-projectile edge cases and full recursive `subfrombill()`/`sellobj()` compatibility remain incomplete.
- Angry/hostile, robbed-shop, CANDLESHOP special-stock, and generic uninterested `sellobj()` branches are now represented for ordinary paid drops and dropped containers, including no-pay takeover/restock contributions, no-sale no-charge state, and bill-row cleanup; exact shared-helper integration across less ordinary paths remains incomplete.
- Ordinary dropped-container `sellobj()` now preserves C `dropped_container()` sale/no-sale state and recursively marks contained non-gold objects `no_charge` when the shopkeeper does not buy them; ordinary pickup clears that state through a starter `picked_container()` path, while non-ordinary container branches remain incomplete.
- Ordinary drop stacking now runs after `sellobj()` handling and preserves the main bill boundaries: paid and `no_charge` stacks do not merge, same-price unpaid stacks merge their bill rows, and prompt-based paid sales stack only after accept/decline resolves. Remaining stack parity gaps are the full C `mergable()` matrix around names/artifacts/eggs/corpses/tins and the less ordinary projectile/container impact paths.

### 6. Container Loot Has Partial Shop Ownership

C container operations are deeply tied to shops. Putting an inventory object into a shop-floor container can sell it. Taking an object out of a shop-floor container bills it. Tipping a shop-floor container can bill, steal, or suppress price depending on source and target. Ice boxes, cursed bags of holding, bag of tricks, horn of plenty, traps, locked state, and weight all route through those same object/bill invariants.

JS has a substantial UI implementation for boxes, bags, ice boxes, take-out, put-in, stash, and tip (`js/cmd.js:19609-20658`, `js/cmd.js:38104-38899`). It also implements some magic bag, bag of tricks, and horn of plenty behavior. Ordinary take-out from a shop-floor container now goes through a starter `addtobill()`-style helper, prices from the source container's coordinates, skips carried containers/already-unpaid objects, requires the source container to be a level-floor object, clears ordinary `no_charge` contents when they are taken back without billing, routes loose gold through C-shaped `costly_gold()` credit/debit/loan transitions, runs `out_container()`/`lift_object()`-ordered preflight so restricted/self-willed artifact blast damage and evasion, fatal barehanded cockatrice/chickatrice corpse touch, slot exhaustion, maximum-carry failures, burden prompts, declined burden prompts, and overweight stack splits happen before extraction, recursive billing, gold debt, or inventory insertion, preserves C's lack of immediate Rider revival for container take-out, and can merge stackable no-charge or same-price unpaid contents into compatible carried stacks without requiring a fresh inventory letter. Ordinary put-in now has starter `sellobj()`-style coverage for unpaid non-container returns, partial unpaid split rows, outside-shop debt preservation, no-sale/full-bill uninterested handling with `no_charge` marking, accepted paid-object/container sale prompts with cash/credit handling, and loose-gold `donate_gold()` credit/debt handling, with container stacking guarded against unpaid/no-charge provenance loss (`js/mklev.js:4681-4701`). Ordinary tip now bills each top-level object from an actual shop-floor source before floor or carried-target placement; loose gold tipped to the floor also runs the C `dropy()`/`sellobj()` donation offset, while loose gold tipped into a carried container only applies the `costly_gold()` charge. It now also recurses into moved containers for contained contents/gold where the source C path uses `contained_cost()`, `contained_gold()`, `addtobill()`, or `sellobj()`, ordinary shop-floor magic-bag tip loss/put-in explosion paths preserve used-up bill rows for destroyed bags/triggers and charge vanished merchandise while consuming shop credit, narrow carried magic-bag held losses convert top-level unpaid vanished contents to debt while preserving nested unpaid contents in non-unpaid vanished containers as used-up rows, and magic-bag scatter breakage, consumed-on-hit objects, destructive floor-effect landings, trigger/target destruction, and scattered unpaid stack splits now preserve existing bill rows through used-up entries.

Concrete gaps:

- Shop-floor put-in now covers ordinary unpaid non-container returns, recursive moved-container contents/contained gold, accepted paid-object/container sale prompts, broader angry/robbed `sellobj()` shopkeeper-state handling, no-sale/full-bill uninterested handling with `no_charge` marking, loose-gold donation/credit, and ordinary shop-floor magic-bag explosion billing for destroyed target bags, unpaid triggers, vanished contents, and scatter/useup plus destructive floor-effect preservation, but non-ordinary magic-bag source/target handling and shared-helper integration remain incomplete.
- Shop-floor take-out now covers ordinary objects, moved-container recursive contents/contained gold, loose top-level gold, pre-billing artifact blast/damage/evasion for restricted and self-willed artifacts, fatal barehanded touch-petrifying corpse removal, inventory-slot exhaustion, or maximum-carry failure, burden prompts, partial stack lifting, and stackable no-charge/same-price unpaid inventory merges, but artifact bane/silver/life-saving polish and less common inventory overflow/merge quirks remain incomplete.
- Tip now covers ordinary per-item shop billing, recursive moved-container contents/contained gold, loose gold, ordinary shop-floor cursed magic-bag item loss, narrow carried magic-bag held-loss billing, and magic-bag scatter/useup preservation for breakage, consumed-on-hit objects, destructive floor-effect landings, and unpaid trigger/target destruction, but non-ordinary sources/targets, full `obfree()` preservation, and container-aware `stolen_value()` debt naming still do not fully match C `tipcontainer()`/`stolen_value()`.
- Loot reachability is simplified. C checks water/lava access, limbs/free hand, multiple containers, confusion reverse-loot, blind cockatrice touch, saddles, and directional cases (`pickup.c:2022-2345`).
- Trap handling for tip/loot is placeholder-level in JS (`js/cmd.js:17388-17394`) compared with C `chest_trap()` and `use_container()` effects.
- Take-out has a starter C `out_container()`/`lift_object()`-ordered preflight for restricted/self-willed artifact blast damage and evasion, fatal barehanded touch-petrifying corpse removal, slots, maximum-carry failure, burden prompts, and partial stack lifting; artifact bane/silver/life-saving polish and uncommon inventory overflow/merge paths still need follow-up.

### 7. Shop Billing Is Still Transitional

C uses shopkeeper bill entries with explicit invariants: an object is unpaid iff it is on a bill, except used-up bill entries. The system supports split/merge, contained unpaid objects, hidden containers, used-up items, itemized payment, partial usage fees, price quote learning, `no_charge`, stolen value, and alteration billing.

JS uses starter bill entries plus object fields (`unpaid`, `unpaidPrice`), loose shopkeeper counters/debit, and a transitional `_usedUpShopBills` list (`js/cmd.js:12804-13487`, `js/cmd.js:13828-13835`, `js/cmd.js:18791-19046`). This supports visible unpaid suffixes, ordinary pickup/drop billing, compatible pickup stack merges, narrow split-stack unpaid returns, partial inventory-use debt display, starter C `check_unpaid_usage()` debit coverage for charged-object partial use including camera flashes, can-of-grease applications with C-shaped target prompts/inaccessible worn-gear checks, normal lamp lighting, magic-lamp `#rub` unusual-use billing before oil-lamp conversion/djinni handling, potion-of-oil lighting with Fuel Tax and full-potion used-up bill preservation, successful spellbook study completion, magic-marker writing with C's flat pre-ink usage fee, tinning-kit corpse applications with homemade tin creation and charge/no-charge billing, crystal-ball gazing with pre-decrement charge billing and no-bill cancel/blind paths, shared musical instrument handling for ordinary no-charge instruments, magic flute/harp improvisation with prompt cancel and confused no-charge fallback, frost/fire horn direction zaps with pre-direction billing and no-identify cancel handling, drum-of-earthquake charges, failed spellbook read destruction, carried fire destruction for final-copy inventory objects, hero-caused floor fire `useupf()` billing, throw/fire child bill rows with off-shop debt conversion, bill-aware floor stack merging, selected magic-bag `obfree()`-style used-up preservation, and ledger-first payment for split and used-up bill rows, but does not yet preserve C's full ownership and bill-entry semantics.

Concrete gaps:

- Ledger coverage is partial: starter `bill` entries and narrow split/subtract/debt helpers exist, but there is no full source-equivalent `onbill()`, recursive `subfrombill()`, container-aware `stolen_value()`, or general `obfree()`; generic floor-effect deletion outside the scatter opt-in and non-projectile merge/delete paths can still lose bill state.
- `billct` is tied to the starter ledger in newer paths, but legacy object-field fallback scans still mean it is not authoritative everywhere.
- `collectPayableShopDebts()` now enumerates selected shopkeeper bill rows first and splits `bquan > quan` rows into used-up/intact portions, but retains object-field fallback scanning for legacy unpaid objects (`js/cmd.js:18867-18895`).
- Payment now applies shop credit before cash for selected ledger rows and shrinks partly used bills before intact rows can clear them, but container itemized payment, full queued-selection behavior, and robbed-shop payment still do not match C.
- `get_cost()` parity is incomplete: JS has base tables, unknown-name surcharge, enchantment surcharge, charisma adjustment, and pricing units (`js/cmd.js:18486-18713`), but not full C role/status/shopkeeper anger/tourist/dunce/artifact/contained/no-charge/price-quote side effects.
- `check_unpaid_usage()` is still partial. JS now has a reusable debit-only helper with C-style charged-object fee branches and callers for bag/horn use, wand zaps, camera use, can-of-grease applications, normal lamp and potion-of-oil apply lighting, magic-lamp `#rub` djinni release, successful spellbook study completion, magic-marker writing, tinning-kit corpse applications, crystal-ball gazing, magic flute/harp improvisation, frost/fire horn direction zaps, alternate emptying, and drum-of-earthquake charges; the ordinary musical-instrument shell shares the same C gates while correctly avoiding usage billing for no-charge mundane instruments. Other charge-consuming callers still need to route through the appropriate C billing paths.
- Generic `costly_alteration()` is still partial. JS now covers unpaid food `COST_BITE` and narrow tin `COST_OPEN/COST_DSTROY` paths, plus local billing for buried merchandise and horn-created objects, but not the shared open/destroy/cancel/degrade billing hook used across C.
- Used-up unpaid items are not centralized. C `useup()`/`obfree()` preserve bills for consumed unpaid objects; JS only remembers selected corpse rot/glob shrink, projectile, payment, magic-bag destruction, failed spellbook read, carried fire destruction, and hero-caused floor fire paths.

## Recommended Implementation Slices

1. Build the shop ledger foundation first.
   - Add a C-shaped bill model keyed by shopkeeper, object identity, quantity, price, and used-up status.
   - Continue the started split/subtract helpers into source-equivalent `onbill`, full `addtobill`, recursive `subfrombill`, `unpaid_cost`, `contained_cost`, shared `sellobj` helper integration, remaining add-inventory/no-charge cleanup outside ordinary shop pickup, remaining charge-consuming `check_unpaid_usage` callers, and `costly_alteration`; ordinary `dropped_container`, ordinary pickup `picked_container`, angry/robbed shopkeeper-state, and special-stock/uninterested branches are covered for direct ordinary paths but still need shared-helper integration.
   - Keep `unpaid`/`unpaidPrice` as derived display state, not the source of truth.

2. Port `touchfood()` and the victual core.
   - Model `piece`, `usedtime`, `reqtime`, `nmod`, `canchoke`, and `fullwarn`.
   - Keep first-touch `COST_BITE` billing wired through the shop ledger, then consume `oeaten` per tick and route finished/used-up unpaid food through central use-up handling.
   - Preserve interruption/resume behavior before expanding more corpse effects.

3. Port tins on top of the ledger and victual/use-up helpers.
   - Finish tin billing beyond the narrow `COST_OPEN/COST_DSTROY` and basic tinning-kit paths: exact C split/use-up integration across all effects, tin variety corrections, metallivore nutrition, special tinning corpse hazards, and full corpse pre/post effect routing for tin contents.
   - Keep the current tin opener timing as a base, but drive billing and effects from C-shaped helpers.

4. Port pickup/drop around shop and stack invariants.
   - Move pickup through `carry_count()`/`lift_object()` style preflight and `pick_obj()` style bill-before-inventory insertion.
   - Continue moving drop through `dropx()`/`dropy()`/`dropz()` style removal, floor effects, complete `sellobj()`, and bill-aware stack merging.
   - Broaden projectile shop resolution for broken/container impact edge cases, then continue into container flows.

5. Port container operations after pickup/drop and shop billing.
   - Rework remaining put-in, take-out, and tip paths to call ledger-aware `sellobj`, `addtobill`, `subfrombill`, stolen-value, and no-charge helpers.
   - Add C reachability, trap, confusion reverse-loot, blind cockatrice, weight/slot, and target-container checks.
   - Keep current menu plumbing where it matches C prompts, but make object movement flow through C-equivalent transfer helpers.

6. Fill the corpse/non-corpse effect matrix last.
   - Once victual and shop use-up are stable, port `cprefx()`, `eatcorpse()`, `cpostfx()`, `fprefx()`, and `fpostfx()` in source-sized groups.
   - Prefer small slices by source section, with visible behavior checks for each special corpse/food class rather than broad hidden-suite assumptions.

## Highest-Risk Current Behaviors

- Tin paths outside the narrow open/trap-destroy and basic tinning-kit billing slices plus generic non-bite alterations can still avoid C billing because full `costly_tin()` integration and shared non-bite `costly_alteration()` coverage are still incomplete.
- Multi-pickup still lacks full C quote/lift semantics, and split-stack object identity can still lose unpaid/shop state in non-projectile delete, container, and generic merge paths.
- Container-moving objects in shops and complex drops still do not exercise full C `sellobj()`/`addtobill()`/`subfrombill()` paths outside ordinary dropped-container, angry/robbed and special-stock/uninterested `sellobj()` branches, ordinary gold drop/pickup paths, ordinary shop-floor magic-bag tip loss/put-in explosion slices, narrow carried magic-bag held-loss billing, and magic-bag scatter/useup plus destructive floor-effect preservation; generic merge/destruction paths remain high-risk.
- Carried/non-ordinary loss sources/targets and destroyed recursive contents can still miss full C `obfree()` preservation and `stolen_value()` debt naming; carried held/blast-loss billing, failed spellbook reads, carried fire destruction, hero-caused floor fire, and selected scatter/useup preservation are covered through local helpers, not a general C-shaped subsystem.
- Payment is only partly backed by authoritative bill rows; container payment, robbed-shop repayment, and several legacy unpaid fallbacks still need C parity.
