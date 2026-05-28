# Subagent Findings 2026-05-28: Wielded Potion Bash and Remaining Potion/Oil/Stone Edges

## Implemented Slice: Wielded Potion Bash Delivery

C routes successful melee with a wielded potion through `hmon_hitmon_potion()`: it splits one object from a stack or unwields the single potion, removes that potion from inventory, calls `potionhit(mon, obj, POTHIT_HERO_BASH)`, suppresses the ordinary "You hit" text, and then applies only fixed bash damage to surviving non-shade targets. Source anchors: `nethack-c/upstream/src/uhitm.c:615`, `nethack-c/upstream/src/uhitm.c:1095`, and `nethack-c/upstream/src/uhitm.c:1421`.

The JS melee path now diverts wielded potions through the shared direct `potionhit()` implementation. A single potion is consumed, a stack consumes one and remains wielded, potion crash/evaporation/vapor effects occur, and ordinary weapon conduct/chronicle hit tracking is skipped. Focused tests cover confusion potion bash and stack preservation.

Deferred from the same C path:

- Exact peaceful-monster force-fight and invisible-target interaction belongs with the broader `hmon()`/command path.
- Lethal bash cleanup should eventually share the monster death lifecycle, especially for vampshifter revival.
- Full C message ordering around every potion identity should continue to be validated one identity at a time.

## Potion Discovery and `trycall()` Audit

C `potionhit()` calls `potionbreathe()` if vapor reaches the hero; otherwise, visible dknown target squares reach `trycall(obj)`. `potionbreathe()` uses `makeknown()` for self-evident `kn` effects, but non-`kn` dknown vapor still offers a call prompt. Wet towel interception blocks effects without skipping the tail naming logic. Source anchors: `nethack-c/upstream/src/potion.c:1906`, `nethack-c/upstream/src/potion.c:1910`, `nethack-c/upstream/src/potion.c:1932`, and `nethack-c/upstream/src/potion.c:2111`.

JS currently formal-discovers known vapor effects and misses the shared non-`kn` prompt path. Best compact slice: add a called-potion record/prompt helper, schedule it from visible no-vapor potion hits and non-`kn` vapor, and let wet towel cases still reach the naming tail.

## Burning-Oil Explosion Collateral Audit

C lit-oil explosions run `zap_over_floor()` over each 3x3 blast square before applying monster damage. Source anchors: `nethack-c/upstream/src/explode.c:478`, `nethack-c/upstream/src/zap.c:5141`, and `nethack-c/upstream/src/explode.c:606`.

JS direct lit-oil potion hits already cover the blast damage, adjacent hero damage, and wakeup shape, but not floor/terrain collateral. Ranked remaining slices are web and floor-object fire collateral, terrain effects for ice/water/fountains/doors, monster inventory ignition, and hero sliming cleanup. Loose floor potions should not be burned by the floor-object fire helper; C's `burn_floor_objects()` applies to scrolls, spellbooks, and green slime.

## Stone-to-Flesh Object Rows and Resistance Audit

C `stone_to_flesh_obj()` still has compact rows not yet covered in JS: `BOULDER -> ENORMOUS_MEATBALL`, eligible `GEM_CLASS -> MEATBALL`, and resistance through `obj_resists(obj, 2, 98)`. Source anchors: `nethack-c/upstream/src/zap.c:2014`, `nethack-c/upstream/src/zap.c:2018`, and `nethack-c/upstream/src/zap.c:1994`.

The safest next stone-to-flesh slices are ordinary object resistance shared by existing wand/ring transformations, carried/floor boulder conversion, and eligible gem conversion while excluding glass/worthless stones. Statue and figurine handling should wait for the broader monster/statue lifecycle.

## Shifted Vampire Lethal Revival Audit

C blessed-water potion damage can be lethal to shifted vampires, but `mondead()` intercepts vampshifters with `vamprises()` before ordinary death cleanup, reviving them as their base vampire form. Source anchors: `nethack-c/upstream/src/potion.c:1831`, `nethack-c/upstream/src/mon.c:2886`, and `nethack-c/upstream/src/mon.c:3096`.

JS nonlethal vampire-shifter water behavior is covered, but lethal water still removes the monster normally. A narrow implementation would add a pre-removal revival helper that restores base vampire data, avoids vanquish/corpse/drop side effects, emits the rise message, and then lets wake/anger tail behavior continue.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern='wielded .*potion|hero-thrown confusion potion hits' test/shop-billing-helpers.test.mjs`
