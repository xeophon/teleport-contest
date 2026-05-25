# C Parity Audit 03: Levelgen, Specials, Quest

Date: 2026-05-25

Scope: upstream NetHack C/Lua level generation, special level loading, quest levels and quest text, shops/rooms/corridors, and generation behavior that matters during save/restore or bones restore. This audit is source-based only; it does not infer behavior from any private test suite.

## Executive Summary

The JS port has a substantial regular-level generator and many hand-written special-level builders, but it is not yet equivalent to the upstream C/Lua model. The largest parity gap is architectural: upstream special levels are data-driven through the `sp_lev` Lua API and finalized through a common path, while JS dispatches to hard-coded builders and only covers a subset of the special and quest level corpus.

Regular rooms, corridors, shops, and special-room filling are much closer than `sp_lev`, but there are still visible differences in room selection, special-room eligibility, shop shape checks, themeroom hooks, and generation lifecycle ordering. Quest support is split between hard-coded JS builders and an embedded quest text subset; upstream instead uses the role special level files plus `dat/quest.lua` with a common fallback, synopsis, random-entry, and output-mode system.

Restoration-sensitive generation is also incomplete. Upstream calls bones before generation, keeps special-level finalization centralized, serializes room trees and level-specific state, and has special handling for water/air levels, shops, and restored monsters. JS has a minimal JSON save/bones layer and some restored-monster catch-up logic, but lacks the C restore model and some no-bones and validation gates.

## Upstream C/Lua Model

### Level-generation lifecycle

Primary references:

- `nethack-c/upstream/src/mklev.c:849-927` clears level structures, rooms, regions, flags, stairs, branch state, and special-level coordinate offsets.
- `nethack-c/upstream/src/mklev.c:1251-1428` implements `makelevel()`.
- `nethack-c/upstream/src/mklev.c:1448-1573` handles mineralization and common topology finalization.
- `nethack-c/upstream/src/mklev.c:1577-1593` implements `mklev()`, including RNG reseeding, mapseen init, bones restore attempt, `makelevel()`, and `level_finalize_topology()`.

The C lifecycle is:

1. `mklev()` reseeds RNG state and initializes mapseen.
2. `getbones()` is attempted before creating a fresh level.
3. `gi.in_mklev` is set and `makelevel()` builds the level.
4. `level_finalize_topology()` applies digging bounds, mineralization, topology, graveyard flags, and `orig_rtype`, then clears generation-only coordinate offsets.
5. RNG state is reseeded again after generation.

`makelevel()` chooses among hard-coded special-level name checks, proto/special Lua loads, quest filler files, below-Medusa maze generation, Hell maze generation, and regular room/corridor generation. For regular levels it creates rooms, sorts them, places stairs, connects corridors, adds niches, optionally creates a vault or one special room, places branches, fills ordinary rooms, then fills special rooms.

### Ordinary rooms, corridors, and shops

Primary references:

- `nethack-c/upstream/src/mklev.c:366-436` creates ordinary rooms and invokes `themerms.lua` pre/generate/post hooks.
- `nethack-c/upstream/src/mklev.c:438-552` connects rooms through `join()` and `makecorridors()`.
- `nethack-c/upstream/src/sp_lev.c:2542-2663` implements `dig_corridor()`, including turn behavior, secret doors, early stop for extra corridors, and occasional boulders.
- `nethack-c/upstream/src/mklev.c:938-1050` fills ordinary rooms with monsters, objects, traps, gold, fountains, sinks, altars, graves, and statues.
- `nethack-c/upstream/src/mkroom.c:50-92` dispatches `do_mkroom()` for shops, zoos, swamps, and temples.
- `nethack-c/upstream/src/mkroom.c:94-216` implements `mkshop()`.
- `nethack-c/upstream/src/shknam.c:209-340` defines shop probabilities.
- `nethack-c/upstream/src/shknam.c:452-801` creates shop stock, names shopkeepers, initializes shopkeepers, and repairs/marks shop doors.

C corridor generation is not just "connect adjacent rooms"; it first joins nearby rooms, then all remaining connected components, then adds several extra corridors. `dig_corridor()` is shared by ordinary generation and special-level corridor directives.

