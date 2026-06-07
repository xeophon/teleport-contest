# 714 - Polearm Tmiss Wakeup

## C Source

- `nethack-c/upstream/src/dothrow.c:1951-1965` implements `tmiss()`: visible/spotted monsters route through `miss()`, unseeable targets print `The <missile> misses.`, and `maybe_wakeup` consumes `rn2(3)` before possibly waking the monster.
- `nethack-c/upstream/src/zap.c:3571-3575` prints `The <weapon> misses <monster>.` when the target can be seen or spotted, otherwise `it`.
- `nethack-c/upstream/src/dothrow.c:2227-2230` routes applied polearm misses through `tmiss(obj, mon, TRUE)`, then applies the `HMON_APPLIED` unconditional `wakeup(mon, TRUE)`.
- `nethack-c/upstream/src/apply.c:3425-3433` handles an empty remembered invisible marker before `thitmonst()`: it clears the marker and prints `You miss; there is no one there to hit.` without the monster miss path.

## Port Notes

- Applied polearm misses now use a separate `tmiss()`-style message helper, preserving named visible misses while using bare `The <weapon> misses.` for unspotted invisible targets.
- Misses now consume the same `rn2(3)` maybe-wakeup roll before the applied-polearm unconditional wakeup/anger side effect.
- Passive object effects remain hit-only; this change only affects miss wording and wakeup ordering.
- Empty remembered invisible markers stay on their earlier no-target path.

## Tests

- `applying polearm miss skips rust monster passive object erosion`
- `applying polearm miss at remembered invisible marker uses generic miss wording`

## Remaining Follow-Ups

- Audit 715 covers long-worm cutting and concrete polearm damage dice.
