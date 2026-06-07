# 716 - Bullwhip Liquid Wall Splashes

## C Source

- `nethack-c/upstream/src/apply.c:2975-2988` resolves the chosen adjacent square before `use_whip()` proficiency checks and returns `You miss.` without time for off-map horizontal targets.
- `nethack-c/upstream/src/apply.c:3014-3019` handles horizontal water wall and lava wall targets before the self/down, fumbling/glib, pit, monster, or empty-target branches. It prints `You cause a small splash.`, consumes time, and for lava wall calls `fire_damage(uwep, FALSE, rx, ry)`.
- `nethack-c/upstream/src/trap.c:4453-4541` shows `fire_damage()` first using the non-forced luck gate for ordinary objects, then applying class-specific destruction or burn erosion if the object is affected.

## Port Notes

- Horizontal bullwhip use now checks the resolved target terrain for `WATER` or `LAVAWALL` before monster/no-target handling, matching the C branch order.
- Water wall splash consumes time, emits `You cause a small splash.`, and does not wake or attack a monster in that coordinate.
- Lava wall splash consumes the same message/time branch and performs the `rn2(20)` luck-protection check before reusing the existing direct-object fire erosion helper when the object is affected.
- Off-map targets still return `You miss.` without time before this terrain branch, preserving the earlier audit 704 behavior.

## Tests

- `wielded bullwhip into wall of water splashes before monster handling`
- `wielded bullwhip into wall of lava splashes and checks fire damage before monster handling`
- Existing audit 704 bullwhip apply/fire fallback canaries were rerun with the focused bullwhip pattern.

## Remaining Follow-Ups

- Audit 717 covers the first visible-monster disarm slice: unproficient slip and proficiency-1 default weapon yank to the monster square.
- Audit 718 covers the higher-proficiency visible-monster disarm destinations: hero-square yank, inventory snatch, and inventory-letter overflow drop.
- Audit 719 covers visible-monster welded-weapon feedback, curse knowledge, and no destination roll.
- Audit 720 covers the Fumbling/Glib `rn2(5)` drop branch that runs after this terrain splash gate.
- Lavawall fire damage still inherits the current JS object-fire helper coverage; full C `fire_damage()` parity for all wielded object classes, timers, shop billing, and artifact/object immunities remains broader than this splash branch.
- Other `use_whip()` follow-ups remain proficient `force_attack()`, mimic reveal, pit escape, exact self/down/steed/floor behavior, underwater/swallowed edge cases, and exact wakeup visibility.
