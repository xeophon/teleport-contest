# 701 - Fire Command Autoquiver Selection

## C Source

- `nethack-c/upstream/include/optlist.h:190-192` defaults `autoquiver` off.
- `nethack-c/upstream/src/dothrow.c:390-439` implements `autoquiver()` inventory ranking: skip worn/readied/artifact/undisclosed objects, prefer current-launcher ammo, then missiles, then alternate-launcher ammo, then miscellaneous throwables.
- `nethack-c/upstream/src/dothrow.c:501-550` starts `dofire()` from `uquiver`, only calls `autoquiver()` when `flags.autoquiver` is on, and falls through to `doquiver_core("fire")` when autoquiver is off or finds nothing.
- `nethack-c/upstream/src/dothrow.c:532-536` prints `You ready:` for successful autoquiver with the quiver suffix suppressed.
- `nethack-c/upstream/src/wield.c:294-326` defines the manual fire/ready object filter, including downplayed non-rock gems that autoquiver intentionally skips.
- `nethack-c/upstream/src/wield.c:510-532` wires `doquiver_core("fire")` to the manual `What do you want to fire?` prompt.
- `nethack-c/upstream/src/wield.c:658-662` prints `You ready:` before placing a manually fired item into the quiver slot.

## Port Notes

- Empty-quiver `f` no longer silently falls back to the first carried projectile when `autoquiver` is disabled; it now enters the manual fire-object prompt.
- Added a JS `heroAutoquiverProjectile()` selector shaped after C's bucket order: current-launcher ammo, missile, alternate-launcher ammo, then miscellaneous.
- Autoquiver skips worn/readied, artifact, alternate weapon, and undisclosed items, skips non-rock gems, treats rocks/known flint/known glass as sling-style ammo, and keeps the C dagger/aklys distinctions for throwing weapons.
- Successful autoquiver now readies the selected item and prints `You ready: <letter> - <item>.` without an immediate `(in quiver)` suffix.
- Failed autoquiver now falls through to the manual fire prompt when the existing JS fire selection surface has a candidate.
- The ready message is preserved before any fireassist launcher message, matching C's ordering where quiver population happens before launcher assist/retry handling.

## Tests

- `f command empty quiver with autoquiver disabled prompts instead of auto-firing`
- `f command failed autoquiver falls through to fire prompt`
- `f command autoquiver prefers current launcher ammo over earlier missile`
- `f command autoquiver prefers missile over alternate launcher ammo`
- Existing launcher/fireassist canaries rerun:
  - `f command fireassist skips known cursed inventory launcher`
  - `f command fireassist prefers known non-cursed launcher over unknown BUC match`
  - `f command nofireassist carried bow leaves arrow on by-hand path`
  - `f command arrow with matching bow uses C ammo range increment`
  - `f command basic slung flint fires one stone`

## Remaining Follow-Ups

- Manual `doquiver_core("fire")` parity is still broader than the current JS prompt: coins, generic weapon suggestions, downplayed items, count-based splitting, no-inventory feedback, and worn/alternate edge cases remain separate work.
- Audit 702 covers the first empty-quiver wielded-polearm fallback and ordinary monster hit slice; audit 704 covers the empty-quiver wielded-bullwhip fallback.
- Audit 703 covers the thrown-and-return weapon shortcut for an empty quiver or ammo quiver before autoquiver.
- Audit 705 covers the empty-quiver alternate-polearm fireassist swap/retry slice.
- Audit 706 covers fireassist's reachable wielded-polearm priority after quivered/readied ammo selection.
- The JS fireassist swap/wield path still mutates state inline rather than queuing C's `doswapweapon`/`dowield`/retry sequence.
