# NetHack C-to-JS Porting Plan

Last refreshed: 2026-05-26.

## Purpose

Port NetHack 5.0 behavior from the upstream C tree in `nethack-c/upstream` to plain JavaScript. Public session fixtures are regression tests only; they must not be embedded into runtime behavior or used to infer hidden tests.

The current audit source of truth is `docs/c-parity-audit/`.

## Ground Rules

- Justify behavior with upstream C references or existing JS compatibility constraints.
- Keep changes small enough to verify and push regularly.
- Do not hardcode seeds, player names, move counts, screen snapshots, cursor traces, or fixture-specific RNG answers.
- After code changes, run focused checks and `npm run score`.
- Keep frozen files unchanged: `js/isaac64.js`, `js/terminal.js`, and `js/storage.js`.

## Recently Completed

- Removed public-session replay runtime and replay-generation tooling.
- Rebuilt tip, bag, horn, ice, corpse timer, large-box force, floor-box put-in, and carried-bag takeout behavior around live game state.
- Fixed carried-bag takeout metadata so removed contents no longer retain stale `contained`, `container`, `nobj`, or floor-link state.
- Added C-style carried-bag put-in splitting for partial unpaid stacks: stashed stack portions now get child bill rows while the remaining carried parent keeps the live residual bill quantity.
- Added the first shop bill ledger scaffold for newly picked-up shop items, horn-created shop objects, and payment removal while preserving legacy unpaid display fields.
- Added source-derived shop billing helper tests, wired multi-pickup through the ledger, and made unpaid non-container drops in shops clear the bill like the early `sellobj()` return path.
- Made ordinary food pickup respect C unpaid merge rules: unpaid shop food no longer merges into paid stacks, and compatible unpaid stack merges carry the bill total forward.
- Added the paid non-container `sellobj()` side for ordinary shop drops: C-style stocked-item sale offers, cash transfer, cashless credit offers, and declined-sale `no_charge` pickup semantics.
- Moved ordinary stackable non-food pickup merges through bill-aware helpers for compatible paid stacks and same-price unpaid shop stacks.
- Started C-shaped `splitbill`/`subfrombill` compatibility for unpaid stack returns: split parent/child bill rows, used-up residual quantities, and safer orphan fallback handling.
- Made partial unpaid inventory use preserve the C `bquan > quan` bill representation and visible unpaid total until return/payment resolves the used-up part.
- Wired unpaid throw/fire projectile splits through child bill rows and same-shop bill return before floor stacking.
- Added starter `stolen_value()` parity for thrown/fired unpaid projectiles leaving their owning shop, plus bill-aware floor stack merging for compatible unpaid rows.
- Made shop payment enumerate authoritative bill rows first, split partly used stacks into used-up and intact payment portions, and apply shop credit before cash for item rows.
- Added starter `out_container()` shop billing for ordinary non-gold objects taken from shop-floor containers, using the source container's coordinates and C's no-charge take-back behavior.
- Added starter `in_container()` shop billing for ordinary put-in: whole and partial unpaid stack returns, split child bill rows, outside-shop debt preservation, and no-charge marking for the no-sale path.
- Added starter `tipcontainer()` shop billing for ordinary objects tipped out of shop-floor containers, including floor and carried-target destinations plus stale-coordinate floor-source guards.
- Added loose-gold shop-floor container billing for put-in, take-out, and tip flows using C-shaped credit/debit/loan transitions.
- Added recursive shop-floor container billing for moved containers and contained gold across put-in, take-out, and tip flows.
- Added accepted-sale prompts for shop-floor container put-in, including C-style `sellobj()` cash/credit handling for paid objects and containers placed into shop-floor containers.
- Added ordinary dropped-container `sellobj()`/`dropped_container()` coverage for normal shop drops, including recursive contained-object sale, credit, donation, bill-return, and `no_charge` state.
- Added ordinary gold-drop `donate_gold()` and floor-gold `costly_gold()` parity for direct shop drops/pickups, including debt payoff, loan reduction, excess shop credit, and gold-specific robbed/angry handling.
- Broadened `sellobj()` shopkeeper-state parity for ordinary drops and shop-floor container put-in: angry/hostile shopkeepers take goods without sale credit, robbed shops treat dropped or stashed value as restock contribution instead of credit, and affected container contents/bill rows are cleaned up through the starter `subfrombill()` path.
- Added `sellobj()` no-sale polish for ordinary paid drops and shop-floor container put-in: CANDLESHOP candelabrum special-stock refusal, generic uninterested messages, full-bill uninterested handling, and no-charge state for rejected paid goods.
- Added C-ordered ordinary drop stacking after `sellobj()` handling: compatible floor stacks merge after unpaid returns or sale prompt resolution, keep paid/no-charge boundaries, and merge same-price unpaid bill rows.
- Added ordinary shop-floor cursed magic-bag tip loss billing: destroyed tipped contents charge lost merchandise debt, consume shop credit first, and clear affected starter bill rows.
- Added shop-floor cursed magic-bag `#loot` loss: selecting a cursed shop-floor magic bag now runs the C `boh_loss()`-style vanished-content roll before the action menu, charges lost merchandise, consumes a turn when value remains owed, and reports "now empty" when the loss empties the bag.
- Added ordinary shop-floor magic-bag put-in explosion billing: destroyed shop-floor bags and unpaid trigger objects remain as used-up bill rows, while contents destroyed by the blast's loss roll charge lost-merchandise debt.
- Added C-style held magic-bag off-shop loss billing: carried cursed-bag losses and carried magic-bag blast losses now convert unpaid held merchandise to shop debt only while the hero is currently in a shop; off-shop losses preserve the affected bill rows as used-up entries through the `obfree()`-style path.
- Added magic-bag scatter/useup bill preservation: explosion scatter breakage and consumed-on-hit destruction keep unpaid rows as used-up bills, tipped trigger/target bag destruction uses the same `obfree()`-style preservation, and scattered unpaid stacks split bill rows before each chunk is handled.
- Added magic-bag scatter destructive floor-effect bill preservation: unpaid objects destroyed by lava/water/hot-ground or boulder landing effects now keep existing bill rows as used-up entries without treating hole migration or glob melding as deletion.
- Added C-style unpaid food bite billing: first-touch food splits now route through a `costly_alteration(COST_BITE)`-equivalent shop ledger path, preserving live stack rows while moving bitten portions to used-up bill rows.
- Added starter C-style `check_unpaid_usage()` coverage for partial unpaid charged-object use: bag/horn use, wand zaps, camera use, can-of-grease applications with target prompts and inaccessible worn-gear checks, normal lamp lighting, magic-lamp `#rub` djinni release, potion-of-oil lighting with Fuel Tax billing, spellbook study completion, magic-marker writing, tinning-kit corpse applications, crystal-ball gazing, magic flute/harp improvisation, frost/fire horn direction zaps, alternate emptying, and drum-of-earthquake charges now debit the shopkeeper without converting the live bill row into a used-up bill unless C also creates a used-up bill row.
- Unified musical instrument apply handling around the C `do_play_instrument()` shell: ordinary flute/harp/horn/bugle/drum effects now share underwater and no-blow gates, prompt/cancel timing, improvisation RNG, charged-instrument mundane fallback, monster wake/scare, and no-charge ordinary shop behavior with the magic instrument paths.
- Added C-style manual musical tune handling for the Stronghold: typed tune normalization, known-passtune prompt/cancel/play flow, tune-awareness tracking, Mastermind-style tumbler/gear feedback, Castle drawbridge metadata, and basic open/close terrain transitions.
- Added narrow C-style tin billing: opened or trap-destroyed unpaid/shop-floor tins now split one tin first, move that tin to a used-up bill row, and leave remaining tin stacks as live shop stock/bill rows.
- Added C-style carried inventory `useup()` bill preservation for failed spellbook read destruction and carried fire destruction: final-copy unpaid objects now remain as used-up bill rows, while surviving and partial-stack cases keep their live bill representation.
- Added C-style hero-caused shop-floor fire `useupf()` billing: hero traps and hero fire rays split destroyed floor stacks before used-up billing, monster-caused floor fire remains unbilled, and outside-shop hero fire records robbed value.
- Added the first C `lift_object()`-ordered shop-floor container take-out preflight: slot and maximum-carry failures now stop before extraction, recursive billing, gold debt, or inventory insertion.
- Added stackable shop-floor container take-out inventory merges for no-charge goods and same-price unpaid bill rows, including full-inventory cases that do not require a fresh inventory letter.
- Added more C `lift_object()`-ordered shop-floor container take-out behavior: burden prompts now happen before extraction/billing, declined prompts leave contents untouched, and overweight stacks split to the liftable quantity before shop billing.
- Added C `out_container()`-ordered shop-floor container take-out touch checks: self-willed quest artifacts can evade grasp before billing/extraction, and barehanded cockatrice/chickatrice corpse removal is fatal before slot or burden preflight.
- Added more C `touch_artifact()` parity for shop-floor container take-out: restricted/self-willed artifacts now blast, damage, and exercise Wisdom before deciding whether to evade or continue into billing/extraction.
- Added ordinary floor-pickup `addtobill()`/`picked_container()` coverage for shop-floor containers: whole-container pickup now recursively bills chargeable contents/contained gold, clears stale `no_charge` on reclaimed containers and contents, and re-parents cloned carried contents.
- Added starter C `pickup_object()`/`lift_object()` preflight for ordinary floor pickup: shop-floor slot/max-carry failures, restricted/self-willed artifact blast/evasion/death, and barehanded cockatrice/chickatrice corpse touch now stop before billing, removal, or inventory insertion.
- Added floor-only C Rider corpse pickup revival: touching a Rider corpse on the floor now revives it before billing or inventory insertion, while container take-out still follows C `out_container()` and does not immediately revive Riders.
- Added C-style ordinary floor partial-stack lifting: overweight floor stacks now split to the liftable quantity before shop billing/inventory insertion and leave the remainder untouched on the floor.
- Added C-style single-object floor burden prompts: ordinary floor objects, corpses, and gold now ask before billing/removal when pickup would exceed `pickup_burden`, declined prompts leave state untouched, and accepted overweight gold pickups split to the liftable count before shop charging.
- Added C-style single-object floor scare-monster scroll pickup handling: explicit generated scrolls now carry scroll metadata/pricing, blessed floor scrolls unbless on pickup, first uncursed pickups mark `spe`, and cursed or already-picked-up scrolls turn to dust through a `useupf()`-style used-up shop bill row.
- Added C-ordered single shop-floor pickup quote gating: ordinary floor preflight, burden prompts, and scare-scroll state/dust handling now happen before the JS shop quote, so failed or too-heavy pickups remain unmutated and unbilled.
- Added C-ordered scare-scroll `trycall()` handling: unknown floor pickup dust now prompts to call the scroll type before used-up shop billing/deletion, menu pickup resumes after that prompt, and reading an unknown scare-monster scroll uses the same type-call path.
- Added C-style starter loadstone transfer handling: loadstones now use weight 500/cost 1 metadata, generated loadstones are cursed, floor pickup and container take-out bypass weight/burden prompts, loadstone stacks avoid partial split, full-inventory loadstone exceptions use C's overflow/refusal rules, and cursed loadstones refuse ordinary drop/throw/stash while successful let-go curses the moved stone.
- Added C-style multi-pickup partial-success ordering: selected floor objects now run pickup preflight and transfer sequentially, so earlier successful shop pickups stay carried/billed when a later selected object fails, and explicit menu pickup consumes a turn even when the first selected object fails.
- Added C-style menu pickup scare-monster scroll basics: blessed and first-uncursed scrolls mutate before live pickup, cursed or already-picked-up scrolls dust into used-up shop bills while the selected-object loop continues, and partial lifted stacks leave the floor remainder state unchanged.
- Added C-style menu pickup burden and gold lift handling: selected items now prompt one at a time, `n` skips the current item and continues, `q` aborts later selections, and shop-floor gold is split and charged only after the liftable count is accepted.
- Added C-style ordinary shop pickup pricing text: pickup menu rows now use shop price suffixes, and single/menu stack pickup quotes use per-unit `addtobill()` wording before the inventory line.
- Added C-style whole-container shop pickup quote pricing: floor pickup menus and quotes now include non-gold container contents, use `contents` wording for no-charge top containers, use `and its contents` wording when the top container is also billed, and keep contained gold as separate shop debt instead of item price.
- Added C-style scare-scroll floor used-up billing quotes: cursed or already-picked-up shop-floor scare-monster scrolls now dust first, then print the floor `addtobill()` "will cost you" quote for single and menu pickup, including per-unit stack wording after unknown-scroll `trycall()`.
- Added C-style floor boulder pickup handling: boulders now carry 6000-weight metadata, ordinary heroes spend the pickup command and fail to lift them, Sokoban boulders refuse before rock-throwing overrides, and polymorphed rock-throwing forms can lift boulders without shop billing or burden prompts.
- Added C-style container boulder take-out handling: contained boulders share `lift_object()` ordering, ordinary heroes fail before extraction/billing, Sokoban still beats rock-throwing forms, rock-throwing forms can take the first boulder through full inventory overflow, and container menus group them with boulders/statues.
- Added C-style robbed-only `#pay` compensation: robbed shops without bills/debit now use the source `dopay()` branch, including after-blood messaging, half-loss acceptance threshold, partial compensation, credit-before-cash payment, and pacifying satisfied shopkeepers.
- Added C-style carried-container itemized `#pay` aggregation: ledger-backed unpaid contents inside the same carried outer container now appear as one payable contents/container line, and paying it clears every constituent bill row while leaving the contained objects in place.
- Added C-style shop-floor container itemized `#pay` aggregation: ledger-backed unpaid contents inside floor containers now collapse into one payable contents/container line, payment clears each constituent bill row, and the floor container keeps its contents in place.
- Added C-style partly-used contained-item `#pay` ordering: live residual contents stay folded into the container payment row, that row is rejected until the used-up portion is paid, and selecting both pays the used-up row first so the container row can clear the live bill.
- Added C-style queued itemized `#pay` ordering and partial affordability: selected rows process in source bill order by used-up state then descending price, and payment stops after the first unaffordable selected row while preserving prior purchases.
- Added C-style itemized `#pay` menu section headings: used-up rows are separated from unpaid rows while preserving selection letters and queued payment behavior.
- Added C-style `#pay` pre-menu payment gating: shop debit is settled before itemized billing, and itemized billing no longer opens when the hero has no gold/credit or cannot afford the cheapest payable row.
- Added C-style non-destroying shop box lock-break billing: forced lock breaks now create a dummy used-up bill row for the altered box only, leave contents unbilled, and mark the floor box no-charge before it becomes broken/unlocked.
- Added C-style cream-pie `COST_SPLAT` billing: applying an unpaid carried cream pie to yourself now splits stacks first, creates a dummy used-up bill row for the splatted pie, and leaves any residual stack on its live bill row.
- Added C-style cursed wand backfire `useupall()` billing: unpaid backfiring wands still charge normal usage, then preserve the exploded wand as a used-up bill row for both ordinary and wishing wand branches.
- Added C-ordered shop-floor magic-bag put-in `sellobj()` handling: trigger objects now resolve unpaid return, sale/no-sale, angry/robbed shopkeeper, and declined-sale `no_charge` handling before magic-bag explosion billing, matching C `in_container()` ordering for destroyed trigger and target bags.
- Added C-style invalid wish retry/random fallback: unrecognized wish text no longer creates arbitrary named weapons, bad descriptions retry without consuming wish conduct, and the fifth bad try falls back to a random object.
- Added C-style carried fire-ignition billing: unpaid carried light sources that catch fire in a shop now charge the normal usage fee, then preserve the original bill row as a used-up bill entry; off-shop ignition leaves the live bill row unchanged.
- Added a narrow C-shaped wish finalization slice: requested quantities now stay limited to mergeable object classes and C multigen caps, requested `spe` follows class rules for weapons, armor, weapon-tools, charged rings, wands, crystal balls, and non-`spe` objects, and wished crystal balls now use the proper tool initialization path.
- Tightened floor fire source ownership: generic C floor fire catch-light remains unbilled, monster red dragon breath now uses non-hero floor-fire ownership, and hero-caused trap/ray floor destruction remains routed through used-up or robbed shop billing.
- Added C-style wand engraving usage billing: engraving with a wand spends a charge before text entry, unpaid usage is billed from the post-spend charge count, last-charge engraving adds no usage fee, and cursed backfire preserves the wand as a used-up bill row.
- Added C-style wish charge suffix parsing: `(lit)`, `(n)`, and `(r:n)` are parsed before object lookup, valid trailing text such as `named` is preserved, invalid signed/text suffixes are stripped like C, wand recharge counts persist, charged-tool recharge counts are ignored, and known charge display uses the stored recharge count.
- Latest verified public score: `44/44`.

