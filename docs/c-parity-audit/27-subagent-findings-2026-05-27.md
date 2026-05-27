# C Parity Audit 27: Meat Stick Metadata and Merge Coverage

## Scope

This slice adds JS object identity for C's `MEAT_STICK` food row and wires it through eating, wishing, simple-food pickup merging, `mklev.js` container merging, pet object weight, and shop base cost. Audit 45 later adds the first focused stone-to-flesh transformation row for carried marble wands, while broader object-polymorph parity remains separate.

## C Source Notes

- `nethack-c/upstream/include/objects.h:1033-1037`: the `FOOD(...)` macro marks ordinary comestibles mergeable with `BITS(1, 1, ...)`.
- `nethack-c/upstream/include/objects.h:1045`: meatballs, meat sticks, and meat rings are special food rows created from objects by stone-to-flesh rather than normal random food generation.
- `nethack-c/upstream/include/objects.h:1054-1064`: `meatball` and `meat stick` are mergeable `FOOD(...)` rows with delay 1, weight 1, material `FLESH`, nutrition 5, and brown display; `meat ring` is the explicit non-mergeable contrast.
- `nethack-c/upstream/src/invent.c:4379-4422`: `mergable()` requires same `otyp`, `oc_merge`, matching BUC/state fields, and matching food `oeaten`/`orotten`.
- `nethack-c/upstream/src/eat.c:2157-2160`: `MEAT_STICK` shares the meatball/enormous-meatball/meat-ring first-bite feedback path.
- `nethack-c/upstream/src/eat.c:2998-3013`: `FLESH` foods count as animal products, and all non-egg flesh violates vegetarian conduct.
- `nethack-c/upstream/src/zap.c:2076-2085`: stone-to-flesh transforms rings into `MEAT_RING`, wands into `MEAT_STICK`, and gems/stones into `MEATBALL`.

## JS Status

- `js/cmd.js:1150`, `js/cmd.js:1242`, `js/cmd.js:1279`, `js/cmd.js:1359-1360`, `js/cmd.js:1440`, `js/cmd.js:4940`, and `js/cmd.js:5152` now define meat stick identity, nutrition, delay-one victual metadata, wish rows, quantity bound, weight, and shop cost.
- `js/cmd.js:11959-11970` now treats meat sticks as flesh conduct, and `js/cmd.js:18837-18851` includes them in the covered simple mergeable food allowlist.
- `js/mklev.js:158` and `js/mklev.js:1559-1580` now expose meat stick as a specific food row for generated-object and container merge metadata.
- `js/allmain.js:363-426` now gives pets the C unit weight for meat sticks.
- `test/shop-billing-helpers.test.mjs:6038-6059`, `test/shop-billing-helpers.test.mjs:11948-11963`, `test/shop-billing-helpers.test.mjs:12221-12229`, `test/shop-billing-helpers.test.mjs:12369-12395`, `test/shop-billing-helpers.test.mjs:12410-12436`, and `test/shop-billing-helpers.test.mjs:12456-12551` cover meat stick eating, pickup merge, full-inventory preflight, cost, and shop-bill merge guards.
- `test/wishing.test.mjs:628-668` covers singular and plural meat stick wishes with C identity, plural, nutrition, weight, and cost metadata.
- `test/mklev-container-merge.test.mjs:261-270` covers `add_to_container()` merging meat sticks while retaining the meat-ring negative contrast.

## Remaining Follow-Ups

- Broaden the Audit 45 stone-to-flesh marble-wand slice into a real object transform pipeline so other `WAND_CLASS` mineral rows, rings, and stones can transform and merge through normal inventory/floor paths.
- Replace local food tables with a registry-backed source for `oc_merge`, material, cost, weight, delay, nutrition, color, and creation policy.
- Magic-bag loss owner routing is now covered in audit 28 for floor-source cursed magic-bag losses; remaining magic-bag work should converge that local helper with a central `obfree()`/`stolen_value()` subsystem.
- Potion-dip follow-ups remain separate: bounded acid corrosion, inventory-action `#altdip` source-first flow, and full `drink_ok` source menus are now covered in later potion audits, including potion-potion alchemy recipes/bad mixtures in audit 36; remaining potion-dip gaps are tracked in the audit index.
- Poisoned weapon display ordering was handled in audit 31 for inventory and `#dip` prompts; broader C-shaped `xname()`/`doname()` unification remains separate.
