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
- [09-subagent-findings-2026-05-26.md](09-subagent-findings-2026-05-26.md): latest parallel C-source audit findings and ranked narrow follow-up slices.
- [10-subagent-findings-2026-05-27.md](10-subagent-findings-2026-05-27.md): meat-ring and royal-jelly eating audits plus implemented status.
- [11-subagent-findings-2026-05-27.md](11-subagent-findings-2026-05-27.md): royal-jelly `#rub` egg audit and implemented status.
- [12-subagent-findings-2026-05-27.md](12-subagent-findings-2026-05-27.md): `#rub` prompt parity follow-up and implemented egg timer slice.
- [13-subagent-findings-2026-05-27.md](13-subagent-findings-2026-05-27.md): special-food merge and timer follow-up audits plus implemented floor/drop stacking status.
- [14-subagent-findings-2026-05-27.md](14-subagent-findings-2026-05-27.md): special-food pickup merge parity plus container/timer/billing/eating follow-up audits.
- [15-subagent-findings-2026-05-27.md](15-subagent-findings-2026-05-27.md): container, level-generation floor, and monster-inventory merge parity plus bill-limit and timer follow-up audits.
- [16-subagent-findings-2026-05-27.md](16-subagent-findings-2026-05-27.md): full shop-bill limit parity plus later recursive/dummy follow-up status.
- [17-subagent-findings-2026-05-27.md](17-subagent-findings-2026-05-27.md): contained egg hatch timer expiration parity plus remaining timer queue follow-ups.
- [18-subagent-findings-2026-05-27.md](18-subagent-findings-2026-05-27.md): recursive shop bill saturation parity.
- [19-subagent-findings-2026-05-27.md](19-subagent-findings-2026-05-27.md): dummy alteration billing behavior when `BILLSZ` is full.
- [20-subagent-findings-2026-05-27.md](20-subagent-findings-2026-05-27.md): buried and migrating egg due-timer expiration parity.
- [21-subagent-findings-2026-05-27.md](21-subagent-findings-2026-05-27.md): squeaky-board `#untrap` can-of-grease usage billing.
- [22-subagent-findings-2026-05-27.md](22-subagent-findings-2026-05-27.md): squeaky-board `#untrap` potion-of-oil useup billing.
- [23-subagent-findings-2026-05-27.md](23-subagent-findings-2026-05-27.md): potion-of-oil lamp refuel through `#dip`.
- [24-subagent-findings-2026-05-27.md](24-subagent-findings-2026-05-27.md): potion-of-oil weapon and weapon-tool oiling through `#dip`.
- [25-subagent-findings-2026-05-27.md](25-subagent-findings-2026-05-27.md): tripe ration and candy bar simple-food pickup merge parity.
- [26-subagent-findings-2026-05-27.md](26-subagent-findings-2026-05-27.md): potion-of-sickness and healing-family poisonable weapon `#dip` parity.
- [27-subagent-findings-2026-05-27.md](27-subagent-findings-2026-05-27.md): meat stick object metadata, eating, wishing, and simple merge parity plus next slice candidates.
- [28-subagent-findings-2026-05-27.md](28-subagent-findings-2026-05-27.md): cursed shop-floor magic-bag loss owner routing plus next source-backed slices.
- [29-subagent-findings-2026-05-27.md](29-subagent-findings-2026-05-27.md): potion-of-acid carried-object corrosion through `#dip`.
- [30-subagent-findings-2026-05-27.md](30-subagent-findings-2026-05-27.md): source-first potion `#altdip` through inventory item actions.
- [31-subagent-findings-2026-05-27.md](31-subagent-findings-2026-05-27.md): poisoned weapon `doname()` display ordering plus water, horn/amethyst, and stone-to-flesh follow-up audits.
- [32-subagent-findings-2026-05-27.md](32-subagent-findings-2026-05-27.md): blessed/cursed water BUC effects through potion `#dip`.
- [33-subagent-findings-2026-05-27.md](33-subagent-findings-2026-05-27.md): unicorn horn and amethyst potion neutralization through `#dip`.
- [34-subagent-findings-2026-05-27.md](34-subagent-findings-2026-05-27.md): neutral-water carried-object damage through potion `#dip`.
- [35-subagent-findings-2026-05-27.md](35-subagent-findings-2026-05-27.md): broad non-self carried potion `#dip` menus and polymorph potion dipping.
- [36-subagent-findings-2026-05-27.md](36-subagent-findings-2026-05-27.md): potion-potion alchemy through `#dip`.
- [37-subagent-findings-2026-05-27.md](37-subagent-findings-2026-05-27.md): alchemy-explosion potion vapor effects.
- [38-subagent-findings-2026-05-27.md](38-subagent-findings-2026-05-27.md): hard-landing broken potion vapor effects.
- [39-subagent-findings-2026-05-27.md](39-subagent-findings-2026-05-27.md): impact-drop broken potion vapor effects plus fresh follow-up audits.
- [40-subagent-findings-2026-05-27.md](40-subagent-findings-2026-05-27.md): hot-ground broken potion vapor effects.
- [41-subagent-findings-2026-05-27.md](41-subagent-findings-2026-05-27.md): inventory fire direct potion vapor effects.
- [42-subagent-findings-2026-05-27.md](42-subagent-findings-2026-05-27.md): fresh forced-chest, potionhit, water-vapor, stone-to-flesh, and statue-shatter follow-up audits.
- [43-subagent-findings-2026-05-27.md](43-subagent-findings-2026-05-27.md): gremlin-only water vapor splitting.
- [44-subagent-findings-2026-05-27.md](44-subagent-findings-2026-05-27.md): fresh forced-chest, stone-to-flesh, potionhit, and statue-shatter follow-up audits.
- [45-subagent-findings-2026-05-27.md](45-subagent-findings-2026-05-27.md): self-cast stone-to-flesh marble wand to meat stick transform plus follow-up audits.
- [46-subagent-findings-2026-05-28.md](46-subagent-findings-2026-05-28.md): forced chest-content potion shatter, destroyed-content shop loss, and fresh potionhit/statue/stone follow-up audits.
- [47-subagent-findings-2026-05-28.md](47-subagent-findings-2026-05-28.md): direct hero-thrown confusion/booze potionhit plus statue debt, stone-to-flesh rescue, and plan-pruning follow-up audits.
- [48-subagent-findings-2026-05-28.md](48-subagent-findings-2026-05-28.md): statue-trap shatter shop debt plus stone-to-flesh, paralysis potionhit, and shop-helper follow-up audits.
- [49-subagent-findings-2026-05-28.md](49-subagent-findings-2026-05-28.md): self-cast stone-to-flesh stoning rescue, stone-golem polyself conversion, and fresh paralysis/shop-helper follow-up audits.
- [50-subagent-findings-2026-05-28.md](50-subagent-findings-2026-05-28.md): direct hero-thrown paralysis potionhit plus fresh sleeping/shop-helper follow-up audits.
- [51-subagent-findings-2026-05-28.md](51-subagent-findings-2026-05-28.md): burying-merchandise shop-helper cleanup plus fresh floor-alteration, ice-burial, and sleeping-potionhit follow-up audits.
- [52-subagent-findings-2026-05-28.md](52-subagent-findings-2026-05-28.md): floor polymorph shop-helper cleanup plus remaining floor stone-to-flesh, ice-burial, and sleeping-potionhit follow-up audits.
- [53-subagent-findings-2026-05-28.md](53-subagent-findings-2026-05-28.md): floor stone-to-flesh marble-wand cleanup plus remaining beam, resistance, statue, and object-row follow-up audits.
- [54-subagent-findings-2026-05-28.md](54-subagent-findings-2026-05-28.md): direct cold-ray and hero fire-ray ice burial shop-helper cleanup plus remaining shop ownership follow-up audits.
- [55-subagent-findings-2026-05-28.md](55-subagent-findings-2026-05-28.md): direct hero-thrown sleeping potionhit plus remaining potionhit and shop-helper follow-up audits.
- [56-subagent-findings-2026-05-28.md](56-subagent-findings-2026-05-28.md): direct hero-thrown blindness potionhit plus monster temporary-blindness timeout coverage.
- [57-subagent-findings-2026-05-28.md](57-subagent-findings-2026-05-28.md): direct hero-thrown speed potionhit plus boulder-push shop-boundary follow-up audit.
- [58-subagent-findings-2026-05-28.md](58-subagent-findings-2026-05-28.md): boulder push shop-boundary billing, owner return, and outside-shop debt conversion.
- [59-subagent-findings-2026-05-28.md](59-subagent-findings-2026-05-28.md): direct hero-thrown invisibility potionhit, monster visibility state, and adjacent vapor discovery.
- [60-subagent-findings-2026-05-28.md](60-subagent-findings-2026-05-28.md): magic-bag trigger explosion billing with held/floor `do_boh_explosion()` context.
- [61-subagent-findings-2026-05-28.md](61-subagent-findings-2026-05-28.md): kicked container impact shop billing through C's `frominv` distinction.
- [62-subagent-findings-2026-05-28.md](62-subagent-findings-2026-05-28.md): force-destroyed shop box owner-aware `stolen_value()` billing plus next shop-helper candidates.
- [63-subagent-findings-2026-05-28.md](63-subagent-findings-2026-05-28.md): statue shatter owner-aware `stolen_value()` billing plus dropped-object `sellobj()` and chest wording follow-ups.
- [64-subagent-findings-2026-05-28.md](64-subagent-findings-2026-05-28.md): forced chest material-specific content destruction wording and ordinary-drop `sellobj()` owner-routing correction.
- [65-subagent-findings-2026-05-28.md](65-subagent-findings-2026-05-28.md): direct hero-thrown hallucination potionhit routing through C's common no-monster-effect branch.
- [66-subagent-findings-2026-05-28.md](66-subagent-findings-2026-05-28.md): direct hero-thrown healing-family and restore/gain ability potionhit monster effects.
- [67-subagent-findings-2026-05-28.md](67-subagent-findings-2026-05-28.md): forced chest occupation tick parity for blade breakage and blunt wake-nearby behavior.
- [68-subagent-findings-2026-05-28.md](68-subagent-findings-2026-05-28.md): direct hero-thrown common no-effect potionhit routing for levitation, detection, gain-level, gain-energy, enlightenment, see-invisible, and fruit-juice potions.
- [69-subagent-findings-2026-05-28.md](69-subagent-findings-2026-05-28.md): direct hero-thrown unlit oil potionhit routing through C's common crash, chip, wake/anger, and no-evaporation path.
- [70-subagent-findings-2026-05-28.md](70-subagent-findings-2026-05-28.md): direct hero-thrown sickness potionhit for ordinary illness, resistance feedback, and Pestilence healing inversion.
- [71-subagent-findings-2026-05-28.md](71-subagent-findings-2026-05-28.md): target-aware direct neutral-water potionhit routing for ordinary unsaddled monsters while deferring special water branches.
- [72-subagent-findings-2026-05-28.md](72-subagent-findings-2026-05-28.md): direct hero-thrown acid potionhit for resistance, pain damage, wake-nearby behavior, lethal cleanup, and unpaid stack consumption.
- [73-subagent-findings-2026-05-28.md](73-subagent-findings-2026-05-28.md): direct hero-thrown special-water potionhit for unsaddled gremlin splitting and iron golem rust damage/death.
- [74-subagent-findings-2026-05-28.md](74-subagent-findings-2026-05-28.md): direct hero-thrown water potionhit for non-shapechanging blessing-haters, including blessed damage, cursed healing, and neutral wake/anger behavior.
- [75-subagent-findings-2026-05-28.md](75-subagent-findings-2026-05-28.md): direct hero-thrown water potionhit for worn-saddle interception, including saddle-hit RNG, BUC mutation, wet-saddle feedback, and no wake/anger behavior.
- [76-subagent-findings-2026-05-28.md](76-subagent-findings-2026-05-28.md): water-vapor lycanthropy effects for cursed were-beast transformation and blessed non-curing reversion.
- [77-subagent-findings-2026-05-28.md](77-subagent-findings-2026-05-28.md): direct hero-thrown water potionhit for werecreature and vampire-shifter body effects, including nonlethal `new_were()`-style transformations.
- [78-subagent-findings-2026-05-28.md](78-subagent-findings-2026-05-28.md): direct hero-thrown lit-oil potionhit, including burning-oil explosion damage, adjacent hero blast, and oil saddle-hit bypass.
- [79-subagent-findings-2026-05-28.md](79-subagent-findings-2026-05-28.md): direct hero-thrown polymorph potionhit, including `bhitm()` resistance ordering, system shock, random monster form replacement, and polymorph saddle-hit bypass.
- [80-subagent-findings-2026-05-28.md](80-subagent-findings-2026-05-28.md): generic worn-saddle interception for all currently supported direct hero-thrown potionhit identities.
- [81-subagent-findings-2026-05-28.md](81-subagent-findings-2026-05-28.md): stone-to-flesh mineral/gemstone ring transform plus potion bash, trycall, oil collateral, shifted-vampire, and vapor follow-up audits.
- [82-subagent-findings-2026-05-28.md](82-subagent-findings-2026-05-28.md): wielded-potion bash delivery plus remaining trycall, oil collateral, stone-to-flesh, and shifted-vampire follow-up audits.
- [83-subagent-findings-2026-05-28.md](83-subagent-findings-2026-05-28.md): non-`kn` potion trycall implementation plus remaining visibility, stone-to-flesh, oil collateral, shifted-vampire, and identity-independent potionhit audits.
- [84-subagent-findings-2026-05-28.md](84-subagent-findings-2026-05-28.md): stone-to-flesh object resistance plus carried/floor boulder and eligible gem meatball rows.
- [85-subagent-findings-2026-05-28.md](85-subagent-findings-2026-05-28.md): direct potionhit unseen crash, evaporation, trycall, and saddle-feedback visibility wording.
- [86-subagent-findings-2026-05-28.md](86-subagent-findings-2026-05-28.md): direct potionhit concrete-otyp identity fallback and adjacent common no-effect vapor trycall coverage.
- [87-subagent-findings-2026-05-28.md](87-subagent-findings-2026-05-28.md): stone-to-flesh smell wording, carried replacement equipment-state preservation, and fresh forced-chest/projectile/potionhit follow-up audits.
- [88-subagent-findings-2026-05-28.md](88-subagent-findings-2026-05-28.md): forced chest 50-turn/no-hands exercise cleanup, source-backed force chance, and fresh projectile/potionhit/diet follow-up audits.
- [89-subagent-findings-2026-05-28.md](89-subagent-findings-2026-05-28.md): hero projectile pre-placement floor-effects gate, lava hard-landing parity, and fresh potionhit/diet/forced-chest follow-up audits.
- [90-subagent-findings-2026-05-28.md](90-subagent-findings-2026-05-28.md): direct hero-thrown blessed-water lethal shifted-vampire revival plus fresh projectile/diet/forced-chest/stone-to-flesh follow-up audits.
- [91-subagent-findings-2026-05-28.md](91-subagent-findings-2026-05-28.md): forced-chest buried zombie wake disturbance plus fresh stone-to-flesh, projectile shipping, and diet metadata follow-up audits.
- [92-subagent-findings-2026-05-28.md](92-subagent-findings-2026-05-28.md): stone-to-flesh Sokoban boulder guilt plus fresh lit-oil, projectile shipping, themed-zombie, and diet metadata follow-up audits.
- [93-subagent-findings-2026-05-28.md](93-subagent-findings-2026-05-28.md): themed buried-zombie generation timers plus fresh lit-oil floor-collateral and projectile `ship_object()` follow-up audits.
- [94-subagent-findings-2026-05-28.md](94-subagent-findings-2026-05-28.md): lit-oil explosion floor-object collateral plus fresh stone-to-flesh statue/figurine, diet metadata, projectile impact-drop, and forced-chest follow-up audits.
- [95-subagent-findings-2026-05-28.md](95-subagent-findings-2026-05-28.md): stone-to-flesh vegetarian statue/figurine meatballs plus fresh burning-oil terrain, projectile `ship_object()`, and diet metadata follow-up audits.
- [96-subagent-findings-2026-05-28.md](96-subagent-findings-2026-05-28.md): burning-oil web deletion and hero slime cleanup plus terrain, projectile, stone-to-flesh, and diet metadata follow-up audits.
- [97-subagent-findings-2026-05-28.md](97-subagent-findings-2026-05-28.md): burning-oil ice melting plus remote projectile down-gate, stone-to-flesh figurine animation, and polyself diet metadata follow-up audits.
- [98-subagent-findings-2026-05-28.md](98-subagent-findings-2026-05-28.md): polyself diet overlay for stone-to-flesh, tripe, and tin callers plus fresh projectile, figurine, and burning-oil water follow-up audits.
- [99-subagent-findings-2026-05-28.md](99-subagent-findings-2026-05-28.md): burning-oil water and pool evaporation plus projectile, figurine, and pet-food diet follow-up audits.
- [100-subagent-findings-2026-05-28.md](100-subagent-findings-2026-05-28.md): remote non-gold hero projectile `ship_object()` down-gate parity plus remaining projectile/kick/gold shipping follow-up audits.
- [101-subagent-findings-2026-05-28.md](101-subagent-findings-2026-05-28.md): remote projectile floor-pile `impact_drop()` parity plus remaining gold/kick/stairs/monster-thrown shipping follow-up audits.
- [102-subagent-findings-2026-05-28.md](102-subagent-findings-2026-05-28.md): remote thrown-gold seen-shaft `ship_object()` parity plus upward potion self-hit, figurine animation, and ice-box survivor follow-up audits.
- [103-subagent-findings-2026-05-28.md](103-subagent-findings-2026-05-28.md): first upward hero-thrown potion self-hit path through `toss_up()` and self `potionhit()`.
- [104-subagent-findings-2026-05-28.md](104-subagent-findings-2026-05-28.md): upward non-special vapor-only potion self-hit expansion and throw-letter command coverage.
- [105-subagent-findings-2026-05-28.md](105-subagent-findings-2026-05-28.md): upward acid and unlit-oil self-hit parity.
- [106-subagent-findings-2026-05-28.md](106-subagent-findings-2026-05-28.md): upward throw ceiling/no-ceiling/underwater wording parity.
- [107-subagent-findings-2026-05-28.md](107-subagent-findings-2026-05-28.md): upward polymorph potion self-hit parity.
- [108-subagent-findings-2026-05-28.md](108-subagent-findings-2026-05-28.md): upward cream-pie ceiling break, self-hit splatter, blindness, and broken-unit shop debt parity.
- [109-subagent-findings-2026-05-28.md](109-subagent-findings-2026-05-28.md): upward melon ceiling break, self-hit splat without face effects, and broken-unit shop debt parity.
- [110-subagent-findings-2026-05-28.md](110-subagent-findings-2026-05-28.md): upward ordinary egg ceiling break, self-hit face splat, and broken-unit shop debt parity.
- [111-subagent-findings-2026-05-28.md](111-subagent-findings-2026-05-28.md): upward mirror, crystal-ball, and lenses breakage with thousand-pieces wording, mirror luck loss, and broken-unit shop debt parity.
- [112-subagent-findings-2026-05-28.md](112-subagent-findings-2026-05-28.md): upward expensive-camera breakage with picture-painting demon release, curse-driven peacefulness, and broken-unit shop debt parity.
- [113-subagent-findings-2026-05-28.md](113-subagent-findings-2026-05-28.md): upward glass/crystal material wand breakage with shuffled appearance/material recognition, thousand-pieces wording, and broken-unit shop debt parity.
- [114-subagent-findings-2026-05-28.md](114-subagent-findings-2026-05-28.md): upward acid and blinding venom toss-up break/self-hit behavior with shop debt coverage.
- [115-subagent-findings-2026-05-28.md](115-subagent-findings-2026-05-28.md): upward harmless missile toss-up break/self-hit/landing behavior.
- [116-subagent-findings-2026-05-28.md](116-subagent-findings-2026-05-28.md): upward crackable glass armor toss-up shatter, break wording, and billing behavior.
- [117-subagent-findings-2026-05-28.md](117-subagent-findings-2026-05-28.md): upward pyrolisk egg toss-up hatching and self-hit behavior.
- [118-subagent-findings-2026-05-28.md](118-subagent-findings-2026-05-28.md): upward lit-oil potion toss-up explosion and burning-oil fallout ordering.
- [119-subagent-findings-2026-05-28.md](119-subagent-findings-2026-05-28.md): upward touch-petrifying egg toss-up self-hit, landing, and petrification behavior.
- [120-subagent-findings-2026-05-29.md](120-subagent-findings-2026-05-29.md): upward touch-petrifying corpse toss-up self-hit and petrification behavior.
- [121-subagent-findings-2026-05-29.md](121-subagent-findings-2026-05-29.md): carried figurine stone-to-flesh animation plus compact follow-up audits.
- [122-subagent-findings-2026-05-29.md](122-subagent-findings-2026-05-29.md): pet-food stone-to-flesh meat classification for carnivores and explicit diet flags.
- [123-subagent-findings-2026-05-29.md](123-subagent-findings-2026-05-29.md): burning-oil fountain terrain and dry-up collateral.
- [124-subagent-findings-2026-05-29.md](124-subagent-findings-2026-05-29.md): ghoul pet `dogfood()` old-corpse/stale-egg branch.
- [125-subagent-findings-2026-05-29.md](125-subagent-findings-2026-05-29.md): burning-oil blast secret-door reveal and closed-door fire terrain.
- [126-subagent-findings-2026-05-29.md](126-subagent-findings-2026-05-29.md): floor figurine stone-to-flesh animation.
- [127-subagent-findings-2026-05-29.md](127-subagent-findings-2026-05-29.md): monster-thrown remote seen-shaft shipping.
- [128-subagent-findings-2026-05-29.md](128-subagent-findings-2026-05-29.md): shop-billed floor figurine stone-to-flesh animation.
- [129-subagent-findings-2026-05-29.md](129-subagent-findings-2026-05-29.md): golem stone-to-flesh figurine and statue animation.
- [130-subagent-findings-2026-05-29.md](130-subagent-findings-2026-05-29.md): carried shop-billed figurine stone-to-flesh animation.
- [131-subagent-findings-2026-05-29.md](131-subagent-findings-2026-05-29.md): ordinary floor statue stone-to-flesh animation.
- [132-subagent-findings-2026-05-29.md](132-subagent-findings-2026-05-29.md): shop-floor statue stone-to-flesh animation.
- [133-subagent-findings-2026-05-29.md](133-subagent-findings-2026-05-29.md): stone-to-flesh failed animation fallback and trap statues.
- [134-subagent-findings-2026-05-29.md](134-subagent-findings-2026-05-29.md): ordinary horizontal thrown-egg monster hits, used-up billing, and live-egg rock conversion.
- [135-subagent-findings-2026-05-29.md](135-subagent-findings-2026-05-29.md): shopkeeper payment speech/nonverbal feedback plus fresh follow-up audits.
- [136-subagent-findings-2026-05-29.md](136-subagent-findings-2026-05-29.md): special horizontal thrown-egg monster hits, petrification, pyrolisk explosion, and fresh follow-up audits.
- [137-subagent-findings-2026-05-29.md](137-subagent-findings-2026-05-29.md): force-destroyed ice-box survivor timers plus fresh projectile, mimic, terrain, and stone-to-flesh follow-up audits.
- [138-subagent-findings-2026-05-29.md](138-subagent-findings-2026-05-29.md): named stone-to-flesh floor statues and fresh burning-oil, projectile, drawbridge, and historic-statue follow-up audits.
- [139-subagent-findings-2026-05-29.md](139-subagent-findings-2026-05-29.md): historic Archeologist stone-to-flesh statue guilt plus fresh diet, shop terrain, doppelganger, drawbridge, and monster-thrown audits.
- [140-subagent-findings-2026-05-29.md](140-subagent-findings-2026-05-29.md): monster-thrown `drop_throw()` prelude, monster-moving historic statue regret, and fresh force/projectile/kick/toss-up follow-up audits.
- [141-subagent-findings-2026-05-29.md](141-subagent-findings-2026-05-29.md): ordinary upward corpse toss-up damage plus fresh down-gate, shop-door, metallivore, doppelganger, and monster-thrown audits.
- [142-metallivorous-nonfood-eat-2026-05-29.md](142-metallivorous-nonfood-eat-2026-05-29.md): metallivorous non-food `#eat`, rustproof iron spit-out, and refreshed adjacent gaps.
- [143-burning-oil-shop-door-damage-2026-05-29.md](143-burning-oil-shop-door-damage-2026-05-29.md): burning-oil shop-door damage records, post-blast shop debt, and delayed shopkeeper repair.
- [144-metal-accessory-eataccessory-2026-05-29.md](144-metal-accessory-eataccessory-2026-05-29.md): metallivorous metal ring/amulet taste discovery, chance-gated accessory effects, and refreshed adjacent C-backed gaps.
- [145-drawbridge-movement-terrain-2026-05-29.md](145-drawbridge-movement-terrain-2026-05-29.md): raised drawbridge movement under-terrain for floor, ice, lava, and moat prompts/fallout plus refreshed command, magic-bag, shop, and polymorph audit gaps.
- [744-hero-projectile-gas-spore-invisible-cleanup-2026-06-08.md](744-hero-projectile-gas-spore-invisible-cleanup-2026-06-08.md): hero projectile gas spore death explosion, remembered invisible cleanup, and projectile More propagation.
- [745-hero-projectile-random-treasure-2026-06-08.md](745-hero-projectile-random-treasure-2026-06-08.md): hero projectile `xkilled()` random treasure gate, drop filtering, and command-level forced treasure canary.
- [746-hero-projectile-live-xp-2026-06-08.md](746-hero-projectile-live-xp-2026-06-08.md): hero projectile live XP, level-up message folding, and shared monster XP calculation.
- [747-hero-projectile-monster-lifesaving-2026-06-08.md](747-hero-projectile-monster-lifesaving-2026-06-08.md): hero projectile monster life saving, C-ordered medallion messages, and cleanup bypass.
- [748-hero-projectile-lethal-lifesaving-followup-2026-06-08.md](748-hero-projectile-lethal-lifesaving-followup-2026-06-08.md): hero projectile lethal life-saving follow-up, deadly poison ordering, and genocided cleanup continuation.
- [749-direct-melee-monster-lifesaving-2026-06-08.md](749-direct-melee-monster-lifesaving-2026-06-08.md): direct hero melee monster life saving, shifted-vampire revival, lethal hit-message suppression, and survivor cleanup bypass.
- [750-direct-melee-xkilled-social-penalties-2026-06-08.md](750-direct-melee-xkilled-social-penalties-2026-06-08.md): direct hero melee tame-kill attribution, bounded luck, same-aligned unicorn guilt, and force-fight safe-pet bypass.
- [751-direct-melee-lethal-peaceful-anger-2026-06-08.md](751-direct-melee-lethal-peaceful-anger-2026-06-08.md): direct hero melee lethal peaceful shopkeeper and watch anger fallout via C's `hmon()` guard snapshot.
- [752-direct-melee-priest-ghod-hitsu-2026-06-08.md](752-direct-melee-priest-ghod-hitsu-2026-06-08.md): direct hero melee lethal priest `hmon()` wrapper-tail shrine retaliation gate, deity message, and Wisdom exercise.
- [753-direct-melee-priest-wakeup-ghod-hitsu-2026-06-08.md](753-direct-melee-priest-wakeup-ghod-hitsu-2026-06-08.md): direct hero melee nonlethal peaceful priest wakeup anger, unconditional temple `ghod_hitsu()`, and wrapper-roll second retaliation.
- [754-direct-melee-surviving-wakeup-setmangry-2026-06-08.md](754-direct-melee-surviving-wakeup-setmangry-2026-06-08.md): direct hero melee surviving-hit non-priest `wakeup()`/`setmangry()` anger cleanup, tame preservation, and post-knockback priest/watch wrapper ordering.
- [755-direct-melee-sleeping-wakeup-growl-2026-06-08.md](755-direct-melee-sleeping-wakeup-growl-2026-06-08.md): direct hero melee sleeping survivor wake message/growl ordering, `wakeup()`/`setmangry()` cleanup, and hostile no-anger canaries.
- [756-direct-melee-sleeper-growl-wake-nearto-2026-06-08.md](756-direct-melee-sleeper-growl-wake-nearto-2026-06-08.md): direct hero melee sleeper growl `wake_nearto()` side effect, nearby sleeper wait-mask cleanup, and silent/hostile canaries.
- [757-direct-melee-sleeper-growl-disturb-buried-zombies-2026-06-08.md](757-direct-melee-sleeper-growl-disturb-buried-zombies-2026-06-08.md): direct hero melee sleeper growl `wake_nearto()` buried-zombie disturbance, adjacent buried corpse zombify timer shortening, and silent-source no-disturb canaries.
- [758-direct-melee-setmangry-elbereth-hypocrisy-2026-06-08.md](758-direct-melee-setmangry-elbereth-hypocrisy-2026-06-08.md): direct hero melee `setmangry()` Elbereth hypocrisy, post-wipe engraving fade/deletion, high/low alignment penalties, and peaceful/vulnerable gates.
- [759-direct-melee-setmangry-scare-monster-scroll-onscary-2026-06-08.md](759-direct-melee-setmangry-scare-monster-scroll-onscary-2026-06-08.md): direct hero melee `setmangry(TRUE)` scare-monster scroll `onscary()` parity, hero-square scroll hypocrisy gating, and hard scare-immunity canaries.

