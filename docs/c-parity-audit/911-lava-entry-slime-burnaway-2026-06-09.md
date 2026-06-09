# Lava Entry Slime Burn-Away

Date: 2026-06-09

## C Reference

- `nethack-c/upstream/src/trap.c:6800` rolls lava entry damage at the start of `lava_effects()`.
- `nethack-c/upstream/src/trap.c:6807` calls `burn_away_slime()` before `likes_lava()` and before the fire-resistance/water-walking survival decision.
- `nethack-c/upstream/src/trap.c:6811` computes the lava survival branch after slime has already been burned away.

## JS Parity Slice

- Added `burnAwayHeroSlime(messages)` to `heroLavaEntryEffect()` immediately after the lava entry damage roll.
- Reused the existing helper so `_slimingTimeout`, `sliming`, `slimed`, and `Slime`/`Slimed` status suffixes clear consistently with other fire paths.
- Preserved ordering before boot burn, fatal inventory burn, water-walking burn, and fire-resistant sink messages.

## Tests

- `m-prefix into lava burns away slime before fire-resistant sink message`

Verification:

```sh
node --test --test-name-pattern "m-prefix into lava (burns away slime|sinks fire-resistant|burns non-fireproof water walking boots)|m-prefix fatal lava burns initial non-survivor|m-prefix lava does not whole-burn" test/shop-billing-helpers.test.mjs
node --test test/shop-billing-helpers.test.mjs
```

Result: 3104 passing tests.

## Remaining Gaps

- Lava entry still does not route life-saving, explore/wizard continuation, rescue teleport, or follow-up `spoteffects(FALSE)`.
- Fire-resistant and water-walking survivor `burn_stuff` inventory fire parity is still incomplete.
- `sink_into_lava()` countdown death still lacks life-saving and rescue teleport continuation.
