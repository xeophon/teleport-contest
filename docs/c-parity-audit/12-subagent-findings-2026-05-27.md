# `#rub` Prompt And Egg Timer Follow-Up - 2026-05-27

This note records the follow-up subagent audits after royal-jelly `#rub` egg effects were implemented.

## `#rub` Prompt Parity

Upstream C uses `getobj("rub", rub_ok, GETOBJ_NOFLAGS)` for the first prompt and `getobj("rub the royal jelly on", jelly_ok, GETOBJ_PROMPT)` for the royal-jelly target prompt.

Source anchors:

- `decl.c:96` defines `quitchars` as space, carriage return, newline, and escape.
- `invent.c:getobj()` checks `quitchars`, prints `Never mind.` when verbose, and returns null without consuming a turn.
- `invent.c:getobj()` emits `You don't have anything to rub.` when the first non-forced `#rub` prompt has no suggested candidates.
- `GETOBJ_PROMPT` suppresses that early no-candidate return for the royal-jelly target prompt, so no egg candidates still produce `What do you want to rub the royal jelly on? [*]`.
- `apply.c:use_royal_jelly()` splits one lump from a stack and removes it from inventory before target selection, then tries to restore it on cancellation.

JS status:

- `rubObject` now treats space, Enter, return, and escape as no-turn cancellation with `Never mind.`
- `#rub` now reports `You don't have anything to rub.` and clears extended-command mode when there are no rub-suitable carried objects.
- Royal-jelly target prompts now use `[*]` with no carried eggs.
- Public tests cover first-prompt cancellation, target-prompt cancellation, no-egg target prompting, and stacked unpaid-jelly target cancellation preserving the live bill row.

Remaining caveat:

- JS still does not split and remove the selected royal jelly before the target prompt. Current visible cancellation and success billing match the intended C behavior, but the internal prompt-time inventory shape is not C-shaped yet. The C audit found conflicting source behavior: `use_royal_jelly()` intends `unsplitobj()` restoration after `freeinv()`, but this checkout's `unsplitobj()` appears to reject `OBJ_FREE` objects.

## Egg Timer Candidate Slice

A separate audit identified genocide/extinction-aware egg timer handling as a bounded next target.

C source behavior:

- `timeout.c:attach_egg_hatch_timeout()` stops any old hatch timer and schedules the classic `151..200` hatch window.
- `timeout.c:kill_egg()` stops the timer without clearing the egg species.
- `timeout.c:hatch_egg()` blocks unique, genocided, and extinct hatch targets, rolls hatch count from the stack quantity, decrements the stack, and reschedules remainder with `rnd(12)`.
- `mon.c:kill_genocided_monsters()` proactively kills egg timers for newly dead species across inventory, floor, buried/migrating objects, and monster inventories.
- `allmain.c` runs object timeouts from the central timeout queue once per turn.

JS status and risk:

- JS egg hatch timers are local object fields (`eggHatchTurn`, `_egg_hatch_seq`, `_egg_hatch_consumed`) rather than central object timers.
- JS hatch processing checks genocided monsters late in the current-level scan, but genocide does not proactively clear hatch timers and egg hatching does not consistently consult extinct species.
- A bounded implementation can add a shared `killEggHatchTimer()` and dead-species helper, then use it from genocide and hatch timeout processing while preserving egg species.
