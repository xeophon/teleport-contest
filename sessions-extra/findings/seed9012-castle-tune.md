# Findings: seed9012-castle-tune

## What the session covers (ground truth, recorded with C recorder)

Wizard "Tuner" (neutral), seed 9012, datetime 20260720093000:

- `#wizwish tooled horn` BEFORE the levelport (lands on letter `o`).
  The passtune is fixed at game init by five `rn2(7)=5,0,2,4,4 @
  init_castle_tune(dungeon.c:1116)` rolls → tune = "FACEE" (also
  cross-verified via the wizard `^V ?` menu line
  `j -   castle: 25 (tune FACEE)`).
- `^V` name-levelport `castle` + `#wizmap` (map unflipped this seed;
  drawbridge `#` at screen (14,12), fountain `{` (18,12), throne `\`
  (44,12), hero arrives at (2,18) in the west tower).
- `^T` position-teleport to (8,12) in the west bailey (the castle's
  bounded teleport regions — `tele_jump_ok` with
  dndest/updest.delarea = the exclude {1,1,61,15} mapped to level
  coords {9,5,69,19} — make direct tower→keep teleports return
  "Sorry..."; the hop (2,18)→(8,12) is outside→outside and legal).
- Walk `llll` to (12,12) at the moat.
- `#wizkill`, cursor `lll` onto the drawbridge-adjacent square (15,12),
  `.` → `You kill an unseen soldier!` (soldiers path toward the hero
  across the moat and pack the drawbridge-adjacent squares, so every
  direct teleport pick failed deterministically with "Sorry...";
  `#wizkill` takes ZERO game time (wizcmds.c `return ECMD_OK`), so the
  square stays clear for the immediate re-teleport), cursor `lll` to
  the empty fountain (18,12), `.` → `There is no monster there.`
  (breaks the slay loop).
- `^T` `lll` `.` → LANDS on (15,12), west-adjacent to the drawbridge.
  Landing messages: `There are several objects here.` + a chain of
  soldier/lieutenant arming --More--s (broadsword, spear, welding,
  short sword, dagger, knife — exactly 4 dismissal spaces needed).
- `a` apply → `o` (horn) → `Improvise? [ynq] (q)` → `n` →
  `What tune are you playing? [5 notes, A-G]` → `FACEE\n` →
  `You extract a strange sound from the horn!--More--` →
  **`You see a drawbridge going down!`** (bridge opens; map cell
  (14,12) becomes open `.`). The soldier pack then hits the hero
  (HP 21→7, hero survives; XL 2 from the wizkill).

Coverage: wish (object), name levelport, wizmap, bounded teleport
regions + tele_jump_ok, `#wizkill` slay of an unseen monster,
zero-time debug commands, getpos farlook/tip handling, apply/instrument
flow (Improvise?/getlin tune), passtune match →
`u.uevent.uheard_tune = 2` + `record_achievement(ACH_TUNE)` +
`open_drawbridge` (music.c:814-831), monster arming combat chatter.

## Final JS score

`node frozen/ps_test_runner.mjs sessions-extra/seed9012-castle-tune.session.json`
**FAIL — RNG 2614/13635, Screens 29/90 (cursors 29/90).**

## Divergence 1 (root cause): name-based levelport unsupported in JS

First RNG mismatch, flat index 2614 (the very first call of castle
level-gen, right after the tooled-horn wish):

```
[2613] C:  rn2(100)=70 @ makewish(zap.c:6421)
[2613] JS: rn2(100)=70
[2614] C:  rn2(3)=2  @ getbones(bones.c:645)   <<< C starts castle gen
[2614] JS: <none>                              <<< JS logs nothing more
```

The C resolves "castle" via `lev_by_name` (dungeon.c:2098) — the castle
is in the main dungeon (same branch), so the port succeeds. The JS's
`cAtoiLikeLevel` (js/cmd.js:5176) only does `Number.parseInt`; typed
level names never resolve, so the JS re-prompts and the rest of the
recipe is swallowed as getlin input — the JS never generates the castle
(jsRng simply stops at 2614 calls; screens continue in the re-prompt
loop). First screen divergence at step 29: C has already drawn the new
level; JS still shows `To what level do you want to teleport? [type a
number, name, or ? for a menu]`.

Same root cause as seed9007-valley-sacrifice (and the provided
seed9004/seed9005 stubs): **missing `lev_by_name` in the JS levelport**.

Suspect: `cAtoiLikeLevel` / `levelTeleportText` handler in `js/cmd.js`
(~lines 5176, 72488); C reference `lev_by_name` (dungeon.c:2098) +
`dlev_in_current_branch` (dungeon.c:2087).

## Divergences 2+ (not independently reachable yet)

The entire castle scenario (teleport-region hops, wizkill, instrument
apply, tune match, drawbridge) desyncs at the levelport, so no
positional comparison is possible downstream. After `lev_by_name` is
implemented, re-score to expose any further divergences (e.g. castle
level-gen, dbridge.c open_drawbridge, music.c passtune handling).

## Suggested fix areas

1. Implement `lev_by_name` in the JS levelport handler (see the
   seed9007 findings note for the exact semantics required: proto-name
   exact match, mapseen annotations, branch names,
   `dlev_in_current_branch` with medusa↔valley and main↔gehennom
   allowances, wizard-mode exemption).
2. Re-score; then compare castle-gen (`make_castle_level`), the
   drawbridge search in `play_tune` (music.c:816-831) and
   `open_drawbridge` (dbridge.c) for any remaining divergences.
