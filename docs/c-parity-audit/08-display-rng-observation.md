# 08 Display, RNG, and Observation Audit

## Scope

This audit compares upstream NetHack C display/window behavior with the current JS implementation, focusing on:

- display and window lifecycle
- glyph and object observation
- hallucination rendering and naming
- status/message ordering
- display RNG stream parity
- discovery accounting

The recommendations below are implementation slices only. They avoid private-suite guessing, fixture hardcoding, and changes outside normal C-compatible behavior.

## High-level summary

The JS port has most of the visible ingredients: per-cell display fields, `newsym()`, a redraw path, hallucinated glyph selection, status rendering, message state, display RNG, and discovery overlays. The main parity risk is that these pieces are not organized like C. Upstream C keeps a stronger separation between map memory, glyph-to-window buffering, physical window flush, status dirty flags, and top-line message flow. JS often writes final screen characters directly into location fields and resolves status/message/overlay order in `drawGrid()`.

That difference matters most when hallucination is active. In C, display-only randomness is consumed by well-defined display passes and menu glyph rendering. In JS, display RNG is spread across redraw helpers, message/name helpers, inventory overlays, and explicit skip shims. That makes the stream fragile and makes failures hard to diagnose.

Discovery accounting has a related issue: C has a single `observe_object()`/`discover_object()` path that updates object flags, class metadata, and discovery ordering. JS currently records discoveries through a display-side whitelist and several overlay-time heuristics, so "seen", "encountered", "known", and "listed" are not represented with the same invariants as C.

## Reference map

### Upstream C refs

- Display model and precedence: `nethack-c/upstream/src/display.c:7`, `nethack-c/upstream/src/display.c:21`, `nethack-c/upstream/src/display.c:31`.
- Display entry points: `nethack-c/upstream/src/display.c:51`.
- Glyph hallucination helpers: `nethack-c/upstream/include/display.h:178`, `nethack-c/upstream/include/display.h:189`, `nethack-c/upstream/include/display.h:199`.
- Object glyph conversion: `nethack-c/upstream/include/display.h:931`, `nethack-c/upstream/include/display.h:958`.
- Glyph flags and docrt flags: `nethack-c/upstream/include/display.h:990`, `nethack-c/upstream/include/display.h:1015`.
- Map/object rendering: `nethack-c/upstream/src/display.c:332`, `nethack-c/upstream/src/display.c:408`, `nethack-c/upstream/src/display.c:448`.
- Monster/warning rendering: `nethack-c/upstream/src/display.c:481`, `nethack-c/upstream/src/display.c:513`, `nethack-c/upstream/src/display.c:633`.
- Main `newsym()` ordering: `nethack-c/upstream/src/display.c:916`.
- Redraw and flush: `nethack-c/upstream/src/display.c:1693`, `nethack-c/upstream/src/display.c:1708`, `nethack-c/upstream/src/display.c:1876`, `nethack-c/upstream/src/display.c:2207`.
- Temporary glyphs: `nethack-c/upstream/src/display.c:1173`.
- Full-map update passes: `nethack-c/upstream/src/display.c:1486`, `nethack-c/upstream/src/display.c:1557`, `nethack-c/upstream/src/display.c:1573`, `nethack-c/upstream/src/display.c:1610`.
- Status rendering: `nethack-c/upstream/src/botl.c:47`, `nethack-c/upstream/src/botl.c:100`, `nethack-c/upstream/src/botl.c:252`.
- Message/topline rendering: `nethack-c/upstream/src/pline.c:153`, `nethack-c/upstream/win/tty/topl.c:193`, `nethack-c/upstream/win/tty/topl.c:250`, `nethack-c/upstream/win/tty/wintty.c:1854`, `nethack-c/upstream/win/tty/wintty.c:2225`.
- Menus/input suppressing bot updates: `nethack-c/upstream/src/windows.c:1855`, `nethack-c/upstream/src/windows.c:1868`.
- RNG contexts and display RNG: `nethack-c/upstream/src/rnd.c:18`, `nethack-c/upstream/src/rnd.c:60`, `nethack-c/upstream/src/rnd.c:93`, `nethack-c/upstream/src/rnd.c:153`, `nethack-c/upstream/src/rnd.c:281`.
- Level-generation RNG reseed: `nethack-c/upstream/src/mklev.c:1577`.
- Display RNG logging patch: `nethack-c/patches/005-rng-display-logging.patch:15`.
- Hallucinated monster names: `nethack-c/upstream/src/do_name.c:827`, `nethack-c/upstream/src/do_name.c:950`, `nethack-c/upstream/src/do_name.c:1387`.
- Hallucination transition redraw ordering: `nethack-c/upstream/src/potion.c:369`, `nethack-c/upstream/src/potion.c:423`.
- Discovery flags/accounting: `nethack-c/upstream/include/obj.h:106`, `nethack-c/upstream/include/objclass.h:47`, `nethack-c/upstream/src/o_init.c:440`, `nethack-c/upstream/src/o_init.c:454`, `nethack-c/upstream/src/o_init.c:525`, `nethack-c/upstream/src/o_init.c:762`.
- Inventory/menu glyph consumption: `nethack-c/upstream/src/invent.c:2582`, `nethack-c/upstream/src/invent.c:3320`, `nethack-c/upstream/src/invent.c:3497`.

