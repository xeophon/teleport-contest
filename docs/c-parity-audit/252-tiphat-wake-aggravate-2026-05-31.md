# C Parity Audit 252: Tiphat Wake Aggravate

## Sources

- `nethack-c/upstream/src/sounds.c:688-693`: `domonnoise()` returns early when the hero is deaf or the monster is silent.
- `nethack-c/upstream/src/sounds.c:719-720`: unseen responders are mapped before the sound-specific switch runs.
- `nethack-c/upstream/src/sounds.c:955-963`: `MS_TRUMPET` reports `trumpets!` and calls `wake_nearto(mtmp->mx, mtmp->my, 11 * 11)`; `MS_SHRIEK` reports `shrieks.` and calls `aggravate()`.
- `nethack-c/upstream/src/sounds.c:1222-1223`: `pline_msg` is emitted after the switch with `Monnam(mtmp)` prepended, so wake messages can precede the trumpet line.
- `nethack-c/upstream/src/sounds.c:1503,1526-1533`: directed `tiphat()` clears wait strategy before adjacent `domonnoise()`, treats truthy `domonnoise()` as the response path, and otherwise falls through to visible nonresponse or `Nothing happens.`
- `nethack-c/upstream/src/mon.c:4322-4328`: waking a visible sleeping monster emits `wakes up.` with the flesh-golem suffix.
- `nethack-c/upstream/src/mon.c:4378-4405`: `wake_nearto()` wakes monsters with `dist2 < distance`, clears non-unique wait strategy, and disturbs buried zombies near the wake origin.
- `nethack-c/upstream/src/wizard.c:493-508`: `aggravate()` wakes eligible monsters, clears `STRAT_WAITFORU | STRAT_APPEARMSG`, and has a one-in-five chance to unfreeze immobile monsters.
- `nethack-c/upstream/include/monsters.h:838-842,878-882`: mumaks and mastodons use `MS_TRUMPET`.
- `nethack-c/upstream/include/monsters.h:1660-1663`: shriekers use `MS_SHRIEK`.

## JS Changes

- Added local `tiphat()` sound inference for shriekers, mumaks, and mastodons so source-backed fixtures do not need explicit `msound`.
- Added local `MS_TRUMPET` handling that wakes monsters with the C strict `< 11 * 11` radius, emits visible wake messages before the trumpet text, clears non-unique wait strategy, and disturbs nearby buried zombie corpse timers.
- Added local `MS_SHRIEK` handling that wakes current-level monsters, clears the C wait and appear-message strategy bits, and preserves the one-in-five thaw chance for immobile monsters.
- Kept the deaf early-return path shaped like C: the adjacent target's wait strategy is still prodded by `tiphat()`, but the shrieker does not aggravate bystanders.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- `worn helmet tip trumpet wakes nearby sleepers only`
- `worn helmet tip shriek aggravates sleepers globally`
- `deaf worn helmet tip at shrieker does not aggravate sleepers`

## Remaining Gaps

- The helper remains `tiphat()`-local and still does not replace full shared `domonnoise()`/`#chat` behavior.
- The local aggravate helper operates over current level monsters; broader dungeon partition modeling such as the Wizard Tower split remains outside this slice.
- Focused laugh and groan canaries are covered by `docs/c-parity-audit/253-tiphat-laugh-groan-2026-05-31.md`.
- Broader shopkeeper, priest, quest, vampire, werecreature, Rider, Oracle, and hallucinated gecko branches remain open.
- Generic monster-data `msound` generation remains incomplete; this slice only adds narrow source-backed name fallbacks for covered species.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "worn helmet tip|deaf worn helmet tip" test/shop-billing-helpers.test.mjs` (`31` matching tests passed)
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1196/1196` tests passed)
- `node --test test/*.mjs` (`1293/1293` tests passed)
- `npm run score` (`44/44` replay sessions passed)
