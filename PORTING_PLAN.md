# NetHack C-to-JS Porting Plan

Last refreshed: 2026-05-25.

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
- Added the first shop bill ledger scaffold for newly picked-up shop items, horn-created shop objects, and payment removal while preserving legacy unpaid display fields.
- Added source-derived shop billing helper tests, wired multi-pickup through the ledger, and made unpaid non-container drops in shops clear the bill like the early `sellobj()` return path.
- Made ordinary food pickup respect C unpaid merge rules: unpaid shop food no longer merges into paid stacks, and compatible unpaid stack merges carry the bill total forward.
- Added the paid non-container `sellobj()` side for ordinary shop drops: C-style stocked-item sale offers, cash transfer, cashless credit offers, and declined-sale `no_charge` pickup semantics.
- Moved ordinary stackable non-food pickup merges through bill-aware helpers for compatible paid stacks and same-price unpaid shop stacks.
- Started C-shaped `splitbill`/`subfrombill` compatibility for unpaid stack returns: split parent/child bill rows, used-up residual quantities, and safer orphan fallback handling.
- Made partial unpaid inventory use preserve the C `bquan > quan` bill representation and visible unpaid total until return/payment resolves the used-up part.
- Wired unpaid throw/fire projectile splits through child bill rows and same-shop bill return before floor stacking.
- Latest verified public score: `44/44`.

## Current Priorities

1. Shop ledger foundation.
   - Source notes: `docs/c-parity-audit/05-food-inventory-containers-shops.md`.
   - Current JS tracks unpaid state on objects instead of a C-shaped bill ledger.
   - Missing or partial concepts include full `addtobill`, full `subfrombill` routing, container/gold `sellobj`, `dropped_container`, `picked_container`, `check_unpaid_usage`, and `costly_alteration`.
   - The next narrow C-backed gap is finishing projectile shop resolution for thrown/fired merchandise that leaves the owning shop, then itemized payment normalization for partly used stacks.

2. Object registry and canonical object factory.
   - Source notes: `docs/c-parity-audit/02-objects-wishing-readobjnam.md`.
   - Create one object metadata registry for type, class, material, weight, cost, probability, wishability, merge rules, and damage predicates.
   - Add a C-shaped object factory before deeper `mkobj`, wishing, artifact, and timer work.
   - Remove the non-C fallback where an unrecognized wish becomes an arbitrary named weapon.

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

1. Finish thrown/fired unpaid projectile shop resolution: stolen-value debit/robbed conversion and bill-aware floor stacking.
2. Extend ledger use to container put-in, take-out, and tip moves.
3. Expand `sellobj()` beyond ordinary paid non-container objects to container contents, gold donation/credit, robbed-shop, and angry-shopkeeper edge cases.
4. Move payment toward authoritative bill rows and shop credit instead of object-field collection.

## Verification

For each code slice:

1. Run syntax checks for changed JS files with `node --check`.
2. Run focused source-derived smoke tests for the touched behavior.
3. Run `npm run score`.
4. Commit and push once the public suite remains green or the intentional regression is documented.