### Current JS refs

- Display-side hallucination gate: `js/display.js:94`.
- Display object discovery helper: `js/display.js:523`.
- Monster/object glyph selection: `js/display.js:649`, `js/display.js:667`.
- Nearby object observation: `js/display.js:719`.
- Direct glyph cell writes: `js/display.js:742`.
- JS `newsym()` ordering: `js/display.js:751`.
- Redraw helpers: `js/display.js:953`, `js/display.js:963`, `js/display.js:1002`, `js/display.js:1017`.
- Main renderer, message, and status layering: `js/display.js:1082`, `js/display.js:1356`, `js/display.js:1461`.
- Flush and bot stubs: `js/display.js:1479`, `js/display.js:1492`.
- `pline()` state update: `js/display.js:1494`.
- Status formatting: `js/game_display.js:132`.
- RNG contexts/logging/display RNG: `js/rng.js:21`, `js/rng.js:29`, `js/rng.js:41`, `js/rng.js:118`.
- JS message combining helper: `js/allmain.js:2500`.
- JS hallucinated monster name helper: `js/allmain.js:2618`.
- Manual display RNG skips near hallucination transition: `js/allmain.js:11471`.
- Discovery overlay renderer: `js/cmd.js:21324`.
- Inventory overlay display RNG consumption: `js/cmd.js:21280`.
- Repeated hallucinated name/display RNG sites: `js/cmd.js:9590`, `js/cmd.js:22363`, `js/cmd.js:22528`, `js/cmd.js:25764`.

## 1. Display and window lifecycle

### C behavior

C distinguishes at least three layers:

- Map memory and display decisions are stored through level state, especially `levl[x][y].glyph` and `lastseentyp`, with helpers such as `map_object()`, `map_trap()`, `map_background()`, and `unmap_object()` (`display.c:332`, `display.c:408`, `display.c:448`).
- `show_glyph()` maps a glyph to `glyph_info`, compares against the buffered third screen, marks dirty cells, and expands a flush bounding box (`display.c:1876`).
- `flush_screen()` updates dirty status first when `disp.botl` or `disp.botlx` is set, prints changed glyphs, moves the cursor when requested, then displays the map window (`display.c:2207`).

`docrt_flags()` is not just "call `newsym()` everywhere". It performs a memory-first redraw, recalculates vision before and after drawing, then overlays monsters with `see_monsters()`. Non-map-only redraws mark the status for refresh and rely on callers/flush to update it (`display.c:1708`).

Menus and line input temporarily suppress bottom-line updates via `disp.botl_suppress` (`windows.c:1855`, `windows.c:1868`).

### JS behavior

JS generally writes final display characters and colors directly to each location via `show_glyph_cell()` (`display.js:742`). `newsym()` then chooses what to display for a cell and mutates `loc.disp_*` fields (`display.js:751`). `docrt()` either does targeted redraw helpers or loops over all cells and calls `newsym()` (`display.js:1002`). `flush_screen()` calls `drawGrid()` directly (`display.js:1479`), and `bot()` is currently empty (`display.js:1492`).

`drawGrid()` owns the final rendering stack: map, overlays, pending message, status, and cursor (`display.js:1082`, `display.js:1356`, `display.js:1461`). `GameDisplay.renderStatus()` formats the two status lines each draw (`game_display.js:132`).

### Concrete gaps

- JS lacks a C-like separation between remembered glyph, buffered glyph info, dirty third-screen state, and physical window flush. This makes redraw ordering dependent on `drawGrid()` conditionals rather than C display primitives.
- `docrt()` does not model `docrt_flags()` behavior such as memory-first redraw, monster overlay pass, `DOCrt_*` flags, `vision_recalc(2)`/`vision_recalc(0)`, and bottom-line dirty semantics.
- `bot()` being a no-op means status refresh has no independent dirty lifecycle. C status is flushed before map drawing when needed; JS status is rendered late inside `drawGrid()`.
- Menu/input status suppression exists in C's window layer. JS has many overlay states, but no central equivalent to `disp.botl_suppress`.
- Temporary effects are not centralized like C `tmp_at()`, which flushes before temporary display, shows temporary glyphs, and restores cells via `newsym()` (`display.c:1173`). JS uses renderer-level transient fields, so cleanup ordering can drift from C.

