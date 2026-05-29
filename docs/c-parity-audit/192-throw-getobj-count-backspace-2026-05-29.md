# Throw Getobj Count Backspace Parity

Date: 2026-05-29

## C Source

- `dothrow()` asks for an object through `getobj("throw", throw_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT)`: `nethack-c/upstream/src/dothrow.c:371`.
- `getobj()` enters `get_count(NULL, first_digit, LARGEST_INT, &tmpcnt, GC_SAVEHIST)` only after the initial prompt returns a digit: `nethack-c/upstream/src/invent.c:1937`, `nethack-c/upstream/src/invent.c:1944`.
- `get_count()` treats ASCII backspace and ASCII DEL/rubout as erase keys: `nethack-c/upstream/src/cmd.c:5030`, `nethack-c/upstream/src/cmd.c:5055`.
- Erasing a nonzero count divides the accumulated numeric count by ten, marks the count as backspaced, and echoes `Count: ` when the count becomes empty: `nethack-c/upstream/src/cmd.c:5059`, `nethack-c/upstream/src/cmd.c:5070`, `nethack-c/upstream/src/cmd.c:5072`.
- A digit typed after a backspace re-echoes the numeric count, including `Count: 0` after erasing to empty and typing zero: `nethack-c/upstream/src/cmd.c:5053`, `nethack-c/upstream/src/cmd.c:5072`.
- `getobj()` treats the count as given only when `tmpcnt` is nonzero, so erasing the only digit before selecting an object leaves a normal uncounted selection: `nethack-c/upstream/src/invent.c:1945`, `nethack-c/upstream/src/invent.c:2003`.

## JS Gap

- JS throw prompt counts were accumulated as text, but backspace and DEL fell through as ordinary object letters.
- Multi-digit counts could not be corrected before selecting an object, so a player could not edit `12d` down to `1d` before C-shaped throw validation.
- Erasing the only typed count digit did not restore the uncounted direct-selection path.

## Implemented

- Added throw-prompt count erasing for ASCII backspace and DEL/rubout while the temporary count is nonzero.
- Backspace/delete now divide the numeric prompt count by ten and echo `Count: N`, or `Count: ` when the count is erased.
- A digit typed after an erase now re-echoes the numeric count, matching `get_count()`'s backspaced echo behavior.
- Cleared the temporary backspace echo flag with the same throw count cleanup paths that already clear prompt count state.
- Invalid prompt selections now clear zero/empty temporary count state before the throw prompt is re-shown.

## Tests

- Added `throw prompt count backspace removes last digit before validation`.
- Added `throw prompt count delete removes last digit before counted gold throw`.
- Added `throw prompt count backspace clears single digit count state`.

## Remaining Gaps

- Throw inventory-menu count return remains open reusable `getobj()` work.
- A broader reusable `getobj()` primitive would still need to model menu count return, hands/self rows, direct-letter validation, and command-queue behavior across commands.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern 'throw prompt count|throw question menu|top-level throw count' test/shop-billing-helpers.test.mjs`
- `bash frozen/score.sh sessions/seed0004-feeding-pony.session.json`
- `node --test test/shop-billing-helpers.test.mjs`
- `node --test test/*.mjs`
- `npm run score` - 44/44 passing
