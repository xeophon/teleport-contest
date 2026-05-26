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

Detailed source-backed history is kept in `docs/c-parity-audit/`. Current completed work is summarized here so the active plan stays readable.

- Removed fixture replay/runtime shortcuts and rebuilt gameplay around live state; public sessions remain regression tests only.
- Established the shop bill ledger scaffold: bill rows, split/subtract helpers, unpaid display sync, used-up bill preservation, credit/debit/loan handling, and itemized `#pay` support.
- Ported broad ordinary shop transfer paths: pickup/drop pricing, stack-aware bill merges including same-shop bill-row proof for unpaid pickup/container/food merges and ordinary food-ration plus expanded simple `FOOD(...)` pickup/full-inventory merge compatibility, paid-object sale/no-sale handling, dropped-container sale state, direct gold donation/charging, shop-floor container put-in/take-out/tip billing with ledger-first stale-field cleanup and live split-bill handling, and key loadstone/boulder/artifact/touch preflight cases.
- Added focused C-style object-loss and alteration billing: food bites, tins, failed spellbook reads, carried fire destruction/ignition, hero-caused floor fire, ordinary carried-drop and tipped-shop-good terrain destruction, box lock break, cream-pie splat, remove-curse unholy-water devaluation, cursed charging uncharge/disenchant alteration, cursed enchant weapon degradation/disenchantment, cursed enchant armor disenchantment, confused proof-stripping degradation, blessed destroy-armor erosion, cursed wand backfire, magic-bag loss/scatter/blast paths, carried magic-bag apply message/turn-cost gating, paid-container unpaid-content cleanup before shop-floor magic-bag put-in explosions, shop-floor nested-trigger tip explosions, partly eaten food lost-merchandise exclusion, cursed magic-bag extracted-container contained-gold and unbilled nested-content exclusions, floor bag-of-tricks `#loot`, hard-landing projectile container-content impact, top-level hard-landing projectile breakage, same-shop paid projectile sale and thrown-gold projectile donation before stacking, container-aware projectile `stolen_value()` debt conversion, hole/trapdoor `ship_object()` debt routing, and carried `ship_object()` fragile breakage after debt but before migration.
- Removed the latest stale field-only unpaid fallbacks from recursive debt/loss and generic used-up tracking: projectile debt, shop-floor container take-out/tip billing, carried magic-bag held loss, shop-floor magic-bag lost stock, corpse/glob deletion, and shop-floor magic-bag explosion triggers now require real bill rows for unpaid authority while preserving current shop-floor stock pricing.
- Broadened charged-object and instrument usage parity: wand zaps/engraving, no-effect wand `#apply` break usage plus `COST_DSTROY` dummy billing, camera, can of grease including `#tip` spillage billing, floor horn exclusion from `#tip`, floor bag-of-tricks `#tip` alternate emptying, lamps/oil, magic lamps, spellbook study, magic markers, tinning kits, crystal balls, magic flute/harp, frost/fire horns, alternate emptying, drums, ordinary instrument shell behavior, and Bell of Opening charged-use billing/invocation priming.
- Improved C-style command/menu/payment details: multi-pickup partial-success ordering, burden/gold/scare-scroll menu handling, shop quote ordering/text, robbed-only `#pay`, angry-not-robbed `#pay` appeasement, itemized `#pay` row ordering/tie-breaks/headings/affordability, traditional `Itemized billing? [ynq m]` handling, debit-before-itemized settlement, selected-row insufficient-funds wording, nonresident distance payment refusal, and C-shaped `#pay` target scanning plus `Pay whom?` validation and monster/object cursor cycling for live/resident/visible shopkeepers.
- Added the ordinary victual runtime slices: carried and floor `food ration`, `pancake`, `lembas wafer`, `cram ration`, `tripe ration`, and `enormous meatball` now use C-style first-bite `oeaten`/`nmod` timing, per-tick later bites, finish-time removal, one-time first-bite stack/shop billing, race-adjusted hunger for lembas/cram, tripe first-bite race/form feedback plus flesh conduct, cursed/age-rotten first-bite handling, full-warning/finally-finished state, fatal choking/vomit recovery, Breathless/Hunger recovery exemptions, Strangled ordinary-eating start gating/no-random-recovery handling, and choking life-saving hunger reset for satiated-start meals, and same-object interruption/resume messages/state including satiated continue prompts. Delay-one carried/floor apple, orange, pear, melon, banana, carrot, meatball, kelp frond, sprig of wolfsbane, clove of garlic, eucalyptus leaf, cream pie, candy bar, fortune cookie, K-ration, and C-ration now also use the first-bite stack/shop billing path and finish without an occupation, preserving plant-food conduct, meatball flesh conduct, pear's UNIX core-dump feedback, carrot/wolfsbane/garlic/eucalyptus plant post-effects, cream-pie/candy-bar animal-product conduct, K/C bland feedback, cursed-apple sleep, and fortune-cookie paper/rumor post-effects.
- Improved wishing/object parsing in narrow slices: invalid wish retry/random fallback, exact `nothing`/`nil`/`none` no-wish declines, C wished-gold quantity bounds including the non-wizard `5000` cap, selected wizard trap wishes as non-object results including C's beartrap/land-mine object-vs-armed-trap ambiguity, denied quest-artifact disappearance conduct, quantity and requested `spe` constraints, charge suffix parsing, wizard-mode Candelabrum/Book name and description wishes plus selected non-wizard substitutions and the Bell namedesc silver-bell path, `empty horn of plenty`, final wished-object `owt`, lenses weight/pair naming/namedesc bound, meat-ring plural/weight, candle wished weight, horn-of-plenty concrete object identity, concrete pancake/cram/kelp/royal-jelly/meatball/enormous-meatball/K/C ration metadata, wish-local charged-tool metadata for bag of tricks, expensive camera, tinning kit, can of grease, magic marker, crystal ball, magic flute, frost horn, fire horn, horn of plenty, magic harp, drum of earthquake, and the Bell of Opening path, wand-of-wishing abuse-charge coverage, crystal-ball initialization, and known charge display.
- Latest verified public score: `44/44`.