C shop creation is a two-phase operation. `mkshop()` chooses and marks a room, while `stock_room()` later creates the shopkeeper, repairs the shop door, writes the inventory engraving when needed, fills stock positions, and sets `svl.level.flags.has_shop`.

### `sp_lev` Lua system

Primary references:

- `nethack-c/upstream/src/sp_lev.c:129-164` lists the Lua `des.*` API surface.
- `nethack-c/upstream/src/sp_lev.c:2981-3018` applies `des.level_init()` styles.
- `nethack-c/upstream/src/sp_lev.c:3214-3400` implements `des.monster()`.
- `nethack-c/upstream/src/sp_lev.c:3557-3755` implements `des.object()`.
- `nethack-c/upstream/src/sp_lev.c:3759-3831` implements `des.level_flags()`.
- `nethack-c/upstream/src/sp_lev.c:4028-4116` implements `des.room()`.
- `nethack-c/upstream/src/sp_lev.c:4146-4235` implements `des.stair()` and `des.ladder()`.
- `nethack-c/upstream/src/sp_lev.c:4283-4573` implements altars, traps, gold, corridors, and random corridors.
- `nethack-c/upstream/src/sp_lev.c:4771-4801` converts relative and absolute coordinates during level creation.
- `nethack-c/upstream/src/sp_lev.c:5443-5615` implements teleport, levregion, exclusion, and region APIs.
- `nethack-c/upstream/src/sp_lev.c:5991-6064` contains test/helper reset/finalize functions that show the common finalization sequence.
- `nethack-c/upstream/src/sp_lev.c:6381-6415` registers `des.*` functions.
- `nethack-c/upstream/src/sp_lev.c:6454-6501` implements `load_special()`.

Upstream special levels are Lua files under `nethack-c/upstream/dat/*.lua`. The loader executes them in a special-level coder, then runs a shared finalization path: link doors to rooms, remove boundaries, ensure a path out, clean up the map, wallify unless `corrmaze`, random-flip if allowed, count features, solidify if needed, fix up special objects/monsters, and optionally premap.

The Lua API is broad. It includes static maps, procedural rooms, objects, monsters, traps, terrain replacement, mineralization, regions, exclusions, teleport regions, level flags, wall properties, gas clouds, drawbridges, engravings, and random corridors. Several APIs accept tables with many optional fields, so parity is mostly a data-interpreter problem rather than a one-builder-per-level problem.

### Special and quest level corpus

Primary references:

- `nethack-c/upstream/src/dungeon.c:707-736` maps special-level names to global `d_level` variables.
- `nethack-c/upstream/src/dungeon.c:1447-1472` identifies special and branch levels.
- `nethack-c/upstream/src/mkmaze.c:1160-1207` selects and loads random special/proto/maze levels.
- `nethack-c/upstream/dat/quest.lua:1-25` documents quest text entry fields.
- `nethack-c/upstream/dat/quest.lua:29-194` defines common quest messages and fallbacks.
- `nethack-c/upstream/dat/quest.lua:196+` defines role-specific quest messages.

The upstream data directory contains role quest files such as `Arc-*.lua`, `Bar-*.lua`, `Cav-*.lua`, `Hea-*.lua`, `Kni-*.lua`, `Mon-*.lua`, `Pri-*.lua`, `Ran-*.lua`, `Rog-*.lua`, `Sam-*.lua`, `Tou-*.lua`, `Val-*.lua`, and `Wiz-*.lua`, plus non-quest specials such as the Planes, Castle, Sanctum, Medusa variants, Sokoban, Mines towns/endings, Wizard tower levels, Fort Ludios, Rogue level, and others.

Quest filler levels are also selected by `makelevel()` using role file codes and `fil[a|b]`, with the split based on the quest locate level.

### Quest text and quest state

Primary references:

- `nethack-c/upstream/src/quest.c:25-103` handles quest level arrival messages.
- `nethack-c/upstream/src/quest.c:140-216` checks quest eligibility and expulsion.
- `nethack-c/upstream/src/quest.c:225-279` completes the quest.
- `nethack-c/upstream/src/quest.c:281-390` implements leader conversation.
- `nethack-c/upstream/src/quest.c:394-505` implements nemesis, guardian, and generic quest talk.
- `nethack-c/upstream/src/questpgr.c:468-620` loads `quest.lua`, chooses role/common/fallback text, handles arrays, output modes, and synopsis history.
- `nethack-c/upstream/src/questpgr.c:623-633` exposes common and role quest pagers.

