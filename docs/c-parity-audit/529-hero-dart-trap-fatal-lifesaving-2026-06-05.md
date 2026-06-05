# Hero Dart Trap Fatal Lifesaving

## Scope

Route hero-facing dart trap physical and poison deaths through the existing JS death/life-saving command modes. This is a follow-up to audit 528: hero dart traps already use generated dart objects and C-shaped hit/damage/poison ordering, but fatal outcomes still only recorded death causes.

## C Reference

- `nethack-c/upstream/src/trap.c:1259` saves `oldumort`, calls `thitu(7, ...)`, and only applies dart poison after a successful hit.
- `nethack-c/upstream/src/trap.c:1279` calls `poisoned("dart", A_CON, "little dart", (u.umortality > oldumort) ? 0 : 10, TRUE)`, so physical life saving downgrades the poison branch to attribute loss only.
- `nethack-c/upstream/src/mthrowu.c:106` prints hit/miss feedback inside `thitu()`.
- `nethack-c/upstream/src/mthrowu.c:150` calls `losehp()` and then exercises strength only if fatal handling returned.
- `nethack-c/upstream/src/hack.c:4256` `losehp()` hands fatal HP loss to `done(DIED)`.
- `nethack-c/upstream/src/end.c:1081` `done()` consumes a life-saving amulet and uses blind-aware medallion wording.
- `nethack-c/upstream/src/attrib.c:362` poison with `fatal=0` skips `rn2(fatal + 20)` and takes the attribute-loss branch.

## JS Change

- `js/cmd.js` now returns structured hero dart-trap results with `message`, `more`, `lifeSaving`, and `fatal` metadata.
- Physical dart deaths now either arm `deathDieMore` or consume a worn amulet of life saving and arm `lifeSavingMore`.
- Physical life saving still returns to the dart-trap path, exercises strength, and applies poisoned-dart fallout with `fatal=0`, matching the C `oldumort` check.
- Poison-only dart deaths now use the same fatal/life-saving handoff.
- Fatal dart hits without life saving stop before poison and before the strength exercise, matching the non-returning C death path.
- The sit, movement, and deferred object-list dart-trap callers now preserve the result metadata instead of flattening to a string.

## Tests

- `hero dart trap fatal physical hit arms death more before poison`
- `hero dart trap physical lifesaving limits poisoned dart to attribute loss`
- `hero poisoned dart trap deadly poison arms death more`
- `hero poisoned dart trap deadly poison uses life saving`

The tests use explicit RNG queues and local movement fixtures. They do not depend on replay maps, hidden tests, seeds, player names, or runtime shortcuts.

## Remaining Work

The broader projectile/death UI still has state-specific polish gaps, including exact blind/non-verbose `thitu()` hit wording and full post-life-saving status text parity. This slice only aligns the fatal control flow and poison fatality gate for hero dart traps.
