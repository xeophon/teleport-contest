# C Parity Audit 779: Direct Melee AD_ENCH Glove Fallback

## C Source Anchors

- `nethack-c/upstream/include/monsters.h:2157`: disenchanters include passive `AT_NONE/AD_ENCH`.
- `nethack-c/upstream/src/uhitm.c:786-789`: direct hero melee calls `passive(mon, uwep, ...)` after a successful weapon attack.
- `nethack-c/upstream/src/uhitm.c:5992-6010`: `AD_ENCH` passive handling reaches `passive_obj()` for direct melee hits.
- `nethack-c/upstream/src/uhitm.c:6127-6140`: `passive_obj()` falls back to `uarmg` when no object is supplied for `AD_ENCH`.
- `nethack-c/upstream/src/uhitm.c:6179-6184`: cancelled disenchanters skip the drain, and successful carried armor drains print the "less effective" feedback.
- `nethack-c/upstream/src/zap.c:1382-1409`: `drain_item()` positive-`spe` eligibility, object-resistance RNG, shop billing, and enchantment decrement.

## JS Parity Notes

- `js/cmd.js:31891-31904` already routes direct melee passive-object handling through `weapon || wornGlovesItem()` for `AD_ENCH`.
- The wrapper preserves C's cancelled-monster guard before calling `drainItem()`.
- Bare-handed direct melee without worn gloves supplies no passive object, so it consumes no `rn2(100)` resistance roll and produces no drain, billing, or feedback message.

## Tests Added

Added focused command-path coverage in `test/shop-billing-helpers.test.mjs`:

- `direct hero melee bare-handed disenchanter drains worn gloves`
- `direct hero melee bare-handed disenchanter without gloves skips passive drain`
- `direct hero melee bare-handed cancelled disenchanter skips worn glove drain`

The covered assertions include worn-glove `spe--`, used-up shop billing, worn-state retention, "less effective" feedback, no weapon-conduct hit, cancelled-disenchanter suppression, and no resistance RNG when no object is eligible.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=spec --test-name-pattern "bare-handed disenchanter|against disenchanter drains unpaid enchanted weapon|miss skips disenchanter drain|plus-zero weapon hits disenchanter|respects cancelled disenchanter" test/shop-billing-helpers.test.mjs` - 7 pass, 2757 skipped
- `git diff --check`
- `node --test --test-reporter=dot test/*.mjs`
- `npm run score` - 44/44 passing