The C quest state machine is tied to special levels and text. Arrival messages depend on `on_start()`, `on_locate()`, and `on_goal()`. The leader conversation can reject, banish, assign the quest, encourage, accept completion, or give post-completion text. Goal-level behavior checks whether the quest artifact is on the floor, in monster inventory, buried, or already carried, and chooses the appropriate text.

Quest text is loaded from `dat/quest.lua`, not from C constants. The pager chooses role text first, falls back to common text when appropriate, supports multiple entries per message through RNG, tracks synopsis history, and supports different output modes.

### Restoration-sensitive generation

Primary references:

- `nethack-c/upstream/src/mklev.c:1577-1593` attempts bones before new generation.
- `nethack-c/upstream/src/mkroom.c:840-906` saves and restores room trees.
- `nethack-c/upstream/src/mkmaze.c:1536-1668` moves water/air bubbles and their contents.
- `nethack-c/upstream/src/mkmaze.c:1748-1855` restores and sets up water levels.
- `nethack-c/upstream/src/sp_lev.c:4771-4801` uses generation-only coordinate offsets that must be cleared after finalization.

Several generation decisions affect restore correctness: bones must be attempted before fresh generation, room topology must be serializable, special-level region/exclusion data must survive save/load, shops need consistent room and shopkeeper state, and moving Plane of Water/Air structures require level-specific restore handling.

## Current JS Model

### Level-generation lifecycle

Primary references:

- `js/mklev.js:7692-7818` implements `mklev()`.
- `js/mklev.js:17238-17286` clears level structures.
- `js/mklev.js:17688-17919` implements `makelevel()`.
- `js/mklev.js:21427-21444` finalizes topology.
- `js/mklev.js:7626-7675` restores bones from the JS virtual filesystem.

JS `mklev()` directly dispatches many named special levels before falling through to quest fillers, bones restore, Mines filler, or regular `makelevel()`. Many hard-coded special builders call `getbones()` themselves, but the lifecycle is decentralized. This differs from C, where `mklev()` attempts bones before fresh generation and special level loading is part of the generation branch.

JS `makelevel()` handles normal room/corridor generation, Rogue level, quest filler fallback, below-Medusa mazes, Hell mazes, and Mines filler levels. Non-Rogue special levels are generally handled before `makelevel()` by direct name dispatch.

### Hard-coded special builders

Primary references:

- `js/mklev.js:3148-3192` defines `QUEST_LEVEL_BUILDERS`.
- `js/mklev.js:8283-9899` contains several quest builders and quest filler builders.
- `js/mklev.js:10773-16901` contains Wizard tower, Gehennom, Plane, Castle, Big Room, Oracle, Mines, Sokoban, Vlad, and Medusa builders.
- `js/mklev.js:18147-18457` contains Rogue and random maze generation.
- `js/dungeon.js:11-91` defines dungeon branches and named special levels.
- `js/dungeon.js:190-270` places branches, levels, random level chances, and final special-level globals.

The JS port has many substantial hand-written builders. Covered examples include Oracle, Castle, Big Room, Medusa variants, Sokoban, Mines town/end variants, Wizard tower levels, several Gehennom levels, Fire and Air, Sanctum, Valley, Rogue, and selected quest levels.

However, the model is coverage-by-builder. A special level in `js/dungeon.js` only works if `mklev()` dispatches to a builder for that name. The current codebase has dungeon entries without complete builder coverage, including Fort Ludios (`knox`), fake Wizard levels, Astral, Water, Earth, and Tutorial 2. Quest coverage is also partial: the builder table covers only some role/level combinations.

### Rooms, corridors, and shops

Primary references:

- `js/mklev.js:18575-18602` creates ordinary rooms.
- `js/mklev.js:19366-19671` implements room creation, room registration, sorting, and topology.
- `js/mklev.js:19759-19986` implements corridor digging, `join()`, and `makecorridors()`.
- `js/mklev.js:17688-17919` chooses and fills ordinary/special rooms.
- `js/mklev.js:20592-20827` implements shop door selection, shopkeeper naming/init, shop stock, and shop room stocking.
- `js/mklev.js:20829-21039` fills special rooms.