## Current Priorities

1. Shop ledger foundation.
   - Source notes: `docs/c-parity-audit/05-food-inventory-containers-shops.md`.
   - Current JS has a starter bill ledger, but object `unpaid`/`unpaidPrice` fields and legacy fallback scans still participate in billing.
   - Missing or partial concepts include full `addtobill`, full `subfrombill` routing, non-ordinary magic-bag source/target cases, full `obfree()`/container-aware `stolen_value()` helper integration, shared `sellobj()` helper integration beyond ordinary branches, remaining add-inventory/no-charge cleanup outside ordinary shop pickup, less-common `check_unpaid_usage` caller coverage, and non-bite `costly_alteration` coverage outside the narrow food/tin/box-lock/cream-pie paths.
   - The next narrow C-backed gaps are non-ordinary magic-bag source/target cases, remaining inventory merge edge cases outside carried-bag partial put-in, remaining merge/destruction edge cases, artifact touch side effects outside floor pickup/container take-out, full `obfree()`/container-aware `stolen_value()` debt naming, less ordinary `addtobill()`/quote positioning outside whole-container pickup, and remaining `#pay` details such as legacy unpaid fallbacks and itemized prompt edge cases.

2. Object registry and canonical object factory.
   - Source notes: `docs/c-parity-audit/02-objects-wishing-readobjnam.md`.
   - Create one object metadata registry for type, class, material, weight, cost, probability, wishability, merge rules, and damage predicates.
   - Add a C-shaped object factory before deeper `mkobj`, wishing, artifact, and timer work.
   - Continue replacing the independent wish parser with C-shaped matching, full `objects[].oc_merge`/`oc_charged` metadata, explicit "nothing" handling, artifact provenance, non-wishable substitutions, and registry-backed object finalization rules.

