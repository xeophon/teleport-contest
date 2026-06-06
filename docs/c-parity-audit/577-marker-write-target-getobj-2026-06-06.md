# Magic Marker Write Target Getobj

## Scope

Route magic-marker `write on` target selection through C-shaped `getobj()` suggested/downplayed behavior.

This slice does not use replay maps, hidden tests, fixed seeds, player names, or runtime shortcuts.

## C Reference

- `nethack-c/upstream/src/write.c:98` calls `getobj("write on", write_ok, GETOBJ_NOFLAGS)` before marker writing.
- `nethack-c/upstream/src/write.c:61` through `:69` classifies target objects: non-paper is excluded, blank scrolls/spellbooks are suggested, and nonblank scrolls/spellbooks are downplayed but selectable.
- `nethack-c/upstream/src/invent.c:1885` through `:1893` keeps downplayed targets out of the prompt letters while preserving them as alternate selectable letters.
- `nethack-c/upstream/src/invent.c:1912` reports `You don't have anything to write on.` when no suggested or downplayed targets exist.
- `nethack-c/upstream/src/invent.c:1931` formats suggested prompt letters as `[letters or ?*]`; downplay-only prompts fall back to `[*]`.
- `nethack-c/upstream/src/invent.c:1963` through `:1979` makes `?` show suggested targets, or downplayed targets only when no suggestions exist, while `*` shows broad inventory.
- `nethack-c/upstream/src/invent.c:2071` lets direct target-letter selection validate the selected object, preserving the silly-target path for non-paper objects.

## JS Change

- `js/cmd.js` now classifies magic-marker write targets as `suggest`, `downplay`, or `exclude`.
- Applying a magic marker now preflights carried paper targets. If no scroll or spellbook target exists, the command cancels with `You don't have anything to write on.` without consuming a move.
- Blank scrolls and blank spellbooks are listed in the marker target prompt; nonblank scrolls/spellbooks stay directly selectable but omitted from prompt letters.
- Marker `?` target menus show suggested blank paper, falling back to downplayed paper only when no blank targets exist.
- Marker `*` target menus show broad carried inventory so non-paper selections still reach `That is a silly thing to write on.`
- Invalid target-letter retry restores the current C-shaped marker target prompt instead of the old hardcoded `[*]` prompt.

## Tests

- `magic marker write target preflight cancels when no paper is carried`
- `magic marker write prompt suggests blank paper and downplays nonblank paper`
- `magic marker target menu distinguishes question and star inventory`
- `magic marker invalid target retry restores suggested write prompt`
- `magic marker question menu falls back to downplayed paper without blanks`
- `magic marker write target selection suggests blank spellbooks`

The tests drive normal command input and local inventory fixtures only. They do not depend on replay maps, hidden tests, seeds, player names, or runtime checks.

## Remaining Work

- Broader magic-marker ink-cost, discovery, unknown-writing, and spellbook-writing parity remains separate from target selection.
- A reusable JS `getobj()` primitive would reduce duplication across marker, apply, throw, rub, tip, charge, and scroll-target commands.
