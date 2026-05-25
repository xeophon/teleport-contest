# C Parity Audit Index

This folder records source-backed audits against `nethack-c/upstream`. The notes are planning material for a real NetHack C-to-JS port; public session fixtures are only regression guards and must not drive hidden or fixture-specific behavior.

## Audit Files

- [01-input-commands-windows.md](01-input-commands-windows.md): command dispatch, key binding, extended commands, prompts, windows, menus, and help.
- [02-objects-wishing-readobjnam.md](02-objects-wishing-readobjnam.md): object metadata, canonical object creation, `mkobj`, timers, artifacts, wishes, and `readobjnam`.
- [03-levelgen-specials-quest.md](03-levelgen-specials-quest.md): `mklev`, bones-before-generation ordering, special levels, quest maps, quest text, shops, and ordinary rooms.
- [04-monsters-combat-pets.md](04-monsters-combat-pets.md): monster placement, scheduler phases, movement, pet behavior, combat, passives, projectiles, and migration.
- [05-food-inventory-containers-shops.md](05-food-inventory-containers-shops.md): eating, tins, pickup/drop, containers, tipping, and shop billing.
- [06-save-restore-bones.md](06-save-restore-bones.md): versioned save schema, serialized levels, migrations, ID maps, timers, and bones sanitation.
- [07-traps-liquids-terrain.md](07-traps-liquids-terrain.md): traps, water/lava/sinks, floor effects, ray terrain hooks, burial, ice, and material damage.
- [08-display-rng-observation.md](08-display-rng-observation.md): display/window lifecycle, glyphs, discovery, hallucination redraws, message/status ordering, and RNG trace diagnostics.

## Cross-Cutting Themes

- Replace scattered JS fields with C-shaped ownership boundaries: object registry/factory, shop bill ledger, monster placement/scheduler, save schema, and window/menu contracts.
- Move object transfers through shared helpers. Pickup, drop, shop, container, tip, floor effects, ice, burial, and save/restore should not each invent metadata cleanup.
- Centralize source-visible pipelines before adding more special cases: command parsing, level generation finalization, monster turns, terrain effects, and display redraw ordering.
- Keep public sessions as tests only. Implementation slices should be justified by upstream C behavior and local source references, not by private-suite inference.

## Ranked Roadmap

1. Shop ledger foundation from `05`: current JS is field-based, misses `addtobill`/`sellobj`/`subfrombill`/`costly_alteration`, and has a known multi-item payment message bug.
2. Object registry and canonical object factory from `02`: `mkobj`, wishes, weight, timers, names, and display should share one metadata source.
3. Level generation lifecycle and minimal `sp_lev` layer from `03`: fix generation ordering, shared finalization, and special/quest level data drift.
4. Command, prompt, and menu registry from `01`: remove literal-key dispatch drift and make `getlin`, `yn_function`, extended commands, and menus reusable.
5. Monster placement, scheduler, and combat cores from `04`: build shared `goodpos`, turn phases, `hmon`, `mattackm`, passive, and projectile contracts.
6. Save/restore/bones schema from `06`: serialize levels explicitly, restore through ID maps, and make timers/migration/bones source-visible.
7. Trap, liquid, terrain, and material-damage primitives from `07`: add one post-placement terrain pipeline and shared object damage rules.
8. Display, RNG, glyph, and discovery diagnostics from `08`: make trace drift visible, then centralize discovery/glyph/redraw ordering.

## Selected Next Slice

Start with the shop area because it combines a visible current bug with a high-impact missing C subsystem.

- Fix the multi-item pay message to use the computed cash total.
- Then introduce a small bill-ledger model keyed by shopkeeper and object identity.
- Keep `unpaid` and `unpaidPrice` as compatibility/display fields while migrating callers.
- Wire the first ledger helpers through payment, then extend to pickup/drop and container moves.

Every code slice should be followed by source-derived smoke checks plus `npm run score`.
