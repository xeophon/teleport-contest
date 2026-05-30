# NetHack C-to-JS Porting Plan

Last refreshed: 2026-05-31.

## Purpose

Port NetHack 5.0 behavior from the upstream C tree in `nethack-c/upstream` to plain JavaScript. Public session fixtures are regression tests only; they must not be embedded into runtime behavior or used to infer hidden tests.

The current audit source of truth is `docs/c-parity-audit/`.

## Ground Rules

- Justify behavior with upstream C references or existing JS compatibility constraints.
- Keep changes small enough to verify and push regularly.
- Do not hardcode seeds, player names, move counts, screen snapshots, cursor traces, or fixture-specific RNG answers.
- After code changes, run focused checks, public tests, and `npm run score`.
- Keep frozen files unchanged: `js/isaac64.js`, `js/terminal.js`, and `js/storage.js`.

## Recently Completed

Detailed source-backed history is kept in `docs/c-parity-audit/`. This section is intentionally pruned; completed slice details belong in audit files, not in the active plan.

- Removed fixture replay/runtime shortcuts and rebuilt covered behavior around live game state; public sessions remain regression guards only.
- Built the main shop-ledger, used-up billing, itemized `#pay`, pickup/drop/container/tip, projectile, floor-effect, and lost-merchandise helpers needed by the covered slices.
- Covered many focused object, food, timer, wish, charged-tool, instrument, command-menu, and discovery parity rows.
- Covered broad potion delivery and `#dip` rows, including many direct `potionhit()`, upward `toss_up()`, vapor, alchemy, fire, water, and saddle cases.
- Covered broad shop destruction/alteration rows for containers, magic bags, statues, ice boxes, projectile shipping, floor fire, burning oil terrain, shop doors, and owner-aware debt.
- Covered focused stone-to-flesh, object polymorph, wand-polymorph floor-pile shudder, floor-shudder material-golem fallout, vertical wand-polymorph pile targeting, hiding-under vertical wand-polymorph pile targeting, boulder/restack floor-polymorph targeting, lateral wand-polymorph floor-pile ray traversal, monster-first wand-polymorph ray hits, spell-polymorph floor-pile routing, self-polymorph unchanging/learning, successful-polyself no-hands/no-head/no-eyes, sliparm-shirt, breakarm, whirly sliparm, non-whirly small sliparm fallout, deferred shop-aware polyself drops, centaur/slithy boot fallout, horned helmet fallout, forced fedora luck removal, forced helmet stat-bonus removal, silver reflection-off fallout, gray antimagic fallout, white cold-resistance and slow-digestion fallout, slow-digestion attributes/enlightenment display, slow-digestion digest-combat regurgitation, pet food, metallivorous `#eat`, and metal accessory slices.
- Recent command/menu slices:
  - `docs/c-parity-audit/148-apply-getobj-coin-flip-2026-05-29.md`
  - `docs/c-parity-audit/156-gray-stone-apply-use-stone-2026-05-29.md`
  - `docs/c-parity-audit/158-tip-carried-getobj-selection-2026-05-29.md`
  - `docs/c-parity-audit/160-rub-gray-stone-touchstone-shatter-2026-05-29.md`
  - `docs/c-parity-audit/162-tiphat-and-rub-nohands-2026-05-29.md`
  - `docs/c-parity-audit/164-touchstone-effect-bodies-2026-05-29.md`
  - `docs/c-parity-audit/165-touchstone-material-canaries-2026-05-29.md`
  - `docs/c-parity-audit/166-down-gate-migration-routes-2026-05-29.md`
  - `docs/c-parity-audit/167-tiphat-target-conflict-2026-05-29.md`
  - `docs/c-parity-audit/168-carried-drop-down-gate-2026-05-29.md`
  - `docs/c-parity-audit/169-floor-polymorph-unchanging-affected-2026-05-29.md`
  - `docs/c-parity-audit/170-rub-getobj-star-silly-2026-05-29.md`
  - `docs/c-parity-audit/171-carried-gold-drop-down-gate-2026-05-29.md`
  - `docs/c-parity-audit/172-floor-effect-recursive-obfree-2026-05-29.md`
  - `docs/c-parity-audit/173-queued-delivery-break-stack-2026-05-29.md`
  - `docs/c-parity-audit/174-wish-object-ranges-2026-05-29.md`
  - `docs/c-parity-audit/175-throw-getobj-count-2026-05-29.md`
  - `docs/c-parity-audit/176-wish-lamp-range-2026-05-29.md`
  - `docs/c-parity-audit/177-wish-sword-range-2026-05-29.md`
  - `docs/c-parity-audit/178-wish-venom-aliases-2026-05-29.md`
  - `docs/c-parity-audit/179-wish-dragon-armor-rng-2026-05-29.md`
  - `docs/c-parity-audit/180-wish-shoes-range-2026-05-29.md`
  - `docs/c-parity-audit/181-wish-shirt-range-2026-05-29.md`
  - `docs/c-parity-audit/182-wish-boots-range-2026-05-29.md`
  - `docs/c-parity-audit/183-wish-gloves-range-2026-05-29.md`
  - `docs/c-parity-audit/184-wish-cloak-range-2026-05-29.md`
  - `docs/c-parity-audit/185-wish-shield-range-2026-05-29.md`
  - `docs/c-parity-audit/186-wish-hat-range-2026-05-29.md`
  - `docs/c-parity-audit/187-wish-helm-range-2026-05-29.md`
  - `docs/c-parity-audit/188-wish-called-range-tail-2026-05-29.md`
  - `docs/c-parity-audit/189-wish-called-range-random-class-2026-05-29.md`
  - `docs/c-parity-audit/190-wish-labeled-namedesc-2026-05-29.md`
  - `docs/c-parity-audit/191-throw-getobj-downplayed-fallback-2026-05-29.md`
  - `docs/c-parity-audit/192-throw-getobj-count-backspace-2026-05-29.md`
  - `docs/c-parity-audit/193-throw-getobj-menu-count-2026-05-29.md`
  - `docs/c-parity-audit/246-tiphat-apparent-mimics-2026-05-31.md`
  - `docs/c-parity-audit/247-tiphat-hallucinated-statues-2026-05-31.md`
  - `docs/c-parity-audit/248-tiphat-steed-animal-noise-2026-05-31.md`
