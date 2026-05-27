# Special-Food Pickup Merge And Follow-Up Audits - 2026-05-27

This note records the parallel C-source audits after the floor/drop/projectile special-food stacking slice. The implemented slice is deliberately narrow: inventory pickup and shop-floor container takeout can now merge compatible corpse, egg, and tin stacks through the same local C-style gates used by the current pickup merge helper.

## Implemented Pickup Slice

Source anchors:

- `pickup.c:1705` uses `merge_choice()` before lifting a floor object.
- `pickup.c:1897` routes picked objects through `addinv()`.
- `pickup.c:2727` and `pickup.c:2770` route container takeout through the same inventory-add path.
- `invent.c:775` defines `merge_choice()` and rejects billable shop-floor objects when the target is not already unpaid.
- `invent.c:814` defines `merged()`, including age averaging, quantity transfer, name transfer, bill transfer, and absorbed-object cleanup.
- `invent.c:1056`, `invent.c:1101`, and `invent.c:1108` route inventory addition through quiver and inventory merge checks.
- `invent.c:4379` defines the shared `mergable()` predicate.
- `invent.c:4437`, `invent.c:4442`, and `invent.c:4466` are the corpse/egg/tin species, hatching-egg/reviver-corpse, and object-name gates.
- `objects.h:1033` marks the C food class as mergeable, while exceptions are handled by object state.

JS status:

- `pickupObjectCanInventoryMerge()` no longer blanket-rejects all corpses, eggs, and tins.
- Compatible non-timed eggs can merge into inventory and container-takeout targets.
- Same-species tins can merge.
- Ordinary same-species corpses can merge, but troll-class and Rider corpses remain separate.
- Hatching eggs remain separate.
- Mismatched corpse, egg, or tin species remain separate.
- Special-food pickup merges now age-average like C `merged()`.
- Special-food name compatibility follows C's important distinction: eggs and tins can merge when either side is unnamed and copy the source name into an unnamed target, while corpses only merge when both corpse names match.
- Same-shop unpaid bill-row proof still gates billable pickup/container-takeout merges; billable sources cannot merge into paid targets.
- `pickupObjectName()` now recognizes egg-shaped JS objects via `isEggItem()`, which keeps helper-created eggs on the same display path as numeric `EGG` objects.

Coverage added in `test/shop-billing-helpers.test.mjs`:

- compatible non-timed eggs merge and age-average;
- hatching eggs are rejected;
- tins require matching species;
- ordinary corpses merge and age-average;
- revivable corpses are rejected;
- billable special-food pickup rejects paid targets but merges into same-shop unpaid rows;
- object-name compatibility covers named eggs, name copy into unnamed eggs, and strict corpse names.

Scope caveats:

- Inventory pickup still excludes globs until glob absorption can share the C timer and quantity behavior.
- `js/mklev.js` container insertion, floor stacking, and monster-inventory stacking still use local predicates.
- The object registry still does not model full `oc_merge`, attached monster/id data, candle/oil age buckets, blind/hallucination knownness, or all C state gates.
- Split/copy timer identity remains local-field based rather than timer-registry based.

## Pickup And Container Merge Audit

The pickup-focused audit confirmed the implemented slice and ranked the remaining merge work:

- `add_to_container()` in C (`mkobj.c:2676`) uses `merged()`; JS `mklev.js:4762` still uses `sameStackableObject()`, which does not share the pickup predicate.
- JS inventory pickup still excludes globs even though C has `glob` absorption through `merged()` and `globby_bill_fixup()`.
- At this audit stage, JS simple-food pickup coverage still omitted low-risk C food rows such as `tripe ration`, `candy bar`, and `meat stick`; audits 25 and 27 close those specific rows.
- The next clean merge slice is to move pure merge predicates into a shared helper used by `cmd.js` and `mklev.js`, then add container insertion checks for meat-ring nonmerge, `oeaten`, `orotten`, species, hatch timers, revivers, names, and age averaging.

## Floor And Level-Generation Stack Audit

Source anchors:

- `mkobj.c:227` and `mkobj.c:238` create and place objects without implicit stacking.
- `mkobj.c:2003` has the special same-location gold merge.
- `mkobj.c:2305` places objects without generic stacking.
- `sp_lev.c:2422` calls `stackobj()` after scripted special-level mutations.
- `invent.c:4366` routes floor stacking through `stackobj()`.
- `invent.c:814` and `invent.c:4379` are the shared `merged()`/`mergable()` implementation.

Remaining JS drift:

- `mklev.js:4745` `sameStackableObject()` is narrower than C for some fields and broader for others because it is not driven by object metadata.
- `mklev.js:4795` includes many specific food rows but misses some C mergeable foods such as cream pies and candy bars.
- `mklev.js:4762` container insertion lacks the timed-egg and reviver-corpse gates.
- `mklev.js:4784` monster inventory only merges globs, while C monster inventory can merge any compatible object.
- Projectile/floor command helpers now have corpse/egg/tin gates, but still do not cover every C `mergable()` field.

