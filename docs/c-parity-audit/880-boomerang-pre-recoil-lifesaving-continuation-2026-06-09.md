# Boomerang Pre-Recoil Lifesaving Continuation

## C anchors

- `nethack-c/upstream/src/dothrow.c:1601` through `:1605` handle non-underwater boomerangs: on Air or levitation, `hurtle(-u.dx, -u.dy, 1, TRUE)` runs before `boomhit(obj, u.dx, u.dy)`.
- `nethack-c/upstream/src/dothrow.c:1078` through `:1125` print `You float in the opposite direction.` for range-one recoil, then walk the recoil path through `hurtle_step()`.
- `nethack-c/upstream/src/dothrow.c:803` through `:837` print obstacle collision messages, roll `rnd(2 + *range)`, call `losehp(Maybe_Half_Phys(dmg), why, KILLED_BY)`, wake nearby monsters, and stop the recoil at the prior square.
- `nethack-c/upstream/src/hack.c:4279` through `:4288` route lethal recoil through `You die...` and `done(DIED)`.
- `nethack-c/upstream/src/end.c:1081` through `:1119` let amulet life saving print the medallion recovery messages, clear the killer, and return to the caller, so saved boomerang pre-recoil resumes into `boomhit()`.
- `nethack-c/upstream/src/zap.c:4202` through `:4212` show the resumed boomerang catch branch: failed catch can self-hit, while successful catch exercises Dexterity and prints `You skillfully catch the boomerang.`

## JS parity

- The boomerang pre-recoil branch now calls `heroHorizontalThrowRecoilResult(dir, 1)` instead of the message-only `heroHorizontalThrowRecoil()` wrapper, preserving fatal/life-saving `trapResult`.
- No-save fatal pre-recoil now sets the recoil death message and applies `deathDieMore` before `heroThrownBoomerangFlightResult()` runs, so no boomerang-path hit/catch/landing RNG is consumed.
- Life-saving pre-recoil now queues a one-shot boomerang continuation and returns through `lifeSavingMore`. After the medallion recovery line, the continuation re-enters the existing throw-direction path with pre-recoil skipped exactly once, letting the curved boomerang path run from the post-recoil hero position.
- The caught-boomerang early return now preserves pre-recoil More state when present.

## Canaries

- `levitating hero-thrown boomerang pre-recoil boulder collision can kill before boomhit` covers fatal range-one recoil into a boulder, death cause `bumping into a boulder`, nearby wake side effect, no boomerang impact/catch text, and no curved-flight RNG after the recoil death.
- `levitating hero-thrown boomerang pre-recoil boulder collision life saving continues into catch` covers the same recoil with a worn amulet, initial `lifeSavingMore`, medallion consumption, post-More continuation into `You skillfully catch the boomerang.`, final HP/death-state cleanup, and C-shaped catch RNG after the life-saving prompt.

## Remaining follow-up

- This slice covers boomerang pre-recoil obstacle death and life saving. Broader boomerang parity still has older gaps outside this slice, including detailed `boomhit()` path animation and less-common terrain/visibility cases.

## Verification

- `node --check js/cmd.js` (passed)
- `node --check test/shop-billing-helpers.test.mjs` (passed)
- `node --test --test-reporter=spec --test-name-pattern "levitating hero-thrown boomerang recoils before curved flight hits target|levitating hero-thrown boomerang pre-recoil boulder collision" test/shop-billing-helpers.test.mjs` (`3` matching tests passed)
- `node --test --test-reporter=dot --test-name-pattern "boomerang" test/shop-billing-helpers.test.mjs` (`13` matching tests passed)
- `node --test --test-reporter=dot test/shop-billing-helpers.test.mjs` (`2980` tests passed)
- `npm run score` (`44/44` frozen sessions passing)
- `git diff --check` (passed)
