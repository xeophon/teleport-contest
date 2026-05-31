# C Parity Audit 291: Tiphat Priest Speech

## Sources

- `nethack-c/upstream/include/monflag.h:56`: `MS_PRIEST` is the aligned-priest contribution/cleansing sound.
- `nethack-c/upstream/include/monsters.h:2749-2766`: aligned clerics and high clerics use `MS_PRIEST`.
- `nethack-c/upstream/src/sounds.c:688-726`: `domonnoise()` routes `MS_PRIEST` to `priest_talk()`.
- `nethack-c/upstream/src/sounds.c:1506-1526`: directed helmet `#tip` keeps visible humanoid responses before `domonnoise()`; only adjacent non-visible responders reach priest speech.
- `nethack-c/upstream/src/priest.c:161-170` and `nethack-c/upstream/src/priest.c:375-386`: `inhistemple()` requires the priest's own temple room and an intact aligned shrine.
- `nethack-c/upstream/src/priest.c:558-627`: prompt-free `priest_talk()` gates cover fleeing priests, not-in-temple/hostile cranky speech, and no-gold poverty/not-interested outcomes.
- `nethack-c/upstream/src/priest.c:630-654`: donation starts after hero gold is present and consumes `rn1(101, 150 + cheapskate * 40)` before prompting through `bribe()`.

## JS Changes

- `tipHatMonsterSound()` now infers generated priest monsters as `priest`, while explicit `MS_PRIEST` still normalizes through the existing `MS_` path.
- Added a local `tipHatPriestNoise()` path for adjacent invisible directed helmet tipping:
  - increments the gnostic conduct marker when a priest is consulted,
  - handles fleeing priests with no RNG and turns them hostile,
  - verifies own-temple shrine state with the same room/altar/alignment shape used by existing temple code,
  - uses the C three-line cranky table with `rn2(3)` for out-of-temple/hostile priests,
  - handles no-gold coaligned poverty sermon, ale-money transfer, and cross-aligned/strayed uninterested output with no RNG,
  - records the C-shaped contribution suggestion and prompt metadata when hero gold is present, without implementing full donation side effects in this slice.
- Preserved visible priest precedence: visible peaceful priests still wave/tip helmets, and visible hostile priests still use the rude humanoid response.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `worn helmet tip makes fleeing invisible priest reject attention without RNG`
- `worn helmet tip infers coaligned invisible temple priest poverty sermon without RNG`
- `worn helmet tip makes coaligned invisible temple priest give ale money without RNG`
- `worn helmet tip makes cross-aligned invisible temple priest uninterested without RNG`
- `worn helmet tip makes invisible priest outside own temple use C cranky table`

The tests use a small temple fixture layered onto the existing invisible `#tip` harness and assert RNG call shapes rather than seed-specific outputs except where the C branch itself requires `rn2(3)`.

## Remaining Gaps

- Full priest donation prompts, offer handling, cheapskate increments, clairvoyance/protection rewards, and alignment repair remain broader work.
- Broader non-priest `#chat` still has its separate local implementation instead of a shared `domonnoise()`-style speaker path.
- Helpless priest wake-up is C `#chat`/direct `domonnoise()` behavior; directed `#tip` filters helpless targets before speech.
- Ambient temple intoning and entry messages remain separate from this directed `#tip` slice.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern='priest' test/shop-billing-helpers.test.mjs` (`5` matching tests passed)
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.test.mjs`
- `npm run score` (`44/44` replay sessions passed)
