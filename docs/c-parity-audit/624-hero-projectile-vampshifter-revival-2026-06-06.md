# Hero Projectile Shifted Vampire Revival

## C anchors

- `nethack-c/upstream/src/dothrow.c:2011` through `:2068`: direct object hits call `hmon(mon, obj, HMON_THROWN, dieroll)` for thrown weapons and gems, then continue with projectile exercise, mulch, passive-object, and landing follow-up while the object still exists.
- `nethack-c/upstream/src/uhitm.c:1878` through `:1910`: `hmon_hitmon()` emits the hit message first, then routes lethal hero hits through `killed(mon)`.
- `nethack-c/upstream/src/mon.c:3470` through `:3520`: `killed()`/`xkilled()` emits the ordinary hero kill wording before `mondead()` handles the monster lifecycle.
- `nethack-c/upstream/src/mon.c:2886` through `:2946`: `vamprises()` revives shifted vampires as their base vampire form, resets movement blockers and HP, and emits the spotted "seemingly dead" transformation message.
- `nethack-c/upstream/src/mon.c:3091` through `:3098`: `mondead()` returns immediately after successful shifted-vampire revival, before corpse creation, inventory drop, or final monster removal.

## JS parity

- Direct hero projectile gem/weapon hits now try shifted-vampire revival before setting `mon.dead`.
- The projectile helper preserves the C message order: object hit text, `You kill ...!`, then the spotted transformation message.
- Revived targets keep their inventory, remain on the level, clear shift metadata, restore base vampire data and HP, and still allow the existing projectile mulch/passive/landing follow-up to run.
- The same guard is used for kicked gems and the shared thrown/kicked dagger/knife path so direct hero projectile death channels do not diverge.
- The existing rolling-boulder known-trap attribution path also has a direct canary for XP award beside the unknown-trap no-XP fixture.

## Replay-free coverage

- `hero-thrown dagger revives shifted vampire lethal target before cleanup`
- `known hero rolling boulder trap lethal target awards hero experience`

## Remaining candidates

- Conduct accounting for shifted-vampire fake deaths remains a broader monster-death lifecycle cleanup; this slice does not introduce a generic `xkilled()` abstraction.
- Door smash/explosion side effects from a vampire rising in a doorway remain outside this slice.
- Remaining shifted-vampire death channels should continue one source-backed path at a time until the duplicated revival helpers can be collapsed safely.