Corridor generation is one of the closer ports: the core `dig_corridor()`, `join()`, and `makecorridors()` structure resembles C. Room creation and topology are also present.

Shop generation is partially close. JS mirrors the shop type probabilities and implements shopkeeper naming, special Izchak handling, stock placement, mimic chance, door repair, and inventory engravings. Remaining differences are mostly around eligibility and lifecycle details rather than the basic mechanics.

### Quest text and quest interaction

Primary references:

- `js/cmd.js:2432-2452` checks quest level kind and quest eligibility.
- `js/cmd.js:2458-2549` implements the JS quest pager path.
- `js/cmd.js:2601-2682` queues quest arrival and quest portal messages.
- `js/cmd.js:2684-2725` handles part of leader conversation.
- `js/cmd.js:23847-23970` contains quest pager and leader/rejection command modes.
- `js/allmain.js:10459-10510` initializes quest status and calls `mklev()` during new game setup.

JS has an embedded quest text table and a manual token replacement path in `cmd.js`. It supports some quest arrival, portal, and leader rejection/assignment flows. It does not currently use upstream `dat/quest.lua` as the source of truth.

## Gap Analysis

### Generation lifecycle gaps

| Area | Upstream behavior | Current JS behavior | Gap |
| --- | --- | --- | --- |
| Bones ordering | `mklev()` attempts `getbones()` before fresh generation (`mklev.c:1577-1593`). | `mklev()` dispatches many specials first and relies on builders to call `getbones()`; normal fallback calls it later (`mklev.js:7692-7818`). | Centralize bones-before-generation so every level path gets the same gate. |
| Common finalization | `load_special()` and `level_finalize_topology()` share cleanup, wallification, feature counts, solidify, premap, mineralize, and topology (`sp_lev.c:6454-6501`, `mklev.c:1543-1573`). | Builders and `makelevel()` finalize through port-specific calls; coverage varies by path. | Add a common JS special-level finalization wrapper and use it consistently. |
| RNG reseeding | C reseeds before and after generation (`mklev.c:1577-1593`). | JS has PRNG alignment shims and builder-specific consumption, but no equivalent centralized reseed lifecycle. | Decide which C RNG lifecycle details are required for parity and put them in one place. |
| Quest filler selection | C chooses role `fil[a|b]` around the quest locate level (`mklev.c:1275-1285`). | JS chooses implemented fill builders through `QUEST_LEVEL_BUILDERS` and a fixed quest-depth split (`mklev.js:7798-7803`, `3148-3192`). | Use actual quest locate placement and complete role coverage. |

### `sp_lev` and special-level gaps

The biggest missing piece is a generic `sp_lev` implementation. JS currently encodes special levels as JavaScript functions, while upstream special levels are Lua data executed by `load_special()`.

Observed missing or partial surface:

- `des.level_init`, `des.level_flags`, `des.map`, `des.room`, `des.region`, `des.levregion`, `des.exclusion`, `des.teleport_region`, `des.replace_terrain`, `des.wall_property`, `des.non_diggable`, `des.non_passwall`, `des.mineralize`, and `des.finalize_level` do not exist as a complete reusable JS API.
- `des.object()` and `des.monster()` table semantics are broader than the hard-coded builder calls. Upstream supports many flags and nested inventory/container callbacks (`sp_lev.c:3214-3400`, `3557-3755`).
- `des.corridor()` and `des.random_corridors()` are not available as data instructions, even though the underlying corridor digger exists (`sp_lev.c:2670-2725`, `4283-4573`; `mklev.js:19759-19986`).
- Special-level map finalization is not centralized around the same steps as `load_special()`.

Coverage gaps visible from source:

- Dungeon data contains `knox`, `fakewiz1`, `fakewiz2`, `astral`, `water`, `earth`, and `tut-2`, but current `mklev()` dispatch does not provide complete builders for those names.
- Quest special levels are partial. The current builder map includes Archeologist, Barbarian, Knight goal, Wizard, and Priest entries, but not all roles or all start/locate/goal combinations.
- Random special selection through C `makemaz()`/`SPLEVTYPE` is represented by JS hard-coded dispatch and random maze generation, not by loading arbitrary special/proto files.

