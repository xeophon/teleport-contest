# seed9009-normal-descent — findings

## What the session covers

NORMAL-mode (no wizard) human Valkyrie, fully organic descent from Dlvl:1 to
**Dlvl:5**, 1160 steps, seed 9009, datetime 20000101080000:

- Travel idiom verified in C: `_` ("Where do you want to travel to?"),
  then in getpos: `x` = jump cursor to nearest exploration-frontier tile
  (GLOC_EXPLORE), `.` = accept. Travel then runs multi-turn in one step.
- The first `_` triggers the once-per-game TIP_GETPOS tip; the prompt + 2-line
  tip produce TWO `--More--`s, dismissed with two spaces (steps 1-3).
- `_>.` = travel to the down staircase once seen; `>` on the stairs descends.
- Doors: "That door is closed." bump, `o`+dir open, "The door resists!" retry,
  "This door is locked.", `^D`+dir kick: "Whammm!!" / "As you kick the door,
  it crashes open!", "You kick at empty space."
- Combat while traveling (travel stops on adjacent monsters): 3 sewer rats,
  2 grid bugs ("You get zapped!"), kobold, 2 jackals, lichen ("You kill the
  lichen!"), gecko; hero reaches Xp:2 ("Welcome to experience level 2.").
- Shop cues on Dlvl:3 ("You hear the chime of a cash register.", "You hear
  someone cursing shoplifters."), a fountain room, gold/items on the floor.
- Mid-travel trap: "A trap door opens up under you!  You fall down a shaft!"
  — falls Dlvl:3 → **Dlvl:5** (step 1148), survives, keeps exploring.

## Final JS score

`node frozen/ps_test_runner.mjs sessions-extra/seed9009-normal-descent.session.json`
→ **FAIL — RNG 2678/19012, Screen 1/1160 (cursors 29/1160)**.

The RNG figure is an artifact, not 14% parity: both sides share one ISAAC64
stream, so the ~2429 init calls (level gen, attributes — identical flow) match
trivially, and later per-turn "drumbeat" calls (`rn2(12) @ mcalcmove`,
`rn2(20) @ gethungry`, `rn2(82) @ moveloop_core`) coincidentally align while
turns elapse in both games. The games are in unrelated states from step 4 on.

## Divergence 1 (screen, step 1) — travel tip never shown

C: `Where do you want to travel to?--More--`, then the 2-line tip
("Tip: Farlooking or selecting a map location …") behind a second --More--.
Source: `getpos.c:838` `handle_tip(TIP_GETPOS)` → `hack.c:1871`
`l_nhcore_call(NHCORE_GETPOS_TIP)` (once per game, `flags.tips` on).
JS shows only the prompt, no tip, no --More--. JS *has* the tip text
(`TRAVEL_TIP_LINES`, `js/cmd.js:10171`, and `NHCORE_GETPOS_TIP` in
js/const.js:1459) but the `_`/travel input path never triggers it.
The two insurance spaces in the recipe then fall into JS's getpos instead of
dismissing --More--s.

## Divergence 2 (screen, step 4 — the blocker) — getpos `x` key not implemented

C: `x` jumps the cursor to the nearest exploration-frontier tile —
`getpos.c:1011-1038` (mMoOdDxX branch) + `gather_locs(GLOC_EXPLORE)`
(`getpos.c:470-481`): explored floor/door/corridor tiles adjacent to
unexplored space, sorted by distance. `.` accepts and travel runs.
JS: prints "Unknown direction: 'x' (use 'h', 'j', 'k', 'l' or '.').", the
cursor never moves, and `.` then yields "You are already here." — travel
never starts, every `_x.` cycle is a no-op, and the hero is stuck in the
start room for the whole replay. All descent coverage (stairs travel, door
kicks in the right places, the fights, the trap-door fall) is blocked by this
one missing branch.
Note: JS *does* implement the dungeon-symbol search — `>` at JS step 302
gives "Can't find dungeon feature '>'." (matching `getpos.c:1114`, the stairs
simply never got seen in JS). Only the mMoOdDxX/gather_locs branch and the
GLOC_EXPLORE targets are missing. JS's own getpos help text
(`TRAVEL_CURSOR_HELP_LINES`, `js/cmd.js:10180`) even documents
"Use 'x'/'X' to move the cursor next to an unexplored location."

## Divergence 3 (RNG, index 2582 = C step 17) — states already unrelated

First positional RNG mismatch:

```
C  [2582]: rn2(5)=0 @ distfleeck(monmove.c:538)   # bravegremlin roll, monster
                                                 # turn during the 1st travel
JS [2582]: rn2(2)=1   (from rhack — kick-at-empty-space path, js/cmd.js:74771)
```

C is mid-travel at step 17 (130 RNG calls of monster turns); JS's 2583rd call
comes only much later, when a recipe `^D` kick finds no door west of the
start room. Side observation: JS's kick_dumb rolls `rn2(2)` for the empty-space
case, but C's `kick_dumb` (`dokick.c:862-878`) rolls `rn2(3)`
("Dumb move!  You strain a muscle." check) — a small in-isolation modulus bug
worth fixing once travel works.

## Suggested fix areas (do NOT fix here)

1. Implement the getpos mMoOdDxX keys in JS (`x/X` unexplored, `m/M` monster,
   `o/O` object, `d/D` door, `a/A` interesting) with `gather_locs` +
   distance sort, per `getpos.c:438-555, 1011-1038`.
2. Fire the TIP_GETPOS tip on first getpos use (message lines + --More--,
   once per game; honor `OPTIONS=!tips`).
3. Travel engine parity once targeting works: `context.travel/run=8`,
   `DOMOVE_RUSH`, stop-on-monster / "That door is closed." behavior
   (`cmd.c:5297-5377`, hack.c travel rush).
4. Fix kick_dumb's `rn2(3)` (`dokick.c:866`) vs JS's `rn2(2)`.
5. Re-score; then look at door-open `rnl(20)` (`lock.c:904`), combat rolls
   (`uhitm.c`/`mhitu.c`), and the trap-door fall (`do.c`/`trap.c`) this
   session covers.
