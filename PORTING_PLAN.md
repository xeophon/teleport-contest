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
- Added starter `stolen_value()` parity for thrown/fired unpaid projectiles leaving their owning shop, plus bill-aware floor stack merging for compatible unpaid rows.
- Made shop payment enumerate authoritative bill rows first, split partly used stacks into used-up and intact payment portions, and apply shop credit before cash for item rows.
- Added starter `out_container()` shop billing for ordinary non-gold objects taken from shop-floor containers, using the source container's coordinates and C's no-charge take-back behavior.
- Added starter `in_container()` shop billing for ordinary put-in: whole and partial unpaid stack returns, split child bill rows, outside-shop debt preservation, and no-charge marking for the no-sale path.
- Added starter `tipcontainer()` shop billing for ordinary objects tipped out of shop-floor containers, including floor and carried-target destinations plus stale-coordinate floor-source guards.
- Added loose-gold shop-floor container billing for put-in, take-out, and tip flows using C-shaped credit/debit/loan transitions.
- Added recursive shop-floor container billing for moved containers and contained gold across put-in, take-out, and tip flows.
- Added accepted-sale prompts for shop-floor container put-in, including C-style `sellobj()` cash/credit handling for paid objects and containers placed into shop-floor containers.
- Latest verified public score: `44/44`.

## Current Priorities

1. Shop ledger foundation.
   - Source notes: `docs/c-parity-audit/05-food-inventory-containers-shops.md`.
   - Current JS tracks unpaid state on objects instead of a C-shaped bill ledger.
   - Missing or partial concepts include full `addtobill`, full `subfrombill` routing, remaining container `sellobj` edge cases, robbed/angry shopkeeper gold cases, `dropped_container`, `picked_container`, `check_unpaid_usage`, and `costly_alteration`.
   - The next narrow C-backed gaps are robbed/angry shopkeeper gold cases, shop billing for magic-bag loss/explosion, and remaining dropped-container `sellobj()`/`dropped_container()` state.

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

1. Broaden shop-floor container take-out and tip beyond recursive billing into lift limits, capacity/slot failures, and merge/destruction edge cases; continue put-in through robbed/angry shopkeeper and magic-bag failure paths.
2. Expand `sellobj()` beyond ordinary paid non-container objects and accepted shop-floor container put-in to ordinary gold drops, dropped-container sale state, robbed-shop, and angry-shopkeeper edge cases.
3. Move payment toward a complete C `dopay()` model for containers, queued itemized selections, and robbed-shop interactions.

## Verification

For each code slice:

1. Run syntax checks for changed JS files with `node --check`.
2. Run focused source-derived smoke tests for the touched behavior.
3. Run `npm run score`.
4. Commit and push once the public suite remains green or the intentional regression is documented.
