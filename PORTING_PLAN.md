# NetHack C-to-JS Porting Plan

Last refreshed: 2026-05-28.

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

Detailed source-backed history is kept in `docs/c-parity-audit/`. Keep this section short; completed slice details belong in the audit files.

- Removed fixture replay/runtime shortcuts and rebuilt covered behavior around live game state; public sessions remain regression guards only.
- Built a broad starter shop-ledger surface: bill rows, split/subtract helpers, shared lost-merchandise debt for covered projectile/magic-bag/hole/statue/burial/direct-ice/floor-polymorph/floor-stone-to-flesh callers, used-up debt, itemized `#pay`, pickup/drop/container/tip flows, bill-limit handling, and many covered destruction/alteration charging paths.
- Added boulder push shop-boundary billing: inside-shop to boundary/free `addtobill()` rows, owner-shop return `subfrombill()`, and fully-outside debt conversion.
- Added magic-bag trigger explosion billing: a bag of holding that triggers a target magic-bag explosion now carries C's held/floor `do_boh_explosion()` context into vanished-content `stolen_value()`/used-up billing.
- Added kicked-container impact billing: hard impacts from thrown inventory containers keep paid contents no-charge, while kicked shop-floor containers bill broken shop-owned contents through `stolen_value()`-style routing.
- Added force-destroyed shop box owner billing: shattered contents now charge the shopkeeper who owns the bill row before the box itself is charged to the source shop.
- Added statue shatter owner billing: hero-caused statue trap shatter now charges an existing live statue bill row to its owning shopkeeper before contents move to the animated monster.
- Added forced chest material wording: non-potion contents destroyed by a shattered box now use C's paper/wax/veggy/flesh/glass/wood/default destruction verbs.
- Added forced chest occupation parity: blade forcing can break the wielded weapon before the success roll, and blunt forcing wakes nearby sleepers without angering them.
- Added focused object, food, timer, and wish parity slices: ordinary eating, special-food merge gates, egg timer cleanup, wish-local monster/object binding, charged tools/instruments, and stone-to-flesh carried/floor marble-wand transformations plus stoning/polyself rescue.
- Expanded potion `#dip`, alchemy, broken-vapor, inventory/fire/hot-ground vapor, gremlin/lycanthropy water vapor, forced chest-content potion shatter, direct hero-thrown confusion/booze/paralysis/sleeping/blindness/speed/invisibility/hallucination/healing-family/restore-gain/common-no-effect/oil/sickness/neutral-water/acid/special-water-shapechanger-saddle/polymorph `potionhit()`, generic saddle interception for supported direct potion hits, and statue-trap shatter debt coverage.
- Latest verified public score: `44/44`.

## Current Priorities

1. Shared shop ownership helpers.
   - Source notes: `docs/c-parity-audit/05-food-inventory-containers-shops.md`, `docs/c-parity-audit/51-subagent-findings-2026-05-28.md`, `docs/c-parity-audit/52-subagent-findings-2026-05-28.md`, `docs/c-parity-audit/53-subagent-findings-2026-05-28.md`, `docs/c-parity-audit/54-subagent-findings-2026-05-28.md`, `docs/c-parity-audit/57-subagent-findings-2026-05-28.md`, `docs/c-parity-audit/58-subagent-findings-2026-05-28.md`, `docs/c-parity-audit/60-subagent-findings-2026-05-28.md`, `docs/c-parity-audit/61-subagent-findings-2026-05-28.md`, `docs/c-parity-audit/62-subagent-findings-2026-05-28.md`, `docs/c-parity-audit/63-subagent-findings-2026-05-28.md`, and `docs/c-parity-audit/64-subagent-findings-2026-05-28.md`.
   - Replace remaining field-only paths with C-shaped `addtobill`, `subfrombill`, `stolen_value`, `obfree`, and `sellobj` routing.
   - Near-term callers: remaining magic-bag valuation edges outside covered held/floor trigger context, projectile/kick `ship_object()` down-gate and floor-pile loss, generic `obfree()` preservation, broader costly-alteration paths, and remaining stone-to-flesh object rows.
   - Note: ordinary drop `sellobj()` is square-selected in C and should not be converted to owner-first routing without a new source anchor.

