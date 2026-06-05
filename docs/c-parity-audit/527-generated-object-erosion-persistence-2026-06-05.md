# Generated Object Erosion Persistence

## Scope

Persist the erosion state already rolled by the JS `mksobj()` factory helper. This follows from the dart-trap generated-dart work in audit 526: trap darts were generated with the correct RNG shape, enchantment, blessing, and poison state, but the factory erosion rolls were still only RNG sinks.

## C Reference

- `nethack-c/upstream/src/mkobj.c:177` `may_generate_eroded()` skips initial hero inventory when `moves <= 1 && !in_mklev`, already-proofed objects, non-erodable objects, worm teeth, unicorn horns, and artifacts.
- `nethack-c/upstream/src/mkobj.c:196` `mkobj_erosions()` rolls proof first with `rn2(100)`.
- `nethack-c/upstream/src/mkobj.c:205` primary damage uses `rn2(80)`, then repeated `rn2(9)` increments up to level 3.
- `nethack-c/upstream/src/mkobj.c:211` secondary damage uses the same shape after the primary roll.
- `nethack-c/upstream/src/mkobj.c:219` greasing is independent and rolls last with `rn2(1000)`, including for generated erodeproof objects.
- `nethack-c/upstream/src/mkobj.c:1172` runs `mkobj_erosions()` at the end of initialized object creation.

## JS Change

- `js/mklev.js` now writes `oerodeproof`, `oeroded`, `oeroded2`, and `greased` in `mkobj_erosion_rolls()`.
- The existing startup/mklev gate, artifact skip, and JS primary/secondary material gates are preserved.
- Existing no-object call sites remain RNG sinks: they still consume the same generated-object erosion RNG without writing fields.
- Already erodeproof objects now skip the generated erosion path, matching the C `may_generate_eroded()` gate.

## Tests

- `generated trap dart persists erosion counters after first move`
- `generated trap dart can be erodeproof and greased without damage rolls`
- `generated weapon-class dart carries persisted non-erosion roll state`
- `generated non-erodible weapon-class ammo skips erosion rolls`

The tests assert factory object fields and RNG call names only. They do not depend on replay maps, hidden tests, seeds, or trap-specific runtime shortcuts.

## Remaining Work

The JS helper still relies on the existing `_erosion_primary` and `_erosion_secondary` metadata rather than a complete object-material registry. That is acceptable for this slice because it preserves the current RNG entry points while making their rolled state observable, but a later material-registry pass can replace those ad hoc gates with broader C-style `is_flammable()`, `is_rustprone()`, `is_crackable()`, `is_rottable()`, and `is_corrodeable()` coverage.
