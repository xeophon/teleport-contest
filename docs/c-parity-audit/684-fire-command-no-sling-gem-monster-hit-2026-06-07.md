# 684 - Fire Command No-Sling Gem Monster Hit

## C Source

- `nethack-c/upstream/src/dothrow.c:557-582` lets `dofire()` fall through to `throw_obj()` when fireassist cannot find a matching launcher for quivered ammo.
- `nethack-c/upstream/src/dothrow.c:163-168` keeps unmatched ammo at one shot; ammo multishot requires `matching_launcher(obj, uwep)`.
- `nethack-c/upstream/src/dothrow.c:1635-1648` only halves range and prints the by-hand launcher warning for unmatched non-`GEM_CLASS` ammo. Rocks, flint, and gems are gem-class sling ammo, so no no-sling warning is printed.
- `nethack-c/upstream/src/dothrow.c:2082-2099` handles non-mineral gems thrown to unicorns before the ordinary hit roll when the hero is not slinging.
- `nethack-c/upstream/src/dothrow.c:2152-2164` applies the unmatched-ammo `-4` to-hit penalty before the ordinary thrown-object hit path.
- `nethack-c/upstream/src/uhitm.c:1075-1088` sends thrown ammo without a matching launcher through the ranged `rnd(2)` damage path.
- `nethack-c/upstream/src/uhitm.c:1436-1483` applies strength to thrown ammo unless the ammo has a matching launcher.

## Port Notes

- `f` with quivered gem-class sling ammo and no launcher now treats monsters as impact targets instead of simply landing the object.
- The no-sling path reuses the direct thrown-gem behavior for unicorn catches, rock-passer harmless stone missiles, ordinary gem hit/miss messages, wake/anger effects, hit-only mulch, and hard-landing rolls.
- Matching-sling monster combat remains separate; this slice only covers the no-launcher by-hand path.

## Tests

- `f command no-sling glass gem hits monster by hand`
- `f command no-sling known glass gem to unicorn is rejected as junk and lands`

## Remaining Follow-Ups

- True slung rock/gem monster hits for `f` and direct `t` are covered by audit 685.
- Object/furniture mimic reveal is covered by audit 738, and poisoned ammo effects are covered by audits 687 and 739. Lethal projectile cleanup remains a separate `thitmonst()`/`hmon()` slice.
