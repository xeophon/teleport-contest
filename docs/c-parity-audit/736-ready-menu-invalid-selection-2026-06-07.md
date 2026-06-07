# 736 - Ready Menu Invalid Selection

## C Source

- `nethack-c/upstream/src/invent.c:1963-1981` opens `getobj()` inventory menus for `?` and `*`; `?` passes likely-candidate letters, while `*` passes all inventory.
- `nethack-c/upstream/src/invent.c:1982-1986` treats a menu close with no selection as a retry of the outer object prompt unless `force_invmenu` made the menu one-shot.
- `nethack-c/upstream/src/invent.c:1989-1993` treats menu Escape as cancel and reports `Never mind.`.
- `nethack-c/upstream/win/tty/wintty.c:1737-1741` rejects an invalid menu key with a bell and keeps the same menu open.
- `nethack-c/upstream/win/tty/wintty.c:1392-1399` resets an in-menu typed count after that invalid key.
- `nethack-c/upstream/win/curses/cursdial.c:1573-1623` keeps ordinary invalid keys in the curses menu too, but does not obviously clear a pending count before the later valid selector.

## Port Notes

- Invalid ready-menu keys now stay in `readyInventory` instead of treating the missing item as object-selection cancellation.
- Hidden downplayed letters in filtered `?` menus are ignored while the overlay remains open.
- Invalid menu keys clear `_ready_menu_count_text` and leave `_ready_count_text` intact, matching the tty path where menu counts reset but a direct prompt count already passed into `getobj()` still applies to a later valid menu selection.
- Space on the final ready-menu page and Enter/Return restore the direct `ready`/`fire` object prompt and clear item-selection counts.
- Manual `f` preserves its top-level shot limit across invalid menu keys and no-selection menu exits.
- The filtered-menu `*` key is treated like an invalid menu key in the JS overlay because explicit `?` menus do not expose C's `force_invmenu` special `*` row.

## Tests

- `f question ready menu ignores hidden downplayed letter`
- `Q star ready menu ignores arbitrary invalid letter and accepts later selection`
- `Q star ready menu invalid letter after count clears menu count and stays open`
- `Q prompt count survives invalid ready menu letter before valid selection`
- `f star ready menu invalid letter preserves shot limit`
- `Q filtered ready menu star after count clears menu count and stays open`
- `Q ready menu no-selection space restores prompt and clears prompt count`
- `f ready menu no-selection space restores fire prompt and preserves shot limit`
- `Q ready menu return keys restore direct ready prompt`

## Remaining Follow-Ups

- Curses appears to preserve a pending menu count across ordinary invalid keys, while tty clears it. The JS terminal overlay follows tty semantics for now.
