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

1. Shop ledger foundation from `05`: current JS is still partly field-based; split-stack unpaid returns, itemized bill-row payment, unpaid food first-bite billing, starter partial-use `check_unpaid_usage()` debit coverage including wand zaps, camera use, can-of-grease applications, lamp and potion-of-oil apply lighting, magic-lamp `#rub` djinni release, spellbook study completion, magic-marker writing, tinning-kit corpse applications, crystal-ball gazing, shared musical-instrument apply coverage for ordinary no-charge instruments plus magic flute/harp improvisation and frost/fire horn zaps, narrow tin open/trap-destroy billing, failed spellbook read destruction, carried and hero-caused floor fire destruction, accepted shop-floor container put-in sales, shop-floor container take-out slot/burden/partial-stack preflight plus artifact blast/evasion, fatal touch-petrifying corpse checks, loadstone lift exceptions, and contained boulder lift exceptions, single-object floor pickup slot/burden/partial-stack preflight including gold lift splitting, scare-monster scroll state/dust/type-call billing including menu pickup basics, preflight-before-shop-quote ordering for single shop-floor pickup, loadstone weight/slot exceptions, and multi-pickup partial-success ordering with per-item burden prompts and gold lift preflight, ordinary shop-floor magic-bag tip loss/put-in explosion billing, narrow carried magic-bag held-loss billing, magic-bag scatter break/useup and destructive floor-effect preservation, ordinary dropped-container sale/no-charge state, direct gold drop/pickup donation/charge parity, loadstone drop/throw/stash refusal basics, broader angry/robbed `sellobj()` shopkeeper-state branches, and CANDLESHOP candelabrum special-stock/no-sale uninterested branches are covered in ordinary paths, but broad split routing, generic `obfree()`/container-aware `stolen_value()` parity, non-ordinary magic-bag source/target cases, remaining charge-consuming `check_unpaid_usage()` callers, and non-bite `costly_alteration` coverage outside narrow food/tin paths are missing.
2. Object registry and canonical object factory from `02`: `mkobj`, wishes, weight, timers, names, and display should share one metadata source.
3. Level generation lifecycle and minimal `sp_lev` layer from `03`: fix generation ordering, shared finalization, and special/quest level data drift.
4. Command, prompt, and menu registry from `01`: remove literal-key dispatch drift and make `getlin`, `yn_function`, extended commands, and menus reusable.
5. Monster placement, scheduler, and combat cores from `04`: build shared `goodpos`, turn phases, `hmon`, `mattackm`, passive, and projectile contracts.
6. Save/restore/bones schema from `06`: serialize levels explicitly, restore through ID maps, and make timers/migration/bones source-visible.
7. Trap, liquid, terrain, and material-damage primitives from `07`: add one post-placement terrain pipeline and shared object damage rules.
8. Display, RNG, glyph, and discovery diagnostics from `08`: make trace drift visible, then centralize discovery/glyph/redraw ordering.

## Selected Next Slice

Continue with the shop area because it combines visible current behavior with a high-impact missing C subsystem.

- Keep `unpaid` and `unpaidPrice` as compatibility/display fields while migrating callers.
- Recursive container put-in, take-out, tip moves, contained gold, accepted put-in sales, slot/maximum-carry take-out preflight, burden prompts, partial stack lifting, loadstone lift/let-go basics, contained boulder lift/Sokoban/rock-throwing exceptions, single-object floor burden prompts, floor gold lift splitting, floor boulder lift/Sokoban/rock-throwing exceptions, scare-monster scroll pickup state/dusting/type-call ordering for single and menu pickup, single shop-floor quote gating after floor preflight, multi-pickup partial-success ordering with per-item burden prompts and gold lift preflight, artifact blast/evasion and fatal touch-petrifying corpse checks, stackable no-charge/same-price unpaid take-out inventory merges, ordinary shop-floor magic-bag tip loss/put-in explosion billing, narrow carried magic-bag held-loss billing, magic-bag scatter break/useup and destructive floor-effect preservation, ordinary dropped-container sale/no-charge state, direct ordinary gold drop/pickup handling, broader angry/robbed `sellobj()` handling, and special-stock/uninterested no-sale handling are in place; next extend them through non-ordinary magic-bag sources/targets, scare-scroll message polish, exact C quote/menu-display polish, generic merge/destruction ownership, and full `sellobj`/`subfrombill` routing.
- Finish remaining `sellobj()` parity around recursive `subfrombill()` integration, broken/container projectile impact edge cases, and shared-helper use in less ordinary transfer paths.
- Continue moving payment toward complete C `dopay()` semantics for containers, queued itemized selections, and robbed-shop interactions.

Every code slice should be followed by source-derived smoke checks plus `npm run score`.
