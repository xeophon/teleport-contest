# Chat Race-Family Undead Sound Precedence

Date: 2026-06-04

## Summary

Fixed generated kobold/gnome/orc mummy and zombie chat sound precedence. C stores the sound on the concrete monster row: these mummies are `MS_SILENT`, and these zombies are `MS_GROAN`. JS was inferring broad kobold/gnome/orc family `MS_ORC` before generated silent/zombie sound inference, so generated race-family zombies could grunt instead of using the C groan branch.

## Upstream source anchors

- `nethack-c/upstream/include/monflag.h:11`: `MS_SILENT`, `MS_ORC`, and `MS_GROAN` are distinct sound values.
- `nethack-c/upstream/include/mondata.h:62`: `is_silent()` checks `ptr->msound == MS_SILENT`.
- `nethack-c/upstream/src/sounds.c:688` through `:693`: `domonnoise()` returns early for silent non-shopkeeper monsters.
- `nethack-c/upstream/src/sounds.c:705` through `:709`: `MS_ORC` can remap to humanoid only after the concrete `msound` is already selected.
- `nethack-c/upstream/src/sounds.c:941` through `:945`: `MS_GROAN` uses `!rn2(3)` to optionally print `groans.`.
- `nethack-c/upstream/src/sounds.c:987` through `:989`: `MS_ORC` prints `grunts.`.
- `nethack-c/upstream/include/monsters.h:1901`, `:1909`, and `:1917`: kobold, gnome, and orc mummies use `MS_SILENT`.
- `nethack-c/upstream/include/monsters.h:2421`, `:2429`, and `:2437`: kobold, gnome, and orc zombies use `MS_GROAN`.

## JS changes

- `js/cmd.js`
  - Moved generated monster sound inference before broad kobold/gnome/orc family sound inference in `tipHatMonsterSound()`.
  - Moved the zombie groan fallback before broad race-family `MS_ORC` inference, while keeping explicit named special cases such as skeleton bones ahead of the broad zombie fallback.
  - Kept explicit `msound`/`sound`, shopkeeper, priest, and nemesis handling ahead of generated inference.

## Tests

- `chat with visible generated race-family mummies stay silent before orc fallback` covers kobold, gnome, and orc mummies: no message, no turn, no RNG, and no grunt fallback.
- `chat with visible generated race-family zombies groan before orc fallback` covers kobold, gnome, and orc zombies with `rn2(3)=0`: visible groan message, turn consumed, and no grunt fallback.
- `chat with visible generated race-family zombie silent groan roll still consumes turn` covers `rn2(3)!=0`: no message, turn consumed, and no fallback response.
- The focused run also included existing generated gnome and generated silent rock mole canaries to guard legitimate `MS_ORC` and silent behavior.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern="race-family mummies|race-family zombies|race-family zombie silent|generated-sound gnome|visible generated silent rock mole" test/shop-billing-helpers.test.mjs` - 6 pass, 1506 skipped
- `node --test --test-name-pattern="race-family mummies|race-family zombies|race-family zombie silent|generated-sound gnome|visible generated silent rock mole|skeleton bones rattle" test/shop-billing-helpers.test.mjs` - 7 pass, 1505 skipped
- `node --test test/shop-billing-helpers.test.mjs` - 1512 pass
- `node --test test/*.mjs` - 1654 pass
- `npm run score` - 44/44 passing

## Remaining gaps

- Generated monster metadata still does not emit a general `msound` field; this slice only corrects the local sound inference order.
- Broader `domonnoise()`/direct `#chat` unification remains open.
