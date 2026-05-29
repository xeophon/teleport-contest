# Throw Getobj Menu Count Parity

Date: 2026-05-29

## C Source

- `dothrow()` selects the object with `getobj("throw", throw_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT)`: `nethack-c/upstream/src/dothrow.c:371`.
- `getobj()` opens `display_pickinv()` for `?` and `*`; a prompt count remains active while the menu is open: `nethack-c/upstream/src/invent.c:1963`, `nethack-c/upstream/src/invent.c:1981`.
- `display_pickinv()` returns the selected menu item and its menu count through `selected[0].count`: `nethack-c/upstream/src/invent.c:3380`, `nethack-c/upstream/src/invent.c:3409`.
- Uncounted menu selections return count `-1`, so `getobj()` keeps any earlier prompt count. A non-negative menu count replaces the prompt count: `nethack-c/upstream/src/invent.c:1996`.
- TTY menu counts are accumulated before item selection and assigned to the selected row; escape while counting cancels the count rather than the menu: `nethack-c/upstream/win/tty/wintty.c:1564`, `nethack-c/upstream/win/tty/wintty.c:1604`, `nethack-c/upstream/win/tty/wintty.c:1752`.
- Counted throw validation still happens before direction selection. Non-gold counts greater than one are rejected; gold accepts counts up to carried quantity: `nethack-c/upstream/src/invent.c:2028`, `nethack-c/upstream/src/invent.c:2046`.

## JS Gap

- JS throw `?` and `*` inventory menus discarded prompt count state on entry.
- Digits typed inside `throwInventory` were treated as object letters, so menu-local counts could not be used.
- Gold selected from a throw inventory menu always threw the whole purse because `_throw_count` was cleared on menu selection.
- Counted non-gold menu selections skipped the C pre-direction rejection.

## Implemented

- Preserved prompt count state when opening throw `?` and `*` inventory menus.
- Added throw-menu-local count state for digits, backspace, DEL, and escape-cancel of the in-progress count.
- Kept the active inventory overlay visible while echoing `Count:`.
- Reused the direct throw count validation for inventory-menu selections before entering direction mode.
- Applied counted gold from `?` and `*` menu selections to the later throw-direction path.

## Tests

- Added `throw star inventory menu count limits gold stack`.
- Added `throw question inventory menu count rejects multi-count non-gold stack before direction`.
- Added `throw prompt count survives inventory menu selection`.
- Added `throw inventory menu count clears on menu cancel`.

## Remaining Gaps

- This covers throw selection only. A broader reusable `getobj()` primitive still needs cross-command menu-count plumbing, direct-letter validation, hands/self rows, and command-queue behavior.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern 'throw question menu|throw prompt count|top-level throw count|throw star inventory menu count|throw question inventory menu count|throw prompt count survives inventory menu|throw inventory menu count clears|throwing gold from inventory' test/shop-billing-helpers.test.mjs`
- `node --test test/shop-billing-helpers.test.mjs`
- `node tools/compare-one-session.mjs sessions/seed0004-feeding-pony.session.json`
- `node tools/compare-one-session.mjs sessions/seed0014-dequa-fountain-explore.session.json`
- `node --test test/*.mjs`
- `npm run score`
- `git diff --check`