- Latest compact/source note: `docs/c-parity-audit/248-tiphat-steed-animal-noise-2026-05-31.md`.
- Latest verified public score: `44/44`.

## Current Priorities

1. Shared shop ownership helpers.
   - Source notes: `docs/c-parity-audit/05-food-inventory-containers-shops.md` and latest compact note `docs/c-parity-audit/193-throw-getobj-menu-count-2026-05-29.md`.
   - Replace remaining field-only paths with C-shaped `addtobill`, `subfrombill`, `stolen_value`, `obfree`, and `sellobj` routing.
   - Compact candidates: remaining magic-bag valuation/discovery edges, remaining monster-thrown passive-object follow-ups, costly-alteration paths, and remaining stone-to-flesh/object-polymorph lifecycle rows.
   - Note: ordinary drop `sellobj()` is square-selected in C and should not be converted to owner-first routing without a new source anchor.

2. Direct object-hit and potion delivery.
   - Source notes: `docs/c-parity-audit/04-monsters-combat-pets.md` and latest compact note `docs/c-parity-audit/193-throw-getobj-menu-count-2026-05-29.md`.
   - Continue broadening `potionhit()`, `toss_up()`, direct object-hit, and passive-object delivery one source-backed edge at a time.
   - Compact candidates: broader glass/crystal breakage, wielded/melee egg `hmon()` paths, generic falling-object damage, shifted-vampire death channels, full `newcham()`/`polyself()` fallout, and remaining monster-thrown hero/polyself passive behavior.

3. Object registry and canonical object factory.
   - Source notes: `docs/c-parity-audit/02-objects-wishing-readobjnam.md` and latest compact note `docs/c-parity-audit/193-throw-getobj-menu-count-2026-05-29.md`.
   - Consolidate object metadata for type, class, material, weight, cost, probability, wishability, merge rules, damage predicates, timers, and charged-tool policy.
   - Generic C `readobjnam` object ranges for `bag`, `lamp`, `candle`, `horn`, `sword`, `shoes`, `shirt`, `boots`, `gloves`/`gauntlets`, `cloak`, `shield`, `hat`, and `helm` are covered; positive `called` range-tail namedesc lookups, unresolved range-base `called` random-class fallback, and scroll/spellbook `labeled`/`labelled` namedesc plus unknown-label class fallback are covered for the current modeled paths. Venom plural aliases, wizard-only `spe=1` policy, and dragon armor RNG paths are covered in parser-local paths. Continue replacing parser-local wish and merge tables with registry-backed finalization, artifact provenance, save/bones fruit-id handling, and dragon armor metadata consolidation.

