# seed9008-wizard-polyself — findings

## Coverage (all beats verified in the recording)

- `#levelchange` to XL 3 first — required because `newman()` can drop up to 2
  levels (`newlvl = oldlvl + rn1(5, -2)` at polyself.c:342); reverting to human
  at XL 2 can roll 0 → "Your new form doesn't seem healthy enough to survive."
- Wishes: ring of polymorph control (o), wand of polymorph (p), silver dagger (q).
- `P`ut on the control ring (right hand).
- `#polyself` → `xorn` — step 122: "You turn into a xorn!  The clasp on your
  cloak breaks open!" (break_armor, polyself.c:1189). Status line shows
  "Wizard the Xorn … HD:8".
- As xorn: `e`at the silver dagger — step 125: "This silver dagger is
  delicious!" (metallivore eat path).
- Xorn phases through the room's west wall and back — step 127 screen shows the
  `X` glyph inside the wall tile (M1_WALLWALK).
- Zap wand of polymorph at self with control ring → `human` — step 139:
  "You feel like a new man!" (`newman()`, XL 3→5, status back to
  "Wizard the Conjurer … Xp:5/263").
- `d`rop 3 potions (f,g,h), zap the wand down (`zp>`) — step 152 RNG shows the
  floor pile polymorphing:
  `rn2(100)=87 @ obj_resists(zap.c:1469)` | `rn2(8)=2 @ obj_shudders(zap.c:1496)`
  | `rnd(1000)=214 @ mkobj(mkobj.c:289)` … (one obj_resists/obj_shudders/mkobj
  sequence per potion).

## Why the previous recording failed (diagnosis)

Old run printed "You feel like a new man!" instead of becoming a xorn. That was
NOT a desync and NOT an unworn ring: the ring was on the right hand (old step 88)
and the "Become what kind of monster?" prompt did appear (only shown when
Polymorph_control is active, polyself.c:481/513). The failure was the 1-in-5
forced-`newman()` roll in `polyself()`: polyself.c:712
`if (!polyok(&mons[mntmp]) || (!forcecontrol && !rn2(5)) || your_race(...))`.
Wand zaps call `polyself(POLY_NOFLAGS)` (zap.c:2808), so the roll applies.
Fixed by using the wizard `#polyself` command → `polyself(POLY_CONTROLLED)`
(wizcmds.c:568) → forcecontrol skips the rn2(5). The wand+ring path is still
exercised by the revert-to-human zap (`human` always goes through `newman()`
via the `your_race()` branch, so it needs no forcecontrol).

## JS score

`node frozen/ps_test_runner.mjs sessions-extra/seed9008-wizard-polyself.session.json`
→ **RNG 2449/2720, screens 103/154** (cursors 103/154). Important: every call
and screen the JS produced matches — 2449/2449 RNG and 103/103 screens up to
the first divergence. The JS replay then dies.

## Divergence 1 (only one, fatal): wish "silver dagger" unknown to JS

Step 103, key `\n` (completing the third wish). C:

```
rn2(4)=2  @ rnd_otyp_by_namedesc(objnam.c:3522)
rnd(2)=1  @ next_ident(mkobj.c:521)
rn2(11)=0 @ mksobj_init(mkobj.c:878)
rn2(3)=2  @ mksobj_init(mkobj.c:879)
rne(3)=1  @ mksobj_init(mkobj.c:879)
rn2(2)=1  @ mksobj_init(mkobj.c:880)
rn2(100)=79 @ makewish(zap.c:6421)
```
→ "q - a silver dagger."

JS (screen): "Nothing fitting that description exists in the game.  For what do
you wish?" — `WISH_BASE_OBJECTS` in js/cmd.js (~line 3564) has `dagger` but no
`silver dagger` (also no `elven dagger` / `orcish dagger`; those names only
exist in unrelated weight/damage tables at js/cmd.js:8076, 8284-8288).
The wish retries then consume all remaining keystrokes ("Por #polyself…"),
so nothing after step 103 happens on the JS side — that accounts for all
271 missing RNG calls and all 51 missing screens.

Suspect functions: wish resolution in js/cmd.js (`wishedBaseObjectFromName`,
`WISH_BASE_OBJECTS`, `handleNoFittingWish` at js/cmd.js:15964).

## Suggested fix areas

1. js/cmd.js `WISH_BASE_OBJECTS`: add missing weapon names so the table covers
   every `objects[]` entry C's `rnd_otyp_by_namedesc` can match by name
   (silver/elven/orcish dagger and friends).
2. After the wish succeeds, this session becomes a parity probe for
   `polymon` (polyself.c:792/813/868), `newman` (polyself.c:342,361,
   rndexp exper.c:388, redist_attr attrib.c:749, newhp attrib.c:1101),
   metallivore eating, wallwalking movement, and floor-object polymorph
   (obj_resists/obj_shudders zap.c:1469/1496) — currently unverifiable on the
   JS side because of divergence 1.
