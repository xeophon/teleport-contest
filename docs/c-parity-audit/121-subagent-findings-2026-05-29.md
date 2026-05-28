# Subagent Findings 121 - Compact Object and Monster Parity Batch

## Implemented Slice: Carried Figurine Stone-To-Flesh Animation

Covered self-cast stone-to-flesh animation for carried, non-shop-billed, non-golem, non-vegetarian figurines. The JS path now applies the C material and resistance gates, creates the figurine monster at the hero square with no generated inventory and no creation message, stops the carried figurine timer, removes the figurine from inventory, and prints the visible animation message without adding the meat smell wording.

C source:

- `nethack-c/upstream/src/zap.c:1993`: `stone_to_flesh_obj()` is the object spell effect.
- `nethack-c/upstream/src/zap.c:2002`: only mineral and gemstone objects are affected.
- `nethack-c/upstream/src/zap.c:2006`: affected objects still pass through `obj_resists(obj, 2, 98)`.
- `nethack-c/upstream/src/zap.c:2017`: statues and figurines share the corpse-stat monster branch.
- `nethack-c/upstream/src/zap.c:2019`: golems are handled as a separate flesh-golem transformation path.
- `nethack-c/upstream/src/zap.c:2021`: vegetarian monsters become meatballs instead of animating.
- `nethack-c/upstream/src/zap.c:2030`: figurines animate with `makemon(ptr, oox, ooy, NO_MINVENT|MM_NOMSG)`.
- `nethack-c/upstream/src/zap.c:2035`: shop-billed figurines need a stolen-value branch before object removal.
- `nethack-c/upstream/src/zap.c:2041`: timed figurines stop their object timers before removal.
- `nethack-c/upstream/src/zap.c:2043`: carried figurines use `useup()`; floor figurines use `delobj()`.
- `nethack-c/upstream/src/zap.c:2047`: visible successful animation prints `The figurine animates!`.
- `nethack-c/upstream/src/zap.c:2058`: failed animation can fall through to no-result or corpse fallback depending on monster generation flags.

Subagent findings:

- The smallest stone-to-flesh branch was carried, non-shop-billed, non-golem, non-vegetarian figurine animation. It avoids the shop billing branch, statue content transfer, floor deletion path, golem-to-flesh wording, and failed-animation corpse fallback.
- `make_familiar()`/figurine application behavior is not the right JS helper for this spell path because C uses direct `makemon()` without tameness and without monster starting inventory.
- Ordinary upward non-petrifying corpse impact is a good next `toss_up()` candidate, but it should not be mixed with full generic falling-object damage, artifact hit, and `Maybe_Half_Phys()` parity.
- Meatball, meat ring, meat stick, and enormous meatball should classify as `DOGFOOD` for carnivorous pets in `dogfood()`, separately from the current stone-to-flesh object work.
- Thrown-gold `ship_object()` still needs stairs, ladders, and special-stairs down-gate coverage beyond the already covered remote seen hole/trapdoor branch.
- Forced chest helper coverage still needs destroyed ice-box survivor thaw/timer restart details, while real `#force` should continue to ignore ice boxes because C only selects `Is_box()`.

Covered JS behavior:

- `js/cmd.js`: added a carried-figurine animation classifier for non-shop mineral/gemstone figurines whose corpse-stat monster is neither a golem nor vegetarian.
- `js/cmd.js`: self-cast stone-to-flesh now awaits the inventory effect so figurine animation can call `makemon()`.
- `js/cmd.js`: successful carried figurine animation uses `NO_MINVENT | MM_NOMSG`, clears the figurine transform timer fields, removes the figurine, and emits the visible C message.
- `js/cmd.js`: the meat replacement and meat smell/merge path is now tracked separately so figurine animation does not smell like transformed meat.

Regression coverage:

- `test/shop-billing-helpers.test.mjs`: self-cast stone-to-flesh animates a carried goblin figurine into an untame monster with no inventory, removes the figurine, clears timer fields, and prints `The figurine animates!`.
- `test/shop-billing-helpers.test.mjs`: the same carried figurine obeys the C object-resistance roll and remains unchanged when it resists.

Verification:

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern "stone to flesh" test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `npm run score` (`44/44 passing`)

## Deferred Compact Candidates

- Ordinary corpse `toss_up()`: `nethack-c/upstream/src/dothrow.c:1260` marks corpse/egg petrifiers, while `dothrow.c:1342` through `dothrow.c:1423` handles nonbreaking falling-object damage, hard helmets, artifact hits, silver/blessed bonuses, and `Maybe_Half_Phys()`. JS now covers touch-petrifying corpse self-hit from the previous slice; ordinary corpses should be split off carefully.
- Pet food meat items: `nethack-c/upstream/src/dog.c:1054` through `dog.c:1060` treats tripe ration, meatball, meat ring, meat stick, and enormous meatball as `DOGFOOD` for carnivores and `MANFOOD` otherwise. JS currently has the tripe/food-roll branch in `js/allmain.js:1843` but not the full stone-to-flesh meat family.
- Thrown-gold down-gates: C callers route through `ship_object()` from thrown landing (`nethack-c/upstream/src/dothrow.c:1819`), drop/floor effects (`nethack-c/upstream/src/do.c:298`), and rolling boulder gates (`nethack-c/upstream/src/trap.c:3424`) when `down_gate()` permits migration. JS currently limits the thrown-gold remote shipping helper to seen holes and trapdoors.
- Destroyed ice-box survivors: `nethack-c/upstream/src/lock.c:199` through `lock.c:202` converts surviving ice-box corpse age and restarts corpse timeout when a destroyed box spills contents; `nethack-c/upstream/src/mkobj.c:2478` through `mkobj.c:2502` shows the matching off-ice timer restart mechanics. Keep this at the helper level unless a separate source-backed path makes ice boxes forceable.