## 2. Glyph, object, and map observation

### C behavior

`newsym()` follows C's display priority. In sight, it handles special regions/self, then visible or sensed monsters, traps, objects, engravings, and background. Out of sight, it handles self-touch while blind, sensed/detected monsters, warnings, invisible memory, and remembered terrain/object state (`display.c:916`).

Object rendering is tied to observation. `map_object()` computes `obj_to_glyph(obj, newsym_rn2)`, and for generic objects that are visible, non-hallucinated, and near enough, it calls `observe_object()` and recomputes the glyph (`display.c:332`). `see_nearby_objects()` repeats that nearby-observation check and forces redraw when a remembered generic object becomes specific (`display.c:1573`).

Mimics are handled by constructing the apparent display object or furniture and then mapping that appearance through the normal display path (`display.c:513`). Invisible memory is cleared or remapped when a monster/warning/object takes over the cell (`display.c:481`).

### JS behavior

`newsym()` has a comparable high-level cell order and directly sets display fields (`display.js:751`). Visible objects are marked `dknown` and routed through `recordObservedObjectDiscovery()` when the distance check passes (`display.js:719`, `display.js:832`). Monster and object glyphs are computed by `monsterGlyph()` and `objectGlyph()` (`display.js:649`, `display.js:667`).

Mimic display is handled directly inside `monsterGlyph()`. For `appearObj`, it returns a generic `'('`/brown object-like glyph rather than mapping a fake object through the object display path (`display.js:649`).

### Concrete gaps

- Object observation is not a single object-class accounting path. JS sets `dknown` and separately records discoveries through a whitelist in `recordObservedObjectDiscovery()` (`display.js:523`), while C routes observed objects through `observe_object()` and `discover_object()` (`o_init.c:440`, `o_init.c:454`).
- C uses the normal object glyph pipeline for mimics pretending to be objects. JS short-circuits mimic objects to a generic glyph, which can diverge for object class symbol, color, memory, and display RNG behavior.
- C's `unmap_object()` restores trap, engraving, background, or stone memory according to remembered level state (`display.c:408`). JS has remembered glyph fields, but restoration is distributed across `newsym()`, redraw helpers, and explicit clears.
- C glyph flags encode display semantics such as pet, ridden, detected, corpse, statue, object pile, invisibility, and hero state (`display.h:990`). JS carries selected rendered attributes in per-cell fields, so later window behavior cannot reason from a C-like `glyph_info` record.

## 3. Hallucination display and names

### C behavior

C's display hallucination is broad and systematic:

- `what_obj()` and `what_mon()` use display RNG under `Hallucination` (`display.h:189`).
- `obj_to_glyph()` and `statue_to_glyph()` route hallucinated objects/statues through random object or monster glyphs (`display.h:931`, `display.h:958`).
- Warnings use display RNG while hallucinating (`display.c:633`).
- Hallucinated monster names are selected by `rndmonnam()` using `rn2_on_display_rng()` and C's real monster/name constraints (`do_name.c:1387`).
- When hallucination starts or ends, C redraws monsters, objects, and traps before printing the status message (`potion.c:369`, `potion.c:423`).

### JS behavior

JS has display RNG-backed hallucinated glyphs in `monsterGlyph()` and `objectGlyph()` (`display.js:649`, `display.js:667`), and hallucinated warnings in `newsym()`/`refreshHallucinatedMap()` (`display.js:799`, `display.js:1040`). `refreshHallucinatedMap()` manually redraws monsters, warnings, objects, and traps (`display.js:1017`).

The gate for hallucinated display is `hallucinatesDisplay()`, which requires a Hallu status suffix plus one of `_display_hallucinated_redraw` or `_display_hallucinated_normal` (`display.js:94`). Hallucinated monster names are implemented in JS helpers such as `monsterDisplayName()` (`allmain.js:2618`) and repeated command-side sites (`cmd.js:9590`, `cmd.js:22363`, `cmd.js:22528`, `cmd.js:25764`).

There are explicit display RNG skips around a hallucination transition (`allmain.js:11471`) and additional skips elsewhere (`cmd.js:3607`, `cmd.js:25952`).

### Concrete gaps

