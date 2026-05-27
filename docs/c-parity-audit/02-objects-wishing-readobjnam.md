# C Parity Audit 02: Objects, Wishing, and `readobjnam`

## Scope

This audit compares upstream NetHack C object creation and wish parsing with the current JS implementation. It covers:

- object instance shape and object-class metadata
- `mkobj`, `mksobj`, class-specific initialization, and container contents
- `readobjnam`, wishing, named/called/labeled objects, artifact creation and naming
- object properties, erosion, BUC, charges, weight, `corpsenm`, and selected timers

The goal is parity planning only. The recommendations below are implementation slices, not private-test deductions.

## C reference map

| Area | C refs | Notes |
| --- | --- | --- |
| Object instance fields | `nethack-c/upstream/include/obj.h:27`, `nethack-c/upstream/include/obj.h:35`, `nethack-c/upstream/include/obj.h:191` | `struct obj` carries identity, location, type, quantity, BUC, knowledge, erosion, timers, `oextra`, `ONAME`, `corpsenm`, age, weight, worn mask, and many flag aliases. |
| Object-class metadata | `nethack-c/upstream/include/objclass.h:47`, `nethack-c/upstream/include/objclass.h:187` | `objects[]` and `obj_descr[]` drive names, descriptions, class, probabilities, material, weight, cost, chargeability, uniqueness, wishability, and object properties. |
| Object constants/macros | `nethack-c/upstream/include/hack.h:1188`, `nethack-c/upstream/include/hack.h:1271` | Corpse/statue constants and `ONAME_*` origin flags, including wish/random/artifact naming provenance. |
| Generic timers | `nethack-c/upstream/include/timeout.h:11`, `nethack-c/upstream/include/timeout.h:37` | Object timers cover rot, revival, zombification, burning, hatching, figurine transformation, and glob shrinking through a common timer layer. |
| Random object class weights | `nethack-c/upstream/src/mkobj.c:36`, `nethack-c/upstream/src/mkobj.c:48`, `nethack-c/upstream/src/mkobj.c:58`, `nethack-c/upstream/src/mkobj.c:66` | Normal, container, Rogue-level, and Gehennom class-probability tables. |
| Erosion on generated objects | `nethack-c/upstream/src/mkobj.c:175`, `nethack-c/upstream/src/mkobj.c:200` | Generated erosion/proofing/grease is conditional on material, artifact status, generation context, and damageability. |
| `mkobj`/`mksobj` | `nethack-c/upstream/src/mkobj.c:267`, `nethack-c/upstream/src/mkobj.c:867`, `nethack-c/upstream/src/mkobj.c:1177` | Type selection is table-driven from `objects[]`; `mksobj_init` handles class-specific initialization; `mksobj` sets the canonical instance baseline and weight. |
| Containers and placement | `nethack-c/upstream/src/mkobj.c:303`, `nethack-c/upstream/src/mkobj.c:2303`, `nethack-c/upstream/src/mkobj.c:2642` | Container contents, object placement, inventory/container insertion, weight, and timer/ice side effects are all integrated. |
| Corpse/statue/object timers | `nethack-c/upstream/src/mkobj.c:1297`, `nethack-c/upstream/src/mkobj.c:1384`, `nethack-c/upstream/src/mkobj.c:1471`, `nethack-c/upstream/src/mkobj.c:2050`, `nethack-c/upstream/src/mkobj.c:2391` | `set_corpsenm`, corpse rot/revival/zombification, glob shrinking, `mkcorpstat`, and ice timer adjustments. |
| Object weight/gold | `nethack-c/upstream/src/mkobj.c:1875`, `nethack-c/upstream/src/mkobj.c:2001` | Weight depends on object type, quantity, contents, corpse data, eaten state, globs, and gold quantity. |
| Wish parser stages | `nethack-c/upstream/src/objnam.c:3241`, `nethack-c/upstream/src/objnam.c:3345`, `nethack-c/upstream/src/objnam.c:3932`, `nethack-c/upstream/src/objnam.c:4177`, `nethack-c/upstream/src/objnam.c:4239`, `nethack-c/upstream/src/objnam.c:4902` | Fuzzy matching, object ranges, aliases, qualifier preparse, charge suffixes, postparse passes, artifact matching, and final object construction. |
| Wish prompt behavior | `nethack-c/upstream/src/zap.c:2575`, `nethack-c/upstream/src/zap.c:6313` | Wand luck gate, retry loop, random fallback after repeated bad wishes, conduct tracking, artifact origin, and delivery to inventory. |
| Naming/artifacts | `nethack-c/upstream/src/do_name.c:59`, `nethack-c/upstream/src/do_name.c:372`, `nethack-c/upstream/src/artifact.c:150`, `nethack-c/upstream/src/artifact.c:171`, `nethack-c/upstream/src/artifact.c:328`, `nethack-c/upstream/src/artifact.c:473` | `ONAME`, duplicate artifact prevention, artifact eligibility, existence flags, fuzzy artifact lookup, and origin tracking. |

