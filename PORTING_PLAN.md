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
- Ported broad ordinary shop transfer paths: pickup/drop pricing, stack-aware bill merges including same-shop bill-row proof for unpaid pickup/container/food merges, paid-object sale/no-sale handling, dropped-container sale state, direct gold donation/charging, shop-floor container put-in/take-out/tip billing with ledger-first stale-field cleanup and live split-bill handling, and key loadstone/boulder/artifact/touch preflight cases.
- Added focused C-style object-loss and alteration billing: food bites, tins, failed spellbook reads, carried fire destruction/ignition, hero-caused floor fire, ordinary carried-drop and tipped-shop-good terrain destruction, box lock break, cream-pie splat, remove-curse unholy-water devaluation, cursed charging uncharge/disenchant alteration, cursed enchant weapon degradation/disenchantment, cursed enchant armor disenchantment, confused proof-stripping degradation, cursed wand backfire, magic-bag loss/scatter/blast paths, carried magic-bag apply message/turn-cost gating, paid-container unpaid-content cleanup before shop-floor magic-bag put-in explosions, shop-floor nested-trigger tip explosions, partly eaten food lost-merchandise exclusion, floor bag-of-tricks `#loot`, hard-landing projectile container-content impact, top-level hard-landing projectile breakage, container-aware projectile `stolen_value()` debt conversion, hole/trapdoor `ship_object()` debt routing, and carried `ship_object()` fragile breakage after debt but before migration.
- Removed the latest stale field-only unpaid fallbacks from recursive debt/loss and generic used-up tracking: projectile debt, shop-floor container take-out/tip billing, carried magic-bag held loss, shop-floor magic-bag lost stock, corpse/glob deletion, and shop-floor magic-bag explosion triggers now require real bill rows for unpaid authority while preserving current shop-floor stock pricing.
- Broadened charged-object and instrument usage parity: wand zaps/engraving, no-effect wand `#apply` break usage plus `COST_DSTROY` dummy billing, camera, can of grease including `#tip` spillage billing, floor horn exclusion from `#tip`, floor bag-of-tricks `#tip` alternate emptying, lamps/oil, magic lamps, spellbook study, magic markers, tinning kits, crystal balls, magic flute/harp, frost/fire horns, alternate emptying, drums, ordinary instrument shell behavior, and Bell of Opening charged-use billing/invocation priming.
- Improved C-style command/menu/payment details: multi-pickup partial-success ordering, burden/gold/scare-scroll menu handling, shop quote ordering/text, robbed-only `#pay`, itemized `#pay` row ordering/tie-breaks/headings/affordability, debit-before-itemized settlement, selected-row insufficient-funds wording, and nonresident distance payment refusal.
- Improved wishing/object parsing in narrow slices: invalid wish retry/random fallback, quantity and requested `spe` constraints, charge suffix parsing, wizard-mode Candelabrum/Book wishes plus the Bell namedesc silver-bell path, `empty horn of plenty`, final wished-object `owt`, lenses weight/pair naming/namedesc bound, meat-ring plural/weight, candle wished weight, horn-of-plenty concrete object identity, wand-of-wishing abuse-charge coverage, crystal-ball initialization, and known charge display.
- Latest verified public score: `44/44`.

## Current Priorities

1. Shop ledger foundation.
   - Source notes: `docs/c-parity-audit/05-food-inventory-containers-shops.md`.
   - Current JS has a starter bill ledger; `unpaid`/`unpaidPrice` now act mostly as compatibility/display fields in covered shop paths, but full C ownership and bill-entry routing is still not centralized.
   - Missing or partial concepts include full `addtobill`, full `subfrombill` routing, non-ordinary magic-bag source/target cases, full `obfree()`/container-aware `stolen_value()` helper integration, shared `sellobj()` helper integration beyond ordinary branches, remaining add-inventory/no-charge cleanup outside ordinary shop pickup, less-common `check_unpaid_usage` caller coverage, and non-bite `costly_alteration` coverage outside the narrow food/tin/box-lock/cream-pie/remove-curse-water/cursed-charging/cursed-enchant-weapon/cursed-enchant-armor/confused-proof-stripping/no-effect-wand-break paths.
   - The next narrow C-backed gaps are remaining magic-bag loss-valuation/source/target cases after the covered paid-container put-in cleanup, shop-floor nested tip explosion, partly eaten food, and carried apply turn-cost/message slices, remaining merge/destruction edge cases, artifact touch side effects outside floor pickup/container take-out, less ordinary projectile ownership branches, full `obfree()`/container-aware `stolen_value()` debt naming, less ordinary `addtobill()`/quote positioning outside whole-container pickup, remaining costly-alteration paths outside the covered carried-object slices, and remaining `#pay` target-selection/branch prompt edge cases.

2. Object registry and canonical object factory.
   - Source notes: `docs/c-parity-audit/02-objects-wishing-readobjnam.md`.
   - Create one object metadata registry for type, class, material, weight, cost, probability, wishability, merge rules, and damage predicates.
   - Add a C-shaped object factory before deeper `mkobj`, wishing, artifact, and timer work.
   - Continue replacing the independent wish parser with C-shaped matching, full `objects[].oc_merge`/`oc_charged` metadata, explicit "nothing" handling, artifact provenance, remaining non-wishable filtering, and registry-backed object finalization rules.

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

1. Move payment toward a complete C `dopay()` model through multi-shopkeeper `Pay whom?`, angry-adjacent priority, resident/visible-shopkeeper scan differences, angry/robbed no-bill branches, and remaining itemized prompt edge cases.
2. Continue magic-bag work through remaining source/target ordering, loss valuation, and shared `obfree()`/`stolen_value()` debt naming after the paid-container put-in, shop-floor nested tip, carried apply turn-cost/message, and stale take-out/tip billing slices.
3. Finish remaining `sellobj()` follow-ups: complete recursive `subfrombill()` integration, less ordinary projectile ownership branches, and shared-helper integration for less ordinary object transfers.
4. Continue wish finalization by replacing local parser/finalizer tables with registry-backed `oc_merge`, `oc_charged`, `oc_nowish`, canonical weight, and artifact provenance rules; next small rows include remaining charged-tool metadata such as bag of tricks, magic marker, and crystal ball, plus broader `oc_nowish`, artifact provenance, and generated-weight/factory unification.

## Verification

For each code slice:

1. Run syntax checks for changed JS files with `node --check`.
2. Run focused source-derived smoke tests for the touched behavior.
3. Run `npm run score`.
4. Commit and push once the public suite remains green or the intentional regression is documented.
