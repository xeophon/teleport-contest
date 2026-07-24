# Apply Pick-Axe: Wield + CANNED Re-apply, Dig Direction Prompt Candidates, Dig Turn Accounting, Spell-Menu Window Margin

Date: 2026-07-24

## C Reference

- `nethack-c/upstream/src/dig.c:1092` through `nethack-c/upstream/src/dig.c:1156` (`use_pick_axe()`): when the applied tool is not `uwep`, `wield_tool(obj, "swing")` prints `You now wield %s.` (`nethack-c/upstream/src/wield.c:744`, `doname(obj)`), queues a CANNED re-apply (`cmdq_add_ec(CQ_CANNED, doapply)` + `cmdq_add_key(CQ_CANNED, obj->invlet)`) and returns `ECMD_TIME` — the wield itself consumes the turn; the canned `doapply` is popped by the next `rhack()` and re-enters `use_pick_axe()` with the tool now wielded, which only builds the direction prompt (no rng).
- `nethack-c/upstream/src/dig.c:1121` through `nethack-c/upstream/src/dig.c:1151`: the prompt's bracket list `dirsyms[]` is built in `DIR_` order (W,NW,N,NE,E,SE,S,SW,down,up = `hykulnjb><` with default bindings); planar directions are skipped when `!dxdy_moveok()` (NODIAG hero form), off-map, or `dig_typ() == DIGTYP_UNDIGGABLE`; down is included iff `can_reach_floor(FALSE)` (`nethack-c/upstream/src/engrave.c:187`), otherwise up is included as the silly candidate; swallowed heroes get every direction. Prompt text: `In what direction do you want to %s? [%s]` with verb `dig`/`chop` (pick vs axe).
- `nethack-c/upstream/win/tty/topl.c:365` through `nethack-c/upstream/win/tty/topl.c:394` (`tty_yn_function()`, used by `getdir()` at `nethack-c/upstream/src/cmd.c:3988`): if the topline is unacknowledged (`TOPLINE_NEED_MORE`), `more()` runs first and blocks; only after dismissal does the prompt replace the line (`TOPLINE_SPECIAL_PROMPT`). `getdir()` then clears the message window after reading (`nethack-c/upstream/src/cmd.c:4011`), so the next `pline` starts fresh.
- `nethack-c/upstream/src/cmd.c:4095` through `nethack-c/upstream/src/cmd.c:4111` plus `nethack-c/upstream/src/decl.c:96` (`quitchars = " \r\n\033"`): space/return/escape at the dig direction prompt cancel `getdir()` silently; `use_pick_axe()` returns `ECMD_CANCEL` with no message and no time.
- `nethack-c/upstream/src/dig.c:300` through `nethack-c/upstream/src/dig.c:568` (`dig()` occupation): each tick adds `10 + rn2(5) + ...` effort (`dig.c:366`); the first sub-100 tick prints the one-shot `You hit the %s with all your might.` (`dig.c:561`); over 100 on a wall sets `DOOR/D_NODOOR` and prints `You make an opening in the wall.` (`dig.c:488-501`); downward ticks run `dig_check()` first and abort with `The stairs are too hard to dig in.` on stairs (`dig.c:317-322`, `dig.c:207-232`); `You start digging downward.` comes from `use_pick_axe2()` (`dig.c:1348`).
- `nethack-c/upstream/src/allmain.c:203` through `nethack-c/upstream/src/allmain.c:236` and `nethack-c/upstream/src/allmain.c:439` through `nethack-c/upstream/src/allmain.c:537` (`moveloop_core()`): each time-passed iteration decrements `u.umovement` by `NORMAL_SPEED` (`allmain.c:205`); the once-per-turn tail (`mcalcmove` reallocation, `maybe_generate_rnd_mon`, `dosounds`, `gethungry`, the `rn2(40 + 3*DEX)` engraving-wipe check at `allmain.c:360`) runs only when monsters and hero are both out of movement (`!monscanmove && u.umovement < NORMAL_SPEED`, `allmain.c:222`); `svc.context.move = 1` at `allmain.c:483` before every occupation call, so one final bookkeeping turn always follows an occupation's last tick.
- `nethack-c/upstream/win/tty/wintty.c:1902` through `nethack-c/upstream/win/tty/wintty.c:1931` (`tty_display_nhwindow()` NHW_MENU): a menu window is placed at `offx = max(10, cols - maxcol - 1)` with a one-cell margin before the first text column and its whole rectangle cleared, erasing the map beneath; for the 67-wide spell menu (`nethack-c/upstream/src/spell.c:2075-2145`, `dospellmenu()`) that is `offx == 12`, text at column 13.

