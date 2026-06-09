# Lava Wizard/Explore Refusal

Date: 2026-06-09

## C Reference

- `nethack-c/upstream/include/flag.h:29` and `nethack-c/upstream/include/flag.h:32` map wizard mode to `flags.debug` and explore/discovery mode to `flags.explore`.
- `nethack-c/upstream/src/trap.c:6881` treats `Lifesaved || discover` as local fatal-lava survival, then `nethack-c/upstream/src/trap.c:6882` forces survival for wizard mode so inventory burn messages use survivor wording before `done(BURNING)`.
- `nethack-c/upstream/src/trap.c:6933` through `nethack-c/upstream/src/trap.c:6936` print `You burn to a crisp...`, call `done(BURNING)`, then try `safe_teleds(TELEDS_ALLOW_DRAG | TELEDS_TELEPORT)` only if death handling returns.
- `nethack-c/upstream/src/end.c:1104` through `nethack-c/upstream/src/end.c:1115` implement the wizard/explore `Die?` refusal, print `OK, so you don't die.`, and call `savelife()`.
- `nethack-c/upstream/src/end.c:704` through `nethack-c/upstream/src/end.c:737` restore HP, suppress further current-turn movement, and clear `TT_LAVA` traps during `savelife()`.
- `nethack-c/upstream/src/trap.c:7011` through `nethack-c/upstream/src/trap.c:7021` handle lava countdown death with `done(DISSOLVED)`, then reset the lava trap and safe-teleport unless levitation or flight have become active.

## JS Parity Slice

- Keeps ordinary unrecovered molten-lava deaths on the special `lavaDeathMore` first-More path.
- After `lavaDeathMore` is dismissed in wizard/explore mode, enters the shared `wizardDieConfirm` prompt instead of jumping straight to death disclosure.
- Widens fatal lava inventory burn messaging so wizard/explore fatal lava uses the same survivor summary wording as C before `You burn to a crisp...`.
- Marks lava countdown deaths for wizard/explore refusal cleanup before they enter the generic `deathDieMore` flow.
- Extends declined `wizardDieConfirm` lava survival to clear `TT_LAVA` trap state and run the same-level safe relocation used by the life-saving lava continuation.
- Clears pending lava-refusal state when the player confirms death at `Die?`.

## Tests

- `explore m-prefix fatal lava reports survivor inventory burn before prompt`
- `explore m-prefix fatal lava prompts and decline teleports to safety`
- `explore lava-trapped countdown death decline clears trap and teleports`
- Updated `successful centaur polyself losing water walking boots over lava burns before drop` to cover wizard-mode refusal after the lava first-More.

Verification:

```sh
node --test --test-reporter=dot --test-name-pattern "explore m-prefix fatal lava prompts and decline teleports to safety|explore m-prefix fatal lava reports survivor inventory burn before prompt|explore lava-trapped countdown death decline clears trap and teleports|m-prefix fatal lava consumes life saving and teleports to safety|m-prefix fatal lava burns initial non-survivor organic and potion inventory|already lava-trapped hero dies when sinking countdown expires|already lava-trapped countdown death uses life saving and safe teleport" test/shop-billing-helpers.test.mjs
node --test --test-reporter=dot --test-name-pattern "lava|LAVA" test/shop-billing-helpers.test.mjs
git diff --check
node --test --test-reporter=dot test/shop-billing-helpers.test.mjs
```

Result: focused lava refusal/life-saving set passed; broader lava-name slice passed; `git diff --check` passed; full `test/shop-billing-helpers.test.mjs` passed.

## Remaining Gaps

- Failed `safe_teleds()` countermeasures after repeated lava rescue are not modeled.
- Direct fatal lava rescue still uses the shared same-level teleport helper rather than modeling C's suppressed landing `spoteffects(TRUE)` followed by manual `spoteffects(FALSE)` in detail.
- Generic `fireDamageInventory()` still lacks C's fire inventory resistance chance.
- Generic `fireDamageInventory()` still uses full selected `in_use` stack quantity instead of subtracting one first.
- Potion vapor effects still happen before the destruction message in the JS generic helper.
- Fatal lava hard `obj_resists(obj, 0, 0)` RNG consumption and wand/fire-horn exemption parity are still incomplete.
