# 731 - Ready Counted Selection

## C Source

- `nethack-c/upstream/src/wield.c:529-532` clears previous split state and calls `getobj(verb, ready_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT)` for both `Q`/`ready` and manual `f`/`fire`.
- `nethack-c/upstream/src/invent.c:1937-1944` accepts count digits at the object prompt when `GETOBJ_ALLOWCNT` is set.
- `nethack-c/upstream/src/invent.c:1979-1997` lets inventory-menu selection return a count for the chosen object.
- `nethack-c/upstream/src/invent.c:2063-2083` rejects overlarge counts with `You don't have that many!  You have only N.` and splits a smaller selected stack before returning it.
- `nethack-c/upstream/src/wield.c:547-560` merges a split child back when its parent is already quivered, rejects partial gold with `You can't ready only part of your gold.`, and finalizes non-gold split children as independent inventory objects.
- `nethack-c/upstream/src/wield.c:652-662` prints the readied item with a suffix for `ready`, but prints `You ready:` before setting the quiver for manual `fire`.
- `nethack-c/upstream/src/dothrow.c:359-371` and `:543-582` keep top-level `f` command counts as shot limits; prompt/menu counts inside manual `fire` remain object-selection counts.

## Port Notes

- Added a ready-selection count state shared by `Q`, manual `f`, and the ready inventory overlay.
- `Q` ignores the top-level numeric prefix as a ready-object count, matching C's reset of command repeat state before `getobj()`.
- Digits typed at the ready prompt or in the ready inventory menu are treated as `GETOBJ_ALLOWCNT` selection counts.
- Manual `f` preserves the existing top-level shot limit and uses only digits entered at the manual `What do you want to fire?` prompt or menu as ready-selection counts.
- Counted non-gold stack selection uses the existing carried stack split helper, clears worn/wielded/quivered state from the split child, refreshes both inventory lines, and readies the child.
- Partial gold readiness is rejected with the C wording and leaves gold quantity and quiver state unchanged.
- Overlarge counts keep the ready/fire prompt mode active after the C-shaped quantity error.
- Selecting an already-readied item now reports `That ammunition is already readied!`.

## Tests

- `Q command count prefix does not become ready selection count`
- `Q command prompt count readies a split non-gold stack`
- `f command prompt count readies a split non-gold stack before firing`
- `f command prompt count rejects partial gold readiness`
- `f command shot limit stays separate from manual prompt ready count`
- `Q command overlarge count keeps ready prompt active`

## Remaining Follow-Ups

- Full primary and alternate wielded weapon confirmation, unwielding, and time behavior remains separate.
- TTY and curses menu-count cancellation differ in C; JS currently follows the existing local throw-menu convention where Escape clears an active menu count first.