## JS reference map

| Area | JS refs | Notes |
| --- | --- | --- |
| Level object constants and artifacts | `js/mklev.js:54`, `js/mklev.js:1497`, `js/mklev.js:3775` | Local constants, artifact definitions, and artifact helper routines are embedded in level-generation code rather than a shared object registry. |
| Generated erosion | `js/mklev.js:3754` | `mkobj_erosion_rolls` consumes RNG but does not assign erosion/proof/grease fields to an object. |
| `mksobj`/`mksobj_init` | `js/mklev.js:3904`, `js/mklev.js:3962` | Object construction is partial and uses ad hoc object shapes and hand-coded type behavior. |
| Container generation | `js/mklev.js:4277`, `js/mklev.js:4699`, `js/mklev.js:4721` | Box contents and add-to-container/minvent are simpler array operations without a C-like `where` model. |
| Object display/placement/random generation | `js/mklev.js:4384`, `js/mklev.js:4456`, `js/mklev.js:4469`, `js/mklev.js:4647`, `js/mklev.js:4651` | Display naming, placement, `mkobj`, `mkobj_at`, and gold creation are split and partly hand-rolled. |
| Corpse/statue/glob creation | `js/mklev.js:4765`, `js/mklev.js:4779`, `js/mklev.js:4808`, `js/mklev.js:4992`, `js/mklev.js:5037` | `set_corpsenm`, `mkcorpstat`, globs, and monster-death corpse/glob creation are implemented separately from C timer semantics. |
| Startup inventory objects | `js/allmain.js:956`, `js/allmain.js:1145`, `js/allmain.js:1194`, `js/allmain.js:1239`, `js/allmain.js:1338` | Role inventory uses another object creation path and has its own knowledge, BUC, and display fields. |
| Weight | `js/allmain.js:428`, `js/cmd.js:32999` | Weight is map/class based in startup and recomputed specially during wishing; it is not a single `weight()` equivalent. |
| Wish constants and parser tables | `js/cmd.js:630`, `js/cmd.js:973`, `js/cmd.js:1034`, `js/cmd.js:1110`, `js/cmd.js:1372` | Wish classes, qualifier regexes, base object maps, namedesc bounds, and wand maps are local to `cmd.js`. |
| Wish creation helpers | `js/cmd.js:9059`, `js/cmd.js:9083`, `js/cmd.js:9091`, `js/cmd.js:9391`, `js/cmd.js:9507`, `js/cmd.js:9815`, `js/cmd.js:9849`, `js/cmd.js:9891`, `js/cmd.js:10668` | Random wish fallback, requested enchantment, BUC, blank objects, monster/corpstat handling, statues, figurines, corpses/globs/eggs, and tins. |
| Wish artifact path | `js/cmd.js:9247`, `js/cmd.js:15484`, `js/mklev.js:3775` | Conduct and artifact creation exist, but are not backed by C `ONAME`/`artiexist` provenance. |
| Wish parser final path | `js/cmd.js:15056`, `js/cmd.js:15135`, `js/cmd.js:15157`, `js/cmd.js:15219`, `js/cmd.js:15317`, `js/cmd.js:15484`, `js/cmd.js:15508` | Qualifier application, quantity, named/called/labeled parsing, aliases, gems/groups, object construction, and the catch-all parser path. |
| Wish prompt execution | `js/cmd.js:28540`, `js/cmd.js:32720` | Wand luck gate and wish input handling are in command code; invalid wish behavior differs from C. |
| Object timers | `js/ice.js:167`, `js/ice.js:221`, `js/ice.js:285`, `js/cmd.js:13296`, `js/cmd.js:13491`, `js/cmd.js:13711` | Corpse timers, ice adjustment, and glob shrinking use object fields such as `rotAwayTurn`/`reviveTurn`/`zombifyTurn`/`globShrinkTurn`, not a generic timer queue. |