2. Direct object-hit and potion delivery.
   - Source notes: `docs/c-parity-audit/04-monsters-combat-pets.md`, `docs/c-parity-audit/47-subagent-findings-2026-05-28.md`, `docs/c-parity-audit/50-subagent-findings-2026-05-28.md`, `docs/c-parity-audit/55-subagent-findings-2026-05-28.md`, `docs/c-parity-audit/56-subagent-findings-2026-05-28.md`, `docs/c-parity-audit/57-subagent-findings-2026-05-28.md`, `docs/c-parity-audit/59-subagent-findings-2026-05-28.md`, `docs/c-parity-audit/65-subagent-findings-2026-05-28.md`, `docs/c-parity-audit/66-subagent-findings-2026-05-28.md`, `docs/c-parity-audit/68-subagent-findings-2026-05-28.md`, `docs/c-parity-audit/69-subagent-findings-2026-05-28.md`, `docs/c-parity-audit/70-subagent-findings-2026-05-28.md`, `docs/c-parity-audit/71-subagent-findings-2026-05-28.md`, `docs/c-parity-audit/72-subagent-findings-2026-05-28.md`, `docs/c-parity-audit/73-subagent-findings-2026-05-28.md`, `docs/c-parity-audit/74-subagent-findings-2026-05-28.md`, `docs/c-parity-audit/75-subagent-findings-2026-05-28.md`, `docs/c-parity-audit/76-subagent-findings-2026-05-28.md`, `docs/c-parity-audit/77-subagent-findings-2026-05-28.md`, `docs/c-parity-audit/78-subagent-findings-2026-05-28.md`, `docs/c-parity-audit/79-subagent-findings-2026-05-28.md`, and `docs/c-parity-audit/80-subagent-findings-2026-05-28.md`.
   - Broaden the new hero-thrown confusion/booze/paralysis/sleeping/blindness/speed/invisibility/hallucination/healing-family/common-no-effect/oil/sickness/neutral-water/acid/special-water-shapechanger-saddle/polymorph hit path toward full `potionhit()` one delivery edge at a time.
   - Remaining gaps include bash delivery, non-`kn` `trycall()` prompts, exact visibility/discovery handling beyond covered direct/vapor cases, adjacent vapor for common no-effect potions, shifted-vampire lethal revival, full burning-oil explosion collateral, and full `newcham()` target-selection/equipment fallout beyond the narrow polymorph-potion slice.

3. Object registry and canonical object factory.
   - Source notes: `docs/c-parity-audit/02-objects-wishing-readobjnam.md`.
   - Consolidate object metadata for type, class, material, weight, cost, probability, wishability, merge rules, damage predicates, timers, and charged-tool policy.
   - Continue replacing parser-local wish and merge tables with registry-backed finalization, artifact provenance, and save/bones fruit-id handling.

4. Monster placement, scheduler, and combat cores.
   - Source notes: `docs/c-parity-audit/04-monsters-combat-pets.md`.
   - Build shared `goodpos`, `enexto`, monster lifecycle, turn phases, `hmon`, `mattackm`, passive, and projectile/object-hit paths.
   - Compact current candidates: direct monster-object hit follow-ups and broader `polymon()` stoning interactions.

5. Level, trap, terrain, save, and display foundations.
   - Source notes: `docs/c-parity-audit/03-levelgen-specials-quest.md`, `06-save-restore-bones.md`, `07-traps-liquids-terrain.md`, and `08-display-rng-observation.md`.
   - Centralize special-level generation, saved-level/migration/timer state, trap/liquid/material-damage pipelines, glyph/discovery/redraw ordering, and RNG diagnostics.

6. Command, prompt, and menu contracts.
   - Source notes: `docs/c-parity-audit/01-input-commands-windows.md` and `docs/c-parity-audit/67-subagent-findings-2026-05-28.md`.
   - Add reusable command registry/binding, count parsing, `getlin`, `yn_function`, `getobj`, `getpos`, and menu-selection primitives.

## Immediate Slice

Continue narrow C-backed slices in this order unless a failing public regression points elsewhere:

1. Broaden direct `potionhit()` delivery beyond the covered monster-effect families through the next compact C-backed delivery edge; full burning-oil explosion collateral belongs with broader explosion work, shifted-vampire lethal revival belongs with broader monster death lifecycle work, and full `newcham()` fidelity belongs with the monster lifecycle/equipment core.
2. Continue broader stone-to-flesh object coverage through registry-backed material/object metadata, object resistance, remaining object rows, and floor/beam/shop routing.
3. Continue registry-backed cleanup for merge/wish/charged-tool metadata after each concrete caller lands.
4. Keep forced-chest follow-ups narrow and source-backed: exact 50-turn/no-hands occupation cleanup, registry-backed weapon `oc_wldam` chance, buried-zombie wake disturbance, mimic/disguise wake reveal, and ice-box corpse timer details.

## Verification

For each code slice:

1. Run syntax checks for changed JS files with `node --check`.
2. Run focused source-derived smoke tests for the touched behavior.
3. Run `npm run score`.
4. Commit and push once the public suite remains green or the intentional regression is documented.