### Quest level and quest text gaps

| Area | Upstream behavior | Current JS behavior | Gap |
| --- | --- | --- | --- |
| Quest special files | Role start/locate/goal/fill levels live in Lua files under `dat/` and are selected by file code. | JS has hard-coded builders for selected roles and levels (`mklev.js:3148-3192`, `8283-9899`). | Convert quest levels to data-driven `sp_lev` or complete all role builders with shared finalization. |
| Quest text source | `questpgr.c` loads `dat/quest.lua` and falls back role-to-common (`questpgr.c:468-633`). | `cmd.js` embeds quest text data and replacements (`cmd.js:2458-2549`). | Use `quest.lua` as source of truth or generate JS data directly from it. |
| Text selection | C supports arrays, RNG choice, output modes, synopsis history, role/common fallback, and long text pagination. | JS implements a smaller manual pager path. | Port the pager semantics before expanding quest copy, otherwise text parity will remain fragile. |
| Quest state | C handles leader, nemesis, guardian, completion, expulsion, artifact-on-level checks, and post-completion states (`quest.c:25-505`). | JS implements arrival, portal, and part of leader interaction. | Fill out the missing quest state transitions and artifact-location checks. |

### Rooms, shops, special rooms, and corridors

The room and corridor port is comparatively mature, but not exact.

Important observed differences:

- The upstream themeroom system loads `themerms.lua` per branch and uses pre/generate/post hooks (`mklev.c:366-436`). JS has a local theming path and RNG alignment shims, not the Lua hook system (`mklev.js:18575-18602`).
- C `join()` uses `ROOM` terrain instead of `CORR` on arboreal levels (`mklev.c:438-552`). JS corridor code uses corridor terrain directly (`mklev.js:19914-19986`).
- C special-room creation checks monster genocide or gone states for some room types and has specific gates such as `antholemon()` (`mklev.c:1344-1376`). JS special-room selection is simpler (`mklev.js:17772-17886`).
- C `mkshop()` checks invalid shop shapes and has Wizard-mode shop-type behavior (`mkroom.c:94-216`). JS shop marking and stocking exist, but the C shape and mode gates are not fully represented.
- C temple, zoo, morgue, beehive, barracks, cockatrice nest, anthole, and swamp filling have many role/monster/object details in `mkroom.c`; JS covers the main categories but remains a hand port that should be compared room type by room type (`mklev.js:20829-21039`).

Corridor code should be treated as reusable infrastructure for the future `sp_lev` layer. The algorithm is close enough that `des.corridor()` and `des.random_corridors()` can probably call the existing JS corridor functions once the data-level room references are modeled.

### Restoration-sensitive gaps

| Area | Upstream behavior | Current JS behavior | Gap |
| --- | --- | --- | --- |
| Save/restore shape | C serializes level structures, room trees, and many level-specific lists. `rest_rooms()` rebuilds room state (`mkroom.c:840-906`). | `js/save.js:20-186` uses JSON cloning with selected fields and prototype repair. | Add explicit persisted structures for rooms, regions, exclusions, special-level state, and shop-sensitive references. |
| Bones eligibility and validation | C gates bones by level type and validates/restores many global and level details before accepting bones. | `js/mklev.js:7626-7675` reads a JSON VFS entry and restores it when present, with a small RNG gate. | Add C-shaped no-bones predicates and restore validation before accepting a bones level. |
| Bones lifecycle | C attempts bones before new generation. | JS has decentralized special-builder calls plus a fallback call. | Same lifecycle fix as above; this is restore-sensitive because builders can accidentally generate before checking bones. |
| Water/Air levels | C has moving bubble and water-level setup/restore paths (`mkmaze.c:1536-1855`). | JS has Plane-related generation functions for some planes, but save restore is minimal and Water/Earth/Astral builders are missing from dispatch. | Implement remaining Planes and persist their level-specific moving structures. |
| Coordinate offsets | C clears `xstart/ystart` after special generation to avoid stale relative-coordinate state (`sp_lev.c:4771-4801`, `mklev.c:1543-1573`). | JS lacks a generic `sp_lev` coordinate system. | When adding `sp_lev`, make offsets generation-scoped and clear them in the common finalizer. |
| Restored monsters | C has restore-time monster catch-up behavior. | JS includes `restoredLevelMonsterCatchup()` (`cmd.js:2585-2599`). | Compare catch-up ordering and RNG use after save format becomes more explicit. |

