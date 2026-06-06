# Force-Fight Non-Blade Web

## Scope

Port the immediate non-artifact, non-blade failure branch for force-fighting an adjacent known spider web. This covers `F` plus a direction into a seen destination `WEB` while wielding a primary weapon that cannot cut webs and no active offhand blade: the branch consumes one `rn2(20)`, leaves the web in place, leaves the hero in place, consumes the turn, and prints the C `You can't cut a web with ...!` wording.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/hack.c:2021` through `:2094` implements `domove_fight_web()`.
- `nethack-c/upstream/src/hack.c:2025` gates the path on force-fight, destination `WEB`, and `trap->tseen`.
- `nethack-c/upstream/src/hack.c:2032` consumes the weapon roll for this branch.
- `nethack-c/upstream/src/hack.c:2040` through `:2043` rejects non-blade primaries unless two-weapon combat has a blade in the secondary hand.
- `nethack-c/upstream/src/hack.c:2044` through `:2070` builds the weapon-description wording and suppresses the secondary description when both weapons share the same generalized type.
- `nethack-c/upstream/src/weapon.c:90` through `:141` implements `weapon_descr()`.
- `nethack-c/upstream/include/obj.h:213` through `:216` defines C `is_blade()` as weapon skill `P_DAGGER` through `P_SABER`, excluding axes and slashing polearms.

## JS Change

- `js/cmd.js` expands the destination-web force-fight handler from artifact-only to also handle C's immediate non-blade failure branch.
- Web force-fight now uses web-specific blade classification so axes remain valid for force-lock logic but are not treated as web-cutting blades.
- The new weapon-description formatter covers the exercised C generalized names: axe and battle-axe as `axe`, glaive as `polearm`, and two-weapon duplicate descriptions as a plural primary.
- The branch consumes `rn2(20)`, keeps the destination web, leaves `u.umoved` and hero position unchanged, and consumes the turn.

## Tests

- `force-fighting a seen destination web with an axe cannot cut it`
- `force-fighting a seen destination web with a battle-axe describes an axe`
- `force-fighting a seen destination web with a polearm cannot cut it`
- `force-fighting a seen destination web with different non-blade weapons names both`
- `force-fighting a seen destination web with matching non-blade descriptions pluralizes primary`

The tests use normal `rhack('F')` plus direction input and assert the C-shaped RNG call, exact wording, web persistence, no hero movement, no trap state, and turn consumption.

## Remaining Work

- Non-artifact blade and primary-nonblade/offhand-blade force-fight web attempts still need the C strength, enchantment, skill, use-skill, success, and ineffectual-hack branches.
- Weaponless force-fight web attempts still need the adjusted roll range, strength formula, punch/thrash wording, and success/failure outcomes.
- Failed untrap/NOWEBMSG web-spread behavior remains separate `#untrap` parity.