## Current parity observations

### Object model and metadata

Upstream C has two strong centers of truth:

- `objects[]`/`obj_descr[]` for object-type metadata.
- `struct obj` for object-instance state.

The JS implementation currently has several centers of truth:

- `js/mklev.js` for level-generation object constants, artifact definitions, `mksobj`, and `mkobj`.
- `js/cmd.js` for wishing object tables, parser helpers, artifact wish behavior, and display-time inventory delivery.
- `js/allmain.js` for startup inventory object generation and weight/knowledge fields.
- `js/ice.js` and `js/cmd.js` for corpse/glob timers.

That split is the main source of drift. It makes random generation, wish parsing, display, inventory, timers, object weight, and artifact creation each responsible for reconstructing pieces of C object semantics.

### `mkobj` and `mksobj`

C `mkobj` selects an object class from probability tables, then selects a concrete type by walking `objects[]` probabilities. It delegates initialization to `mksobj`, which creates a canonical object and applies `mksobj_init` class behavior.

JS mirrors the high-level class probability tables in `js/mklev.js:4469`, but concrete type selection is hand-coded per class. `mksobj` at `js/mklev.js:3904` creates a small JS object and `mksobj_init` at `js/mklev.js:3962` implements selected behavior with hard-coded type IDs and many local branches.

This is close enough for some visible object generation, but it is not table-driven. It also means object metadata changes require updates in multiple JS tables and parser branches.

### Object properties

C object instances carry many properties that matter to game behavior:

- BUC and knowledge flags: `cursed`, `blessed`, `known`, `dknown`, `bknown`, `rknown`, `cknown`, `lknown`, `tknown`.
- damage/protection state: `oeroded`, `oeroded2`, `oerodeproof`, `greased`.
- locks/traps/poison/light/recharge fields and aliases.
- `age`, `owt`, `where`, `timed`, `oextra`, `ONAME`, `oartifact`, `corpsenm`, and `usecount`.

JS objects use flexible field bags. Some fields exist on some paths, but there is no single normalization layer. For example, wished inventory objects are assembled in `js/cmd.js:32955`, level objects in `js/mklev.js:3904`, and startup inventory objects in `js/allmain.js:1239`. Those paths do not consistently assign `age`, `owt`, knowledge flags, `where`, timer linkage, `oextra`/`oname`, or C-compatible erosion fields.

### Erosion and greasing

C generated erosion is handled in `may_generate_eroded`/`mkobj_erosions` (`nethack-c/upstream/src/mkobj.c:175`, `nethack-c/upstream/src/mkobj.c:200`). It considers generation context, material, damageability, artifacts, body parts, and early inventory. It can set erosion, proofing, and grease.

JS has `mkobj_erosion_rolls` at `js/mklev.js:3754`, but it only consumes RNG. It does not mutate an object, and at least one caller invokes it without passing an object. Wish-time erosion is handled separately by regex/profile logic in `js/cmd.js:15056`, so generated objects and wished objects can diverge from C in different ways.

### Containers and object location

C tracks object state through `where` and list-specific insertion helpers. Container insertion updates containment, weight, and object state (`nethack-c/upstream/src/mkobj.c:2642`). `mkbox_cnts` also has object-specific behavior, including icebox corpse timer freezing and bag-of-holding nested magic-bag/cancellation handling.

JS stores level objects and container contents as arrays (`js/mklev.js:4456`, `js/mklev.js:4699`). This is simpler, but it does not model C `where`, `timed`, or container weight propagation. `mkbox_cnts` at `js/mklev.js:4277` is a partial implementation.

### Corpse, egg, figurine, burn, and glob timers

C object timers are generic and typed. Corpse rot/revival/zombification, egg hatching, figurine transformation, object burning, and glob shrinking are all represented through the timer subsystem (`nethack-c/upstream/include/timeout.h:37`).

JS implements several timer concepts with direct fields:

