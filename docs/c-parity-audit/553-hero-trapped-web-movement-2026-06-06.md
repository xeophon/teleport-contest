# Hero Trapped Web Movement

## Scope

Port the `trapmove()` path for hero movement while already trapped in a web. This covers unmounted and mounted countdown attempts, duplicate stuck-message suppression, successful escape still blocking the attempted move, numeric `TT_WEB` compatibility, and Sting cutting the hero free without deleting the web.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/hack.c:1550` through `:1601` implements `trapmove()` for trapped hero movement.
- `nethack-c/upstream/src/hack.c:1587` through `:1590` handles `u_wield_art(ART_STING)`: set `u.utrap = 0`, print `Sting cuts through the web!`, do not delete the web, and still return `FALSE`.
- `nethack-c/upstream/src/hack.c:1591` through `:1600` pre-decrements `u.utrap`, prints `You are stuck to the web.` or `<Steed> is stuck to the web.` while still trapped, and prints `You disentangle yourself.` or `<Steed> breaks out of the web.` when the counter reaches zero.
- `nethack-c/upstream/src/hack.c:2830` through `:2839` calls `trapmove()`, resets `utrap` after clearing, and returns immediately when `trapmove()` blocks the move.

## JS Change

- `js/cmd.js` now normalizes web trap state with `TT_WEB` and `'web'` support before movement destination handling.
- Already-web-trapped movement now decrements the timer, consumes the turn, leaves the hero and steed in place, and clears `utrap/utraptype` only when escape succeeds.
- Mounted attempts reuse the existing steed display helper, producing `The saddled pony is stuck to the web.` and `The saddled pony breaks out of the web.` in the covered fixture.
- Sting detection uses the wielded artifact identity and clears the web trap state with `Sting cuts through the web!` without removing the trap from the level.
- Trap-repeat message preservation now includes unmounted and mounted web stuck messages, matching C's `Norep()` behavior for repeated stuck attempts.

## Tests

- `already web-trapped hero remains stuck without moving`
- `already web-trapped hero suppresses repeated stuck message`
- `already web-trapped hero escape consumes movement attempt`
- `already web-trapped mounted steed remains stuck without moving`
- `already web-trapped mounted steed escape consumes movement attempt`
- `Sting cuts already web-trapped hero free without moving or deleting web`

The tests run through normal `rhack()` movement and assert no RNG use, no position change, turn consumption, trap countdown/clearing, mounted wording, and web persistence for the Sting case.

## Remaining Work

- Dismounting while holding a web, bear trap, or pit trap and transferring trapped state to the former steed is covered by `554-dismount-holding-trap-transfer-2026-06-06.md`.
- Force-fighting a destination web with Sting deletes the web through a different C path and is covered by `555-force-fight-sting-web-2026-06-06.md`.
- Failed untrap/NOWEBMSG web-spread behavior remains separate `#untrap` parity.
