# 730 - Fire Ready Menu Help

## C Source

- `nethack-c/upstream/src/dothrow.c:543-550` reaches `doquiver_core("fire")` for manual `f` fallback and returns immediately when object selection cancels.
- `nethack-c/upstream/src/wield.c:294-326` uses the same `ready_ok()` filter for `Q` and manual `f`: suggested choices include matching ammo, ordinary weapons, and coins; downplayed choices remain legal.
- `nethack-c/upstream/src/invent.c:1872-1931` separates suggested letters from downplayed letters and prints `[<suggested> or ?*]` when suggestions exist, otherwise `[*]`.
- `nethack-c/upstream/src/invent.c:1950-1963` lets `?` show the suggested subset or downplayed fallback when there are no suggestions, while `*` shows full inventory.
- `nethack-c/upstream/src/wield.c:565-566` rejects worn armor/accessories/saddles after selection with `You cannot <verb> that!`.

## Port Notes

- Added a shared ready-inventory overlay mode for `Q` and manual `f`.
- `?` now opens a filtered ready menu: suggested objects when present, downplayed objects when no suggestions exist.
- `*` opens the full inventory for ready/fire selection.
- Space pages the ready menu or returns to the original prompt at the end; escape cancels with `Never mind.` and clears pending fire count state.
- Direct and menu selections now use one shared ready-selection helper, keeping manual `f` and `Q` consistent for weapons, coins, downplayed food, and worn-item rejection.
- Manual `f` with only downplayed inventory now reaches `What do you want to fire? [*]` instead of ending with no-ammo feedback.

## Tests

- `f command question menu shows ready suggestions and selection readies item`
- `f command question menu falls back to downplayed inventory`
- `f command star menu exposes full inventory and rejects worn armor`
- `Q command shared ready prompt accepts suggested weapon`

## Remaining Follow-Ups

- Counted `GETOBJ_ALLOWCNT` split handling is still incomplete, including partial non-gold stack readying and partial-gold rejection.
- Selecting primary or alternate wielded weapons still needs the C confirmation/unwield/time behavior rather than the current simplified path.
- Full menu selection does not yet enforce visibility of the selected letter against the current filtered page; this matches existing throw-menu behavior but is looser than C's interactive menu.
