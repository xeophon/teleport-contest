# Force-Fight Sting Web

## Scope

Port the guaranteed Sting branch for force-fighting an adjacent known spider web. This covers `F` plus a direction into a seen destination `WEB`: one C-shaped `rn2(20)` roll is consumed, the hero does not move, the web trap is deleted, the destination square is redrawn, and the turn is consumed.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/hack.c:2021` through `:2094` implements `domove_fight_web()`.
- `nethack-c/upstream/src/hack.c:2025` gates the path on force-fight, destination `WEB`, and `trap->tseen`.
- `nethack-c/upstream/src/hack.c:2032` consumes the roll before the guaranteed artifact branch.
- `nethack-c/upstream/src/hack.c:2034` through `:2039` prints `Sting cuts through the web!`.
- `nethack-c/upstream/src/hack.c:2089` through `:2091` deletes the destination trap, redraws it, and returns before normal movement.

## JS Change

- `js/cmd.js` now checks non-monster `F` direction targets for a destination web before falling back to `You attack thin air.`.
- The new Sting handler requires `trap.tseen`, consumes `rn2(20)`, deletes the trap, redraws the trap square via `deleteTrap()`, leaves the hero position and `u.umoved` unchanged, and consumes the turn.
- `deleteTrap()` now redraws the removed trap's own coordinates when available instead of always redrawing the hero square.

## Tests

- `force-fighting a seen destination web with Sting cuts and deletes it`
- `force-fighting an unseen destination web with Sting does not cut it`
- `ordinary movement into a seen web with Sting still uses web movement`

The tests exercise normal `rhack('F')` plus direction input, assert the `rn2(20)` consumption for the Sting branch, confirm the seen-web gate, and guard against turning ordinary movement into automatic Sting cutting.

## Remaining Work

- Force-fighting a destination web with fire artifacts should use the same C helper but print `<artifact> burns through the web!`.
- Non-Sting blade, non-blade, and weaponless force-fight web attempts still need the C skill, strength, enchantment, and messaging branches.
- Failed untrap/NOWEBMSG web-spread behavior remains separate `#untrap` parity.
