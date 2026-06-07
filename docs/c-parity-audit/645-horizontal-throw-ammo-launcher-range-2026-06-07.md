# 645 - Horizontal Throw Ammo Launcher Range

## C Source

- `nethack-c/upstream/src/dothrow.c:1613-1616` computes the ordinary horizontal throw base range from strength, except matched crossbow shots use fixed strength-equivalent 18.
- `nethack-c/upstream/src/dothrow.c:1622-1633` subtracts object weight and clamps the pre-ammo range to at least one.
- `nethack-c/upstream/src/dothrow.c:1635-1648` applies `is_ammo()` adjustments: matched crossbow bolts use `BOLT_LIM`, matched non-crossbow ammo increments range, and unmatched non-gem ammo halves range and prints the no-launcher warning.
- `nethack-c/upstream/src/dothrow.c:1650-1658` applies air/levitation recoil splitting after the ammo adjustment.
- `nethack-c/upstream/include/obj.h:235-242` defines `is_launcher`, `is_ammo`, `matching_launcher`, and `ammo_and_launcher` by weapon skill sign.
- `nethack-c/upstream/include/objects.h:141-155` defines arrows/ya as bow ammo and crossbow bolts as crossbow ammo.
- `nethack-c/upstream/include/objects.h:1515-1521` defines gem-class stones and gems as sling ammo.
- `nethack-c/upstream/src/weapon.c:111-126` provides the warning nouns used by `weapon_descr()`: sling ammo as stone/gem, bow ammo as arrow, and crossbow ammo as bolt.

## Port Notes

- Direct hero `t` throws now classify C-style launcher ammo from object kind/class for bow ammo, crossbow bolts, and matched sling ammo.
- Wielded launcher matching uses the current weapon only, matching C `uwep` behavior; having an unwielded launcher in inventory does not avoid the unmatched-ammo path.
- Direct `t` throw range now applies C ammo adjustments on normal ground and before the air/levitation split for matched crossbow bolts, matched bow/sling ammo, and unmatched non-gem ammo.
- The old JS warning only handled arrows without a bow. The warning now follows C's unmatched non-gem ammo condition and uses crossbow bolt wording as `bolt`.

## Tests

- `levitating hero-thrown arrow with matching bow uses C ammo range increment`
- `hero-thrown unmatched crossbow bolt uses C half range and warning`
- Focused verification: `node --test --test-name-pattern='(?:levitating hero-thrown arrow with matching bow uses C ammo range increment|hero-thrown unmatched crossbow bolt uses C half range and warning)' test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Audit 680 covers the separate `f` command path for launcher matching, range, by-hand unmatched ammo warning, zero-range, and air/levitation recoil. Fired-projectile combat and broader fireassist details remain separate.
- Multishot, explicit count caps, launcher auto-selection, and launcher-ammo mismatch handling remain outside this direct-throw range slice.
- Unmatched gem-class sling ammo range is still left on the existing stone/gem projectile path until the broader direct stone/gem range can be moved with its current coverage.
- Broader non-ammo normal-ground strength/weight range, Mjollnir, full `hurtle_step()`, and full ball-and-chain details remain separate follow-ups.
