# Hero Projectile Vampshifter Conduct And Poison Ordering

## C anchors

- `nethack-c/upstream/src/uhitm.c:1897` through `:1903`: deadly poisoned projectile hits print the poison-death message and call `xkilled(mon, XKILL_NOMSG)`.
- `nethack-c/upstream/src/uhitm.c:1919` through `:1921`: the "no longer poisoned" message is emitted after `xkilled()`/`killed()` returns.
- `nethack-c/upstream/src/mon.c:3498` through `:3501`: `xkilled()` records first-kill conduct before `mondead()` can revive a shifted vampire.
- `nethack-c/upstream/src/mon.c:3543` through `:3560`: after a successful vampire rise, `xkilled()` returns before ordinary corpse, inventory, vanquish, XP, and alignment cleanup.

## JS parity

- Hero-attributed projectile, potion, system-shock, melee, and known rolling-boulder trap kills now share `recordHeroKillConduct()` for the first-kill chronicle side effect.
- `killMonsterFromHeroProjectileHit()` records that conduct before the shifted-vampire revival gate, matching C's fake-death ordering without adding vanquish, XP, corpse, or inventory drop cleanup.
- Projectile poison handling now separates post-hit poison text from post-kill unpoison text. Deadly poisoned shifted-vampire hits now order messages as hit text, poison-death text, rise text, then "no longer poisoned."
- Fired launcher ammo, by-hand ammo, and ordinary thrown/kicked weapon projectile paths all consume the same deferred unpoison message slot after their shared kill helper.

## Replay-free coverage

- `hero-thrown dagger revives shifted vampire lethal target before cleanup`
- `hero-thrown deadly poisoned crossbow bolt revives shifted vampire before unpoison message`
- `f command arrow revives shifted vampire lethal target before cleanup`
- `command kicked ruby revives shifted vampire lethal target before cleanup`
- `known hero rolling boulder trap lethal target awards hero experience`

## Remaining candidates

- Door smash/explosion side effects from a vampire rising in a doorway remain outside this slice.
- Broader `xkilled()` parity still has other conduct and special-death edges outside first-kill conduct, especially tame/peaceful side effects and lifesaving.
