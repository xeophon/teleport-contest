# Container And Monster-Inventory Merge Audit - 2026-05-27

This note records the follow-up C-source audits after the special-food pickup merge slice. The implemented slice broadens the local `mklev.js` merge predicate used by container insertion, level-generation floor stacking, and monster inventory stacking, plus closes the command-side floor/drop/projectile object-name gate.

## Implemented Merge Slice

Source anchors:

- `mkobj.c:2642` `add_to_minv()` tries `merged()` across a monster's inventory before prepending a new object.
- `mkobj.c:2675` `add_to_container()` tries `merged()` across container contents before prepending.
- `invent.c:814` `merged()` performs age averaging, quantity transfer, name transfer, weight recalculation, and absorbed-object timer cleanup.
- `invent.c:4379` `mergable()` is the shared C predicate for inventory, floor, containers, and monster inventory.
- `invent.c:4437`, `invent.c:4442`, and `invent.c:4466` gate corpse/egg/tin species, hatching eggs/reviver corpses, and object names.
- `objects.h:880` defines tool `oc_merge`; ordinary tools like tin openers, figurines, lamps, and cameras are not mergeable, while candles are.

Implemented JS status:

- `js/mklev.js` now applies modeled `oc_merge` metadata before generic stacking. Positive merge classes include coins, modeled foods except meat rings, potions, scrolls, gems/rocks, candles, and stackable missile/weapon names; nonmergeable tools, wands, spellbooks, armor, rings, and amulets stay separate.
- `add_to_container()`, `stack_floor_object()`, and `add_to_minv()` share the same local predicate and merge side effects for modeled fields.
- Container and monster-inventory merges now reject hatching eggs, revivable corpses, corpse/egg/tin species mismatches, object-name mismatches, named-vs-unnamed corpses, partly eaten/rotten food mismatches, attached monster/id data, lit oil, different candle age buckets, and incompatible `how_lost`.
- Successful non-glob merges now age-average, copy a source object name into an unnamed target where C allows it, and clear absorbed-source timer fields.
- Command-side floor/drop/projectile stacking now applies C object-name compatibility and copies source names for non-corpse stack targets.

Coverage added:

- `test/mklev-container-merge.test.mjs` covers container special-food merges, timer/reviver/species rejection, eaten/rotten/name gates, meat-ring nonmerge, modeled `oc_merge` positive/negative cases, candle buckets, lit oil, `how_lost`, and monster-inventory reuse.
- `test/shop-billing-helpers.test.mjs` covers command-side floor stack name compatibility, including ordinary named stackables, named source copy, and strict corpse names.

Scope caveats:

- `mklev.js` still uses local metadata rather than the real generated object registry; the `oc_merge` gate is conservative and modeled from existing JS object classes.
- Knowledge-state side effects (`known`, `bknown`, `rknown`) and blind/hallucination-sensitive merge gates are still incomplete.
- Unpaid container merges remain conservative because correct C `same_price()` support needs shop-bill ownership in a shared helper.
- `add_to_minv()` now merges stackable objects, but acquisition still lacks a full C `mpickobj()` wrapper for no-charge, shop-bill removal, `how_lost`, known-state, and carried-effect cleanup.

## Subagent Findings

### Container Merge

The container audit confirmed that C `add_to_container()` delegates to `merged()`, which means container insertion should not have a separate simplified merge predicate. It also identified remaining work after this slice:

- Full `objects[].oc_merge` should ultimately come from a generated object registry, not a hand-modeled predicate.
- Candle, oil, `how_lost`, artifact, and knowledge-state gates need full registry/state parity.
- Same-price unpaid container merges should be revisited once bill ownership is shareable outside `cmd.js`.

### Monster Inventory

The monster-inventory audit found that C `add_to_minv()` uses the same `merged()` path as containers. Before this slice, JS `add_to_minv()` only merged globs. The direct merge path is now covered, but remaining C drift is in acquisition:

- JS callers still bypass a C-shaped `mpickobj()` wrapper.
- Floor pickup, pet pickup, cube engulf, statue contents, nymph steal, and bullwhip snatch should eventually route through a helper that normalizes `no_charge`, shop bill state, `how_lost`, known flags, carried effects, and light/timer handling before `add_to_minv()`.

### Name And Special-Food Merge

The name audit confirmed that the earlier special-food species/timer/reviver gates were present in command-side floor/drop/projectile stacking, but C object-name compatibility was still missing there. This slice adds that command-side name gate and source-name copy for non-corpse stack targets.

### Timer Lifecycle

The timer audit ranked these remaining object-timer slices:

- Contained due eggs should have their hatch timers consumed without hatching; C's callback only hatches inventory, floor, or monster-inventory eggs.
- Split helpers still shallow-copy timer fields instead of creating distinct timer identities.
- Partial container-put of figurines can preserve a copied carried transform timer; C stops carried figurine timers when they leave inventory.

This slice addresses only the merge-time timer cleanup and timed-egg merge rejection in the local `mklev.js` paths.

### Shop Bill Limit

The bill-limit audit found that C `addtobill()` and `add_one_tobill()` refuse full bills before setting `unpaid`, and temporary bill rows behave the same way. Remaining JS drift:

- Some fallback paths still mark objects unpaid after `addObjectToShopBill()` returns `null`.
- Full-bill pickup/container-takeout should leave objects free and not synthesize legacy payable debt.
- Temporary floor special-source rows should not create usage fees when the bill is full.

Recommended next tests: full direct pickup, full pickup merge preflight, full shop-floor container takeout, full floor bag-of-tricks `#tip`, and full split row.

## Ranked Next Slice

The best bounded continuation is full-bill shop ledger parity. It is independent of the merge helper work, source-backed by `shk.c`, and has clear tests around `BILLSZ`, pickup, container takeout, and temporary rows. A parallel next timer slice would be contained due egg expiration, but bill-limit cleanup has a narrower blast radius and directly removes known phantom unpaid state.