- corpse rot/revival/zombification through `rotAwayTurn`, `reviveTurn`, and `zombifyTurn` in `js/ice.js:221` and processing code in `js/cmd.js:13491`.
- ice adjustment in `js/ice.js:285`.
- glob shrinking through `globShrinkTurn` and `js/cmd.js:13711`.
- figurine timeout attachment from the wish path at `js/cmd.js:32997`.

This can support visible behavior, but it is not the same state model. C timer operations like "stop this object's timer", "object timer checks", and carrying timers across containment/location changes do not have one shared JS abstraction.

### `readobjnam` and wishing

C `readobjnam` is a staged parser:

1. preparse counts, articles, BUC, enchantment, proofing, light/wet/blank/poison/trap/lock/grease/zombifying/erosion/partly-eaten/historic/diluted/empty/glob qualifiers;
2. parse charge suffixes;
3. resolve named/called/labeled/object-of phrases, monster corpstat forms, class names, alternates, object ranges, namedesc lookup, gems/glass, fruits, and artifact names;
4. create the object with `mksobj` or `mkobj`;
5. apply C wish restrictions and object fixups.

JS has a substantial independent parser in `js/cmd.js`. It covers many common qualifiers and special cases, but it is built from local regexes, local object maps, namedesc bounds, and parser fallbacks. The previous catch-all path where unrecognized input became a generic weapon has been removed: no-match wish results now keep the prompt in C-style retry mode and the fifth bad description falls back to a random object (`nethack-c/upstream/src/zap.c:6313`). Exact `nothing`/`nil`/`none` input now follows C's pre-parser no-wish sentinel while qualified or suffixed forms stay in the bad-description retry path (`nethack-c/upstream/src/objnam.c:4918-4924`). Wished gold now follows C's money-specific lower bound and non-wizard `5000` cap (`nethack-c/upstream/src/objnam.c:4527-4537`). Selected wizard trap wishes now use the non-object `&hands_obj` result shape: they create a map trap, skip inventory delivery, and skip ordinary wish conduct/gods notice; the covered set includes C's wizard-only beartrap/land-mine ambiguity where plain names stay disarmed objects, `trapped`/suffix forms create armed map traps, and `untrapped`/`object` forms force object creation (`nethack-c/upstream/src/objnam.c:3563-3581`, `nethack-c/upstream/src/objnam.c:4622-4659`, `nethack-c/upstream/src/zap.c:6374-6377`). Wizard terrain/furniture wishes now use the same non-object result shape for `throne`, `fountain`, `sink`, water, lava, ice, altars, graves, trees, iron bars, clouds, doors, walls, secret corridors, room/floor/ground, and drawbridge under-terrain state, including common looted/disturbed, magic/blessed fountain, aligned altar, door mask, and melting-ice timer state (`nethack-c/upstream/src/objnam.c:3590-3869`, `nethack-c/upstream/src/objnam.c:4066-4071`). Denied quest-artifact wishes now increment artifact-wish conduct before returning the disappearance non-object result, matching the C finalization order (`nethack-c/upstream/src/objnam.c:5350-5378`). Charge suffixes now run through a common pre-lookup parser shaped like `readobjnam_parse_charges()`, including `(n)`, `(r:n)`, `(lit)`, trailing-text preservation, invalid suffix stripping, `SPE_LIM`, and wand-only recharge persistence. Wizard-mode Candelabrum/Book name and description wishes, selected non-wizard substitutions including Candelabrum/Book descriptions, the Bell namedesc silver-bell path, wizard-only venom wishes with normal-mode `oc_nowish` rejection, `empty horn of plenty`, final wished-object `owt` recomputation, lenses weight/pair naming/namedesc matching, meat-ring plural/weight, candle wished weight, horn-of-plenty concrete identity, concrete pancake/cram/kelp/royal-jelly/meatball/enormous-meatball/K/C ration `FOOD(...)` wish metadata with C capitalization, nutrition, weights, costs, plural quantities, aliases where covered, and `oc_prob + 1` bounds, wish-local `oc_charged`/unit-weight metadata for bag of tricks, expensive camera, tinning kit, can of grease, magic marker, crystal ball, magic flute, frost horn, fire horn, horn of plenty, magic harp, drum of earthquake, and the Bell of Opening path, and wand-of-wishing abuse-charge coverage now follow narrow C finalization rules. Remaining parser drift is in C's staged fuzzy matching, object ranges, exact property limits outside the covered suffix/`spe` cases, terrain side effects around liquid/object damage and wall-property qualifiers, broader artifact provenance/denial rules, and broader object-factory fixups.

