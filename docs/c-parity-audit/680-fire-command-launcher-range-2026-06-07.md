# 680 - Fire Command Launcher Range

## C Source

- `nethack-c/upstream/src/cmd.c:1724` maps `f` to `dofire()`.
- `nethack-c/upstream/src/dothrow.c:467-582` selects the quivered object, uses fireassist only for matching launchers, and then calls the same `throw_obj()` route used by `t`.
- `nethack-c/upstream/src/dothrow.c:557-571` only keeps or swaps to a launcher when `ammo_and_launcher()` matches the quivered ammo.
- `nethack-c/upstream/include/obj.h:235-244` defines `is_launcher()`, `is_ammo()`, `matching_launcher()`, and `ammo_and_launcher()` through weapon skill sign matching.
- `nethack-c/upstream/src/dothrow.c:1613-1648` computes base range, applies matched bow/crossbow ammo adjustments, and halves unmatched non-gem ammo without reclamping after the half.
- `nethack-c/upstream/src/dothrow.c:1650-1682` applies the air/levitation split after ammo adjustment, runs `bhit()` from the pre-recoil hero square, then calls `hurtle()`.
- `nethack-c/upstream/src/zap.c:3851-3870` starts thrown-weapon `bhit()` at the hero square and advances only while `range-- > 0`, preserving the ordinary-ground zero-range unmatched ammo case.

## Port Notes

- `f` command horizontal landing now uses the existing C-shaped hero throw range helpers instead of a fixed three-square shortcut.
- Matched bow ammo gains the same range increment through `f` as through `t`; matched crossbow bolts inherit the existing `BOLT_LIM` path.
- Air and levitation `f` shots now compute projectile flight from the pre-recoil hero square and apply recoil after the range split.
- `f` launcher selection now requires ammo/launcher skill matching; mismatched launcher-looking objects no longer make the action count as shooting.
- Crossbow bolts are now recognized as projectile items so readied bolts can take the same by-hand or launcher path as C.
- Launcher classification now excludes launcher ammo, preventing a crossbow bolt from being treated as its own crossbow.
- Unmatched non-gem ammo fired with `f` now uses the same C by-hand warning and half/zero range as direct `t` throws.

## Tests

- `f command arrow with matching bow uses C ammo range increment`
- `levitating f command arrow with matching bow uses C air split recoil`
- `f command unmatched crossbow bolt uses C half range and warning`
- `weak f command unmatched crossbow bolt uses C zero range and warning`
- Existing direct-throw canaries rerun for helper compatibility:
  - `levitating hero-thrown arrow with matching bow uses C ammo range increment`
  - `hero-thrown unmatched crossbow bolt uses C half range and warning`
  - `weak hero-thrown unmatched crossbow bolt uses C zero range and warning`
  - `hero-thrown heavy ordinary weapon uses C weight range on normal ground`

## Remaining Follow-Ups

- Audit 701 covers the first empty-quiver prompt and `autoquiver()` ranking slice.
- Audit 702 covers the first wielded-polearm empty-quiver fallback and ordinary monster hit slice.
- Audits 704, 705, and 706 cover the bullwhip fallback, alternate-polearm swap, and reachable-polearm priority slices; the exact queued swap/wield/retry command lifecycle remains broader work.
- Audit 681 covers the first single-shot fired launcher-ammo monster hit/miss path, including quiet single-shot messages and fired-ammo strength suppression.
- Full fired-projectile combat parity still needs C multishot, fireassist count handling, by-hand unmatched ammo monster hits, slung ammo variants, and broader adjacent/intervening hit handling routed through the shared hero projectile combat path.
