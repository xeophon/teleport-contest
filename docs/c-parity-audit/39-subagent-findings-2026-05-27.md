# C Parity Audit 39: Impact-Drop Potion Vapor and Fresh Follow-Ups

## Implemented Slice

This slice extends Audit 38's broken-potion vapor helper to the C `obj_delivery()` path where migrating impact-dropped objects arrive with the hero. In C, `MIGR_WITH_HERO` delivery places the object at the hero, then calls `breaks()` on a hard landing; `breaks()` runs the normal break message plus `breakobj()`, so nearby broken potions apply `potionbreathe()` before disappearing. JS already modeled the impact-drop migration queue and hard-arrival breakage, but discarded broken potions without vapor side effects.

The JS change calls `brokenPotionBreathe()` in `deliverImpactDroppedObjects()` after the shatter/crash message and before the object is discarded. A focused test covers a confusion potion arriving with the hero, shattering, applying the generic odor message, and adding confusion without placing the potion on the floor.

## C Anchors

- `nethack-c/upstream/src/dokick.c:1639-1730`: `ship_object()` charges shop debt before migration and has a separate no-vapor pre-migration break case.
- `nethack-c/upstream/src/dokick.c:1768-1828`: `obj_delivery()` handles `MIGR_WITH_HERO`; if the landing is not soft, it calls `breaks()` instead of the silent `breaktest()`/`delobj()` path used for other arrivals.
- `nethack-c/upstream/src/dothrow.c:2453-2480`: `breaks()` is the normal break message plus `breakobj()` wrapper.
- `nethack-c/upstream/src/dothrow.c:2480-2520`: `breakobj()` calls `potionbreathe()` for nearby broken potions when the hero can breathe or has eyes.
- `nethack-c/upstream/src/dokick.c:1834`: random/non-hero migration breakage is silent deletion and must not get vapor.

## JS Notes

- `js/cmd.js:3456-3483`: `deliverImpactDroppedObjects()` now calls `brokenPotionBreathe()` for hard-arrival broken potions before skipping floor placement.
- `js/cmd.js:12149-12155`: the shared broken-potion helper keeps the C `next2u()`-style adjacency gate, wet towel protection, generic smell/eye message, and existing `potionBreathe()` side effects.
- `js/cmd.js:20169-20170`: the arrival helper is exposed only through test hooks.
- `test/shop-billing-helpers.test.mjs:8881-8894`: focused coverage for the with-hero arrival vapor path.

## Fresh Subagent Findings

- Direct `potionhit()` remains the larger potion gap. C routes hero-thrown potion hits and wielded-potion bash through `potionhit()` rather than floor landing breakage (`dothrow.c:2262`, `uhitm.c:1094`, `potion.c:1623-1913`). JS still treats thrown potions as generic misses/landing objects and wielded potions as generic weapons.
- Non-`kn` vapor `trycall()` is implementable but should be a dedicated display/discovery slice. C stores `oc_uname` through `trycall()`/`docall()` (`do.c:392`, `do_name.c:654`, `objnam.c:832`); JS has `_called_potions` prompt storage but does not yet render called potions or add discovery entries from vapor.
- Water vapor can be split safely. Gremlin split is feasible now through `potionBreathe()`; lycanthropy should wait for a source-shaped `you_were()`/`you_unwere()` runtime model (`potion.c:2080`, `were.c:192`, `were.c:213`).
- Broken-potion vapor should stay call-site-specific. C has vapor for inventory fire destruction, hot-ground `breakobj()`, and forced chest content shattering, but intentionally no vapor for cold, lava/floor fire boil, electrical destruction, random/non-hero migration, and generic object deletion (`zap.c:5917`, `do.c:352`, `lock.c:1285`).
- A non-potion high-impact shop slice is statue animation from shattering: C charges shop-owned statues and contents through `stolen_value()` before moving contents to the monster (`trap.c:854`, `trap.c:880`, `shk.c:3712`); JS `activateStatueTrap()` transfers contents with no charge.
- Stone-to-flesh remains a compact object-transform candidate. C turns mineral wands into meat sticks through `poly_obj()` (`zap.c:2002`, `zap.c:2076`); JS currently routes `stone to flesh` through generic healing spell behavior.

## Remaining Follow-Ups

- Implement direct hero-thrown and wielded-potion `potionhit()` for monster targets, preserving C hit chance, consume/no-floor behavior, vapor/trycall order, and shop lifetime.
- Add non-`kn` potion vapor `trycall()` plus called-potion display/discovery entries.
- Add the gremlin-only water vapor slice; defer lycanthropy until runtime were-form support exists.
- Add call-site-specific broken-potion vapor for hot ground, inventory fire destruction, and forced chest content shattering; keep lava, cold, non-hero migration, and generic destruction no-vapor.
- Consider statue-shatter shop debt and stone-to-flesh wand-to-meat-stick as next non-potion slices.
