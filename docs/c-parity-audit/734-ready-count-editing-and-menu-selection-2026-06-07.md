# 734 - Ready Count Editing And Menu Selection

## C Source

- `nethack-c/upstream/src/wield.c:521-532` resets command repeat state for `Q`/`ready` and calls `getobj()` with `GETOBJ_ALLOWCNT`.
- `nethack-c/upstream/src/dothrow.c:299` and `:543-582` keep top-level `f` counts as shot limits while manual ready-prompt counts select how many objects to ready.
- `nethack-c/upstream/src/invent.c:1937-1944` sends direct prompt digits into `get_count(NULL, digit, LARGEST_INT, ..., GC_SAVEHIST)`.
- `nethack-c/upstream/src/cmd.c:5044-5078` handles count digits, backspace, delete, Escape, and count echoing. The first digit is quiet; multi-digit and edited counts print `Count: N`; backing a count down to empty prints `Count: `.
- `nethack-c/upstream/src/invent.c:1979-1997` lets inventory menu selection return a count. An uncounted menu selection preserves a prior direct prompt count, while a counted menu selection overrides it.
- `nethack-c/upstream/src/invent.c:2063-2083` validates overlarge counts after object selection and keeps the object prompt active.

## Port Notes

- Top-level `Q` counts no longer become ready-selection counts; `2Qd` readies the whole selected stack.
- `Q2d` and manual `f2d` still use the prompt-entered count as the ready-selection count.
- Ready prompt count entry now mirrors C echo behavior for first digit, multi-digit counts, backspace, and delete.
- Ready inventory menu counts use a separate buffer: uncounted menu picks preserve a prompt count, while menu-entered counts override it.
- Escape in the ready menu follows the existing JS throw-menu convention: it clears an active menu count before cancelling the menu.
- Filtered ready inventory menus now accept only the visible menu letters, preventing hidden downplayed items from being selected through a suggestion menu.
- `Q -` clears both the quivered flag and the ready/quiver suffix from inventory lines.

## Tests

- `Q command count prefix does not become ready selection count`
- `Q command prompt count readies a split non-gold stack`
- `f command count prefix stays shot limit when manual prompt selects whole stack`
- `Q command prompt count first digit stays quiet and backspace clears it`
- `Q command prompt count backspace removes last digit before selection`
- `Q command prompt count survives uncounted ready inventory selection`
- `Q command ready inventory count replaces prior prompt count`
- `Q command ready inventory count delete edits count before menu selection`
- `Q command ready inventory Escape clears active menu count before cancel`
- `Q command dash clears quiver suffix before later fire`
- `f question ready menu rejects hidden downplayed letter`

## Remaining Follow-Ups

- C tty menus do not edit counts with backspace/delete, while curses menus delegate to `get_count()`; JS currently keeps the existing throw-menu editing behavior for consistency.
- Ready menu page navigation is still an overlay approximation of C windowport menus.
