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
- Built a broad starter shop-ledger surface: bill rows, split/subtract helpers, used-up debt, itemized `#pay`, pickup/drop/container/tip flows, bill-limit handling, and many covered destruction/alteration charging paths.
- Added focused object, food, timer, and wish parity slices: ordinary eating, special-food merge gates, egg timer cleanup, wish-local monster/object binding, charged tools/instruments, and self-cast stone-to-flesh carried marble-wand transformation.
- Expanded potion `#dip`, alchemy, broken-vapor, inventory/fire/hot-ground vapor, gremlin water vapor, forced chest-content potion shatter, and direct hero-thrown confusion/booze `potionhit()` coverage.
- Latest verified public score: `44/44`.

## Current Priorities

1. Shared shop ownership helpers.
   - Source notes: `docs/c-parity-audit/05-food-inventory-containers-shops.md`.
   - Replace remaining field-only paths with C-shaped `addtobill`, `subfrombill`, `stolen_value`, `obfree`, and `sellobj` routing.
   - Near-term callers: statue shatter debt, remaining magic-bag valuation/source/target cases, less ordinary projectile/container loss, and broader costly-alteration paths.

2. Direct object-hit and potion delivery.
   - Source notes: `docs/c-parity-audit/04-monsters-combat-pets.md` and `docs/c-parity-audit/47-subagent-findings-2026-05-28.md`.
   - Broaden the new hero-thrown confusion/booze hit path toward full `potionhit()` one effect family at a time.
   - Remaining gaps include bash delivery, non-`kn` `trycall()` prompts, exact visibility/discovery handling, blindness/sleep/paralysis/hallucination/healing/harming/water/oil/acid/polymorph effects, and lycanthropy water vapor.

3. Object registry and canonical object factory.
   - Source notes: `docs/c-parity-audit/02-objects-wishing-readobjnam.md`.
   - Consolidate object metadata for type, class, material, weight, cost, probability, wishability, merge rules, damage predicates, timers, and charged-tool policy.
   - Continue replacing parser-local wish and merge tables with registry-backed finalization, artifact provenance, and save/bones fruit-id handling.

4. Monster placement, scheduler, and combat cores.
   - Source notes: `docs/c-parity-audit/04-monsters-combat-pets.md`.
   - Build shared `goodpos`, `enexto`, monster lifecycle, turn phases, `hmon`, `mattackm`, passive, and projectile/object-hit paths.
   - Compact current candidates: statue shatter animation/debt sequencing and stone-golem polyself rescue through stone to flesh.

5. Level, trap, terrain, save, and display foundations.
   - Source notes: `docs/c-parity-audit/03-levelgen-specials-quest.md`, `06-save-restore-bones.md`, `07-traps-liquids-terrain.md`, and `08-display-rng-observation.md`.
   - Centralize special-level generation, saved-level/migration/timer state, trap/liquid/material-damage pipelines, glyph/discovery/redraw ordering, and RNG diagnostics.

6. Command, prompt, and menu contracts.
   - Source notes: `docs/c-parity-audit/01-input-commands-windows.md`.
   - Add reusable command registry/binding, count parsing, `getlin`, `yn_function`, `getobj`, `getpos`, and menu-selection primitives.

## Immediate Slice

Continue narrow C-backed slices in this order unless a failing public regression points elsewhere:

1. Statue-trap shatter shop debt: charge a costly shattering statue and contents before moving contents to the animated monster, preserving normal/search activation behavior.
2. Stone-to-flesh rescue: clear active stoning and convert stone-golem polyself to flesh golem before broader material-object transformations.
3. Broaden direct `potionhit()` delivery beyond confusion/booze while keeping unsupported potions on the old landing path until each effect is source-backed.
4. Close remaining forced-chest gaps: blade breakage during long forcing, blunt wake-nearby behavior, and material-specific non-potion shatter wording.
5. Continue registry-backed cleanup for merge/wish/charged-tool metadata after each concrete caller lands.

## Verification

For each code slice:

1. Run syntax checks for changed JS files with `node --check`.
2. Run focused source-derived smoke tests for the touched behavior.
3. Run `npm run score`.
4. Commit and push once the public suite remains green or the intentional regression is documented.