## Prioritized Implementation Slices

### P0: Centralize generation lifecycle

Create one JS path that every generated level uses:

1. Sync dungeon globals and generation state.
2. Attempt bones restore before fresh generation.
3. Clear level structures.
4. Run one generator: ordinary, maze, special/proto, quest special, or quest filler.
5. Run a common finalizer equivalent to C `load_special()` plus `level_finalize_topology()` where applicable.

This should happen before adding many more builders, because it removes per-builder drift and fixes the highest-risk restoration ordering gap.

### P0: Add a minimal `sp_lev` execution layer

Build a data-instruction layer that can express the most common upstream Lua directives:

- `level_init`, `level_flags`, `map`
- `terrain`, `replace_terrain`, `wallify`
- `room`, `door`, `corridor`, `random_corridors`
- `stair`, `ladder`, `levregion`, `region`, `teleport_region`, `exclusion`
- `monster`, `object`, `trap`, `gold`, `altar`, `grave`, `feature`

The first target does not need every option from `sp_lev.c`, but it should use the same finalization path and data model. Pick missing source-visible levels such as `knox`, `fakewiz*`, or one missing quest role as validation cases.

### P1: Port quest text from `quest.lua`

Replace the embedded quest text subset with a loader or generated JS artifact derived from `nethack-c/upstream/dat/quest.lua`.

Required semantics:

- Role-first lookup with common fallback.
- Message arrays selected through the game RNG.
- `text`, `synopsis`, and `output` fields.
- The common token and pronoun replacement rules.
- Pager/history behavior needed by `questpgr.c`.

This slice is mostly independent of map generation and can be tested through quest pager calls.

### P1: Complete quest level coverage through data

After `sp_lev` exists, import all role quest start, locate, goal, and filler levels from upstream data rather than continuing hand-written builder expansion. The current builder table should become a compatibility bridge, not the long-term source of truth.

The filler split should use the actual quest locate level placement, matching `mklev.c:1275-1285`, instead of a fixed quest-depth test.

### P1: Tighten rooms, shops, and special rooms

Close the remaining regular-generation gaps:

- Add the upstream themeroom hook model or a generated equivalent.
- Match arboreal corridor terrain.
- Add missing special-room eligibility checks.
- Add shop shape/mode gates from `mkshop()`.
- Compare each `fill_special_room()` category against `mkroom.c` and `shknam.c`, especially temple, shopkeeper, court, beehive, barracks, cockatrice nest, anthole, and swamp details.

This is lower risk than `sp_lev` architecture but important for ordinary-level parity.

### P2: Restore and bones parity

Make the save/bones format explicit enough to represent C-sensitive generation state:

- Room trees and subrooms.
- Special-level regions, exclusions, and teleport regions.
- Shopkeeper/shop room references.
- Level flags and finalization-derived topology.
- Water/Air moving structures and contents.
- Bones eligibility, validation, and restore sanitization.

This should follow lifecycle centralization, because the bones ordering bug is easier to fix before broadening the restore format.

### P2: Finish remaining Planes and specials

Once the common `sp_lev` layer exists, import or express the remaining named levels from `js/dungeon.js`: Astral, Water, Earth, fake Wizard levels, Fort Ludios, and Tutorial 2. This is mostly coverage work after the interpreter and finalizer exist.

## Suggested Review Order

1. `mklev()` lifecycle and bones ordering.
2. Shared special-level finalization.
3. Minimal `sp_lev` directive interpreter.
4. Quest text loader/generator from `quest.lua`.
5. Quest role level coverage.
6. Shop/special-room exactness.
7. Restore and bones format expansion.

That order addresses the architectural gaps before spending time on one-off builders, and it keeps restoration-sensitive behavior from being spread across unrelated special-level functions.