- C's `Hallucination` condition directly affects display helpers. JS requires extra display flags, so normal `newsym()` can render real glyphs during Hallu unless the caller has entered the expected hallucinated-display mode.
- Hallucination redraw order is manually reproduced in JS. C's order is `see_monsters()`, `see_objects()`, `see_traps()`, then `pline()`; JS should not need ad hoc skips if that order is faithfully modeled.
- JS hallucinatory monster naming uses JS display-name tables and local loops. C uses `rndmonnam()` with C monster-generation/name constraints and consumes display RNG according to that loop. The JS helpers need to be centralized and table-driven from the same effective constraints, not patched at individual call sites.
- Inventory/menu glyphs in C consume display RNG via `obj_to_glyph(otmp, rn2_on_display_rng)` even when the text name is not hallucinated (`invent.c:2582`, `invent.c:3320`, `invent.c:3497`). JS inventory overlay code consumes display RNG for glyphs (`cmd.js:21280`), but this is currently another local implementation rather than shared object glyph/menu rendering behavior.

## 4. Status and message ordering

### C behavior

`vpline()` formats a message, handles suppression/repetition rules, recalculates vision if needed, calls `flush_screen()` before putting the message, then displays the message window when required (`pline.c:153`). `flush_screen()` updates status first when bottom-line dirty flags are set (`display.c:2207`).

TTY top-line behavior combines short messages with two spaces when they fit, prompts `--More--` when they do not, records history, and treats selected messages specially (`topl.c:250`). `display_nhwindow(WIN_MESSAGE, TRUE)` resolves pending `--More--` state and clears the message window (`wintty.c:1854`).

Status line two has a specific condition order: major timed troubles, hunger, encumbrance, Blind, Deaf, Stun, Conf, Hallu, then movement states such as Lev/Fly/Ride (`botl.c:100`).

### JS behavior

`pline()` sets `_pending_message`, clears selected overlay/status flags, and leaves rendering for the next `drawGrid()` (`display.js:1494`). `addToplineMessage()` implements fit-based two-space combining and `--More--` state for many game messages (`allmain.js:2500`), but it is separate from `display.pline()`.

Status rendering happens inside `drawGrid()` after the map, overlays, and top-line message decisions (`display.js:1356`, `display.js:1461`). `GameDisplay.renderStatus()` owns line formatting and condition suffix display (`game_display.js:132`).

### Concrete gaps

- C flushes map/status before presenting a new message; JS records the message and later renders everything together. This can change screenshots and interaction points when a status change and message happen in the same command.
- There are two message APIs with different behavior: `display.pline()` and `allmain.addToplineMessage()`. C has one top-line/window path beneath `pline()`.
- `bot()` does not model dirty status updates, so status can only be correct if `drawGrid()` is called at the right time and with compatible overlay state.
- `--More--`, message history, post-more text, and overlay suppression are distributed through game flags. C centralizes these in the message window implementation.
- The JS status suffix should be checked against C line-two ordering and suppression cases. The current `renderStatus()` should be treated as a compatibility surface, not only a cosmetic formatter.

## 5. Display RNG stream parity

### C behavior

C has separate core and display RNG contexts (`rnd.c:18`). Core RNG calls use `rn2()`/`RND()`, while display-only calls use `rn2_on_display_rng()` and `rnd_on_display_rng()` (`rnd.c:93`, `rnd.c:153`). Level generation reseeds both streams at the start and end of `mklev()` (`mklev.c:1577`). The local C patch can log display RNG calls with a `~drn2` marker when enabled (`patches/005-rng-display-logging.patch:15`).

Display RNG is consumed by many places that are not map redraws: hallucinated glyphs, warning glyphs, monster names, inventory/menu object glyphs, swallowed display glyphs, and selected hallucinated text.

### JS behavior

JS initializes separate ISAAC64 contexts for core and display from the same seed (`rng.js:21`). `rn2_on_display_rng()` uses `game.displayCtx` and can append `~drn2(x)=value` to the shared RNG log when enabled (`rng.js:118`). `save.js` includes `displayCtx`, so the stream can persist across saves.

Searchable display RNG call sites are spread across `display.js`, `allmain.js`, `cmd.js`, and `mklev.js`. There is no JS equivalent visible for C's `mklev()` display reseed; `initRng()` is the main context initializer.

### Concrete gaps

- JS has the right idea, a distinct display RNG, but not the same lifecycle. C reseeds display RNG around level generation; JS should either model that lifecycle or explicitly document an equivalent path if it exists elsewhere.
- JS display RNG logging lacks call count, call-site labels, or phase labels. When parity drifts, `~drn2(x)=value` alone is hard to align with C.
- Explicit skip shims are a sign that the pipeline order is not yet C-shaped. They should be temporary diagnostics, not the compatibility mechanism.
- Display RNG consumers should be centralized by behavior: glyph conversion, name hallucination, warning display, menu glyph rendering, and hallucination transition redraws. Local command-site calls make count/order bugs likely.

