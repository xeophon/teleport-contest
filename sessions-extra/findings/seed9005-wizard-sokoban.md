# seed9005-wizard-sokoban — findings

Ground truth: `sessions-extra/seed9005-wizard-sokoban.session.json`
(recipe: `sessions-extra/recipes/seed9005-wizard-sokoban.session.json`)

## Coverage achieved

- Cross-branch arrival via the wizard levelport **`?` menu**
  (`^V` → `?` → page 2 → `B` = soko1). Named `^Vsokoban` lands on the
  main-dungeon level *containing* the branch stair (lev_by_name branch
  rule); named `^Vsoko1` is rejected (cross-branch); the menu is the clean
  idiom.
- soko1 (variant soko1-2, premapped): **14 successful boulder pushes**
  (verified by before/after boulder positions) plus 4 "try to move the
  boulder, but in vain" attempts against walls/boulders.
- **Boulder pushed into a hole**: "The boulder falls into and plugs a hole
  in the floor!" (hole becomes floor; hero follows the boulder into its
  last tile before the plug).
- A **rolling boulder trap** fired during the walk along the pit row
  (boulder appears mid-row mid-session).
- Walk across the filled hole row to the `>` stair at the far side;
  `<` attempt → "You can't go up here." (that stair is the branch exit;
  the up-stair to soko2 is deeper in the puzzle).
- **Quaff** a starting potion ("This tastes like slime mold juice.") and
  **eat** a wished food ration (occupation: "You're having a hard time
  getting all of it down." → "You're finally finished.").

## Final JS score

`FAIL (RNG 8228/8470, Screen 13/122 (cursors 120/122))`

## Divergences

### 1. Sokoban boulders not rendered (first screen divergence, step 13 — screen-only)

At the arrival `#wizmap`, C shows 19 boulders across the chamber; JS shows
only the 5 in the top boulder row. Walls, holes, stairs, hero position are
pixel-identical, and **RNG is identical at this point** (and for ~6400
calls afterwards; cursors match 120/122), so the boulders exist physically
in the JS level — pushes and movement behave identically — but most are
never drawn. This is a placement/display defect, not a seeding problem.
Suspect: `make_sokoban1_level` (js/mklev.js:17970) boulder placement or the
level-flip transform right after it (js/mklev.js:18060) failing to update
map glyphs / newsym for the flipped object positions.
**Fix area:** js/mklev.js sokoban generator + glyph cache update after
flip; check `SOKO1_2_BOULDERS` rendering against dat/soko1-2.lua.

### 2. Boulder-into-hole resist roll (first RNG divergence, index 6438, step 41)

At the hole-plug push:

```
C : rn2(100)=10 @ obj_resists(zap.c:1469)   /* breaktest/obj_resists as the boulder falls (cf. dothrow.c:2592) */
JS: rn2(19)=10
```

The JS plug path (js/cmd.js:40072 "plugs a hole") does not reproduce the
C `obj_resists()` roll made when the boulder drops into the hole, so the
stream offsets here even though the visible outcome (hole plugged) matches.
**Fix area:** JS boulder roll/drop into traps — add the breaktest resist
roll in C's order.

### 3. End-of-turn divergence after the quaff (rng index 8199, step 95)

Right after quaffing the fruit juice:

```
C : rn2(12)=5 @ mcalcmove(mon.c:1164)   /* monster speed roll */
JS: rn2(381)=311, then rnd(2)=2, rn2(6)=2, rn2(100)=65
```

The JS end-of-turn path diverges into a large-N roll sequence (shape is
consistent with a random generation/object roll) where C simply runs
mcalcmove. Downstream of this point the streams stay misaligned.
**Fix area:** js/allmain.js moveloop end-of-turn / spawn region logic for
sokoban levels.

## Suggested fix areas

1. js/mklev.js `make_sokoban1_level`: boulder placement/flip rendering
   (divergence 1 — biggest user-visible defect).
2. JS trap/plug path: obj_resists roll ordering (divergence 2).
3. js/allmain.js end-of-turn spawn logic on sokoban levels (divergence 3).
4. (see seed9004 findings) levelport-by-name support — same root cause
   blocks `^Vsokoban`/`^Vsoko1`; the `?` menu works around it.
