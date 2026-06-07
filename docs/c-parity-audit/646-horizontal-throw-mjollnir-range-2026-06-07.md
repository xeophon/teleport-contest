# 646 - Horizontal Throw Mjollnir Range

## C Source

- `nethack-c/upstream/src/dothrow.c:30-34` includes wielded Valkyrie Mjollnir in `AutoReturn()`.
- `nethack-c/upstream/src/dothrow.c:122-130` rejects Mjollnir unless it is wielded and the hero has `STR19(25)` strength.
- `nethack-c/upstream/src/attrib.c:1244-1262` condenses encoded strength values for `ACURRSTR`, mapping `STR19(25)` to ordinary formula strength 25.
- `nethack-c/upstream/src/dothrow.c:1613-1633` computes horizontal throw range from condensed strength and object weight, clamped to at least one.
- `nethack-c/upstream/src/dothrow.c:1650-1658` applies the air/levitation recoil split before special range overrides.
- `nethack-c/upstream/src/dothrow.c:1660-1663` applies the Mjollnir range cap as `(range + 1) / 2`, after boulder handling and after any air split.

## Port Notes

- Direct hero `t` throws now share a C-shaped strength/weight range helper for ammo range, air split range, and the Mjollnir normal-ground range cap.
- Mjollnir throws now enforce the C preflight gates: the artifact must be the primary wielded weapon and the hero must have encoded maximum strength.
- Direct horizontal Mjollnir flight now applies the C heavy-artifact range cap on normal ground and after the air/levitation split, while underwater remains the final range-one override.
- Wielded Valkyrie Mjollnir is now eligible for the same generic returning-object branch used by other C `AutoReturn()` direct throws.

## Tests

- `hero-thrown wielded Mjollnir uses C heavy artifact range cap`
- `hero-thrown Mjollnir must be wielded before throwing`
- `hero-thrown wielded Mjollnir requires C maximum strength`
- Focused verification: `node --test --test-reporter=dot --test-name-pattern="Mjollnir|unmatched crossbow bolt|arrow with matching bow|loose heavy iron ball" test/shop-billing-helpers.test.mjs`

## Remaining Follow-Ups

- Broader non-ammo normal-ground strength/weight range is still separate; heavy crystal armor and other large objects need their own coverage before replacing the fixed ordinary fallback.
- Boulder range 20 on normal ground, attached ball caps, buried-ball behavior, and full ball-and-chain landing/recoil fallout remain separate slices.
- Dedicated Valkyrie Mjollnir return-message and failed-catch canaries remain open; this slice only makes the object eligible for the existing generic return branch.