4. Monster placement, scheduler, and combat cores.
   - Source notes: `docs/c-parity-audit/04-monsters-combat-pets.md` and latest compact note `docs/c-parity-audit/193-throw-getobj-menu-count-2026-05-29.md`.
   - Build shared `goodpos`, `enexto`, monster lifecycle, turn phases, `hmon`, `mattackm`, passive, and projectile/object-hit paths.
   - Compact candidates: direct monster-object hit follow-ups, remaining monster-thrown `passive_obj()` follow-ups, full monster diet flag generation, and broader `polymon()`/stoning interactions.

5. Level, trap, terrain, save, and display foundations.
   - Source notes: `docs/c-parity-audit/03-levelgen-specials-quest.md`, `docs/c-parity-audit/06-save-restore-bones.md`, `docs/c-parity-audit/07-traps-liquids-terrain.md`, `docs/c-parity-audit/08-display-rng-observation.md`, and latest compact note `docs/c-parity-audit/209-statue-trap-same-square-retry-2026-05-30.md`.
   - Centralize special-level generation, saved-level/migration/timer state, trap/liquid/material-damage pipelines, glyph/discovery/redraw ordering, and RNG diagnostics.
   - Compact candidates: broader hero-on-liquid fallout and display/discovery ordering around object observation.

6. Command, prompt, and menu contracts.
   - Source notes: `docs/c-parity-audit/01-input-commands-windows.md` and latest compact note `docs/c-parity-audit/193-throw-getobj-menu-count-2026-05-29.md`.
   - Add reusable command registry/binding, count parsing, `getlin`, `yn_function`, `getobj`, `getpos`, and menu-selection primitives.
   - Covered locally: apply `?`/`*` candidate splitting, downplayed apply candidates, coin apply/flip, gray-stone `use_stone()` prompt/cancel routing, carried `#tip` suggested/downplayed/full-inventory selection, `#rub` gray-stone routing with cursed-touchstone shatter, `#rub` no-hands ordering, `#rub` star full-inventory widening and silly direct-selection wording, effective touchstone ruby identification/streaks/gold-ring scratch/material rows, worn helmet `tiphat()` entry/self handling, visible humanoid `tiphat()` wave/tip/grasp/rude conflict rows, visible object/furniture mimic `tiphat()` scan filtering, hallucinated floor-statue `tiphat()` scan response, mounted steed-down `tiphat()` and adjacent visible animal-noise responses, direct throw-prompt count parsing/backspace editing and throw `?`/`*` inventory-menu count return for non-gold rejection plus counted gold, and throw `?` downplayed fallback with prompt-level `*` full inventory.
   - Remaining command candidates: remaining `tiphat()` unseen/noise reactions and reusable `getobj()` extraction.

## Immediate Slice

Continue narrow C-backed slices in this order unless a failing public regression points elsewhere:

