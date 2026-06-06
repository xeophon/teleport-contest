# Force-Fight Fire Brand Web

## Scope

Port the guaranteed Fire Brand branch for force-fighting an adjacent known spider web. This covers `F` plus a direction into a seen destination `WEB` while wielding Fire Brand: the C helper consumes one `rn2(20)` before the guaranteed artifact success, prints the burn message, deletes the destination web, redraws that square, leaves the hero in place, and consumes the turn.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/hack.c:2021` through `:2094` implements `domove_fight_web()`.
- `nethack-c/upstream/src/hack.c:2025` gates the path on force-fight, destination `WEB`, and `trap->tseen`.
- `nethack-c/upstream/src/hack.c:2032` consumes the roll before artifact success.
- `nethack-c/upstream/src/hack.c:2034` through `:2039` accepts Sting or a wielded fire-attack artifact; Fire Brand prints `Fire Brand burns through the web!`.
- `nethack-c/upstream/include/artilist.h:153` defines Fire Brand's artifact attack as `FIRE(5, 0)`.
- `nethack-c/upstream/src/hack.c:2089` through `:2091` deletes the destination trap, redraws it, and returns before normal movement.

## JS Change

- `js/cmd.js` generalizes the destination-web force-fight handler from Sting-only to guaranteed artifact web force-fight.
- The handler recognizes Fire Brand by wielded artifact identity, consumes `rn2(20)`, deletes the trap, redraws the trap square, prints `Fire Brand burns through the web!`, leaves `u.umoved` and hero position unchanged, and consumes the turn.
- Already-web-trapped movement still uses the separate Sting-only C path; Fire Brand does not free an already trapped hero there.

## Tests

- `force-fighting a seen destination web with Fire Brand burns and deletes it`

The test uses normal `rhack('F')` plus direction input and asserts the C-shaped RNG call, burn message, trap deletion, no hero movement, no trap state, and turn consumption.

## Remaining Work

- Non-artifact non-blade force-fight web failure is covered by `557-force-fight-nonblade-web-2026-06-06.md`.
- Non-Sting/Fire Brand blade, offhand-blade, and weaponless force-fight web attempts still need the C skill, strength, enchantment, use-skill, and messaging branches.
- Failed untrap/NOWEBMSG web-spread behavior remains separate `#untrap` parity.
