# 700 - Fireassist Launcher Selection

## C Source

- `nethack-c/upstream/src/cmd.c:1724` dispatches `f` to `dofire()`.
- `nethack-c/upstream/src/dothrow.c:501-506` starts from `uquiver`, with the throw-and-return weapon shortcut opting out of fireassist.
- `nethack-c/upstream/src/dothrow.c:557-579` only runs launcher assist when the readied object is ammo, fireassist is enabled, and the shortcut did not opt out.
- `nethack-c/upstream/src/dothrow.c:561-579` orders fireassist as reachable wielded polearm, matching primary launcher, matching alternate launcher, then a matching launcher found in inventory.
- `nethack-c/upstream/src/dothrow.c:444-459` implements `find_launcher()`: skip known-cursed matches, return the first BUC-known matching launcher, otherwise remember and return the first unknown-BUC matching launcher.
- `nethack-c/upstream/src/dothrow.c:1635-1648` keeps unmatched non-gem ammo on the by-hand warning and half-range path when fireassist is disabled or no launcher is found.

## Port Notes

- Added a dedicated `heroFireassistMatchingLauncher()` selector for `f`.
- The selector keeps a currently wielded matching launcher usable even when `fireassist` is disabled, but disables alternate/inventory launcher assist when `game.flags.fireassist === false`.
- When fireassist is enabled, alternate matching launchers now have priority over general inventory search.
- Inventory fallback now mirrors `find_launcher()` for BUC handling: known-cursed launchers are skipped, the first known non-cursed match wins, and the first unknown-BUC match is only used when no known non-cursed match exists.
- The existing `_fire_count` flow is preserved through the selected launcher path.

## Tests

- `f command fireassist skips known cursed inventory launcher`
- `f command fireassist prefers known non-cursed launcher over unknown BUC match`
- `f command nofireassist carried bow leaves arrow on by-hand path`
- Existing coverage rerun for matched and slung ammo:
  - `f command arrow with matching bow uses C ammo range increment`
  - `f command basic slung flint fires one stone`

## Remaining Follow-Ups

- Audit 701 covers the first empty-quiver prompt and `autoquiver()` ranking slice; broader manual `doquiver_core("fire")` edge cases remain there.
- Audit 702 covers the first empty-quiver wielded-polearm fallback and ordinary monster hit slice; bullwhip fallback and alternate-polearm swap remain separate `dofire()` slices.
- The JS fireassist swap/wield path still mutates state inline rather than queuing C's `doswapweapon`/`dowield`/retry sequence; current tests pin selected launcher behavior but not the full queued command lifecycle.
