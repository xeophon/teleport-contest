# Hero Projectile Peaceful Tame Luck

## C anchors

- `nethack-c/upstream/src/mon.c:3503` through `:3511`: `xkilled()` prints the kill/destroy message, using "poor" for tame targets.
- `nethack-c/upstream/src/mon.c:3524` through `:3526`: a tame non-minion killed by the hero records `EDOG(mtmp)->killed_by_u = 1`.
- `nethack-c/upstream/src/mon.c:3543` through `:3560`: lifesaved or shifted-vampire fake deaths return before corpse, luck, XP, and alignment cleanup.
- `nethack-c/upstream/src/mon.c:3582` through `:3629`: corpse/treasure cleanup runs before the bad-behavior luck penalties.
- `nethack-c/upstream/src/mon.c:3664` through `:3668`: peaceful/tame kills apply the `rn2(2)` luck penalty, and same-aligned unicorn kills apply the `-5` guilt penalty.
- `nethack-c/upstream/src/mon.c:3703` through `:3711`: tame hero kills apply the larger alignment penalty and thunder/applause feedback.

## JS parity

- `killMonsterFromHeroProjectileHit()` now keeps the vampshifter early return, then marks tame non-minions as killed by the hero only for confirmed projectile deaths.
- Tame projectile kills now use C-style "poor" wording in the hero kill message.
- Confirmed hero projectile kills now apply peaceful/tame luck after corpse/drop work and before projectile landing randomness.
- Same-aligned unicorn projectile kills now apply the C `-5` luck penalty and append `You feel guilty...`.
- `recordHeroKillConduct()` now increments `game.u.uconduct.killer` on every hero kill while still recording the chronicle only for the first kill.

## Replay-free coverage

- `hero-thrown dagger lethal target removes monster before projectile lands`
- `hero-thrown dagger lethal tame target uses poor wording and xkilled luck`
- `hero-thrown dagger lethal target still applies passive object erosion before landing`
- `hero-thrown dagger lethal same-aligned unicorn applies C guilt luck`
- Existing shifted-vampire projectile tests continue to assert fake deaths skip ordinary cleanup.

## Remaining candidates

- Projectile kills still do not share all direct-melee kill-tail behavior, including live XP level-up, random treasure, gas spore death explosions, and mapped-invisible cleanup.
- Pre-death pet abuse from projectile hits is still separate from this confirmed-death cleanup slice.
