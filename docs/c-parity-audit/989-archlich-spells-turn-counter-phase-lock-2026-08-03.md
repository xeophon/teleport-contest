# Audit 989 — seed9105 arch-lich spells: parked-sweep turn-counter phase lock (2026-08-03)

## Base state (worktree base ad6ea70)

seed9105-wiz-archlich-spells: RNG 2391/2391 (full), Screen 101/115, cursors
115/115.  The 14 failing screens were exactly steps [45-49, 60-62, 75-77,
93-95] and each differed in exactly ONE cell: the status-line turn counter
(`T:N`), C one turn ahead of the JS rendering.

## Diagnosis

The C recorder emits per-step RNG slices; matching `steps[i].rng` against the
JS engine's `getRngSlices()` (both flat-normalized) showed four
slice-placement skews with *identical flat content*:

| group | C tail slice | JS tail slice | C slice content |
|-------|--------------|---------------|-----------------|
| 1     | 45           | 50            | rnd(3)+rnd(13)x2 @ rndcurse (sit.c:593-596), rn2(5)x2 @ distfleeck (monmove.c:538), rn2(12)x3 @ mcalcmove (mon.c:1164), rn2(70) @ maybe_generate_rnd_mon (allmain.c:166), rn2(400) @ dosounds (sounds.c:213), rn2(20) @ gethungry (eat.c:3191), rn2(91) @ allmain.c:360 |
| 2     | 60           | 63            | mcalcmove x3 + maybegen + dosounds + gethungry + allmain.c:360 |
| 3     | 75           | 78            | summon-nasties rolls (wizard.c:607/620, pick_nasty:541, collect_coords, makemon) + distfleeck/m_move remainder + mcalcmove x4 + tail |
| 4     | 93           | 96            | carnivorous-ape mattacku chain (mhitu.c:806/1187, uhitm.c:5258/5269) + distfleeck/m_move + mcalcmove x4 + maybegen + regen_hp (allmain.c:659) + tail |

In C, a tty --More-- pause inside pline() never pauses game *state*: behind
the LAST pline still owed by the current monster sweep, C synchronously runs
movemon()'s remainder (distfleeck per surviving monster), the new-turn setup
(allmain.c:227-253: mcalcdistress, mcalcmove reallocation,
maybe_generate_rnd_mon, `svm.moves++` at allmain.c:244) and the once-per-turn
tail (dosounds allmain.c:344, gethungry allmain.c:355, regen_hp
allmain.c:655-659, u_wipe_engr allmain.c:360).  All of it is recorded against
the input boundary whose top line is that last sweep pline, and the status
line immediately shows the advanced turn while the chain's trailing messages
(the life-saving nomovemsg end.c:727 etc.) still wait for dismissal.

The JS engine instead parks the whole sweep+tail while any queued lich-chain
entries exist (allmain.js processMonsterTurns early return) and runs the
deferred tail only when the parked message queue fully drains — one More
window later, which produced the one-behind `T:` label on those 14 boundaries
and nothing else.

A true sweep-resume-index fix (running the tail mid-park) was evaluated: the
deferred execution is reached through several distinct engine paths
(deferred-monster-turn-tail block, finishMonsterTurnTail's tail-end cascade
`return await processMonsterTurns()`, ptime-armed main-loop passes), and
advancing it changes `game.moves` while tail gates keyed on moves
(regen `ules+con > rn2(100)` allmain.c:659, energy-regen interval allmain.c:...
, mspec_used decay mon.c mcalcdistress) would be re-phased — high blast radius
against 52 public + 12 passing-extra sessions for zero RNG benefit (the RNG
sequence is already bit-exact).

## Fix (C refs allmain.c:227-253, :244; status display follows the C state)

Phase-lock the *rendered* turn counter with C during the parked window; no
game state changes, no RNG risk:

1. `js/game_display.js` statusTurn(): when
   `game._status_turn_display_ahead_moves === game.moves` render `T:` as
   moves+1.  The compare-against-moves form self-invalidates the instant the
   deferred tail's real increment lands (precedent: the existing
   `_sanctum_status_turn_offset` display adjustment in the same function).
2. `js/cmd.js` rhack queued-message shift (~:65560): after shifting in the
   lich-chain entry, if the queue holds no further sweep-side entries
   (`e.lichColdShatter | e.lichCastRndcurse | e.lichCastEffect`) and no
   `_queued_message_after_more` sweep continuation remains
   (`'You die...'` etc.), the shifted line is the sweep's last pline — arm
   `_status_turn_display_ahead_moves = game.moves`.
3. `js/cmd.js` wizardDieConfirm refusal path (~:67090): when
   `_death_chain_after_refusal_messages` (the parked hitmsg()s of chain slots
   after a fatal hit, mhitu.c:763-946 resumed after end.c savelife) are
   re-emitted into the "OK, so you don't die." survival line with --More--
   parked, arm the same marker — this covers group 4 where the sweep
   continuation follows the refusal directly rather than through the queue.

## Verification

- `node --input-type=module -e "await import('./js/jsmain.js')"` loads OK.
- Target: PASS, RNG 2391/2391, Screen 115/115, cursors 115/115.
- `bash frozen/score.sh`: 52/52 public sessions passing (base count).
- sessions-extra: 12/19 passing; all previously-passing extras still pass;
  the 7 known-incomplete extras (9006-shops, 9007-valley, 9008-polyself,
  9012-castle-tune, 9150-harass, 9162-gascloud, 9163-cockatrice) report
  byte-identical metrics to base ad6ea70 (verified by running them from a
  scratch worktree of the base commit).

## Remaining unported

None within this session's surface.  The display-ahead marker stands in for a
full "run the monster-sweep tail behind the parked --More--" engine re-work;
if a future session diverges on more than the `T:` label during such a parked
window (e.g. tail side effects visible mid-park), the port will need the real
sweep-resume-index continuation described in audit 983's remaining-items
section.
