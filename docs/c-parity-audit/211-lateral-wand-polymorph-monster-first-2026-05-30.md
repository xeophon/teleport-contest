# C Parity Audit 211: Lateral Wand-Polymorph Monster-First Ray

## Sources

- `nethack-c/upstream/src/zap.c:3440-3451`: lateral wand polymorph routes through `bhit(u.dx, u.dy, rn1(8, 6), ZAPPED_WAND, bhitm, bhito, &obj)`.
- `nethack-c/upstream/src/zap.c:3824-3833` and `3994-4037`: `bhit()` invokes the monster callback before the object callback; a continuing zapped-wand monster hit spends three extra range units.
- `nethack-c/upstream/src/zap.c:160-167`, `263-334`, and `567-571`: `bhitm()` initializes `ret` to zero, wand polymorph does not stop the ray, and `learnwand()` is gated by visible polymorph evidence.
- `nethack-c/upstream/src/zap.c:2426-2485` and `4045-4047`: after the monster callback, the same-square pile is still processed and an affected pile consumes one more range unit.
- `nethack-c/upstream/src/zap.c:280-285` and `2133-2167`: monster inventory is marked bypassed before the polymorph outcome, so gear dropped by same-zap system shock is skipped by same-square pile polymorph.
- `nethack-c/upstream/src/zap.c:6100-6157`: wand-class monster resistance uses the wand attack level (`12`) when resolving `resist(..., WAND_CLASS, 0, NOTELL)`.

## JS Changes

- Reused the existing monster-side polymorph helper for lateral wand rays, with the attack level parameterized so thrown potion polymorph keeps level `6` while wand polymorph uses level `12`.
- Added a lateral-ray monster lookup and process each monster square before the same-square pile, without stopping the ray.
- Kept C range accounting: a monster hit spends three extra range units, and a non-bypassed affected pile spends one additional range unit.
- Added same-zap dropped-inventory bypass tracking so gear released by system shock is not immediately polymorphed as floor loot.
- Identifies the wand only when the monster outcome produces visible polymorph evidence, preserving the existing pile identification path separately.

## Tests

Added focused coverage in `test/shop-billing-helpers.test.mjs`:

- A lateral wand-polymorph ray transforms a visible monster before polymorphing the same-square shop pile.
- A resistant monster uses wand-class resistance RNG and still lets the same-square pile polymorph.
- A same-zap system-shock kill drops monster inventory but bypasses it for the pile pass.

## Remaining Gaps

- Full `newcham()` fidelity remains broader than the current in-place monster retargeting helper.
- Current-zap long-worm tail guard and exact hard-magic-resistance shield display are still unmodeled.
- Dropped inventory that merges into an existing floor stack may need a closer C-shaped bypass/merge audit.
- Spell polymorph pile rays, upward hiding-under targeting, and boulder/restack behavior remain separate object-polymorph rows.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-name-pattern="lateral wand polymorph|lateral floor polymorph" test/shop-billing-helpers.test.mjs` (`5` matching tests passed)
- `node --test test/shop-billing-helpers.test.mjs` (`1086/1086`)
- `node --test test/*.mjs` (`1183/1183`)
- `npm run score` (`44/44`)