3. Level generation lifecycle and special-level data.
   - Source notes: `docs/c-parity-audit/03-levelgen-specials-quest.md`.
   - Centralize bones-before-generation ordering and shared level finalization.
   - Add a minimal `sp_lev` data execution layer before expanding one-off special builders.
   - Port quest text from `quest.lua` through data or a generated artifact.

4. Command, prompt, and menu contracts.
   - Source notes: `docs/c-parity-audit/01-input-commands-windows.md`.
   - Add a command registry and binding map.
   - Centralize count/prefix parsing, extended command matching, `getlin`, `yn_function`, and menu selection.

5. Monster placement, scheduler, and combat cores.
   - Source notes: `docs/c-parity-audit/04-monsters-combat-pets.md`.
   - Build shared `goodpos`, `enexto`, monster lifecycle, turn phases, `hmon`, `mattackm`, passive, and projectile/object-hit paths.

6. Save, restore, bones, and cross-level state.
   - Source notes: `docs/c-parity-audit/06-save-restore-bones.md`.
   - Add a versioned schema, serialized saved levels, migration lists, ID-map restore, timer catchup, and bones sanitation.

7. Traps, liquids, terrain, and material damage.
   - Source notes: `docs/c-parity-audit/07-traps-liquids-terrain.md`.
   - Add a central post-placement terrain pipeline, trap selector, liquid resolvers, floor-effect gate, ray terrain hook, and table-driven object damage.

