# C Parity Audit 250: Tiphat Animal Hunger Moon

## Sources

- `nethack-c/upstream/src/calendar.c:215-220`: `night()` is true before 06:00 and after 21:00.
- `nethack-c/upstream/src/sounds.c:837-854`: `MS_BARK` howls during full-moon night, tame distressed or hungry dogs whine, very full tame dogs yip, and peaceful dingos do not actually bark.
- `nethack-c/upstream/src/sounds.c:855-870`: tame `MS_MEW` responders yowl when distressed or low-tame, meow when hungry, purr when very full, and otherwise mew.
- `nethack-c/upstream/src/sounds.c:1222`: animal noise messages are emitted as `Monnam(mtmp)` plus the selected `pline_msg`.
- `nethack-c/upstream/src/sounds.c:1503,1526-1528`: `tiphat()` clears wait strategy before adjacent `domonnoise()` and treats a successful no-message `domonnoise()` as the response path rather than falling back to generic nonresponse.

## JS Changes

- Added `tipHatIsNight()` for the local `tiphat()` animal-noise helper, using explicit testable hour/night state and the current game datetime.
- Added `tipHatMonsterHungryTime()` to read pet hunger time from direct fields, `edog`, or `mextra.edog`.
- Extended local `MS_BARK` handling for full-moon night howling, tame hungry whines, very full tame yips, and peaceful dingo no-bark.
- Extended local `MS_MEW` handling for tame hungry meows and very full purrs while preserving yowl and ordinary mew branches.
- Reused the same hunger-time reader for equine `MS_NEIGH` whinny/whicker selection.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `worn helmet tip makes dog howl on full moon at night`
- `worn helmet tip at peaceful dingo consumes silent no-bark response`
- `worn helmet tip makes hungry tame dog whine`
- `worn helmet tip makes well-fed tame dog yip`
- `worn helmet tip uses tame cat hunger and satiety noises`

## Remaining Gaps

- The helper remains `tiphat()`-local and still does not replace full shared `domonnoise()`/`#chat` behavior.
- Shopkeeper, priest, quest, vampire, werecreature, Rider, Oracle, wake/aggravate, squawk, bellow-promotion, random laugh/groan, and hallucinated gecko branches remain open.
- Invisible no-message responder mapping before silent/peaceful no-sound branches remains open outside the covered dingo visible path.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "worn helmet tip|remembered invisible marker" test/shop-billing-helpers.test.mjs` (`21` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1185/1185` tests passed)
- `node --test test/*.mjs` (`1282/1282` tests passed)
- `npm run score` (`44/44` replay sessions passed)
