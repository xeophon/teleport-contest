# Special-Food Merge And Timer Audit - 2026-05-27

This note records the follow-up parallel C-source audits after the egg timer slice. The implemented slice is deliberately narrow: floor, projectile, and dropped-object stacking now applies the C `mergable()` special-food gates for corpses, eggs, and tins where the current JS object model has enough data.

## C Merge Model

Source anchors:

- `invent.c:4363` routes floor placement through `stackobj()`, which tries `merged()` against objects already at the location.
- `invent.c:800` performs the actual merge after `mergable()`, including age averaging for ordinary mergeable objects and quantity transfer.
- `invent.c:4377` is the shared `mergable()` predicate used by inventory and object placement.
- `invent.c:4433` requires matching `corpsenm` for corpses, eggs, and tins.
- `invent.c:4438` rejects hatching eggs and revivable corpses.
- `timeout.c:976`, `timeout.c:1007`, and `timeout.c:1015` define egg hatch timer attach, kill, and callback behavior.

Important C merge gates visible in this audit:

- Both objects must have the same object type, neither can be marked `nomerge`, and the object class row must be mergeable.
- BUC state, `unpaid`, `spe`, `no_charge`, broken, trapped, lit, eaten/rotten food state, erosion, grease, proofing, and knownness gates can block merging.
- Corpses, eggs, and tins additionally require identical monster species.
- Hatching eggs do not merge.
- Revivable corpses do not merge.
- Objects with attached monster or monster-id data do not merge.
- Unpaid objects require same-price proof.

## Implemented JS Status

`js/cmd.js` now imports `eggHasHatchTimer()` from the shared egg timer helper and applies a local special-food predicate from `sameMonsterThrownStackObject()`:

- corpse, egg, and tin stacks require matching `corpsenm.name`;
- either egg having local hatch timer fields prevents stacking;
- troll-class/Rider revivable corpses are kept separate;
- the existing floor/projectile/drop checks still enforce type, BUC, `spe`, unpaid unit-price proof, erosion, color, and other local fields.

This covers the current floor placement path used by `placeStackableFloorObject()`, projectile landing restacking, and dropped-floor restacking. Public tests in `test/shop-billing-helpers.test.mjs` cover hatching eggs staying separate, different egg species staying separate, compatible non-timed same-species eggs merging, and revivable troll corpses staying separate.

Scope caveats:

- Inventory pickup merge still deliberately excludes corpses, eggs, and tins in `pickupObjectCanInventoryMerge()`.
- Level-generation stacking in `js/mklev.js` checks species but not local hatch timers or revivable corpse status.
- This does not add full C `objects[].oc_merge` metadata, attached monster/id gates, full name gates, or central timer ownership.
- Tin variety and broader food/glob details remain local-path work until the object registry owns those fields.

## Merge Audit Follow-Ups

The merge-focused audit found these next candidates:

- Add a shared special-food merge predicate and reuse it for inventory pickup, floor placement, projectile landing, level-generation stacking, and container insertion.
- Enable compatible non-timed eggs, ordinary corpses, and same-species tins to merge in inventory where C permits it, with age averaging and shop bill-row proof.
- Keep timed eggs, revivable corpses, attached-monster corpstats, and mismatched tin/corpse/egg species separate.
- Audit tinning-kit output and corpse-to-tin paths against `set_corpsenm()` and `mergable()` so generated tins carry merge-compatible species and weight metadata.

## Timer Audit Follow-Ups

The timer-focused audit confirmed that C object timers are a central queue:

- `timeout.h:11`, `timeout.c:1978`, `timeout.c:2222`, and `timeout.c:2247` define the timer queue and object timer operations.
- `timeout.c:2505`, `timeout.c:2707`, and `timeout.c:2751` serialize and relink timers.
- `save.c:295`, `save.c:538`, `restore.c:930`, and `do.c:1819` split global, level, carried, migrating, and restored timer lifecycles.
- Egg and figurine callbacks are silent or skipped when the object is away, contained, buried, or migrating.

Remaining JS gaps:

- Save/restore and level return do not run central elapsed timer catch-up.
- Expired contained, buried, or migrating eggs and figurines still rely on local field scans.
- Copy, split, merge, and destruction paths need one object-timer transfer/kill API instead of field-specific cleanup.
- A lightweight timer registry should come before adding more independent timer fields.

## Other Parallel Audit Findings

Magic-bag/container valuation:

- C anchors: `pickup.c:2488`, `pickup.c:2537`, `pickup.c:2658`, `pickup.c:2803`, `pickup.c:3710`, `pickup.c:3993`, `shk.c:2995`, `shk.c:3307`, `shk.c:3712`, and `shk.c:1542`.
- Narrow next candidates are bill-limit parity for recursive container billing, owner-aware lost valuation across shopkeepers, undisclosed container payment state, and temporary floor special-source bill restoration under full-ledger or already-unpaid conditions.

Object factory/registry:

- C anchors: `objects.h:31`, `objclass.h:47`, `objclass.h:187`, `mkobj.c:1177`, `mkobj.c:267`, `mkobj.c:867`, `mkobj.c:175`, `mkobj.c:194`, `mkobj.c:303`, `mkobj.c:1875`, `objnam.c:4909`, `objnam.c:5071`, and `objnam.c:5255`.
- Narrow next candidates are generated erosion/proof/grease RNG parity, a shared object metadata registry, canonical baseline fields in `mksobj`, `oc_prob`-driven class selection, unified object weight, and registry-backed wish metadata.

Non-ordinary eating:

- C anchors: `objects.h:1048`, `objects.h:1067`, `objects.h:1080`, `objects.h:1117`, `eat.c:137`, `eat.c:1509`, `eat.c:1611`, `eat.c:1855`, `eat.c:1945`, `eat.c:2101`, `eat.c:2179`, `eat.c:2187`, `eat.c:2508`, `eat.c:2953`, `eat.c:2984`, and `eat.c:3026`.
- Narrow next candidates are tin corpse-type effects, non-rotting tins, pyrolisk/stale egg conduct, corpse/glob victual state, carried corpse effects, and explicit apple/pear platform policy.

## Ranked Next Slice

The best bounded continuation from this slice is a shared merge predicate for corpses, eggs, and tins. Start by replacing the floor-local predicate with an exported helper that can be reused by pickup and level-generation stacking, then add inventory pickup coverage for compatible non-timed eggs and same-species tins while preserving timed egg and revivable corpse rejection.
