# 682 - Fire Command By-Hand Ammo Monster Hit

## C Source

- `nethack-c/upstream/src/dothrow.c:557-582` lets `dofire()` fall through to `throw_obj()` when no matching launcher is found for quivered ammo.
- `nethack-c/upstream/src/dothrow.c:1635-1648` halves by-hand non-gem ammo range and prints the no-launcher warning.
- `nethack-c/upstream/src/dothrow.c:2011-2228` routes arrows/bolts through `thitmonst()`, applies the unmatched-ammo `-4` to-hit penalty, calls `hmon()` on hits, and runs `tmiss()` plus wake RNG on misses.
- `nethack-c/upstream/src/uhitm.c:1075-1087` sends thrown ammo without a matching launcher through `hmon_hitmon_weapon_ranged()`.
- `nethack-c/upstream/src/uhitm.c:884-898` gives by-hand ammo ranged impact damage from `rnd(2)`, with silver special handling.
- `nethack-c/upstream/src/uhitm.c:1435-1464` applies strength damage unless the thrown ammo has a matching launcher.
- `nethack-c/upstream/src/dothrow.c:1970-1988` applies hit-only missile mulch before surviving missiles continue to landing.
- `nethack-c/upstream/src/dothrow.c:1780-1791` still runs hard-landing `breaktest()` for surviving arrows/bolts even though they do not break there.

## Port Notes

- Added a narrow by-hand bow/crossbow ammo impact helper for arrows and crossbow bolts without matching launchers.
- The helper uses the C unmatched-ammo to-hit shape, `rnd(2)` ranged impact damage, ordinary increase-damage and strength bonuses, and no bow/crossbow weapon-skill damage.
- `f` no-launcher ammo now stops on monsters with hit/miss messaging and wake/damage effects after the warning More prompt.
- Direct `t` unmatched arrows/bolts now share the same by-hand impact helper.
- Surviving hit missiles keep C's hit-only mulch and then hard-landing resistance roll before floor placement.

## Tests

- `f command unmatched crossbow bolt can hit monster by hand after warning`
- `f command unmatched crossbow bolt miss wakes and lands by hand after warning`
- `hero-thrown unmatched crossbow bolt can hit monster by hand after warning`
- Existing unmatched range/warning tests still cover half-range and zero-range paths.

## Remaining Follow-Ups

- By-hand slung rocks/gems, by-hand arrow/bolt poison details, object/furniture mimic reveal, and lethal special cleanup still need separate source-backed slices.
- Audits 701, 702, and 703 cover empty-quiver autoquiver ranking, the first wielded-polearm fallback slice, and the throw-and-return shortcut.
- Full `dofire()` fireassist parity still needs bullwhip fallback, alternate-polearm swap, reachable-polearm assist with quivered ammo, the exact queued swap/wield/retry command lifecycle, and broader explicit count handling.