8. Display, RNG, glyphs, and discovery.
   - Source notes: `docs/c-parity-audit/08-display-rng-observation.md`.
   - Add display RNG diagnostics first, then structured discovery, centralized glyph conversion, hallucination redraw ordering, and redraw/status/message boundaries.

## Immediate Slice

Continue the shop ledger migration:

1. Keep generic `fire_damage()` floor catch-light unbilled, and continue auditing individual destructive floor-effect callers for the right hero/non-hero ownership before they enter shop billing.
2. Broaden shop-floor container take-out and tip beyond recursive billing into remaining lift preflight details, remaining inventory merge edge cases outside carried-bag partial put-in, and merge/destruction edge cases; continue magic-bag work through non-ordinary sources/targets and shared `obfree()`/`stolen_value()` debt naming.
3. Finish remaining `sellobj()` follow-ups: complete recursive `subfrombill()` integration, broken/container projectile impact edge cases, and shared-helper integration for less ordinary object transfers.
4. Move payment toward a complete C `dopay()` model for legacy fallbacks and remaining itemized prompt edge cases.
5. Continue wish finalization by replacing local parser/finalizer tables with registry-backed `oc_merge`, `oc_charged`, non-wishable substitution, and artifact provenance rules.

## Verification

For each code slice:

1. Run syntax checks for changed JS files with `node --check`.
2. Run focused source-derived smoke tests for the touched behavior.
3. Run `npm run score`.
4. Commit and push once the public suite remains green or the intentional regression is documented.
