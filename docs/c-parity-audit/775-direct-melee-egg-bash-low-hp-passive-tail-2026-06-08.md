# C Parity Audit 775: Direct Melee Egg Bash Low-HP Passive Tail

## Sources

- `nethack-c/upstream/src/uhitm.c:622-628`: after `hmon()` returns alive, `known_hitum()` runs the low-HP survivor flee check with `rn2(25)` and `monflee()`.
- `nethack-c/upstream/src/uhitm.c:786-789`: after `known_hitum()` returns, `hitum()` still calls `passive(mon, uwep, TRUE, ...)`.
- `nethack-c/upstream/src/uhitm.c:1186-1256`: ordinary wielded eggs set nominal one-point damage, disable damage bonuses, print egg text, then either transform or consume the egg and fall through instead of returning early.
- `nethack-c/upstream/src/invent.c:1312` and `nethack-c/upstream/src/worn.c:160-166`: melee `useup_eggs()` reaches `useupall()`, which clears the worn weapon slot before later passive handling.

## JS Changes

- Factored the direct-melee low-HP survivor flee roll into a shared helper and reused it from ordinary direct melee, potion bash, deferred wake-tail processing, and the egg branch.
- After a nonfatal eligible wielded egg bash that does not defer the sleeping wake tail, the egg branch now continues into the common low-HP flee and passive tail.
- When ordinary eggs are consumed, the passive-object call receives no weapon object, preserving C's `uwep` clearing before passive erosion checks.

## Tests

Added focused command-path coverage in `test/shop-billing-helpers.test.mjs`:

- a low-HP peaceful goblin hit by a wielded ordinary egg takes one HP, becomes angry through the wakeup tail, then enters flee state with cleared tracking through the low-HP survivor check;
- a low-HP acid-passive green mold hit by a wielded ordinary egg also enters flee state while the consumed egg is not subjected to passive-object corrosion;
- RNG assertions pin the `rn2(25)` flee gate, flee timer roll, passive-tail placeholder roll, and absence of `rn2(6)` erosion rolls for consumed eggs.

## Remaining Gaps

- Live egg-to-rock transform passive-object ordering remains a narrow follow-up.
- Special social targets such as priests, watchmen, and same-species bystanders remain narrow follow-ups.

## Verification

- `node --check js/cmd.js`
- `node --check test/shop-billing-helpers.test.mjs`
- `git diff --check`
- `node --test --test-reporter=spec --test-name-pattern "wielded egg|wielded ordinary egg|hero-thrown ordinary egg hits visible monster|hero-thrown cockatrice egg splats on stone-resistant monster|hero-thrown pyrolisk egg direct hit" test/shop-billing-helpers.test.mjs`
- `node --test --test-reporter=dot test/*.mjs` (pass)
- `npm run score` (`44/44`)