### Wish modifiers and restrictions

C wish handling restricts several requested properties:

- enchantment requests are constrained by object class, luck, blessed/cursed state, and wand/tool charge rules.
- quantity only applies under mergeability and random wish rules.
- special items such as the real Amulet, Candelabrum, Bell, Book, magic lamp, and `oc_nowish` objects are substituted or rejected for non-wizards.
- requested light sources are actually lit through placement and burn-timer setup.
- random erosion from creation is cleared before requested erosion/proofing is applied.

JS implements some of this, but not all:

- `wishedSpeForItem` now has a narrow C-shaped class split: weapons, armor, weapon-tools, and charged rings use C's anti-abuse limits; wands and overlay-covered charged tools use local C metadata; crystal balls keep the wand-like negative `-1` cap, while bag of tricks, expensive camera, tinning kit, can of grease, magic markers, magic flute, frost horn, fire horn, horn of plenty, magic harp, drum of earthquake, and the Bell of Opening path cap positive requested charges at generated charges and collapse negative requests to zero. It is still local policy because JS lacks a registry-backed `oc_charged`/class table for every object.
- `applyWishedQuantity` now follows the C shape for common cases: non-mergeable wishes such as boots, wands, meat rings, expensive cameras, tinning kits, cans of grease, magic markers, bag of tricks, crystal balls, and spellbooks stay at one, plural spellings resolve to the base object where covered, pancake/cram/kelp/royal-jelly/meatball/enormous-meatball/K/C ration plural wishes get C-style two-object quantities, candles/ammunition keep the C multigen caps, and the separate wished-money path clamps normal-mode gold to `1..5000` while keeping wizard-mode counts uncapped. It is still local policy rather than full `objects[].oc_merge` metadata.
- `parseWishedChargeSuffix` now mirrors C's last-parenthesis suffix stage for `(lit)`, `(n)`, and `(r:n)`. Parsed recharge counts are assigned to wands only; charged tools receive only the parsed `spe`, and known charge display uses the stored recharge counter instead of hard-coded zero.
- selected non-wizard substitutions, wizard-mode real Candelabrum/Book name and description wishes, the Bell namedesc silver-bell path, and wish-local venom `oc_nowish` handling exist around `js/cmd.js:13298`, but they are parser-specific and not backed by `objects[].oc_nowish`.
- `empty` now zeroes bag-of-tricks and horn-of-plenty charges, the wish path refreshes final `owt` after qualifiers and quantity, lenses now use C's weight 3, cost 80, `oc_prob + 1` namedesc bound, non-merge quantity behavior, and "pair of lenses" display, meat rings use C food identity/weight 5 after plural lookup, candles use weight 2 per unit, wished horns of plenty keep the concrete `HORN_OF_PLENTY` type, wished bag of tricks, expensive camera, tinning kit, can of grease, magic marker, crystal ball, magic flute, frost horn, fire horn, horn of plenty, magic harp, drum of earthquake, and the Bell of Opening path now share local C metadata or equivalent special-row handling for non-merge quantity, charged status, unit weight/cost, and wish-time charge caps, and wished pancake/cram/kelp/royal-jelly/meatball/enormous-meatball/K/C ration rows carry concrete C food identity, capitalization, weights, nutrition, shop costs, and namedesc bounds. `huge meatball` and `huge chunk of meat` also resolve to `enormous meatball` in this local path. Generated `KELP_FROND` objects now also use the C `rnd(2)` quantity and food display metadata. This still depends on local weight/display maps rather than the C `objects[]` table.
- light handling is field-based rather than connected to a generic `BURN_OBJECT` timer.
- erosion is applied after wish parsing in `js/cmd.js:15056`, but generated erosion is already divergent.

### Artifact naming and creation

C artifact creation flows through `mk_artifact`, `artifact_exists`, `oname`, and `artifact_origin`. `ONAME` is the object name store, duplicate artifact naming is prevented, eligibility is checked, and provenance records whether an artifact was wished, randomly generated, gifted, named, placed by level definition, or found in bones.

JS has artifact definitions and helpers in `js/mklev.js:1497` and `js/mklev.js:3775`, plus wish-side matching in `js/cmd.js:15484`. It tracks generated artifact names/counts enough to prevent some duplicates. It does not have a C-equivalent `ONAME`/`artiexist` model with full origin flags, `mk_artifact` eligibility, role/race/alignment/skill filtering, or per-artifact generation metadata.