## Current Priorities

1. Shop ledger foundation.
   - Source notes: `docs/c-parity-audit/05-food-inventory-containers-shops.md`.
   - Current JS has a starter bill ledger; `unpaid`/`unpaidPrice` now act mostly as compatibility/display fields in covered shop paths, but full C ownership and bill-entry routing is still not centralized.
   - Missing or partial concepts include full `addtobill`, full `subfrombill` routing, non-ordinary magic-bag source/target cases, full `obfree()`/container-aware `stolen_value()` helper integration, shared `sellobj()` helper integration beyond ordinary branches, remaining add-inventory/no-charge cleanup outside ordinary shop pickup, less-common `check_unpaid_usage` caller coverage, and non-bite `costly_alteration` coverage outside the narrow food/tin/box-lock/cream-pie/remove-curse-water/cursed-charging/cursed-enchant-weapon/cursed-enchant-armor/confused-proof-stripping/blessed-destroy-armor-erosion/no-effect-wand-break paths.
   - The next narrow C-backed gaps are remaining magic-bag loss-valuation/source/target cases after the covered paid-container put-in cleanup, shop-floor nested tip explosion, partly eaten food, carried apply turn-cost/message, and extracted-container nested-content valuation slices, remaining merge/destruction edge cases beyond the completed simple `FOOD(...)` pickup merge path, artifact touch side effects outside floor pickup/container take-out, less ordinary projectile ownership branches beyond same-shop paid/gold landing, full `obfree()`/container-aware `stolen_value()` debt naming, less ordinary `addtobill()`/quote positioning outside whole-container pickup, and remaining costly-alteration paths outside the covered carried-object slices.

2. Object registry and canonical object factory.
   - Source notes: `docs/c-parity-audit/02-objects-wishing-readobjnam.md`.
   - Create one object metadata registry for type, class, material, weight, cost, probability, wishability, merge rules, and damage predicates.
   - Add a C-shaped object factory before deeper `mkobj`, wishing, artifact, and timer work.
   - Continue replacing the independent wish parser with C-shaped matching, full `objects[].oc_merge`/`oc_charged` metadata beyond the local food and charged-tool overlays, full result-kind splitting, artifact provenance, remaining non-wishable filtering, and registry-backed object finalization rules.

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

Continue narrow C-backed slices:

1. Continue ordinary victual runtime beyond the covered carried/floor delayed rows (`food ration`, `pancake`, `lembas wafer`, `cram ration`, `tripe ration`, and `enormous meatball`) and covered delay-one apple/orange/pear/melon/banana/carrot/meatball/kelp-frond/sprig-of-wolfsbane/clove-of-garlic/eucalyptus-leaf/cream-pie/candy-bar/fortune-cookie/K-ration/C-ration rows: broader non-ordinary food branches, remaining non-ordinary/special delay-one rows/effects, and remaining platform-specific apple message policy remain separate source-backed slices.
2. Continue magic-bag work through remaining source/target ordering, loss valuation, and shared `obfree()`/`stolen_value()` debt naming after the paid-container put-in, shop-floor nested tip, carried apply turn-cost/message, extracted-container nested-content valuation, and stale take-out/tip billing slices.
3. Broaden merge parity beyond the completed simple `FOOD(...)` pickup path: the current covered rows are exact `food ration`, `pancake`, `lembas wafer`, `cram ration`, `cream pie`, `fortune cookie`, `lump of royal jelly`, `meatball`, `enormous meatball`, `K-ration`, `C-ration`, `apple`, `orange`, `pear`, `melon`, `banana`, `carrot`, `kelp frond`, `sprig of wolfsbane`, `clove of garlic`, and `eucalyptus leaf` identity with C object-name compatibility, BUC/state checks, age averaging, no-charge normalization, C unit weights/costs where needed, same-shop/unit-price proof for ordinary unpaid pickup merges, and C's conservative full-inventory billable shop-floor preflight rejection; next narrow merge targets are slime mold/custom fruits, corpses, tins, eggs, globs, and broader `oc_merge` metadata when their C fields, naming, and timers are modeled.
4. Finish remaining `sellobj()` follow-ups: complete recursive `subfrombill()` integration, less ordinary projectile ownership branches beyond same-shop paid/gold landing, and shared-helper integration for less ordinary object transfers.
5. Continue wish finalization by replacing local parser/finalizer tables with registry-backed `oc_merge`, `oc_charged`, `oc_nowish`, canonical weight, and artifact provenance rules; exact no-wish declines, wished-gold bounds, selected wizard trap non-object results including beartrap/land-mine ambiguity, denied quest-artifact conduct, selected Candelabrum/Book/Bell/magic-lamp substitutions, concrete food rows, and charged-tool metadata for bag of tricks, expensive camera, tinning kit, can of grease, magic marker, crystal ball, charged instruments, horn of plenty, drum of earthquake, and the Bell of Opening path are covered, so next small rows should focus on broader `oc_nowish`, artifact provenance, remaining unique/invocation-object policy, terrain/furniture non-object results, and generated-weight/factory unification.

## Verification

For each code slice:

1. Run syntax checks for changed JS files with `node --check`.
2. Run focused source-derived smoke tests for the touched behavior.
3. Run `npm run score`.
4. Commit and push once the public suite remains green or the intentional regression is documented.
