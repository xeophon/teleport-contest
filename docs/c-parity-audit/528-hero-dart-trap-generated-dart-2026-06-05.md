# Hero Dart Trap Generated Dart

## Scope

Port the hero-facing dart trap path onto the same generated dart object semantics used by C. This follows audit 526/527: monster and pet dart traps were using generated dart modifiers, and generated objects now persist erosion, but hero dart traps still used a synthetic `rnd(3)` projectile.

## C Reference

- `nethack-c/upstream/src/trap.c:1016` `t_missile(DART, trap)` creates the dart with `mksobj(DART, TRUE, FALSE)`, sets `quan = 1`, clears factory poison, and stamps trap coordinates.
- `nethack-c/upstream/src/trap.c:1259` hero dart traps can delete a known spent trap with `rn2(15)`, otherwise mark the trap seen/spent, poison the generated dart with `rn2(6)`, compute `dmgval()`, and call `thitu(7, ..., "little dart")`.
- `nethack-c/upstream/src/mthrowu.c:75` `thitu()` uses fixed `u.uac + tlev <= rnd(20)` hit logic; generated dart enchantment does not affect hero hit chance.
- `nethack-c/upstream/src/mthrowu.c:151` successful non-potion projectile hits exercise strength after physical damage.
- `nethack-c/upstream/src/weapon.c:297` and `:327` `dmgval()` adds generated dart enchantment and subtracts erosion with the C minimum-damage floor.
- `nethack-c/upstream/src/trap.c:1279` poison is applied only after a successful hit.
- `nethack-c/upstream/src/attrib.c:317` thrown-weapon poison uses the `rn2(30)` branch after announcing `The dart was poisoned!`.

## JS Change

- `js/cmd.js` now creates hero trap darts with `mksobj(DART, true, false)` and preserves generated enchantment, blessing, and erosion state while clearing factory poison before the trap-specific poison roll.
- Hero dart-trap damage now uses the generated dart's small/large damage die, enchantment, blessed-vs-hated bonus, persisted erosion reduction, half-physical damage, and C-style fixed `+7` hero hit threshold.
- Missed hero trap darts are placed on the hero's square; hit darts are consumed.
- Successful hero dart hits now run the C strength exercise RNG before any poison branch.
- Hero dart poison now runs after hit damage through the thrown-weapon `rn2(30)` shape, including poison resistance bypass and CON/HP branches.
- Normal movement onto a dart trap now resolves the hero trap directly, and deferred object-list trap handling reuses the same helper.

## Tests

- `hero dart trap miss ignores generated dart enchantment and drops trap poison state`
- `hero dart trap damage uses generated dart enchantment and erosion`
- `hero poisoned dart trap hit uses C poison branch after damage`
- `hero known spent dart trap can vanish before generating a dart`

The tests use explicit RNG queues and movement fixtures only. They do not depend on replay maps, hidden tests, seeds, or runtime shortcuts.

## Remaining Work

This slice keeps the broader fatal-command-mode and lifesaving polish outside the helper. Physical and poison death causes are recorded, but a later trap-fatal pass can route hero dart deaths through the same full death UI and lifesaving machinery used by newer fire-trap work.