## Timer Lifecycle Audit

Source anchors:

- `timeout.c:2247` defines object timer operations such as `start_timer`, `stop_timer`, `obj_split_timers`, and `obj_stop_timers`.
- `mkobj.c:457` shows that `splitobj()` copies the object but creates distinct child timers.
- `mkobj.c:1318` `set_corpsenm()` preserves egg hatch remaining time while restarting corpse and figurine timers.
- `invent.c:814` `merged()` keeps the target object and stops absorbed-object timers.
- `invent.c:4442` rejects merging hatching eggs and revivable corpses.
- `mkobj.c:3738` glob absorption stops both shrink timers and starts a new averaged one.

Remaining JS drift:

- `mklev.js:4762` can merge hatching eggs or revivable corpses inside containers.
- `cmd.js:20806` dropped-floor stacking currently keeps the dropped object as survivor, while C `merged()` keeps the target stack and stops absorbed timers.
- Split helpers still shallow-copy timer fields in floor pickup, container put, and container takeout.
- Partial container-put of figurines can preserve a copied carried transform timer inside a container.
- Contained due eggs keep local timer fields and can hatch later after takeout; C consumes the timer callback without hatching while contained.

Ranked timer slices:

1. Fix `add_to_container()` merge parity: block timed eggs and revivable corpses, age-average rot-only corpses, and clear absorbed timer fields.
2. Fix dropped-floor stacking survivor/timer parity.
3. Add one split helper that duplicates modeled timers with fresh sequence/order metadata.
4. Stop figurine transform timers on split pieces leaving inventory for container put.
5. Consume due contained egg timers without hatching.

## Magic-Bag And Shop Billing Audit

The billing-focused audit found two likely implementation gaps and two mostly coverage gaps:

- Bill limit: C `add_one_tobill()`, `addtobill()`, and `splitbill()` stop at `BILLSZ`; the item is not marked unpaid. Some JS fallback paths still mark objects unpaid or increment bill state when `addObjectToShopBill()` returns null because the bill is full.
- Owner-aware lost merchandise: C `find_objowner()` and `stolen_value()` locate the bill owner before charging lost merchandise. JS magic-bag floor loss paths can charge the source shopkeeper while leaving another owner's bill row intact.
- Undisclosed container payment: JS appears mostly aligned, but tests should cover `cknown=false` payable entries so payment does not reveal item names or mutate knowledge state.
- Floor special-source temporary bill rows: normal bag-of-tricks `#tip` temporary billing is covered, but full-bill behavior needs a regression test to ensure no usage fee is charged when the temporary row cannot be added.

Ranked billing slices:

1. Full-bill pickup/container-takeout/bag-of-tricks temporary-row behavior.
2. Owner-aware lost-merchandise valuation for cross-shop bill rows.
3. Undisclosed container `#pay` naming and knowledge-state coverage.

## Non-Ordinary Eating Audit

Source anchors:

- `objects.h:1048`, `objects.h:1067`, and `objects.h:1117` define eggs, meat/globs, and tins.
- `eat.c:576`, `eat.c:791`, and `eat.c:1129` handle conduct and first/post food effects.
- `eat.c:1461`, `eat.c:1528`, and `eat.c:1723` handle tins.
- `eat.c:1813` and `eat.c:1855` cover rotten/corpse/glob behavior.
- `eat.c:2099` and `eat.c:2510` cover egg first and post effects.
- `eat.c:2627` and `eat.c:2817` cover edibility prompts and `doeat()`.

Remaining JS drift:

- Tin eating does not call the same conduct/effects pipeline that C applies to monster contents.
- Tin variety lacks the nonrotting-corpse rotten-to-homemade override, and tin naming only covers a lichen special case.
- Carried corpses bypass most C age, taint, acid, poison, stoning, sliming, Rider, and post-effect behavior.
- Poisonous corpse coverage is much narrower than C's `M1_POIS`-driven rule.
- Globs are immediate one-shot objects in JS, while C uses corpse-eating style victual state and later effects.
- Pyrolisk and stale egg exceptions omit conduct handling.
- `u.uedibility` smell prompts are not implemented.

Ranked eating slices:

1. Add monster-food fact helpers for vegetarian, poisonous, acidic, stoning, sliming, and no-corpse flags.
2. Bring tin consumption through conduct, variety, and monster-effect logic.
3. Unify carried/floor corpse and glob eating.
4. Add conduct for egg exception paths.
5. Implement one-use edibility smell prompts.

## Ranked Next Slice

The best bounded continuation is now `mklev.js` container insertion merge parity. It is source-backed by both the merge and timer audits, has local blast radius, and can reuse the special-food gates just proven for pickup. The first checks should cover hatching eggs, same-species ordinary eggs, troll corpses, ordinary corpse age averaging, and name/species mismatch behavior inside containers.
