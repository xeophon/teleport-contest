# Audit 939 - Container "Put in what?" Corner-Menu Geometry (seed0012)

Date: 2026-07-24. Scope: tty NHW_MENU window placement for the container
put-in object picker, regressed in 5fe85ad (Wave 2) when
`putInInventoryOverlayLines` switched the picker to a cleared full-screen
layout at column 1. Fixed by restoring C's "corner window" geometry.

## C Source

- `nethack-c/upstream/win/tty/wintty.c:2649-2772` (`tty_end_menu`): window
  size accounting. `cw->cols` = widest item `strlen(str) + 2` (padding for
  the leading/trailing space) across every menu item — prompt, blank
  separator, class headings, entries — versus `strlen(morestr)` *without*
  padding ("(end) " or "(x of y) ", both with trailing space). `cw->maxcol =
  cw->cols`; `cw->maxrow = cw->nitems + 1` for a single-page menu.
- `nethack-c/upstream/win/tty/wintty.c:13`: `#define H2344_BROKEN` is
  unconditional in wintty.c, so the H2344 branch is the live code.
- `nethack-c/upstream/win/tty/wintty.c:1902-1941` (`tty_display_nhwindow`,
  NHW_MENU): `offx = min(min(82, cols / 2), cols - maxcol - 1)` (80x24:
  `min(40, 79 - maxcol)`), clamped at 0. The menu is promoted to a cleared
  full screen (`offx = 0`) only when `maxrow >= 24` or `menu_overlay` is
  off; otherwise it is a "corner window" with `offy = 0` that leaves the
  map visible left of and below it.
- `nethack-c/upstream/win/tty/wintty.c:1427-1431,1545-1547`
  (`process_menu_window`): each menu row does `tty_curs(window, 1, row)`
  (absolute column = offx), `cl_end()` (clear offx -> EOL), then
  `putchar(' ')` at offx and the item string from offx + 1; the footer is
  printed by `dmore()` at offx + 1 with the cursor left after "(end) "
  (offx + 7 for the single-page morestr). Selection toggles are patched in
  place by `set_item_state()` (`+`/`#`/`-` at string position 2,
  wintty.c:1177-1194).
- `nethack-c/upstream/win/tty/wintty.c:966-984,3650-3721`
  (`erase_menu_or_text`/`docorner`): dismissing a corner menu redraws the
  map from column offx - 1 over `maxrow + 1` rows, which is why map glyphs
  reappear beside/under the next menu in the same frame.
- `nethack-c/upstream/src/pickup.c:3261-3365` (`menu_loot`): the put-in
  chain — `query_category()` ("Put in what type of objects?") then
  `query_objlist()` ("Put in what?", pickup.c:1025) — and
  `nethack-c/upstream/src/invent.c:3057+` (`display_pickinv`) share the
  same NHW_MENU placement rules.

## Recorded C Evidence

- seed0012 step 262: after `\r` on the category menu, the "Put in what?"
  picker (prompt + blank + "Coins" + "$ - 1163 gold pieces" + "(end)") is
  drawn at columns 41-60 with rows 0-4 cleared from column 40; the vault
  room wall (`lqqqqq`/`x~~~~~` in DECgraphics) survives at columns 34-39
  and rows 5+ are untouched map. The "bordered box" appearance is the
  *map* showing through, not a drawn border. Cursor at (47,4) = after
  "(end) ". Step 263 toggles the entry in place to "$ + 1163 gold pieces".
- Recorder instrumentation (env-guarded debug build, reverted after use):
  "Put in what?" reports maxcol=22 -> offx=min(40,57)=40; "Pick up what?"
  maxcol=19 -> offx=40; the category menu maxcol=57 -> offx=22; "Do what
  with your bag?" maxcol=42 -> offx=37. All match the recorded frames.
- seed9011 step 59: a two-page put-in picker (maxrow 24) is forced to
  offx 0 over a cleared screen, footer "(1 of 2)" at row 23 with the
  cursor immediately after it (multi-page morestr has no trailing space).

## Regression

5fe85ad replaced the per-row corner geometry with
`putInInventoryOverlayLines`, rendering every put-in picker full-screen at
column 1 (`setOverlay(rows, 24, ..., 0)`), and its bag-put call site also
dropped the `-` selection markers (selected argument omitted). Two frames
(262, 263) diverged in seed0012; seed9011's put-in pages diverged too.

## Changes (js/cmd.js)

- Added `cornerMenuGeometry(itemTexts, morestr)` implementing C's
  maxcol/offx/maxrow accounting exactly (exported for tests).
- Rewrote `putInInventoryOverlayLines` to place title/blank/headers/
  entries/footer at column offx + 1 and to force offx 0 when the window
  reaches display height; returns `{ rows, offx, fullScreen }`.
- Added `setPutInMenuOverlay()` which maps that to `setOverlay` (clear
  rows 0..maxrow-1 from offx for corner windows; clear all 24 rows and
  hide status for full-screen ones) and routed all three put-in call
  sites (`drawIceBoxPutObjectMenu`, `drawContainerPutObjectMenu`, the
  bagPutTypes -> bagPutObject transition) through it. The bag-put site
  now passes a selection set so entries render `-`/`+` markers like C.
- Replaced the stale bagPutObject toggle handler (it rewrote overlay
  lines in the pre-5fe85ad column-40 format and was a no-op) with a
  regenerate through `setPutInMenuOverlay`.

## Verification

- `node frozen/ps_test_runner.mjs sessions/seed0012-monk-vault-escort.session.json`
  PASS (RNG 13878/13878, Screen 308/308, cursors 308/308).
- `bash frozen/score.sh`: 42/44 (was 41/44); remaining FAILs are
  seed0108-wizard-extcmd-wishlist and seed4500-knight-coverage, both
  RNG-sequence divergences outside this audit's scope.
- `node frozen/ps_test_runner.mjs sessions-extra/seed9001-wizard-dig-pilot.session.json`
  PASS; seed9011-wizard-loot-chest now PASS 80/80 (was 78/80).
- `node --test test/menu-geometry.test.mjs`: 8/8 pass (offx cap at
  cols/2, content-derived offx, clamp at 0, full-screen boundary at
  maxrow 24, corner rows for the gold-only fixture, `+` marker on
  toggle, offx 0 for the paginated case, empty-inventory case).