## Concrete parity gaps

1. **No shared object metadata registry.** JS object type metadata is duplicated across `mklev.js`, `cmd.js`, and `allmain.js` instead of using a C-like `objects[]` table.

2. **No canonical object constructor.** `mksobj`, wish creation, gold creation, monster corpse/glob creation, and startup inventory each create different object shapes. This causes inconsistent fields for knowledge, weight, age, timers, naming, and artifact state.

3. **`mkobj` concrete type selection is not table-driven.** JS class weights mostly mirror C, but per-class type rolls are hand-coded and cannot naturally honor `objects[].oc_prob`, `oc_nowish`, `oc_unique`, `oc_charged`, material, or descriptions.

4. **Generated erosion is a RNG sink, not behavior.** `mkobj_erosion_rolls` consumes randomness without setting `oeroded`, `oeroded2`, `oerodeproof`, or `greased`.

5. **Weight is fragmented.** C has `weight()`; JS has startup weight maps, wish-time carrying recomputation, and per-object `owt` fields in selected cases.

6. **Container state is incomplete.** JS lacks C-style `where`, timer membership, object list transitions, container weight propagation, and several `mkbox_cnts` special cases.

7. **Object timers are not unified.** Corpse, glob, figurine, burn, and ice logic use direct fields and local processors instead of one object timer model. This makes `set_corpsenm`, containment changes, icebox freezing, and object destruction harder to make C-equivalent.

8. **`readobjnam` matching is still local.** Unrecognized wishes no longer become arbitrary named weapons, exact `nothing`/`nil`/`none` declines now stay distinct from no-match retry, repeated failures randomize through the existing C-shaped path, and selected wizard trap plus broad terrain/furniture wishes now use the non-object result path. JS still lacks C `wishymatch`, ranges, namedesc lookup, alternate spellings, terrain side effects around liquid/object damage and wall-property qualifiers, broader denied-artifact handling, and full parser staging.

9. **Wish matching is not C fuzzy matching.** C `wishymatch`, ranges, namedesc lookup, alternate spellings, and artifact matching are more systematic than the JS local regex/table approach.

10. **Wish property limits are partial.** Requested `spe`, quantity, and charge suffixes now have narrow C-shaped implementations for common object classes, but BUC, erosion, light, poison, lock/trap, full `oc_merge`/`oc_charged` metadata beyond the covered local overlays, and non-wishable substitutions are not all constrained by the C rules.

11. **Artifact provenance is partial.** JS duplicate tracking exists, but not full `artiexist`/`artifact_origin`/`ONAME` semantics or `mk_artifact` eligibility.

12. **Startup inventory is a separate creation system.** `allmain.js` duplicates object generation and knowledge setup instead of reusing the same object factory as level generation and wishing.

## Recommended implementation slices

### Slice 1: Shared object registry

Create a JS object metadata registry that mirrors the public C object table semantics:

- type id, class, name, description, probability, material, weight, cost
- `oc_charged`, `oc_unique`, `oc_nowish`, merge behavior, and object properties
- helper predicates for damageability, material erosion, poisonability, light sources, multigen objects, and wishability

Then migrate `mkobj`, wish lookup, display naming, and weight to read from that registry instead of local maps.

### Slice 2: Canonical object factory

Add a single constructor/factory equivalent to the C `mksobj` baseline:

- assigns id, type/class, quantity, age, `owt`, knowledge defaults, BUC defaults, `where`, `timed`, `corpsenm`, `oextra`/name fields, and artifact fields
- exposes helpers for `set_corpsenm`, BUC mutation, knowledge mutation, weight refresh, and naming
- keeps compatibility shims so existing callers can migrate incrementally

Use it first from `mklev.js`, then from wish creation, then from startup inventory.

### Slice 3: Table-driven `mkobj` and `mksobj_init`

Move concrete random object selection to the registry probabilities. Port `mksobj_init` class-by-class:

1. gems, food, corpses, tins, eggs, and globs
2. potions, scrolls, spellbooks, rings, wands, and amulets
3. tools and containers
4. weapons and armor
5. artifact chance and artifact-specific post-processing

