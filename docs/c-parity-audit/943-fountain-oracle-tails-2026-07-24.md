# Audit 943 — Fountain/Oracle Tails: seed9004-wizard-fountain-oracle to Full PASS

Date: 2026-07-24. Scope: the tail divergences left in
`sessions-extra/seed9004-wizard-fountain-oracle.session.json` after the
magic-trap roll-order fix (starting point: RNG 5955/6617, Screen 21/248).
End state: **full PASS — RNG 6617/6617, Screen 248/248, Cursors 248/248**,
public gate green throughout each increment.

Ground truth: `sessions-extra/seed9004-wizard-fountain-oracle.session.json`
(recipe `sessions-extra/recipes/seed9004-wizard-fountain-oracle.session.json`,
nethackrc `OPTIONS=!verbose,playmode:debug,symset:DECgraphics`).

## 1. Phantom "You hear a door open." (step 21)

A hobgoblin opened a closed door out of sight; C printed nothing because the
session runs `!verbose`. C gates all three postmov() door-open feedback
variants on `flags.verbose` (`nethack-c/upstream/src/monmove.c:1583`,
unlock/crash variants at :1565, :1607). The JS emitted the message
unconditionally (`js/allmain.js` monster-move door handling). Fix: wrap the
message construction in `if (game.flags?.verbose !== false)`.

## 2. Live door glyph over remembered one (steps 21-36)

The map came from `#wizmap` (step 11), which in C snapshots the background
glyph as hero memory: `show_map_spot()` -> `magic_map_background()`
(`display.c:232-258`, stores `lev->glyph`) plus `update_lastseentyp()`
(`dungeon.c:2927`). The JS `revealLevelMap()` (`js/cmd.js`) set only
`waslit`/`seenv`, so `newsym()`'s unseen-terrain path
(`js/display.js:968-975`, keyed on `loc.lastseentyp`) fell back to *live*
state and showed the door the hobgoblin had just opened. Fix: snapshot
`lastseentyp/lastseendoormask/lastseenwall_info` per revealed square.

## 3. Fatal gas-spore explosion shape (steps 36-38)

C's kill of the gas spore resolves the blast inside the killing blow:
`xkilled` -> `mondead` -> `mon_explodes` -> `explode()` hero injury
(`explode.c:590-678`): destroy_items roll (`zap.c:5998`), `pline_The("gas
spore's explosion is fatal.")` (:672, the "It is fatal." variant only
follows a *printed* CAUGHT_IN_EXPLOSION line — suppressed here by
`!verbose`, :594), then `done(DIED)` -> wizard `Die? [yn]` -> "OK, so you
don't die." -> `savelife()` -> return into `exercise(A_STR, FALSE)` (:678,
the next step's first roll, `rn2(2) @ attrib.c:509`). The tty --More--
suspension model explains the recorded boundaries: no --More-- interrupts
explode(), so all of this lands in the kill step; the Die? prompt forces the
message ack that becomes the next step. The JS deferred the hero injury via
`_queued_messages_after_more`, printing a spurious "You are caught..." /
"It is fatal.  You die..." a step late and never reaching Die?.
Fix (`js/cmd.js`):
- new `resolveFatalGasSporeHeroExplosionSync()` — engages only for the
  recorded-faithful case (!verbose, hero in blast, fatal, no life-saving
  amulet, debug/explay mode); pops the queued hero entry, rolls `rn2(5)`,
  applies damage, appends "The gas spore's explosion is fatal.", holds time
  and enters `deathDieMore` (C's `done()` suspension).
- XP: `xkilled()` grants experience at mon.c:3673, *after* done() returns,
  so the credit (and the level-up) must land in the survival step — stashed
  in `game._gas_spore_deferred_experience_mon`, applied in the
  `wizardDieConfirm` 'n' branch together with the pending
  `exerciseAttribute(A_STR, false)` (explode.c:678).
- `applyHeroKillLiveExperience()` on the kill step is skipped for this case
  (status line must still read the old Xp at the fatal --More--).

## 4. Spurious --More-- after genocide wipes (steps 95+)

C's `do_genocide()` ends with plain `pline("Wiped out all %s.")`
(`read.c:2965`) — no more(). The JS forced `endGenocidePrompt(messages,
true)` at both the class-mode and single-species exits. Fix:
`endGenocidePrompt(messages, messages.length > 1)` at both (the 80-col
topline packing in `toplineMessageSequence()` still inserts --More-- when
further messages follow, e.g. `seed9003`'s class wipes, which stays green).

## 5. Oracle color (step 165)

`monsters.h` PM_ORACLE displays as HI_ZAP (bright blue); JS hardcoded
CLR_WHITE (`js/mklev.js` `make_oracle_level`). Fix: CLR_BRIGHT_BLUE.

## 6. "Hello, wizard, welcome to Delphi!" (step 166)

C greets via `check_special_room()` DELPHI case (`hack.c:3711-3723`) on the
roomno transition into the Oracle's chamber (fired from `spoteffects()`,
`hack.c:3352`). The JS modeled the chamber as a pseudo-subroom sharing the
parent's roomnoidx, so no transition ever registered. Fixes:
- `js/mklev.js` `make_oracle_level()`: create a real
  `game.level.subrooms[]` entry with rtype DELPHI and its own roomnoidx;
  assign the DELPHI roomno to the chamber's wall ring + interior (C
  `topologize()`, `mklev.c:1621-1647` — the parent Oracle room is
  `irregular` so its own squares stay unowned; the doorway in the chamber
  wall must carry the DELPHI roomno for the transition to fire on entry).
- `js/cmd.js` `specialRoomEntryText()`: DELPHI case — convert to OROOM
  unconditionally (hack.c:3737-3738), greet only if the Oracle is in the
  room (`monstinroom()`), peaceful: `"Hello, <plname>, welcome to Delphi!"`,
  hostile: `"You're in Delphi, <plname>."`.
