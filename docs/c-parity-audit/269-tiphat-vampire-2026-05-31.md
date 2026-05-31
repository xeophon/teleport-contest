# C Parity Audit 269: Tiphat Vampire Speech

## Sources

- `nethack-c/upstream/include/monflag.h:47`: `MS_VAMPIRE` is the vampire speech sound.
- `nethack-c/upstream/include/monsters.h:2281-2306`: ordinary vampires and vampire leaders use `MS_VAMPIRE` and `M1_HUMANOID`.
- `nethack-c/upstream/include/monsters.h:2313-2324`: Vlad also uses `MS_VAMPIRE` and `M1_HUMANOID`.
- `nethack-c/upstream/src/sounds.c:744-822`: `MS_VAMPIRE` selects speech by tameness, peacefulness, hero form, and time.
- `nethack-c/upstream/src/sounds.c:759-784`: ordinary-hero tame and peaceful vampire speech is deterministic and uses no RNG.
- `nethack-c/upstream/src/calendar.c:215-226`: night is hour `< 6 || > 21`; midnight is hour `== 0`.
- `nethack-c/upstream/src/sounds.c:1506-1528`: visible humanoids are intercepted before `domonnoise()`, so directed `#tip` reaches vampire speech mainly for adjacent non-visible responsive vampires.

## JS Coverage

- `tipHatMonsterSound()` now infers `vampire` for vampire own-form names, including vampire lord/lady/leader/mage and Vlad.
- Explicit `MS_VAMPIRE` continues to flow through existing `MS_` sound normalization.
- `tipHatMonsterHumanoid()` treats vampire own-form names as humanoid so visible directed `#tip` stays on the C visible humanoid branch before vampire speech.
- `tipHatMonsterNoise()` implements the deterministic ordinary-hero vampire speech:
  - peaceful non-tame: `"I only drink... potions."`,
  - tame day: `"I find myself growing a little weary."`,
  - tame night: `"I beg you, help me satisfy this growing craving!"`,
  - tame midnight: `"I can stand this craving no longer!"`.
- The branch also handles deterministic vampire-kindred and wolf-form peaceful/tame variants, but hostile vampire RNG remains deferred.

## Tests

Focused canaries in `test/shop-billing-helpers.test.mjs` cover:

- explicit peaceful invisible `MS_VAMPIRE` speech without RNG,
- inferred peaceful invisible vampire lord speech without RNG,
- tame invisible vampire day, night, and midnight ordinary-hero speech without RNG,
- visible vampires staying on the visible humanoid response branch before vampire speech.

## Remaining Gaps

- Hostile ordinary vampire speech still needs the C `rn2(SIZE(vampmsg))` branch and body-part/race formatting.
- Broader shared `domonnoise()` and `#chat` are still not unified with directed helmet tipping.
- Shopkeeper `MS_SELL`, quest leaders/nemeses/guardians, priests, Oracle, seduction, bribe speech, and Death-specific Rider speech remain separate gaps.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "worn helmet tip (makes peaceful invisible explicit vampire|infers peaceful invisible vampire lord|makes tame invisible vampire use day night and midnight|keeps visible vampire|makes invisible explicit non-Death Rider|infers invisible Famine rider)" test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1254/1254` tests passed)
- `node --test test/*.mjs` (`1351/1351` tests passed)
- `npm run score` (`44/44` replay sessions passed)