## Cross-Cutting Themes

- Replace scattered JS fields with C-shaped ownership boundaries: object registry/factory, shop bill ledger, monster placement/scheduler, save schema, and window/menu contracts.
- Move object transfers through shared helpers. Pickup, drop, shop, container, tip, floor effects, ice, burial, and save/restore should not each invent metadata cleanup.
- Keep merge rules source-visible. Inventory, floor, projectile, level-generation, and container stacking should share C-shaped object metadata and timer gates instead of per-path predicates.
- Centralize source-visible pipelines before adding more special cases: command parsing, level generation finalization, monster turns, terrain effects, and display redraw ordering.
- Keep public sessions as tests only. Implementation slices should be justified by upstream C behavior and local source references, not by private-suite inference.

## Ranked Roadmap

1. Shop ledger foundation from `05`: current JS is still partly field-based; split-stack unpaid returns, itemized bill-row payment, carried-container itemized `#pay` aggregation, robbed-only `#pay` compensation, unpaid food first-bite billing, starter partial-use `check_unpaid_usage()` debit coverage including Bell of Opening apply, wand zaps, wand engraving with post-spend billing, no-effect wand `#apply` break usage plus `COST_DSTROY` dummy billing, camera use, can-of-grease applications and successful squeaky-board `#untrap` repair, squeaky-board potion-of-oil `#untrap` useup billing, lamp and potion-of-oil apply lighting, potion-of-oil lamp refuel through `#dip`, potion-of-oil weapon and weapon-tool oiling through `#dip`, potion-of-sickness/healing-family poisonable weapon `#dip`, magic-lamp `#rub` djinni release, spellbook study completion, magic-marker writing, tinning-kit corpse applications, crystal-ball gazing, shared musical-instrument apply coverage for ordinary no-charge instruments plus magic flute/harp improvisation and frost/fire horn zaps, narrow tin open/trap-destroy billing, failed spellbook read destruction, carried and hero-caused floor fire destruction, accepted shop-floor container put-in sales, carried-bag partial unpaid put-in split rows, shop-floor container take-out slot/burden/partial-stack preflight plus artifact blast/evasion, fatal touch-petrifying corpse checks, loadstone lift exceptions, contained boulder lift exceptions, and stale field-only cleanup with live split-bill preservation for shop-floor container take-out/tip billing, single-object floor pickup slot/burden/partial-stack preflight including gold lift splitting, scare-monster scroll state/dust/type-call billing including menu pickup basics and floor-style used-up shop quotes, preflight-before-shop-quote ordering for single shop-floor pickup, priced pickup menu rows plus stack-aware per-unit pickup quotes, same-shop bill-row proof for unpaid pickup/container/food merge targets, expanded simple `FOOD(...)` pickup/full-inventory merge compatibility with age averaging and C weights/costs where needed, special-food floor/drop/projectile stacking and pickup/container-takeout inventory merge gates for corpse/egg/tin species, hatching eggs, revivable corpses, names, age averaging, and same-shop unpaid proof, whole-container pickup quote/content pricing with contained-gold exclusion, loadstone weight/slot exceptions, and multi-pickup partial-success ordering with per-item burden prompts and gold lift preflight, ordinary shop-floor magic-bag tip loss/put-in explosion billing with `sellobj()`-before-explosion ordering, paid-container unpaid-content cleanup before shop-floor magic-bag put-in explosions, shop-floor nested-trigger tip explosions into carried magic bags, shop-floor cursed magic-bag `#loot` loss, partly eaten food lost-merchandise exclusion, cursed magic-bag extracted-container contained-gold and unbilled nested-content exclusions, floor bag-of-tricks `#loot`, floor horn exclusion from `#tip`, floor bag-of-tricks `#tip` temporary live-row usage billing, narrow carried magic-bag held-loss billing with off-shop used-up preservation, carried magic-bag apply message/turn-cost gating, magic-bag scatter break/useup and destructive floor-effect preservation, hard-landing projectile container-content impact before shop return/debt, top-level hard-landing projectile breakage before placement, same-shop paid projectile sale and thrown-gold projectile donation before stacking, hole/trapdoor `ship_object()` debt routing before migration, carried `ship_object()` fragile breakage before migration, non-destroying shop box lock-break dummy billing, cream-pie `COST_SPLAT` dummy billing, remove-curse water `COST_UNCURS` dummy billing, water-dip devaluation and horn/amethyst neutralization dummy billing, confused remove-curse water live-row price increases, cursed charging uncharge/disenchant dummy billing, cursed enchant weapon degradation/disenchantment dummy billing, cursed enchant armor disenchantment dummy billing, confused enchant weapon/armor and destroy armor proof-stripping dummy billing, blessed destroy armor erosion dummy billing, stale-field rejection for used-up row synthesis, recursive debt/loss, selected-shop usage/payment, blind unique-adjacent `#pay` target selection, C-shaped live/resident/visible `#pay` scanner, `Pay whom?` getpos-style monster/object cursor cycling, cursed wand backfire `useupall()` billing, ordinary dropped-container sale/no-charge state, direct gold drop/pickup donation/charge parity, loadstone drop/throw/stash refusal basics, broader angry/robbed `sellobj()` shopkeeper-state branches, and CANDLESHOP candelabrum special-stock/no-sale uninterested branches are covered in ordinary paths, but broad split routing outside those paths, generic `obfree()`/container-aware `stolen_value()` parity, remaining magic-bag valuation/source/target cases, remaining broader `oc_merge` cases outside the floor/drop/projectile/pickup special-food paths, remaining less-common `check_unpaid_usage()` callers, non-bite `costly_alteration` outside covered food/tin/box-lock/cream-pie/remove-curse-water/water-dip-devaluation/horn-amethyst-neutralization/cursed-charging/cursed-enchant-weapon/cursed-enchant-armor/confused-proof-stripping/blessed-destroy-armor-erosion/no-effect-wand-break paths, and less ordinary `addtobill()`/quote positioning outside whole-container pickup are missing.
2. Object registry and canonical object factory from `02`: no-match wish retry, exact no-wish declines, denied quest-artifact disappearance conduct, quantity/`spe` constraints, charge suffixes, wizard-mode selected trap and broad terrain/furniture non-object wishes including beartrap/land-mine ambiguity, throne/fountain/sink creation, water/lava/ice, altars, graves, trees, iron bars, clouds, doors, walls, secret corridors, room/floor/ground, and drawbridge under-terrain state, Candelabrum/Book name and description wishes, selected non-wizard substitutions, Bell namedesc behavior, `empty horn of plenty`, final wished `owt`, lenses weight/pair naming/namedesc matching, meat-ring plural/weight, candle wished weight, horn-of-plenty concrete identity, concrete pancake/cram/kelp/slime-mold/royal-jelly/meatball/enormous-meatball/K/C ration `FOOD(...)` wish metadata, current-fruit slime mold `spe` identity for generated and wished objects, wish-local charged-tool metadata for bag of tricks, expensive camera, tinning kit, can of grease, magic marker, crystal ball, magic flute, frost horn, fire horn, horn of plenty, magic harp, drum of earthquake, and the Bell of Opening path, and wand-of-wishing abuse-charge coverage are covered in narrow parser-local paths; `mkobj`, wishes, weight, timers, names, display, and save/bones fruit-id remapping should still share one metadata source.
   Latest narrow additions: figurine wishes now apply C's requested monster-type restrictions for unique monsters, ordinary human/non-were monsters, werecreature exceptions, and mail daemon exclusion while retaining the random initialized figurine for disallowed requests. Corpse/statue/tin/egg wishes now also cover the C creation-first binding distinctions: non-figurine werebeasts convert to human were-forms, rejected corpse/tin targets preserve randomized fallback objects, statues bind human/unique/no-corpse monsters, tin wishes apply C unique/no-corpse/genocide/nutrition gates, and invalid egg wishes clear hatch timers while Scorpius/killer-bee/baby-to-grown hatchability is covered.
3. Level generation lifecycle and minimal `sp_lev` layer from `03`: fix generation ordering, shared finalization, and special/quest level data drift.
4. Command, prompt, and menu registry from `01`: remove literal-key dispatch drift and make `getlin`, `yn_function`, extended commands, and menus reusable.
5. Monster placement, scheduler, and combat cores from `04`: build shared `goodpos`, turn phases, `hmon`, `mattackm`, passive, and projectile contracts.
6. Save/restore/bones schema from `06`: serialize levels explicitly, restore through ID maps, and make timers/migration/bones source-visible.
7. Trap, liquid, terrain, and material-damage primitives from `07`: add one post-placement terrain pipeline and shared object damage rules.
8. Display, RNG, glyph, and discovery diagnostics from `08`: make trace drift visible, then centralize discovery/glyph/redraw ordering.

## Selected Next Slice

Use `PORTING_PLAN.md` for the active immediate slice list. This README is an index and roadmap only; detailed completed-work history belongs in the numbered audit notes.

Every code slice should still be followed by focused source-derived checks plus `npm run score`.
