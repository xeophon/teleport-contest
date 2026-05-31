# C Parity Audit 265: Tiphat Hostile Cuss

## Sources

- `nethack-c/upstream/src/sounds.c:1148-1155`: hostile `MS_CUSS` monsters enter `cuss(mtmp)`; peaceful lawful minions say `"It's not too late."`, and other peaceful cussers say `"We're all doomed."`.
- `nethack-c/upstream/src/wizard.c:846-892`: `cuss()` returns early for deaf heroes, then handles Wizard of Yendor lines, lawful-minion pager lines, generic aspersions, demon pager lines, and finally `wake_nearto(mtmp->mx, mtmp->my, 25)`.
- `nethack-c/upstream/dat/quest.lua:76-91`: `angel_cuss` has 14 pager entries and substitutes `%D`/`%p`.
- `nethack-c/upstream/dat/quest.lua:106-133`: `demon_cuss` has 27 pager entries.
- `nethack-c/upstream/include/hack.h:1493`: `ROLL_FROM()` consumes `rn2(SIZE(array))`, which means the pager-line selection itself is RNG-visible.
- `nethack-c/upstream/src/questpgr.c:493-510`: `com_pager_core()` chooses array entries with `rn2(nelems) + 1`.
- `nethack-c/upstream/src/sounds.c:1495-1529`: directed `tiphat()` reaches monster noise only for adjacent fallback responders after visible humanoid interception.

## JS Coverage

- `tipHatHostileCussNoise()` now covers hostile `MS_CUSS` for the local tiphat noise path.
- The Wizard branch mirrors the C ordering: rare fiendish laugh, Amulet demand, low-hero-HP line, low-Wizard-HP return line, then malediction plus insult.
- Lawful non-renegade minions use the angel cuss pager table with `%D` and `%p` substitution.
- Other hostile cussers use the C aspersions roll, with demon cuss pager fallback.
- Hostile cuss wakes nearby sleepers at squared distance `< 25`, matching the `wake_nearto(..., 25)` radius used by C.

## Tests

Focused canaries in `test/shop-billing-helpers.test.mjs` cover:

- hostile invisible imp `MS_CUSS` producing either the aspersions line or one demon pager quote,
- RNG call shapes for the generic hostile branch without pinning seeds,
- hostile cuss waking a nearby sleeper,
- hostile invisible lawful minion `MS_CUSS` using the angel pager table with `rn2(14)`,
- preserving the existing peaceful cuss branches.

## Remaining Gaps

- This remains local to directed helmet tipping; broad shared `domonnoise()` and `#chat` still do not share a unified implementation.
- Shopkeeper `MS_SELL`, quest leaders/nemeses/guardians, priests, vampires, werecreatures, Riders, Oracle, seduction, bribe, and bones speech are still separate sound gaps.
- The current tests assert RNG call shape and branch invariants, not fixed pager entries. That keeps them seed-free but does not exhaustively enumerate every quote.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `node --test --test-name-pattern "worn helmet tip (makes hostile invisible imp cuss|makes hostile invisible lawful minion use angel cuss|makes peaceful imp cuss|makes peaceful lawful minion cuss)" test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test test/shop-billing-helpers.test.mjs` (`1240/1240` tests passed)
- `node --test test/*.mjs` (`1337/1337` tests passed)
- `npm run score` (`44/44` replay sessions passed)