1. Keep remaining stone-to-flesh/object-polymorph work narrow: cover one successful-polyself equipment row or remaining material/polyuse fallout row at a time. Floor amulet-of-unchanging and wholly-unpolyable pile affected-return parity is covered in audit 169; floor unique no-traits directed doppelganger animation is covered in audit 205; statue-trap unique no-traits directed doppelganger sharing is covered in audit 206; floor and trap saved-trait statue restoration is covered in audit 207; saved corpse trait storage and revival are covered in audit 208; statue-trap same-square unique-failure retry is covered in audit 209; lateral wand-polymorph floor-pile ray traversal is covered in audit 210; monster-first lateral wand-polymorph ray hits and dropped-inventory bypass are covered in audit 211; vertical wand-polymorph hiding-under pile targeting is covered in audit 212; floor polymorph boulder eligibility/restacking is covered in audit 213; spell-polymorph floor-pile routing is covered in audit 214; self-polymorph unchanging/learning is covered in audit 215; floor-shudder material-golem fallout is covered in audit 216; successful-polyself no-hands gloves/weapon/ring fallout is covered in audit 217; successful-polyself no-head eyewear and amulet retention is covered in audit 218; successful-polyself no-eyes metadata and form-blindness restoration is covered in audit 219; successful-polyself small-form shirt slip fallout is covered in audit 220; successful-polyself xorn breakarm body armor/cloak/shirt fallout is covered in audit 221; successful-polyself whirly sliparm and no-hands ordering is covered in audit 222; successful-polyself non-whirly small sliparm body/cloak/shirt, mummy wrapping, and hobbit elven armor exception are covered in audit 223; deferred polyself cloak/tool shop drops and shared mithril-coat suit metadata are covered in audit 224; centaur/slithy boot fallout and speed-boots forced-removal messaging are covered in audit 225; horned-form helmet pierce/drop fallout is covered in audit 226; forced Archeologist fedora Luck removal is covered in audit 227; forced cornuthaum and helm-of-brilliance stat-bonus removal is covered in audit 228; helm-of-opposite-alignment fallout is covered in audit 229; helmet surface wording and sensed-monster refresh are covered in audits 230 and 231; forced weapon release is covered in audit 232; water-walking boot pool fallout is covered in audit 233; levitation boot ordinary and special float-down branches are covered in audits 234 and 235; large-dog breakarm and mummy-wrapping `Cloak_off()` feedback are covered in audit 236; gauntlets-of-dexterity and gauntlets-of-power `Gloves_off()` stat fallout is covered in audit 237; alchemy smock and blue dragon armor off-state fallout is covered in audit 238; matching dragon skin merge is covered in audit 239; silver dragon and shield reflection-off fallout is covered in audit 240; gray dragon antimagic fallout is covered in audit 241; white dragon cold-resistance fallout is covered in audit 242; white dragon slow-digestion fallout is covered in audit 243; slow-digestion attributes/enlightenment display is covered in audit 244; slow-digestion digest-combat regurgitation is covered in audit 245.
2. Projectile and migration work: seen-hole/trapdoor shipping, projectile/gold/monster-thrown down-stairs/down-ladder/special-stairs route metadata, carried non-gold plus carried-gold command/helper down-gate shipping, kicked-object floor selection/down-gate shipping, queued delivery silent breakage/arrival stacking, hit-only monster-thrown missile mulch, monster-thrown rust/fire/acid/corrosion passive-object erosion, production sling rock/plain dagger/crude dagger `ohit` threading, monster-thrown disenchanter `AD_ENCH` drain, direct hero melee `AD_ENCH` drain, direct hero melee `AD_RUST`/`AD_CORR`/`AD_FIRE`/`AD_ACID` passive-object erosion, hero/polyself passive-object targets, production dart hit landing, plain +0 production launcher-arrow hit/miss landing, and clean +1 production launcher-arrow nonlethal hit/miss landing are covered; remaining launcher-arrow slices should keep blessed, eroded, greased, cursed, higher-enchanted, and lethal arrow persistence separate until replay/bones ordering is verified.
3. Command/menu work: apply, carried `#tip`, `#rub` gray-stone sharing, `#rub` no-hands ordering, `#rub` star full-inventory widening and invalid direct-selection wording, touchstone ruby/effective-identification/material rows, worn-helmet `tiphat()` entry, visible humanoid `tiphat()` target reactions, visible object/furniture mimic `tiphat()` scan filtering, hallucinated floor-statue `tiphat()` scan response, mounted steed-down `tiphat()` and adjacent visible animal-noise responses, direct throw-prompt count parsing/backspace editing, throw `?`/`*` inventory-menu count return, and throw `?` downplayed fallback are covered; next slices should target reusable `getobj()` primitives or remaining `tiphat()` unseen/noise reactions.
4. Direct delivery work: broaden `potionhit()`/`toss_up()` and direct object-hit only through newly selected compact C-backed edges; avoid broad monster lifecycle rewrites without tests.
5. Registry/diet work: C `readobjnam` object ranges for `bag`, `lamp`, `candle`, `horn`, `sword`, `shoes`, `shirt`, `boots`, `gloves`/`gauntlets`, `cloak`, `shield`, `hat`, and `helm` are covered, positive `called` range-tail namedesc lookups, unresolved `called` random-class fallback, scroll/spellbook `labeled`/`labelled` namedesc, unknown-label class fallback, venom plural aliases, wizard-only `spe=1` policy, and dragon armor RNG paths are covered; remaining object registry work includes registry-backed consolidation of dragon armor and other parser-local metadata. Remaining diet metadata should be caller-led, including full monster diet flag generation and remaining metal-accessory fullness/cursed/worn-ring/strangulation cleanup.
6. Forced-chest follow-ups should remain source-backed and narrow; visible object/furniture mimic wake preservation remains open.

## Verification

For each code slice:

1. Run syntax checks for changed JS files with `node --check`.
2. Run focused source-derived smoke tests for the touched behavior.
3. Run `node --test test/shop-billing-helpers.test.mjs`.
4. Run `node --test test/*.mjs`.
5. Run `npm run score`.
6. Commit and push once the public suite remains green or the intentional regression is documented.