- Plain-walk movement path now calls `specialRoomEntryText()` on roomno
  transitions (previously only landings/teleports reached it).

## 7. Water demon HP dice (step 181)

C: `newmonhp()` rolls `d(m_lev, 8)` with `m_lev = adj_lev(ptr)`
(`makemon.c:1017-1042, 2016-2046`) — `d(8,8)` at Oracle dlvl 8; `d(7,8)` on
shallower levels where adj_lev decrements (e.g. `seed0006`'s two demons).
The JS WATER_DEMON entry hardcoded `hpLevel: 7`. Fix: drop it; `makemon()`
already falls back to `adjustedMonsterLevel()` (`js/mklev.js:7348`).
`seed0006` verified still passing.

## 8. #wizkill (steps 187-197, 206-220)

Unimplemented in JS (fell through to "unknown extended command"). C's flow
(`wizcmds.c:243-326`, `getpos.c:771-1169`):
- unique-prefix completion in the `#` echo (`tty_get_ext_cmd` +
  `ext_cmd_getlin_hook`): "# wizk" displays "# wizkill" with the cursor
  tracking the typed prefix. Added to the JS completion chain + Enter
  normalization (debug-gated like the other wiz commands).
- `Pick first monster to slay:` -> first getpos shows the farlook tip
  overlay once per game (`getpos.c:838 handle_tip(TIP_GETPOS)`), behind a
  --More--; later invocations skip it (no "Move cursor to..." reprint
  either — `show_goal_msg` is only set when the tip overwrote the prompt,
  getpos.c:839-861).
- cursor movement + `iflags.autodescribe` re-describe after each key
  (getpos.c:865-866, 889-890): hero square -> `heroFarlookDescription()`
  ("human wizard called wizard"), visible monster -> its name.
- '.' on a monster: `xkilled(mtmp, XKILL_NOMSG)` — reuse
  `killMonsterFromHeroProjectileHit()` (treasure `rn2(6)`, corpse
  `rn2(3)`, XP + level-up rolls in C order), then "Next monster:" loop;
  ESC clears the line (getpos.c:892-896).
New modes `wizkillIntroMore/wizkillTip/wizkillKillMore/wizkillCursor`
(more-ack exclusion lists updated at both sites), `wizkillCursor` added to
the display cursor list (`js/display.js`).

## 9. Fountain fate 29 — bad breath (steps 201, 236)

Missing from the JS fate table. C (`fountain.c:367-379`): "This water gives
you bad breath!" then `monflee(mtmp, 0, FALSE, FALSE)` for every living
monster — sets `mflee=1`, `mfleetim=0`, clears track, no RNG and no message
(`monmove.c:462-530`). Fix: same loop in the quaff fate branch.

## 10. Wizard "Dry up fountain? [yn] (n)" (steps 228-238)

C's `dryup()` prompts in wizard mode before drying (`fountain.c:216-219`);
the fate message gets a --More--, the y_n prompt is its own boundary, and a
refusal leaves both the fountain and the prompt text on the top line (only
the next pline/command clears it — cmd.c:5147). Fix:
- `js/fountain.js`: `performFountainDryup()` extracted;
  `dryupFountainResultAt()` gains opt-in `{ wizardPrompt }` returning
  `{ wizardPrompt: true }` after a successful dry roll in debug mode
  (other callers — dips, fire breath — keep the old unconditional path).
- `js/cmd.js`: `finishQuaffFateMessage()` helper routes all quaff fate
  branches through it; new modes `dryupFountainConfirm` (more-ack ->
  prompt) and `dryupFountainAnswer` ('y' dries + "The fountain dries up!";
  'n' refuses with `game._keep_pending_message = 1` so the prompt survives
  one flush cycle, matching C's persistence).

## 11. rndmonst reservoir vs raw-weight tables (step 230, RNG tail)

The post-refusal `maybe_generate_rnd_mon` spawn runs C's full reservoir
scan: 77 `rn2(totalweight)` calls with per-monster weight
`G_FREQ + align_shift + temperature_shift` (`makemon.c:1658-1719`). The
Oracle special level is alignment-neutral, so
`align_shift = (20-|maligntyp|)/ALIGNWEIGHT` applies to every candidate.
The JS took the precomputed raw-G_FREQ table branch
(`DIFFICULTY_1_TO_5_MONSTERS`), which can only match C when the shift is 0.
Fix: gate the three raw-weight table branches on
`monsterAlignShift(0) === 0 && !game.level?.flags?.temperature`, falling
through to `rndmonstCReservoir()`. Verified offline against the recorded
totalweight bounds: 77/77 exact (including the 5 genocided species and the
G_HELL-outside-hell `!` flag filter).

## 12. Dip prompt wording (step 244, last screen)

C's `dodip()` prompts `Dip %s into the fountain?` with
`flags.verbose ? obuf : shortestname` (`potion.c:2315-2316`) — "it"/"them"
when `!verbose`, full description when verbose. JS always used the full
description. Fix: shortname under `game.flags?.verbose === false`.

## Verification

- `node frozen/ps_test_runner.mjs sessions-extra/seed9004-wizard-fountain-oracle.session.json`
  — PASS (RNG 6617/6617, Screen 248/248, Cursors 248/248, animFrames 0/2 supplemental).
- `bash frozen/score.sh` — 44/44 green after every individual increment
  (checked at each lettered step; see git log).
- `node --test test/*.test.mjs` — no regressions from these edits
  (remaining failures are pre-existing in the baseline f4bfb32 and belong
  to other agents' in-flight areas: getpos-travel export, polyself armor,
  shop-billing helpers).
