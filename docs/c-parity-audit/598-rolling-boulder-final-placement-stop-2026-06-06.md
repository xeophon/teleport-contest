# Rolling Boulder Final Placement Stops

Date: 2026-06-06

## Scope

Cover the C `launch_obj()` final-placement shape for rolling boulders after wall/tree/out-of-bounds stops and ordinary final rest.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Source Anchors

- `nethack-c/upstream/src/trap.c:3384` through `:3386` stops the launch loop before advancing out of bounds, leaving the object at the last valid square.
- `nethack-c/upstream/src/trap.c:3523` through `:3530` handles boulder chaining by clearing the moving boulder's `otrapped`, transferring launch-trap metadata to the newly moving boulder, and placing the stopped boulder on the collision square.
- `nethack-c/upstream/src/trap.c:3543` through `:3562` checks the next square for bars, walls, and trees; wall/tree stops leave the boulder on the near side, print `Thump!` unless the hero is deaf, and wake nearby monsters in C.
- `nethack-c/upstream/src/trap.c:3566` through `:3571` clears the rolling object's `otrapped`, places it at the final coordinates, recalculates vision, and redraws the square.
- `nethack-c/upstream/src/mkobj.c:2305` through `:2365` defines `place_object()` final insertion side effects. In particular, `:2331` through `:2348` keep boulders above consecutive boulders and non-boulders below the boulder pile.

## JS Coverage

- `js/allmain.js` now uses one helper for ordinary rolling-boulder rest placement, clearing `otrapped`, `hidden`, and transient projectile state before re-inserting the boulder.
- Final placement removes the moving boulder from any previous floor-list position before pushing it back, preserving the display model where later floor entries render above earlier objects.
- Boulder chaining now clears the stopped boulder's launch metadata and transfers the launch-trap marker to the newly moving boulder.
- Rolling boulders now stop before stepping outside the map.
- Rolling boulders now stop before ordinary wall/tree terrain and queue `Thump!` for non-deaf heroes.
- Rock-thrower snatch cleanup now clears launch/display projectile metadata before moving the boulder into monster inventory.

## Tests

- `rolling boulder thumps before wall and rests on top of pile`
- `deaf rolling boulder stops before tree and clears launch metadata`
- `rolling boulder out-of-bounds guard stops at last valid square`

## Remaining Edges

- C `place_object()` has shop/timer and object-link side effects beyond this slice, including `no_charge` handling outside shops.
- C wall/tree stops also call `wake_nearto()`. The JS monster-disturbance radius is broader trap/scheduler work and is not modeled by this focused placement slice.
