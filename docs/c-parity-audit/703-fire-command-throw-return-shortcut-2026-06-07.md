# 703 - Fire Command Throw-And-Return Shortcut

## C Source

- `nethack-c/upstream/src/dothrow.c:30-34` defines `AutoReturn()` for primary-wielded aklys, Valkyrie Mjollnir, and boomerangs.
- `nethack-c/upstream/src/dothrow.c:473-478` computes `uwep_Throw_and_Return` and gates Mjollnir on strength `STR19(25)`.
- `nethack-c/upstream/src/dothrow.c:501-509` replaces `uquiver` with `uwep` when the quiver is empty or contains `is_ammo()`, and sets `skip_fireassist`.
- `nethack-c/upstream/include/obj.h:238-248` distinguishes ammo from missiles, so arrows/bolts/stones qualify while darts, shuriken, daggers, and boomerangs do not trigger the shortcut.
- `nethack-c/upstream/src/dothrow.c:1562-1568` sets `iflags.returning_missile` from `AutoReturn()` in the shared throw path.
- `nethack-c/upstream/src/dothrow.c:1708-1782` handles generic returning weapon catch, bad catch, fail-to-return, and hard landing.

## Port Notes

- `f` now checks the actual readied quiver object before autoquiver or fireassist.
- A wielded aklys, wielded boomerang, or strong Valkyrie wielding Mjollnir now routes `f` into the shared direct throw direction handler when the quiver is empty or contains ammo.
- The shortcut bypasses autoquiver and launcher assist, preserving the existing direct throw return path for range, hit, catch, bad-catch, fail-to-return, and landing behavior.
- Readied missiles such as darts do not trigger the shortcut, matching C's `is_ammo()` versus `is_missile()` split.
- Weak Valkyrie Mjollnir does not trigger the shortcut and leaves ammo quiver handling on the ordinary fire path.

## Tests

- `f command empty quiver with wielded aklys throws it before autoquiver`
- `f command ammo quiver with wielded aklys throws aklys instead of ammo`
- `f command weak Valkyrie Mjollnir does not override ammo quiver`
- `f command missile quiver does not use wielded aklys return shortcut`
- Existing return and fire canaries rerun:
  - `hero-thrown primary-wielded aklys returns to hand after monster hit`
  - `f command arrow with matching bow uses C ammo range increment`
  - `f command empty quiver with wielded polearm autohits before ammo prompt`

## Remaining Follow-Ups

- Audit 704 covers the empty-quiver bullwhip fallback.
- Full `dofire()` parity still needs alternate-polearm queued swap/retry and reachable wielded-polearm priority with quivered ammo.
- Fireassist launcher swaps still mutate state inline instead of queuing C's `doswapweapon`/`dowield`/retry sequence.
- Broader direct throw return parity remains tracked by the throw-specific audits: exact Mjollnir artifact self-hit details, inventory-slot restoration, autoquiver-on-return side effects, and complete shop/timer behavior after rare fail-to-return.