## 6. Discovery accounting

### C behavior

C stores object-level and object-class discovery state:

- Object instance flags include `known`, `dknown`, `bknown`, `rknown`, `cknown`, `lknown`, and `tknown`; the `dknown` comment explicitly points callers to `observe_object()` (`obj.h:106`).
- Object classes track `oc_name_known`, `oc_uname`, and `oc_encountered` (`objclass.h:47`).
- `observe_object()` sets `obj->dknown` and calls `discover_object()` unless hallucinating or generic (`o_init.c:440`).
- `discover_object()` updates discovery order, encountered/name-known state, wisdom exercise, gem learning, and inventory update side effects (`o_init.c:454`).
- `dodiscovered()` renders discoveries by class/order, supports sorting, and marks encountered-but-not-fully-known entries with `*` (`o_init.c:762`).

### JS behavior

`recordObservedObjectDiscovery()` is display-side and manually filters object names/classes (`display.js:523`). It skips hallucination, then appends labels to `game._discoveries` for specific cases. `discoveryOverlayLines()` renders from that list plus additional render-time heuristics for keys, spellbooks, wands, amulets, and special items (`cmd.js:21324`).

### Concrete gaps

- JS does not have a C-like object-class discovery registry with separate encountered, name-known, called-name, and display-list state.
- Display observation and discovery rendering are coupled through string labels. C records object type/class state first and renders later.
- Render-time additions in `discoveryOverlayLines()` can make the overlay show facts that did not pass through a single `discover_object()` equivalent.
- Sorting and class-specific known-object behavior should be implemented from structured state, not from already-rendered strings.

## Recommended implementation slices

### Slice 1: Add display RNG diagnostics first

- Extend JS display RNG logging with a monotonically increasing display-call count and an optional phase label such as `newsym.object`, `hallu.monname`, `inventory.glyph`, or `warning`.
- Keep emitted RNG values unchanged.
- Use this only for public trace comparison and local debugging. Do not add private-suite-specific skips or hardcoded expected counts.

### Slice 2: Introduce a C-shaped object discovery registry

- Add an `observeObject(obj, context)` helper that owns `dknown`, hallucination/generic guards, encountered/name-known state, and discovery ordering.
- Make display observation, inventory identification, calls/names, gems, and discovery rendering update/read that registry.
- Keep existing overlay output stable where correct, but make strings the final render product rather than the stored source of truth.

### Slice 3: Centralize glyph conversion

- Route monsters, objects, statues, corpses, warnings, inventory/menu glyphs, and mimic appearances through shared glyph conversion helpers.
- Store a normalized glyph record or glyph id before converting to JS cell characters/colors. Preserve existing `loc.disp_*` as the renderer target while adding the missing C-like intermediate layer.
- Model important glyph flags, especially pet, detected, invisibility, corpse, statue, object pile, ridden, and hero.

### Slice 4: Replace hallucination redraw skips with ordered passes

- Implement JS equivalents of `see_monsters()`, `see_objects()`, and `see_traps()` whose order and display RNG consumption match C.
- On hallucination transitions, call those passes before queuing the message, matching `make_hallucinated()`.
- Move hallucinated monster-name selection to one helper that mirrors C `rndmonnam()` constraints and call pattern.

### Slice 5: Rework redraw/flush/status boundaries

- Add `docrtFlags(flags)` around the current redraw helpers and preserve compatibility with existing callers.
- Separate map-memory redraw from monster overlay and final physical drawing.
- Implement bottom-line dirty flags and make `flush_screen()` update status before presenting new messages.
- Centralize `--More--`, history, message combining, and overlay/menu status suppression behind one window/message layer.

### Slice 6: Align level RNG lifecycle

- Audit level creation and restore paths for display RNG reseeding against C `mklev()`.
- If JS intentionally differs, document the reason and update trace tooling so drift is visible at level boundaries.
- If not intentional, implement a public-rule equivalent of C's display reseed without adding fixture-specific compensations.

## Suggested rollout order

1. Add display RNG labels/counters and compare public traces.
2. Replace discovery string accounting with structured object-class discovery state.
3. Centralize object/monster glyph conversion, including inventory/menu glyph rendering.
4. Convert hallucination transitions to ordered C-style redraw passes and remove skip shims as they become unnecessary.
5. Add `docrtFlags()`, status dirty flags, and a unified message window boundary.
6. Revisit remaining visual differences through the new traces rather than through hardcoded command-specific patches.