Fix generated erosion as part of this slice so it mutates objects and respects material, artifact, and generation context.

### Slice 4: Object timer abstraction

Introduce a small object timer layer with typed timers matching the C concepts:

- corpse rot, Rider/troll revival, zombification
- egg hatch
- figurine transform
- object burn
- glob shrink

Back it with JS turn fields if needed, but expose operations equivalent to starting, stopping, checking, and moving timers with objects. Then wire `ice.js`, `cmd.js` corpse processing, glob shrinking, and figurine handling through the shared layer.

### Slice 5: Artifact state and naming

Add artifact existence/provenance state before deepening wish parity:

- `artifact_exists`, `artifact_name`, `oname`, and `artifact_origin`
- duplicate prevention for named artifacts
- origin flags for wished, random, named, gifted, level-defined, bones, and found
- `mk_artifact` eligibility checks for base object, uniqueness, role/race/alignment/skill constraints, and special generated properties

This makes random generation, naming, wishing, and display share the same artifact rules.

### Slice 6: Port `readobjnam` in stages

Replace the wish parser by stages instead of adding more one-off regexes:

1. preparse articles, counts, BUC, enchantment, proofing, light/wet/blank/poison/trap/lock/grease/zombifying/erosion/partly-eaten/historic/diluted/empty/glob size
2. parse charge/recharge suffixes
3. implement `wishymatch`, alternate spellings, object ranges, namedesc lookup, and class-name lookup using the registry
4. handle monster corpstat forms, tins, eggs, statues, figurines, globs, dragon armor, gems/glass, fruits, and artifact names
5. return an explicit result kind: object, terrain/trap/furniture wizard wish, hands/nothing, or no match; the no-match, exact no-wish, selected wizard trap sentinels including beartrap/land-mine ambiguity, and broad wizard terrain/furniture sentinels exist, but the remaining result kinds still need the full C split and shared terrain side-effect pipeline
6. keep the implemented C retry/random fallback behavior wired through the prompt while replacing the parser underneath it

The key no-match behavioral change is now in place: unknown input no longer becomes a named weapon, invalid descriptions retry, and repeated failures randomize through the existing random wish path.

### Slice 7: Wish finalization rules

After parser resolution, port the C finalization rules:

- registry-backed non-wizard substitutions for real Amulet, Candelabrum, Bell, Book, magic lamp, and `oc_nowish`, preserving the currently covered parser-local name/description cases and wish-local venom handling
- move the local requested-`spe` overlay into registry-backed class, `oc_charged`, luck, blessed/cursed, wand, and crystal-ball rules while preserving the covered bag-of-tricks, expensive-camera, tinning-kit, can-of-grease, magic-marker, crystal-ball, charged-instrument, horn-of-plenty, drum-of-earthquake, and Bell-of-Opening-path behavior
- replace the starter quantity gates with registry-backed `oc_merge`/multigen rules, keeping non-mergeable wished objects at quantity one
- replace the local weight maps behind final wished-object `owt` with registry-backed `weight()`; pancake/cram/kelp/royal-jelly/meatball/enormous-meatball/K/C ration weights plus bag-of-tricks, expensive-camera, tinning-kit, can-of-grease, magic-marker, crystal-ball, charged-instrument, horn-of-plenty, drum-of-earthquake, and Bell-of-Opening-path weights are covered in local overlays, but the broader registry is still missing
- requested erosion/proof after clearing generated erosion
- requested light via burn timer
- broader artifact conduct, disappearance/abuse rules, and gods-notice timing; denied current-role quest-artifact disappearance conduct is covered in the local path

### Slice 8: Public-mechanics verification

Add deterministic tests against documented upstream behavior, not private-test inference:

- random object class/type snapshots for representative seeds
- `mksobj_init` field snapshots by object class
- wish-string matrix for BUC, enchantment, erosion, charges, naming, artifacts, corpses, globs, tins, eggs, statues, figurines, and invalid wishes
- corpse/glob/egg/figurine/burn timer transitions
- container contents, icebox behavior, and weight refresh

## Suggested first cut

The most leverage comes from two small foundations:

1. a shared object registry with enough metadata for `mkobj`, wish lookup, and weight;
2. a canonical object factory used by new code paths while old callers are migrated.

Those two reduce the amount of duplicated parser and generator logic before attempting a full `readobjnam` port.
