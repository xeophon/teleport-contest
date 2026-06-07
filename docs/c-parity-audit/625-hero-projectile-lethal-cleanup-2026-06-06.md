# Hero Projectile Lethal Cleanup

## C anchors

- `nethack-c/upstream/src/dothrow.c:2011` through `:2068`: direct thrown/kicked object hits route weapon and gem impacts through `thitmonst()`.
- `nethack-c/upstream/src/dothrow.c:2117` through `:2189`: when a weapon/gem hit succeeds, `hmon(mon, obj, hmode, dieroll)` runs before Dexterity exercise, missile mulch, `passive_obj()`, and the caller's object landing.
- `nethack-c/upstream/src/uhitm.c:1860` through `:1910`: `hmon_hitmon()` subtracts damage, emits the object hit message, then calls `killed(mon)` for ordinary lethal hero hits.
- `nethack-c/upstream/src/mon.c:3470` through `:3520`: `killed()`/`xkilled()` emits `You kill ...!`, records hero kill conduct, and hands off to `mondead()`.
- `nethack-c/upstream/src/mon.c:3522` through `:3675`: ordinary death cleanup drops inventory/corpse-like remains, removes the monster, and awards experience before returning to the projectile path.
- `nethack-c/upstream/src/uhitm.c:6127` through `:6195`: `passive_obj()` uses the target monster data after a successful object hit and has no dead-monster guard.

## JS parity

- Direct hero-thrown gems and dagger/knife hits now run projectile-specific lethal cleanup instead of only setting `mon.dead`.
- The cleanup preserves C message order: object hit text first, then `You kill/destroy ...!`, then projectile mulch/passive/landing follow-up.
- Ordinary lethal cleanup now records vanquish/XP, drops monster inventory, creates corpse-like remains when the local C-shaped corpse gate succeeds, removes the target from `game.level.monsters`, and redraws the square.
- Shifted-vampire revival remains first in the lethal cleanup path and still skips ordinary corpse/inventory/vanquish removal.
- Kicked gems use the same ordinary cleanup; kicked dagger/knife hits share the projectile weapon helper.
- Passive-object follow-up still receives the original target object so C's post-lethal `passive_obj()` behavior can run from monster data before the projectile lands.

## Replay-free coverage

- `hero-thrown ruby lethal target removes monster before projectile lands`
- `hero-thrown dagger lethal target removes monster before projectile lands`
- `hero-thrown dagger lethal target still applies passive object erosion before landing`
- `command kicked ruby lethal target removes monster before landing`
- Existing audit 624 canary `hero-thrown dagger revives shifted vampire lethal target before cleanup` remains green.

## Remaining candidates

- Broader hero projectile lethal cleanup for ammo/launcher paths should stay separate from this gem/dagger/knife slice.
- Peaceful/tame projectile kill side effects still need a central `xkilled()` lifecycle pass rather than one-off additions; audit 742 covers first-kill conduct for hero-attributed projectile fake deaths.
- Door smash/explosion side effects from shifted vampires rising in a doorway remain outside this slice.