## JS Parity Slice

- `js/cmd.js` apply-unwielded-pick branch now mirrors `use_pick_axe()`: `wieldItemForApply()` side effects kept, but the message is `You now wield ${inventoryItemName(item)}.` (C `doname` form, no inventory line), `game._queued_pick_dig_apply_letter` is set as the CANNED re-apply marker, and `context.move = 1` charges the turn (9 rng of bookkeeping in the pilot recording).
- `js/allmain.js` `maybePromptQueuedPickDigApply()` is the canned re-apply and now runs immediately before the `rhack(0)` input wait (C pops the CANNED command inside `rhack()` after the turn passes). With an unacknowledged topline it enters `pickDigReapplyMore` mode with `_message_more` set (tty `yn_function` `more()`); with a clear topline it shows the direction prompt directly.
- `js/cmd.js` `pickDigReapplyMore` mode: non-dismiss keys are no-ops at the pending --More--; space/return/escape dismiss it, reveal `pickDigDirectionPrompt(item)` and enter `applyPickDigDirection` mode with no time elapsed.
- `js/dig.js` gains `digDirectionCandidates(item)` (DIR_ order, NODIAG grid-bug check via `_polyself_form`, `digTypeOf() == DIGTYP_UNDIGGABLE` filter, `can_reach_floor(FALSE)` down/up rule) and `pickDigDirectionPrompt(item)` (`dig` vs `chop` verb); the already-wielded apply branch uses the same prompt.
- `js/cmd.js` `applyPickDigDirection` cancel keys (` \r\n\x1b`) now cancel silently like C `getdir()` quitchars instead of printing `Never mind.`.
- `js/allmain.js` turn accounting: the resume-after-more pass skips the `u.umovement` debit only when the monster turn was genuinely interrupted; when the dig occupation ends in the same pass that completed the monster turn (`turnAdvanced && hadPickDigOccupation && !_pick_dig_occupation`), the pending time is a NEW turn and decrements normally — otherwise the no-hero-movement gate suppressed every later turn tail and phase-shifted the whole turn stream. Additionally, when the dig occupation ends without a --More-- (stairs refusal, shop wall, statue/boulder finish), one final bookkeeping turn is re-armed (C `allmain.c:483` charges the turn after every occupation call).
- `js/cmd.js` `spellMenuLines()` emits the NHW_MENU window's cleared rectangle (`(left - 1)..78` on every menu row) before the text rows, matching the tty menu window margin; previously the map showed through the one-cell left margin (e.g. a wall glyph where C shows a space).

## Tests

- `digDirectionCandidates lists every direction when rock surrounds the hero`
- `digDirectionCandidates skips floor (undiggable) directions`
- `digDirectionCandidates skips an open doorway`
- `digDirectionCandidates skips trees for a pick`
- `digDirectionCandidates offers up instead of down while levitating`
- `pickDigDirectionPrompt formats the C prompt with verb and bracket list`
- `pickDigDirectionPrompt uses chop for axe tools`
- `applying an unwielded pick wields it, queues the canned re-apply, and takes the turn`
- `applying an already-wielded pick shows the candidate-list prompt immediately`
- `canned re-apply gates the direction prompt behind a --More-- on the wield message`
- `canned re-apply shows the prompt immediately when the topline is clear`
- `canned re-apply is dropped when the tool is no longer wielded`
- `space cancels the dig direction prompt silently`
- `escape cancels the dig direction prompt silently`

Verification:

```sh
node --test test/apply-dig-flow.test.mjs
node frozen/ps_test_runner.mjs sessions-extra/seed9001-wizard-dig-pilot.session.json
bash frozen/score.sh
```

Result: all 14 apply-dig-flow tests passed; the pilot session passes end-to-end (RNG 3533/3533, screens 77/77, cursors 77/77); the public session score stayed 44/44.

## Remaining Gaps

- The canned re-apply only covers the pick/mattock apply flow; C queues the same `cmdq_add_ec(CQ_CANNED, doapply)` for other wielded-on-apply tools (e.g. polearms), which in JS still require a second manual apply.
- An invalid (non-direction, non-quit) key at the dig direction prompt is a silent cancel in JS; C shows the `help_dir()` direction-help overlay when `cmdassist` is on before cancelling.
- `can_reach_floor(FALSE)` in the prompt builder omits C's unskilled-rider, hug-pinned, and ceiling-hider `u.uundetected` branches, which JS does not track; only the swallow and levitation/air-water-level cases are modeled.
- `do_repeat` still cannot replay the canned re-apply pair the way C's `CQ_REPEAT` queue can; `^A` after an apply-wield has nothing meaningful to repeat.
