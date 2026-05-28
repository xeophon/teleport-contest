# Subagent Findings 2026-05-28: Stone-to-Flesh Rings and Remaining Potion/Oil Edges

## Implemented Slice: Stone-to-Flesh Mineral/Gemstone Rings

Upstream `stone_to_flesh_obj()` gates on `MINERAL` or `GEMSTONE`, then maps `RING_CLASS` objects through `poly_obj(obj, MEAT_RING)` and emits the meat smell. Source anchors: `nethack-c/upstream/src/zap.c:1993`, `nethack-c/upstream/src/zap.c:2002`, `nethack-c/upstream/src/zap.c:2076`, and the `MEAT_RING` object row in `nethack-c/upstream/include/objects.h:1061`.

The JS stone-to-flesh path previously covered only carried/floor marble wands. The implemented slice adds mineral/gemstone ring material detection and replacement with non-mergeable meat rings for self-cast inventory and downward floor-object paths. Focused tests cover carried mineral rings, carried wooden rings left unchanged, and floor gemstone rings preserving location/shop cleanup fields.

Deferred from the same C function:

- `obj_resists(obj, 2, 98)` for ordinary object resistance and artifact resistance.
- `BOULDER -> ENORMOUS_MEATBALL`.
- `GEM_CLASS -> MEATBALL`.
- `STATUE`/`FIGURINE` corpse or animation paths, including golem-to-flesh-golem handling and contents release.
- Beam-location routing beyond the covered self/downward spell paths.

## Direct Potion Delivery Audit

C routes wielded potion melee hits through `hmon_hitmon_potion()`, splitting one potion from stacks, unwielding/removing the item, and calling `potionhit(mon, obj, POTHIT_HERO_BASH)`. Source anchors: `nethack-c/upstream/src/uhitm.c:621`, `nethack-c/upstream/src/uhitm.c:1094`, and `nethack-c/upstream/src/uhitm.c:1421`.

JS has a broad hero-thrown direct `potionhit()` path, but a wielded potion still behaves like a generic melee weapon: fallback damage, no crash/evaporation/vapor/effect path, and no potion consumption. Best next compact tests: wielded confusion potion bash, stack-of-two bash consuming one, acid/blessed-water bash using monster potion effects, and lit-oil bash explosion.

## Potion Discovery/Trycall Audit

C `potionhit()` calls `potionbreathe(obj)` when vapor reaches the hero; otherwise, visible dknown target squares run `trycall(obj)`. `potionbreathe()` formally discovers only self-evident `kn` vapor effects, while non-`kn` dknown vapor offers a call prompt. Source anchors: `nethack-c/upstream/src/potion.c:1906`, `nethack-c/upstream/src/potion.c:1910`, `nethack-c/upstream/src/potion.c:1932`, and `nethack-c/upstream/src/potion.c:2111`.

JS currently models formal discovery for known vapor effects but not the non-`kn` call prompt path. Wet towel interception also returns before a future naming opportunity, while C still reaches the tail naming logic. This should be implemented as prompt/discovery work, not as another direct potion effect.

## Burning-Oil Explosion Audit

C fire explosions run `zap_over_floor()` across the 3x3 blast before monster damage, then apply fire inventory and monster/hero effects. Source anchors: `nethack-c/upstream/src/explode.c:478`, `nethack-c/upstream/src/explode.c:511`, and `nethack-c/upstream/src/explode.c:606`.

JS direct lit-oil hits currently handle explosion damage and wakeups, but not the full terrain/floor-object collateral. Compact remaining slices are floor-object fire collateral through existing burn helpers, web/ice/water/fountain terrain collateral through existing fire-ray helpers, monster inventory ignition, and hero sliming cleanup.

## Shifted Vampire Lethal Water Audit

C blessed-water `potionhit()` can kill a shifted vampire form, but `mondead()` intercepts vampshifters with `vamprises()` and revives them as the base vampire before ordinary death cleanup. Source anchors: `nethack-c/upstream/src/potion.c:1831`, `nethack-c/upstream/src/mon.c:2886`, and `nethack-c/upstream/src/mon.c:3096`.

JS covers nonlethal vampire-shifter water interactions, but lethal blessed water still goes through ordinary monster removal. This belongs with broader death lifecycle/newcham work because it needs revival, no corpse/drop/vanquish side effects, and post-revival wake/anger tail behavior.

## Common No-Effect Adjacent Vapor Audit

C common no-monster-effect potions still run the shared adjacent/same-square hero vapor gate. For gain level, levitation, fruit juice, monster detection, object detection, see invisible, gain energy, and enlightenment, `potionbreathe()` has no status effect but still offers dknown call handling. Source anchors: `nethack-c/upstream/src/potion.c:1888`, `nethack-c/upstream/src/potion.c:1906`, and `nethack-c/upstream/src/potion.c:2111`.

JS already routes these direct hits through the shared adjacent vapor tail and no-effect `potionBreathe()` default. The remaining work here is mostly test coverage plus the shared non-`kn` potion `trycall()` prompt path above.

## Verification

- `node --check js/cmd.js`
- `node --test --test-reporter=spec --test-name-pattern='stone to flesh' test/shop-billing-helpers.test.mjs`
